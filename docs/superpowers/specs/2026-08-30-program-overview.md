# છકડામાં ગુજરાત — Program Overview & Roadmap Spec

**Date:** 2026-08-30
**Status:** Living document — the single source of truth for scope across all milestones
**Audience:** portfolio / demo piece (a stranger plays for 3–10 minutes and comes away impressed)

---

## 1. Vision

Turn `Chhakaro-Gujarat-game` from an AI-Studio-exported tech demo into a **Gujarat Tourism
Simulator built around the iconic Saurashtra _chhakaro_** (three-wheeler): drive a hand-built
3D Gujarat, discover 16 real landmarks, learn verifiable history in Gujarati, and be guided
by **કાનજી કાકો** — an AI companion who knows where you are, what's nearby, and what you're
doing.

The bar is **depth and polish on a focused set of features**, not breadth across the ~110-item
brainstorm. 30 features that all feel finished read as impressive; 110 half-features read as
unfinished.

## 2. The gameplay loop

```
Select journey  →  Start chhakaro  →  Drive  →  Discover a place
      ↑                                                   ↓
Unlock next  ←  Earn coins + stamp  ←  Do an activity  ←  AI Gujarati narration
      ↑              (eat / collect / photograph / quiz)         ↓
Upgrade chhakaro  ←────────────────────────────────────  Kaka suggests where next
```

Every loop turn should take 1–3 minutes and end with a reason to keep going.

## 3. The 7 systems

| System | Owns | Milestones that touch it |
|---|---|---|
| **World** | Gujarat zones, roads, weather, day/night, landmarks | M0, M3 |
| **Vehicle** | physics, fuel, damage, customization, gears | M0, M3 |
| **Tour** | destinations, narration, history cards, maps, navigation | M1 |
| **AI** | Kanji Kaka context, voice in/out, recommendations, trip generator | M2 |
| **Game** | missions, coins, achievements, passport, scoring | M0, M1, M5 |
| **Culture** | food, festivals, music, crafts, clothing | M0 (data), M4 |
| **Social** | leaderboards, shareable cards, cinematic auto-tour, PWA | M5 |

## 4. Milestones

Each milestone is **independently demoable** — the program can stop after any of them with
something complete-feeling. Milestones are strictly sequential (each builds on the last).

| # | Name | One-line goal | Spec | Plan | Status |
|---|---|---|---|---|---|
| **M0** | Stabilize & Persist | The existing game builds clean under `strict`, every interaction works, progress persists | `2026-08-30-m0-m1-stabilize-and-tour-loop-design.md` §4 | `2026-08-30-m0-stabilize-and-persist.md` | ✅ implemented (14/14 tasks), whole-branch review pending |
| **M1** | Core Tour Loop | Discover → learn → do → reward → onward feels deliberate in a ~10-min session | same doc §5 | `2026-08-30-m1-core-tour-loop.md` | 📋 planned |
| **M2** | Kanji Kaka — the AI companion | An always-on, context-aware Gujarati guide: fixed AI wiring, live context, proactive narration, voice in + voice out, trip generator | `2026-08-30-m2-kanji-kaka-design.md` | `2026-08-30-m2-kanji-kaka.md` | 📋 planned |
| **M3** | World & Atmosphere | Recognisable landmark models, day/night that matters, weather that affects handling, reactive traffic, gears, share-worthy photo mode | `2026-08-30-m3-world-atmosphere-design.md` | written at M3 start | 🎨 designed |
| **M4** | Culture & Depth | Seasonal event zones, garage skins, kids/accessibility modes, dhaba stops, vocabulary mode | `2026-08-30-m4-culture-depth-design.md` | written at M4 start | 🎨 designed |
| **M5** | Share & Modes | Local leaderboard + scoring, shareable journey card, cinematic auto-tour, PWA, story framing | `2026-08-30-m5-share-modes-design.md` | written at M5 start | 🎨 designed |

