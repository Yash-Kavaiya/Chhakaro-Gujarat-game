# M4 — Culture & Depth: Design Spec

**Date:** 2026-08-30
**Status:** Approved design (elaborates program-overview §4 M4). Step-level plan written at M4 start.
**Depends on:** M0, M1, M2, M3.
**Program context:** `2026-08-30-program-overview.md`

---

## 1. Purpose

Reward exploration and make the game **teach**, without turning it into a lecture. This is the
milestone that makes people replay: festivals to catch, a chhakaro to make yours, Gujarati
words to pick up, and modes that fit different players (kids, teachers, accessibility needs).

## 2. Current state (post-M3)

- Data already rich: 16 locations, ~30 foods (`GUJARAT_FOODS`), 9 achievements, 8 souvenirs,
  radio stations, 6 quizzes — all authored in Gujarati.
- `FoodPassportModal` (mark foods discovered), `SouvenirShopModal` (buy per-location souvenirs),
  `GarageModal` (`bodyColor`, `stickerText`, `hornType`, `flagColor`, tassels, canopy) exist.
- M1's passport spread shows stamps + region tallies + achievements. M2's Kaka can talk
  culture on request. M3 added hero landmarks + weather + day/night.
- `SoundManager` has procedural horn/engine/bell; `RadioAudioEngine` + `InCarRadio` exist.

## 3. Goals

1. **Seasonal event zones.** Navratri garba ground (Vadodara/Ahmedabad), Uttarayan kite skies
   (Ahmedabad), Rann Utsav tent city (Kutch) — each a time-limited, visitable overlay on its
   host zone with its own music, crowd, lighting, and a small activity (spin the garba, cut a
   kite, watch the Rann sunset). Which event is "active" is driven by an in-game calendar
   (and a debug override).
2. **Make the chhakaro yours.** Garage expansion: **regional skins** (Kutchi lippan-art,
   Kathiyawadi, Gir-lion, Rann-white, Navratri), a **horn collection** (unlocked by
   achievements), **custom number plate** (player text, Gujarati or English), decorations
   (mirror tassels, deities, stickers, wheel styles). Everything persists.
3. **Collections become an arc.** The food book ("ગુજરાતી ભોજન પુસ્તક") and souvenir album get
   completion tiers, per-region sub-goals, and a reward at 100% (a unique skin + a Kaka line).
4. **Gujarati vocabulary mode.** Per-place words (પટોળા, વાવ, ભૂંગા, ડણક…) with pronunciation
   (audio via `VoiceQueue`), meaning, and a usage sentence. Surfaced in the History Card and
   as a small "શબ્દ ભંડોળ" collectible list. Useful for kids and outside tourists.
5. **Dhaba / tea stops + driver energy.** Roadside dhabas: stop for chai / fafda-jalebi /
   rotlo-oro / chaas; each restores a `driverEnergy` bar that slowly drains on long drives;
   at low energy the screen desaturates and Kaka nudges a break. A dhaba is also the "rest →
   next morning" trigger for M3's time skip.
6. **Player modes.**
   - **Kids mode:** no collisions, gentle handling, weather forced sunny, larger UI, every
     landmark auto-narrates simply, quizzes are 2-option, fun animals emphasised.
   - **Tourist mode:** assisted steering toward the nav target, automatic route following, no
     damage/fuel pressure — sit back and see Gujarat.
   - **Expert mode:** (from M3) manual gears, damage, fuel, weather grip, traffic fines.
   - **Accessibility:** subtitles for all Kaka speech, adjustable narration speed, larger
     Gujarati text scale, colour-blind-safe HUD palette, reduce-motion (less camera shake,
     no confetti).
7. **Educational / school mode.** A teacher picks a region and a theme (heritage / nature /
   food / freedom-struggle); the game runs a guided, low-friction tour of that region's
   places with expanded narration and a printable summary of what was covered.

## 4. Non-goals (M4)

- New landmarks/regions. A real-money economy. A tour-company management layer.
- Full festival simulations (garba is a rhythm mini-interaction, not a dance game).
- Localisation beyond Gujarati + the existing English parentheticals.
- Multiplayer festival zones.

## 5. Approach (design decisions)

- **Calendar & events:** `src/state/calendar.ts` (pure) maps an in-game day to an active
  event or none; `src/world/events/<event>.ts` builders overlay the host zone (crowd
  instancing, event lighting, an event-specific `RadioAudioEngine` track). `App` holds
  `activeEvent` from the calendar + a settings override.
- **Garage:** data-drive everything. `src/data/garage.ts` — `SKINS`, `HORNS`, `PLATE_STYLES`,
  `DECORATIONS`, each with an unlock rule (`always` | `achievement:<id>` | `collection:<name>`
  | `event:<id>`). `ChhakaroModel.updateCustomization` extended to apply skins (swap material
  set) + plate text (canvas texture) + decoration toggles. `ChhakaroCustomization` +
  `GameProgress.customization` grow; schema bump (→ v5).
- **Collections:** `src/state/collections.ts` (pure) — `foodBookProgress`, `souvenirProgress`,
  per-region breakdowns, tier thresholds, `completionReward(collection)`.
- **Vocabulary:** `src/data/vocabulary.ts` — `Record<locationId, VocabWord[]>` (`{ gu, roman,
  meaningGu, meaningEn, usageGu }`). A `VocabModal` / a section in the History Card.
  Pronunciation plays `word.gu` through `VoiceQueue`.
- **Driver energy:** `src/state/driverEnergy.ts` (pure) — drain per km, restore per item;
  `App` holds `driverEnergy` (unpersisted — a session mechanic like fuel). Low-energy visual
  = a CSS `filter: saturate()` on the canvas container + a Kaka nudge trigger (extends M2's
  `kakaTriggers`).
