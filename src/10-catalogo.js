/* ==================== CATÁLOGO ÚNICO: armas, hechizos, armaduras, pociones y equipo ==================== */
const TIPOS_CAT = { arma:"Armas", hechizo:"Hechizos", armadura:"Armaduras", pocion:"Pociones", equipo:"Equipo" };
const TIPO_UNO = { arma:"Arma", hechizo:"Hechizo", armadura:"Armadura", pocion:"Poción", equipo:"Equipo" };
const CAT_ARMADURA = { ligera:"Ligera (+ DES)", media:"Media (+ DES, máx. 2)", pesada:"Pesada (sin DES)", escudo:"Escudo (+ a la CA)" };
const ARMADURAS_SRD = [
  ["Acolchada","ligera",11,5,"Desventaja en Sigilo"], ["De cuero","ligera",11,10,""], ["De cuero tachonado","ligera",12,45,""],
  ["De pieles","media",12,10,""], ["Camisote de mallas","media",13,50,""], ["Cota de escamas","media",14,50,"Desventaja en Sigilo"], ["Coraza","media",14,400,""], ["Media armadura","media",15,750,"Desventaja en Sigilo"],
  ["Cota de anillas","pesada",14,30,"Desventaja en Sigilo"], ["Cota de malla","pesada",16,75,"Fuerza 13, desventaja en Sigilo"], ["Armadura de bandas","pesada",17,200,"Fuerza 15, desventaja en Sigilo"], ["Armadura de placas","pesada",18,1500,"Fuerza 15, desventaja en Sigilo"],
  ["Escudo","escudo",2,10,""]
].map(([nombre, cat, ca, precio, prop]) => ({ id:"srd:" + nombre, srd:true, tipo:"armadura", nombre, cat, ca, bono:0, precio, prop, descripcion:"" }));
const POCIONES_SRD = [
  { nombre:"Poción de curación", cura:"2d4+2", precio:50, descripcion:"Un líquido rojo que cierra heridas." },
  { nombre:"Poción de curación mayor", cura:"4d4+4", precio:150, descripcion:"" },
  { nombre:"Poción de curación superior", cura:"8d4+8", precio:450, descripcion:"" },
  { nombre:"Poción de curación suprema", cura:"10d4+20", precio:1350, descripcion:"" },
  { nombre:"Antídoto", quita:"Envenenado", precio:50, descripcion:"Cura el veneno (quita Envenenado y Veneno)." },
  { nombre:"Sales aromáticas", quita:"Aturdido", precio:25, descripcion:"Despiertan a quien está aturdido o dormido." },
  { nombre:"Poción de invisibilidad", da:"Invisible", rondas:3, precio:180, descripcion:"Te vuelve invisible unos turnos." },
  { nombre:"Aceite de fuego de alquimista", lanza:{ dano:"1d4", estado:"Ardiendo", rondas:2 }, precio:50, descripcion:"Se lanza: prende fuego al objetivo." },
  { nombre:"Poción de resistencia", precio:300, descripcion:"Resistencia a un tipo de daño durante 1 hora." }
].map(p => ({ id:"srd:" + p.nombre, srd:true, tipo:"pocion", ...p }));
const EQUIPO_SRD = [
  ["Mochila",2,""], ["Saco de dormir",1,""], ["Cuerda de cáñamo (15 m)",1,""], ["Antorchas (10)",0.1,"Dan luz 1 hora cada una."], ["Raciones (1 día)",0.5,""], ["Odre",0.2,""],
  ["Kit de sanador",5,"Estabiliza a un compañero a 0 PG sin tirar Medicina (10 usos)."], ["Herramientas de ladrón",25,"Para abrir cerraduras y desactivar trampas."], ["Bolsa de componentes",25,"Para lanzar conjuros con componentes materiales."],
  ["Símbolo sagrado",5,"Foco de clérigos y paladines."], ["Libro de conjuros",50,"El libro de un mago."], ["Linterna sorda",10,""], ["Palanca",2,"Ventaja en Fuerza para forzar cosas."], ["Kit de escalada",25,""], ["Catalejo",1000,""]
].map(([nombre, precio, descripcion]) => ({ id:"srd:" + nombre, srd:true, tipo:"equipo", nombre, precio, descripcion }));

