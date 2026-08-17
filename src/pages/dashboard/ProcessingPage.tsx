import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSearch, ScanLine, Layers, FileText, CalendarClock,
  ListChecks, GitBranch, Brain, CheckCircle2, Loader2, AlertCircle,
} from 'lucide-react';
import { NeuralShader } from '@/components/NeuralShader';
import { Button } from '@/components/ui/button';
import { fetchDocument, updateDocumentStatus } from '@/services/database';
import { aiService } from '@/services/ai';
import type { DocumentRecord } from '@/types';
import { useToast } from '@/hooks/use-toast';

const stages = [
  { key: 'upload', label: 'Uploading', icon: Upload },
  { key: 'read', label: 'Reading document', icon: FileSearch },
  { key: 'pages', label: 'Detecting pages', icon: ScanLine },
  { key: 'sections', label: 'Detecting sections', icon: Layers },
  { key: 'extract', label: 'Extracting information', icon: FileText },
  { key: 'deadlines', label: 'Finding deadlines', icon: CalendarClock },
  { key: 'requirements', label: 'Detecting requirements', icon: ListChecks },
  { key: 'index', label: 'Building semantic index', icon: GitBranch },
  { key: 'workspace', label: 'Preparing AI workspace', icon: Brain },
];

export function ProcessingPage() {
  const { workspaceId, documentId } = useParams<{ workspaceId: string; documentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStage, setCurrentStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocumentRecord | null>(null);

  useEffect(() => {
    if (!documentId) return;
    (async () => {
      const d = await fetchDocument(documentId);
      if (!d) {
        setError('Document not found');
        return;
      }
      setDoc(d);
      if (d.analysis_status === 'completed') {
        navigate(`/workspace/${workspaceId}/document/${documentId}`, { replace: true });
        return;
      }

      // Animate through stages while the edge function runs
      let stage = 0;
      const stageTimer = setInterval(() => {
        stage = Math.min(stage + 1, stages.length - 2);
        setCurrentStage(stage);
      }, 1200);

      try {
        const result = await aiService.analyzeDocument(documentId);
        clearInterval(stageTimer);
        setCurrentStage(stages.length - 1);
        await updateDocumentStatus(documentId, 'completed', 'completed');
        setTimeout(() => {
          navigate(`/workspace/${workspaceId}/document/${documentId}`, { replace: true });
        }, 800);
      } catch (err) {
        clearInterval(stageTimer);
        const msg = err instanceof Error ? err.message : 'Analysis failed';
        // If the edge function isn't configured, we still let the user into the workspace
        // with a demo-style experience — but surface the error.
        if (msg.includes('not configured') || msg.includes('Failed to fetch') || msg.includes('404')) {
          await updateDocumentStatus(documentId, 'completed', 'completed');
          toast({
            title: 'AI analysis unavailable',
            description: 'AI keys are not configured. Showing demo intelligence data.',
          });
          setTimeout(() => {
            navigate(`/workspace/${workspaceId}/document/${documentId}`, { replace: true });
          }, 800);
        } else {
          setError(msg);
          await updateDocumentStatus(documentId, 'failed', 'failed');
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      <NeuralShader className="fixed inset-0 -z-10" />
      <div className="absolute inset-0 -z-5 bg-background/50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl md:text-3xl">{doc?.file_name ?? 'Processing...'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI is reading and understanding your document
          </p>
        </div>

        {error ? (
          <div className="glass-strong rounded-2xl p-8 text-center">
            <AlertCircle size={36} className="mx-auto mb-4 text-destructive" />
            <p className="font-display text-lg">Analysis Failed</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button
              className="mt-6"
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        ) : (
          <div className="glass-strong rounded-2xl p-6 md:p-8">
            <div className="space-y-1">
              {stages.map((stage, i) => {
                const done = i < currentStage;
                const active = i === currentStage;
                const pending = i > currentStage;
                return (
                  <motion.div
                    key={stage.key}
                    initial={false}
                    animate={{ opacity: pending ? 0.4 : 1 }}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                      active ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                      {done ? (
                        <CheckCircle2 size={20} className="text-success" />
                      ) : active ? (
                        <Loader2 size={20} className="animate-spin text-primary" />
                      ) : (
                        <stage.icon size={18} className="text-muted-foreground" />
                      )}
                    </div>
                    <span className={`font-display text-sm ${active ? 'text-primary' : ''}`}>
                      {stage.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-6">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent"
                  animate={{ width: `${((currentStage + 1) / stages.length) * 100}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
