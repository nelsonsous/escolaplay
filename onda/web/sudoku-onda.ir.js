// Emissor de RI da Onda (a IA escreve o GRAFO directamente, SEM parser).
// Produz o dump que `ondac -gi px` ingere e compila para GLSL (GPU).
// Campo: Sudoku 4x4 desenhado inteiramente pelo shader. Sem CSS para graficos.
// params(px): x y t w h d0 d1 d2 sel giv  -> u[0..7]
'use strict';
let ins=[], tt=[];
function nt(ty){ tt.push(ty); return tt.length-1; }
function fmtf(v){ if(!isFinite(v)) throw 'bad '+v; let s=(''+v); if(!/[.eE]/.test(s)) s+='.0'; return s; }
function fc(v){ const d=nt('f'); ins.push([1,d,fmtf(v),0,0,0,0]); return d; }
function ic(v){ const d=nt('i'); ins.push([1,d,String(v|0),0,0,0,0]); return d; }
function par(i){ const d=nt('f'); ins.push([5,d,0,i,0,0,0]); return d; }
function fb(op,a,b){ const d=nt('f'); ins.push([8,d,op,a,b,0,0]); return d; }
function ib(op,a,b){ const d=nt('i'); ins.push([8,d,op,a,b,0,0]); return d; }
function un(code,a,ty){ const d=nt(ty); ins.push([15,d,code,a,0,0,0]); return d; }
function fmn(a,b){ const d=nt('f'); ins.push([17,d,0,a,b,0,0]); return d; }
function fmx(a,b){ const d=nt('f'); ins.push([17,d,1,a,b,0,0]); return d; }
function ret(a){ ins.push([41,0,a,0,0,0,0]); }
// derivados (float). Nota: ids de temp sao numeros, logo NAO ha coercao automatica;
// os literais numericos entram so em ge/inr (bordas) e sao convertidos la com fc().
const add=(a,b)=>fb('+',a,b), sub=(a,b)=>fb('-',a,b), mul=(a,b)=>fb('*',a,b), div=(a,b)=>fb('/',a,b);
const flr=a=>un(7,a,'f'), ab=a=>un(8,a,'f'), tri=a=>un(1,a,'i'), sinf=a=>un(3,a,'f'), cosf=a=>un(4,a,'f');
let F0,F1;
const cl01=a=>fmn(F1,fmx(F0,a));
const eqi=(a,b)=>sub(F1,fmn(F1,ab(sub(a,b))));           // 1 se inteiros a==b
const modf=(a,m)=>sub(a,mul(m,flr(div(a,m))));
const ge=(x,e,s)=>cl01(mul(sub(x,fc(e)),fc(s)));       // e: NUMERO literal -> constante
const inr=(x,lo,hi,s)=>mul(ge(x,lo,s),sub(F1,ge(x,hi,s)));  // lo,hi: NUMEROS
const mix=(a,b,t)=>add(a,mul(sub(b,a),t));
const sel=(c,a,b)=>mix(b,a,c);                          // c em {0,1}
// fonte 3x5 (bit = linha*3+col, topo->baixo)
const FONT={
 1:[".X.","XX.",".X.",".X.","XXX"],
 2:["XXX","..X","XXX","X..","XXX"],
 3:["XXX","..X","XXX","..X","XXX"],
 4:["X.X","X.X","XXX","..X","..X"],
 5:["XXX","X..","XXX","..X","XXX"],
 6:["XXX","X..","XXX","X.X","XXX"],
 7:["XXX","..X","..X","..X","..X"],
 8:["XXX","X.X","XXX","X.X","XXX"],
 9:["XXX","X.X","XXX","..X","XXX"]};
function glyphBits(d){ const g=FONT[d]; let v=0; for(let r=0;r<5;r++)for(let c=0;c<3;c++) if(g[r][c]==='X') v|=1<<(r*3+c); return v; }

