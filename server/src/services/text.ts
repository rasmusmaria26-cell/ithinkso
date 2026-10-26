/**
 * Text hygiene for anything that came off the open internet.
 *
 * Every lead passes through here before it can reach the judge prompt or the
 * UI. Two jobs: keep the prompt small and predictable (truncation), and keep
 * control characters, bidi overrides, and zero-width joiners out of both the
 * prompt and the DOM (stripping).
 */

export const SNIPPET_LIMIT = 300;
export const NAME_LIMIT = 120;

/**
 * Characters removed outright. C0/C1 controls, DEL, and the bidi/zero-width
 * range — the latter are the ones that let a snippet visually impersonate a
 * different string.
 */
const CONTROL_AND_INVISIBLE =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/g;

/**
 * Strip control/invisible characters, then collapse all whitespace runs
 * (newlines included) to single spaces. Newlines are collapsed because the
 * evidence block is line-delimited in the prompt — a snippet must not be able
 * to forge a delimiter or a line of its own.
 */
export function cleanText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(CONTROL_AND_INVISIBLE, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Truncate to `limit`, preferring a word boundary when one lands in the last
 * 25% of the budget. No ellipsis: the UI shows the real snippet and a cut-off
 * "…" inside a quoted quote reads as part of the source.
 */
export function truncate(input: string, limit = SNIPPET_LIMIT): string {
  if (input.length <= limit) return input;

  const hard = input.slice(0, limit);
  const lastSpace = hard.lastIndexOf(" ");

  // Only cut at the boundary if doing so does not throw away the last word.
  // (`lastSpace === limit - 1` means the cut already lands between words.)
  if (lastSpace > 0 && lastSpace < limit - 1 && lastSpace >= limit * 0.75) {
    return hard.slice(0, lastSpace);
  }
  return hard.trimEnd();
}

/** Sanitize a snippet: control-stripped, single-line, <= 300 chars. */
export function cleanSnippet(input: unknown): string {
  return truncate(cleanText(input), SNIPPET_LIMIT);
}

/** Sanitize a display name / title. */
export function cleanName(input: unknown): string {
  return truncate(cleanText(input), NAME_LIMIT);
}

/**
 * Accept only absolute http(s) URLs.
 *
 * Deliberately stricter than `z.string().url()`, which happily accepts
 * `javascript:` and `data:` — the UI renders these into an anchor href.
 * Returns null for anything that is not a public http(s) URL.
 */
export function safeHttpUrl(input: unknown): string | null {
  if (typeof input !== "string" || !input.trim()) return null;

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname || !url.hostname.includes(".")) return null;

  return url.toString();
}

/**
 * Host used for display ("GitHub", "npm", …). Kept separate from the source
 * enum so the UI never has to map strings itself.
 */
export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}
