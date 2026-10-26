import { describe, expect, it } from "vitest";
import {
  ALREADY_EXISTS_AT,
  PARTLY_EXISTS_AT,
  computeScore,
  oneLineReason,
  overlapPercent,
} from "../src/services/pipeline/score.js";
import type { Competitor, SourceStatus } from "../src/types/case.js";

const competitor = (over: Partial<Competitor> = {}): Competitor => ({
  lead_id: "lead-01",
  source: "github",
  source_label: "GitHub",
  name: "thing",
  url: "https://github.com/o/r",
  snippet: "does the thing",
  overlap_percent: 0,
  features_matched: [],
  why_similar: "",
  relevant: true,
  ...over,
});

const okAll: SourceStatus[] = [
  { source: "github", ok: true, count: 6 },
  { source: "web", ok: true, count: 8 },
  { source: "npm", ok: true, count: 4 },
  { source: "itunes", ok: true, count: 3 },
];

describe("overlapPercent", () => {
  it("rounds matched/total", () => {
    expect(overlapPercent(1, 3)).toBe(33);
    expect(overlapPercent(2, 3)).toBe(67);
    expect(overlapPercent(3, 3)).toBe(100);
    expect(overlapPercent(0, 4)).toBe(0);
  });

  it("clamps and never divides by zero", () => {
    expect(overlapPercent(5, 0)).toBe(0);
    expect(overlapPercent(0, 0)).toBe(0);
  });
});

describe("computeScore — thresholds", () => {
  const at = (overlap: number) =>
    computeScore({
      competitors: [competitor({ overlap_percent: overlap })],
      leadsConsidered: 10,
      statuses: okAll,
    });

  it("already_exists at exactly 70", () => {
    expect(at(ALREADY_EXISTS_AT).verdict).toBe("already_exists");
    expect(at(100).verdict).toBe("already_exists");
  });

  it("partly_exists at 69", () => {
    expect(at(69).verdict).toBe("partly_exists");
    expect(at(PARTLY_EXISTS_AT).verdict).toBe("partly_exists");
  });

  it("pretty_fresh at 34", () => {
    expect(at(34).verdict).toBe("pretty_fresh");
    expect(at(0).verdict).toBe("pretty_fresh");
  });

  it("ignores irrelevant competitors when picking the verdict", () => {
    const out = computeScore({
      competitors: [competitor({ overlap_percent: 100, relevant: false })],
      leadsConsidered: 10,
      statuses: okAll,
    });
    expect(out.verdict).toBe("pretty_fresh");
    expect(out.max_overlap).toBe(0);
  });
});

describe("computeScore — novelty", () => {
  it("is 100 - max when there is a single relevant lead", () => {
    // max and mean_top3 are the same value with one sample; this is intended.
    const out = computeScore({
      competitors: [competitor({ overlap_percent: 60 })],
      leadsConsidered: 10,
      statuses: okAll,
    });
    expect(out.novelty_score).toBe(40);
  });

  it("weights max 0.7 and mean-of-top-3 0.3", () => {
    // max=80, top3=(80+40+20)/3=46.67->47
    // 0.7*80 + 0.3*47 = 56 + 14.1 = 70.1 -> round 70 -> novelty 30
    const out = computeScore({
      competitors: [
        competitor({ overlap_percent: 80 }),
        competitor({ overlap_percent: 40 }),
        competitor({ overlap_percent: 20 }),
        competitor({ overlap_percent: 5 }), // 4th, excluded from mean_top3
      ],
      leadsConsidered: 10,
      statuses: okAll,
    });

    expect(out.max_overlap).toBe(80);
    expect(out.mean_top3_overlap).toBe(47);
    expect(out.novelty_score).toBe(30);
  });

  it("stays within 0..100", () => {
    const out = computeScore({
      competitors: [
        competitor({ overlap_percent: 100 }),
        competitor({ overlap_percent: 100 }),
        competitor({ overlap_percent: 100 }),
      ],
      leadsConsidered: 10,
      statuses: okAll,
    });
    expect(out.novelty_score).toBe(0);
  });

  it("is 100 with no relevant competitors", () => {
    const out = computeScore({ competitors: [], leadsConsidered: 10, statuses: okAll });
    expect(out.novelty_score).toBe(100);
  });
});

describe("computeScore — inconclusive gate", () => {
  it("is inconclusive with fewer than 3 leads", () => {
    const out = computeScore({
      competitors: [competitor({ overlap_percent: 90 })],
      leadsConsidered: 2,
      statuses: okAll,
    });
    expect(out.verdict).toBe("inconclusive");
    expect(out.inconclusive_reason).toContain("2 leads");
  });

  it("is inconclusive with 2 failed sources", () => {
    const out = computeScore({
      competitors: [competitor({ overlap_percent: 90 })],
      leadsConsidered: 10,
      statuses: [
        { source: "github", ok: false, count: 0 },
        { source: "web", ok: false, count: 0 },
        { source: "npm", ok: true, count: 2 },
        { source: "itunes", ok: true, count: 1 },
      ],
    });
    expect(out.verdict).toBe("inconclusive");
    expect(out.inconclusive_reason).toContain("2 sources failed");
  });

  it("is decisive with exactly 1 failed source", () => {
    const out = computeScore({
      competitors: [competitor({ overlap_percent: 30 })],
      leadsConsidered: 5,
      statuses: [
        { source: "github", ok: false, count: 0 },
        { source: "web", ok: true, count: 5 },
      ],
    });
    expect(out.verdict).toBe("pretty_fresh");
  });

  it("still reports a novelty score when inconclusive", () => {
    // A blank bar reads as a bug; the number is honest, the verdict is withheld.
    const out = computeScore({
      competitors: [competitor({ overlap_percent: 50 })],
      leadsConsidered: 1,
      statuses: okAll,
    });
    expect(out.verdict).toBe("inconclusive");
    expect(out.novelty_score).toBe(50);
  });
});