// ---- construir o campo ----
F0=fc(0); F1=fc(1);
const x=par(0), y=par(1), t=par(2), w=par(3), h=par(4);
const d0=par(5), d1=par(6), d2=par(7), selU=par(8), givU=par(9);
const s=div(F1,h);
const nx=mul(x,s), ny=mul(y,s), aw=mul(w,s);
// tabuleiro: quadrado centrado
const SB=mul(aw,fc(0.94));
const bx0=mul(sub(aw,SB),fc(0.5));
const by0=sub(fc(0.5),mul(SB,fc(0.5)));
const lx=div(sub(nx,bx0),SB), ly=div(sub(ny,by0),SB);  // 0..1 dentro do tabuleiro
const EDGE=200;                                        // nitidez das bordas
const inB=mul(inr(lx,0,1,EDGE),inr(ly,0,1,EDGE));
// celula
const lcx=fmn(fc(3.999),fmx(F0,mul(lx,fc(4)))), lcy=fmn(fc(3.999),fmx(F0,mul(ly,fc(4))));
const cx=flr(lcx), cy=flr(lcy);
const ci=add(mul(cy,fc(4)),cx);
const fx=sub(lcx,cx), fy=sub(lcy,cy);                  // 0..1 dentro da celula
// box tint (2x2)
const box=modf(add(flr(div(cx,fc(2))),flr(div(cy,fc(2)))),fc(2));
// selecao e pares
const selR=flr(div(selU,fc(4))), selC=sub(selU,mul(selR,fc(4)));
const isSel=eqi(ci,selU);
const sameRow=eqi(cy,selR), sameCol=eqi(cx,selC);
const selBoxR=flr(div(selR,fc(2))), selBoxC=flr(div(selC,fc(2)));
const sameBox=mul(eqi(flr(div(cx,fc(2))),selBoxC),eqi(flr(div(cy,fc(2))),selBoxR));
const hasSel=ge(selU,-0.5,EDGE);                  // 1 se sel>=0
const isPeer=mul(hasSel,fmx(sameRow,fmx(sameCol,sameBox)));
// digito da celula (desempacotar 3 floats de 7,7,2)
function unpackFloat(packed,pos){ const p=fc(Math.pow(10,pos)); return modf(flr(div(packed,p)),fc(10)); }
// ci 0..15 -> (wf,pos)
// construimos digit = soma eqi(wf,k)*unpack(dk,pos)
const wf=flr(div(ci,fc(7)));
const pos=sub(ci,mul(wf,fc(7)));
// unpack para cada float (pos valido 0..6 para d0,d1; 0..1 para d2)
// 10^pos com pos variavel:
function pow10(posId){ // devolve 10^pos (pos>=0 inteiro pequeno) via exp/log? usamos Pw? Nao. Fazemos tabela.
  // 10^pos = exp(pos*ln10)
  return un(5, mul(posId, fc(Math.log(10))), 'f'); // exp
}
const p10=pow10(pos);
function unpackVar(packed){ return modf(flr(div(packed,p10)),fc(10)); }
const dg0=unpackVar(d0), dg1=unpackVar(d1), dg2=unpackVar(d2);
const digit=add(mul(eqi(wf,F0),dg0),add(mul(eqi(wf,F1),dg1),mul(eqi(wf,fc(2)),dg2)));
const pci=un(5,mul(ci,fc(Math.log(2))),'f');          // 2^ci (bit ci de givU)
const isGiven=modf(flr(div(givU,pci)),fc(2));

