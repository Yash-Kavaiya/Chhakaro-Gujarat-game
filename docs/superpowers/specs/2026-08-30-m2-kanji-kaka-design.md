# M2 — Kanji Kaka, the AI Companion: Design Spec

**Date:** 2026-08-30
**Status:** Approved design (elaborates program-overview §4 M2)
**Depends on:** M0 (done), M1 (planned — the `notify()` helper, nav target/route, `src/state/` conventions)
**Program context:** `2026-08-30-program-overview.md`

---

## 1. Purpose

Make **કાનજી કાકો** the product's signature feature: not a chat box you open, but a companion
sitting in the chhakaro who **knows the situation and speaks up**. The demo moment is a
stranger driving toward Patan and hearing, unprompted, in Gujarati: *"અરે ભાઈ, આપણે હવે
પાટણમાં છીએ — રાણકી વાવ તો જોવી જ પડે."*

## 2. Current state (post-M0)

- `server.ts` → `POST /api/gemini/guide`: body `{ prompt, currentLocation, visitedLocations, speed, weather, timeOfDay }` → `{ reply, kakaMood, recommendedFood }`. Multi-model Gemini 3.x fallback chain, then `generateSmartKakaFallback` (a keyword-branched local scripted responder). `POST /api/gemini/tts`: `{ text }` → `{ audio: <base64> }` or `{ audio: null, useFallback: true }`.
- `src/components/KanjiKakaGuide.tsx`: a modal chat. Web Speech `SpeechRecognition` (`gu-IN`) for input; `soundManager.speakGujaratiTextFallback` for output; four hard-coded quick prompts; `micError` bar (M0). Opens only from the HUD button / the notice banner's "કાકા બોલો".
- `SoundManager`: `speakGujaratiTextFallback(text)` (Web Speech), `playBase64Audio(b64)` (decodes RIFF/WAV, else falls back).
- M1 adds: `notify()` (Kaka already "speaks" landmark-welcome and idle-nudge lines through it), nav target + `NavState`, `src/state/exploration.ts` (`nearestUnvisited`).

**Gap:** Kaka only reacts when you open the modal and type. There is no live context beyond
five fields, no proactive voice, no trip planning, no voice control, and TTS output overlaps
itself.

## 3. Goals

1. **Always-on context.** Every Kaka utterance (chat reply, proactive line, trip plan) is
   grounded in a single live `KakaContext` snapshot: zone, nearby landmark, mission + nav
   state, weather, time, speed, and the last few player events.
2. **Proactive narration.** Kaka speaks up on meaningful triggers, at most once per trigger,
   never spamming, always skippable, always mutable.
3. **Voice, both ways.** Gujarati speech-to-text for asking; a non-overlapping voice queue for
   answering, Gemini TTS when a key is present, Web Speech otherwise.
4. **Personality on tap.** Jokes, duha/kahevat, stories, food picks, directions, culture —
   as quick actions and inferred from free-text questions.
5. **AI trip generator.** "મારે ૩૦ મિનિટનો ધાર્મિક પ્રવાસ જોઈએ" → an ordered route the M1 nav
   system drives, with a one-line reason per stop.
6. **Scoped voice commands.** A fixed command set (navigate to X, open map, toggle
   music/headlight, take photo, repeat that) recognised locally first, Gemini as fallback.
7. **Convincing with no key.** The expanded local fallback must carry a 3-minute demo.

## 4. Non-goals (M2)

