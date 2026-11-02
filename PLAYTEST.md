# Play-test list: Session 15, the first day (M9.2); rounds 16-19 Session 16; rounds 20-24 Session 17 (the outpost); rounds 25-27 Session 18 (QA)

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

Round 18 (your playthrough notes, round 1):
- [ ] Skip the opening with A: Ellen still says to go outside and climb the tower.
- [ ] Up the tower: Wyatt asks about the red light; Ellen says it's the military, a training exercise.
- [ ] The wrecked car on the trail is bloody with a smashed window, every new run.
- [ ] The dome tent searches from any side. No stick figures at the campground.
- [ ] The camcorder: "D-pad down: play the camcorder" waits on screen until you press it.
- [ ] The map (D-pad up): "NEXT: ..." at the top and a gold star where to go; the minimap's star sits on its rim pointing the way. Check it at each step (the fence box after the battery, Junie, the gas station at dawn...).
- [ ] Night 1: after the waves, "D-pad down: watch Ellen's trail cam feed".
- [ ] The shovel by the door doesn't go into the wall.
- [ ] Gas station: after the witch, Ellen says to try the phone; then Earl's radio in the office. The note says "That witch".
- [ ] Storm shelter: the sweep comes well up the path (on the quad: time to get going and plough in). The hatch is away from the sigil. "Dig the hatch clear" from further out. Below, only the diary and the tapes. The photos don't glare.
- [ ] The diary has the 1996 page about the big fella.
- [ ] The quad's a bit quieter.

Round 19 (your notes, round 2):
- [ ] New run: no first aid kits, no flares. The first aid box in the comms room: hold X, 2 kits.
- [ ] The minimap's star sits on the rim when the place is beyond it.
- [ ] Home with the battery: a hint about the torn fence and the ledger. After the gas station: a hint to fetch the shovel.
- [ ] The station's fence isn't shiny up close. The quad's headlamp doesn't flare white on trees, cars and rocks up close. The torch is a touch dimmer right up against things.
- [ ] The diary's 2002 page starts with the big fella caught twice in a blur.
- [ ] Trail cams are blue on the map; the quad's an orange icon.
- [ ] Ellen's hints that she worked at the facility (opening, the red light, the scanner).
- [ ] Debug, Player: "Jetpack": hold A in the air.

