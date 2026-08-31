import { useEffect, useState } from 'react';

interface Props {
  seconds: number;
  onExpire?: () => void;
  className?: string;
}

export default function Timer({ seconds, onExpire, className = '' }: Props) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    if (remaining === Infinity || seconds === 0) return;

    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  if (seconds === 0) {
    return (
      <div className={`text-white/50 text-sm font-mono ${className}`}>
        ∞ No timer
      </div>
    );
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isLow = remaining <= 10;

  return (
    <div
      className={`font-mono font-bold text-2xl transition-colors ${
        isLow ? 'text-red-400 animate-pulse' : 'text-white'
      } ${className}`}
    >
      ⏱️ {display}
    </div>
  );
}
