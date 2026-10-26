import React from "react";
import type { SourceStatus } from "../../types/case.ts";
import { Tape } from "../common/Tape.tsx";

interface CaseLogProps {
  steps: string[];
  currentStep: string;
  sourceStatuses: SourceStatus[];
  isComplete: boolean;
}

export const CaseLog: React.FC<CaseLogProps> = ({
  steps,
  currentStep,
  sourceStatuses,
  isComplete,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 my-8">
      <div className="bg-paper border-2 border-ink shadow-[4px_4px_0px_#1B1A17] p-6 relative">
        <div className="absolute -top-2 left-8">
          <Tape width="60px" />
        </div>

        {/* Docket Header */}
        <div className="flex items-center justify-between border-b border-ink/20 pb-3 mb-4">
          <div className="font-stamp text-xs uppercase tracking-wider text-ink flex items-center gap-2">
            <span className="w-2 h-2 bg-stamp-red animate-pulse inline-block" />
            <span>FIELD LOG // TELETYPE TRANSCRIPTION</span>
          </div>
          <div className="text-[11px] font-mono text-ink/60 uppercase">
            {isComplete ? "STATUS: CONCLUDED" : "STATUS: ACTIVE TRANSMISSION"}
          </div>
        </div>

        {/* Accessible screen reader announcement region */}
        <div className="sr-only" aria-live="polite">
          {currentStep}
        </div>

        {/* Visual typewriter log lines */}
        <div className="font-mono text-xs sm:text-sm text-ink space-y-2 max-h-64 overflow-y-auto pr-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-ink/40 select-none">›</span>
              <span className="text-ink/90 leading-relaxed">{step}</span>
            </div>
          ))}

          {/* Current step being investigated with typewriter cursor */}
          {!isComplete && currentStep && (
            <div className="flex items-start gap-2 font-bold text-ink">
              <span className="text-stamp-red select-none">›</span>
              <span className="leading-relaxed">
                {currentStep}
                <span className="typewriter-cursor ml-1" />
              </span>
            </div>
          )}
        </div>

        {/* Real-time per-source status badges */}
        {sourceStatuses.length > 0 && (
          <div className="mt-6 pt-4 border-t border-ink/20 flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-ink/60 uppercase text-[11px]">Subpoenaed:</span>
            {sourceStatuses.map((st) => (
              <span
                key={st.source}
                className={`px-2 py-0.5 border text-xs flex items-center gap-1.5 ${
                  st.ok
                    ? "border-ink bg-paper-muted text-ink"
                    : "border-stamp-red bg-stamp-red/10 text-stamp-red"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 inline-block ${
                    st.ok ? "bg-ink" : "bg-stamp-red"
                  }`}
                />
                <span className="uppercase">{st.source}:</span>
                <span>{st.ok ? `${st.count} leads` : "timeout"}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
