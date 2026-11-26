// Bot de equilibrio: juega solo una partida nueva durante N minutos simulados y mide el ritmo.
// Uso: node tests/bot.js [minutos=25] [semilla=1] [experto|novato]
// "experto" lo sabe todo y ve el mapa entero; "novato" piensa más despacio, solo ve lo que cabe en
// pantalla, a veces deambula, bebe tarde y huye tarde: se parece más a alguien que empieza.
// No es una prueba que falle: imprime una tabla para ajustar números (experiencia, evaporación,
// rivales, avioneta…). Se mueve hacia vapor y nubes, bebe con poca agua, riega campos sembrados,
// huye de rivales grandes, esquiva la avioneta, lanza rayos y elige mejoras.
// Con BOT_HTML=/ruta/a/otra/index.html se puede medir otra versión del juego (p. ej. la anterior).
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const HTML = process.env.BOT_HTML || path.resolve(__dirname, "..", "index.html");
const NEEDS = JSON.parse(fs.readFileSync(HTML, "utf8").match(/const NEED=(\[[^\]]*\])/)[1]);
const MIN = +(process.argv[2] || 25), SEED = +(process.argv[3] || 1), NOVATO = process.argv[4] === "novato";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  // semilla fija para Math.random: dos ejecuciones con la misma semilla se parecen (no son idénticas:
  // el juego también usa temporizadores reales)
  await page.addInitScript(seed => {
    let s = seed * 2654435761 >>> 0;
    Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    try { localStorage.clear(); } catch (e) {}
  }, SEED);
  await page.goto("file://" + HTML);
  await page.click("#btnStart");
  await page.waitForTimeout(300);

  // estado del bot dentro de la página
  await page.evaluate(([nov, needs]) => {
    const N = window.__nube;
    // que el bucle real no avance mientras el bot simula (si hay menú de pausa, lo usamos)
    if (N.pause) N.pause(true);
    window.__bot = {
      t: 0, think: 0, lv: [], cap: [], ach: [], evap: 0, shrink: 0, sizes: [], lastEvt: 0, gaps: [], longGap: 0,
      bigNear: 0, planes: 0, planeHits: 0, lastPlane: null, prevX: N.P.x, prevY: N.P.y, prevM: N.P.m, prevXp: 0,
      lvSeen: N.save.lvl, capSeen: N.curCap(), achSeen: Object.keys(N.save.ach).length, rainT: 0, dryT: 0, mode: "", modes: {},
      nov, see: nov ? 1000 : 1e9, wander: null, NEED: needs
    };
  }, [NOVATO, NEEDS]);

  const result = [];
  for (let minute = 0; minute < MIN; minute++) {
    await page.evaluate(() => {
      const N = window.__nube, P = N.P, B = window.__bot, S = N.save, dt = 1 / 30;
      const WATERS = [[N.LAKE.x, N.LAKE.y], [1500, 2500], [8050, 1850], [7300, 2150], [6700, 2500], [6000, 2700], [5200, 3080],
        [4480, 3780], [4250, 4500], [4550, 5200], [4200, 5800], [4050, 6520]];
      const d = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
      const up = k => S.ups[k] || 0;
      const cap = () => 100 * P.m * (1 + .25 * up("deposito"));
      const rad = () => 52 + 24 * Math.sqrt(P.m);
      const totXp = () => { let x = S.xp; for (let l = 1; l < S.lvl; l++) x += B.NEED[l - 1] || 450 + 60 * (l - 10); return x; };
      const rainOn = () => document.getElementById("btnRain").classList.contains("on");
      const setRain = v => { if (rainOn() !== v) document.getElementById("btnRain").click(); };
      const stormy = () => { const b = document.getElementById("btnRay"); return !b.hidden && !b.disabled; };
      const PRIO = window.__bot.nov ? ["deposito", "ligera", "rayo", "sorbo", "iman", "fria", "fina", "coraza", "rafaga", "tornado"].sort(() => Math.random() - .5) : ["rayo", "rafaga", "deposito", "sorbo", "fria", "coraza", "ligera", "iman", "fina", "tornado"];
      function chooseUps() {
        while (N.pend > 0) {
          N.openLv();
          const cards = [...document.querySelectorAll("#lvCards .upc")];
          if (!cards.length) break;
          let best = cards[0], bi = 99;
          // el novato sigue el consejo de la misión: si le piden el rayo, lo elige
          if (B.nov && N.curCap() === 3) { const r = cards.find(c => c.querySelector("strong").textContent === "Rayo"); if (r) { r.click(); continue; } }
          for (const c of cards) { const name = c.querySelector("strong").textContent; const k = Object.keys(N.UPS).find(k => N.UPS[k].n === name); const i = PRIO.indexOf(k); if (i >= 0 && i < bi) { bi = i; best = c; } }
          best.click();
        }
        document.getElementById("lvPanel").hidden = true;
      }
      function decide() {
        const C = cap(), R = rad();
        // 1) huir de rivales grandes
        let threat = null, td = 1e9;
        for (const c of N.rivals) { const k = d(c.x, c.y, P.x, P.y); if (c.m > P.m && k < (B.nov ? 450 : 750) && k < td) { td = k; threat = c; } }
        const sp = N.seedPlane;
        if (sp && stormy() && d(sp.x, sp.y, P.x, P.y) < R * 2.2) N.strike();
        if (threat) { B.bigNear += .5; const l = td || 1; P.tx = P.x + (P.x - threat.x) / l * 600; P.ty = P.y + (P.y - threat.y) / l * 600; setRain(false); return "huir"; }
        if (sp && !sp.hit && !sp.flee && d(sp.x, sp.y, P.x, P.y) < 900) { // esquivar: perpendicular a su rumbo
          const nx = -Math.sin(sp.a), ny = Math.cos(sp.a); P.tx = P.x + nx * 500; P.ty = P.y + ny * 500; return "esquivar"; }
        // 2) rayos sobre rivales pequeños cercanos (misiones de rayo)
        if (stormy()) for (const c of N.rivals) if (d(c.x, c.y, P.x, P.y) < R * 1.3 + c.r && c.m >= P.m - 1) { N.strike(); break; }
        // 3) beber
        if (P.w < C * (B.nov ? .15 : .28) || (B.drinking && P.w < C * (B.nov ? .7 : .9))) {
          B.drinking = true; setRain(false); let best = WATERS[0], bd = 1e9;
          for (const w of WATERS) { const k = d(w[0], w[1], P.x, P.y); if (k < bd) { bd = k; best = w; } }
          const cy = N.coastY(P.x); if (cy - P.y < bd) best = [P.x, cy + 200];
          P.tx = best[0]; P.ty = best[1]; return "beber"; }
        B.drinking = false;
        // 4) misiones que piden ir a un sitio: mojar gente, llover en pueblo/ciudad/puerto, espantar cuervos
        const mis = id => N.curCap() === +({ b: 2, c: 3 })[id[0]] && !S.mis[id];
        const K = N.crows;
        if (mis("b3") && (K.st === "in" || K.st === "eat") && P.w > C * .3) { P.tx = K.x; P.ty = K.y; setRain(d(K.x, K.y, P.x, P.y) < 250); return "mision"; }
        // c2/c4: provocar un fuego con un rayo en el bosque y apagarlo con lluvia
        if (mis("c4") || mis("c2")) {
          const burning = N.trees.find(t => t.st === 1 && d(t.x, t.y, P.x, P.y) < 1500);
          if (burning && P.w > C * .2 && mis("c4")) { P.tx = burning.x; P.ty = burning.y; setRain(d(burning.x, burning.y, P.x, P.y) < 120); return "mision"; }
          if (stormy() && P.w > C * .5) { const fx = 2200, fy = 1700; P.tx = fx; P.ty = fy; setRain(false); if (d(fx, fy, P.x, P.y) < 900) N.strike(); return "mision"; }
        }
        const spots = [];
        if (mis("b4") && N.info().dark < .5) spots.push([6300, 4300]);
        if (mis("c6")) { if (!S.ach.pueblo) spots.push([6300, 4300]); if (!S.ach.ciudad) spots.push([8380, 5330]); if (!S.ach.puerto) spots.push([2300, 6000]); }
        if (spots.length && P.w > C * .4) { let best = spots[0], bd = 1e9; for (const q of spots) { const k = d(q[0], q[1], P.x, P.y); if (k < bd) { bd = k; best = q; } }
          if (bd > 200 || !B.spotT) { B.spotT = 0; }
          P.tx = best[0] + Math.sin(B.t * .7) * 220; P.ty = best[1] + Math.cos(B.t * .5) * 160; setRain(bd < 350); return "mision"; }
        // 5) regar campos sembrados
        const f = N.fields.find(f => f.st === 1 && (!B.nov || d(f.x + f.w / 2, f.y + f.h / 2, P.x, P.y) < 2500));
        if (f && P.w > C * .45) { const fx = f.x + f.w / 2, fy = f.y + f.h / 2; P.tx = fx; P.ty = fy;
          if (d(fx, fy, P.x, P.y) < 220) setRain(true); else setRain(false); return "regar"; }
        // a4: llover un rato donde sea
        if (N.curCap() === 1 && !S.mis.a4 && P.w > C * .5) { setRain(true); }
        else setRain(false);
        // 6) lo más rentable cerca: nubes, rivales pequeños, vapor
        if (B.nov && B.wander && B.wander.t > B.t) { P.tx = B.wander.x; P.ty = B.wander.y; return "deambular"; }
        if (B.nov && Math.random() < .12) { const a = Math.random() * 6.28; B.wander = { x: Math.max(100, Math.min(10300, P.x + Math.cos(a) * 900)), y: Math.max(100, Math.min(7500, P.y + Math.sin(a) * 900)), t: B.t + 6 }; return "deambular"; }
        let tgt = null, ts = 0; const vis = o => d(o.x, o.y, P.x, P.y) < B.see;
        for (const c of N.clouds) { if (c.age < 1.5 || !vis(c)) continue; const k = d(c.x, c.y, P.x, P.y) + 150; const s = (10 + 5 * c.m) / k; if (s > ts) { ts = s; tgt = c; } }
        for (const c of N.rivals) { if (c.m >= P.m || !vis(c)) continue; const k = d(c.x, c.y, P.x, P.y) + 150; const s = (25 + 5 * c.m) / k; if (s > ts) { ts = s; tgt = c; } }
        for (const m of N.motes) { if (!vis(m)) continue; const k = d(m.x, m.y, P.x, P.y) + 150; const s = 4 / k; if (s > ts) { ts = s; tgt = m; } }
        if (tgt) { P.tx = Math.max(40, Math.min(10360, tgt.x)); P.ty = Math.max(40, Math.min(7560, tgt.y)); return "buscar"; }
        if (!B.wander || B.wander.t < B.t) { const a = Math.random() * 6.28; B.wander = { x: Math.max(100, Math.min(10300, P.x + Math.cos(a) * 900)), y: Math.max(100, Math.min(7500, P.y + Math.sin(a) * 900)), t: B.t + 6 }; }
        P.tx = B.wander.x; P.ty = B.wander.y; return "nada";
      }
      for (let i = 0; i < 1800; i++) {
        B.think -= dt;
        if (B.think <= 0) { B.think = B.nov ? 1.1 : .5; chooseUps(); B.mode = decide(); }
        B.modes[B.mode] = (B.modes[B.mode] || 0) + dt;
        const xp0 = totXp();
        N.update(dt);
        B.t += dt;
        // medidas
        const xp1 = totXp();
        if (xp1 - xp0 >= 5) { const g = B.t - B.lastEvt; if (g > 20) B.gaps.push(Math.round(g)); B.longGap = Math.max(B.longGap, g); B.lastEvt = B.t; }
        if (S.lvl !== B.lvSeen) { for (let l = B.lvSeen + 1; l <= S.lvl; l++) B.lv.push([l, Math.round(B.t)]); B.lvSeen = S.lvl; }
        B.misT = B.misT || {}; for (const k in S.mis) if (!(k in B.misT)) B.misT[k] = Math.round(B.t);
        const c = N.curCap(); if (c !== B.capSeen) { B.cap.push([B.capSeen, Math.round(B.t)]); B.capSeen = c; }
        const jump = d(P.x, P.y, B.prevX, B.prevY);
        if (jump > 300 && P.m === 1) B.evap++;
        if (P.m < B.prevM && jump < 300) { B.shrink++; const R = rad(); B.why = B.why || {};
          const k = N.rivals.some(c => d(c.x, c.y, P.x, P.y) < R * .6 + c.r * .6 + 30) ? "rival" : (N.seedPlane && N.seedPlane.hit && !N.seedPlane.why) ? "avioneta" : "sol";
          if (k === "avioneta") N.seedPlane.why = 1; B.why[k] = (B.why[k] || 0) + (B.prevM - P.m); }
        B.prevX = P.x; B.prevY = P.y; B.prevM = P.m;
        for (const c of N.rivals) if (!c.botSeen && c.m > P.m && d(c.x, c.y, P.x, P.y) < 900) { c.botSeen = 1; B.enc = (B.enc || 0) + 1; }
        if (N.seedPlane && N.seedPlane !== B.lastPlane) { B.planes++; B.lastPlane = N.seedPlane; }
        if (N.seedPlane && N.seedPlane.hit && !N.seedPlane.counted) { N.seedPlane.counted = 1; B.planeHits++; }
        if (P.w <= 0) B.dryT += dt;
      }
      B.sizes.push(P.m);
    });
    const snap = await page.evaluate(() => { const N = window.__nube, B = window.__bot; const S = N.save; let x = S.xp; for (let l = 1; l < S.lvl; l++) x += B.NEED[l - 1] || 450 + 60 * (l - 10);
      return { min: Math.round(B.t / 60), xp: x, lvl: N.save.lvl, m: N.P.m, ach: Object.keys(N.save.ach).length, cap: N.curCap(), w: Math.round(N.P.w) }; });
    result.push(snap);
  }
  const B = await page.evaluate(() => { const B = window.__bot, J = window.__nube.save.jug; B.dodge = J ? J.dodge : "?"; B.tips = J ? Object.keys(J.tips).join(", ") + " (seguidos: " + J.ok + ")" : "?"; return B; });
  const pend = await page.evaluate(() => { const N = window.__nube, c = N.curCap(); return N.MIS.filter(m => m[0] === c && !N.save.mis[m[1]]).map(m => m[1] + " " + m[2] + " (" + Math.floor(m[3]()) + "/" + m[4] + ")"); });
  await browser.close();

  console.log("Minuto | nivel | exp total | tamaño | logros | capítulo | agua");
  for (const r of result) console.log(String(r.min).padStart(6) + " | " + String(r.lvl).padStart(5) + " | " + String(r.xp).padStart(9) + " | " + String(r.m).padStart(6) + " | " + String(r.ach).padStart(6) + " | " + String(r.cap).padStart(8) + " | " + r.w);
  const fmt = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  console.log("\nNiveles (nivel @ m:ss): " + B.lv.map(([l, t]) => l + "@" + fmt(t)).join("  "));
  console.log("Capítulos completados: " + (B.cap.map(([c, t]) => "cap" + c + "@" + fmt(t)).join("  ") || "ninguno"));
  const ach = result[result.length - 1].ach;
  console.log("Logros: " + ach + " en " + MIN + " min (" + (ach / MIN).toFixed(2) + "/min)");
  console.log("Evaporaciones: " + B.evap + " · veces que encoge: " + B.shrink + " · tamaño perdido por causa: " + JSON.stringify(B.why || {}) + " · segundos sin agua: " + Math.round(B.dryT));
  console.log("Encuentros con rivales más grandes (a menos de 900): " + (B.enc || 0) + " · tiempo huyendo (s): " + Math.round(B.bigNear) + " · avionetas: " + B.planes + " (le dieron " + B.planeHits + ", esquivadas " + B.dodge + ")");
  console.log("Huecos >20 s sin nada notable: " + B.gaps.length + " " + JSON.stringify(B.gaps) + " · el más largo: " + Math.round(B.longGap) + " s");
  console.log("Reparto del tiempo del bot (s): " + JSON.stringify(Object.fromEntries(Object.entries(B.modes).map(([k, v]) => [k, Math.round(v)]))));
  console.log("Consejos mostrados: " + B.tips);
  console.log("Misiones (id@segundo): " + Object.entries(B.misT || {}).map(([k, v]) => k + "@" + v).join(" "));
  console.log("Misiones pendientes del capítulo actual: " + (pend.join(" · ") || "ninguna"));
  if (errors.length) { console.error("Errores de JavaScript:\n- " + errors.join("\n- ")); process.exit(1); }
})();
