import type { SourceStatus } from "./case.js";

/**
 * Server -> client stream events.
 *
 * SSE framing: each event is `data: <json>\n\n`. Exactly one `data:` line per
 * frame — JSON escapes newlines — so the client can split on "\n\n" and parse
 * the remainder verbatim.
 *
 * `seq` is monotonic so a client can detect a gap after a reconnect without
 * trusting arrival order.
 */
export type ServerEvent =
  | { type: "case_id"; seq: number; case_id: string }
  | { type: "step"; seq: number; text: string }
  | { type: "source_status"; seq: number; status: SourceStatus }
  | { type: "clarify"; seq: number; question: string }
  | { type: "error"; seq: number; code: ErrorCode; message: string }
  | { type: "complete"; seq: number; case_id: string };

/**
 * `Omit` does not distribute over a union — `Omit<ServerEvent, "seq">` collapses
 * to the properties common to every member, which throws away `text`, `code`,
 * etc. This distributes first, then omits.
 */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** What producers (the pipeline) emit; the writer adds `seq`. */
export type EmittedEvent = DistributiveOmit<ServerEvent, "seq">;

export const ERROR_CODES = [
  "bad_request",
  "rate_limited",
  "llm_failed",
  "no_evidence",
  "internal",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Deadpan copy. The UI may override per-code; these are the defaults. */
export const ERROR_COPY: Record<ErrorCode, string> = {
  bad_request: "That's not enough to go on, detective.",
  rate_limited: "You've filed enough cases today. Come back later.",
  llm_failed: "The desk went quiet. Try again.",
  no_evidence: "Nothing turned up in the files. Not a single lead.",
  internal: "Case closed. Servers took the day off.",
};

export type CaseStatus = "running" | "done" | "failed";
