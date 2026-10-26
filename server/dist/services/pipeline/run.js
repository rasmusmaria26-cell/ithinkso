/**
 * The pipeline. One function, one straight line, every external dependency
 * injected so the whole thing runs in tests without a socket.
 *
 * Order (see ARCHITECTURE.md §6):
 *   validate -> cache -> decompose -> persist -> search -> judge -> join -> score -> save
 *
 * Two deliberate departures from the shorthand ordering in the brief, both
 * because the alternative corrupts state:
 *   - cache is checked BEFORE decompose and BEFORE persist. After persist it
 *     would leave an orphan `running` document on every cache hit, and after
 *     decompose it would pay an LLM call for a result we already have.
 *   - `clarify` persists nothing, for the same orphan reason.
 */
import { nanoid } from "nanoid";
import { CASE_TTL_DAYS } from "../../db/store.js";
import { DECOMPOSE_SCHEMA, DECOMPOSE_SYSTEM, JUDGE_SCHEMA, JUDGE_SYSTEM, buildDecomposeUser, buildJudgeUser, } from "../llm/prompts.js";
import { aggregate } from "../search/aggregator.js";
import { DecomposeOutputSchema, JudgeOutputSchema } from "../../types/case.js";
import { CACHE_TTL_MS, ideaHash } from "./cache.js";
import { joinJudgments } from "./joiner.js";
import { computeScore, oneLineReason } from "./score.js";
const TTL_MS = CASE_TTL_DAYS * 24 * 60 * 60 * 1000;
/** Feature numbers must be 1..n and contiguous: every overlap calculation depends on it. */
function renumberFeatures(features) {
    return [...features]
        .sort((a, b) => a.n - b.n)
        .map((f, i) => ({ n: i + 1, text: f.text }));
}
export async function runPipeline(input) {
    const { idea, clarification, caseId, emit, signal, env, llm, store, adapters } = input;
    const createdAt = new Date();
    const hash = ideaHash(idea, clarification);
    // -------------------------------------------------------------------------
    // 1. Cache. A hit costs nothing and is the main protection for Tavily credits.
    // -------------------------------------------------------------------------
    const cached = await store.findFreshDone(hash, new Date(Date.now() - CACHE_TTL_MS));
    if (cached) {
        emit({ type: "step", text: "Same idea as a recent case. Pulling the file." });
        emit({ type: "step", text: `Filed ${cached.case_id}. No new warrants needed.` });
        emit({ type: "complete", case_id: cached.case_id, ...(cached.result ? { result: cached.result } : {}) });
        return { kind: "complete", caseId: cached.case_id };
    }
    // -------------------------------------------------------------------------
    // 2. Decompose
    // -------------------------------------------------------------------------
    emit({ type: "step", text: "Reading the idea. Splitting it into angles." });
    const decomposeRaw = await llm.json({
        system: DECOMPOSE_SYSTEM,
        user: buildDecomposeUser(idea, clarification),
        schema: DECOMPOSE_SCHEMA,
        signal,
        temperature: 0.2,
    });
    if (!decomposeRaw.ok) {
        emit({ type: "step", text: "The desk went quiet." });
        emit({ type: "error", code: "llm_failed", message: decomposeRaw.reason });
        return { kind: "error", code: "llm_failed", message: decomposeRaw.reason };
    }
    const decomposed = DecomposeOutputSchema.safeParse(decomposeRaw.value);
    if (!decomposed.success) {
        // One retry with the shape restated. Then fail cleanly.
        const retry = await llm.json({
            system: DECOMPOSE_SYSTEM,
            user: buildDecomposeUser(idea, clarification) +
                "\n\nYour previous reply did not match the JSON schema. Reply with ONLY the JSON object, exact keys: searchable, question, features[{n,text}], queries[string].",
            schema: DECOMPOSE_SCHEMA,
            signal,
            temperature: 0,
        });
        const second = retry.ok ? DecomposeOutputSchema.safeParse(retry.value) : null;
        if (!second?.success) {
            const reason = "decompose output did not match the schema twice";
            emit({ type: "error", code: "llm_failed", message: reason });
            return { kind: "error", code: "llm_failed", message: reason };
        }
        return continueFromDecompose(second.data);
    }
    return continueFromDecompose(decomposed.data);
    // Hoisted so the early-return path above reads as a single decision.
    async function continueFromDecompose(data) {
        const features = renumberFeatures(data.features);
        const queries = [...new Set(data.queries.map((q) => q.trim()).filter(Boolean))];
        if (!data.searchable) {
            const question = (data.question ?? "").trim() ||
                "What exactly does it do, and for whom? One sentence is enough.";
            emit({ type: "clarify", question });
            return { kind: "clarify", question };
        }
        if (!features.length || !queries.length) {
            const reason = "idea produced no features or no queries";
            emit({ type: "error", code: "llm_failed", message: reason });
            return { kind: "error", code: "llm_failed", message: reason };
        }
        emit({
            type: "step",
            text: `${features.length} core features. ${queries.length} angles to search.`,
        });
        // -----------------------------------------------------------------------
        // 3. Persist as running, so a dropped stream loses no paid work.
        // -----------------------------------------------------------------------
        try {
            await store.create({
                case_id: caseId,
                status: "running",
                stage: "searching",
                idea,
                idea_hash: hash,
                verdict: null,
                result: null,
                error: null,
                created_at: createdAt,
                expires_at: new Date(createdAt.getTime() + TTL_MS),
            });
        }
        catch (err) {
            // Storage is best-effort at this stage: an in-memory hiccup must not stop
            // the user seeing their answer, but a duplicate case_id would mean the id
            // generator or rate limit is broken, so surface it.
            emit({
                type: "step",
                text: "Could not open a file on this case. Carrying on.",
            });
        }
        // -----------------------------------------------------------------------
        // 4. Search
        // -----------------------------------------------------------------------
        emit({ type: "step", text: "Running warrants: GitHub, npm, App Store, web." });
        const searched = await aggregate({
            adapters,
            queries,
            signal,
            maxConcurrent: env.MAX_CONCURRENT_SEARCHES,
            onStatus: (status) => {
                emit({ type: "source_status", status });
                emit({
                    type: "step",
                    text: status.ok
                        ? `${statusLabel(status.source)}: ${status.count} lead${status.count === 1 ? "" : "s"}.`
                        : `${statusLabel(status.source)} came back empty.`,
                });
            },
        });
        const { leads, statuses, failedSources } = searched;
        emit({
            type: "step",
            text: failedSources > 0
                ? `${leads.length} leads from ${statuses.length - failedSources} of ${statuses.length} sources.`
                : `${leads.length} leads collected.`,
        });
        // -----------------------------------------------------------------------
        // 5. Judge (skipped entirely when there is nothing to judge)
        // -----------------------------------------------------------------------
        let judge = { judgments: [], whats_new: [], gaps: [], suggested_twist: "" };
        if (leads.length > 0) {
            emit({ type: "step", text: `Cross-examining ${leads.length} leads against the idea.` });
            const judgeUser = buildJudgeUser({ idea, clarification, features, leads });
            const first = await llm.json({
                system: JUDGE_SYSTEM,
                user: judgeUser,
                schema: JUDGE_SCHEMA,
                signal,
                temperature: 0,
            });
            let parsed = first.ok ? JudgeOutputSchema.safeParse(first.value) : null;
            if (!first.ok || !parsed?.success) {
                emit({ type: "step", text: "Bad shape. Reading it again." });
                const second = await llm.json({
                    system: JUDGE_SYSTEM,
                    user: judgeUser +
                        "\n\nYour previous reply did not match the schema. Reply with ONLY the JSON object, exact keys: judgments[{lead_id,features_matched,why_similar,relevant}], whats_new[], gaps[], suggested_twist.",
                    schema: JUDGE_SCHEMA,
                    signal,
                    temperature: 0,
                });
                parsed = second.ok ? JudgeOutputSchema.safeParse(second.value) : null;
                if (!parsed?.success) {
                    const reason = first.ok ? "judge output did not match the schema twice" : first.reason;
                    emit({ type: "step", text: "The analysis stalled." });
                    await store.update(caseId, { status: "failed", stage: null, error: "llm_failed" });
                    emit({ type: "error", code: "llm_failed", message: reason });
                    return { kind: "error", code: "llm_failed", message: reason };
                }
            }
            judge = parsed.data;
        }
        // -----------------------------------------------------------------------
        // 6. Join (the guardrail) and score (the arithmetic)
        // -----------------------------------------------------------------------
        const scored = joinJudgments({ judgments: judge.judgments, leads, features });
        const score = computeScore({
            competitors: scored.competitors,
            leadsConsidered: leads.length,
            statuses,
            whatsNew: judge.whats_new,
            gaps: judge.gaps,
            features,
        });
        const topCompetitor = scored.competitors.find((c) => c.relevant);
        const result = {
            verdict: score.verdict,
            novelty_score: score.novelty_score,
            max_overlap: score.max_overlap,
            leads_considered: score.leads_considered,
            relevant_leads: score.relevant_leads,
            features,
            competitors: scored.competitors,
            whats_new: judge.whats_new,
            gaps: judge.gaps,
            suggested_twist: judge.suggested_twist,
            one_line_reason: oneLineReason({
                verdict: score.verdict,
                maxOverlap: score.max_overlap,
                relevantLeads: score.relevant_leads,
                leadsConsidered: score.leads_considered,
                inconclusiveReason: score.inconclusive_reason,
                ...(topCompetitor ? { topCompetitorName: topCompetitor.name } : {}),
            }),
            sources: statuses,
            created_at: createdAt.toISOString(),
            expires_at: new Date(createdAt.getTime() + TTL_MS).toISOString(),
        };
        // -----------------------------------------------------------------------
        // 7. Save + complete
        // -----------------------------------------------------------------------
        try {
            await store.update(caseId, {
                status: "done",
                stage: "complete",
                verdict: result.verdict,
                result,
            });
        }
        catch (err) {
            emit({ type: "step", text: "Filed, but the drawer stuck. Result is in the stream." });
        }
        emit({ type: "step", text: `Verdict filed. ${result.verdict.replace(/_/g, " ")}.` });
        emit({ type: "complete", case_id: caseId, result });
        return { kind: "complete", caseId };
    }
}
function statusLabel(source) {
    switch (source) {
        case "github":
            return "GitHub";
        case "npm":
            return "npm";
        case "itunes":
            return "App Store";
        default:
            return "Web search";
    }
}
/** Used by the route: a fresh, collision-checked id. */
export function newCaseId() {
    return nanoid(10);
}
//# sourceMappingURL=run.js.map