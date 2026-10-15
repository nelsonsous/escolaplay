// onda-boot: compilador de arranque (estagio 0) da linguagem Onda -> C.
// So existe para compilar ondac.onda uma vez; depois a Onda compila-se a si propria.
use std::io::{Read, Write};

const PRE: &[u8] = include_bytes!("../../rt/prelude.c");
const MAINW: &[u8] = b"int main(int c,char**v){oinit(c,v);I r=f_main();oflush();return (int)r;}\n";

#[derive(Clone, Copy, PartialEq)]
enum K { Id, Int, Flt, Str, Chr, Op }

#[derive(Clone, Copy)]
struct T { k: K, s: usize, l: usize }

struct Fun { name: usize, sig: usize, np: usize, ret: u8, p0: usize, body: usize }

struct C { src: Vec<u8>, t: Vec<T>, f: Vec<Fun>, pos: usize, loc: Vec<(usize, u8)>, tmp: Vec<u8>, o: Vec<u8> }

fn ws(c: u8) -> bool { matches!(c, b' ' | b'\t' | b'\n' | b'\r') }
fn tyn(y: u8) -> &'static str { if y == 0 { "I" } else { "F" } }
fn zero(y: u8) -> &'static str { if y == 0 { "0" } else { "0.0" } }
fn mname(c: u8) -> &'static str { ["(F)", "(I)", "sqrt", "sin", "cos", "exp", "log", "floor", "fabs", "pow", "atan2"][c as usize] }

impl C {
    fn tx(&self, i: usize) -> &[u8] { let t = self.t[i]; &self.src[t.s..t.s + t.l] }
    fn txv(&self, i: usize) -> Vec<u8> { self.tx(i).to_vec() }
    fn err(&self, m: &str) -> ! {
        let mut so = std::io::stdout();
        let _ = write!(so, "\n#error onda: {} (token {})\n", m, self.pos);
        let _ = so.flush();
        std::process::exit(1)
    }
    fn e(&mut self, s: &str) { self.o.extend_from_slice(s.as_bytes()); }
    fn eb(&mut self, s: &[u8]) { self.o.extend_from_slice(s); }
    fn nt(&mut self, y: u8) -> usize { self.tmp.push(y); self.tmp.len() - 1 }
    fn fpt(&self, k: usize, j: usize) -> u8 { if self.src[self.t[self.f[k].sig].s + j] == b'f' { 1 } else { 0 } }
    fn ckint(&self, t: usize) { if self.tmp[t] != 0 { self.err("esperava inteiro"); } }
    fn ckflt(&self, t: usize) { if self.tmp[t] != 1 { self.err("esperava real"); } }
    fn ckc(&self, t: usize) { if self.tmp[t] != 0 { self.err("condicao deve ser inteira"); } }

    fn lex(&mut self) {
        let n = self.src.len();
        let mut i = 0;
        while i < n {
            let c = self.src[i];
            if ws(c) { i += 1; continue; }
            if c == b'#' { while i < n && self.src[i] != b'\n' { i += 1; } continue; }
            let s = i;
            if c == b'"' {
                i += 1;
                while i < n && self.src[i] != b'"' { if self.src[i] == b'\\' { i += 1; } i += 1; }
                if i >= n { self.err("texto sem fim"); }
                i += 1;
                self.t.push(T { k: K::Str, s, l: i - s });
                continue;
            }
            while i < n && !ws(self.src[i]) { i += 1; }
            let l = i - s;
            let d = |c: u8| c.is_ascii_digit();
            let k = if d(c) || (c == b'-' && l > 1 && d(self.src[s + 1])) {
                if self.src[s..i].contains(&b'.') { K::Flt } else { K::Int }
            } else if c == b'\'' { K::Chr } else if c.is_ascii_lowercase() || c == b'_' { K::Id } else { K::Op };
            self.t.push(T { k, s, l });
        }
    }

    fn ffun(&self, i: usize) -> Option<usize> { (0..self.f.len()).find(|&k| self.tx(self.f[k].name) == self.tx(i)) }
    fn floc(&self, i: usize) -> Option<usize> { (0..self.loc.len()).find(|&j| self.tx(self.loc[j].0) == self.tx(i)) }

