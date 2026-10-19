// OCR de ecra feito na Onda: rede glifo->caractere (treinada em JS sobre glifos Roboto Mono renderizados),
// a correr em Onda. Le os pixeis do ecra, fatia em celulas e reconhece texto + posicoes, muito rapido.
// Gera ex/ocr.onda + web/onda-ocr.html. Pre-req: /tmp/claude-0/ocr.json (glifos).
const fs=require('fs'), ROOT='/home/user/escolaplay/onda';
const G=JSON.parse(fs.readFileSync('/tmp/claude-0/ocr.json','utf8'));
const CHARS=G.CHARS, CW=G.CW, CH=G.CH, aw=G.aw, FS=G.FS, V=CHARS.length, IN=CW*CH, HID=128;
function rnd(j){var h=Math.sin(j*12.9898)*43758.5453;return (h-Math.floor(h))-0.5;}
function shift(v,dx,dy){const o=new Array(IN).fill(0);for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){const sx=x-dx,sy=y-dy;if(sx>=0&&sx<CW&&sy>=0&&sy<CH)o[y*CW+x]=v[sy*CW+sx];}return o;}
function centroid(v){let sx=0,sy=0,sw=0;for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){const p=v[y*CW+x];if(p>0.3){sx+=x*p;sy+=y*p;sw+=p;}}return sw<0.5?null:[sx/sw,sy/sw];}
function align(v){const c=centroid(v);if(!c)return v.slice();return shift(v,Math.round(CW/2-c[0]),Math.round(CH/2-c[1]));}  // re-centra pela tinta -> invariante ao renderizador
function blur(v){const o=new Array(IN).fill(0);for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){let s=0,n=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const yy=y+a,xx=x+b;if(yy>=0&&yy<CH&&xx>=0&&xx<CW){s+=v[yy*CW+xx];n++;}}o[y*CW+x]=s/n;}return o;}
function dil(v){const o=new Array(IN).fill(0);for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){let m=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const yy=y+a,xx=x+b;if(yy>=0&&yy<CH&&xx>=0&&xx<CW&&v[yy*CW+xx]>m)m=v[yy*CW+xx];}o[y*CW+x]=m;}return o;}
function ero(v){const o=new Array(IN).fill(0);for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){let m=1;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const yy=y+a,xx=x+b;if(yy>=0&&yy<CH&&xx>=0&&xx<CW){if(v[yy*CW+xx]<m)m=v[yy*CW+xx];}else m=0;}o[y*CW+x]=m;}return o;}
let X=[],Y=[];
CHARS.split('').forEach((ch,ci)=>{const base=align(G.data[ch]);               // treina sobre glifos re-centrados
  const vars=[base];
  for(const dx of[-1,0,1])for(const dy of[-1,0,1])vars.push(shift(base,dx,dy));
  const bl=blur(base),dl=dil(base),er=ero(base);
  for(const s of[0.55,0.75])vars.push(base.map(p=>Math.min(1,p*s)));          // intensidade
  vars.push(base.map((p,i)=>p*0.55+bl[i]*0.45));                               // desfoque (AA + suave)
  vars.push(base.map((p,i)=>Math.min(1,Math.max(0,p*1.5-bl[i]*0.5))));         // agucado (AA + nitido)
  vars.push(base.map((p,i)=>Math.min(1,p*0.6+dl[i]*0.4)));                     // traco + grosso (peso/hinting)
  vars.push(base.map((p,i)=>p*0.6+er[i]*0.4));                                 // traco + fino
  vars.forEach(v=>{X.push(v);Y.push(ci);});});
let W1=Array.from({length:HID},(_,h)=>Array.from({length:IN},(_,i)=>rnd(h*191+i+1)*0.1)),b1=Array(HID).fill(0);
let W2=Array.from({length:V},(_,c)=>Array.from({length:HID},(_,h)=>rnd(c*83+h+1)*0.1)),b2=Array(V).fill(0);
const th=Math.tanh;
function fwd(x){const h=new Float64Array(HID);for(let hh=0;hh<HID;hh++){let s=b1[hh];for(let i=0;i<IN;i++)s+=W1[hh][i]*x[i];h[hh]=th(s);}
  const z=new Float64Array(V);for(let c=0;c<V;c++){let s=b2[c];for(let hh=0;hh<HID;hh++)s+=W2[c][hh]*h[hh];z[c]=s;}
  let m=-1e9;for(const v of z)if(v>m)m=v;let S=0;const p=new Float64Array(V);for(let c=0;c<V;c++){p[c]=Math.exp(z[c]-m);S+=p[c];}for(let c=0;c<V;c++)p[c]/=S;return{h,p};}
