// Monta o projeto HyperFrames de um reel a partir do roteiro + tempos da voz.
// Uso: node src/build.mjs reels/<slug>/reel.json build/<slug>
// Gera: index.html, compositions/*.html, assets/reel/*, build/<slug>/plan.json
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import opentype from "opentype.js";
import { C, icon, tv } from "./lib/icons.mjs";
import { DEMOS } from "./lib/demos.mjs";
import { presenterSVG, presenterJS, mouthFrames } from "./lib/presenter.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const [reelPath, buildDir] = process.argv.slice(2);
const reel = JSON.parse(fs.readFileSync(reelPath, "utf8"));
const timing = JSON.parse(fs.readFileSync(path.join(buildDir, "timing.json"), "utf8"));
const W = 1080, H = 1920;
const D = timing.duration;
const words = timing.words;
const N = reel.points.length;
const f = (n) => Number(n).toFixed(3);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const noDot = (s) => String(s).replace(/\.(?=\s|$)/g, "");

const anton = opentype.loadSync(path.join(ROOT, "assets/fonts/Anton-Regular.ttf"));
const sans = opentype.loadSync(path.join(ROOT, "assets/fonts/InstrumentSans.ttf"));
const serif = opentype.loadSync(path.join(ROOT, "assets/fonts/InstrumentSerif-Italic.ttf"));

// ---------- tempos
const seg = (id) => words.filter((w) => w.seg === id);
const normW = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
function findWord(segIds, ref, fallback) {
  if (ref == null) return fallback;
  const [txt, nth] = String(ref).split("#");
  const key = normW(txt);
  let count = 0;
  for (const id of [].concat(segIds)) {
    for (const w of seg(id)) {
      if (normW(w.w) === key || (key.length > 2 && normW(w.w).startsWith(key))) {
        count++;
        if (count === (Number(nth) || 1)) return w.t0;
      }
    }
  }
  console.warn(`[build] aviso: palavra "${ref}" não encontrada em ${segIds}, usando ${fallback}`);
  return fallback;
}
const first = (id) => seg(id)[0].t0;
const last = (id) => seg(id).at(-1).t1;

const P = reel.points.map((p, i) => {
  const k = i + 1;
  const s = { say: `p${k}.say`, ex: `p${k}.explain` };
  const start = first(s.say), ex = first(s.ex);
  return {
    ...p, k, s, start, ex, exEnd: last(s.ex),
    titleT: Math.max(start, findWord(s.say, p.title_at, start)),
    stampT: findWord([s.ex, s.say], p.stamp_at, ex + 0.6),
    wipe: k === 1 || (k === N && N > 1),
  };
});
const closeStart = first("close"), closeEnd = last("close");
P.forEach((p) => { p.cut = p.wipe ? p.start - 0.02 : p.start - 0.06; });
const outroCut = closeStart - 0.06;
P.forEach((p, i) => { p.end = i + 1 < N ? P[i + 1].cut : outroCut; });
const wipes = P.filter((p) => p.wipe).map((p) => p.start - 0.3);

const sfx = []; // {type, t, dur?}
const addSfx = (type, t, dur) => sfx.push({ type, t: +t.toFixed(3), dur });

