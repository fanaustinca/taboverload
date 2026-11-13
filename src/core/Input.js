// Centralised input: mouse steering, left/right click, keyboard.
// Systems subscribe via on('leftClick' | 'rightClick' | 'space' | 'key', fn).
export class Input {
  constructor(target = window) {
    this.mouseX = 0;           // normalised -1 (left edge) .. +1 (right edge)
    this.enabled = false;
    this.listeners = {};

    target.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    });

    // Touch fallback so it at least steers on a phone / tablet.
    target.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t) this.mouseX = (t.clientX / window.innerWidth) * 2 - 1;
    }, { passive: true });

    target.addEventListener('mousedown', (e) => {
      if (!this.enabled || this.#isUiTarget(e.target)) return;
      if (e.button === 0) this.#emit('leftClick', e);
      if (e.button === 2) this.#emit('rightClick', e);
    });

    // Right-click must never open the browser menu.
    target.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.code === 'Space') {
        e.preventDefault();            // stop page scroll
        if (!e.repeat) this.#emit('space', e);
        return;
      }
      this.#emit('key', e);
    });
  }

  on(event, fn) {
    (this.listeners[event] ||= []).push(fn);
  }

  #emit(event, payload) {
    for (const fn of this.listeners[event] || []) fn(payload);
  }

  // Clicks inside pop-up windows or buttons belong to that UI, not the game.
  #isUiTarget(el) {
    return !!el.closest?.('.popup-window, button, #start-screen');
  }
}
