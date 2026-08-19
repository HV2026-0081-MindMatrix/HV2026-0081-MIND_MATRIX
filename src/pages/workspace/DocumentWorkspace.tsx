import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, ListTodo, Sparkles, ChevronLeft, FileText,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { fetchWorkspace, fetchDocument } from '@/services/database';
import type { Workspace, DocumentRecord, ProcessingStatus } from '@/types';

const tabs = [
  { key: '', label: 'Overview', icon: LayoutDashboard },
  { key: 'ask', label: 'Ask Document', icon: MessageSquare },
  { key: 'action-plan', label: 'Action Plan', icon: ListTodo },
  { key: 'studio', label: 'AI Studio', icon: Sparkles },
];

export function DocumentWorkspace() {
  const { workspaceId, documentId } = useParams<{ workspaceId: string; documentId: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || !documentId) return;
    (async () => {
      const [w, d] = await Promise.all([
        fetchWorkspace(workspaceId),
        fetchDocument(documentId),
      ]);
      setWorkspace(w);
      setDoc(d);
      setLoading(false);
    })();
  }, [workspaceId, documentId]);

  const statusLabel = useMemo(() => {
    if (!doc) return '';
    const map: Record<ProcessingStatus, string> = {
      uploaded: 'Uploaded',
      processing: 'Processing',
      analyzing: 'Analyzing',
      completed: 'Analysis Complete',
      failed: 'Failed',
    };
    return map[doc.analysis_status];
  }, [doc]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!workspace || !doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Workspace or document not found.</p>
        <Link to="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>
    );
  }

  const base = `/workspace/${workspaceId}/document/${documentId}`;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-4 py-4 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">
              <ChevronLeft size={16} className="inline" /> Dashboard
            </Link>
            <span>/</span>
            <Link to={`/workspace/${workspaceId}`} className="hover:text-foreground">{workspace.name}</Link>
          </div>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                <FileText size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl md:text-2xl">{doc.file_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {doc.file_type.toUpperCase()} · {doc.page_count ?? '?'} pages · {statusLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-4 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex gap-1 overflow-x-auto scrollbar-thin">
            {tabs.map((tab) => {
              const path = tab.key ? `${base}/${tab.key}` : base;
              const active = location.pathname === path;
              return (
                <Link
                  key={tab.key}
                  to={path}
                  className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm transition-colors ${
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon size={16} />
                  <span className="font-display tracking-wide">{tab.label}</span>
                  {active && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-1 flex-col overflow-y-auto scrollbar-thin mx-auto max-w-7xl px-4 py-6 md:px-6"
        >
          <Outlet context={{ workspace, doc }} />
        </motion.div>
      </div>
    </div>
  );
}