function objetoFromRow(r){ return { ...(r.datos || {}), id:r.id, autor:r.autor, nombre:r.nombre, actualizado:r.actualizado }; }
function objetoToRow(o){ const { id, autor, nombre, actualizado, srd, ...datos } = o; return { nombre, datos }; }
const propiosDe = tipo => (S.objetos || []).filter(o => o.tipo === tipo);
function catalogoTipo(tipo){
  if (tipo === "arma") return catalogoArmas().map(a => ({ tipo:"arma", ...a }));
  if (tipo === "hechizo") return catalogoHechizos().map(h => ({ tipo:"hechizo", ...h }));
  return [...propiosDe(tipo), ...(tipo === "armadura" ? ARMADURAS_SRD : tipo === "pocion" ? POCIONES_SRD : EQUIPO_SRD)];
}
const catalogoInventario = () => ["arma","armadura","pocion","equipo"].flatMap(catalogoTipo);
const itemById = id => catalogoInventario().find(x => x.id === id);
// Lo que va al inventario a partir de algo del catálogo
function objetoDeCatalogo(x, extra={}){
  if (x.tipo === "arma") return objetoDeArma(x, extra);
  if (x.tipo === "armadura") return { id:nuevoId(), nombre:x.nombre, cant:1, tipo:"armadura", armadura:{ cat:x.cat, ca:+x.ca || 0, bono:+x.bono || 0, prop:x.prop || "" }, ...extra };
  if (x.tipo === "pocion") return { id:nuevoId(), nombre:x.nombre, cant:1, tipo:"pocion", cura:x.cura || "", quita:x.quita || "", da:x.da || "", rondas:+x.rondas || 0, lanza:x.lanza || null, nota:x.descripcion || "", ...extra };
  return { id:nuevoId(), nombre:x.nombre, cant:1, tipo:"objeto", nota:x.descripcion || "", ...extra };
}
const optsCatalogo = (sel="") => ["arma","armadura","pocion","equipo"].map(t => `<optgroup label="${TIPOS_CAT[t]}">${catalogoTipo(t).map(x => `<option value="cat:${esc(x.id)}" ${sel === x.id ? "selected" : ""}>${esc(x.nombre)} · ${esc(resumenItem(x))}${x.precio != null ? " · " + po(x.precio) : ""}</option>`).join("")}</optgroup>`).join("");
function resumenItem(x){
  if (x.tipo === "arma") return resumenArma(x) + (x.efecto?.estado ? " → " + efectoTxt2(x.efecto) : "");
  if (x.tipo === "hechizo") return `${NIVEL_H(x.nivel)} · ${efectoTxt(x)}${x.efecto?.estado ? " → " + efectoTxt2(x.efecto) : ""}`;
  if (x.tipo === "armadura") return x.cat === "escudo" ? `+${(+x.ca || 2) + (+x.bono || 0)} CA` : `CA ${+x.ca + (+x.bono || 0)} ${x.cat}`;
  if (x.tipo === "pocion") return x.cura ? `cura ${x.cura}` : x.quita ? `quita ${x.quita.toLowerCase()}` : x.da ? `${x.da.toLowerCase()} ${x.rondas || 1}t` : x.lanza ? `se lanza: ${x.lanza.dano || ""} ${x.lanza.estado ? "→ " + x.lanza.estado.toLowerCase() : ""}` : "especial";
  return x.descripcion ? x.descripcion.slice(0, 50) : "";
}
// CA con la armadura equipada en el inventario (si lleva alguna); si no, null y vale la de la ficha
function caArmadura(pj, des, caSin){
  const objs = Array.isArray(pj.inventario?.objetos) ? pj.inventario.objetos : [];
  const arm = objs.find(o => o.tipo === "armadura" && o.equipada && o.armadura?.cat !== "escudo"), esc_ = objs.find(o => o.tipo === "armadura" && o.equipada && o.armadura?.cat === "escudo");
  if (!arm && !esc_) return null;
  let ca = caSin, txt = "sin armadura";
  if (arm){ const a = arm.armadura, b = (+a.ca || 10) + (+a.bono || 0); ca = a.cat === "ligera" ? b + des : a.cat === "media" ? b + Math.min(2, des) : b; txt = arm.nombre; }
  if (esc_){ ca += (+esc_.armadura.ca || 2) + (+esc_.armadura.bono || 0); txt += " + " + esc_.nombre; }
  return { ca, txt:"con " + txt };
}