    fn defn(&mut self, i: usize) -> usize {
        if i + 2 >= self.t.len() { self.pos = i; self.err("definicao incompleta"); }
        let sig = self.txv(i + 2);
        let mut g = 0;
        while g < sig.len() && sig[g] != b'>' { g += 1; }
        if sig.len() != g + 2 { self.pos = i + 2; self.err("assinatura invalida"); }
        for j in 0..g { if sig[j] != b'i' && sig[j] != b'f' { self.pos = i + 2; self.err("tipo invalido"); } }
        let rt = sig[g + 1];
        if rt != b'i' && rt != b'f' { self.pos = i + 2; self.err("tipo invalido"); }
        if self.t[i + 1].k != K::Id { self.pos = i + 1; self.err("nome invalido"); }
        if self.ffun(i + 1).is_some() { self.pos = i + 1; self.err("funcao repetida"); }
        self.f.push(Fun { name: i + 1, sig: i + 2, np: g, ret: if rt == b'f' { 1 } else { 0 }, p0: i + 3, body: i + 3 + g });
        i + 3 + g
    }

    fn pre(&mut self) {
        let mut i = 0;
        while i < self.t.len() {
            if self.tx(i) == b":" { i = self.defn(i); } else {
                if self.f.is_empty() { self.pos = i; self.err("fora de definicao"); }
                i += 1;
            }
        }
    }

    fn sighdr(&self, k: usize) -> Vec<u8> {
        let f = &self.f[k];
        let mut s = format!("static {} f_", tyn(f.ret)).into_bytes();
        s.extend_from_slice(self.tx(f.name));
        s.push(b'(');
        if f.np == 0 { s.extend_from_slice(b"void"); }
        for j in 0..f.np {
            if j > 0 { s.push(b','); }
            s.extend_from_slice(format!("{} v_", tyn(self.fpt(k, j))).as_bytes());
            s.extend_from_slice(self.tx(f.p0 + j));
        }
        s.push(b')');
        s
    }

    fn func(&mut self, k: usize) -> Vec<u8> {
        self.loc.clear(); self.tmp.clear(); self.o.clear();
        let (np, p0, body, ret) = (self.f[k].np, self.f[k].p0, self.f[k].body, self.f[k].ret);
        for j in 0..np { let y = self.fpt(k, j); self.loc.push((p0 + j, y)); }
        self.pos = body;
        let r = self.cx();
        if self.tmp[r] != ret { self.err("tipo de retorno errado"); }
        if self.pos < self.t.len() && self.tx(self.pos) != b":" { self.err("tokens a mais"); }
        self.e(&format!("return t{};\n}}\n", r));
        let mut h = self.sighdr(k);
        h.extend_from_slice(b"{\n");
        for i in 0..self.tmp.len() { h.extend_from_slice(format!("{} t{}={};\n", tyn(self.tmp[i]), i, zero(self.tmp[i])).as_bytes()); }
        for j in np..self.loc.len() {
            let (n, y) = self.loc[j];
            h.extend_from_slice(format!("{} v_", tyn(y)).as_bytes());
            h.extend_from_slice(self.tx(n));
            h.extend_from_slice(format!("={};\n", zero(y)).as_bytes());
        }
        h.extend_from_slice(&self.o);
        h
    }

    fn cx(&mut self) -> usize {
        if self.pos >= self.t.len() { self.err("fim inesperado"); }
        let i = self.pos;
        self.pos += 1;
        let t = self.t[i];
        match t.k {
            K::Int => self.lit(i, 0),
            K::Flt => self.lit(i, 1),
            K::Chr => {
                if t.l < 2 { self.err("caracter invalido"); }
                let r = self.nt(0);
                let v = self.src[t.s + 1];
                self.e(&format!("t{}={};\n", r, v));
                r
            }
            K::Str => self.cstr(i),
            K::Id => self.cid(i),
            K::Op => self.cop(i),
        }
    }

    fn lit(&mut self, i: usize, y: u8) -> usize {
        let r = self.nt(y);
        self.e(&format!("t{}=", r));
        let x = self.txv(i);
        self.eb(&x);
        self.e(";\n");
        r
    }

    fn cstr(&mut self, i: usize) -> usize {
        self.e("os(\"");
        let x = self.txv(i);
        for &c in &x[1..x.len() - 1] {
            match c { b'\n' => self.e("\\n"), b'\t' => self.e("\\t"), b'\r' => self.e("\\r"), _ => self.o.push(c) }
        }
        self.e("\");\n");
        let r = self.nt(0);
        self.e(&format!("t{}=0;\n", r));
        r
    }

