// OPERATION IRON FRONT - Main Game Engine
import * as THREE from 'three';
import {
  GameState, GameUnit, GameBuilding, Projectile, Particle, ResourceDeposit,
  UnitType, BuildingType, Team, Vec3, UNIT_STATS, BUILDING_STATS,
  MAP_SIZE, RESOURCE_RATE, STARTING_RESOURCES
} from './types';

// Simple noise function for terrain
function noise2D(x: number, z: number): number {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, z: number, scale: number): number {
  const sx = x / scale;
  const sz = z / scale;
  const ix = Math.floor(sx);
  const iz = Math.floor(sz);
  const fx = sx - ix;
  const fz = sz - iz;
  const a = noise2D(ix, iz);
  const b = noise2D(ix + 1, iz);
  const c = noise2D(ix, iz + 1);
  const d = noise2D(ix + 1, iz + 1);
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  return a * (1 - ux) * (1 - uz) + b * ux * (1 - uz) + c * (1 - ux) * uz + d * ux * uz;
}

function fbm(x: number, z: number): number {
  return smoothNoise(x, z, 30) * 3 +
    smoothNoise(x, z, 15) * 1.5 +
    smoothNoise(x, z, 7) * 0.5;
}

function getTerrainHeight(x: number, z: number): number {
  let h = fbm(x + 50, z + 50);
  // Flatten areas near bases
  const d1 = Math.sqrt((x - 20) ** 2 + (z - 20) ** 2);
  const d2 = Math.sqrt((x - 100) ** 2 + (z - 100) ** 2);
  if (d1 < 15) h *= d1 / 15;
  if (d2 < 15) h *= d2 / 15;
  return h;
}

let idCounter = 0;
function genId(): string {
  return `id_${idCounter++}`;
}

// Vehicle mesh creation
function createVehicleMesh(type: UnitType, team: Team): THREE.Group {
  const group = new THREE.Group();
  const teamColor = team === 'player' ? 0x3a7d44 : 0x8b2020;
  const darkColor = team === 'player' ? 0x2a5a30 : 0x5a1515;
  const metalColor = 0x4a4a4a;
  const trackColor = 0x2a2a2a;

  const mat = (color: number, metalness = 0.3, roughness = 0.7) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });

  switch (type) {
    case 'scout': {
      // Light fast vehicle
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 2), mat(teamColor));
      body.position.y = 0.4;
      group.add(body);
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 1), mat(darkColor));
      top.position.set(0, 0.7, -0.2);
      group.add(top);
      // Turret
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.25, 8), mat(metalColor, 0.5));
      turret.position.set(0, 0.9, 0);
      turret.name = 'turret';
      group.add(turret);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), mat(metalColor, 0.6));
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.9, 0.7);
      barrel.name = 'barrel';
      group.add(barrel);
      // Wheels
      for (let i = -1; i <= 1; i += 2) {
        for (let j = -1; j <= 1; j++) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.15, 8), mat(trackColor));
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(i * 0.65, 0.2, j * 0.7);
          group.add(wheel);
        }
      }
      // Antenna
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 4), mat(0x888888));
      ant.position.set(0.3, 1.2, -0.4);
      group.add(ant);
      break;
    }
    case 'light_tank': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.8), mat(teamColor));
      body.position.y = 0.45;
      group.add(body);
      // Tracks
      for (let i = -1; i <= 1; i += 2) {
        const track = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 3), mat(trackColor));
        track.position.set(i * 0.9, 0.25, 0);
        group.add(track);
      }
      // Turret
      const turret = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 1.2), mat(darkColor, 0.4));
      turret.position.set(0, 0.9, -0.1);
      turret.name = 'turret';
      group.add(turret);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.8, 8), mat(metalColor, 0.6));
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.9, 1);
      barrel.name = 'barrel';
      group.add(barrel);
      // Details
      const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8), mat(metalColor));
      hatch.position.set(0, 1.15, -0.3);
      group.add(hatch);
      break;
    }
    case 'medium_tank': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 3.5), mat(teamColor));
      body.position.y = 0.5;
      group.add(body);
      // Sloped front armor
      const front = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.6), mat(darkColor));
      front.position.set(0, 0.7, 1.6);
      front.rotation.x = -0.3;
      group.add(front);
      // Tracks
      for (let i = -1; i <= 1; i += 2) {
        const track = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 3.8), mat(trackColor));
        track.position.set(i * 1.1, 0.3, 0);
        group.add(track);
        // Track wheels
        for (let j = -1.5; j <= 1.5; j += 0.75) {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 8), mat(0x333333));
          w.rotation.z = Math.PI / 2;
          w.position.set(i * 1.1, 0.2, j);
          group.add(w);
        }
      }
      // Turret
      const turret = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 1.5), mat(darkColor, 0.4));
      turret.position.set(0, 1.05, -0.2);
      turret.name = 'turret';
      group.add(turret);
      // Gun mantlet
      const mantlet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(metalColor, 0.5));
      mantlet.position.set(0, 1, 0.6);
      mantlet.rotation.x = -Math.PI / 2;
      group.add(mantlet);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.5, 8), mat(metalColor, 0.7));
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 1.05, 1.5);
      barrel.name = 'barrel';
      group.add(barrel);
      // ERA panels
      for (let i = -1; i <= 1; i += 2) {
        const era = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.5), mat(0x556655));
        era.position.set(i * 0.7, 1.1, 0.3);
        group.add(era);
      }
      break;
    }
    case 'heavy_tank': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.7, 4.2), mat(teamColor));
      body.position.y = 0.55;
      group.add(body);
      // Heavy tracks
      for (let i = -1; i <= 1; i += 2) {
        const track = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 4.5), mat(trackColor));
        track.position.set(i * 1.35, 0.35, 0);
        group.add(track);
        for (let j = -2; j <= 2; j += 0.6) {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 8), mat(0x333333));
          w.rotation.z = Math.PI / 2;
          w.position.set(i * 1.35, 0.25, j);
          group.add(w);
        }
      }
      // Skirts
      for (let i = -1; i <= 1; i += 2) {
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 4), mat(darkColor));
        skirt.position.set(i * 1.55, 0.5, 0);
        group.add(skirt);
      }
      // Large turret
      const turret = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.8), mat(darkColor, 0.4));
      turret.position.set(0, 1.2, -0.2);
      turret.name = 'turret';
      group.add(turret);
      // Heavy barrel
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 3.2, 8), mat(metalColor, 0.7));
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 1.2, 1.8);
      barrel.name = 'barrel';
      group.add(barrel);
      // Muzzle brake
      const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.2, 8), mat(metalColor, 0.8));
      brake.rotation.x = Math.PI / 2;
      brake.position.set(0, 1.2, 3.3);
      group.add(brake);
      // Commander cupola
      const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.2, 8), mat(metalColor));
      cupola.position.set(-0.4, 1.55, -0.5);
      group.add(cupola);
      break;
    }
    case 'artillery': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 3), mat(teamColor));
      body.position.y = 0.45;
      group.add(body);
      for (let i = -1; i <= 1; i += 2) {
        const track = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 3.2), mat(trackColor));
        track.position.set(i * 1, 0.28, 0);
        group.add(track);
      }
      // Large turret with long barrel
      const turret = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.4), mat(darkColor, 0.4));
      turret.position.set(0, 0.95, -0.5);
      turret.name = 'turret';
      group.add(turret);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 3.5, 8), mat(metalColor, 0.6));
      barrel.rotation.x = Math.PI / 2 - 0.3;
      barrel.position.set(0, 1.3, 1.2);
      barrel.name = 'barrel';
      group.add(barrel);
      // Stabilizer legs
      for (let i = -1; i <= 1; i += 2) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1), mat(metalColor));
        leg.position.set(i * 0.8, 0.2, -1.5);
        group.add(leg);
      }
      break;
    }
    case 'apc': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 3.2), mat(teamColor));
      body.position.y = 0.6;
      group.add(body);
      // Sloped front
      const front = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.5), mat(darkColor));
      front.position.set(0, 0.7, 1.5);
      front.rotation.x = -0.4;
      group.add(front);
      for (let i = -1; i <= 1; i += 2) {
        const track = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 3.4), mat(trackColor));
        track.position.set(i * 1, 0.3, 0);
        group.add(track);
      }
      // Small turret
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.3, 8), mat(metalColor, 0.5));
      turret.position.set(0, 1.15, 0.3);
      turret.name = 'turret';
      group.add(turret);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 6), mat(metalColor, 0.6));
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 1.15, 0.9);
      barrel.name = 'barrel';
      group.add(barrel);
      // Rear doors
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.05), mat(darkColor));
      door.position.set(0, 0.6, -1.6);
      group.add(door);
      break;
    }
    case 'harvester': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 3), mat(0xcc8833));
      body.position.y = 0.6;
      group.add(body);
      // Cargo area
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 1.5), mat(0x996622));
      cargo.position.set(0, 1.1, -0.5);
      group.add(cargo);
      for (let i = -1; i <= 1; i += 2) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 8), mat(trackColor));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(i * 1.1, 0.35, 0.8);
        group.add(wheel);
        const wheel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 8), mat(trackColor));
        wheel2.rotation.z = Math.PI / 2;
        wheel2.position.set(i * 1.1, 0.35, -0.8);
        group.add(wheel2);
      }
      // Crane arm
      const crane = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 1.5), mat(metalColor));
      crane.position.set(0.5, 1.2, 1);
      crane.rotation.x = -0.5;
      group.add(crane);
      break;
    }
  }

  // Add selection indicator ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.7, 32),
    new THREE.MeshBasicMaterial({ color: team === 'player' ? 0x00ff00 : 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.name = 'selectionRing';
  group.add(ring);

  // Health bar
  const hpBg = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 0.15),
    new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide })
  );
  hpBg.position.set(0, 2.5, 0);
  hpBg.name = 'hpBg';
  group.add(hpBg);

  const hpBar = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 0.15),
    new THREE.MeshBasicMaterial({ color: team === 'player' ? 0x00ff00 : 0xff3333, side: THREE.DoubleSide })
  );
  hpBar.position.set(0, 2.5, 0.01);
  hpBar.name = 'hpBar';
  group.add(hpBar);

  group.castShadow = true;
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