// ---------- CSS / runtime compartilhados
const FONTS = `@font-face{font-family:"Anton";src:url("assets/fonts/Anton-Regular.ttf")}
@font-face{font-family:"Instrument Sans";src:url("assets/fonts/InstrumentSans.ttf");font-weight:100 900}
@font-face{font-family:"Instrument Serif";font-style:italic;src:url("assets/fonts/InstrumentSerif-Italic.ttf")}`;
const DOTS = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Ccircle cx='4' cy='4' r='0.85' fill='%231E1C1A'/%3E%3C/svg%3E")`;
const BASE = `${FONTS}
#root{position:absolute;inset:0;overflow:hidden}
.anton{font-family:"Anton",sans-serif;font-weight:400}
.mono{font-family:"JetBrains Mono",monospace}
.cw{position:absolute}
.cw .hs{position:absolute;inset:0;transform:translate(-13px,12px);border-radius:20px;background-image:${DOTS}}
.cw .cd{position:absolute;inset:0;background:${C.card};border:3px solid ${C.ink};border-radius:20px;overflow:hidden}
.lbl{position:absolute;top:132px;left:120px;width:840px;height:34px;font-family:"JetBrains Mono",monospace;font-size:25px;color:${C.gray};white-space:nowrap}
.lbl .r{position:absolute;right:0;top:0}.lbl .l{position:absolute;left:0;top:0}
.lbl b{color:${C.red};font-weight:800}
.hid,.demo{opacity:0}
.stamp{position:absolute;font-family:"Anton",sans-serif;font-size:52px;color:${C.red};border:5px solid ${C.red};padding:2px 22px 0;line-height:1.25;white-space:nowrap;opacity:0;background:${C.card}}`;
const RUNTIME = `
const pop=(tl,s,t)=>tl.fromTo(s,{scale:0.55,opacity:0},{scale:1,opacity:1,duration:0.34,ease:"back.out(2.2)"},t);
const rise=(tl,s,t)=>tl.fromTo(s,{y:70,opacity:0},{y:0,opacity:1,duration:0.4,ease:"power3.out"},t);
const exitUp=(tl,s,t)=>tl.to(s,{y:-50,opacity:0,duration:0.22,ease:"power2.in"},t);
const slam=(tl,s,t)=>tl.fromTo(s,{scale:1.22,opacity:0},{scale:1,opacity:1,duration:0.24,ease:"power4.out"},t);
const stampIn=(tl,s,t)=>tl.fromTo(s,{scale:1.75,rotation:-18,opacity:0},{scale:1,rotation:-6,opacity:1,duration:0.2,ease:"power2.out"},t);
const draw=(tl,s,t,d)=>tl.fromTo(s,{strokeDashoffset:1.1},{strokeDashoffset:0,duration:d,ease:"power2.inOut"},t);
const fmtN=(v,k)=>k==="thousands"?String(v).replace(/\\B(?=(\\d{3})+(?!\\d))/g,"."):String(v);
const count=(tl,s,to,t,d,k)=>{const el=document.querySelector(s);const o={v:0};el.textContent=fmtN(0,k);
  tl.to(o,{v:to,duration:d,ease:"power2.out",onUpdate:()=>{el.textContent=fmtN(Math.round(o.v),k);}},t);};
const typeIn=(tl,s,text,t,d)=>{const el=document.querySelector(s);const o={n:0};el.textContent="";
  tl.to(o,{n:text.length,duration:d,ease:"none",onUpdate:()=>{el.textContent=text.slice(0,Math.round(o.n));}},t);};
`;

function sceneFile(id, dur, css, body, js) {
  return `<template>
<style>${BASE}
${css}</style>
<div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}">
${body}
</div>
<script>
(function(){
${RUNTIME}
const tl=gsap.timeline({paused:true});
${js}
tl.to({},{duration:${f(dur)}},0);
window.__timelines=window.__timelines||{};
window.__timelines["${id}"]=tl;
})();
</script>
</template>`;
}

const card = (idAttr, style, inner, cls = "") => `<div ${idAttr ? `id="${idAttr}"` : ""} class="cw ${cls}" style="${style}"><div class="hs"></div><div class="cd">${inner}</div></div>`;

// ---------- desenhos à mão (risco, anel, sublinhado)
function wobblyLine(x0, y0, x1, y1, amp = 6) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  return `M${x0},${y0}C${x0 + (x1 - x0) * 0.3},${y0 + (y1 - y0) * 0.3 - amp} ${mx + (x1 - x0) * 0.2},${my + amp} ${x1},${y1}`;
}
function ringPath(w, h) {
  const cx = w / 2, cy = h / 2, rx = w / 2 - 8, ry = h / 2 - 8;
  return `M${cx + rx * 0.2},${cy - ry}C${cx + rx * 1.05},${cy - ry * 0.98} ${cx + rx * 1.02},${cy + ry * 0.95} ${cx},${cy + ry}C${cx - rx * 1.04},${cy + ry * 0.98} ${cx - rx * 1.05},${cy - ry * 0.9} ${cx - rx * 0.1},${cy - ry * 1.02}C${cx + rx * 0.2},${cy - ry * 1.06} ${cx + rx * 0.5},${cy - ry * 0.95} ${cx + rx * 0.6},${cy - ry * 0.85}`;
}
const svgPath = (id, d, w, h, style, sw = 9) => `<svg width="${w}" height="${h}" style="position:absolute;${style}" overflow="visible"><path id="${id}" pathLength="1" d="${d}" fill="none" stroke="${C.red}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 1.2" stroke-dashoffset="1.1"/></svg>`;

