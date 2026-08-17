import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ListChecks, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDocumentData } from '@/hooks/use-document-data';
import type { Workspace, DocumentRecord } from '@/types';

export function RequirementsTab() {
  const { doc } = useOutletContext<{ workspace: Workspace; doc: DocumentRecord }>();
  const { requirements, loading } = useDocumentData(doc.id);

  if (loading) return <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />)}</div>;

  if (requirements.length === 0) {
    return (
      <Card className="glass p-10 text-center">
        <ListChecks size={32} className="mx-auto mb-3 text-muted-foreground" />
        <p className="font-display text-lg">No requirements detected</p>
        <p className="mt-1 text-sm text-muted-foreground">AI will extract mandatory and optional requirements after analysis.</p>
      </Card>
    );
  }

  const mandatory = requirements.filter((r) => r.mandatory);
  const optional = requirements.filter((r) => !r.mandatory);

  return (
    <div className="space-y-6">
      {mandatory.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg text-destructive">Mandatory Requirements</h2>
          <div className="space-y-2">
            {mandatory.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="glass p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-destructive" />
                    <div className="flex-1">
                      <p className="text-sm">{r.description}</p>
                      {r.source_text && <p className="mt-2 rounded-lg border border-border bg-muted/20 p-2 text-xs italic text-muted-foreground">"{r.source_text}"</p>}
                      {r.source_page && <p className="mt-1 text-xs text-primary">Page {r.source_page}</p>}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {optional.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg text-muted-foreground">Optional Requirements</h2>
          <div className="space-y-2">
            {optional.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="glass p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm">{r.description}</p>
                      {r.source_page && <p className="mt-1 text-xs text-primary">Page {r.source_page}</p>}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