for(let ep=0;ep<110;ep++){for(let n=0;n<X.length;n++){const x=X[n],{h,p}=fwd(x),dz=p.slice();dz[Y[n]]-=1;const LR=0.06;
  for(let c=0;c<V;c++){b2[c]-=LR*dz[c];const w=W2[c];for(let hh=0;hh<HID;hh++)w[hh]-=LR*dz[c]*h[hh];}
  const dh=new Float64Array(HID);for(let hh=0;hh<HID;hh++){let g=0;for(let c=0;c<V;c++)g+=dz[c]*W2[c][hh];dh[hh]=g*(1-h[hh]*h[hh]);}
  for(let hh=0;hh<HID;hh++){b1[hh]-=LR*dh[hh];const w=W1[hh];for(let i=0;i<IN;i++)w[i]-=LR*dh[hh]*x[i];}}}
let nc=0;X.forEach((x,n)=>{if(fwd(x).p.indexOf(Math.max(...fwd(x).p))===Y[n])nc++;});
console.error('treino OCR '+nc+'/'+X.length+' (V='+V+' IN='+IN+' HID='+HID+')');
const fl=x=>{let s=(+x).toFixed(5).replace(/0+$/,'').replace(/\.$/,'.0');return s;};
function chunks(name,arr){const CHK=240,fns=[],calls=[];for(let s=0;s<arr.length;s+=CHK){const fn=name+'_'+(s/CHK|0);
  fns.push(': '+fn+' i>i a { '+arr.slice(s,s+CHK).map(e=>'!f + a '+e.i+' '+fl(e.v)).join(' ')+' 0 }');calls.push(fn+' '+name);}return{fns,calls};}
const w1a=[];W1.forEach((w,h)=>w.forEach((v,i)=>{if(v!==0)w1a.push({i:h*IN+i,v});}));
const w2a=[];W2.forEach((w,c)=>w.forEach((v,h)=>{if(v!==0)w2a.push({i:c*HID+h,v});}));
const c1=chunks('w1',w1a),c2=chunks('w2',w2a);
let L=[];
L.push('# ocr: reconhecedor de texto de ecra feito na Onda. le W + pixeis; fatia em celulas; glifo->caractere.');
L.push(': tanhf f>f z - * 2.0 / 1.0 + 1.0 Ex * -1.0 * 2.0 z 1.0');
c1.fns.forEach(f=>L.push(f)); c2.fns.forEach(f=>L.push(f));
L.push(': main >i {');
const bytes=CHARS.split('').map(c=>c.charCodeAt(0));
L.push('  = cs A '+V); bytes.forEach((b,i)=>L.push('  ! + cs '+i+' '+b));
L.push('  = w1 A '+(HID*IN)); c1.calls.forEach(c=>L.push('  '+c));
L.push('  = b1 A '+HID); b1.forEach((v,i)=>{if(v!==0)L.push('  !f + b1 '+i+' '+fl(v));});
L.push('  = w2 A '+(V*HID)); c2.calls.forEach(c=>L.push('  '+c));
L.push('  = b2 A '+V); b2.forEach((v,i)=>{if(v!==0)L.push('  !f + b2 '+i+' '+fl(v));});
// ler W (texto ate newline)
L.push('  = w 0 = ch R W && >= ch 0 != ch 10 { ? && >= ch 48 <= ch 57 = w + * w 10 - ch 48 0 = ch R }');
// ler w*CH pixeis
L.push('  = np * w '+CH+' = pix A np = i 0 = ch R W && >= ch 0 < i np { ! + pix i ch = i + i 1 = ch R }');
// OCR por celula
L.push('  = aw '+fl(aw)+' = ncol I + / F w aw 0.5 = ci 0');
L.push('  W < ci ncol {');
L.push('    = x0 I + * F ci aw 0.5');
L.push('    ? <= + x0 '+CW+' w {');
L.push('      = xv A '+IN+' = yy 0 W < yy '+CH+' { = xx 0 W < xx '+CW+' { !f + xv + * yy '+CW+' xx / F @ + pix + * yy w + x0 xx 255.0 = xx + xx 1 } = yy + yy 1 }');
L.push('      = sx 0.0 = sy 0.0 = sw 0.0 = yy 0 W < yy '+CH+' { = xx 0 W < xx '+CW+' { = v @f + xv + * yy '+CW+' xx ? > v 0.3 { = sx + sx * F xx v = sy + sy * F yy v = sw + sw v 0 } 0 = xx + xx 1 } = yy + yy 1 }');
L.push('      = dx 0 = dy 0 ? > sw 0.5 { = dx I + - / F '+CW+' 2.0 / sx sw 0.5 = dy I + - / F '+CH+' 2.0 / sy sw 0.5 } 0');
L.push('      = xv2 A '+IN+' = yy 0 W < yy '+CH+' { = xx 0 W < xx '+CW+' { = sxx - xx dx = syy - yy dy !f + xv2 + * yy '+CW+' xx ? && && >= sxx 0 < sxx '+CW+' && >= syy 0 < syy '+CH+' @f + xv + * syy '+CW+' sxx 0.0 = xx + xx 1 } = yy + yy 1 }');
L.push('      = hdn A '+HID+' = hh 0 W < hh '+HID+' { = s @f + b1 hh = i 0 W < i '+IN+' { = s + s * @f + w1 + * hh '+IN+' i @f + xv2 i = i + i 1 } !f + hdn hh tanhf s = hh + hh 1 }');
L.push('      = bi 0 = bv -1000000.0 = c 0 W < c '+V+' { = z @f + b2 c = hh 0 W < hh '+HID+' { = z + z * @f + w2 + * c '+HID+' hh @f + hdn hh = hh + hh 1 } ? > z bv { = bv z = bi c } 0 = c + c 1 }');
L.push('      P @ + cs bi } 0');
L.push('    = ci + ci 1 }');
L.push('  "\\n" 0 }');
const src=L.join('\n')+'\n';
fs.writeFileSync(ROOT+'/ex/ocr.onda', src); fs.writeFileSync('/tmp/claude-0/ocr.onda', src);
console.error('ex/ocr.onda: pesos w1='+w1a.length+' w2='+w2a.length+' funcoes='+(c1.fns.length+c2.fns.length));

