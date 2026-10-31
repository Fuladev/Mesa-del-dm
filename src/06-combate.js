/* ==================== COMBATE EN LA MESA ==================== */
// Orden de turnos, enemigos con sus PG, daño que se aplica solo, calculadora de encuentros y dados físicos.
// El estado vive en dm_partidas.combate (solo quien dirige lo cambia; el daño de los jugadores pasa por dm_aplicar_dano).

// PX por valor de desafío y umbrales por nivel (SRD 5.1)
const XP_VD = {"0":10,"1/8":25,"1/4":50,"1/2":100,"1":200,"2":450,"3":700,"4":1100,"5":1800,"6":2300,"7":2900,"8":3900,"9":5000,"10":5900};
const UMBRALES = [null,[25,50,75,100],[50,100,150,200],[75,150,225,400],[125,250,375,500],[250,500,750,1100],[300,600,900,1400],[350,750,1100,1700],[450,900,1400,2100],[550,1100,1600,2400],[600,1200,1900,2800],[800,1600,2400,3600],[1000,2000,3000,4500],[1100,2200,3400,5100],[1250,2500,3800,5700],[1400,2800,4300,6400],[1600,3200,4800,7200],[2000,3900,5900,8800],[2100,4200,6300,9500],[2400,4900,7300,10900],[2800,5700,8500,12700]];
const MULT_ENC = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
// Monstruos del SRD habituales a nivel bajo: CA, PG, bonificador de ataque, daño del ataque principal y modificador de iniciativa
const MONSTRUOS = [
  {n:"Rata gigante", vd:"1/8", ca:12, pg:7, at:4, dano:"1d4+2", mod:2},
  {n:"Kobold", vd:"1/8", ca:12, pg:5, at:4, dano:"1d4+2", mod:2},
  {n:"Bandido", vd:"1/8", ca:12, pg:11, at:3, dano:"1d6+1", mod:1},
  {n:"Cultista", vd:"1/8", ca:12, pg:9, at:3, dano:"1d6+1", mod:1},
  {n:"Cangrejo gigante", vd:"1/8", ca:15, pg:13, at:3, dano:"1d6+1", mod:2},
  {n:"Goblin", vd:"1/4", ca:15, pg:7, at:4, dano:"1d6+2", mod:2},
  {n:"Esqueleto", vd:"1/4", ca:13, pg:13, at:4, dano:"1d6+2", mod:2},
  {n:"Zombi", vd:"1/4", ca:8, pg:22, at:3, dano:"1d6+1", mod:-2},
  {n:"Lobo", vd:"1/4", ca:13, pg:11, at:4, dano:"2d4+2", mod:2},
  {n:"Orco", vd:"1/2", ca:13, pg:15, at:5, dano:"1d12+3", mod:1},
  {n:"Hobgoblin", vd:"1/2", ca:18, pg:11, at:3, dano:"1d8+1", mod:1},
  {n:"Sombra", vd:"1/2", ca:12, pg:16, at:4, dano:"2d6+2", mod:2},
  {n:"Gnoll", vd:"1/2", ca:15, pg:22, at:4, dano:"1d6+2", mod:1},
  {n:"Osgo", vd:"1", ca:16, pg:27, at:4, dano:"2d8+2", mod:2},
  {n:"Necrófago", vd:"1", ca:12, pg:22, at:2, dano:"2d6+2", mod:2},
  {n:"Lobo terrible", vd:"1", ca:14, pg:37, at:5, dano:"2d6+3", mod:2},
  {n:"Araña gigante", vd:"1", ca:14, pg:26, at:5, dano:"1d8+3", mod:3},
  {n:"Oso pardo", vd:"1", ca:11, pg:34, at:6, dano:"2d6+4", mod:0},
  {n:"Ogro", vd:"2", ca:11, pg:59, at:6, dano:"2d8+4", mod:-1},
  {n:"Capitán bandido", vd:"2", ca:15, pg:65, at:5, dano:"1d6+3", mod:3},
  {n:"Gárgola", vd:"2", ca:15, pg:52, at:4, dano:"1d6+2", mod:0},
  {n:"Mímico", vd:"2", ca:12, pg:58, at:5, dano:"1d8+3", mod:1},
  {n:"Tumulario", vd:"3", ca:14, pg:45, at:4, dano:"1d8+2", mod:2},
  {n:"Oso lechuza", vd:"3", ca:13, pg:59, at:7, dano:"2d8+5", mod:1},
  {n:"Mantícora", vd:"3", ca:14, pg:68, at:5, dano:"1d8+3", mod:3},
  {n:"Trol", vd:"5", ca:15, pg:84, at:7, dano:"2d6+4", mod:1}
];
const HABILIDADES = {"Acrobacias":"DES","Arcanos":"INT","Atletismo":"FUE","Engaño":"CAR","Historia":"INT","Interpretación":"CAR","Intimidación":"CAR","Investigación":"INT","Juego de manos":"DES","Medicina":"SAB","Naturaleza":"INT","Percepción":"SAB","Perspicacia":"SAB","Persuasión":"CAR","Religión":"INT","Sigilo":"DES","Supervivencia":"SAB","Trato con animales":"SAB"};
const CON_ATAQUE = { FUE:"Arma (Fuerza)", DES:"Arma sutil o a distancia (Destreza)", MAG:"Conjuro de ataque" };
const ATQ_CORTO = { FUE:"arma, Fuerza", DES:"arma, Destreza", MAG:"conjuro" };
const sinTildes = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const compHab = (p, hab) => sinTildes(p.competencias).includes(sinTildes(hab));
const conMagia = p => (CLASES[p.clase]?.pri || ["INT"])[0];
const sgn = n => n ? (n > 0 ? "+" : "−") + Math.abs(n) : "";

/* ---------- estado ---------- */
function cb(c){ const x = c?.combate || {}; return { activo:!!x.activo, ronda:x.ronda || 1, turno:x.turno ?? -1, orden:Array.isArray(x.orden) ? x.orden : [] }; }
const iniTotal = e => e.dado == null || e.dado === "" ? null : +e.dado + (+e.mod || 0);
function pgDe(c, e){ if (e.tipo === "pj"){ const p = pjById(e.id), max = p ? derive(p).pg : 1; return { act:c.pgAct?.[e.id] ?? max, max }; } return { act:+e.pg, max:+e.pgMax || +e.pg }; }
const vivo = (c, e) => e.tipo !== "enemigo" || +e.pg > 0;
function actorActual(c){ const k = cb(c); return k.activo && k.turno >= 0 ? k.orden[k.turno] : null; }
function estadoEnemigo(e){ const r = +e.pg / (+e.pgMax || 1); return +e.pg <= 0 ? "derrotado" : r >= 1 ? "ileso" : r > 0.5 ? "herido" : "malherido"; }
function ordenarIni(orden){ return orden.slice().sort((a,b) => { const x = iniTotal(a), y = iniTotal(b); if (x == null || y == null) return (x == null) - (y == null); return y - x || (+b.mod || 0) - (+a.mod || 0); }); }
function siguienteTurno(c, k){
  const n = k.orden.length; if (!n) return;
  for (let i = 0; i < n; i++){ k.turno++; if (k.turno >= n){ k.turno = 0; k.ronda++; } if (vivo(c, k.orden[k.turno])) break; }
}
function anuncioTurno(k){
  const a = k.orden[k.turno]; if (!a) return [];
  const due = a.tipo === "pj" ? pjById(a.id)?.dueno : null;
  return [{ r:"sys", t:`**Ronda ${k.ronda} · turno de ${a.nombre}**${due ? ` (${nombreUsuario(due)})` : ""}` }];
}

