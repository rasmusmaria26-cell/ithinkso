import React, { useEffect } from "react";
import { motion } from "framer-motion";
import type { Verdict } from "../../types/case.ts";
import { useReducedMotion } from "../../hooks/useReducedMotion.ts";
import { playStampThump } from "../../lib/sound.ts";

interface RubberStampProps {
  verdict: Verdict;
  onSlam?: () => void;
  isSoundEnabled?: boolean;
}

const STAMP_CONFIG: Record<
  Verdict,
  { text: string; subtext: string; color: string; border: string; bg: string }
> = {
  already_exists: {
    text: "ALREADY EXISTS",
    subtext: "IDENTICAL PRIOR ART DISCOVERED",
    color: "#D6361F",
    border: "#B52B17",
    bg: "rgba(243, 237, 224, 0.96)",
  },
  partly_exists: {
    text: "PARTLY EXISTS",
    subtext: "SUBSTANTIAL OVERLAPPING MECHANISMS",
    color: "#C2410C",
    border: "#9A3412",
    bg: "rgba(243, 237, 224, 0.96)",
  },
  pretty_fresh: {
    text: "PRETTY FRESH",
    subtext: "MINIMAL DIRECT COMPETITIVE DENSITY",
    color: "#15803D",
    border: "#166534",
    bg: "rgba(243, 237, 224, 0.96)",
  },
  inconclusive: {
    text: "INCONCLUSIVE",
    subtext: "INSUFFICIENT RETRIEVAL CONFIDENCE",
    color: "#5A5850",
    border: "#3F3E3A",
    bg: "rgba(243, 237, 224, 0.96)",
  },
};

export const RubberStamp: React.FC<RubberStampProps> = ({
  verdict,
  onSlam,
  isSoundEnabled = false,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const config = STAMP_CONFIG[verdict] || STAMP_CONFIG.inconclusive;

  const todayDateStr = new Date()
    .toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();

  useEffect(() => {
    // Trigger audio and screen shake upon slam
    if (!shouldReduceMotion) {
      const timer = setTimeout(() => {
        playStampThump(isSoundEnabled);
        if (onSlam) onSlam();
      }, 140);
      return () => clearTimeout(timer);
    } else {
      if (isSoundEnabled) playStampThump(isSoundEnabled);
    }
  }, [shouldReduceMotion, isSoundEnabled, onSlam]);

  return (
    <div className="relative inline-block select-none my-6">
      {/* Ink bleed radial halo flash behind the stamp */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 0.5, 0], scale: [0.8, 1.45, 1.7] }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="absolute inset-0 rounded-full blur-xl pointer-events-none"
        style={{ backgroundColor: config.color }}
      />

      {/* The Distressed Rubber Stamp */}
      <motion.div
        initial={
          shouldReduceMotion
            ? { opacity: 0, rotate: -6 }
            : { scale: 2.8, opacity: 0, rotate: -18 }
        }
        animate={
          shouldReduceMotion
            ? { opacity: 1, rotate: -6 }
            : { scale: 1.0, opacity: 1, rotate: -6 }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0.25 }
            : {
                type: "spring",
                stiffness: 440,
                damping: 20,
                mass: 1.15,
              }
        }
        className="relative z-10 px-7 py-3.5 border-4 border-dashed rounded-xs shadow-[3px_4px_0px_rgba(27,26,23,0.3)]"
        style={{
          borderColor: config.border,
          color: config.color,
          backgroundColor: config.bg,
        }}
      >
        {/* Top date stamp line */}
        <div className="flex items-center justify-between text-[10px] font-mono tracking-widest uppercase opacity-85 border-b border-current pb-1 mb-1">
          <span>DIVISION OF INQUIRY</span>
          <span>{todayDateStr}</span>
        </div>

        {/* Main stamp verdict */}
        <div className="font-stamp text-2xl sm:text-3xl md:text-4xl uppercase tracking-widest font-black text-center whitespace-nowrap leading-none py-1">
          {config.text}
        </div>

        {/* Subtext description */}
        <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-center mt-1 opacity-90 border-t border-current pt-1">
          {config.subtext}
        </div>

        {/* Distressed weathered ink specks overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25 mix-blend-multiply"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "6px 6px",
          }}
        />
      </motion.div>
    </div>
  );
};
