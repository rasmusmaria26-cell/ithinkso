import React, { useState } from "react";
import { playBellDing } from "../../lib/sound.ts";

interface ShareBarProps {
  caseId: string;
  onNewSearch: () => void;
  onToast: (msg: string) => void;
  onOpenDossier?: () => void;
  isSoundEnabled?: boolean;
}

export const ShareBar: React.FC<ShareBarProps> = ({
  caseId,
  onNewSearch,
  onToast,
  onOpenDossier,
  isSoundEnabled = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/r/${caseId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      playBellDing(isSoundEnabled);
      onToast("Case filed. Expires in 90 days.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      playBellDing(isSoundEnabled);
      onToast(`Link: ${url}`);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto my-8 px-4">
      <div className="bg-paper border-2 border-ink p-4 flex flex-wrap items-center justify-between gap-4 shadow-[4px_4px_0px_#1B1A17]">
        <div>
          <div className="font-stamp text-xs uppercase tracking-widest text-ink">
            CASE DOSSIER ARCHIVAL
          </div>
          <div className="font-mono text-xs text-ink/70">
            Docket ID: <span className="font-bold text-ink">{caseId}</span> (Expires in 90 days)
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {onOpenDossier && (
            <button
              onClick={onOpenDossier}
              className="px-3.5 py-2 border-2 border-ink bg-[#FFF9D2] text-ink font-mono text-xs uppercase tracking-wider shadow-[2px_2px_0px_#1B1A17] hover:bg-[#FFE45C] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5"
              title="Open printable classified dossier PDF"
            >
              <span>📄 Dossier (PDF)</span>
            </button>
          )}

          <button
            onClick={onNewSearch}
            className="px-3 py-2 border border-ink bg-paper text-ink font-mono text-xs uppercase tracking-wider hover:bg-paper-muted cursor-pointer transition-colors"
          >
            New Docket
          </button>

          <button
            onClick={handleCopy}
            className="px-4 py-2 border-2 border-ink bg-ink text-paper font-mono text-xs uppercase tracking-wider shadow-[2px_2px_0px_#1B1A17] hover:bg-paper hover:text-ink cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            {copied ? "Link Copied ✓" : "File This Case 🔔"}
          </button>
        </div>
      </div>
    </div>
  );
};
