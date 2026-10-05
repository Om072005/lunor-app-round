# Lunor App Studio

**An AI app-development studio for Lunor.AI that teaches you while it builds.**

Describe an app idea. The studio clarifies it, plans it like a senior engineer, builds a real
React Native (Expo) app you can run on your phone, explains every line, and then turns *your own code*
into lessons mapped to Lunor's App Development roadmap.

> Prompt → **Understand → Plan → Build → Explain → Learn**

Live demo: _see deployment link in the submission_ · No API key? Open one of the **sample projects** on the home page.

---

## Why this design

Lunor's Web Dev domain has two separate tabs: **LEARN** (a 30-level gamified roadmap) and **BUILD** (an AI
workspace). The App Studio connects them: what you learn comes from the app you build. A lesson doesn't say
"learn FlatList"; it shows the `FlatList` on line 24 of *your* `HabitListScreen.js` and explains why it's there.

| Stage | What the student does | What the AI produces |
|---|---|---|
| **1. Understand** | Types an idea, answers 3–5 tappable clarifying questions | An editable **App Brief**: problem, personas, MoSCoW features, out-of-scope, assumptions |
| **2. Plan** | Reviews and approves the plan (nothing is built before approval) | Stack decision *with reasons and honest alternatives*, screen-flow diagram, data model, milestones, risks |
| **3. Build** | Builds milestone by milestone, watches code stream in, edits code, asks for changes in plain English | A runnable Expo project, a **live phone preview**, a QR code to run it on a real phone, a static project checker with "Fix with AI", zip export |
| **4. Explain** | Clicks through each file, selects code to ask questions, toggles beginner / intermediate | Section-by-section walkthroughs with line highlighting, common mistakes, an **architecture map built from the real import graph** |
| **5. Learn** | Reads micro-lessons, takes quizzes, completes coding challenges *on their own app* | A personal curriculum mapped to Lunor's roadmap levels (LV1–LV30), XP, AI-reviewed challenges that can be applied back to the app |

## Architecture

```
Browser (Next.js client)                         Server (Next.js route handlers)
┌──────────────────────────────┐   JSON / text  ┌──────────────────────────────────────┐
│ Stage UIs + zustand store    │ ─────────────▶ │ /api/understand /brief /plan         │──▶ Gemini (structured JSON,
│ (persisted to localStorage)  │                │ /api/explain /learn /check           │    Zod-validated, retried)
│ Monaco editor · React Flow   │ ◀── stream ─── │ /api/build /modify /ask  (streamed)  │──▶ Gemini (streamed text)
│ Snack embed (phone preview)  │                │ /api/snack                           │──▶ Expo Snack (saveAsync)
└──────────────────────────────┘                └──────────────────────────────────────┘
```

Key decisions:

- **One `Project` object flows through every stage.** Each stage consumes the artifacts of the previous
  ones (brief → plan → files → explanations → lessons), which keeps the experience coherent.
- **Structured output everywhere it matters.** Every JSON response has a Zod schema that is converted to
  JSON Schema for Gemini *and* used to validate the reply. Malformed output is retried, never rendered.
- **Code is streamed in a plain-text block protocol** (`<<<FILE path>>> … <<<END FILE>>>`) instead of JSON.
  Source code inside JSON strings is where LLMs most often break escaping, and the text protocol can be
  parsed incrementally, so files appear in the editor as they are written.
- **Generated apps are constrained to a whitelist** of Snack-compatible packages (React Navigation,
  AsyncStorage, vector icons) and web-safe APIs, so they run in the preview reliably. A static checker
  validates imports and the entry point after each step.
- **Preview via saved Snacks, not live sessions.** snack-sdk's live web preview only works on localhost
  ([expo/snack#535](https://github.com/expo/snack/issues/535)); saving the Snack and embedding it by id
  works on any domain and gives an `exp://` URL for the QR code.
- **Resilient on the free tier.** Requests walk a model fallback chain (`quality` and `fast` tiers) with
  per-attempt timeouts, since free-tier models frequently return 503 "high demand". Users can paste their
  own Gemini key (kept in their browser) if the shared quota runs out, and recorded **sample projects**
  make every stage explorable with no key at all.
- **Security.** All input is validated with Zod at the API boundary (file path whitelist, size limits),
  there is a per-IP rate limit, the API key never reaches the client, and AI markdown is rendered without raw HTML.

## Project layout

```
src/
  app/                  pages (landing, /studio/[id]) and API routes
  components/stages/    one folder per stage (understand, plan, build, explain, learn)
  lib/ai/               Gemini client, prompts, error mapping
  lib/api/              request schemas, rate limiting, route plumbing
  lib/                  project model, file-stream parser, project checker, export, graph layout
  data/samples/         recorded sample projects
scripts/record-sample.ts  runs the whole pipeline end to end and saves a sample
e2e/                    Playwright tests
```

## Run locally

```bash
npm install
echo "GEMINI_API_KEY=your_key" > .env.local   # free key: https://aistudio.google.com/apikey
npm run dev                                     # http://localhost:3000
```

Optional env vars: `GEMINI_MODELS_QUALITY`, `GEMINI_MODELS_FAST` (comma-separated model chains), `RATE_LIMIT_PER_MIN` (default 20).

## Tests

```bash
npm test               # unit tests (Vitest)
npm run test:coverage  # coverage of src/lib (80% threshold)
npm run test:e2e       # Playwright: full stage walkthrough on a sample project
npx tsx scripts/record-sample.ts <slug> "<idea>"   # live end-to-end run against the real model
```

## Limitations and next steps

- Projects live in the browser (localStorage). Next step: persist to Lunor accounts and sync with Skill Radar / XP.
- Generated apps store data on-device (AsyncStorage). The plan explains the production upgrade path (e.g. Firebase/Supabase).
- The preview crops Expo's embed to the device pane. A first-party web player would remove that dependency.
- Next steps: Flutter as a second target, collaborative projects (Lunor Projects), and publishing via EAS Build.