    fn cargs(&mut self, k: usize, sk: usize) -> Vec<usize> {
        let mut a = vec![];
        for j in sk..self.f[k].np {
            let t = self.cx();
            if self.tmp[t] != self.fpt(k, j) { self.err("argumento com tipo errado"); }
            a.push(t);
        }
        a
    }
    fn eargs(&mut self, a: &[usize], ld: bool) {
        for (j, &t) in a.iter().enumerate() { if j > 0 || ld { self.e(","); } self.e(&format!("t{}", t)); }
    }
    fn ccall(&mut self, k: usize) -> usize {
        let a = self.cargs(k, 0);
        let r = self.nt(self.f[k].ret);
        self.e(&format!("t{}=f_", r));
        let n = self.txv(self.f[k].name);
        self.eb(&n);
        self.e("(");
        self.eargs(&a, false);
        self.e(");\n");
        r
    }
    fn cid(&mut self, i: usize) -> usize {
        if let Some(j) = self.floc(i) {
            let y = self.loc[j].1;
            let r = self.nt(y);
            self.e(&format!("t{}=v_", r));
            let x = self.txv(i);
            self.eb(&x);
            self.e(";\n");
            return r;
        }
        match self.ffun(i) { Some(k) => self.ccall(k), None => { self.pos = i; self.err("nome desconhecido") } }
    }

    fn cop(&mut self, i: usize) -> usize {
        let x = self.txv(i);
        match &x[..] {
            b"+" | b"-" | b"*" | b"/" => self.cbin(i, 2),
            b"%" | b"&" | b"|" | b"^" | b"<<" | b">>" => self.cbin(i, 0),
            b"<" | b">" | b"<=" | b">=" | b"==" | b"!=" => self.ccmp(i),
            b"&&" => self.cand(),
            b"||" => self.cor(),
            b"~" => self.cnot(),
            b"F" => self.cun(0, 0, 1),
            b"I" => self.cun(1, 1, 0),
            b"Sq" => self.cun(2, 1, 1),
            b"Sn" => self.cun(3, 1, 1),
            b"Cs" => self.cun(4, 1, 1),
            b"Ex" => self.cun(5, 1, 1),
            b"Lg" => self.cun(6, 1, 1),
            b"Fl" => self.cun(7, 1, 1),
            b"Ab" => self.cun(8, 1, 1),
            b"Pw" => self.cbf(9),
            b"At" => self.cbf(10),
            b"Mn" => self.cmm(false),
            b"Mx" => self.cmm(true),
            b"?" => self.cif(),
            b"W" => self.cwh(),
            b"{" => self.cblk(),
            b"=" => self.cset(),
            b"@" => self.cld(),
            b"!" => self.cst(),
            b"@f" => self.cldf(),
            b"!f" => self.cstf(),
            b"A" => self.calc(),
            b"P" => self.cput(),
            b"R" => self.crd(),
            b"N" => self.cnum(),
            b"G" => self.cgf(),
            b"O" => self.csnk(),
            b"Ac" => self.cac(),
            b"Av" => self.cav(),
            b"X" => self.cex(),
            b"T" => self.ctm(),
            b"E" => self.ce(),
            b"S" => self.cs(),
            b"D" => self.cd(),
            _ => { self.pos = i; self.err("operacao desconhecida") }
        }
    }

