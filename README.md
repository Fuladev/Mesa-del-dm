# Mesa del Dungeon Master

Web en español para jugar a D&D 5ª edición (reglas SRD) con amigos:

- **Cuentas de usuario.** Cada persona entra con su correo y elige un nombre de usuario.
- **Personajes compartidos.** Todos ven las fichas de todos, con el nombre de su jugador. Solo el dueño puede editar las suyas.
- **Razas y facciones de la mesa.** Cualquiera puede crear razas o facciones nuevas. La web pide la información obligatoria de cada tipo y la IA puede completar lo que falte. Todos pueden usarlas para crear personajes, pero solo quien las creó puede editarlas o borrarlas.
- **Partidas.** La IA genera la campaña, o se escribe a mano. Cada jugador puede llevar uno o varios de sus personajes a la misma partida.
- **IA como Dungeon Master.** La IA narra en vivo para todo el grupo, pide tiradas con botones y tira los dados de los monstruos con un generador aleatorio real.
- **DM propio.** Si tenéis DM humano, dirige desde la pantalla «Jugar» sin necesidad de IA: narra en el chat, pide tiradas con botones y tira por los enemigos a la vista de todos. Si la IA está activa, además le asesora en privado. Incluye un control de iniciativa y notas privadas.
- **Combate en la mesa.** Quien dirige añade enemigos del SRD (o propios) y una calculadora le dice si el encuentro es fácil, medio, difícil o mortal para su grupo y cuánta experiencia da. Al empezar se tira la iniciativa y cada jugador ve en su chat el orden y de quién es el turno. En su turno, el jugador ataca desde un formulario: la app compara con la CA y el daño se aplica solo, igual que los ataques de los enemigos. Cada jugador ve siempre los PG que le quedan a sus personajes.
- **Dados físicos.** Si preferís tirar dados de verdad, el DM lo activa en «Opciones de la mesa». Cada jugador escribe lo que saca en su propio panel (peticiones del DM, iniciativa, ataques y daño, o cualquier tirada por su cuenta) y la app suma los bonificadores de su ficha: habilidades con competencia, salvaciones y ataques.
- **Cada uno ve lo suyo.** Cuando hablas como un personaje, el lateral muestra solo su ficha, sus PG y sus tiradas, y te aparece una tarjeta cada vez que el DM le pide algo. Cuando hablas como DM, ves el combate, tu guion y el estado de cada jugador: sus PG, qué tiradas tiene pendientes, si le falta la iniciativa y lo último que ha hecho.
- **Experiencia y niveles.** Al terminar un combate, cada personaje recibe su parte de la experiencia de los enemigos derrotados. El DM puede dar más por misiones o escenas. Al llegar a los PX del SRD, el personaje sube de nivel solo (y con él sus PG y su bonificador de competencia). Cada personaje tiene una barra de progreso hacia el siguiente nivel en la mesa, en la lista y en su ficha.
- **Catálogo único.** En una sola pestaña están armas, hechizos, armaduras, pociones y equipo, con buscador y filtro por tipo y por clase. Vienen los del SRD y cualquiera puede crear más (solo su autor los edita): armas con dado, bonificaciones y el estado que causan al impactar; hechizos con nivel, clases, daño o curación y estado (Retener persona paraliza, Telaraña apresa…); armaduras con su CA; pociones que curan, quitan o dan un estado, o que se lanzan.
- **Inventario.** Cada personaje guarda su oro, pociones, objetos, armas y armaduras. Las armas equipadas aparecen en el formulario de ataque con sus bonificaciones; la armadura y el escudo equipados fijan la CA. Las pociones se usan desde el inventario y las arrojadizas (aceite de fuego) se lanzan en combate y se gastan. Con el oro se compra en el catálogo.
- **Hechizos y magia.** Solo se asignan a clases que lanzan conjuros, y solo los de su clase. En la mesa, los de daño o control salen en el formulario de ataque (la app tira la salvación del enemigo contra la CD del personaje) y los de curación se lanzan sobre cualquier compañero.
- **Enemigos con acciones.** Cada monstruo tiene sus ataques y habilidades (salvaciones con mitad de daño, efectos como derribar o envenenar). En su turno, el DM elige la acción y el objetivo en una tarjeta como la de los jugadores y la app lo resuelve.
- **Estados alterados.** Paralizado, aturdido y dormido pierden el turno; derribado, apresado y cegado dan ventaja a quien ataca; sangrando, ardiendo, veneno y congelado quitan PG al empezar cada turno. Duran los turnos indicados, se ven en el orden de combate y el DM puede ponerlos o quitarlos a mano.
- **Huir y quién combate.** Jugadores (Acrobacias contra CD 10) y enemigos pueden huir del combate. Al empezar, el DM elige qué personajes entran y puede meter a otros después.
- **Editar todo el personaje.** Al crear o editar un personaje se puede cambiar su oro, sus armas (daño, bonificaciones, si están equipadas), objetos, pociones y hechizos.
- **Recompensas y fin de partida.** El DM da a cada jugador su experiencia, oro y objetos (que van a su inventario). «Terminar partida» abre el reparto final de recompensas, acaba el combate y cierra el chat hasta que el DM la reabra.
- **Avisos en las fichas.** La web avisa si quedan puntos sin gastar, si la característica principal de la clase está baja o si falta la CA de la armadura.
- **Wiki de dados para principiantes.** Se puede ver sin cuenta.

