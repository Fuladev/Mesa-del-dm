// Función dm-ia: puente seguro entre la web y la API de Claude.
// La clave de Anthropic vive como secreto (ANTHROPIC_API_KEY) y nunca llega al navegador.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const MODELO = "claude-opus-5-5";
const LIMITE_DIARIO = 200;          // llamadas por usuario y día
const MAX_ENTRADA = 400_000;        // caracteres de system + mensajes
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const fallo = (error: string, status: number, mensaje = "") => json({ error, mensaje }, status);

const TOOL_DADOS = {
  name: "tirar_dados",
  description: "Tira dados reales para monstruos, PNJ o efectos del DM. Úsala siempre que necesites un resultado aleatorio; nunca inventes tiradas.",
  input_schema: {
    type: "object",
    properties: {
      notacion: { type: "string", description: "Notación de dados, por ejemplo 1d20+5, 2d6+3 o 1d20 con ventaja como 2d20kh1" },
      motivo: { type: "string", description: "Para qué es la tirada, por ejemplo: ataque del esqueleto contra Thorga" },
    },
    required: ["notacion", "motivo"],
  },
};

function dado(caras: number) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return (a[0] % caras) + 1;
}
function tirar(notacion: string) {
  const src = String(notacion || "").toLowerCase().replace(/\s+/g, "").replace(/d%/g, "d100");
  const re = /([+-])?(?:(\d*)d(\d+)(k[hl]\d+)?|(\d+))/g;
  let m: RegExpExecArray | null, pos = 0, total = 0, natural: number | null = null;
  const partes: string[] = [];
  while ((m = re.exec(src))) {
    if (m.index !== pos || m[0] === "") break;
    pos = re.lastIndex;
    const signo = m[1] === "-" ? -1 : 1;
    if (m[3]) {
      const n = Math.min(50, +(m[2] || 1)), caras = Math.min(1000, Math.max(2, +m[3]));
      const tiradas = Array.from({ length: n }, () => dado(caras));
      let usadas = tiradas.slice();
      if (m[4]) {
        const k = +m[4].slice(2), alto = m[4][1] === "h";
        usadas = tiradas.slice().sort((x, y) => (alto ? y - x : x - y)).slice(0, k);
      }
      const suma = usadas.reduce((a, b) => a + b, 0);
      if (caras === 20 && natural === null && (n === 1 || (m[4] && usadas.length === 1))) natural = usadas[0];
      total += signo * suma;
      partes.push(`${signo < 0 ? "−" : partes.length ? "+" : ""}${n}d${caras}${m[4] || ""} [${tiradas.join(", ")}]`);
    } else {
      total += signo * +m[5];
      partes.push(`${signo < 0 ? "−" : "+"}${m[5]}`);
    }
  }
  if (!partes.length || pos !== src.length) throw new Error("Notación no válida: " + notacion);
  return { total, detalle: partes.join(" "), natural };
}

type Msg = { role: "user" | "assistant"; content: unknown };
function normalizar(msgs: unknown): Msg[] {
  const out: Msg[] = [];
  for (const m of Array.isArray(msgs) ? msgs : []) {
    const role = (m as any)?.role === "assistant" ? "assistant" : "user";
    const texto = String((m as any)?.content ?? "").trim();
    if (!texto) continue;
    const ult = out[out.length - 1];
    if (ult && ult.role === role) ult.content = `${ult.content}\n\n${texto}`;
    else out.push({ role, content: texto });
  }
  while (out.length && out[0].role !== "user") out.shift();
  if (!out.length || out[out.length - 1].role !== "user") out.push({ role: "user", content: "Continúa." });
  return out;
}
const textoDe = (content: any[]) => content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fallo("metodo", 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return fallo("sin_clave", 500);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: auth, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !auth?.user) return fallo("no_autorizado", 401);

  let body: any;
  try { body = await req.json(); } catch { return fallo("peticion", 400, "JSON no válido"); }
  const modo = ["dm", "texto", "json"].includes(body?.modo) ? body.modo : "texto";
  const esfuerzo = ["low", "medium", "high"].includes(body?.esfuerzo) ? body.esfuerzo : "medium";
  const system = typeof body?.system === "string" ? body.system : undefined;
  const messages: any[] = normalizar(body?.messages);
  if ((system?.length || 0) + JSON.stringify(messages).length > MAX_ENTRADA) return fallo("demasiado_largo", 413);

  const { error: usoErr } = await admin.rpc("dm_registrar_uso", { uid: auth.user.id, limite: LIMITE_DIARIO });
  if (usoErr) {
    const m = usoErr.message || "";
    if (m.includes("limite_diario")) return fallo("limite_diario", 429);
    if (m.includes("sin_perfil")) return fallo("sin_perfil", 403);
    return fallo("upstream", 500, m);
  }

  const client = new Anthropic({ apiKey });
  const usarDados = modo === "dm" && body?.dados === true;
  const tiradas: unknown[] = [];
  try {
    for (let ronda = 0; ronda < 6; ronda++) {
      const res: any = await client.beta.messages
        .stream({
          model: MODELO,
          max_tokens: modo === "json" ? 16000 : 8000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: esfuerzo },
          ...(system ? { system } : {}),
          ...(usarDados ? { tools: [TOOL_DADOS] } : {}),
          messages,
        } as any)
        .finalMessage();

      if (res.stop_reason === "refusal") return fallo("refused", 422);
      if (res.stop_reason !== "tool_use") return json({ texto: textoDe(res.content), tiradas });

      messages.push({ role: "assistant", content: res.content });
      const resultados = [];
      for (const b of res.content) {
        if (b.type !== "tool_use") continue;
        try {
          const r = tirar(b.input?.notacion);
          tiradas.push({ notacion: b.input.notacion, motivo: b.input.motivo || "", detalle: r.detalle, total: r.total, natural: r.natural });
          resultados.push({ type: "tool_result", tool_use_id: b.id, content: `${b.input.notacion}: ${r.detalle} = ${r.total}` });
        } catch (e) {
          resultados.push({ type: "tool_result", tool_use_id: b.id, content: String((e as Error).message), is_error: true });
        }
      }
      messages.push({ role: "user", content: resultados });
    }
    return json({ texto: "(El DM se ha liado con los dados. Pídele que continúe.)", tiradas });
  } catch (e: any) {
    const status = e?.status;
    if (status === 429 || status === 529) return fallo("rate_limited", 429);
    if (status === 401) return fallo("sin_clave", 500, "La clave de Anthropic no es válida.");
    return fallo("upstream", 502, String(e?.message || e).slice(0, 300));
  }
});