/* ---------- efecto (estado que causa un arma o un hechizo) ---------- */
function efectoCampos(ef, pre, conSv=true){
  ef = ef || {};
  return `<div class="row efecto-campos"><label class="field"><span>Estado que causa</span><select id="${pre}-est"><option value="">Ninguno</option>${Object.keys(ESTADOS).map(n => `<option ${n === ef.estado ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    <label class="field" style="max-width:90px"><span>Turnos</span><input type="number" id="${pre}-rondas" min="1" max="10" value="${+ef.rondas || 1}" class="mono"></label>
    <label class="field" style="max-width:110px"><span>Daño por turno</span><input type="text" id="${pre}-edano" class="mono" value="${esc(ef.dano || "")}" placeholder="el del estado"></label>
    ${conSv ? `<label class="field" style="max-width:150px"><span>Salvación para evitarlo</span><select id="${pre}-esv"><option value="">Sin salvación</option>${AB.map(k => `<option value="${k}" ${k === ef.sv ? "selected" : ""}>${AB_N[k]}</option>`).join("")}</select></label>
    <label class="field" style="max-width:80px"><span>CD</span><input type="number" id="${pre}-ecd" min="5" max="25" value="${+ef.cd || 12}" class="mono"></label>` : ""}</div>
    <p class="small muted">Sangrando, Ardiendo, Veneno y Congelado quitan PG cada turno; Paralizado, Aturdido y Dormido hacen perder el turno; Derribado, Apresado y Cegado dan ventaja a quien ataca.</p>`;
}
function leerEfecto(pre){
  const n = $(`#${pre}-est`)?.value; if (!n) return null;
  const ef = { estado:n, rondas:Math.max(1, Math.min(10, +$(`#${pre}-rondas`).value || 1)) }, d = $(`#${pre}-edano`)?.value.trim(), sv = $(`#${pre}-esv`)?.value;
  if (d){ try { partesNot(d); ef.dano = d; } catch {} }
  if (sv){ ef.sv = sv; ef.cd = Math.max(5, Math.min(25, +$(`#${pre}-ecd`).value || 12)); }
  return ef;
}

/* ---------- vista del catálogo ---------- */
function vCatalogo(){
  if (S.editArma) return vArmaEditor();
  if (S.editHechizo) return vHechizoEditor();
  if (S.editObjeto) return vObjetoEditor();
  const tipo = S.catTipo || "", busca = sinTildes(S.catBusca || ""), f = S.hzFiltro || "";
  const tipos = tipo ? [tipo] : Object.keys(TIPOS_CAT);
  const filtra = x => (!busca || sinTildes(x.nombre + " " + (x.descripcion || "") + " " + (x.prop || "")).includes(busca)) && (x.tipo !== "hechizo" || !f || !x.clases?.length || x.clases.includes(f));
  const accion = x => x.srd ? (x.tipo === "arma" ? `<button class="btn sm ghost" data-act="arma-mejorar" data-id="${esc(x.id)}">Mejorar</button>` : `<button class="btn sm ghost" data-act="cat-variante" data-t="${x.tipo}" data-id="${esc(x.id)}">Variante</button>`)
    : x.autor === S.me ? `<button class="btn sm" data-act="cat-editar" data-t="${x.tipo}" data-id="${esc(x.id)}">Editar</button>` : ownerChip(x.autor);
  const fila = x => `<tr><td><b>${esc(x.nombre)}</b>${x.srd ? "" : ` <span class="chip acc">de la mesa</span>`}${x.descripcion ? `<div class="small muted">${esc(x.descripcion.slice(0, 120))}</div>` : ""}${x.tipo === "hechizo" ? `<div class="small muted">${esc((x.clases?.length ? x.clases : ["Cualquier clase que lance conjuros"]).join(", "))}</div>` : ""}</td>
    <td class="small">${TIPO_UNO[x.tipo]}</td><td class="small mono">${esc(resumenItem(x))}</td><td class="small">${x.tipo === "hechizo" ? esc(comoTxt(x)) : x.tipo === "arma" ? esc(CAR_ARMA[x.car]?.split(" (")[0].split(":")[0] || "") : esc(x.prop || "")}</td><td class="mono small">${x.precio != null && x.tipo !== "hechizo" ? po(x.precio) : ""}</td><td>${accion(x)}</td></tr>`;
  const secciones = tipos.map(t => { const lista = catalogoTipo(t).filter(filtra).sort((a, b) => (!!a.srd - !!b.srd) || (+a.nivel || 0) - (+b.nivel || 0) || a.nombre.localeCompare(b.nombre));
    return lista.length ? `<div class="panel"><div class="panel-h"><h2>${TIPOS_CAT[t]} <span class="small muted">(${lista.length})</span></h2><button class="btn sm" data-act="cat-nuevo" data-t="${t}">Crear ${TIPO_UNO[t].toLowerCase()}</button></div>
      <div class="tblwrap"><table class="armas"><thead><tr><th>Nombre</th><th>Tipo</th><th>Efecto</th><th>Detalles</th><th>Precio</th><th></th></tr></thead><tbody>${lista.map(fila).join("")}</tbody></table></div></div>` : ""; }).join("");
  return `<section class="view">
    <div class="panel-h"><div style="display:grid;gap:8px"><h1>Catálogo</h1><p class="lede">Todo lo que hay en el mundo de la mesa, en un solo sitio: armas, hechizos, armaduras, pociones y equipo. Lo del reglamento viene incluido y cualquiera puede crear más; solo su autor lo edita.</p></div>
      <label class="field" style="max-width:220px"><span>Crear</span><select id="cat-crear"><option value="">Elige qué…</option>${Object.entries(TIPO_UNO).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label></div>
    <div class="row cat-filtros">
      <div class="seg" role="group" aria-label="Tipo"><button data-act="cat-tipo" data-t="" aria-pressed="${!tipo}">Todo</button>${Object.entries(TIPOS_CAT).map(([k, v]) => `<button data-act="cat-tipo" data-t="${k}" aria-pressed="${tipo === k}">${v}</button>`).join("")}</div>
      <label class="field" style="max-width:240px"><span>Buscar</span><input type="search" id="cat-busca" value="${esc(S.catBusca || "")}" placeholder="Fuego, espada, curación…"></label>
      ${!tipo || tipo === "hechizo" ? `<label class="field" style="max-width:200px"><span>Hechizos de</span><select id="hz-filtro"><option value="">Todas las clases</option>${CLASES_LANZADORAS.map(k => `<option ${k === f ? "selected" : ""}>${k}</option>`).join("")}</select></label>` : ""}
    </div>
    ${secciones || `<div class="empty"><p>No hay nada que coincida con la búsqueda.</p></div>`}
    <p class="small muted">Al atacar con un arma se suma la característica y la competencia, más su bonificación. Los hechizos usan la característica mágica de la clase. La armadura equipada en el inventario fija la CA del personaje.</p>
  </section>`;
}
function nuevoObjeto(tipo, base){
  const b = base ? clone(base) : {};
  delete b.id; delete b.srd; delete b.autor;
  const def = tipo === "armadura" ? { cat:"media", ca:14, bono:0, precio:50, prop:"" } : tipo === "pocion" ? { cura:"2d4+2", quita:"", da:"", rondas:1, precio:50 } : { precio:1 };
  return { id:null, autor:S.me, tipo, nombre:base ? b.nombre + (tipo === "armadura" ? " +1" : " (variante)") : "", descripcion:"", ...def, ...b, ...(base && tipo === "armadura" ? { bono:(+b.bono || 0) + 1, precio:Math.max(100, (+b.precio || 0) * 10) } : {}) };
}
function vObjetoEditor(){
  const o = S.editObjeto, t = o.tipo;
  return `<section class="view">
    <div class="panel-h"><h1>${o.id ? "Editar" : "Nueva"} ${TIPO_UNO[t].toLowerCase()}</h1><button class="btn ghost" data-act="obj-cancelar">Volver</button></div>
    <div class="panel"><div class="grid2">
      <label class="field"><span>Nombre</span><input type="text" id="ob-nombre" maxlength="60" value="${esc(o.nombre)}"></label>
      <label class="field"><span>Precio (po)</span><input type="number" id="ob-precio" min="0" max="1000000" step="0.01" value="${+o.precio || 0}" class="mono"></label>
      ${t === "armadura" ? `<label class="field"><span>Tipo</span><select id="ob-cat">${Object.entries(CAT_ARMADURA).map(([k, v]) => `<option value="${k}" ${k === o.cat ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="field"><span>${o.cat === "escudo" ? "Suma a la CA" : "CA base"}</span><input type="number" id="ob-ca" min="1" max="25" value="${+o.ca || 0}" class="mono"></label>
        <label class="field"><span>Bonificación mágica</span><input type="number" id="ob-bono" min="0" max="5" value="${+o.bono || 0}" class="mono"></label>
        <label class="field"><span>Propiedades</span><input type="text" id="ob-prop" maxlength="120" value="${esc(o.prop || "")}" placeholder="Desventaja en Sigilo…"></label>` : ""}
      ${t === "pocion" ? `<label class="field"><span>Cura (dados)</span><input type="text" id="ob-cura" class="mono" value="${esc(o.cura || "")}" placeholder="2d4+2 o vacío"></label>
        <label class="field"><span>Quita el estado</span><select id="ob-quita"><option value="">Ninguno</option>${Object.keys(ESTADOS).map(n => `<option ${n === o.quita ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="field"><span>Da el estado</span><select id="ob-da"><option value="">Ninguno</option>${Object.keys(ESTADOS).map(n => `<option ${n === o.da ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="field"><span>Durante (turnos)</span><input type="number" id="ob-rondas" min="1" max="10" value="${+o.rondas || 1}" class="mono"></label>` : ""}
    </div>
    <label class="field"><span>Descripción</span><textarea id="ob-descripcion" maxlength="600">${esc(o.descripcion || "")}</textarea></label>
    ${t === "armadura" ? `<p class="small muted">Ligera: CA base + DES. Media: CA base + DES (máximo +2). Pesada: CA base. Escudo: suma a la CA. Al equiparla en el inventario, la CA del personaje se calcula sola.</p>` : ""}
    <div class="row"><button class="btn primary" data-act="obj-guardar" ${S.busy ? "disabled" : ""}>Guardar</button>${o.id ? `<span data-confirm="${o.id}"><button class="btn ghost" data-act="obj-borrar" data-id="${o.id}">Borrar</button></span>` : ""}</div></div>
  </section>`;
}
function leerObjeto(){
  const o = S.editObjeto; if (!o || !$("#ob-nombre")) return;
  o.nombre = $("#ob-nombre").value.trim(); o.precio = +$("#ob-precio").value || 0; o.descripcion = $("#ob-descripcion").value.trim();
  if (o.tipo === "armadura"){ o.cat = $("#ob-cat").value; o.ca = +$("#ob-ca").value || 0; o.bono = +$("#ob-bono").value || 0; o.prop = $("#ob-prop").value.trim(); }
  if (o.tipo === "pocion"){ o.cura = $("#ob-cura").value.trim(); o.quita = $("#ob-quita").value; o.da = $("#ob-da").value; o.rondas = +$("#ob-rondas").value || 1; }
}
async function guardarObjeto(){
  leerObjeto(); const o = S.editObjeto;
  if (o.nombre.length < 2){ toast("Ponle nombre."); $("#ob-nombre")?.focus(); return; }
  if (o.cura) try { partesNot(o.cura); } catch (e) { toast(esc(e.message)); return; }
  S.busy = true; render(true);
  try {
    const row = objetoToRow(o), r = o.id ? await guardar(sb.from("dm_objetos").update(row).eq("id", o.id).select().single(), "Guardado.")
                                         : await guardar(sb.from("dm_objetos").insert(row).select().single(), "Creado.");
    const obj = objetoFromRow(r); S.objetos = [obj, ...(S.objetos || []).filter(x => x.id !== obj.id)]; S.editObjeto = null;
  } catch {}
  S.busy = false; render(true);
}

document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-act^='cat-'],[data-act^='obj-']"); if (!t) return;
  const tipo = t.dataset.t, id = t.dataset.id;
  const abrir = () => { render(); window.scrollTo(0, 0); };
  switch (t.dataset.act){
    case "cat-tipo": S.catTipo = tipo; render(); break;
    case "cat-nuevo": if (tipo === "arma"){ S.editArma = nuevaArma(); } else if (tipo === "hechizo"){ S.editHechizo = nuevoHechizo(); } else S.editObjeto = nuevoObjeto(tipo); abrir(); break;
    case "cat-variante": { const b = catalogoTipo(tipo).find(x => x.id === id); if (!b) break; if (tipo === "hechizo") S.editHechizo = nuevoHechizo(b); else S.editObjeto = nuevoObjeto(tipo, b); abrir(); } break;
    case "cat-editar": { const x = catalogoTipo(tipo).find(y => y.id === id); if (!x) break;
        if (tipo === "arma") S.editArma = clone(armaById(id)); else if (tipo === "hechizo") S.editHechizo = { clases:[], ...clone(hechizoById(id)) }; else S.editObjeto = clone(x); abrir(); } break;
    case "obj-cancelar": S.editObjeto = null; render(true); break;
    case "obj-guardar": guardarObjeto(); break;
    case "obj-borrar": confirmar(t, async () => { if (await borrar("dm_objetos", id, "Borrado. Quien ya lo tenía lo conserva.")){ S.objetos = (S.objetos || []).filter(o => o.id !== id); S.editObjeto = null; } render(true); }); break;
  }
});
document.addEventListener("change", (ev) => {
  const t = ev.target;
  if (t.id === "cat-crear" && t.value){ const v = t.value; if (v === "arma") S.editArma = nuevaArma(); else if (v === "hechizo") S.editHechizo = nuevoHechizo(); else S.editObjeto = nuevoObjeto(v); render(); window.scrollTo(0, 0); }
  if (t.id === "ob-cat"){ leerObjeto(); render(true); }
});
document.addEventListener("input", (ev) => {
  if (ev.target.id === "cat-busca"){ S.catBusca = ev.target.value; clearTimeout(S._catT); S._catT = setTimeout(() => { const pos = ev.target.selectionStart; render(); const el = $("#cat-busca"); if (el){ el.focus(); el.setSelectionRange(pos, pos); } }, 250); }
});