/* ---------- calculadora de encuentros (SRD 5.1) ---------- */
function calcEncuentro(grupo, enemigos){
  const lv = grupo.map(p => Math.min(20, Math.max(1, +p.nivel || 1)));
  const umb = [0,0,0,0]; lv.forEach(l => UMBRALES[l].forEach((v,i) => umb[i] += v));
  const base = enemigos.reduce((a,e) => a + (XP_VD[e.vd] ?? 0), 0), n = enemigos.length;
  let i = n <= 1 ? 1 : n === 2 ? 2 : n <= 6 ? 3 : n <= 10 ? 4 : n <= 14 ? 5 : 6;
  if (lv.length && lv.length < 3) i++; else if (lv.length >= 6) i--;
  const mult = MULT_ENC[Math.max(0, Math.min(7, i))], aj = Math.round(base * mult);
  const nivel = !n || !lv.length ? "" : aj >= umb[3] ? "Mortal" : aj >= umb[2] ? "Difícil" : aj >= umb[1] ? "Media" : aj >= umb[0] ? "Fácil" : "Muy fácil";
  return { umb, base, mult, aj, nivel, porPJ: lv.length ? Math.floor(base / lv.length) : 0 };
}

/* ---------- dados físicos ---------- */
function partesNot(not){
  const src = String(not || "").toLowerCase().replace(/\s+/g, ""), re = /([+-])?(?:(\d*)d(\d+)|(\d+))/g;
  let m, pos = 0, k = 0; const dados = [];
  while ((m = re.exec(src))){
    if (m.index !== pos) break;
    pos = re.lastIndex;
    if (m[3]) dados.push({ n:Math.max(1, +(m[2] || 1)), f:+m[3] }); else k += (m[1] === "-" ? -1 : 1) * +m[4];
  }
  if (!pos || pos !== src.length || !dados.length) throw new Error("No entiendo «" + not + "». Prueba algo como 2d6+3.");
  return { dados, k };
}
// El jugador o el DM tiró dados de verdad: con lo que salió en los dados, la app suma los modificadores
function tiradaFisica(not, valor){
  const { dados, k } = partesNot(not), v = Math.round(+valor);
  const min = dados.reduce((a,d) => a + d.n, 0), max = dados.reduce((a,d) => a + d.n * d.f, 0), dt = dados.map(d => d.n + "d" + d.f).join("+");
  if (valor === "" || valor == null || !Number.isFinite(+valor) || v < min || v > max) throw new Error(`En ${dt} los dados suman entre ${min} y ${max}.`);
  const nat = dados.length === 1 && dados[0].n === 1 && dados[0].f === 20 ? v : null;
  return { total:v + k, detalle:`${dt} [${v}, dado físico]${k ? " " + sgn(k) : ""}`, nat, crit:nat === 20, pifia:nat === 1, notacion:not };
}
// Tira con la app o, si la mesa usa dados físicos, usa lo que se ha escrito que salió en los dados
function tirarCon(c, not, etiqueta, mode="normal", valor=""){
  if (!c?.dadosFisicos) return rollNotation(not, mode);
  if (valor === "" || valor == null){ const dt = partesNot(not).dados.map(d => d.n + "d" + d.f).join("+"); throw new Error(`${etiqueta}: escribe cuánto suman los dados (${dt}).`); }
  return tiradaFisica(not, String(valor).trim());
}
const doblarDados = not => String(not).replace(/(\d*)d(\d+)/gi, (a, n, f) => (2 * (+n || 1)) + "d" + f);
const lineaTirada = r => `${r.notacion} → ${r.detalle} = **${r.total}**${r.crit ? " (¡20 natural!)" : r.pifia ? " (1 natural)" : ""}`;

/* ---------- escritura ---------- */
async function editarCombate(c, fn, msgs){
  if (S.busy) return;
  S.busy = true;
  try {
    const f = await q(sb.from("dm_partidas").select("combate,pg_act").eq("id", c.id).single());
    c.pgAct = f.pg_act || {};
    const k = cb({ combate:f.combate }); fn(k);
    await q(sb.from("dm_partidas").update({ combate:k }).eq("id", c.id));
    c.combate = k;
    const m = typeof msgs === "function" ? msgs(k) : msgs;
    if (m?.length) await anadirLog(c, m);
  } catch (e) { toast(esc(errorTexto(e))); }
  S.busy = false; render();
}
async function aplicarDano(c, objetivo, cantidad){
  const p = pjById(objetivo), maximo = p ? derive(p).pg : null;
  const nuevo = await q(sb.rpc("dm_aplicar_dano", { p:c.id, objetivo, cantidad, maximo }));
  if (p) c.pgAct = { ...c.pgAct, [objetivo]: nuevo };
  else { const k = cb(c); const e = k.orden.find(x => x.id === objetivo); if (e) e.pg = nuevo; c.combate = k; }
  return nuevo;
}
function trasDano(c, objetivo, nuevo){
  const p = pjById(objetivo);
  if (p){ const max = derive(p).pg; return `${p.nombre}: **${nuevo}/${max} PG**.${nuevo <= 0 ? ` ${p.nombre} cae inconsciente: en su turno hace salvaciones contra la muerte.` : ""}`; }
  const e = cb(c).orden.find(x => x.id === objetivo); if (!e) return "";
  return nuevo <= 0 ? `**${e.nombre} cae derrotado.**` : `${e.nombre} queda ${estadoEnemigo(e)}.`;
}

/* ---------- vistas ---------- */

/* ---------- la ficha manda: modificadores de cada tirada ---------- */
function modTirada(p, tipo){
  const d = derive(p), [cl, x] = tipo.split(":");
  if (cl === "hab"){ const k = HABILIDADES[x], comp = compHab(p, x); return { mod:modOf(d.sc[k]) + (comp ? d.prof : 0), nombre:x, comp }; }
  if (cl === "sv"){ const comp = d.sv.includes(x); return { mod:modOf(d.sc[x]) + (comp ? d.prof : 0), nombre:`Salvación de ${AB_N[x]}`, comp }; }
  if (cl === "car") return { mod:modOf(d.sc[x]), nombre:AB_N[x] };
  if (cl === "ini") return { mod:d.ini, nombre:"Iniciativa" };
  if (cl === "muerte") return { mod:0, nombre:"Salvación contra la muerte" };
  const car = x === "MAG" ? conMagia(p) : x; return { mod:modOf(d.sc[car]) + d.prof, nombre:`Ataque (${ATQ_CORTO[x]})`, car };
}
function opcionesTirada({ ini=false, ataques=false, muerte=false, p=null } = {}){
  const m = t => p ? ` (${sgn(modTirada(p, t).mod) || "+0"}${modTirada(p, t).comp ? ", competente" : ""})` : "";
  return `<optgroup label="Habilidades">${Object.keys(HABILIDADES).map(h => `<option value="hab:${h}">${h}${m("hab:" + h)}</option>`).join("")}</optgroup>
    <optgroup label="Salvaciones">${AB.map(k => `<option value="sv:${k}">Salvación de ${AB_N[k]}${m("sv:" + k)}</option>`).join("")}</optgroup>
    <optgroup label="Características">${AB.map(k => `<option value="car:${k}">${AB_N[k]}${m("car:" + k)}</option>`).join("")}</optgroup>
    ${ini || ataques || muerte ? `<optgroup label="Combate">${ini ? `<option value="ini">Iniciativa${m("ini")}</option>` : ""}${muerte ? `<option value="muerte">Salvación contra la muerte</option>` : ""}${ataques ? Object.entries(CON_ATAQUE).map(([v,t]) => `<option value="at:${v}">Ataque: ${t}${m("at:" + v)}</option>`).join("") : ""}</optgroup>` : ""}`;
}
const esMio = pjId => S.personajes.some(p => p.id === pjId && p.dueno === S.me);
const misPjsEn = c => misParticipaciones(c.id).map(x => pjById(x.personaje_id)).filter(Boolean);
// Peticiones de tirada del DM que siguen sin resolver, con el personaje al que van dirigidas
function pendientesDe(c){
  const grupo = grupoDe(c.id), out = [];
  (c.log || []).forEach((m, i) => {
    if (m.r !== "dm") return;
    let n = 0;
    String(m.t).replace(/\[\[\s*tirada\s*:\s*([^\]|]+?)\s*(?:\|\s*([^\]|]*?)\s*)?(?:\|\s*([^\]|]*?)\s*)?\]\]/gi, (all, not, lab, cd) => {
      const key = i + ":" + (n++); if (c.usados?.[key]) return all;
      const l = lab || "", nom = (l.match(/\(([^)]+)\)\s*$/) || [])[1] || "";
      const pj = nom ? grupo.find(p => sinTildes(p.nombre) === sinTildes(nom) || sinTildes(p.nombre.split(" ")[0]) === sinTildes(nom.split(" ")[0])) : null;
      out.push({ key, not:not.trim(), lab:l, cd:cd || "", pj:pj || null });
      return all;
    });
  });
  return out;
}
const veredicto = (cd, total, nat) => { const n = +((String(cd).match(/\d+/) || [])[0]); if (!n) return ""; const ca = /ca/i.test(cd);
  if (ca) return nat === 20 ? ` contra CA ${n}: ¡crítico!` : nat === 1 ? ` contra CA ${n}: falla.` : ` contra CA ${n}: ${total >= n ? "impacta" : "falla"}.`;
  return ` contra CD ${n}: ${total >= n ? "éxito" : "fallo"}.`; };
