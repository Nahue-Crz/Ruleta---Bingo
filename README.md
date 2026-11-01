# Party Spin 1.0

Ruletas personalizables y bingo local para jugar con amigos. Está hecho con HTML, CSS y JavaScript, sin dependencias, cuenta ni servidor.

## Abrir en tu computadora

1. Descomprimí el archivo ZIP, si recibiste la versión comprimida.
2. Abrí `index.html` con Chrome, Firefox, Edge o un navegador móvil moderno.

También podés servir la carpeta con un servidor HTTP simple para probarla como se verá publicada. Desde la carpeta `party-spin`, ejecutá `python -m http.server 8000` y abrí `http://localhost:8000/`. No hace falta instalar paquetes del proyecto.

## Jugar

- **Ruletas:** girá cada una o las dos a la vez. El indicador fijo de arriba marca el resultado. El engranaje permite cambiar sectores, colores, emojis, textos centrales y sonidos. Las modificaciones se guardan automáticamente en este navegador. Podés copiar, compartir y consultar o limpiar el historial.
- **Bingo:** elegí un cartón 3 × 3 o 5 × 5. Marcá las casillas manualmente. El panel de anfitrión sortea números del 1 al 75 sin repetir. Las líneas y el cartón completo se detectan automáticamente. La partida queda guardada localmente.
- **Para jugar por Discord:** compartí la pantalla del anfitrión o anunciá cada número por voz. Cada participante puede abrir su propio cartón y marcarlo; la aplicación no sincroniza dispositivos.

Las configuraciones se exportan e importan desde el engranaje como un archivo JSON. La importación valida los datos antes de reemplazar los sectores actuales. Tanto la configuración como el historial y la partida de bingo se guardan mediante `localStorage` en el dispositivo y navegador que uses.

## Publicar gratis en GitHub Pages

1. Creá un repositorio **público** en GitHub, por ejemplo `party-spin`.
2. Subí **el contenido de esta carpeta** al nivel principal del repositorio. `index.html` debe quedar en la raíz, junto a `css/` y `js/`; no subas solamente el ZIP.
3. En el repositorio abrí **Settings → Pages**. En **Build and deployment**, elegí **Deploy from a branch**, seleccioná `main` y `/(root)`, y pulsá **Save**.
4. Cuando termine la publicación, GitHub mostrará el enlace. Para un repositorio llamado `party-spin`, normalmente será `https://TU_USUARIO.github.io/party-spin/`.

La publicación desde una rama y carpeta raíz está documentada en la [guía oficial de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Archivos

```text
index.html
css/style.css
js/storage.js
js/roulette.js
js/bingo.js
js/app.js
README.md
.nojekyll
```

La aplicación no usa conexiones de red ni servicios externos. En GitHub Pages, los datos de `localStorage` siguen siendo propios de cada navegador; exportar el JSON sirve para compartir configuraciones de ruletas entre amigos.
