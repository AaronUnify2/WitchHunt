# The mothership: a low-gravity tower climb (Nov 26, 2026)

Aaron sent four concept pictures for the inside of the alien mothership and asked for the ship to be redesigned around them, the story beats to be settled once the dungeon is figured out. The plan below was drafted, critiqued and revised, then agreed with him through his answers (question by question, one picture at a time). It's built: `world/mothershipTower.js` (the layout), `world/towerShape.js` (floors at every height), `encounters/Mothership.js` (the beat), `render/mothershipModel.js` (the look).

## The pictures

| Picture | File | What it became |
| --- | --- | --- |
| 1. A service corridor: narrow, navy panels with circuit lines, cyan tube lights, a cyan cylinder at its end, red light beyond | `concept-art/mothership-corridor.jpg` | The two **service wells**: out through the hull, a ramp up, a landing, a side room with a glowing conduit at its back and a locker of loot, a ramp back, in again a deck higher |
| 2. The core hall: a tall round chamber round a glowing reactor column, ring catwalks, tiered balconies, consoles, crew in purple | `concept-art/mothership-core-hall.jpg` | **The tower itself**: the shaft round the reactor's glass column, a deck every 9 m |
| 3. A lounge: huge angled windows on space, curved sofas, holo consoles, crew relaxing | `concept-art/mothership-lounge.jpg` | **The lounge** off deck 3: windows over the Earth, off-duty greys on the sofas, a mezzanine and ramps up to the top |
| 4. A workshop: the quad on a lift, two greys at it with tools, holo blueprints, shelves of Earth curios, a porthole | `concept-art/mothership-workshop.jpg` | **The workshop** at the top: Earl's quad on its lift, the mechanics, the curios; and a **hangar** past it (no picture) with the beam down |
| 5. The core hall again (Nov 26, the current reference): an industrial reactor (plasma in the glass, a frame of thick pipes, a bulky base), hanging cables, neon circuits and door frames, grating and neon rings on a wet floor, dark steel and teal; a mechanical spider on the reactor | `concept-art/mothership-core-hall-2.jpg` | The reactor, walls, doors, floor and palette redone after it (below); the spider and the cables later |

## Aaron's answers

- **Palette:** purple and navy metal, cyan light, red accents across the whole ship (green dropped).
- **Red light** marks danger: zones on alert, where greys are waiting.
- **Side doors:** some open into small loot rooms, the rest sealed; mostly one main route.
- **The cyan cylinder:** a power conduit, guiding the way.
- **The core:** a core unit pulled from the reactor column; the column dims behind him.
- **Height:** "make this whole dungeon a gravity limited tower climb": low gravity throughout; the core hall is the shaft; the core and the hangar at the top, a beam straight down (no climbing back down); a fall drops a deck, it never kills.
- **The greys in the hall:** working until alerted.
- **The lounge:** off-duty greys, an ambush chance; the windows show the Earth below and stars above; near the top.
- **The workshop:** plus a separate hangar; the mechanics flee and raise the alarm; the curios are inspectable lore; the quad finished, just being polished.
- **The ride:** ride it from the workshop into the hangar under fire (new: riding inside an interior).
- **Length:** 15-20 minutes for a first-timer.
- **Gravity hook:** leave room for taking the core to make gravity flicker; don't build it yet.

## The tower, from the bottom up

The shaft is 30 m across (the wall at 15 m), the reactor's glass column 3 m in radius up its middle. Each deck is three bands round the column: the **ring catwalk** against the glass (3-6 m), the **energy net** (6-10.5 m: a floor you can see through; rounds and sight pass it), the **balcony** (10.5-15 m).

