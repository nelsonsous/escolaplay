// Rede PROFUNDA 2->16->16->1 no espiral, backward AUTO-gerado pelo autodiff (pesos por array).
const AD=require('./autodiff.js'); const fs=require('fs');
const H1=16,H2=16,NW=337, EP=+process.argv[2]||2500, PR=+process.argv[3]||100, LR=+process.argv[4]||0.5;
const {Var:V,Con:C,add,mul,sub,div,exp,log,neg,lrelu:lr_}=AD;
AD.reset();
const px=V('px'),py=V('py'),pt=V('pt'), w=i=>V('w'+i);
const W1a=h=>h*2,W1b=h=>h*2+1,B1=h=>32+h,W2=(j,h)=>48+j*16+h,B2=j=>304+j,W3=j=>320+j,B3=336;
const a1=[]; for(let h=0;h<H1;h++) a1.push(lr_(add(add(mul(w(W1a(h)),px),mul(w(W1b(h)),py)),w(B1(h)))));
const a2=[]; for(let j=0;j<H2;j++){ let s=w(B2(j)); for(let h=0;h<H1;h++) s=add(s,mul(w(W2(j,h)),a1[h])); a2.push(lr_(s)); }
let s=w(B3); for(let j=0;j<H2;j++) s=add(s,mul(w(W3(j)),a2[j]));
const p=div(C(1),add(C(1),exp(neg(s)))), eps=C(1e-9);
const loss=neg(add(mul(pt,log(add(p,eps))),mul(sub(C(1),pt),log(add(sub(C(1),p),eps)))));

// verificação do gradiente automático
const env={px:0.3,py:-0.2,pt:1}; for(let i=0;i<NW;i++) env['w'+i]=Math.sin(i*1.7)*0.5;
const g=AD.grad(loss,env); let me=0,e=1e-5;
for(let i=0;i<NW;i+=7){ const ep={...env};ep['w'+i]+=e; const vp=AD.evalAll(ep)[loss];
  const em={...env};em['w'+i]-=e; me=Math.max(me,Math.abs(g['w'+i]-(vp-AD.evalAll(em)[loss])/(2*e))); }
console.error('rede PROFUNDA ('+AD.nodes.length+' nós) autodiff vs dif.finitas:', me.toExponential(2), me<1e-4?'✓':'DIVERGE');

// emitir backward (pesos por array wp) e forward (pesos por parametro, para -j render)
const arrV={}, gradV=[]; for(let i=0;i<NW;i++){ arrV['w'+i]={arr:'wp',idx:i}; gradV.push({name:'w'+i,idx:i}); }
const bwd=AD.emitGrad('bwd',loss,[{name:'wp',type:'i'},{name:'px',type:'f'},{name:'py',type:'f'},{name:'pt',type:'f'}],gradV,[{idx:NW,node:p}],arrV);
const fparams=[{name:'px',type:'f'},{name:'py',type:'f'}]; for(let i=0;i<NW;i++) fparams.push({name:'w'+i,type:'f'});
fs.writeFileSync(__dirname+'/rede-fundo.onda', AD.emitVal('nn',p,fparams,{})+'\n');

// treinador
const RND=j=>'- - * Sn * F '+j+' 12.9898 43758.5453 Fl * Sn * F '+j+' 12.9898 43758.5453 0.5';
let L=[bwd];
L.push(': main >i {');
L.push('  = n 240 = dx A n = dy A n = dl A n');
L.push('  = i 0 W < i n {');
L.push('    = c % i 2');
L.push('    = r + 0.15 * 0.85 / F / i 2 F / n 2');
L.push('    = th + + * r * 3.2 3.14159265 * F c 3.14159265 * 0.25 '+RND('+ i 1'));
L.push('    !f + dx i * r Cs th  !f + dy i * r Sn th  !f + dl i F c  = i + i 1 }');
L.push('  = w A '+NW+' = g A '+NW+' = pb A '+(NW+1));
L.push('  = i 0 W < i '+NW+' { !f + w i * 1.3 '+RND('+ i 1')+' = i + i 1 }');
L.push('  = lr '+LR+' = ep 0');
L.push('  W < ep '+EP+' {');
L.push('    = i 0 W < i '+NW+' { !f + g i 0.0 = i + i 1 }');
L.push('    = loss 0.0 = nc 0 = k 0');
L.push('    W < k n {');
L.push('      = xx @f + dx k = yy @f + dy k = tt @f + dl k');
L.push('      bwd pb w xx yy tt');
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
fs.writeFileSync(__dirname+'/treino-fundo.onda', L.join('\n')+'\n');
console.error('escrito treino-fundo.onda e rede-fundo.onda (NW='+NW+', '+AD.nodes.length+' nós)');
