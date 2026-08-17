import { supabase } from '@/lib/supabase';
import type { Profile, Workspace, DocumentRecord } from '@/types';

export async function ensureProfile(userId: string, fullName?: string): Promise<Profile | null> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return existing as Profile;

  const { data, error } = await supabase
    .from('profiles')
    .insert({ user_id: userId, full_name: fullName ?? null })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Failed to create profile:', error.message);
    return null;
  }
  return data as Profile;
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as Workspace[];
}

export async function createWorkspace(name: string, description?: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .insert({ name, description: description ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Workspace;
}

export async function fetchWorkspace(id: string): Promise<Workspace | null> {
  const { data, error } = await supabase.from('workspaces').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Workspace | null;
}

export async function fetchDocuments(workspaceId?: string): Promise<DocumentRecord[]> {
  let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
  if (workspaceId) query = query.eq('workspace_id', workspaceId);
  const { data, error } = await query;
  if (error) throw error;
  return data as DocumentRecord[];
}

export async function fetchDocument(id: string): Promise<DocumentRecord | null> {
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as DocumentRecord | null;
}

export async function updateDocumentStatus(
  id: string,
  processing: DocumentRecord['processing_status'],
  analysis?: DocumentRecord['analysis_status']
): Promise<void> {
  const update: Record<string, string> = { processing_status: processing };
  if (analysis) update.analysis_status = analysis;
  const { error } = await supabase.from('documents').update(update).eq('id', id);
  if (error) throw error;
}
