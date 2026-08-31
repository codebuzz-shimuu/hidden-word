import { PublicPlayer } from '@/types/game';

interface Props {
  players: PublicPlayer[];
  currentPlayerId?: string;
  showStatus?: 'ready' | 'alive';
}

export default function PlayerList({ players, currentPlayerId, showStatus = 'alive' }: Props) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {players.map((player) => {
        const isMe = player.playerId === currentPlayerId;
        const statusBadge =
          showStatus === 'ready'
            ? player.isReady
              ? <span className="badge-ready">🟢 Ready</span>
              : <span className="badge-not-ready">🟡 Not Ready</span>
            : player.isAlive
            ? <span className="badge-alive">🟢 Alive</span>
            : <span className="badge-eliminated">☠️ Eliminated</span>;

        return (
          <div
            key={player.playerId}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all
              ${isMe ? 'border-primary/50 bg-primary/10' : 'border-white/8 bg-white/5'}
              ${!player.isAlive ? 'opacity-50' : ''}
              ${!player.isConnected ? 'opacity-40' : ''}
            `}
          >
            <div className="flex items-center gap-2">
              {player.isHost && <span title="Host">👑</span>}
              <span className="text-white font-semibold">
                {player.displayName}
                {isMe && <span className="text-primary-light text-sm ml-1">(you)</span>}
              </span>
              {!player.isConnected && (
                <span className="text-white/30 text-xs">(disconnected)</span>
              )}
            </div>
            {statusBadge}
          </div>
        );
      })}
    </div>
  );
}
