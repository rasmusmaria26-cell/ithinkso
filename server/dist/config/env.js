import { z } from "zod";
/**
 * Environment, validated once at boot.
 *
 * Nothing in this module logs a value. Missing or malformed keys are reported
 * by NAME only, so a crash dump never contains a secret.
 */
// Groq and Brave are intentionally absent: the provider set is Gemini only and
// the web adapter is Tavily only (see ARCHITECTURE.md §7, §12).
const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8080),
    CLIENT_ORIGIN: z.string().min(1).default("http://localhost:5173"),
    /** Number of trusted reverse proxies. 0 locally; 1 on Render/Railway/Fly. */
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/already-exists"),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),
    /** Optional: GitHub search is disabled and reported as a failed source without it. */
    GITHUB_TOKEN: z.string().min(1).optional(),
    TAVILY_API_KEY: z.string().min(1).optional(),
    /** Optional tuning knobs; defaults match the measured spike. */
    SEARCH_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
    LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(50000),
    GITHUB_MAX_CALLS_PER_MIN: z.coerce.number().int().positive().default(20),
    ITUNES_MAX_CALLS_PER_MIN: z.coerce.number().int().positive().default(20),
    MAX_CONCURRENT_SEARCHES: z.coerce.number().int().positive().default(4),
    RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(10),
});
export class EnvError extends Error {
    missing;
    constructor(missing) {
        super(`Invalid environment. Problems: ${missing.join("; ")}. ` +
            `Copy .env.example to .env and fill the listed keys.`);
        this.missing = missing;
        this.name = "EnvError";
    }
}
/**
 * Provider keys are optional at parse time so the app can boot for tests and
 * for a keyless local run; each adapter reports itself unavailable instead.
 * But in production a missing Gemini key means every request fails, so that one
 * is a hard requirement.
 */
export function parseEnv(raw = process.env) {
    const result = EnvSchema.safeParse(raw);
    if (!result.success) {
        const problems = result.error.issues.map((i) => {
            const name = i.path.join(".") || "(root)";
            // Never echo the value, only the constraint that failed.
            return `${name}: ${i.message}`;
        });
        throw new EnvError(problems);
    }
    const env = result.data;
    return env;
}
//# sourceMappingURL=env.js.map