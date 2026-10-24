begin;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema private to authenticated, service_role;

-- No SECURITY DEFINER helpers: all joins retain the caller's grants and RLS.
create function private.can_read_learner(target uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select target = (select auth.uid()) or exists (
    select 1 from public.guardian_relationships r
    where r.learner_id = target and r.guardian_id = (select auth.uid()) and r.status = 'approved'
    and (select c.status from public.guardian_consent_records c
         where c.relationship_id = r.id order by c.event_number desc limit 1) = 'approved'
  );
$$;
revoke all on function private.can_read_learner(uuid) from public, anon;
grant execute on function private.can_read_learner(uuid) to authenticated;

create policy published_boards on public.academic_boards for select to anon, authenticated using (is_published);
create policy published_grades on public.academic_grades for select to anon, authenticated using (
  is_published and exists(select 1 from public.academic_boards b where b.id = board_id)
);
create policy published_subjects on public.academic_subjects for select to anon, authenticated using (
  is_published and exists(select 1 from public.academic_grades g where g.id = grade_id)
);
create policy published_sources on public.curriculum_sources for select to anon, authenticated using (is_published);
create policy published_chapters on public.chapters for select to anon, authenticated using (
  is_published and exists(select 1 from public.academic_subjects s where s.id = subject_id)
  and (source_id is null or exists(select 1 from public.curriculum_sources src where src.id = source_id))
);
create policy published_lessons on public.lessons for select to anon, authenticated using (
  is_published and exists(select 1 from public.chapters c where c.id = chapter_id)
);
create policy published_assessments on public.assessments for select to anon, authenticated using (
  is_published and exists(select 1 from public.lessons l where l.id = lesson_id)
);

grant select on public.academic_boards, public.academic_grades, public.academic_subjects,
  public.curriculum_sources, public.chapters, public.lessons, public.assessments to anon, authenticated;

create policy profile_read on public.profiles for select to authenticated using (private.can_read_learner(id));
create policy profile_edit on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant select on public.profiles to authenticated;
grant update(display_name, preferred_language) on public.profiles to authenticated;
create policy own_roles on public.user_roles for select to authenticated using (user_id = (select auth.uid()));
create policy learner_profile_read on public.learner_profiles for select to authenticated using (private.can_read_learner(user_id));
create policy own_tutor_profile on public.tutor_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy tutor_bio_edit on public.tutor_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on public.user_roles, public.learner_profiles, public.tutor_profiles to authenticated;
grant update(bio) on public.tutor_profiles to authenticated;

create policy relationship_participants on public.guardian_relationships for select to authenticated
  using (guardian_id = (select auth.uid()) or learner_id = (select auth.uid()));
create policy consent_participants on public.guardian_consent_records for select to authenticated using (
  exists(select 1 from public.guardian_relationships r where r.id = relationship_id)
);
create policy own_verification_history on public.tutor_verification_records for select to authenticated
  using (tutor_id = (select auth.uid()));
grant select on public.guardian_relationships, public.guardian_consent_records, public.tutor_verification_records to authenticated;

create policy enrollment_read on public.learner_academic_enrollments for select to authenticated using (private.can_read_learner(learner_id));
create policy enrollment_insert on public.learner_academic_enrollments for insert to authenticated with check (
  learner_id = (select auth.uid()) and exists(select 1 from public.academic_subjects s where s.id = subject_id)
);
create policy enrollment_update on public.learner_academic_enrollments for update to authenticated
  using (learner_id = (select auth.uid())) with check (learner_id = (select auth.uid()));
create policy enrollment_delete on public.learner_academic_enrollments for delete to authenticated using (learner_id = (select auth.uid()));
grant select, delete on public.learner_academic_enrollments to authenticated;
grant insert(learner_id, subject_id, language, is_active), update(is_active) on public.learner_academic_enrollments to authenticated;
create policy progress_read on public.lesson_progress for select to authenticated using (private.can_read_learner(learner_id));
create policy own_attempts on public.assessment_attempts for select to authenticated using (learner_id = (select auth.uid()));
-- Scores and attempts require a future trusted scoring service. Clients cannot
-- claim arbitrary mastery or rewrite an assessment history.
grant select on public.lesson_progress, public.assessment_attempts to authenticated;

create policy own_bookmarks on public.learner_bookmarks for select to authenticated using (learner_id = (select auth.uid()));
create policy bookmark_insert on public.learner_bookmarks for insert to authenticated with check (
  learner_id = (select auth.uid()) and exists(select 1 from public.lessons l where l.id = lesson_id)
);
create policy bookmark_delete on public.learner_bookmarks for delete to authenticated using (learner_id = (select auth.uid()));
grant select, delete on public.learner_bookmarks to authenticated;
grant insert(learner_id, lesson_id) on public.learner_bookmarks to authenticated;

create policy own_qualifications on public.tutor_subject_qualifications for select to authenticated using (tutor_id = (select auth.uid()));
create policy own_languages on public.tutor_languages for select to authenticated using (tutor_id = (select auth.uid()));
grant select on public.tutor_subject_qualifications, public.tutor_languages to authenticated;
create policy own_availability_read on public.tutor_availability for select to authenticated using (tutor_id = (select auth.uid()));
create policy own_availability_insert on public.tutor_availability for insert to authenticated with check (tutor_id = (select auth.uid()));
create policy own_availability_update on public.tutor_availability for update to authenticated
  using (tutor_id = (select auth.uid())) with check (tutor_id = (select auth.uid()));
create policy own_availability_delete on public.tutor_availability for delete to authenticated using (tutor_id = (select auth.uid()));
grant select, delete on public.tutor_availability to authenticated;
grant insert(tutor_id, weekday, starts_at, ends_at, enabled, timezone),
  update(weekday, starts_at, ends_at, enabled) on public.tutor_availability to authenticated;

-- Explicit server grants, never a browser capability. Audit tables/attempts are
-- append-only even for service_role; destructive retention work needs migrations.
do $$ declare t text; begin
  foreach t in array array['academic_boards','academic_grades','academic_subjects','curriculum_sources','chapters','lessons','assessments',
    'profiles','user_roles','learner_profiles','tutor_profiles','guardian_relationships','learner_academic_enrollments',
    'lesson_progress','learner_bookmarks','tutor_subject_qualifications','tutor_languages','tutor_availability'] loop
    execute format('grant all on table public.%I to service_role',t);
    execute format('create policy trusted_service on public.%I to service_role using (true) with check (true)',t);
  end loop;
  foreach t in array array['guardian_consent_records','tutor_verification_records','assessment_attempts'] loop
    execute format('grant select, insert on table public.%I to service_role',t);
    execute format('create policy trusted_service on public.%I to service_role using (true) with check (true)',t);
  end loop;
end $$;
revoke all on sequence public.guardian_consent_records_event_number_seq, public.tutor_verification_records_event_number_seq from public, anon, authenticated;
grant usage, select on sequence public.guardian_consent_records_event_number_seq, public.tutor_verification_records_event_number_seq to service_role;
commit;
