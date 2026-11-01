-- Grimorio compartido: cualquiera crea hechizos (nivel, clases que pueden usarlo, daño o curación); todos los ven, solo su autor los edita.
create table public.dm_hechizos (
  id uuid primary key default gen_random_uuid(),
  autor uuid not null default auth.uid() references public.dm_perfiles(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 60),
  datos jsonb not null default '{}'::jsonb,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index dm_hechizos_autor_idx on public.dm_hechizos(autor);
alter table public.dm_hechizos enable row level security;
create policy "hechizos visibles" on public.dm_hechizos for select to authenticated using ((select dm_priv.es_jugador()));
create policy "crear hechizo" on public.dm_hechizos for insert to authenticated with check (autor = (select auth.uid()));
create policy "editar mi hechizo" on public.dm_hechizos for update to authenticated using (autor = (select auth.uid())) with check (autor = (select auth.uid()));
create policy "borrar mi hechizo" on public.dm_hechizos for delete to authenticated using (autor = (select auth.uid()));
create trigger dm_hechizos_t before update on public.dm_hechizos for each row execute function public.dm_tocar();
alter publication supabase_realtime add table public.dm_hechizos;
