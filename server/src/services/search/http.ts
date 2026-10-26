/**
 * Shared HTTP + rate-limit plumbing for every adapter.
 *
 * Nothing here retries. A retry inside an 8s budget is just a slower timeout,
 * and a failed source is supposed to degrade the run rather than delay it.
 * The ONE exception is the GitHub call queue (below), which waits rather than
 * errors — that is a quota measure, not a retry.
 */

export const DEFAULT_TIMEOUT_MS = 8000;

export type FetchJsonResult =
  | { ok: true; status: number; json: unknown; headers: Headers }
  | { ok: false; status: number; reason: string };

/**
 * JSON fetch with a hard timeout.
 *
 * `AbortSignal.timeout` gives us the deadline; the caller may pass its own
 * signal to cancel early (client disconnect). Both are combined so either can
 * abort without leaking a timer.
 */
export async function fetchJson(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<FetchJsonResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init;
  const deadline = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;

  let res: Response;
  try {
    res = await fetch(url, { ...rest, signal: combined });
  } catch (err) {
    if (deadline.aborted) return { ok: false, status: 0, reason: `timed out after ${timeoutMs}ms` };
    if (signal?.aborted) return { ok: false, status: 0, reason: "cancelled" };
    // Deliberately not echoing the URL: it may carry a key in a query param.
    return { ok: false, status: 0, reason: err instanceof Error ? err.name : "network error" };
  }

  if (!res.ok) {
    // Read a bounded prefix for the log; never the full body of an error page.
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 140).replace(/\s+/g, " ").trim();
    } catch {
      detail = "";
    }
    return {
      ok: false,
      status: res.status,
      reason: detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`,
    };
  }

  try {
    const json = (await res.json()) as unknown;
    return { ok: true, status: res.status, json, headers: res.headers };
  } catch {
    return { ok: false, status: res.status, reason: "response was not JSON" };
  }
}

/**
 * Sliding-window limiter that WAITS instead of erroring.
 *
 * Used for GitHub (global cap so a burst of users cannot 403 us) and iTunes
 * (~20/min documented). Callers `await acquire()` before each request; the
 * limiter resolves when a slot opens or rejects if the wait would exceed
 * `maxWaitMs` — because blocking a user's stream for 30s is worse than
 * reporting the source as unavailable.
 */
export class SlidingWindowLimiter {
  private hits: number[] = [];
  private chain: Promise<void> = Promise.resolve();

  constructor(
    private readonly maxCalls: number,
    private readonly windowMs = 60_000,
    private readonly maxWaitMs = 12_000,
  ) {}

  /** Serialized across callers so two concurrent runs cannot both see a free slot. */
  async acquire(): Promise<boolean> {
    const run = this.chain.then(() => this.tryAcquire());
    // Keep the chain alive even if this acquisition is rejected.
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async tryAcquire(): Promise<boolean> {
    const now = Date.now();
    this.hits = this.hits.filter((t) => now - t < this.windowMs);

    if (this.hits.length < this.maxCalls) {
      this.hits.push(now);
      return true;
    }

    const oldest = this.hits[0]!;
    const waitMs = this.windowMs - (now - oldest);
    if (waitMs > this.maxWaitMs) return false;

    await new Promise((r) => setTimeout(r, waitMs + 25));
    return this.tryAcquire();
  }

  /** Test seam. */
  reset(): void {
    this.hits = [];
  }
}

/** Bounded parallel map: never more than `limit` in flight. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]!, index);
    }
  });

  await Promise.all(workers);
  return results;
}
