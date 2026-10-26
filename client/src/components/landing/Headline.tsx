import React from "react";

interface HeadlineProps {
  isNightMode?: boolean;
}

export const Headline: React.FC<HeadlineProps> = ({ isNightMode = false }) => {
  return (
    <div className="text-center pt-8 pb-4 px-4 max-w-3xl mx-auto">
      <div className="inline-block text-xs font-mono uppercase tracking-widest px-3 py-1 bg-manila border border-ink text-ink shadow-[2px_2px_0px_#1B1A17] mb-6">
        CONFIDENTIAL INVESTIGATIVE SERVICE
      </div>

      <h1 className="font-serif italic text-4xl sm:text-5xl md:text-6xl text-ink leading-[1.08] tracking-tight relative inline-block">
        <span className={isNightMode ? "text-paper" : "text-ink"}>
          Has someone already built this?
        </span>

        {/* Hand-drawn style SVG underline */}
        <svg
          className="w-full h-4 mt-1 overflow-visible"
          viewBox="0 0 380 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 10C70 4 190 2 377 8C270 5 110 9 24 12"
            stroke={isNightMode ? "#FFE45C" : "#D6361F"}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </h1>

      <p
        className={`mt-4 text-sm sm:text-base font-mono max-w-xl mx-auto ${
          isNightMode ? "text-paper/80" : "text-ink/80"
        }`}
      >
        Submit a project hypothesis. We query live registries, codebases, and indexes
        to cross-examine real existing competitors—without hype or flattery.
      </p>
    </div>
  );
};
