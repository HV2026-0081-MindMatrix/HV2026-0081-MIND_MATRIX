import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Building2, MapPin, Calendar, DollarSign, Percent, FileCheck, Gavel, BookMarked, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDocumentData } from '@/hooks/use-document-data';
import type { Workspace, DocumentRecord, EntityType } from '@/types';

const typeConfig: Record<string, { label: string; icon: typeof Users }> = {
  person: { label: 'People', icon: Users },
  organization: { label: 'Organizations', icon: Building2 },
  location: { label: 'Locations', icon: MapPin },
  date: { label: 'Dates', icon: Calendar },
  amount: { label: 'Amounts', icon: DollarSign },
  percentage: { label: 'Percentages', icon: Percent },
  requirement: { label: 'Requirements', icon: FileCheck },
  rule: { label: 'Rules', icon: Gavel },
  reference: { label: 'References', icon: BookMarked },
  contact: { label: 'Contact Details', icon: Phone },
};

export function KeyInfoTab() {
  const { doc } = useOutletContext<{ workspace: Workspace; doc: DocumentRecord }>();
  const { entities, loading } = useDocumentData(doc.id);

  const groups = useMemo(() => {
    const g: Record<string, typeof entities> = {};
    entities.forEach((e) => {
      if (!g[e.entity_type]) g[e.entity_type] = [];
      g[e.entity_type].push(e);
    });
    return g;
  }, [entities]);

  if (loading) {
    return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />)}</div>;
  }

  if (entities.length === 0) {
    return (
      <Card className="glass p-10 text-center">
        <p className="font-display text-lg">No entities extracted</p>
        <p className="mt-1 text-sm text-muted-foreground">Key information will appear here after analysis.</p>
      </Card>
    );
  }

  const sortedTypes = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

  return (
    <div className="space-y-6">
      {sortedTypes.map((type, idx) => {
        const cfg = typeConfig[type] ?? { label: type, icon: BookMarked };
        return (
          <motion.div key={type} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
            <Card className="glass p-6">
              <div className="mb-4 flex items-center gap-2">
                <cfg.icon size={18} className="text-primary" />
                <h2 className="font-display text-lg">{cfg.label}</h2>
                <Badge variant="secondary" className="ml-auto">{groups[type].length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groups[type].map((e) => (
                  <div key={e.id} className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="font-medium">{e.value}</p>
                    {e.context && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{e.context}</p>}
                    {e.page_number && <p className="mt-1 text-xs text-primary">Page {e.page_number}</p>}
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

void (undefined as unknown as EntityType);
