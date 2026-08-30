# M0 — Stabilize & Persist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Chhakaro-Gujarat-game` build clean under TypeScript `strict` + React types, fix every interaction that currently throws at runtime, and persist all player progress across refreshes.

**Architecture:** The app is React 19 + Vite 6 + Three.js (client) with an Express server (`server.ts`) proxying Gemini. `App.tsx` owns all game state; modal components are presentational (data + callbacks in). M0 does not add features — it repairs broken prop contracts, adds missing `SoundManager` methods, introduces a `localStorage` persistence layer under `src/state/`, extracts achievement logic into a testable module, and adds a vitest suite for pure logic.

**Tech Stack:** TypeScript 5.8, React 19.2, Vite 6, Three.js 0.185, Express 4, `@google/genai`, bun (package manager + `tsx` runner), vitest + jsdom (new).

**Spec:** `docs/superpowers/specs/2026-08-30-m0-m1-stabilize-and-tour-loop-design.md` — read it alongside this plan. This plan implements sections §4 (M0) and the §2 current-state findings; M1 (§5) is a separate plan.

## Global Constraints

- **Package manager is `bun`.** Install with `bun add` / `bun add -d`. Run scripts with `bun run <script>`. Never introduce `npm install` / `package-lock.json` / `yarn.lock`.
- **Node scripts run via `tsx`** (see `package.json` `dev`/`lint`). Do not add a separate build step for the server beyond what exists.
- **`bun run lint` (`tsc --noEmit`) must pass clean at the end of every task from Task 6 onward.** Before Task 6 it may carry known errors listed in each task.
- **`bun run build` (`vite build && esbuild server.ts ...`) must pass at the end of every task.** It currently passes (with warnings); keep it passing.
- **`bun run test` (`vitest run`, added in Task 1) must pass at the end of every task that has tests.**
- **All new UI copy is Gujarati-first** (matching the codebase), English in parentheses only where the existing code does so.
- **Do not touch 3D world-building code** (`src/world/EnvironmentBuilder.ts`, `NPCSystem.ts`, `TrafficSystem.ts`, `ChhakaroModel.ts`, `RoadSignBuilder.ts`, `TimeOfDaySystem.ts`) except the single de-dupe in Task 4 and the `preserveDrawingBuffer` flag in Task 9.
- **`localStorage` key:** `chhakaro-gujarat-save-v1`. **Schema version:** `1` (integer).
- **Commit after every task** with `git add <files> && git commit -m "<type>: <summary>"`. Branch is `m0-m1-stabilize-and-tour-loop` (already created).
- Vehicle sim state (fuel, engine temp, puncture) is **never persisted** — always resets to healthy on load.

---

## File Structure

**New files:**

| Path | Responsibility |
|---|---|
| `vitest.config.ts` | Vitest config (jsdom env, `src/**/*.test.ts` include) |
| `src/state/persistence.ts` | `GameSave` type, `loadSave()`, `saveGame()`, `clearSave()`, debounced writer |
| `src/state/persistence.test.ts` | Round-trip, defaults, version-mismatch reset |
| `src/state/achievements.ts` | `evaluateAchievements(progress)` — pure achievement-unlock rules extracted from `App.tsx` |
| `src/state/achievements.test.ts` | Unlock-rule coverage |
| `src/data/dataIntegrity.test.ts` | Every location id referenced across `src/data/*` resolves to a real `GUJARAT_LOCATIONS` id |
| `src/audio/soundManagerApi.test.ts` | Every `soundManager.<method>` used in `src/` exists on the instance |
| `src/smoke.test.ts` | Trivial test proving the vitest pipeline runs (deleted in Task 10 once real tests exist — see task) |
| `README.md` | Run/build/deploy, env vars, architecture map |
| `docs/superpowers/playtests/m0-playtest.md` | Manual browser playtest checklist |

**Modified files:**

| Path | Change |
|---|---|
| `package.json` | Add devDeps (`@types/react`, `@types/react-dom`, `vitest`, `jsdom`); add `test` scripts |
| `tsconfig.json` | Add `"include"`; enable `"strict": true` (Task 12) |
| `src/audio/SoundManager.ts` | Add `playChime()`, `playHorn(count?)` |
| `src/world/EnvironmentBuilder.ts` | Remove the first duplicate `buildRoadsideScenery` (lines ~671–687) |
| `src/world/GameWorld.ts` | `preserveDrawingBuffer: true` on the renderer; expose `get canvas()` |
| `src/types.ts` | Add `PhotoFilterId` union; tighten `VehicleHealthState`; trim `GujaratRegion`; add `GameProgress` |
| `src/components/PhotoModeModal.tsx` | Use `PhotoFilterId`; accept `canvasRef` |
| `src/components/PassengerMissionModal.tsx` | Prop contract aligned with `App.tsx` |
| `src/components/QuizModal.tsx` | (contract already correct — App side changes) |
| `src/components/SouvenirShopModal.tsx` | (contract already correct — App side changes) |
| `src/components/KanjiKakaGuide.tsx` | Replace `alert()` with local state message |
| `src/App.tsx` | Fix imports; rewire 4 modals; use `evaluateAchievements`; init from `loadSave()`; persist on change; pass `canvasRef` |
| `src/data/missions.ts` | `'patn'` → `'patan_modhera'` |
| `src/data/souvenirs.ts` | `'patn'` → `'patan_modhera'` |
| `src/data/quizzes.ts` | `'patn'` → `'patan_modhera'` |
| `server.ts` | Valid Gemini model ids |

---

## Task 1: Test infrastructure (vitest + jsdom) and React type packages

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/smoke.test.ts`

**Interfaces:**
- Produces: `bun run test` command; vitest available for all later tasks.

- [ ] **Step 1: Install dev dependencies**

```bash
bun add -d vitest jsdom @types/react@^19.2 @types/react-dom@^19.2
```

- [ ] **Step 2: Add test scripts to `package.json`**

In `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});
```

- [ ] **Step 4: Create `src/smoke.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';

