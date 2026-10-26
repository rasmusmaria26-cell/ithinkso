# Already Exists?

> **A detective case-file competitor intelligence web app.**
> Type a project idea, find real existing competitors, and uncover what's actually new about yours — without flattery or hype.

---

## The Detective Desk Aesthetic

Designed to feel like a gritty investigator's wooden blotter desk under a green-glass lamp, not a generic SaaS template:

- **Palette:** Paper `#F3EDE0`, ink `#1B1A17`, manila folder `#E6D5A8`, stamp red `#D6361F`, highlighter yellow `#FFE45C`, torn tape `#F2D56B`, desk blotter `#DCD4C4`, and desk lamp night mode `#10130F`.
- **Typography:**
  - Headlines: *Fraunces* (italic, tight leading, hand-drawn ink underline).
  - Body, Labels, Logs, Data, Exhibits: *Courier Prime* (monospaced typewriter).
  - Rubber Stamp & Case File Number: *Special Elite* (grimy all-caps typewriter stamp).
  - Field Notes: *Caveat* (handwritten investigator scribbles).
- **Physical Details:**
  - Flat paper cards with subtle SVG noise texture (no glassmorphism, no purple/blue gradients).
  - Slightly askew card tilts (`-1.4°` to `+1.2°`).
  - Translucent washi masking tape with torn edges holding exhibits to the desk.
  - Manila folder tabbed input with a blinking typewriter block cursor.
- **The Signature Animations:**
  1. **Rubber Stamp Slam:** Spring-loaded drop (`scale: 2.8 → 1.0`, `rotate: -6°`) with an ink-bleed radial halo flash and a `4px` desk shake. (Fades in without shake under `prefers-reduced-motion`).
  2. **Evidence Card Deal:** 90ms staggered deal onto the desk; hover straightens the card to `0°`, elevates it (`-6px`), and drops an ink shadow (`6px 8px 0px #1B1A17`).
  3. **Teletype Case Log:** Character-by-character typed backend events with a blinking cursor and `aria-live="polite"` screen-reader region.
- **Copy Voice:** Deadpan detective. Short. Zero corporate jargon.

---

## What It Does

1. **Decompose the idea.** The judge model breaks the pitch into concrete *features* and *search angles*. If the idea is too vague, it asks a clarifying note instead of guessing.
2. **Hunt for evidence.** Parallel multi-engine search across GitHub API, npm registry, iTunes Search API, and Tavily Web Search (with `site:producthunt.com`, `site:pypi.org`, etc.). Tavily is primary; Brave Web Search is the automatic fallback when no Tavily key is set.
3. **Judge against real leads.** The model evaluates each retrieved lead against the idea's features — but only returns `lead_id`s and qualitative notes, never URLs, names, or scores.
4. **Compute novelty. Severity, not vibes.** The server scores deterministically from the matched features, stamps one of four verdicts, and lays out every exhibit on the desk so you can verify the finding yourself.
5. **Close the case file.** Export the full classified dossier (verdict, novelty bar, matrix, and evidence) as a PDF, open the 2×2 competitive positioning matrix, or share the case via a public link with an Open Graph preview card.

---

## Evidence Integrity Guarantee

1. **No LLM Hallucinations:** The judge model **never** outputs URLs, competitor names, sources, or scores. It receives server-retrieved leads and returns only `lead_id` + qualitative feature evaluations. Every schema the model produces is parsed with `.strict()` so extra fields are visible rather than silently ignored.
2. **Server-Grounded Novelty:** The server computes:
   $$\text{novelty\_score} = 100 - \operatorname{round}(0.7 \times \text{max\_overlap} + 0.3 \times \text{mean\_top3\_overlap})$$
   where `overlap_percent = matched features / total features × 100`. A single relevant lead is a deliberate edge case: novelty collapses to exactly `100 − max_overlap`.
3. **Four Clear Verdicts** (thresholds on `max_overlap`):
   - `ALREADY EXISTS` (≥ 70% feature overlap with a relevant competitor)
   - `PARTLY EXISTS` (≥ 35% overlap)
   - `PRETTY FRESH` (< 35% overlap)
   - `INCONCLUSIVE` (fewer than 3 leads considered, or ≥ 2 sources timed out)
