import { CONFIG } from '../config.js';
import { WordGuessPopup } from './popups/WordGuessPopup.js';
import { WindshieldAttack } from './popups/WindshieldAttack.js';

// Schedules and owns every pop-up. Each pop-up implements:
//   constructor(layer, ctx)  — build DOM inside #popup-layer
//   update(dt) -> boolean    — return false when finished
//   onKey?(e)                — optional keyboard input
//   destroy()                — remove DOM
// Add new minigames by registering them in POPUP_TYPES.
const POPUP_TYPES = [
  { name: 'word', Cls: WordGuessPopup, weight: 1 },
  { name: 'windshield', Cls: WindshieldAttack, weight: 1 },
];

export class PopupManager {
  constructor(ctx) {
    this.layer = document.getElementById('popup-layer');
    this.ctx = ctx;            // { economy, toast } — shared services for pop-ups
    this.active = [];
    this.reset();
  }

  reset() {
    this.active.forEach((p) => p.destroy());
    this.active = [];
    this.timer = CONFIG.popups.firstDelay;
  }

  spawn(Cls) {
    // One of each type at a time keeps the chaos readable (for now).
    if (this.active.some((p) => p instanceof Cls)) return null;
    const p = new Cls(this.layer, this.ctx);
    this.active.push(p);
    return p;
  }

  // Debug / scripted spawns: game.popups.spawnByName('word' | 'windshield')
  spawnByName(name) {
    const t = POPUP_TYPES.find((t) => t.name === name);
    return t ? this.spawn(t.Cls) : null;
  }

  spawnRandom() {
    const total = POPUP_TYPES.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * total;
    for (const t of POPUP_TYPES) {
      if ((r -= t.weight) <= 0) return this.spawn(t.Cls);
    }
  }

  onKey(e) {
    for (const p of this.active) p.onKey?.(e);
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      const { minInterval, maxInterval } = CONFIG.popups;
      this.timer = minInterval + Math.random() * (maxInterval - minInterval);
      this.spawnRandom();
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (!this.active[i].update(dt)) {
        this.active[i].destroy();
        this.active.splice(i, 1);
      }
    }
  }
}
