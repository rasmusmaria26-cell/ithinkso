// One probe per evidence source + per LLM provider.
// Each probe returns a uniform result so run.mjs can render a table and
// decide go/no-go. Nothing here retries: a retry would hide the latency and
// quota numbers the spike exists to measure.
//
// Environment-dependent? The request shapes are verified against provider docs
// before writing full adapters. Any shape marked UNVERIFIED is reported as such
// rather than silently guessed.

import { performance } from "node:perf_hooks";

const TIMEOUT_MS = 8000;

export const titleCase = (s) =>
  s.replace(/(^|[-_ ])([a-z])/g, (_, p, c) => p + c.toUpperCase());

/** Uniform timing wrapper. Never throws. */
async function timed(fn) {
  const started = performance.now();
  try {
    const value = await fn();
    return { ok: true, value, ms: Math.round(performance.now() - started) };
  } catch (err) {
    return {
      ok: false,
      error: err?.name === "TimeoutError" ? `timeout ${TIMEOUT_MS}ms` : String(err?.message ?? err),
      ms: Math.round(performance.now() - started),
    };
  }
}

/** fetch with an 8s hard timeout. Mirrors what the real adapters will do. */
async function get(url, init = {}) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  return res;
}

/** Pull selected rate-limit headers so we can report real quota headroom. */
function quotaHeaders(res, names) {
  const out = {};
  for (const name of names) {
    const v = res.headers.get(name);
    if (v !== null) out[name] = v;
  }
  return out;
}

/** Truncate for reporting only — the adapters do their own sanitation. */
const clip = (s, n = 90) => {
  const flat = String(s ?? "").replace(/\s+/g, " ").trim();
  return flat.length > n ? flat.slice(0, n) + "…" : flat;
};

/** Hostname without throwing on a malformed URL. */
const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
};

// ---------------------------------------------------------------------------
// Evidence sources
// ---------------------------------------------------------------------------

export const github = {
  name: "GitHub",
  requires: ["GITHUB_TOKEN"],
  async probe(env, query) {
    if (!env.GITHUB_TOKEN) {
      return { skipped: "GITHUB_TOKEN not set — adapter would be disabled" };
    }

    return timed(async () => {
      const url = new URL("https://api.github.com/search/repositories");
      url.searchParams.set("q", query);
      url.searchParams.set("per_page", "6");
      url.searchParams.set("sort", "stars");

      const res = await get(url, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "already-exists-spike",
        },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${clip(body, 120)}`);
      }

      const json = await res.json();
      const quota = quotaHeaders(res, [
        "x-ratelimit-limit",
        "x-ratelimit-remaining",
        "x-ratelimit-reset",
      ]);

      return {
        count: Array.isArray(json.items) ? json.items.length : 0,
        total: json.total_count,
        quota,
        sample: (json.items ?? []).slice(0, 3).map((r) => ({
          name: r.full_name,
          stars: r.stargazers_count,
          desc: clip(r.description),
        })),
      };
    });
  },
};

export const npm = {
  name: "npm",
  requires: [],
  async probe(_env, query) {
    return timed(async () => {
      const url = new URL("https://registry.npmjs.org/-/v1/search");
      url.searchParams.set("text", query);
      url.searchParams.set("size", "4");

      const res = await get(url, {
        headers: { Accept: "application/json", "User-Agent": "already-exists-spike" },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      return {
        count: json.objects?.length ?? 0,
        total: json.total,
        sample: (json.objects ?? []).slice(0, 3).map((o) => ({
          name: o.package?.name,
          desc: clip(o.package?.description),
          repo: o.package?.links?.repository ?? null, // dedupe key vs GitHub
          score: o.score?.final,
        })),
      };
    });
  },
};

export const itunes = {
  name: "iTunes (App Store)",
  requires: [],
  async probe(_env, query) {
    return timed(async () => {
      const url = new URL("https://itunes.apple.com/search");
      url.searchParams.set("term", query);
      url.searchParams.set("country", "US"); // documented as REQUIRED
      url.searchParams.set("media", "software");
      url.searchParams.set("entity", "software");
      url.searchParams.set("limit", "3");

      const res = await get(url, { headers: { "User-Agent": "already-exists-spike" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();

      // iTunes frequently 200s with resultCount 0 on obscure terms; surface it.
      return {
        count: json.resultCount ?? 0,
        sample: (json.results ?? []).slice(0, 3).map((a) => ({
          name: a.trackName,
          id: a.trackId,
          seller: a.sellerName,
          desc: clip(a.description, 70),
        })),
      };
    });
  },
};

export const tavily = {
  name: "Tavily (web)",
  requires: ["TAVILY_API_KEY"],
  async probe(env, query) {
    if (!env.TAVILY_API_KEY) return { skipped: "TAVILY_API_KEY not set" };

    return timed(async () => {
      const res = await get("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          max_results: 5,
          search_depth: "basic",
          include_domains: ["producthunt.com", "play.google.com", "pypi.org"],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${clip(body, 160)}`);
      }

      const json = await res.json();
      const results = Array.isArray(json.results) ? json.results : [];

      // Guard the exact bug that made titles print as "undefined": a result is
      // { title, url, content }, NOT { name, description }. Report which fields
      // are actually present so a shape change is visible immediately.
      const first = results[0];
      const fieldReport = first
        ? {
            title: typeof first.title === "string" ? "ok" : `MISSING (${typeof first.title})`,
            content: typeof first.content === "string" ? "ok" : `MISSING (typeof first.content})`,
            url: typeof first.url === "string" ? "ok" : "MISSING",
          }
        : { note: "no results" };

      return {
        count: results.length,
        quota: { resultFields: JSON.stringify(fieldReport) },
        sample: results.slice(0, 3).map((r) => ({
          // Read `title`; fall back to the hostname, never print "undefined".
          name: clip(r.title || hostOf(r.url), 60),
          desc: clip(r.content, 80),
          url: r.url,
          score: r.score,
        })),
      };
    });
  },
};

