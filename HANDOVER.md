# Handover

## Just finished: Session 17, Level & Encounter Designer + AI Programmer: the military outpost (M9.4 done) and three rounds of Aaron's playthrough notes

**Status: everything is on `main` (live).** 635 tests pass and the build is clean. M9.4 is built: the opening runs from waking up to crossing the cordon. Aaron played the outpost from the start of the game three times and called this one of the best sessions. Details: `STATUS.md` (Session 17 and its rounds 2-4), `PLAYTEST.md` rounds 20-23, `OPEN_QUESTIONS.md` #225-256.

**How we worked:**
- Aaron answered the design questions up front, then approved four passes in one go ("passes one to four, let's get to it").
- I built them back to back: small calls made and logged in OPEN_QUESTIONS, each pass checked headless (tests, plus screenshots of each beat).
- Each pass was pushed to the session branch; main on Aaron's go-ahead ("push it to main so I can play it"). After that, every round of his notes went straight to main.
- `PLAYTEST.md` is the running checklist: rounds 20-23 at its top are this session's.

### What was done

- **The outpost** (`encounters/Outpost.js`, `data/outpost.json`, `render/OutpostProps.js`; config `outpost`):
  - **The set:**
    - the barricade across the clearing (sandbags, a breached fence, a truck across the road gap, spilled bags);
    - the watchtower on the near side (a platform the dead can't climb: `platform.outpost`);
    - the gun pit;
    - the compound: tents, the comms hut, the armoury lockers, four containers, five beetle crates, the clipboard.
    - The static props are one vertex-coloured mesh. The clearing is 30 m; the road gate was moved back for a longer approach.
  - **Ellen's call:** `outpostCall` is set as the gas station's safe opens. Wyatt's rounds line comes 30 s later.
  - **The approach:**
    - the arrival sweep, then the first helmet standing on the road;
    - waves of 2, 4, 6 with the radio in the lulls (×1.5 by night);
    - the watchtower's 10 rounds;
    - the barricade's peak: 12, or 15 by night. It sets `outpostCleared`, and the checkpoint opens.
  - **Helmets** (`combat/hitscan.js` `helmetPart`, `wearHelmet`): a headshot on a helmet lands as a body shot (a ping, no blood) and wears it (25 HP: one rifle round). The hunting rifle punches straight through (`helmetPierce`).
  - **The dogfight** (`clip.dogfight`; `story/cutsceneFlight.js`):
    - only from the tower, the first scope raise up there;
    - a plane and a craft; both paths end exactly on this run's crashed plane and crashed UFO clearings;
    - smoke stands over both sites until Tom gets there;
    - the crashed plane is on every run now.
  - **New cutscene tools:** flying actors on timed paths, tracers, rays, smoke trails, blasts, camera keys that track actors, and a cutscene's own near/far planes.
  - **The compound:**
    - **beetles** (`ai/Beetles.js`, their first AI): the shell takes 30%, the glowing face 3×. They come out of crates that are shot, blown or prised open, and one crate breaks by itself as Tom passes.
    - **C-7**, the Mothman's container, torn open: a short sweep, out of combat only, never named.
    - **C-4**: shut until Tom hauls its doors open, a reveal of the body in the resin (`outpost.resin`).
    - **C-9**, the brood's container: busted open.
    - **the rest:** the armoury's charge ("save it for something big"), the field report, the manifest.
  - **The gun pit's machine gun** (Aaron's idea): fit a battery and it fires 15 rounds at the dead, overheats and blows up.
- **Aaron's rounds of notes:**
  - **Earl's office split:** the safe and the scanner are in the stockroom now.
  - **Ammo:** a sure 20 shells and 20 rifle rounds behind the gas station counter.
  - **Escape the witch** (`story/WitchEscape.js`): until the cordon's crossed, ESCAPE THE WITCH shows on screen and the family say to run, or take the quad. The outpost holds its beats while she's on Tom.
  - **One idea at a time:** `Dialogue.playLater()`.
  - **Breadcrumbs:** the family's `hint.<step>` lines after a while stuck on a step (`Objectives.breadcrumb()`).
  - **Tapes on D-pad down** when found; handed in, they go on the monitors (the pattern for every tape).
  - **No dialogue in cutscenes:** lines play after (`Cutscenes.speaksDuring()`; black screens and the victory still speak), and the radio holds while one plays.
  - **Everything picked up goes to the ledger:** lore items with a `paper`, read again under THE PAPERS. Earl's note and the manifest are lore now.
  - **The quad's engine** is muted in cutscenes.
  - **The outpost fight's doubling bug fixed:** a retreat used to resend the wave.
  - **Signs** read right from both sides.
  - **Explosions have a sound** (they never had one).

### Unfinished

