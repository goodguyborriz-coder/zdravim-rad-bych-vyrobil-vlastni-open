import * as THREE from 'three';
import { createWaterNormalTexture } from './textures.js';

/**
 * Realistic Water & Hydrodynamics Simulation for Rotterdam River (Nieuwe Maas) & Canals.
 * Provides exact synchronized wave heights for rendering and boat buoyancy physics.
 */

export class WaterSystem {
  constructor(scene) {
    this.scene = scene;
    this.waterLevel = 1.0; // Base water altitude (meters)
    this.time = 0;

    // Gerstner Wave Parameters
    this.waves = [
      { dirX: 1.0, dirZ: 0.3, length: 18.0, amplitude: 0.28, speed: 1.4 },
      { dirX: 0.4, dirZ: 1.0, length: 11.0, amplitude: 0.16, speed: 1.8 },
      { dirX: -0.7, dirZ: 0.7, length: 6.0, amplitude: 0.08, speed: 2.2 }
    ];

    this.initWaterMesh();
    this.initWakeParticles();
  }

  // Exact mathematical water elevation at any (x, z)
  getWaterHeight(x, z, t = this.time) {
    let y = this.waterLevel;
    for (const w of this.waves) {
      const k = (2 * Math.PI) / w.length;
      const c = Math.sqrt(9.82 / k) * w.speed * 0.35;
      const dot = (w.dirX * x + w.dirZ * z) / Math.sqrt(w.dirX * w.dirX + w.dirZ * w.dirZ);
      y += w.amplitude * Math.sin(k * dot - c * t);
    }
    return y;
  }

  // Wave normal vector at (x, z) for realistic boat tilt
  getWaterNormal(x, z, t = this.time) {
    const eps = 0.5;
    const hL = this.getWaterHeight(x - eps, z, t);
    const hR = this.getWaterHeight(x + eps, z, t);
    const hD = this.getWaterHeight(x, z - eps, t);
    const hU = this.getWaterHeight(x, z + eps, t);

    const normal = new THREE.Vector3(
      -(hR - hL) / (2 * eps),
      1.0,
      -(hU - hD) / (2 * eps)
    ).normalize();
    return normal;
  }

  initWaterMesh() {
    // High-resolution water plane covering the river Nieuwe Maas and adjoining canals
    const waterGeo = new THREE.PlaneGeometry(1600, 1600, 128, 128);
    waterGeo.rotateX(-Math.PI / 2);

    this.waterNormalMap = createWaterNormalTexture();

    // Custom Water Material with depth shading and sun glare
    this.waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x14425a,
      roughness: 0.15,
      metalness: 0.85,
      normalMap: this.waterNormalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      transparent: true,
      opacity: 0.88
    });

    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMaterial);
    this.waterMesh.position.y = this.waterLevel;
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);

    // River bed / canal bottom
    const bedGeo = new THREE.PlaneGeometry(1600, 1600);
    bedGeo.rotateX(-Math.PI / 2);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x09141c,
      roughness: 0.95,
      metalness: 0.05
    });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.position.y = this.waterLevel - 6.5; // 6.5m river depth
    this.scene.add(bedMesh);
  }

  initWakeParticles() {
    // Particle system for boat propeller foam and bow wave spray
    const count = 400;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const opacities = new Float32Array(count);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] = -1000; // start hidden
      opacities[i] = 0;
      scales[i] = 1;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    geo.setAttribute('size', new THREE.BufferAttribute(scales, 1));

    const pMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });

    this.wakeParticles = new THREE.Points(geo, pMat);
    this.scene.add(this.wakeParticles);

    this.particleData = [];
    for (let i = 0; i < count; i++) {
      this.particleData.push({
        x: 0, y: -1000, z: 0,
        vx: 0, vy: 0, vz: 0,
        life: 0, maxLife: 1.5,
        scale: 1
      });
    }
    this.particleIndex = 0;
  }

  emitWake(pos, forwardDir, speed) {
    if (speed < 0.5) return;
    const numToEmit = Math.min(6, Math.floor(speed * 0.4));
    const pPos = this.wakeParticles.geometry.attributes.position.array;

    for (let k = 0; k < numToEmit; k++) {
      const p = this.particleData[this.particleIndex];
      p.x = pos.x + (Math.random() - 0.5) * 1.5 - forwardDir.x * 2.2;
      p.y = this.getWaterHeight(p.x, pos.z, this.time) + 0.05;
      p.z = pos.z + (Math.random() - 0.5) * 1.5 - forwardDir.z * 2.2;

      const spread = (Math.random() - 0.5) * 1.5;
      p.vx = -forwardDir.x * (speed * 0.2) + spread;
      p.vy = Math.random() * 0.5;
      p.vz = -forwardDir.z * (speed * 0.2) + spread;
      p.life = 1.0;
      p.maxLife = 1.2 + Math.random() * 0.8;

      pPos[this.particleIndex * 3] = p.x;
      pPos[this.particleIndex * 3 + 1] = p.y;
      pPos[this.particleIndex * 3 + 2] = p.z;

      this.particleIndex = (this.particleIndex + 1) % this.particleData.length;
    }
    this.wakeParticles.geometry.attributes.position.needsUpdate = true;
  }

  update(dt) {
    this.time += dt;

    // Scroll normal map for flowing current
    if (this.waterNormalMap) {
      this.waterNormalMap.offset.x = (this.time * 0.02) % 1;
      this.waterNormalMap.offset.y = (this.time * 0.015) % 1;
    }

    // Update wake particles
    const pPos = this.wakeParticles.geometry.attributes.position.array;
    for (let i = 0; i < this.particleData.length; i++) {
      const p = this.particleData[i];
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.y = this.getWaterHeight(p.x, p.z, this.time) + 0.04;

        pPos[i * 3] = p.x;
        pPos[i * 3 + 1] = p.y;
        pPos[i * 3 + 2] = p.z;
      } else {
        pPos[i * 3 + 1] = -1000;
      }
    }
    this.wakeParticles.geometry.attributes.position.needsUpdate = true;
  }
}
