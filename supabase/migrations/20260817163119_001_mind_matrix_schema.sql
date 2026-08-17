/*
# MIND MATRIX — Core Schema & RLS

## Summary
Creates the full multi-tenant schema for the MIND MATRIX AI document intelligence
workspace. Every user-owned table is isolated via Row Level Security using
auth.uid() ownership checks. Owner columns default to auth.uid() so inserts
that omit user_id still satisfy WITH CHECK policies.

## Tables
1. profiles — user profile linked to auth.users
2. workspaces — containers for documents
3. documents — uploaded documents
4. document_chunks — text chunks with pgvector embeddings for RAG
5. document_entities — extracted entities (people, orgs, dates, amounts, etc.)
6. document_deadlines — extracted deadlines with importance
7. document_requirements — mandatory/optional requirements
8. document_rules — rules and eligibility criteria
9. chat_conversations — Q&A conversation threads
10. chat_messages — individual messages with citations
11. eligibility_checks — eligibility assessment results
12. action_items — generated task plans
13. generated_artifacts — AI studio visual artifacts
14. analysis_runs — stored reusable analysis output

## Security
- RLS enabled on every table.
- 4 policies (SELECT/INSERT/UPDATE/DELETE) per table, scoped TO authenticated
  with auth.uid() ownership checks.
- Child tables check ownership via the parent workspace/document.
- Storage buckets: documents (private), generated-artifacts (private).
- Storage policies restrict object access to the owning user.

## Notes
1. pgvector extension enabled for semantic embeddings.
2. All user_id columns default to auth.uid().
3. JSONB columns store structured AI output for reuse.
4. Timestamps default to now().
*/

-- Enable pgvector for embeddings
create extension if not exists vector;

-- ============================================================================
-- PROFILES
-- ============================================================================
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "select_own_profile" on profiles;
create policy "select_own_profile" on profiles for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "insert_own_profile" on profiles;
create policy "insert_own_profile" on profiles for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "update_own_profile" on profiles;
create policy "update_own_profile" on profiles for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_profile" on profiles;
create policy "delete_own_profile" on profiles for delete
  to authenticated using (auth.uid() = user_id);

-- ============================================================================
-- WORKSPACES
-- ============================================================================
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table workspaces enable row level security;

drop policy if exists "select_own_workspaces" on workspaces;
create policy "select_own_workspaces" on workspaces for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "insert_own_workspaces" on workspaces;
create policy "insert_own_workspaces" on workspaces for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "update_own_workspaces" on workspaces;
create policy "update_own_workspaces" on workspaces for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_workspaces" on workspaces;
create policy "delete_own_workspaces" on workspaces for delete
  to authenticated using (auth.uid() = user_id);

-- ============================================================================
-- DOCUMENTS
-- ============================================================================
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size bigint not null default 0,
  storage_path text,
  page_count int,
  processing_status text not null default 'uploaded',
  analysis_status text not null default 'uploaded',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table documents enable row level security;

drop policy if exists "select_own_documents" on documents;
create policy "select_own_documents" on documents for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "insert_own_documents" on documents;
create policy "insert_own_documents" on documents for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "update_own_documents" on documents;
create policy "update_own_documents" on documents for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_documents" on documents;
create policy "delete_own_documents" on documents for delete
  to authenticated using (auth.uid() = user_id);

create index if not exists idx_documents_user on documents(user_id);
create index if not exists idx_documents_workspace on documents(workspace_id);

-- ============================================================================
-- DOCUMENT_CHUNKS (RAG)
-- ============================================================================
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  page_number int,
  embedding vector(1536)
);

alter table documents enable row level security;

alter table document_chunks enable row level security;

drop policy if exists "select_own_chunks" on document_chunks;
create policy "select_own_chunks" on document_chunks for select
  to authenticated using (
    exists (select 1 from documents d where d.id = document_chunks.document_id and d.user_id = auth.uid())
  );

drop policy if exists "insert_own_chunks" on document_chunks;
create policy "insert_own_chunks" on document_chunks for insert
  to authenticated with check (
    exists (select 1 from documents d where d.id = document_chunks.document_id and d.user_id = auth.uid())
  );

