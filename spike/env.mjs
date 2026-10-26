// Minimal .env loader for the spike runner only.
// Zero dependencies, so `npm run spike` works before `npm install`.
// The server uses its own validated config; this file is throwaway tooling.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Parse KEY=value pairs. Supports `#` comments, blank lines, quoted values,
 * and an optional leading `export `. Values already set in the real
 * environment win over the file (standard precedence).
 */
export function loadEnv() {
  const file = resolve(root, ".env");
  const out = { ...process.env };

  if (!existsSync(file)) {
    return { env: out, source: null };
  }

  const text = readFileSync(file, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    let key = line.slice(0, eq).trim().replace(/^export\s+/, "");
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Real env wins; .env fills gaps only.
    if (out[key] === undefined || out[key] === "") out[key] = value;
  }

  return { env: out, source: file };
}
