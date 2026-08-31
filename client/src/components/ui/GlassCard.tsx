import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  strong?: boolean;
}

export default function GlassCard({ children, className = '', animate = false, strong = false }: Props) {
  const base = strong ? 'glass-strong' : 'glass';

  if (animate) {
    return (
      <motion.div
        className={`${base} p-5 ${className}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={`${base} p-5 ${className}`}>{children}</div>;
}
