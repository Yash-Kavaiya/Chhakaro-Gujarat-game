# છકડામાં ગુજરાત — M0 + M1 Design: Stabilize & Core Tour Loop

**Date:** 2026-08-30
**Status:** Approved (design); pending written-spec review
**Scope:** Milestones M0 and M1 of a 6-milestone program (see "Roadmap context")

---

## 1. Purpose & audience

`Chhakaro-Gujarat-game` is a 3D drivable tour of Gujarat in an iconic Saurashtra
_chhakaro_ (three-wheeler), with a Gujarati AI guide ("કાનજી કાકો"), cultural
data for 16 landmarks, and a light progression loop.

**This is a portfolio / demo piece.** The bar is: a stranger plays for 3–10
minutes and comes away impressed. That means **depth and polish on a focused set
of features**, not breadth across the ~110-item roadmap. Every feature that ships
must feel finished.

---

## 2. Current state (verified 2026-08-30)

The project is a Google AI Studio ("Build") export: React 19 + Vite 6 + Three.js
0.185 + an Express server (`server.ts`) that proxies Gemini. ~13k LOC, one squashed
commit. A lot of surface area already exists:

**Working / present:**

- 3D world: `GameWorld`, `EnvironmentBuilder` (1.4k lines), `ChhakaroModel`,
  `NPCSystem`, `TrafficSystem`, `TimeOfDaySystem`, `RoadSignBuilder`.
- Arcade vehicle physics, 5 camera modes, fuel / engine-temp / puncture sim,
  Gir 25 km/h speed cap, rain particles, distance-driven day/night cycle.
- Data (all richly authored in Gujarati): 16 locations, 30 foods, 9 achievements,
  6 passengers + 6 missions, radio stations, quizzes, souvenirs.
- HUD + 11 modal components; procedural Web Audio (`SoundManager`);
  `RadioAudioEngine` + `InCarRadio` (wired via HUD).
- Kanji Kaka chat UI → `/api/gemini/guide` with a Gujarati system prompt, a
  multi-model fallback loop, and a local scripted fallback
  (`generateSmartKakaFallback`). TTS endpoint + Web Speech fallback.

**Broken — verified via `tsc` and by reading call sites:**

1. **React is effectively untyped.** `@types/react` / `@types/react-dom` are not
   installed and `strict` is off, so `import React from 'react'` → `any`,
   `React.FC` → `any`, and **JSX props are never checked.** `tsc --noEmit`
   reports only 19 errors; this number is artificially low.

2. **4 of 11 modals have mismatched prop contracts and their features do not work
   at runtime:**

   | Modal | App passes | Component expects | Effect |
   |---|---|---|---|
   | `QuizModal` | `currentLocation, coins, onRewardCoins` | `quiz: CulturalQuiz \| null, onAnswerCorrect` | Quiz never receives a question → dead |
   | `SouvenirShopModal` | `collectedSouvenirs, onBuyItem` | `souvenirs: SouvenirItem[], onBuySouvenir` | Shop dead |
   | `PhotoModeModal` | `customization, cameraMode, totalKm` | `canvasRef` | Snapshot capture impossible |
   | `PassengerMissionModal` | `activePassenger, completedMissions, onAcceptPassenger` | `activeMission, onAcceptMission, onCancelMission, completedMissionsCount, currentLocation` | Accepting a mission calls `undefined` |

   Correctly wired: `KanjiKakaGuide`, `GujaratMapModal`, `PassportModal`,
   `FoodPassportModal`, `GarageModal`, `LandmarkInspectModal`.

3. **Runtime crashers — missing methods:** `soundManager.playChime()` (called in
   `App.tsx`, `GameWorld.ts` ×2, `PhotoModeModal`, `QuizModal`,
   `SouvenirShopModal`) and `soundManager.playHorn()` (`PassengerMissionModal` ×2,
   `QuizModal`) **do not exist on `SoundManager`.** Vite tree-shakes the bad
   imports so `vite build` passes, but refuel / repair / achievement / quiz /
   souvenir / mission paths throw `TypeError` in the browser.

4. **`EnvironmentBuilder.buildRoadsideScenery` is defined twice** (lines 674 and
   1277). esbuild keeps the last; the first is dead code.

