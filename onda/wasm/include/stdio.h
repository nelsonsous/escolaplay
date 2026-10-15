#pragma once
#include <stddef.h>
typedef struct { int fd; } FILE;
extern FILE *stdin, *stdout, *stderr;
size_t fwrite(const void*, size_t, size_t, FILE*);
size_t fread(void*, size_t, size_t, FILE*);
int fflush(FILE*);
int fputs(const char*, FILE*);
int snprintf(char*, size_t, const char*, ...);
