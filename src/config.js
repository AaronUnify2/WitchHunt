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
    // M1 starts at night so the flashlight test needs no skipping.
    // M9 sets the real start (the opening has Tom wake at dawn).
    startPhase: 'night',
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
    boundaryRadius: 100, // metres from the clearing centre the player can walk
  },

  // The M1 test clearing's ground
  terrain: {
    size: 260, // metres, square ground plane
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
    clearingRadius: 13, // dirt patch in the clearing centre
    clearingEdge: 0.35, // fraction of the radius that fades out
    clearingTextureSize: 256,
    clearingNoiseCount: 400,
    rocks: {
      count: 9,
      sizeMin: 0.35,
      sizeMax: 1.1,
      squash: 0.6, // rocks are flattened vertically by this factor
      detail: 3, // smoothness: subdivision level of the base sphere
      lumpiness: 0.32, // how far the surface bulges in and out, as a fraction of size
      lumps: 6, // number of overlapping bulge waves shaping each rock
      lumpFrequency: 4, // waviness of each bulge
      stretch: 0.3, // each rock is stretched up to this much along its width and depth
      color: 0x45443d, // dark, mossy grey: lighter rocks glare under the torch
      spreadMin: 5, // placed between these distances from the centre
      spreadMax: 14,
      colliderScale: 0.8, // collider radius as a fraction of rock size
    },
  },

  // Forest: instanced billboard trees (decided with Aaron in M1: every
  // tree is a camera-facing sprite; final art replaces the procedural
  // placeholder in the art pass)
  forest: {
    clearingRadius: 16, // no trees inside this radius
    forestRadius: 115, // no trees beyond this radius
    cellSize: 3.4, // jittered-grid spacing: one tree per cell
    jitter: 0.75, // fraction of a cell a tree can wander from its cell centre
    heightMin: 9,
    heightMax: 17,
    widthRatioMin: 0.38, // sprite width as a fraction of its height
    widthRatioMax: 0.5,
    trunkRadius: 0.3, // collision radius
    chunkSize: 32, // metres; chunks beyond the draw distance aren't drawn
    textureVariants: 3, // conifer, conifer, dead tree
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
    startPosition: { x: 0, z: 0 },
    startYaw: 0, // degrees
    headBob: {
      amplitude: 0.035, // metres at walking speed
      frequency: 0.9, // bob cycles per metre travelled
      returnSpeed: 8, // how fast the bob settles when stopping
    },
    stamina: {
      max: 100,
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
    },
    rifle: {
      name: 'Service rifle',
      kind: 'hitscan',
      damage: 25,
      pellets: 1,
      spreadDegrees: 1.2, // from the hip
      aimSpreadDegrees: 0, // aimed down sights
      range: 150,
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
    },
    shotgun: {
      name: 'Shotgun',
      kind: 'hitscan',
      damage: 6,
      pellets: 8,
      spreadDegrees: 6,
      aimSpreadDegrees: 4,
      range: 45,
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
    },
  },

  // Aiming down sights (LT)
  aiming: {
    zoomSpeed: 12, // how fast the view eases in and out of the zoom
  },

  // Weapons in hand (placeholder shapes; real models in the art pass).
  // Offsets are metres in camera space: x right, y up, z forward is negative.
  viewModel: {
    brightness: 0.3, // unlit colours are scaled by this (the torch sits beside the gun)
    hip: { x: 0.2, y: -0.21, z: -0.46 },
    aim: { x: 0, y: -0.105, z: -0.36 }, // centred under the crosshair
    shovelHip: { x: 0.2, y: -0.28, z: -0.5 },
    bobAmount: 0.012, // metres of sway at walking pace
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
  },

  // Zombies (M2: one "citizen" sprite type walking straight at the player;
  // detection and targeting arrive in M4).
  zombies: {
    poolSize: 25, // the active enemy cap (DESIGN.md budgets)
    health: 60,
    radius: 0.35, // body collision radius, metres
    hitRadius: 0.3, // body hit cylinder
    height: 1.8,
    headBottom: 1.42, // the head hit box runs from here to height
    headRadius: 0.16,
    spriteHeightRatio: 1.08, // sprite height = height x this; width follows the frame's aspect
    // Speeds are multiples of the player's full sprint (DESIGN.md "Zombies"),
    // rolled per zombie and skewed toward the slow end.
    sprintSpeed: 7.2, // player walk 4.5 x sprint 1.6
    speedSkew: 2, // 1 = even spread; higher = more slow zombies
    levels: {
      1: { speedMin: 0.35, speedMax: 0.45 },
      5: { speedMin: 0.5, speedMax: 1.3 },
    },
    turnRate: 6, // how fast a zombie turns to face where it's going
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
    },
    alphaTest: 0.5,
    normalUpBias: 0.4,
    albedoScale: 0.45, // sprites face the torch head-on, so they need darker colours than the art suggests
    hitFlashColor: 0x8a1010,
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
      poolSize: 96, // particles
      perHit: 6,
      perHeadshot: 12,
      speed: 2.2,
      gravity: 9,
      seconds: 0.6,
      size: 0.09,
      color: 0x6a0a0a,
      dustColor: 0x5a4c3a, // missed shots puff off trees and the ground
      dustPerImpact: 4,
    },
  },

  // Placeholder HUD (the final pixel-font HUD is Session 19).
  hud: {
    healthSegments: 10,
    hitMarkerSeconds: 0.18,
    hurtVignetteSeconds: 0.5,
    lowHealth: 30, // the health bar pulses at or below this
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
    },
  },

  // UI
  ui: {
    toastSeconds: 3,
  },

  // Debug tools
  debug: {
    giveAmmoRounds: 20, // "Give ammo" adds this many to every gun
    giveArmour: 40,
    giveFirstAid: 3,
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
      weaponPrev: ['Y'],
      firstAid: ['DpadRight'], // quick-use a first aid kit (Aaron, Session 3)
      flare: ['LB'],
      map: ['DpadUp'],
      flashlight: ['DpadLeft'],
      radio: ['DpadDown'],
      inventory: ['View'],
      pause: ['Menu'],
      menuUp: ['DpadUp'],
      menuDown: ['DpadDown'],
      menuConfirm: ['A'],
      menuBack: ['B'],
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