**Why M3–M5 have specs but no detailed plans yet:** a detailed, no-placeholder plan is only
honest when written against the code it will actually touch. Writing a task-by-task plan for
M4 today — three milestones of code churn away — would be fiction. Each milestone follows the
same cycle: **this program spec → milestone design spec → milestone implementation plan
(written at milestone start) → subagent-driven execution → whole-branch review**. M3–M5's
design specs each carry a *task outline* (the shape of the work) so the scope is locked; the
step-level plan is filled in when its turn comes.

## 5. Cut for this program (not a portfolio priority)

Deferred indefinitely — high build cost, low demo payoff, most viewers never reach them:

- Real-time multiplayer / convoy / voice chat
- AR mode (table-top chhakaro)
- VR / WebXR driver seat
- Offline regional download packs
- Cross-device cloud saves
- The 33-district completion challenge
- Ferry / train mini-experiences
- Tour-business economy / company-building mode
- Full NPC branching-dialogue trees

If the project outgrows "portfolio piece", revisit — but not before M5 ships.

## 6. Cross-milestone architecture invariants

These hold from M0 onward and every milestone plan must preserve them:

- **`src/App.tsx` owns all game state.** Modal/HUD components are presentational (data + callbacks in).
- **Pure logic lives in `src/state/`** with a colocated `.test.ts` (persistence, achievements, mission-matching, navigation, exploration, …). Vitest is the only test layer; 3D/audio/rendering are covered by written manual playtest checklists in `docs/superpowers/playtests/`.
- **`bun run lint` (`tsc --noEmit`, strict) is a required gate** at the end of every task, forever.
- **`bun` is the package manager.** Never introduce npm/yarn lockfiles.
- **Reward feedback goes through one `notify()` helper** (introduced M1). No scattered `setFloatingBanner` + ad-hoc `soundManager.*`.
- **Vehicle sim state (fuel, engine temp, puncture, weather, time) is never persisted** — always fresh each session. Only the `GameProgress` slice persists to `localStorage` under `chhakaro-gujarat-save-v1`.
- **The 3D world code (`src/world/*`) is modified only where a milestone plan explicitly names the edit.** No opportunistic refactoring of `EnvironmentBuilder` / `NPCSystem` / `TrafficSystem` / `ChhakaroModel` / `RoadSignBuilder` / `TimeOfDaySystem`.
- **Gujarati-first copy**, English in parentheses only where surrounding code already does so.
- **Historical/cultural facts must be verifiable.** No invented history in narration, history cards, or quiz explanations.

## 7. Deployment

Google AI Studio → Cloud Run. The Express server (`server.ts`) serves the built SPA and
proxies Gemini via two endpoints (`/api/gemini/guide`, `/api/gemini/tts`), each with a local
fallback so the app is fully playable with no API key. `GEMINI_API_KEY` is server-injected in
production. This does not change across milestones.

## 8. Definition of "done" for the program

The program is shippable as a portfolio piece **after M2** (stable game + satisfying loop +
the signature AI companion). M3–M5 are polish and reach. A reasonable public release is
**M0–M3**; M4–M5 are "if there's appetite".

## 9. Open program-level questions

1. **Hosting the AI in the demo.** AI Studio → Cloud Run assumes a key. For a shared portfolio
   link with no key, M2's expanded local fallback must be good enough to demo Kaka convincingly.
   Decision needed before M2 ships: is there a funded key for the public demo, or is the
   scripted fallback the demo experience?
2. **Voice quality.** Web Speech API `gu-IN` TTS quality varies wildly by browser/OS. Gemini
   TTS (`gemini-3.1-flash-tts-preview`) is better but needs a key and is Preview-status. M2
   must degrade gracefully between the two.
3. **Content review.** Every history card / quiz fact / Kaka claim should get one pass by
   someone who knows Gujarat well before public release. Budget a review milestone or fold it
   into M4.
