import { getSocket } from '@/socket';
import { useGameStore } from '@/store/gameStore';
import Timer from '@/components/game/Timer';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import GameLayout from '@/components/layout/GameLayout';

export default function CluePhase() {
  const { room, session, myRole, clueTimerSeconds } = useGameStore();
  const socket = getSocket();
  const me = room?.players.find(p => p.playerId === session?.playerId);
  const isHost = me?.isHost ?? false;
  const isEliminated = me ? !me.isAlive : false;

  const handleSkipTimer = () => {
    socket.emit('skip_timer', { roomCode: room?.roomId, playerId: session?.playerId });
  };

  const isImposter = myRole?.role === 'imposter';

  return (
    <GameLayout>
      <div className="w-full mt-4 flex flex-col items-center gap-5">
        {/* Spectator banner */}
        {isEliminated && (
          <div className="w-full flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm">
            <span>👻</span>
            <span>You are spectating this round</span>
          </div>
        )}

        {/* Phase header */}
        <div className="text-center">
          <div className="text-5xl mb-2">🗣️</div>
          <h1 className="text-3xl font-black text-white">CLUE PHASE</h1>
          <p className="text-white/40 text-sm mt-1">Round {room?.currentRound}</p>
        </div>

        {/* Timer */}
        <GlassCard animate className="w-full text-center py-6">
          <Timer seconds={clueTimerSeconds} className="text-4xl mb-2 justify-center" />
          <p className="text-white/40 text-sm">
            {clueTimerSeconds === 0 ? 'No time limit' : 'until voting begins'}
          </p>
        </GlassCard>

        {/* Role reminder */}
        {myRole && (
          <GlassCard animate className={`w-full text-center ${isImposter ? 'border-red-500/30' : 'border-primary/30'} border`}>
            {isImposter ? (
              <>
                <div className="text-2xl mb-1">🕵️</div>
                <p className="text-red-400 font-bold text-sm">You are the IMPOSTER</p>
                <p className="text-white/50 text-sm">Category: <strong className="text-white">{myRole.category}</strong></p>
                <p className="text-white/30 text-xs mt-1">Listen carefully — figure out the word!</p>
              </>
            ) : (
              <>
                <div className="text-2xl mb-1">🔐</div>
                <p className="text-white/50 text-sm">Your word:</p>
                <p className="text-2xl font-black text-white">{myRole.word}</p>
                <p className="text-white/30 text-xs mt-1">Give clues without saying the word!</p>
              </>
            )}
          </GlassCard>
        )}

        {/* Instructions */}
        <GlassCard animate className="w-full">
          <h3 className="text-white/70 font-bold text-sm uppercase tracking-widest mb-3">Instructions</h3>
          <ul className="space-y-2 text-white/60 text-sm">
            <li>🎙️ Take turns giving one clue each on Discord</li>
            <li>🚫 Don't say the secret word directly</li>
            <li>🕵️ Imposters — try to blend in with convincing clues</li>
            <li>👀 Normal players — watch for suspicious clues</li>
          </ul>
        </GlassCard>

        {/* Alive players */}
        {room && (
          <GlassCard animate className="w-full">
            <h3 className="text-white/70 text-xs uppercase tracking-widest mb-3">
              Alive Players ({room.players.filter(p => p.isAlive).length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {room.players
                .filter(p => p.isAlive)
                .map(p => (
                  <span
                    key={p.playerId}
                    className={`px-3 py-1 rounded-full text-sm font-semibold
                      ${p.playerId === session?.playerId ? 'bg-primary/30 text-primary-light border border-primary/40' : 'bg-white/10 text-white/70'}
                    `}
                  >
                    {p.displayName}
                    {p.playerId === session?.playerId && ' (you)'}
                  </span>
                ))}
            </div>
          </GlassCard>
        )}

        {/* Host controls */}
        {isHost && (
          <Button variant="secondary" size="sm" onClick={handleSkipTimer} className="w-full">
            ⏭️ Skip to Voting
          </Button>
        )}
      </div>
    </GameLayout>
  );
}
