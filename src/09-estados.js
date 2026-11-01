/* ==================== ESTADOS ALTERADOS, ACCIONES DE ENEMIGOS Y HUIR ==================== */
// Estados: incapacita = pierde el turno; ventajaContra = los ataques contra él tienen ventaja; desventaja = sus ataques tienen desventaja;
// ventaja = sus ataques tienen ventaja; desventajaContra = los ataques contra él tienen desventaja; dano = daño al empezar cada uno de sus turnos.
const ESTADOS = {
  "Paralizado":{ incapacita:true, ventajaContra:true, t:"No puede moverse ni actuar. Los ataques contra él tienen ventaja." },
  "Aturdido":{ incapacita:true, ventajaContra:true, t:"Pierde sus turnos. Los ataques contra él tienen ventaja." },
  "Dormido":{ incapacita:true, ventajaContra:true, t:"Inconsciente hasta que pase el efecto. Los ataques contra él tienen ventaja." },
  "Derribado":{ ventajaContra:true, desventaja:true, t:"En el suelo: ataca con desventaja y le atacan con ventaja." },
  "Apresado":{ ventajaContra:true, desventaja:true, t:"Atrapado: ataca con desventaja y le atacan con ventaja." },
  "Cegado":{ ventajaContra:true, desventaja:true, t:"No ve: ataca con desventaja y le atacan con ventaja." },
  "Envenenado":{ desventaja:true, t:"Ataca con desventaja." },
  "Asustado":{ desventaja:true, t:"Ataca con desventaja mientras dure el miedo." },
  "Ralentizado":{ desventaja:true, t:"Más lento y torpe: ataca con desventaja." },
  "Hechizado":{ t:"No puede atacar a quien lo hechizó." },
  "Invisible":{ ventaja:true, desventajaContra:true, t:"Ataca con ventaja y le atacan con desventaja." },
  "Sangrando":{ dano:"1d4", tipoDano:"cortante", t:"Pierde PG al empezar cada uno de sus turnos." },
  "Ardiendo":{ dano:"1d6", tipoDano:"fuego", t:"Las llamas le queman al empezar cada uno de sus turnos." },
  "Veneno":{ dano:"1d4", tipoDano:"veneno", desventaja:true, t:"Pierde PG cada turno y ataca con desventaja." },
  "Congelado":{ dano:"1d4", tipoDano:"frío", desventaja:true, t:"El frío le hiere cada turno y le entorpece." }
};
const fxEstado = s => ({ ...(ESTADOS[s.nombre] || {}), ...s });
const estadosDe = e => (Array.isArray(e?.estados) ? e.estados : []).map(fxEstado);
const entradaDe = (c, id) => cb(c).orden.find(x => x.id === id);
// Ventaja o desventaja según los estados del atacante y del objetivo
function modoAtaque(c, atacanteId, objetivoId){
  const a = estadosDe(entradaDe(c, atacanteId)), o = estadosDe(entradaDe(c, objetivoId)), por = [];
  const v = a.filter(s => s.ventaja).map(s => `${s.nombre.toLowerCase()} (atacante)`).concat(o.filter(s => s.ventajaContra).map(s => `objetivo ${s.nombre.toLowerCase()}`));
  const d = a.filter(s => s.desventaja).map(s => `atacante ${s.nombre.toLowerCase()}`).concat(o.filter(s => s.desventajaContra).map(s => `objetivo ${s.nombre.toLowerCase()}`));
  const modo = v.length && !d.length ? "ventaja" : d.length && !v.length ? "desventaja" : "normal";
  return { modo, por:modo === "ventaja" ? v : modo === "desventaja" ? d : [] };
}
const modoTxt = (m, fis) => m.modo === "normal" ? "" : `<span class="chip ${m.modo === "ventaja" ? "acc" : "warn"}">${m.modo === "ventaja" ? "Ventaja" : "Desventaja"}: ${esc(m.por.join(", "))}</span>${fis ? ` <span class="small muted">tira 2d20 y escribe el ${m.modo === "ventaja" ? "mayor" : "menor"}</span>` : ""}`;
const chipsEstados = (e, quitar) => estadosDe(e).map(s => `<span class="chip est ${s.incapacita ? "warn" : ""}" title="${esc(s.t || "")}">${esc(s.nombre)}${s.dano ? ` ${esc(s.dano)}` : ""} · ${s.rondas}t${quitar ? ` <button class="x" data-act="cb-est-quitar" data-id="${esc(e.id)}" data-n="${esc(s.nombre)}" aria-label="Quitar ${esc(s.nombre)}">✕</button>` : ""}</span>`).join("");
// Pone un estado (efecto de un arma, hechizo o habilidad) a quien está en el combate
async function ponerEstado(c, objetivoId, ef){
  if (!ef?.estado) return "";
  const base = ESTADOS[ef.estado] || {}, rondas = Math.max(1, Math.min(10, +ef.rondas || 1));
  const estado = { nombre:ef.estado, rondas, dano:ef.dano || base.dano || "", tipoDano:ef.tipoDano || base.tipoDano || "", incapacita:!!base.incapacita, ventajaContra:!!base.ventajaContra, desventaja:!!base.desventaja };
  c.combate = await q(sb.rpc("dm_aplicar_estado", { p:c.id, objetivo:objetivoId, estado }));
  const e = entradaDe(c, objetivoId);
  return ` **${e?.nombre || ""} queda ${ef.estado.toLowerCase()}** (${rondas} turno${rondas === 1 ? "" : "s"}${estado.dano ? `, ${estado.dano} de daño por turno` : ""}).`;
}
const efectoTxt2 = ef => ef?.estado ? `${ef.estado} ${+ef.rondas || 1}t${ef.sv ? ` (salv. ${ef.sv} CD ${ef.cd})` : ""}` : "";

