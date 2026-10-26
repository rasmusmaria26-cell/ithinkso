/**
 * npm registry search. No key, no documented quota, LOW PRIORITY.
 *
 * Two things make npm behave differently from the other sources:
 *  1. `links.repository` arrives as `git+https://github.com/o/r.git` — the
 *     dedupe normalizer strips `git+`/`.git` so these collapse against GitHub.
 *  2. Its leads are weakly relevant (lots of near-name packages), so the judge
 *     is told in the prompt that npm matches only count when the features
 *     actually line up.
 */

import type { Env } from "../../config/env.js";
import { cleanName, cleanSnippet, safeHttpUrl } from "../text.js";
import { fetchJson } from "./http.js";
import type { AdapterResult, SearchLead, SourceAdapter } from "./types.js";
import { okResult, unavailable } from "./types.js";

const API = "https://registry.npmjs.org/-/v1/search";

type NpmObject = {
  package?: {
    name?: unknown;
    description?: unknown;
    version?: unknown;
    links?: { repository?: unknown; npm?: unknown; homepage?: unknown };
    keywords?: unknown;
  };
};

export function createNpmAdapter(env: Env): SourceAdapter {
  return {
    source: "npm",
    quota: 4,
    maxQueries: 2,
    isAvailable: () => true,

    async search({ queries, signal }): Promise<AdapterResult> {
      const byUrl = new Map<string, SearchLead>();

      for (const query of queries.slice(0, this.maxQueries)) {
        const url = new URL(API);
        url.searchParams.set("text", query);
        url.searchParams.set("size", String(this.quota));

        const res = await fetchJson(url.toString(), {
          timeoutMs: env.SEARCH_TIMEOUT_MS,
          signal,
          headers: { Accept: "application/json", "User-Agent": "already-exists" },
        });

        if (!res.ok) {
          if (byUrl.size > 0) {
            return {
              ok: true,
              leads: [...byUrl.values()].slice(0, this.quota),
              note: `partial: ${res.reason}`,
            };
          }
          return unavailable(res.reason);
        }

        const objects = (res.json as { objects?: unknown })?.objects;
        if (!Array.isArray(objects)) continue;

        for (const raw of objects as NpmObject[]) {
          const pkg = raw.package;
          if (!pkg) continue;

          const name = cleanName(pkg.name);
          if (!name) continue;

          // Prefer the canonical npm page; the repository is only the dedupe key.
          const pageUrl = safeHttpUrl(`https://www.npmjs.com/package/${encodeURIComponent(name)}`);
          if (!pageUrl) continue;

          const repositoryRaw = pkg.links?.repository;
          const repositoryUrl =
            typeof repositoryRaw === "string" ? safeHttpUrl(repositoryRaw) : null;

          const bits: string[] = [];
          const desc = cleanSnippet(pkg.description);
          if (desc) bits.push(desc);
          if (typeof pkg.version === "string") bits.push(`v${pkg.version}`);

          byUrl.set(pageUrl, {
            name,
            url: pageUrl,
            snippet: bits.join(" — ") || name,
            repositoryUrl,
          });
        }
      }

      return okResult([...byUrl.values()].slice(0, this.quota));
    },
  };
}
