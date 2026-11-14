# The dialogue cut (Nov 14)

Players said the in-game talk was too much (the cutscenes are fine). This is everything that changed in `src/data/dialogue.json`, so any of it can be put back.

- **In-game lines** (radio, face to face, and captions outside cutscenes): 6,983 words before, 2,811 after (**60% fewer**), and 453 lines down to 299. Cutscene lines are untouched.
- **A cut line is still in the file**, word for word, marked `"cut": true`. It's never said, and if it had a `"next"`, that line plays in its place. To bring one back, delete `"cut": true,` from it.
- **Every `hint.*` nudge is cut.** The objective text and the map marker already say where to go, and Ellen says it again if you hold X at her board.
- **Ellen and the map:** she says it once, early (`day1.map`, after Wyatt's line at the top of the tower), and her board answers (hold X: "ask Ellen what's next") now say "It's on your map" wherever the step has a place.
- **Her board** (`src/data/storyBoard.json`) has 8 new cards for the story after Earl's maps (the Keeper, the dozer, the zapper, the Blessing, the mega night, the core, the Armory files, Sheriff), and three cards say more (the field report, Marcy's journal, the ridge map). That's where the detail the cut lines carried now lives.
- Wyatt's tower barks: two now ("I've got the ones at the wire!" is cut, and out of `config.wyattTower.lines`).

## New lines (12)

- `day1.map` Ellen: "The campground's on your map, Tom. Anything we learn, I'll put on there."
- `board.zapperPrep` Ellen: "Fill the fence at the fence box first. Then we call it down."
- `board.zapperGo` Ellen: "We're ready, Tom. Fire the flares in the yard."
- `board.caveGo` Ellen: "It went to ground at the end of the old road. Take the dozer. It's on your map."
- `board.blessingBury` Ellen: "Bury it in the yard, Tom. I've marked the spot on your map."
- `board.quadFetch` Ellen: "Fetch the quad from where you left it. It's on your map."
- `board.ufoGo` Ellen: "The ship came down in the south. It's on your map."
- `board.coreFit` Ellen: "Fit the core to the fence box."
- `board.armoryGo` Ellen: "Somebody's still transmitting, south past the ship. It's on your map."
- `board.armoryIn` Ellen: "Their stores, their files, their cages. Careful, Tom."
- `board.uteHome` Ellen: "Bring him home, Tom."
- `board.afterSheriff` Ellen: "Sheriff's in the garage. Bring him scrap."

## Cut lines (166)

**plane**

- `plane.quick.wyatt` Wyatt: "Whoa. Dad, it didn't even get a shot off. It had the pilot's gun!"
- `plane.down.wyatt` Wyatt: "It's down. Dad, it was taking the plane apart. Like it wanted to know what shot it."
- `plane.sweep.wyatt` Wyatt: "Dad. By the wing. There's something there, and it's too small to be the pilot."
- `plane.left.ellen` Ellen: "It's gone. Tom? Talk to me."

**hint**

- `hint.planeLoot` Wyatt: "Dad, whatever that thing dropped is still lying there. Go and pick it up."
- `hint.scannerBattery` Wyatt: "Dad, the sheriff's car, just up the road. Pop its bonnet for Earl's scanner. And look inside it."
- `hint.gasInside` Wyatt: "Dad, check inside the store. Maybe they left something."
- `hint.gasLook` Wyatt: "Dad, have a look out front before you leave."
- `hint.phone` Wyatt: "Did you try their phone yet, Dad? It's on the counter."
- `hint.scanner` Ellen: "Tom, Earl's scanner. It's in the stockroom, out back behind the counter."
- `hint.note` Junie: "Dad, Mr Pruitt always left notes for Mrs Pruitt. Is there one in his office?"
- `hint.shovel` Ellen: "There's a spade stuck in the ground by Earl's track, Tom. Take it."
- `hint.shelter` Wyatt: "Earl's shelter is up the track behind his store, Dad. Through the pipe gate."
- `hint.shelterSigil` Ellen: "That glowing thing by the hatch, Tom. Dig it up, or they'll keep coming."
- `hint.keys` Wyatt: "Earl kept his keys on him, Dad. The combination's on them."
- `hint.hatch` Wyatt: "The hatch is under all that dirt, Dad. Dig it out with the shovel."
- `hint.room` Junie: "Dad, go down inside. Maybe they left something for us."
- `hint.tapes` Junie: "Dad, are you going to watch Earl's tape? Press down on the pad."
- `hint.homeStop` Junie: "Dad, are you coming home first? Mum says the fence needs fixing."
- `hint.safe` Wyatt: "You've got the combination, Dad. Earl's safe is in the stockroom at the gas station."
- `hint.outpost` Ellen: "The gap's past the Pruitts' family plot, Tom. Down the track from their farm."
- `hint.outpostRounds` Wyatt: "Dad, that machine gun nest. Check its ammo box."
- `hint.outpostBarricade` Wyatt: "The sandbags, Dad. That's where they were holding the line."
- `hint.outpostFight` Wyatt: "Dad, the generator by the tower and that machine gun both run off a car battery. Check the army trucks."
- `hint.outpostCompound` Ellen: "Have a look round the compound, Tom. Carefully. Whatever was in those crates, I want to know."
- `hint.outpostArmoury` Wyatt: "Check their lockers, Dad. Soldiers keep the good stuff locked up."
- `hint.outpostReport` Ellen: "Tom, if they left any paperwork in that hut, I want to see it."
- `hint.cross` Ellen: "The gate's open, Tom. Whatever's past it, we need to know."
- `hint.outpostScope` Wyatt: "Up the tower, Dad. Look through the scope."
- `hint.findJunie` Ellen: "Tom, the camera saw her torch go south, past the plane. Head south. Find her."
- `hint.churchLook` Ellen: "Tom, if you can hear me: there's an old church on Earl's maps, south and west of the plane. If anyone ever wrote down what's in those woods, it'd be there."
- `hint.planeCell` Wyatt: "The fence box, Dad, just inside the gate. See if that alien thing fits."
- `hint.planeCellBack` Ellen: "The plane, Tom, just past the checkpoint. Whatever that creature dropped is still lying by it."
- `hint.earlMaps` Wyatt: "Earl's shelter, Dad, behind his store. The maps are on the corkboard down there."
- `hint.dozerFind` Ellen: "Follow the fence line east from the checkpoint, Tom. Where the cut stops, that's where they left it."
- `hint.caveGo` Wyatt: "The end of the old road, Dad, north of Earl's store. Take the dozer. That brush won't shift for anything else."
- `hint.megaHome` Wyatt: "Dad, where are you? They're at the wire! Get home!"
- `hint.ufoGo` Ellen: "South, Tom. Past the church, past the stairs. It left a scar in the trees you could see from the tower."
- `hint.armoryGo` Ellen: "South-east of the ship, Tom. Earl's scanner says the signal hasn't moved in days."
- `hint.uteGo` Sheriff: "The truck, friend. Under the roof by the gate."

**day1**

