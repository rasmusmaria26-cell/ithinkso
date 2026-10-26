/**
 * Adapter contract. Everything above this line is pure and testable; everything
 * below it talks to the network.
 *
 * An adapter NEVER throws. It reports `ok: false` with a short reason, because a
 * dead source must degrade the case, not abort it.
 */
/** Escape hatch for a source that must be skipped with an explanation. */
export function unavailable(note) {
    return { ok: false, leads: [], note };
}
export const okResult = (leads) => ({
    ok: true,
    leads,
});
//# sourceMappingURL=types.js.map