// ─── Server-side Types ───────────────────────────────────────────────────────

export type GameState =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'CLUE_PHASE'
  | 'VOTING'
  | 'RESULT'
  | 'GAME_OVER';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface WordEntry {
  word: string;
  category: string;
  difficulty: Difficulty;
}

export interface GameSettings {
  maxPlayers: number;       // 3–15
  imposterCount: number;    // 1–3
  clueTimerSeconds: number; // 30, 60, 90, 120, 0 = unlimited
  votingTimerSeconds: number;
  difficulty: Difficulty | 'random';
}

export interface Player {
  playerId: string;
  socketId: string;
  displayName: string;
  isHost: boolean;
  isAlive: boolean;
  isReady: boolean;
  isConnected: boolean;
  token: string;          // reconnect token
  joinOrder: number;
  score: number;          // cumulative game score
}

export interface RoundVote {
  voterId: string;
  targetId: string;
}

export interface RoundResult {
  roundNumber: number;
  secretWord: string;
  category: string;
  imposterIds: string[];
  votes: RoundVote[];
  eliminatedPlayerId: string | null;
  eliminatedWasImposter: boolean | null;
  wasTie: boolean;
}

export interface Room {
  roomId: string;
  hostId: string;
  settings: GameSettings;
  gameState: GameState;
  currentRound: number;
  players: Map<string, Player>;
  rounds: RoundResult[];
  // current round working state
  currentImposterIds: string[];
  currentWord: string;
  currentCategory: string;
  currentVotes: Map<string, string>; // voterId → targetId
  confirmedRoles: Set<string>;       // playerIds who clicked "I'm Ready"
  clueTimerHandle: ReturnType<typeof setTimeout> | null;
  votingTimerHandle: ReturnType<typeof setTimeout> | null;
  createdAt: number;
  lastActivity: number;
}

// ─── Payloads sent to clients ────────────────────────────────────────────────

export interface PublicPlayer {
  playerId: string;
  displayName: string;
  isHost: boolean;
  isAlive: boolean;
  isReady: boolean;
  isConnected: boolean;
  score: number;
}

export interface PublicRoom {
  roomId: string;
  hostId: string;
  settings: GameSettings;
  gameState: GameState;
  currentRound: number;
  players: PublicPlayer[];
}
