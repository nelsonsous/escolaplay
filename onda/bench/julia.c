#include <stdio.h>
#include <math.h>
static int c8(double v){v=v<1.0?v:1.0;v=v>0.0?v:0.0;return (int)(255.0*v);}
static int px(double x,double y,double t,double w,double h){double s=3.0/h,zr=(x-0.5*w)*s,zi=(y-0.5*h)*s,cr=0.7885*cos(0.3*t),ci=0.7885*sin(0.3*t);int k=0;
 while(k<200&&zr*zr+zi*zi<64.0){double q=zr*zr-zi*zi+cr;zi=2.0*zr*zi+ci;zr=q;k++;}
 if(k>=200)return 0;double m=zr*zr+zi*zi,v=k+1.0-log(0.5*log(m))/log(2.0),a=v*0.15;
 return c8(0.5+0.5*cos(a))*65536+c8(0.5+0.5*cos(a+2.1))*256+c8(0.5+0.5*cos(a+4.2));}
int main(void){int w=960,h=540;static unsigned char g[960*540*3];for(int y=0;y<h;y++)for(int x=0;x<w;x++){int c=px(x,y,2.0,w,h);unsigned char*q=g+3*(y*w+x);q[0]=c>>16;q[1]=c>>8;q[2]=c;}
 printf("P6\n%d %d\n255\n",w,h);fwrite(g,1,sizeof g,stdout);return 0;}
