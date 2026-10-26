/**
 * Provider factory. One provider: Gemini. Groq was dropped by decision.
 *
 * Kept as a factory rather than a direct import so tests can inject a fake
 * adapter without touching process.env, and so a second provider is a one-file
 * change if that decision reverses.
 */

import type { Env } from "../../config/env.js";
import type { LlmAdapter } from "./adapter.interface.js";
import { createGeminiAdapter } from "./gemini.adapter.js";

export function createLlmAdapter(env: Env): LlmAdapter {
  return createGeminiAdapter(env);
}

export type { LlmAdapter, LlmJsonRequest, LlmJsonResult } from "./adapter.interface.js";
