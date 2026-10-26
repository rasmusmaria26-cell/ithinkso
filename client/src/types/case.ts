export type Source = "github" | "npm" | "itunes" | "web";

export type Feature = {
  n: number;
  text: string;
};

export type Lead = {
  lead_id: string;
  source: Source;
  name: string;
  url: string;
  snippet: string;
  source_label: string;
};

export type Competitor = {
  lead_id: string;
  source: Source;
  source_label: string;
  name: string;
  url: string;
  snippet: string;
  overlap_percent: number;
  features_matched: Feature[];
  why_similar: string;
  relevant: boolean;
};

export type SourceStatus = {
  source: Source;
  ok: boolean;
  count: number;
  note?: string;
};

export type Verdict =
  | "already_exists"
  | "partly_exists"
  | "pretty_fresh"
  | "inconclusive";

export type CaseResult = {
  verdict: Verdict;
  novelty_score: number;
  max_overlap: number;
  leads_considered: number;
  relevant_leads: number;
  features: Feature[];
  competitors: Competitor[];
  whats_new: string[];
  gaps: string[];
  suggested_twist: string;
  one_line_reason: string;
  sources: SourceStatus[];
  created_at: string;
  expires_at: string;
};

export type ErrorCode =
  | "bad_request"
  | "rate_limited"
  | "llm_failed"
  | "no_evidence"
  | "internal";

export type ServerEvent =
  | { type: "case_id"; seq: number; case_id: string }
  | { type: "step"; seq: number; text: string }
  | { type: "source_status"; seq: number; status: SourceStatus }
  | { type: "clarify"; seq: number; question: string }
  | { type: "error"; seq: number; code: ErrorCode; message: string }
  | { type: "complete"; seq: number; case_id: string; result?: CaseResult };

export type ColdCase = {
  case_id: string;
  case_number: string;
  idea: string;
  verdict: Verdict;
  novelty_score: number;
  date: string;
};