/* ---------- acciones de los monstruos ---------- */
// Cada monstruo con sus ataques (at, daño) y habilidades (salvación sv contra CD, mitad de daño si la supera, efecto con estado)
const _a = (n, at, dano, tipo, efecto) => ({ n, at, dano, tipo, efecto });
const _s = (n, sv, cd, dano, tipo, mitad, efecto) => ({ n, sv, cd, dano, tipo, mitad, efecto });
const ACCIONES_MON = {
  "Rata gigante":[_a("Mordisco",4,"1d4+2","perforante")],
  "Kobold":[_a("Daga",4,"1d4+2","perforante"), _a("Honda",4,"1d4+2","contundente")],
  "Bandido":[_a("Cimitarra",3,"1d6+1","cortante"), _a("Ballesta ligera",3,"1d8+1","perforante")],
  "Cultista":[_a("Cimitarra",3,"1d6+1","cortante"), _s("Maldición oscura","SAB",11,"","",false,{ estado:"Asustado", rondas:2 })],
  "Cangrejo gigante":[_a("Pinza",3,"1d6+1","contundente",{ estado:"Apresado", rondas:2 })],
  "Goblin":[_a("Cimitarra",4,"1d6+2","cortante"), _a("Arco corto",4,"1d6+2","perforante")],
  "Esqueleto":[_a("Espada corta",4,"1d6+2","perforante"), _a("Arco corto",4,"1d6+2","perforante")],
  "Zombi":[_a("Golpe",3,"1d6+1","contundente")],
  "Lobo":[_a("Mordisco",4,"2d4+2","perforante",{ estado:"Derribado", rondas:1, sv:"FUE", cd:11 })],
  "Orco":[_a("Gran hacha",5,"1d12+3","cortante",{ estado:"Sangrando", rondas:2, sv:"CON", cd:12 }), _a("Jabalina",5,"1d6+3","perforante")],
  "Hobgoblin":[_a("Espada larga",3,"1d8+1","cortante"), _a("Arco largo",3,"1d8+1","perforante")],
  "Sombra":[_a("Toque debilitante",4,"2d6+2","necrótico",{ estado:"Ralentizado", rondas:2 })],
  "Gnoll":[_a("Mordisco",4,"1d4+2","perforante"), _a("Lanza",4,"1d6+2","perforante"), _a("Arco largo",3,"1d8+1","perforante")],
  "Osgo":[_a("Lucero del alba",4,"2d8+2","perforante"), _a("Jabalina",4,"2d6+2","perforante")],
  "Necrófago":[_a("Garras",4,"2d4+2","cortante",{ estado:"Paralizado", rondas:1, sv:"CON", cd:10 }), _a("Mordisco",2,"2d6+2","perforante")],
  "Lobo terrible":[_a("Mordisco",5,"2d6+3","perforante",{ estado:"Derribado", rondas:1, sv:"FUE", cd:13 })],
  "Araña gigante":[_a("Mordisco venenoso",5,"1d8+3","perforante",{ estado:"Veneno", rondas:3, sv:"CON", cd:11 }), _s("Telaraña","DES",12,"","",false,{ estado:"Apresado", rondas:2 })],
  "Oso pardo":[_a("Mordisco",6,"1d8+4","perforante"), _a("Garras",6,"2d6+4","cortante",{ estado:"Sangrando", rondas:2 })],
  "Ogro":[_a("Gran clava",6,"2d8+4","contundente",{ estado:"Derribado", rondas:1, sv:"FUE", cd:14 }), _a("Jabalina",6,"2d6+4","perforante")],
  "Capitán bandido":[_a("Cimitarra",5,"1d6+3","cortante"), _a("Daga",5,"1d4+3","perforante"), _s("Grito de mando","SAB",13,"","",false,{ estado:"Asustado", rondas:1 })],
  "Gárgola":[_a("Mordisco",4,"1d6+2","perforante"), _a("Garras",4,"1d6+2","cortante")],
  "Mímico":[_a("Pseudópodo pegajoso",5,"1d8+3","contundente",{ estado:"Apresado", rondas:2 }), _a("Mordisco",5,"1d8+3","perforante")],
  "Tumulario":[_a("Espada larga",4,"1d8+2","cortante"), _a("Drenar vida",4,"1d6+2","necrótico",{ estado:"Ralentizado", rondas:2, sv:"CON", cd:13 })],
  "Oso lechuza":[_a("Garras",7,"2d8+5","cortante",{ estado:"Apresado", rondas:1 }), _a("Pico",7,"1d10+5","perforante")],
  "Mantícora":[_a("Andanada de púas",5,"1d8+3","perforante"), _a("Garra",5,"1d6+3","cortante")],
  "Trol":[_a("Mordisco",7,"1d6+4","perforante"), _a("Garras",7,"2d6+4","cortante",{ estado:"Sangrando", rondas:2 })],
  "Hechicero cultista":[_a("Rayo de fuego",5,"2d10","fuego",{ estado:"Ardiendo", rondas:2 }), _s("Retener persona","SAB",13,"","",false,{ estado:"Paralizado", rondas:2 }), _s("Manos ardientes","DES",13,"3d6","fuego",true)],
  "Basilisco joven":[_a("Mordisco",5,"2d6+3","perforante",{ estado:"Veneno", rondas:2 }), _s("Mirada pétrea","CON",12,"","",false,{ estado:"Paralizado", rondas:1 })]
};
MONSTRUOS.push({ n:"Hechicero cultista", vd:"2", ca:12, pg:40, at:5, dano:"2d10", mod:2 }, { n:"Basilisco joven", vd:"3", ca:15, pg:52, at:5, dano:"2d6+3", mod:-1 });
const accionesDe = e => Array.isArray(e?.acc) && e.acc.length ? e.acc : (ACCIONES_MON[e?.base] || [{ n:"Ataque", at:+e?.at || 0, dano:e?.dano || "1d6" }]);
const accionTxt = x => x.sv ? `${x.n}: salvación de ${AB_N[x.sv]} CD ${x.cd}${x.dano ? `, ${x.dano}${x.mitad ? " (mitad si la supera)" : ""}` : ""}${x.efecto ? ` → ${efectoTxt2(x.efecto)}` : ""}`
  : `${x.n}: ${sgn(+x.at) || "+0"} al ataque, ${x.dano}${x.tipo ? " " + x.tipo : ""}${x.efecto ? ` → ${efectoTxt2(x.efecto)}` : ""}`;

