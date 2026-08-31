import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function GameLayout({ children, className = '' }: Props) {
  return (
    <div className="min-h-screen bg-animated flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🕵️</span>
          <span className="font-black text-white text-lg tracking-tight">
            Hidden<span className="text-primary-light">Word</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <motion.main
        className={`flex-1 flex flex-col items-center justify-start p-4 pb-8 max-w-2xl w-full mx-auto ${className}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.main>
    </div>
  );
}