// Publica la tirada de un jugador: con DM propio va directa al chat; con la IA se añade al mensaje
async function publicar(c, pjId, linea){
  const box = $("#play-in"), desc = (box?.value || S.draft || "").trim();
  if (!dmHumano(c)){ const v = (desc ? desc + "\n" : "") + linea; S.draft = v; if (box) box.value = v; toast("Añadido a tu mensaje: pulsa Enviar cuando estéis listos."); return; }
  await anadirLog(c, [{ r:"user", t:(desc ? desc + "\n" : "") + linea, pj:pjId }]);
  S.draft = "";
}
async function marcarUsado(c, key, total){
  c.usados = { ...c.usados, [key]: String(total) };
  try { const f = await q(sb.from("dm_partidas").select("usados").eq("id", c.id).single()); await q(sb.from("dm_partidas").update({ usados:{ ...(f.usados || {}), [key]:String(total) } }).eq("id", c.id)); } catch {}
}
async function resolverPeticion(c, req, valor){
  if (S.busy) return;
  const mode = /desventaja/i.test(req.lab) ? "desventaja" : /ventaja/i.test(req.lab) ? "ventaja" : "normal";
  let r; try { r = tirarCon(c, req.not, req.lab || req.not, mode, valor); } catch (e) { toast(esc(e.message)); return; }
  const pjId = req.pj?.id || vozActual(c);
  const linea = `Tirada de ${req.lab || req.not}: ${req.not} → ${r.detalle} = ${r.total}${r.crit ? " (¡20 natural!)" : r.pifia ? " (1 natural)" : ""}${veredicto(req.cd, r.total, r.nat)}`;
  S.busy = true;
  try { await marcarUsado(c, req.key, r.total); await publicar(c, pjId, linea); } catch (e) { toast(esc(errorTexto(e))); }
  S.busy = false; render();
}
// Tirada que el jugador decide hacer por su cuenta (habilidad, salvación, iniciativa…), calculada con su ficha
async function tiradaLibre(c){
  const p = pjById(vozActual(c)), tipo = $("#pl-tipo")?.value; if (!p || !tipo) return;
  const { mod, nombre, comp } = modTirada(p, tipo), not = `1d20${sgn(mod)}`;
  let r; try { r = tirarCon(c, not, nombre, S.trayMode, $("#pl-d20")?.value); } catch (e) { toast(esc(e.message)); return; }
  let extra = "";
  S.busy = true;
  try {
    if (tipo === "ini"){ const e = cb(c).orden.find(o => o.id === p.id); if (cb(c).activo && e) c.combate = await q(sb.rpc("dm_poner_iniciativa", { p:c.id, pj:p.id, dado:r.nat ?? Math.max(1, Math.min(20, r.total - mod)) })); }
    if (tipo === "muerte"){
      if (r.nat === 20){ const nuevo = await aplicarDano(c, p.id, -1); extra = ` **¡20 natural! ${p.nombre} recupera 1 PG y se levanta** (${nuevo} PG).`; }
      else extra = r.nat === 1 ? " **1 natural: cuenta como dos fallos.**" : r.total >= 10 ? " **Éxito.** (Con 3 éxitos se estabiliza.)" : " **Fallo.** (Con 3 fallos, muere.)";
    }
    await publicar(c, p.id, `Tirada de ${nombre} (${p.nombre})${comp ? ", con competencia" : ""}: ${lineaTirada(r)}${extra}`);
    if ($("#pl-d20")) $("#pl-d20").value = "";
  } catch (e) { toast(esc(errorTexto(e))); }
  S.busy = false; render();
}
async function iniciativaJugador(c, pjId, valor){
  const p = pjById(pjId); if (!p) return;
  const mod = derive(p).ini;
  let r; try { r = tirarCon(c, `1d20${sgn(mod)}`, `Iniciativa de ${p.nombre}`, "normal", valor); } catch (e) { toast(esc(e.message)); return; }
  S.busy = true;
  try { c.combate = await q(sb.rpc("dm_poner_iniciativa", { p:c.id, pj:p.id, dado:r.nat })); await anadirLog(c, [{ r:"user", t:`Iniciativa de ${p.nombre}: ${lineaTirada(r)}`, pj:p.id }]); }
  catch (e) { toast(esc(errorTexto(e))); }
  S.busy = false; render();
}

