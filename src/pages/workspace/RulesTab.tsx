import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gavel } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useDocumentData } from '@/hooks/use-document-data';
import type { Workspace, DocumentRecord } from '@/types';

export function RulesTab() {
  const { doc } = useOutletContext<{ workspace: Workspace; doc: DocumentRecord }>();
  const { rules, loading } = useDocumentData(doc.id);

  if (loading) return <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />)}</div>;

  if (rules.length === 0) {
    return (
      <Card className="glass p-10 text-center">
        <Gavel size={32} className="mx-auto mb-3 text-muted-foreground" />
        <p className="font-display text-lg">No rules detected</p>
        <p className="mt-1 text-sm text-muted-foreground">AI will identify rules and eligibility criteria after analysis.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rules.map((r, i) => (
        <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="glass p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                <Gavel size={16} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-display text-base">{r.rule}</p>
                {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                {r.source_page && <p className="mt-2 text-xs text-primary">Page {r.source_page}</p>}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