// Tarjeta del DM cuando le toca a un enemigo: elige acción, objetivo, dados y la app resuelve (como el formulario del jugador)
function tarjetaEnemigo(c, grupo){
  const k = cb(c), act = actorActual(c); if (!act || act.tipo !== "enemigo" || +act.pg <= 0) return "";
  const acc = accionesDe(act), i = Math.min(+(S.eaAcc?.[act.id] ?? 0), acc.length - 1), x = acc[i] || acc[0];
  const pjs = k.orden.filter(e => e.tipo === "pj").map(e => pjById(e.id)).filter(Boolean);
  const obj = pjById(S.eaObj) && pjs.some(p => p.id === S.eaObj) ? S.eaObj : pjs[0]?.id, m = obj && !x.sv ? modoAtaque(c, act.id, obj) : { modo:"normal", por:[] };
  return `<div class="acciones"><div class="accion mio enemigo">
    <div><b>Turno de ${esc(act.nombre)}</b> <span class="small muted">CA ${act.ca} · ${act.pg}/${act.pgMax} PG</span> ${chipsEstados(act)}</div>
    <div class="row ataque-form">
      <label class="field"><span>Acción</span><select id="ea-acc" data-e="${esc(act.id)}">${acc.map((a, j) => `<option value="${j}" ${j === i ? "selected" : ""}>${esc(a.n)}${a.sv ? ` (salv. ${a.sv} CD ${a.cd})` : ` ${sgn(+a.at) || "+0"}`}</option>`).join("")}</select></label>
      <label class="field"><span>Objetivo</span><select id="ea-obj">${pjs.map(p => `<option value="${p.id}" ${p.id === obj ? "selected" : ""}>${esc(p.nombre)} (CA ${derive(p).ca} · ${c.pgAct?.[p.id] ?? derive(p).pg} PG)</option>`).join("")}</select></label>
      ${c.dadosFisicos ? `<label class="field" style="max-width:120px"><span>${x.sv ? "d20 de su salvación" : "d20 del ataque"}</span>${inputDado(`id="ea-d20"`)}</label>${x.dano ? `<label class="field" style="max-width:110px"><span>Dados de daño</span>${inputDado(`id="ea-dano"`, "suma")}</label>` : ""}` : ""}
      <button class="btn sm primary" data-act="cb-ea-usar" ${S.busy || !pjs.length ? "disabled" : ""}>${x.sv ? "Usar" : "Atacar"}</button>
      <span data-confirm="ea-huir"><button class="btn sm ghost" data-act="cb-ea-huir">Huir</button></span>
    </div>
    <span class="small">${esc(accionTxt(x))}</span> ${modoTxt(m, c.dadosFisicos)}
  </div></div>`;
}
async function accionEnemigo(c){
  const e = actorActual(c); if (!e || e.tipo !== "enemigo") return;
  const x = accionesDe(e)[+$("#ea-acc").value || 0], p = pjById($("#ea-obj")?.value); if (!x || !p) return;
  const d = derive(p), fis = c.dadosFisicos;
  let t, dmg = null, mult = 1, efOk = false, r;
  try {
    if (x.sv){
      const { mod } = modTirada(p, "sv:" + x.sv); r = tirarCon(c, `1d20${sgn(mod)}`, `Salvación de ${AB_N[x.sv]} de ${p.nombre}`, "normal", $("#ea-d20")?.value);
      const pasa = !r.pifia && (r.crit || r.total >= x.cd); mult = pasa ? (x.mitad ? 0.5 : 0) : 1; efOk = !pasa;
      t = `${e.nombre} usa ${x.n} contra ${p.nombre}: salvación de ${AB_N[x.sv]} ${lineaTirada(r)} contra CD ${x.cd}: ${pasa ? "**la supera**." : "**falla**."}`;
      if (x.dano && mult > 0) dmg = tirarCon(c, x.dano, `Daño de ${x.n}`, "normal", $("#ea-dano")?.value);
    } else {
      const m = modoAtaque(c, e.id, p.id); r = tirarCon(c, `1d20${sgn(+x.at)}`, `${x.n} de ${e.nombre}`, m.modo, $("#ea-d20")?.value);
      const impacta = !r.pifia && (r.crit || r.total >= d.ca); efOk = impacta;
      t = `${e.nombre} ataca a ${p.nombre} con ${x.n}: ${lineaTirada(r)}${m.modo !== "normal" ? ` (${m.modo}: ${m.por.join(", ")})` : ""} contra CA ${d.ca}: ${impacta ? (r.crit ? "**¡crítico!**" : "**impacta**.") : "falla."}`;
      if (impacta && x.dano) dmg = tirarCon(c, r.crit ? doblarDados(x.dano) : x.dano, `Daño de ${x.n}`, "normal", $("#ea-dano")?.value);
    }
  } catch (er) { toast(esc(er.message)); return; }
  S.busy = true;
  try {
    if (dmg){ const total = Math.max(0, Math.floor(dmg.total * mult)), nuevo = await aplicarDano(c, p.id, total);
      t += ` Daño ${lineaTirada(dmg)}${mult === 0.5 ? ` → mitad: **${total}**` : ""}${x.tipo ? " " + x.tipo : ""}. ${trasDano(c, p.id, nuevo)}`; dmg = { ...dmg, total }; }
    if (efOk && x.efecto){
      let aplica = true;
      if (x.efecto.sv && !x.sv){ const { mod } = modTirada(p, "sv:" + x.efecto.sv), dd = rnd(20), tot = dd + mod; aplica = dd !== 20 && tot < x.efecto.cd;
        t += ` Salvación de ${AB_N[x.efecto.sv]} contra ${x.efecto.estado.toLowerCase()}: d20 [${dd}] ${sgn(mod) || "+0"} = ${tot} contra CD ${x.efecto.cd}: ${aplica ? "falla." : "la supera."}`; }
      if (aplica) t += await ponerEstado(c, p.id, x.efecto);
    }
    await anadirLog(c, [{ r:"sys", t }]);
    toast(`<b>${esc(e.nombre)}</b>: ${esc(x.n)} contra ${esc(p.nombre)}. ${efOk ? (dmg ? `${dmg.total} de daño.` : "Le afecta.") : x.sv && mult ? `Mitad de daño: ${dmg?.total || 0}.` : "No le afecta."} Pasa el turno.`, 5000);
    await pasarTurnoTras(c, e.id);
  } catch (er) { toast(esc(errorTexto(er))); }
  S.busy = false; render();
}
// Huir: quien huye sale del combate (y el turno pasa al siguiente)
async function huir(c, id){
  const e = entradaDe(c, id); if (!e) return;
  S.busy = true;
  try {
    if (actorActual(c)?.id === id) await pasarTurnoTras(c, id);
    c.combate = await q(sb.rpc("dm_huir", { p:c.id, quien:id }));
    const f = await q(sb.from("dm_partidas").select("log").eq("id", c.id).single()); c.log = f.log || c.log;
    toast(`${esc(e.nombre)} huye del combate.`);
  } catch (er) { toast(esc(errorTexto(er))); }
  S.busy = false; render();
}
// El jugador intenta huir: Destreza (Acrobacias si es competente) contra CD 10; si falla, pierde el turno
async function intentarHuir(c, pjId){
  const p = pjById(pjId); if (!p) return;
  const { mod } = modTirada(p, "hab:Acrobacias");
  let r; try { r = tirarCon(c, `1d20${sgn(mod)}`, `${p.nombre} intenta huir`, "normal", $("#fh-d20")?.value); } catch (er) { toast(esc(er.message)); $("#fh-d20")?.focus(); return; }
  const ok = !r.pifia && (r.crit || r.total >= 10);
  S.busy = true;
  try { await publicar(c, p.id, `${p.nombre} intenta huir del combate: Acrobacias ${lineaTirada(r)} contra CD 10: ${ok ? "**lo consigue**." : "**no lo consigue** y pierde el turno."}`); } catch {}
  S.busy = false;
  if (ok) return huir(c, p.id);
  await pasarTurnoTras(c, p.id); render();
}
const huirHtml = (c, pjId) => `<div class="row huir">${c.dadosFisicos ? inputDado(`id="fh-d20" aria-label="d20 para huir"`) : ""}<span data-confirm="huir-${pjId}"><button class="btn sm ghost" data-act="cb-huir" data-pj="${pjId}" ${S.busy ? "disabled" : ""}>Huir del combate</button></span><span class="small muted">Acrobacias contra CD 10; si fallas, pierdes el turno.</span></div>`;

