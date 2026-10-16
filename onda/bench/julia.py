import math, sys
W, H, SC = 960, 540, 4   # amostra 1 em cada 4x4 pixeis (1/16)
def c8(v): return int(255.0 * max(0.0, min(1.0, v)))
def px(x, y, t, w, h):
    s = 3.0 / h; zr = (x - 0.5*w)*s; zi = (y - 0.5*h)*s; cr = 0.7885*math.cos(0.3*t); ci = 0.7885*math.sin(0.3*t); k = 0
    while k < 200 and zr*zr + zi*zi < 64.0:
        zr, zi = zr*zr - zi*zi + cr, 2.0*zr*zi + ci; k += 1
    if k >= 200: return 0
    m = zr*zr + zi*zi; v = k + 1.0 - math.log(0.5*math.log(m))/math.log(2.0); a = v*0.15
    return c8(0.5+0.5*math.cos(a))*65536 + c8(0.5+0.5*math.cos(a+2.1))*256 + c8(0.5+0.5*math.cos(a+4.2))
out = bytearray()
for y in range(0, H, SC):
    for x in range(0, W, SC):
        c = px(x, y, 2.0, W, H); out += bytes((c >> 16 & 255, c >> 8 & 255, c & 255))
sys.stdout.buffer.write(out)
