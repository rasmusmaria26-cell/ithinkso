/**
 * Pipeline integration, with a fake LLM and fake adapters. No network, no Mongo.
 *
 * Covers the paths that are easy to get subtly wrong:
 *   - cache hit: zero LLM calls, no orphan document, complete event with the
 *     ORIGINAL case id (not a new one)
 *   - dropped stream: the case is still persisted and still reaches `done`
 *   - clarify: nothing persisted
 *   - judge shape failure: one retry, then a clean error, document marked failed
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/config/env.js";
import { MemoryCaseStore } from "../src/db/store.js";
import type { CaseRecord } from "../src/db/store.js";
import type { LlmAdapter, LlmJsonRequest, LlmJsonResult } from "../src/services/llm/adapter.interface.js";
import { runPipeline } from "../src/services/pipeline/run.js";
import { ideaHash } from "../src/services/pipeline/cache.js";
import type { SourceAdapter } from "../src/services/search/types.js";
import type { EmittedEvent } from "../src/types/api.js";

const env = {
  NODE_ENV: "test",
  PORT: 0,
  CLIENT_ORIGIN: "http://localhost:5173",
  TRUST_PROXY: 0,
  MONGODB_URI: "mongodb://unused",
  GEMINI_API_KEY: "test-key",
  GEMINI_MODEL: "gemini-3.5-flash-lite",
  GITHUB_TOKEN: "test-token",
  TAVILY_API_KEY: "test-key",
  SEARCH_TIMEOUT_MS: 8000,
  GITHUB_MAX_CALLS_PER_MIN: 20,
  ITUNES_MAX_CALLS_PER_MIN: 20,
  MAX_CONCURRENT_SEARCHES: 4,
  RATE_LIMIT_PER_HOUR: 10,
} satisfies Env;

const DECOMPOSE = {
  searchable: true,
  features: [
    { n: 1, text: "Finds existing competitors" },
    { n: 2, text: "Scores novelty" },
    { n: 3, text: "Produces a case file" },
  ],
  queries: ["competitor finder", "novelty score cli", "product hunt competitor"],
};

const JUDGE = {
  judgments: [
    {
      lead_id: "lead-01",
      features_matched: [1, 2],
      why_similar: "finds competitors and scores them",
      relevant: true,
    },
  ],
  whats_new: ["case-file presentation"],
  gaps: ["no app-store coverage"],
  suggested_twist: "make it adversarial",
};

/** A fake model that answers by call order and records every request. */
function fakeLlm(responses: unknown[]): LlmAdapter & { calls: LlmJsonRequest[] } {
  const calls: LlmJsonRequest[] = [];
  let i = 0;

  return {
    model: "fake",
    calls,
    isAvailable: () => true,
    async json(req: LlmJsonRequest): Promise<LlmJsonResult> {
      calls.push(req);
      const value = responses[Math.min(i, responses.length - 1)];
      i += 1;
      if (value instanceof Error) return { ok: false, reason: value.message, model: "fake" };
      return { ok: true, value, model: "fake", shape: "promoted" };
    },
  };
}

function fakeAdapter(
  source: SourceAdapter["source"],
  leads: { name: string; url: string; snippet: string }[],
  opts: { ok?: boolean; note?: string } = {},
): SourceAdapter {
  return {
    source,
    quota: 6,
    maxQueries: 4,
    isAvailable: () => true,
    async search() {
      return { ok: opts.ok ?? true, leads, note: opts.note };
    },
  };
}

const threeAdapters = () => [
  fakeAdapter("github", [
    { name: "competitor-finder", url: "https://github.com/a/cf", snippet: "finds competitors" },
  ]),
  fakeAdapter("web", [
    { name: "Product Scan", url: "https://www.producthunt.com/posts/ps", snippet: "scans" },
  ]),
  fakeAdapter("npm", [
    { name: "novelty-score", url: "https://www.npmjs.com/package/novelty-score", snippet: "scores" },
  ]),
];

function collect() {
  const events: EmittedEvent[] = [];
  return { events, emit: (e: EmittedEvent) => events.push(e) };
}

