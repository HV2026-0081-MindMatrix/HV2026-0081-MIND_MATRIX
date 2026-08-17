import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  DocumentEntity, DocumentDeadline, DocumentRequirement,
  DocumentRule, AnalysisRun, ChatConversation, ChatMessage,
  ActionItem, GeneratedArtifact, EligibilityCheck,
} from '@/types';

export function useDocumentData(documentId: string | undefined) {
  const [entities, setEntities] = useState<DocumentEntity[]>([]);
  const [deadlines, setDeadlines] = useState<DocumentDeadline[]>([]);
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [rules, setRules] = useState<DocumentRule[]>([]);
  const [analysisRun, setAnalysisRun] = useState<AnalysisRun | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const [ent, dln, req, rul, run] = await Promise.all([
        supabase.from('document_entities').select('*').eq('document_id', documentId),
        supabase.from('document_deadlines').select('*').eq('document_id', documentId).order('date', { ascending: true }),
        supabase.from('document_requirements').select('*').eq('document_id', documentId),
        supabase.from('document_rules').select('*').eq('document_id', documentId),
        supabase.from('analysis_runs').select('*').eq('document_id', documentId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      setEntities(ent.data as DocumentEntity[] ?? []);
      setDeadlines(dln.data as DocumentDeadline[] ?? []);
      setRequirements(req.data as DocumentRequirement[] ?? []);
      setRules(rul.data as DocumentRule[] ?? []);
      setAnalysisRun(run.data as AnalysisRun | null);
    } catch (err) {
      console.error('Document data load error:', err);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  return { entities, deadlines, requirements, rules, analysisRun, loading, reload: load };
}

export function useChatData(documentId: string | undefined) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const loadConversations = useCallback(async () => {
    if (!documentId) return;
    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('document_id', documentId)
      .order('updated_at', { ascending: false });
    setConversations(data as ChatConversation[] ?? []);
  }, [documentId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages(data as ChatMessage[] ?? []);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return { conversations, messages, setMessages, loadMessages, loadConversations };
}

export function useActionItems(documentId: string | undefined) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!documentId) return;
    const { data } = await supabase
      .from('action_items')
      .select('*')
      .eq('document_id', documentId)
      .order('priority', { ascending: true });
    setItems(data as ActionItem[] ?? []);
    setLoading(false);
  }, [documentId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: ActionItem['status']) => {
    await supabase.from('action_items').update({ status }).eq('id', id);
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
  };

  return { items, loading, updateStatus, reload: load };
}

export function useArtifacts(documentId: string | undefined) {
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!documentId) return;
    const { data } = await supabase
      .from('generated_artifacts')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });
    setArtifacts(data as GeneratedArtifact[] ?? []);
    setLoading(false);
  }, [documentId]);

  useEffect(() => { load(); }, [load]);

  return { artifacts, loading, reload: load };
}

export function useEligibilityChecks(documentId: string | undefined) {
  const [checks, setChecks] = useState<EligibilityCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!documentId) return;
    const { data } = await supabase
      .from('eligibility_checks')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });
    setChecks(data as EligibilityCheck[] ?? []);
    setLoading(false);
  }, [documentId]);

  useEffect(() => { load(); }, [load]);

  return { checks, loading, reload: load };
}