/* ---------- vistas ---------- */
// Cartel de turnos que ve todo el mundo en el chat. Los jugadores solo ven si un enemigo está herido, no sus PG.
function combateBanner(c, voz){
  const k = cb(c); if (!k.activo) return "";
  const dm = voz === "dm", act = actorActual(c);
  const mio = act?.tipo === "pj" && esMio(act.id);
  const chips = k.orden.map((e,i) => { const { act:a, max } = pgDe(c, e), info = e.tipo === "pj" || dm ? `${a}/${max}` : estadoEnemigo(e);
    return `<span class="ord ${i === k.turno ? "now" : ""} ${a <= 0 ? "ko" : ""} ${e.tipo}"><b>${esc(e.nombre)}</b> <span class="mono">${iniTotal(e) ?? "–"}</span> <span class="small">${esc(String(info))}</span></span>`; }).join("");
  const faltan = k.orden.filter(e => e.tipo === "pj" && e.dado == null).map(e => e.nombre);
  const titulo = k.turno < 0 ? `Combate: tirando iniciativa${faltan.length ? ` (faltan ${esc(faltan.join(", "))})` : ""}` : mio ? `¡Te toca con ${esc(act.nombre)}!` : `Ronda ${k.ronda} · turno de ${esc(act?.nombre || "?")}${act?.tipo === "pj" ? ` (${esc(nombreUsuario(pjById(act.id)?.dueno))})` : ""}`;
  return `<div class="turno-banner ${mio ? "mio" : ""}" role="status"><b>${titulo}</b><div class="orden-strip">${chips}</div></div>`;
}
// PG de los personajes del usuario, siempre a la vista junto al chat
function misPG(c){
  const mios = misPjsEn(c); if (!mios.length) return "";
  return `<div class="pg-chips"><span class="small muted">Tus personajes:</span>${mios.map(p => { const max = derive(p).pg, a = c.pgAct?.[p.id] ?? max, pct = a / max;
    return `<span class="pg-chip ${a <= 0 ? "ko" : pct <= .25 ? "bad" : pct <= .5 ? "warn" : ""}"><b>${esc(p.nombre.split(" ")[0])}</b> <span class="mono">${a}/${max} PG</span>${a <= 0 ? " · inconsciente" : ""}</span>`; }).join("")}</div>`;
}
const inputDado = (attrs, ph="d20") => `<input type="number" class="mono dado-in" ${attrs} min="1" max="200" placeholder="${ph}" inputmode="numeric">`;
// Lo que el jugador tiene que hacer ahora: tiradas que le pide el DM, su iniciativa y su ataque, con los dados físicos escritos ahí mismo
function accionesJugador(c, pjId){
  const fis = !!c.dadosFisicos, k = cb(c), out = [];
  for (const req of pendientesDe(c).filter(r => r.pj && esMio(r.pj.id))){
    out.push(`<div class="accion"><div><b>El DM pide a ${esc(req.pj.nombre)}:</b> ${esc(req.lab.replace(/\s*\([^)]*\)\s*$/, "") || "una tirada")} <span class="mono small">${esc(req.not)}${req.cd ? " · " + esc(req.cd) : ""}</span></div>
      <div class="row">${fis ? inputDado(`data-pet-val="${req.key}" aria-label="Lo que ha salido en el d20"`, "¿Qué sacaste?") : ""}<button class="btn sm primary" data-act="cb-pet" data-key="${req.key}" ${S.busy ? "disabled" : ""}>${fis ? "Calcular y enviar" : "Tirar"}</button></div></div>`);
  }
  if (k.activo) for (const e of k.orden.filter(e => e.tipo === "pj" && e.dado == null && esMio(e.id))){
    const p = pjById(e.id); if (!p) continue;
    out.push(`<div class="accion"><div><b>Iniciativa de ${esc(p.nombre)}:</b> tira 1d20 <span class="mono small">${sgn(derive(p).ini) || "+0"}</span></div>
      <div class="row">${fis ? inputDado(`data-ini-val="${p.id}" aria-label="d20 de iniciativa"`) : ""}<button class="btn sm primary" data-act="cb-ini" data-pj="${p.id}" ${S.busy ? "disabled" : ""}>${fis ? "Apuntar" : "Tirar"}</button></div></div>`);
  }
  const a = S.atq?.c === c.id ? S.atq : null;
  if (a){ const e = k.orden.find(x => x.id === a.e);
    out.push(`<div class="accion mio"><div><b>¡${esc(pjById(a.pj)?.nombre || "")} impacta a ${esc(e?.nombre || "")}${a.r.crit ? " con un crítico" : ""}!</b> Tira el daño: <span class="mono">${esc(a.dn)}</span>${a.r.crit ? " (crítico: dados dobles)" : ""}.</div>
      <div class="row">${inputDado(`id="fa-dv" aria-label="Suma de los dados de daño"`, "suma de los dados")}<button class="btn sm primary" data-act="cb-dano-pj">Aplicar daño</button><button class="btn sm ghost" data-act="cb-atq-no">Cancelar</button></div></div>`);
  } else if (k.activo && k.turno >= 0){ const ya = ataqueEsteTurno(c, pjId);
    out.push(ya ? `<div class="accion hecho"><div><b>Ya has atacado este turno.</b> ${rich(ya.split("\n").slice(-2).join(" ")).replace(/<\/?p>/g, "")}</div><span class="small muted">Espera a que el DM pase al siguiente turno.</span></div>` : formAtaque(c, pjId)); }
  return out.filter(Boolean).length ? `<div class="acciones">${out.join("")}</div>` : "";
}
// Formulario de ataque del jugador: la app usa su ficha, compara con la CA y aplica el daño
function formAtaque(c, pjId){
  const act = actorActual(c), p = pjById(pjId); if (!p || !esMio(pjId)) return "";
  const enem = cb(c).orden.filter(e => e.tipo === "enemigo" && +e.pg > 0); if (!enem.length) return "";
  const d = derive(p), mag = ["Mago","Hechicero","Brujo"].includes(p.clase), con = mag ? "MAG" : modOf(d.sc.DES) > modOf(d.sc.FUE) ? "DES" : "FUE";
  const dano = mag ? "1d10" : (String(p.equipo || "").match(/\((\d+d\d+)\)/)?.[1] || "1d8"), turno = act?.id === pjId;
  return `<div class="accion ${turno ? "mio" : ""}"><div><b>${turno ? `Tu turno: ataca con ${esc(p.nombre)}` : `Atacar con ${esc(p.nombre)}`}</b>${turno ? "" : ` <span class="small muted">(ahora le toca a ${esc(act?.nombre || "otro")}; ataca solo si el DM te lo dice)</span>`}</div>
    <div class="row ataque-form">
    <label class="field"><span>Objetivo</span><select id="fa-obj">${enem.map(e => `<option value="${esc(e.id)}">${esc(e.nombre)} (CA ${e.ca})</option>`).join("")}</select></label>
    <label class="field"><span>Con</span><select id="fa-con">${Object.keys(CON_ATAQUE).map(v => `<option value="${v}" ${v === con ? "selected" : ""}>${CON_ATAQUE[v]} ${sgn(modTirada(p, "at:" + v).mod) || "+0"}</option>`).join("")}</select></label>
    <label class="field" style="max-width:100px"><span>Daño</span><input type="text" id="fa-dano" class="mono" value="${dano}"></label>
    ${c.dadosFisicos ? `<label class="field" style="max-width:110px"><span>Tu d20</span>${inputDado(`id="fa-d20"`)}</label>` : ""}
    <button class="btn sm primary" data-act="cb-atacar-pj" ${S.busy ? "disabled" : ""}>Atacar</button></div>
    <span class="small muted">Lo que escribas en el cuadro de abajo se envía como descripción del ataque.</span></div>`;
}
// Panel lateral del jugador: solo su personaje, sus PG, sus bonificadores y sus tiradas
function panelJugador(c, p){
  if (!p) return "";
  const d = derive(p), max = d.pg, a = c.pgAct?.[p.id] ?? max, pct = Math.max(0, Math.min(100, a / max * 100));
  const habs = Object.keys(HABILIDADES).map(h => ({ h, ...modTirada(p, "hab:" + h) }));
  return `<div class="panel ficha-mesa">
    <div class="panel-h"><h3>${esc(p.nombre)}</h3><button class="btn sm ghost" data-act="pj-ver" data-id="${p.id}">Ficha</button></div>
    <div class="party-row" style="border:0"><div class="small muted">${esc(p.clase)} ${p.nivel || 1} · CA ${d.ca} · iniciativa ${fm(d.ini)} · competencia ${fm(d.prof)}</div>
      <div class="hp"><button data-act="hp" data-id="${p.id}" data-d="-1" aria-label="Quitar 1 PG">−</button><span class="mono">${a}/${max}</span><button data-act="hp" data-id="${p.id}" data-d="1" aria-label="Sumar 1 PG">+</button></div>
      <div class="hpbar"><i style="width:${pct}%;background:${pct<=25?"var(--bad)":pct<=50?"var(--warn)":"var(--ok)"}"></i></div></div>
    ${xpBarHtml(p)}
    ${a <= 0 ? `<p class="small" style="color:var(--bad)"><b>A 0 PG:</b> en tu turno haz una salvación contra la muerte (abajo).</p>` : ""}
    <div class="mods">${AB.map(k => `<span><b>${k}</b> ${fm(modOf(d.sc[k]))}${d.sv.includes(k) ? "<i>salv. " + fm(modOf(d.sc[k]) + d.prof) + "</i>" : ""}</span>`).join("")}</div>
    <details><summary class="small">Habilidades</summary><div class="habs">${habs.map(x => `<span class="${x.comp ? "comp" : ""}">${x.h} <b class="mono">${fm(x.mod)}</b></span>`).join("")}</div></details>
    <div class="row tirada-libre">
      <label class="field"><span>Tirar por mi cuenta</span><select id="pl-tipo">${opcionesTirada({ ini:true, muerte:true, p })}</select></label>
      ${c.dadosFisicos ? `<label class="field" style="max-width:90px"><span>Tu d20</span>${inputDado(`id="pl-d20"`)}</label>` : ""}
      <button class="btn sm" data-act="cb-libre" ${S.busy ? "disabled" : ""}>${c.dadosFisicos ? "Calcular" : "Tirar"}</button>
    </div>
    ${c.dadosFisicos ? `<p class="small muted">Dados físicos: tira tus dados de verdad, escribe lo que sale y la app suma tus bonificadores.</p>` : ""}
  </div>`;
}
// Panel lateral del DM: qué pasa con cada jugador (PG, lo que le has pedido, su iniciativa y lo último que hizo)
function panelGrupoDM(c, grupo){
  const pend = pendientesDe(c), k = cb(c);
  const ultimo = pid => { for (let i = c.log.length - 1; i >= 0; i--){ const m = c.log[i]; if (m.r === "user" && m.pj === pid) return String(m.t).split("\n").filter(Boolean).pop() || ""; } return ""; };
  return `<div class="panel">
    <div class="panel-h"><h3>Los jugadores</h3><button class="btn sm ghost" data-act="camp-ver" data-id="${c.id}">Partida</button></div>
    ${grupo.length ? grupo.map(p => { const d = derive(p), act = c.pgAct?.[p.id] ?? d.pg, pct = Math.max(0, Math.min(100, act / d.pg * 100));
      const mis = pend.filter(r => r.pj?.id === p.id), e = k.activo ? k.orden.find(o => o.id === p.id) : null, u = ultimo(p.id);
      return `<div class="party-row"><div><b>${esc(p.nombre)}</b><div class="small muted">${esc(nombreUsuario(p.dueno))} · ${esc(p.clase)} · CA ${d.ca} · ini ${fm(d.ini)}</div></div>
        <div class="hp"><button data-act="hp" data-id="${p.id}" data-d="-1" aria-label="Quitar 1 PG">−</button><span class="mono">${act}/${d.pg}</span><button data-act="hp" data-id="${p.id}" data-d="1" aria-label="Sumar 1 PG">+</button></div>
        <div class="hpbar"><i style="width:${pct}%;background:${pct<=25?"var(--bad)":pct<=50?"var(--warn)":"var(--ok)"}"></i></div>
        <div class="estado-j">${xpBarHtml(p, true)}</div><div class="estado-j small">${act <= 0 ? `<span class="chip warn">Inconsciente</span>` : ""}${mis.map(r => `<span class="chip warn">Esperando: ${esc(r.lab.replace(/\s*\([^)]*\)\s*$/, ""))}${r.cd ? " " + esc(r.cd) : ""}</span>`).join("")}${e && e.dado == null ? `<span class="chip warn">Falta su iniciativa</span>` : ""}${u ? `<div class="muted">Último: ${rich(u).replace(/<\/?p>/g, "")}</div>` : ""}</div></div>`; }).join("") : `<p class="small muted">Aún no hay personajes en la partida.</p>`}
    ${grupo.length ? `<details class="dar-xp"><summary class="small"><b>Dar experiencia</b> (misión, escena, buena idea…)</summary><div class="row">
      <label class="field"><span>A</span><select id="xp-a">${grupo.length > 1 ? `<option value="*">Todo el grupo</option>` : ""}${grupo.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join("")}</select></label>
      <label class="field" style="max-width:100px"><span>PX</span><input type="number" id="xp-n" min="1" max="100000" value="100" class="mono"></label>
      <label class="field"><span>Motivo</span><input type="text" id="xp-motivo" placeholder="Misión cumplida"></label>
      <label class="switch small"><input type="checkbox" id="xp-rep"> Repartir el total entre todos</label>
      <button class="btn sm" data-act="cb-xp">Dar PX</button></div>
      <p class="small muted">Con ${XP_NIVEL[1]} PX se llega a nivel 2 y con ${XP_NIVEL[2]} a nivel 3. Una misión pequeña suele dar lo mismo que un combate medio para el grupo. Al llegar al umbral, el personaje sube de nivel solo.</p></details>` : ""}
  </div>`;
}
// Reparte experiencia (la base de datos sube de nivel a quien llegue al umbral y lo anuncia en el chat)
async function darExperiencia(c, pjIds, cantidad, motivo){
  if (!pjIds.length || cantidad < 1) return;
  const r = await q(sb.rpc("dm_dar_experiencia", { p:c.id, pjs:pjIds, cantidad, motivo:motivo || "" }));
  for (const x of r || []){ const p = pjById(x.pj); if (p){ p.xp = x.xp; p.nivel = x.nivel; } if (x.nivel > x.antes) toast(`¡${esc(pjById(x.pj)?.nombre || "")} sube a nivel ${x.nivel}!`, 5000); }
  const f = await q(sb.from("dm_partidas").select("log").eq("id", c.id).single()); c.log = f.log || c.log;
}
async function darExperienciaForm(c){
  const v = $("#xp-a").value, ids = v === "*" ? grupoDe(c.id).map(p => p.id) : [v], n = Math.round(+$("#xp-n").value || 0);
  if (n < 1){ toast("Escribe cuántos PX das."); return; }
  const cada = $("#xp-rep").checked ? Math.floor(n / ids.length) : n;
  if (cada < 1){ toast("Son muy pocos PX para repartir entre todos."); return; }
  S.busy = true;
  try { await darExperiencia(c, ids, cada, $("#xp-motivo").value.trim()); } catch (e) { toast(esc(errorTexto(e))); }
  S.busy = false; render();
}
// Herramienta de reserva del DM: escribir el dado de un jugador que no tiene la app abierta
function fisicaHtml(c, grupo){
  if (!c.dadosFisicos || !grupo.length) return "";
  const enem = cb(c).orden.filter(e => e.tipo === "enemigo" && +e.pg > 0);
  return `<details class="fisica"><summary class="small">Escribir el dado de un jugador que no tiene la app abierta</summary><div class="row">
    <label class="field"><span>Personaje</span><select id="pf-pj">${grupo.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join("")}</select></label>
    <label class="field"><span>Tirada</span><select id="pf-tipo">${opcionesTirada({ ini:true, ataques:true })}</select></label>
    <label class="field" style="max-width:80px"><span>d20</span><input type="number" id="pf-dado" min="1" max="20" class="mono"></label>
    <label class="field" style="max-width:80px"><span>CD</span><input type="number" id="pf-cd" min="1" max="30" placeholder="—"></label>
    ${enem.length ? `<label class="field"><span>Si ataca: a</span><select id="pf-obj">${enem.map(e => `<option value="${esc(e.id)}">${esc(e.nombre)} (CA ${e.ca})</option>`).join("")}</select></label>
    <label class="field" style="max-width:90px"><span>Dados de daño</span><input type="number" id="pf-dano" min="1" max="200" class="mono" placeholder="suma"></label>` : ""}
    <button class="btn sm" data-act="cb-fisica">Calcular y mostrar</button>
  </div></details>`;
}