const never = new AbortController().signal;

describe("runPipeline", () => {
  let store: MemoryCaseStore;

  beforeEach(() => {
    store = new MemoryCaseStore();
  });

  it("runs the happy path and persists a done case", async () => {
    const llm = fakeLlm([DECOMPOSE, JUDGE]);
    const { events, emit } = collect();

    const outcome = await runPipeline({
      idea: "a tool that finds existing competitors for my idea",
      caseId: "case123456",
      emit,
      signal: never,
      env,
      llm,
      store,
      adapters: threeAdapters(),
    });

    expect(outcome.kind).toBe("complete");

    const record = await store.get("case123456");
    expect(record?.status).toBe("done");
    expect(record?.result?.verdict).toBeDefined();
    expect(record?.result?.leads_considered).toBe(3);

    // The route emits case_id before calling the pipeline, so the pipeline's
    // first event is the first step. (Asserted at the route level too.)
    expect(events[0]).toMatchObject({ type: "step" });
    expect(events.at(-1)).toEqual({ type: "complete", case_id: "case123456" });
  });

  it("emits source_status for every source", async () => {
    const { events, emit } = collect();

    await runPipeline({
      idea: "a tool that finds existing competitors for my idea",
      caseId: "case123456",
      emit,
      signal: never,
      env,
      llm: fakeLlm([DECOMPOSE, JUDGE]),
      store,
      adapters: threeAdapters(),
    });

    const statuses = events.filter((e) => e.type === "source_status");
    expect(statuses).toHaveLength(3);
  });

  it("emits clarify and persists NOTHING when the idea is too vague", async () => {
    const llm = fakeLlm([
      { searchable: false, question: "What does it actually do?", features: [], queries: [] },
    ]);
    const { events, emit } = collect();

    const outcome = await runPipeline({
      idea: "an app for dogs",
      caseId: "vague12345",
      emit,
      signal: never,
      env,
      llm,
      store,
      adapters: threeAdapters(),
    });

    expect(outcome).toEqual({ kind: "clarify", question: "What does it actually do?" });
    expect(events.some((e) => e.type === "clarify")).toBe(true);
    // No orphan document: there is no result, and a stale `running` record would
    // pollute the cache and the share route.
    expect(await store.get("vague12345")).toBeNull();
  });

  it("serves a cache hit with zero LLM calls and no new document", async () => {
    const idea = "a tool that finds existing competitors for my idea";
    const hash = ideaHash(idea);

    // Seed a fresh done case in the cache.
    await store.create({
      case_id: "cached0001",
      status: "done",
      stage: "complete",
      idea,
      idea_hash: hash,
      verdict: "already_exists",
      result: {
        verdict: "already_exists",
        novelty_score: 20,
        max_overlap: 80,
        leads_considered: 5,
        relevant_leads: 1,
        features: [],
        competitors: [],
        whats_new: [],
        gaps: [],
        suggested_twist: "",
        one_line_reason: "cached",
        sources: [],
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      },
      error: null,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 86_400_000),
    } satisfies CaseRecord);

    const llm = fakeLlm([DECOMPOSE, JUDGE]);
    const { events, emit } = collect();

    const outcome = await runPipeline({
      idea,
      caseId: "newcase001",
      emit,
      signal: never,
      env,
      llm,
      store,
      adapters: threeAdapters(),
    });

    // No LLM calls at all: the whole point of caching.
    expect(llm.calls).toHaveLength(0);
    // Completes against the ORIGINAL case id, not the one we were handed.
    expect(outcome).toEqual({ kind: "complete", caseId: "cached0001" });
    expect(events.at(-1)).toEqual({ type: "complete", case_id: "cached0001" });
    // And no orphan running document for the new id.
    expect(await store.get("newcase001")).toBeNull();
  });

  it("ignores a cache entry older than 24h", async () => {
    const idea = "a tool that finds existing competitors for my idea";

    await store.create({
      case_id: "stale00001",
      status: "done",
      stage: "complete",
      idea,
      idea_hash: ideaHash(idea),
      verdict: "pretty_fresh",
      result: null,
      error: null,
      created_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
      expires_at: new Date(Date.now() + 86_400_000),
    } satisfies CaseRecord);

    const llm = fakeLlm([DECOMPOSE, JUDGE]);

    const outcome = await runPipeline({
      idea,
      caseId: "fresh00001",
      emit: () => {},
      signal: never,
      env,
      llm,
      store,
      adapters: threeAdapters(),
    });

    expect(llm.calls.length).toBeGreaterThan(0);
    expect(outcome).toEqual({ kind: "complete", caseId: "fresh00001" });
  });

  it("finishes and persists even when the stream is already closed", async () => {
    // Simulates a dropped connection: every emit is a no-op because the socket
    // is gone, but the pipeline must still save the result.
    const emit = vi.fn();

    const outcome = await runPipeline({
      idea: "a tool that finds existing competitors for my idea",
      caseId: "dropped001",
      emit,
      signal: never,
      env,
      llm: fakeLlm([DECOMPOSE, JUDGE]),
      store,
      adapters: threeAdapters(),
    });

    expect(outcome.kind).toBe("complete");
    const record = await store.get("dropped001");
    expect(record?.status).toBe("done");
    expect(record?.result?.competitors.length).toBeGreaterThan(0);
  });

  it("retries once on a bad judge shape, then succeeds", async () => {
    const llm = fakeLlm([
      DECOMPOSE,
      { not: "the right shape" }, // first judge reply
      JUDGE, // retry
    ]);

    const outcome = await runPipeline({
      idea: "a tool that finds existing competitors for my idea",
      caseId: "retry00001",
      emit: () => {},
      signal: never,
      env,
      llm,
      store,
      adapters: threeAdapters(),
    });

    expect(outcome.kind).toBe("complete");
    expect(llm.calls).toHaveLength(3); // decompose + judge + one retry
    expect((await store.get("retry00001"))?.status).toBe("done");
  });

  it("fails cleanly when the judge is malformed twice", async () => {
    const llm = fakeLlm([DECOMPOSE, { junk: true }, { still: "junk" }]);
    const { events, emit } = collect();

    const outcome = await runPipeline({
      idea: "a tool that finds existing competitors for my idea",
      caseId: "twice00001",
      emit,
      signal: never,
      env,
      llm,
      store,
      adapters: threeAdapters(),
    });

    expect(outcome.kind).toBe("error");
    expect(events.some((e) => e.type === "error")).toBe(true);
    expect((await store.get("twice00001"))?.status).toBe("failed");
  });

  it("fails cleanly when the LLM is unavailable", async () => {
    const llm = fakeLlm([new Error("provider down")]);
    const { events, emit } = collect();

    const outcome = await runPipeline({
      idea: "a tool that finds existing competitors for my idea",
      caseId: "down000001",
      emit,
      signal: never,
      env,
      llm,
      store,
      adapters: threeAdapters(),
    });

    expect(outcome).toEqual({ kind: "error", code: "llm_failed", message: "provider down" });
    expect(events.some((e) => e.type === "error")).toBe(true);
  });

  it("survives a failing source and gates the verdict on it", async () => {
    const adapters = [
      fakeAdapter("github", [], { ok: false, note: "HTTP 403" }),
      fakeAdapter("web", [], { ok: false, note: "HTTP 429" }),
      fakeAdapter("npm", [
        { name: "novelty-score", url: "https://www.npmjs.com/package/novelty-score", snippet: "s" },
      ]),
    ];

    const outcome = await runPipeline({
      idea: "a tool that finds existing competitors for my idea",
      caseId: "failed0001",
      emit: () => {},
      signal: never,
      env,
      llm: fakeLlm([DECOMPOSE, JUDGE]),
      store,
      adapters,
    });

    expect(outcome.kind).toBe("complete");
    const record = await store.get("failed0001");
    // 2 failed sources -> inconclusive, even though we finished.
    expect(record?.result?.verdict).toBe("inconclusive");
  });
});
