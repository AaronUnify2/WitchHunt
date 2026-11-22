# Audio cue sheet

## Test 1: the title screen (done)

The game opens on "Tap to start"; that tap starts the title music, which loops
(its end crossfades into its start) until a choice is picked, then fades out in
under a second. **New Run** also plays a shriek far off in the woods.

| File | Folder | Suno tool | Prompt |
|---|---|---|---|
| `title.mp3` (any length; 2-3 min is ideal) | `public/audio/music` | Normal song, **instrumental** | Spooky Appalachian folk horror, a witch's lament in the dark woods, slow detuned fiddle and fingerpicked banjo over a low droning cello, a faint wordless female hum like a distant witch singing, creaking wood and wind, sparse, haunting, creeping dread, minor key |
| `titleShriek.mp3` (3-5 s) | `public/audio/sfx` | **Sounds**, one-shot | A single distant witch's shriek far away in a dark forest at night, inhuman and piercing, echoing off the hills and trees, long fading reverb tail, no music |

Until they're uploaded: the menu is silent and New Run plays a placeholder shriek.

**Done:** both uploaded. The shriek now plays inside the cold open (below), not on the tap.

## Test 1b: the cold open's portal (done)

6 seconds of government CCTV: the portal's Roswell blue overrun by the witches' green,
then a whiteout and the feed dies. Timeline: **0 s** the hum starts (blue, steady) ·
**1 s** green creeps in · **1.9 s** the surge · **2.2 s** the shriek · **2.3-4 s** fully
green, the agents thrown back · **4.2 s** whiteout · **4.7 s** static · **5.4 s** black.

| File | Folder | Suno tool | Prompt |
|---|---|---|---|
| `portalHum.mp3` LOOP, 6-10 s | `public/audio/sfx` | **Sounds**, loop | Unstable interdimensional portal humming, deep throbbing electrical drone, warbling sci-fi energy field with crackling static and a low pulsing wobble, ominous, no music, seamless loop |
| `portalSurge.mp3` 3-5 s | `public/audio/sfx` | **Sounds**, one-shot | Interdimensional portal violently tearing open, a rising roaring whoosh of energy into a deep bass boom, electric arcs crackling and snapping, otherworldly distorted howl, chaotic, no music |

Until they're uploaded, synthesised stand-ins play in their place.

---

## Test 2: atmosphere, then enemies (18 downloads, 6 spare for retakes)

**Where we are (Nov 22):** made from the first version of this list, under its names,
which all work as they are: `ambDay`, `ambNight`, `ambShopInside`, `dayCall_1`, `dayCall_2`,
`nightCall_1`-`3`, `windGust_1`, `windGust_2`, `stingMutant`, `stingWitch`, the groans and
`charge`. The first groan file has two groans in it, so it goes up as `groan_set.mp3`.
**Still to make:** rows 12-18 below (multi-take sets) and the night music (row 9).

Guns stay as they are for now. Atmosphere first, then enemies, in the order to make
them: if the Suno limit runs out partway, the most useful are done. **Built and waiting
on the files:** each one plays as soon as it's uploaded.

**How the atmosphere works:** a steady bed loops under everything (day, night, or
inside the shop), and separate one-off calls (crows, owls, things far off in the dark)
play at random every 20-60 s, from random directions. So the beds are textures with
nothing distinctive in them (a 10 s loop with a crow in it would caw every 10 s); the
character comes from the calls. Gusts of wind come and go the same way. After dark,
outdoors, the night music creeps in. All of it goes quiet in the CCTV-style cutscenes.

**Sets (several sounds in one download):** a file named `<name>_set.mp3` is cut into
separate takes wherever it goes quiet, and the game picks one at random each time.
Ask Suno for a pause between them (the prompts below do). If it runs them together,
send me timestamps (e.g. "0:01-0:03, 0:05-0:07") and I'll cut it there instead.

**Upload:** rename to the exact name, MP3, into `public/audio/sfx` (the stings and the
night music into `public/audio/music`). Don't worry about length, silence or loudness.

### Atmosphere (9)

| # | File | Suno | Where | Prompt |
|---|---|---|---|---|
| 1 | `ambDay.mp3` | Sounds, **loop** | Outdoors by day, everywhere | Quiet empty forest by day, soft steady wind through pine needles, faint rustling leaves, distant rushing breeze, calm but lonely, no birds, no animals, no music, seamless loop |
| 2 | `ambNight.mp3` | Sounds, **loop** | Outdoors at night, everywhere | Dark forest at night, dense steady crickets and insects, low cold wind, faint creaking trees, eerie stillness, no music, seamless loop |
| 3 | `ambShopInside.mp3` | Sounds, **loop** | Inside the gas station's shop | Inside a dark abandoned convenience store, low hum of a dying refrigerator, faint fluorescent buzz, building creaks, muffled wind outside, tense and still, no music, seamless loop |
| 4 | `dayCall_set.mp3` | Sounds, one-shot | Now and then by day | Three separate distant forest sounds with two seconds of silence between each: a few crow caws echoing, then a dry branch snapping, then a woodpecker knocking far away, no music |
| 5 | `nightCall_set.mp3` | Sounds, one-shot | Now and then at night | Three separate distant night forest sounds with two seconds of silence between each: a lone owl hooting, then an animal screaming fox-like but wrong, then a long low inhuman howl echoing across a valley, no music |
| 6 | `windGust_set.mp3` | Sounds, one-shot | Gusts now and then; the witch leaving | Three separate gusts of wind with two seconds of silence between each, rushing through forest trees, branches creaking, each rising and dying away, no music |
| 7 | `stingMutant.mp3` | Song, **instrumental** (music) | The mutant unfolds in the shop | Horror jump-scare sting, sudden dissonant orchestral stab with screeching strings, then a low pounding drum and fading drone |
| 8 | `stingWitch.mp3` | Song, **instrumental** (music) | The witch watching from across the road | Eerie Appalachian folk horror, a single detuned fiddle and a whispering wordless female hum over a low drone, slow and haunting, fades into wind |
| 9 | `night.mp3` | Song, **instrumental** (music), 2-3 min | Outdoors after dark (quiet, under everything) | Slow dark ambient horror drone, instrumental, very sparse, low sustained cello and bowed bass, distant detuned fiddle harmonics, faint wordless female hum far away, no drums, no beat, no melody, creeping dread, night in the Appalachian woods |

