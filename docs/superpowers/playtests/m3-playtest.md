# M3 Playtest Checklist — World & Atmosphere

Run `bun run dev`, open http://localhost:3000. First pass **with no `GEMINI_API_KEY`**, second
pass **with a key** if available. Use a **fresh save** (passport → "🔄 નવેસરથી શરૂ કરો" → "હા,
ભૂંસો") for the first pass. Keep the browser console open throughout — **no red errors** is a
gate on every section below.

This milestone is "screenshot-worthy": the checks are about how the world *reads* and *feels*,
not just whether a button fires. Spec §10 acceptance: a muted 20 s clip past Somnath at dusk
looks like Gujarat; weather visibly changes how the chhakaro handles region by region; a
first-timer hits one procedural incident in ~10 min and it reads as "realistic", not "a bug";
manual mode is usable by someone who's driven a stick, automatic is invisible to everyone else.

## Gears — automatic (Tasks 1–2)

- [ ] Expert **OFF** (StartScreen "નિષ્ણાત મોડ" toggle off — the default): driving feels exactly
      as it did pre-M3, no clutch/stall behaviour
- [ ] The gauge shows the transmission badge **`A`** (tooltip "ઓટોમેટિક ગિયરબોક્સ") next to the
      `GEAR` badge
- [ ] Accelerating from rest, the `GEAR` badge climbs **1 → 2 → 3 → 4** at roughly 18 / 34 / 52
      km/h and drops back down as you slow — it is the real resolved gear, not a fixed "D"
- [ ] The tachometer (RPM) rises within a gear and drops on each upshift; "રેડલાઇન" tag shows
      only near the top of a gear
- [ ] Pressing `i` in automatic still toggles the engine (spec-mandated foot-gun); the car
      coasts to a stop with the engine off

## Gears — manual / Expert (Tasks 1–2)

- [ ] Expert **ON** (StartScreen toggle → amber, "મેન્યુઅલ ગિયર + ડેમેજ ચાલુ"): the gauge badge
      switches to **`M`** (tooltip "મેન્યુઅલ ગિયરબોક્સ")
- [ ] The HUD shows the Expert shift cluster (down / gear / up + engine button); `e` shifts up,
      `q` shifts down along **R · N · 1 · 2 · 3 · 4**
- [ ] `i` toggles the engine; starting from a standstill **in gear 1** refuses (engine stays
      off + one horn toot); shifting to `N` or `R` first lets it start
- [ ] Pull away in 1, run up to ~30 km/h still in 1 → it revs out and won't pull; shift to 2/3
      and it picks up
- [ ] Hold 4th gear and let the speed fall below ~30 km/h → acceleration **bogs** (sluggish,
      clearly the wrong gear) until you shift down
- [ ] Select `N` or `R` and hold the throttle → the chhakaro does **not** lurch forward
      (forward drive only in 1–4; reverse only in R)
- [ ] Flip Expert OFF mid-drive from any in-game control → transmission returns to `auto`, gauge
      badge back to `A`, gear auto-resolves for the current speed
- [ ] Set Expert ON, refresh the tab → StartScreen shows the toggle still ON; start → gauge is
      `M`, manual shifting works. Expert OFF + refresh → back to `A` (`transmissionMode` +
      `expertMode` persist, schema v4)

## Hero landmarks (Tasks 3–5)

Drive (or fast-travel, then drive the last stretch) to each; check from the **chase cam** and
the **drone cam** (`C` to cycle). "Recognisable silhouette" is the bar, not photoreal detail.

- [ ] **Patan / Modhera (Rani ki Vav)** — reads as an inverted **stepwell**: terraced steps
      descending into the ground, not a flat plaza or a generic temple
- [ ] **Somnath** — reads as a **seaside temple**: the shikhara silhouette against water; the
      **sea plane is visible** (sits above the terrain, not hidden under it)
- [ ] **Gir** — reads as **forest + a safari gate**: a canopy of trees wrapping the approach
      and a distinct entrance gate/arch over the road
- [ ] **Kutch (White Rann)** — reads as **flat white salt to the horizon** + Rann Utsav
      **tents**; the salt stretches to the horizon, not a small white pad
- [ ] **Statue of Unity** — reads as **the standing figure** over the river: a tall human
      silhouette on a plinth, water at its base
- [ ] Each landmark still lets you approach → History Card → "મુલાકાત નોંધો" (M1 loop intact —
      see Regression)

## Day / night cycle (Task 6)

- [ ] From a fresh 06:00-ish start, drive continuously ~700 m → the sky moves through golden
      hour into **dusk**; the HUD time label tracks it
- [ ] At dusk / night in a city zone (Rajkot / Ahmedabad / Surat / Vadodara / Junagadh) →
      **lit windows** glow on the implied buildings and **street lamps** along the highway
      verge light up
- [ ] Near **Dwarka** or **Somnath** at dusk → a warm **aarti glow** blooms at the temple
      (peaks around dusk, fades into full night)
- [ ] Open the time menu — "🛌 વિશ્રામ કરો (Rest till morning)" appears **only** when the phase
      is sunset / dusk / night (not during the day)
- [ ] Tap "વિશ્રામ કરો" → jumps forward to a bright **06:00**, "સવાર પડી …" reward banner, one
      chime; the day/night cycle is live again
- [ ] Turn on a time-freeze mode (e.g. "🌌 ચાંદની રાત ફ્રીઝ"), then tap "વિશ્રામ કરો" → it
      **un-freezes** and still wakes you into a live 06:00 morning (no false "morning" toast
      over a frozen clock)

## Weather (Task 7)

- [ ] In **Rajkot** (start) the weather is **clear** (sunny HUD icon); grip feels normal
- [ ] Drive into **Saputara** → **rain**: visible rain, wheel **spray**, and **noticeably less
      grip** (accel + braking authority down ~⅓ — the chhakaro slides a bit)
- [ ] Drive into **Kutch** → **dust haze** (fog visuals) **+ a mild sideways pull** on the
      vehicle (the dust-storm wind push, Kutch only)
- [ ] Be on the coast (Dwarka / Somnath / Dandi) at **dawn / sunrise** → **fog** (short draw
      distance); it clears as the day brightens
- [ ] Tap the HUD weather button → it **forces** the next weather and that look **holds for a
      stretch** (~1400 m of driving) before the region/time director resumes control
- [ ] On a **clear night**, the haze still **deepens** vs a clear day (time-of-day fog ramp is
      preserved — weather only ever thickens fog, never flattens it)

## Reactive traffic (Task 8)

- [ ] Come up close behind an **ST bus** in your lane → it eases onto the **shoulder** and
      slows, letting you pass, then returns to the lane
- [ ] Cut in front of a **tractor** (or any oncoming/leading vehicle) → it **brakes** and does
      **not** drive through you
- [ ] Drive normally for ~3 minutes through traffic → **no gridlock / pile-up**; traffic keeps
      flowing, agents recover after yielding

## Procedural incidents (Task 9)

- [ ] A ~10-minute continuous drive throws **~2–3 incidents** total (not one every few
      hundred metres, not zero)
- [ ] Incident kinds seen: **cattle crossing** / **stalled truck** / **slow tractor** /
      **rain puddle** — the puddle **only** appears while it is actually raining
- [ ] Each incident forces a **slow-down** (you crawl through the slow-zone) and fires a
      Gujarati **warning notify** (e.g. "ધ્યાન રાખો — ગાયો રસ્તો ક્રોસ કરે છે!")
- [ ] Once you have driven past, the obstacle **clears behind you** (despawns)
- [ ] **Never two at once**; **none while parked** (below ~15 km/h nothing spawns); **none in
      the opening stretch** (~800 m head-start before the first is eligible)

## Toll plaza (Task 10)

- [ ] Approach the toll plaza → a "🛣️ … ટોલ ટેક્સ ₹૩૦ — ભરો એટલે બૂમ ગેટ ખૂલશે" prompt with a
      "**₹૩૦ ટોલ ભરો**" button
- [ ] Pay → the **boom gate rises** (~0.8 s tween), coins **−₹30**, a "🧾 ટોલ ₹૩૦ ભરાયો — રસીદ
      મળી …" **receipt** notify; the gate **stays up** as you drive through
- [ ] With `coins < 30` the button is **disabled** and reads "**પૂરતા સિક્કા નથી**"

## Photo mode → journey card (Task 11)

- [ ] Open photo mode (HUD button / `P`-adjacent / "ફોટો પાડો" voice) → take a snapshot ("📸
      ફોટો ક્લિક કરો")
- [ ] Toggle "**🎴 જર્ની કાર્ડ ફ્રેમ**" ON → an on-screen **postcard frame**: inset border,
      **location · phase** line, **progress pips** + `n/16`, **km** driven, and a tiny
      **Gujarat map** with visited zones dotted amber
- [ ] Toggle the frame **OFF** → a plain filtered shot (frame gone)
- [ ] Download the JPEG in either state → the saved file is the **filtered photo + optional
      location stamp only** — the journey-card frame is **on-screen only**, never baked into
      the download

## Regression — M0 / M1 / M2 still hold

- [ ] Landmark approach → History Card → "મુલાકાત નોંધો" → **+₹100**, chime, one banner, stamp
      recorded (date + km + story)
- [ ] Passport (P): progress bar, `n/16 · pct%`, region tallies, new stamps, silhouette slots
- [ ] Map (M): all 16 places; "🧭 માર્ગ બતાવો" for an unvisited place engages the nav banner;
      fast travel still teleports a visited place
- [ ] Nav banner: distance counts down, arrow rotates toward the target; route queue advances
      through a Kaka-generated trip ("ચાલો! (N સ્થળ)" → stop-to-stop) and clears at the end
- [ ] Kaka HUD strip above the minimap (avatar + last line); opening the modal greets with the
      current place; a mode chip changes the reply tone; a **proactive trigger** fires on a new
      zone (spoken once + banner)
- [ ] A **scoped voice command** ("કાકા દ્વારકા લઈ જાવ" → nav engages; "નકશો બતાવો" opens the
      map; "ફોટો પાડો" opens photo mode)
- [ ] Resume-or-new StartScreen: refresh mid-session → "Resume" shows the last place; resuming
      keeps coins, stamps, odometer
- [ ] Refuel / repair / souvenir / quiz / mission accept all still work
- [ ] `bun run lint` 0 · `bun run test` green · `bun run build` 0 · **no red console errors**
      through all of the above (pre-existing three.js `THREE.Clock` / `PCFSoftShadowMap`
      deprecation warnings are expected)

## With a key — second pass

- [ ] A typed Kaka question returns a richer Gemini Gujarati answer grounded in the sent
      context; `POST /api/gemini/trip` returns a Gemini plan of real places; TTS is the Gemini
      voice
- [ ] Re-spot-check one hero landmark, dusk, and a weather change with a key present — none of
      the M3 world/atmosphere behaviour depends on the key, so all of it should be identical to
      the no-key pass

## Smoke test run — pending (controller / user)

Automated no-key pass (boot, HUD, gauge shows the real gear, drive into a hero zone, night
falls, weather changes, one incident, toll) — to be run in the browser by the SDD controller /
user, as was done for M1 and M2. Fill in results here.

- [ ] Start screen → Start Engine → HUD + 3D world load, no console errors
- [ ] Gauge shows `A` + a real climbing auto gear
- [ ] Drive into a hero zone → landmark reads as the real thing
- [ ] Continuous drive → dusk falls, lights come up
- [ ] Region change → weather changes + handling changes
- [ ] One procedural incident fires with a Gujarati warning
- [ ] Toll plaza prompt → pay → boom rises + receipt

## Known M3 follow-ups (not blockers)

- Toll prompt re-fires after 300 m with the gate already up; re-clicking "ટોલ ભરો" snaps the
  boom back down and re-raises it.
- `onTollApproach` / `onFacilityApproach` fire **per-frame** while the player is in range
  (App re-renders ~60/s for the few seconds in the zone) — mirrors the pre-existing facility
  callback pattern.
- `weatherFrozeTheClock` can go **stale** if the player retakes the clock via a
  freeze/phase control *after* cycling the HUD weather to sunset/night (unusual sequence).
- Incident obstacles are **not road-snapped** — on a curve they may land slightly off the
  tarmac.
- ~42 unshadowed point lights (windows + verge lamps + aarti) plus the Gir canopy draw calls
  are a **low-end-GPU watch** — fine on desktop, monitor on mobile.
- `heroLandmark` on `LocationData` is spec-mandated but currently **inert data** — no consumer
  reads it yet (`buildZoneLandmark` switches on zone id).

## Gate run — 2026-08-31 (branch `m3-world-atmosphere` @ dba687b)

| Gate | Command | Result |
|---|---|---|
| Lint | `bun run lint` (`tsc --noEmit`) | **exit 0**, 0 errors |
| Build | `bun run build` (`vite build` + esbuild server) | **exit 0**, built in ~8.3 s |
| Test | `bun run test` (`vitest run`) | **127 passed / 127** across **15 test files** (~18 s) |

Build output:

```
dist/index.html                   1.57 kB │ gzip:   0.72 kB
dist/assets/index-JPJRXtdB.css   95.29 kB │ gzip:  13.09 kB
dist/assets/index-DlzHMiVw.js  1,211.70 kB │ gzip: 320.55 kB
dist/server.cjs                 101.6 kB
```

- Main JS chunk: **`dist/assets/index-DlzHMiVw.js` = 1,211.70 kB** (gzip 320.55 kB).
- The Vite ">500 kB chunk" warning is still emitted. **No `manualChunks` was added** — the
  M3 spec §8 flagged it as an *option* ("consider `manualChunks` for `src/world/landmarks/*`"),
  not a requirement; the chunk grew ~23 kB across all of M3 (Task 3 baseline 1,188.82 kB →
  1,211.70 kB) and single-chunk delivery was kept.