- `day1.04` Junie: "Their fire's out. I saw the smoke over the trees last night, from my window. It's gone now."
- `day1.06` Ellen: "Play it, Tom. Whatever they saw, I need to know."
- `day1.09` Wyatt: "They didn't stop when you hit them. They just kept coming until they couldn't."
- `day1.11` Wyatt: "Nice work, Dad. You can patch the fence from the ledger too. It's on the desk in the comms room."
- `day1.12` Wyatt: "That battery goes in the fence box by the gate. It'll put charge back in the wire."
- `day1.15` Ellen: "This is how we stay alive. Left side is what we've got: fence, doors, charge. Right side is what's coming. Keep the left side bigger."
- `day1.night.tower` Ellen: "Or get up the tower and take the rifle, Tom. You can pick them off from up there."
- `day1.night.tower.have` Ellen: "Or get up the tower with that rifle, Tom. You can pick them off from up there."
- `day1.rifle.turkey` Wyatt: "Sorry, Dad. I left it up there. There was a turkey out past the fence yesterday. A big one. I missed."
- `day1.night.shotgun` Wyatt: "Meet them at the fence, Dad. Up close. The wire holds them still for you."
- `day1.night.wave2` Wyatt: "More of them, Dad. Coming at the {where} fence."
- `day1.night.wave3` Ellen: "Three more, from the {where}. That looks like the last of them."
- `day1.night.feed` Ellen: "Tom, one of the trail cams just tripped. It's live. I'm putting it through to you. Watch it when you can."
- `day1.night.after1` Wyatt: "She buried something out on Pruitt land, Dad. Right by their storm shelter."
- `day1.night.clear` Wyatt: "That's all of them. The fence held, Dad."
- `day1.nudge.tower` Wyatt: "The tower's out by the east fence, Dad. The ladder's on the south side."
- `day1.nudge.campsite` Junie: "The campground's out the gate and down the west trail, Dad. It's on your map."
- `day1.nudge.battery` Wyatt: "Dad, the fence box is dead. Their car's still got a battery in it. Lift the bonnet."
- `day1.nudge.fit` Wyatt: "The fence box is just inside the gate, Dad. East side, on the fence."
- `day1.nudge.repair` Wyatt: "The east fence is still down, Dad. The ledger's on the desk. They'll walk right in tonight."
- `day1.prompt.sprint` Wyatt: "It's a fair way to the campground, Dad. You'll get there quicker if you run."
- `day1.wreck.wyatt` Wyatt: "Dad, that car on the trail. The windows are smashed in. Is that blood?"
- `day1.wreck.ellen` Ellen: "Something bad's happened out there, Tom. If it came from the campground, be careful."
- `day1.prompt.torch` Wyatt: "It's pitch black out there, Dad. Get your flashlight on."
- `day1.nudge.family` Junie: "Dad? Can you come inside for a minute?"

**gas**

- `gas.mutant.after` Ellen: "Tom? Tom, what was that? That wasn't like the others."
- `gas.phone.radio` Ellen: "Earl keeps a scanner in his stockroom, Tom, out back. See if it picks anything up."
- `gas.scanner.wyatt` Wyatt: "Containers? Dad, what were they moving out there?"
- `gas.witch.junie` Junie: "The note said they went to the shelter. That's where the camera was."
- `gas.shovel` Ellen: "Earl's shelter is up the track behind his store, Tom. You'll want a shovel. If she's been burying things for weeks, we need to dig them up."
- `gas.shovel.have` Ellen: "Earl's shelter is up the track behind his store, Tom. Take your shovel. If she's been burying things for weeks, we need to dig them up."
- `gas.phone.hint` Ellen: "Tom, try the phone on their counter. If it works, we can call for help."

**shovel**

- `shovel.weapon` Wyatt: "And if you run out of rounds, that shovel's a weapon too, Dad. Just don't let them get close."

**shelter**

- `shelter.dug.wyattQuiet` Wyatt: "That glow's gone, Dad. Whatever that thing was, it's dead now."
- `shelter.keys.wyatt` Wyatt: "His keys? There's a brass tag on them, Dad. Numbers. That's the combination for the safe."
- `shelter.keys.ellen` Ellen: "Then his rifle's ours. I'm sorry, Earl. We'll put it to good use."
- `shelter.openFirst` Wyatt: "Dad, that glowing thing's still in the ground. They'll keep coming while it's there."
- `shelter.below.junie` Junie: "Dad? Are Earl's kids down there?"
- `shelter.below.ellen` Ellen: "No, honey. Nobody's here. Maybe they got away."
- `shelter.diary` Ellen: "He saw her coming for months, Tom. Bring that diary home."
- `shelter.tapes` Wyatt: "It was still in his VCR? Then it's off his trail cams, Dad. If his cameras caught her, I want to see."
- `shelter.plough` Wyatt: "Dad, don't get off. Go straight through them!"

**outpost**

- `outpost.call.wyatt` Wyatt: "The soldiers'll have rounds for Earl's rifle, Dad. Maybe they'll give you some."
- `outpost.call.home` Ellen: "And Tom, if it goes bad out there, you turn around and come home. Promise me."
- `outpost.lull1` Ellen: "More uniforms. Tom, those are the checkpoint's own men."
- `outpost.lull2` Wyatt: "Mum, if the soldiers are all dead... who's guarding the fence?"
- `outpost.lull2b` Ellen: "Nobody, love. Nobody is."
- `outpost.tower` Wyatt: "Dad, the rounds! Check that machine gun nest by the road before you go any closer."
- `outpost.rounds` Wyatt: "They're not for the big gun, they're for a rifle like Earl's! Load up, Dad."
- `outpost.peak` Wyatt: "Dad! Behind the sandbags! There's dozens of them!"
- `outpost.justUs` Ellen: "Nobody's coming, Tom. It's just us now."
- `outpost.passed.junie` Junie: "She didn't see you."
- `outpost.passed.ellen` Ellen: "That's how she gets to us. Straight through their checkpoint."
- `outpost.arrive.east` Wyatt: "There. That's the hole. Dad, the lights are on in there and nobody's moving."
- `outpost.cleared.wyatt` Wyatt: "The checkpoint's open, Dad. Everything past it, nobody's ever told us about."
- `outpost.report` Ellen: "Bring that report home, Tom. I want to read every word of it."
- `outpost.dogfight.after` Ellen: "They both came down past the cordon, Tom. The plane's not far. If anyone's alive in it... look for the smoke."
- `outpost.gunPitAsk` Wyatt: "Dad, there's a machine gun nest by the road. See if that gun takes the same bullets as Earl's rifle."
- `outpost.crates.burst` Wyatt: "Dad, the other crates! They're all breaking open!"
- `outpost.beetle.hint` Wyatt: "The shell's like armour, Dad! Go for its face, the glowing bit!"
- `outpost.beetles.done` Ellen: "Beetles the size of dogs, Tom. In crates, with labels on. They knew about all of it."
- `outpost.c7.wyatt` Wyatt: "Dad... something tore that open from the inside. Look how high those marks go."
- `outpost.c7.ellen` Ellen: "Whatever they had in there was bigger than anything I ever saw. And it's out, Tom."
- `outpost.resin.wyatt` Wyatt: "What's in that yellow block, Dad? Is that... a body?"
- `outpost.scope` Wyatt: "Dad, before you go through, get up that watchtower and have a look through Earl's scope. See what you can see out there."
- `outpost.turret.on` Wyatt: "It's alive! Dad, the gun's shooting them on its own!"
- `outpost.floods.hint` Wyatt: "Dad, there's a generator at the bottom of that tower. Get a battery in it and those floodlights will come on."
- `outpost.floods.on` Wyatt: "Whoa, the lights are on! Now you'll see them coming, Dad."
- `outpost.turret.hint` Wyatt: "Dad, that big gun's just dead, not broken. A car battery might wake it up."

**night2**

- `night2.prep.ellen` Ellen: "The board's bad tonight. Battery in the fence box, your scrap into the fence. Then take Earl's rifle up to Wyatt."
- `night2.prep.wyatt` Wyatt: "I'm up the tower, Dad. Bring Earl's lever gun up when you're set."
- `night2.hand.ellen` Ellen: "Here they come. Hold the wire, both of you."
- `night2.horde.wyatt` Wyatt: "Dad! The campground trail! There's a whole crowd of them!"
- `night2.mutant.wyatt` Wyatt: "Another one! South-west, coming fast!"
- `night2.screamer.junie` Junie: "Mum? What's that sound?"
- `night2.screamer.down` Wyatt: "It's down! It's stopped screaming!"
- `night2.after.ellen` Ellen: "That's the last of them. She did that, Tom. She sent all of that at us."

**wyatt**

- `wyatt.tower.3` Wyatt: "I've got the ones at the wire!"

**farm**

- `farm.arrive.wyatt` Wyatt: "The porch light's on. Dad, somebody left the porch light on."
- `farm.moths.wake` Wyatt: "They're coming off the wall! Dad!"
- `farm.journal.wyatt` Wyatt: "Her truck never came back, Dad."
- `farm.shotgun.wyatt` Wyatt: "Earl's twelve-gauge. He'd want you to have it, Dad. Up close, nothing stays standing."
- `farm.plot.wyatt` Wyatt: "More of them, Dad! They're coming to that thing's glow!"

