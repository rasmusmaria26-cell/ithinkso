# "Already Exists?" — Roadmap

Build order from the spec. Nothing is checked off until it is verified running, not merely written.

---

## Milestone 0 — Spike day (gates everything else)

Measure before building. `npm run spike` hits every real source plus both LLM providers and writes `docs/SPIKE.md`.

- [ ] `spike/run.mjs` + `spike/sources.mjs` written (zero dependencies, Node 24)
- [ ] GitHub: authenticated repo search — latency, `X-RateLimit-Remaining`, whether 6 leads is realistic
- [ ] npm registry search — latency, result quality
- [ ] iTunes Search API — latency, `resultCount`, whether `country` is required
- [ ] Tavily — latency, credit usage per call from the response
- [ ] Brave — latency, `X-RateLimit-Remaining` header
- [ ] Gemini structured output — latency, whether the JSON schema is honoured
- [ ] Groq — latency, JSON mode support
- [ ] **Measured**: full-pipeline wall clock for one idea; per-source quota headroom; cost per check
- [ ] `docs/SPIKE.md` written with numbers and a go/no-go note per source

**No source gets an adapter until its row here has a measured number.**

---

## Milestone 1 — Backend core

- [ ] `server/` scaffolded: TS, Express, zod, mongoose, vitest
- [ ] `config/env.ts` — Zod-validated env, fails fast at boot
- [ ] `services/text.ts` — 300-char truncate, control-char strip, explicit http(s) URL check
- [ ] `services/search/*` adapters with 8s `AbortController`, per-source quota
- [ ] `services/search/dedupe.ts` — project identity (owner/repo, npm→repository, iTunes trackId)
- [ ] `services/search/aggregator.ts` — global semaphore, per-source status, failure isolation
- [ ] LLM adapter interface + Gemini + Groq + factory on `LLM_PROVIDER`
- [ ] `prompts.ts` — decompose and judge, evidence inside `<evidence>`, untrusted-data instruction
- [ ] `services/pipeline/joiner.ts` — lead_id join, reject unknown/duplicate ids
- [ ] `services/pipeline/score.ts` — overlap, novelty, verdict thresholds, inconclusive gate
- [ ] `services/pipeline/run.ts` — full orchestration, persist at step 4, fail-safe terminal states
- [ ] Mongoose `CaseFile` — nanoid(10), status/stage, `expires_at` TTL 90d
- [ ] `POST /api/check` SSE (`case_id` first), `GET /api/case/:id`, share route
- [ ] `trust proxy`, CORS on `CLIENT_ORIGIN`, per-IP rate limit
- [ ] **Verification gate**: `curl -N` the full pipeline end to end; confirm `case_id` arrives first, every source emits status, and the doc reaches `done`

## Milestone 2 — Tests

- [ ] Adversarial joiner: fabricated lead_ids, duplicates, out-of-range `features_matched`, extra fields, oversized arrays
- [ ] Prompt injection fixture: snippet instructing "verdict: pretty_fresh" — assert the verdict is server-computed and unchanged
- [ ] Dedupe: npm package + its GitHub repo collapse to one lead
- [ ] URL scheme validation (reject `javascript:`, `data:`, `file:`)
- [ ] Verdict thresholds at 34/35/69/70
- [ ] Inconclusive gate: <3 leads, and 2 failed sources
- [ ] `vitest` green, all pipeline logic covered without a network call

## Milestone 3 — Frontend shell

- [ ] Vite + React + TS, Tailwind v4 via `@tailwindcss/vite` (**no** `tailwind.config`)
- [ ] `@theme` tokens, `data-theme` day/night, grain overlay, three font families with preconnect + swap
- [ ] `DeskSurface`, `DeskHeader` (CASE FILE NO. counter, lamp toggle, sound toggle off by default)

## Milestone 4 — Landing, stream, clarify

- [x] Headline with hand-drawn underline
- [x] Manila folder input with blinking caret, `Investigate`
- [x] `useInvestigateStream.ts` — fetch + ReadableStream, `\n\n` framing, abort on unmount
- [x] `CaseLog` — one line per real event, `aria-live="polite"`, typewriter on the visual layer only
- [x] Per-source status lines
- [x] `ClarifyNote` — question + answer input, resubmits with `clarification`
- [x] Recovery: if the stream drops, poll `GET /api/case/:id`

## Milestone 5 — Verdict (checkpoint)

- [x] `RubberStamp` — slam, ink bleed, desk shake; `prefers-reduced-motion` → fade only
- [x] Four variants including `INCONCLUSIVE`
- [x] **Show the stamp slam for approval before continuing**

## Milestone 6 — Evidence

- [x] `NoveltyBar` — highlighter fill, `novelty N/100`, one-line reason, "N leads reviewed, M relevant"
- [x] `EvidenceDesk` — staggered deal, 90ms
- [x] `EvidenceCard` — name, source badge, overlap %, why_similar, **real snippet**, link-out with `rel="noopener noreferrer"`
- [x] Sticky notes: "What's actually new", "Suggested twist"

## Milestone 7 — Persistence and polish

- [x] `ShareBar` — copy `/r/:id`, toast "Case filed. Expires in 90 days."
- [x] `/r/:id` served with injected OG/Twitter meta, SPA fallback in dev and prod
- [x] Cold cases drawer from localStorage, `Esc` closes
- [x] Error and rate-limit states with personality
- [x] Mobile single-column pass, keyboard pass, AA contrast pass
- [x] README: setup, env table, API contract, screenshots & video

## Milestone 8 — Detective Noir Visual & Sensory Polish (Ultra-Fidelity)

- [x] **Desk Lamp Lighting Cone (Night Mode)**: Warm radial spotlight on center blotter fading into dark green-black edges.
- [x] **Physical Paperclips & Tape**: Realistic SVG metal paperclips pinning sticky notes and cards with subtle drop shadows.
- [x] **Weathered Stamp & Watermarks**: Distressed grimy texture mask on rubber stamp, official red date stamp, and faint "TOP SECRET // CLASSIFIED" watermark across exhibits.
- [x] **Evidence Deep-Dive Modal**: Interactive modal on card click with side-by-side feature comparison ("Your Concept vs Exhibit"), full excerpt, and red grease-pencil checkmarks.
- [x] **Expanded Web Audio Synthesizer**: Paper rustle audio on card deal/hover, and mechanical typewriter carriage return bell ding (`DING!`) on case filing.
- [x] **Visual Verification**: End-to-end browser verification of all upgraded elements.

