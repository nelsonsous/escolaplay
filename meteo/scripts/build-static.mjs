// Embute os ficheiros de public/ no Worker (src/static.gen.js).
// Porquê: o carregamento de "static assets" da Cloudflare usa um token de sessão próprio, que o proxy
// deste ambiente substitui; servir a PWA a partir do próprio Worker evita esse passo.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const OUT = fileURLToPath(new URL('../src/static.gen.js', import.meta.url));
const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp',
};
const BINARY = new Set(['.png', '.ico', '.webp']);

function walk(dir) {
    return readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);
        if (n.startsWith('.')) return [];
        return statSync(p).isDirectory() ? walk(p) : [p];
    });
}

const files = {};
let total = 0;
for (const p of walk(ROOT).sort()) {
    const ext = extname(p).toLowerCase();
    if (!TYPES[ext]) continue;
    const buf = readFileSync(p);
    const key = '/' + relative(ROOT, p).split(sep).join('/');
    const bin = BINARY.has(ext);
    files[key] = { t: TYPES[ext], e: createHash('sha1').update(buf).digest('hex').slice(0, 16), b: bin ? 1 : 0, d: bin ? buf.toString('base64') : buf.toString('utf8') };
    total += buf.length;
}
const version = createHash('sha1').update(Object.values(files).map((f) => f.e).join('')).digest('hex').slice(0, 10);
writeFileSync(OUT, `// Gerado por scripts/build-static.mjs — não editar.\nexport const BUILD = ${JSON.stringify(version)};\nexport const FILES = ${JSON.stringify(files)};\n`);
console.log(`static: ${Object.keys(files).length} ficheiros, ${(total / 1024).toFixed(0)} KB, build ${version}`);
