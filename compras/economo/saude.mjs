// O relatório de saúde da base, para o Ecónomo (a tarefa semanal) e para quem mantém a app: lê /sonda/saude e diz,
// em português, o que está bem e o que precisa de atenção (uma cadeia que deixou de dar preços, suspeitos a mais,
// tipos da casa sem produtos). Sai com o código 1 se há avisos. Uso: node economo/saude.mjs
import { readFileSync } from 'node:fs';
import { WORKER } from './comum.mjs';

const segredo = (process.env.SONDA_TOKEN ?? readFileSync(process.env.SONDA_TOKEN_FILE, 'utf8')).trim();
const r = await fetch(`${WORKER}/sonda/saude`, { headers: { authorization: `Bearer ${segredo}` } });
if (!r.ok) { console.error(`/sonda/saude: HTTP ${r.status}`); process.exit(2); }
const s = await r.json();
const ha = (q) => (q ? `${Math.round((Date.now() - new Date(q)) / 3600e3)} h` : 'nunca');
console.log(`Saúde da base (${s.quando.slice(0, 16).replace('T', ' ')}): ${s.estado === 'ok' ? 'tudo bem' : 'há avisos'}`);
for (const c of s.cadeias) {
    console.log(`  ${c.estado === 'ok' ? '✓' : '⚠'} ${c.cadeia}: ${c.lidas_26h}/${c.paginas} páginas lidas em 26 h, ${c.falham} a falhar; ${c.produtos} produtos (${c.recentes_48h} vistos em 48 h); último preço há ${ha(c.ultimo_preco)}`);
}
console.log(`  suspeitos: ${JSON.stringify(s.suspeitos)} · tipos: ${s.tipos.com_produtos}/${s.tipos.total} com produtos (${s.tipos.da_casa_sem_produtos} da casa sem nenhum)`);
console.log(`  SPAR: ${s.spar.artigos} artigos ligados, ${s.spar.com_estimativa} com estimativa (lidos há ${ha(s.spar.visto)})`);
process.exit(s.estado === 'ok' ? 0 : 1);
