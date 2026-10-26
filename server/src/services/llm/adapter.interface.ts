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

export type LlmJsonRequest = {
  system: string;
  user: string;
  /** JSON Schema hint for providers that support structured output. */
  schema: Record<string, unknown>;
  signal?: AbortSignal;
  temperature?: number;
};

export type LlmJsonResult =
  | { ok: true; value: unknown; model: string; shape: string }
  | { ok: false; reason: string; model: string };

export interface LlmAdapter {
  readonly model: string;
  isAvailable(): boolean;
  json(req: LlmJsonRequest): Promise<LlmJsonResult>;
}
