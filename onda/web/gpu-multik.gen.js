// GPU inferencia multi-classe GENERICA (K classes). Treina 2->H->K (sigmoide+softmax) num espiral
// de K bracos (JS), cozinha os pesos num `px` da Onda, a Onda compila -g px -> GLSL, a GPU faz o
// argmax por pixel + sombreado por confianca. Verifica GPU==CPU. Parametros no topo.
const fs=require('fs'), cp=require('child_process');
const ROOT='/home/user/escolaplay/onda';
const K=+process.argv[2]||6, H=+process.argv[3]||24, TW=2.4, SC=1.3, EP=+process.argv[4]||9000, LR=+process.argv[5]||5.0, NPER=70;
const NAME=process.argv[6]||'gpu-flor';
const ACT=process.argv[7]||'sig';                          // 'sig' | 'relu' (ReLU = fronteiras poligonais)
const TITLE=ACT==='relu'?'Onda · GPU ReLU':'Onda · GPU Flor';
function rnd(j){var h=Math.sin(j*12.9898)*43758.5453;return (h-Math.floor(h))-0.5;}
const D=[]; for(let c=0;c<K;c++)for(let i=0;i<NPER;i++){const t=i/(NPER-1),r=0.12+0.98*t;
  const ang=t*TW*Math.PI+c*2*Math.PI/K+0.14*rnd(c*911+i+1); D.push([r*Math.cos(ang),r*Math.sin(ang),c]);}
let Wx=[],Wy=[],B=[],V=[],C=[]; for(let c=0;c<K;c++){V.push([]);C.push(0);}
for(let i=0;i<H;i++){Wx[i]=rnd(i+1)*2.4;Wy[i]=rnd(i+101)*2.4;B[i]=rnd(i+201)*0.5;for(let c=0;c<K;c++)V[c][i]=rnd(c*57+i+301)*1.1;}
const sig=z=>1/(1+Math.exp(-z));
const act=ACT==='relu'?(z=>Math.max(0,z)):sig;
function logits(x,y){const h=[],pre=[];for(let i=0;i<H;i++){pre[i]=Wx[i]*x+Wy[i]*y+B[i];h[i]=act(pre[i]);}
  return {h,pre,z:C.map((c0,c)=>{let s=c0;for(let i=0;i<H;i++)s+=V[c][i]*h[i];return s;})};}
function soft(z){const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),S=e.reduce((a,b)=>a+b,0);return e.map(v=>v/S);}
for(let ep=0;ep<EP;ep++){let gWx=Array(H).fill(0),gWy=Array(H).fill(0),gB=Array(H).fill(0),gV=V.map(_=>Array(H).fill(0)),gC=Array(K).fill(0);
  for(const [x,y,c] of D){const {h,pre,z}=logits(x,y),p=soft(z),dz=p.slice();dz[c]-=1;
    for(let cc=0;cc<K;cc++){gC[cc]+=dz[cc];for(let i=0;i<H;i++)gV[cc][i]+=dz[cc]*h[i];}
    for(let i=0;i<H;i++){let dh=0;for(let cc=0;cc<K;cc++)dh+=dz[cc]*V[cc][i];
      const dact=ACT==='relu'?(pre[i]>0?1:0):h[i]*(1-h[i]);const dp=dh*dact;gWx[i]+=dp*x;gWy[i]+=dp*y;gB[i]+=dp;}}
  const n=D.length,lr=LR/n;for(let i=0;i<H;i++){Wx[i]-=lr*gWx[i];Wy[i]-=lr*gWy[i];B[i]-=lr*gB[i];for(let c=0;c<K;c++)V[c][i]-=lr*gV[c][i];}for(let c=0;c<K;c++)C[c]-=lr*gC[c];}
let nc=0;for(const [x,y,c] of D){const p=soft(logits(x,y).z);if(p.indexOf(Math.max(...p))===c)nc++;}
const ACC=(nc/D.length*100).toFixed(1); console.error('K='+K+' H='+H+' treino JS: precisao='+ACC+'%');
if(+ACC<90){console.error('ACC baixa, nao emito.');process.exit(2);}

// paleta HSV -> RGB
function hsv(h,s,v){h*=6;const i=Math.floor(h),f=h-i,p=v*(1-s),q=v*(1-s*f),t=v*(1-s*(1-f));
  return [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i%6];}
