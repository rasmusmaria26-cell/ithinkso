/**
 * 24h cache on the normalized idea. Required, not optional: Tavily's free tier
 * is ~1000 credits/month and the same idea gets run repeatedly while iterating.
 *
 * The hash includes the clarification, because "vague idea + answer" is a
 * different search than the vague idea alone — but it is stable for the same
 * pair, so a user who answers the clarify question once never pays twice.
 */
import { createHash } from "node:crypto";
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/**
 * Normalize before hashing so trivial variations hit the cache:
 * case, whitespace, and trailing punctuation. NOT the words themselves —
 * "houseplant app" and "app for houseplants" are genuinely different searches.
 */
export function normalizeIdea(idea, clarification) {
    const base = idea
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[\s.!?,;:]+$/g, "")
        .trim();
    const extra = (clarification ?? "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[\s.!?,;:]+$/g, "")
        .trim();
    return extra ? `${base}\u0000${extra}` : base;
}
export function ideaHash(idea, clarification) {
    return createHash("sha256").update(normalizeIdea(idea, clarification)).digest("hex");
}
export function isFresh(createdAt, now = Date.now()) {
    const t = createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
    if (Number.isNaN(t))
        return false;
    return now - t < CACHE_TTL_MS;
}
//# sourceMappingURL=cache.js.map