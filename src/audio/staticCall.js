// A voice made of radio static (Session 33; Aaron's play-through, part 2:
// "instead of that whistly style noise, could we use radio static, like a
// shh style noise?"; "we're going for creepy"). Junie's call down a path in
// the place beyond and the Caller's voice from the trees are both this: no
// notes at all, only band-passed hiss, keyed open and shut in the shape of a
// name ("Da-ad", "To-om") the way a handset breaks squelch. Whose voice it
// wears is the hiss's colour: a child's is thinner and higher.
//
// Pure: the plan is a list of noise bursts for Sfx.noiseBurst, each
// { delay (ms), seconds, type, freq, endFreq, q, gain, attack }. No tones.

// pitch: config.caller.voices (junie 1.6 ... tom 0.84). long: the second
// syllable drawn out (a call from far off in the trees).
export function staticCallPlan(pitch = 1, long = false) {
  const colour = 1500 * (0.2 + 0.8 * pitch); // the hiss's centre: about 2,200 Hz for Junie, 1,300 for Tom
  const a = long ? 0.42 : 0.3; // the first syllable
  const gap = long ? 0.1 : 0.07;
  const b = long ? 0.8 : 0.55; // the second, falling away
  const startB = a + gap;
  const end = startB + b;
  return [
    // the channel opening: a click, then a thin bed of hiss under the whole call
    { delay: 0, seconds: 0.035, type: 'highpass', freq: 3200, endFreq: 3200, q: 0.7, gain: 0.3, attack: 0.001 },
    { delay: 0, seconds: end + 0.25, type: 'bandpass', freq: 2400, endFreq: 2000, q: 0.5, gain: 0.07, attack: 0.03 },
    // the name: two swells of hiss, the second lower and dying off
    { delay: 20, seconds: a, type: 'bandpass', freq: colour * 1.12, endFreq: colour, q: 1.1, gain: 0.5, attack: 0.05 },
    { delay: Math.round(startB * 1000), seconds: b, type: 'bandpass', freq: colour, endFreq: colour * 0.62, q: 1.1, gain: 0.46, attack: 0.07 },
    // and shut: the squelch tail
    { delay: Math.round(end * 1000), seconds: 0.09, type: 'highpass', freq: 2600, endFreq: 1400, q: 0.7, gain: 0.22, attack: 0.002 },
  ];
}

// Seconds the whole call lasts.
export function staticCallSeconds(plan) {
  return Math.max(...plan.map((b) => b.delay / 1000 + b.seconds));
}
