// Rede multi-classe (3 classes) treinada pelo OPERADOR INTERNO J.
// Perda = entropia cruzada com softmax: loss = log(Se^zc) - Sum(t_c z_c).  Tudo em exp/log/+/*/-,
// que o J ja diferencia. Oculta sigmoide; saida = 3 logits; argmax para a classe.
const fs=require('path'), FS=require('fs');
// Nota empirica: o J e forward-mode e emite a derivada em linha, 1x por parametro. Sem CSE entre as
// 3 saidas, a arvore triplica e os temporarios explodem: H=3 ja da ~109 mil linhas de C, H=4 ~171 mil,
// e H>=6 estoura o emissor. Prova que multi-classe CORRE no operador interno, mas que forward-mode nao
// escala -> para redes grandes usa-se o reverse-mode source-to-source (web/autodiff.js). H=3 e robusto.
const H=3, NW=6*H+3, O=3*H, P=NW+5;            // pesos: 3H ocultos + 3*(H+1) saida ; params J = NW + x,y,t0,t1,t2
const sig=z=>'/ 1.0 + 1.0 Ex * -1.0 '+z;
const hid=i=>sig('+ + * w'+(3*i)+' x * w'+(3*i+1)+' y w'+(3*i+2));
const logit=c=>{ let s='w'+(O+c*(H+1)+H); for(let i=0;i<H;i++) s='+ * w'+(O+c*(H+1)+i)+' '+hid(i)+' '+s; return s; };
const z0=logit(0), z1=logit(1), z2=logit(2);
const lse='Lg + + Ex '+z0+' Ex '+z1+' Ex '+z2;
const dot='+ + * t0 '+z0+' * t1 '+z1+' * t2 '+z2;
const loss='- '+lse+' '+dot;
const argmax='? > '+z0+' '+z1+' ? > '+z0+' '+z2+' 0.0 2.0 ? > '+z1+' '+z2+' 1.0 2.0';
const ws=Array.from({length:NW},(_,i)=>'w'+i);
const RND=j=>'- - * Sn * F '+j+' 12.9898 43758.5453 Fl * Sn * F '+j+' 12.9898 43758.5453 0.5';
const EP=5000,PR=1000,LR=1.2;
let L=[];
L.push('# jmulti : rede 2->'+H+'->3 MULTI-CLASSE, treinada pelo operador interno J (softmax + entropia cruzada).');
L.push('# loss = log(Se^zc) - Sum(t_c z_c) ; so usa exp/log/+/*/- que o J ja deriva. Gerado por web/jmulti.gen.js.');
L.push(': loss '+('f'.repeat(P))+'>f '+ws.join(' ')+' x y t0 t1 t2 '+loss);
L.push(': cls '+('f'.repeat(NW+2))+'>f '+ws.join(' ')+' x y '+argmax);
L.push(': main >i {');
L.push('  = n 180 = dx A n = dy A n = dl A n');
L.push('  = i 0 W < i n {');
L.push('    = c % i 3 = ang * 2.0943951 F c = cx * 0.6 Cs ang = cy * 0.6 Sn ang');
L.push('    !f + dx i + cx * 0.26 '+RND('+ i 1')+'  !f + dy i + cy * 0.26 '+RND('+ i 2')+'  !f + dl i F c = i + i 1 }');
L.push('  = w A '+NW+' = g A '+NW+' = pa A '+P+' = gg A '+P);
L.push('  = i 0 W < i '+NW+' { !f + w i * 1.0 '+RND('+ i 1')+' = i + i 1 }');
L.push('  = lr '+LR.toFixed(1)+' = ep 0');
L.push('  W < ep '+EP+' {');
L.push('    = i 0 W < i '+NW+' { !f + g i 0.0 = i + i 1 }');
L.push('    = loss 0.0 = nc 0 = k 0');
L.push('    W < k n {');
L.push('      = xx @f + dx k = yy @f + dy k = ci I @f + dl k');
L.push('      = i 0 W < i '+NW+' { !f + pa i @f + w i = i + i 1 }');
L.push('      !f + pa '+NW+' xx !f + pa '+(NW+1)+' yy');
L.push('      !f + pa '+(NW+2)+' ? == ci 0 1.0 0.0  !f + pa '+(NW+3)+' ? == ci 1 1.0 0.0  !f + pa '+(NW+4)+' ? == ci 2 1.0 0.0');
L.push('      J gg loss pa');
L.push('      = i 0 W < i '+NW+' { !f + g i + @f + g i @f + gg i = i + i 1 }');
L.push('      = pc cls '+ws.map((_,i)=>'@f + w '+i).join(' ')+' xx yy');
L.push('      = nc + nc ? == I pc ci 1 0  = k + k 1 }');
L.push('    = i 0 W < i '+NW+' { !f + w i - @f + w i * lr / @f + g i F n = i + i 1 }');
L.push('    ? == % ep '+PR+' 0 { "ep " N ep " precisao " G / F nc F n "\\n" } 0  = ep + ep 1 }');
L.push('  "final " G / F nc F n "\\n" 0 }');
FS.writeFileSync(fs.join(__dirname,'..','ex','jmulti.onda'), L.join('\n')+'\n');
console.log('escrito ex/jmulti.onda (H='+H+', NW='+NW+', params J='+P+')');
