// ALL tuning numbers live here. Code never hard-codes a number that a
// designer might want to change. Every value is a placeholder until
// play-testing (M14).

export const config = {
  // Main loop
  loop: {
    maxFrameDt: 0.1, // seconds; longer frames (tab switch, hitch) are clamped
    frameCapToleranceMs: 2, // a frame this early still counts as on time under a frame cap
  },

  // Seeded random numbers
  rng: {
    // null = new random seed each run. A number or string fixes the seed.
    defaultSeed: null,
    // Dev convenience: ?seed=1234 in the URL overrides the seed.
    seedUrlParam: 'seed',
    randomSeedMax: 2147483647, // upper bound when rolling a fresh seed
  },

  // Day/night clock. Phases run in this order and repeat.
  // seconds = real seconds per phase at timeScale 1.
  // startHour = the in-world clock-face hour when that phase begins.
  clock: {
    timeScale: 1,
    timeScaleSteps: [1, 10, 60], // debug menu cycles through these
    startDay: 1,
    // M3 starts by day so the end-to-end map walk is easy to judge (Aaron).
    // M9 sets the real start (the opening has Tom wake at dawn).
    startPhase: 'day',
    phases: [
      { name: 'day', seconds: 480, startHour: 7 },
      { name: 'dusk', seconds: 60, startHour: 19 },
      { name: 'night', seconds: 360, startHour: 20 },
      { name: 'dawn', seconds: 60, startHour: 6 },
    ],
    hoursPerDay: 24,
    minutesPerHour: 60,
  },

  // Display: fullscreen and orientation
  display: {
    requestFullscreen: true,
    lockLandscape: true,
    // When the player leaves fullscreen (back gesture, Esc), show the
    // "tap to resume" screen so they can go back in with one tap.
    resumeScreenOnFullscreenExit: true,
    // Screen Wake Lock: stop the tablet dimming during controller-only play
    // (no screen touches). Re-acquired when the tab becomes visible again.
    keepScreenAwake: true,
  },

  // Rendering
  render: {
    renderScale: 0.65, // starting fraction of native resolution (tablet: ~1080p-class)
    maxDevicePixelRatio: 3,
    antialias: false,
    powerPreference: 'high-performance',
    fov: 70, // degrees, vertical
    near: 0.1,
    farMargin: 20, // metres beyond the draw distance before the camera clips
    targetFps: 60, // dynamic resolution aims for this (or the frame cap if set)
    toneMapping: 'ACESFilmic', // three.js tone mapping name without "ToneMapping"
    exposure: 1.0,
    // Session 10: the optional retro pixel filter (DESIGN.md "Rendering
    // pipeline"): render this many lines, upscaled with hard pixels.
    retro: { lines: 270 },
    dynamicResolution: {
      enabled: true,
      sampleSeconds: 1, // frame times are averaged over this window
      slowTolerance: 0.12, // average frame time this far over target counts as slow
      raiseAfterSeconds: 4, // on-target time needed before raising the scale
      // Session 22 (the flicker): a raise dropped again within this many
      // seconds was too much; the wait before the next raise doubles
      // (raiseBackoff) up to maxRaiseAfterSeconds. A new quality, frame
      // cap or on/off goes back to raiseAfterSeconds.
      failedRaiseSeconds: 3,
      raiseBackoff: 2,
      maxRaiseAfterSeconds: 60,
      step: 0.05, // render scale change per adjustment
    },
  },

  // Quality presets: the safety valve for the tablet. The debug menu
  // cycles them live. Retro filter, mist and particles come later.
  quality: {
    preset: 'medium', // default for the Galaxy Tab S10 FE
    presets: {
      low: {
        renderScaleMin: 0.4,
        renderScaleMax: 0.6,
        drawDistance: 60, // metres; fog end = draw distance
        flashlightShadow: false,
        shadowMapSize: 512,
        postFX: false,
        bloom: false,
        frameCap: 30, // 0 = no cap (display refresh rate)
        mist: 0, // Session 10: height-mist strength (0 = off, 1 = full)
        mistPuffs: 0, // drifting ground-mist billboards near you
        groundTwoSizes: false, // read each ground texture at two sizes (hides repeats; 3 more texture reads)
        treeTrunks: 0, // metres: trees this near you get a solid 3D trunk (0 = off)
        fireflies: 0, // Session 10: fireflies round you at night
        beamDust: 0, // motes of dust that show in the torch beam
        lightShafts: 0, // strength of the moonlight shafts in clearings (0 = off)
        torchBeam: 0, // strength of the torch's visible beam in the air (0 = off)
      },
      medium: {
        renderScaleMin: 0.45,
        renderScaleMax: 0.75,
        drawDistance: 80,
        flashlightShadow: true,
        shadowMapSize: 512,
        postFX: true,
        bloom: true,
        frameCap: 0,
        mist: 0.75,
        mistPuffs: 54, // Aaron: triple the first count (18), now that they fade out from 25 m
        groundTwoSizes: true,
        treeTrunks: 30,
        fireflies: 70,
        beamDust: 300,
        lightShafts: 0.8,
        torchBeam: 1,
      },
      high: {
        renderScaleMin: 0.5,
        renderScaleMax: 1,
        drawDistance: 100,
        flashlightShadow: true,
        shadowMapSize: 1024,
        postFX: true,
        bloom: true,
        frameCap: 0,
        mist: 1,
        mistPuffs: 96,
        groundTwoSizes: true,
        treeTrunks: 40,
        fireflies: 120,
        beamDust: 500,
        lightShafts: 1,
        torchBeam: 1,
      },
    },
    frameCapSteps: [0, 30, 60], // debug menu cycles through these
  },

  // Post-processing (grade, vignette and grain run after tone mapping)
  postFX: {
    bloom: {
      strength: 0.4,
      radius: 0.4,
      threshold: 0.92, // only brighter-than-this pixels bloom (flashlight hot spot, moon)
    },
    // Session 10: the colour grade by clock-face hour (blended like the
    // sky). shadows / highlights: the split-tone colours (cold shadows,
    // warm highlights); split: how strongly (0..1). lift: faded blacks,
    // toward the shadow colour (a printed look). saturation / contrast: 1 =
    // unchanged (contrast above 1 crushes night shadows to black).
    grade: {
      keys: [
        { hour: 0, saturation: 0.8, contrast: 1.04, shadows: 0x8898bc, highlights: 0xffe4c4, split: 0.38, lift: 0.022 },
        { hour: 5.25, saturation: 0.8, contrast: 1.04, shadows: 0x8898bc, highlights: 0xffe4c4, split: 0.38, lift: 0.022 },
        { hour: 6.5, saturation: 0.86, contrast: 1, shadows: 0x9a88c0, highlights: 0xffc4a0, split: 0.42, lift: 0.03 },
        { hour: 8, saturation: 0.84, contrast: 1, shadows: 0x98a4b4, highlights: 0xfff0d6, split: 0.2, lift: 0.025 },
        { hour: 17.5, saturation: 0.84, contrast: 1, shadows: 0x98a4b4, highlights: 0xfff0d6, split: 0.2, lift: 0.025 },
        { hour: 19, saturation: 0.88, contrast: 1.02, shadows: 0x9088a8, highlights: 0xffbc80, split: 0.38, lift: 0.028 },
        { hour: 20, saturation: 0.8, contrast: 1.04, shadows: 0x8898bc, highlights: 0xffe4c4, split: 0.38, lift: 0.022 },
      ],
      // The blood night (the final battle) pulls the grade toward this.
      blood: { saturation: 1.05, contrast: 1.08, shadows: 0x6a1010, highlights: 0xffa070, split: 0.6, lift: 0.03 },
    },
    vignette: {
      strength: 0.35, // how dark the corners get (0..1)
      start: 0.45, // distance from centre (0 = centre, 1 = corner) where it begins
    },
    grain: {
      strength: 0.045, // subtle film grain amplitude
    },
    // M8: the camera looks for cutscenes (DESIGN.md "Cutscenes"): "camera
    // styles tell you where you are". One full-screen pass after the grade.
    // tint: multiplied in after going to grey by (1 - saturation). gain:
    // brightness (night vision lifts the dark). noise: per-pixel static.
    // scanlines: strength, at lines per screen height. bend: barrel lens.
    // tear: rows that jump sideways now and then (a battered feed).
    // dropout: chance per second of a frame of static. chroma: colour
    // fringe (pixels). mask: a round scope mask (0 off).
    looks: {
      cctv: { tint: 0xd8e4dc, saturation: 0.25, contrast: 1.15, gain: 1.6, noise: 0.12, scanlines: 0.18, lines: 240, bend: 0.12, vignette: 0.55, tear: 0.0, dropout: 0.0, chroma: 1.2, mask: 0, soft: 0.15 },
      trailcam: { tint: 0x7cff8c, saturation: 0, contrast: 1.25, gain: 3.4, noise: 0.16, scanlines: 0.12, lines: 200, bend: 0.06, vignette: 0.6, tear: 0.0, dropout: 0.0, chroma: 0.6, mask: 0, soft: 0.3, blow: 1.1, blowAt: 0.55 },
      camcorder: { tint: 0xfff0dc, saturation: 0.8, contrast: 1.08, gain: 1.5, noise: 0.07, scanlines: 0.08, lines: 288, bend: 0.03, vignette: 0.4, tear: 0.02, dropout: 0.0, chroma: 2.2, mask: 0, soft: 0.2, focusHunt: 0.75, blow: 0.8, blowAt: 0.6, wobble: 0.0035 },
      military: { tint: 0xd4dcc4, saturation: 0.35, contrast: 1.2, gain: 1.8, noise: 0.2, scanlines: 0.22, lines: 200, bend: 0.1, vignette: 0.6, tear: 0.25, dropout: 0.6, chroma: 1.8, mask: 0, soft: 0.25 },
      government: { tint: 0xb8d0ff, saturation: 0.3, contrast: 1.1, gain: 1.7, noise: 0.06, scanlines: 0.1, lines: 360, bend: 0.04, vignette: 0.45, tear: 0.0, dropout: 0.0, chroma: 0.4, mask: 0 },
      scope: { tint: 0xffffff, saturation: 0.9, contrast: 1.05, gain: 1.3, noise: 0.03, scanlines: 0, lines: 240, bend: 0, vignette: 0.2, tear: 0, dropout: 0, chroma: 0.6, mask: 1, sway: 1, milDots: 1, edgeDark: 0.55 },
    },
    // Session 19 (style pass 2): the new look numbers (each off when left
    // out): soft (a cheap lens, 0..1), focusHunt (a camcorder losing focus
    // now and then), blow / blowAt (highlights over blowAt pushed toward
    // white), wobble (a hand holding it), sway (the scope's breathing),
    // milDots, edgeDark (the scope's rim). And the treatments laid over the
    // live picture while no look is on (PostFX.setTreatment): the sweeps'
    // grade (a touch cooler, flatter and vignetted, easing in and out) and
    // a reveal's jolt (a hard vignette and colour fringe, fading fast).
    treatments: {
      sweep: { tint: 0xe4ecf4, saturation: 0.82, contrast: 1.06, vignette: 0.4, chroma: 0.5 },
      jolt: { saturation: 0.7, contrast: 1.15, vignette: 0.85, chroma: 4, noise: 0.05, bend: 0.06 },
    },
  },

  // Sky, sun/moon light and fog colour, keyed by clock-face hour.
  // Colours blend linearly between keys and wrap past midnight.
  sky: {
    domeFraction: 0.9, // dome radius as a fraction of the camera's far plane
    gradientExponent: 0.55, // how quickly the horizon colour gives way to the top colour
    domeSegments: 32,
    starCount: 1400,
    starSize: 2, // pixels
    starMinHeight: -0.05, // stars only above this height on the unit dome
    starTwinkleSpeed: 1.6,
    starTwinkleAmount: 0.45, // 0 = steady, 1 = full flicker
    moonDirection: { x: -0.35, y: 0.5, z: -0.8 },
    moonSize: 0.07, // fraction of the dome radius
    moonColor: 0xe4ebff,
    moonTextureSize: 128,
    sunriseHour: 6,
    sunsetHour: 19,
    sunMaxElevation: 55, // degrees at midday
    lightDistance: 60, // metres from the camera to place the directional light
    // mist / mistAmount (Session 10): the low ground mist's colour and
    // strength (thick at night and at dawn, burnt off by mid-morning).
    keys: [
      { hour: 0, skyTop: 0x050915, horizon: 0x18233a, ambient: 0x3a4a78, ambientIntensity: 1.1, light: 0x8ea6dc, lightIntensity: 0.9, stars: 1, mist: 0x2c3850, mistAmount: 0.8 },
      { hour: 5.25, skyTop: 0x050915, horizon: 0x18233a, ambient: 0x3a4a78, ambientIntensity: 1.1, light: 0x8ea6dc, lightIntensity: 0.9, stars: 1, mist: 0x2c3850, mistAmount: 0.85 },
      { hour: 6.5, skyTop: 0x2c3c60, horizon: 0x8a6c72, ambient: 0x6a72a0, ambientIntensity: 0.8, light: 0xffb98c, lightIntensity: 0.9, stars: 0.15, mist: 0x7c7480, mistAmount: 1.0 },
      { hour: 8, skyTop: 0x5d7da6, horizon: 0x9ca8b4, ambient: 0xa4b0c8, ambientIntensity: 1.2, light: 0xfff0dc, lightIntensity: 1.8, stars: 0, mist: 0x9aa4ae, mistAmount: 0.3 },
      { hour: 17.5, skyTop: 0x5d7da6, horizon: 0x9ca8b4, ambient: 0xa4b0c8, ambientIntensity: 1.2, light: 0xfff0dc, lightIntensity: 1.8, stars: 0, mist: 0x9aa4ae, mistAmount: 0.12 },
      { hour: 19, skyTop: 0x2a2c52, horizon: 0x9a5c4a, ambient: 0x5c5274, ambientIntensity: 0.75, light: 0xff9c62, lightIntensity: 0.8, stars: 0.15, mist: 0x6a5a62, mistAmount: 0.45 },
      { hour: 20, skyTop: 0x050915, horizon: 0x18233a, ambient: 0x3a4a78, ambientIntensity: 1.1, light: 0x8ea6dc, lightIntensity: 0.9, stars: 1, mist: 0x2c3850, mistAmount: 0.8 },
    ],
  },

  // Fog: linear, ending at the quality preset's draw distance.
  fog: {
    nearFraction: 0.12, // fog starts at this fraction of the draw distance
    // Session 10: the low ground mist, in every fogged material's shader.
    // Its colour and strength by hour are in sky.keys (mist, mistAmount);
    // the Quality preset's 'mist' scales it.
    mist: {
      layerHeight: 0.8, // metres: thins to about a third every this far above the ground under you
      hollowCap: 2.2, // in hollows below your feet it thickens, up to this many times
      reach: 0.035, // per metre: how fast it builds with distance (half at about 20 m)
      noiseScale: 0.07, // per metre: size of the thick and thin patches
      noiseAmount: 0.55, // how much the patches thin it (0 = even)
      drift: { x: 0.17, z: 0.07 }, // m/s the patches drift (Aaron: halved)
      maxOpacity: 0.85,
    },
    // Drifting mist sheets near you (count from the Quality preset). Each
    // stays parallel to the screen (no swinging round as you pass) and is
    // a soft, torn blob of one of these shapes. ragged: how torn its edge is.
    puffs: {
      radius: 70, // metres: they live within this of you (and inside the fog)
      shapes: [
        { weight: 3, width: [7, 12], height: [1.2, 1.8], ragged: 0.7 }, // a wide, low bank
        { weight: 2, width: [3, 5], height: [1.6, 2.6], ragged: 0.9 }, // a rounder tuft
        { weight: 1, width: [10, 16], height: [0.8, 1.2], ragged: 0.5 }, // a long, thin streak
      ],
      sink: 0.5, // metres below the ground their base sits (hides the cut)
      peak: 0.35, // 0..1 up the billboard where it's thickest
      opacity: 0.32,
      drift: 0.2, // m/s, along fog.mist.drift's direction (Aaron: halved, it moved too fast)
      billow: 0.5, // how fast the noise inside each one churns (1 = the first speed)
      // Aaron: they fade away as you approach, gone by about 25 m, so you
      // see mist out ahead, never a flat sheet up close (now about 22 m). Scaled down on a
      // fog night (the fog ends sooner).
      fadeNear: [17, 27], // metres: gone inside the first, full beyond the second (Aaron: 3 m closer)
      fadeIn: 2.5, // seconds to appear after being moved
      noiseScale: 0.35, // texture repeats per metre-ish
      noiseSize: 64, // pixels, the generated noise texture
      torchLit: 0.9, // how much the torch's beam brightens one it hits
      avoidMargin: 1, // metres round the station's cabin where none stand (they may drift inside the fence)
    },
    // Fireflies (Session 10): soft blinking glows low over the ground at
    // dusk and at night. Count from the Quality preset.
    fireflies: {
      box: 44, // metres: they fill a box this wide round you (it moves with you)
      height: [0.3, 1.6], // metres above the ground under you
      wander: 0.8, // metres each drifts about
      blinkPeriod: 4, // seconds between blinks (each one varies)
      size: 0.14, // metres
      fade: [14, 22], // metres: full inside the first, gone beyond the second
      near: 1.2, // metres: none right in your face
      color: 0xa8ff40,
      intensity: 4, // above 1, so the bloom catches them
      fogNightCut: 0.7, // fog nights have this much fewer
    },
    // Dust in the torch beam (Session 10). Count from the Quality preset.
    beamDust: {
      box: 9, // metres: the motes fill a box this wide round you
      range: 8, // metres: they show this far down the beam
      size: 0.012, // metres
      near: 0.5, // metres
      brightness: 0.9,
      day: 0.25, // how visible by day (1 at night)
    },
    // Shafts of moonlight (or low dawn sun) in the clearings (Session 10).
    // Strength from the Quality preset; they show in the mist.
    shafts: {
      perClearing: [2, 4],
      width: [2, 4.5], // metres
      length: 26, // metres, up toward the light
      spread: 1.6, // this much wider at the top
      strength: 0.025, // additive brightness at full (Aaron: much more subtle; was 0.07: a small moon in a clear sky can't throw strong beams)
      fadeNear: [3, 9], // metres: fade out as you walk into one
      minElevation: 0.2, // the light must be at least this high (sin of its angle) for shafts
      fogNightCut: 0.5, // fog nights hide this much of them
    },
    // The torch's beam made visible in the air (Session 10).
    torchBeam: {
      length: 12, // metres
      width: 0.85, // the cone's angle as a share of the torch's
      strength: 0.01, // additive brightness at full (Aaron: much more subtle; was 0.03)
      near: [3, 8], // metres from your eye: none inside the first, full beyond the second
      day: 0.1, // how visible by day (1 at night)
      clear: 0.35, // how visible with no mist (1 in full mist)
      fogNightBoost: 1.3, // thicker on a fog night
    },
    // Fog nights (Aaron): about one night in three, never night 1.
    nights: {
      chance: 0.34,
      firstNight: 2,
      liftDayFraction: 0.15, // it burns off over this much of the next day
      fogNear: 2, // metres: the fog's start on a fog night
      fogFar: 38, // metres: you see about this far (draw distance shrinks with it)
      mistBoost: 1.6, // the ground mist is thicker too
      colourMix: 0.65, // fog colour moves this far toward the mist colour (grey, not black)
      skyMix: 0.9, // how far the sky disappears into the fog
      drawDistanceStep: 5, // metres: the draw distance follows the fog in steps
    },
  },

  // World and collision
  world: {
    colliderCellSize: 8, // metres per spatial-grid cell for collision lookups
  },

  // The map (M3). North is -z, south is +z; x runs west (-) to east (+).
  // Decided with Aaron in M3: 1 km wide, 1.4 km north to south ("we'll see
  // how it goes"). The map is a graph: clearings are nodes, pathways edges.
  map: {
    width: 1000, // metres, west to east
    depth: 1400, // metres, north to south (the plateau above the cliff included)
    edgeMargin: 60, // the walkable area stops this far inside the east, west and south edges (dense forest beyond)
    clearingCount: 30, // home, the hut, one per encounter and sigil ground, the rest plain clearings (Session 21: 22 -> 30, so the fixed spine and the optional encounters leave room for plain clearings)
    maxAttempts: 40, // generation retries (each from a forked seed) until every rule holds
    // Bands by southness (0 at the cliff, 1 at the southern edge)
    // Session 14: north widened (0.34 -> 0.40) so the north frontier
    // still fits between the cordon and the middle band.
    bands: {
      north: [0, 0.4],
      middle: [0.4, 0.7],
      south: [0.7, 1],
    },
    bandPadding: 0.02, // clearings keep this far (southness) inside their band's edges
    // How often a non-guaranteed encounter appears (encounters.json "appears")
    appearChance: { every: 1, common: 0.75, uncommon: 0.4 },
    // The northern cliff: a tall rock wall the whole width of the map
    cliff: {
      plateauDepth: 40, // metres from the map's north edge to the cliff's mean line (trees on top)
      amplitude: 14, // metres the cliff line wanders north and south
      wavelength: 240, // metres between its bends
      height: 26, // metres
      heightVariation: 8, // +/- metres along its length
      rampWidth: 6, // metres the ground behind the face climbs to the plateau (hidden by the wall)
      segment: 3, // metres between columns of the wall mesh
      rows: 12, // rows of the wall mesh, bottom to top
      roughness: 2.5, // metres the face bulges out (never in)
      bumpSize: 5, // metres across a bulge
      ledges: 0.8, // metres of extra jut on horizontal ledges
      topJag: 4, // metres the top edge rises and falls
      talus: 1.5, // metres the foot of the wall slopes out
      sink: 2, // metres the wall's foot sits below the ground
      textureMeters: 8, // rock texture repeats every this many metres
      colliderSpacing: 2.5, // metres between collision circles along the foot
      colliderRadius: 1.6,
      walkMargin: 4.5, // the player and zombies stay this far south of the cliff line (clear of its bulges)
      clearingPadding: 4, // clearings keep this far south of the cliff line (beyond their radius)
      chunkWidth: 64, // metres of wall per mesh (for distance culling)
    },
    home: {
      radius: 42, // the compound (fence, station, tower; M5): 38 -> 42 so there's cleared ground outside the fence too
      offsetFromCliff: 32, // centre this far south of the cliff line
    },
    // The fixed opening cluster (DESIGN.md "Fixed opening cluster", M9.1):
    // home, the campsite, storm shelter, gas station, outpost and one sigil
    // ground, laid out in data/openingCluster.json and identical every run.
    // Everything north of the cordon (the cliff, the hills, the trees, the
    // cluster's pathways) comes from the fixed seed below, not the run's.
    cluster: {
      seed: 'opening-cluster',
      homeX: 0, // the station sits on the cliff in the middle of the north edge
      cordonSouthOfHome: 290, // metres from home's centre south to the cordon line (just past the outpost)
      fade: 60, // metres south of the cordon over which the fixed land blends into the run's
      frontierGap: 40, // frontier clearings keep this far south of the cordon (beyond their radius)
      checkpointExit: 30, // metres the frontier's first pathway runs due south from the outpost through the checkpoint
    },
    hut: {
      southnessMin: 0.9, // deep in the south (Session 21: the hut is on the fixed spine, data/storySpine.json; this is the rule it keeps)
      minHops: 4, // at least this many pathways from home
    },
    // Session 21 (M10.2): the optional encounters (encounters.json placement
    // "optional"; DESIGN.md "Optional encounters"). The seed deals this many
    // from the pool and places them anywhere around the spine, in any band.
    // Aaron (Session 21): as many as will reasonably fit, so all five designed
    // ones each run for now (the roster drops the last dealt if the map's full).
    optional: {
      min: 5,
      max: 5,
    },
    // Session 21: a faint trail (the stairs': off the pathways): metres wide, kept
    // clear either side, and how open and bare it is (1 = a pathway).
    faintTrail: { width: 1.6, clearance: 0.8, open: 0.7, dirt: 0.45, edgeNoise: 0.35 },
    // Plain clearings fill the bands in proportion to these (Session 21: the
    // north frontier between the cordon and the middle band is small).
    wildBandWeights: { north: 0.5, middle: 1, south: 1 },
    // Session 21 (M10.2): the 1903 railway line (world/railway.js; DESIGN.md
    // "the 1903 railway line"): the full width east to west on the border
    // between the middle and the south band, the same every run.
    railway: {
      southness: 0.7, // the middle/south border
      // Control points: x (metres), and metres south (+) of the border's line.
      // Long straights and gentle curves, as a surveyed line would run.
      points: [[-560, 8], [-330, 2], [-90, -9], [150, -3], [380, 10], [560, 14]],
      sample: 4, // metres between points along it
      bed: 3.4, // metres of ballast across (drawn as worn dirt)
      shoulder: 2.2, // metres each side of the bed kept thin (the old cleared strip, grown back)
      clearance: 26, // metres a clearing keeps from the line beyond its radius (the railway cutting excepted)
      bedOpen: 0.78, // the bed's open ground: 1 = no trees or undergrowth; less lets saplings and brush back onto it
      shoulderOpen: 0.45,
      // Graded, as a railway is: the ground along it is eased toward a smooth
      // grade (cuttings through rises, low banks over dips).
      grade: { window: 140, blend: 0.85, reach: 14, lift: 0.25 }, // window: metres smoothed over; reach: metres either side it eases the ground; lift: the bed's bank (metres)
      // The collapsed tunnels sit beyond the walkable area's east and west
      // edges, bored into hills that rise behind them (metres).
      tunnel: { beyondEdge: 6, hillFront: 18, hillRise: 22, hillHeight: 13, hillWidth: 42, cutHalf: 3.2, cutSlope: 7 }, // hillFront: metres in front of the portal its hill starts to rise; hillRise: over how far; cutHalf / cutSlope: the cutting's floor either side of the line and its banks
      // Session 27: the railway cutting (world/railCutting.js): where the seed's railwayCutting clearing
      // sits on the line, the ground either side is lifted into two banks the navvies blasted through in
      // 1902; the pathways come down into it through gullies. Metres. floorHalf: the open floor either side
      // of the line (wider than the ground's 4 m grid, so the floor stays flat); faceRun: the face's
      // slope; height: the south bank's and the north bank's; topOut / outFade: how far back the tops run
      // and fade into the forest; length / nose: the full banks either side of the middle, and their
      // taper to the mouths; lumps: the tops' unevenness; gully / gullyBlend: a pathway's cut.
      cutting: { floorHalf: 5.5, faceRun: 5, height: [5.6, 7.2], topOut: 19, outFade: 16, length: 15, nose: 14, lumps: 0.12, gully: 3.4, gullyBlend: 5, store: { z: 8 } },
      regrowth: { saplings: 0.12, saplingScale: [0.3, 0.55], bushes: 0.55 }, // on the bed: the chance per tree spot of a young tree (and its size), per bush spot of brush
      // Drawn (render/Railway.js).
      gauge: 1.435, // metres between the rails (standard gauge)
      tieSpacing: 0.9, // metres
      tieLength: 2.5,
      tiesGone: 0.32, // noise below this: the tie's rotted away
      railsGone: 0.36, // noise below this: the rail's buried or gone
      crossbuckBack: 4.5, // metres before the rails a crossing's crossbuck stands
      whistleBack: 60, // metres up and down the line from a crossing: the W posts
      poles: { spacing: 48, offset: 7, side: 1, height: 7.5, radius: 0.13, arm: 1.9, down: 0.18, leaning: 0.45, wiresGone: 0.55, sag: 1.1 }, // the telegraph line (side 1: north of it, as road.js frames count it); down / leaning: the share fallen and leaning hard
      tunnelLook: { width: 4.8, spring: 3.2, height: 8.4, faceWidth: 12 }, // the stone portals (metres)
      look: {
        weather: { rust: [0x3a2618, 0x2e2016] },
        rail: 0x3a2618,
        tie: 0x3a3228,
        tieDark: 0x2a241c,
        plank: 0x3e3428,
        plankDark: 0x2c261e,
        pole: 0x3a3026,
        wire: 0x1a1a1a,
        boardPaint: 0x6a665a,
        boardInk: 0x1a1612,
        post: 0x3a3228,
        stone: 0x4e4a42,
        stoneDark: 0x3c3934,
        stoneLight: 0x5c5850,
        rubble: 0x3e3a32,
        carve: 0x1e1c18,
      },
    },
    // Session 29: the moonshiners' holler's ground (world/hollerGround.js; model z ahead from the mouth
    // at -30, x on the walker's left). floorHalf / yardHalf: the floor's half width up the hollow and at
    // the still's yard (yard: the z it widens over); head: where the headwall starts; wind / windRate:
    // how far and how often the floor winds; the ridges' face, height (left, right), top and fade; mouth /
    // nose: the ridges come down to nothing over `nose` metres before the mouth; gullies for the other
    // pathways in.
    holler: { floorHalf: 4.2, yardHalf: 9.5, yard: [1, 10], head: 21, wind: 2.0, windRate: 0.085, faceRun: 5, height: [7.5, 8.6], topOut: 12, outFade: 14, mouth: -28, nose: 12, lumps: 0.12, gully: 2.4, gullyBlend: 3.2, wooded: 2.0 }, // wooded: metres up the faces the forest's trees start
    clearing: {
      radiusMin: 16,
      radiusMax: 24,
      minGap: 70, // metres between clearing edges
      placementTries: 300, // random positions tried per clearing
      relaxedGapFactor: 0.7, // if a clearing won't fit, retry with the gap shrunk by this factor
    },
    edges: {
      extraFraction: 0.45, // loops: extra pathways on top of the spanning tree, as a fraction of its edge count
      extraMaxLength: 480, // metres; longer shortcuts aren't added
      extraKeepChance: 0.8, // each candidate (shortest first) is taken with this chance, for variety
      detourRatio: 1.8, // a shortcut is only added if the pathways between its ends are at least this many times longer
      maxNorthDetour: 2.5, // rule: from the outpost (the frontier's way in), every north frontier clearing is at most this many times its straight-line distance away by pathway
      minAngleDegrees: 30, // two pathways leaving a clearing are at least this far apart
      clearance: 8, // metres a pathway keeps from clearings it doesn't join (beyond their radius)
    },
    paths: {
      width: 4.5, // metres of bare dirt
      clearance: 2.5, // metres each side beyond the dirt kept free of trees and undergrowth
      edgeSoftness: 1.2, // metres over which the dirt fades into the forest floor
      edgeNoise: 1.4, // metres the edge wanders (noise), so it isn't ruler-straight
      edgeNoiseScale: 9, // metres per wobble of the edge
      wiggle: 0.07, // sideways wander as a fraction of the pathway's length
      wiggleMax: 30, // metres; cap on the wander
      sampleSpacing: 4, // metres between points along a pathway
    },
    clearings: {
      edgeSoftness: 3, // metres over which a clearing's dirt fades into the forest floor
      edgeNoise: 4, // metres the clearing's outline wanders
      edgeNoiseScale: 14,
      treeClearance: 3, // metres beyond the radius kept free of trees
      dirtFraction: 0.75, // the bare dirt patch covers this fraction of the radius; the rest is grassy
    },
    sigilGrounds: {
      // Aaron (M6): two north, two in the middle, one south, so the witch's
      // sigils (and their marches) are spread over the whole map.
      perBand: { north: 2, middle: 2, south: 1 },
      min: 5, // never fewer (the roster drops optional encounters first)
      max: 5,
    },
    maskCell: 2, // metres per cell of the ground mask (dirt, open ground)
    // The gates on the cluster's paths (M9.1; data/openingCluster.json
    // "gates"): light, in-world blocks that stop Tom only (the dead clamber
    // over), each opening on a story progress flag (data/progress.json).
    // The off-path forest still only slows, so they're a soft funnel: their
    // wings run into the trees to make going round a long, slow detour.
    gates: {
      bumpDistance: 1.6, // metres: walking this close to a shut gate tells you why it's shut
      bumpCooldown: 8, // seconds before the same gate tells you again
      pipeGate: { width: 5, wing: 7, height: 1.1, color: 0x3c3a22, post: 0x2c2a20, sign: 'PRIVATE \u2014 PRUITT LAND' },
      fallenTree: { length: 22, radius: 0.55, bark: 0x3a2c20, wood: 0x4e3e2a, branch: 0x2e241a }, // wood: the sawn faces, dull (paler glared)
      chainGate: { width: 6, wing: 9, height: 2.4, color: 0x26292b, chainLink: 0x2a2d30, sign: 'AUTHORIZED PERSONNEL ONLY' },
      signColor: 0x4a4438, // dark, like the signposts: pale boards glare under the torch (Aaron)
      signText: 0x9c8a6c,
    },
    // The military cordon (M9.1; DESIGN.md "Fixed opening cluster"): chain-
    // link and razor wire the full width of the map along the cordon line
    // (config.map.cluster.cordonSouthOfHome). It stops Tom; the dead and the
    // witch come through the torn gaps (they walk the pathways, so mostly
    // through the checkpoint). Intact panels stop everyone; the gaps and the
    // checkpoint's gate stop only the player. Shots go through the wire.
    cordon: {
      postLean: 0.04, // Session 19: radians a post leans at most (six times that by a torn panel)
      shadeJitter: 0.18, // Session 19: each post, lamp and barrier up to this much darker
      panelLength: 3, // metres between posts
      height: 3, // metres of chain-link
      thickness: 0.15, // metres (collider half-thickness)
      postRadius: 0.05,
      chainLink: 0x2a2d30, // dark: paler wire glared under the torch (Aaron, Session 14)
      chainLinkTexture: 128, // pixels
      post: 0x222426,
      coilHeight: 0.6, // metres: the razor-wire coil along the top
      coilColor: 0x45484a, // dark: lighter wire glared under the torch
      cleared: 6, // metres kept free of trees each side
      track: 2.2, // metres of bare dirt along the foot of the fence
      // The torn gaps (x metres from home's centre): peeled in from the far
      // side, too low and too tangled for a man with a pack.
      gaps: [-370, -210, -90, 140, 330],
      gapPeel: 1.0, // radians the torn panel is peeled in (north)
      checkpointHalf: 5.5, // metres either side of the road left for the checkpoint's gate
      // Signs on the fence, facing the cluster.
      signSpacing: 60, // metres
      signSize: [1.1, 0.75], // metres
      signTitle: 'RESTRICTED AREA',
      signLines: ['U.S. ARMY QUARANTINE ZONE', 'USE OF DEADLY FORCE AUTHORIZED'],
      signColor: 0x4a463c, // dark board, dull lettering (pale ones glared)
      signText: 0x9c8a6c,
      // Floodlight posts along the fence: dark and broken (decoration, no lights).
      lampSpacing: 120, // metres
      lampHeight: 6,
      lampColor: 0x2a2b2c,
      lampGlass: 0x1c2224,
      // Concrete barriers lining the fence near the checkpoint (south side).
      barrierReach: 45, // metres either side of the checkpoint
      barrierLength: 3,
      barrierColor: 0x3c3b37,
      // The checkpoint's gate (opens in story order; see the gates).
      gateColor: 0x26292b,
      armColor: 0x6e6a60, // the barrier arm (striped in the texture); dull, the torch glares on pale paint
      boothColor: 0x343a2e,
    },
    // The opening cluster's road (M9.1; DESIGN.md "Fixed opening cluster"):
    // the old county road past the gas station to the checkpoint. Its line
    // is in data/openingCluster.json.
    // Session 21 (M10.2; world/roadNorth.js, render/RoadNorthProps.js,
    // world/RoadNorth.js): the end of the road north. An old road tunnel
    // into the cliff, fallen in; the army's ROAD CLOSED barrier in front of
    // it; a spur of rock out from the cliff east of the road with Bigfoot's
    // cave in its south face, hidden behind brush the dozer clears.
    roadNorth: {
      tunnelName: 'LAUREL GAP TUNNEL',
      tunnelYear: 'W.P.A.  1936',
      portal: {
        front: 3.6, // metres south of the cliff line: the headwall's face (Tom stops 4.5 m out: cliff.walkMargin)
        into: 1.2, // metres it's set back into the rock
        width: 18,
        height: 11,
        opening: { width: 7.6, spring: 3.4 }, // the arch: its span, and the height its curve starts at
        wing: { length: 7, angle: 0.62 }, // wing walls angled back into the rock (radians)
        cliffFlat: 3, // metres either side beyond its width where the cliff's face is smoothed flat behind it
      },
      barrier: { fromCliff: 9.5, half: 7, jerseyBack: 1.6 }, // metres: the barricades' line from the cliff; half its span; the jersey barriers behind
      outcrop: {
        west: 8.5, // metres east of the road's centre: the spur's west side
        east: 25,
        reach: 24, // metres south of the cliff line: its south face, the cave's mouth in it
        mouthEast: 15, // the mouth's centre, metres east of the road
        mouth: { width: 3.8, height: 3.3, depth: 5.5 },
        colliderRadius: 1.8,
      },
      brush: { width: 9, depth: 5, gap: 0.3, cols: 6, rows: 3, logs: 4 }, // the thicket in front of the mouth (metres); Session 21 (Aaron): in pieces, cols x rows bushes and logs trunks, knocked away one at a time (bladeReach, bladeHalf, brushClearAt below)
      // Earl's signs on the way up. along: metres from the fork (negative: from the
      // road's end); side: metres off the centre line, as road.js's frames count
      // it (+ is the left of the heading on the map: west on the road north,
      // so each stands on its readers' right); for: the traffic that reads it.
      signs: [
        { id: 'bigfootXing', along: 70, side: -5.4, for: 'northbound', title: 'BIGFOOT XING', lines: ['NEXT 2 MILES'], art: 'bigfoot' },
        { id: 'homeOfBigfoot', along: -82, side: 5.4, for: 'southbound', title: 'HOME OF BIGFOOT', lines: ["EARL'S GAS  BAIT  GIFTS", 'JUST AHEAD', 'WE BELIEVE!'] },
      ],
      prints: [[-1.0, 1.2, 0.12], [0.5, 2.6, -0.05], [-0.7, 4.1, 0.1]], // the big prints going into the brush: metres from the mouth's line, south of the brush; turn (radians)
      bumpDistance: 1.4, // metres: walking into the barrier or the brush says what it is
      bumpCooldown: 8, // seconds
      mouthRange: 3.5, // metres from the mouth: the cave's prompt (once the brush is cleared)
      bladeReach: 0.5, // metres beyond a piece of brush the dozer's blade knocks it away from
      bladeHalf: 1.7, // metres either side of the blade's centre it reaches
      brushClearAt: 0.8, // once this share of the brush's pieces is down, the rest comes down with it
      look: {
        rockTextureMeters: 8,
        lampPeriod: 1.1, // seconds per blink (the two barricades out of step)
        popSeconds: 0.55, // Session 21: a piece of brush knocked away tumbles off and shrinks to nothing over this long
        weather: { rust: [0x2e2a24, 0x3a3a38] },
        concrete: 0x56544d,
        concreteDark: 0x403e39,
        concreteLight: 0x625f57,
        soot: 0x1e1d1b,
        rubble: 0x3c3a35,
        moss: 0x34362c,
        metal: 0x2e2a24,
        jersey: 0x5a5852,
        jerseyDark: 0x3e3c38,
        leg: 0x3a3a38,
        stripeOrange: 0x6a3418,
        stripeWhite: 0x66635a,
        sandbag: 0x3a3424,
        wire: 0x3a3a38,
        lampLens: 0x3a2a10,
        lampLit: 0xffa424,
        boardWhite: 0x8a867c,
        boardInk: 0x141210,
        boardYellow: 0x8a7a2e,
        plywood: 0x6a5a40,
        stencil: 0x1e1a14,
        plaque: 0x4a463c,
        plaqueInk: 0x1e1c18,
        // Session 25 (Aaron: the torch glared off Earl's signs): dulled, every paint under luma 0.45
        // (lumaOf), and the board's material darkened too (earlTint).
        earlBoard: 0x3e2e1e,
        earlInk: 0x7a6e54,
        earlYellow: 0x6e6226, // the crossing sign's board
        earlYellowInk: 0x241c12, // its figure and lettering
        earlTint: 0xa0a0a0,
        signBack: 0x2e261c,
        leafDark: 0x1c2614,
        leaf: 0x26341a,
        leafBrown: 0x3a2e1a,
        twig: 0x2e2418,
        deadwood: 0x3a3226,
        briar: 0x3a1e1a,
        earth: 0x2e2418,
      },
    },
    road: {
      width: 6.5, // metres of asphalt
      sample: 2, // metres between points along its centre line
      shoulder: 1.6, // metres of gravel each side (drawn as dirt in the ground mask)
      clearance: 3, // metres beyond the shoulder kept free of trees
      across: 6, // columns of the road mesh across its width (it follows the ground)
      lift: 0.05, // metres above the ground
      textureMeters: 16, // the asphalt texture repeats every this many metres along the road
      textureSize: [256, 1024], // pixels (across, along)
      color: 0x55534f, // asphalt, faded
      patchColor: 0x3d3b38, // old tar patches
      crackColor: 0x24221f,
      lineColor: 0xb9a35a, // the worn centre line (dashed yellow)
      edgeLineColor: 0xa9a598, // faded white edge lines
      lineWear: 0.45, // share of the paint worn away
      // Session 19 (style pass 2): potholes per texture tile, their colours;
      // the vertex colouring's wear: broad mottling (cells per metre, how
      // much darker), the edges dirtier, leaf litter drifted onto them.
      potholes: 2,
      potholeColor: 0x1a1816,
      potholeRim: 0x6a6660,
      wear: { scale: 0.08, mottle: 0.22, edge: 0.3, leaf: 0x5a4a32 },
      northWear: { mottle: 0.3, edge: 0.4, across: 0.35 }, // across: leaf litter over the whole width, not just the edges // Session 21: the road north, unused since the army closed it
      // Telephone poles along the north side, with sagging wires between.
      poles: {
        spacing: 38, // metres along the road
        side: 1, // right of the road's heading (it runs west to east, so north of it)
        offset: 6.2, // metres from the centre line
        height: 8.5,
        radius: 0.14,
        crossbar: 1.8, // metres wide
        color: 0x4a3a2a,
        wireColor: 0x1a1a1a,
        wireSag: 0.9, // metres the wire droops mid-span
        wireSegments: 8, // straight pieces per span
        startAlong: 20, // metres from the west end to the first pole
      },
      // Session 21: the road north's poles, up its west side (side +1, as road.js's frames count it).
      northPoles: { startAlong: 24, endBefore: 14, side: 1 },
      // The sign before the outpost.
      sign: {
        along: 426, // metres from the west end (the outpost's centre is at about 520); Session 17: by the outpost's road gate, moved back to 432 for a longer approach
        side: -5.2, // metres right (+) or left (-) of the centre line
        title: 'ROAD CLOSED',
        lines: ['MILITARY CHECKPOINT AHEAD', 'NO ENTRY BEYOND THIS POINT'],
        boardColor: 0x4a4438, // dark, like the signposts: pale boards glare under the torch (Aaron, Session 14)
        boardGrain: 0x3c372d,
        textColor: 0x9c8a6c,
      },
    },
  },

  // Placeholder signposts naming what each clearing will hold
  landmarks: {
    built: ['campsite', 'gasStation', 'stormShelter', 'outpost', 'crashedPlane', 'timeCapsule', 'stairs', 'milosBarn', 'railwayCutting', 'sawmill', 'moonshinersHoller', 'mineshaft'], // Session 15b (and 16, 17; 24: the crashed plane; 26: the old church, the stairs): sets that are built have no placeholder signpost (it stood inside the store)
    postHeight: 2.6, // metres
    postWidth: 0.14,
    postColor: 0x3a2a1c,
    boardWidth: 2.4,
    boardHeight: 1.2,
    boardDepth: 0.08,
    boardDrop: 0.1, // metres from the top of the board to the sign's full height (postHeight)
    postOverlap: 0.15, // metres the post reaches up behind the board's bottom edge
    boardColor: 0x5c4630, // dark wood: lighter boards glared under the torch (Aaron, M3)
    boardGrain: 0x3a2a1a,
    textColor: 0xb8a67e, // dull cream paint, readable on the dark board
    textureWidth: 512, // pixels
    textureHeight: 256,
    offset: 3, // metres from the clearing's centre
    cullCell: 128,
    cullRefreshDistance: 8,
  },

  // Fog of war (DESIGN.md "The map screen and fog of war")
  fogOfWar: {
    cellSize: 8, // metres per reveal cell
    revealRadius: 45, // metres revealed round the player
    revealStep: 2, // metres the player moves before the reveal is checked again
  },

  // Round minimap, top right (placeholder look; the final HUD is Session 19)
  minimap: {
    sizeVmin: 24, // diameter as a share of the screen's short side
    metresAcross: 260, // ground shown across the minimap
    refreshPerSecond: 0, // 0 = redraw every frame: at 20 a second, turning looked jagged and made Aaron queasy (M3 test)
    pixelsPerMetre: 0.5, // resolution of the map image (one pixel per 2 m)
    enemyDotPixels: 3,
  },

  // Full-screen map (D-pad up / M)
  mapScreen: {
    marginVmin: 5, // TV-safe margin
    refreshPerSecond: 10,
    enemyDotPixels: 3,
  },
  // Debug only: sigils drawn on the minimap and map screen.
  sigilMarker: { color: '#b4ff8c', minimapPixels: 5, screenPixels: 7 },
  witchMarker: { color: '#d070ff', minimapPixels: 5, screenPixels: 8 }, // M7 debug

  // Ground: rolling hills, flattened in clearings and smoothed along pathways
  terrain: {
    heightCell: 4, // metres between height samples (and ground mesh vertices)
    // Rolling ground: layers of smooth noise. smoothOnPaths: pathways and
    // clearings lose this layer's small bumps.
    octaves: [
      { wavelength: 180, amplitude: 4.5, smoothOnPaths: false },
      { wavelength: 60, amplitude: 1.4, smoothOnPaths: false },
      { wavelength: 20, amplitude: 0.35, smoothOnPaths: true },
    ],
    clearingFlatten: 0.85, // how level a clearing is (1 = perfectly level)
    clearingFlattenBlend: 18, // metres beyond the radius over which the levelling fades out
    chunkSize: 128, // metres per ground mesh (for distance culling)
    cullRefreshDistance: 8, // metres the camera moves before nearby chunks are re-checked
    tileMeters: 6, // ground textures repeat every this many metres
    // Session 10: the ground's look (render/groundTextures.js, the shader in
    // world/Terrain.js). Leaf litter under the trees, moss and grass in
    // patches and toward open ground, packed dirt on pathways and in
    // clearings, dark wet mud here and there. Each texture is read at two
    // sizes, mixed by noise, so its repeats don't show. Kept dark: the
    // torch lights the ground head-on and light colours glare.
    floor: {
      textureSize: 512, // pixels per texture
      anisotropy: 4, // sharper ground at a glancing angle (capped by the device)
      secondScale: 2.37, // the second read's tile is this many times bigger (and turned)
      noiseMeters: 160, // the shared noise texture covers this many metres before it repeats
      noiseSize: 256, // pixels
      mossOnOpen: 0.3, // open ground (edges of pathways and clearings) is this much mossier
      mossThreshold: [0.42, 0.62], // noise range over which litter turns to moss
      mud: { share: 0.16, darken: 0.45 }, // share of the ground that's mud, and how much darker
      litter: {
        base: 0x2c2218,
        mottle: [0x1e1810, 0x3a2c1c, 0x342818],
        leaves: [0x4e3a24, 0x5a4428, 0x46281e, 0x52442c, 0x3a2e20, 0x56341e],
        needles: [0x4a3826, 0x3a2c1e, 0x5a4630],
        twig: 0x1e160e,
        leafCount: 1800,
        leafSize: [6, 14], // pixels
        needleCount: 900,
        twigCount: 70,
      },
      moss: {
        base: 0x26301c,
        mottle: [0x1c2414, 0x34401e, 0x2c3a1a, 0x3a3a20],
        blades: [0x3a4a24, 0x44522a, 0x2e3c1e],
        straw: 0x5a5030,
        strawShare: 0.15,
        bladeCount: 2600,
        leafCount: 160,
      },
      path: {
        base: 0x46382a,
        mottle: [0x3a2e22, 0x54442e, 0x3e3426],
        grit: [0x2a2018, 0x5e4e3a, 0x4a4036],
        pebbles: [0x4a463e, 0x5a544a, 0x3e3a34, 0x54483a],
        pebbleCount: 260,
        pebbleSize: [1.5, 4.5], // pixels
        leafCount: 120,
        needleCount: 200,
      },
    },
    rocks: {
      sizeMin: 0.35,
      sizeMax: 1.1,
      squash: 0.6, // rocks are flattened vertically by this factor
      detail: 3, // smoothness: subdivision level of the base sphere
      lumpiness: 0.32, // how far the surface bulges in and out, as a fraction of size
      lumps: 6, // number of overlapping bulge waves shaping each rock
      lumpFrequency: 4, // waviness of each bulge
      stretch: 0.3, // each rock is stretched up to this much along its width and depth
      color: 0x45443d, // dark, mossy grey: lighter rocks glare under the torch
      colliderScale: 0.8, // collider radius as a fraction of rock size
      sink: 0.25, // fraction of a rock's height buried, so it sits in slopes
      perClearingMin: 2, // rocks round the edge of each clearing
      perClearingMax: 5,
      forestCell: 26, // metres; at most one forest rock per cell of this size
      forestChance: 0.55, // chance a forest cell has a rock
      maxOpen: 0.2, // rocks stay off pathways (open ground above this)
      pathClearance: 3, // metres round a clearing's rocks kept clear of where pathways come in
    },
    // Cliff face texture (placeholder)
    cliffTextureSize: 256,
    cliffColor: 0x4a4740,
    cliffDark: 0x24221e,
    cliffLight: 0x6a6658,
    cliffMoss: 0x3a4a30,
  },

  // Forest: instanced billboard trees (decided with Aaron in M1: every
  // tree is a camera-facing sprite; final art replaces the procedural
  // placeholder in the art pass)
  forest: {
    cellSize: 3.4, // jittered-grid spacing: at most one tree per cell
    maxOpen: 0.05, // trees only grow where the ground is less open than this (pathways and clearings are open)
    // Density varies across the map (thick stands and thinner woods)
    densityScale: 70, // metres per patch of thicker or thinner forest
    densityMin: 0.55, // chance a cell grows a tree in the thinnest woods (1 in the thickest)
    cliffGap: 5, // metres in front of the cliff face kept free of trees
    jitter: 0.75, // fraction of a cell a tree can wander from its cell centre
    // Session 10: the kinds of tree (render/treeSprites.js), the Appalachian
    // woods. weight: how common. height: metres. widthRatio: sprite width
    // as a fraction of its height. trunk: base and top widths as a
    // fraction of the sprite's width, up to `to` of its height (the
    // sprite's trunk and the 3D trunk near you are drawn to these). solid:
    // how much of that the 3D trunk covers (under a low, drooping canopy it
    // stops short, so it doesn't stand in front of the branches like a post).
    kinds: [
      { look: 'hemlock', weight: 3, height: [10, 17], widthRatio: [0.46, 0.56], trunk: { base: 0.07, top: 0.05, to: 0.12, solid: 0.8 } },
      { look: 'spruce', weight: 2.5, height: [11, 18], widthRatio: [0.36, 0.44], trunk: { base: 0.07, top: 0.05, to: 0.14, solid: 0.8 } },
      { look: 'spruce', weight: 2, height: [9, 15], widthRatio: [0.38, 0.46], trunk: { base: 0.07, top: 0.05, to: 0.14, solid: 0.8 } },
      { look: 'whitePine', weight: 1.6, height: [14, 20], widthRatio: [0.5, 0.62], trunk: { base: 0.07, top: 0.045, to: 0.38, solid: 1 } },
      // The oak is narrow, its limbs reaching up close to the trunk (Aaron:
      // a wide, sprawling billboard showed it turning as you walked past).
      { look: 'oak', weight: 1, height: [10, 15], widthRatio: [0.4, 0.5], trunk: { base: 0.17, top: 0.085, to: 0.4, solid: 1 } },
      { look: 'snag', weight: 0.7, height: [7, 13], widthRatio: [0.35, 0.45], trunk: { base: 0.1, top: 0.04, to: 0.8, solid: 1 } },
    ],
    trunkRadius: 0.3, // collision radius
    // Session 10: solid 3D trunks for the trees near you (render/NearTrunks.js),
    // so a tree up close isn't a flat card. How near: the Quality preset's treeTrunks.
    nearTrunks: {
      sides: 8,
      maxCount: 700,
      gridCell: 16, // metres: trees filed in a grid this size for the lookup
      refreshDistance: 4, // metres you move before the near trunks are refilled
      cover: 1.1, // a touch wider than the sprite's trunk, which stays hidden inside
      flare: 0.3, // the foot widens this much
      flareHeight: 0.6, // metres up the flare reaches
      sink: 0.2, // metres sunk into the ground (slopes)
      barkRepeat: [2, 3], // bark texture repeats round and up each trunk
    },
    chunkSize: 48, // metres; chunks beyond the draw distance aren't drawn
    cullRefreshDistance: 4, // metres the camera moves before nearby chunks are re-checked
    // Undergrowth (M3, Aaron): low bushes and ferns off the pathways that
    // slow you down. Cutting through the forest is allowed, at a cost.
    undergrowth: {
      cellSize: 2.3, // jittered grid: at most one bush per cell (denser after Aaron's M3 test, to show you're in the brush)
      maxOpen: 0.35, // bushes grow where the ground is less open than this
      densityMin: 0.55, // chance per cell in the sparsest patches (1 in the densest)
      heightMin: 0.6, // metres
      heightMax: 1.3,
      widthRatio: 1.6, // sprite width as a multiple of its height
      variants: 4, // bush sprites in the atlas
      textureWidth: 256, // pixels per bush sprite
      textureHeight: 128,
      // Dark albedos: bushes face the torch head-on, like the zombies.
      leafColors: [0x1e321c, 0x283e20, 0x182c1c, 0x304428, 0x22301c],
      fernColor: 0x2a4220,
      berryColor: 0x401624,
      blobs: 180, // leaf clumps per bush sprite
    },
    textureWidth: 384, // pixels per tree sprite (Session 10: sharper up close)
    textureHeight: 768,
    trunkColor: 0x4a3828,
    // Each kind's colours. lit: the moon side picks one of these, so trees
    // aren't one flat green. Kept dark: the torch lights them head-on.
    hemlock: {
      levels: 16, // layers of drooping sprays, top to bottom
      spraysPerLevel: 3, // each side
      fringePerSpray: 12, // hanging needles under each spray
      lit: [0x3a5a44, 0x34523e, 0x426248],
      mid: 0x24402e,
      dark: 0x16281e,
      dapple: [0x1e3826, 0x2e4c36, 0x3c5c44],
    },
    spruce: {
      tiersMin: 8,
      tiersMax: 12,
      spikesPerTier: 9, // jagged needles along each tier's edge
      fringePerSpike: 3,
      halfWidth: 0.44, // the lowest tier's half-width, as a fraction of the sprite's width
      lit: [0x47694a, 0x3d5e3a, 0x557550, 0x4c6c3c, 0x3a5c44],
      dark: 0x1d3322,
      dapple: [0x2c4a2c, 0x5a7a48, 0x3a5a30, 0x6a8650, 0x22402a],
    },
    whitePine: {
      whorlsMin: 6,
      whorlsMax: 8,
      skipChance: 0.25, // a whorl missing on one side (the gaps a white pine has)
      // Kept thick enough to survive the sprite being shrunk far off (Aaron:
      // thin ones vanished and left the needle clumps floating).
      crownTrunkTop: 0.022, // the trunk's width at the very top, as a fraction of the sprite's width
      branchWidth: [0.016, 0.03], // branch thickness, top whorl to bottom, as a fraction of the sprite's width
      blobsPerClump: 60,
      lit: [0x52705a, 0x5a7862, 0x4a6852],
      mid: 0x2e4636,
      dark: 0x1a2c22,
      dapple: [0x3a5444, 0x5a7462, 0x2a4232],
    },
    oak: {
      depth: 4, // how many times the limbs fork
      limbWidth: 0.05, // the main limbs' thickness, as a fraction of the sprite's width
      spread: 0.8, // radians the main limbs fan across (kept tight, so the sprite stays narrow)
      forkSpread: 0.4, // radians each fork can turn from its limb
      upPull: 0.15, // radians each fork is pulled back toward straight up
      bark: 0x3a3028,
      barkLit: 0x5a4a3a,
      leafChance: 0.45, // a dead leaf still hanging at a twig's end
      leaves: [0x5a3a1e, 0x6a4422, 0x4a2a1a, 0x5e4a2a],
    },
    deadColor: 0x4a4038,
    // Session 10: each tree (and bush) is tinted a little differently,
    // from where it stands, so the forest isn't one stamp.
    tint: {
      brightness: [0.82, 1.12],
      warm: [1.06, 1.02, 0.88], // multiplied in at one end of the range
      cool: [0.9, 1.0, 1.06], // and the other
    },
    // Dappling: small speckles painted over the needles for depth and leaf variety.
    dappleCount: 12000, // speckles per conifer sprite (Session 10: bigger sprites)
    dappleSizeMin: 1, // pixels
    dappleSizeMax: 2,
    dappleShadowColor: 0x040704,
    dappleShadowShare: 0.5, // fraction of speckles that are shadow (more on the right, the shadow side)
    dappleShadowAlpha: 0.5,
    dappleLeafColors: [0x2c4a2c, 0x5a7a48, 0x3a5a30, 0x6a8650, 0x22402a],
    dappleLeafAlpha: 0.4,
    // Bark: dark and light vertical streaks on trunks and dead trees.
    barkStreaks: 60,
    barkDark: 0x22180f,
    barkLight: 0x6a5240,
    barkStreakAlpha: 0.55,
    // Dead tree trunk close-up detail (seen at face height).
    deadBarkStreaks: 260, // fine grain on the trunk alone
    deadShadeLight: 0.25, // lit left edge
    deadShadeDark: 0.65, // shadowed right edge, so the trunk reads as round
    deadCracks: 10,
    deadCrackAlpha: 0.8,
    deadKnots: 4,
    deadKnotRimAlpha: 0.5,
    deadBranches: 7, // the snag's stubs
    alphaTest: 0.5,
    normalUpBias: 0.5, // tilts sprite normals up so moonlight from above reads
    windStrength: 0.03, // sway at the treetop, as a fraction of sprite width
    windSpeed: 0.9,
    windSpatialScale: 0.15, // how much neighbouring trees sway out of step
    glareRadiusRatio: 0.3, // how near the canopy counts as "close" for torch glare, as a fraction of sprite width
  },

  // Player: first-person movement (feel signed off in the M0 play-test at 4.5 m/s)
  player: {
    radius: 0.35, // collision radius, metres
    eyeHeight: 1.7,
    crouchEyeHeight: 1.1,
    crouchTransitionSpeed: 8, // how fast the eye height eases between stand and crouch
    walkSpeed: 4.5, // metres per second at full stick
    sprintMultiplier: 1.6, // full sprint = walk x this (zombie speeds are multiples of it)
    crouchMultiplier: 0.5,
    aimMultiplier: 0.6, // aiming or firing slows the player (DESIGN.md "Movement")
    acceleration: 30, // m/s^2 toward the stick's target speed
    deceleration: 40,
    sprintMinMove: 0.5, // stick deflection needed to start or keep sprinting
    jumpSpeed: 4.8, // m/s upward
    gravity: 14, // m/s^2
    // Session 16 (Aaron, a try-out from the debug menu): a jetpack. Hold A
    // (jump) in the air to climb; `seconds` of fuel, refilled on landing.
    jetpack: { seconds: 10, thrust: 22, maxRise: 8 },
    pitchLimit: 85, // degrees up/down
    startYaw: 180, // degrees; 180 faces south (the map's start is home, on the northern cliff)
    // Off the pathways the undergrowth slows you (Aaron, M3: a real hassle
    // when escaping zombies, so the pathways matter). Scales walk, sprint and crouch.
    undergrowthMultiplier: 0.55,
    headBob: {
      amplitude: 0.035, // metres at walking speed
      frequency: 0.9, // bob cycles per metre travelled
      returnSpeed: 8, // how fast the bob settles when stopping
    },
    stamina: {
      max: 200, // Aaron (M6): doubled (was 100): about 10 s of sprint, for the long runs home
      drainPerSecond: 20,
      regenPerSecond: 15,
      regenDelay: 1, // seconds after sprinting before stamina refills
      minToStartSprint: 15,
    },
  },

  // Health, armour and healing (DESIGN.md "Health, armour and healing")
  health: {
    max: 100,
    start: 100,
    healPerSecond: 10, // one point at a time; a second kit queues behind the first
  },
  armour: {
    types: {
      ballistic: { max: 100 }, // grey-blue: vests, helmets, body armour
      energy: { max: 100 }, // green-cyan: alien shields
      nature: { max: 100 }, // mossy green: Bigfoot's gift
    },
    damageOrder: ['ballistic', 'energy', 'nature'], // then health
  },

  // The flare gun (M9.1; DESIGN.md "Flares"): Y fires a flare along the
  // crosshair like any gun (a fast, glowing projectile that drops a little).
  // A direct hit conks a zombie (damage and a stagger; Aaron) and the flare
  // falls where it struck. It burns red where it lands. The newest burning
  // flare is the one that matters: it lights the ground (one light, made at
  // load) and every zombie within lureRadius goes to it instead of you for
  // its burn. Older flares just glow out. Never the witch.
  flares: {
    // How many you start with and can carry: config.inventory (startFlares, maxFlares).
    fireInterval: 0.8, // seconds between shots
    speed: 55, // metres a second out of the barrel
    gravity: 9.8, // metres a second squared
    drag: 0.35, // air drag (per second): fired straight up it climbs about 60 m, slows, arcs over and comes down in about 7 s (Aaron: no snapping to the ground)
    maxFlight: 20, // seconds: a safety net only (it always comes down before this)
    muzzleOffset: { right: 0.22, down: 0.18, forward: 0.6 }, // metres from the eye
    hitDamage: 18, // a conk: 3x on the head (headshotMultiplier), so it can drop a citizen
    stagger: 0.9,
    knockback: 1.2,
    burnSeconds: 20,
    lureRadius: 35, // metres: zombies this close go to the newest flare
    lureMill: 2.5, // metres: they mill about this close to it
    lureBreakDistance: 3, // metres: a zombie this close to you that notices you comes for you anyway
    recoilDegrees: 2,
    noise: 25, // the pop: zombies this close hear it (the lure takes over once it lands)
    // Looks (render/FlareRenderer.js)
    color: 0xff3a24,
    glowSize: 1.6, // metres: the sprite at the flare
    groundGlowRadius: 6, // metres: the lit patch of ground round a burning flare
    trailSize: 0.7, // metres: the glow on a flare in flight
    flicker: 0.25, // share the glow and light waver
    light: { intensity: 14, distance: 22, decay: 1.6 }, // the newest flare's light
    poolSize: 12, // flares drawn at once (oldest burnt-out ones are reused)
    // The Mothman's attention (DESIGN.md "The Mothman"): counted now, used from M10.
    attentionPerFlare: 1,
    attentionDrainPerMinute: 0.5,
  },

  // Light aim assist: controller look slows when the crosshair is on or
  // near a target. No magnetism or snapping. Mouse is never assisted.
  aimAssist: {
    enabled: true,
    maxDistance: 40, // metres; targets further away get no help
    marginDegrees: 1.5, // full slowdown this far outside the target's body
    fadeDegrees: 3, // then fades back to normal over this many degrees
    slowFactor: 0.45, // look speed multiplier at full slowdown
    aimingSlowFactor: 0.35, // stronger while aiming down sights (LT)
  },

  // Weapons: one table (DESIGN.md "Weapons"); the turret's ammo conversion
  // will read from it too. kind 'melee' swings in an arc; 'hitscan' fires
  // `pellets` instant rays inside a spread cone.
  weapons: {
    // M2 started with all three so they could be compared. M9.2: the
    // shotgun is the campsite's prize instead (Skip intro gives it).
    // Session 15b (Aaron): the service rifle waits at the top of the lookout
    // tower (config.station.towerRifle); Tom wakes with the shovel.
    // Session 15b (Aaron): not even the shovel in the comms room with the
    // family: it leans by the cabin's front door (config.station.shovelByDoor).
    // 'hands' is nothing in hand; it goes once Tom has a weapon.
    startingLoadout: ['hands'],
    startingWeapon: 'hands',
    switchSeconds: 0.35, // lower one weapon and raise the next
    // Session 20 (Aaron, Nov 8): ammo types. Tap B to reload; hold B to swap
    // the ammo, once per hold (round 31), and the gun reloads with it on
    // release. Holding does nothing different without another type in the
    // pack. A gun lists the extra types it fires in `altAmmo`; its own rounds come first.
    ammoChoice: { holdSeconds: 0.35 },
    ammoTypes: {
      // From aliens; the first come off the crashed plane's grey (Session 25).
      alienShells: { name: 'alien shells', base: 'shotgun', damageScale: 1.5, flash: 0xb070ff, hudColor: '#b98aff' },
    },
    // Session 20 (Aaron, Nov 8): the loadout (player/loadout.js). Two long
    // guns, a sidearm, one melee weapon; the flare gun is always to hand.
    // The rest wait on the comms room's gun rack (a gun found with its slot
    // full goes there by itself). Tools never take a slot: the shovel digs
    // from the belt once something better is in the melee slot.
    loadout: {
      slots: { long: 2, sidearm: 1, melee: 1 },
      slotOf: {
        rifle: 'long', shotgun: 'long', sniper: 'long', thermal: 'long', autoShotgun: 'long',
        pistol: 'sidearm', smg: 'sidearm',
        shovel: 'melee', spikeMaul: 'melee', chainsaw: 'melee',
      },
      tools: ['shovel'],
      rackName: "the comms room's gun rack",
    },
    // Session 25 (Aaron, after playing it): RB / LB rotate through the kinds, in this order; each brings
    // out the one last held of it (the weapon cross picks which). Kinds Tom has nothing of are skipped.
    rotation: [
      { id: 'pistol', weapons: ['pistol', 'smg'] },
      { id: 'rifle', weapons: ['rifle', 'sniper', 'thermal'] },
      { id: 'shotgun', weapons: ['shotgun', 'autoShotgun'] },
      { id: 'melee', weapons: ['shovel', 'spikeMaul', 'chainsaw'] }, // the maul (Session 27), the chainsaw (Session 28)
      { id: 'explosive', weapons: ['dynamite', 'detonator'] }, // while there are sticks (Session 27), while charges are out or in hand
    ],
    // Session 25 (Aaron): Tom carries every gun; the weapon cross (ui/WeaponCross.js, D-pad down
    // with nothing to watch) lays them out, nearest the middle first. flareGun, dynamite and charges
    // are its specials (always to hand on Y; not built yet; the detonator).
    cross: {
      up: ['shotgun', 'autoShotgun'],
      left: ['pistol', 'smg'],
      right: ['rifle', 'sniper', 'thermal'],
      down: ['flareGun', 'dynamite', 'charges'],
      melee: ['shovel', 'spikeMaul', 'chainsaw'], // Session 25 (Aaron): the melee bar along the bottom
    },
    headshotMultiplier: 3, // Aaron: x2 at least, open to x3-4
    fireSlowSeconds: 0.35, // movement stays slowed this long after a shot or swing
    // Session 15b: empty-handed (no model, no attack).
    hands: { name: '', kind: 'none', magSize: 0, fireInterval: 1, recoilDegrees: 0, noise: 0 },
    shovel: {
      name: 'Shovel',
      kind: 'melee',
      damage: 20,
      reach: 2.2, // metres from the eye
      arcDegrees: 70, // full width of the swing
      fireInterval: 0.7,
      hitDelay: 0.14, // seconds into the swing when it connects
      stagger: 0.55, // seconds a hit zombie is stunned
      knockback: 1.4, // metres a hit pushes the zombie back
      magSize: 0,
      recoilDegrees: 0,
      noise: 4, // metres: zombies this close hear it (silent, near enough)
    },
    // Session 27: the railroad spike maul (the railway cutting; DESIGN.md "Weapons"): a heavy sledge for
    // the melee slot, slower than the shovel and much harder. An overhead smash (config.viewModel.smash):
    // a slow lift, a fast drop; it connects at the bottom of the drop. It cleaves: everything in its arc,
    // up to `cleave`, each further one taking `cleaveKeep` of the last's damage. A miss hits the ground
    // (a thud and a jolt). Swinging it slows Tom for `slowSeconds`. It knocks rusted iron loose too (the
    // powder store's bar, the cowcatcher's bolts: encounters/RailwayCutting.js).
    spikeMaul: {
      name: 'Railroad spike maul',
      kind: 'melee',
      swing: 'smash',
      damage: 65, // a level 1 citizen (60) in one; police and army in two
      reach: 2.5,
      arcDegrees: 60,
      fireInterval: 1.15,
      hitDelay: 0.5, // the bottom of the drop (config.viewModel.smash: strike x seconds)
      stagger: 1.2,
      knockback: 3.4,
      cleave: 3,
      cleaveKeep: 0.65,
      slowSeconds: 0.75, // Tom's slowed this long after a swing (the shovel: fireSlowSeconds)
      shake: 0.35, // the camera's jolt on a hit (the shovel's is 0.15)
      thudShake: 0.12, // on a miss: the head into the ground
      magSize: 0,
      recoilDegrees: 0,
      noise: 9, // metres: a sledge's thump carries further than a shovel's
    },
    // Session 28: the chainsaw (the sawmill; DESIGN.md "Weapons"; config.chainsaw; combat/Chainsaw.js revs
    // it and cuts with it: this slot only puts it in hand).
    chainsaw: { name: 'Chainsaw', kind: 'saw', magSize: 0, fireInterval: 0.1, recoilDegrees: 0, noise: 0 },
    // Session 27: a stick of dynamite in hand (combat/Dynamite.js does the lighting and throwing; the
    // slot's there while there are sticks: config.dynamite).
    dynamite: { name: 'Dynamite', kind: 'thrown', magSize: 0, fireInterval: 0.5, recoilDegrees: 0, noise: 0 },
    // M7: the remote for planted charges (combat/Explosives.js). A slot only
    // while charges are out or in hand; RT sets them all off.
    detonator: {
      name: 'Detonator',
      kind: 'remote',
      magSize: 0,
      fireInterval: 0.5,
      recoilDegrees: 0,
      noise: 0,
    },
    rifle: {
      name: 'Service rifle',
      kind: 'hitscan',
      damage: 25,
      pellets: 1,
      spreadDegrees: 1.2, // from the hip
      aimSpreadDegrees: 0, // aimed down sights
      range: 150,
      pierce: 4, // passes through up to this many zombies (Aaron: carve through mobs)
      pierceKeep: 0.75, // fraction of the damage kept after each zombie
      falloffStart: 150, // no falloff
      falloffEnd: 150,
      falloffMin: 1,
      fireInterval: 0.6, // bolt cycle
      magSize: 5,
      startReserve: 10, // "a handful of rounds"
      reloadSeconds: 2.2,
      reloadStyle: 'magazine',
      stagger: 0.3,
      knockback: 0.3,
      recoilDegrees: 2.6,
      aimFovMultiplier: 0.6, // zoom when aiming
      shake: 0.15,
      noise: 70, // metres: every zombie this close hears the shot and comes (DESIGN.md "noise")
    },
    shotgun: {
      name: 'Shotgun',
      kind: 'hitscan',
      altAmmo: ['alienShells'], // Session 20: hold B to choose
      damage: 6,
      pellets: 8,
      spreadDegrees: 6,
      aimSpreadDegrees: 4,
      range: 45,
      pierce: 2, // each pellet can go through the front zombie into the one behind
      pierceKeep: 0.5,
      falloffStart: 8, // full damage up to here
      falloffEnd: 25, // falloffMin of the damage from here on
      falloffMin: 0.3,
      fireInterval: 0.9, // pump
      magSize: 4,
      startReserve: 12,
      reloadSeconds: 0.55, // per shell
      reloadStyle: 'single',
      stagger: 0.45,
      knockback: 0.8, // per pellet, capped by the zombie's maxKnockback
      recoilDegrees: 5.5,
      aimFovMultiplier: 0.85,
      shake: 0.4,
      noise: 55,
    },
    // Session 10b (Aaron): a scoped bolt-action hunting rifle, from an
    // encounter (the debug menu gives it until then), with its own rare
    // rounds. It kills with a headshot: 50 to the body never drops even a
    // level 1 citizen (60), 150 to the head drops the toughest (an army
    // zombie at level 5, 144). Its power is how far it punches through a
    // line of them (10 zombies, keeping 95% each time; the service rifle 4 at 75%).
    sniper: {
      name: 'Hunting rifle',
      kind: 'hitscan',
      damage: 50,
      pellets: 1,
      spreadDegrees: 3.5, // from the hip: unscoped it's clumsy
      aimSpreadDegrees: 0, // through the scope
      range: 250,
      pierce: 10,
      pierceKeep: 0.95,
      falloffStart: 250,
      falloffEnd: 250,
      falloffMin: 1,
      fireInterval: 1.5, // a slow bolt
      magSize: 5,
      startReserve: 0,
      reloadSeconds: 3,
      reloadStyle: 'magazine',
      stagger: 0.5,
      knockback: 0.6,
      recoilDegrees: 4.5,
      aimFovMultiplier: 0.25, // a 4x scope
      scope: true, // aiming shows the scope view instead of the gun
      scopeLookScale: 0.3, // turning slows this much at full zoom, so 4x isn't twitchy
      helmetPierce: true, // Session 17 (Aaron, Oct 16): punches straight through an army helmet (the headshot lands)
      shake: 0.3,
      noise: 100, // loud: every zombie this close hears it
      debugRounds: 10, // the debug menu's "give the hunting rifle" comes with these
    },
    // Session 10b: guns Aaron tried and kept. They come from encounters
    // (not chosen yet, OPEN_QUESTIONS #143); the debug menu gives them until
    // then. `ammo`: the rounds they share with another gun's pool; `auto`:
    // keeps firing while the trigger is held.
    pistol: {
      name: 'Pistol',
      kind: 'hitscan',
      damage: 10, // DESIGN.md: 10 per round
      pellets: 1,
      spreadDegrees: 2.5,
      aimSpreadDegrees: 0.8,
      range: 60,
      pierce: 1,
      falloffStart: 25,
      falloffEnd: 60,
      falloffMin: 0.7,
      fireInterval: 0.18, // as fast as you pull
      magSize: 12,
      startReserve: 0,
      reloadSeconds: 1.4,
      reloadStyle: 'magazine',
      stagger: 0.2,
      knockback: 0.15,
      recoilDegrees: 1.6,
      aimFovMultiplier: 0.8,
      shake: 0.08,
      noise: 40,
      debugRounds: 36,
    },
    smg: {
      name: 'SMG',
      kind: 'hitscan',
      ammo: 'pistol', // shares the pistol's rounds
      auto: true,
      damage: 10,
      pellets: 1,
      spreadDegrees: 3,
      aimSpreadDegrees: 1.2,
      range: 70,
      pierce: 1,
      falloffStart: 30,
      falloffEnd: 70,
      falloffMin: 0.6,
      fireInterval: 0.08, // 750 rounds a minute
      magSize: 30,
      startReserve: 0,
      reloadSeconds: 2.2,
      reloadStyle: 'magazine',
      stagger: 0.12,
      knockback: 0.08,
      recoilDegrees: 0.7,
      aimFovMultiplier: 0.75,
      shake: 0.05,
      noise: 50,
      debugRounds: 90,
    },
    thermal: {
      name: 'Semi-auto rifle (heat scope)',
      kind: 'hitscan',
      ammo: 'sniper', // the hunting rifle's rare rounds
      damage: 50, // like the hunting rifle: it kills with a headshot
      pellets: 1,
      spreadDegrees: 3.5,
      aimSpreadDegrees: 0.3,
      range: 220,
      pierce: 6,
      pierceKeep: 0.9,
      falloffStart: 220,
      falloffEnd: 220,
      falloffMin: 1,
      fireInterval: 0.3, // semi-automatic
      magSize: 10,
      startReserve: 0,
      reloadSeconds: 2.6,
      reloadStyle: 'magazine',
      stagger: 0.4,
      knockback: 0.5,
      recoilDegrees: 3,
      aimFovMultiplier: 0.33, // a 3x scope
      scope: true,
      thermal: true, // the scope sees heat: the living glow white, the world goes dark
      scopeLookScale: 0.4,
      shake: 0.25,
      noise: 100,
      debugRounds: 20,
    },
    autoShotgun: {
      name: 'Auto shotgun',
      kind: 'hitscan',
      ammo: 'shotgun', // shares the pump shotgun's shells
      altAmmo: ['alienShells'], // Session 20
      auto: true,
      damage: 6,
      pellets: 8,
      spreadDegrees: 7,
      aimSpreadDegrees: 5,
      range: 40,
      pierce: 2,
      pierceKeep: 0.5,
      falloffStart: 8,
      falloffEnd: 25,
      falloffMin: 0.3,
      fireInterval: 0.2, // 300 rounds a minute
      magSize: 20, // a drum
      startReserve: 0,
      reloadSeconds: 3.2,
      reloadStyle: 'magazine',
      stagger: 0.4,
      knockback: 0.6,
      recoilDegrees: 3.5,
      aimFovMultiplier: 0.85,
      shake: 0.3,
      noise: 60,
      debugRounds: 40,
    },
  },

  // Aiming down sights (LT)
  aiming: {
    zoomSpeed: 12, // how fast the view eases in and out of the zoom
  },

  // Weapons in hand (placeholder shapes; real models in the art pass).
  // Offsets are metres in camera space: x right, y up, z forward is negative.
  viewModel: {
    // The weapons aren't lit by the scene's lights (the torch sits right
    // beside the gun and would blow it out). Instead their colours follow
    // the sky: ambient + sun/moon (as the scene's lights are set each
    // moment), plus a warm fill while the torch is on and a flash on firing.
    lighting: {
      scale: 0.6, // overall brightness of the sky's contribution
      sunFactor: 0.5, // share of the sun/moon light that reaches the gun
      torchFill: 0.15, // added while the torch is on
      torchColor: 0xfff1d6,
      flashBoost: 0.6, // added for a moment when firing
      response: 8, // how quickly the gun follows a change in light
    },
    hip: { x: 0.2, y: -0.245, z: -0.46 }, // Session 10b (Aaron): a little lower at the hip (was -0.21)
    aim: { x: 0, y: -0.082, z: -0.36 }, // centred under the crosshair (Session 10b: the new models' sights sit lower)
    shovelHip: { x: 0.22, y: -0.3, z: -0.46 },
    // Session 15b (Aaron): digging up a sigil: the shovel blade-down in front
    // (pitch: radians, negative tips the blade down), a stroke every `stroke`
    // seconds: driven `thrust` m down and `reach` m out, then levered back.
    dig: { x: 0.1, y: -0.19, z: -0.26, pitch: -0.3, yaw: -0.05, roll: -0.08, stroke: 1.0, thrust: 0.14, reach: 0.12, lever: 0.4 },
    // Weapon sway while moving, paced like footsteps (Aaron's M2 play-test:
    // tying it to the head bob made it vibrate at a sprint). One vertical dip
    // per step; side to side once every two steps.
    bob: {
      amount: 0.012, // metres of vertical dip at walking pace
      sideRatio: 0.8, // side-to-side sway as a fraction of the dip
      walkStepsPerSecond: 1.8,
      sprintStepsPerSecond: 2.3,
      minStepsPerSecond: 1.1, // slow creeping (crouch) never drops below this
      sprintAmount: 1.5, // dip at a full sprint, as a multiple of `amount`
      response: 6, // how quickly the sway grows and settles when you start and stop
      aimDamping: 0.85, // fraction of the sway removed while aiming
    },
    kickBack: 0.07, // metres the gun jumps back on a shot
    kickRotate: 0.12, // radians the muzzle climbs
    kickRecover: 14,
    reloadDip: 0.7, // radians the gun tips down while reloading
    switchDrop: 0.35, // metres it drops out of view while switching
    // Session 10b (Aaron: "a Fruit Ninja style slice"): the shovel's swing.
    // Fractions of `seconds`: wind up to `start`, slash to `end` by
    // `strike`, then back to rest. Swings alternate direction (yaw, roll
    // and x mirror). The hit still lands at weapons.shovel.hitDelay (0.14 s,
    // at the end of the slash).
    slash: {
      seconds: 0.34,
      // Aaron: at rest it looked held out in front. Now it's carried upright,
      // the handle near vertical and the blade up by your shoulder; swings
      // start and end here.
      rest: { yaw: -0.15, pitch: 0.95, roll: -0.25, x: 0.02, y: -0.27 }, // Aaron: blade at or just below the centre of the view
      windup: 0.14,
      strike: 0.42,
      start: { yaw: -0.75, pitch: 0.55, roll: -0.6, x: 0.06, y: 0.06 }, // raised, blade out to the right
      end: { yaw: 0.95, pitch: -0.5, roll: 0.7, x: -0.22, y: -0.08 }, // swept across, low left
      // The trail: a curve in the view plane (x right, y up, metres at `depth`).
      from: [0.5, 0.32],
      bend: [0.1, -0.28], // a deep curve, dipping below the centre
      to: [-0.55, -0.12],
      depth: -0.7,
      width: 0.05,
      tail: 0.55, // trail length, as a share of the curve
      fadeAfter: 0.3, // share of the swing it takes to fade after the slash
      color: 0xe6f0ff,
      intensity: 1.3, // above 1, so the bloom catches it
    },
    // Session 27: the spike maul's overhead smash (the shovel's slash's poses, the same keys; nothing
    // mirrors). A slow lift over the right shoulder (windup), a fast drop to the middle (strike: the
    // hit, weapons.spikeMaul.hitDelay), held on the ground a beat (settle), then hauled back to rest.
    smash: {
      seconds: 1.1,
      rest: { yaw: -0.35, pitch: 0.78, roll: -0.5, x: 0.06, y: -0.3 },
      windup: 0.34,
      strike: 0.46,
      settle: 0.62,
      raised: { yaw: -0.12, pitch: 2.05, roll: -0.18, x: 0.02, y: 0.12 },
      down: { yaw: 0.04, pitch: -0.2, roll: 0.03, x: -0.17, y: 0.03 }, // the head on the ground just below the middle of the view
      jolt: 0.05, // metres the view model jumps on the impact
    },
    // Session 28: the chainsaw in hand (player/ViewModel.js updateSaw). At rest it hangs low, the bar
    // angled across the view; revving it comes up and forward and levels out; it shakes with the
    // revs (shake, metres) and harder in a cut (cutShake), and digs forward into what it's cutting
    // (cutPush). Overheated, it drops (stallDrop) and smoke comes off it.
    saw: {
      rest: { yaw: 0.5, pitch: -0.2, roll: 0.25 },
      revved: { yaw: 0.3, pitch: 0.03, roll: 0.1, x: -0.06, y: 0.04, z: -0.08 },
      idleShake: 0.0012,
      shake: 0.004,
      cutShake: 0.011,
      cutPush: 0.06,
      stallDrop: 0.07,
      chainSpeed: 9, // the chain's teeth: lengths of the bar a second at full revs
    },
    muzzleFlashSeconds: 0.05,
    muzzleFlashColor: 0xffd890,
    scopeHideAt: 0.8, // Session 10b: the scope view replaces the gun once the zoom is this far in
    // Session 10b: the heat scope (the semi-auto rifle). Through it the world
    // is cold and dark grey, day or night, and the living glow white.
    thermal: {
      world: { sky: 0x3a3e3e, fog: 0x343838, ambient: 2.2, light: 1 }, // flat, even light: no torch, no moon
      // Aaron: too bright to see clearly from the tower to the fence (20-40 m),
      // even after a first fade. Now bloom is off through the heat scope, the
      // glow is lower, and it fades from full at farMetres to nearGlow of
      // that at nearMetres.
      glow: 1.0, // emissive white on zombies and mutants at range (was 1.6)
      nearGlow: 0.65,
      witchNearGlow: 0.8, // she's plain white with no light on her, so she needs more to read as hot
      nearMetres: 4,
      farMetres: 60, // was 30
      bloom: false, // the bloom pass is off while looking through it
      tint: 0xe8f4ea, // a faint cold green-white over the whole view
    },
    // Session 10b: where guns other than the long guns sit (the pistol is held
    // closer and lower; the SMG a touch closer).
    offsets: {
      pistol: { hip: { x: 0.17, y: -0.2, z: -0.38 }, aim: { x: 0, y: -0.075, z: -0.32 } },
      smg: { hip: { x: 0.19, y: -0.225, z: -0.42 }, aim: { x: 0, y: -0.098, z: -0.34 } },
      chainsaw: { hip: { x: 0.2, y: -0.27, z: -0.4 }, aim: { x: 0.2, y: -0.27, z: -0.4 } }, // Session 28: held low across the body, both hands
    },
  },

  // Healing (DESIGN.md "Health, armour and healing"): used with D-pad
  // right (H), no animation.
  inventory: {
    // Session 20 (Aaron, Nov 8): the healing pool. Every kit is points in one
    // pool (the HUD shows the total); the kit used is chosen automatically
    // (player/healingPool.js). Kits that don't fit under the cap go to the
    // comms room's first aid box (config.station.aidBox).
    healing: {
      poolCap: 270, // Aaron: was 9 kits
      kits: {
        firstAid: { heal: 30, name: 'first aid kit' },
        alienMed: { heal: 60, name: 'alien med kit' },
      },
      startKits: {}, // Session 16 (Aaron): none; the comms room's first aid box has 2
    },
    // M4: loot that has no other home yet. Pistol ammo waits for the
    // pistol; scrap waits for building and repairs (M5).
    // M5: "a little bit of scrap" to patch the torn east fence (Aaron). M9.2:
    // most of it is found at the campsite now (line 11: "the scrap you found").
    startScrap: 8,
    startAmmo: { pistol: 0 },
    startBatteries: 0, // carried batteries (no carry limit and no slowdown: Aaron, M5)
    startFlares: 0, // Session 16 (Aaron): none at the start (they're found)
    maxFlares: 3, // carry limit
  },

  // Zombies (DESIGN.md "Zombies"). M4: levels, variants, hordes, mutants,
  // detection and targeting. M6: simulation tiers, and no small ceiling
  // on how many zombies the map holds (Aaron: drop the 64 cap).
  zombies: {
    // The pool grows in chunks as the night needs it, up to max. max is a
    // safety net, not a design number: the sigils' caps decide the night.
    population: { initial: 64, chunk: 32, max: 480 },
    // Simulation tiers (DESIGN.md "Performance and simulation LOD";
    // ai/simTiers.js). Distances are from the player.
    lod: {
      activeRadius: 60, // full simulation every frame within this...
      nearbyRadius: 150, // ...the same every few frames out to this; beyond, abstract
      hysteresis: 8, // metres past a boundary before a zombie changes tier
      activeCap: 25, // at most this many active (the nearest); the rest are nearby
      nearbyEveryFrames: 3, // a nearby zombie takes a step every this many frames
      abstractSeconds: 1, // an abstract zombie takes its coarse steps about this often
      abstractSubStep: 0.5, // seconds per coarse step (so it doesn't overshoot a bend)
      abstractMarchScale: 2.5, // marchers out of sight move this much faster, so far sigils reach home in a night (Aaron: fine)
      stationKeepsSimulated: true, // zombies within the station's reach never go abstract while you're near home (away, NightWatch resolves attacks instead)
      renderCap: 160, // most zombie sprites drawn at once (active first, then nearby)
      drawMargin: 5, // metres past the draw distance that nearby sprites are still drawn
      timingSmoothing: 0.05, // the overlay's sim time is smoothed by this much per frame
      tierColors: { active: '#ff3030', nearby: '#ffa020', abstract: '#b060ff' }, // debug tint (map dots and sprites)
    },
    health: 60, // a level 1 citizen; variants and levels multiply it
    radius: 0.35, // body collision radius, metres
    hitRadius: 0.3, // body hit cylinder
    height: 1.8,
    headBottom: 1.42, // the head hit box runs from here to height
    headRadius: 0.16,
    spriteHeightRatio: 1.08, // sprite height = height x this; width follows the frame's aspect
    // Speeds are multiples of the player's full sprint (DESIGN.md "Zombies"),
    // rolled per zombie and skewed toward the slow end. Each zombie keeps its
    // roll, so when the level changes (a sigil planted or dug up) every
    // living zombie speeds up or slows down at once.
    sprintSpeed: 7.2, // player walk 4.5 x sprint 1.6
    speedSkew: 2, // 1 = even spread; higher = more slow zombies
    // Zombie level = active sigils (1-5). health, damage and notice multiply
    // the base numbers; defenceDamage is for the station's defences (M5).
    levels: {
      1: { speedMin: 0.35, speedMax: 0.45, hordeChance: 0, mutantChance: 0, health: 1, damage: 1, notice: 1, defenceDamage: 1 },
      2: { speedMin: 0.35, speedMax: 0.55, hordeChance: 0.1, mutantChance: 0, health: 1.1, damage: 1.1, notice: 1.1, defenceDamage: 1.2 },
      3: { speedMin: 0.4, speedMax: 0.7, hordeChance: 0.1, mutantChance: 0.05, health: 1.2, damage: 1.2, notice: 1.2, defenceDamage: 1.4 },
      4: { speedMin: 0.45, speedMax: 0.95, hordeChance: 0.2, mutantChance: 0.1, health: 1.35, damage: 1.35, notice: 1.3, defenceDamage: 1.7 },
      5: { speedMin: 0.5, speedMax: 1.3, hordeChance: 0.3, mutantChance: 0.15, health: 1.5, damage: 1.5, notice: 1.4, defenceDamage: 2 },
    },
    // Variants (DESIGN.md table). The mix comes from the clearing type of
    // the sigil's clearing (data/clearingTypes.json). Drops: data/loot.json.
    variants: {
      citizen: { health: 1 },
      police: { health: 1.5 }, // uniform and bulletproof vest: tougher
      army: { health: 1.6, helmet: 25 }, // fatigues and helmet: tougher. Session 17 (M9.4): the helmet stops the headshot bonus until it's taken 25 damage (Session 17, Aaron: a long fight: one service rifle round to the head knocks it off), or the hunting rifle punches straight through it
      earl: { health: 1 }, // Session 13: Earl Pruitt, the gas station's owner (one, authored: the storm shelter's hatch)
      logger: { health: 1.25 }, // Session 28: the sawmill's crew: big men (render: the citizens' shapes in flannel)
      moonshiner: { health: 1.15 }, // Session 29: the Rigsbys, turned round their still (render: the citizens' shapes in overalls)
      mib: { health: 1.6 }, // Session 13: a dead agent in its body armour (as tough as the army: the hunting rifle still kills it with a headshot)
    },
    // One spawn of 7-15 slow zombies in a tight cluster that wanders as a pack.
    horde: { countMin: 7, countMax: 15, speedMin: 0.35, speedMax: 0.5, radius: 4 },
    riseSeconds: 1.6, // climbing out of the ground beside a sigil
    burrowSeconds: 2.5, // sinking back in at dawn
    // Random walk along the pathway graph (DESIGN.md "Enemy targeting").
    wander: {
      pace: 0.55, // fraction of its speed while wandering (it speeds up when it notices you)
      waypointReach: 2.5, // metres: close enough to a pathway point to head for the next
      hordeFollow: 1.5, // metres behind the leader's spot that a pack member aims for
      marchPackPace: 0.9, // M6: a marching group walks at this x its slowest member's speed, so it stays together
    },
    // Dawn: most zombies sink back into the ground; a few stay as stragglers.
    dawn: {
      stragglers: 0.15, // fraction that stays and wanders by day
      minPlayerDistance: 25, // never sinks in front of you or while chasing you
      retrySeconds: 3,
    },
    turnRate: 6, // how fast a zombie turns to face where it's going
    // M6: a zombie walking toward a goal (not chasing) that barely moves for
    // `seconds` (a parked car square in its way) detours round it.
    unstick: {
      minProgress: 0.3, // moving less than this fraction of its stride counts as stuck
      seconds: 0.8,
      lookRadius: 3, // metres to look for what's in the way
      detourDistance: 4, // metres to the side
      detourAhead: 1, // and this far on toward the goal
      detourSeconds: 1.6, // how long it walks the detour before trying the goal again
      maxTries: 3, // stuck again soon after: the same side, further out each time; then the other side
      forgetSeconds: 4, // moving freely this long and it starts afresh
    },
    undergrowthMultiplier: 0.75, // zombies push through brush better than you do, so cutting through while chased costs
    separation: 0.8, // zombies push apart inside this distance
    attackReach: 1.25, // metres between centres
    attackWindup: 0.5, // seconds from starting the swipe to the hit (time to back off)
    attackRecover: 0.75, // seconds after the hit before the next swipe
    attackDamage: 10,
    maxKnockback: 1.6,
    knockbackSpeed: 8, // how fast the knockback is applied
    deathSeconds: 0.8, // the fall
    corpseSeconds: 20, // bodies stay this long
    corpseSinkSeconds: 2, // then sink out of sight
    hitFlashSeconds: 0.15,
    spawnCount: 5, // debug "spawn" adds this many
    spawnDistanceMin: 16,
    spawnDistanceMax: 26,
    walkFrameRate: 1.6, // walk cycles per metre
    groanIntervalMin: 3,
    groanIntervalMax: 9,
    glareRange: 6, // zombies this close are fed into the torch glare check
    // The sprite atlas, drawn on a canvas at load (render/zombieSprite.js).
    // Session 13 (#144, Aaron: keep the sprites, vary the citizens): a
    // palette swap. Shirts, trousers, hair and skin are painted grey and
    // each zombie is coloured in as it's drawn (render/zombieLook.js), so
    // every one can look different in the same single draw call.
    texture: {
      frameWidth: 96,
      frameHeight: 128,
      atlasMaxSize: 4096, // pixels: the atlas is laid out in a grid no bigger than this (any tablet loads it)
      // Fixed colours (dark albedos: the torch blows out anything light).
      blood: 0x2e0404, // the mouth, and the blood on the body
      eyes: 0xc8c090, // the pale eyes are meant to catch the torch
      // The blood on the body (Aaron: different on each zombie): spots
      // drawn by the shader in a grid of cells over each frame, in atlas
      // pixels. amount: how bloody a zombie is (skew > 1: most lightly);
      // each layer's chance of a spot per cell is x that. parts: how much
      // each part takes it. far: the even stain it fades to far off.
      bodyBlood: {
        amount: [0.08, 1],
        skew: 1.6,
        seeds: 997, // different patterns
        drops: { cell: 5, chance: 0.5, radius: [0.7, 1.6] },
        splashes: { cell: 13, chance: 0.6, radius: [2, 4.5], drip: 0.6 }, // drip: the share that run down
        parts: { shirt: 1, trousers: 0.5, hair: 0.25, skin: 0.7 },
        far: 0.18,
      },
      // Grey the coloured-in parts are painted with (1 = the palette colour
      // as it is): the arm behind the body, the torn hem.
      tones: { behind: 0.58, hem: 0.62 },
      // One block of 8 facing rows per variant and hairstyle, in this
      // order (the shader picks the block). A hairstyle changes the
      // outline, so each gets its own block; colours are free.
      variantOrder: ['citizen', 'police', 'army', 'mib', 'earl'],
      hairStyles: { citizen: ['short', 'long', 'balding', 'ponytail', 'trucker'], police: ['short'], army: ['short'], mib: ['short'], earl: ['trucker'] },
      // The trucker cap (a hairstyle, Session 13): the crown and peak in
      // the hair's colour (so the caps vary), the foam front panel fixed.
      truckerFront: 0x4a4840,
      // The palettes (Appalachia, 2003), shared unless a variant has its own.
      palettes: {
        shirt: [
          0x4a1a16, // flannel red
          0x1e2a3c, // denim
          0x26321e, // faded green
          0x3e2c18, // work-jacket brown
          0x2e2e30, // grey hoodie
          0x34141c, // maroon
          0x4a3a14, // mustard
          0x46443c, // off-white tee (kept dark: the torch blows it out)
          0x141416, // black tee
          0x161c2c, // navy
          0x173232, // teal
          0x5a2a0c, // blaze orange (hunting)
        ],
        trousers: [
          0x1c2638, // jeans
          0x12161e, // dark jeans
          0x2c3648, // faded jeans
          0x4a4230, // khaki
          0x121214, // black
          0x2e2418, // work brown
          0x262c1c, // olive
        ],
        hair: [
          0x0e0c0a, // black
          0x1e140c, // dark brown
          0x2e1e12, // brown
          0x4a3c22, // dirty blond
          0x4a4a46, // grey
          0x4a1e0c, // ginger
          0x6a6a64, // white
        ],
        // Living complexions gone grey and sick. Aaron: one dark
        // complexion in eight (the rest pale), nearer the region's people.
        skin: [
          0x4e5844, // grey-green
          0x6a6e5c, // pale
          0x646a58, // pale grey-green
          0x6a665a, // ashen
          0x5c5a44, // sallow
          0x58606a, // bluish
          0x6a5e56, // greyish pink
          0x3a3024, // brown
        ],
      },
      // Each variant: its own palettes (replacing the shared ones), the
      // share with long sleeves, the share in plaid flannel; and its kit
      // (a police vest and cap, an army helmet), in fixed colours.
      looks: {
        citizen: { longSleeves: 0.5, plaid: 0.3 },
        police: { shirt: [0x161c2c, 0x1a2234], trousers: [0x12141c], longSleeves: 0.4, plaid: 0, vest: 0x2a3038, hat: 'cap', hatColor: 0x0e1018 },
        // Session 13: camouflage, webbing, and a bare-headed block for when its helmet's gone.
        army: { shirt: [0x34402a, 0x3a4430], trousers: [0x2e3824, 0x343c28], longSleeves: 1, plaid: 0, camo: 1, webbing: 0x22241a, bare: true, hat: 'helmet', hatColor: 0x2a3222 },
        // Session 28: a dead logger (the sawmill's crew): the citizens' shapes (short hair, balding or a
        // cap), always long sleeves, nearly always plaid flannel, work trousers.
        logger: { as: 'citizen', hairs: ['short', 'balding', 'trucker'], shirt: [0x4a1a16, 0x26321e, 0x4a3a14, 0x3e2c18, 0x34141c], trousers: [0x1c2638, 0x2e2418, 0x12161e, 0x4a4230], longSleeves: 1, plaid: 0.85 },
        // Session 29: a dead moonshiner (the Rigsbys of the holler): the citizens' shapes, faded work
        // shirts under denim overalls (the vest block, in the trousers' denim, is the bib).
        moonshiner: { as: 'citizen', hairs: ['long', 'balding', 'trucker', 'short'], shirt: [0x4a4234, 0x3a3e40, 0x5a4a34, 0x3a2a22], trousers: [0x24303e], vest: 0x24303e, longSleeves: 0.6, plaid: 0.25 },
        // Session 13: a dead Man in Black. The shirt is its white shirt (so
        // the blood shows), under a torn black suit (jacket: open down the
        // front, a rip across the back), a black tie, the body armour's
        // plate in the jacket's gap, sunglasses. Neat dark or grey hair.
        mib: {
          shirt: [0x66665e, 0x605c54],
          trousers: [0x0e0e12, 0x121216],
          hair: [0x0e0c0a, 0x1e140c, 0x2e1e12, 0x4a4a46],
          longSleeves: 1,
          plaid: 0,
          jacket: 0x111115,
          tie: 0x060608,
          plate: 0x24262a,
          shades: 0x040405,
        },
        // Session 13: Earl Pruitt, the gas station's owner, dead at his
        // storm shelter's hatch with the safe's combination on him. Sixties:
        // a faded red trucker cap (his 'hair'), grey stubble and sideburns,
        // a tan work shirt with chest pockets, a belt, jeans. One look,
        // whatever the seed (one colour per part).
        earl: {
          shirt: [0x3e3220],
          trousers: [0x1c2638],
          hair: [0x4a1a14],
          skin: [0x6a665a],
          longSleeves: 1,
          plaid: 0,
          stubble: 0x3e3e3a, // grey, but darker than his skin so it reads
          pockets: true,
          belt: 0x24180e,
        },
      },
      plaid: { every: 6, line: 2, dark: 0.55 }, // atlas pixels between the lines, their width, how dark they are
      camo: { cell: 7, dark: 0.5, light: 1.5 }, // atlas pixels per blotch; the dark (brown) and light (khaki) tones
      // Each zombie's build: a little wider or narrower, taller or shorter
      // (the sprite only: its hit box stays the same).
      build: { width: [0.9, 1.12], height: [0.96, 1.04] },
    },
    alphaTest: 0.5,
    normalUpBias: 0.4,
    albedoScale: 0.45, // sprites face the torch head-on, so they need darker colours than the art suggests
    hitFlashColor: 0x8a1010,
    // M5: a zombie standing in a station floodlight's pool is lit up
    // (the floodlights are fake lights, so the sprite brightens itself).
    floodlit: { color: 0xfff0c8, strength: 2.2 },
  },

  // Mutant zombie (DESIGN.md "Mutants"): a placeholder 3D giant (boxes;
  // the real model is the art pass). Level 3+, rolled per single spawn.
  mutant: {
    poolSize: 4, // at most this many at once (also its render pool)
    health: 300, // about 5x a citizen, before the level's multiplier
    radius: 0.6,
    hitRadius: 0.55,
    height: 2.5,
    headBottom: 2.02,
    headRadius: 0.26,
    speedMin: 0.36, // fixed range (multiples of the player's sprint), whatever the level
    speedMax: 0.48,
    attackReach: 1.9,
    attackWindup: 0.9, // slow, heavy swipe: time to back off
    attackRecover: 1.3,
    attackDamage: 30,
    turnRate: 3,
    staggerScale: 0.25, // shrugs off most of a hit's stun
    knockbackScale: 0.2,
    // Aaron (M4 test): vary its pace. When it becomes aware of you it charges
    // three sprinting steps at you, then two more every 3 s while chasing.
    charge: {
      speed: 7, // m/s while charging (your sprint is 7.2)
      stepLength: 1.3, // metres per sprinting step
      firstSteps: 3,
      steps: 2,
      interval: 3, // seconds between bursts while it chases you
      lean: 0.3, // radians: head down while charging
    },
    // Aaron (M4 test, "a bit of a bullet sponge"): health stays, but aim pays.
    headshotMultiplier: 4, // its own (other zombies use weapons.headshotMultiplier)
    // A glowing red spot on its back. A sphere that stands out from the body,
    // so only shots from behind reach it; a shovel swing from behind lands on it too.
    weakSpot: {
      multiplier: 8,
      back: 0.44, // metres behind its centre
      height: 1.85, // above its feet
      radius: 0.24, // hit sphere (a little bigger than the drawn spot)
      meleeBehindDegrees: 50, // a swing from within this much of straight behind
      color: 0xff2412,
      pulseSpeed: 1.4, // throbs, cycles per second
      pulseMin: 0.55, // brightness at the bottom of a throb
    },
    // Session 13: the real model (render/mutantModel.js; MutantRenderer
    // poses it). Dark albedos, as the zombies' (the torch blows out light ones).
    look: {
      modelHeight: 2.46, // the model as built (stretched to height)
      albedo: 0.34, // its colours x this (as config.zombies.albedoScale: the torch blows out anything light)
      skin: 0x4a5040,
      skinDark: 0x2e3428,
      raw: 0x3a1612, // raw patches and tumours
      sac: 0x5a1410, // the weak spot's sac (it glows weakSpot.color)
      mouth: 0x140606,
      eyes: 0x9a9470,
      eyesGlow: 0x2a2818, // a faint glow, so they catch the eye in the dark
      bone: 0x7a7260, // spurs and claws
      jeans: 0x1c2638, // its torn jeans
      shirt: 0x3a3830, // the strip of shirt left on it
      hitFlash: [2.2, 0.6, 0.6], // its colour while flashing
      poseRate: 14, // how fast it blends into a new pose (per second)
      slamSeconds: 0.16, // the club coming down once the swipe lands
      lyingDepth: 1.2, // metres a corpse sinks
      wakeSeconds: 2.2, // the authored mutant unfolding to its full height (state 'wake')
      twitchesPerSecond: 1.3, // dormant: how often it might twitch
    },
  },

  // Sigils (DESIGN.md "Sigils"): each raises zombies round itself at night,
  // up to its own cap. At most five at once; the zombie level is the count.
  sigils: {
    cap: 5,
    perSigilCap: 6, // living zombies one sigil has raised before it waits (M6: wanderers only; marchers have left)
    // M6: night marches. A raising is either a single wanderer or a whole
    // marching group that climbs out together and sets off for the station
    // along the pathways (a horde always marches). The odds are set so
    // about marchShare of the zombies raised march (Aaron: two thirds).
    marchShare: 0.67,
    marchGroupSize: [4, 5, 6, 8, 10], // by level (1-5)
    nightQuota: [12, 14, 16, 18, 20], // most zombies one sigil raises a night, by level (1-5)
    spawnInterval: [18, 36], // seconds between raisings at night
    groundSpawnMultiplier: 0.6, // sigil grounds raise faster: interval x this
    firstSpawnDelay: [2, 12], // seconds after nightfall (or planting at night)
    spawnRadius: [3, 9], // metres from the sigil
    spawnPhases: ['night'],
    look: {
      earthRadius: 1.9, // the patch of disturbed earth
      glyphRadius: 1.35,
      earthColor: 0x2a1e14,
      glowColor: 0x8cff6a, // sickly green
      emissiveNight: 1.1, // the glyph's glow by night...
      emissiveDay: 0.18, // ...and by day (still faint; easier to spot at night)
      pulseSpeed: 1.6,
      pulseAmount: 0.3,
      haloSize: 3.2, // soft glow above it, metres
      haloNight: 0.45,
      haloDay: 0.04,
      haloFadeNear: 2, // metres: the halo is gone this close...
      haloFadeFar: 9, // ...and full from here out
      lift: 0.04, // metres above the ground
      textureSize: 256,
    },
  },

  // M6: tonight's danger to the station (base/danger.js), in the same
  // units as security, so margin = security - danger.
  danger: {
    perZombie: 2, // danger per marching zombie that reaches the station
    // How much the level's defenceDamage also weighs on danger (0: not at
    // all). Aaron (M6): a fully built station (about 130-150) held a
    // five-sigil night with a couple of panels down, but the forecast said
    // -139; the level already counts through the bigger quotas, faster
    // marches and the attacks' own damage. 0 puts that night at about +9.
    levelWeight: 0,
    typicalSpeedRoll: 1 / 3, // a typical zombie's place in its level's speed range (rolls skew slow)
    raiseSpread: 0.5, // groups rise through about this much of the night (later ones from far sigils miss dawn)
  },

  // M6: nights (base/NightWatch.js): the dusk forecast, nights resolved
  // while you're away, and the alarm.
  nights: {
    awayRadius: 150, // metres from the station: beyond this you're away and attacks are resolved, not fought
    awayHysteresis: 8,
    forecastSeconds: 14, // the dusk forecast panel stays this long (the ledger's Forecast tab keeps it)
    alarmFraction: 0.5, // DESIGN.md: the alarm when security falls below this x the security at dusk
    // The margin table (base/nightResolver.js, DESIGN.md).
    resolver: {
      cleanMargin: 20, // +20 or more: clean night
      mayFallMargin: -10, // -1 to -10: may fall; below: likely overrun
      overrunSpan: 20, // the overrun band's chance climbs over this many points below -10
      // Fraction of an attack's full damage that lands, by band ('holds'
      // runs from the first number at margin 0 to the second at +19).
      damage: { clean: 0.05, holds: [0.5, 0.15], mayFall: 0.8, overrun: 1 },
      // Chance the whole night ends in the station falling, across each band.
      fall: { mayFall: [0.1, 0.6], overrun: [0.6, 0.95] },
      healthPerZombie: 120, // (the resolver's full damage per zombie; the away siege uses awayDps instead)
      // Aaron (M6): an attack while you're away lasts the night. The group
      // gathers just outside the fence where it arrived and claws at it
      // until dawn: each zombie does awayDps x the band's damage x the
      // level's defenceDamage per second. A horde of 13 at level 1 takes a
      // 500 panel in about 4-5 night hours ("an evening", Aaron), about 1-2
      // at level 5 with a hopeless margin; one or two barely scratch it.
      // If the margin says it breaks through, the group goes on through the
      // gap to the front door and then the comms room.
      awayDps: 0.45,
      spreadBreak: 1, // at most this x a barrier's health per tick before the rest spills along the fence
      zapsPerZombieSecond: 0.1, // the charged fence zaps each attacker this often (charge used; 0.3 drained a 145 charge, and so the turret, in one horde)
      turretKillRounds: 10, // away, the turret fires at its mode's rate and kills an attacker every this many rounds (Aaron: a built station with the turret on fast survives five sigils with a couple of panels down)
      mutantWeight: 4, // a mutant in an attack counts as this many zombies
      standOff: 5, // metres outside the fence the group gathers
      gatherRadius: 4,
    },
  },

  // M6, Aaron's idea: come back at night to an encounter you've already
  // visited and a few zombies have turned up there (night only, Aaron),
  // so the world doesn't empty out as you clear it (ai/revisits.js).
  revisits: {
    kinds: ['encounter'], // clearing kinds that get them
    triggerDistance: 130, // spawned as you come within this of the clearing (out of sight)...
    rearm: 20, // ...after being at least this much further away
    count: [4, 5],
    spread: 0.7, // spawned within this fraction of the clearing's radius
  },

  // Where the witch plants a sigil (M4's rules, used by her since M7):
  // most go to empty sigil grounds, the rest a little way off a pathway.
  planter: {
    groundChance: 0.6, // DESIGN.md "most plantings (e.g. 60%) go to empty sigil grounds"
    groundOffset: 3, // metres from a sigil ground's centre (clear of the signpost)
    pathOffset: [6, 16], // otherwise: this far off a pathway, into the forest
    homeMinDistance: 160, // never near the station
    minGap: 70, // metres between sigils
    playerMinDistance: 50, // not planted in front of you
    keepOut: 6, // metres outside encounter clearings, home and the hut
    tries: 60,
  },

  // The witch (M7, DESIGN.md "The witch"). Every number is a first pass
  // for Aaron's play-tests.
  witch: {
    clusterPlantMargin: 12, // M9.1: before the crossing she plants at least this far north of the cordon (inside the cluster)
    // Planting (Aaron, M7): she hides in her hut by day and sets out at
    // dusk. Night 1 is safe; from night 2 she plants one sigil a night,
    // and from night 3 sometimes a second if the night allows.
    firstNight: 2,
    secondFromNight: 3,
    secondChance: 0.4,
    plantSeconds: 45, // Aaron (M7 step 1): 2 minutes was too long; DESIGN.md said 2-3
    lateCutoff: 0.8, // she doesn't start out for another sigil past this share of the night
    // Movement: a loping run on the pathways (the player sprints at 7.2 m/s).
    roamSpeed: 6.05, // metres per second while travelling, near the player (Aaron: 10% faster than 5.5, he could keep pace)
    abstractScale: 3, // out of sight (beyond the zombies' nearby radius) she travels this much faster
    turnRate: 8, // radians per second
    radius: 0.3, // body collision
    reach: 1.2, // metres from a waypoint before she heads for the next
    unstickSeconds: 0.6, // barely moving this long: she sidesteps
    unstickDistance: 3, // metres to the side
    soundEvery: 3.5, // seconds between her ritual songs
    songRange: 70, // metres her singing carries

    // Fighting her (step 2). Aaron: "make her good and strong": about 3-4
    // good ambushes to kill her, if she isn't given time to heal.
    health: 1000, // Aaron (Session 9): doubled from 500. A rifle body shot is 25 (2.5%), a headshot 50
    headshotMultiplier: 2, // her own (zombies take x3)
    // Her hit shape: standing, and crouched in the ritual.
    hitShape: { radius: 0.3, height: 2.15, headBottom: 1.85, headRadius: 0.14 },
    crouchedShape: { radius: 0.5, height: 1.05, headBottom: 0.75, headRadius: 0.16 },
    // Noticing you: the shared detection model with her own eyes.
    notice: 1.3, // x the zombies' sight and hearing distances
    ritualNotice: 0.35, // in the ritual's trance she only notices you this close (x her sight)
    ritualHearing: 30, // metres: a gunshot this close breaks the trance (any shot she hears out of it)
    // Fight or flee (DESIGN.md): health share plus a bonus near her hut.
    fleeBelow: 0.6, // below this score she flees, at or above it she attacks
    hutBonus: 0.5, // added at the hut, fading to nothing hutRadius away
    hutRadius: 250,
    rethinkSeconds: 1, // how often she reconsiders mid-fight
    loseSeconds: 6, // out of sight this long: she gives up the fight or the chase
    // Session 14 (Aaron: she was relentless; in the early game you must be
    // able to run from her): she gives up a fight once you're `leash`
    // metres from where it started (leashEarly until Tom crosses the
    // cordon, leashLate after; never in the final battle), then leaves you
    // be for calmSeconds unless you hit her.
    pursuit: { leashEarly: 50, leashLate: 140, calmSeconds: 40 },
    // Aaron (Session 9): her fight has three modes.
    //  - Retreat: she backs off, weaving, until she's standoff metres away
    //    (or maxSeconds have passed: a tree can stop her). In the final
    //    battle she keeps arenaMargin metres inside the witchfire ring.
    //  - Hex: she holds about standoff away, weaving, and throws a fast hex
    //    every few seconds. Come within tooClose and she retreats again.
    //  - Rush: any hit but the shotgun's (rifle or pistol, body or head)
    //    sends her in to swipe, again and again; she keeps on you, so the
    //    swipes all but can't be dodged. Any shotgun hit drives her back at
    //    once (retreat), or backOffDamage from anything else.
    // She summons the dead whenever it's ready, and drops traps as she retreats.
    attack: {
      retreat: { speed: 8, standoff: 20, tooClose: 10, maxSeconds: 5, weave: 2.2, weavePeriod: 1.6, arenaMargin: 4 }, // Aaron: 30 m was too far (and caught her in the trees round the arena)
      hold: { speed: 4, band: 3 }, // hex mode: m/s, and how far off standoff she lets you push before correcting
      hex: { every: 6, castTime: 0.45, damage: 20, speed: 25, radius: 0.45, life: 4, minRange: 4, maxRange: 45, height: 1.5 }, // Aaron: 2.5x faster (was 10 m/s), every 6 s (was 2.6)
      rush: { speed: 11, backOffDamage: 100, maxSeconds: 12 }, // you sprint at 7.2; 100 is 2 rifle headshots or 4 body shots
      swipe: { reach: 2.3, damage: 30, windup: 0.4, recover: 0.9, track: 1 }, // track: metres past her reach a swipe still lands (she follows you through it)
      summon: { count: [3, 4], cooldown: 60, ring: [3, 6], castTime: 1.2 },
    },
    flee: { speed: 8, weave: 2.2, weavePeriod: 1.6 }, // m/s (you sprint at 7.2), weaving side to side
    wounds: {
      recoverPerDay: 0.35, // share of her health back each day in the hut (about 2.5 days to heal)
      oneSigilBelow: 0.6, // wounded: at most one sigil a night
      stayHomeBelow: 0.3, // badly wounded: she stays in to heal
      homeAfterFleeBelow: 0.4, // after fleeing, she goes home rather than back to planting
    },
    // Traps (step 3; DESIGN.md "Traps").
    traps: {
      // Around the hut approach, laid at the start of the run.
      hut: { count: 16, radius: 320, falloff: 2.2, sampleEvery: 8, minGap: 14, sideJitter: 1.4, mix: { snare: 0.45, totem: 0.25, charm: 0.3 } },
      // Dropped behind her as she flees.
      dropEvery: 3.5, // seconds
      dropMix: { snare: 0.5, totem: 0.2, charm: 0.3 },
      dropSlow: 0.6, // her speed while dropping one...
      dropSlowSeconds: 0.5, // ...for this long
      maxDropped: 20, // the oldest dropped trap goes past this
      targetRange: 60, // metres: totems and charms nearer than this can be shot
      snare: { radius: 0.75, damage: 5, presses: 6, decay: 0.15 }, // Aaron: mash A about 2 seconds to tear free
      totem: { zone: 3.5, damagePerSecond: 8, tick: 4 },
      charm: { trip: 1.6, alert: 80, witchHears: 250 }, // metres: zombies this close come; the witch hears it this far
      shapes: { totem: { radius: 0.3, height: 0.6 }, charm: { radius: 0.25, height: 1.5 } }, // hit shapes
      look: { rope: 0x3a2c1c, wood: 0x2e241a, bone: 0x9a9480, glow: 0xb8ff5a, ringOpacity: 0.22, totemHeight: 0.6 }, // Aaron (Session 9): the totem low to the ground (was 1.4 m)
    },
    flinchSeconds: 0.25,
    bossBarSeconds: 8, // her health bar shows this long after she's hit or while she fights
    deathSeconds: 2.5, // she's drawn this long after the killing blow (writhing, then bursting apart: look.burstAt)
    // Placeholder look (Aaron agreed; she gets more detail in the art pass).
    // Aaron (step 1 test): a thin shadow creature, not a solid object. She
    // is unlit near-black (the torch can't light her or glint off her);
    // only her silhouette and her eyes read.
    look: {
      height: 2.3, // metres
      shadow: 0x030304, // her whole body, unlit
      eyes: 0xd6ff6a, // unlit and bright, so the bloom picks them out
      thinness: 0.72, // width and depth scale of her body (Aaron: thinner)
      // Session 13: her rags (render/WitchRenderer.js). Metres and seconds.
      rags: {
        cloakStrips: 11, // the hem's strips (with as many notches between)
        cloakTear: 0.38, // the longest a strip hangs below the hem
        cloakNotch: 0.22, // the deepest a notch is cut up into the cloak
        sleeveHang: 0.2, // how far the wide sleeves hang past her wrists
        hairStrands: 8,
        claw: 0.06, // her claws' length
        sway: 0.05, // the rags' flutter as she floats
        trail: 0.35, // how far they stream behind her at full speed
        rate: 2.2, // flutter speed
        agitated: 2.4, // x the flutter while she contorts, fights, rises or dies
      },
      // Aaron (Session 10): upright while she travels. Bent over read as an
      // old woman, not a scary entity. She glides tall, head level, arms
      // hanging straight and limp at her sides.
      // Aaron (Session 13): never bent forward at the waist, anywhere.
      armsBack: 0.08, // radians her arms hang back from straight down (was 0.45 + 0.35 moving)
      standBack: 0.08, // radians she leans back at the waist facing you (was 0.18 forward)
      lunge: 0.4, // radians the whole of her tilts into a swipe (a lunge, not a bow)
      // Fleeing (Aaron, Session 13): she lifts and flies off head first, her
      // back arched backwards, arms and rags streaming behind.
      flee: {
        lift: 0.45, // metres higher off the ground
        pitch: 0.45, // radians the whole of her tilts into the flight (about the waist)
        arch: 0.4, // radians her back arches backwards
        headBack: 0.15, // radians her head tips back further
        armsBack: 1.0, // radians her arms stream back
        trail: 0.35, // radians more her cloak streams behind
      },
      // Aaron (step 1 test): she glides, no steps or arm swing (too human).
      glide: {
        hover: 0.12, // metres her hem floats off the ground
        float: 0.05, // metres of slow rise and fall
        floatSpeed: 1.6, // radians per second
        trail: 0.22, // radians her cloak tilts back behind her at full speed
        fullSpeed: 6, // m/s that counts as full speed for the trailing
      },
      // The ritual (Aaron: contort, so she reads as something horrible;
      // Session 13: no fold at the waist): sunk low in her cloak, upright
      // and arched back, her head craned down over the spot, arms splayed
      // to the ground, head and arms snapping between wrong angles.
      crouch: 0.42, // her cloak's height while crouched, as a share of standing
      plantArch: 0.3, // radians her back arches backwards
      crane: 0.9, // radians her neck cranes her head forward and down
      snapsPerSecond: 1.6, // how often her head and arms jerk to a new angle
      snapTime: 0.12, // share of each snap spent moving (the rest she holds still)
      ritual: { color: 0x9cff4a, radius: 1.6, opacity: 0.55, pulse: 1.4 }, // the glowing ring round her as she plants
      hex: { color: 0xb8ff5a, core: 0.16, halo: 0.42, haloOpacity: 0.35 }, // her thrown hexes: a glowing core in a faint halo
      // Her death (step 6): writhing in her own witchfire, then bursting apart.
      burstAt: 0.9, // seconds after the killing blow
      burstSeconds: 2.4,
      burstEmber: 0xff8a30,
      burstStick: 0x2a1f15,
      burstBone: 0xb8b098,
    },
  },

  // The witch's hut (M7 step 4): a placeholder crooked shack in the middle
  // of the hut clearing (world/Hut.js, render/HutRenderer.js).
  // Session 13 (#146): the real hut, a taken settler's log cabin (Aaron).
  hut: {
    width: 5, // metres
    depth: 4,
    height: 2.5, // walls
    colliderRadius: 2.9, // one circle round the walls
    wreckRadius: 2.2,
    doorStep: 1.6, // metres out from the front wall where she comes and goes
    lean: 0.06, // metres it leans out of true per metre up
    roofSag: 0.28, // metres the roof's ridge sags in the middle
    rockRange: 11, // metres: the porch's rocking chair rocks by itself when you're this near (Aaron)
    totemRing: 5.5, // metres: the ring of stick totems round the yard
    firePit: [3.1, 4.3], // the fire pit, in the hut's frame (x across, z out of its door)
    fireLight: { color: 0xff7a30, intensity: 30, distance: 16, decay: 1.6 }, // the burning wreck's light
    look: {
      log: 0x3a3026,
      logDark: 0x241c16,
      stone: 0x3a3832,
      floor: 0x1e1812,
      roofBoard: 0x1e1a14,
      shingle: 0x2a241c,
      moss: 0x26301e,
      board: 0x2e261c,
      ash: 0x5e5a54, // the hand-prints and scratches: pale ash (Aaron; dim, or the torch makes them white gloves)
      root: 0x14160f,
      twig: 0x3a2e20,
      twine: 0x4a3e2a,
      bone: 0x8a8470,
      glow: 0x7aff48,
      charred: 0x141210,
      ember: 0xff7a28,
    },
  },

  // Explosives (M7 step 4; DESIGN.md "Explosives"). Debug-given until the
  // mineshaft, outpost and Car Armory (M9-M11).
  explosives: {
    carryMax: 2, // in hand and planted together
    plantSeconds: 1.5, // hold X
    hutPlantRange: 2.5, // metres from the hut's walls to plant on it
    radius: 9, // metres
    damage: 220, // to zombies and the witch at the centre (a mutant has about 360)
    playerDamage: 120, // to you at the centre (armour first)
    edge: 0.25, // share of the damage at the edge of the blast
    knockback: 3,
    shake: 1.4,
    alert: 160, // metres: every zombie this close hears it
    look: { charge: 0x4a5040, led: 0xff2010, blinkPerSecond: 1.5, core: 0xfff0c0, fire: 0xff6a18, fireSeconds: 1.1 },
  },

  // Session 27: dynamite (combat/Dynamite.js; DESIGN.md "Weapons"): the first handheld throwable,
  // old and sweating, from the railway cutting's powder store (and the mineshaft, later). Scarce
  // (Aaron). With it in hand: press RT to strike a match and light the fuse; hold, and the fuse
  // burns (it's lit the moment you press: cook it to land it short); release to throw. Hold too long
  // and it goes off in your hand (Aaron: "Yes blow up in hand"). Thrown, it arcs, bounces and rolls,
  // and goes off when its fuse runs out; a lit stick lying there goes off at once if it's shot
  // (a hard knock). The arc's drawn while it's lit, so the throw reads.
  dynamite: {
    carryMax: 8,
    fuseSeconds: 3.4, // from the match to the bang
    hurryAt: 1.1, // seconds left: the prompt says throw it, the hiss climbs
    throwSpeed: 15, // m/s
    throwLift: 0.17, // radians above the look direction it leaves the hand
    minHold: 0.12, // a tap still lights it and throws it
    cooldown: 0.65, // seconds before the next stick's in hand after a throw
    gravity: 18, // m/s² (a little heavier than the world's, so the arc's short and readable)
    restitution: 0.32, // of the speed into the ground kept as bounce
    friction: 0.5, // of the speed along the ground kept on a bounce
    rollDrag: 6, // per second, rolling
    restSpeed: 0.35, // m/s: below this it lies still
    radius: 0.05, // the stick's, for walls and trunks
    hitBox: 0.28, // metres round a lying stick a shot (or a swing) catches it
    arcDots: 70,
    arcStep: 0.025, // seconds of flight between dots
    // The blast: smaller than a military charge, rougher (config.explosives' shape).
    blast: { radius: 6.5, damage: 180, playerDamage: 110, edge: 0.2, knockback: 4.2, shake: 1.2, alert: 130 },
    inHandDamage: 70, // gone off in his hand: it hurts a great deal (armour first), but needn't end the run
    look: { stick: 0x7a2a22, cap: 0x5a4a34, fuse: 0x8a8070, spark: 0xffc070, arc: 0xc08048, ring: 0xc08048 },
  },

  // The final battle (M7 step 5; DESIGN.md "Final battle"): the blood night.
  finalBattle: {
    introSeconds: 3.2, // the intro (controls locked): the cutscene final.intro in src/data/cutscenes.json (M8)
    riseSeconds: 2.6, // her climbing out of the wreck
    bloodRampSeconds: 3, // the sky bleeding red
    drainSeconds: 4, // ...and draining away after she dies
    sky: { skyTop: 0x1a0204, horizon: 0x5a0906, ambient: 0x4a1410, light: 0xff4020 },
    // The witchfire ring sealing the hut clearing.
    ringScale: 1.15, // x the clearing's radius
    ringMin: 22, // metres at least
    ringMargin: 1.2, // how close to the flames you can get
    flames: 64,
    fireColor: 0x4ab018, // witchfire: her sickly green (additive, so dim: up close it blooms)
    fireOpacity: 0.45,
    fireHeight: 2.8,
    fireWidth: 0.6,
    // Embers rising, ash falling, round the camera.
    embers: 260,
    ash: 160,
    emberColor: 0xff7a28,
    ashColor: 0x8a8070,
    emberSize: 0.12,
    ashSize: 0.09,
    emberRise: 1.4,
    ashFall: 0.6,
    particleBox: 40, // metres: the box round the camera they fill
    // Her attacks: the usual ones (config.witch.attack) with these on top.
    attack: {
      hex: { every: 4.5 }, // a little more often than on the pathways (6 s)
      swipe: { damage: 40, windup: 0.3, recover: 0.7 },
      rush: { speed: 12 },
      summon: { count: [3, 5], cooldown: 25 },
    },
    // Snares and totems spammed round you.
    trapEvery: 6, // seconds
    trapsEach: 2,
    trapRing: [4, 9], // metres from you
    snareShare: 0.55,
  },

  // The end of a run (M7 step 6; ui/RunEndScreen.js). M8: the ending and defeat are cutscenes (data/cutscenes.json).
  ending: {
    victoryDelay: 4, // seconds after she dies before the ending cutscene (she bursts, the red drains, the dead fall)
    summaryInputDelay: 0.6, // seconds before A / Enter on the run summary starts a new run (M8: the ending is a cutscene)
    noReturnDelay: 5, // seconds from the radio call (both charges on the hut; Aaron, #130) to the point-of-no-return pop-up
  },

  // Sigil grounds' placeholder marker: a ring of dark stakes (the real
  // set dressing is for an encounter session).
  sigilGroundMarker: {
    stakes: 9,
    ringRadius: 7,
    width: 0.12,
    heightMin: 0.6,
    heightMax: 1.3,
    color: 0x2a221c,
    tilt: 0.25, // radians, leaning at random
  },

  // Digging a sigil up with the shovel (DESIGN.md "The shovel and digging").
  digging: {
    seconds: 2, // Session 18 (Aaron): 4 felt long with the dead still rising round him
    releaseDrain: 2, // let go and the bar empties this many times faster than it fills (Aaron, M5)
    range: 2.2, // metres from the sigil's centre
    scrapeInterval: 0.55, // seconds between shovel sounds
  },

  // The ranger station (M5, DESIGN.md "The ranger station"). Every number
  // is a placeholder for Aaron's play-test. Angles round the fence are
  // measured from south (0) toward east (+), round the fence's centre.
  // Abandoned vehicles (M5 part 2, DESIGN.md "Vehicles and batteries").
  // Types, looks, loot and where each type turns up are content, in
  // data/vehicles.json; the numbers are here.
  vehicles: {
    placement: {
      pathSpacing: 175, // metres along a pathway between verge cars (about 45 on a map in all, 35-60 by seed; Aaron: yes). Session 21: 85 -> 175, as the 30-clearing map has half as much pathway again and more clearing cars
      pathJitter: 0.35, // each gap varies by up to this fraction
      pathChance: 0.85, // each spot along a pathway gets a car with this chance
      vergeOffset: 2.7, // metres from a pathway's centre line to a verge car's centre
      ditchChance: 0.2, // some are nosed off the road at an angle
      ditchAngle: 0.55, // radians
      clearingGap: 6, // metres beyond a clearing's edge before verge cars start
      clearingInner: 0.3, // clearing cars stand between these fractions of its radius
      clearingOuter: 0.8,
      rowSpacing: 6.5, // metres between cars in a roadblock row
      minGap: 2.2, // metres of clear ground between any two vehicles
      openNeeded: 0.3, // every corner and spot must be at least this open (trees grow below 0.05, rocks below 0.2)
      maxSlope: 0.22, // rise over run along or across the vehicle
      cliffMargin: 6, // metres from the cliff's walkable line
      avoidRadius: 8, // metres beyond the station's fence kept clear
      signClearance: 3, // metres from a clearing's signpost
      roadKeep: 0.3, // Session 25 (Aaron: the witch snagged on a truck on the road): no corner within half the road's width plus this of the road or the road north
      centreClearance: 2.5, // metres (plus half its length) from a clearing's centre (pathways meet there)
      tries: 12, // attempts to fit each clearing car
      maxVehicles: 55,
    },
    batteryChance: 0.6, // Aaron: about 60%; the rest are dead or long gone
    alarmChance: 0.25, // of those with a battery: opening a door or the boot sets the alarm off
    hold: { search: 1.25, bonnet: 0.75, battery: 1.5 }, // seconds (Aaron, Session 14: twice as quick as M5's 2.5 / 1.5 / 3)
    // Session 14 (Aaron): cars blow up. Every round that stops on one (and
    // a flare, and a blast) damages it. Badly hurt it smokes; past fireAt
    // it's on fire and burns down the rest itself; at `health` it explodes
    // (a blast like a charge's, a little smaller), leaving a burnt-out
    // wreck, its loot and battery gone. A blast sets the cars round it off
    // in turn, a beat apart.
    damage: {
      health: 300, // Aaron: about 300 damage and it goes
      smokeAt: 0.4, // share of health: smoking from here
      fireAt: 0.8, // ...on fire from here
      burnPerSecond: 12, // on fire, it burns down the rest by itself (about 5 s)
      blast: { radius: 8, damage: 200, playerDamage: 90, edge: 0.25, knockback: 3, shake: 1.2, alert: 140 },
      vehicleDamage: 260, // to other cars at the blast's centre (falling off like the blast)
      chainFuse: [0.4, 1.2], // seconds before a car a blast pushed past `health` goes up
      wreckBurnSeconds: 30, // the wreck burns on this long
      burnt: 0x1a1714, // the burnt-out paint
      fx: { pool: 160, flame: 0xff7a24, smoke: 0x24211e, flamesPerSecond: 26, smokePerSecond: 9 },
    },
    interactRange: 1.6, // metres from a spot (driver's door, boot, bonnet)
    spotOut: 0.75, // metres outside the body where each spot stands (closer, a lifted bonnet filled the screen)
    batteryNoise: 22, // metres: pulling a battery is noisy (Aaron: just a noise)
    alarm: {
      seconds: 60, // it rings until the battery is pulled or it runs flat
      noise: 65, // metres: zombies hear it and come
      alertEvery: 2, // seconds between alerts
      beepEvery: 0.55, // seconds between wails
      flashEvery: 0.4, // seconds per lamp flash
    },
    lidSeconds: 0.45, // a door, boot or bonnet swings open in this long
    colliderPiece: 1.2, // metres: each body is split into pieces this long along its length (keeps the collision grid's reach small)
    seenDistance: 40, // metres: a vehicle goes on the map once you've been this close
    map: { show: false, minimapPixels: 7, screenPixels: 9, color: '#8fb8dc', doneColor: '#6e7072' }, // steel blue: tan read as part of the dashed pathways. Session 21 (Aaron: they clutter the map once you've explored): show: false, off both maps
    looks: {
      paintBrightness: 0.7, // every paint is scaled by this: light paint blows out under the torch (as the station's metal did)
      dirtiness: 0.25, // each paint varies by up to this much darker
      flatTyreChance: 0.3, // a flat tyre leaves it leaning
      flatTyreTilt: 0.05, // radians
      wheelSegments: 12, // sides on each round wheel (Aaron: square wheels didn't read as a car)
      hubSize: 0.5, // the hub's diameter as a fraction of the wheel's
      pillarThickness: 0.06, // metres: the windscreen and rear window pillars (Aaron)
      // Session 13: the models' wear (render/VehicleRenderer.js), rolled per
      // vehicle: rust up to this much (skew > 1: most only a little; a
      // type's own `rust` in vehicles.json scales it), grime and dust
      // [min, max], the chance of dried blood, of a cracked window, and
      // the share of those smashed through.
      wear: {
        rust: 0.85,
        rustSkew: 1.2,
        dirt: [0.3, 1],
        bloodChance: 0.15,
        crackChance: 0.3,
        smashedShare: 0.4,
        rustColour: 0x3e2010,
        dirtColour: 0x4a3e2c,
        dustColour: 0x4a4436,
        bloodColour: 0x1a0404,
        crackColour: 0x6a7076,
      },
    },
  },

  station: {
    layout: {
      fenceCentreFromCliff: 16, // metres south of the cliff line (at home's x) to the fence's centre
      fenceRadius: 28, // the fence is an arc of this radius from cliff to cliff
      fenceEndInset: 1.5, // each end runs this far past the walkable line into the cliff's foot
      gateWidth: 4.5, // metres, due south of the fence's centre
      segmentsPerSide: 6, // 12 fence segments (Aaron: "12 sounds about right"), 6 each side of the gate
      panelLength: 2.4, // metres between fence posts (and per collider piece)
      fenceHeight: 2.4,
      colliderThickness: 0.12, // half-thickness of fence, wall and door colliders
      cabin: {
        offsetZ: 2, // cabin centre this far south of the fence's centre
        width: 12, // west to east
        depth: 8, // north to south
        wallHeight: 3,
        roofRise: 1.6,
        frontDoorWidth: 1.4, // south wall, centred
        commsDepth: 3.5, // the comms room is the back (north) strip of the cabin
        commsDoorX: 3.5, // the comms door, east of centre in the partition
        commsDoorWidth: 1.2,
        // Session 28 (DESIGN.md "The ranger station"): the workbench, there from the start: in the main room,
        // against the comms room's wall, west of the way from the front door to the comms door (x: metres
        // east of the cabin's centre; w across, d out from the wall, h tall).
        workbench: { x: -0.9, w: 1.8, d: 0.6, h: 0.9 },
        doorApproach: 0.9, // metres either side of a door where zombies stand to attack or step through
        cornerMargin: 1.4, // zombies round the cabin's corners this far out
      },
      tower: { offsetX: 11, offsetZ: 0, height: 9, platformHalf: 1.7, legSpread: 1.6, revealRadius: 260 },
      turretPad: { offsetX: 3, offsetZ: 17 }, // south of the cabin, east of the gate path: it sees every fence panel (at -4, 10 the cabin hid the east end; Aaron, M5)
      fenceBox: { gateOffset: 3.2, inside: 2.2 }, // metres along the fence from the gate's edge, and inside it
      desk: { offsetX: -2.5, fromNorthWall: 0.7 }, // the ledger, radio and monitors in the comms room
      spikeOutside: 2.6, // spike trap slots: one per segment, this far outside its middle
      floodSegments: [1, 4, 7, 10], // floodlight slots, on poles just inside these segments
      floodInside: 1.2,
      barricadeOutside: 1.2, // Session 18 (Aaron): a barricade is an outer layer this far outside its segment (the dead reach it before the fence)
    },
    // Zombies within baseRadius of the fence's centre lay siege (ZombieBrain).
    siege: {
      baseRadius: 70,
      breachSeek: 35, // metres round the fence a zombie will walk to reach a gap instead of clawing
      arcStepDegrees: 14, // walking round the outside of the fence, one waypoint at a time
      walkOutside: 1.4, // metres outside (or inside) the fence while walking round it
      gapThrough: 2.6, // metres past the fence line to step through a gap
      stand: 0.7, // metres from a barrier where a zombie stands to claw it
      reach: 0.55, // within this of its standing spot, it starts clawing
      strikeScale: 1, // a swipe on a defence = attackDamage x level defenceDamage x this
      overrun: true, // a zombie in the comms room ends the run (the family)
    },
    fence: {
      // Aaron (M6): chain-link should take a horde an evening, not minutes.
      segmentHealth: 500,
      gateHealth: 750,
      barricadeHealth: 375,
      // Start of a run: segment index (0 = far west, 11 = far east; 5 and 6
      // flank the gate) -> health fraction. Aaron (M6): the broken panel is
      // the second east of the gate, so you face it from the yard and spot
      // it; the one beyond it leans.
      startHealth: { 7: 0, 8: 0.45 },
      gateOpenDistance: 3.5, // the gate opens itself for the player within this
      gateSlideSeconds: 0.8,
    },
    doors: {
      health: 300,
      reinforcedHealth: 600,
      openDistance: 1.8, // doors open themselves for the player
      swingSeconds: 0.35,
    },
    // Electric fence and power (DESIGN.md "Electric fence and power").
    power: {
      startCharge: 0, // Aaron: no charge at the start
      maxCharge: 300,
      batteryCharge: 100, // one battery fitted at the fence box
      // Session 20 (Aaron, Nov 8): one power unit for everything (base/powerUnit.js).
      // maxCharge is the starting capacity; it's saved and grows with a cell.
      cells: {
        // The crashed plane's small alien power cell (Session 25; the debug menu until then).
        planeCell: { name: "the plane's alien power cell", capacity: 1000, charge: 500 },
      },
      fullSecurityCharge: 100, // charge that gives the fence its full security value
      nightDrain: 40, // drained steadily over each night
      floodlightNightDrain: 4, // per floodlight, per night
      zapCost: 1.5, // each zombie zapped
      zapDamage: 15,
      zapStagger: 0.9, // seconds the zap stuns it (the slow)
      zapCooldown: 1, // a zombie is zapped at most this often
      turretShotCost: 0.05,
    },
    // Security rating (DESIGN.md table; each scales with remaining health).
    security: {
      fenceSegment: 2, // per segment, as a wall segment
      gate: 2,
      barricade: 2,
      door: 2,
      reinforcedDoor: 5,
      spikeTrap: 3,
      floodlight: 4,
      fenceCharge: 20, // at fullSecurityCharge or more
    },
    // Scrap prices (Aaron: "just pick some prices").
    costs: {
      fenceRepair: 12, // a whole segment from nothing; part repairs cost their share
      gateRepair: 16,
      barricade: 15,
      barricadeRepair: 10,
      doorRepair: 15,
      reinforceDoor: 30,
      spikeTrap: 20,
      spikeRepair: 10,
      floodlight: 25,
    },
    // Hold interact this long (seconds).
    hold: { repair: 1.5, build: 2.5, battery: 2, ledger: 0.35, climb: 1, load: 1, install: 2.5, takeRifle: 0.6, releaseDrain: 2 }, // releaseDrain: let go and the bar empties this many times faster than it fills (Aaron)
    interactRange: 2.2,
    // Session 15b (Aaron): the service rifle leans on the lookout tower's
    // north rail until Tom takes it (it's out of the starting kit). It's
    // there whenever Tom hasn't got one: a fresh run, or "try again".
    // On Day 1's daytime it can't be taken (FirstDay locks it): it's
    // Night 1's beat, when Ellen sends Tom up for it.
    // at: metres from the platform's centre (x east, z south; the ladder's
    // on the south side). lean: radians off upright, into the rail.
    // Session 15b (Aaron): the shovel leans on the cabin's front wall beside
    // the door (at: metres east of the door, out from the wall), there until Tom takes it.
    // Session 16 (Aaron): the first aid box on the comms room wall; 2 kits in it.
    // Session 20 (Aaron): it's where kits go that don't fit in the healing pool.
    aidBox: { kits: { firstAid: 2 } },
    // Session 28: the workbench (the cabin's main room; config.station.cabin.workbench places it). The
    // chainsaw's chain is filed sharp here for a little scrap (Aaron, Nov 8): hold X for `seconds`, a
    // file stroke every `stroke`. fullAt: sharper than this, there's nothing to do. standOff: where Tom
    // stands, out from the bench's front.
    workbench: { scrap: 3, fullAt: 0.95, seconds: 3.6, stroke: 0.55, standOff: 0.75 },
    // Session 20 (Aaron): the gun rack on the comms room's east wall (z: metres from the cabin's centre; standOff: where Tom stands, in from the wall).
    gunRack: { z: -2.2, standOff: 0.9,
      // Session 23 (#343): the guns on the rack show, standing on its shelf against the pegs, in the
      // order they went up (render/rackGuns.js). Placeholder looks: length in metres; a pump fore-end, a
      // scope, a box magazine; dark colours (the torch glares off pale ones).
      show: { pegs: 5,
        stock: 0x3a2416, steel: 0x1c1e20,
        guns: {
          rifle: { length: 1.0, mag: true },
          shotgun: { length: 1.05, pump: true, stock: 0x4a2c18 },
          sniper: { length: 1.15, scope: true, stock: 0x3e2a1a },
          thermal: { length: 1.1, scope: true, mag: true, stock: 0x232526 },
          autoShotgun: { length: 1.0, mag: true, stock: 0x2a2a2a },
          smg: { length: 0.55, mag: true, stock: 0x2a2a2a },
          pistol: { length: 0.26, stock: 0x2a2a2a },
        } } },
    // Session 20 (Aaron): Save and quit's safe point: the cabin's main room (metres from its centre), facing the front door.
    safePoint: { at: [1, 1.2], yaw: Math.PI },
    shovelByDoor: { weapon: 'shovel', at: [1.15, 0.55], lean: 0.24, // Session 16 (Aaron): its grip went into the wall: further out, more upright
      handle: 0x5a3e24, blade: 0x3a3c3e },
    towerRifle: { weapon: 'rifle', at: [0.55, -1.36], lean: 0.3, stock: 0x3a2416, steel: 0x1c1e20 },
    // Session 15b (Aaron): on Day 1 the gate stays shut and locked until
    // Tom's been up the tower (story/FirstDay.js). Ellen calls him back if
    // he tries it, at most every callEvery seconds, within callDistance of
    // the gate (or of a fence panel that's down).
    gateLock: { callDistance: 3.5, callEvery: 20, chain: 0x3a3a38, padlock: 0x5a4a22 },
    spikes: { radius: 1.2, damage: 12, interval: 0.8, slow: 0.4, durability: 15 },
    // poolOpacity / coneOpacity are tiny: on a black sky the screen's gamma lifts a few % of white to a bright grey.
    // litEdge: zombies are lit out to this many pool radii.
    floodlight: { poleHeight: 5.5, poolRadius: 7, poolOutside: 7, color: 0xfff0c8, poolOpacity: 0.14, coneOpacity: 0.012, litEdge: 1.3 },
    // The automated turret (DESIGN.md "The automated turret"). One per run
    // from the Car Armory (M11); until then the debug menu gives it.
    turret: {
      range: 45, // the fence's far ends are about 42 m from the pad
      turnRate: 200, // degrees per second
      aimTolerance: 4, // degrees: fires once it's this close to its target
      roundDamage: 10, // a "turret round" (DESIGN.md)
      // Aaron: it should carve through crowds even more than the rifle.
      pierce: 7,
      pierceKeep: 0.9,
      spreadDegrees: 0.8,
      stagger: 0.35,
      knockback: 0.7,
      muzzleHeight: 1.55,
      noise: 50, // metres: zombies hear it and come
      startMode: 'medium',
      modes: {
        slow: { seconds: 3, security: 5 },
        medium: { seconds: 1.5, security: 10 },
        fast: { seconds: 0.5, security: 20 },
      },
      ammoDamage: { pistol: 10 }, // per round, for ammo whose gun isn't in the weapons table yet
      loadOrder: ['pistol', 'shotgun', 'alienShells', 'rifle'], // the order ammo is listed in the turret's menu (Session 20: alien shells, 7.2 turret rounds each)
      menuAmounts: [1, 5, 0], // load choices per ammo type in the turret's menu (0 = all of it; Aaron, M5)
      targetEvery: 0.25, // seconds between picking targets
      idleDelay: 2, // seconds with nothing to shoot before it swings back to face the gate (Aaron, M5: it idled facing the cabin)
      idleTurnRate: 60, // degrees per second, swinging back
    },
    look: {
      wood: 0x3a2a1e, // the tower's railing glared at 0x4a3626
      // Session 10b (Aaron: the watchtower still glared under the torch):
      // the tower's own, darker, weathered wood.
      tower: 0x2a2018,
      towerDark: 0x221a14,
      towerPlank: 0x2c2219,
      towerLadder: 0x1e1712, // Aaron: the ladder still glared at the tower's colour
      woodDark: 0x2e2118,
      roof: 0x24382a, // Forest Service green
      trim: 0x5e4a36,
      floor: 0x3a2c20,
      metal: 0x262829, // dark: the torch blows out light metal up close (Aaron, M5: turret, gate, fence box glared)
      metalDark: 0x17181a,
      chainLink: 0x2c3034, // Session 16 (Aaron): darker, it shone close up under the torch (was 0x4e5357)
      hazard: 0x4a3808, // the fence box's stripe
      concrete: 0x302f2b, // the turret pad
      ammoCan: 0x20271a,
      sandbag: 0x5a5040,
      plank: 0x463424,
      // Session 19 (style pass 2): the barricades' outer ring. Darker than the station's own (they glared).
      barricade: { bag: 0x463e30, bagDark: 0x3a3428, sheet: 0x3a3026, sheetRib: 0x2e261e, plank: 0x3c2e20, plankDark: 0x30241a, shadeJitter: 0.14 },
      spike: 0x22211e, // the spikes glared pale under the torch at 0x3e3c38
      windowGlow: 0xffb060,
      monitorGlow: 0x7adcb0,
      wireCharged: 0x6ad0ff,
      wireDead: 0x3a3c40,
      emptySlot: 0x2a2a2a,
      chainLinkTexture: 128, // pixels
      cullMargin: 40, // metres beyond the draw distance the compound stays drawn
      // Session 13 (#147): the interior (render/stationInterior.js). Lit
      // (Aaron): a warm point light a room, dimmer while the fence has no charge.
      interiorLight: { color: 0xffb070, intensity: 9, distance: 8, decay: 1.2, unpowered: 0.6 }, // one a room
      pine: 0x4a3622,
      beam: 0x2e2016,
      floorBoard: 0x3a2a1c,
      trimLight: 0x4e3c2a,
      curtain: 0x5a2a24, // faded red gingham
      desk: 0x343a32, // government grey-green steel
      deskTop: 0x3e443a,
      chrome: 0x5a5a56,
      radio: 0x24282a,
      radioGrille: 0x121314,
      radioMeter: 0xffc070,
      ledger: 0x4a1a12,
      paper: 0x7a7668,
      mug: 0x5a2a22,
      lampShade: 0x2a3a2a,
      bulb: 0xffe0a0,
      crt: 0x4a4840,
      chairSeat: 0x1e2224,
      cabinet: 0x3a4030,
      mapHigh: 0x5a5034,
      mapMid: 0x3e5034,
      mapLow: 0x2e4436,
      pinRed: 0x8a1a14,
      pinWhite: 0x8a8a84,
      signBoard: 0x3a2a1a,
      dangerLow: 0x2a5a2a,
      dangerModerate: 0x2a4a7a,
      dangerHigh: 0x8a7a1a,
      dangerVery: 0x8a4a14,
      dangerExtreme: 0x7a1a14,
      calendar: 0x6a2a20,
      clock: 0x2a2622,
      firstAid: 0x7a7a74,
      firstAidCross: 0x8a1a14,
      rackBoard: 0x4a3420, // Session 20: the gun rack
      rackPeg: 0x2a2a2a,
      extinguisher: 0x7a1a14,
      hearth: 0x2a2826,
      iron: 0x161616,
      fire: 0xff7020,
      cupboard: 0x4a3a28,
      worktop: 0x5a5448,
      propane: 0x6a6a64,
      fridge: 0x6a685e,
      canRed: 0x6a2a1e,
      canGreen: 0x3a4a2a,
      tableTop: 0x4a3626,
      chairPaint: 0x2a4a5a,
      lanternGlass: 0xffc070,
      mattress: 0x4a4636,
      blanketRed: 0x5a1e1a,
      blanketGrey: 0x3e3e3a,
      pillow: 0x6a685c,
      coatRed: 0x5a1a14,
      coatOlive: 0x3a4028,
      coatBlue: 0x22304a,
      boots: 0x2a1e14,
      rugA: 0x4a2a22,
      rugB: 0x2e3a4a,
      rugC: 0x5a4a2e,
    },
    hudRefresh: 0.25, // seconds between redraws of the HUD's station strip
    damagedTilt: 0.25, // radians a fence panel leans at half health
    brokenTilt: 1.35, // a broken panel lies nearly flat
  },

  // One detection model for every enemy (DESIGN.md "Movement, flashlight
  // and stealth"): distance, line of sight, light, the torch, crouching and
  // noise. The level's `notice` multiplies every range.
  detection: {
    cutsceneForgetBeyond: 10, // Session 25: as a cutscene starts, the dead chasing Tom from further than this forget him
    thinkSeconds: 0.5, // each zombie looks and listens this often (staggered)
    sight: { night: 13, day: 38 }, // metres: a standing player, torch off
    torchNight: 2.3, // torch on: seen this many times further away at night...
    torchDay: 1.05, // ...and by day
    crouch: 0.45, // crouched: much harder to see
    sprint: 1.2,
    undergrowth: 0.75, // in the brush
    // Aaron (M6): hiding. Crouched, torch off and in the brush (even just
    // off the path), you can't be seen from further than this, day or
    // night, at any level (a zombie already after you still has pursuit).
    hidden: { sight: 6, minUndergrowth: 0.3 },
    rearSight: 0.55, // behind a zombie (outside its front half)
    pursuit: 1.7, // once it's chasing you, it keeps you in sight this much further
    touch: 2.5, // always noticed this close
    hearing: { walk: 6, sprint: 18, crouch: 0, minSpeed: 0.5 }, // footsteps: no line of sight needed
    eyeHeight: 1.6, // a zombie's eyes
    losStep: 2, // metres per step when checking sight over the hills
    memorySeconds: 6, // keeps chasing this long after losing you
    searchSeconds: 10, // then searches where it last saw you
    gunfireMemory: 8, // a shot it heard brings it to you for this long
  },

  // Pickups dropped by zombies (items and tables: data/loot.json). Walk
  // over one to take it; a full armour bar or kit bag leaves it lying.
  pickups: {
    poolSize: 48, // oldest goes when full
    radius: 1.3,
    lifeSeconds: 900,
    scatter: 0.7, // metres round the body
    size: 0.26,
    bob: 0.06,
    spin: 1.8,
    lift: 0.22,
    emissive: 0x1a1a1a, // a faint glint so they show at night
    // The torch blew the bright boxes out up close (Aaron's M4 test, like
    // the rocks and signs before): colours are darkened by this, and drops
    // near you are in the torch's glare check so the beam dims on them.
    albedoScale: 0.2,
    glareRange: 6, // metres
  },

  // Hit and hurt feedback
  feedback: {
    recoilRecover: 10, // how fast the camera kick settles
    recoilKeep: 0.25, // fraction of each kick that stays (you re-aim)
    shakeDecay: 6,
    hurtShake: 0.35,
    muzzleFlash: {
      color: 0xffc070,
      intensity: 40, // candela; a pooled point light, never casts shadows
      distance: 14,
      seconds: 0.06,
    },
    blood: {
      poolSize: 160, // particles (M5: 96 -> 160 for fence sparks and turret hits)
      perHit: 6,
      perHeadshot: 12,
      speed: 2.2,
      gravity: 9,
      seconds: 0.6,
      size: 0.09,
      color: 0x6a0a0a,
      dustColor: 0x5a4c3a, // missed shots puff off trees and the ground
      dustPerImpact: 4,
      sparkColor: 0x9ad8ff, // M5: the electric fence biting
      sparksPerZap: 12,
    },
    // M5: the turret's tracer streaks (one instanced mesh)
    tracers: {
      poolSize: 16,
      seconds: 0.09,
      width: 0.06,
      color: 0xffc860,
    },
  },

  // Placeholder HUD (the final pixel-font HUD is Session 19).
  hud: {
    healthSegments: 10,
    hitMarkerSeconds: 0.18,
    hurtVignetteSeconds: 0.5,
    lowHealth: 30, // the health bar pulses at or below this
    pickupSeconds: 2.5, // each "+4 shotgun shells" line stays this long
    pickupLines: 4,
  },

  // Placeholder sounds, synthesised with Web Audio. TO BE UPGRADED in the
  // audio pass (Session 20): Aaron asked for this to be noted.
  sfx: {
    enabled: true,
    volume: 0.6,
    hearingDistance: 35, // metres; positional sounds fade to nothing here
  },

  // Flashlight: the game's one shadow-casting light
  flashlight: {
    startOn: false, // Session 15b (Aaron): Tom wakes indoors by day with it off; Night 1 prompts it on
    color: 0xfff1d6,
    intensity: 300, // candela
    distance: 45, // metres; light fades to zero here
    decay: 1.6,
    angle: 24, // degrees, half-angle of the cone
    penumbra: 0.45,
    offset: { x: 0.22, y: -0.18, z: 0 }, // from the eye, in camera space (held low and right)
    followRate: 14, // how fast the beam catches up with the view (higher = stiffer)
    aimDistance: 10, // metres to the aim target
    shadowNear: 0.3,
    shadowBias: -0.0004,
    shadowNormalBias: 0.02,
    // Spill: a second, wider and dimmer light round the beam (no shadow,
    // no pattern) so the edges of the view aren't pitch black.
    spill: {
      intensity: 55, // candela
      angle: 48, // degrees, half-angle
      penumbra: 1,
      distance: 22,
      decay: 1.6,
    },
    cookieSize: 256, // pixels, procedural torch pattern
    cookieRings: 2, // faint concentric rings in the beam
    cookieRingStrength: 0.08, // how dark the rings are (0..1)
    cookieHoleSize: 0.1, // dark spot in the middle (the bulb's shadow), fraction of radius
    cookieHoleStrength: 0.3,
    cookieBlotches: 24, // soft uneven patches in the beam
    cookieBlotchStrength: 0.06,
    // Close-range glare: the torch dims when the beam is very near a
    // surface, so a tree or rock in your face doesn't flood the view.
    // The torch dims when it hits a surface harder than it would hit one
    // head-on at fullDistance (strength = facing / distance ^ decay), so
    // close trees and rocks don't flood the view. The ground ahead, hit at
    // a glancing angle, keeps the full beam.
    glare: {
      fullDistance: 8, // metres; a head-on surface this far away sets the brightness cap
      minDistance: 0.3, // metres; closer than this counts as this close
      minFactor: 0.03, // floor on the dimming, right up against something (Session 16: lower, Aaron: still bright close up)
      response: 10, // how quickly the dimming follows (higher = snappier)
      queryMargin: 4, // metres added to the search radius to catch wide canopies
      ringRays: 6, // extra rays round the beam (besides its centre) to find close surfaces
      ringSpread: 0.7, // how far out in the cone the ring rays go (fraction of the cone angle)
      groundStep: 0.5, // metres per step when finding where a ray meets the hills
      // Session 10b: up the tower, its floor and the cab roof's underside
      // (metres above the floor; overhang past the platform's edge) count as
      // close surfaces. The railing and corner posts are glare colliders (Station).
      platform: { roofY: 2.6, roofOverhang: 0.3 },
    },
  },

  // UI
  ui: {
    toastSeconds: 3,
    hintSeconds: 7, // Session 15b: a control prompt ("Click LS: sprint") stays this long, not counting cutscenes
  },

  // The story systems (M8; DESIGN.md "Story and lore"). The lines are in
  // src/data/dialogue.json; who says them and how they sound is here.
  story: {
    // Each speaker: the name on the subtitle, its colour, and the pitch of
    // their blips (Hz). The pitch wobbles by blipJitter (fraction) per blip.
    speakers: {
      ellen: { name: 'Ellen', color: '#9cc3e6', blipFreq: 520 },
      wyatt: { name: 'Wyatt', color: '#e6c27a', blipFreq: 380 },
      junie: { name: 'Junie', color: '#e6a0c4', blipFreq: 760 },
      tom: { name: 'Tom', color: '#c8d0b8', blipFreq: 300 },
      radio: { name: 'Radio', color: '#a8b0a0', blipFreq: 440 },
      clown: { name: 'The clown', color: '#d8b8c8', blipFreq: 880 }, // Milo in character: high, musical, bouncing (the story)
      milo: { name: 'Milo', color: '#c8b49a', blipFreq: 250 }, // Milo out of character: his own voice, warm
      amos: { name: "A man's voice", color: '#b8ae94', blipFreq: 210 }, // Session 27: the Caller in Amos Pruitt's voice (1903), at the railway cutting
      dispatch: { name: "The car's radio", color: '#9aa8a0', blipFreq: 330 }, // Session 28: the recall message looping on the agents' sedan radio (the sawmill)
      hattie: { name: "A girl's voice", color: '#d8b0c0', blipFreq: 820 }, // Session 27: the Caller as Hattie Bell McCoy, aged nine (1903)
      scanner: { name: 'Scanner', color: '#8fb08a', blipFreq: 260 }, // Session 15b: Earl's scanner at the gas station
      note: { name: "Earl's note", color: '#d8ccaa', blipFreq: 0, silent: true }, // read, not heard
    },
    // The family in the comms room, in the order the station places them.
    family: ['ellen', 'wyatt', 'junie'],
    // Lines with a "script" only play from their triggers while that script
    // is live. M9.2 wired Day 1's triggers (story/FirstDay.js), so it is.
    liveScripts: ['day1'],
    // Milestones: the event that sets each flag lines can ask for ("when":
    // { "all": [...] }). Remembered in order (newest first wins) and saved.
    milestones: {
      'witch:planted': 'witchPlanted',
      'sigil:dug': 'sigilDug',
      'witch:attacking': 'witchSighted',
      'witch:hurt': 'witchWounded',
      'witch:trailCam': 'witchOnCamera',
      'hut:armed': 'hutArmed',
      'hut:destroyed': 'hutDestroyed',
    },
    blipJitter: 0.06,
    blipEvery: 2, // a blip every this many letters (spaces don't blip)
    blipSeconds: 0.035,
    blipGain: 0.07,
  },

  // The first day (M9.2; story/FirstDay.js, DESIGN.md "Opening and first
  // run", agreed with Aaron in Session 15).
  firstDay: {
    // Day 1 can't be failed: Tom's health stops at this share of full.
    cantFail: true,
    healthFloor: 0.2,
    // Day 1's clock stops at this hour until a battery is in the fence box
    // and the torn fence is patched, so dusk never comes before the
    // tutorial's done.
    holdHour: 17,
    // Waking: in the comms room, this far east of the cabin's centre and
    // this far in from its back wall, facing Ellen at the radio.
    wake: { dx: 1.7, fromNorthWall: 2.3 },
    // The view from the tower: the light to the south, this share of the
    // draw distance away and this high; where the look at the campsite's
    // smoke points (metres up); the smoke's wisp drawn at this share of the
    // draw distance along the line to the campsite (it's past the fog);
    // Tom steps this far sideways on the platform, clear of its corner posts.
    tower: { lightDistance: 0.92, lightHeight: 24, smokeLookHeight: 10, smokeDistance: 0.8, sideStep: 0.95 },
    // Session 15b (Aaron): control prompts as they're first needed. sprintAfter:
    // seconds of walking outside the fence on the way to the campsite.
    prompts: { sprintAfter: 6, wreckDistance: 9 }, // wreckDistance: metres from a car on the way out: the family see it (the first foreshadowing)
    // Nudges: seconds stuck on a step before a family member says what's next.
    nudges: { tower: 75, campsite: 150, battery: 20, fit: 60, repair: 45 },
    // Session 15b (Aaron): once the fence is patched and the battery's in,
    // and Junie's had her word (13-14, indoors), the day fades straight to night. afterTalk:
    // seconds after her talk; timeout: seconds after the work's done if Tom
    // never goes in to her.
    nightfall: { afterTalk: 2.5, timeout: 60 },
    night1: {
      // Session 15b (Aaron): Night 1 is the first defence. 9 dead in waves
      // of 3, each from a new side: the campsite path (west), then south
      // past the gate, then the other side (east). Session 16 (Aaron): each
      // comes `gap` seconds after the last one rose, down or not, so they
      // overlap; the waves not down `timeout` seconds after the last rose
      // count as down. They rise `distance` metres out (`sideAngle`
      // degrees off due south for the side waves) and march on the fence.
      waves: { count: 3, size: 3, firstDelay: 12, gap: 15, distance: 60, pathDistance: 70, sideAngle: 70, timeout: 150 },
      fenceCallDistance: 14, // line 16 when wave 1 is this close to the fence
      firstCallAfter: 20, // ...or this many seconds after it rises, or once one of it's down (Session 15b)
      tacticsDelay: 3, // seconds after line 16: Wyatt's shotgun line, then Ellen's: get the rifle from the tower
      plantAfter: 4, // seconds after the last wave's down: the witch plants at the storm shelter
      plantClearance: 70, // ...unless Tom is this close (she waits)
      feedDelay: 3.5, // seconds from Ellen's "a trail cam's live" to camera six (Session 15b)
      // After the clip, in order (Session 15b): the family talk it over, then
      // the night fades to dawn this many seconds after the last line.
      afterClip: ['day1.night.after1', 'day1.20', 'day1.night.after3'], // Aaron: three lines
      dawnAfterTalk: 2.5,
      holdBeforeDawn: 20, // the night holds this many seconds short of dawn until she's planted
      holdRadius: 14, // its dead stay this close to it (they never march on the station)
    },
    // Skip intro: what Tom has at Dawn 1.
    skip: { shotgunShells: 8, scrap: 12, dawnLineDelay: 2.5, unheard: ['day1.21', 'day1.22', 'day1.23'] },
  },

  // The roadside gas station (M9.3; encounters/GasStation.js,
  // data/gasStation.json). Session 15b pass 1: the set.
  gasStation: {
    floorLift: 0.18, // the store's floor this far above the highest ground under it
    // Pass 2 (Session 15b): the beats.
    arriveInset: 0, // metres inside the clearing's edge that count as arriving (the sweep)
    packDistance: 35, // metres outside the edge: the forecourt pack and the mutant are put there
    interactRange: 1.6, // metres to a search point or a thing to use (inside the store only)
    pack: { count: 5, centreZ: 3.5, lingerRadius: 8 }, // DESIGN: 4-6 citizens among the pumps and cars (scaled by zombie level like any)
    // The first mutant: its own health (DESIGN: beatable close up with the
    // shotgun and a handful of shells; mutants are 300 before the level's
    // multiplier). lookHeight: where the camera looks on it, crouched.
    mutant: { health: 240, lookHeight: 0.4, memory: 30 }, // Aaron: 180 was too easy (+60)
    witch: { delay: 1.2, lookHeight: 1.5 }, // seconds after Tom's back on the forecourt; where the camera looks on her
    scannerLines: ['gas.scanner.1', 'gas.scanner.1b', 'gas.scanner.1c', 'gas.scanner.2'], // Session 18: more of it, now it takes a battery (then Wyatt's gas.scanner.wyatt on its own)
    lineGap: 12, // Session 17 (Aaron: one idea at a time over the radio): seconds before a follow-up on another subject
    shelterTalkDistance: 10, // Session 15b: metres past the clearing's edge, leaving: the family's word about the shelter and the shovel
    backDoor: { openDistance: 1.8, swingSeconds: 0.6 }, // Session 15b (Aaron): the stockroom's back door opens for Tom, out onto the quad
    safe: { weapon: 'sniper' }, // the hunting rifle, empty
    // Session 18 (Aaron): shoot the pumps and they go up. Each island takes
    // `health` of shot damage (a few shotgun blasts, two or three rifle
    // rounds), then hisses and smokes for `fuse` seconds and blows: a big
    // blast (cars and the other island in it go up too). Once only.
    pumps: {
      health: 90,
      fuse: 1.1,
      chainFuse: 0.45, // the other island, caught in the blast
      hitRadius: 1.4, // metres from a pump unit's centre (frame) that a shot counts on
      blast: { radius: 8, damage: 320, playerDamage: 60, edge: 0.25, knockback: 3.5, shake: 1.5, alert: 140 },
    },

    look: {
      glassOpacity: 0.82, // grimed: you can barely see in (or out)
      forecourtLift: 0.04, // metres above the ground
      island: { length: 3.8, depth: 1.1 }, // a pump island's kerb
      sign: { width: 3.6, height: 2.25 }, // the HOME OF BIGFOOT board
      // Session 19 (style pass 2): lap siding (rows every `step` m from
      // `from` up, `out` proud of the wall); the roof's AC unit (frame x, z);
      // the shop's dead fluorescent fixtures ([x, z, hanging]); the
      // forecourt's grid (cells), oil darkening round the pumps, mottling,
      // expansion joints every `joint` m, cracks, weeds; the canopy's light
      // boxes ([x, z] from its middle); the band peeled at its low corner.
      siding: { from: 0.3, step: 0.34, out: 0.025, height: 0.035 },
      roofUnit: { x: 3.5, z: -11.5 },
      fixtures: [[-4.5, -5.6, false], [-4.5, -8.6, false], [1.5, -5.6, false], [1.5, -8.6, true], [5.6, -7.2, false]],
      forecourt: { cellsX: 52, cellsZ: 28, oil: 0.55, mottle: 0.3, joint: 4.2, cracks: 9, edgeWeeds: 26 },
      canopyLights: [[-6, -1.2], [-6, 1.2], [-1.2, -1.2], [-1.2, 1.2], [3.6, -1.2], [3.6, 1.2], [7.2, 0]],
      peel: { x: 1.2, yaw: 14, tilt: 0.45 },
      weather: { rust: [0x232426, 0x3a3a2a, 0x2a3a2c, 0x3a3a38, 0x2e2a22, 0x2c2a26, 0x3a3c3a, 0x34342c, 0x2e3430] },
      // Dull and dark: pale props glare under the torch (Aaron).
      colors: {
        // Session 19 (style pass 2).
        // Earl's office (Session 19, Aaron's playtest).
        lampShade: 0x2a3424,
        mug: 0x3a2a22,
        officePaper: 0x4a463c,
        binders: [0x1e2a3a, 0x3a1e1a, 0x2a2a22, 0x22301e, 0x3a3420],
        jacket: 0x3a3020,
        cap: 0x4a1a14,
        heater: 0x34302a,
        heaterGrille: 0x1e1a16,
        antler: 0x4a4234,
        photo: 0x2e2a24,
        calendarTop: 0x3a1c16,
        wallLap: 0x4c463c,
        gutter: 0x2c2a26,
        acUnit: 0x3a3c3a,
        acGrille: 0x1a1a1a,
        ceilingGrid: 0x2a2824,
        fixture: 0x3a3a36,
        priceStrip: 0x3a3424,
        joint: 0x262624,
        crack: 0x1c1c1a,
        weed: 0x28301c,
        plinth: 0x34342e,
        debris: 0x1e1c1a,
        canopyUnder: 0x363632,
        lightBox: 0x2e2e2c,
        iceChest: 0x3a4448,
        iceLid: 0x343c40,
        iceLabel: 0x22344a,
        oilCans: [0x3a2a1a, 0x1c2a3a, 0x3a3a1c, 0x2a1c1c],
        propaneCage: 0x34342c,
        propane: 0x4a4a46,
        airPump: 0x2e3430,
        tyre: 0x121212,
        pallet: 0x3a3020,
        slab: 0x3a3936,
        floor: 0x2e2c28,
        wall: 0x5a5448, // weathered pale siding, dirty
        wallInside: 0x34302a, // Session 15b (Aaron): everything inside glared under the torch: darker
        trim: 0x4a4c4e,
        glass: 0x1c2224,
        roof: 0x2a2826,
        fascia: 0x3a3630,
        door: 0x2a2018,
        counter: 0x2e2218,
        counterTop: 0x222220,
        metal: 0x232426,
        screen: 0x121614,
        wood: 0x32241a,
        woodDark: 0x20180f,
        shelf: 0x2a2a28,
        shelfDark: 0x1c1c1a,
        goods: [0x3a1c16, 0x1c2636, 0x3a3016, 0x1c301c, 0x302f2e, 0x423a26, 0x261c26],
        coolerBody: 0x26282a,
        coolerGlass: 0x1a2428,
        carving: 0x3e2c1c,
        carvingDark: 0x241a10,
        plaster: 0x46433a,
        cabinet: 0x262a24,
        safe: 0x24302a,
        safeTrim: 0x1a201c,
        brass: 0x6a5a2a,
        radio: 0x161616,
        cardboard: 0x3c3121,
        concrete: 0x363633,
        stain: 0x22221f,
        kerb: 0x4a4a46,
        kerbTop: 0x3a3a36,
        pump: 0x4a201c, // faded red (Session 19: darker, it glowed red by moonlight)
        scorch: 0x141210, // Session 18: a blown pump's stumps and the scorch round it
        pumpTop: 0x4a4a46,
        hose: 0x1a1a1a,
        bin: 0x3a3a2a,
        canopy: 0x4a4a46,
        canopyBand: 0x5a2a22,
        post: 0x3a3a38,
        signFrame: 0x2e2a22,
        dumpster: 0x2a3a2c,
        bag: 0x1a1c1a,
      },
    },
  },

  // Session 17 (Aaron: more breadcrumbs from the family): seconds stuck on a
  // step (story/Objectives.js) before its hint line (dialogue.json hint.<id>).
  objectives: { hintAfter: { default: 100, note: 60, scanner: 80, tapes: 60 } },

  // Escaping the witch early in the run (Session 17, Aaron; story/WitchEscape.js):
  // until the cordon's crossed, while she's attacking within `range` metres,
  // ESCAPE THE WITCH on screen and the family say to run (or take the quad,
  // within quadRange); she's gone once she's been off him goneAfter seconds.
  // Session 18 (Aaron): the stop at home on the ride back from the storm shelter (story/HomeStop.js).
  homeStop: {
    callDistance: 110, // metres from the compound's centre: Wyatt's word to stop in
    insideMargin: 1, // metres inside the fence that count as home
    hintPad: 'The ledger (comms room): repair and upgrade the fence · a battery tops up the fence box',
    hintKey: 'The ledger (comms room): repair and upgrade the fence · a battery tops up the fence box',
    hintSeconds: 9,
  },
  witchEscape: { text: 'ESCAPE THE WITCH', range: 45, goneAfter: 6, cooldown: 90, quadRange: 70, outpostRange: 180 },

  // The overrun military outpost (Session 17, M9.4; encounters/Outpost.js,
  // data/outpost.json, render/OutpostProps.js; DESIGN.md "Overrun military
  // outpost"). The gateway south: the approach waves, the watchtower and its
  // rounds, the barricade's peak, the compound, the checkpoint.
  outpost: {
    // The approach (Aaron, Session 17: start at 3, 5, 8, then the barricade
    // at 14; tune in play). It starts once Ellen's sent Tom (outpostCall) and
    // he's within `start` metres of the outpost's centre: the arrival sweep,
    // then the first helmet (one army zombie on the road ahead, standing),
    // then the waves, each `lull` seconds after the last is down (the radio
    // talks in the lulls). A wave stands up `spawnAhead` metres ahead of Tom
    // toward the barricade (`spread` either side), and comes at him. By night
    // each is `nightScale` bigger. Retreat more than `retreat` metres from
    // the centre mid-wave and the waves go back to the last one cleared
    // (DESIGN edge case); the ones out are left as strays.
    approach: {
      start: 105,
      firstHelmetAhead: 30, // metres ahead of Tom, on the road
      waves: [2, 4, 6], // Session 17 (Aaron: too many, a long drawn-out fight): was 3, 5, 8
      lull: 9,
      spawnAhead: 42,
      spread: 14,
      memory: 30, // seconds a wave's zombies keep after Tom once they've lost sight of him
      nightScale: 1.5,
      retreat: 170, // (Session 17: no longer resets the waves)
      waveTimeout: 120, // seconds: a wave still out this long counts as down (its stragglers are strays)
      lostAt: 150, // metres from the outpost: one of a wave out this far, not chasing, has lost him (a stray)
    },
    // The barricade's peak (DESIGN beat 7): the biggest wave, standing up in
    // the compound (data/outpost.json peak) and coming through the gaps.
    // It starts once the approach is done and Tom's within `trigger` metres of
    // the barricade line, or as soon as he's at the line whatever the
    // approach. In `bursts` a few seconds apart. Down: outpostCleared (the
    // checkpoint opens).
    peak: { count: 12, nightScale: 1.25, trigger: 28, rush: 6, bursts: 3, burstEvery: 2.5, memory: 60 },
    // The watchtower: rounds in the snipers' nest (DESIGN: guaranteed), the climb.
    tower: { rounds: 10 },
    // The gun pit's machine gun (Session 17, Aaron: a taste of the turret
    // without overpowering the early game): dead until Tom fits a battery
    // (hold X with one in his pack); then it swings onto the nearest of the
    // dead within `range` and fires `rounds`, one every `every` seconds
    // (`damage` each, to the body), overheats for `overheat` seconds (smoke,
    // a warning) and blows up (`blast`: Explosives.blast, smaller than a charge).
    turret: {
      rounds: 25, // Session 18 (Aaron: underpowered, over too fast): was 15 every 0.42 s
      every: 0.6,
      damage: 70,
      range: 40,
      turnRate: 3.2, // radians a second
      aimed: 0.1, // radians off: it fires
      overheat: 2.6,
      fitSeconds: 1.2,
      fitRange: 2.4,
      blast: { radius: 5, damage: 160, playerDamage: 20, edge: 0.3, knockback: 2.5, shake: 1, alert: 80 }, // Session 18: 20 to Tom (was 35; Aaron caught himself in it)
    },
    // The beetles' crates (pass 4): the first time Tom comes within autoBreak
    // of one (past the barricade, no fight on) it breaks open by itself.
    // Session 18 (Aaron, after playing it): one breaks open by itself as Tom comes near; the second one he
    // opens sets all the rest off together, `stagger` seconds apart (the nearest first).
    crates: { autoBreak: 8, pryRange: 1.5, hearScratch: 10, stagger: [1, 2] },
    c7Distance: 9, // metres from the Mothman's container's torn-open end: its sweep (Session 18: it's by the road in, 35 m north-east of the tower)
    c7MaxNear: 2, // Session 18 (Aaron): the sweep plays with at most this many of the dead about (never from the quad)
    gunPitAskAfter: 6, // Session 18 (Aaron): seconds after the first helmet's down: Wyatt asks if the machine gun's rounds fit Earl's rifle
    // Session 18 (Aaron: after the fight it all "layers on top of each other"): after each of the
    // compound's beats (the all-clear, the beetles, C-4, C-7, the dogfight) the next one that comes by
    // itself (the beetles' crates, Wyatt's ask to scope, C-7's sweep) waits this many quiet seconds
    // (no cutscene, no one talking). What Tom does himself (hauling C-4, raising the scope) never waits.
    beatGap: 15,
    c7Lull: 8, // seconds added to the approach's lull after C-7's lines (the next wave waits for them)
    resinOpenSeconds: 2.2, // Session 17: C-4's doors swinging open (the reveal)
    sweepDistance: 70, // metres from the centre: the arrival sweep (once the call's come)
    callRoundsAfter: 30, // Session 17: seconds after Ellen's call, Wyatt on the soldiers' rounds (on its own)
    // (Session 18: Wyatt's ask to look through the scope now waits for beatGap's quiet, not a fixed time.)
    combatRange: 30, // metres: a living zombie or beetle this close is a fight on (the C-7 sweep waits)
    arriveInset: 6, // metres inside the clearing's edge: outpostEntered
    interactRange: 1.4,
    hold: { climb: 0.8, search: 1.0, rounds: 0.8, read: 0.5, crate: 1.6 },
    look: {
      // Session 19 (style pass 2): the dressing. net: the camo net over
      // the gun pit (size m square, height at its poles, sag, cells, the
      // share of cells torn out, tatters, darker patches). wire: the
      // concertina out in front of the sandbag runs (`out` m past the
      // bags, runs `run` m with `gap` m breaks, its radius and pitch, the
      // share trampled flat). generator: by the comms hut (from its middle).
      // brass: spent casings on the ground.
      // Session 19 (Aaron): working floodlights. pool: real point lights,
      // always in the scene, given to the lit floodlights nearest the camera
      // (within range m, fading over the last fade m); their colour,
      // intensity, reach and decay; each light sits `ahead` m out in front of
      // its lamp heads and `drop` m below them. glass: a lit head's colour;
      // halo: the soft glow round it (night only). night: the hours they
      // show (on from `on`, off at `off`, easing over `ramp` hours).
      // fitRange / fitSeconds: fitting the generator its battery.
      floods: {
        pool: 3,
        color: 0xe4ecff,
        intensity: 150,
        distance: 38,
        decay: 1.3,
        range: 80,
        fade: 15,
        ahead: 6,
        drop: 3,
        glass: 0xf4f6ff,
        halo: { color: 0xdce6ff, size: 2.6, opacity: 0.6 },
        night: { on: 18.75, off: 6.75, ramp: 0.75 },
        fitRange: 1.8,
        fitSeconds: 1.4,
        hintRange: 22, // Session 19 round 3 (Aaron: the family prompt it): Wyatt points it out the first time Tom's this close, the approach on
      },
      dressing: {
        net: { size: 5.2, height: 2.5, sag: 0.38, lumps: 0.16, cells: 12, holes: 0.1, tatters: 18, patches: 10 },
        wire: { out: 1.6, run: 7, gap: 1.2, radius: 0.42, pitch: 0.32, flat: 0.3 },
        generator: { cables: 1 }, // Session 19 (Aaron): out in the open (round 3: at the tower's foot; outpost.json floods.generator); cables to this many of the nearest floodlights
        brass: { barricade: 120, gunPit: 60 },
      },
      weather: { rust: [0x2a2c2a, 0x1c1e1c, 0x34382a, 0x3a2a20, 0x2a3034, 0x2e2e2a, 0x1e1e1c, 0x2e3228, 0x26241e, 0x1e1e1c] },
      colors: {
        sandbag: 0x3a3424,
        sandbagDark: 0x2c271a,
        sandbagTie: 0x22201a,
        steel: 0x2a2c2a,
        steelDark: 0x1c1e1c,
        wire: 0x2a2a28,
        olive: 0x343a26,
        oliveDark: 0x262b1c,
        canvas: 0x30341f,
        canvasDark: 0x24271a,
        timber: 0x382c1e,
        timberDark: 0x261e14,
        concrete: 0x3a3a36,
        lamp: 0x1e1e1c,
        lampGlass: 0x2c2e2a,
        containerA: 0x34382a, // olive drab
        containerB: 0x3a2a20, // rust brown
        containerC: 0x2a3034, // blue-grey
        containerD: 0x2e2e2a,
        rust: 0x3e2414,
        scorch: 0x0c0a08,
        gouge: 0x6a685e, // Session 17: claw gouges scrape the paint back to bare steel (pale: they show)
        flatbed: 0x1e1e1c,
        tyre: 0x121212,
        resin: 0x8a5a14,
        husk: 0x3a3424,
        chain: 0x26241e,
        crate: 0x3a2e1c,
        crateBand: 0x22201c,
        crateStencil: 0x5a5440,
        locker: 0x2e3228,
        desk: 0x2e2a22,
        radio: 0x22261e,
        paper: 0x5a564a,
        helmet: 0x343a26,
        pack: 0x30321f,
        rifle: 0x1a1a18,
        can: 0x2e3a22,
        casing: 0x6a5420,
        blood: 0x1c0806,
        void: 0x050505,
        // Session 19 (style pass 2).
        net: 0x2e3220,
        netDark: 0x22261a,
        razor: 0x34342e,
        cable: 0x121212,
        generator: 0x262a1c, // Session 19: darker than the olive (it glared under the torch)
      },
    },
  },

  // Earl's quad bike (Session 15b pass 3, Aaron: "too much walking and
  // running"; world/Quad.js). Speeds in m/s: Tom walks 3.6, sprints 7.2.
  // The Pruitts' storm shelter (Session 16; encounters/StormShelter.js,
  // data/stormShelter.json). Aaron: small and a bit shabby (Earl dug it).
  stormShelter: {
    // The horde holding the hatch (Aaron: 12 citizens), there through the
    // day: put there as Tom comes within `hordeDistance` of the clearing's
    // edge, lingering round the hatch; Earl stands among them (variant
    // 'earl'). While Night 1's sigil is still in the ground, more climb out
    // of it (one every `riseEvery` seconds while fewer than `count` are
    // up and Tom's within `riseRange` of it), by day too; dug up, that stops.
    horde: { count: 12, riseEvery: 6, riseRange: 60, memory: 20 },
    hordeDistance: 70,
    // Session 16 (Aaron, on the quad): the sweep comes this far up the path
    // from the clearing's edge, so there's time to see the horde, get back
    // on the bike and plough into them.
    sweepDistance: 32,
    interactRange: 2.8, // metres to the hatch (Session 16, Aaron: from further out, it's on a mound) or the keys
    roomRange: 0.9, // metres to a search point below (the room's small)
    // Session 21: the room below is an interior (world/Interiors.js). shaft:
    // metres the shaft over the ladder rises above the ceiling to the hatch;
    // light: its own (an earth room under a thrown-back hatch: dim, warm-grey).
    interior: {
      shaft: 1.6,
      light: { ambientDay: 3.2, ambientNight: 1.1, ambientColor: 0x9a9080, fogColor: 0x080706, fogNear: 5, fogFar: 30 }, // ambientDay / ambientNight: daylight down the hatch by day, less by night (blended by the hour)
    },
    keysRange: 1.8,
    hold: { digHatch: 2.6, openHatch: 1.0, climbDown: 0.8, climbUp: 0.8, keys: 0.8 },
    look: {
      // Session 19 (style pass 2): the keys' glint and the colouring book's pale pages stay bright (on purpose); rust on the hatch and the tins.
      weather: { keepBright: [0xffe8a0, 0x8a8070], rust: [0x2a2a2a, 0x34281c, 0x3e2e1e, 0x2e3a2a, 0x4a1c14] },
      // Session 19: up top, the mound's sod patches, grass tufts, roots
      // and stones, and the tarp (from the hatch, m); below, the floor's
      // boards, the walls' plank width, the roots through the ceiling
      // ([x, z, length] room-local), a cobweb's size, the hung lamp, the
      // coat, the calendar, the spilled earth (room-local).
      mound: { sod: 6, tufts: 16, roots: 5, stones: 9, tarp: { x: 1.3, z: 1.1, w: 1.6, d: 1.3 } },
      room: {
        floorBoards: 13,
        plankWidth: 0.2,
        roots: [[-0.9, -0.3, 0.45], [0.6, 0.9, 0.3], [-0.2, 1.05, 0.55], [1.1, -0.6, 0.25]],
        web: 0.35,
        lamp: { x: -0.6, z: -0.2 },
        coat: { x: -1.47, z: -0.85, yaw: 90 },
        calendar: { x: 0.2, z: 1.27 },
        spill: { x: 1.2, z: 1.0 },
      },
      colors: {
        // Session 19 (style pass 2).
        sod: 0x26281a,
        grass: 0x2e3420,
        root: 0x2a1e12,
        stone: 0x34322e,
        tarp: 0x242a20,
        web: 0x4a4a46,
        coat: 0x2e3a24,
        calendar: 0x4a463c,
        calendarTop: 0x3a1c16,
        earth: 0x2a2014,
        earthDark: 0x1a140c,
        leaves: 0x2c2414,
        timber: 0x3a2e20,
        timberDark: 0x261e14,
        rust: 0x4a2a16,
        metal: 0x2a2a2a,
        brass: 0x6a5420,
        glint: 0xffe8a0,
        hatch: 0x34281c,
        hatchRib: 0x3e2e1e,
        void: 0x020202,
        lantern: 0x2e3a2a,
        glass: 0x5a5a4e,
        duffel: 0x283020,
        strap: 0x161616,
        jerrycan: 0x4a1c14,
        plank: 0x33271a,
        plankDark: 0x251c12,
        ceiling: 0x1e1810,
        mattress: 0x3a3830,
        blanketA: 0x3a1a16,
        blanketB: 0x1c2638,
        pillow: 0x4a4638,
        jug: 0x3a4248,
        tinA: 0x4a3418,
        tinB: 0x2a3a2a,
        tableTop: 0x3a2c1c,
        game: 0x3a2a3a,
        colouring: 0x8a8070, // Session 18: pale open pages (it read as a second diary in the torch)
        crayonA: 0x7a2a1a,
        crayonB: 0x2a4a7a,
        tv: 0x1e1c1a,
        screen: 0x0a0e0c,
        vcr: 0x161616,
        tape: 0x2a2826, // Session 25: one tape, half out of the VCR (it was a box of them)
        tapeLabel: 0x6a6450,
        vcrLight: 0x8a2018,
        toy: 0x4a3420,
        cot: 0x2a3020,
        diary: 0x3a1410,
      },
    },
  },

  quad: {
    skipParked: { out: 7, side: 4.5 }, // Session 21 (Aaron): after Skip intro it waits outside the station's gate: metres out past the gate, and to the side of the path
    parked: { x: 7.5, z: -17.6, yaw: 180 }, // in the gas station's frame (gasStation.json): behind the store, by the stockroom's back door, nose to the trail
    maxSpeed: 13, // about 47 km/h on a pathway (nearly twice a sprint)
    reverseSpeed: 3.5,
    acceleration: 5, // m/s each second on the gas
    brake: 12, // stick back while moving
    coast: 2.5, // off the gas
    steerRate: 1.9, // radians a second at full lock, once it's rolling
    steerFullAt: 3, // m/s: below this the steering's weaker (it can't turn on the spot)
    steerFastLoss: 0.45, // share of the steering lost at top speed
    undergrowthMultiplier: 0.35, // off the pathways the brush holds it to about a third
    radius: 0.85, // its body against trunks and walls
    parkedRadius: 1.0, // solid while it's parked
    bumpSpeed: 2, // a bump below this is just a nudge
    bumpKeep: 0.25, // share of the speed kept after hitting something solid
    bumpShake: 1.2,
    eyeHeight: 1.6, // Tom's eye above the ground in the saddle
    seatBack: 0.4, // ...and this far behind the quad's middle (the handlebars show at the bottom of the view)
    mountRange: 2.2,
    mountSeconds: 0.6,
    dismountSeconds: 0.5,
    dismountSpeed: 1.5, // m/s: slow down to get off
    stepOff: 1.3, // metres to the side he steps off
    wheel: { radius: 0.32, width: 0.26 },
    // Into the dead at speed (scaled by speed: full at maxSpeed). A citizen
    // has 60 health at level 1: a full-speed hit drops one.
    ram: { minSpeed: 4, reach: 0.9, damage: 70, mutantScale: 0.4, stagger: 0.8, knockback: 4, keep: 0.75, mutantKeep: 0.15, shake: 0.5 },
    // The engine carries: every `every` seconds, the dead within idle..full metres (with speed) come.
    noise: { every: 1.5, idle: 25, full: 60 },
    witchSpeedScale: 1.6, // Aaron: the witch is faster while Tom's on it
    // Session 16 (Aaron): a headlamp of its own, to see further ahead
    // riding. On as Tom gets on in the dark (daylight under `autoBelow`),
    // and when night falls while he rides (unless he's switched it off this
    // ride); off as he gets off. The 'headlamp' button toggles it (D-pad
    // right: the torch is D-pad left; first aid's off in the saddle anyway).
    // No shadow (the torch keeps the game's one). At (0, y, front) on the
    // quad, aimed `aimDistance` ahead and `aimDrop` down.
    headlamp: { autoBelow: 0.35, color: 0xfff4dc, intensity: 900, distance: 80, decay: 1.4, angle: 17, penumbra: 0.5, y: 0.82, front: -1.02, aimDistance: 25, aimDrop: 0.8, lens: 0xfff2c8,
      glare: { fullDistance: 9, minFactor: 0.04, response: 10, spread: 0.18 } }, // Session 16 (Aaron): dims up close on trees, cars, rocks (as the torch)
    // Session 16 (Aaron): one of the witch's snares ridden over wraps round
    // the front wheel: it stops dead, Tom gets off (he's free), and taps X
    // by it `presses` times to free the wheel (the effort drains if he stops).
    snare: { presses: 6, decay: 0.15, shake: 0.9, range: 2.2 },
    // Dark: the torch is right on the handlebars and the tank from the saddle (it glared them white).
    look: { tyre: 0x121212, hub: 0x262626, frame: 0x1c1c1c, body: 0x2a3018, seat: 0x161412, rack: 0x161616, metal: 0x18191a, grip: 0x0e0e0e, lamp: 0x3a3a30 },
  },

  // ---- Experimental vehicles (debug menu only: "Experimental vehicles") ----
  // Built to try out, not yet in the story (maybe end-of-game unlocks).
  // Brought to Tom from the debug menu; not saved, not on the map.

  // The ute (world/Ute.js, render/uteModel.js): a right-hand-drive farm ute
  // with a heavy machine gun on a post in the tray. Tom drives from the cab
  // (the view from the driver's seat: the gauges, the mirror, his hands on
  // the wheel) and Y climbs him over into the tray to man the gun (the ute
  // handbrakes to a stop); Y again drops him back behind the wheel.
  // Riding it reuses the quad's rules where it can (getting on and off, the
  // headlamp and its glare, the engine's noise, the witch's snare).
  ute: {
    // Driving (m/s, m/s², radians). A heavier, faster thing than the quad:
    // about 85 km/h flat out on a pathway, still held back in the brush.
    maxSpeed: 23.5,
    reverseSpeed: 6,
    acceleration: 7.5, // at low speed; it falls away toward the top
    brake: 16,
    coast: 1.6, // rolling resistance off the gas
    engineBrake: 1.2, // extra drag off the gas in a low gear
    undergrowthMultiplier: 0.42, // four-wheel drive: the brush slows it less than the quad
    brushDrag: 2.5, // m/s² extra in thick brush
    wheelbase: 3.18,
    maxSteer: 0.6, // the front wheels' lock
    steerSpeed: 2.6, // how fast the wheels turn toward the stick (rad/s)
    steerFastLoss: 0.6, // share of the lock taken away at top speed (it's twitchy otherwise)
    grip: 10, // how fast sideways sliding is killed (1/s)
    handbrake: { grip: 1.4, yawBoost: 1.7, drag: 5 }, // A / Space: the rear lets go, it slides round
    radius: 1.0, // each of its three body circles
    circles: [-1.75, 0, 1.75], // ...along it (z)
    bumpSpeed: 2.5,
    bumpKeep: 0.35,
    bumpShake: 1.4,
    // The gears (an old five-speed diesel): each gear's top as a share of
    // maxSpeed; it changes up at shiftUp of its range, down below shiftDown.
    gears: [0.2, 0.38, 0.58, 0.8, 1],
    idleRpm: 0.75, // x1000
    redline: 4.0,
    shiftUp: 0.92,
    shiftDown: 0.42,
    shiftSeconds: 0.3, // the drive cut while it changes
    // Suspension (the body rocking on its springs): pitch and roll per m/s² and its spring.
    suspension: { pitch: 0.006, roll: 0.012, stiffness: 55, damping: 7, maxPitch: 0.06, maxRoll: 0.07 },
    // Getting in and out (the quad's prompts), the cab's view.
    mountRange: 2.6, // from its side, by the driver's door
    mountSeconds: 0.6,
    dismountSeconds: 0.5,
    dismountSpeed: 1.5,
    stepOff: 1.9,
    eye: { x: 0.42, y: 1.57, z: 0.16 }, // in the cab (the ute's frame)
    eyeHeight: 1.57,
    restPitch: -0.2, // the cab's view rests looking a little down (the road, the gauges over the wheel) // above the ground (Tom's position is kept under his eye)
    seatBack: 0,
    view: { yawLimit: 2.0, pitchMin: -0.7, pitchMax: 0.5, recentre: 1.6, recentreRate: 2.5 }, // radians; recentre: seconds of no look before the view eases back ahead
    // The gunner: standing in the tray behind the gun.
    gunner: { back: 0.8, up: 0.52, climbSeconds: 0.45, brakeStop: 30 },
    // The gun (a heavy machine gun, belt-fed; no reloads, but it overheats).
    gun: {
      rate: 8.5, // rounds a second
      damage: 46, // a level-1 citizen falls to two
      pierce: 3, // through this many of the dead in a line
      pierceKeep: 0.7,
      range: 160,
      falloff: [40, 160, 0.6], // full damage to 40 m, 60% at 160 m
      spread: 0.45, // degrees, first rounds
      spreadMax: 1.6, // degrees, after a long burst (short bursts stay tight)
      spreadGrow: 0.07, // degrees per round
      spreadSettle: 3.5, // degrees a second it settles off the trigger
      aimSpread: 0.6, // x the spread with LT held (the view zooms)
      aimFov: 0.72,
      stagger: 0.5,
      knockback: 1.2,
      heatPerShot: 0.024, // about five seconds of fire from cold
      coolRate: 0.38, // a second, off the trigger
      coolDelay: 0.25,
      jamUntil: 0.3, // overheated: it won't fire until it's cooled to this
      kick: 0.35, // degrees of camera kick per round
      shake: 0.12,
      traverse: 9, // rad/s the gun can swing (the mount's weight; the view rides the gun)
      pitchMin: -0.38, // over the cab
      pitchMinSide: -0.8, // Session 25 (Aaron: the dead got too close to shoot): over the sides and the back it dips far enough for one at the tray's side
      pitchMax: 0.62,
      tracerEvery: 2, // every second round's a tracer
      noise: 90, // metres the dead hear it
      brass: { pool: 60, life: 2.2, bounce: 0.35 },
      rangeAssist: 0.08, // controller: radians either side where the gun's slowed over a target
    },
    // Into the dead at speed: they're thrown.
    ram: { minSpeed: 4, reach: 1.3, front: 2.75, damage: 160, mutantScale: 0.45, stagger: 1, knockback: 9, keep: 0.93, mutantKeep: 0.55, shake: 0.6, witchDamage: 60 },
    sideShove: 6, // m/s the dead are pushed away along its flanks
    noise: { every: 1.2, idle: 30, full: 80 },
    horn: { alert: 120, seconds: 0.5 }, // B / R in the cab: the dead within this come
    strikeScale: { cab: 0.5, gunner: 0.85 }, // the dead's swipes through the door, up at the tray
    witchSpeedScale: 1.6,
    // Session 25 (Aaron: "a bit bright, everything reflects more than it should; a little wider, but duller"): 1600 cd at 24 deg was.
    headlamp: { autoBelow: 0.35, color: 0xfff1d8, intensity: 850, distance: 100, decay: 1.4, angle: 30, penumbra: 0.7, y: 1.05, front: -2.6, aimDistance: 32, aimDrop: 1.1, lens: 0xfff2c8,
      glare: { fullDistance: 7, minFactor: 0.3, response: 8, spread: 0.1 } }, // dims up close (as the quad's), but the roadside trees don't kill it
    // The gun's lamp, on the shield: it looks where the gun looks (on with the headlamps, D-pad right / H).
    gunLamp: { color: 0xfff0d8, intensity: 650, distance: 80, decay: 1.4, angle: 16, penumbra: 0.55, aimDistance: 30, aimDrop: 0.4 }, // Session 25: duller too (1100 at 13 deg was)
    snare: { presses: 8, decay: 0.15, shake: 1.1, range: 2.6 },
    // The windscreen: the dead's blood on it; the wipers come on by themselves.
    splats: { pool: 8, minSpeed: 6, size: [0.07, 0.14], wipeDelay: 0.7, sweepSeconds: 1.1, sweeps: 2, fade: 3 },
    // The rear-view mirror shows what's behind (a second, small camera; every `every` frames).
    mirror: { live: true, width: 256, height: 80, every: 3, far: 70, fov: 32 },
    fuel: 0.62, // where the gauge sits (the ute doesn't run out)
    look: {
      paint: 0x47503c, // dull bush green (pale paint glares under the torch)
      dirt: 0x5a4030,
      dirtHeight: 1.1,
      dialInk: '#e6dfcc',
      dialBrightness: 1.1,
      needle: 0xff6a1a,
      dashGlow: 0x0b0806, // the cab's faint night glow off the gauges
      radioInk: '#ffb640',
      warnLamp: 0x3cff6a,
      warnBrake: 0xff2a1a,
      blood: 0x3a0606,
      flash: 0xffc070,
      headLens: 0x3a3a34,
      spotLens: 0x34342e,
      tailLens: 0x3a0c08,
      brakeLens: 0x400c08,
      reverseLens: 0x3a3a36,
      lit: { head: 0xfff0d0, spot: 0xfff4e0, tail: 0x8a1408, brake: 0xff2010, reverse: 0xd8d8d0 }, // the lenses' glow when lit
      heatGlow: 0xff4a10, // the barrel at its hottest
      odometerStart: 412873.4,
      colours: {
        under: '#141414',
        rubber: '#121212',
        steel: '#3a3b3c',
        bar: '#1c1d1e',
        glass: '#0c1014',
        grille: '#0e0e0e',
        seam: '#101010',
        plate: '#5c5848',
        amber: '#5a3a10',
        alloy: '#4c4e50',
        alloyDark: '#2e3032',
        gun: '#26282a',
        gunDark: '#1a1b1c',
        shield: '#353a2e',
        shieldEdge: '#202218',
        ammoCan: '#3a4228',
        brass: '#7a5e26',
        grip: '#18120c',
        jerry: '#4a1810',
        jerryB: '#3a4228',
        crate: '#3c3a28',
        tyre: '#121212',
        tyreWall: '#1c1c1c',
        rim: '#4a4a46',
        hole: '#0a0a0a',
        hub: '#2a2a2a',
        rope: '#5a4a30',
        lining: '#565048',
        liningDark: '#38352e',
        trim: '#34312e',
        trimDark: '#161514',
        door: '#3e3a35',
        dash: '#2a2826',
        dashTop: '#22201e',
        dashDark: '#0e0e0e',
        dashSeam: '#232220',
        knob: '#121212',
        mat: '#101010',
        seat: '#4a3426',
        seatStripe: '#4a3a2a',
        wheel: '#141414',
        wheelHub: '#1a1a1a',
        glove: '#4a3622',
        sleeve: '#3a3c30',
        cuff: '#22241c',
        leaf: '#2c4a24',
        string: '#8a8070',
      },
    },
  },

  // The alien quad (world/AlienQuad.js, render/alienQuadModel.js): Earl's
  // quad as the greys rebuilt it: neon veins, glowing hubs, twin plasma
  // emitters on the front rack, a boost. RT fires plasma bolts (hold for
  // more), LT holds a charge for a big orb and lets it go; L3 / A boosts
  // for three seconds. Keyboard: left mouse, right mouse (hold), Shift / Space.
  alienQuad: {
    maxSpeed: 15,
    reverseSpeed: 4,
    acceleration: 7,
    brake: 14,
    coast: 2.5,
    steerRate: 2.1,
    steerFullAt: 3,
    steerFastLoss: 0.45,
    undergrowthMultiplier: 0.5, // it skims the brush a little better than Earl's
    radius: 0.85,
    parkedRadius: 1.0,
    bumpSpeed: 2,
    bumpKeep: 0.25,
    bumpShake: 1.2,
    eyeHeight: 1.6,
    seatBack: 0.4,
    mountRange: 2.2,
    mountSeconds: 0.6,
    dismountSeconds: 0.5,
    dismountSpeed: 1.5,
    stepOff: 1.3,
    wheel: { radius: 0.33, width: 0.27 },
    // The boost: three seconds of it, then it charges back up.
    boost: {
      seconds: 3,
      recharge: 7, // seconds from empty to full
      minToStart: 0.35, // share of the meter it needs to fire up
      speed: 30, // top speed while it burns (m/s: about 108 km/h)
      acceleration: 24,
      brush: 0.85, // the brush holds it back far less while it burns
      fov: 1.2, // the view widens
      shake: 0.25,
      ram: 2.2, // x the ram's damage
      steer: 0.75, // the steering's gentler at that speed
    },
    // The plasma: bolts from alternate emitters, a charged orb from both.
    // Session 20 (Aaron, Nov 8): its store, in the station's power units (a
    // battery is 100). Driving is free; the plasma capacitor's refill (perCell
    // units a cell) and the boost (boostPerSecond while it burns) draw on it.
    // A battery fits at its back (rearOffset metres behind its middle, within rearRange).
    power: { capacity: 1000, start: 1000, perCell: 10, boostPerSecond: 20, rearOffset: 1.1, rearRange: 1.1, fitSeconds: 0.8 },
    plasma: {
      cells: 10, // the capacitor
      recharge: 2.6, // cells a second, once it's been idle a moment
      rechargeDelay: 0.5,
      bolt: { cost: 1, every: 0.2, speed: 58, damage: 55, splash: 2.4, splashDamage: 34, radius: 0.16, life: 2.2, gravity: 2.5, knockback: 2.5, stagger: 0.6, scale: 1 },
      orb: { cost: 4, charge: 1.1, speed: 40, damage: 180, splash: 5.5, splashDamage: 130, radius: 0.34, life: 3, gravity: 1.5, knockback: 9, stagger: 1, scale: 2.4, minCharge: 0.25 },
      homing: { cone: 0.2, turn: 2.2, range: 45 }, // radians, rad/s, metres: a gentle pull toward the dead near the crosshair
      aimCone: 1.2, // radians either side of ahead it can fire (the emitters face forward)
      lights: 1, // point lights handed to the nearest balls (in the scene once the quad's been brought)
      lightIntensity: 22,
      lightDistance: 9,
      noise: 40,
      selfSplash: 0.25, // x the splash on Tom (an orb at his feet stings)
    },
    ram: { minSpeed: 4, reach: 0.95, damage: 80, mutantScale: 0.45, stagger: 0.8, knockback: 5, keep: 0.8, mutantKeep: 0.2, shake: 0.5 },
    noise: { every: 1.5, idle: 22, full: 55 },
    witchSpeedScale: 1.6,
    headlamp: { autoBelow: 0.35, color: 0x9ffff0, intensity: 1100, distance: 85, decay: 1.4, angle: 19, penumbra: 0.5, y: 0.86, front: -1.08, aimDistance: 26, aimDrop: 0.8, lens: 0x9ffff0,
      glare: { fullDistance: 7, minFactor: 0.25, response: 8, spread: 0.12 } },
    snare: { presses: 6, decay: 0.15, shake: 0.9, range: 2.2 },
    underglow: { color: 0x30ffb0, intensity: 4, distance: 4.5 },
    look: {
      tyre: 0x101010,
      frame: 0x1a1d20,
      body: 0x262c32,
      seat: 0x101214,
      metal: 0x22262a,
      grip: 0x0c0c0c,
      chitin: 0x232a32, // the greys' plating: a dark, blue-black shell
      vein: 0x24ffc0, // the neon (cyan-green)
      veinB: 0x8a5cff, // and violet accents
      plasma: 0x3cffd0,
      orb: 0x9a7cff,
      glow: 1.9, // how far past white the neon's pushed (the bloom catches it)
    },
  },

  // The dozer (world/Dozer.js, render/dozerModel.js, world/LandClearing.js;
  // experimental, debug menu only): Earl's old forestry crawler dozer. Slow
  // and unstoppable: it pushes over trees (the tall and thick hold a moment),
  // cuts trails that stay (and show on the map), shoves the dead before its
  // blade and crushes them under its tracks, pushes abandoned cars about and
  // drags them (or the dead) on its winch. The loudest thing in the woods.
  // Left stick: drive (tank steering: it pivots on the spot); RT / left mouse:
  // the blade down (it digs: bare earth); LT / right mouse: the blade right up
  // (the dead slip under it, into the tracks); B / R: the winch's hook at what
  // you're looking at (again: let go); hold Y / F: reel it in; A / Space: the
  // horn; D-pad right / H: the work lights; hold X / E (stopped): get off.
  dozer: {
    maxSpeed: 5.2, // m/s: about 19 km/h (a jog: a sprint outruns it)
    reverseSpeed: 3,
    acceleration: 2.2,
    brake: 6,
    turnRate: 0.95, // rad/s at full lock (pivoting on the spot, too)
    turnAccel: 3,
    undergrowthMultiplier: 0.88, // the brush barely slows it
    bladeLoad: 0.75, // x top speed with the blade down, digging
    pushLoad: 0.55, // x top speed pushing a car
    pileLoad: 0.06, // x top speed lost for each of the dead before the blade
    halfTrack: 0.98,
    circles: [-1.15, 0, 1.2], // its body's circles along it (z), radius `radius`
    radius: 1.28,
    bladeHalf: 1.7,
    bladeFront: -2.95, // the blade's face (z), when carried
    bladeSpeed: 1.4, // how fast the blade moves (lift units a second)
    bumpSpeed: 0.8,
    bumpShake: 1.4,
    // Getting on and off (the quad's prompts).
    mountRange: 2.6,
    mountSeconds: 0.8,
    dismountSeconds: 0.6,
    dismountSpeed: 0.6,
    stepOff: 2.1,
    eye: { x: 0, y: 2.6, z: 0.66 }, // on the seat (its frame), high over the hood
    eyeHeight: 2.6,
    seatBack: 0,
    restPitch: -0.3,
    view: { yawLimit: 2.6, pitchMin: -0.85, pitchMax: 0.6, recentre: 2.2, recentreRate: 1.8 },
    // Trees: pushed by the blade (or the body), they go; the big ones hold a while.
    fell: { minSpeed: 0.05, sideFell: true },
    // The dead: before the blade they're pushed (and hurt), pinned they're crushed;
    // under the tracks (the blade up, or from the side) they're crushed.
    crush: { push: 18, pinned: 260, tracks: 340, ram: 40, mutantScale: 0.5, knockback: 3, shove: 5, stagger: 0.9 },
    // They climb onto it while it's slow (the open cab): one that's held on
    // beside the station for `seconds` reaches Tom; going fast or pivoting throws them off.
    climb: { seconds: 1.4, slowBelow: 1.4, throwAbove: 2.4, throwTurn: 0.7, spot: [1.12, 0.55] },
    strikeScale: 0.9,
    // The winch: its hook, its cable, the pull.
    winch: { range: 30, cone: 0.22, hookSpeed: 40, reel: 2.6, minLength: 2.5, drag: 7, carPull: 1, carGap: 0.6, zombieDamage: 14, segments: 10, sag: 0.08 }, // carGap (Session 25): a winched car stops this far short of the dozer
    noise: { every: 1.0, idle: 70, full: 150 },
    horn: { alert: 160 },
    witchSpeedScale: 1.3,
    // The work lights: on the radiator guard, over the blade, lighting the ground before it.
    // Session 25 (Aaron: "huge glare when you shine it on anything"): 1300 cd at 26 deg was; wider and much duller.
    headlamp: { autoBelow: 0.35, color: 0xfff2dc, intensity: 600, distance: 65, decay: 1.4, angle: 32, penumbra: 0.7, y: 1.8, front: -2.2, aimDistance: 24, aimDrop: 1.6, lens: 0xfff2c8,
      glare: { fullDistance: 7, minFactor: 0.08, response: 8, spread: 0.16 } },
    snare: { presses: 6, decay: 0.15, shake: 0.9, range: 2.8 },
    // The ground it works, the trees it fells (world/LandClearing.js).
    clearing: {
      trackOpen: 0.75, // under the tracks: the undergrowth crushed this far (open ground)
      trackDirt: 0.25, // ...and churned up this much
      bladeWidth: 1.75, // the blade's cut (half), when it's down
      soft: 1.2,
      stampSpacing: 1.2,
      flushEvery: 0.35, // seconds between sending the ground and the map
      logs: 120,
      stumps: 300,
      fallingPool: 6,
      // How long a tree holds: past freeHeight metres tall (and freeRadius thick).
      strain: { freeHeight: 14, perMetre: 0.12, freeRadius: 0.55, perRadius: 1.2 },
      // Session 25 (Aaron: "the bulldozer gets stopped by the rocks, and that's not very fun"): loose
      // rocks and boulders break (the cliffs and the rock round Bigfoot's cave don't): a rock holds the
      // blade base seconds, plus perMetre for each metre of size past freeSize, then breaks apart.
      rocks: { base: 0.35, freeSize: 0.4, perMetre: 1.1, chips: 0x5a5852 },
      fall: { gravity: 3.2, push: 0.3, lie: 2.2, sink: 2.2, shake: 0.8 },
      look: { bark: 0x2e261e, cut: 0x6a5a40, dust: 0x5a4a34, needles: 0x2a3a22, stumpHeight: 0.45 },
    },
    look: {
      mudHeight: 1.1,
      dialInk: '#e6dfcc',
      dialBrightness: 1.05,
      hoursStart: 18432.6,
      colours: {
        paint: 0x7a6420, // a faded, dull cat yellow (bright yellow glares under the torch)
        frame: 0x222220,
        dark: 0x161616,
        steel: 0x3a3a38,
        seam: 0x2a2410,
        exhaust: 0x2a2018,
        seat: 0x1c1a16,
        edge: 0x2c2c2a,
        shoe: 0x262624,
        cable: 0x34302a,
        cableDark: 0x1e1c18,
        chrome: 0x6a6a66,
        glove: 0x4a3622,
        sleeve: 0x3a3c30,
      },
      mud: 0x3a2c1c,
    },
  },

  // Session 21 (M10.2; world/Interiors.js; DESIGN.md "Interiors (shared
  // system)"): interiors are loaded into a pocket this far under their
  // entrance, beyond any draw distance, so the forest isn't drawn while Tom's
  // inside; what he hears from outside comes through at `muffle` of its volume.
  interiors: {
    depth: 1200,
    muffle: 0.3,
  },

  // Session 22 (M10.3 spikes; debug only, rough, to measure on the tablet).
  spikes: {
    // The place beyond the stairs (DESIGN.md "Stairs in the woods"), on the
    // interior system: a square pocket of foggy forest, a clearing in the
    // middle and four paths out; the trees are re-dealt for each clearing.
    placeBeyond: {
      needed: 3, // silent paths in a row to find Junie
      half: 34, // metres from the centre to the pocket's edge
      clearingRadius: 11,
      pathHalf: 2.2, // a path's half-width (no trees on it)
      exitReach: 30, // walk this far out along a path and it's taken
      entryInset: 5, // metres in from the edge Tom arrives at
      treeSpacing: 3.2, // a grid of trees, each jittered...
      treeJitter: 1.3, // ...by up to this
      treeKeep: 0.8, // ...and kept with this chance
      trunk: { radiusTop: 0.18, radiusBottom: 0.32, height: 9, color: 0x2a2620 },
      canopy: { radius: 2.0, height: 7, base: 3.5, color: 0x1d2a22 },
      floor: { color: 0x3a3d33 },
      sizeJitter: 0.35, // each tree's size, up or down by this fraction
      callEvery: [3.5, 6], // seconds between Junie's calls (from one calling path, then the other)
      light: { ambientDay: 2.6, ambientNight: 1.5, ambientColor: 0xa0a8b4, fogColor: 0x5d6469, fogNear: 2, fogFar: 26 },
      // Session 26: its look in the story (encounters/PlaceBeyond.js applyLook): the forest slightly off.
      // Bone-grey trunks, blue-black crowns, a dead floor, the fog closer (storyLight), every tree leaning in (radians).
      story: { trunkColor: 0x55534c, canopyColor: 0x1a2226, floorColor: 0x30322c, fogColor: 0x4c5356, lean: 0.07 },
      storyLight: { ambientDay: 2.2, ambientNight: 1.4, ambientColor: 0x98a4b0, fogColor: 0x4c5356, fogNear: 1, fogFar: 19 },
    },
    // A flying enemy (the Mothman's flyovers and dives; DESIGN.md "The
    // Mothman"). Its script: passes over Tom, circling between, then dives
    // that strike if they reach him. It can't die out here: hurt enough, it
    // flies off (the design: it only dies in its cave).
    // Session 25 (Aaron: "I'd really love to shoot some of them"): a swarm of giant moths (ai/Moths.js),
    // debug only. A first guess at every number, to tune once he's played it.
    moths: {
      swarm: 16, // "send a swarm" (Aaron: a swarm is 16 to 32)
      bigSwarm: 32, // "send a big swarm" (the renderer's pool: config.moths.giant.poolSize)
      startDistance: 28, // metres off they come in from
      cloudRadius: [2, 5], // each moth's orbit round the cloud's middle (metres)
      cloudHeight: [3, 5], // ...and its height above Tom's feet
      orbitSpeed: [0.25, 0.6], // radians a second round the cloud
      follow: 0.6, // how fast the cloud's middle drifts after Tom (per second)
      millSpeed: 5.5, // metres a second, milling
      steer: 2.6, // how fast they turn (per second)
      dartEvery: [1, 2], // seconds between darts
      dartCount: [1, 2], // moths in each dart
      dartSpeed: 11,
      dartAt: 1.3, // metres up Tom they aim (his chest)
      dartMax: 2.4, // seconds before a dart that hasn't reached him gives up
      nipRange: 0.9,
      nipDamage: 4, // a nip
      peelSeconds: 1.3, // back up to the cloud after a dart
      health: 16, // a service rifle round (25) drops one; three shotgun pellets (6 each) drop one
      hitRadius: 0.35, // the hit shape: a small ball round its body
      flinchSeconds: 0.3,
      fallGravity: 9,
      corpseSeconds: 6,
      leaveSpeed: 9,
      leaveDistance: 70,
      flutterEvery: 0.32, // one quiet flutter for the whole swarm this often
    },
    flyer: {
      script: ['flyover', 'flyover', 'dive', 'dive', 'dive', 'dive'], // then it leaves
      circleSeconds: [2.5, 4.5], // circling between moves
      circleRadius: 22,
      circleHeight: 14, // metres above Tom
      circleSpeed: 15, // m/s
      flyoverHeight: 9,
      flyoverPast: 45, // metres past Tom a pass carries on
      flyoverSpeed: 24,
      diveSpeed: 21,
      diveAt: 1.3, // aims this high above Tom's feet (his chest)
      strikeRange: 2.0, // a dive this close hits him...
      strikeDamage: 22, // ...for this much
      climbDistance: 28, // after a dive it pulls up and away this far
      climbSpeed: 17,
      steer: 3.2, // how fast its velocity turns toward where it's going (per second)
      leaveSpeed: 26,
      leaveDistance: 140, // gone once this far off
      health: 260,
      fleeAt: 0.35, // hurt below this fraction of its health, it leaves early
      startDistance: 90, // it comes in from this far off
      // Its hit shape (combat/hitscan.js), round its body's foot (y).
      hitRadius: 0.75,
      height: 2.4,
      headBottom: 1.9,
      headRadius: 0.32,
      headshotMultiplier: 2,
      // Its look is the Mothman's (config.mothman; Session 24).
      strikeShowSeconds: 0.45, // the rake's pose holds this long after a dive lands
      bank: 0.35, // radians of bank per radian a second it's turning...
      bankMax: 0.7, // ...up to this
      flapHz: [1.4, 3.2], // slow gliding to fast flapping (diving)
      hitFlashSeconds: 0.12,
    },
    // Parts bolted onto the dozer (the killdozer's, DESIGN.md "The endgame:
    // the killdozer"): each a look on the blade or the body, and what it
    // changes. crush: multipliers on config.dozer.crush; strainScale: on how
    // long a big tree holds the blade; noClimbers: the dead can't climb on.
    dozerParts: {
      ram: {
        name: 'Spiked ram (the mineshaft)',
        mount: 'blade',
        crush: { push: 3, pinned: 1.5, ram: 2 },
        color: 0x4a4740,
        spikeColor: 0x8a8578,
      },
      plating: {
        name: 'Armour plating (the railway cutting)',
        mount: 'body',
        noClimbers: true,
        sideTop: 2.1, // metres up the body: waist high on the seat (the eye is at 2.6)
        frontBottom: 1.5,
        frontTop: 1.95, // under the eye's line down to the blade
        color: 0x3b3e38,
      },
      saw: {
        name: 'Head saw (the sawmill)',
        mount: 'blade',
        crush: { push: 6 },
        strainScale: 0.15, // the big trees go in a moment
        spin: 14, // radians a second
        color: 0x9a9a92,
        boomColor: 0x2c2a26,
      },
    },
  },

  // The abandoned campsite (M9.2; encounters/Campsite.js, data/campsite.json).
  // Style pass 2 (Session 19): the weathering every place's props are baked
  // with (render/propKit.js), each place overriding what it likes in its
  // look.weather. grime: the colour's multiplier right at the ground (or
  // floor), easing to none at grimeHeight metres up, tinted toward
  // grimeTint by grimeTintAmount. mottle: a soft noise over everything
  // (noiseScale cells per metre); pieceJitter: each piece lighter or
  // darker by up to this. underside: faces looking down. rust: streaks
  // on the colours a place lists as metal (rustTint, rustAmount how much
  // of the metal, rustScale per metre). maxLuma: the glare rule's ceiling
  // (sRGB luma, 0..1); keepBright lists the colours let past it.
  props: {
    weather: {
      grime: 0.55,
      grimeHeight: 0.8,
      grimeTint: 0x2a2216,
      grimeTintAmount: 0.45,
      mottle: 0.16,
      noiseScale: 1.4,
      pieceJitter: 0.1,
      underside: 0.65,
      rustTint: 0x4a2a16,
      rustAmount: 0.35,
      rustScale: 2.2,
      maxLuma: 0.45,
      rust: [],
      keepBright: [],
    },
  },

  campsite: {
    arriveInset: 0, // metres inside the edge that count as arriving (the sweep plays). Session 15b (Aaron): at the edge (was 4 m in)
    interactRange: 1.9, // metres to a search point
    clipDelay: 2.6, // seconds from Ellen's "play it" to the camcorder's clip
    look: {
      tent: { halfWidth: 1.05, height: 1.3, length: 2.3 },
      dome: { radius: 1.25, height: 1.15 },
      leanto: { width: 2.6, height: 1.45, depth: 2.0 }, // Session 25: the survival camp's tarp lean-tos
      trunkRadius: 0.32,
      // Dull and dark: pale props glare under the torch (Aaron).
      colors: {
        pole: 0x2a2a28,
        slit: 0x0c0b0a,
        stone: 0x3c3a36,
        ash: 0x1c1b1a,
        char: 0x151210,
        frame: 0x3a3c3e,
        cloth: 0x24303c,
        pack: 0x4a3a28,
        packFlap: 0x3a2c1e,
        cooler: 0x6a3428,
        coolerLid: 0x7a7468,
        blood: 0x2a0806,
        twine: 0x3a3428,
        stick: 0x3a2c1e,
        bark: 0x2e241a,
        cut: 0x6a5c44,
        // Session 19 (style pass 2): the dressing.
        guy: 0x2a2822,
        peg: 0x3a3a38,
        tentPole: 0x2e3032,
        scorch: 0x201a14,
        grate: 0x1e1c1a,
        pot: 0x2a2826,
        tin: 0x3a3c3a,
        tinLabel: 0x4a2a22,
        bottle: 0x1e2a1c,
        wood: 0x3a2c1e,
        woodEnd: 0x4a3c2a,
        stump: 0x2e241a,
        axeHead: 0x2a2c2e,
        axeHandle: 0x4a3622,
        table: 0x3a3428,
        stove: 0x2c4a30,
        line: 0x3a3830,
        towel: 0x3a2020,
        shirt: 0x202a36,
        sleepingBag: 0x3a2a40,
        bagLining: 0x2a2420,
        paper: 0x5a564a,
        // Session 25: the survival camp.
        lashPole: 0x3a2e20,
        cord: 0x4a4232,
        bough: 0x24321e,
        boughDark: 0x1a2616,
      },
      // The guy lines' pegs: how far out from a tent's ends and sides (m).
      guyOut: 0.9,
      weather: { grimeHeight: 0.5, rust: [0x3a3c3e, 0x2a2826, 0x3a3c3a, 0x1e1c1a, 0x2a2c2e] },
    },
  },

  // Subtitles (M8): every line is subtitled, never voiced. A dark strip at
  // the bottom centre, the speaker's name above. The text types on with
  // blips, then holds for a readable time, or advances on a button
  // (interact, while talking face to face).
  subtitles: {
    lettersPerSecond: 45,
    holdBase: 1.4, // seconds after the line has typed on...
    holdPerWord: 0.28, // ...plus this per word
    holdMax: 7,
    gapSeconds: 0.25, // between queued lines
    maxQueue: 6, // older queued lines are dropped past this (never the one showing)
  },

  // The radio (M8): calls play as subtitles with a crackle; you keep full
  // control. Rate limited: calls of one kind at least kindGap apart, and
  // any two calls at least minGap apart. An urgent call cuts the queue.
  radio: {
    minGap: 4, // seconds between any two calls
    kindGap: 10, // seconds between calls of the same kind (was nights.resolver.radioGap)
    queueSeconds: 20, // a one-off call that has to wait gives up after this
  },

  // Cutscenes (M8; DESIGN.md "Cutscenes"): src/data/cutscenes.json. The
  // camera looks are config.postFX.looks.
  cutscenes: {
    fov: 60, // a cutscene camera's field of view unless a key sets one
    skipAfter: 0.5, // seconds before A / Enter can skip (so a held button doesn't)
    lineGrace: 6, // seconds a cutscene waits past its end for its lines to finish
    dateText: 'OCT 2003', // the date on the camera feeds (#151: 2003)
    // Session 19 (style pass 2): the sweeps' grade eases in and out over this many seconds; a reveal's jolt
    // fades over `seconds`, its camera shaken this hard for `shakeSeconds` (cutscenes.json "jolt": true).
    treatments: { sweepEase: 1.4, jolt: { seconds: 0.9, shake: 0.8, shakeSeconds: 0.35 } },
    // Session 19: the on-screen display per look: a trail cam's strip (the moon's glyph, degrees F by day,
    // and how much colder at night); a camcorder's stamp (its date, the tape's speed, the counter's start).
    osd: {
      trailcam: { moon: '◐', tempDay: 49, tempNight: -8 },
      camcorder: { date: 'OCT.13.2003', speed: 'SP', counterStart: 2417 },
    },
    // The camera's own light (a trail cam's infrared lamp, a camcorder's
    // lamp), on the actors only: they glow this fraction of their own
    // colour, by look, so a clip at night shows them. A cutscene's "light"
    // overrides it. (A real light would recompile every shader as it came
    // and went: a stutter on the tablet.)
    actorLight: { trailcam: 0.3, camcorder: 0.35, cctv: 0.3, military: 0.3, government: 0.3, scope: 0.2, default: 0.1 },
    actorLightGrey: 0.18, // and this x the same in grey
    // Session 13: the real models in cutscenes.
    zombieCap: 16, // most zombies one cutscene shows
    zombieWalkSpeed: 1.1, // metres per second their walk cycle plays at
    zombieLampScale: 1, // the camera's lamp on a zombie sprite, x actorLight
    witchGlideSpeed: 3, // m/s her rags stream at while she moves
    // Box stand-ins: a figure with no real model yet (Session 13: only the
    // camper) is drawn as one of these. Metres, colours.
    figures: {
      witch: { height: 2.15, width: 0.5, legs: 0x1a1612, body: 0x2a221a, head: 0xb8b0a0, antlers: true, eyes: 0xd8ffd0 },
      mib: { height: 1.85, width: 0.55, legs: 0x101014, body: 0x15151a, head: 0xc8a890 },
      camper: { height: 1.75, width: 0.52, legs: 0x3a4a6a, body: 0xa04a2a, head: 0xc8a890 },
      zombie: { height: 1.7, width: 0.52, legs: 0x3a3a30, body: 0x5a6a48, head: 0x8a9a78 },
      ellen: { height: 1.7, width: 0.5, legs: 0x22252a, body: 0x5a6a7a, head: 0x8a6a58 },
      wyatt: { height: 1.62, width: 0.48, legs: 0x22252a, body: 0x6a5a48, head: 0x8a6a58 },
      junie: { height: 1.2, width: 0.4, legs: 0x22252a, body: 0x7a5a6a, head: 0x8a6a58 },
    },
  },

  // The family's figures (Session 13, #148; render/FamilyRenderer.js,
  // render/familyLooks.js): Appalachia, 2003. Natural colours, darkened by
  // albedo (the torch blows out anything light).
  family: {
    albedo: 0.62,
    poseRate: 8, // how fast they blend into a new pose (per second)
    walkRate: 7, // radians of stride per second (cutscenes)
    thermalGlow: 1, // x the heat scope's glow
    // Their heads turn to you when you're this near (metres), up to these angles (radians).
    look: { range: 5, maxYaw: 1.1, maxPitch: 0.4, rate: 4 },
    people: {
      ellen: {
        height: 1.68,
        head: 1.08, // a touch big (stylised)
        idle: 'folded',
        colours: { skin: 0xc89a7c, top: 0x5a6238, sleeve: 0x5a6238, forearm: 0x5a6238, zip: 0x2a2e1a, under: 0x7a7a76, trousers: 0x262c3a, shoes: 0x4a3422, hair: 0x5a2a18, tie: 0x2a2424, eyes: 0x1a1410, brows: 0x3a1c10, frames: 0x2a2a2a },
      },
      wyatt: {
        height: 1.62,
        width: 0.94, // lanky
        head: 1.08,
        idle: 'pockets',
        colours: { skin: 0xc8a084, top: 0x7a1e1a, sleeve: 0x7a1e1a, forearm: 0x7a1e1a, tee: 0x1c1c20, print: 0x8a8a7a, trousers: 0x34405a, shoes: 0x5e5e5a, hair: 0x3e2818, eyes: 0x1a1410, brows: 0x2a1a10 },
      },
      junie: {
        height: 1.25,
        width: 0.95,
        head: 1.32, // a child's head, big for her height
        idle: 'hug',
        colours: { skin: 0xd0a88c, top: 0x5e4a72, sleeve: 0x5e4a72, forearm: 0x5e4a72, trousers: 0x2a2a34, shoes: 0x7a5a6a, hair: 0x7a5434, tie: 0xa04a5a, rabbit: 0x9a9080, eyes: 0x141010, brows: 0x5a3a24 },
      },
    },
  },

  // Aliens (Session 13: the model; their AI is M10 and M11).
  aliens: {
    // The grey (render/alienModel.js, render/AlienRenderer.js): the crashed
    // plane's survivor; every Martian's body.
    grey: {
      height: 1.4,
      poolSize: 8, // most drawn at once
      albedo: 0.3, // its colours x this: a compromise (the torch blows it white up close; much lower and it's black by day)
      poseRate: 10, // how fast it blends into a new pose (per second)
      walkRate: 8, // radians of stride per metre walked
      ambushSeconds: 1.2, // coiled, springing up, landing
      recoilDecay: 9, // how fast the shotgun's kick settles (per second)
      deathSeconds: 1.4,
      hitFlashSeconds: 0.15,
      hitFlash: [1.8, 0.7, 1.6], // its colour while flashing (a purplish tinge: not blood red)
      thermalGlow: 0.25, // x the heat scope's glow: faint and cold, not from here (proposed)
      colours: {
        skin: 0x8a9496,
        back: 0x5a6468,
        eyes: 0x050608,
        shine: 0xd8e0e0,
        slit: 0x2a3032,
        gunMetal: 0x2a2c30,
        gunWood: 0x4a3020,
        // The cowboy kit.
        hat: 0x5a4028,
        hatBand: 0x2a1a10,
        bandana: 0x8a1c18,
        leather: 0x4a2c18,
        buckle: 0x9a9890,
        trousers: 0x3e3a34, // Session 25: dusty, worn (the belt stage on)
        vest: 0x3a2418,
        boots: 0x3a2214,
        spur: 0x8a8a84,
      },
    },
  },

  // Bigfoot (Session 24: the model; render/bigfootModel.js on
  // render/PosedFigure.js). Friendly; he can't be harmed. His cave's story is M12.
  bigfoot: {
    height: 2.6,
    width: 1.12, // broad for his height
    albedo: 0.36, // the torch is strong up close
    poseRate: 6, // he moves slowly
    eyeGlint: 0.25, // a little warmth in his eyes, so they read in the dark of the cave
    thermalGlow: 1, // warm: he's of this world
    colours: {
      hair: 0x30221a, // dark red-brown
      hairDark: 0x1e1610,
      skin: 0x2a211c, // his face, palms and soles
      mouth: 0x1c1412,
      eyes: 0x6a4420,
      bone: 0x6e6652, // his beads: bone, river stone, red seed
      stone: 0x2e5650,
      seed: 0x6a2a1c,
      weave: 0x5a4a2a,
    },
    // The silk cocoon the Mothman keeps him in.
    cocoon: {
      height: 3.0,
      radius: 0.95,
      albedo: 0.28,
      colours: { silk: 0x56534b, silkDark: 0x2a2824, rope: 0x4e4b44 }, // grey silk (dull: the glare rule)
    },
  },

  // Milo (Session 24: the model; render/miloModel.js on
  // render/PosedFigure.js). He never attacks Tom and can't be hurt. His barn
  // is Session 28's.
  milo: {
    height: 1.45, // Aaron (after Session 26): about a foot shorter ("it's funnier if he's short"); 1.75 was (Session 25), 1.9 before that
    manHeight: 1.75, // the man the morning after (Aaron: he stays 1.75 m, a head taller than the clown: "it'll be funnier, trust me")
    widths: { clown: 0.94, man: 1.02 }, // the story: broad-shouldered as the man; in full kit his frame seems to narrow and his arms to lengthen
    clown: { top: 1, shoe: 0.2 }, // Session 26: the baggy suit is built in (render/miloModel.js clownBody); top widens the smock; the shoes about twice as long
    eyeGlow: 1.3, // Session 26: how strongly his eyes glow in their own colour (seen in the dark; no light added)
    albedo: 0.3, // the torch is strong up close (Session 26: the baggier white suit catches more of it: 0.34 was)
    poseRate: 14, // quick
    throwSeconds: 0.9, // the wind-up, the throw and its follow-through (for the viewer's loop)
    looks: {
      // The Lone Clown's Milo (Aaron's story). All dull enough for the torch (the glare rule).
      clown: {
        skin: 0x6a4e40,
        face: 0x706c64, // white greasepaint
        grin: 0x7a1c14, // Session 25: a small red mouth
        eyes: 0x6a5a22, // Session 26: a dull yellow that glows faintly of its own (eyeGlow): a little supernatural
        socket: 0x161214, // Session 26: the dark diamonds painted through his eyes
        wig: 0x2e7a2a, // Session 26: wild clown hair, green, bursting from the sides of a bald crown
        ruffle: 0x7a1c14, // Session 26: the ruff's, the cuffs' and the peplum's pleats, red...
        ruffle2: 0x62605a, // ...and off-white
        pom: 0x7a1c14, // the pom-poms down his front and on his toes
        shirt: 0x62605a, // Session 26: a shade duller (the bigger suit caught the torch). Session 25 (Aaron, seeing the reference): the white suit with dots; a grey-white (an off-white read as bare skin under the torch)...
        trousers: 0x62605a,
        dot: 0x7a1c14, // ...and its dots, red and blue, sparse
        dot2: 0x24405a,
        collar: 0x7a1c14, // the red collar
        shoes: 0x5e1c16,
        gloves: 0x6c6860, // white gloves
        leather: 0x2e2218,
        steel: 0x5e6062,
      },
      man: { skin: 0x6a4e40, face: 0x6a4e40, eyes: 0x14100e, hair: 0x16130f, shirt: 0x5e1e18, check: 0x1a1816, trousers: 0x2a3446, shoes: 0x3a2a1c, leather: 0x1c140e, tin: 0x5a5c5c, coffee: 0x1a120c }, // Session 26: the belt darker than the boots, so it reads against the jeans
    },
  },

  // Milo's barn (Session 28's optional encounter, built after Session 26 on
  // Aaron's ask; DESIGN.md "Milo's barn"; the story: The Lone Clown).
  // The set: render/miloBarnModel.js, world/MiloBarnSite.js; the beat:
  // encounters/MiloBarn.js. Layout in the barn's frame (metres: x to your
  // right as you walk in up the lane, z ahead; the clearing's middle at 0, 0).
  milosBarn: {
    barn: { z: 7, halfW: 5.2, depth: 12, wallH: 3.6, ridge: 3.4 }, // centre z, half width, depth (z), the walls' height, the gambrel roof's rise
    gate: { z: -10.5, carLength: 4.5, gap: 0.12, openAngle: 1.42, seconds: 1.4 }, // the two cars nose to nose across the lane, the fence's gate; each swings about its back end
    fence: { x: 0, z: 2, rx: 11, rz: 12.5, posts: 34 }, // a split-rail fence round the yard (an oval), the cars its gate: fits the smallest clearing (16 m)
    board: { z: 12.4, width: 2.6, height: 2.5 }, // the knife board against the back wall (its face's z)
    mark: { z: 11.6 }, // where Tom stands for the act (on the platform)
    throwFrom: { z: 2.6 }, // twelve paces back (9 m): where Milo throws from, just inside the doors
    van: { x: 7.6, z: -2.5, yaw: 165 },
    sign: { x: -4.6, z: -12.5, yaw: 25 },
    signText: { title: 'SHOW TONIGHT', lines: ['ALL WELCOME', 'NO FLINCHING'] },
    rows: { x: -7.6, z: -6.5, count: 4, perRow: 5 }, // the dead he's laid out, in neat rows (the yard's left)
    animals: { donkey: [-3.7, 4.6, 90], pony: [-3.7, 8.6, 90], turkey: [2.8, 9.8, -120], python: [3.9, 5.4, -90] }, // [x, z, yaw degrees] in the frame; the donkey's and pony's stalls on the left
    tank: { x: 3.9, z: 5.4 }, // the python's glass tank on its table, the heat lamp's amber glow over it
    encounter: {
      siegeDistance: 48, // metres from the barn: the dead round it, and Milo at them with his knives (once a visit)
      siege: { count: 9, ring: [9, 17] }, // how many, and how far round the barn they stand
      throwEvery: [1.3, 2.0], // seconds between his knives at the dead
      throwReach: 24, // metres: the dead he'll throw at
      knifeSpeed: 26, // metres a second
      gatesDistance: 8, // metres from the cars: the gates scene (once the dead are down)
      throwSeconds: 0.62, // his wind-up, to the knife leaving his hand
      act: { first: 2.2, between: 2.6, flinchMove: 0.3, landAt: [[-0.42, 1.38], [0.42, 1.38], [0, 1.98]] }, // seconds to the first knife and between; metres Tom may drift; where they land (x, height): right shoulder, left shoulder, over the head
      deflectSeconds: 4.5, // "I was in character!", then out
      chatterEvery: [14, 26], // seconds between his chatter while Tom's near
      donkeyFrom: 40, // metres: after the act, by day, the donkey stares from the station's treeline until Tom comes this near
    },
    look: {
      weather: { rust: [0x3a2a20], grimeHeight: 0.5, keepBright: [] },
      colors: {
        plank: 0x5a3426, // barn red, faded
        plankDark: 0x44271e,
        trim: 0x5e5a50, // the white trim, gone grey
        roof: 0x3a3a38, // tin, dull
        roofRust: 0x4a3426,
        beam: 0x3e3024,
        straw: 0x6a5e3a, // clean straw
        hay: 0x5e5634,
        floor: 0x3a3226,
        board: 0x5e4e38, // the knife board (lighter than the walls, so its holes and the knives show)
        hole: 0x0e0c0a, // its knife holes
        boardLit: 0x4e3c28, // the board and the stage as the lanterns light them (drawn unlit: these are their final colours)
        boardLit2: 0x44341f,
        stageLit: 0x3a3022,
        stall: 0x4a3a28,
        trough: 0x3e3832,
        water: 0x1e2a2c,
        table: 0x3a2c1e,
        glass: 0x283234,
        branch: 0x3a2e22,
        blanket: 0x4a2228,
        chest: 0x3e2c1c,
        van: 0x62605c, // his white van, dull
        vanDark: 0x2a2a2a,
        crucifix: 0x4a3a26,
        carA: 0x3a4a5a, // the two cars across the lane
        carB: 0x5a4a32,
        carDark: 0x1a1a1a,
        rust: 0x4a3020,
        tyre: 0x161616,
        glassCar: 0x1c2428,
        corpse: 0x4a4436, // the dead, tidied
        corpseDark: 0x2e2a22,
        cloth: 0x3a3a40,
        broom: 0x5a4a30,
        sign: 0x6a5e44,
        signInk: 0x3a1410,
        lampGlow: 0x8a5a1c, // the heat lamp's amber (unlit: a glow, no light added)
      },
    },
  },

  // The animals in Milo's barn (Session 24: the models; render/barnAnimals.js).
  // Harmless. The donkey stares.
  barnAnimals: {
    albedo: 0.32,
    poseRate: 6,
    donkey: { colours: { coat: 0x414245, belly: 0x56565a, muzzle: 0x66666a, leg: 0x2e2e31, hoof: 0x161412, mane: 0x1e1a16, eyes: 0x0c0a08, eyeRing: 0x66666a, earIn: 0x26262a } },
    pony: { colours: { coat: 0x5e3414, belly: 0x4e2c14, muzzle: 0x2a1e18, leg: 0x2e2018, hoof: 0x161412, mane: 0x564c38, eyes: 0x0c0a08, eyeRing: 0x2a1e18, earIn: 0x1e1612 } },
    turkey: { colours: { feather: 0x241c16, breast: 0x1c1612, wing: 0x33291e, dark: 0x100e0c, sheen: 0x5a3e1e, fan: 0x33241a, fanTip: 0x4e4638, bald: 0x3a4a5a, wattle: 0x6e1e18, beak: 0x66583a, shank: 0x5a4a3e, eyes: 0x0c0a08 } },
    python: { colours: { scales: 0x4a4028, saddle: 0x241c12, belly: 0x66603e, eyes: 0x0c0a08, tongue: 0x3a1210 } },
  },

  // Giant moths (Session 24: the model; render/mothModel.js,
  // render/MothRenderer.js): dog sized, in swarms (Aaron). One draw call for
  // the lot. Their behaviour is still to design (the mineshaft, the cave).
  moths: {
    giant: {
      poolSize: 32, // most drawn at once (Aaron: a swarm is 16 to 32)
      scale: 1, // the model's about 0.8 m long, 1.7 m across the wings
      albedo: 0.3, // the torch is strong up close
      eyeGlow: 2.2,
      flapHz: 3.4, // the wingbeat when nothing drives it
      foldRate: 5, // how fast the wings fold and open (per second)
      deathSeconds: 1.4,
      hitFlashSeconds: 0.12,
      hitFlash: [1.6, 0.7, 0.5],
      thermalGlow: 0.25,
      // The Mothman's colours, a little paler (the glare rule holds).
      colours: { fur: 0x201d1b, furDark: 0x131211, ruff: 0x2c2723, belly: 0x26211e, wing: 0x242120, dust: 0x3c362f, spot: 0x3c170f, claw: 0x0b0b0c, eyes: 0xff0a04 },
    },
  },

  // The crashed plane's set (Session 24; render/crashedPlaneModel.js,
  // world/CrashSite.js). Only the set: its encounter is Session 25's.
  crashedPlane: {
    yaw: null, // radians the plane was heading (null: away from the checkpoint, so Tom walks up its gouge)
    radius: 28, // metres from its middle the set reaches (for drawing it)
    // Session 25: its story beats (encounters/CrashedPlane.js; DESIGN.md "Crashed plane", "The Mothman at
    // the crash site"). Straight from the design: every number a first guess, to tune after Aaron plays it.
    encounter: {
      needs: 'outpostCleared', // the outpost's barricade down (the dogfight brought the plane down)
      triggerDistance: 16, // metres from the grey as Tom comes up the gouge: the standoff (close enough for a quick draw)
      drawDistance: 120, // the grey's drawn within this
      standoff: { turnAt: 1.3, aimAt: 2.3 }, // seconds into the standoff: it turns; it lifts its gun
      quickDraw: 0.55, // seconds after control comes back: one good hit drops it
      greyHealth: 70, // after the quick draw: a service rifle round is 25 (x3 on the head)
      hit: { hitRadius: 0.3, height: 1.4, headBottom: 1.06, headRadius: 0.22, headshotMultiplier: 3 }, // a little generous: it's small
      scrambleSeconds: 0.9, // its hop over the wing into cover
      scrambleHeight: 1.5,
      shootout: { hideSeconds: [1.4, 2.6], stepSeconds: 0.45, aimSeconds: 0.6, afterShot: 0.35, peekOut: 3.8, hitChance: 0.4, damage: 9, range: 45 },
      interactRange: 1.8,
      drops: { pistolRounds: 12, alienShells: 6 },
      flareAfter: 10, // seconds after its drops are taken, Wyatt suggests the signal flare
      floor: 0.1, // the Mothman's fight: Tom can't drop below 10% health; reaching it, he blacks out
      mothmanScript: ['flyover', 'flyover', 'dive', 'dive', 'dive', 'dive', 'dive', 'dive', 'dive', 'dive', 'dive', 'dive', 'dive', 'dive'],
    },
    look: {
      weather: { rust: [0x24262a], grimeHeight: 0.5, keepBright: [] },
      colors: {
        body: 0x4a5052, // the plane's grey paint
        bodyDark: 0x33383a,
        frame: 0x34383a, // bare frames and spars
        hollow: 0x0c0c0d, // inside the hull, the cockpit's tub
        scorch: 0x151413,
        prop: 0x1c1c1c,
        gunmetal: 0x24262a,
        steel: 0x4a4c4e,
        brass: 0x8a6c28,
        canvas: 0x5e5846, // the cloth the gun's laid out on
        glass: 0x1c2a30,
        marking: 0x6a6c68, // the star, faded
        markingDark: 0x1c2638,
        seat: 0x26241f,
        flightSuit: 0x3a4030,
        helmet: 0x4a4c44,
        strap: 0x5a5444,
        rubber: 0x141414,
        kit: 0x7a3410, // the survival kit's orange, dulled
        flare: 0x7a1c14,
        paper: 0x6a6658,
        earth: 0x54432f, // turned earth (the grime darkens it at the ground)
        earthDark: 0x3e3022,
        bark: 0x3e3024,
        heartwood: 0x6a5434, // fresh-split wood
        needles: 0x1a2a1a,
      },
    },
  },

  // Session 26: Junie is taken (story spine, beat 3; DESIGN.md "Junie is taken";
  // encounters/JunieTaken.js). The night Tom lost at the crashed plane, the
  // Caller spoke on the family's radio in Tom's voice; they went out after him
  // and Junie didn't come back. Every number a first guess, to tune after play.
  junieTaken: {
    needs: 'planeDone', // the Mothman at the crash site is over (either ending)
    accountDelay: 5, // seconds of play after the wake before Ellen gets through
    homeRange: 75, // metres from home's centre: with the radio smashed, the family's account waits until Tom's this near (they see him from the tower)
    clipFrom: 7, // metres past the fence, toward the crashed plane: where the south path camera stands (at the clearing's edge, looking out to the trees)
    rabbit: { y: 0.56, offsetX: -0.3, color: 0x9a9080, eyes: 0x141010 }, // Junie's rabbit, left on the bottom bunk (metres above the floor; along the bunk from its middle); her rabbit's colours
    holdRange: 1.6, // metres: hold X at the rabbit
  },

  // Session 26: the radio's reach (story/Comms.js; DESIGN.md "The radio",
  // "Comms in the south"). The family reach Tom unless his radio's smashed
  // (the drive-off at the plane, until he's home), or he's south of the
  // comms line (Session 26 batch 2: there every voice is the Caller's).
  comms: {
    family: ['ellen', 'wyatt', 'junie'], // the speakers who can't get through when the radio can't reach
    // The comms line: a world z (metres south of home's centre) about halfway from the crashed plane to the old
    // church. Hysteresis: cut south of z + band, back north of z - band, so a step either way can't flicker it.
    line: { dz: 480, band: 14 },
    warnBefore: 45, // metres north of the line: Ellen's warning, once
    until: 'blessingBuried', // a later session's flag: once it's set, the family reach Tom anywhere
    hud: { deadText: 'RADIO DEAD', southText: 'NO SIGNAL' },
  },

  // Session 26: the Caller (DESIGN.md "The Caller", "Comms in the south";
  // story/Caller.js). Never seen: a voice, and fog that moves wrong. South
  // of the comms line, with the family cut off, it speaks in their voices:
  // over the radio (begging, lying) and from the trees (calling Tom by name,
  // positional, with which way under the line). Every number a first guess.
  caller: {
    needs: 'junieTaken', // it has her voice now
    firstAfter: [9, 16], // seconds south of the line before the first call
    every: { day: [50, 85], dusk: [36, 60], night: [26, 46], dawn: [40, 70] }, // seconds between calls, by phase (more at night)
    positionalShare: { day: 0.35, dusk: 0.5, night: 0.6, dawn: 0.45 }, // of its calls, those from the trees (the rest over the radio)
    distance: [26, 44], // metres from Tom a voice in the trees comes from
    behindBias: 0.6, // chance a voice comes from behind him (else anywhere round)
    voiceRange: 120, // metres the voice carries (the sound)
    voices: { junie: 1.6, ellen: 1.22, wyatt: 1.04, tom: 0.84 }, // the callerVoice sound's pitch for whose voice it wears
    avoidRepeat: 9, // the last this many lines aren't picked again
    backCooldown: 150, // seconds: the family's "we've got you again" isn't said more often than this
    // The fog that moves wrong round a call from the trees (render/GroundMist.js pull):
    // first the mist near Tom streams toward the voice, against the wind (inhale); then
    // a bank rolls from it toward him (exhale). Seconds for each, and how strongly.
    // gather: the share of the mist's puffs that move (faded) to within `spread` metres of the voice as it starts;
    // bank: how much thicker they are round it while it calls; reverse: how hard the low mist's flow runs backward.
    fog: { inhale: 1.6, hold: 3.6, exhale: 4.5, fade: 2.2, radius: 34, speed: 2.6, amount: 0.95, reverse: 2.4, gather: 0.5, spread: 9, bank: 1.4 },
  },

  // Session 26: the old church and the time capsule (story spine, beat 4;
  // DESIGN.md "Time capsule and the old church"). The set: render/oldChurchModel.js,
  // world/OldChurchSite.js; the beat: encounters/OldChurch.js.
  oldChurch: {
    radius: 26, // metres from its middle the set reaches (for drawing it)
    encounter: {
      needs: 'junieClipSeen', // the clip's been watched: Find Junie. Head south
      sweepDistance: 34, // metres from the church's middle: the arrival sweep (once)
      visitDistance: 20, // metres: churchVisited
      insideCall: { distance: 36, after: 3 }, // within this of the church, this many seconds after the sweep: the Caller calls from inside it
      bellAfter: 1.4, // seconds after that call: the cracked bell sounds once, as if brushed
      interactRange: 1.7,
      digSeconds: 4.5, // the capsule's dig (hold X with the shovel)
      stairsReveal: 30, // metres of the map revealed round the stairs once the account is read
    },
    look: {
      weather: { rust: [0x26241f], grimeHeight: 0.6, keepBright: [] },
      colors: {
        clap: 0x6a675c, // clapboard, its whitewash long gone grey
        clapDark: 0x524f46,
        trim: 0x3e3a32,
        boards: 0x4c4234, // the planks nailed over the windows (newer than the walls)
        boardsDark: 0x3a3228,
        shingle: 0x2e2c28,
        shingleDark: 0x242220,
        rafter: 0x3a3026,
        hollow: 0x0d0c0b, // the dark inside
        glass: 0x1e262a,
        floor: 0x2c251c,
        floorDark: 0x241e17,
        pew: 0x3c2e20,
        pewDark: 0x2e2318,
        stone: 0x5a5a54,
        stoneDark: 0x46463f,
        stoneNew: 0x606058, // the eleven, cut the same winter
        granite: 0x55524c,
        moss: 0x34402a,
        bronze: 0x3e4c3c, // the plaque, gone to verdigris
        bronzeDark: 0x283026,
        bell: 0x4c3e26,
        iron: 0x26241f,
        flag: 0x4a4842,
        bark: 0x3a2e24,
        earth: 0x3e3022,
        capsule: 0x4a5a48, // copper, green with a century underground
        capsuleDark: 0x2e3a2e,
      },
    },
  },

  // Session 27: the railway cutting (an optional encounter; DESIGN.md "The railway cutting:
  // the 1903 line"). The set: render/railwayCuttingModel.js, world/RailwayCuttingSite.js; the
  // ground's banks: world/railCutting.js (config.map.railway.cutting). The last train out of
  // Hemlock Gap, October 13, 1903, stopped in the cut and left there: the engine (its cowcatcher
  // and boiler plate: the killdozer's armour), the tender, two coaches and the baggage car off the
  // rails, the belongings of a town still aboard; the powder store up the bank.
  // Session 28: the chainsaw (DESIGN.md "Weapons"; combat/Chainsaw.js, combat/chainsawState.js; found
  // at the sawmill). No fuel. Hold RT: it spins up (spinUp), then cuts whatever's in front of it
  // every `tick` seconds for as long as it's held. Four things balance it (Aaron, Nov 8):
  //  - noise: revving, every zombie within `noise.rev` metres hears it, again and again (idling
  //    in hand it only putters: `noise.idle`);
  //  - it slows Tom while it revs (move), and more in a cut (cutMove);
  //  - heat: it climbs while the trigger's held (faster in a cut) and falls when it isn't. At 1 it
  //    stalls and won't start again until it's cooled to `restartAt`;
  //  - the chain dulls with cutting (wear). Dull, it cuts at `dullDamage` of its damage and
  //    staggers less; it's sharpened at the station's workbench for scrap (config.station.workbench).
  chainsaw: {
    spinUp: 0.45, // seconds from the trigger to the chain biting
    spinDown: 0.7,
    tick: 0.1, // seconds between bites
    damagePerSecond: 170, // at a sharp chain: a level 1 citizen (60) in about a third of a second
    dullDamage: 0.35, // the share of that with the chain worn right down
    reach: 2.0, // metres from the eye
    arcDegrees: 46,
    cleave: 2, // how many it can be in at once
    stagger: 0.3, // each bite holds them (the dull chain: x dullStagger)
    dullStagger: 0.35,
    knockback: 0.04,
    kickback: 0.12, // degrees the bar kicks up on each bite
    shake: 0.05, // the camera, per bite
    move: 0.6, // Tom's speed while it revs
    cutMove: 0.42, // and while it's in something
    heat: { rev: 0.11, cut: 0.19, cool: 0.2, coolInHand: 0.12, restartAt: 0.4, warnAt: 0.75 }, // per second: about 9 s of revving, 5 s of solid cutting
    wear: { cut: 0.02, foundAt: 0.55, warnAt: 0.25 }, // per second in a cut: about 50 s of cutting from sharp to dull; how sharp it's found (it's been in a man)
    noise: { rev: 55, idle: 10, every: 0.6 }, // metres; how often the revving's heard
    smoke: { every: 0.12 }, // seconds between puffs while it's stalled hot
  },
  // Session 28: the sawmill (an optional encounter; DESIGN.md "The sawmill"; the set:
  // render/sawmillModel.js, world/SawmillSite.js; the beat: encounters/Sawmill.js). Harlan Stover's
  // mill (a draft name): the crew the government hired to clear ground for the portal programme,
  // paid off on their last payday by the Men in Black. The layout's measurements are in the model
  // (SAWMILL); the colours are here.
  sawmill: {
    radius: 30, // metres from its middle the set reaches (for drawing it)
    encounter: {
      sweepDistance: 31, // metres from the middle: the arrival sweep (once)
      interactRange: 1.7,
      holds: { search: 1.0, boot: 1.1, agent: 1.3, handset: 0.7, case: 0.9, bunks: 1.1, tarps: 0.8, pit: 0.9, pinned: 1.4, desk: 1.0, bench: 0.8, engine: 0.9, chainsaw: 2.4, headSaw: 3.4 }, // seconds held (X)
      smgRounds: 45, // with the SMG, off the last agent: a magazine and a half
      pinned: { pistol: 12, armour: 40 }, // the agent under the logs: rounds, and his vest (ballistic)
      agentRounds: 9, // the last agent's spare magazine
      // Sounds while Tom's near: the loose tin on the shed's roof in the wind; flies at the tarps and the pit.
      tinEvery: [7, 18],
      tinDistance: 45,
      fliesEvery: 2.6,
      fliesDistance: 7,
      radioDistance: 6, // metres from the last agent's sedan: its radio, once
      // The dead get up (Aaron's default, Session 28): the first time the chainsaw revs at the mill (its noise
      // is what wakes them), or the head saw's knocked off its arbor, or if dark falls with Tom in the yard.
      riseAfter: 1.6, // seconds from that to the first tarp moving
      riseGap: [0.5, 1.1], // seconds between one of a wave getting up and the next
      revWithin: 40, // metres from the mill's middle: a rev this close counts
      // The waves: which of the laid-out dead (their kind, their groups in the set) get up, when the next
      // comes (seconds after the last, or as soon as this few are still up), and any more that walk in
      // out of the trees (the agents who ran, and died out there).
      waves: [
        { kind: 'logger', groups: ['tarps'], after: 0 },
        { kind: 'logger', groups: ['yard', 'mill'], after: 10, left: 1 },
        { kind: 'mib', groups: ['yard', 'mill', 'pit'], after: 11, left: 2, trees: { count: 4, variant: 'mib', ring: [26, 31] } },
      ],
      clangEvery: 0.7, // the head saw's collar nut: a blow this often while X is held
    },
    look: {
      weather: { rust: [0x34302a, 0x2a2622, 0x3a3630, 0x2c2a28], grimeHeight: 0.16, keepBright: [] }, // low: the dead lie on the ground, and grime would black them out
      colors: {
        post: 0x3e3428, // the shed's timbers
        postDark: 0x2e261e,
        plank: 0x4a4234, // sawn boards, weathered
        plankDark: 0x383024,
        plankNew: 0x6a5c40, // fresh-sawn lumber (the stacks, the cut face of the log)
        plankNewDark: 0x564a34,
        tin: 0x3a3630, // the roof's corrugated iron
        tinDark: 0x2c2a28,
        bark: 0x2e2820,
        barkDark: 0x241f19,
        endGrain: 0x5e5038, // a log's cut end
        sawdust: 0x6a5a3c,
        sawdustDark: 0x54462e,
        iron: 0x34302a, // the head rig, the carriage, the rails
        ironDark: 0x2a2622,
        blade: 0x5a5c5c, // the head saw's plate
        bladeDark: 0x3e4040,
        belt: 0x1c1a18,
        engine: 0x2e3a30, // the power unit's faded green
        clap: 0x5c574a, // the bunkhouse's boards
        clapDark: 0x3a362e,
        trim: 0x2e2a24,
        hollow: 0x0d0c0b, // the dark inside a window, the pit
        glass: 0x1e262a,
        floor: 0x2c251c,
        blanket: 0x3a3e34, // army-surplus bunk blankets
        blanketDark: 0x2c3028,
        mattress: 0x56524a,
        stove: 0x1c1b1a,
        tarp: 0x2a3440, // the blue tarps, gone dull
        tarpDark: 0x1e2630,
        lime: 0x6a6a62, // the bags of quicklime
        dirt: 0x30281e,
        dirtDark: 0x221c15,
        blood: 0x2a0e0c, // dried
        bloodDark: 0x1c0a09,
        brass: 0x6a5a2a, // spent cases
        paper: 0x6a665a,
        car: 0x1e1e23, // the agents' sedans
        carDark: 0x121215,
        carGlass: 0x2a323a,
        chrome: 0x4a4c4c,
        tyre: 0x0c0c0c,
        case: 0x1a1612, // the payroll case
        caseFoam: 0x2a2a2c,
        // The dead. Loggers in flannel and work trousers; the agents in their suits.
        skin: 0x5c5a4c,
        skinDark: 0x4a4a40,
        flannelRed: 0x4a1a16,
        flannelGreen: 0x26321e,
        flannelMustard: 0x4a3a14,
        denim: 0x1c2638,
        workBrown: 0x2e2418,
        boot: 0x1a1410,
        hair: 0x1e140c,
        hairGrey: 0x4a4a46,
        hardHat: 0x5a4a14, // dull yellow
        suit: 0x1c1c22,
        shirt: 0x6a665c,
        tie: 0x08080a,
        shoe: 0x0e0e0e,
        saw: 0x6a2c12, // the chainsaw's faded orange body
        sawDark: 0x1c1a18,
        sawBar: 0x4a4c4c,
        axe: 0x3a3a3a,
        handle: 0x4a3a24,
      },
    },
  },
  // Session 29: the moonshiners' holler (an optional encounter; DESIGN.md "Moonshiners' holler"; the
  // hollow's ground: world/hollerGround.js (config.map.holler); the set: render/hollerModel.js,
  // world/HollerSite.js). The Rigsbys' still (a draft name) up a narrow hollow the family trapped
  // against the law when the lights came over the government land. The layout's measurements are in
  // the model (HOLLER); the traps' layout and the colours are here.
  holler: {
    radius: 32, // metres from its middle the set reaches (for drawing it)
    // The traps up the floor (model z from the mouth at -28 to the head at 21; dx: off the floor's
    // middle, + the walker's left). shotgun: a gun on a stump at the floor's side (side: +1 left, -1
    // right), set `back` metres up the hollow, aimed at the line's middle; cans: tin cans on a wire
    // across the floor (span: its half length, else the floor's); bear: under leaves piled too
    // neatly; snare: a sapling (on `side`) bent over a noose. mapped: false (two of them): not on the
    // family's trap map (it's out of date). sprung: already gone off (the first, and the man it got).
    traps: [
      { id: 'mouthGun', kind: 'shotgun', z: -24, side: 1, back: 2.2, sprung: true },
      { id: 'bear1', kind: 'bear', z: -19, dx: 1.2 },
      { id: 'cans1', kind: 'cans', z: -14.5, skew: 0.3 },
      { id: 'snare1', kind: 'snare', z: -10, dx: -1.4, side: -1 },
      { id: 'gun2', kind: 'shotgun', z: -1, side: 1, back: 2.4 },
      { id: 'bear2', kind: 'bear', z: 2.5, dx: -1.6, mapped: false },
      { id: 'cans2', kind: 'cans', z: 6.5, span: 5.5 },
      { id: 'snare2', kind: 'snare', z: 9, dx: 3, side: 1, mapped: false },
      { id: 'bear3', kind: 'bear', z: 10.5, dx: -5 },
    ],
    // How the traps go off and come apart (combat/hollerTraps.js). reach: metres from a trap (a line's
    // nearest point) that X works it; hintDistance: the first time Tom's this near each kind, a line on
    // it; holds: seconds held (X) to disarm each kind, and to work free of a bear trap or a snare.
    trapRules: {
      reach: 1.5,
      hintDistance: 4.5,
      holds: { disarm: { shotgun: 1.4, cans: 1.0, bear: 1.8, snare: 1.0 }, free: { bear: 1.6, snare: 1.1 } },
      // The stump gun's charge: everything within `range` metres and `halfAngle` degrees of its aim takes
      // `damage` (falling off by `falloff` at the far end); Tom takes `tomDamage`. Its bang carries
      // `alert` metres. Cut, its line gives up the `shells` in the gun.
      shotgun: { range: 11, halfAngle: 13, damage: 90, falloff: 0.5, knockback: 2.5, tomDamage: 45, alert: 45, shells: 2 },
      cans: { alert: 70 }, // metres the rattle carries
      // radius: metres from its middle it takes a foot; damage: Tom's; deadDamage / holdSeconds: one of the dead's.
      bear: { radius: 0.5, damage: 30, shake: 1.5, deadDamage: 40, holdSeconds: 14 },
      snare: { radius: 0.55, damage: 8, shake: 1, deadDamage: 10, holdSeconds: 12 },
    },
    encounter: {
      interactRange: 1.7,
      holds: { search: 1.0, cutters: 0.8, map: 0.8, board: 0.6, valve: 1.3, cabinet: 1.4, ammo: 1.0, coil: 2.6 }, // seconds held (X)
      sweepDistance: 7, // metres from the mouth's arrival spot: the arrival sweep (once)
      spawnDistance: 70, // metres from the holler's middle: the family's at the still by now (until they're down)
      wakeDistance: 13, // metres from the still: the family comes for Tom (or the cans, or a shot)
      linger: 5.5, // metres round the still they shuffle about, waiting
      familyTrees: { count: 2, ring: [24, 30], after: 18 }, // two more out of the trees (kin from up the ridge), this long after they wake
      // The still (DESIGN.md: shut it down with the valves in the right order, or it blows and the
      // part goes with it). Its gauge reads `start` (in the red) when Tom first comes; from when the family
      // wakes it climbs to 1 (it blows) over `blowSeconds`. The valves in order: the damper (it stops
      // climbing), the relief cock (it bleeds down to `bled` over `bleedSeconds`), the line (it's shut down).
      // A valve out of turn: the gauge jumps `wrong` (the line before it's bled: `wrongLine`), a gout of
      // steam (`steamDamage` within `steamRange`).
      still: { start: 0.74, blowSeconds: 160, bled: 0.3, bleedSeconds: 4, wrong: 0.08, wrongLine: 0.16, steamDamage: 6, steamRange: 2.6, boilEvery: 2.8, boilDistance: 18, order: ['damper', 'relief', 'line'] },
      blast: { radius: 7, damage: 200, playerDamage: 90, edge: 0.2, knockback: 3, shake: 1.6, alert: 120 },
      autoShotgunShells: 20, // a drum, in the cabinet with it
      ammoShells: 14, // the ammo cans under the bench
    },
    look: {
      weather: { rust: [0x34302a, 0x2a2622, 0x3a2a1e, 0x2c2a28], grimeHeight: 0.14, keepBright: [] },
      colors: {
        rock: 0x4a4840, // the ledges, wet and mossy
        rockDark: 0x363630,
        stone: 0x4e4a42, // the firebox's laid stone
        stoneDark: 0x3a3732,
        wetStone: 0x2e302c,
        water: 0x2c383a, // the branch, a little sky in it
        laurel: 0x2a3a26, // rhododendron, leathery and dark
        laurelDark: 0x223020,
        bark: 0x2e2820,
        barkDark: 0x241f19,
        endGrain: 0x5a4c36,
        sapling: 0x3a3226,
        leaves: 0x4a3a28, // the floor's litter (near the ground's own colour)
        leavesDark: 0x42342a,
        leavesNeat: 0x4e3e28, // the one pile too neat: a shade too even, a shade too fresh
        stake: 0x3a3022,
        cord: 0x4a4434,
        line: 0x6c6c66, // the fishing line: pale enough to catch the torch
        wire: 0x3a3a38,
        can: 0x5a5a54,
        canRust: 0x4a3222,
        trapIron: 0x2a2826,
        gunMetal: 0x232325,
        gunStock: 0x3e2a1a,
        board: 0x4a4234,
        boardDark: 0x363024,
        paint: 0x1a1612,
        chalk: 0x6a6860,
        post: 0x3e3428,
        postDark: 0x2e261e,
        tin: 0x3a3028, // rusted roofing tin
        floor: 0x2c251c,
        stave: 0x4a3622, // the barrels
        staveDark: 0x3a2a1a,
        hoop: 0x2a2826,
        mash: 0x4a4228, // sour mash, a skin on it
        copper: 0x6a3c22, // the still, dulled brown with heat and age
        copperDark: 0x52301c,
        dough: 0x5a5440, // the rye paste sealing the cap
        iron: 0x2a2826,
        ironDark: 0x1e1d1c,
        glow: 0x7a3a14, // the fire through the firebox door's gaps (unlit)
        gauge: 0x3a3a36,
        gaugeFace: 0x6a665a,
        gaugeRed: 0x5a1a14,
        brassValve: 0x5a4a24,
        jar: 0x3e4a48, // mason jars
        jug: 0x5a4a34, // stoneware
        sack: 0x5a5040, // corn and sugar
        thermos: 0x2a3a2e,
        paper: 0x6a665a,
        ink: 0x1a1612,
        tackle: 0x2a3a2a, // a green tackle box
        cutterGrip: 0x5a1e14, // the cutters' red grips, faded
        cabinet: 0x3a2a1c,
        ammoCan: 0x2e3424,
        hollow: 0x0d0c0b,
        // The man in the suit at the mouth (render/sawmillModel.js deadMan).
        skin: 0x5c5a4c,
        skinDark: 0x4a4a40,
        flannelRed: 0x4a1a16,
        denim: 0x1c2638,
        workBrown: 0x2e2418,
        boot: 0x1a1410,
        hair: 0x1e140c,
        hairGrey: 0x4a4a46,
        hardHat: 0x5a4a14,
        suit: 0x1c1c22,
        shirt: 0x6a665c,
        tie: 0x08080a,
        shoe: 0x0e0e0e,
        blood: 0x2a0e0c,
        bloodDark: 0x1c0a09,
      },
    },
  },

  // Session 30: the abandoned mineshaft (an optional encounter; DESIGN.md "Abandoned mineshaft"; the
  // surface set: render/mineshaftModel.js, world/MineshaftSite.js; the beat: encounters/Mineshaft.js;
  // the texts: data/mineshaft.json). The Black Laurel Coal Company's No. 2 shaft (a draft name).
  mineshaft: {
    radius: 26, // metres from its middle the set reaches (for drawing it)
    encounter: {
      interactRange: 1.7,
      holds: { search: 1.0, desk: 1.0, tags: 0.9, lamps: 0.9, locker: 1.2, army: 1.0, cart: 0.8, battery: 2.0, lever: 0.9, points: 1.6, fall: 5.0, winch: 1.2 }, // seconds held (X); fall: levering the rock off the rails (it drains if he lets go)
      sweepDistance: 6, // metres from the arrival spot: the arrival sweep (once)
      locker: { pistol: 10, kits: 1 }, // the foreman's locker: rounds and a first aid kit
      lamps: { scrap: 3 }, // the lamp rack: dead cap lamps, good for scrap
      army: { rifle: 10 }, // the army's crates by the collar: service rifle rounds
      creakEvery: [6, 15], // the headframe in the wind, while Tom's near (seconds)
      creakDistance: 40,
    },
    // The mine below (world/mineTrack.js: pure; render/mineModel.js; encounters/MineRide.js). A pocket far
    // under the clearing (world/Interiors.js). Mine space: the cage's middle at the origin on the landing's
    // floor, the track heading +z; `origin` shifts the whole mine so its loop sits under the clearing
    // (Tom's dot on the map stays near it).
    origin: [-40, -46],
    // The track: legs in order, each `len` metres, turning `turn` degrees (+ toward the frame's +x) and
    // falling at `grade` (rise per metre). half / roof: the tunnel's half width and height. wide: the
    // galleries (the landing, the two stops, the bottom).
    track: {
      step: 1,
      back: 3,
      ease: 5,
      half: 1.9,
      roof: 3.1,
      endRoom: 3,
      legs: [
        { len: 26, grade: 0 }, // 0-26: the landing
        { len: 40, grade: -0.06 }, // 26-66: the first drift
        { len: 28, turn: 90, grade: -0.08 }, // 66-94
        { len: 30, grade: 0 }, // 94-124: the points
        { len: 28, turn: 90, grade: -0.08 }, // 124-152
        { len: 44, grade: -0.07 }, // 152-196: the roosts
        { len: 28, turn: 90, grade: -0.08 }, // 196-224
        { len: 30, grade: 0 }, // 224-254: the fall
        { len: 28, turn: 90, grade: -0.1 }, // 254-282
        { len: 56, grade: -0.13 }, // 282-338: the steep run (right under the landing, far below it)
        { len: 28, turn: 90, grade: -0.1 }, // 338-366
        { len: 40, grade: -0.06 }, // 366-406
        { len: 26, grade: 0 }, // 406-432: the bottom
      ],
      wide: [
        { s0: -3, s1: 22, half: 3.2 },
        { s0: 98, s1: 122, half: 3.6 },
        { s0: 228, s1: 252, half: 3.6 },
        { s0: 408, s1: 436, half: 4.2 },
      ],
    },
    bulbsLit: [1, 9, 17, 61, 109, 113, 153, 241, 301, 409, 425], // s along the track: the bulbs still burning (the rest are dead)
    // The cage: seconds down (and the hang partway: it stops dead, then drops faster), the depth it reads.
    // speed: how fast the walls run past the bars (m/s, for the eye: the real drop's far quicker).
    lift: { seconds: 26, hangAt: 0.38, hang: 2.6, depth: 2400, speed: 5.5, creakEvery: 1.7, upSeconds: 5 },
    // The turret cart (world/MineCart.js). It runs on its own: `cruise` m/s, faster down `runs`, braking
    // over `brake` metres to a stop. start / end: where it waits at the landing and where it stops at the
    // bottom (s along the track). stops: where it halts until Tom's cleared the way.
    ride: {
      start: 9,
      end: 424,
      cruise: 4.6,
      crawl: 0.7,
      brake: 14,
      accel: 1.8,
      runs: [{ s0: 282, s1: 372, speed: 9.5 }],
      stops: [
        { id: 'points', s: 110 },
        { id: 'fall', s: 240 },
      ],
      clackEvery: 3.2, // metres between rail joints (a clack each)
      eye: { back: 0.8, up: 0.5 }, // his eye behind and above the gun's pivot (standing at it, as on the ute)
      strikeScale: 0.7, // the dead's swipes reach up at him in the tub
      mountSeconds: 0.8,
      // The old gun on its pedestal: it never runs dry (a belt box as long as the ride), it overheats.
      gun: {
        rate: 7.5,
        damage: 40,
        pierce: 2,
        pierceKeep: 0.7,
        range: 90,
        falloff: [30, 90, 0.7],
        spread: 0.5,
        spreadMax: 1.8,
        spreadGrow: 0.07,
        spreadSettle: 3.5,
        aimSpread: 0.6,
        aimFov: 0.75,
        stagger: 0.5,
        knockback: 1.0,
        heatPerShot: 0.021,
        coolRate: 0.42,
        coolDelay: 0.25,
        jamUntil: 0.3,
        kick: 0.3,
        shake: 0.1,
        pitchMin: -0.75,
        pitchMax: 0.95,
        tracerEvery: 2,
      },
    },
    // The mine's own light and fog (world/Interiors.js): black beyond the torch.
    light: { ambientDay: 0.55, ambientNight: 0.55, ambientColor: 0x8a8478, fogColor: 0x040404, fogNear: 3, fogFar: 44 },
    look: {
      weather: { rust: [0x34302a, 0x2a2622, 0x3a3630, 0x2c2a28, 0x3a3028], grimeHeight: 0.16, keepBright: [0x3a5a2a, 0x5a1a14] },
      colors: {
        post: 0x3e3428, // the headframe's timbers
        postDark: 0x2e261e,
        plank: 0x4a4234,
        plankDark: 0x383024,
        clap: 0x56524a, // the office's boards, once white
        clapDark: 0x3a362e,
        trim: 0x2e2a24,
        tin: 0x3a3028, // rusted roofing tin
        tinDark: 0x2c2a28,
        iron: 0x34302a, // the cage, the sheave, the rails
        ironDark: 0x2a2622,
        cable: 0x1e1d1c,
        concrete: 0x4a4944, // the collar
        concreteDark: 0x3a3936,
        coal: 0x141312, // the spoil, the dust on everything
        coalDark: 0x0e0d0d,
        dirt: 0x2e281e,
        hollow: 0x0b0a0a, // down the shaft, inside a window
        glass: 0x1e262a,
        floor: 0x2c251c,
        desk: 0x3a2a1c,
        paper: 0x6a665a,
        ink: 0x1a1612,
        brass: 0x5a4a24, // the tag board's tags, the cap lamps
        board: 0x1e1c1a, // the tag board's black paint
        locker: 0x34403a, // institutional green, chipped
        lamp: 0x3a3a36, // a cap lamp's body
        lens: 0x5a5a4c,
        box: 0x3a3a38, // the lift's control box
        boxDark: 0x2a2a28,
        lead: 0x5a1a14, // a jumper lead's red clip
        leadBlack: 0x161514,
        battery: 0x1a1a1c,
        batteryCap: 0x5a5440,
        live: 0x3a5a2a, // the box's lamp, lit (unlit material: it glows a dull green)
        signBoard: 0x4a4638,
        signPaint: 0x1a1612,
        army: 0x2e3424, // olive crates
        armyDark: 0x22281a,
        stencil: 0x5a5440,
        tarp: 0x2a3228,
        tape: 0x5a5020, // hazard tape, faded
        silk: 0x5a584e, // a strand of something pale on the headframe (the first hint)
        bark: 0x2e2820,
        barkDark: 0x241f19,
        endGrain: 0x5e5038,
        helmet: 0x4a4022, // a miner's helmet, once yellow
        // Below ground (render/mineModel.js).
        rock: 0x3a3832,
        rockDark: 0x2a2926,
        seam: 0x121110, // the coal in the wall
        ballast: 0x2a2620,
        bulb: 0x2a2a26, // a dead bulb on the string
        bulbLit: 0x7a5a26, // a live one (unlit material: dull amber)
        cartBody: 0x2e2a26,
        cartTrim: 0x3a2a1e,
        gun: 0x232325,
        gunJacket: 0x2e3230,
        gunBrass: 0x5a4a24,
        grip: 0x3e2a1a,
        flash: 0xffc070,
        door: 0x30281e, // the bulkhead at the bottom
        seamGlow: 0x4a2a5a, // the light under it (unlit: a dull violet)
      },
    },
  },
  railwayCutting: {
    radius: 34, // metres from its middle the set reaches (for drawing it)
    // The train along the line (metres along it from the clearing's middle, toward the engine's
    // front: heading +1 is east). Each car: its kind, length, the gap after the one in front.
    train: {
      heading: 1,
      front: 21, // the cowcatcher's tip
      sink: 0.16, // a century of litter: the wheels sunk this far
      cars: [
        { kind: 'engine', length: 10.2, gap: 0 },
        { kind: 'tender', length: 5.6, gap: 0.5 },
        { kind: 'coach', id: 'coach1', length: 12, gap: 0.9 },
        { kind: 'coach', id: 'coach2', length: 12, gap: 1.0 },
        { kind: 'baggage', id: 'baggage', length: 8.5, gap: 1.6, roll: 0.3, skew: 0.16 }, // off the rails, leaning on the bank
      ],
      coach: { width: 2.8, floor: 1.15, wall: 2.05, platform: 0.95, aisle: 0.58, bench: 1.15 }, // floor: above the rails; wall: the side walls' height above the floor; aisle: its half width; bench: metres between benches
    },
    // The old powder store up on the bank (X across from the line, by the frame's side; the end of
    // the cutting it sits toward comes from the map: world/railCutting.js).
    store: { across: 13.2, width: 3.4, depth: 2.8, height: 2.2, door: 0.95, steps: 4.5 }, // steps: metres along from the store, the navvies' steps up the face
    faceCollider: 6.4, // metres across from the line: the rock faces' colliders
    // The beat (encounters/RailwayCutting.js).
    encounter: {
      sweepDistance: 30, // metres from the middle: the arrival sweep (once)
      interactRange: 1.6,
      boardRange: 1.3, // metres from a coach's step: climb aboard
      boardEnds: { coach1: ['F', 'B'], coach2: ['B'] }, // the ends with a way in (coach2's front door's stuck shut)
      roofY: 2.45, // the coaches' insides: metres from the floor to the clerestory
      callDistance: 10, // metres from coach2's middle: the Caller calls from inside it (Amos, for Levi)
      lureAfter: 2.5, // seconds aboard coach2: the second call, from up the bank
      hattieAfter: 1.6, // seconds after the doll's taken: a girl's voice from the bank
      creakEvery: [9, 22], // seconds between the train's creaks while Tom's near
      creakDistance: 45,
      holds: { maul: 1.5, bar: 1.8, sticks: 1.2, cowcatcher: 2.6, search: 1.0, board: 0.45, lantern: 0.9, cab: 1.2, baggage: 1.4, doll: 0.6 }, // seconds held (X)
      sticks: 6, // the good ones in the powder store (scarce)
      riseAfter: 3.2, // seconds after the store's door is knocked open (or the cowcatcher's bolts): the dead come up
      // The dead coming up out of the cutting, in waves: how many, where (floor: out of the ballast
      // around Tom; mouths: up out of the line at both ends; store: round the foot of the steps), and
      // when the next one comes (seconds after the last, or as soon as this few of the last are left).
      waves: [
        { count: 6, from: 'floor', after: 0 },
        { count: 6, from: 'mouths', after: 10, left: 2 },
        { count: 5, from: 'store', after: 9, left: 2 },
      ],
      floorRing: [7, 14], // metres from Tom, on the floor of the cutting
      crate: { r: 0.6, h: 0.9, blast: { radius: 11, damage: 420, playerDamage: 150, edge: 0.2, knockback: 6, shake: 2.2, alert: 220 } }, // the sweating crates, if they're knocked
    },
    look: {
      weather: { rust: [0x4a2e1e, 0x33221a, 0x2a2622], grimeHeight: 0.5, keepBright: [] },
      colors: {
        rock: 0x4a4842, // blasted shale and sandstone, grey-brown
        rockDark: 0x38362f,
        rockLight: 0x56534a,
        strata: 0x403b33,
        drill: 0x2a2824, // the half-barrel drill holes down the faces
        moss: 0x34402a,
        mossDark: 0x2a3322,
        fern: 0x2e3a24,
        earth: 0x3e3022,
        litter: 0x3a3020,
        root: 0x33281e,
        rust: 0x4a2e1e,
        rustDark: 0x33221a,
        iron: 0x2a2622,
        ironDark: 0x1e1c19,
        boiler: 0x2c2a27, // the engine's black, gone to rust and soot
        brass: 0x544626, // the bell, the dome's trim
        coach: 0x4a2420, // the coaches' Tuscan red, faded
        coachDark: 0x381c19,
        letter: 0x5a4a2a, // the gilt lettering's ghost
        wood: 0x4a3626,
        woodDark: 0x35271c,
        woodGrey: 0x55514a, // planks weathered silver
        roof: 0x2c2a26,
        roofDark: 0x22201d,
        hollow: 0x0d0c0b,
        glass: 0x1e262a,
        plush: 0x2e3a2c, // the seats' green plush
        plushDark: 0x232b21,
        leather: 0x3e2c1c,
        leatherDark: 0x2c2014,
        canvas: 0x5a5444,
        cloth: 0x4a4038,
        clothBlue: 0x343a46,
        clothRose: 0x4e3436,
        tag: 0x6a6252, // the brown card labels
        coal: 0x1a1918,
        bark: 0x3a2e24,
        leaf: 0x34402a,
        leafDark: 0x2a3322,
        stone: 0x4e4a42,
        stoneDark: 0x3c3934,
        plank: 0x3e3428,
        plankDark: 0x2c261e,
        paint: 0x5c5a50, // POWDER, white once
        lamp: 0x2a2622,
        lampGlass: 0x3a3a30,
      },
      flame: 0xb07a3a, // the lantern on the line (unlit material: a glow, no light)
    },
  },

  // Session 26: the stairs in the woods and the place beyond (story spine,
  // beat 5; DESIGN.md "Stairs in the woods"). The set: render/stairsModel.js,
  // world/StairsSite.js; the beat: encounters/Stairs.js (the climb, the
  // find, Junie following Tom home, the homecoming); the place beyond:
  // encounters/PlaceBeyond.js (config.spikes.placeBeyond, its story look below).
  stairs: {
    radius: 14,
    look: {
      // Unlit (MeshBasicMaterial): these show as they are, day or night, so they're kept darker than a lit set's.
      colors: { paint: 0x4c4a44, paintDark: 0x3a3936, tread: 0x382a1e, carpet: 0x3c1c20, brass: 0x584826 },
    },
    encounter: {
      needs: 'stairsKnown',
      arriveDistance: 15, // metres from the foot: the first sight of it (a held look, once), inside its clearing so no trunk's in the way
      climbRange: 1.8, // metres from the foot: hold X to climb
      climbSeconds: 1.2,
      follow: { gap: 1.7, speed: 4.6, catchUp: 9, snap: 28 }, // Junie behind Tom on the way home: metres behind, her walk (m/s), faster beyond catchUp metres, put beside him past snap
      homeRadius: 0, // metres past the fence's radius: inside it, the homecoming (0: at the fence)
      lineEvery: [40, 70], // seconds between Junie's lines on the walk home
      findDistance: 6.5, // metres from her Tom comes into the last clearing of the place beyond
    },
  },

  // The Mothman (Session 24: the model; render/mothmanModel.js,
  // render/MothmanRenderer.js). His encounters' AI is Session 25 on; the
  // flyer spike (spikes.flyer) wears him meanwhile.
  mothman: {
    poolSize: 1,
    height: 2.3, // metres, standing (as the model's built)
    middle: 0.6, // x his height: the point he pitches and banks about in flight
    albedo: 0.3, // his colours x this (the torch is strong up close)
    eyeGlow: 3, // the eyes' glow, in their own colour (unfogged: they show far off)
    eyePulse: 0.12, // the glow swells and sinks by this share...
    eyePulseHz: 0.35, // ...this often
    poseRate: 10,
    flapHz: 2.2, // the wingbeat when nothing drives it (the model viewer)
    flightPitch: 1.2, // radians he's tipped forward, flying level
    lookMax: 1.1, // radians his head turns to watch something
    clingLook: 2.55, // radians the head is turned back over his shoulder, clinging
    strikeSeconds: 0.3, // the rake
    deathSeconds: 2.6,
    hitFlashSeconds: 0.12,
    hitFlash: [1.6, 0.7, 0.5], // his colour while flashing
    thermalGlow: 0.5, // x the heat scope's glow
    // All dull (the glare rule), but the eyes.
    colours: {
      fur: 0x1c1a18,
      furDark: 0x121110,
      ruff: 0x26221f,
      belly: 0x262220,
      wing: 0x1f1c1b,
      dust: 0x4a443c, // the wings' pale bands and the eye-spots' rings
      spot: 0x4a1c12, // the eye-spots' rust
      claw: 0x0b0b0c,
      eyes: 0xff0a04,
    },
  },

  // Beetles (Session 13: the model; their AI is M9.4, the outpost).
  beetles: {
    // The giant beetle (render/beetleModel.js, render/BeetleRenderer.js): the Mothman's brood.
    giant: {
      poolSize: 8, // most drawn at once
      albedo: 0.55,
      specular: 0x6a7a70, // the shell's glint under the torch (green-tinged)
      shininess: 48,
      spotGlow: 0.9, // the weak spot's glow, in its own colour (it can be found in the dark)
      eyeGlow: 1,
      spotPulse: 0.8, // throbs, per second
      poseRate: 12,
      strideRate: 9, // radians of gait per metre walked
      attackWindup: 0.7, // rearing up (for the AI to match)
      strikeSeconds: 0.18, // the lunge and snap
      deathSeconds: 1.2,
      sinkDepth: 0.7, // metres it's under at sink 1 (emerging)
      hitFlashSeconds: 0.15,
      hitFlash: [1.8, 1.6, 0.8], // its colour while flashing
      thermalGlow: 0.35, // x the heat scope's glow: dim (from the other side)
      colours: { shell: 0x24382c, shellDark: 0x18221c, belly: 0x2e2618, spot: 0xc8c070, eyes: 0xc01810 }, // black-green
    },
    // Session 17 (M9.4; ai/Beetles.js): their AI, first met crated at the
    // outpost. The shell takes `armour` of a hit (DESIGN: body shots do
    // little); the soft spot on the face takes weakMultiplier x (a service
    // rifle round there 75, the hunting rifle's 150: one). Speeds in m/s
    // (Tom walks 3.6, sprints 7.2).
    ai: {
      health: 150,
      armour: 0.3,
      weakMultiplier: 3,
      speed: 5.2, // charging
      walkSpeed: 2.0, // cooling off after a strike, or with Tom out of reach
      turnRate: 4, // radians a second
      attackRange: 1.8, // metres: it rears up
      reach: 2.3, // metres: the snap lands if he's still this close, in front
      damage: 22,
      recover: 0.35, // seconds after the snap
      cooldown: 0.9, // seconds of walking before the next strike
      emergeSeconds: 1.3,
      threatSeconds: 0.9,
      flinchSeconds: 0.4,
      radius: 0.55, // metres: against the world
      hitRadius: 0.6, // the body's hit cylinder
      height: 0.75,
      spotAhead: 0.62, // the soft spot: metres ahead of its middle, up, across
      spotHeight: 0.42,
      spotRadius: 0.2,
    },
  },

  // Other people built with the figure kit (Session 13): the cutscenes'.
  // Same shape as config.family.people.
  people: {
    // Session 16: the Pruitts, alive, on Earl's tape (clip.pruittTape; render/familyLooks.js).
    earlPruitt: {
      height: 1.78,
      head: 1.04,
      idle: 'pockets',
      colours: { skin: 0xc09078, top: 0x7a6a48, sleeve: 0x7a6a48, forearm: 0x7a6a48, trousers: 0x2c3648, shoes: 0x3a2a1a, hair: 0x8a8680, cap: 0x7a2a22, eyes: 0x1a1410, brows: 0x6a6660 },
    },
    pruittBoy: {
      height: 1.45,
      head: 1.18,
      idle: 'pockets',
      colours: { skin: 0xc8a084, top: 0x2a4a3a, sleeve: 0x2a4a3a, forearm: 0x2a4a3a, trousers: 0x2c3648, shoes: 0x5a5a56, hair: 0x5a3a20, eyes: 0x1a1410, brows: 0x3a2414 },
    },
    pruittGirl: {
      height: 1.2,
      width: 0.95,
      head: 1.3,
      idle: 'hug',
      colours: { skin: 0xd0a88c, top: 0x6a3a4a, sleeve: 0x6a3a4a, forearm: 0x6a3a4a, trousers: 0x2a2a34, shoes: 0x6a5a5a, hair: 0x8a6034, eyes: 0x141010, brows: 0x5a3a24 },
    },
    mib: {
      height: 1.86,
      head: 1.04,
      idle: 'clasped',
      colours: { skin: 0xc8a08a, top: 0x141418, sleeve: 0x141418, forearm: 0x141418, shirt: 0x8a8a86, tie: 0x0a0a0c, trousers: 0x141418, shoes: 0x0a0a0c, hair: 0x1a1612, eyes: 0x1a1410, brows: 0x1a1612, shades: 0x060608 },
    },
  },

  // The Men in Black, armed (Session 13; DESIGN.md "Men in Black";
  // render/MibRenderer.js): config.people.mib with a weapon, for their AI
  // (M11). Most carry a pistol, some an SMG, some a sniper rifle (Aaron):
  // weaponMix, the shares a squad is drawn from.
  mibAgents: {
    poolSize: 12, // at most this many shown at once
    albedo: 0.62, // as the family's
    poseRate: 10, // how fast he blends into a new pose (per second)
    firePoseRate: 40, // ...while firing (the kick)
    walkRate: 7, // radians of stride per metre walked
    runRate: 4.5, // per metre run
    weaponMix: { pistol: 0.65, smg: 0.25, sniper: 0.1 },
    recoil: { pistol: 0.22, smg: 0.07, sniper: 0.32 }, // radians the muzzle kicks up a shot
    recoilDecay: 9, // how fast the kick settles (per second)
    deathSeconds: 1.3,
    hitFlashSeconds: 0.15,
    hitFlash: [1.8, 0.5, 0.5],
    thermalGlow: 1, // x the heat scope's glow: warm, living
    colours: { gun: 0x1a1a1c, gunGrip: 0x111112, scope: 0x141416, lens: 0x1a2a3a },
  },

  // Talking to the family face to face (M8): hold interact while looking
  // at one of them in the comms room.
  familyTalk: {
    range: 2.4, // metres
    lookAngle: 28, // degrees either side of the view
    holdSeconds: 0.35,
    bobHeight: 0.05, // metres, while their line types on
    bobRate: 11, // radians per second
    // The new-line marker: a small diamond over a family member with
    // something new to say.
    marker: { color: 0xf0d070, size: 0.06, above: 0.3, bob: 0.04, checkEvery: 1 },
  },

  // Trail cameras (M8; DESIGN.md "The radio"): fixed spots in the north
  // and middle bands. They report the witch only if she passes one, after
  // a delay, and the map marks the camera, not her: a lead, never a tracker.
  trailCams: {
    count: 6,
    bands: ['north', 'middle'],
    minSpacing: 120, // metres between cameras
    fromCentre: 0.6, // fraction of a clearing's radius: the camera's post sits at its edge, facing in
    range: 26, // metres the camera sees
    cooldown: 90, // seconds before the same camera can report her again
    reportDelay: { min: 25, max: 60 }, // seconds from her passing to the family's call
    leadSeconds: 240, // how long the map marks the camera after a report
    post: { height: 1.6, color: 0x2a241c, box: 0x1c2219, led: 0xff3020 }, // darker (Aaron, Session 14: the boxes glared)
    map: { color: '#8cc4ec', leadColor: '#ff6a4a', screenPixels: 6, minimapPixels: 4 }, // Session 16 (Aaron): blue (green read as the witch's)
  },

  // The station's ledger (M5): a full-screen book in the comms room.
  // Placeholder look; the pixel-font book is the UI session's (Session 19).
  ledger: {
    pausesClock: false, // DESIGN.md: it doesn't pause the clock (zombies keep coming)
    refreshSeconds: 0.5, // live values redraw this often
    stickThreshold: 0.5,
    repeatDelay: 0.4,
    repeatInterval: 0.12,
  },

  // M6: the run's save slot (core/saveData.js, core/SaveStore.js):
  // autosaved at each dawn, deleted when the run ends.
  save: {
    key: 'witchHunt.save',
    autosaveAtDawn: true,
  },

  // What this device remembers outside any run (M9.2; meta/MetaStore.js):
  // the opening seen (the menu offers Skip intro). M12 adds achievements
  // and modifiers. pendingKey: the menu's choice carried across the reload.
  meta: {
    key: 'witchHunt.meta',
    pendingKey: 'witchHunt.pendingStart',
  },

  // Session 22 (Aaron): Demo mode, from the main menu: "if it runs in demo
  // mode, it'll run on your device". The ranger station on its own: no
  // story, no witch, no saving (the real save is never touched). Menu / Esc
  // opens the demo panel (demo/DemoPanel.js); demo/DemoMode.js runs it.
  demo: {
    day: 2, // the clock's day (past Day 1's scripted beats)
    // Where each time of day sits: a phase and how far through it (0..1). Set directly, no phase events.
    times: [
      { id: 'day', label: 'Day', phase: 'day', progress: 0.35 },
      { id: 'dusk', label: 'Dusk', phase: 'dusk', progress: 0.6 },
      { id: 'night', label: 'Night', phase: 'night', progress: 0.3 },
    ],
    startTime: 'day',
    // Early-game weapons only (Aaron: no spoilers): what the opening hands out.
    weapons: ['shovel', 'rifle', 'shotgun'],
    infiniteAmmo: true, // the starting setting (the panel toggles it)
    ammoFloor: 200, // with infinite ammo on, every pool is kept at least this full
    zombieCounts: [10, 25, 50, 75, 100, 125, 150], // the panel's "how many" steps
    startCount: 25,
    levels: [1, 2, 3, 4, 5], // zombie level (speed and toughness); basic zombies only, no mutants
    startLevel: 2,
    // They rise on a ring outside the fence (metres past its radius) and come for Tom.
    ring: { min: 14, max: 45 },
    fenceOn: true, // the starting setting: the fence fries them (kept charged while on)
    // The yard, inside the gate: metres in from the gate's middle.
    yardIn: 9,
    // Vehicles brought to just outside the gate (metres out, metres to the side).
    vehicles: { quad: { out: 7, side: 5 }, dozer: { out: 12, side: -8 } },
    respawnSeconds: 2.5, // after a death, back on your feet in the yard
    // The device test: night, a big wave, the frame rate measured once they're near.
    test: {
      count: 100,
      settleSeconds: 6, // after sending, before measuring (they rise and close in)
      measureSeconds: 15,
      // The verdict, on the average frames per second over the measure.
      great: 40, // at least this: "Runs great"
      playable: 24, // at least this: "Playable"; below: "Struggling"
      cappedGreat: 28, // with a 30 fps frame cap (Low), this counts as great
    },
    fpsSmoothing: 0.08, // the on-screen readout's smoothing per frame
    metaQualityKey: 'quality', // the preset the device test (or the panel) chose, kept for real runs
    needsControls: 'Witch Hunt needs a controller (or a keyboard and mouse): connect one to play the demo', // on a touch-only device with no controller
  },

  // Debug tools
  debug: {
    giveAmmoRounds: 20, // "Give ammo" adds this many to every gun
    populateCount: 100, // M6: "Zombies: populate the map" adds about this many
    fastForwardSteps: [1, 4, 10], // M6: world steps per frame for the debug fast-forward
    giveArmour: 40,
    giveFirstAid: 3,
    crashFloor: 0.1, // Session 20: the crashed plane's set piece (health can't drop below 10%)
    giveAlienShells: 8, // Session 20: until the crashed plane (Session 25)
    giveAlienMed: 1, // Session 20: alien med kits come from the crashed plane on (Session 25)
    teleportOffset: 6, // metres from a clearing's centre that a teleport lands
    sigilTeleportOffset: 4, // metres from a sigil
    marchTeleportBehind: 25, // M6: metres behind a marcher that its debug teleport lands
    plantAhead: 3, // "plant sigil here" puts it this far in front of you
    witchTeleportBack: 18, // M7: metres from the witch that "teleport to her" lands
    giveScrap: 50, // M5: station debug
    siegeWave: 10,
    overlayVisibleOnStart: false, // Session 18 (Aaron): off on a new game (View + Menu, or F3, shows it)
    overlayRefreshSeconds: 0.1, // how often the overlay text refreshes
    fpsSampleSeconds: 0.5, // averaging window for fps and frame times
    axisDecimals: 2, // decimals shown for stick values
    msDecimals: 1, // decimals shown for millisecond timings
    menu: {
      stickThreshold: 0.5, // left-stick deflection that moves the selection
      repeatDelay: 0.4, // seconds before a held direction starts repeating
      repeatInterval: 0.12, // seconds between repeats while held
    },
  },

  // The debug model viewer (Session 13; debug/ModelViewer.js): any
  // character model in any pose, in the world in front of you.
  modelViewer: {
    fov: 50,
    placeAhead: 3, // metres in front of you that the model stands
    floorTolerance: 0.3, // feet this far above the ground count as on a floor (it stands at your height)
    // The camera a model starts with: looking down this much (radians),
    // this far out (x the model's height, plus metres), aimed this high up it.
    start: { pitch: 0.12, distanceScale: 1.3, distanceAdd: 1.2, heightScale: 0.55 },
    limits: { pitchMin: -0.4, pitchMax: 1.35, distanceMin: 0.5, distanceMax: 16, heightMin: 0.05, heightMax: 4 },
    cameraAboveGround: 0.15, // metres: the camera never dips below this
    stickTurnSpeed: 1.6, // radians per second the left stick orbits at full tilt
    zoomSpeed: 3, // metres per second at full tilt (faster further out)
    raiseSpeed: 1.2, // metres per second the triggers move the aim point
    turntableSpeed: 0.6, // radians per second
    speeds: [1, 0.25, 0], // A cycles: playing, slow motion, paused
    // The lighting presets X cycles. hour: what the sky and grade show
    // (null: the game's own); torch: held from the viewer's camera
    // ('player': as you had it); thermal: the heat scope.
    lights: [
      { id: 'torch', name: 'Night, torch', hour: 0.5, torch: true },
      { id: 'moon', name: 'Night, moonlight only', hour: 0.5, torch: false },
      { id: 'dusk', name: 'Dusk', hour: 19.5, torch: false },
      { id: 'day', name: 'Day', hour: 13, torch: false },
      { id: 'thermal', name: 'Heat scope', hour: 0.5, torch: false, thermal: true },
      { id: 'game', name: "The game's own hour", hour: null, torch: 'player' },
    ],
    // Looping poses (seconds).
    zombieWalkSpeed: 0.8, // metres per second the walk cycle is played at
    hitLoopSeconds: 1.2, // a hit, then a pause, round again
    staggerSeconds: 0.35,
    holdSeconds: 1.5, // a one-off (rising, dying) holds its end this long before it loops
    milo: { distance: 4.2, walkSpeed: 1.4, bowSeconds: 2.4 }, // the camera's start; the walk's pace; a bow, held, then again
    barnAnimals: { walkSpeed: 0.9 },
    bigfoot: { distance: 6.5, walkSpeed: 1.3, cocoonBack: 0.15, slumpAhead: 1.7 }, // the camera's start; the walk's pace; where the cocoon stands behind him bound, and how far out of it he's fallen
    moths: { swarm: 24, swarmRadius: 2.6, height: 1.5, distance: 4, swarmDistance: 9 }, // the swarm's size and how wide it mills; a moth's height off the ground; the camera's start
    crashedPlane: { distance: 16, height: 1.2 }, // the set's framed from as far out as the viewer goes
    mothman: { distance: 6.5, flyHeight: 1.8, clingHeight: 1.2, diveSeconds: 0.9 }, // metres out he's framed from (his wings), his middle's height flying, his feet's clinging; the dive before each strike
    witchGlideShare: 0.6, // her gliding pose, as a share of full speed (the cloak's trail)
    witch: { plantSeconds: 6, hexSeconds: 1.4, swipeUpSeconds: 1, swipeDownSeconds: 0.6, summonSeconds: 2.4, riseSeconds: 3 },
    familyGap: 0.75, // metres between them side by side
    // The zombie's crowd variant: a size x size grid of mixed looks.
    crowd: { size: 5, spacing: 1.3, turn: 1.2, distance: 9, mix: { citizen: 0.6, police: 0.14, army: 0.14, mib: 0.12 } },
  },

  // Input
  input: {
    defaultDevice: 'keyboardMouse', // until the first input arrives
    gamepad: {
      moveDeadZone: 0.15, // radial inner dead zone, left stick
      lookDeadZone: 0.12, // radial inner dead zone, right stick
      outerDeadZone: 0.05, // stick deflection above (1 - this) counts as full
      triggerThreshold: 0.3, // LT/RT analogue value that counts as pressed
      lookSpeedX: 180, // degrees per second at full right-stick deflection
      lookSpeedY: 120, // degrees per second at full right-stick deflection
      lookCurveExponent: 2, // 1 = linear, higher = finer control near centre
      invertY: false,
      activityThreshold: 0.3, // stick deflection that makes the pad the active device
    },
    mouse: {
      sensitivity: 0.0022, // radians per pixel of mouse movement
      invertY: false,
    },
    // Button combos held for holdSeconds fire once (re-arm on release).
    // The first button is the modifier: while it is held, the other
    // buttons' own actions are suppressed (so View + D-pad down doesn't
    // also radio home). The modifier's own action still fires on press.
    combos: {
      debugOverlay: { buttons: ['View', 'Menu'], holdSeconds: 0.6 },
      debugMenu: { buttons: ['View', 'DpadDown'], holdSeconds: 0.6 },
    },
    // Action -> controller buttons (standard/Xbox layout names).
    gamepadBindings: {
      sprint: ['L3'],
      crouch: ['R3'],
      jump: ['A'],
      attack: ['RT'],
      aim: ['LT'],
      interact: ['X'],
      reload: ['B'],
      weaponNext: ['RB'],
      weaponPrev: ['LB'], // Aaron, M5: RB / LB cycle (was Y)
      firstAid: ['DpadRight'], // quick-use a first aid kit (Aaron, Session 3)
      flare: ['Y'], // swapped with LB (Aaron, M5)
      map: ['DpadUp'],
      flashlight: ['DpadLeft'],
      headlamp: ['DpadRight'], // Session 16: the quad's headlamp (riding; first aid's off in the saddle)
      watch: ['DpadDown'], // Session 16 (Aaron): play a tape or a feed that's waiting (it was 'radio', unused)
      inventory: ['View'],
      pause: ['Menu'],
      menuUp: ['DpadUp'],
      menuDown: ['DpadDown'],
      menuConfirm: ['A'],
      menuBack: ['B'],
      menuLeft: ['DpadLeft', 'LB'], // M5: ledger tabs
      menuRight: ['DpadRight', 'RB'],
      tabPrev: ['LB'], // Session 15b: the ledger's tabs even on a page with a plan (the D-pad moves round it)
      tabNext: ['RB'],
    },
    // Action -> KeyboardEvent.code values.
    keyBindings: {
      moveForward: ['KeyW'],
      moveBack: ['KeyS'],
      moveLeft: ['KeyA'],
      moveRight: ['KeyD'],
      sprint: ['ShiftLeft', 'ShiftRight'],
      crouch: ['KeyC'],
      jump: ['Space'],
      interact: ['KeyE'],
      reload: ['KeyR'],
      weaponSlot1: ['Digit1'],
      weaponSlot2: ['Digit2'],
      weaponSlot3: ['Digit3'],
      weaponSlot4: ['Digit4'],
      weaponSlot5: ['Digit5'], // Session 10b: more guns
      weaponSlot6: ['Digit6'],
      weaponSlot7: ['Digit7'],
      weaponSlot8: ['Digit8'],
      firstAid: ['KeyH'],
      flare: ['KeyF'],
      map: ['KeyM'],
      flashlight: ['KeyL'],
      headlamp: ['KeyH'], // Session 16: the quad's headlamp (riding; first aid's off in the saddle)
      watch: ['KeyV'], // Session 16: play a tape or a feed that's waiting (Session 25: else the weapon cross)
      weaponCross: ['KeyG'], // Session 25: the weapon cross
      inventory: ['Tab'],
      pause: ['Escape'],
      menuUp: ['ArrowUp'],
      menuDown: ['ArrowDown'],
      menuConfirm: ['Enter'],
      menuBack: ['Escape', 'Backspace'],
      menuLeft: ['ArrowLeft', 'KeyQ'], // M5: ledger tabs
      menuRight: ['ArrowRight'],
      tabPrev: ['KeyQ', 'PageUp'], // Session 15b: the ledger's tabs on a page with a plan
      tabNext: ['KeyR', 'PageDown'],
      debugOverlay: ['F3'],
      debugMenu: ['Backquote'],
    },
    // Action -> MouseEvent.button values (0 left, 1 middle, 2 right).
    mouseBindings: {
      attack: [0],
      aim: [2],
    },
    wheelAction: 'weaponCycle', // mouse wheel fires this action (Session 25: it rotates through the kinds, as RB does)
  },
};
