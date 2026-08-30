# M1 — Core Tour Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the discover → learn → do → reward → onward loop feel deliberate and satisfying for a first-time player in a ~10-minute session, with Gujarati voice throughout.

**Architecture:** Builds directly on the stabilized M0 baseline (branch `m0-m1-stabilize-and-tour-loop`, HEAD after M0 ≈ the `docs:` commit that closes M0). `src/App.tsx` still owns all game state; modals stay presentational. New pure logic (navigation math, nearest-unvisited selection, stamp records) goes in `src/state/`; new UI in `src/components/`. Persistence gets a schema bump (v1 → v2) to carry per-stamp metadata. The 3D world (`src/world/*`) is touched only to add one position callback and a `mapPosition` read — no restructuring.

**Tech Stack:** TypeScript 5.8 (strict, on since M0), React 19.2, Vite 6, Three.js 0.185, Express 4, bun, vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-08-30-m0-m1-stabilize-and-tour-loop-design.md` — read §5 (M1) alongside this plan. This plan implements §5.1–§5.5. M0 (§4) is a separate, completed plan.

## Global Constraints

- **Package manager is `bun`.** `bun add` / `bun run <script>`. Never introduce npm/yarn lockfiles.
- **`bun run lint` (`tsc --noEmit`, strict) must pass clean — zero `error TS` — at the end of every task.**
- **`bun run build` must exit 0 at the end of every task.** (Pre-existing >500 kB client-chunk advisory is not a regression.)
- **`bun run test` (`vitest run`) must pass at the end of every task that has tests.** Test output must be pristine.
- **All new UI copy is Gujarati-first**, English in parentheses only where surrounding code already does so.
- **Do not restructure 3D world code** (`src/world/*`). Permitted M1 edits there: Task 7 adds `onVehicleMove` callback + calls it; Task 9 adds an optional `mapPosition` read in nothing (data-only) — actually no `src/world` edit for Task 9. That is the entire allowed 3D surface for M1.
- **`localStorage` key stays `chhakaro-gujarat-save-v1`. Schema version goes to `2`** (Task 1). Loader still resets to defaults on any version mismatch — M0 (v1) saves are discarded when M1 ships; no migration code.
- **Achievement `useEffect` and persistence `useEffect` in `App.tsx` (from M0) must not be structurally changed** — extend their dependency lists / payloads where a task requires, never move the side effects back into a setState updater.
- **Commit after every task**: `git add <files> && git commit -m "<type>: <summary>"`. Branch `m0-m1-stabilize-and-tour-loop` (already exists, already pushed to origin).
- Vehicle sim state (fuel, engine temp, puncture, weather, timeOfDay) is still **never persisted**.

---

## File Structure

**New files:**

| Path | Responsibility |
|---|---|
| `src/state/navigation.ts` | Pure route math: `bearingDeg`, `distanceMeters`, `NavRoute`, `computeRoute`, `routeProgress` |
| `src/state/navigation.test.ts` | Bearing/distance/progress/arrival coverage |
| `src/state/exploration.ts` | Pure: `nearestUnvisited`, `regionTally`, `passportProgress` |
| `src/state/exploration.test.ts` | Nearest-unvisited + tally + progress coverage |
| `src/state/notify.ts` | `NotifyTone`, `NotifyMessage`, and a `createNotifier` helper used by `App` |
| `src/components/MiniMap.tsx` | Bottom-left HUD minimap — SVG top-down projection, self-animated from `worldRef` |
| `src/components/NavBanner.tsx` | Top-centre turn-by-turn banner: distance + heading-relative arrow + target name |
| `docs/superpowers/playtests/m1-playtest.md` | Manual browser playtest checklist for M1 |

**Modified files:**

| Path | Change |
|---|---|
| `src/types.ts` | `LocationData.mapPosition?`, `LocationData.passportStory?`; `GameProgress.stampMeta`; `NavTarget` type |
| `src/data/persistence.ts` → `src/state/persistence.ts` | Bump `SCHEMA_VERSION` to 2; add `stampMeta` to `DEFAULT_PROGRESS`; keep behaviour |
| `src/state/persistence.test.ts` | Update for v2 + `stampMeta` round-trip |
| `src/data/locations.ts` | Add `passportStory` (one sentence per location); add `mapPosition` where the 3D projection is cramped |
| `src/App.tsx` | Stamp recording; `notify()`; nav target state + handlers; MiniMap + NavBanner render; HUD wiring; idle-nudge effect; seed `totalKm` from save; resume-vs-new |
| `src/components/HUD.tsx` | Landmark-approach prompt (uses existing unused `nearbyLandmark`/`onInspectLandmark`); render `<MiniMap>` + `<NavBanner>` slots; remove dead `distCapActive` |
| `src/components/LandmarkInspectModal.tsx` | Restructure into the "History Card"; primary action = log visit; secondary = ask Kaka; show `passportStory` when visited |
| `src/components/PassportModal.tsx` | Real stamp spread using `stampMeta` (date, km, story); per-region tallies; locked silhouettes |
| `src/components/GujaratMapModal.tsx` | Add spatial map panel; gate fast-travel to visited; "set destination" (nav, no teleport) action; use `mapPosition` fallback to `worldPosition` |
| `src/components/StartScreen.tsx` | "Resume" vs "New trip" when a save exists |
| `src/world/GameWorld.ts` | Add `onVehicleMove?: (x, z, headingRad) => void`; call it where `onSpeedUpdate` is called |
| `src/world/ChhakaroModel.ts` | none |

---

## Task 1: Save schema v2 — per-stamp metadata

**Files:**
- Modify: `src/types.ts`, `src/state/persistence.ts`, `src/state/persistence.test.ts`

**Interfaces:**
- `src/types.ts` adds:

```typescript
export interface PassportStampRecord {
  visitedAt: string;        // ISO date-time
  kilometersDriven: number; // odometer reading at first visit
}
```

- `GameProgress` gains: `stampMeta: Record<string, PassportStampRecord>;`
- `persistence.ts`: `SCHEMA_VERSION = 2`; `DEFAULT_PROGRESS.stampMeta = {}`.

Background: `PassportStamp` already exists in `types.ts` but is unused and over-specified. Add the leaner `PassportStampRecord` for what M1 actually stores. M0's `GameProgress` has 11 fields; this adds a 12th. The loader resets on version mismatch, so bumping to `2` simply drops any M0 (v1) save.

- [ ] **Step 1: Update the failing tests**

In `src/state/persistence.test.ts`:
- change the version-mismatch test to `JSON.stringify({ version: SCHEMA_VERSION + 1, progress: { coins: 5 } })` (already relative to `SCHEMA_VERSION`, so it still works after the bump — confirm).
- add a test:

```typescript
it('round-trips stampMeta', () => {
  const p = {
    ...DEFAULT_PROGRESS,
    visitedLocations: ['rajkot', 'dwarka'],
    stampMeta: {
      dwarka: { visitedAt: '2026-08-30T10:00:00.000Z', kilometersDriven: 42.5 },
    },
  };
  saveProgress(p);
  flushProgress();
  expect(loadProgress()).toEqual(p);
});

it('defaults stampMeta to an empty object', () => {
  expect(loadProgress().stampMeta).toEqual({});
});
```

- [ ] **Step 2: Run — confirm failure**

Run: `bun run test src/state/persistence.test.ts`
Expected: FAIL — `stampMeta` missing from `DEFAULT_PROGRESS` / type error.

- [ ] **Step 3: Implement**

- `src/types.ts`: add `PassportStampRecord` (above) and `stampMeta: Record<string, PassportStampRecord>;` to `GameProgress`.
- `src/state/persistence.ts`: `export const SCHEMA_VERSION = 2;` and add `stampMeta: {},` to `DEFAULT_PROGRESS`.
- The shallow-merge in `loadProgress` already covers the new key (missing → default `{}` via `{...DEFAULT_PROGRESS, ...parsed.progress}`). No loader logic change.

- [ ] **Step 4: Run — confirm pass**

Run: `bun run test src/state/persistence.test.ts` → PASS (8 tests).
Run: `bun run test` → all green. `bun run lint` → 0. `bun run build` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/state/persistence.ts src/state/persistence.test.ts
git commit -m "feat: save schema v2 with per-stamp metadata"
```

---

## Task 2: Record a stamp on first visit (App)

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- `App.tsx` state: `const [stampMeta, setStampMeta] = useState<Record<string, PassportStampRecord>>(initial.stampMeta);`
- `App.tsx` produces: `recordVisit(locId: string)` — the single entry point that adds to `visitedLocations` AND writes `stampMeta[locId]` on first visit AND awards a one-time reward.

Background: M0's `markLocationVisited` is a pure `prev => next` reducer. M1 needs first-visit side effects (stamp metadata + coins + chime). Keep the reducer pure; add a coordinator that also runs on first visit. Callers today: `world.onLocationChange`, `handleFastTravel`, `handleStartGame`, and `LandmarkInspectModal.onMarkVisited`.

- [ ] **Step 1: Add state + import**

- `import { PassportStampRecord } from './types';` (extend the existing type import).
- Add `stampMeta` state seeded from `initial.stampMeta`.
- Add `stampMeta` to the persistence `useEffect` payload and dep array (it's a `GameProgress` field now).

- [ ] **Step 2: Add `recordVisit`**

Replace direct `markLocationVisited(id)` calls at the four call sites with `recordVisit(id)`:

```typescript
const FIRST_VISIT_COINS = 100;

const recordVisit = (locId: string) => {
  if (visitedLocations.includes(locId)) return;
  const km = totalKm;
  setVisitedLocations((prev) => (prev.includes(locId) ? prev : [...prev, locId]));
  setStampMeta((prev) =>
    prev[locId] ? prev : { ...prev, [locId]: { visitedAt: new Date().toISOString(), kilometersDriven: km } },
  );
  setCoins((c) => c + FIRST_VISIT_COINS);
  soundManager.playChime();
  notify({ text: `📖 નવો પાસપોર્ટ સ્ટેમ્પ! +₹${FIRST_VISIT_COINS}`, tone: 'reward', speak: false });
};
```

(`notify` arrives in Task 3 — until then use `setFloatingBanner(...)`; Task 3 sweeps it. If doing tasks in order, write the `setFloatingBanner` form here and change it in Task 3.)

Keep `markLocationVisited` only if some non-first-visit path still needs the bare reducer; otherwise delete it and update all references. `handleDiscoverFood` stays as-is.

- [ ] **Step 3: Wire the four call sites**

`world.onLocationChange` → `recordVisit(loc.id)`; `handleFastTravel` → `recordVisit(loc.id)`; `handleStartGame` → `recordVisit(startLoc.id)`; `<LandmarkInspectModal onMarkVisited={(locId) => recordVisit(locId)} />`.

- [ ] **Step 4: Manual check**

Run: `bun run dev`. Start at Rajkot → drive to Dwarka → first entry gives +₹100, a chime, a banner, and (verify via devtools `localStorage.getItem('chhakaro-gujarat-save-v1')`) a `stampMeta.dwarka` entry with `visitedAt` + `kilometersDriven`. Re-entering Dwarka gives nothing further.

- [ ] **Step 5: Gates + commit**

`bun run lint` 0 / `bun run build` 0 / `bun run test` green.

```bash
git add src/App.tsx
git commit -m "feat: record passport stamp metadata and reward on first visit"
```

---

## Task 3: The `notify()` helper

**Files:**
- Create: `src/state/notify.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- `src/state/notify.ts`:

```typescript
export type NotifyTone = 'reward' | 'info' | 'warn';

export interface NotifyMessage {
  id: number;
  text: string;
  tone: NotifyTone;
}

export interface NotifyOptions {
  text: string;
  tone?: NotifyTone;   // default 'info'
  speak?: boolean;     // default true — speak via soundManager.speakGujaratiTextFallback
  ttlMs?: number;      // default 6000
}
```

- `App.tsx` produces a `notify(opts: NotifyOptions): void` bound in the component that: sets a single `notice: NotifyMessage | null` state, plays the tone sound (`reward` → `playChime`, `warn` → `playHorn(1)`, `info` → none), optionally speaks, and auto-clears after `ttlMs` (clearing a prior timer first).

Background: `App.tsx` has ~9 scattered `setFloatingBanner(...)` + ad-hoc `soundManager.*` pairs (`triggerLandmarkWelcome`, `handleAcceptMission`, `handleCancelMission`, `handleBuySouvenir`, `handleQuizCorrect`, `handleRefuel`, `handleRepair`, the achievement effect, `checkMissionCompletion`). One helper makes every reward feel consistent and removes the manual `setTimeout` in `triggerLandmarkWelcome`.

- [ ] **Step 1: Write `src/state/notify.ts`**

Types above, plus:

```typescript
export function toneSound(tone: NotifyTone): 'chime' | 'horn' | null {
  return tone === 'reward' ? 'chime' : tone === 'warn' ? 'horn' : null;
}
```

- [ ] **Step 2: Add `notify` to `App.tsx`**

```typescript
const [notice, setNotice] = useState<NotifyMessage | null>(null);
const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const noticeSeq = useRef(0);

const notify = ({ text, tone = 'info', speak = true, ttlMs = 6000 }: NotifyOptions) => {
  noticeSeq.current += 1;
  setNotice({ id: noticeSeq.current, text, tone });
  const s = toneSound(tone);
  if (s === 'chime') soundManager.playChime();
  else if (s === 'horn') soundManager.playHorn(1);
  if (speak) soundManager.speakGujaratiTextFallback(text);
  if (noticeTimer.current) clearTimeout(noticeTimer.current);
  noticeTimer.current = setTimeout(() => setNotice(null), ttlMs);
};

useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);
```

- [ ] **Step 3: Replace every `setFloatingBanner` + paired sound**

Sweep all call sites. Examples:
- `triggerLandmarkWelcome`: `notify({ text: welcomeSpeech, tone: 'info' })` — drop the manual `setTimeout`/`setFloatingBanner(null)` and the separate `speakGujaratiTextFallback` (notify speaks).
- achievement effect: `notify({ text: \`🏅 નવું અચીવમેન્ટ અનલૉક! (${added.length})\`, tone: 'reward', speak: false })` — keep `soundManager.playAchievementSound()` (distinct from chime) OR switch to `tone: 'reward'` and accept chime; **keep `playAchievementSound` and pass `speak:false`, do not double the sound** — set `tone: 'info'` and call `playAchievementSound()` explicitly right before `notify`.
- `handleAcceptMission` / `checkMissionCompletion` / `handleBuySouvenir` / `handleQuizCorrect` / `handleRefuel` / `handleRepair` / `handleCancelMission`: convert to a single `notify({...})`, removing the now-redundant `soundManager.playChime()` in `handleBuySouvenir` (fixes the M0 deferred double-chime) and `soundManager.speakGujaratiTextFallback` duplicates.
- Delete the `floatingBanner` state and its JSX block; render `notice` instead (Step 4).
- `lastKakaNarration` / `onNewKakaReply` stay — that's Kaka chat state, separate concern.

- [ ] **Step 4: Render the notice**

Replace the `{isGameStarted && floatingBanner && (...)}` block with a `notice`-driven banner: same position (`top-20 left-1/2`), tone-colored border (`reward` amber, `info` slate, `warn` rose), the 👳🏽‍♂️ icon, `notice.text`, and the "કાકા બોલો" button. Key it by `notice.id` so re-notifies re-trigger the entry animation.

- [ ] **Step 5: Gates + manual check**

`bun run lint` 0 / `bun run build` 0 / `bun run test` green. `bun run dev` → buy a souvenir (one chime, not two), answer a quiz, complete a mission — each shows one consistent banner + one sound.

- [ ] **Step 6: Commit**

```bash
git add src/state/notify.ts src/App.tsx
git commit -m "refactor: unify reward feedback through a single notify() helper"
```

---

## Task 4: Landmark-approach prompt in the HUD

**Files:**
- Modify: `src/components/HUD.tsx`, `src/App.tsx`

**Interfaces:**
- `HUDProps` already has `nearbyLandmark: LocationData | null` and `onInspectLandmark: (loc: LocationData) => void` — both currently destructured but unused. This task renders them.

Background: `App.tsx` already sets `nearbyLandmark` from `world.onLandmarkApproach` and has an `e`-key handler that opens the inspect modal. There is no on-screen affordance telling the player either exists.

- [ ] **Step 1: Render the prompt in `HUD.tsx`**

In the middle-alerts area (near the `nearbyFacility` prompt), add: when `nearbyLandmark` is set AND `nearbyLandmark.id !== currentLocation.id` is not required (show for the current zone too), render a pill —
- desktop: `⛳ <nearbyLandmark.nameGujarati> — **E** દબાવો · વધુ જાણો`
- the whole pill is a `<button onClick={() => onInspectLandmark(nearbyLandmark)}>` (works for touch); `pointer-events-auto`.
- Style consistent with the facility prompt (slate bg, amber border), but visually lighter so it doesn't compete with the facility CTA.
- If `visitedLocations.includes(nearbyLandmark.id)` show a small ✓ and swap copy to `વિગતો જુઓ`.

Add `visitedLocations: string[]` to `HUDProps` (App already has it) so the ✓ state works.

- [ ] **Step 2: Wire `visitedLocations` in `App.tsx`**

Add `visitedLocations={visitedLocations}` to the `<HUD .../>` render.

- [ ] **Step 3: Remove dead code**

Delete the unused `distCapActive` function at the bottom of `HUD.tsx`.

- [ ] **Step 4: Gates + manual check**

`bun run lint` 0 / `bun run build` 0 / `bun run test` green. `bun run dev` → drive toward Dwarka; within ~95 m the prompt appears; clicking it (or pressing E) opens the inspect modal; after logging the visit the prompt shows ✓ / "વિગતો જુઓ".

- [ ] **Step 5: Commit**

```bash
git add src/components/HUD.tsx src/App.tsx
git commit -m "feat: on-screen landmark-approach prompt in the HUD"
```

---

## Task 5: LandmarkInspectModal → the History Card

**Files:**
- Modify: `src/components/LandmarkInspectModal.tsx`, `src/data/locations.ts`, `src/types.ts`

**Interfaces:**
- `LocationData` gains `passportStory?: string;` (one reliable sentence, used on the stamp and in the card once visited).
- `LandmarkInspectModalProps` gains `stampRecord?: PassportStampRecord;` (from `App`'s `stampMeta[location.id]`).

Background: the current modal's primary button is "પોસ્ટકાર્ડ ફોટો લો & પાસપોર્ટ સ્ટેમ્પ કરો!" which fires confetti + `playAchievementSound` + `speakGujaratiTextFallback` directly. M1 makes this a tight, honest fact card whose primary action is logging the visit (which now records a stamp via `recordVisit`), with "ask Kaka" as the secondary, and photo mode left to the HUD camera button.

- [ ] **Step 1: Add `passportStory` to the 16 locations**

`src/data/locations.ts`: add a `passportStory: '<one factual sentence>'` to each `GUJARAT_LOCATIONS` entry. Keep them short, verifiable, Gujarati. (Reuse the first sentence of `history` if a distinct line isn't warranted — but prefer a purpose-written "why this place matters" line.)

- [ ] **Step 2: Restructure the modal**

- Header unchanged.
- Body: tagline → `history` (labelled "ઇતિહાસ & મહત્વ") → `culturalHighlights` chips → `famousFood` row. When `isVisited`, add a green "તમારો સ્ટેમ્પ" block showing `stampRecord.visitedAt` (formatted `DD/MM/YYYY`) + `stampRecord.kilometersDriven.toFixed(1)} km` + `location.passportStory`.
- Footer, two buttons:
  - Primary (amber): if `!isVisited` → `✓ મુલાકાત નોંધો` → `onMarkVisited(location.id); onClose();`. If `isVisited` → disabled/hidden, replaced by a "✓ પાસપોર્ટમાં નોંધાયેલ" static chip.
  - Secondary (slate): `👳🏽‍♂️ કાનજી કાકાને પૂછો` → `onOpenKaka()`.
- **Remove** the confetti + `playAchievementSound` + `speakGujaratiTextFallback` from this component. The reward feedback now comes from `App`'s `recordVisit` → `notify`. (Keeping confetti is fine as a visual flourish *only if* it's silent and not tied to the sound; simplest is to drop it.)
- Keep the "ઓડિયો ગાઈડ સાંભળો" voice button — but route it through a new prop `onPlayVoiceGuide?: () => void` that `App` implements via `notify({ text: \`${location.nameGujarati}: ${location.history}\`, tone: 'info' })`, OR keep the local `speakGujaratiTextFallback` call (acceptable — it's a deliberate user action, not an automatic side effect). Pick the local call to keep the prop surface small; note the choice.

- [ ] **Step 3: Wire `App.tsx`**

Pass `stampRecord={stampMeta[inspectingLandmark.id]}` to `<LandmarkInspectModal>`.

- [ ] **Step 4: Gates + manual check**

`bun run lint` 0 / `bun run build` 0 / `bun run test` green. `bun run dev` → open the card for an unvisited place → "મુલાકાત નોંધો" logs it (via App: +₹100, chime, banner, stamp) → reopen → card shows the stamp block with date/km/story and no primary button.

- [ ] **Step 5: Commit**

```bash
git add src/components/LandmarkInspectModal.tsx src/data/locations.ts src/types.ts
git commit -m "feat: turn the landmark modal into a History Card with stamp details"
```

---

## Task 6: PassportModal → real stamp spread

**Files:**
- Modify: `src/components/PassportModal.tsx`, `src/App.tsx`
- Create: `src/state/exploration.ts`, `src/state/exploration.test.ts`

**Interfaces:**
- `src/state/exploration.ts`:

```typescript
import { LocationData } from '../types';

export interface RegionTally { region: string; regionNameGujarati: string; visited: number; total: number; }

/** Per-region visited/total counts, in a stable order. Pure. */
export function regionTally(locations: LocationData[], visitedIds: string[]): RegionTally[];