// Panel del DM: preparar el encuentro, calculadora, iniciativa, turnos, ataques de los enemigos y daño a mano
function panelCombate(c, grupo){
  const k = cb(c), enem = k.orden.filter(e => e.tipo === "enemigo"), calc = calcEncuentro(grupo, enem);
  const filas = k.orden.map((e,i) => { const { act, max } = pgDe(c, e);
    return `<div class="cb-row ${k.activo && k.turno === i ? "now" : ""} ${act <= 0 ? "ko" : ""}">
      <span class="small"><b>${esc(e.nombre)}</b>${e.tipo === "enemigo" ? ` <span class="muted">CA ${e.ca} · ${sgn(+e.at) || "+0"} · ${esc(e.dano)}</span>` : ""}</span>
      ${k.activo ? `<span class="ini-in"><input type="number" class="mono" data-cb-dado="${esc(e.id)}" value="${e.dado ?? ""}" min="1" max="20" placeholder="d20" aria-label="d20 de iniciativa de ${esc(e.nombre)}"><span class="mono small">${sgn(+e.mod || 0) || "+0"} = ${iniTotal(e) ?? "–"}</span></span>` : ""}
      <span class="mono small">${act}/${max} PG</span>
      ${e.tipo === "enemigo" ? `<button class="btn sm ghost" data-act="cb-quitar" data-id="${esc(e.id)}" aria-label="Quitar ${esc(e.nombre)}">✕</button>` : "<span></span>"}
    </div>`; }).join("");
  const vivosE = enem.filter(e => +e.pg > 0), act = actorActual(c);
  const objetivos = [...grupo.map(p => ({ id:p.id, n:p.nombre })), ...enem.map(e => ({ id:e.id, n:e.nombre }))];
  return `<div class="panel combate">
    <div class="panel-h"><h3>Combate${k.activo && k.turno >= 0 ? ` · ronda ${k.ronda}` : ""}</h3><a class="small" href="#w-iniciativa">¿Cómo funciona?</a></div>
    ${filas || `<p class="small muted">Añade los enemigos del encuentro. La calculadora te dice si es fácil o mortal para tu grupo.</p>`}
    ${enem.length ? `<div class="calc"><b>Dificultad: ${calc.nivel || "—"}</b> <span class="small muted">${calc.base} PX × ${calc.mult} = ${calc.aj} PX ajustados</span>
      <div class="small muted">Umbrales del grupo: fácil ${calc.umb[0]}, media ${calc.umb[1]}, difícil ${calc.umb[2]}, mortal ${calc.umb[3]}. Recompensa: ${calc.base} PX (${calc.porPJ} por personaje).</div></div>` : ""}
    <div class="row cb-add">
      <select id="cb-mon" aria-label="Monstruo del SRD">${MONSTRUOS.map((m,i) => `<option value="${i}">${m.n} (VD ${m.vd})</option>`).join("")}</select>
      <input type="number" id="cb-cant" value="1" min="1" max="12" aria-label="Cuántos" style="width:64px">
      <button class="btn sm" data-act="cb-anadir">Añadir</button>
    </div>
    <details><summary class="small">Enemigo propio</summary><div class="row cb-add">
      <input type="text" id="cbp-n" placeholder="Nombre" aria-label="Nombre">
      <select id="cbp-vd" aria-label="Valor de desafío">${Object.keys(XP_VD).map(v => `<option ${v === "1/4" ? "selected" : ""}>${v}</option>`).join("")}</select>
      <input type="number" id="cbp-ca" placeholder="CA" value="12" aria-label="CA" style="width:64px">
      <input type="number" id="cbp-pg" placeholder="PG" value="10" aria-label="PG" style="width:64px">
      <input type="number" id="cbp-at" placeholder="Ataque" value="3" aria-label="Bonificador de ataque" style="width:64px">
      <input type="text" id="cbp-dano" placeholder="1d6+1" value="1d6+1" aria-label="Daño" class="mono" style="width:80px">
      <button class="btn sm" data-act="cb-anadir-propio">Añadir</button>
    </div></details>
    <div class="row">${!k.activo ? `<button class="btn sm primary" data-act="cb-empezar" ${enem.length && grupo.length ? "" : "disabled"}>Empezar combate</button>`
      : `${k.turno < 0 ? `<button class="btn sm primary" data-act="cb-ordenar">Ordenar y empezar</button>` : `<button class="btn sm" data-act="cb-ordenar">Reordenar</button><button class="btn sm primary" data-act="cb-siguiente">Siguiente turno</button>`}
         <span data-confirm="cb-fin"><button class="btn sm ghost" data-act="cb-terminar">Terminar combate</button></span>`}</div>
    ${k.activo && k.turno < 0 ? `<p class="small muted">${c.dadosFisicos ? "Escribe el d20 físico de cada personaje; la app suma su Destreza." : "Revisa las tiradas si quieres."} Luego pulsa «Ordenar y empezar».</p>` : ""}
    ${k.activo && vivosE.length && grupo.length ? `<div class="row cb-add"><span class="small">Ataque enemigo:</span>
      <select id="cb-atk" aria-label="Atacante">${vivosE.map(e => `<option value="${esc(e.id)}" ${act?.id === e.id ? "selected" : ""}>${esc(e.nombre)}</option>`).join("")}</select>
      <select id="cb-vic" aria-label="Objetivo">${grupo.map(p => `<option value="${p.id}">${esc(p.nombre)} (CA ${derive(p).ca})</option>`).join("")}</select>
      ${c.dadosFisicos ? `${inputDado(`id="cb-atk-d20" aria-label="d20 del enemigo"`)}${inputDado(`id="cb-atk-dano" aria-label="Daño del enemigo"`, "daño")}` : ""}
      <button class="btn sm" data-act="cb-atacar-en">Atacar</button></div>` : ""}
    ${objetivos.length ? `<div class="row cb-add"><span class="small">A mano:</span>
      <select id="cb-obj" aria-label="Objetivo">${objetivos.map(o => `<option value="${esc(o.id)}">${esc(o.n)}</option>`).join("")}</select>
      <input type="number" id="cb-cant-pg" min="1" max="999" value="1" aria-label="Cantidad" style="width:64px">
      <button class="btn sm" data-act="cb-dano">Daño</button><button class="btn sm" data-act="cb-curar">Curar</button></div>` : ""}
  </div>`;
}
// Herramienta del DM con dados físicos: escribe lo que salió en el d20 y la app calcula con la ficha

