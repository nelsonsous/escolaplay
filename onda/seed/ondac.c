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
static I f_sighdr(I v_k);
static I f_cfun(I v_k);
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
static I f_mname(I v_c);
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
t6=v_k;
t7=2;
t8=f_fe(t6,t7);
t9=M[t8];
v_np=t9;
t10=0;
v_j=t10;
while(1){
t11=v_j;
t12=v_np;
t13=(t11<t12)?1:0;
if(t13==0)break;
t14=v_k;
t15=4;
t16=f_fe(t14,t15);
t17=M[t16];
t18=v_j;
t19=t17+t18;
t20=v_k;
t21=v_j;
t22=f_fpt(t20,t21);
t23=f_addl(t19,t22);
t24=v_j;
t25=1;
t26=t24+t25;
v_j=t26;
}
t27=0;
t28=7;
t29=v_k;
t30=5;
t31=f_fe(t29,t30);
t32=M[t31];
M[t28]=t32;
t33=16;
osink(t33);
t34=v_k;
t35=8;
t36=f_fe(t34,t35);
t37=16;
t38=M[t37];
M[t36]=t38;
t39=f_cx();
v_r=t39;
t40=v_r;
t41=f_tty(t40);
t42=v_k;
t43=3;
t44=f_fe(t42,t43);
t45=M[t44];
t46=(t41!=t45)?1:0;
if(t46!=0){
t48=f_ebeg();
os("tipo de retorno errado");
t49=0;
t50=f_eend();
t47=t50;
}else{
t51=0;
t47=t51;
}
t52=7;
t53=M[t52];
t54=4;
t55=M[t54];
t56=(t53<t55)?1:0;
t57=0;
if(t56!=0){
t58=7;
t59=M[t58];
t60=f_tcode(t59);
t61=58;
t62=(t60!=t61)?1:0;
t57=(t62!=0)?1:0;
}
if(t57!=0){
t64=f_ebeg();
os("tokens a mais");
t65=0;
t66=f_eend();
t63=t66;
}else{
t67=0;
t63=t67;
}
os("return ");
t68=0;
t69=v_r;
t70=f_et(t69);
os(";\n}\n");
t71=0;
t72=v_k;
t73=9;
t74=f_fe(t72,t73);
t75=16;
t76=M[t75];
M[t74]=t76;
t77=17;
osink(t77);
t78=v_k;
t79=6;
t80=f_fe(t78,t79);
t81=17;
t82=M[t81];
M[t80]=t82;
t83=v_k;
t84=f_sighdr(t83);
os("{\n");
t85=0;
t86=0;
v_j=t86;
while(1){
t87=v_j;
t88=11;
t89=M[t88];
t90=(t87<t89)?1:0;
if(t90==0)break;
t91=v_j;
t92=f_tty(t91);
t93=f_ety(t92);
os(" ");
t94=0;
t95=v_j;
t96=f_et(t95);
os("=");
t97=0;
t98=v_j;
t99=f_tty(t98);
t100=f_ez(t99);
os(";\n");
t101=0;
t102=v_j;
t103=1;
t104=t102+t103;
v_j=t104;
}
t105=0;
t106=v_np;
v_j=t106;
while(1){
t107=v_j;
t108=9;
t109=M[t108];
t110=(t107<t109)?1:0;
if(t110==0)break;
t111=v_j;
t112=f_lty(t111);
t113=f_ety(t112);
os(" v_");
t114=0;
t115=v_j;
t116=f_lnm(t115);
t117=f_etx(t116);
os("=");
t118=0;
t119=v_j;
t120=f_lty(t119);
t121=f_ez(t120);
os(";\n");
t122=0;
t123=v_j;
t124=1;
t125=t123+t124;
v_j=t125;
}
t126=0;
t127=v_k;
t128=7;
t129=f_fe(t127,t128);
t130=17;
t131=M[t130];
M[t129]=t131;
t132=0;
osink(t132);
return t132;
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
I v_r=0;
t0=v_y;
t1=f_nt(t0);
v_r=t1;
t2=v_r;
t3=f_eq(t2);
t4=v_i;
t5=f_etx(t4);
os(";\n");
t6=0;
t7=v_r;
return t7;
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
t11=v_r;
t12=f_eq(t11);
t13=v_i;
t14=1;
t15=f_tc(t13,t14);
on(t15);
os(";\n");
t16=0;
t17=v_r;
return t17;
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
I v_s=0;
I v_l=0;
I v_j=0;
I v_c=0;
I v_r=0;
t0=12;
t1=M[t0];
if(t1!=0){
os("\n#error onda: texto so em CPU\n");
t3=0;
t2=t3;
}else{
t4=0;
t2=t4;
}
os("os(\"");
t5=0;
t6=v_i;
t7=f_tks(t6);
v_s=t7;
t8=v_i;
t9=f_tkl(t8);
v_l=t9;
t10=1;
v_j=t10;
while(1){
t11=v_j;
t12=v_l;
t13=1;
t14=t12-t13;
t15=(t11<t14)?1:0;
if(t15==0)break;
t16=v_s;
t17=v_j;
t18=t16+t17;
t19=M[t18];
v_c=t19;
t20=v_c;
t21=10;
t22=(t20==t21)?1:0;
if(t22!=0){
os("\\n");
t24=0;
t23=t24;
}else{
t25=v_c;
t26=9;
t27=(t25==t26)?1:0;
if(t27!=0){
os("\\t");
t29=0;
t28=t29;
}else{
t30=v_c;
t31=13;
t32=(t30==t31)?1:0;
if(t32!=0){
os("\\r");
t34=0;
t33=t34;
}else{
t35=v_c;
op(t35);
t33=t35;
}
t28=t33;
}
t23=t28;
}
t36=v_j;
t37=1;
t38=t36+t37;
v_j=t38;
}
t39=0;
os("\");\n");
t40=0;
t41=0;
t42=f_nt(t41);
v_r=t42;
t43=v_r;
t44=f_eq(t43);
os("0;\n");
t45=0;
t46=v_r;
return t46;
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
I t22=0;
I t23=0;
I t24=0;
I t25=0;
I t26=0;
I t27=0;
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
t8=v_r;
t9=f_eq(t8);
os("f_");
t10=0;
t11=v_k;
t12=0;
t13=f_fe(t11,t12);
t14=M[t13];
t15=f_etx(t14);
os("(");
t16=0;
t17=v_a;
t18=v_k;
t19=2;
t20=f_fe(t18,t19);
t21=M[t20];
t22=0;
t23=f_eargs(t17,t21,t22);
os(");\n");
t24=0;
t25=v_k;
t26=f_edge(t25);
t27=v_r;
return t27;
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
t9=v_r;
t10=f_eq(t9);
os("v_");
t11=0;
t12=v_i;
t13=f_etx(t12);
os(";\n");
t14=0;
t15=v_r;
t5=t15;
}else{
t16=v_i;
t17=f_ffun(t16);
v_k=t17;
t18=v_k;
t19=0;
t20=(t18<t19)?1:0;
if(t20!=0){
t22=7;
t23=v_i;
M[t22]=t23;
t24=f_ebeg();
os("nome desconhecido");
t25=0;
t26=f_eend();
t21=t26;
}else{
t27=0;
t21=t27;
}
t28=v_k;
t29=f_ccall(t28);
t5=t29;
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
t27=f_isjs();
t28=0;
if(t27!=0){
t29=v_y;
t30=0;
t31=(t29==t30)?1:0;
t32=0;
if(t31!=0){
t33=v_i;
t34=f_tcode(t33);
t35=47;
t36=(t34==t35)?1:0;
t32=(t36!=0)?1:0;
}
t28=(t32!=0)?1:0;
}
if(t28!=0){
t38=v_r;
t39=f_eq(t38);
os("Math.trunc(");
t40=0;
t41=v_a;
t42=f_et(t41);
os("/");
t43=0;
t44=v_b;
t45=f_et(t44);
os(");\n");
t46=0;
t37=t46;
}else{
t47=v_r;
t48=f_eq(t47);
t49=v_a;
t50=f_et(t49);
t51=v_i;
t52=f_etx(t51);
t53=v_b;
t54=f_et(t53);
os(";\n");
t55=0;
t37=t55;
}
t56=v_r;
return t56;
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
I t23=0;
I t24=0;
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
t14=v_r;
t15=f_eq(t14);
os("(");
t16=0;
t17=v_a;
t18=f_et(t17);
t19=v_i;
t20=f_etx(t19);
t21=v_b;
t22=f_et(t21);
os(")?1:0;\n");
t23=0;
t24=v_r;
return t24;
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
t5=v_r;
t6=f_eq(t5);
os("0;\nif(");
t7=0;
t8=v_a;
t9=f_et(t8);
os("!=0){\n");
t10=0;
t11=f_cx();
v_b=t11;
t12=v_b;
t13=f_ckc(t12);
t14=v_r;
t15=f_eq(t14);
os("(");
t16=0;
t17=v_b;
t18=f_et(t17);
os("!=0)?1:0;\n}\n");
t19=0;
t20=v_r;
return t20;
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
t5=v_r;
t6=f_eq(t5);
os("1;\nif(");
t7=0;
t8=v_a;
t9=f_et(t8);
os("==0){\n");
t10=0;
t11=f_cx();
v_b=t11;
t12=v_b;
t13=f_ckc(t12);
t14=v_r;
t15=f_eq(t14);
os("(");
t16=0;
t17=v_b;
t18=f_et(t17);
os("!=0)?1:0;\n}\n");
t19=0;
t20=v_r;
return t20;
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
I v_a=0;
I v_r=0;
t0=f_cx();
v_a=t0;
t1=v_a;
t2=f_ckc(t1);
t3=0;
t4=f_nt(t3);
v_r=t4;
t5=v_r;
t6=f_eq(t5);
os("(");
t7=0;
t8=v_a;
t9=f_et(t8);
os("==0)?1:0;\n");
t10=0;
t11=v_r;
return t11;
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
t15=v_r;
t16=f_eq(t15);
t17=v_c;
t18=f_mname(t17);
os("(");
t19=0;
t20=v_a;
t21=f_et(t20);
os(");\n");
t22=0;
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
I t17=0;
I t18=0;
I t19=0;
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
t8=v_r;
t9=f_eq(t8);
t10=v_c;
t11=f_mname(t10);
os("(");
t12=0;
t13=v_a;
t14=f_et(t13);
os(",");
t15=0;
t16=v_b;
t17=f_et(t16);
os(");\n");
t18=0;
t19=v_r;
return t19;
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
t15=v_r;
t16=f_eq(t15);
os("(");
t17=0;
t18=v_a;
t19=f_et(t18);
t20=v_m;
if(t20!=0){
os(">");
t22=0;
t21=t22;
}else{
os("<");
t23=0;
t21=t23;
}
t24=v_b;
t25=f_et(t24);
os(")?");
t26=0;
t27=v_a;
t28=f_et(t27);
os(":");
t29=0;
t30=v_b;
t31=f_et(t30);
os(";\n");
t32=0;
t33=v_r;
return t33;
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
os("if(");
t5=0;
t6=v_c;
t7=f_et(t6);
os("!=0){\n");
t8=0;
t9=f_cx();
v_a=t9;
t10=v_r;
t11=f_eq(t10);
t12=v_a;
t13=f_et(t12);
os(";\n}else{\n");
t14=0;
t15=f_cx();
v_b=t15;
t16=v_r;
t17=f_eq(t16);
t18=v_b;
t19=f_et(t18);
os(";\n}\n");
t20=0;
t21=v_a;
t22=f_tty(t21);
t23=v_b;
t24=f_tty(t23);
t25=(t22!=t24)?1:0;
if(t25!=0){
t27=f_ebeg();
os("ramos com tipos diferentes");
t28=0;
t29=f_eend();
t26=t29;
}else{
t30=0;
t26=t30;
}
t31=10;
t32=M[t31];
t33=v_r;
t34=t32+t33;
t35=v_a;
t36=f_tty(t35);
M[t34]=t36;
t37=v_r;
return t37;
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
I v_c=0;
I v_r=0;
t0=12;
t1=M[t0];
if(t1!=0){
os("while(true){\n");
t3=0;
t2=t3;
}else{
os("while(1){\n");
t4=0;
t2=t4;
}
t5=f_cx();
v_c=t5;
t6=v_c;
t7=f_ckc(t6);
os("if(");
t8=0;
t9=v_c;
t10=f_et(t9);
os("==0)break;\n");
t11=0;
t12=f_cx();
os("}\n");
t13=0;
t14=0;
t15=f_nt(t14);
v_r=t15;
t16=v_r;
t17=f_eq(t16);
os("0;\n");
t18=0;
t19=v_r;
return t19;
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
t29=v_r;
t30=f_eq(t29);
os("0;\n");
t31=0;
t32=v_r;
t26=t32;
}else{
t33=v_r;
t26=t33;
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
os("v_");
t39=0;
t40=v_n;
t41=f_etx(t40);
os("=");
t42=0;
t43=v_e;
t44=f_et(t43);
os(";\n");
t45=0;
t46=v_e;
return t46;
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
I v_p=0;
I v_r=0;
t0=f_cx();
v_p=t0;
t1=v_p;
t2=f_ckint(t1);
t3=0;
t4=f_nt(t3);
v_r=t4;
t5=v_r;
t6=f_eq(t5);
os("M[");
t7=0;
t8=v_p;
t9=f_et(t8);
os("];\n");
t10=0;
t11=v_r;
return t11;
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
os("M[");
t6=0;
t7=v_p;
t8=f_et(t7);
os("]=");
t9=0;
t10=v_v;
t11=f_et(t10);
os(";\n");
t12=0;
t13=v_v;
return t13;
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
I v_p=0;
I v_r=0;
t0=f_cx();
v_p=t0;
t1=v_p;
t2=f_ckint(t1);
t3=1;
t4=f_nt(t3);
v_r=t4;
t5=v_r;
t6=f_eq(t5);
os("ldf(");
t7=0;
t8=v_p;
t9=f_et(t8);
os(");\n");
t10=0;
t11=v_r;
return t11;
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
os("stf(");
t6=0;
t7=v_p;
t8=f_et(t7);
os(",");
t9=0;
t10=v_v;
t11=f_et(t10);
os(");\n");
t12=0;
t13=v_v;
return t13;
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
I v_n=0;
I v_r=0;
t0=f_cx();
v_n=t0;
t1=v_n;
t2=f_ckint(t1);
t3=0;
t4=f_nt(t3);
v_r=t4;
t5=v_r;
t6=f_eq(t5);
os("oa(");
t7=0;
t8=v_n;
t9=f_et(t8);
os(");\n");
t10=0;
t11=v_r;
return t11;
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
I v_x=0;
t0=f_cx();
v_x=t0;
t1=v_x;
t2=f_ckint(t1);
os("op(");
t3=0;
t4=v_x;
t5=f_et(t4);
os(");\n");
t6=0;
t7=v_x;
return t7;
}
static I f_crd(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I v_r=0;
t0=0;
t1=f_nt(t0);
v_r=t1;
t2=v_r;
t3=f_eq(t2);
os("ir();\n");
t4=0;
t5=v_r;
return t5;
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
I v_x=0;
t0=f_cx();
v_x=t0;
t1=v_x;
t2=f_ckint(t1);
os("on(");
t3=0;
t4=v_x;
t5=f_et(t4);
os(");\n");
t6=0;
t7=v_x;
return t7;
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
I v_x=0;
t0=f_cx();
v_x=t0;
t1=v_x;
t2=f_ckflt(t1);
os("og(");
t3=0;
t4=v_x;
t5=f_et(t4);
os(");\n");
t6=0;
t7=v_x;
return t7;
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
I v_p=0;
t0=f_cx();
v_p=t0;
t1=v_p;
t2=f_ckint(t1);
os("osink(");
t3=0;
t4=v_p;
t5=f_et(t4);
os(");\n");
t6=0;
t7=v_p;
return t7;
}
static I f_cac(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I v_r=0;
t0=0;
t1=f_nt(t0);
v_r=t1;
t2=v_r;
t3=f_eq(t2);
os("AC;\n");
t4=0;
t5=v_r;
return t5;
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
I t17=0;
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
t8=v_r;
t9=f_eq(t8);
os("av(");
t10=0;
t11=v_a;
t12=f_et(t11);
os(",");
t13=0;
t14=v_b;
t15=f_et(t14);
os(");\n");
t16=0;
t17=v_r;
return t17;
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
I v_c=0;
t0=f_cx();
v_c=t0;
t1=v_c;
t2=f_ckint(t1);
os("oexit(");
t3=0;
t4=v_c;
t5=f_et(t4);
os(");\n");
t6=0;
t7=v_c;
return t7;
}
static I f_ctm(void){
I t0=0;
I t1=0;
I t2=0;
I t3=0;
I t4=0;
I t5=0;
I v_r=0;
t0=0;
t1=f_nt(t0);
v_r=t1;
t2=v_r;
t3=f_eq(t2);
os("onow();\n");
t4=0;
t5=v_r;
return t5;
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
os("#pragma omp parallel for\nfor(I i=0;i<");
t19=0;
t20=v_n;
t21=f_et(t20);
os(";i++)");
t22=0;
t23=v_k;
t24=3;
t25=f_fe(t23,t24);
t26=M[t25];
if(t26!=0){
os("stf(");
t28=0;
t29=v_d;
t30=f_et(t29);
os("+i,f_");
t31=0;
t32=v_k;
t33=0;
t34=f_fe(t32,t33);
t35=M[t34];
t36=f_etx(t35);
os("(i");
t37=0;
t38=v_a;
t39=v_k;
t40=2;
t41=f_fe(t39,t40);
t42=M[t41];
t43=1;
t44=t42-t43;
t45=1;
t46=f_eargs(t38,t44,t45);
os("));\n");
t47=0;
t27=t47;
}else{
os("M[");
t48=0;
t49=v_d;
t50=f_et(t49);
os("+i]=f_");
t51=0;
t52=v_k;
t53=0;
t54=f_fe(t52,t53);
t55=M[t54];
t56=f_etx(t55);
os("(i");
t57=0;
t58=v_a;
t59=v_k;
t60=2;
t61=f_fe(t59,t60);
t62=M[t61];
t63=1;
t64=t62-t63;
t65=1;
t66=f_eargs(t58,t64,t65);
os(");\n");
t67=0;
t27=t67;
}
t68=v_d;
return t68;
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
I v_n=0;
I v_k=0;
I v_a=0;
I v_y=0;
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
v_y=t19;
t20=v_y;
t21=f_nt(t20);
v_r=t21;
t22=v_r;
t23=f_eq(t22);
t24=v_y;
t25=f_ez(t24);
os(";\n");
t26=0;
t27=12;
t28=M[t27];
if(t28!=0){
os("for(");
t30=0;
t31=0;
t32=f_ety(t31);
os(" i=0;i<");
t33=0;
t29=t33;
}else{
os("#pragma omp parallel for reduction(+:");
t34=0;
t35=v_r;
t36=f_et(t35);
os(")\nfor(I i=0;i<");
t37=0;
t29=t37;
}
t38=v_n;
t39=f_et(t38);
os(";i++)");
t40=0;
t41=v_r;
t42=f_et(t41);
os("+=f_");
t43=0;
t44=v_k;
t45=0;
t46=f_fe(t44,t45);
t47=M[t46];
t48=f_etx(t47);
os("(i");
t49=0;
t50=v_a;
t51=v_k;
t52=2;
t53=f_fe(t51,t52);
t54=M[t53];
t55=1;
t56=t54-t55;
t57=1;
t58=f_eargs(t50,t56,t57);
os(");\n");
t59=0;
t60=v_r;
return t60;
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
t30=v_r;
t31=f_eq(t30);
os("0;\n{unsigned char*g=oimg0(");
t32=0;
t33=v_w;
t34=f_et(t33);
os(",");
t35=0;
t36=v_h;
t37=f_et(t36);
os(");\n#pragma omp parallel for\nfor(I y=0;y<");
t38=0;
t39=v_h;
t40=f_et(t39);
os(";y++)for(I x=0;x<");
t41=0;
t42=v_w;
t43=f_et(t42);
os(";x++){I c=f_");
t44=0;
t45=v_k;
t46=0;
t47=f_fe(t45,t46);
t48=M[t47];
t49=f_etx(t48);
t50=v_k;
t51=0;
t52=f_fpt(t50,t51);
if(t52!=0){
os("((F)x,(F)y");
t54=0;
t53=t54;
}else{
os("(x,y");
t55=0;
t53=t55;
}
t56=v_a;
t57=v_k;
t58=2;
t59=f_fe(t57,t58);
t60=M[t59];
t61=2;
t62=t60-t61;
t63=1;
t64=f_eargs(t56,t62,t63);
os(");unsigned char*q=g+3*(y*");
t65=0;
t66=v_w;
t67=f_et(t66);
os("+x);q[0]=(unsigned char)(c>>16);q[1]=(unsigned char)(c>>8);q[2]=(unsigned char)c;}\noimg1(g,");
t68=0;
t69=v_w;
t70=f_et(t69);
os(",");
t71=0;
t72=v_h;
t73=f_et(t72);
os(");}\n");
t74=0;
t75=v_r;
return t75;
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
t180=f_cpu();
t181=f_cld();
t179=t181;
}else{
t182=v_o;
t183=33;
t184=(t182==t183)?1:0;
if(t184!=0){
t186=f_cpu();
t187=f_cst();
t185=t187;
}else{
t188=v_o;
t189=64;
t190=102;
t191=f_k2(t189,t190);
t192=(t188==t191)?1:0;
if(t192!=0){
t194=f_cpu();
t195=f_cldf();
t193=t195;
}else{
t196=v_o;
t197=33;
t198=102;
t199=f_k2(t197,t198);
t200=(t196==t199)?1:0;
if(t200!=0){
t202=f_cpu();
t203=f_cstf();
t201=t203;
}else{
t204=v_o;
t205=65;
t206=(t204==t205)?1:0;
if(t206!=0){
t208=f_cpu();
t209=f_calc();
t207=t209;
}else{
t210=v_o;
t211=80;
t212=(t210==t211)?1:0;
if(t212!=0){
t214=f_cpu();
t215=f_cput();
t213=t215;
}else{
t216=v_o;
t217=82;
t218=(t216==t217)?1:0;
if(t218!=0){
t220=f_cpu();
t221=f_crd();
t219=t221;
}else{
t222=v_o;
t223=78;
t224=(t222==t223)?1:0;
if(t224!=0){
t226=f_cpu();
t227=f_cnum();
t225=t227;
}else{
t228=v_o;
t229=71;
t230=(t228==t229)?1:0;
if(t230!=0){
t232=f_cpu();
t233=f_cgf();
t231=t233;
}else{
t234=v_o;
t235=79;
t236=(t234==t235)?1:0;
if(t236!=0){
t238=f_cpu();
t239=f_csnk();
t237=t239;
}else{
t240=v_o;
t241=65;
t242=99;
t243=f_k2(t241,t242);
t244=(t240==t243)?1:0;
if(t244!=0){
t246=f_cpu();
t247=f_cac();
t245=t247;
}else{
t248=v_o;
t249=65;
t250=118;
t251=f_k2(t249,t250);
t252=(t248==t251)?1:0;
if(t252!=0){
t254=f_cpu();
t255=f_cav();
t253=t255;
}else{
t256=v_o;
t257=88;
t258=(t256==t257)?1:0;
if(t258!=0){
t260=f_cpu();
t261=f_cex();
t259=t261;
}else{
t262=v_o;
t263=84;
t264=(t262==t263)?1:0;
if(t264!=0){
t266=f_cpu();
t267=f_ctm();
t265=t267;
}else{
t268=v_o;
t269=69;
t270=(t268==t269)?1:0;
if(t270!=0){
t272=f_cpu();
t273=f_ce();
t271=t273;
}else{
t274=v_o;
t275=83;
t276=(t274==t275)?1:0;
if(t276!=0){
t278=f_cs();
t277=t278;
}else{
t279=v_o;
t280=68;
t281=(t279==t280)?1:0;
if(t281!=0){
t283=f_cpu();
t284=f_cd();
t282=t284;
}else{
t285=7;
t286=v_i;
M[t285]=t286;
t287=f_ebeg();
os("operacao desconhecida");
t288=0;
t289=f_eend();
t282=t289;
}
t277=t282;
}
t271=t277;
}
t265=t271;
}
t259=t265;
}
t253=t259;
}
t245=t253;
}
t237=t245;
}
t231=t237;
}
t225=t231;
}
t219=t225;
}
t213=t219;
}
t207=t213;
}
t201=t207;
}
t193=t201;
}
t185=t193;
}
t179=t185;
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
t53=5000000;
t54=oa(t53);
M[t52]=t54;
t55=17;
t56=1500000;
t57=oa(t56);
M[t55]=t57;
t58=f_lex();
t59=f_pre();
t60=0;
v_m=t60;
t61=0;
v_k=t61;
while(1){
t62=v_k;
t63=6;
t64=M[t63];
t65=(t62<t64)?1:0;
if(t65==0)break;
t66=v_k;
t67=f_ismain(t66);
t68=0;
if(t67!=0){
t69=v_k;
t70=2;
t71=f_fe(t69,t70);
t72=M[t71];
t73=0;
t74=(t72==t73)?1:0;
t75=0;
if(t74!=0){
t76=v_k;
t77=3;
t78=f_fe(t76,t77);
t79=M[t78];
t80=0;
t81=(t79==t80)?1:0;
t75=(t81!=0)?1:0;
}
t68=(t75!=0)?1:0;
}
if(t68!=0){
t83=1;
v_m=t83;
t82=t83;
}else{
t84=0;
t82=t84;
}
t85=v_k;
t86=1;
t87=t85+t86;
v_k=t87;
}
t88=0;
t89=v_m;
t90=1;
if(t89==0){
t91=12;
t92=M[t91];
t90=(t92!=0)?1:0;
}
if(t90!=0){
t94=0;
t93=t94;
}else{
t95=f_ebeg();
os("falta : main >i");
t96=0;
t97=f_eend();
t93=t97;
}
t98=0;
v_k=t98;
while(1){
t99=v_k;
t100=6;
t101=M[t100];
t102=(t99<t101)?1:0;
if(t102==0)break;
t103=v_k;
t104=f_cfun(t103);
t105=v_k;
t106=1;
t107=t105+t106;
v_k=t107;
}
t108=0;
t109=f_isjs();
if(t109!=0){
t111=f_outj();
t110=t111;
}else{
t112=12;
t113=M[t112];
if(t113!=0){
t115=f_outg();
t114=t115;
}else{
t116=f_outc();
t114=t116;
}
t110=t114;
}
t117=0;
return t117;
}
int main(int c,char**v){oinit(c,v);I r=f_main();oflush();return (int)r;}
