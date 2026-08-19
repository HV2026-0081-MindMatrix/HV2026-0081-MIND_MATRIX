import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ListTodo, Loader2, Sparkles, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { aiService } from '@/services/ai';
import { useActionItems } from '@/hooks/use-document-data';
import { useToast } from '@/hooks/use-toast';
import type { Workspace, DocumentRecord, ActionItemStatus, Priority } from '@/types';

const priorityColors: Record<Priority, string> = {
  critical: 'destructive',
  high: 'default',
  medium: 'secondary',
  low: 'secondary',
};

const statusIcons: Record<ActionItemStatus, typeof CheckCircle2> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
};

export function ActionPlanTab() {
  const { doc } = useOutletContext<{ workspace: Workspace; doc: DocumentRecord }>();
  const { items, loading, updateStatus, reload } = useActionItems(doc.id);
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await aiService.generateActionPlan(doc.id);
      toast({ title: 'Action plan generated', description: `${res.items.length} tasks created.` });
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      toast({ title: 'Generation failed', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const cycleStatus = async (id: string, current: ActionItemStatus) => {
    const next: ActionItemStatus = current === 'pending' ? 'in_progress' : current === 'in_progress' ? 'completed' : 'pending';
    await updateStatus(id, next);
  };

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-muted/40" />;

  return (
    <div className="space-y-6">
      {items.length === 0 && !generating && (
        <Card className="glass p-8 text-center">
          <ListTodo size={36} className="mx-auto mb-4 text-primary" />
          <h2 className="font-display text-xl">Generate an Action Plan</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            AI will convert document requirements into a prioritized, trackable task list.
          </p>
          <Button onClick={generate} className="mt-6 gap-2">
            <Sparkles size={18} /> Generate Action Plan
          </Button>
        </Card>
      )}

      {generating && (
        <Card className="glass p-8 text-center">
          <Loader2 size={32} className="mx-auto mb-3 animate-spin text-primary" />
          <p className="font-display text-lg">Generating your action plan...</p>
        </Card>
      )}

      {items.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">{items.length} Action Items</h2>
            <Button onClick={generate} variant="outline" size="sm" className="gap-2 glass" disabled={generating}>
              <Sparkles size={14} /> Regenerate
            </Button>
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {items.map((item, i) => {
                const StatusIcon = statusIcons[item.status];
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className={`glass flex items-center gap-3 p-4 transition-colors overflow-hidden ${
                      item.status === 'completed' ? 'opacity-50' : ''
                    }`}>
                      <button
                        onClick={() => cycleStatus(item.id, item.status)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border hover:border-primary transition-colors"
                      >
                        <StatusIcon size={16} className={item.status === 'completed' ? 'text-success' : item.status === 'in_progress' ? 'text-warning' : 'text-muted-foreground'} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`font-display text-sm sm:text-base ${item.status === 'completed' ? 'line-through' : ''}`}>{item.title}</p>
                        {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          {item.deadline && <span className="flex items-center gap-1"><Clock size={12} /> {new Date(item.deadline).toLocaleDateString()}</span>}
                          {item.source && <span className="truncate">{item.source}</span>}
                        </div>
                      </div>
                      <Badge variant={priorityColors[item.priority] as 'destructive' | 'default' | 'secondary'} className="shrink-0">
                        {item.priority}
                      </Badge>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
