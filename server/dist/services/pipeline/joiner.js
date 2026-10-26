/**
 * The guardrail. This is the most important file in the server.
 *
 * The judge model returns lead_ids and judgments only. This module is the sole
 * place where those become user-visible competitors, and it enforces:
 *
 *  - unknown lead_id          -> dropped (the model invented it)
 *  - duplicate lead_id        -> first occurrence kept, rest dropped
 *  - features_matched outside 1..featureCount -> filtered out per-number
 *  - a judgment whose own feature list is now empty AND claims relevance
 *      -> relevant is forced false (no evidence for the claim)
 *  - extra fields             -> already rejected by .strict()
 *  - oversized arrays         -> already capped by schema
 *
 * Name, url, source and snippet are ALWAYS copied from the lead record. The
 * model has no path to influence them.
 */
export const MAX_COMPETITORS = 6;
export function joinJudgments(input) {
    const { leads, features } = input;
    const max = input.maxCompetitors ?? MAX_COMPETITORS;
    const byId = new Map(leads.map((l) => [l.lead_id, l]));
    const validFeatureNumbers = new Set(features.map((f) => f.n));
    const rejected = {
        unknownLeadId: 0,
        duplicateLeadId: 0,
        nonIntegerFeature: 0,
        outOfRangeFeature: 0,
        emptyEvidence: 0,
    };
    const seen = new Set();
    const competitors = [];
    for (const judgment of input.judgments) {
        if (competitors.length >= max)
            break;
        const lead = byId.get(judgment.lead_id);
        // Fabricated id: the model is describing something that was never retrieved.
        if (!lead) {
            rejected.unknownLeadId += 1;
            continue;
        }
        if (seen.has(judgment.lead_id)) {
            rejected.duplicateLeadId += 1;
            continue;
        }
        seen.add(judgment.lead_id);
        // Keep only feature numbers that exist in this case, de-duplicated and sorted.
        const numbers = new Set();
        for (const n of judgment.features_matched) {
            if (!Number.isInteger(n)) {
                rejected.nonIntegerFeature += 1;
                continue;
            }
            if (!validFeatureNumbers.has(n)) {
                rejected.outOfRangeFeature += 1;
                continue;
            }
            numbers.add(n);
        }
        const matched = [...numbers]
            .sort((a, b) => a - b)
            .map((n) => features.find((f) => f.n === n))
            .filter(Boolean);
        // A lead can only be relevant if at least one feature survived.
        let relevant = judgment.relevant;
        if (relevant && matched.length === 0) {
            relevant = false;
            rejected.emptyEvidence += 1;
        }
        const total = features.length;
        const overlapPercent = total > 0 ? Math.round((matched.length / total) * 100) : 0;
        competitors.push({
            // Everything below this line comes from the lead record, not the model.
            lead_id: lead.lead_id,
            source: lead.source,
            source_label: lead.source_label,
            name: lead.name,
            url: lead.url,
            snippet: lead.snippet,
            // Everything below is computed or bounded by the server.
            overlap_percent: Math.max(0, Math.min(100, overlapPercent)),
            features_matched: matched,
            why_similar: judgment.why_similar.slice(0, 160),
            relevant,
        });
    }
    // Strongest overlap first; irrelevant leads last.
    competitors.sort((a, b) => {
        if (a.relevant !== b.relevant)
            return a.relevant ? -1 : 1;
        return b.overlap_percent - a.overlap_percent;
    });
    return { competitors, rejected };
}
//# sourceMappingURL=joiner.js.map