create or replace function public.sanitize_username(value text)
returns text
language sql
immutable
as $function$
  select nullif(regexp_replace(trim(coalesce(value, '')), '[^A-Za-z0-9._-]+', '_', 'g'), '');
$function$;

create or replace function public.generate_unique_username(
  requested_username text,
  fallback_email text,
  fallback_user_id uuid,
  current_user_id uuid default null
)
returns text
language plpgsql
as $function$
declare
  fallback_suffix text;
  base_username text;
  candidate text;
  suffix integer := 0;
begin
  fallback_suffix := left(replace(fallback_user_id::text, '-', ''), 8);

  base_username := public.sanitize_username(requested_username);

  if base_username is null then
    base_username := public.sanitize_username(split_part(coalesce(fallback_email, ''), '@', 1));
  end if;

  if base_username is null then
    base_username := 'user_' || fallback_suffix;
  end if;

  if char_length(base_username) < 3 then
    base_username := left(base_username || '_' || fallback_suffix, 30);
  end if;

  base_username := left(base_username, 30);
  candidate := base_username;

  while exists (
    select 1
    from public.profiles p
    where lower(p.username) = lower(candidate)
      and (current_user_id is null or p.user_id <> current_user_id)
  ) loop
    suffix := suffix + 1;
    candidate := left(base_username, 30 - char_length('_' || suffix::text)) || '_' || suffix::text;
  end loop;

  return candidate;
end;
$function$;

do $$
declare
  profile_row record;
begin
  for profile_row in
    select p.user_id, p.username, p.email
    from public.profiles p
    order by p.created_at nulls first, p.user_id
  loop
    update public.profiles
    set username = public.generate_unique_username(
      profile_row.username,
      profile_row.email,
      profile_row.user_id,
      profile_row.user_id
    )
    where user_id = profile_row.user_id;
  end loop;
end $$;

alter table public.profiles
alter column username set not null;

alter table public.profiles
drop constraint if exists profiles_username_not_blank;

alter table public.profiles
drop constraint if exists profiles_username_length;

alter table public.profiles
drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_length
  check (char_length(username) between 3 and 30);

alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[A-Za-z0-9._-]+$');

create unique index if not exists profiles_username_unique_ci
on public.profiles using btree (lower(username));

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
    create policy "profiles_insert_own"
    on public.profiles
    as permissive
    for insert
    to authenticated
    with check ((auth.uid() = user_id));
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
begin
  insert into public.profiles (user_id, username, email, role)
  values (
    new.id,
    public.generate_unique_username(
      new.raw_user_meta_data ->> 'username',
      new.email,
      new.id,
      new.id
    ),
    new.email,
    'user'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$function$;
