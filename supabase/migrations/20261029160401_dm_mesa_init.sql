-- Mesa del DM: tablas propias con prefijo dm_
create table public.dm_perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  usuario text not null unique check (char_length(usuario) between 3 and 24 and usuario ~ '^[A-Za-z0-9_.áéíóúÁÉÍÓÚñÑ-]+$'),
  creado timestamptz not null default now()
);

create table public.dm_facciones (
  id uuid primary key default gen_random_uuid(),
  autor uuid not null default auth.uid() references public.dm_perfiles(id) on delete cascade,
  tipo text not null check (tipo in ('raza','faccion')),
  nombre text not null check (char_length(nombre) between 2 and 60),
  datos jsonb not null default '{}'::jsonb,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index dm_facciones_autor_idx on public.dm_facciones(autor);

create table public.dm_personajes (
  id uuid primary key default gen_random_uuid(),
  dueno uuid not null default auth.uid() references public.dm_perfiles(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 80),
  raza_id uuid references public.dm_facciones(id) on delete set null,
  faccion_id uuid references public.dm_facciones(id) on delete set null,
  datos jsonb not null default '{}'::jsonb,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index dm_personajes_dueno_idx on public.dm_personajes(dueno);
create index dm_personajes_raza_idx on public.dm_personajes(raza_id);
create index dm_personajes_faccion_idx on public.dm_personajes(faccion_id);

create table public.dm_partidas (
  id uuid primary key default gen_random_uuid(),
  creador uuid not null default auth.uid() references public.dm_perfiles(id) on delete cascade,
  titulo text not null,
  modo text not null default 'ia' check (modo in ('ia','humano')),
  datos jsonb not null default '{}'::jsonb,
  log jsonb not null default '[]'::jsonb,
  resumen text not null default '',
  resumen_idx int not null default 0,
  usados jsonb not null default '{}'::jsonb,
  pg_act jsonb not null default '{}'::jsonb,
  aprendiz boolean not null default true,
  escribiendo uuid,
  escribiendo_ts timestamptz,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index dm_partidas_creador_idx on public.dm_partidas(creador);

-- Un personaje por usuario y partida: la clave primaria lo garantiza
create table public.dm_participantes (
  partida_id uuid not null references public.dm_partidas(id) on delete cascade,
  usuario_id uuid not null default auth.uid() references public.dm_perfiles(id) on delete cascade,
  personaje_id uuid not null references public.dm_personajes(id) on delete cascade,
  unido timestamptz not null default now(),
  primary key (partida_id, usuario_id)
);
create index dm_participantes_personaje_idx on public.dm_participantes(personaje_id);
create index dm_participantes_usuario_idx on public.dm_participantes(usuario_id);

-- Notas privadas del DM humano (solo las ve quien las escribe)
create table public.dm_asesor (
  partida_id uuid not null references public.dm_partidas(id) on delete cascade,
  usuario_id uuid not null default auth.uid() references public.dm_perfiles(id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now(),
  primary key (partida_id, usuario_id)
);
create index dm_asesor_usuario_idx on public.dm_asesor(usuario_id);

-- Uso diario de la IA por usuario (límite de gasto)
create table public.dm_uso (
  usuario_id uuid not null references public.dm_perfiles(id) on delete cascade,
  dia date not null default current_date,
  llamadas int not null default 0,
  primary key (usuario_id, dia)
);

alter table public.dm_perfiles enable row level security;
alter table public.dm_facciones enable row level security;
alter table public.dm_personajes enable row level security;
alter table public.dm_partidas enable row level security;
alter table public.dm_participantes enable row level security;
alter table public.dm_asesor enable row level security;
alter table public.dm_uso enable row level security;

-- ¿Es jugador de la mesa? (tiene perfil)
create or replace function public.dm_es_jugador() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dm_perfiles where id = (select auth.uid()));
$$;
create or replace function public.dm_en_partida(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dm_participantes where partida_id = p and usuario_id = (select auth.uid()))
      or exists (select 1 from public.dm_partidas where id = p and creador = (select auth.uid()));
$$;
revoke execute on function public.dm_es_jugador() from anon, public;
revoke execute on function public.dm_en_partida(uuid) from anon, public;
grant execute on function public.dm_es_jugador() to authenticated;
grant execute on function public.dm_en_partida(uuid) to authenticated;

-- Perfiles: todos los jugadores ven los nombres; cada uno crea/edita el suyo
create policy "perfiles visibles" on public.dm_perfiles for select to authenticated using ((select public.dm_es_jugador()) or id = (select auth.uid()));
create policy "crear mi perfil" on public.dm_perfiles for insert to authenticated with check (id = (select auth.uid()));
create policy "editar mi perfil" on public.dm_perfiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Facciones: todos las ven y usan; solo el autor edita o borra
create policy "facciones visibles" on public.dm_facciones for select to authenticated using ((select public.dm_es_jugador()));
create policy "crear faccion" on public.dm_facciones for insert to authenticated with check (autor = (select auth.uid()));
create policy "editar mi faccion" on public.dm_facciones for update to authenticated using (autor = (select auth.uid())) with check (autor = (select auth.uid()));
create policy "borrar mi faccion" on public.dm_facciones for delete to authenticated using (autor = (select auth.uid()));

-- Personajes: todos los ven; solo el dueño edita o borra
create policy "personajes visibles" on public.dm_personajes for select to authenticated using ((select public.dm_es_jugador()));
create policy "crear personaje" on public.dm_personajes for insert to authenticated with check (dueno = (select auth.uid()));
create policy "editar mi personaje" on public.dm_personajes for update to authenticated using (dueno = (select auth.uid())) with check (dueno = (select auth.uid()));
create policy "borrar mi personaje" on public.dm_personajes for delete to authenticated using (dueno = (select auth.uid()));

-- Partidas: todos las ven; el creador y los participantes avanzan la historia; solo el creador borra
create policy "partidas visibles" on public.dm_partidas for select to authenticated using ((select public.dm_es_jugador()));
create policy "crear partida" on public.dm_partidas for insert to authenticated with check (creador = (select auth.uid()) and (select public.dm_es_jugador()));
create policy "jugar partida" on public.dm_partidas for update to authenticated using ((select public.dm_en_partida(id))) with check ((select public.dm_en_partida(id)));
create policy "borrar mi partida" on public.dm_partidas for delete to authenticated using (creador = (select auth.uid()));

-- Participantes: cada usuario se une con UNO de sus propios personajes
create policy "participantes visibles" on public.dm_participantes for select to authenticated using ((select public.dm_es_jugador()));
create policy "unirme" on public.dm_participantes for insert to authenticated with check (
  usuario_id = (select auth.uid())
  and exists (select 1 from public.dm_personajes p where p.id = personaje_id and p.dueno = (select auth.uid())));
create policy "cambiar mi personaje" on public.dm_participantes for update to authenticated using (usuario_id = (select auth.uid())) with check (
  usuario_id = (select auth.uid())
  and exists (select 1 from public.dm_personajes p where p.id = personaje_id and p.dueno = (select auth.uid())));
create policy "salir" on public.dm_participantes for delete to authenticated using (
  usuario_id = (select auth.uid())
  or exists (select 1 from public.dm_partidas g where g.id = partida_id and g.creador = (select auth.uid())));

-- Asesor: privado
create policy "mi asesor" on public.dm_asesor for all to authenticated using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));

-- Uso: cada uno ve el suyo; se escribe solo con la función
create policy "mi uso" on public.dm_uso for select to authenticated using (usuario_id = (select auth.uid()));

create or replace function public.dm_registrar_uso(limite int default 200) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not exists (select 1 from public.dm_perfiles where id = (select auth.uid())) then
    raise exception 'sin_perfil';
  end if;
  insert into public.dm_uso(usuario_id, dia, llamadas) values ((select auth.uid()), current_date, 1)
  on conflict (usuario_id, dia) do update set llamadas = public.dm_uso.llamadas + 1
  returning llamadas into n;
  if n > limite then raise exception 'limite_diario'; end if;
  return n;
end $$;
revoke execute on function public.dm_registrar_uso(int) from anon, public;
grant execute on function public.dm_registrar_uso(int) to authenticated;

-- Marcas de tiempo
create or replace function public.dm_tocar() returns trigger language plpgsql set search_path = '' as $$
begin new.actualizado = now(); return new; end $$;
create trigger dm_facciones_t before update on public.dm_facciones for each row execute function public.dm_tocar();
create trigger dm_personajes_t before update on public.dm_personajes for each row execute function public.dm_tocar();
create trigger dm_partidas_t before update on public.dm_partidas for each row execute function public.dm_tocar();
create trigger dm_asesor_t before update on public.dm_asesor for each row execute function public.dm_tocar();

-- Que los cambios lleguen en vivo a los demás jugadores
alter publication supabase_realtime add table public.dm_perfiles, public.dm_facciones, public.dm_personajes, public.dm_partidas, public.dm_participantes;
