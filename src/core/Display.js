// Fullscreen, landscape lock and screen wake lock for the tablet.
// Fullscreen and the orientation lock need a user gesture, so enter()
// must be called straight from a tap/click/key handler.
// Emits 'display:fullscreenChanged' { fullscreen }.

export class Display {
  constructor(displayConfig, bus) {
    this.cfg = displayConfig;
    this.bus = bus;
    this.wakeLock = null;
    this.wantAwake = false;
  }

  init() {
    this.onChange = () => {
      this.bus.emit('display:fullscreenChanged', { fullscreen: this.isFullscreen });
    };
    // The browser drops the wake lock whenever the tab is hidden.
    this.onVisibility = () => {
      if (document.visibilityState === 'visible' && this.wantAwake) this.requestWakeLock();
    };
    document.addEventListener('fullscreenchange', this.onChange);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  update() {}

  dispose() {
    document.removeEventListener('fullscreenchange', this.onChange);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.wantAwake = false;
    this.wakeLock?.release().catch(() => {});
    this.wakeLock = null;
  }

  get fullscreenSupported() {
    return typeof document.documentElement.requestFullscreen === 'function';
  }

  get isFullscreen() {
    return Boolean(document.fullscreenElement);
  }

  // Go fullscreen, then lock to landscape where the browser allows it
  // (Android Chrome only allows the lock while fullscreen). Failures are
  // fine: the game still runs windowed.
  async enter() {
    if (this.cfg.keepScreenAwake) {
      this.wantAwake = true;
      this.requestWakeLock();
    }
    if (this.cfg.requestFullscreen && this.fullscreenSupported && !this.isFullscreen) {
      try {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      } catch (err) {
        console.warn('Display: fullscreen refused', err);
      }
    }
    if (this.cfg.lockLandscape && this.isFullscreen && screen.orientation?.lock) {
      try {
        await screen.orientation.lock('landscape');
      } catch (err) {
        console.warn('Display: orientation lock refused', err);
      }
    }
  }

  async requestWakeLock() {
    if (!navigator.wakeLock || (this.wakeLock && !this.wakeLock.released)) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {
      console.warn('Display: wake lock refused', err);
    }
  }
}
