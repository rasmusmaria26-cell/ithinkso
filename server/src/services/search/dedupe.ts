/**
 * Dedupe by PROJECT IDENTITY, not URL string.
 *
 * The naive version fails in both directions:
 *   - it misses `http://GitHub.com/o/r/` vs `https://github.com/o/r` (same project)
 *   - it over-collapses `github.com/o/r/tree/main/packages/a` and `.../packages/b`
 *     (different projects in one monorepo)
 *
 * So the canonicalizer normalizes the noise and preserves the signal:
 *   - scheme, `git+`, `git://`, `ssh://git@`, `www.`, trailing slash, `.git`, case
 *   - `/tree/<ref>/` and `/blob/<ref>/` markers are removed, but the PATH AFTER
 *     them is kept — that is what makes monorepo sub-packages distinct leads
 *   - trailing noise segments (`/issues`, `/pulls`, `/releases`, `/discussions`,
 *     `/stargazers`, …) are dropped
 */

import type { Source } from "../../types/case.js";

/**
 * Lower number wins when two leads normalize to the same identity.
 * npm is last on purpose: its leads are low priority (spec, Decisions).
 */
const SOURCE_PRIORITY: Record<Source, number> = {
  github: 0,
  web: 1,
  itunes: 2,
  npm: 3,
};

/** Path segments that identify a view, not a project. */
const NOISE_TAIL = new Set([
  "issues",
  "issue",
  "pulls",
  "pull",
  "releases",
  "release",
  "discussions",
  "stargazers",
  "watchers",
  "forks",
  "network",
  "commits",
  "tags",
  "branches",
  "contributors",
  "activity",
  "graphs",
  "wiki",
  "actions",
  "security",
  "pulse",
  "settings",
]);

/** Segment that is followed by a mutable ref (branch/tag/sha) we must skip. */
const REF_MARKERS = new Set(["tree", "blob", "raw", "edit", "commits", "compare"]);

/**
 * Canonical form of an arbitrary URL, or null if it cannot be normalized.
 * Comparison is on the returned string; display always uses the original.
 */
export function canonicalizeUrl(raw: string): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;

  let candidate = raw.trim();

  // npm hands back `git+https://github.com/o/r.git`; various sources hand back
  // `git://`, `ssh://git@github.com/o/r`, and `git@github.com:o/r`.
  candidate = candidate.replace(/^git\+/i, "");
  candidate = candidate.replace(/^git@([^:]+):/i, "https://$1/");
  candidate = candidate.replace(/^ssh:\/\/git@/i, "https://");
  candidate = candidate.replace(/^git:\/\//i, "https://");

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  let host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".")) return null;

  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  // Drop a trailing `.git`.
  if (segments.length && segments[segments.length - 1]!.endsWith(".git")) {
    const last = segments[segments.length - 1]!.replace(/\.git$/, "");
    if (last) segments[segments.length - 1] = last;
    else segments.pop();
  }

  // Skip ref markers AND the ref that follows them, keeping the rest of the path.
  //   /o/r/tree/main/packages/a -> /o/r/packages/a
  //   /o/r/blob/HEAD/README.md -> /o/r/README.md
  const kept: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (REF_MARKERS.has(seg) && i + 1 < segments.length) {
      i += 1; // skip the ref itself
      continue;
    }
    if (NOISE_TAIL.has(seg)) break; // view of the project, not the project
    kept.push(seg);
  }

  // `npmjs.com/package/<name>` keeps its name; scope is part of identity.
  host = host === "www.npmjs.com" ? "npmjs.com" : host;

  return `${host}/${kept.join("/")}`;
}

/**
 * Identity key for a lead. `repositoryUrl` lets an npm package inherit its
 * project's identity so it dedupes against the GitHub lead for that repo.
 */
export function identityKey(input: {
  url: string;
  source: Source;
  repositoryUrl?: string | null;
}): string | null {
  const fromRepo =
    input.source === "npm" && input.repositoryUrl
      ? canonicalizeUrl(input.repositoryUrl)
      : null;

  if (fromRepo) return fromRepo;
  return canonicalizeUrl(input.url);
}

/** Stable ordering so `lead-01` means the same thing every run. */
export function compareLeads(
  a: { source: Source; name: string; url: string },
  b: { source: Source; name: string; url: string },
): number {
  const bySource = SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source];
  if (bySource !== 0) return bySource;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return a.url < b.url ? -1 : a.url > b.url ? 1 : 0;
}

export type DedupeInput<T> = T & {
  url: string;
  source: Source;
  name: string;
  repositoryUrl?: string | null;
};

export type DedupeResult<T> = {
  kept: T[];
  dropped: number;
};

/**
 * Collapse leads that share a project identity, keeping the
 * highest-priority source (then a stable name/url order).
 *
 * Never merges by name alone: two different projects can share a name, and two
 * monorepo sub-packages must stay separate even under one repository.
 */
export function dedupeLeads<T extends DedupeInput<object>>(
  leads: T[],
  opts: { cap?: number } = {},
): DedupeResult<T> {
  const best = new Map<string, T>();

  for (const lead of leads) {
    const key = identityKey({
      url: lead.url,
      source: lead.source,
      repositoryUrl: lead.repositoryUrl ?? null,
    });

    // Unnormalizable URL: treat each occurrence as its own lead rather than
    // silently dropping evidence.
    if (!key) {
      const fallback = `raw:${lead.url}`;
      if (!best.has(fallback)) best.set(fallback, lead);
      continue;
    }

    const existing = best.get(key);
    if (!existing || compareLeads(lead, existing) < 0) best.set(key, lead);
  }

  const kept = [...best.values()].sort(compareLeads);
  const cap = opts.cap ?? 20;

  return {
    kept: kept.slice(0, cap),
    dropped: leads.length - Math.min(kept.length, cap),
  };
}
