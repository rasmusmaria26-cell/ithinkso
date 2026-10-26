/**
 * POST /api/check — streamed over fetch + ReadableStream on the client.
 *
 * The id is emitted FIRST and the run is started immediately after, so a client
 * that loses the connection has a handle to poll. Persistence happens inside
 * the pipeline at the first safe point, so an early drop costs nothing already
 * spent.
 */

import { Router } from "express";
import type { Env } from "../config/env.js";
import type { CaseStore } from "../db/store.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { createLlmAdapter } from "../services/llm/index.js";
import type { LlmAdapter } from "../services/llm/adapter.interface.js";
import { validateCheckRequest } from "../services/pipeline/validate.js";
import { newCaseId, runPipeline } from "../services/pipeline/run.js";
import { createGithubAdapter } from "../services/search/github.js";
import { createItunesAdapter } from "../services/search/itunes.js";
import { createNpmAdapter } from "../services/search/npm.js";
import { createTavilyAdapter } from "../services/search/tavily.js";
import type { SourceAdapter } from "../services/search/types.js";
import { createSseWriter } from "../services/sse.js";
import { ERROR_COPY } from "../types/api.js";

export type CheckRouteDeps = {
  env: Env;
  store: CaseStore;
  /** Injected in tests; built from env in production. */
  llm?: LlmAdapter;
  adapters?: SourceAdapter[];
};

export function buildDefaultAdapters(env: Env): SourceAdapter[] {
  return [
    createGithubAdapter(env),
    createTavilyAdapter(env),
    createNpmAdapter(env),
    createItunesAdapter(env),
  ];
}

export function checkRoutes(deps: CheckRouteDeps): Router {
  const router = Router();
  const llm = deps.llm ?? createLlmAdapter(deps.env);
  const adapters = deps.adapters ?? buildDefaultAdapters(deps.env);

  const limiter = createRateLimiter({
    max: deps.env.RATE_LIMIT_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });

  router.post("/check", limiter, async (req, res, next) => {
    const validated = validateCheckRequest(req.body);

    if (!validated.ok) {
      // Validation failures are cheap and happen before a stream is opened, so
      // they answer as JSON rather than an SSE error frame.
      res.status(400).json({ error: "bad_request", message: validated.message });
      return;
    }

    const writer = createSseWriter(res);

    // Abort search + LLM when the client disconnects. The pipeline keeps
    // persisting what it already has; only the network work stops.
    const controller = new AbortController();
    res.on("close", () => controller.abort());

    const caseId = newCaseId();

    try {
      writer.send({ type: "case_id", case_id: caseId });

      await runPipeline({
        idea: validated.idea,
        ...(validated.clarification ? { clarification: validated.clarification } : {}),
        caseId,
        emit: (event) => writer.send(event),
        signal: controller.signal,
        env: deps.env,
        llm,
        store: deps.store,
        adapters,
      });
    } catch (err) {
      console.error(`[check] unhandled: ${err instanceof Error ? err.name : "unknown"}`);
      writer.send({ type: "error", code: "internal", message: ERROR_COPY.internal });
    } finally {
      writer.close();
    }

    // Express will not call next(); the response is finished above. Kept as a
    // no-op to make the contract explicit.
    void next;
  });

  return router;
}
