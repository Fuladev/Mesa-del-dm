-- Cada jugador escribe la iniciativa de sus propios personajes (dados físicos) sin depender del DM
create or replace function public.dm_poner_iniciativa(p uuid, pj uuid, dado integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g public.dm_partidas;
  idx int;
begin
  if dado is null or dado < 1 or dado > 20 then raise exception 'El d20 tiene que ser un número del 1 al 20'; end if;
  if not exists (select 1 from public.dm_participantes where partida_id = p and personaje_id = pj and usuario_id = (select auth.uid())) then
    raise exception 'Ese personaje no es tuyo o no está en la partida';
  end if;
  select * into g from public.dm_partidas where id = p for update;
  select (o.i - 1)::int into idx
    from jsonb_array_elements(coalesce(g.combate->'orden', '[]'::jsonb)) with ordinality as o(v, i)
    where o.v->>'id' = pj::text and o.v->>'tipo' = 'pj';
  if idx is null then raise exception 'Tu personaje no está en el combate'; end if;
  perform set_config('dm.aplicar_dano', '1', true);
  update public.dm_partidas set combate = jsonb_set(combate, array['orden', idx::text, 'dado'], to_jsonb(dado)) where id = p returning * into g;
  perform set_config('dm.aplicar_dano', '', true);
  return g.combate;
end $$;
revoke all on function public.dm_poner_iniciativa(uuid, uuid, integer) from public, anon;
grant execute on function public.dm_poner_iniciativa(uuid, uuid, integer) to authenticated;
