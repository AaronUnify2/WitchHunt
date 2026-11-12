# Open questions

**The build queue (Nov 12):** beats 6 to 10 scaffolded one item at a time (your ask: items 1-7, then the big play-test). Calls from #691, grouped by item.

**Session 33 (Nov 12):** your play-through notes, part 2 (the place beyond to Junie home), all six built, with your answers; and the four questions left from part 1, answered at the start. What they settled, and my calls in building them, are #669-690 below.

**Session 32 (Nov 12):** your play-through notes, part 1 (the opening to the place beyond), all fourteen built, with your five answers. What they settled, and my calls in building them, are #646-668 below.

**Session 31 (Nov 12):** the abandoned mineshaft, the bottom and the way out (the cavern, the seam, the cocoon, the charges and the plunger, the logbook, the dynamite, the rock drill's head, the fuse, the cart back up with the fire behind it, the closing cutscene, the family's lines). Your answers at the start: a glowing crack; a 4 m hung cocoon; a 20 second fuse that kills; a played ride up ending in a cutscene. No play-test notes yet, so nothing from before changed. My calls are #605-645 below.

**Session 30 (Nov 12):** the abandoned mineshaft, the way down (the surface, the battery and the cage, the mine below, the turret cart, the ride's fight, the giant moths' real behaviour). Your answers at the start: two sessions, the way down first; an ordinary car battery; my other defaults. No play-test notes yet, so nothing from before changed. My calls are #565-604 below.

**Session 29 (Nov 12):** the moonshiners' holler (the hollow in the ground, its set, the traps and the wire cutters, the trap map, the turned family, the still, the auto shotgun, the copper worm). Your answers at the start: the holler; go with my defaults (the auto shotgun: yes). No play-test notes yet, so nothing from before changed. My calls are #538-564 below.

**Session 28 (Nov 12):** the sawmill (its set and its beat), the chainsaw and the station's workbench, from HANDOVER's defaults and your yes to my three (what happened at the mill; loggers get up first, then the agents; Tom carries all three melee weapons). No play-test notes yet, so nothing from before changed. My calls are #510-537 below.

**Session 27 (Nov 12):** the railway cutting (the cutting in the ground, the last train of 1903, its beat), the railroad spike maul and dynamite, all from HANDOVER's defaults and your answers (blow up in hand: yes; scarce; the sawmill next). My calls are #488-509 below.

