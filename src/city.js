import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { createAsphaltTexture, createMarkedRoadTexture, createPavingTexture } from './textures.js';

/**
 * Rotterdam City Environment & Infrastructure
 * Loads authentic 3D models from 3Drotterdam and builds drivable quays, roads, bridges, and docks.
 */

export class CityManager {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.models = new Map();
    this.loader = new GLTFLoader();

    this.initInfrastructure();
    this.loadRotterdamModels();
  }

  initInfrastructure() {
    // Textures
    this.asphaltTex = createAsphaltTexture();
    this.roadTex = createMarkedRoadTexture();
    this.pavingTex = createPavingTexture();

    // 1. South Quay (Wilhelminapier / Kop van Zuid)
    this.createQuayRoad(
      new THREE.Vector3(50, 4.0, 150),
      new THREE.Vector3(600, 1.2, 50),
      0
    );

    // 2. North Quay (Boompjes / Leuvehaven)
    this.createQuayRoad(
      new THREE.Vector3(50, 4.0, -160),
      new THREE.Vector3(600, 1.2, 50),
      0
    );

    // 3. Erasmus Bridge Drivable Road Deck & Physics Colliders
    this.createErasmusBridgeRoad();

    // 4. Boat Pier / Dock (South bank by Erasmusbrug)
    this.createBoatPier(new THREE.Vector3(-15, 1.8, 80));

    // 5. Street Lamps & Trees
    this.createStreetProps();
  }

  createQuayRoad(pos, size, rotY = 0) {
    // Visual road
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTex,
      roughness: 0.8,
      metalness: 0.1
    });
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geo, roadMat);
    mesh.position.copy(pos);
    mesh.rotation.y = rotY;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Sidewalk promenade
    const walkMat = new THREE.MeshStandardMaterial({
      map: this.pavingTex,
      roughness: 0.85
    });
    const walkGeo = new THREE.BoxGeometry(size.x, size.y + 0.25, 14);
    const walkMesh = new THREE.Mesh(walkGeo, walkMat);
    walkMesh.position.set(pos.x, pos.y + 0.1, pos.z - (size.z / 2 - 7));
    walkMesh.receiveShadow = true;
    this.scene.add(walkMesh);

    // Physics collider for road & ground
    this.physics.createStaticBox(pos, size);
    this.physics.createStaticBox(walkMesh.position, new THREE.Vector3(size.x, size.y + 0.25, 14));
  }

  createErasmusBridgeRoad() {
    // The Erasmus Bridge crosses the river from South (Z ~ 150) to North (Z ~ -160)
    // Span length ~ 310m, deck width ~ 24m, height above river Y ~ 14.5m
    const deckWidth = 22;
    const deckThickness = 1.4;

    // A) South Approach Ramp (Wilhelminapier up to main span)
    const rampLen = 110;
    const southRampAngle = Math.atan2(10.5, rampLen); // ascends 4.0m to 14.5m
    const southRampPos = new THREE.Vector3(-8, 9.25, 95);

    const rampGeo = new THREE.BoxGeometry(deckWidth, deckThickness, rampLen);
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTex,
      roughness: 0.75
    });
    const southRampMesh = new THREE.Mesh(rampGeo, roadMat);
    southRampMesh.position.copy(southRampPos);
    southRampMesh.rotation.x = southRampAngle;
    southRampMesh.receiveShadow = true;
    this.scene.add(southRampMesh);

    this.physics.createRamp(southRampPos, rampLen, deckWidth, deckThickness, southRampAngle);

    // B) Main Bridge Span (Over the river Nieuwe Maas)
    const mainSpanLen = 140;
    const mainSpanPos = new THREE.Vector3(-8, 14.8, -25);
    const mainSpanGeo = new THREE.BoxGeometry(deckWidth, deckThickness, mainSpanLen);
    const mainSpanMesh = new THREE.Mesh(mainSpanGeo, roadMat);
    mainSpanMesh.position.copy(mainSpanPos);
    mainSpanMesh.receiveShadow = true;
    this.scene.add(mainSpanMesh);

    this.physics.createStaticBox(mainSpanPos, new THREE.Vector3(deckWidth, deckThickness, mainSpanLen));

    // C) North Approach Ramp (Down to Boompjes)
    const northRampAngle = -Math.atan2(10.5, rampLen);
    const northRampPos = new THREE.Vector3(-8, 9.25, -125);
    const northRampMesh = new THREE.Mesh(rampGeo, roadMat);
    northRampMesh.position.copy(northRampPos);
    northRampMesh.rotation.x = northRampAngle;
    northRampMesh.receiveShadow = true;
    this.scene.add(northRampMesh);

    this.physics.createRamp(northRampPos, rampLen, deckWidth, deckThickness, northRampAngle);

    // Side guardrails along the bridge
    const railMat = new THREE.MeshStandardMaterial({ color: 0x48525e, metalness: 0.8, roughness: 0.2 });
    const createRail = (xOffset, zStart, zEnd, yHeight) => {
      const len = Math.abs(zEnd - zStart);
      const railGeo = new THREE.BoxGeometry(0.5, 1.2, len);
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(-8 + xOffset, yHeight, (zStart + zEnd) / 2);
      this.scene.add(rail);
      this.physics.createStaticBox(rail.position, new THREE.Vector3(0.6, 1.5, len));
    };

    createRail(deckWidth / 2 - 0.3, -180, 150, 13.0);
    createRail(-deckWidth / 2 + 0.3, -180, 150, 13.0);
  }

  createBoatPier(pos) {
    // Dock platform for boat mooring & passenger boarding
    const pierGeo = new THREE.BoxGeometry(12, 0.8, 30);
    const pierMat = new THREE.MeshStandardMaterial({
      color: 0x4e4637, // aged wood / concrete dock
      roughness: 0.9,
      metalness: 0.1
    });
    const pier = new THREE.Mesh(pierGeo, pierMat);
    pier.position.copy(pos);
    pier.receiveShadow = true;
    this.scene.add(pier);
    this.physics.createStaticBox(pos, new THREE.Vector3(12, 0.8, 30));

    // Staircase ramp leading from quay boulevard (Y=4.0) down to boat pier (Y=1.8)
    const rampLen = 14;
    const rampAngle = Math.atan2(2.2, rampLen);
    const rampPos = new THREE.Vector3(pos.x, 2.9, pos.z + 18);
    const rampGeo = new THREE.BoxGeometry(6, 0.4, rampLen);
    const rampMesh = new THREE.Mesh(rampGeo, pierMat);
    rampMesh.position.copy(rampPos);
    rampMesh.rotation.x = -rampAngle;
    this.scene.add(rampMesh);
    this.physics.createRamp(rampPos, rampLen, 6, 0.4, -rampAngle);

    // Cleats / bollards on pier for tying boats
    const bollardGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.7, 12);
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.3 });
    for (let z = -10; z <= 10; z += 10) {
      const bLeft = new THREE.Mesh(bollardGeo, bollardMat);
      bLeft.position.set(pos.x - 5.4, pos.y + 0.5, pos.z + z);
      this.scene.add(bLeft);

      const bRight = new THREE.Mesh(bollardGeo, bollardMat);
      bRight.position.set(pos.x + 5.4, pos.y + 0.5, pos.z + z);
      this.scene.add(bRight);
    }

    this.boatDockPosition = new THREE.Vector3(pos.x - 7.5, 1.2, pos.z);
  }

  createStreetProps() {
    // Street lamps along quays and bridge
    const lampPoleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.0, 8);
    const lampHeadGeo = new THREE.BoxGeometry(0.8, 0.3, 1.4);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x333b42, metalness: 0.8, roughness: 0.3 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2cc });

    const lampPositions = [
      [-22, 4.0, 150], [25, 4.0, 150], [75, 4.0, 150], [125, 4.0, 150],
      [-22, 4.0, -160], [25, 4.0, -160], [75, 4.0, -160], [125, 4.0, -160],
      [4, 15.0, 20], [-20, 15.0, 20], [4, 15.0, -70], [-20, 15.0, -70]
    ];

    lampPositions.forEach(([x, y, z]) => {
      const pole = new THREE.Mesh(lampPoleGeo, lampMat);
      pole.position.set(x, y + 3.5, z);
      pole.castShadow = true;
      this.scene.add(pole);

      const head = new THREE.Mesh(lampHeadGeo, lampMat);
      head.position.set(x, y + 7.0, z);
      this.scene.add(head);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), bulbMat);
      bulb.position.set(x, y + 6.8, z);
      this.scene.add(bulb);

      const light = new THREE.PointLight(0xffecd0, 1.2, 35, 1.5);
      light.position.set(x, y + 6.6, z);
      this.scene.add(light);
    });

    // Trees on sidewalk
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 4.0, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.9 });
    const leavesGeo = new THREE.DodecahedronGeometry(2.4, 1);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e6b38, roughness: 0.8 });

    const treePositions = [
      [30, 4.0, 168], [60, 4.0, 168], [90, 4.0, 168], [120, 4.0, 168],
      [30, 4.0, -145], [60, 4.0, -145], [90, 4.0, -145], [120, 4.0, -145]
    ];

    treePositions.forEach(([x, y, z]) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 2.0;
      trunk.castShadow = true;
      tree.add(trunk);

      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.y = 4.8;
      leaves.castShadow = true;
      tree.add(leaves);

      tree.position.set(x, y, z);
      this.scene.add(tree);
      this.physics.createStaticBox(new THREE.Vector3(x, y + 2, z), new THREE.Vector3(0.7, 4.0, 0.7));
    });
  }

  async loadRotterdamModels() {
    try {
      const response = await fetch('/models/rotterdam_manifest.json');
      if (!response.ok) {
        console.warn('Could not load rotterdam_manifest.json, using procedural fallback');
        return;
      }
      const manifest = await response.json();
      console.log(`Loading ${manifest.models.length} real 3D models from 3Drotterdam...`);

      for (const mInfo of manifest.models) {
        this.loader.load(
          '/' + mInfo.file,
          (gltf) => {
            const root = gltf.scene;
            const offset = mInfo.offset || [0, 0, 0];
            root.position.set(offset[0], offset[1], offset[2]);

            // Setup shadows and materials
            root.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                  child.material.side = THREE.DoubleSide;
                }
              }
            });

            this.scene.add(root);
            this.models.set(mInfo.id, root);
            console.log(`Loaded 3D Rotterdam model: ${mInfo.name} at [${offset}]`);

            // Add building collision bounds if it's a building sector
            if (mInfo.type === 'buildings') {
              this.addBuildingCollisions(root, offset);
            }
          },
          undefined,
          (err) => {
            console.warn(`Failed loading model ${mInfo.file}:`, err);
          }
        );
      }
    } catch (e) {
      console.warn('Error loading Rotterdam manifest:', e);
    }
  }

  addBuildingCollisions(meshGroup, baseOffset) {
    // Generate bounding box colliders for buildings to prevent player/car clipping
    meshGroup.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.geometry.computeBoundingBox();
        const bbox = child.geometry.boundingBox;
        if (bbox) {
          const size = new THREE.Vector3();
          bbox.getSize(size);
          // Only add colliders for substantial structures (> 5m height)
          if (size.y > 6.0 && size.x > 5.0 && size.z > 5.0) {
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            center.add(child.position);
            center.add(new THREE.Vector3(baseOffset[0], baseOffset[1], baseOffset[2]));

            this.physics.createStaticBox(
              center,
              new THREE.Vector3(size.x * 0.95, size.y, size.z * 0.95)
            );
          }
        }
      }
    });
  }
}
