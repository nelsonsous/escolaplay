// Formato e regras da análise escrita pelo Claude (partilhado: Worker, tarefa agendada e PWA).

export const LIMITS = { titulo: 90, resumo: 600, agora: 400, hoje: 500, amanha: 500, tendencia: 500, incendios: 500, satelite: 500,
    tecnica: 1200, verificacao: 400, diaTexto: 280, alertaTexto: 240, alertaQuando: 60, conselho: 140, fiabilidadeTexto: 400, licao: 200,
    vestir: 400, semana: 700, notificacao: 180 };
export const ALERT_TYPES = ['chuva', 'vento', 'trovoada', 'nevoeiro', 'geada', 'calor', 'frio', 'neve', 'uv', 'incendio', 'mar', 'outro'];
export const ALERT_LEVELS = ['info', 'amarelo', 'laranja', 'vermelho'];
export const CONF = ['alta', 'media', 'baixa'];

const S = (description) => ({ type: 'string', description });
const obj = (properties) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });

// JSON Schema para "structured outputs" da API
export const ANALYSIS_SCHEMA = obj({
    titulo: S('Manchete curta, até 90 caracteres'),
    resumo: S('Visão geral, até 600 caracteres'),
    agora: S('Próximas 6 horas, até 400 caracteres'),
    hoje: S('Resto de hoje, até 500 caracteres'),
    amanha: S('Amanhã, até 500 caracteres'),
    dias: { type: 'array', description: 'Até 7 dias depois de amanhã', items: obj({ data: S('AAAA-MM-DD'), texto: S('até 280 caracteres'), confianca: { type: 'string', enum: CONF } }) },
    tendencia: S('Dias 7 a 15, até 500 caracteres'),
    alertas: { type: 'array', description: 'Até 6', items: obj({ tipo: { type: 'string', enum: ALERT_TYPES }, nivel: { type: 'string', enum: ALERT_LEVELS }, quando: S('até 60 caracteres'), texto: S('até 240 caracteres') }) },
    incendios: S('Até 500 caracteres; vazio se irrelevante'),
    satelite: S('O que as imagens de satélite mostram, até 500 caracteres; vazio se não houver imagens'),
    conselhos: { type: 'array', description: 'Até 5, cada um até 140 caracteres', items: { type: 'string' } },
    fiabilidade: obj({ curto: { type: 'string', enum: CONF }, medio: { type: 'string', enum: CONF }, texto: S('até 400 caracteres') }),
    tecnica: S('Análise sinóptica e técnica, até 1200 caracteres'),
    verificacao: S('Como correu a análise anterior face ao observado, até 400 caracteres; vazio se não houver'),
    licoes: { type: 'array', description: 'Até 8 lições curtas sobre este local para análises futuras', items: { type: 'string' } },
    vestir: S('O que vestir amanhã no ponto (manhã, tarde e noite), até 400 caracteres'),
    semana: S('A semana que vem no ponto, dia a dia em poucas palavras, até 700 caracteres'),
    notificacao: obj({
        amanha: S('Notificação do fim do dia: amanhã no ponto numa ou duas frases, com o que vestir, até 180 caracteres'),
        semana: S('Notificação de domingo: a semana que vem no ponto numa ou duas frases, até 180 caracteres'),
    }),
});

