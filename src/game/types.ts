// OPERATION IRON FRONT - Type Definitions & Constants

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type UnitType = 'scout' | 'light_tank' | 'medium_tank' | 'heavy_tank' | 'artillery' | 'apc' | 'harvester';
export type BuildingType = 'hq' | 'factory' | 'powerplant' | 'refinery' | 'turret' | 'radar' | 'repair';
export type Team = 'player' | 'enemy';
export type UnitState = 'idle' | 'moving' | 'attacking' | 'patrolling' | 'returning' | 'dead' | 'producing';

export interface UnitStats {
  maxHp: number;
  speed: number;
  turnSpeed: number;
  armor: number;
  sightRange: number;
  attackRange: number;
  damage: number;
  fireRate: number; // shots per second
  cost: number;
  buildTime: number; // seconds
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  scout: { maxHp: 80, speed: 8, turnSpeed: 4, armor: 2, sightRange: 18, attackRange: 10, damage: 8, fireRate: 3, cost: 100, buildTime: 5 },
  light_tank: { maxHp: 150, speed: 5, turnSpeed: 2.5, armor: 8, sightRange: 14, attackRange: 12, damage: 18, fireRate: 1.5, cost: 200, buildTime: 8 },
  medium_tank: { maxHp: 300, speed: 3.5, turnSpeed: 1.8, armor: 18, sightRange: 13, attackRange: 14, damage: 35, fireRate: 0.8, cost: 400, buildTime: 12 },
  heavy_tank: { maxHp: 500, speed: 2.5, turnSpeed: 1.2, armor: 30, sightRange: 12, attackRange: 15, damage: 55, fireRate: 0.5, cost: 700, buildTime: 18 },
  artillery: { maxHp: 120, speed: 2, turnSpeed: 1, armor: 5, sightRange: 10, attackRange: 25, damage: 60, fireRate: 0.3, cost: 350, buildTime: 14 },
  apc: { maxHp: 200, speed: 4.5, turnSpeed: 2, armor: 10, sightRange: 12, attackRange: 8, damage: 10, fireRate: 4, cost: 250, buildTime: 10 },
  harvester: { maxHp: 100, speed: 3, turnSpeed: 2, armor: 3, sightRange: 8, attackRange: 0, damage: 0, fireRate: 0, cost: 300, buildTime: 10 },
};

export const BUILDING_STATS: Record<BuildingType, { hp: number; cost: number; buildTime: number; size: number }> = {
  hq: { hp: 1000, cost: 0, buildTime: 0, size: 4 },
  factory: { hp: 600, cost: 500, buildTime: 20, size: 3 },
  powerplant: { hp: 400, cost: 300, buildTime: 15, size: 2 },
  refinery: { hp: 500, cost: 400, buildTime: 18, size: 3 },
  turret: { hp: 300, cost: 200, buildTime: 8, size: 1 },
  radar: { hp: 200, cost: 250, buildTime: 10, size: 2 },
  repair: { hp: 350, cost: 350, buildTime: 12, size: 2 },
};

export interface GameUnit {
  id: string;
  type: UnitType;
  team: Team;
  position: Vec3;
  rotation: number; // Y-axis rotation in radians
  turretRotation: number;
  hp: number;
  maxHp: number;
  state: UnitState;
  targetId: string | null;
  targetPos: Vec3 | null;
  lastFireTime: number;
  selected: boolean;
  speed: number;
  path: Vec3[];
  pathIndex: number;
}

export interface GameBuilding {
  id: string;
  type: BuildingType;
  team: Team;
  position: Vec3;
  hp: number;
  maxHp: number;
  producing: UnitType | null;
  productionProgress: number;
  rallyPoint: Vec3 | null;
}

export interface Projectile {
  id: string;
  position: Vec3;
  velocity: Vec3;
  targetId: string;
  damage: number;
  team: Team;
  speed: number;
  type: 'bullet' | 'shell' | 'rocket';
  lifetime: number;
}

export interface Particle {
  position: Vec3;
  velocity: Vec3;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'explosion' | 'smoke' | 'spark' | 'dust' | 'fire';
}

export interface ResourceDeposit {
  id: string;
  position: Vec3;
  amount: number;
  maxAmount: number;
}

export interface GameState {
  units: GameUnit[];
  buildings: GameBuilding[];
  projectiles: Projectile[];
  particles: Particle[];
  resources: ResourceDeposit[];
  playerResources: number;
  enemyResources: number;
  time: number;
  gameTime: number;
  paused: boolean;
  gameSpeed: number;
  gameOver: boolean;
  winner: Team | null;
  mission: string;
  missionObjective: string;
}

export interface CameraState {
  position: Vec3;
  target: Vec3;
  zoom: number;
  angle: number;
}

export const MAP_SIZE = 120;
export const TILE_SIZE = 1;
export const RESOURCE_RATE = 10; // per second per harvester
export const STARTING_RESOURCES = 1000;
export const POWER_PER_PLANT = 100;
