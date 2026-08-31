# M3 — World & Atmosphere: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the world look and feel like Gujarat — five recognisable hero landmarks, a day/night cycle you can feel, weather that changes how the chhakaro drives, reactive traffic + procedural incidents, a real gear system, and share-worthy photo framing.

**Architecture:** New pure modules in `src/state/` (`transmission`, `weatherDirector`, `incidents`) each with a colocated `.test.ts`, consumed by `GameWorld.updatePhysics` / the render loop. Five hand-authored `THREE.Group` landmark builders under `src/world/landmarks/`, wired into the existing `EnvironmentBuilder.buildZoneLandmark` switch. `TimeOfDaySystem` and `TrafficSystem` gain narrowly-scoped extension methods (night emissive pass, `advanceTimeOfDay`, forward-brake reaction). `App` holds `transmissionMode` / `expertMode` (persisted, schema v4) and manual-shift inputs. Photo mode gains a journey-card framing overlay.

**Tech Stack:** TypeScript 5.8 strict, React 19.2, Vite 6, Three.js 0.185, Express 4, bun, vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-08-30-m3-world-atmosphere-design.md` (read it alongside this plan). Program context + invariants: `docs/superpowers/specs/2026-08-30-program-overview.md` §6.

**Baseline:** M0, M1, M2 are merged to `main` (`origin/main` at the M2 merge). Confirm the actual signatures of any M0–M2 surface this plan names (`notify()` from `src/state/notify.ts`, `GameProgress` / `SCHEMA_VERSION` from `src/state/persistence.ts`, `TimeOfDayState` from `src/types.ts`, `GameWorld` callbacks) at task start and adjust — the code is the source of truth.

## Global Constraints

- **Package manager `bun`.** `bun add` / `bun run <script>`. Never an npm/yarn lockfile.
- **`bun run lint` (`tsc --noEmit`, strict) passes clean — zero `error TS` — at the end of every task.** `noUnusedLocals` is NOT set.
- **`bun run build` exits 0 at the end of every task.** **`bun run test` passes, pristine output.**
- **`npx tsc` is broken here** (TypeScript is not an npm dep). For targeted runs use `./node_modules/.bin/tsc.exe`, `./node_modules/.bin/vitest.exe`, `./node_modules/.bin/vite.exe`, or `bun run <script>`.
- **`src/App.tsx` owns all game state.** New `src/state/*` modules are pure; HUD/modal components stay presentational (data + callbacks in).
- **Pure logic lives in `src/state/` with a colocated `.test.ts`.** 3D/audio/rendering are covered only by the written manual playtest checklist. Rendering is never unit-tested.
- **`src/world/*` is modified only where this plan names the edit.** No opportunistic refactor of `EnvironmentBuilder` / `NPCSystem` / `TrafficSystem` / `ChhakaroModel` / `TimeOfDaySystem`.
- **Vehicle sim state (fuel, engine temp, puncture, weather, time) is never persisted.** Only the `GameProgress` slice persists to `localStorage` under `chhakaro-gujarat-save-v1`. Loader resets on version mismatch. **Schema version → `4`** (Task 1, for `transmissionMode` + `expertMode`).
- **All new UI copy Gujarati-first**; English in parentheses only where the surrounding code does so.
- **Historical/cultural facts must be verifiable** — no invented history in any signboard, label, or landmark plaque text.
- **No external model/texture/audio files.** Geometry is code: `THREE` primitives, `ExtrudeGeometry`/`LatheGeometry`, and a small palette of `MeshStandardMaterial`. (CSP / asset-pipeline friction — see spec §5.)
- **Reward/feedback goes through the one `notify()` helper** (`notify({ text, tone, speak?, ttlMs? })` from `src/state/notify.ts`).
- **Commit after every task.** Branch: a fresh `m3-world-atmosphere` off merged `main` (decide at execution start; use `superpowers:using-git-worktrees` if worktrees are available).
- **Commit trailer on every commit:**
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01VzGvjWEdRxTFTAPKeKz8DS
  ```

---

## File Structure

**New:**

| Path | Responsibility |
|---|---|
| `src/state/transmission.ts` | `TransmissionMode`, `Gear`, gear/speed boundaries, accel multiplier, start guard — pure |
| `src/state/transmission.test.ts` | Gear boundaries, multipliers, start/stop guard, shift clamping |
| `src/state/weatherDirector.ts` | `pickWeather(input)`, `weatherParams(weather)` — region/time → weather + grip/visibility/wind — pure |
| `src/state/weatherDirector.test.ts` | Each zone/phase → expected bias; manual override; param table shape |
| `src/state/incidents.ts` | `IncidentKind`, `IncidentSpawn`, `IncidentSchedulerState`, `stepIncidentSchedule(...)` — pure scheduler |
| `src/state/incidents.test.ts` | Spawns within range, despawns behind, min-gap respected, zone filter |
| `src/world/landmarks/raniKiVav.ts` | `build(): THREE.Group` — stepped-well silhouette (patan_modhera) |
| `src/world/landmarks/somnath.ts` | `build(): THREE.Group` — seaside temple silhouette + shore (somnath) |
| `src/world/landmarks/girGate.ts` | `build(): THREE.Group` — safari check-post + forest canopy wall (gir) |
| `src/world/landmarks/whiteRann.ts` | `build(): THREE.Group` — flat salt to the horizon + Rann Utsav tents (kutch) |
| `src/world/landmarks/statueOfUnity.ts` | `build(): THREE.Group` — the 182 m figure on its plinth + river (statue_of_unity) |
| `src/world/IncidentDirector.ts` | Owns the THREE obstacle meshes; drives them from `stepIncidentSchedule` |
| `docs/superpowers/playtests/m3-playtest.md` | Manual checklist |

**Modified:**

| Path | Change |
|---|---|
| `src/types.ts` | `GearState` on `TimeOfDayState`? no — add `LocationData.heroLandmark?`; `GameProgress.transmissionMode` + `expertMode`; `VehicleControls.shiftUp` + `shiftDown` |
| `src/state/persistence.ts` + test | `SCHEMA_VERSION → 4`; `DEFAULT_PROGRESS.transmissionMode = 'auto'`, `expertMode = false`; loader validates both |
| `src/data/locations.ts` | `heroLandmark` on the 5 hero zones |
| `src/world/GameWorld.ts` | transmission fields + `shiftUp()`/`shiftDown()`/`toggleEngine()`; `updatePhysics` consults `transmission` + `weatherParams`; wind push; `advanceTimeOfDay` passthrough; night-emissive tick; `IncidentDirector` construct/update/destroy; toll-plaza proximity + `onTollApproach`; expose `currentGear`/`transmissionMode` |
| `src/world/EnvironmentBuilder.ts` | `buildZoneLandmark` switch → call the 5 new builders; add lit-window emissive materials to city zones + a street-lamp pass + coastal aarti lights (none exist today); `setNightFactor(f)` method |
| `src/world/TimeOfDaySystem.ts` | `advanceTimeOfDay(hours)` via `timeOffsetMeters`; keep `update` signature |
| `src/world/TrafficSystem.ts` | `update` — forward brake-distance (heading-aware) + a lane-nudge swerve on top of the existing player slowdown |
| `src/components/SpeedometerGauge.tsx` | take `gear: string` + `transmissionMode` props; drop the internal speed→gear guess |
| `src/components/HUD.tsx` | thread `gear`, `transmissionMode`, `expertMode`, `onShiftUp/onShiftDown/onToggleTransmission`, `onToggleEngine`, toll prompt; render manual-shift buttons when `expertMode` |
| `src/components/MobileControls.tsx` | `onShift?` up/down buttons shown when `expertMode` |
| `src/components/PhotoModeModal.tsx` | journey-card framing overlay (route mini-map + progress + location) on the live preview |
| `src/components/StartScreen.tsx` | "નિષ્ણાત મોડ (Expert)" toggle → manual gears + damage-on |
| `src/App.tsx` | `transmissionMode`/`expertMode` state (persisted); `gear` state from `onGearChange`; shift key handlers (`e`/`q` or `,`/`.`) gated by `expertMode`; `handleAdvanceTime`; toll receipt via `notify`; wire all new HUD props |

---

## Task 1 — Transmission core + persistence (schema v4)

**Files:** create `src/state/transmission.ts`, `src/state/transmission.test.ts`; modify `src/types.ts`, `src/state/persistence.ts`, `src/state/persistence.test.ts`, `src/world/GameWorld.ts`, `src/components/SpeedometerGauge.tsx`, `src/components/HUD.tsx`, `src/App.tsx`.

**Interfaces:**
- Produces:
  ```typescript
  export type TransmissionMode = 'auto' | 'manual';
  export type Gear = 'R' | 'N' | '1' | '2' | '3' | '4';

  /** Forward gears in order; N and R handled separately. */
  export const FORWARD_GEARS: Gear[] = ['1', '2', '3', '4'];

  /** Speed band (km/h) each forward gear is happy in. Upper bound doubles as that gear's cap. */
  export const GEAR_BANDS: Record<'1' | '2' | '3' | '4', { min: number; max: number }> = {
    '1': { min: 0, max: 18 },
    '2': { min: 12, max: 34 },
    '3': { min: 26, max: 52 },
    '4': { min: 44, max: 70 },
  };

  /** Automatic: pick the gear whose band contains the speed (hysteresis via currentGear). */
  export function autoGear(speedKmh: number, currentGear: Gear): Gear;

  /** Torque multiplier applied to base acceleration for the engaged gear.
   *  Lower gears pull harder; 'N'/'R' return their own values. Manual mismatch (too-high gear
   *  at low rpm) returns a "bogging" multiplier < 0.35 so the player feels the wrong gear. */
  export function accelMultiplier(gear: Gear, speedKmh: number, mode: TransmissionMode): number;

  /** That gear's contribution to the speed ceiling (min of this and the physics cap). */
  export function gearMaxSpeed(gear: Gear): number;

  /** Manual shift, clamped to the R..4 ladder. No-op past the ends. */
  export function shiftUp(gear: Gear): Gear;
  export function shiftDown(gear: Gear): Gear;

  /** Engine may start only from a standstill in N or R (or always in auto). */
  export function canStartEngine(mode: TransmissionMode, gear: Gear, speedKmh: number): boolean;
  ```
- `src/types.ts`: `GameProgress` gains `transmissionMode: TransmissionMode` and `expertMode: boolean`. `LocationData` gains `heroLandmark?: 'raniKiVav' | 'somnath' | 'girGate' | 'whiteRann' | 'statueOfUnity'` (used from Task 3; add the type now). Import `TransmissionMode` into `types.ts` from `./state/transmission`? No — to avoid `types.ts → state` coupling, declare `type TransmissionMode = 'auto' | 'manual'` inline in `types.ts` and have `transmission.ts` `import type { TransmissionMode } from '../types'`. Keep `Gear` in `transmission.ts`.

- [ ] **Step 1: Write `src/state/transmission.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  autoGear, accelMultiplier, gearMaxSpeed, shiftUp, shiftDown, canStartEngine, GEAR_BANDS,
} from './transmission';

