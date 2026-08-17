import { supabase } from '@/lib/supabase';
import type {
  AnalysisRun,
  ChatMessage,
  Citation,
  DocumentEntity,
  DocumentDeadline,
  DocumentRequirement,
  DocumentRule,
  DocumentSummary,
  ActionItem,
  EligibilityCheck,
  MatchedCondition,
  GeneratedArtifact,
  ArtifactType,
} from '@/types';

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('You must be signed in to use AI features.');

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) message = err.error;
    } catch {
      // keep default
    }
    throw new Error(message);
  }

  const json = await res.json();
  if (json?.error) throw new Error(json.error);
  return json as T;
}

export interface AnalysisResult {
  summary: DocumentSummary;
  entities: DocumentEntity[];
  deadlines: DocumentDeadline[];
  requirements: DocumentRequirement[];
  rules: DocumentRule[];
  keyPoints: string[];
  topics: string[];
}

export const aiService = {
  analyzeDocument(documentId: string) {
    return invoke<{ run: AnalysisRun; result: AnalysisResult }>('analyze-document', { documentId });
  },

  extractInsights(documentId: string) {
    return invoke<{ entities: DocumentEntity[]; deadlines: DocumentDeadline[]; requirements: DocumentRequirement[]; rules: DocumentRule[] }>(
      'extract-insights',
      { documentId }
    );
  },

  askDocument(documentId: string, question: string, conversationId?: string) {
    return invoke<{ answer: string; citations: Citation[]; messageId: string; conversationId: string }>(
      'ask-document',
      { documentId, question, conversationId }
    );
  },

  checkEligibility(documentId: string, answers: Record<string, string>) {
    return invoke<{
      status: EligibilityCheck['status'];
      summary: string;
      matched: MatchedCondition[];
      unmatched: MatchedCondition[];
      missingDocuments: string[];
    }>('check-eligibility', { documentId, answers });
  },

  generateActionPlan(documentId: string) {
    return invoke<{ items: ActionItem[] }>('generate-action-plan', { documentId });
  },

  generateArtifact(documentId: string, type: ArtifactType) {
    return invoke<{ artifact: GeneratedArtifact }>('generate-artifact', { documentId, type });
  },

  generateImage(documentId: string, artifactId: string, prompt: string) {
    return invoke<{ url: string }>('generate-image', { documentId, artifactId, prompt });
  },
};

export type { ChatMessage };
