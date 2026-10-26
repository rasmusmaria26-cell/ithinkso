/**
 * Fan-out across adapters under the quota rules, then normalize into leads.
 *
 * Guarantees:
 *  - every adapter gets a hard deadline (its own signal, combined with the
 *    caller's cancellation signal)
 *  - one adapter cannot abort the run; a failure becomes source_status ok:false
 *  - statuses are emitted the moment each source settles, so the case log
 *    streams live rather than waiting for the slowest adapter
 *  - output order is stable, so lead-01 means the same thing across runs
 */

import type { Lead, Source, SourceStatus } from "../../types/case.js";
import { cleanName, cleanSnippet, hostLabel, safeHttpUrl } from "../text.js";
import { dedupeLeads } from "./dedupe.js";
import { mapLimit } from "./http.js";
import type { AdapterResult, SearchLead, SourceAdapter } from "./types.js";

export type AggregatorInput = {
  adapters: SourceAdapter[];
  /** Queries from the decompose call, in the model's order. */
  queries: string[];
  /** Cancels every in-flight request (client disconnected). */
  signal: AbortSignal;
  maxConcurrent?: number;
  cap?: number;
  /** Fired the moment each source settles. */
  onStatus?: (status: SourceStatus) => void;
};

export type AggregatorOutput = {
  leads: Lead[];
  statuses: SourceStatus[];
  failedSources: number;
};

const LABELS: Record<Source, string> = {
  github: "GitHub",
  npm: "npm",
  itunes: "App Store",
  web: "web",
};

type Settled = {
  adapter: SourceAdapter;
  index: number;
  result: AdapterResult;
};

export async function aggregate(input: AggregatorInput): Promise<AggregatorOutput> {
  const { adapters, queries, signal } = input;
  const maxConcurrent = input.maxConcurrent ?? 4;
  const cap = input.cap ?? 20;

  const settled = await mapLimit(adapters, maxConcurrent, async (adapter, index) => {
    let result: AdapterResult;

    if (!adapter.isAvailable()) {
      result = { ok: false, leads: [], note: "unavailable in this environment" };
    } else {
      try {
        result = await adapter.search({
          // Per-source slice: this is what keeps Tavily credits survivable.
          queries: queries.slice(0, adapter.maxQueries),
          signal,
        });
      } catch (err) {
        // Adapters are not supposed to throw. If one does, contain it here.
        result = {
          ok: false,
          leads: [],
          note: err instanceof Error ? err.message.slice(0, 120) : "adapter error",
        };
      }
    }

    const leads = result.leads.slice(0, adapter.quota);

    // Live: emit as soon as this source is done, not after all of them.
    input.onStatus?.({
      source: adapter.source,
      ok: result.ok,
      count: leads.length,
      ...(result.note ? { note: result.note } : {}),
    });

    return { adapter, index, result: { ...result, leads } } satisfies Settled;
  });

  // Restore adapter order so lead_ids are deterministic regardless of which
  // source returned first.
  const ordered = [...settled].sort((a, b) => a.index - b.index);

  const statuses: SourceStatus[] = [];
  const normalized: (SearchLead & { source: Source; label: string })[] = [];

  for (const { adapter, result } of ordered) {
    statuses.push({
      source: adapter.source,
      ok: result.ok,
      count: result.leads.length,
      ...(result.note ? { note: result.note } : {}),
    });

    for (const lead of result.leads) {
      const url = safeHttpUrl(lead.url);
      const name = cleanName(lead.name);
      if (!url || !name) continue;

      normalized.push({
        ...lead,
        url,
        name,
        snippet: cleanSnippet(lead.snippet) || name,
        source: adapter.source,
        label: LABELS[adapter.source],
      });
    }
  }

  const deduped = dedupeLeads(
    normalized.map((l) => ({
      ...l,
      repositoryUrl: l.repositoryUrl ?? null,
    })),
    { cap },
  );

  const leads: Lead[] = deduped.kept.map((lead, i) => ({
    lead_id: `lead-${String(i + 1).padStart(2, "0")}`,
    source: lead.source,
    source_label: lead.source === "web" ? `web · ${hostLabel(lead.url)}` : lead.label,
    name: lead.name,
    url: lead.url,
    snippet: lead.snippet,
  }));

  return {
    leads,
    statuses,
    failedSources: statuses.filter((s) => !s.ok).length,
  };
}
