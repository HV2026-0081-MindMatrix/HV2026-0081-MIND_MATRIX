import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Plus, ChevronRight, Clock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWorkspace, fetchDocuments } from '@/services/database';
import type { Workspace, DocumentRecord, ProcessingStatus } from '@/types';

const statusIcon: Record<ProcessingStatus, typeof Clock> = {
  uploaded: Clock,
  processing: Loader2,
  analyzing: Loader2,
  completed: CheckCircle2,
  failed: AlertCircle,
};
const statusColor: Record<ProcessingStatus, string> = {
  uploaded: 'text-muted-foreground',
  processing: 'text-warning',
  analyzing: 'text-info',
  completed: 'text-success',
  failed: 'text-destructive',
};

export function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const [w, d] = await Promise.all([fetchWorkspace(workspaceId), fetchDocuments(workspaceId)]);
      setWorkspace(w);
      setDocuments(d);
      setLoading(false);
    })();
  }, [workspaceId]);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  if (!workspace) return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Workspace not found.</p>
      <Link to="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl">{workspace.name}</h1>
        {workspace.description && <p className="mt-2 text-muted-foreground">{workspace.description}</p>}
      </motion.div>

      <div className="mb-6 flex justify-end">
        <Link to="/workspace/new">
          <Button className="gap-2"><Plus size={18} /> Upload Document</Button>
        </Link>
      </div>

      {documents.length === 0 ? (
        <Card className="glass p-10 text-center">
          <FileText size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-display text-lg">No documents in this workspace</p>
          <Link to="/workspace/new" className="mt-4 inline-block">
            <Button variant="outline" className="gap-2">Upload a document</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc, i) => {
            const Icon = statusIcon[doc.analysis_status];
            return (
              <motion.div key={doc.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/workspace/${workspaceId}/document/${doc.id}`}>
                  <Card className="glass flex items-center gap-4 p-4 transition-colors hover:border-primary/30">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                      <FileText size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 truncate">
                      <p className="truncate font-display text-base">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">{doc.file_type.toUpperCase()} · {doc.page_count ?? '?'} pages</p>
                    </div>
                    <Icon size={16} className={`${statusColor[doc.analysis_status]} ${doc.analysis_status === 'processing' || doc.analysis_status === 'analyzing' ? 'animate-spin' : ''}`} />
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
