// Gera a rede neural em Onda (fonte): 2 -> H -> 1, ReLU + sigmoide. Devolve prob*16777215 (24 bits).
const H=8, NW=2*H+H+H+1; // W1(2H)+b1(H)+W2(H)+b2(1)
let s=''; const w=i=>'w'+i;
s+=': nn '+('f'.repeat(2+NW))+'>i x y '+Array.from({length:NW},(_,i)=>w(i)).join(' ')+' {\n';
for(let h=0;h<H;h++){ // z_h = relu(W1[h,0]*x + W1[h,1]*y + b1[h])
  s+='  = z'+h+' Mx 0.0 + + * '+w(2*h)+' x * '+w(2*h+1)+' y '+w(2*H+h)+'\n';
}
// s = b2 + sum W2[h]*z_h  (aninhado a direita)
let acc=w(3*H); // b2 index = 2H+H+H = 4H? recalc: W1:0..2H-1, b1:2H..3H-1, W2:3H..4H-1, b2:4H
const W2=i=>w(3*H+i), B2=w(4*H);
let sum=B2;
for(let h=H-1;h>=0;h--) sum='+ * '+W2(h)+' z'+h+' '+sum;
s+='  = s '+sum+'\n';
s+='  = o / 1.0 + 1.0 Ex * -1.0 s\n';   // sigmoide
s+='  I * o 16777215.0 }\n';
require('fs').writeFileSync('web/net-onda.onda', s);
console.log('NW=',NW,'params=',2+NW,'| escrito web/net-onda.onda');
