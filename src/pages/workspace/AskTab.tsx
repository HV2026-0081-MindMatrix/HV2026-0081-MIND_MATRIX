import { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, MessageSquare, BookOpen, User as UserIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { aiService } from '@/services/ai';
import { supabase } from '@/lib/supabase';
import { useChatData } from '@/hooks/use-document-data';
import type { Workspace, DocumentRecord, ChatMessage, Citation } from '@/types';

const suggestions = [
  'What is this document about?',
  'Who is eligible?',
  'What documents are required?',
  'What is the deadline?',
  'Summarize this in simple English.',
];

export function AskTab() {
  const { doc } = useOutletContext<{ workspace: Workspace; doc: DocumentRecord }>();
  const { conversations, messages, setMessages, loadMessages, loadConversations } = useChatData(doc.id);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversations.length > 0 && !conversationId) {
      setConversationId(conversations[0].id);
      loadMessages(conversations[0].id);
    }
  }, [conversations, conversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAsk = async (question?: string) => {
    const q = (question ?? input).trim();
    if (!q || loading) return;

    // Optimistic user message
    const optimistic: ChatMessage = {
      id: 'temp-' + Date.now(),
      conversation_id: conversationId ?? '',
      role: 'user',
      content: q,
      citations: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiService.askDocument(doc.id, q, conversationId ?? undefined);
      if (!conversationId) setConversationId(res.conversationId);

      const assistantMsg: ChatMessage = {
        id: res.messageId,
        conversation_id: res.conversationId,
        role: 'assistant',
        content: res.answer,
        citations: res.citations,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      loadConversations();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get answer';
      const errMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        conversation_id: conversationId ?? '',
        role: 'assistant',
        content: `I couldn't process that request. ${msg}`,
        citations: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageSquare size={36} className="mb-4 text-muted-foreground" />
            <p className="font-display text-lg">Ask anything about this document</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Answers are grounded in the document with source citations.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="glass"
                  onClick={() => handleAsk(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                    <BookOpen size={16} className="text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                  <div className={`mb-1 flex items-center gap-2 text-xs text-muted-foreground ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'user' ? (
                      <><span>You</span><UserIcon size={12} /></>
                    ) : (
                      <><span>AI</span><span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">DOCUMENT SOURCE</span></>
                    )}
                  </div>
                  <div className={`rounded-2xl p-4 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'glass'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.citations.map((c: Citation, i: number) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs">
                          <FileText size={12} className="text-primary" />
                          <span className="text-muted-foreground">Source:</span>
                          {c.page && <span className="text-primary">Page {c.page}</span>}
                          <span className="truncate text-foreground/70">{c.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                    <UserIcon size={16} />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border pt-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Ask a question about this document..."
            disabled={loading}
          />
          <Button onClick={() => handleAsk()} disabled={loading || !input.trim()} size="icon" className="h-10 w-10">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// silence unused import warning in some builds
void supabase;
