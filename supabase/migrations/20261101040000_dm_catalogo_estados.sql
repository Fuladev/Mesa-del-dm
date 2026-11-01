-- Catálogo: además de armas (dm_armas) y hechizos (dm_hechizos), armaduras, equipo y pociones (datos.tipo).
create table public.dm_objetos (
  id uuid primary key default gen_random_uuid(),
  autor uuid not null default auth.uid() references public.dm_perfiles(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 60),
  datos jsonb not null default '{}'::jsonb,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index dm_objetos_autor_idx on public.dm_objetos(autor);
alter table public.dm_objetos enable row level security;
create policy "objetos visibles" on public.dm_objetos for select to authenticated using ((select dm_priv.es_jugador()));
create policy "crear objeto" on public.dm_objetos for insert to authenticated with check (autor = (select auth.uid()));
create policy "editar mi objeto" on public.dm_objetos for update to authenticated using (autor = (select auth.uid())) with check (autor = (select auth.uid()));
create policy "borrar mi objeto" on public.dm_objetos for delete to authenticated using (autor = (select auth.uid()));
create trigger dm_objetos_t before update on public.dm_objetos for each row execute function public.dm_tocar();
alter publication supabase_realtime add table public.dm_objetos;

-- Tira dados en el servidor ("2d6+3"); para el daño de los estados (sangrado, veneno, fuego…)
create or replace function dm_priv.tirar(n text) returns integer
language plpgsql volatile set search_path = '' as $$
declare m text[]; tot int := 0; i int; k int; c int; f int;
begin
  for m in select regexp_matches(lower(replace(coalesce(n, ''), ' ', '')), '([+-]?)(\d*)d(\d+)|([+-]?)(\d+)', 'g') loop
    if m[3] is not null then
      c := least(greatest(coalesce(nullif(m[2], '')::int, 1), 1), 50); f := least(greatest(m[3]::int, 2), 1000); k := 0;
      for i in 1..c loop k := k + 1 + floor(random() * f)::int; end loop;
      tot := tot + case when m[1] = '-' then -k else k end;
    else
      tot := tot + case when m[4] = '-' then -m[5]::int else m[5]::int end;
    end if;
  end loop;
  return greatest(tot, 0);
end $$;
revoke all on function dm_priv.tirar(text) from public;

-- Pasar turno: además, al empezar el turno de cada uno se aplican sus estados (daño por turno, duración)
-- y quien está paralizado, aturdido o dormido pierde el turno.
create or replace function public.dm_pasar_turno(p uuid, desde text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  g public.dm_partidas;
  orden jsonb; pgact jsonb; msgs jsonb := '[]'::jsonb;
  n int; t int; ronda int; i int; vueltas int := 0;
  a jsonb; e jsonb; nuevos jsonb;
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
    incap := null; nuevos := '[]'::jsonb;
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
        msgs := msgs || jsonb_build_object('r', 'sys', 'ts', ts, 't', nom || ' ya no está ' || lower(coalesce(e->>'nombre', 'afectado')) || '.');
      end if;
    end loop;
    a := jsonb_set(a, '{estados}', nuevos);
    orden := jsonb_set(orden, array[t::text], a);
    if a->>'tipo' = 'enemigo' and coalesce((a->>'pg')::int, 0) <= 0 then continue; end if;
    if incap is not null then
      msgs := msgs || jsonb_build_object('r', 'sys', 'ts', ts, 't', '**' || nom || ' está ' || incap || ' y pierde el turno.**');
      continue;
    end if;
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

-- Pone (o quita, con rondas = 0) un estado a quien está en el combate. Lo usa quien juega al acertar con un arma o un hechizo que lo causa.
create or replace function public.dm_aplicar_estado(p uuid, objetivo text, estado jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g public.dm_partidas; idx int; e jsonb; lista jsonb; nombre text; rondas int; dano text;
begin
  if not (select dm_priv.en_partida(p)) then raise exception 'No juegas en esta partida'; end if;
  select * into g from public.dm_partidas where id = p for update;
  select (o.i - 1)::int, o.v into idx, e from jsonb_array_elements(coalesce(g.combate->'orden', '[]'::jsonb)) with ordinality as o(v, i) where o.v->>'id' = objetivo;
  if idx is null then raise exception 'Ese objetivo no está en el combate'; end if;
  nombre := left(trim(coalesce(estado->>'nombre', '')), 30);
  if char_length(nombre) < 2 then raise exception 'El estado necesita un nombre'; end if;
  rondas := least(greatest(coalesce((estado->>'rondas')::int, 1), 0), 10);
  dano := nullif(trim(coalesce(estado->>'dano', '')), '');
  if dano is not null and dano !~ '^[0-9dD+ -]{1,20}$' then raise exception 'Daño del estado no válido'; end if;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into lista from jsonb_array_elements(coalesce(e->'estados', '[]'::jsonb)) x where x->>'nombre' is distinct from nombre;
  if rondas > 0 then
    lista := lista || jsonb_build_object('nombre', nombre, 'rondas', rondas, 'dano', dano, 'tipoDano', left(coalesce(estado->>'tipoDano', ''), 20),
      'incapacita', coalesce((estado->>'incapacita')::boolean, false), 'ventajaContra', coalesce((estado->>'ventajaContra')::boolean, false), 'desventaja', coalesce((estado->>'desventaja')::boolean, false));
  end if;
  perform set_config('dm.aplicar_dano', '1', true);
  update public.dm_partidas set combate = jsonb_set(combate, array['orden', idx::text, 'estados'], lista) where id = p returning * into g;
  perform set_config('dm.aplicar_dano', '', true);
  return g.combate;
end $$;
revoke all on function public.dm_aplicar_estado(uuid, text, jsonb) from public, anon;
grant execute on function public.dm_aplicar_estado(uuid, text, jsonb) to authenticated;

-- Huir: quien huye sale del orden de combate. Un jugador solo puede hacer huir a su personaje; quien dirige, a cualquiera.
create or replace function public.dm_huir(p uuid, quien text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid()); g public.dm_partidas; orden jsonb; idx int; t int; n int; e jsonb;
begin
  select * into g from public.dm_partidas where id = p for update;
  if not found then raise exception 'partida_no_encontrada'; end if;
  if uid is distinct from g.creador and not exists (
    select 1 from public.dm_participantes where partida_id = p and usuario_id = uid and personaje_id::text = quien) then
    raise exception 'Solo puedes hacer huir a tu personaje';
  end if;
  orden := coalesce(g.combate->'orden', '[]'::jsonb);
  select (o.i - 1)::int, o.v into idx, e from jsonb_array_elements(orden) with ordinality as o(v, i) where o.v->>'id' = quien;
  if idx is null then return g.combate; end if;
  t := coalesce((g.combate->>'turno')::int, -1);
  orden := orden - idx;
  n := jsonb_array_length(orden);
  if idx < t then t := t - 1; end if;
  if t >= n then t := case when n = 0 then -1 else 0 end; end if;
  perform set_config('dm.aplicar_dano', '1', true);
  update public.dm_partidas
    set combate = combate || jsonb_build_object('orden', orden, 'turno', t),
        log = coalesce(log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('r', 'sys', 't', '**' || coalesce(e->>'nombre', '?') || ' huye del combate.**', 'ts', (extract(epoch from clock_timestamp()) * 1000)::bigint))
    where id = p returning * into g;
  perform set_config('dm.aplicar_dano', '', true);
  return g.combate;
end $$;
revoke all on function public.dm_huir(uuid, text) from public, anon;
grant execute on function public.dm_huir(uuid, text) to authenticated;