- Persistent cross-session conversation memory (session-only history is fine).
- Multi-turn agentic tool use / function calling loops.
- NPC dialogue trees, character relationships.
- Kaka driving the car. Voice commands *set intent* (nav target, toggles); the player still drives.
- Any new 3D model or environment work (that's M3).

## 5. Architecture

### 5.1 Context assembly — `src/state/kakaContext.ts` (pure)

```typescript
export interface KakaContext {
  zone: { id: string; nameGujarati: string; region: string };
  nearbyLandmarkId: string | null;
  visitedCount: number;
  totalLocations: number;
  mission: { titleGujarati: string; dropNameGujarati: string } | null;
  nav: { targetNameGujarati: string; distanceM: number } | null;
  speedKmh: number;
  inGirZone: boolean;          // 25 km/h wildlife cap active
  weather: WeatherType;
  timeOfDayPhase: string | null;
  recentEvents: KakaEvent[];   // last ≤5, newest first
}

export type KakaEvent =
  | { kind: 'stamp'; nameGujarati: string }
  | { kind: 'food'; nameGujarati: string }
  | { kind: 'souvenir'; nameGujarati: string }
  | { kind: 'quiz'; correct: boolean }
  | { kind: 'mission_done'; nameGujarati: string }
  | { kind: 'refuel' } | { kind: 'repair' } | { kind: 'overspeed'; zone: string };

export function buildKakaContext(input: {...App state...}): KakaContext;
```

`App` keeps a bounded `recentEvents` ring (push in the `notify` sites / `recordVisit` /
`checkMissionCompletion` / etc.). `buildKakaContext` is a pure projection over App state +
the ring — fully unit-testable.

### 5.2 Voice output — `src/audio/VoiceQueue.ts`

A small singleton (peer of `soundManager`):

```typescript
class VoiceQueue {
  enqueue(text: string, opts?: { priority?: 'low' | 'normal' | 'high'; dedupeKey?: string }): void;
  clear(): void;             // e.g. on mute, on mode switch
  get isSpeaking(): boolean;
}
```

- One utterance at a time. New `high` priority clears the queue; `normal` appends; `low` is
  dropped if anything is already queued.
- `dedupeKey` suppresses the same line firing twice in quick succession.
- Playback path: if a Gemini key is available → `POST /api/gemini/tts` → `soundManager.playBase64Audio`;
  on any failure or no key → `window.speechSynthesis` (`gu-IN`, the existing fallback).
- Respects `soundManager.getMuted()`.
- `KanjiKakaGuide` and every proactive trigger route through this, replacing direct
  `speakGujaratiTextFallback` calls and M1's `notify({ speak })` for Kaka lines specifically
  (M1's `notify` keeps its own short SFX; Kaka's spoken narration goes through `VoiceQueue`).

### 5.3 The companion controller — `src/state/useKakaCompanion.ts` (hook, used by App)

Owns:
- `askKaka(prompt: string, mode?: KakaMode)` → POSTs `/api/gemini/guide` with the full
  `KakaContext` + `mode`, updates chat history, enqueues the reply on `VoiceQueue`.
- `generateTrip(request: string)` → POSTs `/api/gemini/trip`, returns `TripPlan`, hands the
  ordered waypoints to M1's nav system (a new `setRouteQueue(locationIds: string[])` in App
  that advances the nav target as each is reached).
- chat history (session-only), `isThinking`, `lastReply`.

### 5.4 Proactive triggers — `src/state/kakaTriggers.ts` (pure rules) + an App effect

```typescript
export interface TriggerFire { id: string; textGujarati: string; priority: 'low' | 'normal'; }

/** Given the current + previous KakaContext, return any proactive line to speak now. Pure. */
export function evaluateKakaTriggers(prev: KakaContext | null, next: KakaContext): TriggerFire | null;
```

Trigger set (each fires at most once per `id` per session; `id` encodes the subject):