- **Aaron's play-test of round 23** (the machine gun) and his next full playthrough: he's doing one now. Start by asking for his notes.
- **The performance gate on the tablet:** the worst case is the barricade's peak by night with the beetles out. Headless it's 116 draw calls and under 1 ms of simulation, but nobody has read the tablet's fps there yet (overlay: View + Menu).
- **Not built, belongs to later sessions:**
  - the crash sites themselves (Session 20: the crashed plane; the UFO is the south's);
  - the outpost's final look (style pass 2, Session 19);
  - a jeep model (an army truck stands in);
  - the CCTV placeholder `clip.mothmanContainer`, untouched;
  - muffled sound etc. (the audio pass).
- **Ideas Aaron's floated for later** (DESIGN "Ideas for later"): quad upgrades, a jetpack for dungeon play.

## Next: Session 18, QA & Balance: full runs through the opening on the tablet

**First:** ask Aaron for his notes from the playthrough he's doing now, and fix them one at a time, as in this session's rounds 2-4.

**Goal (DESIGN.md "Build plan", Session 18):**
- full runs from New Run to crossing the cordon, on the tablet;
- pacing, ammo and loot (Aaron ran short at the outpost once; the bulk ammo and smaller waves should fix it: check);
- the dusk choice;
- bugs;
- the performance gate at the outpost (above).
- Tune from his notes: the outpost's waves and peak, the machine gun, the beetles, the helmets, the breadcrumbs' timing, the escape pattern.

**For that session:**
- **Pacing rule (Aaron):** one idea at a time over the radio. Use `dialogue.playLater(id, seconds, when)` for a follow-up on another subject. No lines inside cutscenes: they play after automatically.
- **Breadcrumbs:** to add a nudge for a step, add a `hint.<step id>` line to `dialogue.json`. `config.objectives.hintAfter` sets the wait.
- **Tapes and papers:** any new tape is offered through `WatchQueue` (D-pad down) and is a lore item with a `clip`. Any new paper is a lore item with a `paper`, given when read, and readable again from the ledger.
- **Early-game witch:** `witchEscape.engaged` tells an encounter to hold its beats (see `Outpost.witchOn`).

### Gotchas and decisions from Session 17

- **The outpost's frame faces the checkpoint:** x is west, z south (`Outpost.frame`). A container's own left/right: use `OutpostProps.local()` (it was mirrored once; fixed).
- **Platforms:**
  - The outpost's tower is `platform.outpost`.
  - `Station` ignores it (it used to offer "climb down" on any platform).
  - Strikes, swipes, traps and planting already skip any platform.
- **Cutscenes:**
  - Lines are deferred unless `style: 'black'` or `linesDuring: true`. A cutscene doesn't wait for subtitles any more.
  - `subtitles.update` stops while a non-speaking cutscene plays (`body.cs-quiet` hides them).
  - **Headless:** the first frame after a big scene change often comes out blank (a navy screen) in swiftshader. Shoot again; it isn't a bug. Also, the frames are slow (dt about 0.1), so anything driven by smoothing (the scope's zoom) behaves differently from the tablet. Drive it directly.
- **Fights:** a wave is never sent twice. A wave out of reach (over 150 m, not chasing) or out over 2 minutes counts as done (`Outpost.dropLost`, `waveTimeout`).
- **The dogfight's anchors** come from `Outpost.dogfightAnchors(eye)`. Anything that should land on a map place can use a fly key's own `anchor`.
- **Loot rule (Aaron, M4):** a kill pays back under half a rifle round on average (tests enforce it). Add ammo through searches, not drops.
- **Dialogue edits:** `dialogue.json` is one JSON object per line. Edit lines in place (a script in this session: set text/cue by id, append entries) rather than re-dumping the file.
- **The dev server dies** between turns in a long session. Run it as a background task.

### Open questions for Aaron

- **Session 17:**
  - #225-241 (the outpost);
  - #242-246 (round 2);
  - #247-253 (round 3);
  - #254-256 (the machine gun).
  - Most are tuning numbers to settle in play.
- **From before:**
  - #213-224 (Session 16);
  - #185-197;
  - #171-184;
  - #161-170;
  - #155-160;
  - #143;
  - #136-137;
  - #140-141.

## Session kickoff prompt for the next session

```
You are QA & Balance on Witch Hunt, Session 18: full runs through the opening (New Run to crossing the cordon) on Aaron's tablet: pacing, ammo and loot, the dusk choice, bugs, and the performance gate at the outpost (the barricade's peak by night with the beetles out). Start with Aaron's notes from his latest playthrough and fix them one at a time, pushing each to main.
Read HANDOVER.md first, then STATUS.md (Session 17 and its rounds 2-4), PLAYTEST.md (rounds 20-23), OPEN_QUESTIONS.md (#225-256) and docs/DESIGN.md ("Overrun military outpost", "Fixed opening cluster", "Build plan").
Keep Aaron's rules: one idea at a time over the radio (Dialogue.playLater), no dialogue in cutscenes, tapes on D-pad down, everything picked up readable again from the ledger, breadcrumbs (hint.<step> lines).
Then confirm your role and ask Aaron for his notes.
Follow the handover protocol: when Aaron's happy, update STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md for the next session, and end with the HANDOVER READY signal.
```
