# છકડામાં ગુજરાત — Chhakaro Gujarat 3D

A browser game where you drive an iconic Gujarati **chhakaro** (three-wheeler) on a tour of
Gujarat. Sixteen real landmarks form the map — Dwarka, Somnath, Gir, the Rann of Kutch, the
Statue of Unity, Rani ki Vav and more — each with its own scenery, food, souvenirs and a
cultural quiz. "Kanji Kaka", an AI tour guide, narrates the trip in Kathiyawadi Gujarati
(backed by Gemini, with a local scripted fallback so the game is fully playable with no API
key). Progress — coins, reputation, passport stamps, achievements, discovered foods,
customisation — persists in `localStorage` across sessions. Built with React 19, Vite 6,
Three.js and an Express server that also proxies the Gemini calls.

## Prerequisites

- [Bun](https://bun.sh) (package manager + script runner)
- A modern browser with WebGL. Microphone + `SpeechRecognition` are optional (voice input to
  Kanji Kaka); the app degrades gracefully without them.

## Setup

```bash
bun install
```

Optionally copy the env template (all vars are optional for local dev — see
[Environment variables](#environment-variables)):

```bash
cp .env.example .env
```

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Runs `tsx server.ts`. The Express server starts on **http://localhost:3000** and mounts Vite in middleware mode, so the SPA and the `/api/*` routes are served from the same origin. |
| `bun run build` | `vite build` (SPA → `dist/`) then `esbuild` bundles the server → `dist/server.cjs`. |
| `bun run start` | `node dist/server.cjs` — the production server. Set `NODE_ENV=production` so it serves the static `dist/` build with SPA fallback instead of trying to start Vite. |
| `bun run lint` | `tsc --noEmit` — full type-check with `strict` on. This is a required gate. |
| `bun run test` | `vitest run` — the pure-logic unit suite (jsdom env). |
| `bun run test:watch` | `vitest` in watch mode. |
| `bun run clean` | Removes `dist/`. |

### Production run locally

```bash
bun run build
NODE_ENV=production bun run start   # http://localhost:3000
```

## Environment variables

Declared in `.env.example`. Both are optional for local development.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Enables the live Gemini calls in `server.ts`. **Optional in dev** — with no key, `/api/gemini/guide` returns a local scripted Kathiyawadi-Gujarati response and `/api/gemini/tts` tells the client to use the browser's Web Speech API, so gameplay and narration are unchanged. In production it is injected automatically by Google AI Studio from the user's configured secret. |
| `APP_URL` | The public URL the applet is hosted at. Injected by AI Studio at runtime with the Cloud Run service URL; reserved for self-referential links. Not read by the app code today. |

## Deployment

The deploy target is **Google AI Studio → Cloud Run**. `bun run build` produces the static SPA
(`dist/`) and the bundled server (`dist/server.cjs`); with `NODE_ENV=production` the Express
server serves the SPA and proxies Gemini from the same service. AI Studio injects
`GEMINI_API_KEY` and `APP_URL` into the Cloud Run environment. `metadata.json` declares the
`microphone` frame permission and the server-side Gemini capability.

## Architecture

```
src/main.tsx            React entry — mounts <App/>
src/App.tsx             Owns ALL game state (economy, progression, vehicle health, modals).
                        Initialises state from the persisted save, writes it back on change,
                        and bridges the Three.js world callbacks into React.
src/world/GameWorld.ts  Orchestrates the Three.js systems: chhakaro model + driving physics,
                        camera modes, time-of-day, traffic & NPCs, environment building,
                        landmark/facility proximity. Supporting modules alongside it:
                        ChhakaroModel, EnvironmentBuilder, NPCSystem, TrafficSystem,
                        TimeOfDaySystem, RoadSignBuilder.
src/state/              Pure, unit-tested game logic (each file has a sibling .test.ts):
                        - persistence.ts     versioned localStorage save
                                             (key "chhakaro-gujarat-save-v1"), debounced
                                             ~500ms writes, flush-on-unload, shallow-merge
                                             onto DEFAULT_PROGRESS, clearProgress() for reset.
                                             Vehicle sim state is deliberately NOT persisted.
                        - achievements.ts    evaluateAchievements(input) → unlocked id set.
                        - missionMatching.ts isMissionComplete(mission, arrivedLocationId).
src/components/         HUD + modals: HUD, KanjiKakaGuide, GujaratMapModal, PassportModal,
                        FoodPassportModal, GarageModal, PassengerMissionModal,
                        SouvenirShopModal, QuizModal, PhotoModeModal, LandmarkInspectModal,
                        StartScreen, MobileControls, InCarRadio, SpeedometerGauge.
src/data/               Static Gujarati content: locations.ts (16 locations + foods +
                        achievement definitions), missions.ts, souvenirs.ts, quizzes.ts,
                        radioStations.ts. dataIntegrity.test.ts guards the id cross-references.
src/audio/SoundManager  Web Audio procedural engine / horn / temple bell / chime + Web Speech
                        Gujarati TTS fallback.
server.ts               Express server. Two Gemini endpoints, each with a local fallback:
                        - POST /api/gemini/guide  Kanji Kaka chat. Model fallback chain
                          gemini-3.7-flash → gemini-3.6-flash → gemini-3.1-flash-lite, then
                          a local scripted Gujarati response (generateSmartKakaFallback).
                        - POST /api/gemini/tts    gemini-3.1-flash-tts-preview (voice "Puck");
                          returns { audio: null, useFallback: true } on no-key/failure.
                        - GET  /api/health
                        Dev: Vite middleware (SPA). Prod: static dist/ + SPA fallback.
```

## Testing

`bun run test` runs Vitest (jsdom, `src/**/*.test.ts`). Current suite: 5 files, 18 tests —
`persistence`, `achievements`, `missionMatching`, `dataIntegrity`, and the `SoundManager` API
surface. Keep `bun run lint`, `bun run build` and `bun run test` all green before committing.

## Controls

- **W / A / S / D** or arrow keys — drive
- **C** — cycle camera (chase, hood, passenger, cinematic, drone)
- **M** — map, **P** — passport, **E** — inspect a nearby landmark
- On-screen pedals/steering are shown on touch devices.
