/* ==================== ARMERÍA, INVENTARIO Y RECOMPENSAS ==================== */
// Armas del SRD (car: FUE cuerpo a cuerpo, DES a distancia, SUT sutil = la mejor de FUE y DES, MAG foco de conjuros). Precio en piezas de oro.
const ARMAS_SRD = [
  ["Bastón","1d6","contundente","FUE",0.2,"Versátil (1d8)"], ["Clava","1d4","contundente","FUE",0.1,"Ligera"], ["Daga","1d4","perforante","SUT",2,"Sutil, ligera, arrojadiza"],
  ["Hacha de mano","1d6","cortante","FUE",5,"Ligera, arrojadiza"], ["Jabalina","1d6","perforante","FUE",0.5,"Arrojadiza"], ["Lanza","1d6","perforante","FUE",1,"Arrojadiza, versátil (1d8)"],
  ["Maza","1d6","contundente","FUE",5,""], ["Hoz","1d4","cortante","FUE",1,"Ligera"], ["Arco corto","1d6","perforante","DES",25,"A distancia, a dos manos"],
  ["Ballesta ligera","1d8","perforante","DES",25,"A distancia, recarga"], ["Honda","1d4","contundente","DES",0.1,"A distancia"], ["Dardo","1d4","perforante","SUT",0.05,"Sutil, arrojadiza"],
  ["Espada corta","1d6","perforante","SUT",10,"Sutil, ligera"], ["Cimitarra","1d6","cortante","SUT",25,"Sutil, ligera"], ["Estoque","1d8","perforante","SUT",25,"Sutil"],
  ["Látigo","1d4","cortante","SUT",2,"Sutil, alcance"], ["Espada larga","1d8","cortante","FUE",15,"Versátil (1d10)"], ["Hacha de guerra","1d8","cortante","FUE",10,"Versátil (1d10)"],
  ["Martillo de guerra","1d8","contundente","FUE",15,"Versátil (1d10)"], ["Mangual","1d8","contundente","FUE",10,""], ["Lucero del alba","1d8","perforante","FUE",15,""],
  ["Tridente","1d6","perforante","FUE",5,"Arrojadiza, versátil (1d8)"], ["Alabarda","1d10","cortante","FUE",20,"Pesada, alcance, a dos manos"], ["Gran hacha","1d12","cortante","FUE",30,"Pesada, a dos manos"],
  ["Espadón","2d6","cortante","FUE",50,"Pesada, a dos manos"], ["Mazo","2d6","contundente","FUE",10,"Pesada, a dos manos"], ["Arco largo","1d8","perforante","DES",50,"A distancia, pesada, a dos manos"],
  ["Ballesta pesada","1d10","perforante","DES",50,"A distancia, pesada, recarga"]
].map(([nombre, dado, tipoDano, car, precio, prop]) => ({ id:"srd:" + nombre, srd:true, nombre, dado, tipoDano, car, precio, prop, bonoAt:0, bonoDano:0 }));
const CAR_ARMA = { FUE:"Fuerza (cuerpo a cuerpo)", DES:"Destreza (a distancia)", SUT:"Sutil: la mejor de Fuerza o Destreza", MAG:"Conjuro o foco mágico" };
const TIPOS_DANO = ["cortante","perforante","contundente","fuego","frío","rayo","ácido","veneno","necrótico","radiante","fuerza","psíquico","trueno"];
const TIPOS_OBJ = { arma:"Arma", pocion:"Poción", objeto:"Objeto" };
const POCION_CURA = { nombre:"Poción de curación", tipo:"pocion", cura:"2d4+2", precio:50 };
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function armaFromRow(r){ return { ...(r.datos || {}), id:r.id, autor:r.autor, nombre:r.nombre, actualizado:r.actualizado }; }
function armaToRow(a){ const { id, autor, nombre, actualizado, srd, ...datos } = a; return { nombre, datos }; }
const catalogoArmas = () => [...(S.armas || []), ...ARMAS_SRD];
const armaById = id => catalogoArmas().find(a => a.id === id);
const po = n => { n = +n || 0; return n >= 1 || n === 0 ? `${+n.toFixed(2)} po` : n >= 0.1 ? `${Math.round(n * 10)} pp` : `${Math.round(n * 100)} pc`; };
const bonoTxt = a => [a.bonoAt ? `${sgn(+a.bonoAt)} al ataque` : "", a.bonoDano ? `${sgn(+a.bonoDano)} al daño` : ""].filter(Boolean).join(", ");
const resumenArma = a => `${a.dado}${a.bonoDano ? sgn(+a.bonoDano) : ""} ${a.tipoDano || ""}${a.bonoAt ? ` · ${sgn(+a.bonoAt)} al ataque` : ""}`;