- **Modes:** `src/state/gameMode.ts` — `type GameMode = 'kids' | 'tourist' | 'standard' | 'expert'`
  and an `AccessibilitySettings` object; a pure `modeConfig(mode)` returning the flags
  (`collisions`, `fuelPressure`, `weatherGrip`, `assistSteering`, `uiScale`, `quizOptions`,
  `autoNarrate`). Persisted (schema v5). `App`, `GameWorld`, `HUD`, and the quiz/narration
  paths read `modeConfig`. Accessibility settings persist and apply globally (subtitle layer
  under the Kaka strip; `VoiceQueue` gets a `rate` param; a `data-ui-scale` / palette on the
  root).
- **School mode:** a wrapper flow (`src/state/schoolTour.ts`) that builds a route queue (reuses
  M2's `setRouteQueue`) from `{ region, theme }`, forces Tourist-mode assists + expanded
  narration, and at the end renders a summary (places, facts, words, foods covered) as
  printable HTML.

## 6. Data / persistence

Schema → **v5**. `GameProgress` gains: `unlockedSkins: string[]`, `unlockedHorns: string[]`,
`customPlate: string`, `gameMode: GameMode`, `accessibility: AccessibilitySettings`,
`collectionTiers: Record<string, number>`, `vocabularyLearned: string[]`. `customization`
grows (skin id, plate, decoration flags). Driver energy, active event, and school-tour state
are session-only.

## 7. Testing

- **Pure (vitest):** `calendar.ts` (day → event, off-season → none), `collections.ts` (tier
  thresholds, per-region math, reward gating), `driverEnergy.ts` (drain/restore, floor/cap),
  `gameMode.ts` (`modeConfig` for all 4 modes + accessibility flags), garage unlock-rule
  evaluation, `schoolTour.ts` route construction (valid ordered ids per region/theme).
- **Manual playtest (`m4-playtest.md`):** force each event → the zone overlay + music appears;
  buy/equip a skin + set a plate → the chhakaro shows it and it survives refresh; complete the
  food book → the reward fires; a vocab word plays its pronunciation; drive long → energy
  drops, screen desaturates, Kaka nudges, a dhaba chai restores it; toggle Kids mode → no
  collisions, big UI, sunny; Accessibility → subtitles appear, narration slows, palette shifts;
  School mode → pick "સૌરાષ્ટ્ર / heritage" → a guided tour runs and produces a summary page.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Event overlays are a lot of 3D work | Reuse M3 crowd/lighting tech; one "hero" activity per event, not a full festival |
| Garage skin system balloons `ChhakaroModel` | Data-driven material sets; a skin is a palette swap + decoration flags, not new geometry |
| Modes multiply QA surface | `modeConfig` is one pure function; every consumer reads it; the playtest matrix is mode × 3 zones, kept small |
| Accessibility done as an afterthought | Subtitles + narration rate + palette + reduce-motion are the scoped set; ship them as a first-class settings panel, tested |
| School mode is niche | It's a thin wrapper over M2's route queue + Tourist mode + expanded narration — low cost, high "this is a real product" signal |
| Vocabulary/history facts unreviewed | Fold a Gujarat-knowledgeable content review into this milestone (program §9 Q3) |

## 9. Task outline (step-level plan written at M4 start)

1. `src/state/gameMode.ts` + `modeConfig` + `AccessibilitySettings` + tests; `GameProgress` v5; settings panel; wire consumers (collisions/fuel/weather/quiz/narration/UI scale).
2. Accessibility layer: subtitles under the Kaka strip, `VoiceQueue` `rate`, root palette + `data-ui-scale`, reduce-motion.
3. `src/data/garage.ts` (skins/horns/plates/decorations + unlock rules) + `src/state/garageUnlocks.ts` + tests.
4. `ChhakaroModel` skin material-sets + plate canvas texture + decoration toggles; `GarageModal` rebuilt around the data; `customization` + persistence.
5. `src/state/collections.ts` + tests; food-book & souvenir completion tiers + rewards in the passport/food/souvenir modals.
6. `src/data/vocabulary.ts` + `VocabModal` / History-Card section; pronunciation via `VoiceQueue`; `vocabularyLearned` collectible.
7. `src/state/driverEnergy.ts` + tests; energy bar; low-energy desaturate + Kaka nudge trigger; dhaba proximity + tea/food stop UI + restore.
8. `src/state/calendar.ts` + tests; `activeEvent` in App + debug override.
9. `src/world/events/navratri.ts` + host-zone overlay + garba mini-interaction.
10. `src/world/events/uttarayan.ts` + `rannUtsav.ts` overlays + one activity each.
11. `src/state/schoolTour.ts` + tests; teacher flow (region/theme pick → route + assists + expanded narration → printable summary).
12. Content review pass (history cards, quiz facts, vocab, Kaka branches) with a Gujarat-knowledgeable reviewer; fix findings.
13. `docs/superpowers/playtests/m4-playtest.md` + full run + gates.

## 10. Acceptance

- During a festival window, the host zone visibly transforms and has a thing to do.
- A player can build a chhakaro that feels theirs (skin + plate + horn + decorations) and it persists.
- Finishing the food book or souvenir album feels earned and pays out.
- Kids mode is genuinely playable by a child; Tourist mode lets a non-gamer see Gujarat hands-off; Accessibility settings work and are discoverable.
- A teacher can run a 15-minute regional tour in class and walk away with a summary of what was taught.
- Every history/quiz/vocab fact has passed a knowledgeable review.
- `bun run lint`/`test`/`build` green; all pure modules covered.
