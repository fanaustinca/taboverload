import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { CONFIG } from '../config.js';
import { Input } from './Input.js';
import { Track } from '../world/Track.js';
import { Player } from '../world/Player.js';
import { Ramps } from '../world/Ramps.js';
import { Economy } from '../systems/Economy.js';
import { HUD } from '../ui/HUD.js';
import { PopupManager } from '../ui/PopupManager.js';

// Owns the renderer, the scene graph and the main loop, and wires systems together.
//
// Coordinate convention: all gameplay runs in the flat local space of `this.world`
// (player runs toward -Z, steers on X). `this.world` is tilted so the track looks
// like a downhill slope; the camera lives outside it so the horizon stays level.
export class Game {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07041a);
    this.scene.fog = new THREE.Fog(0x07041a, 60, 230);

    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 600);

    this.world = new THREE.Group();
    this.world.rotation.x = -THREE.MathUtils.degToRad(CONFIG.track.tiltDeg);
    this.scene.add(this.world);

    this.#buildLights();
    this.#buildBackdrop();

    // Post-processing: bloom is what makes "neon" actually glow.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.4, 0.7);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    // Systems
    this.input = new Input();
    this.economy = new Economy();
    this.track = new Track(this.world);
    this.player = new Player(this.world);
    this.ramps = new Ramps(this.world);
    this.hud = new HUD();
    this.popups = new PopupManager({ economy: this.economy });

    this.#bindInput();
    this.reset();

    this.clock = new THREE.Clock();
    this.running = false;
    window.addEventListener('resize', () => this.#resize());
    this.#resize();
    this.renderer.setAnimationLoop(() => this.#frame());
  }

  // ---------- setup ----------

  #buildLights() {
    this.scene.add(new THREE.HemisphereLight(0x6a5cff, 0x10051f, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(5, 20, 10);
    this.scene.add(key);
  }

  #buildBackdrop() {
    // Starfield.
    const n = 1500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 250 + Math.random() * 200;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 0.45;   // upper hemisphere only
      pos.set([r * Math.cos(th) * Math.cos(ph), r * Math.sin(ph) + 10, r * Math.sin(th) * Math.cos(ph)], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9fb8ff, size: 1.2, fog: false }));
    this.scene.add(this.stars);

    // Retro sun on the horizon (follows the camera so it's always "infinitely" far).
    const sunTex = this.#sunTexture();
    this.sun = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshBasicMaterial({ map: sunTex, color: 0x9a8a9a, transparent: true, fog: false, depthWrite: false })
    );
    this.scene.add(this.sun);
  }

  #sunTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#ffe14d');
    grad.addColorStop(0.55, '#ff2bd6');
    grad.addColorStop(1, '#6a00ff');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(128, 128, 120, 0, Math.PI * 2);
    g.fill();
    // Horizontal stripe cut-outs — classic synthwave sun.
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 7; i++) g.fillRect(0, 140 + i * 16, 256, 3 + i * 1.2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  #bindInput() {
    this.input.on('leftClick', (e) => {
      this.economy.click();
      this.hud.bumpCookies();
      this.#floatText(e.clientX, e.clientY, `+${this.economy.clickValue} 🍪`);
    });

    this.input.on('rightClick', () => {
      const cost = CONFIG.ramp.cost;
      if (cost && !this.economy.canAfford(cost)) return;
      if (this.ramps.spawn(this.player.x, this.player.z - CONFIG.ramp.distanceAhead)) {
        if (cost) this.economy.spend(cost);
      }
    });

    this.input.on('space', () => {
      if (this.player.state !== 'ragdoll') return;
      if (this.economy.spend(CONFIG.penalty.recoverCost)) {
        this.player.recover();
      } else {
        this.#floatText(window.innerWidth / 2, window.innerHeight * 0.3, 'Not enough cookies!', '#ff4d6d');
      }
    });

    this.input.on('key', (e) => this.popups.onKey(e));
  }

  #floatText(x, y, text, color) {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    if (color) el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  #resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- lifecycle ----------

  reset() {
    this.speed = CONFIG.speed.start;
    this.distance = 0;
    this.ragdollTimer = 0;
    this.player.reset();
    this.track.reset();
    this.ramps.clear();
    this.economy.cookies = 0;
    this.hud.reset();
    this.popups.reset();
  }

  start() {
    this.reset();
    this.running = true;
    this.input.enabled = true;
    this.clock.getDelta();
  }

  // ---------- main loop ----------

  #frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);   // clamp: tab-switch spikes
    if (this.running) this.update(dt);
    this.#updateCamera(dt);
    this.composer.render();
  }

  update(dt) {
    const p = this.player;
    const ragdolled = p.state === 'ragdoll';

    // 1. Speed engine — always accelerating; ragdoll slows you down.
    this.speed = Math.min(CONFIG.speed.max, this.speed + CONFIG.speed.accel * dt);
    const effSpeed = this.speed * (ragdolled ? CONFIG.speed.penaltyMultiplier : 1);
    this.distance += effSpeed * dt;
    p.z = -this.distance;

    // 2. Steering — mouse X maps to a target lane position.
    const half = CONFIG.track.width / 2 - 0.8;
    let targetX = this.input.mouseX * half;
    let resp = CONFIG.steer.responsiveness;
    if (ragdolled) {
      resp *= 0.15;   // control penalty: you barely steer while tumbling
      targetX += Math.sin(this.distance * 0.3) * CONFIG.steer.ragdollWobble;
    } else if (p.state === 'air') {
      resp *= 0.4;
    }
    const prevX = p.x;
    p.x = THREE.MathUtils.clamp(p.x + (targetX - p.x) * Math.min(1, resp * dt), -half, half);
    const steerDelta = (p.x - prevX) / Math.max(dt, 1e-4);

    // 3. Ramps (built by right-click).
    this.ramps.update(dt);
    if (this.ramps.checkLaunch(p)) p.launch(CONFIG.player.rampLaunch);

    // 4. Obstacles.
    for (const o of this.track.obstacles) {
      if (o.hit) continue;
      if (Math.abs(p.z - o.z) < o.halfD + 0.4 &&
          Math.abs(p.x - o.x) < o.halfW + CONFIG.player.radius * 0.6 &&
          p.y < o.height) {
        o.hit = true;
        o.mesh.visible = false;      // smashed (placeholder for a shatter effect)
        if (!ragdolled) {
          p.knockDown();
          this.ragdollTimer = 0;
          this.speed *= 0.75;
        }
      }
    }

    // 5. Ragdoll auto-recovery (Space pays to skip the wait).
    if (p.state === 'ragdoll') {
      this.ragdollTimer += dt;
      if (this.ragdollTimer > CONFIG.penalty.autoRecoverSec && p.grounded) p.recover();
    }

    p.update(dt, effSpeed, steerDelta);
    this.track.update(p.z);
    this.economy.update(dt, effSpeed);
    this.popups.update(dt);

    this.hud.update(dt, {
      cookies: this.economy.cookies,
      rate: this.economy.passiveRate,
      clickValue: this.economy.clickValue,
      speed: effSpeed,
      distance: this.distance,
      state: p.state,
      penaltyCost: CONFIG.penalty.recoverCost,
    });
  }

  #updateCamera(dt) {
    const p = this.player;
    // Gameplay space → world space via the tilted world group.
    const target = this.world.localToWorld(new THREE.Vector3(p.x * 0.6, 1.5 + p.y * 0.5, p.z - 10));
    const desired = this.world.localToWorld(new THREE.Vector3(p.x * 0.5, 0, p.z + 10));
    desired.y += 6 + p.y * 0.4;

    // Wider FOV at speed = sense of velocity.
    const fov = 68 + (this.speed - CONFIG.speed.start) * 0.15;
    this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 2);
    this.camera.updateProjectionMatrix();

    this.camera.position.lerp(desired, Math.min(1, dt * 8));
    if (p.state === 'ragdoll') {
      this.camera.position.x += (Math.random() - 0.5) * 0.15;  // impact shake
      this.camera.position.y += (Math.random() - 0.5) * 0.15;
    }
    this.camera.lookAt(target);

    // Keep the backdrop centred on the camera.
    this.stars.position.copy(this.camera.position);
    this.sun.position.set(this.camera.position.x, this.camera.position.y + 10, this.camera.position.z - 380);
  }
}
