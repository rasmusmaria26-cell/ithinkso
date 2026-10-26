/**
 * Gemini adapter. `gemini-3.5-flash-lite`, structured JSON output.
 *
 * The REST surface for structured output is genuinely ambiguous — three
 * official pages disagree (see ARCHITECTURE.md §12.5):
 *   - structured-output guide: generationConfig.responseFormat.text.{mimeType:"APPLICATION_JSON", schema}
 *   - generateContent reference: generationConfig.response_mime_type + response_schema (UPPERCASE enum types)
 *   - camelCase responseMimeType/responseSchema: SDK-only, not REST
 *
 * Strategy: try the promoted shape; on 400 retry ONCE with the legacy shape;
 * remember which one worked for the life of the process so later calls skip the
 * failed attempt. Any other failure is reported, never silently retried.
 */
/** Convert our lowercase JSON-Schema types to the legacy uppercase enums. */
function toLegacySchema(node) {
    if (!node || typeof node !== "object")
        return node;
    if (Array.isArray(node))
        return node.map(toLegacySchema);
    const map = {
        object: "OBJECT",
        array: "ARRAY",
        string: "STRING",
        integer: "INTEGER",
        number: "NUMBER",
        boolean: "BOOLEAN",
    };
    const src = node;
    const out = { ...src };
    if (typeof out.type === "string" && map[out.type])
        out.type = map[out.type];
    if (out.properties && typeof out.properties === "object" && !Array.isArray(out.properties)) {
        out.properties = Object.fromEntries(Object.entries(out.properties).map(([k, v]) => [
            k,
            toLegacySchema(v),
        ]));
    }
    if (out.items)
        out.items = toLegacySchema(out.items);
    return out;
}
export function createGeminiAdapter(env) {
    const available = Boolean(env.GEMINI_API_KEY);
    const model = env.GEMINI_MODEL;
    const timeoutMs = env.LLM_TIMEOUT_MS ?? 45_000;
    // Learned once per process; null means "unknown, try promoted first".
    let knownShape = null;
    const candidateModels = [
        model,
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
    ];
    const modelsToTry = [...new Set(candidateModels)];
    const buildBody = (req, shape) => ({
        contents: [{ parts: [{ text: req.user }] }],
        systemInstruction: { parts: [{ text: req.system }] },
        generationConfig: shape === "promoted"
            ? {
                responseFormat: {
                    text: { mimeType: "APPLICATION_JSON", schema: req.schema },
                },
                temperature: req.temperature ?? 0.2,
            }
            : {
                response_mime_type: "application/json",
                response_schema: toLegacySchema(req.schema),
                temperature: req.temperature ?? 0.2,
            },
    });
    const call = async (req, shape, targetModel, signal) => {
        const deadline = AbortSignal.timeout(timeoutMs);
        const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`;
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                signal: combined,
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": env.GEMINI_API_KEY ?? "",
                },
                body: JSON.stringify(buildBody(req, shape)),
            });
            const body = await res.text();
            return { status: res.status, body };
        }
        catch (err) {
            if (deadline.aborted)
                throw new Error(`timed out after ${timeoutMs}ms`);
            if (signal?.aborted)
                throw new Error("cancelled");
            // Never include the URL or headers in the message — the key lives there.
            throw new Error(err instanceof Error ? err.name : "network error");
        }
    };
    const parse = (body) => {
        let json;
        try {
            json = JSON.parse(body);
        }
        catch {
            throw new Error("provider returned non-JSON envelope");
        }
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text !== "string" || !text.trim()) {
            throw new Error("provider returned an empty candidate");
        }
        try {
            return JSON.parse(text);
        }
        catch {
            throw new Error("model output was not valid JSON");
        }
    };
    return {
        model,
        isAvailable: () => available,
        async json(req) {
            if (!available)
                return { ok: false, reason: "GEMINI_API_KEY not set", model };
            let lastReason = "unknown provider error";
            for (const targetModel of modelsToTry) {
                const order = knownShape
                    ? [knownShape]
                    : ["promoted", "legacy"];
                for (const shape of order) {
                    try {
                        const res = await call(req, shape, targetModel, req.signal);
                        if (res.status === 400 && shape === "promoted" && !knownShape) {
                            // Shape mismatch is the expected 400 here; fall through to legacy.
                            lastReason = `400 on promoted shape: ${res.body.slice(0, 160).replace(/\s+/g, " ")}`;
                            continue;
                        }
                        // On 503 (high demand) or 404 (unavailable), try next model
                        if ((res.status === 503 || res.status === 404) && targetModel !== modelsToTry[modelsToTry.length - 1]) {
                            lastReason = `HTTP ${res.status} on ${targetModel}: ${res.body.slice(0, 160).replace(/\s+/g, " ")}`;
                            break;
                        }
                        if (res.status < 200 || res.status >= 300) {
                            return {
                                ok: false,
                                reason: `HTTP ${res.status}: ${res.body.slice(0, 160).replace(/\s+/g, " ")}`,
                                model: targetModel,
                            };
                        }
                        const value = parse(res.body);
                        knownShape = shape;
                        return { ok: true, value, model: targetModel, shape };
                    }
                    catch (err) {
                        const msg = err instanceof Error ? err.message : "provider error";
                        lastReason = msg;
                        if (targetModel !== modelsToTry[modelsToTry.length - 1]) {
                            break; // Try next candidate model
                        }
                        return {
                            ok: false,
                            reason: msg,
                            model: targetModel,
                        };
                    }
                }
            }
            return {
                ok: false,
                reason: lastReason,
                model,
            };
        },
    };
}
//# sourceMappingURL=gemini.adapter.js.map