**witch**

- `witch.escape.quad` Wyatt: "Dad, the quad! Get on it and get out of there!"
- `witch.gone.outpost` Wyatt: "She's gone, Dad. You can go back to the checkpoint now."

**mutant**

- `mutant.hint.head` Wyatt: "It's not going down! Its head, Dad, go for its head!"
- `mutant.hint.back` Wyatt: "Dad, its back! Something's glowing on its back!"

**home**

- `home.stop.ledger` Ellen: "Good, you're back. The ledger's on the desk in the comms room. Put what scrap you've got into the fence before you go."
- `home.stop.battery` Ellen: "Good, you're back. Put that battery in the fence box, and the ledger's on the desk if you've got scrap for the fence."
- `home.cell.wyatt` Wyatt: "The fence box takes anything with a charge in it, Dad. Try it."

**junie**

- `junie.after.2` Wyatt: "Her torch went south, Dad. Past the plane. That's where it took her."
- `junie.face.wyatt.2` Wyatt: "Especially if it's you calling."
- `junie.face.wyatt.3` Wyatt: "She'd have noticed something was wrong. She always notices. She said your voice sounded tired. I told her to shush."
- `junie.face.ellen.2` Ellen: "Nine years old, Tom. Out there with it. Don't come back without her. And come back."

**capsule**

- `capsule.ellen.2` Ellen: "Eleven of them, one night, and they never got one back. You'll be the first. You have to be."
- `capsule.wyatt.2` Wyatt: "Amos Pruitt. Like Earl. They've been here a hundred years, and it got them both."

**walk**

- `walk.1` Junie: "Don't walk too fast. Don't let go."
- `walk.4` Junie: "Is Wyatt cross with me? I went to your voice. I'm sorry."
- `walk.5` Junie: "I'm tired, Dad. Are we nearly there?"

**plan**

- `plan.1` Ellen: "Sit down, Tom. We've been through that account from the church three times while you were gone."
- `plan.maps.2` Wyatt: "Then why hasn't it helped? Unless it can't. That thing with the wings came out of the north the night it took you down, Dad. It's sitting on him."

**dozer**

- `dozer.camp.wyatt` Wyatt: "That's it, Dad. They just left it. The keys have to be somewhere in that camp."
- `dozer.taken.ellen` Ellen: "Slowly, Tom. Everything in these woods can hear that engine."

**zapper**

- `zapper.come.ellen` Ellen: "Get on that machine, Tom. Put the hook in it when it comes down at you."
- `zapper.miss.wyatt` Wyatt: "I can't hold it in the scope, Dad! It won't keep still! Get the cable on it!"

**mega**

- `mega.first.wyatt` Wyatt: "I can't count them, Dad. I've stopped counting."

**junieBack**

- `junieBack.face.wyatt` Wyatt: "Eleven people, a hundred years, and nobody came back. Then you went up and you did. I want to be like you when I'm older. Just so you know."

**milo**

- `milo.siege.ellen` Ellen: "Tom, whatever that is, it isn't on our side. Don't go near it."
- `milo.chatter.2` Milo: "No ticket? No ticket! Free tonight! Free every night!"
- `milo.chatter.3` Milo: "Mind the donkey. She doesn't forgive."
- `milo.chatter.4` Milo: "Hup! Hup-hup! Do you like my shoes? They're for the show."
- `milo.chatter.5` Milo: "The turkey's a critic. Don't take it personally. I do."

**cutting**

- `cutting.wyatt.1` Wyatt: "Every name on those stones had a ticket out, Dad. Charleston. They were nearly gone."

**sawmill**

- `sawmill.ellen.2` Ellen: "That thing stays outside, Tom. And whatever's on it, you clean it off before the kids see."

**holler**

- `holler.ellen.2` Ellen: "Where did a family up a holler get a thing like that? No. Don't tell me. Just keep it pointed away from the house."

**mine**

- `mine.wyatt.tags` Wyatt: "Eleven tags still up? Dad, that's what the board's for. Eleven men went down and nobody came back for their tag."
- `mine.wyatt.battery` Wyatt: "You're running a mine hoist off a car battery. That's the best and the worst idea you've ever had."
- `mine.wyatt.out` Wyatt: "Was that the mine? Dad. Did you blow up a mine?"
- `mine.ellen.2` Ellen: "So that's one door shut. I don't know how many there are. But that one's shut, and you shut it."
- `mine.junie.1` Junie: "You smell like a bonfire. Did the big moths get out? I hope the big moths got out."

**tip**

- `tip.fence` Junie: "When the fence is on they just stand at it and get hurt. They don't learn. Is that sad?"
- `tip.dawn` Junie: "When it got light they all just went back in the ground. Mum wrote it down twice."
- `tip.tower` Junie: "Wyatt can see the whole fence from the tower. He says shout if one gets behind you. He can't hear you, though."
- `tip.mothman` Junie: "The thing with the red eyes was on camera eight for one picture. Then it wasn't. It's really fast, Dad."
- `tip.helmets` Junie: "The soldier ones have helmets on. Wyatt says shoot them in the body, or wait till the helmet comes off."
- `tip.grey` Junie: "The little grey one bled green on the camera. It was scared of you, I think. I don't think it wanted to be here."


## Shortened lines (218)

**plane**

- `plane.drop.wyatt` Wyatt: ~~Dad, it dropped something. There, by the body. It's glowing. Don't leave it.~~ → "It dropped something, Dad. It's glowing."
- `plane.shootout.ellen` Ellen: ~~Tom, get down! It's behind the wing!~~ → "Get down, Tom!"
- `plane.sweep.ellen` Ellen: ~~That's not one of ours, Tom. Go slow. Don't let it see you first.~~ → "That's not one of ours, Tom. Go slow."
- `plane.flare.wyatt` Wyatt: ~~Dad, the pilot had a flare gun in his kit. Fire one. If anyone's out looking for that plane, they'll see it.~~ → "The pilot had a flare gun, Dad. Fire one."
- `plane.drivenOff.ellen` Ellen: ~~It's gone. Whatever that was, you hurt it. Tom, come home. Please.~~ → "It's gone. You hurt it. Come home, Tom."

**day1**

- `day1.07` Ellen: ~~That wasn't an animal. I've heard things like that before, on the recordings. Please be careful.~~ → "That wasn't an animal, Tom."
- `day1.08` Wyatt: ~~Dad, behind you! In the trees!~~ → "Dad, behind you!"
- `day1.16` Wyatt: ~~Movement on the {where} fence. Only a few. The wire's holding.~~ → "Movement on the {where} fence."
- `day1.prompt.quad` Wyatt: ~~Take the quad, Dad. It's in the garage. I topped her up last week.~~ → "Take the quad, Dad. It's in the garage."
- `day1.rounds` Wyatt: ~~Dad, by the fire! There's a box of rounds!~~ → "Rounds by the fire, Dad!"
- `day1.night.after3` Wyatt: ~~And if their phone's still working, we can call for help.~~ → "And if their phone works, we can call for help."
- `day1.22` Ellen: ~~You got it. The night went quiet after you dug it up. That has to mean something.~~ → "You got it. The night went quiet."
- `day1.gate` Ellen: ~~Not yet, Tom. Up the tower first, and bring the rifle down with you. I need to know what's going on out there.~~ → "Not yet, Tom. The tower first."

**gas**

