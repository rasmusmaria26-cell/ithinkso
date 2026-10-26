/**
 * All arithmetic and the verdict. Pure functions, no I/O, no model input.
 *
 * The model contributes qualitative text only. Everything a user could quote as
 * "the answer" — novelty and verdict — is computed here from the matched
 * features, so the same evidence always produces the same number.
 *
 *   overlap_percent = matched features / total features * 100
 *   max_overlap     = highest overlap among relevant judgments
 *   mean_top3       = mean of the top three relevant overlaps (or fewer)
 *   novelty_score   = 100 - round(0.7 * max_overlap + 0.3 * mean_top3)
 *
 * Note the consequence: with a single relevant lead, max and mean_top3 are the
 * same value, so novelty == 100 - max_overlap exactly. That is intended.
 *
 * Verdict thresholds are on max_overlap:
 *   >= 70 already_exists · >= 35 partly_exists · else pretty_fresh
 *   gates: fewer than 3 leads considered, or 2+ sources failed -> inconclusive
 */

import type { Competitor, SourceStatus, Verdict } from "../../types/case.js";

export const ALREADY_EXISTS_AT = 70;
export const PARTLY_EXISTS_AT = 35;
export const MIN_LEADS_FOR_VERDICT = 3;
export const MAX_FAILED_SOURCES = 2;

export type ScoreInput = {
  competitors: Competitor[];
  /** Leads the judge saw, not leads retrieved — abbreviated evidence is a gate. */
  leadsConsidered: number;
  statuses: SourceStatus[];
};

export type ScoreOutput = {
  overlap_percent: number;
  max_overlap: number;
  mean_top3_overlap: number;
  novelty_score: number;
  verdict: Verdict;
  relevant_leads: number;
  leads_considered: number;
  inconclusive_reason: string | null;
};

/** Deterministic 0-100 integer. */
export function overlapPercent(matchedCount: number, totalFeatures: number): number {
  if (totalFeatures <= 0) return 0;
  const raw = Math.round((matchedCount / totalFeatures) * 100);
  return Math.max(0, Math.min(100, raw));
}

export function computeScore(input: ScoreInput): ScoreOutput {
  const { competitors, leadsConsidered, statuses } = input;

  const relevant = competitors
    .filter((c) => c.relevant)
    .map((c) => c.overlap_percent)
    .sort((a, b) => b - a);

  const maxOverlap = relevant[0] ?? 0;
  const top3 = relevant.slice(0, 3);
  const meanTop3 = top3.length
    ? Math.round(top3.reduce((sum, n) => sum + n, 0) / top3.length)
    : 0;

  const novelty = Math.max(
    0,
    Math.min(100, 100 - Math.round(0.7 * maxOverlap + 0.3 * meanTop3)),
  );

  const failedSources = statuses.filter((s) => !s.ok).length;

  let verdict: Verdict;
  let reason: string | null = null;

  if (leadsConsidered < MIN_LEADS_FOR_VERDICT) {
    verdict = "inconclusive";
    reason = `only ${leadsConsidered} lead${leadsConsidered === 1 ? "" : "s"} to work with`;
  } else if (failedSources >= MAX_FAILED_SOURCES) {
    verdict = "inconclusive";
    reason = `${failedSources} sources failed`;
  } else if (maxOverlap >= ALREADY_EXISTS_AT) {
    verdict = "already_exists";
  } else if (maxOverlap >= PARTLY_EXISTS_AT) {
    verdict = "partly_exists";
  } else {
    verdict = "pretty_fresh";
  }

  return {
    overlap_percent: maxOverlap,
    max_overlap: maxOverlap,
    mean_top3_overlap: meanTop3,
    novelty_score: novelty,
    verdict,
    relevant_leads: relevant.length,
    leads_considered: leadsConsidered,
    inconclusive_reason: reason,
  };
}

/**
 * The one-line reason. Written server-side on purpose: it is the sentence that
 * appears in the share card, and the model must not be able to phrase it.
 */
export function oneLineReason(input: {
  verdict: Verdict;
  maxOverlap: number;
  relevantLeads: number;
  leadsConsidered: number;
  inconclusiveReason: string | null;
  topCompetitorName?: string;
}): string {
  const { verdict, maxOverlap, relevantLeads, leadsConsidered, inconclusiveReason } = input;

  switch (verdict) {
    case "inconclusive":
      return `Can't call it — ${inconclusiveReason ?? "not enough evidence"}. ${leadsConsidered} lead${leadsConsidered === 1 ? "" : "s"} reviewed.`;
    case "already_exists": {
      const name = input.topCompetitorName;
      return name
        ? `${name} already does ${maxOverlap}% of this.`
        : `Something already does ${maxOverlap}% of this.`;
    }
    case "partly_exists":
      return `Parts of this exist. Closest match covers ${maxOverlap}%.`;
    case "pretty_fresh":
      return relevantLeads === 0
        ? `Nothing in ${leadsConsidered} leads matches the core mechanic.`
        : `Closest match covers only ${maxOverlap}%.`;
  }
}
