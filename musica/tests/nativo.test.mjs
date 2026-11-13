// A app nativa de teste (nativo/, Capacitor): abre a Música do site, e o projeto iOS no repositório tem a mesma
// configuração (no Mac basta o Xcode, sem correr o Capacitor).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const ler = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));

test('app nativa: abre a Música do site; o login do Tidal fica dentro da app; o projeto iOS está sincronizado', () => {
    const cfg = ler('../nativo/capacitor.config.json');
    assert.equal(cfg.server.url, 'https://nelsonsous.github.io/escolaplay/musica/');
    assert.ok(cfg.server.allowNavigation.includes('login.tidal.com'), 'o login do Tidal abre dentro da app');
    assert.ok(cfg.server.allowNavigation.includes('musica.mercados-proxy.workers.dev'), 'e volta pelo conector');
    const { packageClassList, ...ios } = ler('../nativo/ios/App/App/capacitor.config.json');
    assert.deepEqual(ios, cfg, 'corre «npm run ios» em nativo/ depois de mudar o capacitor.config.json');
    for (const f of ['erro.html', 'index.html']) assert.ok(existsSync(new URL(`../nativo/ios/App/App/public/${f}`, import.meta.url)), f);
    assert.match(readFileSync(new URL('../nativo/ios/App/App/Info.plist', import.meta.url), 'utf8'), /<key>UIUserInterfaceStyle<\/key>\s*<string>Dark<\/string>/);
});
