import { motion } from 'framer-motion';
import { LeaderboardEntry } from '@/types/game';

interface Props {
  entries: LeaderboardEntry[];
  currentPlayerId?: string;
  title?: string;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ entries, currentPlayerId, title = '🏆 Leaderboard' }: Props) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="text-white/50 text-xs uppercase tracking-widest mb-3">{title}</h3>
      <div className="space-y-2">
        {entries.map((entry, idx) => {
          const isMe = entry.playerId === currentPlayerId;
          const medal = MEDALS[idx] ?? null;

          return (
            <motion.div
              key={entry.playerId}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                ${isMe
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-white/8 bg-white/5'}
                ${!entry.isAlive ? 'opacity-50' : ''}
              `}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              {/* Rank */}
              <span className="w-7 text-center text-lg">
                {medal ?? <span className="text-white/30 text-sm font-bold">{idx + 1}</span>}
              </span>

              {/* Name */}
              <span className={`flex-1 font-semibold text-sm ${isMe ? 'text-primary-light' : 'text-white'}`}>
                {entry.displayName}
                {isMe && <span className="text-xs text-primary-light/70 ml-1">(you)</span>}
                {!entry.isAlive && <span className="text-xs text-white/30 ml-1">☠️</span>}
              </span>

              {/* Score */}
              <div className="flex items-center gap-1">
                <span className="text-yellow-400 font-black text-lg">{entry.score}</span>
                <span className="text-white/30 text-xs">pts</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Scoring key */}
      <div className="flex gap-4 mt-3 text-xs text-white/25 justify-center">
        <span>🕵️ Imposter survives = <strong className="text-white/40">+2 pts</strong></span>
        <span>👤 Imposter caught = <strong className="text-white/40">+1 pt</strong></span>
      </div>
    </div>
  );
}
