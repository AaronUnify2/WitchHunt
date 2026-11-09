# For Aaron in the morning (Session 22: the spikes, and Demo mode)

Good morning. Everything is on `main`, so it's on the live build once the deploy finishes. 844 tests pass and the build is clean. Your saved run is safe: nothing in the save moved this time, and Demo mode never touches it. The list to play is PLAYTEST round 34. My calls are OPEN_QUESTIONS #377-389.

## What's new

1. **The black flicker is fixed.** Dynamic resolution changed the picture's size *after* each frame was drawn, which wiped it, so the screen showed one black frame each time. On a busy scene it kept stepping up and down every few seconds, which was the 5-10 s rhythm. The size now changes just before a frame is drawn, and when a step up turns out too slow, it waits longer before trying again. **Please check on the tablet and the work computer.**
2. **Demo mode**, on the main menu under New Run. You start in the station's yard by day, with the shovel, the service rifle and the shotgun, infinite ammo on and the fence live. There's no story, witch, radio or saving. **Menu** opens the demo panel:
   - **Zombies to send** (D-pad left and right, 10 up to 150), **Send them**, **Zombie level**, **Clear the zombies**;
   - **Time of day** (Day, Dusk, Night), **Fence power**, **Infinite ammo**, **Bring the quad bike**, **Bring the dozer**, **Graphics**;
   - **Run the device test**: night, 100 zombies, about 20 s. Then "Runs great", "Playable" or "Struggling" with the frame rate. If it struggles it drops the graphics a step, and **real runs on that device start on that preset**. (So does whatever you pick on the Graphics row.)
   - **Quit the demo** goes back to the main menu, and Continue is still there.

   The top-left corner always shows the frame rate and the zombie count.
3. **The spikes**, in a new debug category, **Spikes (M10.3)**. They're rough on purpose, with placeholder looks. Each one's answer is in DESIGN.md ("Build plan: the M10.3 spikes"). All four are a **go** so far:
   - **150 zombies:** all the zombies are one draw call (95 with none, 96 with 150), and only the nearest 25 get the full AI. **Please send 150 at night in Demo mode and tell me the frame rate.** That's the measurement this spike needs.
   - **The place beyond:** "Place beyond: go in". A foggy grey forest, a clearing and four paths. Junie calls "Dad?" down two of them (a placeholder sound, plus a caption). Take the silent one three times in a row to find her; a calling path loops you back to the start. It costs only 4 draw calls.
   - **A flyer:** "Flyer: send one at me". It circles, makes two passes overhead, then four dives that hurt if they reach you. Shoot it: hurt enough, it shrieks and flies off (it can't die out here).
   - **Dozer parts:** a spiked ram, armour plating round the cab (nothing climbs on), and a head saw out front (it shreds the dead and takes big trees in a moment). Bolt each on or off from the menu.

## Things I'd like your eye on

- **#379:** Junie's caption names the path she's calling from. Is that too much help, or should the place beyond be by ear only?
- **#377:** going back the way you came from the first clearing leads out (down the stairs); from a later clearing it loops to the start. Right?
- **#382:** the verdict's lines. 40 fps or more is "Runs great", so your tablet at 40-50 would read Runs great.
- **#381:** Demo mode only has the opening's three weapons (no spoilers). Want the pistol or SMG in too?
- **#384:** the flyer's numbers, and whether the aim should stick to it (it doesn't now).
- **#389:** touch controls. The demo warns a touch-only device that it needs a controller. When would you like touch controls as their own session?

## Still to come from you

- **Your glare list.**
- **The tablet's numbers** for the spikes (150 zombies at night, the place beyond, the flyer, the dozer with parts).
- Save and quit at more points, and the health floor. You said these seem fine but aren't fully tested.

Next on the plan is **Session 23 (QA & Balance)**: the opening with the new systems, and Save and quit on the tablet. HANDOVER.md has it.
