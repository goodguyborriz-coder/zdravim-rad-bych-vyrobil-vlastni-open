/**
 * Rotterdam Open World - 2D Canvas Radar / Mini-map
 * Displays city waterways, quays, Erasmusbrug, player, car, and boat positions in real time.
 */

export class Minimap {
  constructor(containerId = 'minimap-container') {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 180;
    this.canvas.height = 180;
    this.canvas.style.cssText = `
      width: 180px;
      height: 180px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.4);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
      background: #0f1722;
    `;

    const container = document.getElementById(containerId) || document.body;
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // World to radar scale: 1 world meter = 0.35 radar pixels
    this.scale = 0.35;
    this.radarRadius = 90;
  }

  update(centerPos, playerPos, playerYaw, carPos, boatPos) {
    const ctx = this.ctx;
    const cx = 90;
    const cy = 90;
    const r = this.radarRadius;

    ctx.clearRect(0, 0, 180, 180);

    // Circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Background: Dark ground / city land
    ctx.fillStyle = '#181e28';
    ctx.fillRect(0, 0, 180, 180);

    // Transform world coordinates to radar coordinates relative to centerPos
    const toRadar = (wx, wz) => {
      const rx = cx + (wx - centerPos.x) * this.scale;
      const ry = cy + (wz - centerPos.z) * this.scale;
      return [rx, ry];
    };

    // 1. Water River (Nieuwe Maas) & Canals
    ctx.fillStyle = '#124168';
    const [rwL, rwTop] = toRadar(-400, -120);
    const [rwR, rwBottom] = toRadar(400, 120);
    ctx.fillRect(rwL, rwTop, rwR - rwL, rwBottom - rwTop);

    // 2. Erasmus Bridge (spans across the water from Z=150 to Z=-160 at X=-8)
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 5;
    const [b1x, b1y] = toRadar(-8, 150);
    const [b2x, b2y] = toRadar(-8, -160);
    ctx.beginPath();
    ctx.moveTo(b1x, b1y);
    ctx.lineTo(b2x, b2y);
    ctx.stroke();

    // 3. Pier & Docks
    ctx.fillStyle = '#4a5568';
    const [p1x, p1y] = toRadar(-25, 65);
    const [p2x, p2y] = toRadar(-5, 95);
    ctx.fillRect(p1x, p1y, p2x - p1x, p2y - p1y);

    // 4. Car Blip (Orange)
    if (carPos) {
      const [carX, carY] = toRadar(carPos.x, carPos.z);
      ctx.fillStyle = '#ff6b22';
      ctx.beginPath();
      ctx.arc(carX, carY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 5. Boat Blip (Cyan / Teal)
    if (boatPos) {
      const [boatX, boatY] = toRadar(boatPos.x, boatPos.z);
      ctx.fillStyle = '#00d2d3';
      ctx.beginPath();
      ctx.arc(boatX, boatY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 6. Player / Active Indicator (Yellow Arrow)
    if (playerPos) {
      const [pX, pY] = toRadar(playerPos.x, playerPos.z);
      ctx.save();
      ctx.translate(pX, pY);
      ctx.rotate(-playerYaw);

      ctx.fillStyle = '#feca57';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, 5);
      ctx.lineTo(0, 3);
      ctx.lineTo(-4.5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();

    // Radar Overlay Grid & Compass
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // North Marker
    ctx.fillStyle = '#ff4757';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, 16);
  }
}
