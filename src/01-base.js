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

