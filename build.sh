#!/bin/sh
# Une los trozos de src/ en app.js (el archivo que carga index.html).
cd "$(dirname "$0")" && cat src/01-base.js src/02-dados.js src/04-wiki.js src/03-app.js src/06-combate.js src/07-inventario.js src/08-hechizos.js src/09-estados.js src/10-catalogo.js src/05-eventos.js > app.js && echo "app.js listo"
