import { Server, Socket } from 'socket.io';
import {
  createRoom,
  getRoom,
  addPlayer,
  findPlayerByToken,
  findPlayerBySocketId,
  removePlayer,
  isNameTaken,
  migrateHost,
  toPublicRoom,
  touchRoom,
  clearRoomTimers,
} from './roomManager';
import {
  startRound,
  getRolePayload,
  processVotes,
  updateScores,
  checkWinCondition,
  buildGameOverPayload,
} from './gameEngine';
import { GameSettings, Room, Player } from './types';

const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: 8,
  imposterCount: 2,
  clueTimerSeconds: 90,
  votingTimerSeconds: 60,
  difficulty: 'random',
};

function getDefaultImposterCount(players: number): number {
  if (players <= 6) return 1;
  if (players <= 11) return 2;
  return 3;
}

function broadcastRoom(io: Server, room: Room) {
  io.to(room.roomId).emit('room_updated', toPublicRoom(room));
}

export function registerHandlers(io: Server, socket: Socket) {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ── Create Room ─────────────────────────────────────────────────────────
  socket.on('create_room', (settings: Partial<GameSettings>, callback) => {
    try {
      const finalSettings: GameSettings = {
        maxPlayers: settings.maxPlayers ?? DEFAULT_SETTINGS.maxPlayers,
        imposterCount: settings.imposterCount ?? DEFAULT_SETTINGS.imposterCount,
        clueTimerSeconds: settings.clueTimerSeconds ?? DEFAULT_SETTINGS.clueTimerSeconds,
        votingTimerSeconds: settings.votingTimerSeconds ?? DEFAULT_SETTINGS.votingTimerSeconds,
        difficulty: settings.difficulty ?? DEFAULT_SETTINGS.difficulty,
      };

      // Validation
      if (finalSettings.maxPlayers < 3 || finalSettings.maxPlayers > 15) {
        return callback({ error: 'Max players must be between 3 and 15.' });
      }
      if (finalSettings.imposterCount < 1 || finalSettings.imposterCount > 3) {
        return callback({ error: 'Imposter count must be between 1 and 3.' });
      }
      if (finalSettings.imposterCount >= finalSettings.maxPlayers) {
        return callback({ error: 'Too many imposters for that player count.' });
      }

      const room = createRoom(finalSettings);
      callback({ roomId: room.roomId });
      console.log(`[Room] Created: ${room.roomId}`);
    } catch (e) {
      callback({ error: 'Failed to create room.' });
    }
  });

  // ── Join Room ───────────────────────────────────────────────────────────
  socket.on('join_room', ({ roomCode, playerName, token }: {
    roomCode: string;
    playerName: string;
    token?: string;
  }, callback) => {
    try {
      const room = getRoom(roomCode);
      if (!room) return callback({ error: 'Room not found. Check your room code.' });

      const name = playerName?.trim().slice(0, 16);
      if (!name) return callback({ error: 'Please enter a valid name.' });

      // Reconnection path
      if (token) {
        const existing = findPlayerByToken(room, token);
        if (existing) {
          existing.socketId = socket.id;
          existing.isConnected = true;
          socket.join(room.roomId);
          touchRoom(room.roomId);

          // If game is already running, send them their role again
          if (room.gameState !== 'LOBBY') {
            socket.emit('role_assigned', getRolePayload(room, existing.playerId));
          }

          broadcastRoom(io, room);
          callback({
            playerId: existing.playerId,
            token: existing.token,
            isHost: existing.isHost,
            reconnected: true,
            gameState: room.gameState,
          });
          console.log(`[Room] Reconnected: ${existing.displayName} → ${room.roomId}`);
          return;
        }
      }

      // Validate new join
      if (room.gameState !== 'LOBBY') {
        return callback({ error: 'Game already in progress. You can only rejoin with your original link.' });
      }
      if (room.players.size >= room.settings.maxPlayers) {
        return callback({ error: 'Room is full.' });
      }
      if (isNameTaken(room, name)) {
        return callback({ error: 'That name is already taken in this room.' });
      }

      const player = addPlayer(room, socket.id, name);
      socket.join(room.roomId);
      broadcastRoom(io, room);

      callback({
        playerId: player.playerId,
        token: player.token,
        isHost: player.isHost,
        reconnected: false,
        gameState: room.gameState,
      });
      console.log(`[Room] Joined: ${name} → ${room.roomId}`);
    } catch (e) {
      callback({ error: 'Failed to join room.' });
    }
  });

  // ── Set Ready ────────────────────────────────────────────────────────────
  socket.on('set_ready', ({ roomCode, playerId, ready }: {
    roomCode: string;
    playerId: string;
    ready: boolean;
  }) => {
    const room = getRoom(roomCode);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;
    player.isReady = ready;
    broadcastRoom(io, room);
  });

  // ── Start Game ───────────────────────────────────────────────────────────
  socket.on('start_game', ({ roomCode, playerId }: { roomCode: string; playerId: string }, callback) => {
    const room = getRoom(roomCode);
    if (!room) return callback?.({ error: 'Room not found.' });

    const player = room.players.get(playerId);
    if (!player?.isHost) return callback?.({ error: 'Only the host can start the game.' });

    const alivePlayers = [...room.players.values()].filter(p => p.isAlive);
    if (alivePlayers.length < 3) return callback?.({ error: 'Need at least 3 players to start.' });

    if (room.settings.imposterCount >= alivePlayers.length) {
      return callback?.({ error: 'Too many imposters for the current player count.' });
    }

    const setup = startRound(room);

    io.to(room.roomId).emit('game_started', {
      round: room.currentRound,
      totalPlayers: alivePlayers.length,
    });

    // Send individual role payloads (anti-cheat: each player gets only their own info)
    for (const p of room.players.values()) {
      if (!p.isAlive) continue;
      const pSocket = getSocketForPlayer(io, p.socketId);
      if (pSocket) {
        pSocket.emit('role_assigned', getRolePayload(room, p.playerId));
      }
    }

    broadcastRoom(io, room);
    callback?.({ success: true });
    console.log(`[Game] Started in room ${room.roomId} — Word: ${setup.word}, Imposters: ${setup.imposterIds.length}`);
  });

  // ── Confirm Role (player pressed "I'm Ready") ────────────────────────────
  socket.on('confirm_role', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
    const room = getRoom(roomCode);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player || !player.isAlive) return;

    room.confirmedRoles.add(playerId);

    const alivePlayers = [...room.players.values()].filter(p => p.isAlive);
    const allConfirmed = alivePlayers.every(p => room.confirmedRoles.has(p.playerId));

    // Broadcast progress so UI can show "X/Y ready"
    io.to(room.roomId).emit('role_confirm_progress', {
      confirmed: room.confirmedRoles.size,
      total: alivePlayers.length,
    });

    if (allConfirmed) {
      // Move to clue phase
      room.gameState = 'CLUE_PHASE';
      broadcastRoom(io, room);

      io.to(room.roomId).emit('clue_phase_started', {
        timerSeconds: room.settings.clueTimerSeconds,
      });

      // Start clue timer
      if (room.settings.clueTimerSeconds > 0) {
        room.clueTimerHandle = setTimeout(() => {
          startVoting(io, room);
        }, room.settings.clueTimerSeconds * 1000);
      }
    }
  });

  // ── Skip Timer (host only) ────────────────────────────────────────────────
  socket.on('skip_timer', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
    const room = getRoom(roomCode);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player?.isHost) return;

    if (room.gameState === 'CLUE_PHASE') {
      clearRoomTimers(room);
      startVoting(io, room);
    } else if (room.gameState === 'VOTING') {
      clearRoomTimers(room);
      finalizeVotes(io, room);
    }
  });

  // ── Submit Vote ───────────────────────────────────────────────────────────
  socket.on('submit_vote', ({ roomCode, voterId, targetId }: {
    roomCode: string;
    voterId: string;
    targetId: string;
  }, callback) => {
    const room = getRoom(roomCode);
    if (!room) return callback?.({ error: 'Room not found.' });
    if (room.gameState !== 'VOTING') return callback?.({ error: 'Not in voting phase.' });

    const voter = room.players.get(voterId);
    if (!voter?.isAlive) return callback?.({ error: 'You cannot vote.' });

    const target = room.players.get(targetId);
    if (!target?.isAlive) return callback?.({ error: 'Invalid vote target.' });

    if (voterId === targetId) return callback?.({ error: 'You cannot vote for yourself.' });

    room.currentVotes.set(voterId, targetId);

    const alivePlayers = [...room.players.values()].filter(p => p.isAlive);
    const votedCount = room.currentVotes.size;
    const totalCount = alivePlayers.length;

    // Broadcast anonymous vote progress
    io.to(room.roomId).emit('vote_cast', { votedCount, totalCount });

    callback?.({ success: true });

    // If everyone voted, finalize
    if (votedCount >= totalCount) {
      clearRoomTimers(room);
      finalizeVotes(io, room);
    }
  });

  // ── Change Name ───────────────────────────────────────────────────────────
  socket.on('change_name', ({ roomCode, playerId, newName }: {
    roomCode: string;
    playerId: string;
    newName: string;
  }, callback) => {
    const room = getRoom(roomCode);
    if (!room) return callback?.({ error: 'Room not found.' });

    const name = newName?.trim().slice(0, 16);
    if (!name) return callback?.({ error: 'Invalid name.' });

    if (isNameTaken(room, name, playerId)) {
      return callback?.({ error: 'Name already taken.' });
    }

    const player = room.players.get(playerId);
    if (!player) return callback?.({ error: 'Player not found.' });

    player.displayName = name;
    broadcastRoom(io, room);
    callback?.({ success: true });
  });

  // ── Kick Player (host only) ───────────────────────────────────────────────
  socket.on('kick_player', ({ roomCode, hostId, targetId }: {
    roomCode: string;
    hostId: string;
    targetId: string;
  }, callback) => {
    const room = getRoom(roomCode);
    if (!room) return callback?.({ error: 'Room not found.' });

    const host = room.players.get(hostId);
    if (!host?.isHost) return callback?.({ error: 'Only the host can kick players.' });

    const target = room.players.get(targetId);
    if (!target) return callback?.({ error: 'Player not found.' });

    const targetSocket = getSocketForPlayer(io, target.socketId);
    if (targetSocket) {
      targetSocket.emit('kicked', { reason: 'You were removed by the host.' });
      targetSocket.leave(room.roomId);
    }

    removePlayer(room, targetId);
    broadcastRoom(io, room);
    callback?.({ success: true });
  });

  // ── End Game (host only) ─────────────────────────────────────────────────
  socket.on('end_game', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
    const room = getRoom(roomCode);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player?.isHost) return;

    clearRoomTimers(room);
    room.gameState = 'LOBBY';
    room.currentRound = 0;
    room.rounds = [];

    // Reset all players
    for (const p of room.players.values()) {
      p.isAlive = true;
      p.isReady = false;
    }

    io.to(room.roomId).emit('game_ended_by_host');
    broadcastRoom(io, room);
  });

  // ── Next Round (host triggers after seeing result) ────────────────────────
  socket.on('next_round', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
    const room = getRoom(roomCode);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player?.isHost) return;

    const alivePlayers = [...room.players.values()].filter(p => p.isAlive);
    if (alivePlayers.length < 3) {
      io.to(room.roomId).emit('error_event', { message: 'Not enough alive players to continue.' });
      return;
    }

    const setup = startRound(room);

    io.to(room.roomId).emit('round_started', {
      round: room.currentRound,
    });

    // Send individual role payloads
    for (const p of room.players.values()) {
      if (!p.isAlive) continue;
      const pSocket = getSocketForPlayer(io, p.socketId);
      if (pSocket) {
        pSocket.emit('role_assigned', getRolePayload(room, p.playerId));
      }
    }

    broadcastRoom(io, room);
    console.log(`[Game] Round ${room.currentRound} started in ${room.roomId} — ${setup.word}`);
  });

  // ── Play Again ────────────────────────────────────────────────────────────
  socket.on('play_again', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
    const room = getRoom(roomCode);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player?.isHost) return;

    clearRoomTimers(room);
    room.gameState = 'LOBBY';
    room.currentRound = 0;
    room.rounds = [];
    room.currentImposterIds = [];
    room.currentWord = '';
    room.currentCategory = '';
    room.currentVotes = new Map();
    room.confirmedRoles = new Set();

    for (const p of room.players.values()) {
      p.isAlive = true;
      p.isReady = false;
      p.score = 0;
    }

    io.to(room.roomId).emit('play_again_started');
    broadcastRoom(io, room);
  });

  // ── Disconnect Handler ────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);

    // Find which room this socket belonged to
    for (const room of [...getRoomsForSocket(io, socket.id)]) {
      const player = findPlayerBySocketId(room, socket.id);
      if (!player) continue;

      player.isConnected = false;

      // If host disconnected, migrate
      if (player.isHost) {
        const newHost = migrateHost(room, player.playerId);
        if (newHost) {
          io.to(room.roomId).emit('host_changed', { newHostName: newHost.displayName });
        }
      }

      // If in lobby and nobody left, clean up
      const connected = [...room.players.values()].filter(p => p.isConnected);
      if (connected.length === 0 && room.gameState === 'LOBBY') {
        // Will be cleaned up by the expiry timer
      }

      broadcastRoom(io, room);
    }
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startVoting(io: Server, room: Room) {
  room.gameState = 'VOTING';
  room.currentVotes = new Map();

  const alivePlayers = [...room.players.values()]
    .filter(p => p.isAlive)
    .map(p => ({ playerId: p.playerId, displayName: p.displayName }));

  io.to(room.roomId).emit('voting_started', {
    players: alivePlayers,
    timerSeconds: room.settings.votingTimerSeconds,
  });

  broadcastRoom(io, room);

  if (room.settings.votingTimerSeconds > 0) {
    room.votingTimerHandle = setTimeout(() => {
      finalizeVotes(io, room);
    }, room.settings.votingTimerSeconds * 1000);
  }
}

