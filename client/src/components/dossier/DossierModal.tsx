import React, { useEffect } from "react";
import type { CaseResult } from "../../types/case.ts";

interface DossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  conceptText: string;
  result: CaseResult;
}

export const DossierModal: React.FC<DossierModalProps> = ({
  isOpen,
  onClose,
  caseId,
  conceptText,
  result,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const verdictLabel = {
    already_exists: "ALREADY EXISTS",
    partly_exists: "PARTLY EXISTS",
    pretty_fresh: "PRETTY FRESH",
    inconclusive: "INCONCLUSIVE",
  }[result.verdict];

  const verdictColor = {
    already_exists: "text-stamp-red border-stamp-red",
    partly_exists: "text-amber-800 border-amber-800",
    pretty_fresh: "text-emerald-800 border-emerald-800",
    inconclusive: "text-neutral-700 border-neutral-700",
  }[result.verdict];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Dossier Card Sheet */}
      <div className="relative w-full max-w-4xl bg-paper border-4 border-ink shadow-[12px_12px_0px_#1B1A17] p-6 sm:p-10 my-8 print:my-0 print:shadow-none print:border-2 print:max-w-none print:w-full">
        {/* Screen Controls Header (Hidden in Print) */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b-2 border-dashed border-ink/30 print:hidden">
          <div className="font-mono text-xs text-ink/70">
            Previewing Classified Docket // Printable A4 / Letter PDF
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-5 py-2 border-2 border-ink bg-stamp-red text-paper font-mono text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_#1B1A17] hover:bg-ink cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-2"
            >
              <span>🖨️ Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-ink bg-paper text-ink font-mono text-xs uppercase tracking-wider hover:bg-paper-muted cursor-pointer transition-colors"
            >
              Close (Esc)
            </button>
          </div>
        </div>

        {/* --- OFFICIAL DOSSIER PRINTABLE BODY --- */}
        <div className="relative">
          {/* Faint Background Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 overflow-hidden select-none">
            <div className="font-stamp text-7xl sm:text-9xl text-ink uppercase rotate-[-35deg] tracking-widest whitespace-nowrap">
              CONFIDENTIAL // PRIOR ART
            </div>
          </div>

          {/* Dossier Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-ink pb-4 mb-6 gap-4">
            <div>
              <div className="font-stamp text-xs uppercase tracking-widest text-stamp-red">
                FEDERAL BUREAU OF DUPLICATION & REDUNDANCY
              </div>
              <h1 className="font-serif italic font-bold text-3xl sm:text-4xl text-ink mt-1">
                Prior Art Investigative Dossier
              </h1>
              <div className="font-mono text-xs text-ink/75 mt-1">
                Classification: <span className="font-bold text-ink">LEVEL 4 // PRIOR ART RECORD</span>
              </div>
            </div>

            <div className="font-mono text-xs border border-ink p-3 bg-desk-blotter/60 sm:text-right min-w-[200px]">
              <div><span className="text-ink/60">DOCKET NO:</span> <span className="font-bold text-ink font-stamp">{caseId.toUpperCase()}</span></div>
              <div><span className="text-ink/60">DATE FILED:</span> <span className="font-bold text-ink">{result.created_at ? new Date(result.created_at).toLocaleDateString() : "CURRENT"}</span></div>
              <div><span className="text-ink/60">EXPIRES:</span> <span className="font-bold text-ink">90 DAYS FROM FILING</span></div>
            </div>
          </div>

          {/* Section 1: Subject Idea & Rubber Stamp Finding */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-start">
            <div className="md:col-span-2 bg-[#FAF6EE] border-2 border-ink p-4">
              <div className="font-stamp text-[11px] uppercase tracking-wider text-ink/60 mb-1">
                SUBJECT CONCEPT UNDER INVESTIGATION:
              </div>
              <p className="font-serif italic text-lg sm:text-xl text-ink font-semibold leading-relaxed">
                &ldquo;{conceptText}&rdquo;
              </p>
              <div className="font-mono text-xs text-ink/70 mt-3 pt-3 border-t border-ink/20">
                Official Summary: <span className="text-ink font-bold">{result.one_line_reason}</span>
              </div>
            </div>

            {/* Official Stamp Box */}
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-ink/50 bg-[#FAF6EE]">
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink/60 mb-2">
                OFFICIAL DETERMINATION
              </div>
              <div className={`font-stamp text-2xl uppercase tracking-wider font-bold border-4 px-3 py-1.5 rotate-[-4deg] text-center ${verdictColor}`}>
                {verdictLabel}
              </div>
              <div className="font-mono text-xs font-bold text-ink mt-3">
                Novelty Score: {result.novelty_score} / 100
              </div>
            </div>
          </div>

          {/* Section 2: Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 font-mono text-xs">
            <div className="border border-ink p-3 bg-paper">
              <div className="text-ink/60 uppercase text-[10px]">Max Overlap</div>
              <div className="text-xl font-bold text-ink">{result.max_overlap}%</div>
            </div>
            <div className="border border-ink p-3 bg-paper">
              <div className="text-ink/60 uppercase text-[10px]">Leads Analyzed</div>
              <div className="text-xl font-bold text-ink">{result.leads_considered}</div>
            </div>
            <div className="border border-ink p-3 bg-paper">
              <div className="text-ink/60 uppercase text-[10px]">Competitors Found</div>
              <div className="text-xl font-bold text-ink">{result.relevant_leads}</div>
            </div>
            <div className="border border-ink p-3 bg-paper">
              <div className="text-ink/60 uppercase text-[10px]">Evidence Integrity</div>
              <div className="text-xl font-bold text-stamp-red">VERIFIED</div>
            </div>
          </div>

          {/* Section 3: Evidence Exhibit Catalogue */}
          <div className="mb-8">
            <div className="font-stamp text-xs uppercase tracking-widest text-ink mb-3 pb-1 border-b border-ink flex items-center justify-between">
              <span>CATALOGED EXHIBITS & PRIMARY PRIOR ART</span>
              <span className="font-mono text-[10px] font-normal text-ink/60">PUBLIC INDEX CITATIONS</span>
            </div>

            <div className="space-y-4">
              {result.competitors.slice(0, 5).map((comp, idx) => (
                <div key={comp.lead_id} className="border border-ink p-3.5 bg-[#FAF6EE] text-xs font-mono">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/20 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-stamp font-bold text-ink">EXHIBIT #{idx + 1}:</span>
                      <span className="font-bold text-sm text-ink">{comp.name}</span>
                      <span className="px-1.5 py-0.5 text-[10px] bg-desk-blotter border border-ink/40 uppercase">
                        {comp.source}
                      </span>
                    </div>
                    <div className="font-bold text-stamp-red">
                      {comp.overlap_percent}% Feature Overlap
                    </div>
                  </div>

                  <div className="text-ink/80 italic mb-2">
                    &ldquo;{comp.snippet}&rdquo;
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-ink/60 pt-1">
                    <div>Why Similar: <span className="text-ink font-medium">{comp.why_similar}</span></div>
                    <div className="truncate max-w-xs">{comp.url}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Handwritten Investigator Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 font-mono text-xs">
            <div className="border-2 border-ink p-4 bg-[#FFF9D2] rotate-[-0.5deg]">
              <div className="font-stamp text-[11px] uppercase tracking-wider text-ink font-bold mb-2 pb-1 border-b border-ink/20">
                FIELD NOTE: WHAT IS ACTUALLY NEW
              </div>
              <ul className="list-disc list-inside space-y-1 font-hand text-base text-ink/90">
                {result.whats_new.length > 0
                  ? result.whats_new.map((item, i) => <li key={i}>{item}</li>)
                  : <li>No novel mechanics identified beyond existing public tooling.</li>}
              </ul>
            </div>

            <div className="border-2 border-ink p-4 bg-[#FFE45C] rotate-[0.5deg]">
              <div className="font-stamp text-[11px] uppercase tracking-wider text-ink font-bold mb-2 pb-1 border-b border-ink/20">
                FIELD NOTE: RECOMMENDED TWIST & GAPS
              </div>
              <div className="font-hand text-base text-ink/90 mb-2">
                {result.suggested_twist || "Explore unaddressed workflows or platform-specific integrations."}
              </div>
              {result.gaps && result.gaps.length > 0 && (
                <ul className="list-disc list-inside space-y-1 font-hand text-base text-ink/90">
                  {result.gaps.map((gap, i) => <li key={i}>{gap}</li>)}
                </ul>
              )}
            </div>
          </div>

          {/* Official Sign-off Stamp */}
          <div className="pt-6 border-t-2 border-ink flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-ink/60 gap-4">
            <div>
              Generated via <strong>Already Exists? Prior Art Engine</strong> &bull; Multi-engine retrieval from GitHub, npm, iTunes, and Tavily indices.
            </div>
            <div className="font-stamp text-xs text-ink uppercase tracking-wider text-right">
              OFFICIAL INVESTIGATIVE RECORD // DOCKET #{caseId}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
