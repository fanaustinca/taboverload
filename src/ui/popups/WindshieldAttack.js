import { CONFIG } from '../../config.js';

const COLORS = ['#ff2bd6', '#00f0ff', '#ffe14d', '#35ff8a', '#ff4d6d'];

// "Opponent attack": a doodle scribbled across your screen like paint on a
// windshield. It doesn't block input, only vision, and fades out over time.
// Later: replace the random scribbles with real strokes sent by an opponent.
export class WindshieldAttack {
  constructor(layer) {
    this.duration = CONFIG.popups.windshieldDuration;
    this.time = 0;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'windshield';
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    layer.appendChild(this.canvas);

    this.tag = document.createElement('div');
    this.tag.className = 'windshield-tag';
    this.tag.textContent = `✏️ ${['CookieGoblin', 'RampLord', 'F5_Spammer'][Math.floor(Math.random() * 3)]} doodled on your screen!`;
    layer.appendChild(this.tag);

    this.ctx2d = this.canvas.getContext('2d');
    this.strokes = Array.from({ length: 7 }, () => this.#randomStroke());
    this.drawn = 0;   // strokes animate in one by one
  }

  #randomStroke() {
    const w = this.canvas.width, h = this.canvas.height;
    let x = w * (0.2 + Math.random() * 0.6);
    let y = h * (0.25 + Math.random() * 0.5);
    let a = Math.random() * Math.PI * 2;
    const pts = [[x, y]];
    for (let i = 0; i < 40; i++) {
      a += (Math.random() - 0.5) * 1.2;
      x += Math.cos(a) * 18;
      y += Math.sin(a) * 18;
      pts.push([x, y]);
    }
    return { pts, color: COLORS[Math.floor(Math.random() * COLORS.length)], width: 10 + Math.random() * 18 };
  }

  #draw(progress) {
    const c = this.ctx2d;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const total = this.strokes.length * progress;
    this.strokes.forEach((s, i) => {
      const frac = Math.min(1, Math.max(0, total - i));
      if (frac <= 0) return;
      const n = Math.max(2, Math.floor(s.pts.length * frac));
      c.strokeStyle = s.color;
      c.lineWidth = s.width;
      c.globalAlpha = 0.85;
      c.beginPath();
      s.pts.slice(0, n).forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    });
  }

  update(dt) {
    this.time += dt;
    const drawIn = Math.min(1, this.time / 1.2);
    if (drawIn < 1 || this.drawn < 1) {
      this.#draw(drawIn);
      this.drawn = drawIn;
    }
    // Fade during the last 1.5s.
    const left = this.duration - this.time;
    this.canvas.style.opacity = String(Math.min(1, Math.max(0, left / 1.5)));
    this.tag.style.opacity = this.canvas.style.opacity;
    return this.time < this.duration;
  }

  destroy() {
    this.canvas.remove();
    this.tag.remove();
  }
}
