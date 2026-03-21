-- PostgreSQL does not support safe in-place physical column reordering.
-- We add username non-destructively and keep the current table layout.

alter table public.profiles
add column if not exists username text;

update public.profiles
set username = coalesce(
  nullif(trim(username), ''),
  nullif(split_part(email, '@', 1), ''),
  'user_' || left(user_id::text, 8)
)
where username is null or trim(username) = '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
begin
  insert into public.profiles (user_id, username, email, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'user_' || left(new.id::text, 8)
    ),
    new.email,
    'user'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$function$;

update public.profiles
set username = coalesce(
  nullif(trim(username), ''),
  nullif(split_part(email, '@', 1), ''),
  'user_' || left(user_id::text, 8)
)
where username is null or trim(username) = '';

alter table public.profiles
alter column username set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_not_blank'
  ) then
    alter table public.profiles
      add constraint profiles_username_not_blank
      check (char_length(trim(username)) > 0);
  end if;
end $$;
