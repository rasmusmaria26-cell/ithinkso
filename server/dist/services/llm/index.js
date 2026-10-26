/**
 * Provider factory. One provider: Gemini. Groq was dropped by decision.
 *
 * Kept as a factory rather than a direct import so tests can inject a fake
 * adapter without touching process.env, and so a second provider is a one-file
 * change if that decision reverses.
 */
import { createGeminiAdapter } from "./gemini.adapter.js";
export function createLlmAdapter(env) {
    return createGeminiAdapter(env);
}
//# sourceMappingURL=index.js.map