/** { visited, total, pct } for the whole map. Pure. */
export function passportProgress(locations: LocationData[], visitedIds: string[]): { visited: number; total: number; pct: number };
```

- `PassportModalProps` gains `stampMeta: Record<string, PassportStampRecord>;`

- [ ] **Step 1: Write `src/state/exploration.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { regionTally, passportProgress } from './exploration';
import { GUJARAT_LOCATIONS } from '../data/locations';

describe('passportProgress', () => {
  it('is 0/16 · 0% for no visits', () => {
    expect(passportProgress(GUJARAT_LOCATIONS, [])).toEqual({ visited: 0, total: 16, pct: 0 });
  });
  it('rounds pct', () => {
    const three = GUJARAT_LOCATIONS.slice(0, 3).map((l) => l.id);
    expect(passportProgress(GUJARAT_LOCATIONS, three)).toEqual({ visited: 3, total: 16, pct: 19 });
  });
  it('ignores ids not in the location list', () => {
    expect(passportProgress(GUJARAT_LOCATIONS, ['not_a_place']).visited).toBe(0);
  });
});

describe('regionTally', () => {
  it('covers every region and sums to the location count', () => {
    const t = regionTally(GUJARAT_LOCATIONS, ['rajkot']);
    expect(t.reduce((n, r) => n + r.total, 0)).toBe(GUJARAT_LOCATIONS.length);
    const saur = t.find((r) => r.region === 'saurashtra');
    expect(saur?.visited).toBe(1);
  });
});
```

- [ ] **Step 2: Run — confirm failure. Then implement `src/state/exploration.ts`.**

`passportProgress`: `visited` = count of `locations` whose `id ∈ visitedIds`; `pct = Math.round(visited / total * 100)`.
`regionTally`: group `locations` by `region`, count visited per group, carry `regionNameGujarati` from the first member, return in first-seen order.

- [ ] **Step 3: Run — confirm pass.**

- [ ] **Step 4: Rebuild the stamp grid in `PassportModal.tsx`**

- Progress bar row: `passportProgress(GUJARAT_LOCATIONS, visitedLocations)` → "ગુજરાત ભ્રમણ: {visited} / {total} · {pct}%" with a filled bar.
- Region tallies row: `regionTally(...)` → chips "સૌરાષ્ટ્ર ૪/૬" etc.
- Stamp grid (16 cells): visited → `loc.icon` in a stamp frame + `stampMeta[loc.id]` date (`DD/MM/YY`) + `{km} km` + `loc.passportStory` (truncated 2 lines); unvisited → silhouette (greyed icon at low opacity) + "?".
- Keep the achievements section and the reset footer from M0 unchanged.
- Replace `totalDistanceKm` prop usage where it duplicates the progress row (keep the "કુલ સફર (KM)" stat — it's the live odometer).

- [ ] **Step 5: Wire `App.tsx`**

Pass `stampMeta={stampMeta}` to `<PassportModal>`.

- [ ] **Step 6: Gates + manual check + commit**

`bun run lint` 0 / `bun run build` 0 / `bun run test` green (adds ~5 tests). `bun run dev` → visit 2–3 places → passport shows their stamps with real dates/km/stories, progress bar + region tallies update, unvisited slots are silhouettes.

```bash
git add src/components/PassportModal.tsx src/App.tsx src/state/exploration.ts src/state/exploration.test.ts
git commit -m "feat: passport stamp spread with dates, stories, and region progress"
```

---

## Task 7: Navigation math + GameWorld position callback

**Files:**
- Create: `src/state/navigation.ts`, `src/state/navigation.test.ts`
- Modify: `src/world/GameWorld.ts`, `src/types.ts`

**Interfaces:**
- `src/types.ts`: `export interface NavTarget { locationId: string; }` (kept minimal — the route is derived, not stored).
- `src/state/navigation.ts`:

```typescript
export interface Vec2 { x: number; z: number; }

