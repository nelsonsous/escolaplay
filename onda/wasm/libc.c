// libc minima para correr o C gerado pela Onda em WebAssembly (browser ou qualquer runtime wasm)
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#define IMP(n) __attribute__((import_module("env"), import_name(#n)))
IMP(jw) void jw(int fd, const void* p, int n);
IMP(jx) _Noreturn void jx(int c);
IMP(jg) int jg(double x, char* b, int n);
IMP(jm) double jm(int f, double x, double y);
IMP(jt) double jt(void);
static FILE f0 = {0}, f1 = {1}, f2 = {2};
FILE *stdin = &f0, *stdout = &f1, *stderr = &f2;
extern unsigned char __heap_base;
static size_t hp;
static void* more(size_t n) {
  if (!hp) hp = (size_t)&__heap_base;
  size_t p = (hp + 15) & ~(size_t)15, e = p + n, cur = __builtin_wasm_memory_size(0) * 65536;
  if (e > cur && __builtin_wasm_memory_grow(0, (e - cur + 65535) / 65536) == (size_t)-1) return 0;
  hp = e; return (void*)p;
}
void* malloc(size_t n) { return more(n); }
void* calloc(size_t a, size_t b) { return more(a * b); }
void free(void* p) { (void)p; }
_Noreturn void exit(int c) { jx(c); }
void* memcpy(void* d, const void* s, size_t n) { unsigned char* a = d; const unsigned char* b = s; while (n--) *a++ = *b++; return d; }
void* memset(void* d, int c, size_t n) { unsigned char* a = d; while (n--) *a++ = (unsigned char)c; return d; }
size_t strlen(const char* s) { size_t n = 0; while (s[n]) n++; return n; }
unsigned char ibuf[1 << 20]; static int ilen, ipos;
size_t fwrite(const void* p, size_t a, size_t b, FILE* f) { jw(f->fd, p, (int)(a * b)); return b; }
size_t fread(void* p, size_t a, size_t b, FILE* f) { (void)f; int n = (int)(a * b); if (n > ilen - ipos) n = ilen - ipos; memcpy(p, ibuf + ipos, (size_t)n); ipos += n; return (size_t)n / a; }
int fflush(FILE* f) { (void)f; return 0; }
int fputs(const char* s, FILE* f) { jw(f->fd, s, (int)strlen(s)); return 0; }
int snprintf(char* b, size_t n, const char* fmt, ...) { (void)fmt; __builtin_va_list ap; __builtin_va_start(ap, fmt); double x = __builtin_va_arg(ap, double); __builtin_va_end(ap); return jg(x, b, (int)n); }
double sqrt(double x) { return __builtin_sqrt(x); }
double floor(double x) { return __builtin_floor(x); }
double fabs(double x) { return __builtin_fabs(x); }
double sin(double x) { return jm(0, x, 0); }
double cos(double x) { return jm(1, x, 0); }
double exp(double x) { return jm(2, x, 0); }
double log(double x) { return jm(3, x, 0); }
double pow(double x, double y) { return jm(4, x, y); }
double atan2(double y, double x) { return jm(5, y, x); }
int timespec_get(struct timespec* t, int b) { double ms = jt(); t->tv_sec = (long long)(ms / 1000); t->tv_nsec = (long)((ms - t->tv_sec * 1000.0) * 1e6); return b; }
int onda_main(int, char**);
static char a0[] = "ondac", a1[] = "-g", a2[256]; static char* av_[4];
__attribute__((export_name("inbuf"))) unsigned char* inbuf(void) { return ibuf; }
__attribute__((export_name("argbuf"))) char* argbuf(void) { return a2; }
__attribute__((export_name("run"))) int run(int n, int gpu) { a1[1] = gpu == 2 ? 'j' : 'g'; ilen = n; ipos = 0; av_[0] = a0; av_[1] = a1; av_[2] = a2; av_[3] = 0; return onda_main(gpu ? 3 : 1, av_); }
