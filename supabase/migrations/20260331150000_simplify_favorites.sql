-- Simplifica favoritos: solo relacion usuario <-> pokemon

alter table public.favorites
  drop column if exists pokemon_name;

alter table public.favorites
  drop column if exists note;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'favorites_pokemon_id_positive'
      and conrelid = 'public.favorites'::regclass
  ) then
    alter table public.favorites
      add constraint favorites_pokemon_id_positive
      check (pokemon_id > 0);
  end if;
end $$;

create unique index if not exists favorites_unique_user_pokemon
on public.favorites using btree (user_id, pokemon_id);

drop policy if exists "favorites_delete_admin" on public.favorites;
drop policy if exists "favorites_select_admin" on public.favorites;
drop policy if exists "favorites_update_admin" on public.favorites;
drop policy if exists "favorites_update_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;
drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;

create policy "favorites_select_own"
on public.favorites
as permissive
for select
to authenticated
using (auth.uid() = user_id);

create policy "favorites_insert_own"
on public.favorites
as permissive
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "favorites_delete_own"
on public.favorites
as permissive
for delete
to authenticated
using (auth.uid() = user_id);

revoke all on table public.favorites from anon;
revoke all on table public.favorites from authenticated;
grant select, insert, delete on table public.favorites to authenticated;

revoke all on sequence public.favorites_id_seq from anon;
grant usage, select on sequence public.favorites_id_seq to authenticated;
