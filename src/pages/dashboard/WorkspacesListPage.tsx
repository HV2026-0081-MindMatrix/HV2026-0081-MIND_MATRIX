import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderOpen, Plus, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWorkspaces, fetchDocuments } from '@/services/database';
import type { Workspace, DocumentRecord } from '@/types';

export function WorkspacesListPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [w, d] = await Promise.all([fetchWorkspaces(), fetchDocuments()]);
      setWorkspaces(w);
      const counts: Record<string, number> = {};
      d.forEach((doc) => { counts[doc.workspace_id] = (counts[doc.workspace_id] ?? 0) + 1; });
      setDocCounts(counts);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Workspaces</h1>
          <p className="mt-2 text-muted-foreground">Organize your documents into workspaces.</p>
        </div>
        <Link to="/workspace/new">
          <Button className="gap-2"><Plus size={18} /> New Workspace</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />)}</div>
      ) : workspaces.length === 0 ? (
        <Card className="glass p-10 text-center">
          <FolderOpen size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-display text-lg">No workspaces yet</p>
          <Link to="/workspace/new" className="mt-4 inline-block">
            <Button variant="outline" className="gap-2">Create your first workspace</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((w, i) => (
            <motion.div key={w.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Link to={`/workspace/${w.id}`}>
                <Card className="glass group h-full p-5 transition-colors hover:border-primary/30">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/5">
                      <FolderOpen size={20} className="text-primary" />
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="mt-3 font-display text-lg">{w.name}</h3>
                  {w.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{w.description}</p>}
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText size={14} /> {docCounts[w.id] ?? 0} documents
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