| id | Condition | Example line |
|---|---|---|
| `zone:<id>` | entered a new zone | "આપણે હવે {zone} માં છીએ. અહીં {landmark} જોવા જેવું છે." |
| `unvisited-near:<id>` | within ~120 m of an unvisited landmark while not navigating to it | "ડાબી બાજુ {name} છે — હજી ત્યાં ગયા નથી." |
| `gir-overspeed` | `inGirZone && speedKmh > 27` | "ધીમે બાપા! ગીરમાં સાવજ છે, ૨૫ ની લિમિટ રાખો." |
| `sunset-coast` | coastal temple zone (`dwarka`/`somnath`) && `timeOfDayPhase === 'sunset'` | "સોમનાથનો સૂર્યાસ્ત — કેમેરા કાઢો!" |
| `low-fuel` | `vehicleHealth.fuelPercent < 15` (context carries it) | "ડીઝલ ખૂટવા આવ્યું, પમ્પ શોધીએ." |
| `mission-halfway` | active mission, nav distance crossed 50% | (deferred to M1's nav cue — M2 does not duplicate) |
| `idle-suggestion` | (M1's idle nudge — M2 routes its text through `VoiceQueue`, does not re-implement) |

The App effect diffs `prev`/`next` context each context-change, calls `evaluateKakaTriggers`,
and on a fire: `VoiceQueue.enqueue(fire.textGujarati, { priority: fire.priority, dedupeKey: fire.id })`
+ a subtle `notify({ text, tone: 'info', speak: false })` visual echo.

### 5.5 Voice commands — `src/state/voiceCommands.ts` (pure) + wiring

```typescript
export type VoiceIntent =
  | { kind: 'navigate'; locationId: string }
  | { kind: 'open'; target: 'map' | 'passport' | 'missions' | 'garage' }
  | { kind: 'toggle'; target: 'music' | 'headlight' | 'mute' }
  | { kind: 'photo' }
  | { kind: 'repeat' }
  | { kind: 'unknown' };

/** Local keyword/fuzzy match against Gujarati + English command phrases. Pure. */
export function matchVoiceIntent(transcript: string, locations: LocationData[]): VoiceIntent;
```

`KanjiKakaGuide`'s STT `onresult`: first `matchVoiceIntent`. If not `unknown` → execute the
intent (App exposes the handlers), confirm via `VoiceQueue` ("ચાલો {name} તરફ!"). If
`unknown` → treat as a question → `askKaka(transcript)`. (No Gemini round-trip for intent
classification in M2 — keyword matching against the 16 location names + a small phrase table
is enough and works offline. A Gemini intent fallback is a follow-up.)

### 5.6 Server changes — `server.ts`

- `/api/gemini/guide`: accept the full `KakaContext` (superset of today's body — keep
  backward-compatible defaults) + optional `mode`. Rework the system instruction to use the
  richer context and the mode. Keep the fallback chain + `generateSmartKakaFallback`.
- **New** `POST /api/gemini/trip`: body `{ request: string, context: KakaContext }` →
  `{ stops: Array<{ locationId: string; reasonGujarati: string }>, introGujarati: string }`.
  `responseMimeType: 'application/json'`, a strict schema in the prompt, validate `locationId`
  against the known 16 server-side, drop unknowns. Fallback: a local rule-based planner
  (`buildLocalTrip(request, context)`) that keyword-matches themes (ધાર્મિક / હેરિટેજ /
  દરિયો / કુદરત / ખાણીપીણી) to a curated ordered list.
- `generateSmartKakaFallback`: **significantly expand** — per-location history/food/culture
  branches for all 16 (today it covers ~6), plus duha/jokes/directions branches, so the
  no-key experience is demo-worthy.

### 5.7 Client — `KanjiKakaGuide.tsx`

- Becomes the chat *surface* for `useKakaCompanion`; loses its own fetch logic.
- Quick actions become **mode chips**: પૂછો (default) · વાર્તા (story) · દુહો (folk verse) ·
  ખાણીપીણી (food) · રસ્તો (directions) · સફર બનાવો (trip generator).
- "સફર બનાવો" opens a small inline field → `generateTrip` → shows the plan (ordered stops +
  reasons) → "ચાલો!" hands it to nav.
- A persistent, collapsible **Kaka strip** on the HUD (not just the modal): avatar + last
  spoken line + a mic button + "🔇 કાકા શાંત" (mute just Kaka for this session). Opening the
  full modal is still one tap.

## 6. Data / persistence

- `GameProgress` gains nothing required. Optionally persist `kakaMuted: boolean` and
  `firedTriggerIds: string[]` so proactive lines don't repeat across a same-day resume —
  **decision: persist `kakaMuted` only**; trigger dedupe resets each session (a resumed
  player re-hearing "we're in Patan" once is fine; schema bump to v3).
- Session chat history is not persisted.

## 7. Testing

- **Pure (vitest):** `buildKakaContext` projection, `evaluateKakaTriggers` (each rule: fires
  once, correct condition, correct `id`), `matchVoiceIntent` (Gujarati + English phrases,
  location-name matching, `unknown` fallthrough), `buildLocalTrip` (each theme → a valid
  ordered list of real ids), server-side `locationId` validation for `/api/gemini/trip`.
- **Manual playtest (`docs/superpowers/playtests/m2-playtest.md`):** proactive line on
  entering a zone; Gir overspeed warning; ask a free-text question with and without a key;
  voice-command "કાકા દ્વારકા લઈ જાવ" sets nav; trip generator produces a followable route;
  VoiceQueue never overlaps; "કાકા શાંત" silences proactive lines; mute silences everything.
- **With a key:** one live `/api/gemini/guide` and `/api/gemini/trip` call returns
  well-formed JSON grounded in the sent context.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Proactive narration feels naggy | Hard once-per-`id` cap; `low` priority dropped when busy; "કાકા શાંત"; every line ≤2 sentences |
| Web Speech `gu-IN` TTS is robotic/absent on some browsers | `VoiceQueue` prefers Gemini TTS; visual `notify` echo means a missed/ugly voice line still lands as text |
| Gemini `/trip` returns invalid or non-Gujarat stops | Server validates every `locationId` against the 16; drops unknowns; local planner fallback |
| Context payload balloons per request | `KakaContext` is a flat ~12-field object + ≤5 events; well under any limit |
| `temperature: 0.8` degradation on Gemini 3.x (M0 carry-over) | Set to default (1.0) as part of the `/guide` rework |
| Voice command misfires (e.g. "દ્વારકા વિશે કહો" → navigate) | `matchVoiceIntent` requires a command verb ("લઈ જા", "બતાવ", "ચાલુ કર") near the target; bare place-name → question |

## 9. Task outline (full step-level plan written at M2 start)

1. `src/state/kakaContext.ts` + tests; `recentEvents` ring in App.
2. `src/audio/VoiceQueue.ts` + tests (mockable TTS transport); route `KanjiKakaGuide` + M1 Kaka lines through it.
3. `server.ts`: extend `/api/gemini/guide` context + mode + system prompt; drop `temperature` to default.
4. `src/state/kakaTriggers.ts` + tests; App trigger effect (diff prev/next context).
5. `src/state/useKakaCompanion.ts` — chat + `askKaka` + history; refactor `KanjiKakaGuide` to consume it.
6. `server.ts`: `POST /api/gemini/trip` + server-side id validation + `buildLocalTrip` fallback + tests.
7. App: `setRouteQueue(locationIds)` advancing M1 nav; `generateTrip` UI in `KanjiKakaGuide`.
8. `src/state/voiceCommands.ts` + tests; wire STT → intent → App handlers → `VoiceQueue` confirm.
9. Expand `generateSmartKakaFallback` to all 16 locations + duha/jokes/directions branches.
10. HUD Kaka strip (avatar + last line + mic + "કાકા શાંત"); persist `kakaMuted` (schema v3).
11. `docs/superpowers/playtests/m2-playtest.md` + full run + gates.

## 10. Acceptance

A first-time player, no key:
- hears an unprompted Gujarati line within ~30 s of entering a new zone;
- gets a "ધીમે બાપા" warning when speeding in Gir;
- can ask "કાકા અહીં શું famous છે?" (typed or spoken) and get a grounded answer;
- can say "કાકા સોમનાથ લઈ જાવ" and see nav engage;
- can ask for "૩૦ મિનિટનો ધાર્મિક પ્રવાસ" and drive the route Kaka lays out;
- never hears two Kaka voices at once;
- can silence Kaka with one tap and the rest of the game is unaffected.
With a key, the same flows use real Gemini and are visibly richer. `bun run lint`/`test`/`build` green.
