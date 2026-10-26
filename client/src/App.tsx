import { useState, useEffect, useCallback } from "react";
import { DeskSurface } from "./components/layout/DeskSurface.tsx";
import { DeskHeader } from "./components/layout/DeskHeader.tsx";
import { Headline } from "./components/landing/Headline.tsx";
import { ManilaInput } from "./components/landing/ManilaInput.tsx";
import { CaseLog } from "./components/investigate/CaseLog.tsx";
import { ClarifyNote } from "./components/investigate/ClarifyNote.tsx";
import { RubberStamp } from "./components/verdict/RubberStamp.tsx";
import { NoveltyBar } from "./components/verdict/NoveltyBar.tsx";
import { EvidenceDesk } from "./components/evidence/EvidenceDesk.tsx";
import { ExhibitModal } from "./components/evidence/ExhibitModal.tsx";
import { StickyNote } from "./components/notes/StickyNote.tsx";
import { ShareBar } from "./components/share/ShareBar.tsx";
import { ColdCases } from "./components/drawer/ColdCases.tsx";
import { ErrorState } from "./components/common/ErrorState.tsx";
import { Toast } from "./components/common/Toast.tsx";
import { useInvestigateStream } from "./hooks/useInvestigateStream.ts";
import { useColdCases } from "./hooks/useColdCases.ts";
import type { CaseResult, Competitor } from "./types/case.ts";

