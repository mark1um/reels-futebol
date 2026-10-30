// Apresentador de cartoon original: óculos, moletom, cores planas, contorno marrom de 6px.
// Rig SVG: cabeça, sobrancelhas, pálpebras, óculos, 10 bocas, 2 mãos separadas.
// Tudo é função do tempo: boca pela loudness, piscadas com semente fixa, balanço, acenos, gestos.
const O = "#3A2418";   // contorno
const SKIN = "#E9B48C", HAIR = "#3B2A20", HOOD = "#2F4E6E", HOOD2 = "#243E59", MOUTH = "#5A1E1A";
const ST = `stroke="${O}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;

function mouths() {
  const out = [];
  out.push(`<g class="mo"><path d="M297,402Q325,412 353,402" fill="none" ${ST}/></g>`);
  for (let i = 1; i < 10; i++) {
    const rx = 22 + i * 2.6, ry = 3 + i * 4.2, cy = 404 + i * 1.2;
    const cid = `mclip${i}`;
    let inner = "";
    if (i >= 4) inner += `<rect x="${325 - rx}" y="${cy - ry}" width="${rx * 2}" height="${Math.min(12, ry * 0.4)}" fill="#FFFFFF"/>`;
    if (i >= 6) inner += `<ellipse cx="325" cy="${cy + ry * 0.75}" rx="${rx * 0.6}" ry="${ry * 0.45}" fill="#D9675E"/>`;
    out.push(`<g class="mo" style="display:none"><defs><clipPath id="${cid}"><ellipse cx="325" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath></defs>
      <ellipse cx="325" cy="${cy}" rx="${rx}" ry="${ry}" fill="${MOUTH}"/><g clip-path="url(#${cid})">${inner}</g>
      <ellipse cx="325" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" ${ST}/></g>`);
  }
  return out.join("");
}

export function presenterSVG() {
  return `<svg id="pr-svg" viewBox="0 0 650 770" width="650" height="770" overflow="visible">
  <g id="pr-body">
    <path d="M30,800L52,650Q72,560 200,526H450Q578,560 598,650L620,800Z" fill="${HOOD}" ${ST}/>
    <path d="M232,530Q325,610 418,530" fill="none" ${ST}/>
    <path d="M292,568L286,660M358,568L364,660" stroke="#F4F1EA" stroke-width="8" stroke-linecap="round"/>
    <circle cx="286" cy="664" r="8" fill="#F4F1EA" ${ST} stroke-width="3"/><circle cx="364" cy="664" r="8" fill="#F4F1EA" ${ST} stroke-width="3"/>
    <path d="M150,640Q160,700 150,800M500,640Q490,700 500,800" fill="none" stroke="${HOOD2}" stroke-width="6"/>
  </g>
  <rect x="290" y="430" width="70" height="110" rx="14" fill="${SKIN}" ${ST}/>
  <path d="M220,526Q325,486 430,526Q420,560 325,566Q230,560 220,526Z" fill="${HOOD2}" ${ST}/>
  <g id="pr-head">
    <circle cx="176" cy="300" r="30" fill="${SKIN}" ${ST}/><circle cx="474" cy="300" r="30" fill="${SKIN}" ${ST}/>
    <ellipse cx="325" cy="292" rx="150" ry="172" fill="${SKIN}" ${ST}/>
    <path d="M172,262Q160,118 304,104Q430,96 476,206Q484,240 478,270Q446,196 384,188Q330,216 262,186Q206,196 172,262Z" fill="${HAIR}" ${ST}/>
    <g id="pr-brows">
      <path d="M228,232Q262,214 296,228" fill="none" stroke="${HAIR}" stroke-width="12" stroke-linecap="round"/>
      <path d="M354,228Q388,214 422,232" fill="none" stroke="${HAIR}" stroke-width="12" stroke-linecap="round"/>
    </g>
    <ellipse cx="262" cy="286" rx="13" ry="16" fill="#2A1A12"/><circle cx="267" cy="280" r="4" fill="#FFFFFF"/>
    <ellipse cx="388" cy="286" rx="13" ry="16" fill="#2A1A12"/><circle cx="393" cy="280" r="4" fill="#FFFFFF"/>
    <rect id="pr-lidl" x="236" y="262" width="52" height="0" fill="${SKIN}"/>
    <rect id="pr-lidr" x="362" y="262" width="52" height="0" fill="${SKIN}"/>
    <rect x="208" y="240" width="108" height="90" rx="32" fill="none" ${ST}/>
    <rect x="334" y="240" width="108" height="90" rx="32" fill="none" ${ST}/>
    <path d="M316,280Q325,268 334,280M208,276L178,268M442,276L472,268" fill="none" ${ST}/>
    <path d="M325,304Q310,346 332,350" fill="none" ${ST}/>
    <g id="pr-mouth">${mouths()}</g>
  </g>
  <g id="pr-hp" transform="translate(0,440)">
    <path d="M36,800V600Q36,570 66,566H128Q156,570 156,600V800Z" fill="${HOOD}" ${ST}/>
    <rect x="60" y="356" width="34" height="140" rx="17" fill="${SKIN}" ${ST}/>
    <path d="M50,470Q48,440 76,440H128Q148,442 148,470V560Q148,580 128,582H70Q50,580 50,560Z" fill="${SKIN}" ${ST}/>
    <path d="M94,470H140M94,506H140M94,540H138" stroke="${O}" stroke-width="4" stroke-linecap="round"/>
    <path d="M50,500Q28,486 36,462Q46,446 62,462" fill="${SKIN}" ${ST}/>
  </g>
  <g id="pr-hv" transform="translate(0,440)">
    <path d="M488,800V610Q488,582 518,578H584Q612,582 612,610V800Z" fill="${HOOD}" ${ST}/>
    <rect x="490" y="372" width="28" height="110" rx="14" fill="${SKIN}" ${ST}/>
    <rect x="522" y="352" width="28" height="130" rx="14" fill="${SKIN}" ${ST}/>
    <rect x="554" y="360" width="28" height="122" rx="14" fill="${SKIN}" ${ST}/>
    <rect x="586" y="384" width="26" height="98" rx="13" fill="${SKIN}" ${ST}/>
    <path d="M490,470H612V546Q612,584 574,586H528Q490,584 490,546Z" fill="${SKIN}" ${ST}/>
    <path d="M490,500Q456,478 462,450Q472,436 490,456" fill="${SKIN}" ${ST}/>
  </g>
</svg>`;
}

