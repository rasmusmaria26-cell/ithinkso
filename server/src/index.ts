/**
 * Express app wiring.
 *
 * Order matters:
 *   1. trust proxy (before anything reads req.ip — the rate limiter does)
 *   2. CORS, limited to CLIENT_ORIGIN
 *   3. JSON body
 *   4. API routes
 *   5. share route (reads index.html, injects OG tags)
 *   6. static client build + SPA history fallback
 *   7. error handler
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { Router } from "express";
import type { Env } from "./config/env.js";
import type { CaseStore } from "./db/store.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { caseRoutes } from "./routes/case.js";
import { checkRoutes } from "./routes/check.js";
import { shareRoutes } from "./routes/share.js";
import type { LlmAdapter } from "./services/llm/adapter.interface.js";
import type { SourceAdapter } from "./services/search/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** server/src -> server/dist -> repo root/client/dist */
const CLIENT_DIST = path.resolve(__dirname, "../../client/dist");

export type AppOptions = {
  env: Env;
  store: CaseStore;
  llm?: LlmAdapter;
  adapters?: SourceAdapter[];
  /** Overridden in tests. */
  clientDist?: string;
};

export function createApp(options: AppOptions) {
  const { env, store } = options;
  const clientDist = options.clientDist ?? CLIENT_DIST;

  const app = express();
  app.disable("x-powered-by");

  // Exactly N hops. 0 locally; 1 behind Render/Railway/Fly. Without this,
  // req.ip is the proxy's address and one user's burst rate-limits everyone.
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origin === env.CLIENT_ORIGIN || origin.endsWith(".vercel.app") || origin.startsWith("http://localhost:")) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Accept"],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: "16kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // One API router, so mount order inside it is explicit.
  const api = Router();
  api.use(
    checkRoutes({
      env,
      store,
      ...(options.llm ? { llm: options.llm } : {}),
      ...(options.adapters ? { adapters: options.adapters } : {}),
    }),
  );
  api.use(caseRoutes({ store }));
  app.use("/api", api);
  app.use("/", api);

  // Share route reads index.html and injects OG tags. Must come before the
  // static/SPA fallback or it would never be reached.
  app.use(
    shareRoutes({
      store,
      indexPath: path.join(clientDist, "index.html"),
      origin: env.CLIENT_ORIGIN,
    }),
  );

  // Static assets, then SPA history fallback.
  app.use(express.static(clientDist, { index: false, maxAge: "1h" }));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      next(notFound());
      return;
    }
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      // No build present (fresh clone, dev): let it 404 rather than hang.
      if (err) next(notFound());
    });
  });

  app.use(errorHandler);

  return app;
}
