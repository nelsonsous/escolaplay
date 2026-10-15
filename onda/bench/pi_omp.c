#include <stdio.h>
int main(void){long n=200000000;double s=0;
#pragma omp parallel for reduction(+:s)
for(long i=0;i<n;i++){double x=(i+0.5)/n;s+=4.0/(1.0+x*x);}printf("%.15g\n",s/n);return 0;}