5. **`PhotoModeModal` filter typing is wrong.** `PHOTO_FILTERS` types `id` as the
   `PhotoFilterPreset` *interface* (from `types.ts`) instead of a string union,
   and the ids it uses (`kathiyawad_warm`, `rann_sunset`, …) don't match the
   union in `types.ts` (`kathiyawad`, `rann_white`, …).

6. **Bad imports in `App.tsx`:** `./data/passengers` does not exist (data is in
   `./data/missions`); `GUJARAT_SOUVENIRS` is really `GUJARATI_SOUVENIRS`. Both
   imports are currently unused, so tree-shaking hides them.

7. **Invalid Gemini model ids in `server.ts`:** `gemini-3.7-flash`,
   `gemini-flash-latest`, `gemini-3.1-flash-lite`, `gemini-3.1-flash-tts-preview`.
   Kaka almost certainly always serves the scripted fallback.

8. **Data integrity:** passenger `priya_student` and `mission_5_heritage_dholavira`
   reference `pickupLocationId: 'patn'`; the real id is `patan_modhera`.

9. **No persistence at all.** Every refresh wipes coins, stamps, achievements,
   discovered foods, souvenirs, customization.

10. **Minor:** `KanjiKakaGuide` uses `alert()` (blocks the render loop);
    `HUD` receives `nearbyLandmark` / `onInspectLandmark` but never uses them, so
    there is no "inspect this landmark" affordance; `types.ts` interfaces
    (`VehicleHealthState`, `GujaratRegion`) are sloppy unions with nearly every
    field optional.

**Not broken (checked):** the `GujaratMapModal` region filter ids
(`saurashtra / kutch / central_gujarat / north_gujarat / south_gujarat`) *do*
match `locations.ts`. Only the `GujaratRegion` type union is messy.

---

## 3. Goals & non-goals

### Goals

- **M0:** the game builds clean under `strict` + React types, every existing
  interaction works end-to-end without throwing, and all progression persists
  across refreshes.
- **M1:** the discover → learn → do → reward → onward loop is deliberate and
  satisfying for a first-time player in a ~10-minute session, with Gujarati voice
  throughout.

### Non-goals (this spec)

- Deeper Kanji Kaka AI (always-on context, proactive narration, voice-command
  control, trip generator) — **M2**.
- New 3D landmark models, weather that affects handling, gear system, reactive
  traffic — **M3**.
- Festivals, garage skins, kids/accessibility modes — **M4**.
- Leaderboards, sharing, PWA, story campaign — **M5**.
- Real-time multiplayer, AR, VR, offline packs, cross-device cloud saves,
  33-district challenge — **cut** (high cost, low demo payoff).
- Real road-network pathfinding — the world is open ground with decorative roads;
  M1 nav is a directional arrow + waypoints (see §5.4).

---

## 4. M0 — Stabilize & Persist

### M0.1 Restore type safety

- Add `@types/react`, `@types/react-dom` (matching React 19) to devDependencies.
- `tsconfig.json`: enable `"strict": true`; add `"include": ["src", "server.ts"]`.
- Fix every error that surfaces. Expected volume: 30–60, clustered as:
  - broken modal contracts (§M0.3),
  - null-safety on `timeOfDay`, `healthState`, `nearbyLandmark`,
  - `types.ts` cleanup: make `VehicleHealthState` fields required with real
    types; collapse `GujaratRegion` to the 5 ids actually used; turn
    `PhotoFilterPreset` into `PhotoFilterId` (string union) + a `PhotoFilter`
    record type.
- `package.json` already has `"lint": "tsc --noEmit"`. It must pass clean and
  stays a required gate for every later change.
- Timebox: if a single fix is non-trivial and off-path, add
  `// @ts-expect-error TODO(m0): <reason>` and a checklist entry rather than
  derailing.

### M0.2 Fix runtime crashers

- `SoundManager`: implement `playChime()` and `playHorn()` as procedural Web
  Audio, consistent with the existing oscillator style (`playChime` = short
  rising two-note ping for confirmations; `playHorn` = reuse the horn tone as a
  one-shot ~250 ms toot). Then audit **every** `soundManager.*` call site against
  the class surface.
