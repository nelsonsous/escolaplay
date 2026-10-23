// Modelo de linguagem char-level feito na Onda: treinado (JS) em proverbios, GERA texto letra a letra.
// Treino em JS; o MODELO (inferencia/geracao) corre em Onda. Pesos inicializados em funcoes pequenas
// (o alvo WASM limita locais por funcao). Gera ex/lm.onda + web/onda-lm.html.
const fs=require('fs'), ROOT='/home/user/escolaplay/onda';
const CORPUS=`agua mole em pedra dura tanto bate ate que fura
quem nao arrisca nao petisca
mais vale um passaro na mao que dois a voar
o gato escaldado de agua fria tem medo
cada macaco no seu galho
quem tudo quer tudo perde
devagar se vai ao longe
a pressa e inimiga da perfeicao
quem semeia ventos colhe tempestades
nao ha bela sem senao
o habito faz o monge
antes tarde do que nunca
quem conta um conto acrescenta um ponto
grao a grao enche a galinha o papo
em terra de cegos quem tem olho e rei
cao que ladra nao morde
o prometido e devido
quem espera sempre alcanca
a uniao faz a forca
quem nao tem cao caca com gato
de pequenino se torce o pepino
nem tudo o que luz e ouro
quem muito dorme pouco aprende
casa de ferreiro espeto de pau
o seguro morreu de velho
quem semeia colhe
as paredes tem ouvidos
quem ri por ultimo ri melhor
`.repeat(6);
const chars=[...new Set(CORPUS)].sort(), V=chars.length, idx={}; chars.forEach((c,i)=>idx[c]=i);
const K=6, HID=96, IN=K*V;
function rnd(j){var h=Math.sin(j*12.9898)*43758.5453;return (h-Math.floor(h))-0.5;}
let W1=Array.from({length:HID},(_,h)=>Array.from({length:IN},(_,i)=>rnd(h*131+i+1)*0.1)), b1=Array(HID).fill(0);
let W2=Array.from({length:V},(_,c)=>Array.from({length:HID},(_,h)=>rnd(c*71+h+1)*0.1)), b2=Array(V).fill(0);
const th=Math.tanh;
function ctx(s,p){const x=new Float64Array(IN);for(let k=0;k<K;k++){const c=p-K+k;const ch=c>=0?s[c]:' ';x[k*V+(idx[ch]??idx[' '])]=1;}return x;}
function fwd(x){const h=new Float64Array(HID);for(let hh=0;hh<HID;hh++){let s=b1[hh];for(let i=0;i<IN;i++)s+=W1[hh][i]*x[i];h[hh]=th(s);}
  const z=new Float64Array(V);for(let c=0;c<V;c++){let s=b2[c];for(let hh=0;hh<HID;hh++)s+=W2[c][hh]*h[hh];z[c]=s;}return{h,z};}
const S=CORPUS,samples=[];for(let p=1;p<S.length;p++)samples.push([ctx(S,p),idx[S[p]]]);
for(let ep=0;ep<35;ep++){for(const [x,y] of samples){const {h,z}=fwd(x);let m=-1e9;for(const v of z)if(v>m)m=v;let sm=0;const pp=new Float64Array(V);for(let c=0;c<V;c++){pp[c]=Math.exp(z[c]-m);sm+=pp[c];}for(let c=0;c<V;c++)pp[c]/=sm;
  const dz=pp;dz[y]-=1;const LR=0.08;
  for(let c=0;c<V;c++){b2[c]-=LR*dz[c];const w=W2[c];for(let hh=0;hh<HID;hh++)w[hh]-=LR*dz[c]*h[hh];}
  const dh=new Float64Array(HID);for(let hh=0;hh<HID;hh++){let g=0;for(let c=0;c<V;c++)g+=dz[c]*W2[c][hh];dh[hh]=g*(1-h[hh]*h[hh]);}
  for(let hh=0;hh<HID;hh++){b1[hh]-=LR*dh[hh];const w=W1[hh];for(let i=0;i<IN;i++)if(x[i])w[i]-=LR*dh[hh];}}}
const fl=x=>{let s=(+x).toFixed(5).replace(/0+$/,'').replace(/\.$/,'.0');return s;};
// pesos nao-zero -> funcoes de inicializacao em pedacos (o WASM limita locais/funcao)
function chunks(name, arr){ const CH=240, fns=[], calls=[];
  for(let s=0;s<arr.length;s+=CH){ const fn=name+'_'+(s/CH|0);
    fns.push(': '+fn+' i>i a { '+arr.slice(s,s+CH).map(e=>'!f + a '+e.i+' '+fl(e.v)).join(' ')+' 0 }');
    calls.push(fn+' '+name); } return {fns,calls}; }