function finalizeVotes(io: Server, room: Room) {
  room.gameState = 'RESULT';
  const outcome = processVotes(room);

  // Update cumulative scores based on this round's outcome
  updateScores(room, outcome);

  // Build leaderboard snapshot (all players, sorted by score desc)
  const leaderboard = [...room.players.values()]
    .sort((a, b) => b.score - a.score)
    .map(p => ({
      playerId: p.playerId,
      displayName: p.displayName,
      score: p.score,
      isAlive: p.isAlive,
    }));

  io.to(room.roomId).emit('vote_results', {
    voteMap: outcome.voteMap,
    eliminatedPlayerId: outcome.eliminatedPlayerId,
    eliminatedWasImposter: outcome.eliminatedWasImposter,
    wasTie: outcome.wasTie,
    players: [...room.players.values()].map(p => ({
      playerId: p.playerId,
      displayName: p.displayName,
      isAlive: p.isAlive,
    })),
    leaderboard,
  });

  broadcastRoom(io, room);

  // Check win after a short delay (let clients show result)
  setTimeout(() => {
    const winResult = checkWinCondition(room);
    if (winResult) {
      room.gameState = 'GAME_OVER';
      const payload = buildGameOverPayload(room, winResult);
      io.to(room.roomId).emit('game_over', payload);
      broadcastRoom(io, room);
    }
  }, 500);
}


// Find all rooms a socket is connected to (by checking player lists)
function* getRoomsForSocket(io: Server, socketId: string): Generator<Room> {
  // We iterate all rooms via module-level map — import via roomManager
  // Instead, we use a simpler approach: rooms exported
  const { getRoom: _gr } = require('./roomManager');
  // Use io.sockets.adapter.rooms to get socket's rooms
  const socketRooms = io.sockets.adapter.sids.get(socketId) ?? new Set<string>();
  for (const roomId of socketRooms) {
    if (roomId === socketId) continue; // skip the socket's own room
    const room = _gr(roomId) as Room | undefined;
    if (room) yield room;
  }
}

function getSocketForPlayer(io: Server, socketId: string) {
  return io.sockets.sockets.get(socketId);
}
