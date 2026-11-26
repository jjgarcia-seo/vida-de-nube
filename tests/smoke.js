// Prueba rápida: abre el juego en un navegador sin ventana, juega unos minutos simulados
// y falla si hay errores de JavaScript o si algo básico deja de funcionar.
// Uso: npm test   (necesita: npm install)
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("file://" + path.resolve(__dirname, "..", "index.html"));
  await page.click("#btnStart");
  await page.waitForTimeout(500);

  const r = await page.evaluate(() => {
    const N = window.__nube, P = N.P;
    const step = s => { for (let i = 0; i < s * 30; i++) N.update(1 / 30); };
    const out = {};
    P.x = P.tx = N.LAKE.x; P.y = P.ty = N.LAKE.y; step(6);
    out.drank = P.w > 30;
    document.getElementById("btnRain").click(); step(4); document.getElementById("btnRain").click();
    out.rained = !!N.save.ach.gotas;
    N.gain(40);
    out.levelled = N.save.lvl >= 2 && N.pend >= 1;
    step(120);
    out.achievements = N.ACH.length;
    out.missions = N.MIS.length;
    return out;
  });

  const fails = [];
  if (!r.drank) fails.push("la nube no bebe en el lago");
  if (!r.rained) fails.push("llover no da el logro 'Cuatro gotas'");
  if (!r.levelled) fails.push("la experiencia no sube de nivel");
  if (r.achievements < 100) fails.push("hay menos de 100 logros");
  fails.push(...errors.map(e => "error de JavaScript: " + e));

  await browser.close();
  console.log(JSON.stringify(r));
  if (fails.length) { console.error("FALLA:\n- " + fails.join("\n- ")); process.exit(1); }
  console.log("OK: el juego arranca y lo básico funciona.");
})();