// ---------- cartão do gancho (mesmo no começo e no fim, para o loop)
const HOOK_BOX = { left: 160, top: 470, w: 760, h: 560 };
function hookCardInner(variant, prefix) {
  const hc = reel.hook_card || {};
  return `<div style="position:absolute;left:${(HOOK_BOX.w - 420) / 2}px;top:24px">${icon(hc.icon || "tv", { variant }, 420)}</div>
    <div class="mono" style="position:absolute;left:28px;bottom:64px;font-size:26px;color:${C.ink}"><span style="color:${C.red}">●</span> ${esc(hc.caption || "")}</div>
    <div style="position:absolute;left:28px;right:28px;bottom:32px;height:10px;border-radius:5px;background:#DDD8D0"><div style="width:38%;height:100%;border-radius:5px;background:${C.ink}"></div></div>`;
}
const hookLabel = `<div class="l">// 00 · ${esc(reel.series || "curiosidade")}</div><div class="r"><b>${N}</b> fatos</div>`;

// ---------- cena: gancho
function buildHook() {
  const id = "hook";
  const end = P[0].cut;
  const hc = reel.hook_card || {};
  const strikeT = findWord("hook1", hc.strike_at, first("hook1") + 0.4);
  const chips = reel.hook_chips || [];
  const h2 = first("hook2");
  let x = HOOK_BOX.left, chipHTML = "", js = "";
  const cy = HOOK_BOX.top + HOOK_BOX.h + 44;
  chips.forEach((c, i) => {
    const w = Math.round(sans.getAdvanceWidth(c.text, 40) + 56);
    chipHTML += card(`hook-c${i}`, `left:${x}px;top:${cy}px;width:${w}px;height:84px`, `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Instrument Sans';font-weight:600;font-size:40px;color:${C.ink}">${esc(c.text)}</div>`, "hid");
    js += `pop(tl,"#hook-c${i}",${f(h2 + i * 0.16)});`;
    addSfx("pop", h2 + i * 0.16);
    if (c.payoff) {
      const rw = w + 70, rh = 84 + 60;
      chipHTML += svgPath("hook-ring", ringPath(rw, rh), rw, rh, `left:${x - 35}px;top:${cy - 30}px`);
      const rt = findWord("hook2", c.at, h2 + 0.8);
      js += `draw(tl,"#hook-ring",${f(rt)},0.4);`;
      addSfx("whoosh-short", rt);
    }
    x += w + 26;
  });
  const exitT = wipes[0];
  const body = `<div class="lbl" data-layout-ignore>${hookLabel}</div>
  ${card("hook-card", `left:${HOOK_BOX.left}px;top:${HOOK_BOX.top}px;width:${HOOK_BOX.w}px;height:${HOOK_BOX.h}px`, hookCardInner(hc.variant || "faint"))}
  ${svgPath("hook-strike", wobblyLine(HOOK_BOX.left + 40, HOOK_BOX.top + 70, HOOK_BOX.left + HOOK_BOX.w - 40, HOOK_BOX.top + HOOK_BOX.h - 90, 30), W, H, "left:0;top:0", 14)}
  ${chipHTML}`;
  js += `draw(tl,"#hook-strike",${f(strikeT)},0.32);`;
  addSfx("whoosh-short", strikeT);
  js += `exitUp(tl,["#hook-card","#hook-strike",${chips.map((_, i) => `"#hook-c${i}"`).join(",")}${chips.some((c) => c.payoff) ? ',"#hook-ring"' : ""}],${f(exitT)});`;
  js += `tl.to(".lbl",{opacity:0,duration:0.2},${f(exitT)});`;
  return { id, start: 0, dur: end, html: sceneFile(id, end, "", body, js) };
}