describe('vitest pipeline', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });

  it('has a DOM (jsdom)', () => {
    expect(typeof window).toBe('object');
    expect(typeof localStorage).toBe('object');
  });
});
```

- [ ] **Step 5: Run the test**

Run: `bun run test`
Expected: PASS, 2 tests in `src/smoke.test.ts`.

- [ ] **Step 6: Confirm build still works**

Run: `bun run build`
Expected: exits 0 (esbuild "Duplicate member buildRoadsideScenery" warning is still present — that is Task 4).

- [ ] **Step 7: Commit**

```bash
git add package.json bun.lock vitest.config.ts src/smoke.test.ts
git commit -m "chore: add vitest + jsdom test setup and React type packages"
```

---

## Task 2: Fix invalid `'patn'` location id + broken `App.tsx` data imports

**Files:**
- Create: `src/data/dataIntegrity.test.ts`
- Modify: `src/data/missions.ts`, `src/data/souvenirs.ts`, `src/data/quizzes.ts`
- Modify: `src/App.tsx:29-30` (imports)

**Interfaces:**
- Consumes: `GUJARAT_LOCATIONS` from `src/data/locations.ts` (each has `id: string`).
- Produces: all `data/*` cross-references resolve to real location ids.

Background: the real id for Patan is `patan_modhera` (see `src/data/locations.ts:205`). The string `'patn'` appears in `missions.ts` (passenger `priya_student.pickupLocationId`, `mission_5_heritage_dholavira.pickupLocationId`), `souvenirs.ts` (`patan_patola.locationId`), and `quizzes.ts` (`quiz_patn_vav.locationId`). `App.tsx:29` imports from `./data/passengers` (nonexistent — data is in `./data/missions`) and `App.tsx:30` imports `GUJARAT_SOUVENIRS` (real name `GUJARATI_SOUVENIRS`); both imported symbols are currently unused.

- [ ] **Step 1: Write the failing integrity test**

Create `src/data/dataIntegrity.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { GUJARAT_LOCATIONS } from './locations';
import { GUJARATI_PASSENGERS, GUJARAT_MISSIONS } from './missions';
import { GUJARATI_QUIZZES } from './quizzes';
import { GUJARATI_SOUVENIRS } from './souvenirs';

const LOCATION_IDS = new Set(GUJARAT_LOCATIONS.map((l) => l.id));

describe('data integrity: every referenced location id exists', () => {
  it('passengers reference real pickup/drop locations', () => {
    for (const p of GUJARATI_PASSENGERS) {
      expect(LOCATION_IDS, `passenger ${p.id} pickup`).toContain(p.pickupLocationId);
      expect(LOCATION_IDS, `passenger ${p.id} drop`).toContain(p.dropLocationId);
    }
  });

  it('missions reference real pickup/drop locations', () => {
    for (const m of GUJARAT_MISSIONS) {
      expect(LOCATION_IDS, `mission ${m.id} pickup`).toContain(m.pickupLocationId);
      expect(LOCATION_IDS, `mission ${m.id} drop`).toContain(m.dropLocationId);
    }
  });

  it('quizzes reference real locations', () => {
    for (const q of GUJARATI_QUIZZES) {
      expect(LOCATION_IDS, `quiz ${q.id}`).toContain(q.locationId);
    }
  });

  it('souvenirs reference real locations', () => {
    for (const s of GUJARATI_SOUVENIRS) {
      expect(LOCATION_IDS, `souvenir ${s.id}`).toContain(s.locationId);
    }
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test src/data/dataIntegrity.test.ts`
Expected: FAIL — quiz `quiz_patn_vav`, souvenir `patan_patola`, passenger `priya_student`, mission `mission_5_heritage_dholavira` all reference `'patn'`.

- [ ] **Step 3: Replace `'patn'` with `'patan_modhera'`**

In `src/data/missions.ts`: change `pickupLocationId: 'patn'` → `pickupLocationId: 'patan_modhera'` (2 occurrences).
In `src/data/souvenirs.ts`: change `locationId: 'patn'` → `locationId: 'patan_modhera'` (1 occurrence, `patan_patola`).
In `src/data/quizzes.ts`: change `locationId: 'patn'` → `locationId: 'patan_modhera'` (1 occurrence, `quiz_patn_vav`). Leave the `id: 'quiz_patn_vav'` string as-is (it is just a key).

- [ ] **Step 4: Fix `App.tsx` imports**

`src/App.tsx` line ~29-30, replace:

```typescript
import { GUJARATI_PASSENGERS, GUJARAT_MISSIONS } from './data/passengers';
import { GUJARAT_SOUVENIRS } from './data/souvenirs';
```

with:

```typescript
import { GUJARAT_MISSIONS } from './data/missions';
import { GUJARATI_SOUVENIRS } from './data/souvenirs';
```

(`GUJARATI_PASSENGERS` is not used in `App.tsx`; `GUJARAT_MISSIONS` and `GUJARATI_SOUVENIRS` will be used in Tasks 6 and 8. Keep both imports — if the executor's editor flags them unused now, that is expected and resolved by Task 6/8.)

- [ ] **Step 5: Run tests + build**

Run: `bun run test`
Expected: PASS (integrity test green, smoke green).
Run: `bun run build`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/data/ src/App.tsx
git commit -m "fix: correct invalid 'patn' location id and App data imports"
```

---

## Task 3: Add missing `SoundManager.playChime()` and `playHorn()`

**Files:**
- Modify: `src/audio/SoundManager.ts`
- Create: `src/audio/soundManagerApi.test.ts`

**Interfaces:**
- Produces:
  - `soundManager.playChime(): void` — short two-note rising confirmation ping.
  - `soundManager.playHorn(count?: number): void` — one or more short horn toots (default 1).

Background: `playChime()` is called in `App.tsx`, `GameWorld.ts` (×2), `PhotoModeModal.tsx`, `QuizModal.tsx`, `SouvenirShopModal.tsx`. `playHorn()` / `playHorn(1)` is called in `PassengerMissionModal.tsx` (×2) and `QuizModal.tsx`. Neither exists on the class today, so those code paths throw `TypeError` at runtime. `SoundManager` already has `startHorn(hornType)` / `stopHorn()` and helpers like `playTempleBell()`, `playAchievementSound()` following a consistent oscillator style.

- [ ] **Step 1: Write the failing API-coverage test**

Create `src/audio/soundManagerApi.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { soundManager } from './SoundManager';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) return walk(p);
    return p.endsWith('.ts') || p.endsWith('.tsx') ? [p] : [];
  });
}

describe('SoundManager API covers every call site', () => {
  it('every soundManager.<method>() referenced in src/ exists', () => {
    const files = walk(join(process.cwd(), 'src'));
    const used = new Set<string>();
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/soundManager\.([a-zA-Z_]\w*)\s*\(/g)) {
        used.add(m[1]);
      }
    }
    const missing = [...used].filter(
      (name) => typeof (soundManager as unknown as Record<string, unknown>)[name] !== 'function',
    );
    expect(missing, `missing SoundManager methods: ${missing.join(', ')}`).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test src/audio/soundManagerApi.test.ts`
Expected: FAIL — `missing SoundManager methods: playChime, playHorn`.

- [ ] **Step 3: Implement `playChime` and `playHorn`**

In `src/audio/SoundManager.ts`, add these methods inside the class (place after `playAchievementSound()`):

```typescript
  /**
   * Short rising two-note ping for confirmations (stamp earned, item bought, correct answer).
   */
  public playChime() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [659.25, 987.77]; // E5, B5
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.22, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.3);
    });
  }

  /**
   * One or more short horn toots (used for wrong quiz answer, mission accept cue).
   */
  public playHorn(count: number = 1) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;
    const toots = Math.max(1, Math.min(3, Math.floor(count)));
    const now = this.ctx.currentTime;
    for (let t = 0; t < toots; t++) {
      const start = now + t * 0.22;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(340, start);
      osc2.frequency.setValueAtTime(425, start);
      gain.gain.setValueAtTime(0.28, start);
      gain.gain.setTargetAtTime(0, start + 0.14, 0.03);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      osc1.start(start);
      osc2.start(start);
      osc1.stop(start + 0.2);
      osc2.stop(start + 0.2);
    }
  }
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `bun run test src/audio/soundManagerApi.test.ts`
Expected: PASS.

- [ ] **Step 5: Full test + build**

