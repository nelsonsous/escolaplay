import subprocess, time, json, sys
D = sys.argv[1]
def t(cmd, n):
    best = 1e9
    for _ in range(n):
        s = time.perf_counter(); subprocess.run(cmd, shell=True, cwd=D, stdout=subprocess.DEVNULL, check=True); best = min(best, time.perf_counter() - s)
    return best * 1000
rows = [
 ("fib(35) recursivo (sequencial)", [("Onda", "./o_fib", 1, 5), ("C -O3", "./c_fib", 1, 5), ("JavaScript (Node)", "node fib.js", 1, 3), ("Python", "python3 fib.py", 1, 1)]),
 ("pi: soma de 200 milhoes de termos", [("Onda (S paralelo automatico)", "./o_pi", 1, 5), ("C -O3 sequencial", "./c_pi", 1, 3), ("C + OpenMP escrito a mao", "./c_pi_omp", 1, 5), ("JavaScript (Node)", "node pi.js", 1, 3), ("Python (20M x10)", "python3 pi.py", 10, 1)]),
 ("fractal 960x540 (D paralelo automatico)", [("Onda", "./o_julia", 1, 5), ("C -O3 sequencial", "./c_julia", 1, 3), ("C + OpenMP escrito a mao", "./c_julia_omp", 1, 5), ("JavaScript (Node)", "node julia.js", 1, 3), ("Python (1/16 x16)", "python3 julia.py", 16, 1)]),
]
out = []
for name, cs in rows:
    r = [(lab, t(cmd, n) * k) for lab, cmd, k, n in cs]
    out.append({"teste": name, "res": [{"ling": l, "ms": round(ms, 1)} for l, ms in r]})
    base = r[0][1]
    print(f"\n{name}")
    for l, ms in r: print(f"  {l:32s} {ms:10.1f} ms   ({ms/base:6.1f}x o tempo da Onda)")
json.dump(out, open(D + "/bench.json", "w"), ensure_ascii=False, indent=1)
