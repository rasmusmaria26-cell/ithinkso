import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Competitor, Feature } from "../../types/case.ts";
import { SourceBadge } from "../common/SourceBadge.tsx";
import { Paperclip } from "../common/Paperclip.tsx";
import { Tape } from "../common/Tape.tsx";
import { playPaperRustle } from "../../lib/sound.ts";

interface ExhibitModalProps {
  competitor: Competitor | null;
  features: Feature[];
  onClose: () => void;
  isSoundEnabled?: boolean;
}

export const ExhibitModal: React.FC<ExhibitModalProps> = ({
  competitor,
  features,
  onClose,
  isSoundEnabled = false,
}) => {
  useEffect(() => {
    if (competitor) {
      playPaperRustle(isSoundEnabled);
    }
  }, [competitor, isSoundEnabled]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (competitor) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [competitor, onClose]);

  if (!competitor) return null;

  // Set of matched feature numbers for this competitor
  const matchedNumbers = new Set(competitor.features_matched.map((f) => f.n));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Dark blur backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* The Manila Case Docket Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative z-10 w-full max-w-2xl bg-paper border-2 border-ink shadow-[8px_8px_0px_#1B1A17] p-6 sm:p-8 text-ink my-8"
        >
          {/* Top Paperclip & Tape */}
          <div className="absolute -top-4 right-8 pointer-events-none">
            <Paperclip size={48} rotation={12} />
          </div>
          <div className="absolute -top-2.5 left-8">
            <Tape width="75px" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-ink pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-stamp text-xs uppercase tracking-widest text-stamp-red font-bold">
                  EXHIBIT DOSSIER // #{competitor.lead_id}
                </span>
                <SourceBadge
                  source={competitor.source}
                  label={competitor.source_label}
                />
              </div>
              <h3 className="font-mono font-bold text-xl sm:text-2xl text-ink break-words">
                {competitor.name}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 border border-ink bg-paper text-ink font-mono font-bold hover:bg-ink hover:text-paper transition-colors flex items-center justify-center cursor-pointer ml-3 shrink-0"
              aria-label="Close dossier"
            >
              ✕
            </button>
          </div>

          {/* Overlap & Grounded Judgment */}
          <div className="bg-manila border border-ink p-4 mb-6 relative">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-stamp text-xs uppercase tracking-wider text-ink/70">
                OVERLAP ASSESSMENT
              </span>
              <span className="font-mono text-sm font-bold px-2 py-0.5 bg-[#FFE45C] border border-ink">
                {competitor.overlap_percent}% FEATURE OVERLAP
              </span>
            </div>
            <p className="font-serif italic text-base sm:text-lg text-ink m-0 leading-snug">
              "{competitor.why_similar}"
            </p>
          </div>

          {/* Side-by-Side Feature Matrix */}
          <div className="mb-6">
            <div className="font-stamp text-xs uppercase tracking-widest text-ink/70 mb-2">
              FEATURE-LEVEL CROSS EXAMINATION
            </div>
            <div className="border border-ink bg-paper-muted divide-y divide-ink/20 font-mono text-xs">
              {features.map((feat) => {
                const isMatched = matchedNumbers.has(feat.n);
                return (
                  <div
                    key={feat.n}
                    className={`p-2.5 flex items-start gap-3 ${
                      isMatched ? "bg-[#FFE45C]/25" : ""
                    }`}
                  >
                    <span
                      className={`w-5 h-5 flex items-center justify-center font-bold text-xs shrink-0 border ${
                        isMatched
                          ? "bg-stamp-red text-paper border-stamp-red"
                          : "border-ink/30 text-ink/40"
                      }`}
                    >
                      {isMatched ? "✓" : "―"}
                    </span>
                    <div className="flex-1">
                      <span className="text-ink/60 mr-1.5">Feature #{feat.n}:</span>
                      <span className={isMatched ? "font-bold text-ink" : "text-ink/70"}>
                        {feat.text}
                      </span>
                    </div>
                    {isMatched && (
                      <span className="text-[10px] uppercase font-bold text-stamp-red tracking-wider">
                        Matched
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Raw Verified Snippet / Readme text */}
          <div className="mb-6">
            <div className="font-stamp text-xs uppercase tracking-widest text-ink/70 mb-2">
              SUBPOENAED EVIDENCE SNIPPET
            </div>
            <div className="bg-paper-muted border border-ink p-3 font-mono text-xs text-ink/80 leading-relaxed max-h-36 overflow-y-auto">
              {competitor.snippet || "No additional text excerpt on record."}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-ink/20 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
            <span className="text-ink/60">
              Verified URL scheme: {competitor.url.split("://")[0]}://
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-ink bg-paper text-ink hover:bg-paper-muted cursor-pointer"
              >
                Close File
              </button>
              <a
                href={competitor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border-2 border-ink bg-ink text-paper font-bold hover:bg-paper hover:text-ink cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#1B1A17]"
              >
                <span>Inspect Source</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
