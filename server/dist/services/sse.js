/**
 * SSE writer.
 *
 * One `data:` line per frame, JSON encoded, terminated by a blank line. JSON
 * escapes newlines, so a frame can never be split by its own payload.
 *
 * The writer is abort-aware: after the client disconnects, `send` becomes a
 * no-op instead of throwing into the pipeline. That matters because the
 * pipeline keeps running after a dropped connection (the case is recoverable via
 * GET /api/case/:id) and must not crash on the first write.
 */
export function createSseWriter(res) {
    let seq = 0;
    let closed = false;
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    // Defeat proxy buffering: without this, Nginx-style proxies hold the whole
    // stream until it ends and the case log appears all at once.
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    const onClose = () => {
        closed = true;
    };
    res.on("close", onClose);
    res.on("error", onClose);
    // Comment heartbeat keeps intermediaries from timing out an idle stream
    // during the long search phase.
    const heartbeat = setInterval(() => {
        if (closed)
            return;
        try {
            res.write(": keep-alive\n\n");
        }
        catch {
            closed = true;
        }
    }, 15_000);
    return {
        get closed() {
            return closed;
        },
        send(event) {
            if (closed)
                return;
            seq += 1;
            const frame = { ...event, seq };
            try {
                res.write(`data: ${JSON.stringify(frame)}\n\n`);
            }
            catch {
                closed = true;
            }
        },
        close() {
            clearInterval(heartbeat);
            if (closed)
                return;
            closed = true;
            try {
                res.end();
            }
            catch {
                /* already gone */
            }
        },
    };
}
//# sourceMappingURL=sse.js.map