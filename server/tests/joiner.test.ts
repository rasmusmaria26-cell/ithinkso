import { describe, expect, it } from "vitest";
import { joinJudgments } from "../src/services/pipeline/joiner.js";
import type { Feature, Judgment, Lead } from "../src/types/case.js";

const features: Feature[] = [
  { n: 1, text: "Detects competitors" },
  { n: 2, text: "Scores novelty" },
  { n: 3, text: "Files a case" },
  { n: 4, text: "Shares a link" },
];

const lead = (id: string, over: Partial<Lead> = {}): Lead => ({
  lead_id: id,
  source: "github",
  source_label: "GitHub",
  name: `repo-${id}`,
  url: `https://github.com/example/${id}`,
  snippet: `snippet for ${id}`,
  ...over,
});

const leads: Lead[] = [lead("lead-01"), lead("lead-02"), lead("lead-03")];

const judgment = (over: Partial<Judgment> = {}): Judgment => ({
  lead_id: "lead-01",
  features_matched: [1],
  why_similar: "does the same thing",
  relevant: true,
  ...over,
});

describe("joinJudgments — the guardrail", () => {
  it("joins a valid judgment onto the real lead record", () => {
    const out = joinJudgments({
      judgments: [judgment({ features_matched: [1, 2] })],
      leads,
      features,
    });

    expect(out.competitors).toHaveLength(1);
    const c = out.competitors[0]!;
    expect(c.name).toBe("repo-lead-01");
    expect(c.url).toBe("https://github.com/example/lead-01");
    expect(c.source_label).toBe("GitHub");
    expect(c.snippet).toBe("snippet for lead-01");
    expect(c.overlap_percent).toBe(50); // 2 of 4 features
  });

  it("drops fabricated lead_ids", () => {
    const out = joinJudgments({
      judgments: [judgment({ lead_id: "lead-99" }), judgment({ lead_id: "made-up-id" })],
      leads,
      features,
    });

    expect(out.competitors).toHaveLength(0);
    expect(out.rejected.unknownLeadId).toBe(2);
  });

  it("drops duplicate lead_ids, keeping the first", () => {
    const out = joinJudgments({
      judgments: [
        judgment({ features_matched: [1, 2, 3] }),
        judgment({ features_matched: [1], why_similar: "second one" }),
      ],
      leads,
      features,
    });

    expect(out.competitors).toHaveLength(1);
    expect(out.competitors[0]!.why_similar).toBe("does the same thing");
    expect(out.rejected.duplicateLeadId).toBe(1);
  });

  it("filters out-of-range feature numbers", () => {
    // 0, 7, 99 do not exist; only 2 survives.
    const out = joinJudgments({
      judgments: [judgment({ features_matched: [0, 2, 7, 99] })],
      leads,
      features,
    });

    expect(out.competitors[0]!.features_matched.map((f) => f.n)).toEqual([2]);
    expect(out.competitors[0]!.overlap_percent).toBe(25);
    expect(out.rejected.outOfRangeFeature).toBe(3);
  });

  it("filters non-integer feature numbers", () => {
    const out = joinJudgments({
      judgments: [judgment({ features_matched: [1.5, 2] as number[] })],
      leads,
      features,
    });

    expect(out.competitors[0]!.features_matched.map((f) => f.n)).toEqual([2]);
    expect(out.rejected.nonIntegerFeature).toBe(1);
  });

  it("de-duplicates repeated feature numbers", () => {
    const out = joinJudgments({
      judgments: [judgment({ features_matched: [1, 1, 1, 2] })],
      leads,
      features,
    });

    expect(out.competitors[0]!.features_matched.map((f) => f.n)).toEqual([1, 2]);
    expect(out.competitors[0]!.overlap_percent).toBe(50);
  });

  it("forces relevant=false when no feature survived validation", () => {
    // The model claims relevance but every number it gave was fabricated.
    const out = joinJudgments({
      judgments: [judgment({ features_matched: [42], relevant: true })],
      leads,
      features,
    });

    expect(out.competitors[0]!.relevant).toBe(false);
    expect(out.competitors[0]!.overlap_percent).toBe(0);
    expect(out.rejected.emptyEvidence).toBe(1);
  });

  it("caps competitors at 6 even if more judgments arrive", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      judgment({ lead_id: `lead-${String(i + 1).padStart(2, "0")}` }),
    );
    const manyLeads = many.map((j) => lead(j.lead_id));

    const out = joinJudgments({ judgments: many, leads: manyLeads, features });
    expect(out.competitors.length).toBeLessThanOrEqual(6);
  });

  it("truncates why_similar to 160 characters", () => {
    const out = joinJudgments({
      judgments: [judgment({ why_similar: "y".repeat(500) })],
      leads,
      features,
    });
    expect(out.competitors[0]!.why_similar).toHaveLength(160);
  });

  it("cant produce a URL that was not in the leads", () => {
    // The model has no url field at all; this asserts the join cannot invent one.
    const out = joinJudgments({
      judgments: [judgment({ lead_id: "lead-02", features_matched: [1] })],
      leads,
      features,
    });

    const urls = new Set(leads.map((l) => l.url));
    for (const c of out.competitors) expect(urls.has(c.url)).toBe(true);
  });

  it("sorts relevant leads first, then by overlap", () => {
    const out = joinJudgments({
      judgments: [
        judgment({ lead_id: "lead-01", features_matched: [1], relevant: true }),
        judgment({ lead_id: "lead-02", features_matched: [1, 2, 3], relevant: true }),
        judgment({ lead_id: "lead-03", features_matched: [1, 2, 3, 4], relevant: false }),
      ],
      leads,
      features,
    });

    expect(out.competitors.map((c) => c.lead_id)).toEqual(["lead-02", "lead-01", "lead-03"]);
  });

  it("handles an empty judgment list", () => {
    const out = joinJudgments({ judgments: [], leads, features });
    expect(out.competitors).toEqual([]);
    expect(out.rejected.unknownLeadId).toBe(0);
  });

  it("handles zero features without dividing by zero", () => {
    const out = joinJudgments({
      judgments: [judgment({ features_matched: [1] })],
      leads,
      features: [],
    });
    // Feature 1 no longer exists, so the judgment is emptied and degraded.
    expect(out.competitors[0]!.overlap_percent).toBe(0);
    expect(out.competitors[0]!.relevant).toBe(false);
  });
});