- `gas.phone` Wyatt: ~~Their phone's dead too? Then it's not just our line.~~ → "Their phone's dead too?"
- `gas.note` Earl's note: ~~Marcy, I've taken the kids to the shelter. If you find this, come straight there. Do NOT go to the military checkpoint, they don't know what they're dealing with. That witch has been burying things in the woods for weeks. Rifle's in the safe, but she's empty, never found the right rounds. Combination's on my keys. E.~~ → "Marcy, I've taken the kids to the shelter. Come straight there. Do NOT go to the military checkpoint. That witch has been burying things in the woods for weeks. Rifle's in the safe, but she's empty. Combination's on my keys. E."
- `gas.scanner.1` Scanner: ~~...all civilians inside the quarantine line are to remain indoors. Do not approach the checkpoint. Repeat, do not approach the che...~~ → "...all civilians inside the quarantine line remain indoors. Do not approach the checkpoint..."
- `gas.scanner.dead` Wyatt: ~~Nothing? Earl ran that scanner off a car battery, Dad. Try one of the cars out front.~~ → "No power. Earl ran it off a car battery, Dad."
- `gas.scanner.1b` Scanner: ~~...Checkpoint Two, Checkpoint Two, respond. We have contacts on the east wire. They're not stopping. They're not... fall back to the tower, fall back to the...~~ → "...Checkpoint Two, respond. Contacts on the east wire. They're not stopping. Fall back to the..."
- `gas.scanner.1c` Scanner: ~~...all units, the transfer convoy is overdue at the checkpoint. Do not, repeat, do not open the containers. Hold for the specialist team. Hold for...~~ → "...transfer convoy overdue. Do not open the containers. Hold for the specialist team..."
- `gas.scanner.2` Ellen: ~~Quarantine line? Tom, I sat in briefings at the facility where they used those words. Somebody out there knows exactly what's happening.~~ → "A quarantine line? Somebody knows what's happening, Tom."
- `gas.quad` Wyatt: ~~Dad, Earl keeps a quad bike out back, by the stockroom door. Take it. It's a long way to the Pruitts' gate on foot.~~ → "Earl's quad is out back, Dad. Take it."
- `gas.safe.open` Wyatt: ~~Earl's hunting rifle? Dad, that thing's got a scope. Now we just need rounds for it.~~ → "Earl's hunting rifle. Now we just need rounds."
- `gas.safe.lever` Wyatt: ~~Wait. Behind it. Is that the old lever gun? Earl let me shoot that once. Bring it home, Dad. Please.~~ → "Is that Earl's old lever gun? Bring it home, Dad. Please."
- `gas.pack` Wyatt: ~~Dad, stop. By the pumps. They haven't seen you.~~ → "Stop, Dad. By the pumps."

**shelter**

- `shelter.rising` Ellen: ~~Tom, they're coming up out of the ground. In daylight. It's the thing she buried.~~ → "They're coming out of the ground, Tom. It's the thing she buried."
- `shelter.dug.wyatt` Wyatt: ~~They've stopped, Dad. There were heaps of them, and the second you dug that thing up, they stopped coming.~~ → "They've stopped coming, Dad."
- `shelter.dug.ellen` Ellen: ~~Then that's what she's been burying. Those things are raising the dead. Every one we dig up is fewer of them.~~ → "Those things are raising the dead, Tom. Every one we dig up is fewer of them."
- `shelter.earl` Ellen: ~~Tom... the red cap. That was Earl Pruitt. Oh, Earl.~~ → "The red cap. That was Earl. Oh, Earl."
- `shelter.earl.seen` Wyatt: ~~Dad... the one on the hatch. The red cap. That's Mr Pruitt.~~ → "The one on the hatch. The red cap. That's Mr Pruitt."

**nights**

- `nights.arrival.urgent` Wyatt: ~~{who} at the {where}! That fence isn't going to last the night. Get back here, Tom!~~ → "{who} at the {where}! Get back here, Tom!"
- `nights.arrival.calm` Wyatt: ~~{who} at the {where}. Looks like the fence will hold tonight.~~ → "{who} at the {where}. The fence will hold."
- `nights.forecast.2` Ellen: ~~The board's up, Tom, and the right side isn't empty any more. She's out tonight.~~ → "She's out tonight, Tom."
- `nights.boxFlat` Wyatt: ~~Fence box is dead, Dad. Any car with a battery still in it will do.~~ → "Fence box is dead, Dad. Any car battery will do."

**noReturn**

- `noReturn.radio` Junie: ~~Dad? Are you sure you're ready? Once that hut goes she's got nowhere left to run. You'll have to finish her.~~ → "Are you sure, Dad? Once the hut goes, you'll have to finish her."

**outpost**

- `outpost.call.ellen` Ellen: ~~Tom, if she's planting on our side of the line, the army's lost it. Their post is just past Earl's bottom field, and he swore there's a gap in their fence back there. Go and see.~~ → "The army's lost it, Tom. Earl swore there's a gap in their fence. Go and see."
- `outpost.helmetDown` Ellen: ~~He was one of them, Tom. That helmet stops a shot to the head. Hit it enough and it'll come off. Earl's rifle would go straight through it.~~ → "That helmet stops a head shot, Tom. Earl's rifle goes straight through it."
- `outpost.cleared.ellen` Ellen: ~~That's the last of them. Tom... there's nobody to report to.~~ → "That's the last of them. There's nobody to report to."
- `outpost.coming` Wyatt: ~~Dad! Torch off and get down. Something's coming up through the checkpoint. Fast.~~ → "Torch off, Dad. Get down. Something's coming."
- `outpost.helmet.east` Ellen: ~~There's a soldier on the track, Tom. Just standing there. Call out to him.~~ → "A soldier on the track, Tom. Just standing there."
- `outpost.manifest` Ellen: ~~Specimens. They were shipping specimens through there, Tom. Whatever was in that torn-open one, I don't want to meet it.~~ → "Specimens. They were shipping specimens, Tom."
- `outpost.charge` Wyatt: ~~That's a real explosive, Dad. Don't waste it on anything here. Save it for something big.~~ → "Save it for something big, Dad."
- `outpost.crate` Ellen: ~~Tom! Something's breaking out of those crates!~~ → "Something's breaking out of those crates!"
- `outpost.resin.ellen` Ellen: ~~Don't touch it. That isn't a man, Tom. They had that long before any of this started.~~ → "Don't touch it. That isn't a man, Tom."
- `outpost.turret.hot` Wyatt: ~~It's smoking, Dad! Get away from it!~~ → "It's smoking! Get away from it!"

**night2**

- `night2.homeward` Ellen: ~~It's getting dark, Tom. Come home. Whatever she's raising, we meet it behind the wire tonight.~~ → "It's getting dark, Tom. Come home."
- `night2.hand.wyatt` Wyatt: ~~Got it. Earl showed me how she kicks. I won't miss this time, Dad.~~ → "Got it. I won't miss this time, Dad."
- `night2.hand.late` Wyatt: ~~No time, Dad. I'll take it. I'm going up.~~ → "No time, Dad. I'll take it."
- `night2.mutant.ellen` Ellen: ~~Tom, east side. Something big is with them. Like the one in Earl's store.~~ → "Something big, Tom. East side."
- `night2.screamer.ellen` Ellen: ~~Something at the treeline is calling them in, Tom. They won't stop coming until you stop it.~~ → "Something's calling them in, Tom. Stop it."
- `night2.after.camera` Ellen: ~~Tom. While they kept us at the fence, camera seven tripped. The Pruitts' family plot. She was burying another one.~~ → "Camera seven tripped while they had us at the fence, Tom. The Pruitts' plot. She buried another."
- `night2.after.wyatt` Wyatt: ~~We held, Dad. We actually held.~~ → "We held, Dad."

**farm**

- `farm.call.ellen` Ellen: ~~Get some sleep, Tom. Then go up to the Pruitts' farm, the track east of home. Nobody's seen Marcy. See if she's all right.~~ → "Get some sleep, Tom. Then go and check on Marcy."
- `farm.arrive.ellen` Ellen: ~~That's Earl's generator. Tom... the wall round that light. It's moving.~~ → "Tom... the wall round that light. It's moving."
- `farm.moths.leave` Junie: ~~They're going. They only wanted the light.~~ → "They only wanted the light."
- `farm.mothman.ellen` Ellen: ~~Those were its young, Tom. I think you've just made an enemy.~~ → "Those were its young, Tom. You've made an enemy."
- `farm.mothman.ellenFled` Ellen: ~~It came for its young, Tom. And it's seen you now.~~ → "It came for its young, Tom. It's seen you now."
- `farm.journal.ellen` Ellen: ~~She believed him. All those years everyone laughed at Earl, and Marcy never did.~~ → "She believed him. Marcy never laughed at Earl."