/** Great-simple planar distance in metres (world units are metres). */
export function distanceMeters(a: Vec2, b: Vec2): number;

/** Compass-style bearing in degrees [0,360): 0 = -z (north/forward), 90 = +x (east). */
export function bearingDeg(from: Vec2, to: Vec2): number;

/** Signed heading-relative angle in degrees (-180,180]: how far to turn from headingRad to face `to`. */
export function relativeHeadingDeg(from: Vec2, headingRad: number, to: Vec2): number;

export interface NavState {
  distanceM: number;
  relativeDeg: number;   // for the arrow
  arrived: boolean;      // distanceM <= arriveRadiusM
}
export function navState(from: Vec2, headingRad: number, to: Vec2, arriveRadiusM: number): NavState;
```

- `GameWorld` gains `public onVehicleMove?: (x: number, z: number, headingRad: number) => void;` called in `updatePhysics` right after `this.onSpeedUpdate?.(...)` is invoked (same cadence, once per frame).

Background: the world is open ground — `worldPosition` units are metres, heading is `vehicleRotation` in radians where forward is `(-sin, -cos)` (see `GameWorld.updateCamera`). No pathfinding: nav is a straight line to the target zone centre.

- [ ] **Step 1: Write `src/state/navigation.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { distanceMeters, bearingDeg, relativeHeadingDeg, navState } from './navigation';

