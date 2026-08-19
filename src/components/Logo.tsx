import { BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';
  const icon = size === 'sm' ? 16 : size === 'lg' ? 28 : 20;
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn('relative flex items-center justify-center rounded-xl border border-primary/30 bg-primary/10', dim)}>
        <BrainCircuit size={icon} className="text-primary" />
        <div className="absolute inset-0 rounded-xl bg-primary/5 blur-md" />
      </div>
      <span className="font-display text-lg tracking-[0.1em] sm:tracking-[0.2em] text-foreground">MIND MATRIX</span>
    </div>
  );
}
