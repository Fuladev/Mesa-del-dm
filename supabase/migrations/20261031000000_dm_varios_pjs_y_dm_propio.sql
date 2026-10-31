-- Cada usuario puede llevar varios personajes a la misma partida (antes, uno solo)
alter table public.dm_participantes drop constraint dm_participantes_pkey;
alter table public.dm_participantes add primary key (partida_id, personaje_id);
create index if not exists dm_participantes_usuario on public.dm_participantes (partida_id, usuario_id);

-- Partidas con DM propio: añadir mensajes al registro de forma atómica, sin pasar por la IA.
-- Se ejecuta con los permisos de quien llama, así que la política "jugar partida" sigue decidiendo quién puede.
create or replace function public.dm_anadir_log(p uuid, msgs jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  limpios jsonb := '[]'::jsonb;
  m jsonb;
  g public.dm_partidas;
  nuevo jsonb;
begin
  if uid is null then raise exception 'no_autorizado'; end if;
  if jsonb_typeof(msgs) <> 'array' or jsonb_array_length(msgs) = 0 or jsonb_array_length(msgs) > 10 then raise exception 'mensajes_invalidos'; end if;
  select * into g from public.dm_partidas where id = p;
  if not found then raise exception 'partida_no_encontrada'; end if;
  for m in select value from jsonb_array_elements(msgs) loop
    if coalesce(m->>'r','') not in ('dm','user','sys') or length(coalesce(m->>'t','')) = 0 or length(m->>'t') > 8000 then raise exception 'mensaje_invalido'; end if;
    -- Solo quien dirige narra como DM o tira por los enemigos
    if m->>'r' in ('dm','sys') and g.creador is distinct from uid then raise exception 'Solo quien dirige la partida puede narrar como DM'; end if;
    -- Un jugador solo habla con sus propios personajes de esta partida
    if m->>'r' = 'user' and not exists (select 1 from public.dm_participantes x where x.partida_id = p and x.usuario_id = uid and x.personaje_id = (m->>'pj')::uuid) then
      raise exception 'Ese personaje no es tuyo o no está en la partida';
    end if;
    limpios := limpios || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'r', m->>'r', 't', m->>'t', 'u', uid, 'pj', case when m->>'r' = 'user' then m->>'pj' end,
      'ts', (extract(epoch from clock_timestamp()) * 1000)::bigint)));
  end loop;
  update public.dm_partidas set log = coalesce(log, '[]'::jsonb) || limpios where id = p returning log into nuevo;
  if nuevo is null then raise exception 'No tienes permiso para escribir en esta partida'; end if;
  return nuevo;
end $$;
revoke all on function public.dm_anadir_log(uuid, jsonb) from public, anon;
grant execute on function public.dm_anadir_log(uuid, jsonb) to authenticated;
