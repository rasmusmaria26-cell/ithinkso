/**
 * GitHub repository search.
 *
 * Quota notes (measured in the spike):
 *  - authenticated search is 30 req/min; we keep our own global cap at 20/min
 *    with a WAITING limiter so a burst of users queues instead of 403-ing
 *  - without GITHUB_TOKEN the adapter reports itself unavailable: unauthenticated
 *    search is 10 req/min shared per IP, which silently returns nothing in prod
 */
import { cleanName, cleanSnippet, safeHttpUrl } from "../text.js";
import { SlidingWindowLimiter, fetchJson } from "./http.js";
import { okResult, unavailable } from "./types.js";
const API = "https://api.github.com/search/repositories";
/** One limiter per process, not per adapter instance — the cap is global. */
let limiter = null;
export function createGithubAdapter(env) {
    const available = Boolean(env.GITHUB_TOKEN);
    return {
        source: "github",
        quota: 6,
        maxQueries: 4,
        isAvailable: () => available,
        async search({ queries, signal }) {
            if (!available)
                return unavailable("GITHUB_TOKEN not set");
            limiter ??= new SlidingWindowLimiter(env.GITHUB_MAX_CALLS_PER_MIN);
            const byUrl = new Map();
            for (const query of queries.slice(0, this.maxQueries)) {
                // Queue rather than error. If the wait exceeds the limiter's budget the
                // source degrades instead of stalling the case.
                const slot = await limiter.acquire();
                if (!slot) {
                    return {
                        ok: byUrl.size > 0,
                        leads: [...byUrl.values()].slice(0, this.quota),
                        note: "rate cap reached, partial results",
                    };
                }
                const url = new URL(API);
                url.searchParams.set("q", query);
                url.searchParams.set("sort", "stars");
                url.searchParams.set("order", "desc");
                url.searchParams.set("per_page", String(this.quota));
                const res = await fetchJson(url.toString(), {
                    timeoutMs: env.SEARCH_TIMEOUT_MS,
                    signal,
                    headers: {
                        Accept: "application/vnd.github+json",
                        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
                        "X-GitHub-Api-Version": "2022-11-28",
                        "User-Agent": "already-exists",
                    },
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
                const items = res.json?.items;
                if (!Array.isArray(items))
                    continue;
                for (const raw of items) {
                    const href = safeHttpUrl(raw.html_url);
                    if (!href)
                        continue;
                    const name = cleanName(raw.full_name);
                    if (!name)
                        continue;
                    const bits = [];
                    const desc = cleanSnippet(raw.description);
                    if (desc)
                        bits.push(desc);
                    if (typeof raw.language === "string" && raw.language)
                        bits.push(`(${raw.language})`);
                    if (typeof raw.stargazers_count === "number") {
                        bits.push(`${raw.stargazers_count.toLocaleString("en-US")} stars`);
                    }
                    if (raw.archived === true)
                        bits.push("archived");
                    byUrl.set(href, {
                        name,
                        url: href,
                        // Fall back to the repo path so the judge always has some evidence
                        // rather than an empty string it has to invent around.
                        snippet: bits.join(" — ") || name,
                    });
                }
            }
            return okResult([...byUrl.values()].slice(0, this.quota));
        },
    };
}
/** Test seam. */
export function __resetGithubLimiter() {
    limiter = null;
}
//# sourceMappingURL=github.js.map