describe('autoGear', () => {
  it('starts in 1 from rest', () => {
    expect(autoGear(0, 'N')).toBe('1');
    expect(autoGear(5, '1')).toBe('1');
  });
  it('climbs the ladder as speed rises', () => {
    expect(autoGear(20, '1')).toBe('2');
    expect(autoGear(40, '2')).toBe('3');
    expect(autoGear(60, '3')).toBe('4');
  });
  it('drops down as speed falls', () => {
    expect(autoGear(30, '4')).toBe('3');
    expect(autoGear(15, '3')).toBe('2');
    expect(autoGear(6, '2')).toBe('1');
  });
  it('has hysteresis — does not flip-flop at a band edge', () => {
    // 18 km/h is the 1↔2 boundary; whichever gear you are in, you keep it here
    expect(autoGear(18, '1')).toBe('1');
    expect(autoGear(18, '2')).toBe('2');
  });
  it('reports R only from a negative speed, never from auto upshift', () => {
    expect(autoGear(-5, 'N')).toBe('R');
    expect(autoGear(-5, '2')).toBe('R');
  });
});

describe('accelMultiplier', () => {
  it('lower gears pull harder than higher ones at the same speed', () => {
    expect(accelMultiplier('1', 10, 'manual')).toBeGreaterThan(accelMultiplier('3', 10, 'manual'));
  });
  it('auto mode never bogs', () => {
    expect(accelMultiplier('4', 5, 'auto')).toBeGreaterThan(0.5);
  });
  it('manual mode bogs in far-too-high a gear at low speed', () => {
    expect(accelMultiplier('4', 5, 'manual')).toBeLessThan(0.35);
  });
  it('N and R do not drive forward', () => {
    expect(accelMultiplier('N', 0, 'manual')).toBe(0);
  });
});

describe('gearMaxSpeed', () => {
  it('matches the top of each band', () => {
    expect(gearMaxSpeed('2')).toBe(GEAR_BANDS['2'].max);
    expect(gearMaxSpeed('4')).toBe(GEAR_BANDS['4'].max);
  });
  it('R and N are capped low', () => {
    expect(gearMaxSpeed('N')).toBe(0);
    expect(gearMaxSpeed('R')).toBeLessThanOrEqual(18);
  });
});

describe('shiftUp / shiftDown', () => {
  it('walks the R,N,1,2,3,4 ladder', () => {
    expect(shiftUp('R')).toBe('N');
    expect(shiftUp('N')).toBe('1');
    expect(shiftUp('3')).toBe('4');
  });
  it('clamps at the ends', () => {
    expect(shiftUp('4')).toBe('4');
    expect(shiftDown('R')).toBe('R');
  });
});

