import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, BarChart3, Brain, BookOpen, Layers, FileText,
  Loader2, Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { aiService } from '@/services/ai';
import { useArtifacts } from '@/hooks/use-document-data';
import { useToast } from '@/hooks/use-toast';
import type { Workspace, DocumentRecord, ArtifactType } from '@/types';

const artifactTypes: { type: ArtifactType; label: string; desc: string; icon: typeof Sparkles }[] = [
  { type: 'infographic', label: 'Infographic', desc: 'A visual summary of the document', icon: BarChart3 },
  { type: 'mind_map', label: 'Mind Map', desc: 'Concept hierarchy and relationships', icon: Brain },
  { type: 'study_guide', label: 'Study Guide', desc: 'Revision material from the document', icon: BookOpen },
  { type: 'flashcards', label: 'Flashcards', desc: 'Question and answer cards', icon: Layers },
  { type: 'concept_visual', label: 'Concept Visual', desc: 'An educational visual', icon: ImageIcon },
  { type: 'executive_brief', label: 'Executive Brief', desc: 'A concise professional document', icon: FileText },
];

export function StudioTab() {
  const { doc } = useOutletContext<{ workspace: Workspace; doc: DocumentRecord }>();
  const { artifacts, loading, reload } = useArtifacts(doc.id);
  const { toast } = useToast();
  const [generating, setGenerating] = useState<ArtifactType | null>(null);

  const generate = async (type: ArtifactType) => {
    setGenerating(type);
    try {
      const res = await aiService.generateArtifact(doc.id, type);
      toast({ title: 'Artifact generated', description: res.artifact.title });
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      toast({ title: 'Generation failed', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  const generateImage = async (artifactId: string, prompt: string) => {
    try {
      const res = await aiService.generateImage(doc.id, artifactId, prompt);
      toast({ title: 'Image generated', description: 'Visual artifact ready.' });
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image generation failed';
      toast({ title: 'Image generation failed', description: msg, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl">AI Studio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate visual learning artifacts from your document. All artifacts remain grounded in the document content.
        </p>
      </div>

      {/* Generate cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {artifactTypes.map((a, i) => (
          <motion.div key={a.type} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass group p-5 transition-colors hover:border-primary/30">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 transition-transform group-hover:scale-110">
                <a.icon size={20} className="text-primary" />
              </div>
              <h3 className="font-display text-base">{a.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
              <Button
                onClick={() => generate(a.type)}
                size="sm"
                className="mt-4 w-full gap-2"
                disabled={generating === a.type}
              >
                {generating === a.type ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {generating === a.type ? 'Generating...' : `Generate ${a.label}`}
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Existing artifacts */}
      {artifacts.length > 0 && (
        <div>
          <h3 className="mb-4 font-display text-lg">Generated Artifacts</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <AnimatePresence>
              {artifacts.map((art, i) => (
                <motion.div key={art.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="glass p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-primary/30">{art.artifact_type.replace('_', ' ')}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(art.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-display text-base">{art.title}</h4>
                    {art.content && (
                      <div className="mt-3 max-h-48 overflow-y-auto scrollbar-thin rounded-lg border border-border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                        {art.content}
                      </div>
                    )}
                    {art.storage_path && (
                      <div className="mt-3 flex items-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => generateImage(art.id, art.title)}>
                          <ImageIcon size={14} /> Regenerate Image
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {artifacts.length === 0 && !loading && (
        <p className="text-center text-sm text-muted-foreground">No artifacts generated yet. Pick one above to start.</p>
      )}
    </div>
  );
}
