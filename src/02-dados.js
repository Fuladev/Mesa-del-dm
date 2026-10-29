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