export default function App() {
  // Theme & sound preferences
  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("already_exists_night") === "true";
    } catch {
      return false;
    }
  });

  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("already_exists_sound") === "true";
    } catch {
      return false;
    }
  });

  const [isShaking, setIsShaking] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentIdea, setCurrentIdea] = useState<string>("");

  // Modal inspection of an evidence dossier
  const [inspectingCompetitor, setInspectingCompetitor] =
    useState<Competitor | null>(null);

  // Shared Case File mode (e.g. /r/:id)
  const [sharedCase, setSharedCase] = useState<{
    id: string;
    result: CaseResult;
  } | null>(null);
  const [isLoadingShared, setIsLoadingShared] = useState(false);

  const { coldCases, caseCounter, recordCase, removeCase } = useColdCases();
  const stream = useInvestigateStream(isSoundEnabled);

  // Persistence of theme toggles
  useEffect(() => {
    try {
      localStorage.setItem("already_exists_night", String(isNightMode));
    } catch {
      // ignore
    }
  }, [isNightMode]);

  useEffect(() => {
    try {
      localStorage.setItem("already_exists_sound", String(isSoundEnabled));
    } catch {
      // ignore
    }
  }, [isSoundEnabled]);

  // Check URL pathname for /r/:id shared dockets
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/r\/([A-Za-z0-9_-]+)/);
    if (match && match[1]) {
      const caseId = match[1];
      setIsLoadingShared(true);
      fetch(`/api/case/${caseId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Case docket not found.");
          return res.json();
        })
        .then((data) => {
          if (data.result) {
            setSharedCase({ id: caseId, result: data.result });
          } else {
            showToast("Docket not yet finalized.");
          }
        })
        .catch(() => {
          showToast("Unable to retrieve shared docket.");
        })
        .finally(() => {
          setIsLoadingShared(false);
        });
    }
  }, []);

  // When stream produces a final result, save to local cold cases
  useEffect(() => {
    if (stream.result && stream.caseId && currentIdea) {
      recordCase({
        case_id: stream.caseId,
        idea: currentIdea,
        verdict: stream.result.verdict,
        novelty_score: stream.result.novelty_score,
      });
    }
  }, [stream.result, stream.caseId, currentIdea]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 380);
  }, []);

  const handleStartInvestigation = (idea: string) => {
    setCurrentIdea(idea);
    setSharedCase(null);
    setInspectingCompetitor(null);
    stream.investigate(idea);
  };

  const handleClarifySubmit = (clarification: string) => {
    if (!currentIdea) return;
    setInspectingCompetitor(null);
    stream.investigate(currentIdea, clarification);
  };

  const handleReset = () => {
    stream.reset();
    setCurrentIdea("");
    setSharedCase(null);
    setInspectingCompetitor(null);
    if (window.location.pathname.startsWith("/r/")) {
      window.history.pushState({}, "", "/");
    }
  };

  const handleSelectColdCase = (caseId: string) => {
    setIsLoadingShared(true);
    fetch(`/api/case/${caseId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result) {
          setSharedCase({ id: caseId, result: data.result });
          setCurrentIdea(data.result.one_line_reason);
          setInspectingCompetitor(null);
          window.history.pushState({}, "", `/r/${caseId}`);
        }
      })
      .catch(() => {
        showToast("Case record unavailable.");
      })
      .finally(() => {
        setIsLoadingShared(false);
      });
  };

  // Determine active result (live stream result or shared docket result)
  const activeResult: CaseResult | null =
    sharedCase?.result || stream.result || null;
  const activeCaseId: string | null = sharedCase?.id || stream.caseId || null;

  return (
    <DeskSurface isNightMode={isNightMode} isShaking={isShaking}>
      {/* Top Desk Header */}
      <DeskHeader
        caseCounter={caseCounter}
        isNightMode={isNightMode}
        onToggleNightMode={() => setIsNightMode((prev) => !prev)}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={() => setIsSoundEnabled((prev) => !prev)}
        onOpenColdCases={() => setIsDrawerOpen(true)}
        coldCasesCount={coldCases.length}
        onNewSearch={handleReset}
      />

      <main className="flex-1 flex flex-col justify-between py-6">
        {/* Loading Shared Case State */}
        {isLoadingShared && (
          <div className="text-center py-24 font-mono text-sm text-ink/70">
            Fetching archived dossier from records...
          </div>
        )}

        {/* Error State */}
        {!isLoadingShared && stream.error && (
          <ErrorState
            code={stream.error.code}
            message={stream.error.message}
            onReset={handleReset}
          />
        )}

        {/* Clarify State (Idea ambiguous) */}
        {!isLoadingShared && !stream.error && stream.clarifyQuestion && (
          <ClarifyNote
            question={stream.clarifyQuestion}
            onAnswer={handleClarifySubmit}
            onCancel={handleReset}
            isLoading={stream.isStreaming}
          />
        )}

        {/* Active Streaming Logs */}
        {!isLoadingShared &&
          !stream.error &&
          !stream.clarifyQuestion &&
          stream.isStreaming && (
            <>
              <Headline isNightMode={isNightMode} />
              <ManilaInput
                onInvestigate={handleStartInvestigation}
                isLoading={true}
              />
              <CaseLog
                steps={stream.steps}
                currentStep={stream.currentStep}
                sourceStatuses={stream.sourceStatuses}
                isComplete={false}
              />
            </>
          )}

        {/* Initial Empty / Idle State */}
        {!isLoadingShared &&
          !stream.error &&
          !stream.clarifyQuestion &&
          !stream.isStreaming &&
          !activeResult && (
            <>
              <Headline isNightMode={isNightMode} />
              <ManilaInput
                onInvestigate={handleStartInvestigation}
                isLoading={false}
              />
            </>
          )}

        {/* Completed Verdict & Evidence Display */}
        {!isLoadingShared &&
          !stream.error &&
          !stream.clarifyQuestion &&
          activeResult && (
            <div className="w-full flex flex-col items-center">
              {/* Verdict Rubber Stamp with screen shake */}
              <div className="text-center pt-2">
                <RubberStamp
                  verdict={activeResult.verdict}
                  onSlam={triggerShake}
                  isSoundEnabled={isSoundEnabled}
                />
              </div>

              {/* Novelty Score Bar */}
              <NoveltyBar
                score={activeResult.novelty_score}
                oneLineReason={activeResult.one_line_reason}
                leadsConsidered={activeResult.leads_considered}
                relevantLeads={activeResult.relevant_leads}
              />

              {/* Sticky Notes: What's New & Suggested Twist */}
              <div className="w-full max-w-4xl mx-auto px-4 my-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <StickyNote
                  title="What's Actually New"
                  items={
                    activeResult.whats_new.length > 0
                      ? activeResult.whats_new
                      : ["No novel mechanics identified beyond existing tooling."]
                  }
                  tilt="left"
                  withPaperclip={true}
                />

                <StickyNote
                  title="Suggested Twist & Gaps"
                  paragraph={
                    activeResult.suggested_twist ||
                    "Pivot toward unaddressed developer workflows or niche platform integrations."
                  }
                  items={activeResult.gaps}
                  tilt="right"
                  bg="bg-[#FFF3A3]"
                  withPaperclip={true}
                />
              </div>

              {/* Evidence Desk Grid */}
              <EvidenceDesk
                competitors={activeResult.competitors}
                onInspectCompetitor={(comp) => setInspectingCompetitor(comp)}
                isSoundEnabled={isSoundEnabled}
              />

              {/* Archival & Sharing Bar */}
              {activeCaseId && (
                <ShareBar
                  caseId={activeCaseId}
                  onNewSearch={handleReset}
                  onToast={showToast}
                  isSoundEnabled={isSoundEnabled}
                />
              )}
            </div>
          )}
      </main>

      {/* Deep-Dive Exhibit Modal */}
      {activeResult && (
        <ExhibitModal
          competitor={inspectingCompetitor}
          features={activeResult.features}
          onClose={() => setInspectingCompetitor(null)}
          isSoundEnabled={isSoundEnabled}
        />
      )}

      {/* Footer Disclaimer */}
      <footer className="w-full border-t border-ink/20 py-4 px-6 text-center font-mono text-xs text-ink/60 select-none">
        <span>Already Exists? &copy; 2026 // Real prior art analysis via GitHub, npm, App Store & Web indexes.</span>
      </footer>

      {/* Cold Cases Archives Drawer */}
      <ColdCases
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        cases={coldCases}
        onSelectCase={handleSelectColdCase}
        onDeleteCase={removeCase}
      />

      {/* Notification Toast */}
      <Toast message={toastMessage} />
    </DeskSurface>
  );
}
