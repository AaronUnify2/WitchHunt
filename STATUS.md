# Witch Hunt: Status

Last updated: Session 8 (AI Programmer), milestone **M7: the witch (the vertical slice), in progress.** Steps 1-4 of 6 are pushed for Aaron's play-test: **the witch roams and plants**, **you can fight her on the pathways**, **she lays traps**, and **the hut can be blown up.** Next: step 5, the final battle and blood night.

M6 (Session 7) is complete: simulation tiers, night marches, the forecast, nights while away, the alarm, the dawn autosave. The M6 performance gate passed. Aaron confirmed hiding at 6 m and the recalibrated forecast.

Design source of truth: [`docs/DESIGN.md`](docs/DESIGN.md). Open decisions: [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md). Next session: [`HANDOVER.md`](HANDOVER.md).

## How to run

```
npm install
npm run dev       # dev server (http://localhost:5173/; also on your LAN via --host)
npm run build     # production build into dist/ (base path /WitchHunt/)
npm run preview   # serve the build at http://localhost:4173/WitchHunt/
npm test          # Vitest unit tests
```

Live build: **https://aaronunify2.github.io/WitchHunt/** (Settings > Pages > Source must be "GitHub Actions"; "Deploy from a branch" serves raw source and shows a blank page.)

Dev conveniences: `?seed=1234` in the URL fixes the run seed (and so the whole map). The debug menu has "New map" (a fresh random seed) and "Restart this map" (same seed). In dev builds, `window.game` exposes the running Game in the browser console.

## What exists

### Debug menu in categories (Session 8, Aaron's request)

- The top level lists eight categories, each with its tool count: **Time & night, Teleport & map, Witch, Sigils & zombies, Player, Station & vehicles, Run & save, Display & performance.** A opens one, B goes back (B at the top closes). It reopens where you left it.
- Every teleport is together under "Teleport & map". Systems add tools with `menu.category(DEBUG.x).addItem(...)` (`src/debug/DebugMenu.js`).

### M7 step 4: The hut and explosives (Session 8)

