import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { COLLISION_GROUPS } from './physics.js';

/**
 * Rotterdam Canal Speedboat & Buoyancy Hydrodynamics Simulation
 * Multi-point buoyancy probes, Archimedes upward force, viscous fluid resistance, and propeller wash.
 */

export class Boat {
  constructor(scene, physics, waterSystem, camera) {
    this.scene = scene;
    this.physics = physics;
    this.waterSystem = waterSystem;
    this.camera = camera;

    this.active = false; // true when player is driving boat
    this.speedKnots = 0;
    this.throttle = 0;
    this.rudderAngle = 0;

    // Boat parameters
    this.maxThrust = 3800; // Newtons
    this.maxSpeedKnots = 26;

    this.inputs = { forward: false, backward: false, left: false, right: false };

    this.initPhysics();
    this.initVisuals();
    this.initInput();
  }

  initPhysics() {
    // Boat hull rigid body: 2.2m wide, 1.2m high, 5.6m long
    const hullShape = new CANNON.Box(new CANNON.Vec3(1.1, 0.6, 2.8));
    this.body = new CANNON.Body({
      mass: 880, // 880 kg boat
      material: this.physics.boatMaterial,
      linearDamping: 0.15,
      angularDamping: 0.6,
      collisionFilterGroup: COLLISION_GROUPS.BOAT,
      collisionFilterMask: COLLISION_GROUPS.STATIC | COLLISION_GROUPS.CHARACTER
    });

    this.body.addShape(hullShape, new CANNON.Vec3(0, 0.2, 0));

    // 6 Buoyant Probe Positions relative to boat center:
    this.buoyancyProbes = [
      new CANNON.Vec3(0, -0.4, 2.6),    // Bow tip (front)
      new CANNON.Vec3(0.9, -0.3, -2.4),  // Stern Left (rear)
      new CANNON.Vec3(-0.9, -0.3, -2.4), // Stern Right (rear)
      new CANNON.Vec3(1.0, -0.35, 0.1),  // Midship Left
      new CANNON.Vec3(-1.0, -0.35, 0.1), // Midship Right
      new CANNON.Vec3(0, -0.5, 0)        // Keel center
    ];

    // Spawn moored by the pier under Erasmusbrug
    this.spawn(new THREE.Vector3(-22.5, 1.2, 80), -Math.PI / 2);
    this.physics.addBody(this.body);
  }