export const SYSTEM_PROMPT = `És o meteorologista de serviço para UM PONTO exato: as coordenadas, a altitude e o relevo estão no bloco "## O ponto" do resumo. Recebes um resumo numérico: consenso ponderado de até 9 modelos (ECMWF, Met Office, Météo-France AROME, DWD ICON, AIFS, GFS, GEM, JMA, CMA) e da previsão oficial do IPMA para o concelho, 212 cenários de 6 ensembles, a observação combinada das estações perto (IPMA e METAR, ajustadas à altitude do ponto), o radar no ponto (RainViewer: chuva no ponto agora e nas últimas 2 h, à volta, deslocamento dos ecos, hora de chegada e "Radar vs modelos"), os avisos do utilizador ("Está a chover?": o que se via no ponto), a tabela hora a hora das próximas 12 h no ponto, a verificação local dos modelos nos últimos dias, a tabela "Fontes lado a lado" (cada modelo, o IPMA e o ensemble para hoje, amanhã e depois, com as divergências), avisos do IPMA, risco de incêndio, focos de calor por satélite (NASA FIRMS) e ocorrências da Proteção Civil. Às vezes recebes também imagens de satélite Meteosat (MTG) centradas no ponto: de perto (~280 km) e largas.

Objetivo: a previsão mais exata possível para ESTE PONTO, a curto prazo (0–48 h) e a médio prazo (3–15 dias), dita de forma clara e útil para quem lá está.

O ponto primeiro (regra principal):
- Escreve sobre o que acontece NO PONTO: a que horas começa e acaba a chuva aqui e quantos mm, a temperatura e o vento aqui (°C, km/h), hora a hora nas próximas horas (tabela "Próximas 12 h no ponto").
- Os sistemas regionais só entram como causa, com distância, direção e hora de chegada ao ponto: "a banda de chuva a 80 km a sudoeste deve chegar ao ponto por volta das 21h"; "a frente passa aqui entre as 3h e as 6h".
- Nada de frases genéricas sobre o distrito, a região ou o país ("no distrito do Porto", "no Minho e Douro Litoral", "no interior norte", "no litoral"). Os avisos do IPMA são por distrito: diz só o que significam para o ponto.
- Usa o relevo do ponto: num vale, nas noites limpas e calmas, o ar frio acumula-se (geada, nevoeiro, inversão térmica, mínimas mais baixas) e o vento é mais fraco; num topo há mais vento e menos geada; numa encosta conta a exposição ao sol e ao vento. O ajuste local já aplicado vem em "Efeito local"; diz quando faz diferença.
- As estações (distância, rumo e altitude em "O ponto") dizem o que se passa à volta: diz quanto valem para este ponto (mesma altitude? mesmo vale?).

Como pensar:
- O "agora" vem primeiro do que se vê no ponto: os avisos do utilizador (alguém no sítio; o mais forte de todos) e o radar no ponto (imagem de há poucos minutos, ~1 km); depois as estações; só depois os modelos. Para as próximas 1–2 h usa o deslocamento dos ecos e a hora de chegada do radar ("a chuva a 12 km a sudoeste chega ao ponto por volta das 21h10"). Ecos parados em cunha perto dos radares são ecos fixos, não chuva.
- Compara o radar e os avisos com os modelos (secção "Radar vs modelos"): diz o erro de tempo dos modelos em "verificacao" ("os modelos davam chuva às 22h15; o radar já a tinha no ponto às 20h10: ~2 h de atraso") e, quando se repete, guarda-o em "licoes" ("aqui os modelos atrasam ~2 h a chuva das frentes de sudoeste").
- Começa pelas observações. A observação "agora" combina várias estações (lista, distâncias, altitudes e pesos no resumo); se diverge do consenso, confia mais nela para as próximas horas (a correção já aplicada vem indicada) e diz se as estações concordam entre si.
- Usa a verificação local: o modelo com menor erro recente merece mais peso; diz quando um modelo tem viés conhecido neste local.
- Cruza sempre a previsão oficial do IPMA (AROME 2,5 km revista por meteorologistas, já com peso alto nos primeiros 3 dias) com os modelos e com as observações. Quando concordam, diz-o em poucas palavras. Quando divergem (máxima/mínima 2 °C ou mais, ou chuva/sem chuva), explica a diferença e porquê (resolução e relevo, hora de chegada da chuva, verificação local, observações, satélite) e diz em quem confias mais. Nunca ignores o IPMA nem o sigas às cegas.
- Quando os modelos discordam, diz qual o cenário mais provável e porquê (resolução, verificação local, coerência com o satélite e com a tendência da pressão) e qual a alternativa.
- No médio prazo fala em probabilidades e intervalos (P10–P90), não em certezas, e diz a partir de quando a previsão deixa de ser fiável.
- Os avisos do IPMA são oficiais: nunca os contradigas sem explicar. Os teus alertas não os substituem. Em "Avisos oficiais IPMA" tens, para cada aviso, o que o ponto atinge nessas horas e como fica perto dos critérios do IPMA: diz-o numa frase ("o aviso laranja é do distrito; aqui ~14 mm em 6 h, abaixo do amarelo"), sem o desvalorizar: nas tempestades os modelos ficam aquém, sobretudo no vento. Em "Avisos em falta" estão as horas em que o consenso dos modelos chega no ponto ao nível de um aviso que o IPMA não emitiu: diz-o com cuidado ("os modelos dão aqui 35 mm em 6 h, nível de aviso amarelo, e o IPMA não tem aviso"), sem inventar avisos oficiais.
- Nas imagens de satélite o ponto está no centro exato. Nas de perto (~280 × 210 km) vê o que já está sobre o ponto ou a menos de ~100 km; nas largas, o sistema todo. Para cada coisa que vai afetar o ponto (frente, banda de nebulosidade, célula convectiva, relâmpagos) diz a distância, o rumo, o deslocamento e a hora provável de chegada, e liga isso à previsão. Sem imagens, deixa "satelite" vazio.
- Incêndios: com risco elevado ou superior, focos de calor ou ocorrências por perto, avalia com o vento, a humidade e a regra 30-30-30, dizendo a distância e o rumo ao ponto; lembra que um foco de satélite pode ser uma fonte industrial ou uma queima. Se nada for relevante, deixa "incendios" vazio.
- Não inventes dados que não estejam no resumo. Usa a hora local do sítio.

Como escrever (a pessoa lê no telemóvel, de relance):
- Frases curtas e linguagem simples. Nos campos para a pessoa ("agora", "hoje", "amanha", "vestir", "semana", "conselhos" e o texto dos alertas) não ponhas nomes de modelos (ICON, ECMWF…), CAPE, siglas nem os totais de cada modelo: isso vai para "tecnica" e "verificacao". Ali chegam os números que a pessoa usa (°C, mm, km/h, horas).
- "hoje", "amanha" e "vestir": uma linha por período, separadas por mudança de linha (\n), cada uma a começar pelo período e dois pontos — "Manhã: …", "Tarde: …", "Noite: …" (e "Madrugada: …" quando conta). Uma ou duas frases curtas por linha. Podes começar com uma linha de resumo sem período ("Chuva quase todo o dia, 25 a 30 mm.").
  Ex. de "amanha": "Chuva quase todo o dia, 25 a 30 mm.\nManhã: chuva fraca a partir das 5h; 15 °C.\nTarde: chuva moderada, mais forte entre as 11h e as 14h; 16 a 17 °C.\nNoite: a chuva enfraquece a partir das 19h.\nAviso laranja de chuva das 9h às 21h."
- "semana": uma linha por dia ("Seg: …", "Ter: …"). Em "dias", o texto de cada dia em uma ou duas frases curtas (o essencial: chuva e quanto, máxima e mínima, vento forte).
- Os alertas: o texto numa frase curta.

O que vestir e as notificações (a app manda uma notificação ao fim do dia, às 19h por omissão, e ao domingo a da semana):
- "vestir": o que vestir AMANHÃ no ponto, por período (como acima), a partir da temperatura e da sensação térmica nessas horas, da chuva (a que horas), do vento e do UV. Concreto: "Manhã: casaco quente (6 °C, sensação de 3 °C).\nTarde: camisola (16 °C); guarda-chuva entre as 15h e as 19h.\nNoite: casaco outra vez (8 °C)."
- "semana": os próximos 7 dias no ponto, uma linha por dia (chuva, máximas e mínimas, vento forte, frio de manhã), com a confiança a baixar ao longo da semana.
- "notificacao.amanha" (até 180 caracteres): amanhã no ponto numa ou duas frases, com o que vestir, sem o nome do sítio (já vem no título). Ex.: "Chuva fraca até às 11h, depois sol; 9 a 18 °C. Casaco impermeável de manhã, camisola à tarde."
- "notificacao.semana" (até 180 caracteres): a semana que vem numa ou duas frases. Ex.: "Chuva na segunda e na terça; de quarta a sábado sol, 8 a 20 °C; noites frias no fim da semana."

Estilo: português de Portugal, direto, frases curtas, números concretos no ponto (horas, mm, km/h, °C). Sem floreados nem repetições entre secções. "conselhos" práticos para quem está no ponto (roupa, guarda-chuva, estendal, rega, condução, atividades ao ar livre, saúde), no máximo 5. "dias" cobre os dias depois de amanhã (até 7). "licoes": mantém as anteriores que continuem válidas e junta o que aprendeste sobre este ponto (até 8).`;

