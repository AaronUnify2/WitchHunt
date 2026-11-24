# The camcorder's tape (Nov 24, 2026)

Aaron: "Could you take a look at the placeholder scene which takes place when you find the camcorder in the
campground? This scene needs a bit of an update. The witch should be moving incredibly fast, killing the campers
with swipes and turning them into zombies. I want you to go crazy with this cutscene. As one of the first ones in
the game it needs to be executed well."

## How the plan was reached

**First draft:** 30 s of found footage; she blurs through the camp and kills everyone in clear view; they get up;
her face in the lens.

**Critique:**
1. The gas station is the witch's "in the flesh" reveal (DESIGN's arc: on tape, then in the flesh). A clean look on
   tape steals it: here she should be fragments.
2. Whoever holds the camera can't film all of it: the camera knocked flying, landing in the grass still recording,
   lets the rest be seen (and is the scariest found-footage image there is).
3. Very fast motion as plain moves just pops: it needs afterimages to read as speed.
4. Her dead rise from the ground (the sigils): a summoning gesture with green light under the bodies keeps the lore
   and plants the storm shelter's first sigil.
5. The campers were boxes: they had to become real people.
6. The tape must end on the dead standing round the fire, as Tom finds them on Day 1, before the horde.

**Aaron's answers** (all four recommendations): fragments of her and one freeze-frame, her face at the end; four
campers (three on tape and the one holding the camera), matching Day 1's fire group; swiped, then raised; about 24 s.

## As built

`clip.camcorder` (`src/data/cutscenes.json`), written by a script kept out of the repo (positions in the
campsite's frame: x right, z ahead from the path in; the fire at (0, 1.5)). Kyle films from beside the fire, clear
of its reflector wall. About 23.4 s with the freeze.

| Tape time | What happens | Sound |
|---|---|---|
| 0-4 s | Dan and Jess on logs at the fire, Marcus waves at the lens | `campFire` (loop), `camperLaugh` x2 |
| 4-6.4 s | Jess looks past the camera; it pans to the trees: a pale smear of her crossing between the trunks | `windGust`, `witchDash` |
| 6-7.5 s | Back to the fire: Marcus gone (taken while the camera was on the trees). A scream from the dark | `camperScream` |
| 8.0 s | Marcus thrown back into the light, down where he stood; Dan and Jess up, cowering | `kill` |
| 8.5-9.0 s | She comes out from behind the lean-to (0.18 s), swipes Dan: a spray, he drops | `witchDash`, `clawSlash` |
| 9.1-9.5 s | Across the fire to Jess (0.14 s), a swipe: a spray, she drops | `witchDash`, `camperScream`, `clawSlash` |
| 9.47 s | **The freeze**: the picture held 0.38 s, torn, on her mid-slash in the firelight | (the glitch's static) |
| 9.9-11.2 s | She turns to the lens. Kyle backs off, turns and runs west into the dark | `runBreath` |
| 11.25-12.35 s | She's behind him: the hit; the camera tumbles and lands on its side in the grass, tilted 28 degrees, facing back at the fire | `witchDash`, `clawSlash`, `camTumble` x2 |
| 12.8-17.7 s | Her rags at the frame's edge; her arms go up; green light rises off the three; they get up wrong (heads lolled, arms dead, jerking) and turn to the fire; Kyle's hand reaches for the camera and stops | `witchSummon`, `rise` x3 |
| 18.2-21 s | She comes to the camera, lifts it, and looks into it: the antlers, the eyes | `witchBreath` |
| 20.2-21.8 s | The tape chews; static; black | `tapeChew`, the glitch's static |

The three end on Day 1's fire group spots (`campsite.json` `fireGroup.spots`): Dan (1.8, 0.85), Jess (1.45, 2.8),
Marcus (-1.35, 2.75). Kyle is the fourth.

## What the cutscene system gained for it

- **The witch acts:** `pose` `swipe` (arms up, then the slash: `config.cutscenes.witchSwipe`) and `summon` (arms
  flung up, head back: `witchSummonSeconds`), timed on the pose; `tone` on her actor lifts her black toward grey
  (`witchToneColor`), since a black figure on a black night isn't seen at all.
- **`smear`** (`story/cutsceneSmear.js`): afterimages behind a fast actor, a frozen copy of her pose every 0.025 s
  fading over 0.3 s (`config.cutscenes.smear`; an event can set `color` and `opacity`: pale on the tape).
- **`spray`** (`SkyFx.spray`): dark drops off a strike, thrown away from `from`, falling.
- **`freeze`**: the tape's time stands still for `seconds`, a glitch running over the held picture.
- **`face`**: an actor turns to another or to a point; `pose` can take `toward` / `to` too.
- **Camera keys:** `roll` (degrees about the view) and `ground` (the height above the ground under the camera).
- **People:** four campers in `config.people` with looks in `render/familyLooks.js`; the family renderer's new poses
  `log` (sat at a fire), `wave`, `cower` and `dead` (up again and wrong), and a per-pose blend `rate` (the dead
  rise slowly). Cutscene people take any pose the renderer knows.
- **`disc`** actors take `opacity` (the firelight's pool on the ground).
- **Sounds:** placeholders for every new one (`campFire` held, `camperLaugh`, `camperScream`, `clawSlash`,
  `camTumble`, `runBreath`, `witchBreath`, `tapeChew`; `witchDash` borrows `witchRush`), files in the next Suno
  batch (`docs/AUDIO_CUES.md`, test 3).

## Checked headless

Frame by frame (swiftshader): the fire and the campers; the smear behind Marcus; her over Dan; the freeze on her at
the fire; the run; the tilted ground shot with the green wisps and the three standing; her face in the lens; the
static. Not checked: on the tablet, by ear (placeholders), at speed.
