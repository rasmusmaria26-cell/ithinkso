/**
 * LLM adapter contract + shared prompt handling.
 *
 * One method: `json()` — send a prompt, get back a parsed JSON value. Provider
 * quirks (auth header, structured-output shape, retry-on-400) live in the
 * adapters; the pipeline never sees them.
 *
 * The adapter does NOT validate the shape against our zod schemas. That happens
 * in the pipeline so every provider is held to the same contract.
 */
export {};
//# sourceMappingURL=adapter.interface.js.map