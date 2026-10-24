begin;
-- Temporary release gate, not proof of guardian consent or production age
-- verification. Only trusted local tooling provisions consenting adult testers.
create table public.adult_test_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.adult_test_accounts enable row level security;
alter table public.adult_test_accounts force row level security;
revoke all on public.adult_test_accounts from public, anon, authenticated, service_role;
grant select on public.adult_test_accounts to authenticated;
grant all on public.adult_test_accounts to service_role;
create policy trusted_service on public.adult_test_accounts to service_role using (true) with check (true);

-- Supabase access JWTs otherwise survive logout until expiry. Check the signed
-- session_id against Auth's live session records for every private DB request.
-- No caller-supplied UUID argument, dynamic SQL, or user_metadata authorization.
create function private.account_session_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions s
    join public.adult_test_accounts a on a.user_id = s.user_id and a.enabled
    join auth.users u on u.id = s.user_id
    where s.id::text = (select auth.jwt()->>'session_id')
      and s.user_id = (select auth.uid())
      and (s.not_after is null or s.not_after > now())
      and (u.banned_until is null or u.banned_until <= now())
  );
$$;
revoke all on function private.account_session_active() from public, anon, authenticated;
grant execute on function private.account_session_active() to authenticated;
create policy own_live_access on public.adult_test_accounts for select to authenticated
  using (user_id = (select auth.uid()) and (select private.account_session_active()));

-- Restrictive policies intersect existing Phase 5 ownership/consent policies.
-- Public curriculum remains readable; private data requires both checks.
do $$ declare t text; begin
  foreach t in array array['profiles','user_roles','learner_profiles','tutor_profiles',
    'guardian_relationships','guardian_consent_records','tutor_verification_records',
    'learner_academic_enrollments','lesson_progress','assessment_attempts','learner_bookmarks',
    'tutor_subject_qualifications','tutor_languages','tutor_availability'] loop
    execute format('create policy live_adult_account on public.%I as restrictive to authenticated using ((select private.account_session_active())) with check ((select private.account_session_active()))',t);
  end loop;
end $$;
commit;
