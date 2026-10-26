import React from "react";
import { Tape } from "../common/Tape.tsx";
import { Paperclip } from "../common/Paperclip.tsx";

interface StickyNoteProps {
  title: string;
  items?: string[];
  paragraph?: string;
  tilt?: "left" | "right";
  bg?: string;
  withPaperclip?: boolean;
}

export const StickyNote: React.FC<StickyNoteProps> = ({
  title,
  items,
  paragraph,
  tilt = "left",
  bg = "bg-[#FFE45C]",
  withPaperclip = true,
}) => {
  const rotateClass = tilt === "left" ? "rotate-[-1.5deg]" : "rotate-[1.2deg]";

  return (
    <div
      className={`${bg} border-2 border-ink p-6 pt-7 shadow-[4px_4px_0px_#1B1A17] relative text-ink transition-transform hover:rotate-0 duration-200 ${rotateClass}`}
    >
      {/* Torn tape at top center */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <Tape width="65px" />
      </div>

      {/* Realistic metal paperclip pinning note corner */}
      {withPaperclip && (
        <div className="absolute -top-4 -right-1 pointer-events-none">
          <Paperclip size={42} rotation={14} />
        </div>
      )}

      <div className="font-stamp text-[11px] uppercase tracking-wider text-ink/70 mb-2">
        INVESTIGATOR NOTEBOOK
      </div>

      <h3 className="font-serif italic text-2xl text-ink leading-tight mb-4">
        {title}
      </h3>

      {/* Handwritten body text using Caveat */}
      <div className="font-hand text-xl sm:text-2xl text-ink leading-snug">
        {items && items.length > 0 && (
          <ul className="space-y-2 list-none p-0 m-0">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-stamp-red select-none font-bold">―</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {paragraph && <p className="m-0 leading-relaxed">{paragraph}</p>}
      </div>
    </div>
  );
};