    fn cbin(&mut self, i: usize, m: u8) -> usize {
        let a = self.cx();
        let b = self.cx();
        let y = self.tmp[a];
        if y != self.tmp[b] { self.err("tipos diferentes"); }
        if m == 0 && y != 0 { self.err("operacao so para inteiros"); }
        let r = self.nt(y);
        let x = self.txv(i);
        self.e(&format!("t{}=t{}", r, a));
        self.eb(&x);
        self.e(&format!("t{};\n", b));
        r
    }
    fn ccmp(&mut self, i: usize) -> usize {
        let a = self.cx();
        let b = self.cx();
        if self.tmp[a] != self.tmp[b] { self.err("tipos diferentes"); }
        let r = self.nt(0);
        let x = self.txv(i);
        self.e(&format!("t{}=(t{}", r, a));
        self.eb(&x);
        self.e(&format!("t{})?1:0;\n", b));
        r
    }
    fn cand(&mut self) -> usize {
        let a = self.cx(); self.ckc(a);
        let r = self.nt(0);
        self.e(&format!("t{}=0;\nif(t{}!=0){{\n", r, a));
        let b = self.cx(); self.ckc(b);
        self.e(&format!("t{}=(t{}!=0)?1:0;\n}}\n", r, b));
        r
    }
    fn cor(&mut self) -> usize {
        let a = self.cx(); self.ckc(a);
        let r = self.nt(0);
        self.e(&format!("t{}=1;\nif(t{}==0){{\n", r, a));
        let b = self.cx(); self.ckc(b);
        self.e(&format!("t{}=(t{}!=0)?1:0;\n}}\n", r, b));
        r
    }
    fn cnot(&mut self) -> usize {
        let a = self.cx(); self.ckc(a);
        let r = self.nt(0);
        self.e(&format!("t{}=(t{}==0)?1:0;\n", r, a));
        r
    }
    fn cun(&mut self, c: u8, ti: u8, to: u8) -> usize {
        let a = self.cx();
        if self.tmp[a] != ti { self.err(if ti == 1 { "esperava real" } else { "esperava inteiro" }); }
        let r = self.nt(to);
        self.e(&format!("t{}={}(t{});\n", r, mname(c), a));
        r
    }
    fn cbf(&mut self, c: u8) -> usize {
        let a = self.cx();
        let b = self.cx();
        self.ckflt(a); self.ckflt(b);
        let r = self.nt(1);
        self.e(&format!("t{}={}(t{},t{});\n", r, mname(c), a, b));
        r
    }
    fn cmm(&mut self, mx: bool) -> usize {
        let a = self.cx();
        let b = self.cx();
        if self.tmp[a] != self.tmp[b] { self.err("tipos diferentes"); }
        let r = self.nt(self.tmp[a]);
        self.e(&format!("t{}=(t{}{}t{})?t{}:t{};\n", r, a, if mx { ">" } else { "<" }, b, a, b));
        r
    }
    fn cif(&mut self) -> usize {
        let c = self.cx(); self.ckc(c);
        let r = self.nt(0);
        self.e(&format!("if(t{}!=0){{\n", c));
        let a = self.cx();
        self.e(&format!("t{}=t{};\n}}else{{\n", r, a));
        let b = self.cx();
        self.e(&format!("t{}=t{};\n}}\n", r, b));
        if self.tmp[a] != self.tmp[b] { self.err("ramos com tipos diferentes"); }
        self.tmp[r] = self.tmp[a];
        r
    }
    fn cwh(&mut self) -> usize {
        self.e("while(1){\n");
        let c = self.cx(); self.ckc(c);
        self.e(&format!("if(t{}==0)break;\n", c));
        self.cx();
        self.e("}\n");
        let r = self.nt(0);
        self.e(&format!("t{}=0;\n", r));
        r
    }
    fn cblk(&mut self) -> usize {
        let mut r = usize::MAX;
        loop {
            if self.pos >= self.t.len() { self.err("falta }"); }
            if self.tx(self.pos) == b"}" { break; }
            r = self.cx();
        }
        self.pos += 1;
        if r == usize::MAX { r = self.nt(0); self.e(&format!("t{}=0;\n", r)); }
        r
    }
    fn cset(&mut self) -> usize {
        let n = self.pos;
        if n >= self.t.len() || self.t[n].k != K::Id { self.err("= precisa de nome"); }
        self.pos += 1;
        let e = self.cx();
        let y = self.tmp[e];
        match self.floc(n) {
            None => self.loc.push((n, y)),
            Some(j) => { if self.loc[j].1 != y { self.err("tipo de variavel mudou"); } }
        }
        self.e("v_");
        let x = self.txv(n);
        self.eb(&x);
        self.e(&format!("=t{};\n", e));
        e
    }
    fn cld(&mut self) -> usize { let p = self.cx(); self.ckint(p); let r = self.nt(0); self.e(&format!("t{}=M[t{}];\n", r, p)); r }
    fn cst(&mut self) -> usize { let p = self.cx(); let v = self.cx(); self.ckint(p); self.ckint(v); self.e(&format!("M[t{}]=t{};\n", p, v)); v }
    fn cldf(&mut self) -> usize { let p = self.cx(); self.ckint(p); let r = self.nt(1); self.e(&format!("t{}=ldf(t{});\n", r, p)); r }
    fn cstf(&mut self) -> usize { let p = self.cx(); let v = self.cx(); self.ckint(p); self.ckflt(v); self.e(&format!("stf(t{},t{});\n", p, v)); v }
    fn calc(&mut self) -> usize { let n = self.cx(); self.ckint(n); let r = self.nt(0); self.e(&format!("t{}=oa(t{});\n", r, n)); r }
    fn cput(&mut self) -> usize { let x = self.cx(); self.ckint(x); self.e(&format!("op(t{});\n", x)); x }
    fn crd(&mut self) -> usize { let r = self.nt(0); self.e(&format!("t{}=ir();\n", r)); r }
    fn cnum(&mut self) -> usize { let x = self.cx(); self.ckint(x); self.e(&format!("on(t{});\n", x)); x }
    fn cgf(&mut self) -> usize { let x = self.cx(); self.ckflt(x); self.e(&format!("og(t{});\n", x)); x }
    fn csnk(&mut self) -> usize { let p = self.cx(); self.ckint(p); self.e(&format!("osink(t{});\n", p)); p }
    fn cac(&mut self) -> usize { let r = self.nt(0); self.e(&format!("t{}=AC;\n", r)); r }
    fn cav(&mut self) -> usize { let a = self.cx(); let b = self.cx(); self.ckint(a); self.ckint(b); let r = self.nt(0); self.e(&format!("t{}=av(t{},t{});\n", r, a, b)); r }
    fn cex(&mut self) -> usize { let c = self.cx(); self.ckint(c); self.e(&format!("oexit(t{});\n", c)); c }
    fn ctm(&mut self) -> usize { let r = self.nt(0); self.e(&format!("t{}=onow();\n", r)); r }