/* ---------- panel del DM: estados a mano y quién entra en el combate ---------- */
function estadosDMHtml(c){
  const k = cb(c); if (!k.activo || !k.orden.length) return "";
  return `<details class="cb-est"><summary class="small">Poner un estado a mano</summary><div class="row cb-add">
    <select id="cbe-obj" aria-label="A quién">${k.orden.map(e => `<option value="${esc(e.id)}">${esc(e.nombre)}</option>`).join("")}</select>
    <select id="cbe-est" aria-label="Estado">${Object.keys(ESTADOS).map(n => `<option>${n}</option>`).join("")}</select>
    <input type="number" id="cbe-r" min="1" max="10" value="1" aria-label="Turnos" style="width:64px">
    <button class="btn sm" data-act="cb-est-poner">Poner</button></div>
    <p class="small muted">${Object.entries(ESTADOS).slice(0, 4).map(([n, s]) => `<b>${n}:</b> ${s.t}`).join(" ")} Los estados duran los turnos indicados y se descuentan al empezar el turno de quien los sufre.</p></details>`;
}
function participantesHtml(c, grupo){
  if (cb(c).activo || !grupo.length) return "";
  const fuera = S.cbFuera?.[c.id] || [];
  return `<div class="cb-part"><span class="small"><b>Entran en el combate:</b></span>${grupo.map(p => `<label class="switch small"><input type="checkbox" data-cb-part="${p.id}" ${fuera.includes(p.id) ? "" : "checked"}> ${esc(p.nombre)}</label>`).join("")}</div>`;
}
const participantesCombate = (c, grupo) => grupo.filter(p => !(S.cbFuera?.[c.id] || []).includes(p.id));

