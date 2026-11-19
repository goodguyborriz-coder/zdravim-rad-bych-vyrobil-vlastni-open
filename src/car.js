import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { COLLISION_GROUPS } from './physics.js';

/**
 * High Performance Car Physics & Visual Vehicle System
 * Powered by Cannon-es RaycastVehicle with 4-wheel suspension, automatic transmission, and dynamic chase camera.
 */

export class Car {
  constructor(scene, physics, camera) {
    this.scene = scene;
    this.physics = physics;
    this.camera = camera;

    this.active = false; // true when player is driving
    this.speedKmh = 0;
    this.rpm = 900;
    this.gear = 'D';

    // Vehicle tuning
    this.maxSteerVal = 0.52;      // ~30 degrees
    this.maxEngineForce = 2200;   // Engine torque in Newtons
    this.maxBrakingForce = 45;    // Regular brake
    this.handbrakeForce = 85;     // Handbrake drift force

    this.inputs = { forward: false, backward: false, left: false, right: false, handbrake: false };

    this.initChassis();
    this.initVehicle();
    this.initVisuals();
    this.initLights();
    this.initInput();
  }

  initChassis() {
    // Chassis collision shape: 2.0m wide, 1.0m high, 4.4m long
    const chassisShape = new CANNON.Box(new CANNON.Vec3(1.0, 0.45, 2.2));
    this.chassisBody = new CANNON.Body({
      mass: 1250, // 1250 kg car
      material: this.physics.groundMaterial,
      collisionFilterGroup: COLLISION_GROUPS.VEHICLE,
      collisionFilterMask: -1
    });

    // Lower center of mass for high-speed cornering stability
    this.chassisBody.addShape(chassisShape, new CANNON.Vec3(0, 0.15, 0));

    // Spawn on Wilhelminapier boulevard facing towards Erasmus Bridge
    this.spawn(new THREE.Vector3(8, 5.0, 142), 0);
    this.physics.addBody(this.chassisBody);
  }

