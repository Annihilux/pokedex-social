create or replace function public.get_comments_with_public_profiles(requested_pokemon_id integer)
returns table (
  id bigint,
  user_id uuid,
  pokemon_id integer,
  content text,
  created_at timestamptz,
  username text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    c.id,
    c.user_id,
    c.pokemon_id,
    c.content,
    c.created_at,
    coalesce(p.username, 'usuario') as username,
    p.avatar_url
  from public.comments c
  left join public.profiles p on p.user_id = c.user_id
  where c.pokemon_id = requested_pokemon_id
  order by c.created_at desc;
$function$;

grant execute on function public.get_comments_with_public_profiles(integer) to anon;
grant execute on function public.get_comments_with_public_profiles(integer) to authenticated;
grant execute on function public.get_comments_with_public_profiles(integer) to service_role;

create or replace function public.get_all_comments_with_public_profiles()
returns table (
  id bigint,
  user_id uuid,
  pokemon_id integer,
  content text,
  created_at timestamptz,
  username text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    c.id,
    c.user_id,
    c.pokemon_id,
    c.content,
    c.created_at,
    coalesce(p.username, 'usuario') as username,
    p.avatar_url
  from public.comments c
  left join public.profiles p on p.user_id = c.user_id
  order by c.created_at desc;
$function$;

grant execute on function public.get_all_comments_with_public_profiles() to anon;
grant execute on function public.get_all_comments_with_public_profiles() to authenticated;
grant execute on function public.get_all_comments_with_public_profiles() to service_role;
