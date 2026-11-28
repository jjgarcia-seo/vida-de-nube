# Vida de Nube: guía para agentes

Juego web en español. Todo el juego vive en `index.html` (HTML + CSS + JS, sin librerías ni build).
Lee este archivo antes de tocar código.

## Reglas

- Textos del juego, mensajes y documentación: **en español**, tono cercano y claro.
- Sin dependencias en tiempo de ejecución. Nada de frameworks ni CDNs nuevos (solo Google Fonts,
  que ya está). El juego debe abrirse con doble clic en `index.html`.
- Debe funcionar en móvil (desde 360 px de ancho, táctil) y en ordenador (ratón y teclado).
- No romper partidas guardadas: el guardado está en `localStorage` con la clave `vidanube.v2`.
  Si añades campos, dales un valor por defecto en `fresh()`; no cambies la clave.
- Colores solo desde las variables de `:root` (`--ink`, `--paper`, `--amber`, `--water`, `--rust`…).
- Si cambias algo que se ve, sube `VERSION` en `sw.js`.

## Mapa del código (`index.html`)

Busca estos comentarios `/* ---------- … ---------- */` dentro del `<script>`:

- **Geografía**: tamaño del mundo (`W`, `H`), zonas (`zoneAt`), lago, ríos, costa, ciudad, isla.
- **Suelo por trozos**: el suelo se pinta en trozos de 1040 px y se guarda en caché.
- **Entidades**: árboles, casas, gente, animales, coches, barcos, pájaros.
- **Logros**: lista `ACH` (`[id, título, descripción]`) y `unlock(id)`.
- **Estado**: objeto `P` (la nube del jugador) y `save` (partida guardada).
- **Ajustes**, **Sensación** (temblor, pausa de impacto) y **Sonido** (todo sintetizado).
- **Progreso**: experiencia (`gain`, tabla `NEED`), mejoras (`UPS`), reputación (`karma`).
- **Estaciones**, **Formas de nube** (`FM` = efectos, `FORMS` = textos, `FST` = barras).
- **Peligros**: nubes rivales, avioneta siembranubes, cañones (`world2`).
- **Misiones y contadores**: capítulos `MIS`, contadores `cnt(k)` y logros por niveles `TIERS`.
- **Lugares y secretos** (`mundo*`, estado `save.mundo`): embalse, aeródromo, feria, playa, viñedo,
  valle escondido, gotas doradas y eventos con horario.
- **Habilidades y jefes** (`mec*`, estado `save.mec`): granizo, niebla densa, nevada y las 4 jefas.
- **Historia y peticiones** (`historia*`, `PET`, `MIS_WHERE`, estado `save.hist`): vieja nube,
  flecha de objetivo y favores de los vecinos.
- **Animación** (`AN`, `anim*`, `draw*` auxiliares): nube viva, lluvia, gente, árboles y cielo.
- **Jugabilidad** (`jug*`, estado `save.jug`): consejos de los primeros minutos y menú de pausa.
- **Ritmo de logros** (`rl*`, estado `save.rl`): pequeños momentos, logros compuestos, con niveles y
  secretos, y avisos agrupados (como mucho uno cada 50 s). Para logros nuevos, revisa esta sección.
- **Diversión** (`fun*`, estado `save.fun`): corrientes de viento, sucesos, rachas, maniobras,
  tormenta desatada y el director de ritmo.
- **Ciudad y pueblo** (`URB`, `urb*`): edificios, calles, tráfico, pueblo y puerto. Lo fijo se pinta
  en el suelo cacheado.
- **Naturaleza** (`nat*`): terreno por estaciones, agua, bosques, montañas y campos.

Cada módulo guarda su estado con una función `stX()` que crea su objeto en `save` si falta, así
no hace falta tocar `fresh()`. Los logros nuevos se añaden con `ACH.push(...)` dentro del módulo.
- **update(dt)**: toda la simulación. **draw(dt)**: todo el dibujo.

`window.__nube` expone el estado para pruebas (no lo uses dentro del juego).

## Comprobar cambios

```bash
npm install
npm test
```

`npm test` abre el juego en un Chromium sin ventana, simula un rato de partida y falla si hay
errores de JavaScript. `npm run bot` juega una partida de 25 minutos y mide el ritmo (niveles,
capítulos, logros por minuto, huecos sin nada que hacer); úsalo al tocar números de equilibrio. Pásalo siempre antes de subir cambios. Si el cambio es visual, haz además
una captura con Playwright a 1280×760 y a 400×780 y revísala.

## Guías disponibles

En `.claude/skills/` hay guías de desarrollo de juegos (sensación de juego, sonido, interfaz,
controles, cámara, IA de enemigos, generación procedural, diseño de niveles, guardado,
rendimiento, publicar en itch.io). Úsalas cuando la tarea encaje.
