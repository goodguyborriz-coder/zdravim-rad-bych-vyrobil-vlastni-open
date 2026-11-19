import * as THREE from 'three';
import { PhysicsWorld } from './physics.js';
import { WaterSystem } from './water.js';
import { CityManager } from './city.js';
import { Player } from './player.js';
import { Car } from './car.js';
import { Boat } from './boat.js';
import { Minimap } from './minimap.js';
import { UIManager } from './ui.js';

/**
 * Rotterdam Open World - Main Application Orchestrator
 */

class GameApp {
  constructor() {
    this.mode = 'foot'; // 'foot' | 'car' | 'boat'
    this.timeOfDay = 'day'; // 'day' | 'sunset' | 'night'

    this.initRenderer();
    this.initScene();
    this.initSystems();
    this.initInteractionEvents();
    this.initTimeOfDay();

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8bc3eb);
    this.scene.fog = new THREE.FogExp2(0x8bc3eb, 0.0012);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 2000);
    this.camera.position.set(5, 7, 146);

    // Sun / Directional Light
    this.sunLight = new THREE.DirectionalLight(0xfff7e6, 2.4);
    this.sunLight.position.set(120, 180, 80);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 450;
    this.sunLight.shadow.camera.left = -160;
    this.sunLight.shadow.camera.right = 160;
    this.sunLight.shadow.camera.top = 160;
    this.sunLight.shadow.camera.bottom = -160;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // Hemisphere Light
    this.hemiLight = new THREE.HemisphereLight(0xddeeff, 0x203040, 1.1);
    this.scene.add(this.hemiLight);

    // Ambient
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(this.ambientLight);
  }

  initSystems() {
    this.physics = new PhysicsWorld();
    this.water = new WaterSystem(this.scene);
    this.city = new CityManager(this.scene, this.physics);

    this.player = new Player(this.scene, this.physics, this.camera, this.renderer.domElement);
    this.car = new Car(this.scene, this.physics, this.camera);
    this.boat = new Boat(this.scene, this.physics, this.water, this.camera);

    this.minimap = new Minimap('minimap-container');
    this.ui = new UIManager();
    this.ui.setMode('foot');
  }

  initInteractionEvents() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'e' || key === 'f') {
        this.handleVehicleAction();
      }
    });

    const respawnBtn = document.getElementById('btn-respawn');
    if (respawnBtn) {
      respawnBtn.addEventListener('click', () => {
        this.respawnAll();
      });
    }
  }

  handleVehicleAction() {
    const playerPos = this.player.getPosition();

    if (this.mode === 'foot') {
      const carDist = this.car.getInteractionDistance(playerPos);
      const boatDist = this.boat.getInteractionDistance(playerPos);

      if (carDist < 3.8) {
        // Enter car
        this.mode = 'car';
        this.player.active = false;
        this.car.active = true;
        this.boat.active = false;
        this.ui.setMode('car');
      } else if (boatDist < 5.0) {
        // Enter boat
        this.mode = 'boat';
        this.player.active = false;
        this.car.active = false;
        this.boat.active = true;
        this.ui.setMode('boat');
      }
    } else if (this.mode === 'car') {
      // Exit car
      const exitPos = this.car.getExitPosition();
      this.mode = 'foot';
      this.player.spawn(exitPos);
      this.player.active = true;
      this.car.active = false;
      this.ui.setMode('foot');
    } else if (this.mode === 'boat') {
      // Exit boat onto dock
      const exitPos = this.boat.getExitPosition();
      this.mode = 'foot';
      this.player.spawn(exitPos);
      this.player.active = true;
      this.boat.active = false;
      this.ui.setMode('foot');
    }
  }

  respawnAll() {
    this.mode = 'foot';
    this.player.active = true;
    this.car.active = false;
    this.boat.active = false;
    this.player.spawn(new THREE.Vector3(5, 5.5, 140));
    this.car.spawn(new THREE.Vector3(8, 5.0, 142), 0);
    this.boat.spawn(new THREE.Vector3(-22.5, 1.2, 80), -Math.PI / 2);
    this.ui.setMode('foot');
  }

  initTimeOfDay() {
    const todBtn = document.getElementById('btn-tod');
    if (!todBtn) return;

    todBtn.addEventListener('click', () => {
      if (this.timeOfDay === 'day') {
        this.setTimeOfDay('sunset');
        todBtn.textContent = '🌅 Západ slunce';
      } else if (this.timeOfDay === 'sunset') {
        this.setTimeOfDay('night');
        todBtn.textContent = '🌙 Noc';
      } else {
        this.setTimeOfDay('day');
        todBtn.textContent = '☀️ Den';
      }
    });
  }

  setTimeOfDay(tod) {
    this.timeOfDay = tod;
    if (tod === 'day') {
      this.scene.background.setHex(0x8bc3eb);
      this.scene.fog.color.setHex(0x8bc3eb);
      this.sunLight.color.setHex(0xfff7e6);
      this.sunLight.intensity = 2.4;
      this.sunLight.position.set(120, 180, 80);
      this.hemiLight.color.setHex(0xddeeff);
      this.hemiLight.groundColor.setHex(0x203040);
      this.hemiLight.intensity = 1.1;
      this.renderer.toneMappingExposure = 1.1;
    } else if (tod === 'sunset') {
      this.scene.background.setHex(0xe07246);
      this.scene.fog.color.setHex(0xcc6038);
      this.sunLight.color.setHex(0xff884d);
      this.sunLight.intensity = 2.0;
      this.sunLight.position.set(220, 45, 60);
      this.hemiLight.color.setHex(0xff9a6c);
      this.hemiLight.groundColor.setHex(0x2d1b18);
      this.hemiLight.intensity = 0.8;
      this.renderer.toneMappingExposure = 1.25;
    } else if (tod === 'night') {
      this.scene.background.setHex(0x080f1a);
      this.scene.fog.color.setHex(0x080f1a);
      this.sunLight.color.setHex(0x354b6b);
      this.sunLight.intensity = 0.35;
      this.sunLight.position.set(50, 120, 50);
      this.hemiLight.color.setHex(0x1a273b);
      this.hemiLight.groundColor.setHex(0x05080e);
      this.hemiLight.intensity = 0.45;
      this.renderer.toneMappingExposure = 0.9;
    }
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    // 1. Step physics
    this.physics.step(dt);

    // 2. Update water simulation
    this.water.update(dt);

    // 3. Update active entities
    this.player.update(dt);
    this.car.update(dt);
    this.boat.update(dt);

    // 4. Mode interactions and HUD updates
    const playerPos = this.player.getPosition();
    if (this.mode === 'foot') {
      const carDist = this.car.getInteractionDistance(playerPos);
      const boatDist = this.boat.getInteractionDistance(playerPos);

      if (carDist < 3.8) {
        this.ui.showPrompt('Nasednout do auta [Rotterdam GT]');
      } else if (boatDist < 5.0) {
        this.ui.showPrompt('Nastoupit do lodi [Rotterdam Wave]');
      } else {
        this.ui.hidePrompt();
      }
    } else if (this.mode === 'car') {
      this.ui.updateDashboard(
        this.car.speedKmh,
        180,
        `Stupeň: ${this.car.gear}`,
        `RPM: ${Math.round(this.car.rpm)}`
      );
    } else if (this.mode === 'boat') {
      this.ui.updateDashboard(
        this.boat.speedKnots,
        35,
        `Plyn: ${Math.round(Math.abs(this.boat.throttle) * 100)}%`,
        `Kormidlo: ${Math.round((this.boat.rudderAngle * 180) / Math.PI)}°`
      );
    }

    // 5. Update Minimap radar
    const centerPos = (this.mode === 'car') ? this.car.chassisBody.position :
                      (this.mode === 'boat') ? this.boat.body.position : playerPos;

    const activeYaw = (this.mode === 'car') ? this.car.mesh.rotation.y :
                      (this.mode === 'boat') ? this.boat.mesh.rotation.y : this.player.mesh.rotation.y;

    this.minimap.update(
      centerPos,
      (this.mode === 'foot') ? playerPos : null,
      activeYaw,
      this.car.chassisBody.position,
      this.boat.body.position
    );

    // 6. Render
    this.renderer.render(this.scene, this.camera);
  }
}

// Launch application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
