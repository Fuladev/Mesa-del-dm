-- Tras un ataque, el turno pasa solo. Lo puede pedir quien dirige o el dueño del personaje que tiene el turno.
-- Salta a los enemigos derrotados y anuncia el nuevo turno en el chat.
create or replace function public.dm_pasar_turno(p uuid, desde text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  g public.dm_partidas;
  orden jsonb;
  n int;
  t int;
  ronda int;
  i int;
  a jsonb;
  dueno text;
  msg text;
begin
  select * into g from public.dm_partidas where id = p for update;
  if not found then raise exception 'partida_no_encontrada'; end if;
  if not coalesce((g.combate->>'activo')::boolean, false) then return g.combate; end if;
  orden := coalesce(g.combate->'orden', '[]'::jsonb);
  n := jsonb_array_length(orden);
  t := coalesce((g.combate->>'turno')::int, -1);
  ronda := coalesce((g.combate->>'ronda')::int, 1);
  if n = 0 or t < 0 or t >= n then return g.combate; end if;
  -- Solo pasa si el turno sigue siendo de quien atacó (evita saltos dobles)
  if orden->t->>'id' is distinct from desde then return g.combate; end if;
  if uid is distinct from g.creador and not exists (
    select 1 from public.dm_participantes where partida_id = p and usuario_id = uid and personaje_id::text = desde) then
    raise exception 'No puedes pasar este turno';
  end if;
  for i in 1..n loop
    t := t + 1;
    if t >= n then t := 0; ronda := ronda + 1; end if;
    a := orden->t;
    exit when a->>'tipo' <> 'enemigo' or coalesce((a->>'pg')::int, 1) > 0;
  end loop;
  if a->>'tipo' = 'pj' then
    select pf.usuario into dueno from public.dm_personajes pj join public.dm_perfiles pf on pf.id = pj.dueno where pj.id::text = a->>'id';
  end if;
  msg := '**Ronda ' || ronda || ' · turno de ' || coalesce(a->>'nombre', '?') || '**' || coalesce(' (' || dueno || ')', '');
  perform set_config('dm.aplicar_dano', '1', true);
  update public.dm_partidas
    set combate = combate || jsonb_build_object('turno', t, 'ronda', ronda),
        log = coalesce(log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('r', 'sys', 't', msg, 'ts', (extract(epoch from clock_timestamp()) * 1000)::bigint))
    where id = p returning * into g;
  perform set_config('dm.aplicar_dano', '', true);
  return g.combate;
end $$;
revoke all on function public.dm_pasar_turno(uuid, text) from public, anon;
grant execute on function public.dm_pasar_turno(uuid, text) to authenticated;
