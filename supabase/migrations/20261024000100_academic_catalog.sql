begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
revoke create on schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from public;
alter default privileges in schema private revoke all on functions from public;

create type public.learning_language as enum ('English', 'हिन्दी', 'मराठी', 'తెలుగు');
create type public.subject_name as enum ('Mathematics', 'Science', 'English', 'Social Science');
create type public.chapter_kind as enum ('reference', 'supplementary');

create function private.touch_updated_at() returns trigger language plpgsql
security invoker set search_path = '' as $$
begin new.updated_at = clock_timestamp(); return new; end;
$$;
revoke all on function private.touch_updated_at() from public;

create table public.academic_boards (
  id text primary key check (length(id) between 1 and 100),
  name text not null check (length(trim(name)) between 1 and 200),
  coverage text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.academic_grades (
  id text primary key, board_id text not null references public.academic_boards(id) on delete restrict,
  number smallint not null check (number between 4 and 10),
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(board_id, number)
);
create table public.academic_subjects (
  id text primary key, grade_id text not null references public.academic_grades(id) on delete restrict,
  name public.subject_name not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(grade_id, name)
);
create table public.curriculum_sources (
  id text primary key, title text not null check (length(trim(title)) > 0),
  url text not null check (url ~ '^https://'), edition text not null,
  verified_on date not null, scope text not null default 'chapter_metadata' check (scope = 'chapter_metadata'),
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(url, edition)
);
create table public.chapters (
  id text primary key, subject_id text not null references public.academic_subjects(id) on delete restrict,
  title text not null check (length(trim(title)) > 0), position integer not null check (position > 0),
  kind public.chapter_kind not null,
  source_id text references public.curriculum_sources(id) on delete restrict,
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (kind <> 'reference' or source_id is not null),
  unique(subject_id, position)
);
create table public.lessons (
  id text primary key, chapter_id text not null references public.chapters(id) on delete restrict,
  language public.learning_language not null, title text not null check (length(trim(title)) > 0),
  subtitle text not null, minutes smallint not null check (minutes between 1 and 180),
  concept text not null, steps text[] not null check (cardinality(steps) > 0),
  example text not null, keywords text[] not null default '{}',
  position integer not null check (position > 0),
  content_origin text not null default 'original_practice' check (content_origin = 'original_practice'),
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(chapter_id, language, position)
);
create table public.assessments (
  id text primary key, lesson_id text not null unique references public.lessons(id) on delete restrict,
  question text not null check (length(trim(question)) > 0),
  options text[] not null check (cardinality(options) between 2 and 6),
  answer_index smallint not null, explanation text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (answer_index >= 0 and answer_index < cardinality(options)),
  unique(id, lesson_id)
);
-- Parent IDs are the only authoritative board/grade path: no duplicate grade or
-- board columns on lessons/assessments that could disagree with that path.
create index chapters_source_idx on public.chapters(source_id);
create index lessons_chapter_idx on public.lessons(chapter_id, language, position);
do $$ declare t text; begin
  foreach t in array array['academic_boards','academic_grades','academic_subjects','curriculum_sources','chapters','lessons','assessments'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role',t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);
  end loop;
end $$;
commit;
