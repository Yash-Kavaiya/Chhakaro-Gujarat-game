# M2 — Kanji Kaka, the AI Companion: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn Kanji Kaka from a chat box into an always-on, context-aware Gujarati companion: live context on every utterance, proactive narration, two-way voice with a non-overlapping queue, personality modes, an AI trip generator, and scoped voice commands — all degrading gracefully with no API key.

**Architecture:** New pure logic in `src/state/` (context projection, trigger rules, voice-intent matching, local trip planner) each with colocated tests. A `VoiceQueue` singleton in `src/audio/`. A `useKakaCompanion` hook `App` consumes. `server.ts` gains a richer `/api/gemini/guide` context and a new `/api/gemini/trip` endpoint, both with local fallbacks. `KanjiKakaGuide` becomes a presentational chat surface; a collapsible Kaka strip lands on the HUD.

**Tech Stack:** TypeScript 5.8 strict, React 19.2, Vite 6, Three.js 0.185, Express 4, `@google/genai`, bun, vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-08-30-m2-kanji-kaka-design.md` (read it alongside this plan) and `docs/superpowers/specs/2026-08-30-program-overview.md` §6 (architecture invariants).

**Baseline:** assumes **M0 and M1 are merged**. Where a step references an M1-provided surface (`notify()` from `src/state/notify.ts`, nav target / `NavState` from `src/state/navigation.ts`, `nearestUnvisited` / `regionTally` from `src/state/exploration.ts`, the `recordVisit` coordinator in `App.tsx`), the implementer confirms the actual M1 signatures at task start and adjusts — the M1 plan is the source of truth for those.

## Global Constraints

- **Package manager `bun`.** `bun add` / `bun run <script>`. Never npm/yarn lockfiles.
- **`bun run lint` (`tsc --noEmit`, strict) passes clean — zero `error TS` — at the end of every task.**
- **`bun run build` exits 0 at the end of every task.** **`bun run test` passes, pristine output.**
- **All new UI copy Gujarati-first**; English in parentheses only where surrounding code does so.
- **Historical/cultural facts must be verifiable** — no invented history in any Kaka line, trip reason, or expanded fallback branch.
- **3D world code (`src/world/*`) is not touched by M2.**
- **`src/App.tsx` owns all state; new modules are pure or presentational.**
- **All Kaka spoken output goes through `VoiceQueue`** (Task 2 onward). No direct `soundManager.speakGujaratiTextFallback` calls for Kaka lines after Task 2.
- **`localStorage` key stays `chhakaro-gujarat-save-v1`. Schema version → `3`** (Task 10, for `kakaMuted`). Loader still resets on version mismatch.
- **Commit after every task.** Branch `m0-m1-stabilize-and-tour-loop` (or a fresh `m2-kanji-kaka` branch off merged main — decide at execution start).

---

## File Structure

**New:**

| Path | Responsibility |
|---|---|
| `src/state/kakaContext.ts` | `KakaContext`, `KakaEvent`, `buildKakaContext` — pure projection of App state |
| `src/state/kakaContext.test.ts` | Projection coverage |
| `src/state/kakaTriggers.ts` | `TriggerFire`, `evaluateKakaTriggers(prev, next)` — pure proactive rules |
| `src/state/kakaTriggers.test.ts` | Per-rule coverage (fires once, right condition, right id) |
| `src/state/voiceCommands.ts` | `VoiceIntent`, `matchVoiceIntent(transcript, locations)` — pure local intent match |
| `src/state/voiceCommands.test.ts` | Gujarati + English phrase coverage, `unknown` fallthrough |
| `src/state/tripPlanner.ts` | `TripPlan`, `buildLocalTrip(request, context)` — pure themed route planner (shared client hint + server fallback) |
| `src/state/tripPlanner.test.ts` | Each theme → valid ordered real ids |
| `src/state/useKakaCompanion.ts` | Hook: chat history, `askKaka`, `generateTrip`, `isThinking` |
| `src/audio/VoiceQueue.ts` | Non-overlapping Gujarati TTS queue (Gemini → Web Speech) |
| `src/audio/VoiceQueue.test.ts` | Queue ordering, dedupe, priority, mute (mocked transport) |
| `src/components/KakaStrip.tsx` | Collapsible HUD strip: avatar + last line + mic + "કાકા શાંત" |
| `docs/superpowers/playtests/m2-playtest.md` | Manual checklist |

**Modified:**

| Path | Change |
|---|---|
| `src/types.ts` | `KakaContext`/`KakaEvent`/`VoiceIntent`/`TripPlan` types; `GameProgress.kakaMuted` |
| `src/state/persistence.ts` + test | `SCHEMA_VERSION → 3`; `DEFAULT_PROGRESS.kakaMuted = false` |
| `server.ts` | `/api/gemini/guide` richer context + `mode` + reworked system prompt + `temperature` default; new `POST /api/gemini/trip`; expanded `generateSmartKakaFallback` |
| `src/components/KanjiKakaGuide.tsx` | Consume `useKakaCompanion`; mode chips; inline trip-generator; STT → `matchVoiceIntent` → intent-or-question |
| `src/components/HUD.tsx` | Render `<KakaStrip>` |
| `src/App.tsx` | `recentEvents` ring; `buildKakaContext` memo; trigger effect (diff prev/next); `useKakaCompanion` wiring; `setRouteQueue`; voice-intent handlers; `kakaMuted` state |
| `src/audio/SoundManager.ts` | none (VoiceQueue calls its existing `playBase64Audio` / speech fallback) |

---

## Task 1 — `KakaContext` + the `recentEvents` ring

**Files:** create `src/state/kakaContext.ts`, `src/state/kakaContext.test.ts`; modify `src/types.ts`, `src/App.tsx`.

**Interfaces:** per spec §5.1. `buildKakaContext(input)` where `input` is a flat object of the App-state fields it needs (pass them explicitly — do not import App). `App` holds `const recentEventsRef = useRef<KakaEvent[]>([])` and a `pushKakaEvent(e: KakaEvent)` that unshifts and truncates to 5, then bumps a `kakaEventTick` state so `buildKakaContext` re-memoises.

- [ ] Step 1: write `kakaContext.test.ts` — assert the projection maps zone/mission/nav/gir-zone/events correctly for 3 representative App-state inputs (fresh start; mid-mission with nav; in Gir speeding).
- [ ] Step 2: run — confirm fail. Implement `kakaContext.ts` (pure; `inGirZone` computed from distance to the Gir zone centre `{x:150, z:550}` < 160, matching `GameWorld.updatePhysics`).
- [ ] Step 3: run — confirm pass.
- [ ] Step 4: in `App.tsx` add the ring + `pushKakaEvent`; call it from `recordVisit` (`stamp`), `handleDiscoverFood` (`food`), `handleBuySouvenir` (`souvenir`), `handleQuizCorrect`/wrong (`quiz`), `checkMissionCompletion` (`mission_done`), `handleRefuel`/`handleRepair`. Add a `kakaContext` `useMemo` (not yet consumed — Task 4/5 use it).
- [ ] Step 5: `bun run lint` 0 / `bun run build` 0 / `bun run test` green. Commit: `feat: KakaContext projection and recent-events ring`.

---

## Task 2 — `VoiceQueue`

**Files:** create `src/audio/VoiceQueue.ts`, `src/audio/VoiceQueue.test.ts`; modify `src/components/KanjiKakaGuide.tsx`, `src/App.tsx` (route M1 Kaka lines).

**Interfaces:** per spec §5.2.

```typescript
export interface VoiceTransport {
  speak(text: string): Promise<void>;   // resolves when the utterance ends
}
export function createVoiceQueue(transport: VoiceTransport, isMuted: () => boolean): VoiceQueue;
export interface VoiceQueue {
  enqueue(text: string, opts?: { priority?: 'low' | 'normal' | 'high'; dedupeKey?: string }): void;
  clear(): void;
  readonly isSpeaking: boolean;
}
```

The production transport tries `POST /api/gemini/tts` → `soundManager.playBase64Audio`; on
rejection or `{useFallback:true}` → `window.speechSynthesis` (`gu-IN`), resolving on `onend`.
`src/audio/voiceQueue.ts` exports a `voiceQueue` singleton built with the production transport
and `() => soundManager.getMuted()`.

- [ ] Step 1: `VoiceQueue.test.ts` with a fake transport (resolves after a `vi` fake-timer tick): assert FIFO order; `high` clears pending; `low` dropped when busy; `dedupeKey` suppresses a repeat within the same queue; muted → nothing spoken, queue drained.
- [ ] Step 2: run — fail. Implement `VoiceQueue.ts` (transport injected — no DOM/network in the unit).
- [ ] Step 3: run — pass.
- [ ] Step 4: create `src/audio/voiceQueue.ts` singleton with the real transport. Replace `soundManager.speakGujaratiTextFallback(...)` in `KanjiKakaGuide.tsx` and the M1 Kaka lines in `App.tsx` (`triggerLandmarkWelcome`/landmark-welcome, idle nudge, nav cues) with `voiceQueue.enqueue(...)`. M1's `notify()` keeps its short SFX; its `speak` option for Kaka narration now delegates to `voiceQueue` (adjust `notify` or the call sites — prefer call sites: `notify({..., speak:false})` then `voiceQueue.enqueue(text)`).
- [ ] Step 5: lint/build/test green. Manual: two rapid Kaka triggers → sequential, not overlapping; mute → silent. Commit: `feat: non-overlapping Gujarati voice queue`.

---

## Task 3 — Server `/api/gemini/guide` rework

**Files:** modify `server.ts`.

- [ ] Step 1: extend the request body to accept the full `KakaContext` (keep every current field working via defaults so an old client still functions). Add optional `mode: 'ask' | 'story' | 'duha' | 'food' | 'directions'`.
- [ ] Step 2: rewrite the `systemInstruction` to (a) use the richer context (zone, nearby landmark, mission, nav, weather, time, `visitedCount/total`, `recentEvents`), (b) shape tone by `mode`, (c) keep "2–4 sentences, Kathiyawadi Gujarati, JSON out `{reply, kakaMood, recommendedFood}`". Keep the multi-model fallback chain and `generateSmartKakaFallback`.
- [ ] Step 3: set `temperature` to the Gemini 3.x default (remove the explicit `0.8`, or set `1.0`) — resolves the M0 carry-over.
- [ ] Step 4: no-key curl test: `POST /api/gemini/guide` with a full context body → `{reply, kakaMood, recommendedFood}` 200, Gujarati, references the zone. With a key (if available): a live call returns grounded JSON.
- [ ] Step 5: lint/build/test green. Commit: `feat: context-rich Kanji Kaka guide endpoint`.

---

## Task 4 — Proactive triggers

**Files:** create `src/state/kakaTriggers.ts`, `src/state/kakaTriggers.test.ts`; modify `src/App.tsx`.

**Interfaces:** per spec §5.4. `evaluateKakaTriggers(prev: KakaContext | null, next: KakaContext): TriggerFire | null`. Rules: `zone:<id>`, `unvisited-near:<id>`, `gir-overspeed`, `sunset-coast`, `low-fuel`. (`mission-halfway` and `idle-suggestion` are M1's — not duplicated here; M2 Task 2 already routed M1's idle-nudge text through `VoiceQueue`.)

- [ ] Step 1: `kakaTriggers.test.ts` — for each rule: (a) it fires when the condition first becomes true, (b) it does not fire on the next tick (the App effect owns the once-per-`id` set, so the test asserts the *rule* returns a fire whenever the raw condition holds, and the App effect test — manual — covers dedupe), (c) `id` is correct, (d) the line is ≤2 sentences.
- [ ] Step 2: run — fail. Implement. `KakaContext` must carry `fuelPercent` for `low-fuel` — add it in Task 1's type if missing, or thread it here (prefer: add `fuelPercent: number` to `KakaContext` and `buildKakaContext` now).
- [ ] Step 3: run — pass.
- [ ] Step 4: App effect: keep `prevKakaContextRef` + `firedTriggerIds` (a `Set` ref). On each `kakaContext` change: `const fire = evaluateKakaTriggers(prevKakaContextRef.current, kakaContext); if (fire && !firedTriggerIds.current.has(fire.id) && !kakaMuted) { firedTriggerIds.current.add(fire.id); voiceQueue.enqueue(fire.textGujarati, { priority: fire.priority, dedupeKey: fire.id }); notify({ text: fire.textGujarati, tone: 'info', speak: false }); }` then update the ref.
- [ ] Step 5: lint/build/test green. Manual: drive into a new zone → one spoken line; speed in Gir → warning; both fire once. Commit: `feat: proactive Kanji Kaka narration triggers`.

---

## Task 5 — `useKakaCompanion` + refactor the chat modal

**Files:** create `src/state/useKakaCompanion.ts`; modify `src/components/KanjiKakaGuide.tsx`, `src/App.tsx`.

**Interfaces:**

```typescript
export interface KakaChatMessage { id: string; sender: 'user' | 'kaka'; text: string; mood?: string; food?: string; ts: string; }
export interface UseKakaCompanion {
  messages: KakaChatMessage[];
  isThinking: boolean;
  askKaka(prompt: string, mode?: KakaMode): Promise<void>;
  generateTrip(request: string): Promise<TripPlan>;
}
export function useKakaCompanion(getContext: () => KakaContext): UseKakaCompanion;
```

- [ ] Step 1: implement the hook — `askKaka` POSTs `/api/gemini/guide` with `getContext()` + `mode`, appends user + kaka messages, `voiceQueue.enqueue(reply)`. `generateTrip` POSTs `/api/gemini/trip` (Task 6 creates it — until then stub returns `buildLocalTrip`). Session-only history.
- [ ] Step 2: refactor `KanjiKakaGuide.tsx` to consume the hook (drop its own `fetch`/`messages`/`isLoading`). Quick-prompt chips → **mode chips** (પૂછો / વાર્તા / દુહો / ખાણીપીણી / રસ્તો / સફર બનાવો). STT `onresult` still calls `askKaka` for now (Task 8 adds intent matching).
- [ ] Step 3: `App.tsx` wires `useKakaCompanion(() => kakaContext)` and passes `messages`/`askKaka`/etc. to `<KanjiKakaGuide>`.
- [ ] Step 4: lint/build/test green. Manual: open modal, ask in each mode, replies differ in tone; voice output goes through the queue. Commit: `refactor: Kanji Kaka chat behind a companion hook`.

---

## Task 6 — `/api/gemini/trip` + local trip planner

**Files:** create `src/state/tripPlanner.ts`, `src/state/tripPlanner.test.ts`; modify `server.ts`.

**Interfaces:**

```typescript
export type TripTheme = 'dharmik' | 'heritage' | 'nature' | 'coast' | 'food' | 'mixed';
export interface TripStop { locationId: string; reasonGujarati: string; }
export interface TripPlan { introGujarati: string; stops: TripStop[]; }
export function classifyTripRequest(request: string): TripTheme;   // pure keyword match
export function buildLocalTrip(request: string, fromLocationId: string): TripPlan;  // pure, curated
```

- [ ] Step 1: `tripPlanner.test.ts` — `classifyTripRequest` for ધાર્મિક/heritage/દરિયો/કુદરત/ખાણીપીણી phrases; `buildLocalTrip` returns 3–6 stops, every `locationId` ∈ the 16, ordered sensibly from `fromLocationId`, each with a non-empty Gujarati reason.
- [ ] Step 2: run — fail. Implement with curated per-theme ordered lists (e.g. `dharmik` = `dwarka, somnath, palitana, pavagadh`; `heritage` = `patan_modhera, dholavira, ahmedabad, pavagadh`; etc.).
- [ ] Step 3: run — pass.
- [ ] Step 4: `server.ts` `POST /api/gemini/trip`: body `{ request, context }`. With a key: Gemini with `responseMimeType: 'application/json'` + a strict schema; **validate every returned `locationId` against the 16, drop unknowns, cap at 6**; on empty/invalid → `buildLocalTrip`. No key → `buildLocalTrip`.
- [ ] Step 5: no-key curl: `/api/gemini/trip` with a "ધાર્મિક" request → valid `TripPlan` JSON, all real ids. Commit: `feat: AI trip generator endpoint with local fallback`.

---

## Task 7 — Route queue: nav drives the trip

**Files:** modify `src/App.tsx`, `src/components/KanjiKakaGuide.tsx`.

**Interfaces:** `App` adds `const [routeQueue, setRouteQueue] = useState<string[]>([])`. When non-empty, the M1 nav target is `routeQueue[0]`. On M1 nav "arrived" for `routeQueue[0]`: shift the queue; if more remain, `voiceQueue.enqueue(\`આગળનું સ્થળ: ${nextName}\`)` and set the new nav target; if empty, `notify({ text: 'સફર પૂરી! મોજ કરો.', tone: 'reward' })`.

- [ ] Step 1: wire `routeQueue` into the M1 nav target derivation (nav target = explicit `navTarget` OR `routeQueue[0]` OR active mission drop — define the precedence: explicit user destination > route queue > mission).
- [ ] Step 2: `KanjiKakaGuide` "સફર બનાવો" flow: inline field → `generateTrip(request)` → render `plan.introGujarati` + numbered stops with reasons → "ચાલો!" → `setRouteQueue(plan.stops.map(s => s.locationId))` + close modal.
- [ ] Step 3: lint/build/test green. Manual: generate a 4-stop dharmik trip → nav points to stop 1 → arriving advances to stop 2 with a spoken cue → completing all shows the finish notice. Commit: `feat: Kaka trip plans drive the nav route queue`.

---

## Task 8 — Voice commands

**Files:** create `src/state/voiceCommands.ts`, `src/state/voiceCommands.test.ts`; modify `src/components/KanjiKakaGuide.tsx`, `src/App.tsx`.

**Interfaces:** per spec §5.5. `matchVoiceIntent(transcript, locations)` requires a command verb (`લઈ જા`/`લઈ જાવ`/`ચાલ`/`બતાવ`/`ખોલ`/`ચાલુ કર`/`બંધ કર`/`ફોટો`/`ફરી કહો`, plus English `take me to`/`open`/`turn on`) — a bare place name returns `{kind:'unknown'}` (→ question).

- [ ] Step 1: `voiceCommands.test.ts` — "કાકા દ્વારકા લઈ જાવ" → `navigate:dwarka`; "નકશો બતાવો" → `open:map`; "મ્યુઝિક બંધ કરો" → `toggle:music`; "હેડલાઇટ ચાલુ કરો" → `toggle:headlight`; "ફોટો પાડો" → `photo`; "ફરી કહો" → `repeat`; "દ્વારકા વિશે કહો" → `unknown`; English "take me to somnath" → `navigate:somnath`.
- [ ] Step 2: run — fail. Implement (normalise transcript, strip "કાકા", fuzzy-match the 16 `nameGujarati`/`nameEnglish` for `navigate`).
- [ ] Step 3: run — pass.
- [ ] Step 4: `App` exposes `handleVoiceIntent(intent: VoiceIntent)` — `navigate` → set explicit nav target + `voiceQueue.enqueue(\`ચાલો ${name} તરફ!\`)`; `open` → set the modal flag; `toggle` → the existing handler; `photo` → open photo mode; `repeat` → `voiceQueue.enqueue(lastKakaLine)`. `KanjiKakaGuide` STT `onresult`: `const intent = matchVoiceIntent(t, GUJARAT_LOCATIONS); if (intent.kind !== 'unknown') handleVoiceIntent(intent); else askKaka(t);`
- [ ] Step 5: lint/build/test green. Manual: speak each command; "દ્વારકા વિશે કહો" is answered as a question, not navigated. Commit: `feat: scoped Gujarati voice commands`.

---

## Task 9 — Expand the no-key fallback

**Files:** modify `server.ts`.

- [ ] Step 1: expand `generateSmartKakaFallback` — a per-location branch for all 16 (history + food + one cultural note each, Gujarati, verifiable), plus branches for jokes, duha/kahevat, directions ("આગળનો રસ્તો…"), and a mode-aware default. Keep the JSON shape.
- [ ] Step 2: a small `server.ts`-level table or helper keyed by `context.zone.id` so the branch selection is data, not a 16-arm `if`.
- [ ] Step 3: no-key curl across 5 different zones + each mode → distinct, grounded Gujarati replies. Commit: `feat: full-coverage local Kanji Kaka fallback`.

---

## Task 10 — HUD Kaka strip + persist `kakaMuted`

**Files:** create `src/components/KakaStrip.tsx`; modify `src/components/HUD.tsx`, `src/App.tsx`, `src/types.ts`, `src/state/persistence.ts` + test.

- [ ] Step 1: `types.ts` `GameProgress.kakaMuted: boolean`; `persistence.ts` `SCHEMA_VERSION = 3`, `DEFAULT_PROGRESS.kakaMuted = false`; update `persistence.test.ts` (v3, round-trip `kakaMuted`).
- [ ] Step 2: `App` `const [kakaMuted, setKakaMuted] = useState(initial.kakaMuted)`; add to the persistence effect payload + deps. The trigger effect (Task 4) already checks `kakaMuted`. `voiceQueue` also respects it — pass `() => soundManager.getMuted() || kakaMutedRef.current` to the queue (via a ref).
- [ ] Step 3: `KakaStrip.tsx` — collapsible, bottom area near MiniMap: 👳🏽‍♂️ avatar, `lastKakaLine` (truncated), a mic button (same STT entry as the modal), "🔇 કાકા શાંત" / "🔊 કાકા ચાલુ" toggling `kakaMuted`, and tapping the strip opens the full modal.
- [ ] Step 4: `HUD.tsx` renders `<KakaStrip .../>`; `App` passes `lastKakaLine`, `kakaMuted`, `onToggleKakaMuted`, `onOpenKaka`, the mic handler.
- [ ] Step 5: lint/build/test green. Manual: "કાકા શાંત" silences proactive lines but the game is otherwise unaffected; setting persists across refresh. Commit: `feat: HUD Kaka strip with per-session mute (schema v3)`.

---

## Task 11 — M2 playtest checklist + full run

**Files:** create `docs/superpowers/playtests/m2-playtest.md`.

- [ ] Step 1: write the checklist covering spec §10 acceptance + regression that M0/M1 still hold.
- [ ] Step 2: run it in the browser, no key first, then with a key if available. Every box passes or the failure is reported (STOP, don't fix inline).
- [ ] Step 3: `bun run lint` 0 / `bun run build` 0 / `bun run test` all green.
- [ ] Step 4: commit: `docs: M2 playtest checklist`.

---

## Self-Review

**Spec coverage:** §5.1 → T1; §5.2 → T2; §5.6 guide rework → T3; §5.4 → T4; §5.3 companion/chat → T5; §5.6 `/trip` + fallback → T6; trip drives nav → T7; §5.5 voice commands → T8; §5.6 expanded fallback → T9; §5.7 Kaka strip + §6 persist `kakaMuted` → T10; §7 playtest → T11. All acceptance bullets in §10 map to T4 (proactive), T5/T3 (ask), T8 (voice command), T6/T7 (trip), T2 (no overlap), T10 (mute).

**Placeholder scan:** pure modules (T1, T2, T4, T6, T8) carry test code + precise interfaces; integration tasks name exact state, handlers, endpoints, and copy. Server prompt wording (T3, T9) is left to the implementer to draft against the current model behaviour — that is a deliberate "draft and playtest" step, not a placeholder, and each has a concrete no-key curl acceptance.

**Type consistency:** `KakaContext` (T1) consumed by T4, T5, T6. `TripPlan`/`TripStop` (T6) consumed by T5, T7. `VoiceIntent` (T8) consumed by App handlers in T8. `VoiceQueue` (T2) used by T4, T5, T7, T8, T10. Schema bump is once (T10 → v3).

**Ordering risk:** T5's `generateTrip` calls the T6 endpoint — T5 Step 1 stubs it with `buildLocalTrip` so T5 is testable before T6; T6 then makes it real. Both commits self-consistent.

**M1 dependency:** every reference to `notify()`, nav target, `NavState`, `recordVisit`, `nearestUnvisited` is annotated "confirm the M1 signature at task start". If M1 is not yet merged when M2 begins, STOP — M2 cannot proceed without M1's `notify` and nav.

---

## Execution Handoff

**Plan complete. Two execution options:**
**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks.
**2. Inline Execution** — executing-plans, batched checkpoints.
**Which approach?**
