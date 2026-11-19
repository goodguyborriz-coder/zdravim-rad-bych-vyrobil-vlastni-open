import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { COLLISION_GROUPS } from './physics.js';

/**
 * Third-Person Player Controller
 * Procedurally animated character, responsive physics locomotion, orbit camera, and vehicle interaction.
 */

export class Player {
  constructor(scene, physics, camera, domElement) {
    this.scene = scene;
    this.physics = physics;
    this.camera = camera;
    this.domElement = domElement;

    // Movement speeds
    this.walkSpeed = 4.8;
    this.sprintSpeed = 9.2;
    this.jumpForce = 5.8;
    this.isGrounded = false;
    this.isSprinting = false;

    // Camera parameters
    this.cameraYaw = 0;
    this.cameraPitch = 0.25;
    this.cameraDist = 5.0;
    this.cameraTarget = new THREE.Vector3();

    // Input state
    this.keys = { forward: false, backward: false, left: false, right: false, sprint: false, jump: false };
    this.mouse = { isDown: false, lastX: 0, lastY: 0 };

    this.active = true; // active when on foot

    this.initMesh();
    this.initPhysics();
    this.initInput();
  }

  initMesh() {
    this.mesh = new THREE.Group();

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.8 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x1f3c5b, roughness: 0.6 }); // Rotterdam nautical dark blue
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xe6e8eb, roughness: 0.5 }); // white sneakers
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.9 });

    // Torso (Jacket)
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.7, 0.32);
    this.torso = new THREE.Mesh(torsoGeo, jacketMat);
    this.torso.position.y = 1.15;
    this.torso.castShadow = true;
    this.mesh.add(this.torso);

    // Head
    const headGeo = new THREE.BoxGeometry(0.32, 0.35, 0.32);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 1.72;
    this.head.castShadow = true;
    this.mesh.add(this.head);

    // Hair / Cap
    const hairGeo = new THREE.BoxGeometry(0.34, 0.16, 0.34);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.84, -0.02);
    this.mesh.add(hair);

    // Arms (pivot at shoulder)
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(0.36, 1.45, 0);
    const armGeo = new THREE.BoxGeometry(0.16, 0.55, 0.16);
    armGeo.translate(0, -0.25, 0);
    const leftArm = new THREE.Mesh(armGeo, jacketMat);
    leftArm.castShadow = true;
    this.leftArmPivot.add(leftArm);
    this.mesh.add(this.leftArmPivot);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(-0.36, 1.45, 0);
    const rightArm = new THREE.Mesh(armGeo, jacketMat);
    rightArm.castShadow = true;
    this.rightArmPivot.add(rightArm);
    this.mesh.add(this.rightArmPivot);

    // Legs (pivot at hips)
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(0.18, 0.8, 0);
    const legGeo = new THREE.BoxGeometry(0.2, 0.65, 0.22);
    legGeo.translate(0, -0.3, 0);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.castShadow = true;
    this.leftLegPivot.add(leftLeg);

    const shoeGeo = new THREE.BoxGeometry(0.22, 0.14, 0.32);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.65, 0.05);
    this.leftLegPivot.add(leftShoe);
    this.mesh.add(this.leftLegPivot);

    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(-0.18, 0.8, 0);
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.castShadow = true;
    this.rightLegPivot.add(rightLeg);

    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.65, 0.05);
    this.rightLegPivot.add(rightShoe);
    this.mesh.add(this.rightLegPivot);

    this.scene.add(this.mesh);
  }

  initPhysics() {
    // Upright capsule represented as a sphere or box with fixed rotation
    const radius = 0.45;
    const height = 1.8;
    const sphereShape = new CANNON.Sphere(radius);

    this.body = new CANNON.Body({
      mass: 75, // 75 kg human
      material: this.physics.characterMaterial,
      fixedRotation: true,
      linearDamping: 0.1,
      angularDamping: 0.99,
      collisionFilterGroup: COLLISION_GROUPS.CHARACTER,
      collisionFilterMask: COLLISION_GROUPS.STATIC | COLLISION_GROUPS.VEHICLE | COLLISION_GROUPS.BOAT
    });

    // Compound shapes for realistic character torso and feet
    this.body.addShape(sphereShape, new CANNON.Vec3(0, -0.45, 0)); // feet
    this.body.addShape(sphereShape, new CANNON.Vec3(0, 0.45, 0));  // chest

    // Spawn on Wilhelminapier quay near the car & Erasmusbrug
    this.spawn(new THREE.Vector3(5, 5.5, 140));
    this.physics.addBody(this.body);
  }

  spawn(pos) {
    this.body.position.set(pos.x, pos.y, pos.z);
    this.body.velocity.set(0, 0, 0);
    this.mesh.position.copy(pos);
  }

  initInput() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.keys.forward = true;
      if (key === 's' || key === 'arrowdown') this.keys.backward = true;
      if (key === 'a' || key === 'arrowleft') this.keys.left = true;
      if (key === 'd' || key === 'arrowright') this.keys.right = true;
      if (e.shiftKey) this.keys.sprint = true;
      if (e.code === 'Space') {
        this.keys.jump = true;
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.keys.forward = false;
      if (key === 's' || key === 'arrowdown') this.keys.backward = false;
      if (key === 'a' || key === 'arrowleft') this.keys.left = false;
      if (key === 'd' || key === 'arrowright') this.keys.right = false;
      if (!e.shiftKey) this.keys.sprint = false;
      if (e.code === 'Space') this.keys.jump = false;
    });

    // Pointer lock & drag camera orbit
    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 2) {
        this.mouse.isDown = true;
        this.mouse.lastX = e.clientX;
        this.mouse.lastY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      this.mouse.isDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.active) return;
      if (document.pointerLockElement === this.domElement || this.mouse.isDown) {
        const dx = (e.movementX !== undefined) ? e.movementX : (e.clientX - this.mouse.lastX);
        const dy = (e.movementY !== undefined) ? e.movementY : (e.clientY - this.mouse.lastY);

        this.cameraYaw -= dx * 0.004;
        this.cameraPitch = Math.max(-0.25, Math.min(1.2, this.cameraPitch + dy * 0.0035));

        this.mouse.lastX = e.clientX;
        this.mouse.lastY = e.clientY;
      }
    });

    window.addEventListener('wheel', (e) => {
      if (!this.active) return;
      this.cameraDist = Math.max(2.2, Math.min(10.0, this.cameraDist + e.deltaY * 0.005));
    });
  }

  checkGrounded() {
    // Raycast down 1.05m to detect ground
    const from = new CANNON.Vec3(this.body.position.x, this.body.position.y - 0.2, this.body.position.z);
    const to = new CANNON.Vec3(this.body.position.x, this.body.position.y - 1.15, this.body.position.z);
    const result = new CANNON.RaycastResult();

    this.physics.world.raycastClosest(from, to, {
      collisionFilterMask: COLLISION_GROUPS.STATIC | COLLISION_GROUPS.VEHICLE | COLLISION_GROUPS.BOAT
    }, result);

    this.isGrounded = result.hasHit;
    return this.isGrounded;
  }

  update(dt) {
    if (!this.active) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;

    this.checkGrounded();

    // Calculate movement vector relative to camera yaw
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

    const moveDir = new THREE.Vector3();
    if (this.keys.forward) moveDir.add(forward);
    if (this.keys.backward) moveDir.sub(forward);
    if (this.keys.right) moveDir.add(right);
    if (this.keys.left) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0.01;
    if (isMoving) moveDir.normalize();

    const speed = this.keys.sprint ? this.sprintSpeed : this.walkSpeed;

    // Apply horizontal velocity to physics body
    if (isMoving) {
      this.body.velocity.x = moveDir.x * speed;
      this.body.velocity.z = moveDir.z * speed;

      // Rotate character mesh towards movement direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetAngle, 0.2);
    } else {
      // Damping when stopping
      this.body.velocity.x *= 0.65;
      this.body.velocity.z *= 0.65;
    }

    // Jump impulse
    if (this.keys.jump && this.isGrounded) {
      this.body.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    // Sync 3D mesh with Cannon physics body
    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y - 0.9,
      this.body.position.z
    );

    // Procedural animation for limbs
    this.animateLimbs(dt, isMoving, this.keys.sprint);

    // Update Third-Person Orbit Camera
    this.updateCamera(dt);
  }

  animateLimbs(dt, isMoving, isSprinting) {
    if (!this.animTime) this.animTime = 0;
    this.animTime += dt * (isSprinting ? 14 : 9);

    if (isMoving && this.isGrounded) {
      const swingAngle = Math.sin(this.animTime) * (isSprinting ? 0.75 : 0.45);
      this.leftLegPivot.rotation.x = swingAngle;
      this.rightLegPivot.rotation.x = -swingAngle;
      this.leftArmPivot.rotation.x = -swingAngle * 0.9;
      this.rightArmPivot.rotation.x = swingAngle * 0.9;

      // Bobbing
      this.torso.position.y = 1.15 + Math.abs(Math.sin(this.animTime * 2)) * 0.04;
      this.head.position.y = 1.72 + Math.abs(Math.sin(this.animTime * 2)) * 0.04;
    } else if (!this.isGrounded) {
      // Jump pose
      this.leftLegPivot.rotation.x = 0.4;
      this.rightLegPivot.rotation.x = 0.2;
      this.leftArmPivot.rotation.x = -0.5;
      this.rightArmPivot.rotation.x = -0.5;
    } else {
      // Idle breathing
      this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0, 0.2);
      this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, 0, 0.2);
      this.leftArmPivot.rotation.x = THREE.MathUtils.lerp(this.leftArmPivot.rotation.x, 0, 0.2);
      this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(this.rightArmPivot.rotation.x, 0, 0.2);

      const breath = Math.sin(this.animTime * 0.3) * 0.015;
      this.torso.position.y = 1.15 + breath;
      this.head.position.y = 1.72 + breath;
    }
  }

  updateCamera(dt) {
    // Camera smoothly follows player
    this.cameraTarget.lerp(
      new THREE.Vector3(this.body.position.x, this.body.position.y + 1.2, this.body.position.z),
      0.15
    );

    const offset = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDist,
      Math.sin(this.cameraPitch) * this.cameraDist,
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDist
    );

    const desiredCamPos = this.cameraTarget.clone().add(offset);
    this.camera.position.lerp(desiredCamPos, 0.2);
    this.camera.lookAt(this.cameraTarget);
  }

  getPosition() {
    return this.body.position;
  }
}