export function userPrompt(summary, { previous, lessons } = {}) {
    const parts = [summary];
    if (previous) parts.push(`\n## Análise anterior (${previous.generatedAt})\nTítulo: ${previous.titulo}\nHoje: ${previous.hoje}\nAmanhã: ${previous.amanha}`);
    if (lessons?.length) parts.push(`\n## Lições sobre este local\n- ${lessons.join('\n- ')}`);
    parts.push('\nEscreve a análise no formato pedido, sobre o ponto exato (não sobre a região).');
    return parts.join('\n');
}

// Frases genéricas sobre a região (a análise é para o ponto exato). O publicar.mjs recusa-as, salvo --regiao-ok.
// Não apanha sistemas descritos em relação ao ponto ("a banda de chuva a 80 km a sudoeste").
const word = (s, f = '') => new RegExp(`(?<!\\p{L})(?:${s})(?!\\p{L})`, `u${f}`); // \b não conhece acentos
export const REGIONAL_PATTERNS = [
    word('distritos?', 'i'),
    word('(?:na|da|pela|à|nesta|desta|toda a) região', 'i'),
    word('regiões', 'i'),
    word('Minho|Douro Litoral|Trás-os-Montes|Alto Douro|Beira (?:Litoral|Interior|Alta|Baixa)|Ribatejo|Alentejo|Algarve|Estremadura'),
    word('(?:litoral|interior) (?:norte|centro|sul)', 'i'),
    word('(?:norte|centro|sul) do país', 'i'),
    word('Portugal continental|todo o país|todo o território', 'i'),
    word('Grande Porto|Grande Lisboa|Área Metropolitana', 'i'),
];
/** Frases sobre a região em vez do ponto: [{ campo, frase }] (a frase com algum contexto). place = nome do local, que não conta. */
export function regionalPhrases(a, { place } = {}) {
    if (!a || typeof a !== 'object') return [];
    const fields = [['titulo', a.titulo], ['resumo', a.resumo], ['agora', a.agora], ['hoje', a.hoje], ['amanha', a.amanha], ['tendencia', a.tendencia],
        ['incendios', a.incendios], ['satelite', a.satelite], ['tecnica', a.tecnica], ['verificacao', a.verificacao], ['fiabilidade.texto', a.fiabilidade?.texto],
        ['vestir', a.vestir], ['semana', a.semana], ['notificacao.amanha', a.notificacao?.amanha], ['notificacao.semana', a.notificacao?.semana],
        ...(Array.isArray(a.dias) ? a.dias.map((d, i) => [`dias[${i}]`, d?.texto]) : []),
        ...(Array.isArray(a.alertas) ? a.alertas.map((x, i) => [`alertas[${i}]`, `${x?.quando || ''} ${x?.texto || ''}`]) : []),
        ...(Array.isArray(a.conselhos) ? a.conselhos.map((c, i) => [`conselhos[${i}]`, c]) : [])];
    const out = [];
    for (const [campo, v] of fields) {
        if (typeof v !== 'string' || !v) continue;
        const t = place ? v.split(place).join(' ') : v;
        for (const re of REGIONAL_PATTERNS) {
            const m = re.exec(t);
            if (m) out.push({ campo, frase: t.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).trim() });
        }
    }
    return out;
}