`src/world/Hut.js`, `src/render/HutRenderer.js`, `src/combat/Explosives.js`; numbers in OPEN_QUESTIONS.md #123-125.
- **The hut:** a placeholder crooked shack in the middle of the hut clearing, its door toward the pathway in (the clearing's signpost is gone). Dark weathered planks leaning out of true, a steep sagging mossy roof, a leaning stone chimney, a black doorway under an antlered skull, window slits glowing a breathing green. One collider. She leaves and comes home by the door.
- **Charges:** carry two at most (Hut & explosives: Give 2 charges). Hold X by the hut to put one on its wall ("1 of 2 placed"), or anywhere with the detonator in hand, as a trap or dropped while chased. Planted charges blink red. The HUD shows "Charges ×N (N planted)".
- **The detonator:** a weapon slot (RB / LB) while charges are out or in hand, a grey box with an aerial and a red button. RT sets every planted charge off at once (manual only).
- **A blast:** a white-hot core in a swelling orange fireball, 9 m. It kills or hurts zombies, hurts the witch, breaks traps, and hurts you if you're in it; shakes the camera; every zombie within 160 m hears it, and so does she.
- **The hut falls only to two charges on it, together.** One alone: "The hut shudders, but holds." Destroyed, it's a smouldering wreck (wall stumps, scattered planks, flickering embers), and she bursts out to fight (step 5 makes this the final battle). Putting a charge on the hut has a 60% chance of bringing her out to stop you.
- **Debug (Hut & explosives):** give 2 charges; teleport to the hut door; plant both charges on the hut now; set off every planted charge now; destroy the hut now.
- **Verified in headless Chromium (seed 4242):** the hut by day and night; holding X at the door put a charge on the wall with the prompt and added the detonator slot; two on the hut destroyed it with a fireball, leaving the wreck, and she came out and threw a hex. No console errors.
- **Tests:** 362 pass (8 new: tests/explosives.test.js): the carry limit, a blast (you and a zombie hurt, less toward the edge), the hut needing two charges together, the detonator slot coming and going (switching back from it), holding X to plant on the hut's wall, and the hut's placement on three maps (door outside the walls, toward the pathway in).

### M7 step 3: The witch's traps (Session 8)

`src/ai/witchTraps.js`, `src/render/TrapRenderer.js`; numbers in OPEN_QUESTIONS.md #121-122.
- **Snare:** a pegged loop of root and rope on the path, hard to see without the torch. Step in it and you're held fast (`Player.rooted`); you can still look and shoot. "Snared! Mash A to tear free", with a progress bar. About 2 seconds of mashing, as Aaron asked.
- **Hex totem:** leaning sticks with a turning, glowing rune and a faint pulsing ring. Inside the ring you take 8 damage a second. Shoot or strike it to destroy it.
- **Alarm charm:** a stake hung with swaying pale bones. Walk into it and it clatters: zombies within 80 m come, and the witch, if she's out within 250 m, comes looking. Shoot it first and it's harmless.
- **Placement:** the hut approach is laid with 16 at the start of every run, thicker toward the hut, as breadcrumbs. She drops one every 3.5 s while fleeing (she slows as she does).
- **Debug (Witch):** Traps: lay a snare, a totem and a charm ahead of me; free me / clear them all. The overlay's witch line shows the trap count and SNARED.
- **Verified in headless Chromium (seed 4242):** 16 traps on the hut approach; all three kinds drawn; the snare caught the player with its prompt; fleeing wounded, she dropped 3 in 12 s. No console errors.
- **Tests:** 354 pass (6 new): the hut approach on three maps (count, spacing, on the path, thicker near the hut, the same every time), the snare (held, a rest drains the effort, about 2 s of mashing frees you), the totem (burns inside its ring until shot), and the charm (calls zombies and the witch; shot first, it does nothing).

### M7 step 2: Fighting the witch on the pathways (Session 8)

As agreed with Aaron; numbers in OPEN_QUESTIONS.md #113-120.
- **She can be hit:** the weapons take extra targets (`Weapons.extraTargets`, `targetable`, `takeHit()`). Her hit shape follows her pose (crouched in the ritual). 500 health; her headshots count x2.
- **Noticing you:** the shared detection model with sharper eyes (x1.3; hiding still works). In the ritual's trance she only notices you close up (x0.35), or a shot within 30 m, or a hit. Noticing you breaks the ritual and the sigil is lost.
- **Fight or flee:** health share + a bonus near her hut (DESIGN.md). Reconsidered every second and on every hit.
- **Attacking:** she faces you upright, claws out, head jerking, and circles at about 11 m.
  - **Hexes:** glowing bolts thrown at where you are (20 damage). Sidestep them or put a trunk between you (`ai/witchHexes.js`).
  - **Swipe:** stand still, or come within 4 m, and she rushes in and swipes (30 damage, both arms raised then slashed down).
  - **Summon:** when a fight starts she calls 3-4 zombies out of the ground around her, arms flung up (once a minute at most).
- **Fleeing:** home along the pathways at 8 m/s, weaving, folded low. After losing you she goes back to planting if she's well enough, else home.
- **Wounds:** they last and are saved (`saveState()`; old saves load fine). 35% heals each day. Wounded she plants at most one sigil; badly wounded she stays in.
- **Killing her:** she buckles, folds and sinks into the ground. A placeholder "THE WITCH IS DEAD" screen ends the run (the save is deleted). The real ending is step 6.
- **Feedback:** a placeholder health bar top centre during fights; new sounds (shriek, hex, hex hit, claws, summoning drone, death scream). Hits show the usual blood and hit marker.
- **Debug (Witch):** Fight: bring her out to attack me now; make her flee now; set her health (100/50/25/10%); kill her.
- **Verified in headless Chromium (seed 4242):** a real rifle shot through the weapon code took 25 off her. She turned to attack, 3 zombies rose, and she circled and threw hexes. Enough hits sent her fleeing at 40%; killing her showed the victory screen. No console errors.
- **Tests:** 348 pass (7 new): the ritual broken by a hit, the trance's short sight, fleeing when wounded and fighting near the hut, summon then hex then swipe, death, wounds (healing, planting less, saving), and hexes (hit, sidestepped, blocked by a trunk).

### M7 step 1 follow-up: Aaron's first look at the witch (Session 8)

- **Aaron:** watching her run off at dusk was "awesome", she never snagged, and her silhouette is "amazing". Up close she was too blocky, and the ritual too long.
- **Faster:** 6.05 m/s near the player (was 5.5; he could keep pace).
- **Ritual: 45 seconds** (was 2 minutes).
- **A shadow creature:** her whole body is unlit near-black (`MeshBasicMaterial`), so the torch can't light her or glint off her. Only her silhouette and glowing eyes read. She's 28% thinner, with thinner arms.
- **Jointed and contorting** (`render/WitchRenderer.js`): skirt, torso (waist joint), head (neck joint) and two arms. Running, she's folded forward with her head up and arms trailing. In the ritual she sinks into a low crouch, her cloak pooling, folded flat over the spot. Her head cranes up and twists too far, and her arms splay out like a spider's legs. Each joint jerks to a new angle and holds still in between (`snapValue()`). 6 draw calls plus the shadow (was 4).
- **Tests:** 341 pass.
- **Second look (Aaron):**
  - **Eyes:** narrow slanted slits; the square ones read as glasses and made her look grandmotherly.
  - **She glides:** no steps, no bob, no arm swing (too human). She floats 12 cm off the ground with a slow rise and fall, her cloak tilting back to trail behind her as she moves (`config.witch.look.glide`), arms swept back and limp at the wrists.
  - **No pinched waist:** the cloak is a tapered cylinder meeting the chest, not a cone narrowing to a point.
  - **Elbows and wrists:** each arm is a sleeve, a forearm and a long-fingered hand on their own joints. In the ritual the elbows bend the forearms down to the ground, and now and then the wrong way; the wrists curl and snap back.
  - 10 draw calls plus the shadow while she's near.

### M7 step 1: The witch roams and plants (Session 8)

Agreed with Aaron first (rule 10; OPEN_QUESTIONS.md, Session 8). The stand-in planter is gone: she plants every sigil now.
- **By day** she rests unseen in her hut. **At dusk** she comes out (from the hut clearing's centre until the hut is built in step 4). Night 1 she stays in; from night 2 she plants one sigil a night, from night 3 sometimes two.
- **Where:** M4's rules (60% on empty sigil grounds, else off a pathway), chosen as she sets out. The player's position doesn't put her off, so you can stake out a ground and wait for her.
- **Travel** (`src/ai/witchRoutes.js`): along the pathways by the shortest way, keeping off the ranger station's clearing. She follows the zombies' tiers: within 150 m of you she runs for real (5.5 m/s, with collision and sidestepping); beyond, she's an unseen point on the graph going 3x faster.
- **The ritual:** 2 minutes kneeling at the spot, arms raised and rocking, inside a pulsing green ring on the ground (it shows through the fog), singing a wavering tune that carries 70 m. The sigil appears when she's done, with a deep thud. Then her next spot, or home. Dawn sends her home (she finishes a ritual already under way).
- **Her look** (`src/render/WitchRenderer.js`): a placeholder 2.3 m figure. A ragged cloak with a torn hem and a shawl, a hooded gaunt face, a crown of splayed sticks, long arms with long fingers that swing as she runs, and small glowing eyes. 4 draw calls plus the torch shadow, only while she's out and within 150 m; the ring adds 2. Up close the torch bleaches her face (like the zombies); the art pass gives her real detail (Aaron wants to spend time on her).
- **The forecast** counts the sigils she's out to plant tonight, from when she's expected to finish them, as "The witch is out to plant a sigil" (not where).
- **Not yet:** she ignores the player (fighting, fleeing, interrupting her: step 2), traps (step 3), the hut (step 4), saving her (step 6).
- **Debug (Witch category):** her state; send her out to plant now; finish her ritual now; send her home; teleport near her; show her on the map (a violet cross). "Plant sigil now by her rules" (Sigils & zombies) plants one at once. The overlay has a witch line.
- **Verified in headless Chromium (seed 4242):** night 2, she left the hut, ran past the player, travelled 1.3 km, planted at the Family cemetery and set off home. The forecast showed her sigil ("about 8 zombies, the first around 1:30am"). No console errors.
- **Tests:** 340 pass (17 new): routes between every pair of clearings on three maps, avoiding the station, a night out start to finish, the ritual's timing, dawn calling her home, two sigils in a night, the tiers, and the forecast's delay.

### M6: the performance gate, sneaking, and the forecast recalibrated (Session 7, done)

- **Gate passed (Aaron):** no drops below 60 fps.

- **Performance gate (Aaron, tablet, Medium):** about 20 minutes of nights with five sigils. The tablet stayed "barely warm" and the overlay showed 80 fps, frame 12.4 ms (simulation 0.9 ms, render 2.6 ms), 69 draw calls. Earlier: 90 fps with the full 480 zombies (zombie simulation 0.33 ms).
- **Hiding (Aaron):** crouched, torch off and in the brush (undergrowth 0.3 or more, so just off the path counts): seen from no further than **6 m**, day or night, at any level. A zombie already chasing you still gets its pursuit ×1.7. A placeholder "◉ HIDDEN" over the health bar (DESIGN.md's stealth eye). `detection.isHidden()`, `config.detection.hidden`.
- **The forecast matches what happens (Aaron: a fully built station at 150 held a five-sigil night that read 268 danger):**
  - The level no longer multiplies danger again (`config.danger.levelWeight` 0). It already counts through the quotas, the march speed and the attacks' own damage. Five sigils is now about 134.
  - **A bug fixed:** an attack was rolled for its first arrivals, not its whole group, which watered down the night's chance of falling. It now rolls for the whole pack.
  - Away, the fence's zaps cost a third of what they did (0.1 per zombie per second), so a battery doesn't die in one horde and take the turret with it. The turret takes 10 rounds per kill (was 4).
- **Checked on seed 4242, away all night with five sigils:**
  - a bare station (30 vs 134, likely overrun) fell at about 1:55am;
  - a built one (88: barricades, 145 charge, the turret on fast with 3,296 rounds) survived. The turret killed 23; two panels, two barricades and the gate went (Aaron's result).
  - Aaron's own station (129) would now read about -5, "may fall".
- **Tests:** 323 pass (2 new for hiding).

### M6 step 4: Dawn autosave (Session 7)

- **Aaron's tablet test:** the autosave "worked 100% properly": he checked everything he could think of. Real playthroughs (doing things in the right order) will be the fuller check.
- **One save slot in localStorage** (`src/core/saveData.js` pure, `src/core/SaveStore.js`; key `witchHunt.save`, about 11 KB).
  - Saved at each dawn ("Dawn: night N survived. Game saved").
  - Deleted when the run ends (death, the station falling, New run, New map, Restart this map).
- **What it stores:**
  - the seed and the clock;
  - the player: position, facing, health, armour, first aid, scrap, batteries, pistol rounds, each gun's magazine and reserve, the weapon in hand, kills;
  - the fog of war, packed as bits;
  - every station defence: panels, barricades, spikes, gate, doors and reinforcement, charge, floodlights, the turret's state, rounds and mode;
  - the vehicles' searched, bonnet, battery, flat, alarm and seen flags;
  - the sigils, and which encounters have been visited (revisits).
- **Not stored:**
  - zombies (dawn sinks most; the few stragglers are lost);
  - pickups lying on the ground;
  - the random number streams (a continued run rolls differently from one played straight through).
  - The witch, dialogue, documents and prizes come with their milestones.
- **The start screen:** with a save (and no other `?seed=` in the URL), "A run is saved" with **Continue: dawn after night N** and **New run**. Enter continues, N starts a new run. A placeholder until the main menu (M9).
- **Debug:** Save now; Delete the save.
- **Verified in headless Chromium (seed 999):**
  - Made changes (a sigil, a barricade, a battery fitted, scrap, ammo, health, position, revealed map, a looted car) and skipped to dawn: saved.
  - Reloaded with no seed, and Continue brought every value back.
  - Dying deleted the save; New run deleted it and loaded a fresh seed. No console errors.
- **Tests:** 321 pass (6 new): the fog bits, clock, player, every station defence, vehicles, sigils, revisits, and the store with JSON junk and blocked storage.

### M6 step 3: Aaron's verdict

- Five sigils, a topped-up battery, away at the hut at x1 speed: urgent radio calls, much of the fence fell while he ran home, then the front door. The station fell right at dawn with him about 180 m out. **"I think that's balanced really well."** The doors stay at 300.
- **Stamina doubled** (100 -> 200, about 10 s of sprint) for the long runs home; regen unchanged.

### M6 step 3 follow-up 2: attacks last the night, a stronger fence, graded radio calls

Aaron's second test: the zombies vanished once the fence was down, and a horde took the fence far too fast. "15 zombies might not pull down a chain-link fence in a couple of hours. It might take them an evening."

- **Stronger fence:** a segment 200 -> 500 health, the gate 300 -> 750, a barricade 150 -> 375 (doors unchanged). Real sieges at home slow down the same way. Repairs cost the same per whole segment.
- **An attack while away lasts until dawn.** The group stays at the fence and claws at a steady rate: 0.45 per zombie per second × the band's damage × the level's defenceDamage.
  - If the margin says it breaks through, it goes on through the gap to the front door, then the comms door (the station falls).
  - At dawn the survivors wander off and most sink.
  - Late arrivals from the same group join its attack.
- **The turret while away** fires at its mode's rate and every 4 rounds kills an attacker (no loot). The fence's zaps use charge.
- **Graded radio calls:** "One or two of them / A few of them / A horde at the south fence 2", then either "Looks like the fence will hold tonight" or "That fence isn't going to last the night. Get back here, Tom!" It's urgent if the group breaks through, or would claw through the fence where it is before dawn.
- **Checked on seed 4242 (fence repaired, away all night):**
  - one sigil (level 1, +14): a panel at about half by dawn, calm calls all night;
  - two sigils (level 2, -11): a panel down at 5:40am;
  - five sigils (level 5, -238): the horde at 11:30pm, a panel down by 12:30am, the station fell about 1:15am;
  - the same with a loaded turret: 10 kills, and it fell a little later.

### M6 step 3 follow-up: Aaron's first play-test of nights while away

- **Attacks take time (Aaron: "the fence fell within a second").**
  - A group that reaches the station while you're away gathers 5 m outside the fence where it arrived (a new 'held' mode; it ignores you).
  - A radio call says where ("They're at the south fence 2!", at most every 15 s).
  - Its damage lands over 45 s (about 1¼ hours of night). Breaks are toasted as in a real siege.
  - Breaking through takes the fence at 30% of the attack, the front door at 65% and the comms door at the end, when the station falls.
  - **Come home mid-attack (within 150 m) and the group is still there to fight.**
  - While you're away the turret doesn't really fire (its part is the ammo maths), so nothing is counted twice.
  - Checked (seed 4242, five sigils, undefended): the first attack at 10:35pm took a panel about an hour later. From 12:30am the fence went panel by panel, the front door at 2am and the comms room at about 2:45am.
- **Why nights 2-4 showed no damage:** skipping to dawn skipped the attacks (the far groups arrive 2-4am), and the map screen pauses the game.
  - **The debug time speed is now a fast-forward**: x1, x4 or x10 runs the whole world (zombies, marches, attacks, the clock) that many steps a frame.
  - A fast simulation of four nights away (seed 777) had attacks from 2:40am on night 2 and 11pm on night 4.
- **Sigil grounds: always five, two north, two middle, one south** (`config.map.sigilGrounds.perBand`); **the Car Armory moved to the north band** (Aaron). Every seed's map changes. DESIGN.md updated.
- **Death starts a new run** (a fresh map; A on the death screen reloads, so the tablet needs a tap to start). The debug menu keeps "Try again here".
- **Chain-link glare:** every fence panel now dims the torch up close, like the gate.
- **The starting broken panel** is the second east of the gate (segment 7); the one beyond it (8) leans. You face it from the yard.
- **No shouldering the gun while reloading** (the rounds came up to your face).
- **Tests:** 315 pass (2 new for the map bands; the station tests follow the new starting panel).

### M6 step 3: Danger, the forecast, nights while away, the alarm (Session 7)

- **Danger** (`src/base/danger.js`), in the same units as security:
  - **Spawn strength:** each sigil's marchers tonight (its night quota × ⅔).
  - **Closeness:** × the share that reaches home before dawn. Groups rise over the first half of the night and march at a typical pace, ×2.5 out of sight.
  - **Level:** × 2 per zombie × the level's `defenceDamage`.
  - Night 2's single sigil comes to about 10-20 against a fresh station's 25, so "holds, takes damage".
- **The dusk forecast** (`src/base/NightWatch.js`):
  - A panel a frame after dusk (after the stand-in plants) that fades after 14 s. It takes no buttons, so B still reloads.
  - It shows security against danger, the margin and the verdict if you're away, and both breakdowns.
  - Per sigil: about how many zombies, and when the first should arrive ("the first around 10:30pm").
  - Warnings: the turret runs dry, the fence charge runs out, the fence has no charge.
  - Also a **Forecast** tab in the ledger, kept live.
- **Away** (beyond 150 m of the station, 8 m of hysteresis):
  - Zombies near the station may go abstract.
  - Each group (a pack, or a stray) that reaches siege range is resolved by the margin table (`src/base/nightResolver.js`) as things stand then.
  - It lands on the real defences (`Station.applyAttack()`): damage spreads along the fence from where it arrived, a barricade before its segment.
  - Turret rounds (4 per zombie), zaps (2 per zombie) and spike bites are used up.
  - An attack carries its share of the night's chance of falling. A fall breaks through to the comms room: "The station fell: the dead broke into the comms room while you were away".
  - Back home, a summary toast. Near home, sieges are fought for real as before.
- **The margin table:** +20 is clean (5% of the damage); 0 to +19 holds (50% down to 15%); -1 to -10 may fall (10-60% over the night, 80% damage); below -10 likely overrun (60-95%). A mutant counts as 4.
- **The alarm:** the first time in a night security drops below half the dusk value, a radio call (a crackle and three pips) and a pulsing STATION UNDER ATTACK banner top centre, with an arrow home. Shown while you're outside siege range; it clears at dawn.
- **Debug:**
  - Night: show the forecast now.
  - Night: count me as away from home (always).
  - Night: sound the alarm now.
  - A new `nights` overlay line: away or home, security, danger, margin and band, dusk security, alarm, attacks tonight.
- **Verified in headless Chromium (seed 1234):**
  - The night 2 forecast read security 25 vs danger 16, +9, holds, with the no-charge warning.
  - Away at the hut, a siege wave was resolved.
  - With 8 segments smashed (margin -12) an attack broke through and the station fell, with the "while you were away" reason.
  - The alarm banner pointed home; the return summary listed what broke. No console errors.
- **Tests:** 313 pass (9 new): the bands, the fall chances rising, attacks adding up to the night's chance (also checked over 4000 simulated nights), damage scaling, and danger by distance and level.

### M6 step 2: Night marches and revisits (Session 7)

- **Aaron's tablet test:** waves reached the fence at about 9pm and 11:30pm; good group sizes; nothing stuck; no fps drops. Undefended, they tear through the fence quickly: "a reasonable penalty for leaving the base undefended".

- **Marching groups** (`ZombieDirector.raise()`, `src/ai/marchRoutes.js`):
  - Each raising is either a single wanderer or a whole marching group: 4 at level 1, 5, 6, 8, then 10 at level 5.
  - A group climbs out together and sets off at once for the station.
  - A mutant can lead a group, and a horde always marches.
  - The odds are set so about two thirds of the night's zombies march (Aaron).
- **The route:** the shortest way home along the pathways.
  - A group walks at 0.9× its slowest member's speed, so it stays together.
  - Out of sight (the abstract tier) it moves ×2.5 (Aaron: fine), so the far sigils' groups still arrive in the night.
- **Arrival times** (pathway walking, 40 seeds, before the ×2.5):
  - Level 1: the farthest sigil ground takes 170-365 s (median 290), the nearest 16-250 s (median 110).
  - Level 5: the farthest takes 120-245 s, the nearest 10-175 s.
  - With ×2.5, a typical far level 1 group reaches the station around 4am.
- **At the station:** within 70 m of the family, marchers switch to the siege as before; chasing the player beats both.
- **A cap per sigil per night:** 12, 14, 16, 18, then 20 zombies by level. The old cap of 6 living now counts only its wanderers.
- **Revisits (Aaron's idea, night only)** (`src/ai/revisits.js`):
  - Come back at night to an encounter you've already been inside, and 4-5 zombies of its variant mix have turned up there.
  - They spawn as you come within 130 m, out of sight, and hang about the clearing (a new 'linger' mode).
  - Once per clearing per night; you have to have been 150 m away since your last visit.
- **Unsticking:**
  - A zombie walking a route that barely moves for 0.8 s takes a short detour. It goes to the side away from what's in the way, further out each time if it's still stuck, then tries the other side.
  - Found in the browser check: a verge car on a bend stopped a whole group dead at 128 m from home. Chasing zombies aren't affected.
- **Debug:**
  - **Marches: raise a marching group at every sigil now**.
  - **Marches: teleport behind the nearest marcher**.
  - The `sigils` overlay line shows tonight's raised, marching, groups sent and revisits.
  - The `lod` line counts detours.
- **Verified in headless Chromium (seed 1234):**
  - Three sigils: groups of 6 and 7 rose and set off.
  - A group of 6 sent from 300 m out walked at about 6 m/s out of sight and 2.4 m/s within 150 m. It got round the verge car, went to siege at 70 m, spotted the player at home and clawed the fence.
  - A revisit put 4 zombies at Ground Zero. No console errors.
- **Tests:** 304 pass (11 new):
  - every clearing marches home by the shortest way;
  - mid-path starts;
  - the odds give two thirds marching;
  - revisits are fresh the first time, once a night and never by day;
  - a level 1 group from the farthest sigil ground arrives within the night on 3 seeds;
  - a zombie walks round a car across its way.

### M6 step 1: Simulation tiers (Session 7)

- **Aaron's tablet test:** 480 zombies (the whole population) on the map, **90 fps**, frame 11.1 ms, zombie simulation **0.33 ms**, 74 draw calls.

- **Three tiers by distance from the player** (`src/ai/simTiers.js`, `EnemyManager`):
  - **Active (within 60 m):** full simulation every frame, at most 25 (the nearest).
  - **Nearby (60-150 m):** the same simulation every 3rd frame, with the time saved up; no pushing apart.
  - **Abstract (beyond 150 m):** no mesh; it walks the pathways in two coarse steps about once a second, with no collision. It's settled clear of trees and rocks when it comes back.
  - An 8 m margin stops zombies flickering between tiers.
  - Zombies within the station's reach never go abstract, so a siege is always simulated. Step 3 changes this while you're away.
- **No 64 cap (Aaron).** The pool starts at 64 and grows 32 at a time, up to 480 (a safety net, not a design number).
- **Sprites:** the active tier first, then nearby ones within the draw distance (+5 m); at most 160 drawn. Mutants skip the abstract tier too.
- **Debug:**
  - **Zombies: populate the map (+100 on the pathways)**.
  - **Zombies: tier colours** tints sprites and map dots: red active, orange nearby, purple abstract. The dots show through the fog while it's on.
  - A new `lod` overlay line: tier counts, pool size, smoothed sim time.
- **Cost:** 300 zombies take **0.07 ms of simulation a frame** at 60 fps (Node), against 0.67 ms with every zombie fully simulated.
  - Headless Chromium with 310: 16 active, 16 nearby, 278 abstract, 77 draw calls, no console errors.
- **Tests:** 293 pass (10 new):
  - tier boundaries and the margin, the cap, the nearby frame spread;
  - the pool growing past 64;
  - an abstract zombie covering the same ground as a simulated one (within 25%);
  - waking up as the player walks in;
  - gunfire reaching nearby zombies.

### M5 part 2: Vehicles and batteries (Session 6b)

Agreed with Aaron before building: **four types** (car, pickup truck, police car, army truck; one-off vehicles may come with later scenes), **about 45 a map**, **about 60% with a battery**, pulling a battery is **just a noise**, and an **alarm that pulling the battery kills**; vehicles **on the minimap and map screen** if it doesn't crowd them; the hold times as proposed; the debug battery stays.

| Area | Files | Notes |
| --- | --- | --- |
| Content | `src/data/vehicles.json` | The four types: size, placeholder boxes (`parts`), unlit `lamps`, the hinged `lids` (bonnet, boot or tailgate or canvas flap, driver's door), where the battery sits, the words for each spot, and a loot table per spot (items from `loot.json`). **Placement** rules by place: `path` (verge cars), clearing type (`roadside` 3-5 and `checkpoint` 2-3 in a roadblock row), encounter (`campsite`: one sure car with a battery and no alarm, next to home; `gasStation` 2-3; `outpost` 2-3 army trucks in a row; `mineshaft` maybe a pickup; none at home, the hut or the crashed plane), else `default` (a 35% chance of one). |
| Placement | `src/world/vehiclePlacement.js` | Pure and seeded. Clearings first, then a car every ~85 m along each pathway (85% chance), pulled 2.7 m onto the verge, facing either way, 20% nosed off the road into the trees. Each must stand on open ground (every corner and spot: no trees or rocks), on a gentle slope (≤0.22), clear of the cliff, the station (fence + 8 m), signposts and clearing centres, with 2.2 m of clear ground to any other vehicle (an oriented-box test). Roadblock rows try several lines and keep the one that fits the most. **35-59 a map (about 46 on average); 3 draw calls in all.** |
| Vehicles | `src/world/Vehicles.js` | The system. Three hold-X spots per vehicle, each once per run: **the driver's door** (search the car / cab / police car: 2.5 s, loot), **the boot** (search the boot / truck bed / back: 2.5 s, loot), **the bonnet** (lift it: 1.5 s; then pull the battery: 3 s, ratchet clicks, a clunk, "+1 battery (N carried)", and a 22 m noise zombies hear). A bonnet with no battery says "No battery in this one". Loot the player can't take (full kits, full armour) is left on the ground by the spot. **Alarms:** a quarter of those with a battery; opening the door or boot sets it off: a toast, a two-tone wail, the lamps flashing, and a 65 m alert every 2 s until the battery is pulled ("The alarm dies") or after 60 s it runs the battery flat. Digging and the station's prompts come first. "Try again" restocks every vehicle. |
| Look | `src/render/VehicleRenderer.js` | Every box of every vehicle is one instance of a single unit cube (one draw call, shadows on), plus one unlit mesh for headlights, tail lights and the police light bar (so an alarm's flash shows at night). Faded, dirty paints (scaled to 70%: light paint glared under the torch), tilted to the ground's slope, some leaning on a flat tyre. Doors, boots and bonnets swing open on their hinges; the battery shows under a lifted bonnet until it's pulled. |
| Collision | `Vehicles.buildColliders()` | Each body is a row of thick wall pieces (≤1.2 m each, so the collision grid's reach stays small): bodies slide round them, shots and the torch's glare check stop on them. |
| Maps | `src/ui/mapImage.js`, `Minimap.js`, `MapScreen.js`, `MapUi.setVehicles()` | A small steel-blue oblong, turned to the vehicle's heading, once you've been within 40 m (grey once there's nothing left in it). The map screen's legend adds "▮ Vehicle". |
| Sounds | `src/audio/Sfx.js` | Placeholders: car door, boot lid, bonnet creak, ratchet, battery out, and the alarm's two wails. |
| Debug | `Vehicles.addDebugItems()` | **Vehicles: teleport to the nearest unsearched** (stands you at its door; the toast says if it has a battery or an alarm), **show all on the map**, **restock them all**. Overlay: new `vehicles` line (how many, seen, emptied, batteries left, alarms ringing). |
| Tests | `tests/vehicles.test.js` | 12 new: the data (types, lids, spots, loot items, placement weights), the frame maths, the box test, weighted picks and rule lookup; placement over 5 seeds: the same for a seed, 25-55 a map averaging 35-55, the campsite's sure battery, the battery share, alarms only with a battery, open ground and spots, slopes, no overlaps, clear of the station, signs and cliff, roadblocks and army trucks at checkpoints. |

### M5 part 2 follow-up: Aaron's first look at the vehicles

| Feedback | Change | Tune in |
| --- | --- | --- |
| "Looking pretty cool"; the cab only comes up to the player's sternum | Taller cabs: a car's roof is now 1.75 m (was 1.37), a pickup's 1.95, a police car's 1.78 (light bar on top), an army truck's 2.5. The glass is a touch wider and longer than each cab, so windscreens and rear windows show too. | `data/vehicles.json` `parts` |
| The door overlaps the window | Doors now run from the sill to just below the window line on every type. | `data/vehicles.json` `lids.door` |
| Couldn't set off an alarm, by looting or shooting a car | Alarms worked, but only a quarter of cars with a battery have one, and never the campsite's. **Now a bullet that hits a car with an alarm sets it off too.** New debug item: **Vehicles: teleport to the nearest alarm**. Checked: a rifle shot into an alarm truck set it ringing. | `Vehicles.onImpact()`, `config.vehicles.alarmChance` |
| (Second look, with a screenshot) It isn't quite reading as a car: it needs a windscreen's slope | Cars and police cars now have a **sloped windscreen and rear window** and pickups a sloped windscreen: a third instanced mesh (a unit wedge), one more draw call. The roof sits between them. | `data/vehicles.json` `parts` (shape `wedgeF` / `wedgeB`) |
| The boot and doors don't need to fly open; just a crack to show it's been searched | Doors open 0.4 rad (23°), boots, tailgates and canvas flaps 0.35-0.4. The bonnet still opens wide (the battery comes out through it). | `lids.*.angle` |
| A dark hollow inside an open boot or door | A near-black box shows behind any open door or boot (hidden while shut). | `lids.*.hollow`, `colours.hollow` |
| The side window should open with the door (one piece) | Each door carries its window: the glass swings with the panel. | `lids.door.extra` |
| Search from the driver's or the passenger's side | A passenger door (the driver's, mirrored) with its own spot; either door searches the cab, once (one cabin, one loot roll). Placement needs only one door reachable, so verge cars with their passenger side in the trees still count. | `Vehicles.js` `SPOTS`, `spotsOf()` |
| Every police car should have an alarm | Police cars now always have a battery and an alarm (a type's own chances beat the place's and config's). | `types.police.battery`, `alarm` |
| "Not sure what you mean by roadblock" | They're angled rows of 3-5 cars inside roadside and checkpoint clearings (and army trucks at the outpost), not cars across a pathway. Real roadblocks across pathways were offered and **declined** (Aaron: tempting fate with the zombies' pathfinding): vehicles stay off the pathway's middle. | `placement.roadside`, `checkpoint` |
| Turret coverage of the east end | **Confirmed** by Aaron: it shoots zombies everywhere round the fence, the east included. | |
| (Third look) Door panels too tall; the windscreen too upright; the ute's bonnet too low against its tray | Door panels now stop at the bonnet and boot line, with the door window (and the cab's side glass) from there up. Windscreens laid back: about 36° from horizontal on cars and police cars, 38° on utes (were 53-62°). The ute's front body and bonnet rise to 1.15 m (tray rails 1.35), its cab to 2.05 m. The army truck's window line drops too. | `data/vehicles.json` |
| (The cherry on top) Pillars for the front and rear windscreens | Painted pillars down both edges of every sloped windscreen and rear window (cars, police cars, utes): thin cubes laid along the slope, in the main cube mesh (no extra draw calls). | `parts` shape `pillarF` / `pillarB`, `config.vehicles.looks.pillarThickness` |
| Uprights and horizontal bars to finish the window frames | Bars along the top and foot of every windscreen and rear window, and upright pillars where they meet the side windows (cars, police cars, utes; the ute's flat rear window gets top and foot bars and corner uprights). Generated from each window's shape; plain cubes, no extra draw calls. | `parts` shape `frame` |
| The upright between the windscreen and passenger door was missing; the open door's black hollow overlapped the pillars and windscreen | The closed door's window stood further out than the upright and ran past it, hiding it: uprights now sit flush with the doors and each door window ends just behind the upright. The hollow behind an open door is shrunk to stop at the upright. | `parts` (`frame`), `lids.door.extra`, `lids.door.hollow` |
| Square wheels; can they be round? | Every `tyre` part is drawn as a round wheel (a 12-sided cylinder) with a grey hub, all instances of one mesh: one more draw call (plus its shadow). | `config.vehicles.looks.wheelSegments`, `hubSize` |

### M5 part 1 follow-up: Aaron's night-defence play-test

| Feedback | Change | Tune in |
| --- | --- | --- |
| The idle turret points at the house; it should face the fence | The turret's "rest" yaw was π, which is north here (toward the cabin). It now rests facing the gate, and with nothing to shoot for 2 s it swings back there at 60°/s. | `config.station.turret.idleDelay`, `idleTurnRate` |
| Can it shoot zombies at every fence panel, out to the edges? | **No, it couldn't**: everything was in range, but from its pad (4 m west, 10 m south of the fence's centre) the cabin hid the **east fence 3** completely (the one that starts torn down) and part of the east fence 2, on every seed. The pad moves to **3 m east, 17 m south** (south of the cabin, east of the gate path), where a search of pad spots found every panel in sight on 7 seeds, and the range goes 42 → 45 m (the far ends are about 42 m away). A new test checks every panel, inside and out, is in range and in sight past the cabin walls and tower legs. | `config.station.layout.turretPad`, `config.station.turret.range` |
| "If zombies trickled in one at a time it would be boring" (using the siege-wave button) | Noted for M6/M7 (how the night's zombies reach the station). | `HANDOVER.md` |

### M5 part 1: The ranger station (Session 6)

Agreed with Aaron before building: 12 fence segments plus an automatic gate; the turret from the debug menu until the Car Armory (M11); barricades, spike traps and floodlights as ways to spend spare scrap; runs start with the east fence torn up, a little scrap (30) and no charge; no carry limit or slowdown for batteries; placeholder prices; turret rounds that carve through crowds even more than the rifle's. Vehicles and battery pulling are part 2.

| Area | Files | Notes |
| --- | --- | --- |
| Layout | `src/base/stationLayout.js`, `config.station.layout` | Pure, from home and the cliff line. **Fence:** an arc of radius 28 m round a point 16 m south of the cliff, from cliff to cliff (each end tucked into the cliff's foot, so nothing walks round it): 6 segments each side of a 4.5 m **gate** due south, named by direction ("south-west fence 1"). **Cabin** (12 x 8 m) in the middle: front door south, the **comms room** along the back with the desk (radio, CCTV monitors, the ledger) and the family. **Lookout tower** 11 m east, **turret pad** south of the cabin (moved in 6b: 3 m east, 17 m south of the fence's centre, so it sees every panel), **fence box** just inside the gate. Slots: a barricade behind each segment, a spike trap outside each, floodlights on 4 segments. Zones: outside / yard / main room / comms room. Home clearing 38 -> 42 m (cleared ground outside the fence). |
| State and security | `src/base/StationState.js` | Every defence a zombie can claw is a "barrier" with health (fence 200, gate 300, barricade 150, door 300 / 600 reinforced). Repairs cost scrap in proportion to the damage (a whole segment 12); part repairs if you're short. Barricades, reinforced doors, spike traps (15 bites) and floodlights are bought with scrap. Charge 0-300 (a battery +100). **Security rating** per DESIGN.md: each segment and the gate 2 (as walls), doors 2 / 5 reinforced, charge up to 20, barricades 2, spikes 3, floodlights 4, turret 5/10/20 × ammo coverage (0 unpowered); each scaled by health. A fresh run is about 25. |
| Siege | `src/base/siegeRouting.js`, `src/ai/Zombie.js`, `EnemyManager.routeAtStation()` | Zombies within 70 m that haven't noticed you **besiege the comms room** (M4's siege goal). Each frame near the station they get a route: round the outside of the fence to a gap within 35 m (a broken segment with no barricade, a broken or open gate), else **claw the segment in front of them** (then its barricade); round the cabin's corners to the front door; claw it; then the comms door. Chasing zombies use the same routes to reach you, and leave the same way. Swipes at defences use the zombie's damage × the level's `defenceDamage`. If one gets into the comms room the run ends ("The station fell"; M7 builds the real screen). Breaches toast ("The east fence 2 is down!") with a crash. |
| Electric fence and power | `Station.zap()`, `config.station.power` | A swipe at a charged fence or gate **zaps** the zombie: blue sparks, a buzz, 15 damage and a 0.9 s stun, costing 1.5 charge (once a second per zombie). Charge drains 40 over each night, +4 per floodlight, +0.05 per turret shot. The top wires glow blue and flicker while charged, and flare when a battery goes in. |
| Turret | `src/base/Turret.js`, `turretMath.js` | Given by the debug menu (Car Armory, M11). Install it on its pad, load it (holding X loads pistol rounds first, then 4 shells, then 5 rifle rounds; the ledger loads any), set its mode in the ledger. Ammo converts by damage (pistol 1, rifle 2.5, shell 4.8 turret rounds). Slow / medium / fast: a shot every 3 / 1.5 / 0.5 s. Needs charge. Picks zombies inside the fence first, then those clawing, then the nearest, within 45 m (42 until 6b) and in sight; turns at 200°/s; rests facing the gate; **each round pierces up to 7 zombies keeping 90%**, with a heavy tracer (pooled instanced rods), muzzle flash, a loud report that brings zombies within 50 m, and kick-back. |
| Gate, doors, tower | `Station.updateDoors()`, `Player.setPlatform()` | The gate slides open and the doors swing open when you're near, and close behind you (zombies can slip through while open). Hold X at the tower's ladder to climb: you're on the 9 m platform (zombies can't reach you there), the map is revealed for 260 m. |
| Interactions | `src/player/HoldAction.js`, `Station.pickInteraction()` | Hold X / E (like digging): repair the fence, gate, doors and barricades; build a barricade (from inside); fit a battery at the fence box; install and load the turret; climb; open the ledger. Spots beat the fence line behind them; after one action you let go before the next. Damage interrupts. |
| Ledger | `src/ui/Ledger.js`, `Station.ledgerPages()` | Hold X at the comms room desk. A placeholder book with tabs **Fence, Doors, Turret, Power, Upgrades, Security** (LB / RB or D-pad left / right; rows with D-pad / stick; A does it; B closes). A summary line (scrap, security, charge, batteries). Doesn't pause the clock; your controls go to the book while it's open. |
| Buyable defences | `StationRenderer`, `config.station.spikes`, `floodlight` | **Barricades:** sandbags and planks behind a segment; zombies must break both. **Spike traps:** a board of spikes outside a segment: 12 damage and a 0.8 s slow per bite, 15 bites. **Floodlights:** at night while there's charge, a lamp, a soft cone and a pool of light outside the fence (fake light: no real light or shader change); zombie sprites in a pool are lit up. |
| Look | `src/render/StationRenderer.js` | Placeholder boxes: a dark wood cabin with a Forest Service green gable roof, glowing windows and monitors at night, a four-legged fire lookout tower with a cab roof and ladder, chain-link panels (a blended diamond-mesh texture: a faint haze from afar) that **lean as they're damaged and lie flat when broken**, the gate, doors that fall when broken (steel bands when reinforced), barricades, spike boards, floodlights, the turret (tripod, body, barrel, ammo can) and three family figures. Static parts are one merged mesh; the rest instanced. Hidden beyond the draw distance. |
| HUD | `Hud.station()`, `Station.stripHtml()` | Within 70 m of the station, a strip under the minimap: security and charge, a pip per fence segment (west to east, the gate in the middle) and door, coloured by health and **flashing while it's being clawed**, and the turret's status. The kits line adds scrap and batteries. Dusk toasts the station's security. |
| Sounds | `src/audio/Sfx.js` | Placeholders: zap, chain-link rattle, door thud, breach crash, turret report, gate motor, door, hammering, battery clunk and hum, ledger page, denied, climbing, spikes, the overrun. |
| Debug | `Station.addDebugItems()` | Give 50 scrap, give a battery, give the turret, fill / drain the charge, repair everything, break a random segment, **siege wave** (10 zombies outside the fence), overrun on/off, teleport into the compound. Overlay: new `station` line (security, charge, fence whole/down, barricades, gate, doors, turret, how many are besieging and clawing per second). |
| Collision | `src/world/collision.js`, `combat/hitscan.js` | New **wall-piece colliders** (thick segments) in the same grid as trees and rocks: bodies slide along them; walls and doors stop shots and the torch's glare check; chain-link doesn't. Any collider can be switched `off` (broken fence, open door). |
| Tests | `tests/station.test.js`, `stationParts.test.js`, `siege.test.js` | 268 tests (26 new): layout over 5 seeds (cliff to cliff, tiling, inside the clearing, zones, names), state (start, damage, repairs, building, charge, security, turret loading), routing (claw, walk to a gap, step through, barricade, round the cabin, doors, leaving), turret maths (DESIGN.md table, coverage, targeting), wall colliders (push, open doors, shots and torch, chain-link), the hold action, a zombie clawing, and EnemyManager reporting swipes at the right segment. |

### M5 part 1 follow-up: Aaron's tablet play-test (first round)

| Feedback | Change | Tune in |
| --- | --- | --- |
| The turret, gate, fence box and tower railing glare under the torch (like the rocks, drops and signs did) | Darker metals, chain-link, wood, hazard stripe, turret pad and spikes. New **glare-only shapes** the torch's glare check sees but bodies and bullets ignore (`noBody`, `glareOnly`): round the turret (once installed) and along the tower's railing; the gate's colliders count for glare too (`glare`), though shots still pass. | `config.station.look`, `src/world/collision.js` |
| Load the turret from a menu, to choose what goes in | Holding X at the turret now opens the **turret menu** (the ledger's Turret page on its own): status, fire mode, and for each ammo type "Load 1", "Load 5" and "Load all", each with what it's worth in turret rounds. The old load-a-batch-per-hold is gone. | `config.station.turret.menuAmounts`, `loadOrder` |
| Zombies in the compound go for the player, not the doors | A chasing zombie at the station goes for **whichever is nearer**: you, or the defence between it and the family (a fence segment, barricade or door). | `EnemyManager.routeAtStation()` |
| Barricades and floodlights don't appear when bought | Bug: three.js measures an instanced mesh's bounds once, on the first frame; these start with every instance hidden, so they were culled forever (their colliders still worked). Instanced station meshes are no longer frustum-culled (the compound is hidden by distance anyway). Spike traps had the same bug. | `src/render/StationRenderer.js` |
| Releasing X doesn't drain the bar | Letting go now drains the hold bar at twice the fill speed (station actions and digging sigils). | `config.station.hold.releaseDrain`, `config.digging.releaseDrain` |
| Zombies broke the fence but couldn't get in; you couldn't get out there either | Most likely the invisible barricade (above): it was there, just not drawn. Checked: with the fence and barricade both down, you walk straight out through the gap. | |
| Swap Y and LB | **RB / LB cycle weapons**; the flare (later) moves to Y. | `config.input.gamepadBindings` |
| (Second round) After dying or an overrun, zombies get stuck on the fence and you can't get into the cabin | Bug: "try again" rebuilds the station's barriers, but the fence and door colliders were keyed to the old ones, so they followed a station that no longer existed: broken segments stayed solid and the doors never opened. Colliders are now keyed by barrier id. Checked: after an overrun and a retry, the torn segment is open both ways, the front door opens and zombies come through the gap. | `Station.syncColliders()` |
| Scrolling up a menu traps the highlight at the bottom | The ledger and debug menu redrew their lists, which reset the scroll, so the highlight was pulled to the bottom edge. The scroll is kept now: moving up climbs the highlight to the top of the page before the list scrolls. | `src/ui/Ledger.js`, `src/debug/DebugMenu.js` |
| (Found while fixing) The floodlight's beam was a solid grey wall | On a black sky the screen's gamma curve lifts a few percent of white to a bright grey: the beam is now 1.2% (one side only), the pool 14%, no fog on either. | `config.station.floodlight` |

### M4: Sigils and zombies (Session 5)

Agreed with Aaron before building: a **placeholder 3D mutant** (boxes; the model is the art pass); **sigil grounds get only what matters for play** (the witch prefers them, they raise faster, a simple marker; the scarecrow, cemetery, circus scares and the crows-and-candles tells wait for an encounter session); a **stand-in for the witch plants the sigils** until M7; loot as below (pistol ammo kept in the inventory for the pistol; miner zombies wait for the mineshaft, M9); **the map screen pauses the game**.

| Area | Files | Notes |
| --- | --- | --- |
| Sigils | `src/ai/Sigils.js`, `ZombieDirector.js` | Pure state: position, the five-sigil cap, a raising timer each. At night each sigil raises zombies round itself (3-9 m out) every 18-36 s, up to **6 living zombies of its own**, then waits until one dies. Sigils on sigil grounds raise about 1.7× as often (interval × 0.6). Raising starts 2-12 s after nightfall (or after planting at night). **Zombie level = active sigils (1-5)**, map-wide. Digging one up drops the level at once, and its zombies carry on as strays. |
| Stand-in planter | `src/ai/sigilPlanter.js` | Placeholder for the witch (M7). At each dusk **from night 2** she plants **one** sigil (`planter.perNight`), up to five, so night 2 is level 1 and night 6 level 5 if none are dug up. **60% go to an empty sigil ground** (3 m off its centre), the rest 6-16 m off a pathway into the forest. Never within 160 m of home, 70 m of another sigil or 50 m of the player, nor in an encounter's clearing, home or the hut. Seeded: the same seed plants in the same places. |
| Sigil look | `src/render/SigilRenderer.js` | A patch of turned earth that follows the slope, with a glowing seven-pointed glyph and runes (an emissive map, so no light needed), and a soft green halo above it that fades as you walk up. Faint by day, plain at night. Two draw calls per sigil, only within the draw distance. |
| Sigil grounds | `src/render/SigilGroundMarkers.js` | Placeholder marker: a ring of 9 dark leaning stakes round each sigil ground (plus M3's signpost). One draw call per ground, only when near. Sigil grounds never attack the player (DESIGN.md rule): they're just faster, favoured planting spots. |
| Levels | `src/ai/zombieLevels.js`, `config.zombies.levels` | The DESIGN.md table: speed range (multiples of the player's sprint, skewed slow), horde chance (0/10/10/20/30%), mutant chance (0/0/5/10/15%), plus health, damage and notice multipliers (×1 to ×1.5, notice ×1 to ×1.4) and `defenceDamage` for M5. **Every zombie keeps its speed roll**, so when the level changes every living zombie speeds up or slows down at once; damage and notice range follow the current level too. Only level 5 has zombies that outrun your sprint. |
| Variants | `config.zombies.variants`, `data/clearingTypes.json`, `src/render/zombieSprite.js` | Citizen, police (×1.5 health; vest and cap on the sprite) and army (×1.6; olive fatigues and helmet). Each sigil uses its clearing type's mix (e.g. roadside 60% police, checkpoint 60% army); off-path sigils use the nearest clearing's. The sprite atlas has one 8-row block per variant (1056×3072); the shader picks the block, still one draw call. |
| Hordes | `EnemyManager.spawnPlanned()` | One raising of 7-15 slow zombies (0.35-0.5× sprint) in a 4 m cluster. They wander as a pack behind a leader (a new one takes over if it falls), and when one notices you the whole pack comes. |
| Mutants | `config.mutant`, `src/render/MutantRenderer.js` | A placeholder 3D giant made of boxes, 2.5 m tall: hunched, with a hump, a small sunken head and long arms (one swollen). 300 health × level (at level 3, 360: about 15 rifle body shots, 5 aimed headshots, or 8 point-blank shotgun blasts), a slow heavy swipe (0.9 s wind-up, 30 damage × level, 1.9 m reach), shrugs off 75% of stagger and 80% of knockback, its own deeper groan. At most 4 at once. Rigid but posed: sways as it walks, rears back and lunges, reels, topples sideways. One draw call plus the torch shadow. |
| Detection | `src/ai/detection.js` | One model for every enemy: **sight** 13 m at night and 38 m by day for a standing player with the torch off; the torch ×2.3 at night (barely matters by day); crouched ×0.45; sprinting ×1.2; in the brush ×0.75; behind the zombie ×0.55; all × the level's notice. Sight needs a clear line over the hills (trees don't block it). **Hearing:** walking footsteps 6 m, sprinting 18 m, crouching silent. **Gunfire:** the rifle is heard 70 m away, the shotgun 55 m, the shovel 4 m; every zombie in range comes for you. Always noticed within 2.5 m. Crouched with the torch off at night, a zombie facing you notices you at about 6 m; with the torch on and standing, about 30 m. |
| Targeting | `src/ai/ZombieBrain.js`, `pathRoutes.js` | Each zombie thinks every 0.5 s (staggered): noticed you → **chase**; else (M5) the station within its base radius → **siege** (wired, waiting for the station); else **wander**: a random walk along the pathway graph at 0.55× pace, clearing to clearing, not doubling back if there's a choice. Losing you, it keeps after you for 6 s, then **searches** where it last saw you for 10 s, then wanders. Once chasing, it keeps you in sight 1.7× further. |
| Rising and dawn | `src/ai/Zombie.js` | Raised zombies climb out of the ground over 1.6 s (they can be shot, but not stunned, while rising). **At dawn 85% sink back into the ground** over the 60 s of dawn (no corpse, no loot), never within 25 m of you or while chasing you; **15% stay as stragglers** wandering the pathways by day. |
| Loot | `src/data/loot.json`, `src/combat/loot.js`, `src/world/Pickups.js`, `src/render/PickupRenderer.js` | Every table entry rolls on its own. Citizens: shells 12%, rifle rounds 4%, scrap 10%, a first aid kit 4% (cut after Aaron's test). Police: **vest (+40 ballistic) 35%**, pistol rounds 30%, shells 6%. Army: **helmet (+20 ballistic) 35%**, **rifle rounds 20%** (the main source), scrap 10%. Mutants: 2-4 rifle rounds, shells 60%, scrap, a kit 50%, a vest 30%. Drops are small coloured boxes that bob and turn by the body. **Walk over one to take it**; a full armour bar or kit bag leaves it lying. A short "+4 shotgun shells" feed shows bottom right. Pool of 48, gone after 15 minutes. Pistol rounds and scrap are counted in the inventory (overlay `combat` line) for later. |
| Digging | `src/player/Digging.js`, `ZombieDirector.updateDigging()` | Stand within 2.2 m of a sigil: "Hold X: dig up the sigil" (E on the keyboard). 4 seconds of holding, with a progress bar and shovel sounds. Letting go pauses; stepping away starts over; **taking damage loses the progress**. When it's up: a cleansing chime, the sigil vanishes and a toast shows the level dropping. |
| Map screen pause | `src/core/Game.js` `update()` | **Aaron: the map screen pauses the game**, now including the clock. The debug menu still lets the clock run (#9). |
| Sounds | `src/audio/Sfx.js` | Placeholders (audio pass, Session 20): shovel digging, the cleansing chime, earth breaking as zombies rise, pickup click, a deeper mutant groan. Groans now only play for zombies within earshot. |
| Debug menu | `ZombieDirector.addDebugItems()`, `Combat.addDebugItems()` | **Zombie level: auto / fixed L1-L5** (cycles; auto counts the sigils); plant sigil (stand-in witch); plant sigil right here; raise zombies now (every sigil); teleport: next sigil; remove all sigils; **sigils on the map** (green diamonds on the minimap and map screen); spawn a horde near me; spawn a mutant near me; spawn 5 zombies near me (now with the local variant mix). The M2 "Zombie speed" toggle is replaced by the level. |
| Overlay | `Combat.zombieOverlayLine()`, `ZombieDirector.overlayLines()` | New `zombies` line: level, alive and active, by variant (citizen/police/army/mutant), how many in hordes, by what they're doing (chase/search/wander/rising), stragglers, and **how far you can be seen and heard from right now**. New `sigils` line: count (and how many on grounds), level, the next raising, the nearest sigil. The `combat` line adds scrap, pistol rounds and pickups lying about. |

### M4 follow-up: Aaron's tablet play-test (first round)

- **Dawn works:** all the zombies thin out at dawn as expected.
- **The mutant felt like a bit of a bullet sponge.** Workshopped with Aaron: health stays at 300, but aim now pays (below).

| Feedback | Change | Tune in |
| --- | --- | --- |
| The drops glare under the torch, like the signs and rocks did | Pickup colours are darkened to 0.2× (the near-white first aid kit and grey pistol rounds also got mid-tone colours), and drops within 6 m are now in the torch's glare check, so the beam dims when it's right on one. Checked side by side at night in headless Chromium: the boxes no longer burn out and still read as different items. | `config.pickups.albedoScale`, `glareRange`, `data/loot.json` colours |
| The mutant is a bullet sponge (Aaron: keep its health, add a weak spot) | **Headshots on the mutant do 4×** (other zombies stay at 3×). **A glowing red spot on its back does 8×:** a throbbing, unlit blob (it shows in the dark) that only shots from behind can reach, and a shovel swing from within 50° of straight behind lands on it too. It goes dark when the mutant dies. At level 3 (360 health) that's 3 rifle shots to the spot instead of 15 to the body. Weak-spot hits use the headshot blood, sound and hit marker. Checked in headless Chromium: one rifle shot to the spot from behind took a level 1 mutant from 300 to 100. | `config.mutant.headshotMultiplier`, `config.mutant.weakSpot` |
| The mutant moves too slowly and evenly (Aaron: vary its pace) | **It charges.** When it becomes aware of you (sight, a gunshot or its pack) it sprints three steps at you (3.9 m at 7 m/s, about your sprint), then two more every 3 s while it chases. Head down and bouncing as it charges, with a grunt and heavy footfalls. A stagger or a swipe ends the burst; it never charges while wandering. | `config.mutant.charge` |
| Too much ammo: a one-bullet headshot kill often paid back about six rounds, so looting would never matter | **Ammo drops cut hard.** Citizens: shells 12% (1-2), rifle rounds 4% (1). Police: pistol rounds 30% (2-5), shells 6%. Army: rifle rounds 20% (1-2), still the main source. Mutants: 2-4 rifle rounds, shells 60%. On average a kill now returns about 0.1 rifle rounds (army 0.3), so ammo runs down and encounters stay worth looting. Vests, helmets and kits unchanged; citizens' scrap down to 10%. | `src/data/loot.json` |

### M3: The map (Session 4)

Decided with Aaron before building: the map is **1 km wide by 1.4 km north to south** ("we'll see how it goes"); off the pathways, **undergrowth slows you but never blocks you** ("something the player can choose to do, but it comes at a cost"); **gentle rolling ground**; a simple but usable minimap and map screen (the final look is Session 19); runs **start at home on the cliff edge, by day**.

| Area | Files | Notes |
| --- | --- | --- |
| Map generation | `src/world/MapGenerator.js`, `mapGraph.js`, `mapGeometry.js`, `noise.js` | Pure and seeded: the same seed always gives the same map (tested on 40 seeds). **Roster:** home, the hut, the encounters that appear this run (from `data/encounters.json`: "every", "common" 75%, "uncommon" 40%, stairs 2-3), 4-6 sigil grounds (`data/sigilGrounds.json`, weighted south), then plain clearings up to 22. Each clearing gets a band, a 0-1 southness and a clearing type (`data/clearingTypes.json`). **Placement:** home 32 m south of the cliff (the compound backs onto it), the campsite 95-150 m from home, the hut at southness 0.9+, the rest at random in their bands with a 70 m gap between clearings. **Pathways:** a minimum spanning tree, plus shortcuts (shortest first) where walking the existing pathways would be 1.8× longer, never crossing another pathway or passing through a clearing. **Rules,** retried from a forked seed if broken: the hut is 4+ pathways from home (5-11 in practice); every north clearing is at most 2.5× its straight-line distance from home by pathway; the outpost is moved to a clearing 2-3 pathways from home if one exists. About 1 ms per map. |
| Ground | `src/world/GroundField.js`, `Terrain.js` | Heights from three layers of smooth noise (about ±5 m of rolling hills), levelled in clearings and smoothed along pathways, lifted onto the plateau behind the cliff. Two masks on a 2 m grid: **dirt** (bare ground on pathways and clearing centres, blended in by the ground shader from one small texture) and **open** (no trees, no undergrowth). Ground meshes are 128 m chunks; height lookups follow the mesh's exact triangles, so feet, zombies, trees and rocks sit on the drawn surface. About 1,000 rocks: round clearing edges (out of pathway mouths) and scattered through the forest, one instanced mesh per ground chunk. |
| The cliff | `src/render/Cliff.js` | A rock wall the width of the map, 26 m ± 8 m tall, wandering ±14 m north and south. Bulging face with ledges, sloping foot and ragged top; procedural rock texture. Trees grow on the plateau above it. Collision circles along its foot, and the player and zombies stay 4.5 m south of the line. |
| Forest and undergrowth | `src/render/Forest.js`, `src/world/forestLayout.js`, `src/render/mapTextures.js` | About 88,000 billboard trees and 190,000 bushes and ferns across the whole map (thicker and thinner patches), never on open ground. One atlas (3 trees + 4 undergrowth sprites); trees and bushes share each 48 m chunk's single draw call. **Undergrowth slows the player to 0.55×** (walk 4.5 → 2.5 m/s, sprint 7.2 → 4.0) **and zombies to 0.75×**, read from the ground's open mask, so the pathways matter when running. |
| Distance culling | `src/render/ChunkCuller.js` | Forest chunks, ground chunks, rocks, cliff sections and signposts are filed in a grid; only those within the draw distance are drawn, re-checked every few metres of movement. |
| Map bounds | `mapGeometry.js` `clampToWalkable()` | Replaces M1's 100 m circle. The cliff closes the north; the east, west and south edges stop 60 m inside the forest (the forest carries on beyond, darker on the map). Player and zombies use it. |
| Encounter placeholders | `src/render/Landmarks.js`, `src/data/*.json` | A wooden signpost in every clearing naming what will be there ("ROADSIDE GAS STATION / Encounter: built in M9 / Roadside clearing", "SCARECROW FIELD / Sigil ground", "RANGER STATION", "WITCH'S HUT", "BOG / Clearing"). Content comes from data only: new encounters, sigil grounds and clearing types need no code. |
| Fog of war | `src/world/FogOfWar.js` | 8 m cells over the map; walking reveals 45 m round you. `reveal(x, z, radius)` is ready for the lookout tower (M5). Saves as plain bytes (M6). |
| Minimap | `src/ui/Minimap.js`, `mapImage.js` | Round, top right. Turns with you (the way you face is up) with an N marker on the rim. Terrain, pathways and hill shading under soft-edged fog; markers for revealed clearings; living zombies in revealed areas as red dots. |
| Map screen | `src/ui/MapScreen.js`, `MapUi.js` | **D-pad up / M** opens the whole map, north up: revealed terrain, clearing markers with names (■ home, ▲ hut, ◆ encounter, ● sigil ground, ○ clearing), zombies, your arrow, percentage seen. D-pad up, M or B closes it. While it's open you can't move or fire and zombies wait (the clock runs on), like the debug menu. |
| Terrain-aware combat | `combat/hitscan.js`, `world/collision.js`, `ai/*`, `player/*` | Zombies stand at their ground height (hit boxes, sprites, glare circles, aim assist follow); shots and the torch's glare check stop where they meet the hills (`ground.rayDistance()`); rocks block between their base and top; blood lands on the slope. Flat ground stays the default in the pure functions, so the M2 tests are unchanged. |
| Debug menu | `Game.addMapDebugItems()`, `MapUi` | Teleport: next clearing (cycles all 22, with names) / home / witch's hut; reveal whole map; map screen shows the whole graph (every clearing and pathway, ignoring fog); new map (new seed); restart this map (same seed); skip to night. |
| Debug overlay | `Game.addOverlayStats()` | `player` shows your height and how deep in undergrowth you are; new `map` line: the clearing you're in or nearest (band, southness), clearing and pathway counts, % of the map seen; `world` shows tree and bush counts, chunks drawn and how long the world took to build. |
| Tests | `tests/*.test.js` | 168 tests (50 new): map generation rules over 40 seeds (roster, bands, spacing, bounds, home and campsite, hut depth, connectivity, no crossing pathways, north detours, determinism), graph maths, ground heights and masks, plateau, rays and bounds, forest and undergrowth layout, fog of war, hit-scan and torch rays on hills. |

### M3 follow-up: Aaron's tablet play-test

**Gate passed.** Aaron: the frame rate never dropped walking the map; the hills are smooth; zombies fought on slopes work; the same seed restarts to the same map; "this feels like a really good size map for the game"; "everything looks really good". Happy with the map edges as plain forest and with empty clearings ("they almost add something to the game").

| Feedback | Change | Tune in |
| --- | --- | --- |
| The minimap turns in jerks, like a jagged compass, which felt queasy | It redrew 20 times a second while the view turns at 60-90. It now redraws every frame. | `config.minimap.refreshPerSecond` (0 = every frame) |
| The undergrowth slowdown feels right, but a few more bushes would show you're in the brush | About 60% more undergrowth: 2.3 m grid instead of 2.8, thinnest patches 55% instead of 45% (about 190,000 bushes; same draw calls) | `config.forest.undergrowth.cellSize`, `densityMin` |
| The torch burns a hot spot on the signposts, like a magnifying glass (the M1 rock problem again) | The torch's glare check only saw each sign's thin post, so it never dimmed for the 2.4 m board. The board now counts, so the beam dims on it up close. The boards are darker wood with dull cream lettering. The post also stops at the board's bottom edge instead of covering the middle of the lettering. | `src/render/Landmarks.js`, `config.landmarks` |

### M2: Combat feel (Session 3)

Plan workshopped and approved by Aaron before building (rule 10). **Aaron's M2 tablet play-test: "Fighting the zombies at night was fun... real lot of fun."** M2's "done when" is met.

| Area | Files | Notes |
| --- | --- | --- |
| Combat hub | `src/combat/Combat.js` | Owns everything below and wires it through the event bus. Game calls `update()`; the player only moves while alive. |
| Weapons | `src/player/Weapons.js`, `src/combat/WeaponState.js` | Shovel, service rifle and shotgun from one table in `config.weapons`. **RB** next, **Y** previous (keys 1–4, wheel). **RT** fires (guns once per pull; the shovel keeps swinging while held). **LT** aims down sights: zoom, tighter spread, stronger aim assist. **B** reloads (rifle: whole magazine; shotgun: shell by shell, and firing cuts the reload short); an empty gun reloads when you pull the trigger. Switching takes 0.35 s. The tap that starts the game never fires. |
| Hit-scan and melee | `src/combat/hitscan.js` | Instant rays that penetrate lined-up zombies (rifle up to 4, shotgun pellets 2, losing damage each time). A zombie is a body cylinder plus a narrower head cylinder (**headshots ×3**). Tree trunks and rock bodies block shots (canopies don't). Shotgun: 8 pellets in a cone, damage falls off from 8 m to 25 m, one hit per zombie per shot. Shovel: 2.2 m reach, 70° arc, connects 0.14 s into the swing, big stagger and knockback. |
| Aim slowdown | `src/player/Player.js` | Aiming or firing slows you to 0.6× and stops a sprint (`config.player.aimMultiplier`). |
| Aim assist | `src/combat/aimAssist.js` | Light: controller look slows (to 0.45×, 0.35× aimed) over a zombie's body or head, fading out over 3°. No magnetism. Never on the mouse. Toggle in the debug menu. |
| Zombie | `src/ai/Zombie.js`, `EnemyManager.js` | One "citizen" type using level 1 rules. Pool of 25 (the active cap). Walks straight at you at 0.35–0.45× your sprint (debug: level 5 is 0.5–1.3×, skewed slow). Slides round trees and rocks, keeps apart from other zombies. Swipe: 0.5 s wind-up, 10 damage, only lands if you're still in reach. Hits flash it red, stagger and knock it back (a hit in the wind-up cancels the swipe). 60 health. Falls when killed; the body stays 20 s, then sinks away. Close zombies are fed into the torch glare check. |
| Zombie sprite | `src/render/ZombieRenderer.js`, `zombieSprite.js` | Doom-style billboard: 8 facing angles × 11 frames (walk 4, swipe 2, flinch 1, fall 4) in one procedural atlas, crisp nearest-neighbour pixels up close. One instanced draw call plus one in the torch shadow pass. Lit by the torch, casts its shadow. Dark albedo (`albedoScale`) because sprites face the torch head-on. |
| In-hand weapons | `src/player/ViewModel.js` | Placeholder box-and-cylinder models (one mesh each) tinted by the sky's light (dark at night, full colour by day), footstep-paced sway (`config.viewModel.bob`: one dip per step, 1.8 steps/s walking, 2.3 sprinting), recoil kick, pump slide, reload dip, lower and raise on switch, shovel swing, muzzle flash card. Baked shading (the torch would blow them out). |
| Effects | `src/render/CombatFx.js` | Blood spurts (more on a headshot) and dust puffs where misses land: one pooled `Points` object. A pooled muzzle-flash point light (always in the scene, intensity only, no shadow). Camera kick and shake. |
| Health, armour, healing | `src/player/Health.js`, `Armour.js`, `Inventory.js` | Health 0–100, no regen. Three armour bars soak damage ballistic → energy → nature → health. First aid kits (start with 2): **D-pad right** / H heals 30 at 10 per second; a second kit queues; nothing heals past 100. |
| HUD (placeholder) | `src/ui/Hud.js`, `style.css` | Crosshair (dot only while aiming), hit marker (yellow on headshots, red and bigger on kills), "B: reload" / "Out of ammo" prompt, health in 10 segments (pulses red at 30 or below), a healing "+", three armour bars, weapon name, ammo, reload bar, first aid count, red screen edge when hurt, "You died" screen (A / Enter: try again). |
| Sounds (placeholder) | `src/audio/Sfx.js` | **Placeholder, to be upgraded in the audio pass (Session 20).** Synthesised on the fly: rifle, shotgun and pump, shovel swing and hit, flesh hit, headshot, kill, positional zombie groans and swipes, hurt, reload clicks, empty click, switch, heal, death. |
| Debug menu | `Combat.addDebugItems()` | Spawn 5 zombies, zombie speed level 1 / 5, kill all, god mode, aim assist on/off, give ammo, give armour, give first aid kits, hurt me (−25). |
| Debug overlay | `Combat.overlayLine()` | New `combat` line: living / active enemies, level, health, armour, weapon and ammo, current aim-assist factor, kills, GOD. |
| Tests | `tests/*.test.js` | 116 tests (55 new): weapon sway pacing, armour order, healing queue, aim assist, weapon state (fire rate, magazine and shell reloads, melee), hit-scan geometry (body / head / blockers / falloff / spread / melee arc), zombie behaviour (walk, swipe timing, stagger, death, corpse, knockback, frames, speed rolls), rock-top glare. |

### M2 follow-up: Aaron's tablet play-test

| Feedback | Change | Tune in |
| --- | --- | --- |
| The weapon bobs far too fast, and vibrates at a sprint | The sway was driven by the camera's head-bob cycle and folded with an absolute value, doubling it: about 8 bounces a second walking and 13 sprinting. It now has its own footstep pace: one smooth dip per step at 1.8 steps a second walking and 2.3 sprinting (a little deeper), side to side once every two steps, easing in and out as you start and stop. The camera's head bob is unchanged. | `config.viewModel.bob` |
| By day the gun still looks black, as if in heavy shadow | The in-hand weapons had a fixed night-time brightness. Their colours now follow the sky's real light each frame (ambient plus sun or moon, as set by the clock), plus a warm fill while the torch is on and a flash when firing. They're full colour by day and dark and moonlit at night. The parts also got real colours: walnut stocks, steel barrels, bolt and shovel blade. | `config.viewModel.lighting` |
| A red X stays over the crosshair | Bug: the HUD only touches the page when a value changes, and the hit marker bypassed that bookkeeping, so after the first marker cleared, later ones were never cleared. Fixed; the marker now always fades after its 0.18 s (0.29 s on a kill). | `src/ui/Hud.js` |
| Bullets should carve through lined-up mobs | Penetration, per weapon: a rifle round passes through up to **4 zombies**, keeping 75% of its damage after each (25 / 19 / 14 / 11). Each shotgun pellet goes through **2**, keeping 50%, so a blast carries into the second rank. Trees and rocks still stop rounds. | `config.weapons.*.pierce`, `pierceKeep` |

### M1 follow-up round 2 (Session 3, from Aaron's 20-minute tablet test)

| Feedback | Change | Tune in |
| --- | --- | --- |
| Dead trees look too smooth up close at face height | The dead tree's trunk now has its own dense bark grain, round shading (lit left, dark right), long cracks and knots. | `config.forest.dead*` |
| The torch is a touch too focused to navigate by | A second, wider (48°) and dimmer spotlight round the beam: no shadow, no pattern, dims with the glare check. The edges of the view are no longer black. | `config.flashlight.spill` |
| A rock dead-on up close looks like a magnifying glass burning | The glare check treated rocks as cylinders with no lid, so a torch aimed down onto a rock's top didn't count it and the torch stayed at full power. Rock tops now count; the torch dims to about 7% there. (Aaron's screenshot didn't come through; check this on the tablet.) | `src/world/collision.js` `nearestHit()` |

### M1: Look and feel (Session 2)

| Area | Files | Notes |
| --- | --- | --- |
| Renderer | `src/render/Renderer.js` | ACES filmic tone mapping, PCF shadow map for the torch, render scale set by dynamic resolution, draw calls counted across all passes. |
| Dynamic resolution | `src/render/DynamicResolution.js` | Averages frame time over 1 s. Drops the render scale one step (0.05) after a slow window; raises one step only after 4 s on target. Bounds come from the quality preset. Target = 60 fps, or the frame cap if set. |
| Post-processing | `src/render/PostFX.js` | Bloom (bright pixels only: torch hot spot, moon), then tone mapping, then one cheap pass for colour grade (saturation, cold tint), vignette and animated film grain. Uses three.js's bundled add-ons (no new dependency). Off in the Low preset. |
| Sky and day/night | `src/render/Sky.js`, `skyPalette.js` | Gradient dome, 1,400 twinkling stars, moon with halo, sun/moon directional light, ambient light and fog colour, all blended from hour-keyed colours in config and driven by the Clock. The sun rises in the east, crosses the south and sets in the west. |
| Fog | `Sky.js` | Linear fog ending at the preset's draw distance (fog end = draw distance, as DESIGN.md asks). Colour follows the sky's horizon. |
| Forest | `src/render/Forest.js`, `src/world/forestLayout.js` | About 3,500 billboard trees from a seeded jittered grid around a 16 m clearing. Camera-facing sprites (rotate about the vertical only) with wind sway, from one 3-variant atlas (two conifers and a dead tree). Grouped into 32 m chunks; chunks beyond the draw distance aren't drawn. Trees cast and receive the torch shadow through a matching depth material. |
| Ground | `src/world/Terrain.js` | Tiled procedural forest floor, a soft dirt patch in the clearing, and 9 rocks (instanced; they cast shadows and block the player). |
| Placeholder textures | `src/render/proceduralTextures.js` | Tree atlas, ground, clearing, moon and torch cookie, all drawn on canvases from the seed. Swapped for real art in the art pass. |
| Flashlight | `src/player/Flashlight.js` | Spotlight held low and to the right with a procedural "imperfect torch" pattern; the one real-time shadow. The beam lags the view slightly so it feels hand-held. D-pad left / L. |
| Player | `src/player/Player.js`, `Stamina.js` | Walk 4.5 m/s (the speed signed off in M0), sprint ×1.6 using stamina (L3 click latches; Shift holds), toggle crouch ×0.5 with eased eye height (R3 / C), jump (A / Space), acceleration and deceleration, subtle head bob, and collision against trunks and rocks. |
| Collision | `src/world/SpatialGrid.js`, `collision.js` | Circle-vs-circle on the ground plane with a spatial grid for lookups; the player slides round trunks. A boundary keeps the player within 100 m of the clearing. |
| Quality presets | `config.quality` | Low / Medium (default) / High: render-scale bounds, draw distance, torch shadow and its resolution, post-processing, bloom, frame cap. Switchable live in the debug menu. |
| Debug menu | `src/debug/DebugMenu.js` | Now has: toggle overlay, skip to next phase, time speed ×1/×10/×60, quality preset, frame cap (off/30/60), dynamic resolution on/off, close. |
| Debug overlay | `src/debug/DebugOverlay.js` | Adds the current render scale, quality line, player line (stance, speed, stamina, position) and world line (tree count, torch on/off). |
| Tests | `tests/*.test.js` | 61 tests (31 new in M1): sky keyframes and sun path, dynamic resolution, stamina, collision and spatial grid, forest layout (determinism, empty clearing, minimum spacing), clock skip and time scale. |

### M0: Project skeleton (Session 1)

Vite + three.js + Vitest; GitHub Pages deploy on every push to `main` (tests must pass first); `config.js` with every tuning number; Game loop and phases; Clock; EventBus; seeded Rng; Input for the Xbox controller and keyboard/mouse with dead zones, hot-plug and active-device tracking; tap-to-start with fullscreen, landscape lock, "tap to resume" and screen wake lock; debug overlay and menu. M0's test scene and free camera were removed in M1.

### M1 follow-up: Aaron's tablet play-test feedback

Aaron's verdict on M1: "really great work". He asked for three changes, now made:

| Feedback | Change | Tune in |
| --- | --- | --- |
| Trees look like flat green and brown cutouts | Each tree sprite now has fine dark dappling (denser on the shadow side) for depth, speckles in five leaf greens, a different green per branch tier, and bark streaks on trunks and dead trees. | `config.forest.dapple*`, `needleVariants`, `bark*` |
| Rocks look too blocky (dodecahedrons) | Rocks are smooth, lumpy stones: a subdivided sphere bent by overlapping waves, smooth shading, each one stretched differently. Darker, mossier grey. | `config.terrain.rocks` |
| The torch glares back too brightly from close trees and rocks | The torch checks 7 rays across its beam each frame. If it's hitting a nearby surface head-on (harder than a head-on surface 8 m away), it dims smoothly to match. The ground ahead, hit at a glancing angle, keeps the full beam. The overlay's `world` line shows the torch's current strength and the distance to the surface causing it. | `config.flashlight.glare` |

## What works (verified)

- `npm run dev`, `npm run build` and `npm test` (**283/283**) all pass.
- **M5 part 2 in headless Chromium (software GPU, about 10 fps, so no timings):**
  - Seed 1234: 47 vehicles (29 with a battery). The campsite pickup next to home: "Hold E: search the cab" searched it (+3 scrap, the door swung open); "lift the bonnet" raised it; "pull the battery" gave +1 battery (the HUD's kits line shows it) and left "No battery in this one".
  - An alarm truck: opening its truck bed set the alarm off (the overlay showed ALARM x1, the lamps flashed at night); a zombie 34 m away switched to chasing and closed in; pulling the battery stopped it. "Try again" restocked everything and silenced the alarm.
  - The map screen and minimap show seen vehicles as blue oblongs, distinct from the dashed pathways.
  - **Draw calls at home by day: 71 with vehicles, 68 without** (one cube mesh, one lamp mesh, one shadow pass). No console errors.
- **Turret fixes:** with no target it turns back to face the gate; the new test passes on 5 seeds (every panel in range and sight).
- **M5 follow-ups in headless Chromium:** barricades, spike traps and floodlight poles show when bought; the floodlight's pool and beam read at night; the turret is dark under the torch; holding E at the turret opens its menu and loading 7 pistol rounds gave 7 turret rounds; with a segment and its barricade down the player walks out through the gap.
- **M5 part 1 in headless Chromium (software GPU, about 10 fps, so no timings):**
  - Seed 1234: the fence runs cliff to cliff with the gate south; the east fence starts torn (2 segments down, one leaning); security 24.9.
  - Repair all, a barricade, spikes, floodlights, a reinforced door, a battery, the turret installed and loaded (40 rifle rounds = 100 turret rounds) all worked; security rose to 72.
  - A siege wave at night: zombies walked to the fence and clawed it, got zapped (sparks, charge falling), broke a segment ("The west fence is down!"); **the turret fired and killed them** (22 rounds spent).
  - With nobody defending: 6 zombies came round to the torn east gap, through it, round the cabin, broke the front door, then the comms door: **"The station fell"**; A / Enter restarted with a fresh station.
  - Real keys: hold E at a broken segment repaired it; at the fence box fitted a battery (+100); at the desk opened the ledger; arrows changed tabs and rows, Enter bought, Backspace closed; W didn't move the player while it was open; the front door and gate opened as the player walked through; an intact fence stopped the player; the ladder climbed the tower (7.5 m up) and revealed the map.
  - Floodlit zombies show in the pools at night; chain-link reads as a mesh up close and a haze from afar; the charged wires glow.
  - **Draw calls: 77-86 by day at home, 57-82 at night** (budget ~100). No console errors (only the missing favicon's 404).
- **M4 in headless Chromium (software GPU, so no timings for the tablet):**
  - The stand-in planted five sigils on seed 1234 (four on sigil grounds, one in the woods by the gas station) and refused a sixth; level went to 5. Five sigils on six other seeds all follow the planting rules (tests).
  - At night the sigils raised zombies that climbed out of the ground and wandered off; a police zombie came from the roadside mix. The glyph reads clearly at night, faintly by day; the halo fades as you walk up.
  - A mutant and a horde spawned and came for the player; the mutant falls sideways when killed and drops its loot. Police (vest and cap) and army (helmet) sprites read correctly.
  - Killing 12 police and army zombies dropped 14 pickups; walking over them took vests and helmets up to 100 ballistic, rifle rounds and pistol rounds, with the pickup feed; the rest stayed lying (full armour bar).
  - Holding E on a sigil showed "Hold E: dig up the sigil", then "Digging up the sigil…" with the bar, dug it up and toasted.
  - The map screen stopped the clock.
  - At dusk on day 2 the stand-in planted one sigil.
  - **64 zombies (the whole pool), all thinking and moving: about 0.1 ms of simulation per frame**, 47 draw calls at night (budget ~100).
  - No console errors.
- `npm run preview` and the production build at `/WitchHunt/` ran with no console errors in M3 (not re-checked in M4 beyond `npm run build`).
- **M3 in headless Chromium (software GPU, so no timings):**
  - Every seed tried generates a valid map (200 seeds in the generator check; 40 in the tests), almost always on the first attempt. The world (map, ground, 88k trees, 120k bushes, rocks, cliff, signposts) builds in about 0.5 s; JS heap about 97 MB.
  - **Draw calls 45-67 at night with the torch shadow** (budget ~100), checked standing at all 22 clearings and the middle of all 26 pathways; at most 63k triangles.
  - Walking 4.5 m/s on a pathway, 2.5 in the undergrowth; sprinting 7.2 / 4.0.
  - Zombies spawn on the hills, walk at 0.75× in undergrowth, show on the minimap; rifle hits on a zombie standing 1.2 m higher land and kill.
  - Screenshots: the cliff face up close, a pathway by day and night, the forest with undergrowth, the minimap turning with the view, the map screen with fog and labels.
- **M1 performance gate passed on the tablet (Aaron):** a steady 60 fps for 20+ minutes of night walking at Medium, the tablet warm but not hot. Locking and unlocking, controller off and on, and leaving fullscreen all recover.
- **M2 on the tablet (Aaron):** fighting zombies at night is fun. **60 fps the whole time, even with 20+ zombies spawned at once.** B always reloads and never leaves fullscreen. The torch is enough to fight by. The dead trees look "much, much better" and the rock glare is gone.
- **M2 follow-ups on the tablet (Aaron, second test):** the footstep-paced weapon sway, the gun's colours by day, the hit marker clearing, and penetration all work ("being able to shoot through the crowd was really enjoyable").
- **M2 in headless Chromium with a simulated Xbox controller:**
  - RT fires the rifle and shotgun and hits zombies (body and head); LT zooms; B reloads; RB / Y cycle weapons both ways; the shovel connects and kills; D-pad right uses a kit; zombies walk in, swipe and hurt the player; death shows the screen and A restarts.
  - Screenshots: all 8 facing angles and the fall frames read correctly; zombies are dark and lit by the torch; crisp pixels up close; the red hurt edge, hit markers and HUD.
  - Draw calls 48–57 at Medium with 5 zombies (budget ~100).
- **On the tablet (Aaron, M0):** the live build loads, controller movement and look feel good, and every button shows the right action.
- **Headless Chromium with a simulated Xbox controller (M1):**
  - L3 click latches sprint at 7.2 m/s; stopping clears it; stamina drains and refills.
  - R3 toggles crouch; A while crouched stands up; A otherwise jumps.
  - D-pad left toggles the torch.
  - Hold View + D-pad down opens the debug menu without firing "radio". Quality switches live (High shows the torch shadow at 1024 px).
  - Walking into a trunk stops exactly at player radius + trunk radius and slides round it.
- **Screenshots (software GPU):**
  - Night: moonlit tree silhouettes against stars, a warm torch beam picking out trees and rocks.
  - Day: blue-grey fog, lit pines and dead trees, readable ground.
  - Dusk: warm horizon.
  - Draw calls: 53–55 at medium (budget ~100).

## Not verified

- **M5 part 2 on the tablet: verified by Aaron** (looks, looting, alarms, map markers, fights among cars, the turret's east end). Not yet tuned: loot amounts, how often batteries and alarms turn up (M14 balance).
- **M5 part 1 on the tablet: mostly verified** (Aaron: a night at the station is great, no fps drop, no warm tablet, prices pretty balanced, ledger good, nothing stuck). Still open: whether a night at the station is tense and readable, frame rate with the compound in view (draw calls are up to the mid-80s by day), the ledger on the controller (LB / RB tabs), whether the floodlights and wires read at night, the turret's spectacle, prices and health numbers.
- **M4 on the tablet** (Aaron's play-test): frame rate with many zombies and up to five sigils visible, whether the level changes are visible enough, whether the detection numbers feel fair, the mutant's look and toughness, and the sigil glow at night on the real screen.
- The dawn thinning over a real 60 s dawn (now checkable with the debug fast-forward).
- **M6 on the tablet: verified by Aaron:**
  - the tiers (480 zombies, 90 fps) and the marches in waves;
  - nights away resolving fairly, the radio calls, the forecast, the autosave;
  - the 20-minute gate.

  Hiding at 6 m and the recalibrated forecast: confirmed by Aaron (Session 8).
- The M3 follow-ups (smooth minimap, more bushes, sign glare) on the tablet.
- How long the world takes to build on the tablet (about 0.55 s on a desktop CPU).

- Whether the placeholder sounds play on Android Chrome (Aaron didn't mention them either way).
- Feel numbers (aim assist strength, recoil, zombie damage, headshot ×3) passed a first play-test; they get their real tuning in M14.
- Headless runs use a software GPU (~10 fps), so its timings say nothing about the tablet.

## Stubbed / placeholder (by design)

- Vehicles are placeholder boxes; the bonnet, boot and door animation is a hinge swing (no arms or tools on screen). Vehicle state isn't saved yet (saving is M6/M12); each vehicle keeps its own "looted" flags for when it is. Encounter set dressing (the gas station's pumps, the outpost's sandbags) will move or replace cars when those encounters are built.
- The turret comes from the debug menu until the Car Armory (M11). The forecast panel and alarm banner are placeholders (the final HUD is Session 19's).
- "The station fell" is a placeholder defeat screen (M7 builds the real one). The family are placeholder figures that never move or speak (M8).
- The ledger is a placeholder book (the pixel-font ledger is Session 19's).
- All art is procedural placeholder (tree sprites, ground, torch pattern, moon). The art pass replaces it.
- Encounters are signposts only: each is built in its own milestone (M5 home, M7 hut, M9-M11 encounters). Sigil grounds work for play (M4) but look like a signpost and a ring of stakes; their set dressing and twists (the scarecrow that turns its head, open graves, stick figures, the hanging oak's ropes, the circus sideshows) and the tells before she uses one (crows, turned earth, candles) are for an encounter session.
- **The witch (M7 steps 1-4)** roams, plants, fights and lays traps; the hut stands and can be blown up. Destroying it only brings her out so far (the final battle is step 5). Only her health is saved (traps, charges and the hut are step 6). Killing her shows a placeholder victory screen.
- The mutant is a placeholder of boxes; the miner variant waits for the mineshaft (M9); the siege goal waits for the station (M5).
- Encounter placement hints not yet honoured: the gas station "on a road edge" (no roads yet), the mineshaft "hillside edge", stairs "off-path", the Bigfoot cave "rocky clearing or path edge", the crashed plane "off a pathway" (OPEN_QUESTIONS #42).
- Clearing types (bog, graveyard, roadside, checkpoint, standing stones) tint the map, name the signpost and set the zombie variant mix (M4); their look arrives with the style passes.
- The east, west and south map edges are an invisible line inside dense forest (Aaron: fine as it is).
- The HUD is a placeholder (no pixel font, clock or glyphs); the minimap and map screen are simple placeholders (final look Session 19); no pause menu.
- **The save is M6's dawn autosave only:** no save and quit, no pause menu (M12). It leaves out zombies, pickups and the random streams (OPEN_QUESTIONS #102). The Continue / New run screen is a placeholder until the main menu (M9).
- **Nights while away are an abstraction:** groups held at the fence, damage at a rate, the turret's rounds turned into kills. Its numbers are first-pass (M14 tunes them).
- Pathfinding is pathways plus straight lines: a chasing zombie walks straight at you and slides round trunks; it can snag on a rock or a dense cluster.
- The zombie sprite, the in-hand weapons and every sound are placeholders (art pass M13, audio pass Session 20).
- Pistol rounds and scrap are counted but have no use yet (the pistol and building arrive later); the inventory screen is later.
- Not built from "Visual ambition": ground mist layers, height fog, fake light shafts, fireflies and other particles, normal-mapped blended ground, distant impostor tweaks, retro pixel filter. These belong to the style passes (OPEN_QUESTIONS #21).
- Billboard trees look like flat cards when you stand right next to one, the expected trade-off of sprites (the decision Aaron made). Final art can soften this with wider, bushier sprites.
- The placeholder drawing proportions in `proceduralTextures.js` (tier shapes, gradient stops) are hard-coded rather than in config, since the whole file is thrown away in the art pass. Colours, counts and sizes are in config.

## Dependencies

Only `three` (runtime), `vite` and `vitest` (dev). Post-processing and geometry merging use three.js's own `three/addons` modules, which ship inside the `three` package. Sounds use the browser's Web Audio API.

## Known issues and risks

- **M5 part 2: a ditched car can sit in the bushes** (bushes grow up to 0.35 open; vehicles need 0.3 at their corners): the car pokes through a bush. Trees and rocks never overlap one.
- **M5 part 2: an alarm that runs flat kills the battery** (60 s). That's a choice to make the alarm urgent; OPEN_QUESTIONS #84.
- **M5 part 2: vehicles near sigil grounds** can sit where a sigil gets planted. Digging always comes first, so the prompts don't clash.
- **M5 part 2: the turret pad moved**, so it now stands in the yard about 3 m east of where a run starts (the player spawns beside it).

- **M5: draw calls at home are up to the mid-80s by day** (the compound adds about 16 plus shadows). Levers: drop the static mesh's torch shadow, merge the floodlight meshes, cull the interior when outside.
- **M5: zombies under the tower** gather below you and swipe at the air (you're out of reach). They don't claw the tower's legs.
- **M5: zombies don't attack the turret**, and see through walls (sight only checks the hills, as in M4).
- **M5: the turret's report alerts zombies to come for the player** (it uses M4's gunfire alert), so firing at home draws the night in. That's probably right, but it makes the turret loud.
- **M5: a held-open gate lets zombies in.** It's a choice: don't stand in the gateway with a horde outside.
- **M5: the home clearing grew 38 -> 42 m**, so every seed's map is a little different from M4's.
- **M4: zombie numbers on a busy night.** Up to 64 zombies (five sigils × six each, plus hordes) all simulated and drawn; the headless check had 64 cost about 0.1 ms of simulation and 47 draw calls, but the tablet hasn't seen it. Levers: `zombies.poolSize`, `sigils.perSigilCap`, `sigils.spawnInterval`, `zombies.horde.countMax`. M6's tiers are the real fix.
- **M4: the mutant is tanky** (360 health at level 3). If it feels like a sponge rather than a mini-boss, lower `mutant.health`.
- **M4: zombies see through trees.** Sight only checks the hills, not trunks (88,000 of them). In the forest the brush multiplier (×0.75) stands in for cover. If being spotted through thick woods feels unfair, lower `detection.undergrowth`.

0. **M3 memory and load:** about 210,000 tree and bush sprites and 88,000 colliders are plain JS objects (heap about 97 MB). Fine on the tablet's RAM, but if load time or memory becomes a problem, the levers are `forest.undergrowth.cellSize` (fewer bushes), `forest.cellSize`, or packing the layouts into typed arrays.

1. **M2 added two lights** (the torch spill and the muzzle flash). The tablet held 60 fps with them and 20+ zombies. If later milestones push the frame rate down, the levers are: `flashlight.spill.intensity: 0` (or remove the spill), then the M1 levers: the Low preset; shadow map 512 to off; `bloom: false`; a lower `drawDistance`; bigger `forest.cellSize`.
2. **Zombie sprites are lit head-on by the torch**, so their colours are pulled down with `zombies.albedoScale`. The final pre-rendered sprites need the same care (dark, mossy albedos).
3. **The zombie atlas is drawn mirrored for angles 5–7**, so its painted moonlight comes from the right on those rows. Invisible at night; the art pass replaces it.
4. **Switching quality or toggling the torch can hitch once** (around 100 ms on mobile) while shaders compile for the new light setup. Later toggles are instant.
5. **Android "Back" on the B button:** confirmed fine in M2 (B always reloads, never leaves fullscreen).
6. **The Xbox (Guide) button** belongs to Android and the browser.
7. **Chrome only exposes a controller after a button press on it.**
8. **The controller can't start the game**: the first start needs a tap (browser rule for fullscreen).
9. **View still fires `inventory` on press** during the View + Menu and View + D-pad down combos. Harmless until the inventory screen exists (OPEN_QUESTIONS #4).
10. **Frame times are CPU-side only.** "render" is the CPU cost of submitting the frame, not GPU time.
11. **Desktop Esc** releases the mouse and exits fullscreen, showing "Tap to resume". Expected.
12. Production sourcemaps are deployed (~3 MB, only downloaded with devtools open) for remote debugging via `chrome://inspect`.

## What M7 needs next

Session 8 (AI Programmer): **the witch, the playable loop** (DESIGN.md M7). It covers:
- witch states, planting at sigil grounds, interruption, fight or flee, wounds and traps;
- the hut, explosives (debug-given), the final battle and blood night;
- the ending and defeat screens.

**Vertical slice:** a complete run from day 1 to killing her (or dying).

- **Replace the stand-in planter** (`ZombieDirector.plantForNight()`, `plantOne()`, `ai/sigilPlanter.js`).
  - `chooseSigilSpot()` already follows her rules: mostly empty sigil grounds, else off a pathway, away from home and other sigils.
  - `director.plant(spot)` is the one way to put a sigil down (renderer, events, variants).
- **Simulation tiers:** she should follow them (DESIGN.md "The station and the witch follow the same tiers").
  - `EnemyManager` runs zombies only; the witch will be her own system.
  - `ai/simTiers.js` (`tierFor()`) and `ai/marchRoutes.js` (shortest pathway routes, `remaining()`) are reusable as they are.
  - `PathRoutes` gives random walks.
- **Danger and the forecast:** `base/danger.js` sums sigils. If she affects the night (summons, a blood night), add her there so the forecast stays honest.
- **Blood night:**
  - "The station is still attacked (simulated)": `NightWatch` resolves attacks while the player is away. The hut is far beyond 150 m, so a fight there counts as away.
  - The clock freezes for the fight: NightWatch's attacks run on game time, so freezing the clock alone won't stop them. Decide whether they should.
- **The defeat screen:**
  - `Combat.overrun(reason)` and `die()` show the placeholder death screen.
  - A on it emits `run:newRequested` (Game deletes the save and reloads on a fresh map).
  - `station:overrun` and `player:died` delete the save.
- **The save** (`core/saveData.js`): add her state, wounds, the hut and explosives. Bump `SAVE_VERSION` if old saves can't be read.
- **Detection:** `ai/detection.js` (`notices()`, `isHidden()`) is the shared model; she should use it. Hidden = crouched, torch off, in the brush: 6 m.

## What M5 part 2 needed (done)

- Batteries end to end (`inventory.addBattery()`, `Station.fitBattery()`), the hold-X helper, loot tables, `combat.promptSources`: all used as planned.

## What M5 part 1 needed (done)

- Zombie hooks: `enemies.station` (now the station's route hook: `{ x, z, baseRadius, routeRadius, reach, route() }`), the level's `defenceDamage`, `enemies.living` and `enemies.damage()` for the turret, `enemies.alert()` for its noise. Scrap counted in `combat.inventory.scrap`.

## What M4 needed (done)

M4, **Sigils and zombies** (Session 5, AI Programmer): sigils, night spawning, five-sigil cap, levels 1-5, variants, speed variance, hordes, mutants, loot, digging, sigil grounds, detection model, targeting. Done when raising the level by debug visibly changes the night.

- M3's gate is passed (Aaron: no frame drops walking the map).
- `game.world.map.clearings` lists every clearing with `kind` ('home', 'hut', 'encounter', 'sigilGround', 'wild'), `band`, `southness`, `clearingType` and `hopsFromHome`. Sigil grounds are `kind: 'sigilGround'`. Clearing types carry a zombie variant mix in `data/clearingTypes.json` (`variants`).
- `game.world.map.paths` (polylines) and `edges` (with lengths) are the pathway graph for "random walk along the pathway graph" targeting; `mapGraph.js` has `adjacency`, `hopCounts` and `graphDistance`.
- `game.world.ground`: `heightAt`, `undergrowthAt`, `openAt`, `clamp`, `rayDistance` (line of sight over hills).
- Zombies already stand on the ground (`zombie.y`) and slow in undergrowth (`moveScale`).