describe('navigation', () => {
  it('distance is planar euclidean', () => {
    expect(distanceMeters({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5);
  });
  it('bearing: due north (-z) is 0, east (+x) is 90', () => {
    expect(bearingDeg({ x: 0, z: 0 }, { x: 0, z: -10 })).toBe(0);
    expect(bearingDeg({ x: 0, z: 0 }, { x: 10, z: 0 })).toBe(90);
    expect(bearingDeg({ x: 0, z: 0 }, { x: 0, z: 10 })).toBe(180);
  });
  it('relative heading: facing the target is ~0, target behind is ~180', () => {
    // heading 0 rad => forward is -z. Target at -z => straight ahead.
    expect(Math.abs(relativeHeadingDeg({ x: 0, z: 0 }, 0, { x: 0, z: -10 }))).toBeLessThan(1);
    expect(Math.abs(relativeHeadingDeg({ x: 0, z: 0 }, 0, { x: 0, z: 10 }))).toBeCloseTo(180, 0);
  });
  it('navState.arrived flips inside the radius', () => {
    expect(navState({ x: 0, z: 0 }, 0, { x: 0, z: 5 }, 10).arrived).toBe(true);
    expect(navState({ x: 0, z: 0 }, 0, { x: 0, z: 50 }, 10).arrived).toBe(false);
  });
});
```

- [ ] **Step 2: Run — confirm failure. Implement `src/state/navigation.ts`.**

`bearingDeg`: `((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360` where `dx = to.x - from.x`, `dz = to.z - from.z`.
`relativeHeadingDeg`: vehicle heading as a compass bearing is `(headingRad * 180/Math.PI ...)` — derive so that `headingRad = 0` ⇒ forward `-z` ⇒ bearing `0`; then `rel = normalize180(bearingDeg(from,to) - headingBearing)`.
`navState`: `{ distanceM: distanceMeters(from,to), relativeDeg: relativeHeadingDeg(from,headingRad,to), arrived: distanceMeters(from,to) <= arriveRadiusM }`.

- [ ] **Step 3: Run — confirm pass.**

- [ ] **Step 4: Add `onVehicleMove` to `GameWorld.ts`**

Declare the public field near the other `on*` callbacks. In `updatePhysics`, immediately after the `if (this.onSpeedUpdate) { ... this.onSpeedUpdate(...) }` block, add:

```typescript
this.onVehicleMove?.(this.vehiclePos.x, this.vehiclePos.z, this.vehicleRotation);
```

No other `GameWorld` change.

- [ ] **Step 5: Gates + commit**

`bun run lint` 0 / `bun run build` 0 / `bun run test` green (adds ~4 tests).

```bash
git add src/state/navigation.ts src/state/navigation.test.ts src/world/GameWorld.ts src/types.ts
git commit -m "feat: pure navigation math + GameWorld vehicle-move callback"
```

---

## Task 8: MiniMap HUD component

**Files:**
- Create: `src/components/MiniMap.tsx`
- Modify: `src/components/HUD.tsx`, `src/App.tsx`

**Interfaces:**
- `MiniMapProps`:

```typescript
interface MiniMapProps {
  worldRef: React.RefObject<GameWorld | null>;
  locations: LocationData[];
  visitedLocations: string[];
  currentLocationId: string;
  navTargetId: string | null;
  activeMission: MissionData | null;
}
```

The component self-animates with its own `requestAnimationFrame` loop reading `worldRef.current.vehiclePos` / `.vehicleRotation` — it does NOT take player position as a prop (keeps per-frame updates off React's render path).

Background: `GujaratMapModal` is list-only; there's no at-a-glance spatial map. Projection: map each `loc.mapPosition ?? loc.worldPosition` `{x,z}` into an SVG viewBox by computing the bounding box of all 16 points once (with padding) and scaling to a ~200×200 box.

- [ ] **Step 1: Create `src/components/MiniMap.tsx`**

- Fixed size ~180×180, bottom-left, `pointer-events-none` except a small expand affordance (optional — skip for M1).
- Compute the projection transform once via `useMemo` over `locations`.
- 16 location dots: visited = amber filled, unvisited = hollow slate, current = ring, nav target = pulsing, mission pickup/drop (from `activeMission.pickupLocationId` / `.dropLocationId`) = small pin glyphs.
- Player: a triangle at the projected `vehiclePos`, rotated by `vehicleRotation` (screen rotation = `-vehicleRotation` in degrees + offset so the tip points where forward `-z` is up).
- Facilities: the 6 hard-coded facility coordinates from `GameWorld.checkFacilityProximity` are private; **do not** duplicate them — skip facility markers on the minimap for M1 (they show as the in-world prompt already). Note this in the component.
- rAF loop in `useEffect`, cancelled on unmount; guard `worldRef.current` null.

- [ ] **Step 2: Render in `HUD.tsx`**

Add a `<MiniMap .../>` slot bottom-left, coexisting with the existing `<InCarRadio />` (radio can shift up, or the minimap sits above it). Pass through the new props from `HUDProps` (add them: `worldRef`, `navTargetId`, plus reuse `activeMission`, `currentLocation`, `visitedLocations`).

- [ ] **Step 3: Wire `App.tsx`**

Pass `worldRef={worldRef}` and `navTargetId={navTarget?.locationId ?? null}` (nav state lands in Task 10 — until then pass `null`) to `<HUD>`.

- [ ] **Step 4: Gates + manual check**

`bun run lint` 0 / `bun run build` 0 / `bun run test` green. `bun run dev` → minimap shows 16 dots, player triangle moves and rotates as you drive, visited dots are filled.

- [ ] **Step 5: Commit**

```bash
git add src/components/MiniMap.tsx src/components/HUD.tsx src/App.tsx
git commit -m "feat: bottom-left minimap with player heading and visited markers"
```

---

## Task 9: GujaratMapModal — spatial view + visited-gated fast travel + set-destination

**Files:**
- Modify: `src/components/GujaratMapModal.tsx`, `src/App.tsx`, `src/data/locations.ts` (mapPosition tuning only if needed)

**Interfaces:**
- `GujaratMapModalProps` gains: `onSetDestination: (loc: LocationData) => void;` (App: sets the nav target, does NOT teleport). `onFastTravel` stays but App gates it.

Background: today `onFastTravel` teleports to any location regardless of visited state. Spec §5.3: fast-travel only to visited; unvisited get a "drive there" nav option instead. The region filter ids (`saurashtra / kutch / central_gujarat / north_gujarat / south_gujarat`) already match `locations.ts` — no fix needed, just confirm.

- [ ] **Step 1: Add a spatial panel**

Beside the existing list/detail view, add an SVG map using the same `mapPosition ?? worldPosition` projection as the MiniMap (extract the projection helper into a tiny shared module `src/components/mapProjection.ts` — `projectPoints(locations, size) => { project: (p) => [x,y], viewBox }` — and use it in both `MiniMap` and here). Markers: visited (amber), unvisited (grey), current ("અહીં"), selected (ring). Clicking a marker selects it (same as clicking the list row).

- [ ] **Step 2: Gate fast travel; add set-destination**

In the detail pane's action area:
- If `visitedLocations.includes(activeLoc.id)` OR `activeLoc.id === 'rajkot'` → show "છકડો {name} લઈ જાઓ (ફાસ્ટ ટ્રાવેલ)" → `onFastTravel(activeLoc); onClose();`
- Else → show a disabled "ફાસ્ટ ટ્રાવેલ — પહેલા જાતે પહોંચો" AND an enabled "🧭 માર્ગ બતાવો ({name} તરફ)" → `onSetDestination(activeLoc); onClose();`

- [ ] **Step 3: Wire `App.tsx`**

`handleFastTravel` unchanged. Add `handleSetDestination(loc)` (Task 10 fills the body; for now `setNavTarget({ locationId: loc.id })`). Pass both to `<GujaratMapModal>`.

- [ ] **Step 4: mapPosition tuning**

Run the app, open the full map. If any two markers overlap or hug an edge, add a `mapPosition: { x, y }` to those `locations.ts` entries (a hand-placed 2D coordinate in the same arbitrary units as `worldPosition`) until the layout reads clearly. Document which locations got an override.

- [ ] **Step 5: Gates + manual check + commit**

`bun run lint` 0 / `bun run build` 0 / `bun run test` green. `bun run dev` → open map → spatial panel renders, unvisited places can't be fast-traveled (button disabled, "માર્ગ બતાવો" offered instead), visited places still teleport.

```bash
git add src/components/GujaratMapModal.tsx src/components/mapProjection.ts src/components/MiniMap.tsx src/App.tsx src/data/locations.ts
git commit -m "feat: spatial map panel, visited-gated fast travel, set-destination"
```

---

## Task 10: Turn-by-turn nav banner + Gujarati voice cues

**Files:**
- Create: `src/components/NavBanner.tsx`
- Modify: `src/App.tsx`, `src/components/HUD.tsx`

**Interfaces:**
- `App.tsx` state: `const [navTarget, setNavTarget] = useState<NavTarget | null>(null);` and a live `const [navLive, setNavLive] = useState<NavState | null>(null);` updated from `world.onVehicleMove` (throttled to ~4/s).
- `NavBannerProps`: `{ targetName: string; distanceM: number; relativeDeg: number; onCancel: () => void; }`

Background: a mission being active OR the player choosing "માર્ગ બતાવો" sets a nav target. The banner shows distance + a big arrow rotated by `relativeDeg`. Kaka speaks cues at set / ~50% / ~90% / arrival (debounced, never overlapping).

- [ ] **Step 1: `NavBanner.tsx`**

Top-centre, below the notice banner. Big SVG arrow `rotate(relativeDeg)`, `Math.round(distanceM)` m (or `{(m/1000).toFixed(1)} km` above 1000), target name, an "✕ રદ" cancel. `pointer-events-auto` on the cancel only.

- [ ] **Step 2: Nav state in `App.tsx`**

- On mission accept (`handleAcceptMission`): `setNavTarget({ locationId: mission.dropLocationId })`.
- On `handleSetDestination(loc)`: `setNavTarget({ locationId: loc.id })` + `notify({ text: \`${loc.nameGujarati} તરફ ચાલો — માર્ગ બતાવું છું\`, tone: 'info' })`.
- On mission complete / cancel / manual cancel: `setNavTarget(null)`.
- `world.onVehicleMove = (x, z, heading) => { ...throttle... }`: if `navTarget`, look up the target `LocationData`, compute `navState({x,z}, heading, target.worldPosition (or mapPosition? use worldPosition — nav is in world space), target.zoneRadius)`, `setNavLive(ns)`. Register this callback in the same `useEffect([isGameStarted])` block; **read `navTarget` via a ref** (`navTargetRef.current`) to avoid the stale-closure trap that the world callbacks have (see M0 known issue).
- Voice cues: track `cuesSpoken` in a ref `{ start, half, near }`. When `navLive` crosses thresholds (first tick → start; `distanceM < startDist*0.5` → half; `distanceM < target.zoneRadius*1.8` → near), call `soundManager.speakGujaratiTextFallback(...)` once each. On `navLive.arrived` → `notify({ text: \`પહોંચી ગયા! ${target.nameGujarati}\`, tone: 'reward' })` and `setNavTarget(null)`.

- [ ] **Step 3: Render**

`{isGameStarted && navTarget && navLive && <NavBanner .../>}`. Pass `navTargetId` to `<HUD>`/`<MiniMap>` for real now.

- [ ] **Step 4: Gates + manual check**

`bun run lint` 0 / `bun run build` 0 / `bun run test` green. `bun run dev` → accept a mission → arrow + distance appear and update as you drive; Kaka speaks a start cue, a midway cue, an arrival cue; arriving clears the banner and (if a mission) completes it. "માર્ગ બતાવો" from the map does the same without a mission.

- [ ] **Step 5: Commit**

```bash
git add src/components/NavBanner.tsx src/App.tsx src/components/HUD.tsx
git commit -m "feat: Gujarati turn-by-turn nav banner with voice cues"
```

---

## Task 11: StartScreen resume vs new trip + seed totalKm

**Files:**
- Modify: `src/components/StartScreen.tsx`, `src/App.tsx`

**Interfaces:**
- `StartScreenProps` gains: `hasSave: boolean; lastLocationName: string | null; onResume: () => void;`

Background: M0 seeds `currentLocation` from `initial.lastLocationId` but `handleStartGame` immediately overwrites it, and `totalKm` state starts at `0` even though the save has it (M0 deferred minor). M1 fixes both and gives a real resume path.

- [ ] **Step 1: Seed `totalKm`**

`App.tsx`: `const [totalKm, setTotalKm] = useState(initial.totalKm);`. Note: `world.onSpeedUpdate` sets `totalKm` from `world.totalDistanceDriven / 1000` which starts at 0 each session — so on resume the odometer would snap back to 0 on the first frame. Fix: in `GameWorld`, accept an optional constructor arg `initialDistanceMeters = 0` and set `this.totalDistanceDriven = initialDistanceMeters`. `App` passes `initial.totalKm * 1000`. (This is a permitted minimal `GameWorld` edit — one constructor param + one assignment.)

- [ ] **Step 2: StartScreen two-path**

`hasSave` = `initial.visitedLocations.length > 1 || initial.totalKm > 0 || initial.coins !== 1200`. When true, show:
- "▶ સફર ચાલુ રાખો" (primary) → `onResume()` — `App` calls `handleStartGame(GUJARAT_LOCATIONS.find(l => l.id === initial.lastLocationId) ?? GUJARAT_LOCATIONS[0])` but WITHOUT re-awarding the first-visit stamp (it's already visited, `recordVisit` no-ops — fine) and with a "ફરી સ્વાગત છે" notify instead of the "ઉપડ્યો" one.
- "✦ નવી સફર" (secondary) → the existing location-picker flow.
When `hasSave` is false, just the picker as today.

- [ ] **Step 3: Wire `App.tsx`**

Compute `hasSave` / `lastLocationName` from `initial`; pass with `onResume`.

- [ ] **Step 4: Gates + manual check + commit**

`bun run lint` 0 / `bun run build` 0 / `bun run test` green. `bun run dev` → play, earn km + coins, refresh → StartScreen offers Resume showing the last location; resuming keeps the odometer and drops you at the last place.

```bash
git add src/components/StartScreen.tsx src/App.tsx src/world/GameWorld.ts
git commit -m "feat: resume-or-new start screen; persist and restore odometer"
```

---

## Task 12: Idle nudge toward the next place

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/state/exploration.ts`, `src/state/exploration.test.ts` (add `nearestUnvisited`)

**Interfaces:**
- `src/state/exploration.ts` adds:

```typescript
/** The unvisited location closest to `from` by planar distance, or null if all visited. Pure. */
export function nearestUnvisited(locations: LocationData[], visitedIds: string[], from: { x: number; z: number }): LocationData | null;
```

- [ ] **Step 1: Test + implement `nearestUnvisited`**

```typescript
it('nearestUnvisited returns the closest not-yet-visited location', () => {
  const from = GUJARAT_LOCATIONS[0].worldPosition;
  const visited = [GUJARAT_LOCATIONS[0].id];
  const n = nearestUnvisited(GUJARAT_LOCATIONS, visited, from);
  expect(n).not.toBeNull();
  expect(visited).not.toContain(n!.id);
});
it('nearestUnvisited is null when everything is visited', () => {
  expect(nearestUnvisited(GUJARAT_LOCATIONS, GUJARAT_LOCATIONS.map((l) => l.id), { x: 0, z: 0 })).toBeNull();
});
```

Implement: filter unvisited, min by `distanceMeters(from, loc.worldPosition)` (import from `navigation.ts`).

- [ ] **Step 2: Idle-nudge effect in `App.tsx`**

- Track `lastNudgeAt` in a ref and a `nudgedZones` `Set` ref (nudge per zone at most once per session).
- An effect keyed on `[speed, currentLocation, visitedLocations]`: if `speed < 1` for a sustained window (~8 s — use a `setTimeout` set when speed drops, cleared when it rises), and `visitedLocations.includes(currentLocation.id)`, and `!nudgedZones.current.has(currentLocation.id)`, and `nearestUnvisited(...)` from the world's current `vehiclePos` returns a place → `notify({ text: \`અહીંથી ${n.nameGujarati} નજીક છે — ત્યાં ફરવા જઈએ?\`, tone: 'info' })`, mark the zone nudged.
- Use `worldRef.current?.vehiclePos` for `from`; fall back to `currentLocation.worldPosition`.

- [ ] **Step 3: Gates + manual check + commit**

`bun run lint` 0 / `bun run build` 0 / `bun run test` green (adds ~2 tests). `bun run dev` → park inside a visited zone for ~8 s → one Kaka nudge naming the nearest unvisited place; it doesn't repeat for that zone.

```bash
git add src/App.tsx src/state/exploration.ts src/state/exploration.test.ts
git commit -m "feat: idle nudge toward the nearest unvisited place"
```

---

## Task 13: M1 playtest checklist + full run

**Files:**
- Create: `docs/superpowers/playtests/m1-playtest.md`

- [ ] **Step 1: Write the checklist**

```markdown
# M1 Playtest Checklist

Run `bun run dev`, open http://localhost:3000. Use a fresh save (passport → reset) for the first pass.

## Core loop
- [ ] New game: pick a start location; no "Resume" shown on a fresh save
- [ ] Drive toward a landmark → HUD shows the approach prompt (name + "E દબાવો")
- [ ] Press E / tap the prompt → History Card opens with history, highlights, food
- [ ] "મુલાકાત નોંધો" → +₹100, chime, one banner, card now shows the stamp (date + km + story)
- [ ] Re-open the card → no primary button, stamp block present
- [ ] Passport (P): progress bar + "n/16 · pct%", region tallies, the new stamps show date/km/story, unvisited slots are silhouettes

## Map & fast travel
- [ ] Map (M): spatial panel renders all 16, player-current marked, visited vs grey
- [ ] Unvisited place: fast-travel disabled, "🧭 માર્ગ બતાવો" offered
- [ ] Visited place: fast-travel still teleports
- [ ] "માર્ગ બતાવો" → map closes, nav banner appears

## Navigation
- [ ] Nav banner: distance counts down, arrow rotates toward the target as you turn
- [ ] Kaka speaks a start cue, a midway cue, an arrival cue (no overlap / spam)
- [ ] Arriving within the zone clears the banner
- [ ] Accepting a mission auto-sets nav to the drop location; completing it clears nav + pays out

## Minimap
- [ ] Bottom-left minimap: 16 dots, player triangle moves + rotates, visited dots filled, nav target highlighted

## Cohesion
- [ ] Every reward (stamp / souvenir / quiz / mission / achievement) uses the same banner style and one sound (no double chime on souvenir buy)
- [ ] Park in a visited zone ~8 s → one Kaka nudge naming the nearest unvisited place; no repeat for that zone
- [ ] Refresh mid-session → StartScreen offers "Resume" showing the last place; resuming keeps coins, stamps, odometer, and drops you there
- [ ] Browser console: no red errors through all of the above

## Regression (M0 still holds)
- [ ] Refuel / repair / photo mode / souvenir shop / quiz / mission accept all still work
- [ ] `bun run lint` 0, `bun run test` green, `bun run build` 0
```

- [ ] **Step 2: Run the full checklist in the browser.** Every box must pass. A failure = an earlier task regressed → STOP, report which box and why (do not fix inline).

- [ ] **Step 3: Final gate**

`bun run lint` 0 / `bun run build` 0 / `bun run test` all green.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/playtests/m1-playtest.md
git commit -m "docs: M1 playtest checklist"
```

---

## Self-Review

**Spec coverage (§5 of the design doc):**

| Spec item | Task |
|---|---|
| §5.1 landmark approach prompt (uses unused HUD props) | Task 4 |
| §5.1 History Card + "ask Kaka" + log-visit awards stamp | Task 5 (+ Task 2 for the award) |
| §5.1 first-visit stamp + coins + chime, once | Task 2 |
| §5.2 passport spread: date, km, story, silhouettes | Task 6 |
| §5.2 progress header + per-region tallies | Task 6 |
| §5.2 `stampMeta` record + schema bump | Task 1 |
| §5.3 MiniMap HUD component | Task 8 |
| §5.3 GujaratMapModal spatial panel | Task 9 |
| §5.3 fast-travel gated to visited (rajkot always) | Task 9 |
| §5.3 region-filter ids | Task 9 Step (confirm — already correct) |
| §5.3 `mapPosition` override | Task 9 Step 4 (+ type in Task 5/7) |
| §5.4 route model, no pathfinding | Task 7 |
| §5.4 nav banner: distance + heading-relative arrow | Task 10 |
| §5.4 Kaka voice cues at set/50%/90%/arrival, debounced | Task 10 |
| §5.4 "set destination" from map (no teleport) | Task 9 + Task 10 |
| §5.4 arrival within `zoneRadius` → mission-complete path | Task 10 (reuses M0 `checkMissionCompletion`) |
| §5.5 StartScreen resume vs new | Task 11 |
| §5.5 idle nudge toward unvisited neighbour | Task 12 |
| §5.5 one `notify()` helper replacing scattered banner+sound | Task 3 |
| M0 deferred: seed `totalKm` from save | Task 11 |
| M0 deferred: souvenir double-chime | Task 3 Step 3 |

**Placeholder scan:** Tasks 2/4/5/6/8/9/10/11/12 are UI-integration tasks with precise interface specs but not always full JSX — this is deliberate for view code that must match existing Tailwind/layout conventions in each file; every task names the exact props, state, call sites, and copy. Pure-logic tasks (1, 3, 7, 12) carry full code. No "TBD" / "handle edge cases" / "similar to Task N".

**Type consistency:** `PassportStampRecord` (Task 1) is consumed unchanged in Tasks 2, 5, 6. `NavTarget` (Task 7) / `NavState` (Task 7) consumed in Tasks 8, 10. `NotifyOptions` (Task 3) consumed in Tasks 2, 5, 10, 12. `nearestUnvisited` / `regionTally` / `passportProgress` signatures stable between `exploration.ts` and its test and `App`/`PassportModal`. The `mapProjection.ts` helper (Task 9) is shared by `MiniMap` (Task 8 creates MiniMap; Task 9 extracts the helper and updates MiniMap to use it — Task 9's commit list includes `MiniMap.tsx`).

**Ordering note:** Task 3 (`notify`) is referenced by Task 2. If executed strictly in order, Task 2 writes the `setFloatingBanner` form and Task 3 converts it (Task 3 Step 3 already sweeps all call sites including `recordVisit`). Both tasks' commits are self-consistent.

**Highest-risk area — nav-math sign convention (Task 7).** The vehicle's forward vector is `(-sin(rot), -cos(rot))` (see `GameWorld.updateCamera`), so a vector's compass bearing is `atan2(vx, -vz)` and the heading's bearing works out to `normalize360(-rotDeg)`. Task 7's implementer MUST add a left/right test to `navigation.test.ts` beyond the two cases given (e.g. target directly to the vehicle's right → `relativeHeadingDeg` ≈ +90, to its left → ≈ -90) and pick a documented sign convention for the arrow. The Task 10 playtest ("arrow rotates toward the target as you turn") is the backstop, but a reviewer should verify the sign math against `GameWorld`'s forward-vector definition, not just that tests pass.

---

## Execution Handoff

**Plan complete. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks.

**2. Inline Execution** — executing-plans, batched with checkpoints.

**Which approach?**
