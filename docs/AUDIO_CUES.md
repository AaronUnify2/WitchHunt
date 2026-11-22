# Audio cue sheet

## Test 1: the title screen (built, waiting on the files)

The game opens on "Tap to start"; that tap starts the title music, which loops
(its end crossfades into its start) until a choice is picked, then fades out in
under a second. **New Run** also plays a shriek far off in the woods.

| File | Folder | Suno tool | Prompt |
|---|---|---|---|
| `title.mp3` (any length; 2-3 min is ideal) | `public/audio/music` | Normal song, **instrumental** | Spooky Appalachian folk horror, a witch's lament in the dark woods, slow detuned fiddle and fingerpicked banjo over a low droning cello, a faint wordless female hum like a distant witch singing, creaking wood and wind, sparse, haunting, creeping dread, minor key |
| `titleShriek.mp3` (3-5 s) | `public/audio/sfx` | **Sounds**, one-shot | A single distant witch's shriek far away in a dark forest at night, inhuman and piercing, echoing off the hills and trees, long fading reverb tail, no music |

Until they're uploaded: the menu is silent and New Run plays a placeholder shriek.

**Done:** both uploaded. The shriek now plays inside the cold open (below), not on the tap.

## Test 1b: the cold open's portal (built, waiting on the files)

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

## Test 2: the gas station


A trial of real (Suno) audio in one scene: the roadside gas station. Everything
not on this list keeps its synthesised placeholder, and a debug switch flips
between old and new so they can be compared on the spot.

## How to upload

1. Make the sound in Suno and download it as **MP3** (WAV is fine too).
2. **Rename it to the exact file name below** (the name is what ties it to the game).
3. On GitHub, open the folder (`public/audio/sfx`, `public/audio/music` or
   `public/audio/voice`), tap **Add file → Upload files**, drop them in, commit to `main`.

Batches are fine. Anything missing just plays the old sound.

**Variations:** where it says "x3", make three takes and name them `groan_1.mp3`,
`groan_2.mp3`, `groan_3.mp3`. The game picks one at random so it doesn't repeat.

**Don't worry about:** exact length, silence at the ends, loudness, stereo/mono.
I trim, level and convert everything once it's in.

## Suno tool and settings

- **Sound effects** (`sfx` folder): Suno **Sounds**, **one-shot** mode, unless marked LOOP.
- **Loops** (`sfx` folder): Suno **Sounds**, **loop** mode.
- **Stings** (`music` folder): a normal Suno song, **instrumental**, then trim. Or Sounds if it does better.
- **Voice** (`voice` folder): Suno **Speech**, **background music off**. Record it clean:
  the game adds the radio crackle itself, so it matches the rest of the radio.

The prompts below are starting points: tweak freely, and keep whichever take you like.
Add "no music" to an effect's prompt if Suno slips a melody in.

---

## 1. Background loops (`public/audio/sfx`)

| File | Where it plays | Prompt |
|---|---|---|
| `ambDayRoadside.mp3` LOOP, ~60 s | Outdoors around the gas station by day | Quiet rural roadside at early morning, light wind through pine trees, distant crows, a faint electrical buzz from a broken sign, an eerie emptiness, no traffic, no people, no music, seamless loop |
| `ambShopInside.mp3` LOOP, ~45 s | Inside the dark shop | Inside an abandoned roadside convenience store, low hum of a dead refrigerator, faint dripping, building creaks, muffled wind outside, tense and still, no music, seamless loop |

## 2. Fighting (`public/audio/sfx`)

These are heard all over the game, so this test upgrades them everywhere.

