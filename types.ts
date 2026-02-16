export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export enum GameEvent {
  GAME_START = 'GAME_START',
  BUMPER_HIT = 'BUMPER_HIT',
  LEFT_RAMP_SHOT = 'LEFT_RAMP_SHOT',
  RIGHT_RAMP_SHOT = 'RIGHT_RAMP_SHOT',
  DRAIN = 'DRAIN',
  BALL_LOST = 'BALL_LOST',
  HIGH_SCORE = 'HIGH_SCORE',
  WORMHOLE_ENTERED = 'WORMHOLE_ENTERED',
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  targetScore: number;
  imageUrl?: string;
}

export interface GameStats {
  leftRampHits: number;
  rightRampHits: number;
  bumperHits: number;
  wormholeEnters: number;
  drains: number;
}

export interface LevelConfig {
  planetName: string;
  visualTheme: {
    backgroundPrompt: string;
    primaryColor: string;
    secondaryColor: string;
    hazardColor: string;
  };
  physics: {
    gravity: number;
    friction: number;
    bumperBounce: number;
    flipperStrength: number;
  };
  boss: BossConfig;
  musicMood: string;
}

export interface BossConfig {
  name: string;
  description: string;
  weakness: 'LEFT' | 'RIGHT' | 'CENTER' | 'RAMPS' | 'BUMPERS';
  shieldStrength: number;
}

export enum WarpState {
  IDLE = 'IDLE',
  CHARGING = 'CHARGING',
  READY = 'READY',
  WARPING = 'WARPING',
}

export interface Artifact {
  id: string;
  name: string;
  description: string;
  effectType: 'GRAVITY' | 'BOUNCE' | 'FLIPPER' | 'SCORE_MULTIPLIER' | 'MULTIBALL';
  value: number; // e.g. 0.5 for gravity, 2.0 for multiplier
}

export interface GalaxyState {
  currentLevel: number;
  currentPlanet: LevelConfig;
  warpState: WarpState;
  fuel: number;
  artifacts: Artifact[];
}

export interface GameState {
  score: number;
  balls: number;
  status: GameStatus;
  currentMission: Mission | null;
  rank: string;
  stats: GameStats;
  galaxy: GalaxyState;
}

// Vector and Ball interfaces removed as they are handled internally by Rapier/Three.js

// Flipper and Bumper interfaces removed as they are unused by the React components