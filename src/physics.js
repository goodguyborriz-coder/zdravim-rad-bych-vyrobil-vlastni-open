import * as CANNON from 'cannon-es';
import * as THREE from 'three';

/**
 * Cannon-es Physics Engine Manager
 * Configured for open-world vehicle dynamics, character movement, and hydrodynamics.
 */

export const COLLISION_GROUPS = {
  STATIC: 1,
  CHARACTER: 2,
  VEHICLE: 4,
  WHEEL: 8,
  BOAT: 16,
  TRIGGER: 32
};

export class PhysicsWorld {
  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0)
    });

    // Broadphase algorithm
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    // Contact Materials
    this.groundMaterial = new CANNON.Material('ground');
    this.wheelMaterial = new CANNON.Material('wheel');
    this.characterMaterial = new CANNON.Material('character');
    this.boatMaterial = new CANNON.Material('boat');
    this.defaultMaterial = new CANNON.Material('default');

    // Asphalt / Ground to Wheel (High grip for responsive car handling)
    const wheelGroundContact = new CANNON.ContactMaterial(
      this.groundMaterial,
      this.wheelMaterial,
      {
        friction: 1.4,
        restitution: 0.02,
        contactEquationStiffness: 1000,
        contactEquationRelaxation: 3
      }
    );
    this.world.addContactMaterial(wheelGroundContact);

    // Character to Ground (Zero lateral friction to avoid wall sticking, manual friction in controller)
    const charGroundContact = new CANNON.ContactMaterial(
      this.groundMaterial,
      this.characterMaterial,
      {
        friction: 0.05,
        restitution: 0.0
      }
    );
    this.world.addContactMaterial(charGroundContact);

    // Boat to Ground / Pier (smooth sliding)
    const boatGroundContact = new CANNON.ContactMaterial(
      this.groundMaterial,
      this.boatMaterial,
      {
        friction: 0.1,
        restitution: 0.1
      }
    );
    this.world.addContactMaterial(boatGroundContact);

    // Default contact
    this.world.defaultContactMaterial.friction = 0.4;
    this.world.defaultContactMaterial.restitution = 0.1;
  }

  step(dt) {
    const fixedTimeStep = 1 / 60;
    const maxSubSteps = 3;
    this.world.step(fixedTimeStep, dt, maxSubSteps);
  }

  addBody(body) {
    this.world.addBody(body);
    return body;
  }

  removeBody(body) {
    this.world.removeBody(body);
  }

  // Create static ground/road box
  createStaticBox(pos, size, rot = null, material = this.groundMaterial) {
    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    const shape = new CANNON.Box(halfExtents);
    const body = new CANNON.Body({
      mass: 0,
      material: material,
      collisionFilterGroup: COLLISION_GROUPS.STATIC,
      collisionFilterMask: -1
    });
    body.addShape(shape);
    body.position.set(pos.x, pos.y, pos.z);
    if (rot) {
      body.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    }
    this.addBody(body);
    return body;
  }

  // Create sloped ramp (for bridge inclines and docks)
  createRamp(pos, length, width, thickness, slopeAngle, yawAngle = 0) {
    const halfExtents = new CANNON.Vec3(width / 2, thickness / 2, length / 2);
    const shape = new CANNON.Box(halfExtents);
    const body = new CANNON.Body({
      mass: 0,
      material: this.groundMaterial,
      collisionFilterGroup: COLLISION_GROUPS.STATIC,
      collisionFilterMask: -1
    });
    body.addShape(shape);
    body.position.set(pos.x, pos.y, pos.z);

    const qPitch = new CANNON.Quaternion();
    qPitch.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), slopeAngle);
    const qYaw = new CANNON.Quaternion();
    qYaw.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yawAngle);
    body.quaternion = qYaw.mult(qPitch);

    this.addBody(body);
    return body;
  }
}
