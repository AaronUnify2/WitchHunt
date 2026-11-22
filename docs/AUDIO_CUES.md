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
| 12 | `swipe.mp3` | Sounds, one-shot | A zombie (or the mutant) swings | Fast clawed swipe through the air with a raspy grunt, short, no music |
| 13 | `rise.mp3` | Sounds, one-shot | The dead clawing out of the ground | Corpse clawing its way up out of the dirt, earth cracking and crumbling, a choked gasp, no music |
| 14 | `kill.mp3` | Sounds, one-shot | A zombie drops | A dead body collapsing limply onto the ground, heavy thump with a last rattling breath, short, no music |
| 15 | `mutantRoar.mp3` | Sounds, one-shot | The mutant unfolding in the cutscene | Huge mutated creature rising to full height and roaring, bones cracking and stretching, deep guttural bellow, terrifying, no music |
| 16 | `mutantGroan_set.mp3` | Sounds, one-shot | The mutant charging and fighting | Three separate huge mutant creature growls with two seconds of silence between each, deep wet guttural snarls and heavy huffing, menacing, no music |
| 17 | `mutantSlam.mp3` | Sounds, one-shot | The mutant landing a leap | Something huge and heavy slamming down onto the ground, deep crunching thud, debris scattering, no music |
| 18 | `bodyThud.mp3` | Sounds, one-shot | Tom thrown out of the shop onto the forecourt | A man thrown hard onto concrete, heavy body impact with a grunt of pain, gravel scattering, no music |

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
