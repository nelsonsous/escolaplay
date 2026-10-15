#pragma once
struct timespec { long long tv_sec; long tv_nsec; };
#define TIME_UTC 1
int timespec_get(struct timespec*, int);
