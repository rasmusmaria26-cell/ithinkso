/**
 * Route-level tests. These are the ones that catch "it works in the pipeline but
 * not over the wire": event order, SSE framing, validation status codes, and the
 * share-page OG injection.
 *
 * No network and no Mongo: the app is built with fake adapters, a fake LLM, and
 * the in-memory store.
 */

import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseEnv } from "../src/config/env.js";
import { MemoryCaseStore } from "../src/db/store.js";
import { createApp } from "../src/index.js";
import type { LlmAdapter } from "../src/services/llm/adapter.interface.js";
import type { SourceAdapter } from "../src/services/search/types.js";
import { injectMeta } from "../src/routes/share.js";

const DECOMPOSE = {
  searchable: true,
  features: [
    { n: 1, text: "f" },
    { n: 2, text: "g" },
  ],
  queries: ["q1", "q2"],
};

const JUDGE = {
  judgments: [{ lead_id: "lead-01", features_matched: [1], why_similar: "same", relevant: true }],
  whats_new: [],
  gaps: [],
  suggested_twist: "twist",
};

const fakeLlm: LlmAdapter = {
  model: "fake",
  isAvailable: () => true,
  async json({ system }) {
    return {
      ok: true,
      value: system.includes("intake desk") ? DECOMPOSE : JUDGE,
      model: "fake",
      shape: "promoted",
    };
  },
};

const adapters: SourceAdapter[] = (["github", "web", "npm"] as const).map((source) => ({
  source,
  quota: 6,
  maxQueries: 4,
  isAvailable: () => true,
  async search() {
    return {
      ok: true,
      leads: [
        {
          name: `${source}-thing`,
          url: `https://${source === "web" ? "producthunt.com/posts/x" : "github.com/o/x"}`,
          snippet: "does something",
        },
      ],
    };
  },
}));

function startApp() {
  const env = parseEnv({
    NODE_ENV: "test",
    GEMINI_API_KEY: "test",
    RATE_LIMIT_PER_HOUR: "100",
  });
  const store = new MemoryCaseStore();
  const app = createApp({ env, store, llm: fakeLlm, adapters });
  const server: Server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  return { server, store, base: `http://127.0.0.1:${port}` };
}

/** Parse a text/event-stream body into events, the same way the client will. */
function parseFrames(text: string): unknown[] {
  return text
    .split("\n\n")
    .map((frame) => frame.trim())
    .filter((frame) => frame.startsWith("data:"))
    .map((frame) => JSON.parse(frame.slice("data:".length).trim()));
}

describe("POST /api/check over HTTP", () => {
  let ctx: ReturnType<typeof startApp>;

  beforeEach(() => {
    ctx = startApp();
  });

  afterEach(() => {
    ctx.server.close();
  });

  it("streams case_id first, then steps, then complete", async () => {
    const res = await fetch(`${ctx.base}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: "a tool that finds existing competitors quickly" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const events = parseFrames(await res.text()) as Array<{ type: string; seq: number }>;

    expect(events.length).toBeGreaterThan(3);
    expect(events[0]!.type).toBe("case_id");
    expect(events.at(-1)!.type).toBe("complete");

    // seq is contiguous from 1: the client can detect a gap after a reconnect.
    expect(events.map((e) => e.seq)).toEqual(events.map((_, i) => i + 1));
  });

  it("persists the case so GET /api/case/:id recovers it after a drop", async () => {
    const res = await fetch(`${ctx.base}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: "a tool that finds existing competitors quickly" }),
    });

    const events = parseFrames(await res.text()) as Array<{
      type: string;
      case_id?: string;
    }>;

    const caseId = events.find((e) => e.type === "case_id")?.case_id;
    expect(caseId).toBeTruthy();

    const poll = await fetch(`${ctx.base}/api/case/${caseId}`);
    expect(poll.status).toBe(200);

    const body = (await poll.json()) as {
      status: string;
      result: { verdict: string } | null;
    };
    expect(body.status).toBe("done");
    expect(body.result?.verdict).toBeTruthy();
  });

  it("rejects a too-short idea with 400 JSON, not a stream", async () => {
    const res = await fetch(`${ctx.base}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: "app" }),
    });

    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(((await res.json()) as { error: string }).error).toBe("bad_request");
  });

  it("404s an unknown case id", async () => {
    const res = await fetch(`${ctx.base}/api/case/doesnotexist`);
    expect(res.status).toBe(404);
  });

  it("rejects a path-traversal-shaped case id without hitting the store", async () => {
    const res = await fetch(`${ctx.base}/api/case/..%2f..%2fetc%2fpasswd`);
    expect(res.status).toBe(404);
  });
});

describe("share meta injection", () => {
  const html = [
    "<!doctype html><html><head>",
    "<title>Already Exists?</title>",
    '<meta property="og:title" content="old">',
    "</head><body></body></html>",
  ].join("\n");

  it("replaces the title and old og tags, and adds twitter card", () => {
    const out = injectMeta(html, {
      title: "ALREADY EXISTS — novelty 20/100",
      description: "Thing already does 80% of this.",
      url: "https://example.com/r/abc123",
    });

    expect(out).toContain("<title>ALREADY EXISTS — novelty 20/100</title>");
    expect(out).toContain('content="Thing already does 80% of this."');
    expect(out).toContain('name="twitter:card"');
    // The stale tag is gone, not duplicated.
    expect(out).not.toContain('content="old"');
    expect(out.match(/og:title/g)).toHaveLength(1);
  });

  it("escapes quotes so a model-written string cannot break out of the attribute", () => {
    const out = injectMeta(html, {
      title: 'x"><script>alert(1)</script>',
      description: "safe",
      url: "https://example.com",
    });

    expect(out).not.toContain("<script>");
    expect(out).toContain("&quot;");
  });
});
