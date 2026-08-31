import { create } from 'zustand';
import {
  GameState,
  PublicRoom,
  PublicPlayer,
  RolePayload,
  VoteResultsPayload,
  GameOverPayload,
  VotingPlayer,
} from '@/types/game';

// ─── Session (persisted in localStorage) ─────────────────────────────────────
export interface PlayerSession {
  playerId: string;
  token: string;
  roomCode: string;
  isHost: boolean;
}

function loadSession(): PlayerSession | null {
  try {
    const raw = localStorage.getItem('hw_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session: PlayerSession) {
  localStorage.setItem('hw_session', JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem('hw_session');
}

// ─── Store Definition ─────────────────────────────────────────────────────────

export interface GameStore {
  // Session
  session: PlayerSession | null;
  setSession: (s: PlayerSession) => void;
  clearSession: () => void;

  // Room state (public, no secrets)
  room: PublicRoom | null;
  setRoom: (room: PublicRoom) => void;

  // My role (private, only my own)
  myRole: RolePayload | null;
  setMyRole: (role: RolePayload | null) => void;

  // UI state
  gameState: GameState;
  setGameState: (s: GameState) => void;

  // Vote result
  voteResults: VoteResultsPayload | null;
  setVoteResults: (v: VoteResultsPayload | null) => void;

  // Game over
  gameOver: GameOverPayload | null;
  setGameOver: (g: GameOverPayload | null) => void;

  // Voting players list
  votingPlayers: VotingPlayer[];
  setVotingPlayers: (p: VotingPlayer[]) => void;
  myVote: string | null;
  setMyVote: (id: string | null) => void;

  // Role confirm progress
  roleConfirmProgress: { confirmed: number; total: number };
  setRoleConfirmProgress: (p: { confirmed: number; total: number }) => void;

  // Vote cast progress
  voteCastProgress: { votedCount: number; totalCount: number };
  setVoteCastProgress: (p: { votedCount: number; totalCount: number }) => void;

  // Timers
  clueTimerSeconds: number;
  votingTimerSeconds: number;
  setClueTimer: (s: number) => void;
  setVotingTimer: (s: number) => void;

  // Host changed notification
  newHostName: string | null;
  setNewHostName: (name: string | null) => void;

  // Reset everything
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  session: loadSession(),
  setSession: (session) => {
    saveSession(session);
    set({ session });
  },
  clearSession: () => {
    clearSession();
    set({ session: null });
  },

  room: null,
  setRoom: (room) => set({ room, gameState: room.gameState }),

  myRole: null,
  setMyRole: (myRole) => set({ myRole }),

  gameState: 'LOBBY',
  setGameState: (gameState) => set({ gameState }),

  voteResults: null,
  setVoteResults: (voteResults) => set({ voteResults }),

  gameOver: null,
  setGameOver: (gameOver) => set({ gameOver }),

  votingPlayers: [],
  setVotingPlayers: (votingPlayers) => set({ votingPlayers }),
  myVote: null,
  setMyVote: (myVote) => set({ myVote }),

  roleConfirmProgress: { confirmed: 0, total: 0 },
  setRoleConfirmProgress: (roleConfirmProgress) => set({ roleConfirmProgress }),

  voteCastProgress: { votedCount: 0, totalCount: 0 },
  setVoteCastProgress: (voteCastProgress) => set({ voteCastProgress }),

  clueTimerSeconds: 90,
  votingTimerSeconds: 60,
  setClueTimer: (clueTimerSeconds) => set({ clueTimerSeconds }),
  setVotingTimer: (votingTimerSeconds) => set({ votingTimerSeconds }),

  newHostName: null,
  setNewHostName: (newHostName) => set({ newHostName }),

  reset: () =>
    set({
      room: null,
      myRole: null,
      gameState: 'LOBBY',
      voteResults: null,
      gameOver: null,
      votingPlayers: [],
      myVote: null,
      roleConfirmProgress: { confirmed: 0, total: 0 },
      voteCastProgress: { votedCount: 0, totalCount: 0 },
      newHostName: null,
    }),
}));
