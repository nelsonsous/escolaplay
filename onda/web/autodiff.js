// Autodiff genérico, modo reverso, source-to-source (a via do AUTODIFF.md §4).
// DAG com hash-consing (CSE); diferencia qualquer expressão sobre +−×/ exp log sin cos relu neg.
// Fase 1: motor numérico + verificação contra diferenças finitas.
let nodes=[], cons=new Map();
function node(op,a=-1,b=-1,val=null){ const key=op+'|'+a+'|'+b+'|'+val; if(cons.has(key))return cons.get(key);
  const i=nodes.length; nodes.push({op,a,b,val}); cons.set(key,i); return i; }
const Var=name=>node('var',-1,-1,name);
const Con=c=>node('con',-1,-1,c);
const add=(a,b)=>node('+',a,b), sub=(a,b)=>node('-',a,b), mul=(a,b)=>node('*',a,b), div=(a,b)=>node('/',a,b);
const exp=a=>node('exp',a), log=a=>node('log',a), sin=a=>node('sin',a), cos=a=>node('cos',a);
const relu=a=>node('relu',a), neg=a=>node('neg',a), lrelu=a=>node('lrelu',a);

// avaliação numérica (memo)
function evalAll(env){ const v=new Array(nodes.length);
  for(let i=0;i<nodes.length;i++){ const n=nodes[i];
    switch(n.op){
      case 'con': v[i]=n.val; break;
      case 'var': v[i]=env[n.val]; break;
      case '+': v[i]=v[n.a]+v[n.b]; break;
      case '-': v[i]=v[n.a]-v[n.b]; break;
      case '*': v[i]=v[n.a]*v[n.b]; break;
      case '/': v[i]=v[n.a]/v[n.b]; break;
      case 'exp': v[i]=Math.exp(v[n.a]); break;
      case 'log': v[i]=Math.log(v[n.a]); break;
      case 'sin': v[i]=Math.sin(v[n.a]); break;
      case 'cos': v[i]=Math.cos(v[n.a]); break;
      case 'relu': v[i]=v[n.a]>0?v[n.a]:0; break;
      case 'lrelu': v[i]=v[n.a]>0?v[n.a]:0.01*v[n.a]; break;
      case 'neg': v[i]=-v[n.a]; break;
    } } return v; }

// modo reverso: gradiente de out em ordem a todas as Var
function grad(out, env){ const v=evalAll(env); const adj=new Array(nodes.length).fill(0); adj[out]=1;
  for(let i=nodes.length-1;i>=0;i--){ const n=nodes[i], g=adj[i]; if(g===0&&n.op!=='var') {/*ainda propaga 0*/}
    switch(n.op){
      case '+': adj[n.a]+=g; adj[n.b]+=g; break;
      case '-': adj[n.a]+=g; adj[n.b]-=g; break;
      case '*': adj[n.a]+=g*v[n.b]; adj[n.b]+=g*v[n.a]; break;
      case '/': adj[n.a]+=g/v[n.b]; adj[n.b]-=g*v[n.a]/(v[n.b]*v[n.b]); break;
      case 'exp': adj[n.a]+=g*v[i]; break;
      case 'log': adj[n.a]+=g/v[n.a]; break;
      case 'sin': adj[n.a]+=g*Math.cos(v[n.a]); break;
      case 'cos': adj[n.a]-=g*Math.sin(v[n.a]); break;
      case 'relu': adj[n.a]+=g*(v[n.a]>0?1:0); break;
      case 'lrelu': adj[n.a]+=g*(v[n.a]>0?1:0.01); break;
      case 'neg': adj[n.a]-=g; break;
    } }
  const out2={}; for(let i=0;i<nodes.length;i++) if(nodes[i].op==='var') out2[nodes[i].val]=adj[i]; return out2; }