    fn fref(&mut self, m: usize) -> usize {
        let i = self.pos;
        if i >= self.t.len() { self.err("falta funcao"); }
        self.pos += 1;
        let k = if self.t[i].k == K::Id { self.ffun(i) } else { None };
        let k = match k { Some(k) => k, None => { self.pos = i; self.err("esperava funcao") } };
        if self.f[k].np < m { self.err("funcao com poucos parametros"); }
        k
    }
    fn ce(&mut self) -> usize {
        let d = self.cx();
        let n = self.cx();
        self.ckint(d); self.ckint(n);
        let k = self.fref(1);
        if self.fpt(k, 0) != 0 { self.err("indice deve ser inteiro"); }
        let a = self.cargs(k, 1);
        self.e(&format!("#pragma omp parallel for\nfor(I i=0;i<t{};i++)", n));
        let nm = self.txv(self.f[k].name);
        if self.f[k].ret == 1 {
            self.e(&format!("stf(t{}+i,f_", d)); self.eb(&nm); self.e("(i"); self.eargs(&a, true); self.e("));\n");
        } else {
            self.e(&format!("M[t{}+i]=f_", d)); self.eb(&nm); self.e("(i"); self.eargs(&a, true); self.e(");\n");
        }
        d
    }
    fn cs(&mut self) -> usize {
        let n = self.cx();
        self.ckint(n);
        let k = self.fref(1);
        if self.fpt(k, 0) != 0 { self.err("indice deve ser inteiro"); }
        let a = self.cargs(k, 1);
        let y = self.f[k].ret;
        let r = self.nt(y);
        self.e(&format!("t{}={};\n#pragma omp parallel for reduction(+:t{})\nfor(I i=0;i<t{};i++)t{}+=f_", r, zero(y), r, n, r));
        let nm = self.txv(self.f[k].name);
        self.eb(&nm); self.e("(i"); self.eargs(&a, true); self.e(");\n");
        r
    }
    fn cd(&mut self) -> usize {
        let w = self.cx();
        let h = self.cx();
        self.ckint(w); self.ckint(h);
        let k = self.fref(2);
        if self.fpt(k, 0) != self.fpt(k, 1) || self.f[k].ret != 0 { self.err("funcao de pixel invalida"); }
        let a = self.cargs(k, 2);
        let r = self.nt(0);
        self.e(&format!("t{}=0;\n{{unsigned char*g=oimg0(t{},t{});\n#pragma omp parallel for\nfor(I y=0;y<t{};y++)for(I x=0;x<t{};x++){{I c=f_", r, w, h, h, w));
        let nm = self.txv(self.f[k].name);
        self.eb(&nm);
        self.e(if self.fpt(k, 0) == 1 { "((F)x,(F)y" } else { "(x,y" });
        self.eargs(&a, true);
        self.e(&format!(");unsigned char*q=g+3*(y*t{}+x);q[0]=(unsigned char)(c>>16);q[1]=(unsigned char)(c>>8);q[2]=(unsigned char)c;}}\noimg1(g,t{},t{});}}\n", w, w, h));
        r
    }
}

fn main() {
    let mut src = Vec::new();
    std::io::stdin().read_to_end(&mut src).unwrap();
    let mut c = C { src, t: vec![], f: vec![], pos: 0, loc: vec![], tmp: vec![], o: vec![] };
    c.lex();
    c.pre();
    let ok = (0..c.f.len()).any(|k| c.tx(c.f[k].name) == b"main" && c.f[k].np == 0 && c.f[k].ret == 0);
    if !ok { c.err("falta : main >i"); }
    let mut texts = vec![];
    for k in 0..c.f.len() { texts.push(c.func(k)); }
    let mut out = Vec::new();
    out.extend_from_slice(PRE);
    for k in 0..c.f.len() { out.extend(c.sighdr(k)); out.extend_from_slice(b";\n"); }
    for t in texts { out.extend(t); }
    out.extend_from_slice(MAINW);
    std::io::stdout().write_all(&out).unwrap();
}
