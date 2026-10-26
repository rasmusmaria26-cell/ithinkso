import { useState, useRef, useCallback } from "react";
import type {
  CaseResult,
  ServerEvent,
  SourceStatus,
} from "../types/case.ts";
import { playTypewriterClick } from "../lib/sound.ts";

export interface InvestigateState {
  isStreaming: boolean;
  steps: string[];
  currentStep: string;
  sourceStatuses: SourceStatus[];
  clarifyQuestion: string | null;
  error: { code: string; message: string } | null;
  caseId: string | null;
  result: CaseResult | null;
}

export function useInvestigateStream(soundEnabled: boolean = false) {
  const [state, setState] = useState<InvestigateState>({
    isStreaming: false,
    steps: [],
    currentStep: "",
    sourceStatuses: [],
    clarifyQuestion: null,
    error: null,
    caseId: null,
    result: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const investigate = useCallback(
    async (idea: string, clarification?: string) => {
      // Abort any prior in-flight stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState({
        isStreaming: true,
        steps: [],
        currentStep: "Docket opened. Reviewing submission...",
        sourceStatuses: [],
        clarifyQuestion: null,
        error: null,
        caseId: null,
        result: null,
      });

      try {
        const response = await fetch("/api/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ idea, clarification }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorMsg = "Servers took the day off.";
          try {
            const errJson = await response.json();
            if (errJson.message) errorMsg = errJson.message;
          } catch {
            // fallback
          }
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: { code: "http_error", message: errorMsg },
          }));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("ReadableStream not supported by browser.");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let finalCaseId: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          // Keep whatever incomplete frame remains at the end
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const trimmed = frame.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const jsonStr = trimmed.slice(5).trim();
            try {
              const event = JSON.parse(jsonStr) as ServerEvent;

              switch (event.type) {
                case "case_id":
                  finalCaseId = event.case_id;
                  setState((prev) => ({ ...prev, caseId: event.case_id }));
                  break;

                case "step":
                  playTypewriterClick(soundEnabled);
                  setState((prev) => ({
                    ...prev,
                    currentStep: event.text,
                    steps: [...prev.steps, event.text],
                  }));
                  break;

                case "source_status":
                  setState((prev) => ({
                    ...prev,
                    sourceStatuses: [
                      ...prev.sourceStatuses.filter(
                        (s) => s.source !== event.status.source
                      ),
                      event.status,
                    ],
                  }));
                  break;

                case "clarify":
                  setState((prev) => ({
                    ...prev,
                    isStreaming: false,
                    clarifyQuestion: event.question,
                  }));
                  return;

                case "error":
                  setState((prev) => ({
                    ...prev,
                    isStreaming: false,
                    error: { code: event.code, message: event.message },
                  }));
                  return;

                case "complete":
                  finalCaseId = event.case_id;
                  break;
              }
            } catch {
              // Frame parse warning ignored
            }
          }
        }

        // Stream completed successfully, fetch final persisted case record
        if (finalCaseId) {
          let fetchedResult: CaseResult | null = null;
          // Retry up to 3 times with brief delays if MongoDB write has a micro-lag
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const caseRes = await fetch(`/api/case/${finalCaseId}`);
              if (caseRes.ok) {
                const caseJson = await caseRes.json();
                if (caseJson.result) {
                  fetchedResult = caseJson.result;
                  break;
                }
              }
            } catch {
              // retry
            }
            await new Promise((res) => setTimeout(res, 350));
          }

          if (fetchedResult) {
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              caseId: finalCaseId,
              result: fetchedResult,
            }));
          } else {
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              error: {
                code: "not_found",
                message: "Case docket could not be retrieved from records.",
              },
            }));
          }
        } else {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: {
              code: "no_case_id",
              message: "Case ended without a file number.",
            },
          }));
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // Manually cancelled
          return;
        }
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: {
            code: "internal",
            message: "Case closed. Servers took the day off.",
          },
        }));
      }
    },
    [soundEnabled]
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      isStreaming: false,
      steps: [],
      currentStep: "",
      sourceStatuses: [],
      clarifyQuestion: null,
      error: null,
      caseId: null,
      result: null,
    });
  }, []);

  return {
    ...state,
    investigate,
    reset,
  };
}
