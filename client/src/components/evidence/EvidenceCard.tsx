import React from "react";
import { motion } from "framer-motion";
import type { Competitor } from "../../types/case.ts";
import { Tape } from "../common/Tape.tsx";
import { Paperclip } from "../common/Paperclip.tsx";
import { SourceBadge } from "../common/SourceBadge.tsx";
import { useReducedMotion } from "../../hooks/useReducedMotion.ts";
import { playPaperRustle } from "../../lib/sound.ts";

interface EvidenceCardProps {
  competitor: Competitor;
  index: number;
  onInspect: (competitor: Competitor) => void;
  isSoundEnabled?: boolean;
}

// Pre-computed slight natural tilts for cards on the desk
const TILT_ANGLES = [-1.4, 0.8, -0.6, 1.2, -1.0, 0.5];

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  competitor,
  index,
  onInspect,
  isSoundEnabled = false,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const tiltAngle = TILT_ANGLES[index % TILT_ANGLES.length];
  const hasPaperclip = index % 3 === 0;

  return (
    <motion.div
      initial={
        shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 35, rotate: 0 }
      }
      animate={
        shouldReduceMotion
          ? { opacity: 1 }
          : { opacity: 1, y: 0, rotate: tiltAngle }
      }
      whileHover={
        shouldReduceMotion
          ? {}
          : {
              rotate: 0,
              y: -6,
              boxShadow: "6px 8px 0px #1B1A17",
              transition: { duration: 0.15, ease: "easeOut" },
            }
      }
      onMouseEnter={() => playPaperRustle(isSoundEnabled)}
      transition={{
        duration: 0.4,
        delay: shouldReduceMotion ? 0 : index * 0.09,
        ease: "easeOut",
      }}
      className="bg-paper border-2 border-ink p-5 pt-7 relative shadow-[3px_3px_0px_#1B1A17] flex flex-col justify-between text-ink h-full transition-shadow cursor-pointer group"
      onClick={() => onInspect(competitor)}
    >
      {/* Torn tape strip on top center */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
        <Tape width="60px" />
      </div>

      {/* Optional metallic paperclip in top right corner */}
      {hasPaperclip && (
        <div className="absolute -top-3 right-4 pointer-events-none">
          <Paperclip size={36} rotation={-8} />
        </div>
      )}

      <div>
        {/* Top bar: Source badge + Overlap % */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <SourceBadge
            source={competitor.source}
            label={competitor.source_label}
          />
          <div className="font-mono text-xs font-bold px-2 py-0.5 bg-[#FFE45C] border border-ink text-ink">
            {competitor.overlap_percent}% overlap
          </div>
        </div>

        {/* Competitor Name */}
        <h4 className="font-mono font-bold text-base text-ink mb-2 break-words group-hover:text-stamp-red transition-colors">
          {competitor.name}
        </h4>

        {/* Why similar (LLM-grounded reason) */}
        <div className="text-xs font-mono text-ink/90 italic mb-3 pl-2 border-l-2 border-stamp-red/70 leading-relaxed">
          "{competitor.why_similar}"
        </div>

        {/* Actual verified lead snippet */}
        <div className="bg-paper-muted border border-ink/20 p-2.5 text-xs font-mono text-ink/75 leading-relaxed mb-4">
          <span className="text-[10px] uppercase font-bold text-ink/50 block mb-1">
            EXHIBIT EXCERPT:
          </span>
          <span className="line-clamp-3">
            {competitor.snippet || "No additional text excerpt recorded in evidence."}
          </span>
        </div>
      </div>

      {/* Link out & Deep-dive indicator */}
      <div className="pt-3 border-t border-ink/20 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase text-ink/60 group-hover:underline">
          Click to inspect dossier ↗
        </span>
        <span className="text-[10px] font-mono uppercase text-ink/40">
          #{competitor.lead_id}
        </span>
      </div>
    </motion.div>
  );
};