// ---------- cena: ponto
function buildPoint(p) {
  const id = `p${p.k}`, S = p.cut, dur = p.end - p.cut;
  const L = (t) => t - S;
  const hdrExit = L(p.ex) - 0.3;
  const clampH = (t) => Math.min(t, hdrExit - 0.2);
  const tT = clampH(Math.max(0.1, L(p.titleT)));
  const [w1, w2] = p.title;
  let fs = 176;
  const adv = anton.getAdvanceWidth(`${w1} ${w2}`, 176);
  if (adv > 840) fs = Math.floor((176 * 840) / adv);
  const x2 = anton.getAdvanceWidth(`${w1} `, fs), wW2 = anton.getAdvanceWidth(w2, fs);
  const titleTop = 470;
  const ulY = titleTop + fs * 1.1;
  const cardTop = Math.round(ulY + 50);
  const cardT = clampH(tT + 0.18);
  const cdur = Math.max(0.5, Math.min(1.15, hdrExit - cardT - 0.05));
  const badgeT = clampH(cardT + 0.2);
  const termT = clampH(cardT + 0.3);
  const term = p.terminal || "";
  const typeDur = Math.min(0.9, Math.max(0.4, term.length * 0.032));
  const typeT = clampH(termT + 0.12);
  const c = p.card || {};
  const cardH = 280;
  const termTop = cardTop + cardH + 36;

  const T = { in: L(p.ex) - 0.06, out: L(p.end) - (P[p.k] && P[p.k].wipe ? 0.3 + 0.24 : 0.28), stamp: L(p.stampT), beats: {} };
  T.out = Math.min(Math.max(T.out, T.stamp + 0.45), dur - 0.24);
  for (const [name, ref] of Object.entries((p.demo && p.demo.beats) || {})) T.beats[name] = L(findWord([p.s.ex, p.s.say], ref, p.ex + 0.4));
  const demoFn = DEMOS[p.demo && p.demo.type] || DEMOS.icon_pop;
  const demo = demoFn(id, p, T);
  const sp = { ...demo.stampPos, ...(p.stamp_pos || {}) };

  const body = `<div class="lbl" data-layout-ignore><div class="l">// ${String(p.k).padStart(2, "0")} · ${esc(p.name)}</div><div class="r"><b>${esc(p.stat.num)}</b> ${esc(p.stat.label)}</div></div>
  <div id="${id}-title" class="anton hid" style="position:absolute;left:120px;top:${titleTop}px;font-size:${fs}px;line-height:1.1;white-space:nowrap;transform-origin:left center"><span style="color:${C.ink}">${esc(w1)}</span> <span style="color:${C.red}">${esc(w2)}</span></div>
  ${svgPath(`${id}-ul`, `M${120 + x2 - 6},${ulY + 4}C${120 + x2 + wW2 * 0.3},${ulY - 6} ${120 + x2 + wW2 * 0.7},${ulY + 10} ${120 + x2 + wW2 + 12},${ulY - 2}`, W, H, "left:0;top:0", 11)}
  ${card(`${id}-card`, `left:120px;top:${cardTop}px;width:840px;height:${cardH}px`, `
    <div style="position:absolute;left:30px;top:30px">${icon(c.icon || "ball", {}, 220)}</div>
    <div style="position:absolute;left:290px;top:42px;right:30px">
      <div id="${id}-num" class="anton" style="font-size:150px;line-height:1;color:${C.ink}">0</div>
      <div class="mono" style="font-size:28px;color:${C.gray};margin-top:12px">${esc(c.label || "")}</div></div>`, "hid")}
  <div id="${id}-badge" class="anton hid" style="position:absolute;left:880px;top:${cardTop - 50}px;width:120px;height:120px;border-radius:60px;background:${C.red};color:${C.card};font-size:54px;line-height:120px;text-align:center">#${p.k}</div>
  ${card(`${id}-term`, `left:120px;top:${termTop}px;width:840px;height:96px`, `<div class="mono" style="position:absolute;left:30px;top:24px;font-size:34px;color:${C.ink};white-space:nowrap"><span style="color:${C.red}">›</span> <span id="${id}-typed"></span><span style="display:inline-block;width:18px;height:36px;background:${C.ink};vertical-align:-6px;margin-left:4px"></span></div>`, "hid")}
  ${demo.html}
  <div id="${id}-stamp" class="stamp" style="left:${sp.left}px;top:${sp.top}px">${esc(p.stamp)}</div>`;

  let js = `tl.fromTo(".lbl",{y:-24,opacity:0},{y:0,opacity:1,duration:0.24,ease:"power3.out"},0.02);
  slam(tl,"#${id}-title",${f(tT)});
  draw(tl,"#${id}-ul",${f(tT + 0.12)},0.3);
  rise(tl,"#${id}-card",${f(cardT)});
  count(tl,"#${id}-num",${Number(c.count_to) || 0},${f(cardT)},${f(cdur)},"${c.format || "plain"}");
  tl.fromTo("#${id}-badge",{scale:0.55,rotation:-360,opacity:0},{scale:1,rotation:0,opacity:1,duration:0.6,ease:"back.out(2.2)"},${f(badgeT)});
  rise(tl,"#${id}-term",${f(termT)});
  typeIn(tl,"#${id}-typed",${JSON.stringify(term)},${f(typeT)},${f(typeDur)});
  exitUp(tl,["#${id}-title","#${id}-ul","#${id}-card","#${id}-badge","#${id}-term"],${f(hdrExit)});
  ${demo.js}
  stampIn(tl,"#${id}-stamp",${f(T.stamp)});
  exitUp(tl,["#${id}-demo","#${id}-stamp"],${f(T.out)});`;
  addSfx("pop", S + cardT);
  addSfx("tick", S + cardT, cdur);
  addSfx("typing", S + typeT, typeDur);
  addSfx("whoosh-short", S + hdrExit);
  addSfx("thud", S + T.stamp);
  if (!(P[p.k] && P[p.k].wipe)) addSfx("whoosh-short", S + T.out);
  for (const e of demo.sfx) addSfx(e.type, S + e.t, e.dur);
  return { id, start: S, dur, html: sceneFile(id, dur, "", body, js) };
}