Run: `bun run test` → PASS. Run: `bun run build` → exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/audio/
git commit -m "fix: add missing SoundManager.playChime and playHorn methods"
```

---

## Task 4: Remove the duplicate `buildRoadsideScenery`

**Files:**
- Modify: `src/world/EnvironmentBuilder.ts`

**Interfaces:** none exported; internal cleanup.

Background: `buildRoadsideScenery(locations)` is defined twice — first at ~line 674 (a simple 90-tree circular scatter, preceded by the doc comment `/** Helper to create procedural roadside trees, streetlights, dhabas */`), then again at ~line 1277 (the real one: petrol stations, garages, toll plaza matching `GameWorld.checkFacilityProximity` coordinates, milestone markers, tree groves). esbuild currently keeps the second; the first is dead but causes `tsc` error `TS2393: Duplicate function implementation` and an esbuild warning. Keep the second, delete the first.

- [ ] **Step 1: Locate both definitions**

Run: `grep -n "buildRoadsideScenery" src/world/EnvironmentBuilder.ts`
Expected: 3 lines — one call site (~77), two definitions (~674, ~1277).

- [ ] **Step 2: Delete the first definition and its doc comment**

Remove the block starting at the `/**` doc comment immediately above the first `private buildRoadsideScenery(locations: LocationData[]) {` (~line 671) through its closing `}` (~line 687, just before `private createTree(`). Do not touch the second definition (~1277) or `createTree`.

- [ ] **Step 3: Verify only one definition remains**

Run: `grep -n "private buildRoadsideScenery" src/world/EnvironmentBuilder.ts`
Expected: exactly 1 line (~1263 after deletion).

- [ ] **Step 4: Build — the esbuild warning must be gone**

Run: `bun run build 2>&1 | grep -i "duplicate"`
Expected: no output (no "Duplicate member" warning).
Run: `bun run test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world/EnvironmentBuilder.ts
git commit -m "fix: remove duplicate buildRoadsideScenery definition"
```

---

## Task 5: `PhotoFilterId` type + fix `PhotoModeModal` filter typing

**Files:**
- Modify: `src/types.ts`
- Modify: `src/components/PhotoModeModal.tsx`

**Interfaces:**
- Produces: `PhotoFilterId` union type in `src/types.ts`:
  `'normal' | 'kathiyawad_warm' | 'rann_sunset' | 'vintage_postcard' | 'navratri_vibrant' | 'monochrome_heritage'`

Background: `PhotoModeModal` declares `PHOTO_FILTERS: { id: PhotoFilterPreset; ... }[]` where `PhotoFilterPreset` is an *interface* in `types.ts`, and uses `useState<PhotoFilterPreset>('kathiyawad_warm')`. The interface's `id` union (`'kathiyawad' | 'rann_white' | ...`) does not match the ids the component actually uses. Result: 7 `TS2322` errors once React types are in.

- [ ] **Step 1: Add `PhotoFilterId` to `src/types.ts`**

Replace the existing `PhotoFilterPreset` interface (near the end of the file) with:

```typescript
export type PhotoFilterId =
  | 'normal'
  | 'kathiyawad_warm'
  | 'rann_sunset'
  | 'vintage_postcard'
  | 'navratri_vibrant'
  | 'monochrome_heritage';

export interface PhotoFilter {
  id: PhotoFilterId;
  name: string;
  cssFilter: string;
}
```

Then `grep -rn "PhotoFilterPreset" src/` — if any other file references it, update those to `PhotoFilterId` / `PhotoFilter` as appropriate (expected: only `PhotoModeModal.tsx`).

- [ ] **Step 2: Update `PhotoModeModal.tsx`**

- Change the import: `import { LocationData, PhotoFilterId } from '../types';`
- Change the const declaration: `const PHOTO_FILTERS: { id: PhotoFilterId; name: string; cssFilter: string }[] = [ ... ]` (leave the array entries unchanged — their ids already match the new union).
- Change the state: `const [selectedFilter, setSelectedFilter] = useState<PhotoFilterId>('kathiyawad_warm');`

- [ ] **Step 3: Typecheck this file in isolation**

Run: `bunx tsc --noEmit src/components/PhotoModeModal.tsx src/types.ts 2>&1 | grep PhotoMode || echo "no PhotoMode errors"`
Expected: "no PhotoMode errors" for the filter-id lines (there may still be a `canvasRef` / props error — that is Task 9; React-types errors — Task 12).

- [ ] **Step 4: Build + test**

Run: `bun run build` → exits 0. Run: `bun run test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/components/PhotoModeModal.tsx
git commit -m "refactor: replace PhotoFilterPreset interface with PhotoFilterId union"
```

---

## Task 6: Add `include` + React types to tsconfig; reconnect `PassengerMissionModal`

**Files:**
- Modify: `tsconfig.json`
- Modify: `src/components/PassengerMissionModal.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `PassengerMissionModalProps` (new contract):

```typescript
interface PassengerMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationData;
  availableMissions: MissionData[];
  activeMission: MissionData | null;
  activePassenger: PassengerData | null;
  coins: number;
  reputationStars: number;
  completedMissions: string[];
  onAcceptMission: (mission: MissionData) => void;
  onCancelMission: () => void;
}
```

- `App.tsx` produces: `handleAcceptMission(mission: MissionData): void`, `handleCancelMission(): void`.

Background: `App.tsx` renders `<PassengerMissionModal activePassenger={} activeMission={} coins={} reputationStars={} completedMissions={} onAcceptPassenger={handleAcceptPassenger} />` but the component's current props are `activeMission, onAcceptMission, onCancelMission, completedMissionsCount, currentLocation`. Nothing lines up, so accepting a mission does nothing. Adding React types (this task) makes this a compile error we then fix.

- [ ] **Step 1: Add `include` and React types wiring to `tsconfig.json`**

Add to `compilerOptions` siblings (top level of the JSON):

```json
"include": ["src", "server.ts", "vite.config.ts", "vitest.config.ts"]
```

Do **not** enable `"strict"` yet (Task 12). Keep every existing `compilerOptions` value.

- [ ] **Step 2: Capture the current error set**

Run: `bun run lint 2>&1 | tee /tmp/m0-lint-task6.txt ; bun run lint 2>&1 | grep -c "error TS"`
Expected: a list dominated by `PassengerMissionModal` prop errors in `App.tsx`, plus `QuizModal`/`SouvenirShopModal`/`PhotoModeModal` prop errors (Tasks 7–9) and possibly a handful of null-safety errors (Task 12). Only fix `PassengerMissionModal`-related errors in this task.

- [ ] **Step 3: Rewrite `PassengerMissionModalProps` and the component body**

In `src/components/PassengerMissionModal.tsx`:
- Replace the props interface with the **Interfaces** block above.
- Update the destructure in the component signature to match.
- The component currently seeds `useState(activeMission || GUJARAT_MISSIONS[0])` and renders `GUJARAT_MISSIONS` / `GUJARATI_PASSENGERS` directly from the data import and shows `completedMissionsCount`. Change:
  - render the missions list from `availableMissions` (the prop) instead of the raw `GUJARAT_MISSIONS` import; keep importing `GUJARATI_PASSENGERS` only if the passengers tab still reads it directly (acceptable — it is static reference data).
  - replace `completedMissionsCount` usages with `completedMissions.length`.
  - the "accept" button calls `onAcceptMission(selectedMission)` then `onClose()`; guard it so it is disabled when `activeMission` is non-null (one mission at a time).
  - add a "મિશન રદ કરો (Cancel)" button visible only when `activeMission` is set, calling `onCancelMission()`.
  - the two `soundManager.playHorn(...)` calls stay as-is (now valid after Task 3).

- [ ] **Step 4: Wire `App.tsx`**

- Rename `handleAcceptPassenger` → `handleAcceptMission(mission: MissionData)`. New body:

```typescript
const handleAcceptMission = (mission: MissionData) => {
  const passenger = mission.passenger ?? null;
  setActiveMission(mission);
  setActivePassenger(passenger);
  if (passenger && worldRef.current) worldRef.current.setPassenger(passenger);
  soundManager.playChime();
  const dest = GUJARAT_LOCATIONS.find((l) => l.id === mission.dropLocationId)?.nameGujarati ?? mission.dropLocationId;
  setFloatingBanner(`${mission.titleGujarati} — ચાલો ${dest} તરફ!`);
  soundManager.speakGujaratiTextFallback(`નવું મિશન: ${mission.titleGujarati}. ચાલો ${dest} તરફ!`);
};

const handleCancelMission = () => {
  setActiveMission(null);
  setActivePassenger(null);
  if (worldRef.current) worldRef.current.setPassenger(null);
  setFloatingBanner('મિશન રદ થયું.');
};
```

- Update the render:

```tsx
<PassengerMissionModal
  isOpen={isMissionsOpen}
  onClose={() => setIsMissionsOpen(false)}
  currentLocation={currentLocation}
  availableMissions={GUJARAT_MISSIONS}
  activeMission={activeMission}
  activePassenger={activePassenger}
  coins={coins}
  reputationStars={reputationStars}
  completedMissions={completedMissions}
  onAcceptMission={handleAcceptMission}
  onCancelMission={handleCancelMission}
/>
```

- [ ] **Step 5: Lint — PassengerMissionModal errors gone**

Run: `bun run lint 2>&1 | grep -E "PassengerMissionModal|handleAcceptPassenger"`
Expected: no output. (Other modal errors from Tasks 7–9 and any Task 12 null errors remain.)

- [ ] **Step 6: Build + test**

Run: `bun run build` → exits 0. Run: `bun run test` → PASS.

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json src/components/PassengerMissionModal.tsx src/App.tsx
git commit -m "fix: reconnect PassengerMissionModal prop contract to App state"
```

---

## Task 7: Reconnect `QuizModal` (App selects the quiz for the current location)

**Files:**
- Modify: `src/App.tsx`
- (No change to `QuizModal.tsx` — its contract `{ isOpen, onClose, quiz, onAnswerCorrect }` is already correct.)

**Interfaces:**
- Consumes: `GUJARATI_QUIZZES` from `src/data/quizzes.ts` (`CulturalQuiz[]`, each with `locationId`, `coinReward`).
- `App.tsx` produces: `currentQuiz: CulturalQuiz | null` (derived), `handleQuizCorrect(rewardCoins: number): void`.

Background: `App.tsx` renders `<QuizModal currentLocation={} coins={} onRewardCoins={} />` but the component wants `quiz` + `onAnswerCorrect`. So the quiz never gets a question. Only 6 of 16 locations have a quiz (`dwarka`, `somnath`, `gir`, `dholavira`, `statue_of_unity`, `patan_modhera`).

- [ ] **Step 1: Add the import and derived quiz**

`src/App.tsx`:
- Add `import { GUJARATI_QUIZZES } from './data/quizzes';` and `import { CulturalQuiz } from './types';` (extend the existing `types` import).
- Near the other derived values in the component body:

```typescript
const currentQuiz: CulturalQuiz | null =
  GUJARATI_QUIZZES.find((q) => q.locationId === currentLocation.id) ?? null;
```

- [ ] **Step 2: Add `handleQuizCorrect` and update `quizScore`**

```typescript
const handleQuizCorrect = (rewardCoins: number) => {
  setCoins((c) => c + rewardCoins);
  setQuizScore((s) => ({ correct: s.correct + 1, totalAnswered: s.totalAnswered + 1 }));
  setFloatingBanner(`સાચો જવાબ! +₹${rewardCoins}`);
};
```

- [ ] **Step 3: Update the render**

```tsx
<QuizModal
  isOpen={isQuizOpen}
  onClose={() => setIsQuizOpen(false)}
  quiz={currentQuiz}
  onAnswerCorrect={handleQuizCorrect}
/>
```

- [ ] **Step 4: Disable the HUD quiz button where there is no quiz**

In `App.tsx`, the `<HUD ... onOpenQuiz={() => setIsQuizOpen(true)} />` — change to:

```tsx
onOpenQuiz={currentQuiz ? () => setIsQuizOpen(true) : undefined}
```

In `src/components/HUD.tsx`: make `onOpenQuiz?: () => void` optional in `HUDProps`, and on the quiz `<button>` add `disabled={!onOpenQuiz}` plus `title={onOpenQuiz ? 'ગુજરાત ક્વિઝ' : 'આ સ્થળે ક્વિઝ ઉપલબ્ધ નથી'}`.

- [ ] **Step 5: Lint + build + test**

Run: `bun run lint 2>&1 | grep -E "QuizModal|onRewardCoins"` → no output.
Run: `bun run build` → exits 0. Run: `bun run test` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/HUD.tsx
git commit -m "fix: wire QuizModal to the current location's quiz"
```

---

## Task 8: Reconnect `SouvenirShopModal` (App derives the souvenir list)

**Files:**
- Modify: `src/App.tsx`
- (No change to `SouvenirShopModal.tsx` — contract `{ isOpen, onClose, souvenirs, coins, onBuySouvenir }` is already correct.)

**Interfaces:**
- Consumes: `GUJARATI_SOUVENIRS` (`SouvenirItem[]`, each has `id`, `locationId`, `priceCoins`, `acquired`).
- `App.tsx` produces: `currentLocationSouvenirs: SouvenirItem[]` (derived, `acquired` reflects `collectedSouvenirs`), `handleBuySouvenir(souvenirId: string): void`.

Background: `App.tsx` renders `<SouvenirShopModal currentLocation={} coins={} collectedSouvenirs={} onBuyItem={handleBuySouvenir} />` where `handleBuySouvenir` takes a `SouvenirItem`. The component wants `souvenirs: SouvenirItem[]` and `onBuySouvenir: (id: string) => void`.

- [ ] **Step 1: Derive the location's souvenir list**

`src/App.tsx`, in the component body:

```typescript
const currentLocationSouvenirs = GUJARATI_SOUVENIRS
  .filter((s) => s.locationId === currentLocation.id)
  .map((s) => ({ ...s, acquired: collectedSouvenirs.includes(s.id) }));
```

- [ ] **Step 2: Rewrite `handleBuySouvenir` to take an id**

```typescript
const handleBuySouvenir = (souvenirId: string) => {
  const item = GUJARATI_SOUVENIRS.find((s) => s.id === souvenirId);
  if (!item || collectedSouvenirs.includes(souvenirId) || coins < item.priceCoins) return;
  setCoins((c) => c - item.priceCoins);
  setCollectedSouvenirs((prev) => [...prev, souvenirId]);
  soundManager.playChime();
  setFloatingBanner(`🛍️ ${item.nameGujarati} ખરીદ્યું!`);
};
```

- [ ] **Step 3: Update the render**

```tsx
<SouvenirShopModal
  isOpen={isSouvenirsOpen}
  onClose={() => setIsSouvenirsOpen(false)}
  souvenirs={currentLocationSouvenirs}
  coins={coins}
  onBuySouvenir={handleBuySouvenir}
/>
```

- [ ] **Step 4: Lint + build + test**

Run: `bun run lint 2>&1 | grep -E "SouvenirShopModal|onBuyItem"` → no output.
Run: `bun run build` → exits 0. Run: `bun run test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "fix: wire SouvenirShopModal to the current location's souvenirs"
```

---

## Task 9: Reconnect `PhotoModeModal` (canvas ref + `preserveDrawingBuffer`)

**Files:**
- Modify: `src/world/GameWorld.ts`
- Modify: `src/components/PhotoModeModal.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `GameWorld` produces: `get canvas(): HTMLCanvasElement` returning `this.renderer.domElement`.
- `PhotoModeModalProps` (new): `{ isOpen: boolean; onClose: () => void; currentLocation: LocationData; canvasRef: React.RefObject<HTMLCanvasElement | null> }`.

Background: `PhotoModeModal` calls `canvasRef.current.toDataURL(...)` but `App.tsx` passes `customization`/`cameraMode`/`totalKm` and no `canvasRef`. Also, a WebGL canvas returns a blank image from `toDataURL` unless the renderer was created with `preserveDrawingBuffer: true`.

- [ ] **Step 1: Enable `preserveDrawingBuffer` and expose the canvas in `GameWorld`**

`src/world/GameWorld.ts`, in the constructor where `this.renderer = new THREE.WebGLRenderer({ ... })`:

```typescript
this.renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true,
});
```

Add a getter on the class (near the other public members):

```typescript
public get canvas(): HTMLCanvasElement {
  return this.renderer.domElement;
}
```

- [ ] **Step 2: Update `PhotoModeModalProps`**

`src/components/PhotoModeModal.tsx`:

```typescript
interface PhotoModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationData;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}
```

Keep the body as-is (it already reads `canvasRef.current`). Where it does `canvasRef.current.toDataURL(...)`, guard with `if (!canvasRef.current) return;` (already present per the file — confirm).

- [ ] **Step 3: Hold and pass the canvas ref in `App.tsx`**

- Add a ref: `const canvasRef = useRef<HTMLCanvasElement | null>(null);`
- In the `useEffect` that constructs `GameWorld` (after `worldRef.current = world;`): `canvasRef.current = world.canvas;`
- In the effect cleanup: `canvasRef.current = null;`
- Update the render:

```tsx
<PhotoModeModal
  isOpen={isPhotoModeOpen}
  onClose={() => setIsPhotoModeOpen(false)}
  currentLocation={currentLocation}
  canvasRef={canvasRef}
/>
```

- [ ] **Step 4: Lint + build + test**

Run: `bun run lint 2>&1 | grep -E "PhotoModeModal"` → no output.
Run: `bun run build` → exits 0. Run: `bun run test` → PASS.

- [ ] **Step 5: Manual check (browser)**

Run: `bun run dev`, open the app, start driving, open Photo Mode, click Capture.
Expected: the viewfinder shows the actual 3D scene (not black). Close dev server.

- [ ] **Step 6: Commit**

```bash
git add src/world/GameWorld.ts src/components/PhotoModeModal.tsx src/App.tsx
git commit -m "fix: wire PhotoModeModal to the live renderer canvas"
```

---

## Task 10: Extract achievement rules into a testable module

**Files:**
- Create: `src/state/achievements.ts`
- Create: `src/state/achievements.test.ts`
- Modify: `src/App.tsx`
- Delete: `src/smoke.test.ts`

**Interfaces:**
- `src/state/achievements.ts` produces:

```typescript
export interface AchievementInput {
  visitedLocations: string[];
  discoveredFoods: string[];
  totalKm: number;
}
/** Returns the full set of achievement ids that should be unlocked for this progress. Pure. */
export function evaluateAchievements(input: AchievementInput): string[];
```

Background: `App.tsx` has an inline `checkAchievements(visited, foods, km)` that mutates `unlockedAchievements` and plays a sound as a side effect. Extract the *rules* (which ids are earned) into a pure function; `App.tsx` keeps the "what's newly unlocked → play sound + banner" glue.

- [ ] **Step 1: Write the failing test**

Create `src/state/achievements.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { evaluateAchievements } from './achievements';

