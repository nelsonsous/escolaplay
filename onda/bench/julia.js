const W = 960, H = 540, g = Buffer.alloc(W * H * 3);
const c8 = v => Math.trunc(255 * Math.max(0, Math.min(1, v)));
function px(x, y, t, w, h) {
  const s = 3 / h; let zr = (x - 0.5 * w) * s, zi = (y - 0.5 * h) * s; const cr = 0.7885 * Math.cos(0.3 * t), ci = 0.7885 * Math.sin(0.3 * t); let k = 0;
  while (k < 200 && zr * zr + zi * zi < 64) { const q = zr * zr - zi * zi + cr; zi = 2 * zr * zi + ci; zr = q; k++; }
  if (k >= 200) return 0;
  const m = zr * zr + zi * zi, v = k + 1 - Math.log(0.5 * Math.log(m)) / Math.log(2), a = v * 0.15;
  return c8(0.5 + 0.5 * Math.cos(a)) * 65536 + c8(0.5 + 0.5 * Math.cos(a + 2.1)) * 256 + c8(0.5 + 0.5 * Math.cos(a + 4.2));
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = px(x, y, 2, W, H), q = 3 * (y * W + x); g[q] = c >> 16; g[q + 1] = (c >> 8) & 255; g[q + 2] = c & 255; }
process.stdout.write(`P6\n${W} ${H}\n255\n`); process.stdout.write(g);