drop policy if exists "update_own_chunks" on document_chunks;
create policy "update_own_chunks" on document_chunks for update
  to authenticated using (
    exists (select 1 from documents d where d.id = document_chunks.document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from documents d where d.id = document_chunks.document_id and d.user_id = auth.uid())
  );

drop policy if exists "delete_own_chunks" on document_chunks;
create policy "delete_own_chunks" on document_chunks for delete
  to authenticated using (
    exists (select 1 from documents d where d.id = document_chunks.document_id and d.user_id = auth.uid())
  );

create index if not exists idx_chunks_document on document_chunks(document_id);

-- ============================================================================
-- DOCUMENT_ENTITIES
-- ============================================================================
create table if not exists document_entities (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  entity_type text not null,
  value text not null,
  context text,
  page_number int
);

alter table document_entities enable row level security;

drop policy if exists "select_own_entities" on document_entities;
create policy "select_own_entities" on document_entities for select
  to authenticated using (
    exists (select 1 from documents d where d.id = document_entities.document_id and d.user_id = auth.uid())
  );

drop policy if exists "insert_own_entities" on document_entities;
create policy "insert_own_entities" on document_entities for insert
  to authenticated with check (
    exists (select 1 from documents d where d.id = document_entities.document_id and d.user_id = auth.uid())
  );

drop policy if exists "update_own_entities" on document_entities;
create policy "update_own_entities" on document_entities for update
  to authenticated using (
    exists (select 1 from documents d where d.id = document_entities.document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from documents d where d.id = document_entities.document_id and d.user_id = auth.uid())
  );

drop policy if exists "delete_own_entities" on document_entities;
create policy "delete_own_entities" on document_entities for delete
  to authenticated using (
    exists (select 1 from documents d where d.id = document_entities.document_id and d.user_id = auth.uid())
  );

-- ============================================================================
-- DOCUMENT_DEADLINES
-- ============================================================================
create table if not exists document_deadlines (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  event text not null,
  date date,
  importance text not null default 'medium',
  description text,
  source_page int
);

alter table document_deadlines enable row level security;

drop policy if exists "select_own_deadlines" on document_deadlines;
create policy "select_own_deadlines" on document_deadlines for select
  to authenticated using (
    exists (select 1 from documents d where d.id = document_deadlines.document_id and d.user_id = auth.uid())
  );

drop policy if exists "insert_own_deadlines" on document_deadlines;
create policy "insert_own_deadlines" on document_deadlines for insert
  to authenticated with check (
    exists (select 1 from documents d where d.id = document_deadlines.document_id and d.user_id = auth.uid())
  );

drop policy if exists "update_own_deadlines" on document_deadlines;
create policy "update_own_deadlines" on document_deadlines for update
  to authenticated using (
    exists (select 1 from documents d where d.id = document_deadlines.document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from documents d where d.id = document_deadlines.document_id and d.user_id = auth.uid())
  );

drop policy if exists "delete_own_deadlines" on document_deadlines;
create policy "delete_own_deadlines" on document_deadlines for delete
  to authenticated using (
    exists (select 1 from documents d where d.id = document_deadlines.document_id and d.user_id = auth.uid())
  );

-- ============================================================================
-- DOCUMENT_REQUIREMENTS
-- ============================================================================
create table if not exists document_requirements (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  description text not null,
  mandatory boolean not null default false,
  source_page int,
  source_text text
);

alter table document_requirements enable row level security;

drop policy if exists "select_own_requirements" on document_requirements;
create policy "select_own_requirements" on document_requirements for select
  to authenticated using (
    exists (select 1 from documents d where d.id = document_requirements.document_id and d.user_id = auth.uid())
  );

drop policy if exists "insert_own_requirements" on document_requirements;
create policy "insert_own_requirements" on document_requirements for insert
  to authenticated with check (
    exists (select 1 from documents d where d.id = document_requirements.document_id and d.user_id = auth.uid())
  );