// ---- cores ----
// fundo
const bgr=mix(fc(0.92),fc(0.98),ny), bgg=mix(fc(0.94),fc(0.94),ny), bgb=mix(fc(0.99),fc(0.98),ny);
// painel do tabuleiro
const pnr=fc(0.87),png=fc(0.90),pnb=fc(0.96);
// tile (com folga -> mostra painel)
const G=0.045;
const tileMask=mul(inr(fx,G,1-G,EDGE),inr(fy,G,1-G,EDGE));
// cor base do tile
const baseR=sub(F1,mul(box,fc(0.03))), baseG=sub(F1,mul(box,fc(0.02))), baseB=F1;
// given tile mais acinzentado
const gtR=fc(0.93),gtG=fc(0.95),gtB=fc(0.99);
let tR=mix(baseR,gtR,isGiven), tG=mix(baseG,gtG,isGiven), tB=mix(baseB,gtB,isGiven);
// peer
tR=mix(tR,fc(0.90),mul(isPeer,fc(0.6))); tG=mix(tG,fc(0.94),mul(isPeer,fc(0.6))); tB=mix(tB,F1,mul(isPeer,fc(0.6)));
// selecionado
const glow=mul(fc(0.5),add(F1,sinf(mul(t,fc(3)))));   // 0..1 pulsa
tR=mix(tR,fc(0.78),isSel); tG=mix(tG,fc(0.88),isSel); tB=mix(tB,F1,isSel);
// compor tile sobre painel sobre fundo
let cr=mix(bgr,pnr,inB), cg=mix(bgg,png,inB), cb=mix(bgb,pnb,inB);
cr=mix(cr,tR,tileMask); cg=mix(cg,tG,tileMask); cb=mix(cb,tB,tileMask);
// halo do selecionado (suave, mesmo fora do tile)
const selHalo=mul(isSel,mul(fc(0.25),add(fc(0.6),mul(fc(0.4),glow))));
cr=add(cr,mul(selHalo,fc(0.2))); cg=add(cg,mul(selHalo,fc(0.45))); cb=add(cb,mul(selHalo,fc(0.9)));
// ---- digito ----
// posicao do glifo dentro da celula (central 60% larg, 72% alt)
const gxv=flr(div(sub(fx,fc(0.2)),fc(0.2)));   // coluna 0..2 (0.6/3=0.2)
const gyv=flr(div(sub(fy,fc(0.14)),fc(0.144))); // linha 0..4 (0.72/5=0.144)
const inGX=inr(fx,0.2,0.8,EDGE), inGY=inr(fy,0.14,0.86,EDGE);
const bidx=add(mul(gyv,fc(3)),gxv);
// glyphVal = soma eqi(digit,k)*GL[k]
let gv=F0;
for(let k=1;k<=9;k++){ gv=add(gv,mul(eqi(digit,fc(k)),fc(glyphBits(k)))); }
// bit bidx de gv: 2^bidx via exp
const pb=un(5,mul(bidx,fc(Math.log(2))),'f');
const onBit=modf(flr(div(gv,pb)),fc(2));
const hasDigit=sub(F1,eqi(digit,F0));
const ink=mul(mul(mul(onBit,inGX),mul(inGY,hasDigit)),tileMask);
// cor do digito: given escuro, user azul
const diR=mix(fc(0.20),fc(0.17),isGiven), diG=mix(fc(0.50),fc(0.22),isGiven), diB=mix(fc(1.0),fc(0.35),isGiven);
cr=mix(cr,diR,ink); cg=mix(cg,diG,ink); cb=mix(cb,diB,ink);
// ---- empacotar ----
const r255=tri(fmn(fc(255),fmx(F0,mul(cl01(cr),fc(255)))));
const g255=tri(fmn(fc(255),fmx(F0,mul(cl01(cg),fc(255)))));
const b255=tri(fmn(fc(255),fmx(F0,mul(cl01(cb),fc(255)))));
const packed=ib('+',ib('*',r255,ic(65536)),ib('+',ib('*',g255,ic(256)),b255));
ret(packed);

// ---- depurador: interpreta o grafo nos mesmos opcodes ----
if(process.env.DBG){
  const P=process.env.DBG.split(',').map(Number); // x,y,t,w,h,d0,d1,d2,sel,giv
  const v=new Array(tt.length).fill(0); let RET=null;
  for(const I of ins){const k=I[0],d=I[1];
    if(k===1) v[d]=parseFloat(I[2]);
    else if(k===5) v[d]=P[I[3]];
    else if(k===8){const o=I[2],L=v[I[3]],R=v[I[4]]; v[d]=o==='+'?L+R:o==='-'?L-R:o==='*'?L*R:L/R;}
    else if(k===15){const x=v[I[3]],a=I[2]; v[d]=a===1?Math.trunc(x):a===2?Math.sqrt(x):a===3?Math.sin(x):a===4?Math.cos(x):a===5?Math.exp(x):a===6?Math.log(x):a===7?Math.floor(x):Math.abs(x);}
    else if(k===17){v[d]=I[2]===0?Math.min(v[I[3]],v[I[4]]):Math.max(v[I[3]],v[I[4]]);}
    else if(k===41) RET=v[I[2]];}
  console.error('temps',tt.length,'x',v[x],'y',v[y],'s',v[s],'nx',v[nx],'ny',v[ny],'aw',v[aw],'SB',v[SB],'bx0',v[bx0],'lx',v[lx],'ly',v[ly],'inB',v[inB],'bgr',v[bgr]);
  process.exit(0);
}
// ---- emitir dump ----
let out=': px ffffffffff>i L0 L1 L2 L3 L4 L5 L6 L7 L8 L9\n0\n';
out+=tt.length+' '+tt.join(' ')+'\n';
for(const I of ins) out+=I.join(' ')+'\n';
process.stdout.write(out);
