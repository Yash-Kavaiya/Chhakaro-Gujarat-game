# છકડામાં ગુજરાત — Chhakaro Gujarat 3D

A browser game where you drive a Gujarati **chhakaro** (three-wheeler), a **car** or a
**bike** across a Gujarat-shaped world. Every trip starts in the capital, **Gandhinagar**.
Twenty real places form the map — Dwarka, Porbandar, Somnath, Gir, the Rann of Kutch,
Dholavira, the Statue of Unity, Rani ki Vav, **Dholera Smart City and its new airport**,
Ahmedabad's SVPIA airport and more — linked by real highway routes (NH-48, NH-27, NE-1, the
Ahmedabad–Dholera expressway…), Indian Railways lines with stations and running trains, and
GSRTC ST bus stations and stops. The terrain follows the real state outline: the Arabian Sea
with the Gulfs of Kutch and Khambhat, the white Great and Little Rann, beaches and the state
border. All Gujarati text uses the **Hind Vadodara** typeface. Progress — visited places,
missions, reputation, chosen vehicle and customisation — persists in `localStorage`. Built
with React 19, Vite 6, Three.js and an Express server that proxies Gemini text-to-speech.

## Prerequisites

- [Bun](https://bun.sh) (package manager + script runner)
- A modern browser with WebGL.

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
| `GEMINI_API_KEY` | Enables the live Gemini calls in `server.ts`. **Optional in dev** — with no key, `/api/gemini/tts` tells the client to use the browser's Web Speech API, so gameplay and narration are unchanged. In production it is injected automatically by Google AI Studio from the user's configured secret. |
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
src/world/GameWorld.ts  Orchestrates the Three.js systems: vehicle model + per-vehicle driving
                        physics (vehicles/: Chhakaro, Car, Bike + VEHICLE_SPECS), sea/edge
                        collision, camera modes, time-of-day, traffic & NPCs, environment
                        building, landmark/facility proximity. Supporting modules alongside it:
                        EnvironmentBuilder, GujaratTerrain (state-shaped land/sea/Rann),
                        RailwaySystem (tracks, stations, trains), BusTransitBuilder (ST
                        depots + stops), NPCSystem, TrafficSystem, TimeOfDaySystem,
                        RoadSignBuilder, landmarks/*.
src/state/              Pure, unit-tested game logic (each file has a sibling .test.ts):
                        - persistence.ts     versioned localStorage save
                                             (key "chhakaro-gujarat-save-v1"), debounced
                                             ~500ms writes, flush-on-unload, shallow-merge
                                             onto DEFAULT_PROGRESS, clearProgress() for reset.
                                             Vehicle sim state is deliberately NOT persisted.
                        - missionMatching.ts isMissionComplete(mission, arrivedLocationId).
src/components/         HUD + modals: HUD, GujaratMapModal + MiniMap (shared GujaratMapSvg),
                        GarageModal (incl. VehiclePicker), PassengerMissionModal,
                        PhotoModeModal, LandmarkInspectModal, StartScreen, MobileControls,
                        SpeedometerGauge.
src/data/               Static content: locations.ts (20 places, START_LOCATION = Gandhinagar),
                        highwayNetwork.ts, railwayNetwork.ts, gujaratGeography.ts (coast,
                        gulfs, Rann, border), roadsidePlacements.ts, waterBodies.ts,
                        missions.ts. zoneLayout.test.ts proves roads, rails and props stay
                        on land and clear of water; dataIntegrity.test.ts guards id refs.
src/audio/SoundManager  Web Audio procedural engine / horn / temple bell / chime + Web Speech
                        Gujarati TTS fallback.
server.ts               Express server:
                        - POST /api/gemini/tts    gemini-3.1-flash-tts-preview (voice "Puck");
                          returns { audio: null, useFallback: true } on no-key/failure.
                        - GET  /api/health
                        Dev: Vite middleware (SPA). Prod: static dist/ + SPA fallback.
```

## Testing

`bun run test` runs Vitest (jsdom, `src/**/*.test.ts`) — 11 files, 93 tests, including the
geography/layout guarantees in `zoneLayout.test.ts`. Keep `bun run lint`, `bun run build` and `bun run test` all green before committing.

## Controls

- **W / A / S / D** or arrow keys — drive
- **C** — cycle camera (chase, hood, passenger, cinematic, drone)
- **M** — map, **E** — inspect a nearby landmark, **H** — horn, **L** — headlights
- Switch between chhakaro, car and bike on the start screen or in the garage
- On-screen pedals/steering are shown on touch devices.