  initVehicle() {
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0, // X
      indexUpAxis: 1,    // Y
      indexForwardAxis: 2 // Z
    });

    // Wheel parameters
    const wheelOptions = {
      radius: 0.38,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 35,
      suspensionRestLength: 0.35,
      frictionSlip: 2.2,
      dampingRelaxation: 2.3,
      dampingCompression: 2.8,
      maxSuspensionForce: 100000,
      rollInfluence: 0.12,
      axleLocal: new CANNON.Vec3(1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true
    };

    // 4 Wheels: Front-Left, Front-Right, Rear-Left, Rear-Right
    const halfWidth = 0.92;
    const halfLength = 1.45;
    const heightOffset = -0.15;

    // Front Left (0)
    wheelOptions.chassisConnectionPointLocal.set(halfWidth, heightOffset, halfLength);
    wheelOptions.isFrontWheel = true;
    this.vehicle.addWheel(wheelOptions);

    // Front Right (1)
    wheelOptions.chassisConnectionPointLocal.set(-halfWidth, heightOffset, halfLength);
    wheelOptions.isFrontWheel = true;
    this.vehicle.addWheel(wheelOptions);

    // Rear Left (2)
    wheelOptions.chassisConnectionPointLocal.set(halfWidth, heightOffset, -halfLength);
    wheelOptions.isFrontWheel = false;
    this.vehicle.addWheel(wheelOptions);

    // Rear Right (3)
    wheelOptions.chassisConnectionPointLocal.set(-halfWidth, heightOffset, -halfLength);
    wheelOptions.isFrontWheel = false;
    this.vehicle.addWheel(wheelOptions);

    this.vehicle.addToWorld(this.physics.world);

    // Wheel bodies for RaycastVehicle
    this.wheelBodies = [];
    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      const wheelBody = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.KINEMATIC,
        collisionFilterGroup: 0 // raycast handles collision
      });
      this.physics.addBody(wheelBody);
      this.wheelBodies.push(wheelBody);
    }
  }

  initVisuals() {
    this.mesh = new THREE.Group();

    // Body paint material (Rotterdam Racing Orange / Deep Sunset metallic)
    const bodyPaintMat = new THREE.MeshStandardMaterial({
      color: 0xdf5318, // vibrant metallic Dutch orange
      metalness: 0.85,
      roughness: 0.2
    });

    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x111316,
      roughness: 0.5,
      metalness: 0.4
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x182430,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.75
    });

    // 1. Lower chassis / body
    const lowerBodyGeo = new THREE.BoxGeometry(2.0, 0.55, 4.4);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, bodyPaintMat);
    lowerBody.position.y = 0.25;
    lowerBody.castShadow = true;
    this.mesh.add(lowerBody);

    // 2. Cabin / Roof
    const cabinGeo = new THREE.BoxGeometry(1.6, 0.45, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, bodyPaintMat);
    cabin.position.set(0, 0.75, -0.2);
    cabin.castShadow = true;
    this.mesh.add(cabin);

    // 3. Windshield & Windows
    const frontWindshieldGeo = new THREE.BoxGeometry(1.5, 0.38, 0.6);
    const frontWindshield = new THREE.Mesh(frontWindshieldGeo, glassMat);
    frontWindshield.position.set(0, 0.7, 0.75);
    frontWindshield.rotation.x = -Math.PI / 6;
    this.mesh.add(frontWindshield);

    const rearWindshieldGeo = new THREE.BoxGeometry(1.5, 0.38, 0.6);
    const rearWindshield = new THREE.Mesh(rearWindshieldGeo, glassMat);
    rearWindshield.position.set(0, 0.7, -1.15);
    rearWindshield.rotation.x = Math.PI / 6;
    this.mesh.add(rearWindshield);

    // 4. Front grille and aerodynamic splitter
    const splitterGeo = new THREE.BoxGeometry(1.95, 0.12, 0.6);
    const splitter = new THREE.Mesh(splitterGeo, blackTrimMat);
    splitter.position.set(0, 0.05, 2.15);
    this.mesh.add(splitter);

    // 5. Rear spoiler
    const spoilerGeo = new THREE.BoxGeometry(1.8, 0.08, 0.35);
    const spoiler = new THREE.Mesh(spoilerGeo, blackTrimMat);
    spoiler.position.set(0, 0.95, -2.05);
    this.mesh.add(spoiler);

    const spoilerStandGeo = new THREE.BoxGeometry(0.08, 0.3, 0.15);
    const standL = new THREE.Mesh(spoilerStandGeo, blackTrimMat);
    standL.position.set(0.65, 0.8, -2.05);
    this.mesh.add(standL);
    const standR = new THREE.Mesh(spoilerStandGeo, blackTrimMat);
    standR.position.set(-0.65, 0.8, -2.05);
    this.mesh.add(standR);

    // 6. Wheels (4 alloy wheels)
    this.wheelMeshes = [];
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 24);
    wheelGeo.rotateZ(Math.PI / 2);

    const tireMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd0d5dd, metalness: 0.9, roughness: 0.2 });

    for (let i = 0; i < 4; i++) {
      const wheelGroup = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.34, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wheelGroup.add(rim);

      this.scene.add(wheelGroup);
      this.wheelMeshes.push(wheelGroup);
    }

    this.scene.add(this.mesh);
  }

  initLights() {
    // Headlights
    this.headlights = [];
    const createHeadlight = (x) => {
      const light = new THREE.SpotLight(0xfff5e6, 3.5, 60, Math.PI / 6, 0.3, 1.2);
      light.position.set(x, 0.35, 2.2);
      light.target.position.set(x, -0.2, 30);
      this.mesh.add(light);
      this.mesh.add(light.target);

      const lens = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.15, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xfffae0 })
      );
      lens.position.set(x, 0.35, 2.21);
      this.mesh.add(lens);
      this.headlights.push(light);
    };

    createHeadlight(0.7);
    createHeadlight(-0.7);

    // Brake lights
    this.brakeLightMat = new THREE.MeshBasicMaterial({ color: 0x550000 });
    const brakeLensGeo = new THREE.BoxGeometry(0.4, 0.12, 0.05);

    const brakeL = new THREE.Mesh(brakeLensGeo, this.brakeLightMat);
    brakeL.position.set(0.7, 0.42, -2.21);
    this.mesh.add(brakeL);

    const brakeR = new THREE.Mesh(brakeLensGeo, this.brakeLightMat);
    brakeR.position.set(-0.7, 0.42, -2.21);
    this.mesh.add(brakeR);
  }

  spawn(pos, yaw = 0) {
    this.chassisBody.position.set(pos.x, pos.y, pos.z);
    this.chassisBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
    this.chassisBody.velocity.set(0, 0, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);
  }

  initInput() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.inputs.forward = true;
      if (key === 's' || key === 'arrowdown') this.inputs.backward = true;
      if (key === 'a' || key === 'arrowleft') this.inputs.left = true;
      if (key === 'd' || key === 'arrowright') this.inputs.right = true;
      if (e.code === 'Space') {
        this.inputs.handbrake = true;
        e.preventDefault();
      }
      if (key === 'r') {
        this.resetOrientation();
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.inputs.forward = false;
      if (key === 's' || key === 'arrowdown') this.inputs.backward = false;
      if (key === 'a' || key === 'arrowleft') this.inputs.left = false;
      if (key === 'd' || key === 'arrowright') this.inputs.right = false;
      if (e.code === 'Space') this.inputs.handbrake = false;
    });
  }

  resetOrientation() {
    // Flip car upright if overturned
    const pos = this.chassisBody.position;
    this.chassisBody.position.set(pos.x, pos.y + 1.5, pos.z);
    const yaw = this.mesh.rotation.y;
    this.chassisBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
    this.chassisBody.velocity.set(0, 0, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);
  }

  update(dt) {
    // Sync chassis mesh position and rotation
    this.mesh.position.copy(this.chassisBody.position);
    this.mesh.quaternion.copy(this.chassisBody.quaternion);

    // Sync wheel meshes with Cannon RaycastVehicle
    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      this.vehicle.updateWheelTransform(i);
      const t = this.vehicle.wheelInfos[i].worldTransform;
      this.wheelMeshes[i].position.copy(t.position);
      this.wheelMeshes[i].quaternion.copy(t.quaternion);
    }

    // Calculate current speed in km/h
    const vel = this.chassisBody.velocity;
    const speedMs = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    this.speedKmh = Math.round(speedMs * 3.6);

    // Aerodynamic downforce
    if (speedMs > 5) {
      const downforce = speedMs * speedMs * 1.5;
      this.chassisBody.applyForce(new CANNON.Vec3(0, -downforce, 0), this.chassisBody.position);
    }

    if (!this.active) {
      // Brake and idle engine when unoccupied
      this.vehicle.applyEngineForce(0, 2);
      this.vehicle.applyEngineForce(0, 3);
      this.vehicle.setBrake(15, 0);
      this.vehicle.setBrake(15, 1);
      this.vehicle.setBrake(15, 2);
      this.vehicle.setBrake(15, 3);
      this.brakeLightMat.color.setHex(0x550000);
      return;
    }

    // 1. Steering
    let targetSteer = 0;
    if (this.inputs.left) targetSteer += this.maxSteerVal;
    if (this.inputs.right) targetSteer -= this.maxSteerVal;
    // Speed-sensitive steering (less sensitive at high speeds)
    const steerFactor = Math.max(0.4, 1.0 - (this.speedKmh / 160));
    const finalSteer = targetSteer * steerFactor;
    this.vehicle.setSteeringValue(finalSteer, 0);
    this.vehicle.setSteeringValue(finalSteer, 1);

    // 2. Engine Acceleration & Braking
    let engineForce = 0;
    let brakeForce = 0;

    // Detect forward / reverse intent
    const forwardVec = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    const forwardDot = forwardVec.x * vel.x + forwardVec.z * vel.z;

    if (this.inputs.forward) {
      this.gear = 'D';
      engineForce = this.maxEngineForce;
      brakeForce = 0;
      this.brakeLightMat.color.setHex(0x550000);
    } else if (this.inputs.backward) {
      if (forwardDot > 1.0) {
        // Moving forward, pressing S acts as brake!
        brakeForce = this.maxBrakingForce;
        engineForce = 0;
        this.brakeLightMat.color.setHex(0xff0000);
      } else {
        // Reverse
        this.gear = 'R';
        engineForce = -this.maxEngineForce * 0.6;
        brakeForce = 0;
        this.brakeLightMat.color.setHex(0x550000);
      }
    } else {
      // Coasting
      engineForce = 0;
      brakeForce = 2.0; // rolling resistance
      this.brakeLightMat.color.setHex(0x550000);
    }

    // Handbrake
    if (this.inputs.handbrake) {
      brakeForce = this.handbrakeForce;
      this.vehicle.setBrake(brakeForce, 2);
      this.vehicle.setBrake(brakeForce, 3);
      this.brakeLightMat.color.setHex(0xff0000);
    } else {
      // Rear-wheel drive power
      this.vehicle.applyEngineForce(engineForce, 2);
      this.vehicle.applyEngineForce(engineForce, 3);
      this.vehicle.setBrake(brakeForce, 0);
      this.vehicle.setBrake(brakeForce, 1);
      this.vehicle.setBrake(brakeForce, 2);
      this.vehicle.setBrake(brakeForce, 3);
    }

    // RPM simulation
    const targetRPM = 900 + (this.speedKmh % 40) * 110 + (Math.abs(engineForce) > 0 ? 800 : 0);
    this.rpm = THREE.MathUtils.lerp(this.rpm, targetRPM, 0.1);

    // 3. Dynamic 3rd Person Chase Camera
    this.updateCamera(dt);
  }

  updateCamera(dt) {
    const carPos = this.chassisBody.position;
    // Calculate backwards vector
    const backDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);

    const camDistance = 7.0 + (this.speedKmh * 0.025);
    const camHeight = 2.8 + (this.speedKmh * 0.01);

    const desiredCamPos = new THREE.Vector3(
      carPos.x - backDir.x * camDistance,
      carPos.y + camHeight,
      carPos.z - backDir.z * camDistance
    );

    this.camera.position.lerp(desiredCamPos, 0.12);
    const lookTarget = new THREE.Vector3(carPos.x, carPos.y + 1.2, carPos.z);
    this.camera.lookAt(lookTarget);
  }

  getInteractionDistance(pos) {
    return this.chassisBody.position.distanceTo(pos);
  }

  getExitPosition() {
    // Exit on driver side (left of car)
    const leftDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);
    return new THREE.Vector3(
      this.chassisBody.position.x + leftDir.x * 2.2,
      this.chassisBody.position.y + 0.5,
      this.chassisBody.position.z + leftDir.z * 2.2
    );
  }
}
