// ALL tuning numbers live here. Code never hard-codes a number that a
// designer might want to change. Every value is a placeholder until
// play-testing (M14).

export const config = {
  // Main loop
  loop: {
    maxFrameDt: 0.1, // seconds; longer frames (tab switch, hitch) are clamped
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
    startDay: 1,
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

  // Rendering (M0 uses a fixed render scale; M1 makes it dynamic)
  render: {
    renderScale: 0.65, // fraction of native resolution (tablet: ~1080p-class)
    maxDevicePixelRatio: 3,
    antialias: false,
    powerPreference: 'high-performance',
    fov: 70, // degrees, vertical
    near: 0.1,
    far: 120, // metres; keep >= fog far
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
    combos: {
      debugOverlay: { buttons: ['View', 'Menu'], holdSeconds: 0.6 },
      debugMenu: { buttons: ['L3', 'R3'], holdSeconds: 0.6 },
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
      switchWeapon: ['Y', 'RB'],
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
      switchWeapon: ['Digit1', 'Digit2', 'Digit3', 'Digit4'],
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
    wheelAction: 'switchWeapon', // mouse wheel fires this action
  },

  // Free-fly test camera (M0 only; M1 replaces it with the Player)
  testCamera: {
    moveSpeed: 4.5, // metres per second at full stick
    eyeHeight: 1.7, // metres
    pitchLimit: 85, // degrees up/down
    startPosition: { x: 0, z: 0 },
    startYaw: 0, // degrees
  },

  // Placeholder test scene (M0 only)
  testScene: {
    skyColor: 0x0b1020, // deep blue-black night
    fogColor: 0x0b1020,
    fogNear: 8,
    fogFar: 90,
    groundSize: 240, // metres, square
    groundColor: 0x2f4228,
    ambientColor: 0x5a6a90,
    ambientIntensity: 1.6,
    moonColor: 0x9fb4e0,
    moonIntensity: 1.8,
    moonDirection: { x: 0.4, y: 1, z: 0.25 },
    treeCount: 220,
    treeClearRadius: 6, // metres kept empty around the start position
    trunkColor: 0x5a4030,
    trunkWidth: 0.5,
    trunkHeightMin: 2.5,
    trunkHeightMax: 5,
    canopyColor: 0x24502e,
    canopyWidthMin: 2,
    canopyWidthMax: 3.5,
    canopyHeightMin: 3,
    canopyHeightMax: 6,
  },

  // UI
  ui: {
    toastSeconds: 3,
  },

  // Debug tools
  debug: {
    overlayVisibleOnStart: true, // M0: on by default so the tablet test shows fps
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
};
