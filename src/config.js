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
      cctv: { tint: 0xd8e4dc, saturation: 0.25, contrast: 1.15, gain: 1.6, noise: 0.12, scanlines: 0.18, lines: 240, bend: 0.12, vignette: 0.55, tear: 0.0, dropout: 0.0, chroma: 1.2, mask: 0 },
      trailcam: { tint: 0x7cff8c, saturation: 0, contrast: 1.25, gain: 3.4, noise: 0.16, scanlines: 0.12, lines: 200, bend: 0.06, vignette: 0.6, tear: 0.0, dropout: 0.0, chroma: 0.6, mask: 0 },
      camcorder: { tint: 0xfff0dc, saturation: 0.8, contrast: 1.08, gain: 1.5, noise: 0.07, scanlines: 0.08, lines: 288, bend: 0.03, vignette: 0.4, tear: 0.02, dropout: 0.0, chroma: 2.2, mask: 0 },
      military: { tint: 0xd4dcc4, saturation: 0.35, contrast: 1.2, gain: 1.8, noise: 0.2, scanlines: 0.22, lines: 200, bend: 0.1, vignette: 0.6, tear: 0.25, dropout: 0.6, chroma: 1.8, mask: 0 },
      government: { tint: 0xb8d0ff, saturation: 0.3, contrast: 1.1, gain: 1.7, noise: 0.06, scanlines: 0.1, lines: 360, bend: 0.04, vignette: 0.45, tear: 0.0, dropout: 0.0, chroma: 0.4, mask: 0 },
      scope: { tint: 0xffffff, saturation: 0.9, contrast: 1.05, gain: 1.3, noise: 0.03, scanlines: 0, lines: 240, bend: 0, vignette: 0.2, tear: 0, dropout: 0, chroma: 0, mask: 1 },
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
    clearingCount: 22, // home, the hut, one per encounter and sigil ground, the rest plain clearings
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
      southnessMin: 0.9, // deep in the south
      minHops: 4, // at least this many pathways from home
    },
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
      chainGate: { width: 6, wing: 9, height: 2.4, color: 0x3a3d3f, chainLink: 0x4a4f53, sign: 'AUTHORIZED PERSONNEL ONLY' },
      signColor: 0x8a8370, // dull: pale boards glare under the torch
      signText: 0x5e1a12,
    },
    // The military cordon (M9.1; DESIGN.md "Fixed opening cluster"): chain-
    // link and razor wire the full width of the map along the cordon line
    // (config.map.cluster.cordonSouthOfHome). It stops Tom; the dead and the
    // witch come through the torn gaps (they walk the pathways, so mostly
    // through the checkpoint). Intact panels stop everyone; the gaps and the
    // checkpoint's gate stop only the player. Shots go through the wire.
    cordon: {
      panelLength: 3, // metres between posts
      height: 3, // metres of chain-link
      thickness: 0.15, // metres (collider half-thickness)
      postRadius: 0.05,
      chainLink: 0x4a4f53,
      chainLinkTexture: 128, // pixels
      post: 0x2c2e30,
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
      signColor: 0xc9c2ae,
      signText: 0x8e2418,
      // Floodlight posts along the fence: dark and broken (decoration, no lights).
      lampSpacing: 120, // metres
      lampHeight: 6,
      lampColor: 0x2a2b2c,
      lampGlass: 0x1c2224,
      // Concrete barriers lining the fence near the checkpoint (south side).
      barrierReach: 45, // metres either side of the checkpoint
      barrierLength: 3,
      barrierColor: 0x5a5852,
      // The checkpoint's gate (opens in story order; see the gates).
      gateColor: 0x3a3d3f,
      armColor: 0x6e6a60, // the barrier arm (striped in the texture); dull, the torch glares on pale paint
      boothColor: 0x4c5040,
    },
    // The opening cluster's road (M9.1; DESIGN.md "Fixed opening cluster"):
    // the old county road past the gas station to the checkpoint. Its line
    // is in data/openingCluster.json.
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
      // The sign before the outpost.
      sign: {
        along: 452, // metres from the west end (the outpost's centre is at about 520)
        side: -5.2, // metres right (+) or left (-) of the centre line
        title: 'ROAD CLOSED',
        lines: ['MILITARY CHECKPOINT AHEAD', 'NO ENTRY BEYOND THIS POINT'],
        boardColor: 0xd8d2c0,
        boardGrain: 0xbcb6a4,
        textColor: 0x9a2a1e,
      },
    },
  },

  // Placeholder signposts naming what each clearing will hold
  landmarks: {
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
    // M2 starts with all three so they can be compared. M9 gives the
    // shotgun at the campsite instead.
    startingLoadout: ['shovel', 'rifle', 'shotgun'],
    startingWeapon: 'rifle',
    switchSeconds: 0.35, // lower one weapon and raise the next
    headshotMultiplier: 3, // Aaron: x2 at least, open to x3-4
    fireSlowSeconds: 0.35, // movement stays slowed this long after a shot or swing
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
    },
  },

  // First aid kits (DESIGN.md "Healing"): kept in the inventory, used with
  // D-pad right (H), no animation.
  inventory: {
    startFirstAid: 2,
    maxFirstAid: 9,
    firstAidHeal: 30,
    // M4: loot that has no other home yet. Pistol ammo waits for the
    // pistol; scrap waits for building and repairs (M5).
    startScrap: 30, // M5: "a little bit of scrap" to patch the torn east fence (Aaron)
    startAmmo: { pistol: 0 },
    startBatteries: 0, // carried batteries (no carry limit and no slowdown: Aaron, M5)
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
      army: { health: 1.6 }, // fatigues and helmet: tougher
      earl: { health: 1 }, // Session 13: Earl Pruitt, the gas station's owner (one, authored: the storm shelter's hatch)
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
    seconds: 4,
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
      pathSpacing: 85, // metres along a pathway between verge cars (about 45 on a map in all, 35-60 by seed; Aaron: yes)
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
      centreClearance: 2.5, // metres (plus half its length) from a clearing's centre (pathways meet there)
      tries: 12, // attempts to fit each clearing car
      maxVehicles: 55,
    },
    batteryChance: 0.6, // Aaron: about 60%; the rest are dead or long gone
    alarmChance: 0.25, // of those with a battery: opening a door or the boot sets the alarm off
    hold: { search: 2.5, bonnet: 1.5, battery: 3 }, // seconds (Aaron: good)
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
    map: { minimapPixels: 7, screenPixels: 9, color: '#8fb8dc', doneColor: '#6e7072' }, // steel blue: tan read as part of the dashed pathways
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
      barricadeInside: 1.1, // a barricade is a second layer this far inside its segment
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
    hold: { repair: 1.5, build: 2.5, battery: 2, ledger: 0.35, climb: 1, load: 1, install: 2.5, releaseDrain: 2 }, // releaseDrain: let go and the bar empties this many times faster than it fills (Aaron)
    interactRange: 2.2,
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
      loadOrder: ['pistol', 'shotgun', 'rifle'], // the order ammo is listed in the turret's menu
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
      chainLink: 0x4e5357,
      hazard: 0x4a3808, // the fence box's stripe
      concrete: 0x302f2b, // the turret pad
      ammoCan: 0x20271a,
      sandbag: 0x5a5040,
      plank: 0x463424,
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
    startOn: true,
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
      minFactor: 0.05, // floor on the dimming, right up against something
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
    },
    // The family in the comms room, in the order the station places them.
    family: ['ellen', 'wyatt', 'junie'],
    // Lines with a "script" only play from their triggers while that script
    // is live. Day 1's real triggers are M9.2's; until then the debug menu
    // plays them (and can turn the script on to try them in a run).
    liveScripts: [],
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
        vest: 0x3a2418,
        boots: 0x3a2214,
        spur: 0x8a8a84,
      },
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
  },

  // Other people built with the figure kit (Session 13): the cutscenes'.
  // Same shape as config.family.people.
  people: {
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
    post: { height: 1.6, color: 0x3a3226, box: 0x2e3a2a, led: 0xff3020 },
    map: { color: '#9cdc8c', leadColor: '#ff6a4a', screenPixels: 6, minimapPixels: 4 },
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

  // Debug tools
  debug: {
    giveAmmoRounds: 20, // "Give ammo" adds this many to every gun
    populateCount: 100, // M6: "Zombies: populate the map" adds about this many
    fastForwardSteps: [1, 4, 10], // M6: world steps per frame for the debug fast-forward
    giveArmour: 40,
    giveFirstAid: 3,
    teleportOffset: 6, // metres from a clearing's centre that a teleport lands
    sigilTeleportOffset: 4, // metres from a sigil
    marchTeleportBehind: 25, // M6: metres behind a marcher that its debug teleport lands
    plantAhead: 3, // "plant sigil here" puts it this far in front of you
    witchTeleportBack: 18, // M7: metres from the witch that "teleport to her" lands
    giveScrap: 50, // M5: station debug
    siegeWave: 10,
    overlayVisibleOnStart: true, // on by default so tablet tests show fps
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
      radio: ['DpadDown'],
      inventory: ['View'],
      pause: ['Menu'],
      menuUp: ['DpadUp'],
      menuDown: ['DpadDown'],
      menuConfirm: ['A'],
      menuBack: ['B'],
      menuLeft: ['DpadLeft', 'LB'], // M5: ledger tabs
      menuRight: ['DpadRight', 'RB'],
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
      radio: ['KeyV'],
      inventory: ['Tab'],
      pause: ['Escape'],
      menuUp: ['ArrowUp'],
      menuDown: ['ArrowDown'],
      menuConfirm: ['Enter'],
      menuBack: ['Escape', 'Backspace'],
      menuLeft: ['ArrowLeft', 'KeyQ'], // M5: ledger tabs
      menuRight: ['ArrowRight'],
      debugOverlay: ['F3'],
      debugMenu: ['Backquote'],
    },
    // Action -> MouseEvent.button values (0 left, 1 middle, 2 right).
    mouseBindings: {
      attack: [0],
      aim: [2],
    },
    wheelAction: 'weaponNext', // mouse wheel fires this action
  },
};
