import { motion } from 'framer-motion';
import { getSocket } from '@/socket';
import { useGameStore } from '@/store/gameStore';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import Leaderboard from '@/components/game/Leaderboard';
import RoundHistory from '@/components/game/RoundHistory';
import GameLayout from '@/components/layout/GameLayout';

export default function GameOverPage() {
  const { gameOver, room, session } = useGameStore();
  const socket = getSocket();

  const isHost = room?.players.find(p => p.playerId === session?.playerId)?.isHost;
  const me = room?.players.find(p => p.playerId === session?.playerId);
  const isEliminated = me ? !me.isAlive : false;

  const handlePlayAgain = () => {
    socket.emit('play_again', { roomCode: room?.roomId, playerId: session?.playerId });
  };

  if (!gameOver) {
    return (
      <GameLayout>
        <div className="mt-20 text-white/50 text-center">Loading...</div>
      </GameLayout>
    );
  }

  const normalWon = gameOver.winner === 'normal';

  // Build final leaderboard from room players (scores persist until play_again resets them)
  const finalLeaderboard = room
    ? [...room.players]
        .sort((a, b) => b.score - a.score)
        .map(p => ({
          playerId: p.playerId,
          displayName: p.displayName,
          score: p.score,
          isAlive: p.isAlive,
        }))
    : [];

  return (
    <GameLayout>
      <div className="w-full mt-4 flex flex-col items-center gap-4">
        {/* Spectator banner */}
        {isEliminated && (
          <div className="w-full flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm">
            <span>👻</span>
            <span>You were eliminated — game over!</span>
          </div>
        )}

        {/* Victory banner */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <GlassCard
            strong
            className={`text-center py-8 border-2 ${normalWon ? 'border-primary/50' : 'border-red-500/50'}`}
          >
            <div className="text-7xl mb-3">{normalWon ? '🎉' : '🕵️'}</div>
            <h1 className={`text-4xl font-black mb-2 ${normalWon ? 'text-primary-light text-glow' : 'text-red-400 text-glow-red'}`}>
              {normalWon ? 'NORMAL PLAYERS WIN!' : 'IMPOSTERS WIN!'}
            </h1>
            <p className="text-white/50 text-sm">{gameOver.reason}</p>
          </GlassCard>
        </motion.div>

        {/* Imposters revealed */}
        <GlassCard animate className="w-full">
          <h3 className="text-white/50 text-xs uppercase tracking-widest mb-3">🕵️ The Imposters Were</h3>
          <div className="flex flex-wrap gap-2">
            {gameOver.imposterNames.map(name => (
              <span key={name} className="px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-red-300 font-bold text-sm">
                {name}
              </span>
            ))}
          </div>
        </GlassCard>

        {/* Last secret word */}
        <GlassCard animate className="w-full text-center">
          <div className="text-white/50 text-xs uppercase tracking-widest mb-1">Secret Word</div>
          <div className="text-4xl font-black text-white">{gameOver.secretWord}</div>
          <div className="text-white/40 text-sm">{gameOver.category}</div>
        </GlassCard>

        {/* Final Leaderboard */}
        {finalLeaderboard.length > 0 && (
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Leaderboard
              entries={finalLeaderboard}
              currentPlayerId={session?.playerId}
              title="🏆 Final Leaderboard"
            />
          </motion.div>
        )}

        {/* Round History */}
        {gameOver.rounds.length > 0 && (
          <div className="w-full">
            <RoundHistory rounds={gameOver.rounds} />
          </div>
        )}

        {/* Play Again */}
        {isHost ? (
          <Button variant="primary" size="lg" className="w-full" onClick={handlePlayAgain}>
            🔄 PLAY AGAIN
          </Button>
        ) : (
          <GlassCard animate className="w-full text-center py-4">
            <p className="text-white/40 text-sm">Waiting for host to start a new game...</p>
          </GlassCard>
        )}
      </div>
    </GameLayout>
  );
}
