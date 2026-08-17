import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Plus, Clock, CheckCircle2, AlertCircle, Loader2,
  ArrowRight, Sparkles, FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { fetchWorkspaces, fetchDocuments } from '@/services/database';
import type { Workspace, DocumentRecord, ProcessingStatus } from '@/types';

const statusConfig: Record<ProcessingStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  uploaded: { label: 'Uploaded', icon: Clock, color: 'text-muted-foreground' },
  processing: { label: 'Processing', icon: Loader2, color: 'text-warning' },
  analyzing: { label: 'Analyzing', icon: Loader2, color: 'text-info' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-success' },
  failed: { label: 'Failed', icon: AlertCircle, color: 'text-destructive' },
};

export function DashboardHome() {
  const { profile } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [w, d] = await Promise.all([fetchWorkspaces(), fetchDocuments()]);
        setWorkspaces(w);
        setDocuments(d);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const recentDocs = documents.slice(0, 5);
  const completedCount = documents.filter((d) => d.analysis_status === 'completed').length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <h1 className="font-display text-3xl md:text-4xl">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your documents. Your intelligence. Let's turn them into decisions.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Workspaces', value: workspaces.length, icon: FolderOpen },
          { label: 'Documents', value: documents.length, icon: FileText },
          { label: 'Analyzed', value: completedCount, icon: CheckCircle2 },
          { label: 'In Progress', value: documents.length - completedCount, icon: Loader2 },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <Card className="glass p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 font-display text-2xl">{stat.value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/5">
                  <stat.icon size={18} className="text-primary" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="mb-10 flex flex-wrap gap-3">
        <Link to="/workspace/new">
          <Button className="gap-2">
            <Plus size={18} /> New Workspace
          </Button>
        </Link>
        <Link to="/demo">
          <Button variant="outline" className="gap-2 glass">
            <Sparkles size={18} /> Try Demo Document
          </Button>
        </Link>
      </div>

      {/* Recent documents */}
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">Recent Documents</h2>
          <Link to="/dashboard/documents" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        ) : recentDocs.length === 0 ? (
          <Card className="glass p-10 text-center">
            <FileText size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="font-display text-lg">No documents yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a workspace and upload your first document to begin.
            </p>
            <Link to="/workspace/new" className="mt-4 inline-block">
              <Button variant="outline" className="gap-2">
                Upload Document <ArrowRight size={16} />
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentDocs.map((doc, i) => {
              const st = statusConfig[doc.analysis_status];
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Link to={`/workspace/${doc.workspace_id}`}>
                    <Card className="glass flex items-center gap-4 p-4 transition-colors hover:border-primary/30">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                        <FileText size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 truncate">
                        <p className="truncate font-display text-base">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.file_type.toUpperCase()} · {doc.page_count ?? '?'} pages
                        </p>
                      </div>
                      <div className={`flex items-center gap-1.5 text-sm ${st.color}`}>
                        <st.icon size={16} className={st.icon === Loader2 ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">{st.label}</span>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
