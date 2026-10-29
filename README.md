# Mesa del Dungeon Master

Web en español para jugar a D&D 5ª edición (reglas SRD) con amigos:

- **Cuentas de usuario.** Cada persona entra con su correo y elige un nombre de usuario.
- **Personajes compartidos.** Todos ven las fichas de todos, con el nombre de su jugador. Solo el dueño puede editar las suyas.
- **Razas y facciones de la mesa.** Cualquiera puede crear razas o facciones nuevas. La web pide la información obligatoria de cada tipo y la IA puede completar lo que falte. Todos pueden usarlas para crear personajes, pero solo quien las creó puede editarlas o borrarlas.
- **Partidas.** La IA genera la campaña. Cada jugador se une con **un solo personaje** por partida, y la base de datos lo garantiza.
- **IA como Dungeon Master.** La IA narra en vivo para todo el grupo, pide tiradas con botones y tira los dados de los monstruos con un generador aleatorio real.
- **DM propio.** Si tenéis DM humano, la IA le asesora en privado. Incluye un control de iniciativa y notas privadas.
- **Wiki de dados para principiantes.** Se puede ver sin cuenta.

## Cómo está hecho

| Pieza | Dónde |
|---|---|
| Web estática (HTML + JS sin compilar) | `index.html`, `styles.css`, `config.js`, `app.js` (servida con GitHub Pages) |
| Código fuente de la web, por partes | `src/`. Ejecuta `./build.sh` para regenerar `app.js` |
| Base de datos, cuentas y tiempo real | Supabase, proyecto `dd-impresion-3d`, tablas con prefijo `dm_` |
| Esquema y permisos (RLS) | `supabase/migrations/` |
| Llamadas a la IA (Claude) | Función `dm-ia` de Supabase: `supabase/functions/dm-ia/index.ts` |

La clave de Anthropic **nunca** está en el navegador. Vive como secreto de la función `dm-ia`, que comprueba que quien llama tiene sesión iniciada y aplica un límite de 200 llamadas por usuario y día.

## Puesta en marcha

1. **Activar GitHub Pages.** En el repositorio, ve a *Settings → Pages → Build and deployment*. Elige *Deploy from a branch*, rama `main` y carpeta `/ (root)`. La web quedará en `https://fuladev.github.io/mesa-del-dm/`.
2. **Configurar la URL en Supabase.** En el panel de Supabase ve a *Authentication → URL Configuration*:
   - *Site URL*: `https://fuladev.github.io/mesa-del-dm/`
   - *Redirect URLs*: añade `https://fuladev.github.io/mesa-del-dm/**`

   Sin esto, los enlaces de confirmación de correo y de cambio de contraseña llevan a una dirección equivocada.
3. **Clave de Anthropic.** En *Edge Functions → Secrets*, crea `ANTHROPIC_API_KEY` con tu clave de [console.anthropic.com](https://console.anthropic.com). Se paga por uso. En la consola de Anthropic puedes poner un límite de gasto mensual para no llevarte sorpresas.
4. *(Opcional)* **Confirmación de correo.** Viene activada en *Authentication → Sign In / Providers → Email*. Si la desactivas, tus amigos podrán entrar nada más registrarse.
5. *(Recomendado)* En *Authentication → Attack Protection*, activa la protección contra contraseñas filtradas.

> Las cuentas de usuario de Supabase se comparten con la app de impresión 3D del mismo proyecto. Los datos de cada app están en tablas distintas y con permisos separados, así que no se mezclan.

## Cambiar el código

- Edita los archivos de `src/` y ejecuta `./build.sh`. Así se regenera `app.js`, que es el archivo que carga la web.
- El límite diario de IA está en `LIMITE_DIARIO`, dentro de `supabase/functions/dm-ia/index.ts`. El modelo está en `MODELO`.