- `EnvironmentBuilder`: diff the two `buildRoadsideScenery` bodies; keep the
  intended one (merge any unique content), delete the other.
- `PhotoModeModal`: align filter ids with the new `PhotoFilterId` union.
- `App.tsx`: `./data/passengers` → `./data/missions`;
  `GUJARAT_SOUVENIRS` → `GUJARATI_SOUVENIRS`; drop genuinely-unused imports.
- `data/missions.ts`: `'patn'` → `'patan_modhera'` (2 sites).

### M0.3 Reconnect broken modal contracts

**Principle:** `App.tsx` owns all game state; modals are presentational and
receive data + callbacks. Fix each broken modal to match what App provides (or
adjust App where the component's shape is clearly better), one direction, and
leave a one-line comment on each modal documenting its contract.

- **`PassengerMissionModal`** → props: `isOpen, onClose, currentLocation,
  availableMissions, activeMission, activePassenger, coins, reputationStars,
  completedMissions: string[], onAcceptMission(mission), onCancelMission()`.
  Wire `handleAcceptPassenger` → rename to `handleAcceptMission(mission)` which
  derives the passenger from `mission.passenger`.
- **`QuizModal`** → App selects the quiz for `currentLocation` from
  `GUJARATI_QUIZZES` and passes `quiz`; `onAnswerCorrect(rewardCoins)` updates
  coins + `quizScore`. If no quiz exists for a location, the HUD quiz button is
  disabled there.
- **`SouvenirShopModal`** → App passes `souvenirs` filtered to
  `currentLocation.id` and `onBuySouvenir(id)`; component renders from that.
- **`PhotoModeModal`** → App passes `canvasRef` pointing at the Three.js
  renderer's `<canvas>` (lift the ref from `GameWorld` / the container). Keep the
  filter + location-sticker UI. Capture via `renderer.domElement.toDataURL`
  after a forced render; note `preserveDrawingBuffer` may be required on the
  `WebGLRenderer` — verify and set if so.
- After each fix: scripted playtest that the feature works (see §6).

### M0.4 Persistence

- New `src/state/persistence.ts`:
  - `SCHEMA_VERSION = 1`
  - `interface GameSave { version, coins, reputationStars, visitedLocations,
    discoveredFoods, unlockedAchievements, collectedSouvenirs, completedMissions,
    quizScore, customization, totalKm, lastLocationId }`
  - `loadSave(): GameSave` — returns defaults on missing / parse error /
    version mismatch (no migration needed at v1; just reset).
  - `saveGame(partial: Partial<GameSave>): void` — merge + debounced (~500 ms)
    `localStorage` write under key `chhakaro-gujarat-save-v1`.
  - `clearSave(): void`.
- `App.tsx`: initialise the relevant `useState` from `loadSave()`; one
  `useEffect` watching the persisted slice calls `saveGame`.
- **Decision (was open question): vehicle sim state is NOT persisted.** On load,
  fuel = full, engine temp = normal, no puncture. Rationale: loading a save into
  an out-of-fuel or punctured chhakaro is a hostile demo experience; the sim
  loop is session entertainment, not progression.
- Reset: "🔄 નવેસરથી શરૂ કરો" button in `PassportModal` footer → `clearSave()` +
  reload, behind a confirm (in-UI, not `window.confirm`).

### M0.5 Gemini models + graceful degradation

- `server.ts`: replace the four invalid model ids with valid current ones,
  confirmed against Google's live model list at implementation time via the
  `gemini-api` skill. Keep the fallback chain and the local scripted fallback.
- Verify parity: `GEMINI_API_KEY` set → real replies; unset → scripted fallback,
  identical UX, no console errors, no hanging spinner.
- No other Kaka changes here.

### M0.6 Guardrails

- `README.md`: what it is, `bun install` / `bun run dev` / `bun run build` /
  deploy-to-Cloud-Run-via-AI-Studio, env vars, a short architecture map
  (`GameWorld` systems, `App` state, server endpoints).
- Add **vitest** (`bun run test`) with pure-logic tests only:
  - persistence round-trip + version-mismatch reset,
  - `checkAchievements` unlock rules (move this logic out of `App.tsx` into
    `src/state/achievements.ts` so it is testable),
  - mission-completion matching (`arrivedLocationId === activeMission.dropLocationId`),
  - **location-id integrity:** every `pickupLocationId` / `dropLocationId` /
    `locationId` / achievement id referenced across `data/*` resolves to a real
    `GUJARAT_LOCATIONS` id.
- Replace `alert()` in `KanjiKakaGuide` with the shared toast (§M1.5 `notify`).

### M0 acceptance

- `bun run lint` clean, `bun run build` clean, `bun run test` green.
- Manual playtest checklist (§6) passes: drive; open every modal; refuel; repair;
  answer a quiz; buy a souvenir; take a photo; accept a mission, drive to the
  drop, complete it.
- Refresh mid-session → coins, stamps, achievements, foods, souvenirs,
  customization all preserved; vehicle returns to healthy.

---

## 5. M1 — Core Tour Loop

Goal: make the loop **discover → learn → do → reward → onward** feel intentional.

### 5.1 Landmark approach & inspect

- `HUD`: when `nearbyLandmark` is set, render a prompt — desktop
  "**E** દબાવો · <name> વિશે જાણો", mobile a tappable card. Wire the existing
  unused `onInspectLandmark` / `nearbyLandmark` props.
- `LandmarkInspectModal` becomes the **History Card**: name, region, a 2–3
  sentence reliable history, `culturalHighlights` chips, `famousFood`, a
  "કાનજી કાકાને પૂછો" button (opens Kaka), and a primary
  "✓ મુલાકાત નોંધો" action.
- First entry into a zone (`!visitedLocations.includes(id)`): award stamp +
  coins (e.g. ₹100) + run achievement check + play `playChime` + `notify`, once.
  Logging a visit from the modal and auto-detecting zone entry both funnel
  through one `markLocationVisited(id)`.

### 5.2 Stamp passport as a reward

- `PassportModal` → a passport spread: 16 slots, one per location.
  - Visited: stamp graphic (use `location.icon` + a stamp frame), visit date,
    km-at-visit, and a one-line unlocked story (`location.history` first
    sentence, or a dedicated `passportStory` field added to `LocationData`).
  - Unvisited: silhouette + "?".
- Header: progress bar "ગુજરાત ભ્રમણ: ૧૬ માંથી <n> · <pct>%" + per-region
  tallies ("સૌરાષ્ટ્ર ૪/૬").
- `PassportStamp` type already exists in `types.ts` — use it; persist
  `visitedAt` / `kilometersDriven` per stamp (extend the save: keep
  `visitedLocations` as ids + add a parallel `stampMeta: Record<id, PassportStamp>`).
  This extends the save shape, so M1 bumps `SCHEMA_VERSION` to `2`. Because the
  loader resets on version mismatch (§M0.4) and there are no real users yet, M0
  saves are simply discarded when M1 ships — acceptable; no migration code.

### 5.3 Map: mini-map + full map

- New `src/components/MiniMap.tsx` — HUD element (bottom-left; coexist with or
  toggle against `InCarRadio`). A top-down SVG projection of the 16 zones from
  `worldPosition` (`{x, z}`), showing: player dot + heading triangle, visited vs
  unvisited markers, active-mission pickup/drop pins, nearby facilities. Updates
  from the existing `onSpeedUpdate` / position callbacks (add a lightweight
  `onVehicleMove(x, z, heading)` callback to `GameWorld` if not already exposed).
- `GujaratMapModal`: add a spatial map panel (same projection, larger) beside the
  existing list/detail view. Same marker vocabulary.
- **Gate fast-travel to visited locations.** Unvisited entries show
  "પહેલા જાતે પહોંચો" and a disabled button. `rajkot` (start) always available.
- Optional `mapPosition?: {x, y}` override field on `LocationData` for any zone
  whose 3D `worldPosition` projects to a cramped/overlapping spot on the 2D map.

### 5.4 Gujarati turn-by-turn navigation

- Trigger: a mission is active, or the player taps "અહીં લઈ જાઓ (માર્ગ બતાવો)"
  on a map location (does not teleport — sets a nav target).
- Route model: `src/state/navigation.ts` — a straight line from current position
  to the target zone center, sampled into distance checkpoints. **No pathfinding.**
- `HUD` nav banner: remaining distance, a large arrow rotated to
  `bearing(target) - vehicleHeading`, target name.
- Voice cues via `soundManager.speakGujaratiTextFallback` (M2 upgrades voice):
  on target set ("દ્વારકા તરફ ચાલો, અંતર ૩ કિમી"), at ~50% and ~90%
  ("લગભગ પહોંચી ગયા"), on arrival ("પહોંચી ગયા! જય દ્વારકાધીશ"). Debounce so
  cues never overlap.
- Arrival = within `target.zoneRadius` → clears nav; if it was a mission drop,
  the existing `checkMissionCompletion` path fires.

### 5.5 Loop cohesion

- `StartScreen`: if a save exists, offer "▶ સફર ચાલુ રાખો" (resume: start at
  `lastLocationId`) and "✦ નવી સફર" (new). No save → just start.
- Idle nudge: when speed ≈ 0 for ~8 s inside a visited zone that has an unvisited
  neighbor, Kaka suggests the nearest unvisited zone once
  ("અહીંથી <name> નજીક છે, ત્યાં ફરી આવીએ?").
- **One `notify()` helper** — `src/state/notify.ts` or a small context — that
  every reward/event path calls instead of ad-hoc `setFloatingBanner(...)` +
  `soundManager.*`. Signature: `notify({ text, tone: 'reward' | 'info' | 'warn',
  speak?: boolean })`. Replaces the scattered banner logic in `App.tsx` and the
  `alert()` in `KanjiKakaGuide`.

### M1 acceptance

A first-time player, from a fresh save, can:

1. Start, drive, get an on-screen prompt at the first landmark.
2. Open the History Card, read a fact, log the visit → stamp + coins + chime.
3. Open the passport and see 1/16 with a real stamp and progress bar.
4. Open the map, see their dot, see most locations greyed/locked for fast-travel.
5. Accept a mission, follow the arrow + Gujarati voice cues to the drop, complete
   it → coins + reputation.
6. While idle, get nudged toward the next unvisited place.

All reward moments use the same `notify()` presentation. `lint` / `build` /
`test` stay green; M1 logic (route bearing/distance, nudge selection, passport
progress) has vitest coverage.

---

## 6. Testing approach

- **Pure logic → vitest:** persistence, achievements, mission matching,
  location-id integrity, navigation math (bearing, distance, arrival),
  nearest-unvisited selection, passport progress computation.
- **3D / rendering / audio → not unit tested.** Each milestone has a written
  manual playtest checklist (kept in `docs/superpowers/playtests/`), run in a
  real browser against `bun run dev`.
- **`bun run lint` (tsc strict) is a required gate** for every change in both
  milestones.

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| `strict` + React types surfaces more errors than estimated | M0.1 timeboxed; off-path hard cases get `@ts-expect-error TODO(m0)` + checklist entry, not a rabbit hole |
| Broken modals hide deeper logic bugs (not just prop names) | M0.3 ends each modal with a scripted feature playtest, not just a green compile |
| 2D map projection from hand-placed 3D `worldPosition` looks cramped | `mapPosition` override field in `LocationData`; tune per-location |
| Photo capture needs `preserveDrawingBuffer: true` (perf cost) | Verify in M0.3; if needed, set it only while Photo Mode is open, or capture on a one-off render |
| Gemini model ids change again | Server keeps the multi-model fallback + local scripted fallback; app is fully playable with no key |
| Scope creep from the roadmap mid-milestone | Anything not in §4/§5 is logged to the roadmap backlog, not added now |

---

## 8. Roadmap context (informational)

Full program, each milestone independently demoable; may stop after any:

- **M0** Stabilize & Persist  ← this spec
- **M1** Core Tour Loop  ← this spec
- **M2** Kanji Kaka — always-on contextual AI companion (the signature feature)
- **M3** World & Atmosphere — real landmark models, weather that matters, gears,
  reactive traffic, photo/share polish
- **M4** Culture & Depth — festivals, garage skins, kids/accessibility modes,
  dhaba stops
- **M5** Share & Modes — leaderboard, shareable journey card, cinematic
  auto-tour, PWA, story framing

Deployment stays on Google AI Studio → Cloud Run with the Express server and a
server-injected `GEMINI_API_KEY`.
