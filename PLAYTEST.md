# Play-test list: Session 15, the first day (M9.2)

A running list for Aaron. Live build: **https://aaronunify2.github.io/WitchHunt/**. Play on the tablet with the controller.

**The big question:** does a new player get through Day 1 and Night 1 without help? Note every moment you weren't sure what to do next.

Before you start: if you have a saved run from Session 14, the menu offers **Continue** and **New Run**. Take **New Run**. It reloads on a fresh map and asks you to **tap to begin**, because fullscreen needs a tap.

## Fixes to try (Session 15b)

Round 1:
- [ ] **Skip with A doesn't jump:** skip the cold open, the waking (Ellen's lines) and the tower view with A. Tom shouldn't jump afterwards. Picking New Run with A shouldn't either.
- [ ] **The rifle's at the top of the tower:** you wake with only the shovel. The service rifle leans on the tower's north rail; after the view, hold X on the platform to take it. Skip intro still gives it to you.
- [ ] **The gate's locked until the tower:** the gate stays shut with a chain and padlock on it, and Ellen radios "Not yet, Tom. Get up the tower first..." if you try it (or the torn east panel). Once you've been up the tower it opens as normal. Is the line right?

Round 2:
- [ ] **No floating gun in cutscenes:** the campsite's arrival sweep (and every other cutscene) shows no gun where Tom stands.
- [ ] **Cars wait for the tape:** on Day 1, no car (the campers' or any on the way) offers a search, bonnet or battery until you've watched (or skipped) the camcorder clip.
- [ ] **Tents are easier to search:** the prompt comes up as you reach a tent, without shuffling about.
- [ ] **Line 10:** Ellen's line after the wave now ends "We need it to get the fence running again.

Round 3:
- [ ] **Line 5:** at the campsite sweep Wyatt says "Their car's still there, Dad. Check the tents. Maybe somebody made it."
- [ ] **Line 14:** after Junie's "Are they going to come here?", Ellen says "They'll come. But the fence is live again, and we'll be ready for them."
- [ ] **The tape on the monitors:** hand in the camcorder at the ledger and watch it: it's the campsite at night, the same as when it first played.

Round 4 (Night 1, the first defence):
- [ ] **Line 10** ends "...to get the fence running again, to keep everyone safe."
- [ ] **Nightfall:** patch the fence and fit the battery, then go in to Junie. When she and Ellen finish (13-14), the picture fades to black and comes back up at dusk. If you don't go in, it happens about a minute later anyway. Ellen's forecast line follows.
- [ ] **The waves:** about 12 s into the night, three zombies come up the campsite path (south-west). Wyatt: "Movement on the south-west fence...", then Ellen suggests the tower and the rifle, and Wyatt the shotgun at the fence. Once they're down, three more from the south, then three from the east, each with a line. Try both ways of fighting. Does the fence look like it's doing its job? (It kills a lot of them on its own.)
- [ ] **You can die at night** (no health floor after Day 1's daytime).
- [ ] **Camera six once all nine are down:** "That's all of them. The fence held, Dad." Then the clip (17-19), then Wyatt sends you to the gas station at first light (line 20).
- [ ] **Dawn:** Ellen's line 21 sends you to the gas station too (if you didn't dig the sigil up).

Round 5 (the station ledger):
- [ ] **Tabs:** Fence, Turret 🔒, Upgrades, Security, Forecast, Monitors. No Doors or Power.
- [ ] **Fence tab:** "Repair the whole fence and gate" sits on its own at the top. Below it is a plan of the compound: the fence (outer ring), barricades (inner ring, dotted where none is built), the cabin with its two doors, and the fence box. Tap any part to repair, build, reinforce or fit a battery. With the controller, the D-pad moves round the plan and A does it; LB / RB change tabs. The line under the plan says what's selected and what A will do.
- [ ] **Upgrades:** "Floodlights (all 4)" for 100 scrap; spike traps by side (west 60, south-west 40, south 40, south-east 40, east 60).
- [ ] Tapping tabs and rows works on the tablet, and the × closes the book.

Round 6 (Night 1's flow):
- [ ] **Straight to night:** after Junie and Ellen's talk inside, the fade goes straight to night (no dusk). The forecast comes up as the picture returns, with Ellen's "This is how we stay alive..." while it's on screen.
- [ ] **Line 16 and the tower/shotgun suggestions** play even if you shoot wave 1 from the tower before it reaches the fence.
- [ ] **The warning:** once all nine are down, Ellen says a trail cam's live and she's putting it through; the clip starts a few seconds later.
- [ ] **The talk afterwards:** Wyatt and Ellen on the Pruitts' shelter, line 20 (check on the Pruitts at first light), then Ellen on the gas station (supplies, a phone or radio to reach the outside, help). It's four lines, about 45 s in all. Too long?
- [ ] **Then a fade to dawn:** Dawn 1's lines play and the game saves. You don't wait out the night.

Round 7:
- [ ] **The talk after camera six is three lines:** Wyatt (the Pruitts' shelter, on your map), Ellen (Earl's family; check on them at first light), Wyatt (start at the gas station: supplies, a phone or radio). Then dawn.
- [ ] **Ledger plan, D-pad:** from the gate, left and right walk the whole outer fence end to end. On a barricade, left and right walk the barricades. Up from the barricades goes to the doors and fence box (left / right between them), up again to "Repair the whole fence and gate". Down steps back out.

Round 8:
- [ ] **The campsite sweep** starts as you reach the clearing's edge, not once you're in the camp.
- [ ] **The rifle on the tower:** you see it on the first climb but can't take it (only "climb down"). On Night 1, Wyatt says to meet them at the fence with the shotgun, then Ellen says to get up the tower and take the rifle. Now it can be taken.

Round 9 (the gas station's set, pass 1: no beats yet):
- [ ] Walk in from the campsite trail (it opens at Day 2's dawn), or use the debug teleports (First day & campsite). The trail comes in behind the store: walk round to the forecourt.
- [ ] **Outside:** the forecourt, two pump islands under a sagging canopy, the HOME OF BIGFOOT sign by the road, cars on the forecourt, a dumpster out back. Does it read as a sad roadside gas station?
- [ ] **Inside:** dark even by day (use the torch). Shelves (one knocked over), the counter, dead coolers, the carved Bigfoot by the door, the photo board, footprint casts.
- [ ] **The back rooms:** the office behind the counter (desk, the gun safe, Earl's scanner with its aerial, his note) and the stockroom (boxes, the shut back door).
- [ ] Anything you'd move, resize or add before the beats go in? (Positions are all in `src/data/gasStation.json`.)

Round 10 (the gas station's beats, built overnight: see `MORNING.md` for my calls):
- [ ] **Arrival:** the sweep from the road with Wyatt's line; a handful of zombies about the pumps.
- [ ] **The mutant:** a few steps into the dark shop the camera finds it hunched at the back of the aisle; it unfolds and comes. Too hard? Too easy?
- [ ] **Looting:** hold X on the counter, shelves, coolers, the office's cabinet, the stockroom's boxes and rack. Try the phone, read Earl's note, turn on the scanner, try the safe.
- [ ] **The witch:** once the mutant's down, step out onto the forecourt: she's at the treeline across the road, then gone. Ellen, then Junie (once you've read the note).
- [ ] One of the forecourt cars has a battery.

Round 11 (the quad bike, built overnight: see `MORNING.md`):
- [ ] Behind the gas station, by the back door: hold X to ride it. Left stick to drive and steer; hold X once slowed to get off.
- [ ] Fast on the paths and the road, slow in the brush, a jolt into trees. Does it feel good? Too fast, too slow?
- [ ] Run a zombie over. Notice how the engine brings them.
- [ ] The witch is faster while you're riding (hard to test: she's out at dusk).
- [ ] Debug: First day & campsite has "Quad bike: bring it here".

Round 12 (Night 1 notes, round 2):
- [ ] The torch is off when Tom wakes.
- [ ] Up the tower, the view starts facing south (the fog and the far light), not the cliff.
- [ ] Walking to the campsite: Wyatt says to run, with "Click LS: sprint" on screen.
- [ ] The camcorder's in the torn tent; the shotgun in the green dome tent.
- [ ] After the wave, Ellen: "...Our fence is electrified to keep the bears out. Bring me their car battery and I'll supercharge it." The car can be searched then.
- [ ] Ledger plan: up / down goes gate, fence box, front door, comms door, then "Repair the whole fence"; left / right off them goes to the barricades.
- [ ] Night 1, outside with the torch off: Wyatt says to put it on, with "D-pad left: flashlight".
- [ ] After camera six, Wyatt's line has "D-pad up: map" on screen.

Round 13 (gas station notes):
- [ ] No car in the store's east wall (the forecourt has three cars on their spots).
- [ ] The mutant isn't on the minimap before it wakes.
- [ ] The mutant's crouched at the far end of the west aisle (the right-hand shelf runs); it wakes as you reach that aisle in the centre aisle.
- [ ] The shelves, counter and phone don't glare under the torch.
- [ ] The stockroom's back door opens as you walk to it, out onto the quad.
- [ ] After the witch, Wyatt tells you to take Earl's quad.

Round 14 (playtest round 3):
- [ ] Tom wakes empty-handed. The shovel leans by the cabin's front door (hold X to take it).
- [ ] Patch the torn fence by hand at the fence: Wyatt says the ledger can do it too. (Nothing on walking back in.)
- [ ] After camera six: she buried something on Pruitt land; stay away; the gas station first, and maybe a phone.
- [ ] The shelter's gate stays shut until you've seen the witch and read Earl's note at the gas station.
- [ ] The mutant takes a bit more killing.
- [ ] Earl's new note.
- [ ] Leaving the gas station: Ellen sends you for the shovel; once you have it, Wyatt says it's a weapon too.
- [ ] A sigil can't be dug up without the shovel.

Round 15 (playtest round 4):
- [ ] Control prompts show in their own slot under the top message: sprint on the walk out, "D-pad up: map" after the tower's view and after camera six, the torch on Night 1.
- [ ] The wrecked car on the trail: Wyatt and Ellen comment on it.
- [ ] The shovel by the door can't be taken until after camera six.
- [ ] Digging a sigil shows the shovel digging.
- [ ] The gas station mutant doesn't wake through the wall: only once you're inside.

Round 16 (Session 16: your notes on the overnight work):
- [ ] **The quad's headlamp:** get on at night: it comes on by itself and lights the path well ahead. D-pad right switches it off and on. Get off: it goes out. By day it's off when you get on (D-pad right still puts it on).
- [ ] **Riding through dusk into night:** the lamp comes on as it gets dark (unless you'd switched it off yourself).
- [ ] **A snare under the quad** (debug: Witch, "lay a snare, a totem and a charm ahead of me", then ride over the first): it stops dead with "A snare's wrapped round the front wheel!" Get off (you can walk). By the quad: "Tap X to free the wheel" (about 7 taps). Then ride on.
- [ ] **Night 1, no digging:** the shelter's sigil can't be dug up on Night 1 (no prompt).
- [ ] **Night 1's waves overlap:** three come up the campsite path about 12 s in, three more from the south 15 s later, three from the east 15 s after that, whether or not the first lot are down.

Round 17 (Session 16: Earl's note in close-up, and the storm shelter):
- [ ] **Earl's note** at the gas station opens as a paper over the screen (the game waits). B or X puts it down; the family speak after.
- [ ] **Getting there:** after the gas station (the witch seen and the note read) the shelter's gate opens. Take the shovel. (Debug: First day & campsite, "Storm shelter: teleport to the path in".)
- [ ] **The arrival:** the sweep down onto the hatch, a dozen dead standing on it and Earl (red cap) among them. Wyatt: Earl hid it well.
- [ ] **The rising:** kill a few: more climb out of the glowing sigil, even by day. Ellen says so. Too many? Too slow?
- [ ] **Dig the sigil up:** no more rise. Wyatt and Ellen work out the sigils are raising the dead.
- [ ] **Earl's keys:** where he fell, a glint. Hold X: the safe's combination. Then back at the gas station, the safe opens (the hunting rifle, empty).
- [ ] **The hatch:** hold X with the shovel to dig it clear, then haul it open, then climb down.
- [ ] **Below:** small, shabby, dark (use the torch). Junie and Ellen on Earl's kids. Pick up the diary (it opens: turn the pages; the last one's blank), take the tapes, search the shelves (a first aid kit and a battery for sure), the radio, the photos. Climb the ladder back up.
- [ ] **At home:** hand the tapes in at the ledger (Monitors): camera four plays straight away, with the family's lines. Then it's on the monitors.
- [ ] Anything to move or resize? (Positions are in `src/data/stormShelter.json`.)

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
- [ ] Night 1 is the first defence now: see round 4 above.
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
