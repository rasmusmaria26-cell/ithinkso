import React from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "../../hooks/useReducedMotion.ts";

interface NoveltyBarProps {
  score: number;
  oneLineReason: string;
  leadsConsidered: number;
  relevantLeads: number;
}

export const NoveltyBar: React.FC<NoveltyBarProps> = ({
  score,
  oneLineReason,
  leadsConsidered,
  relevantLeads,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="w-full max-w-2xl mx-auto my-6 px-4">
      <div className="bg-paper border-2 border-ink shadow-[4px_4px_0px_#1B1A17] p-6 text-ink">
        {/* Header line: Title & Score read-out */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <span className="font-stamp text-xs uppercase tracking-widest text-ink/70">
            NOVELTY APPRAISAL INDEX
          </span>
          <div className="font-mono text-sm sm:text-base font-bold">
            novelty <span className="text-xl sm:text-2xl text-ink">{score}</span>
            <span className="text-ink/60">/100</span>
          </div>
        </div>

        {/* The ink-bordered highlighter bar */}
        <div className="w-full h-6 border-2 border-ink bg-paper-muted relative overflow-hidden my-3">
          {/* Animated yellow highlighter fill */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={
              shouldReduceMotion
                ? { duration: 0.1 }
                : { duration: 0.85, ease: "easeOut", delay: 0.2 }
            }
            className="h-full bg-highlighter border-r-2 border-ink relative"
          >
            {/* Highlighter marker grain pattern */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#1B1A17_1px,transparent_1px)] [background-size:4px_4px]" />
          </motion.div>
        </div>

        {/* One-line reason */}
        <p className="font-serif italic text-lg sm:text-xl text-ink leading-snug my-3">
          "{oneLineReason}"
        </p>

        {/* Audit stats */}
        <div className="pt-3 border-t border-ink/20 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-ink/70">
          <span>
            {leadsConsidered} leads reviewed, {relevantLeads} identified as relevant.
          </span>
          <span className="uppercase text-[11px] tracking-wider text-ink/50">
            DOCKET STATISTIC
          </span>
        </div>
      </div>
    </div>
  );
};
