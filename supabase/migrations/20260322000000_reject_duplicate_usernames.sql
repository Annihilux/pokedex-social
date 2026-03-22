create or replace function public.is_username_available(requested_username text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  normalized_username text;
begin
  normalized_username := public.sanitize_username(requested_username);

  if normalized_username is null then
    return false;
  end if;

  if char_length(normalized_username) < 3 or char_length(normalized_username) > 30 then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles p
    where lower(p.username) = lower(normalized_username)
  );
end;
$function$;

grant execute on function public.is_username_available(text) to anon;
grant execute on function public.is_username_available(text) to authenticated;
grant execute on function public.is_username_available(text) to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
declare
  resolved_username text;
  fallback_suffix text;
begin
  fallback_suffix := left(replace(new.id::text, '-', ''), 8);
  resolved_username := public.sanitize_username(new.raw_user_meta_data ->> 'username');

  if resolved_username is null then
    resolved_username := public.sanitize_username(split_part(coalesce(new.email, ''), '@', 1));
  end if;

  if resolved_username is null then
    resolved_username := 'user_' || fallback_suffix;
  end if;

  if char_length(resolved_username) < 3 then
    resolved_username := left(resolved_username || '_' || fallback_suffix, 30);
  end if;

  resolved_username := left(resolved_username, 30);

  if exists (
    select 1
    from public.profiles p
    where lower(p.username) = lower(resolved_username)
      and p.user_id <> new.id
  ) then
    raise exception 'El username ya esta en uso.'
      using errcode = '23505', constraint = 'profiles_username_unique_ci';
  end if;

  insert into public.profiles (user_id, username, email, role)
  values (
    new.id,
    resolved_username,
    new.email,
    'user'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$function$;
