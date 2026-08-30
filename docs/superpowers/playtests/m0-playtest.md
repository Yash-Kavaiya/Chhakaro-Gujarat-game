# M0 Playtest Checklist

Run `bun run dev`, open http://localhost:3000. Clear `localStorage` for a fresh run
(`localStorage.removeItem('chhakaro-gujarat-save-v1')`), or use the passport "reset" button.

Fast travel (Map modal → pick a location → "ફાસ્ટ ટ્રાવેલ") is the quick way to reach a
specific location for the location-scoped checks below.

## Core loop

- [ ] Start screen appears; picking one of the 5 start locations + "Start Engine" begins the drive
- [ ] Chhakaro drives (W/A/S/D or arrows), engine RPM/gear/speed update on the HUD, camera cycles through 5 modes with **C** (chase → hood → passenger → cinematic → drone)
- [ ] HUD shows location name, coins (₹), reputation (⭐), fuel % + engine °C, speed / gear / RPM, total km
- [ ] Driving into a location's zone auto-updates the HUD location and stamps its passport visa
- [ ] Fuel % slowly drops while driving (vehicle sim)

## Kanji Kaka AI guide

- [ ] Opens from the HUD button (or the "કાકા બોલો" banner button)
- [ ] A quick-prompt chip or a typed question returns a Gujarati reply within ~1s — no infinite "વિચારી રહ્યા છે" spinner (local scripted fallback is fine with no `GEMINI_API_KEY`)
- [ ] Reply shows a "કાકાની ભલામણ" food line and a "સાંભળો" replay button
- [ ] Proactive narration messages appear in the chat as you pass through locations
- [ ] If the browser has no `SpeechRecognition`, tapping the mic shows a small dismissible red bar ("...માઇક્રોફોન સપોર્ટેડ નથી.") instead of a blocking `alert()`; the bar clears on the next successful mic start

## Modals

- [ ] **Map**: opens (button or **M**), lists all 16 locations, the 6 region filter tabs (All / સૌરાષ્ટ્ર / કચ્છ / મધ્ય / દક્ષિણ / ઉત્તર ગુજરાત) narrow the list, fast travel teleports the chhakaro
- [ ] **Passport**: opens (button or **P**); shows visited/16, total km, exploration %, 16 visa stamps, achievement grid; "🔄 નવેસરથી શરૂ કરો" shows an **inline** confirm ("ખાતરી છે?...") — not a `window.confirm` — and "હા, ભૂંસો" wipes the save and reloads to the Start screen
- [ ] **Food passport**: opens, "ગરમાગરમ ચાખો!" marks a food discovered (card highlights, button turns green "✓ સ્વાદ ચાખ્યો!"), discover arpeggio plays
- [ ] **Garage**: opens, picking one of 6 body colours + "છકડાનો નવો લુક લાગુ કરો!" changes the chhakaro body colour in the 3D scene
- [ ] **Missions**: open; accept a mission (mission 1 = rajkot→dwarka, has a passenger) → modal closes, "ચાલો ... તરફ!" banner, passenger card appears in the HUD → drive / fast-travel to the drop location → coins increase by the mission reward + a "🎉 શાબાશ!" success banner (reputation +0.1 **unless already at the 5.0 cap** — a fresh save starts at 5.0, so the bump is only visible after reputation has dropped)
- [ ] **Missions**: with a mission active, "મિશન રદ કરો" clears it → "મિશન રદ થયું." banner, passenger card gone
- [ ] **Souvenirs**: at a location that *has* souvenirs (dwarka, somnath, gir, kutch, dholavira, palitana, patan_modhera, statue_of_unity — **not** the rajkot start), buy one → coins decrease by the price, card shows "✓ સંગ્રહિત", chime plays
- [ ] **Quiz**: at `dwarka` / `somnath` / `gir` / `dholavira` / `statue_of_unity` / `patan_modhera` the HUD quiz button is enabled → answering correctly adds coins (+₹80) and shows the fact box; at every other location the quiz button is disabled (title "આ સ્થળે ક્વિઝ ઉપલબ્ધ નથી")
- [ ] **Photo mode**: "ફોટો ક્લિક કરો (Capture)" shows the real 3D scene (not a black frame); the in-preview postcard stamp shows the current location; "પોસ્ટકાર્ડ ડાઉનલોડ કરો" saves `Chhakada-Gujarat-<locationId>-<ts>.jpg` with the filter + Gujarati location stamp composited in

## Facilities & ambience

- [ ] Drive up to a petrol pump (world ~(220,80) / (-120,-160) / (100,460)) → the "⛽" prompt appears → "રિફ્યુઅલ" needs ₹500, deducts ₹500, fuel rises, chime plays, no console error
- [ ] Drive up to a garage (world ~(180,50) / (-80,200)) → the "🔧" prompt appears → "રિપેર" needs ₹200, deducts ₹200, clears puncture / cools the engine, chime plays, no console error
- [ ] Fast-travelling to **Dwarka** or **Somnath** plays a temple-bell gong (bell only fires on fast travel / teleport, not on a drive-in)
- [ ] Approaching a landmark plays Kanji Kaka's spoken welcome + a "📍 <place>: <tagline>" banner

## Persistence

- [ ] Make progress (buy a souvenir, answer a quiz, complete a mission, discover a food, visit a new location, change body colour), then reload the page → coins, visa stamps, achievements, discovered foods, collected souvenirs, completed missions, quiz score and customization are all preserved
- [ ] After the reload, vehicle sim state is back to defaults (fuel full, engine cool, no puncture) — it is deliberately **not** persisted
- [ ] Note: a reload returns to the Start screen (you re-pick a start point); `lastLocationId` is stored in the save but the Start screen selection wins for the new session

## Regression sweep

- [ ] Visiting `gir` unlocks the "સિંહના દેશમાં" achievement (achievement sound + "🏅 નવું અચીવમેન્ટ અનલૉક!" banner — the banner is brief and is immediately replaced by the location-welcome banner on a fast-travel arrival; the unlock itself persists)
- [ ] Browser console: no red errors / uncaught exceptions during any of the above. Benign yellow warnings from three.js (`THREE.Clock` deprecated, `PCFSoftShadowMap` deprecated) are pre-existing and expected.
- [ ] `grep -rn "alert(\|window\.confirm\|window\.prompt" src/` → zero matches

## Known deferred type issues

(none — 0 `@ts-expect-error`; `strict` is fully clean)