| Deck | Height | What's there | Zone |
| --- | --- | --- | --- |
| 0, the hall floor | 0 m | The arrival pad (it takes him home, too); three crew greys at consoles; the foot of the stair; the first hover discs; the door of service well 1 | `floor` |
| Service well 1 | 0 to 9 m | Its side room (a med kit, shells) | `well1` |
| 1 | 9 m | A hat-wearing guard and a worker on the balcony; the broken stair up; the discs up | `deck1` |
| 2 | 18 m | **The red zone** (on alert from the start): three gun-belted guards; a locker of shells; the discs up; the door of service well 2 | `deck2` |
| Service well 2 | 18 to 27 m | A guard on its landing; its side room (an alien shield, a med kit, shells) | `well2` |
| 3 | 27 m | The lounge's wide doorway at +z; the last discs | `deck3` |
| The lounge | 27 to 36 m | Three off-duty cowboys on the sofas (slow to react); the windows over the Earth; the mezzanine, a ramp up to it, a ramp across to the top's door | `lounge` |
| The top | 36 m | The **crown** round the column's head, the **core's socket** on it; two bridges to the balcony over an open drop (a fall: deck 3's net); two gunslinger guards | `top` |
| The workshop | 36 m | Earl's quad on its lift, the two mechanics, the alarm panel, the benches, the blueprints, the shelf of curios, the porthole | `workshop` |
| The hangar | 36 m | Two gunslingers who wait on the alarm; the beam's pad; its open end, a field over the Earth | `hangar` |

**The ways up:** the spiral stair against the glass (0 to 1 whole; 1 to 2 with two flights gone, jumped); three hover discs up each net's hole, each deck to the next (the holes staggered so a fall lands a deck down); the service wells (0 to 1, 2 to 3); the lounge's ramps (3 to the top).

**Low gravity:** a jump goes about 3.2 m up and hangs about 2.5 s (on the ground: 0.8 m, 0.7 s). Little steering in the air and never faster sideways than 4.2 m/s, so a sprint-jump can't skip the climb. A deck overhead stops the head: no jumping a whole deck.

## What the critique changed

1. The wells became climbing routes (in the first draft they were dead ends).
2. The workshop comes before the core (with the core first, the alarm was already ringing and the mechanics' run meant nothing).
3. Alerts are by zone (the shaft is one open space: one alert would have woken every grey at once).
4. The holes are staggered (one missed jump near the top could otherwise drop him all the way down).
5. Air control is limited (a sprint-jump in low gravity could otherwise skip most of the climb).
6. Once built: the hangar's bay door was half shut by a frame twice its width (the headless ride found it).

## Left for the design session

- The story beats aboard (the lines are the scaffolding's drafts and a few toasts).
- ~~Picture 1's sparking junction box and other damage~~ (the second pass, below); more rooms behind the sealed doors.
- Greys that move between posts or call each other up and down the shaft.
- The ship's own sounds (its hum, the nets, the discs); the alarm is a synthesised placeholder.
- The ride's plasma guns (no shooting from the saddle for now).
- Gravity by zone (the hook is `config.mothership.gravityZones`; taking the core could make it flicker).

## The second pass (Nov 26)

Aaron's picks: picture 1's detail, and the crashed saucer outside to match the ship. Built: the service wells' landings and side rooms dressed like picture 1 (a hatch of glowing cables behind glass, a junction box throwing sparks, a vent, pipes along the ceiling, a sealed door); the broken stair's torn ends sparking; sealed doors round the decks under the wall lights; the saucer's rim, pad and beam in cyan and purple. Also: the objective text aboard rewritten for the tower, far-off greys posed less often. All from the layout's `details` (OPEN_QUESTIONS #833-837).

## The core hall after the new picture (Nov 26)

Aaron sent a second core-hall picture: "we're iterating... trying to make things look better", and a note that the wall's pillars sometimes stood in the middle of a door. His picks: the reactor, the neon walls and doors, the floor and grating; the palette toward the picture; the mechanical spider on the reactor left for later (a boss or guardian, once the story's settled); the hanging cables and dripping coolant not this time. Built: pillars half a step off the doors and lights and cut round anything in their way; the reactor's plasma, frame, pipes, base, steam and a sparking pipe; neon circuits and door frames; grating on every deck and neon rings round the reactor's foot; dark steel and teal. OPEN_QUESTIONS #839-845.