/* ---------- inventario del personaje (datos.inventario) ---------- */
function invDe(p){ const i = p?.inventario || {}; return { oro:Math.max(0, +i.oro || 0), objetos:Array.isArray(i.objetos) ? i.objetos : [] }; }
// Copia del arma que va al inventario: si luego se mejora en la armería, el personaje conserva la suya
const objetoDeArma = (a, extra={}) => ({ id:nuevoId(), nombre:a.nombre, cant:1, tipo:"arma", arma:{ armaId:a.id, dado:a.dado, tipoDano:a.tipoDano, car:a.car, bonoAt:+a.bonoAt || 0, bonoDano:+a.bonoDano || 0, prop:a.prop || "" }, ...extra });
// Armas escritas en el texto del equipo («estoque (1d8)»): sirven hasta que el personaje tenga armas en el inventario
function armasDelEquipo(p){
  const out = [], re = /([A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]+?)\s*\((\d+d\d+)\)/g; let m;
  while ((m = re.exec(String(p.equipo || "")))){
    const nombre = m[1].replace(/^\s*(y|con|un|una|\d+)\s+/i, "").trim(); if (!nombre) continue;
    const base = ARMAS_SRD.find(a => sinTildes(nombre).includes(sinTildes(a.nombre)));
    out.push({ id:"eq" + out.length, nombre:nombre[0].toUpperCase() + nombre.slice(1), tipo:"arma", equipada:true, delEquipo:true, arma:{ dado:m[2], tipoDano:base?.tipoDano || "", car:base?.car || "FUE", bonoAt:0, bonoDano:0 } });
  }
  return out;
}
function armasEquipadas(p){
  const inv = invDe(p).objetos.filter(o => o.tipo === "arma" && o.arma);
  return inv.length ? inv.filter(o => o.equipada) : armasDelEquipo(p);
}
const CLASES_MAGIA = ["Mago","Hechicero","Brujo","Clérigo","Druida","Bardo"];
// Opciones del formulario de ataque: armas equipadas con su característica, competencia y bonificaciones, y conjuro si lanza conjuros
function ataquesDe(p){
  const d = derive(p), mF = modOf(d.sc.FUE), mD = modOf(d.sc.DES), out = [];
  for (const o of armasEquipadas(p)){ const w = o.arma, car = w.car === "SUT" ? (mD > mF ? "DES" : "FUE") : w.car === "MAG" ? conMagia(p) : (w.car || "FUE");
    const mod = modOf(d.sc[car]), mDano = (w.car === "MAG" ? 0 : mod) + (+w.bonoDano || 0);
    out.push({ v:"w:" + o.id, nombre:o.nombre, corto:o.nombre, bono:mod + d.prof + (+w.bonoAt || 0), dado:w.dado || "1d6", mDano, car, tipoDano:w.tipoDano || "" }); }
  if (CLASES_MAGIA.includes(p.clase)){ const car = conMagia(p); out.push({ v:"MAG", nombre:"Conjuro de ataque", corto:"conjuro", bono:modOf(d.sc[car]) + d.prof, dado:"1d10", mDano:0, car, libre:true }); }
  if (!out.length || !out.some(x => x.v.startsWith("w:"))){
    out.push({ v:"FUE", nombre:"Otra arma (Fuerza)", corto:"arma, Fuerza", bono:mF + d.prof, dado:"1d6", mDano:mF, car:"FUE", libre:true });
    out.push({ v:"DES", nombre:"Otra arma (Destreza)", corto:"arma, Destreza", bono:mD + d.prof, dado:"1d6", mDano:mD, car:"DES", libre:true });
  }
  return out;
}
// Guarda el inventario leyendo antes la ficha fresca, para no pisar lo que el DM acaba de dar
async function cambiarInv(p, fn, ok){
  if (!p || p.dueno !== S.me){ toast("Solo el dueño del personaje puede cambiar su inventario."); return false; }
  S.busy = true;
  try {
    const f = await q(sb.from("dm_personajes").select("datos").eq("id", p.id).single());
    const inv = invDe({ inventario:f.datos?.inventario }); if (fn(inv) === false){ S.busy = false; return false; }
    inv.oro = Math.max(0, Math.round(inv.oro * 100) / 100); inv.objetos = inv.objetos.filter(o => (+o.cant || 0) > 0);
    await guardar(sb.from("dm_personajes").update({ datos:{ ...(f.datos || {}), inventario:inv } }).eq("id", p.id), ok);
    p.inventario = inv;
  } catch {}
  S.busy = false; render(); return true;
}
function invHtml(p, c){
  const inv = invDe(p), mio = p.dueno === S.me, legado = !inv.objetos.some(o => o.tipo === "arma") ? armasDelEquipo(p) : [];
  const fila = o => { const w = o.arma, tip = TIPOS_OBJ[o.tipo] || "Objeto";
    return `<div class="inv-row ${o.tipo}"><div><b>${esc(o.nombre)}</b>${(+o.cant || 1) > 1 ? ` <span class="mono">× ${o.cant}</span>` : ""} <span class="chip">${tip}</span>
        ${w ? `<div class="small muted mono">${esc(resumenArma(w))}${w.prop ? ` · ${esc(w.prop)}` : ""}</div>` : ""}${o.cura ? `<div class="small muted">Cura <span class="mono">${esc(o.cura)}</span> PG</div>` : ""}${o.nota ? `<div class="small muted">${esc(o.nota)}</div>` : ""}</div>
      ${mio ? `<div class="row">${w ? `<label class="switch small"><input type="checkbox" data-inv-eq="${esc(o.id)}" data-pj="${p.id}" ${o.equipada ? "checked" : ""}> Equipada</label>` : ""}
        ${o.tipo === "pocion" || o.cura ? `<button class="btn sm" data-act="inv-usar" data-pj="${p.id}" data-o="${esc(o.id)}" ${S.busy ? "disabled" : ""}>Usar</button>` : ""}
        <span data-confirm="inv-${esc(o.id)}"><button class="btn sm ghost" data-act="inv-quitar" data-pj="${p.id}" data-o="${esc(o.id)}" aria-label="Quitar ${esc(o.nombre)}">${(+o.cant || 1) > 1 ? "−1" : "Quitar"}</button></span></div>` : w && o.equipada ? `<span class="chip acc">Equipada</span>` : ""}</div>`; };
  const pocion = c && inv.objetos.find(o => o.cura);
  return `<div class="inv">
    <div class="inv-oro"><span class="oro mono">${po(inv.oro)}</span>${mio ? `<span class="row"><input type="number" id="inv-oro-${p.id}" class="mono" min="0" step="1" placeholder="po" aria-label="Piezas de oro"><button class="btn sm" data-act="inv-oro" data-pj="${p.id}" data-d="1">Añadir</button><button class="btn sm ghost" data-act="inv-oro" data-pj="${p.id}" data-d="-1">Gastar</button></span>` : ""}</div>
    ${inv.objetos.length ? inv.objetos.map(fila).join("") : `<p class="small muted">${mio ? "Aún no lleva nada guardado. Añade lo que encuentres abajo." : "No lleva nada guardado."}</p>`}
    ${legado.length ? `<p class="small muted">Armas de su equipo: ${legado.map(o => `${esc(o.nombre)} (${o.arma.dado})`).join(", ")}. ${mio ? `<button class="btn sm ghost" data-act="inv-importar" data-pj="${p.id}">Pasarlas al inventario</button>` : ""}</p>` : ""}
    ${mio && c?.dadosFisicos && pocion ? `<label class="field" style="max-width:150px"><span>Dados de la poción</span>${inputDado(`id="inv-cura-${p.id}"`, "suma de los dados")}</label>` : ""}
    ${mio ? `<details class="inv-add"><summary class="small"><b>Guardar algo nuevo</b></summary><div class="row">
      <label class="field"><span>Qué es</span><select id="inv-tipo-${p.id}"><option value="objeto">Objeto</option><option value="pocion">Poción de curación (2d4+2)</option><option value="pocion-otra">Otra poción</option>${catalogoArmas().map(a => `<option value="arma:${esc(a.id)}">Arma: ${esc(a.nombre)} (${esc(resumenArma(a))})</option>`).join("")}</select></label>
      <label class="field"><span>Nombre</span><input type="text" id="inv-nom-${p.id}" maxlength="80" placeholder="Cuerda de 15 m, llave oxidada…"></label>
      <label class="field" style="max-width:80px"><span>Cantidad</span><input type="number" id="inv-cant-${p.id}" min="1" max="999" value="1" class="mono"></label>
      <button class="btn sm" data-act="inv-anadir" data-pj="${p.id}">Guardar</button></div>
      <p class="small muted">En las armas y la poción de curación no hace falta nombre. Las armas nuevas se crean en la <a href="#armeria">Armería</a>.</p></details>
    <details class="inv-add"><summary class="small"><b>Comprar en la armería</b></summary><div class="row">
      <label class="field"><span>Arma</span><select id="inv-compra-${p.id}">${catalogoArmas().map(a => `<option value="${esc(a.id)}">${esc(a.nombre)} · ${po(a.precio)}</option>`).join("")}<option value="pocion">Poción de curación · ${po(POCION_CURA.precio)}</option></select></label>
      <button class="btn sm" data-act="inv-comprar" data-pj="${p.id}">Comprar</button></div><p class="small muted">Se descuenta el precio de tu oro.</p></details>` : ""}
  </div>`;
}
async function usarObjeto(p, oid, c){
  const o = invDe(p).objetos.find(x => x.id === oid); if (!o) return;
  let cura = null;
  if (o.cura && c){ try { cura = tirarCon(c, o.cura, `${o.nombre} de ${p.nombre}`, "normal", $(`#inv-cura-${p.id}`)?.value); } catch (e) { toast(esc(e.message)); $(`#inv-cura-${p.id}`)?.focus(); return; } }
  const hecho = await cambiarInv(p, inv => { const x = inv.objetos.find(y => y.id === oid); if (!x) return false; x.cant = (+x.cant || 1) - 1; });
  if (!hecho) return;
  if (cura && c){ cambiarPG(p.id, Math.max(0, cura.total));
    try { await publicar(c, p.id, `${p.nombre} usa ${o.nombre}: ${lineaTirada(cura)} PG recuperados.`); } catch {} toast(`${esc(p.nombre)} recupera ${cura.total} PG.`); }
  else toast(`${esc(p.nombre)} usa ${esc(o.nombre)}.`);
  render();
}
function anadirObjetoForm(p){
  const tipo = $(`#inv-tipo-${p.id}`).value, nom = $(`#inv-nom-${p.id}`).value.trim(), cant = Math.max(1, Math.min(999, Math.round(+$(`#inv-cant-${p.id}`).value || 1)));
  let obj;
  if (tipo.startsWith("arma:")){ const a = armaById(tipo.slice(5)); if (!a) return; obj = objetoDeArma(a, { cant, nombre:nom || a.nombre, equipada:!armasEquipadas(p).some(x => !x.delEquipo) }); }
  else if (tipo === "pocion") obj = { id:nuevoId(), nombre:nom || POCION_CURA.nombre, tipo:"pocion", cura:POCION_CURA.cura, cant };
  else { if (!nom){ toast("Escribe qué es."); $(`#inv-nom-${p.id}`)?.focus(); return; } obj = { id:nuevoId(), nombre:nom, tipo:tipo === "pocion-otra" ? "pocion" : "objeto", cant }; }
  cambiarInv(p, inv => { const igual = obj.tipo !== "arma" && inv.objetos.find(o => o.nombre === obj.nombre && o.tipo === obj.tipo && (o.cura || "") === (obj.cura || ""));
    if (igual) igual.cant = (+igual.cant || 1) + cant; else inv.objetos.push(obj); }, `${esc(obj.nombre)} guardado en el inventario.`);
}
function comprarForm(p){
  const v = $(`#inv-compra-${p.id}`).value, a = v === "pocion" ? null : armaById(v), precio = a ? +a.precio || 0 : POCION_CURA.precio;
  if (invDe(p).oro < precio){ toast(`No te llega: cuesta ${po(precio)} y tienes ${po(invDe(p).oro)}.`); return; }
  cambiarInv(p, inv => { if (inv.oro < precio) return false; inv.oro -= precio;
    if (a) inv.objetos.push(objetoDeArma(a, { equipada:!inv.objetos.some(o => o.tipo === "arma" && o.equipada) })); else { const x = inv.objetos.find(o => o.nombre === POCION_CURA.nombre && o.cura); if (x) x.cant = (+x.cant || 1) + 1; else inv.objetos.push({ id:nuevoId(), ...POCION_CURA, cant:1 }); } },
    `Comprado: ${esc(a?.nombre || POCION_CURA.nombre)} por ${po(precio)}.`);
}

