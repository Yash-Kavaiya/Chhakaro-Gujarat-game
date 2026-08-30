# M5 — Share & Modes: Design Spec

**Date:** 2026-08-30
**Status:** Approved design (elaborates program-overview §4 M5). Step-level plan written at M5 start.
**Depends on:** M0, M1, M2, M3, M4.
**Program context:** `2026-08-30-program-overview.md`

---

## 1. Purpose

Give the finished game **reach**: a reason to score, a thing to share, a way for
non-drivers to watch, an install button, and a light story to frame the trip. This is the
last milestone — after it, the program is "done" as a portfolio piece.

## 2. Current state (post-M4)

- Full loop (M1), AI companion (M2), atmospheric world (M3), culture + modes (M4).
- `GameProgress` at schema v5 with visited/stamps/foods/souvenirs/achievements/missions/
  quiz/customization/mode/accessibility.
- Photo mode (M0+M3) produces a framed shot; M3 left the "journey card" composite preview
  in place for M5 to finish as a real export.
- `notify()`, `VoiceQueue`, `src/state/*` pure-module convention, playtest-checklist convention.

## 3. Goals

1. **Scoring & challenges.** A **driving score** (smooth braking, no crashes, speed-limit
   compliance, clean cornering), an **eco score** (fuel efficiency, low idling), a per-session
   run summary, and **daily challenges** ("visit 3 coastal places", "drive 50 km without a
   collision", "complete a food-book region"). A **local leaderboard** (best safe drive,
   most places discovered, best fuel efficiency, best quiz score) — device-local, no backend.
