drop extension if exists "pg_net";

create sequence "public"."comments_id_seq";

create sequence "public"."favorites_id_seq";


  create table "public"."comments" (
    "id" bigint not null default nextval('public.comments_id_seq'::regclass),
    "user_id" uuid not null,
    "pokemon_id" integer not null,
    "content" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."comments" enable row level security;


  create table "public"."favorites" (
    "id" bigint not null default nextval('public.favorites_id_seq'::regclass),
    "user_id" uuid not null,
    "pokemon_id" integer not null,
    "pokemon_name" text not null,
    "note" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."favorites" enable row level security;


  create table "public"."profiles" (
    "user_id" uuid not null,
    "email" text,
    "role" text not null default 'user'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."profiles" enable row level security;

alter sequence "public"."comments_id_seq" owned by "public"."comments"."id";

alter sequence "public"."favorites_id_seq" owned by "public"."favorites"."id";

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE UNIQUE INDEX favorites_pkey ON public.favorites USING btree (id);

CREATE UNIQUE INDEX favorites_unique_user_pokemon ON public.favorites USING btree (user_id, pokemon_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (user_id);

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

alter table "public"."favorites" add constraint "favorites_pkey" PRIMARY KEY using index "favorites_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."comments" add constraint "comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_user_id_fkey";

alter table "public"."favorites" add constraint "favorites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."favorites" validate constraint "favorites_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (user_id, email, role)
  values (new.id, new.email, 'user')
  on conflict (user_id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  );
$function$
;

grant delete on table "public"."comments" to "anon";

grant insert on table "public"."comments" to "anon";

grant references on table "public"."comments" to "anon";

grant select on table "public"."comments" to "anon";

grant trigger on table "public"."comments" to "anon";

grant truncate on table "public"."comments" to "anon";

grant update on table "public"."comments" to "anon";

grant delete on table "public"."comments" to "authenticated";

grant insert on table "public"."comments" to "authenticated";

grant references on table "public"."comments" to "authenticated";

grant select on table "public"."comments" to "authenticated";

grant trigger on table "public"."comments" to "authenticated";

grant truncate on table "public"."comments" to "authenticated";

grant update on table "public"."comments" to "authenticated";

grant delete on table "public"."comments" to "service_role";

grant insert on table "public"."comments" to "service_role";

grant references on table "public"."comments" to "service_role";

grant select on table "public"."comments" to "service_role";

grant trigger on table "public"."comments" to "service_role";

grant truncate on table "public"."comments" to "service_role";

grant update on table "public"."comments" to "service_role";

grant delete on table "public"."favorites" to "anon";

grant insert on table "public"."favorites" to "anon";

grant references on table "public"."favorites" to "anon";

grant select on table "public"."favorites" to "anon";

grant trigger on table "public"."favorites" to "anon";

grant truncate on table "public"."favorites" to "anon";

grant update on table "public"."favorites" to "anon";

grant delete on table "public"."favorites" to "authenticated";

grant insert on table "public"."favorites" to "authenticated";

grant references on table "public"."favorites" to "authenticated";

grant select on table "public"."favorites" to "authenticated";

grant trigger on table "public"."favorites" to "authenticated";

grant truncate on table "public"."favorites" to "authenticated";

grant update on table "public"."favorites" to "authenticated";

grant delete on table "public"."favorites" to "service_role";

grant insert on table "public"."favorites" to "service_role";

grant references on table "public"."favorites" to "service_role";

grant select on table "public"."favorites" to "service_role";

grant trigger on table "public"."favorites" to "service_role";

grant truncate on table "public"."favorites" to "service_role";

grant update on table "public"."favorites" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";


  create policy "comments_delete_admin"
  on "public"."comments"
  as permissive
  for delete
  to public
using (public.is_admin());



  create policy "comments_delete_own"
  on "public"."comments"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "comments_insert_own"
  on "public"."comments"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "comments_select_all"
  on "public"."comments"
  as permissive
  for select
  to public
using (true);



  create policy "comments_update_admin"
  on "public"."comments"
  as permissive
  for update
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "comments_update_own"
  on "public"."comments"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "favorites_delete_admin"
  on "public"."favorites"
  as permissive
  for delete
  to public
using (public.is_admin());



  create policy "favorites_insert_own"
  on "public"."favorites"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "favorites_select_admin"
  on "public"."favorites"
  as permissive
  for select
  to public
using (public.is_admin());



  create policy "favorites_select_own"
  on "public"."favorites"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "favorites_update_admin"
  on "public"."favorites"
  as permissive
  for update
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "profiles_select_admin"
  on "public"."profiles"
  as permissive
  for select
  to public
using (public.is_admin());



  create policy "profiles_select_own"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "profiles_update_admin"
  on "public"."profiles"
  as permissive
  for update
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "profiles_update_own"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