// ---------- cena: fechamento (termina igual ao primeiro quadro)
function buildOutro() {
  const id = "outro", S = outroCut, dur = D - S;
  const L = (t) => t - S;
  const cc = reel.close_card || {};
  const ringT = L(findWord("close", cc.ring_at, closeStart + 1));
  const settle = Math.min(L(closeEnd) + 0.12, dur - 0.42);
  const rw = 480, rh = 400;
  const body = `<div class="lbl" data-layout-ignore>${hookLabel}</div>
  <div id="outro-wrap" class="hid" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px">
    ${card("outro-card", `left:${HOOK_BOX.left}px;top:${HOOK_BOX.top}px;width:${HOOK_BOX.w}px;height:${HOOK_BOX.h}px`, `
      <div id="outro-faint" data-layout-ignore style="position:absolute;inset:0">${hookCardInner(reel.hook_card?.variant || "faint")}</div>
      <div id="outro-clear" data-layout-allow-overlap style="position:absolute;inset:0;background:${C.card}">${hookCardInner(cc.variant || "clear")}</div>`)}
  </div>
  ${svgPath("outro-ring", ringPath(rw, rh), rw, rh, `left:${540 - rw / 2}px;top:${HOOK_BOX.top + 20}px`)}`;
  const js = `rise(tl,"#outro-wrap",0.04);
  draw(tl,"#outro-ring",${f(ringT)},0.45);
  tl.to("#outro-ring",{opacity:0,duration:0.25},${f(settle)});
  tl.fromTo("#outro-clear",{opacity:1},{opacity:0,duration:0.3,ease:"power1.inOut"},${f(settle)});`;
  addSfx("pop", S + 0.04);
  addSfx("whoosh-short", S + ringT);
  return { id, start: S, dur, html: sceneFile(id, dur, "", body, js) };
}