/* ---------- acciones ---------- */
function nuevoEnemigo(k, m, n){
  const mismos = k.orden.filter(e => e.tipo === "enemigo" && e.base === m.n).length;
  return { id:"e" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36), tipo:"enemigo", base:m.n,
    nombre:n > 1 || mismos ? `${m.n} ${mismos + 1}` : m.n, vd:m.vd, ca:+m.ca, pg:+m.pg, pgMax:+m.pg, at:+m.at, dano:m.dano, mod:+m.mod || 0, dado:k.activo ? rnd(20) : null };
}
function anadirEnemigos(c, m, cant){
  editarCombate(c, k => { for (let i = 0; i < cant; i++) k.orden.push(nuevoEnemigo(k, m, cant)); });
}
function empezarCombate(c){
  const grupo = grupoDe(c.id), fis = !!c.dadosFisicos;
  editarCombate(c, k => {
    const pjs = grupo.map(p => ({ id:p.id, tipo:"pj", nombre:p.nombre, mod:derive(p).ini, dado:fis ? null : rnd(20) }));
    k.orden.filter(e => e.tipo === "enemigo").forEach(e => e.dado = rnd(20));
    k.orden = [...pjs, ...k.orden.filter(e => e.tipo === "enemigo")];
    k.activo = true; k.ronda = 1; k.turno = -1;
    if (!fis){ k.orden = ordenarIni(k.orden); k.turno = 0; }
  }, k => k.turno < 0 ? [{ r:"sys", t:"**¡Combate!** Tirad iniciativa con vuestros dados (d20): cada uno escribe lo que ha sacado en su panel y la app suma su Destreza." }]
    : [{ r:"sys", t:`**¡Combate!** Orden de iniciativa: ${k.orden.map(e => `${e.nombre} ${iniTotal(e)}`).join(", ")}.` }, ...anuncioTurno(k)]);
}
function ordenarCombate(c){
  let empieza = false;
  editarCombate(c, k => {
    delete k._empieza; empieza = k.turno < 0; const actual = k.orden[k.turno]?.id;
    k.orden = ordenarIni(k.orden);
    k.turno = empieza ? 0 : Math.max(0, k.orden.findIndex(e => e.id === actual));
  }, k => { return empieza ? [{ r:"sys", t:`Orden de iniciativa: ${k.orden.map(x => `${x.nombre} ${iniTotal(x) ?? "–"}`).join(", ")}.` }, ...anuncioTurno(k)] : []; });
}
function terminarCombate(c){
  const grupo = grupoDe(c.id), k0 = cb(c), caidos = k0.orden.filter(e => e.tipo === "enemigo" && +e.pg <= 0), calc = calcEncuentro(grupo, caidos);
  editarCombate(c, k => { k.activo = false; k.orden = []; k.turno = -1; k.ronda = 1; },
    k0.activo ? [{ r:"sys", t:`**Fin del combate.**${caidos.length ? ` Enemigos derrotados: ${caidos.map(e => e.nombre).join(", ")}. Experiencia: ${calc.base} PX en total, ${calc.porPJ} por personaje.` : ""}` }] : [])
    .then(async () => { if (!k0.activo || calc.porPJ < 1 || !grupo.length) return; S.busy = true;
      try { await darExperiencia(c, grupo.map(p => p.id), calc.porPJ, "combate"); } catch (e) { toast(esc(errorTexto(e))); }
      S.busy = false; render(); });
}
async function conDano(c, objetivo, cantidad, cabecera){
  S.busy = true;
  try {
    const nuevo = await aplicarDano(c, objetivo, cantidad);
    if (c.creador === S.me && dmHumano(c)) await anadirLog(c, [{ r:"sys", t:`${cabecera} ${trasDano(c, objetivo, nuevo)}` }]);
  } catch (e) { toast(esc(errorTexto(e))); }
  S.busy = false; render();
}