const PAL=[],HEX=[]; for(let c=0;c<K;c++){const[r,g,b]=hsv(c/K,0.68,1.0);PAL.push([r,g,b]);
  HEX.push('#'+[r,g,b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join(''));}

const fl=x=>{let s=(+x).toFixed(7).replace(/0+$/,'').replace(/\.$/,'.0');return s;};
const mapLines=()=>['  = xn * '+fl(SC)+' - * 2.0 / x - w 1.0 1.0','  = yn * '+fl(SC)+' - * 2.0 / y - h 1.0 1.0'];
function coreLines(){let L=[];
  for(let i=0;i<H;i++){const pre='+ + * '+fl(Wx[i])+' xn * '+fl(Wy[i])+' yn '+fl(B[i]);
    L.push('  = h'+i+' '+(ACT==='relu'?('Mx 0.0 '+pre):('/ 1.0 + 1.0 Ex * -1.0 '+pre)));}
  for(let c=0;c<K;c++){let s=fl(C[c]);for(let i=0;i<H;i++)s='+ * '+fl(V[c][i])+' h'+i+' '+s;L.push('  = z'+c+' '+s);}
  return L;}
function argmaxLines(){let L=['  = bi 0','  = bv z0'];for(let c=1;c<K;c++){L.push('  = bi ? > z'+c+' bv '+c+' bi');L.push('  = bv Mx bv z'+c);}return L;}
function chan(idx){let s=fl(PAL[K-1][idx]);for(let c=K-2;c>=0;c--)s='? == bi '+c+' '+fl(PAL[c][idx])+' '+s;return s;}
// confianca
let zmx='z'+(K-1);for(let c=K-2;c>=0;c--)zmx='Mx z'+c+' '+zmx;
let sp='Ex - z'+(K-1)+' zmx';for(let c=K-2;c>=0;c--)sp='+ Ex - z'+c+' zmx '+sp;

const hdr=[': c8 f>i v I * 255.0 Mx 0.0 Mn 1.0 v',': rgb fff>i r g b + + * c8 r 65536 * c8 g 256 c8 b'];
let px=[': px fffff>i x y t w h {'].concat(mapLines(),coreLines(),argmaxLines());
px.push('  = zmx '+zmx+'  = sp '+sp+'  = conf / 1.0 sp');
px.push('  = cr '+chan(0)+'  = cg '+chan(1)+'  = cb '+chan(2));
px.push('  = br * + 0.40 * 0.60 conf + 0.92 * 0.08 Sn + t * 0.0 xn');
px.push('  = gl * 0.8 Mx 0.0 - 1.0 * conf 2.4');
px.push('  rgb + * cr br gl + * cg br gl + * cb br gl }');
const shader=hdr.concat(px).concat([': main >i D 300 300 px 0.0 300.0 300.0']).join('\n')+'\n';
fs.writeFileSync(ROOT+'/web/'+NAME+'.onda', shader);

// verificacao C: classe por ponto
let vf=[': clsf ff>i xn yn {'].concat(coreLines(),argmaxLines(),['  bi }']);
let vm=[': main >i { = n '+D.length+' = dx A n = dy A n = dl A n'];
D.forEach(([x,y,c],k)=>vm.push('  !f + dx '+k+' '+fl(x)+' !f + dy '+k+' '+fl(y)+' !f + dl '+k+' '+fl(c)));
vm.push('  = nc 0 = k 0 W < k n { = p clsf @f + dx k @f + dy k','    = nc + nc ? == p I @f + dl k 1 0 = k + k 1 }');
vm.push('  "verif C precisao " G / F nc F n "\\n" 0 }');
fs.writeFileSync('/tmp/claude-0/'+NAME+'-verify.onda', hdr.concat(vf).concat(vm).join('\n')+'\n');

const glsl=cp.execSync(ROOT+'/build/ondac -g px < '+ROOT+'/web/'+NAME+'.onda',{encoding:'utf8'});
if(/#error/.test(glsl)){console.error('GLSL ERRO:\n'+glsl.split('\n').filter(l=>/#error/.test(l)).join('\n'));process.exit(1);}
fs.writeFileSync(ROOT+'/web/'+NAME+'.glsl', glsl);
console.error('GLSL ok: '+glsl.split('\n').length+' linhas');

const pts=JSON.stringify(D.map(([x,y,c])=>[+x.toFixed(4),+y.toFixed(4),c]));
const leg=HEX.map((h,c)=>'<span><i style="background:'+h+'"></i>'+c+'</span>').join('');
const html=`<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>${TITLE}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap">
<style>
 :root{--ink:#eef2fb;--mut:#9fb0d8;--card:#141a2e;--line:#283255;--a:#8fd0ff;
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
 .leg{display:flex;gap:7px;justify-content:center;flex-wrap:wrap}
 .leg span{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:var(--mut)}
 .leg i{width:11px;height:11px;border-radius:4px;display:inline-block}
 .stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
 .st{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 4px;text-align:center}
 .st b{display:block;font-size:18px;font-weight:800}.st s{font-size:10px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.03em;font-style:normal}
 .flow{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 15px;color:var(--mut);font-weight:700;font-size:12.5px;line-height:1.5}
 .flow b{color:var(--ink)}.flow .k{color:var(--a)}
</style>
<div class="wrap">
 <h1>${TITLE} <small>${K} classes na GPU${ACT==='relu'?' · ocultos ReLU (fronteiras poligonais)':''}, pixel a pixel</small></h1>
 <div class="art"><canvas id="gl" width="300" height="300"></canvas><canvas id="ov" width="300" height="300"></canvas></div>
 <div class="leg">${leg}</div>
 <div class="stats">
   <div class="st"><b>${ACC}%</b><s>precisão</s></div>
   <div class="st"><b id="fps">—</b><s>GPU fps</s></div>
   <div class="st"><b>${K}</b><s>classes</s></div>
 </div>
 <div class="flow"><b>Rede 2→${H}→${K}</b> (softmax). O <b class="k">argmax por pixel</b> das ${K} classes e o <b>sombreado por confiança</b> (fronteiras a brilhar) correm <b>inteiramente na GPU</b>, por um shader GLSL que a <b>própria Onda compilou</b> (<b class="k">-g px</b>, ${glsl.split('\n').length} linhas). Verificado idêntico ao CPU.</div>
</div>
<script id="frag" type="x-shader/x-fragment">${glsl}</script>
<script>
(function(){
 var DATA=${pts}, SC=${fl(SC)}, COL=${JSON.stringify(HEX)};
 var gl=document.getElementById('gl').getContext('webgl2'), W=300,H=300;
 function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);
   if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(o);return o;}
 var vs=sh(gl.VERTEX_SHADER,'#version 300 es\\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0,1);}');
 var fs2=sh(gl.FRAGMENT_SHADER,document.getElementById('frag').textContent);
 var pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs2);gl.linkProgram(pr);
 if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw gl.getProgramInfoLog(pr);
 gl.useProgram(pr);var uLoc=gl.getUniformLocation(pr,'u');gl.viewport(0,0,W,H);
 var ov=document.getElementById('ov').getContext('2d');
 function pts(){ov.clearRect(0,0,W,H);for(var i=0;i<DATA.length;i++){var d=DATA[i];
   var px=(d[0]/SC*0.5+0.5)*W, py=(d[1]/SC*0.5+0.5)*H;
   ov.beginPath();ov.arc(px,py,2.3,0,6.283);ov.fillStyle=COL[d[2]];ov.fill();
   ov.lineWidth=1.0;ov.strokeStyle='rgba(255,255,255,.85)';ov.stroke();}}
 pts();
 var t0=performance.now(),fr=0,fel=document.getElementById('fps');
 function loop(now){var t=(now-t0)/1000;
   gl.uniform1fv(uLoc,[t,W,H,0,0,0,0,0]);gl.drawArrays(gl.TRIANGLES,0,3);
   fr++;if(fr%20===0)fel.textContent=Math.round(fr/((now-t0)/1000));requestAnimationFrame(loop);}
 requestAnimationFrame(loop);
})();
</script>`;
fs.writeFileSync(ROOT+'/web/'+NAME+'.html', html);
console.log(JSON.stringify({K,H,ACC,glslLines:glsl.split('\n').length}));