**witch**

- `witch.escape` Ellen: ~~Tom, that's her! You can't fight her, not yet. Get away from her!~~ → "That's her! You can't fight her yet, Tom. Run!"
- `witch.escape.outpost` Ellen: ~~Tom, not with her there! Get away from the checkpoint. Come back once she's gone.~~ → "Not with her there, Tom. Get away from the checkpoint."
- `witch.gone` Wyatt: ~~I think she's gone, Dad. She's given up on you.~~ → "She's gone, Dad."

**home**

- `home.stop.call` Wyatt: ~~You're coming past home, Dad. Stop in on the way. The fence could use your scrap, and a fresh battery if you've got one.~~ → "You're passing home, Dad. Stop in."
- `home.stop.call.dusk` Wyatt: ~~It's getting dark, Dad. You're coming right past home. Stop in.~~ → "It's getting dark, Dad. Stop in."
- `home.stop.night` Ellen: ~~Sit tonight out behind the wire, or go for Earl's safe now. Your call, Tom.~~ → "Sit tonight out, or go for Earl's safe now. Your call, Tom."
- `home.cell.ask` Ellen: ~~Nothing gets through that fence again, Tom. It has to be stronger than it was. That thing you took off the creature at the plane. Would it run the fence?~~ → "That thing off the creature at the plane, Tom. Would it run the fence?"
- `home.cell.back` Ellen: ~~Nothing gets through that fence again, Tom. It has to be stronger than it was. That creature at the plane dropped something that glowed. Go back for it. It might run the fence.~~ → "That creature at the plane dropped something that glowed. Go back for it, Tom."
- `home.cell.fitted` Ellen: ~~Nothing gets through that fence again, Tom. Whatever you put in the fence box, it's holding more than it ever did. Find us more like it.~~ → "The fence has never held this much. Find us more like it, Tom."

**trailcam**

- `trailcam.plot` Ellen: ~~Tom. Camera seven just tripped. That's the Pruitts' family plot, past their shelter. She's there now.~~ → "Camera seven just tripped, Tom. The Pruitts' family plot. She's there now."

**junie**

- `junie.home.wyatt` Wyatt: ~~Mum! MUM! It's Dad, he's at the gate! He's real, I can see him!~~ → "Mum! It's Dad! He's at the gate!"
- `junie.home.ellen` Ellen: ~~Your radio. Look at it. We called and called and you never... Tom. Tom, listen to me.~~ → "Your radio. We called and called. Tom, listen to me."
- `junie.account.2` Ellen: ~~Last night we heard you on the radio. Hurt, saying all our names. We went out to find you.~~ → "Last night we heard you on the radio, hurt. We went out to find you."
- `junie.account.9` Wyatt: ~~The south path camera caught it. I'm patching it through. Dad, I'm so sorry.~~ → "The south path camera caught it. I'm patching it through."
- `junie.spare.wyatt` Wyatt: ~~Here. The spare handset from the tower. Don't let this one break. Please.~~ → "The spare handset. Don't let this one break."
- `junie.after.1` Ellen: ~~That wasn't you. It had your voice and it wasn't you. Whatever's out there, it learns how we sound.~~ → "That wasn't you. It had your voice. It learns how we sound."
- `junie.after.3` Ellen: ~~Find her, Tom. Find our girl. We won't leave the fence after dark again. Not ever. Not for anyone.~~ → "Find her, Tom. We won't leave the fence after dark again."
- `junie.rabbit.wyatt` Wyatt: ~~I found him on the south path, at the edge of the trees. She never goes anywhere without him. Never.~~ → "I found him on the south path. She never goes anywhere without him."
- `junie.face.ellen.1` Ellen: ~~I keep hearing it. Your voice, out in the trees, saying my name. If you call me after dark, Tom, I won't answer. I'm sorry. I can't.~~ → "Your voice was out in the trees, saying my name. After dark, Tom, I won't answer."
- `junie.face.wyatt.1` Wyatt: ~~The gate's shut at dusk now. Nobody goes out. Not for anything. Not even if it's you calling.~~ → "The gate's shut at dusk now. Not even if it's you calling."
- `junie.face.ellen.night` Ellen: ~~It's dark. The fence stays shut. Whatever you hear out there, it stays shut.~~ → "It's dark. The fence stays shut."

**caller**

- `caller.radio.1` Junie: ~~Daddy? Daddy, it's dark here. Why didn't you come?~~ → "Daddy? It's dark here. Why didn't you come?"
- `caller.radio.2` Junie: ~~I'm right here, Daddy. I can see your torch. Why are you walking away?~~ → "I can see your torch, Daddy. Why are you walking away?"
- `caller.radio.3` Junie: ~~It's cold. It says you're not coming. Tell it you're coming.~~ → "It's cold. It says you're not coming."
- `caller.radio.4` Junie: ~~I found the path home, Daddy. Come and walk me. It's just through the trees.~~ → "I found the path home, Daddy. Come and walk me."
- `caller.radio.7` Junie: ~~It sings to me. It knows the song Mum sings at bedtime. It knows all the words.~~ → "It sings to me. It knows Mum's bedtime song."
- `caller.radio.8` Junie: ~~Say my name, Daddy. If you say my name out loud I can come out.~~ → "Say my name out loud, Daddy, and I can come out."
- `caller.radio.9` Junie: ~~My rabbit's gone. Did you find him? Bring him to me. Bring him into the trees.~~ → "My rabbit's gone. Bring him to me. Into the trees."
- `caller.radio.11` Ellen: ~~Tom, it's me. We've got her. She's home, she's safe. Come back south and meet us at the trees.~~ → "Tom, it's me. We've got her. She's safe. Meet us at the trees."
- `caller.radio.12` Ellen: ~~Tom, I'm outside the fence. I'm so sorry. Come and get me. I can't see the way.~~ → "Tom, I'm outside the fence. I can't see the way."
- `caller.radio.14` Wyatt: ~~Dad, I came out after you. I know you said not to. I'm by the big rock. Dad?~~ → "Dad, I came out after you. I'm by the big rock. Dad?"
- `caller.radio.15` Wyatt: ~~Dad, Mum's hurt. Mum's hurt bad. Where are you? Dad, answer me!~~ → "Dad, Mum's hurt bad. Where are you?"
- `caller.church.2` Junie: ~~Come and sit with us, Daddy. Everyone's here. They've been waiting such a long time.~~ → "Come and sit with us, Daddy. They've been waiting such a long time."
- `caller.cutting.amos1` Amos: ~~Levi? Levi, it's Amos. I'm in the car. Come on back now, they're all waiting on us.~~ → "Levi? It's Amos. Come on back now, they're all waiting."
- `caller.cutting.amos2` Amos: ~~Not in there, brother. Up here. Come up the bank. Mama's up here with the lantern.~~ → "Not in there, brother. Up the bank. Mama's got the lantern."
- `caller.cutting.hattie` Hattie: ~~Mister? That's my Polly. Will you bring her up to me? I'm only up the bank.~~ → "Mister? That's my Polly. Will you bring her up to me?"

**comms**

- `comms.warn.ellen` Ellen: ~~Tom, you're breaking up. Something south of you is eating the signal. If we lose you, come back north and call. And Tom, if you hear us down there... it isn't us.~~ → "You're breaking up, Tom. If you hear us down there, it isn't us."
- `comms.back.ellen` Ellen: ~~There you are. We lost you. Whatever you heard down there, it wasn't us. It wasn't us, Tom.~~ → "There you are. Whatever you heard down there, it wasn't us."

**capsule**

- `capsule.ellen.1` Ellen: ~~A staircase in the woods, and a place behind this one that's the same woods made over wrong. Tom, that's what document one meant by a thin site. They didn't build here by chance.~~ → "A thin site, Tom. They didn't build here by chance."
- `capsule.wyatt.1` Wyatt: ~~Take the silent way. Every time. Even if it's her. Especially if it's her. Promise me, Dad.~~ → "Take the silent way. Even if it's her. Promise me, Dad."