// Tras un ataque en su turno, el turno pasa solo al siguiente (lo hace la base de datos para que valga también para los jugadores)
async function pasarTurnoTras(c, actorId){
  if (!cb(c).activo || actorActual(c)?.id !== actorId) return;
  try {
    c.combate = await q(sb.rpc("dm_pasar_turno", { p:c.id, desde:actorId }));
    const f = await q(sb.from("dm_partidas").select("log").eq("id", c.id).single()); c.log = f.log || c.log;
  } catch (e) { toast(esc(errorTexto(e))); }
}
const avisoAtaque = (quien, r, ca, dmg, pasa) => toast((r.pifia || !(r.crit || r.total >= ca) ? `<b>${esc(quien)} falla:</b> ${r.total} contra CA ${ca}.` : `<b>¡${esc(quien)} impacta${r.crit ? " con un crítico" : ""}!</b> ${r.total} contra CA ${ca}.${dmg ? ` ${dmg.total} de daño.` : ""}`) + (pasa ? " Pasa el turno." : ""), 5000);
async function ataqueEnemigo(c){
  const k = cb(c), e = k.orden.find(x => x.id === $("#cb-atk")?.value), p = pjById($("#cb-vic")?.value); if (!e || !p) return;
  const ca = derive(p).ca, not = `1d20${sgn(+e.at)}`;
  let r, dmg = null;
  try { r = tirarCon(c, not, `Ataque de ${e.nombre}`, "normal", $("#cb-atk-d20")?.value); } catch (er) { toast(esc(er.message)); return; }
  const impacta = !r.pifia && (r.crit || r.total >= ca);
  if (impacta){ const dn = r.crit ? doblarDados(e.dano) : e.dano;
    try { dmg = tirarCon(c, dn, `¡Impacta (${r.total} contra CA ${ca})! Daño de ${e.nombre}${r.crit ? ", crítico con dados dobles" : ""}`, "normal", $("#cb-atk-dano")?.value); } catch (er) { toast(esc(er.message)); return; } }
  S.busy = true;
  try {
    let t = `${e.nombre} ataca a ${p.nombre}: ${lineaTirada(r)} contra CA ${ca}: ${impacta ? (r.crit ? "**¡crítico!**" : "**impacta**.") : "falla."}`;
    if (dmg){ const nuevo = await aplicarDano(c, p.id, Math.max(0, dmg.total)); t += ` Daño ${lineaTirada(dmg)}. ${trasDano(c, p.id, nuevo)}`; }
    await anadirLog(c, [{ r:"sys", t }]);
    avisoAtaque(e.nombre, r, ca, dmg, actorActual(c)?.id === e.id);
    await pasarTurnoTras(c, e.id);
  } catch (er) { toast(esc(errorTexto(er))); }
  S.busy = false; render();
}
async function ataqueJugador(c){
  const pjId = vozActual(c), p = pjById(pjId), k = cb(c), e = k.orden.find(x => x.id === $("#fa-obj")?.value); if (!p || !e) return;
  const con = $("#fa-con").value, dado = $("#fa-dano").value.trim() || "1d8", { mod:bono, car } = modTirada(p, "at:" + con), mod = modOf(derive(p).sc[car]);
  try { partesNot(dado); } catch (er) { toast(esc(er.message)); return; }
  let r; try { r = tirarCon(c, `1d20${sgn(bono)}`, `Ataque de ${p.nombre}`, S.trayMode, $("#fa-d20")?.value); } catch (er) { toast(esc(er.message)); return; }
  const impacta = !r.pifia && (r.crit || r.total >= +e.ca);
  const a = { c:c.id, pj:p.id, e:e.id, con, r, impacta, dn:(r.crit ? doblarDados(dado) : dado) + (con === "MAG" ? "" : sgn(mod)) };
  if (impacta && c.dadosFisicos){ S.atq = a; render(); $("#fa-dv")?.focus(); return; }
  publicarAtaque(c, a, impacta ? rollNotation(a.dn) : null);
}
// El último ataque de este personaje desde que empezó el turno actual (para no atacar dos veces y ver el resultado)
function ataqueEsteTurno(c, pjId){
  const log = c.log || []; let desde = 0;
  for (let i = log.length - 1; i >= 0; i--) if (log[i].r === "sys" && /^\*\*(Ronda \d+ · turno de|¡Combate!)/.test(log[i].t)){ desde = i; break; }
  for (let i = log.length - 1; i > desde; i--){ const m = log[i]; if (m.r === "user" && m.pj === pjId && /Ataque de .+ a .+: /.test(m.t)) return String(m.t); }
  return "";
}
async function publicarAtaque(c, a, dmg){
  const p = pjById(a.pj), e = cb(c).orden.find(x => x.id === a.e); if (!p || !e) return;
  S.busy = true;
  try {
    let t = `Ataque de ${p.nombre} a ${e.nombre} (${ATQ_CORTO[a.con]}): ${lineaTirada(a.r)} contra CA ${e.ca}: ${a.impacta ? (a.r.crit ? "**¡crítico!**" : "**impacta**.") : "falla."}`;
    if (dmg){ const nuevo = await aplicarDano(c, e.id, Math.max(0, dmg.total)); t += `\nDaño: ${lineaTirada(dmg)}. ${trasDano(c, e.id, nuevo)}`; }
    S.atq = null;
    await publicar(c, p.id, t);
    avisoAtaque(p.nombre, a.r, +e.ca, dmg, actorActual(c)?.id === p.id);
    await pasarTurnoTras(c, p.id);
  } catch (er) { toast(esc(errorTexto(er))); }
  S.busy = false; render();
}
async function tiradaFisicaDM(c){
  const p = pjById($("#pf-pj")?.value), tipo = $("#pf-tipo").value, v = +$("#pf-dado").value, cd = +$("#pf-cd").value || null; if (!p) return;
  if (!Number.isInteger(v) || v < 1 || v > 20){ toast("Escribe lo que ha salido en el d20 (de 1 a 20)."); return; }
  const { mod, nombre, comp, car } = modTirada(p, tipo), [clase, x] = tipo.split(":"), total = v + mod;
  let t = `Dado físico de ${p.nombre} — ${nombre}${comp ? " (competente)" : ""}: d20 [${v}] ${sgn(mod) || "+0"} = **${total}**${v === 20 ? " (¡20 natural!)" : v === 1 ? " (1 natural)" : ""}`;
  if (clase === "ini"){
    if (!cb(c).activo){ toast("La iniciativa se apunta cuando el combate ha empezado."); return; }
    return editarCombate(c, k => { const e = k.orden.find(o => o.id === p.id); if (e) e.dado = v; }, [{ r:"sys", t }]);
  }
  if (clase === "at"){
    const e = cb(c).orden.find(o => o.id === $("#pf-obj")?.value); if (!e){ toast("No hay enemigos en el combate."); return; }
    const impacta = v !== 1 && (v === 20 || total >= +e.ca);
    t += ` contra ${e.nombre} (CA ${e.ca}): ${impacta ? (v === 20 ? "**¡crítico!**" : "**impacta**.") : "falla."}`;
    if (impacta){
      const dd = +$("#pf-dano").value; if (!Number.isInteger(dd) || dd < 1){ toast("Escribe cuánto suman los dados de daño."); return; }
      const md = x === "MAG" ? 0 : modOf(derive(p).sc[car]), dm = Math.max(0, dd + md); t += ` Daño: ${dd} ${sgn(md) || "+0"} = **${dm}**.`;
      S.busy = true;
      try { const nuevo = await aplicarDano(c, e.id, dm); await anadirLog(c, [{ r:"sys", t:t + " " + trasDano(c, e.id, nuevo) }]); avisoAtaque(p.nombre, { total, crit:v === 20, pifia:v === 1 }, +e.ca, { total:dm }, actorActual(c)?.id === p.id); await pasarTurnoTras(c, p.id); } catch (er) { toast(esc(errorTexto(er))); }
      S.busy = false; render(); return;
    }
  } else if (cd) t += ` contra CD ${cd}: ${total >= cd ? "**éxito**." : "fallo."}`;
  S.busy = true;
  try { await anadirLog(c, [{ r:"sys", t }]);
    if (clase === "at"){ const e = cb(c).orden.find(o => o.id === $("#pf-obj")?.value); if (e){ avisoAtaque(p.nombre, { total, crit:false, pifia:v === 1 }, +e.ca, null, actorActual(c)?.id === p.id); await pasarTurnoTras(c, p.id); } } } catch (er) { toast(esc(errorTexto(er))); }
  S.busy = false; render();
}

