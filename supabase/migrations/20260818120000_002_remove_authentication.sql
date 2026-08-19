/*
# MIND MATRIX — 002: Remove Authentication

App runs without sign-in. Everything uses a single fixed guest identity
(GUEST_USER_ID below) and anonymous database access:

1. RLS is disabled on every table so anonymous (no-auth) requests work.
2. user_id defaults point at the fixed guest identity instead of auth.uid().
3. A matching auth.users row + profile row are created for referential integrity.
4. Storage policies allow anonymous upload/read/delete for the app buckets
   (restricted to the guest identity's folder).
*/

-- Fixed guest identity (must match GUEST_USER_ID in src/hooks/use-auth.tsx)
-- 00000000-0000-4000-8000-000000000001

-- ============================================================================
-- 1. DISABLE RLS ON ALL TABLES
-- ============================================================================
alter table public.profiles disable row level security;
alter table public.workspaces disable row level security;
alter table public.documents disable row level security;
alter table public.document_chunks disable row level security;
alter table public.document_entities disable row level security;
alter table public.document_deadlines disable row level security;
alter table public.document_requirements disable row level security;
alter table public.document_rules disable row level security;
alter table public.chat_conversations disable row level security;
alter table public.chat_messages disable row level security;
alter table public.eligibility_checks disable row level security;
alter table public.action_items disable row level security;
alter table public.generated_artifacts disable row level security;
alter table public.analysis_runs disable row level security;

-- ============================================================================
-- 2. USER_ID DEFAULTS -> GUEST IDENTITY
-- ============================================================================
alter table public.profiles alter column user_id set default '00000000-0000-4000-8000-000000000001';
alter table public.workspaces alter column user_id set default '00000000-0000-4000-8000-000000000001';
alter table public.documents alter column user_id set default '00000000-0000-4000-8000-000000000001';
alter table public.chat_conversations alter column user_id set default '00000000-0000-4000-8000-000000000001';
alter table public.eligibility_checks alter column user_id set default '00000000-0000-4000-8000-000000000001';
alter table public.action_items alter column user_id set default '00000000-0000-4000-8000-000000000001';
alter table public.generated_artifacts alter column user_id set default '00000000-0000-4000-8000-000000000001';

-- ============================================================================
-- 3. GUEST AUTH USER + PROFILE (keeps FK references valid)
-- ============================================================================
insert into auth.users (
  id, aud, role, email, encrypted_password,
  email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'guest@mindmatrix.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Guest"}',
  now(), now()
)
on conflict (id) do nothing;

insert into public.profiles (user_id, full_name, avatar_url)
select '00000000-0000-4000-8000-000000000001', 'Guest', null
where not exists (
  select 1 from public.profiles where user_id = '00000000-0000-4000-8000-000000000001'
);

-- ============================================================================
-- 4. STORAGE: ALLOW ANONYMOUS ACCESS (folder = guest identity)
-- ============================================================================
drop policy if exists "Users can upload own documents" on storage.objects;
drop policy if exists "Users can read own documents" on storage.objects;
drop policy if exists "Users can delete own documents" on storage.objects;
drop policy if exists "Users can upload own artifacts" on storage.objects;
drop policy if exists "Users can read own artifacts" on storage.objects;
drop policy if exists "Users can delete own artifacts" on storage.objects;

create policy "Anyone can upload documents" on storage.objects
  for insert to anon, authenticated with check (
    bucket_id = 'documents' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001'
  );

create policy "Anyone can read documents" on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001'
  );

create policy "Anyone can delete documents" on storage.objects
  for delete to anon, authenticated using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001'
  );

create policy "Anyone can upload artifacts" on storage.objects
  for insert to anon, authenticated with check (
    bucket_id = 'generated-artifacts' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001'
  );

create policy "Anyone can read artifacts" on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'generated-artifacts' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001'
  );

create policy "Anyone can delete artifacts" on storage.objects
  for delete to anon, authenticated using (
    bucket_id = 'generated-artifacts' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001'
  );
