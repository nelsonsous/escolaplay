// Gera os PNG da app (na pasta meteo/, com os nomes da app Mercados) a partir de icon.svg.
//   node meteo/scripts/make-icons.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const dir = (p) => fileURLToPath(new URL(p, import.meta.url));
const master = readFileSync(dir('../icon.svg'), 'utf8');


// [ficheiro, tamanho, escala do desenho] — maskable: desenho dentro da zona segura (círculo de 80%)
const TARGETS = [
  ['icon-192.png', 192, 0.92, master],
  ['icon-512.png', 512, 0.92, master],
  ['icon-maskable-512.png', 512, 0.76, master],
  ['apple-touch-icon.png', 180, 0.9, master],
];
const scaled = (svg, s) => (s === 1 ? svg : svg.replace('<g id="art">', `<g id="art" transform="translate(256 256) scale(${s}) translate(-256 -256)">`));

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [name, size, s, svg] of TARGETS) {
  const src = `data:image/svg+xml;base64,${Buffer.from(scaled(svg, s)).toString('base64')}`;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#0d2a5c"><img src="${src}" width="${size}" height="${size}" style="display:block"></body></html>`);
  await page.waitForFunction(() => document.images[0].complete);
  await page.screenshot({ path: dir(`../${name}`), clip: { x: 0, y: 0, width: size, height: size } });
  console.log('✓', name);
}
await browser.close();
