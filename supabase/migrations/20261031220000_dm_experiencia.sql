-- Experiencia: quien dirige la partida reparte PX a los personajes que juegan en ella.
-- La experiencia y el nivel se guardan en la ficha (datos.xp, datos.nivel); al llegar al umbral del SRD el personaje sube de nivel solo.
create or replace function public.dm_dar_experiencia(p uuid, pjs uuid[], cantidad integer, motivo text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  umbrales int[] := array[0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
  g public.dm_partidas;
  x uuid;
  pj public.dm_personajes;
  xp int;
  nivel int;
  nuevo int;
  nombres text[] := '{}';
  suben text[] := '{}';
  res jsonb := '[]'::jsonb;
  msg text;
begin
  select * into g from public.dm_partidas where id = p for update;
  if not found then raise exception 'partida_no_encontrada'; end if;
  if g.creador is distinct from (select auth.uid()) then raise exception 'Solo quien dirige la partida puede dar experiencia'; end if;
  if cantidad is null or cantidad < 1 or cantidad > 100000 then raise exception 'La experiencia tiene que ser entre 1 y 100000'; end if;
  if pjs is null or cardinality(pjs) = 0 then raise exception 'Elige al menos un personaje'; end if;
  foreach x in array pjs loop
    if not exists (select 1 from public.dm_participantes where partida_id = p and personaje_id = x) then raise exception 'Ese personaje no juega en esta partida'; end if;
    select * into pj from public.dm_personajes where id = x for update;
    xp := coalesce(nullif(pj.datos->>'xp', '')::int, 0) + cantidad;
    nivel := greatest(1, coalesce(nullif(pj.datos->>'nivel', '')::int, 1));
    nuevo := nivel;
    while nuevo < 20 and xp >= umbrales[nuevo + 1] loop nuevo := nuevo + 1; end loop;
    update public.dm_personajes set datos = coalesce(datos, '{}'::jsonb) || jsonb_build_object('xp', xp, 'nivel', nuevo) where id = x;
    nombres := nombres || pj.nombre;
    if nuevo > nivel then suben := suben || (pj.nombre || ' sube a nivel ' || nuevo); end if;
    res := res || jsonb_build_object('pj', x, 'xp', xp, 'nivel', nuevo, 'antes', nivel);
  end loop;
  msg := '**Experiencia' || coalesce(': ' || nullif(trim(motivo), ''), '') || '.** +' || cantidad || ' PX para ' || array_to_string(nombres, ', ') || '.'
    || case when cardinality(suben) > 0 then ' **¡' || array_to_string(suben, '! ¡') || '!**' else '' end;
  update public.dm_partidas set log = coalesce(log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('r', 'sys', 't', msg, 'u', g.creador, 'ts', (extract(epoch from clock_timestamp()) * 1000)::bigint)) where id = p;
  return res;
end $$;
revoke all on function public.dm_dar_experiencia(uuid, uuid[], integer, text) from public, anon;
grant execute on function public.dm_dar_experiencia(uuid, uuid[], integer, text) to authenticated;
