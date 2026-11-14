// Põe a app dentro da app nativa: copia os ficheiros da Música (a página, os estilos, a casca, o módulo em Onda, o
// anfitrião e os gestos) para nativo/www e para o projeto iOS (ios/App/App/public), com a configuração do Capacitor.
// Assim a app abre sem rede e não depende do site — é o que a loja da Apple pede. No Mac basta o Xcode: o projeto
// iOS do repositório já vai montado.
//   node musica/nativo/montar.mjs              monta (corre-se depois de mudar a app; o «npm run onda» chama-o)
//   node musica/nativo/montar.mjs --verificar  falha se o que está montado não é o da app de agora
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const MUSICA = join(AQUI, '..'), ONDA = join(MUSICA, '..', 'onda', 'rt');
const verificar = process.argv.includes('--verificar');

// destino na app → de onde vem
const FICHEIROS = {
    'musica.css': join(MUSICA, 'musica.css'),
    'musica.js': join(MUSICA, 'musica.js'),
    'manifest.webmanifest': join(MUSICA, 'manifest.webmanifest'),
    'icon.svg': join(MUSICA, 'icon.svg'),
    'icon-192.png': join(MUSICA, 'icon-192.png'),
    'icon-512.png': join(MUSICA, 'icon-512.png'),
    'icon-maskable-512.png': join(MUSICA, 'icon-maskable-512.png'),
    'apple-touch-icon.png': join(MUSICA, 'apple-touch-icon.png'),
    'privacidade.html': join(MUSICA, 'privacidade.html'),
    'apoio.html': join(MUSICA, 'apoio.html'),
    'app/musica.wasm': join(MUSICA, 'app', 'musica.wasm'),
    'onda/anfitriao.js': join(ONDA, 'anfitriao.js'),
    'onda/gestos-onda.js': join(ONDA, 'gestos-onda.js'),
};
// a página: os dois scripts da Onda vêm de fora da pasta no site (../onda/rt); dentro da app ficam em onda/
function pagina() {
    let h = readFileSync(join(MUSICA, 'index.html'), 'utf8');
    for (const f of ['anfitriao.js', 'gestos-onda.js']) {
        const de = `src="../onda/rt/${f}"`;
        if (!h.includes(de)) throw new Error(`o index.html já não tem ${de}`);
        h = h.replace(de, `src="onda/${f}"`);
    }
    return Buffer.from(h);
}
const conteudo = () => new Map([['index.html', pagina()], ...Object.entries(FICHEIROS).map(([d, f]) => [d, readFileSync(f)])]);

const cfg = JSON.parse(readFileSync(join(AQUI, 'capacitor.config.json'), 'utf8'));
const versao = JSON.parse(readFileSync(join(AQUI, 'package.json'), 'utf8')).version;
const IOS = join(AQUI, 'ios', 'App', 'App');
const PBX = join(AQUI, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
// o que o Capacitor põe no projeto iOS e não é da app
const DO_CAPACITOR = new Set(['cordova.js', 'cordova_plugins.js']);

const erros = [];
function listar(dir, pre = '') {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? listar(join(dir, n), `${pre}${n}/`) : [`${pre}${n}`]));
}
function por(dir, ficheiros, fica = new Set()) {
    for (const [d, b] of ficheiros) {
        const f = join(dir, d);
        const igual = existsSync(f) && readFileSync(f).equals(b);
        if (verificar) { if (!igual) erros.push(`${f} não é o da app de agora`); continue; }
        if (!igual) { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, b); }
    }
    // o que já não é da app sai (ex.: a página que abria o site)
    for (const d of listar(dir)) {
        if (ficheiros.has(d) || fica.has(d)) continue;
        if (verificar) erros.push(`${join(dir, d)} está a mais`);
        else rmSync(join(dir, d));
    }
}
const ficheiros = conteudo();
por(join(AQUI, 'www'), ficheiros);
por(join(IOS, 'public'), ficheiros, DO_CAPACITOR);

// a configuração no projeto iOS: a mesma, mais a lista de classes que o Capacitor lá escreve
const cfgIos = join(IOS, 'capacitor.config.json');
const antes = existsSync(cfgIos) ? JSON.parse(readFileSync(cfgIos, 'utf8')) : {};
const novo = JSON.stringify({ ...cfg, packageClassList: antes.packageClassList || [] }, null, '\t') + '\n';
if (!existsSync(cfgIos) || readFileSync(cfgIos, 'utf8') !== novo) { if (verificar) erros.push(`${cfgIos} não é a configuração de agora`); else writeFileSync(cfgIos, novo); }

// a versão que a loja mostra é a da app
const pbx = readFileSync(PBX, 'utf8');
const pbxNovo = pbx.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${versao};`);
if (pbxNovo !== pbx) { if (verificar) erros.push(`${PBX}: a versão não é a ${versao}`); else writeFileSync(PBX, pbxNovo); }

if (erros.length) { console.error(erros.join('\n') + '\nCorre «node musica/nativo/montar.mjs».'); process.exit(1); }
console.log(`${verificar ? 'nativo: montado e em dia' : 'nativo: montado'} (${ficheiros.size} ficheiros, versão ${versao})`);
