// Desenhos planos de futebol em SVG (viewBox 0 0 200 200), contorno em tinta.
// Todos originais e genéricos: nada de escudos, marcas ou jogadores reais.
export const C = {
  paper: "#EBE7E1", ink: "#1E1C1A", red: "#D7372C", gray: "#8A857E",
  card: "#FBFAF8", light: "#B5AFA7", field: "#9C978F", field2: "#A7A29A",
};
const S = `stroke="${C.ink}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`;
let uid = 0;
const id = (p) => `${p}${++uid}`;

const pent = (cx, cy, r, rot = -90) =>
  Array.from({ length: 5 }, (_, k) => {
    const a = ((rot + 72 * k) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
const pts = (arr) => arr.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");

/** Bola clássica de 32 gomos vista de cima de um pentágono. */
export function ball({ cx = 100, cy = 100, r = 88, dark = C.ink, light = "#FFFFFF", line = C.ink, sw = 5, faint = false } = {}) {
  const k = r / 88;
  const clip = id("bc");
  if (faint) { dark = "#B9B4AC"; light = "#C2BDB5"; line = "#B3AEA6"; }
  const center = pent(cx, cy, 27 * k);
  const outers = [];
  const seams = [];
  for (let i = 0; i < 5; i++) {
    const a = ((-90 + 72 * i) * Math.PI) / 180;
    const ox = cx + 84 * k * Math.cos(a), oy = cy + 84 * k * Math.sin(a);
    const op = pent(ox, oy, 27 * k, -90 + 72 * i + 180);
    outers.push(op);
    seams.push([center[i], op[0]]);
  }
  for (let i = 0; i < 5; i++) {
    const a = outers[i], b = outers[(i + 1) % 5];
    seams.push([a[1], b[4]]);
    // costuras que saem para a borda
    const m = a[2], n = a[3];
    const dir = (p) => { const dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy); return [cx + (dx / L) * r * 1.2, cy + (dy / L) * r * 1.2]; };
    seams.push([m, dir(m)], [n, dir(n)]);
  }
  const seamPath = seams.map(([p, q]) => `M${p[0].toFixed(1)},${p[1].toFixed(1)}L${q[0].toFixed(1)},${q[1].toFixed(1)}`).join("");
  return `<g><defs><clipPath id="${clip}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${light}"/>
  <g clip-path="url(#${clip})">
    <path d="${seamPath}" stroke="${line}" stroke-width="${sw * 0.7}" fill="none" stroke-linecap="round"/>
    <polygon class="pn" points="${pts(center)}" fill="${dark}" stroke="${line}" stroke-width="${sw * 0.7}" stroke-linejoin="round"/>
    ${outers.map((o) => `<polygon class="pn" points="${pts(o)}" fill="${dark}" stroke="${line}" stroke-width="${sw * 0.7}" stroke-linejoin="round"/>`).join("")}
  </g>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${line === C.ink ? C.ink : line}" stroke-width="${sw}"/></g>`;
}

/** Bola lisa antiga (couro claro com costuras). */
export function plainBall({ cx = 100, cy = 100, r = 40, fill = "#FFFFFF", stroke = C.ink } = {}) {
  return `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="5"/>
  <path d="M${cx - r * 0.7},${cy - r * 0.3}Q${cx},${cy - r * 0.05} ${cx + r * 0.7},${cy - r * 0.3}M${cx - r * 0.7},${cy + r * 0.3}Q${cx},${cy + r * 0.55} ${cx + r * 0.7},${cy + r * 0.3}" fill="none" stroke="#CFC9C0" stroke-width="3"/></g>`;
}

/** Televisão antiga. variant: faint (bola sumindo), clear (Telstar visível), empty. */
export function tv({ variant = "empty", screenId = "", inner = "" } = {}) {
  const clip = id("tvc");
  let screen = "";
  if (variant === "faint") screen = plainBall({ cx: 92, cy: 108, r: 20, fill: "#B3AEA6", stroke: "#ABA69E" });
  if (variant === "clear") screen = ball({ cx: 92, cy: 108, r: 22, sw: 3 });
  return `<g>
  <path d="M70,40L96,62L130,26" fill="none" ${S}/>
  <rect x="18" y="58" width="164" height="118" rx="18" fill="#D9D2C7" ${S}/>
  <defs><clipPath id="${clip}"><rect x="30" y="70" width="118" height="94" rx="12"/></clipPath></defs>
  <g clip-path="url(#${clip})" ${screenId ? `id="${screenId}"` : ""}>
    <rect x="30" y="70" width="118" height="94" fill="${C.field}"/>
    <rect x="30" y="84" width="118" height="12" fill="${C.field2}"/><rect x="30" y="108" width="118" height="12" fill="${C.field2}"/><rect x="30" y="132" width="118" height="12" fill="${C.field2}"/><rect x="30" y="156" width="118" height="12" fill="${C.field2}"/>
    ${screen}${inner}
  </g>
  <rect x="30" y="70" width="118" height="94" rx="12" fill="none" ${S}/>
  <circle cx="165" cy="92" r="7" fill="${C.card}" ${S}/><circle cx="165" cy="120" r="7" fill="${C.card}" ${S}/>
  <path d="M40,176L32,192M160,176L168,192" ${S}/>
  </g>`;
}

/** Satélite esférico coberto de painéis (estilo Telstar 1, genérico). */
export function satellite() {
  const clip = id("sc");
  let cells = "";
  for (let y = 40; y < 170; y += 16) for (let x = 40; x < 170; x += 16) cells += `<rect x="${x}" y="${y}" width="11" height="11" rx="2" fill="#5C6B7A"/>`;
  return `<g><path d="M100,30L100,8M92,12L108,12" ${S}/>
  <defs><clipPath id="${clip}"><circle cx="100" cy="104" r="70"/></clipPath></defs>
  <circle cx="100" cy="104" r="70" fill="#C9CED3"/>
  <g clip-path="url(#${clip})">${cells}<rect x="30" y="98" width="140" height="12" fill="#C9CED3"/></g>
  <circle cx="100" cy="104" r="70" fill="none" ${S}/>
  <path d="M30,104L170,104" ${S} stroke-width="3"/></g>`;
}

export function globe() {
  return `<g><circle cx="100" cy="100" r="86" fill="#CFE0E3" ${S}/>
  <ellipse cx="100" cy="100" rx="40" ry="86" fill="none" ${S} stroke-width="3"/>
  <path d="M14,100H186M24,58H176M24,142H176" ${S} stroke-width="3" fill="none"/>
  <path d="M60,40Q80,54 72,72Q62,86 78,96Q92,108 82,128Q72,140 58,132Q44,118 46,96Q48,72 60,40Z" fill="#B9CFA3" stroke="${C.ink}" stroke-width="3"/>
  <path d="M120,60Q140,52 156,70Q166,90 150,100Q136,104 140,124Q144,146 126,150Q112,140 116,118Q118,96 110,84Q108,68 120,60Z" fill="#B9CFA3" stroke="${C.ink}" stroke-width="3"/></g>`;
}

export function trophy() {
  return `<g><path d="M62,30H138V70Q138,118 100,124Q62,118 62,70Z" fill="#E2B84A" ${S}/>
  <path d="M62,44H40Q34,80 66,92M138,44H160Q166,80 134,92" fill="none" ${S}/>
  <path d="M92,124H108V146H92Z" fill="#E2B84A" ${S}/><rect x="66" y="146" width="68" height="26" rx="5" fill="${C.ink}" ${S}/></g>`;
}

export function whistle() {
  return `<g><path d="M40,90H120V74H164V112Q164,150 120,150H84Q40,150 40,112Z" fill="#C9CED3" ${S}/>
  <circle cx="82" cy="118" r="16" fill="${C.ink}"/><path d="M40,98Q20,70 40,50" fill="none" ${S}/></g>`;
}

export function refCard({ color = "yellow" } = {}) {
  const f = color === "red" ? C.red : "#EFC23A";
  return `<g><rect x="56" y="24" width="88" height="128" rx="10" fill="${f}" ${S} transform="rotate(8 100 88)"/>
  <path d="M74,176H126" ${S}/></g>`;
}

export function goal() {
  let net = "";
  for (let x = 30; x <= 170; x += 14) net += `M${x},52L${x + 6},150`;
  for (let y = 60; y <= 150; y += 14) net += `M28,${y}L172,${y}`;
  return `<g><path d="${net}" stroke="${C.light}" stroke-width="2"/>
  <path d="M24,160V44H176V160" fill="none" ${S} stroke-width="8"/><path d="M10,162H190" ${S}/></g>`;
}

export function stopwatch() {
  return `<g><rect x="88" y="18" width="24" height="16" rx="3" fill="${C.ink}"/>
  <circle cx="100" cy="110" r="72" fill="${C.card}" ${S}/>
  <path d="M100,110V62M100,110L132,128" ${S} stroke-width="7"/><circle cx="100" cy="110" r="7" fill="${C.red}"/></g>`;
}

export function calendar({ text = "" } = {}) {
  return `<g><rect x="28" y="36" width="144" height="136" rx="14" fill="${C.card}" ${S}/>
  <path d="M28,74H172" ${S}/><rect x="28" y="36" width="144" height="38" rx="14" fill="${C.red}" ${S}/>
  <path d="M62,24V48M138,24V48" ${S} stroke-width="8"/>
  <text x="100" y="146" text-anchor="middle" font-family="Anton" font-size="62" fill="${C.ink}">${text}</text></g>`;
}

export function pitch() {
  return `<g><rect x="16" y="30" width="168" height="140" rx="8" fill="#A9C48C" ${S}/>
  <path d="M100,30V170M16,80H40V120H16M184,80H160V120H184" fill="none" stroke="#F4F1EA" stroke-width="4"/>
  <circle cx="100" cy="100" r="24" fill="none" stroke="#F4F1EA" stroke-width="4"/></g>`;
}

export function boot() {
  return `<g><path d="M40,40H92V104Q120,104 150,116Q176,126 176,146V158H40Z" fill="${C.ink}" ${S}/>
  <path d="M40,158H176" stroke="#FBFAF8" stroke-width="5"/><path d="M60,170V160M84,170V160M120,170V160M150,170V160" ${S}/>
  <path d="M96,60L120,60M96,76L128,76" stroke="#FBFAF8" stroke-width="4" stroke-linecap="round"/></g>`;
}

export function scoreboardIcon() {
  return `<g><rect x="16" y="46" width="168" height="108" rx="12" fill="${C.ink}" ${S}/>
  <rect x="34" y="70" width="52" height="62" rx="6" fill="#FBFAF8"/><rect x="114" y="70" width="52" height="62" rx="6" fill="#FBFAF8"/>
  <circle cx="100" cy="88" r="4" fill="#FBFAF8"/><circle cx="100" cy="114" r="4" fill="#FBFAF8"/></g>`;
}

export const ICONS = {
  ball: () => ball(), "ball-faint": () => ball({ faint: true }), "plain-ball": () => plainBall({ r: 80 }),
  tv: (o) => tv(o), satellite, globe, trophy, whistle, card: (o) => refCard(o), "card-red": () => refCard({ color: "red" }),
  goal, stopwatch, calendar: (o) => calendar(o), pitch, boot, scoreboard: scoreboardIcon,
};

export function icon(name, opts = {}, size = 200) {
  const fn = ICONS[name] || ICONS.ball;
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" overflow="visible">${fn(opts)}</svg>`;
}