drop policy if exists "update_own_requirements" on document_requirements;
create policy "update_own_requirements" on document_requirements for update
  to authenticated using (
    exists (select 1 from documents d where d.id = document_requirements.document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from documents d where d.id = document_requirements.document_id and d.user_id = auth.uid())
  );

drop policy if exists "delete_own_requirements" on document_requirements;
create policy "delete_own_requirements" on document_requirements for delete
  to authenticated using (
    exists (select 1 from documents d where d.id = document_requirements.document_id and d.user_id = auth.uid())
  );

-- ============================================================================
-- DOCUMENT_RULES
-- ============================================================================
create table if not exists document_rules (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  rule text not null,
  description text,
  source_page int
);

alter table document_rules enable row level security;

drop policy if exists "select_own_rules" on document_rules;
create policy "select_own_rules" on document_rules for select
  to authenticated using (
    exists (select 1 from documents d where d.id = document_rules.document_id and d.user_id = auth.uid())
  );

drop policy if exists "insert_own_rules" on document_rules;
create policy "insert_own_rules" on document_rules for insert
  to authenticated with check (
    exists (select 1 from documents d where d.id = document_rules.document_id and d.user_id = auth.uid())
  );

drop policy if exists "update_own_rules" on document_rules;
create policy "update_own_rules" on document_rules for update
  to authenticated using (
    exists (select 1 from documents d where d.id = document_rules.document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from documents d where d.id = document_rules.document_id and d.user_id = auth.uid())
  );

drop policy if exists "delete_own_rules" on document_rules;
create policy "delete_own_rules" on document_rules for delete
  to authenticated using (
    exists (select 1 from documents d where d.id = document_rules.document_id and d.user_id = auth.uid())
  );

-- ============================================================================
-- CHAT_CONVERSATIONS
-- ============================================================================
create table if not exists chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  title text not null default 'New Conversation',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table chat_conversations enable row level security;

drop policy if exists "select_own_conversations" on chat_conversations;
create policy "select_own_conversations" on chat_conversations for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "insert_own_conversations" on chat_conversations;
create policy "insert_own_conversations" on chat_conversations for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "update_own_conversations" on chat_conversations;
create policy "update_own_conversations" on chat_conversations for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_conversations" on chat_conversations;
create policy "delete_own_conversations" on chat_conversations for delete
  to authenticated using (auth.uid() = user_id);

-- ============================================================================
-- CHAT_MESSAGES
-- ============================================================================
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb,
  created_at timestamptz default now()
);

alter table chat_messages enable row level security;

drop policy if exists "select_own_messages" on chat_messages;
create policy "select_own_messages" on chat_messages for select
  to authenticated using (
    exists (select 1 from chat_conversations c where c.id = chat_messages.conversation_id and c.user_id = auth.uid())
  );

drop policy if exists "insert_own_messages" on chat_messages;
create policy "insert_own_messages" on chat_messages for insert
  to authenticated with check (
    exists (select 1 from chat_conversations c where c.id = chat_messages.conversation_id and c.user_id = auth.uid())
  );

drop policy if exists "update_own_messages" on chat_messages;
create policy "update_own_messages" on chat_messages for update
  to authenticated using (
    exists (select 1 from chat_conversations c where c.id = chat_messages.conversation_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from chat_conversations c where c.id = chat_messages.conversation_id and c.user_id = auth.uid())
  );

drop policy if exists "delete_own_messages" on chat_messages;
create policy "delete_own_messages" on chat_messages for delete
  to authenticated using (
    exists (select 1 from chat_conversations c where c.id = chat_messages.conversation_id and c.user_id = auth.uid())
  );

-- ============================================================================
-- ELIGIBILITY_CHECKS
-- ============================================================================
create table if not exists eligibility_checks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'needs_more_info',
  summary text,
  matched_conditions jsonb,
  unmatched_conditions jsonb,
  missing_documents jsonb,
  created_at timestamptz default now()
);

alter table eligibility_checks enable row level security;

