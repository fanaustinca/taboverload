import { CONFIG } from '../../config.js';
import { createWindow } from './createWindow.js';

const WORDS = [
  'TABS', 'LOAD', 'NEON', 'RAMP', 'JUMP', 'FAST', 'CODE', 'BYTE', 'PING', 'LAGS',
  'SPAM', 'GLOW', 'DASH', 'RUSH', 'SLID', 'BAKE', 'CHIP', 'MILK', 'CRUM', 'BOOT',
  'ZOOM', 'WARP', 'GRID', 'LOOP', 'HACK', 'BUGS', 'WIFI', 'MODS', 'NOOB', 'EPIC',
];
const ROWS = 4;

// 4-letter, 4-guess word puzzle in a pop-up window.
// Type letters, Backspace, Enter. Solve before the timer for a cookie reward.
export class WordGuessPopup {
  constructor(layer, ctx) {
    this.ctx = ctx;
    this.answer = WORDS[Math.floor(Math.random() * WORDS.length)];
    this.row = 0;
    this.current = '';
    this.time = CONFIG.popups.wordTimeLimit;
    this.done = false;
    this.closeDelay = 1.2;

    const { win, body, timerBar } = createWindow(layer, '🟩 word-guess.tab — 4 letters');
    this.win = win;
    this.timerBar = timerBar;
    body.innerHTML = `
      <div class="word-grid">
        ${Array.from({ length: ROWS }, () =>
          `<div class="word-row">${'<div class="word-cell"></div>'.repeat(4)}</div>`).join('')}
      </div>
      <div class="popup-hint">Type to guess · Enter to submit · +${CONFIG.popups.wordReward} 🍪</div>`;
    this.rows = [...body.querySelectorAll('.word-row')].map((r) => [...r.children]);
    this.hint = body.querySelector('.popup-hint');
  }

  onKey(e) {
    if (this.done) return;
    if (e.key === 'Backspace') {
      this.current = this.current.slice(0, -1);
    } else if (e.key === 'Enter') {
      if (this.current.length === 4) this.#submit();
    } else if (/^[a-zA-Z]$/.test(e.key) && this.current.length < 4) {
      this.current += e.key.toUpperCase();
    } else {
      return;
    }
    this.#renderRow();
  }

  #renderRow() {
    this.rows[this.row].forEach((cell, i) => {
      cell.textContent = this.current[i] || '';
      cell.classList.toggle('filled', !!this.current[i]);
    });
  }

  #submit() {
    const guess = this.current;
    const ans = this.answer.split('');
    const result = Array(4).fill('miss');
    // Exact matches first, then near-matches against remaining letters.
    guess.split('').forEach((c, i) => { if (c === ans[i]) { result[i] = 'hit'; ans[i] = null; } });
    guess.split('').forEach((c, i) => {
      if (result[i] === 'hit') return;
      const j = ans.indexOf(c);
      if (j !== -1) { result[i] = 'near'; ans[j] = null; }
    });
    this.rows[this.row].forEach((cell, i) => cell.classList.add(result[i]));

    if (guess === this.answer) {
      this.#finish(true);
    } else if (++this.row >= ROWS) {
      this.#finish(false);
    }
    this.current = '';
  }

  #finish(won) {
    this.done = true;
    if (won) {
      this.ctx.economy.add(CONFIG.popups.wordReward);
      this.hint.textContent = `Solved! +${CONFIG.popups.wordReward} 🍪`;
    } else {
      this.hint.textContent = `Tab crashed. Answer: ${this.answer}`;
    }
  }

  update(dt) {
    if (this.done) return (this.closeDelay -= dt) > 0;
    this.time -= dt;
    this.timerBar.style.transform = `scaleX(${Math.max(0, this.time / CONFIG.popups.wordTimeLimit)})`;
    if (this.time <= 0) this.#finish(false);
    return true;
  }

  destroy() {
    this.win.remove();
  }
}
