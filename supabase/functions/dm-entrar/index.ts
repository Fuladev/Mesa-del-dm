// Función dm-entrar: inicia sesión con nombre de usuario + contraseña.
// Busca el correo en el servidor para no exponer nunca los correos de nadie.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "metodo" }, 405);

  let usuario = "", clave = "";
  try { ({ usuario, clave } = await req.json()); } catch { return json({ error: "peticion" }, 400); }
  usuario = String(usuario || "").trim();
  clave = String(clave || "");
  if (!usuario || !clave || usuario.length > 24) return json({ error: "credenciales" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  let { data: perfil } = await admin.from("dm_perfiles").select("id").eq("usuario", usuario).maybeSingle();
  if (!perfil) {
    // Sin distinguir mayúsculas, solo si hay una única coincidencia
    const { data: parecidos } = await admin.from("dm_perfiles").select("id").ilike("usuario", usuario.replace(/[%_\\]/g, "\\$&")).limit(2);
    if (parecidos?.length === 1) perfil = parecidos[0];
  }

  let email: string | undefined;
  if (perfil) {
    const { data: u } = await admin.auth.admin.getUserById(perfil.id);
    email = u?.user?.email;
  } else {
    // Cuenta recién creada que aún no ha entrado nunca: el nombre está en los metadatos
    const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const iguales = (lista?.users || []).filter((x) => String(x.user_metadata?.usuario || "").toLowerCase() === usuario.toLowerCase());
    if (iguales.length === 1) email = iguales[0].email;
  }
  // Misma respuesta si el usuario no existe o la clave falla: no se revela qué cuentas existen
  if (!email) return json({ error: "credenciales" }, 401);

  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password: clave });
  if (error) {
    if (/confirm/i.test(error.message)) return json({ error: "sin_confirmar" }, 401);
    if (error.status === 429) return json({ error: "rate_limited" }, 429);
    return json({ error: "credenciales" }, 401);
  }
  return json({ access_token: data.session!.access_token, refresh_token: data.session!.refresh_token });
});