describe('evaluateAchievements', () => {
  it('always includes the starter achievement', () => {
    expect(evaluateAchievements({ visitedLocations: [], discoveredFoods: [], totalKm: 0 }))
      .toContain('ach_starter');
  });

  it('unlocks Saurashtra Safari when all six Saurashtra hubs are visited', () => {
    const visited = ['rajkot', 'dwarka', 'somnath', 'gir', 'junagadh', 'palitana'];
    expect(evaluateAchievements({ visitedLocations: visited, discoveredFoods: [], totalKm: 0 }))
      .toContain('ach_saurashtra');
  });

  it('does not unlock Saurashtra Safari when one hub is missing', () => {
    const visited = ['rajkot', 'dwarka', 'somnath', 'gir', 'junagadh'];
    expect(evaluateAchievements({ visitedLocations: visited, discoveredFoods: [], totalKm: 0 }))
      .not.toContain('ach_saurashtra');
  });

  it('unlocks the foodie achievement at six discovered foods', () => {
    expect(evaluateAchievements({ visitedLocations: [], discoveredFoods: ['a', 'b', 'c', 'd', 'e', 'f'], totalKm: 0 }))
      .toContain('ach_foodie');
  });

  it('unlocks the grand explorer at 16 visited locations', () => {
    const visited = Array.from({ length: 16 }, (_, i) => `loc_${i}`);
    expect(evaluateAchievements({ visitedLocations: visited, discoveredFoods: [], totalKm: 0 }))
      .toContain('ach_all_gujarat');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `bun run test src/state/achievements.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/state/achievements.ts`**

Port the exact rules from `App.tsx`'s current `checkAchievements` (do not change thresholds or id lists):

```typescript
export interface AchievementInput {
  visitedLocations: string[];
  discoveredFoods: string[];
  totalKm: number;
}

const SAURASHTRA = ['rajkot', 'dwarka', 'somnath', 'gir', 'junagadh', 'palitana'];
const UNESCO = ['patan_modhera', 'pavagadh', 'dholavira', 'ahmedabad'];
const PILGRIM = ['dwarka', 'somnath', 'palitana', 'pavagadh'];

export function evaluateAchievements(input: AchievementInput): string[] {
  const { visitedLocations: v, discoveredFoods: f } = input;
  const has = (id: string) => v.includes(id);
  const all = (ids: string[]) => ids.every(has);
  const out: string[] = ['ach_starter'];

  if (all(SAURASHTRA)) out.push('ach_saurashtra');
  if (has('kutch')) out.push('ach_rann');
  if (has('dholavira')) out.push('ach_road_to_heaven');
  if (all(UNESCO)) out.push('ach_unesco_master');
  if (has('gir')) out.push('ach_gir_lion');
  if (all(PILGRIM)) out.push('ach_pilgrim');
  if (f.length >= 6) out.push('ach_foodie');
  if (v.length >= 16) out.push('ach_all_gujarat');

  return out;
}
```

> Cross-check against `src/data/locations.ts` `INITIAL_ACHIEVEMENTS` ids while porting — the ids above must all exist there.

- [ ] **Step 4: Run to confirm pass**

Run: `bun run test src/state/achievements.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Use it in `App.tsx`**

Replace the inline `checkAchievements` with:

```typescript
const applyAchievements = (visited: string[], foods: string[], km: number) => {
  const earned = evaluateAchievements({ visitedLocations: visited, discoveredFoods: foods, totalKm: km });
  setUnlockedAchievements((prev) => {
    const added = earned.filter((id) => !prev.includes(id));
    if (added.length > 0) {
      soundManager.playAchievementSound();
      const names = added.length;
      setFloatingBanner(`🏅 નવું અચીવમેન્ટ અનલૉક! (${names})`);
    }
    return earned.length === prev.length && added.length === 0 ? prev : earned;
  });
};
```

Update the call sites (`markLocationVisited`, `handleDiscoverFood`) from `checkAchievements(...)` to `applyAchievements(...)`. Add `import { evaluateAchievements } from './state/achievements';`.

- [ ] **Step 6: Delete the smoke test**

Delete `src/smoke.test.ts` (real tests now exist).

Run: `bun run test` → PASS (dataIntegrity, soundManagerApi, achievements).

- [ ] **Step 7: Lint + build**

Run: `bun run lint 2>&1 | grep -E "checkAchievements|achievements"` → no output.
Run: `bun run build` → exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/state/achievements.ts src/state/achievements.test.ts src/App.tsx
git rm src/smoke.test.ts
git commit -m "refactor: extract pure evaluateAchievements with tests"
```

---

## Task 11: Persistence layer + wire into `App.tsx`

**Files:**
- Create: `src/state/persistence.ts`
- Create: `src/state/persistence.test.ts`
- Modify: `src/types.ts` (add `GameProgress`)
- Modify: `src/App.tsx`
- Modify: `src/components/PassportModal.tsx` (reset button)

**Interfaces:**
- `src/types.ts` produces:

```typescript
export interface GameProgress {
  coins: number;
  reputationStars: number;
  visitedLocations: string[];
  discoveredFoods: string[];
  unlockedAchievements: string[];
  collectedSouvenirs: string[];
  completedMissions: string[];
  quizScore: { correct: number; totalAnswered: number };
  customization: ChhakaroCustomization;
  totalKm: number;
  lastLocationId: string;
}
```

- `src/state/persistence.ts` produces:

```typescript
export const SAVE_KEY = 'chhakaro-gujarat-save-v1';
export const SCHEMA_VERSION = 1;
export const DEFAULT_PROGRESS: GameProgress;
export function loadProgress(): GameProgress;          // defaults on missing/corrupt/version-mismatch
export function saveProgress(progress: GameProgress): void;  // debounced ~500ms write
export function clearProgress(): void;
export function flushProgress(): void;                 // force pending debounced write (for tests / unload)
```

- [ ] **Step 1: Write the failing tests**

Create `src/state/persistence.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SAVE_KEY, SCHEMA_VERSION, DEFAULT_PROGRESS,
  loadProgress, saveProgress, clearProgress, flushProgress,
} from './persistence';

beforeEach(() => localStorage.clear());

describe('persistence', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadProgress()).toEqual(DEFAULT_PROGRESS);
  });

  it('round-trips a saved progress object', () => {
    const p = { ...DEFAULT_PROGRESS, coins: 999, visitedLocations: ['rajkot', 'dwarka'] };
    saveProgress(p);
    flushProgress();
    expect(loadProgress()).toEqual(p);
  });

  it('resets to defaults on schema version mismatch', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SCHEMA_VERSION + 1, progress: { coins: 5 } }));
    expect(loadProgress()).toEqual(DEFAULT_PROGRESS);
  });

  it('resets to defaults on corrupt JSON', () => {
    localStorage.setItem(SAVE_KEY, '{not json');
    expect(loadProgress()).toEqual(DEFAULT_PROGRESS);
  });

  it('clearProgress wipes the stored save', () => {
    saveProgress({ ...DEFAULT_PROGRESS, coins: 10 });
    flushProgress();
    clearProgress();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('debounces writes but flush forces them', () => {
    vi.useFakeTimers();
    saveProgress({ ...DEFAULT_PROGRESS, coins: 1 });
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    flushProgress();
    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `bun run test src/state/persistence.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add `GameProgress` to `src/types.ts`**

Add the interface from **Interfaces** above (place near `ChhakaroCustomization`).

- [ ] **Step 4: Implement `src/state/persistence.ts`**

```typescript
import { GameProgress } from '../types';

export const SAVE_KEY = 'chhakaro-gujarat-save-v1';
export const SCHEMA_VERSION = 1;

export const DEFAULT_PROGRESS: GameProgress = {
  coins: 1200,
  reputationStars: 5.0,
  visitedLocations: ['rajkot'],
  discoveredFoods: ['gathiya'],
  unlockedAchievements: ['ach_starter'],
  collectedSouvenirs: [],
  completedMissions: [],
  quizScore: { correct: 0, totalAnswered: 0 },
  customization: {
    bodyColor: 0xd9531e,
    stickerText: 'જય ગરવી ગુજરાત',
    hornType: 'classic_bulb',
    flagColor: 0xf97316,
    hasMirrorTassels: true,
    hasCanopy: true,
  },
  totalKm: 0,
  lastLocationId: 'rajkot',
};

interface StoredSave {
  version: number;
  progress: GameProgress;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function loadProgress(): GameProgress {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed) || parsed.version !== SCHEMA_VERSION || !isPlainObject(parsed.progress)) {
      return { ...DEFAULT_PROGRESS };
    }
    // shallow-merge onto defaults so a missing key never crashes the app
    return { ...DEFAULT_PROGRESS, ...(parsed.progress as Partial<GameProgress>) } as GameProgress;
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

let pending: GameProgress | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function write(progress: GameProgress) {
  try {
    const payload: StoredSave = { version: SCHEMA_VERSION, progress };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / disabled storage — non-fatal */
  }
}

export function saveProgress(progress: GameProgress): void {
  pending = progress;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    if (pending) write(pending);
    pending = null;
    timer = null;
  }, 500);
}

export function flushProgress(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (pending) {
    write(pending);
    pending = null;
  }
}

export function clearProgress(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  pending = null;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 5: Run to confirm pass**

Run: `bun run test src/state/persistence.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Wire into `App.tsx`**

- `import { loadProgress, saveProgress, clearProgress, flushProgress } from './state/persistence';`
- At the top of the component: `const initial = useMemo(() => loadProgress(), []);`
- Initialise the persisted `useState` from `initial` instead of literals:
  `useState(initial.coins)`, `useState(initial.reputationStars)`, `useState<string[]>(initial.visitedLocations)`, `useState<string[]>(initial.discoveredFoods)`, `useState<string[]>(initial.unlockedAchievements)`, `useState<string[]>(initial.collectedSouvenirs)`, `useState<string[]>(initial.completedMissions)`, `useState(initial.quizScore)`, `useState<ChhakaroCustomization>(initial.customization)`.
  For `currentLocation`: `useState<LocationData>(GUJARAT_LOCATIONS.find((l) => l.id === initial.lastLocationId) ?? GUJARAT_LOCATIONS[0])`.
- Add one persistence effect:

```typescript
useEffect(() => {
  saveProgress({
    coins, reputationStars, visitedLocations, discoveredFoods,
    unlockedAchievements, collectedSouvenirs, completedMissions, quizScore,
    customization, totalKm, lastLocationId: currentLocation.id,
  });
}, [coins, reputationStars, visitedLocations, discoveredFoods, unlockedAchievements,
    collectedSouvenirs, completedMissions, quizScore, customization, totalKm, currentLocation]);

useEffect(() => {
  const onHide = () => flushProgress();
  window.addEventListener('beforeunload', onHide);
  return () => window.removeEventListener('beforeunload', onHide);
}, []);
```

- Add `handleResetProgress`:

```typescript
const handleResetProgress = () => {
  clearProgress();
  window.location.reload();
};
```

- Pass `onResetProgress={handleResetProgress}` to `<PassportModal>`.
- **Do not** persist or restore `vehicleHealth` / `weather` / `timeOfDay` — leave their `useState` initial values exactly as they are.

- [ ] **Step 7: Reset button in `PassportModal`**

`src/components/PassportModal.tsx`: add `onResetProgress: () => void` to props. In the footer, add a button "🔄 નવેસરથી શરૂ કરો" that first swaps to an inline confirm ("ખાતરી છે? બધી પ્રગતિ ભૂંસાઈ જશે" with "હા, ભૂંસો" / "રદ કરો") — use local `useState` for the confirm toggle, **not** `window.confirm`. "હા, ભૂંસો" calls `onResetProgress()`.

- [ ] **Step 8: Lint + build + full test**

Run: `bun run lint` → **no `error TS` lines from any file touched so far** (there may still be pre-existing null-safety errors elsewhere — those are Task 12).
Run: `bun run build` → exits 0. Run: `bun run test` → PASS (all suites).

- [ ] **Step 9: Manual check (browser)**

Run: `bun run dev`. Start a game, earn coins (buy a souvenir / answer a quiz), visit a second location, refresh the page. Expected: coins, stamps, and last location survive; fuel is back to full. Click reset in the passport → progress returns to defaults.

- [ ] **Step 10: Commit**

```bash
git add src/state/persistence.ts src/state/persistence.test.ts src/types.ts src/App.tsx src/components/PassportModal.tsx
git commit -m "feat: persist player progress to localStorage across sessions"
```

---

## Task 12: Enable TypeScript `strict` and clear the remaining errors

**Files:**
- Modify: `tsconfig.json`
- Modify: whichever files `tsc` flags (expected: `src/App.tsx`, `src/components/HUD.tsx`, `src/components/*Modal.tsx`, `src/world/GameWorld.ts`, `src/types.ts`, `server.ts`)

**Interfaces:** no new exports; this is a type-safety ratchet.

- [ ] **Step 1: Flip strict on**

`tsconfig.json` `compilerOptions`: add `"strict": true`. Keep `"skipLibCheck": true`.

- [ ] **Step 2: Inventory**

Run: `bun run lint 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c | sort -rn`
Record the count and the per-file spread in the commit message later.

- [ ] **Step 3: Fix by pattern (each is 2–5 min; commit is at the end)**

Apply these fixes, re-running `bun run lint` after each file:

- **`TS18048` / `TS2532` "possibly undefined" on `timeOfDay`, `healthState`, `nearbyLandmark`, `activeMission`, `activePassenger`:** these props are already declared optional/nullable in `HUDProps`. In the component bodies, guard before use (`timeOfDay && (...)`, `healthState?.fuelPercent ?? 0`). Do not change the prop types to non-optional.
- **`src/types.ts` `VehicleHealthState`:** it currently has ~every field optional. Make the fields that `GameWorld` always sets required: `fuelPercent, maxFuelLiters, currentFuelLiters, fuelConsumptionRateKm, engineTempCelsius, isOverheating, hasPuncture, punctureWheel, headlightWorking, hornWorking, conditionScore`. Leave genuinely-optional gear/hazard fields optional. Fix any resulting mismatches in `GameWorld.ts` `healthState` initialisation and `App.tsx`'s `useState<VehicleHealthState>` literal.
- **`GujaratRegion`:** narrow to the five ids actually used in `src/data/locations.ts`: `'saurashtra' | 'kutch' | 'central_gujarat' | 'north_gujarat' | 'south_gujarat'`. Remove the `RegionType` alias if unused, or keep it pointing at `GujaratRegion`. Fix `GujaratMapModal`'s `regions` array typing if needed.
- **`TS7006` implicit-any callback params** (e.g. `.map((x) => ...)` in components where inference lost the type): add explicit types from the data model (`FoodItem`, `SouvenirItem`, `CulturalQuiz`, `LocationData`).
- **`server.ts` `any` params in `generateSmartKakaFallback`:** give `currentLocation` a local narrow type `Pick<LocationData, 'id' | 'nameGujarati' | 'famousFood' | 'region'> | undefined` or an inline interface; keep behaviour identical.
- **Escape hatch:** if a single error needs more than ~10 min and is off the stabilization path, add `// @ts-expect-error TODO(m0): <one-line reason>` on the line and a bullet to `docs/superpowers/playtests/m0-playtest.md` under "Known deferred type issues". Cap: no more than 5 such suppressions total; if you hit 5, stop and report.

- [ ] **Step 4: Lint fully clean**

Run: `bun run lint`
Expected: **zero `error TS` lines.**

- [ ] **Step 5: Build + test**

Run: `bun run build` → exits 0, no "Duplicate member" warning.
Run: `bun run test` → PASS.

- [ ] **Step 6: Commit**

```bash
git add tsconfig.json src/ server.ts
git commit -m "chore: enable TypeScript strict mode and clear all type errors"
```

---

## Task 13: Replace invalid Gemini model ids

**Files:**
- Modify: `server.ts`

**Interfaces:** no signature change; `/api/gemini/guide` and `/api/gemini/tts` behave identically, just with valid model names.

Background: `server.ts` references `gemini-3.7-flash`, `gemini-flash-latest`, `gemini-3.1-flash-lite` (guide) and `gemini-3.1-flash-tts-preview` (TTS). These are not real model ids, so every call throws and the code silently serves `generateSmartKakaFallback`.

- [ ] **Step 1: Confirm current valid model ids**

Use the `gemini-api` skill (or https://ai.google.dev/gemini-api/docs/models) to get the current GA flash model id and the current TTS model id. As of this plan the expected values are:
- guide fallback chain: `['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite']`
- TTS: `'gemini-2.5-flash-preview-tts'`

Verify these resolve before hard-coding; if Google has moved on, use the current equivalents and note them in the commit message.

- [ ] **Step 2: Update `server.ts`**

- Replace the `candidateModels` array in `/api/gemini/guide` with the confirmed guide chain.
- Replace the `model:` string in `/api/gemini/tts` with the confirmed TTS id.
- Leave the fallback logic, `generateSmartKakaFallback`, and the response shapes untouched.

- [ ] **Step 3: Verify graceful degradation (no key)**

Run: `bun run dev` **without** `GEMINI_API_KEY` set (check `.env`).
In the app, open Kanji Kaka, ask a question.
Expected: a Gujarati reply from the local fallback within ~1s, no unhandled promise rejection in the terminal, no infinite spinner.

- [ ] **Step 4: Verify with a key (if available)**

If a real `GEMINI_API_KEY` is available, set it in `.env`, restart `bun run dev`, ask Kaka a question.
Expected: a contextual reply that references the current location. If no key is available, skip and note it.

- [ ] **Step 5: Build + test**

Run: `bun run build` → exits 0. Run: `bun run test` → PASS. Run: `bun run lint` → clean.

- [ ] **Step 6: Commit**

```bash
git add server.ts
git commit -m "fix: use valid Gemini model ids for guide and TTS endpoints"
```

---

## Task 14: README, `alert()` removal, and the M0 playtest checklist

**Files:**
- Create: `README.md`
- Create: `docs/superpowers/playtests/m0-playtest.md`
- Modify: `src/components/KanjiKakaGuide.tsx`

- [ ] **Step 1: Replace `alert()` in `KanjiKakaGuide.tsx`**

The `toggleListening` function calls `alert('તમારા બ્રાઉઝરમાં માઇક્રોફોન સ્પીચ રેકગ્નિશન સપોર્ટેડ નથી.')` when speech recognition is unavailable. Replace with local component state:
- Add `const [micError, setMicError] = useState<string | null>(null);`
- In `toggleListening`, instead of `alert(...)`, `setMicError('તમારા બ્રાઉઝરમાં માઇક્રોફોન સપોર્ટેડ નથી.')` and `return;`
- Render `micError` as a small dismissible red bar above the input row when non-null; clear it on the next successful `rec.start()`.

> Note: the shared `notify()` toast is introduced in the M1 plan; this is the minimal M0 fix so M0 has no forward dependency.

- [ ] **Step 2: Confirm no other `alert(` / `window.confirm(` / `window.prompt(` remain**

Run: `grep -rn "alert(\|window\.confirm\|window\.prompt" src/`
Expected: no matches (the `PassportModal` reset from Task 11 uses an inline confirm, not `window.confirm`).

- [ ] **Step 3: Write `README.md`**

Cover: one-paragraph description; `bun install`; `bun run dev` (starts `tsx server.ts` → Vite middleware on `http://localhost:3000`); `bun run build`; `bun run start` (prod); `bun run lint`; `bun run test`; env vars (`GEMINI_API_KEY` optional in dev, injected by AI Studio in prod; `APP_URL`); deploy target (Google AI Studio → Cloud Run, Express server serves the built SPA + proxies Gemini); a short architecture map (`src/world/GameWorld.ts` orchestrates the Three.js systems; `src/App.tsx` owns game state; `src/state/` holds persistence + achievement logic; `server.ts` has two Gemini endpoints with local fallbacks).

- [ ] **Step 4: Write `docs/superpowers/playtests/m0-playtest.md`**

A checklist an executor runs in the browser after `bun run dev`:

```markdown
# M0 Playtest Checklist

Run `bun run dev`, open http://localhost:3000.

- [ ] Start screen appears; choosing a start location begins the drive
- [ ] Chhakaro drives (W/A/S/D), engine audio plays, camera cycles (C)
- [ ] HUD shows location, coins, fuel, speed
- [ ] Kanji Kaka opens; a question returns a Gujarati reply (fallback ok); no infinite spinner
- [ ] Map modal: opens, lists 16 locations, region filters work
- [ ] Passport modal: opens; reset button shows inline confirm; confirming resets progress
- [ ] Food passport: opens, marking a food discovered works
- [ ] Garage: opens, changing body colour updates the chhakaro
- [ ] Missions: open, accept a mission → passenger card appears in HUD → drive to drop → coins + reputation increase + banner
- [ ] Missions: "cancel mission" clears the active mission
- [ ] Souvenirs: at a location with souvenirs, buy one → coins decrease, item shows acquired, chime plays
- [ ] Quiz: at dwarka/somnath/gir/dholavira/statue_of_unity/patan_modhera, quiz button enabled → answering correctly adds coins; elsewhere the button is disabled
- [ ] Photo mode: capture shows the real 3D scene (not black); download saves a .jpg with the location stamp
- [ ] Refuel at a petrol pump prompt: coins decrease, fuel rises, no console error
- [ ] Repair at a garage prompt: puncture/temperature clear, no console error
- [ ] Approaching Dwarka/Somnath plays a temple bell
- [ ] Refresh mid-session: coins, stamps, achievements, discovered foods, last location all preserved; fuel back to full
- [ ] Browser console: no red errors during any of the above

## Known deferred type issues
(none — or list any `@ts-expect-error TODO(m0)` added in Task 12)
```

- [ ] **Step 5: Run the full playtest**

Work through `m0-playtest.md` in the browser. Every box must check. Fix any failure before proceeding (a failure here means an earlier task regressed).

- [ ] **Step 6: Final gate**

Run: `bun run lint` → clean. `bun run build` → exits 0. `bun run test` → PASS.

- [ ] **Step 7: Commit**

```bash
git add README.md docs/superpowers/playtests/m0-playtest.md src/components/KanjiKakaGuide.tsx
git commit -m "docs: add README and M0 playtest checklist; remove alert()"
```

---

## Self-Review

**Spec coverage (§4 of the design doc):**

| Spec item | Task |
|---|---|
| M0.1 add `@types/react`/`@types/react-dom` | Task 1 |
| M0.1 `tsconfig` `include` | Task 6 |
| M0.1 enable `strict`, fix errors, timebox + `@ts-expect-error` | Task 12 |
| M0.1 `types.ts` cleanup (`VehicleHealthState`, `GujaratRegion`, `PhotoFilterPreset`→union) | Task 5 (PhotoFilter), Task 12 (health, region) |
| M0.1 `lint` stays a gate | Global Constraints + every task from 6 |
| M0.2 `SoundManager.playChime`/`playHorn` + call-site audit | Task 3 |
| M0.2 de-dupe `buildRoadsideScenery` | Task 4 |
| M0.2 `PhotoModeModal` filter typing | Task 5 |
| M0.2 `App.tsx` bad imports | Task 2 |
| M0.2 `'patn'` data fix | Task 2 |
| M0.3 reconnect PassengerMissionModal | Task 6 |
| M0.3 reconnect QuizModal | Task 7 |
| M0.3 reconnect SouvenirShopModal | Task 8 |
| M0.3 reconnect PhotoModeModal (canvasRef, preserveDrawingBuffer) | Task 9 |
| M0.3 scripted playtest per modal | Task 14 (consolidated checklist) + inline browser checks in Tasks 9/11 |
| M0.4 `persistence.ts` (versioned, debounced, defaults) | Task 11 |
| M0.4 init `App` state from save, persist on change | Task 11 |
| M0.4 vehicle sim state NOT persisted | Task 11 Step 6 + Global Constraints |
| M0.4 reset button | Task 11 Step 7 |
| M0.5 valid Gemini model ids | Task 13 |
| M0.5 parity with/without key | Task 13 Steps 3–4 |
| M0.6 `README.md` | Task 14 |
| M0.6 vitest + pure-logic tests | Tasks 1, 2, 3, 10, 11 |
| M0.6 location-id integrity test | Task 2 |
| M0.6 `checkAchievements` → testable module | Task 10 |
| M0.6 mission-completion matching test | **GAP — see note** |
| M0.6 replace `alert()` | Task 14 |
| M0 acceptance (lint/build/test clean, full playtest, refresh preserves) | Task 14 Steps 5–6 |

**Gap found & fixed:** the spec's "mission-completion matching" test was not assigned. Add it to **Task 10** as an extra file:

- Create `src/state/missionMatching.ts` with:

```typescript
import { MissionData } from '../types';
export function isMissionComplete(mission: MissionData | null, arrivedLocationId: string): boolean {
  return mission != null && mission.dropLocationId === arrivedLocationId;
}
```

- Create `src/state/missionMatching.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isMissionComplete } from './missionMatching';
import { GUJARAT_MISSIONS } from '../data/missions';

describe('isMissionComplete', () => {
  it('is false when there is no active mission', () => {
    expect(isMissionComplete(null, 'dwarka')).toBe(false);
  });
  it('is true only at the mission drop location', () => {
    const m = GUJARAT_MISSIONS[0]; // rajkot -> dwarka
    expect(isMissionComplete(m, m.dropLocationId)).toBe(true);
    expect(isMissionComplete(m, m.pickupLocationId)).toBe(false);
  });
});
```

- In `App.tsx`, use `isMissionComplete(activeMission, arrivedLocationId)` inside the existing `checkMissionCompletion` guard. Add the two files to Task 10's commit.

**Placeholder scan:** no "TBD"/"handle edge cases"/"similar to Task N" — each task carries its own code. Task 12's "fix by pattern" lists concrete error codes and concrete fixes rather than "fix errors".

**Type consistency:** `GameProgress` (Task 11) fields match the `App.tsx` state variables initialised from it. `evaluateAchievements` input shape (Task 10) is stable. `PhotoFilterId` (Task 5) is consumed unchanged in Task 9. `PassengerMissionModalProps` (Task 6) `onAcceptMission: (mission: MissionData) => void` matches `handleAcceptMission` signature. `isMissionComplete` signature consistent between module and test.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-30-m0-stabilize-and-persist.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batched with checkpoints for review.

**Which approach?**