function createBuildingMesh(type: BuildingType, team: Team): THREE.Group {
  const group = new THREE.Group();
  const teamColor = team === 'player' ? 0x3a7d44 : 0x8b2020;
  const concrete = 0x666666;
  const metal = 0x555555;

  const mat = (color: number, metalness = 0.2, roughness = 0.8) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });

  switch (type) {
    case 'hq': {
      // Large command center
      const base = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 6), mat(concrete));
      base.position.y = 1;
      group.add(base);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 4), mat(teamColor));
      upper.position.y = 2.75;
      group.add(upper);
      // Antenna array
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 6), mat(metal, 0.6));
      ant.position.set(0, 5.5, 0);
      group.add(ant);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI), mat(metal, 0.7));
      dish.position.set(0, 7, 0);
      dish.rotation.x = Math.PI / 4;
      group.add(dish);
      // Windows (emissive)
      const windowMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x2244aa, emissiveIntensity: 0.5 });
      for (let i = -1; i <= 1; i++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), windowMat);
        win.position.set(i * 1.2, 2.5, 2.01);
        group.add(win);
      }
      // Armor walls
      for (let i = -1; i <= 1; i += 2) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.5, 6), mat(0x555555));
        wall.position.set(i * 3.15, 1.25, 0);
        group.add(wall);
      }
      break;
    }
    case 'factory': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 5), mat(concrete));
      base.position.y = 1.5;
      group.add(base);
      // Roof
      const roof = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.3, 5.5), mat(metal));
      roof.position.y = 3.15;
      group.add(roof);
      // Production bay door
      const door = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 0.1), mat(teamColor));
      door.position.set(0, 1.25, 2.5);
      group.add(door);
      // Chimney
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 8), mat(0x444444));
      chimney.position.set(2, 4, -1);
      group.add(chimney);
      // Crane
      const craneBase = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 0.3), mat(metal));
      craneBase.position.set(-2, 3.75, 0);
      group.add(craneBase);
      const craneArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 3), mat(metal));
      craneArm.position.set(-2, 4.5, 1);
      group.add(craneArm);
      break;
    }
    case 'powerplant': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.5, 3.5), mat(concrete));
      base.position.y = 1.25;
      group.add(base);
      // Cooling towers
      for (let i = -1; i <= 1; i += 2) {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 3, 8), mat(0x777777));
        tower.position.set(i * 1, 3.5, 0);
        group.add(tower);
      }
      // Power lines
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 4), mat(metal));
      pylon.position.set(0, 4.5, 1.5);
      group.add(pylon);
      // Glow
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3 })
      );
      glow.position.set(0, 1, 1.76);
      group.add(glow);
      break;
    }
    case 'refinery': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4), mat(concrete));
      base.position.y = 1;
      group.add(base);
      // Processing tanks
      for (let i = -1; i <= 1; i += 2) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.5, 8), mat(metal));
        tank.position.set(i * 1.2, 2.5, 0);
        group.add(tank);
      }
      // Pipes
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), mat(0x886633));
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 3, 1);
      group.add(pipe);
      // Conveyor
      const conv = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 4), mat(0x444444));
      conv.position.set(0, 0.5, 0);
      conv.rotation.x = 0.1;
      group.add(conv);
      break;
    }
    case 'turret': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 0.5, 8), mat(concrete));
      base.position.y = 0.25;
      group.add(base);
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.6, 8), mat(teamColor, 0.4));
      turret.position.y = 0.8;
      turret.name = 'turret';
      group.add(turret);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2, 6), mat(metal, 0.6));
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.8, 1.2);
      barrel.name = 'barrel';
      group.add(barrel);
      // Sandbags
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), mat(0x8b7355));
        bag.position.set(Math.cos(a) * 1.2, 0.15, Math.sin(a) * 1.2);
        bag.rotation.y = a;
        group.add(bag);
      }
      break;
    }
    case 'radar': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2.5), mat(concrete));
      base.position.y = 0.75;
      group.add(base);
      // Radar dish
      const dish = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 3), mat(metal, 0.6));
      dish.position.set(0, 3, 0);
      dish.rotation.x = Math.PI;
      dish.name = 'radarDish';
      group.add(dish);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2, 6), mat(metal));
      mast.position.set(0, 2.5, 0);
      group.add(mast);
      break;
    }
    case 'repair': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.5, 3.5), mat(concrete));
      base.position.y = 0.75;
      group.add(base);
      // Repair arms
      for (let i = -1; i <= 1; i += 2) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), mat(teamColor));
        arm.position.set(i * 1.2, 2.5, 0);
        group.add(arm);
        const armH = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.15), mat(metal));
        armH.position.set(i * 0.8, 3.5, 0);
        group.add(armH);
      }
      // Work platform
      const platform = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 3), mat(0x555555));
      platform.position.y = 0.05;
      group.add(platform);
      break;
    }
  }

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

function createResourceMesh(): THREE.Group {
  const group = new THREE.Group();
  // Ore/crystal cluster
  for (let i = 0; i < 5; i++) {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3 + Math.random() * 0.3, 0),
      new THREE.MeshStandardMaterial({
        color: 0xddaa33,
        metalness: 0.8,
        roughness: 0.3,
        emissive: 0x553300,
        emissiveIntensity: 0.2
      })
    );
    crystal.position.set(
      (Math.random() - 0.5) * 1.5,
      Math.random() * 0.5,
      (Math.random() - 0.5) * 1.5
    );
    crystal.rotation.set(Math.random(), Math.random(), Math.random());
    group.add(crystal);
  }
  // Base rock
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 })
  );
  rock.position.y = -0.3;
  rock.scale.y = 0.5;
  group.add(rock);
  return group;
}

// Pathfinding - simple A* on grid
class Pathfinder {
  private grid: number[][];
  private gridSize: number;
  private cellSize: number;

  constructor(mapSize: number, cellSize: number = 2) {
    this.gridSize = Math.ceil(mapSize / cellSize);
    this.cellSize = cellSize;
    this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));
  }

  worldToGrid(x: number, z: number): [number, number] {
    return [Math.floor(x / this.cellSize + this.gridSize / 2), Math.floor(z / this.cellSize + this.gridSize / 2)];
  }

  gridToWorld(gx: number, gz: number): Vec3 {
    return { x: (gx - this.gridSize / 2) * this.cellSize + this.cellSize / 2, y: 0, z: (gz - this.gridSize / 2) * this.cellSize + this.cellSize / 2 };
  }

  setBlocked(x: number, z: number, size: number) {
    const [gx, gz] = this.worldToGrid(x, z);
    const r = Math.ceil(size / this.cellSize);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const nx = gx + dx;
        const nz = gz + dz;
        if (nx >= 0 && nx < this.gridSize && nz >= 0 && nz < this.gridSize) {
          this.grid[nx][nz] = 1;
        }
      }
    }
  }

  findPath(start: Vec3, end: Vec3): Vec3[] {
    const [sx, sz] = this.worldToGrid(start.x, start.z);
    const [ex, ez] = this.worldToGrid(end.x, end.z);

    if (sx < 0 || sx >= this.gridSize || sz < 0 || sz >= this.gridSize) return [end];
    if (ex < 0 || ex >= this.gridSize || ez < 0 || ez >= this.gridSize) return [end];

    const open: { x: number; z: number; g: number; h: number; f: number; parent: any }[] = [];
    const closed = new Set<string>();
    const key = (x: number, z: number) => `${x},${z}`;

    const heuristic = (ax: number, az: number, bx: number, bz: number) =>
      Math.abs(ax - bx) + Math.abs(az - bz);

    open.push({ x: sx, z: sz, g: 0, h: heuristic(sx, sz, ex, ez), f: heuristic(sx, sz, ex, ez), parent: null });

    let iterations = 0;
    const maxIter = 500;

    while (open.length > 0 && iterations < maxIter) {
      iterations++;
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;

      if (current.x === ex && current.z === ez) {
        const path: Vec3[] = [];
        let node: any = current;
        while (node) {
          path.unshift(this.gridToWorld(node.x, node.z));
          node = node.parent;
        }
        path[path.length - 1] = { ...end, y: getTerrainHeight(end.x, end.z) };
        return path;
      }

      closed.add(key(current.x, current.z));

      const neighbors = [
        [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]
      ];

      for (const [dx, dz] of neighbors) {
        const nx = current.x + dx;
        const nz = current.z + dz;
        if (nx < 0 || nx >= this.gridSize || nz < 0 || nz >= this.gridSize) continue;
        if (closed.has(key(nx, nz))) continue;
        if (this.grid[nx][nz] === 1) continue;

        const g = current.g + (dx !== 0 && dz !== 0 ? 1.414 : 1);
        const h = heuristic(nx, nz, ex, ez);
        const existing = open.find(n => n.x === nx && n.z === nz);
        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = g + h;
            existing.parent = current;
          }
        } else {
          open.push({ x: nx, z: nz, g, h, f: g + h, parent: current });
        }
      }
    }

    // If no path found, return direct path
    return [start, end];
  }
}

