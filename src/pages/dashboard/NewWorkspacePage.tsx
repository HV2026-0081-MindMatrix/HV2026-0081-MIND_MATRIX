import { useState, useCallback, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Loader2, X, ArrowRight, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { createWorkspace } from '@/services/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

const ACCEPTED = ['.pdf', '.txt', '.docx', 'application/pdf', 'text/plain'];
const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

export function NewWorkspacePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const validateFile = useCallback((f: File): string | null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    const okType = ACCEPTED.some((a) => f.type === a || ext === a);
    if (!okType) return 'Only PDF, TXT, and DOCX files are supported.';
    if (f.size > MAX_SIZE) return 'File too large. Maximum 25 MB.';
    return null;
  }, []);

  const handleFile = (f: File) => {
    const err = validateFile(f);
    if (err) {
      toast({ title: 'Invalid file', description: err, variant: 'destructive' });
      return;
    }
    setFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Name required', description: 'Give your workspace a name.', variant: 'destructive' });
      return;
    }
    if (!file) {
      toast({ title: 'Document required', description: 'Upload a document to analyze.', variant: 'destructive' });
      return;
    }
    if (!user) return;

    setUploading(true);
    try {
      // 1. Create workspace
      const workspace = await createWorkspace(name.trim(), description.trim() || undefined);

      // 2. Create document record
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const { data: doc, error: docErr } = await supabase
        .from('documents')
        .insert({
          workspace_id: workspace.id,
          file_name: file.name,
          file_type: ext,
          file_size: file.size,
          processing_status: 'uploaded',
          analysis_status: 'uploaded',
        })
        .select()
        .single();
      if (docErr) throw docErr;

      // 3. Upload to storage
      const storagePath = `${user.id}/${doc.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(storagePath, file);
      // Simulate progress since supabase-js doesn't expose onUploadProgress in FileOptions
      let pct = 0;
      const progressTimer = setInterval(() => {
        pct = Math.min(pct + 15, 90);
        setProgress(pct);
      }, 200);
      clearInterval(progressTimer);
      setProgress(100);
      if (uploadErr) throw uploadErr;

      // 4. Update storage path + start processing
      await supabase
        .from('documents')
        .update({ storage_path: storagePath, processing_status: 'processing' })
        .eq('id', doc.id);

      // 5. Navigate to processing screen
      navigate(`/workspace/${workspace.id}/document/${doc.id}/processing`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:px-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl">New Workspace</h1>
        <p className="mt-2 text-muted-foreground">Create a workspace and upload a document to analyze.</p>
      </motion.div>

      <div className="space-y-6">
        {/* Workspace details */}
        <Card className="glass p-6">
          <div className="mb-4 flex items-center gap-2">
            <FolderOpen size={20} className="text-primary" />
            <h2 className="font-display text-lg">Workspace Details</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                placeholder="e.g. Scholarship Application 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea
                id="desc"
                placeholder="What is this workspace for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* Upload zone */}
        <Card className="glass p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            <h2 className="font-display text-lg">Upload Document</h2>
          </div>

          <AnimatePresence mode="wait">
            {file ? (
              <motion.div
                key="file-info"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                  <FileText size={22} className="text-primary" />
                </div>
                <div className="flex-1 truncate">
                  <p className="truncate font-display text-base">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB · {file.name.split('.').pop()?.toUpperCase()}
                  </p>
                </div>
                {!uploading && (
                  <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                    <X size={18} />
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                    dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <UploadCloud size={36} className="mb-3 text-muted-foreground" />
                  <p className="font-display text-base">Drag and drop your document here</p>
                  <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
                  <p className="mt-3 text-xs text-muted-foreground">PDF, TXT, DOCX · Max 25 MB</p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.docx,application/pdf,text/plain"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" /> Uploading...
                </span>
                <span className="text-primary">{progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} size="lg" className="gap-2" disabled={uploading}>
            {uploading ? (
              <><Loader2 size={18} className="animate-spin" /> Uploading...</>
            ) : (
              <>Analyze Document <ArrowRight size={18} /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
