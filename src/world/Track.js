import * as THREE from 'three';
import { CONFIG } from '../config.js';

const { width: W, segmentLength: L, segmentCount: N } = CONFIG.track;

// Shared geometry/materials — every segment reuses them (cheap to recycle).
const floorGeo = new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0a22, roughness: 0.6, metalness: 0.3 });
const railGeo = new THREE.BoxGeometry(0.3, 0.6, L);
const railMatL = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 1.1 });
const railMatR = new THREE.MeshStandardMaterial({ color: 0xff2bd6, emissive: 0xff2bd6, emissiveIntensity: 1.1 });
const lineGeo = new THREE.BoxGeometry(W, 0.03, 0.12);
const lineMat = new THREE.MeshStandardMaterial({ color: 0x4b2bff, emissive: 0x4b2bff, emissiveIntensity: 1.0 });
const laneGeo = new THREE.BoxGeometry(0.06, 0.03, L);
const laneMat = new THREE.MeshStandardMaterial({ color: 0x2a1f66, emissive: 0x2a1f66, emissiveIntensity: 1.0 });
const blockGeo = new THREE.BoxGeometry(1, 1, 1);
const blockMat = new THREE.MeshStandardMaterial({ color: 0xff3366, emissive: 0xff1040, emissiveIntensity: 0.55 });

// Endless track: N segments laid out along -Z. When a segment falls behind the
// player it is moved to the front and re-populated with fresh obstacles.
export class Track {
  constructor(parent) {
    this.group = new THREE.Group();
    parent.add(this.group);
    this.segments = [];
    this.obstacles = [];      // flat list of live obstacles for collision checks

    for (let i = 0; i < N; i++) {
      const seg = this.#buildSegment();
      this.segments.push(seg);
      this.#placeSegment(seg, -i * L);
    }
  }

  #buildSegment() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(floorGeo, floorMat));

    const railL = new THREE.Mesh(railGeo, railMatL);
    railL.position.set(-W / 2, 0.3, 0);
    const railR = new THREE.Mesh(railGeo, railMatR);
    railR.position.set(W / 2, 0.3, 0);
    g.add(railL, railR);

    // Cross lines — these streaking past is what sells the speed.
    for (let z = -L / 2; z < L / 2; z += 5) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(0, 0.02, z);
      g.add(line);
    }
    for (const x of [-W / 6, W / 6]) {
      const lane = new THREE.Mesh(laneGeo, laneMat);
      lane.position.set(x, 0.02, 0);
      g.add(lane);
    }

    this.group.add(g);
    return { group: g, z: 0, obstacles: [] };
  }

  // centerZ is the segment's centre along the track.
  #placeSegment(seg, centerZ) {
    seg.z = centerZ;
    seg.group.position.z = centerZ;

    // Clear old obstacles.
    for (const o of seg.obstacles) {
      seg.group.remove(o.mesh);
      this.obstacles.splice(this.obstacles.indexOf(o), 1);
    }
    seg.obstacles = [];

    // Keep the opening stretch clear.
    if (-centerZ < CONFIG.obstacles.safeStartDistance) return;

    const count = Math.round(CONFIG.obstacles.perSegment * (0.5 + Math.random()));
    for (let i = 0; i < count; i++) {
      const w = 1.5 + Math.random() * 2.5;
      const h = 1 + Math.random() * 1.2;
      const d = 1.2;
      const x = (Math.random() - 0.5) * (W - w - 1);
      const localZ = (Math.random() - 0.5) * (L - 4);

      const mesh = new THREE.Mesh(blockGeo, blockMat);
      mesh.scale.set(w, h, d);
      mesh.position.set(x, h / 2, localZ);
      seg.group.add(mesh);

      const o = { mesh, x, z: centerZ + localZ, halfW: w / 2, halfD: d / 2, height: h, hit: false };
      seg.obstacles.push(o);
      this.obstacles.push(o);
    }
  }

  // playerZ is negative and decreasing (running toward -Z).
  update(playerZ) {
    for (const seg of this.segments) {
      if (seg.z - L / 2 > playerZ + 15) {
        // Segment fully behind camera → recycle to the front.
        const frontZ = Math.min(...this.segments.map((s) => s.z));
        this.#placeSegment(seg, frontZ - L);
      }
    }
  }

  reset() {
    this.segments.forEach((seg, i) => this.#placeSegment(seg, -i * L));
  }
}
