import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '@/socket';
import { useGameStore } from '@/store/gameStore';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import Leaderboard from '@/components/game/Leaderboard';
import GameLayout from '@/components/layout/GameLayout';

export default function VoteResultPage() {
  const { voteResults, room, session } = useGameStore();
  const socket = getSocket();
  const [showReveal, setShowReveal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const isHost = room?.players.find(p => p.playerId === session?.playerId)?.isHost;
  const me = room?.players.find(p => p.playerId === session?.playerId);
  const isEliminated = me ? !me.isAlive : false;

  useEffect(() => {
    // Stagger: show elimination result after 1.2s, leaderboard after 2.5s
    const t1 = setTimeout(() => setShowReveal(true), 1200);
    const t2 = setTimeout(() => setShowLeaderboard(true), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!voteResults) {
    return (
      <GameLayout>
        <div className="mt-20 text-white/50 text-center">Loading results...</div>
      </GameLayout>
    );
  }

  const eliminated = voteResults.eliminatedPlayerId
    ? voteResults.players.find(p => p.playerId === voteResults.eliminatedPlayerId)
    : null;

  // Sort players by votes descending
  const sortedPlayers = [...voteResults.players].sort(
    (a, b) => (voteResults.voteMap[b.playerId] ?? 0) - (voteResults.voteMap[a.playerId] ?? 0)
  );

  const handleNextRound = () => {
    socket.emit('next_round', { roomCode: room?.roomId, playerId: session?.playerId });
  };

  return (
    <GameLayout>
      <div className="w-full mt-4 flex flex-col items-center gap-4">
        {/* Spectator banner */}
        {isEliminated && (
          <div className="w-full flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm">
            <span>👻</span>
            <span>Spectating — you were eliminated</span>
          </div>
        )}

        {/* Header */}
        <div className="text-center">
          <div className="text-5xl mb-2">📊</div>
          <h1 className="text-3xl font-black text-white">Voting Results</h1>
          <p className="text-white/40 text-sm mt-1">Round {room?.currentRound}</p>
        </div>

        {/* Vote tally */}
        <GlassCard animate className="w-full">
          <h3 className="text-white/50 text-xs uppercase tracking-widest mb-3">Votes Cast</h3>
          <div className="space-y-2">
            {sortedPlayers.map(player => {
              const votes = voteResults.voteMap[player.playerId] ?? 0;
              const maxVotes = Math.max(...Object.values(voteResults.voteMap), 1);
              const pct = (votes / maxVotes) * 100;
              const isElim = player.playerId === voteResults.eliminatedPlayerId;

              return (
                <div key={player.playerId} className="flex items-center gap-3">
                  <span className={`text-sm font-semibold w-24 truncate ${isElim ? 'text-red-400' : 'text-white/70'}`}>
                    {player.displayName}
                    {!player.isAlive && !isElim && ' ☠️'}
                  </span>
                  <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${isElim ? 'bg-red-500' : 'bg-primary/60'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </div>
                  <span className="text-white font-bold w-6 text-right">{votes}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Elimination reveal */}
        <AnimatePresence>
          {showReveal && (
            <motion.div
              className="w-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              {voteResults.wasTie ? (
                <GlassCard strong className="text-center py-6 border border-yellow-500/40">
                  <div className="text-5xl mb-2">⚠️</div>
                  <h2 className="text-2xl font-black text-yellow-400">TIE!</h2>
                  <p className="text-white/50 text-sm mt-1">Nobody is eliminated this round.</p>
                  <p className="text-white/30 text-xs mt-1">No points awarded.</p>
                </GlassCard>
              ) : eliminated ? (
                <GlassCard strong className={`text-center py-6 border-2 ${voteResults.eliminatedWasImposter ? 'border-red-500/60' : 'border-green-500/40'}`}>
                  <div className="text-5xl mb-2">🚨</div>
                  <p className="text-white/50 text-sm">Eliminated:</p>
                  <h2 className="text-3xl font-black text-white mb-3">{eliminated.displayName}</h2>
                  <div className={`text-2xl font-black ${voteResults.eliminatedWasImposter ? 'text-red-400' : 'text-green-400'}`}>
                    {voteResults.eliminatedWasImposter ? '🕵️ IMPOSTER' : '👤 NORMAL PLAYER'}
                  </div>
                  {/* Points awarded */}
                  <div className="mt-3 text-sm">
                    {voteResults.eliminatedWasImposter ? (
                      <span className="text-green-400/80">✅ Normal players earned <strong>+1 pt</strong> each!</span>
                    ) : (
                      <span className="text-red-400/80">🕵️ Imposters earned <strong>+2 pts</strong> each!</span>
                    )}
                  </div>
                </GlassCard>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leaderboard */}
        <AnimatePresence>
          {showLeaderboard && voteResults.leaderboard && (
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Leaderboard
                entries={voteResults.leaderboard}
                currentPlayerId={session?.playerId}
                title={`🏆 Leaderboard — After Round ${room?.currentRound}`}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Host next round / spectator wait */}
        {showLeaderboard && (
          isHost ? (
            <Button variant="primary" size="lg" className="w-full mt-2" onClick={handleNextRound}>
              ▶️ NEXT ROUND
            </Button>
          ) : (
            <p className="text-white/30 text-sm text-center">Waiting for host to start next round...</p>
          )
        )}
      </div>
    </GameLayout>
  );
}
