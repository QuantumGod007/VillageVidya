begin;
create type public.app_role as enum ('learner','tutor','guardian','champion','admin');
create type public.review_status as enum ('pending','approved','rejected','revoked');
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  preferred_language public.learning_language not null default 'English',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  assigned_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(user_id, role)
);
create table public.learner_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  required_role public.app_role generated always as ('learner'::public.app_role) stored,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(user_id, required_role) references public.user_roles(user_id, role) on delete cascade
);
create table public.tutor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  required_role public.app_role generated always as ('tutor'::public.app_role) stored,
  academic_grade smallint not null check (academic_grade between 4 and 12),
  bio text not null default '' check (length(bio) <= 1200),
  teaching_skill_score numeric(5,2) check (teaching_skill_score between 0 and 100),
  completed_sessions integer not null default 0 check (completed_sessions >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(user_id, required_role) references public.user_roles(user_id, role) on delete cascade
);
create table public.guardian_relationships (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles(id) on delete cascade,
  guardian_role public.app_role generated always as ('guardian'::public.app_role) stored,
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  status public.review_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (guardian_id <> learner_id),
  check (status = 'pending' or (reviewed_by is not null and reviewed_at is not null)),
  foreign key(guardian_id, guardian_role) references public.user_roles(user_id, role) on delete cascade,
  unique(guardian_id, learner_id)
);
create table public.guardian_consent_records (
  id uuid primary key default gen_random_uuid(),
  event_number bigint generated always as identity unique,
  relationship_id uuid not null references public.guardian_relationships(id) on delete restrict,
  status public.review_status not null default 'pending',
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  policy_version text not null check (length(trim(policy_version)) > 0),
  decision_note text not null check (length(trim(decision_note)) between 1 and 500),
  created_at timestamptz not null default now()
);
create table public.tutor_verification_records (
  id uuid primary key default gen_random_uuid(),
  event_number bigint generated always as identity unique,
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete restrict,
  status public.review_status not null default 'pending',
  reviewed_by uuid not null references public.profiles(id) on delete restrict,
  verified_grade smallint check (verified_grade between 4 and 12),
  decision_note text not null check (length(trim(decision_note)) between 1 and 500),
  created_at timestamptz not null default now(),
  check (reviewed_by <> tutor_id),
  check (status <> 'approved' or verified_grade is not null)
);
create index guardian_relationships_learner_idx on public.guardian_relationships(learner_id);
create index guardian_consent_latest_idx on public.guardian_consent_records(relationship_id,event_number desc);
create index tutor_verification_latest_idx on public.tutor_verification_records(tutor_id,event_number desc);
create index user_roles_assigned_by_idx on public.user_roles(assigned_by);
create index guardian_relationships_reviewer_idx on public.guardian_relationships(reviewed_by);
create index guardian_consent_recorder_idx on public.guardian_consent_records(recorded_by);
create index tutor_verification_reviewer_idx on public.tutor_verification_records(reviewed_by);
do $$ declare t text; begin
  foreach t in array array['profiles','user_roles','learner_profiles','tutor_profiles','guardian_relationships','guardian_consent_records','tutor_verification_records'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role',t);
    if t not in ('guardian_consent_records','tutor_verification_records') then
      execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);
    end if;
  end loop;
end $$;
commit;
