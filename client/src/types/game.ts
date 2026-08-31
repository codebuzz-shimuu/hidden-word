// ─── Shared client-side types (mirror of server types without secrets) ────────

export type GameState =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'CLUE_PHASE'
  | 'VOTING'
  | 'RESULT'
  | 'GAME_OVER';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'random';

export interface GameSettings {
  maxPlayers: number;
  imposterCount: number;
  clueTimerSeconds: number;
  votingTimerSeconds: number;
  difficulty: Difficulty;
}

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

export interface RolePayload {
  role: 'imposter' | 'normal';
  word?: string;      // only for normal players
  category: string;
  roundNumber: number;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  score: number;
  isAlive: boolean;
}

export interface VoteResultsPayload {
  voteMap: Record<string, number>;  // playerId → vote count
  eliminatedPlayerId: string | null;
  eliminatedWasImposter: boolean | null;
  wasTie: boolean;
  players: { playerId: string; displayName: string; isAlive: boolean }[];
  leaderboard: LeaderboardEntry[];
}

export interface GameOverPayload {
  winner: 'imposters' | 'normal';
  reason: string;
  imposterNames: string[];
  secretWord: string;
  category: string;
  rounds: RoundHistoryEntry[];
}

export interface RoundHistoryEntry {
  roundNumber: number;
  secretWord: string;
  category: string;
  imposterNames: string[];
  eliminatedName: string | null;
  eliminatedWasImposter: boolean | null;
  wasTie: boolean;
}

export interface VotingPlayer {
  playerId: string;
  displayName: string;
}
