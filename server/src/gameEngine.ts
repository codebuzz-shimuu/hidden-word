import { Room, RoundResult, Player } from './types';
import { getRandomWord } from './words';

// ─── Start a New Round ───────────────────────────────────────────────────────

export interface RoundSetup {
  word: string;
  category: string;
  imposterIds: string[];
}

export function startRound(room: Room): RoundSetup {
  const alivePlayers = [...room.players.values()].filter(p => p.isAlive);

  // Pick word
  const difficulty = room.settings.difficulty;
  const wordEntry = getRandomWord(difficulty);

  // Pick imposters randomly from alive players
  const shuffled = shuffle(alivePlayers);
  const count = Math.min(room.settings.imposterCount, alivePlayers.length - 1);
  const imposters = shuffled.slice(0, count);

  room.currentRound += 1;
  room.currentWord = wordEntry.word;
  room.currentCategory = wordEntry.category;
  room.currentImposterIds = imposters.map(p => p.playerId);
  room.currentVotes = new Map();
  room.confirmedRoles = new Set();
  room.gameState = 'ROLE_REVEAL';

  return {
    word: wordEntry.word,
    category: wordEntry.category,
    imposterIds: room.currentImposterIds,
  };
}

// ─── Role Payloads (per-player, no leaks) ────────────────────────────────────

export interface RolePayload {
  role: 'imposter' | 'normal';
  word?: string;
  category: string;
  roundNumber: number;
}

export function getRolePayload(room: Room, playerId: string): RolePayload {
  const isImposter = room.currentImposterIds.includes(playerId);
  return {
    role: isImposter ? 'imposter' : 'normal',
    word: isImposter ? undefined : room.currentWord,
    category: room.currentCategory,
    roundNumber: room.currentRound,
  };
}

// ─── Vote Processing ─────────────────────────────────────────────────────────

export interface VoteOutcome {
  voteMap: Record<string, number>;      // targetId → vote count
  eliminatedPlayerId: string | null;
  eliminatedWasImposter: boolean | null;
  wasTie: boolean;
}

export function processVotes(room: Room): VoteOutcome {
  const alivePlayers = [...room.players.values()].filter(p => p.isAlive);

  // Tally votes
  const tally = new Map<string, number>();
  for (const targetId of room.currentVotes.values()) {
    tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
  }

  // Find max votes
  let maxVotes = 0;
  for (const count of tally.values()) {
    if (count > maxVotes) maxVotes = count;
  }

  // Find all players with max votes
  const topPlayers = [...tally.entries()]
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id);

  const voteMap: Record<string, number> = {};
  for (const p of alivePlayers) {
    voteMap[p.playerId] = tally.get(p.playerId) ?? 0;
  }

  // Tie = nobody eliminated
  if (topPlayers.length !== 1 || maxVotes === 0) {
    return { voteMap, eliminatedPlayerId: null, eliminatedWasImposter: null, wasTie: true };
  }

  const eliminatedId = topPlayers[0];
  const eliminatedPlayer = room.players.get(eliminatedId);
  const wasImposter = room.currentImposterIds.includes(eliminatedId);

  if (eliminatedPlayer) {
    eliminatedPlayer.isAlive = false;
  }

  // Save round result
  const roundResult: RoundResult = {
    roundNumber: room.currentRound,
    secretWord: room.currentWord,
    category: room.currentCategory,
    imposterIds: [...room.currentImposterIds],
    votes: [...room.currentVotes.entries()].map(([voterId, targetId]) => ({ voterId, targetId })),
    eliminatedPlayerId: eliminatedId,
    eliminatedWasImposter: wasImposter,
    wasTie: false,
  };
  room.rounds.push(roundResult);

  return {
    voteMap,
    eliminatedPlayerId: eliminatedId,
    eliminatedWasImposter: wasImposter,
    wasTie: false,
  };
}

// ─── Score Update ─────────────────────────────────────────────────────────────
// Called right after processVotes. At this point the eliminated player is
// already marked isAlive = false, so "alive" accurately reflects survivors.
//
//  • Normal player eliminated  → imposters won this round → alive imposters +2
//  • Imposter eliminated       → normals won this round  → alive normals   +1
//  • Tie                       → nobody scores

export function updateScores(room: Room, outcome: VoteOutcome): void {
  if (outcome.wasTie) return;

  const alivePlayers = [...room.players.values()].filter(p => p.isAlive);

  if (!outcome.eliminatedWasImposter) {
    // Imposters won: alive imposters each earn 2 points
    const aliveImposters = alivePlayers.filter(p =>
      room.currentImposterIds.includes(p.playerId)
    );
    for (const p of aliveImposters) {
      p.score += 2;
    }
  } else {
    // Normals won: alive non-imposter players each earn 1 point
    const aliveNormals = alivePlayers.filter(p =>
      !room.currentImposterIds.includes(p.playerId)
    );
    for (const p of aliveNormals) {
      p.score += 1;
    }
  }
}


export type WinResult =
  | { winner: 'imposters'; reason: string }
  | { winner: 'normal'; reason: string }
  | null;

export function checkWinCondition(room: Room): WinResult {
  const alivePlayers = [...room.players.values()].filter(p => p.isAlive);
  const aliveImposters = alivePlayers.filter(p => room.currentImposterIds.includes(p.playerId));
  const aliveNormals = alivePlayers.filter(p => !room.currentImposterIds.includes(p.playerId));

  if (aliveImposters.length === 0) {
    return { winner: 'normal', reason: 'All imposters have been eliminated!' };
  }

  if (aliveImposters.length >= aliveNormals.length) {
    return { winner: 'imposters', reason: 'Imposters have achieved equal or majority!' };
  }

  return null;
}

// ─── Game Over Payload ────────────────────────────────────────────────────────

export interface GameOverPayload {
  winner: 'imposters' | 'normal';
  reason: string;
  imposterNames: string[];
  secretWord: string;
  category: string;
  rounds: Array<{
    roundNumber: number;
    secretWord: string;
    category: string;
    imposterNames: string[];
    eliminatedName: string | null;
    eliminatedWasImposter: boolean | null;
    wasTie: boolean;
  }>;
}

export function buildGameOverPayload(room: Room, winResult: WinResult & { winner: string; reason: string }): GameOverPayload {
  const getName = (id: string) => room.players.get(id)?.displayName ?? 'Unknown';

  return {
    winner: winResult.winner as 'imposters' | 'normal',
    reason: winResult.reason,
    imposterNames: room.currentImposterIds.map(getName),
    secretWord: room.currentWord,
    category: room.currentCategory,
    rounds: room.rounds.map(r => ({
      roundNumber: r.roundNumber,
      secretWord: r.secretWord,
      category: r.category,
      imposterNames: r.imposterIds.map(getName),
      eliminatedName: r.eliminatedPlayerId ? getName(r.eliminatedPlayerId) : null,
      eliminatedWasImposter: r.eliminatedWasImposter,
      wasTie: r.wasTie,
    })),
  };
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