2. **Shareable journey card.** One tappable "share" action anywhere → a composed PNG:
   a hero screenshot (or a stylised Gujarat outline with the player's route traced), the
   headline ("Yash toured 68% of Saurashtra · 12/16 stamps · 340 km"), region progress bars,
   a couple of badges, and a small "છકડામાં ગુજરાત" mark. Download + Web Share API where
   available.
3. **Cinematic auto-tour.** "Sit back" mode: the AI drives a scenic route (reuses M2's route
   queue + M4's Tourist-mode assists cranked to full auto), the camera runs cinematic/drone
   angles, Kaka narrates each place, and the player can take over at any time. A one-click
   "auto-tour of everything I've visited" and "auto-tour the whole state".
4. **PWA.** Installable from the browser: a web manifest (name, icons, theme colour,
   standalone display, `lang="gu"`), a service worker that caches the app shell + built assets
   for offline load (the game itself runs client-side; only the Kaka API needs the network,
   and it already has a local fallback). "Add to home screen" prompt handling.
5. **Story framing — the travel diary.** A light narrative wrapper: the player "inherits" an
   old Gujarat travel diary with an unfinished journey; each chapter points at a place with a
   short diary entry (Gujarati), visiting it "completes" the entry and reveals the next.
   Fully optional — it sits on top of the free-roam loop, never blocks it, and finishing all
   chapters is the "100% story" achievement.

## 4. Non-goals (M5)

- Any server-side leaderboard, accounts, or cross-device sync.
- Real social-network posting integrations beyond the Web Share API / download.
- Video export (image card only).
- A full branching story — the diary is linear, one entry per place, flavour not plot.
- Turning auto-tour into a screensaver product.

## 5. Approach (design decisions)

- **Scoring:** `src/state/scoring.ts` (pure) — a `DrivingScoreAccumulator` fed per-frame
  samples (speed, brake input, collision events, over-limit flag from M3's weather/Gir/road
  limits) → a 0–100 score + a breakdown; `EcoScoreAccumulator` fed fuel-delta + idle time.
  `App` owns the accumulators for the session; the run summary shows on stop / on demand.
- **Challenges:** `src/data/challenges.ts` — a pool of `DailyChallenge` (`{ id, textGu,
  predicate-kind, target }`); `src/state/challenges.ts` (pure) picks 3 per in-game day
  (seeded by the date) and evaluates progress against session + persisted state. Completion →
  coins + a `notify`.
- **Leaderboard:** `src/state/leaderboard.ts` (pure) + a `leaderboard` slice in `GameProgress`
  (schema v6) — top-N per category, updated at run end. A `LeaderboardModal`.
- **Journey card:** `src/state/journeyCard.ts` builds the data model (progress, badges,
  route point list); `src/components/JourneyCard.tsx` renders it to an offscreen `<canvas>`
  (or SVG → canvas) → `toBlob` → download + `navigator.share`. The Gujarat-outline route
  trace reuses M1's `mapProjection.ts`.
- **Auto-tour:** `src/state/autoTour.ts` — given a set of location ids, produce the route
  queue; `App` sets `gameMode` context to a new `'cinematic'` sub-state that (a) hands full
  steering/throttle to a simple "follow the nav bearing" autopilot in `GameWorld`
  (`GameWorld.setAutopilot(target | null)` — a small, contained addition, the only M5 world
  edit), (b) forces cinematic/drone camera rotation, (c) lets Kaka narrate on each arrival,
  (d) shows a "take over" prompt that returns control instantly.
- **PWA:** `public/manifest.webmanifest`, an icon set (generated from the existing emoji/brand
  — a simple SVG → PNG at build), `vite-plugin-pwa` (or a hand-written service worker if the
  plugin conflicts with the Express-served setup — the SW must not intercept `/api/*`).
  `index.html` gets the manifest link + theme-colour meta.
- **Diary:** `src/data/diary.ts` — 16 linear `DiaryChapter` entries (`{ locationId, entryGu,
  revealHintGu }`); `src/state/diary.ts` (pure) tracks the current chapter from
  `visitedLocations`; a `DiaryModal` + a subtle HUD "📖 chapter N" affordance. Persisted
  (schema v6). Visiting the chapter's place auto-advances it.

## 6. Data / persistence

Schema → **v6**. `GameProgress` gains: `leaderboard: Record<string, LeaderEntry[]>`,
`challengeState: { day: string; completed: string[]; progress: Record<string, number> }`,
`bestScores: { driving: number; eco: number }`, `diaryChapter: number`,
`storyComplete: boolean`. Session-only: the live score accumulators, the current run summary,
auto-tour state.

## 7. Testing

- **Pure (vitest):** `scoring.ts` (a scripted sample sequence → the expected score + breakdown;
  a clean run scores high, a crash-heavy run scores low); `challenges.ts` (date-seeded pick is
  deterministic; each predicate evaluates correctly; completion gating); `leaderboard.ts`
  (insert/sort/trim per category); `journeyCard.ts` (data model from a given `GameProgress`);
  `autoTour.ts` (route from visited set / whole state, sensible order); `diary.ts` (chapter
  advances only on the right visit, never skips, `storyComplete` at the end).
- **Manual playtest (`m5-playtest.md`):** a clean drive scores well and a reckless one badly;
  the daily challenges show, track, and pay out; the run summary appears on stop; the
  leaderboard records a run and persists; "share" produces a correct PNG that downloads (and
  invokes the share sheet on a supporting device); auto-tour drives a real route with
  cinematic camera + Kaka narration and "take over" works instantly; the app installs as a
  PWA and loads offline (Kaka falls back to local); the diary reveals chapter by chapter as
  you visit places and completes.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Scoring feels arbitrary / punishing | Transparent breakdown; generous baseline; Kids/Tourist modes don't score; it's a "nice run!" summary, not a gate |
| Journey-card canvas compositing + fonts (Gujarati) is fiddly | Use the already-loaded web fonts; render at 2× then downscale; test on the 3 target browsers; fall back to a text-only card if canvas text fails |
| PWA service worker breaks the Express `/api` proxy or dev HMR | SW scoped to exclude `/api/*` and only active in production build; test install + offline explicitly; keep dev unaffected |
| Auto-tour autopilot fights the arcade physics | `setAutopilot` just steers toward the nav bearing at a capped speed — the simplest possible follower; "take over" clears it instantly; it's a contained `GameWorld` addition |
| Diary makes the game feel linear | It's strictly optional, never blocks free-roam, one flavour entry per place; the achievement is the only reward |
| Six schema bumps across the program with reset-on-mismatch | Acceptable for a portfolio piece with no real users; documented in the program overview; a one-time migration could be added before any public release if wanted |

## 9. Task outline (step-level plan written at M5 start)

1. `src/state/scoring.ts` (driving + eco accumulators) + tests; App session wiring; run-summary modal on stop.
2. `src/data/challenges.ts` + `src/state/challenges.ts` + tests; daily pick + progress + payout; `GameProgress` v6 (challenge/score slices).
3. `src/state/leaderboard.ts` + tests; `LeaderboardModal`; record at run end; persist.
4. `src/state/journeyCard.ts` + `src/components/JourneyCard.tsx` (canvas compose) + tests; share/download; a "share" entry point in the passport + run summary.
5. `GameWorld.setAutopilot` (contained); `src/state/autoTour.ts` + tests; cinematic sub-mode (camera + narration + take-over); "auto-tour my Gujarat" / "auto-tour everything" entry points.
6. PWA: `manifest.webmanifest` + icons + SW (prod-only, `/api` excluded) + install-prompt handling; verify offline load + Kaka fallback.
7. `src/data/diary.ts` + `src/state/diary.ts` + tests; `DiaryModal` + HUD affordance; auto-advance on visit; `storyComplete` achievement.
8. `docs/superpowers/playtests/m5-playtest.md` + full run + gates. Final program-level whole-branch review.

## 10. Acceptance

- Every session ends with a score you understand and (sometimes) want to beat.
- One tap produces a share-worthy image of your Gujarat progress.
- A non-driver can hit "auto-tour" and watch a narrated cinematic trip, then take the wheel.
- The game installs to a phone home screen and opens offline.
- The travel-diary story can be followed start-to-finish and never gets in the way of free-roam.
- `bun run lint`/`test`/`build` green; all pure modules covered; the final whole-branch review is clean.

---

## Program close-out (after M5)

Once M5's whole-branch review is clean:
- Update `README.md` to the finished feature set.
- Update `2026-08-30-program-overview.md` §4 status column to ✅ across the board.
- Run `superpowers:finishing-a-development-branch` for the integration decision (the branch has carried the whole program; reconcile with wherever `main` has moved).
- Delete the SDD workspaces under `.superpowers/sdd/`.
