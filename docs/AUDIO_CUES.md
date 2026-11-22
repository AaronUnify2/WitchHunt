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

## Test 2: atmosphere, then enemies (24 downloads)

Guns stay as they are for now. The first 12 are atmosphere, the last 12 enemies,
in the order to make them: if the Suno limit runs out partway, the most useful are done.

**How the atmosphere works:** a steady bed loops under everything (day, night, or
inside the shop), and separate one-off calls (crows, owls, things far off in the dark)
play at random every so often, from random directions. So the loops are textures
with nothing distinctive in them (a 10 s loop with a crow in it would caw every 10 s),
and the character comes from the calls, which never repeat in the same pattern.

**Upload:** rename to the exact name, MP3, into `public/audio/sfx` (stings into
`public/audio/music`). Takes are numbered: `nightCall_1.mp3`, `nightCall_2.mp3`...
Don't worry about length, silence at the ends or loudness: I trim and level them.

### Atmosphere (12)

| # | File | Suno | Where | Prompt |
|---|---|---|---|---|
| 1 | `ambDay.mp3` | Sounds, **loop** | Outdoors by day, everywhere | Quiet empty forest by day, soft steady wind through pine needles, faint rustling leaves, distant rushing breeze, calm but lonely, no birds, no animals, no music, seamless loop |
| 2 | `ambNight.mp3` | Sounds, **loop** | Outdoors at night, everywhere | Dark forest at night, dense steady crickets and insects, low cold wind, faint creaking trees, eerie stillness, no music, seamless loop |
| 3 | `ambShopInside.mp3` | Sounds, **loop** | Inside the gas station's shop | Inside a dark abandoned convenience store, low hum of a dying refrigerator, faint fluorescent buzz, building creaks, muffled wind outside, tense and still, no music, seamless loop |
| 4 | `dayCall_1.mp3` | Sounds, one-shot | Now and then by day | A few distant crow caws echoing across an empty forest, no music |
| 5 | `dayCall_2.mp3` | Sounds, one-shot | Now and then by day | A dry branch snapping somewhere in the woods followed by leaves rustling, distant, no music |
| 6 | `nightCall_1.mp3` | Sounds, one-shot | Now and then at night | A lone owl hooting far away in a dark forest, echoing, no music |
| 7 | `nightCall_2.mp3` | Sounds, one-shot | Now and then at night | A distant animal screaming in the night forest, unsettling, fox-like but wrong, echoing, no music |
| 8 | `nightCall_3.mp3` | Sounds, one-shot | Now and then at night | Something far off in the woods letting out a long low inhuman howl, echoing across the valley, no music |
| 9 | `windGust_1.mp3` | Sounds, one-shot | Gusts now and then; the witch leaving | A sudden strong gust of wind rushing through forest trees, branches swaying and creaking, then dying away, no music |
| 10 | `windGust_2.mp3` | Sounds, one-shot | (a second take) | A cold howling wind gust sweeping across an open clearing, rising and fading, no music |
| 11 | `stingMutant.mp3` | Song, **instrumental** (music folder) | The mutant unfolds in the shop | Horror jump-scare sting, sudden dissonant orchestral stab with screeching strings, then a low pounding drum and fading drone |
| 12 | `stingWitch.mp3` | Song, **instrumental** (music folder) | The witch watching from across the road | Eerie Appalachian folk horror, a single detuned fiddle and a whispering wordless female hum over a low drone, slow and haunting, fades into wind |

### Enemies (12)

| # | File | Suno | When | Prompt |
|---|---|---|---|---|
| 13 | `groan_1.mp3` | Sounds, one-shot | Zombies nearby | Single rotting zombie groan, low wet gurgling moan, hungry, short, no words, no music |
| 14 | `groan_2.mp3` | Sounds, one-shot | (a second take) | Zombie rasping breath turning into a guttural moan, decayed throat, short, no words, no music |
| 15 | `groan_3.mp3` | Sounds, one-shot | (a third take) | Undead corpse letting out a choked hungry growl, wet and rattling, short, no words, no music |
| 16 | `charge.mp3` | Sounds, one-shot | A zombie lunges | Zombie shrieking as it lunges to attack, raspy furious scream, short, no music |
| 17 | `swipe.mp3` | Sounds, one-shot | A zombie (or the mutant) swings | Fast clawed swipe through the air with a raspy grunt, short, no music |
| 18 | `rise.mp3` | Sounds, one-shot | The dead clawing out of the ground | Corpse clawing its way up out of the dirt, earth cracking and crumbling, a choked gasp, no music |
| 19 | `kill.mp3` | Sounds, one-shot | A zombie drops | A dead body collapsing limply onto the ground, heavy thump with a last rattling breath, short, no music |
| 20 | `mutantRoar.mp3` | Sounds, one-shot | The mutant unfolding (the cutscene), and its charge | Huge mutated creature rising to full height and roaring, bones cracking and stretching, deep guttural bellow, terrifying, no music |
| 21 | `mutantGroan_1.mp3` | Sounds, one-shot | The mutant, fighting | Huge mutant creature growling, deep wet guttural snarl, menacing, short, no music |
| 22 | `mutantGroan_2.mp3` | Sounds, one-shot | (a second take) | Massive deformed creature grunting and huffing as it moves, heavy breathing and a low growl, short, no music |
| 23 | `mutantSlam.mp3` | Sounds, one-shot | The mutant landing a leap | Something huge and heavy slamming down onto the ground, deep crunching thud, debris scattering, no music |
| 24 | `bodyThud.mp3` | Sounds, one-shot | Tom thrown out of the shop onto the forecourt | A man thrown hard onto concrete, heavy body impact with a grunt of pain, gravel scattering, no music |

---

## Later: guns and hits (not yet)

`rifle`, `shotgun`, `pump`, `pistol`, `reload`, `loaded`, `empty`, `swing`, `shovelHit`,
`flesh` (x3), `headshot`, `impact` (x2), `hurt` (x2); and the gas station's `door`,
`battery`, `radioStatic`, `gasHiss`, `explosion`, `denied`, `pickup`, `paper`; and Earl's
scanner voice (`voice/gas.scanner.1`, `1b`, `1c`). Prompts for these to follow when we get to them.
