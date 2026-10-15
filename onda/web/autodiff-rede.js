// Aplica o autodiff genérico à PERDA da rede -> auto-gera o backward (o backprop) e o treinador.
const AD=require('./autodiff.js');
const H=10, NW=41, EP=+process.argv[2]||1500, PR=+process.argv[3]||60, LR=0.6;
AD.reset();
const px=AD.Var('px'), py=AD.Var('py'), pt=AD.Var('pt');
const w=[]; for(let i=0;i<NW;i++) w.push(AD.Var('w'+i));
// forward: 2->10->1, leaky-ReLU, sigmoide
const a=[];
for(let h=0;h<H;h++){ const pre=AD.add(AD.add(AD.mul(w[2*h],px),AD.mul(w[2*h+1],py)),w[2*H+h]); a.push(AD.lrelu(pre)); }
let s=w[4*H]; for(let h=0;h<H;h++) s=AD.add(s,AD.mul(w[3*H+h],a[h]));
const p=AD.div(AD.Con(1),AD.add(AD.Con(1),AD.exp(AD.neg(s))));
const eps=AD.Con(1e-9);
const loss=AD.neg(AD.add(AD.mul(pt,AD.log(AD.add(p,eps))),
                         AD.mul(AD.sub(AD.Con(1),pt),AD.log(AD.add(AD.sub(AD.Con(1),p),eps)))));

// --- verificação: gradiente auto (modo reverso) vs diferenças finitas, na perda da rede ---
const env={px:0.4,py:-0.3,pt:1}; for(let i=0;i<NW;i++) env['w'+i]=Math.sin(i*2.3)*0.8;
const g=AD.grad(loss,env); let maxe=0, e=1e-5;
for(let i=0;i<NW;i++){ const ep={...env}; ep['w'+i]+=e; const vp=AD.evalAll(ep)[loss];
  const em={...env}; em['w'+i]-=e; const vm=AD.evalAll(em)[loss]; maxe=Math.max(maxe,Math.abs(g['w'+i]-(vp-vm)/(2*e))); }
console.error('autodiff da perda vs dif.finitas, erro max:', maxe.toExponential(2), maxe<1e-4?'✓':'DIVERGE');
console.error('nós no grafo:', AD.nodes.length);

// --- emitir o backward automático ---
const varOrder=['px','py','pt'].concat(w.map((_,i)=>'w'+i));
const gradVars=w.map((_,i)=>({name:'w'+i,idx:i}));
const bwd=AD.emitOnda('bwd', loss, varOrder, gradVars, [{idx:NW,node:p}]); // pb[NW]=p

// --- montar o treinador que USA o backward auto-gerado ---
const wargs=w.map((_,i)=>'@f + w '+i).join(' ');
let L=[];
L.push(bwd);
L.push(': main >i {');
L.push('  = n 160 = dx A n = dy A n = dl A n');
L.push('  = i 0 W < i n {');
L.push('    = th * 3.14159265 / F i F - n 1 = c % i 2 = cs Cs th = sn Sn th');
L.push('    = xr ? == c 0 cs - 1.0 cs = yr ? == c 0 sn - - 1.0 sn 0.5');
L.push('    = nx * 0.1 - - * Sn * F + * i 3 1 12.9898 43758.5453 Fl * Sn * F + * i 3 1 12.9898 43758.5453 0.5');
L.push('    = ny * 0.1 - - * Sn * F + + * i 3 1 1 12.9898 43758.5453 Fl * Sn * F + + * i 3 1 1 12.9898 43758.5453 0.5');
L.push('    !f + dx i + nx * - xr 0.5 1.3  !f + dy i + ny * - yr 0.15 1.3  !f + dl i F c  = i + i 1 }');
L.push('  = w A '+NW+' = g A '+NW+' = pb A '+(NW+1));
L.push('  = i 0 W < i '+NW+' { !f + w i * 1.4 - - * Sn * F + i 1 12.9898 43758.5453 Fl * Sn * F + i 1 12.9898 43758.5453 0.5 = i + i 1 }');
L.push('  = lr '+LR+' = ep 0');
L.push('  W < ep '+EP+' {');
L.push('    = i 0 W < i '+NW+' { !f + g i 0.0 = i + i 1 }');
L.push('    = loss 0.0 = nc 0 = k 0');
L.push('    W < k n {');
L.push('      = xx @f + dx k = yy @f + dy k = tt @f + dl k');
L.push('      bwd pb xx yy tt '+wargs);
L.push('      = i 0 W < i '+NW+' { !f + g i + @f + g i @f + pb i = i + i 1 }');
L.push('      = pp @f + pb '+NW);
L.push('      = loss + loss * -1.0 + * tt Lg + pp 0.000000001 * - 1.0 tt Lg + - 1.0 pp 0.000000001');
L.push('      = nc + nc ? > pp 0.5 ? == 1 I tt 1 0 ? == 0 I tt 1 0');
L.push('      = k + k 1 }');
L.push('    = i 0 W < i '+NW+' { !f + w i - @f + w i * lr / @f + g i F n = i + i 1 }');
L.push('    ? == % ep '+PR+' 0 { "ep " N ep " perda " G / loss F n " precisao " G / F nc F n "\\n" } 0');
L.push('    ? == % ep '+PR+' 0 { "@" = si 0 W < si '+NW+' { " " G @f + w si = si + si 1 } "\\n" } 0');
L.push('    = ep + ep 1 }');
L.push('  "final precisao " G / F nc F n "\\n" 0 }');
require('fs').writeFileSync(__dirname+'/treino-auto.onda', L.join('\n')+'\n');
console.error('escrito web/treino-auto.onda (backward auto-gerado,', AD.nodes.length, 'nós)');
