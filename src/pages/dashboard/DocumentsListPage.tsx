import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Clock, CheckCircle2, AlertCircle, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchDocuments } from '@/services/database';
import type { DocumentRecord, ProcessingStatus } from '@/types';

const statusConfig: Record<ProcessingStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  uploaded: { label: 'Uploaded', icon: Clock, color: 'text-muted-foreground' },
  processing: { label: 'Processing', icon: Loader2, color: 'text-warning' },
  analyzing: { label: 'Analyzing', icon: Loader2, color: 'text-info' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-success' },
  failed: { label: 'Failed', icon: AlertCircle, color: 'text-destructive' },
};

export function DocumentsListPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments().then((d) => { setDocuments(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">My Documents</h1>
          <p className="mt-2 text-muted-foreground">All your uploaded documents across workspaces.</p>
        </div>
        <Link to="/workspace/new">
          <Button className="gap-2"><Plus size={18} /> New</Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />)}</div>
      ) : documents.length === 0 ? (
        <Card className="glass p-10 text-center">
          <FileText size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-display text-lg">No documents yet</p>
          <Link to="/workspace/new" className="mt-4 inline-block">
            <Button variant="outline" className="gap-2">Upload your first document</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc, i) => {
            const st = statusConfig[doc.analysis_status];
            return (
              <motion.div key={doc.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/workspace/${doc.workspace_id}/document/${doc.id}`}>
                  <Card className="glass flex items-center gap-4 p-4 transition-colors hover:border-primary/30">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                      <FileText size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 truncate">
                      <p className="truncate font-display text-base">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">{doc.file_type.toUpperCase()} · {doc.page_count ?? '?'} pages · {new Date(doc.created_at).toLocaleDateString()}</p>
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
  );
}