### Enemies (9)

| # | File | Suno | When | Prompt |
|---|---|---|---|---|
| 10 | `groan_set.mp3` | Sounds, one-shot | Zombies nearby | Four separate rotting zombie groans with two seconds of silence between each, low wet gurgling moans, rasping, hungry, each different, no words, no music |
| 11 | `charge.mp3` | Sounds, one-shot | A zombie lunges | Zombie shrieking as it lunges to attack, raspy furious scream, short, no music |
| 12 | `swipe_set.mp3` | Sounds, one-shot | A zombie (or the mutant) swings | Sound effects sample pack: three separate one-shot zombie claw swipes, each isolated and followed by two full seconds of silence. Take 1: a fast clawed swipe through the air with a raspy grunt. Take 2: a heavier lunging slash with a snarl. Take 3: a quick double swipe with a hiss. No music |
| 13 | `rise_set.mp3` | Sounds, one-shot | The dead clawing out of the ground | Sound effects sample pack: three separate one-shot sounds of corpses rising from graves, each isolated and followed by two full seconds of silence. Take 1: earth cracking open and a choked gasp. Take 2: hands clawing up through dirt and roots with a wet groan. Take 3: soil crumbling away and a rattling first breath. No music |
| 14 | `kill_set.mp3` | Sounds, one-shot | A zombie drops | Sound effects sample pack: three separate one-shot sounds of dead bodies collapsing to the ground, each isolated and followed by two full seconds of silence. Take 1: a heavy limp thump on dirt. Take 2: a body crumpling onto gravel with a last wheeze. Take 3: a corpse falling face down with a wet slap. No music |
| 15 | `mutantRoar_set.mp3` | Sounds, one-shot | The mutant unfolding in the cutscene | Sound effects sample pack: two separate one-shot roars of a huge mutated creature, each isolated and followed by two full seconds of silence. Take 1: rising to full height with bones cracking and stretching into a deep guttural bellow. Take 2: a furious wet roar that breaks into a snarl. Terrifying, no music |
| 16 | `mutantGroan_set.mp3` | Sounds, one-shot | The mutant charging and fighting | Sound effects sample pack: three separate one-shot growls of a huge mutant creature, each isolated and followed by two full seconds of silence. Take 1: a deep wet guttural snarl. Take 2: heavy huffing breaths and a low rumble. Take 3: an angry grunt as it charges. Menacing, no music |
| 17 | `mutantSlam_set.mp3` | Sounds, one-shot | The mutant landing a leap | Sound effects sample pack: three separate one-shot impacts of something huge slamming into the ground, each isolated and followed by two full seconds of silence. Take 1: a deep crunching thud on dirt. Take 2: a heavy slam on concrete with debris scattering. Take 3: a booming landing that shakes the ground. No music |
| 18 | `bodyThud_set.mp3` | Sounds, one-shot | Tom thrown out of the shop onto the forecourt | Sound effects sample pack: three separate one-shot sounds of a man thrown hard onto the ground, each isolated and followed by two full seconds of silence. Take 1: hitting concrete with a grunt of pain. Take 2: landing and skidding across gravel. Take 3: a heavy body impact with the wind knocked out of him. No music |

**Already made a file with several takes under a numbered name** (e.g. `groan_1.mp3` with two groans in it)? Rename it to `groan_set.mp3`: the `_set` ending is what tells the game to cut it apart. A file with one sound in it keeps its plain or numbered name.

### The mutant cutscene (5.2 s), as built

| Time | What happens | Sound |
|---|---|---|
| 0 s | The torch finds it at the back of the aisle | the shop's bed (the outside one fades away as he steps in) |
| 0.9 s | It unfolds to full height | `stingMutant` + `mutantRoar` |
| 2.3 s | The jab knocks Tom back down the aisle | `swipe` + Tom's `hurt` |
| 2.75 s | It charges | `mutantGroan` |
| 3.25 s | The backhand throws him out through the door | `swipe` |
| 4.0 s | He hits the forecourt | `bodyThud`; the outside bed fades back in |

The witch's cutscene at the gas station plays `stingWitch` as she appears (0.3 s).

---

## Later: guns and hits (not yet)

`rifle`, `shotgun`, `pump`, `pistol`, `reload`, `loaded`, `empty`, `swing`, `shovelHit`,
`flesh` (x3), `headshot`, `impact` (x2), `hurt` (x2); and the gas station's `door`,
`battery`, `radioStatic`, `gasHiss`, `explosion`, `denied`, `pickup`, `paper`; and Earl's
scanner voice (`voice/gas.scanner.1`, `1b`, `1c`). Prompts for these to follow when we get to them.
