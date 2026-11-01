/* ==================== HECHIZOS Y MAGIA ==================== */
// Característica con la que lanza conjuros cada clase (las que no aparecen no lanzan conjuros)
const CAR_MAGIA = { "Mago":"INT", "Hechicero":"CAR", "Brujo":"CAR", "Bardo":"CAR", "Paladín":"CAR", "Clérigo":"SAB", "Druida":"SAB", "Explorador":"SAB" };
const CLASES_LANZADORAS = Object.keys(CAR_MAGIA);
const lanzaConjuros = p => !!CAR_MAGIA[p?.clase];
const MODOS_HECHIZO = { ataque:"Tirada de ataque de conjuro", salvacion:"El objetivo hace una salvación", auto:"Impacta siempre", cura:"Cura puntos de golpe", utilidad:"Sin daño (utilidad)" };
const NIVEL_H = n => +n ? `Nivel ${n}` : "Truco";
// Hechizos del SRD: [nombre, nivel, clases, modo, daño o curación, tipo de daño, salvación, mitad si la supera, suma el modificador, descripción]
const _M = "Mago", _H = "Hechicero", _B = "Brujo", _C = "Clérigo", _D = "Druida", _Ba = "Bardo", _P = "Paladín", _E = "Explorador";
// Estado que deja cada hechizo al impactar (o si el objetivo falla la salvación)
const EFECTOS_H = { "Rayo de escarcha":{ estado:"Ralentizado", rondas:1 }, "Rayo de enfermedad":{ estado:"Envenenado", rondas:1 }, "Burla dañina":{ estado:"Asustado", rondas:1 },
  "Dormir":{ estado:"Dormido", rondas:2 }, "Orden imperiosa":{ estado:"Derribado", rondas:1 }, "Causar miedo":{ estado:"Asustado", rondas:2 }, "Enmarañar":{ estado:"Apresado", rondas:2 },
  "Retener persona":{ estado:"Paralizado", rondas:2 }, "Telaraña":{ estado:"Apresado", rondas:2 }, "Ceguera":{ estado:"Cegado", rondas:3 },
  "Flecha ácida de Melf":{ estado:"Ardiendo", rondas:1, dano:"2d4", tipoDano:"ácido" }, "Bola de fuego":{ estado:"Ardiendo", rondas:1 }, "Relámpago":{ estado:"Aturdido", rondas:1 } };
