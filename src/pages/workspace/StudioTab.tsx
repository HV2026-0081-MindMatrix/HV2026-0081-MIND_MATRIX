import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, BarChart3, Brain, BookOpen, Layers, FileText,
  Loader2, Image as ImageIcon, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { aiService } from '@/services/ai';
import { useArtifacts } from '@/hooks/use-document-data';
import { useToast } from '@/hooks/use-toast';
import type { Workspace, DocumentRecord, ArtifactType, GeneratedArtifact } from '@/types';

const artifactTypes: { type: ArtifactType; label: string; desc: string; icon: typeof Sparkles }[] = [
  { type: 'infographic', label: 'Infographic', desc: 'A visual summary of the document', icon: BarChart3 },
  { type: 'mind_map', label: 'Mind Map', desc: 'Concept hierarchy and relationships', icon: Brain },
  { type: 'study_guide', label: 'Study Guide', desc: 'Revision material from the document', icon: BookOpen },
  { type: 'flashcards', label: 'Flashcards', desc: 'Question and answer cards', icon: Layers },
  { type: 'concept_visual', label: 'Concept Visual', desc: 'An educational visual', icon: ImageIcon },
  { type: 'executive_brief', label: 'Executive Brief', desc: 'A concise professional document', icon: FileText },
];

interface Flashcard {
  question: string;
  answer: string;
}

/** Parse the JSON content of a flashcards artifact into cards. */
function parseFlashcards(content: string | null): Flashcard[] | null {
  if (!content) return null;
  try {
    // LLMs may wrap the JSON in markdown code fences — strip them.
    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.cards)) {
      const cards = parsed.cards
        .filter((c: Partial<Flashcard>) => typeof c?.question === 'string' && typeof c?.answer === 'string')
        .map((c: Flashcard) => ({ question: c.question, answer: c.answer }));
      if (cards.length > 0) return cards;
    }
    return null;
  } catch {
    return null;
  }
}

/** Fetch signed URLs for a primary path + possible _2/_3 variants. */
function useSignedUrls(storagePath: string | null): { urls: string[]; loading: boolean } {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setUrls([]);
    setLoading(true);
    if (!storagePath) { setLoading(false); return; }

    // Build candidate paths: primary + _2 + _3
    const base = storagePath.replace(/\.\w+$/, ''); // strip extension
    const ext = storagePath.split('.').pop() || 'png';
    const candidates = [storagePath, `${base}_2.${ext}`, `${base}_3.${ext}`];

    Promise.all(
      candidates.map((path) =>
        supabase.storage
          .from('generated-artifacts')
          .createSignedUrl(path, 3600)
          .then(({ data }) => data?.signedUrl ?? null)
          .catch(() => null)
      )
    ).then((results) => {
      if (!cancelled) {
        setUrls(results.filter(Boolean) as string[]);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [storagePath]);

  return { urls, loading };
}

/** Horizontal-scrollable gallery of artifact images. */
function ArtifactImageGallery({ storagePath }: { storagePath: string }) {
  const { urls, loading } = useSignedUrls(storagePath);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' });
  };

  if (loading) return <Skeleton className="aspect-video w-full" />;
  if (urls.length === 0) return null;

  const multiple = urls.length > 1;

  return (
    <div className="relative mt-3">
      {multiple && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute left-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2 bg-background/80 backdrop-blur"
          onClick={() => scroll('left')}
        >
          <ChevronLeft size={16} />
        </Button>
      )}
      <div
        ref={scrollRef}
        className={`flex gap-3 overflow-x-auto scrollbar-thin snap-x snap-mandatory ${multiple ? 'px-10' : ''}`}
      >
        {urls.map((url, i) => (
          <img
            key={url}
            src={url}
            alt={`Generated visual ${i + 1}`}
            className={`flex-shrink-0 snap-center rounded-lg border border-border object-cover ${multiple ? 'w-[260px] sm:w-[320px] aspect-video' : 'w-full aspect-video'}`}
          />
        ))}
      </div>
      {multiple && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2 bg-background/80 backdrop-blur"
          onClick={() => scroll('right')}
        >
          <ChevronRight size={16} />
        </Button>
      )}
      {multiple && (
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          {urls.length} images generated
        </p>
      )}
    </div>
  );
}

