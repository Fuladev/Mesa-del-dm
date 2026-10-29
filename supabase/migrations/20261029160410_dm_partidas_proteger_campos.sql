-- Solo quien creó la partida puede cambiar la campaña (título, modo y contenido)
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
  return new;
end $$;
create trigger dm_partidas_proteger before update on public.dm_partidas for each row execute function public.dm_proteger_partida();