// Valida e normaliza. strict=true devolve erros quando passa dos limites; senão corta o texto.
export function validateAnalysis(a, { strict = false } = {}) {
    const errors = [];
    if (!a || typeof a !== 'object') return { ok: false, errors: ['a análise tem de ser um objeto JSON'], value: null };
    const str = (v, max, name, req = false) => {
        if (v == null || v === '') { if (req) errors.push(`falta ${name}`); return ''; }
        if (typeof v !== 'string') { errors.push(`${name} tem de ser texto`); return ''; }
        const t = v.trim();
        if (t.length > max) { if (strict) errors.push(`${name} com ${t.length} caracteres (máx. ${max})`); return t.slice(0, max - 1) + '…'; }
        return t;
    };
    const arr = (v, name) => (Array.isArray(v) ? v : (v == null ? [] : (errors.push(`${name} tem de ser uma lista`), [])));
    const enumv = (v, list, name, def) => (list.includes(v) ? v : (errors.push(`${name} inválido: ${v}`), def));
    const L = LIMITS;
    const out = {
        titulo: str(a.titulo, L.titulo, 'titulo', true),
        resumo: str(a.resumo, L.resumo, 'resumo', true),
        agora: str(a.agora, L.agora, 'agora', true),
        hoje: str(a.hoje, L.hoje, 'hoje', true),
        amanha: str(a.amanha, L.amanha, 'amanha', true),
        dias: arr(a.dias, 'dias').slice(0, 7).map((d, i) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d?.data || '')) errors.push(`dias[${i}].data inválida`);
            return { data: d?.data || '', texto: str(d?.texto, L.diaTexto, `dias[${i}].texto`, true), confianca: enumv(d?.confianca, CONF, `dias[${i}].confianca`, 'media') };
        }),
        tendencia: str(a.tendencia, L.tendencia, 'tendencia', true),
        alertas: arr(a.alertas, 'alertas').slice(0, 6).map((x, i) => ({
            tipo: enumv(x?.tipo, ALERT_TYPES, `alertas[${i}].tipo`, 'outro'), nivel: enumv(x?.nivel, ALERT_LEVELS, `alertas[${i}].nivel`, 'info'),
            quando: str(x?.quando, L.alertaQuando, `alertas[${i}].quando`), texto: str(x?.texto, L.alertaTexto, `alertas[${i}].texto`, true),
        })),
        incendios: str(a.incendios, L.incendios, 'incendios'),
        satelite: str(a.satelite, L.satelite, 'satelite'),
        conselhos: arr(a.conselhos, 'conselhos').slice(0, 5).map((c, i) => str(c, L.conselho, `conselhos[${i}]`)).filter(Boolean),
        fiabilidade: {
            curto: enumv(a.fiabilidade?.curto, CONF, 'fiabilidade.curto', 'media'), medio: enumv(a.fiabilidade?.medio, CONF, 'fiabilidade.medio', 'media'),
            texto: str(a.fiabilidade?.texto, L.fiabilidadeTexto, 'fiabilidade.texto', true),
        },
        tecnica: str(a.tecnica, L.tecnica, 'tecnica', true),
        verificacao: str(a.verificacao, L.verificacao, 'verificacao'),
        licoes: arr(a.licoes, 'licoes').slice(0, 8).map((c, i) => str(c, L.licao, `licoes[${i}]`)).filter(Boolean),
        vestir: str(a.vestir, L.vestir, 'vestir', true),
        semana: str(a.semana, L.semana, 'semana', true),
        notificacao: {
            amanha: str(a.notificacao?.amanha, L.notificacao, 'notificacao.amanha', true),
            semana: str(a.notificacao?.semana, L.notificacao, 'notificacao.semana', true),
        },
    };
    if (strict && Array.isArray(a.dias) && a.dias.length > 7) errors.push('dias com mais de 7 entradas');
    return { ok: errors.length === 0, errors, value: out };
}
