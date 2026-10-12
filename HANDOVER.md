# Handover

## Just finished: Session 8, AI Programmer, M7 (the witch: the vertical slice)

**Status: built.** All six steps are pushed to `main`. A run can now go from Day 1 to killing the witch, or dying. Aaron play-tested step 1 and reshaped her look and pace; steps 2-6 are waiting for his play-test. The rest of this file is that script and the gate.

### What was built

Details are in `STATUS.md` (the M7 sections) and the numbers in `OPEN_QUESTIONS.md` #105-134.

1. **She roams and plants** (`src/ai/Witch.js`, `src/ai/witchRoutes.js`):
   - **By day** she hides in her hut. At dusk she comes out of its door.
   - **Planting:** night 1 is safe; from night 2 she plants 1 sigil, from night 3 sometimes 2.
   - **Travel:** she glides the pathways and keeps off the station. She follows the simulation tiers: real within 150 m, 3x faster unseen.
   - **The ritual:** 45 s, crouched and contorting, with a green ring and singing that carries 70 m.
   - **The forecast** counts the sigils she's out to plant.
2. **Her look** (`src/render/WitchRenderer.js`), after Aaron's two passes:
   - an unlit near-black shadow creature, thin, with slanted glowing slit eyes and a crown of sticks;
   - she glides, never walks;
   - jointed down to the elbows and wrists, so in the ritual she folds flat and jerks between wrong angles.
3. **Fighting her** (Weapons `extraTargets`):
   - **Toughness:** 500 health, x2 headshots.
   - **Noticing you:** the shared detection model (hiding works). In the ritual's trance she only notices you close up, or on a shot or a hit, and that breaks the ritual.
   - **Fight or flee:** her health plus a bonus near her hut.
   - **Attacks:** hexes you can sidestep or block with a tree, rushing in to swipe if you stand still, summoning 3-4 zombies.
   - **Fleeing:** she weaves home faster than your sprint.
   - **Wounds** last, heal 35% a day and cut her planting.
4. **Traps** (`src/ai/witchTraps.js`):
   - **Snare:** mash A for about 2 s to tear free.
   - **Hex totem:** a burning ring; shoot it to destroy it.
   - **Alarm charm:** calls the zombies and her.
   - **Where:** 16 laid on the hut approach, thicker near it; she also drops them as she flees.
5. **The hut and explosives** (`src/world/Hut.js`, `src/combat/Explosives.js`):
   - **The hut:** a placeholder crooked shack.
   - **Charges:** carry 2 (debug-given). Hold X to plant one on the hut or anywhere.
   - **Detonator:** a weapon slot; RT sets every charge off. A 9 m blast.
   - **The hut** falls only to two charges set off together.
6. **The final battle** (`src/encounters/FinalBattle.js`):
   - **The trigger:** destroying the hut. A placeholder cutscene, then she rises out of the wreck.
   - **Blood night:** it jumps to night if it's day, then the clock freezes. Red sky, embers, ash. The station is still attacked.
   - **The arena:** a ring of witchfire seals the clearing.
   - **Her fight:** to the death, harder, spamming traps.
7. **The end of a run** (`src/ui/RunEndScreen.js`, `src/data/ending.json`):
   - **Victory:** she bursts apart, the dead collapse, then placeholder cards (trail cams, Ground Zero, dawn with the family).
   - **Defeat:** a fade to black with radio static and the family calling Tom.
   - **Both** end on a run summary.
   - **The save** now holds her traps, the charges and the stats.
