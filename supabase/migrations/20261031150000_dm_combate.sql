-- Combate en la mesa: orden de turnos, enemigos y sus PG (visible para todo el grupo)
alter table public.dm_partidas add column if not exists combate jsonb not null default '{}'::jsonb;

-- Solo quien dirige cambia el combate; los jugadores solo pueden hacer daño a través de dm_aplicar_dano
create or replace function public.dm_proteger_partida() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.creador is distinct from old.creador then
    raise exception 'No se puede cambiar el creador de la partida';
  end if;
  if (select auth.uid()) is distinct from old.creador and
     (new.titulo is distinct from old.titulo or new.modo is distinct from old.modo or new.datos is distinct from old.datos) then
    raise exception 'Solo quien creó la partida puede cambiar la campaña';
  end if;
  if (select auth.uid()) is distinct from old.creador and new.combate is distinct from old.combate
     and coalesce(current_setting('dm.aplicar_dano', true), '') <> '1' then
    raise exception 'Solo quien dirige la partida puede cambiar el combate';
  end if;
  return new;
end $$;

-- Aplica daño (cantidad > 0) o curación (cantidad < 0) a un personaje o a un enemigo del combate.
-- Devuelve los PG que le quedan. Cualquiera que juegue en la partida puede usarla.
create or replace function public.dm_aplicar_dano(p uuid, objetivo text, cantidad integer, maximo integer default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  g public.dm_partidas;
  idx int;
  e jsonb;
  actual int;
  tope int;
  nuevo int;
begin
  if not (select dm_priv.en_partida(p)) then raise exception 'No juegas en esta partida'; end if;
  if abs(cantidad) > 1000 then raise exception 'cantidad_invalida'; end if;
  select * into g from public.dm_partidas where id = p for update;
  if exists (select 1 from public.dm_participantes where partida_id = p and personaje_id::text = objetivo) then
    if maximo is null or maximo < 1 or maximo > 1000 then raise exception 'maximo_invalido'; end if;
    actual := coalesce((g.pg_act->>objetivo)::int, maximo);
    nuevo := greatest(0, least(maximo, actual - cantidad));
    update public.dm_partidas set pg_act = coalesce(pg_act, '{}'::jsonb) || jsonb_build_object(objetivo, nuevo) where id = p;
    return nuevo;
  end if;
  select (o.i - 1)::int, o.v into idx, e
    from jsonb_array_elements(coalesce(g.combate->'orden', '[]'::jsonb)) with ordinality as o(v, i)
    where o.v->>'id' = objetivo and o.v->>'tipo' = 'enemigo';
  if idx is null then raise exception 'Ese objetivo no está en el combate'; end if;
  tope := coalesce((e->>'pgMax')::int, (e->>'pg')::int, 0);
  nuevo := greatest(0, least(tope, coalesce((e->>'pg')::int, tope) - cantidad));
  perform set_config('dm.aplicar_dano', '1', true);
  update public.dm_partidas set combate = jsonb_set(combate, array['orden', idx::text, 'pg'], to_jsonb(nuevo)) where id = p;
  perform set_config('dm.aplicar_dano', '', true);
  return nuevo;
end $$;
revoke all on function public.dm_aplicar_dano(uuid, text, integer, integer) from public, anon;
grant execute on function public.dm_aplicar_dano(uuid, text, integer, integer) to authenticated;
