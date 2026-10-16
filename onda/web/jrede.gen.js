// Treina uma rede 2->6->1 (sigmoide) em moons usando o OPERADOR INTERNO J para o backprop.
const H=6, NW=2*H+H+H+1, P=3+NW, EP=3000, PR=600, LR=2.0; // params: w0..w24,x,y,t
const fs=require('fs');
const sig=z=>'/ 1.0 + 1.0 Ex * -1.0 '+z;
function fwdExpr(){ // devolve a expressao de p (sobre w0..w24,x,y) ; ja = nome do param x/y
  const a=[]; for(let h=0;h<H;h++) a.push(sig('+ + * w'+(2*h)+' x * w'+(2*h+1)+' y w'+(12+h)));
  let s='w24'; for(let h=0;h<H;h++) s='+ * w'+(18+h)+' '+a[h]+' '+s;
  return sig(s);
}
const p=fwdExpr();
const bce='* -1.0 + * t Lg + '+p+' 0.000000001 * - 1.0 t Lg + - 1.0 '+p+' 0.000000001';
const ws=Array.from({length:NW},(_,i)=>'w'+i);
let L=[];
L.push('# jrede : rede neuronal 2->6->1 (sigmoide) TREINADA pelo operador interno J do compilador.');
L.push('# Cada exemplo: monta os 28 parametros (25 pesos + x + y + alvo) em pa, chama `J gg loss pa`');
L.push('# e o compilador devolve TODO o gradiente d(loss)/d(param) numa so passagem; usa os 25 primeiros');
L.push('# para a descida. Prova o autodiff interno a treinar uma rede de ponta a ponta (sobe a ~100%).');
L.push('# Principio da folha: o compilador nunca usa J, logo o ponto-fixo nao parte. Gerado por web/jrede.gen.js.');
L.push(': loss '+('f'.repeat(P))+'>f '+ws.join(' ')+' x y t '+bce);
L.push(': pred '+('f'.repeat(2+NW))+'>f '+ws.join(' ')+' x y '+p);
const RND=j=>'- - * Sn * F '+j+' 12.9898 43758.5453 Fl * Sn * F '+j+' 12.9898 43758.5453 0.5';
const wargs=ws.map((_,i)=>'@f + w '+i).join(' ');
L.push(': main >i {');
L.push('  = n 160 = dx A n = dy A n = dl A n');
L.push('  = i 0 W < i n {');
L.push('    = c % i 2 = th * 3.14159265 / F i F - n 1 = cs Cs th = sn Sn th');
L.push('    = xr ? == c 0 cs - 1.0 cs = yr ? == c 0 sn - - 1.0 sn 0.5');
L.push('    !f + dx i + * 0.08 '+RND('+ i 1')+' * - xr 0.5 1.3  !f + dy i + * 0.08 '+RND('+ i 2')+' * - yr 0.15 1.3  !f + dl i F c = i + i 1 }');
L.push('  = w A '+NW+' = g A '+NW+' = pa A '+P+' = gg A '+P);
L.push('  = i 0 W < i '+NW+' { !f + w i * 1.5 '+RND('+ i 1')+' = i + i 1 }');
L.push('  = lr '+LR.toFixed(1)+' = ep 0');
L.push('  W < ep '+EP+' {');
L.push('    = i 0 W < i '+NW+' { !f + g i 0.0 = i + i 1 }');
L.push('    = loss 0.0 = nc 0 = k 0');
L.push('    W < k n {');
L.push('      = xx @f + dx k = yy @f + dy k = tt @f + dl k');
L.push('      = i 0 W < i '+NW+' { !f + pa i @f + w i = i + i 1 }');
L.push('      !f + pa '+NW+' xx !f + pa '+(NW+1)+' yy !f + pa '+(NW+2)+' tt');
L.push('      J gg loss pa');                                    // <- GRADIENTE PELO OPERADOR INTERNO
L.push('      = i 0 W < i '+NW+' { !f + g i + @f + g i @f + gg i = i + i 1 }');
L.push('      = pp pred '+wargs+' xx yy');
L.push('      = loss + loss * -1.0 + * tt Lg + pp 0.000000001 * - 1.0 tt Lg + - 1.0 pp 0.000000001');
L.push('      = nc + nc ? > pp 0.5 ? == 1 I tt 1 0 ? == 0 I tt 1 0  = k + k 1 }');
L.push('    = i 0 W < i '+NW+' { !f + w i - @f + w i * lr / @f + g i F n = i + i 1 }');
L.push('    ? == % ep '+PR+' 0 { "ep " N ep " perda " G / loss F n " precisao " G / F nc F n "\\n" } 0  = ep + ep 1 }');
L.push('  "final " G / F nc F n "\\n" 0 }');
fs.writeFileSync(require('path').join(__dirname,'..','ex','jrede.onda'), L.join('\n')+'\n');
console.log('escrito jrede.onda (NW='+NW+', params J='+P+')');