const w1a=[]; W1.forEach((w,h)=>w.forEach((v,i)=>{ if(v!==0) w1a.push({i:h*IN+i,v}); }));
const w2a=[]; W2.forEach((w,c)=>w.forEach((v,h)=>{ if(v!==0) w2a.push({i:c*HID+h,v}); }));
const c1=chunks('w1',w1a), c2=chunks('w2',w2a);
let L=[];
L.push('# lm: modelo de linguagem char-level em Onda. Treinado (JS) em proverbios; GERA texto letra a letra.');
L.push(': tanhf f>f z - * 2.0 / 1.0 + 1.0 Ex * -1.0 * 2.0 z 1.0');
L.push(': cidx ii>i cs ch { = r 0 = i 0 W < i '+V+' { ? == @ + cs i ch = r i 0 = i + i 1 } r }');
c1.fns.forEach(f=>L.push(f)); c2.fns.forEach(f=>L.push(f));
L.push(': main >i {');
const bytes=chars.map(c=>c.charCodeAt(0));
L.push('  = cs A '+V); bytes.forEach((b,i)=>L.push('  ! + cs '+i+' '+b));
L.push('  = w1 A '+(HID*IN)); c1.calls.forEach(c=>L.push('  '+c));
L.push('  = b1 A '+HID); b1.forEach((v,i)=>{ if(v!==0) L.push('  !f + b1 '+i+' '+fl(v)); });
L.push('  = w2 A '+(V*HID)); c2.calls.forEach(c=>L.push('  '+c));
L.push('  = b2 A '+V); b2.forEach((v,i)=>{ if(v!==0) L.push('  !f + b2 '+i+' '+fl(v)); });
L.push('  = raw A 1024 = rl 0 = ch R W && >= ch 0 < rl 1023 { = lc ? && >= ch 65 <= ch 90 + ch 32 ch ! + raw rl lc = rl + rl 1 = ch R }');
L.push('  = p 0 W && < p rl ~ && >= @ + raw p 48 <= @ + raw p 57 = p + p 1');
L.push('  = rng 0 W && < p rl && >= @ + raw p 48 <= @ + raw p 57 { = rng + * rng 10 - @ + raw p 48 = p + p 1 }');
L.push('  ? == rng 0 = rng 12345 0  W && < p rl == @ + raw p 32 = p + p 1');
L.push('  = gen A 1024 = gl 0 W < p rl { ! + gen gl @ + raw p = gl + gl 1 = p + p 1 }');
L.push('  ? == gl 0 { ! + gen 0 32 = gl 1 } 0');
L.push('  = i 0 W < i gl { P @ + gen i = i + i 1 }');
L.push('  = st A 1 ! st rng  = ng 200 = t 0');
L.push('  W < t ng {');
L.push('    = x A '+IN+' = i 0 W < i '+IN+' { !f + x i 0.0 = i + i 1 }');
L.push('    = k 0 W < k '+K+' { = pos - + gl k '+K+' = cc ? >= pos 0 @ + gen pos 32 = ci cidx cs cc !f + x + * k '+V+' ci 1.0 = k + k 1 }');
L.push('    = hd A '+HID+' = hh 0 W < hh '+HID+' { = s @f + b1 hh = i 0 W < i '+IN+' { = s + s * @f + w1 + * hh '+IN+' i @f + x i = i + i 1 } !f + hd hh tanhf s = hh + hh 1 }');
L.push('    = mx -1000000.0 = c 0 = zz A '+V);
L.push('    W < c '+V+' { = z @f + b2 c = hh 0 W < hh '+HID+' { = z + z * @f + w2 + * c '+HID+' hh @f + hd hh = hh + hh 1 } !f + zz c z ? > z mx { = mx z 0 } 0 = c + c 1 }');
L.push('    = tmp 0.55 = sum 0.0 = c 0 = pb A '+V);
L.push('    W < c '+V+' { = e Ex / - @f + zz c mx tmp !f + pb c e = sum + sum e = c + c 1 }');
L.push('    = s2 % + * @ st 1103515245 12345 2147483647 ! st s2  = r * / F s2 2147483647.0 sum');
L.push('    = acc 0.0 = pick - '+V+' 1 = c 0 = done 0');
L.push('    W && < c '+V+' == done 0 { = acc + acc @f + pb c ? > acc r { = pick c = done 1 } 0 = c + c 1 }');
L.push('    = out @ + cs pick P out ! + gen gl out = gl + gl 1');
L.push('    ? >= gl 1020 = t ng 0');
L.push('    = t + t 1 }');
L.push('  "\\n" 0 }');
const src=L.join('\n')+'\n';
fs.writeFileSync(ROOT+'/ex/lm.onda', src); fs.writeFileSync('/tmp/claude-0/lm.onda', src);
console.error('V='+V+' IN='+IN+' HID='+HID+' pesos w1='+w1a.length+' w2='+w2a.length+' funcoes init='+(c1.fns.length+c2.fns.length));

