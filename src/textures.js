import * as THREE from 'three';

/**
 * Procedural texture generator for roads, sidewalks, water, and environment.
 * Generates high quality, tileable canvas textures with zero external network dependencies.
 */

// 1. Asphalt road texture with realistic grain
export function createAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base dark asphalt
  ctx.fillStyle = '#222428';
  ctx.fillRect(0, 0, 512, 512);

  // Noise grains
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 28;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

// 2. Road texture with white markings and lane dividers
export function createMarkedRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Asphalt base
  ctx.fillStyle = '#24272c';
  ctx.fillRect(0, 0, 512, 512);

  // Grain
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 20;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  // Outer solid lines
  ctx.fillStyle = '#e8edf0';
  ctx.fillRect(16, 0, 10, 512);
  ctx.fillRect(486, 0, 10, 512);

  // Center dashed line
  ctx.fillStyle = '#f0f3f6';
  const dashH = 48;
  const gap = 32;
  for (let y = 8; y < 512; y += dashH + gap) {
    ctx.fillRect(251, y, 10, dashH);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// 3. Sidewalk / Quay cobblestone paving
export function createPavingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base concrete/stone
  ctx.fillStyle = '#7a7e85';
  ctx.fillRect(0, 0, 512, 512);

  const tileSize = 32;
  ctx.strokeStyle = '#55585f';
  ctx.lineWidth = 2;

  for (let x = 0; x < 512; x += tileSize) {
    for (let y = 0; y < 512; y += tileSize) {
      const shade = (Math.random() - 0.5) * 16;
      ctx.fillStyle = `rgb(${120 + shade}, ${124 + shade}, ${130 + shade})`;
      ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
      ctx.strokeRect(x, y, tileSize, tileSize);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  return texture;
}

// 4. Water normal map for realistic ripple distortion
export function createWaterNormalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(256, 256);
  const d = imgData.data;

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 4;
      const nx = Math.sin(x * 0.1) * Math.cos(y * 0.08) * 40;
      const ny = Math.cos(x * 0.08) * Math.sin(y * 0.1) * 40;
      d[idx] = 128 + nx;       // Normal X
      d[idx + 1] = 128 + ny;   // Normal Y
      d[idx + 2] = 255;        // Normal Z (up)
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  return texture;
}
