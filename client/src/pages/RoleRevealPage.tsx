import { useState } from 'react';
import { motion } from 'framer-motion';
import { getSocket } from '@/socket';
import { useGameStore } from '@/store/gameStore';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import GameLayout from '@/components/layout/GameLayout';

export default function RoleRevealPage() {
  const { myRole, session, room, roleConfirmProgress } = useGameStore();
  const [revealed, setRevealed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const socket = getSocket();
  const isImposter = myRole?.role === 'imposter';

  // Check if this player is eliminated (no role assigned = spectator)
  const me = room?.players.find(p => p.playerId === session?.playerId);
  const isEliminated = me ? !me.isAlive : false;

  // ── Spectator View (eliminated players) ─────────────────────────────────────
  if (isEliminated) {
    const alivePlayers = room?.players.filter(p => p.isAlive) ?? [];
    return (
      <GameLayout>
        <div className="w-full mt-6 flex flex-col items-center gap-5">
          <motion.div
            className="w-full max-w-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard strong className="text-center py-8 border border-white/10">
              <div className="text-6xl mb-3">👻</div>
              <h2 className="text-2xl font-black text-white/70 mb-1">SPECTATING</h2>
              <p className="text-white/40 text-sm mb-4">
                You've been eliminated. Watch the rest of the game below.
              </p>
              <div className="bg-white/5 rounded-xl p-3 text-left">
                <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Round {room?.currentRound}</p>
                <p className="text-white/50 text-sm">
                  A new secret word has been chosen. Players are viewing their roles...
                </p>
              </div>
            </GlassCard>

            {/* Alive players status */}
            <GlassCard className="mt-4">
              <h3 className="text-white/40 text-xs uppercase tracking-widest mb-2">
                Alive Players ({alivePlayers.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {alivePlayers.map(p => (
                  <span key={p.playerId} className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-semibold">
                    {p.displayName}
                  </span>
                ))}
              </div>
            </GlassCard>

            {/* Progress */}
            {roleConfirmProgress.total > 0 && (
              <div className="mt-3 text-center text-white/30 text-sm">
                {roleConfirmProgress.confirmed}/{roleConfirmProgress.total} players confirmed their role
              </div>
            )}
          </motion.div>
        </div>
      </GameLayout>
    );
  }

  // ── Normal Role Reveal (alive players) ──────────────────────────────────────
  if (!myRole) {
    return (
      <GameLayout>
        <div className="mt-20 text-white/50 text-center">Waiting for role assignment...</div>
      </GameLayout>
    );
  }

  const handleConfirm = () => {
    setConfirmed(true);
    socket.emit('confirm_role', {
      roomCode: session?.roomCode,
      playerId: session?.playerId,
    });
  };

  return (
    <GameLayout>
      <div className="w-full mt-6 flex flex-col items-center">
        <div className="text-white/40 text-sm mb-2">
          Round {myRole.roundNumber}
        </div>

        {!revealed ? (
          // ── Covered card ──
          <motion.div
            className="w-full max-w-sm"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <GlassCard strong className="text-center py-12">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-black text-white mb-2">Your Secret Info</h2>
              <p className="text-white/50 text-sm mb-6">
                Make sure nobody is looking at your screen.
              </p>
              <Button variant="primary" size="lg" className="w-full" onClick={() => setRevealed(true)}>
                REVEAL MY ROLE
              </Button>
            </GlassCard>
          </motion.div>
        ) : (
          // ── Role card ──
          <motion.div
            className="w-full max-w-sm"
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.4, type: 'spring' }}
          >
            {isImposter ? (
              <div className="glass-strong border-red-500/40 border-2 p-6 rounded-2xl text-center">
                <div className="text-6xl mb-3 animate-bounce">🕵️</div>
                <div className="text-red-400 font-black text-sm uppercase tracking-widest mb-1">
                  You Are The
                </div>
                <h1 className="text-4xl font-black text-red-400 text-glow-red mb-4">
                  IMPOSTER
                </h1>
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <div className="text-white/50 text-xs uppercase tracking-widest mb-1">Category</div>
                  <div className="text-2xl font-black text-white">{myRole.category}</div>
                </div>
                <p className="text-white/50 text-sm">
                  You do <strong>NOT</strong> know the secret word.
                  <br />Listen carefully to the clues and blend in.
                </p>
              </div>
            ) : (
              <div className="glass-strong border-primary/40 border-2 p-6 rounded-2xl text-center">
                <div className="text-6xl mb-3">🔐</div>
                <div className="text-primary-light font-black text-sm uppercase tracking-widest mb-1">
                  Your Secret Word
                </div>
                <h1 className="text-5xl font-black text-white text-glow mb-4">
                  {myRole.word}
                </h1>
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <div className="text-white/50 text-xs uppercase tracking-widest mb-1">Category</div>
                  <div className="text-xl font-bold text-white/80">{myRole.category}</div>
                </div>
                <p className="text-white/50 text-sm">
                  Remember your word.
                  <br />Do <strong>NOT</strong> say it out loud.
                </p>
              </div>
            )}

            {/* Confirm button */}
            {!confirmed ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full mt-4"
                onClick={handleConfirm}
              >
                ✅ I'M READY
              </Button>
            ) : (
              <div className="mt-4 glass p-4 text-center">
                <p className="text-green-400 font-semibold mb-1">✓ You're confirmed!</p>
                <p className="text-white/40 text-sm">
                  Waiting for others...{' '}
                  {roleConfirmProgress.total > 0 && (
                    <span className="font-bold text-white/60">
                      {roleConfirmProgress.confirmed}/{roleConfirmProgress.total}
                    </span>
                  )}
                </p>
              </div>
            )}
          </motion.div>
        )}

        <p className="text-white/25 text-xs text-center mt-6 max-w-xs">
          ⚠️ Do not show this screen to other players
        </p>
      </div>
    </GameLayout>
  );
}