export class GameEngine {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private state: GameState;
  private meshes: Map<string, THREE.Group> = new Map();
  private projectileMeshes: Map<string, THREE.Mesh> = new Map();
  private particleMeshes: Map<string, THREE.Mesh> = new Map();
  private pathfinder: Pathfinder;
  private container: HTMLElement;
  private animationId: number = 0;
  private lastTime: number = 0;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private groundPlane!: THREE.Mesh;
  private selectionBox: { start: { x: number; y: number }; end: { x: number; y: number } } | null = null;
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private cameraVelocity = { x: 0, z: 0 };
  private keys: Set<string> = new Set();
  private cameraZoom = 35;
  private cameraAngle = Math.PI / 4;
  private cameraTarget = new THREE.Vector3(60, 0, 60);
  private onStateChange: (state: GameState) => void;
  private audioCtx: AudioContext | null = null;
  private terrainMesh!: THREE.Mesh;
  private fogParticles: THREE.Points | null = null;
  private ambientParticles: THREE.Points | null = null;

  constructor(container: HTMLElement, onStateChange: (state: GameState) => void) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.pathfinder = new Pathfinder(MAP_SIZE, 2);
    this.state = this.createInitialState();
    this.init();
  }

  private createInitialState(): GameState {
    const state: GameState = {
      units: [],
      buildings: [],
      projectiles: [],
      particles: [],
      resources: [],
      playerResources: STARTING_RESOURCES,
      enemyResources: STARTING_RESOURCES,
      time: 0,
      gameTime: 0,
      paused: false,
      gameSpeed: 1,
      gameOver: false,
      winner: null,
      mission: 'Vorposten Alpha',
      missionObjective: 'Zerstöre das gegnerische Hauptquartier'
    };

    // Player buildings
    state.buildings.push({
      id: genId(), type: 'hq', team: 'player',
      position: { x: 20, y: 0, z: 20 }, hp: 1000, maxHp: 1000,
      producing: null, productionProgress: 0, rallyPoint: { x: 25, y: 0, z: 25 }
    });
    state.buildings.push({
      id: genId(), type: 'factory', team: 'player',
      position: { x: 28, y: 0, z: 18 }, hp: 600, maxHp: 600,
      producing: null, productionProgress: 0, rallyPoint: { x: 32, y: 0, z: 22 }
    });
    state.buildings.push({
      id: genId(), type: 'powerplant', team: 'player',
      position: { x: 15, y: 0, z: 26 }, hp: 400, maxHp: 400,
      producing: null, productionProgress: 0, rallyPoint: null
    });
    state.buildings.push({
      id: genId(), type: 'refinery', team: 'player',
      position: { x: 22, y: 0, z: 28 }, hp: 500, maxHp: 500,
      producing: null, productionProgress: 0, rallyPoint: null
    });

    // Enemy buildings
    state.buildings.push({
      id: genId(), type: 'hq', team: 'enemy',
      position: { x: 100, y: 0, z: 100 }, hp: 1000, maxHp: 1000,
      producing: null, productionProgress: 0, rallyPoint: { x: 95, y: 0, z: 95 }
    });
    state.buildings.push({
      id: genId(), type: 'factory', team: 'enemy',
      position: { x: 93, y: 0, z: 102 }, hp: 600, maxHp: 600,
      producing: null, productionProgress: 0, rallyPoint: { x: 90, y: 0, z: 98 }
    });
    state.buildings.push({
      id: genId(), type: 'powerplant', team: 'enemy',
      position: { x: 105, y: 0, z: 95 }, hp: 400, maxHp: 400,
      producing: null, productionProgress: 0, rallyPoint: null
    });
    state.buildings.push({
      id: genId(), type: 'turret', team: 'enemy',
      position: { x: 90, y: 0, z: 95 }, hp: 300, maxHp: 300,
      producing: null, productionProgress: 0, rallyPoint: null
    });
    state.buildings.push({
      id: genId(), type: 'turret', team: 'enemy',
      position: { x: 95, y: 0, z: 90 }, hp: 300, maxHp: 300,
      producing: null, productionProgress: 0, rallyPoint: null
    });

    // Player starting units
    state.units.push(this.createUnit('medium_tank', 'player', { x: 30, y: 0, z: 25 }));
    state.units.push(this.createUnit('medium_tank', 'player', { x: 32, y: 0, z: 27 }));
    state.units.push(this.createUnit('light_tank', 'player', { x: 28, y: 0, z: 30 }));
    state.units.push(this.createUnit('scout', 'player', { x: 34, y: 0, z: 24 }));
    state.units.push(this.createUnit('harvester', 'player', { x: 24, y: 0, z: 30 }));

    // Enemy starting units
    state.units.push(this.createUnit('medium_tank', 'enemy', { x: 88, y: 0, z: 95 }));
    state.units.push(this.createUnit('medium_tank', 'enemy', { x: 90, y: 0, z: 92 }));
    state.units.push(this.createUnit('light_tank', 'enemy', { x: 86, y: 0, z: 90 }));
    state.units.push(this.createUnit('heavy_tank', 'enemy', { x: 92, y: 0, z: 88 }));
    state.units.push(this.createUnit('harvester', 'enemy', { x: 98, y: 0, z: 90 }));

    // Resource deposits
    const resourcePositions = [
      { x: 40, z: 35 }, { x: 55, z: 50 }, { x: 35, z: 55 },
      { x: 70, z: 65 }, { x: 80, z: 75 }, { x: 60, z: 40 },
      { x: 50, z: 70 }, { x: 75, z: 50 }
    ];
    for (const pos of resourcePositions) {
      state.resources.push({
        id: genId(),
        position: { x: pos.x, y: getTerrainHeight(pos.x, pos.z), z: pos.z },
        amount: 2000,
        maxAmount: 2000
      });
    }

    return state;
  }

  private createUnit(type: UnitType, team: Team, position: Vec3): GameUnit {
    const stats = UNIT_STATS[type];
    return {
      id: genId(),
      type,
      team,
      position: { ...position, y: getTerrainHeight(position.x, position.z) },
      rotation: team === 'player' ? Math.PI / 4 : -Math.PI * 0.75,
      turretRotation: 0,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      state: 'idle',
      targetId: null,
      targetPos: null,
      lastFireTime: 0,
      selected: false,
      speed: stats.speed,
      path: [],
      pathIndex: 0
    };
  }

  private init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a15);
    this.scene.fog = new THREE.FogExp2(0x0a0a15, 0.006);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.5, 300);
    this.updateCameraPosition();

    // Lighting
    const ambient = new THREE.AmbientLight(0x223344, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffd4a0, 1.4);
    dirLight.position.set(50, 70, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.camera.left = -80;
    dirLight.shadow.camera.right = 80;
    dirLight.shadow.camera.top = 80;
    dirLight.shadow.camera.bottom = -80;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.normalBias = 0.02;
    this.scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x6688aa, 0x332211, 0.35);
    this.scene.add(hemiLight);

    // Subtle fill light from opposite direction
    const fillLight = new THREE.DirectionalLight(0x445566, 0.3);
    fillLight.position.set(-30, 20, -40);
    this.scene.add(fillLight);

    // Sky
    this.createSky();

    // Terrain
    this.createTerrain();

    // Create meshes for existing objects
    this.syncMeshes();

    // Events
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp);
    this.renderer.domElement.addEventListener('wheel', this.onWheel);
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Start loop
    this.lastTime = performance.now();
    this.animate();

    // Audio context
    try {
      this.audioCtx = new AudioContext();
    } catch (e) { /* no audio */ }
  }

  private createSky() {
    // Gradient sky dome
    const skyGeo = new THREE.SphereGeometry(150, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0a0a1a) },
        bottomColor: { value: new THREE.Color(0x1a1510) },
        offset: { value: 10 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  private createTerrain() {
    const size = MAP_SIZE;
    const segments = 120;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const h = getTerrainHeight(x + size / 2, z + size / 2);
      positions.setY(i, h);

      // Color based on height and noise
      const n = smoothNoise(x + 50, z + 50, 5);
      let r, g, b;
      if (h < 0.5) {
        r = 0.15 + n * 0.05; g = 0.18 + n * 0.05; b = 0.12;
      } else if (h < 2) {
        r = 0.2 + n * 0.1; g = 0.22 + n * 0.08; b = 0.15;
      } else {
        r = 0.25 + n * 0.1; g = 0.2 + n * 0.05; b = 0.15;
      }
      // Roads
      const roadDist1 = Math.abs(x - z) / 1.414;
      const roadDist2 = Math.abs(x + z - size) / 1.414;
      if (roadDist1 < 1.5 || roadDist2 < 1.5) {
        r = 0.18; g = 0.18; b = 0.17;
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: false
    });

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // Ground plane for raycasting
    this.groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(size * 2, size * 2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.set(size / 2 - size / 2, 0, size / 2 - size / 2);
    this.scene.add(this.groundPlane);

    // Add environmental details
    this.addEnvironmentDetails();

    // Atmospheric particles
    this.createAtmosphericParticles();
  }

  private addEnvironmentDetails() {
    // Scattered rocks
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.9 });
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * MAP_SIZE;
      const z = Math.random() * MAP_SIZE;
      const h = getTerrainHeight(x, z);
      const scale = 0.3 + Math.random() * 0.8;
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(x - MAP_SIZE / 2 + MAP_SIZE / 2, h, z - MAP_SIZE / 2 + MAP_SIZE / 2);
      rock.position.x = x;
      rock.position.z = z;
      rock.scale.set(scale, scale * 0.6, scale);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }

    // Dead trees
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * MAP_SIZE;
      const z = Math.random() * MAP_SIZE;
      const h = getTerrainHeight(x, z);
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 2, 5),
        new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.95 })
      );
      trunk.position.y = 1;
      tree.add(trunk);
      // Dead branches
      for (let b = 0; b < 3; b++) {
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.04, 0.8, 4),
          new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.95 })
        );
        branch.position.set(0, 1.2 + b * 0.3, 0);
        branch.rotation.z = (Math.random() - 0.5) * 1.5;
        branch.rotation.y = Math.random() * Math.PI * 2;
        tree.add(branch);
      }
      tree.position.set(x, h, z);
      tree.castShadow = true;
      this.scene.add(tree);
    }

    // Ruined structures
    for (let i = 0; i < 8; i++) {
      const x = 30 + Math.random() * 60;
      const z = 30 + Math.random() * 60;
      const h = getTerrainHeight(x, z);
      const ruin = new THREE.Group();
      const wallH = 1 + Math.random() * 2;
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(2 + Math.random() * 2, wallH, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.95 })
      );
      wall.position.y = wallH / 2;
      wall.rotation.y = Math.random() * Math.PI;
      ruin.add(wall);
      if (Math.random() > 0.5) {
        const wall2 = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, wallH * 0.7, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.95 })
        );
        wall2.position.set(1, wallH * 0.35, 1);
        wall2.rotation.y = Math.PI / 2 + Math.random() * 0.3;
        ruin.add(wall2);
      }
      ruin.position.set(x, h, z);
      ruin.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });
      this.scene.add(ruin);
    }

    // Block pathfinding for buildings
    for (const b of this.state.buildings) {
      this.pathfinder.setBlocked(b.position.x, b.position.z, BUILDING_STATS[b.type].size);
    }
  }

  private createAtmosphericParticles() {
    // Dust/haze particles
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = Math.random() * MAP_SIZE;
      positions[i * 3 + 1] = Math.random() * 5 + 1;
      positions[i * 3 + 2] = Math.random() * MAP_SIZE;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x998877,
      size: 0.5,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true
    });
    this.ambientParticles = new THREE.Points(geo, mat);
    this.scene.add(this.ambientParticles);
  }

  private syncMeshes() {
    // Remove old meshes
    const activeIds = new Set<string>();

    // Units
    for (const unit of this.state.units) {
      activeIds.add(unit.id);
      if (!this.meshes.has(unit.id)) {
        const mesh = createVehicleMesh(unit.type, unit.team);
        mesh.position.set(unit.position.x, unit.position.y, unit.position.z);
        mesh.rotation.y = unit.rotation;
        this.scene.add(mesh);
        this.meshes.set(unit.id, mesh);
      }
    }

    // Buildings
    for (const building of this.state.buildings) {
      activeIds.add(building.id);
      if (!this.meshes.has(building.id)) {
        const mesh = createBuildingMesh(building.type, building.team);
        const h = getTerrainHeight(building.position.x, building.position.z);
        mesh.position.set(building.position.x, h, building.position.z);
        this.scene.add(mesh);
        this.meshes.set(building.id, mesh);
        this.pathfinder.setBlocked(building.position.x, building.position.z, BUILDING_STATS[building.type].size);
      }
    }

    // Resources
    for (const res of this.state.resources) {
      activeIds.add(res.id);
      if (!this.meshes.has(res.id)) {
        const mesh = createResourceMesh();
        mesh.position.set(res.position.x, res.position.y, res.position.z);
        this.scene.add(mesh);
        this.meshes.set(res.id, mesh);
      }
    }

    // Remove deleted meshes
    for (const [id, mesh] of this.meshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.meshes.delete(id);
      }
    }
  }

  private updateMeshes() {
    for (const unit of this.state.units) {
      const mesh = this.meshes.get(unit.id);
      if (!mesh) continue;

      mesh.position.set(unit.position.x, unit.position.y, unit.position.z);
      mesh.rotation.y = unit.rotation;

      // Turret rotation
      const turret = mesh.getObjectByName('turret');
      if (turret) {
        turret.rotation.y = unit.turretRotation - unit.rotation;
      }
      const barrel = mesh.getObjectByName('barrel');
      if (barrel) {
        barrel.parent!.rotation.y = unit.turretRotation - unit.rotation;
      }

      // Selection ring
      const ring = mesh.getObjectByName('selectionRing') as THREE.Mesh;
      if (ring) {
        const ringMat = ring.material as THREE.MeshBasicMaterial;
        ringMat.opacity = unit.selected ? 0.7 : 0;
        ringMat.color.setHex(unit.team === 'player' ? 0x00ff88 : 0xff4444);
      }

      // Health bar
      const hpBar = mesh.getObjectByName('hpBar') as THREE.Mesh;
      if (hpBar) {
        const ratio = unit.hp / unit.maxHp;
        hpBar.scale.x = Math.max(0.01, ratio);
        hpBar.position.x = -(1 - ratio);
        const hpMat = hpBar.material as THREE.MeshBasicMaterial;
        if (ratio > 0.6) hpMat.color.setHex(0x00ff00);
        else if (ratio > 0.3) hpMat.color.setHex(0xffaa00);
        else hpMat.color.setHex(0xff3333);
        // Billboard
        hpBar.lookAt(this.camera.position);
        const hpBg = mesh.getObjectByName('hpBg');
        if (hpBg) hpBg.lookAt(this.camera.position);
      }
    }

    // Update projectiles
    for (const proj of this.state.projectiles) {
      let mesh = this.projectileMeshes.get(proj.id);
      if (!mesh) {
        const geo = proj.type === 'rocket'
          ? new THREE.ConeGeometry(0.08, 0.3, 6)
          : new THREE.SphereGeometry(proj.type === 'shell' ? 0.1 : 0.05, 6, 4);
        const mat = new THREE.MeshBasicMaterial({
          color: proj.type === 'rocket' ? 0xff6600 : 0xffff00
        });
        mesh = new THREE.Mesh(geo, mat);
        this.scene.add(mesh);
        this.projectileMeshes.set(proj.id, mesh);
      }
      mesh.position.set(proj.position.x, proj.position.y, proj.position.z);
      mesh.lookAt(
        proj.position.x + proj.velocity.x,
        proj.position.y + proj.velocity.y,
        proj.position.z + proj.velocity.z
      );
    }

    // Clean up old projectile meshes
    const activeProjIds = new Set(this.state.projectiles.map(p => p.id));
    for (const [id, mesh] of this.projectileMeshes) {
      if (!activeProjIds.has(id)) {
        this.scene.remove(mesh);
        this.projectileMeshes.delete(id);
      }
    }

    // Update particles
    for (const particle of this.state.particles) {
      let mesh = this.particleMeshes.get(`${particle.position.x}_${particle.position.z}_${Math.random()}`);
      // We'll handle particles differently - use a simpler approach
    }
  }

  private updateCameraPosition() {
    const dist = this.cameraZoom;
    const height = dist * Math.sin(this.cameraAngle);
    const flatDist = dist * Math.cos(this.cameraAngle);
    this.camera.position.set(
      this.cameraTarget.x - flatDist * Math.cos(Math.PI / 4),
      this.cameraTarget.y + height,
      this.cameraTarget.z - flatDist * Math.sin(Math.PI / 4)
    );
    this.camera.lookAt(this.cameraTarget);
  }

  // Game loop
  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05); // Cap delta time

    if (!this.state.paused && !this.state.gameOver) {
      this.update(dt * this.state.gameSpeed);
    }

    this.updateCamera(dt);
    this.updateMeshes();
    this.updateParticles(dt);
    this.updateAtmosphere(dt);
    this.renderer.render(this.scene, this.camera);
    this.onStateChange({ ...this.state });
  }

  private needsSync = false;

  private update(dt: number) {
    this.state.time += dt;
    this.state.gameTime += dt;

    this.updateUnits(dt);
    this.updateCombat(dt);
    this.updateProjectiles(dt);
    this.updateBuildings(dt);
    this.updateAI(dt);
    this.updateResources(dt);
    this.checkWinCondition();

    if (this.needsSync) {
      this.syncMeshes();
      this.needsSync = false;
    }
  }

  private updateUnits(dt: number) {
    this.dustTimer += dt;

    for (const unit of this.state.units) {
      if (unit.state === 'dead') continue;

      const stats = UNIT_STATS[unit.type];

      switch (unit.state) {
        case 'moving':
          this.moveUnit(unit, dt);
          break;
        case 'attacking':
          this.attackUnit(unit, dt);
          break;
        case 'idle':
          // Look for nearby enemies
          this.findTarget(unit);
          break;
      }

      // Update terrain height
      unit.position.y = getTerrainHeight(unit.position.x, unit.position.z);

      // Dust trails for moving vehicles
      if ((unit.state === 'moving' || (unit.state === 'attacking' && unit.path.length > 0)) && this.dustTimer > 0.15) {
        if (unit.type !== 'harvester' || Math.random() > 0.5) {
          this.state.particles.push({
            position: {
              x: unit.position.x - Math.sin(unit.rotation) * 1.5 + (Math.random() - 0.5) * 0.5,
              y: unit.position.y + 0.1,
              z: unit.position.z - Math.cos(unit.rotation) * 1.5 + (Math.random() - 0.5) * 0.5
            },
            velocity: { x: (Math.random() - 0.5) * 0.5, y: 0.5 + Math.random() * 0.5, z: (Math.random() - 0.5) * 0.5 },
            life: 0.5 + Math.random() * 0.5,
            maxLife: 1,
            size: 0.2 + Math.random() * 0.3,
            color: '#887766',
            type: 'dust'
          });
        }
      }
    }

    if (this.dustTimer > 0.15) this.dustTimer = 0;

    // Remove dead units
    const hadDead = this.state.units.some(u => u.state === 'dead');
    const deadUnits = this.state.units.filter(u => u.state === 'dead');
    for (const du of deadUnits) {
      this.createExplosion(du.position, du.type === 'heavy_tank' ? 2 : 1);
    }
    if (hadDead) {
      this.state.units = this.state.units.filter(u => u.state !== 'dead');
      this.needsSync = true;
    }
  }

  private moveUnit(unit: GameUnit, dt: number) {
    if (unit.path.length === 0 || unit.pathIndex >= unit.path.length) {
      unit.state = 'idle';
      return;
    }

    const target = unit.path[unit.pathIndex];
    const dx = target.x - unit.position.x;
    const dz = target.z - unit.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.5) {
      unit.pathIndex++;
      if (unit.pathIndex >= unit.path.length) {
        unit.state = 'idle';
        if (unit.targetPos && unit.targetId) {
          unit.state = 'attacking';
        }
      }
      return;
    }

    // Rotate towards target
    const targetAngle = Math.atan2(dx, dz);
    let angleDiff = targetAngle - unit.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const stats = UNIT_STATS[unit.type];
    const turnAmount = stats.turnSpeed * dt;
    if (Math.abs(angleDiff) > turnAmount) {
      unit.rotation += Math.sign(angleDiff) * turnAmount;
    } else {
      unit.rotation = targetAngle;
    }

    // Move forward
    const moveSpeed = stats.speed * dt;
    if (Math.abs(angleDiff) < Math.PI / 3) {
      unit.position.x += Math.sin(unit.rotation) * moveSpeed;
      unit.position.z += Math.cos(unit.rotation) * moveSpeed;
    }

    // Clamp to map
    unit.position.x = Math.max(1, Math.min(MAP_SIZE - 1, unit.position.x));
    unit.position.z = Math.max(1, Math.min(MAP_SIZE - 1, unit.position.z));

    // Look for enemies while moving
    if (unit.type !== 'harvester') {
      this.findTarget(unit);
    }
  }

  private findTarget(unit: GameUnit) {
    const stats = UNIT_STATS[unit.type];
    let closestDist = stats.sightRange;
    let closestUnit: GameUnit | null = null;

    for (const other of this.state.units) {
      if (other.team === unit.team || other.state === 'dead') continue;
      const dx = other.position.x - unit.position.x;
      const dz = other.position.z - unit.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < closestDist) {
        closestDist = dist;
        closestUnit = other;
      }
    }

    // Also check buildings
    for (const building of this.state.buildings) {
      if (building.team === unit.team) continue;
      const dx = building.position.x - unit.position.x;
      const dz = building.position.z - unit.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < closestDist) {
        closestDist = dist;
        closestUnit = null; // Target building instead
        if (unit.targetId !== building.id) {
          unit.targetId = building.id;
          unit.state = 'attacking';
          return;
        }
      }
    }

    if (closestUnit) {
      unit.targetId = closestUnit.id;
      unit.state = 'attacking';
    }
  }

  private attackUnit(unit: GameUnit, dt: number) {
    const stats = UNIT_STATS[unit.type];
    if (stats.damage === 0) { unit.state = 'idle'; return; }

    // Find target
    let target: GameUnit | null = null;
    let targetBuilding: GameBuilding | null = null;

    if (unit.targetId) {
      target = this.state.units.find(u => u.id === unit.targetId && u.state !== 'dead') || null;
      targetBuilding = this.state.buildings.find(b => b.id === unit.targetId) || null;
    }

    const targetPos = target?.position || targetBuilding?.position;
    if (!targetPos) {
      unit.state = 'idle';
      unit.targetId = null;
      return;
    }

    const dx = targetPos.x - unit.position.x;
    const dz = targetPos.z - unit.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Rotate turret towards target
    const targetAngle = Math.atan2(dx, dz);
    let angleDiff = targetAngle - unit.turretRotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    unit.turretRotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 3 * dt);

    if (dist > stats.attackRange) {
      // Move closer
      if (unit.path.length === 0 || unit.pathIndex >= unit.path.length) {
        unit.path = this.pathfinder.findPath(unit.position, targetPos);
        unit.pathIndex = 0;
        unit.state = 'moving';
      }
      return;
    }

    // In range - fire
    if (this.state.time - unit.lastFireTime > 1 / stats.fireRate) {
      unit.lastFireTime = this.state.time;
      this.fireProjectile(unit, targetPos);
      this.playSound('shoot', unit.position);
    }

    // Slowly rotate body towards target
    const bodyAngleDiff = targetAngle - unit.rotation;
    let bDiff = bodyAngleDiff;
    while (bDiff > Math.PI) bDiff -= Math.PI * 2;
    while (bDiff < -Math.PI) bDiff += Math.PI * 2;
    unit.rotation += Math.sign(bDiff) * Math.min(Math.abs(bDiff), stats.turnSpeed * 0.3 * dt);
  }

  private fireProjectile(unit: GameUnit, targetPos: Vec3) {
    const stats = UNIT_STATS[unit.type];
    const dir = {
      x: targetPos.x - unit.position.x,
      y: (targetPos.y || 0) - unit.position.y + 1,
      z: targetPos.z - unit.position.z
    };
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    const speed = unit.type === 'artillery' ? 20 : 40;

    // Add some inaccuracy
    const spread = unit.type === 'artillery' ? 0.05 : 0.02;
    dir.x += (Math.random() - 0.5) * spread * len;
    dir.z += (Math.random() - 0.5) * spread * len;

    const proj: Projectile = {
      id: genId(),
      position: {
        x: unit.position.x + Math.sin(unit.turretRotation) * 1.5,
        y: unit.position.y + 1.2,
        z: unit.position.z + Math.cos(unit.turretRotation) * 1.5
      },
      velocity: { x: dir.x / len * speed, y: dir.y / len * speed, z: dir.z / len * speed },
      targetId: unit.targetId || '',
      damage: stats.damage,
      team: unit.team,
      speed,
      type: unit.type === 'artillery' ? 'shell' : (unit.type === 'heavy_tank' ? 'shell' : 'bullet'),
      lifetime: 3
    };
    this.state.projectiles.push(proj);

    // Muzzle flash effect
    this.createMuzzleFlash({
      x: unit.position.x + Math.sin(unit.turretRotation) * 2,
      y: unit.position.y + 1.2,
      z: unit.position.z + Math.cos(unit.turretRotation) * 2
    });
  }

  private updateCombat(dt: number) {
    // Building turrets auto-fire
    for (const building of this.state.buildings) {
      if (building.type !== 'turret') continue;
      const stats = { attackRange: 14, damage: 15, fireRate: 2 };

      let target: GameUnit | null = null;
      let closestDist = stats.attackRange;
      for (const unit of this.state.units) {
        if (unit.team === building.team || unit.state === 'dead') continue;
        const dx = unit.position.x - building.position.x;
        const dz = unit.position.z - building.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < closestDist) {
          closestDist = dist;
          target = unit;
        }
      }

      if (target && this.state.time - (building as any).lastFireTime > 1 / stats.fireRate) {
        (building as any).lastFireTime = this.state.time;
        const dir = {
          x: target.position.x - building.position.x,
          y: target.position.y - building.position.y + 1,
          z: target.position.z - building.position.z
        };
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
        this.state.projectiles.push({
          id: genId(),
          position: { x: building.position.x, y: building.position.y + 1.5, z: building.position.z },
          velocity: { x: dir.x / len * 35, y: dir.y / len * 35, z: dir.z / len * 35 },
          targetId: target.id,
          damage: stats.damage,
          team: building.team,
          speed: 35,
          type: 'bullet',
          lifetime: 2
        });
      }
    }
  }

  private updateProjectiles(dt: number) {
    const toRemove: string[] = [];

    for (const proj of this.state.projectiles) {
      proj.position.x += proj.velocity.x * dt;
      proj.position.y += proj.velocity.y * dt;
      proj.position.z += proj.velocity.z * dt;
      proj.lifetime -= dt;

      // Gravity for shells
      if (proj.type === 'shell') {
        proj.velocity.y -= 9.8 * dt;
      }

      // Check hit
      let hit = false;
      for (const unit of this.state.units) {
        if (unit.team === proj.team || unit.state === 'dead') continue;
        const dx = unit.position.x - proj.position.x;
        const dz = unit.position.z - proj.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 1.5) {
          // Apply damage with armor
          const stats = UNIT_STATS[unit.type];
          const actualDamage = Math.max(1, proj.damage - stats.armor * 0.3);
          unit.hp -= actualDamage;
          if (unit.hp <= 0) {
            unit.state = 'dead';
            this.createExplosion(unit.position, unit.type === 'heavy_tank' ? 2.5 : 1.5);
            this.playSound('explosion', unit.position);
          } else {
            this.createHitEffect(proj.position);
            this.playSound('hit', proj.position);
          }
          hit = true;
          break;
        }
      }

      if (!hit) {
        for (const building of this.state.buildings) {
          if (building.team === proj.team) continue;
          const dx = building.position.x - proj.position.x;
          const dz = building.position.z - proj.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const size = BUILDING_STATS[building.type].size;
          if (dist < size) {
            building.hp -= proj.damage * 0.5;
            if (building.hp <= 0) {
              this.createExplosion(building.position, 3);
              this.playSound('explosion', building.position);
              this.state.buildings = this.state.buildings.filter(b => b.id !== building.id);
              const mesh = this.meshes.get(building.id);
              if (mesh) { this.scene.remove(mesh); this.meshes.delete(building.id); }
              this.needsSync = true;
            } else {
              this.createHitEffect(proj.position);
            }
            hit = true;
            break;
          }
        }
      }

      // Ground hit
      if (proj.position.y < getTerrainHeight(proj.position.x, proj.position.z)) {
        this.createHitEffect(proj.position);
        hit = true;
      }

      if (hit || proj.lifetime <= 0) {
        toRemove.push(proj.id);
      }
    }

    this.state.projectiles = this.state.projectiles.filter(p => !toRemove.includes(p.id));
  }

  private updateBuildings(dt: number) {
    for (const building of this.state.buildings) {
      if (building.producing) {
        const stats = UNIT_STATS[building.producing];
        building.productionProgress += dt;
        if (building.productionProgress >= stats.buildTime) {
          // Spawn unit
          const spawnPos = building.rallyPoint || {
            x: building.position.x + (building.team === 'player' ? 4 : -4),
            y: 0,
            z: building.position.z + (building.team === 'player' ? 4 : -4)
          };
          const newUnit = this.createUnit(building.producing, building.team, spawnPos);
          this.state.units.push(newUnit);
          if (building.rallyPoint && building.team === 'player') {
            newUnit.path = this.pathfinder.findPath(newUnit.position, building.rallyPoint);
            newUnit.pathIndex = 0;
            newUnit.state = 'moving';
          }
          building.producing = null;
          building.productionProgress = 0;
          if (building.team === 'player') {
            this.playSound('complete', building.position);
          }
          this.needsSync = true;
        }
      }
    }
  }

  private aiAttackTimer = 0;
  private aiWaveSize = 3;

  private updateAI(dt: number) {
    // Enemy AI logic
    const enemyFactory = this.state.buildings.find(b => b.type === 'factory' && b.team === 'enemy');
    if (!enemyFactory) return;

    // Smarter production - adapt to player composition
    if (!enemyFactory.producing && this.state.enemyResources >= 200) {
      const playerHeavy = this.state.units.filter(u => u.team === 'player' && (u.type === 'heavy_tank' || u.type === 'medium_tank')).length;
      const playerLight = this.state.units.filter(u => u.team === 'player' && (u.type === 'scout' || u.type === 'light_tank')).length;
      
      let type: UnitType;
      if (playerHeavy > playerLight && Math.random() > 0.5) {
        type = Math.random() > 0.5 ? 'artillery' : 'heavy_tank';
      } else if (playerLight > 3) {
        type = Math.random() > 0.3 ? 'medium_tank' : 'apc';
      } else {
        const types: UnitType[] = ['light_tank', 'medium_tank', 'medium_tank', 'scout', 'heavy_tank'];
        type = types[Math.floor(Math.random() * types.length)];
      }
      
      if (this.state.enemyResources >= UNIT_STATS[type].cost) {
        enemyFactory.producing = type;
        enemyFactory.productionProgress = 0;
        this.state.enemyResources -= UNIT_STATS[type].cost;
      }
    }

    // Enemy resource generation
    this.state.enemyResources += dt * 15;

    // Tactical attack waves
    this.aiAttackTimer += dt;
    const enemyIdleUnits = this.state.units.filter(u => u.team === 'enemy' && u.state === 'idle' && u.type !== 'harvester');
    
    const shouldAttack = (enemyIdleUnits.length >= this.aiWaveSize && this.aiAttackTimer > 40) ||
                         (enemyIdleUnits.length >= 5 && this.aiAttackTimer > 25) ||
                         (enemyIdleUnits.length >= 7);

    if (shouldAttack && this.state.gameTime > 25) {
      this.aiAttackTimer = 0;
      this.aiWaveSize = Math.min(6, this.aiWaveSize + 1);

      // Choose target intelligently
      const playerBuildings = this.state.buildings.filter(b => b.team === 'player');
      const playerUnits = this.state.units.filter(u => u.team === 'player' && u.state !== 'dead');
      
      let targetPos: Vec3;
      
      if (playerBuildings.length > 0) {
        const nonHQ = playerBuildings.filter(b => b.type !== 'hq');
        if (nonHQ.length > 0 && Math.random() > 0.3) {
          const weakest = nonHQ.reduce((a, b) => a.hp / a.maxHp < b.hp / b.maxHp ? a : b);
          targetPos = weakest.position;
        } else {
          const hq = playerBuildings.find(b => b.type === 'hq');
          targetPos = hq ? hq.position : playerBuildings[0].position;
        }
      } else if (playerUnits.length > 0) {
        targetPos = playerUnits[Math.floor(Math.random() * playerUnits.length)].position;
      } else {
        return;
      }

      // Send units in formation
      const attackers = enemyIdleUnits.slice(0, Math.min(enemyIdleUnits.length, this.aiWaveSize));
      attackers.forEach((unit, i) => {
        const angle = (i / attackers.length) * Math.PI * 2;
        const radius = 3;
        const offset: Vec3 = {
          x: targetPos.x + Math.cos(angle) * radius,
          y: 0,
          z: targetPos.z + Math.sin(angle) * radius
        };
        unit.path = this.pathfinder.findPath(unit.position, offset);
        unit.pathIndex = 0;
        unit.state = 'moving';
        unit.targetPos = targetPos;
      });
    }

    // Enemy units auto-engage nearby threats
    for (const unit of this.state.units) {
      if (unit.team !== 'enemy' || unit.state !== 'idle') continue;
      if (unit.type === 'harvester') continue;
      this.findTarget(unit);
    }
  }

  private updateResources(dt: number) {
    // Harvesters collect resources
    for (const unit of this.state.units) {
      if (unit.type !== 'harvester') continue;

      // Find nearest resource
      let nearestRes: ResourceDeposit | null = null;
      let nearestDist = 30;
      for (const res of this.state.resources) {
        if (res.amount <= 0) continue;
        const dx = res.position.x - unit.position.x;
        const dz = res.position.z - unit.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestRes = res;
        }
      }

      if (nearestRes && nearestDist < 3) {
        // Harvesting
        nearestRes.amount -= RESOURCE_RATE * dt;
        if (unit.team === 'player') {
          this.state.playerResources += RESOURCE_RATE * dt;
        } else {
          this.state.enemyResources += RESOURCE_RATE * dt;
        }
      } else if (nearestRes && unit.state === 'idle') {
        unit.path = this.pathfinder.findPath(unit.position, nearestRes.position);
        unit.pathIndex = 0;
        unit.state = 'moving';
      }
    }

    // Passive income
    this.state.playerResources += dt * 5;
  }

  private checkWinCondition() {
    const playerHQ = this.state.buildings.find(b => b.type === 'hq' && b.team === 'player');
    const enemyHQ = this.state.buildings.find(b => b.type === 'hq' && b.team === 'enemy');

    if (!enemyHQ) {
      this.state.gameOver = true;
      this.state.winner = 'player';
    } else if (!playerHQ) {
      this.state.gameOver = true;
      this.state.winner = 'enemy';
    }
  }

  // Effects
  private createExplosion(pos: Vec3, scale: number = 1) {
    const count = Math.floor(15 * scale);
    for (let i = 0; i < count; i++) {
      this.state.particles.push({
        position: { ...pos },
        velocity: {
          x: (Math.random() - 0.5) * 8 * scale,
          y: Math.random() * 6 * scale + 2,
          z: (Math.random() - 0.5) * 8 * scale
        },
        life: 0.5 + Math.random() * 1,
        maxLife: 1.5,
        size: 0.3 + Math.random() * 0.5 * scale,
        color: Math.random() > 0.5 ? '#ff6600' : '#ffaa00',
        type: 'explosion'
      });
    }
    // Smoke
    for (let i = 0; i < count / 2; i++) {
      this.state.particles.push({
        position: { x: pos.x + (Math.random() - 0.5) * scale, y: pos.y + Math.random(), z: pos.z + (Math.random() - 0.5) * scale },
        velocity: { x: (Math.random() - 0.5) * 2, y: 2 + Math.random() * 3, z: (Math.random() - 0.5) * 2 },
        life: 1 + Math.random() * 2,
        maxLife: 3,
        size: 0.5 + Math.random() * scale,
        color: '#444444',
        type: 'smoke'
      });
    }
    // Sparks
    for (let i = 0; i < 8; i++) {
      this.state.particles.push({
        position: { ...pos },
        velocity: {
          x: (Math.random() - 0.5) * 15,
          y: Math.random() * 10 + 3,
          z: (Math.random() - 0.5) * 15
        },
        life: 0.3 + Math.random() * 0.5,
        maxLife: 0.8,
        size: 0.1,
        color: '#ffff00',
        type: 'spark'
      });
    }
  }

  private createMuzzleFlash(pos: Vec3) {
    for (let i = 0; i < 3; i++) {
      this.state.particles.push({
        position: { ...pos },
        velocity: { x: (Math.random() - 0.5) * 3, y: Math.random() * 2, z: (Math.random() - 0.5) * 3 },
        life: 0.1 + Math.random() * 0.1,
        maxLife: 0.2,
        size: 0.2,
        color: '#ffdd00',
        type: 'spark'
      });
    }
  }

  private createHitEffect(pos: Vec3) {
    for (let i = 0; i < 5; i++) {
      this.state.particles.push({
        position: { ...pos },
        velocity: { x: (Math.random() - 0.5) * 5, y: Math.random() * 4, z: (Math.random() - 0.5) * 5 },
        life: 0.2 + Math.random() * 0.3,
        maxLife: 0.5,
        size: 0.15,
        color: '#ffaa00',
        type: 'spark'
      });
    }
    // Dust
    this.state.particles.push({
      position: { ...pos },
      velocity: { x: 0, y: 1.5, z: 0 },
      life: 0.5,
      maxLife: 0.5,
      size: 0.8,
      color: '#887766',
      type: 'dust'
    });
  }

  private particlePool: THREE.Mesh[] = [];
  private particlePoolSize = 100;
  private particlePoolIndex = 0;

  private initParticlePool() {
    const geo = new THREE.SphereGeometry(0.2, 4, 4);
    for (let i = 0; i < this.particlePoolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particlePool.push(mesh);
    }
  }

  private updateParticles(dt: number) {
    if (this.particlePool.length === 0) this.initParticlePool();

    // Hide all pool meshes first
    for (const mesh of this.particlePool) {
      mesh.visible = false;
    }
    this.particlePoolIndex = 0;

    this.state.particles = this.state.particles.filter(p => {
      p.life -= dt;
      if (p.life <= 0) return false;

      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;

      if (p.type === 'smoke' || p.type === 'dust') {
        p.velocity.y *= 0.98;
        p.size += dt * 0.3;
      } else {
        p.velocity.y -= 9.8 * dt;
      }

      // Use pool
      if (this.particlePoolIndex < this.particlePool.length) {
        const mesh = this.particlePool[this.particlePoolIndex];
        this.particlePoolIndex++;
        const alpha = p.life / p.maxLife;
        const scale = p.size * alpha;
        mesh.scale.set(scale, scale, scale);
        mesh.position.set(p.position.x, p.position.y, p.position.z);
        (mesh.material as THREE.MeshBasicMaterial).color.set(p.color);
        (mesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.8;
        mesh.visible = true;
      }

      return true;
    });
  }

  private updateAtmosphere(dt: number) {
    if (this.ambientParticles) {
      const positions = this.ambientParticles.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        let x = positions.getX(i);
        let y = positions.getY(i);
        x += Math.sin(this.state.time * 0.1 + i) * dt * 0.5;
        y += Math.sin(this.state.time * 0.2 + i * 0.5) * dt * 0.2;
        if (x > MAP_SIZE) x = 0;
        if (x < 0) x = MAP_SIZE;
        positions.setX(i, x);
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    }
  }

  // Input handlers
  private onResize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.selectionBox = { start: { x: e.clientX, y: e.clientY }, end: { x: e.clientX, y: e.clientY } };
    }
  }

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging) {
      this.selectionBox = { start: this.dragStart, end: { x: e.clientX, y: e.clientY } };
    }

    // Camera edge scrolling
    const edgeSize = 30;
    if (e.clientX < edgeSize) this.cameraVelocity.x = -1;
    else if (e.clientX > rect.width - edgeSize) this.cameraVelocity.x = 1;
    else this.cameraVelocity.x = 0;
    if (e.clientY < edgeSize) this.cameraVelocity.z = -1;
    else if (e.clientY > rect.height - edgeSize) this.cameraVelocity.z = 1;
    else this.cameraVelocity.z = 0;
  }

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0 && this.isDragging) {
      this.isDragging = false;
      const dx = Math.abs(e.clientX - this.dragStart.x);
      const dy = Math.abs(e.clientY - this.dragStart.y);

      if (dx < 5 && dy < 5) {
        // Click selection
        this.selectAtMouse(e.clientX, e.clientY);
      } else {
        // Box selection
        this.boxSelect(this.selectionBox!);
      }
      this.selectionBox = null;
    } else if (e.button === 2) {
      // Right click - command
      this.commandAtMouse(e.clientX, e.clientY);
    }
  }

  private onWheel = (e: WheelEvent) => {
    this.cameraZoom += e.deltaY * 0.03;
    this.cameraZoom = Math.max(15, Math.min(80, this.cameraZoom));
    this.updateCameraPosition();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.toLowerCase());
    // Control groups
    if (e.key >= '1' && e.key <= '9') {
      // TODO: implement control groups
    }
    if (e.key === ' ') {
      this.state.paused = !this.state.paused;
    }
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  }

  private updateCamera(dt: number) {
    const speed = 30 * dt;
    // WASD movement
    const forward = new THREE.Vector3(-Math.cos(Math.PI / 4), 0, -Math.sin(Math.PI / 4));
    const right = new THREE.Vector3(Math.sin(Math.PI / 4), 0, -Math.cos(Math.PI / 4));

    if (this.keys.has('w') || this.keys.has('arrowup') || this.cameraVelocity.z < 0) {
      this.cameraTarget.add(forward.clone().multiplyScalar(speed));
    }
    if (this.keys.has('s') || this.keys.has('arrowdown') || this.cameraVelocity.z > 0) {
      this.cameraTarget.add(forward.clone().multiplyScalar(-speed));
    }
    if (this.keys.has('a') || this.keys.has('arrowleft') || this.cameraVelocity.x < 0) {
      this.cameraTarget.add(right.clone().multiplyScalar(-speed));
    }
    if (this.keys.has('d') || this.keys.has('arrowright') || this.cameraVelocity.x > 0) {
      this.cameraTarget.add(right.clone().multiplyScalar(speed));
    }

    // Clamp camera
    this.cameraTarget.x = Math.max(0, Math.min(MAP_SIZE, this.cameraTarget.x));
    this.cameraTarget.z = Math.max(0, Math.min(MAP_SIZE, this.cameraTarget.z));

    this.updateCameraPosition();
  }

  private getGroundPoint(clientX: number, clientY: number): Vec3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrainMesh);
    if (intersects.length > 0) {
      return { x: intersects[0].point.x, y: intersects[0].point.y, z: intersects[0].point.z };
    }
    // Fallback: intersect ground plane
    const planeIntersects = this.raycaster.intersectObject(this.groundPlane);
    if (planeIntersects.length > 0) {
      return { x: planeIntersects[0].point.x, y: 0, z: planeIntersects[0].point.z };
    }
    return null;
  }

  private selectAtMouse(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.camera);

    // Check unit meshes
    const unitMeshes: THREE.Object3D[] = [];
    for (const unit of this.state.units) {
      const mesh = this.meshes.get(unit.id);
      if (mesh && unit.team === 'player') unitMeshes.push(mesh);
    }

    const intersects = this.raycaster.intersectObjects(unitMeshes, true);
    if (intersects.length > 0) {
      // Find which unit this mesh belongs to by walking up to root group
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && obj.parent && obj.parent !== this.scene) {
        obj = obj.parent;
      }
      if (obj) {
        // Find unit by mesh reference
        for (const [id, mesh] of this.meshes) {
          if (mesh === obj) {
            const unit = this.state.units.find(u => u.id === id);
            if (unit && unit.team === 'player') {
              for (const u of this.state.units) u.selected = false;
              unit.selected = true;
              this.playSound('select', unit.position);
              return;
            }
          }
        }
      }
    }

    // Deselect all if clicked empty space
    for (const u of this.state.units) u.selected = false;
  }

  private boxSelect(box: { start: { x: number; y: number }; end: { x: number; y: number } }) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const minX = Math.min(box.start.x, box.end.x);
    const maxX = Math.max(box.start.x, box.end.x);
    const minY = Math.min(box.start.y, box.end.y);
    const maxY = Math.max(box.start.y, box.end.y);

    // Deselect all first
    for (const u of this.state.units) u.selected = false;

    for (const unit of this.state.units) {
      if (unit.team !== 'player' || unit.state === 'dead') continue;
      const mesh = this.meshes.get(unit.id);
      if (!mesh) continue;

      // Project unit position to screen
      const screenPos = mesh.position.clone().project(this.camera);
      const sx = (screenPos.x * 0.5 + 0.5) * rect.width + rect.left;
      const sy = (-screenPos.y * 0.5 + 0.5) * rect.height + rect.top;

      if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
        unit.selected = true;
      }
    }
  }

  private commandAtMouse(clientX: number, clientY: number) {
    const pos = this.getGroundPoint(clientX, clientY);
    if (!pos) return;

    const selectedUnits = this.state.units.filter(u => u.selected && u.team === 'player');
    if (selectedUnits.length === 0) return;

    // Check if clicking on enemy
    let targetEnemy: GameUnit | null = null;
    let targetBuilding: GameBuilding | null = null;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.camera);

    // Check enemy units
    const enemyMeshes: THREE.Object3D[] = [];
    for (const unit of this.state.units) {
      if (unit.team === 'enemy') {
        const mesh = this.meshes.get(unit.id);
        if (mesh) enemyMeshes.push(mesh);
      }
    }
    const enemyIntersects = this.raycaster.intersectObjects(enemyMeshes, true);
    if (enemyIntersects.length > 0) {
      let obj: THREE.Object3D | null = enemyIntersects[0].object;
      while (obj && obj.parent && obj.parent !== this.scene) obj = obj.parent;
      for (const [id, mesh] of this.meshes) {
        const unit = this.state.units.find(u => u.id === id && u.team === 'enemy');
        if (unit && mesh === obj) {
          targetEnemy = unit;
          break;
        }
      }
    }

    // Check enemy buildings
    if (!targetEnemy) {
      const buildingMeshes: THREE.Object3D[] = [];
      for (const b of this.state.buildings) {
        if (b.team === 'enemy') {
          const mesh = this.meshes.get(b.id);
          if (mesh) buildingMeshes.push(mesh);
        }
      }
      const buildingIntersects = this.raycaster.intersectObjects(buildingMeshes, true);
      if (buildingIntersects.length > 0) {
        let obj: THREE.Object3D | null = buildingIntersects[0].object;
        while (obj && obj.parent && obj.parent !== this.scene) obj = obj.parent;
        for (const [id, mesh] of this.meshes) {
          const building = this.state.buildings.find(b => b.id === id && b.team === 'enemy');
          if (building && mesh === obj) {
            targetBuilding = building;
            break;
          }
        }
      }
    }

    // Issue commands
    const count = selectedUnits.length;
    const cols = Math.ceil(Math.sqrt(count));

    selectedUnits.forEach((unit, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const offset = 2;
      const targetPos: Vec3 = {
        x: pos.x + (col - cols / 2) * offset,
        y: pos.y,
        z: pos.z + (row - cols / 2) * offset
      };

      if (targetEnemy) {
        unit.targetId = targetEnemy.id;
        unit.state = 'attacking';
        unit.path = this.pathfinder.findPath(unit.position, targetPos);
        unit.pathIndex = 0;
      } else if (targetBuilding) {
        unit.targetId = targetBuilding.id;
        unit.state = 'attacking';
        unit.path = this.pathfinder.findPath(unit.position, targetPos);
        unit.pathIndex = 0;
      } else {
        unit.targetId = null;
        unit.targetPos = null;
        unit.state = 'moving';
        unit.path = this.pathfinder.findPath(unit.position, targetPos);
        unit.pathIndex = 0;
      }
    });

    this.playSound('command', pos);
  }

  // Public API
  public produceUnit(type: UnitType) {
    const factory = this.state.buildings.find(b => b.type === 'factory' && b.team === 'player' && !b.producing);
    if (!factory) return false;
    if (this.state.playerResources < UNIT_STATS[type].cost) return false;
    this.state.playerResources -= UNIT_STATS[type].cost;
    factory.producing = type;
    factory.productionProgress = 0;
    this.playSound('command', factory.position);
    return true;
  }

  public buildBuilding(type: BuildingType) {
    if (this.state.playerResources < BUILDING_STATS[type].cost) return false;
    // Place near HQ
    const hq = this.state.buildings.find(b => b.type === 'hq' && b.team === 'player');
    if (!hq) return false;
    const offset = { x: (Math.random() - 0.5) * 10, z: (Math.random() - 0.5) * 10 };
    const pos = { x: hq.position.x + 8 + offset.x, y: 0, z: hq.position.z + 8 + offset.z };
    this.state.playerResources -= BUILDING_STATS[type].cost;
    this.state.buildings.push({
      id: genId(), type, team: 'player',
      position: pos, hp: BUILDING_STATS[type].hp, maxHp: BUILDING_STATS[type].hp,
      producing: null, productionProgress: 0, rallyPoint: null
    });
    this.syncMeshes();
    return true;
  }

  public setGameSpeed(speed: number) {
    this.state.gameSpeed = speed;
  }

  public togglePause() {
    this.state.paused = !this.state.paused;
  }

  public restart() {
    // Clean up
    for (const [, mesh] of this.meshes) this.scene.remove(mesh);
    for (const [, mesh] of this.projectileMeshes) this.scene.remove(mesh);
    for (const [, mesh] of this.particleMeshes) this.scene.remove(mesh);
    this.meshes.clear();
    this.projectileMeshes.clear();
    this.particleMeshes.clear();
    idCounter = 0;
    this.pathfinder = new Pathfinder(MAP_SIZE, 2);
    this.state = this.createInitialState();
    this.syncMeshes();
  }

  public getSelectionBox() {
    return this.selectionBox;
  }

  public getState(): GameState {
    return this.state;
  }

  // Audio
  private playSound(type: string, pos: Vec3) {
    if (!this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Distance-based volume
      const camDist = Math.sqrt(
        (pos.x - this.cameraTarget.x) ** 2 + (pos.z - this.cameraTarget.z) ** 2
      );
      const volume = Math.max(0, 0.15 - camDist * 0.002);

      switch (type) {
        case 'shoot':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(volume, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.1);
          break;
        case 'explosion':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(80, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.4);
          gain.gain.setValueAtTime(volume * 2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
          // Add noise
          const noise = ctx.createBufferSource();
          const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
          noise.buffer = buffer;
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(volume, ctx.currentTime);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          noise.connect(noiseGain);
          noiseGain.connect(ctx.destination);
          noise.start(ctx.currentTime);
          break;
        case 'hit':
          osc.type = 'square';
          osc.frequency.setValueAtTime(200, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.05);
          gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.05);
          break;
        case 'select':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.05);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.1);
          break;
        case 'command':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.setValueAtTime(800, ctx.currentTime + 0.05);
          gain.gain.setValueAtTime(0.06, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.08);
          break;
        case 'complete':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(500, ctx.currentTime);
          osc.frequency.setValueAtTime(700, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(900, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
          break;
      }
    } catch (e) { /* ignore audio errors */ }
  }

  private dustTimer = 0;

  public dispose() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    
    // Clean up all scene objects
    for (const [, mesh] of this.meshes) this.scene.remove(mesh);
    for (const [, mesh] of this.projectileMeshes) this.scene.remove(mesh);
    for (const mesh of this.particlePool) this.scene.remove(mesh);
    this.meshes.clear();
    this.projectileMeshes.clear();
    this.particlePool.length = 0;
    
    this.renderer.dispose();
    this.scene.clear();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