async function cambiarDadosFisicos(c, on){
  try {
    const f = await q(sb.from("dm_partidas").select("datos").eq("id", c.id).single());
    await guardar(sb.from("dm_partidas").update({ datos:{ ...(f.datos || {}), dadosFisicos:on } }).eq("id", c.id), on ? "Dados físicos activados: cada jugador escribe lo que saca en su panel." : "La app vuelve a tirar los dados.");
    c.dadosFisicos = on;
  } catch {}
  render();
}

document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-act^='cb-']"); if (!t) return;
  const c = partida(S.playId); if (!c) return;
  switch (t.dataset.act){
    case "cb-anadir": { const m = MONSTRUOS[+$("#cb-mon").value], n = Math.max(1, Math.min(12, +$("#cb-cant").value || 1)); if (m) anadirEnemigos(c, m, n); } break;
    case "cb-anadir-propio": { const n = $("#cbp-n").value.trim(), dano = $("#cbp-dano").value.trim() || "1d6";
        if (!n){ toast("Ponle nombre al enemigo."); break; }
        try { partesNot(dano); } catch (e) { toast(esc(e.message)); break; }
        anadirEnemigos(c, { n, vd:$("#cbp-vd").value, ca:+$("#cbp-ca").value || 10, pg:Math.max(1, +$("#cbp-pg").value || 1), at:+$("#cbp-at").value || 0, dano, mod:0 }, 1); } break;
    case "cb-quitar": editarCombate(c, k => { const i = k.orden.findIndex(e => e.id === t.dataset.id); if (i < 0) return; k.orden.splice(i, 1); if (i < k.turno) k.turno--; if (k.turno >= k.orden.length) k.turno = 0; }); break;
    case "cb-empezar": empezarCombate(c); break;
    case "cb-ordenar": ordenarCombate(c); break;
    case "cb-siguiente": editarCombate(c, k => siguienteTurno(c, k), k => anuncioTurno(k)); break;
    case "cb-terminar": confirmar(t, () => terminarCombate(c), "Sí, terminar"); break;
    case "cb-atacar-en": ataqueEnemigo(c); break;
    case "cb-atacar-pj": ataqueJugador(c); break;
    case "cb-dano-pj": { const a = S.atq; if (!a) break; let dmg; try { dmg = tirarCon(c, a.dn, "Daño", "normal", $("#fa-dv")?.value); } catch (e) { toast(esc(e.message)); break; } publicarAtaque(c, a, dmg); } break;
    case "cb-atq-no": S.atq = null; render(); break;
    case "cb-pet": { const req = pendientesDe(c).find(r => r.key === t.dataset.key); if (req) resolverPeticion(c, req, $(`[data-pet-val="${t.dataset.key}"]`)?.value); } break;
    case "cb-ini": iniciativaJugador(c, t.dataset.pj, $(`[data-ini-val="${t.dataset.pj}"]`)?.value); break;
    case "cb-libre": tiradaLibre(c); break;
    case "cb-dano": case "cb-curar": { const obj = $("#cb-obj").value, n = Math.max(1, +$("#cb-cant-pg").value || 1), cura = t.dataset.act === "cb-curar";
        const nom = pjById(obj)?.nombre || cb(c).orden.find(e => e.id === obj)?.nombre || "";
        conDano(c, obj, cura ? -n : n, cura ? `${nom} recupera ${n} PG.` : `${nom} recibe ${n} de daño.`); } break;
    case "cb-fisica": tiradaFisicaDM(c); break;
    case "cb-xp": darExperienciaForm(c); break;
  }
});
document.addEventListener("change", (ev) => {
  const t = ev.target, c = partida(S.playId); if (!c) return;
  if (t.matches("[data-cb-dado]")){ const v = t.value === "" ? null : Math.max(1, Math.min(20, Math.round(+t.value))); editarCombate(c, k => { const e = k.orden.find(o => o.id === t.dataset.cbDado); if (e) e.dado = v; }); }
  if (t.id === "opt-fisicos") cambiarDadosFisicos(c, t.checked);
});
document.addEventListener("keydown", (ev) => {
  // Enter en un cuadro de dado pulsa su botón
  if (ev.key !== "Enter" || !ev.target.matches?.(".dado-in")) return;
  ev.preventDefault(); ev.target.closest(".accion,.row,.panel")?.querySelector("[data-act^='cb-']")?.click();
});
