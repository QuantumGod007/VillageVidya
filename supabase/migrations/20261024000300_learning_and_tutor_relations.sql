begin;
create table public.learner_academic_enrollments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  subject_id text not null references public.academic_subjects(id) on delete restrict,
  language public.learning_language not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(learner_id, subject_id, language)
);
create unique index one_active_enrollment_per_learner on public.learner_academic_enrollments(learner_id) where is_active;
create index learner_enrollment_subject_idx on public.learner_academic_enrollments(subject_id);
create table public.lesson_progress (
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete restrict,
  checkpoint_percent smallint not null default 0 check (checkpoint_percent between 0 and 100),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(learner_id, lesson_id)
);
create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learner_profiles(user_id) on delete restrict,
  assessment_id text not null,
  lesson_id text not null,
  selected_option smallint not null check (selected_option >= 0),
  score_percent smallint not null check (score_percent between 0 and 100),
  created_at timestamptz not null default now(),
  foreign key(assessment_id, lesson_id) references public.assessments(id, lesson_id) on delete restrict
);
create function private.check_attempt_option() returns trigger language plpgsql
security invoker set search_path = '' as $$
begin
  if new.selected_option >= (select cardinality(options) from public.assessments where id = new.assessment_id) then
    raise exception 'Selected option is out of bounds' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.check_attempt_option() from public;
create trigger attempt_option_bounds before insert or update on public.assessment_attempts for each row execute function private.check_attempt_option();
create table public.learner_bookmarks (
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(learner_id, lesson_id)
);
create table public.tutor_subject_qualifications (
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  subject_id text not null references public.academic_subjects(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(tutor_id, subject_id)
);
create table public.tutor_languages (
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  language public.learning_language not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(tutor_id, language)
);
create table public.tutor_availability (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null, ends_at time not null, enabled boolean not null default false,
  timezone text not null default 'Asia/Kolkata' check (timezone = 'Asia/Kolkata'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (starts_at < ends_at), unique(tutor_id, weekday, starts_at, ends_at)
);
create index lesson_progress_lesson_idx on public.lesson_progress(lesson_id);
create index assessment_attempts_learner_idx on public.assessment_attempts(learner_id,created_at desc);
create index assessment_attempts_resource_idx on public.assessment_attempts(assessment_id,lesson_id);
create index learner_bookmarks_lesson_idx on public.learner_bookmarks(lesson_id);
create index tutor_qualification_subject_idx on public.tutor_subject_qualifications(subject_id);
do $$ declare t text; begin
  foreach t in array array['learner_academic_enrollments','lesson_progress','assessment_attempts','learner_bookmarks','tutor_subject_qualifications','tutor_languages','tutor_availability'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role',t);
    if t not in ('assessment_attempts','learner_bookmarks') then
      execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);
    end if;
  end loop;
end $$;
commit;