const ataqueHint = op => `Ataque <b class="mono">1d20${sgn(op.bono) || "+0"}</b> (${esc(AB_N[op.car] || op.car)} + competencia${op.v.startsWith("w:") ? " + arma" : ""}) · daño <b class="mono">${esc(op.dado)}${sgn(op.mDano)}</b>${op.tipoDano ? " " + esc(op.tipoDano) : ""}`;

/* ---------- Armería (vista) ---------- */
function nuevaArma(base){ const b = base || ARMAS_SRD.find(a => a.nombre === "Espada larga");
  return { id:null, autor:S.me, nombre:base ? b.nombre + " +1" : "", dado:b.dado, tipoDano:b.tipoDano, car:b.car, bonoAt:base ? 1 : 0, bonoDano:base ? 1 : 0, precio:base ? Math.max(100, (+b.precio || 0) * 10) : 10, prop:b.prop || "", descripcion:"" }; }
function vArmeria(){
  if (S.editArma) return vArmaEditor();
  const propias = S.armas || [];
  const fila = (a, srd) => `<tr><td><b>${esc(a.nombre)}</b>${a.descripcion ? `<div class="small muted">${esc(a.descripcion.slice(0, 120))}</div>` : ""}</td><td class="mono">${esc(a.dado)}${a.bonoDano ? sgn(+a.bonoDano) : ""}</td><td>${esc(a.tipoDano || "")}</td><td class="mono">${sgn(+a.bonoAt) || "—"}</td><td class="small">${esc(CAR_ARMA[a.car]?.split(" (")[0].split(":")[0] || a.car)}</td><td class="mono">${po(a.precio)}</td>
    <td>${srd ? `<button class="btn sm ghost" data-act="arma-mejorar" data-id="${esc(a.id)}">Mejorar</button>` : a.autor === S.me ? `<button class="btn sm" data-act="arma-editar" data-id="${a.id}">Editar</button>` : ownerChip(a.autor)}</td></tr>`;
  const cab = `<thead><tr><th>Arma</th><th>Daño</th><th>Tipo</th><th>Ataque</th><th>Usa</th><th>Precio</th><th></th></tr></thead>`;
  return `<section class="view">
    <div class="panel-h"><div style="display:grid;gap:8px"><h1>Armería</h1><p class="lede">Las armas de la mesa: cada una con su dado de daño y sus bonificaciones. El DM puede darlas como recompensa y los jugadores comprarlas con su oro desde el inventario.</p></div>
    <button class="btn primary" data-act="arma-nueva">Crear arma</button></div>
    <div class="panel"><h2>Creadas por la mesa</h2>
      ${propias.length ? `<div class="tblwrap"><table class="armas">${cab}<tbody>${propias.map(a => fila(a, false)).join("")}</tbody></table></div>` : `<p class="small muted">Todavía no hay armas propias. Crea una, o pulsa «Mejorar» en un arma básica para hacer su versión +1.</p>`}</div>
    <div class="panel"><details ${propias.length ? "" : "open"}><summary><b>Armas básicas del reglamento (${ARMAS_SRD.length})</b></summary><div class="tblwrap"><table class="armas">${cab}<tbody>${ARMAS_SRD.map(a => fila(a, true)).join("")}</tbody></table></div></details>
      <p class="small muted">Al atacar, la app suma el modificador de la característica (Fuerza, Destreza o la mejor de las dos si es sutil) y tu competencia, más la bonificación del arma. Al daño se suma el mismo modificador y la bonificación de daño.</p></div>
  </section>`;
}
function vArmaEditor(){
  const a = S.editArma;
  return `<section class="view">
    <div class="panel-h"><h1>${a.id ? "Editar arma" : "Nueva arma"}</h1><button class="btn ghost" data-act="arma-cancelar">Volver</button></div>
    <div class="panel"><div class="grid2">
      <label class="field"><span>Nombre</span><input type="text" id="ar-nombre" maxlength="60" value="${esc(a.nombre)}" placeholder="Espada larga +1, Hacha rúnica…"></label>
      <label class="field"><span>Dado de daño</span><input type="text" id="ar-dado" class="mono" value="${esc(a.dado)}" placeholder="1d8"></label>
      <label class="field"><span>Tipo de daño</span><select id="ar-tipoDano">${TIPOS_DANO.map(t => `<option ${t === a.tipoDano ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label class="field"><span>Se usa con</span><select id="ar-car">${Object.entries(CAR_ARMA).map(([k, t]) => `<option value="${k}" ${k === a.car ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label class="field"><span>Bonificación al ataque</span><input type="number" id="ar-bonoAt" min="-5" max="10" value="${+a.bonoAt || 0}" class="mono"></label>
      <label class="field"><span>Bonificación al daño</span><input type="number" id="ar-bonoDano" min="-5" max="20" value="${+a.bonoDano || 0}" class="mono"></label>
      <label class="field"><span>Precio (po)</span><input type="number" id="ar-precio" min="0" max="1000000" step="0.01" value="${+a.precio || 0}" class="mono"></label>
      <label class="field"><span>Propiedades</span><input type="text" id="ar-prop" maxlength="120" value="${esc(a.prop)}" placeholder="Sutil, ligera, a dos manos…"></label>
    </div>
    <label class="field"><span>Descripción</span><textarea id="ar-descripcion" maxlength="600" placeholder="Forjada por los enanos de la montaña; brilla cerca de los orcos.">${esc(a.descripcion)}</textarea></label>
    <p class="small muted">Ejemplo: una espada larga +1 tiene 1d8 cortante, +1 al ataque y +1 al daño. Las armas que ya tienen los personajes no cambian al editar esta; las nuevas copias sí llevan los cambios.</p>
    <div class="row"><button class="btn primary" data-act="arma-guardar" ${S.busy ? "disabled" : ""}>Guardar arma</button>${a.id ? `<span data-confirm="${a.id}"><button class="btn ghost" data-act="arma-borrar" data-id="${a.id}">Borrar</button></span>` : ""}</div></div>
  </section>`;
}
function leerArma(){
  const a = S.editArma; if (!a || !$("#ar-nombre")) return;
  for (const k of ["nombre","dado","tipoDano","car","prop","descripcion"]) a[k] = $("#ar-" + k).value.trim();
  for (const k of ["bonoAt","bonoDano","precio"]) a[k] = +$("#ar-" + k).value || 0;
}
async function guardarArma(){
  leerArma(); const a = S.editArma;
  if (a.nombre.length < 2){ toast("Ponle nombre al arma."); $("#ar-nombre")?.focus(); return; }
  try { partesNot(a.dado); } catch (e) { toast(esc(e.message)); $("#ar-dado")?.focus(); return; }
  S.busy = true; render(true);
  try {
    const row = armaToRow(a), r = a.id ? await guardar(sb.from("dm_armas").update(row).eq("id", a.id).select().single(), "Arma guardada.")
                                       : await guardar(sb.from("dm_armas").insert(row).select().single(), "Arma creada.");
    const obj = armaFromRow(r); S.armas = [obj, ...(S.armas || []).filter(x => x.id !== obj.id)].sort((x, y) => x.nombre.localeCompare(y.nombre)); S.editArma = null;
  } catch {}
  S.busy = false; render(true);
}

/* ---------- Recompensas del DM y fin de la partida ---------- */
function recompensasHtml(c, grupo, fin){
  if (!grupo.length) return fin ? `<p class="small muted">No hay personajes en la partida.</p>` : "";
  const filas = grupo.map(p => `<div class="rw-row" data-rw="${p.id}"><b>${esc(p.nombre)}</b> <span class="small muted">${esc(nombreUsuario(p.dueno))} · nivel ${p.nivel || 1}</span>
    <div class="row">
      <label class="field" style="max-width:90px"><span>PX</span><input type="number" class="mono rw-xp" min="0" max="100000" placeholder="0"></label>
      <label class="field" style="max-width:90px"><span>Oro (po)</span><input type="number" class="mono rw-oro" min="0" max="1000000" placeholder="0"></label>
      <label class="field"><span>Objeto</span><select class="rw-obj"><option value="">—</option><option value="pocion">Poción de curación</option>${catalogoArmas().map(a => `<option value="arma:${esc(a.id)}">${esc(a.nombre)} (${esc(resumenArma(a))})</option>`).join("")}</select></label>
      <label class="field"><span>Otro objeto</span><input type="text" class="rw-otro" maxlength="80" placeholder="Llave de la cripta"></label>
    </div></div>`).join("");
  return `<div class="recompensas" id="rw-${fin ? "fin" : "dar"}">
    <div class="row"><label class="field"><span>Motivo</span><input type="text" class="rw-motivo" maxlength="120" placeholder="${fin ? "Final de la aventura" : "Misión cumplida, tesoro del cofre…"}"></label>
      <label class="field" style="max-width:130px"><span>PX para todos</span><input type="number" class="mono rw-todos" min="0" max="100000" placeholder="0"></label></div>
    ${filas}
    <div class="row">${fin ? `<span data-confirm="fin-${c.id}"><button class="btn primary" data-act="rw-terminar" ${S.busy ? "disabled" : ""}>Dar recompensas y terminar la partida</button></span><button class="btn ghost" data-act="rw-cerrar">Seguir jugando</button>`
      : `<button class="btn sm" data-act="rw-dar" ${S.busy ? "disabled" : ""}>Dar recompensas</button>`}</div>
    <p class="small muted">Cada personaje recibe lo suyo: los PX suben de nivel solos (con ${XP_NIVEL[1]} se llega a nivel 2) y el oro y los objetos van a su inventario. Todos lo veréis en el chat.</p>
  </div>`;
}
function panelFin(c, grupo){
  return `<div class="panel fin-partida"><div class="panel-h"><h3>Terminar la partida</h3></div>
    <p class="small">Antes de cerrar, da a cada jugador su recompensa. Al terminar, se acaba el combate y nadie puede escribir más hasta que la reabras.</p>
    ${recompensasHtml(c, grupo, true)}</div>`;
}
function leerRecompensas(box){
  const items = [];
  for (const r of $$("[data-rw]", box)){
    const xp = Math.max(0, Math.round(+$(".rw-xp", r).value || 0)), oro = Math.max(0, Math.round(+$(".rw-oro", r).value || 0)), v = $(".rw-obj", r).value, otro = $(".rw-otro", r).value.trim(), objetos = [];
    if (v === "pocion") objetos.push({ id:nuevoId(), ...POCION_CURA, cant:1 });
    else if (v.startsWith("arma:")){ const a = armaById(v.slice(5)), pj = pjById(r.dataset.rw); if (a) objetos.push(objetoDeArma(a, { equipada:!(pj && invDe(pj).objetos.some(o => o.tipo === "arma" && o.equipada)) })); }
    if (otro) objetos.push({ id:nuevoId(), nombre:otro, tipo:"objeto", cant:1 });
    if (xp || oro || objetos.length) items.push({ pj:r.dataset.rw, xp, oro, objetos });
  }
  return { items, motivo:$(".rw-motivo", box)?.value.trim() || "" };
}
async function darRecompensas(c, terminar){
  const box = $(terminar ? "#rw-fin" : "#rw-dar"); if (!box) return;
  const { items, motivo } = leerRecompensas(box);
  if (!items.length && !terminar){ toast("Escribe los PX, el oro o el objeto de alguien."); return; }
  S.busy = true;
  try {
    const r = await q(sb.rpc("dm_dar_recompensas", { p:c.id, items, motivo, terminar }));
    for (const x of r || []){ const p = pjById(x.pj); if (p){ p.xp = x.xp; p.nivel = x.nivel; p.inventario = x.inventario; } if (x.nivel > x.antes) toast(`¡${esc(pjById(x.pj)?.nombre || "")} sube a nivel ${x.nivel}!`, 5000); }
    const f = await q(sb.from("dm_partidas").select("log,datos,combate").eq("id", c.id).single()); c.log = f.log || c.log; c.combate = f.combate || {}; c.terminada = f.datos?.terminada || null;
    if (terminar){ S.fin = null; toast("Partida terminada. ¡Buen trabajo, mesa!", 5000); } else toast("Recompensas entregadas.");
  } catch (e) { toast(esc(errorTexto(e))); }
  S.busy = false; render();
}
async function reabrirPartida(c){
  try { const f = await q(sb.from("dm_partidas").select("datos").eq("id", c.id).single()); const datos = { ...(f.datos || {}) }; delete datos.terminada;
    await guardar(sb.from("dm_partidas").update({ datos }).eq("id", c.id), "Partida reabierta."); c.terminada = null; } catch {}
  render();
}

/* ---------- eventos ---------- */
document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-act^='inv-'],[data-act^='arma-'],[data-act^='rw-'],[data-act='play-fin'],[data-act='play-reabrir']"); if (!t) return;
  const p = t.dataset.pj ? pjById(t.dataset.pj) : null, c = partida(S.playId);
  switch (t.dataset.act){
    case "inv-oro": { const n = Math.round(+$(`#inv-oro-${p.id}`).value || 0); if (n < 1){ toast("Escribe cuántas piezas de oro."); break; }
        if (+t.dataset.d < 0 && invDe(p).oro < n){ toast(`Solo tiene ${po(invDe(p).oro)}.`); break; }
        cambiarInv(p, inv => { inv.oro += n * +t.dataset.d; }, +t.dataset.d > 0 ? `+${n} po.` : `−${n} po.`); } break;
    case "inv-usar": usarObjeto(p, t.dataset.o, c && puedoJugar(c) && grupoDe(c.id).some(x => x.id === p.id) ? c : null); break;
    case "inv-quitar": { const o = invDe(p).objetos.find(x => x.id === t.dataset.o); if (!o) break;
        const quitar = () => cambiarInv(p, inv => { const x = inv.objetos.find(y => y.id === o.id); if (x) x.cant = (+x.cant || 1) - 1; });
        if ((+o.cant || 1) > 1) quitar(); else confirmar(t, quitar, "Sí, quitar"); } break;
    case "inv-anadir": anadirObjetoForm(p); break;
    case "inv-comprar": comprarForm(p); break;
    case "inv-importar": cambiarInv(p, inv => { for (const o of armasDelEquipo(p)){ const { delEquipo, ...x } = o; inv.objetos.push({ ...x, id:nuevoId(), cant:1 }); } }, "Armas pasadas al inventario. Marca cuáles llevas equipadas."); break;
    case "arma-nueva": S.editArma = nuevaArma(); render(); window.scrollTo(0, 0); break;
    case "arma-mejorar": { const b = armaById(t.dataset.id); if (b){ S.editArma = nuevaArma(b); render(); window.scrollTo(0, 0); } } break;
    case "arma-editar": { const a = armaById(t.dataset.id); if (a){ S.editArma = clone(a); render(); window.scrollTo(0, 0); } } break;
    case "arma-cancelar": S.editArma = null; render(true); break;
    case "arma-guardar": guardarArma(); break;
    case "arma-borrar": confirmar(t, async () => { if (await borrar("dm_armas", t.dataset.id, "Arma borrada. Quien ya la tenía la conserva.")){ S.armas = (S.armas || []).filter(a => a.id !== t.dataset.id); S.editArma = null; } render(true); }); break;
    case "rw-dar": if (c) darRecompensas(c, false); break;
    case "rw-terminar": if (c) confirmar(t, () => darRecompensas(c, true), "Sí, terminar"); break;
    case "rw-cerrar": S.fin = null; render(); break;
    case "play-fin": if (c){ S.fin = c.id; render(); $(".fin-partida")?.scrollIntoView({ behavior:"smooth", block:"start" }); } break;
    case "play-reabrir": if (c) reabrirPartida(c); break;
  }
});
document.addEventListener("change", (ev) => {
  const t = ev.target;
  if (t.matches("[data-inv-eq]")){ const p = pjById(t.dataset.pj); cambiarInv(p, inv => { const o = inv.objetos.find(x => x.id === t.dataset.invEq); if (o) o.equipada = t.checked; }, t.checked ? "Arma equipada: ya aparece al atacar." : "Arma guardada en la mochila."); }
  if (t.id === "fa-con"){ const p = pjById(vozActual(partida(S.playId))), op = p && ataquesDe(p).find(x => x.v === t.value); if (!op) return;
    const dn = $("#fa-dano"); if (dn){ dn.value = op.dado; dn.readOnly = !op.libre; } const h = $("#fa-hint"); if (h) h.innerHTML = ataqueHint(op); }
});
document.addEventListener("toggle", (ev) => { if (ev.target.matches?.(".inv-d")) S.invAbierto = ev.target.open; }, true);
document.addEventListener("input", (ev) => {
  const t = ev.target;
  if (t.matches(".rw-todos")) $$(".rw-xp", t.closest(".recompensas")).forEach(i => { i.value = t.value; });
});
