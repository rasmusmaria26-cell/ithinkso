import React, { useState } from "react";
import { Tape } from "../common/Tape.tsx";

interface ManilaInputProps {
  onInvestigate: (idea: string) => void;
  isLoading: boolean;
}

const SAMPLE_IDEAS = [
  "Local-first markdown note taker with SQLite sync and end-to-end encryption",
  "CLI tool that generates changelogs and release notes from git commits and PR issues",
  "Browser extension that calculates reading time and highlights key counter-arguments",
];

export const ManilaInput: React.FC<ManilaInputProps> = ({
  onInvestigate,
  isLoading,
}) => {
  const [idea, setIdea] = useState("");

  const trimmed = idea.trim();
  const isValidLength = trimmed.length >= 10 && trimmed.length <= 600;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidLength || isLoading) return;
    onInvestigate(trimmed);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 mt-6 mb-12">
      {/* Manila Folder Container */}
      <form
        onSubmit={handleSubmit}
        className="bg-manila border-2 border-ink shadow-[5px_5px_0px_#1B1A17] relative pt-6 pb-6 px-6 sm:px-8 text-ink"
      >
        {/* Top Manila Tab */}
        <div className="absolute -top-7 left-6 bg-manila border-t-2 border-l-2 border-r-2 border-ink px-4 py-1 text-xs font-stamp uppercase tracking-widest text-ink select-none flex items-center gap-2">
          <span className="w-2 h-2 bg-stamp-red inline-block" />
          <span>DOSSIER // EVIDENCE SUBMISSION</span>
        </div>

        {/* Small tape strip on top right */}
        <div className="absolute -top-2 right-8">
          <Tape width="50px" />
        </div>

        <label
          htmlFor="idea-input"
          className="block font-mono text-xs uppercase tracking-wider text-ink/70 mb-2"
        >
          Project Hypothesis / Product Angle:
        </label>

        {/* Typing surface */}
        <div className="relative bg-paper border border-ink p-4 min-h-[140px] shadow-inner">
          <textarea
            id="idea-input"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            disabled={isLoading}
            placeholder="Type your project concept here. State the core mechanism, intended platform, and problem solved..."
            rows={4}
            maxLength={600}
            className="w-full bg-transparent border-none outline-none font-mono text-sm sm:text-base text-ink placeholder:text-ink/40 resize-none leading-relaxed"
          />

          {/* Typewriter blinking cursor when empty */}
          {idea.length === 0 && (
            <div className="absolute top-4 left-4 pointer-events-none">
              <span className="opacity-0">T</span>
              <span className="typewriter-cursor" />
            </div>
          )}
        </div>

        {/* Character count & Submit */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="text-ink/70 flex items-center gap-2">
            <span>{trimmed.length}/600 chars</span>
            {trimmed.length > 0 && trimmed.length < 10 && (
              <span className="text-stamp-red">(Minimum 10 characters required)</span>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValidLength || isLoading}
            className={`px-6 py-2.5 font-mono text-sm tracking-wider uppercase border-2 border-ink shadow-[3px_3px_0px_#1B1A17] transition-all flex items-center gap-2 cursor-pointer ${
              isValidLength && !isLoading
                ? "bg-ink text-paper hover:bg-paper hover:text-ink active:translate-x-0.5 active:translate-y-0.5"
                : "bg-ink/30 text-ink/50 border-ink/40 cursor-not-allowed shadow-none"
            }`}
          >
            <span>{isLoading ? "Executing Warrants..." : "Investigate"}</span>
            {!isLoading && <span className="text-xs">⏎</span>}
          </button>
        </div>

        {/* Sample prompt chips */}
        <div className="mt-6 pt-4 border-t border-ink/20">
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink/60 mb-2">
            Or test a sample hypothesis:
          </div>
          <div className="flex flex-col gap-1.5">
            {SAMPLE_IDEAS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setIdea(sample)}
                className="text-left font-mono text-xs text-ink/80 hover:text-ink hover:underline truncate cursor-pointer transition-colors"
              >
                › "{sample}"
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};
