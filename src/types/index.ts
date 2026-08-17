export type ProcessingStatus = 'uploaded' | 'processing' | 'analyzing' | 'completed' | 'failed';

export type EligibilityResult = 'likely_eligible' | 'needs_more_info' | 'likely_not_eligible';

export type ActionItemStatus = 'pending' | 'in_progress' | 'completed';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type ArtifactType = 'infographic' | 'mind_map' | 'study_guide' | 'flashcards' | 'concept_visual' | 'executive_brief';

export type EntityType = 'person' | 'organization' | 'location' | 'date' | 'amount' | 'percentage' | 'requirement' | 'rule' | 'reference' | 'contact';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string | null;
  page_count: number | null;
  processing_status: ProcessingStatus;
  analysis_status: ProcessingStatus;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number: number | null;
  embedding: number[] | null;
}

export interface DocumentEntity {
  id: string;
  document_id: string;
  entity_type: EntityType;
  value: string;
  context: string | null;
  page_number: number | null;
}

export interface DocumentDeadline {
  id: string;
  document_id: string;
  event: string;
  date: string | null;
  importance: Priority;
  description: string | null;
  source_page: number | null;
}

export interface DocumentRequirement {
  id: string;
  document_id: string;
  description: string;
  mandatory: boolean;
  source_page: number | null;
  source_text: string | null;
}

export interface DocumentRule {
  id: string;
  document_id: string;
  rule: string;
  description: string | null;
  source_page: number | null;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  workspace_id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

export interface Citation {
  page: number | null;
  text: string;
}

export interface EligibilityCheck {
  id: string;
  document_id: string;
  user_id: string;
  status: EligibilityResult;
  summary: string | null;
  matched_conditions: MatchedCondition[] | null;
  unmatched_conditions: MatchedCondition[] | null;
  missing_documents: string[] | null;
  created_at: string;
}

export interface MatchedCondition {
  criterion: string;
  user_value: string;
  source_page: number | null;
  met: boolean;
}

export interface ActionItem {
  id: string;
  document_id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  deadline: string | null;
  source: string | null;
  status: ActionItemStatus;
  created_at: string;
}

export interface GeneratedArtifact {
  id: string;
  document_id: string;
  user_id: string;
  artifact_type: ArtifactType;
  title: string;
  content: string | null;
  storage_path: string | null;
  created_at: string;
}

export interface AnalysisRun {
  id: string;
  document_id: string;
  summary: string | null;
  executive_summary: string | null;
  key_points: string[] | null;
  simple_explanation: string | null;
  topics: string[] | null;
  potential_risks: string[] | null;
  created_at: string;
}

export interface DocumentSummary {
  oneLine: string;
  executive: string;
  keyPoints: string[];
  simple: string;
  sectionSummaries: { heading: string; summary: string }[];
}
