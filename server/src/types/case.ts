import { z } from "zod";

/**
 * The contracts. Two rules govern this file:
 *
 * 1. `Lead` is server-built only. The judge model never emits one.
 * 2. Every schema the MODEL is asked to produce is "input" — and every input
 *    schema is parsed with `.strict()` so extra fields are visible rather than
 *    silently ignored.
 */

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

/** Sources that can produce evidence. Brave/Groq are deliberately absent. */
export const SourceSchema = z.enum(["github", "npm", "itunes", "web"]);
export type Source = z.infer<typeof SourceSchema>;

export const LeadSchema = z.object({
  lead_id: z.string().regex(/^lead-\d{2}$/),
  source: SourceSchema,
  name: z.string().min(1).max(200),
  url: z.string().min(1),
  snippet: z.string().max(400),
  source_label: z.string().min(1),
});
export type Lead = z.infer<typeof LeadSchema>;

// ---------------------------------------------------------------------------
// LLM call 1 — decompose
// ---------------------------------------------------------------------------

export const FeatureSchema = z.object({
  n: z.number().int().positive(),
  text: z.string().min(1).max(200),
});
export type Feature = z.infer<typeof FeatureSchema>;

/**
 * `features` and `queries` are allowed to be EMPTY. When the idea is too vague
 * to search (`searchable: false`), the model is instructed to return a question,
 * not fabricated angles — requiring 1+ of each would make the clarify path
 * impossible to satisfy and turn a spelled "too vague" into a schema failure.
 * The pipeline enforces "must be non-empty" only on the searchable path.
 */
export const DecomposeOutputSchema = z
  .object({
    searchable: z.boolean(),
    question: z.string().max(300).nullish(),
    features: z.array(FeatureSchema).max(6),
    queries: z.array(z.string().min(1).max(200)).max(8),
  })
  .strict();

export type DecomposeOutput = z.infer<typeof DecomposeOutputSchema>;

// ---------------------------------------------------------------------------
// LLM call 2 — judge
// ---------------------------------------------------------------------------

/**
 * The model's entire output surface. No url, name, source, score, or verdict
 * field exists here — so those cannot be hallucinated, only computed.
 */
export const JudgmentSchema = z
  .object({
    lead_id: z.string().max(40),
    features_matched: z.array(z.number().int().min(0).max(99)).max(10),
    why_similar: z.string().max(160),
    relevant: z.boolean(),
  })
  .strict();

export const JudgeOutputSchema = z
  .object({
    judgments: z.array(JudgmentSchema).max(6),
    whats_new: z.array(z.string().max(200)).max(6),
    gaps: z.array(z.string().max(200)).max(6),
    suggested_twist: z.string().max(300),
  })
  .strict();

export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;
export type Judgment = z.infer<typeof JudgmentSchema>;

// ---------------------------------------------------------------------------
// Result (server-computed)
// ---------------------------------------------------------------------------

export const VerdictSchema = z.enum([
  "already_exists",
  "partly_exists",
  "pretty_fresh",
  "inconclusive",
]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const CompetitorSchema = z.object({
  lead_id: z.string(),
  source: SourceSchema,
  source_label: z.string(),
  name: z.string(),
  url: z.string(),
  snippet: z.string(),
  overlap_percent: z.number().min(0).max(100),
  features_matched: z.array(FeatureSchema),
  why_similar: z.string(),
  relevant: z.boolean(),
});
export type Competitor = z.infer<typeof CompetitorSchema>;

export const SourceStatusSchema = z.object({
  source: SourceSchema,
  ok: z.boolean(),
  count: z.number().int().min(0),
  note: z.string().optional(),
});
export type SourceStatus = z.infer<typeof SourceStatusSchema>;

export const CaseResultSchema = z.object({
  verdict: VerdictSchema,
  novelty_score: z.number().int().min(0).max(100),
  max_overlap: z.number().int().min(0).max(100),
  leads_considered: z.number().int().min(0),
  relevant_leads: z.number().int().min(0),
  features: z.array(FeatureSchema),
  competitors: z.array(CompetitorSchema),
  whats_new: z.array(z.string()),
  gaps: z.array(z.string()),
  suggested_twist: z.string(),
  /** Short, deadpan, server-written. Never model prose that could state a verdict. */
  one_line_reason: z.string(),
  sources: z.array(SourceStatusSchema),
  created_at: z.string(),
  expires_at: z.string(),
});
export type CaseResult = z.infer<typeof CaseResultSchema>;
