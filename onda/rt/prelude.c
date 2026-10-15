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
static I osys(I c,I a,I b){switch(c){case 1:return ir();case 2:oexit(a);return 0;case 3:return AC;case 4:return av(a,b);case 6:return onow();}return 0;}
static unsigned char*oimg0(I w,I h){unsigned char*g=(unsigned char*)malloc((size_t)(w*h*3+1));if(!g)odie("onda: memoria esgotada\n");return g;}
static void oimg1(unsigned char*g,I w,I h){I k;os("P6\n");on(w);op(32);on(h);os("\n255\n");for(k=0;k<w*h*3;k++)op(g[k]);free(g);}
static void oinit(int c,char**v){AC=c;AV=v;M=(I*)calloc((size_t)ONDA_MEM,8);if(!M)odie("onda: memoria esgotada\n");}