const HECHIZOS_SRD = [
  ["Rayo de fuego",0,[_M,_H],"ataque","1d10","fuego","",false,false,"Lanzas una mota de fuego a una criatura a 120 pies."],
  ["Rayo de escarcha",0,[_M,_H],"ataque","1d8","frío","",false,false,"Un haz helado; además reduce 10 pies la velocidad del objetivo."],
  ["Toque helado",0,[_M,_H,_B],"ataque","1d8","necrótico","",false,false,"Una mano espectral; el objetivo no puede recuperar PG hasta tu siguiente turno."],
  ["Agarre electrizante",0,[_M,_H],"ataque","1d8","rayo","",false,false,"Un toque eléctrico cuerpo a cuerpo; el objetivo no puede hacer reacciones."],
  ["Descarga sobrenatural",0,[_B],"ataque","1d10","fuerza","",false,false,"Un rayo de energía crepitante a 120 pies."],
  ["Producir llama",0,[_D],"ataque","1d8","fuego","",false,false,"Una llama en tu mano que da luz o se lanza a 30 pies."],
  ["Llama sagrada",0,[_C],"salvacion","1d8","radiante","DES",false,false,"Fuego radiante cae sobre una criatura que veas."],
  ["Rociada venenosa",0,[_M,_H,_B,_D],"salvacion","1d12","veneno","CON",false,false,"Una nube de gas tóxico desde tu mano."],
  ["Burla dañina",0,[_Ba],"salvacion","1d4","psíquico","SAB",false,false,"Insultos cargados de magia; el objetivo tiene desventaja en su siguiente ataque."],
  ["Luz",0,[_Ba,_C,_H,_M],"utilidad","","","",false,false,"Un objeto brilla como una antorcha durante una hora."],
  ["Mano de mago",0,[_Ba,_B,_H,_M],"utilidad","","","",false,false,"Una mano espectral que mueve objetos ligeros a 30 pies."],
  ["Orientación divina",0,[_C,_D],"utilidad","","","",false,false,"Un aliado suma 1d4 a una prueba de característica."],
  ["Proyectil mágico",1,[_M,_H],"auto","3d4+3","fuerza","",false,false,"Tres dardos de fuerza que nunca fallan."],
  ["Manos ardientes",1,[_M,_H],"salvacion","3d6","fuego","DES",true,false,"Un cono de llamas de 15 pies."],
  ["Ola atronadora",1,[_Ba,_D,_M,_H],"salvacion","2d8","trueno","CON",true,false,"Una onda de fuerza que empuja 10 pies."],
  ["Rayo de enfermedad",1,[_M,_H],"ataque","2d8","veneno","",false,false,"Un rayo verdoso que puede envenenar."],
  ["Saeta guía",1,[_C],"ataque","4d6","radiante","",false,false,"Un destello de luz; el siguiente ataque contra el objetivo tiene ventaja."],
  ["Infligir heridas",1,[_C],"ataque","3d10","necrótico","",false,false,"Un toque cuerpo a cuerpo cargado de energía negativa."],
  ["Castigo atronador",1,[_P],"auto","2d6","trueno","",false,false,"Tu siguiente ataque con arma suma este daño y empuja al objetivo."],
  ["Marca del cazador",1,[_E],"auto","1d6","","",false,false,"Marcas a una presa: tus ataques con arma le hacen 1d6 extra."],
  ["Curar heridas",1,[_Ba,_C,_D,_P,_E],"cura","1d8","","",false,true,"Tocas a una criatura y recupera PG."],
  ["Palabra curativa",1,[_Ba,_C,_D],"cura","1d4","","",false,true,"Una palabra a 60 pies que devuelve PG como acción adicional."],
  ["Escudo",1,[_M,_H],"utilidad","","","",false,false,"Reacción: +5 a la CA hasta tu siguiente turno."],
  ["Dormir",1,[_Ba,_H,_M],"auto","","","",false,false,"Un sopor mágico: el objetivo se duerme y pierde sus turnos (despierta si le hieren, a criterio del DM)."],
  ["Orden imperiosa",1,[_C,_P],"salvacion","","","SAB",false,false,"Una palabra de mando («¡Al suelo!»): si falla, cae derribado."],
  ["Causar miedo",1,[_B,_M],"salvacion","","","SAB",false,false,"El objetivo se llena de terror y ataca con desventaja."],
  ["Enmarañar",1,[_D],"salvacion","","","FUE",false,false,"Hierbas y raíces brotan y sujetan al objetivo."],
  ["Detectar magia",1,[_Ba,_C,_D,_M,_H,_P,_E],"utilidad","","","",false,false,"Sientes la magia a 30 pies durante 10 minutos."],
  ["Armadura de mago",1,[_M,_H],"utilidad","","","",false,false,"Tu CA pasa a ser 13 + DES durante 8 horas."],
  ["Rayo abrasador",2,[_M,_H],"ataque","2d6","fuego","",false,false,"Tres rayos de fuego (aquí, uno por tirada)."],
  ["Arma espiritual",2,[_C],"ataque","1d8","fuerza","",false,true,"Un arma flotante que ataca como acción adicional."],
  ["Romper",2,[_Ba,_H,_B,_M],"salvacion","3d8","trueno","CON",true,false,"Un estruendo que rompe objetos y hiere a quien esté cerca."],
  ["Retener persona",2,[_Ba,_C,_D,_H,_B,_M],"salvacion","","","SAB",false,false,"El objetivo queda paralizado: no actúa y los ataques contra él tienen ventaja."],
  ["Telaraña",2,[_M,_H],"salvacion","","","DES",false,false,"Telarañas pegajosas atrapan al objetivo."],
  ["Ceguera",2,[_Ba,_C,_H,_M],"salvacion","","","CON",false,false,"El objetivo queda ciego."],
  ["Flecha ácida de Melf",2,[_M],"ataque","4d4","ácido","",false,false,"Una flecha de ácido que sigue quemando en el siguiente turno."],
  ["Restablecimiento menor",2,[_Ba,_C,_D,_P,_E],"utilidad","","","",false,false,"Quita una enfermedad o un estado: cegado, ensordecido, paralizado o envenenado."],
  ["Bola de fuego",3,[_M,_H],"salvacion","8d6","fuego","DES",true,false,"Una explosión de 20 pies de radio."],
  ["Relámpago",3,[_M,_H],"salvacion","8d6","rayo","DES",true,false,"Una línea de 100 pies de rayo."],
  ["Espíritus guardianes",3,[_C],"salvacion","3d8","radiante","SAB",true,false,"Espíritus que hieren a los enemigos que se acercan."],
  ["Curar heridas en masa",5,[_Ba,_C,_D],"cura","3d8","","",false,true,"Hasta seis criaturas recuperan PG."]
].map(([nombre, nivel, clases, modo, dano, tipoDano, sv, mitad, sumaMod, descripcion]) => ({ id:"srd:" + nombre, srd:true, nombre, nivel, clases, modo, dano, tipoDano, sv, mitad, sumaMod, descripcion, efecto:EFECTOS_H[nombre] || null }));