// ----- artefacto -----
const WASM_B64=fs.readFileSync(ROOT+'/build/w2.wasm').toString('base64');
const ONDAC=fs.readFileSync(ROOT+'/web/ondac.js','utf8');
const html=`<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>Onda · OCR</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Roboto+Mono:wght@500&display=swap">
<style>
 :root{--ink:#eef2fb;--mut:#9fb0d8;--card:#141a2e;--line:#283255;--a:#7ee0ff;--b:#b98cff;--ok:#8ff0c0;
   --f:"Baloo 2","Arial Rounded MT Bold",system-ui,sans-serif;--m:"Roboto Mono",ui-monospace,monospace;color-scheme:dark}
 *{box-sizing:border-box}html,body{margin:0;min-height:100%}
 body{background:radial-gradient(900px 600px at 50% -10%,#1a2350,transparent 60%),linear-gradient(180deg,#0a0e1c,#0d1228);
   color:var(--ink);font:15px/1.45 var(--f);-webkit-tap-highlight-color:transparent;min-height:100vh}
 .wrap{max-width:460px;margin:0 auto;display:flex;flex-direction:column;gap:13px;padding:max(16px,env(safe-area-inset-top,0px)) 16px max(18px,env(safe-area-inset-bottom,0px))}
 h1{margin:0;text-align:center;font-size:23px;font-weight:800}
 h1 small{display:block;font-size:12.5px;font-weight:700;color:var(--mut)}
 textarea{width:100%;min-height:62px;resize:vertical;background:#0b0f1f;color:#dfe8ff;border:1px solid var(--line);border-radius:14px;padding:11px;font:500 15px/1.5 var(--m)}
 .bar{display:flex;gap:9px}.bar .go{flex:1;border:0;border-radius:14px;color:#071018;font:800 15px var(--f);padding:12px 0;cursor:pointer;background:linear-gradient(120deg,var(--a),var(--b))}
 .bar .go:active{transform:translateY(2px)}
 .screen{position:relative;border:1px solid var(--line);border-radius:14px;overflow:auto;padding:8px;background:#070b16}
 .screen canvas{display:block;image-rendering:pixelated}
 .out{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;min-height:54px;font:600 15px var(--m);color:var(--ok);white-space:pre-wrap;overflow-wrap:anywhere}
 .stat{font:700 11px var(--m);color:var(--mut);text-align:center}
 .note{color:var(--mut);font-size:12px;font-weight:700;text-align:center;line-height:1.5}.note b{color:var(--a)}
</style>
<div class="wrap">
 <h1>Onda · OCR <small>a Onda “olha” para o ecrã e extrai o texto + posições</small></h1>
 <textarea id="q" spellcheck="false" autocapitalize="off">clica no botao azul
email: nelson@inetum.com
preco: 42,50 euros</textarea>
 <div class="bar"><button class="go" id="go">👁 Ler o ecrã</button></div>
 <div class="screen"><canvas id="cv"></canvas></div>
 <div class="stat" id="stat">a carregar…</div>
 <div class="out" id="out"></div>
 <div class="note">O “ecrã” acima é desenhado, depois a <b>Onda lê-o</b>: fatia em células e uma rede glifo→letra (treinada em Roboto Mono) reconhece cada caractere + a sua <b class="k">posição</b> (caixas verdes). Tudo em <b>WASM compilado pela própria Onda</b>. É o passo “ler o ecrã” — estreito e <b>muito rápido</b>.</div>
</div>
<script>${ONDAC}</script>
<script>
(function(){
 var SRC=${JSON.stringify(src)}, CH=${CH}, FS=${FS};
 var WASM=Uint8Array.from(atob("${WASM_B64}"),function(c){return c.charCodeAt(0);});
 var q=document.getElementById('q'),cv=document.getElementById('cv'),ctx=cv.getContext('2d'),out=document.getElementById('out'),stat=document.getElementById('stat'),go=document.getElementById('go');
 var bytes=null, AW=null, enc=new TextEncoder();
 function ready(){ var m=document.createElement('canvas').getContext('2d'); m.font='500 '+FS+'px "Roboto Mono"'; AW=m.measureText('m').width;
   stat.textContent='motor pronto · avanço '+AW.toFixed(2)+'px'; draw(); }
 Promise.all([document.fonts.load('500 '+FS+'px "Roboto Mono"'),OndaC.load(WASM)]).then(function(){return OndaC.compile(SRC,null,'w');})
  .then(function(c){bytes=c.bytes; document.fonts.ready.then(ready);});
 function lines(){return q.value.split('\\n');}
 function draw(boxes){ var ls=lines(), W=0; ls.forEach(function(l){W=Math.max(W,Math.ceil(l.length*AW)+4);}); W=Math.max(W,40);
   cv.width=W; cv.height=ls.length*CH+4; ctx.fillStyle='#070b16'; ctx.fillRect(0,0,cv.width,cv.height);
   ctx.fillStyle='#dfe8ff'; ctx.font='500 '+FS+'px "Roboto Mono"'; ctx.textBaseline='top';
   ls.forEach(function(l,r){ctx.fillText(l,2,r*CH+2);});
   if(boxes){ctx.strokeStyle='rgba(120,240,170,.9)';ctx.lineWidth=1;boxes.forEach(function(bx){ctx.strokeRect(bx[0],bx[1],bx[2],bx[3]);});}
 }
 function ocrLine(text,row){ var W=Math.ceil(text.length*AW)+4; var c=document.createElement('canvas');c.width=W;c.height=CH;var g=c.getContext('2d');
   g.fillStyle='#000';g.fillRect(0,0,W,CH);g.fillStyle='#fff';g.font='500 '+FS+'px "Roboto Mono"';g.textBaseline='top';g.fillText(text,0,1);
   var d=g.getImageData(0,0,W,CH).data, buf=new Uint8Array(W*CH); for(var i=0;i<W*CH;i++)buf[i]=d[i*4];
   var hdr=enc.encode(W+'\\n'), inp=new Uint8Array(hdr.length+buf.length); inp.set(hdr,0); inp.set(buf,hdr.length);
   return OndaC.run(bytes,inp).then(function(r){ return {text:r.text.replace(/\\n+$/,''), ms:r.ms, W:W, row:row}; });
 }
 function run(){ if(!bytes)return; stat.textContent='a ler…'; var ls=lines();
   var jobs=ls.map(function(l,r){return ocrLine(l.length?l:' ',r);});
   Promise.all(jobs).then(function(res){ var ms=0,boxes=[],txt='';
     res.forEach(function(R){ ms+=R.ms; txt+=(txt?'\\n':'')+R.text;
       for(var ci=0;ci<R.text.length;ci++){ if(R.text[ci]===' ')continue; var x0=Math.round(ci*AW+2); boxes.push([x0,R.row*CH+2,Math.round(AW),CH-2]); } });
     draw(boxes); out.textContent=txt; stat.textContent='lido em '+ms.toFixed(1)+' ms · '+txt.replace(/\\n/g,'').length+' caracteres · inserção ⟶ fim de cada linha';
   }); }
 go.onclick=run; q.addEventListener('input',function(){if(AW)draw();});
})();
</script>`;
fs.writeFileSync(ROOT+'/web/onda-ocr.html', html);
console.error('escrito ex/ocr.onda + web/onda-ocr.html ('+(html.length/1024|0)+' KB)');
