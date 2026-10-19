// Gera motor.onda: IA de intencao 100% em Onda (le texto -> features -> rede (J) -> intencao -> acao).
const INTENTS=['soma','subtrai','multiplica','raiz','primos','saudacao'];
const PHRASES={
 soma:['soma 3 e 5','quanto e 2 mais 7','adiciona 10 a 4','somar 8 com 9','3 mais 4','qual a soma de 6 e 2','junta 5 e 5'],
 subtrai:['subtrai 5 a 9','9 menos 4','tira 3 de 10','qual a diferenca de 8 e 3','subtrair 2 de 7','10 menos 6'],
 multiplica:['multiplica 3 por 4','6 vezes 7','produto de 2 e 9','multiplicar 5 por 5','8 vezes 3','qual o produto de 4 e 4'],
 raiz:['raiz de 16','raiz quadrada de 81','qual a raiz de 49','raiz de 100','a raiz quadrada de 9'],
 primos:['primos ate 20','lista os primos ate 30','quais os numeros primos ate 50','mostra primos ate 15','primos menores que 40'],
 saudacao:['ola','bom dia','boa tarde','oi tudo bem','ola onda','boas','ei ola']
};
const STOP=new Set(['e','a','o','de','qual','que','os','com','tudo','bem','numeros','menores']);
let vocab=new Set();
for(const k of INTENTS)for(const ph of PHRASES[k])for(const w of ph.toLowerCase().split(/[^a-z]+/).filter(Boolean))if(isNaN(w)&&!STOP.has(w))vocab.add(w);
vocab=[...vocab]; const V=vocab.length,K=INTENTS.length,H=12;
function feat(t){const s=new Set(t.toLowerCase().split(/[^a-z]+/).filter(Boolean));return vocab.map(w=>s.has(w)?1:0);}
const X=[],Y=[]; INTENTS.forEach((k,ci)=>PHRASES[k].forEach(ph=>{X.push(feat(ph));Y.push(ci);}));
function rnd(j){var h=Math.sin(j*12.9898)*43758.5453;return (h-Math.floor(h))-0.5;}
let W1=[],b1=[],W2=[],b2=[];
for(let h=0;h<H;h++){W1.push(vocab.map((_,i)=>rnd(h*97+i+1)*0.8));b1.push(0);}
for(let c=0;c<K;c++){W2.push(Array.from({length:H},(_,h)=>rnd(c*53+h+1)*0.8));b2.push(0);}
const sig=z=>1/(1+Math.exp(-z));
function fwd(x){const h=W1.map((w,hi)=>sig(w.reduce((a,wi,i)=>a+wi*x[i],b1[hi])));
  const z=W2.map((w,c)=>w.reduce((a,wi,hi)=>a+wi*h[hi],b2[c]));const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),S=e.reduce((a,b)=>a+b);return{h,p:e.map(v=>v/S)};}
for(let ep=0;ep<3000;ep++){let gW1=W1.map(w=>w.map(_=>0)),gb1=b1.map(_=>0),gW2=W2.map(w=>w.map(_=>0)),gb2=b2.map(_=>0);
  for(let n=0;n<X.length;n++){const x=X[n],{h,p}=fwd(x),dz=p.slice();dz[Y[n]]-=1;
    for(let c=0;c<K;c++){gb2[c]+=dz[c];for(let hi=0;hi<H;hi++)gW2[c][hi]+=dz[c]*h[hi];}
    for(let hi=0;hi<H;hi++){let dh=0;for(let c=0;c<K;c++)dh+=dz[c]*W2[c][hi];const dp=dh*h[hi]*(1-h[hi]);gb1[hi]+=dp;for(let i=0;i<V;i++)gW1[hi][i]+=dp*x[i];}}
  const lr=0.5/X.length;for(let hi=0;hi<H;hi++){b1[hi]-=lr*gb1[hi];for(let i=0;i<V;i++)W1[hi][i]-=lr*gW1[hi][i];}
  for(let c=0;c<K;c++){b2[c]-=lr*gb2[c];for(let hi=0;hi<H;hi++)W2[c][hi]-=lr*gW2[c][hi];}}
