"use strict";
/* ==================== utilidades ==================== */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const modOf = s => Math.floor((s - 10) / 2);
const fm = n => (n >= 0 ? "+" : "") + n;
const clone = o => JSON.parse(JSON.stringify(o));
const rnd = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return (a[0] % n) + 1; };
let toastT;
function toast(html, ms=3200){ const t=$("#toast"); t.innerHTML=html; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>t.hidden=true, ms); }
function parseJSON(text){
  const t = String(text || "").trim();
  try { return JSON.parse(t); } catch {}
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (f){ try { return JSON.parse(f[1]); } catch {} }
  const a = t.search(/[\[{]/), b = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (a >= 0 && b > a){ try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  throw { code:"invalid_json" };
}

/* ==================== datos 5e SRD ==================== */
const AB = ["FUE","DES","CON","INT","SAB","CAR"];
const AB_N = {FUE:"Fuerza",DES:"Destreza",CON:"Constitución",INT:"Inteligencia",SAB:"Sabiduría",CAR:"Carisma"};
const RAZAS = {
  "Humano":{b:{FUE:1,DES:1,CON:1,INT:1,SAB:1,CAR:1},v:30,t:"Versátiles y ambiciosos. +1 a todas las características."},
  "Elfo":{b:{DES:2,INT:1},v:30,t:"Alto elfo: visión en la oscuridad, sentidos agudos, trance en vez de dormir."},
  "Enano":{b:{CON:2,SAB:1},v:25,t:"Enano de las colinas: resistentes al veneno, robustos (+1 PG por nivel)."},
  "Mediano":{b:{DES:2,CAR:1},v:25,t:"Piesligeros: afortunados (repiten los 1 naturales), valientes y sigilosos."},
  "Dracónido":{b:{FUE:2,CAR:1},v:30,t:"Descendientes de dragones con aliento elemental y resistencia a un daño."},
  "Gnomo":{b:{INT:2,CON:1},v:25,t:"Gnomo de las rocas: astutos, resisten la magia mental, inventores."},
  "Semielfo":{b:{CAR:2,DES:1,CON:1},v:30,t:"Carismáticos y adaptables. (+2 CAR y +1 a otras dos; aquí DES y CON.)"},
  "Semiorco":{b:{FUE:2,CON:1},v:30,t:"Fuertes y tenaces: aguantan con 1 PG una vez por descanso largo."},
  "Tiefling":{b:{CAR:2,INT:1},v:30,t:"Herencia infernal: resistencia al fuego y magia innata."}
};
const CLASES = {
  "Bárbaro":{d:12,sv:["FUE","CON"],pri:["FUE","CON","DES","SAB","CAR","INT"],ca:"barb",t:"Guerrero salvaje que entra en furia. Mucha vida, golpea fuerte."},
  "Bardo":{d:8,sv:["DES","CAR"],pri:["CAR","DES","CON","SAB","INT","FUE"],t:"Músico mágico: inspira aliados y lanza conjuros con su arte."},
  "Brujo":{d:8,sv:["SAB","CAR"],pri:["CAR","CON","DES","SAB","INT","FUE"],t:"Hizo un pacto con un ser poderoso a cambio de magia."},
  "Clérigo":{d:8,sv:["SAB","CAR"],pri:["SAB","CON","FUE","CAR","DES","INT"],t:"Sanador y guerrero sagrado al servicio de una deidad."},
  "Druida":{d:8,sv:["INT","SAB"],pri:["SAB","CON","DES","INT","CAR","FUE"],t:"Guardián de la naturaleza; puede transformarse en animales."},
  "Explorador":{d:10,sv:["FUE","DES"],pri:["DES","SAB","CON","FUE","INT","CAR"],t:"Rastreador y cazador experto en terrenos salvajes."},
  "Guerrero":{d:10,sv:["FUE","CON"],pri:["FUE","CON","DES","SAB","CAR","INT"],t:"Maestro de las armas y la armadura. Ideal para empezar."},
  "Hechicero":{d:6,sv:["CON","CAR"],pri:["CAR","CON","DES","SAB","INT","FUE"],t:"La magia corre por su sangre; la moldea a voluntad."},
  "Mago":{d:6,sv:["INT","SAB"],pri:["INT","CON","DES","SAB","CAR","FUE"],t:"Estudioso de la magia con un libro lleno de conjuros."},
  "Monje":{d:8,sv:["FUE","DES"],pri:["DES","SAB","CON","FUE","INT","CAR"],ca:"monk",t:"Artista marcial rápido que canaliza su energía ki."},
  "Paladín":{d:10,sv:["SAB","CAR"],pri:["FUE","CAR","CON","SAB","DES","INT"],t:"Caballero sagrado ligado a un juramento. Cura y castiga."},
  "Pícaro":{d:8,sv:["DES","INT"],pri:["DES","CON","SAB","INT","CAR","FUE"],t:"Sigiloso y hábil: ataques furtivos, cerraduras, trampas."}
};
const TRASFONDOS = ["Acólito","Artesano gremial","Artista","Charlatán","Criminal","Ermitaño","Forastero","Héroe del pueblo","Huérfano","Marinero","Noble","Sabio","Soldado"];
const ALINEAMIENTOS = ["Legal bueno","Neutral bueno","Caótico bueno","Legal neutral","Neutral","Caótico neutral","Legal malvado","Neutral malvado","Caótico malvado"];
const ARRAY_STD = [15,14,13,12,10,8];
const PB_COST = {8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
function prof(lvl){ return 2 + Math.floor((Math.max(1,lvl) - 1) / 4); }

/* ==================== conexión ==================== */
const CFG = window.MESA_CONFIG || {};
const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);

/* ==================== estado ==================== */
const S = {
  view:"inicio", loaded:false, user:null, me:null, perfil:null, recovery:false, authMode:"entrar",
  perfiles:{}, facciones:[], personajes:[], partidas:[], participantes:[], asesor:{},
  edit:null, verPj:null, editFac:null, verFac:null, campSel:null, playId:null, dmId:null,
  busy:false, err:"", trayMode:"normal", hist:[], camForm:null, draft:"",
  pjFiltro:"mios", facFiltro:"todas", spoilers:false, pending:false, habla:{}, turnoVisto:{}
};

/* ==================== búsquedas ==================== */
const nombreUsuario = uid => S.perfiles[uid]?.usuario || "Jugador";
const facById = id => S.facciones.find(f => f.id === id);
const pjById = id => S.personajes.find(p => p.id === id);
const misPjs = () => S.personajes.filter(p => p.dueno === S.me);
const partida = id => S.partidas.find(p => p.id === id);
const participantesDe = pid => S.participantes.filter(x => x.partida_id === pid);
const misParticipaciones = pid => S.participantes.filter(x => x.partida_id === pid && x.usuario_id === S.me);
const miParticipacion = pid => misParticipaciones(pid)[0];
const grupoDe = pid => participantesDe(pid).map(x => pjById(x.personaje_id)).filter(Boolean);
const puedoJugar = c => c && (c.creador === S.me || !!miParticipacion(c.id));
function ownerChip(uid){ return `<span class="owner ${uid===S.me?"me":""}"><i></i>${uid===S.me?"Tú":esc(nombreUsuario(uid))}</span>`; }

/* ==================== filas ⇄ objetos ==================== */
function pjFromRow(r){ return { ...(r.datos || {}), id:r.id, dueno:r.dueno, nombre:r.nombre, raza_id:r.raza_id, faccion_id:r.faccion_id, actualizado:r.actualizado }; }
function pjToRow(p){ const { id, dueno, nombre, raza_id, faccion_id, actualizado, _concepto, ...datos } = p; return { nombre, raza_id: raza_id || null, faccion_id: faccion_id || null, datos }; }
function facFromRow(r){ return { ...(r.datos || {}), id:r.id, autor:r.autor, tipo:r.tipo, nombre:r.nombre, actualizado:r.actualizado }; }
function facToRow(f){ const { id, autor, tipo, nombre, actualizado, ...datos } = f; return { tipo, nombre, datos }; }
const CAMPOS_CAMP = ["gancho","sinopsis","actos","pnjs","lugares","giros","final","consejosDM","ambiente","tono","duracion","nivel","jugadores","ejemplo"];
function campDatos(c){ const d = {}; for (const k of CAMPOS_CAMP) if (c[k] !== undefined) d[k] = c[k]; return d; }
function partFromRow(r){ return { ...(r.datos || {}), id:r.id, creador:r.creador, titulo:r.titulo, modo:r.modo, log:r.log || [], resumen:r.resumen || "", resumenIdx:r.resumen_idx || 0, usados:r.usados || {}, pgAct:r.pg_act || {}, combate:r.combate || {}, aprendiz:r.aprendiz !== false, escribiendo:r.escribiendo, escribiendoTs:r.escribiendo_ts, actualizado:r.actualizado }; }

/* ==================== reglas de personaje ==================== */
function razaInfo(pj){
  if (pj.raza_id){
    const f = facById(pj.raza_id);
    if (f) return { nombre:f.nombre, b:f.bonos || {}, v:+f.velocidad || 30, t:f.descripcion || "", fac:f };
    if (pj.razaSnap) return pj.razaSnap;
  }
  const n = RAZAS[pj.razaSrd] ? pj.razaSrd : "Humano";
  return { nombre:n, b:RAZAS[n].b, v:RAZAS[n].v, t:RAZAS[n].t };
}
function finalScores(pj){ const r = razaInfo(pj); const o = {}; for (const k of AB) o[k] = (pj.base?.[k] ?? 10) + (+r.b[k] || 0); return o; }
function derive(pj){
  const sc = finalScores(pj), c = CLASES[pj.clase] || {d:8,sv:[]}, lvl = +pj.nivel || 1, r = razaInfo(pj);
  const con = modOf(sc.CON), des = modOf(sc.DES);
  let pg = c.d + con + (lvl - 1) * (c.d/2 + 1 + con);
  if (!pj.raza_id && pj.razaSrd === "Enano") pg += lvl;
  pg = Math.max(1, pg);
  let caAuto = 10 + des, caTxt = "10 + DES (sin armadura)";
  if (c.ca === "barb"){ caAuto = 10 + des + con; caTxt = "10 + DES + CON (defensa sin armadura)"; }
  if (c.ca === "monk"){ caAuto = 10 + des + modOf(sc.SAB); caTxt = "10 + DES + SAB (defensa sin armadura)"; }
  return { sc, pg, ca: pj.ca ? +pj.ca : caAuto, caTxt: pj.ca ? "fijada a mano según tu armadura" : caTxt, prof: prof(lvl), ini: des, vel: r.v || 30, sv: c.sv || [], dado: c.d, raza: r };
}
// Avisos de fichas que perjudican al jugador sin que se dé cuenta
const SIN_ARMADURA = ["Mago","Hechicero","Monje","Bárbaro"];
function avisosPJ(p){
  const c = CLASES[p.clase], out = []; if (!c) return out;
  const d = derive(p), k = c.pri[0];
  if (p.metodo === "puntos"){ const usados = AB.reduce((a,x) => a + (PB_COST[p.base?.[x]] ?? 0), 0); if (usados < 27) out.push(`Te quedan ${27 - usados} de 27 puntos sin gastar en las características.`); }
  const porEncima = AB.filter(x => d.sc[x] > d.sc[k]).length;
  if (porEncima >= 2 || d.sc[k] < 12) out.push(`Como ${p.clase.toLowerCase()}, tu característica más importante es ${AB_N[k]} y ahora tiene ${d.sc[k]} (${fm(modOf(d.sc[k]))}). Ponle una de tus puntuaciones más altas${p.metodo === "puntos" ? "" : " o pulsa «Repartir según la clase»"}.`);
  if (!p.ca && !SIN_ARMADURA.includes(p.clase)) out.push("No has escrito la CA de tu armadura, así que se usa 10 + DES. Si llevas armadura, escríbela en «CA con armadura».");
  return out;
}
function facResumen(f){
  if (!f) return "";
  const partes = [`${f.tipo === "raza" ? "Raza" : "Facción"} «${f.nombre}» (creada por ${nombreUsuario(f.autor)}): ${f.descripcion || ""}`];
  if (f.tipo === "raza"){
    partes.push(`Tamaño ${f.tamano || "Mediano"}, velocidad ${f.velocidad || 30} pies. Bonos: ${Object.entries(f.bonos || {}).filter(([,v])=>+v).map(([k,v])=>k+" "+fm(+v)).join(", ") || "ninguno"}.`);
    if (f.vision && f.vision !== "No") partes.push(`Visión en la oscuridad: ${f.vision}.`);
  } else {
    if (f.objetivos) partes.push(`Objetivos: ${f.objetivos}.`);
    if (f.creencias) partes.push(`Creencias: ${f.creencias}.`);
    if (f.beneficios) partes.push(`Beneficios: ${f.beneficios}.`);
  }
  if (f.rasgos) partes.push(`Rasgos: ${String(f.rasgos).replace(/\n+/g, "; ")}.`);
  if (f.idiomas) partes.push(`Idiomas: ${f.idiomas}.`);
  if (f.aliados) partes.push(`Aliados: ${f.aliados}.`);
  if (f.enemigos) partes.push(`Enemigos: ${f.enemigos}.`);
  return partes.join(" ").slice(0, 1400);
}
function pjResumen(pj){
  const d = derive(pj), fac = pj.faccion_id ? facById(pj.faccion_id) : null;
  const st = AB.map(k => `${k} ${d.sc[k]} (${fm(modOf(d.sc[k]))})`).join(", ");
  return `${pj.nombre} (jugador: ${nombreUsuario(pj.dueno)}) — ${d.raza.nombre} ${pj.clase} nivel ${pj.nivel}${fac ? ", miembro de la facción " + fac.nombre : ""} (trasfondo ${pj.trasfondo}, ${pj.alineamiento}). ${st}. PG máx ${d.pg}, CA ${d.ca}, competencia ${fm(d.prof)}, iniciativa ${fm(d.ini)}, salvaciones competentes: ${d.sv.join(" y ")}.`
    + (pj.competencias ? ` Competencias: ${pj.competencias}.` : "")
    + (pj.equipo ? ` Equipo: ${pj.equipo}.` : "")
    + (pj.personalidad ? ` Personalidad: ${pj.personalidad}.` : "")
    + (pj.historia ? ` Historia: ${pj.historia.slice(0,500)}` : "");
}
function contextoMundo(pjs){
  const ids = new Set(); pjs.forEach(p => { if (p.raza_id) ids.add(p.raza_id); if (p.faccion_id) ids.add(p.faccion_id); });
  return [...ids].map(facById).filter(Boolean).map(f => "- " + facResumen(f)).join("\n");
}

/* ==================== dados ==================== */
const DIE_SHAPES = {
  4:'<polygon points="50,8 94,88 6,88" fill="var(--die-fill,var(--surface))" stroke="var(--die-stroke,var(--ink))" stroke-width="4" stroke-linejoin="round"/>',
  6:'<rect x="12" y="12" width="76" height="76" rx="10" fill="var(--die-fill,var(--surface))" stroke="var(--die-stroke,var(--ink))" stroke-width="4"/>',
  8:'<polygon points="50,4 94,50 50,96 6,50" fill="var(--die-fill,var(--surface))" stroke="var(--die-stroke,var(--ink))" stroke-width="4" stroke-linejoin="round"/><line x1="6" y1="50" x2="94" y2="50" stroke="var(--die-stroke,var(--ink))" stroke-width="2" opacity=".5"/>',
  10:'<polygon points="50,4 92,42 50,96 8,42" fill="var(--die-fill,var(--surface))" stroke="var(--die-stroke,var(--ink))" stroke-width="4" stroke-linejoin="round"/><polyline points="8,42 50,60 92,42" fill="none" stroke="var(--die-stroke,var(--ink))" stroke-width="2" opacity=".5"/>',
  12:'<polygon points="50,5 94,37 77,90 23,90 6,37" fill="var(--die-fill,var(--surface))" stroke="var(--die-stroke,var(--ink))" stroke-width="4" stroke-linejoin="round"/><polygon points="50,24 72,41 64,68 36,68 28,41" fill="none" stroke="var(--die-stroke,var(--ink))" stroke-width="2" opacity=".5"/>',
  20:'<polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="var(--die-fill,var(--surface))" stroke="var(--die-stroke,var(--ink))" stroke-width="4" stroke-linejoin="round"/><polygon points="50,22 76,66 24,66" fill="none" stroke="var(--die-stroke,var(--ink))" stroke-width="2" opacity=".6"/>',
  100:'<polygon points="30,8 54,30 30,70 6,30" fill="var(--die-fill,var(--surface))" stroke="var(--die-stroke,var(--ink))" stroke-width="4" stroke-linejoin="round"/><polygon points="70,30 94,52 70,92 46,52" fill="var(--die-fill,var(--surface))" stroke="var(--die-stroke,var(--ink))" stroke-width="4" stroke-linejoin="round"/>'
};
const dieSvg = (n, label=true) => `<svg viewBox="0 0 100 100" aria-hidden="true">${DIE_SHAPES[n]}${label ? `<text x="${n===100?50:50}" y="${n===4?72:58}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="${n===100?20:24}" fill="var(--ink)">${n===100?"%":n}</text>`:""}</svg>`;

/* Interpreta notación tipo "2d6+3", "1d20-1", "d%", "4d6kh3" */
function rollNotation(input, mode="normal"){
  const src = String(input || "").toLowerCase().replace(/\s+/g, "").replace(/d%/g, "d100");
  if (!src) throw new Error("Escribe una tirada, por ejemplo 1d20+3.");
  const re = /([+-])?(?:(\d*)d(\d+)(k[hl]\d+)?|(\d+))/g;
  let m, pos = 0, total = 0, parts = [], d20 = null, any = false;
  while ((m = re.exec(src))){
    if (m.index !== pos) throw new Error("No entiendo «" + input + "». Prueba algo como 2d6+3.");
    pos = re.lastIndex; any = true;
    const sign = m[1] === "-" ? -1 : 1;
    if (m[3]){
      const n = Math.min(100, +(m[2] || 1)), faces = +m[3];
      if (n < 1 || faces < 2 || faces > 1000) throw new Error("Ese dado no existe.");
      let rolls = [];
      // Ventaja/desventaja solo afecta a un único d20
      if (faces === 20 && n === 1 && mode !== "normal" && d20 === null){
        const a = rnd(20), b = rnd(20), keep = mode === "ventaja" ? Math.max(a,b) : Math.min(a,b);
        d20 = keep; total += sign * keep;
        parts.push(`${sign<0?"−":""}1d20 [${a}, ${b}] → ${keep} (${mode})`);
        continue;
      }
      for (let i=0;i<n;i++) rolls.push(rnd(faces));
      let kept = rolls.slice();
      if (m[4]){ const k = +m[4].slice(2), hi = m[4][1] === "h"; kept = rolls.slice().sort((x,y)=> hi ? y-x : x-y).slice(0, k); }
      const sum = kept.reduce((a,b)=>a+b,0);
      if (faces === 20 && n === 1 && d20 === null) d20 = rolls[0];
      total += sign * sum;
      parts.push(`${sign<0?"−":(parts.length?"+":"")}${n}d${faces}${m[4]||""} [${rolls.join(", ")}]${m[4]?" → "+kept.join("+"):""}`);
    } else {
      const v = +m[5]; total += sign * v; parts.push(`${sign<0?"−":"+"}${v}`);
    }
  }
  if (!any || pos !== src.length) throw new Error("No entiendo «" + input + "». Prueba algo como 2d6+3.");
  return { total, detalle: parts.join(" "), nat: d20, crit: d20 === 20, pifia: d20 === 1, notacion: input };
}

/* ==================== texto enriquecido seguro ==================== */
function rich(text, opts={}){
  const lines = esc(text).split(/\n/);
  let out = [], list = null, para = [];
  const flushP = () => { if (para.length){ out.push("<p>" + para.join("<br>") + "</p>"); para = []; } };
  const flushL = () => { if (list){ out.push("<ul>" + list.map(li => "<li>"+li+"</li>").join("") + "</ul>"); list = null; } };
  for (let raw of lines){
    let l = raw.trim();
    if (!l){ flushP(); flushL(); continue; }
    if (/^#{1,4}\s/.test(l)){ flushP(); flushL(); out.push("<h3>" + l.replace(/^#{1,4}\s/,"") + "</h3>"); continue; }
    if (/^&gt;\s?/.test(l)){ flushP(); flushL(); out.push("<blockquote>" + l.replace(/^&gt;\s?/,"") + "</blockquote>"); continue; }
    if (/^[-*•]\s+/.test(l)){ flushP(); (list ||= []).push(l.replace(/^[-*•]\s+/,"")); continue; }
    flushL(); para.push(l);
  }
  flushP(); flushL();
  let html = out.join("")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>");
  let n = 0;
  html = html.replace(/\[\[\s*tirada\s*:\s*([^\]|]+?)\s*(?:\|\s*([^\]|]*?)\s*)?(?:\|\s*([^\]|]*?)\s*)?\]\]/gi, (all, not, lab, cd) => {
    const key = (opts.msgIdx ?? 0) + ":" + (n++);
    const used = opts.used?.[key];
    return `<button class="rollreq" data-roll="${not}" data-label="${lab||""}" data-cd="${cd||""}" data-key="${key}" ${used?"disabled":""}><span>${used ? "Tirado: " + esc(used) : "Tirar " + (lab||"dados")}</span><span class="mono">${not}${cd? " · "+cd:""}</span></button>`;
  });
  return html;
}

/* ==================== bandeja de dados ==================== */
function trayHtml(){
  const last = S.hist[0];
  return `<div class="panel tray">
    <div class="panel-h"><h3>Bandeja de dados</h3><a class="small" href="#w-ventaja">¿Ventaja?</a></div>
    <div class="dice-btns">${[4,6,8,10,12,20,100].map(n=>`<button class="die-btn" data-act="die" data-n="${n}" aria-label="Tirar d${n}">${dieSvg(n,false)}d${n}</button>`).join("")}</div>
    <div class="mode-seg" role="group" aria-label="Modo del d20">${["normal","ventaja","desventaja"].map(m=>`<button data-act="tray-mode" data-m="${m}" aria-pressed="${S.trayMode===m}">${m[0].toUpperCase()+m.slice(1)}</button>`).join("")}</div>
    <form class="row" data-form="tray" style="flex-wrap:nowrap"><input type="text" id="tray-in" placeholder="Ej.: 1d20+5 o 2d6+3" aria-label="Tirada personalizada" class="mono"><button class="btn" type="submit">Tirar</button></form>
    <div class="result" aria-live="polite">${last ? `<span class="total ${last.crit?"crit":last.pifia?"fumble":""}">${last.total}</span><span class="small mono muted">${esc(last.notacion)}: ${esc(last.detalle)}</span>${last.crit?'<span class="small" style="color:var(--ok)">¡20 natural! Si es un ataque, es un crítico.</span>':last.pifia?'<span class="small" style="color:var(--bad)">1 natural: si es un ataque, falla automáticamente.</span>':""}` : `<span class="small muted">Pulsa un dado o escribe una tirada. El modo ventaja/desventaja se aplica al d20.</span>`}</div>
    ${S.hist.length>1?`<div class="history">${S.hist.slice(1,8).map(h=>`<div><span class="mono muted">${esc(h.notacion)}</span><b class="mono">${h.total}</b></div>`).join("")}</div>`:""}
  </div>`;
}
function tirarBandeja(not){
  try { const r = rollNotation(not, S.trayMode); S.hist.unshift(r); S.hist = S.hist.slice(0,12); const t = document.querySelector(".tray"); if (t) t.outerHTML = trayHtml(); }
  catch (e) { toast(esc(e.message)); }
}

/* ==================== WIKI DE DADOS ==================== */
const DADOS = [
  {n:4, nombre:"El tetraedro", lee:"Tiene forma de pirámide y no cae con una cara hacia arriba. El resultado es el número que queda en la punta de arriba (o, en algunos dados, el que está en la base de las caras visibles; todos los números iguales que veas apuntan al resultado).", usos:"Daño de armas pequeñas como la daga (1d4), el conjuro Proyectil mágico (1d4+1 por dardo) y la poción de curación (2d4+2).", ej:"1d4+2", truco:"Duele pisarlo descalzo. Guárdalo siempre en la caja."},
  {n:6, nombre:"El cubo", lee:"El dado de toda la vida: lee la cara de arriba.", usos:"Daño de espada corta (1d6), Bola de fuego (8d6), ataque furtivo del pícaro y, al crear personaje, la tirada 4d6 de características.", ej:"2d6", truco:"Se suelen tirar muchos a la vez. Ten un puñado a mano."},
  {n:8, nombre:"El octaedro", lee:"Parece dos pirámides unidas por la base. Lee la cara de arriba.", usos:"Daño de espada larga (1d8) y estoque, dado de golpe de clérigos, pícaros y bardos.", ej:"1d8+3", truco:"Es fácil confundirlo con el d10 a primera vista: el d8 tiene caras triangulares."},
  {n:10, nombre:"El trapezoedro", lee:"Tiene diez caras con forma de cometa, numeradas del 0 al 9. El 0 vale 10 cuando tiras un d10 solo.", usos:"Daño de alabarda (1d10) y Rayo de fuego (1d10), dado de golpe de guerreros, paladines y exploradores.", ej:"1d10", truco:"Si en la cara pone 0, cuenta como 10."},
  {n:12, nombre:"El dodecaedro", lee:"Doce caras de cinco lados. Lee la cara de arriba.", usos:"Daño del hacha a dos manos (1d12) y dado de golpe del bárbaro.", ej:"1d12+3", truco:"Es el dado que menos se usa. ¡Tu bárbaro lo hará feliz!"},
  {n:20, nombre:"El icosaedro, el rey", lee:"Veinte caras triangulares. Lee la cara de arriba.", usos:"Casi todo lo importante: ataques, pruebas de habilidad, tiradas de salvación e iniciativa. Si dudas de qué dado tirar, casi seguro es el d20.", ej:"1d20+5", truco:"Un 20 natural (sin sumar nada) en un ataque es un crítico. Un 1 natural es un fallo automático."},
  {n:100, nombre:"El percentil (d100)", lee:"No es un dado: son dos d10. Uno marca las decenas (suele venir con 00, 10, 20…) y otro las unidades (0 a 9). 30 y 7 = 37. 00 y 0 = 100.", usos:"Tablas aleatorias, objetos mágicos salvajes, probabilidades (\"hay un 25 % de que…\").", ej:"1d100", truco:"Decide antes de tirar cuál es el dado de las decenas."}
];
function vDados(){
  return `<section class="view">
    <div style="display:grid;gap:8px"><span class="label">Para principiantes</span><h1>Wiki de dados</h1><p class="lede">Todo lo que necesitas para tirar con confianza en tu primera partida. Cada ejemplo tiene un botón para probarlo de verdad, y la bandeja de dados está al final.</p></div>
    <div class="wiki">
      <nav class="toc" aria-label="Contenido">
        <a href="#w-que">¿Qué significa 2d6+3?</a><a href="#w-dados">Los siete dados</a><a href="#w-cuando">¿Cuándo se tira?</a><a href="#w-tipos">Los tres tipos de tirada</a><a href="#w-mod">Modificadores</a><a href="#w-comp">Bonificador de competencia</a><a href="#w-cd">Dificultad (CD) y CA</a><a href="#w-ventaja">Ventaja y desventaja</a><a href="#w-crit">Críticos y pifias</a><a href="#w-dano">Tiradas de daño</a><a href="#w-iniciativa">Iniciativa</a><a href="#w-muerte">Salvaciones contra muerte</a><a href="#w-ejemplo">Ejemplo completo</a><a href="#w-errores">Errores típicos</a><a href="#w-glosario">Glosario</a><a href="#w-bandeja">Bandeja de dados</a>
      </nav>
      <div class="wiki-body">
        <section class="wsec" id="w-que">
          <h2>¿Qué significa «2d6+3»?</h2>
          <p>En D&amp;D las tiradas se escriben con un código corto. La <b>d</b> significa «dado». El número de delante dice <b>cuántos</b> dados tiras, el de detrás <b>cuántas caras</b> tiene cada uno, y lo que va después del signo es un número fijo que <b>sumas o restas</b> al final.</p>
          <div class="formula"><span><b>2</b><small>cuántos dados</small></span><span><b>d</b><small>«dado»</small></span><span><b>6</b><small>caras del dado</small></span><span><b>+3</b><small>se suma al total</small></span></div>
          <p>Así que <span class="mono">2d6+3</span> es: tira dos dados de seis caras, suma lo que salga y añade 3. Si sacas un 4 y un 5, el resultado es 4 + 5 + 3 = <b>12</b>. Si no hay número delante de la d, es un solo dado: <span class="mono">d20</span> es lo mismo que <span class="mono">1d20</span>.</p>
          <div class="row"><button class="try" data-try="2d6+3">Probar 2d6+3</button><button class="try" data-try="1d20">Probar 1d20</button><button class="try" data-try="3d8-1">Probar 3d8−1</button></div>
        </section>

        <section class="wsec" id="w-dados">
          <h2>Los siete dados</h2>
          <p>Un juego de dados de D&amp;D trae siete. Cada uno tiene su función. No hace falta memorizarlo: la ficha, el conjuro o el arma siempre te dirá qué dado tirar.</p>
          <div class="dice-cards">${DADOS.map(d=>`<article class="dcard"><div class="dcard-h">${dieSvg(d.n)}<div><h3>d${d.n===100?"100 (d%)":d.n}</h3><span class="small muted">${d.nombre}</span></div></div>
            <dl><div><dt>Cómo se lee</dt><dd>${d.lee}</dd></div><div><dt>Se usa para</dt><dd>${d.usos}</dd></div><div><dt>Truco</dt><dd>${d.truco}</dd></div></dl>
            <button class="try" data-try="${d.ej}">Probar ${d.ej}</button></article>`).join("")}</div>
        </section>

        <section class="wsec" id="w-cuando">
          <h2>¿Cuándo se tiran los dados?</h2>
          <p><b>Regla de oro:</b> solo se tira cuando el resultado es incierto y fallar tendría consecuencias. Abrir una puerta normal no necesita tirada. Abrirla en silencio mientras un ogro duerme al otro lado, sí.</p>
          <p>Tú nunca decides tirar por tu cuenta: describes lo que quieres hacer y el DM te dice si hace falta tirar y qué tirada es. El ciclo siempre es el mismo:</p>
          <div class="flow">
            <div><b>Describes</b><span class="small muted">«Intento trepar por la pared del pozo.»</span></div>
            <div><b>El DM pide tirada</b><span class="small muted">«Haz una prueba de Atletismo.»</span></div>
            <div><b>Tiras el d20</b><span class="small muted">Sale un 12.</span></div>
            <div><b>Sumas tu modificador</b><span class="small muted">12 + 5 de Atletismo = 17.</span></div>
            <div><b>El DM compara y narra</b><span class="small muted">Superaba la CD 15: «Llegas arriba con los brazos temblando.»</span></div>
          </div>
        </section>

        <section class="wsec" id="w-tipos">
          <h2>Los tres tipos de tirada de d20</h2>
          <p>Casi todo en el juego se resuelve con un d20 más un modificador. Lo que cambia es contra qué número compites.</p>
          <div class="tblwrap"><table><thead><tr><th>Tirada</th><th>Para qué</th><th>Qué sumas</th><th>Contra qué</th></tr></thead><tbody>
            <tr><td><b>Prueba de característica</b> (o de habilidad)</td><td>Hacer algo difícil: trepar, mentir, buscar pistas, forzar una cerradura.</td><td>Modificador de la característica + competencia si dominas la habilidad.</td><td>La CD que pone el DM.</td></tr>
            <tr><td><b>Tirada de ataque</b></td><td>Golpear con un arma o un conjuro de ataque.</td><td>Mod. de FUE (cuerpo a cuerpo) o DES (a distancia) + competencia.</td><td>La CA (clase de armadura) del enemigo.</td></tr>
            <tr><td><b>Tirada de salvación</b></td><td>Resistir algo que te pasa: veneno, una trampa, un hechizo.</td><td>Mod. de la característica que te pidan + competencia si tu clase la tiene.</td><td>La CD de la trampa o del conjuro.</td></tr>
          </tbody></table></div>
          <p><b>Igualar es acertar.</b> Si la CD es 15 y sacas exactamente 15, lo consigues.</p>
          <div class="row"><button class="try" data-try="1d20+5">Prueba de Atletismo +5</button><button class="try" data-try="1d20+4">Ataque con espada +4</button><button class="try" data-try="1d20+2">Salvación de DES +2</button></div>
        </section>

        <section class="wsec" id="w-mod">
          <h2>Modificadores: de la puntuación al número que sumas</h2>
          <p>Tu personaje tiene seis características (Fuerza, Destreza, Constitución, Inteligencia, Sabiduría y Carisma) con una <b>puntuación</b> entre 1 y 20, aproximadamente. Pero a los dados no sumas la puntuación, sino su <b>modificador</b>. Se calcula así: resta 10 a la puntuación, divide entre 2 y redondea hacia abajo.</p>
          <div class="tblwrap"><table><thead><tr><th class="mono">Puntuación</th><th class="mono">1</th><th class="mono">2–3</th><th class="mono">4–5</th><th class="mono">6–7</th><th class="mono">8–9</th><th class="mono">10–11</th><th class="mono">12–13</th><th class="mono">14–15</th><th class="mono">16–17</th><th class="mono">18–19</th><th class="mono">20</th></tr></thead>
          <tbody><tr><td><b>Modificador</b></td>${[-5,-4,-3,-2,-1,0,1,2,3,4,5].map(v=>`<td class="mono">${fm(v)}</td>`).join("")}</tr></tbody></table></div>
          <p>Ejemplo: Destreza 16 → (16 − 10) / 2 = <b>+3</b>. Cada vez que tires algo de Destreza, sumas 3. En la sección <a href="#personajes">Personajes</a> la app lo calcula sola.</p>
        </section>

        <section class="wsec" id="w-comp">
          <h2>Bonificador de competencia</h2>
          <p>Es un extra que sumas cuando haces algo en lo que tu personaje está entrenado: sus armas, sus habilidades (por ejemplo Sigilo para un pícaro) y sus tiradas de salvación de clase. Empieza en +2 y sube con el nivel.</p>
          <div class="tblwrap"><table><thead><tr><th>Nivel</th><th class="mono">1–4</th><th class="mono">5–8</th><th class="mono">9–12</th><th class="mono">13–16</th><th class="mono">17–20</th></tr></thead><tbody><tr><td><b>Competencia</b></td><td class="mono">+2</td><td class="mono">+3</td><td class="mono">+4</td><td class="mono">+5</td><td class="mono">+6</td></tr></tbody></table></div>
          <p>Ejemplo: un pícaro de nivel 1 con Destreza 16 (+3) y competente en Sigilo tira <span class="mono">1d20 + 3 + 2 = 1d20+5</span>.</p>
        </section>

        <section class="wsec" id="w-cd">
          <h2>Dificultad (CD) y clase de armadura (CA)</h2>
          <p>La <b>CD</b> (clase de dificultad) es el número que tienes que igualar o superar en una prueba. La pone el DM según lo difícil que sea la tarea:</p>
          <div class="tblwrap"><table><thead><tr><th>Tarea</th><th class="mono">CD</th><th>Ejemplo</th></tr></thead><tbody>
            <tr><td>Muy fácil</td><td class="mono">5</td><td>Saltar un arroyo estrecho.</td></tr>
            <tr><td>Fácil</td><td class="mono">10</td><td>Trepar una cuerda con nudos.</td></tr>
            <tr><td>Media</td><td class="mono">15</td><td>Convencer a un guardia desconfiado.</td></tr>
            <tr><td>Difícil</td><td class="mono">20</td><td>Abrir una cerradura de enano.</td></tr>
            <tr><td>Muy difícil</td><td class="mono">25</td><td>Nadar contra una corriente furiosa.</td></tr>
            <tr><td>Casi imposible</td><td class="mono">30</td><td>Convencer al rey de que te dé su corona.</td></tr>
          </tbody></table></div>
          <p>La <b>CA</b> (clase de armadura) es lo mismo pero para los ataques: lo difícil que es golpear a alguien. Un goblin tiene CA 15; si tu tirada de ataque da 15 o más, le das.</p>
        </section>

        <section class="wsec" id="w-ventaja">
          <h2>Ventaja y desventaja</h2>
          <p>Cuando las circunstancias te favorecen (atacas a alguien dormido, un aliado te ayuda), el DM te da <b>ventaja</b>: tiras <b>dos d20 y te quedas con el mayor</b>. Cuando te perjudican (atacas a ciegas, estás envenenado), tienes <b>desventaja</b>: tiras dos d20 y te quedas con el <b>menor</b>. Luego sumas tu modificador una sola vez.</p>
          <ul><li>No se acumulan: tres motivos de ventaja siguen siendo dos dados.</li><li>Si tienes ventaja y desventaja a la vez, se anulan y tiras un solo d20.</li><li>Solo afecta al d20, nunca a los dados de daño.</li><li>Más o menos equivale a +5 o −5 al resultado.</li></ul>
          <div class="demo" id="adv-demo">
            <b>Pruébalo: ataque +4 contra CA 15</b>
            <div class="row"><button class="btn sm" data-adv="normal">Normal</button><button class="btn sm" data-adv="ventaja">Con ventaja</button><button class="btn sm" data-adv="desventaja">Con desventaja</button></div>
            <div class="twodice" id="adv-out"><span class="small muted">Pulsa un botón para ver los dos d20.</span></div>
          </div>
        </section>

        <section class="wsec" id="w-crit">
          <h2>Críticos y pifias</h2>
          <p>Un <b>20 natural</b> es sacar un 20 en el propio dado, antes de sumar nada. En una <b>tirada de ataque</b> es un <b>crítico</b>: aciertas siempre, sin importar la CA, y tiras el doble de dados de daño (el modificador se suma una sola vez). Una espada larga que hace <span class="mono">1d8+3</span> hace <span class="mono">2d8+3</span> en un crítico.</p>
          <p>Un <b>1 natural</b> en un ataque es un <b>fallo automático</b>, aunque con tus bonos llegaras a la CA. En las pruebas de habilidad y salvaciones, según las reglas oficiales, el 20 y el 1 no tienen efecto especial (aunque muchos DM los celebran igualmente).</p>
          <div class="row"><button class="try" data-try="2d8+3">Daño crítico 2d8+3</button></div>
        </section>

        <section class="wsec" id="w-dano">
          <h2>Tiradas de daño</h2>
          <p>Si tu ataque acierta, tiras el dado de daño de tu arma o conjuro y sumas el mismo modificador de característica que usaste para atacar (no el de competencia). El resultado se resta de los <b>puntos de golpe (PG)</b> del objetivo. Cuando llegan a 0, cae.</p>
          <div class="tblwrap"><table><thead><tr><th>Arma o conjuro</th><th class="mono">Daño</th></tr></thead><tbody>
            <tr><td>Daga</td><td class="mono">1d4 + FUE o DES</td></tr><tr><td>Espada corta, arco corto</td><td class="mono">1d6 + DES</td></tr><tr><td>Espada larga</td><td class="mono">1d8 + FUE</td></tr><tr><td>Hacha a dos manos</td><td class="mono">1d12 + FUE</td></tr><tr><td>Rayo de fuego (truco)</td><td class="mono">1d10</td></tr><tr><td>Bola de fuego</td><td class="mono">8d6</td></tr>
          </tbody></table></div>
        </section>

        <section class="wsec" id="w-iniciativa">
          <h2>Iniciativa: quién actúa primero</h2>
          <p>Cuando empieza un combate, todos tiran <span class="mono">1d20 + modificador de Destreza</span>. El DM ordena de mayor a menor y se actúa por turnos en ese orden. Cuando todos han actuado, termina la <b>ronda</b> (unos 6 segundos dentro del juego) y empieza otra en el mismo orden.</p>
          <p>En tu turno puedes <b>moverte</b> (tu velocidad, normalmente 30 pies), hacer una <b>acción</b> (atacar, lanzar un conjuro, esconderte, ayudar…) y a veces una <b>acción adicional</b> si tu clase o conjuro lo permite.</p>
          <div class="row"><button class="try" data-try="1d20+3">Iniciativa con DES +3</button></div>
        </section>

        <section class="wsec" id="w-muerte">
          <h2>Tiradas de salvación contra muerte</h2>
          <p>Si tu personaje llega a 0 PG cae inconsciente. Al principio de cada uno de sus turnos tira un <span class="mono">1d20</span> sin sumar nada:</p>
          <ul><li><b>10 o más:</b> un éxito. <b>9 o menos:</b> un fallo.</li><li><b>3 éxitos:</b> te estabilizas (sigues inconsciente, pero ya no mueres).</li><li><b>3 fallos:</b> el personaje muere.</li><li><b>20 natural:</b> recuperas 1 PG y te despiertas.</li><li><b>1 natural:</b> cuenta como dos fallos.</li><li>Cualquier curación te levanta al instante. Un aliado también puede estabilizarte con una prueba de Medicina CD 10.</li></ul>
          <div class="row"><button class="try" data-try="1d20">Tirar salvación contra muerte</button></div>
        </section>

        <section class="wsec" id="w-ejemplo">
          <h2>Ejemplo completo, paso a paso</h2>
          <p>Lyra, una pícara mediana de nivel 1 (Destreza 17, modificador +3, competencia +2), quiere apuñalar a un goblin que no la ha visto.</p>
          <ol>
            <li><b>Lo describe:</b> «Me acerco por detrás entre las sombras y le ataco con mi daga.»</li>
            <li><b>Sigilo primero:</b> el DM pide una prueba de Sigilo CD 12. Lyra tira 1d20+5 y saca 9 + 5 = 14. ¡No la ve!</li>
            <li><b>Ataque con ventaja:</b> como el goblin no la ve, tiene ventaja. Tira dos d20: 6 y 17. Se queda el 17. Suma +5 (DES +3, competencia +2) = 22. La CA del goblin es 15: acierta.</li>
            <li><b>Daño:</b> daga 1d4 + 3, más su ataque furtivo de pícaro (1d6). Saca 3 + 3 + 4 = 10.</li>
            <li><b>Resultado:</b> el goblin tenía 7 PG. El DM narra: «El goblin se desploma sin un ruido.»</li>
          </ol>
          <div class="row"><button class="try" data-try="1d20+5">Sigilo 1d20+5</button><button class="try" data-try="1d4+1d6+3">Daño 1d4+1d6+3</button></div>
        </section>

        <section class="wsec" id="w-errores">
          <h2>Errores típicos al empezar</h2>
          <ul>
            <li><b>Sumar la puntuación en vez del modificador.</b> Con Fuerza 16 sumas +3, no 16.</li>
            <li><b>Sumar la competencia al daño.</b> La competencia va al ataque, el modificador de característica va a los dos.</li>
            <li><b>Tirar antes de que el DM lo pida.</b> Describe primero; quizá ni siquiera haga falta tirar.</li>
            <li><b>Doblar el modificador en un crítico.</b> En un crítico solo se doblan los dados.</li>
            <li><b>Olvidar que igualar es acertar.</b> Si la CD es 13 y sacas 13, lo consigues.</li>
            <li><b>Confundir el d8 y el d10.</b> El d8 tiene caras triangulares; el d10, caras con forma de cometa.</li>
          </ul>
        </section>

        <section class="wsec" id="w-glosario">
          <h2>Glosario rápido</h2>
          <div class="glos">
            <div><b>DM</b>Dungeon Master, quien dirige la historia y hace de todos los personajes que no son de los jugadores.</div>
            <div><b>PJ</b>Personaje jugador: el tuyo.</div>
            <div><b>PNJ</b>Personaje no jugador: tabernero, villano, rey… los interpreta el DM.</div>
            <div><b>PG</b>Puntos de golpe: tu vida. A 0, caes inconsciente.</div>
            <div><b>CA</b>Clase de armadura: lo difícil que es golpearte.</div>
            <div><b>CD</b>Clase de dificultad: el número a superar en una prueba o salvación.</div>
            <div><b>Natural</b>Lo que marca el dado antes de sumar nada.</div>
            <div><b>Mod.</b>Modificador: el número que sumas por tu característica.</div>
            <div><b>Dado de golpe</b>El dado que define tus PG por nivel y que gastas en descansos cortos para curarte.</div>
            <div><b>Descanso corto / largo</b>1 hora para recuperar algo de vida; 8 horas para recuperarlo casi todo.</div>
            <div><b>Ronda</b>Unos 6 segundos de combate en los que todos actúan una vez.</div>
            <div><b>SRD</b>El reglamento básico gratuito de D&amp;D 5e en el que se basa esta app.</div>
          </div>
        </section>

        <section class="wsec" id="w-bandeja">
          <h2>Bandeja de dados</h2>
          <p>Pulsa un dado para tirarlo o escribe cualquier tirada, como <span class="mono">4d6kh3</span> (tira 4d6 y quédate con los 3 mayores, para crear personajes).</p>
          <div style="max-width:420px">${trayHtml()}</div>
        </section>
      </div>
    </div>
  </section>`;
}
function d20Face(v, lost){ return `<div class="d20face ${lost?"lost":""}">${dieSvg(20,false)}<span>${v}</span></div>`; }
function advDemo(mode){
  const a = rnd(20), b = rnd(20), out = $("#adv-out");
  let keep = a, html = "";
  if (mode === "normal"){ html = d20Face(a); }
  else { keep = mode === "ventaja" ? Math.max(a,b) : Math.min(a,b); const lostA = a !== keep || (a===b ? false : false); html = d20Face(a, a!==keep) + d20Face(b, b!==keep || (a===b)); }
  const tot = keep + 4, hit = keep === 20 || (keep !== 1 && tot >= 15);
  out.innerHTML = html + `<div style="display:grid;gap:2px"><span class="mono">${keep} + 4 = <b>${tot}</b></span><span class="small" style="color:${hit?"var(--ok)":"var(--bad)"}">${keep===20?"¡Crítico! Acierto automático y daño doble.":keep===1?"1 natural: fallo automático.":hit?"Iguala o supera la CA 15: ¡aciertas!":"No llega a 15: fallas."}</span></div>`;
}

/* ==================== datos: carga y tiempo real ==================== */
async function q(promesa){ const { data, error } = await promesa; if (error) throw error; return data; }
const CARGAS = {
  dm_perfiles: async () => { const d = await q(sb.from("dm_perfiles").select("id,usuario")); S.perfiles = Object.fromEntries(d.map(p => [p.id, p])); S.perfil = S.perfiles[S.me] || S.perfil; },
  dm_facciones: async () => { S.facciones = (await q(sb.from("dm_facciones").select("*").order("nombre"))).map(facFromRow); },
  dm_personajes: async () => { S.personajes = (await q(sb.from("dm_personajes").select("*").order("actualizado", {ascending:false}))).map(pjFromRow); },
  dm_partidas: async () => { S.partidas = (await q(sb.from("dm_partidas").select("*").order("actualizado", {ascending:false}))).map(partFromRow); },
  dm_participantes: async () => { S.participantes = await q(sb.from("dm_participantes").select("*")); }
};
async function cargarTodo(){ await Promise.all(Object.values(CARGAS).map(f => f())); }
let canal = null; const recargas = {};
function suscribir(){
  if (canal) return;
  canal = sb.channel("mesa-del-dm");
  for (const t of Object.keys(CARGAS)) canal.on("postgres_changes", { event:"*", schema:"public", table:t }, () => programarRecarga(t));
  canal.subscribe();
}
function programarRecarga(t){
  clearTimeout(recargas[t]);
  recargas[t] = setTimeout(async () => { try { await CARGAS[t](); softRender(); } catch {} }, 350);
}
async function guardar(promesa, ok){
  try { const r = await q(promesa); if (ok) toast(ok); return r; }
  catch (e) { toast(esc(errorTexto(e))); throw e; }
}
function errorTexto(e){
  const m = String(e?.message || e || "");
  if (/duplicate key.*usuario/i.test(m)) return "Ese nombre de usuario ya está cogido. Elige otro.";
  if (/row-level security|permission/i.test(m)) return "No tienes permiso para cambiar esto: solo puede hacerlo quien lo creó.";
  if (/Solo quien creó/i.test(m)) return "Solo quien creó la partida puede cambiar la campaña.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Sin conexión con el servidor. Revisa tu internet.";
  return m || "Algo salió mal. Vuelve a intentarlo.";
}

/* ==================== IA (vía función segura de Supabase) ==================== */
async function ia(body){
  const { data, error } = await sb.functions.invoke(CFG.funcionIA || "dm-ia", { body });
  if (error){
    let code = "upstream", message = "";
    try { const j = await error.context.json(); code = j.error || code; message = j.mensaje || ""; } catch {}
    throw { code, message };
  }
  if (data?.error) throw { code:data.error, message:data.mensaje };
  return data;
}
const iaJSON = async (prompt, esfuerzo="medium") => parseJSON((await ia({ modo:"json", esfuerzo, messages:[{ role:"user", content:prompt }] })).texto);
function iaMsg(e){
  switch (e?.code){
    case "limite_diario": return "Has llegado al límite diario de mensajes de IA. Vuelve mañana.";
    case "sin_clave": return "La IA está desactivada por ahora en esta mesa. Puedes hacerlo todo a mano: fichas, razas, facciones y partidas.";
    case "no_autorizado": return "Tu sesión ha caducado. Vuelve a entrar.";
    case "sin_perfil": return "Primero elige tu nombre de usuario.";
    case "refused": return "La IA no quiso responder a eso. Prueba a reformularlo.";
    case "rate_limited": return "La IA está saturada ahora mismo. Espera unos segundos y vuelve a intentarlo.";
    case "invalid_json": return "La IA respondió en un formato que no pude leer. Pulsa otra vez para reintentar.";
    case "demasiado_largo": return "La partida es demasiado larga para enviarla entera. Usa «Resumir historia».";
    default: return e?.message ? "Error de la IA: " + e.message : "Hubo un problema con la IA. Vuelve a intentarlo.";
  }
}
const thinking = txt => `<span class="thinking"><i></i><i></i><i></i> ${txt}</span>`;

/* ==================== sesión ==================== */
async function alSesion(session){
  const uid = session?.user?.id || null;
  if (uid && uid === S.me && S.perfil) return;
  S.user = session?.user || null; S.me = uid; S.perfil = null;
  if (!uid){ if (canal){ sb.removeChannel(canal); canal = null; } S.loaded = true; render(); return; }
  try {
    let p = await q(sb.from("dm_perfiles").select("id,usuario").eq("id", uid).maybeSingle());
    const pedido = S.user.user_metadata?.usuario;
    if (!p && pedido){ try { p = await q(sb.from("dm_perfiles").insert({ id:uid, usuario:pedido }).select().single()); } catch {} }
    S.perfil = p;
    if (p){ await cargarTodo(); suscribir(); }
  } catch (e) { toast(esc(errorTexto(e))); }
  S.loaded = true; render();
}
function vAuth(){
  if (S.recovery) return `<section class="view auth"><div class="panel"><h2>Nueva contraseña</h2>
    <form data-form="nueva-clave" class="grid2" style="grid-template-columns:1fr"><label class="field"><span>Contraseña nueva</span><input type="password" id="a-clave2" minlength="6" required autocomplete="new-password"></label><button class="btn primary" type="submit">Guardar contraseña</button></form></div></section>`;
  const m = S.authMode;
  return `<section class="view auth">
    <div style="display:grid;gap:8px;text-align:center"><span class="label">D&amp;D 5ª edición · en español</span><h1>Mesa del Dungeon Master</h1><p class="muted">Entra con tu cuenta para ver los personajes, razas y facciones de toda la mesa.</p></div>
    <div class="panel">
      <div class="seg" role="group" aria-label="Acceso"><button data-act="auth-modo" data-m="entrar" aria-pressed="${m==="entrar"}">Entrar</button><button data-act="auth-modo" data-m="registro" aria-pressed="${m==="registro"}">Crear cuenta</button><button data-act="auth-modo" data-m="olvido" aria-pressed="${m==="olvido"}">Olvidé mi contraseña</button></div>
      <form data-form="auth" style="display:grid;gap:12px">
        ${m==="registro"?`<label class="field"><span>Nombre de usuario</span><input type="text" id="a-usuario" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_.áéíóúÁÉÍÓÚñÑ\\-]+" placeholder="Así te verán los demás" autocomplete="username"></label>`:""}
        <label class="field"><span>${m==="entrar"?"Correo o nombre de usuario":"Correo"}</span><input type="${m==="entrar"?"text":"email"}" id="a-correo" required autocomplete="${m==="entrar"?"username":"email"}" autocapitalize="none" spellcheck="false"></label>
        ${m!=="olvido"?`<label class="field"><span>Contraseña</span><input type="password" id="a-clave" required minlength="6" autocomplete="${m==="registro"?"new-password":"current-password"}"></label>`:""}
        <button class="btn primary" type="submit">${m==="entrar"?"Entrar":m==="registro"?"Crear mi cuenta":"Enviarme un enlace"}</button>
        <span id="a-st" class="small muted"></span>
      </form>
    </div>
    <p class="small muted" style="text-align:center">¿Solo quieres aprender a tirar dados? <a href="#dados">Abre la wiki de dados</a>, no hace falta cuenta.</p>
  </section>`;
}
function vElegirUsuario(){
  return `<section class="view auth"><div class="panel"><h2>Elige tu nombre de usuario</h2>
    <p class="muted">Es el nombre que verán los demás junto a tus personajes y facciones.</p>
    <form data-form="usuario" style="display:grid;gap:12px"><label class="field"><span>Nombre de usuario</span><input type="text" id="u-nombre" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_.áéíóúÁÉÍÓÚñÑ\\-]+" value="${esc(S.user?.user_metadata?.usuario||"")}"></label>
    <button class="btn primary" type="submit">Guardar</button></form></div></section>`;
}
async function enviarAuth(){
  const st = $("#a-st"), correo = $("#a-correo").value.trim(), clave = $("#a-clave")?.value || "";
  st.textContent = "Un momento…";
  const vuelta = location.origin + location.pathname;
  if (S.authMode === "entrar"){
    if (!correo.includes("@")) return entrarConUsuario(correo, clave, st);
    const { error } = await sb.auth.signInWithPassword({ email:correo, password:clave });
    st.textContent = error ? (/confirm/i.test(error.message) ? "Confirma primero tu correo: te enviamos un enlace al registrarte." : "Correo o contraseña incorrectos.") : "";
  } else if (S.authMode === "registro"){
    const usuario = $("#a-usuario").value.trim();
    const { data, error } = await sb.auth.signUp({ email:correo, password:clave, options:{ data:{ usuario }, emailRedirectTo:vuelta } });
    if (error) st.textContent = /registered/i.test(error.message) ? "Ese correo ya tiene cuenta. Pulsa «Entrar»."
      : /rate limit|security purposes/i.test(error.message) ? "Se han enviado demasiados correos de confirmación en poco tiempo. Espera un rato y vuelve a intentarlo, o pide a quien administra la mesa que lo revise."
      : error.message;
    else if (!data.session) st.innerHTML = "<b>¡Listo!</b> Te enviamos un correo para confirmar la cuenta. Ábrelo y vuelve aquí.";
  } else {
    const { error } = await sb.auth.resetPasswordForEmail(correo, { redirectTo:vuelta });
    st.textContent = error ? error.message : "Si ese correo tiene cuenta, te llegará un enlace para cambiar la contraseña.";
  }
}
// El correo se busca en el servidor (función dm-entrar): nunca llega al navegador
async function entrarConUsuario(usuario, clave, st){
  const MSG = { credenciales:"Usuario o contraseña incorrectos.", sin_confirmar:"Confirma primero tu correo: te enviamos un enlace al registrarte.", rate_limited:"Demasiados intentos. Espera un minuto y vuelve a probar." };
  const { data, error } = await sb.functions.invoke(CFG.funcionEntrar || "dm-entrar", { body:{ usuario, clave } });
  let code = data?.error;
  if (error){ try { code = (await error.context.json()).error; } catch { code = "red"; } }
  if (code || !data?.access_token){ st.textContent = MSG[code] || "No se pudo entrar. Revisa tu conexión y vuelve a intentarlo."; return; }
  const r = await sb.auth.setSession({ access_token:data.access_token, refresh_token:data.refresh_token });
  st.textContent = r.error ? "No se pudo entrar. Vuelve a intentarlo." : "";
}
function pintarMenu(){
  const m = $("#userMenu");
  m.innerHTML = S.perfil ? `<b>${esc(S.perfil.usuario)}</b><button class="btn sm ghost" data-act="salir">Salir</button>` : (S.me ? `<button class="btn sm ghost" data-act="salir">Salir</button>` : "");
}

/* ==================== router y render ==================== */
const VIEWS = ["inicio","personajes","facciones","campanas","jugar","asistente","dados"];
function route(){
  const h = location.hash.replace("#","");
  S.view = VIEWS.includes(h) ? h : (h.startsWith("w-") ? "dados" : "inicio");
  render();
  if (h.startsWith("w-")) setTimeout(() => document.getElementById(h)?.scrollIntoView(), 30);
  else window.scrollTo(0,0);
}
const after = {};
function escribiendoAhora(){ const a = document.activeElement; return a && $("#app").contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== "checkbox"; }
function softRender(){ if (S.busy || escribiendoAhora()){ S.pending = true; return; } render(); }
document.addEventListener("focusout", () => setTimeout(() => { if (S.pending && !S.busy && !escribiendoAhora()){ S.pending = false; render(); } }, 120));
function render(sinLeer){
  S.pending = false;
  if (!sinLeer && S.edit && S.view === "personajes") leerForm();
  if (!sinLeer && S.editFac && S.view === "facciones") leerFac();
  $$(".tab").forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === "#" + S.view ? "page" : "false"));
  pintarMenu();
  const app = $("#app");
  if (!S.loaded){ app.innerHTML = `<div class="loading">Cargando la mesa…</div>`; return; }
  let html;
  if (S.view === "dados") html = vDados();
  else if (!S.me || S.recovery) html = vAuth();
  else if (!S.perfil) html = vElegirUsuario();
  else html = ({ inicio:vInicio, personajes:vPersonajes, facciones:vFacciones, campanas:vCampanas, jugar:vJugar, asistente:vAsistente })[S.view]();
  app.innerHTML = html;
  after[S.view]?.();
}

/* ==================== INICIO ==================== */
function vInicio(){
  const mios = misPjs().length, jug = Object.keys(S.perfiles).length;
  return `<section class="view">
    <div class="hero">
      <span class="label">D&amp;D 5ª edición · reglas SRD · ${jug} jugador${jug===1?"":"es"} en la mesa</span>
      <h1>Hola, ${esc(S.perfil.usuario)}. ¿A qué jugamos hoy?</h1>
      <p class="lede">Crea tu personaje con las razas oficiales o con las que ha inventado la mesa, únete a una partida y deja que la IA narre. Si en tu grupo ya hay un DM, la IA se queda a su lado como consejera.</p>
    </div>
    <div class="paths">
      <a class="path" href="#personajes"><span class="step">Paso 1</span><h3>Crea tu personaje</h3><p>Tus fichas y las de los demás, cada una con el nombre de su jugador.</p><span class="chips"><span class="chip">${mios} tuyo${mios===1?"":"s"}</span><span class="chip">${S.personajes.length} en total</span></span></a>
      <a class="path" href="#facciones"><span class="step">Mundo compartido</span><h3>Razas y facciones</h3><p>Inventa pueblos y organizaciones. Todos pueden usarlas; solo quien las crea puede editarlas.</p><span class="chips"><span class="chip">${S.facciones.length} creadas</span></span></a>
      <a class="path" href="#campanas"><span class="step">Paso 2</span><h3>Partidas</h3><p>Genera o escribe una campaña y que cada jugador se una con uno o varios de sus personajes.</p><span class="chips"><span class="chip">${S.partidas.length} partida${S.partidas.length===1?"":"s"}</span></span></a>
      <a class="path" href="#jugar"><span class="step">Paso 3</span><h3>A jugar</h3><p>La IA hace de DM, o lo hace alguien de la mesa: narra en el chat, pide las tiradas y la IA le asesora en privado.</p></a>
    </div>
    <div class="panel">
      <div class="panel-h"><h2>¿Primera vez?</h2><a class="btn" href="#dados">Abrir la wiki de dados</a></div>
      <p>Carga el ejemplo: dos personajes tuyos y la aventura corta «La Cripta del Farol Hundido», ya preparada para jugar.</p>
      <div class="row"><button class="btn gold" data-act="ejemplo" ${S.busy?"disabled":""}>Cargar partida de ejemplo</button></div>
    </div>
  </section>`;
}

/* ==================== PERSONAJES ==================== */
function nuevoPJ(pre={}){
  return { id:null, dueno:S.me, nombre:"", raza_id:null, faccion_id:null, razaSrd:"Humano", clase:"Guerrero", trasfondo:"Soldado", alineamiento:"Neutral bueno", nivel:1, metodo:"array", base:{FUE:15,DES:13,CON:14,INT:8,SAB:12,CAR:10}, pool:ARRAY_STD.slice(), ca:"", personalidad:"", ideales:"", vinculos:"", defectos:"", historia:"", equipo:"", competencias:"", ...pre };
}
function vPersonajes(){
  if (S.edit) return vEditor();
  if (S.verPj){ const p = pjById(S.verPj); if (p) return vFicha(p); S.verPj = null; }
  const mios = misPjs();
  const otros = {}; for (const p of S.personajes) if (p.dueno !== S.me) (otros[p.dueno] ||= []).push(p);
  return `<section class="view">
    <div class="panel-h"><div style="display:grid;gap:8px"><h1>Personajes</h1><p class="lede">Tus fichas y las del resto de la mesa. Solo puedes editar las tuyas.</p></div>
    <button class="btn primary" data-act="pj-nuevo">Crear personaje</button></div>
    <div class="seg" role="group" aria-label="Filtro"><button data-act="pj-filtro" data-f="mios" aria-pressed="${S.pjFiltro==="mios"}">Mis personajes (${mios.length})</button><button data-act="pj-filtro" data-f="todos" aria-pressed="${S.pjFiltro==="todos"}">De los demás (${S.personajes.length - mios.length})</button></div>
    ${S.pjFiltro === "mios"
      ? (mios.length ? `<div class="cards">${mios.map(cardPJ).join("")}</div>` : `<div class="empty"><h3>Aún no tienes personajes</h3><p>Crea el primero o carga la partida de ejemplo desde Inicio.</p><button class="btn primary" data-act="pj-nuevo">Crear personaje</button></div>`)
      : (Object.keys(otros).length ? Object.entries(otros).map(([uid, list]) => `<div style="display:grid;gap:10px"><div class="group-h"><h2 style="font-size:1.3rem">${esc(nombreUsuario(uid))}</h2><span class="small muted">${list.length} personaje${list.length===1?"":"s"}</span></div><div class="cards">${list.map(cardPJ).join("")}</div></div>`).join("") : `<div class="empty"><p>Todavía nadie más ha creado personajes. Invita a tus amigos a registrarse.</p></div>`)}
  </section>`;
}
const avisosHtml = p => { const a = avisosPJ(p); return a.length ? `<div class="avisos">${a.map(t => `<p>${esc(t)}</p>`).join("")}</div>` : ""; };
function cardPJ(p){
  const d = derive(p), fac = p.faccion_id ? facById(p.faccion_id) : null, mio = p.dueno === S.me, nAv = mio ? avisosPJ(p).length : 0;
  return `<article class="pj">
    <div class="pj-h"><div><h3>${esc(p.nombre || "Sin nombre")}</h3><div class="small muted">${esc(d.raza.nombre)} · ${esc(p.clase)} · nivel ${p.nivel}${fac?` · ${esc(fac.nombre)}`:""}</div></div>${ownerChip(p.dueno)}</div>
    <div class="stats">${AB.map(k=>`<div class="stat"><span class="k">${k}</span><span class="m">${fm(modOf(d.sc[k]))}</span><span class="s">${d.sc[k]}</span></div>`).join("")}</div>
    <div class="chips"><span class="chip acc">PG ${d.pg}</span><span class="chip acc">CA ${d.ca}</span><span class="chip">Competencia ${fm(d.prof)}</span><span class="chip">Velocidad ${d.vel} pies</span>${nAv?`<span class="chip warn">Revisa la ficha (${nAv} aviso${nAv===1?"":"s"})</span>`:""}</div>
    ${p.historia?`<p class="small muted">${esc(p.historia.slice(0,160))}${p.historia.length>160?"…":""}</p>`:""}
    <div class="row">${mio ? `<button class="btn sm" data-act="pj-editar" data-id="${p.id}">Ver y editar</button><span data-confirm="${p.id}"><button class="btn sm ghost" data-act="pj-borrar" data-id="${p.id}">Borrar</button></span>` : `<button class="btn sm" data-act="pj-ver" data-id="${p.id}">Ver ficha</button>`}</div>
  </article>`;
}
function vFicha(p){
  const d = derive(p), fac = p.faccion_id ? facById(p.faccion_id) : null;
  const kv = [["Raza", d.raza.nombre + (p.raza_id ? " (creada por la mesa)" : "")], ["Facción", fac?.nombre || "Ninguna"], ["Trasfondo", p.trasfondo], ["Alineamiento", p.alineamiento], ["Personalidad", p.personalidad], ["Ideales", p.ideales], ["Vínculos", p.vinculos], ["Defectos", p.defectos], ["Historia", p.historia], ["Competencias", p.competencias], ["Equipo", p.equipo]].filter(([,v]) => v);
  return `<section class="view">
    <div class="panel-h"><div style="display:grid;gap:6px"><span class="label">${esc(d.raza.nombre)} · ${esc(p.clase)} · nivel ${p.nivel}</span><h1>${esc(p.nombre)}</h1>${ownerChip(p.dueno)}</div><button class="btn ghost" data-act="pj-volver">Volver</button></div>
    <div class="panel"><div class="stats">${AB.map(k=>`<div class="stat"><span class="k">${k}</span><span class="m">${fm(modOf(d.sc[k]))}</span><span class="s">${d.sc[k]}</span></div>`).join("")}</div>
    <div class="chips"><span class="chip acc">PG ${d.pg}</span><span class="chip acc">CA ${d.ca}</span><span class="chip">Iniciativa ${fm(d.ini)}</span><span class="chip">Competencia ${fm(d.prof)}</span><span class="chip">Velocidad ${d.vel} pies</span></div>${avisosHtml(p)}</div>
    <div class="panel"><dl class="kv">${kv.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>
  </section>`;
}
function opt(list, val){ return list.map(x => `<option ${x===val?"selected":""}>${esc(x)}</option>`).join(""); }
function razaValor(p){ return p.raza_id ? "f:" + p.raza_id : "srd:" + (p.razaSrd || "Humano"); }
function vEditor(){
  const p = S.edit, d = derive(p), r = d.raza, c = CLASES[p.clase];
  const razasMesa = S.facciones.filter(f => f.tipo === "raza"), faccs = S.facciones.filter(f => f.tipo === "faccion");
  const fac = p.faccion_id ? facById(p.faccion_id) : null;
  const pbUsed = p.metodo === "puntos" ? AB.reduce((a,k)=>a+(PB_COST[p.base[k]]??0),0) : 0;
  let abilUI = "";
  if (p.metodo === "puntos"){
    abilUI = `<p class="small">Tienes <b class="mono">${27 - pbUsed}</b> de 27 puntos. Cada característica va de 8 a 15; subir de 13 a 14 y de 14 a 15 cuesta 2 puntos.</p>`;
  } else {
    const usados = AB.map(k=>p.base[k]).sort((a,b)=>b-a).join(","), pool = p.pool.slice().sort((a,b)=>b-a).join(",");
    abilUI = `<div class="pool"><span class="small muted">Valores para repartir:</span>${p.pool.slice().sort((a,b)=>b-a).map(v=>`<span class="mono">${v}</span>`).join("")}
      ${p.metodo==="tirar"?`<button class="btn sm" data-act="pj-tirar">Volver a tirar 4d6</button>`:""}
      <button class="btn sm" data-act="pj-auto">Repartir según la clase</button></div>
      ${usados!==pool?`<p class="small" style="color:var(--warn)">Cada valor debe usarse una sola vez. Revisa los repetidos.</p>`:""}`;
  }
  return `<section class="view">
    <div class="panel-h"><h1>${esc(p.nombre || "Nuevo personaje")}</h1><div class="row"><button class="btn ghost" data-act="pj-cancelar">Volver</button><button class="btn primary" data-act="pj-guardar" ${S.busy?"disabled":""}>Guardar personaje</button></div></div>
    <div class="panel">
      <div class="panel-h"><h2>Pídeselo a la IA</h2><span class="small muted">Describe una idea y la IA rellena la ficha, también con las razas y facciones de la mesa.</span></div>
      <div class="field"><span>Tu idea de personaje</span><textarea id="pj-concepto" placeholder="Ej.: una enana herrera que busca venganza contra el dragón que quemó su forja, gruñona pero leal">${esc(p._concepto||"")}</textarea></div>
      <div class="row"><button class="btn gold" data-act="pj-ia" ${S.busy?"disabled":""}>Crear ficha con IA</button><button class="btn" data-act="pj-ia-historia" ${S.busy?"disabled":""}>Solo escribir historia y personalidad</button><span id="pj-ia-st" class="small muted"></span></div>
    </div>
    <div class="panel">
      <h2>1. Lo básico</h2>
      <div class="grid2">
        <label class="field"><span>Nombre</span><input type="text" id="f-nombre" value="${esc(p.nombre)}" placeholder="Nombre del personaje"></label>
        <label class="field"><span>Raza</span><select id="f-raza"><optgroup label="Oficiales (SRD)">${Object.keys(RAZAS).map(n=>`<option value="srd:${esc(n)}" ${razaValor(p)==="srd:"+n?"selected":""}>${esc(n)}</option>`).join("")}</optgroup>${razasMesa.length?`<optgroup label="Creadas por la mesa">${razasMesa.map(f=>`<option value="f:${f.id}" ${p.raza_id===f.id?"selected":""}>${esc(f.nombre)} · de ${esc(f.autor===S.me?"ti":nombreUsuario(f.autor))}</option>`).join("")}</optgroup>`:""}</select></label>
        <label class="field"><span>Facción</span><select id="f-faccion"><option value="">Sin facción</option>${faccs.map(f=>`<option value="${f.id}" ${p.faccion_id===f.id?"selected":""}>${esc(f.nombre)} · de ${esc(f.autor===S.me?"ti":nombreUsuario(f.autor))}</option>`).join("")}</select></label>
        <label class="field"><span>Clase</span><select id="f-clase">${opt(Object.keys(CLASES), p.clase)}</select></label>
        <label class="field"><span>Trasfondo</span><select id="f-trasfondo">${opt(TRASFONDOS, p.trasfondo)}</select></label>
        <label class="field"><span>Alineamiento</span><select id="f-alineamiento">${opt(ALINEAMIENTOS, p.alineamiento)}</select></label>
        <label class="field"><span>Nivel</span><input type="number" id="f-nivel" min="1" max="20" value="${p.nivel}"></label>
      </div>
      <div class="grid2">
        <div class="note"><b>${esc(r.nombre)}${r.fac?` <span class="small muted">(raza de ${esc(nombreUsuario(r.fac.autor))})</span>`:""}:</b> ${esc((r.t||"").slice(0,300))} Bonos: ${Object.entries(r.b).filter(([,v])=>+v).map(([k,v])=>k+" "+fm(+v)).join(", ")||"ninguno"}. Velocidad ${r.v} pies.${r.fac?` <a href="#facciones" data-act="fac-ver" data-id="${r.fac.id}">Ver raza completa</a>`:""}</div>
        <div class="note"><b>${esc(p.clase)}:</b> ${esc(c.t)} Dado de golpe d${c.d}. Lo más importante: ${c.pri.slice(0,2).map(k=>AB_N[k]).join(" y ")}.</div>
        ${fac?`<div class="note"><b>Facción ${esc(fac.nombre)}:</b> ${esc((fac.descripcion||"").slice(0,220))} <b>Beneficios:</b> ${esc((fac.beneficios||"").slice(0,200))} <a href="#facciones" data-act="fac-ver" data-id="${fac.id}">Ver facción</a></div>`:""}
      </div>
      <p class="small muted">¿No encuentras lo que buscas? <a href="#facciones" data-act="fac-nueva" data-t="raza">Crea una raza nueva</a> o <a href="#facciones" data-act="fac-nueva" data-t="faccion">una facción</a>; tu personaje te espera aquí.</p>
    </div>
    <div class="panel">
      <div class="panel-h"><h2>2. Características</h2><a class="small" href="#w-mod">¿Qué es un modificador?</a></div>
      <div class="method" role="group" aria-label="Método">
        <button data-act="pj-metodo" data-m="array" aria-pressed="${p.metodo==="array"}">Valores estándar</button>
        <button data-act="pj-metodo" data-m="puntos" aria-pressed="${p.metodo==="puntos"}">Compra por puntos</button>
        <button data-act="pj-metodo" data-m="tirar" aria-pressed="${p.metodo==="tirar"}">Tirar 4d6</button>
      </div>
      <p class="small muted">${p.metodo==="array"?"Reparte 15, 14, 13, 12, 10 y 8. Es el método más sencillo y equilibrado para empezar.":p.metodo==="puntos"?"Compras cada puntuación con 27 puntos. Te deja afinar el personaje a tu gusto.":"Para cada valor se tiran 4d6 y se descarta el dado más bajo. Más emocionante y más azaroso."}</p>
      ${abilUI}
      ${avisosHtml(p)}
      <div class="abil-grid">${AB.map(k=>{
        const base = p.base[k], bonus = +r.b[k]||0, fin = base + bonus;
        const ctrl = p.metodo==="puntos"
          ? `<div class="pb"><button data-act="pb" data-k="${k}" data-d="-1" aria-label="Bajar ${AB_N[k]}">−</button><span class="mono">${base}</span><button data-act="pb" data-k="${k}" data-d="1" aria-label="Subir ${AB_N[k]}">+</button></div>`
          : `<select data-abil="${k}" aria-label="${AB_N[k]}">${[...new Set(p.pool)].sort((a,b)=>b-a).map(v=>`<option ${v===base?"selected":""}>${v}</option>`).join("")}${p.pool.includes(base)?"":`<option selected>${base}</option>`}</select>`;
        return `<div class="abil"><div class="top-row"><b>${AB_N[k]}</b>${d.sv.includes(k)?'<span class="chip acc" title="Competente en salvación">salv.</span>':""}</div>${ctrl}<div class="top-row"><span class="big">${fm(modOf(fin))}</span><span class="calc">${base}${bonus?" "+fm(bonus)+" raza":""} = ${fin}</span></div></div>`;
      }).join("")}</div>
    </div>
    <div class="panel">
      <h2>3. Números de combate</h2>
      <div class="derived">
        <div class="der"><span class="label">Puntos de golpe</span><b>${d.pg}</b><span class="small muted">d${d.dado} + CON</span></div>
        <div class="der"><span class="label">Clase de armadura</span><b>${d.ca}</b><span class="small muted">${esc(d.caTxt)}</span></div>
        <div class="der"><span class="label">Iniciativa</span><b>${fm(d.ini)}</b><span class="small muted">mod. de DES</span></div>
        <div class="der"><span class="label">Competencia</span><b>${fm(d.prof)}</b><span class="small muted">según nivel</span></div>
        <div class="der"><span class="label">Velocidad</span><b>${d.vel}</b><span class="small muted">pies por turno</span></div>
      </div>
      <label class="field" style="max-width:260px"><span>CA con armadura (opcional)</span><input type="number" id="f-ca" min="5" max="30" value="${esc(p.ca)}" placeholder="Ej.: 16 con cota de malla"></label>
    </div>
    <div class="panel">
      <h2>4. Personalidad e historia</h2>
      <div class="grid2">
        <label class="field"><span>Rasgos de personalidad</span><textarea id="f-personalidad">${esc(p.personalidad)}</textarea></label>
        <label class="field"><span>Ideales</span><textarea id="f-ideales">${esc(p.ideales)}</textarea></label>
        <label class="field"><span>Vínculos</span><textarea id="f-vinculos">${esc(p.vinculos)}</textarea></label>
        <label class="field"><span>Defectos</span><textarea id="f-defectos">${esc(p.defectos)}</textarea></label>
      </div>
      <label class="field"><span>Historia</span><textarea id="f-historia" style="min-height:140px">${esc(p.historia)}</textarea></label>
      <div class="grid2">
        <label class="field"><span>Competencias (habilidades, armas, herramientas)</span><textarea id="f-competencias">${esc(p.competencias)}</textarea></label>
        <label class="field"><span>Equipo</span><textarea id="f-equipo">${esc(p.equipo)}</textarea></label>
      </div>
    </div>
    <div class="row"><button class="btn primary" data-act="pj-guardar" ${S.busy?"disabled":""}>Guardar personaje</button><button class="btn ghost" data-act="pj-cancelar">Volver sin guardar</button></div>
  </section>`;
}
function leerForm(){
  const p = S.edit; if (!p || !$("#f-nombre")) return;
  for (const f of ["nombre","clase","trasfondo","alineamiento","personalidad","ideales","vinculos","defectos","historia","equipo","competencias","ca"]){
    const el = $("#f-" + f); if (el) p[f] = el.value;
  }
  const rz = $("#f-raza")?.value || "srd:Humano";
  if (rz.startsWith("f:")){ p.raza_id = rz.slice(2); } else { p.raza_id = null; p.razaSrd = rz.slice(4); }
  const fc = $("#f-faccion"); if (fc) p.faccion_id = fc.value || null;
  const lv = $("#f-nivel"); if (lv) p.nivel = Math.min(20, Math.max(1, +lv.value || 1));
  const cc = $("#pj-concepto"); if (cc) p._concepto = cc.value;
}
function autoAsignar(p){ const vals = p.pool.slice().sort((a,b)=>b-a), pri = CLASES[p.clase].pri; pri.forEach((k,i) => p.base[k] = vals[i]); }
function tirar4d6(){ const a=[rnd(6),rnd(6),rnd(6),rnd(6)].sort((x,y)=>y-x); return a[0]+a[1]+a[2]; }
async function guardarPJ(){
  leerForm(); const p = S.edit;
  if (!p.nombre.trim()){ toast("Ponle un nombre a tu personaje."); $("#f-nombre")?.focus(); return; }
  if (p.raza_id){ const r = razaInfo(p); p.razaSnap = { nombre:r.nombre, b:r.b, v:r.v, t:(r.t||"").slice(0,300) }; } else delete p.razaSnap;
  const row = pjToRow(p);
  S.busy = true; render();
  try {
    const r = p.id ? await guardar(sb.from("dm_personajes").update(row).eq("id", p.id).select().single(), "Personaje guardado.")
                   : await guardar(sb.from("dm_personajes").insert(row).select().single(), "Personaje creado.");
    const obj = pjFromRow(r); S.personajes = [obj, ...S.personajes.filter(x => x.id !== obj.id)];
    S.edit = null;
  } catch {}
  S.busy = false; render();
}
async function pjIA(soloHistoria){
  leerForm(); const p = S.edit;
  const idea = (p._concepto || "").trim(), st = () => $("#pj-ia-st");
  if (!soloHistoria && !idea){ st().textContent = "Escribe primero una idea, aunque sea corta."; return; }
  const razasMesa = S.facciones.filter(f => f.tipo === "raza"), faccs = S.facciones.filter(f => f.tipo === "faccion");
  S.busy = true; render(); st().innerHTML = thinking("La IA está pensando…");
  try {
    if (soloHistoria){
      const r = await iaJSON(`Eres un experto en D&D 5e. Escribe en español la personalidad y la historia de este personaje, coherente con sus datos y con su raza y facción.${idea? " Idea del jugador: " + idea : ""}
Datos: ${p.nombre||"(sin nombre, invéntalo)"}, ${razaInfo(p).nombre} ${p.clase}, trasfondo ${p.trasfondo}, ${p.alineamiento}.
${contextoMundo([p])}
Responde solo con JSON: {"nombre": string, "personalidad": string (2 rasgos), "ideales": string, "vinculos": string, "defectos": string, "historia": string (2-3 párrafos cortos, con un gancho para aventuras)}`);
      for (const k of ["personalidad","ideales","vinculos","defectos","historia"]) if (r?.[k]) p[k] = String(r[k]);
      if (!p.nombre && r?.nombre) p.nombre = String(r.nombre);
    } else {
      const r = await iaJSON(`Eres un experto en D&D 5e (SRD). Crea en español un personaje de nivel ${p.nivel} a partir de esta idea: "${idea}".
Razas oficiales: ${Object.keys(RAZAS).join(", ")}.
${razasMesa.length ? "Razas creadas por la mesa (úsalas si encajan con la idea):\n" + razasMesa.map(f => "- " + facResumen(f)).join("\n") : ""}
${faccs.length ? "Facciones de la mesa (elige una solo si encaja, si no deja faccion vacía):\n" + faccs.map(f => "- " + facResumen(f)).join("\n") : ""}
Clase entre: ${Object.keys(CLASES).join(", ")}. Trasfondo entre: ${TRASFONDOS.join(", ")}. Alineamiento entre: ${ALINEAMIENTOS.join(", ")}.
Reparte el conjunto estándar 15,14,13,12,10,8 (puntuaciones base, sin bonos raciales; cada valor una vez) favoreciendo la clase.
Responde solo con JSON: {"nombre": string, "raza": string (nombre exacto de una raza de las listas), "faccion": string (nombre exacto o ""), "clase": string, "trasfondo": string, "alineamiento": string, "base": {"FUE":n,"DES":n,"CON":n,"INT":n,"SAB":n,"CAR":n}, "personalidad": string, "ideales": string, "vinculos": string, "defectos": string, "historia": string (2-3 párrafos cortos), "competencias": string, "equipo": string (equipo inicial de la clase), "ca": number (CA con su armadura inicial)}`);
      const rz = String(r?.raza || "").trim().toLowerCase();
      const custom = razasMesa.find(f => f.nombre.toLowerCase() === rz);
      if (custom){ p.raza_id = custom.id; } else { const n = Object.keys(RAZAS).find(n => n.toLowerCase() === rz); if (n){ p.raza_id = null; p.razaSrd = n; } }
      const fz = String(r?.faccion || "").trim().toLowerCase(); const fc = faccs.find(f => f.nombre.toLowerCase() === fz); p.faccion_id = fc ? fc.id : p.faccion_id;
      if (r?.clase && CLASES[r.clase]) p.clase = r.clase;
      if (r?.trasfondo && TRASFONDOS.includes(r.trasfondo)) p.trasfondo = r.trasfondo;
      if (r?.alineamiento && ALINEAMIENTOS.includes(r.alineamiento)) p.alineamiento = r.alineamiento;
      for (const k of ["nombre","personalidad","ideales","vinculos","defectos","historia","competencias","equipo"]) if (r?.[k]) p[k] = String(r[k]);
      if (r?.ca && +r.ca >= 8 && +r.ca <= 22) p.ca = String(+r.ca);
      const b = r?.base || {}, vals = AB.map(k => +b[k]).sort((a,b)=>b-a).join(",");
      p.metodo = "array"; p.pool = ARRAY_STD.slice();
      if (vals === "15,14,13,12,10,8") AB.forEach(k => p.base[k] = +b[k]); else autoAsignar(p);
    }
    S.busy = false; S.edit = p; renderSinLeer(); toast("Ficha rellenada. Revísala y pulsa «Guardar personaje».");
  } catch (e) { S.busy = false; renderSinLeer(); const s = st(); if (s) s.textContent = iaMsg(e); }
}
// Tras rellenar con IA no hay que volver a leer el formulario (pisaría lo nuevo)
const renderSinLeer = () => render(true);

/* ==================== RAZAS Y FACCIONES ==================== */
const FAC_CAMPOS = {
  comun: [["nombre","Nombre",1,"text"],["descripcion","Descripción general",1,"area"],["origen","Lugar de origen o sede",0,"text"],["alineamiento","Alineamiento típico",0,"text"],["lema","Lema o símbolo",0,"text"],["aliados","Aliados",0,"text"],["enemigos","Enemigos o rivales",0,"text"]],
  raza: [["tamano","Tamaño",1,"select",["Pequeño","Mediano","Grande"]],["velocidad","Velocidad (pies)",1,"number"],["vision","Visión en la oscuridad",0,"select",["No","Sí, 60 pies","Sí, 120 pies"]],["idiomas","Idiomas",1,"text"],["rasgos","Rasgos raciales (uno por línea)",1,"area"],["vida","Esperanza de vida y madurez",0,"text"],["nombres","Ejemplos de nombres",0,"text"]],
  faccion: [["objetivos","Objetivos",1,"area"],["creencias","Creencias e ideales",1,"area"],["beneficios","Qué gana un personaje al pertenecer",1,"area"],["requisitos","Requisitos para unirse",1,"area"],["rasgos","Señas de identidad (una por línea)",1,"area"],["rangos","Rangos o jerarquía",0,"area"],["lider","Líder",0,"text"],["idiomas","Idiomas o jerga propia",0,"text"]]
};
const camposDe = tipo => FAC_CAMPOS.comun.concat(FAC_CAMPOS[tipo]);
function nuevaFac(tipo="raza"){ return { id:null, autor:S.me, tipo, nombre:"", descripcion:"", bonos:{FUE:0,DES:0,CON:0,INT:0,SAB:0,CAR:0}, tamano:"Mediano", velocidad:30, vision:"No" }; }
function faltanFac(f){
  const falta = camposDe(f.tipo).filter(([k,,req]) => req && !String(f[k] ?? "").trim()).map(([,l]) => l.replace(/ \(.*\)/, ""));
  if (f.tipo === "raza"){ const s = AB.reduce((a,k)=>a+(+f.bonos?.[k]||0),0); if (s < 1 || s > 4) falta.push("Bonos de característica (entre +1 y +4 en total)"); }
  return falta;
}
function vFacciones(){
  if (S.editFac) return vFacEditor();
  if (S.verFac){ const f = facById(S.verFac); if (f) return vFacDetalle(f); S.verFac = null; }
  const filtro = S.facFiltro;
  const lista = S.facciones.filter(f => filtro === "todas" || (filtro === "mias" ? f.autor === S.me : f.tipo === filtro));
  const usos = id => S.personajes.filter(p => p.raza_id === id || p.faccion_id === id).length;
  return `<section class="view">
    <div class="panel-h"><div style="display:grid;gap:8px"><h1>Razas y facciones</h1><p class="lede">El mundo que comparte toda la mesa. Cualquiera puede crear personajes con ellas; solo quien las creó puede editarlas.</p></div>
    <div class="row"><button class="btn" data-act="fac-nueva" data-t="faccion">Nueva facción</button><button class="btn primary" data-act="fac-nueva" data-t="raza">Nueva raza</button></div></div>
    <div class="seg" role="group" aria-label="Filtro">${[["todas","Todas"],["raza","Razas"],["faccion","Facciones"],["mias","Creadas por mí"]].map(([k,l])=>`<button data-act="fac-filtro" data-f="${k}" aria-pressed="${filtro===k}">${l}</button>`).join("")}</div>
    ${lista.length ? `<div class="cards">${lista.map(f => `<article class="pj">
      <div class="pj-h"><div><h3>${esc(f.nombre)}</h3><div class="small muted">${f.tipo==="raza"?"Raza":"Facción"}${f.origen?" · "+esc(f.origen):""}</div></div>${ownerChip(f.autor)}</div>
      <p class="small">${esc((f.descripcion||"").slice(0,180))}${(f.descripcion||"").length>180?"…":""}</p>
      <div class="chips">${f.tipo==="raza" ? Object.entries(f.bonos||{}).filter(([,v])=>+v).map(([k,v])=>`<span class="chip acc">${k} ${fm(+v)}</span>`).join("") + `<span class="chip">${esc(f.tamano||"Mediano")} · ${f.velocidad||30} pies</span>` : (f.lema?`<span class="chip">«${esc(f.lema)}»</span>`:"")}<span class="chip">${usos(f.id)} personaje${usos(f.id)===1?"":"s"}</span></div>
      <div class="row"><button class="btn sm" data-act="fac-ver" data-id="${f.id}">Ver</button><button class="btn sm gold" data-act="fac-usar" data-id="${f.id}">Crear personaje</button>${f.autor===S.me?`<button class="btn sm ghost" data-act="fac-editar" data-id="${f.id}">Editar</button>`:""}</div>
    </article>`).join("")}</div>` : `<div class="empty"><h3>${filtro==="mias"?"Aún no has creado nada":"Todavía no hay nada aquí"}</h3><p>Crea una raza o una facción: te pediré la información necesaria y la IA puede ayudarte a completarla.</p><div class="row"><button class="btn primary" data-act="fac-nueva" data-t="raza">Nueva raza</button><button class="btn" data-act="fac-nueva" data-t="faccion">Nueva facción</button></div></div>`}
    <div class="panel"><h3>Razas oficiales (SRD)</h3><p class="small muted">Siempre disponibles y no se pueden editar.</p><div class="chips">${Object.entries(RAZAS).map(([n,r])=>`<span class="chip" title="${esc(r.t)}">${esc(n)} · ${Object.entries(r.b).map(([k,v])=>k+fm(v)).join(" ")}</span>`).join("")}</div></div>
  </section>`;
}
function vFacDetalle(f){
  const pjs = S.personajes.filter(p => p.raza_id === f.id || p.faccion_id === f.id);
  const kv = camposDe(f.tipo).filter(([k]) => k !== "nombre" && String(f[k] ?? "").trim()).map(([k,l]) => [l.replace(/ \(.*\)/, ""), f[k]]);
  if (f.tipo === "raza") kv.splice(1, 0, ["Bonos", Object.entries(f.bonos||{}).filter(([,v])=>+v).map(([k,v])=>AB_N[k]+" "+fm(+v)).join(", ")]);
  return `<section class="view">
    <div class="panel-h"><div style="display:grid;gap:6px"><span class="label">${f.tipo==="raza"?"Raza":"Facción"} creada por la mesa</span><h1>${esc(f.nombre)}</h1>${ownerChip(f.autor)}</div>
      <div class="row"><button class="btn ghost" data-act="fac-volver">Volver</button>${f.autor===S.me?`<button class="btn" data-act="fac-editar" data-id="${f.id}">Editar</button><span data-confirm="${f.id}"><button class="btn ghost" data-act="fac-borrar" data-id="${f.id}">Borrar</button></span>`:""}<button class="btn primary" data-act="fac-usar" data-id="${f.id}">Crear personaje con ${f.tipo==="raza"?"esta raza":"esta facción"}</button></div></div>
    <div class="panel"><dl class="kv">${kv.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>
    <div class="panel"><h3>Personajes que la usan</h3>${pjs.length?`<div class="chips">${pjs.map(p=>`<span class="chip">${esc(p.nombre)} · ${esc(nombreUsuario(p.dueno))}</span>`).join("")}</div>`:`<p class="small muted">Nadie todavía. ¡Sé el primero!</p>`}</div>
  </section>`;
}
function campoFac(f, [k, label, req, tipo, ops], faltan){
  const v = f[k] ?? "", cls = faltan && req && !String(v).trim() ? "missing" : "";
  let ctrl;
  if (tipo === "area") ctrl = `<textarea id="fc-${k}" class="${cls}">${esc(v)}</textarea>`;
  else if (tipo === "select") ctrl = `<select id="fc-${k}" class="${cls}">${ops.map(o=>`<option ${o===v?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
  else ctrl = `<input type="${tipo==="number"?"number":"text"}" id="fc-${k}" class="${cls}" value="${esc(v)}" ${tipo==="number"?'min="10" max="60" step="5"':""}>`;
  return `<label class="field"><span class="${req?"req":""}">${label}</span>${ctrl}</label>`;
}
function vFacEditor(){
  const f = S.editFac, faltan = f._validar ? faltanFac(f) : null;
  const largos = camposDe(f.tipo).filter(c => c[3] === "area"), cortos = camposDe(f.tipo).filter(c => c[3] !== "area");
  return `<section class="view">
    <div class="panel-h"><h1>${f.id ? "Editar " + esc(f.nombre) : f.tipo==="raza" ? "Nueva raza" : "Nueva facción"}</h1><div class="row"><button class="btn ghost" data-act="fac-cancelar">Volver</button><button class="btn primary" data-act="fac-guardar" ${S.busy?"disabled":""}>Guardar</button></div></div>
    ${f.id ? "" : `<div class="seg" role="group" aria-label="Tipo"><button data-act="fac-tipo" data-t="raza" aria-pressed="${f.tipo==="raza"}">Raza o pueblo</button><button data-act="fac-tipo" data-t="faccion" aria-pressed="${f.tipo==="faccion"}">Facción u organización</button></div>`}
    <p class="small muted">${f.tipo==="raza" ? "Una raza define el cuerpo y la herencia del personaje: sus bonos de característica, su tamaño, su velocidad y sus rasgos." : "Una facción es un grupo al que se pertenece por elección: un gremio, una orden, una secta o un ejército. Da objetivos, aliados y beneficios."} Los campos con <span style="color:var(--accent)">*</span> son obligatorios.</p>
    <div class="panel">
      <div class="panel-h"><h2>Ayuda de la IA</h2><span class="small muted">Escribe al menos el nombre o una idea en la descripción y la IA rellena lo que falte.</span></div>
      <div class="row"><button class="btn gold" data-act="fac-ia" ${S.busy?"disabled":""}>Completar lo que falta con IA</button><span id="fc-st" class="small muted"></span></div>
    </div>
    ${faltan?.length ? `<div class="note missing-list" style="border-color:var(--bad)"><b>Falta información para guardar:</b> ${faltan.map(esc).join(", ")}.</div>` : ""}
    <div class="panel"><h2>Datos principales</h2><div class="grid2">${cortos.map(c => campoFac(f, c, faltan)).join("")}</div>
    ${f.tipo === "raza" ? `<div class="field"><span class="req">Bonos de característica</span><div class="abil-grid">${AB.map(k=>`<label class="abil"><b>${AB_N[k]}</b><input type="number" id="fb-${k}" min="-2" max="2" value="${+f.bonos?.[k]||0}" class="mono"></label>`).join("")}</div><span class="small muted">Lo habitual en 5e: +2 a una característica y +1 a otra.</span></div>` : ""}</div>
    <div class="panel"><h2>Descripción y rasgos</h2>${largos.map(c => campoFac(f, c, faltan)).join("")}</div>
    <div class="row"><button class="btn primary" data-act="fac-guardar" ${S.busy?"disabled":""}>Guardar</button><button class="btn ghost" data-act="fac-cancelar">Volver sin guardar</button></div>
  </section>`;
}
function leerFac(){
  const f = S.editFac; if (!f || !$("#fc-nombre")) return;
  for (const [k,,,tipo] of camposDe(f.tipo)){ const el = $("#fc-" + k); if (el) f[k] = tipo === "number" ? (+el.value || "") : el.value; }
  if (f.tipo === "raza"){ f.bonos ||= {}; for (const k of AB){ const el = $("#fb-" + k); if (el) f.bonos[k] = Math.max(-2, Math.min(2, +el.value || 0)); } }
}
async function guardarFac(){
  leerFac(); const f = S.editFac; f._validar = true;
  const falta = faltanFac(f);
  if (falta.length){ render(); window.scrollTo(0,0); return; }
  const { _validar, ...limpio } = f;
  if (f.tipo !== "raza") delete limpio.bonos;
  S.busy = true; render();
  try {
    const row = facToRow(limpio);
    const r = f.id ? await guardar(sb.from("dm_facciones").update(row).eq("id", f.id).select().single(), "Guardado. Todos los jugadores ya pueden usarla.")
                   : await guardar(sb.from("dm_facciones").insert(row).select().single(), "Creada. Todos los jugadores ya pueden usarla.");
    const obj = facFromRow(r); S.facciones = [...S.facciones.filter(x => x.id !== obj.id), obj].sort((a,b) => a.nombre.localeCompare(b.nombre));
    S.editFac = null; S.verFac = obj.id;
    if (S.edit && !S.edit.id){ if (obj.tipo === "raza") S.edit.raza_id = obj.id; else S.edit.faccion_id = obj.id; toast("Guardada. Tu personaje a medias sigue en Personajes."); }
  } catch {}
  S.busy = false; render();
}
async function facIA(){
  leerFac(); const f = S.editFac, st = () => $("#fc-st");
  if (!String(f.nombre||"").trim() && !String(f.descripcion||"").trim()){ st().textContent = "Escribe al menos un nombre o una idea en la descripción."; return; }
  const campos = camposDe(f.tipo).map(([k,l]) => `"${k}": string (${l})`).join(", ");
  S.busy = true; render(); st().innerHTML = thinking("Completando…");
  try {
    const actual = {}; for (const [k] of camposDe(f.tipo)) if (String(f[k] ?? "").trim()) actual[k] = f[k];
    const r = await iaJSON(`Eres un diseñador de mundos para D&D 5e. Completa en español la ficha de ${f.tipo === "raza" ? "una RAZA jugable, equilibrada al nivel de las razas del SRD" : "una FACCIÓN u organización para una campaña"}.
Respeta todo lo que el jugador ya escribió y mantén su tono; rellena solo lo que falta, de forma concreta y jugable.
Lo que ya hay: ${JSON.stringify(actual)}
Responde solo con JSON con estas claves: {${campos}${f.tipo === "raza" ? `, "bonos": {"FUE":n,"DES":n,"CON":n,"INT":n,"SAB":n,"CAR":n} (normalmente +2 y +1), "velocidad": number, "tamano": "Pequeño"|"Mediano"|"Grande", "vision": "No"|"Sí, 60 pies"|"Sí, 120 pies"` : ""}}. Para "rasgos" usa una línea por rasgo con el formato "Nombre: efecto".`);
    for (const [k,,,tipo,ops] of camposDe(f.tipo)){
      if (String(f[k] ?? "").trim() || r?.[k] == null) continue;
      if (tipo === "select" && !ops.includes(String(r[k]))) continue;
      f[k] = tipo === "number" ? (+r[k] || 30) : Array.isArray(r[k]) ? r[k].join("\n") : String(r[k]);
    }
    if (f.tipo === "raza" && r?.bonos && !AB.some(k => +f.bonos?.[k])) for (const k of AB) f.bonos[k] = Math.max(-2, Math.min(2, +r.bonos[k] || 0));
    S.busy = false; renderSinLeer(); toast("Ficha completada. Revisa y guarda.");
  } catch (e) { S.busy = false; renderSinLeer(); const s = st(); if (s) s.textContent = iaMsg(e); }
}

/* ==================== PARTIDAS ==================== */
const AMBIENTES = ["Fantasía clásica: reinos, bosques y mazmorras","Fantasía oscura y terror gótico","Piratas, islas y mares","Desierto, ruinas y tumbas antiguas","Norte helado y tribus","Gran ciudad: intrigas, gremios y crímenes","Selva perdida y templos olvidados"];
const TONOS = ["Heroico y aventurero","Misterio e investigación","Humor y desenfado","Épico y trascendental","Terror y tensión"];
const DURACIONES = ["Una sesión (one-shot)","Corta: 3 a 5 sesiones","Larga: más de 10 sesiones"];
function vCampanas(){
  if (S.campSel){ const c = partida(S.campSel); if (c) return vCampDetalle(c); S.campSel = null; }
  const f = S.camForm ||= { ambiente:AMBIENTES[0], tono:TONOS[0], duracion:DURACIONES[0], nivel:1, jugadores:3, ideas:"", modo:"ia", usarMundo:true };
  return `<section class="view">
    <div style="display:grid;gap:8px"><h1>Partidas</h1><p class="lede">Genera una campaña y que cada jugador se una con uno de sus personajes. Solo se permite un personaje por jugador en cada partida.</p></div>
    <div class="panel">
      <h2>Generar una campaña nueva</h2>
      <div class="grid2">
        <label class="field"><span>Ambientación</span><select id="c-ambiente">${opt(AMBIENTES, f.ambiente)}</select></label>
        <label class="field"><span>Tono</span><select id="c-tono">${opt(TONOS, f.tono)}</select></label>
        <label class="field"><span>Duración</span><select id="c-duracion">${opt(DURACIONES, f.duracion)}</select></label>
        <label class="field"><span>Nivel de los personajes</span><input type="number" id="c-nivel" min="1" max="20" value="${f.nivel}"></label>
        <label class="field"><span>Número de jugadores</span><input type="number" id="c-jugadores" min="1" max="8" value="${f.jugadores}"></label>
        <label class="field"><span>¿Quién dirige?</span><select id="c-modo"><option value="ia" ${f.modo==="ia"?"selected":""}>La IA es el DM</option><option value="humano" ${f.modo==="humano"?"selected":""}>Tenemos DM propio</option></select></label>
      </div>
      <label class="field"><span>Ideas o deseos (opcional)</span><textarea id="c-ideas" placeholder="Ej.: quiero un villano que parezca amigo, un barco fantasma y que haya un dragón joven al final">${esc(f.ideas)}</textarea></label>
      ${S.facciones.length?`<label class="switch"><input type="checkbox" id="c-mundo" ${f.usarMundo?"checked":""}> Usar las razas y facciones de la mesa (${S.facciones.length})</label>`:""}
      <div class="row"><button class="btn primary" data-act="camp-generar" ${S.busy?"disabled":""}>Generar campaña</button><span id="c-st" class="small muted"></span></div>
    </div>
    <div class="panel">
      <div class="panel-h"><h2>O escríbela a mano</h2><span class="small muted">Sin IA: ideal si tenéis DM propio.</span></div>
      <div class="grid2">
        <label class="field"><span class="req">Título</span><input type="text" id="m-titulo" maxlength="120" placeholder="Ej.: El Faro de los Ahogados"></label>
        <label class="field"><span>¿Quién dirige?</span><select id="m-modo"><option value="humano">Tenemos DM propio</option><option value="ia">La IA es el DM</option></select></label>
      </div>
      <label class="field"><span class="req">El gancho (lo que verán todos)</span><textarea id="m-gancho" placeholder="Cómo empieza la aventura, sin desvelar secretos"></textarea></label>
      <label class="field"><span>Notas secretas del DM (no se muestran a los jugadores)</span><textarea id="m-sinopsis" placeholder="Qué está pasando de verdad, villano, giros, final…"></textarea></label>
      <div class="row"><button class="btn" data-act="camp-manual" ${S.busy?"disabled":""}>Crear partida</button></div>
    </div>
    <div class="panel">
      <h2>Partidas de la mesa</h2>
      ${S.partidas.length ? `<div class="camp-list">${S.partidas.map(c => { const mias = misParticipaciones(c.id), yo = mias.length > 0, n = participantesDe(c.id).length; return `<div class="camp-item"><div style="display:grid;gap:4px"><h3>${esc(c.titulo)}</h3><div class="small muted">${esc(c.tono||"")} · ${c.modo==="humano"?"DM propio":"IA como DM"} · ${n} personaje${n===1?"":"s"} ${c.ejemplo?'· <span class="tag-ej">ejemplo</span>':""}</div><div class="row">${ownerChip(c.creador)}${yo?`<span class="small">Juegas con <b>${mias.map(x => esc(pjById(x.personaje_id)?.nombre||"tu personaje")).join(", ")}</b></span>`:""}</div></div>
        <div class="row"><button class="btn sm" data-act="camp-ver" data-id="${c.id}">${yo||c.creador===S.me?"Abrir":"Ver y unirme"}</button>${puedoJugar(c)?`<button class="btn sm primary" data-act="ir-jugar" data-id="${c.id}">Jugar</button>`:""}</div></div>`; }).join("")}</div>`
        : `<div class="empty"><p>Todavía no hay partidas. Genera una arriba o carga la partida de ejemplo desde Inicio.</p></div>`}
    </div>
  </section>`;
}
function vCampDetalle(c){
  const soyCreador = c.creador === S.me, parts = participantesDe(c.id);
  const libres = misPjs().filter(p => !parts.some(x => x.personaje_id === p.id));
  const verSecretos = soyCreador && S.spoilers;
  return `<section class="view camp">
    <div class="panel-h"><div style="display:grid;gap:6px"><span class="label">${esc(c.ambiente||"")} · ${esc(c.tono||"")}</span><h1>${esc(c.titulo)}</h1>${ownerChip(c.creador)}</div>
      <div class="row"><button class="btn ghost" data-act="camp-volver">Todas las partidas</button>${puedoJugar(c)?`<button class="btn" data-act="ir-asistente" data-id="${c.id}">Asistente del DM</button><button class="btn primary" data-act="ir-jugar" data-id="${c.id}">Ir a la mesa</button>`:""}</div></div>
    <div class="panel"><h3>El gancho</h3><p>${esc(c.gancho)}</p>
      ${soyCreador ? `<label class="switch"><input type="checkbox" data-act="spoilers" ${S.spoilers?"checked":""}> Mostrar la información secreta del DM (sinopsis, secretos y final)</label>` : `<p class="small muted">El resto de la campaña es secreto: lo irás descubriendo al jugar.</p>`}</div>
    ${verSecretos ? `
    ${c.sinopsis?`<div class="panel"><h3>De qué va (secreto)</h3><p style="white-space:pre-wrap">${esc(c.sinopsis)}</p></div>`:""}
    ${(c.actos||[]).length?`<div class="panel"><h2>Actos</h2><div class="acts">${(c.actos||[]).map((a,i)=>`<div class="act"><h3>Acto ${i+1}: ${esc(a.titulo)}</h3><p><b>Objetivo:</b> ${esc(a.objetivo)}</p>${a.escenas?.length?`<ul>${a.escenas.map(e=>`<li>${esc(e)}</li>`).join("")}</ul>`:""}${a.encuentro?`<p class="small"><b>Encuentro clave:</b> ${esc(a.encuentro)}</p>`:""}</div>`).join("")}</div>
      ${c.final?`<p><b>Posible final:</b> ${esc(c.final)}</p>`:""}</div>`:""}
    ${(c.pnjs||[]).length?`<div class="panel"><h2>Personajes no jugadores</h2><div class="npcs">${(c.pnjs||[]).map(n=>`<div class="npc"><b>${esc(n.nombre)}</b><span class="small muted">${esc(n.rol)}</span><span class="small">${esc(n.descripcion)}</span>${n.secreto?`<span class="secret">Secreto: ${esc(n.secreto)}</span>`:""}</div>`).join("")}</div></div>`:""}
    ${(c.lugares||[]).length||(c.giros||[]).length?`<div class="grid2">
      <div class="panel"><h2>Lugares</h2><ul>${(c.lugares||[]).map(l=>`<li><b>${esc(l.nombre)}:</b> ${esc(l.descripcion)}</li>`).join("")}</ul></div>
      <div class="panel"><h2>Giros y consejos</h2><ul>${(c.giros||[]).map(g=>`<li>${esc(g)}</li>`).join("")}${(c.consejosDM||[]).map(g=>`<li class="muted">${esc(g)}</li>`).join("")}</ul></div>
    </div>`:""}` : ""}
    <div class="panel">
      <div class="panel-h"><h2>Jugadores</h2><span class="small muted">Cada jugador puede llevar uno o varios personajes</span></div>
      ${parts.length ? parts.map(x => { const p = pjById(x.personaje_id); return `<div class="part"><div style="display:grid;gap:2px"><b>${esc(p?.nombre || "Personaje borrado")}</b><span class="small muted">${p?esc(derive(p).raza.nombre)+" "+esc(p.clase)+" nivel "+p.nivel:""}</span></div><div class="row">${ownerChip(x.usuario_id)}${soyCreador || x.usuario_id===S.me?`<span data-confirm="quitar-${x.personaje_id}"><button class="btn sm ghost" data-act="part-quitar" data-pj="${x.personaje_id}">${x.usuario_id===S.me?"Sacar":"Quitar"}</button></span>`:""}</div></div>`; }).join("") : `<p class="small muted">Nadie se ha unido todavía.</p>`}
      <div class="row" style="align-items:end">
        ${libres.length ? `<label class="field" style="min-width:220px"><span>${misParticipaciones(c.id).length?"Añade otro de tus personajes":"Únete con uno de tus personajes"}</span><select id="part-pj">${libres.map(p=>`<option value="${p.id}">${esc(p.nombre)} (${esc(p.clase)} ${p.nivel})</option>`).join("")}</select></label>
          <button class="btn primary" data-act="part-unir">${misParticipaciones(c.id).length?"Añadir personaje":"Unirme"}</button>`
          : misPjs().length ? `<p class="small muted">Todos tus personajes están ya en esta partida.</p>` : `<p class="small">Necesitas un personaje para unirte. <a href="#personajes" data-act="pj-nuevo">Crea uno</a>.</p>`}
      </div>
    </div>
    ${soyCreador ? `<div class="panel"><h3>Ajustes de quien creó la partida</h3><div class="row" style="align-items:end"><label class="field" style="max-width:260px"><span>Modo de juego</span><select id="cd-modo"><option value="ia" ${c.modo!=="humano"?"selected":""}>La IA es el DM</option><option value="humano" ${c.modo==="humano"?"selected":""}>Tenemos DM propio</option></select></label>
      <span data-confirm="${c.id}"><button class="btn ghost" data-act="camp-borrar" data-id="${c.id}">Borrar partida</button></span></div></div>` : ""}
  </section>`;
}
async function generarCampana(){
  const f = S.camForm;
  for (const k of ["ambiente","tono","duracion","nivel","jugadores","ideas","modo"]) { const el = $("#c-"+k); if (el) f[k] = el.value; }
  const mundo = $("#c-mundo"); if (mundo) f.usarMundo = mundo.checked;
  S.busy = true; render(); $("#c-st").innerHTML = thinking("Escribiendo la campaña, puede tardar un minuto…");
  let err = "";
  try {
    const n = f.duracion.startsWith("Una") ? 3 : f.duracion.startsWith("Corta") ? 4 : 5;
    const mundoTxt = f.usarMundo && S.facciones.length ? "Razas y facciones creadas por la mesa (intégralas en la historia: PNJ, lugares o conflictos):\n" + S.facciones.slice(0,12).map(x => "- " + facResumen(x)).join("\n") : "";
    const r = await iaJSON(`Eres un Dungeon Master veterano de D&D 5e (usa contenido del SRD para monstruos, conjuros y objetos). Diseña en español una campaña original.
Ambientación: ${f.ambiente}. Tono: ${f.tono}. Duración: ${f.duracion}. ${f.jugadores} jugadores de nivel ${f.nivel}.
${f.ideas ? "Deseos del grupo: " + f.ideas : ""}
${mundoTxt}
Hazla jugable para principiantes: objetivos claros, encuentros con monstruos del SRD de dificultad adecuada al nivel, y algo que hacer en cada escena (combate, exploración o interacción).
Responde solo con JSON:
{"titulo": string, "gancho": string (cómo empieza, 2-3 frases, sin desvelar secretos), "sinopsis": string (resumen para el DM, incluye la verdad oculta), "actos": [${n} objetos {"titulo": string, "objetivo": string, "escenas": [3 strings], "encuentro": string (monstruos SRD y número)}], "pnjs": [4-6 objetos {"nombre": string, "rol": string, "descripcion": string, "secreto": string}], "lugares": [3-5 objetos {"nombre": string, "descripcion": string}], "giros": [2-3 strings], "final": string, "consejosDM": [2-3 strings]}`);
    if (!r?.titulo || !Array.isArray(r.actos)) throw { code:"invalid_json" };
    const datos = campDatos({ ...r, ambiente:f.ambiente, tono:f.tono, duracion:f.duracion, nivel:+f.nivel, jugadores:+f.jugadores });
    const row = await guardar(sb.from("dm_partidas").insert({ titulo:String(r.titulo).slice(0,120), modo:f.modo, datos }).select().single(), "Campaña creada. Ahora únete con tu personaje.");
    const c = partFromRow(row); S.partidas = [c, ...S.partidas]; S.campSel = c.id;
  } catch (e) { err = e?.code ? iaMsg(e) : errorTexto(e); }
  S.busy = false; render();
  if (err){ const st = $("#c-st"); if (st) st.textContent = err; }
}
async function crearManual(){
  const titulo = $("#m-titulo").value.trim(), gancho = $("#m-gancho").value.trim(), sinopsis = $("#m-sinopsis").value.trim(), modo = $("#m-modo").value;
  if (!titulo || !gancho){ toast("Escribe al menos el título y el gancho."); (titulo ? $("#m-gancho") : $("#m-titulo")).focus(); return; }
  S.busy = true; render();
  try {
    const datos = campDatos({ gancho, sinopsis, actos:[], pnjs:[], lugares:[], giros:[], consejosDM:[], ambiente:"", tono:"" });
    const row = await guardar(sb.from("dm_partidas").insert({ titulo:titulo.slice(0,120), modo, datos }).select().single(), "Partida creada. Ahora únete con tu personaje.");
    const c = partFromRow(row); S.partidas = [c, ...S.partidas]; S.campSel = c.id;
  } catch {}
  S.busy = false; render(); window.scrollTo(0,0);
}
async function unirme(){
  const c = partida(S.campSel), pj = $("#part-pj")?.value; if (!c || !pj) return;
  try {
    const r = await guardar(sb.from("dm_participantes").insert({ partida_id:c.id, usuario_id:S.me, personaje_id:pj }).select().single(), `${esc(pjById(pj)?.nombre || "Tu personaje")} se une a la partida.`);
    S.participantes = [...S.participantes.filter(x => !(x.partida_id === c.id && x.personaje_id === pj)), r];
  } catch {}
  render();
}
async function salirDe(pid, pjId){
  try { await guardar(sb.from("dm_participantes").delete().eq("partida_id", pid).eq("personaje_id", pjId)); S.participantes = S.participantes.filter(x => !(x.partida_id === pid && x.personaje_id === pjId)); } catch {}
  render();
}

/* ==================== JUGAR (la IA o una persona como DM) ==================== */
function escribiendoOtro(c){ return c?.escribiendo && c.escribiendo !== S.me && c.escribiendoTs && (Date.now() - Date.parse(c.escribiendoTs) < 180000); }
const dmHumano = c => c?.modo === "humano";
// Con quién habla el usuario en esta partida: sus personajes y, si dirige con DM propio, la voz del DM
function vocesDe(c){
  const out = misParticipaciones(c.id).map(x => pjById(x.personaje_id)).filter(Boolean).map(p => ({ v:p.id, t:p.nombre }));
  if (dmHumano(c) && c.creador === S.me) out.unshift({ v:"dm", t:"Dungeon Master (narrar)" });
  if (!out.length && !dmHumano(c) && c.creador === S.me) out.push({ v:"grupo", t:"El grupo" });
  return out;
}
function vozActual(c){ const vs = vocesDe(c), v = S.habla[c.id]; return vs.some(x => x.v === v) ? v : vs[0]?.v || null; }
function vJugar(){
  let c = S.playId && partida(S.playId);
  const mias = S.partidas.filter(puedoJugar);
  if (!c && mias.length){ c = mias[0]; S.playId = c.id; }
  if (!c) return `<section class="view"><h1>Jugar</h1><div class="empty"><h3>Únete primero a una partida</h3><p>Ve a Partidas, abre una y únete con uno o varios de tus personajes, o crea una nueva.</p><div class="row"><a class="btn primary" href="#campanas">Ir a Partidas</a><button class="btn gold" data-act="ejemplo">Cargar ejemplo</button></div></div></section>`;
  const humano = dmHumano(c), soyDM = humano && c.creador === S.me;
  // En combate, cuando le toca a uno de tus personajes, pasas a hablar como él
  const k = cb(c), act = actorActual(c);
  if (act?.tipo === "pj"){ const clave = `${c.id}:${k.ronda}:${k.turno}`;
    if (S.turnoVisto[c.id] !== clave){ S.turnoVisto[c.id] = clave; if (misParticipaciones(c.id).some(x => x.personaje_id === act.id)){ S.habla[c.id] = act.id; S.draft = ""; } } }
  const grupo = grupoDe(c.id), log = c.log || [], voces = vocesDe(c), voz = vozActual(c), puedo = voces.length > 0, otro = !humano && escribiendoOtro(c);
  const bloqueado = S.busy || otro || !puedo;
  const vacio = humano
    ? `La mesa está preparada. ${grupo.length?`Juegan: ${grupo.map(p=>`${esc(p.nombre)} (${esc(nombreUsuario(p.dueno))})`).join(", ")}.`:"Aún no hay personajes en esta partida."} Dirige <b>${esc(nombreUsuario(c.creador))}</b>: cuando abra la escena, todos veréis la historia en vivo.`
    : `La mesa está preparada. ${grupo.length?`Juegan: ${grupo.map(p=>`${esc(p.nombre)} (${esc(nombreUsuario(p.dueno))})`).join(", ")}.`:"Aún no hay personajes en esta partida."} Pulsa <b>Empezar la aventura</b> y el DM abrirá la escena. Todos los jugadores veréis la historia en vivo.`;
  const ph = voz === "dm" ? "Narra la escena, da voz a los PNJ o pide una tirada. Ej.: La puerta cruje y un esqueleto se levanta del nicho." : "¿Qué hace tu personaje? Ej.: Thorga examina la puerta en busca de trampas.";
  return `<section class="view">
    <div class="table">
      <div class="chat">
        <div class="chat-h">
          <div style="display:grid;gap:2px;min-width:0"><span class="label">${humano ? `Dirige ${esc(nombreUsuario(c.creador))} · DM propio` : "La IA es vuestro Dungeon Master"}</span><h2 style="font-size:1.35rem">${esc(c.titulo)}</h2></div>
          <select id="play-camp" aria-label="Cambiar de partida" style="width:auto;max-width:100%">${S.partidas.map(x=>`<option value="${x.id}" ${x.id===c.id?"selected":""}>${esc(x.titulo)}${puedoJugar(x)?"":" (no estás)"}</option>`).join("")}</select>
        </div>
        <div class="log" id="log">
          ${log.length ? log.map((m,i)=>msgHtml(m,i,c)).join("") : `<div class="msg sys"><p>${vacio}</p></div>`}
          <div id="live">${otro?`<div class="msg dm"><span class="who">Dungeon Master</span>${thinking(esc(nombreUsuario(c.escribiendo))+" ha hablado; el DM está preparando la respuesta…")}</div>`:""}</div>
        </div>
        <div class="composer">
          ${!puedo ? `<p class="small">Estás mirando. Para participar, <a href="#campanas" data-act="camp-ver" data-id="${c.id}">únete con uno de tus personajes</a>.</p>` : `
          ${!humano && !log.length ? `<button class="btn primary" data-act="play-start" ${bloqueado?"disabled":""}>Empezar la aventura</button>` : ""}
          ${combateBanner(c)}
          ${misPG(c)}
          ${voces.length > 1 ? `<label class="field" style="max-width:320px"><span>Hablas como</span><select id="play-como">${voces.map(x=>`<option value="${x.v}" ${x.v===voz?"selected":""}>${esc(x.t)}</option>`).join("")}</select></label>` : ""}
          ${voz === "dm" ? dmHerramientas(c, grupo, log) : voz ? formAtaque(c, voz) : ""}
          <textarea id="play-in" placeholder="${esc(ph)}" ${voz === "dm" ? `style="min-height:120px"` : ""} ${S.busy?"disabled":""}>${esc(S.draft||"")}</textarea>
          <div class="row" style="justify-content:space-between">
            <div class="row">${voz === "dm" ? "" : humano ? `
              <button class="btn sm ghost" data-act="play-hint" data-t="Hacemos un descanso corto.">Descanso corto</button>` : `
              <button class="btn sm ghost" data-act="play-hint" data-t="Describe con más detalle lo que vemos a nuestro alrededor.">Más detalles</button>
              <button class="btn sm ghost" data-act="play-hint" data-t="Como somos principiantes, ¿qué opciones tenemos ahora y qué tirada necesitaría cada una?">¿Qué podemos hacer?</button>
              <button class="btn sm ghost" data-act="play-hint" data-t="Hacemos un descanso corto.">Descanso corto</button>`}
            </div>
            <button class="btn primary" data-act="play-send" ${bloqueado?"disabled":""}>${voz === "dm" ? "Narrar" : "Enviar"}</button>
          </div>`}
          <span id="play-st" class="small" style="color:var(--bad)"></span>
        </div>
      </div>
      <aside class="side">
        <div class="panel">
          <div class="panel-h"><h3>El grupo</h3><button class="btn sm ghost" data-act="camp-ver" data-id="${c.id}">Jugadores</button></div>
          ${grupo.length ? grupo.map(p => { const d = derive(p), act = c.pgAct?.[p.id] ?? d.pg, pct = Math.max(0, Math.min(100, act/d.pg*100)), puedoPG = p.dueno === S.me || c.creador === S.me;
            return `<div class="party-row"><div><b>${esc(p.nombre)}</b><div class="small muted">${esc(nombreUsuario(p.dueno))} · ${esc(p.clase)} · CA ${d.ca} · ini ${fm(d.ini)}</div></div>
            <div class="hp">${puedoPG?`<button data-act="hp" data-id="${p.id}" data-d="-1" aria-label="Quitar 1 PG">−</button>`:""}<span class="mono">${act}/${d.pg}</span>${puedoPG?`<button data-act="hp" data-id="${p.id}" data-d="1" aria-label="Sumar 1 PG">+</button>`:""}</div>
            <div class="hpbar"><i style="width:${pct}%;background:${pct<=25?"var(--bad)":pct<=50?"var(--warn)":"var(--ok)"}"></i></div></div>`; }).join("") : `<p class="small muted">Sin personajes todavía.</p>`}
        </div>
        ${soyDM ? panelCombate(c, grupo) : ""}
        ${soyDM ? guionHtml(c) : ""}
        ${trayHtml()}
        ${puedo || c.creador === S.me ? `<div class="panel">
          <h3>Opciones de la mesa</h3>
          ${humano ? `<p class="small muted">Sin IA: ${esc(nombreUsuario(c.creador))} narra, pide las tiradas y lleva el combate aquí mismo.${soyDM ? ` En el <a href="#asistente" data-act="ir-asistente" data-id="${c.id}">Asistente del DM</a> tienes tus notas privadas.` : ""}</p>` : ""}
          ${c.creador === S.me ? `<label class="switch"><input type="checkbox" id="opt-fisicos" ${c.dadosFisicos ? "checked" : ""}> Dados físicos: tiráis dados de verdad, se escribe lo que sale y la app suma los modificadores de la ficha</label>` : c.dadosFisicos ? `<p class="small">Esta mesa usa <b>dados físicos</b>: al tirar, la app te pregunta qué ha salido y suma tus modificadores.</p>` : ""}
          ${humano ? "" : `
          <label class="switch"><input type="checkbox" id="opt-aprendiz" ${c.aprendiz!==false?"checked":""}> Modo aprendiz: el DM explica las reglas</label>`}
          <div class="row">${humano ? "" : `<button class="btn sm" data-act="play-resumen" ${!bloqueado&&log.length>4?"":"disabled"}>Resumir historia hasta aquí</button>`}
          ${c.creador===S.me?`<span data-confirm="reset-${c.id}"><button class="btn sm ghost" data-act="play-reset" data-id="${c.id}" ${log.length?"":"disabled"}>Reiniciar partida</button></span>`:""}</div>
          ${c.resumen?`<details><summary class="small">${humano ? "Resumen de lo jugado" : "Lo que recuerda el DM"}</summary><p class="small muted" style="margin-top:6px;white-space:pre-wrap">${esc(c.resumen)}</p></details>`:""}
        </div>` : ""}
      </aside>
    </div>
  </section>`;
}
// Utilidades del DM humano: pedir una tirada a un personaje y tirar por los enemigos
function dmHerramientas(c, grupo, log){
  return `<div class="dm-tools">
    ${!log.length && c.gancho ? `<div class="row"><button class="btn sm gold" data-act="dm-gancho">Empezar con el gancho de la partida</button></div>` : ""}
    <div class="row">
      <label class="field"><span>Pedir tirada a</span><select id="pt-pj">${grupo.map(p=>`<option value="${p.id}">${esc(p.nombre)}</option>`).join("")}</select></label>
      <label class="field"><span>Característica</span><select id="pt-car">${AB.map(k=>`<option value="${k}">${AB_N[k]}</option>`).join("")}</select></label>
      <label class="field"><span>Motivo</span><input type="text" id="pt-motivo" placeholder="Percepción"></label>
      <label class="field" style="max-width:90px"><span>CD</span><input type="number" id="pt-cd" min="1" max="30" value="12"></label>
      <label class="switch small"><input type="checkbox" id="pt-comp"> Competente</label>
      <button class="btn sm" data-act="dm-pedir" ${grupo.length?"":"disabled"}>Añadir petición</button>
    </div>
    <div class="row">
      <label class="field"><span>Tirada del DM</span><input type="text" id="dt-not" placeholder="1d20+4" class="mono"></label>
      <label class="field"><span>Por qué</span><input type="text" id="dt-motivo" placeholder="Ataque del esqueleto a Thorga"></label>
      <button class="btn sm" data-act="dm-tirar">Tirar y mostrar</button>
    </div>
    ${fisicaHtml(c, grupo)}
    <p class="small muted">La petición se añade a tu mensaje como un botón que el jugador pulsa para tirar. Las tiradas del DM se ${c.dadosFisicos ? "escriben" : "tiran"} aquí y todos ven el resultado.</p>
  </div>`;
}
function guionHtml(c){
  const actos = c.actos || [], pnjs = c.pnjs || [];
  if (!c.sinopsis && !actos.length && !pnjs.length) return "";
  return `<div class="panel guion"><details><summary>Tu guion (solo lo ves tú)</summary>
    ${c.sinopsis?`<p style="white-space:pre-wrap">${esc(c.sinopsis)}</p>`:""}
    ${actos.length?`<ol>${actos.map(a=>`<li><b>${esc(a.titulo)}:</b> ${esc(a.objetivo||"")}${a.encuentro?` <span class="muted">Encuentro: ${esc(a.encuentro)}</span>`:""}</li>`).join("")}</ol>`:""}
    ${pnjs.length?`<ul>${pnjs.map(n=>`<li><b>${esc(n.nombre)}</b> (${esc(n.rol||"")})${n.secreto?`: <span class="muted">${esc(n.secreto)}</span>`:""}</li>`).join("")}</ul>`:""}
    ${c.final?`<p><b>Final:</b> ${esc(c.final)}</p>`:""}
  </details></div>`;
}
function msgHtml(m, i, c){
  if (m.r === "dm") return `<div class="msg dm"><span class="who">${m.u ? "DM · " + esc(nombreUsuario(m.u)) : "Dungeon Master"}</span>${rich(m.t, {msgIdx:i, used:c.usados})}</div>`;
  if (m.r === "sys") return `<div class="msg sys">${rich(m.t)}</div>`;
  const pj = m.pj ? pjById(m.pj) : null;
  return `<div class="msg user"><span class="who">${esc(m.u ? nombreUsuario(m.u) : "El grupo")}${pj?" · "+esc(pj.nombre):""}</span>${rich(m.t)}</div>`;
}
after.jugar = () => { const l = $("#log"); if (l) l.scrollTop = l.scrollHeight; };
function reglasDM(c){
  const grupo = grupoDe(c.id), aprendiz = c.aprendiz !== false, mundo = contextoMundo(grupo);
  return `Eres el Dungeon Master de una partida de Dungeons & Dragons 5ª edición (reglas del SRD 5.1) con varios jugadores reales. Hablas siempre en español.

CÓMO DIRIGES:
- Narra de forma vívida pero breve: 1 a 3 párrafos por respuesta. Describe lo que los personajes ven, oyen y huelen.
- Cada mensaje de jugador empieza con [usuario · personaje]. Dirígete a cada personaje por su nombre y reparte el protagonismo entre todos.
- Interpreta a los PNJ con voz propia (pon sus diálogos entre comillas).
- Nunca decidas lo que hacen o dicen los personajes jugadores. Termina cada respuesta preguntando qué hacen, o a quién le toca.
- Pide tiradas solo cuando el resultado sea incierto y tenga consecuencias. Para pedir una tirada a un jugador escribe EXACTAMENTE esta etiqueta en una línea propia: [[tirada: 1d20+MOD | Habilidad (Nombre del personaje) | CD N]]  Usa el modificador real de la ficha (característica + competencia si procede). Para ventaja escribe "con ventaja" en la habilidad. Para daño: [[tirada: 1d8+3 | Daño de espada (Nombre)]].
- Cuando pidas una tirada, detente y espera el resultado antes de narrar el desenlace.
- Las tiradas de monstruos y PNJ las haces tú con la herramienta tirar_dados (úsala siempre, nunca inventes resultados).
- En combate: pide iniciativa al principio, sigue el orden de turnos, di los PG de daño que sufre cada personaje y avisa cuando un enemigo está malherido.
- Respeta los rasgos de las razas y facciones creadas por la mesa como si fueran oficiales.
- Sé justo: los fracasos tienen consecuencias interesantes. Recompensa la creatividad.
${aprendiz ? "- MODO APRENDIZ: los jugadores son principiantes. Cuando aparezca una regla nueva, añade al final una línea que empiece por \"> Consejo:\" explicándola en una o dos frases sencillas." : ""}
- No uses tablas. Puedes usar **negrita** para nombres importantes.

LA CAMPAÑA (información secreta del DM, no la reveles de golpe):
Título: ${c.titulo}
Gancho: ${c.gancho}
Sinopsis: ${c.sinopsis}
Actos: ${(c.actos||[]).map((a,i)=>`${i+1}) ${a.titulo}: ${a.objetivo}. Encuentro: ${a.encuentro||"-"}`).join(" | ")}
PNJ: ${(c.pnjs||[]).map(n=>`${n.nombre} (${n.rol}; secreto: ${n.secreto||"-"})`).join("; ")}
Lugares: ${(c.lugares||[]).map(l=>l.nombre).join(", ")}
Final previsto: ${c.final||"-"}

EL GRUPO:
${grupo.length ? grupo.map(p => "- " + pjResumen(p) + ` PG actuales: ${c.pgAct?.[p.id] ?? derive(p).pg}.`).join("\n") : "- No hay fichas: pregunta a los jugadores quiénes son antes de empezar."}
${mundo ? "\nRAZAS Y FACCIONES DE LA MESA QUE APARECEN EN EL GRUPO:\n" + mundo : ""}

${c.resumen ? "LO QUE HA PASADO HASTA AHORA (resumen):\n" + c.resumen : "La partida aún no ha empezado."}`;
}
function turnosDe(c){
  const out = [];
  for (const m of c.log.slice(c.resumenIdx || 0)){
    if (m.r === "sys") continue;
    if (m.r === "dm") out.push({ role:"assistant", content:m.t });
    else { const pj = m.pj ? pjById(m.pj) : null; out.push({ role:"user", content:`[${m.u ? nombreUsuario(m.u) : "jugador"} · ${pj ? pj.nombre : "grupo"}] ${m.t}` }); }
  }
  if (!out.length || out[out.length-1].role !== "user") out.push({ role:"user", content:"Comienza la partida: presenta la escena inicial a partir del gancho, presenta a cada personaje del grupo y pregunta qué hacen." });
  return out;
}
async function resumir(c, force){
  const log = c.log; c.resumenIdx ||= 0;
  if (!force && log.length - c.resumenIdx <= 36) return;
  const hasta = force ? log.length : log.length - 16;
  const trozo = log.slice(c.resumenIdx, hasta).map(m => (m.r==="dm"?"DM: ":m.r==="sys"?"(dados) ":"Jugador: ") + m.t).join("\n").slice(-60000);
  if (!trozo) return;
  const r = await ia({ modo:"texto", esfuerzo:"low", messages:[{ role:"user", content:`Resume en español, en viñetas breves, lo que ha ocurrido en esta parte de una partida de D&D para que el DM lo recuerde: hechos clave, PNJ conocidos y su actitud, objetos obtenidos, heridas, pistas y misiones pendientes. Máximo 200 palabras.

Resumen anterior:
${c.resumen || "(ninguno)"}

Nueva parte:
${trozo}

Devuelve el resumen completo actualizado (anterior + nuevo), solo las viñetas.` }] });
  c.resumen = r.texto.trim(); c.resumenIdx = hasta;
}
function recortar(c){
  while ((c.log.length > 160 || JSON.stringify(c.log).length > 300000) && c.resumenIdx > 0){
    c.log.shift(); c.resumenIdx--;
    const u = {}; for (const [k,v] of Object.entries(c.usados||{})){ const [i,n] = k.split(":"); if (+i>0) u[(+i-1)+":"+n] = v; } c.usados = u;
  }
}
async function enviarDM(texto){
  if (S.busy) return;
  let c;
  try { c = partFromRow(await q(sb.from("dm_partidas").select("*").eq("id", S.playId).single())); } catch (e) { toast(esc(errorTexto(e))); return; }
  if (escribiendoOtro(c)){ toast("Otro jugador está esperando la respuesta del DM. Espera un momento."); return; }
  const voz = vozActual(c), pjId = voz && voz !== "grupo" ? voz : null;
  try { await q(sb.from("dm_partidas").update({ escribiendo:S.me, escribiendo_ts:new Date().toISOString() }).eq("id", c.id)); } catch (e) { toast(esc(errorTexto(e))); return; }
  if (texto) c.log.push({ r:"user", t:texto, u:S.me, pj:pjId, ts:Date.now() });
  S.partidas = S.partidas.map(x => x.id === c.id ? c : x);
  S.draft = ""; S.busy = true; render();
  const live = $("#live"); live.innerHTML = `<div class="msg dm"><span class="who">Dungeon Master</span>${thinking("El DM está preparando la escena…")}</div>`;
  $("#log").scrollTop = $("#log").scrollHeight;
  let err = "";
  try {
    await resumir(c, false);
    const r = await ia({ modo:"dm", system:reglasDM(c), messages:turnosDe(c), dados:true });
    for (const t of r.tiradas || []) c.log.push({ r:"sys", t:`Tirada del DM — ${t.motivo || ""} ${t.notacion}: ${t.detalle} = **${t.total}**${t.natural===20?" (¡20 natural!)":t.natural===1?" (1 natural)":""}`, ts:Date.now() });
    c.log.push({ r:"dm", t:r.texto.trim(), ts:Date.now() });
  } catch (e) { err = e?.code === "sin_clave" ? "La IA está desactivada en esta mesa, así que no habrá respuesta. Tu mensaje se ha guardado. Para jugar sin IA, quien creó la partida puede elegir «Tenemos DM propio» en Partidas y narrar desde aquí." : iaMsg(e); }
  recortar(c);
  try { await q(sb.from("dm_partidas").update({ log:c.log, resumen:c.resumen, resumen_idx:c.resumenIdx, usados:c.usados, escribiendo:null, escribiendo_ts:null }).eq("id", c.id)); }
  catch (e) { err ||= errorTexto(e); }
  S.partidas = S.partidas.map(x => x.id === c.id ? c : x);
  S.busy = false; render();
  if (err){ const st = $("#play-st"); if (st) st.textContent = err; }
}
// Mesa con DM propio: los mensajes se añaden al registro sin pasar por la IA
async function anadirLog(c, msgs){
  const log = await q(sb.rpc("dm_anadir_log", { p:c.id, msgs }));
  c.log = log || c.log;
  S.partidas = S.partidas.map(x => x.id === c.id ? c : x);
}
async function enviarHumano(texto){
  const c = partida(S.playId); if (!c || S.busy) return;
  const voz = vozActual(c); if (!voz) return;
  S.busy = true;
  try {
    await anadirLog(c, [voz === "dm" ? { r:"dm", t:texto } : { r:"user", t:texto, pj:voz }]);
    S.draft = "";
  } catch (e) { toast(esc(errorTexto(e))); }
  S.busy = false; render();
}
function dmPedirTirada(){
  const p = pjById($("#pt-pj")?.value); if (!p) return;
  const k = $("#pt-car").value, d = derive(p), comp = $("#pt-comp").checked, cd = +$("#pt-cd").value || 10;
  const mod = modOf(d.sc[k]) + (comp ? d.prof : 0), motivo = $("#pt-motivo").value.trim() || AB_N[k];
  const tag = `[[tirada: 1d20${mod ? (mod > 0 ? "+" : "-") + Math.abs(mod) : ""} | ${motivo} (${p.nombre}) | CD ${cd}]]`;
  const box = $("#play-in"); box.value = (box.value.trim() ? box.value.trim() + "\n\n" : "") + tag; S.draft = box.value; box.focus();
}
async function dmTirar(){
  const c = partida(S.playId), not = $("#dt-not").value.trim(), motivo = $("#dt-motivo").value.trim();
  if (!c || !not) { toast("Escribe la tirada, por ejemplo 1d20+4."); return; }
  let r; try { r = tirarCon(c, not, "Tirada del DM" + (motivo ? ": " + motivo : "")); if (!r) return; } catch (e) { toast(esc(e.message)); return; }
  S.busy = true;
  try { await anadirLog(c, [{ r:"sys", t:`Tirada del DM — ${motivo ? motivo + " " : ""}${not}: ${r.detalle} = **${r.total}**${r.crit?" (¡20 natural!)":r.pifia?" (1 natural)":""}` }]); }
  catch (e) { toast(esc(errorTexto(e))); }
  S.busy = false; render();
}
const pgPend = {};
function cambiarPG(pjId, delta){
  const c = partida(S.playId), p = pjById(pjId); if (!c || !p) return;
  const max = derive(p).pg; c.pgAct = { ...c.pgAct, [pjId]: Math.max(0, Math.min(max, (c.pgAct[pjId] ?? max) + delta)) };
  render();
  clearTimeout(pgPend[c.id]);
  pgPend[c.id] = setTimeout(async () => {
    try { const fresco = await q(sb.from("dm_partidas").select("pg_act").eq("id", c.id).single()); await q(sb.from("dm_partidas").update({ pg_act:{ ...(fresco.pg_act||{}), [pjId]: c.pgAct[pjId] } }).eq("id", c.id)); } catch (e) { toast(esc(errorTexto(e))); }
  }, 700);
}

/* ==================== ASISTENTE DEL DM (DM humano) ==================== */
const CHIPS_DM = [
  ["PNJ improvisado","Los jugadores acaban de hablar con alguien que no tenía preparado. Inventa un PNJ que encaje en la escena actual: nombre, aspecto, forma de hablar, qué quiere y un secreto. Breve."],
  ["Encuentro equilibrado","Propón un encuentro de combate equilibrado para el grupo (dificultad media según el SRD), con monstruos del SRD, su CA, PG y ataque principal, el terreno y una táctica para los enemigos."],
  ["Describir un lugar","Dame una descripción para leer en voz alta (3-4 frases, usando los sentidos) del lugar donde están ahora los jugadores, y dos detalles interactivos."],
  ["¿Qué tirada pido?","Un jugador quiere hacer algo arriesgado. Explícame cómo decidir qué prueba pedir (característica + habilidad), qué CD poner y cuándo dar ventaja o desventaja, con 3 ejemplos."],
  ["Botín","Genera un botín adecuado al nivel del grupo según el SRD: monedas, un objeto curioso y quizá un objeto mágico menor, con una línea de historia."],
  ["Se han salido del guion","Los jugadores han hecho algo que rompe mi plan. Dame 3 formas de reconducir la historia sin forzarles, usando los PNJ y lugares de la campaña."],
  ["Usar las facciones","¿Cómo puedo meter en la próxima escena las razas y facciones de los personajes del grupo para que cada jugador tenga su momento?"],
  ["Regla rápida","Explícame de forma breve y con un ejemplo cómo funcionan: ataques de oportunidad, cobertura, agarrar y empujar en 5e."]
];
async function cargarAsesor(pid){
  if (S.asesor[pid] !== undefined) return;
  S.asesor[pid] = null;
  try {
    const r = await q(sb.from("dm_asesor").select("datos").eq("partida_id", pid).eq("usuario_id", S.me).maybeSingle());
    S.asesor[pid] = { logDM:[], notas:"", ini:[], turno:null, ronda:1, ...(r?.datos || {}) };
  } catch { S.asesor[pid] = { logDM:[], notas:"", ini:[], turno:null, ronda:1 }; }
  softRender();
}
const asesorPend = {};
function guardarAsesor(pid, inmediato){
  clearTimeout(asesorPend[pid]);
  const run = () => sb.from("dm_asesor").upsert({ partida_id:pid, usuario_id:S.me, datos:S.asesor[pid] }, { onConflict:"partida_id,usuario_id" }).then(({error}) => { if (error) toast(esc(errorTexto(error))); });
  if (inmediato) run(); else asesorPend[pid] = setTimeout(run, 800);
}
function vAsistente(){
  let c = S.dmId && partida(S.dmId);
  const mias = S.partidas.filter(puedoJugar);
  if (!c && mias.length){ c = mias.find(x => x.modo === "humano") || mias[0]; S.dmId = c.id; }
  if (!c) return `<section class="view"><h1>Asistente del DM</h1><div class="empty"><h3>Necesitas una partida</h3><p>Genera una en Partidas (elige «Tenemos DM propio») o carga la partida de ejemplo.</p><div class="row"><a class="btn primary" href="#campanas">Ir a Partidas</a><button class="btn gold" data-act="ejemplo">Cargar ejemplo</button></div></div></section>`;
  const a = S.asesor[c.id];
  if (a === undefined){ cargarAsesor(c.id); }
  if (!a) return `<div class="loading">Cargando tus notas…</div>`;
  const log = a.logDM || [], ini = a.ini || [];
  return `<section class="view">
    <div class="table">
      <div class="chat">
        <div class="chat-h">
          <div style="display:grid;gap:2px;min-width:0"><span class="label">Tú diriges · la IA te asesora en privado</span><h2 style="font-size:1.35rem">${esc(c.titulo)}</h2></div>
          <select id="dm-camp" aria-label="Cambiar de partida" style="width:auto;max-width:100%">${mias.map(x=>`<option value="${x.id}" ${x.id===c.id?"selected":""}>${esc(x.titulo)}</option>`).join("")}</select>
        </div>
        <div class="log" id="log">
          ${log.length ? log.map(m => m.r==="dm" ? `<div class="msg dm"><span class="who">Consejero</span>${rich(m.t)}</div>` : `<div class="msg user"><span class="who">Tú (DM)</span>${rich(m.t)}</div>`).join("")
            : `<div class="msg sys"><p>Pregúntame lo que necesites mientras diriges: cómo reaccionaría un PNJ, qué regla aplicar, cómo equilibrar un combate o qué hacer si los jugadores se salen del guion. Conozco la campaña, el grupo, sus razas y facciones, y tus notas. Solo tú ves esta conversación.</p></div>`}
          <div id="live"></div>
        </div>
        <div class="composer">
          <div class="chips">${CHIPS_DM.map(([l],i)=>`<button class="btn sm" data-act="dm-chip" data-i="${i}" ${S.busy?"disabled":""}>${l}</button>`).join("")}</div>
          <textarea id="dm-in" placeholder="Ej.: El pícaro quiere robarle la llave al capitán delante de todos. ¿Qué tirada pido y qué pasa si falla?" ${S.busy?"disabled":""}></textarea>
          <div class="row" style="justify-content:flex-end"><button class="btn sm ghost" data-act="dm-limpiar" ${log.length&&!S.busy?"":"disabled"}>Borrar conversación</button><button class="btn primary" data-act="dm-send" ${S.busy?"disabled":""}>Preguntar</button></div>
          <span id="dm-st" class="small" style="color:var(--bad)"></span>
        </div>
      </div>
      <aside class="side">
        <div class="panel">
          <div class="panel-h"><h3>Iniciativa</h3><a class="small" href="#w-iniciativa">¿Cómo funciona?</a></div>
          <div id="ini">${ini.length ? ini.map((r,i)=>`<div class="ini-row ${a.turno===i?"now":""}"><span class="mono small">${i+1}</span><input type="text" value="${esc(r.n)}" data-ini="${i}" data-f="n" aria-label="Nombre"><input type="number" value="${r.v}" data-ini="${i}" data-f="v" aria-label="Iniciativa" class="mono"><input type="number" value="${r.pg??""}" data-ini="${i}" data-f="pg" aria-label="PG" placeholder="PG" class="mono"><button class="btn sm ghost" data-act="ini-del" data-i="${i}" aria-label="Quitar">✕</button></div>`).join("") : `<p class="small muted">Añade al grupo y a los enemigos, escribe lo que sacó cada uno (d20 + DES) y ordena.</p>`}</div>
          <div class="row"><button class="btn sm" data-act="ini-add">Añadir</button><button class="btn sm" data-act="ini-grupo">Añadir grupo</button><button class="btn sm" data-act="ini-orden">Ordenar</button><button class="btn sm primary" data-act="ini-next" ${ini.length?"":"disabled"}>Siguiente turno</button></div>
          ${ini.length?`<div class="row"><span class="small muted">Ronda ${a.ronda||1}</span><button class="btn sm ghost" data-act="ini-clear">Terminar combate</button></div>`:""}
        </div>
        ${trayHtml()}
        <div class="panel">
          <h3>Notas de la sesión</h3>
          <textarea id="dm-notas" placeholder="Lo que pasó hoy, nombres improvisados, pistas que dieron los jugadores…" style="min-height:140px">${esc(a.notas||"")}</textarea>
          <span class="small muted">Se guardan solas, son privadas y la IA las tiene en cuenta.</span>
        </div>
      </aside>
    </div>
  </section>`;
}
after.asistente = after.jugar;
function reglasAsesor(c){
  const grupo = grupoDe(c.id), a = S.asesor[c.id], mundo = contextoMundo(grupo);
  return `Eres un consejero experto para un Dungeon Master humano que está dirigiendo una partida de D&D 5ª edición (SRD 5.1). Respondes en español. No narras la partida a los jugadores: hablas en privado con el DM, de forma práctica, breve y concreta, para que pueda usarlo en la mesa al instante. Usa listas cortas. Cita reglas del SRD cuando ayuden, con números concretos (CD, CA, PG, daño). Si el DM es principiante, explícale el porqué en una frase.

CAMPAÑA: ${c.titulo}. ${c.sinopsis}
Actos: ${(c.actos||[]).map((x,i)=>`${i+1}) ${x.titulo}: ${x.objetivo}`).join(" | ")}
PNJ: ${(c.pnjs||[]).map(n=>`${n.nombre} (${n.rol}; secreto: ${n.secreto||"-"})`).join("; ")}
Lugares: ${(c.lugares||[]).map(l=>`${l.nombre}: ${l.descripcion}`).join(" | ")}
GRUPO:
${grupo.length ? grupo.map(p=>"- " + pjResumen(p).slice(0,600)).join("\n") : "- (sin fichas cargadas)"}
${mundo ? "RAZAS Y FACCIONES DE LA MESA:\n" + mundo : ""}
${a?.ini?.length ? "COMBATE ACTUAL (iniciativa): " + a.ini.map(r=>`${r.n} ${r.v}${r.pg!=null&&r.pg!==""?" PG "+r.pg:""}`).join(", ") : ""}
NOTAS DEL DM:
${(a?.notas||"(ninguna)").slice(0,4000)}`;
}
async function enviarAsesor(texto){
  const c = partida(S.dmId), a = c && S.asesor[c.id]; if (!a || S.busy || !texto.trim()) return;
  a.logDM ||= []; a.logDM.push({ r:"user", t:texto.trim(), ts:Date.now() });
  S.busy = true; render();
  $("#live").innerHTML = `<div class="msg dm"><span class="who">Consejero</span>${thinking("Pensando…")}</div>`;
  $("#log").scrollTop = $("#log").scrollHeight;
  let err = "";
  try {
    const r = await ia({ modo:"texto", system:reglasAsesor(c), messages:a.logDM.slice(-16).map(m => ({ role:m.r==="dm"?"assistant":"user", content:m.t })) });
    a.logDM.push({ r:"dm", t:r.texto.trim(), ts:Date.now() });
  } catch (e) { err = iaMsg(e); }
  a.logDM = a.logDM.slice(-60); guardarAsesor(c.id, true);
  S.busy = false; render();
  if (err){ const st = $("#dm-st"); if (st) st.textContent = err; }
}

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
/* ==================== ejemplo ==================== */
async function cargarEjemplo(){
  const ya = S.partidas.find(c => c.ejemplo && c.creador === S.me);
  if (ya){ toast("Ya tienes cargada la partida de ejemplo."); S.campSel = ya.id; location.hash = "#campanas"; render(); return; }
  const thorga = { ...nuevoPJ(), nombre:"Thorga Martillo de Brasa", razaSrd:"Enano", clase:"Guerrero", trasfondo:"Artesano gremial", alineamiento:"Legal bueno", base:{FUE:15,DES:10,CON:14,INT:8,SAB:13,CAR:12}, ca:"18", ejemplo:true,
    personalidad:"Gruñona y desconfiada con los desconocidos, pero daría la vida por sus amigos.", ideales:"El trabajo bien hecho dura generaciones.", vinculos:"Busca el martillo de su abuela, perdido en una cripta.", defectos:"No sabe perder una discusión.",
    historia:"Herrera de un clan enano de las colinas. Cuando unos saqueadores robaron el martillo ancestral de su familia, cambió el yunque por el escudo y salió a buscarlo.",
    competencias:"Atletismo, Intimidación, Perspicacia, Historia; todas las armas y armaduras; herramientas de herrero.", equipo:"Cota de malla, escudo, hacha de guerra (1d8), 2 hachas de mano, paquete de explorador." };
  const lyra = { ...nuevoPJ(), nombre:"Lyra Piesligeros", razaSrd:"Mediano", clase:"Pícaro", trasfondo:"Criminal", alineamiento:"Caótico bueno", base:{FUE:8,DES:15,CON:14,INT:12,SAB:13,CAR:10}, ca:"14", ejemplo:true,
    personalidad:"Curiosa, bromista y siempre con las manos en algún bolsillo ajeno.", ideales:"Nadie debería pasar hambre mientras otros acumulan oro.", vinculos:"Debe un favor peligroso a la Hermandad del Farol.", defectos:"No resiste una cerradura cerrada.",
    historia:"Creció en los muelles de Puerto Velo robando a los mercaderes ricos. Un último encargo de la Hermandad la ha llevado hasta la vieja cripta del faro.",
    competencias:"Sigilo, Juego de manos, Acrobacias, Percepción, Engaño, Investigación; herramientas de ladrón.", equipo:"Armadura de cuero, estoque (1d8), arco corto (1d6), herramientas de ladrón, ganzúas, 15 po." };
  const camp = { ejemplo:true, ambiente:AMBIENTES[2], tono:TONOS[1], duracion:DURACIONES[0], nivel:1, jugadores:2,
    gancho:"Cada noche, el viejo faro de Puerto Velo, apagado desde hace cien años, vuelve a encenderse con una luz verde. Los barcos que la siguen acaban en las rocas. La alcaldesa Merrin ofrece 100 monedas de oro a quien descubra qué hay allí abajo.",
    sinopsis:"Bajo el faro hay una cripta donde yace Aldric, el antiguo farero, convertido en una sombra por un fragmento de piedra maldita. El contrabandista Silas Brea usa la luz para hundir barcos y saquear su carga, y ha llenado la cripta de esqueletos. La verdad oculta: la alcaldesa Merrin recibe una parte del botín de Silas.",
    actos:[
      {titulo:"La luz verde", objetivo:"Investigar en el puerto y llegar al faro", escenas:["Hablar con marineros en la taberna La Gaviota Tuerta","Examinar los restos de un naufragio en la playa","Cruzar la escollera con la marea subiendo"], encuentro:"2 cangrejos gigantes en la escollera"},
      {titulo:"La cripta", objetivo:"Bajar bajo el faro y descubrir a los contrabandistas", escenas:["Una trampa de foso en la escalera de caracol","El almacén de Silas lleno de carga robada","Un diario de Aldric que habla de la piedra verde"], encuentro:"3 esqueletos y Silas Brea (bandido)"},
      {titulo:"La sombra del farero", objetivo:"Romper la piedra maldita y decidir qué hacer con la alcaldesa", escenas:["La sala de la lámpara con la piedra verde","Aldric pide ser liberado","Volver al pueblo con las pruebas de la traición"], encuentro:"1 sombra (Aldric) y 2 esqueletos"}
    ],
    pnjs:[
      {nombre:"Alcaldesa Merrin", rol:"Quien da la misión", descripcion:"Mujer elegante y sonriente que habla muy rápido cuando está nerviosa.", secreto:"Cobra una parte del contrabando de Silas."},
      {nombre:"Silas Brea", rol:"Contrabandista y villano", descripcion:"Semiorco con un garfio de plata y voz suave, casi amable.", secreto:"Teme a la sombra tanto como todos y quiere escapar del pueblo."},
      {nombre:"Aldric", rol:"Farero muerto convertido en sombra", descripcion:"Silueta oscura que susurra frases sobre el mar.", secreto:"Si alguien rompe la piedra, encuentra la paz y da las gracias."},
      {nombre:"Bess la Tuerta", rol:"Tabernera", descripcion:"Antigua marinera con un parche y una risa enorme.", secreto:"Vio a Merrin hablar con Silas en el muelle de madrugada."}
    ],
    lugares:[{nombre:"Puerto Velo", descripcion:"Pueblo de pescadores con casas azules y olor a sal y brea."},{nombre:"La Gaviota Tuerta", descripcion:"Taberna ruidosa junto al muelle, buena para rumores."},{nombre:"El faro y su cripta", descripcion:"Torre de piedra sobre las rocas; bajo ella, pasillos húmedos con nichos funerarios."}],
    giros:["La alcaldesa intenta comprar el silencio de los héroes.","Silas propone una alianza contra la sombra."],
    final:"Al romper la piedra verde la luz se apaga para siempre. Los héroes deciden si denunciar a Merrin ante el pueblo.",
    consejosDM:["Deja que los jugadores descubran la traición por pistas, no se la cuentes.","Si el combate va mal, Silas puede huir y volver más tarde."] };
  S.busy = true; render();
  try {
    const pjs = await q(sb.from("dm_personajes").insert([pjToRow(thorga), pjToRow(lyra)]).select());
    S.personajes = [...pjs.map(pjFromRow), ...S.personajes];
    const row = await q(sb.from("dm_partidas").insert({ titulo:"La Cripta del Farol Hundido", modo:"ia", datos:campDatos(camp) }).select().single());
    const c = partFromRow(row); S.partidas = [c, ...S.partidas];
    const ly = pjs.find(p => p.nombre.startsWith("Lyra"));
    const part = await q(sb.from("dm_participantes").insert({ partida_id:c.id, usuario_id:S.me, personaje_id:ly.id }).select().single());
    S.participantes = [...S.participantes, part];
    S.playId = c.id; S.dmId = c.id; S.campSel = c.id;
    toast("Ejemplo cargado: juegas con Lyra. Thorga queda libre para otra partida.");
  } catch (e) { toast(esc(errorTexto(e))); }
  S.busy = false; location.hash = "#campanas"; render();
}

/* ==================== confirmaciones ==================== */
function confirmar(btn, yes, txt="Sí, borrar"){
  const wrap = btn.closest("[data-confirm]"); if (!wrap) return yes();
  wrap.innerHTML = `<span class="confirm">¿Seguro? <button class="btn sm primary" data-act="confirm-yes">${txt}</button><button class="btn sm ghost" data-act="confirm-no">No</button></span>`;
  wrap._yes = yes;
}
async function borrar(tabla, id, ok){
  try { await guardar(sb.from(tabla).delete().eq("id", id), ok); return true; } catch { return false; }
}
function tirarTry(not){
  S.trayMode = "normal";
  try { const r = rollNotation(not); S.hist.unshift(r); S.hist = S.hist.slice(0,12); toast(`<div class="small">${esc(not)}</div><div class="mono">${r.total}</div><div class="small">${esc(r.detalle)}</div>`); const tr = $(".tray"); if (tr) tr.outerHTML = trayHtml(); }
  catch (e) { toast(esc(e.message)); }
}
async function tirarPeticion(t){
  if (t.disabled) return;
  const not = t.dataset.roll, lab = t.dataset.label, cd = t.dataset.cd, key = t.dataset.key;
  const mode = /desventaja/i.test(lab) ? "desventaja" : /ventaja/i.test(lab) ? "ventaja" : "normal";
  const c0 = partida(S.playId);
  let r; try { r = tirarCon(c0, not, lab || not, mode); if (!r) return; } catch (e) { toast(esc(e.message)); return; }
  const linea = `Tirada de ${lab || not}: ${not} → ${r.detalle} = ${r.total}${r.crit?" (¡20 natural!)":r.pifia?" (1 natural)":""}`;
  const box = $("#play-in"); if (box){ box.value = (box.value ? box.value.trim() + "\n" : "") + linea; S.draft = box.value; }
  t.disabled = true; t.firstElementChild.textContent = "Tirado: " + r.total;
  toast(`<div class="small">${esc(lab||not)}${cd? " · "+esc(cd):""}</div><div class="mono">${r.total}</div><div class="small">${esc(r.detalle)}. Añadido a tu mensaje: pulsa Enviar cuando estéis listos.</div>`, 5000);
  const c = partida(S.playId); if (!c) return;
  c.usados = { ...c.usados, [key]: String(r.total) };
  try { const f = await q(sb.from("dm_partidas").select("usados").eq("id", c.id).single()); await q(sb.from("dm_partidas").update({ usados:{ ...(f.usados||{}), [key]:String(r.total) } }).eq("id", c.id)); } catch {}
}
function asesorAct(fn){ const c = partida(S.dmId), a = c && S.asesor[c.id]; if (!a) return; a.ini ||= []; fn(a, c); guardarAsesor(c.id, true); render(); }

/* ==================== clics ==================== */
document.addEventListener("click", async (ev) => {
  const t = ev.target.closest("[data-act],[data-try],[data-adv],.rollreq");
  if (!t) return;
  if (t.matches(".rollreq")) return tirarPeticion(t);
  if (t.dataset.try) return tirarTry(t.dataset.try);
  if (t.dataset.adv) return advDemo(t.dataset.adv);
  const a = t.dataset.act, id = t.dataset.id;
  if (t.tagName === "A") ev.preventDefault();
  const ir = h => { if (location.hash === h) render(); else location.hash = h; };
  switch (a){
    case "auth-modo": S.authMode = t.dataset.m; render(); break;
    case "salir": await sb.auth.signOut(); break;
    case "ejemplo": cargarEjemplo(); break;
    // personajes
    case "pj-nuevo": S.edit = nuevoPJ(); S.verPj = null; ir("#personajes"); window.scrollTo(0,0); break;
    case "pj-editar": { const p = pjById(id); if (!p) break; S.edit = clone(p); S.edit.pool ||= AB.map(k => S.edit.base[k]); S.edit.base ||= {FUE:10,DES:10,CON:10,INT:10,SAB:10,CAR:10}; render(); window.scrollTo(0,0); } break;
    case "pj-ver": S.verPj = id; render(); window.scrollTo(0,0); break;
    case "pj-volver": S.verPj = null; render(); break;
    case "pj-cancelar": S.edit = null; render(); break;
    case "pj-guardar": guardarPJ(); break;
    case "pj-borrar": confirmar(t, async () => { if (await borrar("dm_personajes", id, "Personaje borrado.")){ S.personajes = S.personajes.filter(p => p.id !== id); S.participantes = S.participantes.filter(x => x.personaje_id !== id); } render(); }); break;
    case "pj-filtro": S.pjFiltro = t.dataset.f; render(); break;
    case "pj-metodo": { leerForm(); const p = S.edit, m = t.dataset.m; p.metodo = m;
        if (m === "array"){ p.pool = ARRAY_STD.slice(); autoAsignar(p); }
        if (m === "puntos"){ p.pool = []; AB.forEach(k => p.base[k] = 8); }
        if (m === "tirar"){ p.pool = AB.map(tirar4d6); autoAsignar(p); }
        render(true); } break;
    case "pj-tirar": leerForm(); S.edit.pool = AB.map(tirar4d6); autoAsignar(S.edit); render(true); break;
    case "pj-auto": leerForm(); autoAsignar(S.edit); render(true); break;
    case "pb": { leerForm(); const p = S.edit, k = t.dataset.k, nv = p.base[k] + (+t.dataset.d);
        if (nv < 8 || nv > 15) break;
        const used = AB.reduce((s,x) => s + PB_COST[x===k?nv:p.base[x]], 0);
        if (used > 27){ toast("No te quedan puntos suficientes."); break; }
        p.base[k] = nv; render(true); } break;
    case "pj-ia": pjIA(false); break;
    case "pj-ia-historia": pjIA(true); break;
    // razas y facciones
    case "fac-nueva": if (S.edit && S.view === "personajes") leerForm(); S.editFac = nuevaFac(t.dataset.t); S.verFac = null; ir("#facciones"); window.scrollTo(0,0); break;
    case "fac-ver": if (S.edit && S.view === "personajes") leerForm(); S.verFac = id; S.editFac = null; ir("#facciones"); window.scrollTo(0,0); break;
    case "fac-editar": { const f = facById(id); if (!f) break; S.editFac = clone(f); if (f.tipo === "raza") S.editFac.bonos ||= {FUE:0,DES:0,CON:0,INT:0,SAB:0,CAR:0}; render(); window.scrollTo(0,0); } break;
    case "fac-volver": S.verFac = null; render(); break;
    case "fac-cancelar": S.editFac = null; render(); break;
    case "fac-guardar": guardarFac(); break;
    case "fac-tipo": { leerFac(); const f = S.editFac; f.tipo = t.dataset.t; if (f.tipo === "raza"){ f.bonos ||= {FUE:0,DES:0,CON:0,INT:0,SAB:0,CAR:0}; f.tamano ||= "Mediano"; f.velocidad ||= 30; f.vision ||= "No"; } render(true); } break;
    case "fac-filtro": S.facFiltro = t.dataset.f; render(); break;
    case "fac-ia": facIA(); break;
    case "fac-usar": { const f = facById(id); if (!f) break;
        const pre = f.tipo === "raza" ? { raza_id:f.id } : { faccion_id:f.id };
        if (S.edit && !S.edit.id) Object.assign(S.edit, pre); else S.edit = nuevoPJ(pre);
        S.verPj = null; location.hash = "#personajes"; window.scrollTo(0,0); } break;
    case "fac-borrar": confirmar(t, async () => { if (await borrar("dm_facciones", id, "Borrada. Los personajes que la usaban conservan sus datos.")){ S.facciones = S.facciones.filter(f => f.id !== id); S.verFac = null; } render(); }); break;
    // partidas
    case "camp-generar": generarCampana(); break;
    case "camp-manual": crearManual(); break;
    case "camp-ver": S.campSel = id; S.spoilers = false; ir("#campanas"); window.scrollTo(0,0); break;
    case "camp-volver": S.campSel = null; render(); break;
    case "camp-borrar": confirmar(t, async () => { if (await borrar("dm_partidas", id, "Partida borrada.")){ S.partidas = S.partidas.filter(c => c.id !== id); S.participantes = S.participantes.filter(x => x.partida_id !== id); S.campSel = null; } render(); }); break;
    case "spoilers": S.spoilers = t.checked; render(); break;
    case "part-unir": unirme(); break;
    case "part-quitar": confirmar(t, () => salirDe(S.campSel, t.dataset.pj), "Sí, sacar"); break;
    case "ir-jugar": S.playId = id; ir("#jugar"); break;
    case "ir-asistente": S.dmId = id; ir("#asistente"); break;
    // jugar
    case "play-start": enviarDM(""); break;
    case "play-send": { const v = $("#play-in").value.trim(); if (!v){ $("#play-st").textContent = "Escribe qué hace tu personaje o tira los dados que pidió el DM."; break; } dmHumano(partida(S.playId)) ? enviarHumano(v) : enviarDM(v); } break;
    case "dm-gancho": { const c = partida(S.playId), box = $("#play-in"); if (!c || !box) break; box.value = c.gancho + (box.value.trim() ? "\n\n" + box.value.trim() : "") + "\n\n¿Qué hacéis?"; S.draft = box.value; box.focus(); } break;
    case "dm-pedir": dmPedirTirada(); break;
    case "dm-tirar": dmTirar(); break;
    case "play-hint": { const box = $("#play-in"); if (!box) break; box.value = t.dataset.t; S.draft = box.value; box.focus(); } break;
    case "play-resumen": { const c = partida(S.playId); if (!c) break; S.busy = true; render();
        try { await resumir(c, true); await q(sb.from("dm_partidas").update({ resumen:c.resumen, resumen_idx:c.resumenIdx }).eq("id", c.id)); toast("Historia resumida. El DM la recordará."); }
        catch (e) { toast(esc(e?.code ? iaMsg(e) : errorTexto(e))); }
        S.busy = false; render(); } break;
    case "play-reset": confirmar(t, async () => { const c = partida(id);
        try { await guardar(sb.from("dm_partidas").update({ log:[], resumen:"", resumen_idx:0, usados:{}, pg_act:{}, combate:{}, escribiendo:null, escribiendo_ts:null }).eq("id", id), "Partida reiniciada.");
          Object.assign(c, { log:[], resumen:"", resumenIdx:0, usados:{}, pgAct:{}, combate:{}, escribiendo:null }); } catch {}
        render(); }, "Sí, reiniciar"); break;
    case "hp": cambiarPG(id, +t.dataset.d); break;
    case "die": tirarBandeja("1d" + t.dataset.n); break;
    case "tray-mode": { S.trayMode = t.dataset.m; const tr = $(".tray"); if (tr) tr.outerHTML = trayHtml(); } break;
    // asistente
    case "dm-send": { const box = $("#dm-in"); const v = box.value; if (!v.trim()) break; box.value = ""; enviarAsesor(v); } break;
    case "dm-chip": enviarAsesor(CHIPS_DM[+t.dataset.i][1]); break;
    case "dm-limpiar": asesorAct(a => { a.logDM = []; }); break;
    case "ini-add": asesorAct(a => a.ini.push({ n:"Enemigo", v:10, pg:"" })); break;
    case "ini-grupo": asesorAct((a, c) => { for (const p of grupoDe(c.id)) if (!a.ini.some(r => r.n === p.nombre)) a.ini.push({ n:p.nombre, v:rnd(20) + derive(p).ini, pg:derive(p).pg }); toast("Grupo añadido con iniciativa tirada (d20 + DES). Puedes cambiarla."); }); break;
    case "ini-orden": asesorAct(a => { a.ini.sort((x,y) => (+y.v) - (+x.v)); a.turno = 0; }); break;
    case "ini-next": asesorAct(a => { a.turno = (a.turno ?? -1) + 1; if (a.turno >= a.ini.length){ a.turno = 0; a.ronda = (a.ronda || 1) + 1; } }); break;
    case "ini-del": asesorAct(a => { a.ini.splice(+t.dataset.i, 1); }); break;
    case "ini-clear": asesorAct(a => { a.ini = []; a.turno = null; a.ronda = 1; }); break;
    case "confirm-yes": t.closest("[data-confirm]")._yes?.(); break;
    case "confirm-no": render(); break;
  }
});

/* ==================== cambios y escritura ==================== */
document.addEventListener("change", async (ev) => {
  const t = ev.target;
  if (t.matches("[data-abil]")){ leerForm(); S.edit.base[t.dataset.abil] = +t.value; render(true); return; }
  if (["f-raza","f-clase","f-nivel","f-faccion"].includes(t.id)){ render(); return; }
  if (t.id === "play-camp"){ S.playId = t.value; render(); return; }
  if (t.id === "play-como"){ S.habla[S.playId] = t.value; render(); return; }
  if (t.id === "dm-camp"){ S.dmId = t.value; render(); return; }
  if (t.id === "cd-modo"){ const c = partida(S.campSel); try { await guardar(sb.from("dm_partidas").update({ modo:t.value }).eq("id", c.id), "Modo cambiado."); c.modo = t.value; } catch {} render(); return; }
  if (t.id === "opt-aprendiz"){ const c = partida(S.playId); try { await guardar(sb.from("dm_partidas").update({ aprendiz:t.checked }).eq("id", c.id)); c.aprendiz = t.checked; } catch {} return; }
  if (t.matches("[data-ini]")){ const c = partida(S.dmId), a = c && S.asesor[c.id]; if (!a) return; const r = a.ini[+t.dataset.ini]; r[t.dataset.f] = t.dataset.f === "n" ? t.value : (t.value === "" ? "" : +t.value); guardarAsesor(c.id); return; }
  if (t.id === "c-mundo" && S.camForm){ S.camForm.usarMundo = t.checked; return; }
  if (t.id?.startsWith("c-") && S.camForm){ S.camForm[t.id.slice(2)] = t.value; }
});
document.addEventListener("input", (ev) => {
  const t = ev.target;
  if (t.id === "play-in") S.draft = t.value;
  if (t.id === "dm-notas"){ const c = partida(S.dmId), a = c && S.asesor[c.id]; if (a){ a.notas = t.value; guardarAsesor(c.id); } }
  if (t.id?.startsWith("c-") && t.id !== "c-mundo" && S.camForm) S.camForm[t.id.slice(2)] = t.value;
});
document.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = ev.target, tipo = f.dataset.form, btn = f.querySelector("[type=submit]");
  if (tipo === "tray"){ const v = $("#tray-in", f).value.trim(); if (v) tirarBandeja(v); return; }
  if (btn) btn.disabled = true;
  try {
    if (tipo === "auth") await enviarAuth();
    if (tipo === "usuario"){
      const usuario = $("#u-nombre").value.trim();
      try { S.perfil = await guardar(sb.from("dm_perfiles").insert({ id:S.me, usuario }).select().single(), "¡Bienvenido a la mesa, " + esc(usuario) + "!"); await cargarTodo(); suscribir(); render(); } catch {}
    }
    if (tipo === "nueva-clave"){
      const { error } = await sb.auth.updateUser({ password:$("#a-clave2").value });
      if (error) toast(esc(error.message)); else { S.recovery = false; toast("Contraseña cambiada."); render(); }
    }
  } finally { if (btn?.isConnected) btn.disabled = false; }
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)){
    if (ev.target.id === "play-in") $('[data-act="play-send"]')?.click();
    if (ev.target.id === "dm-in") $('[data-act="dm-send"]')?.click();
  }
});
window.addEventListener("hashchange", route);

/* ==================== arranque ==================== */
sb.auth.onAuthStateChange((evento, session) => {
  // Fuera del callback: supabase-js no admite llamadas a la API dentro de él
  setTimeout(() => {
    if (evento === "PASSWORD_RECOVERY") S.recovery = true;
    if (evento === "SIGNED_OUT"){ S.perfil = null; S.personajes = []; S.partidas = []; S.facciones = []; S.participantes = []; S.asesor = {}; S.edit = S.editFac = null; }
    alSesion(session);
  }, 0);
});
route();
