import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import GameLayout from '@/components/layout/GameLayout';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <GameLayout>
      {/* Hero */}
      <motion.div
        className="flex flex-col items-center text-center mt-8 mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-7xl mb-4 animate-bounce-in">🕵️</div>
        <h1 className="text-5xl font-black text-white tracking-tight mb-2 text-glow">
          Hidden<span className="text-primary-light">Word</span>
        </h1>
        <p className="text-white/50 text-lg max-w-xs">
          Real-time multiplayer social deduction. Find the imposters — or become one.
        </p>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="flex flex-col gap-4 w-full max-w-xs"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/create')}
        >
          🎮 CREATE GAME
        </Button>

        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/join')}
        >
          🔗 JOIN GAME
        </Button>
      </motion.div>

      {/* Info badges */}
      <motion.div
        className="flex flex-wrap gap-2 justify-center mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {['Up to 15 players', 'No account needed', 'Works on Android & PC', 'Free'].map(t => (
          <span key={t} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs">
            {t}
          </span>
        ))}
      </motion.div>

      {/* How to play */}
      <motion.div
        className="glass mt-8 w-full p-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-white/70 font-bold text-sm uppercase tracking-widest mb-3">How to Play</h2>
        <ol className="space-y-2 text-white/60 text-sm">
          <li>1. 👑 Host creates a room and shares the link</li>
          <li>2. 🎮 Friends join from their phone or PC</li>
          <li>3. 🔐 Everyone gets a secret word — except the Imposters</li>
          <li>4. 🗣️ Discuss clues through Discord voice</li>
          <li>5. 🗳️ Vote to eliminate the Imposter</li>
          <li>6. 🎉 Normal players win if all Imposters are eliminated!</li>
        </ol>
      </motion.div>
    </GameLayout>
  );
}