const fl=x=>{let s=(+x).toFixed(6).replace(/0+$/,'').replace(/\.$/,'.0');return s;};
// vocabulario em bytes
let voc=[],voff=[],vlen=[]; vocab.forEach(w=>{voff.push(voc.length);vlen.push(w.length);for(const c of w)voc.push(c.charCodeAt(0));});
let L=[];
L.push('# motor: IA de intencao feita na Onda. le texto -> features (palavras) -> rede -> intencao -> acao.');
L.push(': letter i>i c && >= c 97 <= c 122');
L.push(': digit i>i c && >= c 48 <= c 57');
L.push(': sigf f>f z / 1.0 + 1.0 Ex * -1.0 z');
L.push(': primo i>i n { ? < n 2 0 = d 2 = r 1 W && r <= * d d n { ? == 0 % n d = r 0 0 = d + d 1 } r }');
L.push(': kwmatch iiiiii>i buf blen voc voff vlen ki {');
L.push('  = off @ + voff ki = kl @ + vlen ki = p 0 = found 0');
L.push('  W && == found 0 <= + p kl blen {');
L.push('    = j 0 = ok 1 W && ok < j kl { ? != @ + buf + p j @ + voc + off j = ok 0 0 = j + j 1 }');
L.push('    ? ok { = bef ? == p 0 1 ~ letter @ + buf - p 1 = aft ? == + p kl blen 1 ~ letter @ + buf + p kl ? && bef aft = found 1 0 } 0');
L.push('    = p + p 1 } found }');
L.push(': main >i {');
// vocab arrays
L.push('  = voc A '+voc.length+(voc.length?'':' '));
voc.forEach((b,i)=>L.push('  ! + voc '+i+' '+b));
L.push('  = voff A '+V); voff.forEach((o,i)=>L.push('  ! + voff '+i+' '+o));
L.push('  = vlen A '+V); vlen.forEach((o,i)=>L.push('  ! + vlen '+i+' '+o));
// pesos
L.push('  = w1 A '+(H*V)); W1.forEach((w,hi)=>w.forEach((v,i)=>L.push('  !f + w1 '+(hi*V+i)+' '+fl(v))));
L.push('  = b1 A '+H); b1.forEach((v,i)=>L.push('  !f + b1 '+i+' '+fl(v)));
L.push('  = w2 A '+(K*H)); W2.forEach((w,c)=>w.forEach((v,hi)=>L.push('  !f + w2 '+(c*H+hi)+' '+fl(v))));
L.push('  = b2 A '+K); b2.forEach((v,i)=>L.push('  !f + b2 '+i+' '+fl(v)));
// ler input minusculo
L.push('  = buf A 512 = blen 0 = ch R');
L.push('  W && >= ch 0 < blen 511 { = lc ? && >= ch 65 <= ch 90 + ch 32 ch ! + buf blen lc = blen + blen 1 = ch R }');
// features
L.push('  = f A '+V+' = i 0 W < i '+V+' { !f + f i F kwmatch buf blen voc voff vlen i = i + i 1 }');
// hidden
L.push('  = h A '+H+' = hi 0 W < hi '+H+' { = s @f + b1 hi = i 0 W < i '+V+' { = s + s * @f + w1 + * hi '+V+' i @f + f i = i + i 1 } !f + h hi sigf s = hi + hi 1 }');
// argmax
L.push('  = bi 0 = bv -1000000.0 = c 0');
L.push('  W < c '+K+' { = z @f + b2 c = hi 0 W < hi '+H+' { = z + z * @f + w2 + * c '+H+' hi @f + h hi = hi + hi 1 } ? > z bv { = bv z = bi c } 0 = c + c 1 }');
// numeros
L.push('  = nums A 4 = nn 0 = p 0');
L.push('  W < p blen { ? digit @ + buf p { = v 0 W && < p blen digit @ + buf p { = v + * v 10 - @ + buf p 48 = p + p 1 } ? < nn 4 { !f + nums nn F v = nn + nn 1 } 0 } { = p + p 1 } }');
L.push('  = na ? > nn 0 @f + nums 0 0.0 = nb ? > nn 1 @f + nums 1 0.0');
// dispatch
L.push('  "intencao: " '+INTENTS.map((n,i)=>'? == bi '+i+' "'+n+'" ').join('')+'"?" "\\n"');
L.push('  ? == bi 0 { "= " G + na nb "\\n" } 0');
L.push('  ? == bi 1 { "= " G - na nb "\\n" } 0');
L.push('  ? == bi 2 { "= " G * na nb "\\n" } 0');
L.push('  ? == bi 3 { "= " G Sq na "\\n" } 0');
L.push('  ? == bi 4 { "primos: " = m 2 = lim I na W <= m lim { ? primo m { N m " " } 0 = m + m 1 } "\\n" } 0');
L.push('  ? == bi 5 { "Ola! Sou a Onda. Pede-me somas, raizes ou primos.\\n" } 0');
L.push('  0 }');
require('fs').writeFileSync('/tmp/claude-0/motor.onda', L.join('\n')+'\n');
console.log('motor.onda: V='+V+' H='+H+' K='+K+' bytes voc='+voc.length);

