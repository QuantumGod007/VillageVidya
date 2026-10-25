begin;
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

alter table public.tutor_profiles add column revision integer not null default 1 check (revision > 0);
alter table public.tutor_availability add column revision integer not null default 1 check (revision > 0);
comment on column public.tutor_availability.enabled is 'Self-declared weekly preference only. Never grants discovery, matching or bookability.';
alter table public.tutor_availability add constraint tutor_interval_bounds check (
  ends_at - starts_at between interval '15 minutes' and interval '4 hours'
  and extract(second from starts_at) = 0 and extract(second from ends_at) = 0
);
-- All saved intervals, including disabled preferences, must be unambiguous.
-- GiST exclusion checks competing transactions as well as ordinary writes.
alter table public.tutor_availability add constraint tutor_no_overlap exclude using gist (
  tutor_id with =, weekday with =,
  int8range(extract(epoch from starts_at)::bigint, extract(epoch from ends_at)::bigint, '[)') with &&
);
create function private.tutor_revision() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin new.revision := old.revision + 1; return new; end $$;
create trigger tutor_profile_revision before update on public.tutor_profiles for each row execute function private.tutor_revision();
create trigger tutor_availability_revision before update on public.tutor_availability for each row execute function private.tutor_revision();
create function private.tutor_slot_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Shared by RPCs and trusted table writes. Serializes the weekly count bound.
  perform 1 from public.tutor_profiles where user_id=new.tutor_id for update;
  if (select count(*) from public.tutor_availability where tutor_id=new.tutor_id and id<>new.id) >= 28
    or (select count(*) from public.tutor_availability where tutor_id=new.tutor_id and weekday=new.weekday and id<>new.id) >= 4 then
    raise exception 'Availability is limited to 4 intervals per day and 28 per week' using errcode='23514';
  end if;
  return new;
end $$;
create trigger tutor_slot_limit before insert or update on public.tutor_availability for each row execute function private.tutor_slot_limit();
create function private.require_live_tutor() returns uuid
language plpgsql security invoker set search_path = '' as $$
declare caller uuid := auth.uid(); begin
  if caller is null or not private.account_session_active()
    or not exists(select 1 from public.user_roles where user_id=caller and role='tutor')
    or not exists(select 1 from public.tutor_profiles where user_id=caller) then
    raise exception 'Active adult tutor account required' using errcode='42501';
  end if;
  return caller;
end $$;
revoke all on function private.tutor_revision(), private.tutor_slot_limit(), private.require_live_tutor() from public, anon, authenticated;
revoke update(bio) on public.tutor_profiles from authenticated;
revoke insert, update, delete on public.tutor_availability from authenticated;
revoke insert(tutor_id, weekday, starts_at, ends_at, enabled, timezone), update(weekday, starts_at, ends_at, enabled) on public.tutor_availability from authenticated;

create function public.save_tutor_bio(p_bio text, p_revision integer) returns public.tutor_profiles
language plpgsql security definer set search_path = '' as $$
declare caller uuid := private.require_live_tutor(); result public.tutor_profiles; begin
  if p_bio is null or length(p_bio)>1200 then
    raise exception 'Biography must be at most 1200 characters' using errcode='22023';
  end if;
  select * into result from public.tutor_profiles where user_id=caller for update;
  -- A replay after a lost response is safe, without overwriting newer content.
  if result.bio=trim(p_bio) then return result; end if;
  if result.revision is distinct from p_revision then
    raise exception 'Biography changed. Refresh before saving again' using errcode='40001';
  end if;
  update public.tutor_profiles set bio=trim(p_bio) where user_id=caller returning * into result;
  return result;
end $$;
create function public.save_tutor_availability(p_id uuid, p_revision integer, p_weekday smallint, p_starts_at time, p_ends_at time, p_enabled boolean)
returns public.tutor_availability
language plpgsql security definer set search_path = '' as $$
declare caller uuid := private.require_live_tutor(); result public.tutor_availability; begin
  perform 1 from public.tutor_profiles where user_id=caller for update;
  if p_id is null or p_weekday is null or p_starts_at is null or p_ends_at is null or p_enabled is null then
    raise exception 'Complete interval required' using errcode='22023';
  end if;
  select * into result from public.tutor_availability where id=p_id and tutor_id=caller for update;
  if found then
    if result.weekday=p_weekday and result.starts_at=p_starts_at and result.ends_at=p_ends_at and result.enabled=p_enabled then return result; end if;
    if p_revision is null or result.revision<>p_revision then
      raise exception 'Availability changed. Refresh before saving again' using errcode='40001';
    end if;
    update public.tutor_availability set weekday=p_weekday, starts_at=p_starts_at, ends_at=p_ends_at, enabled=p_enabled
      where id=p_id and tutor_id=caller returning * into result;
  else
    if p_revision is not null then
      raise exception 'Availability changed or was removed. Refresh' using errcode='40001';
    end if;
    insert into public.tutor_availability(id,tutor_id,weekday,starts_at,ends_at,enabled)
      values(p_id,caller,p_weekday,p_starts_at,p_ends_at,p_enabled) returning * into result;
  end if;
  return result;
end $$;
create function public.delete_tutor_availability(p_id uuid, p_revision integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare caller uuid := private.require_live_tutor(); current_revision integer; begin
  perform 1 from public.tutor_profiles where user_id=caller for update;
  select revision into current_revision from public.tutor_availability where id=p_id and tutor_id=caller for update;
  if not found then return true; end if;
  if current_revision is distinct from p_revision then
    raise exception 'Availability changed. Refresh before removing' using errcode='40001';
  end if;
  delete from public.tutor_availability where id=p_id and tutor_id=caller;
  return true;
end $$;
revoke all on function public.save_tutor_bio(text,integer), public.save_tutor_availability(uuid,integer,smallint,time,time,boolean), public.delete_tutor_availability(uuid,integer) from public, anon, authenticated, service_role;
grant execute on function public.save_tutor_bio(text,integer), public.save_tutor_availability(uuid,integer,smallint,time,time,boolean), public.delete_tutor_availability(uuid,integer) to authenticated;
commit;