// ---- emissor source-to-source: gera uma função Onda que calcula o gradiente (CSE por temp) ----
function fl(x){ if(Number.isInteger(x)) return x+'.0'; let s=x.toFixed(12).replace(/0+$/,''); if(s.endsWith('.'))s+='0'; return s; }
function emitOnda(fnname,out,varOrder,gradVars,extra){
  extra=extra||[]; const t=i=>'t'+i, L=[];
  L.push(': '+fnname+' i'+'f'.repeat(varOrder.length)+'>i gp '+varOrder.join(' ')+' {');
  for(let i=0;i<nodes.length;i++){ const n=nodes[i]; let e;
    switch(n.op){
      case 'con': e=fl(n.val); break;  case 'var': e=n.val; break;
      case '+': e='+ '+t(n.a)+' '+t(n.b); break;  case '-': e='- '+t(n.a)+' '+t(n.b); break;
      case '*': e='* '+t(n.a)+' '+t(n.b); break;  case '/': e='/ '+t(n.a)+' '+t(n.b); break;
      case 'exp': e='Ex '+t(n.a); break;  case 'log': e='Lg '+t(n.a); break;
      case 'sin': e='Sn '+t(n.a); break;  case 'cos': e='Cs '+t(n.a); break;
      case 'relu': e='? > '+t(n.a)+' 0.0 '+t(n.a)+' 0.0'; break;
      case 'lrelu': e='? > '+t(n.a)+' 0.0 '+t(n.a)+' * 0.01 '+t(n.a); break;
      case 'neg': e='* -1.0 '+t(n.a); break;
    }
    L.push('  = '+t(i)+' '+e);
  }
  const contrib=nodes.map(()=>[]); contrib[out].push('1.0');
  const sum=a=>{ if(!a.length)return '0.0'; let s=a[0]; for(let k=1;k<a.length;k++)s='+ '+a[k]+' '+s; return s; };
  for(let i=nodes.length-1;i>=0;i--){ const n=nodes[i], ai='a'+i;
    L.push('  = '+ai+' '+sum(contrib[i]));
    switch(n.op){
      case '+': contrib[n.a].push(ai); contrib[n.b].push(ai); break;
      case '-': contrib[n.a].push(ai); contrib[n.b].push('* -1.0 '+ai); break;
      case '*': contrib[n.a].push('* '+ai+' '+t(n.b)); contrib[n.b].push('* '+ai+' '+t(n.a)); break;
      case '/': contrib[n.a].push('/ '+ai+' '+t(n.b)); contrib[n.b].push('* -1.0 / * '+ai+' '+t(n.a)+' * '+t(n.b)+' '+t(n.b)); break;
      case 'exp': contrib[n.a].push('* '+ai+' '+t(i)); break;
      case 'log': contrib[n.a].push('/ '+ai+' '+t(n.a)); break;
      case 'sin': contrib[n.a].push('* '+ai+' Cs '+t(n.a)); break;
      case 'cos': contrib[n.a].push('* -1.0 * '+ai+' Sn '+t(n.a)); break;
      case 'relu': contrib[n.a].push('* '+ai+' ? > '+t(n.a)+' 0.0 1.0 0.0'); break;
      case 'lrelu': contrib[n.a].push('* '+ai+' ? > '+t(n.a)+' 0.0 1.0 0.01'); break;
      case 'neg': contrib[n.a].push('* -1.0 '+ai); break;
    }
  }
  for(const gv of gradVars){ const ni=cons.get('var|-1|-1|'+gv.name); L.push('  !f + gp '+gv.idx+' a'+ni); }
  for(const ex of extra){ L.push('  !f + gp '+ex.idx+' '+t(ex.node)); }
  L.push('  0 }');
  return L.join('\n');
}

// ---- verificação: 4 funções aleatórias, gradiente reverso vs diferenças finitas ----
function reset(){ nodes=[]; cons=new Map(); }
function fdcheck(buildFn, vars){ reset(); const out=buildFn();
  const env={}; for(const nm of vars) env[nm]=Math.random()*1.6-0.8;
  const g=grad(out, env);
  let maxe=0; const e=1e-5;
  for(const nm of vars){ const ep={...env}; ep[nm]+=e; const vp=evalAll(ep)[out];
    const em={...env}; em[nm]-=e; const vm=evalAll(em)[out]; const fd=(vp-vm)/(2*e);
    maxe=Math.max(maxe, Math.abs(g[nm]-fd)); }
  return maxe; }

const tests=[
  ['a*b + exp(a) - log(b+2)', ()=>sub(add(mul(Var('a'),Var('b')),exp(Var('a'))),log(add(Var('b'),Con(2)))), ['a','b']],
  ['sin(a*b)/ (1+cos(a))', ()=>div(sin(mul(Var('a'),Var('b'))),add(Con(1),cos(Var('a')))), ['a','b']],
  ['relu(a*2-b)*b + relu(b)', ()=>add(mul(relu(sub(mul(Var('a'),Con(2)),Var('b'))),Var('b')),relu(Var('b'))), ['a','b']],
  ['sigmoid-like 1/(1+exp(-(a+b*c)))', ()=>div(Con(1),add(Con(1),exp(neg(add(Var('a'),mul(Var('b'),Var('c'))))))), ['a','b','c']],
];
if(require.main===module){ let worst=0;
  for(const [name,fn,vars] of tests){ const e=fdcheck(fn,vars); worst=Math.max(worst,e);
    console.log(name.padEnd(40), 'erro vs dif.finitas:', e.toExponential(2)); }
  console.log(worst<1e-4 ? 'MOTOR AUTODIFF CORRETO ✓' : 'DIVERGE'); }
module.exports={node,Var,Con,add,sub,mul,div,exp,log,sin,cos,relu,neg,lrelu,grad,evalAll,emitOnda,get nodes(){return nodes;},reset};
