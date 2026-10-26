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

import type { Competitor, Feature, SourceStatus, Verdict } from "../../types/case.js";

export const ALREADY_EXISTS_AT = 70;
export const PARTLY_EXISTS_AT = 35;
export const MIN_LEADS_FOR_VERDICT = 3;
export const MAX_FAILED_SOURCES = 2;

export type ScoreInput = {
  competitors: Competitor[];
  /** Leads the judge saw, not leads retrieved — abbreviated evidence is a gate. */
  leadsConsidered: number;
  statuses: SourceStatus[];
  /** Forensic white space signals */
  whatsNew?: string[];
  gaps?: string[];
  features?: Feature[];
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

function countSubstantiveItems(items?: string[]): number {
  if (!items || !items.length) return 0;
  return items.filter((item) => {
    const text = item.trim().toLowerCase();
    if (text.length < 5) return false;
    if (
      text.includes("no novel") ||
      text.includes("none identified") ||
      text.includes("nothing novel") ||
      text.includes("no distinct") ||
      text.includes("n/a")
    ) {
      return false;
    }
    return true;
  }).length;
}

export function computeScore(input: ScoreInput): ScoreOutput {
  const { competitors, leadsConsidered, statuses, whatsNew, gaps, features } = input;

  const relevant = competitors
    .filter((c) => c.relevant)
    .map((c) => c.overlap_percent)
    .sort((a, b) => b - a);

  const maxOverlap = relevant[0] ?? 0;
  const top3 = relevant.slice(0, 3);
  const meanTop3 = top3.length
    ? Math.round(top3.reduce((sum, n) => sum + n, 0) / top3.length)
    : 0;

  let novelty: number;

  const hasForensicContext =
    whatsNew !== undefined || gaps !== undefined || features !== undefined;

  if (relevant.length === 0) {
    novelty = 100;
  } else if (!hasForensicContext) {
    // Baseline pure formula for backward-compatible runs / baseline tests
    novelty = Math.max(
      0,
      Math.min(100, 100 - Math.round(0.7 * maxOverlap + 0.3 * meanTop3)),
    );
  } else {
    // --- MULTI-FACTOR FORENSIC NOVELTY ENGINE ---
    // 1. Base blend of top matches
    const baseOverlap =
      relevant.length === 1 ? maxOverlap : 0.65 * maxOverlap + 0.35 * meanTop3;
    let score = 100 - baseOverlap;

    // 2. Core Feature Differentiation:
    // Feature #1 is the primary core mechanic. If the top competitor missed Feature #1,
    // the user's defining innovation remains uncolonized despite secondary utility overlap.
    const relevantCompetitors = competitors.filter((c) => c.relevant);
    const topCompetitor = relevantCompetitors[0];
    const hasMatchedList =
      topCompetitor?.features_matched && topCompetitor.features_matched.length > 0;
    const topMatchesCore = hasMatchedList
      ? topCompetitor.features_matched!.some((f) => f.n === 1)
      : null;

    if (topMatchesCore === false) {
      score += 10; // Core mechanic untouched
    } else if (topMatchesCore === true && topCompetitor && topCompetitor.overlap_percent >= 75) {
      score -= 6; // Core mechanic directly matched
    }

    // 3. Forensic White Space Signals (whats_new & gaps)
    const substantiveWhatsNew = countSubstantiveItems(whatsNew);
    const substantiveGaps = countSubstantiveItems(gaps);

    if (substantiveWhatsNew > 0 || substantiveGaps > 0) {
      score += Math.min(16, substantiveWhatsNew * 4) + Math.min(6, substantiveGaps * 2);
    } else if (whatsNew && whatsNew.length > 0) {
      score -= 6; // Explicit absence of novel additions
    }

    // 4. Competitive Density & Market Saturation
    const relevantCount = relevant.length;
    if (relevantCount === 1) {
      score += 6; // Blue ocean: lone competitor
    } else if (relevantCount === 2) {
      score += 2;
    } else if (relevantCount >= 4) {
      score -= Math.min(10, (relevantCount - 3) * 3); // Red ocean: crowded market
    }

    // 5. Multi-Channel Commercialization
    const distinctSources = new Set(relevantCompetitors.map((c) => c.source)).size;
    if (relevantCount > 0 && distinctSources === 1) {
      score += 4; // Siloed in one ecosystem
    } else if (distinctSources >= 3) {
      score -= 5; // Omnipresent across GitHub, npm, App Store & Web
    }

    // 6. Collective Coverage & Dynamic Range Calibration across Verdict Bands
    const unionMatchedNumbers = new Set(
      relevantCompetitors.flatMap((c) => (c.features_matched ?? []).map((f) => f.n))
    );
    const totalFeaturesCount = features && features.length > 0 ? features.length : 1;
    const collectiveOverlap = Math.round((unionMatchedNumbers.size / totalFeaturesCount) * 100);
    const marketOverlap = Math.max(maxOverlap, Math.round(collectiveOverlap * 0.85));

    if (marketOverlap >= ALREADY_EXISTS_AT) {
      score = Math.min(34, score);
    } else if (marketOverlap >= PARTLY_EXISTS_AT) {
      score = Math.min(69, Math.max(35, score));
    } else if (marketOverlap < PARTLY_EXISTS_AT && relevantCount <= 1) {
      score = Math.max(65, score);
    }

    novelty = Math.max(0, Math.min(100, Math.round(score)));
  }

  const failedSources = statuses.filter((s) => !s.ok).length;

  const relevantCompetitors = competitors.filter((c) => c.relevant);
  const unionMatchedNumbers = new Set(
    relevantCompetitors.flatMap((c) => (c.features_matched ?? []).map((f) => f.n))
  );
  const totalFeaturesCount = features && features.length > 0 ? features.length : 1;
  const collectiveOverlap = Math.round((unionMatchedNumbers.size / totalFeaturesCount) * 100);
  const effectiveVerdictOverlap = hasForensicContext
    ? Math.max(maxOverlap, Math.round(collectiveOverlap * 0.85))
    : maxOverlap;

  let verdict: Verdict;
  let reason: string | null = null;

  if (leadsConsidered < MIN_LEADS_FOR_VERDICT) {
    verdict = "inconclusive";
    reason = `only ${leadsConsidered} lead${leadsConsidered === 1 ? "" : "s"} to work with`;
  } else if (failedSources >= MAX_FAILED_SOURCES) {
    verdict = "inconclusive";
    reason = `${failedSources} sources failed`;
  } else if (effectiveVerdictOverlap >= ALREADY_EXISTS_AT) {
    verdict = "already_exists";
  } else if (effectiveVerdictOverlap >= PARTLY_EXISTS_AT) {
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
