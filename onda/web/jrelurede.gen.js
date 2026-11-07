// Rede 2->H->1 com ocultos ReLU (Mx 0 z), treinada pelo OPERADOR INTERNO J (backprop por `J gg loss pa`).
// Prova end-to-end que o J ja treina redes ReLU (min/max diferenciado it.81). Saida sigmoide + BCE.
const H=8, NW=4*H+1, P=3+NW, EP=5000, PR=1000, LR=0.7;
const fs=require('fs');
const sig=z=>'/ 1.0 + 1.0 Ex * -1.0 '+z;
const relu=z=>'Mx 0.0 '+z;                                 // <- ReLU, derivada pelo operador interno
const pre=h=>'+ + * w'+(2*h)+' x * w'+(2*h+1)+' y w'+(2*H+h);
function fwdExpr(){const a=[];for(let h=0;h<H;h++)a.push(relu(pre(h)));
  let s='w'+(4*H);for(let h=0;h<H;h++)s='+ * w'+(3*H+h)+' '+a[h]+' '+s;return sig(s);}
const p=fwdExpr();
const bce='* -1.0 + * t Lg + '+p+' 0.000000001 * - 1.0 t Lg + - 1.0 '+p+' 0.000000001';
const ws=Array.from({length:NW},(_,i)=>'w'+i);
const RND=j=>'- - * Sn * F '+j+' 12.9898 43758.5453 Fl * Sn * F '+j+' 12.9898 43758.5453 0.5';
const wargs=ws.map((_,i)=>'@f + w '+i).join(' ');
let L=[];
L.push('# jrelu-rede : rede 2->'+H+'->1 com ocultos ReLU (Mx 0 z), TREINADA pelo operador interno J.');
L.push('# Exercita o adjunto de min/max (it.81) num laço de treino real: `J gg loss pa` por exemplo.');
L.push('# Prova que o operador interno ja treina redes ReLU de ponta a ponta. Gerado por web/jrelurede.gen.js.');
L.push(': loss '+('f'.repeat(P))+'>f '+ws.join(' ')+' x y t '+bce);
L.push(': pred '+('f'.repeat(2+NW))+'>f '+ws.join(' ')+' x y '+p);
L.push(': main >i {');
L.push('  = n 160 = dx A n = dy A n = dl A n');
L.push('  = i 0 W < i n {');
L.push('    = c % i 2 = th * 3.14159265 / F i F - n 1 = cs Cs th = sn Sn th');
L.push('    = xr ? == c 0 cs - 1.0 cs = yr ? == c 0 sn - - 1.0 sn 0.5');
L.push('    !f + dx i + * 0.08 '+RND('+ i 1')+' * - xr 0.5 1.3  !f + dy i + * 0.08 '+RND('+ i 2')+' * - yr 0.15 1.3  !f + dl i F c = i + i 1 }');
L.push('  = w A '+NW+' = g A '+NW+' = pa A '+P+' = gg A '+P);
L.push('  = i 0 W < i '+NW+' { !f + w i * 1.2 '+RND('+ i 1')+' = i + i 1 }');
L.push('  = lr '+LR.toFixed(1)+' = ep 0');
L.push('  W < ep '+EP+' {');
L.push('    = i 0 W < i '+NW+' { !f + g i 0.0 = i + i 1 }');
L.push('    = loss 0.0 = nc 0 = k 0');
L.push('    W < k n {');
L.push('      = xx @f + dx k = yy @f + dy k = tt @f + dl k');
L.push('      = i 0 W < i '+NW+' { !f + pa i @f + w i = i + i 1 }');
L.push('      !f + pa '+NW+' xx !f + pa '+(NW+1)+' yy !f + pa '+(NW+2)+' tt');
L.push('      J gg loss pa');
L.push('      = i 0 W < i '+NW+' { !f + g i + @f + g i @f + gg i = i + i 1 }');
L.push('      = pp pred '+wargs+' xx yy');
L.push('      = loss + loss * -1.0 + * tt Lg + pp 0.000000001 * - 1.0 tt Lg + - 1.0 pp 0.000000001');
L.push('      = nc + nc ? > pp 0.5 ? == 1 I tt 1 0 ? == 0 I tt 1 0  = k + k 1 }');
L.push('    = i 0 W < i '+NW+' { !f + w i - @f + w i * lr / @f + g i F n = i + i 1 }');
L.push('    ? == % ep '+PR+' 0 { "ep " N ep " perda " G / loss F n " precisao " G / F nc F n "\\n" } 0  = ep + ep 1 }');
L.push('  "final " G / F nc F n "\\n" 0 }');
fs.writeFileSync(require('path').join(__dirname,'..','ex','jrelu-rede.onda'), L.join('\n')+'\n');
console.log('escrito ex/jrelu-rede.onda (H='+H+', NW='+NW+', params J='+P+')');
