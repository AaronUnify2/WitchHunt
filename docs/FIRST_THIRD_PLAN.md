# Witch Hunt, first third: encounter and pacing plan

Scope: main menu to the end of the military outpost. Nothing here is built; this is a list to choose from.

## How far to trust this

- Built from eight as-built maps of the code (in `maps/` beside this file), then four independent design lenses (rhythm, fights, dread and story, the night loop). The fifth lens (the player's seat) and all verification were done by hand to save usage.
- Every code fact a proposal rests on was re-read in the source and holds. File and line references are given so each can be checked.
- **Nothing was played.** All timings are computed from config and geometry or estimated. The planned headless timing run was lost to the usage limit.
- All new lines are drafts for Aaron to rewrite.

## The picture

About 40 minutes for a direct first-time player (33 to the all-clear): 34% combat, 35% holds, reading and errands, 15% travel, 11% cutscenes.

The five peaks are right and well spaced: campsite wave, Night 1, the mutant, the hatch, the barricade. Three things around them are not:

1. **A long flat follows each peak.** 5.2 minutes after the mutant and 6.3 after the hatch fight, made of search, reading, radio and ground already crossed. The home to campsite path is crossed five times; seven of eight western crossings have nothing on them.
2. **Beats collide at the joins.** The barricade's peak can start in the frame wave 3 ends, over Ellen's main story line. Ellen's call runs under the outpost's sweep. C-7 can play with wave 1 walking at Tom. Six radio lines follow the witch's 4.6 second look.
3. **After Dawn 1 the clock is unscripted.** Gas station plus shelter needs about 640 clock-seconds; Dawn 1 to dusk is 540. So dusk tends to fall mid-hatch-fight (Ellen's line there says "In daylight"), Night 2, the witch's first real walk, passes unseen, and a brisk player never defends home after Night 1.

## Leave alone

The campsite's shape and the cut to night. The mutant's numbers and reveal. The witch only ever far, brief and unshootable. Earl's room as story only. The hatch fight's structure (ring, risers, the 2 s dig). The watchtower's safety and the machine gun's 25 rounds. The specimens after the fight, C-7 unnamed. Waves 2/4/6/12, never resent.

## Batch 1: small, certain fixes (no decision needed)

| # | Change | Where | Effort |
| --- | --- | --- | --- |
| 1 | **Outpost: the peak waits for the lull and for the radio to finish.** Count the 9 s lull before the `approachDone` return; require `lull <= 0 && !talking()` on the first two start conditions. The 6 m rush stays instant. | `Outpost.js:481-487, 552-555` | S |
| 2 | **Outpost: a sure battery before the barricade, and a searchable gun pit.** The only sure battery is `trucks[0]` at (-12, 23), behind the peak. Make both trucks sure. Move the dead gun's info prompt below the search loop, since it masks the gun pit's search at the same spot. | `Outpost.js:214-232, 1101-1127` | S |
| 3 | **Outpost: three numbers and a latch.** Drop Wyatt's 30 s "rounds" line (he says it up to four times). `c7MaxNear` 2 to 0 so C-7 never plays over wave 1. `gunPitAskAfter` 6 to 14. Set day or night size once at the approach's start, not wave by wave. | `config.js:3188, 3189, 3198`; `Outpost.js:339-342, 433, 581` | S |
| 4 | **Gas station: make the goal tracker agree with the gate.** The tracker runs witch, phone, scanner, note in a fixed order, but the shelter opens on witch plus note. Reorder to phone, scanner (the battery errand puts Tom on the forecourt, where she appears), note, then "check the forecourt before you go" if she is still unseen. Once `shelterCall` is set the main step moves on at once. Also fixes leaving by the back door never showing her. | `Objectives.js:116-131` | S |
| 5 | **Gas station: six seconds of quiet after she runs.** Ellen and Junie speak the instant the look ends. Delay Ellen by 6 s and space the rest. | `GasStation.js:547-554, 716-720`; `config.js:2987` | S |
| 6 | **The forecast tells the truth and picks its moment.** On Night 1 it reads "No sigils planted: a quiet night" and nine dead follow: add the nine (danger 18). Stop counting the shelter's held sigil as marchers. Hold the dusk panel while a fight is on or Tom is underground. | `NightWatch.js:123-129, 187-189, 264-267` | S |
| 7 | **Day 1: prompts and the star.** "RT: fire, LT: aim, B: reload" when the shotgun is first in hand; "D-pad right: heal" when first hurt with a kit. Point the campsite's star at the torn shelter until the camcorder is found, and show "Fight off the dead" during the wave when the shotgun was taken first. | `FirstDay.js:259-285`; `Objectives.js:90-91, 304-316` | S |
| 8 | **Three defects.** The mutant's reveal restarts if skipped before its wake event (wake it on skip). The peak has no timeout, so one stuck soldier holds `outpostCleared`. The tower's first two lines run about 18 s against an 11 s cue, so every line to the campsite lands late: a length target for the rewrite. | `GasStation.js:462`; `Outpost.js:558-567`; `dialogue.json` | S |

## Batch 2: Night 2 is when the loop arrives (one decision)

| # | Change | Where | Effort |
| --- | --- | --- | --- |
| 9 | **Hold Day 2's dusk until Tom is down Earl's hatch.** The same clamp Day 1 and Night 1 already use, capped at about 4 minutes of held time. The hatch fight is always fought in the daylight it was staged for; Tom surfaces from Earl's room into dusk; the stop at home on the ride back becomes the night's decision. It also produces the "Days 1-3" shape the design intended: outpost by day on Day 3. | `StormShelter.js` update and `goDown()`; `config.js` stormShelter; `HomeStop.js` dusk variant lines | M, **needs Aaron** |
| 10 | **A camera on the family plot, and her first real planting always there.** Add fixed camera 7 at the cemetery (`trailCams.count` 6 to 7). On Night 2 she uses the cluster's sigil ground. The first report from a cluster camera comes in about 12 s with a line from Ellen and the camera-six pattern: "D-pad down: watch", never forced. The sigil she plants in view goes on the map. One voiced line on Night 2's forecast. | `openingCluster.json` trailCams; `config.js:5548`; `ZombieDirector.js:235-240`; `TrailCams.js:102-120`; `dialogue.json` | S to M |
| 11 | **Say at dawn what the night cost.** Add fence charge, damaged panels and sigils still in the ground to the dawn toast and the "while you were away" toast; one line from Wyatt the first dawn the box is flat. | `Game.js:1419-1421`; `NightWatch.js:459-466` | S |

Three lenses proposed #10 independently. The lenses split on #9: the night-loop lens would leave the clock free and rely on #6's waiting forecast plus a home stop that turns into a defence when it falls at night. My recommendation is #9, because the fight and its lines were authored for daylight and because it makes Night 2 land at home with #10 ready to fire.

## Batch 3: encounter upgrades to feel in play

| # | Change | Where | Effort |
| --- | --- | --- | --- |
| 12 | **Forecourt: the five stay unaware until Tom chooses how to open.** Enemy sight ignores walls (`detection.js:102-117` tests terrain only), so the pack sees him through the store and trickles to the trail mouth, 25 m from the pumps that could clear it. Give the five a short sight range until one is hurt or a pump is lit; one line from Wyatt ("They haven't seen you"). | `GasStation.js:394-406`; `detection.js`; `gasStation.json` | M |
| 13 | **Mutant: name its openings.** Five chest blasts, two to the head, one or two to the back, and nothing says so. After three wasted body hits Wyatt calls the head; the first time Tom is behind an awake one he calls the back. The beetle's line is the precedent. | `dialogue.json`; a listener on `enemy:hit` | S |
| 14 | **Shelter: Earl stays at his hatch and is recognised before he is shot.** He is a thirteenth citizen who dies in the scrum; the family name him afterwards. Spawn him in the built `held` mode at the hatch, release at about 4 m; Wyatt recognises the red cap when three or fewer of the twelve stand. Add Wyatt's line for ploughing in on the quad, which the sweep distance was set for and nothing teaches. | `StormShelter.js:263-268`; `Objectives.js:134` | M |
| 15 | **Outpost: waves 2 and 3 ask different things.** Same counts. Wave 2 found standing at their post round the gun pit (linger mode, as the first helmet), so there is a first move. Wave 3 comes out through the road gap in a column toward a player holding ten fresh hunting rounds that pierce. | `Outpost.js:431-497`; `outpost.json` staging | M |
| 16 | **Outpost: unstack the arrival.** Ellen's second call line moves from the safe to the road gate; the sweep triggers from the unread `sweepDistance` and waits for her to finish. Today 27 s of talk is queued against an 8 s walk. | `Outpost.js:368, 393-401` | M |
| 17 | **Outpost: "It's just us now" after the evidence.** It plays at the all-clear, before C-4, the report or the dogfight. Split it off and play it once the dogfight is seen or the papers are read. | `Outpost.js:611-616`; `dialogue.json` | M |
| 18 | **Outpost: she comes through at nightfall; hide and watch.** Her real route crosses the outpost about 20 s after nightfall. Wyatt: "Torch off and get down." If she passes unseen, Junie: "She didn't see you." With #9 this lands on the nominal line at the end of Day 3. | `Outpost.js` beside `updateDogfight()` | M, **needs Aaron** |
| 19 | **Dawn 1 walk: one figure at the campers' fire.** The longest empty leg (271 m). One citizen standing at the fire, back turned, once per run; move one of Night 1's closing lines onto the walk. | `Campsite.js`; `FirstDay.js` | S to M |

## Later, or bigger calls

- Teach the stake-out: she returns to the plot whenever it is empty, and the family say a ritual can be broken (it can: `Witch.js:475-479`). Do after #10 has been played.
- A second start point after the shelter. Death at the outpost costs 17 to 33 replayed minutes.
- A blast should hurt the beetle in the crate it breaks (today the charge releases them unharmed).
- Earl drops 20 scrap and the home stop names one purchase.
- If #9 is declined: the home stop becomes a short defence when it falls at night.

## Suggested order

Batch 1 in one sitting (all small, each with a test). Then #9 and #10 together, since they are the largest change in feel. Then Batch 3 one encounter at a time, played between each.
