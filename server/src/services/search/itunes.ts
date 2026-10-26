/**
 * iTunes Search API — the iOS App Store. No key.
 *
 * The only free, legitimate app-store source. Documented limit is ~20 calls/min
 * with no rate-limit headers, so we enforce it ourselves with a limiter and
 * send at most 2 queries per check. A rate limit degrades to
 * source_status ok:false; it never fails the run.
 */

import type { Env } from "../../config/env.js";
import { cleanName, cleanSnippet, safeHttpUrl } from "../text.js";
import { SlidingWindowLimiter, fetchJson } from "./http.js";
import type { AdapterResult, SearchLead, SourceAdapter } from "./types.js";
import { okResult, unavailable } from "./types.js";

const API = "https://itunes.apple.com/search";

let limiter: SlidingWindowLimiter | null = null;

type ItunesApp = {
  trackId?: unknown;
  trackName?: unknown;
  trackViewUrl?: unknown;
  description?: unknown;
  sellerName?: unknown;
  formattedPrice?: unknown;
  averageUserRating?: unknown;
};

type ItunesResponse = {
  resultCount?: unknown;
  results?: unknown;
};

/** App Store URLs are canonical by trackId, not by the redirect the API returns. */
function appStoreUrl(trackId: unknown, fallback: unknown): string | null {
  if (typeof trackId === "number" || typeof trackId === "string") {
    const id = String(trackId).replace(/\D/g, "");
    if (id) return `https://apps.apple.com/app/id${id}`;
  }
  return safeHttpUrl(fallback);
}

export function createItunesAdapter(env: Env): SourceAdapter {
  return {
    source: "itunes",
    quota: 3,
    maxQueries: 2,
    isAvailable: () => true,

    async search({ queries, signal }): Promise<AdapterResult> {
      limiter ??= new SlidingWindowLimiter(env.ITUNES_MAX_CALLS_PER_MIN);

      const byUrl = new Map<string, SearchLead>();

      for (const query of queries.slice(0, this.maxQueries)) {
        const slot = await limiter.acquire();
        if (!slot) {
          return {
            ok: byUrl.size > 0,
            leads: [...byUrl.values()].slice(0, this.quota),
            note: "rate cap reached, partial results",
          };
        }

        const url = new URL(API);
        url.searchParams.set("term", query);
        url.searchParams.set("country", "US"); // documented as REQUIRED
        url.searchParams.set("media", "software");
        url.searchParams.set("entity", "software");
        url.searchParams.set("limit", String(this.quota));

        const res = await fetchJson(url.toString(), {
          timeoutMs: env.SEARCH_TIMEOUT_MS,
          signal,
          headers: { Accept: "application/json", "User-Agent": "already-exists" },
        });

        if (!res.ok) {
          // iTunes signals throttling with 403/429. Either way: degrade.
          if (byUrl.size > 0) {
            return {
              ok: true,
              leads: [...byUrl.values()].slice(0, this.quota),
              note: `partial: ${res.reason}`,
            };
          }
          return unavailable(res.reason);
        }

        const body = res.json as ItunesResponse;
        const results = body.results;
        if (!Array.isArray(results)) continue;

        for (const raw of results as ItunesApp[]) {
          const href = appStoreUrl(raw.trackId, raw.trackViewUrl);
          if (!href) continue;

          const name = cleanName(raw.trackName);
          if (!name) continue;

          const bits: string[] = [];
          const desc = cleanSnippet(raw.description);
          if (desc) bits.push(desc);
          if (typeof raw.sellerName === "string" && raw.sellerName) {
            bits.push(`by ${cleanName(raw.sellerName)}`);
          }

          byUrl.set(href, { name, url: href, snippet: bits.join(" — ") || name });
        }
      }

      return okResult([...byUrl.values()].slice(0, this.quota));
    },
  };
}

/** Test seam. */
export function __resetItunesLimiter(): void {
  limiter = null;
}