8. **The debug menu is in categories** (Aaron's request); M7 added "Witch" and "Hut & explosives".
9. **Tests:** 368 pass (45 new this session).

### Unfinished

Nothing in M7's scope. Aaron hasn't play-tested steps 2-6 yet (the script is below).

## Next: Session 9, QA & Balance, the gate (play-test the slice)

**Goal (DESIGN.md "Gate: play-test the slice"):** Aaron plays two or three full runs. Is the core loop fun before any content goes in? Fix the loop first if it isn't.
- Prepare and support his runs, and fix the bugs he finds.
- Tune the numbers with him (all in config: `witch`, `finalBattle`, `explosives`, `ending`, plus M6's nights).
- Explosives only come from the debug menu (Hut & explosives) until M9-M11, so a full run takes them from there.

### Look at first

- `STATUS.md`: the M7 sections, and "What the gate needs next".
- `OPEN_QUESTIONS.md` #105-134: every M7 number, as tuning.
- `src/ai/Witch.js`: her states (resting, roaming, planting, attacking, fleeing, rising, dead) and where each number is used.

### Gotchas and decisions

- **Debug categories:** add tools with `menu.category(DEBUG.x).addItem(...)` (`src/debug/DebugMenu.js`).
- **Weapon targets:**
  - `Weapons.extraTargets` takes anything with a zombie's hit shape, `targetable` and `takeHit()`, or a `{ group }` of them; `noAssist` skips aim assist.
  - The detonator slot comes and goes with `setSlot()`.
- **`Player.rooted`** (the snare) is separate from `moveMultiplier`, because Weapons rewrites that every frame.
- **The final battle freezes the clock** (`clock.setPaused`); NightWatch and the marches keep going on `dt`. A frozen clock means no dawn autosave mid-battle (#130 is open).
- **The witch is a shadow on purpose** (unlit `MeshBasicMaterial`, Aaron): she's hard to see against dark woods and stands out against lit ground, the ritual ring and the blood sky.
- **Headless runs:** in headless Chromium, drive `game.update(1/30)` with the render loop cancelled. CSS transitions run on real time there, so check DOM fades in the browser.
- **Vite `base` is `/WitchHunt/`. The live build deploys from `main`;** Aaron wants each step pushed there.

### Open questions for Aaron

- **#130:** quitting mid final battle and continuing goes back to the last dawn, before the hut was destroyed. Should detonating the hut save, or delete the save (a true point of no return)?
- **#131-132:** the closing and defeat lines are placeholders. Rewrite them now, or leave them for the Narrative Designer (M8 / M14)?
- **Tuning:** her toughness (#113), her attacks (#116), the final battle (#129), trap density (#122).

## Play-test script for Aaron (M7: steps 2-6)

The debug menu's **Witch** and **Hut & explosives** categories hold every shortcut. "Witch > Show her on the map" helps you find her.

1. **Ambush a ritual (step 2):** wait at a sigil ground at night, or use "Teleport near her". Shoot her mid-ritual.
   - The ritual breaks and she shrieks and turns on you.
   - **Good:** she circles you throwing glowing hexes you can sidestep or block with a tree, rushes in if you stand still, and calls up 3-4 zombies.
2. **Make her flee:** keep shooting (or "Fight: set her health" to 50%).
   - Below about 60% she runs home, weaving, faster than your sprint, dropping traps behind her.
   - Fight her near her hut and she stays and fights even when hurt.
3. **Traps (step 3):** "Traps: lay a snare, a totem and a charm ahead of me".
   - Walk into the snare and mash A to tear free (about 2 s).
   - Stand in the totem's ring (it burns), then shoot the totem.
   - Walk into the charm and nearby zombies come.
   - Then walk the hut's approach: it should be thick with them near the hut.
4. **The hut (step 4):**
   - "Give 2 charges", then "Teleport: to the hut door". Hold X by the wall to plant both ("1 of 2", "2 of 2"); she may come out to stop you.
   - Back off, switch to the detonator (RB / LB) and pull RT.
   - Try one charge first: "The hut shudders, but holds."
   - Try a charge on a path as a trap for zombies.
5. **The final battle (step 5):** blowing up the hut starts it. Try it by day too: it should jump to night.
   - Letterbox, a red flash, the sky bleeds red, and she claws up out of the wreck.
   - A ring of green witchfire you can't leave. She never flees, hits harder, summons more and lays snares and totems round you.
   - **Good:** tense and hard, but fair at full health with ammo.
6. **The endings (step 6):**
   - **Kill her:** she bursts apart, the dead fall, then the trail-cam, Ground Zero and dawn cards and the family's lines, then the summary.
   - **Die in a later run:** a fade to black, static and the family calling Tom, then the summary. A starts a new run.
7. **A full run (the gate):** play from Day 1 without the witch shortcuts (explosives still come from the debug menu).
   - **Watch:** how long it takes, how often you meet her, whether she's too tough or too easy, and whether the dusk choice (defend or hunt) feels real.

## Session kickoff prompt for Session 9

```
You are QA & Balance on Witch Hunt, Session 9: the gate (play-test the vertical slice).
Read docs/DESIGN.md (especially "The witch", "Build plan" and "Team roles and session plan"), STATUS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting. Support Aaron's two or three full runs, fix what he finds, and tune the numbers with him (they're all in config).
Follow the handover protocol, and end with the HANDOVER READY signal.
```
