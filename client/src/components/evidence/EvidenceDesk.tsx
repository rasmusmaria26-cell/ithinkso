import React from "react";
import type { Competitor } from "../../types/case.ts";
import { EvidenceCard } from "./EvidenceCard.tsx";

interface EvidenceDeskProps {
  competitors: Competitor[];
  onInspectCompetitor: (competitor: Competitor) => void;
  isSoundEnabled?: boolean;
}

export const EvidenceDesk: React.FC<EvidenceDeskProps> = ({
  competitors,
  onInspectCompetitor,
  isSoundEnabled = false,
}) => {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 my-8">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-6">
        <div className="flex items-center gap-3">
          <span className="font-stamp text-sm sm:text-base uppercase tracking-widest text-ink">
            EVIDENCE CATALOG // SUBPOENAED COMPETITORS
          </span>
          <span className="text-xs font-mono text-ink/60">
            ({competitors.length} RECORDED)
          </span>
        </div>
        <span className="text-[11px] font-mono text-ink/50 uppercase hidden sm:inline">
          Click any card to cross-examine
        </span>
      </div>

      {competitors.length === 0 ? (
        <div className="bg-paper border-2 border-ink p-8 text-center shadow-[3px_3px_0px_#1B1A17]">
          <p className="font-serif italic text-xl text-ink">
            No leads yet.
          </p>
          <p className="font-mono text-xs text-ink/70 mt-2">
            No substantial direct competitors were surfaced in the queried registries.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {competitors.map((comp, idx) => (
            <EvidenceCard
              key={comp.lead_id}
              competitor={comp}
              index={idx}
              onInspect={onInspectCompetitor}
              isSoundEnabled={isSoundEnabled}
            />
          ))}
        </div>
      )}
    </section>
  );
};
