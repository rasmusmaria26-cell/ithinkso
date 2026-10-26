/**
 * Adapter contract. Everything above this line is pure and testable; everything
 * below it talks to the network.
 *
 * An adapter NEVER throws. It reports `ok: false` with a short reason, because a
 * dead source must degrade the case, not abort it.
 */

export type SearchLead = {
  name: string;
  url: string;
  snippet: string;
  /** For npm only: the project's repository, used to dedupe against GitHub. */
  repositoryUrl?: string | null;
};

export type AdapterResult = {
  ok: boolean;
  leads: SearchLead[];
  /** Human-readable, shown in the case log. Never contains a key. */
  note?: string;
};

export type AdapterQuery = {
  /** All queries for this source, already quota-limited by the caller. */
  queries: string[];
  signal: AbortSignal;
};

export type SourceAdapter = {
  source: "github" | "npm" | "itunes" | "web";
  /** Per-check lead cap. Fixed per source (no cross-source relevance blending). */
  quota: number;
  /** Max queries to send this source per check. */
  maxQueries: number;
  /** True when a required key is absent. The aggregator reports ok:false. */
  isAvailable(): boolean;
  search(query: AdapterQuery): Promise<AdapterResult>;
};

/** Escape hatch for a source that must be skipped with an explanation. */
export function unavailable(note: string): AdapterResult {
  return { ok: false, leads: [], note };
}

export const okResult = (leads: SearchLead[]): AdapterResult => ({
  ok: true,
  leads,
});
