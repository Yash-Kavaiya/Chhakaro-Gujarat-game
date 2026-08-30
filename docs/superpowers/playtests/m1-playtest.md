# M1 Playtest Checklist

Run `bun run dev`, open http://localhost:3000. Use a fresh save (passport → reset) for the first pass.

## Core loop
- [ ] New game: pick a start location; no "Resume" shown on a fresh save
- [ ] Drive toward a landmark → HUD shows the approach prompt (name + "E દબાવો")
- [ ] Press E / tap the prompt → History Card opens with history, highlights, food
- [ ] "મુલાકાત નોંધો" → +₹100, chime, one banner, card now shows the stamp (date + km + story)
- [ ] Re-open the card → no primary button, stamp block present
- [ ] Passport (P): progress bar + "n/16 · pct%", region tallies, the new stamps show date/km/story, unvisited slots are silhouettes

## Map & fast travel
- [ ] Map (M): spatial panel renders all 16, player-current marked, visited vs grey
- [ ] Unvisited place: fast-travel disabled, "🧭 માર્ગ બતાવો" offered
- [ ] Visited place: fast-travel still teleports
- [ ] "માર્ગ બતાવો" → map closes, nav banner appears

## Navigation
- [ ] Nav banner: distance counts down, arrow rotates toward the target as you turn
- [ ] Kaka speaks a start cue, a midway cue, an arrival cue (no overlap / spam)
- [ ] Arriving within the zone clears the banner
- [ ] Accepting a mission auto-sets nav to the drop location; completing it clears nav + pays out

## Minimap
- [ ] Bottom-left minimap: 16 dots, player triangle moves + rotates, visited dots filled, nav target highlighted

## Cohesion
- [ ] Every reward (stamp / souvenir / quiz / mission / achievement) uses the same banner style and one sound (no double chime on souvenir buy)
- [ ] Park in a visited zone ~8 s → one Kaka nudge naming the nearest unvisited place; no repeat for that zone
- [ ] Refresh mid-session → StartScreen offers "Resume" showing the last place; resuming keeps coins, stamps, odometer, and drops you there
- [ ] Browser console: no red errors through all of the above

## Regression (M0 still holds)
- [ ] Refuel / repair / photo mode / souvenir shop / quiz / mission accept all still work
- [ ] `bun run lint` 0, `bun run test` green, `bun run build` 0

## Known follow-ups (not blockers)
- `mapPosition` per-location tuning (Task 9 Step 4) — add `mapPosition: { x, z }` overrides in
  `src/data/locations.ts` for any two markers that overlap or hug the map edge.
- Nav voice cues are single-shot booleans, not a real queue — M2 replaces this with `VoiceQueue`.
