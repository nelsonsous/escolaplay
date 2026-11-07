// GPU INFERENCIA multi-classe: treina 2->16->3 (sigmoide+softmax) num espiral de 3 bracos (JS),
// cozinha os pesos como literais num `px` da Onda, e a PROPRIA Onda compila esse px para GLSL (-g px).
// A inferencia (argmax por pixel) corre na GPU. Verifica em C que o forward cozido bate o treino.
const fs=require('fs'), cp=require('child_process'), path=require('path');
const ROOT='/home/user/escolaplay/onda';
const H=16, SC=1.25, EP=8000, LR=4.0, NPER=90;
function rnd(j){var h=Math.sin(j*12.9898)*43758.5453;return (h-Math.floor(h))-0.5;}
const D=[]; for(let c=0;c<3;c++)for(let i=0;i<NPER;i++){const t=i/(NPER-1),r=0.15+0.95*t;
  const ang=t*2.6*Math.PI+c*2.0943951+0.18*rnd(c*999+i+1); D.push([r*Math.cos(ang),r*Math.sin(ang),c]);}
let Wx=[],Wy=[],B=[],V=[[],[],[]],C=[0,0,0];
for(let i=0;i<H;i++){Wx[i]=rnd(i+1)*2.2;Wy[i]=rnd(i+101)*2.2;B[i]=rnd(i+201)*0.5;for(let c=0;c<3;c++)V[c][i]=rnd(c*53+i+301)*1.2;}
const sig=z=>1/(1+Math.exp(-z));
function fwd(x,y){const h=[];for(let i=0;i<H;i++)h[i]=sig(Wx[i]*x+Wy[i]*y+B[i]);
  const z=[0,1,2].map(c=>{let s=C[c];for(let i=0;i<H;i++)s+=V[c][i]*h[i];return s;});
  const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),S=e[0]+e[1]+e[2];return {z,p:e.map(v=>v/S)};}
for(let ep=0;ep<EP;ep++){let gWx=Array(H).fill(0),gWy=Array(H).fill(0),gB=Array(H).fill(0),gV=[Array(H).fill(0),Array(H).fill(0),Array(H).fill(0)],gC=[0,0,0];
  for(const [x,y,c] of D){const h=[];for(let i=0;i<H;i++)h[i]=sig(Wx[i]*x+Wy[i]*y+B[i]);
    const z=[0,1,2].map(cc=>{let s=C[cc];for(let i=0;i<H;i++)s+=V[cc][i]*h[i];return s;});
    const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),S=e[0]+e[1]+e[2],p=e.map(v=>v/S);
    const dz=p.slice();dz[c]-=1;
    for(let cc=0;cc<3;cc++){gC[cc]+=dz[cc];for(let i=0;i<H;i++)gV[cc][i]+=dz[cc]*h[i];}
    for(let i=0;i<H;i++){let dh=0;for(let cc=0;cc<3;cc++)dh+=dz[cc]*V[cc][i];const dp=dh*h[i]*(1-h[i]);gWx[i]+=dp*x;gWy[i]+=dp*y;gB[i]+=dp;}}
  const n=D.length,lr=LR/n;for(let i=0;i<H;i++){Wx[i]-=lr*gWx[i];Wy[i]-=lr*gWy[i];B[i]-=lr*gB[i];for(let c=0;c<3;c++)V[c][i]-=lr*gV[c][i];}for(let c=0;c<3;c++)C[c]-=lr*gC[c];}
let nc=0;for(const [x,y,c] of D){const {p}=fwd(x,y);if(p.indexOf(Math.max(...p))===c)nc++;}
const ACC=(nc/D.length*100).toFixed(1); console.error('treino JS: precisao='+ACC+'%');

const fl=x=>{let s=x.toFixed(7).replace(/0+$/,'').replace(/\.$/,'.0');return s;};
// --- forward cozido em Onda (locais: cada oculto calculado uma vez) ---
const mapLines=()=>[  // pixel [0,w) -> coord de rede [-SC,SC]
  '  = xn * '+fl(SC)+' - * 2.0 / x - w 1.0 1.0',
  '  = yn * '+fl(SC)+' - * 2.0 / y - h 1.0 1.0'];
function coreLines(){let L=[];   // ocultos (sobre xn,yn) + 3 logitos — igual no shader e na verificacao
  for(let i=0;i<H;i++) L.push('  = h'+i+' / 1.0 + 1.0 Ex * -1.0 + + * '+fl(Wx[i])+' xn * '+fl(Wy[i])+' yn '+fl(B[i]));
  for(let c=0;c<3;c++){let s=fl(C[c]);for(let i=0;i<H;i++)s='+ * '+fl(V[c][i])+' h'+i+' '+s;L.push('  = z'+c+' '+s);}
  return L;}
