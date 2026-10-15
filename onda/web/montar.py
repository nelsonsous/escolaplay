# Monta as duas paginas (Onda e Onda Viva) em build/site-onda e build/site-viva.
# Uso: python3 web/montar.py   (depois de ./build.sh e wasm/build-wasm.sh)
import os, json, html, shutil, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(R, p), encoding='utf-8').read()
import hashlib
H = hashlib.sha256(open(os.path.join(R, 'seed/ondac.c'), 'rb').read()).hexdigest()
fmt = lambda n: f"{n:,}".replace(',', ' ')
VARS = {'__SEMENTE__': H, '__H8__': H[:8], '__H4__': H[-4:], '__N_ONDA__': fmt(os.path.getsize(os.path.join(R, 'build/ondac.onda'))),
        '__N_C__': fmt(os.path.getsize(os.path.join(R, 'seed/ondac.c'))), '__KB_WASM__': str(round(os.path.getsize(os.path.join(R, 'seed/ondac.wasm')) / 1000))}
def fill(t):
    for k, v in VARS.items(): t = t.replace(k, v)
    return t
def put(dst, rel, src):
    d = os.path.join(R, dst, rel); os.makedirs(os.path.dirname(d), exist_ok=True)
    if src.endswith(('.js', '.html')): open(d, 'w', encoding='utf-8').write(fill(open(os.path.join(R, src), encoding='utf-8').read()))
    else: shutil.copy(os.path.join(R, src), d)
for d in ('build/site-onda', 'build/site-viva'): shutil.rmtree(os.path.join(R, d), ignore_errors=True)
# Onda Viva
h = rd('web/viva.src.html').replace('<!--SRC_JULIA-->', rd('ex/julia.onda')).replace('<!--SRC_ONDAS-->', rd('ex/ondas.onda'))
os.makedirs(os.path.join(R, 'build/site-viva'), exist_ok=True)
open(os.path.join(R, 'build/site-viva/index.html'), 'w', encoding='utf-8').write(fill(h))
for f in ['significado.js', 'ondac.js', 'viva.js', 'viva-app.js']: put('build/site-viva', f, 'web/' + f)
put('build/site-viva', 'ondac.wasm', 'seed/ondac.wasm')
put('build/site-viva', 'f/ondac.onda', 'build/ondac.onda')
# Onda
oc = os.path.join(R, 'build/ondac')
g = lambda e: subprocess.run([oc, '-g', 'px'], stdin=open(os.path.join(R, 'ex', e + '.onda')), capture_output=True, text=True).stdout
grover = subprocess.run([os.path.join(R, 'onda'), 'run', os.path.join(R, 'ex/grover.onda')], capture_output=True, text=True).stdout.rstrip('\n')
files = [('f/SPEC.md', 'SPEC.md', 'especificação, escrita para IAs'), ('f/ondac.onda', 'build/ondac.onda', 'o compilador, escrito em Onda'),
         ('f/ondac.c', 'seed/ondac.c', 'semente C, gerada pela própria Onda'), ('f/build.sh', 'build.sh', 'arranque e prova do ponto fixo'),
         ('f/onda.sh', 'onda', 'comando com cache por hash'), ('f/boot.rs', 'boot/src/main.rs', 'arranque em Rust, usado uma vez'),
         ('f/prelude.c', 'rt/prelude.c', 'runtime C mínimo'), ('ondac.js', 'web/ondac.js', 'carrega o compilador WebAssembly'),
         ('f/host.js', 'wasm/host.js', 'anfitrião WebAssembly de três portas')] + \
        [('f/ex/%s.onda' % e, 'ex/%s.onda' % e, d) for e, d in [('julia', 'fractal de Julia, CPU e GPU'), ('ondas', 'interferência de ondas, CPU e GPU'), ('grover', 'busca quântica de Grover'), ('pi', 'π com redução paralela'), ('fib', 'recursão sequencial'), ('ola', 'olá mundo')]]
fl = []
for dst, src, d in files:
    put('build/site-onda', dst, src); fl.append({'p': dst, 'n': os.path.basename(src) if not dst.startswith('f/ex/') else 'ex/' + os.path.basename(src), 'd': d, 'b': os.path.getsize(os.path.join(R, src))})
h = rd('web/onda/index.src.html')
for k, v in {'<!--SRC_JULIA-->': rd('ex/julia.onda'), '<!--SRC_ONDAS-->': rd('ex/ondas.onda'), '<!--GLSL_JULIA-->': g('julia'), '<!--GLSL_ONDAS-->': g('ondas'),
             '<!--GROVER-->': html.escape(grover), '<!--FILES-->': json.dumps(fl, ensure_ascii=False)}.items():
    h = h.replace(k, v)
open(os.path.join(R, 'build/site-onda/index.html'), 'w', encoding='utf-8').write(fill(h))
for f in ['app.js', 'julia.png']: put('build/site-onda', f, 'web/onda/' + f)
put('build/site-onda', 'ondac.wasm', 'seed/ondac.wasm')
print('build/site-onda e build/site-viva montados')
