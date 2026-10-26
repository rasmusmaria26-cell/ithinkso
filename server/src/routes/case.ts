/**
 * GET /api/case/:id — recovery + share.
 *
 * A 404 here means "no such case", which the client treats as "maybe not
 * written yet, keep polling" only when it has a case_id from a stream. An
 * expired or never-existent id is simply a 404.
 */

import { Router } from "express";
import type { CaseStore } from "../db/store.js";

export function caseRoutes(deps: { store: CaseStore }): Router {
  const router = Router();

  router.get("/case/:id", async (req, res, next) => {
    try {
      const id = String(req.params["id"] ?? "");
      if (!/^[A-Za-z0-9_-]{6,32}$/.test(id)) {
        res.status(404).json({ error: "not_found", message: "No such file." });
        return;
      }

      const record = await deps.store.get(id);
      if (!record) {
        res.status(404).json({ error: "not_found", message: "No such file." });
        return;
      }

      res.json({
        case_id: record.case_id,
        status: record.status,
        stage: record.stage,
        verdict: record.verdict,
        result: record.result,
        error: record.error,
        created_at: record.created_at,
        expires_at: record.expires_at,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
