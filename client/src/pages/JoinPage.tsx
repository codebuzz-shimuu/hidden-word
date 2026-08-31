import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSocket } from '@/socket';
import { useGameStore } from '@/store/gameStore';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import GameLayout from '@/components/layout/GameLayout';

export default function JoinPage() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { setSession, session } = useGameStore();

  const [roomCode, setRoomCode] = useState(code?.toUpperCase() ?? '');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Try reconnect on load
  useEffect(() => {
    if (session?.token && session?.roomCode) {
      const targetCode = code?.toUpperCase() ?? session.roomCode;
      if (targetCode === session.roomCode) {
        // Auto-reconnect
        setLoading(true);
        const socket = getSocket();
        socket.emit(
          'join_room',
          { roomCode: session.roomCode, playerName: '', token: session.token },
          (res: any) => {
            setLoading(false);
            if (!res.error) {
              setSession({ ...session, isHost: res.isHost });
              navigate('/lobby');
            }
            // If reconnect fails, let user re-enter name
          }
        );
      }
    }
  }, []);

  const handleJoin = () => {
    const name = playerName.trim().slice(0, 16);
    const rc = roomCode.trim().toUpperCase();
    if (!rc) return setError('Please enter a room code.');
    if (!name) return setError('Please enter your name.');

    setError('');
    setLoading(true);

    const socket = getSocket();
    socket.emit(
      'join_room',
      { roomCode: rc, playerName: name },
      (res: { playerId?: string; token?: string; isHost?: boolean; error?: string; gameState?: string }) => {
        setLoading(false);
        if (res.error) {
          setError(res.error);
          return;
        }
        setSession({
          playerId: res.playerId!,
          token: res.token!,
          roomCode: rc,
          isHost: res.isHost ?? false,
        });
        navigate('/lobby');
      }
    );
  };

  return (
    <GameLayout>
      <div className="w-full mt-8">
        <button onClick={() => navigate('/')} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1">
          ← Back
        </button>

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎮</div>
          <h1 className="text-3xl font-black text-white mb-1">Join Game</h1>
          <p className="text-white/40 text-sm">Enter the room code from your friend.</p>
        </div>

        <GlassCard animate className="mb-4">
          <label className="text-white/70 text-sm font-semibold mb-2 block">Room Code</label>
          <input
            className="input-field uppercase tracking-[0.3em] text-center text-xl font-bold"
            placeholder="X7K92A"
            maxLength={6}
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
        </GlassCard>

        <GlassCard animate className="mb-6">
          <label className="text-white/70 text-sm font-semibold mb-2 block">Your Name</label>
          <input
            className="input-field"
            placeholder="Enter your name..."
            maxLength={16}
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
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
          onClick={handleJoin}
        >
          JOIN GAME →
        </Button>
      </div>
    </GameLayout>
  );
}
