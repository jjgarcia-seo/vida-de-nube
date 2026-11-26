# Vida de Nube

Juego web tranquilo: eres una nube pequeña sobre un valle enorme. Bebes del lago, comes otras
nubes para crecer, llueves sobre campos y ciudades, lanzas rayos y tornados, y vives las cuatro
estaciones. Puedes ser una nube buena o una mala nube: el valle recuerda lo que haces.

Se juega en el navegador, en ordenador y en móvil, y se puede instalar en el móvil como una app.

## Jugar

- **Online**: cuando GitHub Pages esté activado, el juego está en
  `https://<tu-usuario>.github.io/<nombre-del-repositorio>/`.
- **En tu ordenador**: abre `index.html` en el navegador. Para probar la instalación como app
  hace falta servirlo: `npm start` y abre la dirección que aparece.

Controles: tocar o hacer clic en el mapa, o joystick en pantalla (se elige en Ajustes).
Teclado: WASD o flechas para moverte, espacio para llover, E rayo, Q tornado, Mayús ráfaga.

## Publicarlo en GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. En *Build and deployment*, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. Guarda. En un par de minutos aparece la dirección del juego en esa misma página.

Cada vez que se suben cambios a `main`, la web se actualiza sola. Antes de publicar cambios grandes,
sube el número `VERSION` de `sw.js` para que los móviles con la app instalada reciban la versión nueva.

## Instalar en el móvil

Abre la dirección del juego en el móvil:

- **Android (Chrome)**: menú ⋮ → *Instalar aplicación* o *Añadir a pantalla de inicio*.
- **iPhone (Safari)**: botón Compartir → *Añadir a pantalla de inicio*.

## Cómo está hecho

Todo el juego es un único archivo, `index.html`: HTML, CSS y JavaScript sin librerías ni paso de
compilación. Dibuja con Canvas 2D y el sonido se genera con Web Audio, sin archivos de audio.
La partida se guarda en el navegador de cada jugador (`localStorage`).

| Archivo | Para qué sirve |
|---|---|
| `index.html` | El juego entero |
| `manifest.webmanifest`, `sw.js`, `icons/` | Que se pueda instalar en el móvil y jugar sin conexión |
| `tests/smoke.js` | Prueba automática: `npm install` y luego `npm test` |
| `CLAUDE.md` | Guía para agentes de IA que trabajen en el proyecto |
| `.claude/skills/` | Guías de desarrollo de juegos que usan esos agentes |

## Ideas pendientes

- Flecha en el mapa que señale el objetivo de la misión actual.
- Peticiones de los vecinos (granjero, colegio, bomberos) como fuente principal de experiencia.
- Más ataques de nube: granizo, niebla que frena coches, nevadas.
- Jefes: una gran nube rival por estación.
- Modo barrio: generar el mapa con datos reales de OpenStreetMap (parques, colegios, calles).
- Noche de otoño más clara y cámara algo más cerca en móvil.

## Derechos de autor

© 2026 jjgarcia-seo. Todos los derechos reservados. Puedes jugar y proponer cambios, pero no
copiar, modificar ni publicar el juego en otro sitio sin permiso. Condiciones completas en
[`LICENSE`](LICENSE).

## Créditos

Las guías de `.claude/skills/` vienen de
[awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
(licencia Apache 2.0, ver `.claude/skills/LICENSE` y `NOTICE`).
