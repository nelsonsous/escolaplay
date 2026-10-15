#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
typedef long long I;
typedef double F;
#ifndef ONDA_MEM
#define ONDA_MEM 33554432LL
#endif
static I*M;
static I HP=64,OS=0;
static int AC;
static char**AV;
static unsigned char OB[65536],IB[65536];
static int OL=0,IL=0,IP=0;
static void oflush(void){if(OL)fwrite(OB,1,(size_t)OL,stdout);OL=0;fflush(stdout);}
static void op(I b){if(OS){M[M[OS]++]=b;return;}OB[OL++]=(unsigned char)b;if(OL==65536){fwrite(OB,1,65536,stdout);OL=0;}}
static void os(const char*s){while(*s)op((unsigned char)*s++);}
static void on(I n){char b[24];int i=0;unsigned long long u=n<0?0ULL-(unsigned long long)n:(unsigned long long)n;if(n<0)op(45);do{b[i++]=(char)(48+u%10);u/=10;}while(u);while(i)op(b[--i]);}
static void og(F x){char b[40];snprintf(b,40,"%.15g",x);os(b);}
static I ir(void){if(IP==IL){IL=(int)fread(IB,1,65536,stdin);IP=0;if(IL<=0){IL=0;return -1;}}return IB[IP++];}
static void odie(const char*m){oflush();fputs(m,stderr);exit(2);}
static I oa(I n){I p=HP;HP+=n;if(n<0||HP>ONDA_MEM)odie("onda: memoria esgotada\n");return p;}
static F ldf(I p){F d;memcpy(&d,M+p,8);return d;}
static void stf(I p,F d){memcpy(M+p,&d,8);}
static void osink(I p){OS=p;}
static I av(I i,I j){I k;const char*s;if(i<0||i>=AC||j<0)return 0;s=AV[i];for(k=0;k<j;k++)if(!s[k])return 0;return (unsigned char)s[j];}
static void oexit(I c){oflush();exit((int)c);}
static I onow(void){struct timespec t;timespec_get(&t,TIME_UTC);return (I)t.tv_sec*1000000+(I)(t.tv_nsec/1000);}
static unsigned char*oimg0(I w,I h){unsigned char*g=(unsigned char*)malloc((size_t)(w*h*3+1));if(!g)odie("onda: memoria esgotada\n");return g;}
static void oimg1(unsigned char*g,I w,I h){I k;os("P6\n");on(w);op(32);on(h);os("\n255\n");for(k=0;k<w*h*3;k++)op(g[k]);free(g);}
static void oinit(int c,char**v){AC=c;AV=v;M=(I*)calloc((size_t)ONDA_MEM,8);if(!M)odie("onda: memoria esgotada\n");}
static I f_prel(void);
static I f_k2(I v_a,I v_b);
static I f_isws(I v_c);
static I f_isdg(I v_c);
static I f_tk(I v_i);
static I f_tkk(I v_i);
static I f_tks(I v_i);
static I f_tkl(I v_i);
static I f_tc(I v_i,I v_j);
static I f_tcode(I v_i);
static I f_teq(I v_a,I v_b);
static I f_ebeg(void);
static I f_eend(void);
static I f_ew(I v_s,I v_l);
static I f_etx(I v_i);
static I f_et(I v_t);
static I f_eq(I v_r);
static I f_isjs(void);
static I f_ety(I v_y);
static I f_ez(I v_y);
static I f_cpu(void);
static I f_hasdot(I v_s,I v_l);
static I f_kindof(I v_s,I v_l);
static I f_addtok(I v_k,I v_s,I v_l);
static I f_lex(void);
static I f_fe(I v_k,I v_j);
static I f_fpt(I v_k,I v_j);
static I f_ffun(I v_i);
static I f_defn(I v_i);
static I f_pre(void);
static I f_lnm(I v_j);
static I f_lty(I v_j);
static I f_addl(I v_n,I v_y);
static I f_floc(I v_i);
static I f_nt(I v_y);
static I f_tty(I v_t);
static I f_edge(I v_k);
static I f_ir(I v_k,I v_d,I v_a,I v_b,I v_c,I v_x,I v_y);
static I f_sighdr(I v_k);
static I f_cfun(I v_k);
static I f_tfun(I v_k);
static I f_lit(I v_i,I v_y);
static I f_clit(I v_i);
static I f_cstr(I v_i);
static I f_cargs(I v_k,I v_sk);
static I f_eargs(I v_a,I v_n,I v_ld);
static I f_ccall(I v_k);
static I f_cid(I v_i);
static I f_cx(void);
static I f_isar(I v_o);
static I f_isbi(I v_o);
static I f_iscm(I v_o);
static I f_ckint(I v_t);
static I f_ckflt(I v_t);
static I f_ckc(I v_t);
static I f_cbin(I v_i,I v_m);
static I f_ccmp(I v_i);
static I f_cand(void);
static I f_cor(void);
static I f_cnot(void);
static I f_cun(I v_c,I v_ti,I v_to);
static I f_cbf(I v_c);
static I f_cmm(I v_m);
static I f_cif(void);
static I f_cwh(void);
static I f_cblk(void);
static I f_cset(void);
static I f_mname(I v_c);
static I f_escs(I v_i);
static I f_emi(I v_p);
static I f_cld(void);
static I f_cst(void);
static I f_cldf(void);
static I f_cstf(void);
static I f_calc(void);
static I f_cput(void);
static I f_crd(void);
static I f_cnum(void);
static I f_cgf(void);
static I f_csnk(void);
static I f_cac(void);
static I f_cav(void);
static I f_cex(void);
static I f_ctm(void);
static I f_fref(I v_m);
static I f_ce(void);
static I f_cs(void);
static I f_cd(void);
static I f_cop(I v_i);
static I f_rdall(void);
static I f_ismain(I v_k);
static I f_argeq(I v_k);
static I f_emitf(I v_k);
static I f_outc(void);
static I f_reach(void);
static I f_outj(void);
static I f_outg(void);
static I f_main(void);
static I f_prel(void){
I t0=0;
os("#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <math.h>\n#include <time.h>\ntypedef long long I;\ntypedef double F;\n#ifndef ONDA_MEM\n#define ONDA_MEM 33554432LL\n#endif\nstatic I*M;\nstatic I HP=64,OS=0;\nstatic int AC;\nstatic char**AV;\nstatic unsigned char OB[65536],IB[65536];\nstatic int OL=0,IL=0,IP=0;\nstatic void oflush(void){if(OL)fwrite(OB,1,(size_t)OL,stdout);OL=0;fflush(stdout);}\nstatic void op(I b){if(OS){M[M[OS]++]=b;return;}OB[OL++]=(unsigned char)b;if(OL==65536){fwrite(OB,1,65536,stdout);OL=0;}}\nstatic void os(const char*s){while(*s)op((unsigned char)*s++);}\nstatic void on(I n){char b[24];int i=0;unsigned long long u=n<0?0ULL-(unsigned long long)n:(unsigned long long)n;if(n<0)op(45);do{b[i++]=(char)(48+u%10);u/=10;}while(u);while(i)op(b[--i]);}\nstatic void og(F x){char b[40];snprintf(b,40,\"%.15g\",x);os(b);}\nstatic I ir(void){if(IP==IL){IL=(int)fread(IB,1,65536,stdin);IP=0;if(IL<=0){IL=0;return -1;}}return IB[IP++];}\nstatic void odie(const char*m){oflush();fputs(m,stderr);exit(2);}\nstatic I oa(I n){I p=HP;HP+=n;if(n<0||HP>ONDA_MEM)odie(\"onda: memoria esgotada\\n\");return p;}\nstatic F ldf(I p){F d;memcpy(&d,M+p,8);return d;}\nstatic void stf(I p,F d){memcpy(M+p,&d,8);}\nstatic void osink(I p){OS=p;}\nstatic I av(I i,I j){I k;const char*s;if(i<0||i>=AC||j<0)return 0;s=AV[i];for(k=0;k<j;k++)if(!s[k])return 0;return (unsigned char)s[j];}\nstatic void oexit(I c){oflush();exit((int)c);}\nstatic I onow(void){struct timespec t;timespec_get(&t,TIME_UTC);return (I)t.tv_sec*1000000+(I)(t.tv_nsec/1000);}\nstatic unsigned char*oimg0(I w,I h){unsigned char*g=(unsigned char*)malloc((size_t)(w*h*3+1));if(!g)odie(\"onda: memoria esgotada\\n\");return g;}\nstatic void oimg1(unsigned char*g,I w,I h){I k;os(\"P6\\n\");on(w);op(32);on(h);os(\"\\n255\\n\");for(k=0;k<w*h*3;k++)op(g[k]);free(g);}\nstatic void oinit(int c,char**v){AC=c;AV=v;M=(I*)calloc((size_t)ONDA_MEM,8);if(!M)odie(\"onda: memoria esgotada\\n\");}\n");
t0=0;
return t0;
}
static I f_k2(I v_a,I v_b){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
t0=v_a;
t1=256;
t2=v_b;
t3=t1*t2;
t4=t0+t3;
return t4;
}
static I f_isws(I v_c){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
t0=v_c;
t1=32;
t2=(t0==t1)?1:0;
t3=1;
if(t2==0){
t4=v_c;
t5=10;
t6=(t4==t5)?1:0;
t3=(t6!=0)?1:0;
}
t7=1;
if(t3==0){
t8=v_c;
t9=9;
t10=(t8==t9)?1:0;
t11=1;
if(t10==0){
t12=v_c;
t13=13;
t14=(t12==t13)?1:0;
t11=(t14!=0)?1:0;
}
t7=(t11!=0)?1:0;
}
return t7;
}
static I f_isdg(I v_c){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
t0=v_c;
t1=48;
t2=(t0>=t1)?1:0;
t3=0;
if(t2!=0){
t4=v_c;
t5=57;
t6=(t4<=t5)?1:0;
t3=(t6!=0)?1:0;
}
return t3;
}
static I f_tk(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
t0=3;
t1=M[t0];
t2=v_i;
t3=3;
t4=t2*t3;
t5=t1+t4;
return t5;
}
static I f_tkk(I v_i){
I t0=0;
I t1=0;
I t2=0;
t0=v_i;
t1=f_tk(t0);
t2=M[t1];
return t2;
}
static I f_tks(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
t0=v_i;
t1=f_tk(t0);
t2=1;
t3=t1+t2;
t4=M[t3];
return t4;
}
static I f_tkl(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
t0=v_i;
t1=f_tk(t0);
t2=2;
t3=t1+t2;
t4=M[t3];
return t4;
}
static I f_tc(I v_i,I v_j){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
t0=v_i;
t1=f_tks(t0);
t2=v_j;
t3=t1+t2;
t4=M[t3];
return t4;
}
static I f_tcode(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I v_l=0;
I v_s=0;
t0=v_i;
t1=f_tkl(t0);
v_l=t1;
t2=v_i;
t3=f_tks(t2);
v_s=t3;
t4=v_l;
t5=3;
t6=(t4>t5)?1:0;
if(t6!=0){
t8=-1;
t7=t8;
}else{
t9=v_l;
t10=1;
t11=(t9==t10)?1:0;
if(t11!=0){
t13=v_s;
t14=M[t13];
t12=t14;
}else{
t15=v_l;
t16=2;
t17=(t15==t16)?1:0;
if(t17!=0){
t19=v_s;
t20=M[t19];
t21=256;
t22=v_s;
t23=1;
t24=t22+t23;
t25=M[t24];
t26=t21*t25;
t27=t20+t26;
t18=t27;
}else{
t28=v_s;
t29=M[t28];
t30=256;
t31=v_s;
t32=1;
t33=t31+t32;
t34=M[t33];
t35=t30*t34;
t36=t29+t35;
t37=65536;
t38=v_s;
t39=2;
t40=t38+t39;
t41=M[t40];
t42=t37*t41;
t43=t36+t42;
t18=t43;
}
t12=t18;
}
t7=t12;
}
return t7;
}
static I f_teq(I v_a,I v_b){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I v_l=0;
I v_sa=0;
I v_sb=0;
I v_j=0;
I v_r=0;
t0=v_a;
t1=f_tkl(t0);
v_l=t1;
t2=v_l;
t3=v_b;
t4=f_tkl(t3);
t5=(t2!=t4)?1:0;
if(t5!=0){
t7=0;
t6=t7;
}else{
t8=v_a;
t9=f_tks(t8);
v_sa=t9;
t10=v_b;
t11=f_tks(t10);
v_sb=t11;
t12=0;
v_j=t12;
t13=1;
v_r=t13;
while(1){
t14=v_r;
t15=0;
if(t14!=0){
t16=v_j;
t17=v_l;
t18=(t16<t17)?1:0;
t15=(t18!=0)?1:0;
}
if(t15==0)break;
t19=v_sa;
t20=v_j;
t21=t19+t20;
t22=M[t21];
t23=v_sb;
t24=v_j;
t25=t23+t24;
t26=M[t25];
t27=(t22!=t26)?1:0;
if(t27!=0){
t29=0;
v_r=t29;
t28=t29;
}else{
t30=0;
t28=t30;
}
t31=v_j;
t32=1;
t33=t31+t32;
v_j=t33;
}
t34=0;
t35=v_r;
t6=t35;
}
return t6;
}
static I f_ebeg(void){
I t0=0;
I t1=0;
t0=0;
osink(t0);
os("\n#error onda: ");
t1=0;
return t1;
}
static I f_eend(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
os(" (token ");
t0=0;
t1=7;
t2=M[t1];
on(t2);
os(")\n");
t3=0;
t4=1;
oexit(t4);
return t4;
}
static I f_ew(I v_s,I v_l){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I v_j=0;
t0=0;
v_j=t0;
while(1){
t1=v_j;
t2=v_l;
t3=(t1<t2)?1:0;
if(t3==0)break;
t4=v_s;
t5=v_j;
t6=t4+t5;
t7=M[t6];
op(t7);
t8=v_j;
t9=1;
t10=t8+t9;
v_j=t10;
}
t11=0;
t12=0;
return t12;
}
static I f_etx(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
t0=v_i;
t1=f_tks(t0);
t2=v_i;
t3=f_tkl(t2);
t4=f_ew(t1,t3);
return t4;
}
static I f_et(I v_t){
I t0=0;
I t1=0;
os("t");
t0=0;
t1=v_t;
on(t1);
return t1;
}
static I f_eq(I v_r){
I t0=0;
I t1=0;
I t2=0;
t0=v_r;
t1=f_et(t0);
os("=");
t2=0;
return t2;
}
static I f_isjs(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
t0=12;
t1=M[t0];
t2=2;
t3=(t1==t2)?1:0;
return t3;
}
static I f_ety(I v_y){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
t0=12;
t1=M[t0];
if(t1!=0){
t3=f_isjs();
if(t3!=0){
os("let");
t5=0;
t4=t5;
}else{
t6=v_y;
if(t6!=0){
os("float");
t8=0;
t7=t8;
}else{
os("int");
t9=0;
t7=t9;
}
t4=t7;
}
t2=t4;
}else{
t10=v_y;
if(t10!=0){
os("F");
t12=0;
t11=t12;
}else{
os("I");
t13=0;
t11=t13;
}
t2=t11;
}
return t2;
}
static I f_ez(I v_y){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
t0=v_y;
if(t0!=0){
os("0.0");
t2=0;
t1=t2;
}else{
os("0");
t3=0;
t1=t3;
}
return t1;
}
static I f_cpu(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
t0=12;
t1=M[t0];
if(t1!=0){
os("\n#error onda: operacao so de CPU\n");
t3=0;
t2=t3;
}else{
t4=0;
t2=t4;
}
return t2;
}
static I f_hasdot(I v_s,I v_l){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I v_j=0;
I v_r=0;
t0=0;
v_j=t0;
t1=0;
v_r=t1;
while(1){
t2=v_j;
t3=v_l;
t4=(t2<t3)?1:0;
if(t4==0)break;
t5=v_s;
t6=v_j;
t7=t5+t6;
t8=M[t7];
t9=46;
t10=(t8==t9)?1:0;
if(t10!=0){
t12=1;
v_r=t12;
t11=t12;
}else{
t13=0;
t11=t13;
}
t14=v_j;
t15=1;
t16=t14+t15;
v_j=t16;
}
t17=0;
t18=v_r;
return t18;
}
static I f_kindof(I v_s,I v_l){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I v_c=0;
t0=v_s;
t1=M[t0];
v_c=t1;
t2=v_c;
t3=f_isdg(t2);
t4=1;
if(t3==0){
t5=v_c;
t6=45;
t7=(t5==t6)?1:0;
t8=0;
if(t7!=0){
t9=v_l;
t10=1;
t11=(t9>t10)?1:0;
t8=(t11!=0)?1:0;
}
t12=0;
if(t8!=0){
t13=v_s;
t14=1;
t15=t13+t14;
t16=M[t15];
t17=f_isdg(t16);
t12=(t17!=0)?1:0;
}
t4=(t12!=0)?1:0;
}
if(t4!=0){
t19=v_s;
t20=v_l;
t21=f_hasdot(t19,t20);
if(t21!=0){
t23=2;
t22=t23;
}else{
t24=1;
t22=t24;
}
t18=t22;
}else{
t25=v_c;
t26=39;
t27=(t25==t26)?1:0;
if(t27!=0){
t29=4;
t28=t29;
}else{
t30=v_c;
t31=97;
t32=(t30>=t31)?1:0;
t33=0;
if(t32!=0){
t34=v_c;
t35=122;
t36=(t34<=t35)?1:0;
t33=(t36!=0)?1:0;
}
t37=1;
if(t33==0){
t38=v_c;
t39=95;
t40=(t38==t39)?1:0;
t37=(t40!=0)?1:0;
}
if(t37!=0){
t42=0;
t41=t42;
}else{
t43=5;
t41=t43;
}
t28=t41;
}
t18=t28;
}
return t18;
}
static I f_addtok(I v_k,I v_s,I v_l){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I v_p=0;
t0=4;
t1=M[t0];
t2=f_tk(t1);
v_p=t2;
t3=v_p;
t4=v_k;
M[t3]=t4;
t5=v_p;
t6=1;
t7=t5+t6;
t8=v_s;
M[t7]=t8;
t9=v_p;
t10=2;
t11=t9+t10;
t12=v_l;
M[t11]=t12;
t13=4;
t14=4;
t15=M[t14];
t16=1;
t17=t15+t16;
M[t13]=t17;
return t17;
}
static I f_lex(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I t48=0;
I t49=0;
I t50=0;
I t51=0;
I t52=0;
I t53=0;
I t54=0;
I t55=0;
I t56=0;
I t57=0;
I t58=0;
I t59=0;
I t60=0;
I t61=0;
I t62=0;
I t63=0;
I t64=0;
I t65=0;
I t66=0;
I t67=0;
I t68=0;
I t69=0;
I t70=0;
I t71=0;
I t72=0;
I t73=0;
I t74=0;
I t75=0;
I t76=0;
I t77=0;
I t78=0;
I t79=0;
I t80=0;
I t81=0;
I t82=0;
I t83=0;
I t84=0;
I t85=0;
I t86=0;
I t87=0;
I t88=0;
I t89=0;
I t90=0;
I t91=0;
I t92=0;
I t93=0;
I t94=0;
I t95=0;
I t96=0;
I t97=0;
I t98=0;
I t99=0;
I t100=0;
I t101=0;
I t102=0;
I t103=0;
I t104=0;
I t105=0;
I t106=0;
I t107=0;
I t108=0;
I t109=0;
I t110=0;
I t111=0;
I t112=0;
I t113=0;
I t114=0;
I t115=0;
I t116=0;
I t117=0;
I t118=0;
I t119=0;
I v_i=0;
I v_n=0;
I v_b=0;
I v_c=0;
I v_s=0;
t0=0;
v_i=t0;
t1=2;
t2=M[t1];
v_n=t2;
t3=1;
t4=M[t3];
v_b=t4;
while(1){
t5=v_i;
t6=v_n;
t7=(t5<t6)?1:0;
if(t7==0)break;
t8=v_b;
t9=v_i;
t10=t8+t9;
t11=M[t10];
v_c=t11;
t12=v_c;
t13=f_isws(t12);
if(t13!=0){
t15=v_i;
t16=1;
t17=t15+t16;
v_i=t17;
t14=t17;
}else{
t18=v_c;
t19=35;
t20=(t18==t19)?1:0;
if(t20!=0){
while(1){
t22=v_i;
t23=v_n;
t24=(t22<t23)?1:0;
t25=0;
if(t24!=0){
t26=v_b;
t27=v_i;
t28=t26+t27;
t29=M[t28];
t30=10;
t31=(t29!=t30)?1:0;
t25=(t31!=0)?1:0;
}
if(t25==0)break;
t32=v_i;
t33=1;
t34=t32+t33;
v_i=t34;
}
t35=0;
t36=v_i;
t21=t36;
}else{
t37=v_c;
t38=34;
t39=(t37==t38)?1:0;
if(t39!=0){
t41=v_i;
v_s=t41;
t42=v_i;
t43=1;
t44=t42+t43;
v_i=t44;
while(1){
t45=v_i;
t46=v_n;
t47=(t45<t46)?1:0;
t48=0;
if(t47!=0){
t49=v_b;
t50=v_i;
t51=t49+t50;
t52=M[t51];
t53=34;
t54=(t52!=t53)?1:0;
t48=(t54!=0)?1:0;
}
if(t48==0)break;
t55=v_b;
t56=v_i;
t57=t55+t56;
t58=M[t57];
t59=92;
t60=(t58==t59)?1:0;
if(t60!=0){
t62=v_i;
t63=1;
t64=t62+t63;
v_i=t64;
t61=t64;
}else{
t65=0;
t61=t65;
}
t66=v_i;
t67=1;
t68=t66+t67;
v_i=t68;
}
t69=0;
t70=v_i;
t71=v_n;
t72=(t70>=t71)?1:0;
if(t72!=0){
t74=f_ebeg();
os("texto sem fim");
t75=0;
t76=f_eend();
t73=t76;
}else{
t77=0;
t73=t77;
}
t78=v_i;
t79=1;
t80=t78+t79;
v_i=t80;
t81=3;
t82=v_b;
t83=v_s;
t84=t82+t83;
t85=v_i;
t86=v_s;
t87=t85-t86;
t88=f_addtok(t81,t84,t87);
t40=t88;
}else{
t89=v_i;
v_s=t89;
while(1){
t90=v_i;
t91=v_n;
t92=(t90<t91)?1:0;
t93=0;
if(t92!=0){
t94=v_b;
t95=v_i;
t96=t94+t95;
t97=M[t96];
t98=f_isws(t97);
t99=(t98==0)?1:0;
t93=(t99!=0)?1:0;
}
if(t93==0)break;
t100=v_i;
t101=1;
t102=t100+t101;
v_i=t102;
}
t103=0;
t104=v_b;
t105=v_s;
t106=t104+t105;
t107=v_i;
t108=v_s;
t109=t107-t108;
t110=f_kindof(t106,t109);
t111=v_b;
t112=v_s;
t113=t111+t112;
t114=v_i;
t115=v_s;
t116=t114-t115;
t117=f_addtok(t110,t113,t116);
t40=t117;
}
t21=t40;
}
t14=t21;
}
}
t118=0;
t119=0;
return t119;
}
static I f_fe(I v_k,I v_j){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
t0=5;
t1=M[t0];
t2=v_k;
t3=12;
t4=t2*t3;
t5=t1+t4;
t6=v_j;
t7=t5+t6;
return t7;
}
static I f_fpt(I v_k,I v_j){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
t0=v_k;
t1=1;
t2=f_fe(t0,t1);
t3=M[t2];
t4=f_tks(t3);
t5=v_j;
t6=t4+t5;
t7=M[t6];
t8=102;
t9=(t7==t8)?1:0;
if(t9!=0){
t11=1;
t10=t11;
}else{
t12=0;
t10=t12;
}
return t10;
}
static I f_ffun(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I v_k=0;
I v_r=0;
t0=0;
v_k=t0;
t1=-1;
v_r=t1;
while(1){
t2=v_r;
t3=0;
t4=(t2<t3)?1:0;
t5=0;
if(t4!=0){
t6=v_k;
t7=6;
t8=M[t7];
t9=(t6<t8)?1:0;
t5=(t9!=0)?1:0;
}
if(t5==0)break;
t10=v_i;
t11=v_k;
t12=0;
t13=f_fe(t11,t12);
t14=M[t13];
t15=f_teq(t10,t14);
if(t15!=0){
t17=v_k;
v_r=t17;
t16=t17;
}else{
t18=0;
t16=t18;
}
t19=v_k;
t20=1;
t21=t19+t20;
v_k=t21;
}
t22=0;
t23=v_r;
return t23;
}
static I f_defn(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I t48=0;
I t49=0;
I t50=0;
I t51=0;
I t52=0;
I t53=0;
I t54=0;
I t55=0;
I t56=0;
I t57=0;
I t58=0;
I t59=0;
I t60=0;
I t61=0;
I t62=0;
I t63=0;
I t64=0;
I t65=0;
I t66=0;
I t67=0;
I t68=0;
I t69=0;
I t70=0;
I t71=0;
I t72=0;
I t73=0;
I t74=0;
I t75=0;
I t76=0;
I t77=0;
I t78=0;
I t79=0;
I t80=0;
I t81=0;
I t82=0;
I t83=0;
I t84=0;
I t85=0;
I t86=0;
I t87=0;
I t88=0;
I t89=0;
I t90=0;
I t91=0;
I t92=0;
I t93=0;
I t94=0;
I t95=0;
I t96=0;
I t97=0;
I t98=0;
I t99=0;
I t100=0;
I t101=0;
I t102=0;
I t103=0;
I t104=0;
I t105=0;
I t106=0;
I t107=0;
I t108=0;
I t109=0;
I t110=0;
I t111=0;
I t112=0;
I t113=0;
I t114=0;
I t115=0;
I t116=0;
I t117=0;
I t118=0;
I t119=0;
I t120=0;
I t121=0;
I t122=0;
I t123=0;
I t124=0;
I t125=0;
I t126=0;
I t127=0;
I t128=0;
I t129=0;
I t130=0;
I t131=0;
I t132=0;
I t133=0;
I t134=0;
I t135=0;
I t136=0;
I t137=0;
I t138=0;
I t139=0;
I t140=0;
I t141=0;
I t142=0;
I t143=0;
I t144=0;
I t145=0;
I t146=0;
I t147=0;
I t148=0;
I t149=0;
I t150=0;
I t151=0;
I t152=0;
I t153=0;
I t154=0;
I t155=0;
I t156=0;
I t157=0;
I t158=0;
I t159=0;
I t160=0;
I t161=0;
I t162=0;
I t163=0;
I t164=0;
I t165=0;
I t166=0;
I t167=0;
I t168=0;
I t169=0;
I t170=0;
I t171=0;
I t172=0;
I t173=0;
I t174=0;
I t175=0;
I t176=0;
I t177=0;
I t178=0;
I t179=0;
I t180=0;
I t181=0;
I v_k=0;
I v_s=0;
I v_l=0;
I v_g=0;
I v_j=0;
I v_rt=0;
t0=v_i;
t1=2;
t2=t0+t1;
t3=4;
t4=M[t3];
t5=(t2>=t4)?1:0;
if(t5!=0){
t7=7;
t8=v_i;
M[t7]=t8;
t9=f_ebeg();
os("definicao incompleta");
t10=0;
t11=f_eend();
t6=t11;
}else{
t12=0;
t6=t12;
}
t13=6;
t14=M[t13];
v_k=t14;
t15=v_i;
t16=2;
t17=t15+t16;
t18=f_tks(t17);
v_s=t18;
t19=v_i;
t20=2;
t21=t19+t20;
t22=f_tkl(t21);
v_l=t22;
t23=0;
v_g=t23;
while(1){
t24=v_g;
t25=v_l;
t26=(t24<t25)?1:0;
t27=0;
if(t26!=0){
t28=v_s;
t29=v_g;
t30=t28+t29;
t31=M[t30];
t32=62;
t33=(t31!=t32)?1:0;
t27=(t33!=0)?1:0;
}
if(t27==0)break;
t34=v_g;
t35=1;
t36=t34+t35;
v_g=t36;
}
t37=0;
t38=v_l;
t39=v_g;
t40=2;
t41=t39+t40;
t42=(t38!=t41)?1:0;
if(t42!=0){
t44=7;
t45=v_i;
t46=2;
t47=t45+t46;
M[t44]=t47;
t48=f_ebeg();
os("assinatura invalida");
t49=0;
t50=f_eend();
t43=t50;
}else{
t51=0;
t43=t51;
}
t52=0;
v_j=t52;
while(1){
t53=v_j;
t54=v_g;
t55=(t53<t54)?1:0;
if(t55==0)break;
t56=v_s;
t57=v_j;
t58=t56+t57;
t59=M[t58];
t60=105;
t61=(t59!=t60)?1:0;
t62=0;
if(t61!=0){
t63=v_s;
t64=v_j;
t65=t63+t64;
t66=M[t65];
t67=102;
t68=(t66!=t67)?1:0;
t62=(t68!=0)?1:0;
}
if(t62!=0){
t70=7;
t71=v_i;
t72=2;
t73=t71+t72;
M[t70]=t73;
t74=f_ebeg();
os("tipo invalido");
t75=0;
t76=f_eend();
t69=t76;
}else{
t77=0;
t69=t77;
}
t78=v_j;
t79=1;
t80=t78+t79;
v_j=t80;
}
t81=0;
t82=v_s;
t83=v_g;
t84=1;
t85=t83+t84;
t86=t82+t85;
t87=M[t86];
v_rt=t87;
t88=v_rt;
t89=105;
t90=(t88!=t89)?1:0;
t91=0;
if(t90!=0){
t92=v_rt;
t93=102;
t94=(t92!=t93)?1:0;
t91=(t94!=0)?1:0;
}
if(t91!=0){
t96=7;
t97=v_i;
t98=2;
t99=t97+t98;
M[t96]=t99;
t100=f_ebeg();
os("tipo invalido");
t101=0;
t102=f_eend();
t95=t102;
}else{
t103=0;
t95=t103;
}
t104=v_i;
t105=1;
t106=t104+t105;
t107=f_tkk(t106);
t108=0;
t109=(t107!=t108)?1:0;
if(t109!=0){
t111=7;
t112=v_i;
t113=1;
t114=t112+t113;
M[t111]=t114;
t115=f_ebeg();
os("nome invalido");
t116=0;
t117=f_eend();
t110=t117;
}else{
t118=0;
t110=t118;
}
t119=v_i;
t120=1;
t121=t119+t120;
t122=f_ffun(t121);
t123=0;
t124=(t122>=t123)?1:0;
if(t124!=0){
t126=7;
t127=v_i;
t128=1;
t129=t127+t128;
M[t126]=t129;
t130=f_ebeg();
os("funcao repetida");
t131=0;
t132=f_eend();
t125=t132;
}else{
t133=0;
t125=t133;
}
t134=v_k;
t135=0;
t136=f_fe(t134,t135);
t137=v_i;
t138=1;
t139=t137+t138;
M[t136]=t139;
t140=v_k;
t141=1;
t142=f_fe(t140,t141);
t143=v_i;
t144=2;
t145=t143+t144;
M[t142]=t145;
t146=v_k;
t147=2;
t148=f_fe(t146,t147);
t149=v_g;
M[t148]=t149;
t150=v_k;
t151=3;
t152=f_fe(t150,t151);
t153=v_rt;
t154=102;
t155=(t153==t154)?1:0;
if(t155!=0){
t157=1;
t156=t157;
}else{
t158=0;
t156=t158;
}
M[t152]=t156;
t159=v_k;
t160=4;
t161=f_fe(t159,t160);
t162=v_i;
t163=3;
t164=t162+t163;
M[t161]=t164;
t165=v_k;
t166=5;
t167=f_fe(t165,t166);
t168=v_i;
t169=3;
t170=t168+t169;
t171=v_g;
t172=t170+t171;
M[t167]=t172;
t173=6;
t174=v_k;
t175=1;
t176=t174+t175;
M[t173]=t176;
t177=v_i;
t178=3;
t179=t177+t178;
t180=v_g;
t181=t179+t180;
return t181;
}
static I f_pre(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I v_i=0;
t0=0;
v_i=t0;
while(1){
t1=v_i;
t2=4;
t3=M[t2];
t4=(t1<t3)?1:0;
if(t4==0)break;
t5=v_i;
t6=f_tcode(t5);
t7=58;
t8=(t6==t7)?1:0;
if(t8!=0){
t10=v_i;
t11=f_defn(t10);
v_i=t11;
t9=t11;
}else{
t12=6;
t13=M[t12];
t14=0;
t15=(t13==t14)?1:0;
if(t15!=0){
t17=7;
t18=v_i;
M[t17]=t18;
t19=f_ebeg();
os("fora de definicao");
t20=0;
t21=f_eend();
t16=t21;
}else{
t22=0;
t16=t22;
}
t23=v_i;
t24=1;
t25=t23+t24;
v_i=t25;
t9=t25;
}
}
t26=0;
t27=0;
return t27;
}
static I f_lnm(I v_j){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
t0=8;
t1=M[t0];
t2=v_j;
t3=2;
t4=t2*t3;
t5=t1+t4;
t6=M[t5];
return t6;
}
static I f_lty(I v_j){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
t0=8;
t1=M[t0];
t2=v_j;
t3=2;
t4=t2*t3;
t5=t1+t4;
t6=1;
t7=t5+t6;
t8=M[t7];
return t8;
}
static I f_addl(I v_n,I v_y){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I v_p=0;
t0=8;
t1=M[t0];
t2=9;
t3=M[t2];
t4=2;
t5=t3*t4;
t6=t1+t5;
v_p=t6;
t7=v_p;
t8=v_n;
M[t7]=t8;
t9=v_p;
t10=1;
t11=t9+t10;
t12=v_y;
M[t11]=t12;
t13=9;
t14=9;
t15=M[t14];
t16=1;
t17=t15+t16;
M[t13]=t17;
return t17;
}
static I f_floc(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I v_k=0;
I v_r=0;
t0=0;
v_k=t0;
t1=-1;
v_r=t1;
while(1){
t2=v_r;
t3=0;
t4=(t2<t3)?1:0;
t5=0;
if(t4!=0){
t6=v_k;
t7=9;
t8=M[t7];
t9=(t6<t8)?1:0;
t5=(t9!=0)?1:0;
}
if(t5==0)break;
t10=v_i;
t11=v_k;
t12=f_lnm(t11);
t13=f_teq(t10,t12);
if(t13!=0){
t15=v_k;
v_r=t15;
t14=t15;
}else{
t16=0;
t14=t16;
}
t17=v_k;
t18=1;
t19=t17+t18;
v_k=t19;
}
t20=0;
t21=v_r;
return t21;
}
static I f_nt(I v_y){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I v_r=0;
t0=11;
t1=M[t0];
v_r=t1;
t2=10;
t3=M[t2];
t4=v_r;
t5=t3+t4;
t6=v_y;
M[t5]=t6;
t7=11;
t8=v_r;
t9=1;
t10=t8+t9;
M[t7]=t10;
t11=v_r;
return t11;
}
static I f_tty(I v_t){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
t0=10;
t1=M[t0];
t2=v_t;
t3=t1+t2;
t4=M[t3];
return t4;
}
static I f_edge(I v_k){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I v_p=0;
t0=14;
t1=M[t0];
t2=15;
t3=M[t2];
t4=2;
t5=t3*t4;
t6=t1+t5;
v_p=t6;
t7=v_p;
t8=13;
t9=M[t8];
M[t7]=t9;
t10=v_p;
t11=1;
t12=t10+t11;
t13=v_k;
M[t12]=t13;
t14=15;
t15=15;
t16=M[t15];
t17=1;
t18=t16+t17;
M[t14]=t18;
return t18;
}
static I f_ir(I v_k,I v_d,I v_a,I v_b,I v_c,I v_x,I v_y){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I v_p=0;
t0=18;
t1=M[t0];
t2=19;
t3=M[t2];
t4=8;
t5=t3*t4;
t6=t1+t5;
v_p=t6;
t7=v_p;
t8=v_k;
M[t7]=t8;
t9=v_p;
t10=1;
t11=t9+t10;
t12=v_d;
M[t11]=t12;
t13=v_p;
t14=2;
t15=t13+t14;
t16=v_a;
M[t15]=t16;
t17=v_p;
t18=3;
t19=t17+t18;
t20=v_b;
M[t19]=t20;
t21=v_p;
t22=4;
t23=t21+t22;
t24=v_c;
M[t23]=t24;
t25=v_p;
t26=5;
t27=t25+t26;
t28=v_x;
M[t27]=t28;
t29=v_p;
t30=6;
t31=t29+t30;
t32=v_y;
M[t31]=t32;
t33=19;
t34=19;
t35=M[t34];
t36=1;
t37=t35+t36;
M[t33]=t37;
return t37;
}
static I f_sighdr(I v_k){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I t48=0;
I t49=0;
I t50=0;
I t51=0;
I t52=0;
I t53=0;
I t54=0;
I t55=0;
I t56=0;
I t57=0;
I t58=0;
I t59=0;
I t60=0;
I t61=0;
I t62=0;
I t63=0;
I v_np=0;
I v_j=0;
t0=12;
t1=M[t0];
if(t1!=0){
t3=0;
t2=t3;
}else{
os("static ");
t4=0;
t2=t4;
}
t5=f_isjs();
if(t5!=0){
os("function");
t7=0;
t6=t7;
}else{
t8=v_k;
t9=3;
t10=f_fe(t8,t9);
t11=M[t10];
t12=f_ety(t11);
t6=t12;
}
os(" f_");
t13=0;
t14=v_k;
t15=0;
t16=f_fe(t14,t15);
t17=M[t16];
t18=f_etx(t17);
os("(");
t19=0;
t20=v_k;
t21=2;
t22=f_fe(t20,t21);
t23=M[t22];
v_np=t23;
t24=v_np;
t25=0;
t26=(t24==t25)?1:0;
t27=0;
if(t26!=0){
t28=12;
t29=M[t28];
t30=(t29==0)?1:0;
t27=(t30!=0)?1:0;
}
if(t27!=0){
os("void");
t32=0;
t31=t32;
}else{
t33=0;
t31=t33;
}
t34=0;
v_j=t34;
while(1){
t35=v_j;
t36=v_np;
t37=(t35<t36)?1:0;
if(t37==0)break;
t38=v_j;
t39=0;
t40=(t38>t39)?1:0;
if(t40!=0){
os(",");
t42=0;
t41=t42;
}else{
t43=0;
t41=t43;
}
t44=f_isjs();
if(t44!=0){
os("v_");
t46=0;
t45=t46;
}else{
t47=v_k;
t48=v_j;
t49=f_fpt(t47,t48);
t50=f_ety(t49);
os(" v_");
t51=0;
t45=t51;
}
t52=v_k;
t53=4;
t54=f_fe(t52,t53);
t55=M[t54];
t56=v_j;
t57=t55+t56;
t58=f_etx(t57);
t59=v_j;
t60=1;
t61=t59+t60;
v_j=t61;
}
t62=0;
os(")");
t63=0;
return t63;
}
static I f_cfun(I v_k){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I t48=0;
I t49=0;
I t50=0;
I t51=0;
I t52=0;
I t53=0;
I t54=0;
I t55=0;
I t56=0;
I t57=0;
I t58=0;
I t59=0;
I t60=0;
I t61=0;
I t62=0;
I t63=0;
I t64=0;
I t65=0;
I t66=0;
I t67=0;
I t68=0;
I t69=0;
I t70=0;
I t71=0;
I t72=0;
I t73=0;
I v_np=0;
I v_j=0;
I v_r=0;
t0=13;
t1=v_k;
M[t0]=t1;
t2=9;
t3=0;
M[t2]=t3;
t4=11;
t5=0;
M[t4]=t5;
t6=19;
t7=0;
M[t6]=t7;
t8=v_k;
t9=2;
t10=f_fe(t8,t9);
t11=M[t10];
v_np=t11;
t12=0;
v_j=t12;
while(1){
t13=v_j;
t14=v_np;
t15=(t13<t14)?1:0;
if(t15==0)break;
t16=v_k;
t17=4;
t18=f_fe(t16,t17);
t19=M[t18];
t20=v_j;
t21=t19+t20;
t22=v_k;
t23=v_j;
t24=f_fpt(t22,t23);
t25=f_addl(t21,t24);
t26=v_j;
t27=1;
t28=t26+t27;
v_j=t28;
}
t29=0;
t30=7;
t31=v_k;
t32=5;
t33=f_fe(t31,t32);
t34=M[t33];
M[t30]=t34;
t35=f_cx();
v_r=t35;
t36=v_r;
t37=f_tty(t36);
t38=v_k;
t39=3;
t40=f_fe(t38,t39);
t41=M[t40];
t42=(t37!=t41)?1:0;
if(t42!=0){
t44=f_ebeg();
os("tipo de retorno errado");
t45=0;
t46=f_eend();
t43=t46;
}else{
t47=0;
t43=t47;
}
t48=7;
t49=M[t48];
t50=4;
t51=M[t50];
t52=(t49<t51)?1:0;
t53=0;
if(t52!=0){
t54=7;
t55=M[t54];
t56=f_tcode(t55);
t57=58;
t58=(t56!=t57)?1:0;
t53=(t58!=0)?1:0;
}
if(t53!=0){
t60=f_ebeg();
os("tokens a mais");
t61=0;
t62=f_eend();
t59=t62;
}else{
t63=0;
t59=t63;
}
t64=41;
t65=0;
t66=v_r;
t67=0;
t68=0;
t69=0;
t70=0;
t71=f_ir(t64,t65,t66,t67,t68,t69,t70);
t72=v_k;
t73=f_tfun(t72);
return t73;
}
static I f_tfun(I v_k){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I t48=0;
I t49=0;
I t50=0;
I t51=0;
I t52=0;
I t53=0;
I t54=0;
I t55=0;
I t56=0;
I t57=0;
I t58=0;
I t59=0;
I t60=0;
I t61=0;
I t62=0;
I t63=0;
I t64=0;
I t65=0;
I t66=0;
I t67=0;
I t68=0;
I t69=0;
I t70=0;
I t71=0;
I t72=0;
I t73=0;
I t74=0;
I t75=0;
I t76=0;
I t77=0;
I t78=0;
I t79=0;
I t80=0;
I t81=0;
I t82=0;
I t83=0;
I t84=0;
I t85=0;
I t86=0;
I v_np=0;
I v_j=0;
t0=v_k;
t1=2;
t2=f_fe(t0,t1);
t3=M[t2];
v_np=t3;
t4=16;
osink(t4);
t5=v_k;
t6=8;
t7=f_fe(t5,t6);
t8=16;
t9=M[t8];
M[t7]=t9;
t10=0;
v_j=t10;
while(1){
t11=v_j;
t12=19;
t13=M[t12];
t14=(t11<t13)?1:0;
if(t14==0)break;
t15=18;
t16=M[t15];
t17=v_j;
t18=8;
t19=t17*t18;
t20=t16+t19;
t21=f_emi(t20);
t22=v_j;
t23=1;
t24=t22+t23;
v_j=t24;
}
t25=0;
t26=v_k;
t27=9;
t28=f_fe(t26,t27);
t29=16;
t30=M[t29];
M[t28]=t30;
t31=17;
osink(t31);
t32=v_k;
t33=6;
t34=f_fe(t32,t33);
t35=17;
t36=M[t35];
M[t34]=t36;
t37=v_k;
t38=f_sighdr(t37);
os("{\n");
t39=0;
t40=0;
v_j=t40;
while(1){
t41=v_j;
t42=11;
t43=M[t42];
t44=(t41<t43)?1:0;
if(t44==0)break;
t45=v_j;
t46=f_tty(t45);
t47=f_ety(t46);
os(" ");
t48=0;
t49=v_j;
t50=f_et(t49);
os("=");
t51=0;
t52=v_j;
t53=f_tty(t52);
t54=f_ez(t53);
os(";\n");
t55=0;
t56=v_j;
t57=1;
t58=t56+t57;
v_j=t58;
}
t59=0;
t60=v_np;
v_j=t60;
while(1){
t61=v_j;
t62=9;
t63=M[t62];
t64=(t61<t63)?1:0;
if(t64==0)break;
t65=v_j;
t66=f_lty(t65);
t67=f_ety(t66);
os(" v_");
t68=0;
t69=v_j;
t70=f_lnm(t69);
t71=f_etx(t70);
os("=");
t72=0;
t73=v_j;
t74=f_lty(t73);
t75=f_ez(t74);
os(";\n");
t76=0;
t77=v_j;
t78=1;
t79=t77+t78;
v_j=t79;
}
t80=0;
t81=v_k;
t82=7;
t83=f_fe(t81,t82);
t84=17;
t85=M[t84];
M[t83]=t85;
t86=0;
osink(t86);
return t86;
}
static I f_lit(I v_i,I v_y){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I v_r=0;
t0=v_y;
t1=f_nt(t0);
v_r=t1;
t2=1;
t3=v_r;
t4=v_i;
t5=0;
t6=0;
t7=0;
t8=0;
t9=f_ir(t2,t3,t4,t5,t6,t7,t8);
t10=v_r;
return t10;
}
static I f_clit(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I v_r=0;
t0=v_i;
t1=f_tkl(t0);
t2=2;
t3=(t1<t2)?1:0;
if(t3!=0){
t5=f_ebeg();
os("caracter invalido");
t6=0;
t7=f_eend();
t4=t7;
}else{
t8=0;
t4=t8;
}
t9=0;
t10=f_nt(t9);
v_r=t10;
t11=2;
t12=v_r;
t13=v_i;
t14=1;
t15=f_tc(t13,t14);
t16=0;
t17=0;
t18=0;
t19=0;
t20=f_ir(t11,t12,t15,t16,t17,t18,t19);
t21=v_r;
return t21;
}
static I f_cstr(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I v_r=0;
t0=3;
t1=0;
t2=v_i;
t3=0;
t4=0;
t5=0;
t6=0;
t7=f_ir(t0,t1,t2,t3,t4,t5,t6);
t8=0;
t9=f_nt(t8);
v_r=t9;
t10=4;
t11=v_r;
t12=0;
t13=0;
t14=0;
t15=0;
t16=0;
t17=f_ir(t10,t11,t12,t13,t14,t15,t16);
t18=v_r;
return t18;
}
static I f_cargs(I v_k,I v_sk){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I v_n=0;
I v_a=0;
I v_j=0;
I v_t=0;
t0=v_k;
t1=2;
t2=f_fe(t0,t1);
t3=M[t2];
t4=v_sk;
t5=t3-t4;
v_n=t5;
t6=v_n;
t7=1;
t8=t6+t7;
t9=oa(t8);
v_a=t9;
t10=0;
v_j=t10;
while(1){
t11=v_j;
t12=v_n;
t13=(t11<t12)?1:0;
if(t13==0)break;
t14=f_cx();
v_t=t14;
t15=v_t;
t16=f_tty(t15);
t17=v_k;
t18=v_sk;
t19=v_j;
t20=t18+t19;
t21=f_fpt(t17,t20);
t22=(t16!=t21)?1:0;
if(t22!=0){
t24=f_ebeg();
os("argumento com tipo errado");
t25=0;
t26=f_eend();
t23=t26;
}else{
t27=0;
t23=t27;
}
t28=v_a;
t29=v_j;
t30=t28+t29;
t31=v_t;
M[t30]=t31;
t32=v_j;
t33=1;
t34=t32+t33;
v_j=t34;
}
t35=0;
t36=v_a;
return t36;
}
static I f_eargs(I v_a,I v_n,I v_ld){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I v_j=0;
t0=0;
v_j=t0;
while(1){
t1=v_j;
t2=v_n;
t3=(t1<t2)?1:0;
if(t3==0)break;
t4=v_j;
t5=0;
t6=(t4>t5)?1:0;
t7=1;
if(t6==0){
t8=v_ld;
t7=(t8!=0)?1:0;
}
if(t7!=0){
os(",");
t10=0;
t9=t10;
}else{
t11=0;
t9=t11;
}
t12=v_a;
t13=v_j;
t14=t12+t13;
t15=M[t14];
t16=f_et(t15);
t17=v_j;
t18=1;
t19=t17+t18;
v_j=t19;
}
t20=0;
t21=0;
return t21;
}
static I f_ccall(I v_k){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I v_a=0;
I v_r=0;
t0=v_k;
t1=0;
t2=f_cargs(t0,t1);
v_a=t2;
t3=v_k;
t4=3;
t5=f_fe(t3,t4);
t6=M[t5];
t7=f_nt(t6);
v_r=t7;
t8=7;
t9=v_r;
t10=v_k;
t11=v_a;
t12=v_k;
t13=2;
t14=f_fe(t12,t13);
t15=M[t14];
t16=0;
t17=0;
t18=f_ir(t8,t9,t10,t11,t15,t16,t17);
t19=v_k;
t20=f_edge(t19);
t21=v_r;
return t21;
}
static I f_cid(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I v_j=0;
I v_r=0;
I v_k=0;
t0=v_i;
t1=f_floc(t0);
v_j=t1;
t2=v_j;
t3=0;
t4=(t2>=t3)?1:0;
if(t4!=0){
t6=v_j;
t7=f_lty(t6);
t8=f_nt(t7);
v_r=t8;
t9=5;
t10=v_r;
t11=v_i;
t12=0;
t13=0;
t14=0;
t15=0;
t16=f_ir(t9,t10,t11,t12,t13,t14,t15);
t17=v_r;
t5=t17;
}else{
t18=v_i;
t19=f_ffun(t18);
v_k=t19;
t20=v_k;
t21=0;
t22=(t20<t21)?1:0;
if(t22!=0){
t24=7;
t25=v_i;
M[t24]=t25;
t26=f_ebeg();
os("nome desconhecido");
t27=0;
t28=f_eend();
t23=t28;
}else{
t29=0;
t23=t29;
}
t30=v_k;
t31=f_ccall(t30);
t5=t31;
}
return t5;
}
static I f_cx(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I t48=0;
I t49=0;
I t50=0;
I t51=0;
I v_i=0;
I v_k=0;
t0=7;
t1=M[t0];
t2=4;
t3=M[t2];
t4=(t1>=t3)?1:0;
if(t4!=0){
t6=f_ebeg();
os("fim inesperado");
t7=0;
t8=f_eend();
t5=t8;
}else{
t9=0;
t5=t9;
}
t10=7;
t11=M[t10];
v_i=t11;
t12=7;
t13=v_i;
t14=1;
t15=t13+t14;
M[t12]=t15;
t16=v_i;
t17=f_tkk(t16);
v_k=t17;
t18=v_k;
t19=1;
t20=(t18==t19)?1:0;
if(t20!=0){
t22=v_i;
t23=0;
t24=f_lit(t22,t23);
t21=t24;
}else{
t25=v_k;
t26=2;
t27=(t25==t26)?1:0;
if(t27!=0){
t29=v_i;
t30=1;
t31=f_lit(t29,t30);
t28=t31;
}else{
t32=v_k;
t33=4;
t34=(t32==t33)?1:0;
if(t34!=0){
t36=v_i;
t37=f_clit(t36);
t35=t37;
}else{
t38=v_k;
t39=3;
t40=(t38==t39)?1:0;
if(t40!=0){
t42=v_i;
t43=f_cstr(t42);
t41=t43;
}else{
t44=v_k;
t45=0;
t46=(t44==t45)?1:0;
if(t46!=0){
t48=v_i;
t49=f_cid(t48);
t47=t49;
}else{
t50=v_i;
t51=f_cop(t50);
t47=t51;
}
t41=t47;
}
t35=t41;
}
t28=t35;
}
t21=t28;
}
return t21;
}
static I f_isar(I v_o){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
t0=v_o;
t1=43;
t2=(t0==t1)?1:0;
t3=1;
if(t2==0){
t4=v_o;
t5=45;
t6=(t4==t5)?1:0;
t3=(t6!=0)?1:0;
}
t7=1;
if(t3==0){
t8=v_o;
t9=42;
t10=(t8==t9)?1:0;
t11=1;
if(t10==0){
t12=v_o;
t13=47;
t14=(t12==t13)?1:0;
t11=(t14!=0)?1:0;
}
t7=(t11!=0)?1:0;
}
return t7;
}
static I f_isbi(I v_o){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
t0=v_o;
t1=37;
t2=(t0==t1)?1:0;
t3=1;
if(t2==0){
t4=v_o;
t5=38;
t6=(t4==t5)?1:0;
t3=(t6!=0)?1:0;
}
t7=1;
if(t3==0){
t8=v_o;
t9=124;
t10=(t8==t9)?1:0;
t11=1;
if(t10==0){
t12=v_o;
t13=94;
t14=(t12==t13)?1:0;
t11=(t14!=0)?1:0;
}
t7=(t11!=0)?1:0;
}
t15=1;
if(t7==0){
t16=v_o;
t17=60;
t18=60;
t19=f_k2(t17,t18);
t20=(t16==t19)?1:0;
t21=1;
if(t20==0){
t22=v_o;
t23=62;
t24=62;
t25=f_k2(t23,t24);
t26=(t22==t25)?1:0;
t21=(t26!=0)?1:0;
}
t15=(t21!=0)?1:0;
}
return t15;
}
static I f_iscm(I v_o){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
t0=v_o;
t1=60;
t2=(t0==t1)?1:0;
t3=1;
if(t2==0){
t4=v_o;
t5=62;
t6=(t4==t5)?1:0;
t3=(t6!=0)?1:0;
}
t7=1;
if(t3==0){
t8=v_o;
t9=60;
t10=61;
t11=f_k2(t9,t10);
t12=(t8==t11)?1:0;
t13=1;
if(t12==0){
t14=v_o;
t15=62;
t16=61;
t17=f_k2(t15,t16);
t18=(t14==t17)?1:0;
t13=(t18!=0)?1:0;
}
t7=(t13!=0)?1:0;
}
t19=1;
if(t7==0){
t20=v_o;
t21=61;
t22=61;
t23=f_k2(t21,t22);
t24=(t20==t23)?1:0;
t25=1;
if(t24==0){
t26=v_o;
t27=33;
t28=61;
t29=f_k2(t27,t28);
t30=(t26==t29)?1:0;
t25=(t30!=0)?1:0;
}
t19=(t25!=0)?1:0;
}
return t19;
}
static I f_ckint(I v_t){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
t0=v_t;
t1=f_tty(t0);
if(t1!=0){
t3=f_ebeg();
os("esperava inteiro");
t4=0;
t5=f_eend();
t2=t5;
}else{
t6=0;
t2=t6;
}
return t2;
}
static I f_ckflt(I v_t){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
t0=v_t;
t1=f_tty(t0);
if(t1!=0){
t3=0;
t2=t3;
}else{
t4=f_ebeg();
os("esperava real");
t5=0;
t6=f_eend();
t2=t6;
}
return t2;
}
static I f_ckc(I v_t){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
t0=v_t;
t1=f_tty(t0);
if(t1!=0){
t3=f_ebeg();
os("condicao deve ser inteira");
t4=0;
t5=f_eend();
t2=t5;
}else{
t6=0;
t2=t6;
}
return t2;
}
static I f_cbin(I v_i,I v_m){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I v_a=0;
I v_b=0;
I v_y=0;
I v_r=0;
t0=f_cx();
v_a=t0;
t1=f_cx();
v_b=t1;
t2=v_a;
t3=f_tty(t2);
v_y=t3;
t4=v_y;
t5=v_b;
t6=f_tty(t5);
t7=(t4!=t6)?1:0;
if(t7!=0){
t9=f_ebeg();
os("tipos diferentes");
t10=0;
t11=f_eend();
t8=t11;
}else{
t12=0;
t8=t12;
}
t13=v_m;
t14=0;
t15=(t13==t14)?1:0;
t16=0;
if(t15!=0){
t17=v_y;
t18=0;
t19=(t17!=t18)?1:0;
t16=(t19!=0)?1:0;
}
if(t16!=0){
t21=f_ebeg();
os("operacao so para inteiros");
t22=0;
t23=f_eend();
t20=t23;
}else{
t24=0;
t20=t24;
}
t25=v_y;
t26=f_nt(t25);
v_r=t26;
t27=8;
t28=v_r;
t29=v_i;
t30=v_a;
t31=v_b;
t32=0;
t33=0;
t34=f_ir(t27,t28,t29,t30,t31,t32,t33);
t35=v_r;
return t35;
}
static I f_ccmp(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I v_a=0;
I v_b=0;
I v_r=0;
t0=f_cx();
v_a=t0;
t1=f_cx();
v_b=t1;
t2=v_a;
t3=f_tty(t2);
t4=v_b;
t5=f_tty(t4);
t6=(t3!=t5)?1:0;
if(t6!=0){
t8=f_ebeg();
os("tipos diferentes");
t9=0;
t10=f_eend();
t7=t10;
}else{
t11=0;
t7=t11;
}
t12=0;
t13=f_nt(t12);
v_r=t13;
t14=9;
t15=v_r;
t16=v_i;
t17=v_a;
t18=v_b;
t19=0;
t20=0;
t21=f_ir(t14,t15,t16,t17,t18,t19,t20);
t22=v_r;
return t22;
}
static I f_cand(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I v_a=0;
I v_r=0;
I v_b=0;
t0=f_cx();
v_a=t0;
t1=v_a;
t2=f_ckc(t1);
t3=0;
t4=f_nt(t3);
v_r=t4;
t5=10;
t6=v_r;
t7=v_a;
t8=0;
t9=0;
t10=0;
t11=0;
t12=f_ir(t5,t6,t7,t8,t9,t10,t11);
t13=f_cx();
v_b=t13;
t14=v_b;
t15=f_ckc(t14);
t16=11;
t17=v_r;
t18=v_b;
t19=0;
t20=0;
t21=0;
t22=0;
t23=f_ir(t16,t17,t18,t19,t20,t21,t22);
t24=v_r;
return t24;
}
static I f_cor(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I v_a=0;
I v_r=0;
I v_b=0;
t0=f_cx();
v_a=t0;
t1=v_a;
t2=f_ckc(t1);
t3=0;
t4=f_nt(t3);
v_r=t4;
t5=12;
t6=v_r;
t7=v_a;
t8=0;
t9=0;
t10=0;
t11=0;
t12=f_ir(t5,t6,t7,t8,t9,t10,t11);
t13=f_cx();
v_b=t13;
t14=v_b;
t15=f_ckc(t14);
t16=13;
t17=v_r;
t18=v_b;
t19=0;
t20=0;
t21=0;
t22=0;
t23=f_ir(t16,t17,t18,t19,t20,t21,t22);
t24=v_r;
return t24;
}
static I f_cnot(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I v_a=0;
I v_r=0;
t0=f_cx();
v_a=t0;
t1=v_a;
t2=f_ckc(t1);
t3=0;
t4=f_nt(t3);
v_r=t4;
t5=14;
t6=v_r;
t7=v_a;
t8=0;
t9=0;
t10=0;
t11=0;
t12=f_ir(t5,t6,t7,t8,t9,t10,t11);
t13=v_r;
return t13;
}
static I f_cun(I v_c,I v_ti,I v_to){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I v_a=0;
I v_r=0;
t0=f_cx();
v_a=t0;
t1=v_a;
t2=f_tty(t1);
t3=v_ti;
t4=(t2!=t3)?1:0;
if(t4!=0){
t6=f_ebeg();
t7=v_ti;
if(t7!=0){
os("esperava real");
t9=0;
t8=t9;
}else{
os("esperava inteiro");
t10=0;
t8=t10;
}
t11=f_eend();
t5=t11;
}else{
t12=0;
t5=t12;
}
t13=v_to;
t14=f_nt(t13);
v_r=t14;
t15=15;
t16=v_r;
t17=v_c;
t18=v_a;
t19=0;
t20=0;
t21=0;
t22=f_ir(t15,t16,t17,t18,t19,t20,t21);
t23=v_r;
return t23;
}
static I f_cbf(I v_c){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I v_a=0;
I v_b=0;
I v_r=0;
t0=f_cx();
v_a=t0;
t1=f_cx();
v_b=t1;
t2=v_a;
t3=f_ckflt(t2);
t4=v_b;
t5=f_ckflt(t4);
t6=1;
t7=f_nt(t6);
v_r=t7;
t8=16;
t9=v_r;
t10=v_c;
t11=v_a;
t12=v_b;
t13=0;
t14=0;
t15=f_ir(t8,t9,t10,t11,t12,t13,t14);
t16=v_r;
return t16;
}
static I f_cmm(I v_m){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I v_a=0;
I v_b=0;
I v_r=0;
t0=f_cx();
v_a=t0;
t1=f_cx();
v_b=t1;
t2=v_a;
t3=f_tty(t2);
t4=v_b;
t5=f_tty(t4);
t6=(t3!=t5)?1:0;
if(t6!=0){
t8=f_ebeg();
os("tipos diferentes");
t9=0;
t10=f_eend();
t7=t10;
}else{
t11=0;
t7=t11;
}
t12=v_a;
t13=f_tty(t12);
t14=f_nt(t13);
v_r=t14;
t15=17;
t16=v_r;
t17=v_m;
t18=v_a;
t19=v_b;
t20=0;
t21=0;
t22=f_ir(t15,t16,t17,t18,t19,t20,t21);
t23=v_r;
return t23;
}
static I f_cif(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I v_c=0;
I v_r=0;
I v_a=0;
I v_b=0;
t0=f_cx();
v_c=t0;
t1=v_c;
t2=f_ckc(t1);
t3=0;
t4=f_nt(t3);
v_r=t4;
t5=18;
t6=0;
t7=v_c;
t8=0;
t9=0;
t10=0;
t11=0;
t12=f_ir(t5,t6,t7,t8,t9,t10,t11);
t13=f_cx();
v_a=t13;
t14=19;
t15=v_r;
t16=v_a;
t17=0;
t18=0;
t19=0;
t20=0;
t21=f_ir(t14,t15,t16,t17,t18,t19,t20);
t22=f_cx();
v_b=t22;
t23=20;
t24=v_r;
t25=v_b;
t26=0;
t27=0;
t28=0;
t29=0;
t30=f_ir(t23,t24,t25,t26,t27,t28,t29);
t31=v_a;
t32=f_tty(t31);
t33=v_b;
t34=f_tty(t33);
t35=(t32!=t34)?1:0;
if(t35!=0){
t37=f_ebeg();
os("ramos com tipos diferentes");
t38=0;
t39=f_eend();
t36=t39;
}else{
t40=0;
t36=t40;
}
t41=10;
t42=M[t41];
t43=v_r;
t44=t42+t43;
t45=v_a;
t46=f_tty(t45);
M[t44]=t46;
t47=v_r;
return t47;
}
static I f_cwh(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I v_c=0;
I v_r=0;
t0=21;
t1=0;
t2=0;
t3=0;
t4=0;
t5=0;
t6=0;
t7=f_ir(t0,t1,t2,t3,t4,t5,t6);
t8=f_cx();
v_c=t8;
t9=v_c;
t10=f_ckc(t9);
t11=22;
t12=0;
t13=v_c;
t14=0;
t15=0;
t16=0;
t17=0;
t18=f_ir(t11,t12,t13,t14,t15,t16,t17);
t19=f_cx();
t20=23;
t21=0;
t22=0;
t23=0;
t24=0;
t25=0;
t26=0;
t27=f_ir(t20,t21,t22,t23,t24,t25,t26);
t28=0;
t29=f_nt(t28);
v_r=t29;
t30=4;
t31=v_r;
t32=0;
t33=0;
t34=0;
t35=0;
t36=0;
t37=f_ir(t30,t31,t32,t33,t34,t35,t36);
t38=v_r;
return t38;
}
static I f_cblk(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I v_r=0;
t0=-1;
v_r=t0;
while(1){
t1=7;
t2=M[t1];
t3=4;
t4=M[t3];
t5=(t2>=t4)?1:0;
if(t5!=0){
t7=f_ebeg();
os("falta }");
t8=0;
t9=f_eend();
t6=t9;
}else{
t10=0;
t6=t10;
}
t11=7;
t12=M[t11];
t13=f_tcode(t12);
t14=125;
t15=(t13!=t14)?1:0;
if(t15==0)break;
t16=f_cx();
v_r=t16;
}
t17=0;
t18=7;
t19=7;
t20=M[t19];
t21=1;
t22=t20+t21;
M[t18]=t22;
t23=v_r;
t24=0;
t25=(t23<t24)?1:0;
if(t25!=0){
t27=0;
t28=f_nt(t27);
v_r=t28;
t29=4;
t30=v_r;
t31=0;
t32=0;
t33=0;
t34=0;
t35=0;
t36=f_ir(t29,t30,t31,t32,t33,t34,t35);
t37=v_r;
t26=t37;
}else{
t38=v_r;
t26=t38;
}
return t26;
}
static I f_cset(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I v_n=0;
I v_e=0;
I v_y=0;
I v_j=0;
t0=7;
t1=M[t0];
v_n=t1;
t2=v_n;
t3=4;
t4=M[t3];
t5=(t2>=t4)?1:0;
t6=1;
if(t5==0){
t7=v_n;
t8=f_tkk(t7);
t6=(t8!=0)?1:0;
}
if(t6!=0){
t10=f_ebeg();
os("= precisa de nome");
t11=0;
t12=f_eend();
t9=t12;
}else{
t13=0;
t9=t13;
}
t14=7;
t15=v_n;
t16=1;
t17=t15+t16;
M[t14]=t17;
t18=f_cx();
v_e=t18;
t19=v_e;
t20=f_tty(t19);
v_y=t20;
t21=v_n;
t22=f_floc(t21);
v_j=t22;
t23=v_j;
t24=0;
t25=(t23<t24)?1:0;
if(t25!=0){
t27=v_n;
t28=v_y;
t29=f_addl(t27,t28);
t26=t29;
}else{
t30=v_j;
t31=f_lty(t30);
t32=v_y;
t33=(t31!=t32)?1:0;
if(t33!=0){
t35=f_ebeg();
os("tipo de variavel mudou");
t36=0;
t37=f_eend();
t34=t37;
}else{
t38=0;
t34=t38;
}
t26=t34;
}
t39=6;
t40=0;
t41=v_n;
t42=v_e;
t43=0;
t44=0;
t45=0;
t46=f_ir(t39,t40,t41,t42,t43,t44,t45);
t47=v_e;
return t47;
}
static I f_mname(I v_c){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I t48=0;
I t49=0;
I t50=0;
I t51=0;
I t52=0;
I t53=0;
I t54=0;
I t55=0;
I t56=0;
I t57=0;
I t58=0;
I t59=0;
I t60=0;
I t61=0;
I t62=0;
I t63=0;
I t64=0;
I t65=0;
I t66=0;
I t67=0;
I t68=0;
I t69=0;
I t70=0;
I t71=0;
I t72=0;
I t73=0;
I t74=0;
I t75=0;
I t76=0;
I t77=0;
I t78=0;
I t79=0;
I t80=0;
I t81=0;
I t82=0;
I t83=0;
I t84=0;
I t85=0;
I t86=0;
I t87=0;
I t88=0;
I t89=0;
I t90=0;
I t91=0;
I t92=0;
I t93=0;
I t94=0;
I t95=0;
I t96=0;
I t97=0;
I t98=0;
I t99=0;
I t100=0;
I t101=0;
I t102=0;
I t103=0;
I t104=0;
I t105=0;
I t106=0;
I t107=0;
I t108=0;
I t109=0;
I t110=0;
I t111=0;
I t112=0;
I t113=0;
I t114=0;
I t115=0;
I t116=0;
I t117=0;
I t118=0;
I t119=0;
I t120=0;
t0=f_isjs();
if(t0!=0){
t2=v_c;
t3=0;
t4=(t2==t3)?1:0;
if(t4!=0){
os("+");
t6=0;
t5=t6;
}else{
t7=v_c;
t8=1;
t9=(t7==t8)?1:0;
if(t9!=0){
os("Math.trunc");
t11=0;
t10=t11;
}else{
os("Math.");
t12=0;
t13=v_c;
t14=2;
t15=(t13==t14)?1:0;
if(t15!=0){
os("sqrt");
t17=0;
t16=t17;
}else{
t18=v_c;
t19=3;
t20=(t18==t19)?1:0;
if(t20!=0){
os("sin");
t22=0;
t21=t22;
}else{
t23=v_c;
t24=4;
t25=(t23==t24)?1:0;
if(t25!=0){
os("cos");
t27=0;
t26=t27;
}else{
t28=v_c;
t29=5;
t30=(t28==t29)?1:0;
if(t30!=0){
os("exp");
t32=0;
t31=t32;
}else{
t33=v_c;
t34=6;
t35=(t33==t34)?1:0;
if(t35!=0){
os("log");
t37=0;
t36=t37;
}else{
t38=v_c;
t39=7;
t40=(t38==t39)?1:0;
if(t40!=0){
os("floor");
t42=0;
t41=t42;
}else{
t43=v_c;
t44=8;
t45=(t43==t44)?1:0;
if(t45!=0){
os("abs");
t47=0;
t46=t47;
}else{
t48=v_c;
t49=9;
t50=(t48==t49)?1:0;
if(t50!=0){
os("pow");
t52=0;
t51=t52;
}else{
os("atan2");
t53=0;
t51=t53;
}
t46=t51;
}
t41=t46;
}
t36=t41;
}
t31=t36;
}
t26=t31;
}
t21=t26;
}
t16=t21;
}
t10=t16;
}
t5=t10;
}
t1=t5;
}else{
t54=v_c;
t55=0;
t56=(t54==t55)?1:0;
if(t56!=0){
t58=12;
t59=M[t58];
if(t59!=0){
os("float");
t61=0;
t60=t61;
}else{
os("(F)");
t62=0;
t60=t62;
}
t57=t60;
}else{
t63=v_c;
t64=1;
t65=(t63==t64)?1:0;
if(t65!=0){
t67=12;
t68=M[t67];
if(t68!=0){
os("int");
t70=0;
t69=t70;
}else{
os("(I)");
t71=0;
t69=t71;
}
t66=t69;
}else{
t72=v_c;
t73=2;
t74=(t72==t73)?1:0;
if(t74!=0){
os("sqrt");
t76=0;
t75=t76;
}else{
t77=v_c;
t78=3;
t79=(t77==t78)?1:0;
if(t79!=0){
os("sin");
t81=0;
t80=t81;
}else{
t82=v_c;
t83=4;
t84=(t82==t83)?1:0;
if(t84!=0){
os("cos");
t86=0;
t85=t86;
}else{
t87=v_c;
t88=5;
t89=(t87==t88)?1:0;
if(t89!=0){
os("exp");
t91=0;
t90=t91;
}else{
t92=v_c;
t93=6;
t94=(t92==t93)?1:0;
if(t94!=0){
os("log");
t96=0;
t95=t96;
}else{
t97=v_c;
t98=7;
t99=(t97==t98)?1:0;
if(t99!=0){
os("floor");
t101=0;
t100=t101;
}else{
t102=v_c;
t103=8;
t104=(t102==t103)?1:0;
if(t104!=0){
t106=12;
t107=M[t106];
if(t107!=0){
os("abs");
t109=0;
t108=t109;
}else{
os("fabs");
t110=0;
t108=t110;
}
t105=t108;
}else{
t111=v_c;
t112=9;
t113=(t111==t112)?1:0;
if(t113!=0){
os("pow");
t115=0;
t114=t115;
}else{
t116=12;
t117=M[t116];
if(t117!=0){
os("atan");
t119=0;
t118=t119;
}else{
os("atan2");
t120=0;
t118=t120;
}
t114=t118;
}
t105=t114;
}
t100=t105;
}
t95=t100;
}
t90=t95;
}
t85=t90;
}
t80=t85;
}
t75=t80;
}
t66=t75;
}
t57=t66;
}
t1=t57;
}
return t1;
}
static I f_escs(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I v_s=0;
I v_l=0;
I v_j=0;
I v_c=0;
t0=v_i;
t1=f_tks(t0);
v_s=t1;
t2=v_i;
t3=f_tkl(t2);
v_l=t3;
t4=1;
v_j=t4;
while(1){
t5=v_j;
t6=v_l;
t7=1;
t8=t6-t7;
t9=(t5<t8)?1:0;
if(t9==0)break;
t10=v_s;
t11=v_j;
t12=t10+t11;
t13=M[t12];
v_c=t13;
t14=v_c;
t15=10;
t16=(t14==t15)?1:0;
if(t16!=0){
os("\\n");
t18=0;
t17=t18;
}else{
t19=v_c;
t20=9;
t21=(t19==t20)?1:0;
if(t21!=0){
os("\\t");
t23=0;
t22=t23;
}else{
t24=v_c;
t25=13;
t26=(t24==t25)?1:0;
if(t26!=0){
os("\\r");
t28=0;
t27=t28;
}else{
t29=v_c;
op(t29);
t27=t29;
}
t22=t27;
}
t17=t22;
}
t30=v_j;
t31=1;
t32=t30+t31;
v_j=t32;
}
t33=0;
t34=0;
return t34;
}
static I f_emi(I v_p){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I t48=0;
I t49=0;
I t50=0;
I t51=0;
I t52=0;
I t53=0;
I t54=0;
I t55=0;
I t56=0;
I t57=0;
I t58=0;
I t59=0;
I t60=0;
I t61=0;
I t62=0;
I t63=0;
I t64=0;
I t65=0;
I t66=0;
I t67=0;
I t68=0;
I t69=0;
I t70=0;
I t71=0;
I t72=0;
I t73=0;
I t74=0;
I t75=0;
I t76=0;
I t77=0;
I t78=0;
I t79=0;
I t80=0;
I t81=0;
I t82=0;
I t83=0;
I t84=0;
I t85=0;
I t86=0;
I t87=0;
I t88=0;
I t89=0;
I t90=0;
I t91=0;
I t92=0;
I t93=0;
I t94=0;
I t95=0;
I t96=0;
I t97=0;
I t98=0;
I t99=0;
I t100=0;
I t101=0;
I t102=0;
I t103=0;
I t104=0;
I t105=0;
I t106=0;
I t107=0;
I t108=0;
I t109=0;
I t110=0;
I t111=0;
I t112=0;
I t113=0;
I t114=0;
I t115=0;
I t116=0;
I t117=0;
I t118=0;
I t119=0;
I t120=0;
I t121=0;
I t122=0;
I t123=0;
I t124=0;
I t125=0;
I t126=0;
I t127=0;
I t128=0;
I t129=0;
I t130=0;
I t131=0;
I t132=0;
I t133=0;
I t134=0;
I t135=0;
I t136=0;
I t137=0;
I t138=0;
I t139=0;
I t140=0;
I t141=0;
I t142=0;
I t143=0;
I t144=0;
I t145=0;
I t146=0;
I t147=0;
I t148=0;
I t149=0;
I t150=0;
I t151=0;
I t152=0;
I t153=0;
I t154=0;
I t155=0;
I t156=0;
I t157=0;
I t158=0;
I t159=0;
I t160=0;
I t161=0;
I t162=0;
I t163=0;
I t164=0;
I t165=0;
I t166=0;
I t167=0;
I t168=0;
I t169=0;
I t170=0;
I t171=0;
I t172=0;
I t173=0;
I t174=0;
I t175=0;
I t176=0;
I t177=0;
I t178=0;
I t179=0;
I t180=0;
I t181=0;
I t182=0;
I t183=0;
I t184=0;
I t185=0;
I t186=0;
I t187=0;
I t188=0;
I t189=0;
I t190=0;
I t191=0;
I t192=0;
I t193=0;
I t194=0;
I t195=0;
I t196=0;
I t197=0;
I t198=0;
I t199=0;
I t200=0;
I t201=0;
I t202=0;
I t203=0;
I t204=0;
I t205=0;
I t206=0;
I t207=0;
I t208=0;
I t209=0;
I t210=0;
I t211=0;
I t212=0;
I t213=0;
I t214=0;
I t215=0;
I t216=0;
I t217=0;
I t218=0;
I t219=0;
I t220=0;
I t221=0;
I t222=0;
I t223=0;
I t224=0;
I t225=0;
I t226=0;
I t227=0;
I t228=0;
I t229=0;
I t230=0;
I t231=0;
I t232=0;
I t233=0;
I t234=0;
I t235=0;
I t236=0;
I t237=0;
I t238=0;
I t239=0;
I t240=0;
I t241=0;
I t242=0;
I t243=0;
I t244=0;
I t245=0;
I t246=0;
I t247=0;
I t248=0;
I t249=0;
I t250=0;
I t251=0;
I t252=0;
I t253=0;
I t254=0;
I t255=0;
I t256=0;
I t257=0;
I t258=0;
I t259=0;
I t260=0;
I t261=0;
I t262=0;
I t263=0;
I t264=0;
I t265=0;
I t266=0;
I t267=0;
I t268=0;
I t269=0;
I t270=0;
I t271=0;
I t272=0;
I t273=0;
I t274=0;
I t275=0;
I t276=0;
I t277=0;
I t278=0;
I t279=0;
I t280=0;
I t281=0;
I t282=0;
I t283=0;
I t284=0;
I t285=0;
I t286=0;
I t287=0;
I t288=0;
I t289=0;
I t290=0;
I t291=0;
I t292=0;
I t293=0;
I t294=0;
I t295=0;
I t296=0;
I t297=0;
I t298=0;
I t299=0;
I t300=0;
I t301=0;
I t302=0;
I t303=0;
I t304=0;
I t305=0;
I t306=0;
I t307=0;
I t308=0;
I t309=0;
I t310=0;
I t311=0;
I t312=0;
I t313=0;
I t314=0;
I t315=0;
I t316=0;
I t317=0;
I t318=0;
I t319=0;
I t320=0;
I t321=0;
I t322=0;
I t323=0;
I t324=0;
I t325=0;
I t326=0;
I t327=0;
I t328=0;
I t329=0;
I t330=0;
I t331=0;
I t332=0;
I t333=0;
I t334=0;
I t335=0;
I t336=0;
I t337=0;
I t338=0;
I t339=0;
I t340=0;
I t341=0;
I t342=0;
I t343=0;
I t344=0;
I t345=0;
I t346=0;
I t347=0;
I t348=0;
I t349=0;
I t350=0;
I t351=0;
I t352=0;
I t353=0;
I t354=0;
I t355=0;
I t356=0;
I t357=0;
I t358=0;
I t359=0;
I t360=0;
I t361=0;
I t362=0;
I t363=0;
I t364=0;
I t365=0;
I t366=0;
I t367=0;
I t368=0;
I t369=0;
I t370=0;
I t371=0;
I t372=0;
I t373=0;
I t374=0;
I t375=0;
I t376=0;
I t377=0;
I t378=0;
I t379=0;
I t380=0;
I t381=0;
I t382=0;
I t383=0;
I t384=0;
I t385=0;
I t386=0;
I t387=0;
I t388=0;
I t389=0;
I t390=0;
I t391=0;
I t392=0;
I t393=0;
I t394=0;
I t395=0;
I t396=0;
I t397=0;
I t398=0;
I t399=0;
I t400=0;
I t401=0;
I t402=0;
I t403=0;
I t404=0;
I t405=0;
I t406=0;
I t407=0;
I t408=0;
I t409=0;
I t410=0;
I t411=0;
I t412=0;
I t413=0;
I t414=0;
I t415=0;
I t416=0;
I t417=0;
I t418=0;
I t419=0;
I t420=0;
I t421=0;
I t422=0;
I t423=0;
I t424=0;
I t425=0;
I t426=0;
I t427=0;
I t428=0;
I t429=0;
I t430=0;
I t431=0;
I t432=0;
I t433=0;
I t434=0;
I t435=0;
I t436=0;
I t437=0;
I t438=0;
I t439=0;
I t440=0;
I t441=0;
I t442=0;
I t443=0;
I t444=0;
I t445=0;
I t446=0;
I t447=0;
I t448=0;
I t449=0;
I t450=0;
I t451=0;
I t452=0;
I t453=0;
I t454=0;
I t455=0;
I t456=0;
I t457=0;
I t458=0;
I t459=0;
I t460=0;
I t461=0;
I t462=0;
I t463=0;
I t464=0;
I t465=0;
I t466=0;
I t467=0;
I t468=0;
I t469=0;
I t470=0;
I t471=0;
I t472=0;
I t473=0;
I t474=0;
I t475=0;
I t476=0;
I t477=0;
I t478=0;
I t479=0;
I t480=0;
I t481=0;
I t482=0;
I t483=0;
I t484=0;
I t485=0;
I t486=0;
I t487=0;
I t488=0;
I t489=0;
I t490=0;
I t491=0;
I t492=0;
I t493=0;
I t494=0;
I t495=0;
I t496=0;
I t497=0;
I t498=0;
I t499=0;
I t500=0;
I t501=0;
I t502=0;
I t503=0;
I t504=0;
I t505=0;
I t506=0;
I t507=0;
I t508=0;
I t509=0;
I t510=0;
I t511=0;
I t512=0;
I t513=0;
I t514=0;
I t515=0;
I t516=0;
I t517=0;
I t518=0;
I t519=0;
I t520=0;
I t521=0;
I t522=0;
I t523=0;
I t524=0;
I t525=0;
I t526=0;
I t527=0;
I t528=0;
I t529=0;
I t530=0;
I t531=0;
I t532=0;
I t533=0;
I t534=0;
I t535=0;
I t536=0;
I t537=0;
I t538=0;
I t539=0;
I t540=0;
I t541=0;
I t542=0;
I t543=0;
I t544=0;
I t545=0;
I t546=0;
I t547=0;
I t548=0;
I t549=0;
I t550=0;
I t551=0;
I t552=0;
I t553=0;
I t554=0;
I t555=0;
I t556=0;
I t557=0;
I t558=0;
I t559=0;
I t560=0;
I t561=0;
I t562=0;
I t563=0;
I t564=0;
I t565=0;
I t566=0;
I t567=0;
I v_k=0;
I v_d=0;
I v_a=0;
I v_b=0;
I v_c=0;
I v_x=0;
I v_y=0;
t0=v_p;
t1=M[t0];
v_k=t1;
t2=v_p;
t3=1;
t4=t2+t3;
t5=M[t4];
v_d=t5;
t6=v_p;
t7=2;
t8=t6+t7;
t9=M[t8];
v_a=t9;
t10=v_p;
t11=3;
t12=t10+t11;
t13=M[t12];
v_b=t13;
t14=v_p;
t15=4;
t16=t14+t15;
t17=M[t16];
v_c=t17;
t18=v_p;
t19=5;
t20=t18+t19;
t21=M[t20];
v_x=t21;
t22=v_p;
t23=6;
t24=t22+t23;
t25=M[t24];
v_y=t25;
t26=v_k;
t27=24;
t28=(t26>=t27)?1:0;
t29=0;
if(t28!=0){
t30=v_k;
t31=40;
t32=(t30<=t31)?1:0;
t29=(t32!=0)?1:0;
}
t33=0;
if(t29!=0){
t34=v_k;
t35=39;
t36=(t34!=t35)?1:0;
t33=(t36!=0)?1:0;
}
if(t33!=0){
t38=f_cpu();
t37=t38;
}else{
t39=0;
t37=t39;
}
t40=v_k;
t41=1;
t42=(t40==t41)?1:0;
if(t42!=0){
t44=v_d;
t45=f_eq(t44);
t46=v_a;
t47=f_etx(t46);
os(";\n");
t48=0;
t43=t48;
}else{
t49=v_k;
t50=2;
t51=(t49==t50)?1:0;
if(t51!=0){
t53=v_d;
t54=f_eq(t53);
t55=v_a;
on(t55);
os(";\n");
t56=0;
t52=t56;
}else{
t57=v_k;
t58=3;
t59=(t57==t58)?1:0;
if(t59!=0){
t61=12;
t62=M[t61];
if(t62!=0){
os("\n#error onda: texto so em CPU\n");
t64=0;
t63=t64;
}else{
t65=0;
t63=t65;
}
os("os(\"");
t66=0;
t67=v_a;
t68=f_escs(t67);
os("\");\n");
t69=0;
t60=t69;
}else{
t70=v_k;
t71=4;
t72=(t70==t71)?1:0;
if(t72!=0){
t74=v_d;
t75=f_eq(t74);
t76=v_d;
t77=f_tty(t76);
t78=f_ez(t77);
os(";\n");
t79=0;
t73=t79;
}else{
t80=v_k;
t81=5;
t82=(t80==t81)?1:0;
if(t82!=0){
t84=v_d;
t85=f_eq(t84);
os("v_");
t86=0;
t87=v_a;
t88=f_etx(t87);
os(";\n");
t89=0;
t83=t89;
}else{
t90=v_k;
t91=6;
t92=(t90==t91)?1:0;
if(t92!=0){
os("v_");
t94=0;
t95=v_a;
t96=f_etx(t95);
os("=");
t97=0;
t98=v_b;
t99=f_et(t98);
os(";\n");
t100=0;
t93=t100;
}else{
t101=v_k;
t102=7;
t103=(t101==t102)?1:0;
if(t103!=0){
t105=v_d;
t106=f_eq(t105);
os("f_");
t107=0;
t108=v_a;
t109=0;
t110=f_fe(t108,t109);
t111=M[t110];
t112=f_etx(t111);
os("(");
t113=0;
t114=v_b;
t115=v_c;
t116=0;
t117=f_eargs(t114,t115,t116);
os(");\n");
t118=0;
t104=t118;
}else{
t119=v_k;
t120=8;
t121=(t119==t120)?1:0;
if(t121!=0){
t123=f_isjs();
t124=0;
if(t123!=0){
t125=v_d;
t126=f_tty(t125);
t127=0;
t128=(t126==t127)?1:0;
t129=0;
if(t128!=0){
t130=v_a;
t131=f_tcode(t130);
t132=47;
t133=(t131==t132)?1:0;
t129=(t133!=0)?1:0;
}
t124=(t129!=0)?1:0;
}
if(t124!=0){
t135=v_d;
t136=f_eq(t135);
os("Math.trunc(");
t137=0;
t138=v_b;
t139=f_et(t138);
os("/");
t140=0;
t141=v_c;
t142=f_et(t141);
os(");\n");
t143=0;
t134=t143;
}else{
t144=v_d;
t145=f_eq(t144);
t146=v_b;
t147=f_et(t146);
t148=v_a;
t149=f_etx(t148);
t150=v_c;
t151=f_et(t150);
os(";\n");
t152=0;
t134=t152;
}
t122=t134;
}else{
t153=v_k;
t154=9;
t155=(t153==t154)?1:0;
if(t155!=0){
t157=v_d;
t158=f_eq(t157);
os("(");
t159=0;
t160=v_b;
t161=f_et(t160);
t162=v_a;
t163=f_etx(t162);
t164=v_c;
t165=f_et(t164);
os(")?1:0;\n");
t166=0;
t156=t166;
}else{
t167=v_k;
t168=10;
t169=(t167==t168)?1:0;
if(t169!=0){
t171=v_d;
t172=f_eq(t171);
os("0;\nif(");
t173=0;
t174=v_a;
t175=f_et(t174);
os("!=0){\n");
t176=0;
t170=t176;
}else{
t177=v_k;
t178=11;
t179=(t177==t178)?1:0;
t180=1;
if(t179==0){
t181=v_k;
t182=13;
t183=(t181==t182)?1:0;
t180=(t183!=0)?1:0;
}
if(t180!=0){
t185=v_d;
t186=f_eq(t185);
os("(");
t187=0;
t188=v_a;
t189=f_et(t188);
os("!=0)?1:0;\n}\n");
t190=0;
t184=t190;
}else{
t191=v_k;
t192=12;
t193=(t191==t192)?1:0;
if(t193!=0){
t195=v_d;
t196=f_eq(t195);
os("1;\nif(");
t197=0;
t198=v_a;
t199=f_et(t198);
os("==0){\n");
t200=0;
t194=t200;
}else{
t201=v_k;
t202=14;
t203=(t201==t202)?1:0;
if(t203!=0){
t205=v_d;
t206=f_eq(t205);
os("(");
t207=0;
t208=v_a;
t209=f_et(t208);
os("==0)?1:0;\n");
t210=0;
t204=t210;
}else{
t211=v_k;
t212=15;
t213=(t211==t212)?1:0;
if(t213!=0){
t215=v_d;
t216=f_eq(t215);
t217=v_a;
t218=f_mname(t217);
os("(");
t219=0;
t220=v_b;
t221=f_et(t220);
os(");\n");
t222=0;
t214=t222;
}else{
t223=v_k;
t224=16;
t225=(t223==t224)?1:0;
if(t225!=0){
t227=v_d;
t228=f_eq(t227);
t229=v_a;
t230=f_mname(t229);
os("(");
t231=0;
t232=v_b;
t233=f_et(t232);
os(",");
t234=0;
t235=v_c;
t236=f_et(t235);
os(");\n");
t237=0;
t226=t237;
}else{
t238=v_k;
t239=17;
t240=(t238==t239)?1:0;
if(t240!=0){
t242=v_d;
t243=f_eq(t242);
os("(");
t244=0;
t245=v_b;
t246=f_et(t245);
t247=v_a;
if(t247!=0){
os(">");
t249=0;
t248=t249;
}else{
os("<");
t250=0;
t248=t250;
}
t251=v_c;
t252=f_et(t251);
os(")?");
t253=0;
t254=v_b;
t255=f_et(t254);
os(":");
t256=0;
t257=v_c;
t258=f_et(t257);
os(";\n");
t259=0;
t241=t259;
}else{
t260=v_k;
t261=18;
t262=(t260==t261)?1:0;
if(t262!=0){
os("if(");
t264=0;
t265=v_a;
t266=f_et(t265);
os("!=0){\n");
t267=0;
t263=t267;
}else{
t268=v_k;
t269=19;
t270=(t268==t269)?1:0;
if(t270!=0){
t272=v_d;
t273=f_eq(t272);
t274=v_a;
t275=f_et(t274);
os(";\n}else{\n");
t276=0;
t271=t276;
}else{
t277=v_k;
t278=20;
t279=(t277==t278)?1:0;
if(t279!=0){
t281=v_d;
t282=f_eq(t281);
t283=v_a;
t284=f_et(t283);
os(";\n}\n");
t285=0;
t280=t285;
}else{
t286=v_k;
t287=21;
t288=(t286==t287)?1:0;
if(t288!=0){
t290=12;
t291=M[t290];
if(t291!=0){
os("while(true){\n");
t293=0;
t292=t293;
}else{
os("while(1){\n");
t294=0;
t292=t294;
}
t289=t292;
}else{
t295=v_k;
t296=22;
t297=(t295==t296)?1:0;
if(t297!=0){
os("if(");
t299=0;
t300=v_a;
t301=f_et(t300);
os("==0)break;\n");
t302=0;
t298=t302;
}else{
t303=v_k;
t304=23;
t305=(t303==t304)?1:0;
if(t305!=0){
os("}\n");
t307=0;
t306=t307;
}else{
t308=v_k;
t309=24;
t310=(t308==t309)?1:0;
if(t310!=0){
t312=v_d;
t313=f_eq(t312);
os("M[");
t314=0;
t315=v_a;
t316=f_et(t315);
os("];\n");
t317=0;
t311=t317;
}else{
t318=v_k;
t319=25;
t320=(t318==t319)?1:0;
if(t320!=0){
os("M[");
t322=0;
t323=v_a;
t324=f_et(t323);
os("]=");
t325=0;
t326=v_b;
t327=f_et(t326);
os(";\n");
t328=0;
t321=t328;
}else{
t329=v_k;
t330=26;
t331=(t329==t330)?1:0;
if(t331!=0){
t333=v_d;
t334=f_eq(t333);
os("ldf(");
t335=0;
t336=v_a;
t337=f_et(t336);
os(");\n");
t338=0;
t332=t338;
}else{
t339=v_k;
t340=27;
t341=(t339==t340)?1:0;
if(t341!=0){
os("stf(");
t343=0;
t344=v_a;
t345=f_et(t344);
os(",");
t346=0;
t347=v_b;
t348=f_et(t347);
os(");\n");
t349=0;
t342=t349;
}else{
t350=v_k;
t351=28;
t352=(t350==t351)?1:0;
if(t352!=0){
t354=v_d;
t355=f_eq(t354);
os("oa(");
t356=0;
t357=v_a;
t358=f_et(t357);
os(");\n");
t359=0;
t353=t359;
}else{
t360=v_k;
t361=29;
t362=(t360==t361)?1:0;
if(t362!=0){
os("op(");
t364=0;
t365=v_a;
t366=f_et(t365);
os(");\n");
t367=0;
t363=t367;
}else{
t368=v_k;
t369=30;
t370=(t368==t369)?1:0;
if(t370!=0){
t372=v_d;
t373=f_eq(t372);
os("ir();\n");
t374=0;
t371=t374;
}else{
t375=v_k;
t376=31;
t377=(t375==t376)?1:0;
if(t377!=0){
os("on(");
t379=0;
t380=v_a;
t381=f_et(t380);
os(");\n");
t382=0;
t378=t382;
}else{
t383=v_k;
t384=32;
t385=(t383==t384)?1:0;
if(t385!=0){
os("og(");
t387=0;
t388=v_a;
t389=f_et(t388);
os(");\n");
t390=0;
t386=t390;
}else{
t391=v_k;
t392=33;
t393=(t391==t392)?1:0;
if(t393!=0){
os("osink(");
t395=0;
t396=v_a;
t397=f_et(t396);
os(");\n");
t398=0;
t394=t398;
}else{
t399=v_k;
t400=34;
t401=(t399==t400)?1:0;
if(t401!=0){
t403=v_d;
t404=f_eq(t403);
os("AC;\n");
t405=0;
t402=t405;
}else{
t406=v_k;
t407=35;
t408=(t406==t407)?1:0;
if(t408!=0){
t410=v_d;
t411=f_eq(t410);
os("av(");
t412=0;
t413=v_a;
t414=f_et(t413);
os(",");
t415=0;
t416=v_b;
t417=f_et(t416);
os(");\n");
t418=0;
t409=t418;
}else{
t419=v_k;
t420=36;
t421=(t419==t420)?1:0;
if(t421!=0){
os("oexit(");
t423=0;
t424=v_a;
t425=f_et(t424);
os(");\n");
t426=0;
t422=t426;
}else{
t427=v_k;
t428=37;
t429=(t427==t428)?1:0;
if(t429!=0){
t431=v_d;
t432=f_eq(t431);
os("onow();\n");
t433=0;
t430=t433;
}else{
t434=v_k;
t435=38;
t436=(t434==t435)?1:0;
if(t436!=0){
os("#pragma omp parallel for\nfor(I i=0;i<");
t438=0;
t439=v_b;
t440=f_et(t439);
os(";i++)");
t441=0;
t442=v_c;
t443=3;
t444=f_fe(t442,t443);
t445=M[t444];
if(t445!=0){
os("stf(");
t447=0;
t448=v_a;
t449=f_et(t448);
os("+i,f_");
t450=0;
t451=v_c;
t452=0;
t453=f_fe(t451,t452);
t454=M[t453];
t455=f_etx(t454);
os("(i");
t456=0;
t457=v_x;
t458=v_y;
t459=1;
t460=f_eargs(t457,t458,t459);
os("));\n");
t461=0;
t446=t461;
}else{
os("M[");
t462=0;
t463=v_a;
t464=f_et(t463);
os("+i]=f_");
t465=0;
t466=v_c;
t467=0;
t468=f_fe(t466,t467);
t469=M[t468];
t470=f_etx(t469);
os("(i");
t471=0;
t472=v_x;
t473=v_y;
t474=1;
t475=f_eargs(t472,t473,t474);
os(");\n");
t476=0;
t446=t476;
}
t437=t446;
}else{
t477=v_k;
t478=39;
t479=(t477==t478)?1:0;
if(t479!=0){
t481=v_d;
t482=f_eq(t481);
t483=v_d;
t484=f_tty(t483);
t485=f_ez(t484);
os(";\n");
t486=0;
t487=12;
t488=M[t487];
if(t488!=0){
os("for(");
t490=0;
t491=0;
t492=f_ety(t491);
os(" i=0;i<");
t493=0;
t489=t493;
}else{
os("#pragma omp parallel for reduction(+:");
t494=0;
t495=v_d;
t496=f_et(t495);
os(")\nfor(I i=0;i<");
t497=0;
t489=t497;
}
t498=v_a;
t499=f_et(t498);
os(";i++)");
t500=0;
t501=v_d;
t502=f_et(t501);
os("+=f_");
t503=0;
t504=v_b;
t505=0;
t506=f_fe(t504,t505);
t507=M[t506];
t508=f_etx(t507);
os("(i");
t509=0;
t510=v_c;
t511=v_x;
t512=1;
t513=f_eargs(t510,t511,t512);
os(");\n");
t514=0;
t480=t514;
}else{
t515=v_k;
t516=40;
t517=(t515==t516)?1:0;
if(t517!=0){
t519=v_d;
t520=f_eq(t519);
os("0;\n{unsigned char*g=oimg0(");
t521=0;
t522=v_a;
t523=f_et(t522);
os(",");
t524=0;
t525=v_b;
t526=f_et(t525);
os(");\n#pragma omp parallel for\nfor(I y=0;y<");
t527=0;
t528=v_b;
t529=f_et(t528);
os(";y++)for(I x=0;x<");
t530=0;
t531=v_a;
t532=f_et(t531);
os(";x++){I c=f_");
t533=0;
t534=v_c;
t535=0;
t536=f_fe(t534,t535);
t537=M[t536];
t538=f_etx(t537);
t539=v_c;
t540=0;
t541=f_fpt(t539,t540);
if(t541!=0){
os("((F)x,(F)y");
t543=0;
t542=t543;
}else{
os("(x,y");
t544=0;
t542=t544;
}
t545=v_x;
t546=v_y;
t547=1;
t548=f_eargs(t545,t546,t547);
os(");unsigned char*q=g+3*(y*");
t549=0;
t550=v_a;
t551=f_et(t550);
os("+x);q[0]=(unsigned char)(c>>16);q[1]=(unsigned char)(c>>8);q[2]=(unsigned char)c;}\noimg1(g,");
t552=0;
t553=v_a;
t554=f_et(t553);
os(",");
t555=0;
t556=v_b;
t557=f_et(t556);
os(");}\n");
t558=0;
t518=t558;
}else{
t559=v_k;
t560=41;
t561=(t559==t560)?1:0;
if(t561!=0){
os("return ");
t563=0;
t564=v_a;
t565=f_et(t564);
os(";\n}\n");
t566=0;
t562=t566;
}else{
t567=0;
t562=t567;
}
t518=t562;
}
t480=t518;
}
t437=t480;
}
t430=t437;
}
t422=t430;
}
t409=t422;
}
t402=t409;
}
t394=t402;
}
t386=t394;
}
t378=t386;
}
t371=t378;
}
t363=t371;
}
t353=t363;
}
t342=t353;
}
t332=t342;
}
t321=t332;
}
t311=t321;
}
t306=t311;
}
t298=t306;
}
t289=t298;
}
t280=t289;
}
t271=t280;
}
t263=t271;
}
t241=t263;
}
t226=t241;
}
t214=t226;
}
t204=t214;
}
t194=t204;
}
t184=t194;
}
t170=t184;
}
t156=t170;
}
t122=t156;
}
t104=t122;
}
t93=t104;
}
t83=t93;
}
t73=t83;
}
t60=t73;
}
t52=t60;
}
t43=t52;
}
return t43;
}
static I f_cld(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I v_p=0;
I v_r=0;
t0=f_cx();
v_p=t0;
t1=v_p;
t2=f_ckint(t1);
t3=0;
t4=f_nt(t3);
v_r=t4;
t5=24;
t6=v_r;
t7=v_p;
t8=0;
t9=0;
t10=0;
t11=0;
t12=f_ir(t5,t6,t7,t8,t9,t10,t11);
t13=v_r;
return t13;
}
static I f_cst(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I v_p=0;
I v_v=0;
t0=f_cx();
v_p=t0;
t1=f_cx();
v_v=t1;
t2=v_p;
t3=f_ckint(t2);
t4=v_v;
t5=f_ckint(t4);
t6=25;
t7=0;
t8=v_p;
t9=v_v;
t10=0;
t11=0;
t12=0;
t13=f_ir(t6,t7,t8,t9,t10,t11,t12);
t14=v_v;
return t14;
}
static I f_cldf(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I v_p=0;
I v_r=0;
t0=f_cx();
v_p=t0;
t1=v_p;
t2=f_ckint(t1);
t3=1;
t4=f_nt(t3);
v_r=t4;
t5=26;
t6=v_r;
t7=v_p;
t8=0;
t9=0;
t10=0;
t11=0;
t12=f_ir(t5,t6,t7,t8,t9,t10,t11);
t13=v_r;
return t13;
}
static I f_cstf(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I v_p=0;
I v_v=0;
t0=f_cx();
v_p=t0;
t1=f_cx();
v_v=t1;
t2=v_p;
t3=f_ckint(t2);
t4=v_v;
t5=f_ckflt(t4);
t6=27;
t7=0;
t8=v_p;
t9=v_v;
t10=0;
t11=0;
t12=0;
t13=f_ir(t6,t7,t8,t9,t10,t11,t12);
t14=v_v;
return t14;
}
static I f_calc(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I v_n=0;
I v_r=0;
t0=f_cx();
v_n=t0;
t1=v_n;
t2=f_ckint(t1);
t3=0;
t4=f_nt(t3);
v_r=t4;
t5=28;
t6=v_r;
t7=v_n;
t8=0;
t9=0;
t10=0;
t11=0;
t12=f_ir(t5,t6,t7,t8,t9,t10,t11);
t13=v_r;
return t13;
}
static I f_cput(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I v_x=0;
t0=f_cx();
v_x=t0;
t1=v_x;
t2=f_ckint(t1);
t3=29;
t4=0;
t5=v_x;
t6=0;
t7=0;
t8=0;
t9=0;
t10=f_ir(t3,t4,t5,t6,t7,t8,t9);
t11=v_x;
return t11;
}
static I f_crd(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I v_r=0;
t0=0;
t1=f_nt(t0);
v_r=t1;
t2=30;
t3=v_r;
t4=0;
t5=0;
t6=0;
t7=0;
t8=0;
t9=f_ir(t2,t3,t4,t5,t6,t7,t8);
t10=v_r;
return t10;
}
static I f_cnum(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I v_x=0;
t0=f_cx();
v_x=t0;
t1=v_x;
t2=f_ckint(t1);
t3=31;
t4=0;
t5=v_x;
t6=0;
t7=0;
t8=0;
t9=0;
t10=f_ir(t3,t4,t5,t6,t7,t8,t9);
t11=v_x;
return t11;
}
static I f_cgf(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I v_x=0;
t0=f_cx();
v_x=t0;
t1=v_x;
t2=f_ckflt(t1);
t3=32;
t4=0;
t5=v_x;
t6=0;
t7=0;
t8=0;
t9=0;
t10=f_ir(t3,t4,t5,t6,t7,t8,t9);
t11=v_x;
return t11;
}
static I f_csnk(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I v_p=0;
t0=f_cx();
v_p=t0;
t1=v_p;
t2=f_ckint(t1);
t3=33;
t4=0;
t5=v_p;
t6=0;
t7=0;
t8=0;
t9=0;
t10=f_ir(t3,t4,t5,t6,t7,t8,t9);
t11=v_p;
return t11;
}
static I f_cac(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I v_r=0;
t0=0;
t1=f_nt(t0);
v_r=t1;
t2=34;
t3=v_r;
t4=0;
t5=0;
t6=0;
t7=0;
t8=0;
t9=f_ir(t2,t3,t4,t5,t6,t7,t8);
t10=v_r;
return t10;
}
static I f_cav(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I v_a=0;
I v_b=0;
I v_r=0;
t0=f_cx();
v_a=t0;
t1=f_cx();
v_b=t1;
t2=v_a;
t3=f_ckint(t2);
t4=v_b;
t5=f_ckint(t4);
t6=0;
t7=f_nt(t6);
v_r=t7;
t8=35;
t9=v_r;
t10=v_a;
t11=v_b;
t12=0;
t13=0;
t14=0;
t15=f_ir(t8,t9,t10,t11,t12,t13,t14);
t16=v_r;
return t16;
}
static I f_cex(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I v_c=0;
t0=f_cx();
v_c=t0;
t1=v_c;
t2=f_ckint(t1);
t3=36;
t4=0;
t5=v_c;
t6=0;
t7=0;
t8=0;
t9=0;
t10=f_ir(t3,t4,t5,t6,t7,t8,t9);
t11=v_c;
return t11;
}
static I f_ctm(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I v_r=0;
t0=0;
t1=f_nt(t0);
v_r=t1;
t2=37;
t3=v_r;
t4=0;
t5=0;
t6=0;
t7=0;
t8=0;
t9=f_ir(t2,t3,t4,t5,t6,t7,t8);
t10=v_r;
return t10;
}
static I f_fref(I v_m){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I v_i=0;
I v_k=0;
t0=7;
t1=M[t0];
v_i=t1;
t2=v_i;
t3=4;
t4=M[t3];
t5=(t2>=t4)?1:0;
if(t5!=0){
t7=f_ebeg();
os("falta funcao");
t8=0;
t9=f_eend();
t6=t9;
}else{
t10=0;
t6=t10;
}
t11=7;
t12=v_i;
t13=1;
t14=t12+t13;
M[t11]=t14;
t15=v_i;
t16=f_tkk(t15);
if(t16!=0){
t18=-1;
t17=t18;
}else{
t19=v_i;
t20=f_ffun(t19);
t17=t20;
}
v_k=t17;
t21=v_k;
t22=0;
t23=(t21<t22)?1:0;
if(t23!=0){
t25=7;
t26=v_i;
M[t25]=t26;
t27=f_ebeg();
os("esperava funcao");
t28=0;
t29=f_eend();
t24=t29;
}else{
t30=0;
t24=t30;
}
t31=v_k;
t32=2;
t33=f_fe(t31,t32);
t34=M[t33];
t35=v_m;
t36=(t34<t35)?1:0;
if(t36!=0){
t38=f_ebeg();
os("funcao com poucos parametros");
t39=0;
t40=f_eend();
t37=t40;
}else{
t41=0;
t37=t41;
}
t42=v_k;
t43=f_edge(t42);
t44=v_k;
return t44;
}
static I f_ce(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I v_d=0;
I v_n=0;
I v_k=0;
I v_a=0;
t0=f_cx();
v_d=t0;
t1=f_cx();
v_n=t1;
t2=v_d;
t3=f_ckint(t2);
t4=v_n;
t5=f_ckint(t4);
t6=1;
t7=f_fref(t6);
v_k=t7;
t8=v_k;
t9=0;
t10=f_fpt(t8,t9);
if(t10!=0){
t12=f_ebeg();
os("indice deve ser inteiro");
t13=0;
t14=f_eend();
t11=t14;
}else{
t15=0;
t11=t15;
}
t16=v_k;
t17=1;
t18=f_cargs(t16,t17);
v_a=t18;
t19=38;
t20=0;
t21=v_d;
t22=v_n;
t23=v_k;
t24=v_a;
t25=v_k;
t26=2;
t27=f_fe(t25,t26);
t28=M[t27];
t29=1;
t30=t28-t29;
t31=f_ir(t19,t20,t21,t22,t23,t24,t30);
t32=v_d;
return t32;
}
static I f_cs(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I v_n=0;
I v_k=0;
I v_a=0;
I v_r=0;
t0=f_cx();
v_n=t0;
t1=v_n;
t2=f_ckint(t1);
t3=1;
t4=f_fref(t3);
v_k=t4;
t5=v_k;
t6=0;
t7=f_fpt(t5,t6);
if(t7!=0){
t9=f_ebeg();
os("indice deve ser inteiro");
t10=0;
t11=f_eend();
t8=t11;
}else{
t12=0;
t8=t12;
}
t13=v_k;
t14=1;
t15=f_cargs(t13,t14);
v_a=t15;
t16=v_k;
t17=3;
t18=f_fe(t16,t17);
t19=M[t18];
t20=f_nt(t19);
v_r=t20;
t21=39;
t22=v_r;
t23=v_n;
t24=v_k;
t25=v_a;
t26=v_k;
t27=2;
t28=f_fe(t26,t27);
t29=M[t28];
t30=1;
t31=t29-t30;
t32=0;
t33=f_ir(t21,t22,t23,t24,t25,t31,t32);
t34=v_r;
return t34;
}
static I f_cd(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I v_w=0;
I v_h=0;
I v_k=0;
I v_a=0;
I v_r=0;
t0=f_cx();
v_w=t0;
t1=f_cx();
v_h=t1;
t2=v_w;
t3=f_ckint(t2);
t4=v_h;
t5=f_ckint(t4);
t6=2;
t7=f_fref(t6);
v_k=t7;
t8=v_k;
t9=0;
t10=f_fpt(t8,t9);
t11=v_k;
t12=1;
t13=f_fpt(t11,t12);
t14=(t10!=t13)?1:0;
t15=1;
if(t14==0){
t16=v_k;
t17=3;
t18=f_fe(t16,t17);
t19=M[t18];
t15=(t19!=0)?1:0;
}
if(t15!=0){
t21=f_ebeg();
os("funcao de pixel invalida");
t22=0;
t23=f_eend();
t20=t23;
}else{
t24=0;
t20=t24;
}
t25=v_k;
t26=2;
t27=f_cargs(t25,t26);
v_a=t27;
t28=0;
t29=f_nt(t28);
v_r=t29;
t30=40;
t31=v_r;
t32=v_w;
t33=v_h;
t34=v_k;
t35=v_a;
t36=v_k;
t37=2;
t38=f_fe(t36,t37);
t39=M[t38];
t40=2;
t41=t39-t40;
t42=f_ir(t30,t31,t32,t33,t34,t35,t41);
t43=v_r;
return t43;
}
static I f_cop(I v_i){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I t48=0;
I t49=0;
I t50=0;
I t51=0;
I t52=0;
I t53=0;
I t54=0;
I t55=0;
I t56=0;
I t57=0;
I t58=0;
I t59=0;
I t60=0;
I t61=0;
I t62=0;
I t63=0;
I t64=0;
I t65=0;
I t66=0;
I t67=0;
I t68=0;
I t69=0;
I t70=0;
I t71=0;
I t72=0;
I t73=0;
I t74=0;
I t75=0;
I t76=0;
I t77=0;
I t78=0;
I t79=0;
I t80=0;
I t81=0;
I t82=0;
I t83=0;
I t84=0;
I t85=0;
I t86=0;
I t87=0;
I t88=0;
I t89=0;
I t90=0;
I t91=0;
I t92=0;
I t93=0;
I t94=0;
I t95=0;
I t96=0;
I t97=0;
I t98=0;
I t99=0;
I t100=0;
I t101=0;
I t102=0;
I t103=0;
I t104=0;
I t105=0;
I t106=0;
I t107=0;
I t108=0;
I t109=0;
I t110=0;
I t111=0;
I t112=0;
I t113=0;
I t114=0;
I t115=0;
I t116=0;
I t117=0;
I t118=0;
I t119=0;
I t120=0;
I t121=0;
I t122=0;
I t123=0;
I t124=0;
I t125=0;
I t126=0;
I t127=0;
I t128=0;
I t129=0;
I t130=0;
I t131=0;
I t132=0;
I t133=0;
I t134=0;
I t135=0;
I t136=0;
I t137=0;
I t138=0;
I t139=0;
I t140=0;
I t141=0;
I t142=0;
I t143=0;
I t144=0;
I t145=0;
I t146=0;
I t147=0;
I t148=0;
I t149=0;
I t150=0;
I t151=0;
I t152=0;
I t153=0;
I t154=0;
I t155=0;
I t156=0;
I t157=0;
I t158=0;
I t159=0;
I t160=0;
I t161=0;
I t162=0;
I t163=0;
I t164=0;
I t165=0;
I t166=0;
I t167=0;
I t168=0;
I t169=0;
I t170=0;
I t171=0;
I t172=0;
I t173=0;
I t174=0;
I t175=0;
I t176=0;
I t177=0;
I t178=0;
I t179=0;
I t180=0;
I t181=0;
I t182=0;
I t183=0;
I t184=0;
I t185=0;
I t186=0;
I t187=0;
I t188=0;
I t189=0;
I t190=0;
I t191=0;
I t192=0;
I t193=0;
I t194=0;
I t195=0;
I t196=0;
I t197=0;
I t198=0;
I t199=0;
I t200=0;
I t201=0;
I t202=0;
I t203=0;
I t204=0;
I t205=0;
I t206=0;
I t207=0;
I t208=0;
I t209=0;
I t210=0;
I t211=0;
I t212=0;
I t213=0;
I t214=0;
I t215=0;
I t216=0;
I t217=0;
I t218=0;
I t219=0;
I t220=0;
I t221=0;
I t222=0;
I t223=0;
I t224=0;
I t225=0;
I t226=0;
I t227=0;
I t228=0;
I t229=0;
I t230=0;
I t231=0;
I t232=0;
I t233=0;
I t234=0;
I t235=0;
I t236=0;
I t237=0;
I t238=0;
I t239=0;
I t240=0;
I t241=0;
I t242=0;
I t243=0;
I t244=0;
I t245=0;
I t246=0;
I t247=0;
I t248=0;
I t249=0;
I t250=0;
I t251=0;
I t252=0;
I t253=0;
I t254=0;
I t255=0;
I t256=0;
I t257=0;
I t258=0;
I t259=0;
I t260=0;
I t261=0;
I t262=0;
I t263=0;
I t264=0;
I t265=0;
I t266=0;
I t267=0;
I t268=0;
I t269=0;
I t270=0;
I t271=0;
I t272=0;
I t273=0;
I v_o=0;
t0=v_i;
t1=f_tcode(t0);
v_o=t1;
t2=v_o;
t3=f_isar(t2);
if(t3!=0){
t5=v_i;
t6=2;
t7=f_cbin(t5,t6);
t4=t7;
}else{
t8=v_o;
t9=f_isbi(t8);
if(t9!=0){
t11=v_i;
t12=0;
t13=f_cbin(t11,t12);
t10=t13;
}else{
t14=v_o;
t15=f_iscm(t14);
if(t15!=0){
t17=v_i;
t18=f_ccmp(t17);
t16=t18;
}else{
t19=v_o;
t20=38;
t21=38;
t22=f_k2(t20,t21);
t23=(t19==t22)?1:0;
if(t23!=0){
t25=f_cand();
t24=t25;
}else{
t26=v_o;
t27=124;
t28=124;
t29=f_k2(t27,t28);
t30=(t26==t29)?1:0;
if(t30!=0){
t32=f_cor();
t31=t32;
}else{
t33=v_o;
t34=126;
t35=(t33==t34)?1:0;
if(t35!=0){
t37=f_cnot();
t36=t37;
}else{
t38=v_o;
t39=70;
t40=(t38==t39)?1:0;
if(t40!=0){
t42=0;
t43=0;
t44=1;
t45=f_cun(t42,t43,t44);
t41=t45;
}else{
t46=v_o;
t47=73;
t48=(t46==t47)?1:0;
if(t48!=0){
t50=1;
t51=1;
t52=0;
t53=f_cun(t50,t51,t52);
t49=t53;
}else{
t54=v_o;
t55=83;
t56=113;
t57=f_k2(t55,t56);
t58=(t54==t57)?1:0;
if(t58!=0){
t60=2;
t61=1;
t62=1;
t63=f_cun(t60,t61,t62);
t59=t63;
}else{
t64=v_o;
t65=83;
t66=110;
t67=f_k2(t65,t66);
t68=(t64==t67)?1:0;
if(t68!=0){
t70=3;
t71=1;
t72=1;
t73=f_cun(t70,t71,t72);
t69=t73;
}else{
t74=v_o;
t75=67;
t76=115;
t77=f_k2(t75,t76);
t78=(t74==t77)?1:0;
if(t78!=0){
t80=4;
t81=1;
t82=1;
t83=f_cun(t80,t81,t82);
t79=t83;
}else{
t84=v_o;
t85=69;
t86=120;
t87=f_k2(t85,t86);
t88=(t84==t87)?1:0;
if(t88!=0){
t90=5;
t91=1;
t92=1;
t93=f_cun(t90,t91,t92);
t89=t93;
}else{
t94=v_o;
t95=76;
t96=103;
t97=f_k2(t95,t96);
t98=(t94==t97)?1:0;
if(t98!=0){
t100=6;
t101=1;
t102=1;
t103=f_cun(t100,t101,t102);
t99=t103;
}else{
t104=v_o;
t105=70;
t106=108;
t107=f_k2(t105,t106);
t108=(t104==t107)?1:0;
if(t108!=0){
t110=7;
t111=1;
t112=1;
t113=f_cun(t110,t111,t112);
t109=t113;
}else{
t114=v_o;
t115=65;
t116=98;
t117=f_k2(t115,t116);
t118=(t114==t117)?1:0;
if(t118!=0){
t120=8;
t121=1;
t122=1;
t123=f_cun(t120,t121,t122);
t119=t123;
}else{
t124=v_o;
t125=80;
t126=119;
t127=f_k2(t125,t126);
t128=(t124==t127)?1:0;
if(t128!=0){
t130=9;
t131=f_cbf(t130);
t129=t131;
}else{
t132=v_o;
t133=65;
t134=116;
t135=f_k2(t133,t134);
t136=(t132==t135)?1:0;
if(t136!=0){
t138=10;
t139=f_cbf(t138);
t137=t139;
}else{
t140=v_o;
t141=77;
t142=110;
t143=f_k2(t141,t142);
t144=(t140==t143)?1:0;
if(t144!=0){
t146=0;
t147=f_cmm(t146);
t145=t147;
}else{
t148=v_o;
t149=77;
t150=120;
t151=f_k2(t149,t150);
t152=(t148==t151)?1:0;
if(t152!=0){
t154=1;
t155=f_cmm(t154);
t153=t155;
}else{
t156=v_o;
t157=63;
t158=(t156==t157)?1:0;
if(t158!=0){
t160=f_cif();
t159=t160;
}else{
t161=v_o;
t162=87;
t163=(t161==t162)?1:0;
if(t163!=0){
t165=f_cwh();
t164=t165;
}else{
t166=v_o;
t167=123;
t168=(t166==t167)?1:0;
if(t168!=0){
t170=f_cblk();
t169=t170;
}else{
t171=v_o;
t172=61;
t173=(t171==t172)?1:0;
if(t173!=0){
t175=f_cset();
t174=t175;
}else{
t176=v_o;
t177=64;
t178=(t176==t177)?1:0;
if(t178!=0){
t180=f_cld();
t179=t180;
}else{
t181=v_o;
t182=33;
t183=(t181==t182)?1:0;
if(t183!=0){
t185=f_cst();
t184=t185;
}else{
t186=v_o;
t187=64;
t188=102;
t189=f_k2(t187,t188);
t190=(t186==t189)?1:0;
if(t190!=0){
t192=f_cldf();
t191=t192;
}else{
t193=v_o;
t194=33;
t195=102;
t196=f_k2(t194,t195);
t197=(t193==t196)?1:0;
if(t197!=0){
t199=f_cstf();
t198=t199;
}else{
t200=v_o;
t201=65;
t202=(t200==t201)?1:0;
if(t202!=0){
t204=f_calc();
t203=t204;
}else{
t205=v_o;
t206=80;
t207=(t205==t206)?1:0;
if(t207!=0){
t209=f_cput();
t208=t209;
}else{
t210=v_o;
t211=82;
t212=(t210==t211)?1:0;
if(t212!=0){
t214=f_crd();
t213=t214;
}else{
t215=v_o;
t216=78;
t217=(t215==t216)?1:0;
if(t217!=0){
t219=f_cnum();
t218=t219;
}else{
t220=v_o;
t221=71;
t222=(t220==t221)?1:0;
if(t222!=0){
t224=f_cgf();
t223=t224;
}else{
t225=v_o;
t226=79;
t227=(t225==t226)?1:0;
if(t227!=0){
t229=f_csnk();
t228=t229;
}else{
t230=v_o;
t231=65;
t232=99;
t233=f_k2(t231,t232);
t234=(t230==t233)?1:0;
if(t234!=0){
t236=f_cac();
t235=t236;
}else{
t237=v_o;
t238=65;
t239=118;
t240=f_k2(t238,t239);
t241=(t237==t240)?1:0;
if(t241!=0){
t243=f_cav();
t242=t243;
}else{
t244=v_o;
t245=88;
t246=(t244==t245)?1:0;
if(t246!=0){
t248=f_cex();
t247=t248;
}else{
t249=v_o;
t250=84;
t251=(t249==t250)?1:0;
if(t251!=0){
t253=f_ctm();
t252=t253;
}else{
t254=v_o;
t255=69;
t256=(t254==t255)?1:0;
if(t256!=0){
t258=f_ce();
t257=t258;
}else{
t259=v_o;
t260=83;
t261=(t259==t260)?1:0;
if(t261!=0){
t263=f_cs();
t262=t263;
}else{
t264=v_o;
t265=68;
t266=(t264==t265)?1:0;
if(t266!=0){
t268=f_cd();
t267=t268;
}else{
t269=7;
t270=v_i;
M[t269]=t270;
t271=f_ebeg();
os("operacao desconhecida");
t272=0;
t273=f_eend();
t267=t273;
}
t262=t267;
}
t257=t262;
}
t252=t257;
}
t247=t252;
}
t242=t247;
}
t235=t242;
}
t228=t235;
}
t223=t228;
}
t218=t223;
}
t213=t218;
}
t208=t213;
}
t203=t208;
}
t198=t203;
}
t191=t198;
}
t184=t191;
}
t179=t184;
}
t174=t179;
}
t169=t174;
}
t164=t169;
}
t159=t164;
}
t153=t159;
}
t145=t153;
}
t137=t145;
}
t129=t137;
}
t119=t129;
}
t109=t119;
}
t99=t109;
}
t89=t99;
}
t79=t89;
}
t69=t79;
}
t59=t69;
}
t49=t59;
}
t41=t49;
}
t36=t41;
}
t31=t36;
}
t24=t31;
}
t16=t24;
}
t10=t16;
}
t4=t10;
}
return t4;
}
static I f_rdall(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I v_s=0;
I v_n=0;
I v_c=0;
t0=1;
t1=M[t0];
v_s=t1;
t2=0;
v_n=t2;
t3=ir();
v_c=t3;
while(1){
t4=v_c;
t5=0;
t6=(t4>=t5)?1:0;
if(t6==0)break;
t7=v_n;
t8=1000000;
t9=(t7>=t8)?1:0;
if(t9!=0){
t11=f_ebeg();
os("fonte grande demais");
t12=0;
t13=f_eend();
t10=t13;
}else{
t14=0;
t10=t14;
}
t15=v_s;
t16=v_n;
t17=t15+t16;
t18=v_c;
M[t17]=t18;
t19=v_n;
t20=1;
t21=t19+t20;
v_n=t21;
t22=ir();
v_c=t22;
}
t23=0;
t24=2;
t25=v_n;
M[t24]=t25;
return t25;
}
static I f_ismain(I v_k){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I v_t=0;
t0=v_k;
t1=0;
t2=f_fe(t0,t1);
t3=M[t2];
v_t=t3;
t4=v_t;
t5=f_tkl(t4);
t6=4;
t7=(t5==t6)?1:0;
t8=0;
if(t7!=0){
t9=v_t;
t10=0;
t11=f_tc(t9,t10);
t12=109;
t13=(t11==t12)?1:0;
t14=0;
if(t13!=0){
t15=v_t;
t16=1;
t17=f_tc(t15,t16);
t18=97;
t19=(t17==t18)?1:0;
t14=(t19!=0)?1:0;
}
t20=0;
if(t14!=0){
t21=v_t;
t22=2;
t23=f_tc(t21,t22);
t24=105;
t25=(t23==t24)?1:0;
t26=0;
if(t25!=0){
t27=v_t;
t28=3;
t29=f_tc(t27,t28);
t30=110;
t31=(t29==t30)?1:0;
t26=(t31!=0)?1:0;
}
t20=(t26!=0)?1:0;
}
t8=(t20!=0)?1:0;
}
return t8;
}
static I f_argeq(I v_k){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I v_t=0;
I v_l=0;
I v_j=0;
I v_r=0;
t0=v_k;
t1=0;
t2=f_fe(t0,t1);
t3=M[t2];
v_t=t3;
t4=v_t;
t5=f_tkl(t4);
v_l=t5;
t6=0;
v_j=t6;
t7=1;
v_r=t7;
while(1){
t8=v_r;
t9=0;
if(t8!=0){
t10=v_j;
t11=v_l;
t12=(t10<t11)?1:0;
t9=(t12!=0)?1:0;
}
if(t9==0)break;
t13=v_t;
t14=v_j;
t15=f_tc(t13,t14);
t16=2;
t17=v_j;
t18=av(t16,t17);
t19=(t15!=t18)?1:0;
if(t19!=0){
t21=0;
v_r=t21;
t20=t21;
}else{
t22=0;
t20=t22;
}
t23=v_j;
t24=1;
t25=t23+t24;
v_j=t25;
}
t26=0;
t27=v_r;
t28=0;
if(t27!=0){
t29=2;
t30=v_l;
t31=av(t29,t30);
t32=0;
t33=(t31==t32)?1:0;
t28=(t33!=0)?1:0;
}
return t28;
}
static I f_emitf(I v_k){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
t0=v_k;
t1=6;
t2=f_fe(t0,t1);
t3=M[t2];
t4=v_k;
t5=7;
t6=f_fe(t4,t5);
t7=M[t6];
t8=v_k;
t9=6;
t10=f_fe(t8,t9);
t11=M[t10];
t12=t7-t11;
t13=f_ew(t3,t12);
t14=v_k;
t15=8;
t16=f_fe(t14,t15);
t17=M[t16];
t18=v_k;
t19=9;
t20=f_fe(t18,t19);
t21=M[t20];
t22=v_k;
t23=8;
t24=f_fe(t22,t23);
t25=M[t24];
t26=t21-t25;
t27=f_ew(t17,t26);
return t27;
}
static I f_outc(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I v_k=0;
t0=f_prel();
t1=0;
v_k=t1;
while(1){
t2=v_k;
t3=6;
t4=M[t3];
t5=(t2<t4)?1:0;
if(t5==0)break;
t6=v_k;
t7=f_sighdr(t6);
os(";\n");
t8=0;
t9=v_k;
t10=1;
t11=t9+t10;
v_k=t11;
}
t12=0;
t13=0;
v_k=t13;
while(1){
t14=v_k;
t15=6;
t16=M[t15];
t17=(t14<t16)?1:0;
if(t17==0)break;
t18=v_k;
t19=f_emitf(t18);
t20=v_k;
t21=1;
t22=t20+t21;
v_k=t22;
}
t23=0;
os("int main(int c,char**v){oinit(c,v);I r=f_main();oflush();return (int)r;}\n");
t24=0;
return t24;
}
static I f_reach(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I t48=0;
I t49=0;
I t50=0;
I t51=0;
I t52=0;
I t53=0;
I t54=0;
I t55=0;
I t56=0;
I t57=0;
I t58=0;
I t59=0;
I t60=0;
I t61=0;
I t62=0;
I t63=0;
I t64=0;
I t65=0;
I t66=0;
I t67=0;
I t68=0;
I t69=0;
I t70=0;
I t71=0;
I t72=0;
I t73=0;
I t74=0;
I t75=0;
I t76=0;
I t77=0;
I t78=0;
I t79=0;
I t80=0;
I t81=0;
I t82=0;
I t83=0;
I t84=0;
I t85=0;
I t86=0;
I t87=0;
I t88=0;
I t89=0;
I t90=0;
I t91=0;
I t92=0;
I t93=0;
I t94=0;
I v_e=0;
I v_k=0;
I v_ch=0;
I v_j=0;
I v_p=0;
t0=-1;
v_e=t0;
t1=0;
v_k=t1;
while(1){
t2=v_k;
t3=6;
t4=M[t3];
t5=(t2<t4)?1:0;
if(t5==0)break;
t6=v_k;
t7=f_argeq(t6);
if(t7!=0){
t9=v_k;
v_e=t9;
t8=t9;
}else{
t10=0;
t8=t10;
}
t11=v_k;
t12=1;
t13=t11+t12;
v_k=t13;
}
t14=0;
t15=v_e;
t16=0;
t17=(t15<t16)?1:0;
if(t17!=0){
t19=f_ebeg();
os("funcao de entrada desconhecida");
t20=0;
t21=f_eend();
t18=t21;
}else{
t22=0;
t18=t22;
}
t23=v_e;
t24=2;
t25=f_fe(t23,t24);
t26=M[t25];
t27=2;
t28=(t26<t27)?1:0;
t29=1;
if(t28==0){
t30=v_e;
t31=0;
t32=f_fpt(t30,t31);
t33=v_e;
t34=1;
t35=f_fpt(t33,t34);
t36=(t32!=t35)?1:0;
t29=(t36!=0)?1:0;
}
t37=1;
if(t29==0){
t38=v_e;
t39=3;
t40=f_fe(t38,t39);
t41=M[t40];
t37=(t41!=0)?1:0;
}
if(t37!=0){
t43=f_ebeg();
os("funcao de pixel invalida");
t44=0;
t45=f_eend();
t42=t45;
}else{
t46=0;
t42=t46;
}
t47=v_e;
t48=10;
t49=f_fe(t47,t48);
t50=1;
M[t49]=t50;
t51=1;
v_ch=t51;
while(1){
t52=v_ch;
if(t52==0)break;
t53=0;
v_ch=t53;
t54=0;
v_j=t54;
while(1){
t55=v_j;
t56=15;
t57=M[t56];
t58=(t55<t57)?1:0;
if(t58==0)break;
t59=14;
t60=M[t59];
t61=v_j;
t62=2;
t63=t61*t62;
t64=t60+t63;
v_p=t64;
t65=v_p;
t66=M[t65];
t67=10;
t68=f_fe(t66,t67);
t69=M[t68];
t70=0;
if(t69!=0){
t71=v_p;
t72=1;
t73=t71+t72;
t74=M[t73];
t75=10;
t76=f_fe(t74,t75);
t77=M[t76];
t78=(t77==0)?1:0;
t70=(t78!=0)?1:0;
}
if(t70!=0){
t80=v_p;
t81=1;
t82=t80+t81;
t83=M[t82];
t84=10;
t85=f_fe(t83,t84);
t86=1;
M[t85]=t86;
t87=1;
v_ch=t87;
t79=t87;
}else{
t88=0;
t79=t88;
}
t89=v_j;
t90=1;
t91=t89+t90;
v_j=t91;
}
t92=0;
}
t93=0;
t94=v_e;
return t94;
}
static I f_outj(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I v_e=0;
I v_k=0;
t0=f_reach();
v_e=t0;
t1=0;
v_k=t1;
while(1){
t2=v_k;
t3=6;
t4=M[t3];
t5=(t2<t4)?1:0;
if(t5==0)break;
t6=v_k;
t7=10;
t8=f_fe(t6,t7);
t9=M[t8];
if(t9!=0){
t11=v_k;
t12=f_emitf(t11);
t10=t12;
}else{
t13=0;
t10=t13;
}
t14=v_k;
t15=1;
t16=t14+t15;
v_k=t16;
}
t17=0;
os("return f_");
t18=0;
t19=v_e;
t20=0;
t21=f_fe(t19,t20);
t22=M[t21];
t23=f_etx(t22);
os(";\n");
t24=0;
return t24;
}
static I f_outg(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I t48=0;
I t49=0;
I t50=0;
I t51=0;
I t52=0;
I t53=0;
I t54=0;
I t55=0;
I t56=0;
I t57=0;
I t58=0;
I t59=0;
I t60=0;
I t61=0;
I t62=0;
I t63=0;
I t64=0;
I t65=0;
I t66=0;
I t67=0;
I t68=0;
I t69=0;
I t70=0;
I t71=0;
I t72=0;
I t73=0;
I t74=0;
I v_e=0;
I v_k=0;
I v_j=0;
t0=f_reach();
v_e=t0;
os("#version 300 es\nprecision highp float;\nprecision highp int;\nuniform float u[8];\nout vec4 oc;\n");
t1=0;
t2=0;
v_k=t2;
while(1){
t3=v_k;
t4=6;
t5=M[t4];
t6=(t3<t5)?1:0;
if(t6==0)break;
t7=v_k;
t8=10;
t9=f_fe(t7,t8);
t10=M[t9];
if(t10!=0){
t12=v_k;
t13=f_sighdr(t12);
os(";\n");
t14=0;
t11=t14;
}else{
t15=0;
t11=t15;
}
t16=v_k;
t17=1;
t18=t16+t17;
v_k=t18;
}
t19=0;
t20=0;
v_k=t20;
while(1){
t21=v_k;
t22=6;
t23=M[t22];
t24=(t21<t23)?1:0;
if(t24==0)break;
t25=v_k;
t26=10;
t27=f_fe(t25,t26);
t28=M[t27];
if(t28!=0){
t30=v_k;
t31=f_emitf(t30);
t29=t31;
}else{
t32=0;
t29=t32;
}
t33=v_k;
t34=1;
t35=t33+t34;
v_k=t35;
}
t36=0;
os("void main(){int c=f_");
t37=0;
t38=v_e;
t39=0;
t40=f_fe(t38,t39);
t41=M[t40];
t42=f_etx(t41);
t43=v_e;
t44=0;
t45=f_fpt(t43,t44);
if(t45!=0){
os("(floor(gl_FragCoord.x),u[2]-1.0-floor(gl_FragCoord.y)");
t47=0;
t46=t47;
}else{
os("(int(gl_FragCoord.x),int(u[2])-1-int(gl_FragCoord.y)");
t48=0;
t46=t48;
}
t49=2;
v_j=t49;
while(1){
t50=v_j;
t51=v_e;
t52=2;
t53=f_fe(t51,t52);
t54=M[t53];
t55=(t50<t54)?1:0;
if(t55==0)break;
t56=v_e;
t57=v_j;
t58=f_fpt(t56,t57);
if(t58!=0){
os(",u[");
t60=0;
t61=v_j;
t62=2;
t63=t61-t62;
on(t63);
os("]");
t64=0;
t59=t64;
}else{
os(",int(u[");
t65=0;
t66=v_j;
t67=2;
t68=t66-t67;
on(t68);
os("])");
t69=0;
t59=t69;
}
t70=v_j;
t71=1;
t72=t70+t71;
v_j=t72;
}
t73=0;
os(");oc=vec4(float((c>>16)&255),float((c>>8)&255),float(c&255),255.0)/255.0;}\n");
t74=0;
return t74;
}
static I f_main(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I t6=0;
I t7=0;
I t8=0;
I t9=0;
I t10=0;
I t11=0;
I t12=0;
I t13=0;
I t14=0;
I t15=0;
I t16=0;
I t17=0;
I t18=0;
I t19=0;
I t20=0;
I t21=0;
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
I t28=0;
I t29=0;
I t30=0;
I t31=0;
I t32=0;
I t33=0;
I t34=0;
I t35=0;
I t36=0;
I t37=0;
I t38=0;
I t39=0;
I t40=0;
I t41=0;
I t42=0;
I t43=0;
I t44=0;
I t45=0;
I t46=0;
I t47=0;
I t48=0;
I t49=0;
I t50=0;
I t51=0;
I t52=0;
I t53=0;
I t54=0;
I t55=0;
I t56=0;
I t57=0;
I t58=0;
I t59=0;
I t60=0;
I t61=0;
I t62=0;
I t63=0;
I t64=0;
I t65=0;
I t66=0;
I t67=0;
I t68=0;
I t69=0;
I t70=0;
I t71=0;
I t72=0;
I t73=0;
I t74=0;
I t75=0;
I t76=0;
I t77=0;
I t78=0;
I t79=0;
I t80=0;
I t81=0;
I t82=0;
I t83=0;
I t84=0;
I t85=0;
I t86=0;
I t87=0;
I t88=0;
I t89=0;
I t90=0;
I t91=0;
I t92=0;
I t93=0;
I t94=0;
I t95=0;
I t96=0;
I t97=0;
I t98=0;
I t99=0;
I t100=0;
I t101=0;
I t102=0;
I t103=0;
I t104=0;
I t105=0;
I t106=0;
I t107=0;
I t108=0;
I t109=0;
I t110=0;
I t111=0;
I t112=0;
I t113=0;
I t114=0;
I t115=0;
I t116=0;
I t117=0;
I t118=0;
I t119=0;
I t120=0;
I v_m=0;
I v_k=0;
t0=12;
t1=1;
t2=0;
t3=av(t1,t2);
t4=45;
t5=(t3==t4)?1:0;
t6=0;
if(t5!=0){
t7=1;
t8=1;
t9=av(t7,t8);
t10=103;
t11=(t9==t10)?1:0;
t6=(t11!=0)?1:0;
}
if(t6!=0){
t13=1;
t12=t13;
}else{
t14=1;
t15=0;
t16=av(t14,t15);
t17=45;
t18=(t16==t17)?1:0;
t19=0;
if(t18!=0){
t20=1;
t21=1;
t22=av(t20,t21);
t23=106;
t24=(t22==t23)?1:0;
t19=(t24!=0)?1:0;
}
if(t19!=0){
t26=2;
t25=t26;
}else{
t27=0;
t25=t27;
}
t12=t25;
}
M[t0]=t12;
t28=1;
t29=1000000;
t30=oa(t29);
M[t28]=t30;
t31=f_rdall();
t32=3;
t33=3;
t34=3;
t35=2;
t36=M[t35];
t37=t34*t36;
t38=t33+t37;
t39=oa(t38);
M[t32]=t39;
t40=5;
t41=120000;
t42=oa(t41);
M[t40]=t42;
t43=8;
t44=40000;
t45=oa(t44);
M[t43]=t45;
t46=10;
t47=400000;
t48=oa(t47);
M[t46]=t48;
t49=14;
t50=400000;
t51=oa(t50);
M[t49]=t51;
t52=16;
t53=3000000;
t54=oa(t53);
M[t52]=t54;
t55=17;
t56=1500000;
t57=oa(t56);
M[t55]=t57;
t58=18;
t59=800000;
t60=oa(t59);
M[t58]=t60;
t61=f_lex();
t62=f_pre();
t63=0;
v_m=t63;
t64=0;
v_k=t64;
while(1){
t65=v_k;
t66=6;
t67=M[t66];
t68=(t65<t67)?1:0;
if(t68==0)break;
t69=v_k;
t70=f_ismain(t69);
t71=0;
if(t70!=0){
t72=v_k;
t73=2;
t74=f_fe(t72,t73);
t75=M[t74];
t76=0;
t77=(t75==t76)?1:0;
t78=0;
if(t77!=0){
t79=v_k;
t80=3;
t81=f_fe(t79,t80);
t82=M[t81];
t83=0;
t84=(t82==t83)?1:0;
t78=(t84!=0)?1:0;
}
t71=(t78!=0)?1:0;
}
if(t71!=0){
t86=1;
v_m=t86;
t85=t86;
}else{
t87=0;
t85=t87;
}
t88=v_k;
t89=1;
t90=t88+t89;
v_k=t90;
}
t91=0;
t92=v_m;
t93=1;
if(t92==0){
t94=12;
t95=M[t94];
t93=(t95!=0)?1:0;
}
if(t93!=0){
t97=0;
t96=t97;
}else{
t98=f_ebeg();
os("falta : main >i");
t99=0;
t100=f_eend();
t96=t100;
}
t101=0;
v_k=t101;
while(1){
t102=v_k;
t103=6;
t104=M[t103];
t105=(t102<t104)?1:0;
if(t105==0)break;
t106=v_k;
t107=f_cfun(t106);
t108=v_k;
t109=1;
t110=t108+t109;
v_k=t110;
}
t111=0;
t112=f_isjs();
if(t112!=0){
t114=f_outj();
t113=t114;
}else{
t115=12;
t116=M[t115];
if(t116!=0){
t118=f_outg();
t117=t118;
}else{
t119=f_outc();
t117=t119;
}
t113=t117;
}
t120=0;
return t120;
}
int main(int c,char**v){oinit(c,v);I r=f_main();oflush();return (int)r;}
