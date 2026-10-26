export const ERROR_CODES = [
    "bad_request",
    "rate_limited",
    "llm_failed",
    "no_evidence",
    "internal",
];
/** Deadpan copy. The UI may override per-code; these are the defaults. */
export const ERROR_COPY = {
    bad_request: "That's not enough to go on, detective.",
    rate_limited: "You've filed enough cases today. Come back later.",
    llm_failed: "The desk went quiet. Try again.",
    no_evidence: "Nothing turned up in the files. Not a single lead.",
    internal: "Case closed. Servers took the day off.",
};
//# sourceMappingURL=api.js.map