describe("oneLineReason", () => {
  it("names the top competitor when one exists", () => {
    const text = oneLineReason({
      verdict: "already_exists",
      maxOverlap: 80,
      relevantLeads: 1,
      leadsConsidered: 12,
      inconclusiveReason: null,
      topCompetitorName: "Planta",
    });
    expect(text).toContain("Planta");
    expect(text).toContain("80%");
  });

  it("explains the gate when inconclusive", () => {
    const text = oneLineReason({
      verdict: "inconclusive",
      maxOverlap: 0,
      relevantLeads: 0,
      leadsConsidered: 1,
      inconclusiveReason: "only 1 lead to work with",
    });
    expect(text).toContain("only 1 lead");
  });

  it("says nothing matched when nothing matched", () => {
    const text = oneLineReason({
      verdict: "pretty_fresh",
      maxOverlap: 0,
      relevantLeads: 0,
      leadsConsidered: 20,
      inconclusiveReason: null,
    });
    expect(text).toContain("20 leads");
  });
});

describe("computeScore — multi-factor forensic novelty engine", () => {
  const features = [
    { n: 1, text: "Core unique innovation mechanic" },
    { n: 2, text: "Secondary utility service" },
    { n: 3, text: "Standard client interface" },
  ];

  it("rewards verified white space from whats_new and gaps", () => {
    const withoutWhitespace = computeScore({
      competitors: [competitor({ overlap_percent: 50, relevant: true })],
      leadsConsidered: 10,
      statuses: okAll,
      features,
      whatsNew: [],
      gaps: [],
    });

    const withWhitespace = computeScore({
      competitors: [competitor({ overlap_percent: 50, relevant: true })],
      leadsConsidered: 10,
      statuses: okAll,
      features,
      whatsNew: [
        "On-device zero-knowledge vector search",
        "Deterministic local clustering pipeline",
      ],
      gaps: ["Existing tools require cloud uploads"],
    });

    // Substantive white space produces a higher novelty score
    expect(withWhitespace.novelty_score).toBeGreaterThan(withoutWhitespace.novelty_score);
  });

  it("differentiates when top competitor missed core feature #1", () => {
    const matchedCore = computeScore({
      competitors: [
        competitor({
          overlap_percent: 50,
          relevant: true,
          features_matched: [{ n: 1, text: "Core unique innovation mechanic" }],
        }),
      ],
      leadsConsidered: 10,
      statuses: okAll,
      features,
      whatsNew: ["Some new angle"],
    });

    const missedCore = computeScore({
      competitors: [
        competitor({
          overlap_percent: 50,
          relevant: true,
          features_matched: [{ n: 2, text: "Secondary utility service" }],
        }),
      ],
      leadsConsidered: 10,
      statuses: okAll,
      features,
      whatsNew: ["Some new angle"],
    });

    // The competitor that only matched secondary utility leaves the core innovation intact
    expect(missedCore.novelty_score).toBeGreaterThan(matchedCore.novelty_score);
  });

  it("penalizes multi-channel market saturation with multiple competitors", () => {
    const singleLead = computeScore({
      competitors: [
        competitor({ overlap_percent: 60, relevant: true, source: "github" }),
      ],
      leadsConsidered: 10,
      statuses: okAll,
      features,
      whatsNew: ["New workflow"],
    });

    const crowdedMarket = computeScore({
      competitors: [
        competitor({ overlap_percent: 60, relevant: true, source: "github" }),
        competitor({ overlap_percent: 55, relevant: true, source: "npm" }),
        competitor({ overlap_percent: 50, relevant: true, source: "itunes" }),
        competitor({ overlap_percent: 45, relevant: true, source: "web" }),
      ],
      leadsConsidered: 10,
      statuses: okAll,
      features,
      whatsNew: ["New workflow"],
    });

    // Crowded 4-channel market receives a saturation penalty
    expect(singleLead.novelty_score).toBeGreaterThan(crowdedMarket.novelty_score);
  });

  it("expands dynamic range instead of clamping everything to 30-40", () => {
    // 1. Direct clone with core match: drops deep into low novelty
    const clone = computeScore({
      competitors: [
        competitor({
          overlap_percent: 90,
          relevant: true,
          features_matched: [{ n: 1, text: "Core" }],
        }),
        competitor({ overlap_percent: 80, relevant: true }),
      ],
      leadsConsidered: 10,
      statuses: okAll,
      features,
      whatsNew: [],
    });

    // 2. Fresh idea with uncolonized whitespace: climbs high into novelty
    const fresh = computeScore({
      competitors: [
        competitor({
          overlap_percent: 30,
          relevant: true,
          features_matched: [{ n: 3, text: "UI" }],
        }),
      ],
      leadsConsidered: 10,
      statuses: okAll,
      features,
      whatsNew: [
        "Novel neural synthesis pipeline",
        "Zero-latency peer-to-peer transport",
      ],
      gaps: ["No current competitor operates offline"],
    });

    expect(clone.novelty_score).toBeLessThanOrEqual(25);
    expect(fresh.novelty_score).toBeGreaterThanOrEqual(75);
    // Real separation: dynamic range >= 50 points
    expect(fresh.novelty_score - clone.novelty_score).toBeGreaterThanOrEqual(50);
  });
});