**walk**

- `walk.2` Junie: ~~If you hear me calling you, Dad, it isn't me. I'm right here. I'll be right here.~~ → "If you hear me calling, Dad, it isn't me. I'm right here."
- `walk.3` Junie: ~~There were other people up there. In the trees. They had old clothes on. They didn't say anything.~~ → "There were other people up there. In old clothes. They didn't say anything."

**plan**

- `plan.2` Ellen: ~~"Where the Keeper is, the voice is not." Something lives in these woods that keeps that thing away. In 1903 they knew it was real.~~ → ""Where the Keeper is, the voice is not." In 1903 they knew it was real."
- `plan.3` Wyatt: ~~Dad. Big. Lives in the forest. Leaves people alone. Earl spent thirty years telling everyone and they laughed at him.~~ → "Big. Lives in the forest. Earl spent thirty years telling everyone."
- `plan.5` Ellen: ~~Earl kept maps. Every sighting, marked. They're on the corkboard in his shelter. Bring them home and we'll know where to look.~~ → "Earl kept maps of every sighting, in his shelter. It's on your map, Tom."
- `plan.maps.1` Ellen: ~~Read them to me, Tom. Where are the marks? ... All of them. All round the end of the old road, north of his store. He opened the shop next door to it.~~ → "The marks all bunch round the end of the old road. That winged thing is sitting on him."
- `plan.maps.3` Ellen: ~~So we get it off him. A flare brings it. We need something that can hold it once it's down.~~ → "A flare brings it. We need something to hold it down."
- `plan.maps.4` Wyatt: ~~The army cut that strip for the fence with a dozer. A big one, with a winch. It's still out at the east end, where they stopped. I saw it on the tape from the cordon.~~ → "The army left a dozer with a winch at the east end of the cordon, Dad."

**dozer**

- `dozer.taken.wyatt` Wyatt: ~~You got it started! I can hear it from here. Bring it home, Dad. Through the checkpoint.~~ → "You got it started! Bring it home, Dad."
- `dozer.home.ellen` Ellen: ~~There it is. Park it where the winch can reach the yard. We fill the fence, and then we call that thing down.~~ → "Park it where the winch reaches the yard. Then we call that thing down."

**zapper**

- `zapper.come.junie` Junie: ~~I can hear it! Daddy, it's coming, it's over the trees!~~ → "It's coming, Daddy!"
- `zapper.hooked.wyatt` Wyatt: ~~You've got it! It can't get away! Hit it, Dad, I'm hitting it!~~ → "You've got it! Hit it, Dad!"
- `zapper.after.ellen` Ellen: ~~It's alive. It went north, Tom, low, dragging a wing. I've got Earl's map here. It went straight down the old road.~~ → "It's alive. It went north down the old road, dragging a wing."
- `zapper.after.ellen2` Ellen: ~~That's where it's been all along. In his cave, sitting on him. And we've no fence. Take the dozer and finish it.~~ → "It's been in Earl's cave all along. Take the dozer and finish it."

**cave**

- `cave.blessing.ellen` Ellen: ~~Tom? Say that again. Tom, I can hear you. There's no hiss. There's nothing on the line but you.~~ → "Tom, I can hear you. There's no hiss on the line."
- `cave.blessing.junie` Junie: ~~It's gone, Daddy. The one that used my voice. I can't feel it listening any more.~~ → "The one that used my voice is gone, Daddy."
- `cave.blessing.wyatt` Wyatt: ~~Earl was right. Thirty years, and he was right about all of it.~~ → "Earl was right about all of it."

**mega**

- `mega.call.ellen` Ellen: ~~Tom! Tom, forget the quad! They're coming out of the trees. All of them. Every side. Get home!~~ → "Tom, forget the quad! They're coming from every side. Get home!"
- `mega.hollow.wyatt` Wyatt: ~~It just walked through it! The fence, it just walked through! There's a panel down!~~ → "It walked straight through the fence!"
- `mega.screamer.ellen` Ellen: ~~That screaming, at the treeline. Every time it does that, more of them come. Tom, shut it up.~~ → "That screaming brings more of them. Shut it up, Tom."
- `mega.after.ellen` Ellen: ~~We can't do that again, Tom. Look at the fence. Look at us. One more night like that and there's no station.~~ → "One more night like that and there's no station, Tom."
- `mega.after.ellen2` Ellen: ~~That little cell off the creature ran the fence for a week. The ship it came from went down in the south. Whatever drives a ship, I want it in our fence box.~~ → "That cell came off a ship in the south. I want what drives it."
- `mega.after.wyatt` Wyatt: ~~And Dad? The quad. Our quad. Those tracks at the ring only had three toes.~~ → "And Dad? The tracks where our quad was only had three toes."

**ship**

- `ship.up.wyatt` Wyatt: ~~Dad? Dad, your signal just went straight up. Like, up. Where are you?~~ → "Dad, your signal just went straight up."
- `ship.core.ellen` Ellen: ~~Whatever you just picked up, Tom, every needle in this room moved. Bring it home.~~ → "Every needle in this room just moved, Tom. Bring it home."
- `ship.quad.wyatt` Wyatt: ~~Is that the quad? Is that EARL'S quad? What did they do to it? ... Can I have a go?~~ → "Is that EARL'S quad? ... Can I have a go?"
- `ship.fitted.ellen` Ellen: ~~Three thousand. Tom, the gauge only goes to one. Nothing dead is walking through that wire again.~~ → "Three thousand. Nothing dead is walking through that wire again."
- `ship.fitted.ellen2` Ellen: ~~Now. Those men in the suits who were out here before all this. Earl's scanner still picks up their channel, down past the ship. Somebody's still transmitting.~~ → "Earl's scanner still hears the men in suits, south past the ship."

**armory**

- `armory.seen.ellen` Ellen: ~~That's it. That's where the signal's coming from. Government fencing, Tom. Those are the men who started all this. Go careful.~~ → "That's where the signal's coming from. Careful, Tom."
- `armory.turret.wyatt` Wyatt: ~~Is that a sentry gun? Dad. Dad, bring that home.~~ → "A sentry gun? Bring that home, Dad."
- `armory.docs.ellen` Ellen: ~~Don't read them out there. Bring them home. I want to see their names.~~ → "Bring them home. I want their names."
- `armory.sheriff.2` Sheriff: ~~I came to these men in good faith, friend. They put me in a box and wrote down how I bled. They call me Specimen Two. I call myself Sheriff.~~ → "They put me in a box and called me Specimen Two. I call myself Sheriff."
- `armory.sheriff.3` Sheriff: ~~That bell means every dead thing on this lot is headed here. There is a truck with a gun on it in their motor pool. You drive.~~ → "That bell brings every dead thing here. There is a truck with a gun in the motor pool. You drive."

**ute**

- `ute.go.sheriff` Sheriff: ~~I have watched every picture your people ever made about this. Keep her straight and I will keep them off you.~~ → "Keep her straight and I will keep them off you."
- `ute.clear.sheriff` Sheriff: ~~That is the last of them. ... I appear to have a hole in me. Your kind's guns are something, friend. Slower now, if you would.~~ → "That is the last of them. ... I appear to have a hole in me."
- `ute.home.ellen` Ellen: ~~Tom. There is an alien in a cowboy hat bleeding on my porch. ... Wyatt, get the kit. Junie, hold his hand. Not that one.~~ → "Tom. There is an alien in a cowboy hat bleeding on my porch. ... Wyatt, get the kit."
- `ute.home.sheriff` Sheriff: ~~Ma'am. I mend. And I am good with machines. Give me a roof and your scrap, and that fence, that truck and that dozer will be something to see.~~ → "Ma'am. I mend. And I am good with machines."
- `ute.home.wyatt` Wyatt: ~~We're keeping him, right? Dad? We're keeping him.~~ → "We're keeping him, right?"

**junieBack**