// ----- artefacto interativo -----
const WASM_B64=fs.readFileSync(ROOT+'/build/w2.wasm').toString('base64');
const ONDAC=fs.readFileSync(ROOT+'/web/ondac.js','utf8');
const SEEDS=['quem ','a uniao ','o gato ','mais vale ','agua ','nao ha '];
const html=`<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>Onda · LM</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=JetBrains+Mono:wght@500&display=swap">
<style>
 :root{--ink:#eef2fb;--mut:#9fb0d8;--card:#141a2e;--line:#283255;--a:#7ee0ff;--b:#b98cff;--ok:#cfe6ff;
   --f:"Baloo 2","Arial Rounded MT Bold",system-ui,sans-serif;--m:"JetBrains Mono",ui-monospace,monospace;color-scheme:dark}
 *{box-sizing:border-box}html,body{margin:0;min-height:100%}
 body{background:radial-gradient(900px 600px at 50% -10%,#1a2350,transparent 60%),linear-gradient(180deg,#0a0e1c,#0d1228);
   color:var(--ink);font:15px/1.45 var(--f);-webkit-tap-highlight-color:transparent;min-height:100vh}
 .wrap{max-width:460px;margin:0 auto;display:flex;flex-direction:column;gap:13px;padding:max(16px,env(safe-area-inset-top,0px)) 16px max(18px,env(safe-area-inset-bottom,0px))}
 h1{margin:0;text-align:center;font-size:23px;font-weight:800}
 h1 small{display:block;font-size:12.5px;font-weight:700;color:var(--mut)}
 .chips{display:flex;gap:7px;flex-wrap:wrap;justify-content:center}
 .chips button{border:1px solid var(--line);background:var(--card);color:var(--mut);font:700 12.5px var(--m);padding:6px 12px;border-radius:999px;cursor:pointer}
 .bar{display:flex;gap:9px}
 input{flex:1;background:#0b0f1f;color:#dfe8ff;border:1px solid var(--line);border-radius:14px;padding:13px 14px;font:600 15px var(--m)}
 .go{border:0;border-radius:14px;color:#071018;font:800 15px var(--f);padding:0 18px;cursor:pointer;background:linear-gradient(120deg,var(--a),var(--b))}
 .go:active{transform:translateY(2px)}
 .card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;min-height:210px;
   font:600 15px/1.7 var(--m);color:var(--ok);white-space:pre-wrap;overflow-wrap:anywhere}
 .note{color:var(--mut);font-size:12px;font-weight:700;text-align:center;line-height:1.5}
 .note b{color:var(--a)}
</style>
<div class="wrap">
 <h1>Onda · LM <small>modelo de linguagem char-level — escrito e corrido pela Onda</small></h1>
 <div class="chips" id="chips"></div>
 <div class="bar"><input id="q" value="quem " autocapitalize="off" autocorrect="off" spellcheck="false"><button class="go" id="go">✨ Gerar</button></div>
 <div class="card" id="out">a carregar o modelo…</div>
 <div class="note"><b>Honesto:</b> não é um LLM gigante — é uma rede char-level (~15 mil pesos) treinada em provérbios que prevê a <b>próxima letra</b> e gera texto. O modelo corre em <b>WASM compilado pela própria Onda</b>, no telemóvel. Cada geração amostra um caminho diferente.</div>
</div>
<script>${ONDAC}</script>
<script>
(function(){
 var SRC=${JSON.stringify(src)}, SEEDS=${JSON.stringify(SEEDS)};
 var WASM=Uint8Array.from(atob("${WASM_B64}"),function(c){return c.charCodeAt(0);});
 var q=document.getElementById('q'),out=document.getElementById('out'),go=document.getElementById('go'),chips=document.getElementById('chips');
 var bytes=null, timer=null;
 SEEDS.forEach(function(s){var b=document.createElement('button');b.textContent=s.trim();b.onclick=function(){q.value=s;gen();};chips.appendChild(b);});
 OndaC.load(WASM).then(function(){return OndaC.compile(SRC,null,'w');}).then(function(c){bytes=c.bytes;out.textContent='Pronto. Escreve um início e toca ✨ Gerar.';});
 function gen(){ if(!bytes)return; clearInterval(timer); var seed=q.value||' '; var rng=1+Math.floor(Math.random()*1e9);
   out.textContent='…';
   OndaC.run(bytes, rng+' '+seed).then(function(r){ var txt=r.text.replace(/\\n+$/,''); var i=0; out.textContent='';
     timer=setInterval(function(){ if(i>=txt.length){clearInterval(timer);return;} out.textContent=txt.slice(0,++i); out.scrollTop=out.scrollHeight; }, 18);
   }).catch(function(e){out.textContent='erro: '+e;});
 }
 go.onclick=gen; q.addEventListener('keydown',function(e){if(e.key==='Enter')gen();});
})();
</script>`;
fs.writeFileSync(ROOT+'/web/onda-lm.html', html);
console.error('escrito ex/lm.onda + web/onda-lm.html ('+(html.length/1024|0)+' KB)');