function hechizoFromRow(r){ return { ...(r.datos || {}), id:r.id, autor:r.autor, nombre:r.nombre, actualizado:r.actualizado }; }
function hechizoToRow(h){ const { id, autor, nombre, actualizado, srd, ...datos } = h; return { nombre, datos }; }
const catalogoHechizos = () => [...(S.hechizos || []), ...HECHIZOS_SRD];
const hechizoById = id => catalogoHechizos().find(h => h.id === id);
const puedeLanzar = (p, h) => lanzaConjuros(p) && (!h.clases?.length || h.clases.includes(p.clase));
const efectoTxt = h => (h.modo === "cura" ? `Cura ${h.dano || "?"}${h.sumaMod ? " + mod." : ""}` : h.dano ? `${h.dano}${h.sumaMod ? " + mod." : ""} ${h.tipoDano || ""}` : h.efecto?.estado ? "" : "—")
  + (h.efecto?.estado ? `${h.dano ? " → " : ""}${h.efecto.estado} ${+h.efecto.rondas || 1}t` : "");
const comoTxt = h => h.modo === "salvacion" ? `Salvación de ${AB_N[h.sv] || h.sv}${h.mitad ? " (mitad si la supera)" : ""}` : MODOS_HECHIZO[h.modo] || "";
const hechizosDe = p => Array.isArray(p?.hechizos) ? p.hechizos : [];
// Copia del hechizo que guarda el personaje (si luego se edita en el grimorio, la suya no cambia hasta que la vuelva a añadir)
const copiaHechizo = h => ({ id:nuevoId(), hechizoId:h.id, nombre:h.nombre, nivel:+h.nivel || 0, modo:h.modo, dano:h.dano || "", tipoDano:h.tipoDano || "", sv:h.sv || "", mitad:!!h.mitad, sumaMod:!!h.sumaMod, descripcion:h.descripcion || "", efecto:h.efecto ? clone(h.efecto) : null });
function magiaDe(p){ const d = derive(p), car = CAR_MAGIA[p.clase] || "INT", mod = modOf(d.sc[car]); return { car, mod, ataque:mod + d.prof, cd:8 + d.prof + mod }; }
// Opciones de hechizo para el formulario de ataque
function ataquesHechizo(p){
  if (!lanzaConjuros(p)) return [];
  const m = magiaDe(p);
  return hechizosDe(p).filter(h => ["ataque","salvacion","auto"].includes(h.modo) && (h.dano || h.efecto?.estado)).map(h => ({
    v:"h:" + h.id, nombre:h.nombre + (h.modo === "salvacion" ? ` (salv. ${h.sv} CD ${m.cd})` : h.modo === "auto" ? " (no falla)" : ""), corto:h.nombre, bono:h.modo === "ataque" ? m.ataque : 0,
    dado:h.dano, mDano:h.sumaMod ? m.mod : 0, car:m.car, tipoDano:h.tipoDano, modo:h.modo, sv:h.sv, mitad:h.mitad, cd:m.cd, hechizo:true, efecto:h.efecto || null }));
}

/* ---------- lista de hechizos del personaje (ficha y mesa) ---------- */
function hechizosHtml(p, c){
  const hs = hechizosDe(p); if (!lanzaConjuros(p)) return hs.length ? `<p class="small muted">Los ${esc(p.clase.toLowerCase())}s no lanzan conjuros.</p>` : "";
  const m = magiaDe(p), mio = p.dueno === S.me, grupo = c ? grupoDe(c.id) : [];
  return `<div class="hechizos">
    <p class="small muted">Lanza con ${AB_N[m.car]}: ataque de conjuro <b class="mono">${fm(m.ataque)}</b> · CD de salvación <b class="mono">${m.cd}</b></p>
    ${hs.length ? hs.slice().sort((a, b) => (+a.nivel || 0) - (+b.nivel || 0)).map(h => `<div class="inv-row"><div><b>${esc(h.nombre)}</b> <span class="chip">${NIVEL_H(h.nivel)}</span>
        <div class="small muted">${esc(efectoTxt(h))} · ${esc(comoTxt(h))}</div>${h.descripcion ? `<div class="small muted">${esc(h.descripcion)}</div>` : ""}</div>
      ${mio && c && (h.modo === "cura" || h.modo === "utilidad") ? `<div class="row">${h.modo === "cura" ? `<select data-cura-a="${esc(h.id)}" aria-label="A quién cura">${grupo.map(g => `<option value="${g.id}" ${g.id === p.id ? "selected" : ""}>${esc(g.nombre)}</option>`).join("")}</select>${c.dadosFisicos ? inputDado(`data-cura-val="${esc(h.id)}"`, "dados") : ""}` : ""}
        <button class="btn sm" data-act="hz-lanzar" data-pj="${p.id}" data-h="${esc(h.id)}" ${S.busy ? "disabled" : ""}>Lanzar</button></div>` : ""}</div>`).join("")
      : `<p class="small muted">${mio ? `Todavía no tiene hechizos. Añádelos al editar el personaje.` : "No tiene hechizos."}</p>`}
    ${c && hs.some(h => ["ataque","salvacion","auto"].includes(h.modo)) ? `<p class="small muted">Los hechizos de daño se lanzan desde el formulario de ataque, en tu turno.</p>` : ""}
  </div>`;
}
async function lanzarHechizo(c, p, hid){
  const h = hechizosDe(p).find(x => x.id === hid); if (!h || !c) return;
  if (h.modo === "cura"){
    const dest = pjById($(`[data-cura-a="${hid}"]`)?.value) || p, not = h.dano + (h.sumaMod ? sgn(magiaDe(p).mod) : "");
    let r; try { r = tirarCon(c, not, `${h.nombre} de ${p.nombre}`, "normal", $(`[data-cura-val="${hid}"]`)?.value); } catch (e) { toast(esc(e.message)); return; }
    const cura = Math.max(0, r.total); cambiarPG(dest.id, cura);
    S.busy = true; try { await publicar(c, p.id, `${p.nombre} lanza ${h.nombre} sobre ${dest.id === p.id ? "sí mismo" : dest.nombre}: ${lineaTirada(r)} PG recuperados.`); } catch {} S.busy = false;
    toast(`${esc(dest.nombre)} recupera ${cura} PG.`); render(); return;
  }
  S.busy = true; try { await publicar(c, p.id, `${p.nombre} lanza ${h.nombre}.${h.descripcion ? " " + h.descripcion : ""}`); } catch {} S.busy = false; render();
}