function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const [flipped, setFlipped] = useState<number | null>(null);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map((card, i) => {
        const isFlipped = flipped === i;
        return (
          <motion.button
            key={i}
            type="button"
            onClick={() => setFlipped(isFlipped ? null : i)}
            initial={false}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.4 }}
            className="relative min-h-36 w-full cursor-pointer rounded-xl border border-border bg-muted/20 p-4 text-left [transform-style:preserve-3d]"
          >
            <div className="flex h-full flex-col [backface-visibility:hidden]">
              <span className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-primary">Question {i + 1}</span>
              <p className="text-sm font-medium">{card.question}</p>
              {!isFlipped && <span className="mt-auto pt-3 text-[10px] text-muted-foreground">Click to reveal answer</span>}
            </div>
            <div
              className="absolute inset-0 flex flex-col rounded-xl border border-primary/30 bg-primary/5 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]"
            >
              <span className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-primary">Answer {i + 1}</span>
              <p className="text-sm">{card.answer}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

export function StudioTab() {
  const { doc } = useOutletContext<{ workspace: Workspace; doc: DocumentRecord }>();
  const { artifacts, loading, reload } = useArtifacts(doc.id);
  const { toast } = useToast();
  const [generating, setGenerating] = useState<ArtifactType | null>(null);
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);

  const generate = async (type: ArtifactType) => {
    setGenerating(type);
    try {
      const res = await aiService.generateArtifact(doc.id, type);
      toast({ title: 'Artifact generated', description: res.artifact.title });
      // Auto-generate 3 images immediately — no extra step needed
      try {
        const snippet = (res.artifact.content ?? res.artifact.title).slice(0, 1200);
        const imgRes = await aiService.generateImage(doc.id, res.artifact.id, `${res.artifact.title}\n\n${snippet}`);
        const count = Array.isArray(imgRes.urls) ? imgRes.urls.length : 1;
        toast({ title: `${count} image${count > 1 ? 's' : ''} generated`, description: 'Premium visuals ready.' });
      } catch (imgErr) {
        // Image generation failed but artifact is still useful — don't block
        console.error('Auto image generation failed:', imgErr);
      }
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      toast({ title: 'Generation failed', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  const generateImage = async (art: GeneratedArtifact) => {
    setGeneratingImageFor(art.id);
    try {
      // Build a prompt from the artifact's content so the image reflects the actual material.
      const snippet = (art.content ?? art.title).slice(0, 1200);
      const res = await aiService.generateImage(doc.id, art.id, `${art.title}\n\n${snippet}`);
      const count = Array.isArray(res.urls) ? res.urls.length : 1;
      toast({ title: `${count} image${count > 1 ? 's' : ''} generated`, description: 'Premium visuals ready.' });
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image generation failed';
      toast({ title: 'Image generation failed', description: msg, variant: 'destructive' });
    } finally {
      setGeneratingImageFor(null);
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
              {artifacts.map((art, i) => {
                const cards = art.artifact_type === 'flashcards' ? parseFlashcards(art.content) : null;
                return (
                  <motion.div key={art.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="glass p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-primary/30">{art.artifact_type.replace('_', ' ')}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(art.created_at).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-display text-base">{art.title}</h4>

                      {/* Image gallery — shows up to 3 generated visuals */}
                      {art.storage_path && (
                        <ArtifactImageGallery storagePath={art.storage_path} />
                      )}

                      {cards ? (
                        <div className="mt-3">
                          <FlashcardDeck cards={cards} />
                        </div>
                      ) : (
                        art.content && (
                          <div className="mt-3 max-h-48 overflow-y-auto scrollbar-thin rounded-lg border border-border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                            {art.content}
                          </div>
                        )
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={generatingImageFor === art.id}
                          onClick={() => generateImage(art)}
                        >
                          {generatingImageFor === art.id ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                          {generatingImageFor === art.id ? 'Generating...' : art.storage_path ? 'Regenerate Images' : 'Generate Images'}
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
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