const forwardLines=()=>mapLines().concat(coreLines());
const hdr=[': c8 f>i v I * 255.0 Mx 0.0 Mn 1.0 v',': rgb fff>i r g b + + * c8 r 65536 * c8 g 256 c8 b'];
// shader px: forward + argmax + confianca -> cor
let px=[': px fffff>i x y t w h {'];
px=px.concat(forwardLines());
px.push('  = cls I ? > z0 z1 ? > z0 z2 0.0 2.0 ? > z1 z2 1.0 2.0');
px.push('  = mx Mx z0 Mx z1 z2');
px.push('  = sp + Ex - z0 mx + Ex - z1 mx Ex - z2 mx');
px.push('  = conf / 1.0 sp');
px.push('  = cr ? == cls 0 0.30 ? == cls 1 1.0 0.62');
px.push('  = cg ? == cls 0 0.82 ? == cls 1 0.42 0.92');
px.push('  = cb ? == cls 0 1.0 ? == cls 1 0.74 0.36');
px.push('  = br * + 0.42 * 0.58 conf + 0.9 * 0.1 Sn + t * 0.0 xn');   // brilho pela confianca + leve pulso
px.push('  = gl * 0.75 Mx 0.0 - 1.0 * conf 2.3');                    // linha branca na fronteira (conf baixa)
px.push('  = vr + * cr br gl  = vg + * cg br gl  = vb + * cb br gl');
px.push('  rgb vr vg vb }');
const shader=hdr.concat(px).concat([': main >i D 300 300 px 0.0 300.0 300.0']).join('\n')+'\n';
fs.writeFileSync(ROOT+'/web/gpu-multi.onda', shader);

// --- verificacao em C: funcao que devolve a classe, main corre os 240 pontos ---
let vf=[': clsf ff>i xn yn {'];
vf=vf.concat(coreLines());
vf.push('  I ? > z0 z1 ? > z0 z2 0.0 2.0 ? > z1 z2 1.0 2.0 }');
let vm=[': main >i { = n '+D.length+' = dx A n = dy A n = dl A n'];
D.forEach(([x,y,c],k)=>vm.push('  !f + dx '+k+' '+fl(x)+' !f + dy '+k+' '+fl(y)+' !f + dl '+k+' '+fl(c)));
vm.push('  = nc 0 = k 0 W < k n { = p clsf @f + dx k @f + dy k');
vm.push('    = nc + nc ? == p I @f + dl k 1 0 = k + k 1 }');
vm.push('  "verif C precisao " G / F nc F n "\\n" 0 }');
fs.writeFileSync('/tmp/claude-0/gpu-verify.onda', hdr.concat(vf).concat(vm).join('\n')+'\n');

