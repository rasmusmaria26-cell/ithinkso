import { z } from "zod";
import { cleanText } from "../text.js";
/**
 * Request validation. Length bounds are applied to the SANITIZED string, so a
 * 600-character paste of whitespace is rejected rather than counted.
 */
export const IDEA_MIN = 10;
export const IDEA_MAX = 600;
export const CLARIFICATION_MAX = 300;
export const CheckRequestSchema = z.object({
    idea: z
        .string()
        .transform(cleanText)
        .pipe(z.string().min(IDEA_MIN).max(IDEA_MAX)),
    clarification: z
        .string()
        .transform(cleanText)
        .pipe(z.string().max(CLARIFICATION_MAX))
        .optional()
        .or(z.literal("").transform(() => undefined)),
});
export function validateCheckRequest(raw) {
    const parsed = CheckRequestSchema.safeParse(raw);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        const field = first?.path.join(".") ?? "request";
        if (field === "idea") {
            return {
                ok: false,
                message: `Give me at least ${IDEA_MIN} characters and at most ${IDEA_MAX}.`,
            };
        }
        return { ok: false, message: "That request didn't parse, detective." };
    }
    const data = parsed.data;
    return {
        ok: true,
        idea: data.idea,
        ...(data.clarification ? { clarification: data.clarification } : {}),
    };
}
//# sourceMappingURL=validate.js.map