export type PlayerId = 'P1' | 'P2';

export type Coord = {
  x: number;
  y: number;
};

export type UnitId = string;

export type GamePhase = 'command' | 'production' | 'end';

export type ActionLogEntry = {
  turn: number;
  playerId: PlayerId;
  action: string;
  detail?: string;
};
