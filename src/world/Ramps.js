import * as THREE from 'three';
import { CONFIG } from '../config.js';

const { width: RW, length: RL } = CONFIG.ramp;
const RH = 1.6;

// Wedge: low edge facing the player (+Z), high edge away (-Z).
function wedgeGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(RL, 0);
  shape.lineTo(RL, RH);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: RW, bevelEnabled: false });
  // Shape is in XY; rotate so its length runs along -Z and width along X.
  geo.rotateY(Math.PI / 2);
  geo.translate(-RW / 2, 0, RL / 2);
  return geo;
}

const geo = wedgeGeometry();
const edges = new THREE.EdgesGeometry(geo);

// Player-built ramps (right-click). Each lives CONFIG.ramp.lifetime seconds.
export class Ramps {
  constructor(parent) {
    this.parent = parent;
    this.list = [];
    this.cooldown = 0;
  }

  spawn(x, z) {
    if (this.cooldown > 0) return false;
    this.cooldown = CONFIG.ramp.cooldown;

    const mat = new THREE.MeshStandardMaterial({
      color: 0x1f5fff, emissive: 0x1a4dff, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.85,
    });
    const lineMat = new THREE.LineBasicMaterial({ color: 0x9fd0ff, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.add(new THREE.LineSegments(edges, lineMat));
    const halfTrack = CONFIG.track.width / 2 - RW / 2;
    x = THREE.MathUtils.clamp(x, -halfTrack, halfTrack);
    mesh.position.set(x, 0, z);
    mesh.scale.y = 0.01;              // grows in — "building" animation
    this.parent.add(mesh);

    this.list.push({ mesh, mat, lineMat, x, z, age: 0, used: false });
    return true;
  }

  // Returns true if the player just hit the ramp's lip this frame.
  checkLaunch(player) {
    for (const r of this.list) {
      if (r.used) continue;
      const inX = Math.abs(player.x - r.x) < RW / 2 + 0.3;
      const inZ = player.z < r.z + RL / 2 && player.z > r.z - RL / 2;
      if (inX && inZ && player.y < 0.5) {
        r.used = true;
        return true;
      }
    }
    return false;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const life = CONFIG.ramp.lifetime;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const r = this.list[i];
      r.age += dt;
      r.mesh.scale.y = Math.min(1, r.age / 0.15);
      // Blink during the last second as a despawn warning.
      const left = life - r.age;
      const a = left < 1 ? (Math.sin(r.age * 30) > 0 ? 0.85 : 0.25) : 0.85;
      r.mat.opacity = a;
      r.lineMat.opacity = a;
      if (r.age >= life) {
        this.parent.remove(r.mesh);
        r.mat.dispose();
        r.lineMat.dispose();
        this.list.splice(i, 1);
      }
    }
  }

  clear() {
    for (const r of this.list) this.parent.remove(r.mesh);
    this.list = [];
  }
}
