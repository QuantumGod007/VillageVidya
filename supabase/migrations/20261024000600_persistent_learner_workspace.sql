begin;
-- Reading is an explicit, self-reported activity. It is never a scored result.
create table public.learner_lesson_activity (
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete restrict,
  started_at timestamptz not null default now(),
  read_at timestamptz,
  primary key (learner_id,lesson_id),
  check (read_at is null or read_at >= started_at)
);
create index learner_activity_lesson_idx on public.learner_lesson_activity(lesson_id);
alter table public.learner_lesson_activity enable row level security;
alter table public.learner_lesson_activity force row level security;
revoke all on public.learner_lesson_activity from public, anon, authenticated, service_role;
grant select on public.learner_lesson_activity to authenticated;
grant all on public.learner_lesson_activity to service_role;
create policy owner_reading on public.learner_lesson_activity for select to authenticated using (
  learner_id = (select auth.uid()) and exists(select 1 from public.learner_profiles where user_id = (select auth.uid()))
);
create policy live_adult_account on public.learner_lesson_activity as restrictive to authenticated
  using ((select private.account_session_active()));
create policy trusted_service on public.learner_lesson_activity to service_role using (true) with check (true);

-- Helpers are unexposed and cannot mutate data. Definer entry points below must
-- explicitly check caller/session/role, and every published ancestor/source.
create function private.published_reading_lesson(target text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.lessons l
    join public.chapters c on c.id=l.chapter_id
    join public.academic_subjects s on s.id=c.subject_id
    join public.academic_grades g on g.id=s.grade_id
    join public.academic_boards b on b.id=g.board_id
    left join public.curriculum_sources src on src.id=c.source_id
    where l.id=target and l.is_published and c.is_published and s.is_published
      and g.is_published and b.is_published and (c.source_id is null or src.is_published));
$$;
create function private.require_live_learner() returns uuid
language plpgsql security invoker set search_path = '' as $$
declare caller uuid := auth.uid(); begin
  if caller is null or not private.account_session_active()
    or not exists(select 1 from public.user_roles where user_id=caller and role='learner')
    or not exists(select 1 from public.learner_profiles where user_id=caller) then
    raise exception 'Active adult learner account required' using errcode='42501';
  end if;
  return caller;
end $$;
revoke all on function private.published_reading_lesson(text), private.require_live_learner() from public, anon, authenticated;

-- Revoke alternate client write paths: switching contexts is a single serialized
-- operation, not two competing browser updates. Existing unique index remains.
revoke insert, update, delete on public.learner_academic_enrollments from authenticated;
revoke insert(learner_id,subject_id,language,is_active), update(is_active) on public.learner_academic_enrollments from authenticated;
create function public.switch_learner_enrollment(p_subject_id text, p_language public.learning_language)
returns public.learner_academic_enrollments
language plpgsql security definer set search_path = '' as $$
declare caller uuid := private.require_live_learner(); result public.learner_academic_enrollments; begin
  -- Serializes all switches for this learner, including first-time enrolment.
  perform 1 from public.learner_profiles where user_id=caller for update;
  if not exists(select 1 from public.academic_subjects s
    join public.academic_grades g on g.id=s.grade_id
    join public.academic_boards b on b.id=g.board_id
    where s.id=p_subject_id and s.is_published and g.is_published and b.is_published)
    or not exists(select 1 from public.lessons l where l.language=p_language and private.published_reading_lesson(l.id)) then
    raise exception 'Choose a published academic subject and catalog language' using errcode='22023';
  end if;
  update public.learner_academic_enrollments set is_active=false where learner_id=caller and is_active;
  insert into public.learner_academic_enrollments(learner_id,subject_id,language,is_active)
    values(caller,p_subject_id,p_language,true)
    on conflict(learner_id,subject_id,language) do update set is_active=true
    returning * into result;
  return result;
end $$;
create function public.record_learner_reading(p_lesson_id text, p_mark_read boolean default false)
returns public.learner_lesson_activity
language plpgsql security definer set search_path = '' as $$
declare caller uuid := private.require_live_learner(); result public.learner_lesson_activity; begin
  if p_mark_read is null or not private.published_reading_lesson(p_lesson_id) then
    raise exception 'Published lesson required' using errcode='22023';
  end if;
  insert into public.learner_lesson_activity(learner_id,lesson_id,read_at)
    values(caller,p_lesson_id,case when p_mark_read then now() else null end)
    on conflict(learner_id,lesson_id) do update set
      -- A transaction that started earlier can wait behind a later insert.
      -- Keep completion at least as recent as the winning start timestamp.
      read_at=coalesce(learner_lesson_activity.read_at,case when excluded.read_at is not null
        then greatest(learner_lesson_activity.started_at,excluded.read_at) end)
    returning * into result;
  return result;
end $$;
revoke all on function public.switch_learner_enrollment(text,public.learning_language), public.record_learner_reading(text,boolean) from public, anon, authenticated, service_role;
grant execute on function public.switch_learner_enrollment(text,public.learning_language), public.record_learner_reading(text,boolean) to authenticated;
-- Bookmarks retain their idempotent existing table path and live-session policy.
create policy learner_bookmark_role on public.learner_bookmarks as restrictive to authenticated
  using (exists(select 1 from public.learner_profiles where user_id=(select auth.uid())))
  with check (exists(select 1 from public.learner_profiles where user_id=(select auth.uid())));
commit;
