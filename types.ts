export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export enum GameEvent {
  GAME_START = 'GAME_START',
  BUMPER_HIT = 'BUMPER_HIT',
  RAMP_SHOT = 'RAMP_SHOT',
  DRAIN = 'DRAIN',
  HIGH_SCORE = 'HIGH_SCORE',
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  targetScore: number;
  imageUrl?: string;
}

export interface GameState {
  score: number;
  balls: number;
  status: GameStatus;
  currentMission: Mission | null;
  rank: string;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Ball {
  pos: Vector;
  vel: Vector;
  radius: number;
  active: boolean;
}

export interface Flipper {
  type: 'left' | 'right';
  angle: number;
  restingAngle: number;
  activeAngle: number;
  angularVelocity: number;
}

export interface Bumper {
  pos: Vector;
  radius: number;
  score: number;
  color: string;
}