document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-act^='cb-e'],[data-act='cb-huir'],[data-act='cb-meter']"); if (!t) return;
  const c = partida(S.playId); if (!c) return;
  switch (t.dataset.act){
    case "cb-ea-usar": accionEnemigo(c); break;
    case "cb-ea-huir": { const e = actorActual(c); if (e) confirmar(t, () => huir(c, e.id), "Sí, huye"); } break;
    case "cb-huir": confirmar(t, () => intentarHuir(c, t.dataset.pj), "Sí, intentar huir"); break;
    case "cb-est-poner": { const id = $("#cbe-obj").value, n = $("#cbe-est").value, r = +$("#cbe-r").value || 1;
        S.busy = true; ponerEstado(c, id, { estado:n, rondas:r }).then(txt => anadirLog(c, [{ r:"sys", t:txt.trim() }])).catch(e => toast(esc(errorTexto(e)))).finally(() => { S.busy = false; render(); }); } break;
    case "cb-est-quitar": { S.busy = true; q(sb.rpc("dm_aplicar_estado", { p:c.id, objetivo:t.dataset.id, estado:{ nombre:t.dataset.n, rondas:0 } }))
        .then(k => { c.combate = k; return anadirLog(c, [{ r:"sys", t:`${entradaDe(c, t.dataset.id)?.nombre || ""} ya no está ${t.dataset.n.toLowerCase()}.` }]); }).catch(e => toast(esc(errorTexto(e)))).finally(() => { S.busy = false; render(); }); } break;
    case "cb-meter": { const p = pjById($("#cb-meter-pj")?.value); if (!p) break;
        editarCombate(c, k => { if (!k.orden.some(e => e.id === p.id)) k.orden.push({ id:p.id, tipo:"pj", nombre:p.nombre, mod:derive(p).ini, pgMax:derive(p).pg, dado:rnd(20), estados:[] }); }, [{ r:"sys", t:`${p.nombre} se une al combate.` }]); } break;
  }
});
document.addEventListener("change", (ev) => {
  const t = ev.target;
  if (t.matches("[data-cb-part]")){ const c = partida(S.playId); if (!c) return; S.cbFuera ||= {}; const f = new Set(S.cbFuera[c.id] || []); t.checked ? f.delete(t.dataset.cbPart) : f.add(t.dataset.cbPart); S.cbFuera[c.id] = [...f]; render(); }
  if (t.id === "ea-acc"){ S.eaAcc ||= {}; S.eaAcc[t.dataset.e] = +t.value; render(); }
  if (t.id === "ea-obj"){ S.eaObj = t.value; render(); }
  if (t.id === "fa-obj"){ const c = partida(S.playId), h = $("#fa-modo"); if (c && h) h.innerHTML = modoTxt(modoAtaque(c, vozActual(c), t.value), c.dadosFisicos); }
});
