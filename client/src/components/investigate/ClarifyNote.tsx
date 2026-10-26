import React, { useState } from "react";
import { Tape } from "../common/Tape.tsx";

interface ClarifyNoteProps {
  question: string;
  onAnswer: (clarification: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const ClarifyNote: React.FC<ClarifyNoteProps> = ({
  question,
  onAnswer,
  onCancel,
  isLoading,
}) => {
  const [answer, setAnswer] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || isLoading) return;
    onAnswer(answer.trim());
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 my-8">
      {/* Yellow Sticky Note tilted */}
      <div className="bg-[#FFE45C] border-2 border-ink shadow-[5px_5px_0px_#1B1A17] p-6 pt-8 relative rotate-[-1deg] text-ink">
        {/* Tape at top center */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Tape width="70px" />
        </div>

        <div className="font-stamp text-xs uppercase tracking-widest text-ink/70 mb-2">
          INVESTIGATIVE INQUIRY
        </div>

        <h3 className="font-serif italic text-2xl text-ink leading-snug mb-3">
          "Need more details, detective."
        </h3>

        <div className="bg-[#FFF1A8] border border-ink/40 p-3 mb-4 font-mono text-xs sm:text-sm text-ink leading-relaxed">
          {question}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label
            htmlFor="clarify-input"
            className="block font-mono text-xs text-ink/80"
          >
            Clarify the primary platform, technical mechanic, or specific audience:
          </label>
          <textarea
            id="clarify-input"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. It's a CLI tool in Rust designed for local developers who want offline git sync..."
            rows={3}
            maxLength={300}
            className="w-full bg-paper border border-ink p-2.5 font-mono text-xs sm:text-sm text-ink outline-none resize-none"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-mono text-ink/60">
              {answer.length}/300 chars
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 font-mono text-xs border border-ink/40 bg-transparent hover:bg-black/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!answer.trim() || isLoading}
                className={`px-4 py-1.5 font-mono text-xs uppercase tracking-wider border border-ink shadow-[2px_2px_0px_#1B1A17] transition-all cursor-pointer ${
                  answer.trim() && !isLoading
                    ? "bg-ink text-paper hover:bg-paper hover:text-ink"
                    : "bg-ink/30 text-ink/50 cursor-not-allowed shadow-none"
                }`}
              >
                {isLoading ? "Re-examining..." : "Re-investigate"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
