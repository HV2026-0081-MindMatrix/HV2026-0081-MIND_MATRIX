import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, FileText, MessageSquare, CheckCircle2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

interface ActivityItem {
  type: string;
  title: string;
  workspace_id: string;
  document_id: string;
  created_at: string;
}

export function ActivityPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [docs, checks, artifacts, actions] = await Promise.all([
          supabase.from('documents').select('file_name,workspace_id,id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
          supabase.from('eligibility_checks').select('status,document_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('generated_artifacts').select('title,artifact_type,document_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('action_items').select('title,document_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        ]);

        const all: ActivityItem[] = [
          ...(docs.data?.map((d) => ({ type: 'document', title: d.file_name, workspace_id: '', document_id: d.id, created_at: d.created_at })) ?? []),
          ...(checks.data?.map((c) => ({ type: 'eligibility', title: `Eligibility check: ${c.status}`, workspace_id: '', document_id: c.document_id, created_at: c.created_at })) ?? []),
          ...(artifacts.data?.map((a) => ({ type: 'artifact', title: a.title, workspace_id: '', document_id: a.document_id, created_at: a.created_at })) ?? []),
          ...(actions.data?.map((a) => ({ type: 'action', title: a.title, workspace_id: '', document_id: a.document_id, created_at: a.created_at })) ?? []),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setItems(all);
      } catch (err) {
        console.error('Activity load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const icons: Record<string, typeof Activity> = {
    document: FileText,
    eligibility: CheckCircle2,
    artifact: Sparkles,
    action: MessageSquare,
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:px-10">
      <h1 className="mb-8 font-display text-3xl md:text-4xl">Recent Activity</h1>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/40" />)}</div>
      ) : items.length === 0 ? (
        <Card className="glass p-10 text-center">
          <Activity size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-display text-lg">No recent activity</p>
          <p className="mt-1 text-sm text-muted-foreground">Upload a document to get started.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const Icon = icons[item.type] ?? Activity;
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="glass flex items-center gap-4 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/30">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                  {item.document_id && (
                    <Link to={`/workspace/${item.workspace_id}/document/${item.document_id}`} className="text-xs text-primary hover:underline">
                      View
                    </Link>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
