// Ciclo de agente: a Onda (OCR) percepciona um ecra -> estado estruturado -> agente age -> a Onda rele.
// Reusa o motor ex/ocr.onda (compilado no browser). Demonstra o papel da Onda como "olhos" rapidos do Claude.
const fs=require('fs'), ROOT='/home/user/escolaplay/onda';
const OCR=fs.readFileSync(ROOT+'/ex/ocr.onda','utf8');
const G=JSON.parse(fs.readFileSync('/tmp/claude-0/ocr.json','utf8'));
const CH=G.CH, FS=G.FS;
const WASM_B64=fs.readFileSync(ROOT+'/build/w2.wasm').toString('base64');
const ONDAC=fs.readFileSync(ROOT+'/web/ondac.js','utf8');
const html=`<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>Onda · Agente</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Roboto+Mono:wght@500;700&display=swap">
<style>
 :root{--ink:#eef2fb;--mut:#9fb0d8;--card:#141a2e;--line:#283255;--a:#7ee0ff;--b:#b98cff;--ok:#8ff0c0;--amber:#ffd36b;
   --f:"Baloo 2",system-ui,sans-serif;--m:"Roboto Mono",ui-monospace,monospace;color-scheme:dark}
 *{box-sizing:border-box}html,body{margin:0;min-height:100%}
 body{background:radial-gradient(900px 600px at 50% -10%,#1a2350,transparent 60%),linear-gradient(180deg,#0a0e1c,#0d1228);
   color:var(--ink);font:15px/1.45 var(--f);min-height:100vh;-webkit-tap-highlight-color:transparent}
 .wrap{max-width:460px;margin:0 auto;display:flex;flex-direction:column;gap:12px;padding:max(16px,env(safe-area-inset-top,0px)) 16px max(18px,env(safe-area-inset-bottom,0px))}
 h1{margin:0;text-align:center;font-size:22px;font-weight:800}h1 small{display:block;font-size:12px;font-weight:700;color:var(--mut)}
 .screen{position:relative;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#0a1020}
 .screen canvas{display:block;width:100%}
 .go{border:0;border-radius:14px;color:#071018;font:800 15px var(--f);padding:13px 0;cursor:pointer;background:linear-gradient(120deg,var(--a),var(--b))}
 .go:active{transform:translateY(2px)}
 .cols{display:grid;grid-template-columns:1fr;gap:10px}
 .panel{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:11px 13px}
 .panel h3{margin:0 0 6px;font:800 11px var(--f);letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}
 .panel pre{margin:0;font:600 11.5px/1.5 var(--m);color:var(--ok);white-space:pre-wrap;overflow-wrap:anywhere}
 .act{color:var(--amber)}
 .note{color:var(--mut);font-size:12px;font-weight:700;text-align:center;line-height:1.5}.note b{color:var(--a)}
</style>
<div class="wrap">
 <h1>Onda · Agente <small>a Onda vê o ecrã · o “Claude” decide · executa · a Onda relê</small></h1>
 <div class="screen"><canvas id="cv" width="300" height="150"></canvas></div>
 <button class="go" id="go">▶ Correr o ciclo</button>
 <div class="cols">
  <div class="panel"><h3>Onda percepciona (→ para o Claude)</h3><pre id="state">—</pre></div>
  <div class="panel"><h3>Claude decide (ação)</h3><pre id="plan" class="act">—</pre></div>
 </div>
 <div class="note">A Onda lê o ecrã (pixéis→texto+posições, uns ms) e entrega ao <b>Claude</b> só texto estruturado. O Claude responde com <b>o que inserir e onde clicar</b>; executa-se e a <b>Onda relê</b> para confirmar. É o ciclo percepção↔ação — a Onda como olhos rápidos.</div>
</div>
<script>${ONDAC}</script>
<script>
(function(){
 var OCR=${JSON.stringify(OCR)}, CH=${CH}, FS=${FS};
 var WASM=Uint8Array.from(atob("${WASM_B64}"),function(c){return c.charCodeAt(0);});
 var cv=document.getElementById('cv'),ctx=cv.getContext('2d'),AW=null,bytes=null,enc=new TextEncoder();
 var stEl=document.getElementById('state'),plEl=document.getElementById('plan'),go=document.getElementById('go');
 // modelo do ecra (um formulario)
 var ui={lines:[{t:'Iniciar sessao',k:'titulo'},{t:'email: ',k:'campo',name:'email'},{t:'senha: ',k:'campo',name:'senha'},{t:'[ Entrar ]',k:'botao'},{t:'',k:'estado'}]};
 function draw(hl){ ctx.fillStyle='#0a1020';ctx.fillRect(0,0,cv.width,cv.height);
   ui.lines.forEach(function(l,r){ var y=r*CH+6;
     if(l.k==='botao'){ctx.fillStyle=hl==='botao'?'#2a6cff':'#1b2a52';ctx.fillRect(6,y-2,Math.ceil(l.t.length*AW)+6,CH);}
     ctx.fillStyle=l.k==='titulo'?'#9fd0ff':l.k==='estado'?'#8ff0c0':'#dfe8ff';
     ctx.font=(l.k==='titulo'?'700 ':'500 ')+FS+'px "Roboto Mono"';ctx.textBaseline='top';ctx.fillText(l.t,8,y);}); }
 function ocrLine(text){ text=text.length?text:' '; var W=Math.ceil(text.length*AW)+4,c=document.createElement('canvas');c.width=W;c.height=CH;var g=c.getContext('2d');
   g.fillStyle='#000';g.fillRect(0,0,W,CH);g.fillStyle='#fff';g.font='500 '+FS+'px "Roboto Mono"';g.textBaseline='top';g.fillText(text,0,1);
   var d=g.getImageData(0,0,W,CH).data,buf=new Uint8Array(W*CH);for(var i=0;i<W*CH;i++)buf[i]=d[i*4];
   var h=enc.encode(W+'\\n'),inp=new Uint8Array(h.length+buf.length);inp.set(h,0);inp.set(buf,h.length);
   return OndaC.run(bytes,inp).then(function(r){return r.text.replace(/\\n+$/,'');}); }
 function perceive(){ // a Onda le cada linha e devolve estado estruturado
   return Promise.all(ui.lines.map(function(l,r){return ocrLine(l.t).then(function(txt){
     var kind=/:/.test(txt)?'campo':/\\[/.test(txt)?'botao':r===0?'titulo':'texto';
     return {linha:r, y:r*CH+6, texto:txt, tipo:kind}; });}))
   .then(function(items){ var t0=performance.now();
     stEl.textContent=JSON.stringify(items.filter(function(x){return x.texto.trim();}),null,1).replace(/\\n\\s+/g,' ').replace(/},/g,'},\\n');
     return items; }); }
 function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
 async function cycle(){ go.disabled=true; plEl.textContent='…';
   draw(); await perceive();
   // "Claude" (aqui uma decisao guiada) recebe o estado e responde acoes
   var plan=[{op:'inserir',campo:'email',valor:'nelson@inetum.com'},{op:'inserir',campo:'senha',valor:'******'},{op:'clicar',alvo:'[ Entrar ]'}];
   for(const a of plan){ plEl.textContent=JSON.stringify(a);
     if(a.op==='inserir'){ var ln=ui.lines.find(function(l){return l.name===a.campo;}); for(var i=0;i<=a.valor.length;i++){ln.t=a.campo+': '+a.valor.slice(0,i);draw();await sleep(40);} await perceive(); }
     else { draw('botao'); await sleep(500); ui.lines[4].t='sessao iniciada 100%'; draw(); await perceive(); }
     await sleep(500); }
   plEl.textContent=JSON.stringify({op:'fim',resultado:'sessao iniciada'});
   go.disabled=false;
 }
 function boot(){ var m=document.createElement('canvas').getContext('2d');m.font='500 '+FS+'px "Roboto Mono"';AW=m.measureText('m').width;
   cv.width=300;cv.height=ui.lines.length*CH+12; draw(); stEl.textContent='(toca ▶ para a Onda ler o ecrã)'; }
 Promise.all([document.fonts.load('500 '+FS+'px "Roboto Mono"'),document.fonts.load('700 '+FS+'px "Roboto Mono"'),OndaC.load(WASM)])
  .then(function(){return OndaC.compile(OCR,null,'w');}).then(function(c){bytes=c.bytes;document.fonts.ready.then(boot);});
 go.onclick=cycle;
})();
</script>`;
fs.writeFileSync(ROOT+'/web/onda-agente.html', html);
console.log('escrito web/onda-agente.html ('+(html.length/1024|0)+' KB)');
