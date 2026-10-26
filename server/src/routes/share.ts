/**
 * Share page: GET /r/:id.
 *
 * A pure SPA cannot emit per-case OG tags — crawlers do not run JS. So the
 * server fetches the case, rewrites the <title> and the og/twitter meta in the
 * built index.html, and sends that. The client then hydrates the same route and
 * shows the full case file.
 *
 * If the build is missing (dev without a build, first run), we fall back to
 * serving the plain shell — the share link still works for humans, it just
 * lacks a preview card.
 */

import { readFile } from "node:fs/promises";
import { Router } from "express";
import type { CaseStore } from "../db/store.js";
import type { CaseResult, Verdict } from "../types/case.js";

const VERDICT_HEADLINE: Record<Verdict, string> = {
  already_exists: "ALREADY EXISTS",
  partly_exists: "PARTLY EXISTS",
  pretty_fresh: "PRETTY FRESH",
  inconclusive: "INCONCLUSIVE",
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Inject/replace the head tags. Kept as a small pure function so it can be
 * unit-tested without a browser or a build.
 */
export function injectMeta(
  html: string,
  meta: { title: string; description: string; url: string },
): string {
  const tags = [
    `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
  ].join("\n    ");

  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);

  // Drop any pre-existing og/twitter tags so a rebuild cannot duplicate them.
  out = out.replace(/<meta\s+(?:property|name)="(?:og:|twitter:)[^"]*"[^>]*>\s*/gi, "");

  return out.replace(/<\/head>/i, `    ${tags}\n  </head>`);
}

export function shareRoutes(deps: { store: CaseStore; indexPath: string; origin: string }): Router {
  const router = Router();

  router.get("/r/:id", async (req, res, next) => {
    try {
      const id = String(req.params["id"] ?? "");
      const record = /^[A-Za-z0-9_-]{6,32}$/.test(id) ? await deps.store.get(id) : null;

      let html: string;
      try {
        html = await readFile(deps.indexPath, "utf8");
      } catch {
        res
          .status(200)
          .type("html")
          .send(
            "<!doctype html><meta charset=utf-8><title>Already Exists?</title>" +
              "<p style=\"font-family:monospace;padding:2rem\">Case file not built yet. Run <code>npm run build</code>.</p>",
          );
        return;
      }

      const result = record?.result as CaseResult | null | undefined;

      if (record?.status === "done" && result) {
        const headline = VERDICT_HEADLINE[result.verdict];
        const title = `${headline} — novelty ${result.novelty_score}/100`;
        // The server-written reason, never model prose.
        const description = result.one_line_reason;
        const url = `${deps.origin.replace(/\/$/, "")}/r/${record.case_id}`;
        res.type("html").send(injectMeta(html, { title, description, url }));
        return;
      }

      // Running, failed, or missing: send the shell without a preview card.
      res.type("html").send(html);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