4. **Forensic white space:** the pipeline also surfaces *what's new* vs. *the gaps* and (on the fresh side) extra features that have **zero overlap** with any competitor — never fabricated, always derivable from the matched features.
5. **Verifiable Exhibits:** Evidence cards display the **exact excerpt snippet** retrieved from public indices so the user can verify the finding directly.

---

## Testing the Investigation

The pipeline runs live LLM and search calls, but the **scoring, joining, dedupe, validation, and server routes are 100% deterministic and fully unit-tested** with stubbed adapters — 88 tests across 7 suites in `server/tests/`.

---

## Quickstart

### Prerequisites
- Node.js ≥ 22
- npm ≥ 10
- MongoDB (optional — the server falls back to an in-memory store if it can't connect)

### 1. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate your API keys:
```env
PORT=8080
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
LLM_PROVIDER=gemini          # gemini | groq
GEMINI_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here
GITHUB_TOKEN=your_token_here # recommended; unauthenticated GitHub search is rate-limited
```

### 2. Install Dependencies
```bash
npm install   # installs server + client workspaces
```

### 3. Run the Backend Test Suite
```bash
npm test      # 88 unit tests across 7 suites
```

### 4. Start Development Servers
```bash
npm run dev
```
- Client runs at: `http://localhost:5173`
- Server runs at: `http://localhost:8080`

### 5. Production Build
```bash
npm run build
npm start     # serves server (default :8080) + built client statically
```

---

## Project Structure

```
ithinkso/
├── docs/
│   ├── ARCHITECTURE.md      # Detailed system specification & contracts
│   └── ROADMAP.md           # Development milestones and testing gates
├── server/                  # Express + TypeScript API
│   ├── src/
│   │   ├── config/env.ts    # Zod-validated environment config
│   │   ├── db/              # MongoCaseStore & MemoryCaseStore (graceful fallback)
│   │   ├── middleware/      # Rate limiter & error handling
│   │   ├── routes/          # POST /api/check (SSE stream), GET /api/case/:id, GET /r/:id (OG tags)
│   │   ├── services/
│   │   │   ├── llm/         # Gemini & Groq adapters (swappable)
│   │   │   ├── search/      # GitHub, npm, iTunes, Tavily, Brave; aggregator + dedupe
│   │   │   └── pipeline/    # Decompose → search → judge → score; run orchestrator
│   │   └── types/           # Lead, JudgeOutput, CaseResult, SSE events
│   └── tests/               # 7 Vitest suites (88 tests), deterministic mocks
└── client/                  # React 19 + Vite + Tailwind v4 SPA
    ├── src/
    │   ├── components/
    │   │   ├── layout/      # DeskSurface, DeskHeader
    │   │   ├── landing/     # Headline, ManilaInput
    │   │   ├── investigate/ # CaseLog, ClarifyNote
    │   │   ├── verdict/     # RubberStamp, NoveltyBar
    │   │   ├── evidence/    # EvidenceDesk, EvidenceCard, ExhibitModal
    │   │   ├── dossier/     # DossierModal (classified dossier PDF export)
    │   │   ├── matrix/      # PositioningMatrix (2×2 competitive map)
    │   │   ├── notes/       # StickyNote (handwritten Caveat)
    │   │   ├── drawer/      # ColdCases (localStorage archives)
    │   │   └── share/       # ShareBar (copies /r/:id link)
    │   ├── hooks/           # useInvestigateStream, useColdCases, useReducedMotion
    │   └── lib/             # sound.ts (Web Audio synth), format.ts
```

---

## API Endpoints

| Method | Route            | Description |
| ------ | ---------------- | ----------- |
| `GET`  | `/health`         | Health check |
| `POST` | `/api/check`      | Starts an investigation; streams `\n\n`-framed SSE events (case id first, so a dropped connection can be recovered). |
| `GET`  | `/api/case/:id`   | Fetch a finished case file (recovery + share). |
| `GET`  | `/r/:id`          | Public share page; server injects Open Graph / Twitter meta into the built `index.html` so crawlers get a preview card. |

---

## Deployment

The repo ships a [`vercel.json`](vercel.json) that deploys `client/` and `server/` as a single Vercel app with rewrites: `/api/*` → server, everything else → client. The server builds to `dist/app.mjs` as the entrypoint, and the share path reads the built `index.html` from the client dist.

---

## License
MIT
