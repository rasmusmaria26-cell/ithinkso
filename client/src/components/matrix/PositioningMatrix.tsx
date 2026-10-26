import React, { useState } from "react";
import type { Competitor } from "../../types/case.ts";

interface PositioningMatrixProps {
  competitors: Competitor[];
  conceptText: string;
  suggestedTwist: string;
  noveltyScore: number;
  onInspectCompetitor: (competitor: Competitor) => void;
  isSoundEnabled?: boolean;
}

export const PositioningMatrix: React.FC<PositioningMatrixProps> = ({
  competitors,
  conceptText,
  suggestedTwist,
  noveltyScore,
  onInspectCompetitor,
}) => {
  const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);

  // Compute 2D coordinates for each competitor based on source and characteristics
  // X: Developer (10%) <---> Consumer / End-User (90%)
  // Y: Specialized Workflow (15%) <---> Broad Utility (85%)
  const plotCompetitor = (comp: Competitor, index: number) => {
    let x = 50;
    let y = 50;

    // Source bias on X axis (Dev vs Consumer)
    if (comp.source === "github" || comp.source === "npm") {
      x = 22 + (index % 3) * 12;
    } else if (comp.source === "itunes") {
      x = 76 - (index % 3) * 10;
    } else {
      x = 48 + (index % 2 === 0 ? -12 : 14);
    }

    // Overlap bias on Y axis (Broad vs Specialized)
    const normalizedOverlap = comp.overlap_percent / 100;
    y = 20 + (1 - normalizedOverlap) * 60 + ((index * 7) % 15) - 7;

    // Clamp coordinates safely within matrix boundary [12%, 88%]
    x = Math.max(14, Math.min(86, x));
    y = Math.max(14, Math.min(84, y));

    return { x, y };
  };

  // Your Concept coordinates: targeted towards higher novelty / unclaimed territory
  const conceptX = 68;
  const conceptY = 28;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 my-8">
      <div className="bg-paper border-2 border-ink p-6 shadow-[6px_6px_0px_#1B1A17] relative">
        {/* Header Ribbon */}
        <div className="flex flex-wrap items-center justify-between border-b-2 border-dashed border-ink/40 pb-4 mb-6 gap-2">
          <div>
            <div className="font-stamp text-xs uppercase tracking-widest text-stamp-red flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-stamp-red animate-pulse" />
              TACTICAL EXHIBIT // ANGLE OF ATTACK
            </div>
            <h3 className="font-serif italic text-2xl text-ink font-bold mt-1">
              Competitive White Space Matrix
            </h3>
          </div>
          <div className="font-mono text-xs text-ink/70 bg-desk-blotter px-3 py-1.5 border border-ink/30">
            Quadrant Plot: <span className="font-bold text-ink">{competitors.length} Prior Art Leads</span>
          </div>
        </div>

        {/* Matrix Canvas Container */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-[#FAF6EE] border-2 border-ink overflow-hidden select-none">
          {/* Subtle Grid Lines Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, #1B1A17 1px, transparent 1px), linear-gradient(to bottom, #1B1A17 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Central Quadrant Dividers */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b-2 border-dashed border-ink/40 pointer-events-none" />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-r-2 border-dashed border-ink/40 pointer-events-none" />

          {/* Quadrant Watermark Labels */}
          <div className="absolute top-3 left-4 font-mono text-[10px] tracking-widest uppercase text-ink/40 pointer-events-none">
            [Q1] Dev Infrastructure
          </div>
          <div className="absolute top-3 right-4 font-mono text-[10px] tracking-widest uppercase text-ink/40 pointer-events-none text-right">
            [Q2] Consumer Generalist
          </div>
          <div className="absolute bottom-3 left-4 font-mono text-[10px] tracking-widest uppercase text-ink/40 pointer-events-none">
            [Q3] Specialized Tooling
          </div>
          <div className="absolute bottom-3 right-4 font-mono text-[10px] tracking-widest uppercase text-stamp-red/60 font-bold pointer-events-none text-right">
            ★ [Q4] High-Opportunity White Space
          </div>

          {/* White Space Shading in Q4 (Target Zone) */}
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-stamp-red/5 border-t border-l border-stamp-red/20 pointer-events-none" />

          {/* Axis Labels */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-paper/90 px-2 py-0.5 border border-ink/20 font-mono text-[11px] uppercase tracking-wider text-ink font-semibold pointer-events-none z-10">
            ▲ Broad / Generalist Utility
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-paper/90 px-2 py-0.5 border border-ink/20 font-mono text-[11px] uppercase tracking-wider text-ink font-semibold pointer-events-none z-10">
            ▼ Niche / Specialized Workflow
          </div>
          <div className="absolute top-1/2 left-2 -translate-y-1/2 -rotate-90 origin-left bg-paper/90 px-2 py-0.5 border border-ink/20 font-mono text-[11px] uppercase tracking-wider text-ink font-semibold pointer-events-none z-10">
            ◄ Developer & Technical
          </div>
          <div className="absolute top-1/2 right-2 -translate-y-1/2 rotate-90 origin-right bg-paper/90 px-2 py-0.5 border border-ink/20 font-mono text-[11px] uppercase tracking-wider text-ink font-semibold pointer-events-none z-10">
            ► End-User & Consumer
          </div>

          {/* Plotted Competitor Markers */}
          {competitors.map((comp, idx) => {
            const { x, y } = plotCompetitor(comp, idx);
            const isHovered = hoveredLeadId === comp.lead_id;

            return (
              <div
                key={comp.lead_id}
                className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-transform duration-150 z-20"
                style={{ left: `${x}%`, top: `${y}%` }}
                onMouseEnter={() => setHoveredLeadId(comp.lead_id)}
                onMouseLeave={() => setHoveredLeadId(null)}
                onClick={() => onInspectCompetitor(comp)}
              >
                {/* Thumbtack Pin Icon */}
                <div
                  className={`w-8 h-8 rounded-full border-2 border-ink flex items-center justify-center font-mono text-xs font-bold shadow-[2px_2px_0px_#1B1A17] transition-all duration-150 ${
                    isHovered
                      ? "bg-stamp-red text-paper scale-125 z-40"
                      : "bg-paper text-ink hover:scale-110"
                  }`}
                  title={`${comp.name} (${comp.overlap_percent}% overlap)`}
                >
                  {comp.overlap_percent}%
                </div>

                {/* Card Tag Callout */}
                <div
                  className={`absolute left-9 top-0 -translate-y-1 bg-paper border border-ink px-2 py-1 shadow-[2px_2px_0px_#1B1A17] whitespace-nowrap pointer-events-none transition-all duration-150 ${
                    isHovered ? "opacity-100 scale-100 z-50" : "opacity-0 scale-95 hidden sm:block sm:opacity-80"
                  }`}
                >
                  <div className="font-mono text-[11px] font-bold text-ink truncate max-w-[140px]">
                    {comp.name}
                  </div>
                  <div className="font-mono text-[9px] text-ink/60 uppercase">
                    {comp.source} &bull; Click to inspect
                  </div>
                </div>
              </div>
            );
          })}

          {/* Your Concept Pin Marker */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group"
            style={{ left: `${conceptX}%`, top: `${conceptY}%` }}
          >
            {/* Concentric Pulse Rings */}
            <div className="absolute inset-0 -m-3 rounded-full border-2 border-amber-600/60 animate-ping pointer-events-none" />
            <div className="w-10 h-10 rounded-full bg-[#FFE45C] border-3 border-ink flex items-center justify-center shadow-[3px_3px_0px_#1B1A17] cursor-pointer hover:scale-110 transition-transform">
              <span className="font-stamp text-xs font-bold text-ink">YOU</span>
            </div>

            {/* Target Reticle Tag */}
            <div className="absolute left-12 top-0 -translate-y-2 bg-[#FFE45C] border-2 border-ink px-2.5 py-1.5 shadow-[3px_3px_0px_#1B1A17] whitespace-nowrap pointer-events-none z-40 max-w-[200px]">
              <div className="font-stamp text-[10px] uppercase tracking-wider text-ink font-bold">
                PROPOSED POSITION
              </div>
              <div className="font-mono text-xs font-bold text-ink truncate" title={conceptText}>
                {conceptText || "Your Concept"}
              </div>
              <div className="font-mono text-[10px] text-ink/75">
                Novelty: {noveltyScore}/100
              </div>
            </div>
          </div>

          {/* Handwritten Field Note in White Space */}
          <div className="absolute bottom-4 right-4 max-w-[240px] pointer-events-none hidden sm:block z-10 rotate-1">
            <div className="font-hand text-base leading-tight text-ink/80 bg-[#FFF9D2] p-2.5 border border-ink/30 shadow-[2px_2px_0px_rgba(27,26,23,0.15)]">
              {suggestedTwist
                ? `\u201c${suggestedTwist}\u201d`
                : "\u201cUnclaimed territory in Q4. Focus here for maximum differentiation.\u201d"}
            </div>
          </div>
        </div>

        {/* Tactical Footer Legend */}
        <div className="mt-4 pt-3 border-t border-ink/20 flex flex-wrap items-center justify-between text-xs font-mono text-ink/75 gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#FFE45C] border border-ink" />
              <span>Your Concept</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-paper border border-ink" />
              <span>Cataloged Competitors (% Overlap)</span>
            </div>
          </div>
          <div className="text-[11px] text-ink/60">
            Tip: Click any marker to open its side-by-side evidence file.
          </div>
        </div>
      </div>
    </div>
  );
};