**Session 26 (Nov 11):** Junie taken, the Caller and comms in the south, the old church and the time capsule, then the stairs, the place beyond and Junie home (Session 27's batch too), all from HANDOVER's defaults while Aaron was at work. My calls are #449-475 below.

**Session 25 (Nov 10-11):** Aaron's play-through notes are all built, with the giant moths and the crashed plane's beats. My calls are #412-445 below. **The notes changed earlier answers:** every gun is carried (#390 is moot), and Milo's suit is white with dots.

## The build queue: scaffolding for beats 6 to 10 (Nov 12)

Each item is the beat playable start to end with placeholders and draft lines, for a debug and design session with you later. My calls, item by item. Every line named here is a draft.

**Item 1: the family's plan and the army's dozer (PLAYTEST round 76)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 691 | **When the plan is told.** | The first time you're inside the cabin after Ellen has asked for the power cell: five lines, face to face (Ellen, Wyatt, Junie's "It's Bigfoot. Mr Pruitt's Bigfoot is real."). No cutscene. | `dialogue.json` `plan.1`-`plan.5`, `CordonDozer.updateStory` |
| 692 | **Earl's maps are a trip to the storm shelter.** | DESIGN has them already in the shelter, so the family send you for them: a third search down there, on the corkboard, offered only once they've asked. It opens as a two-page paper with his map drawn (the road's end ringed "HIS DOOR?"). Could instead have been handed in with the diary back at the start. | `stormShelter.json` `maps`, `papers.json` `earlMaps`, `ui/paperDrawings.js` |
| 693 | **Who works out what.** | Over the radio as you put the maps down: Ellen sees the marks bunch at the road's end; Wyatt reasons the Mothman is "sitting on him"; Ellen: a flare brings it, something has to hold it; Wyatt remembers the army's dozer and its winch. | `plan.maps.1`-`.4` |
| 694 | **Where the dozer is.** | The story spine's `cordonDozer` clearing: on this map about 350 m east of the checkpoint and 65 m south of the fence line. The way home is back through the checkpoint. | `data/storySpine.json` |
| 695 | **The camp** (a placeholder set). | The cut's stumps and survey tape, two log decks, two felled trunks, the crew's tent, a job box, a generator with a dead light mast, drums. One mesh. The dozer stands with its blade against the first tree they didn't fell. | `render/dozerCampModel.js`, `config.dozerCamp.look` |
| 696 | **The crew.** | Six dead engineers (the army zombie's look), standing about the camp by the time you're within 60 m. Nothing waits on them. | `encounter.crew` |
| 697 | **Getting it started.** | Two things: the keys from the job box (with 8 scrap), and a battery fitted to the machine (2 s). A charged spare sits by the generator; any battery you carry works. Until both, the dozer tells you what's missing. | `CordonDozer.pick`, `lockedPrompt` |
| 698 | **Taking it home.** | The goal is home's door; it counts as home inside the fence or within 16 m outside it. The drive is about 700 m at the dozer's 19 km/h. Nothing attacks on the way beyond what the engine draws. | `encounter.homeMargin` |
| 699 | **The dozer is saved now.** | Where it stands goes in the save. Before, it was a debug toy and vanished on load. | `Dozer.saveState`, `Game` |
| 700 | **The quad** stays wherever you left it when you took the dozer (item 4 picks that up). | Nothing new. | |
| 701 | **"Continue story" in the debug menu.** | Ten points so far, one per main story beat from the crashed plane on, each at the start of its beat with everything before it done. They build on a fresh run: use them from a new game, not on top of each other. | `debug/storyStart.js` `STORY_POINTS` |

**Item 2: the bug-zapper night at the station (PLAYTEST round 77)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 702 | **How the night is called.** | A spot in the yard, 5 m from the cabin door toward the fence box (the goal's star marks it; nothing stands there yet): hold X to fire the lure flares. If it isn't night, the clock goes to night. | `BugZapper.spot`, `config.bugZapper.spotFromDoor` |
| 703 | **How full the fence has to be.** | Half its capacity (500 of 1000). DESIGN says full; I don't yet know how many batteries a run gives by this point, so half until that's counted. Below it the prompt says what's missing. | `bugZapper.needCharge` |
| 704 | **The flares** (a placeholder scene). | Six seconds, first person: three red flares go up one after another. Ellen: "Wyatt's on the tower with the rifle. Junie's got the lights. Send them up, Tom." | `cutscenes.json` `zapper.flares` |
| 705 | **The Mothman before it's hooked.** | As at the plane: flyovers then dives, can't be driven off, and you can't drop below 10% health. | `bugZapper.script`, `floor` |
| 706 | **The hook.** | On the dozer, B while looking at it within the winch's 30 m, with a generous aim. In the headless run it was hookable on its first circle, so this is easy. Should it only take the hook during a dive? | `Dozer.winchExtras`, `bugZapper.hookSlack` |
| 707 | **On the cable.** | It circles the dozer 9 m out and 7 m up, bucking. 240 health. You have to get down to shoot (no guns from the dozer's seat). | `Flyer.tether`, `bugZapper.tether`, `hookedHealth` |
| 708 | **The family in the fight.** | Wyatt fires from the tower every 2.6 to 4.4 seconds: before the hook it's a crack and one line; after, each shot does 14, so the fight ends in about a minute even if you never fire. Junie calls its arrival. Ellen on the floodlights (your proposal) isn't in. | `bugZapper.wyattEvery`, `wyattDamage` |
| 709 | **The fall on the fence** (a placeholder scene). | Seven seconds: your view is pulled to the nearest fence, three zaps and shakes, red eyes on the wire that lift away north. The Mothman's body isn't staged falling. Then the fence's charge is set to 0. | `zapper.fence`, `BugZapper.zapped` |
| 710 | **After.** | Ellen: it went straight down the old road; it's been in his cave all along; "we've no fence. Take the dozer and finish it." The goal points north. Nothing attacks the dead fence that night beyond what the game already sends. | `zapper.after.ellen` |

**Item 3: the Bigfoot cave (PLAYTEST round 78)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 711 | **The cave is fixed, not seeded** (for now). | One layout: a 22 m tunnel, an egg chamber, a narrow throat, the last chamber. 64 m end to end. DESIGN asks for a small seeded interior; that's for the encounter's own session. | `world/bigfootCaveShape.js` |
| 712 | **Its look** (a placeholder). | Rock boxed round the shape, clutches of eggs, and in the last chamber a hearth ring, three carved posts, a woven mat and a tool rack standing in for Bigfoot's home. Dark; the torch comes on as you go in. | `render/bigfootCaveModel.js`, `config.bigfootCave.look`, `light` |
| 713 | **Clearing the brush takes one push now.** | The old spike needed 80% of the brush's pieces knocked away, and a straight drive only reached 68%, so it never opened. It's 60% now. | `config.map.roadNorth.brushClearAt` |
| 714 | **Going in.** | Hold X at the mouth, once the Mothman's been zapped and the brush is cleared. No scene; you're in. The cave's prompt wins over the dozer's when the dozer's parked in the mouth. | `BigfootCave.pick`, `Game` `rideFree` |
| 715 | **The eggs.** | Nine clutches; within 5.5 m of one, two beetles hatch from it. Eighteen in all if you pass every clutch. None after the Mothman's dead. | `bigfootCave.hatch`, `hatchWithin` |
| 716 | **No giant moths in the lair yet.** | DESIGN has them. The moths' pool needs a habitat written for the cave (as the mine's was); left for the design session. | |
| 717 | **The Mothman in the cave.** | On the ground, wounded: it drags itself at you at 1.5 m/s, never leaves the last chamber, and rakes for 20 every 2.6 s when you're within about 3 m (a screech and a wind-up first). 320 health. It dies here. | `bigfootCave.mothman` |
| 718 | **Freeing Bigfoot.** | Hold X at the cocoon for 3 s (refused while the Mothman lives). He comes out onto his hands, kneels, stands, and holds out his hands; hold X to take the Blessing. About eight seconds, in play, no cutscene, no lines: he doesn't speak. | `bigfootCave.freed`, `freedPose` |
| 719 | **The gifts.** | The Blessing ("his sign, cut in a river stone") and nature armour +40. | `bigfootCave.natureArmour` |
| 720 | **Burying the Blessing.** | A spot in the yard inside the fence, clear of the fence box, the door and the tower (the goal's star marks it; DESIGN's "base of a tree" has no tree yet). Hold X for 3 s. Security +20 for good, as its own line. | `burySpotIn`, `config.station.security.blessing`, `StationState.blessing` |
| 721 | **The voices come back.** | Ellen: "There's no hiss. There's nothing on the line but you." Junie: "The one that used my voice. I can't feel it listening any more." Wyatt: "Earl was right." From then the family reach you anywhere and the Caller never speaks (the rule was already in the game, waiting on this flag). | `cave.blessing.*`, `story/Comms.js` |
| 722 | **Bigfoot stays in the cave.** | Go back and he's standing there. He does nothing more yet. | |

**Item 4: the missing quad and the mega night (PLAYTEST round 79)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 723 | **When the quad goes.** | The moment the Blessing is buried: no model, no map icon, no prompt. DESIGN has it go when you take the dozer; doing it at the Blessing means nobody can stumble on the ring before the story sends them. | `MegaNight.takeQuad`, `Quad.setGone` |
| 724 | **The ring** (a placeholder). | A flat dark ring where it stood. The three-toed tracks are only in the words on screen. It can half sink into sloping ground. | `megaNight.ring`, `buildRing` |
| 725 | **The radio erupts** four seconds after you find the ring. | Ellen: "Forget the quad! They're coming out of the trees. All of them. Every side. Get home!" Junie: "She's angry, Daddy. She knows what you did." | `mega.call.*` |
| 726 | **When the night starts.** | When you're back within 120 m of home. If it's day, the clock goes to night. | `megaNight.startWithin` |
| 727 | **The night's shape.** | Six waves of 24, thirty seconds apart, from all round the fence: 144, plus the new kinds and whatever the Screamers call (up to 30 more). In the headless run with nobody shooting there were 197 alive at once and it kept running. | `megaNight.waves`, `perWave`, `every` |
| 728 | **The station can't fall on this night** (scaffolding). | In my first run the family were dead by the third wave: 150 against a fence the Mothman drained the night before. So for now the dead still break in and still hurt you, but the run doesn't end. **This is the biggest open design question in the queue:** how is this night meant to be survivable? | `megaNight.holdsOut` |
| 729 | **The Hollow** (a stand-in). | A mutant's body. Two come (waves 2 and 4). At the wire each tears one whole fence panel to nothing, once. No charge, no look of its own. | `megaNight.hollowWaves`, `hollow` |
| 730 | **The Screamer** (a stand-in). | An ordinary-looking one that stands 34 m outside the fence and shrieks every 9 seconds; three more come to each shriek, up to five times, until you kill it. Ellen tells you to shut it up. It doesn't speed the others up yet. | `megaNight.screamer` |
| 731 | **The Hanged** (a stub). | One, in wave 4: if you're outside the fence it lands beside you with a line on screen; otherwise it comes with the rest. The pin, and Wyatt shooting it off you, aren't built. | `megaNight.hangedWaves` |
| 732 | **How it ends.** | Dawn, when every wave is in and three or fewer are left within 110 m of home; or after seven minutes whatever's left. | `megaOver`, `endLeft`, `timeout` |
| 733 | **Ellen's ask.** | "One more night like that and there's no station." The ship that came down in the south: "Whatever drives a ship, I want it in our fence box." Wyatt: the tracks at the ring only had three toes. | `mega.after.*` |
| 734 | **"The difficulty rises from here"** | isn't built: the new kinds don't join the ordinary nights yet, and nothing about later nights changes. | |

## Session 33: your play-through notes, part 2

Your notes (Nov 12) and your answers: black the maps out in the place beyond and the mine; static for Junie's call and for the Caller's voice from the trees ("we're going for creepy"); the Caller quiet the whole walk home; Junie on the quad left to me; Ellen asks for the power cell after the reunion, sends you back for it if you haven't got it, and the grey's drop made obvious. At the start of the session: Save and quit stays at home; trim the wake-up scene; keep the standoff's zoom; keep the quick draw's half second.

**Settled by your notes and answers** (earlier questions these close): #574 and #618 (your dot on the map below ground: there's no map there now), #460 (the Caller's voice from the trees: static), #473-474 (Junie on the way home: seen on the quad; the Caller silent), #649 (Save and quit: home), #654 (the zoom: kept), #655 (the quick draw: half a second), #659 (the power cell's place in the story: Ellen, after the reunion), #660 (the wake-up scene: trimmed).

**My calls in building them (PLAYTEST round 75)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 669 | **Save and quit** (your call: leave it). | Unchanged: Continue puts you at home. | `Game.saveAndQuit` |
| 670 | **The wake-up scene, trimmed** (your call). | About 67 s where it was about two minutes. **The account is four lines, 27 s** (was nine): Ellen "Tom? Tom! You're there...", Ellen "Last night we heard you on the radio. Hurt, saying all our names. We went out to find you." (two lines made one), Ellen "Junie's gone, Tom...", Wyatt "The south path camera caught it. I'm patching it through. Dad, I'm so sorry." **Cut:** "It was your voice, Dad...", "We had torches... calling from two places at once", "I let go of her hand...", Ellen trying the channel, and Junie's silent slot. **The clip is 26 s** (was 54) with six captions (was eleven): they come out calling, Tom's voice answers, Ellen and Wyatt split to either side, it calls Junie, she goes, her torch goes out, "Shh." **Cut from it:** Wyatt's "We heard you on the radio!", Junie's first "Daddy?", "Stay together... hold your brother's hand", "Ellen, over here", "It's on both sides!". The three lines after the clip are untouched. Say which cut lines you want back. | `dialogue.json` `junie.account.*`, `clip.junie.*`; `cutscenes.json` `clip.junieTaken` |
| 671 | **The standoff's zoom** (your call: keep). | Unchanged. | `standoff.zoom` |
| 672 | **The quick draw** (your call: half a second). | Unchanged: 0.55 s. | `encounter.quickDraw` |
| 673 | **No map in the place beyond or the mine.** | The minimap is a black disc with its rim: no ground, no markers, no arrow, no N. D-pad up doesn't open the full map; it says why. The moment you're out, both are back. The surface of the mine and the storm shelter keep their maps. | `config.maps.noneIn`, `ui/MapUi.js` `noMapIn`, `Minimap.drawDark` |
| 674 | **The words when the map's refused** (drafts). | "No map of this place" in the place beyond; "The map's no use down here" in the mine. | `config.maps.noneIn` |
| 675 | **The forest's fog of war was lifting while you walked underneath it.** | Found while doing #673: walking the mine or the place beyond revealed the map of the forest above. It doesn't now. | `MapUi.update` |
| 676 | **A voice of radio static.** | No notes at all now. A click as the channel opens, a thin bed of hiss, two swells of hiss in the shape of the call (short-long, the second falling away), and the squelch tail. Junie's is thinner and higher than Tom's; a call from the trees is longer than her call in the place beyond. Both still come from a direction. | `audio/staticCall.js`, `Sfx.js` `junieCall`, `callerVoice` |
| 677 | **The Caller over the radio** keeps its own sound (the breath where the family's calls crackle). | Unchanged: your note was about the calls from a place. Say if the radio lines should hiss too. | `ui/Subtitles.js` |
| 678 | **Junie's shine.** | Two things. Her figure out of doors is a darker material colour (0.3 against the family's 0.62, which is tuned for the cabin's lamps). And the torch now counts her the way it counts the dead: close in the beam, it dims. At arm's length by torch her face reads as a face; before, she was a white shape. | `config.stairs.encounter.follow.albedo`, `Stairs.glareCircle` |
| 679 | **Only the Junie who follows you changed.** | The family at home, and the figures in cutscenes and clips, keep their colours. | |
| 680 | **Junie on the quad** (left to me: the model). | She sits on the rear rack behind you, facing forward, knees up, arms out to hold on, and leans with the quad. "Junie climbs on behind you and holds on" shows the first time, once per walk home. She gets down on the side you step off, behind the quad. | `Stairs.seat`, `stepOffSpot`, `FamilyRenderer` `'sit'`, `follow.seat` |
| 681 | **She shares the rack with the fuel can.** | Her seat overlaps it; from the side it reads as sitting against it. Moving the can to the front rack would be cleaner. | `world/Quad.js` `buildMesh` |
| 682 | **Looking round at her from the saddle.** | She's about half a metre behind your eye, so turning right round shows her close up. Nearer than that and the view went inside her head. | `follow.seat.z` |
| 683 | **Other vehicles.** | Only the quad has a seat for her. On anything else she's hidden while you ride, as before. | `Stairs.update` |
| 684 | **Riding through the gate with her.** | The homecoming used to wait until you got off. Now, inside the fence, you pull up, you both get down and it plays. | `Stairs.updateFollow`, `insideHome` |
| 685 | **The Caller's silence.** | Nothing from it, radio or trees, from the moment Junie's found until she's through the gate; a call under way stops as she's found. After she's home it has its voice back in the south (#475), except within 70 m of the stairs, where it never speaks again. | `config.caller.quiet`, `Caller.js` `callerQuiet` |
| 686 | **What the grey drops, seen.** | As it goes down it turns to face you and the cell leaves its hand, arcs about a metre toward you and lands with a small glassy ring. It lies there as a teal crystal with a faint glow round it and a thin wisp of light standing two metres off it, flashing every couple of seconds. No light is added. It's gone once you've searched the body. Is the wisp too much of a game marker? | `config.crashedPlane.encounter.drop`, `CrashedPlane.buildDrop`, `updateDrop` |
| 687 | **The words as it drops** (drafts). | On screen: "The grey is down. Something fell from its hand, glowing" (or the quick draw's line with the same ending). Wyatt, after his line: "Dad, it dropped something. There, by the body. It's glowing. Don't leave it." The prompt: "search the creature (it dropped something)". The goal: "Search the creature. It dropped something." | `dialogue.json` `plane.drop.wyatt`, `CrashedPlane.greyDown`, `Objectives.js` |
| 688 | **Wyatt's nudge.** | Left unsearched for 25 seconds: "Dad, whatever that thing dropped is still lying there. Go and pick it up." Once. | `hint.planeLoot`, `config.objectives.hintAfter.planeLoot` |
| 689 | **Ellen's ask** (drafts for you to rewrite). | Two and a half seconds after the homecoming, once nothing else is being said. With the cell: Ellen "Nothing gets through that fence again, Tom. It has to be stronger than it was. That thing you took off the creature at the plane. Would it run the fence?" then Wyatt "The fence box takes anything with a charge in it, Dad. Try it." Without it: "...That creature at the plane dropped something that glowed. Go back for it. It might run the fence." Already fitted: "...Whatever you put in the fence box, it's holding more than it ever did. Find us more like it." | `dialogue.json` `home.cell.*`, `Stairs.updateCellAsk`, `cellAsk`, flag `cellAsked` |
| 690 | **The goal, and being sent back.** | Once Junie's home: "Fit the plane's alien power cell to the fence box. Ellen wants the fence stronger", pointing at the box, until it's fitted. Without the cell: "Go back to the crashed plane and search the creature...", pointing at the body, then the fence box. **In a fresh run you can't reach the reunion without the cell** (the flare needs the body searched, and the Mothman needs the flare), so the sent-back path is for old saves. The pickup line at the plane still doesn't say what the cell is for: that's Ellen's to say. | `story/Objectives.js`, `hint.planeCell`, `hint.planeCellBack` |

## Session 32: your play-through notes, part 1

Your notes as you played, and your answers: the first aid box's prompt back is enough; keep the quick draw; the power cell is a quiet drop; moths at the stairs, eight; the clip inside the wake-up scene.

**Settled by your notes** (earlier questions these close): #436-438 (the standoff, the quick draw, the pistol), #440 (the drops: the cell isn't pointed at), #443 (the Mothman can't be driven off), #449-450 (one ending; the account always over the radio, where he wakes), #452 (the clip plays by itself), #466 (the church: the door's shut), #469 (the stairs face the way in), #471 (the place beyond is old growth), #550 (a trap never holds you with no way out).

**My calls in building them (PLAYTEST round 74)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 646 | **The first aid box.** | Quiet until you've stepped about 3 m away from it once, then it offers whenever it holds a kit (and says your healing's full if it is). It was already how you remembered: it holds two kits plus anything that didn't fit your pool (cap 270). | `Station.js` `aidBoxOffered`, `aidBoxClear` |
| 647 | **The crossing sign.** | Each word is shrunk to fit its half of the board, clear of the middle where the boards cross. Both boards still read RAILROAD CROSSING. | `render/Railway.js` |
| 648 | **Why the bear trap had no prompt.** | Traps were catching you while you rode. On the quad you were held, the quad wouldn't move, and prompts are off while riding. Now a bear trap or snare goes off under the wheel and holds nothing (a stump gun still fires, cans still rattle). On foot the way out always shows. | `combat/hollerTraps.js` |
| 649 | **Save and quit put you at the compound.** | Unchanged: Continue has always put you at home (your ask, Session 20). Say if you want it to put you where you were. | `Game.saveAndQuit` |
| 650 | **The stairs' facing.** | Toward the pathway into their clearing. They used to face the church, which on real maps was a different direction. | `world/StairsSite.js` |
| 651 | **The plane's sweep.** | Ten seconds, 46 m out, once: high over the gouge, down along it, then a cut to over the grey's shoulder at its bench. It's a silhouette in poor light; that's the hint. | `sweep.crashedPlane`, `encounter.sweepDistance` |
| 652 | **The radio lines after it** (drafts). | Wyatt: "Dad. By the wing. There's something there, and it's too small to be the pilot." Ellen: "That's not one of ours, Tom. It's got the guns in pieces. Go slow, and don't let it see you first." | `dialogue.json` `plane.sweep.*` |
| 653 | **The standoff's timing.** | 7.6 s: it works (1.2), looks up, vaults the wing (at 2.0), stands in the open 2.5 s, lifts the pistol (5.3), fires at 6.2 and 7.0, both wide. Then control. | `encounter.standoff` |
| 654 | **Your view zooms on it** while the scene holds. | From 16 m it was a speck, so the view narrows to less than half and opens again as control comes back. Say if that's jarring. | `standoff.zoom` |
| 655 | **The quick draw, kept** (your call). | Unchanged: the first 0.55 s after control comes back, one hit drops it. After that its third shot goes wide, it hops into cover and the shootout begins. With two shots already fired at you, is half a second still fair? | `encounter.quickDraw` |
| 656 | **Only the plane's grey has the pistol.** | The later cowboy stages (hat, belt, gunslinger) still carry the shotgun. | `render/alienModel.js` `KIT_STAGES` |
| 657 | **The Mothman at the plane.** | He takes hits and flinches but his health won't fall far enough for him to leave, and his dives repeat until you're down to 10% and black out. Elsewhere (the debug spike) he can still be driven off. | `Flyer` `unbeatable` |
| 658 | **The smashed radio is gone from the story,** | with the night sat out in the wreck, the face-to-face account at the gate and Wyatt's spare handset. I left their code, lines and cutscene in place so an old save with the radio smashed still works. They can be deleted later. | `JunieTaken.js`, `plane.radioSmashed` |
| 659 | **The power cell** (your call: a quiet drop). | Still in the drops (the line just names it), still fits the fence box, no goal. You mentioned finding it another place in the story; nothing's done about that. | `CrashedPlane.loot`, `Objectives.js` |
| 660 | **The wake-up scene's length.** | The account is nine lines, about 40 s, over the radio with you free to move. The clip is 54 s (A skips it). Then three more lines. It's about two minutes in all. I didn't cut any of your lines; say which should go if it drags. | `dialogue.json` `junie.account.*`, `clip.junieTaken` |
| 661 | **Home isn't needed, but it's still there.** | Junie's rabbit is on her bunk and Ellen and Wyatt have their lines if you go. Nothing sends you. |  |
| 662 | **The church door** (a draft). | "The church door. Shut, swollen into its frame, a beam spiked across it a long time ago. It doesn't move." You can still see into the church through the fallen corner at the back, but not get in. | `config.oldChurch.encounter.doorText` |
| 663 | **Where the capsule is now.** | The plaque stone is about 3 m from the door, at the foot of the steps to one side; the dig is in front of the stone. | `render/oldChurchModel.js` |
| 664 | **The moths at the stairs** (your call: eight). | They come 1.5 s after you're within 22 m, only while Junie's up there, once. The stairs say "Not with those things on you" until the last is dead. Leave mid-fight and they come again next time. | `config.stairs.encounter.moths` |
| 665 | **What an old-growth tree is here.** | A trunk 22 m tall and about 2 m through at the ground, six buttress roots, moss on the north side, dead stubs, limbs from 13 m up, a crown of flat dark masses with moss hanging. The crowns are flat pads like the forest's own pines, much bigger. | `render/oldGrowth.js` |
| 666 | **The place beyond, thinned.** | About 70 giants a clearing where there were about 250 poles, so you see further between them into the fog. 260 ferns on the floor, which barely show in that light. | `config.spikes.placeBeyond` (`treeSpacing`, `ferns`, `oldGrowth`) |
| 667 | **The stairs' clearing.** | Sixteen giants in a ring 1.5 to 12 m outside the clearing's edge, the way in left open, 80 ferns. They stand among the ordinary forest, and their crowns show over it from a distance, so the stairs can be found by them. | `config.stairs.oldGrowth` |
| 668 | **Cost.** | Three more draw calls at the stairs and one more in the place beyond; a few thousand triangles each. Not measured on the tablet. |  |

## Session 31: the abandoned mineshaft, the bottom and the way out

Your answers at the start: no notes yet. **The seam:** a glowing crack. **The cocoon:** hung, split, 4 m. **The fuse:** 20 seconds, and the blast kills him if he's not aboard. **The ride back up:** played, then a cutscene. Everything else below is my call. All the texts are drafts.

**Batch 1: the bottom (PLAYTEST round 71)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 605 | **What's behind the bulkhead.** | A cavern nobody dug: 34 m long, 15 m across, its roof 8.4 m up, level with the end of the drift. Black beyond the torch, as the rest of the mine is. | `config.mineshaft.track` (`legs`, `wide`, `high`) |
| 606 | **How the bulkhead opens.** | Hold X for 3.2 s: Tom levers the bar out with the pinch bar from the fall. No key, no fight for it. Before, the prompt only said it wouldn't move. | `encounter.holds.door`, `MineBottom.openDoor` |
| 607 | **The seam** (your call: a glowing crack). | Up the end wall, 6.2 m tall and at most 34 cm wide, a dull red. It breathes: a pulse every 2.6 s between 45% and full, with a hum you hear from 26 m. The glow round it and on the floor is a few faint see-through layers, since nothing in the game adds a light. The light under the bulkhead used to be violet; it's this red now. | `config.mineshaft.bottom.seam`, `look.colors.seamGlow` |
| 608 | **Looking into it** (a draft). | "There's no back to it. A long way of red, and far off in it something moving, the way things move under ice." It hints at the realm of stories without showing it. Too much? | `data/mineshaft.json` `bottom.seam` |
| 609 | **The cocoon** (your call: hung, split, 4 m). | Hung from the roof beside the seam, 4.1 m long, its bottom 1.3 m off the floor, split down the side that faces you as you walk in, dark inside, bands of silk round it, ropes of it to the roof and the walls. Tom can't walk under it. | `bottom.cocoon`, `render/mineCavernModel.js` |
| 610 | **The charges.** | Nine shot holes round the seam, each with two wires down the face, gathered into a cable back along the floor to the exploder. The powder company's cases are stacked at the foot of the face. The exploder is at the far end, beside the cocoon, so the run to the cart is the whole cavern and the drift: about 40 m. | `bottom.plunger`, `bottom.charges` |
| 611 | **The foreman** (a draft name: Everett Shaw). | Sat against a case by the exploder, dead, not turned, no bite on him, his hand a foot short of the plunger. The surface said he hadn't gone down and wasn't there either; this is where he went. He never gets up. Should he? | `bottom.foreman` |
| 612 | **His logbook** (a draft, seven pages). | The army hired twelve men to open the low seam. Behind the old bulkhead: this cavern, and the split, glowing and humming. Something pale and soft came out of it and spun itself to the roof. It hatched: tall, winged, red-eyed. The army darted it, netted it (the first net it cut) and took it up, and told the men it was an owl. Then the moths came, and the men sickened; one died and was back at the face next day. The eleven drilled and packed the seam themselves and didn't come up. Shaw left his tag in his locker and went down to fire it. This is the Mothman's origin as DESIGN has it; the grub and the "owl" are mine. | `data/papers.json` `foremanLog` |
| 613 | **The moths in the cavern.** | 22 of them hang under the roof once the bulkhead's open, eyes lit, watching the seam. They leave Tom alone unless he shoots into them; then they all come down on him on foot. | `bottom.roost`, `MineFight.hangCavern` |
| 614 | **Dynamite:** 5 sticks | from the open case, up to your carry limit of 8 (if you're full they stay in the case). With the powder store's that's the second place that gives any. | `bottom.sticksGiven` |
| 615 | **The rock drill's head.** | The drill stands on a tripod where they stopped. Hold X for 3 s to knock the head off: a card and a lore item, as the other killdozer parts are. It's the dozer spike's "Spiked ram". | `MineBottom.takeDrill`, `data/lore.json` `drillHead` |
| 616 | **Anything you leave is lost.** | Once the mine's sealed you can't go back for the logbook, the sticks or the drill's head. One line says so, once, a little after you first walk in. Should the plunger refuse until the drill's head is taken? | `bottom.hintOnce`, `data` `bottom.hint` |
| 617 | **Leaving without blowing it.** | You still can: hold X at the cart and the haulage rope takes it back up (a fade, as before; I renamed it from a winch so it's the same rope the way out uses). Everything below stays as you left it. | `MineRide.winchUp` |
| 618 | **Your dot on the map** (#574 again). | The cavern is further from the headframe than the loop was, so I moved the whole mine to keep it under the clearing. The dot now wanders up to about 78 m from the headframe while you're below. | `config.mineshaft.origin` |
| 619 | **The mine's size.** | The tunnel's one mesh is about 29,200 triangles now (it was 23,750), plus fifteen small pieces and six balls of fire. Not measured on the tablet. |  |

**Batch 2: the way out (round 72)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 620 | **The plunger works by hand.** | Hold X for 1.4 s. DESIGN offered "or hooks a battery to it"; I left that out, since the cage already cost you one. | `encounter.holds.plunger` |
| 621 | **Why there's a fuse on a plunger.** | The miners spliced a length of slow fuse in, "to give the shot-firer time to reach the cart". The logbook says so and so does the line when you push it. | `data` `bottom.plunger.armed` |
| 622 | **The fuse** (your call: 20 s). | My walking test (5 m/s, no sprint) reached the cart with 11 to 13 s left. It may be generous: 14 or 15 would still be fair. | `config.mineshaft.escape.fuse` |
| 623 | **Not aboard, you die** (your call). | The blast takes all your health: the run's end screen, and back to your last save. Nothing about the fuse is saved, so it's all as it was before the plunger. | `MineBottom.blow` |
| 624 | **The count.** | On the prompt line, with its bar draining: "FUSE 14s · GET TO THE CART", in front of whatever else is offered. Once you're in the cart it moves to the small line under the gun's sight, which may be too small to read. | `MineRide.updateInteraction`, `MineBottom.banner` |
| 625 | **Getting aboard with the fuse lit.** | A short hold (0.45 s) from further off than usual, and the cart starts by itself: no brake to let off. | `MineRide.pickFoot`, `MineBottom.flee` |
| 626 | **What moves the cart.** | The haulage rope, at 4.2 m/s, until the fuse is down. Then the blast "throws" it on at 10.5 m/s for the rest. It's the excuse for a fast ride uphill. | `escape.haul`, `escape.speed`, `escape.kick` |
| 627 | **The moths leave.** | At the plunger every moth lets go and streams out ahead of you up the drift, 5 to 24 m in front, and none bites. They're in your sights the whole way; shooting them is up to you. | `escape.moths`, `MineFight.fleeMoths` |
| 628 | **How the fire's timed.** | It starts 46 m behind the cart and its speed is worked out so a cart slowed by nothing reaches the landing with the fire 9 m behind. So it's always gaining a little, and close at the end. | `escape.fire` (`startGap`, `endGap`), `fireSpeed` |
| 629 | **Hitting the dead costs you.** | The cart kills what it hits, as on the way down, but keeps only 55% of its speed each time and takes a second or two to get it back. Shooting them off the rails first is the whole game of the ride. | `escape.ramKeep` |
| 630 | **When the fire catches the cart** (your call: it singes, it never kills). | It comes over the tail, takes 12 health (never taking you under 12), and falls 11 m back before it comes on again. My first version sat on the cart and burned you down to the floor; this is kinder. A ride with no shots fired cost 36; a clean one, nothing. Too soft? | `escape.fire` (`lick`, `floor`, `fallBack`) |
| 631 | **Who's on the rails.** | Fourteen miners in eight groups of one to three, walking down the drift at you. With the thirty-odd on the way down that's a lot more than the tag board's eleven. I'd say the army's men are among them, but nothing says so yet. | `escape.script` |
| 632 | **Nothing else on the way up:** | no beetles, and the moths don't attack. It's about a minute in all (the rope, then about 33 s at speed). |  |
| 633 | **You ride tail first.** | The cart isn't turned round: Tom faces up the drift over its back, the gun swung round. It may feel backward. | `MineCart.mount(up)` |
| 634 | **The fire's look.** | Six unlit balls of orange added on, breathing, and the drift's own light and fog turned orange as it nears. No lights added. Looking back at it is the best view. | `escape.look`, `escape.light`, `MineBottom.showFire` |
| 635 | **The closing cutscene** (12 s, three shots). | From beside the rails: the cart braking in with the fire behind. From inside the cage: the fire filling the landing, the shaft's walls coming down. Black. Then the headframe from outside: a thump, a lick of fire and smoke up the shaft. Tom isn't seen (there's no model of him). | `cutscenes.json` `mine.out`, `escape.cine` |
| 636 | **Sealed for good.** | The flag is set as the cutscene starts, so skipping it or quitting in it still seals the mine. There's no going back down. | `mineSealed` |
| 637 | **The surface afterwards** is plain. | The cage's lever and the control box say it's finished, and their lamps are out. The set itself doesn't change: no smoke, no crooked cage. A style pass could add both. | `data` `out.lever`, `out.box` |

**Batch 3: the family's lines (round 73)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 638 | **The eleven lines** (drafts). | Ellen, arriving: "Black Laurel? That's been shut since before I knew you. Bad air, they said. What does the army want with a dead coal mine?" Wyatt, the tags: "Eleven tags still up? Dad, that's what the board's for. Eleven men went down and nobody came back for their tag." Wyatt, the battery: "You're running a mine hoist off a car battery. That's the best and the worst idea you've ever had." Ellen, the cage: "Tom, the second that cage drops we lose you. Whatever's down there, it isn't wor" Ellen, out: "Tom! Tom, answer me. The whole house jumped. Tell me that was you." Wyatt, out: "Was that the mine? Dad. Did you blow up a mine?" The Caller, out (south only): "Tom. You left one of them down there. Go back down and get him." At home, Ellen on the logbook: "It came up out of the ground, and they put it in a box and drove it past our road. And he left his tag in his locker so nobody would go down after him. I'm glad somebody read it, Tom." Wyatt on the drill's head: "That's off a drifter. It's made to chew into a mountain all shift and not care. Front of the dozer, Dad. Front and centre." Ellen, once it's sealed: "So that's one door shut. I don't know how many there are. But that one's shut, and you shut it." Junie, once it's sealed and she's home: "You smell like a bonfire. Did the big moths get out? I hope the big moths got out." | `data/dialogue.json` `mine.*`, `caller.mine.out` |
| 639 | **When they play.** | Ellen 1.2 s after the arrival sweep. Wyatt 5.5 s after the tag board's text and after the battery's (time to read it). Ellen as you pull the cage's lever, the first time. At the collar: Ellen 2.5 s after you're out, Wyatt 6.8 s after her (her line's reading length). Each once. | `encounter.tagsGap`, `outGap` |
| 640 | **Ellen's line at the cage cuts in** | over anything being said, as the cut at the comms line does, and stops mid-word. | `Mineshaft.goDown` |
| 641 | **South of the comms line** | (the mine is there on about half the seeds) none of the six radio lines play, as everywhere down there. At the collar afterwards the Caller says one line in Ellen's voice instead. | `Mineshaft.onSealed` |
| 642 | **No radio underground.** | A new state for the radio: nothing reaches Tom in the mine, and the HUD shows NO SIGNAL. It also fixes something the headless run found: the tunnels run under the comms line on some seeds, so Ellen's "you're going, I can't hear y" played halfway down the mine. | `story/Comms.js` `deep` |
| 643 | **Nobody speaks below.** | Not the family, not the Caller. Tom's alone from the cage to the collar; the game's own text carries it. Should the Caller have the mine too? |  |
| 644 | **Junie hopes the moths got out.** | It's the one line that's on their side. Cut it if it's wrong for her. | `mine.junie.1` |
| 645 | **Sounds** are placeholders, 12 of them | (the seam's hum, the bulkhead, the drill, the plunger, the fuse, the rope, the blast, the fire). | `audio/Sfx.js` |

## Session 30: the abandoned mineshaft, the way down

Your answers at the start: two sessions, the mineshaft's way down first; the battery is an ordinary car battery; my other defaults are fine (the mine in a pocket under the ground, the cart's gun never runs dry but overheats, a ride on rails with stops, moths that roost and stream). No notes yet. Where I had to choose:

**Batch 1: the surface (PLAYTEST round 67)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 565 | **The mine's name and story** (drafts). | The Black Laurel Coal Company's No. 2 shaft, shut in 1987 after bad air in the low seam. A few weeks ago the army opened it again (something on their instruments, far down), and hired back the old foreman and a crew who'd worked it. Eleven went down on the last shift and never tagged out. What the army brought up before that, they brought up sedated in a net: the outpost's container. | `data/mineshaft.json` |
| 566 | **What's on the surface.** | The sign with the army's tape across it, the side office (walk in), the headframe and cage over the collar, the hoist house, rails to a spoil heap, pit props, a tipped tub, the army's crates and a lamp stand. No bodies up top: everyone's below. | `render/mineshaftModel.js` |
| 567 | **The clearing is 22 m** (it was dealt 16-24 by the seed). | The set needs the room. 24 moved the railway cutting on one seed and broke its store's placement, so 22. Other clearings stay where they were on the seeds I tried. | `data/encounters.json` |
| 568 | **No parked vehicles** at the mine. | It was dealt a pickup half the time; that would have been a battery waiting at the door. | `data/vehicles.json` |
| 569 | **The six searches** (drafts). | The foreman's desk (the army's requisition: "They don't want coal. They want the low seam opened."), the tag board (eleven tags still hang), the lamp rack (3 scrap), his locker (10 pistol rounds, a first aid kit, his own tag), the army's crates (10 rifle rounds, an empty tranquilliser crate, a net cut from the inside), the tipped tub (a pale thread running back to the shaft). | `data/mineshaft.json`, `config.mineshaft.encounter` |
| 570 | **The battery** (your call: an ordinary car battery). | Hold X for 2 s at the control box with one in your pack. It's used up, for good: the lift's live from then on. With none, the box says a car battery would do it. | `encounters/Mineshaft.js` `fitBattery` |
| 571 | **The foreman's logbook isn't here yet.** | DESIGN keeps it as the mine's lore; I've left it for the bottom (next session), so the surface hints and the logbook tells. The desk's requisition stands in for now. | |
| 572 | **Nobody speaks on the surface.** | No family lines yet (Ellen warning him off the cage, the radio going as he drops). The mine's also south of the comms line on some seeds, where she couldn't anyway. Worth writing with the second half. | |

**Batch 2: the cage and the mine (round 68)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 573 | **Where the mine is** (my default, your yes). | An interior: a pocket 1,200 m under the clearing, loaded as the cage starts down and dropped when it's back up. Nothing of the forest is drawn while you're below. | `encounters/MineRide.js`, `world/Interiors.js` |
| 574 | **Your dot on the map moves while you're below.** | The mine's a real loop of tunnel about 85 by 100 m, shifted so it sits under the clearing, so the map shows you wandering up to 60 m or so from the headframe. Pinning the dot to the headframe is a small change if it reads as wrong. | `config.mineshaft.origin` |
| 575 | **The cage ride:** 26 seconds, 2,400 feet. | The walls scroll past the bars (slower than the real drop, so the eye can follow), the depth is called off on the prompt line, it hangs dead for 2.6 s at about 900 ft, then drops faster. You can look round but not get out. | `config.mineshaft.lift` |
| 576 | **The ride up is a 5 s fade,** not the ride again. | Half a minute of nothing on the way out seemed too much. It may want to be longer once there's a fireball behind you. | `lift.upSeconds` |
| 577 | **The drift's shape.** | 432 m, falling 27 m: the landing, a straight, a bend, the points, a bend, the long straight with the first roost, a bend, the fall, a bend, the steep run (13% down, right under the landing and 15 m below it), a bend, the last straight, the bottom. All from thirteen lines of config. | `config.mineshaft.track.legs` |
| 578 | **How dark.** | Black beyond your torch (the mine's own dim light, fog closing in at 44 m), a few bulbs still burning as unlit glows. The torch comes on by itself as the cage starts. | `config.mineshaft.light`, `bulbsLit` |
| 579 | **The tunnel's walls are plain.** | Rock and coal as flat-shaded faces, a timber set every 4 m, no props between stops. It's about 23,750 triangles in one draw call. It may want dressing (tubs, tools, falls, side drifts) in a style pass. | `render/mineModel.js` |
| 580 | **Dying down there ends the run,** as anywhere. | Nothing special. | |
| 581 | **A save made below comes back on the surface,** at the cage's gate, with the flags kept (the interior system's rule). | | |

**Batch 2: the turret cart (round 69)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 582 | **The cart drives itself.** | 4.6 m/s at a cruise, 9.5 down the steep run, braking over 14 m to a stand. You only work the gun (and the brake, to start). | `config.mineshaft.ride` |
| 583 | **The gun** (my default: its own ammo, never dry, overheats). | The ute's gun, older: 7.5 rounds a second, 40 a round, through two of the dead, about six seconds from cold to overheated. It goes through a hard hat. Its sight is the ute's ring with the heat round it. | `ride.gun` |
| 584 | **It swings all the way round,** and your aim turns with the cart on a bend. | What's behind matters as much as what's ahead (the moths). Might be sick-making on the tablet; a limit or a slower turn are both easy. | `world/MineCart.js` |
| 585 | **Your own guns are away while you're aboard.** | As on the ute. On foot at a stop they're back, and a shot stops at the tunnel's walls. | |
| 586 | **Two stops** (my default: two or three). | The points (set for a siding that's fallen in: throw a lever, 1.6 s) and the fall (rock across the rails: a pinch bar, 5 s, draining if you let go). Each is done once; later rides run through. | `ride.stops`, `encounter.holds` |
| 587 | **Getting on and off.** | Hold X at the cart to climb aboard; aboard and halted, hold X climbs down if the way's shut and lets off the brake if it's open. So you can't climb down at a stop you've already cleared, or mid-run. | `encounters/MineRide.js` `pickAboard` |
| 588 | **The dead reach you in the tub,** for 0.6 of a swipe. | And the cart runs down anything on the rails in front of it above walking pace. | `ride.strikeScale`, `fight.ram` |
| 589 | **The bottom is a locked door for now.** | The buffers, a timber bulkhead across the drift, barred, silk all over it and a dull violet light under it, humming. Its prompt says what's behind is still to build. | `data/mineshaft.json` `bottom` |
| 590 | **The way back is a winch** (a fade), for this half only. | Next session it's the plunger, the fuse and the fireball behind the cart. | `MineRide.winchUp` |

**Batch 3: the ride's fight and the moths (round 70)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 591 | **Zombie miners have no art of their own.** | They wear the army zombie's shapes in pit black: the helmet is the hard hat (olive, not yellow; no headlamp). 1.3x health, and the helmet stops a headshot's bonus until it's taken 18. They drop scrap. A proper miner (lamp lit?) is a style-pass job. | `config.zombies.variants.miner`, `texture.looks.miner` |
| 592 | **How many.** | 21 on the ride down (the first alone on the rails, his back to you; then twos and threes; five on the rails down the steep run), 9 more at the two stops. | `config.mineshaft.fight.script`, `stops` |
| 593 | **They know where you are from 30 m.** | The dead inside an interior can't see or hear the way the dead above do (you're unseen in there, so the forest's dead don't come), so the fight tells the near ones. Until then they stand about. | `fight.aware` |
| 594 | **Beetles:** seven, in ones and twos. | Up out of the ballast 26 m ahead, a display, a charge up the rails. They run at 0.8 of their speed down here, a little slower than the cart, so it draws away and they catch up at a stop. The cart shoulders one aside for 90. | `fight.script`, `beetleSpeed`, `ram.beetle` |
| 595 | **Three roosts:** 12, 10 and 20. | Over the long straight, over the fall, and down the steep run. The pool is still 32, so a third roost hangs only as many as are free. | `fight.script`, `stops.fall.roost` |
| 596 | **You see a roost before you reach it:** eyes under the roof, and a line the first time. | They're hung 30 m ahead of where the cart is when they appear, and wake when it's 20 m off. | `fight.moths.wake` |
| 597 | **The stream.** | Woken, each holds its own place along the track from you (13 m behind to 4 m ahead), up under the roof, drifting, and keeps 5 m/s over the cart's speed. One or two dive every 2 to 3.6 s; a dive that reaches you nips for 2 (the spike's was 4). | `fight.moths` |
| 598 | **Shooting a roost early scatters it** (my default). | From more than 24 m off, 60% flee down the drift and are gone; the rest come. From closer it just wakes. | `fight.moths.scatterBeyond`, `scatter` |
| 599 | **The roost over the fall wakes on a clock:** nine seconds after you climb down. | So the rock is levered with moths on you unless you shot them off the roof first. | `stops.fall.roost.wakeAfter` |
| 600 | **At the bottom they leave,** all at once, over the bulkhead. | It points at what's behind it. | `MineFight.atBottom` |
| 601 | **The mine's quiet after the first time down.** | Once the cart's reached the bottom, later rides deal nothing: the dead stay dead. Leave before the bottom and it all starts again from the top. | `MineFight.begin` |
| 602 | **How hard is it?** | Unknown. A cart that only fired straight ahead and never at the moths took 46 nips (92 health) with long stops, and died on foot at the first stop when it stood still among seven miners. I softened the first stop and the moths after that. A careful player should lose 40 to 60. It needs your hands on it. | `config.mineshaft.fight` |
| 603 | **No loot at the bottom yet.** | Dynamite, the rock drill head (the ram) and the logbook are next session's. This half gives only the surface's searches and what the miners drop. | |
| 604 | **Sounds** are placeholders, 15 of them (the cage, the cart, its gun, the points, the bar, a roost waking). | | `audio/Sfx.js` |

## Session 29: the moonshiners' holler

Your answers at the start: the holler, not the mineshaft; go with my defaults (the auto shotgun's in it). No notes yet. Where I had to choose:

**Batch 1: the hollow and the set (PLAYTEST round 64)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 538 | **The holler is in the ground.** | The clearing is lifted into two ridges 7.5-8.6 m high either side of a floor that winds up from the mouth (about 8 m wide) and widens to a yard (19 m) at the head, closed by a headwall. The ridges taper away before the mouth, so the pathway walks in between their noses. | `config.map.holler`, `world/hollerGround.js` |
| 539 | **Other trails come in through gullies.** | Every other pathway into the clearing cuts a gully through a ridge (about 5 m across). They all meet at the clearing's middle, which is the narrow part of the floor, so on some seeds (7 has three) a ridge has a gap or two near the yard. The stretch from the mouth to halfway is whole on every seed I tried. | `config.map.holler` `gully`, `gullyBlend` |
| 540 | **The ridges are forest.** | The game's own trees and undergrowth grow on them from 2 m up the faces (the clearing's open mask is closed there again), so they match the forest round them. Rock ledges at the faces' feet are solid, so you can't climb out except up a gully. | `GroundField.closeHoller`, `config.map.holler.wooded` |
| 541 | **Dark?** | DESIGN says dark and narrow. No lights are added (the rule), so it's as dark as the forest by day: the ridges shade the floor's sides. By torch at night it's properly dark. | |
| 542 | **The family's name and story** (drafts). | The Rigsbys: Clete (Pa), his kin Dewey, Ruby and the rest. Three generations of the still. When the lights came down over the government land last spring, Clete took them for the law coming for the still and strung the holler shut. A man in a black suit came up it in the autumn and didn't go back down. Then the portal went, and the family turned round the still. | `data/holler.json` `_note`, `papers.json`, `lore.json` |
| 543 | **The first trap is already sprung,** with a dead Man in Black face down in front of it. | It teaches the stump gun before you meet a live one, and ties the holler to the lights (they did come, just not for the still). His card has a number and no name. | `config.holler.traps` (`sprung`), `render/hollerModel.js` |
| 544 | **No parked vehicles** in the holler. | It was dealt a pickup half the time; it could have landed on the floor or a ridge. | `data/vehicles.json` |
| 545 | **What's in the set.** | The POSTED sign at the mouth, the creek from the spring, the lookout (a lean-to with the bench, the trap map and the tackle box), the still's yard (the still on its stone firebox with the gauge, the thump keg, the flake stand with the worm, the trough from the spring, mash barrels, crates of jars, sacks, the woodpile, Pa's board), the shed against the headwall (open down its front: the gun cabinet, ammo cans, jugs). About 22,000 triangles in eight draw calls (the set, the traps, six small pieces). | `render/hollerModel.js` (`HOLLER`), `config.holler.look` |

**Batch 2: the traps and the wire cutters (round 64)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 546 | **Nine traps, four kinds.** | Up the floor: the sprung stump gun, a bear trap, cans, a snare; the lookout; a live stump gun, a bear trap (not on the map), cans, a snare (not on the map), a bear trap at the yard's edge. Fixed positions (the seed doesn't move them). | `config.holler.traps` |
| 547 | **Lines catch feet, not a jump.** | Walk through a stump gun's line or the cans' wire on the ground and it goes off; jump it and it doesn't. That's how you get past them before you have the cutters. | `combat/hollerTraps.js` `steppedIn` |
| 548 | **The stump gun.** | Fires down its line: everything within 11 m and 13 degrees of its aim takes 90 damage (half at the far end), Tom 45. Its bang carries 45 m. | `config.holler.trapRules.shotgun` |
| 549 | **The cans** carry 70 m: every dead thing within it comes, the family at the still among them. | | `trapRules.cans` |
| 550 | **Caught by a bear trap or a snare.** | Bear trap: 30 damage, held until you hold X for 1.6 s. Snare: 8 damage, 1.1 s. (The witch's snare is mashed A; these are X, like everything else at the holler.) One of the dead caught is held there 14 s (bear) or 12 s (snare) and hurt a little. It stands; the snare doesn't hoist it. | `trapRules.bear`, `snare`, `holds.free` |
| 551 | **Disarming, and the wire cutters.** | Bear traps (sprung with a stick, 1.8 s) and snares (the peg pulled, 1 s) by hand. Lines need the cutters (the tackle box at the lookout, halfway up); a cut stump gun gives up two shells. The cutters are a flag: the tool belt has no display yet (the shovel isn't shown either). A trap that's gone off or been disarmed is gone for good (a flag each). | `trapRules.holds`, `encounters/Holler.js` |

**Batch 3: the beat (round 65)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 552 | **The trap map** (a lore document and a paper). | Pencil on the back of a feed sack: the holler, the creek, the lookout, the still, an X and a word for each of the seven traps the family put on it, drawn from the real layout. The two laid since aren't on it, and both are past the lookout, where you'd be trusting it. A note on it from Clete. | `papers.json` `hollerTrapMap`, `ui/paperDrawings.js` `trapMap` |
| 553 | **Clete's tally of the lights** (on the lookout's bench). | "LIGHTS AGAIN. 3. LOW OVER THE GOV LAND. THEYRE COMING." That's the whole of what the family knew. | `data/holler.json` searches |
| 554 | **The turned family.** | Five round the still from when you come within 70 m, waiting (they shuffle about within 5.5 m of it). A new look: the citizens' shapes in faded work shirts and denim overalls (the bib's the police vest block, in denim), a little tougher (1.15x). Their own loot: shells now and then. | `config.zombies.variants.moonshiner`, `texture.looks.moonshiner`, `loot.json` |
| 555 | **What wakes them.** | Coming within 13 m of the still, the cans ringing, or a shot within about 29 m. Put them down from further off and it counts as woken. Two more come down off the ridge 18 s after they wake. | `config.holler.encounter` `wakeDistance`, `familyTrees` |
| 556 | **Pa's board** (a paper, read in place). | SHUTTING HER DOWN: 1. damper shut, 2. bleed the cap, 3. line off, last; "RUBY THIS MEANS YOU". It's the puzzle's answer, in plain sight by the still. Too plain? | `papers.json` `stillBoard` |
| 557 | **The still's clock.** | The gauge reads 0.74 (in the red) when you get there and holds until the family wakes; then it climbs to 1 in 160 s. The damper stops it climbing, the relief bleeds it to 0.3 in 4 s, the line shuts it down. | `config.holler.encounter.still` |
| 558 | **A valve out of turn.** | The needle jumps (the line before the bleed: 0.16; anything else: 0.08), a gout of steam (6 damage within 2.6 m), and a line on what went wrong. The valve doesn't count. | `still.wrong`, `wrongLine`, `steamDamage` |
| 559 | **It blows.** | A blast at the still (7 m, 200 to the dead, up to 90 to Tom), and the worm's gone: the flake stand's a "twist of torn copper" you can't take. The still's mesh stays standing (no wreck model). | `config.holler.encounter.blast` |
| 560 | **Back later.** | A still left running starts back at 0.74 and holds; a family that wasn't finished is back round the still. Shut or blown stays so. | `encounters/Holler.js` `reset` |
| 561 | **The copper worm** (lore, a card). | Hold X 2.6 s at the flake stand once she's shut down. The card calls it the dozer's flamethrower one day; Wyatt explains it at home (draft). | `lore.json` `copperCoil`, `dialogue.json` `holler.wyatt.1` |
| 562 | **The family's lines** (drafts). | Ellen on the trap map ("I keep thinking how close that is to right"), Wyatt on the worm, Ellen on the auto shotgun. | `dialogue.json` `holler.*` |
| 563 | **No Caller here.** | As at the sawmill: what happened in the holler was done by people (and to them). | |
| 564 | **The auto shotgun** (your yes). | In the shed's gun cabinet with a 20-shell drum; 14 more shells in the ammo cans. Its numbers are Session 10b's (debug-only until now): 8 pellets of 6, full auto. | `config.weapons.autoShotgun`, `config.holler.encounter` |

## Session 28: the sawmill, the chainsaw, the workbench

Your answers at the start: no notes yet (a big play-test is coming); go with my three defaults. Where I had to choose:

**Batch 1: the set (PLAYTEST round 60)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 510 | **What happened at the mill** (your yes to my default; every word a draft). | The government hired Harlan Stover's crew to clear the ground for the portal programme at triple rates: cash in a case, no paperwork. On the last payday every man was told to be at the mill to sign. Two cars came up the road after dark. One agent walked into the bunkhouse with the payroll case (a suppressed pistol in it) and shot the day shift in their bunks. The others dragged them out to a pit they'd started, with lime and tarps bought that morning. Stover had worked it out an hour before and sent the night shift back to the saw. They came off it with a peavey, an axe, the log deck's chocks and a chainsaw. Nobody on either side walked away. | `data/sawmill.json` (its `_note` and every text), `data/papers.json` `loggersDiary` |
| 511 | **Names and dates** (drafts). | Harlan Stover, Stover Lumber Co.; his men Dale, Lyle and Ray; his wife Margaret. The day book runs August 4 to September 26, with no year. The job: forty acres south of the old rail line. Ray saw "a ring poured in concrete bigger than the church" with a hum off it. The crew drank at Pruitt's (Earl's). | `data/papers.json` `loggersDiary` |
| 512 | **The layout.** | The mill road comes in between the agents' two sedans. The bunkhouse is on your left, the lumber stacks on your right, the mill shed across the back of the yard (open down its front), the filing room on its right-hand end, the log deck and sawdust pile behind it. The row under the tarps and the pit are at the back left. | `render/sawmillModel.js` `SAWMILL` |
| 513 | **Nobody's dead inside the bunkhouse.** | You walk in: the bunks are empty and dark with it, and drag marks lead out of the door to the row under the tarps. That's the story, and it also means none of the dead get up indoors and get stuck behind a door. | `render/sawmillModel.js` |
| 514 | **The dead who get up are lying in the set.** | Twelve of them are one mesh. When one gets up, its body folds out of the mesh and a zombie stands up in the same place. | `render/sawmillModel.js` `hideRiser`, `world/SawmillSite.js` `raise` |
| 515 | **No parked pickups at the mill.** | The seed used to park one or two there; they could have landed inside the shed. The two sedans are part of the set: you can't drive them or open them. | `data/vehicles.json` `sawmill` |
| 516 | **The pit is painted on the ground.** | A dark rectangle with a dirt rim and a spoil heap, not a hole you can fall in. | `render/sawmillModel.js` |

**Batch 2: the chainsaw (round 61)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 517 | **The controls.** | Hold RT. It takes 0.45 s to spin up, then bites ten times a second for as long as you hold it. RB / LB to the melee kind, or the weapon cross's melee bar. | `config.chainsaw` `spinUp`, `tick` |
| 518 | **How hard it cuts.** | 170 damage a second with a sharp chain: a citizen in about a third of a second, two at once. Each bite holds them in place. Dull, it does 35% of that and holds them much less. Reach 2 m. | `config.chainsaw` `damagePerSecond`, `dullDamage`, `cleave`, `stagger`, `reach` |
| 519 | **Loud.** | While it revs, every zombie within 55 m hears it, again every 0.6 s. Idling in your hand it's heard at 10 m. The maul's thump is 9 m. | `config.chainsaw.noise` |
| 520 | **It slows you.** | 60% speed while it revs, 42% while it's in something. | `config.chainsaw` `move`, `cutMove` |
| 521 | **It overheats.** | About 9 s of revving or 5 s of solid cutting. Then it stalls and smokes, and the prompt bar shows it cooling. It starts again by itself after about 5 s, even with RT still held. Should you have to let go and squeeze again? | `config.chainsaw.heat` |
| 522 | **The chain dulls.** | It's found at 55% (it's been in a man). From sharp it takes about 50 s of cutting to go dull. It never breaks. One warning when it's nearly gone. | `config.chainsaw.wear` |
| 523 | **Tom carries all three melee weapons** (your yes). | The shovel, the maul and the chainsaw rotate like guns of a kind. | `config.weapons.rotation` |
| 524 | **What the HUD shows.** | "chain: sharp / good / worn / dull" where the ammo goes, and two small bars under it, HEAT and EDGE. OVERHEATED when it stalls. | `ui/Hud.js`, `style.css` `.hud-saw` |
| 525 | **The sounds** (placeholders, like all of them). | Its own engine note: a putter at idle, a howl revved, a growl in a cut. Plus the rev, the bite, the kill, running hot, the stall, a dead trigger and the restart. | `audio/Sfx.js` `saw()`, `chainsaw*` |

**Batch 3: the workbench (round 62)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 526 | **Where it is.** | In the cabin's main room, against the comms room's wall, left of the way from the front door to the comms door. A vise, a tool board, files. There from the start. | `config.station.cabin.workbench` |
| 527 | **What it does and costs.** | Hold X for 3.6 s to file the chain sharp for 3 scrap. It only does the chainsaw: DESIGN's idea of buying Sheriff's upgrades there is still open. | `config.station.workbench` |

**Batch 4: the beat (round 63)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 528 | **What wakes them.** | The first time the chainsaw revs within 40 m of the mill. Also: hammering the head saw off, or dusk falling with you in the yard. If you take the saw and walk away without revving it there, nothing gets up. | `config.sawmill.encounter` `revWithin`, `encounters/Sawmill.js` |
| 529 | **How many, in what order** (your yes: loggers first, then agents). | Sixteen. The five under the tarps sit up one after another; then the four of the night shift where they fell; then three agents, and four more agents out of the trees. I couldn't play that fight by hand headless, so the numbers are guesses. | `config.sawmill.encounter.waves`, `riseGap` |
| 530 | **A logger zombie.** | The citizens' shapes in flannel and work trousers, so no new art. A quarter tougher than a citizen. They drop scrap more than ammo. | `config.zombies.texture.looks.logger`, `variants.logger`, `data/loot.json` |
| 531 | **The SMG.** | On the ground beside the last agent, with 45 rounds. He's the one who stays dead. The Car Armory will still give it on the spine. | `config.sawmill.encounter.smgRounds` |
| 532 | **The car's radio** (a draft, and it's lore I made up). | A recorded recall message loops on the last agent's radio: "...ground station is lost. All field units, hold your positions and wait for recall. Do not return to the Armory. This message repeats." It plays again when the agents get up. It fits the Armory being overrun; cut it if it says too much. | `data/dialogue.json` `sawmill.dispatch.*` |
| 533 | **The man under the logs.** | Searching him gives his vest (+40 ballistic) and 12 pistol rounds. | `config.sawmill.encounter.pinned` |
| 534 | **The head saw.** | Hold X for 3.4 s at the head rig: you hammer the collar nut and the whole plate rings on each blow. No tool needed. An inspect card and a lore item; the killdozer isn't built. | `encounters/Sawmill.js` `takeHeadSaw` |
| 535 | **The family's lines** (drafts). | Ellen once the day book's handed in, Wyatt on the head saw, and Ellen on the chainsaw ("That thing stays outside, Tom"). | `data/dialogue.json` `sawmill.ellen.*`, `sawmill.wyatt.1` |
| 536 | **No Caller at the mill.** | What happened here was done by people, so it stays quiet: no voice from the trees. | n/a |
| 537 | **The tarps can't be opened.** | The prompt only says "You don't open one". After they've got up it says the rope's been pulled apart from the inside. | `data/sawmill.json` `tarps` |

## Session 27: the railway cutting, the spike maul, dynamite

Your answers at the start: skip the notes for now, the defaults, **dynamite blows up in your hand**, **scarce**, the sawmill next. Where I had to choose:

**Batch 1: the cutting and the train (PLAYTEST round 57)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 488 | **A cutting in the ground.** | The clearing on the line (wherever the seed puts it) now has two banks either side of the line, 5.6 m on the south side and 7.2 m on the north, with steep faces in blasted rock. Both ends taper down to the line's level (the cutting's mouths). It's in the terrain itself (`GroundField`), so trees, feet and the dead follow it. The map didn't move, so saves keep. | `config.map.railway.cutting`, `world/railCutting.js` |
| 489 | **The way in.** | Every pathway into the clearing comes down through a gully cut in the bank (the old wagon roads), so no seed walls you out. The powder store goes on the bank that fewer pathways come down, at the end away from them. The navvies' timber steps go up the face beside it. | `world/railCutting.js` `gullyKeep`, `world/RailwayCuttingSite.js` `storePlace` |
| 490 | **The train.** | A 4-4-0 engine heading east (its cowcatcher and a sheet of boiler plate hanging loose), the tender, two coaches in faded Tuscan red, and the baggage car off the rails at the back, leaning on the bank. Saplings grow up through the cab, the coal and the first coach. About 23,000-34,000 triangles, depending on the seed's banks: one draw call, plus small pieces that change in play. | `config.railwayCutting.train`, `render/railwayCuttingModel.js` |
| 491 | **The train's story** (drafts, all of it). | The night of October 13, 1903: the families who'd had enough took the 7:10 out to Charleston. In the cut the engineer found a lantern set down on the ties, lit, with no one by it, and stopped. Dub Combs, the brakeman, went ahead with a lamp and didn't come back. Then the voice called from both banks; eleven got down and went up into the trees. The rest walked home at first light. This makes the pastor's "her father was standing beside me" happen on the train. Rewrite anything. | `data/railwayCutting.json`, `papers.json` (`engineersNote`, `luggageLabels`) |
| 492 | **The lantern on the line.** | It's still burning, 123 years on: a warm glow with a soft halo (no light added). Try to put it out and it won't. At night it's the first thing you see down the line. | `config.railwayCutting.look.flame` |
| 507 | **The telegraph line through the cutting.** | Its poles run along the north bank's top, behind the powder store, instead of down the rock face. | `render/Railway.js` `buildPoles` |

**Batch 2: the spike maul (round 58)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 497 | **The maul's numbers.** | 65 damage (a level 1 citizen dies in one; police and army take two), a 1.15 s swing (the shovel's is 0.7), 2.5 m reach. It cleaves through up to three in its arc, each one after the first taking 65% of the last. A miss thuds into the ground with a jolt. A swing slows you for 0.75 s and carries 9 m. | `config.weapons.spikeMaul` |
| 498 | **The swing.** | An overhead smash: a slow lift over the right shoulder, a fast drop to the middle of the view, a jolt where it lands, then hauled back. Every swing is the same blow (the shovel's alternate). It has its own whoosh, crunch and thud. | `config.viewModel.smash` |
| 499 | **Where it is, and what else it does.** | Driven into a loose tie beside the engine; hold X to work it loose. It's also what knocks rusted iron off: the powder store's bar and the cowcatcher's bolts both need it (holding X with it swings it, clang by clang). | `encounters/RailwayCutting.js` |

**Batch 3: dynamite (round 59)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 500 | **The controls.** | Pick it on the weapon cross's down arm (or RB / LB to the explosive kind). RT strikes a match and lights the fuse. The fuse burns while you hold (cook it); let go and it's thrown. A tap lights it and throws at once. The fuse is 3.4 s; the prompt bar shows what's left, and "THROW IT!" for the last 1.1 s, with the hiss climbing. | `config.dynamite` |
| 501 | **The arc.** | While it's lit, the arc is drawn as dots, with a ring where it'll land. It bounces a little, rolls a metre or two and glances off trunks, walls and the dead. | `config.dynamite` (`throwSpeed`, `gravity`, `restitution`) |
| 502 | **Blowing up in your hand** (your yes). | Hold it past the fuse and it goes off where you stand. The dead around you get the full blast, but it does **70 to you** (armour first), not the full 110, so it hurts badly without always ending the run. Too soft? | `config.dynamite.inHandDamage` |
| 503 | **Switching away with it lit.** | You drop it at your feet, still burning. | `combat/Dynamite.js` `drop()` |
| 504 | **Scarce** (your answer). | You carry eight at most. Six good sticks in the powder store. When the last one's thrown, your previous weapon comes back. | `config.dynamite.carryMax`, `config.railwayCutting.encounter.sticks` |
| 505 | **A hard knock.** | A lit stick lying there goes off at once if it's shot or struck (the maul's swing counts). The store's **sweating crates** are a much bigger bang (11 m, 420 damage) if anything knocks them or another blast reaches them. Lure the dead to the store and shoot the crates; mind your own distance. Sticks in your pack can't be set off. | `config.railwayCutting.encounter.crate`, `Dynamite.addHazard` |
| 508 | **What the HUD shows.** | "N sticks" where the ammo goes, "Dynamite ×N" in the items line, and the count on the weapon cross. | `ui/Hud.js`, `ui/WeaponCross.js` |

**Batch 4: the beat (round 57)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 493 | **The coaches' insides.** | Climb aboard at an end platform (hold X) and you're in a room, as in the storm shelter: the benches, the racks, the stove, the town's things. Climb down at the end. The second coach's front door is stuck shut. | `config.railwayCutting.encounter.boardEnds` |
| 494 | **What's to find.** | The Tullys' trunk, Mary Sizemore Tate's carpetbag (coach 1), Levi Pruitt's bag with a photograph of Amos and Levi, and the conductor's punch (coach 2). These are lines of text only. **The engineer's note** in the cab and **the baggage checks** off the baggage car (every surname on the church's stones) are lore items with papers. **Hattie Bell's doll** is a lore item too. | `data/railwayCutting.json` |
| 495 | **The Caller here.** | Near the second coach, a man's voice from inside it: Amos calling for Levi. Once you're aboard, Amos again from up the bank ("Mama's up here with the lantern"). Take the doll and a girl's voice asks for her Polly. When the dead rise: "There's room on the train." The captions say "A man's voice" and "A girl's voice". | `dialogue.json` `caller.cutting.*`, `config.story.speakers` |
| 496 | **Hattie Bell's doll.** | Sitting up on a seat facing the door. Handed in at home: Ellen wants it out of sight; once Junie's home, she says its name is Polly, "I know because she told me." | `lore.json` `hattieDoll`, `dialogue.json` `cutting.*` |
| 506 | **When the dead come up.** | 3 s after the store's bar is knocked off, or straight after the cowcatcher's bolts (that much noise), or if dusk falls with you in the cut. The ballast shifts first, then three waves rise out of the ground: 6 on the floor around you, 6 up the line from both mouths, then 5 round the foot of the steps. A wave comes after 9-10 s, or as soon as two of the last are left. Save, or die, mid-fight and it starts again when you come back. | `config.railwayCutting.encounter.waves` |
| 509 | **The cowcatcher and boiler plate.** | Hold X at the engine's front with the maul (clang, clang, a bolt snaps): an inspect card and a lore item, armour for the killdozer one day. It's not bolted onto anything yet. | `lore.json` `cowcatcher` |

## After Session 26: Milo's barn (Aaron: "can it pretty please be the Milo encounter?")

Built ahead of the railway cutting (Session 28's other half). Where I had to choose:

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 480 | **Where the barn is.** | In the milosBarn clearing the seed already deals (all five optionals are dealt every run), its lane along the first pathway into it. The map didn't move (no new radius), so saves keep. The layout fits the smallest clearing (16 m). | `world/MiloBarnSite.js`; `config.milosBarn` |
| 481 | **The cars as a gate.** | A split-rail fence rings the yard and the two cars across the lane are its gate (otherwise you'd walk round them). They swing about their back ends; after the gates scene they open for Tom whenever he's near (Milo bounds over to do it), never once he's been thrown out. | `config.milosBarn.gate`, `fence` |
| 482 | **The siege.** | Nine dead round the barn the first time Tom comes within 48 m, an arrival sweep over it, Milo throwing a knife every 1.3-2 s at the nearest within 24 m (one knife, one dead). Tom can help. | `config.milosBarn.encounter.siege`, `throwEvery` |
| 483 | **The act's rules.** | Hold X on the X: the knives at 2.2, 4.8 and 7.4 s. Drifting more than 30 cm off the mark, or firing, is a flinch: "A flincher! From the top!" and you go again. | `config.milosBarn.encounter.act` |
| 484 | **His killdozer part** (open in DESIGN). | His **calliope horn** (an inspect card and a lore item for now; the killdozer isn't built). My idea for later: bolted to the dozer, it plays his tune and draws every dead thing to it. | `lore.json` `calliopeHorn` |
| 485 | **Shooting him.** | Any hit on him is knocked aside (a clang, a ricochet), any time: during the siege too, so mind your aim. "I was in character!" and Tom's thrown out (milo.thrownOut) if he's inside the fence. The show's closed for good. The man the morning after just isn't hit. | `MiloBarn.shotAt` |
| 486 | **The morning after.** | The first dawn after the act (a dawn-triggered flag), and every morning after until Tom takes the mug: the man by his van, the gates left open. The subtitles call him "Milo" for the first time (in character he's "The clown"). | `progress.json` `miloMorning`; `config.story.speakers` |
| 487 | **Light inside the barn.** | The barn doesn't take the sun's shadow (under its own roof the act was in the dark), the board and stage are lantern-lit (drawn unlit in warm wood, two hurricane lanterns as glows), and the knives glint (unlit). No light is added. | `render/miloBarnModel.js` |

## After Session 26: Milo redone (Aaron's notes)

Aaron: the clown's outfit read skin tight and the wig wasn't clowny ("use a green-haired creepy killer clown for your inspiration; he can be a little supernatural"); the man's clothes were skin tight and his belt super loose. Built (`render/miloModel.js` `clownBody`, `manBody`; in the model viewer). Where I had to choose:

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 476 | **How creepy, given Session 25's "too creepy, the smile's too wide".** | The creep comes from the eyes and the hair, not the mouth: the mouth stays a normal width (Session 25), with thin painted lines running up from its corners into the cheeks; tall dark diamonds through the eyes; wild green tufts round a bald crown. No red nose (the story's Milo has none). The archetype, not any one film's clown. Say if the painted lines are too much. | `clownBody` (the `socket` and `grin` shapes) |
| 477 | **"A little supernatural."** | His eyes glow faintly, a dull yellow of their own: by torch it's a glint, in the dark it's all you see of his face (no light added: the figure's own shader). His gloved fingers are too long. Nothing he does changes yet: the impossible things are the barn's (Session 28: the car gates, the deflected bullet). | `config.milo.eyeGlow`; `clownBody` (the fingers) |
| 478 | **The suit.** | A baggy smock with puffed sleeves, balloon pantaloons, ruffled cuffs, ankles and peplum, a wide pleated ruff (it replaces the red collar), red pom-poms; the dots kept. About 30,000 triangles at most (the pleats use coarser spheres: a new `lo` flag in the figure kit). The suit is a shade duller and he's lit a little less (albedo 0.3), because the bigger white suit caught the torch. | `clownBody`; `config.milo` |
| 479 | **His height** (Aaron: "about 1 ft shorter, it's funnier if he's short"). | The clown 1.45 m (was 1.75). **Settled (Aaron): the man stays 1.75 m**, a head taller than the clown he plays: funnier. The clown's long arms, big shoes and hair scale with him. | `config.milo.height`, `manHeight` |

## Session 26 (Junie taken, the Caller, the old church, the stairs, Junie home)

You were at work and the session ran on its own, from HANDOVER's defaults. All four batches are built (Session 27's batch 4 included). Where I had to choose:

**Batch 1: Junie is taken (PLAYTEST round 51)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 449 | **Both plane endings end at dawn.** Your default: in the drive-off, the Mothman's last strike smashes the radio, and the night passes. | Driven off, or leaving on its own: a first-person beat (`plane.radioSmashed`) in which its last low pass rakes Tom and Ellen's call cuts off mid-word ("Come home right n"), then static, then black. He wakes at dawn in the wreck with "The radio's in pieces. Home's north", and the HUD says RADIO DEAD. I didn't play the night out: the whole point is that nobody could reach him, and skipping keeps the two endings the same from here. | `encounters/CrashedPlane.js` `mothmanGone`, `nightPasses`; `cutscenes.json` `plane.radioSmashed` |
| 450 | **When the family's account plays.** | Radio working (the blackout): 5 s into the dawn, over the radio. Radio smashed: face to face as Tom comes within 75 m of home (they see him from the porch); then Wyatt hands him the spare handset from the tower (`radioMended`) and the radio works again. | `config.junieTaken.accountDelay`, `homeRange` |
| 451 | **"Junie's line slot is silent."** | In the account Ellen tries the channel ("Junie, baby, if you've got a radio... say something") and a line comes up with JUNIE's name and nothing but "...": no letters, so no blips. | `dialogue.json` `junie.account.7`, `.8` |
| 452 | **The trail-camera clip.** | `clip.junieTaken`, 54 s, offered on D-pad down after the account, then on the monitors. The camera's at the compound's edge, 7 m past the fence toward the plane, looking out to the treeline (deeper in the trees the figures were lost in the bushes). Its beats are timed to each caption's reading length. Torches are small glows. The captions are what the camera's microphone picked up. Long for a clip: say if it drags. | `cutscenes.json` `clip.junieTaken`; `config.junieTaken.clipFrom` |
| 453 | **"Her room or bed is empty."** | The cabin has one room, so: Junie's gone from the comms room (figure, collider and talk), and her stuffed rabbit lies on the bottom bunk. Hold X on it: Wyatt found it at the edge of the trees. It goes back with her. | `encounters/JunieTaken.js` `buildRabbit`; `config.junieTaken.rabbit` |
| 454 | **The Caller's tell** (your default 3: something the player learns). | Its lines use the family's names and colours, but a faint dull-red double trails every letter, the name sits a hair skewed, the strip flickers slower and wrong, its blips are a touch flat and quiet, and there's no crackle, only a breath. The HUD says NO SIGNAL the whole time, which is the plainest tell of all. Even the clip's "Tom" lines carry it. | `style.css` `.subtitles.caller`; `Subtitles.js`; `Sfx.js` `callerOpen`, `callerNear` |
| 455 | **Lines the radio can't carry** (smashed, or south of the line). | Dropped, not queued: a family line is lost if it can't reach Tom. The objectives and the face-to-face lines cover anything that matters. Junie's lines are dropped the same way while she's away (captions on clips still show). | `story/Dialogue.js` `deliver`; `story/Comms.js` `blocks` |
| 456 | **A line's chain** (`next`). | Up to 12 lines now (was 8): the account is 9. | `Dialogue.show` |

**Batch 2: the Caller and comms in the south (PLAYTEST round 52)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 457 | **The comms line.** | 480 m south of home's centre (the plane's 392, the church's 565), ±14 m of hysteresis. Ellen warns once, 45 m short of it. The first time Tom crosses, her call breaks up mid-word. Back north the first time, Ellen: "Whatever you heard down there, it wasn't us"; later times a short "Got you again, Dad" (not more than every 150 s). | `config.comms` |
| 458 | **The Caller's rate.** | First call 9-16 s after crossing; then every 50-85 s by day, 26-46 s at night (dusk and dawn between). By day 35% of its calls come from the trees, at night 60%. Never over a cutscene, paper, card, menu, another line, or inside an interior. Only once Junie's taken. | `config.caller` |
| 459 | **Its lines** (25 drafts). | 17 over the radio (10 Junie, 3 Ellen, 3 Wyatt, and Tom's own "Over here. I'm hurt", replayed), 8 from the trees (Tom's name called, mostly in Junie's voice: one is just "Tom.", which she'd never call him). Please rewrite freely. | `dialogue.json` `caller.radio.*`, `caller.trees.*` |
| 460 | **A voice from the trees.** | 26-44 m off, from behind him 60% of the time. A positional sound (two breathy falling notes, "To-om", pitched for whose voice it wears; placeholder until real recordings) and the line, with "From the trees, behind you, to your left" (and so on) under it. | `Sfx.js` `callerVoice`; `Caller.js` `bearingWords` |
| 461 | **The fog that moves wrong.** | The mist near Tom streams toward the voice against the wind; half the drifting mist puffs gather into a bank where the voice is (thicker than they ought to be); then the bank rolls out toward him and thins. The low height-mist's flow stops and runs backward. No light, no new draw call. It shows best in the open by day; at night you need the torch. Subtle on purpose, but say if it's too subtle. | `config.caller.fog`; `render/wrongFog.js`; `GroundMist.gather` |

**Batch 3: the old church and the time capsule (PLAYTEST round 53)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 462 | **The names** (your default 4: mine, draft). | The town: **Hemlock Gap**. The church: **Mount Zion Church**, built 1889. The pastor who wrote the account: the Rev. Elias Marsh. The spirit (Bigfoot): **the Keeper** ("the ridge folk always said the wood had a keeper"; "Where the Keeper is, the voice is not"). The night of the taking: **October 13, 1903**, so the plaque's "TO BE OPENED OCTOBER 13, 2003" falls in the game's own month. | `papers.json` |
| 463 | **The taken.** | Eleven on one night, in a row of small identical stones: among them Levi Pruitt (Earl's family, a hundred years back) and Hattie Bell McCoy, aged nine, who "went to her father's voice" (Junie's age). His brother Amos found the stairs, went up after Levi and came down alone; he went back the next night and didn't come down (his name's scratched on the back of the last stone). Ada Mae Tully, the first, in August. | `papers.json` `graveyardStones`, `capsuleAccount` |
| 464 | **The account's texts** (drafts). | Six pages in the pastor's hand: the railroad's cut, the voices, the night of October 13, Mrs Sizemore and the place behind this one, Amos's staircase (with his pencil drawing, inline SVG), the Keeper and what they carried across the cut (left vague for the Blessing), and the warning: "take the silent way. Take it every time, whatever you hear." | `papers.json` `capsuleAccount`; `ui/paperDrawings.js` |
| 465 | **The set.** | One baked mesh, about 15,000 triangles: grey clapboard with boards gone, the east wall's back end fallen in under a caved roof with bare and snapped rafters, three windows a side (boarded and broken), the leaning steeple (a bell askew in a cracked yoke, a piece of its lip in the grass), tipped and broken pews with a beam across them, the lychgate, crooked old stones, an iron fence with gaps, a dead oak, the plaque stone. The door faces the way the story brings Tom (from the plane). You can walk in through the steeple's door. | `render/oldChurchModel.js`; `config.oldChurch.look` |
| 466 | **The beat's order.** | The sweep (after the clip's been watched: before then it's only a ruin); Junie's voice from inside the church; the cracked bell; her voice again ("Everyone's here. They've been waiting such a long time"). The plaque has to be read before the dig is offered (both prompts were on the same spot). Dig 4.5 s with the shovel; open the box; the card offers read or keep. The stairs go on the map when the account is read (there, or later at the ledger). | `config.oldChurch.encounter`; `encounters/OldChurch.js` |
| 467 | **The stairs on the map.** | Their clearing's fog lifts (30 m round) and its name shows; until then it's just "Clearing". The goal: "Find Amos Pruitt's staircase, a half day east of the church." | `encounters.json` `stairs` `hiddenAs`; `config.oldChurch.encounter.stairsReveal` |
| 468 | **The family on the capsule.** | Face to face once it's handed in: Ellen ties it to document one's "thin site"; Wyatt: "Take the silent way. Every time. Even if it's her"; and a Pruitt line. Nothing over the radio: the church is south of the line. | `dialogue.json` `capsule.*` |

**Batch 4: the stairs, the place beyond, Junie home (PLAYTEST round 54; Session 27's batch, done)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 469 | **The stairs.** | Fourteen steps of a house's stairs (painted risers, varnished treads, a red runner with brass rods, a banister) climbing to nothing, away from the church. **Clean** (baked with no weathering) and **lit by nothing** (an unlit material: it looks the same at noon and at midnight; no light added). A held look and a thin glassy tone the first time you see it (15 m: inside the clearing so no trunk's in the way). | `render/stairsModel.js`; `config.stairs` |
| 470 | **When you can climb.** | Only while Junie's up there (taken, not yet found). Before: "A staircase up to nothing. Clean, as if someone dusts it." After she's home: "You're not going up there again." Back down from the first clearing takes you out. | `encounters/Stairs.js` |
| 471 | **The place beyond's look** (#378's question, for the story). | The fog closer (19 m), bone-grey trunks, blue-black crowns, a dead floor, and every tree leaning a little in toward the clearing's middle, as if watching it. Junie's voice down the calling paths says which path ("Down the north path") with the Caller's tell on it. Back at the start: "Back again, Daddy?" A silent path: "It's quiet this way (1 of 3)". | `config.spikes.placeBeyond.story`, `storyLight` |
| 472 | **The find.** | The last clearing is wider and empty but for her: kneeling, hands over her ears, "I'm not listening." She turns: it did everyone's voice all night and she never answered it once. She runs to him. A first-person scene, 30 s. | `cutscenes.json` `beyond.find` |
| 473 | **Bringing her home.** | She follows 1.7 m behind (faster when she falls back, put beside him past 28 m), always looking at him; she can't be hurt and nothing targets her. On a vehicle she rides along (hidden) and gets off with him. Five things said on the way. Through the gate: the homecoming by the cabin door (Ellen on her knees, Wyatt's sorry, "Dad came. He didn't follow it either"). | `config.stairs.encounter.follow`; `cutscenes.json` `junie.homecoming` |
| 474 | **Save and quit with Junie following.** | Continue puts Tom at home as always, with her beside him, so the homecoming plays at once. That skips the walk home; I think that's fair (it's what Continue does for everything), but say if you'd rather she wait at the stairs. | `encounters/Stairs.js` `reset` |
| 475 | **After she's home.** | The family are three; her lines come back (new ones: she puts her hands over her ears when it calls); the Caller keeps her voice. The goal says to keep the station running until the next beat (the Blessing, Bigfoot). | `dialogue.json` `junieBack.*`; `story/Objectives.js` |

## Session 25 (your play-through notes, the giant moths, the crashed plane)

Your notes as given are in the old HANDOVER.md (git history, commit 7f5de33). All 26 items are built, then the moths and the plane's beats. Where I had to choose:

**Batch 1 (PLAYTEST round 42)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 412 | **The aid box at the start.** Its prompt is hidden while Tom is at full health; once he is hurt it offers its kits as before. | As described. | `base/Station.js` `pickInteraction()` |
| 413 | **The mutant waking.** It wakes within 2 m. Down its aisle the trigger is 3.2 m: the old trigger fired at the aisle mouth, about 6 m away. | `wake.near: 2`, `wake.aisle: 3.2` | `data/gasStation.json` |
| 414 | **The dead and cutscenes.** While any cutscene plays no noise carries (the quad engine, gunfire). When one starts, every zombie chasing Tom from more than 10 m away forgets him and goes back to what it was doing. Zombies closer than 10 m keep coming, but they cannot hurt him until it ends. | `cutsceneForgetBeyond: 10` | `config.detection`, `EnemyManager.forgetPlayer()` |

**Batch 2 (round 43)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 415 | **The tower craft.** It hangs at the light's old spot (24 m up, at the edge of sight) for about 2.4 s, drifting a little, then zips **up and away to the east**. It is gone 1.1 s later and speeds up all the way. Ellen's line ("the military, a training exercise") still follows. Wyatt's line now asks what it is. Should it zip south (toward its crash) instead? | Its size is 0.6 of the dogfight's craft. | `data/cutscenes.json` `day1.tower` |
| 416 | **The gas station sign moved.** The pole sign moved from (11.5, 10.4) to (12.2, 5.8) in the frame: in off the power line, toward the store, still clear of the canopy. A test checks it against the pole line. The sweep's last shot frames it from the road side. | As described. | `data/gasStation.json` `sign`, `sweep.gasStation` |
| 417 | **Earl's tape.** There is one tape, labelled CAM 4, which is his trail camera four clip. Wyatt's line is now "It was still in his VCR? Then it's off his trail cams..." (draft). The card's line says it was still in the VCR. | As described. | `data/dialogue.json` `shelter.tapes`, `data/lore.json` |
| 418 | **Wrecks on the shoulder.** The police car and the army truck (the one on the centre line before the outpost) moved onto the road's south shoulder. No placed vehicle may have a corner within half the road's width plus 0.3 m of the road or the road north, so cars nosed onto a path crossing are moved too. C-7 moved 2 m off the road. Tests cover four seeds and the outpost's and the gas station's colliders. The experimental vehicles have no parking spots (they are brought to Tom), so there was nothing to move. | `roadKeep: 0.3` | `data/openingCluster.json`, `config.vehicles.placement`, `data/outpost.json` |
| 419 | **The witch fly-away sound.** Only the gas station cutscene uses the new rush of wind. Her shriek when she notices Tom or is hit is unchanged. Should those change too? | `witchRush` | `audio/Sfx.js` |

**Batch 3 (round 44)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 420 | **The ute gun dip.** Over the sides and the back it dips to -0.8 rad (-46 degrees). Over the cab it stays at -0.38, blending between the two. At its steepest the barrel can pass through the tray side. The round's ray already ran from Tom's eye, which is behind the breech. A tracer now only shows when the hit is past the muzzle. | `pitchMinSide: -0.8` | `config.ute.gun` |
| 421 | **Lamp numbers.** Ute headlamps: 1600 cd at 24 degrees, now 850 at 30. Gun lamp: 1100 at 13, now 650 at 16. Dozer work lights: 1300 at 26, now 600 at 32. Only numbers changed. | As described. | `config.ute`, `config.dozer` |
| 422 | **Rocks the dozer breaks.** Every loose rock and boulder from the terrain scatter breaks. The cliffs and the cave road's spur do not. A rock holds the blade for 0.35 s plus 1.1 s per metre of size over 0.4 m, so a 1 m boulder holds about 1 s. Broken rocks are saved as an optional list, so the save version is unchanged. | `clearing.rocks` | `config.dozer.clearing`, `world/LandClearing.js` |
| 423 | **The winch gap.** A winched car stops 0.6 m short of the dozer. The cable just holds it there. | `winch.carGap: 0.6` | `config.dozer.winch` |

**Batch 4 (round 45)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 424 | **The swap button.** RB flips between the last two weapons used. LB is the shovel, and pressing it again goes back. I took this as the shovel's own button. On a keyboard the wheel still cycles and keys 1-8 still select. | As described. | `player/Weapons.js` `swapLast()`, `toggleShovel()` |
| 425 | **The cross's down arm.** The flare gun is always marked found, with the flare count. Picking it closes the cross and says Y fires a flare, because it is never held. Dynamite is always an empty slot (not built yet). Military explosives is the detonator, found while charges are out or in hand. | As described. | `ui/WeaponCross.js` `extras()` |
| 426 | **Where the cross opens.** It does not open while riding a vehicle. Its icons are drawn in code, from the rack's shapes. | As described. | `core/Game.js`, `ui/WeaponCross.js` `drawIcon()` |
| 427 | **#390 (the gun choice's default)** is moot: the panel is gone. | n/a | n/a |

**Batch 5 (round 46)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 428 | **Milo's heights.** The clown is 1.75 m. The man the morning after is 1.85 m: same skeleton, out of costume, and the story calls him tall. | `height: 1.75`, `manHeight: 1.85` | `config.milo` |
| 429 | **Milo's dots.** About one sphere cell in two has a dot, red or blue, 5.5 cm across. On the low-poly suit they blur into short dabs. | `dotAt()` | `render/miloModel.js` |
| 430 | **The grey's trousers** are dusty brown-grey. In the gunslinger stage its boots sit under the trouser cuffs. Should they be tucked in? | `colours.trousers` | `config.aliens.grey`, `render/alienModel.js` |

**Batch 6 (round 47)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 431 | **No axe in a stump.** You took it out in Session 19, because an axe Tom cannot pick up reads as a weapon he should be able to. The camp table and stove, the clothesline, chairs, cooler and lantern stay. Should more go for a purer bushcraft camp? | As described. | `data/campsite.json` |
| 432 | **Lean-to colours.** Brown, olive (the shotgun's, still green), and grey-blue (the slashed one). | As described. | `data/campsite.json` `tents` |

**Batch 7 (round 48)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 433 | **Moth numbers (first guesses).** Health is 16: one service rifle round (25) kills, or three shotgun pellets (6 each). A dart comes every 1-2 s with 1-2 moths. Each nip does 4 damage, about 24 a minute from a full swarm. The hit shape is 0.35 m. The cloud is 2-5 m across and 3-5 m up. | As described. | `config.spikes.moths` |
| 434 | **No aim assist** on moths, so the aim does not stick to the cloud. Too hard to hit? | `noAssist` | `ai/Moths.js` |
| 435 | **Flutter sound.** One quiet flutter about every 0.3 s for the whole swarm, from its middle. | `flutterEvery` | `config.spikes.moths` |

**Batch 8 (round 49): the crashed plane, my reading of DESIGN.md**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 436 | **When it starts.** The standoff needs `outpostCleared` and fires 16 m from the grey: close enough for a quick draw. The cutscene is the world running with the view held on the grey. It cannot be skipped and lasts 2.9 s. | `needs`, `triggerDistance: 16` | `config.crashedPlane.encounter` |
| 437 | **The quick draw.** The window is 0.55 s after control returns, and any hit kills. In tests an aimed rifle shot made it, an unaimed one at 22 m did not. | `quickDraw: 0.55` | same |
| 438 | **The grey's gun.** Its model still holds the shotgun from Session 24, but what it drops is the pilot's pistol. Should the model hold a pistol? | As described. | `render/alienModel.js` `KIT_STAGES` |
| 439 | **The shootout.** The grey has 70 health. It hides for 1.4-2.6 s, steps 3.8 m out past the wing tip, aims for 0.6 s and fires: 40% chance to hit, 9 damage, line of sight needed. It hops over the wing into cover. In the headless runs Tom lost 10-35 health. | `greyHealth`, `shootout` | same |
| 440 | **The drops.** All four come from one hold-X search. Where the healing pool is full, the med kit goes home to the aid box. The power cell is carried as a flag and fitted at the fence box. Should each drop have its own card? | `drops` | `encounters/CrashedPlane.js` `loot()` |
| 441 | **The pilot's log** is a two-page draft, signed LT. D. HALE. Its name and words are yours to change. | As described. | `data/papers.json` `pilotLog` |
| 442 | **The flare.** Wyatt suggests it 10 s after the drops are taken. Tom fires it from the survival kit; it climbs about 50 m. | `flareAfter: 10` | `config.crashedPlane.encounter`, `plane.flare` |
| 443 | **The Mothman.** He uses the flyer spike's numbers: 260 health, leaves hurt below 35% (about 7 service rifle hits), 22 damage a strike. The script is two flyovers, then dives until one ending. | `mothmanScript`, `config.spikes.flyer` | same |
| 444 | **The blackout.** Tom wakes at the survival kit at dawn with 10% health. The clock runs through the night he lost: night events happen, but the forecast is closed. "Dawn. Your radio's quiet" shows as a toast. If he drives the Mothman off, Ellen calls and the clock runs on. Either ending sets mothmanMet and planeDone. Junie taken is Session 26. | As described. | `CrashedPlane.wake()` |
| 445 | **Saving.** Every beat is a story flag. A fight that was on when the run was saved starts again: the standoff replays, or the flare can be fired again. | As described. | `data/progress.json` |

**Round 2 (your notes after playing; PLAYTEST round 50)**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 446 | **Settled (Aaron: "yes, it's right").** **The rotation's order.** It goes pistols, rifles, shotguns, the shovel, then the detonator while charges are out. LB goes the other way. The wheel turns like RB. Aaron: melee goes in a bar along the bottom of the weapon cross (built: the shovel, plus empty slots for the spike maul and the chainsaw). He's happy with the wall where it is (#447). | `rotation` | `config.weapons.rotation` |
| 447 | **The camp's arc.** The lean-tos are 3.6 m from the fire, at -60, 0 and +60 degrees on the warm side. The wall is 1.35 m from the fire on the entrance side, so you see its back as you walk in. Aaron: good as it is. | As described. | `data/campsite.json` |
| 448 | **The Enemies tabs.** Where an enemy has its own place-based tools (the outpost's crates, the gas station's mutant, the campsite's wave), those stay with the place. The tabs hold the spawn-anywhere tools. | As described. | `debug/DebugMenu.js` `ENEMY_TABS` |

## Session 24 (Graphics Engineer / Technical Artist: models for the next stretch)

Aaron's answers at the start (Nov 10): round 36 and the glare list **not yet** (they can wait). The order is fine: **the Mothman first**, then the plane's set, giant moths, Bigfoot and the cocoon, Milo and his animals. The Mothman's look: **"go with your gut"**; push to `main` when he's done and Aaron plays him from the debug menu (PLAYTEST round 37).

**Built: the Mothman** (`render/mothmanModel.js`, `render/MothmanRenderer.js`, `config.mothman`): one skinned mesh, one draw call, about 19,000 triangles, no lights. The flyer spike wears him (#385's look is resolved by this; its numbers stay open).

My calls (PLAYTEST round 37):

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 393 | **His look.** A gaunt dark man-shape, 2.3 m, furred like a moth: a ragged ruff with the head sunk into it, feathery antennae, long arms with three claws, clawed feet. | As described. | `render/mothmanModel.js` (shapes), `config.mothman.colours` |
| 394 | **His wings.** Two pairs of dusty moth wings, about 5.3 m across, with a faint rust-and-ash eye-spot on each (they show when he mantles). Closed, they hang down his back in a moth's delta, the tips trailing behind him. Moth wings, or would you rather leathery ones? Are the eye-spots too much? | As described. | `forewingPoint`, `hindwingPoint`, `FORE_SPOT`, `HIND_SPOT` in `render/mothmanModel.js` |
| 395 | **His eyes.** Big, round, red, the only bright thing on him: they glow in their own colour, bloom, and aren't fogged. A slow swell (12%, every 3 s). Brighter, dimmer, bigger? | `eyeGlow: 3`, `eyePulse`, `colours.eyes` | `config.mothman` |
| 396 | **How dark he is.** His colours are multiplied by 0.3 so the torch doesn't blow him pale up close; by moonlight he's a black shape. Right, or should the fur read more under the torch? | `albedo: 0.3` | `config.mothman.albedo` |
| 397 | **His poses.** Twelve (stand, mantle, perch, cling, glide, fly, dive, strike, flinch, wounded, dying, corpse). The clinging one turns his head right round to look back at you. The dying one is a first sketch: the cave's fight will want its own. Any missing for Session 25's crash site (he knocks Tom out)? | As described. | `render/MothmanRenderer.js` `targetPose()` |

**Built: the crashed plane's set** (Aaron: "start on the crashed plane set"; `render/crashedPlaneModel.js`, `world/CrashSite.js`, `config.crashedPlane`): one baked mesh, one draw call, about 19,000 triangles, no lights, in its clearing on every seed. Its placeholder signpost is gone. Only the set: the encounter is Session 25's.

My calls (PLAYTEST round 38):

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 398 | **Which way it lies.** The plane was flying away from the checkpoint, so Tom walks up its gouge to the wreck (the destruction first, the plane last). Right, or should he come on it side-on? | `yaw: null` (away from the checkpoint) | `config.crashedPlane.yaw` |
| 399 | **The layout.** Along the gouge: snapped trees, the sheared wing on a broken trunk, its burnt engine, the tail rolled over to the left, the front of the plane nose-down in a heap of earth, the kept wing out to the right as the workbench. | As described. | `buildCrashedPlane()` in `render/crashedPlaneModel.js` |
| 400 | **The dissection.** The gun's parts in rows on a square of canvas on the wing, drawn 1.35x their size so they read from where Tom stands; the opened pod on the ground in front. Enough, or bigger, or more parts (the whole second pod)? | As described. | `dissection()` |
| 401 | **The pilot.** In his seat, slumped in his straps, helmet on, head and shoulders above the hull. No blood, no face. | As described. | `pilot()`, `cockpit()` |
| 402 | **The plane's look.** Plain dark grey, a faded star-in-a-disc on each side of the hull and on the tail, no numbers or lettering (a painted board would be one more draw call). Add a tail number? | As described. | `marking()`, `config.crashedPlane.look.colors` |

**Built: giant moths** (Aaron: "dog sized swarm"; `render/mothModel.js`, `render/MothRenderer.js`, `config.moths.giant`): one instanced mesh, so a whole swarm is **one draw call**; about 1,900 triangles each; the wings beat in the vertex shader. Model only.

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 403 | **Their size and look.** About 0.8 m long and 1.7 m across: a fat furred body, a banded abdomen, the Mothman's wings in small and his red eyes (unfogged). Bigger, smaller, plainer wings? | `scale: 1` | `config.moths.giant` (`scale`, `colours`, `eyeGlow`) |
| 404 | **Settled: 16 to 32.** How many. The renderer draws up to 32 at once; the viewer's swarm is 16. What's a swarm in the mineshaft: a dozen, thirty? (It decides their health and damage when their behaviour is designed.) | `poolSize: 32` | `config.moths.giant.poolSize` |

**Built: Bigfoot and his cocoon** (`render/bigfootModel.js` on the new `render/PosedFigure.js`; `config.bigfoot`): one draw call for him, one for the cocoon. Model only.

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 405 | **His look.** 2.6 m, broad, dark red-brown shaggy hair, a domed head with a heavy brow and no neck, a dark bare face, small warm eyes (a faint glint so they read in the cave), arms to his knees. | As described. | `bigfootSpec()`, `config.bigfoot.colours` |
| 406 | **What he wears.** A necklace of bone, river-stone and red-seed beads with a carved tooth, and a woven band on his left wrist: his own handiwork (the design's "a person with a culture"). Right amount, or more (a belt, a carried tool)? | As described. | `bigfootSpec()` |
| 407 | **The cocoon.** A 3 m pod of grey silk hung by ropes of it, a seam down the front laced with strands (his face and beads show through); cut, the front lies open. Should more of him show, or less (only a hand, or nothing until it's cut)? | `buildCocoon(c, 0 or 1)` | `render/bigfootModel.js`, `config.bigfoot.cocoon` |

**Aaron's answers (Nov 10, after the models were pushed):** he attached **The Lone Clown** (#408-411 answered from it, below). **#404 settled: a swarm of moths is 16 to 32** (the renderer's 32 covers it; the viewer's swarm is now 24). The glare, the eyes at distance and the frame rates: he'll check in his big play-test.

**Corrected from the story** (all in `config.milo`, `config.barnAnimals`, `render/miloModel.js`):
- **The clown** wears **a polka-dot clown suit, fitted well** (not stripes, braces, patches or a ruff: those were my guesses, gone), **white greasepaint, a red grin painted so wide it nearly touches his ears, painted eyes, a bright green wig of curls, white gloves, oversized shoes. No red nose.** His knives are **a set of three** (one in his hand, two tucked into a fold of the suit; the bandolier is gone). In full kit his arms look too long and his frame narrower.
- **The man** is tall, **broad-shouldered, dark-haired** and handsome (he was brown-haired and stubbled; now dark hair, clean jaw, a broader build than the clown's), in a flannel shirt, jeans and boots, with a tin mug of instant coffee.
- **The donkey is grey** (it was grey-brown), calm and half-lidded, and **she** never looks away. **The Shetland is the colour of burnt caramel** (it was dark brown). The python is thick and patterned, **coiled round a branch** in its glass tank (mine is coiled on the ground: the branch and the tank are the barn's set, Session 28). The turkey is enormous.
- The story gives the suit no colour: **I made it blue with white and red dots** (a cream suit read as bare skin under the torch). **Settled (Aaron, Nov 10): the blue suit is fine.**

**Built: Milo and his animals** (`render/miloModel.js`, `render/barnAnimals.js`, on `render/PosedFigure.js`; `config.milo`, `config.barnAnimals`): one draw call each. Models only: the barn is Session 28's.

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 408 | **The clown's look: answered from the story** (above). **The suit's colour is settled: blue** (Aaron). Still open: the painted eyes' shape (black diamonds: my pick; the story says only "two painted eyes"). | As the story has him. | `miloSpec()`, `config.milo.looks.clown` |
| 409 | **The man: answered from the story** (dark hair, broad shoulders, flannel, jeans, boots, the tin mug). The flannel's red-and-black check is my pick. | As the story has him. | `miloSpec()`, `config.milo.looks.man` |
| 410 | **The donkey.** Grey-brown with the dark cross on its back, a pale muzzle and a pale ring round each eye (so the stare reads); in the stare, only its head moves, and an ear. **Answered: grey.** | Grey now. | `equineSpec()`, `config.barnAnimals.donkey` |
| 411 | **The others: the pony answered (burnt caramel).** A caramel shaggy Shetland with a pale mane over its eyes; a bronze-black turkey, about 1.3 m to the top of its fan, with a blue-grey head and red wattle; a brown blotched python about 5 m long, coiled. Any of them wrong for the story? | As described. | `render/barnAnimals.js`, `config.barnAnimals` |

## Session 23 (QA & Balance: the opening with the new systems)

Aaron's answers at the start (Nov 10):
- **The spikes on the tablet:** the place beyond, the flyer and the dozer with its parts all hover at **about 57 fps**, dipping to 40 only when something hectic happens ("99.9% of the time we are at 57"). In DESIGN.md's spike table: **M10.3 closed**, every spike a go on the tablet.
- **Round 35:** he can see over the armour plating from the dozer now.
- **His glare list:** not yet.
- **Push to `main` as you go.**
**Aaron's answers (Nov 10):** **#391 settled:** he never ran short of ammo, so it stays as it is (the bot's aim, not the numbers). **#392 settled:** wandering into the outpost early is fine. #390 (the gun choice) and the rack: he'll check in play (round 36).

**Found and fixed in the play-through** (headless, seeds 1234, 7, 4242: Day 1 to past the cordon, Save and quit at dawn 2, after the gas station, in the shelter's room, after the outpost and past the cordon):
- **The dawn autosave missed dawn's own story flags** (`day2`, `shelterCall`'s back-up): it ran before the next frame's check set them, so Continue from it left the gas station trail shut for another day and night. Fixed (`StoryProgress.settle()` before the save; a run continued at dawn replays dawn's triggers, which mends older saves).
- **The safe's hunting rifle went to the rack by itself every run**, so the outpost's dogfight (scope from the tower) was quietly skipped. **Aaron: let Tom choose.** Built: `ui/GunChoice.js`, for any gun found with its slot full.

**Built after (Aaron: "do the rack"):** **#343 resolved:** the rack shows its guns (placeholder shapes on its shelf against the pegs; `render/rackGuns.js`, `config.station.gunRack.show`). Their looks are placeholders for an art session.

My calls and questions (PLAYTEST round 36):

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 390 | **The gun choice's wording and default:** the panel names the gun, "No room for it: you're carrying two long guns already", then one row per gun in that slot ("Take it, leave the shotgun") and "Send it to the comms room's gun rack"; the first row is highlighted; B sends it to the rack. The new gun comes to hand when taken. Right default, or should the rack be first? | As described. | `ui/GunChoice.js` |
| 391 | **Ammo through the opening:** my bot (a poor shot, aiming at the chest) came out of the shelter's horde (12, Earl, and the risen: 18 kills for 20 shells) with about 5 shells and 14 service rifle rounds, and ran dry at the outpost's approach (2, 4, 6 army zombies) before it reached the gun pit's rounds and the machine gun. A player who aims for heads, uses the shovel and searches the roadside cars will do better. Worth a little more ammo (the shelter's room, or a crate on the road to the outpost), or leave it tight? | Unchanged. | `data/stormShelter.json` `searches`; `data/loot.json` |
| 392 | **Wandering into the outpost early** (the gates are soft): only sets `outpostEntered`; the approach waits for Ellen's call. Fine as is? | As described. | `Outpost.update()` |


## Session 22 (Lead Engineer + AI Programmer: the spikes, M10.3; Demo mode)

Aaron's answers first (Nov 9):
- **Round 32's fixes:** all good. **Save and quit at more points, the health floor:** seem fine, not fully tested. **His glare list:** needs a bit more work (still to come).
- **A black flicker frame every 5-10 s** (on the tablet lately, and on his work computer for a while): **fixed** (dynamic resolution resized the canvas after the frame was drawn; it now applies before the draw, and backs off instead of stepping up and down). PLAYTEST round 34.
- **The 150 zombies:** easy ("I've done max zombies heaps of times and never noticed a dip"); usually 40-50 fps on the tablet; a moment's dip spawning vehicles, probably normal.
- **Push to `main` as you go.**
- **Demo mode** (his idea: "if it runs in demo mode, it'll run on your device"): the station, sliders to spawn heaps at once, weapons to try. My four recommendations taken: no touch controls yet (the demo says it needs a controller or keyboard); early weapons and basic zombies only (no spoilers); the fence on, with a toggle; the verdict line, and the preset it settles on kept for real runs.
- **Overnight:** "work through this entire session on your own recommendations; flag anything for the morning." Built: Demo mode, then the three other spikes (DESIGN.md "Build plan: the M10.3 spikes").

**Round 34, Aaron (Nov 10):**
- **150 zombies at night in Demo mode: 57 fps on the tablet, "Runs great".** The spike's tablet number (DESIGN.md's table).
- **#379 settled:** ear only is what he imagined, but it isn't very accessible: **keep the caption for now.**
- **#377 settled:** going back from the first clearing takes you out: good.
- **#381 settled:** Demo mode's three weapons are good.
- **#384 settled:** the aim shouldn't stick to the flyer ("it's fun").
- **#389 settled:** touch controls **at the very end** of the project.
- **His glare list** soon; a full playthrough at some point.
- **The flicker is gone**, and no discernible frame-rate drops anywhere in the game (Nov 10).
- **The armour plating blocked the view from the dozer:** fixed. Its upper band sat across the driver's eyes (2.6 m) and the front plate cut the line down to the blade; now the sides stop at 2.1 m and the front plate at 1.95 m (`config.spikes.dozerParts.plating` `sideTop`, `frontBottom`, `frontTop`; a test keeps them under the eye and the blade's sightline).

My calls in the build (PLAYTEST round 34):

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 377 | **The place beyond, the way back:** DESIGN didn't say what the path Tom came in by does. From the first clearing it leads **out** (back down the stairs); from any later clearing it **loops to the start**, like a calling path. Right, or should going back only undo one step? | As described. | `world/placeBeyond.js` `choosePath()` |
| 378 | **The place beyond's look (a placeholder):** grey fog close in (2-26 m), dark cone trees on a grid with jitter, a clearing of 11 m and four paths about 4.4 m wide, in a 68 m square pocket. Each new clearing re-deals the trees; **the first always deals the same**, so a loop back to the start looks like the start. The art is a later session's. | As described. | `config.spikes.placeBeyond` |
| 379 | **Junie's voice:** a placeholder (two falling notes at a child's pitch, panned toward the path) every 3.5-6 s, from one calling path then the other, with a caption naming the path ("Dad?" down the east path). The real thing needs her recorded lines. **Is the caption too much help?** Without it the puzzle is by ear only. | As described. | `PlaceBeyond.update()`; `Sfx` `junieCall` |
| 380 | **Each clearing deals its silent path afresh**, and a calling path sends Tom back to the very start (three right choices away again, as designed). | As described. | `world/placeBeyond.js` |
| 381 | **Demo mode's weapons:** the shovel, the service rifle and the shotgun (what the opening hands out). The pistol, SMG and auto shotgun aren't in the story yet, so they're left out. Add any? | As described. | `config.demo.weapons` |
| 382 | **The device test:** night, 100 zombies, 6 s to close in, 15 s measured. **Runs great** at 40 fps or more (28 with Low's 30 cap), **Playable** at 24 or more, else **Struggling** (the graphics drop a step). The preset it settles on, or the one picked on the panel's Graphics row, is **kept for real runs on that device**. Dynamic resolution stays on during the test (it measures what a player would get). Your tablet at 40-50 fps would read "Runs great". Right lines? | As described. | `config.demo.test`; `demo/verdict.js` |
| 383 | **Demo mode's look:** the panel is the pause menu's style; the frame rate and zombie count stay in the top-left corner the whole time; zombies rise 14-45 m outside the fence; the fence is kept charged while it's on; the quad and dozer come to just outside the gate. | As described. | `config.demo`; `src/style.css` (`.demo-hud`) |
| 384 | **The flyer's script:** from 90 m out, circling (22 m round, 14 m up) between moves, two passes over Tom (9 m up), then four dives that strike for 22 if they reach him, then it leaves. **It can't die out here:** below 35% of its 260 health it shrieks and flies off. The aim doesn't stick to it (no aim assist: a fast flyer should be hard to track). Numbers right for a first feel? | As described. | `config.spikes.flyer` |
| 385 | **The flyer's look (a placeholder):** a tall dark body, wide flapping wings and two red eyes that aren't fogged (they show in the dark). Not built: the screech's blur and slow, landing or clinging between swoops, calling beetles. | As described. | `ai/Flyer.js` `build()` |
| 386 | **The dozer's parts:** three to try, matched to DESIGN's encounters: a **spiked ram** (the mineshaft: pushes 3x harder before the blade, rams 2x), **armour plating** round the open cab (the railway cutting: nothing climbs on, any on are thrown off), a **head saw** out front (the sawmill: shreds 6x before the blade, big trees go in 15% of the time; spins while ridden). Placeholder looks; numbers to tune. | As described. | `config.spikes.dozerParts`; `render/dozerParts.js` |
| 387 | **Debug: a new "Spikes (M10.3)" category:** place beyond (go in; which path is silent), flyer (send one; send it away), dozer parts (each on or off; brings the dozer if it's away). | As described. | `PlaceBeyond`, `Flyer`, `Dozer` `addDebugItems()` |
| 388 | **The flicker fix's backoff:** a raise in resolution that's dropped again within 3 s doubles the wait before the next try (4 s up to 60 s); a new quality, frame cap or on/off goes back to 4 s. | As described. | `config.render.dynamicResolution` |
| 389 | **Demo mode on a touch-only device** (no controller, no mouse): it starts, with a toast that the game needs a controller or keyboard and mouse. Touch controls are their own session (Aaron agreed): when? | As described. | `Game.startDemo()`; `config.demo.needsControls` |

## Session 21 (Lead Engineer: the map, M10.2)

Aaron's answers before the build (Nov 8, a bedtime pass: "no time limit... minimal viable product is the enemy of good gaming"):
- **Round 31's last items** (Save and quit, the fence's power cell, the health floor) and **the glare list**: not yet (the tablet was off for the night). Still to come.
- **Q5, the spine:** fix the whole spine in this pass ("we have all we need").
- **Q6, how far north the road goes:** Claude's recommendation (built: it ends at the cliff in an old road tunnel, fallen in, behind the army's barrier).
- **Q7, Earl's store:** the Home of Bigfoot shop is the gas station.
- **Q8, the railway and the road:** "have some fun" (built: period crossings wherever a pathway crosses the line; the road never reaches it).
- **Q9, the first interior:** move the storm shelter's room onto the new system (built).

**Round 32, Aaron (first look):** the Bigfoot cave area is a favourite ("the mountain and the tunnel"); Save and quit works (cabin, items and story kept); the plane's power cell on the fence works; the shelter's room isn't too dark (#370 settled); the dozer at the east end is fine (#354 settled); no handcar (#367 settled: not built). **Fixed after it:**
- **Cutscenes:** riding the quad into the shelter's sweep, it rolled on into the horde and they killed him before it ended. Now during every cutscene the dead keep moving but can't notice or hurt Tom, and the quad brakes to a stop (`Game.update`: `combat.unseen`, `combat.shielded`, `riding.halting`).
- **Skip intro leaves the quad just outside the station's gate** (`Game.parkQuadAtStation()`, `config.quad.skipParked`).
- **The outpost's points come off the map as they're cleared:** every crate still whole (an opened one goes at once, not when the last beetle dies), C-7 once Tom's been to it.
- **The brush comes away a piece at a time:** 18 bushes and 4 deadfall trunks, each knocked tumbling away as the dozer's blade reaches it; once 80% are down the rest go; saved piece by piece.
- **The cars' blue markers are off both maps** (`config.vehicles.map.show`).
- **#357: as many optional encounters as fit:** all five designed, every run (`config.map.optional` 5-5).
- **#368, the south: Aaron's pick is a mix of burn country and government ground** (HANDOVER.md, "Designed for a future session"; not built).

My calls in the build (PLAYTEST round 32):

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 353 | **Where the spine sits** (metres from home, x east, z south): the crashed plane (-80, 392), about 160 m south-west of the outpost's watchtower, so the dogfight comes down close and in view; the clearing crew's dozer (360, 357); the old church (-230, 565); the stairs (250, 685); the crashed UFO (-200, 990); the Car Armory (300, 1015); Ground Zero (20, 1095); the hut (-310, 1200), deep in the south-west. The story zigzags (west, east, back north, south-west, south-east, centre, south-west) so the seeded country between gets crossed. Right places? | As described; the same on every seed. | `src/data/storySpine.json` |
| 354 | **The clearing crew's dozer is at the strip's east end, on its south side** (DESIGN left "which end" open). South of the wire, so it can't be reached before the checkpoint opens. A signpost until M12; the dozer itself stays in the debug menu. East, or west? | As described. | `storySpine.json` `cordonDozer` |
| 355 | **The checkpoint's pathway runs straight to the crashed plane**, the first stop after the outpost. | As described. | `MapGenerator.checkpointExit()` (the spine place with `entry`) |
| 356 | **One staircase** (it was 2-3 before the redesign), **off the pathways:** one faint trail to it (half grown over: narrow, slows a little, faint on the map), no loops through it. Whether other staircases appear is still open. | As described. | `storySpine.json` `stairs` (`offPath`); `config.map.faintTrail` |
| 357 | **The optional encounters: 3 or 4 of the five designed each run, each equally likely**, placed anywhere around the spine (any band; the small north frontier half as likely). The four named-only (Flatwoods, the convoy, the listening post, the Horseman bridge) aren't dealt until they're designed. The railway cutting sits on the line. Their placeholders are signposts ("Optional encounter: built in M1x"). The old "Old barn (Milo the Clown)" and north-band mineshaft entries are gone. How many a run? | As described. | `config.map.optional`; `encounters.json` (`placement: "optional"`) |
| 358 | **30 clearings** (was 22), so the fixed spine and the optional encounters leave room for plain clearings and loops. Verge cars thinned to keep the total about 45 (Aaron, M5): one every 175 m of pathway (was 85). | As described. | `config.map.clearingCount`; `config.vehicles.placement.pathSpacing` |
| 359 | **The witch's routes avoid the spine places and the cave** (she passes through one only when there's no other way: the crashed plane is the frontier's only way in from the checkpoint, so she still crosses it). | As described. | `Witch.avoided()` |
| 360 | **Each spine place has a fixed clearing type** (the military ones "checkpoint", the church "graveyard", the stairs "standing stones") and **its own vehicle rule**, so the crashed plane doesn't get a roadblock across it: a pickup or army truck by the crew's dozer, wrecked trucks at Ground Zero, none at the rest yet. | As described. | `storySpine.json`; `vehicles.json` placement (`_spine`, `_optional`) |
| 361 | **The road north:** it forks off the main road about 75 m west of the gas station (a junction off the forecourt's road, not through the store) and runs about 250 m north-north-west to the cliff. **A fallen oak across it near the fork until day2**, like the gas station trail's, so on Day 1 it isn't a way round that trail's oak to the gas station. | As described. | `openingCluster.json` `roadNorth`, its `roadNorth` gate |
| 362 | **Q6 (my recommendation):** the road ends at the cliff in an **old road tunnel, the Laurel Gap Tunnel (W.P.A. 1936)**, fallen in a few metres back, with the army's **ROAD CLOSED barrier** in front (striped barricades, ROAD CLOSED boards, amber lamps still blinking on their batteries, jersey barriers, a NO ENTRY / QUARANTINE ZONE notice). A real road out, closed, rather than more map to the north. The barrier stops everyone. The tunnel's name is mine. | As described. | `config.map.roadNorth` (`tunnelName`, `tunnelYear`, `portal`, `barrier`) |
| 363 | **The cave:** in a spur of rock out from the cliff on the east side of the road, its mouth in the south face about 15 m south of the barrier ("just south"). The brush stops Tom with "Briars and deadfall, packed solid against the rock. Too thick to push through. It would take a machine to shift this." Too much of a nudge? The dozer's blade (driven into it) clears it: `caveFound`, saved. Until then the map says **Road's end** and there's no signpost. | As described. | `world/roadNorth.js`, `world/RoadNorth.js`; `encounters.json` `bigfootCave` (`hiddenAs`, `revealedBy`) |
| 364 | **At the mouth** (once it's clear): "A cave, going deep into the rock. It smells of wet fur. (Built with its story: M12)". It doesn't load yet: the cave is M12's, a seeded interior on the new system. | As described. | `RoadNorth.update()` |
| 365 | **Hints planted early:** Earl's hand-painted **BIGFOOT XING** sign on the way up, **HOME OF BIGFOOT... WE BELIEVE!** for anyone coming out of the tunnel, and three huge footprints in the soft ground going into the brush. A walk-back payoff, or too much of a giveaway? | As described. | `config.map.roadNorth.signs`, `prints` |
| 366 | **The railway:** the same line every run on the middle/south border; a graded bed of worn ballast, partly open (it slows a little: about a fifth of the brush's drag), young trees (one tree spot in eight) and brush (one bush spot in two) come back onto it; rusted rails half buried or gone on rotten ties; the telegraph line along its north side, poles leaning or down; at each edge a stone portal with 1903 in its keystone, set in a hill at the end of a short cutting, its bore fallen in. | As described. | `config.map.railway`; `render/Railway.js` |
| 367 | **Q8 ("have some fun"):** the road never reaches the railway (it ends at the checkpoint), so there's no road crossing. **Every pathway that crosses the line gets a period crossing:** planks between the rails, crossbucks (RAILROAD CROSSING), the old **LOOK OUT FOR THE CARS** board, and **W** (whistle) posts up and down the line. *Idea, not built:* an old pump handcar on the rails, ridable east to west along the line (fast travel along the soft border, loud, with the dead stepping onto the rails ahead). Want it? | As described. | `render/Railway.js` `buildBoards()` |
| 368 | **"South of it is more open and less structured"** (DESIGN) isn't done: the forest is the same density either side of the line. Thin the south's trees and undergrowth a little, or leave it to the story? | Not done. | (`config.forest` would take a southness factor) |
| 369 | **The interior system:** a pocket 1200 m under the entrance (beyond every draw distance: the shelter's room draws about 28 calls, against about 100 outside); everything outside drops to the abstract tier; nothing outside sees or hears Tom; outside sounds come through at 30%. | As described. | `config.interiors`; `world/Interiors.js` |
| 370 | **The shelter's room has its own light now:** daylight down the hatch by day (dim), darker at night (the torch matters); before, the outdoor sun lit it. The sky shows up the shaft past the ladder. Too dark, too bright? | As described. | `config.stormShelter.interior.light` (`ambientDay`, `ambientNight`, `ambientColor`, `fog*`) |
| 371 | **The clock inside:** top left, "STORM SHELTER / Day 2 · 10:45 · dusk in 8h 15m" (there's no sky to read). Just the time, or the countdown too? | As described. | `ui/InteriorHud.js` |
| 372 | **A save made inside comes back outside the entrance** (the dawn autosave; Save and quit still puts Tom in the cabin). | As described. | `Game.collectSaveOutside()`; `Interiors.saveSpot()` |
| 373 | **SAVE_VERSION 4:** the map moved on every seed, so old saves are discarded again. | As described. | `core/saveData.js` |
| 374 | **The map:** roads drawn grey, the railway as a railway (a dark line with ties). At the map screen's size "Road's end" overlaps "Ranger station"'s label. | As described. | `ui/mapImage.js` `drawLines()` |
| 375 | **The Day 1 red light** still points toward Ground Zero; DESIGN now says it's the UFO itself, hovering. Both are fixed now: point it at where the UFO comes down? | Toward Ground Zero. | `FirstDay.onTower()` |
| 376 | **The debug menu, Teleport & map:** next story place (in beat order), next optional encounter, next railway crossing, the railway's west and east tunnels, the road north's barrier and brush, "bring the dozer here (facing the brush)", "clear the brush". | As described. | `Game.addMapDebugItems()`; `RoadNorth.addDebugItems()` |

## Session 20 (Lead Engineer + Gameplay Programmer: the new systems, M10.1)

Aaron's answers before the build (Nov 8):
- **Rounds 28-30 and the experimental vehicles:** a big play-test of the vehicles. The vehicles don't glare under the torch; other things in the game do (a fuller list to come). #300, #308 and #311 settled (below).
- **The loadout:** Claude's picks. Long guns: the service rifle, shotgun, hunting rifle, heat-scope rifle and auto shotgun. Sidearm: the pistol or the SMG. A gun Tom can't carry goes to the comms room's rack by itself. Once something better is in the melee slot, the shovel only comes out to dig.
- **The healing pool's cap: 270.** Kits that don't fit go to the first aid box in the comms room.
- **A mid-day save:** Claude's pick. Continue puts Tom back at a safe point (the run is short; most players finish in a couple of playthroughs).
- **Old saves:** fine to discard them.
- **Round 31 (Aaron):** the healing pool, the gun rack, the inspect cards, no flares and the alien quad's power are all good. Save and quit still to try.
- **After round 31's first look:** #344, #347 and #349 settled (yes to all three). **Bug: no gun's rounds landed** (Session 20's ammo types broke the damage line in `Weapons.fireHitscan()`: every shot threw before it hit). Fixed, with tests that fire real shots.

My calls in the build (PLAYTEST round 31):

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 340 | **Which kit heals:** the biggest kit that heals no more than what's still missing (counting what's already healing), else the smallest carried. So at 50 missing a first aid kit goes, at 60 or more an alien one. A press with nothing left to heal does nothing (it used to queue a kit and waste it). | As described. | `player/healingPool.js` `chooseKit()` |
| 341 | **Kits that don't fit go home from anywhere:** a kit picked up with the pool full is taken and sent to the comms room's first aid box (a toast), rather than left lying. The box starts with its 2; hold X there to fill the pool (alien kits first). | As described. | `Combat.takePickup()`; `Station.takeAidBox()` |
| 342 | **A found gun with its slot full goes to the rack by itself**, wherever Tom is (a toast); its rounds still go to its ammo pool, so they're there when it's taken down. | As described. | `Weapons.take()`; `Combat.giveWeapon()` |
| 343 | **The rack** is a board with pegs on the comms room's east wall; it doesn't show the guns on it yet. Hold X there, or the ledger's **Gun rack** page: put up, take into a free slot, or swap (same slot, same place in the cycle, the magazine kept). Should the rack be at the ledger only, or show its guns? | As described. | `Station.rackRows()`; `render/stationInterior.js` |
| 344 | **Settled (Aaron): yes, Skip intro gives the shovel** (built). **Skip intro doesn't give the shovel** (it never did: it leans by the door). The handover said it does. Should Skip intro hand it over? | Not given. | `FirstDay.skipIntro()` |
| 345 | **Changed (Aaron, round 31): one swap per hold, and only with alien shells in the pack** (otherwise B reloads on the press); out of alien shells, a reload falls back to normal. Alien shells feel good. Was: **Holding B:** past 0.35 s it steps to the next ammo type that has rounds (every 0.6 s while held), and the gun reloads with it on release. A gun with one type reloads on the press as before; **the shotguns now reload on the release** (a tap's delay). | As described. | `config.weapons.ammoChoice`; `Weapons.updateReload()` |
| 346 | **The cards' lines are drafts**, and the turning item is a CSS placeholder (a box in the item's shape and colours) until the art pass. | Drafts, marked (draft). | `lore.json` `card` |
| 347 | **Settled (Aaron): yes, the prompt keeps waiting** (as built). **Keeping for later:** a kept tape leaves the D-pad down prompt waiting (Day 1's script waits for the camcorder) and plays from the monitors once handed in; a kept paper carries the story on as if read (the family's line, the flags) and is read again from the ledger. Or should a kept tape drop the prompt? | As described. | Each encounter's `card.show(...)` call |
| 348 | **The common pickups' first-time introductions** (a fuller toast the first time each kind is picked up in the opening) aren't built yet. | Toasts as before. | `ui/Toast.js` |
| 349 | **Settled (Aaron): yes, those numbers.** **The alien quad's power:** a store of 1000, full when it's brought. Each plasma cell refilled costs 10 (a full capacitor of 10 is 100, a battery's worth) and the boost 20 a second (a full 3 s boost is 60). It still refills by itself from the store; with the store empty it drives but has no boost and no refill. Right numbers? | As described. | `config.alienQuad.power` |
| 350 | **No flares anywhere** before the Mothman at the crashed plane: not from army zombies, police boots or **the outpost's pack and tents** either. | As described. | `loot.json` `flare.after` |
| 351 | **The safe point** is the cabin's main room, facing the front door. Save and quit is greyed during Day 1 and Night 1 (the opening is scripted and isn't saved) and past the point of no return. No pausing during a cutscene, the map, the ledger or a paper. | As described. | `config.station.safePoint`; `Game.saveRefusal()`, `canPause()` |
| 352 | **On a keyboard, Esc while the mouse is locked pauses** (the browser lets go of the mouse on Esc; the game pauses rather than leaving you with a loose cursor). Clicking Resume locks it again. | As described. | `Game.onPointerLockChange` |

## Side pass after Session 19, part 2: the forestry dozer (debug menu only)

Claude's pick for a new experimental vehicle, Aaron's go-ahead ("debug menu only, showing off").

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 332 | **Felled trees and cut trails are saved** (the tree indices and the ground's stamps), so a run with the dozer keeps its trails. The rest of the experimental vehicles aren't saved. Keep that? | Saved (`clearing` in the save, optional). | `world/LandClearing.js` `saveState` / `loadState`; `Game.saveRun` |
| 333 | **Cut trails change the game for everyone**: open ground is open ground, so the dead walk them faster too, and the witch can plant there. And the trails show on the map and minimap. | As described. | `GroundField.carve()`; `config.dozer.clearing` (`trackOpen`, `trackDirt`) |
| 334 | **Big trees hold it**: past 14 m (and the thick oaks), the blade strains on them up to about a second before they go. Every tree can be felled; rocks, buildings and big trees at its flanks stop it. | As described. | `config.dozer.clearing.strain`; `Dozer.fellTrees()` |
| 335 | **The dead**: before the blade they're pushed along (18 a second; pinned against something solid, 260 a second); with the blade up they slip under into the tracks (340 a second). Mutants take half. It's an open cab: stopped or slow, after 1.4 s beside the seat one climbs on and can reach Tom; going on past 2.4 m/s or pivoting hard throws it off. | As described. | `config.dozer.crush`, `config.dozer.climb` |
| 336 | **Cars**: the blade shoves abandoned cars and wrecks; the winch hooks a car or one of the dead (B / R at it, within 30 m), drags it as the dozer drives away, reels it in on Y / F. Moved cars stay moved (not saved). | As described. | `Dozer.pushCars()`, `Dozer.updateWinch()`; `Vehicles.moveVehicle()`, `VehicleRenderer.move()` |
| 337 | **Its speed**: 19 km/h (a jog; a sprint outruns it), pivoting on the spot. | As described. | `config.dozer.maxSpeed`, `turnRate` |
| 338 | **It's the loudest thing in the woods**: the dead within 70-150 m come every second it runs; the horn draws them from 160 m. | As described. | `config.dozer.noise`, `horn` |
| 339 | **The falling trees** are two crossed cards of the tree's own sprite, tipping over and sinking away after they land, a log and a stump left (up to 120 logs and 300 stumps, the oldest recycled). | As described. | `world/LandClearing.js`; `config.dozer.clearing` |

## Side pass after Session 19: the experimental vehicles (the ute with a turret, the alien quad)

Debug menu only (**Experimental vehicles**), not yet in the story: Aaron is thinking of them as end-of-game unlocks. Aaron's answers before the build: seat swap for the ute's gun; RT plasma and L3 / A boost on the alien quad; debug only, playable, not saved or on the map.

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 321 | **Where do they come from in the story?** The ute: whose is it (Earl's? the army's, a "technical" from the outpost)? The alien quad: when do the greys rebuild Earl's quad, and how does Tom get it? | Neither is in the story. "Bring it here" in the debug menu sets it down in front of Tom. | `world/Ute.js`, `world/AlienQuad.js` `bring()`; `Game.initExperimental()` |
| 322 | **The ute's gun never runs dry**: a belt with no end, held back only by heat (about five seconds of fire from cold, about two to cool from locked). Should it take rounds (the outpost's ammo cans?) or a battery like the gun pit's? | Heat only. | `config.ute.gun` (`heatPerShot`, `coolRate`, `jamUntil`) |
| 323 | **The ute is strong**: a full-speed ram drops any citizen and throws it; the gun drops a citizen in two rounds and punches through three in a line; the cab takes half the dead's swipes. Too strong for the early game, fine for an unlock? | As described. | `config.ute.ram`, `config.ute.gun`, `config.ute.strikeScale` |
| 324 | **The alien quad's plasma**: a capacitor of 10 cells (a bolt costs 1, an orb 4) that refills at 2.6 a second once it's left alone half a second. Bolts pull gently toward the dead near the crosshair. The orb's burst stings Tom at a quarter strength if he's caught in it. | As described. | `config.alienQuad.plasma` |
| 325 | **The boost** lasts 3 s from a full meter (a part-full meter gives a shorter burst), refills in 7 s, reaches about 108 km/h, triples the ram and mostly ignores the brush. A tree ends it. | As described. | `config.alienQuad.boost` |
| 326 | **The rear-view mirror is live** (a second small camera, drawn every third frame while Tom's in the driver's seat). It costs draw calls on those frames (the cab runs about 100-180 on the road headless). Keep it, or dark glass? | Live, with a debug toggle ("Ute: rear-view mirror ... (toggle)"). | `config.ute.mirror` (`live`, `every`, `far`) |
| 327 | **Lights**: the ute adds two spotlights (the headlamps, the gun's lamp), the alien quad a spotlight and two point lights (underglow, the plasma's). They're made the first time each is brought (a one-off shader hitch), so a normal run never pays for them. | As described. | `Ute.ensureLights()`, `AlienQuad.ensureLights()`, `Plasma.ensureLights()` |
| 328 | **Right-hand drive** (an Australian ute): Tom gets out on the right. The radio shows the game's time; the speedo reads km/h. Keep it, or a left-hand-drive American pickup to match the county? | Right-hand drive, km/h. | `render/uteModel.js` (`UTE.driver`, `DIALS`); `config.ute.eye` |
| 329 | **The ute's paint**: a dull bush green (pale paint glares under the torch). The alien quad: blue-black chitin, cyan-green neon, violet accents. | As described. | `config.ute.look.paint`; `config.alienQuad.look` |
| 330 | **The witch is faster while Tom's in either** (as on Earl's quad, x1.6). | As on the quad. | `config.ute.witchSpeedScale`, `config.alienQuad.witchSpeedScale` |
| 331 | **Not in the audio pass yet**: the ute's diesel, the alien drive, the gun, the plasma, the boost, the horn are placeholder synth sounds like the rest. | Placeholders. | `audio/Sfx.js` (`ENGINE_VOICES`, the experimental recipes) |

## Session 19, round 3 (Aaron: the generator at the tower; the outpost's objectives)

Aaron's answers: #317 and #319 settled. The rest to check in play.

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 315 | **The generator at the foot of the watchtower** (its south-west leg, beside the ladder), its cable to the nearest barricade floodlight. | As described. | `outpost.json` `floods.generator` |
| 316 | **Wyatt points it out:** the first time Tom's within 22 m of the dark generator once the fight's begun, after whatever's being said: "Dad, there's a generator at the bottom of that tower. Get a battery in it and those floodlights will come on." (draft). Dropped if the lights are already on. | As described. | `dialogue.json` `outpost.floods.hint`; `config.outpost.look.floods.hintRange` |
| 317 | **Settled (Aaron): the rifle rounds stay on the fight's list.** **Before the barricade falls, one objective with several map points:** "Defeat the dead at the outpost. Turn the floodlights on at the generator, put a battery in the machine gun, find rounds for Earl's rifle in the gun pit." A star at the barricade, the generator, the machine gun and the gun pit's ammo box; each drops off when done. While the barricade's peak is on: "Hold the barricade." plus whatever's left. **I kept the rounds** in the list (you need them for the dogfight). Its breadcrumb: Wyatt says both take a car battery, check the army trucks. | Replaces the old road / rounds / barricade steps. | `Objectives.work()` (`outpostFight`, `outpostPeak`); `hint.outpostFight` |
| 318 | **After: "Explore the outpost's compound"**, with a star on every point of interest not yet seen to: a whole crate (until the beetles are down), C-4's doors, C-7, the armoury lockers, the field report, the manifest, the watchtower's ladder (the dogfight). Any order; the checkpoint once they're all done. | Replaces the old one-at-a-time compound steps. | `Objectives.work()` (`outpostCompound`) |
| 319 | **Settled (Aaron: absolutely happy with it).** **The dogfight in any order:** it plays from the tower once the barricade's down (Session 18 held it until the beetles were down too). Wyatt's ask to go up and look still comes once the beetles are down, as a nudge. | As described. | `Outpost.dogfightReady` |
| 320 | **The map and minimap draw every star a step has** (`ats`). Several off the minimap's edge sit on its rim, pointing their ways. | As described. | `ui/MapScreen.js`, `ui/Minimap.js` |

## Session 19, round 2 (Aaron's playtest notes)

Aaron's notes: the axe at the campsite reads as a weapon you should be able to pick up; a brown box beside the phone on the counter muddles it; Earl's office is empty but for the desk; the dead stand frozen in the shelter's arrival sweep; a blank page at the end of Earl's diary; C-7's sweep too dark to make out; the field report signed by a Hale; the armoury's lockers oddly placed; the outpost wants floodlights, a generator out in the open that takes a battery, lights at the gates on from the start. All built. The calls I made:

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 304 | **The axe:** gone, and its chopping stump with it (the woodpile stays). | As described. | `campsite.json` `props.dressing` |
| 305 | **Earl's diary:** the blank last page is gone; the diary just stops at Sept 30, 2003. (DESIGN had "the blank page is the horror": it read as a mistake.) | Five pages. | `papers.json` `earlDiary` |
| 306 | **The counter's brown box** was the postcard rack: taken off the counter. The phone and the register have it to themselves. | As described. | `GasStationProps.store()` |
| 307 | **Earl's office:** a bookshelf of binders on the back wall, a coat stand with his jacket and red cap, a wastebasket with paper round it, a space heater, antlers and a framed photo over the desk, a calendar; on the desk a lamp, a mug and a stack of papers clear of the note. Nothing in it to take. | The shelf and the coat stand have colliders. | `gasStation.json` `office`; `GasStationProps.officeDressing()` |
| 308 | **Settled (Aaron, Session 20): the sweeps are good as they are.** **The sweeps keep the world moving.** The storm shelter's and the gas station's arrival sweeps let the world run on while they play (the dead walk about), but nothing notices Tom until they end. The campsite's and the outpost's still hold the world. Want those running too? | As described. | `cutscenes.json` `"world": "run"`, `"unseen": true`; `detection.playerSenses()` |
| 309 | **The report's signature:** CPT R. **MERCER**, OIC (was HALE). | As described. | `papers.json` `fieldReport` |
| 310 | **The armoury's lockers:** turned round and stood with their backs hard against the comms hut's back (west) wall, facing away from the road, the sandbags in front of them. You walk round the hut to search them. | As described. | `outpost.json` `compound.armoury` (`face`), `searches.armoury` |
| 311 | **Settled (Aaron, Session 20): a great addition; lighting the area up gives a real sense of something.** Its battery stays as it is. **The floodlights' generator:** out in the open just behind the barricade, west of the road gap (frame -11, 1.4), its cables running to the two nearest floodlights. Hold X with a battery: the barricade's three floodlights come on (Wyatt: "Whoa, the lights are on!", a draft). They stay on, saved. Without a battery it says it'd take one. **Batteries:** it competes with the machine gun for the truck's sure one. Should it have its own battery nearby? | As described. Debug: Military outpost, "the floodlights' generator" (on/off), "teleport to the generator". | `outpost.json` `floods.generator`; `Outpost.fitGenerator()` |
| 312 | **Floodlights on from the start:** one inside each of the outpost's two gates (the road's and the cemetery path's), aimed in along the way, and one lighting C-7's torn end (gentler, so its paint doesn't glare). They show from dusk to dawn. | As described. | `outpost.json` `floods.always` (`[x, z, yaw, strength]`); `config.outpost.look.floods` |
| 313 | **How the lights work (performance):** three real lights in all, given each frame to the lit floodlights nearest the camera; the rest show only their glowing glass and halo. So walking from the gate to the barricade you might see one light fade as another takes over. Brighter or dimmer? | 3 lights, intensity 150, 38 m reach. No new draw calls to speak of. | `config.outpost.look.floods` (`pool`, `intensity`, `distance`) |
| 314 | **C-7's sweep in the dark:** lit by the always-on floodlight beside it now. | As described. | #312 |

## Session 19 (Graphics Engineer, style pass 2): the opening cluster's places and their camera looks

Aaron's answers up front: no new notes from rounds 25-27; the draw-call budget at the worst case starts at 155 (he's never seen the frame rate dip, even with max zombies in one clearing); textures on big surfaces my call (I stayed with vertex colours); no letterbox bars added to the sweeps; push to main as I go. Built in one pass, unattended. The calls I made, for the thorough playtest:

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 282 | **How weathered.** Every place's props are baked with grime from the ground (or floor) up, mottling, each piece a little lighter or darker, darker undersides and rust streaks on the metal. Too dirty, not enough? | Grime: 55% as bright right at the ground, gone by 0.8 m up, browned; mottling ±16%; pieces ±10%; undersides 65%; rust on each place's listed metal colours. The campsite's grime only climbs 0.5 m. | `config.props.weather` (shared); each place's `look.weather` |
| 283 | **The glare rule, enforced.** No prop colour comes out brighter than a luma of 0.45, except Earl's keys' glint and the colouring book's pale pages (on purpose). A test fails if a palette strays far over it. | Capped as it's baked. The pumps are darker (they glowed red by moonlight), so is the forecourt; the barricades at home have their own darker colours. The store's siding (0.33) and the station's own colours are unchanged. | `maxLuma`, `keepBright`; `tests/session19style.test.js` |
| 284 | **Textures on big surfaces** (your "use your judgement"). | I stayed with vertex colours: the weathering needs no textures and costs nothing per frame. Big surfaces have extra vertices so the grime and mottling have somewhere to vary (the gas station's walls, the forecourt). Say if the store or the containers want real grime textures up close. | `render/propKit.js` |
| 285 | **The campsite's new dressing:** a woodpile, a stump with an axe, a folding table and stove, a clothesline with a towel and a shirt, a sleeping bag dragged out of the torn tent, tins, bottles and paper plates. **None has a collider:** you walk through them (the clothesline's posts too). | As described. Guy lines and pegs on every tent. | `campsite.json` `props.dressing`; `render/CampsiteProps.js` |
| 286 | **The gas station's new dressing:** an ice chest under the left window, a rack of oil cans by the door, a propane cage on the east wall, an air pump at the forecourt's west edge, tyres stacked out back (all with colliders), a pallet against the back wall. **Idea, not built:** the propane cage going up like the pumps. | As described. | `gasStation.json` `dressing`; `GasStation.buildColliders()` |
| 287 | **Inside the store:** a drop ceiling's grid, dead fluorescent tubes (one hangs by a chain over the shelves), price strips on the shelves, stains on the floor. | As described. | `config.gasStation.look.fixtures` |
| 288 | **The storm shelter:** up top, sod and grass on the mound, roots out of its sides, stones round it, an old tarp half dragged off; straps on the collar, rivets on the hatch. Below: the walls plank by plank (one slipped, earth spilling in), roots through the ceiling, cobwebs, a hung oil lamp, a coat on a nail (Earl's, I'd say), a calendar. | As described. | `config.stormShelter.look.mound`, `room` |
| 289 | **The outpost's camo net** over the gun pit, on four poles. It has no collider (shots and the dead pass through) and the machine gun swings under it. Does it get in the way from the tower or the gun? | As described. | `config.outpost.look.dressing.net` |
| 290 | **Concertina wire** out in front of the barricade's sandbag runs (the compound side), trampled flat in places. **No collider:** the dead walk through it. Should it slow them, or catch Tom? | Looks only. | `config.outpost.look.dressing.wire` |
| 291 | **A generator** by the comms hut, its cable to the hut. Looks only. **Idea:** fit a battery or fuel and the floodlights come on for the peak. | As described. | `config.outpost.look.dressing.generator` |
| 292 | **C-7 on its slope** (the handover's check). | A trailer now stands level on the highest ground under its wheels and legs; the landing legs run down to the ground, and stacked timber cribbing fills in under any wheel left in the air. Its collider follows. | `OutpostProps.containerY()` |
| 293 | **The barricades at home** (the outer ring): two courses of plump sandbags, corrugated tin behind planks on two posts, each piece its own shade, darker than before. No strut: a piece's inside isn't always the same side of the model. | As described. Still one draw call. | `StationRenderer.buildBarricades()`; `config.station.look.barricade` |
| 294 | **The cordon:** posts lean a little (more by the torn panels); the jersey barriers have their real profile and lifting slots, set down a little crooked; every post, lamp and barrier its own shade. | No new draw calls. | `config.map.cordon.postLean`, `shadeJitter` |
| 295 | **The road:** potholes; mottling, dirtier edges and leaf litter drifted on, in the vertices (so the tile doesn't read as repeating); insulators, braces and climbing steps on the poles. | As described. | `config.map.road.potholes`, `wear` |
| 296 | **The gates:** the pipe gate's chain looped round its post (gone when it opens) and concrete footings; moss and snapped stubs on the fallen oak, sawdust once it's cut; barbed wire along the outpost's chain-link gate. | As described. | `render/GateProps.js` |
| 297 | **The camcorder** (the campers' tape): softer, hunting for focus every few seconds, blown highlights, a hand holding it; an amber date stamp, bottom right (12-hour time over **OCT.13.2003**) and a tape counter under PLAY. **Is 13 October right?** #151 only fixed the year. | As described. | `config.postFX.looks.camcorder`; `config.cutscenes.osd.camcorder` |
| 298 | **The trail cams:** a little softer, the IR glare blown out; a data strip along the bottom (the camera, the moon, the temperature in °F, the date and time), the way real trail cams stamp their pictures. | Temperature: 49°F by day, 8 colder at night, wobbling with the hour. | `config.postFX.looks.trailcam`; `config.cutscenes.osd.trailcam` |
| 299 | **The dogfight's scope:** a duplex reticle (thick posts in from the rim, a fine cross) with mil-dots, the glass darker toward its rim, a slow breathing sway, a touch of colour fringe. | As described. | `config.postFX.looks.scope` (`sway`, `milDots`, `edgeDark`) |
| 300 | **Settled (Aaron, Session 20): keep the letterbox bars.** **The sweeps:** a gentle grade (a touch cooler, flatter, vignetted) eases in over their first 1.4 s and out over the last. **Note:** the sweeps (and the first-person cutscenes) **already had letterbox bars** (since Session 12). You said no to adding them, so I left them as they are. Do you want them off the sweeps? | As described. | `config.postFX.treatments.sweep`; `config.cutscenes.treatments.sweepEase`; letterbox: `Cutscenes.play()` |
| 301 | **The reveals' jolt:** a hard vignette and colour fringe that fades in under a second, and a kick to the camera, on the mutant waking, the witch at the treeline, C-4's body and the final battle's rise. Not on the fades, the tower's view or the hut going up (it has its own shake). Any others? | As described. | `cutscenes.json` `"jolt": true`; `config.postFX.treatments.jolt`; `config.cutscenes.treatments.jolt` |
| 302 | **Draw calls** (headless, the same spots as before). | Under the 155 budget everywhere I measured except the gas station's trail-in spot: **157 (was 203)**. The rest of it is the forest, the quad's 9 meshes and outpost pieces at the edge of the far plane. The outpost's barricade peak by night: **117 (was 119)**. The campsite 97 (was 114), the forecourt 122 (was 164), the store 118 (149), the shelter 83 (95). Triangles up ~30k. | — |
| 303 | **Ideas, not built:** the quad as one or two meshes (9 now); a distance cull for each place's props (they draw up to the far plane, fogged); real grime textures on the store and containers up close (#284); the propane cage and the generator (#286, #291). | — | — |

## Session 18, round 5 (Aaron's second set of notes)

Aaron's notes: the debug overlay off on a new game; debug: spawn beetles, the quad to me; Wyatt and Ellen's clothes read skin-tight; the opening's "talk to Wyatt" with nothing to say; tents searchable from any side; the campsite's sweep on past the car, the gas station's from behind the store; Wyatt's "have a look" against Ellen's "stay away"; the scanner needs a battery (more chatter as the reward); the machine gun 25 rounds; the beetles: one by itself, then the second crate opened sets off the rest; the outpost's order: C-7 on the way in (not from the quad), the fight, the compound, the dogfight last; the truck in the road gap blocked the dead; the hunting rifle's rounds in the gun pit, Wyatt asking about them. Answers: the fence zaps through barricades (#263); heaps of ammo by the outpost, day or night (#268). The calls I made:

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 272 | **The empty talk prompt.** | Nobody's offered unless they've something new to say (or are mid-conversation): no "talk to Wyatt" at the opening, or anywhere else, with nothing behind it. Tom's spawn is unchanged. | `story/FamilyTalk.js` `update()` |
| 273 | **Looser clothes:** how loose. | Ellen: a fleece with a stand-up collar and a hem hanging over the jeans, roomier sleeves and legs. Wyatt: the flannel's open fronts stand off the T-shirt down past the belt, a loose hem, collar points, roomy sleeves and jeans. Junie unchanged. Check them in the model viewer (Models: View: The family; F for the next). | `render/familyLooks.js` `body({ loose })` and each look |
| 274 | **The sweeps.** | The campsite: on past the car to the torn tent (the camcorder), then up over the whole camp (12.8 s, was 7.4). The gas station: from up behind the store, round its side, across the pumps to the sign (9.8 s); Wyatt's line comes as it reaches the front. | `cutscenes.json` `sweep.campsite`, `sweep.gasStation` |
| 275 | **Wyatt's line after camera six.** | "She buried something out on Pruitt land, Dad. Right by their storm shelter." (No "it's on your map, have a look".) Ellen: "Then we stay well away from it for now..." | `dialogue.json` `day1.night.after1`, `day1.20` |
| 276 | **The scanner's battery.** | Tried without one: dead, and Wyatt says Earl ran it off a car battery and to try the cars out front (the forecourt's first car has a sure one). The map's NEXT says so too. With one: hold X wires it in (the battery's used), and the chatter is longer: the quarantine order, Checkpoint Two overrun, "do not open the containers", then Ellen, and a while later Wyatt ("Containers?"). **Note:** that sure forecourt battery is the one many players will use; the outpost's machine gun takes a battery too (the outpost's truck has a sure one). | `GasStation.useScanner()`; `config.gasStation.scannerLines`; `gas.scanner.*` |
| 277 | **The machine gun.** | 25 rounds, one every 0.6 s (was 15 every 0.42): about 15 s of fire. Its blast does up to 20 to Tom (was 35). | `config.outpost.turret` |
| 278 | **The outpost's new order.** | 1. The arrival sweep's first look takes in C-7 beside the first helmet. 2. Coming to C-7: its sweep, unless Tom's on the quad or more than 2 of the dead are within 30 m (it waits). 3. The first helmet down: a few seconds later Wyatt asks Tom to see if the machine gun nest's ammo fits Earl's rifle; the hunting rifle's 10 rounds are in the gun pit's ammo box (not up the tower). 4. The waves, the barricade's peak (it no longer waits for the dogfight). 5. The compound: one crate breaks by itself as Tom nears; the second he opens sets the rest off. 6. **The dogfight only once the beetles are down**: then, in a quiet moment, Wyatt asks Tom up the tower to have a look through the scope. Before then, scoping up there does nothing. | `Outpost.dogfightReady`; `Objectives.js` (the outpost's steps: compound, armoury, report, scope, cross) |
| 279 | **The truck moved** off the barricade's road gap into the compound (frame -12, 23), so the dead can come through the gap. It keeps its sure battery. | As described. | `outpost.json` `trucks[0]` |
| 280 | **Ammo trimmed** (you had heaps by the outpost). | Earl's bulk behind the counter: 14 shells and 14 rifle rounds (was 20 each); the gun pit's sure 6 rifle rounds (#267) taken out again (a 60% roll of 2-5). | `gasStation.json` counter; `outpost.json` gunPit |
| 281 | **The fence through a barricade** (#263, your answer). | A zombie clawing a barricade is zapped while the fence panel behind it stands and the fence has charge. | `Station.onStrike()` |

## Session 18 (QA & Balance): Aaron's early-game notes, the outpost's pacing, the QA pass

Aaron's notes: shoot the gas pumps and they explode; Earl's note says A to take and leaves the desk (the diary too); 2 s less to dig a sigil (the dead keep rising while he digs); a prompt at home on the ride back from the shelter (the fence, the battery); barricades outside the fence (the dead pull the fence down); the outpost's beats pile up after the fight: spread them out, move C-7 north of the tower (30-40 m, just after the gates); all the beetles burst out together, 1-2 s apart. The calls I made, for the next playthrough:

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 257 | **Papers found in the world** (Earl's note, his diary, the field report, the manifest): the prompt under the page. | "A: take it" on the last page; on a diary's earlier pages A turns the page ("A: next page"). B still closes it, and that takes it too. Read again from the ledger, it still says "B: put it down". | `ui/PaperNote.js` `promptText()`; `open(id, { take: true })` |
| 258 | **The diary "still on the table" once taken.** The code already hid it, and still does (checked headless). My guess: the colouring book beside it was the same size and nearly the same dark brown, so it read as the diary. | The colouring book lies open now: pale pages, a spine, two crayons. **If you still see a book where the diary was, tell me where you were standing.** | `render/StormShelterProps.js` (the table); `config.stormShelter.look.colors.colouring` |
| 259 | **The manifest** used to stay on its clipboard to read again in place. | Taken like the rest: the sheet leaves the clipboard (read it again from the ledger). | `Outpost.search()`; `OutpostProps.buildOwn()` |
| 260 | **The pumps:** how much it takes, and how big the bang. | Each island takes 90 damage from shots (two close shotgun blasts, four service rifle rounds, two hunting rifle rounds), then hisses for 1.1 s and blows: an 8 m blast, 320 to the dead, up to 60 to Tom. It sets off the other island (0.45 s later) and any car in reach. Blackened stumps and a scorch are left; it stays that way in the save. No lingering fire, no family line (yet). | `config.gasStation.pumps`; `GasStation.pumpShot()` |
| 261 | **The dig:** 2 s (was 4). **Also:** while the shovel's in a sigil, that sigil raises nothing (the storm shelter's rising too, which is the one that kept spawning). | As described. | `config.digging.seconds`; `ZombieDirector`; `StormShelter.updateRising()` |
| 262 | **The stop at home** on the ride back from the shelter: how it's prompted. | Once Earl's combination's in hand (safe still shut): within 110 m of home Wyatt radios to stop in (scrap for the fence, a fresh battery). Inside the fence: Ellen says where to go (the fence box if Tom has a battery, else the ledger), and a hint shows for 9 s. An objective step sits between the shelter and the safe, pointing at the fence box (with a battery) or the cabin door. Riding on to the gas station without stopping counts as done, so the map never points back. Junie's breadcrumb if stuck. All lines are drafts. **Not done:** it doesn't open the ledger by itself. | `story/HomeStop.js`; `config.homeStop`; `dialogue.json` `home.stop.*`, `hint.homeStop` |
| 263 | **Barricades outside the fence.** **Settled (Aaron): the fence zaps through them (#281).** | 1.2 m outside each segment. The dead claw the barricade first, then the fence behind it. Build or repair from either side of the fence. The ledger's plan draws them as the outer ring (D-pad: down from a fence panel to its barricade, up back). **Side effect:** the fence only zaps what claws the fence, so while a barricade stands, the fence's charge isn't killing the ones at it (the spike traps, 2.6 m out, still bite on the way in). Is that right, or should the fence zap through the barricade? | `config.station.layout.barricadeOutside`; `base/siegeRouting.js` |
| 264 | **Where C-7 went.** | On the road's south shoulder, ~35 m north-east of the watchtower, ~36 m in from the road gate: you pass it on the way in, beside the first helmet. Its torn end faces the road gate. Its sweep plays when Tom's within 9 m with no fight on and nobody talking; the next approach wave waits 8 s longer for its lines. **Check:** it's outside the clearing, on ground that isn't levelled. Does the trailer sit right? | `data/outpost.json` `compound.containers` c3; `config.outpost.c7Distance`, `c7Lull` |
| 265 | **Spacing the beats.** | After each beat (the all-clear, the dogfight, C-4, C-7, the beetles) the next one that comes by itself waits for 15 s of quiet (no cutscene, nobody talking). That covers the beetles' burst, Wyatt's ask to scope (it used to come 8 s after the all-clear) and C-7's sweep, which only waits for the talking. What Tom does himself (hauling C-4, raising the scope) never waits. | `config.outpost.beatGap`; `Outpost.quiet()` |
| 266 | **The beetles' burst.** **Superseded (Aaron, round 5): one by itself, then the second opened sets off the rest (#278).** | Once it's quiet, the first time Tom comes within 8 m of a crate past the barricade line, the nearest four break open, 1-2 s apart. The fifth waits to be shot or prised (a late one). Ellen: "Something's breaking out of those crates!" Five at once is `burst: 5`. | `config.outpost.crates.burst`, `stagger` |
| 267 | **A sure handful of rounds before the barricade.** | The gun pit (near side) gives a sure 6 rifle rounds, plus a 50% roll of 2-4 (was an 80% roll of 4-8). Same on average, but never nothing. | `data/outpost.json` searches `gunPit` |
| 268 | **The ammo audit.** **Answered (Aaron): heaps of ammo by the outpost, day or night: trimmed (#280).** | See STATUS ("Session 18: the ammo audit"). By day the outpost is about 25 army dead; arriving with ~30 service rounds plus the tower's 10 hunting rounds, the gun pit, drops (~0.45 rifle rounds a soldier) and the machine gun, it holds up **if you use the tower or the machine gun**. On the ground alone by night (34 dead) it's short by ~15-20 rounds: the shotgun and shovel make up the rest. I left the waves as they are and only added #267. Tell me if you still run dry, and where. | `config.outpost.approach`, `peak` |
| 269 | **The dusk choice (my call).** In the opening it isn't a real choice yet, and that's right for now: with the fence and battery from Day 1 the forecast reads a clean night (security ~50 vs danger ~16 on Night 2), so leaving home costs nothing. The witch can't be hunted yet (no hut assault before the frontier), so there's nothing to weigh it against. I checked that the forecast, alarm and nights-while-away still run through the opening, and left the real verdict to Session 23 (the frontier's north and middle), the first time hunting her is possible. | No change. | `DESIGN.md` Build plan, Session 23 |
| 270 | **The performance gate at the outpost** (the barricade's peak by night, beetles out). | Headless: 109-145 draw calls, ~310k triangles, under 1 ms of simulation a frame (profiled). You saw no drop on the tablet. **Still wanted:** the overlay's fps line there (View + Menu) on one of your runs. | — |
| 271 | **Ideas from this round, not built:** a fire left burning on the blown pumps; a line from Wyatt or Ellen when they go up; the ledger opening by itself at the home stop. | — | — |

## Session 17, round 4 (the gun pit's machine gun, Aaron's idea)

Aaron: a turret in the outpost's gun pit; fit a battery and it shoots 15 rounds and explodes; a taste of the turret without overpowering the early game. The calls I made:

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 254 | **How strong:** 70 damage a round to the body (a level-1 citizen in one, an army zombie in two), one every 0.42 s, 40 m range, it picks the nearest. Its rounds wait if nothing's in range. | As described. | `config.outpost.turret` |
| 255 | **The blast:** radius 5 m, 160 to the dead, 35 to Tom at the centre (less further out), 2.6 s after the last round. | Explosives.blast with its own numbers. | `config.outpost.turret.blast`, `overheat` |
| 256 | **Explosions had no sound** (Explosives played a sound that didn't exist). | A close blast's sound for charges, cars and the gun. | `audio/Sfx.js` `explosion` |

## Session 17, round 3 (Aaron's full playthrough)

Aaron's notes: no dialogue in cutscenes (the family react after); everything picked up goes to the ledger to watch or read again; the quad's engine cut in cutscenes; the outpost fight too long; the dogfight only from the tower, with a prompt after the fight; C-7 only out of combat; signs single-sided (they read backwards); save the charge; C-9 busted open; C-4 shut, with a reveal. The calls I made:

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 247 | **Which cutscenes speak while they play.** **Settled (Aaron, after playing it):** all of them again, except the dogfight (`linesAfter`: too crowded), whose lines wait until it's over (the radio holds meanwhile). | As described. | `Cutscenes.speaksDuring()`; `cutscenes.json` `linesAfter` |
| 248 | **Signs:** two faces back to back (each reads the right way round) rather than one blank back. | As described. | `GateProps.sign()`; `OutpostProps.buildSigns()` |
| 249 | **The fight's numbers:** waves 2, 4, 6; barricade 12 (x1.25 by night); helmet 25 (one rifle round); army rifle drops 30% (Aaron's M4 rule, under half a round a kill, holds). | As described. | `config.outpost`, `config.zombies.variants.army.helmet`, `loot.json` |
| 250 | **A retreat no longer resets a wave** (DESIGN's edge case said it should; it doubled the fight). A wave far off and not chasing, or out over 2 minutes, counts as done. | As described. | `Outpost.updateWaves()`, `dropLost()` |
| 251 | **"Not in combat" for C-7:** no living zombie or beetle within 30 m. | As described. | `config.outpost.combatRange` |
| 252 | **C-4's reveal:** a 3.6 s first-person turn onto the body as the doors swing (2.2 s), with a low sting; the lines after. | As described. | `cutscenes.json` `outpost.resin`; `Outpost.openResin()` |
| 253 | **Earl's note and the manifest are taken when read** (they stay readable where they are, too). | As described. | `GasStation.noteRead()`, `Outpost.manifestRead()`; `lore.json` |

## Session 17, round 2 (Aaron's first playthrough of the outpost)

Aaron's notes: too much in Earl's office at once (move the scanner and the safe to the stockroom); bulk ammo behind the counter (20 shells, 20 rifle rounds); escape the witch early on (on screen and over the radio; the dogfight fired when he scoped her from the tower); one idea at a time over the radio, and more breadcrumbs; tapes on D-pad down, then on the monitors, for the whole game. The calls I made:

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 242 | **"Early game" for escaping the witch** ends when Tom crosses the cordon (her pursuit is already short until then). | ESCAPE THE WITCH while she's attacking within 45 m; she's gone after 6 s off him; the escape call at most every 90 s. | `config.witchEscape`; `story/WitchEscape.js` |
| 243 | **What the outpost holds while she's on him:** the arrival sweep, the next wave, the peak, the dogfight, the C-7 sweep, the crate breaking on its own. Waves already out keep coming. | As described. | `Outpost.update()` (`witchOn`) |
| 244 | **Spacing lines:** a follow-up on a new subject waits 12 s (and for the radio to be quiet); Wyatt's rounds line 30 s after the call. | `Dialogue.playLater()`. | `config.gasStation.lineGap`, `config.outpost.callRoundsAfter` |
| 245 | **Breadcrumbs:** after 100 s on the same step (60 for Earl's note and the tapes, 80 for the scanner), the step's `hint.<id>` line, once. Draft lines for 17 steps. | As described. | `config.objectives.hintAfter`; `dialogue.json` `hint.*` |
| 246 | **Tapes:** watched on D-pad down when found; handed in, they go on the monitors without playing. An older save that handed Earl's tapes in counts them as watched. | As described. | `StormShelter.offerTapes()`; `story/Lore.js` |

## Session 17 (Level & Encounter Designer + AI Programmer: the military outpost, M9.4)

Aaron's calls: Ellen sends Tom the moment the safe opens, with "come home if it goes bad" (there's nothing to fetch at home); start the waves at 3, 5, 8 and the barricade at 14, tune in play; the dead can't climb the watchtower; the plane and the craft come down roughly where the map has their crash sites; dangerous by day, bigger waves by night; a retreat mid-wave goes back to the last wave cleared. The calls I made building it:

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 225 | **The layout.** The outpost's clearing sits right on the cordon, so the barricade runs across it and the compound is between the barricade and the cordon; the checkpoint gate is the compound's south gate. | Clearing 28 m to 30 m. Barricade at 4 m south of the centre; watchtower on the near side, west of the road; compound behind. | `data/outpost.json`; `data/openingCluster.json` |
| 226 | **A longer approach:** the road's chained gate was only about 15 m outside the clearing. | Moved back 31 m (`road` 463 to 432); the ROAD CLOSED sign beside it (452 to 426). | `openingCluster.json` gates; `config.map.road.sign.along` |
| 227 | **The first helmet** stands on the road (lingering), so the sweep shows him and he comes when he sees you. | As described. | `data/outpost.json` `firstHelmet`; `Outpost.sendHelmet()` |
| 228 | **The waves** stand up about 42 m ahead of Tom (toward the barricade gap), 14 m either side, and come at him. | 3, 5, 8; 9 s lulls; x1.5 by night; retreat 170 m. | `config.outpost.approach` |
| 229 | **When the barricade's peak starts.** | Once the approach is done and the rounds taken, near the line (but up the tower it waits for the dogfight, so you see that first); or the approach done and within 12 m; or anyone within 6 m of the line. 14 (20 by night) in 3 bursts 2.5 s apart. | `config.outpost.peak`; `Outpost.updatePeak()` |
| 230 | **Before Ellen's call the outpost is quiet** (the gates are soft: you can push round them early). | No waves, no sweep until `outpostCall`. | `Outpost.update()` |
| 231 | **Helmets.** | Stop the headshot bonus until they've taken 50 damage (two service-rifle rounds to the head); the hunting rifle goes straight through. A helmet hit rings (no blood). No helmet dropped once it's off. | `config.zombies.variants.army.helmet`, `config.weapons.sniper.helmetPierce`; `combat/hitscan.js` |
| 232 | **The rounds in the nest.** | 10 (two magazines). | `config.outpost.tower.rounds` |
| 233 | **The dogfight's trigger:** the scope raised up the tower; if he never climbs it, crossing the barricade once the peak's down. Once. Rewatchable on the monitors. | As described. | `Outpost.updateDogfight()` |
| 234 | **The dogfight's framing.** The trees round the outpost and the tower would fill the scope, so the cutscene's camera sees past everything within 60 m. Both come down on their sites; the crashes flash over the treeline and smoke stands there afterwards until Tom gets within 40 m. The crashed plane is now on every run (DESIGN said so; encounters.json had it uncommon). | As described. About 18 s. | `cutscenes.json` `clip.dogfight`; `story/cutsceneFlight.js` |
| 235 | **The "jeep" across the barricade** is one of the army trucks (no jeep model yet), with a sure battery. | As described. | `data/outpost.json` `trucks`; `Outpost.sureBattery()` |
| 236 | **The beetles' numbers.** | Health 150; the shell takes 30%, the face 3x (the hunting rifle kills with one to the face); charge 5.2 m/s; a bite 22. Five crates, one each; one breaks open by itself within 8 m once you're past the barricade; prise one open with X (1.6 s). | `config.beetles.ai`, `config.outpost.crates` |
| 237 | **The Mothman's container (C-7).** | A 7.4 s sweep the first time you're within 7 m of its torn end (not during the peak): the husk, round the bent side and up the gouges, then down into it. Wyatt and Ellen after; never named. The CCTV placeholder `clip.mothmanContainer` is left as it was. | `cutscenes.json` `sweep.outpostC7`; `Outpost.playC7()` |
| 238 | **The field report and the manifest** (drafts): Captain R. Hale's report of the breach (the specimen "last seen moving south, low over the treeline"; the dead getting back up); the manifest (C-7 redacted, from "Site 4 (mine workings)"). Neither names the witch or the Mothman. | Typed papers in close-up. The report's carried home as lore. | `src/data/papers.json` |
| 239 | **The outpost's draft lines** (`outpost.*`). | All `draft` in `dialogue.json`. | `src/data/dialogue.json` |
| 240 | **The objectives after the barricade:** the armoury, then the field report, then the checkpoint. The beetles aren't an objective. | As described. | `story/Objectives.js` |
| 241 | **What isn't saved:** a wave or the peak that was out comes again; beetles out of their crates are gone on a reload (their crates stay broken). | As described. | `Outpost.loadState()` |

## Session 16 (Level & Encounter Designer + AI Programmer: Aaron's notes on the overnight work; the storm shelter)

Aaron's shelter calls: small and a bit shabby (Earl dug it himself); 12 citizens; digging the sigil stops the rising and the family work out the sigils cause the zombies; nothing indicates the children died (maybe they escaped); the diary in a paper close-up, and Earl's note too. The calls I made building it:

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 213 | **Earl: a zombie at the hatch, or a body?** I asked "Earl alone at the hatch?" and DESIGN's beat list says a body face down; Session 13's call (Aaron) was a zombie with the combination on him. | A zombie (variant `earl`) among the horde; put down, his keys lie where he fell (a glint; hold X). Ellen knows him by his cap. | `StormShelter.placeEarl()`, `earlFell()`; `data/stormShelter.json` `earl` |
| 214 | **How fast the sigil raises more by day.** | One every 6 s while fewer than 12 are up and Tom's within 60 m of it, until it's dug up (no cap on the total). | `config.stormShelter.horde` |
| 215 | **The room below:** a platform under the hatch (no loading, no separate interior). | Tom walks its floor; the dead can't hurt him down there (they mill about above). The world isn't muffled yet (an audio-pass note). | `StormShelter.platform()`, `Player.keepInRoom()` |
| 216 | **Reading pauses the game** (the paper close-up). | The world and the clock wait while a paper's open, like the point-of-no-return pop-up. | `Game.update()` (`paper`) |
| 217 | **The diary's dates.** | June 14 1987, April 2 1989, Oct 9 2002, Sept 30 2003, then a blank page (DESIGN's proposed years). Entry 4 now says "Dug that hole myself years ago" (Aaron: he built it). | `src/data/papers.json` |
| 218 | **The tape:** Earl and the two kids only (his note was left for Marcy, so she wasn't with them). The kids run into the trees one way, Earl the other, and she goes after him (so they may have got away). | As described; Junie spots it. | `cutscenes.json` `clip.pruittTape` |
| 219 | **The shelter's and the tape's draft lines** (`shelter.*`, `tape.*`). | All `draft` in `dialogue.json`. | `src/data/dialogue.json` |
| 220 | **The diary can't be read again** once picked up (it's carried home and handed in like any lore). | Read once in the shelter. A "read it again" from the ledger could come later. | `StormShelter.search()`; `story/Lore.js` |
| 221 | **The horde isn't saved:** on a reload it's back (12 and Earl, if he wasn't put down) while the sigil's in the ground; once it's dug, none. | As described. | `StormShelter.loadState()` |

After Aaron's first playthrough (round 1), the calls I made:

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 222 | **The map's star over unexplored ground:** it shows through the fog of war. | Always shown. | `MapScreen.draw()` |
| 223 | **The objectives' wording** (one sentence each). | My drafts. | `story/Objectives.js` |
| 224 | **Watching is never forced:** the camcorder and camera six wait for D-pad down however long (Night 1 holds short of dawn until camera six is watched). | No fallback timer. | `story/WatchQueue.js`; `FirstDay.updateNight1()` |

## Session 15b (Level & Encounter Designer + Narrative: the first day's play-test; overnight, the gas station and the quad bike)

Aaron's play-test notes were taken one at a time; his calls are in STATUS (Session 15b list). **Session 16:** Aaron reviewed the overnight work: everything not marked resolved below is accepted as built. The gas station's beats and the quad bike were built overnight on his go-ahead: every call I made is in **`MORNING.md`** (items 1-22), for his review. The ones still open:

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 198 | **The gas station mutant's health** (MORNING 1). | 180 (ordinary mutants 300, before the level). In the test it charged on waking and took Tom to 40 health. | `config.gasStation.mutant.health` |
| 199 | **When the mutant wakes** (MORNING 2-3). | About 1.6 m into the shop, a 3.4 s first-person moment (the world runs on); shooting it asleep wakes it with no moment. The shelves moved to give the door a sight line. | `gasStation.json` `shopZ`, `mutant`, `store.shelves`; `cutscenes.json` `gas.mutant` |
| 200 | **The forecourt pack** (MORNING 4). | 5 citizens hanging about the pumps, there as Tom nears (no rising). | `config.gasStation.pack`, `gasStation.json` `pack` |
| 201 | **The witch at the gas station** (MORNING 5). | Straight across the road from the door, about 20 m, framed by the canopy; about 2.8 s, then she runs east. Small on screen. | `gasStation.json` `witch`; `cutscenes.json` `gas.witch` |
| 202 | **The gas station's draft lines** (MORNING 6): the phone (Wyatt), the scanner's broadcast and Ellen, the safe opened (Wyatt). | All `draft` in `dialogue.json` (`gas.*`). | `src/data/dialogue.json` |
| 203 | **Earl's note on screen** (MORNING 7). | In the subtitle strip as "EARL'S NOTE", silent; readable again. A paper close-up could come later. | `GasStation.readNote()` |
| 204 | **`rifleClaimed`'s stand-in** (MORNING 8). | The safe sets it for real now, but the Session 14 stand-in (both places visited) still fires and opens the outpost early. Session 16 should drop the stand-in once the shelter gives `earlCombination`. | `src/data/progress.json` |
| 205 | **No shooting from the quad** (MORNING 14). | **Resolved (Session 16, Aaron): as built** ("otherwise you'd never get off the bike"). An alien ray gun usable from the saddle is an idea for later (DESIGN, Ideas for later: quad upgrades). | `Game.step()` (`riding`) |
| 206 | **The quad's numbers** (MORNING 15-17). | 13 m/s on paths, a third in the brush; rams the dead above 4 m/s; its engine draws the dead within 25-60 m every 1.5 s. | `config.quad` |
| 207 | **The witch on the quad** (MORNING 18). | **Resolved (Session 16, Aaron): fine as is**, 1.6x. | `config.quad.witchSpeedScale` |
| 208 | **The quad: fuel, damage, headlamp, map icon?** (MORNING 20). | **Headlamp built (Session 16, Aaron):** on in the dark, D-pad right toggles it. No fuel, damage or map icon. Upgrades (a spiked ram, more) are in DESIGN's Ideas for later. | `world/Quad.js`, `config.quad.headlamp` |
| 209 | **The torch on the quad's handlebars** (MORNING 21). | Lights them a pale grey at point blank from the saddle (dark colours already). | `config.quad.look`; the art pass |
| 210 | **The placeholder signposts** (MORNING 10). | Gone from the built sets (the campsite, the gas station). | `config.landmarks.built` |
| 211 | **Night 1's talk and the fade to dawn**: there's no digging the sigil up on Night 1 now (the night ends with the talk). | **Resolved (Session 16, Aaron): digging is impossible on Night 1** (`ZombieDirector.digLocked`). | `FirstDay.update()` |
| 212 | **The fence nearly fights Night 1 alone**: in the headless run the charged fence killed most of each wave in about 30 s. | **Resolved (Session 16, Aaron): fine** (the player's still learning; no game over expected yet). The waves now overlap: each 15 s after the last rose. | `config.firstDay.night1.waves` |

## Session 15 (Level & Encounter Designer + Narrative: M9.2, the first day)

Agreed with Aaron at the start: **my recommendations on everything** (below), pushed to `main` to play-test. Day 1's clock holds at 17:00 until the tutorial's done; Day 1 can't be failed (a health floor of 20%); the campsite as the doc proposed (camcorder in the cooler by the entrance, shotgun in the far tent, a wave of 7 from both flanks); about 8 s of camcorder footage, never a clean frame of her; Night 1's witch planting at the shelter with its dead holding there; the menu with Modifiers and Settings greyed out and no Quit; Skip intro once the opening's been seen on the device; a few draft nudge lines.

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 185 | **The nudge lines** (drafts, mine). | Six lines (`day1.nudge.*`: the tower, the campsite, no battery, battery not fitted, fence not patched, "come inside") play once each if Tom seems stuck on a step for a while (75 s for the tower, 150 s for the campsite, 20-60 s for the rest). Rewrite them, or cut any that feel like a hint button. | `src/data/dialogue.json`; timings `config.firstDay.nudges` |
| 186 | **Day 1's clock hold.** | The clock stops at 17:00 on Day 1 until a battery is in the fence box **and** no fence panel is broken through (added: Night 1's strays walked straight in through the torn panel). Then about 80 s to dusk. | `config.firstDay.holdHour`, `story/FirstDay.js` `holdTheClock()` |
| 187 | **"Can't fail" on Day 1.** | Health can't drop below 20% of full on Day 1 (day phase only); Night 1 is the real game. | `config.firstDay.cantFail`, `healthFloor` |
| 188 | **The campsite's numbers.** | Wave: 7 level-1 citizens from both flanks (60-130 degrees either side of ahead), over 6 s, a slow walk (0.38-0.48 of a sprint). Shotgun: 12 + 8 shells (plus 4 in the gun), 4 more in the backpack, some rolled in the tents. Scrap: 8 to start (was 30) + 15 guaranteed at the camp; the torn fence takes about 19. | `src/data/campsite.json` (`wave`, `searches`), `config.inventory.startScrap` |
| 189 | **The camcorder clip** (how much of her). | About 8 s: the camper films the tents, a blur crosses the treeline, then she's on a camper by the fire, the shot whips round and drops, the tape cuts out. Box stand-ins for the campers; the real witch model. | `src/data/cutscenes.json` `clip.camcorder` |
| 190 | **The light far to the south** (the tower). | A small red light blinking at the edge of sight (the fog's reach, toward Ground Zero), above the treetops. By day a white light vanished into the pale fog, so it's red, like a warning lamp. Never explained. | `cutscenes.json` `day1.tower` (actor `light`), `config.firstDay.tower` |
| 191 | **The smoke from the tower.** | The campsite is past the fog's reach from the tower, so the cutscene draws the wisp along the line to it at the edge of sight; the campsite's own smoke rises over the camp until you arrive. Both go after the arrival. | `cutscenes.json` `day1.tower` (actor `smoke`), `data/campsite.json` `smoke` |
| 192 | **Night 1's strays and her planting.** | 40 s into Night 1, 3 strays march from 70 m up the campsite path to the fence (line 16 when they're 14 m from it). 95 s in, the witch plants beside the shelter's centre (not while Tom's within 70 m), camera six plays, the sigil goes on the map and the spur opens. Its dead linger within 14 m of it and never march. She isn't seen walking there in the world (the real witch stays home on Night 1; the clip shows her). | `config.firstDay.night1` | **Session 15b (Aaron): replaced.** Night 1 is the first defence: after Junie's 13-14 the day fades to dusk; at night 9 zombies in waves of 3 (south-west up the campsite path, south, east; the next 10 s after the last is down; `config.firstDay.night1.waves`); camera six once they're down; line 20 sends Tom to the gas station. No health floor at night (Aaron). After his play of it: straight to night (no dusk), Ellen's warning before the clip, the talk after it (the Pruitts, the gas station), then a fade to dawn.
| 193 | **The menu's feed.** | Grey CCTV from the station gate at 05:36, panning slowly over the woods (real night is too dark to read on a feed). | `cutscenes.json` `menu.feed` |
| 194 | **New Run with a save.** | It reloads on a fresh map (a new map needs a reload) and asks you to tap to begin (fullscreen needs a tap). With no save, New Run starts at once on the map already loaded. | `core/Game.js` `onStartChoice()` |
| 195 | **Skip intro's starting kit.** | Dawn 1: the fence whole, one battery's charge, the shotgun with 8 extra shells, 12 scrap, the camcorder handed in, the campsite looted, the shelter sigil planted and on the map, day2 open. | `config.firstDay.skip`, `FirstDay.skipIntro()` |
| 196 | **The campsite's searches restock?** | Never: once searched, a point stays empty; no second wave. A save mid-wave comes back with the wave over. | `encounters/Campsite.js` |
| 197 | **The family's ending lines could be picked by talking to them** (found this session). | Junie would have said "Is it over?" if you talked to her. Lines played only by a system are now marked `cued` and never picked by talking (the ending's, the nudges, waking, line 12). | `dialogue.json` `cued` |

## Session 14 (Lead Engineer: M9.1, the cluster on the map)

Agreed with Aaron at the start: **push each step to `main`**; the cluster's layout on my recommendation; **stand-in triggers** for the gates until the story beats exist; the cluster counts toward the 22 clearings. Decided along the way: the road, cordon and gates as proposed (rule 10); **the gates stay soft barriers for now** (Aaron: to revisit later in development); **the flare gun fires like a gun** (a projectile along the crosshair that can conk a zombie), and only the newest flare lights and lures.

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 171 | **The cluster's layout and distances.** | Home on the cliff at the middle of the north edge; the campsite about 150 m south-west, the storm shelter about 175 m south-east, the family cemetery beyond it, the gas station south-west of the campsite, the outpost 260 m due south, the cordon 290 m south of home. Home to the outpost by the paths is about 410 m: a minute and a half at a walk. Too close, too far? | `src/data/openingCluster.json` (`dx`, `dz`), `config.map.cluster.cordonSouthOfHome` |
| 172 | **The family cemetery is the cluster's sigil ground** (proposed: the Pruitts' land). | Always the cemetery; the other north ground is seeded in the north frontier. | `openingCluster.json` (the `sigilGround` entry) |
| 173 | **A path from the cemetery to the outpost** (added, not in the design). | Without it the cluster's paths were a tree, and the witch and night marches reached the shelter side only through the station. Tom's blocked on it by the outpost's side gate (same flag as the road gate). | `openingCluster.json` `paths`, `gates` (`outpostSide`) |
| 174 | **The stand-in triggers.** | `day2`: the first dawn after visiting the campsite. `rifleClaimed` and `outpostCall`: both the gas station and the shelter visited. `outpostCleared`: Tom at the outpost and no living zombie within 15 m of its edge. Sessions 15-17 replace these with their beats (`StoryProgress.setFlag()`). | `src/data/progress.json` |
| 175 | **How the dead cross the cordon.** | They walk the pathways, so nearly all come through the checkpoint (its gate stops only Tom). The torn gaps let through any that are off the paths; a whole panel stops a zombie as it would a wall, so one chasing Tom across the fence slides along it. | `world/cordon.js` |
| 176 | **The flare's numbers.** | 55 m/s, drops 6 m/s². A conk does 18 (54 to the head) and staggers 0.9 s. Burns 20 s. Lures every zombie within 35 m to mill within 2.5 m of it; one that notices you within 3 m comes for you anyway. The pop alerts zombies within 25 m. Fire every 0.8 s. | `config.flares`, `config.inventory.startFlares` / `maxFlares` |
| 177 | **Where flares come from.** | 3 at the start (carry 3). Police car boots (35%, 1-2: road flares) and army zombies (5%). The crashed plane and the outpost (DESIGN.md) come with their encounters. | `data/vehicles.json`, `data/loot.json` |
| 178 | **The witch with nowhere to plant in the cluster.** | Before the crossing, if no spot north of the cordon keeps her rules (70 m from other sigils, 160 m from home), she plants nothing that night. With 5 sigils at most it rarely bites (the tests fill 3-5). | `config.witch.clusterPlantMargin`, `config.planter` |
| 179 | **Camera numbers.** | Camera six (the storm shelter's, fixed) and five seeded ones in the frontier, numbered 1-5 north to south, so six is the northernmost but numbered last. | `openingCluster.json` `trailCams`, `story/trailCamPlacement.js` |
| 180 | **The look of the road, cordon and gates** (style pass 2, Session 19). | Placeholder-plus, in code: the asphalt texture, the pipe gate, the oak, the chain-link gates and their signs; the colours dulled where the torch glared. The torn gaps are a panel peeled in, with its coil sagging. | `render/Road.js`, `render/Cordon.js`, `render/GateProps.js`, `config.map.road` / `cordon` / `gates` |
| 181 | **Old saves.** | The save version went to 2: every seed's map changed, so a version 1 save is discarded cleanly. | `core/saveData.js` `SAVE_VERSION` |

| 182 | **The flare's conk** (Aaron: 5 body hits or 2 to the head to kill; realistic?). | 18 a hit, 3x to the head. A real flare round at close range is a heavy, burning blow, so dropping a zombie with two to the head is fair; flares are scarce (carry 3), so it rarely matters. Lower `hitDamage` if it should be a lure first and a weapon barely at all. | `config.flares.hitDamage` |
| 183 | **The witch's leash** (Aaron: she was relentless). | She gives up 50 m from where the fight started before the crossing, 140 m after, then leaves you be 40 s unless you hit her. Too easy, too hard? | `config.witch.pursuit` |
| 184 | **Exploding cars' numbers** (Aaron asked for about 300). | 300 to blow; smoke from 120, fire from 240 (then about 5 s to go up by itself); the blast 8 m, 200 to zombies, 90 to you at the centre; the wreck burns 30 s; cars a blast pushes past 300 go up 0.4-1.2 s later. A rifle round does 25, a shotgun blast up to 48, a flare 18. | `config.vehicles.damage` |

**Resolved here:** #153 (the fixed camera near the storm shelter, built: camera six). After the play-test: the props' glare, the flare's arc, running from the witch, cutscene actors walking backwards, quicker car looting, exploding cars, the floating foliage.

## Session 13 (Graphics Engineer / Technical Artist: characters and the deferred art)

Agreed with Aaron at the start: **a short written proposal in the chat, then a version pushed to `main` to react to in-game**, a step at a time. Decided along the way: the zombies stay sprites (huge hordes must stay cheap: one draw call); the family talk with the bob, no mouth; the grey alien is the cowboy Martians' species, the cowboyness dialled back (AI in M10); the witch never shows a face and never bends at the hips; the living Men in Black are the cutscenes' 3D model with minimal changes; four vehicle types only, the sheriff's paint; the station lit; the hut a taken settler's cabin.

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 161 | **The torch up close on pale models** (a game-wide question for a style pass). | At point-blank range the torch blows pale things out (the grey alien, faces, the sheriff's white doors, Earl's shirt, the suits go charcoal). Each model's albedo is a compromise; a gentler torch falloff in the last metre or two would fix them all at once. | `config.flashlight`, the models' `albedo` |
| 162 | **The witch's eyes in dark cutscene feeds.** | Her eyes glow faintly; in the darkest feeds (trail cam at night) they can be lost. Brighten them for cutscenes only? | `config.witch.look`, `config.cutscenes.actorLight` |
| 163 | **The witch's planting pose.** M7 asked for her "folded flat"; Aaron (Session 13) wants no bend at the hips anywhere. | She plants upright, arched back, arms raised, contorting (no fold). Confirm it reads as the ritual. | `render/WitchRenderer.js` (plant), `config.witch.look.plantArch` |
| 164 | **How bright the station is inside.** | A warm point light a room, at 60% while the fence has no charge, breathing with the woodstove. With no charge, the bunk corner is dark. | `config.station.look.interiorLight` |
| 165 | **The furniture is solid.** | The stove, kitchen counter, table, bunks and filing cabinets block bodies, kept clear of the zombies' way from the front door to the comms door. Watch a siege for snagging. | `stationLayout.js` `cabin.furniture` |
| 166 | **The vehicles' wear.** | Rust (most a little), mud and dust (all), dried blood (1 in 7), a cracked window (1 in 3, 40% of those smashed). Is the rust right, does the blood read as blood? | `config.vehicles.looks.wear` |
| 167 | **The armed Men in Black: recoil, armour.** | The kick is subtle (pistol and sniper most). Their body armour (DESIGN.md: they drop it) isn't visible: taken as worn under the jacket. | `config.mibAgents.recoil` |
| 168 | **The zombie Men in Black's toughness.** | As tough as the army (1.6), so the hunting rifle still kills every zombie with a headshot (Session 10b); they drop a vest (+40, as body armour) and pistol ammo. | `config.zombies.variants.mib`, `data/loot.json` |
| 169 | **Earl Pruitt's spawn and the combination.** | A zombie variant (`'earl'`, one fixed look), not placed yet: the storm shelter's encounter (M9.3) spawns him at the hatch and drops the combination on his body. His loot table is empty until then. | `EnemyManager.spawnZombie(x, z, { variant: 'earl' })`, `data/loot.json` |
| 170 | **The softened looks** (tone-downs made from renders, not play-tested). | The hut's hand-prints dimmed (they read as white gloves under the torch), its flames moved toward orange; the clothes' fit loosened (Ellen keeps about half her waist: is her fleece too boxy?). | `config.hut.look.ash`, `HutRenderer.js` FIRE_FRAGMENT, `familyLooks.js` EASE |

**Resolved here:** #144-148 (the deferred art, Session 10b), and DESIGN.md's open question on the Men in Black's art direction (3D, the cutscenes' model).

## Session 12 (Narrative Designer: M8, the story systems)

Agreed with Aaron at the start: **push each step to `main`**; skip the separate workshop and **put a first pass into the game to react to**; **cutscenes pause the clock**.

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 155 | **The cutscene, subtitle and camera looks** (rule 10's workshop, done as a first pass in the game). | Subtitles: a dark strip at the bottom centre, the speaker's name in their colour, typed on with a blip at each speaker's pitch, a RADIO tag, a crackle and a faint green flicker for radio calls. Looks: CCTV (grey-green, scanlines, lens bend), trail cam (night-vision green), camcorder (warm, colour fringe, handheld shake), military (static, torn rows, dropped frames), government (blue, CLASSIFIED), scope (round mask). Name, time and REC on screen. | `config.subtitles`, `config.story.speakers`, `config.postFX.looks`, `config.cutscenes`, `src/style.css` (Subtitles, Cutscenes) |
| 156 | **How the family appear face to face.** | The station's placeholder figures, which bob while their line types on; a small gold diamond floats over anyone with something new to say. Hold interact while looking at them in the comms room. The real models are Session 13's (#148). | `config.familyTalk`, `story/FamilyTalk.js` |
| 157 | **Clips from elsewhere hold the world still** (proposed). Only the clock was asked for. | A CCTV, trail cam or camcorder clip freezes everything (zombies, the station) as well as the clock, so a patch-through mid-night can't get you killed. First-person ones (the final battle's intro, the hut exploding) let the world carry on with your controls locked. | `"world": "run"` per cutscene in `src/data/cutscenes.json` |
| 158 | **Should a trail cam sighting play its clip** (a patch-through), or only mark the map and go on the monitors? | It marks the camera on the map and puts the clip on the monitors, with a notice ("CAMERA 3: something moved past it"). It doesn't play by itself. The family's sighting lines are still to be written. | `story/TrailCams.js` `report()` |
| 159 | **Idle lines.** "When nobody has anything new" (DESIGN.md: about 2 each). | No idle lines are written (M8 wires only the existing lines). Talking to someone with nothing new shows "Wyatt has nothing new to say". | `src/data/dialogue.json` (`"idle": true`) |
| 160 | **The camera looks at night.** | The actors are lit by the camera's lamp (they glow a little in their own colour, plus some grey), since a real light would recompile every shader as it came and went. The world stays as dark as the hour. | `config.cutscenes.actorLight`, `actorLightGrey` |

**Decided here:** the clock pauses for every cutscene (Aaron). NightWatch's radio calls, the point-of-no-return call, the final battle's intro and the ending and defeat cards now run on the story systems. Day 1's lines are data, played from the debug menu, with a toggle to make them live in a run; their real triggers come with M9.2. Lines 1-2 (the opening) wait for a `story:opening` event that M9.2 sends.

## Session 11 (design review, Lead Engineer)

Aaron brought his story and encounter design (the fixed opening cluster: campsite, storm shelter, gas station, military outpost; written into DESIGN.md on Oct 16). Agreed with Aaron in this session:
- **All ten review fixes** (DESIGN.md, Map: Fixed opening cluster): the cordon blocks Tom, not the dead (torn gaps); she plants only inside the cluster until the barricade is crossed; a scripted Night 1 sigil at the storm shelter; the shelter's horde holds the hatch by day; one authored road; no checkpoint or roadside clearing types in the cluster; the scope cutscene's backstop at the barricade; Bigfoot "at least since the late 1980s, in truth far older"; the rest of the north band is the **north frontier**; Wyatt's shelter line.
- **More encounter updates are coming** (Aaron is still redesigning the random encounters).
- **M8 builds the systems and wires up only the lines already written**; each encounter session writes its own lines with Aaron.
- **The deferred art (#144-148) moves sooner, to its own play-test-driven session** (Session 13, straight after M8), with the character models the coming encounters need.
- **Every cutscene goes in the debug menu** (a Cutscenes category).
- **Play-test generously** (DESIGN.md rule 12; QA after M9, M10 and M11).

| # | Question | Where it stands | Where to change it |
| --- | --- | --- | --- |
| 149 | Does the storm shelter sit on the forced corridor, or a spur reachable from Night 1? | **Resolved (Aaron): a spur reachable from Night 1, never forced.** Still required before the outpost (the rifle chain). | DESIGN.md "Fixed opening cluster" |
| 150 | Should one of the two north sigil grounds sit inside the opening cluster? | **Resolved (Aaron): yes, one.** One of the two north grounds is placed with the cluster (the same every run); she favours it before the crossing, so the player learns to stake it out. For M9.1. | `config.map.sigilGrounds.perBand`, map generation |
| 151 | The setting year (about 2003, Aaron's leaning) and the time capsule (proposed 1903). | **Resolved (Aaron): 2003, and the capsule was buried in 1903.** It touches the camcorder, the VCR and tapes, the radio and CCTV, and the art. | DESIGN.md "Ideas for later" |
| 152 | The gas station owner's name, his note, and the combination's form. | **Aaron: dealer's choice. Earl Pruitt; the combination is stamped on a brass tag on his keyring.** The note's wording is for M9.3, with Aaron. | DESIGN.md "Roadside gas station", "Storm shelter" |
| 153 | The two cameras on Night 1 (the Hales' camera six and the owner's camera four). | **Resolved (Aaron): the Pruitts die on Night 1**, while Tom is at the station. The Hales' camera sits further off and only catches her after they've fled its frame; Earl's tape reveals the rest. For M8 (a fixed camera near the shelter) and M9.3. | DESIGN.md "Storm shelter" |
| 154 | One guaranteed early charge (the outpost every run) instead of "two, one or none". | **Resolved (Aaron): not a problem.** One charge alone can't destroy the hut, so it can't start the final battle. | DESIGN.md "Explosives" |

**Resolved here:** #142 (the hunting rifle is in the gas station's safe, its rounds in the outpost's watchtower). #135 (Day 1 now has the campsite, and Days 1-3 the whole opening cluster). #42, in part (the gas station sits on the cluster's road). Still open: #143 (the SMG, heat-scope rifle and auto shotgun; Aaron will answer it as he designs those encounters in depth), #136 (an item that tags the witch).

## Session 10b (Graphics Engineer): art work deferred for the story pivot

Aaron asked for these in Session 10b, then paused them to work on the story and the random encounters ("we're just going to do a quick pivot"). None is started. **Aaron (Session 11): sooner, in their own standalone session, Session 13, straight after M8**, play-test driven and with the character models the coming encounters need. Details and starting points are in HANDOVER.md, "Deferred art work".

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 144 | **The zombies' look.** Aaron: they need work to look better. The heat scope showed they read well far off. | **Resolved (Session 13).** Aaron kept the sprites; the variety is a palette swap per zombie (hair, clothes, sleeves, plaid, camo, blood), still one draw call. Army camo and helmet loss, Men in Black zombies, Earl Pruitt. | `render/zombieSprite.js`, `render/ZombieRenderer.js` |
| 145 | **The cars.** | **Resolved (Session 13).** Four types only (Aaron): a late-80s sedan, a 90s pickup, a county sheriff's car, an M35 army truck, with per-vehicle wear. Exploding cars: later (DESIGN.md "Ideas for later"). | `render/VehicleRenderer.js`, `world/Vehicles.js` |
| 146 | **The witch's hut.** | **Resolved (Session 13).** A taken settler's log cabin (Aaron), the chair rocking when you're near, pale ash hand-prints; the wreck burns. | `render/HutRenderer.js`, `world/Hut.js` |
| 147 | **The ranger station's interior** (the comms desk, radio, ledger, table, bunks, cabinets). | **Resolved (Session 13).** A lived-in 1980s Forest Service station; lit (Aaron), static on the monitors, a woodstove. | `render/StationRenderer.js` |
| 148 | **The family** (Ellen, Wyatt, Junie). | **Resolved (Session 13).** Built with the figure kit, workshopped with Aaron (talking is the bob, no mouth; Ellen reshaped twice; clothes worn loose). | `render/StationRenderer.js`, `config.station.look.family` |

## Session 10 (style pass 1, Graphics Engineer)

Agreed with Aaron before building:
- **Art stays generated in code** (no texture files).
- **Night and dusk first**; the day only gets a polish.
- **Push each step to `main`** so he can play-test it.
- **References:** Appalachia, US forest rangers, a 1980s made-in-the-USA chainsaw manual, American folklore; Left 4 Dead, Silent Hill, Evil Dead 2.
- **Mist:** always-on low ground mist at night, plus **fog nights** about one night in three. Night 1 (the tutorial) is always clear.

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 137 | Should fog nights do more than change the look? (Zombies spotting you from less far, harder to find the witch, a line in the dusk forecast.) | Look only. The draw distance shrinks with the fog, so they're cheaper to draw. Gameplay effects are for the balance session; the forecast line is for the UI session. | `config.fog.nights`, `world/fogNights.js`, `render/Atmosphere.js` |
| 138 | How thick should the everyday night mist be? | A pale band low in the distance (strongest about 20 m out), thinner up a tree, heavier in hollows. Medium is 75% of High; Low has none. Thickest at dawn, burnt off by mid-morning. | `config.sky.keys` (`mist`, `mistAmount`), `config.fog.mist`, `config.quality.presets.*.mist` |
| 139 | The mist sits relative to the ground under you, not each spot's own ground. | Cheap (no height texture to sample): looking down into a hollow it's thicker, up a rise it's thinner. Inside the station's buildings the floor gets a faint haze. | `render/atmosphereShader.js` |
| 140 | Where does the retro pixel filter live, and how coarse? | 270 lines, switched from the debug menu. It belongs in the Quality settings once there's a settings screen (Session 28). | `config.render.retro.lines`, `Renderer.setRetro()` |
| 141 | The new Quality levers have no settings screen. | Each preset sets them (mist, mistPuffs, groundTwoSizes, treeTrunks, fireflies, beamDust, lightShafts, torchBeam); the debug menu switches each effect on and off. A player-facing Quality screen is Session 28's. | `config.quality.presets` |
| 142 | **Resolved (Session 11): the gas station's safe; its rounds in the outpost's watchtower.** Which encounter gives the hunting rifle, and where do its rounds come from? | Aaron: an encounter (it suits the military outpost or the lookout-style places). Debug menu only for now. Its rounds are rare: a loot entry with `ammo: 'sniper'`. | `config.weapons.sniper`, `Combat.giveWeapon()`, `data/loot.json` |
| 143 | Which encounters give the pistol's partners: the SMG, the semi-auto rifle with the heat scope and the auto shotgun? (Aaron kept all four.) | Debug menu only. They share rounds: the SMG with the pistol, the semi-auto with the hunting rifle, the auto shotgun with the pump. DESIGN.md's weapons table lists them. | `config.weapons`, `docs/DESIGN.md` "Weapons" |

## Session 9 (the gate, QA & Balance)

From Aaron at the start of the gate:
- **#130 answered:** destroying the hut deletes the save (see #130 below). The radio call and pop-up work on the tablet (Aaron).
- **#131-132:** the ending and defeat lines stay placeholders for the Narrative Designer.
- **Explosives** for full runs come from the debug menu (Hut & explosives).
- **The final battle's frame rate on the tablet:** Aaron has played it a couple of times and saw no drop.
- **Ambushing a ritual feels balanced:** shooting her, or walking up very close, breaks it and she attacks.
- **Making her flee, the final battle and killing her on the pathway** all play well (before the new fight pattern below).
- **Traps:** the snare is really good; the totem should be lower (done, #121); the charm is fine but easy to avoid.
- **Her fight, reworked (Aaron):** double health, and a retreat / hex / rush pattern (#113, #116, #129). After his first play: 30 m was too far (and in the final battle she snagged on the trees at the ring), so 20 m; a hex every 6 s; body shots bring her in too. **Aaron confirmed (second play): 20 m is the right balance, the hexes can still be sidestepped, no snagging in the final battle. The witch is done for now.**

| # | Question | What it does now | Where to change it |
| --- | --- | --- | --- |
| 135 | Day 1 has nothing to do but loot cars, which gets old fast, so a full run is hard to judge. Aaron: the abandoned campsite (every run, next to home) would fill a chunk of Day 1 and make the cars a bonus. | Not built: it's M9 content (now M9.2, Session 15, Level & Encounter Designer), and rule 10 says workshop it first. **Aaron (Session 9): keep the session order as it is.** The campsite comes in Session 15 (renumbered in Session 11); full-run pacing (ammo, loot, the dusk choice) is judged once the north is built. | DESIGN.md "Abandoned campsite" |
| 136 | Aaron's idea: an item from a random encounter that tags the witch, so she shows on the map for good. Perhaps a special one-shot rifle: hit her once and she's tagged permanently. | An idea for the encounter sessions (M9-M11), not built. The map already has a debug "Show her on the map" (`witch.showOnMap`) the item could switch on. | `ai/Witch.js` `showOnMap`, `ui/MapUi.js` |

Where `docs/DESIGN.md` was silent or unclear, the simplest option was chosen, made a config value where possible, and logged here for Aaron. Newest session first. Resolved items are kept, marked **Resolved**, for the record.

## Session 8 (M7, AI Programmer)

Agreed with Aaron before building (rule 10):
- **Her look:** a placeholder 3D figure: tall, thin, stooped, ragged dark cloak, a crown of sticks, long arms, glowing eyes. He'd like to spend more time on her look later: she's one of the few characters worth extra drawing.
- **Toughness:** about 3-4 good ambushes to kill her on the pathways, if she isn't given time to heal. "Make her good and strong"; tune after play-tests.
- **Planting:** night 1 safe, then 1-2 sigils a night, aiming to corner her around nights 6-8.
- **The hut by day:** she stays hidden inside and comes out in the early evening. You can stake it out and take shots at her as she leaves.
- **Blood night:** detonating by day jumps straight to night. The clock freezes, but the station's attacks run on in real time, so a weak base can still fall.
- **Snares:** mash A for about 2 seconds to break free.
- From Session 7: hiding at 6 m and the recalibrated forecast work (Aaron); not saving zombies at dawn is fine (#102 resolved).

| # | Question | What M7 does now | Where to change it |
| --- | --- | --- | --- |
| 105 | When does she set out, and how many does she plant? | At dusk (from the hut). Night 2: one sigil. From night 3: a second 40% of the time, if she's done with the first before 80% of the night. The stand-in planter is gone. | `config.witch.firstNight`, `secondFromNight`, `secondChance`, `lateCutoff` |
| 106 | Where does she plant? | M4's rules: 60% on an empty sigil ground, else off a pathway. She picks the night's spots as she leaves, ignoring where the player is (so a player staking out a ground can be waiting for her). | `config.planter`, `ZombieDirector.chooseSpot()` |
| 107 | How fast does she travel? | **Aaron (step 1 test): 10% faster**, so 6.05 m/s near the player (he could keep pace at 5.5; the player sprints at 7.2), 3x that out of sight (beyond 150 m), so she can reach the far north and back in a night. She keeps off the ranger station's clearing unless there's no other way. | `config.witch.roamSpeed`, `abstractScale` |
| 108 | The ritual. | **Aaron (step 1 test): 45 seconds** (2 minutes was too long; DESIGN.md said 2-3), crouched and contorting at the spot, a glowing green ring on the ground (seen through the fog) and singing that carries 70 m. The sigil appears when she's done. A ritual under way at dawn is finished; otherwise dawn sends her home. | `config.witch.plantSeconds`, `songRange`, `look.ritual` |
| 109 | Does the forecast know about her? | Yes: the sigils she's out to plant tonight count from when she's expected to finish them (travelling out of sight), listed as "The witch is out to plant a sigil" without saying where. They count at tonight's level, not the level they'll raise it to. | `NightWatch.plannedSigils()`, `danger.js` (`delay`) |
| 110 | Is she saved? | Not yet (step 1): a continued run finds her resting in the hut at dawn. Her wounds, the hut and charges are saved in step 6. | `core/saveData.js` |
| 112 | Her look (Aaron, step 1 test). | **A thin shadow creature:** unlit near-black (the torch can't light her or glint off her), 28% thinner, only her silhouette and glowing eyes read. In the ritual she folds right down and contorts: head craned and twisted too far, arms splayed like a spider's, every joint jerking to a new angle and holding. **Second look:** slanted slit eyes (square ones read as glasses), she **glides** instead of walking (no steps or arm swing: too human), a tapered cloak instead of a pinched cone waist, and **elbows and wrists** (elbows sometimes bend the wrong way in the ritual). The real model comes in the art pass. | `config.witch.look`, `render/WitchRenderer.js` |
| 113 | How tough is she? (step 2) | **Aaron (Session 9): doubled to 1000 health.** Before: 500 health (a rifle body shot is 5%, a headshot 10%: her headshots are x2, not the zombies' x3). An ambush that turns into a fight takes her from 100% to about 60% before she flees (8 rifle hits); later meetings she flees at once unless she's near her hut. | `config.witch.health`, `headshotMultiplier`, `fleeBelow` |
| 114 | When does she notice you? | The zombies' detection model with her sight and hearing x1.3 (hiding still caps it at 6 m). In the ritual's trance only x0.35 of that, or a shot within 30 m, or being hit. Noticing you breaks the ritual: that sigil is lost, so scaring her off counts as an interruption, not only damage. | `config.witch.notice`, `ritualNotice`, `ritualHearing` |
| 115 | Fight or flee. | Score = health share + 0.5 at the hut (fading to 0 at 250 m). At or above 0.6 she attacks, below it she flees; she rethinks every second and on every hit. | `config.witch.fleeBelow`, `hutBonus`, `hutRadius` |
| 116 | Her attacks. | **Aaron (Session 9): a new pattern.** She backs off, weaving, to 20 m (30 m was too far; or for 5 s at most), dropping traps, then holds there throwing a hex every 6 s at 25 m/s (2.5x faster). Within 10 m she backs off again. Any hit but the shotgun's (rifle or pistol, body or head) sends her rushing in at 11 m/s to swipe again and again (30 damage; she follows you through the wind-up, so it lands within 3.3 m). Any shotgun hit drives her back out at once, or 100 damage from anything else (2 rifle headshots, 4 body shots); after 12 s she backs off anyway. She summons whenever it's ready (every 60 s). Before: She circles you at 11 m throwing a hex every 2.6 s (20 damage, 10 m/s, straight at where you were: sidestep it or put a trunk between you; chain-link doesn't stop them). Within 4 m, or if you stand still 1.5 s within 9 m, she rushes in (9.5 m/s) and swipes (30 damage, 0.4 s wind-up). She summons 3-4 zombies when a fight starts, at most once a minute. | `config.witch.attack` |
| 117 | Fleeing and after. | 8 m/s home along the pathways (you sprint at 7.2), weaving 2.2 m side to side. Once she's lost you for 6 s and is over 60 m off, she goes back to planting if she's above 40% and the night allows, else home. | `config.witch.flee`, `loseSeconds`, `wounds.homeAfterFleeBelow` |
| 118 | Wounds. | Her health carries over (and is saved). She heals 35% a day (about 2.5 days from near death). Below 60% she plants at most one sigil a night; below 30% she stays in to heal. | `config.witch.wounds` |
| 119 | Killing her on the pathways. | Allowed (DESIGN.md). She collapses and sinks into the ground and a placeholder "THE WITCH IS DEAD" screen ends the run (the save is deleted; A starts a new run). The real ending is step 6. | `Game.js` ('witch:killed'), `Combat.victory()` |
| 120 | Her health bar. | A placeholder bar, top centre, while she fights you and for 8 s after a hit. | `config.witch.bossBarSeconds`, `Hud.boss()` |
| 121 | Her traps (step 3). | **Aaron (Session 9): the totem stands 0.6 m tall, low to the ground (was 1.4 m).** The charm is fine, if easy to avoid. Before: **Snare:** step within 0.75 m and you're held (5 damage). You can still look and shoot; mash A 6 times (about 2 s at a normal pace; the effort drains if you stop) to tear free. Used up once sprung. **Hex totem:** 8 damage a second inside its 3.5 m glowing ring; stays until shot or struck. **Alarm charm:** trips within 1.6 m: zombies within 80 m come, and the witch hears it within 250 m and comes looking. Can be shot first. Totems and charms within 60 m can be shot (aim assist ignores them). | `config.witch.traps` |
| 122 | Where the traps are. | 16 along the pathways within 320 m (by path) of the hut, weighted toward it, at least 14 m apart, a little off the centre line (the same for a map every time). She drops one every 3.5 s while fleeing (slowing to 60% for half a second), at most 20 dropped at once. Not saved yet: a continued run has the hut's traps back and no dropped ones (step 6). | `config.witch.traps.hut`, `dropEvery`, `maxDropped` |
| 123 | The hut (step 4). | A placeholder crooked shack (5 x 4 m, leaning walls, a steep sagging roof, a leaning chimney, a black doorway under an antlered skull, green-glowing window slits), in the middle of the hut clearing with its door toward the pathway in. It replaces the clearing's signpost. She leaves and returns by the door. | `config.hut`, `world/Hut.js`, `render/HutRenderer.js` |
| 124 | Explosives (step 4). | Debug-given (Hut & explosives category) until M9-M11. Carry two at most (in hand and planted together). Hold X 1.5 s by the hut (within 2.5 m of its walls) to put one on its wall, or anywhere with the detonator in hand. The detonator is a weapon slot (RB / LB) while charges are out or in hand; RT sets off every planted charge. A blast is 9 m: 220 damage at the centre to zombies and the witch, 120 to you (armour first), 25% at the edge; zombies within 160 m hear it, and so does she. | `config.explosives`, `config.weapons.detonator` |
| 125 | The hut and the charges. | Two charges on the hut set off together destroy it; one alone shakes it ("It takes two charges, set off together"). **Aaron (step 4 test): planting charges on the hut doesn't bring her out; she stays inside until both go off.** Destroying it starts the final battle. | `ai/Witch.js` |
| 126 | The final battle's start (step 5). | Destroying the hut starts it, wherever she is (she rises out of the wreck). A 3.2 s placeholder cutscene: letterbox bars, a red flash, your controls locked while the camera turns to the wreck and she claws up out of it (2.6 s). The real cutscene comes with M8's cutscene system. | `config.finalBattle.introSeconds`, `riseSeconds` |
| 127 | The blood night. | Day jumps to night (Aaron), then the clock freezes until it's over. The sky, fog and light bleed red over 3 s; embers rise and ash falls round you. Zombie marches and the station's attacks carry on in real time (Aaron agreed), so a weak station can still fall. No forecast panel for it. | `config.finalBattle.sky`, `bloodRampSeconds` |
| 128 | No escape. | A ring of green witchfire round the hut clearing (1.15 x its radius, at least 22 m) holds you and her inside. The hut's approach traps inside it stay. | `config.finalBattle.ringScale`, `ringMin` |
| 129 | Her final-battle attacks. | **Aaron (Session 9): the same new pattern as #116**, with hexes every 4.5 s, a 12 m/s rush and 40-damage swipes. She keeps 4 m inside the witchfire ring (at 30 m she got caught in the trees at its edge). Before: No fleeing and she always knows where you are (hiding doesn't work). Hexes every 1.8 s (was 2.6); swipes 40 damage with a 0.3 s wind-up (was 30, 0.4); she rushes you after 1 s standing still (was 1.5); 3-5 zombies every 25 s (was 3-4 every 60 s); every 6 s she lays two traps (55% snares, the rest totems) 4-9 m round you. Her wounds carry in. | `config.finalBattle.attack`, `trapEvery` |
| 130 | Quitting mid-battle. | **Aaron (Session 9): destroying the hut deletes the save**, a true point of no return; nothing saves again that run. When the second charge goes on the hut, a radio call from Junie ("Are you sure you're ready? ... she's got nowhere left to run"), then 5 s later a pop-up that pauses the game: once you set them off, the final battle begins and you can't reload from dawn (A / Enter closes it). Placeholder lines. | `Game.js` (`pastNoReturn`), `ui/NoReturnNotice.js`, `data/ending.json` `noReturn`, `config.ending.noReturnDelay`, `noReturnRadioSeconds` |
| 131 | The ending (step 6). | Placeholder text cards until M8's cutscene system: two trail-cam cards (the dead falling, Ground Zero going dark), a dawn card, three closing lines (Junie, Ellen, Wyatt), then the run summary. In the world first: she writhes in her witchfire and bursts apart, every zombie collapses, the red drains away (4 s before the cards). The lines are placeholders in `data/ending.json` for the Narrative Designer and Aaron. | `config.ending`, `data/ending.json` |
| 132 | Defeat. | The screen fades to black over 2.5 s with bursts of radio static; then "[static]" and three lines calling Tom (Ellen, Junie, Wyatt); then the summary ("YOU DIED" or "THE STATION FELL" with the reason). The save is deleted. | `config.ending`, `data/ending.json` |
| 133 | The run summary. | Nights survived, zombies killed, sigils dug up, sigils she planted, rituals you broke, times you fought her, damage dealt to her (overkill not counted), time played. Kept in the save. A starts a new run (M12 brings the main menu and achievements). | `core/runStats.js` |
| 134 | What the save holds now. | Added in M7: her health and every trap still out, charges carried and planted, the run stats. Old saves load (the new parts start fresh); no version bump. Not saved: the hut (it can't be destroyed before a dawn save: the final battle freezes the clock) and her plan (she's home at dawn). | `core/saveData.js`, `Witch.saveState()`, `Explosives.saveState()` |
| 111 | Leaving the hut. | **Done (step 4):** she comes out of the hut's door at dusk and goes back in by it. | `ai/Witch.js` |

## Session 7 (M6, Lead Engineer)

Agreed with Aaron before building: about **two thirds of each night's zombies march on the station** (so meeting them on the pathways is worth it: you're protecting the base); "away" means **beyond 150 m** from the station; the alarm at **50% of the security at dusk**; the forecast as **a dusk panel plus a ledger tab**; a **"Continue / New run"** screen when a save exists; **drop the 64-zombie ceiling**. He'll balance 15 zombies against the fence (and against his rifle) in play-tests.

| # | Question | What M6 does now | Where to change it |
| --- | --- | --- | --- |
| 89 | Tier distances and budgets. | Active within 60 m (at most 25, the nearest), nearby to 150 m (every 3rd frame), abstract beyond (about once a second, on the pathways, no collision). 8 m of hysteresis. At most 160 sprites drawn. | `config.zombies.lod` |
| 90 | How many zombies can the map hold? | **Aaron: drop the 64 cap.** The pool grows 32 at a time up to 480 (a safety net). The sigils' caps (6 each) still decide how many a night raises, until the marches (step 2). | `config.zombies.population` |
| 91 | Can the far sigils' zombies reach home in one night? | Measured on 40 seeds (pathway distance to home): the farthest sigil ground is 840-1770 m (median 1390), the hut 1260-1810 m; the nearest ground is 140-1230 m (median 610). A level 1 zombie walks about 2.7 m/s; a night is 360 s, so at real speed the far ones can't. **Aaron: fine to march faster out of sight.** Marchers walk at full pace, ×2.5 while abstract: a typical far level 1 group arrives around 4am. | `config.zombies.lod.abstractMarchScale` |
| 92 | **Aaron's idea:** revisiting a cleared encounter. | **Aaron: night only.** Encounters only (not plain clearings or sigil grounds). 4-5 zombies of the clearing's mix, spawned as you come within 130 m (having been 150 m away), hanging about the clearing; once per clearing per night. The campsite next to home counts too. | `config.revisits` |
| 93 | How big are the night's groups, and how many? | Each raising is a single wanderer or a whole group (4 / 5 / 6 / 8 / 10 by level, rising together); about 2/3 of zombies march. At most 12-20 zombies per sigil per night by level, so level 1 (one sigil) sends about 2 groups of 4 and level 5 about 10 groups of 10 plus hordes. **To tune in play-tests** (Aaron: 15 zombies tear through a fence, and he tears through 15). | `config.sigils.marchShare`, `marchGroupSize`, `nightQuota` |
| 95 | Danger numbers. | Each sigil: its night quota × ⅔ marchers × the share that arrives before dawn (from its pathway distance) × 2 per zombie × the level's defenceDamage. Night 2 (one sigil, level 1) is about 10-20 against a fresh station's 25. **To tune in play-tests.** | `config.danger` |
| 96 | How an away night plays out. | Attack by attack, each resolved with the margin as it stands then. Damage per zombie 120 × defenceDamage × the band's share (clean 5%, holds 50-15%, may fall 80%, overrun 100%); the night's fall chance (may fall 10-60%, overrun 60-95%) shared between its attacks. Turret 4 rounds and 2 zaps per zombie. | `config.nights.resolver` |
| 97 | The alarm and the forecast. | The alarm: once a night, below 50% of dusk security; a radio toast plus a banner with an arrow home while you're outside siege range. The forecast: a panel for 14 s at dusk (no buttons, so B still reloads) and a ledger tab. | `config.nights` |
| 98 | **Aaron:** attacks while away shouldn't land in a second, and a horde should take an evening to pull the fence down. | Fence segment 500, gate 750, barricade 375 (were 200 / 300 / 150). An attack lasts until dawn at 0.45 per zombie per second × band × defenceDamage: a horde of 13 at level 1 takes a panel in about 4-5 night hours; at level 5 with a hopeless margin about 1 hour, and the doors (300) follow quickly. Away, the turret kills one attacker per 4 rounds. Radio: "will hold tonight" or "isn't going to last the night". Coming home mid-attack lets you fight them. **Aaron (play-test): balanced well; doors stay at 300.** | `config.station.fence`, `config.nights.resolver` |
| 99 | **Aaron:** sigil grounds spread over the map; the Car Armory in the north. | Always 5 grounds: 2 north, 2 middle, 1 south. The Car Armory's band is north (the turret matters for travelling). Aliens stay south and Bigfoot in the middle, as they were. | `config.map.sigilGrounds.perBand`, `data/encounters.json` |
| 100 | **Aaron:** death should start a new game. | A on the death screen reloads on a fresh map (M12 adds the run summary and save deletion). | `Game` (`run:newRequested`) |
| 101 | **Aaron's idea:** a Divorced Dad modifier. | Logged in DESIGN.md "Modifiers and achievements": no family and no compound, pure exploration. Unlocked by a new achievement, Custody Lost (lose the station several times across runs; the count and the name are placeholders). Not built; for M12. | DESIGN.md |
| 102 | What the dawn save leaves out. | **Resolved (Aaron, Session 8): fine not to save zombies.** Zombies (dawn sinks most; stragglers are lost), pickups on the ground, and the random streams (a continued run rolls differently). DESIGN.md lists "enemies" in the save: worth it only if stragglers matter. Save and quit from a pause menu waits for the pause menu (M12). | `core/saveData.js` |
| 103 | **Aaron:** hiding off the path. | Crouched, torch off, in the brush: seen from at most 6 m (day or night, any level); pursuit still ×1.7. A placeholder HIDDEN marker. | `config.detection.hidden` |
| 104 | **Aaron:** the forecast read 268 danger for a five-sigil night a 150 station survived. | Danger no longer multiplies by the level's defenceDamage (now about 134). Attacks roll for their whole group. Away zaps 0.1 per zombie per second; the turret kills one per 10 rounds. A built station with a turret on fast now survives five sigils with a couple of panels down; a bare one falls. **To tune in M14.** | `config.danger`, `config.nights.resolver` |
| 94 | Zombies stuck on cars and rocks. | A zombie on its way somewhere (not chasing) that barely moves for 0.8 s detours 4 m to one side (further each retry, then the other side). Chasing zombies still only slide. | `config.zombies.unstick` |

## Session 6b (M5 part 2, Gameplay Programmer)

Agreed with Aaron before building: **four vehicle types** (car, pickup truck, police car, army truck; special one-off vehicles may come with later scenes); **about 45 a map**; **about 60% with a battery**; pulling a battery is **just a noise**; **pulling the battery kills the alarm**; vehicles on the maps **if it doesn't crowd them**; the hold times as proposed; the debug battery stays. His M5 part 1 night-defence verdict: great gameplay, no fps drop, prices pretty balanced so far.

| # | Question | What M5 part 2 does now | Where to change it |
| --- | --- | --- | --- |
| 80 | Where exactly do vehicles go? | Verge cars every ~85 m along the pathways (85% chance each, 20% nosed into the trees); roadblock rows at roadside clearings (3-5) and checkpoints (2-3, mostly army); 2-3 at the gas station; 2-3 army trucks in a row at the outpost; one sure car at the campsite; elsewhere a 35% chance of one. 35-59 a map. | `data/vehicles.json` `placement`, `config.vehicles.placement` |
| 81 | What's in them? | Per type and spot (`loot` in `vehicles.json`): cars mostly scrap with a little of everything; pickups lots of scrap (4-9 in the bed) and shells; police cars pistol rounds, shells, vests, kits; army trucks rifle rounds, helmets, scrap. A search can turn up nothing ("Nothing useful"). Loot you can't carry is left on the ground. | `data/vehicles.json` |
| 82 | The campsite's car. | The campsite (every run, next to home) always has one car with a battery and no alarm: an easy first battery for the fence. | `placement.campsite` |
| 83 | Car alarms (not in DESIGN.md; Aaron: "pulling the battery would kill the alarm"). | **Every police car** (Aaron), which also always has a battery so the alarm can ring; 25% of other vehicles with a battery. Opening the door or the boot, or **shooting it** (Aaron's test: he expected a shot to set one off), sets it off: a two-tone wail, flashing lamps, and every zombie within 65 m comes, every 2 s, until the battery is pulled. Lifting the bonnet doesn't set it off, so you can pull a battery first to be safe (if you know). | `config.vehicles.alarmChance`, `alarm` |
| 84 | What if you don't stop an alarm? | After 60 s it runs the battery flat: the battery's gone ("The battery's flat: the alarm drained it"). Keeps the alarm urgent. | `config.vehicles.alarm.seconds` |
| 85 | How loud is pulling a battery? | A 22 m alert (the rifle is 70 m, the shotgun 55 m). | `config.vehicles.batteryNoise` |
| 86 | When does a vehicle show on the maps? | Once you've been within 40 m (not just revealed by the fog), as a small steel-blue oblong turned to its heading; grey once it's emptied (searched, bonnet up, no battery). | `config.vehicles.seenDistance`, `map` |
| 87 | Do vehicles block shots? | Yes: they're solid cover for you and the zombies alike, and the torch's glare dims on them up close. | `Vehicles.buildColliders()` |
| 88 | The turret's pad (Aaron: could it reach every panel?). | Moved to 3 m east, 17 m south of the fence's centre so the cabin no longer hides the east end; range 45 m. It rests facing the gate. | `config.station.layout.turretPad`, `config.station.turret` |

## Session 6 (M5 part 1, Gameplay Programmer)

Agreed with Aaron before building: **12 fence segments plus an automatic gate**; the turret comes from the **debug menu** until the Car Armory (M11); **barricades, spike traps and floodlights** go in now, as a way to spend spare scrap; runs start with the **east fence torn up, a little scrap and no charge**; **no carry limit and no slowdown** for batteries; prices are placeholders for the play-test; the **turret's rounds go through crowds even more than the rifle's** ("make a bit of a spectacle"); vehicles and battery pulling can be split into a second session.

| # | Question | What M5 does now | Where to change it |
| --- | --- | --- | --- |
| 66 | The compound's size and shape. | The fence is an arc of radius 28 m round a point 16 m south of the cliff, from the cliff on the west to the cliff on the east (about 235° of arc, 111 m of fence plus a 4.5 m gate due south). The cabin (12 x 8 m) stands in the middle, the tower 11 m east of the centre. **The home clearing grew from 38 to 42 m** so there's cleared ground outside the fence: every seed's map changes a little. | `config.station.layout`, `config.map.home.radius` |
| 67 | Health of each defence, and how hard zombies hit them. | **M6 (Aaron): fence segment 500, gate 750, barricade 375**; door 300 (600 reinforced). A swipe does the zombie's damage (10, a mutant's 30) × the level's `defenceDamage` (1-2). A level 1 citizen takes about 25 s alone to break a segment. | `config.station.fence`, `doors`, `siege.strikeScale` |
| 68 | How the electric fence "damages and slows". | Each swipe at a charged fence or gate zaps the zombie: 15 damage and a 0.9 s stun (the slow), at most once a second each, costing 1.5 charge. | `config.station.power` |
| 69 | Charge numbers. | A battery adds 100 (max 300). It drains 40 a night (spread over the night), plus 4 per floodlight, 1.5 per zap and 0.05 per turret shot. The fence's security is 20 at 100 charge or more. | `config.station.power`, `security.fenceCharge` |
| 70 | Security values the table doesn't give. | Each fence segment and the gate count as a wall segment (2 each, 26 for the lot); a plain door is 2, reinforced 5; electric charge up to 20. Turret, spikes (3) and floodlights (4) as in the table. A fresh run is about 25. | `config.station.security` |
| 71 | Prices. | Whole fence segment repair 12 scrap (part repairs pay their share), gate 16, door 15, barricade 15, reinforce a door 30, spike trap 20 (rebuild 10), floodlight 25. Runs start with 30 scrap. | `config.station.costs`, `config.inventory.startScrap` |
| 72 | What the buyable defences do. | **Barricade:** a second wall just inside a segment (150 health); zombies have to break both. **Spike trap:** outside a segment; 12 damage and a 0.8 s slow to each zombie on it, 15 bites before it wears out. **Floodlight:** on a pole on 4 fixed segments; at night, while there's charge, it lights a pool outside the fence (zombies in it are lit up) and adds 4 security. Fixed slots; no free placement. | `config.station.spikes`, `floodlight`, `layout.floodSegments` |
| 73 | Turret targeting and "spectacle". | It shoots zombies inside the fence first, then any clawing at the defences, then the nearest, within 42 m and in sight. Each round goes through up to 7 zombies keeping 90% each time (the rifle: 4 and 75%), with a heavy tracer, flash and report that brings zombies within 50 m. Turns at 200°/s. | `config.station.turret` |
| 74 | How the turret is loaded. | **Aaron (M5 test): from a menu.** Holding X at the turret opens its menu: load 1, 5 or all of each ammo type, with the turret rounds each gives; set the fire mode there too. | `config.station.turret.menuAmounts` |
| 75 | How the gate and doors open. | They open themselves when you're close (gate 3.5 m, doors 1.8 m) and close behind you. While open, zombies can get through, so don't hold the gate open with a horde outside. | `config.station.fence.gateOpenDistance`, `doors.openDistance` |
| 76 | The lookout tower. | Hold X at the ladder to climb (1 s): you're on the 9 m platform, the map is revealed for 260 m round it, and zombies below can't reach you. Hold X again to climb down. | `config.station.layout.tower` |
| 77 | What ends the run at home. | A zombie inside the comms room: "The station fell" (a placeholder; M7 builds the real defeat screen). The debug menu can turn this off. | `config.station.siege.overrun` |
| 79 | What do zombies at the station go for? | **Aaron (M5 test): whichever is nearest.** A chasing zombie goes for you or the defence between it and the family, whichever is nearer. Zombies that haven't noticed you go for the family (the comms room). | `EnemyManager.routeAtStation()` |
| 78 | Does the ledger pause the clock? | No (DESIGN.md). While it's open your controls go to the book; the world carries on. | `config.ledger.pausesClock` (stops the clock only; zombies still move) |

## Session 5 (M4, AI Programmer)

Agreed with Aaron before building: the placeholder 3D mutant; sigil grounds get only what matters for play now; a stand-in plants the sigils until the witch (M7); the loot plan (pistol ammo kept for the pistol, miners wait for the mineshaft); the map screen pauses the game (#39).

| # | Question | What M4 does now | Where to change it |
| --- | --- | --- | --- |
| 51 | How many zombies does a sigil raise, and how often? (DESIGN.md: "a spawn timer" and "a per-sigil cap".) | Every 18-36 s at night, up to 6 living zombies of its own, then it waits until one dies. A horde counts toward the 6 but can overshoot it. Sigils on sigil grounds raise every 11-22 s. Only at night (not dusk or dawn). | `config.sigils.spawnInterval`, `perSigilCap`, `groundSpawnMultiplier`, `spawnPhases` |
| 52 | How fast does the stand-in witch plant? | One sigil per dusk from night 2, up to five, so the level climbs by one a night unless you dig them up. Night 1 stays safe. M7 replaces this with the real witch. | `config.planter.perNight`, `firstNight` |
| 53 | Does a level change affect zombies already walking about? | Yes for speed (each zombie keeps its roll inside the level's range), damage and notice range: digging a sigil up slows the whole night down at once. Health is set when a zombie rises and stays. Hordes and mutants keep their own slow speeds at every level. | `src/ai/EnemyManager.js` `setLevel()` |
| 54 | Detection numbers. | Sight at night 13 m (standing, torch off), by day 38 m; torch ×2.3 at night; crouched ×0.45; sprinting ×1.2; in the brush ×0.75; behind a zombie ×0.55; once chasing, ×1.7. Footsteps heard at 6 m walking, 18 m sprinting, never crouched. Always noticed within 2.5 m. Each level multiplies all of it (×1 to ×1.4). | `config.detection` |
| 55 | Do trees block a zombie's view? | No: only the hills do (88,000 trunks are too many to ray-test cheaply). Standing in the brush counts as cover (×0.75). | `config.detection.undergrowth` |
| 56 | How far does gunfire carry? | Rifle 70 m, shotgun 55 m, shovel 4 m. Every zombie in range comes for you for 8 s (×the level's notice). | `config.weapons.*.noise`, `config.detection.gunfireMemory` |
| 57 | How are pickups collected? | Walk over them (no button), Doom-style. Armour is added on the spot; a full bar or a full kit bag (9) leaves the pickup lying for later. They vanish after 15 minutes. | `config.pickups` |
| 58 | Digging details. | 4 s of holding X within 2.2 m. Letting go pauses the dig; stepping away starts it over; taking damage loses the progress (DESIGN.md: "interrupts"). You can still look, move and shoot while digging. | `config.digging`, `src/player/Digging.js` |
| 59 | Dawn: how many zombies thin out? (DESIGN.md: "most ... a few stragglers".) | 85% sink back into the ground at random through the 60 s dawn, never within 25 m of you or while chasing you; 15% stay and wander the pathways by day. Stragglers can still notice you (sight is longer by day). | `config.zombies.dawn` |
| 60 | Mutant numbers. **Aaron (M4 test): felt like a bit of a bullet sponge. Decided: health stays; headshots on it do 4×, and a glowing red weak spot on its back does 8× (shots from behind, or a shovel swing from behind).** It also charges: 3 sprinting steps when it notices you, then 2 every 3 s while chasing (Aaron). Still open: should every zombie's headshot be 4× too (now 3×, #22)? | 300 health × level (360 at level 3: about 15 rifle body shots or 5 aimed headshots), 30 damage per swipe × level with a 0.9 s wind-up and 1.9 m reach, 0.36-0.48× sprint, 75% stagger and 80% knockback ignored. At most 4 at once. | `config.mutant` (`headshotMultiplier`, `weakSpot`) |
| 61 | How much tougher are police and army? | Police ×1.5 health (the vest), army ×1.6. Same speed and damage as citizens. | `config.zombies.variants` |
| 62 | Loot rates. | **Aaron (M4 test): far too much ammo; cut hard.** A kill now returns about 0.1 rifle rounds on average (army 20% for 1-2), so ammo runs down and looting matters. See `data/loot.json`: police drop a vest 35% of the time, army a helmet 35%. Citizens drop shotgun shells most often; DESIGN.md says "mostly ammo" without saying which. | `src/data/loot.json` |
| 63 | How fast do zombies wander? | 0.55× their own speed along the pathways; they speed up to full when they notice you, so a shambling zombie suddenly coming at you reads as "it's seen me". | `config.zombies.wander.pace` |
| 64 | Night 1 has no sigils. Is there a "level 0"? | No: with no sigils the level is 1 (stragglers and debug spawns use level 1 numbers), but nothing is raised. | `src/ai/zombieLevels.js` `levelForSigils()` |
| 65 | Where off-path sigils go. | 6-16 m off a pathway into the forest, at least 70 m from another sigil and 160 m from home. Their zombies use the nearest clearing's variant mix. | `config.planter` |

## Session 4 (M3, Lead Engineer)

| # | Question | What M3 does now | Where to change it |
| --- | --- | --- | --- |
| 35 | How big is the map? | **Decided with Aaron:** 1 km wide, 1.4 km north to south; after the M3 test: "a really good size map for the game". About 5 minutes' walk from home to the hut, 2 between neighbouring clearings. | `config.map.width`, `depth` |
| 36 | Off-path forest: slow or blocked? | **Decided with Aaron:** never blocked; the slowdown "feels appropriate" (M3 test), with more bushes to show it ("I like to give the option"). Undergrowth everywhere off the pathways slows you to 0.55× (walk 2.5 m/s, sprint 4.0). Zombies push through at 0.75× (my pick), so cutting through while chased costs you. | `config.player.undergrowthMultiplier`, `config.zombies.undergrowthMultiplier` |
| 37 | What's at the east, west and south edges? (The doc only describes the cliff.) | **Resolved (Aaron):** fine as plain forest. An invisible line 60 m inside dense forest; the forest carries on beyond it and the fog hides the rest. Could become a river, a ravine, a fence or more cliff. | `config.map.edgeMargin` |
| 38 | Flat or rolling ground? | **Decided with Aaron:** gentle rolling hills ("I would be thrilled"): about ±5 m, levelled in clearings, smoothed along pathways. | `config.terrain.octaves` |
| 39 | Does the map screen pause the game? | **Resolved (Aaron, M4): yes, it pauses the game.** Movement, firing, zombies and now the clock all stop while it's open. | `src/core/Game.js` `update()` |
| 40 | Minimap orientation. | Turns with you (the way you face is up) with an N marker on the rim; the full map is north up. | `src/ui/Minimap.js` |
| 41 | What do you see on the map? | Revealed terrain and pathways; a marker on every clearing whose centre you've seen; names on the full map (not for plain clearings); living zombies in revealed areas. Reveal radius 45 m. | `config.fogOfWar.revealRadius` |
| 42 | Encounter placement hints. | Not yet honoured: gas station "on a road edge" (there are no roads), mineshaft "hillside edge", stairs "off-path", Bigfoot cave "rocky clearing or path edge", crashed plane "off a pathway". Each sits anywhere in its band for now. The encounter sessions (M9-M11) can add rules. | `src/world/MapGenerator.js` `candidate()` |
| 43 | The outpost "2-3 paths from home". | A soft rule: if it lands elsewhere, it swaps places with a north clearing that is 2-3 pathways from home. If none fits, it stays and the map records a warning (none in 200 seeds tried). | `data/encounters.json` `hopsFromHome` |
| 44 | Plain clearings. | **Resolved (Aaron):** they stay empty ("the empty clearings almost add something to the game"). Home, the hut, the encounters (7-15 a run, about 12 typically) and sigil grounds (4-6) usually leave about 3 of the 22 clearings with nothing in them: they're plain clearings with just a type (bog, graveyard, etc.). Should they hold something (loot, a car, a trail camera)? | `data/encounters.json`, `config.map.clearingCount` |
| 45 | The hut "many edges away". | At least 4 pathways from home (5-11 in practice). | `config.map.hut.minHops` |
| 46 | Loops in the pathway graph. | Shortcuts are added (shortest first, 80% chance each) where walking round would be 1.8× longer; every north clearing is at most 2.5× its straight-line distance from home by pathway. | `config.map.edges` |
| 47 | Where does a run start? | Day 1 at 07:00, at home, facing south (Aaron). Supersedes #18's night start. M9 sets the real opening. | `config.clock.startPhase`, `World.spawn` |
| 48 | The Caller. | A radio event, not a place: rolled 0-2 per run and stored in `map.radioEvents` for M10. | `data/encounters.json` |
| 49 | Cliff height and look. | 26 m ± 8 m; trees on the plateau above for a skyline. The player can't see over it. | `config.map.cliff` |
| 50 | Clearing type look. | Types tint the map and name the signpost; their real look (bog fog, graveyard stones, cars) is for the encounter and style sessions. | `data/clearingTypes.json` |

## Session 3 (M2, Gameplay Programmer)

| # | Question | What M2 does now | Where to change it |
| --- | --- | --- | --- |
| 22 | How big is the headshot bonus? | **Decided with Aaron:** headshots are in, "×2 at least, open to ×3–4". M2 uses **×3**, so one aimed rifle headshot (75) kills a 60-health zombie. | `config.weapons.headshotMultiplier` |
| 23 | Which buttons switch weapons and use first aid? | **Decided with Aaron:** RB = next weapon, Y = previous, D-pad right = first aid (keyboard: 1–4 pick a slot, wheel = next, H = first aid). DESIGN.md "Controls" updated. | `config.input.gamepadBindings` |
| 24 | Healing at full health: what happens to queued kits? | DESIGN.md says leftovers are lost. M2 also drops any kits still queued when health reaches 100, and won't let you use a kit at full health (so you can't waste one by accident). | `src/player/Health.js` |
| 25 | Where does the shotgun come from in M2? | All three weapons from the start, so they can be compared. M9 moves the shotgun to the campsite (DESIGN.md). | `config.weapons.startingLoadout` |
| 26 | How hard do zombies hit? | 10 damage per swipe, 0.5 s wind-up (time to back off), 1.25 s between swipes. Five zombies round a player who stands still kill them in about 5 s; L1 zombies walk at 2.5–3.2 m/s, slower than your 4.5 m/s walk, so you can back off and shoot. | `config.zombies.attack*` |
| 27 | Starting ammo. | Rifle 5 + 10 ("a handful"), shotgun 4 + 12. "Give ammo" in the debug menu adds 20 to each gun. | `config.weapons.*.startReserve` |
| 28 | Can you sprint while aiming or just after firing? | No: aiming (LT) and firing slow you to 0.6× and stop a sprint, so fast zombies make you choose between running and shooting (DESIGN.md "Movement"). | `src/player/Player.js` `updateMovement()` |
| 29 | Death in M2. | A "You died" screen with "A / Enter: try again", which resets health, armour, kits, ammo and position and removes all zombies. The real permadeath flow (defeat screen, run summary) is M7 and M12. | `src/combat/Combat.js` |
| 30 | Placeholder sounds. | **Aaron: yes, and note they'll be upgraded.** Every combat sound is synthesised on the fly (Web Audio); no files. **To be replaced in the audio pass (Session 29).** | `src/audio/Sfx.js` |
| 31 | Aim assist on the mouse? | Controller only. The mouse is never slowed. Toggle it in the debug menu to compare. | `config.aimAssist` |
| 32 | The in-hand weapons are unlit. | The torch sits right beside the gun, so real lighting blew it out. The placeholder shapes use baked shading, tinted each frame by the sky's ambient and sun/moon light plus a torch fill (after Aaron saw a black gun by day). The art pass should keep that approach (or a separate view-model light). | `src/player/ViewModel.js` |
| 34 | Do bullets go through zombies? | **Decided with Aaron:** yes, to carve through mobs. Rifle up to 4 zombies (75% damage kept after each), shotgun pellets 2 (50%). Not decided: whether the turret (M5) and pistol penetrate too; each weapon has its own `pierce`. | `config.weapons.*.pierce` |
| 33 | The overlay clock reads like minutes:seconds. | It's the in-game clock face (hours:minutes); one game minute at night is 0.6 real seconds, so it runs about 100× real time by design (#2). Aaron read "21:15" as a stopwatch. The final HUD (Session 28) shows "Night 1 · 21:15" in the top left, as DESIGN.md asks. | `config.clock.phases` |

## Session 2 (M1, Graphics Engineer)

| # | Question | What M1 does now | Where to change it |
| --- | --- | --- | --- |
| 14 | How bright should the flashlight be, and how dark the night? | Aaron's M1 play-test: the torch is great, but it glared back from close trees and rocks; now fixed with close-range dimming (`config.flashlight.glare`). Torch 300 cd with decay 1.6 over 45 m. Night ambient 1.1, moonlight 0.9. Tuned from screenshots on a software renderer; needs a look on the tablet. | `config.flashlight`, `config.sky.keys` |
| 15 | Should sprint be hold or toggle? | Controller: click L3 once and you sprint until you stop moving or run out of stamina (common console behaviour). Keyboard: hold Shift. | `src/player/Player.js` `updateStance()` |
| 16 | Should jump work while crouched? | Pressing jump while crouched stands you up instead of jumping. Sprinting also stands you up. | `src/player/Player.js` |
| 17 | Head bob: wanted, and how much? | A subtle 3.5 cm bob that scales with speed. Set `amplitude: 0` to turn it off. | `config.player.headBob` |
| 18 | Where should a run start on the clock? | **Changed in M3** (#47): runs start by day at home. M1 started at night so the torch test needed no skipping. M9 sets the real start (#3). | `config.clock.startPhase` |
| 19 | Quality defaults for the tablet. | **Medium** by default: render scale 0.45–0.75 (dynamic), 80 m draw distance, torch shadow on at 512 px, post-processing and bloom on, no frame cap. **Low** turns off shadow and post and caps at 30 fps. Pick live from the debug menu. | `config.quality` |
| 20 | Frame cap on a 90 Hz screen. | No cap by default (the game runs at the display's 90 Hz when it can; dynamic resolution only aims for 60). A 60 cap on a 90 Hz screen would drop every third frame and judder, so try it from the debug menu before making it the default. | `config.quality.presets.*.frameCap` |
| 21 | The retro pixel filter, ground mist, height fog and particles (Quality settings and "Visual ambition" in DESIGN.md). | Not built in M1 (M1's scope is the renderer, sky, fog, torch, forest and movement). Belong in the style passes (M13 / session 10). | n/a |

## Session 1 (M0, Lead Engineer)

| # | Question | What M0 does now | Where to change it |
| --- | --- | --- | --- |
| 1 | The design doc was uploaded as `Witch Hunt — Game Dev Doc.md` in the repo root, but the doc and the brief both refer to `docs/DESIGN.md`. | Moved (git mv, content unchanged) to `docs/DESIGN.md`. | n/a |
| 2 | How do the phases map onto a clock face? The HUD shows a clock, and the forecast says things like "runs dry around 2am", but no hours are given. | Day 07:00–19:00, dusk 19:00–20:00, night 20:00–06:00, dawn 06:00–07:00. Time moves faster at night (10 h in 6 min) than by day (12 h in 8 min). | `config.clock.phases[].startHour` |
| 3 | When does the day number go up, and where does a run start? | Day N is followed by night N; the counter goes up when a new day phase begins. (The opening has Tom wake at dawn; M9 can set `startPhase: 'dawn'`.) | `config.clock.startDay`, `startPhase` |
| 4 | Which controller combos open the debug tools? | **Changed in M1.** Overlay: hold **View + Menu**. Debug menu: hold **View + D-pad down** (was L3 + R3, which now sprint and crouch). The first button is a modifier: while View is held, Menu and D-pad down don't fire pause or radio. View itself still fires `inventory` on press; when the inventory screen is built, it should open on release so it doesn't flash open during a combo. | `config.input.combos` |
| 5 | Keyboard key for the debug menu? | **`** (backquote). | `config.input.keyBindings.debugMenu` |
| 6 | Keys 1–4 select a weapon slot directly, while Y/RB cycle. Should slots exist? | All four keys fire `switchWeapon` for now; direct slot selection is for M2 to decide. | `config.input.keyBindings.switchWeapon` |
| 7 | What should happen when the controller disconnects mid-game? | A toast and the active device switches to keyboard/mouse. No auto-pause, because there's no pause menu yet. Should it auto-pause once one exists? | `src/core/Game.js` (`input:gamepadDisconnected`) |
| 8 | What happens when the player leaves fullscreen (Android back gesture, Esc)? | The game suspends (clock and movement stop) and shows "Tap to resume", which re-enters fullscreen. | `config.display.resumeScreenOnFullscreenExit` |
| 9 | Should the debug menu pause the clock? | No. It only blocks movement while open. | `src/core/Game.js` `update()` |
| 10 | Starting look and dead-zone values for the controller. | Move dead zone 0.15, look dead zone 0.12, outer 0.05, look 180°/s horizontal and 120°/s vertical at full tilt, response curve exponent 2, trigger threshold 0.3. Aaron: "walking around feels good" in the M0 play-test. | `config.input.gamepad` |
| 11 | Should the screen be kept awake? (Not in the doc.) | Yes, with the Screen Wake Lock API, because controller-only play never touches the screen. | `config.display.keepScreenAwake` |
| 12 | The doc says "a new map seed each run" but not how to force one for testing. | Random seed each load; `?seed=` in the URL overrides it; `config.rng.defaultSeed` can pin it. | `config.rng` |
| 13 | **Resolved (M1).** Billboards for all trees, or 3D near and billboards far? | Aaron chose **billboards for every tree**. DESIGN.md updated ("Visual ambition" and the "Assets" table). | `src/render/Forest.js` |