// ---------- legendas
function buildCaptions() {
  const id = "caps";
  const maxW = 840;
  const ws = words.map((w) => ({ ...w, w: noDot(w.w) }));
  const width = (w, kw) => (kw ? serif.getAdvanceWidth(w, 62 * 1.16) : sans.getAdvanceWidth(w, 62));
  const space = sans.getAdvanceWidth(" ", 62);
  const groups = [];
  let curSeg = null, lines = [], line = [], lw = 0;
  const flushLine = () => { if (line.length) lines.push(line); line = []; lw = 0; };
  const flushGroup = () => { flushLine(); if (lines.length) groups.push(lines); lines = []; };
  for (const w of ws) {
    if (w.seg !== curSeg) { flushGroup(); curSeg = w.seg; }
    const ww = width(w.w, w.kw);
    if (line.length && lw + space + ww > maxW) { flushLine(); if (lines.length === 2) flushGroup(); }
    line.push(w); lw += (line.length > 1 ? space : 0) + ww;
  }
  flushGroup();
  // uma palavra-chave por linha
  for (const g of groups) for (const ln of g) {
    let seen = false, inRun = false;
    for (const w of ln) {
      if (w.kw && !seen) { inRun = true; seen = true; continue; }
      if (w.kw && inRun) continue;
      inRun = false;
      if (w.kw) w.kw = false;
    }
    if (!seen) {
      const best = [...ln].filter((w) => w.w.replace(/[^\p{L}\p{N}]/gu, "").length >= 4).sort((a, b) => b.w.length - a.w.length)[0];
      if (best) best.kw = true;
    }
  }
  let html = "", js = "", n = 0;
  groups.forEach((g, gi) => {
    const start = g[0][0].t0;
    const next = groups[gi + 1] ? groups[gi + 1][0][0].t0 : closeEnd + 0.25;
    const hide = Math.min(next - 0.02, g.at(-1).at(-1).t1 + 1.6);
    html += `<div id="cg${gi}" class="cg">` + g.map((ln) => `<div class="ln">` + ln.map((w) => {
      const wid = `cw${n++}`;
      js += `tl.set("#${wid}",{opacity:1},${f(w.t0)});tl.fromTo("#${wid}",{color:"${C.light}"},{color:"${w.kw ? C.red : C.ink}",duration:0.2,ease:"none",immediateRender:false},${f(w.t0)});`;
      return `<span id="${wid}" class="w${w.kw ? " kw" : ""}">${esc(w.w)}</span>`;
    }).join(" ") + `</div>`).join("") + `</div>`;
    js += `tl.set("#cg${gi}",{opacity:1},${f(start - 0.001)});tl.set("#cg${gi}",{opacity:0},${f(hide)});`;
  });
  const css = `.cg{position:absolute;left:120px;top:196px;width:850px;opacity:0;font-family:"Instrument Sans",sans-serif;font-weight:500;font-size:62px;line-height:1.16;color:${C.ink}}
  .ln{display:block}.w{opacity:0;color:${C.light}}.kw{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;font-size:1.16em}`;
  return { id, start: 0, dur: D, html: sceneFile(id, D, css, html, js) };
}

// ---------- limpezas em meia-tinta
function buildWipes() {
  const id = "wipes";
  let dots = "";
  const cw = W / 13, ch = H / 23;
  for (let r = 0; r < 23; r++) for (let c = 0; c < 13; c++)
    dots += `<div class="dt" style="left:${(c * cw + cw / 2 - 31).toFixed(1)}px;top:${(r * ch + ch / 2 - 31).toFixed(1)}px"></div>`;
  let js = `const ds=document.querySelectorAll(".dt");`;
  for (const w of wipes) {
    js += `tl.fromTo(ds,{scale:0,opacity:1},{scale:1,opacity:1,duration:0.27,ease:"power2.out",immediateRender:false,stagger:{grid:[23,13],from:"center",amount:0.35}},${f(w)});
    tl.to(ds,{scale:0,duration:0.25,ease:"power2.in",stagger:{grid:[23,13],from:"center",amount:0.35}},${f(w + 0.28)});`;
    addSfx("whoosh", w + 0.15);
  }
  const css = `.dt{position:absolute;width:62px;height:62px;border-radius:31px;background:${C.ink};opacity:0}`;
  return { id, start: 0, dur: D, html: sceneFile(id, D, css, dots, js) };
}

// ---------- apresentador
function buildPresenter() {
  const id = "presenter";
  const kwTimes = [];
  let prevKw = false;
  for (const w of words) { if (w.kw && !prevKw) kwTimes.push(w.t0); prevKw = w.kw; }
  const nods = kwTimes.filter((t) => t > 0.3 && t < D - 0.8).map((t) => +t.toFixed(3));
  const points = P.map((p) => +p.start.toFixed(3));
  const explains = P.map((p) => +p.ex.toFixed(3)).concat([+closeStart.toFixed(3)]).filter((t) => t < D - 1.6);
  const mouth = mouthFrames(timing.loudness_db);
  const css = `#pr{position:absolute;left:430px;top:1170px;width:650px;height:770px}`;
  const js = presenterJS({ duration: D, mouth, nods, points, explains, seed: 7 });
  return { id, start: 0, dur: D, html: sceneFile(id, D, css, `<div id="pr">${presenterSVG()}</div>`, js) };
}

// ---------- áudio
function peakOffset(file) {
  const buf = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "8000", "-f", "f32le", "-"], { maxBuffer: 64 << 20 });
  const a = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  let m = 0, mi = 0;
  for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i]); if (v > m) { m = v; mi = i; } }
  return { peak: mi / 8000, len: a.length / 8000 };
}
const SFX_FILES = {
  pop: { src: "assets/sfx/pop.mp3", vol: 0.42 },
  whoosh: { src: "assets/sfx/whoosh.mp3", vol: 0.42 },
  "whoosh-short": { src: "assets/sfx/whoosh-short.mp3", vol: 0.32 },
  typing: { src: "assets/sfx/typing.mp3", vol: 0.38 },
  thud: { src: "assets/sfx/impact-bass-1.mp3", vol: 0.55 },
  tick: { src: "assets/reel/tick.wav", vol: 0.34 },
};