- `junieBack.face.junie.1` Junie: ~~It knew all our names. It still does. When it calls at night I put my hands over my ears. You should too.~~ → "It knew all our names. When it calls at night I cover my ears. You should too."
- `junieBack.face.ellen` Ellen: ~~She hasn't let go of Wyatt since you got back. Good. The account said mend the land and find the Keeper. Whatever the Keeper is, Tom, we need it. That thing's still out there.~~ → "The account said find the Keeper. Whatever it is, Tom, we need it."

**milo**

- `milo.siege.wyatt` Wyatt: ~~Dad. Dad, there's a clown. He's throwing knives at them. He's... he's really good at it.~~ → "Dad, there's a clown. He's throwing knives at them."
- `milo.stage` Milo: ~~Up on the stage, up you get! On the X! Arms down, chin up, and hold very... very... still!~~ → "Up on the stage! On the X! And hold very... very... still!"
- `milo.flinch` Milo: ~~Oh-ho-ho! A flincher! We have a FLINCHER! From the top, from the top!~~ → "A flincher! From the top!"
- `milo.tada` Milo: ~~Ta-daaaa! Hoo-hoo-hoo! A present for the brave! Toot toot!~~ → "Ta-daaaa! A present for the brave!"
- `milo.character.2` Milo: ~~I was IN CHARACTER! Do you know how long it takes to get into character? Do you? OUT! Out of my barn!~~ → "I was IN CHARACTER! OUT! Out of my barn!"
- `milo.act.wyatt` Wyatt: ~~Three knives, Dad. THREE. That's the coolest thing I have ever seen in my life.~~ → "Three knives, Dad. THREE."

**cutting**

- `cutting.ellen.1` Ellen: ~~They got on a train to get away from it, Tom. And it stopped them in the cut, with a lantern. It knew they were leaving.~~ → "They got on a train to get away from it, Tom. It stopped them in the cut."
- `cutting.wyatt.2` Wyatt: ~~A cowcatcher! Bolt that on the dozer's blade, Dad, and nothing's stopping it. Nothing.~~ → "A cowcatcher! Bolt that on the dozer's blade, Dad."

**sawmill**

- `sawmill.dispatch.1` Car radio: ~~...ground station is lost. All field units, hold your positions and wait for recall. Do not return to the Armory. This message repeats.~~ → "...all field units, hold your positions and wait for recall. Do not return to the Armory..."
- `sawmill.ellen.1` Ellen: ~~He worked it out, Tom. That last night he knew what was coming up the road, and he sent his men back to the saw anyway. I hope I'd have the nerve.~~ → "He knew what was coming, Tom, and he sent his men back to the saw anyway."
- `sawmill.wyatt.1` Wyatt: ~~Sixty inches? Dad. Put that on the dozer's blade and it's not a dozer any more.~~ → "Sixty inches? Put that on the dozer's blade, Dad."

**holler**

- `holler.ellen.1` Ellen: ~~They saw the lights and thought it was the law coming for their still. I keep thinking how close that is to right.~~ → "They thought it was the law coming for their still. That's close to right."
- `holler.wyatt.1` Wyatt: ~~That's a heat exchanger, Dad. Run it the other way, pump the jugs through it, light the end. The dozer breathes fire. I'm not even joking.~~ → "Run it backwards, light the end, and the dozer breathes fire, Dad."

**mine**

- `mine.ellen.arrive` Ellen: ~~Black Laurel? That's been shut since before I knew you. Bad air, they said. What does the army want with a dead coal mine?~~ → "Black Laurel? What does the army want with a dead coal mine?"
- `mine.ellen.out` Ellen: ~~Tom! Tom, answer me. The whole house jumped. Tell me that was you.~~ → "Tom! Tell me that was you."
- `mine.ellen.1` Ellen: ~~It came up out of the ground, and they put it in a box and drove it past our road. And he left his tag in his locker so nobody would go down after him. I'm glad somebody read it, Tom.~~ → "It came up out of the ground, and they drove it past our road in a box."
- `mine.wyatt.1` Wyatt: ~~That's off a drifter. It's made to chew into a mountain all shift and not care. Front of the dozer, Dad. Front and centre.~~ → "That's off a rock drill. Front of the dozer, Dad."

**board**

