// Biblioteca de animações de demonstração (a fase "explicação" de cada ponto).
// Cada demo recebe: id do ponto, parâmetros do roteiro e tempos LOCAIS da cena
//   T.in (entra), T.out (sai), T.stamp (carimbo), T.beats {nome: tempo}
// e devolve { html, js, sfx: [{type, t, dur?}], stampPos: {left, top} }.
// O js roda dentro da cena com `tl` e os helpers de RUNTIME (pop, rise, count...).
import { C, ball, plainBall, tv, satellite, globe, icon } from "./icons.mjs";

const f = (n) => Number(n).toFixed(3);
const beat = (T, name, fallback) => (T.beats && T.beats[name] != null ? T.beats[name] : fallback);

export const DEMOS = {
  /** TV antiga: a bola clara atravessa o gramado cinza e some. beats: fade */
  tv_fade(pid, p, T) {
    const fade = beat(T, "fade", T.in + 0.5);
    const inner = `<g id="${pid}-tb"><g>${plainBall({ cx: 52, cy: 112, r: 19, fill: "#A29D95", stroke: "#9E998F" })}</g><g id="${pid}-tbw">${plainBall({ cx: 52, cy: 112, r: 19, fill: "#FFFFFF" })}</g></g>
      <rect id="${pid}-scan" x="30" y="66" width="118" height="5" fill="#B9B4AC" opacity="0.7"/>`;
    return {
      html: `<div id="${pid}-demo" class="demo"><svg viewBox="0 0 200 200" width="680" height="680" style="position:absolute;left:200px;top:440px">${tv({ inner })}</svg></div>`,
      js: `rise(tl,"#${pid}-demo",${f(T.in)});
        tl.fromTo("#${pid}-tb",{x:0},{x:76,duration:${f(T.out - T.in)},ease:"none"},${f(T.in)});
        tl.fromTo("#${pid}-scan",{y:0},{y:96,duration:0.9,ease:"none",repeat:${Math.max(1, Math.ceil((T.out - T.in) / 0.9))}},${f(T.in)});
        tl.fromTo("#${pid}-tbw",{opacity:1},{opacity:0.06,duration:0.8,ease:"power1.inOut"},${f(fade)});`,
      sfx: [{ type: "whoosh", t: T.in }],
      stampPos: { left: 560, top: 1040 },
    };
  },

  /** Bola de 32 gomos rolando numa faixa cinza, com mira vermelha seguindo. beats: spin */
  ball_spin(pid, p, T) {
    const spin = beat(T, "spin", T.in + 0.3);
    const travel = Math.max(0.8, T.out - spin - 0.25);
    let stripes = "";
    for (let i = 0; i < 6; i++) stripes += `<rect x="0" y="${i * 70 + 35}" width="840" height="35" fill="${C.field2}"/>`;
    return {
      html: `<div id="${pid}-demo" class="demo">
        <div class="cw" style="left:120px;top:540px;width:840px;height:420px"><div class="hs"></div><div class="cd" style="background:${C.field}">
          <svg width="840" height="420" style="position:absolute;left:-3px;top:-3px">${stripes}</svg></div></div>
        <div id="${pid}-bw" style="position:absolute;left:150px;top:600px;width:300px;height:300px">
          <svg id="${pid}-ball" viewBox="0 0 200 200" width="300" height="300">${ball()}</svg>
          <svg id="${pid}-aim" viewBox="0 0 200 200" width="300" height="300" style="position:absolute;left:0;top:0;opacity:0" overflow="visible">
            <circle cx="100" cy="100" r="112" fill="none" stroke="${C.red}" stroke-width="7" stroke-dasharray="26 16"/>
            <path d="M100,-30V2M100,198V230M-30,100H2M198,100H230" stroke="${C.red}" stroke-width="8" stroke-linecap="round"/></svg>
        </div></div>`,
      js: `rise(tl,"#${pid}-demo",${f(T.in)});
        pop(tl,"#${pid}-ball",${f(T.in + 0.05)});
        tl.fromTo("#${pid}-bw",{x:0},{x:480,duration:${f(travel)},ease:"power1.inOut"},${f(spin)});
        tl.fromTo("#${pid}-ball",{rotation:0},{rotation:720,duration:${f(travel)},ease:"power1.inOut"},${f(spin)});
        pop(tl,"#${pid}-aim",${f(Math.max(spin + 0.2, T.stamp - 0.25))});`,
      sfx: [{ type: "pop", t: T.in + 0.05 }, { type: "whoosh", t: spin + 0.1 }],
      stampPos: { left: 600, top: 1000 },
    };
  },

  /** Satélite orbitando a Terra que vira bola. beats: morph */
  orbit_morph(pid, p, T) {
    const morph = beat(T, "morph", T.in + 1.2);
    const d = Math.max(0.6, morph - T.in);
    const A = Math.PI / 2 + 2 * Math.PI * Math.max(0, Math.round(d / 2.6));
    return {
      html: `<div id="${pid}-demo" class="demo">
        <svg width="840" height="560" style="position:absolute;left:120px;top:500px" overflow="visible">
          <ellipse cx="420" cy="290" rx="380" ry="140" fill="none" stroke="${C.gray}" stroke-width="4" stroke-dasharray="14 12" transform="rotate(-10 420 290)"/></svg>
        <div id="${pid}-gl" style="position:absolute;left:390px;top:640px;width:300px;height:300px;z-index:2">${icon("globe", {}, 300)}</div>
        <div id="${pid}-sw" style="position:absolute;left:0;top:0;width:170px;height:170px;z-index:3">
          <div id="${pid}-sat" style="position:absolute;inset:0">${icon("satellite", {}, 170)}</div>
          <div id="${pid}-sb" style="position:absolute;inset:0;opacity:0">${icon("ball", {}, 170)}</div></div></div>`,
      js: `rise(tl,"#${pid}-demo",${f(T.in)});
        (function(){const w=document.querySelector("#${pid}-sw");const o={a:0};
          const place=()=>{const a=o.a, x=540+380*Math.cos(a)-85, y=790+140*Math.sin(a)-85-380*Math.cos(a)*0.17;
            const s=0.8+0.25*Math.sin(a); w.style.transform="translate("+x.toFixed(1)+"px,"+y.toFixed(1)+"px) scale("+s.toFixed(3)+")"; w.style.zIndex=Math.sin(a)>0?3:1;};
          place(); tl.to(o,{a:${f(A)},duration:${f(d)},ease:"power1.inOut",onUpdate:place},${f(T.in)});})();
        tl.fromTo("#${pid}-sat",{scale:1,opacity:1},{scale:1.3,opacity:0,duration:0.3,ease:"power2.in"},${f(morph)});
        pop(tl,"#${pid}-sb",${f(morph + 0.18)});
        tl.fromTo("#${pid}-gl",{opacity:1},{opacity:0.25,duration:0.4},${f(morph)});`,
      sfx: [{ type: "whoosh", t: T.in }, { type: "pop", t: morph + 0.18 }],
      stampPos: { left: 600, top: 1030 },
    };
  },

  /** Grade com N bolas que depois vira um número grande. params: n, big, big_label. beats: multiply */
  grid_multiply(pid, p, T) {
    const d = p.demo;
    const n = Math.min(d.n || 20, 30);
    const mult = beat(T, "multiply", T.in + 0.8);
    const cols = 5, size = 120, gap = 22;
    const rows = Math.ceil(n / cols);
    const gw = cols * size + (cols - 1) * gap, gh = rows * size + (rows - 1) * gap;
    let cells = "";
    for (let i = 0; i < n; i++) {
      const x = (i % cols) * (size + gap), y = Math.floor(i / cols) * (size + gap);
      cells += `<div class="${pid}-gi" style="position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px">${icon("ball", {}, size)}</div>`;
    }
    const top = 520;
    return {
      html: `<div id="${pid}-demo" class="demo">
        <div id="${pid}-grid" style="position:absolute;left:${540 - gw / 2}px;top:${top}px;width:${gw}px;height:${gh}px">${cells}</div>
        <div id="${pid}-bigw" style="position:absolute;left:120px;top:${top + 170}px;width:840px;text-align:center;opacity:0">
          <div id="${pid}-big" class="anton" style="font-size:230px;line-height:1;color:${C.ink}">0</div>
          <div class="mono" style="font-size:34px;color:${C.gray};margin-top:18px">${d.big_label || ""}</div></div></div>`,
      js: `tl.set("#${pid}-demo",{opacity:1},${f(T.in)});
        tl.fromTo(".${pid}-gi",{scale:0.55,opacity:0},{scale:1,opacity:1,duration:0.34,ease:"back.out(2.2)",stagger:0.04},${f(T.in)});
        tl.to("#${pid}-grid",{scale:0.3,x:-300,y:-250,opacity:0.5,duration:0.4,ease:"power3.inOut"},${f(mult - 0.1)});
        rise(tl,"#${pid}-bigw",${f(mult)});
        count(tl,"#${pid}-big",${d.big || 1000},${f(mult)},1.15,"thousands");`,
      sfx: [{ type: "pop", t: T.in }, { type: "tick", t: mult, dur: 1.15 }],
      stampPos: { left: 580, top: 1020 },
    };
  },

  /** Número gigante contando. params: value, label, format (plain|thousands), prefix, suffix */
  big_number(pid, p, T) {
    const d = p.demo;
    return {
      html: `<div id="${pid}-demo" class="demo" style="position:absolute;left:120px;top:560px;width:840px;text-align:center">
        <div class="anton" style="font-size:240px;line-height:1;color:${C.ink}">${d.prefix || ""}<span id="${pid}-n">0</span>${d.suffix || ""}</div>
        <div class="mono" style="font-size:34px;color:${C.gray};margin-top:18px">${d.label || ""}</div></div>`,
      js: `rise(tl,"#${pid}-demo",${f(T.in)}); count(tl,"#${pid}-n",${d.value || 100},${f(T.in + 0.1)},1.15,"${d.format || "plain"}");`,
      sfx: [{ type: "tick", t: T.in + 0.1, dur: 1.15 }],
      stampPos: { left: 600, top: 960 },
    };
  },

  /** Placar genérico. params: home, away, a, b, minute. beats: score */
  scoreboard(pid, p, T) {
    const d = p.demo;
    const sc = beat(T, "score", T.in + 0.5);
    return {
      html: `<div id="${pid}-demo" class="demo">
        <div class="cw" style="left:120px;top:580px;width:840px;height:360px"><div class="hs"></div><div class="cd" style="background:${C.ink}">
          <div class="mono" style="position:absolute;top:26px;width:100%;text-align:center;color:#FBFAF8;font-size:30px">${d.minute || ""}</div>
          <div class="anton" style="position:absolute;top:96px;left:0;width:50%;text-align:center;color:#FBFAF8;font-size:170px;line-height:1"><span id="${pid}-a">0</span></div>
          <div class="anton" style="position:absolute;top:96px;right:0;width:50%;text-align:center;color:${C.red};font-size:170px;line-height:1"><span id="${pid}-b">0</span></div>
          <div class="mono" style="position:absolute;bottom:26px;left:0;width:50%;text-align:center;color:#FBFAF8;font-size:32px">${d.home || ""}</div>
          <div class="mono" style="position:absolute;bottom:26px;right:0;width:50%;text-align:center;color:#FBFAF8;font-size:32px">${d.away || ""}</div>
        </div></div></div>`,
      js: `rise(tl,"#${pid}-demo",${f(T.in)}); count(tl,"#${pid}-a",${d.a || 0},${f(sc)},0.8,"plain"); count(tl,"#${pid}-b",${d.b || 0},${f(sc + 0.3)},0.8,"plain");`,
      sfx: [{ type: "tick", t: sc, dur: 1.1 }],
      stampPos: { left: 600, top: 980 },
    };
  },

  /** Linha do tempo com marcos. params: items [{year,label}], highlight (índice). beats: highlight */
  timeline(pid, p, T) {
    const d = p.demo;
    const items = (d.items || []).slice(0, 5);
    const hl = beat(T, "highlight", T.in + 0.9);
    const step = 760 / Math.max(1, items.length - 1);
    let dots = "";
    items.forEach((it, i) => {
      const x = 160 + i * step;
      dots += `<div class="${pid}-ti" style="position:absolute;left:${x - 60}px;top:700px;width:120px;text-align:center">
        <div style="width:34px;height:34px;border-radius:50%;background:${i === d.highlight ? C.red : C.ink};margin:0 auto"></div>
        <div class="anton" style="font-size:48px;margin-top:16px;color:${C.ink}">${it.year}</div>
        <div class="mono" style="font-size:24px;color:${C.gray}">${it.label || ""}</div></div>`;
    });
    const hx = 160 + (d.highlight || 0) * step;
    return {
      html: `<div id="${pid}-demo" class="demo"><div style="position:absolute;left:150px;top:713px;width:780px;height:8px;background:${C.ink};border-radius:4px"></div>${dots}
        <svg width="220" height="220" style="position:absolute;left:${hx - 110}px;top:608px" overflow="visible"><path id="${pid}-hr" pathLength="1" d="M110,14C180,10 214,60 206,112C198,170 140,206 92,198C34,188 6,140 16,92C26,40 70,12 128,18" fill="none" stroke="${C.red}" stroke-width="9" stroke-linecap="round" stroke-dasharray="1 1.2" stroke-dashoffset="1.1"/></svg></div>`,
      js: `tl.set("#${pid}-demo",{opacity:1},${f(T.in)}); tl.fromTo(".${pid}-ti",{y:40,opacity:0},{y:0,opacity:1,duration:0.4,ease:"power3.out",stagger:0.16},${f(T.in)}); draw(tl,"#${pid}-hr",${f(hl)},0.45);`,
      sfx: [{ type: "pop", t: T.in }, { type: "pop", t: hl }],
      stampPos: { left: 600, top: 1000 },
    };
  },

  /** Barras comparando valores. params: items [{label,value}], format. */
  bars(pid, p, T) {
    const d = p.demo;
    const items = (d.items || []).slice(0, 4);
    const max = Math.max(...items.map((i) => i.value), 1);
    let rows = "";
    items.forEach((it, i) => {
      const w = Math.round(560 * (it.value / max));
      rows += `<div style="position:absolute;left:120px;top:${560 + i * 120}px;width:840px;height:100px">
        <div class="mono" style="font-size:28px;color:${C.gray}">${it.label}</div>
        <div class="${pid}-bar" style="position:absolute;top:40px;left:0;height:54px;width:${w}px;background:${i === items.length - 1 ? C.red : C.ink};border-radius:8px;transform-origin:left center"></div>
        <div class="anton" style="position:absolute;top:34px;left:${w + 20}px;font-size:56px;color:${C.ink}"><span id="${pid}-v${i}">0</span></div></div>`;
    });
    const js = items.map((it, i) => `count(tl,"#${pid}-v${i}",${it.value},${f(T.in + 0.15 + i * 0.2)},1.15,"${d.format || "thousands"}");`).join("");
    return {
      html: `<div id="${pid}-demo" class="demo">${rows}</div>`,
      js: `tl.set("#${pid}-demo",{opacity:1},${f(T.in)}); tl.fromTo(".${pid}-bar",{scaleX:0},{scaleX:1,duration:0.6,ease:"power3.out",stagger:0.2},${f(T.in + 0.1)});${js}`,
      sfx: [{ type: "tick", t: T.in + 0.15, dur: 1.15 }],
      stampPos: { left: 600, top: 1040 },
    };
  },

  /** Cartão do árbitro subindo. params: color (yellow|red), text. beats: show */
  card_flip(pid, p, T) {
    const d = p.demo;
    const show = beat(T, "show", T.in + 0.2);
    return {
      html: `<div id="${pid}-demo" class="demo"><div id="${pid}-rc" style="position:absolute;left:340px;top:520px;width:400px;height:400px">${icon(d.color === "red" ? "card-red" : "card", {}, 400)}</div>
        <div class="mono" style="position:absolute;left:120px;top:940px;width:840px;text-align:center;font-size:36px;color:${C.ink}">${d.text || ""}</div></div>`,
      js: `tl.set("#${pid}-demo",{opacity:1},${f(T.in)}); tl.fromTo("#${pid}-rc",{y:260,rotation:-25,opacity:0},{y:0,rotation:0,opacity:1,duration:0.45,ease:"back.out(2.2)"},${f(show)});`,
      sfx: [{ type: "whoosh", t: show }],
      stampPos: { left: 620, top: 1010 },
    };
  },

  /** Campo visto de cima, bola fazendo uma curva até o gol. beats: goal */
  pitch_path(pid, p, T) {
    const g = beat(T, "goal", T.out - 0.6);
    const d0 = Math.max(0.5, g - T.in - 0.1);
    return {
      html: `<div id="${pid}-demo" class="demo">
        <div style="position:absolute;left:120px;top:520px;width:840px;height:560px">${`<svg viewBox="0 0 200 200" width="840" height="560" preserveAspectRatio="none">${icon("pitch", {}, 200).replace(/<\/?svg[^>]*>/g, "")}</svg>`}</div>
        <svg width="840" height="560" style="position:absolute;left:120px;top:520px" overflow="visible"><path id="${pid}-pp" pathLength="1" d="M140,420C300,120 600,520 800,280" fill="none" stroke="${C.red}" stroke-width="7" stroke-dasharray="1 1.2" stroke-dashoffset="1.1" stroke-linecap="round"/></svg>
        <div id="${pid}-pb" style="position:absolute;left:0;top:0;width:70px;height:70px">${icon("ball", {}, 70)}</div></div>`,
      js: `rise(tl,"#${pid}-demo",${f(T.in)}); draw(tl,"#${pid}-pp",${f(T.in + 0.1)},${f(d0)});
        (function(){const b=document.querySelector("#${pid}-pb");const o={u:0};const P=[[140,420],[300,120],[600,520],[800,280]];
          const at=()=>{const u=o.u,v=1-u;const x=v*v*v*P[0][0]+3*v*v*u*P[1][0]+3*v*u*u*P[2][0]+u*u*u*P[3][0];const y=v*v*v*P[0][1]+3*v*v*u*P[1][1]+3*v*u*u*P[2][1]+u*u*u*P[3][1];
            b.style.transform="translate("+(120+x-35).toFixed(1)+"px,"+(520+y-35).toFixed(1)+"px) rotate("+(u*900).toFixed(0)+"deg)";};
          at(); tl.to(o,{u:1,duration:${f(d0)},ease:"power2.inOut",onUpdate:at},${f(T.in + 0.1)});})();`,
      sfx: [{ type: "whoosh", t: T.in + 0.1 }, { type: "thud", t: g }],
      stampPos: { left: 600, top: 1040 },
    };
  },

  /** Até 3 desenhos com legenda aparecendo em sequência. params: items [{icon,label}] */
  icon_pop(pid, p, T) {
    const items = (p.demo.items || []).slice(0, 3);
    const w = 840 / Math.max(1, items.length);
    const html = items.map((it, i) => `<div class="${pid}-ip" style="position:absolute;left:${120 + i * w}px;top:600px;width:${w}px;text-align:center">
      <div style="display:inline-block">${icon(it.icon, it, Math.min(240, w - 30))}</div>
      <div class="mono" style="font-size:30px;color:${C.ink};margin-top:14px">${it.label || ""}</div></div>`).join("");
    const times = items.map((it, i) => (T.beats && T.beats["i" + i] != null ? T.beats["i" + i] : T.in + i * 0.35));
    return {
      html: `<div id="${pid}-demo" class="demo">${html}</div>`,
      js: `tl.set("#${pid}-demo",{opacity:1},${f(T.in)});` + times.map((t, i) => `pop(tl,".${pid}-ip:nth-child(${i + 1})",${f(t)});`).join(""),
      sfx: times.map((t) => ({ type: "pop", t })),
      stampPos: { left: 600, top: 1010 },
    };
  },

  /** Semáforo genérico: acende o amarelo, depois o vermelho, e um cartão de cada cor desliza ao lado.
   *  beats: yellow, red */
  traffic_light(pid, p, T) {
    const y = beat(T, "yellow", T.in + 0.5);
    const r = beat(T, "red", y + 0.8);
    const lamp = (cy, idn) => `<circle cx="100" cy="${cy}" r="34" fill="#4A4642" stroke="${C.ink}" stroke-width="5"/>` +
      (idn ? `<circle id="${pid}-${idn}" cx="100" cy="${cy}" r="34" fill="${idn === "ly" ? "#EFC23A" : C.red}" stroke="${C.ink}" stroke-width="5" opacity="0"/>` : "");
    const svg = `<svg viewBox="0 0 200 400" width="300" height="600" overflow="visible">
      <rect x="92" y="330" width="16" height="70" fill="${C.ink}"/>
      <rect x="44" y="18" width="112" height="320" rx="22" fill="#2C2926" stroke="${C.ink}" stroke-width="5"/>
      ${lamp(90, "lr")}${lamp(178, "ly")}${lamp(266, null)}</svg>`;
    return {
      html: `<div id="${pid}-demo" class="demo">
        <div style="position:absolute;left:170px;top:470px;width:300px;height:600px">${svg}</div>
        <div id="${pid}-cy" style="position:absolute;left:520px;top:500px;width:260px;height:260px;opacity:0">${icon("card", {}, 260)}</div>
        <div id="${pid}-cyl" class="mono" style="position:absolute;left:770px;top:600px;font-size:32px;color:${C.ink};opacity:0">atenção</div>
        <div id="${pid}-cr" style="position:absolute;left:520px;top:780px;width:260px;height:260px;opacity:0">${icon("card-red", {}, 260)}</div>
        <div id="${pid}-crl" class="mono" style="position:absolute;left:770px;top:880px;font-size:32px;color:${C.red};opacity:0">fora</div></div>`,
      js: `rise(tl,"#${pid}-demo",${f(T.in)});
        tl.to("#${pid}-ly",{opacity:1,duration:0.12},${f(y)}); pop(tl,"#${pid}-cy",${f(y + 0.08)}); pop(tl,"#${pid}-cyl",${f(y + 0.2)});
        tl.to("#${pid}-ly",{opacity:0,duration:0.12},${f(r)}); tl.to("#${pid}-lr",{opacity:1,duration:0.12},${f(r)});
        pop(tl,"#${pid}-cr",${f(r + 0.08)}); pop(tl,"#${pid}-crl",${f(r + 0.2)});`,
      sfx: [{ type: "whoosh", t: T.in }, { type: "pop", t: y + 0.08 }, { type: "pop", t: r + 0.08 }],
      stampPos: { left: 600, top: 1080 },
    };
  },
};
