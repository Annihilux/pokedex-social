-- Conteo global de favoritos por pokemon sin exponer user_id

create index if not exists favorites_pokemon_id_idx
on public.favorites using btree (pokemon_id);

create or replace function public.get_favorites_counts(requested_pokemon_ids integer[])
returns table (pokemon_id integer, favorites_count bigint)
language sql
stable
security definer
set search_path = public
as $function$
  select
    f.pokemon_id,
    count(*)::bigint as favorites_count
  from public.favorites f
  where f.pokemon_id = any (coalesce(requested_pokemon_ids, array[]::integer[]))
  group by f.pokemon_id;
$function$;

revoke all on function public.get_favorites_counts(integer[]) from public;
grant execute on function public.get_favorites_counts(integer[]) to anon;
grant execute on function public.get_favorites_counts(integer[]) to authenticated;
grant execute on function public.get_favorites_counts(integer[]) to service_role;