Round 20 (Session 17: the military outpost, M9.4). Debug: **Military outpost** category (teleports, "Ellen's call now", "skip the approach", "the dogfight now", "break a crate open", "the Mothman's container now"). Or play through: the safe opens the outpost road.
- [ ] **The call:** open the gas station's safe. Wyatt on the rifle, then Ellen sends you to the checkpoint (the witch is loose outside the quarantine line), Wyatt says the soldiers will have rounds, and Ellen: come home if it goes bad. The map's star moves to the road past the gas station.
- [ ] **The road gate** is further back now (about 30 m nearer the gas station), with the ROAD CLOSED sign beside it, so the walk in is longer.
- [ ] **The arrival:** about 100 m out, the sweep down the road: a soldier standing on it, the watchtower, the barricade with a truck across its gap. Then Wyatt: nobody on the gate, and the soldier just standing there.
- [ ] **The first helmet:** shoot him in the head with the shotgun or the service rifle. The helmet rings and takes it like a body shot. Two rifle rounds to the head knock it off (a clank, his head's bare), then headshots land. Ellen explains after.
- [ ] **The waves:** 3, then 5, then 8, each about 9 s after the last is down, coming at you from ahead (toward the barricade). The radio talks in the lulls. Too many? Too few? By night they're half as many again.
- [ ] **Run away mid-wave** (170 m back): that wave comes again when you return.
- [ ] **The watchtower** (west of the road, before the barricade): hold X at its ladder (north side). The dead can't climb it; they bunch at the bottom. Up top: "take the hunting rifle rounds" (10).
- [ ] **The dogfight:** up there, raise the hunting rifle's scope (LT). A plane chases a craft of lights; they trade fire; both go down past the cordon. Afterwards, smoke stands over both crash sites until you get there. Do they come down in a believable place for where the map has them (map screen)? Too long? Too short? Try it by day and by night.
- [ ] **The barricade's peak:** after the dogfight (or as soon as you climb down), 14 come out of the compound through the gaps (the road gap by the truck, the torn fence, the spilled sandbags on the east). 20 by night. Easy from the tower with the hunting rifle? Hard on the ground?
- [ ] **Down:** Ellen, it's just us now; Wyatt, the checkpoint's open. The cordon gate opens.
- [ ] **The compound:** the comms hut (the field report: read it, then it's carried home), the armoury lockers (one explosive charge), the tents and footlocker, the clipboard by the containers (the manifest).
- [ ] **The containers:** C-3 empty (doors blown out), C-4 (a grey body in amber resin: Wyatt and Ellen), C-7 (torn apart from inside: a short sweep up the gouges, then Wyatt and Ellen; it's never named), C-9 sealed (scratching).
- [ ] **The beetles:** walk toward the crates: one breaks open by itself and a beetle claws out, flares up, hisses, charges and bites. Shots to the shell barely hurt it (Wyatt: go for its face). The glowing face takes full damage. Shoot or prise open the other crates (hold X) for the rest.
- [ ] **The truck across the barricade's gap** has a battery (lift the bonnet).
- [ ] **Through:** the checkpoint gate, then the frontier.
- [ ] **The performance gate (tablet):** turn the overlay on (View + Menu) during the barricade peak at night with the beetles out. What does the fps line say? Headless: 116 draw calls, under 1 ms of simulation for 20 zombies and 5 beetles.

Round 21 (your first outpost playthrough's notes):
- [ ] **Earl's office** has only the desk, the cabinet and his note now. The **safe** is in the stockroom against the back wall by the back door; the **scanner** sits on a crate by the stockroom's east wall. Ellen's hint and the map's NEXT say "the stockroom, out back".
- [ ] **Behind the counter:** Earl's bulk ammunition: a sure 20 shotgun shells and 20 rifle rounds (with the 4 scrap).
- [ ] **Escape the witch** (until you've crossed the cordon): whenever she's attacking you close by, ESCAPE THE WITCH stays on screen; Ellen says to get away (at the outpost: get away from the checkpoint, come back once she's gone); Wyatt says to take the quad if it's near and you're not on it. When she gives up, Wyatt says she's gone (at the outpost: go back). While she's on you the outpost waits: no sweep, no dogfight when you scope, no next wave, no peak.
- [ ] **One idea at a time:** after the gas station's witch, Ellen only says "That was her"; the phone comes on its own about 12 s later (if you haven't tried it); Wyatt's quad line comes on its own once the shelter's call is made. Ellen's call to the outpost is her line and "come home if it goes bad"; Wyatt's word on the soldiers' rounds comes about 30 s later.
- [ ] **Breadcrumbs:** stay stuck on a step a while (about a minute for Earl's note, under two for most) and one of the family nudges you, once (Junie on Earl's notes for Marcy; Ellen on the stockroom's scanner; Wyatt on the watchtower...).
- [ ] **Earl's tapes:** taking them in the shelter puts "D-pad down: watch Earl's tapes" on screen: watch them there and then. Handing them in at the ledger later just puts them on the monitors (it doesn't play them). The map's NEXT says to watch them, not to take them home.

Round 22 (your full-playthrough notes):
- [ ] **No dialogue in cutscenes:** every sweep, clip and tower view plays silent; the family's lines come straight after (skipped or not). The radio holds while a cutscene plays. (Black screens and the endings still speak.)
- [ ] **Everything to the ledger:** Earl's note (once read), his diary, his tapes, the field report and the outpost's manifest (once read) are all carried. Hand them in at the ledger (Monitors): clips to watch again, and now **THE PAPERS** to read again.
- [ ] **The quad's engine** goes quiet during a cutscene and comes back after.
- [ ] **The outpost fight, shorter:** waves of 2, 4, 6, then 12 at the barricade (15 by night). One service rifle round to the head knocks a helmet off. Soldiers drop rifle rounds a little more often. **A bug found:** running far away mid-fight used to reset the wave, so the ones chasing you plus a fresh lot came at you on your return (the doubled fight you felt). Now a wave isn't sent again; one that's lost you far off, or gone on 2 minutes, counts as done.
- [ ] **The dogfight only from the tower:** never on crossing the barricade. Up the tower without it seen: a hint (LT: look through the scope). After the barricade, Wyatt asks you up there, and the map's NEXT says so.
- [ ] **C-7's sweep** waits until no zombie or beetle is near you.
- [ ] **Signs:** the HALT sign and the gates' signs (PRIVATE - PRUITT LAND, the outpost's) read the right way round from both sides.
- [ ] **The charge:** Wyatt says to save it for something big.
- [ ] **C-9** (the beetles' brood) is busted open: one door swung back, the other torn off on the ground, smashed crate slats inside.
- [ ] **C-4's reveal:** its doors are shut. Hold X at them ("haul the container's doors open"): they swing out, the camera turns onto the body in the resin, a sting; then Wyatt and Ellen.

Round 23 (the gun pit's machine gun):
- [ ] **The gun pit** (the sandbag ring on the near side, east of the road) has a machine gun on its mount. Walk up: Wyatt says a car battery might wake it. Without a battery: "its battery dead". With one in your pack: hold X, "fit a battery to the machine gun".
- [ ] **It comes alive** (green light, Wyatt): swings onto the nearest of the dead within 40 m and fires, about one body shot a round (a helmeted soldier takes two). 15 rounds; it holds what's left if nothing's in range.
- [ ] **Then it overheats** (an amber light blinking, smoke, Wyatt: get away from it) and **blows up** about 2.6 s later: a small blast that hurts the dead nearby, and you if you're within 5 m. Once only.
- [ ] Batteries nearby: the truck across the barricade's gap has a sure one; the gas station's forecourt car too.
- [ ] **Explosions have a sound now** (charges and cars going up were silent: the sound was missing).
- [ ] Debug: Military outpost, "the machine gun: fit a battery (gives one)".

Round 24 (your notes after the handover):
- [ ] **Cutscenes talk again** as they used to (the tower's view, the campsite's sweep and the rest). **Only the dogfight** stays silent, with Wyatt's and Ellen's reaction straight after it.

Round 25 (Session 18: your early-game notes):
- [ ] **Earl's note:** hold X at the desk; under the page it says **A: take it**. Press A: the note's gone from the desk, and there's no prompt to read it there again (it's in the ledger under THE PAPERS once handed in).
- [ ] **Earl's diary:** A turns its pages ("A: next page"), then **A: take it** on the last. The table has the board game, the lamp and an **open colouring book with pale pages and two crayons**. Is the diary gone from the table now? (If you still see a book where it was, tell me where you stood.)
- [ ] **The field report and the manifest** are taken the same way (the manifest's sheet leaves its clipboard).
- [ ] **The pumps:** shoot a pump island at the gas station (two close shotgun blasts, or about four rifle rounds). It hisses for a second, then blows: a big blast that takes the other island and any car near it with it. Stand back! Up to 60 damage at the middle. Afterwards: blackened stumps. Try it with the forecourt pack round the pumps. Debug: First day, "Gas station: set the pumps off (the nearest island)".
- [ ] **Digging a sigil takes 2 s** (was 4). While the shovel's in it, that sigil raises nothing (at the storm shelter too).
- [ ] **The stop at home:** with Earl's keys, ride back west past home toward the gas station. About 110 m out Wyatt says to stop in. Go through the gate: Ellen says the fence box (if you've a battery) or the ledger, and a hint on screen says the same. The map's NEXT says to stop at home. Ride past without stopping: once you reach the gas station it drops off the map.
- [ ] **Barricades outside the fence:** build one (ledger plan: the outer dotted ring, or hold X just outside a panel, from either side). At night the dead claw the barricade first and only reach the fence once it's down. Does the fence still feel like it does its job? (It only zaps what's clawing the fence itself.)

Round 26 (Session 18: the outpost given time to breathe; **the beetles and the scope's ask are reworked in round 27**):
- [ ] **C-7 has moved:** it's on the road in now, about 35 m before the watchtower, beside the soldier standing on the road. Its torn end faces you as you come. Get within about 9 m with no fight on: the sweep, then Wyatt and Ellen. The next wave waits for them. Does the trailer sit right on the ground there?
- [ ] **After the barricade's down:** Ellen and Wyatt (the all-clear), then quiet for about 15 s before anything else comes by itself. Wyatt's ask to look through the scope waits for that quiet too.
- [ ] **The beetles:** past the barricade, near the crates, once it's quiet: **four crates burst together**, the nearest first, a second or two apart. The fifth stays shut (shoot it or prise it). Ellen: "Something's breaking out of those crates!"
- [ ] **C-4 and the scope** are yours to choose when: they don't wait.
- [ ] **The gun pit:** a sure 6 rifle rounds when you search it (plus maybe a few more).
- [ ] **Do you still run short of ammo** at the outpost? Day and night. Tell me where.
- [ ] **The fps line** at the barricade's peak by night with the beetles out (overlay: View + Menu).

Round 27 (Session 18: your second set of notes):
- [ ] **New game:** the debug overlay's off (View + Menu brings it back).
- [ ] **Debug:** Sigils & zombies: "Spawn 3 giant beetles near me"; Teleport & map: "Teleport the quad bike to me".
- [ ] **The opening:** no "talk to Wyatt" prompt at the start. Anyone with nothing new to say isn't offered.
- [ ] **Wyatt and Ellen:** looser clothes (Ellen's fleece collar and hem, Wyatt's open flannel). Models: View: The family.
- [ ] **The tents:** search them from any side.
- [ ] **The campsite's sweep:** on past the car to the torn tent, then up over the camp.
- [ ] **The gas station's sweep:** from behind the store (the way you come in), round to the front and the sign.
- [ ] **After camera six:** Wyatt: "She buried something out on Pruitt land, Dad. Right by their storm shelter." Ellen: stay away for now, go to the gas station.
- [ ] **Earl's scanner:** dead without a battery (Wyatt: try the cars out front). Fit one: the longer chatter, Ellen, then Wyatt a bit later.
- [ ] **Earl's bulk ammo** behind the counter: 14 shells and 14 rifle rounds now.
- [ ] **The outpost, in order:** the arrival sweep shows C-7 by the road; walking up to C-7 on foot plays its sweep (not on the quad, not with more than a couple of the dead about). After the first soldier's down, Wyatt asks about the machine gun nest: the hunting rifle rounds are in its ammo box. The waves; the barricade (the truck's gone from the gap: they come through it). The compound: one crate breaks by itself, open a second and the rest burst out. Once the beetles are down, Wyatt asks you up the tower: look through the scope for the dogfight (it won't play before then).
- [ ] **The machine gun:** 25 rounds, slower; its blast hurts you less.
- [ ] **Barricades:** the fence zaps the dead clawing a barricade.

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
