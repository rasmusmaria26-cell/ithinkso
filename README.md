# Already Exists?

> **A detective case-file competitor intelligence web app.**
> Type a project idea, find real existing competitors, and uncover what's actually new about yours—without flattery or hype.

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
- **The 3 Signature Animations:**
  1. **Rubber Stamp Slam:** Spring-loaded drop (`scale: 2.8 → 1.0`, `rotate: -6°`) with an ink-bleed radial halo flash and a `4px` desk shake. (Fades in without shake under `prefers-reduced-motion`).
  2. **Evidence Card Deal:** 90ms staggered deal onto the desk; hover straightens the card to `0°`, elevates it (`-6px`), and drops an ink shadow (`6px 8px 0px #1B1A17`).
  3. **Teletype Case Log:** Character-by-character typed backend events with a blinking cursor and `aria-live="polite"` screen-reader region.
- **Copy Voice:** Deadpan detective. Short. Zero corporate jargon.

---

## Technical Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 (`@theme`) + Framer Motion.
- **Backend:** Node.js / Express + TypeScript + Zod.
- **Persistence:** MongoDB via Mongoose (with automatic graceful fallback to an in-memory store for instant zero-dependency testing).
- **LLM Engine:** Swappable LLM adapter (`gemini` or `groq`) producing structured JSON.
- **Evidence Retrieval:** Parallel multi-engine search across GitHub API, npm registry, iTunes Search API, and Tavily Web Search (with `site:producthunt.com`, `site:pypi.org`, etc.).
- **Streaming:** Real-time event streaming over HTTP via `fetch()` + `ReadableStream` with a custom `\n\n` frame parser.

---

## Evidence Integrity Guarantee

1. **No LLM Hallucinations:** The judge model **never** outputs URLs, competitor names, sources, or scores. It receives server-retrieved leads and returns only `lead_id` + qualitative feature evaluations.
2. **Server-Grounded Novelty:** The server computes:
   $$\text{novelty\_score} = 100 - \operatorname{round}(0.7 \times \text{max\_overlap} + 0.3 \times \text{mean\_top3\_overlap})$$
3. **Four Clear Verdicts:**
   - `ALREADY EXISTS` ($\ge 70\%$ feature overlap with a relevant competitor)
   - `PARTLY EXISTS` ($\ge 35\%$ overlap)
   - `PRETTY FRESH` ($< 35\%$ overlap)
   - `INCONCLUSIVE` (fewer than 3 leads retrieved or $\ge 2$ sources timed out)
4. **Verifiable Exhibits:** Evidence cards display the **exact excerpt snippet** retrieved from public indices so the user can verify the finding directly.

---

## Quickstart

### Prerequisites
- Node.js $\ge 22$
- npm $\ge 10$

### 1. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate your API keys in `.env`:
```env
PORT=8080
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GITHUB_TOKEN=your_github_token_here
TAVILY_API_KEY=your_tavily_api_key_here
```

### 2. Install Dependencies
```bash
# Install server dependencies
npm --prefix server install

# Install client dependencies
npm --prefix client install
```

### 3. Run Backend Test Suite
Verify that all 84 unit tests pass:
```bash
npm --prefix server test
```

### 4. Start Development Servers
Run both client and server concurrently:
```bash
npm run dev
```
- Client runs at: `http://localhost:5173`
- Server runs at: `http://localhost:8080`

---

## Project Structure

```
ithinkso/
├── docs/
│   ├── ARCHITECTURE.md      # Detailed system specification & contracts
│   └── ROADMAP.md           # Development milestones and testing gates
├── server/
│   ├── src/
│   │   ├── config/env.ts    # Zod-validated environment config
│   │   ├── db/              # MongoCaseStore & MemoryCaseStore
│   │   ├── middleware/      # Rate limiter & error handling
│   │   ├── routes/          # /api/check (SSE), /api/case/:id, /r/:id (OG)
│   │   ├── services/
│   │   │   ├── llm/         # Gemini & Groq adapters
│   │   │   ├── search/      # GitHub, npm, iTunes, Tavily
│   │   │   └── pipeline/    # Joiner, scoring, run orchestrator
│   │   └── types/           # Lead, JudgeOutput, CaseResult, SSE events
│   └── tests/               # 84 unit tests across 7 test suites
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── layout/      # DeskSurface, DeskHeader
    │   │   ├── landing/     # Headline, ManilaInput
    │   │   ├── investigate/ # CaseLog, ClarifyNote
    │   │   ├── verdict/     # RubberStamp, NoveltyBar
    │   │   ├── evidence/    # EvidenceDesk, EvidenceCard
    │   │   ├── notes/       # StickyNote (handwritten Caveat)
    │   │   ├── drawer/      # ColdCases (localStorage archives)
    │   │   └── share/       # ShareBar
    │   ├── hooks/           # useInvestigateStream, useColdCases, useReducedMotion
    │   └── lib/             # sound.ts (Web Audio synth), format.ts
```

---

## License
MIT
