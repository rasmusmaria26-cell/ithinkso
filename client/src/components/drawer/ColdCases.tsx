import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ColdCase } from "../../types/case.ts";
import { Tape } from "../common/Tape.tsx";

interface ColdCasesProps {
  isOpen: boolean;
  onClose: () => void;
  cases: ColdCase[];
  onSelectCase: (caseId: string) => void;
  onDeleteCase: (caseId: string) => void;
}

export const ColdCases: React.FC<ColdCasesProps> = ({
  isOpen,
  onClose,
  cases,
  onSelectCase,
  onDeleteCase,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-xs"
          />

          {/* Drawer container */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-paper border-l-2 border-ink shadow-2xl z-50 flex flex-col text-ink"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b-2 border-ink bg-manila flex items-center justify-between relative">
              <div className="absolute -top-2 left-10">
                <Tape width="50px" />
              </div>

              <div>
                <div className="font-stamp text-xs uppercase tracking-widest text-ink">
                  ARCHIVES DIVISION
                </div>
                <h3 className="font-serif italic text-2xl text-ink">
                  Cold Cases Docket
                </h3>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 border border-ink bg-paper text-ink font-mono font-bold hover:bg-ink hover:text-paper transition-colors flex items-center justify-center cursor-pointer"
                aria-label="Close drawer"
              >
                ✕
              </button>
            </div>

            {/* List of past cases */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cases.length === 0 ? (
                <div className="text-center py-12 text-ink/60 font-mono text-xs">
                  <p>No cold cases on record.</p>
                  <p className="mt-1">Completed investigations will appear here.</p>
                </div>
              ) : (
                cases.map((c) => (
                  <div
                    key={c.case_id}
                    className="p-4 bg-paper-muted border border-ink shadow-[2px_2px_0px_#1B1A17] relative group hover:border-stamp-red transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-ink/70 mb-1">
                      <span className="font-stamp text-ink font-bold">
                        {c.case_number}
                      </span>
                      <span>{c.date}</span>
                    </div>

                    <p
                      onClick={() => {
                        onSelectCase(c.case_id);
                        onClose();
                      }}
                      className="font-mono text-xs text-ink line-clamp-2 cursor-pointer hover:underline mb-3"
                    >
                      "{c.idea}"
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-ink/20 text-xs font-mono">
                      <span className="uppercase text-[11px] px-1.5 py-0.5 bg-paper border border-ink font-bold">
                        {c.verdict.replace("_", " ")}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-ink/80">
                          novelty {c.novelty_score}/100
                        </span>
                        <button
                          onClick={() => onDeleteCase(c.case_id)}
                          className="text-ink/40 hover:text-stamp-red font-mono text-xs cursor-pointer"
                          title="Purge record"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-ink/20 text-center font-mono text-[11px] text-ink/60">
              Stored locally on this terminal.
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
