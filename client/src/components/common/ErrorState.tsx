import React from "react";
import { Tape } from "./Tape.tsx";

interface ErrorStateProps {
  code?: string;
  message: string;
  onReset: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onReset }) => {
  return (
    <div className="w-full max-w-xl mx-auto my-12 p-8 bg-paper border border-ink shadow-[4px_4px_0px_#1B1A17] relative text-center">
      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
        <Tape width="80px" />
      </div>

      <div className="text-xs uppercase font-stamp tracking-widest text-stamp-red mb-2">
        INVESTIGATION TERMINATED
      </div>

      <h3 className="font-serif italic text-2xl text-ink mb-4">
        {message}
      </h3>

      <div className="h-px bg-ink/20 my-6" />

      <button
        onClick={onReset}
        className="px-6 py-2.5 bg-ink text-paper font-mono text-sm tracking-wider uppercase border border-ink hover:bg-paper hover:text-ink transition-colors cursor-pointer"
      >
        Open New Docket
      </button>
    </div>
  );
};
