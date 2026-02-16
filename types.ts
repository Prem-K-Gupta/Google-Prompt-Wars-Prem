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

export interface GameState {
  score: number;
  balls: number;
  status: GameStatus;
  currentMission: Mission | null;
  rank: string;
  stats: GameStats;
}

// Vector and Ball interfaces removed as they are handled internally by Rapier/Three.js

// Flipper and Bumper interfaces removed as they are unused by the React components