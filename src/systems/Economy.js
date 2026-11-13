import { CONFIG } from '../config.js';

// Cookie economy. Everything that earns or spends cookies goes through here,
// so upgrades / shop / multiplayer sync can hook in later in one place.
export class Economy {
  constructor() {
    this.cookies = 0;
    this.clickValue = CONFIG.economy.clickValue;
    this.passiveRate = CONFIG.economy.passivePerSec;
    this.onChange = null;        // (cookies, delta) => void
  }

  click() {
    this.add(this.clickValue);
  }

  add(amount) {
    this.cookies += amount;
    this.onChange?.(this.cookies, amount);
  }

  canAfford(cost) {
    return this.cookies >= cost;
  }

  spend(cost) {
    if (!this.canAfford(cost)) return false;
    this.cookies -= cost;
    this.onChange?.(this.cookies, -cost);
    return true;
  }

  update(dt, speed) {
    // Passive income scales a little with speed — going fast pays.
    this.passiveRate = CONFIG.economy.passivePerSec + speed * CONFIG.economy.passivePerSpeed;
    this.cookies += this.passiveRate * dt;
  }
}
