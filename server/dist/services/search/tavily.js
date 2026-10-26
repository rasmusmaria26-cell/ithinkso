/**
 * Web search via Tavily. This is the ONLY route to Product Hunt, Google Play,
 * and PyPI — none of those has a public search API, and the docs say so.
 *
 * Evidence is shaped as `title` + `content` on each result. Reading the wrong
 * field is the bug this adapter was written to fix: the spike printed
 * "undefined" titles because it read a name-shaped field off a result that only
 * has `title`/`content`/`url`.
 *
 * Auth is `Authorization: Bearer tvly-…` — NOT `api_key` in the body.
 */
import { cleanName, cleanSnippet, hostLabel, safeHttpUrl } from "../text.js";
import { fetchJson } from "./http.js";
import { okResult, unavailable } from "./types.js";
const API = "https://api.tavily.com/search";
/** Sites with no public API. Reached by domain-filtered web search only. */
const TARGET_DOMAINS = ["producthunt.com", "play.google.com", "pypi.org"];
export function createTavilyAdapter(env) {
    const available = Boolean(env.TAVILY_API_KEY);
    return {
        source: "web",
        quota: 8,
        maxQueries: 4,
        isAvailable: () => available,
        async search({ queries, signal }) {
            if (!available)
                return unavailable("TAVILY_API_KEY not set");
            const byUrl = new Map();
            let creditsUsed = 0;
            for (const query of queries.slice(0, this.maxQueries)) {
                const res = await fetchJson(API, {
                    method: "POST",
                    timeoutMs: env.SEARCH_TIMEOUT_MS,
                    signal,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${env.TAVILY_API_KEY}`,
                    },
                    body: JSON.stringify({
                        query,
                        max_results: 8,
                        search_depth: "basic", // 1 credit; "advanced" is 2
                        include_domains: TARGET_DOMAINS,
                    }),
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
                const body = res.json;
                const credits = body.usage?.credits;
                if (typeof credits === "number")
                    creditsUsed += credits;
                const results = body.results;
                if (!Array.isArray(results))
                    continue;
                for (const raw of results) {
                    const href = safeHttpUrl(raw.url);
                    if (!href)
                        continue;
                    // `title` is the human label; `content` is the snippet. Some results
                    // return a title that equals the domain — prefer the path in that case.
                    const title = cleanName(raw.title);
                    const content = cleanSnippet(raw.content);
                    const name = title || hostLabel(href);
                    // Never let an empty snippet through: the judge is told to describe
                    // only what the snippet supports, so an empty one yields nothing.
                    const snippet = content || name;
                    byUrl.set(href, { name, url: href, snippet });
                }
            }
            const leads = [...byUrl.values()].slice(0, this.quota);
            return {
                ...okResult(leads),
                note: creditsUsed ? `${creditsUsed} credit(s)` : undefined,
            };
        },
    };
}
//# sourceMappingURL=tavily.js.map