# M3 — World & Atmosphere: Design Spec

**Date:** 2026-08-30
**Status:** Approved design (elaborates program-overview §4 M3). Step-level plan written at M3 start.
**Depends on:** M0, M1, M2.
**Program context:** `2026-08-30-program-overview.md`

---

## 1. Purpose

Make the world **look and feel like Gujarat**, not like generic 3D scenery. This is the
"screenshot-worthy" milestone: recognisable landmarks, a day/night cycle that changes the
mood, weather that changes how you drive, and traffic that reacts to you. After M3 the game
should survive a muted autoplay clip on social media.

## 2. Current state (post-M2)

- `src/world/EnvironmentBuilder.ts` (~1.4k lines) builds procedural scenery per
  `environmentTheme` (`village`, `temple_coastal`, `salt_desert`, `monument`, …) — blocky,
  generic. `RoadSignBuilder`, `NPCSystem`, `TrafficSystem`, `TimeOfDaySystem` exist.
- `GameWorld`: arcade physics; a distance-driven `TimeOfDaySystem` that already lerps sun +
  lighting; `setWeather('sunny'|'sunset'|'night'|'rain'|'fog')` with rain particles and a
  rain grip modifier (`acceleration *= 0.75; friction *= 0.65`); a Gir 25 km/h cap; 5 camera
  modes.
- `TrafficSystem` spawns ST buses / tractors / autos / cows / bikes but they don't react to
  the player beyond a horn check.
- Photo mode (M0): 6 CSS filters + a location sticker + JPEG download. M1 added the passport
  spread; M2 added the Kaka strip.

## 3. Goals

1. **Five hero landmarks read as the real thing** at a glance: Rani ki Vav (stepped well),
   Somnath (temple silhouette against the sea), the white Rann (flat salt to the horizon +
   the Rann Utsav tents), Statue of Unity (the 182 m figure), Gir (forest canopy + the safari
   gate). Not photoreal — stylised but unmistakable.
2. **A real day/night cycle** the player can feel: golden hour, dusk, night with lit temples
   and headlights mattering, dawn. Time advances with distance (as now) plus a "rest at a
   dhaba/hotel → next morning" jump (ties to M4's dhaba stops if M4 ships first; otherwise a
   simple time skip).
3. **Weather that changes driving:** Saputara monsoon (low grip + spray), Kutch dust storm
   (reduced visibility + a wind push), coastal fog (short draw distance), night rain
   (headlights + reflection). Weather is tied to region/time, not just a manual toggle.
4. **Reactive traffic + procedural incidents:** vehicles brake/swerve for the player and each
   other; occasional cattle-crossing, stalled-truck, slow-tractor, rain-puddle events that
   force a slow-down; a working toll plaza (boom gate + a small fee + a receipt notify).
5. **A gear system:** manual (clutch-feel acceleration curve, H-pattern-lite: N/1/2/3/4/R) or
   automatic; engine start/stop; a tachometer that means something. Default automatic;
   "Expert" toggle enables manual.
