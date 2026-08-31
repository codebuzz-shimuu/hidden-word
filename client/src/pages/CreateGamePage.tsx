import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '@/socket';
import { useGameStore } from '@/store/gameStore';
import { GameSettings } from '@/types/game';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import GameLayout from '@/components/layout/GameLayout';

const TIMER_OPTIONS = [
  { label: '30 sec', value: 30 },
  { label: '60 sec', value: 60 },
  { label: '90 sec', value: 90 },
  { label: '2 min', value: 120 },
  { label: 'Unlimited', value: 0 },
];

export default function CreateGamePage() {
  const navigate = useNavigate();
  const { setSession } = useGameStore();

  const [hostName, setHostName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [imposterCount, setImposterCount] = useState(2);
  const [clueTimer, setClueTimer] = useState(90);
  const [votingTimer, setVotingTimer] = useState(60);
  const [difficulty, setDifficulty] = useState<GameSettings['difficulty']>('random');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-calculate default imposters
  const handleMaxPlayersChange = (val: number) => {
    setMaxPlayers(val);
    if (val <= 6) setImposterCount(1);
    else if (val <= 11) setImposterCount(2);
    else setImposterCount(3);
  };

  const handleCreate = () => {
    const name = hostName.trim().slice(0, 16);
    if (!name) return setError('Please enter your name.');
    if (imposterCount >= maxPlayers) return setError('Too many imposters for that player count.');

    setError('');
    setLoading(true);

    const socket = getSocket();
    const settings: Partial<GameSettings> = {
      maxPlayers,
      imposterCount,
      clueTimerSeconds: clueTimer,
      votingTimerSeconds: votingTimer,
      difficulty,
    };

    socket.emit('create_room', settings, (res: { roomId?: string; error?: string }) => {
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      const roomCode = res.roomId!;

      // Now join the room as host
      socket.emit(
        'join_room',
        { roomCode, playerName: name },
        (joinRes: { playerId?: string; token?: string; isHost?: boolean; error?: string }) => {
          setLoading(false);
          if (joinRes.error) {
            setError(joinRes.error);
            return;
          }
          setSession({
            playerId: joinRes.playerId!,
            token: joinRes.token!,
            roomCode,
            isHost: true,
          });
          navigate('/lobby');
        }
      );
    });
  };

  return (
    <GameLayout>
      <div className="w-full mt-4">
        <button onClick={() => navigate('/')} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1">
          ← Back
        </button>

        <h1 className="text-3xl font-black text-white mb-1">Create Game</h1>
        <p className="text-white/40 text-sm mb-6">Set up your room and invite friends.</p>

        {/* Host Name */}
        <GlassCard animate className="mb-4">
          <label className="text-white/70 text-sm font-semibold mb-2 block">Your Name</label>
          <input
            className="input-field"
            placeholder="Enter your name..."
            maxLength={16}
            value={hostName}
            onChange={e => setHostName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
        </GlassCard>

        {/* Max Players */}
        <GlassCard animate className="mb-4">
          <label className="text-white/70 text-sm font-semibold mb-3 block">
            Max Players: <span className="text-white font-bold">{maxPlayers}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {[3,4,5,6,7,8,9,10,11,12,13,14,15].map(n => (
              <button
                key={n}
                onClick={() => handleMaxPlayersChange(n)}
                className={`w-10 h-10 rounded-lg font-bold text-sm transition-all
                  ${maxPlayers === n
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
              >
                {n}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Imposters */}
        <GlassCard animate className="mb-4">
          <label className="text-white/70 text-sm font-semibold mb-3 block">
            Imposters: <span className="text-white font-bold">{imposterCount}</span>
          </label>
          <div className="flex gap-3">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => setImposterCount(n)}
                disabled={n >= maxPlayers}
                className={`flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed
                  ${imposterCount === n
                    ? 'bg-red-600/70 border border-red-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                  }`}
              >
                🕵️ {n}
              </button>
            ))}
          </div>
          {imposterCount >= maxPlayers && (
            <p className="text-red-400 text-xs mt-2">Too many imposters for {maxPlayers} players.</p>
          )}
        </GlassCard>

        {/* Clue Timer */}
        <GlassCard animate className="mb-4">
          <label className="text-white/70 text-sm font-semibold mb-3 block">Clue Discussion Timer</label>
          <div className="flex flex-wrap gap-2">
            {TIMER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setClueTimer(opt.value)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all
                  ${clueTimer === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Voting Timer */}
        <GlassCard animate className="mb-4">
          <label className="text-white/70 text-sm font-semibold mb-3 block">Voting Timer</label>
          <div className="flex flex-wrap gap-2">
            {TIMER_OPTIONS.filter(o => o.value !== 120).map(opt => (
              <button
                key={opt.value}
                onClick={() => setVotingTimer(opt.value)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all
                  ${votingTimer === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Difficulty */}
        <GlassCard animate className="mb-6">
          <label className="text-white/70 text-sm font-semibold mb-3 block">Word Difficulty</label>
          <div className="flex gap-2">
            {(['random', 'easy', 'medium', 'hard'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all
                  ${difficulty === d
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
              >
                {d === 'random' ? '🎲 Random' : d === 'easy' ? '🌱 Easy' : d === 'medium' ? '🔥 Medium' : '💀 Hard'}
              </button>
            ))}
          </div>
        </GlassCard>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          onClick={handleCreate}
        >
          🚀 CREATE ROOM
        </Button>
      </div>
    </GameLayout>
  );
}