/** Código da linha do tempo do apresentador (função pura do tempo). */
export function presenterJS({ duration, mouth, nods, points, explains, seed = 7 }) {
  // piscadas: 0.14 s a cada 2.4-4.2 s, semente fixa
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const blinks = [];
  for (let t = 1.1; t < duration - 0.5; t += 2.4 + rnd() * 1.8) blinks.push(+t.toFixed(3));
  const P1 = duration / Math.max(1, Math.round(duration / 3.6));
  const P2 = duration / Math.max(1, Math.round(duration / 2.2));
  return `(function(){
  const M=${JSON.stringify(mouth)}, B=${JSON.stringify(blinks)}, N=${JSON.stringify(nods)}, PT=${JSON.stringify(points)}, EX=${JSON.stringify(explains)};
  const D=${duration}, P1=${P1.toFixed(4)}, P2=${P2.toFixed(4)};
  const head=document.getElementById("pr-head"), brows=document.getElementById("pr-brows"), body=document.getElementById("pr-body");
  const lidl=document.getElementById("pr-lidl"), lidr=document.getElementById("pr-lidr");
  const hp=document.getElementById("pr-hp"), hv=document.getElementById("pr-hv");
  const mos=[...document.querySelectorAll("#pr-mouth .mo")];
  let cur=0;
  const bump=(t,list,len)=>{let v=0;for(const k of list){const u=t-k;if(u>=0&&u<len){v=Math.max(v,Math.sin(Math.PI*u/len));}}return v;};
  const gesture=(t,list,len)=>{let y=1;for(const k of list){const u=t-k;if(u>=0&&u<len){const up=Math.min(1,u/0.35),dn=Math.min(1,(len-u)/0.35);
    const e=1-Math.pow(1-Math.min(up,dn),3); y=Math.min(y,1-e);}}return y;};
  function render(t){
    t=Math.max(0,Math.min(D,t));
    const f=Math.min(M.length-1,Math.floor(t*30)); const m=M[f]||0;
    if(m!==cur){mos[cur].style.display="none";mos[m].style.display="";cur=m;}
    const nod=bump(t,N,0.5);
    const rot=1.8*Math.sin(2*Math.PI*t/P1)+0.7*Math.sin(2*Math.PI*t/P2)+3*nod;
    const dx=5*Math.sin(2*Math.PI*t/P2), dy=3*Math.sin(2*Math.PI*t/P1*2)+10*nod;
    head.setAttribute("transform","translate("+dx.toFixed(2)+","+dy.toFixed(2)+") rotate("+rot.toFixed(2)+" 325 470)");
    brows.setAttribute("transform","translate(0,"+(-9*nod).toFixed(2)+")");
    body.setAttribute("transform","translate(0,"+(2*Math.sin(2*Math.PI*t/P1*2)).toFixed(2)+")");
    const bl=bump(t,B,0.14), h=(48*bl).toFixed(1);
    lidl.setAttribute("height",h); lidr.setAttribute("height",h);
    const gp=gesture(t,PT,1.7), gv=gesture(t,EX,1.4);
    const wig=Math.sin(t*9)*2;
    hp.setAttribute("transform","translate(0,"+(440*gp).toFixed(1)+") rotate("+((1-gp)*wig).toFixed(2)+" 100 560)");
    hv.setAttribute("transform","translate(0,"+(440*gv).toFixed(1)+") rotate("+((1-gv)*-wig).toFixed(2)+" 550 560)");
  }
  render(0);
  const o={t:0};
  tl.to(o,{t:D,duration:D,ease:"none",onUpdate:()=>render(o.t)},0);
})();`;
}

/** Converte loudness (dB por quadro, 30 fps) em índice de boca 0-9. */
export function mouthFrames(loud) {
  const out = [];
  let lvl = 0;
  for (const db of loud) {
    const target = Math.max(0, Math.min(1, (db + 42) / 26)) * 9;
    lvl = target >= lvl ? target : Math.max(target, lvl - 0.55); // ataque instantâneo, liberação 0.55/quadro
    out.push(Math.round(lvl));
  }
  return out;
}
