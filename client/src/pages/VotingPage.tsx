import { useState } from 'react';
import { motion } from 'framer-motion';
import { getSocket } from '@/socket';
import { useGameStore } from '@/store/gameStore';
import Timer from '@/components/game/Timer';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import GameLayout from '@/components/layout/GameLayout';

export default function VotingPage() {
  const { room, session, votingPlayers, votingTimerSeconds, voteCastProgress, myVote, setMyVote } = useGameStore();
  const socket = getSocket();

  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const isHost = room?.players.find(p => p.playerId === session?.playerId)?.isHost;
  const me = room?.players.find(p => p.playerId === session?.playerId);
  const amAlive = me?.isAlive ?? false;

  const handleVote = () => {
    if (!selected) return setError('Please select a player to vote for.');
    if (!amAlive) return;

    setError('');
    socket.emit(
      'submit_vote',
      { roomCode: room?.roomId, voterId: session?.playerId, targetId: selected },
      (res: { success?: boolean; error?: string }) => {
        if (res?.error) {
          setError(res.error);
        } else {
          setMyVote(selected);
          setSubmitted(true);
        }
      }
    );
  };

  const handleSkipTimer = () => {
    socket.emit('skip_timer', { roomCode: room?.roomId, playerId: session?.playerId });
  };

  return (
    <GameLayout>
      <div className="w-full mt-4 flex flex-col items-center gap-4">
        {/* Header */}
        <div className="text-center">
          <div className="text-5xl mb-2">🗳️</div>
          <h1 className="text-3xl font-black text-white">VOTE</h1>
          <p className="text-white/40 text-sm mt-1">Who do you think is the Imposter?</p>
        </div>

        {/* Timer + progress */}
        <GlassCard animate className="w-full flex items-center justify-between">
          <Timer seconds={votingTimerSeconds} />
          <div className="text-white/50 text-sm">
            {voteCastProgress.votedCount}/{voteCastProgress.totalCount} voted
          </div>
        </GlassCard>

        {!amAlive ? (
          <GlassCard animate className="w-full text-center py-6">
            <div className="text-4xl mb-2">☠️</div>
            <p className="text-white/50">You have been eliminated and cannot vote.</p>
          </GlassCard>
        ) : submitted ? (
          <GlassCard animate className="w-full text-center py-6">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-green-400 font-bold">Vote submitted!</p>
            <p className="text-white/40 text-sm mt-1">
              You voted for:{' '}
              <strong className="text-white">
                {votingPlayers.find(p => p.playerId === selected)?.displayName}
              </strong>
            </p>
            <p className="text-white/30 text-sm mt-2">
              Waiting for others... ({voteCastProgress.votedCount}/{voteCastProgress.totalCount})
            </p>
          </GlassCard>
        ) : (
          <>
            {/* Player vote cards */}
            <div className="w-full grid grid-cols-2 gap-3">
              {votingPlayers
                .filter(p => p.playerId !== session?.playerId)
                .map(player => (
                  <motion.button
                    key={player.playerId}
                    onClick={() => setSelected(player.playerId)}
                    whileTap={{ scale: 0.95 }}
                    className={`p-4 rounded-xl border-2 text-center transition-all font-bold
                      ${selected === player.playerId
                        ? 'border-red-500 bg-red-500/20 text-red-300'
                        : 'border-white/10 bg-white/5 text-white hover:border-white/30 hover:bg-white/10'
                      }`}
                  >
                    <div className="text-2xl mb-1">
                      {selected === player.playerId ? '🎯' : '👤'}
                    </div>
                    <div className="text-sm leading-tight">{player.displayName}</div>
                  </motion.button>
                ))}
            </div>

            {error && (
              <div className="w-full bg-red-500/20 border border-red-500/40 rounded-xl p-3 text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <Button
              variant="danger"
              size="lg"
              className="w-full"
              disabled={!selected}
              onClick={handleVote}
            >
              🗳️ CONFIRM VOTE
            </Button>
          </>
        )}

        {/* Host skip */}
        {isHost && !submitted && (
          <Button variant="ghost" size="sm" onClick={handleSkipTimer} className="w-full">
            ⏭️ End Voting Now
          </Button>
        )}
      </div>
    </GameLayout>
  );
}
