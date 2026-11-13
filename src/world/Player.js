import * as THREE from 'three';
import { CONFIG } from '../config.js';

const skin = new THREE.MeshStandardMaterial({ color: 0xd8e6f5, emissive: 0x0090c0, emissiveIntensity: 0.15, roughness: 0.5 });
const visor = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x00f0ff, emissiveIntensity: 2 });

function limb(len, r = 0.13) {
  // Pivot at the top of the limb so rotation swings it like a shoulder/hip.
  const geo = new THREE.CapsuleGeometry(r, len, 4, 8).translate(0, -len / 2, 0);
  return new THREE.Mesh(geo, skin);
}

// Placeholder ragdoll: a jointed stick-figure built from capsules.
// States: 'run' | 'air' | 'ragdoll'. Real physics ragdoll (Rapier/cannon) can
// replace the procedural flailing later without touching the rest of the game.
export class Player {
  constructor(parent) {
    this.root = new THREE.Group();     // position on the track
    this.body = new THREE.Group();     // rotations for leaning / tumbling
    this.root.add(this.body);
    parent.add(this.root);

    this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 4, 10), skin);
    this.torso.position.y = 1.45;
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), skin);
    this.head.position.y = 2.25;
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), visor);
    eye.position.set(0, 0.04, -0.27);
    this.head.add(eye);

    this.armL = limb(0.55); this.armL.position.set(-0.42, 1.85, 0);
    this.armR = limb(0.55); this.armR.position.set(0.42, 1.85, 0);
    this.legL = limb(0.65, 0.15); this.legL.position.set(-0.18, 1.0, 0);
    this.legR = limb(0.65, 0.15); this.legR.position.set(0.18, 1.0, 0);
    this.body.add(this.torso, this.head, this.armL, this.armR, this.legL, this.legR);

    // Soft glow under the player so they read against the dark floor.
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.9, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.25 })
    );
    glow.position.y = 0.03;
    this.shadow = glow;
    parent.add(glow);

    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vy = 0;
    this.state = 'run';
    this.ragdollTime = 0;
    this.animT = 0;
    this.spin = new THREE.Vector3();
    this.body.rotation.set(0, 0, 0);
  }

  get grounded() { return this.y <= 0.0001; }

  launch(vy) {
    this.vy = Math.max(this.vy, vy);
    if (this.state !== 'ragdoll') this.state = 'air';
  }

  knockDown() {
    if (this.state === 'ragdoll') return;
    this.state = 'ragdoll';
    this.ragdollTime = 0;
    this.vy = 6;
    this.spin.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 12);
  }

  recover() {
    this.state = this.grounded ? 'run' : 'air';
    this.body.rotation.set(0, 0, 0);
  }

  update(dt, speed, steerDeltaX) {
    // Vertical physics (jumps off ramps, knock-down hop).
    this.vy -= CONFIG.player.gravity * dt;
    this.y = Math.max(0, this.y + this.vy * dt);
    if (this.y === 0) {
      this.vy = 0;
      if (this.state === 'air') this.state = 'run';
    }

    this.animT += dt * (4 + speed * 0.12);
    const s = Math.sin(this.animT);

    if (this.state === 'ragdoll') {
      this.ragdollTime += dt;
      // Tumble, damped once on the ground, limbs flailing.
      const damp = this.grounded ? 0.92 : 1;
      this.spin.multiplyScalar(damp);
      this.body.rotation.x += this.spin.x * dt;
      this.body.rotation.y += this.spin.y * dt;
      this.body.rotation.z += this.spin.z * dt;
      if (this.grounded) {
        // Settle lying on the floor.
        this.body.rotation.x += (-Math.PI / 2 - this.body.rotation.x) * 4 * dt;
      }
      const f = this.ragdollTime * 14;
      this.armL.rotation.set(Math.sin(f) * 1.6, 0, -1.2 + Math.cos(f * 1.3));
      this.armR.rotation.set(Math.cos(f) * 1.6, 0, 1.2 - Math.sin(f * 1.1));
      this.legL.rotation.set(Math.sin(f * 0.8) * 1.2, 0, -0.4);
      this.legR.rotation.set(Math.cos(f * 0.9) * 1.2, 0, 0.4);
    } else if (this.state === 'air') {
      this.body.rotation.set(-0.25, 0, -steerDeltaX * 0.05);
      this.armL.rotation.set(-2.6, 0, -0.3);
      this.armR.rotation.set(-2.6, 0, 0.3);
      this.legL.rotation.set(0.6, 0, 0);
      this.legR.rotation.set(-0.3, 0, 0);
    } else {
      // Running: lean into turns, swing limbs.
      this.body.rotation.set(-0.15, 0, THREE.MathUtils.clamp(-steerDeltaX * 0.06, -0.5, 0.5));
      this.armL.rotation.set(s * 1.1, 0, -0.15);
      this.armR.rotation.set(-s * 1.1, 0, 0.15);
      this.legL.rotation.set(-s * 0.9, 0, 0);
      this.legR.rotation.set(s * 0.9, 0, 0);
    }

    this.root.position.set(this.x, this.y + (this.state === 'run' ? Math.abs(s) * 0.08 : 0), this.z);
    this.shadow.position.set(this.x, 0.03, this.z);
    this.shadow.material.opacity = 0.25 / (1 + this.y * 0.3);
  }
}
