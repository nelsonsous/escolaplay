// Os pedidos do conector aos sites das cadeias (a sonda e os preços): identifica-se como é (UA), não segue
// redireccionamentos (um produto que mudou de endereço conta como falha) e desiste ao fim de um tempo.
export const UA = 'compras/0.11 (app pessoal de comparação de preços; Cloudflare Worker)';
export const TIMEOUT_MS = 15000;

export const pedir = (u, accept, ms = TIMEOUT_MS) => fetch(u.toString(), {
    headers: { 'user-agent': UA, accept, 'accept-language': 'pt-PT,pt;q=0.9' },
    redirect: 'manual', signal: AbortSignal.timeout(ms),
});