- `board.none` Ellen: ~~I'm still putting it together, Tom. Go on. I'll have more when you're back.~~ → "Nothing new yet, Tom. When there is, it goes on your map."
- `board.tower` Ellen: ~~Up the tower first, Tom. Every channel's static and I can't see a thing from in here. I need to know what's out in those trees.~~ → "Up the tower first, Tom. I need eyes on those trees."
- `board.towerRifle` Ellen: ~~The rifle's still up on the tower where Wyatt left it. Bring it down with you. I don't want you out there with empty hands.~~ → "Bring the rifle down off the tower with you."
- `board.campsite` Ellen: ~~The campers' fire went out in the night and nobody's answering. If they're hurt, we're the only help for forty miles. West trail, out the gate.~~ → "The campers aren't answering. The campground's on your map."
- `board.search` Ellen: ~~Go through their shelters, Tom. Anything that says what happened to them. Anything we can use.~~ → "Search their shelters, Tom."
- `board.battery` Ellen: ~~The fence box is dead and it'll be dark by six. Their car's battery will run it. Bring it home.~~ → "The fence box is dead. Their car's battery will run it."
- `board.fit` Ellen: ~~That battery goes in the fence box, just inside the gate. A live wire is the only thing between us and whatever took those campers.~~ → "Battery in the fence box, just inside the gate."
- `board.repair` Ellen: ~~There's a panel down on the east side. One gap is all they'd need. Patch it before the light goes.~~ → "There's a panel down on the east fence. Patch it before dark."
- `board.junie` Ellen: ~~Junie's been asking for you. Go and sit with her a minute before it gets dark. She saw more than she's saying.~~ → "Junie's asking for you. Go and sit with her."
- `board.camera6` Ellen: ~~Camera six caught something. Watch it, Tom. I want to know if you see what I saw.~~ → "Camera six caught something. Watch it."
- `board.night1` Ellen: ~~They came out of the woods where she was kneeling. Hold the fence until dawn. That's all we have to do tonight.~~ → "Hold the fence until dawn."
- `board.gasStation` Ellen: ~~Earl Pruitt has watched those woods for thirty years, and nobody ever listened to him. If anyone knows what she is, it's Earl. South of the campground.~~ → "Earl Pruitt's gas station, south of the campground. It's on your map."
- `board.gasInside` Ellen: ~~Look for the Pruitts in the store, Tom. And look at how they left. People who run leave things behind.~~ → "Look through the store. People who run leave things behind."
- `board.phone` Ellen: ~~Try Earl's phone. If there's a line out of this county, I want to know it.~~ → "Try Earl's phone. It's on your map."
- `board.scanner` Ellen: ~~Earl's scanner is in his stockroom, behind the counter. It hears the army's channels. Mine doesn't.~~ → "Earl's scanner is in his stockroom. It hears the army's channels."
- `board.scannerBattery` Ellen: ~~Earl's scanner hears the army's channels. Mine doesn't. It wants a car battery: the sheriff's car is just up the road.~~ → "The scanner needs a car battery. The sheriff's car is on your map."
- `board.note` Ellen: ~~Earl wouldn't leave Marcy without a word. Find what he wrote her.~~ → "Earl wouldn't leave Marcy without a word. Find his note."
- `board.gasLook` Ellen: ~~Have a look out front before you leave Earl's. Something was moving on the forecourt camera.~~ → "Have a look out front before you leave."
- `board.shelter` Ellen: ~~Earl's note said the shelter. It's up the track behind his store. If the Pruitts are anywhere, they're there.~~ → "Earl's shelter, up the track behind his store. It's on your map."
- `board.spade` Ellen: ~~Take Earl's spade from beside his track. Whatever she's burying, we'll want it out of the ground.~~ → "Take Earl's spade from beside his track. It's on your map."
- `board.shelterSigil` Ellen: ~~That glowing thing by the hatch is the same as the one she buried here. Dig it up. I think it's what calls them.~~ → "Dig up that glowing thing by the hatch. I think it calls them."
- `board.keys` Ellen: ~~Earl kept his keys on him. The combination to his safe is on them. I'm sorry, Tom. I know what I'm asking.~~ → "His keys have the safe's combination. I'm sorry, Tom."
- `board.hatch` Ellen: ~~The hatch is under the dirt. Dig it out. Earl spent thirty years getting ready for this, and it's all down there.~~ → "Dig the hatch out."
- `board.room` Ellen: ~~Go down, Tom. His diary, his tapes. Earl saw her with his own eyes. I've only ever seen the paperwork.~~ → "Go down, Tom. His diary, his tapes."
- `board.tapes` Ellen: ~~Watch Earl's tape. Everything I pieced together from inside the facility, he filmed from a deer stand.~~ → "Watch Earl's tape."
- `board.safe` Ellen: ~~Earl's safe is in the stockroom behind his counter, and you've got his combination. He kept the good rifle in it. We'll need it.~~ → "Earl's safe, in his stockroom. You've got the combination. It's on your map."
- `board.night2Home` Ellen: ~~Come home, Tom. She's seen you digging up her work, and she won't send a handful this time.~~ → "Come home, Tom. She won't send a handful this time."
- `board.night2Prep` Ellen: ~~Battery in the fence box, scrap into the fence, then Earl's rifle up the tower to Wyatt. Once he has it, we hold whatever comes at the wire.~~ → "Battery, scrap, then Earl's rifle up to Wyatt."
- `board.night2` Ellen: ~~Hold the station. That's the whole plan. Dawn stops them. It stopped them last night.~~ → "Hold the station until dawn."
- `board.night2Screamer` Ellen: ~~That thing at the treeline is calling them in. Wyatt says it flinches when it's hit. Put it down and the rest will thin out.~~ → "Put that screaming thing down and the rest will thin out."
- `board.night2After` Ellen: ~~Hold on, Tom. It's nearly light.~~ → "Hold on. It's nearly light."
- `board.farm` Ellen: ~~Earl's at his hatch and his children ran. Nobody's seen Marcy. Their farm's up the track east of home. Go and see if she's there.~~ → "Nobody's seen Marcy. The Pruitts' farm is on your map."
- `board.farmMoths` Ellen: ~~Those moths go to light, Tom. Kill the porch light and they'll have nothing to come to. Earl's generator is round the side of the house.~~ → "Those moths go to light. Kill the porch light."
- `board.farmYard` Ellen: ~~Wyatt saw something in that dead oak on the camera. Go out into their yard and look.~~ → "Go out into the yard. Look at the dead oak."
- `board.farmHouse` Ellen: ~~Go through the Pruitts' house. Marcy kept a journal. I'd like to know what she believed.~~ → "Marcy kept a journal. Find it."
- `board.plot` Ellen: ~~She was in the Pruitts' family plot the night they hit us. Camera seven saw her. Dig up whatever she left there on your way to the fence.~~ → "Dig up what she left in the Pruitts' family plot. It's on your map."
- `board.outpostRip` Ellen: ~~Earl said the soldiers cut a gap in their own fence at the back of his land. Past the family plot. That's your way in.~~ → "The gap in the army's fence is on your map."
- `board.outpost` Ellen: ~~If she's loose on our side, the army's lost that post. Go in by the gap and see what they were guarding.~~ → "Go in by the gap. See what they were guarding."
- `board.outpostFight` Ellen: ~~Their own dead are still at their posts. Clear them, and use what the soldiers left. The generator and that machine gun both run off a car battery.~~ → "Clear their dead. The generator and the big gun run off a car battery."
- `board.outpostPeak` Ellen: ~~Hold their barricade, Tom. It held for them longer than anything else did.~~ → "Hold their barricade, Tom."
- `board.outpostCompound` Ellen: ~~Go through the compound. Crates, containers, their comms hut. I want to know what was on that convoy, and what's still missing.~~ → "Go through the compound. I want to know what was on that convoy."
- `board.cross` Ellen: ~~The checkpoint's open. Whatever came down in the south, the army was more afraid of it than of her. We need to know why.~~ → "The checkpoint's open, Tom. Go south."
- `board.plane` Ellen: ~~A plane came down just past the checkpoint. If the pilot's alive, he saw what they were chasing.~~ → "A plane came down past the checkpoint. It's on your map."
- `board.planeLoot` Ellen: ~~Whatever that creature dropped, bring it home. I want to see what it's made of.~~ → "Bring home whatever that creature dropped."
- `board.planeCell` Ellen: ~~That cell from the plane puts out more than any battery we've got. Fit it to the fence box. I want the fence stronger before tonight.~~ → "Fit that cell to the fence box."
- `board.planeCellBack` Ellen: ~~Go back to the plane, Tom. What that creature dropped could run the whole fence.~~ → "Go back to the plane for what that creature dropped. It's on your map."
- `board.findJunie` Ellen: ~~She went south, past the plane, following your voice. It wasn't your voice. Find her, Tom. I'll hold here with Wyatt.~~ → "She went south, past the plane, following your voice. Find her, Tom."
- `board.churchLook` Ellen: ~~There's an old church on Earl's maps, south and west of the plane. Hemlock Gap. If this has happened before, somebody there wrote it down.~~ → "The old church at Hemlock Gap. It's on your map."
- `board.capsuleRead` Ellen: ~~Bring that account to the ledger and read it properly. A hundred years ago to the month, Tom. That's not chance.~~ → "Read that account at the ledger, Tom."
- `board.stairs` Ellen: ~~Amos Pruitt's stairs, east of the church. The account says the children climbed to the voice. That's where she is.~~ → "Amos Pruitt's stairs, east of the church. It's on your map."
- `board.climb` Ellen: ~~Take the silent way, every time. The voice will sound like me. It will sound like her. Don't answer it.~~ → "Take the silent way. Don't answer the voice."
- `board.junieHome` Ellen: ~~Bring her home, Tom. Just bring her home.~~ → "Bring her home, Tom."
- `board.plan` Ellen: ~~Sit down a minute. Wyatt and I have been talking, and you should hear it.~~ → "Sit down a minute, Tom. We've been talking."
- `board.earlMaps` Ellen: ~~Earl's maps are on the corkboard down in his shelter. Thirty years of sightings. I want them up here beside mine.~~ → "Earl's sighting maps are in his shelter. I've marked it on your map."
- `board.dozerFind` Ellen: ~~The army's clearing crew left a dozer where the cordon stops, east of the checkpoint. It has a winch. We can use a winch.~~ → "The army's dozer is where the cordon stops. It's on your map."

**tip**

- `tip.dead` Junie: ~~The dead ones don't run, Dad. I counted on camera two. But they don't stop either.~~ → "The dead ones don't run, Dad. But they don't stop."
- `tip.head` Junie: ~~They fall down faster if you get them in the head. Wyatt said. I watched and he's right.~~ → "Head shots drop them faster."
- `tip.sigil` Junie: ~~They come from where she buried it. Every time. If you dig it up before dark, the camera stays quiet.~~ → "They come from where she buried it. Dig it up before dark."
- `tip.mutant` Junie: ~~The big one at Mr Pruitt's had a soft bit on its back. I saw it glow on the forecourt camera. Hit it there.~~ → "The big one has a soft bit on its back. It glows."
- `tip.pack` Junie: ~~The ones she leaves lying down aren't sleeping, Dad. They get up if you go too near. You can go round them.~~ → "The ones lying down aren't sleeping. Go round them."
- `tip.witch` Junie: ~~The lady doesn't walk. I watched her on the camera and her feet don't move. I don't think you can shoot her.~~ → "The lady's feet don't move. I don't think you can shoot her."
- `tip.screamer` Junie: ~~The screaming one calls the others. But when Wyatt hit it, it went quiet for ages. Keep hitting it.~~ → "When you hit the screaming one, it goes quiet for ages."
- `tip.moths` Junie: ~~Moths like the light. If your torch is on they come to you. If it's off they go to the next brightest thing.~~ → "Moths go to the brightest light. Torch off, and they go somewhere else."
- `tip.forest` Junie: ~~Off the paths there are moths in the deep trees now. They find you after a while. Stay on the trails if you can.~~ → "Off the paths, the moths find you. Stay on the trails."
