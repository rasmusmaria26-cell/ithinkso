# 🕵️‍♂️ Already Exists? — Detective Case-File Competitor Intelligence

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-88%20Passed-729B1B?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Anti--Hallucination](https://img.shields.io/badge/Integrity-Zero_Hallucinations-D6361F)](#-evidence-integrity-guarantee)

**Type an idea. Scour live public code, package registries, and app stores in parallel. Uncover genuine existing competitors and pinpoint what's truly novel—without sycophantic flattery or hype.**

[Features](#-key-features) • [Detective Desk Aesthetic](#-the-detective-desk-aesthetic) • [Evidence Integrity](#-evidence-integrity-guarantee) • [Architecture](#-system-architecture) • [Quickstart](#-quickstart) • [API](#-api-endpoints) • [Deployment](#-deployment)

</div>

---

## 🔍 Overview

**Already Exists?** is a ruthless, grounded competitor intelligence engine wrapped in a tactile **Detective Noir** atmosphere. 

When indie hackers, founders, or engineers dream up a new product, generic AI chatbots usually praise the idea and hallucinate dead or non-existent URLs. **Already Exists?** takes the opposite approach:
1. It decomposes your idea into discrete searchable technical capabilities.
2. It executes live, parallel searches across **GitHub, npm, the Apple App Store, and the web (Tavily/Product Hunt/PyPI)**.
3. It passes real leads into an isolated LLM judge with strict schema gates that **cannot invent URLs, competitor names, or scores**.
4. The server calculates novelty using deterministic mathematical formulas and slams an authentic rubber stamp verdict on the investigator's desk.

---

## ✨ Key Features

- **🛡️ Evidence Integrity Guarantee:** The LLM judge is restricted to an analytical sandbox. It receives server-retrieved exhibits and outputs *only* lead cross-references and feature evaluations. The server computes the math and issues the verdict.
- **⚡ Real-Time Teletype Streaming:** Investigations stream live over HTTP via Server-Sent Events (`\n\n` framed SSE). Case IDs are issued first, ensuring instant connection recovery if a network drop occurs.
- **🗺️ 2×2 Competitive Positioning Matrix:** Interactive quadrant mapping (*Market Giants*, *Direct Competitors*, *Niche Explorers*, *Feature Twins*) plotting execution maturity vs. feature overlap.
- **📄 Classified Case Dossier (PDF Export):** One-click printable detective report stamped **CONFIDENTIAL // TOP SECRET**, featuring evidence logs, novelty metrics, and grease-pencil checkmarks.
- **🎧 Sensory Web Audio Synthesizer:** Pure zero-asset Web Audio synthesis producing tactile paper rustles on card deals, dull rubber stamp thuds, and a typewriter carriage return bell ding (`DING!`).
- **🗄️ Cold Cases Drawer:** Local storage persistent history allowing users to reopen past case files with keyboard shortcuts (`Esc`).
- **🔗 Social Sharing with OpenGraph Injection:** Dedicated `/r/:id` permalinks that dynamically inject custom OpenGraph preview cards for Discord, X (Twitter), and LinkedIn scrapers.

---

## 🖋️ The Detective Desk Aesthetic

Designed to feel like a gritty private investigator's wooden blotter desk under a green-glass banker's lamp:

```
┌────────────────────────────────────────────────────────────────────────┐
│ [CASE FILE NO. cs_k9a2j1]          💡 Desk Lamp (Toggle)    🔔 Audio   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   "Already Exists?"                                                    │
│    ─────────────────────────────                                       │
│   Type a project idea. We'll search real code, packages, and apps.     │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ 📁 Manila Folder Input Field                     [Investigate] │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
│   ┌───────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│   │ [RUBBER STAMP]    │    │ Exhibit A: npm  │    │ Exhibit B: Git  │  │
│   │  ALREADY EXISTS   │    │ 📎 Tape pin     │    │ 📎 Paperclip    │  │
│   │  Overlap: 85%     │    │ Excerpt quote   │    │ Excerpt quote   │  │
│   └───────────────────┘    └─────────────────┘    └─────────────────┘  │
│                                                                        │
│   [🗺️ View Positioning Matrix]               [📄 Export Dossier PDF]     │
└────────────────────────────────────────────────────────────────────────┘
```

- **Color Palette:**
  - `Paper`: `#F3EDE0` • `Ink`: `#1B1A17` • `Manila Folder`: `#E6D5A8`
  - `Stamp Red`: `#D6361F` • `Highlighter Yellow`: `#FFE45C`
  - `Torn Tape`: `#F2D56B` • `Desk Blotter`: `#DCD4C4` • `Night Mode`: `#10130F`
- **Typography Suite:**
  - **Headlines:** *Fraunces* (expressive serif with hand-drawn ink underlines)
  - **Typewriter Body & Logs:** *Courier Prime* (monospaced teletype)
  - **Rubber Stamp & Case IDs:** *Special Elite* (grimy all-caps distress stamp)
  - **Field Notes & Scribbles:** *Caveat* (handwritten investigator margin notes)
- **Signature Physical Interactions:**
  1. **Rubber Stamp Slam:** Spring-loaded drop (`scale: 2.8 → 1.0`, `rotate: -6°`) with an ink-bleed halo flash and a physical 4px desk screen shake (`prefers-reduced-motion` compliant).
  2. **Evidence Card Deal:** 90ms staggered deal onto the desk with realistic tilt angles (`-1.4°` to `+1.2°`) and ink shadows on hover.
  3. **Teletype Case Log:** Character-by-character typed backend events with a blinking cursor and `aria-live="polite"` screen-reader region.

---

## 🛡️ Evidence Integrity Guarantee

Most AI competitor research fails because models generate imaginary competitors. **Already Exists?** guarantees data integrity through four non-negotiable rules:

### 1. The Isolated Judge Sandbox
The LLM never queries the internet or invents competitors. The server retrieves search results first and injects them into an `<evidence>` envelope. The judge model only outputs JSON referencing existing `lead_id` keys. Every output is strictly validated using Zod—any hallucinated lead ID is stripped immediately.

### 2. Server-Grounded Novelty Math
Novelty is calculated through pure deterministic arithmetic on the server:

$$\text{novelty\_score} = 100 - \operatorname{round}(0.7 \times \text{max\_overlap} + 0.3 \times \text{mean\_top3\_overlap})$$

$$\text{where } \text{overlap\_percent} = \left(\frac{\text{matched\_features}}{\text{total\_features}}\right) \times 100$$

### 3. Clear, Unflinching Verdicts

| Verdict | Overlap Condition | Interpretation |
| :--- | :--- | :--- |
| **`ALREADY EXISTS`** | $\ge 70\%$ feature overlap | Direct, functional competitors dominate this exact concept. |
| **`PARTLY EXISTS`** | $35\% - 69\%$ overlap | Core primitives exist; significant differentiation or niche focus needed. |
| **`PRETTY FRESH`** | $< 35\%$ overlap | High novelty; minimal direct market collision detected. |
| **`INCONCLUSIVE`** | $< 3$ leads or $\ge 2$ timeouts | Insufficient evidence collected to make a definitive ruling. |

### 4. Verifiable Exhibits
Every evidence card surfaces the **exact excerpt snippet** retrieved from public indices with verified outbound links (`rel="noopener noreferrer"`).

---

## 🏗️ System Architecture

```
                    ┌────────────────────────────┐
                    │      User Pitch / Idea     │
                    └─────────────┬──────────────┘
                                  │ POST /api/check (SSE)
                                  ▼
                    ┌────────────────────────────┐
                    │      Orchestrator Run      │
                    │  - Immediate Case ID       │
                    │  - In-Memory / Mongo Cache │
                    └──────┬──────────────┬──────┘
                           │              │
             1. Decompose  ▼              ▼  2. Deduplicate
    ┌───────────────────────────┐   ┌───────────────────────────┐
    │     Gemini / Groq LLM     │   │   Normalizer & Identity   │
    │  - Extract 3-5 features   │   │  - Merge npm ↔ GitHub     │
    │  - Generate search angles │   │  - Assign lead-01..20 IDs │
    └──────────────┬────────────┘   └─────────────▲─────────────┘
                   │                              │
                   ▼                              │
    ┌─────────────────────────────────────────────┴─────────────┐
    │               Parallel Multi-Engine Search                │
    │  ├── GitHub API       (Repos, stars, topics)              │
    │  ├── npm Registry     (Packages, descriptions)            │
    │  ├── iTunes API       (App Store iOS apps)                │
    │  └── Tavily Search    (Product Hunt, PyPI, web sites)     │
    └─────────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
    ┌───────────────────────────────────────────────────────────┐
    │             LLM Judge Cross-Examination                   │
    │  - Input: Features + Untrusted <evidence>                 │
    │  - Output: ONLY matched lead_ids, whats_new, gaps         │
    └─────────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
    ┌───────────────────────────────────────────────────────────┐
    │             Deterministic Scoring & Stamp                 │
    │  - computeScore(max_overlap, mean_overlap)                │
    │  - Assigns: ALREADY EXISTS | PARTLY EXISTS | PRETTY FRESH │
    └─────────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │  Real-Time SSE Delivery   │
                    │  + 90-day Case File Store │
                    └───────────────────────────┘
```

---

## 🚀 Quickstart

### Prerequisites
- **Node.js** $\ge 22.0.0$
- **npm** $\ge 10.0.0$
- **MongoDB** *(Optional — automatic fallback to in-memory store for zero-dependency local dev)*

### 1. Clone & Configure
```bash
git clone https://github.com/rasmusmaria26-cell/ithinkso.git
cd ithinkso
cp .env.example .env
```

Edit `.env` with your credentials:
```env
PORT=8080
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# LLM Provider (gemini or groq)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key

# Search Indices
GITHUB_TOKEN=your_github_token          # Optional but recommended to avoid rate limits
TAVILY_API_KEY=your_tavily_api_key      # Web search (Product Hunt, PyPI, etc.)

# Storage (Optional)
MONGODB_URI=mongodb://localhost:27017/already_exists
```

### 2. Install Dependencies
```bash
# Installs root, server, and client workspaces
npm install
```

### 3. Run the Test Suite
Run the 88 unit tests across all 7 suites:
```bash
npm test
```

### 4. Start Development Servers
```bash
npm run dev
```
- **Desk Client:** `http://localhost:5173`
- **Detective API:** `http://localhost:8080`

### 5. Build for Production
```bash
npm run build
npm start
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | No | `8080` | Port for Express API server |
| `NODE_ENV` | No | `development` | `development`, `test`, or `production` |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin |
| `LLM_PROVIDER` | No | `gemini` | LLM adapter selection: `gemini` or `groq` |
| `GEMINI_API_KEY` | **Yes** (if Gemini) | — | Google AI Studio Gemini API Key |
| `GROQ_API_KEY` | Conditional | — | Groq Cloud API key (if using Groq) |
| `GITHUB_TOKEN` | Recommended | — | Personal access token for GitHub search quota |
| `TAVILY_API_KEY` | Recommended | — | Tavily search key for Product Hunt / web search |
| `MONGODB_URI` | No | In-memory | MongoDB connection string (falls back to memory store) |
| `RATE_LIMIT_PER_HOUR` | No | `20` | Max case checks per IP per hour |
| `TRUST_PROXY` | No | `0` | Number of reverse proxy hops (e.g. `1` for Vercel/Fly) |

---

## 📡 API Endpoints

### `POST /api/check`
Initiates a streamed investigation. Returns a `text/event-stream` response with character-by-character teletype updates.

```bash
curl -N -X POST http://localhost:8080/api/check \
  -H "Content-Type: application/json" \
  -d '{"idea": "A privacy-first personal finance tracker with local sqlite"}'
```

**Streamed Event Types:**
- `case_id`: Emitted immediately (`cs_xxxxxx`) for recovery if stream disconnects.
- `step`: Progress messages typed to the teletype case log.
- `source_status`: Status and lead count for each search engine.
- `clarify`: Emitted if the prompt is too ambiguous, requesting a one-sentence clarification.
- `complete`: Final event with the full case payload and verdict stamp.

### `GET /api/case/:id`
Retrieves a filed case file by ID from MongoDB or in-memory storage.

### `GET /r/:id`
Public shareable URL. The Express server intercepts this route, reads the built `index.html`, and injects custom OpenGraph and Twitter meta tags (case title, stamped verdict, novelty score) before serving.

### `GET /health`
System health check returning uptime and database connectivity status.

---

## 📁 Repository Layout

```
ithinkso/
├── docs/
│   ├── ARCHITECTURE.md          # Complete architectural specification & contracts
│   ├── ROADMAP.md               # Phased milestones and testing criteria
│   └── SPIKE.md                 # Empirical baseline latency & quota metrics
├── server/                      # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/env.ts        # Zod-validated fail-fast environment config
│   │   ├── db/                  # MongoCaseStore & MemoryCaseStore (graceful fallback)
│   │   ├── middleware/          # IP rate limiting, error handlers, trust proxy
│   │   ├── routes/              # /api/check (SSE), /api/case/:id, /r/:id (OG injector)
│   │   ├── services/
│   │   │   ├── llm/             # Gemini & Groq JSON schema adapters & prompts
│   │   │   ├── search/          # GitHub, npm, iTunes, Tavily adapters & deduplicator
│   │   │   └── pipeline/        # Joiner, scoring arithmetic, and run orchestrator
│   │   └── types/               # Type definitions, Zod schemas, SSE interfaces
│   └── tests/                   # 88 Vitest unit tests (injection, scoring, dedupe)
└── client/                      # React 19 + TypeScript + Vite SPA
    ├── src/
    │   ├── components/
    │   │   ├── layout/          # DeskSurface, DeskHeader (lamp toggle, audio switch)
    │   │   ├── landing/         # Fraunces Headline, ManilaInput folder
    │   │   ├── investigate/     # Teletype CaseLog, ClarifyNote
    │   │   ├── verdict/         # RubberStamp slam, NoveltyBar highlighter
    │   │   ├── evidence/        # EvidenceDesk, EvidenceCard, ExhibitModal deep dive
    │   │   ├── dossier/         # DossierModal (Classified dossier printable PDF)
    │   │   ├── matrix/          # PositioningMatrix (2×2 competitive quadrant)
    │   │   ├── notes/           # StickyNote (Caveat handwritten field scribbles)
    │   │   ├── drawer/          # ColdCases (localStorage history archive)
    │   │   └── share/           # ShareBar (link copy, toast notifications)
    │   ├── hooks/               # useInvestigateStream, useColdCases, useReducedMotion
    │   └── lib/                 # sound.ts (zero-asset Web Audio synth), format.ts
```

---

## 🧪 Testing

The test suite runs with **Vitest** without requiring any live network access or paid API keys. All external services are mocked using deterministic fixtures:

```bash
npm --prefix server test
```

```
 ✓ tests/dedupe.test.ts (17 tests)
 ✓ tests/joiner.test.ts (13 tests)
 ✓ tests/score.test.ts (21 tests)
 ✓ tests/text.test.ts (15 tests)
 ✓ tests/injection.test.ts (5 tests)
 ✓ tests/pipeline.test.ts (10 tests)
 ✓ tests/api.test.ts (7 tests)

 Test Files  7 passed (7)
      Tests  88 passed (88)
```

---

## 🚢 Deployment

### Deploying to Vercel
The repository includes a ready-to-deploy [`vercel.json`](vercel.json) that configures the application for full-stack monorepo hosting:
- Frontend routes serve the optimized static Vite bundle.
- `/api/*` and `/r/*` route to the Express server running as a serverless function.

```bash
vercel
```

### Self-Hosted / Docker / VPS
Build the client and server into standalone output, then run with Node:
```bash
npm run build
NODE_ENV=production PORT=8080 node server/dist/main.js
```

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