| File | When | Prompt |
|---|---|---|
| `rifle.mp3` | Rifle shot | Single bolt-action hunting rifle gunshot outdoors, sharp crack with a rolling echo across a forest valley |
| `shotgun.mp3` | Shotgun shot | Single 12-gauge pump shotgun blast outdoors, heavy boom, short echo off trees |
| `pump.mp3` | Shotgun racked after each shot | Pump-action shotgun being racked, metallic shuck-shuck, close up, dry, no echo |
| `pistol.mp3` | Pistol shot | Single 9mm handgun shot outdoors, snappy crack, light echo |
| `reload.mp3` | Reload starts | Rifle magazine release and rounds being thumbed in, close up, metallic clicks |
| `loaded.mp3` | Reload finished | Rifle bolt slammed shut, single crisp metallic clack |
| `empty.mp3` | Trigger on an empty gun | Dry fire, single small metallic click of an empty gun |
| `swing.mp3` | Shovel swing | Fast whoosh of a heavy shovel swung through the air |
| `shovelHit.mp3` | Shovel lands | Heavy steel shovel striking a body, dull meaty thud with a metal ring |
| `flesh_1/2/3.mp3` x3 | Bullet hits a zombie | Bullet impact into rotten flesh, wet short thud, gory, close |
| `headshot.mp3` | Headshot | Bullet hitting a skull, sharp crunch and wet splatter, gruesome |
| `kill.mp3` | A zombie drops | A body collapsing onto gravel, heavy limp thump, short |
| `impact_1/2.mp3` x2 | Bullet hits the ground or a wall | Bullet ricochet impact into dirt and gravel, short puff and ping |
| `hurt_1/2.mp3` x2 | Tom takes a hit | Middle-aged man grunting in pain from a sudden blow, short, breathy, no words |
| `groan_1/2/3/4.mp3` x4 | Zombies nearby | Single rotting zombie groan, low wet gurgling moan, hungry, short, no words |
| `charge.mp3` | A zombie lunges at Tom | Zombie shrieking as it lunges, raspy furious scream, short |
| `swipe.mp3` | A zombie or the mutant swings at Tom | Fast clawed swipe through the air with a raspy grunt |

## 3. The gas station's own sounds (`public/audio/sfx`)

| File | When | Prompt |
|---|---|---|
| `mutantGroan_1/2.mp3` x2 | The mutant in the aisle | Huge mutated creature groaning, deep guttural growl with bones cracking, unsettling, short |
| `door.mp3` | The shop's back door | Old metal back door of a store creaking open on rusty hinges then thudding |
| `battery.mp3` | A battery wired into the scanner | Car battery terminals clamped on, metal clunk followed by an electric spark and hum |
| `radioStatic.mp3` | Earl's scanner coming on | Old police radio scanner switching on, click then crackling static hiss and squelch, short |
| `gasHiss.mp3` | A shot pump starts leaking | Pressurised fuel spraying from a ruptured gas pump, high hissing jet, building tension |
| `explosion.mp3` | A gas pump blows | Gas station pump exploding, massive fiery boom, metal debris raining down, long roaring tail |
| `denied.mp3` | Something locked (the gun safe) | Locked steel gun safe handle rattled, heavy clunk, won't open |
| `pickup.mp3` | Finding something in a search | Picking up small items from a shelf, cardboard box and a rattle of a few bullets, quick |
| `paper.mp3` | Reading Earl's note | Folded paper note being unfolded, crisp rustle, close |

## 4. Stings (`public/audio/music`)

| File | When | Prompt |
|---|---|---|
| `stingMutant.mp3` ~6-8 s | The torch finds the mutant and it unfolds | Horror movie jump-scare sting, sudden dissonant orchestral stab with screeching strings, then a low pounding drum and fading drone, instrumental |
| `stingWitch.mp3` ~12-15 s | The witch watching from across the road, then running | Eerie Appalachian folk horror, a single detuned fiddle and a whispering wordless female hum over a low drone, slow and haunting, fades into wind, instrumental |

## 5. Voice: Earl's scanner (`public/audio/voice`)

The military broadcast on Earl's scanner. Use the same voice settings for all
three so it sounds like one man. The "..." means it cuts in and out mid-sentence.

**Voice description for Suno Speech:** American male military radio operator,
40s, flat, clipped and tired, reading orders fast, slightly urgent but controlled.

| File | Line |
|---|---|
| `gas.scanner.1.mp3` | ...all civilians inside the quarantine line remain indoors. Do not approach the checkpoint... |
| `gas.scanner.1b.mp3` | ...Checkpoint Two, respond. Contacts on the east wire. They're not stopping. Fall back to the... |
| `gas.scanner.1c.mp3` | ...transfer convoy overdue. Do not open the containers. Hold for the specialist team... |

---

**Total:** 41 files (33 names; some have several takes). The most useful to start with:
`ambDayRoadside`, `rifle`, `shotgun`, `groan` (x4), `stingMutant` and the scanner lines.