// --- compilar shader -> GLSL com a propria Onda ---
const glsl=cp.execSync(ROOT+'/build/ondac -g px < '+ROOT+'/web/gpu-multi.onda',{encoding:'utf8'});
if(/#error/.test(glsl)){console.error('GLSL ERRO:\n'+glsl.split('\n').filter(l=>/#error/.test(l)).join('\n'));process.exit(1);}
console.error('GLSL ok: '+glsl.split('\n').length+' linhas, f_px presente='+/int f_px/.test(glsl));
fs.writeFileSync(ROOT+'/web/gpu-multi.glsl', glsl);

// --- artefacto WebGL2: a GPU classifica cada pixel com o shader compilado pela Onda ---
const pts=JSON.stringify(D.map(([x,y,c])=>[+x.toFixed(4),+y.toFixed(4),c]));
const html=`<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>Onda · GPU Multi</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap">
<style>
 :root{--ink:#eef2fb;--mut:#9fb0d8;--card:#141a2e;--line:#283255;--a:#5fe0ff;--b:#ff6ab8;--c:#b6e84f;
   --f:"Baloo 2","Arial Rounded MT Bold",system-ui,sans-serif;color-scheme:dark}
 *{box-sizing:border-box}html,body{margin:0;min-height:100%}
 body{background:radial-gradient(900px 600px at 50% -10%,#1a2350,transparent 60%),linear-gradient(180deg,#0a0e1c,#0d1228);
   color:var(--ink);font:15px/1.45 var(--f);-webkit-tap-highlight-color:transparent;min-height:100vh}
 .wrap{max-width:440px;margin:0 auto;display:flex;flex-direction:column;gap:13px;
   padding:max(16px,env(safe-area-inset-top,0px)) 16px max(18px,env(safe-area-inset-bottom,0px))}
 h1{margin:0;text-align:center;font-size:23px;font-weight:800}
 h1 small{display:block;font-size:12.5px;font-weight:700;color:var(--mut)}
 .art{position:relative;aspect-ratio:1;border-radius:20px;overflow:hidden;border:1px solid var(--line);
   box-shadow:0 24px 60px -30px rgba(120,130,255,.5);background:#05070f}
 .art canvas{position:absolute;inset:0;width:100%;height:100%}
 .leg{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
 .leg span{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--mut)}
 .leg i{width:12px;height:12px;border-radius:4px;display:inline-block}
 .stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
 .st{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 4px;text-align:center}
 .st b{display:block;font-size:18px;font-weight:800}.st s{font-size:10px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.03em;font-style:normal}
 .flow{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 15px;color:var(--mut);font-weight:700;font-size:12.5px;line-height:1.5}
 .flow b{color:var(--ink)}.flow .k{color:var(--a)}
</style>
<div class="wrap">
 <h1>Onda · GPU Multi <small>3 classes classificadas na GPU, pixel a pixel</small></h1>
 <div class="art"><canvas id="gl" width="300" height="300"></canvas><canvas id="ov" width="300" height="300"></canvas></div>
 <div class="leg"><span><i style="background:#4fd2ff"></i>classe 0</span><span><i style="background:#ff6ab8"></i>classe 1</span><span><i style="background:#9ed85c"></i>classe 2</span></div>
 <div class="stats">
   <div class="st"><b>${ACC}%</b><s>precisão</s></div>
   <div class="st"><b id="fps">—</b><s>GPU fps</s></div>
   <div class="st"><b>90k</b><s>pixels/frame</s></div>
 </div>
 <div class="flow"><b>Rede 2→16→3</b> (softmax). A fronteira entre as 3 classes é calculada <b>inteiramente na GPU</b>: o <b class="k">argmax por pixel</b> vem de um shader GLSL que a <b>própria Onda compilou</b> (<b class="k">-g px</b>, ${glsl.split('\n').length} linhas) a partir dos pesos treinados. Os pontos são os dados do espiral.</div>
</div>
<script id="frag" type="x-shader/x-fragment">${glsl}</script>
<script>
(function(){
 var DATA=${pts}, SC=${fl(SC)};
 var gl=document.getElementById('gl').getContext('webgl2'), W=300,H=300;
 function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);
   if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(o);return o;}
 var vs=sh(gl.VERTEX_SHADER,'#version 300 es\\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0,1);}');
 var fs2=sh(gl.FRAGMENT_SHADER,document.getElementById('frag').textContent);
 var pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs2);gl.linkProgram(pr);
 if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw gl.getProgramInfoLog(pr);
 gl.useProgram(pr);var uLoc=gl.getUniformLocation(pr,'u');gl.viewport(0,0,W,H);
 // pontos (canvas 2D por cima; mapeamento igual ao do shader, incl. flip vertical)
 var ov=document.getElementById('ov').getContext('2d');
 var COL=['#2aa7e0','#e0498f','#6fb82e'];
 function pts(){ov.clearRect(0,0,W,H);for(var i=0;i<DATA.length;i++){var d=DATA[i];
   var px=(d[0]/SC*0.5+0.5)*W, py=(d[1]/SC*0.5+0.5)*H;
   ov.beginPath();ov.arc(px,py,2.6,0,6.283);ov.fillStyle=COL[d[2]];ov.fill();
   ov.lineWidth=1.1;ov.strokeStyle='rgba(255,255,255,.85)';ov.stroke();}}
 pts();
 var t0=performance.now(),fr=0,facc=0,fel=document.getElementById('fps');
 function loop(now){var t=(now-t0)/1000;
   gl.uniform1fv(uLoc,[t,W,H,0,0,0,0,0]);gl.drawArrays(gl.TRIANGLES,0,3);
   fr++;facc+=1;if(now-t0>0&&fr%20===0)fel.textContent=Math.round(fr/((now-t0)/1000));
   requestAnimationFrame(loop);}
 requestAnimationFrame(loop);
})();
</script>`;
fs.writeFileSync(ROOT+'/web/gpu-multi.html', html);
console.log(JSON.stringify({ACC, glslLines:glsl.split('\n').length, html:html.length}));
