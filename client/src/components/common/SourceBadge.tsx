import React from "react";
import type { Source } from "../../types/case.ts";
import { sourceBadgeInfo } from "../../lib/format.ts";

interface SourceBadgeProps {
  source: Source;
  label?: string;
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  source,
  label,
  className = "",
}) => {
  const info = sourceBadgeInfo(source);
  const displayLabel = label || info.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono border border-ink text-ink bg-paper-muted uppercase tracking-wider ${className}`}
    >
      <span className="w-1.5 h-1.5 bg-ink inline-block" />
      {displayLabel}
    </span>
  );
};
