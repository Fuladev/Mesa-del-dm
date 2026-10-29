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

