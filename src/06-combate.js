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
// Tira con la app o, si la mesa usa dados físicos, pregunta qué salió. Devuelve null si se cancela.
function tirarCon(c, not, etiqueta, mode="normal"){
  if (!c?.dadosFisicos) return rollNotation(not, mode);
  const dt = partesNot(not).dados.map(d => d.n + "d" + d.f).join("+");
  const txt = prompt(`${etiqueta}\nDados físicos: ¿cuánto suman los dados (${dt})?${mode !== "normal" ? ` Con ${mode}, escribe el d20 que te quedas.` : ""} La app añade los modificadores.`);
  if (txt === null) return null;
  return tiradaFisica(not, txt.trim());
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
// Cartel de turnos que ve todo el mundo en el chat
function combateBanner(c){
  const k = cb(c); if (!k.activo) return "";
  const soyDM = c.creador === S.me, act = actorActual(c);
  const mio = act?.tipo === "pj" && misParticipaciones(c.id).some(x => x.personaje_id === act.id);
  const chips = k.orden.map((e,i) => { const { act:a, max } = pgDe(c, e), info = e.tipo === "pj" || soyDM ? `${a}/${max}` : estadoEnemigo(e);
    return `<span class="ord ${i === k.turno ? "now" : ""} ${a <= 0 ? "ko" : ""} ${e.tipo}"><b>${esc(e.nombre)}</b> <span class="mono">${iniTotal(e) ?? "–"}</span> <span class="small">${esc(String(info))}</span></span>`; }).join("");
  const titulo = k.turno < 0 ? "Combate: tirando iniciativa…" : mio ? `¡Te toca con ${esc(act.nombre)}!` : `Ronda ${k.ronda} · turno de ${esc(act?.nombre || "?")}${act?.tipo === "pj" ? ` (${esc(nombreUsuario(pjById(act.id)?.dueno))})` : ""}`;
  return `<div class="turno-banner ${mio ? "mio" : ""}" role="status"><b>${titulo}</b><div class="orden-strip">${chips}</div></div>`;
}
// PG de los personajes del usuario, siempre a la vista junto al chat
function misPG(c){
  const mios = misParticipaciones(c.id).map(x => pjById(x.personaje_id)).filter(Boolean); if (!mios.length) return "";
  return `<div class="pg-chips"><span class="small muted">Tus personajes:</span>${mios.map(p => { const max = derive(p).pg, a = c.pgAct?.[p.id] ?? max, pct = a / max;
    return `<span class="pg-chip ${a <= 0 ? "ko" : pct <= .25 ? "bad" : pct <= .5 ? "warn" : ""}"><b>${esc(p.nombre.split(" ")[0])}</b> <span class="mono">${a}/${max} PG</span>${a <= 0 ? " · inconsciente" : ""}</span>`; }).join("")}</div>`;
}
// Formulario de ataque del jugador en su turno: la app tira (o pregunta los dados físicos), compara con la CA y aplica el daño
function formAtaque(c, pjId){
  const act = actorActual(c), p = pjById(pjId); if (!act || act.id !== pjId || !p) return "";
  const enem = cb(c).orden.filter(e => e.tipo === "enemigo" && +e.pg > 0); if (!enem.length) return "";
  const d = derive(p), mag = ["Mago","Hechicero","Brujo"].includes(p.clase), con = mag ? "MAG" : modOf(d.sc.DES) > modOf(d.sc.FUE) ? "DES" : "FUE";
  const dano = mag ? "1d10" : (String(p.equipo || "").match(/\((\d+d\d+)\)/)?.[1] || "1d8");
  return `<div class="ataque-form row">
    <label class="field"><span>Atacar a</span><select id="fa-obj">${enem.map(e => `<option value="${esc(e.id)}">${esc(e.nombre)} (CA ${e.ca})</option>`).join("")}</select></label>
    <label class="field"><span>Con</span><select id="fa-con">${Object.entries(CON_ATAQUE).map(([v,t]) => `<option value="${v}" ${v === con ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <label class="field" style="max-width:110px"><span>Dado de daño</span><input type="text" id="fa-dano" class="mono" value="${dano}"></label>
    <button class="btn sm primary" data-act="cb-atacar-pj" ${S.busy ? "disabled" : ""}>Atacar</button>
    <span class="small muted">Lo que escribas abajo se envía como descripción del ataque.</span>
  </div>`;
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
      <button class="btn sm" data-act="cb-atacar-en">Atacar</button></div>` : ""}
    ${objetivos.length ? `<div class="row cb-add"><span class="small">A mano:</span>
      <select id="cb-obj" aria-label="Objetivo">${objetivos.map(o => `<option value="${esc(o.id)}">${esc(o.n)}</option>`).join("")}</select>
      <input type="number" id="cb-cant-pg" min="1" max="999" value="1" aria-label="Cantidad" style="width:64px">
      <button class="btn sm" data-act="cb-dano">Daño</button><button class="btn sm" data-act="cb-curar">Curar</button></div>` : ""}
  </div>`;
}
// Herramienta del DM con dados físicos: escribe lo que salió en el d20 y la app calcula con la ficha
function fisicaHtml(c, grupo){
  if (!c.dadosFisicos || !grupo.length) return "";
  const enem = cb(c).orden.filter(e => e.tipo === "enemigo" && +e.pg > 0);
  return `<div class="row fisica"><span class="small"><b>Dado físico de un jugador</b></span>
    <label class="field"><span>Personaje</span><select id="pf-pj">${grupo.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join("")}</select></label>
    <label class="field"><span>Tirada</span><select id="pf-tipo">
      <optgroup label="Habilidades">${Object.keys(HABILIDADES).map(h => `<option value="hab:${h}">${h}</option>`).join("")}</optgroup>
      <optgroup label="Salvaciones">${AB.map(k => `<option value="sv:${k}">Salvación de ${AB_N[k]}</option>`).join("")}</optgroup>
      <optgroup label="Características">${AB.map(k => `<option value="car:${k}">${AB_N[k]}</option>`).join("")}</optgroup>
      <optgroup label="Combate"><option value="ini">Iniciativa</option>${Object.entries(CON_ATAQUE).map(([v,t]) => `<option value="at:${v}">Ataque: ${t}</option>`).join("")}</optgroup>
    </select></label>
    <label class="field" style="max-width:80px"><span>d20</span><input type="number" id="pf-dado" min="1" max="20" class="mono"></label>
    <label class="field" style="max-width:80px"><span>CD</span><input type="number" id="pf-cd" min="1" max="30" placeholder="—"></label>
    ${enem.length ? `<label class="field"><span>Si ataca: a</span><select id="pf-obj">${enem.map(e => `<option value="${esc(e.id)}">${esc(e.nombre)} (CA ${e.ca})</option>`).join("")}</select></label>
    <label class="field" style="max-width:90px"><span>Dados de daño</span><input type="number" id="pf-dano" min="1" max="200" class="mono" placeholder="suma"></label>` : ""}
    <button class="btn sm" data-act="cb-fisica">Calcular y mostrar</button>
  </div>`;
}

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
  }, k => k.turno < 0 ? [{ r:"sys", t:"**¡Combate!** Tirad iniciativa con vuestros dados (d20) y decídselo al DM." }]
    : [{ r:"sys", t:`**¡Combate!** Orden de iniciativa: ${k.orden.map(e => `${e.nombre} ${iniTotal(e)}`).join(", ")}.` }, ...anuncioTurno(k)]);
}
function ordenarCombate(c){
  editarCombate(c, k => {
    const empieza = k.turno < 0, actual = k.orden[k.turno]?.id;
    k.orden = ordenarIni(k.orden);
    k.turno = empieza ? 0 : Math.max(0, k.orden.findIndex(e => e.id === actual));
    k._empieza = empieza;
  }, k => { const e = k._empieza; delete k._empieza; return e ? [{ r:"sys", t:`Orden de iniciativa: ${k.orden.map(x => `${x.nombre} ${iniTotal(x) ?? "–"}`).join(", ")}.` }, ...anuncioTurno(k)] : []; });
}
function terminarCombate(c){
  const grupo = grupoDe(c.id), k0 = cb(c), caidos = k0.orden.filter(e => e.tipo === "enemigo" && +e.pg <= 0), calc = calcEncuentro(grupo, caidos);
  editarCombate(c, k => { k.activo = false; k.orden = []; k.turno = -1; k.ronda = 1; },
    k0.activo ? [{ r:"sys", t:`**Fin del combate.**${caidos.length ? ` Enemigos derrotados: ${caidos.map(e => e.nombre).join(", ")}. Experiencia: ${calc.base} PX (${calc.porPJ} por personaje).` : ""}` }] : []);
}
async function conDano(c, objetivo, cantidad, cabecera){
  S.busy = true;
  try {
    const nuevo = await aplicarDano(c, objetivo, cantidad);
    if (c.creador === S.me && dmHumano(c)) await anadirLog(c, [{ r:"sys", t:`${cabecera} ${trasDano(c, objetivo, nuevo)}` }]);
  } catch (e) { toast(esc(errorTexto(e))); }
  S.busy = false; render();
}
async function ataqueEnemigo(c){
  const k = cb(c), e = k.orden.find(x => x.id === $("#cb-atk")?.value), p = pjById($("#cb-vic")?.value); if (!e || !p) return;
  const ca = derive(p).ca, not = `1d20${sgn(+e.at)}`;
  let r, dmg = null;
  try { r = tirarCon(c, not, `Ataque de ${e.nombre} a ${p.nombre}`); if (!r) return; } catch (er) { toast(esc(er.message)); return; }
  const impacta = !r.pifia && (r.crit || r.total >= ca);
  if (impacta){ const dn = r.crit ? doblarDados(e.dano) : e.dano; try { dmg = tirarCon(c, dn, `Daño de ${e.nombre}${r.crit ? " (crítico: dados dobles)" : ""}`); if (!dmg) return; } catch (er) { toast(esc(er.message)); return; } }
  S.busy = true;
  try {
    let t = `${e.nombre} ataca a ${p.nombre}: ${lineaTirada(r)} contra CA ${ca}: ${impacta ? (r.crit ? "**¡crítico!**" : "**impacta**.") : "falla."}`;
    if (dmg){ const nuevo = await aplicarDano(c, p.id, Math.max(0, dmg.total)); t += ` Daño ${lineaTirada(dmg)}. ${trasDano(c, p.id, nuevo)}`; }
    await anadirLog(c, [{ r:"sys", t }]);
  } catch (er) { toast(esc(errorTexto(er))); }
  S.busy = false; render();
}
async function ataqueJugador(c){
  const pjId = vozActual(c), p = pjById(pjId), k = cb(c), e = k.orden.find(x => x.id === $("#fa-obj")?.value); if (!p || !e) return;
  const con = $("#fa-con").value, dado = $("#fa-dano").value.trim() || "1d8", d = derive(p), car = con === "MAG" ? conMagia(p) : con;
  const mod = modOf(d.sc[car]), bono = mod + d.prof, not = `1d20${sgn(bono)}`;
  try { partesNot(dado); } catch (er) { toast(esc(er.message)); return; }
  let r, dmg = null;
  try { r = tirarCon(c, not, `Ataque de ${p.nombre} a ${e.nombre}`); if (!r) return; } catch (er) { toast(esc(er.message)); return; }
  const impacta = !r.pifia && (r.crit || r.total >= +e.ca);
  if (impacta){ const dn = (r.crit ? doblarDados(dado) : dado) + (con === "MAG" ? "" : sgn(mod));
    try { dmg = tirarCon(c, dn, `Daño de ${p.nombre}${r.crit ? " (crítico: dados dobles)" : ""}`); if (!dmg) return; } catch (er) { toast(esc(er.message)); return; } }
  const box = $("#play-in"), desc = box?.value.trim();
  S.busy = true;
  try {
    let t = `${desc ? desc + "\n" : ""}Ataque de ${p.nombre} a ${e.nombre} (${ATQ_CORTO[con]}): ${lineaTirada(r)} contra CA ${e.ca}: ${impacta ? (r.crit ? "**¡crítico!**" : "**impacta**.") : "falla."}`;
    if (dmg){ const nuevo = await aplicarDano(c, e.id, Math.max(0, dmg.total)); t += `\nDaño: ${lineaTirada(dmg)}. ${trasDano(c, e.id, nuevo)}`; }
    await anadirLog(c, [{ r:"user", t, pj:p.id }]);
    S.draft = "";
  } catch (er) { toast(esc(errorTexto(er))); }
  S.busy = false; render();
}
async function tiradaFisicaDM(c){
  const p = pjById($("#pf-pj")?.value), tipo = $("#pf-tipo").value, v = +$("#pf-dado").value, cd = +$("#pf-cd").value || null; if (!p) return;
  if (!Number.isInteger(v) || v < 1 || v > 20){ toast("Escribe lo que ha salido en el d20 (de 1 a 20)."); return; }
  const d = derive(p), [clase, x] = tipo.split(":");
  let mod, nombre, comp = false;
  if (clase === "hab"){ const k = HABILIDADES[x]; comp = compHab(p, x); mod = modOf(d.sc[k]) + (comp ? d.prof : 0); nombre = x; }
  else if (clase === "sv"){ comp = d.sv.includes(x); mod = modOf(d.sc[x]) + (comp ? d.prof : 0); nombre = `Salvación de ${AB_N[x]}`; }
  else if (clase === "car"){ mod = modOf(d.sc[x]); nombre = AB_N[x]; }
  else if (clase === "ini"){ mod = d.ini; nombre = "Iniciativa"; }
  else { const car = x === "MAG" ? conMagia(p) : x; mod = modOf(d.sc[car]) + d.prof; nombre = `Ataque (${ATQ_CORTO[x]})`; }
  const total = v + mod, natTxt = v === 20 ? " (¡20 natural!)" : v === 1 ? " (1 natural)" : "";
  let t = `Dado físico de ${p.nombre} — ${nombre}${comp ? " (competente)" : ""}: d20 [${v}] ${sgn(mod) || "+0"} = **${total}**${natTxt}`;
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
      const dm = Math.max(0, dd + (x === "MAG" ? 0 : modOf(d.sc[x]))); t += ` Daño: ${dd}${x === "MAG" ? "" : " " + (sgn(modOf(d.sc[x])) || "+0")} = **${dm}**${v === 20 ? " (con el crítico se tiran los dados de daño dobles)" : ""}.`;
      S.busy = true;
      try { const nuevo = await aplicarDano(c, e.id, dm); await anadirLog(c, [{ r:"sys", t:t + " " + trasDano(c, e.id, nuevo) }]); } catch (er) { toast(esc(errorTexto(er))); }
      S.busy = false; render(); return;
    }
  } else if (cd) t += ` contra CD ${cd}: ${total >= cd ? "**éxito**." : "fallo."}`;
  S.busy = true;
  try { await anadirLog(c, [{ r:"sys", t }]); } catch (er) { toast(esc(errorTexto(er))); }
  S.busy = false; render();
}
async function cambiarDadosFisicos(c, on){
  try {
    const f = await q(sb.from("dm_partidas").select("datos").eq("id", c.id).single());
    await guardar(sb.from("dm_partidas").update({ datos:{ ...(f.datos || {}), dadosFisicos:on } }).eq("id", c.id), on ? "Dados físicos activados: la app preguntará qué ha salido." : "La app vuelve a tirar los dados.");
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
    case "cb-dano": case "cb-curar": { const obj = $("#cb-obj").value, n = Math.max(1, +$("#cb-cant-pg").value || 1), cura = t.dataset.act === "cb-curar";
        const nom = pjById(obj)?.nombre || cb(c).orden.find(e => e.id === obj)?.nombre || "";
        conDano(c, obj, cura ? -n : n, cura ? `${nom} recupera ${n} PG.` : `${nom} recibe ${n} de daño.`); } break;
    case "cb-fisica": tiradaFisicaDM(c); break;
  }
});
document.addEventListener("change", (ev) => {
  const t = ev.target, c = partida(S.playId); if (!c) return;
  if (t.matches("[data-cb-dado]")){ const v = t.value === "" ? null : Math.max(1, Math.min(20, Math.round(+t.value))); editarCombate(c, k => { const e = k.orden.find(o => o.id === t.dataset.cbDado); if (e) e.dado = v; }); }
  if (t.id === "opt-fisicos") cambiarDadosFisicos(c, t.checked);
});
