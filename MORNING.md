# For Aaron (Session 31: the mineshaft, the bottom and the way out)

**The mineshaft is finished.** The bulkhead opens, and everything from "The bottom" in DESIGN is built: the seam, the torn cocoon, the charges and the plunger, the foreman's logbook, the dynamite, the rock drill's head, the cart back up with the fire behind it, and the family's lines for the whole place. It's on `main` in three batch commits plus the write-up. 1222 tests pass and the build is clean. I checked it headless on three seeds, with Save and Continue. None of it has been played on the tablet yet.

Your notes were empty again, so nothing from earlier sessions changed.

Your four answers at the start are in as you gave them: the seam is a glowing crack, the cocoon is hung and split and about 4 m, the fuse is 20 seconds and kills you if you're not aboard, and the ride back up is played and ends in a cutscene.

## What to play

**PLAYTEST rounds 71-73.** The quickest way in: debug menu, **Story, radio & trail cams**, "Mineshaft: to the bottom" (the bulkhead shut) or "to the bottom, the bulkhead open". "push the plunger" works from anywhere at the bottom.

1. **The bulkhead.** Hold X at it for three seconds. Tom levers the bar out with the pinch bar from the fall.
2. **The cavern.** Far bigger than the drift, and nobody dug it. The seam is at the far end: a crack up the wall, taller than a house, lit red from inside, pulsing and humming.
3. **The cocoon** hangs beside it, twice your height, split open down the side facing you. Look up: the moths are all over the roof, watching the seam. They leave you alone unless you shoot one.
4. **The foreman** is sat by the exploder with his hand a foot short of it. His logbook is by his hand: seven pages, and it tells where the Mothman came from.
5. **Take what's worth taking:** the dynamite from the open case (5 sticks), and the head off the rock drill (the killdozer's ram). Once the mine's sealed, anything left is gone.
6. **The plunger.** Hold X. A spark starts up the cable and the prompt counts down from 20. Every moth lets go of the roof and pours out ahead of you.
7. **Run for the cart**, about 40 m, and hold X at it. The haulage rope takes it up the drift at a walk with the count still running.
8. **The blast.** The cart leaps to twice the speed and the drift behind you turns orange. Look back at it.
9. **The rails.** The last of the shift walk down the rails at you. Shoot them before the cart reaches them: each one it hits nearly halves its speed, and the fire gains. If it catches you it burns you and falls back. It can't kill you.
10. **The end** is a 12-second cutscene: the landing, the cage, then the headframe from outside. After it the cage won't go down again.
11. **The family** talk at the mine on seeds where the radio reaches it (seed 7 does). Ellen is cut off mid-word as the cage drops, and it's NO SIGNAL until you're back up.

## Calls I made (OPEN_QUESTIONS #605-645)

The ones I'd most like your eye on:

- **The logbook's story** (#612, a draft): what came through the seam was a pale grub that spun the cocoon; the Mothman hatched from it; the army netted it and told the men it was an owl; the moths came after; the eleven packed the seam themselves and never came up.
- **The foreman** (#611): named Everett Shaw, dead beside the exploder, not turned. He never gets up. Should he?
- **Looking into the seam** (#608): "a long way of red, and far off in it something moving". It hints at the realm of stories.
- **Is 20 seconds too many?** (#622). Walking, my test reached the cart with 11 to 13 left.
- **How much the fire hurts** (#630): 12 a time, and it falls back. A ride with no shots fired cost 36 health; a clean one cost nothing. I can't play it, so this is a guess.
- **Too many miners for eleven tags** (#631): fourteen more on the way up, on top of thirty-odd going down.
- **You ride out tail first** (#633): the cart isn't turned round.
- **Anything you leave is lost** (#616): one line warns you, once. Should the plunger wait for the drill's head?
- **The plunger needs no battery** (#620): DESIGN offered it as an option; the cage already cost you one.
- **The eleven lines** (#638), all drafts, and **Junie hoping the moths got out** (#644).
- **Nobody speaks below ground** (#642-643): not the family, not the Caller.

## Something the headless run found

On some seeds the mine's tunnels run under the comms line, so Ellen's "you're going, I can't hear y" was playing halfway down the mine. The radio now has its own state for being underground, and that's gone.

## Not done

- **The tablet**, for all of it. The tunnel is about 29,200 triangles in one draw call, plus fifteen small pieces; then 22 moths, the dead, and six balls of fire.
- **Any of it played by hand.** Every number on the way out is a guess (#622, #628-630).
- **The surface doesn't change** once it's blown (#637): no smoke, no crooked cage, only the lamps out and what the lever says.
- **The count in the cart is small** (#624): it's the little line under the gun's sight.
- **Tom isn't in the cutscene** (#635): there's no model of him.
- **A miner of his own** (a yellow hard hat, a lamp) and **the tunnel's dressing** between the stops: still as Session 30 left them.
- **The sounds** are placeholders (synthesised), like every sound in the game.

## Next

Your big play-test notes (PLAYTEST rounds 49-73 now). After that, the five designed optional encounters are all built, so my suggestion is to go back to the story: **beats 6 and 7's first part**, the family's plan with Earl's maps and the military's dozer on the cordon strip. Say if you'd rather have something else first.