// ---------------------------------------------------------------------------
// LLM providers — both asked for a strict JSON object, since that is the only
// output either adapter may produce.
// ---------------------------------------------------------------------------

const LLM_PROMPT = `Return ONLY a JSON object, no prose, matching:
{"features":[{"n":1,"text":"string"}],"queries":["string"]}
Give 3 features and 3 queries for this idea: IDEASUBSTITUTE`;

const LLM_SCHEMA = {
  type: "object",
  properties: {
    features: {
      type: "array",
      items: {
        type: "object",
        properties: { n: { type: "integer" }, text: { type: "string" } },
        required: ["n", "text"],
      },
    },
    queries: { type: "array", items: { type: "string" } },
  },
  required: ["features", "queries"],
};

/**
 * Gemini has three official REST surfaces for structured output and they do
 * NOT agree. The structured-output guide promotes
 *   generationConfig.responseFormat.text.{mimeType:"APPLICATION_JSON", schema}
 * while the generateContent API reference still documents the legacy
 *   generationConfig.response_mime_type + response_schema (uppercase type enums)
 * The camelCase responseMimeType/responseSchema pair is SDK-only, not REST.
 *
 * So: try the promoted shape first, retry once on 400 with the legacy shape,
 * and report which one this account/model actually accepts. That answer is
 * what the adapter will be written against.
 */
const GEMINI_BODY_PROMOTED = (prompt) => ({
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: {
    responseFormat: {
      text: { mimeType: "APPLICATION_JSON", schema: LLM_SCHEMA },
    },
    temperature: 0.2,
  },
});

/** Legacy form uses uppercase schema type enums (ARRAY/OBJECT/STRING/INTEGER). */
const toLegacySchema = (node) => {
  const map = {
    object: "OBJECT",
    array: "ARRAY",
    string: "STRING",
    integer: "INTEGER",
    number: "NUMBER",
    boolean: "BOOLEAN",
  };
  if (!node || typeof node !== "object") return node;
  const out = { ...node };
  if (out.type) out.type = map[out.type] ?? out.type;
  if (out.properties) {
    out.properties = Object.fromEntries(
      Object.entries(out.properties).map(([k, v]) => [k, toLegacySchema(v)]),
    );
  }
  if (out.items) out.items = toLegacySchema(out.items);
  return out;
};

const GEMINI_BODY_LEGACY = (prompt) => ({
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: {
    response_mime_type: "application/json",
    response_schema: toLegacySchema(LLM_SCHEMA),
    temperature: 0.2,
  },
});

export const gemini = {
  name: "Gemini",
  requires: ["GEMINI_API_KEY"],
  async probe(env, idea) {
    if (!env.GEMINI_API_KEY) return { skipped: "GEMINI_API_KEY not set" };
    // 2.x Flash is "limited legacy access" / shut down for new projects.
    const model = env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const prompt = LLM_PROMPT.replace("IDEASUBSTITUTE", idea);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const call = async (body) => {
      const res = await get(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify(body),
      });
      return res;
    };

    return timed(async () => {
      let shape = "responseFormat.text";
      let res = await call(GEMINI_BODY_PROMOTED(prompt));

      if (res.status === 400) {
        const firstError = clip(await res.text(), 120);
        shape = "response_mime_type/schema (legacy)";
        res = await call(GEMINI_BODY_LEGACY(prompt));
        if (!res.ok) {
          const body = await res.text();
          throw new Error(
            `both shapes rejected. promoted: ${firstError} | legacy: ${clip(body, 120)}`,
          );
        }
      } else if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${clip(body, 200)}`);
      }

      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`non-JSON response (${shape}): ${clip(text, 160)}`);
      }

      return {
        count: parsed.features?.length ?? 0,
        quota: {
          model,
          shape,
          tokens: JSON.stringify(json.usageMetadata ?? {}),
        },
        sample: [{ name: "features", desc: clip(JSON.stringify(parsed.features), 120) }],
      };
    });
  },
};

// Active set per the build decision: GitHub, Tavily, npm, iTunes.
// Groq and Brave were removed entirely (not merely skipped).
export const SOURCES = [github, npm, itunes, tavily];
export const LLMS = [gemini];
