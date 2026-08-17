import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NeuralShader } from '@/components/NeuralShader';
import { Logo } from '@/components/Logo';
import type { ReactNode } from 'react';

export function AuthLayout({ children, subtitle }: { children: ReactNode; subtitle: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <NeuralShader className="fixed inset-0 -z-10" />
      <div className="absolute inset-0 -z-5 bg-background/40" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-strong rounded-2xl p-8 shadow-2xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <Link to="/" className="mb-4">
              <Logo />
            </Link>
            <p className="font-display text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your documents. Your intelligence.
        </p>
      </motion.div>
    </div>
  );
}
