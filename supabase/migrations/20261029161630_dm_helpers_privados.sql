-- Las funciones auxiliares pasan a un esquema no expuesto por la API
create schema if not exists dm_priv;
revoke all on schema dm_priv from public;
grant usage on schema dm_priv to authenticated, service_role;

create or replace function dm_priv.es_jugador() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dm_perfiles where id = (select auth.uid()));
$$;
create or replace function dm_priv.en_partida(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dm_participantes where partida_id = p and usuario_id = (select auth.uid()))
      or exists (select 1 from public.dm_partidas where id = p and creador = (select auth.uid()));
$$;
revoke all on function dm_priv.es_jugador() from public;
revoke all on function dm_priv.en_partida(uuid) from public;
grant execute on function dm_priv.es_jugador() to authenticated;
grant execute on function dm_priv.en_partida(uuid) to authenticated;

alter policy "facciones visibles" on public.dm_facciones using ((select dm_priv.es_jugador()));
alter policy "participantes visibles" on public.dm_participantes using ((select dm_priv.es_jugador()));
alter policy "partidas visibles" on public.dm_partidas using ((select dm_priv.es_jugador()));
alter policy "crear partida" on public.dm_partidas with check (creador = (select auth.uid()) and (select dm_priv.es_jugador()));
alter policy "jugar partida" on public.dm_partidas using ((select dm_priv.en_partida(id))) with check ((select dm_priv.en_partida(id)));
alter policy "perfiles visibles" on public.dm_perfiles using ((select dm_priv.es_jugador()) or id = (select auth.uid()));
alter policy "personajes visibles" on public.dm_personajes using ((select dm_priv.es_jugador()));

-- Contador de uso diario: solo lo llama la función dm-ia con la clave de servicio
create or replace function public.dm_registrar_uso(uid uuid, limite integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not exists (select 1 from public.dm_perfiles where id = uid) then raise exception 'sin_perfil'; end if;
  insert into public.dm_uso(usuario_id, dia, llamadas) values (uid, current_date, 1)
  on conflict (usuario_id, dia) do update set llamadas = public.dm_uso.llamadas + 1
  returning llamadas into n;
  if n > limite then raise exception 'limite_diario'; end if;
  return n;
end $$;
revoke all on function public.dm_registrar_uso(uuid, integer) from public, anon, authenticated;
grant execute on function public.dm_registrar_uso(uuid, integer) to service_role;

-- Las versiones antiguas quedan sin permiso de ejecución
revoke all on function public.dm_es_jugador() from public, anon, authenticated;
revoke all on function public.dm_en_partida(uuid) from public, anon, authenticated;
revoke all on function public.dm_registrar_uso(integer) from public, anon, authenticated;
