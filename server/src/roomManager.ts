import { v4 as uuidv4 } from 'uuid';
import { Room, Player, GameSettings, PublicRoom, PublicPlayer } from './types';

// ─── In-Memory Store ─────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();

// Clean up inactive rooms every 10 minutes (rooms expire after 2 hours)
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.lastActivity > 2 * 60 * 60 * 1000) {
      clearRoomTimers(room);
      rooms.delete(id);
      console.log(`[RoomManager] Cleaned up expired room: ${id}`);
    }
  }
}, 10 * 60 * 1000);

// ─── Room ID Generation ──────────────────────────────────────────────────────

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(id) ? generateRoomId() : id;
}

// ─── Room CRUD ───────────────────────────────────────────────────────────────

export function createRoom(settings: GameSettings): Room {
  const roomId = generateRoomId();
  const room: Room = {
    roomId,
    hostId: '',
    settings,
    gameState: 'LOBBY',
    currentRound: 0,
    players: new Map(),
    rounds: [],
    currentImposterIds: [],
    currentWord: '',
    currentCategory: '',
    currentVotes: new Map(),
    confirmedRoles: new Set(),
    clueTimerHandle: null,
    votingTimerHandle: null,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId.toUpperCase());
}

export function deleteRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    clearRoomTimers(room);
    rooms.delete(roomId);
  }
}

export function touchRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) room.lastActivity = Date.now();
}

export function clearRoomTimers(room: Room): void {
  if (room.clueTimerHandle) {
    clearTimeout(room.clueTimerHandle);
    room.clueTimerHandle = null;
  }
  if (room.votingTimerHandle) {
    clearTimeout(room.votingTimerHandle);
    room.votingTimerHandle = null;
  }
}

// ─── Player Management ───────────────────────────────────────────────────────

export function addPlayer(
  room: Room,
  socketId: string,
  displayName: string,
  token?: string,
  existingPlayerId?: string,
): Player {
  const player: Player = {
    playerId: existingPlayerId || uuidv4(),
    socketId,
    displayName,
    isHost: room.players.size === 0,
    isAlive: true,
    isReady: false,
    isConnected: true,
    token: token || uuidv4(),
    joinOrder: room.players.size,
    score: 0,
  };
  room.players.set(player.playerId, player);
  if (player.isHost) room.hostId = player.playerId;
  touchRoom(room.roomId);
  return player;
}

export function findPlayerByToken(room: Room, token: string): Player | undefined {
  for (const player of room.players.values()) {
    if (player.token === token) return player;
  }
}

export function findPlayerBySocketId(room: Room, socketId: string): Player | undefined {
  for (const player of room.players.values()) {
    if (player.socketId === socketId) return player;
  }
}

export function removePlayer(room: Room, playerId: string): void {
  room.players.delete(playerId);
  touchRoom(room.roomId);
}

export function isNameTaken(room: Room, name: string, excludePlayerId?: string): boolean {
  for (const [id, player] of room.players) {
    if (id === excludePlayerId) continue;
    if (player.displayName.toLowerCase() === name.toLowerCase()) return true;
  }
  return false;
}

// ─── Host Migration ──────────────────────────────────────────────────────────

export function migrateHost(room: Room, disconnectedPlayerId: string): Player | null {
  // Find next connected player by join order
  const candidates = [...room.players.values()]
    .filter(p => p.playerId !== disconnectedPlayerId && p.isConnected)
    .sort((a, b) => a.joinOrder - b.joinOrder);

  if (candidates.length === 0) return null;

  const newHost = candidates[0];
  newHost.isHost = true;
  room.hostId = newHost.playerId;
  return newHost;
}

// ─── Public Projection ───────────────────────────────────────────────────────

export function toPublicPlayer(player: Player): PublicPlayer {
  return {
    playerId: player.playerId,
    displayName: player.displayName,
    isHost: player.isHost,
    isAlive: player.isAlive,
    isReady: player.isReady,
    isConnected: player.isConnected,
    score: player.score,
  };
}

export function toPublicRoom(room: Room): PublicRoom {
  return {
    roomId: room.roomId,
    hostId: room.hostId,
    settings: room.settings,
    gameState: room.gameState,
    currentRound: room.currentRound,
    players: [...room.players.values()].map(toPublicPlayer),
  };
}
