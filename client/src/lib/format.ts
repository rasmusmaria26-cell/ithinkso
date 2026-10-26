export function formatCaseNumber(num: number): string {
  return `CASE FILE NO. ${String(num).padStart(4, "0")}`;
}

export function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

export function sourceBadgeInfo(source: string) {
  switch (source) {
    case "github":
      return { label: "GitHub", code: "GH" };
    case "npm":
      return { label: "npm registry", code: "NPM" };
    case "itunes":
      return { label: "App Store", code: "APP" };
    case "web":
    default:
      return { label: "Web Search", code: "WEB" };
  }
}
