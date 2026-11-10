// O motor de gestos comum às apps (onda/rt/gestos.onda → gestos-onda.js): as decisões da Onda, com os números que as
// pontes da Música, da Meteo e dos Mercados lhe dão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const G = require('../../onda/rt/gestos-onda.js');

test('motor de gestos: o gerado corresponde à fonte em Onda', () => {
    execFileSync(process.execPath, [fileURLToPath(new URL('../../onda/rt/gestos.mjs', import.meta.url)), '--verificar'], { stdio: 'pipe' });
});

test('motor de gestos: que gesto é (no primeiro movimento a sério)', async () => {
    await G.pronto;
    assert.ok(G.ok);
    const { FOLHA, TOPO, DESLIZA, CAMPO, LINHA, BORDA, PAGINAS, ATUALIZA, A_PUXAR, SEPARADORES, A_ATUALIZAR } = G;
    assert.equal(G.modo(SEPARADORES, 5, 3), G.AINDA, 'menos de 8 px: ainda não se sabe');
    assert.equal(G.modo(SEPARADORES | CAMPO, 40, 0), G.NENHUM, 'num campo, nunca');
    // folha aberta: para baixo e no topo fecha; a meio do conteúdo, deixa deslizar
    assert.equal(G.modo(FOLHA | TOPO, 2, 20), G.FECHAR);
    assert.equal(G.modo(FOLHA, 2, 20), G.NENHUM);
    assert.equal(G.modo(FOLHA | TOPO, 0, -20), G.NENHUM, 'para cima é ler');
    // na folha, para os lados: a linha (só para a esquerda), as páginas, ou nada
    assert.equal(G.modo(FOLHA | LINHA | PAGINAS, -30, 2), G.APAGAR);
    assert.equal(G.modo(FOLHA | LINHA | PAGINAS, 30, 2), G.PAGINA);
    assert.equal(G.modo(FOLHA | LINHA, 30, 2), G.NENHUM);
    assert.equal(G.modo(FOLHA | DESLIZA | PAGINAS, 30, 2), G.NENHUM, 'o que já desliza para o lado fica com o gesto');
    // na página: para os lados muda de separador; a linha para a esquerda apaga; a borda do Safari é do browser
    assert.equal(G.modo(SEPARADORES, -40, 5), G.SEPARADOR);
    assert.equal(G.modo(SEPARADORES | LINHA, -40, 5), G.APAGAR);
    assert.equal(G.modo(SEPARADORES | LINHA, 40, 5), G.SEPARADOR);
    assert.equal(G.modo(SEPARADORES | BORDA, 40, 5), G.NENHUM);
    assert.equal(G.modo(SEPARADORES | BORDA, -40, 5), G.SEPARADOR);
    assert.equal(G.modo(SEPARADORES | A_PUXAR, -40, 5), G.NENHUM, 'a meio de um puxar não muda de separador');
    assert.equal(G.modo(0, -40, 5), G.NENHUM, 'sem separadores');
    assert.equal(G.modo(SEPARADORES, -20, 18), G.NENHUM, 'na diagonal é scroll (precisa de 1,3× mais para o lado)');
    // para baixo no topo da página: atualiza (se a página o tiver e não estiver já a atualizar)
    assert.equal(G.modo(ATUALIZA | TOPO, 2, 30), G.ATUALIZAR);
    assert.equal(G.modo(ATUALIZA, 2, 30), G.NENHUM);
    assert.equal(G.modo(ATUALIZA | TOPO | A_ATUALIZAR, 2, 30), G.NENHUM);
});

test('motor de gestos: quanto segue o dedo', async () => {
    await G.pronto;
    assert.equal(G.segue(G.FECHAR, 80), 80);
    assert.equal(G.segue(G.FECHAR, -30), 0, 'a folha não sobe');
    assert.equal(G.segue(G.SEPARADOR, -100, 0, true), -40, 'o ecrã segue a 40 %');
    assert.equal(G.segue(G.SEPARADOR, -100, 0, false), -12, 'sem separador para esse lado: só resiste');
    assert.equal(G.segue(G.PAGINA, 100, 0, true), 45);
    assert.equal(G.segue(G.APAGAR, -40, 360), -40, 'a linha segue o dedo');
    assert.equal(G.segue(G.APAGAR, 30, 360), 0, 'nunca para a direita');
    assert.equal(G.segue(G.APAGAR, -352, 360), -252 + (-352 + 252) * 0.25, 'depois de 70 % resiste');
    assert.equal(G.segue(G.ATUALIZAR, 100), 50);
    assert.equal(G.segue(G.ATUALIZAR, 400), 120, 'no máximo 120 px');
    assert.equal(G.opac(0), 1);
    assert.equal(G.opac(250), 0.5);
    assert.equal(G.opac(1000), 0.15);
    assert.equal(G.opacs(-300), 0.55);
});

test('motor de gestos: ao largar, confirma-se ou volta', async () => {
    await G.pronto;
    // fechar a folha: mais de 110 px, ou um gesto rápido de mais de 30 px
    assert.equal(G.fim(G.FECHAR, 80, 400), false, 'pouco e devagar: volta');
    assert.equal(G.fim(G.FECHAR, 120, 400), true);
    assert.equal(G.fim(G.FECHAR, 60, 80), true, 'rápido');
    assert.equal(G.fim(G.FECHAR, 25, 10), false, 'rápido mas curto demais');
    // separadores e páginas: mais de 80 px, ou rápido e mais de 40
    assert.equal(G.fim(G.SEPARADOR, -90, 500), true);
    assert.equal(G.fim(G.SEPARADOR, -60, 500), false);
    assert.equal(G.fim(G.SEPARADOR, -60, 100), true);
    // apagar: mais de 35 % da linha (no mínimo 90 px), ou rápido e mais de 50
    assert.equal(G.fim(G.APAGAR, -100, 500, 360), false, '35 % de 360 são 126');
    assert.equal(G.fim(G.APAGAR, -130, 500, 360), true);
    assert.equal(G.fim(G.APAGAR, -95, 500, 200), true, 'numa linha estreita, 90 px chegam');
    assert.equal(G.fim(G.APAGAR, -60, 80, 360), true, 'rápido');
    assert.equal(G.arma(-130, 360), true);
    assert.equal(G.arma(-100, 360), false);
    // atualizar: puxado mais de 49 px (70 % de 70)
    assert.equal(G.fim(G.ATUALIZAR, 50, 900), true);
    assert.equal(G.fim(G.ATUALIZAR, 40, 900), false);
});
