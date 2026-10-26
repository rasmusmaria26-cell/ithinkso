/**
 * Central error handling.
 *
 * Two rules:
 *  1. Never leak a stack, a provider body, or a URL that might carry a key.
 *  2. If headers are already sent (an SSE stream in flight), close the stream
 *     with an error event instead of attempting a JSON response.
 */
import { ERROR_COPY } from "../types/api.js";
export class HttpError extends Error {
    status;
    code;
    constructor(status, code, message) {
        super(message ?? ERROR_COPY.internal);
        this.status = status;
        this.code = code;
        this.name = "HttpError";
    }
}
export const notFound = () => new HttpError(404, "not_found", "No such file.");
export function errorHandler(err, _req, res, next) {
    if (res.headersSent) {
        // The SSE writer owns the socket at this point; it will close itself.
        next(err);
        return;
    }
    const status = err instanceof HttpError ? err.status : 500;
    const code = err instanceof HttpError ? err.code : "internal";
    // Log the name and message only. Provider errors are already truncated by the
    // adapters, and no env value is ever interpolated into a message.
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : "unknown error";
    console.error(`[error] ${code} ${detail}`);
    res.status(status).json({
        error: code,
        message: err instanceof HttpError ? err.message : ERROR_COPY.internal,
    });
}
//# sourceMappingURL=errorHandler.js.map