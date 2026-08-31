import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '@/socket';
import { useGameStore } from '@/store/gameStore';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import Modal from '@/components/ui/Modal';
import PlayerList from '@/components/game/PlayerList';
import GameLayout from '@/components/layout/GameLayout';

export default function LobbyPage() {
  const navigate = useNavigate();
  const { room, session, setSession, newHostName, setNewHostName, clearSession, reset } = useGameStore();

  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState('');
  const [starting, setStarting] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [showKickConfirm, setShowKickConfirm] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const socket = getSocket();
  const me = room?.players.find(p => p.playerId === session?.playerId);
  const isHost = me?.isHost ?? false;
  const inviteLink = `${window.location.origin}/join/${room?.roomId ?? ''}`;

  // Redirect if no session
  useEffect(() => {
    if (!session) navigate('/');
  }, [session]);

  // Show host-changed toast
  useEffect(() => {
    if (newHostName) {
      const t = setTimeout(() => setNewHostName(null), 4000);
      return () => clearTimeout(t);
    }
  }, [newHostName]);

  if (!room || !session) {
    return (
      <GameLayout>
        <div className="mt-20 text-white/50 text-center">Connecting...</div>
      </GameLayout>
    );
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReady = () => {
    socket.emit('set_ready', {
      roomCode: room.roomId,
      playerId: session.playerId,
      ready: !me?.isReady,
    });
  };

  const handleStartGame = () => {
    setStartError('');
    setStarting(true);
    socket.emit('start_game', { roomCode: room.roomId, playerId: session.playerId }, (res: any) => {
      setStarting(false);
      if (res?.error) setStartError(res.error);
    });
  };

  const handleChangeName = () => {
    const name = newName.trim().slice(0, 16);
    if (!name) return setNameError('Name cannot be empty.');
    socket.emit('change_name', { roomCode: room.roomId, playerId: session.playerId, newName: name }, (res: any) => {
      if (res?.error) {
        setNameError(res.error);
      } else {
        setShowNameModal(false);
        setNewName('');
        setNameError('');
      }
    });
  };

  const handleKick = (targetId: string) => {
    socket.emit('kick_player', { roomCode: room.roomId, hostId: session.playerId, targetId });
    setShowKickConfirm(null);
  };

  const handleLeave = () => {
    clearSession();
    reset();
    navigate('/');
  };

  const handleEndGame = () => {
    socket.emit('end_game', { roomCode: room.roomId, playerId: session.playerId });
    setShowEndConfirm(false);
  };

  const alivePlayers = room.players.filter(p => p.isAlive);
  const canStart = alivePlayers.length >= 3 && room.settings.imposterCount < alivePlayers.length;

  return (
    <GameLayout>
      {/* Host changed toast */}
      <AnimatePresence>
        {newHostName && (
          <motion.div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass px-4 py-2 text-sm text-yellow-300 border border-yellow-500/30"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            👑 New Host: {newHostName}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full mt-4 space-y-4">
        {/* Room Info */}
        <GlassCard animate>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-white/40 text-xs uppercase tracking-widest mb-1">Room Code</div>
              <div className="text-3xl font-black text-white tracking-[0.2em]">{room.roomId}</div>
            </div>
            <div className="text-right">
              <div className="text-white/40 text-xs mb-1">Players</div>
              <div className="text-2xl font-bold text-white">{room.players.length}/{room.settings.maxPlayers}</div>
            </div>
          </div>

          {/* Invite Link */}
          <div className="mt-3 flex gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/40 text-sm truncate">
              {inviteLink}
            </div>
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                copied ? 'bg-green-600 text-white' : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
        </GlassCard>

        {/* Game Settings Summary */}
        <GlassCard>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-white/50">🕵️ <strong className="text-white">{room.settings.imposterCount}</strong> imposter{room.settings.imposterCount > 1 ? 's' : ''}</span>
            <span className="text-white/50">⏱️ Clue: <strong className="text-white">{room.settings.clueTimerSeconds === 0 ? '∞' : `${room.settings.clueTimerSeconds}s`}</strong></span>
            <span className="text-white/50">🗳️ Vote: <strong className="text-white">{room.settings.votingTimerSeconds === 0 ? '∞' : `${room.settings.votingTimerSeconds}s`}</strong></span>
            <span className="text-white/50">🎯 <strong className="text-white capitalize">{room.settings.difficulty}</strong></span>
          </div>
        </GlassCard>

        {/* Players */}
        <div>
          <h2 className="text-white/50 text-xs uppercase tracking-widest mb-2">Players</h2>
          <div className="space-y-2">
            {room.players.map(player => {
              const isMe = player.playerId === session.playerId;
              return (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all
                    ${isMe ? 'border-primary/50 bg-primary/10' : 'border-white/8 bg-white/5'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    {player.isHost && <span>👑</span>}
                    <span className="text-white font-semibold">
                      {player.displayName}
                      {isMe && <span className="text-primary-light text-sm ml-1">(you)</span>}
                    </span>
                    {!player.isConnected && <span className="text-white/30 text-xs">(disconnected)</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {player.isReady
                      ? <span className="badge-ready">🟢 Ready</span>
                      : <span className="badge-not-ready">🟡 Not Ready</span>
                    }
                    {isHost && !isMe && (
                      <button
                        onClick={() => setShowKickConfirm(player.playerId)}
                        className="text-red-400/60 hover:text-red-400 text-xs ml-1"
                        title="Kick player"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My Controls */}
        <div className="flex gap-3">
          <Button
            variant={me?.isReady ? 'secondary' : 'primary'}
            size="md"
            className="flex-1"
            onClick={handleReady}
          >
            {me?.isReady ? '✓ Ready' : 'READY'}
          </Button>
          <Button variant="ghost" size="md" onClick={() => { setShowNameModal(true); setNewName(me?.displayName ?? ''); }}>
            ✏️
          </Button>
          <Button variant="ghost" size="md" onClick={handleLeave}>
            🚪
          </Button>
        </div>

        {/* Host Controls */}
        {isHost && (
          <div className="space-y-3">
            {startError && (
              <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 text-red-300 text-sm">
                {startError}
              </div>
            )}
            {!canStart && (
              <p className="text-white/30 text-sm text-center">
                {alivePlayers.length < 3
                  ? 'Need at least 3 players to start.'
                  : 'Too many imposters for current player count.'}
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!canStart}
              loading={starting}
              onClick={handleStartGame}
            >
              🚀 START GAME
            </Button>
            <Button variant="danger" size="sm" className="w-full" onClick={() => setShowEndConfirm(true)}>
              End Game
            </Button>
          </div>
        )}

        {!isHost && (
          <p className="text-white/30 text-sm text-center">Waiting for the host to start...</p>
        )}
      </div>

      {/* Change Name Modal */}
      <Modal isOpen={showNameModal} onClose={() => setShowNameModal(false)} title="Change Name">
        <input
          className="input-field mb-3"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          maxLength={16}
          onKeyDown={e => e.key === 'Enter' && handleChangeName()}
          autoFocus
        />
        {nameError && <p className="text-red-400 text-sm mb-3">{nameError}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowNameModal(false)}>Cancel</Button>
          <Button variant="primary" size="sm" className="flex-1" onClick={handleChangeName}>Save</Button>
        </div>
      </Modal>

      {/* Kick Confirm Modal */}
      <Modal isOpen={!!showKickConfirm} onClose={() => setShowKickConfirm(null)} title="Kick Player?">
        <p className="text-white/60 text-sm mb-4">
          Remove {room.players.find(p => p.playerId === showKickConfirm)?.displayName} from the room?
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowKickConfirm(null)}>Cancel</Button>
          <Button variant="danger" size="sm" className="flex-1" onClick={() => handleKick(showKickConfirm!)}>Kick</Button>
        </div>
      </Modal>

      {/* End Game Confirm */}
      <Modal isOpen={showEndConfirm} onClose={() => setShowEndConfirm(false)} title="End Game?">
        <p className="text-white/60 text-sm mb-4">Are you sure you want to end the game and return to lobby?</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowEndConfirm(false)}>Cancel</Button>
          <Button variant="danger" size="sm" className="flex-1" onClick={handleEndGame}>End Game</Button>
        </div>
      </Modal>
    </GameLayout>
  );
}
