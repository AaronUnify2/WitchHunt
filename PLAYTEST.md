# Play-test list: Session 15, the first day (M9.2)

A running list for Aaron. Live build: **https://aaronunify2.github.io/WitchHunt/**. Play on the tablet with the controller.

**The big question:** does a new player get through Day 1 and Night 1 without help? Note every moment you weren't sure what to do next.

Before you start: if you have a saved run from Session 14, the menu offers **Continue** and **New Run**. Take **New Run**. It reloads on a fresh map and asks you to **tap to begin**, because fullscreen needs a tap.

## 1. The main menu

- [ ] The title sits over a slow, grey CCTV feed of the woods from the station gate: STATION CAM 01, REC blinking, panning slowly.
- [ ] The menu has **New Run**, plus **Continue** if a save exists. **Skip intro** only appears once you've seen the opening on this tablet. **Modifiers** and **Settings** are greyed out, marked "coming later".
- [ ] The d-pad moves the highlight and A picks. Tapping works too.

## 2. The opening

- [ ] The cold open: Ground Zero on government CCTV, with Men in Black round the portal ring. The ring flares, then the feed glitches and dies.
- [ ] Tom wakes in the comms room as the picture fades up from black, facing Ellen at the radio. Lines 1–2 play.
- [ ] A / Enter skips each part.
- [ ] Afterwards, back at the menu (reload the page), **Skip intro** is offered.

## 3. The tower (Day 1)

- [ ] Climb the lookout tower (east side of the yard; the ladder is on its south side).
- [ ] The view lingers south over the fog, where a small **red light blinks at the edge of sight** and is never explained. Then it turns west-southwest to **a wisp of smoke** over the trees: Wyatt's line 3, then Junie's line 4.
- [ ] Is the light too subtle, too obvious, or the right "what is that?"
- [ ] Does the smoke read as the last of a campfire?
- [ ] If you don't climb the tower for a minute or so, Wyatt nudges you toward it.

## 4. The campsite

- [ ] The campsite is out of the gate and down the west trail (it's on the map after the tower). If you take a few minutes to get there, Junie nudges you.
- [ ] Arrival: a slow sweep round the clearing that settles on the campers' car, then Wyatt's line 5. Does it feel *calm, almost disappointingly so*?
- [ ] The camp: three tents round a cold fire ring, folding chairs (one knocked over), packs, a cooler, a dead lantern. The far tent is **slashed open on its far side**, with blood behind it.
- [ ] Look up: **stick figures hang in the trees** round the far edge, and there are **X marks cut into a few trunks**. Did you notice them before the tape, or only after?
- [ ] The searches (hold X):
  - [ ] the cooler by the entrance holds **the camcorder** and a little scrap;
  - [ ] the near tent: scrap and maybe ammo;
  - [ ] the backpack: shotgun shells;
  - [ ] the dome tent: **a first aid kit** and scrap;
  - [ ] the torn tent: **the shotgun**.
- [ ] **The camcorder:** Ellen says "Play it, Tom", then the tape plays. It's about 8 seconds of shaky night footage of this same camp: a blur at the treeline, then right on top of a camper, then the tape cuts out. Then Ellen's line 7. **How much of her should we see?**
- [ ] **The shotgun:** the instant you take it, Wyatt shouts "behind you" and **7 zombies come out of the trees on both flanks**, a second or so apart.
  - [ ] Pressed but not swamped?
  - [ ] Enough shells? You start the fight with about 20, plus whatever the searches turned up.
- [ ] **You can't die on Day 1:** your health stops at 20%. Did you ever notice it?
- [ ] Wave cleared: Wyatt's line 9, then Ellen's line 10 ("Pull the battery...").
- [ ] **The battery:** the campers' car by the path in has a sure battery and no alarm. Lift the bonnet, then pull it.
- [ ] Try taking the shotgun before the camcorder. The wave still starts, and the tape still plays when you pick up the camcorder.

## 5. Home (Day 1)

- [ ] Walk into the compound: Wyatt's line 11 (the east fence, the ledger, the scrap).
- [ ] Patch the torn fence at the ledger in the comms room. Wyatt's line 12 tells you where the battery goes. **Is there enough scrap?** You start with 8 and the campsite gives about 15 more; the repair takes about 19.
- [ ] Fit the battery in the fence box by the gate. Junie calls you in ("Can you come inside?") and her **new-line marker** shows. Talk to her for lines 13–14.
- [ ] **The clock holds at 17:00** on Day 1 until the battery's in *and* the fence is patched, so dusk never comes early. Did you ever notice the clock had stopped? (It runs on to dusk in about a minute and a half once you're done.)
- [ ] If you're carrying the battery without fitting it, or the fence is still down, Wyatt nudges you.

## 6. Dusk 1 and Night 1

- [ ] At dusk the forecast shows and Ellen explains it (line 15).
- [ ] About 40 s into the night, **three strays come up the campsite path to the fence**. Wyatt's line 16 plays when they get close. Does the charged wire hold them?
- [ ] About a minute and a half into the night, the family patch through **camera six**: the witch plants at the storm shelter (lines 17–19).
- [ ] Then Wyatt's line 20: **the sigil is on your map** (map and minimap).
- [ ] The shelter spur's pipe gate is open now.
- [ ] Optional and scary: go to the shelter in the dark. About five dead hang round the sigil and stay there; they never march on the station. Dig it up.

## 7. Dawn 1

- [ ] Ellen's dawn line: 21 if the sigil is still there, 22 if you dug it up. Then Junie's line 23 ("She was singing").
- [ ] "Game saved" at dawn.
- [ ] The fallen oak on the gas station trail opens at Day 2's dawn.

## 8. Skip intro

- [ ] From the menu, **Skip intro** starts a fresh map at **Dawn 1**:
  - [ ] the fence is whole and charged;
  - [ ] you have the shotgun;
  - [ ] the camcorder tape is on the monitors;
  - [ ] the campsite is looted and its car's battery gone;
  - [ ] the Night 1 sigil is on the map at the shelter.
- [ ] Ellen's dawn line plays.

## 9. Debug tools

The **First day & campsite** category in the debug menu:
- replay the opening or the tower view;
- teleport to the path into the campsite;
- start the shotgun wave or reset the campsite;
- plant the Night 1 sigil and play camera six;
- send the strays;
- show which Day 1 step you're on.

Every new cutscene is also under **Cutscenes**:
- `menu.feed`;
- `opening.wake`;
- `day1.tower`;
- `sweep.campsite`;
- `clip.camcorder` (it needs the campsite anchor, so it plays best from the game).

## Lines to read and edit

The 23 Day 1 lines are yours from DESIGN.md. Six **draft nudge lines** are mine, for you to rewrite (`src/data/dialogue.json`, ids `day1.nudge.*`):

- Wyatt (tower): "The tower's out by the east fence, Dad. The ladder's on the south side."
- Junie (campsite): "The campground's out the gate and down the west trail, Dad. It's on your map."
- Wyatt (no battery): "Dad, the fence box is dead. Their car's still got a battery in it. Lift the bonnet."
- Wyatt (battery not fitted): "The fence box is just inside the gate, Dad. East side, on the fence."
- Wyatt (fence not patched): "The east fence is still down, Dad. The ledger's on the desk. They'll walk right in tonight."
- Junie (after the battery): "Dad? Can you come inside for a minute?"
