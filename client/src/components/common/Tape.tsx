import React from "react";

interface TapeProps {
  className?: string;
  width?: number | string;
}

/**
 * Translucent masking tape strip with torn edges.
 * Used on evidence cards, case folders, and notes.
 */
export const Tape: React.FC<TapeProps> = ({ className = "", width = "64px" }) => {
  return (
    <div
      style={{ width }}
      className={`h-4 bg-[#F2D56B]/80 border-t border-b border-[#E0C055]/50 shadow-xs relative z-10 pointer-events-none ${className}`}
    >
      {/* Subtle paper tape fiber lines */}
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_2px,#1B1A17_2px)] bg-[length:6px_100%]" />
    </div>
  );
};