6. **Photo mode → share-worthy:** a "journey card" composite (the shot + location + progress
   + a Gujarat outline with your route) exported as one image. (The card itself is finished in
   M5's sharing task; M3 delivers the in-photo-mode framing and the higher-fidelity scene.)

## 4. Non-goals (M3)

- New landmarks beyond the 16. New regions. Interiors of buildings.
- Full vehicle damage model beyond M0's puncture/temperature.
- Multiplayer traffic. Pedestrian AI beyond "walk a path, flinch at horn".
- Real weather data. Physically-based rendering.

## 5. Approach (design decisions)

- **Landmarks:** hand-authored `THREE.Group` builders, one file per hero landmark under
  `src/world/landmarks/` (`raniKiVav.ts`, `somnath.ts`, `whiteRann.ts`, `statueOfUnity.ts`,
  `girGate.ts`), each exporting `build(): THREE.Group` positioned by the caller.
  `EnvironmentBuilder` calls the specific builder for those 5 zones and keeps procedural
  scenery for the other 11. Geometry only — primitives + extrusions + a small palette of
  `MeshStandardMaterial`s; no external model files (CSP / asset-pipeline friction).
- **Day/night:** extend `TimeOfDaySystem` — add lit-window emissive materials that switch on
  below a sun-elevation threshold, a street-lamp pass, and a "temple aarti glow" for the
  coastal temples at dusk. Add `GameWorld.advanceTimeOfDay(hours)` for the rest-skip.
- **Weather:** a `src/world/WeatherDirector.ts` that picks weather from `{ zoneId, timePhase,
  distanceDriven }` (Saputara → rain-biased, Kutch → dust-biased, coast at dawn → fog-biased)
  and drives `GameWorld.setWeather` + per-weather grip/visibility/wind params. Manual toggle
  still overrides for one cycle.
- **Traffic reactions:** extend `TrafficSystem` update — each agent gets a simple
  forward-raycast/brake-distance check against the player and other agents; incidents are a
  small `IncidentDirector` that spawns a scripted obstacle ahead on the road at intervals and
  despawns it behind.
- **Gears:** a `src/state/transmission.ts` pure module — `gearFor(speedKmh, mode)`,
  `accelMultiplier(gear, mode)`, `canStart(engineOn)` — consumed by `GameWorld.updatePhysics`
  and surfaced on the HUD tacho. `App` holds `transmissionMode: 'auto' | 'manual'` (persisted,
  schema bump) and manual shift inputs (keys / mobile buttons).
- **Toll plaza:** the plaza already exists visually (`buildTollPlaza`). Add proximity handling
  like the petrol/garage prompt: a boom-gate animation, a −₹ fee, a `notify` receipt.

## 6. Data / persistence

- `LocationData` gains `heroLandmark?: 'raniKiVav' | 'somnath' | 'whiteRann' | 'statueOfUnity' | 'girGate'`.
- `GameProgress` gains `transmissionMode: 'auto' | 'manual'` and `expertMode: boolean` (drives
  the manual-gears + damage-on options). Schema bump (→ v4).
- Weather/time remain unpersisted.

## 7. Testing

- **Pure (vitest):** `transmission.ts` (gear boundaries, accel multipliers, start/stop guard);
  `WeatherDirector` selection (each zone/time → the expected weather bias); `IncidentDirector`
  scheduling (spawns within range, despawns behind, respects a min-gap).
- **Manual playtest (`m3-playtest.md`):** each hero landmark is recognisable from the chase
  cam; night falls and temples light up; drive into Saputara → rain + noticeably less grip;
  Kutch → dust haze; a cattle-crossing forces a stop; the toll boom gate opens after the fee;
  manual mode: stalling in the wrong gear, shifting up through the tacho; photo mode framing
  looks share-worthy in 3 different zones/times.
- Rendering itself is not unit-tested (program invariant).

## 8. Risks

| Risk | Mitigation |
|---|---|
| Hand-built landmarks eat the milestone | Timebox each to a day; "recognisable silhouette" is the bar, not detail; 5 landmarks, not 16 |
| Weather grip changes make the arcade feel bad | Tune conservatively; every weather has a documented grip %; manual override always available; Kids mode (M4) forces `sunny` |
| Reactive traffic causes gridlock / jank | Keep the raycast cheap; cap agent count as today; incidents are scripted single obstacles, not emergent |
| Manual gears frustrate casual players | Automatic is the default; manual is behind an "Expert" opt-in; automatic still shows the tacho |
| Bundle size (already >500 kB) grows with geometry | Geometry is code, not assets; watch the chunk; consider `manualChunks` for `src/world/landmarks/*` |

## 9. Task outline (step-level plan written at M3 start)

1. `src/state/transmission.ts` + tests; wire into `GameWorld.updatePhysics` + HUD tacho; `transmissionMode`/`expertMode` in `GameProgress` (schema v4).
2. Manual shift inputs (keys + mobile) behind `expertMode`; engine start/stop.
3. `src/world/landmarks/raniKiVav.ts` + `EnvironmentBuilder` hook for `patan_modhera`.
4. `somnath.ts`, `girGate.ts` (+ hooks).
5. `whiteRann.ts`, `statueOfUnity.ts` (+ hooks). `heroLandmark` field in `LocationData`.
6. `TimeOfDaySystem` night pass: lit windows, street lamps, temple aarti glow; `advanceTimeOfDay(hours)`.
7. `src/world/WeatherDirector.ts` + tests; per-weather grip/visibility/wind params; tie to zone/time; keep manual override.
8. `TrafficSystem` reaction pass (brake/swerve raycast).
9. `src/world/IncidentDirector.ts` + tests; cattle-crossing / stalled-truck / slow-tractor / puddle.
10. Toll plaza proximity: boom gate + fee + receipt notify.
11. Photo mode: journey-card framing (composite preview; export finished in M5).
12. `docs/superpowers/playtests/m3-playtest.md` + full run + gates.

## 10. Acceptance

- A muted 20-second autoplay clip driving past Somnath at dusk looks like Gujarat, not a demo.
- Weather visibly changes how the chhakaro handles, region by region.
- A first-timer hits at least one procedural incident in a 10-minute session and it reads as "that's realistic", not "that's a bug".
- Manual mode is usable by someone who's driven a stick; automatic is invisible to everyone else.
- `bun run lint`/`test`/`build` green; the pure modules (transmission, weather, incidents) have coverage.
