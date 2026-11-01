-- Armería compartida: cualquiera crea armas (dado de daño, bonificaciones, precio); todos las ven, solo su autor las edita.
create table public.dm_armas (
  id uuid primary key default gen_random_uuid(),
  autor uuid not null default auth.uid() references public.dm_perfiles(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 60),
  datos jsonb not null default '{}'::jsonb,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index dm_armas_autor_idx on public.dm_armas(autor);
alter table public.dm_armas enable row level security;
create policy "armas visibles" on public.dm_armas for select to authenticated using ((select dm_priv.es_jugador()));
create policy "crear arma" on public.dm_armas for insert to authenticated with check (autor = (select auth.uid()));
create policy "editar mi arma" on public.dm_armas for update to authenticated using (autor = (select auth.uid())) with check (autor = (select auth.uid()));
create policy "borrar mi arma" on public.dm_armas for delete to authenticated using (autor = (select auth.uid()));
create trigger dm_armas_t before update on public.dm_armas for each row execute function public.dm_tocar();
alter publication supabase_realtime add table public.dm_armas;

-- Recompensas: quien dirige da a cada personaje su experiencia, oro y objetos (van a su inventario, datos.inventario).
-- Con terminar = true, además cierra la partida (datos.terminada) y acaba el combate.
create or replace function public.dm_dar_recompensas(p uuid, items jsonb, motivo text default '', terminar boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  umbrales int[] := array[0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
  g public.dm_partidas;
  it jsonb;
  ob jsonb;
  x uuid;
  pj public.dm_personajes;
  dxp int; doro int; xp int; nivel int; nuevo int;
  inv jsonb; objs jsonb; nombresObj text[];
  partes text[];
  lineas text[] := '{}';
  res jsonb := '[]'::jsonb;
  msg text;
begin
  select * into g from public.dm_partidas where id = p for update;
  if not found then raise exception 'partida_no_encontrada'; end if;
  if g.creador is distinct from (select auth.uid()) then raise exception 'Solo quien dirige la partida puede dar recompensas'; end if;
  if items is null or jsonb_typeof(items) <> 'array' then items := '[]'::jsonb; end if;
  if jsonb_array_length(items) > 30 then raise exception 'Demasiados personajes'; end if;
  for it in select * from jsonb_array_elements(items) loop
    x := (it->>'pj')::uuid;
    if not exists (select 1 from public.dm_participantes where partida_id = p and personaje_id = x) then raise exception 'Ese personaje no juega en esta partida'; end if;
    dxp := coalesce(nullif(it->>'xp', '')::int, 0);
    doro := coalesce(nullif(it->>'oro', '')::int, 0);
    objs := coalesce(it->'objetos', '[]'::jsonb);
    if jsonb_typeof(objs) <> 'array' then objs := '[]'::jsonb; end if;
    if dxp < 0 or dxp > 100000 then raise exception 'La experiencia tiene que ser entre 0 y 100000'; end if;
    if doro < 0 or doro > 1000000 then raise exception 'El oro tiene que ser entre 0 y 1000000'; end if;
    if jsonb_array_length(objs) > 20 then raise exception 'Demasiados objetos de una vez'; end if;
    if dxp = 0 and doro = 0 and jsonb_array_length(objs) = 0 then continue; end if;
    select * into pj from public.dm_personajes where id = x for update;
    xp := coalesce(nullif(pj.datos->>'xp', '')::int, 0) + dxp;
    nivel := greatest(1, coalesce(nullif(pj.datos->>'nivel', '')::int, 1));
    nuevo := nivel;
    while nuevo < 20 and xp >= umbrales[nuevo + 1] loop nuevo := nuevo + 1; end loop;
    inv := coalesce(pj.datos->'inventario', '{}'::jsonb);
    if jsonb_typeof(inv) <> 'object' then inv := '{}'::jsonb; end if;
    nombresObj := '{}';
    for ob in select * from jsonb_array_elements(objs) loop
      if char_length(coalesce(ob->>'nombre', '')) not between 1 and 80 then raise exception 'Cada objeto necesita un nombre (hasta 80 letras)'; end if;
      nombresObj := nombresObj || (case when coalesce((ob->>'cant')::int, 1) > 1 then (ob->>'cant') || ' × ' else '' end || (ob->>'nombre'));
    end loop;
    inv := inv || jsonb_build_object('oro', coalesce(nullif(inv->>'oro', '')::int, 0) + doro,
                                     'objetos', coalesce(inv->'objetos', '[]'::jsonb) || objs);
    update public.dm_personajes set datos = coalesce(datos, '{}'::jsonb) || jsonb_build_object('xp', xp, 'nivel', nuevo, 'inventario', inv) where id = x;
    partes := '{}';
    if dxp > 0 then partes := partes || ('+' || dxp || ' PX'); end if;
    if doro > 0 then partes := partes || (doro || ' po'); end if;
    if cardinality(nombresObj) > 0 then partes := partes || array_to_string(nombresObj, ', '); end if;
    lineas := lineas || ('**' || pj.nombre || ':** ' || array_to_string(partes, ' · ') || case when nuevo > nivel then '. **¡Sube a nivel ' || nuevo || '!**' else '' end);
    res := res || jsonb_build_object('pj', x, 'xp', xp, 'nivel', nuevo, 'antes', nivel, 'inventario', inv);
  end loop;
  if cardinality(lineas) = 0 and not terminar then raise exception 'No hay nada que dar'; end if;
  msg := case when terminar then '**Fin de la partida' else '**Recompensas' end || coalesce(': ' || nullif(trim(motivo), ''), '') || '.**'
      || case when cardinality(lineas) > 0 then E'\n' || array_to_string(lineas, E'\n') else '' end;
  update public.dm_partidas set
    log = coalesce(log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('r', 'sys', 't', msg, 'u', g.creador, 'ts', (extract(epoch from clock_timestamp()) * 1000)::bigint)),
    datos = case when terminar then coalesce(datos, '{}'::jsonb) || jsonb_build_object('terminada', to_jsonb(now())) else datos end,
    combate = case when terminar then '{}'::jsonb else combate end
  where id = p;
  return res;
end $$;
revoke all on function public.dm_dar_recompensas(uuid, jsonb, text, boolean) from public, anon;
grant execute on function public.dm_dar_recompensas(uuid, jsonb, text, boolean) to authenticated;