  initVisuals() {
    this.mesh = new THREE.Group();

    // Materials
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x0e243a, // sleek navy hull
      metalness: 0.7,
      roughness: 0.2
    });
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0xb58e5e, // luxury teak wood deck
      roughness: 0.6,
      metalness: 0.1
    });
    const whiteGelcoatMat = new THREE.MeshStandardMaterial({
      color: 0xf5f7fa,
      roughness: 0.3,
      metalness: 0.3
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1f3c5b,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7
    });

    // 1. Hull V-shape
    const hullGeo = new THREE.BoxGeometry(2.1, 0.8, 5.4);
    const hullMesh = new THREE.Mesh(hullGeo, hullMat);
    hullMesh.position.y = 0.2;
    hullMesh.castShadow = true;
    this.mesh.add(hullMesh);

    // Bow pointed shape
    const bowGeo = new THREE.ConeGeometry(1.05, 1.4, 4);
    bowGeo.rotateX(Math.PI / 2);
    bowGeo.rotateY(Math.PI / 4);
    const bowMesh = new THREE.Mesh(bowGeo, hullMat);
    bowMesh.position.set(0, 0.2, 3.4);
    bowMesh.scale.set(1.0, 0.6, 1.0);
    this.mesh.add(bowMesh);

    // 2. Teak Deck
    const deckGeo = new THREE.BoxGeometry(1.9, 0.12, 4.8);
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.y = 0.65;
    this.mesh.add(deckMesh);

    // 3. Cabin Cockpit & Windshield
    const cockpitGeo = new THREE.BoxGeometry(1.6, 0.35, 2.2);
    const cockpit = new THREE.Mesh(cockpitGeo, whiteGelcoatMat);
    cockpit.position.set(0, 0.8, -0.2);
    this.mesh.add(cockpit);

    const windshieldGeo = new THREE.BoxGeometry(1.5, 0.45, 0.1);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    windshield.position.set(0, 1.05, 0.8);
    windshield.rotation.x = -Math.PI / 7;
    this.mesh.add(windshield);

    // 4. Outboard Motor Engine
    this.motorGroup = new THREE.Group();
    this.motorGroup.position.set(0, 0.3, -2.8);

    const motorHousingGeo = new THREE.BoxGeometry(0.5, 0.7, 0.6);
    const motorMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.8, roughness: 0.3 });
    const motorHousing = new THREE.Mesh(motorHousingGeo, motorMat);
    motorHousing.position.y = 0.15;
    this.motorGroup.add(motorHousing);

    // Propeller shaft
    const shaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
    const shaft = new THREE.Mesh(shaftGeo, motorMat);
    shaft.position.y = -0.3;
    this.motorGroup.add(shaft);

    this.mesh.add(this.motorGroup);

    // 5. Navigation Lights
    const navRed = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff1111 }) // Port (Left)
    );
    navRed.position.set(0.95, 0.75, 1.2);
    this.mesh.add(navRed);

    const navGreen = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x11ff11 }) // Starboard (Right)
    );
    navGreen.position.set(-0.95, 0.75, 1.2);
    this.mesh.add(navGreen);

    this.scene.add(this.mesh);
  }

  spawn(pos, yaw = 0) {
    this.body.position.set(pos.x, pos.y, pos.z);
    this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
  }

  initInput() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.inputs.forward = true;
      if (key === 's' || key === 'arrowdown') this.inputs.backward = true;
      if (key === 'a' || key === 'arrowleft') this.inputs.left = true;
      if (key === 'd' || key === 'arrowright') this.inputs.right = true;
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.inputs.forward = false;
      if (key === 's' || key === 'arrowdown') this.inputs.backward = false;
      if (key === 'a' || key === 'arrowleft') this.inputs.left = false;
      if (key === 'd' || key === 'arrowright') this.inputs.right = false;
    });
  }

  update(dt) {
    // 1. Apply Buoyancy & Hydrodynamic forces at each probe
    this.applyHydrodynamics();

    // 2. Engine Propulsion & Rudder Steering
    this.applyPropulsion(dt);

    // 3. Sync visual mesh with Cannon physics body
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);

    // Motor turn visual
    this.motorGroup.rotation.y = this.rudderAngle;

    // 4. Calculate Boat Speed in Knots (1 m/s = 1.94384 knots)
    const vel = this.body.velocity;
    const speedMs = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    this.speedKnots = Math.round(speedMs * 1.944);

    // 5. Emit Wake Particles in water
    const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    this.waterSystem.emitWake(this.mesh.position, forwardDir, this.speedKnots);

    // 6. Camera Follow
    if (this.active) {
      this.updateCamera(dt);
    }
  }

  applyHydrodynamics() {
    let submergedCount = 0;
    const waterDensity = 1000;
    const probeVolume = 0.28; // volume represented by each probe

    for (const probeLocal of this.buoyancyProbes) {
      // Transform probe to world position
      const probeWorld = this.body.pointToWorldFrame(probeLocal);

      // Query wave height at probe location
      const waterY = this.waterSystem.getWaterHeight(probeWorld.x, probeWorld.z);
      const depth = waterY - probeWorld.y;

      if (depth > 0) {
        submergedCount++;
        // Archimedes buoyant force: F = density * volume * g * submersionRatio
        const submersion = Math.min(1.2, depth * 2.2);
        const buoyantForceMag = waterDensity * probeVolume * 9.82 * submersion;
        const buoyantForce = new CANNON.Vec3(0, buoyantForceMag, 0);

        this.body.applyForce(buoyantForce, probeWorld);

        // Fluid drag at this probe point
        const probeVel = this.body.getVelocityAtWorldPoint(probeWorld);
        const dragForce = new CANNON.Vec3(
          -probeVel.x * 240,
          -probeVel.y * 320,
          -probeVel.z * 180
        );
        this.body.applyForce(dragForce, probeWorld);
      }
    }

    // Metacentric restoring torque: keeps boat upright and aligns gently with wave normal
    if (submergedCount > 0) {
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.mesh.quaternion);
      const waveNormal = this.waterSystem.getWaterNormal(this.body.position.x, this.body.position.z);
      const rightingTorque = new THREE.Vector3().crossVectors(up, waveNormal).multiplyScalar(2200);

      this.body.applyTorque(new CANNON.Vec3(rightingTorque.x, rightingTorque.y, rightingTorque.z));

      // Lateral water keel resistance (boat slides forward easily, but resists drifting sideways)
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);
      const lateralVel = this.body.velocity.dot(new CANNON.Vec3(right.x, right.y, right.z));
      const keelResist = right.clone().multiplyScalar(-lateralVel * 700);
      this.body.applyForce(new CANNON.Vec3(keelResist.x, 0, keelResist.z), this.body.position);
    }
  }

  applyPropulsion(dt) {
    if (!this.active) {
      this.throttle = THREE.MathUtils.lerp(this.throttle, 0, 0.1);
      this.rudderAngle = THREE.MathUtils.lerp(this.rudderAngle, 0, 0.1);
      return;
    }

    // Throttle input
    let targetThrottle = 0;
    if (this.inputs.forward) targetThrottle = 1.0;
    if (this.inputs.backward) targetThrottle = -0.4; // reverse
    this.throttle = THREE.MathUtils.lerp(this.throttle, targetThrottle, 0.08);

    // Rudder steering input
    let targetRudder = 0;
    if (this.inputs.left) targetRudder = 0.55;  // ~32 deg
    if (this.inputs.right) targetRudder = -0.55;
    this.rudderAngle = THREE.MathUtils.lerp(this.rudderAngle, targetRudder, 0.15);

    // Engine thrust vector applied at propeller transom
    const thrustMag = this.throttle * this.maxThrust;
    const forwardVec = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    const thrustDir = forwardVec.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rudderAngle);

    const propPosWorld = this.body.pointToWorldFrame(new CANNON.Vec3(0, -0.3, -2.7));
    const thrustForce = new CANNON.Vec3(
      thrustDir.x * thrustMag,
      thrustDir.y * thrustMag * 0.2, // slight bow lift on throttle
      thrustDir.z * thrustMag
    );

    this.body.applyForce(thrustForce, propPosWorld);
  }

  updateCamera(dt) {
    const boatPos = this.body.position;
    const backDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);

    const camDistance = 8.5 + (this.speedKnots * 0.1);
    const camHeight = 3.2;

    const desiredCamPos = new THREE.Vector3(
      boatPos.x - backDir.x * camDistance,
      boatPos.y + camHeight,
      boatPos.z - backDir.z * camDistance
    );

    this.camera.position.lerp(desiredCamPos, 0.12);
    const lookTarget = new THREE.Vector3(boatPos.x, boatPos.y + 1.0, boatPos.z);
    this.camera.lookAt(lookTarget);
  }

  getInteractionDistance(pos) {
    return this.body.position.distanceTo(pos);
  }

  getExitPosition() {
    // Exit onto the pier (left of boat)
    const leftDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);
    return new THREE.Vector3(
      this.body.position.x + leftDir.x * 3.2,
      2.2, // pier height
      this.body.position.z + leftDir.z * 3.2
    );
  }
}
