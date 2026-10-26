import { useState, useEffect } from "react";
import type { ColdCase, Verdict } from "../types/case.ts";

const COLD_CASES_KEY = "already_exists_cold_cases";
const CASE_COUNTER_KEY = "already_exists_case_counter";

export function useColdCases() {
  const [coldCases, setColdCases] = useState<ColdCase[]>(() => {
    try {
      const stored = localStorage.getItem(COLD_CASES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [caseCounter, setCaseCounter] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(CASE_COUNTER_KEY);
      return stored ? parseInt(stored, 10) : 42;
    } catch {
      return 42;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLD_CASES_KEY, JSON.stringify(coldCases));
    } catch {
      // Ignore quota errors
    }
  }, [coldCases]);

  useEffect(() => {
    try {
      localStorage.setItem(CASE_COUNTER_KEY, String(caseCounter));
    } catch {
      // Ignore
    }
  }, [caseCounter]);

  const recordCase = (entry: {
    case_id: string;
    idea: string;
    verdict: Verdict;
    novelty_score: number;
  }) => {
    const currentNumber = caseCounter;
    const newCase: ColdCase = {
      case_id: entry.case_id,
      case_number: `CASE NO. ${String(currentNumber).padStart(4, "0")}`,
      idea: entry.idea,
      verdict: entry.verdict,
      novelty_score: entry.novelty_score,
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    };

    setColdCases((prev) => {
      // Dedupe by case_id
      const filtered = prev.filter((c) => c.case_id !== entry.case_id);
      return [newCase, ...filtered].slice(0, 30);
    });

    setCaseCounter((prev) => prev + 1);
  };

  const removeCase = (case_id: string) => {
    setColdCases((prev) => prev.filter((c) => c.case_id !== case_id));
  };

  return {
    coldCases,
    caseCounter,
    recordCase,
    removeCase,
  };
}
