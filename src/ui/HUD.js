const $ = (id) => document.getElementById(id);

const BOT_NAMES = ['xX_TabHoarder', 'Ctrl_Alt_Defeat', 'CookieGoblin', 'RampLord', 'F5_Spammer'];

// DOM HUD. Only touches the DOM when values actually change.
export class HUD {
  constructor() {
    this.el = {
      cookies: $('cookie-count'),
      rate: $('cookie-rate'),
      click: $('cookie-click'),
      speed: $('stat-speed'),
      distance: $('stat-distance'),
      state: $('stat-state'),
      leaderboard: $('leaderboard'),
      penalty: $('penalty-banner'),
      penaltyCost: $('penalty-cost'),
    };
    this.cache = {};
    // Fake opponents until multiplayer exists. Each has its own pace.
    this.bots = BOT_NAMES.map((name) => ({ name, dist: Math.random() * 40, pace: 0.85 + Math.random() * 0.3 }));
    this.lbTimer = 0;
  }

  #set(key, el, value) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    el.textContent = value;
  }

  bumpCookies() {
    const el = this.el.cookies;
    el.classList.remove('bump');
    void el.offsetWidth; // restart animation
    el.classList.add('bump');
  }

  update(dt, { cookies, rate, clickValue, speed, distance, state, penaltyCost }) {
    this.#set('cookies', this.el.cookies, Math.floor(cookies).toLocaleString());
    this.#set('rate', this.el.rate, rate.toFixed(1));
    this.#set('click', this.el.click, String(clickValue));
    this.#set('speed', this.el.speed, `${Math.round(speed)} u/s`);
    this.#set('distance', this.el.distance, `${Math.floor(distance)} m`);
    this.#set('penaltyCost', this.el.penaltyCost, String(penaltyCost));

    if (this.cache.state !== state) {
      this.cache.state = state;
      const label = { run: 'RUNNING', air: 'AIRBORNE', ragdoll: 'RAGDOLLED' }[state];
      const cls = { run: 'state-ok', air: 'state-air', ragdoll: 'state-bad' }[state];
      this.el.state.textContent = label;
      this.el.state.className = cls;
      this.el.penalty.classList.toggle('hidden', state !== 'ragdoll');
    }

    // Leaderboard refreshes 4×/sec — no need to rebuild DOM every frame.
    for (const b of this.bots) b.dist += speed * b.pace * dt;
    this.lbTimer -= dt;
    if (this.lbTimer <= 0) {
      this.lbTimer = 0.25;
      const rows = [...this.bots, { name: 'YOU', dist: distance, me: true }]
        .sort((a, b) => b.dist - a.dist);
      this.el.leaderboard.innerHTML = rows
        .map((r, i) => `<li class="${r.me ? 'me' : ''}"><span>${i + 1}. ${r.name}</span><span>${Math.floor(r.dist)}m</span></li>`)
        .join('');
    }
  }

  reset() {
    this.cache = {};
    this.bots.forEach((b) => (b.dist = Math.random() * 40));
  }
}