describe('canStartEngine', () => {
  it('auto: always startable at rest', () => {
    expect(canStartEngine('auto', '2', 0)).toBe(true);
  });
  it('manual: only from a standstill in N or R', () => {
    expect(canStartEngine('manual', 'N', 0)).toBe(true);
    expect(canStartEngine('manual', 'R', 0)).toBe(true);
    expect(canStartEngine('manual', '1', 0)).toBe(false);
    expect(canStartEngine('manual', 'N', 12)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it — confirm every case fails (module missing).**

Run: `./node_modules/.bin/vitest.exe run src/state/transmission.test.ts`
Expected: FAIL (cannot resolve `./transmission`).

- [ ] **Step 3: Implement `src/state/transmission.ts`.**

Hysteresis: in `autoGear`, only upshift when `speed >= currentBand.max`, only downshift when `speed < currentBand.min`; otherwise keep `currentGear`. Negative speed → `'R'`. From `'R'`/`'N'` with `speed >= 1` → `'1'`.
`accelMultiplier`: base `{ '1': 1.6, '2': 1.15, '3': 0.85, '4': 0.6, R: 1.2, N: 0, ... }`; in `manual`, if `speed < GEAR_BANDS[gear].min - 6` return `0.28` (bogging); `auto` skips the bog check.
`gearMaxSpeed`: forward → `GEAR_BANDS[gear].max`; `'R'` → `16`; `'N'` → `0`.

- [ ] **Step 4: Run the tests — confirm all pass.**

- [ ] **Step 5: `src/types.ts` — add `type TransmissionMode = 'auto' | 'manual'`, `GameProgress.transmissionMode: TransmissionMode`, `GameProgress.expertMode: boolean`, `LocationData.heroLandmark?: 'raniKiVav' | 'somnath' | 'girGate' | 'whiteRann' | 'statueOfUnity'`, and `VehicleControls.shiftUp: boolean` + `shiftDown: boolean` (default `false` wherever `VehicleControls` is constructed — `GameWorld.controls` literal and `MobileControls`).**

- [ ] **Step 6: `src/state/persistence.ts` — `SCHEMA_VERSION = 4`; `DEFAULT_PROGRESS.transmissionMode = 'auto'`, `DEFAULT_PROGRESS.expertMode = false`; in `loadProgress` add:**

```typescript
transmissionMode: p.transmissionMode === 'manual' ? 'manual' : DEFAULT_PROGRESS.transmissionMode,
expertMode: typeof p.expertMode === 'boolean' ? p.expertMode : DEFAULT_PROGRESS.expertMode,
```

- [ ] **Step 7: `src/state/persistence.test.ts` — add:**

```typescript
it('is on schema version 4', () => {
  expect(SCHEMA_VERSION).toBe(4);
});
it('round-trips transmissionMode and expertMode with safe defaults', () => {
  expect(loadProgress().transmissionMode).toBe('auto');
  expect(loadProgress().expertMode).toBe(false);
  const p = { ...DEFAULT_PROGRESS, transmissionMode: 'manual' as const, expertMode: true };
  saveProgress(p); flushProgress();
  expect(loadProgress().transmissionMode).toBe('manual');
  expect(loadProgress().expertMode).toBe(true);
});
it('rejects a garbage transmissionMode', () => {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SCHEMA_VERSION, progress: { transmissionMode: 'turbo' } }));
  expect(loadProgress().transmissionMode).toBe('auto');
});
```

- [ ] **Step 8: `src/world/GameWorld.ts` — transmission fields + wiring.**

Add: `public transmissionMode: TransmissionMode = 'auto';` `public currentGear: Gear = 'N';` `public onGearChange?: (gear: Gear) => void;`
Constructor gains `transmissionMode: TransmissionMode = 'auto'` param → `this.transmissionMode = transmissionMode`.
`setTransmissionMode(mode)`, `shiftUp()`, `shiftDown()` (call `transmission.shiftUp/Down`, fire `onGearChange`), `toggleEngine()` (respects `canStartEngine`).
In `updatePhysics`, after the existing cap/accel setup and **before** the accel branch:
```typescript
// Transmission
if (this.transmissionMode === 'auto') {
  this.currentGear = autoGear(this.speed, this.currentGear);
} // manual: this.currentGear is set by shiftUp/shiftDown
const gearMult = accelMultiplier(this.currentGear, Math.abs(this.speed), this.transmissionMode);
acceleration *= gearMult;
maxForwardSpeed = Math.min(maxForwardSpeed, gearMaxSpeed(this.currentGear));
if (this.currentGear === 'N') { acceleration = 0; }
this.onGearChange?.(this.currentGear);
```
Reverse: gate the existing reverse branch on `this.currentGear === 'R'` in manual mode (auto: unchanged — `backward` still reverses at standstill).

- [ ] **Step 9: `src/components/SpeedometerGauge.tsx` — add `gear: string` and `transmissionMode: 'auto' | 'manual'` props; delete the local `let gear = 'N'; if (speed > 45)...` block; render the passed `gear`; show a small `M`/`A` badge from `transmissionMode`.**

- [ ] **Step 10: `src/components/HUD.tsx` + `src/App.tsx` — thread it through.**
`App`: `const [transmissionMode, setTransmissionMode] = useState<TransmissionMode>(initial.transmissionMode);` `const [expertMode, setExpertMode] = useState(initial.expertMode);` `const [gear, setGear] = useState<string>('N');` Add `transmissionMode`, `expertMode` to the `saveProgress({...})` payload + deps (Task 1 only persists — the toggle UI is Task 2). `world.onGearChange = (g) => setGear(g);` Pass `initial.transmissionMode` as the new `GameWorld` constructor arg. Pass `gear={gear}` + `transmissionMode={transmissionMode}` to `<HUD>` → `<SpeedometerGauge>`.

- [ ] **Step 11: `bun run lint` 0 / `bun run build` 0 / `bun run test` green. Commit: `feat: transmission core + gear-aware physics (schema v4)`.**

---

## Task 2 — Manual shift inputs + engine start/stop behind Expert mode

**Files:** modify `src/components/StartScreen.tsx`, `src/components/HUD.tsx`, `src/components/MobileControls.tsx`, `src/App.tsx`, `src/world/GameWorld.ts`.

**Interfaces:**
- Consumes: `GameWorld.shiftUp()` / `shiftDown()` / `toggleEngine()` / `setTransmissionMode()` (Task 1).
- Produces: App handlers `handleShiftUp`, `handleShiftDown`, `handleToggleEngine`, `handleToggleExpertMode`.

- [ ] **Step 1: `StartScreen.tsx` — add an "🔧 નિષ્ણાત મોડ (Expert driving)" checkbox/toggle above Start Engine. Props: `expertMode: boolean`, `onToggleExpertMode: () => void`. Copy: on = "મેન્યુઅલ ગિયર + ડેમેજ ચાલુ", off = "ઓટોમેટિક — સૌ માટે સરળ".**

- [ ] **Step 2: `App.tsx` — `handleToggleExpertMode` flips `expertMode`, and sets `transmissionMode` to `'manual'` when turning Expert on / `'auto'` when off, and calls `worldRef.current?.setTransmissionMode(...)`. Persist both (already in the payload from Task 1). Pass `expertMode` + `onToggleExpertMode` to `<StartScreen>`.**

- [ ] **Step 3: `App.tsx` — keyboard shift, gated by `expertMode` and `isGameStarted`, in the existing `handleGlobalKeys` effect (`src/App.tsx`, the `useEffect([isGameStarted])` that registers `handleGlobalKeys`): `q` → `worldRef.current?.shiftDown()`, `e` → `worldRef.current?.shiftUp()`, `i` → `worldRef.current?.toggleEngine()`. Guard: `if (!expertMode) return;` for `q`/`e` (engine toggle always allowed). Add `expertMode` to that effect's dep array — the world-init effect is keyed on `[isGameStarted]` today; move the key handler to its own `useEffect([isGameStarted, expertMode])` if it is currently nested (confirm at task start).**

- [ ] **Step 4: `HUD.tsx` — when `expertMode`, render two shift buttons near the SpeedometerGauge: "▲ ગિયર" / "▼ ગિયર" → `onShiftUp` / `onShiftDown`; and an engine "🔑 ચાલુ/બંધ" button → `onToggleEngine`. New optional props: `expertMode`, `onShiftUp`, `onShiftDown`, `onToggleEngine`.**

- [ ] **Step 5: `MobileControls.tsx` — accept `expertMode?: boolean` + `onShift?: (dir: 'up' | 'down') => void`; when `expertMode`, add ▲/▼ buttons in the right cluster.**

- [ ] **Step 6: `GameWorld.toggleEngine()` — if turning on and `!canStartEngine(mode, gear, speed)`, keep engine off and `soundManager.playHorn(1)` as the "won't start" cue; else flip `isEngineOn` and start/stop the engine sound. Return the new `isEngineOn`.**

- [ ] **Step 7: lint/build/test green. Manual: Expert off → driving identical to today, gauge shows `A`. Expert on → `M`, `e`/`q` shift, starting in gear 1 refuses with a toot, bogging in 4th at 5 km/h feels sluggish. Commit: `feat: manual gears + engine start-stop behind Expert mode`.**

---

## Task 3 — Rani ki Vav hero landmark (patan_modhera)

**Files:** create `src/world/landmarks/raniKiVav.ts`; modify `src/world/EnvironmentBuilder.ts`, `src/data/locations.ts`.

**Interfaces:**
- Produces: `export function build(): THREE.Group` — origin at ground level, the well descending along **−Z** (away from the road, matching the existing signboard at `z:-22`), footprint ≈ 46 × 30 units, deepest point ≈ −11 y.
- Consumed by: `EnvironmentBuilder.buildZoneLandmark` `case 'patan_modhera'`.

**Silhouette bar (spec §3):** an inverted stepped pyramid — 6–7 receding rectangular terraces stepping *down* into the ground, each ringed with a colonnade of short pillars, a pavilion tower (`kuta`) at the shallow end, sandstone palette. Recognisable as a stepwell from the chase cam, not photoreal.

- [ ] **Step 1: create `src/world/landmarks/raniKiVav.ts`:**

```typescript
import * as THREE from 'three';

const SANDSTONE = new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.9, metalness: 0 });
const SANDSTONE_DARK = new THREE.MeshStandardMaterial({ color: 0xa8814c, roughness: 0.95 });
const WATER = new THREE.MeshStandardMaterial({ color: 0x2f6f6a, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 });

/** Rani ki Vav — inverted stepped well descending along −Z. Caller positions the group. */
export function build(): THREE.Group {
  const g = new THREE.Group();
  const TERRACES = 7;
  for (let i = 0; i < TERRACES; i++) {
    const depth = -i * 1.6;                       // each terrace 1.6 units deeper
    const halfW = 22 - i * 2.6;                    // narrowing toward the shaft
    const zNear = -6 - i * 3.0;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 2, 0.6, 3.0),
      i % 2 ? SANDSTONE : SANDSTONE_DARK,
    );
    slab.position.set(0, depth, zNear);
    slab.receiveShadow = true;
    g.add(slab);
    // colonnade: short pillars along the terrace lip
    const pillarGeo = new THREE.CylinderGeometry(0.35, 0.4, 2.2, 8);
    for (let p = -halfW + 1.5; p <= halfW - 1.5; p += 3.2) {
      const pil = new THREE.Mesh(pillarGeo, SANDSTONE);
      pil.position.set(p, depth + 1.4, zNear + 1.2);
      pil.castShadow = true;
      g.add(pil);
    }
  }
  // water at the bottom of the shaft
  const pool = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 5), WATER);
  pool.position.set(0, -TERRACES * 1.6 + 0.2, -6 - TERRACES * 3.0 - 2);
  g.add(pool);
  // entrance pavilion tower (kuta) at the shallow end
  const tower = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 6), SANDSTONE);
  base.position.y = 2.5;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(3.2, 6, 6), SANDSTONE_DARK);
  spire.position.y = 8;
  tower.add(base, spire);
  tower.position.set(0, 0, -3);
  tower.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  g.add(tower);
  return g;
}
```

Refine the geometry against the "recognisable stepwell" bar during the manual playtest — the numbers above are a working starting point, not sacred.

- [ ] **Step 2: `EnvironmentBuilder.ts` — at the top, `import * as raniKiVav from './landmarks/raniKiVav';`. In `buildZoneLandmark`, replace `case 'patan_modhera': this.buildPatanModheraLandmark(landmarkGroup); break;` with `case 'patan_modhera': landmarkGroup.add(raniKiVav.build()); break;`. Leave `buildPatanModheraLandmark` in the file (unused; do not delete other zones' builders).**

- [ ] **Step 3: `src/data/locations.ts` — add `heroLandmark: 'raniKiVav',` to the `patan_modhera` entry.**

- [ ] **Step 4: `bun run build` — confirm the chunk still builds; note the `dist/assets/index-*.js` size delta in the commit. `bun run lint` 0 / `bun run test` green.**

- [ ] **Step 5: Manual: drive to Patan → the stepwell reads as a stepwell from chase + drone cam. Commit: `feat: Rani ki Vav hero landmark`.**

---

## Task 4 — Somnath + Gir gate hero landmarks

**Files:** create `src/world/landmarks/somnath.ts`, `src/world/landmarks/girGate.ts`; modify `src/world/EnvironmentBuilder.ts`, `src/data/locations.ts`.

**Silhouette bars:**
- **Somnath:** a Chalukya-style temple mass — tall central `shikhara` (stepped pyramidal tower, ~24 units), a lower `mandapa` hall in front with a tiered pyramidal roof, a flag mast on the peak, set on a plinth with a strip of sea (`WATER` plane) and a low shore wall to the **south/front** (toward +Z / the road). Cream stone.
- **Gir gate:** a timber-and-stone **check-post** straddling the road on approach — two stone gate pillars, a horizontal beam with a Gujarati "સાસણ ગીર રાષ્ટ્રીય ઉદ્યાન" board (use the zone's `signboardText`), a boom pole, a ranger hut to one side — backed by a dense wall of canopy (instanced/clustered cones + spheres in `leaf`/`trunk` greens) so the zone reads as forest.

- [ ] **Step 1: create `src/world/landmarks/somnath.ts` — `export function build(): THREE.Group` per the silhouette bar (shikhara = a stack of receding `BoxGeometry`/`CylinderGeometry` drums narrowing upward + a `SphereGeometry` `amalaka` + `ConeGeometry` finial + a thin `CylinderGeometry` flag mast; `mandapa` = a wider box hall with a 3-tier pyramidal `ConeGeometry`(sides:4) roof; plinth = a broad low box; sea = a large thin `WATER`-material plane at y≈−0.1 extending +Z; shore wall = a low box). Materials: local `CREAM_STONE`, `STONE_DARK`, reuse `WATER` pattern from raniKiVav (redeclare locally — do not export a shared material module in this task).**

- [ ] **Step 2: create `src/world/landmarks/girGate.ts` — `export function build(): THREE.Group` per the silhouette bar. The canopy wall: a helper that scatters ~60 tree clumps (`ConeGeometry` foliage + `CylinderGeometry` trunk) in a band behind the gate using a seeded loop (`for i, angle = i*2.4, r = 30 + (i%7)*4`) so it is deterministic. Keep triangle count modest — foliage cones `radialSegments: 6`.**

- [ ] **Step 3: `EnvironmentBuilder.ts` — import both; `case 'somnath': landmarkGroup.add(somnath.build()); break;` and `case 'gir': landmarkGroup.add(girGate.build()); break;`.**

- [ ] **Step 4: `src/data/locations.ts` — `heroLandmark: 'somnath'` on `somnath`, `heroLandmark: 'girGate'` on `gir`.**

- [ ] **Step 5: lint/build/test green (note chunk delta). Manual: Somnath reads as a seaside temple at dusk; Gir reads as "forest + a park gate". Commit: `feat: Somnath + Gir gate hero landmarks`.**

---

## Task 5 — White Rann + Statue of Unity hero landmarks

**Files:** create `src/world/landmarks/whiteRann.ts`, `src/world/landmarks/statueOfUnity.ts`; modify `src/world/EnvironmentBuilder.ts`, `src/data/locations.ts`.

**Silhouette bars:**
- **White Rann:** a very large, almost-flat white `saltMat`-style disc/plane (radius ~140) with a faint hex-crack pattern (a few thin dark lines), the horizon left open (no tall geometry), a cluster of ~12 circular **Rann Utsav tents** (white `ConeGeometry` roofs on short `CylinderGeometry` drums) off to one side, a couple of camel silhouettes optional. The point is *emptiness to the horizon*.
- **Statue of Unity:** the standing figure — a stylised low-poly human silhouette ~30 units tall (torso box tapered, head sphere, two arm boxes at the sides, a robe skirt as a truncated cone), bronze/`bronzeMat` colour, on a tall rectangular plinth (~10 units) with a viewing-gallery band, the Narmada as a wide `WATER` plane behind, a hint of the dam (a long low wall) on the far side.

- [ ] **Step 1: create `src/world/landmarks/whiteRann.ts` — `export function build(): THREE.Group`. Salt plane: `CircleGeometry(140, 48)` with a near-white `MeshStandardMaterial({ color: 0xf3f4f6, roughness: 1 })`, rotated flat, y = −0.02. Cracks: ~8 thin dark `BoxGeometry` slivers scattered on top. Tents: a seeded loop of 12 at `angle = i*0.5, r = 55 + (i%3)*6`.**

- [ ] **Step 2: create `src/world/landmarks/statueOfUnity.ts` — `export function build(): THREE.Group` per the silhouette bar. Keep the figure blocky — this is a silhouette, not a portrait.**

- [ ] **Step 3: `EnvironmentBuilder.ts` — `case 'kutch': landmarkGroup.add(whiteRann.build()); break;` and `case 'statue_of_unity': landmarkGroup.add(statueOfUnity.build()); break;`.**

- [ ] **Step 4: `src/data/locations.ts` — `heroLandmark: 'whiteRann'` on `kutch`, `heroLandmark: 'statueOfUnity'` on `statue_of_unity`.**

- [ ] **Step 5: lint/build/test green. If the combined `src/world/landmarks/*` geometry has pushed the main JS chunk noticeably, add a `build.rollupOptions.output.manualChunks` entry in `vite.config.ts` grouping `src/world/landmarks/` — only if the chunk-size warning meaningfully worsened; note the decision in the commit. Manual: both read at a glance. Commit: `feat: White Rann + Statue of Unity hero landmarks`.**

---

## Task 6 — Day/night: night lighting pass + rest-skip

**Files:** modify `src/world/EnvironmentBuilder.ts`, `src/world/TimeOfDaySystem.ts`, `src/world/GameWorld.ts`, `src/App.tsx`, `src/components/HUD.tsx`.

**Interfaces:**
- `TimeOfDaySystem.advanceTimeOfDay(hours: number): void` — adds `hours / 24 * this.cycleDistance` to an internal `timeOffsetMeters`; `update()` uses `(totalDistanceDriven + this.timeOffsetMeters)` for `rawProgress`. Does not touch `manualMode`.
- `EnvironmentBuilder.setNightFactor(f: number): void` — `f` in `[0, 1]` (0 = full day, 1 = deep night). Sets `emissiveIntensity` on collected lit-window materials to `f * base`, toggles street-lamp point-lights, and ramps the coastal "aarti glow" for `dwarka`/`somnath` to peak around `f ≈ 0.4` (dusk).
- `GameWorld` calls `this.environmentBuilder.setNightFactor(nightFactor)` each frame in `animate`, where `nightFactor = THREE.MathUtils.clamp(-timeState.sunElevation * 1.6 + 0.15, 0, 1)`.
- `GameWorld.advanceTimeOfDay(hours)` → `this.timeOfDaySystem.advanceTimeOfDay(hours)`.

- [ ] **Step 1: `TimeOfDaySystem.ts` — add `private timeOffsetMeters = 0;` and `public advanceTimeOfDay(hours: number) { this.timeOffsetMeters += (hours / 24) * this.cycleDistance; }`. In `update`, change `const totalDistanceDriven` usage: compute `const effectiveDistance = totalDistanceDriven + this.timeOffsetMeters;` and use it for `rawProgress` and the returned `totalDistanceMeters` stays the real one.**

- [ ] **Step 2: `EnvironmentBuilder.ts` — build the night infrastructure (none exists today; `grep emissive` in the file returns nothing, no street lamps).**
  - Add `private nightEmissiveMaterials: { mat: THREE.MeshStandardMaterial; base: number }[] = []` and a `private registerNightEmissive(mat, base)` helper.
  - In the **city/village/monument** zone builders (rajkot, ahmedabad, surat, vadodara, junagadh — grep for their `build*` methods), give a handful of building "window" boxes a shared `MeshStandardMaterial({ color: 0xfde68a, emissive: 0xfde68a, emissiveIntensity: 0 })` registered via `registerNightEmissive(mat, 0.9)`. Keep it to ~6–10 windows per city zone — silhouette lighting, not every pane.
  - Add a **street-lamp pass**: in `buildRoadsideScenery` (grep — currently places verge props), every ~4th roadside prop slot gets a lamp post (`CylinderGeometry` pole + a small `SphereGeometry` head with `emissive: 0xfff3c4`) and a `THREE.PointLight(0xfff3c4, 0, 14)` at the head, collected into `private streetLamps: THREE.PointLight[]`.
  - Add a **coastal aarti** `THREE.PointLight(0xffa94d, 0, 40)` at the `dwarka` and `somnath` landmark origins during `buildZoneLandmark`, collected into `private aartiLights: THREE.PointLight[]`.
  - Add `public setNightFactor(f: number)`: `nightEmissiveMaterials.forEach(({mat, base}) => mat.emissiveIntensity = f * base)`; `streetLamps.forEach(l => l.intensity = f > 0.35 ? 3.5 : 0)`; `aartiLights.forEach(l => l.intensity = THREE.MathUtils.clamp(1 - Math.abs(f - 0.4) * 3, 0, 1) * 4)`.

- [ ] **Step 3: `GameWorld.ts` — in `animate`, after `this.currentTimeOfDayState = timeState;`, add the `setNightFactor` call. Add `public advanceTimeOfDay(hours: number)` passthrough.**

- [ ] **Step 4: `App.tsx` + `HUD.tsx` — a "🛌 વિશ્રામ કરો (Rest till morning)" control. `App.handleRest()` → `worldRef.current?.advanceTimeOfDay(hoursUntil(6))` where it advances to the next 06:00, then `notify({ text: 'સવાર પડી — તાજામાજા થઈને ચાલો!', tone: 'reward' })`. Surface it in the HUD time menu (the existing `onSetTimeFreezeMode` dropdown area) as one more item. (M4 ties this to dhaba stops; M3 is a plain skip.)**

- [ ] **Step 5: lint/build/test green. Manual: drive ~700 m → dusk; temple windows + street lamps light up; the coastal aarti glow blooms at dusk near Dwarka/Somnath; "Rest" jumps to a bright morning. Commit: `feat: night lighting pass + rest-till-morning skip`.**

---

## Task 7 — WeatherDirector: region/time weather + driving effects

**Files:** create `src/state/weatherDirector.ts`, `src/state/weatherDirector.test.ts`; modify `src/world/GameWorld.ts`, `src/App.tsx`.

**Interfaces:**
```typescript
import type { WeatherType } from '../types';

export interface WeatherInput {
  zoneId: string;
  phase: string;              // TimeOfDayState.phase
  distanceDriven: number;     // meters — used to time weather changes
  manualOverride: WeatherType | null; // a HUD toggle wins for one cycle
}

export interface WeatherParams {
  gripMultiplier: number;   // multiplies acceleration & friction (1 = dry)
  fogDensity: number;       // FogExp2 density target
  windPushX: number;        // lateral m/s² nudge on the vehicle (Kutch dust)
  spray: boolean;           // wheel spray particles (rain)
  rainOpacity: number;      // 0..1 for the existing rain Points
}

/** Deterministic weather for a zone/time. distanceDriven bucketed so weather holds for a
 *  stretch, then may change. manualOverride short-circuits. */
export function pickWeather(input: WeatherInput): WeatherType;

/** The driving/visibility parameters for a weather. Every value documented in the spec. */
export function weatherParams(weather: WeatherType): WeatherParams;
```

Selection rules (spec §5): `saputara` → `rain` biased (esp. non-`day` phases); `kutch` → a dust variant → return `'fog'` (reuse the fog visuals) with high `windPushX`; `dwarka`/`somnath`/`dandi` at `dawn`/`sunrise` → `fog` biased; `night` + any coastal → `rain` sometimes; everywhere else → `sunny` mostly, `sunset` visual handled by TimeOfDay not weather. Bucket: `Math.floor(distanceDriven / 600)` seeds a small PRNG so a given stretch is stable and testable.

- [ ] **Step 1: write `src/state/weatherDirector.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { pickWeather, weatherParams } from './weatherDirector';

const base = { phase: 'day', distanceDriven: 0, manualOverride: null } as const;

describe('pickWeather', () => {
  it('manual override always wins', () => {
    expect(pickWeather({ ...base, zoneId: 'rajkot', manualOverride: 'rain' })).toBe('rain');
  });
  it('Saputara is rain-biased', () => {
    const samples = Array.from({ length: 12 }, (_, i) =>
      pickWeather({ ...base, zoneId: 'saputara', distanceDriven: i * 600 }));
    expect(samples.filter((w) => w === 'rain').length).toBeGreaterThan(6);
  });
  it('Kutch is dust/low-visibility biased (returned as fog)', () => {
    const samples = Array.from({ length: 12 }, (_, i) =>
      pickWeather({ ...base, zoneId: 'kutch', distanceDriven: i * 600 }));
    expect(samples.filter((w) => w === 'fog').length).toBeGreaterThan(6);
  });
  it('coastal dawn is fog-biased', () => {
    const samples = Array.from({ length: 12 }, (_, i) =>
      pickWeather({ ...base, zoneId: 'somnath', phase: 'dawn', distanceDriven: i * 600 }));
    expect(samples.filter((w) => w === 'fog').length).toBeGreaterThan(5);
  });
  it('a plain inland day is mostly sunny', () => {
    const samples = Array.from({ length: 12 }, (_, i) =>
      pickWeather({ ...base, zoneId: 'ahmedabad', distanceDriven: i * 600 }));
    expect(samples.filter((w) => w === 'sunny').length).toBeGreaterThan(7);
  });
  it('is deterministic for the same input', () => {
    const a = pickWeather({ ...base, zoneId: 'saputara', distanceDriven: 3000 });
    const b = pickWeather({ ...base, zoneId: 'saputara', distanceDriven: 3000 });
    expect(a).toBe(b);
  });
});

describe('weatherParams', () => {
  it('dry sunny is the 1.0 baseline', () => {
    const p = weatherParams('sunny');
    expect(p.gripMultiplier).toBe(1);
    expect(p.rainOpacity).toBe(0);
    expect(p.windPushX).toBe(0);
  });
  it('rain cuts grip and adds spray', () => {
    const p = weatherParams('rain');
    expect(p.gripMultiplier).toBeLessThan(0.8);
    expect(p.spray).toBe(true);
    expect(p.rainOpacity).toBeGreaterThan(0.4);
  });
  it('fog/dust cuts visibility and (dust) pushes sideways', () => {
    const p = weatherParams('fog');
    expect(p.fogDensity).toBeGreaterThan(weatherParams('sunny').fogDensity);
  });
});
```

- [ ] **Step 2: run — confirm fail. Implement `src/state/weatherDirector.ts`.** Small mulberry32-style PRNG seeded from `hash(zoneId) ^ bucket`. Document each `weatherParams` number in a comment (grip: sunny 1.0, rain 0.68, fog 0.9; fogDensity: sunny 0.0018, fog 0.011, rain 0.005; windPushX: fog-as-dust in Kutch → set on the *caller* side using `zoneId`, so `weatherParams` returns `windPushX: weather === 'fog' ? 2.2 : 0`).

- [ ] **Step 3: run — confirm pass.**

- [ ] **Step 4: `GameWorld.ts` — add `private weatherDistanceBucket = -1;`. In `animate` (or a throttled ~2 Hz check), call `pickWeather({ zoneId: this.currentLocation.id, phase: timeState.phase, distanceDriven: this.totalDistanceDriven, manualOverride: this.manualWeatherOverride })`; when it differs from `this.currentWeather`, call `this.setWeather(next)`. `setWeather` also stashes `this.weatherParamsCache = weatherParams(weather)`. In `updatePhysics`, replace the hard-coded `if (this.currentWeather === 'rain') { acceleration *= 0.75; friction *= 0.65; }` with `acceleration *= this.weatherParamsCache.gripMultiplier; friction *= this.weatherParamsCache.gripMultiplier;` and apply `this.vehiclePos.x += this.weatherParamsCache.windPushX * delta * 0.1` (a gentle lateral drift). Apply `fogDensity` in `setWeather` (the TimeOfDaySystem already overrides fog per-weather — coordinate: let TimeOfDay keep colour, WeatherParams set density; pass the target density into `timeOfDaySystem` via a new `setWeatherFogDensity(d)` setter, or set `scene.fog.density` directly after `timeOfDaySystem.update` in `animate`).**

- [ ] **Step 5: `App.tsx` — the existing `handleChangeWeather` (manual cycle) now sets `worldRef.current.manualWeatherOverride` for one cycle-distance, then clears it (a distance stamp checked in `GameWorld`). Keep the HUD weather button. lint/build/test green. Manual: drive Rajkot→Saputara, grip visibly drops in the rain; Kutch goes hazy with a faint sideways pull; manual toggle still forces a weather. Commit: `feat: region-and-time weather with driving effects`.**

---

## Task 8 — Reactive traffic (brake / swerve for the player)

**Files:** modify `src/world/TrafficSystem.ts`.

**Interfaces:** no new exports. Extend the existing `update(delta, chhakaroPos, isHornActive)` loop. (`GameWorld` already passes `chhakaroPos`; it does **not** pass player heading today — add a 4th param.)
- `GameWorld` change: `this.trafficSystem.update(delta, this.vehiclePos, this.controls.horn, this.vehicleRotation)`.
- `TrafficSystem.update(delta, chhakaroPos, isHornActive, playerHeading = 0)`.

- [ ] **Step 1: `TrafficSystem.update` — replace the current blunt "within `length + 10` → slow to 6.0" with a heading-aware check:**
  - Compute the player's forward vector `(-sin(playerHeading), -cos(playerHeading))` and the vector from agent→player.
  - If the agent is **ahead of the player** (dot > 0) **and** roughly in the player's path (perpendicular offset < 4 units) **and** closing (`distToPlayer < 22`): brake harder — `targetSpeed = Math.min(targetSpeed, distToPlayer < 12 ? 0.5 : 4)`.
  - If the player is **ahead of the agent** and close in the agent's lane: the agent yields to the outer shoulder — set `entity.shoulderYieldOffset = 1.2` and `targetSpeed *= 0.7` for ~1.5 s (a decay timer on the entity, `entity.reactUntil?: number`).
  - Agent↔agent: the existing same-corridor follow check stays; add the same shoulder-nudge when a faster agent is stuck behind a slower one for > 2 s.
  - Add `reactUntil?: number` to the `TrafficEntity` interface.

- [ ] **Step 2: `GameWorld.ts` — pass `this.vehicleRotation` as the new 4th arg. Confirm no other caller of `trafficSystem.update` exists (`grep`).**

- [ ] **Step 3: lint/build/test green (no unit test — Three.js; playtest only). Manual: drive up behind an ST bus → it holds the outer edge and lets you pass; cut in front of a tractor → it brakes rather than driving through you; no gridlock at junctions over a 3-minute drive. Commit: `feat: traffic brakes and yields for the player`.**

---

## Task 9 — IncidentDirector: procedural road incidents

**Files:** create `src/state/incidents.ts`, `src/state/incidents.test.ts`, `src/world/IncidentDirector.ts`; modify `src/world/GameWorld.ts`, `src/App.tsx`.

**Interfaces:**
```typescript
// src/state/incidents.ts — pure scheduler
export type IncidentKind = 'cattle_crossing' | 'stalled_truck' | 'slow_tractor' | 'rain_puddle';

export interface IncidentSpawn {
  id: string;
  kind: IncidentKind;
  /** metres of totalDistanceDriven at which it was placed (for despawn-behind) */
  placedAtDistance: number;
}

export interface IncidentSchedulerState {
  active: IncidentSpawn | null;
  lastEndedAtDistance: number;   // for the min-gap
  nextEligibleAtDistance: number;
}

export function initIncidentSchedule(): IncidentSchedulerState;

/** Advance the schedule. Returns the (possibly changed) state plus a command for the
 *  world layer. Pure — no THREE, no Math.random (caller passes `roll`). */
export function stepIncidentSchedule(params: {
  state: IncidentSchedulerState;
  distanceDriven: number;
  speedKmh: number;
  zoneId: string;
  weather: string;
  roll: number;                  // 0..1, caller supplies Math.random()
}): { state: IncidentSchedulerState; spawn: IncidentSpawn | null; despawn: boolean };
```

Rules: min gap `MIN_GAP_M = 500` after one ends; only eligible when `speedKmh > 15`; `rain_puddle` only when `weather === 'rain'`; `cattle_crossing` weighted up in `gir`/`rajkot`/`saputara`; `slow_tractor` up on non-expressway; spawn when `distanceDriven >= nextEligibleAtDistance && roll < 0.15`; despawn when `distanceDriven - active.placedAtDistance > 180` (it's behind you).

```typescript
// src/world/IncidentDirector.ts
import * as THREE from 'three';
import { IncidentSchedulerState, IncidentSpawn, initIncidentSchedule, stepIncidentSchedule } from '../state/incidents';

export class IncidentDirector {
  constructor(scene: THREE.Scene);
  /** Called each frame from GameWorld.animate. Spawns/despawns meshes ~40 units ahead of the
   *  player along its heading; returns an IncidentSpawn on the frame one appears (for a notify). */
  update(delta: number, playerPos: THREE.Vector3, headingRad: number, distanceDriven: number, speedKmh: number, zoneId: string, weather: string): IncidentSpawn | null;
  /** True while the player is within the active obstacle's slow-zone (GameWorld caps speed). */
  get playerMustSlow(): boolean;
  destroy(): void;
}
```

- [ ] **Step 1: write `src/state/incidents.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { initIncidentSchedule, stepIncidentSchedule } from './incidents';

const p = (over: Partial<Parameters<typeof stepIncidentSchedule>[0]>) => ({
  state: initIncidentSchedule(),
  distanceDriven: 1000, speedKmh: 30, zoneId: 'rajkot', weather: 'sunny', roll: 0.01,
  ...over,
});

describe('stepIncidentSchedule', () => {
  it('spawns when eligible, moving, and the roll passes', () => {
    const r = stepIncidentSchedule(p({}));
    expect(r.spawn).not.toBeNull();
    expect(r.state.active).not.toBeNull();
  });
  it('never spawns below the speed floor', () => {
    expect(stepIncidentSchedule(p({ speedKmh: 8 })).spawn).toBeNull();
  });
  it('never spawns a second incident while one is active', () => {
    const first = stepIncidentSchedule(p({}));
    const second = stepIncidentSchedule(p({ state: first.state, distanceDriven: 1050 }));
    expect(second.spawn).toBeNull();
  });
  it('despawns once the obstacle is behind the player', () => {
    const first = stepIncidentSchedule(p({}));
    const later = stepIncidentSchedule(p({ state: first.state, distanceDriven: 1000 + 200 }));
    expect(later.despawn).toBe(true);
    expect(later.state.active).toBeNull();
  });
  it('respects the min-gap after one ends', () => {
    const first = stepIncidentSchedule(p({}));
    const ended = stepIncidentSchedule(p({ state: first.state, distanceDriven: 1200 }));
    const tooSoon = stepIncidentSchedule(p({ state: ended.state, distanceDriven: 1400, roll: 0.01 }));
    expect(tooSoon.spawn).toBeNull();
  });
  it('rain_puddle only in the rain', () => {
    // force many rolls; a dry run must never yield a puddle
    for (let i = 0; i < 40; i++) {
      const r = stepIncidentSchedule(p({ weather: 'sunny', roll: i / 40, state: initIncidentSchedule() }));
      expect(r.spawn?.kind).not.toBe('rain_puddle');
    }
  });
});
```

- [ ] **Step 2: run — confirm fail. Implement `src/state/incidents.ts`.**

- [ ] **Step 3: run — confirm pass.**

- [ ] **Step 4: implement `src/world/IncidentDirector.ts` — one reusable mesh per kind (cattle = 2–3 `createCow`-style blocky cows walking a short line across the road; stalled truck = a box lorry with hazard-blink emissive; slow tractor = a small tractor mesh crawling; puddle = a flat reflective dark disc). Position 40 units ahead along the heading, snap to the nearest road centre if cheap, else just ahead. `playerMustSlow` true when `playerPos` within ~14 units of the active obstacle.**

- [ ] **Step 5: `GameWorld.ts` — construct `this.incidentDirector = new IncidentDirector(this.scene)` (step 8-ish in the constructor); in `animate` call `const spawned = this.incidentDirector.update(delta, this.vehiclePos, this.vehicleRotation, this.totalDistanceDriven, this.speed, this.currentLocation.id, this.currentWeather); if (spawned) this.onIncident?.(spawned);`. In `updatePhysics`, `if (this.incidentDirector.playerMustSlow) maxForwardSpeed = Math.min(maxForwardSpeed, 12);`. Add `public onIncident?: (i: IncidentSpawn) => void;`. Call `this.incidentDirector.destroy()` in `destroy()`.**

- [ ] **Step 6: `App.tsx` — `world.onIncident = (i) => notify({ text: INCIDENT_TEXT[i.kind], tone: 'warn', speak: false })` with a small Gujarati map (`cattle_crossing: 'ધ્યાન રાખો — ગાયો રસ્તો ક્રોસ કરે છે!'`, `stalled_truck: 'આગળ ટ્રક બગડ્યો છે — ધીમે!'`, `slow_tractor: 'આગળ ધીમું ટ્રેક્ટર — સાચવીને ઓવરટેક કરો.'`, `rain_puddle: 'આગળ ખાબોચિયું — સ્પીડ ઓછી કરો.'`).**

- [ ] **Step 7: lint/build/test green. Manual: a 10-minute drive throws 1–3 incidents, each forces a slow-down and clears behind you; never two at once; never one while parked. Commit: `feat: procedural road incidents`.**

---

## Task 10 — Toll plaza: boom gate + fee + receipt

**Files:** modify `src/world/GameWorld.ts`, `src/world/EnvironmentBuilder.ts` (boom-gate node handle only), `src/App.tsx`.

**Interfaces:**
- `GameWorld.onTollApproach?: (toll: { name: string } | null) => void` — mirrors `onFacilityApproach` but toll-specific, fired once on entry.
- `GameWorld.payToll(): void` — animates the boom gate up (tween a stored `THREE.Object3D` rotation over ~0.8 s), sets a `tollPaidUntilDistance` stamp so it doesn't re-charge, fires nothing else.
- `App`: on the toll prompt, a "₹૩૦ ટોલ ભરો" button → `worldRef.current?.payToll()` + `setCoins(c => c - 30)` + `notify({ text: '🧾 ટોલ ₹૩૦ ભરાયો — રસીદ મળી. સફર ચાલુ!', tone: 'info' })`.

- [ ] **Step 1: `EnvironmentBuilder.ts` — in `buildTollPlaza` (grep for it — currently visual only), keep a reference to the boom-pole mesh: `this.tollBoomGates.push(mesh)` on a new `public tollBoomGates: THREE.Object3D[] = []`. No behaviour change here.**

- [ ] **Step 2: `GameWorld.ts` — the toll is already in `checkFacilityProximity` as `type: 'toll'`. Split it out: when the nearest facility is a toll and newly entered, fire `this.onTollApproach({ name })` instead of routing through `onFacilityApproach` (or keep both — App decides). Add `payToll()` that lerps `this.environmentBuilder.tollBoomGates[0].rotation.z` from 0 → −Math.PI/2 over the next ~0.8 s (a small per-frame tween flag), and stamps `this.tollPaidUntilDistance = this.totalDistanceDriven + 300`. While `totalDistanceDriven < tollPaidUntilDistance`, `checkFacilityProximity` suppresses the toll prompt.**

- [ ] **Step 3: `App.tsx` — render the toll prompt (reuse the `nearbyFacility` pill pattern in HUD, or a dedicated `nearbyToll` state). Button → `payToll` + coins + receipt notify. If `coins < 30`, disable with "પૂરતા સિક્કા નથી".**

- [ ] **Step 4: lint/build/test green. Manual: approach the toll → prompt; pay → boom rises, −₹30, receipt notify, gate stays open as you pass, prompt doesn't re-fire for 300 m. Commit: `feat: working toll plaza with fee and receipt`.**

---

## Task 11 — Photo mode: journey-card framing

**Files:** modify `src/components/PhotoModeModal.tsx`; possibly `src/App.tsx` (pass `visitedLocations`, `totalKm`, `timeOfDay.phaseGujarati`).

**Interfaces:** `PhotoModeModal` gains props `visitedCount: number`, `totalCount: number`, `totalKm: number`, `phaseGujarati: string`, `routeVisitedIds: string[]`. The **export** compositing (Task from M5) is out of scope; M3 adds the **on-screen framing overlay** on the live preview only.

- [ ] **Step 1: `PhotoModeModal.tsx` — add a toggle "🎴 જર્ની કાર્ડ ફ્રેમ" that overlays, on the preview: a bottom bar with `currentLocation.nameGujarati` + `phaseGujarati`, a `visitedCount/totalCount` progress pip row, `toGu(Math.round(totalKm))` km, and a tiny inline Gujarat-outline SVG with the visited zones dotted (reuse `src/components/mapProjection.ts` `projectPoints` + `GUJARAT_LOCATIONS` — it already exists from M1). Pure CSS/SVG over the `<canvas>` preview; not baked into the download yet.**

- [ ] **Step 2: `App.tsx` — pass the new props to `<PhotoModeModal>` (data already in App state: `visitedLocations`, `GUJARAT_LOCATIONS.length`, `totalKm`, `timeOfDay?.phaseGujarati ?? ''`).**

- [ ] **Step 3: lint/build/test green. Manual: photo mode in 3 zones/times → the journey-card frame looks share-worthy; toggling it off returns the plain filtered shot. Commit: `feat: journey-card framing in photo mode`.**

---

## Task 12 — M3 playtest checklist + full run

**Files:** create `docs/superpowers/playtests/m3-playtest.md`.

- [ ] **Step 1: write the checklist covering spec §10 acceptance + regression that M0/M1/M2 still hold** (drive loop, passport, Kaka strip + chat + triggers, nav route queue, voice commands, persistence resume).

- [ ] **Step 2: run it in the browser — no key first, then with a key. Every box passes or the failure is reported (STOP, don't fix inline).** Include an automated no-key smoke pass (boot, HUD, gauge shows the real gear, drive into a hero zone, night falls, weather changes, one incident, toll) as was done for M2.

- [ ] **Step 3: `bun run lint` 0 / `bun run build` 0 / `bun run test` all green. Note the final `dist/assets/index-*.js` size and whether `manualChunks` was added.**

- [ ] **Step 4: commit: `docs: M3 playtest checklist`.**

- [ ] **Step 5: invoke `superpowers:finishing-a-development-branch` for the `m3-world-atmosphere` branch.**

---

## Self-Review

**Spec coverage:**
- §3.1 five hero landmarks → T3 (Rani ki Vav), T4 (Somnath, Gir gate), T5 (White Rann, Statue of Unity); `heroLandmark` field → T1 (type) + T3–T5 (data).
- §3.2 day/night + rest-skip → T6.
- §3.3 weather that changes driving, tied to region/time → T7.
- §3.4 reactive traffic → T8; procedural incidents → T9; toll plaza → T10.
- §3.5 gear system (manual/auto, start/stop, meaningful tacho) → T1 (core + auto) + T2 (manual inputs, Expert opt-in, start/stop).
- §3.6 photo mode framing → T11.
- §6 persistence `transmissionMode` + `expertMode`, schema v4 → T1. Weather/time unpersisted → T6/T7 keep them in `GameWorld` only.
- §7 pure tests: `transmission` (T1), `weatherDirector` (T7), `incidents` scheduler (T9). Playtest checklist → T12.
- §10 acceptance bullets map: "Somnath at dusk looks like Gujarat" → T4+T6; "weather changes handling region by region" → T7; "one procedural incident reads as realistic" → T9; "manual usable, automatic invisible" → T1+T2; gates green + pure coverage → every task + T12.

**Placeholder scan:** the three pure modules (T1, T7, T9) carry full test code and precise signatures. Landmark tasks (T3–T5) give exact file paths, the `EnvironmentBuilder` switch edit verbatim, a working starter geometry for Rani ki Vav, and a concrete primitive-by-primitive silhouette spec for the other four — the geometry *craft* against the "recognisable silhouette" bar is deliberately the implementer's, per spec §8 Risk 1 ("'recognisable silhouette' is the bar, not detail"). Integration tasks (T2, T6, T8, T10, T11) name exact files, methods, params, and copy.

**Type consistency:** `TransmissionMode` declared in `types.ts`, `Gear` in `transmission.ts`, both used consistently in `GameWorld`, `SpeedometerGauge`, `App`. `WeatherType` (existing) reused by `weatherDirector` — no new weather enum. `IncidentKind` defined in `incidents.ts`, consumed by `IncidentDirector` and the `App` copy map. `heroLandmark` union identical in `types.ts` and the five `locations.ts` entries. `GameWorld.update`/`trafficSystem.update` signature changes are each called out with the caller edit.

**Ordering risk:** T1 lands `heroLandmark` on the type but the data + builders come in T3–T5 — `heroLandmark?` is optional so T1–T2 compile and run without it. T2 depends on T1's `GameWorld` methods. T6/T7 both touch `GameWorld.animate` and `setWeather` — T7 explicitly notes the fog-density coordination with the T6 night pass. T9 depends on nothing but T1's branch. Schema bump is once (T1 → v4).

**M0–M2 dependency:** every reference to `notify()`, `GameProgress`/`SCHEMA_VERSION`, `TimeOfDayState`, `mapProjection.ts`, the `nearbyFacility` HUD pattern, and the M2 Kaka surfaces is annotated "confirm at task start". If `main` is not at the M2 merge when M3 begins, STOP.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-31-m3-world-atmosphere.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks.

**2. Inline Execution** — `superpowers:executing-plans`, batched checkpoints.

**Which approach?**
