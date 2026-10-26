import React from "react";
import { formatCaseNumber } from "../../lib/format.ts";

interface DeskHeaderProps {
  caseCounter: number;
  isNightMode: boolean;
  onToggleNightMode: () => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  onOpenColdCases: () => void;
  coldCasesCount: number;
  onNewSearch?: () => void;
}

export const DeskHeader: React.FC<DeskHeaderProps> = ({
  caseCounter,
  isNightMode,
  onToggleNightMode,
  isSoundEnabled,
  onToggleSound,
  onOpenColdCases,
  coldCasesCount,
  onNewSearch,
}) => {
  return (
    <header className="w-full border-b border-ink/30 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4 select-none relative z-20">
      {/* Left: Case Docket Identifier */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNewSearch}
          className="text-left font-stamp text-xs sm:text-sm tracking-wider uppercase px-2.5 py-1 border border-ink bg-paper text-ink shadow-[2px_2px_0px_#1B1A17] hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
        >
          {formatCaseNumber(caseCounter)}
        </button>
        <span
          className={`text-xs font-mono uppercase tracking-widest hidden md:inline ${
            isNightMode ? "text-paper/60" : "text-ink/60"
          }`}
        >
          // DIVISION OF PRIOR ART & REDUNDANCY
        </span>
      </div>

      {/* Right: Controls (Cold Cases Drawer, Lamp, Sound) */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
        {/* Cold Cases drawer button */}
        <button
          onClick={onOpenColdCases}
          className="px-3 py-1.5 border border-ink bg-paper text-ink shadow-[2px_2px_0px_#1B1A17] hover:bg-paper-muted transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Open past archived investigations"
        >
          <span className="w-1.5 h-1.5 bg-stamp-red inline-block" />
          <span>Cold Cases ({coldCasesCount})</span>
        </button>

        {/* Desk Lamp Night mode toggle */}
        <button
          onClick={onToggleNightMode}
          className="px-3 py-1.5 border border-ink bg-paper text-ink shadow-[2px_2px_0px_#1B1A17] hover:bg-paper-muted transition-colors cursor-pointer"
          title="Toggle desk lamp night lighting"
        >
          {isNightMode ? "💡 Lamp On" : "🌙 Desk Lamp"}
        </button>

        {/* Audio FX toggle */}
        <button
          onClick={onToggleSound}
          className={`px-3 py-1.5 border border-ink text-ink shadow-[2px_2px_0px_#1B1A17] transition-colors cursor-pointer ${
            isSoundEnabled ? "bg-highlighter" : "bg-paper hover:bg-paper-muted"
          }`}
          title="Toggle typewriter & stamp sound effects"
        >
          {isSoundEnabled ? "🔊 SFX: On" : "🔇 SFX: Off"}
        </button>
      </div>
    </header>
  );
};
