import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Clock, ListChecks, Users, AlertTriangle,
  TrendingUp, Calendar, Tag,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDocumentData } from '@/hooks/use-document-data';
import type { Workspace, DocumentRecord } from '@/types';

export function OverviewTab() {
  const { doc } = useOutletContext<{ workspace: Workspace; doc: DocumentRecord }>();
  const { entities, deadlines, requirements, rules, analysisRun, loading } = useDocumentData(doc.id);

  const keyPoints = useMemo(() => {
    if (analysisRun?.key_points) return analysisRun.key_points as string[];
    return [];
  }, [analysisRun]);

  const risks = useMemo(() => {
    if (analysisRun?.potential_risks) return analysisRun.potential_risks as string[];
    return [];
  }, [analysisRun]);

  const entityGroups = useMemo(() => {
    const groups: Record<string, typeof entities> = {};
    entities.forEach((e) => {
      if (!groups[e.entity_type]) groups[e.entity_type] = [];
      groups[e.entity_type].push(e);
    });
    return groups;
  }, [entities]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  const hasData = analysisRun || entities.length || deadlines.length || requirements.length;

  if (!hasData) {
    return (
      <Card className="glass p-10 text-center">
        <FileText size={32} className="mx-auto mb-3 text-muted-foreground" />
        <p className="font-display text-lg">No analysis data yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The AI analysis may still be running, or AI keys are not configured.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      {analysisRun && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              <h2 className="font-display text-lg">AI Summary</h2>
            </div>
            {analysisRun.executive_summary && (
              <p className="text-sm leading-relaxed text-foreground/90">
                {analysisRun.executive_summary}
              </p>
            )}
            {analysisRun.simple_explanation && (
              <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Simple Explanation</p>
                <p className="text-sm text-muted-foreground">{analysisRun.simple_explanation}</p>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Key Points */}
      {keyPoints.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="glass p-6">
            <h2 className="mb-4 font-display text-lg">Key Points</h2>
            <ul className="space-y-2">
              {keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm">{point}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Pages', value: doc.page_count ?? '?', icon: FileText },
          { label: 'Deadlines', value: deadlines.length, icon: Clock },
          { label: 'Requirements', value: requirements.length, icon: ListChecks },
          { label: 'Entities', value: entities.length, icon: Users },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
            <Card className="glass p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 font-display text-2xl">{stat.value}</p>
                </div>
                <stat.icon size={18} className="text-primary" />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Deadlines preview */}
        {deadlines.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="glass p-6">
              <div className="mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-warning" />
                <h2 className="font-display text-lg">Detected Deadlines</h2>
              </div>
              <div className="space-y-3">
                {deadlines.slice(0, 4).map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{d.event}</p>
                      {d.date && <p className="text-xs text-muted-foreground">{new Date(d.date).toLocaleDateString()}</p>}
                    </div>
                    <Badge variant={d.importance === 'critical' ? 'destructive' : d.importance === 'high' ? 'default' : 'secondary'}>
                      {d.importance}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Requirements preview */}
        {requirements.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass p-6">
              <div className="mb-4 flex items-center gap-2">
                <ListChecks size={18} className="text-info" />
                <h2 className="font-display text-lg">Requirements</h2>
              </div>
              <div className="space-y-2">
                {requirements.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex items-start gap-2">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${r.mandatory ? 'bg-destructive' : 'bg-muted-foreground'}`} />
                    <p className="text-sm">{r.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Entities */}
      {Object.keys(entityGroups).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="glass p-6">
            <div className="mb-4 flex items-center gap-2">
              <Tag size={18} className="text-accent" />
              <h2 className="font-display text-lg">Detected Entities</h2>
            </div>
            <div className="space-y-4">
              {Object.entries(entityGroups).map(([type, items]) => (
                <div key={type}>
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{type}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.slice(0, 10).map((e) => (
                      <Badge key={e.id} variant="outline" className="border-primary/20">
                        {e.value}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass border-destructive/20 p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              <h2 className="font-display text-lg">Potential Risks & Important Rules</h2>
            </div>
            <ul className="space-y-2">
              {risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-destructive/60" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
