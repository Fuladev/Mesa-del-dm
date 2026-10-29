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
        <label class="field"><span>Correo</span><input type="email" id="a-correo" required autocomplete="email"></label>
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
      <a class="path" href="#campanas"><span class="step">Paso 2</span><h3>Partidas</h3><p>Genera una campaña y que cada jugador se una con uno de sus personajes.</p><span class="chips"><span class="chip">${S.partidas.length} partida${S.partidas.length===1?"":"s"}</span></span></a>
      <a class="path" href="#jugar"><span class="step">Paso 3</span><h3>A jugar</h3><p>La IA hace de DM y os pide las tiradas, o asesora en privado a vuestro DM.</p></a>
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
function cardPJ(p){
  const d = derive(p), fac = p.faccion_id ? facById(p.faccion_id) : null, mio = p.dueno === S.me;
  return `<article class="pj">
    <div class="pj-h"><div><h3>${esc(p.nombre || "Sin nombre")}</h3><div class="small muted">${esc(d.raza.nombre)} · ${esc(p.clase)} · nivel ${p.nivel}${fac?` · ${esc(fac.nombre)}`:""}</div></div>${ownerChip(p.dueno)}</div>
    <div class="stats">${AB.map(k=>`<div class="stat"><span class="k">${k}</span><span class="m">${fm(modOf(d.sc[k]))}</span><span class="s">${d.sc[k]}</span></div>`).join("")}</div>
    <div class="chips"><span class="chip acc">PG ${d.pg}</span><span class="chip acc">CA ${d.ca}</span><span class="chip">Competencia ${fm(d.prof)}</span><span class="chip">Velocidad ${d.vel} pies</span></div>
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
    <div class="chips"><span class="chip acc">PG ${d.pg}</span><span class="chip acc">CA ${d.ca}</span><span class="chip">Iniciativa ${fm(d.ini)}</span><span class="chip">Competencia ${fm(d.prof)}</span><span class="chip">Velocidad ${d.vel} pies</span></div></div>
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
      ${S.partidas.length ? `<div class="camp-list">${S.partidas.map(c => { const yo = miParticipacion(c.id), n = participantesDe(c.id).length; return `<div class="camp-item"><div style="display:grid;gap:4px"><h3>${esc(c.titulo)}</h3><div class="small muted">${esc(c.tono||"")} · ${c.modo==="humano"?"DM propio":"IA como DM"} · ${n} jugador${n===1?"":"es"} ${c.ejemplo?'· <span class="tag-ej">ejemplo</span>':""}</div><div class="row">${ownerChip(c.creador)}${yo?`<span class="small">Juegas con <b>${esc(pjById(yo.personaje_id)?.nombre||"tu personaje")}</b></span>`:""}</div></div>
        <div class="row"><button class="btn sm" data-act="camp-ver" data-id="${c.id}">${yo||c.creador===S.me?"Abrir":"Ver y unirme"}</button>${puedoJugar(c)?`<button class="btn sm primary" data-act="${c.modo==="humano"?"ir-asistente":"ir-jugar"}" data-id="${c.id}">${c.modo==="humano"?"Asistente del DM":"Jugar"}</button>`:""}</div></div>`; }).join("")}</div>`
        : `<div class="empty"><p>Todavía no hay partidas. Genera una arriba o carga la partida de ejemplo desde Inicio.</p></div>`}
    </div>
  </section>`;
}
function vCampDetalle(c){
  const soyCreador = c.creador === S.me, yo = miParticipacion(c.id), mios = misPjs();
  const verSecretos = soyCreador && S.spoilers;
  const parts = participantesDe(c.id);
  return `<section class="view camp">
    <div class="panel-h"><div style="display:grid;gap:6px"><span class="label">${esc(c.ambiente||"")} · ${esc(c.tono||"")}</span><h1>${esc(c.titulo)}</h1>${ownerChip(c.creador)}</div>
      <div class="row"><button class="btn ghost" data-act="camp-volver">Todas las partidas</button>${puedoJugar(c)?`<button class="btn" data-act="ir-asistente" data-id="${c.id}">Asistente del DM</button><button class="btn primary" data-act="ir-jugar" data-id="${c.id}">Jugar con la IA</button>`:""}</div></div>
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
      <div class="panel-h"><h2>Jugadores</h2><span class="small muted">Un personaje por jugador</span></div>
      ${parts.length ? parts.map(x => { const p = pjById(x.personaje_id); return `<div class="part"><div style="display:grid;gap:2px"><b>${esc(p?.nombre || "Personaje borrado")}</b><span class="small muted">${p?esc(derive(p).raza.nombre)+" "+esc(p.clase)+" nivel "+p.nivel:""}</span></div><div class="row">${ownerChip(x.usuario_id)}${soyCreador && x.usuario_id!==S.me?`<button class="btn sm ghost" data-act="part-quitar" data-u="${x.usuario_id}">Quitar</button>`:""}</div></div>`; }).join("") : `<p class="small muted">Nadie se ha unido todavía.</p>`}
      <div class="row" style="align-items:end">
        ${mios.length ? `<label class="field" style="min-width:220px"><span>${yo?"Cambiar tu personaje":"Únete con uno de tus personajes"}</span><select id="part-pj">${mios.map(p=>`<option value="${p.id}" ${yo?.personaje_id===p.id?"selected":""}>${esc(p.nombre)} (${esc(p.clase)} ${p.nivel})</option>`).join("")}</select></label>
          <button class="btn primary" data-act="part-unir">${yo?"Cambiar personaje":"Unirme"}</button>${yo?`<span data-confirm="salir-${c.id}"><button class="btn ghost" data-act="part-salir">Salir de la partida</button></span>`:""}`
          : `<p class="small">Necesitas un personaje para unirte. <a href="#personajes" data-act="pj-nuevo">Crea uno</a>.</p>`}
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
    const r = await guardar(sb.from("dm_participantes").upsert({ partida_id:c.id, usuario_id:S.me, personaje_id:pj }, { onConflict:"partida_id,usuario_id" }).select().single(), "¡Estás dentro! Ya puedes jugar.");
    S.participantes = [...S.participantes.filter(x => !(x.partida_id === c.id && x.usuario_id === S.me)), r];
  } catch {}
  render();
}
async function salirDe(pid, uid){
  try { await guardar(sb.from("dm_participantes").delete().eq("partida_id", pid).eq("usuario_id", uid)); S.participantes = S.participantes.filter(x => !(x.partida_id === pid && x.usuario_id === uid)); } catch {}
  render();
}

/* ==================== JUGAR (IA como DM) ==================== */
function escribiendoOtro(c){ return c?.escribiendo && c.escribiendo !== S.me && c.escribiendoTs && (Date.now() - Date.parse(c.escribiendoTs) < 180000); }
function vJugar(){
  let c = S.playId && partida(S.playId);
  const mias = S.partidas.filter(puedoJugar);
  if (!c && mias.length){ c = mias.find(x => x.modo !== "humano") || mias[0]; S.playId = c.id; }
  if (!c) return `<section class="view"><h1>Jugar con la IA</h1><div class="empty"><h3>Únete primero a una partida</h3><p>Ve a Partidas, abre una y únete con uno de tus personajes, o genera una nueva.</p><div class="row"><a class="btn primary" href="#campanas">Ir a Partidas</a><button class="btn gold" data-act="ejemplo">Cargar ejemplo</button></div></div></section>`;
  const grupo = grupoDe(c.id), log = c.log || [], puedo = puedoJugar(c), otro = escribiendoOtro(c);
  const bloqueado = S.busy || otro || !puedo;
  return `<section class="view">
    <div class="table">
      <div class="chat">
        <div class="chat-h">
          <div style="display:grid;gap:2px;min-width:0"><span class="label">La IA es vuestro Dungeon Master</span><h2 style="font-size:1.35rem">${esc(c.titulo)}</h2></div>
          <select id="play-camp" aria-label="Cambiar de partida" style="width:auto;max-width:100%">${S.partidas.map(x=>`<option value="${x.id}" ${x.id===c.id?"selected":""}>${esc(x.titulo)}${puedoJugar(x)?"":" (no estás)"}</option>`).join("")}</select>
        </div>
        <div class="log" id="log">
          ${log.length ? log.map((m,i)=>msgHtml(m,i,c)).join("") : `<div class="msg sys"><p>La mesa está preparada. ${grupo.length?`Juegan: ${grupo.map(p=>`${esc(p.nombre)} (${esc(nombreUsuario(p.dueno))})`).join(", ")}.`:"Aún no hay personajes en esta partida."} Pulsa <b>Empezar la aventura</b> y el DM abrirá la escena. Todos los jugadores veréis la historia en vivo.</p></div>`}
          <div id="live">${otro?`<div class="msg dm"><span class="who">Dungeon Master</span>${thinking(esc(nombreUsuario(c.escribiendo))+" ha hablado; el DM está preparando la respuesta…")}</div>`:""}</div>
        </div>
        <div class="composer">
          ${!puedo ? `<p class="small">Estás mirando. Para participar, <a href="#campanas" data-act="camp-ver" data-id="${c.id}">únete con uno de tus personajes</a>.</p>` : `
          ${!log.length ? `<button class="btn primary" data-act="play-start" ${bloqueado?"disabled":""}>Empezar la aventura</button>` : ""}
          <textarea id="play-in" placeholder="¿Qué hace tu personaje? Ej.: Thorga examina la puerta en busca de trampas." ${S.busy?"disabled":""}>${esc(S.draft||"")}</textarea>
          <div class="row" style="justify-content:space-between">
            <div class="row">
              <button class="btn sm ghost" data-act="play-hint" data-t="Describe con más detalle lo que vemos a nuestro alrededor.">Más detalles</button>
              <button class="btn sm ghost" data-act="play-hint" data-t="Como somos principiantes, ¿qué opciones tenemos ahora y qué tirada necesitaría cada una?">¿Qué podemos hacer?</button>
              <button class="btn sm ghost" data-act="play-hint" data-t="Hacemos un descanso corto.">Descanso corto</button>
            </div>
            <button class="btn primary" data-act="play-send" ${bloqueado?"disabled":""}>Enviar</button>
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
        ${trayHtml()}
        ${puedo ? `<div class="panel">
          <h3>Opciones de la mesa</h3>
          <label class="switch"><input type="checkbox" id="opt-aprendiz" ${c.aprendiz!==false?"checked":""}> Modo aprendiz: el DM explica las reglas</label>
          <div class="row"><button class="btn sm" data-act="play-resumen" ${!bloqueado&&log.length>4?"":"disabled"}>Resumir historia hasta aquí</button>
          ${c.creador===S.me?`<span data-confirm="reset-${c.id}"><button class="btn sm ghost" data-act="play-reset" data-id="${c.id}" ${log.length?"":"disabled"}>Reiniciar partida</button></span>`:""}</div>
          ${c.resumen?`<details><summary class="small">Lo que recuerda el DM</summary><p class="small muted" style="margin-top:6px;white-space:pre-wrap">${esc(c.resumen)}</p></details>`:""}
        </div>` : ""}
      </aside>
    </div>
  </section>`;
}
function msgHtml(m, i, c){
  if (m.r === "dm") return `<div class="msg dm"><span class="who">Dungeon Master</span>${rich(m.t, {msgIdx:i, used:c.usados})}</div>`;
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
  const yo = miParticipacion(c.id);
  try { await q(sb.from("dm_partidas").update({ escribiendo:S.me, escribiendo_ts:new Date().toISOString() }).eq("id", c.id)); } catch (e) { toast(esc(errorTexto(e))); return; }
  if (texto) c.log.push({ r:"user", t:texto, u:S.me, pj:yo?.personaje_id || null, ts:Date.now() });
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
  } catch (e) { err = iaMsg(e); }
  recortar(c);
  try { await q(sb.from("dm_partidas").update({ log:c.log, resumen:c.resumen, resumen_idx:c.resumenIdx, usados:c.usados, escribiendo:null, escribiendo_ts:null }).eq("id", c.id)); }
  catch (e) { err ||= errorTexto(e); }
  S.partidas = S.partidas.map(x => x.id === c.id ? c : x);
  S.busy = false; render();
  if (err){ const st = $("#play-st"); if (st) st.textContent = err; }
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

