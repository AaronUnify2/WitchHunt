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
    grade: {
      saturation: 0.8, // 1 = unchanged
      contrast: 1, // 1 = unchanged; above 1 crushes night shadows to black
      tint: 0xc4d2ff, // multiplied in at tintStrength: cold moonlit grade
      tintStrength: 0.1,
    },
    vignette: {
      strength: 0.35, // how dark the corners get (0..1)
      start: 0.45, // distance from centre (0 = centre, 1 = corner) where it begins
    },
    grain: {
      strength: 0.045, // subtle film grain amplitude
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
    keys: [
      { hour: 0, skyTop: 0x050915, horizon: 0x18233a, ambient: 0x3a4a78, ambientIntensity: 1.1, light: 0x8ea6dc, lightIntensity: 0.9, stars: 1 },
      { hour: 5.25, skyTop: 0x050915, horizon: 0x18233a, ambient: 0x3a4a78, ambientIntensity: 1.1, light: 0x8ea6dc, lightIntensity: 0.9, stars: 1 },
      { hour: 6.5, skyTop: 0x2c3c60, horizon: 0x8a6c72, ambient: 0x6a72a0, ambientIntensity: 0.8, light: 0xffb98c, lightIntensity: 0.9, stars: 0.15 },
      { hour: 8, skyTop: 0x5d7da6, horizon: 0x9ca8b4, ambient: 0xa4b0c8, ambientIntensity: 1.2, light: 0xfff0dc, lightIntensity: 1.8, stars: 0 },
      { hour: 17.5, skyTop: 0x5d7da6, horizon: 0x9ca8b4, ambient: 0xa4b0c8, ambientIntensity: 1.2, light: 0xfff0dc, lightIntensity: 1.8, stars: 0 },
      { hour: 19, skyTop: 0x2a2c52, horizon: 0x9a5c4a, ambient: 0x5c5274, ambientIntensity: 0.75, light: 0xff9c62, lightIntensity: 0.8, stars: 0.15 },
      { hour: 20, skyTop: 0x050915, horizon: 0x18233a, ambient: 0x3a4a78, ambientIntensity: 1.1, light: 0x8ea6dc, lightIntensity: 0.9, stars: 1 },
    ],
  },

  // Fog: linear, ending at the quality preset's draw distance.
  fog: {
    nearFraction: 0.12, // fog starts at this fraction of the draw distance
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
    bands: {
      north: [0, 0.34],
      middle: [0.34, 0.67],
      south: [0.67, 1],
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
      xSpread: 0.3, // fraction of the walkable width either side of the centre line it can sit
    },
    campsite: {
      distanceMin: 95, // centre to centre from home
      distanceMax: 150,
      arcDegrees: 150, // placed within this arc, centred on south
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
      maxNorthDetour: 2.5, // rule: from home, every north clearing is at most this many times its straight-line distance away by pathway
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
    textureSize: 256, // pixels, procedural placeholder texture
    tileMeters: 6, // ground texture repeats every this many metres
    grassColor: 0x3a4a2c,
    dirtColor: 0x5a4834,
    mossColor: 0x324a2c,
    litterColor: 0x6a5434, // fallen leaves and needles
    blotchCount: 900, // texture detail
    blotchSizeMin: 3, // pixels
    blotchSizeMax: 14,
    blotchAlpha: 0.25,
    speckCount: 2500,
    speckSize: 2, // pixels
    // Bare dirt on pathways and in clearings (a second tiled texture)
    pathDirtColor: 0x5e4a36,
    pathLitterColor: 0x6c5a40,
    pathStoneColor: 0x4e4a42,
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
    heightMin: 9,
    heightMax: 17,
    widthRatioMin: 0.38, // sprite width as a fraction of its height
    widthRatioMax: 0.5,
    trunkRadius: 0.3, // collision radius
    chunkSize: 48, // metres; chunks beyond the draw distance aren't drawn
    cullRefreshDistance: 4, // metres the camera moves before nearby chunks are re-checked
    textureVariants: 3, // conifer, conifer, dead tree
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
    textureWidth: 256,
    textureHeight: 512,
    trunkColor: 0x4a3828,
    needleDark: 0x1d3322,
    // Each branch tier's lit side picks one of these, so trees aren't one flat green.
    needleVariants: [0x47694a, 0x3d5e3a, 0x557550, 0x4c6c3c, 0x3a5c44],
    deadColor: 0x4a4038,
    // Dappling: small speckles painted over the needles for depth and leaf variety.
    dappleCount: 6000, // speckles per conifer sprite
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
    tiersMin: 7, // conifer branch tiers
    tiersMax: 11,
    spikesPerTier: 9, // jagged needles along each tier's edge
    deadBranches: 9,
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
    hip: { x: 0.2, y: -0.21, z: -0.46 },
    aim: { x: 0, y: -0.105, z: -0.36 }, // centred under the crosshair
    shovelHip: { x: 0.2, y: -0.28, z: -0.5 },
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
    swingDegrees: 110, // shovel swing arc, right to left
    muzzleFlashSeconds: 0.05,
    muzzleFlashColor: 0xffd890,
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
    // Placeholder sprite (drawn on a canvas; final sprites in the art pass)
    texture: {
      frameWidth: 96,
      frameHeight: 128,
      // Dark albedos: the torch blows out anything light (as with the rocks).
      skin: 0x4e5844,
      skinDark: 0x2c3428,
      shirt: 0x20262e,
      shirtAlt: 0x34221e,
      trousers: 0x16161a,
      hair: 0x120e0c,
      blood: 0x2e0404,
      eyes: 0xc8c090, // the pale eyes are meant to catch the torch
      bloodSpots: 14,
      // One block of 8 facing rows per variant, in this order (the shader
      // picks the block). Each variant overrides the colours above and
      // adds its kit: a police vest and cap, an army helmet.
      variantOrder: ['citizen', 'police', 'army'],
      variants: {
        citizen: {},
        police: { shirt: 0x161c2c, shirtAlt: 0x101420, trousers: 0x12141c, vest: 0x2a3038, hat: 'cap', hatColor: 0x0e1018 },
        army: { shirt: 0x283020, shirtAlt: 0x1c2216, trousers: 0x20261a, hat: 'helmet', hatColor: 0x2a3222 },
      },
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
    look: {
      skin: 0x4a5040,
      skinDark: 0x2e3428,
      cloth: 0x1c1c22,
      hitFlash: [2.2, 0.6, 0.6], // instance colour while flashing
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
      radioGap: 10, // seconds between radio calls of the same kind
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
    // Planting (Aaron, M7): she hides in her hut by day and sets out at
    // dusk. Night 1 is safe; from night 2 she plants one sigil a night,
    // and from night 3 sometimes a second if the night allows.
    firstNight: 2,
    secondFromNight: 3,
    secondChance: 0.4,
    plantSeconds: 120, // DESIGN.md: "plants a sigil over 2-3 minutes"
    lateCutoff: 0.8, // she doesn't start out for another sigil past this share of the night
    // Movement: a loping run on the pathways (the player sprints at 7.2 m/s).
    roamSpeed: 5.5, // metres per second while travelling, near the player
    abstractScale: 3, // out of sight (beyond the zombies' nearby radius) she travels this much faster
    turnRate: 8, // radians per second
    radius: 0.3, // body collision
    reach: 1.2, // metres from a waypoint before she heads for the next
    unstickSeconds: 0.6, // barely moving this long: she sidesteps
    unstickDistance: 3, // metres to the side
    soundEvery: 3.5, // seconds between her ritual songs
    songRange: 70, // metres her singing carries
    // Placeholder look (Aaron agreed; she gets more detail in the art pass).
    look: {
      height: 2.3, // metres
      cloak: 0x17130f,
      cloakHem: 0x1d1813,
      skin: 0x2c2c24, // dark, like the zombies' albedos: the torch washes anything paler to white up close
      sticks: 0x2a1f15,
      eyes: 0xd6ff6a, // unlit, so the torch (and the bloom) picks them out
      stoop: 0.28, // radians she leans forward when she walks
      runBob: 0.08, // metres
      stride: 1.6, // metres per arm swing
      kneelDrop: 0.55, // metres she sinks to her knees while planting
      ritual: { color: 0x9cff4a, radius: 1.6, opacity: 0.55, pulse: 1.4 }, // the glowing ring round her as she plants
    },
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
      family: [0x5a6a7a, 0x6a5a48, 0x7a5a6a], // Ellen, Wyatt, Junie (placeholders)
      windowGlow: 0xffb060,
      monitorGlow: 0x7adcb0,
      wireCharged: 0x6ad0ff,
      wireDead: 0x3a3c40,
      emptySlot: 0x2a2a2a,
      chainLinkTexture: 128, // pixels
      cullMargin: 40, // metres beyond the draw distance the compound stays drawn
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
    },
  },

  // UI
  ui: {
    toastSeconds: 3,
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
