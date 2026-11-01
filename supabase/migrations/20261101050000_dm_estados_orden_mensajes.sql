-- Pasar turno: los avisos de «ya no está…» van después de «pierde el turno», que se lee mejor.
create or replace function public.dm_pasar_turno(p uuid, desde text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  g public.dm_partidas;
  orden jsonb; pgact jsonb; msgs jsonb := '[]'::jsonb;
  n int; t int; ronda int; i int; vueltas int := 0;
  a jsonb; e jsonb; nuevos jsonb; fin jsonb;
  dmg int; pg int; incap text; dueno text; nom text;
  ts bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  select * into g from public.dm_partidas where id = p for update;
  if not found then raise exception 'partida_no_encontrada'; end if;
  if not coalesce((g.combate->>'activo')::boolean, false) then return g.combate; end if;
  orden := coalesce(g.combate->'orden', '[]'::jsonb);
  pgact := coalesce(g.pg_act, '{}'::jsonb);
  n := jsonb_array_length(orden);
  t := coalesce((g.combate->>'turno')::int, -1);
  ronda := coalesce((g.combate->>'ronda')::int, 1);
  if n = 0 or t < 0 or t >= n then return g.combate; end if;
  if orden->t->>'id' is distinct from desde then return g.combate; end if;
  if uid is distinct from g.creador and not exists (
    select 1 from public.dm_participantes where partida_id = p and usuario_id = uid and personaje_id::text = desde) then
    raise exception 'No puedes pasar este turno';
  end if;
  loop
    vueltas := vueltas + 1;
    for i in 1..n loop
      t := t + 1;
      if t >= n then t := 0; ronda := ronda + 1; end if;
      a := orden->t;
      exit when a->>'tipo' <> 'enemigo' or coalesce((a->>'pg')::int, 1) > 0;
    end loop;
    exit when vueltas > n * 3;
    nom := coalesce(a->>'nombre', '?');
    incap := null; nuevos := '[]'::jsonb; fin := '[]'::jsonb;
    for e in select * from jsonb_array_elements(coalesce(a->'estados', '[]'::jsonb)) loop
      if coalesce(e->>'dano', '') <> '' then
        dmg := dm_priv.tirar(e->>'dano');
        if a->>'tipo' = 'enemigo' then
          pg := greatest(0, coalesce((a->>'pg')::int, 0) - dmg);
          a := jsonb_set(a, '{pg}', to_jsonb(pg));
        else
          pg := greatest(0, coalesce((pgact->>(a->>'id'))::int, (a->>'pgMax')::int, 1) - dmg);
          pgact := pgact || jsonb_build_object(a->>'id', pg);
        end if;
        msgs := msgs || jsonb_build_object('r', 'sys', 'ts', ts, 't', nom || ' sufre ' || dmg || ' de daño' || coalesce(' ' || nullif(e->>'tipoDano', ''), '')
          || ' (' || lower(coalesce(e->>'nombre', 'estado')) || ').' || case when pg = 0 then ' **' || nom || ' cae.**' when a->>'tipo' = 'pj' then ' Le quedan ' || pg || ' PG.' else '' end);
      end if;
      if coalesce((e->>'incapacita')::boolean, false) and incap is null then incap := lower(coalesce(e->>'nombre', 'incapacitado')); end if;
      if coalesce((e->>'rondas')::int, 1) > 1 then
        nuevos := nuevos || jsonb_set(e, '{rondas}', to_jsonb((e->>'rondas')::int - 1));
      else
        fin := fin || jsonb_build_object('r', 'sys', 'ts', ts, 't', nom || ' ya no está ' || lower(coalesce(e->>'nombre', 'afectado')) || '.');
      end if;
    end loop;
    a := jsonb_set(a, '{estados}', nuevos);
    orden := jsonb_set(orden, array[t::text], a);
    if a->>'tipo' = 'enemigo' and coalesce((a->>'pg')::int, 0) <= 0 then continue; end if;
    if incap is not null then
      msgs := msgs || jsonb_build_object('r', 'sys', 'ts', ts, 't', '**' || nom || ' está ' || incap || ' y pierde el turno.**') || fin;
      continue;
    end if;
    msgs := msgs || fin;
    exit;
  end loop;
  if a->>'tipo' = 'pj' then
    select pf.usuario into dueno from public.dm_personajes pj join public.dm_perfiles pf on pf.id = pj.dueno where pj.id::text = a->>'id';
  end if;
  msgs := msgs || jsonb_build_object('r', 'sys', 'ts', ts, 't', '**Ronda ' || ronda || ' · turno de ' || coalesce(a->>'nombre', '?') || '**' || coalesce(' (' || dueno || ')', ''));
  perform set_config('dm.aplicar_dano', '1', true);
  update public.dm_partidas
    set combate = combate || jsonb_build_object('orden', orden, 'turno', t, 'ronda', ronda),
        pg_act = pgact,
        log = coalesce(log, '[]'::jsonb) || msgs
    where id = p returning * into g;
  perform set_config('dm.aplicar_dano', '', true);
  return g.combate;
end $$;
revoke all on function public.dm_pasar_turno(uuid, text) from public, anon;
grant execute on function public.dm_pasar_turno(uuid, text) to authenticated;

