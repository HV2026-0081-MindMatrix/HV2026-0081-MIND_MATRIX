import { useMemo, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, FileText, Send, Loader2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDocumentData } from '@/hooks/use-document-data';
import { aiService } from '@/services/ai';
import type { Workspace, DocumentRecord, Citation } from '@/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[] | null;
}

export function OverviewTab() {
  const { doc } = useOutletContext<{ workspace: Workspace; doc: DocumentRecord }>();
  const { analysisRun, loading } = useDocumentData(doc.id);

  const keyPoints = useMemo(() => {
    if (analysisRun?.key_points) return analysisRun.key_points as string[];
    return [];
  }, [analysisRun]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  const handleAsk = async (e: FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || asking) return;

    setMessages((prev) => [...prev, { role: 'user', content: question, citations: null }]);
    setInput('');
    setAsking(true);

    try {
      const res = await aiService.askDocument(doc.id, question, conversationId);
      setConversationId(res.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.answer, citations: res.citations },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Something went wrong. Try again.',
          citations: null,
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!analysisRun) {
    return (
      <Card className="glass p-10 text-center">
        <FileText size={32} className="mx-auto mb-3 text-muted-foreground" />
        <p className="font-display text-lg">No analysis data yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The AI analysis may still be running, or AI keys are not configured.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="font-display text-lg">AI Summary</h2>
          </div>
          {analysisRun.executive_summary && (
            <p className="text-sm leading-relaxed text-foreground/90">
              {analysisRun.executive_summary}
            </p>
          )}
          {analysisRun.simple_explanation && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">In Simple Words</p>
              <p className="text-sm text-muted-foreground">{analysisRun.simple_explanation}</p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Key Points */}
      {keyPoints.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="glass p-6">
            <h2 className="mb-4 font-display text-lg">Key Points</h2>
            <ul className="space-y-2">
              {keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm">{point}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}

      {/* Built-in chat */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <h2 className="font-display text-lg">Ask About This Document</h2>
          </div>

          {messages.length > 0 && (
            <div className="mb-4 max-h-80 space-y-3 overflow-y-auto scrollbar-thin pr-1">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-muted/30'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.citations && msg.citations.length > 0 && (
                      <p className="mt-2 text-xs opacity-60">
                        Source: page{' '}
                        {msg.citations.map((c) => c.page).filter((p) => p != null).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {asking && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" /> Thinking…
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleAsk} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about this document — e.g. What's the deadline?"
              className="min-w-0 flex-1"
            />
            <Button type="submit" size="icon" disabled={asking || !input.trim()}>
              {asking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Answers come straight from your document with citations.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