// --- escrever o engine no repo + construir o artefacto interativo ---
const fs2=require('fs'), ROOT='/home/user/escolaplay/onda';
const SRC=L.join('\n')+'\n';
fs2.writeFileSync(ROOT+'/ex/motor.onda', SRC);
const WASM_B64=fs2.readFileSync(ROOT+'/build/w2.wasm').toString('base64');
const ONDAC=fs2.readFileSync(ROOT+'/web/ondac.js','utf8');
const EXS=['soma 3 e 5','7 vezes 8','raiz de 81','primos ate 20','45 menos 12','quanto e 100 mais 23','bom dia'];
const html=`<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>Onda · IA</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=JetBrains+Mono:wght@600&display=swap">
<style>
 :root{--ink:#eef2fb;--mut:#9fb0d8;--card:#141a2e;--line:#283255;--a:#7ee0ff;--b:#b98cff;--ok:#8ff0c0;
   --f:"Baloo 2","Arial Rounded MT Bold",system-ui,sans-serif;--m:"JetBrains Mono",ui-monospace,monospace;color-scheme:dark}
 *{box-sizing:border-box}html,body{margin:0;min-height:100%}
 body{background:radial-gradient(900px 600px at 50% -10%,#1a2350,transparent 60%),linear-gradient(180deg,#0a0e1c,#0d1228);
   color:var(--ink);font:15px/1.45 var(--f);-webkit-tap-highlight-color:transparent;min-height:100vh}
 .wrap{max-width:460px;margin:0 auto;display:flex;flex-direction:column;gap:13px;padding:max(16px,env(safe-area-inset-top,0px)) 16px max(18px,env(safe-area-inset-bottom,0px))}
 h1{margin:0;text-align:center;font-size:23px;font-weight:800}
 h1 small{display:block;font-size:12.5px;font-weight:700;color:var(--mut)}
 .chips{display:flex;gap:7px;flex-wrap:wrap;justify-content:center}
 .chips button{border:1px solid var(--line);background:var(--card);color:var(--mut);font:700 12.5px var(--f);padding:6px 12px;border-radius:999px;cursor:pointer}
 .bar{display:flex;gap:9px}
 input{flex:1;background:#0b0f1f;color:#dfe8ff;border:1px solid var(--line);border-radius:14px;padding:13px 14px;font:600 15px var(--f)}
 .go{border:0;border-radius:14px;color:#071018;font:800 15px var(--f);padding:0 20px;cursor:pointer;background:linear-gradient(120deg,var(--a),var(--b))}
 .go:active{transform:translateY(2px)}
 .card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;min-height:120px}
 .intent{display:inline-block;font:800 13px var(--f);color:#071018;background:var(--a);padding:5px 13px;border-radius:999px;margin-bottom:10px}
 .res{font:700 26px var(--m);color:var(--ok);white-space:pre-wrap;overflow-wrap:anywhere}
 .note{color:var(--mut);font-size:12px;font-weight:700;text-align:center;line-height:1.5}
 .note b{color:var(--a)}
</style>
<div class="wrap">
 <h1>Onda · IA <small>escreve um pedido — a Onda interpreta e faz</small></h1>
 <div class="chips" id="chips"></div>
 <div class="bar"><input id="q" placeholder="ex: soma 12 e 30" autocapitalize="off" autocorrect="off" spellcheck="false"><button class="go" id="go">Pergunta</button></div>
 <div class="card"><div id="out"><span class="note">a carregar o motor…</span></div></div>
 <div class="note">Uma rede neuronal treinada pelo <b>operador interno J</b> classifica a tua frase numa intenção; a Onda extrai os números e <b>executa</b>. Tudo compilado para WASM pela <b>própria Onda</b>, no telemóvel. Intenções: soma, subtrai, multiplica, raiz, primos, saudação.</div>
</div>
<script>${ONDAC}</script>
<script>
(function(){
 var SRC=${JSON.stringify(SRC)}, EXS=${JSON.stringify(EXS)};
 var WASM=Uint8Array.from(atob("${WASM_B64}"),function(c){return c.charCodeAt(0);});
 var q=document.getElementById('q'),out=document.getElementById('out'),go=document.getElementById('go'),chips=document.getElementById('chips');
 var bytes=null;
 EXS.forEach(function(e){var b=document.createElement('button');b.textContent=e;b.onclick=function(){q.value=e;ask();};chips.appendChild(b);});
 OndaC.load(WASM).then(function(){ return OndaC.compile(SRC,null,'w'); }).then(function(c){ bytes=c.bytes;
   out.innerHTML='<span class="note">pronto. escreve ou toca num exemplo.</span>'; });
 function ask(){ if(!bytes){return;} var t=q.value.trim(); if(!t)return;
   out.innerHTML='<span class="note">a pensar…</span>';
   OndaC.run(bytes,t).then(function(r){ var L=r.text.split('\\n'); var intent='',res='';
     L.forEach(function(l){ if(l.indexOf('intencao:')===0)intent=l.slice(9).trim(); else if(l.trim())res+=(res?'\\n':'')+l; });
     out.innerHTML='<span class="intent">'+(intent||'?')+'</span><div class="res">'+(res||'—').replace(/</g,'&lt;')+'</div>'; });
 }
 go.onclick=ask; q.addEventListener('keydown',function(e){if(e.key==='Enter')ask();});
})();
</script>`;
fs2.writeFileSync(ROOT+'/web/motor-ia.html', html);
console.log('escrito ex/motor.onda + web/motor-ia.html ('+(html.length/1024|0)+' KB)');
