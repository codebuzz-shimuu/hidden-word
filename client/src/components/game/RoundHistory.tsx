import { RoundHistoryEntry } from '@/types/game';
import GlassCard from '@/components/ui/GlassCard';

interface Props {
  rounds: RoundHistoryEntry[];
}

export default function RoundHistory({ rounds }: Props) {
  if (rounds.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      <h3 className="text-white/70 font-semibold text-sm uppercase tracking-widest">Round History</h3>
      {rounds.map((r) => (
        <GlassCard key={r.roundNumber} className="!p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/50 text-sm font-medium">Round {r.roundNumber}</span>
            <span className="text-white/40 text-xs">{r.category}</span>
          </div>
          <div className="text-white font-bold text-lg mb-1">{r.secretWord}</div>
          <div className="text-white/60 text-sm">
            Imposters: {r.imposterNames.join(', ')}
          </div>
          <div className="text-white/60 text-sm mt-1">
            {r.wasTie ? (
              <span className="text-yellow-400">⚠️ Tie — nobody eliminated</span>
            ) : r.eliminatedName ? (
              <span>
                Eliminated: <strong>{r.eliminatedName}</strong> —{' '}
                {r.eliminatedWasImposter ? (
                  <span className="text-red-400">🕵️ was Imposter</span>
                ) : (
                  <span className="text-green-400">👤 was Normal</span>
                )}
              </span>
            ) : (
              <span className="text-white/30">No elimination</span>
            )}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
