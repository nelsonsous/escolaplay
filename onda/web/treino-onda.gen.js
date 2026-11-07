// Treinador da rede 2->H->1 em Onda: forward + backprop (adjuntos nos arrays de pesos) + SGD.
// Dataset two-moons gerado no proprio Onda. Leaky-ReLU (evita unidades mortas), init decorrelado.
const H=+process.argv[4]||10, EP=+process.argv[2]||4000, PR=+process.argv[3]||800, LR=+process.argv[5]||0.6;
const NW=4*H+1;
const wl=i=>'@f + w '+i, gl=i=>'@f + g '+i, gs=(i,e)=>'!f + g '+i+' '+e;
const W1a=h=>2*h, W1b=h=>2*h+1, B1=h=>2*H+h, W2=h=>3*H+h, B2=4*H;
const fl=x=>Number.isInteger(x)?x+'.0':''+x;
let L=[];
// pseudo-aleatorio decorrelado em [-0.5,0.5]
L.push(': rnd i>f j { = h * Sn * F + j 1 12.9898 43758.5453 - - h Fl h 0.5 }');
L.push(': main >i {');
L.push('  = n 160');
L.push('  = dx A n = dy A n = dl A n');
L.push('  = i 0');
L.push('  W < i n {');
L.push('    = th * 3.14159265 / F i F - n 1');
L.push('    = c % i 2');
L.push('    = cs Cs th = sn Sn th');
L.push('    = xr ? == c 0 cs - 1.0 cs');
L.push('    = yr ? == c 0 sn - - 1.0 sn 0.5');
L.push('    = nx * 0.1 rnd * i 3');
L.push('    = ny * 0.1 rnd + * i 3 1');
L.push('    !f + dx i + nx * - xr 0.5 1.3');
L.push('    !f + dy i + ny * - yr 0.15 1.3');
L.push('    !f + dl i F c');
L.push('    = i + i 1 }');
L.push('  = w A '+NW+' = g A '+NW);
L.push('  = i 0 W < i '+NW+' { !f + w i * 1.4 rnd i = i + i 1 }');
L.push('  = lr '+fl(LR));
L.push('  = ep 0');
L.push('  W < ep '+EP+' {');
L.push('    = i 0 W < i '+NW+' { !f + g i 0.0 = i + i 1 }');
L.push('    = loss 0.0 = nc 0');
L.push('    = k 0');
L.push('    W < k n {');
L.push('      = xx @f + dx k = yy @f + dy k = tt @f + dl k');
for(let h=0;h<H;h++){
  L.push('      = z'+h+' + + * '+wl(W1a(h))+' xx * '+wl(W1b(h))+' yy '+wl(B1(h)));
  L.push('      = a'+h+' ? > z'+h+' 0.0 z'+h+' * 0.01 z'+h);       // leaky-ReLU
  L.push('      = m'+h+' ? > z'+h+' 0.0 1.0 0.01');
}
L.push('      = s '+wl(B2));
for(let h=0;h<H;h++) L.push('      = s + s * '+wl(W2(h))+' a'+h);
L.push('      = p / 1.0 + 1.0 Ex * -1.0 s');
L.push('      = ds - p tt');
L.push('      '+gs(B2,'+ '+gl(B2)+' ds'));
for(let h=0;h<H;h++){
  L.push('      '+gs(W2(h),'+ '+gl(W2(h))+' * ds a'+h));
  L.push('      = dz'+h+' * * ds '+wl(W2(h))+' m'+h);
  L.push('      '+gs(W1a(h),'+ '+gl(W1a(h))+' * dz'+h+' xx'));
  L.push('      '+gs(W1b(h),'+ '+gl(W1b(h))+' * dz'+h+' yy'));
  L.push('      '+gs(B1(h),'+ '+gl(B1(h))+' dz'+h));
}
L.push('      = loss + loss * -1.0 + * tt Lg + p 0.000000001 * - 1.0 tt Lg + - 1.0 p 0.000000001');
L.push('      = nc + nc ? > p 0.5 ? == 1 I tt 1 0 ? == 0 I tt 1 0');
L.push('      = k + k 1 }');
L.push('    = i 0 W < i '+NW+' { !f + w i - @f + w i * lr / @f + g i F n = i + i 1 }');
L.push('    ? == % ep '+PR+' 0 { "ep " N ep " perda " G / loss F n " precisao " G / F nc F n "\\n" } 0');
L.push('    ? == % ep '+PR+' 0 { "@" = si 0 W < si '+NW+' { " " G @f + w si = si + si 1 } "\\n" } 0');
L.push('    = ep + ep 1 }');
L.push('  "final precisao " G / F nc F n "\\n" 0 }');
require('fs').writeFileSync('web/treino-onda.onda', L.join('\n')+'\n');
console.log('escrito web/treino-onda.onda (H='+H+', NW='+NW+', '+EP+' epocas, lr='+LR+')');