drop policy if exists "select_own_eligibility" on eligibility_checks;
create policy "select_own_eligibility" on eligibility_checks for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "insert_own_eligibility" on eligibility_checks;
create policy "insert_own_eligibility" on eligibility_checks for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "update_own_eligibility" on eligibility_checks;
create policy "update_own_eligibility" on eligibility_checks for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_eligibility" on eligibility_checks;
create policy "delete_own_eligibility" on eligibility_checks for delete
  to authenticated using (auth.uid() = user_id);

-- ============================================================================
-- ACTION_ITEMS
-- ============================================================================
create table if not exists action_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'medium',
  deadline date,
  source text,
  status text not null default 'pending',
  created_at timestamptz default now()
);

alter table action_items enable row level security;

drop policy if exists "select_own_actions" on action_items;
create policy "select_own_actions" on action_items for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "insert_own_actions" on action_items;
create policy "insert_own_actions" on action_items for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "update_own_actions" on action_items;
create policy "update_own_actions" on action_items for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_actions" on action_items;
create policy "delete_own_actions" on action_items for delete
  to authenticated using (auth.uid() = user_id);

-- ============================================================================
-- GENERATED_ARTIFACTS
-- ============================================================================
create table if not exists generated_artifacts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  artifact_type text not null,
  title text not null,
  content text,
  storage_path text,
  created_at timestamptz default now()
);

alter table generated_artifacts enable row level security;

drop policy if exists "select_own_artifacts" on generated_artifacts;
create policy "select_own_artifacts" on generated_artifacts for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "insert_own_artifacts" on generated_artifacts;
create policy "insert_own_artifacts" on generated_artifacts for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "update_own_artifacts" on generated_artifacts;
create policy "update_own_artifacts" on generated_artifacts for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_artifacts" on generated_artifacts;
create policy "delete_own_artifacts" on generated_artifacts for delete
  to authenticated using (auth.uid() = user_id);

-- ============================================================================
-- ANALYSIS_RUNS
-- ============================================================================
create table if not exists analysis_runs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  summary text,
  executive_summary text,
  key_points jsonb,
  simple_explanation text,
  topics jsonb,
  potential_risks jsonb,
  created_at timestamptz default now()
);

alter table analysis_runs enable row level security;

drop policy if exists "select_own_runs" on analysis_runs;
create policy "select_own_runs" on analysis_runs for select
  to authenticated using (
    exists (select 1 from documents d where d.id = analysis_runs.document_id and d.user_id = auth.uid())
  );

drop policy if exists "insert_own_runs" on analysis_runs;
create policy "insert_own_runs" on analysis_runs for insert
  to authenticated with check (
    exists (select 1 from documents d where d.id = analysis_runs.document_id and d.user_id = auth.uid())
  );

drop policy if exists "update_own_runs" on analysis_runs;
create policy "update_own_runs" on analysis_runs for update
  to authenticated using (
    exists (select 1 from documents d where d.id = analysis_runs.document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from documents d where d.id = analysis_runs.document_id and d.user_id = auth.uid())
  );

drop policy if exists "delete_own_runs" on analysis_runs;
create policy "delete_own_runs" on analysis_runs for delete
  to authenticated using (
    exists (select 1 from documents d where d.id = analysis_runs.document_id and d.user_id = auth.uid())
  );

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('generated-artifacts', 'generated-artifacts', false)
on conflict (id) do nothing;

-- Storage policies: users can only access their own folder
drop policy if exists "Users can upload own documents" on storage.objects;
create policy "Users can upload own documents" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own documents" on storage.objects;
create policy "Users can read own documents" on storage.objects
  for select to authenticated using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own documents" on storage.objects;
create policy "Users can delete own documents" on storage.objects
  for delete to authenticated using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can upload own artifacts" on storage.objects;
create policy "Users can upload own artifacts" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'generated-artifacts' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own artifacts" on storage.objects;
create policy "Users can read own artifacts" on storage.objects
  for select to authenticated using (
    bucket_id = 'generated-artifacts' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own artifacts" on storage.objects;
create policy "Users can delete own artifacts" on storage.objects
  for delete to authenticated using (
    bucket_id = 'generated-artifacts' and (storage.foldername(name))[1] = auth.uid()::text
  );
