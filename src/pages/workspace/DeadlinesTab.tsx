import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarClock, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDocumentData } from '@/hooks/use-document-data';
import type { Workspace, DocumentRecord, Priority } from '@/types';

const priorityColors: Record<Priority, string> = {
  critical: 'destructive',
  high: 'default',
  medium: 'secondary',
  low: 'secondary',
};

const priorityOrder: Priority[] = ['critical', 'high', 'medium', 'low'];

export function DeadlinesTab() {
  const { doc } = useOutletContext<{ workspace: Workspace; doc: DocumentRecord }>();
  const { deadlines, loading } = useDocumentData(doc.id);

  const sorted = useMemo(() => {
    return [...deadlines].sort((a, b) => {
      const ai = priorityOrder.indexOf(a.importance);
      const bi = priorityOrder.indexOf(b.importance);
      if (ai !== bi) return ai - bi;
      if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
      return 0;
    });
  }, [deadlines]);

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />)}</div>;

  if (deadlines.length === 0) {
    return (
      <Card className="glass p-10 text-center">
        <CalendarClock size={32} className="mx-auto mb-3 text-muted-foreground" />
        <p className="font-display text-lg">No deadlines detected</p>
        <p className="mt-1 text-sm text-muted-foreground">AI will extract important dates after analysis.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((d, i) => (
        <motion.div key={d.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          <Card className="glass flex items-center gap-4 p-4">
            <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border ${
              d.importance === 'critical' ? 'border-destructive/30 bg-destructive/10' :
              d.importance === 'high' ? 'border-warning/30 bg-warning/10' : 'border-border bg-muted/30'
            }`}>
              {d.date ? (
                <>
                  <span className="text-xs leading-none text-muted-foreground">{new Date(d.date).toLocaleDateString('en', { month: 'short' })}</span>
                  <span className="font-display text-lg leading-tight">{new Date(d.date).getDate()}</span>
                </>
              ) : (
                <AlertCircle size={20} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-display text-base">{d.event}</p>
              {d.description && <p className="mt-0.5 text-sm text-muted-foreground">{d.description}</p>}
              {d.source_page && <p className="mt-0.5 text-xs text-primary">Page {d.source_page}</p>}
            </div>
            <Badge variant={priorityColors[d.importance] as 'destructive' | 'default' | 'secondary'}>
              {d.importance}
            </Badge>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
