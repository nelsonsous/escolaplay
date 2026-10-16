// Editor/playground Onda: o PROPRIO compilador (WASM, escrito pela Onda) compila E corre o teu codigo,
// aqui no browser. Zero servidor. Mostra o self-hosting ("a onda compila-se sozinha"). Gera web/onda-editor.html.
const fs=require('fs');
const ROOT='/home/user/escolaplay/onda';
const WASM_B64=fs.readFileSync(ROOT+'/build/w2.wasm').toString('base64');
const ONDAC=fs.readFileSync(ROOT+'/web/ondac.js','utf8');
const EX={
 'Olá': ': main >i { "Ola, Onda!\\n" 0 }',
 'Contar': ': main >i {\n  = i 0\n  W < i 5 { "n=" N i " " = i + i 1 }\n  "\\n" 0 }',
 'Fibonacci': ': fib i>i n ? < n 2 n + fib - n 1 fib - n 2\n: main >i { = i 0 W < i 12 { N fib i " " = i + i 1 } "\\n" 0 }',
 'Seno': ': main >i {\n  = r 0\n  W < r 16 {\n    = c I + 32.0 * 30.0 Sn * F r 0.4\n    = x 0 W < x c { " " = x + x 1 }\n    "*\\n" = r + r 1 } 0 }',
 'Raiz√': ': main >i {\n  = n 1\n  W < n 10 { "raiz(" N n ") = " G Sq F n "\\n" = n + n 1 } 0 }'
};
const html=`<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>Onda · Editor</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
 :root{--ink:#eef2fb;--mut:#9fb0d8;--card:#141a2e;--line:#283255;--a:#7ee0ff;--b:#b98cff;--ok:#8ff0c0;--err:#ff8aa0;
   --f:"Baloo 2","Arial Rounded MT Bold",system-ui,sans-serif;--m:"JetBrains Mono",ui-monospace,Menlo,monospace;color-scheme:dark}
 *{box-sizing:border-box}html,body{margin:0;min-height:100%}
 body{background:radial-gradient(900px 600px at 50% -10%,#1a2350,transparent 60%),linear-gradient(180deg,#0a0e1c,#0d1228);
   color:var(--ink);font:15px/1.45 var(--f);-webkit-tap-highlight-color:transparent;min-height:100vh}
 .wrap{max-width:460px;margin:0 auto;display:flex;flex-direction:column;gap:12px;
   padding:max(16px,env(safe-area-inset-top,0px)) 16px max(18px,env(safe-area-inset-bottom,0px))}
 h1{margin:0;text-align:center;font-size:22px;font-weight:800}
 h1 small{display:block;font-size:12px;font-weight:700;color:var(--mut)}
 .chips{display:flex;gap:7px;flex-wrap:wrap;justify-content:center}
 .chips button{border:1px solid var(--line);background:var(--card);color:var(--ink);font:700 13px var(--f);
   padding:7px 13px;border-radius:999px;cursor:pointer}
 .chips button:active{transform:translateY(1px)}
 textarea{width:100%;min-height:168px;resize:vertical;background:#0b0f1f;color:#dfe8ff;border:1px solid var(--line);
   border-radius:14px;padding:12px;font:600 13px/1.5 var(--m);tab-size:2;white-space:pre;overflow-wrap:normal;overflow-x:auto}
 .row{display:flex;gap:10px;align-items:center}
 .run{flex:1;border:0;border-radius:14px;color:#071018;font:800 16px var(--f);padding:13px 0;cursor:pointer;
   background:linear-gradient(120deg,var(--a),var(--b));box-shadow:0 12px 26px -12px var(--b)}
 .run:active{transform:translateY(2px)}
 .stat{font:700 11px var(--m);color:var(--mut);text-align:right;line-height:1.3;min-width:96px}
 pre#out{margin:0;background:#0b0f1f;border:1px solid var(--line);border-radius:14px;padding:12px;min-height:84px;
   font:600 13px/1.5 var(--m);color:var(--ok);white-space:pre-wrap;overflow-wrap:anywhere}
 pre#out.err{color:var(--err)}
 .note{color:var(--mut);font-size:12px;font-weight:700;text-align:center;line-height:1.5}
 .note b{color:var(--a)}
</style>
<div class="wrap">
 <h1>Onda · Editor <small>o compilador da Onda (WASM, feito pela própria Onda) compila <b>e</b> corre aqui</small></h1>
 <div class="chips" id="chips"></div>
 <textarea id="src" spellcheck="false" autocapitalize="off" autocorrect="off"></textarea>
 <div class="row"><button class="run" id="run">▶ Compilar e correr</button><div class="stat" id="stat">pronto</div></div>
 <pre id="out">(carrega o compilador…)</pre>
 <div class="note">Escreves Onda → a Onda compila-o para <b>WebAssembly</b> → corre. Tudo no telemóvel, sem servidor. É a própria linguagem a compilar-se a si mesma.</div>
</div>
<script>${ONDAC}</script>
<script>
(function(){
 var EX=${JSON.stringify(EX)};
 var WASM=Uint8Array.from(atob("${WASM_B64}"),function(c){return c.charCodeAt(0);});
 var src=document.getElementById('src'),out=document.getElementById('out'),stat=document.getElementById('stat'),runb=document.getElementById('run');
 var chips=document.getElementById('chips'), ready=false;
 Object.keys(EX).forEach(function(k){var b=document.createElement('button');b.textContent=k;
   b.onclick=function(){src.value=EX[k];out.className='';out.textContent='(carrega e corre)';};chips.appendChild(b);});
 src.value=EX['Seno'];
 OndaC.load(WASM).then(function(){ready=true;out.textContent='Compilador pronto. Carrega ▶ para correr.';stat.textContent='compilador '+(WASM.length/1024|0)+' KB';});
 function wasmOk(b){return b.length>3&&b[0]===0&&b[1]===97&&b[2]===115&&b[3]===109;}
 runb.onclick=function(){ if(!ready){out.textContent='ainda a carregar o compilador…';return;}
   out.className='';out.textContent='a compilar…';stat.textContent='…';
   setTimeout(function(){ OndaC.compile(src.value,null,'w').then(function(c){
     if(!wasmOk(c.bytes)){ out.className='err';out.textContent=new TextDecoder().decode(c.bytes).trim();stat.textContent='erro de compilação';return; }
     var cms=c.ms, kb=(c.bytes.length/1024);
     OndaC.run(c.bytes).then(function(r){ out.className='';out.textContent=r.text||'(sem saída)';
       stat.innerHTML='WASM '+kb.toFixed(1)+' KB<br>compilar '+cms.toFixed(0)+' ms<br>correr '+r.ms.toFixed(1)+' ms'; });
   }).catch(function(e){out.className='err';out.textContent='erro: '+e;stat.textContent='erro';}); },20);
 };
})();
</script>`;
fs.writeFileSync(ROOT+'/web/onda-editor.html', html);
console.log('escrito web/onda-editor.html ('+(html.length/1024|0)+' KB, compilador '+(WASM_B64.length/1024|0)+' KB b64)');
