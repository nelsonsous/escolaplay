#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#if defined(__unix__)||defined(__APPLE__)
#include <sys/mman.h>
#include <sys/file.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#define OKMAP 1
#endif
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
static I*KP;static size_t KZ;static int KS,KD=-1;static unsigned char*KB;static char KJ[4200];
#define KPG 4096
#define KMAG 0x314E524A41444E4FULL
static unsigned long long kfnv(unsigned long long s,const void*p,size_t n){const unsigned char*b=(const unsigned char*)p;size_t i;for(i=0;i<n;i+=8){unsigned long long w;memcpy(&w,b+i,8);s=(s^w)*1099511628211ULL;}return s;}
#ifdef OKMAP
static void kwr(int d,const void*p,size_t n,long long o){const char*b=(const char*)p;while(n){ssize_t r=o<0?write(d,b,n):pwrite(d,b,n,(off_t)o);if(r<=0)odie("onda: armazem: falha a escrever\n");b+=r;n-=(size_t)r;if(o>=0)o+=r;}}
static void krec(int d){int j=open(KJ,O_RDONLY);struct stat s;if(j<0)return;
if(!fstat(j,&s)&&s.st_size>=24&&(s.st_size-24)%(8+KPG)==0){size_t l=(size_t)s.st_size,n=(l-24)/(8+KPG),i;unsigned char*b=(unsigned char*)mmap(0,l,PROT_READ,MAP_PRIVATE,j,0);
if(b!=MAP_FAILED){unsigned long long f[3];memcpy(f,b+l-24,24);
if(f[0]==n&&f[2]==KMAG&&f[1]==kfnv(0xcbf29ce484222325ULL,b,l-24)){for(i=0;i<n;i++){unsigned long long x;memcpy(&x,b+i*(8+KPG),8);kwr(d,b+i*(8+KPG)+8,KPG,(long long)(x*KPG));}fsync(d);}
munmap(b,l);}}
close(j);unlink(KJ);}
#endif
static I ostore(I n){const char*f=getenv("ONDA_ARM");size_t z=((size_t)(n>0?n:1)*8+KPG-1)/KPG*KPG;
if(KP)return (I)(((char*)KP-(char*)M)/8);
#ifdef OKMAP
{int d=-1;void*p;struct stat s;if(f){if(strlen(f)>4000)odie("onda: armazem: nome comprido demais\n");strcpy(KJ,f);strcat(KJ,".j");d=open(f,O_RDWR|O_CREAT,0644);if(d<0)odie("onda: armazem indisponivel\n");krec(d);if(fstat(d,&s))odie("onda: armazem indisponivel\n");
if((size_t)s.st_size>z)z=((size_t)s.st_size+KPG-1)/KPG*KPG;if((size_t)s.st_size<z&&ftruncate(d,(off_t)z))odie("onda: armazem indisponivel\n");KS=1;KD=d;}
p=mmap(0,z,PROT_READ|PROT_WRITE,f?MAP_PRIVATE:(MAP_PRIVATE|MAP_ANONYMOUS),d,0);if(p==MAP_FAILED)odie("onda: armazem indisponivel\n");KP=(I*)p;
if(f){KB=(unsigned char*)malloc(z);if(!KB)odie("onda: armazem indisponivel\n");memcpy(KB,p,z);}}
#else
{FILE*h=f?fopen(f,"rb"):0;long l=0;if(h){fseek(h,0,SEEK_END);l=ftell(h);fseek(h,0,SEEK_SET);if((size_t)l>z)z=((size_t)l+KPG-1)/KPG*KPG;}KP=(I*)calloc(z,1);if(!KP)odie("onda: armazem indisponivel\n");if(h){if(fread(KP,1,(size_t)l,h)){}fclose(h);}KS=f!=0;}
#endif
KZ=z;return (I)(((char*)KP-(char*)M)/8);}
static I kcommit(void){
#ifdef OKMAP
size_t i,n=0,np;int j=-1;unsigned long long s=0xcbf29ce484222325ULL;const char*fl=getenv("ONDA_ARM_FALHA");
if(!KS)return 0;np=KZ/KPG;flock(KD,LOCK_EX);
for(i=0;i<np;i++)if(memcmp((char*)KP+i*KPG,KB+i*KPG,KPG)){unsigned long long x=i;
if(j<0){j=open(KJ,O_WRONLY|O_CREAT|O_TRUNC,0644);if(j<0)odie("onda: armazem: sem diario\n");}
kwr(j,&x,8,-1);kwr(j,(char*)KP+i*KPG,KPG,-1);s=kfnv(s,&x,8);s=kfnv(s,(char*)KP+i*KPG,KPG);n++;if(fl&&*fl=='2')_exit(9);}
if(!n){flock(KD,LOCK_UN);return 0;}
{unsigned long long f[3];f[0]=n;f[1]=s;f[2]=KMAG;kwr(j,f,24,-1);}
fsync(j);close(j);if(fl&&*fl=='1')_exit(9);
for(i=0;i<np;i++)if(memcmp((char*)KP+i*KPG,KB+i*KPG,KPG)){kwr(KD,(char*)KP+i*KPG,KPG,(long long)(i*KPG));memcpy(KB+i*KPG,(char*)KP+i*KPG,KPG);}
fsync(KD);unlink(KJ);flock(KD,LOCK_UN);return (I)n;
#else
if(KS){FILE*h=fopen(getenv("ONDA_ARM"),"wb");if(h){fwrite(KP,1,KZ,h);fclose(h);}}return 0;
#endif
}
static void okend(void){if(KS)kcommit();}
static I oa(I n){I p=HP;HP+=n;if(n<0||HP>ONDA_MEM)odie("onda: memoria esgotada\n");return p;}
static F ldf(I p){F d;memcpy(&d,M+p,8);return d;}
static I obh(F x){unsigned long long u;memcpy(&u,&x,8);return (I)(int)(unsigned)(u>>32);}
static I obl(F x){unsigned long long u;memcpy(&u,&x,8);return (I)(u&0xffffffffULL);}
static F obw(I h,I l){unsigned long long u=((unsigned long long)(unsigned)h<<32)|(unsigned)l;F d;memcpy(&d,&u,8);return d;}
static void stf(I p,F d){memcpy(M+p,&d,8);}
static void osink(I p){OS=p;}
static I av(I i,I j){I k;const char*s;if(i<0||i>=AC||j<0)return 0;s=AV[i];for(k=0;k<j;k++)if(!s[k])return 0;return (unsigned char)s[j];}
static void oexit(I c){oflush();okend();exit((int)c);}
static I onow(void){struct timespec t;timespec_get(&t,TIME_UTC);return (I)t.tv_sec*1000000+(I)(t.tv_nsec/1000);}
static I osys(I c,I a,I b){switch(c){case 1:return ir();case 2:oexit(a);return 0;case 3:return AC;case 4:return av(a,b);case 6:return onow();case 8:return ostore(a);case 9:return kcommit();}return 0;}
static unsigned char*oimg0(I w,I h){unsigned char*g=(unsigned char*)malloc((size_t)(w*h*3+1));if(!g)odie("onda: memoria esgotada\n");return g;}
static void oimg1(unsigned char*g,I w,I h){I k;os("P6\n");on(w);op(32);on(h);os("\n255\n");for(k=0;k<w*h*3;k++)op(g[k]);free(g);}
static void oinit(int c,char**v){AC=c;AV=v;M=(I*)calloc((size_t)ONDA_MEM,8);if(!M)odie("onda: memoria esgotada\n");}
