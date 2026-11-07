// Demo "a aprender com o operador interno J", 100% no browser: um programa Onda (rede 2->6->1 treinada
// por `J`) e compilado para WASM pelo PROPRIO compilador (ondac.js) aqui mesmo, corre, emite os dados e
// snapshots de pesos por epoca, e o canvas anima a fronteira a formar-se. Ciclo completo via a Onda.
const fs=require('fs'), ROOT='/home/user/escolaplay/onda';
const H=6,NW=4*H+1,P=3+NW,EP=2400,PR=120,LR=2.0,N=120;
const sig=z=>'/ 1.0 + 1.0 Ex * -1.0 '+z, pre=h=>'+ + * w'+(2*h)+' x * w'+(2*h+1)+' y w'+(2*H+h);
function fwd(){const a=[];for(let h=0;h<H;h++)a.push(sig(pre(h)));let s='w'+(4*H);for(let h=0;h<H;h++)s='+ * w'+(3*H+h)+' '+a[h]+' '+s;return sig(s);}
const p=fwd(), bce='* -1.0 + * t Lg + '+p+' 0.000000001 * - 1.0 t Lg + - 1.0 '+p+' 0.000000001';
const ws=Array.from({length:NW},(_,i)=>'w'+i), RND=j=>'- - * Sn * F '+j+' 12.9898 43758.5453 Fl * Sn * F '+j+' 12.9898 43758.5453 0.5';
const wargs=ws.map((_,i)=>'@f + w '+i).join(' ');
let L=[];
L.push('# aprende-j: rede 2->6->1 treinada pelo operador interno J; emite dados (#) e pesos por epoca (@).');
L.push(': loss '+('f'.repeat(P))+'>f '+ws.join(' ')+' x y t '+bce);
L.push(': pred '+('f'.repeat(2+NW))+'>f '+ws.join(' ')+' x y '+p);
L.push(': main >i {');
L.push('  = n '+N+' = dx A n = dy A n = dl A n');
L.push('  = i 0 W < i n {');
L.push('    = c % i 2 = th * 3.14159265 / F i F - n 1 = cs Cs th = sn Sn th');
L.push('    = xr ? == c 0 cs - 1.0 cs = yr ? == c 0 sn - - 1.0 sn 0.5');
L.push('    !f + dx i + * 0.08 '+RND('+ i 1')+' * - xr 0.5 1.3  !f + dy i + * 0.08 '+RND('+ i 2')+' * - yr 0.15 1.3  !f + dl i F c = i + i 1 }');
L.push('  "#" = i 0 W < i n { " " G @f + dx i " " G @f + dy i " " N I @f + dl i = i + i 1 } "\\n"');
L.push('  = w A '+NW+' = g A '+NW+' = pa A '+P+' = gg A '+P);
L.push('  = i 0 W < i '+NW+' { !f + w i * 1.5 '+RND('+ i 1')+' = i + i 1 }');
L.push('  = lr '+LR.toFixed(1)+' = ep 0');
L.push('  W < ep '+EP+' {');
L.push('    = i 0 W < i '+NW+' { !f + g i 0.0 = i + i 1 }');
L.push('    = nc 0 = k 0');
L.push('    W < k n {');
L.push('      = xx @f + dx k = yy @f + dy k = tt @f + dl k');
L.push('      = i 0 W < i '+NW+' { !f + pa i @f + w i = i + i 1 }');
L.push('      !f + pa '+NW+' xx !f + pa '+(NW+1)+' yy !f + pa '+(NW+2)+' tt');
L.push('      J gg loss pa');
L.push('      = i 0 W < i '+NW+' { !f + g i + @f + g i @f + gg i = i + i 1 }');
L.push('      = pp pred '+wargs+' xx yy');
L.push('      = nc + nc ? > pp 0.5 ? == 1 I tt 1 0 ? == 0 I tt 1 0  = k + k 1 }');
L.push('    = i 0 W < i '+NW+' { !f + w i - @f + w i * lr / @f + g i F n = i + i 1 }');
L.push('    ? == % ep '+PR+' 0 { "@" = si 0 W < si '+NW+' { " " G @f + w si = si + si 1 } " " N ep " " N nc "\\n" } 0');
L.push('    = ep + ep 1 }');
L.push('  "fim " N nc "\\n" 0 }');
const SRC=L.join('\n')+'\n';
fs.writeFileSync(ROOT+'/ex/aprende-j.onda', SRC);
const WASM_B64=fs.readFileSync(ROOT+'/build/w2.wasm').toString('base64');
const ONDAC=fs.readFileSync(ROOT+'/web/ondac.js','utf8');
const html=`<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>Onda · Aprende</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap">
<style>
 :root{--ink:#eef2fb;--mut:#9fb0d8;--card:#141a2e;--line:#283255;--a:#7ee0ff;--b:#b98cff;
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
 .done{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:3;font-weight:800;font-size:13px;color:#06121a;
   background:var(--a);padding:5px 14px;border-radius:999px;opacity:0;transition:opacity .4s}
 .done.on{opacity:1}
 .stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
 .st{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 4px;text-align:center}
 .st b{display:block;font-size:19px;font-weight:800}.st span{font-size:10px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.03em}
 .flow{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 15px;color:var(--mut);font-weight:700;font-size:12.5px;line-height:1.5}
 .flow b{color:var(--ink)}.flow .k{color:var(--a)}
 button{border:0;border-radius:16px;color:#071018;font:800 16px var(--f);padding:13px 0;cursor:pointer;
   background:linear-gradient(120deg,var(--a),var(--b));box-shadow:0 12px 26px -12px var(--b)}
 button:active{transform:translateY(2px)}
</style>
<div class="wrap">
 <h1>Onda · Aprende <small>a rede treina pelo operador interno <b>J</b> — tudo compilado no telemóvel</small></h1>
 <div class="art"><canvas id="cv" width="132" height="132"></canvas><div class="done" id="done">✓ aprendeu!</div></div>
 <div class="stats">
   <div class="st"><b id="ep">—</b><span>época</span></div>
   <div class="st"><b id="ac">—</b><span>precisão</span></div>
   <div class="st"><b id="ms">—</b><span>treino</span></div>
 </div>
 <div class="flow">O programa Onda — rede 2→6→1 cujo <b>backprop é o operador interno <span class="k">J</span></b> — é compilado para <b>WebAssembly pela própria Onda</b> (<span class="k">ondac.js</span>), aqui no browser, e corre. Cada <b>@</b> é um instantâneo dos pesos; o canvas anima a fronteira a formar-se. Ciclo completo — treino e inferência — sem servidor.</div>
 <button id="again">🔄 Treinar outra vez</button>
</div>
<script>${ONDAC}</script>
<script>
(function(){
 var SRC=${JSON.stringify(SRC)};
 var WASM=Uint8Array.from(atob("${WASM_B64}"),function(c){return c.charCodeAt(0);});
 var RES=132, cv=document.getElementById('cv'), ctx=cv.getContext('2d'), img=ctx.createImageData(RES,RES), dd=img.data, SC=1.05;
 var epEl=document.getElementById('ep'),acEl=document.getElementById('ac'),msEl=document.getElementById('ms'),doneEl=document.getElementById('done');
 function sig(z){return 1/(1+Math.exp(-z));}
 function net(x,y,w){ var s=w[24]; for(var h=0;h<6;h++){var a=sig(w[2*h]*x+w[2*h+1]*y+w[12+h]); s+=w[18+h]*a;} return sig(s); }
 var DATA=[];
 function render(w){
   for(var j=0;j<RES;j++)for(var i=0;i<RES;i++){var X=(i/(RES-1)*2-1)*SC,Y=(j/(RES-1)*2-1)*SC;
     var pr=net(X,Y,w), r=70+185*pr, g=120-10*pr, b=255-165*pr, gl=1-Math.abs(pr-0.5)*8;if(gl<0)gl=0;
     r+=gl*110;g+=gl*110;b+=gl*110; var o=(j*RES+i)*4; dd[o]=r>255?255:r;dd[o+1]=g>255?255:g;dd[o+2]=b>255?255:b;dd[o+3]=255;}
   ctx.putImageData(img,0,0);
   for(var k=0;k<DATA.length;k++){var px=(DATA[k][0]/SC*0.5+0.5)*RES,py=(DATA[k][1]/SC*0.5+0.5)*RES;
     ctx.beginPath();ctx.arc(px,py,1.9,0,6.28);ctx.fillStyle=DATA[k][2]?'#5a1020':'#0a1c4a';ctx.fill();
     ctx.lineWidth=0.8;ctx.strokeStyle='rgba(255,255,255,.7)';ctx.stroke();}
 }
 var timer=null;
 function train(){ clearInterval(timer); doneEl.classList.remove('on'); epEl.textContent='…';acEl.textContent='…';msEl.textContent='a compilar…';
   setTimeout(function(){ var t0=performance.now();
     OndaC.compile(SRC,null,'w').then(function(c){ return OndaC.run(c.bytes).then(function(r){
       var ms=performance.now()-t0, lines=r.text.split('\\n');
       DATA=[]; var snaps=[];
       lines.forEach(function(l){ if(l[0]==='#'){var v=l.slice(1).trim().split(/\\s+/).map(Number);
           for(var i=0;i+2<v.length;i+=3)DATA.push([v[i],v[i+1],v[i+2]]); }
         else if(l[0]==='@'){var v=l.slice(1).trim().split(/\\s+/).map(Number);snaps.push({w:v.slice(0,25),ep:v[25],nc:v[26]});} });
       msEl.textContent=ms.toFixed(0)+' ms'; var idx=0;
       timer=setInterval(function(){ if(idx>=snaps.length){clearInterval(timer);return;} var s=snaps[idx];
         render(s.w); epEl.textContent=s.ep; var a=s.nc/${N}; acEl.textContent=(a*100).toFixed(0)+'%'; if(a>=0.999)doneEl.classList.add('on'); idx++;
       }, 140);
     }); }).catch(function(e){ msEl.textContent='erro'; epEl.textContent='—'; console.error(e); });
   },30);
 }
 document.getElementById('again').onclick=train;
 OndaC.load(WASM).then(train);
})();
</script>`;
fs.writeFileSync(ROOT+'/web/aprende-j.html', html);
console.log('escrito ex/aprende-j.onda + web/aprende-j.html ('+(html.length/1024|0)+' KB)');
