// Editor/playground Onda: o PROPRIO compilador (WASM, escrito pela Onda) compila E corre o teu codigo,
// aqui no browser. Zero servidor. Dois modos: CORRER (-w, saida de texto) e PINTAR (-g, shader na GPU).
// Mostra o self-hosting ("a onda compila-se sozinha") + a directiva GPU. Gera web/onda-editor.html.
const fs=require('fs');
const ROOT='/home/user/escolaplay/onda';
const WASM_B64=fs.readFileSync(ROOT+'/build/w2.wasm').toString('base64');
const ONDAC=fs.readFileSync(ROOT+'/web/ondac.js','utf8');
const SHADER=': c8 f>i v I * 255.0 Mx 0.0 Mn 1.0 v\n: rgb fff>i r g b + + * c8 r 65536 * c8 g 256 c8 b\n: px fffff>i x y t w h {\n  = u / x w = v / y h\n  = a Sn + * u 9.0 t\n  = b Sn + * v 9.0 * t 1.3\n  = p + 0.5 * 0.5 Sn + + * u 6.0 * v 6.0 * 3.0 * a b\n  rgb + 0.5 * 0.5 Sn * 6.2831 p + 0.5 * 0.5 Sn * 6.2831 + p 0.33 + 0.5 * 0.5 Sn * 6.2831 + p 0.66 }\n: main >i D 160 160 px 0.0 160.0 160.0';
const EX={
 'Olá': ': main >i { "Ola, Onda!\\n" 0 }',
 'Contar': ': main >i {\n  = i 0\n  W < i 5 { "n=" N i " " = i + i 1 }\n  "\\n" 0 }',
 'Fibonacci': ': fib i>i n ? < n 2 n + fib - n 1 fib - n 2\n: main >i { = i 0 W < i 12 { N fib i " " = i + i 1 } "\\n" 0 }',
 'Seno': ': main >i {\n  = r 0\n  W < r 16 {\n    = c I + 32.0 * 30.0 Sn * F r 0.4\n    = x 0 W < x c { " " = x + x 1 }\n    "*\\n" = r + r 1 } 0 }',
 'Raiz√': ': main >i {\n  = n 1\n  W < n 10 { "raiz(" N n ") = " G Sq F n "\\n" = n + n 1 } 0 }',
 'Primos': ': primo i>i n { ? < n 2 0 = d 2 = r 1 W && r <= * d d n { ? == 0 % n d = r 0 0 = d + d 1 } r }\n: main >i { = n 2 W < n 50 { ? primo n { N n " " } 0 = n + n 1 } "\\n" 0 }',
 'Tabuada': ': main >i { = a 1 W <= a 5 { = b 1 W <= b 5 { = p * a b ? < p 10 " " 0 N p " " = b + b 1 } "\\n" = a + a 1 } 0 }',
 '🎨 Plasma': SHADER
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
 textarea{width:100%;min-height:150px;resize:vertical;background:#0b0f1f;color:#dfe8ff;border:1px solid var(--line);
   border-radius:14px;padding:12px;font:600 13px/1.5 var(--m);tab-size:2;white-space:pre;overflow-wrap:normal;overflow-x:auto}
 .row{display:flex;gap:10px;align-items:stretch}
 .run,.paint,.ver{flex:1;border:0;border-radius:14px;color:#071018;font:800 14px var(--f);padding:12px 0;cursor:pointer}
 .run{background:linear-gradient(120deg,var(--a),var(--b));box-shadow:0 12px 26px -12px var(--b)}
 .paint{background:linear-gradient(120deg,#ffd36b,#ff8ad0);box-shadow:0 12px 26px -12px #ff8ad0}
 .ver{background:var(--card);color:var(--ink);border:1px solid var(--line)}
 .run:active,.paint:active,.ver:active{transform:translateY(2px)}
 .stat{font:700 11px var(--m);color:var(--mut);text-align:center;line-height:1.35}
 pre#out{margin:0;background:#0b0f1f;border:1px solid var(--line);border-radius:14px;padding:12px;min-height:84px;
   font:600 13px/1.5 var(--m);color:var(--ok);white-space:pre-wrap;overflow-wrap:anywhere}
 pre#out.err{color:var(--err)}
 .art{position:relative;aspect-ratio:1;border-radius:14px;overflow:hidden;border:1px solid var(--line);background:#05070f;display:none}
 .art canvas{position:absolute;inset:0;width:100%;height:100%}
 .note{color:var(--mut);font-size:12px;font-weight:700;text-align:center;line-height:1.5}
 .note b{color:var(--a)}
</style>
<div class="wrap">
 <h1>Onda · Editor <small>o compilador da Onda (WASM, feito pela própria Onda) compila <b>e</b> corre aqui</small></h1>
 <div class="chips" id="chips"></div>
 <textarea id="src" spellcheck="false" autocapitalize="off" autocorrect="off"></textarea>
 <div class="row"><button class="run" id="run">▶ Correr</button><button class="paint" id="paint">🎨 Pintar</button><button class="ver" id="ver">👁 Ver código</button></div>
 <div class="stat" id="stat">pronto</div>
 <div class="art" id="art"><canvas id="cv" width="320" height="320"></canvas></div>
 <pre id="out">(carrega o compilador…)</pre>
 <div class="note">Escreves Onda → a Onda compila-o para <b>WebAssembly</b> (Correr) ou <b>GLSL</b> (Pintar na GPU) → executa. Tudo no telemóvel, sem servidor. A própria linguagem a compilar-se a si mesma.</div>
</div>
<script>${ONDAC}</script>
<script>
(function(){
 var EX=${JSON.stringify(EX)};
 var WASM=Uint8Array.from(atob("${WASM_B64}"),function(c){return c.charCodeAt(0);});
 var src=document.getElementById('src'),out=document.getElementById('out'),stat=document.getElementById('stat');
 var runb=document.getElementById('run'),paintb=document.getElementById('paint'),verb=document.getElementById('ver'),art=document.getElementById('art'),cv=document.getElementById('cv');
 var chips=document.getElementById('chips'), ready=false, raf=null, gl=null;
 Object.keys(EX).forEach(function(k){var b=document.createElement('button');b.textContent=k;
   b.onclick=function(){src.value=EX[k];showText('(carrega Correr ou Pintar)','');};chips.appendChild(b);});
 src.value=EX['Fibonacci'];
 OndaC.load(WASM).then(function(){ready=true;out.textContent='Compilador pronto. Carrega ▶ Correr ou 🎨 Pintar.';stat.textContent='compilador '+(WASM.length/1024|0)+' KB';});
 function stopPaint(){ if(raf){cancelAnimationFrame(raf);raf=null;} }
 function showText(t,cls){ stopPaint(); art.style.display='none';out.style.display='block';out.className=cls||'';out.textContent=t; }
 function wasmOk(b){return b.length>3&&b[0]===0&&b[1]===97&&b[2]===115&&b[3]===109;}
 function entryName(s){ var m=s.match(/\\bD\\s+\\S+\\s+\\S+\\s+([a-z]\\w*)/); return m?m[1]:'px'; }
 runb.onclick=function(){ if(!ready){showText('ainda a carregar o compilador…','');return;}
   showText('a compilar…','');stat.textContent='…';
   setTimeout(function(){ OndaC.compile(src.value,null,'w').then(function(c){
     if(!wasmOk(c.bytes)){ showText(new TextDecoder().decode(c.bytes).trim(),'err');stat.textContent='erro de compilação';return; }
     var cms=c.ms, kb=(c.bytes.length/1024);
     OndaC.run(c.bytes).then(function(r){ showText(r.text||'(sem saída)','');
       stat.innerHTML='WASM '+kb.toFixed(1)+' KB · compilar '+cms.toFixed(0)+' ms · correr '+r.ms.toFixed(1)+' ms'; });
   }).catch(function(e){showText('erro: '+e,'err');stat.textContent='erro';}); },20);
 };
 function mksh(ty,s){var o=gl.createShader(ty);gl.shaderSource(o,s);gl.compileShader(o);
   if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){showText('GLSL: '+gl.getShaderInfoLog(o),'err');return null;}return o;}
 paintb.onclick=function(){ if(!ready){showText('ainda a carregar o compilador…','');return;}
   var entry=entryName(src.value); stopPaint(); out.textContent='a compilar shader…';stat.textContent='…';
   setTimeout(function(){ OndaC.compile(src.value,entry,'g').then(function(c){
     var glsl=c.text;
     if(/#error/.test(glsl)){ showText(glsl.trim(),'err');stat.textContent='erro de compilação';return; }
     if(!gl) gl=cv.getContext('webgl2',{preserveDrawingBuffer:true});
     if(!gl){ showText('WebGL2 indisponível neste browser.','err');return; }
     var vs=mksh(gl.VERTEX_SHADER,'#version 300 es\\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0,1);}');
     var fsh=mksh(gl.FRAGMENT_SHADER,glsl); if(!vs||!fsh)return;
     var pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fsh);gl.linkProgram(pr);
     if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){ showText('GLSL link: '+gl.getProgramInfoLog(pr),'err');return; }
     gl.useProgram(pr);var uLoc=gl.getUniformLocation(pr,'u'),W=cv.width,H=cv.height;gl.viewport(0,0,W,H);
     out.style.display='none';art.style.display='block';
     stat.innerHTML='GPU · GLSL '+glsl.split('\\n').length+' linhas · entrada «'+entry+'» · compilar '+c.ms.toFixed(0)+' ms';
     var t0=performance.now();
     (function loop(){ var t=(performance.now()-t0)/1000; gl.uniform1fv(uLoc,[t,W,H,0,0,0,0,0]);
       gl.drawArrays(gl.TRIANGLES,0,3); raf=requestAnimationFrame(loop); })();
   }).catch(function(e){showText('erro: '+e,'err');stat.textContent='erro';}); },20);
 };
 verb.onclick=function(){ if(!ready){showText('ainda a carregar o compilador…','');return;}
   var pix=/\\bD\\s+\\S+\\s+\\S+\\s+[a-z]/.test(src.value), entry=pix?entryName(src.value):null, mode=pix?'g':undefined;
   showText('a compilar…','');stat.textContent='…';
   setTimeout(function(){ OndaC.compile(src.value,entry,mode).then(function(c){
     var t=c.text;
     showText(t.trim()||'(vazio)', /#error/.test(t)?'err':'');
     stat.innerHTML=(pix?'GLSL':'C')+' · '+t.split('\\n').length+' linhas · compilar '+c.ms.toFixed(0)+' ms';
   }).catch(function(e){showText('erro: '+e,'err');stat.textContent='erro';}); },20);
 };
})();
</script>`;
fs.writeFileSync(ROOT+'/web/onda-editor.html', html);
console.log('escrito web/onda-editor.html ('+(html.length/1024|0)+' KB)');