## Cómo está hecho

| Pieza | Dónde |
|---|---|
| Web estática (HTML + JS sin compilar) | `index.html`, `styles.css`, `config.js`, `app.js` (servida con GitHub Pages) |
| Código fuente de la web, por partes | `src/`. Ejecuta `./build.sh` para regenerar `app.js` |
| Base de datos, cuentas y tiempo real | Supabase, proyecto `dd-impresion-3d`, tablas con prefijo `dm_` |
| Esquema y permisos (RLS) | `supabase/migrations/` |
| Llamadas a la IA (Claude) | Función `dm-ia` de Supabase: `supabase/functions/dm-ia/index.ts` |
| Entrar con nombre de usuario | Función `dm-entrar`: busca el correo en el servidor, así nunca llega al navegador |

La clave de Anthropic **nunca** está en el navegador. Vive como secreto de la función `dm-ia`, que comprueba que quien llama tiene sesión iniciada y aplica un límite de 200 llamadas por usuario y día.

## Puesta en marcha

1. **Activar GitHub Pages.** En el repositorio, ve a *Settings → Pages → Build and deployment*. Elige *Deploy from a branch*, rama `main` y carpeta `/ (root)`. La web quedará en `https://fuladev.github.io/Mesa-del-dm/`.
2. **Configurar la URL en Supabase.** En el panel de Supabase ve a *Authentication → URL Configuration*:
   - *Site URL*: `https://fuladev.github.io/Mesa-del-dm/`
   - *Redirect URLs*: añade `https://fuladev.github.io/Mesa-del-dm/**`

   Sin esto, los enlaces de confirmación de correo y de cambio de contraseña llevan a una dirección equivocada.
3. **Clave de Anthropic.** En *Edge Functions → Secrets*, crea `ANTHROPIC_API_KEY` con tu clave de [console.anthropic.com](https://console.anthropic.com). Se paga por uso. En la consola de Anthropic puedes poner un límite de gasto mensual para no llevarte sorpresas.
4. *(Opcional)* **Confirmación de correo.** Viene activada en *Authentication → Sign In / Providers → Email*. Si la desactivas, tus amigos podrán entrar nada más registrarse.
5. *(Recomendado)* En *Authentication → Attack Protection*, activa la protección contra contraseñas filtradas.

> Las cuentas de usuario de Supabase se comparten con la app de impresión 3D del mismo proyecto. Los datos de cada app están en tablas distintas y con permisos separados, así que no se mezclan.

## Cambiar el código

- Edita los archivos de `src/` y ejecuta `./build.sh`. Así se regenera `app.js`, que es el archivo que carga la web.
- El límite diario de IA está en `LIMITE_DIARIO`, dentro de `supabase/functions/dm-ia/index.ts`. El modelo está en `MODELO`.
