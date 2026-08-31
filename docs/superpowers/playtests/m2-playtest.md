# M2 Playtest Checklist — Kanji Kaka, the AI Companion

Run `bun run dev`, open http://localhost:3000. First pass **with no `GEMINI_API_KEY`** (local
fallback), second pass **with a key** if available. Use a fresh save (passport → reset) for
the first pass. Keep the browser console open throughout.

## Proactive narration (Task 4)
- [ ] Drive into a new zone → within ~30 s Kaka speaks one unprompted Gujarati line naming
      the zone + a real landmark; the same line also shows in the notice banner
- [ ] The zone line fires **once** — leaving and re-entering the same zone this session is silent
- [ ] Speed up inside the Gir zone (> ~27 km/h) → "ધીમે બાપા! …" warning, once
- [ ] Park a fresh save next to an unvisited landmark you are not navigating to → "… હજી ત્યાં
      ગયા નથી" nudge, once
- [ ] At a coastal temple zone (Dwarka / Somnath) as the sky turns to sunset → "કેમેરા કાઢો!"
- [ ] Let fuel fall below 15 % → "ડીઝલ ખૂટવા આવ્યું …", once
- [ ] Two triggers close together → the lines play **one after another**, never overlapping

## Voice output queue (Task 2)
- [ ] Trigger two Kaka lines within a second (e.g. new zone + overspeed) → sequential, no overlap
- [ ] Global mute (HUD speaker) → no Kaka voice at all
- [ ] "સાંભળો" on a chat message replays it and interrupts whatever is speaking

## Chat + modes (Task 5)
- [ ] Open Kaka (HUD strip or banner) → greeting bubble mentions the current place
- [ ] Type "અહીં શું famous છે?" → grounded Gujarati answer + food recommendation, spoken once
- [ ] Each mode chip (પૂછો / વાર્તા / દુહો / ખાણીપીણી / રસ્તો) changes the tone of the reply
- [ ] Mic in the modal: speak a question → appears as your message, Kaka answers

## Voice commands (Task 8)
- [ ] Speak "કાકા દ્વારકા લઈ જાવ" → nav banner engages toward Dwarka + "ચાલો દ્વારકા તરફ!"
- [ ] "નકશો બતાવો" opens the map; "પાસપોર્ટ ખોલો" opens the passport
- [ ] "હેડલાઇટ ચાલુ કરો" toggles the headlight; "મ્યુઝિક બંધ કરો" toggles the radio
- [ ] "ફોટો પાડો" opens photo mode; "ફરી કહો" repeats the last Kaka line
- [ ] "દ્વારકા વિશે કહો" is **answered as a question**, not navigated

## Trip generator + route queue (Tasks 6–7)
- [ ] Kaka → "🗺️ સફર બનાવો" → type "૩૦ મિનિટનો ધાર્મિક પ્રવાસ" → "બનાવો" → intro + numbered
      stops with reasons, all real places
- [ ] "ચાલો! (N સ્થળ)" → modal closes, nav points to stop 1
- [ ] Reaching stop 1 → spoken "આગળનું સ્થળ: …" and nav advances to stop 2
- [ ] Reaching the last stop → "સફર પૂરી! મોજ કરો." and the nav banner clears
- [ ] An explicit "માર્ગ બતાવો" / voice "લઈ જાવ" overrides an active trip; a mission drop is
      used only when neither is set

## HUD Kaka strip + mute (Task 10)
- [ ] Strip sits above the minimap: avatar + last spoken line; tapping it opens the modal
- [ ] Collapse / expand chevron works
- [ ] Strip mic: speak a command → runs without opening the modal; a question opens the modal
- [ ] "કાકા શાંત" → proactive + spoken lines stop; banners/among the rest of the game unaffected
- [ ] Toggle back to "કાકા ચાલુ", refresh the tab → the mute setting persisted

## With a key (second pass)
- [ ] A typed question returns richer Gemini Gujarati grounded in the sent context
- [ ] `POST /api/gemini/trip` returns a Gemini plan; every stop is one of the 16 real places
- [ ] TTS voice is the Gemini voice, not Web Speech

## Regression (M0 / M1 still hold)
- [ ] Landmark approach → History Card → "મુલાકાત નોંધો" → +₹100, stamp recorded
- [ ] Passport, map, fast travel, minimap, refuel / repair / photo / souvenir / quiz / mission
- [ ] Resume-or-new start screen; resuming keeps coins, stamps, odometer, last place
- [ ] Nav banner distance + arrow behave as in M1
- [ ] Browser console: no red errors through all of the above
- [ ] `bun run lint` 0, `bun run test` green, `bun run build` 0

## Smoke test run — 2026-08-31 (no key, Chrome, dev server)

Automated pass, not the full drive-through:
- [x] Start screen → Start Engine → HUD + 3D world load, no console errors (only pre-existing
      THREE.js deprecation warnings)
- [x] HUD Kaka strip renders above the minimap (avatar + last line + mic + mute)
- [x] Open Kaka modal → greeting bubble names the current zone; six mode chips present
- [x] "ખાણીપીણી" chip → grounded Rajkot food reply + "કાકાની ભલામણ" + "સાંભળો"
- [x] "સફર બનાવો" → "ધાર્મિક પ્રવાસ" → intro + 4 real ordered stops with reasons
- [x] "ચાલો! (4 સ્થળ)" → modal closes, nav banner engages toward દેવભૂમિ દ્વારકા (routeQueue[0]),
      minimap highlights the target
- [x] No console errors across the whole flow

Still needs a human drive-through: proactive zone/Gir/sunset/fuel triggers while moving,
voice-command mic, route-queue stop advancement, "કાકા શાંત" silencing, resume persistence.

## Known follow-ups (not blockers)
- `matchVoiceIntent` is keyword-only; a Gemini intent fallback is a later milestone.
- Trip stop ordering is curated per theme, not distance-optimised from the current position.
- Proactive `firedTriggerIds` resets each session by design — a resumed player may re-hear one
  "we're in X" line.
