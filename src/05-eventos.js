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
  let r; try { r = rollNotation(not, mode); } catch (e) { toast(esc(e.message)); return; }
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
    case "part-salir": confirmar(t, () => salirDe(S.campSel, S.me), "Sí, salir"); break;
    case "part-quitar": salirDe(S.campSel, t.dataset.u); break;
    case "ir-jugar": S.playId = id; ir("#jugar"); break;
    case "ir-asistente": S.dmId = id; ir("#asistente"); break;
    // jugar
    case "play-start": enviarDM(""); break;
    case "play-send": { const v = $("#play-in").value.trim(); if (!v){ $("#play-st").textContent = "Escribe qué hace tu personaje o tira los dados que pidió el DM."; break; } enviarDM(v); } break;
    case "play-hint": { const box = $("#play-in"); if (!box) break; box.value = t.dataset.t; S.draft = box.value; box.focus(); } break;
    case "play-resumen": { const c = partida(S.playId); if (!c) break; S.busy = true; render();
        try { await resumir(c, true); await q(sb.from("dm_partidas").update({ resumen:c.resumen, resumen_idx:c.resumenIdx }).eq("id", c.id)); toast("Historia resumida. El DM la recordará."); }
        catch (e) { toast(esc(e?.code ? iaMsg(e) : errorTexto(e))); }
        S.busy = false; render(); } break;
    case "play-reset": confirmar(t, async () => { const c = partida(id);
        try { await guardar(sb.from("dm_partidas").update({ log:[], resumen:"", resumen_idx:0, usados:{}, pg_act:{}, escribiendo:null, escribiendo_ts:null }).eq("id", id), "Partida reiniciada.");
          Object.assign(c, { log:[], resumen:"", resumenIdx:0, usados:{}, pgAct:{}, escribiendo:null }); } catch {}
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