// ---------- monta tudo
const scenes = [buildHook(), ...P.map(buildPoint), buildOutro()];
const overlays = { presenter: buildPresenter(), caps: buildCaptions(), wipes: buildWipes() };
fs.rmSync(path.join(ROOT, "compositions"), { recursive: true, force: true });
fs.mkdirSync(path.join(ROOT, "compositions"), { recursive: true });
for (const s of [...scenes, ...Object.values(overlays)]) fs.writeFileSync(path.join(ROOT, "compositions", `${s.id}.html`), s.html);

const peaks = {};
for (const [k, v] of Object.entries(SFX_FILES)) peaks[k] = peakOffset(path.join(ROOT, v.src));
sfx.sort((a, b) => a.t - b.t);
let audioTags = "";
sfx.forEach((e, i) => {
  const s = SFX_FILES[e.type];
  if (!s) return;
  const pk = e.type === "tick" || e.type === "typing" ? 0 : peaks[e.type].peak;
  const start = Math.max(0, e.t - pk);
  let dur = e.dur ? e.dur + 0.1 : peaks[e.type].len;
  dur = Math.min(dur, D - start - 0.01, e.type === "thud" ? 1.4 : 9);
  if (dur <= 0.05) return;
  audioTags += `\n    <audio id="sfx${i}" class="clip" src="${s.src}" data-start="${f(start)}" data-duration="${f(dur)}" data-volume="${s.vol}" data-track-index="${20 + i}"${e.type === "typing" || e.type === "tick" ? ' data-fade-out="0.08"' : ""}></audio>`;
});

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.12 0 0 0 0 0.11 0 0 0 0 0.10 0 0 0 0.09 0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`;
const host = (s, z, track, kind = "graphics") => `<div id="${s.id}" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${f(s.start)}" data-duration="${f(s.dur)}" data-track-index="${track}" data-track-kind="${kind}" data-width="${W}" data-height="${H}" style="z-index:${z}"></div>`;

const index = `<!doctype html>
<html lang="pt-BR" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${esc(reel.slug)}</title>
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${C.paper}; }
      #root { position: relative; width: 100%; height: 100%; }
      #paper { position: absolute; inset: 0; z-index: 1; background-color: ${C.paper}; background-image: ${GRAIN}; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(D)}" data-width="${W}" data-height="${H}" data-fps="30">
      <div id="paper" class="clip" data-start="0" data-duration="${f(D)}" data-track-index="0"></div>
      ${scenes.map((s) => host(s, 2, 1)).join("\n      ")}
      ${host(overlays.presenter, 3, 2)}
      ${host(overlays.caps, 4, 3, "captions")}
      ${host(overlays.wipes, 5, 4)}
      <audio id="voice" class="clip" src="assets/reel/voice.wav" data-start="0" data-duration="${f(D)}" data-volume="1" data-track-index="10"></audio>
      <audio id="music" class="clip" src="assets/reel/music.wav" data-start="0" data-duration="${f(D)}" data-volume="0.16" data-fade-out="0.8" data-track-index="11"></audio>${audioTags}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.to({}, { duration: ${f(D)} }, 0);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(ROOT, "index.html"), index);
const plan = {
  duration: D,
  scenes: scenes.map((s) => ({ id: s.id, start: +s.start.toFixed(3), end: +(s.start + s.dur).toFixed(3) })),
  wipes, points: P.map((p) => ({ k: p.k, start: p.start, title: p.titleT, explain: p.ex, stamp: p.stampT })),
  snapshots: [0.05, ...P.map((p) => +(p.titleT + 0.5).toFixed(2)), ...P.map((p) => +(p.stampT + 0.3).toFixed(2)), +(closeStart + 1).toFixed(2), +(D - 0.04).toFixed(2)],
  sfx: sfx.length,
};
fs.writeFileSync(path.join(buildDir, "plan.json"), JSON.stringify(plan, null, 1));
console.log(`[build] ${scenes.length} cenas, ${sfx.length} efeitos, ${D.toFixed(2)}s`);
