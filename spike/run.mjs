#!/usr/bin/env node
// Spike runner. Answers, with real numbers: what does one full pipeline cost in
// wall clock, and how much quota headroom is left after it?
//
//   npm run spike              # probe every active source
//   npm run spike -- --burst 3 # repeat GitHub to watch the rate-limit counter
//   SPIKE_IDEA="..." npm run spike
//
// Writes docs/SPIKE.md. Never fails the process on a provider error — a failed
// probe is data.
//
// ACTIVE SOURCES: GitHub, Tavily, npm, iTunes, Gemini.
// Groq and Brave were dropped by decision and are no longer probed.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadEnv } from "./env.mjs";
import { SOURCES, LLMS } from "./sources.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const burstIdx = args.indexOf("--burst");
const burst = burstIdx !== -1 ? Number(args[burstIdx + 1]) || 3 : 0;

const { env, source } = loadEnv();
const IDEA = env.SPIKE_IDEA || "an app that explains why a houseplant is dying";
const QUERY = env.SPIKE_QUERY || "houseplant care reminder";

const now = new Date().toISOString();
const rows = [];

console.log(`\n  Already Exists? — source spike`);
console.log(`  env:   ${source ?? "no .env found (shell env only)"}`);
console.log(`  idea:  "${IDEA}"`);
console.log(`  query: "${QUERY}"`);
console.log(`  at:    ${now}\n`);

function logResult(label, outcome) {
  if (outcome.skipped) {
    console.log(`  – ${label.padEnd(20)} skipped: ${outcome.skipped}`);
    return;
  }
  if (outcome.ok) {
    const { value, ms } = outcome;
    console.log(`  ✓ ${label.padEnd(20)} ${String(ms).padStart(5)}ms   ${value.count} results`);
    for (const s of value.sample ?? []) {
      const meta = [s.desc, s.url, s.stars !== undefined ? `${s.stars}★` : null]
        .filter(Boolean)
        .join("  ·  ");
      console.log(`      ${String(s.name).slice(0, 32).padEnd(32)} ${meta}`);
    }
    if (value.quota && Object.keys(value.quota).length) {
      console.log(`      quota: ${JSON.stringify(value.quota)}`);
    }
  } else {
    console.log(`  ✗ ${label.padEnd(20)} ${String(outcome.ms).padStart(5)}ms   ${outcome.error}`);
  }
}

async function runAll() {
  console.log("  EVIDENCE SOURCES\n");
  for (const src of SOURCES) {
    let outcome;
    try {
      outcome = await src.probe(env, QUERY);
    } catch (err) {
      outcome = { ok: false, ms: 0, error: String(err?.message ?? err) };
    }
    rows.push({ kind: "source", label: src.name, ...outcome });
    logResult(src.name, outcome);
  }

  console.log("\n  LLM PROVIDER (structured JSON)\n");
  for (const llm of LLMS) {
    let outcome;
    try {
      outcome = await llm.probe(env, IDEA);
    } catch (err) {
      outcome = { ok: false, ms: 0, error: String(err?.message ?? err) };
    }
    rows.push({ kind: "llm", label: llm.name, ...outcome });
    logResult(llm.name, outcome);
  }

  // Sequential repeat to observe quota decrement. Purely diagnostic.
  if (burst > 1) {
    const target = SOURCES.find((s) => s.name === "GitHub");
    if (target) {
      console.log(`\n  BURST — ${target.name} x${burst} (watch the remaining counter)\n`);
      for (let i = 1; i <= burst; i++) {
        const outcome = await target.probe(env, QUERY);
        const remaining = outcome.ok ? outcome.value.quota?.["x-ratelimit-remaining"] : "—";
        console.log(
          `  ${String(i).padStart(2)}. ${String(outcome.ok ? outcome.ms : outcome.error).padStart(6)}ms   remaining=${remaining}`,
        );
      }
    }
  }
}

function summarize() {
  const ok = rows.filter((r) => r.ok);
  const failed = rows.filter((r) => !r.ok && !r.skipped);
  const skipped = rows.filter((r) => r.skipped);

  // Sources run in parallel, so the search phase is bounded by the slowest
  // successful source — not the sum.
  const slowest = ok.filter((r) => r.kind === "source").sort((a, b) => b.ms - a.ms)[0];
  const llmTimes = ok.filter((r) => r.kind === "llm").map((r) => r.ms);
  const llmMax = llmTimes.length ? Math.max(...llmTimes) : 0;

  return { ok, failed, skipped, slowest, llmMax };
}

function toMarkdown(s) {
  const lines = [
    "# Spike Report",
    "",
    `Generated: ${now}`,
    "",
    `Idea: \`${IDEA}\`  `,
    `Query: \`${QUERY}\`  `,
    `Env source: ${source ?? "shell environment only"}`,
    "",
    "Active sources: GitHub, Tavily, npm, iTunes, Gemini. Groq and Brave are not probed.",
    "",
    "## Results",
    "",
    "| Probe | Kind | Status | Latency | Results | Quota / notes |",
    "|---|---|---|---|---|---|",
  ];

  for (const r of rows) {
    const status = r.skipped ? "skipped" : r.ok ? "ok" : "FAILED";
    const latency = r.skipped ? "—" : `${r.ms}ms`;
    const count = r.ok ? String(r.value.count ?? "—") : "—";
    const notes = r.skipped
      ? r.skipped
      : r.ok
        ? JSON.stringify(r.value.quota ?? {})
        : r.error.replace(/\|/g, "\\|");
    lines.push(
      `| ${r.label} | ${r.kind} | ${status} | ${latency} | ${count} | ${notes.replace(/\|/g, "\\|")} |`,
    );
  }

  lines.push("", "## Headroom", "");

  if (s.slowest) {
    lines.push(
      `- Slowest source (bounds the parallel search phase): **${s.slowest.label}** at **${s.slowest.ms}ms**.`,
    );
  }
  lines.push(`- Slowest LLM call: **${s.llmMax}ms**.`);
  lines.push(
    `- Estimated full pipeline: **~${s.slowest?.ms ?? 0}ms search + ${s.llmMax * 2}ms for two LLM calls = ~${(s.slowest?.ms ?? 0) + s.llmMax * 2}ms**.`,
  );
  lines.push(
    `- Failed probes: **${s.failed.length}**${s.failed.length ? ` (${s.failed.map((f) => f.label).join(", ")})` : ""}.`,
  );
  lines.push(
    `- Skipped probes: **${s.skipped.length}**${s.skipped.length ? ` (${s.skipped.map((f) => f.label).join(", ")})` : ""}.`,
  );

  lines.push(
    "",
    "## Go / no-go",
    "",
    "A source may only get an adapter after its row above carries a real latency and a quota signal. " +
      "If a quota header is absent, the free-tier limit must be found in its docs and recorded here before building.",
  );

  return lines.join("\n") + "\n";
}

await runAll();
const summary = summarize();
const md = toMarkdown(summary);

mkdirSync(resolve(root, "docs"), { recursive: true });
writeFileSync(resolve(root, "docs", "SPIKE.md"), md, "utf8");

console.log("\n  SUMMARY\n");
console.log(`  slowest source      ${summary.slowest?.ms ?? "—"}ms (${summary.slowest?.label ?? "—"})`);
console.log(`  slowest LLM         ${summary.llmMax}ms`);
console.log(`  est. full pipeline  ~${(summary.slowest?.ms ?? 0) + summary.llmMax * 2}ms`);
console.log(`  failed              ${summary.failed.length}`);
console.log(`  skipped             ${summary.skipped.length}`);
console.log(`\n  wrote docs/SPIKE.md\n`);