/* ---------- Grimorio (vista) ---------- */
function nuevoHechizo(base){
  const b = base || { nombre:"", nivel:0, clases:[], modo:"ataque", dano:"1d10", tipoDano:"fuego", sv:"DES", mitad:false, sumaMod:false, descripcion:"" };
  return { id:null, autor:S.me, ...clone({ nombre:base ? b.nombre + " (variante)" : "", nivel:b.nivel, clases:b.clases || [], modo:b.modo, dano:b.dano, tipoDano:b.tipoDano || "fuego", sv:b.sv || "DES", mitad:!!b.mitad, sumaMod:!!b.sumaMod, descripcion:b.descripcion || "", efecto:b.efecto || null }) };
}
function vGrimorio(){
  if (S.editHechizo) return vHechizoEditor();
  const propios = S.hechizos || [], f = S.hzFiltro || "";
  const ver = h => !f || !h.clases?.length || h.clases.includes(f);
  const cab = `<thead><tr><th>Hechizo</th><th>Nivel</th><th>Efecto</th><th>Cómo funciona</th><th>Clases</th><th></th></tr></thead>`;
  const fila = (h, srd) => `<tr><td><b>${esc(h.nombre)}</b>${h.descripcion ? `<div class="small muted">${esc(h.descripcion.slice(0, 140))}</div>` : ""}</td><td class="small">${NIVEL_H(h.nivel)}</td><td class="mono small">${esc(efectoTxt(h))}</td><td class="small">${esc(comoTxt(h))}</td><td class="small">${esc((h.clases?.length ? h.clases : ["Todas las que lanzan"]).join(", "))}</td>
    <td>${srd ? `<button class="btn sm ghost" data-act="hz-copiar" data-id="${esc(h.id)}">Variante</button>` : h.autor === S.me ? `<button class="btn sm" data-act="hz-editar" data-id="${h.id}">Editar</button>` : ownerChip(h.autor)}</td></tr>`;
  const lista = arr => arr.filter(ver).sort((a, b) => (+a.nivel || 0) - (+b.nivel || 0) || a.nombre.localeCompare(b.nombre));
  return `<section class="view">
    <div class="panel-h"><div style="display:grid;gap:8px"><h1>Hechizos y magia</h1><p class="lede">El grimorio de la mesa: cada hechizo con su nivel, las clases que pueden usarlo y el daño o la curación que hace. Se añaden a los personajes al crearlos o editarlos, y solo a clases que lanzan conjuros.</p></div>
    <button class="btn primary" data-act="hz-nuevo">Crear hechizo</button></div>
    <label class="field" style="max-width:280px"><span>Ver hechizos de</span><select id="hz-filtro"><option value="">Todas las clases</option>${CLASES_LANZADORAS.map(k => `<option ${k === f ? "selected" : ""}>${k}</option>`).join("")}</select></label>
    <div class="panel"><h2>Creados por la mesa</h2>
      ${lista(propios).length ? `<div class="tblwrap"><table class="armas">${cab}<tbody>${lista(propios).map(h => fila(h, false)).join("")}</tbody></table></div>` : `<p class="small muted">${propios.length ? "Ninguno de esta clase." : "Todavía no hay hechizos propios. Crea uno, o pulsa «Variante» en uno del reglamento para partir de él."}</p>`}</div>
    <div class="panel"><details ${propios.length ? "" : "open"}><summary><b>Hechizos del reglamento (${lista(HECHIZOS_SRD).length})</b></summary><div class="tblwrap"><table class="armas">${cab}<tbody>${lista(HECHIZOS_SRD).map(h => fila(h, true)).join("")}</tbody></table></div></details>
      <p class="small muted">Ataque de conjuro: d20 + modificador de la característica mágica de la clase + competencia. CD de salvación: 8 + ese modificador + competencia. Los trucos (nivel 0) se pueden lanzar sin límite.</p></div>
  </section>`;
}
function vHechizoEditor(){
  const h = S.editHechizo;
  return `<section class="view">
    <div class="panel-h"><h1>${h.id ? "Editar hechizo" : "Nuevo hechizo"}</h1><button class="btn ghost" data-act="hz-cancelar">Volver</button></div>
    <div class="panel"><div class="grid2">
      <label class="field"><span>Nombre</span><input type="text" id="hz-nombre" maxlength="60" value="${esc(h.nombre)}" placeholder="Lanza de hielo, Rayo lunar…"></label>
      <label class="field"><span>Nivel</span><select id="hz-nivel">${[0,1,2,3,4,5,6,7,8,9].map(n => `<option value="${n}" ${+h.nivel === n ? "selected" : ""}>${NIVEL_H(n)}</option>`).join("")}</select></label>
      <label class="field"><span>Cómo funciona</span><select id="hz-modo">${Object.entries(MODOS_HECHIZO).map(([k, t]) => `<option value="${k}" ${k === h.modo ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label class="field"><span>${h.modo === "cura" ? "Curación" : "Daño"} (dados)</span><input type="text" id="hz-dano" class="mono" value="${esc(h.dano)}" placeholder="${h.modo === "utilidad" ? "Opcional" : "2d6"}"></label>
      ${h.modo === "cura" || h.modo === "utilidad" ? "" : `<label class="field"><span>Tipo de daño</span><select id="hz-tipoDano">${TIPOS_DANO.map(t => `<option ${t === h.tipoDano ? "selected" : ""}>${t}</option>`).join("")}</select></label>`}
      ${h.modo === "salvacion" ? `<label class="field"><span>Salvación del objetivo</span><select id="hz-sv">${AB.map(k => `<option value="${k}" ${k === h.sv ? "selected" : ""}>${AB_N[k]}</option>`).join("")}</select></label>
        <label class="switch"><input type="checkbox" id="hz-mitad" ${h.mitad ? "checked" : ""}> Si supera la salvación, recibe la mitad del daño</label>` : ""}
      ${h.modo === "utilidad" ? "" : `<label class="switch"><input type="checkbox" id="hz-sumaMod" ${h.sumaMod ? "checked" : ""}> Suma el modificador mágico del lanzador</label>`}
    </div>
    <div class="field"><span>Clases que pueden usarlo</span><div class="checks">${CLASES_LANZADORAS.map(k => `<label class="switch small"><input type="checkbox" class="hz-clase" value="${k}" ${h.clases?.includes(k) ? "checked" : ""}> ${k}</label>`).join("")}</div>
      <span class="small muted">Si no marcas ninguna, lo puede aprender cualquier clase que lance conjuros. Guerreros, bárbaros, monjes y pícaros no lanzan conjuros.</span></div>
    ${h.modo === "cura" || h.modo === "utilidad" ? "" : `<h3>Estado que causa</h3>${efectoCampos(h.efecto, "hz", false)}<p class="small muted">Se aplica si el hechizo impacta o si el objetivo falla la salvación. Ejemplo: Retener persona → Paralizado 2 turnos.</p>`}
    <label class="field"><span>Descripción</span><textarea id="hz-descripcion" maxlength="600" placeholder="Qué hace, alcance, duración…">${esc(h.descripcion)}</textarea></label>
    <div class="row"><button class="btn primary" data-act="hz-guardar" ${S.busy ? "disabled" : ""}>Guardar hechizo</button>${h.id ? `<span data-confirm="${h.id}"><button class="btn ghost" data-act="hz-borrar" data-id="${h.id}">Borrar</button></span>` : ""}</div></div>
  </section>`;
}
function leerHechizo(){
  const h = S.editHechizo; if (!h || !$("#hz-nombre")) return;
  h.nombre = $("#hz-nombre").value.trim(); h.nivel = +$("#hz-nivel").value || 0; h.modo = $("#hz-modo").value; h.dano = $("#hz-dano").value.trim(); h.descripcion = $("#hz-descripcion").value.trim();
  if ($("#hz-tipoDano")) h.tipoDano = $("#hz-tipoDano").value; if ($("#hz-sv")) h.sv = $("#hz-sv").value;
  if ($("#hz-mitad")) h.mitad = $("#hz-mitad").checked; if ($("#hz-sumaMod")) h.sumaMod = $("#hz-sumaMod").checked;
  h.clases = $$(".hz-clase").filter(x => x.checked).map(x => x.value);
  if ($("#hz-est")) h.efecto = leerEfecto("hz");
}
async function guardarHechizo(){
  leerHechizo(); const h = S.editHechizo;
  if (h.nombre.length < 2){ toast("Ponle nombre al hechizo."); $("#hz-nombre")?.focus(); return; }
  if (h.modo === "cura" || h.modo === "utilidad") h.efecto = null;
  if (h.modo !== "utilidad" || h.dano){ if (!h.dano && !h.efecto){ toast("Escribe los dados de daño o curación (por ejemplo 2d6), o elige un estado que cause."); $("#hz-dano")?.focus(); return; }
    if (h.dano) try { partesNot(h.dano); } catch (e) { toast(esc(e.message)); $("#hz-dano")?.focus(); return; } }
  if (h.modo === "cura" || h.modo === "utilidad") h.tipoDano = ""; if (h.modo !== "salvacion"){ h.sv = ""; h.mitad = false; }
  S.busy = true; render(true);
  try {
    const row = hechizoToRow(h), r = h.id ? await guardar(sb.from("dm_hechizos").update(row).eq("id", h.id).select().single(), "Hechizo guardado.")
                                          : await guardar(sb.from("dm_hechizos").insert(row).select().single(), "Hechizo creado.");
    const obj = hechizoFromRow(r); S.hechizos = [obj, ...(S.hechizos || []).filter(x => x.id !== obj.id)]; S.editHechizo = null;
  } catch {}
  S.busy = false; render(true);
}

/* ---------- editor del personaje: equipo, objetos, oro y hechizos ---------- */
function editorEquipoHtml(p){
  const inv = invDe(p), hs = hechizosDe(p), lanza = lanzaConjuros(p), disp = catalogoHechizos().filter(h => puedeLanzar(p, h) && !hs.some(x => x.hechizoId === h.id));
  const objFila = o => { const w = o.arma, k = esc(o.id);
    return `<div class="ed-obj" data-ed-obj="${k}">
      <div class="row">
        <label class="field"><span>${TIPOS_OBJ[o.tipo] || "Objeto"}</span><input type="text" data-f="nombre" maxlength="80" value="${esc(o.nombre)}"></label>
        <label class="field" style="max-width:80px"><span>Cantidad</span><input type="number" data-f="cant" min="1" max="999" value="${+o.cant || 1}" class="mono"></label>
        ${o.tipo === "pocion" ? `<label class="field" style="max-width:110px"><span>Cura (dados)</span><input type="text" data-f="cura" class="mono" value="${esc(o.cura || "")}" placeholder="—"></label>` : ""}
        ${w ? `<label class="field" style="max-width:90px"><span>Daño</span><input type="text" data-f="dado" class="mono" value="${esc(w.dado)}"></label>
          <label class="field" style="max-width:80px"><span>+ ataque</span><input type="number" data-f="bonoAt" min="-5" max="10" value="${+w.bonoAt || 0}" class="mono"></label>
          <label class="field" style="max-width:80px"><span>+ daño</span><input type="number" data-f="bonoDano" min="-5" max="20" value="${+w.bonoDano || 0}" class="mono"></label>
          <label class="field" style="max-width:150px"><span>Se usa con</span><select data-f="car">${Object.entries(CAR_ARMA).map(([v, t]) => `<option value="${v}" ${v === w.car ? "selected" : ""}>${t.split(" (")[0].split(":")[0]}</option>`).join("")}</select></label>
          <label class="switch small"><input type="checkbox" data-f="equipada" ${o.equipada ? "checked" : ""}> Equipada</label>` : ""}
        ${o.armadura ? `<label class="field" style="max-width:80px"><span>${o.armadura.cat === "escudo" ? "+ CA" : "CA base"}</span><input type="number" data-f="ca" min="0" max="25" value="${+o.armadura.ca || 0}" class="mono"></label>
          <label class="field" style="max-width:80px"><span>Mágica +</span><input type="number" data-f="bono" min="0" max="5" value="${+o.armadura.bono || 0}" class="mono"></label>
          <label class="switch small"><input type="checkbox" data-f="equipada" ${o.equipada ? "checked" : ""}> Puesta</label>` : ""}
        <label class="field"><span>Nota</span><input type="text" data-f="nota" maxlength="120" value="${esc(o.nota || "")}" placeholder="Opcional"></label>
        <button class="btn sm ghost" data-act="ed-obj-quitar" data-o="${k}" aria-label="Quitar ${esc(o.nombre)}">Quitar</button>
      </div></div>`; };
  const hzFila = h => `<div class="ed-obj" data-ed-hz="${esc(h.id)}"><div class="row">
      <label class="field"><span>${NIVEL_H(h.nivel)}</span><input type="text" data-f="nombre" maxlength="60" value="${esc(h.nombre)}"></label>
      ${h.modo !== "utilidad" ? `<label class="field" style="max-width:100px"><span>${h.modo === "cura" ? "Cura" : "Daño"}</span><input type="text" data-f="dano" class="mono" value="${esc(h.dano)}"></label>` : ""}
      <span class="small muted" style="align-self:center">${esc(comoTxt(h))}${h.tipoDano ? " · " + esc(h.tipoDano) : ""}</span>
      <button class="btn sm ghost" data-act="ed-hz-quitar" data-h="${esc(h.id)}" aria-label="Quitar ${esc(h.nombre)}">Quitar</button></div></div>`;
  return `<div class="panel ed-equipo">
    <h2>5. Equipo, objetos y hechizos</h2>
    <p class="small muted">Todo lo que lleva el personaje. Puedes cambiar nombres, cantidades, daños y bonificaciones. Las armas equipadas son las que aparecen al atacar.</p>
    <div class="row"><label class="field" style="max-width:160px"><span>Oro (po)</span><input type="number" id="f-oro" min="0" max="1000000" step="0.01" value="${inv.oro}" class="mono"></label></div>
    <h3>Armas y objetos</h3>
    ${inv.objetos.length ? inv.objetos.map(objFila).join("") : `<p class="small muted">No lleva nada todavía.</p>`}
    <div class="row ed-add">
      <label class="field"><span>Añadir</span><select id="ed-obj-tipo"><option value="objeto">Objeto escrito a mano</option><option value="pocion-otra">Poción escrita a mano</option>${optsCatalogo()}</select></label>
      <label class="field"><span>Nombre</span><input type="text" id="ed-obj-nom" maxlength="80" placeholder="Opcional si es del catálogo"></label>
      <label class="field" style="max-width:80px"><span>Cantidad</span><input type="number" id="ed-obj-cant" min="1" max="999" value="1" class="mono"></label>
      <button class="btn sm" data-act="ed-obj-anadir">Añadir</button>
    </div>
    ${armasDelEquipo(p).length && !inv.objetos.some(o => o.tipo === "arma") ? `<p class="small muted">En el texto del equipo hay armas: ${armasDelEquipo(p).map(o => esc(o.nombre) + " (" + o.arma.dado + ")").join(", ")}. <button class="btn sm ghost" data-act="ed-importar">Pasarlas a la lista</button></p>` : ""}
    <h3>Hechizos</h3>
    ${lanza ? `<p class="small muted">Los ${esc(p.clase.toLowerCase())}s lanzan conjuros con ${AB_N[CAR_MAGIA[p.clase]]}: ataque de conjuro ${fm(magiaDe(p).ataque)}, CD ${magiaDe(p).cd}.</p>
      ${hs.length ? hs.map(hzFila).join("") : `<p class="small muted">Sin hechizos todavía.</p>`}
      <div class="row ed-add"><label class="field"><span>Añadir hechizo</span><select id="ed-hz">${disp.length ? disp.sort((a, b) => (+a.nivel || 0) - (+b.nivel || 0) || a.nombre.localeCompare(b.nombre)).map(h => `<option value="${esc(h.id)}">${NIVEL_H(h.nivel)} · ${esc(h.nombre)} (${esc(efectoTxt(h))})</option>`).join("") : `<option value="">No quedan hechizos para esta clase</option>`}</select></label>
        <button class="btn sm" data-act="ed-hz-anadir" ${disp.length ? "" : "disabled"}>Añadir</button></div>
      <p class="small muted">Solo aparecen los hechizos que puede usar un ${esc(p.clase.toLowerCase())}. Puedes crear más en <a href="#catalogo">el catálogo</a>.</p>`
      : `<p class="small muted">Los ${esc(String(p.clase).toLowerCase())}s no lanzan conjuros, así que no pueden tener hechizos.${hs.length ? ` <b>Al guardar se quitarán los ${hs.length} hechizos que tenía.</b>` : ""}</p>`}
  </div>`;
}
// Pasa al personaje en edición lo escrito en las filas de objetos y hechizos
function leerEquipo(p){
  if (!$(".ed-equipo")) return;
  const inv = invDe(p);
  const oro = $("#f-oro"); if (oro) inv.oro = Math.max(0, +oro.value || 0);
  for (const row of $$("[data-ed-obj]")){ const o = inv.objetos.find(x => x.id === row.dataset.edObj); if (!o) continue;
    for (const el of $$("[data-f]", row)){ const f = el.dataset.f, v = el.type === "checkbox" ? el.checked : el.value;
      if (["ca","bono"].includes(f)){ if (o.armadura) o.armadura[f] = Math.max(0, +v || 0); }
      else if (["dado","bonoAt","bonoDano","car"].includes(f)){ if (o.arma) o.arma[f] = f.startsWith("bono") ? (+v || 0) : String(v).trim() || o.arma[f]; }
      else if (f === "cant") o.cant = Math.max(1, Math.min(999, Math.round(+v || 1)));
      else if (f === "equipada") o.equipada = v;
      else o[f] = String(v).trim() || (f === "nombre" ? o.nombre : ""); } }
  p.inventario = inv;
  const hs = hechizosDe(p);
  for (const row of $$("[data-ed-hz]")){ const h = hs.find(x => x.id === row.dataset.edHz); if (!h) continue;
    for (const el of $$("[data-f]", row)){ const v = el.value.trim(); if (v || el.dataset.f !== "nombre") h[el.dataset.f] = v || h[el.dataset.f]; } }
  p.hechizos = hs;
}
function validarEquipo(p){
  for (const o of invDe(p).objetos){ try { if (o.arma) partesNot(o.arma.dado); if (o.cura) partesNot(o.cura); } catch (e) { return `${o.nombre}: ${e.message}`; } }
  for (const h of hechizosDe(p)) if (h.dano){ try { partesNot(h.dano); } catch (e) { return `${h.nombre}: ${e.message}`; } }
  return "";
}

/* ---------- eventos ---------- */
document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-act^='hz-'],[data-act^='ed-']"); if (!t) return;
  switch (t.dataset.act){
    case "hz-nuevo": S.editHechizo = nuevoHechizo(); render(); window.scrollTo(0, 0); break;
    case "hz-copiar": { const b = hechizoById(t.dataset.id); if (b){ S.editHechizo = nuevoHechizo(b); render(); window.scrollTo(0, 0); } } break;
    case "hz-editar": { const h = hechizoById(t.dataset.id); if (h){ S.editHechizo = { clases:[], ...clone(h) }; render(); window.scrollTo(0, 0); } } break;
    case "hz-cancelar": S.editHechizo = null; render(true); break;
    case "hz-guardar": guardarHechizo(); break;
    case "hz-borrar": confirmar(t, async () => { if (await borrar("dm_hechizos", t.dataset.id, "Hechizo borrado. Quien ya lo tenía lo conserva.")){ S.hechizos = (S.hechizos || []).filter(h => h.id !== t.dataset.id); S.editHechizo = null; } render(true); }); break;
    case "hz-lanzar": { const c = partida(S.playId), p = pjById(t.dataset.pj); if (c && p) lanzarHechizo(c, p, t.dataset.h); } break;
    // editor del personaje
    case "ed-obj-anadir": { leerForm(); const p = S.edit, tipo = $("#ed-obj-tipo").value, nom = $("#ed-obj-nom").value.trim(), cant = Math.max(1, Math.min(999, Math.round(+$("#ed-obj-cant").value || 1))), inv = invDe(p);
        if (tipo.startsWith("cat:")){ const x = itemById(tipo.slice(4)); if (!x) break;
          const libre = x.tipo === "arma" ? !inv.objetos.some(o => o.tipo === "arma" && o.equipada) : x.tipo === "armadura" ? !inv.objetos.some(o => o.tipo === "armadura" && o.equipada && (o.armadura?.cat === "escudo") === (x.cat === "escudo")) : false;
          inv.objetos.push(objetoDeCatalogo(x, { cant, nombre:nom || x.nombre, ...(x.tipo === "arma" || x.tipo === "armadura" ? { equipada:libre } : {}) })); }
        else { if (!nom){ toast("Escribe qué es."); $("#ed-obj-nom")?.focus(); break; } inv.objetos.push({ id:nuevoId(), nombre:nom, tipo:tipo === "pocion-otra" ? "pocion" : "objeto", cant }); }
        p.inventario = inv; render(true); } break;
    case "ed-obj-quitar": { leerForm(); const inv = invDe(S.edit); inv.objetos = inv.objetos.filter(o => o.id !== t.dataset.o); S.edit.inventario = inv; render(true); } break;
    case "ed-importar": { leerForm(); const inv = invDe(S.edit); for (const o of armasDelEquipo(S.edit)){ const { delEquipo, ...x } = o; inv.objetos.push({ ...x, id:nuevoId(), cant:1 }); } S.edit.inventario = inv; render(true); } break;
    case "ed-hz-anadir": { leerForm(); const h = hechizoById($("#ed-hz").value); if (!h) break;
        if (!puedeLanzar(S.edit, h)){ toast(`Un ${esc(S.edit.clase.toLowerCase())} no puede usar ${esc(h.nombre)}.`); break; }
        S.edit.hechizos = [...hechizosDe(S.edit), copiaHechizo(h)]; render(true); } break;
    case "ed-hz-quitar": { leerForm(); S.edit.hechizos = hechizosDe(S.edit).filter(h => h.id !== t.dataset.h); render(true); } break;
  }
});
document.addEventListener("change", (ev) => {
  const t = ev.target;
  if (t.id === "hz-filtro"){ S.hzFiltro = t.value; render(); }
  if (t.id === "hz-modo"){ leerHechizo(); render(true); }
});
