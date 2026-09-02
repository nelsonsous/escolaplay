// EscolaPlay - Banco de exercícios multi-ano (PT-PT, Acordo Ortográfico)
// Tipos: mc (escolha múltipla), tf (v/f), fill (preencher), order (ordenar), match (associar)
// Estrutura: { id, s (disciplina), t (tópico), type, diff (1-3), q (pergunta), ..., exp }

// ============================================================
// ===================== 2.º ANO ==============================
// ============================================================
const SUBJECTS_2 = {
    portugues:    { name: 'Português',      icon: 'fa-book',         color: '#e11d48' },
    matematica:   { name: 'Matemática',     icon: 'fa-calculator',   color: '#2563eb' },
    estudo_meio:  { name: 'Estudo do Meio', icon: 'fa-globe',        color: '#16a34a' },
    ingles:       { name: 'Inglês',         icon: 'fa-language',     color: '#7c3aed' }
};

const CURRICULUM_2 = {
    portugues: [
        // Sons básicos
        'Vogais e consoantes',
        'Sílabas',
        'Ditongos',
        'Hiato',
        // Significado
        'Sinónimos',
        'Antónimos',
        'Família de palavras',
        // Classes de palavras
        'Nomes próprios e comuns',
        'Adjetivos',
        // Flexão
        'Singular e plural',
        'Género (masculino e feminino)',
        'Grau (aumentativo e diminutivo)',
        // Verbos
        'Verbos no presente',
        'Verbos no passado e futuro',
        // Frase
        'Tipos de frase',
        'Pontuação básica',
        // P3 — Conetores, classes de palavras avancadas, compreensao (Aprend. Essenciais)
        'Conetores (e, ou)',
        'Interjeições',
        'Determinantes artigos',
        'Sílaba átona',
        'Compreensão de texto',
        'Textos narrativos',
        'Poesia e BD'
    ],
    matematica: [
        // P1 — Números até 100 e operações simples
        'Dezenas e unidades',
        'Números até 100',
        'Adição até 100',
        // P2 — Subtração, multiplicação, tabuadas iniciais e medidas
        'Subtração até 100',
        'Multiplicação',
        'Tabuada do 2',
        'Tabuada do 5',
        'Tabuada do 10',
        'Tabuada do 3',
        'Tabuada do 4',
        'Comprimento',
        'Massa',
        'Capacidade',
        // P3 — Restantes tabuadas, divisão, frações, geometria, tempo, dinheiro e gráficos
        'Tabuada do 6',
        'Tabuada do 7',
        'Tabuada do 8',
        'Tabuada do 9',
        'Divisão',
        'Frações simples',
        'Figuras planas',
        'Sólidos geométricos',
        'Medir tempo',
        'Dinheiro (€)',
        'Gráficos',
        // P3 — Aprendizagens Essenciais 2.o ano (orientadores 3.o periodo)
        'Números até 1000',
        'Propriedades da multiplicação',
        'Relação multiplicação e divisão',
        'Cálculo mental',
        'Sequências de crescimento',
        'Perímetro',
        'Ângulos retos',
        'Revisão final'
    ],
    estudo_meio: [
        // P1 — À descoberta de si mesmo
        'O meu corpo',
        'Os sentidos',
        'Higiene',
        'Saúde',
        // P1 — À descoberta dos outros e das instituições
        'A minha família',
        'A escola',
        // P2 — À descoberta do ambiente natural
        'Animais',
        'Plantas',
        'Estações do ano',
        'Astros',
        // P3 — À descoberta da sociedade
        'Profissões',
        'Transportes',
        'Comemorações',
        'Portugal',
        // P3 — À descoberta dos materiais e da segurança
        'Materiais e objetos',
        'Segurança e prevenção',
        // P3 — Cidadania (Aprend. Essenciais 2.o ano)
        'Portugal na Europa e no mundo',
        'Influências de outras culturas',
        'Múltiplas pertenças e grupos',
        'Direitos da criança',
        'Diálogo e compromisso'
    ],
    ingles: [
        // Vocabulário básico (do mais usado para o menos)
        'Cumprimentos',
        'Alfabeto',
        'Números',
        'Cores',
        'Família',
        'Animais',
        'Body',
        'Food',
        'Toys'
    ]
};

// Períodos por tópico (1, 2 ou 3) — ano lectivo dividido em 3 períodos.
// Alinhado com o manual "Supermiúdos" (Texto Editores) e Aprendizagens Essenciais 2.º ano.
const PERIODS_2 = {
    portugues:   {
        // P1 — Sons e sílabas
        'Vogais e consoantes':1, 'Sílabas':1, 'Ditongos':1, 'Hiato':1,
        // P2 — Significado e classes de palavras
        'Sinónimos':2, 'Antónimos':2, 'Família de palavras':2,
        'Nomes próprios e comuns':2, 'Adjetivos':2,
        // P3 — Flexão, verbos e frase
        'Singular e plural':3, 'Género (masculino e feminino)':3, 'Grau (aumentativo e diminutivo)':3,
        'Verbos no presente':3, 'Verbos no passado e futuro':3,
        'Tipos de frase':3, 'Pontuação básica':3,
        // Novos topicos P3 alinhados com orientadores 2.o ano
        'Conetores (e, ou)':3, 'Interjeições':3, 'Determinantes artigos':3,
        'Sílaba átona':3, 'Compreensão de texto':3,
        'Textos narrativos':3, 'Poesia e BD':3
    },
    matematica:  {
        // P1 — Números até 100 e operações simples
        'Dezenas e unidades':1, 'Números até 100':1, 'Adição até 100':1,
        // P2 — Subtração, tabuadas iniciais e medidas
        'Subtração até 100':2, 'Multiplicação':2,
        'Tabuada do 2':2, 'Tabuada do 5':2, 'Tabuada do 10':2,
        'Tabuada do 3':2, 'Tabuada do 4':2,
        'Comprimento':2, 'Massa':2, 'Capacidade':2,
        // P3 — Restantes tabuadas, divisão, frações, geometria, dinheiro e gráficos
        'Tabuada do 6':3, 'Tabuada do 7':3, 'Tabuada do 8':3, 'Tabuada do 9':3,
        'Divisão':3, 'Frações simples':3,
        'Figuras planas':3, 'Sólidos geométricos':3,
        'Medir tempo':3, 'Dinheiro (€)':3, 'Gráficos':3,
        // Novos topicos P3 alinhados com orientadores 2.o ano
        'Números até 1000':3, 'Propriedades da multiplicação':3,
        'Relação multiplicação e divisão':3, 'Cálculo mental':3,
        'Sequências de crescimento':3, 'Perímetro':3, 'Ângulos retos':3,
        'Revisão final':3
    },
    estudo_meio: {
        // P1 — À descoberta de si mesmo + instituições
        'O meu corpo':1, 'Os sentidos':1, 'Higiene':1, 'Saúde':1,
        'A minha família':1, 'A escola':1,
        // P2 — À descoberta dos seres vivos e do ambiente
        'Animais':2, 'Plantas':2, 'Estações do ano':2, 'Astros':2,
        // P3 — À descoberta da sociedade, materiais e segurança
        'Profissões':3, 'Transportes':3, 'Comemorações':3, 'Portugal':3,
        'Materiais e objetos':3, 'Segurança e prevenção':3,
        // Novos topicos P3 — Cidadania (orientadores 2.o ano)
        'Portugal na Europa e no mundo':3, 'Influências de outras culturas':3,
        'Múltiplas pertenças e grupos':3, 'Direitos da criança':3,
        'Diálogo e compromisso':3
    },
    ingles:      {
        // P1 — Saudações, alfabeto, números, cores
        'Cumprimentos':1, 'Alfabeto':1, 'Números':1, 'Cores':1,
        // P2 — Família, animais, corpo
        'Família':2, 'Animais':2, 'Body':2,
        // P3 — Comida e brinquedos
        'Food':3, 'Toys':3
    }
};

const LESSONS_2 = {}; // v572: lições em content_y*.js (lazy por ano)

const EXERCISES_2 = []; // v571: banco base em content_y*.js (lazy por ano)


// ============================================================
// ============= 3.º ANO — COLÉGIO OCEANUS (year=31) ==========
// Aprendizagens Essenciais 2018 (alinhado com manuais Texto/Porto/Areal).
// NOTA: para o aluno do Colégio Oceanus, Estudo do Meio é leccionado
// EM INGLÊS — a disciplina aparece como "Science" e o conteúdo (tópicos,
// perguntas, explicações) está em inglês. As outras disciplinas mantêm-se
// em português.
// ============================================================
const SUBJECTS_3_OCEANUS = {
    portugues:    { name: 'Português',      icon: 'fa-book',              color: '#e11d48' },
    leitura:      { name: 'Leitura',        icon: 'fa-book-open-reader',  color: '#0e7490', fullName: 'Leitura — fluência, prosódia e compreensão' },
    matematica:   { name: 'Matemática',     icon: 'fa-calculator',        color: '#2563eb' },
    estudo_meio:  { name: 'Science',         icon: 'fa-globe',             color: '#16a34a' },
    ingles:       { name: 'English',         icon: 'fa-language',          color: '#7c3aed' }
};

const CURRICULUM_3_OCEANUS = {
    leitura: [
        'Lê com as vírgulas', 'Lê um diálogo', 'Voz sobe na pergunta', 'Voz com emoção', 'Lê e descobre os sentimentos', 'Lê e descobre o que vai acontecer', 'Lê uma carta', 'Lê uma lenda'
    ],
    portugues: [
        'Ditongos e hiatos', 'Acentuação', 'Translineação',
        'Nomes (próprios, comuns, coletivos)', 'Determinantes', 'Adjetivos', 'Verbos', 'Plurais e feminino',
        'Tipos de frase', 'Sinónimos e antónimos', 'Família de palavras', 'Compreensão de texto'
    ],
    matematica: [
        'Números até 10 000', 'Valor posicional', 'Adição e subtração', 'Multiplicação',
        'Tabuadas', 'Divisão', 'Múltiplos e divisores',
        'Frações', 'Polígonos', 'Sólidos geométricos', 'Perímetro',
        'Comprimento', 'Tempo', 'Dinheiro', 'Tabelas e gráficos'
    ],
    estudo_meio: [
        // Biology
        'Living things', 'Plants', 'Animals and habitats', 'The human body',
        'Senses', 'Healthy eating',
        // Chemistry
        'Materials and their properties', 'Solids, liquids and gases', 'Mixing and separating',
        // Physics
        'Forces (push and pull)', 'Magnets', 'Light and shadows',
        // Earth and Space
        'The Sun, Earth and Moon', 'Weather'
    ],
    ingles: [
        // P1 — Word level (parts of speech, plurals)
        'Nouns', 'Verbs', 'Adjectives',
        // P2 — Sentence level (tenses, punctuation, sentence types)
        'Tenses', 'Punctuation', 'Sentence types',
        // P3 — Text level (vocabulary, comprehension)
        'Synonyms and antonyms', 'Reading comprehension'
    ]
};

const PERIODS_3_OCEANUS = {
    leitura: {
        'Lê com as vírgulas':1,
        'Lê um diálogo':1,
        'Voz sobe na pergunta':1,
        'Voz com emoção':2,
        'Lê e descobre os sentimentos':2,
        'Lê e descobre o que vai acontecer':2,
        'Lê uma carta':3,
        'Lê uma lenda':3
    },
    portugues:   {
        'Ditongos e hiatos':1, 'Acentuação':1, 'Translineação':1,
        'Nomes (próprios, comuns, coletivos)':2, 'Determinantes':2, 'Adjetivos':2, 'Verbos':2, 'Plurais e feminino':2,
        'Tipos de frase':3, 'Sinónimos e antónimos':3, 'Família de palavras':3, 'Compreensão de texto':3
    },
    matematica:  {
        'Números até 10 000':1, 'Valor posicional':1, 'Adição e subtração':1, 'Multiplicação':1,
        'Tabuadas':2, 'Divisão':2, 'Múltiplos e divisores':2,
        'Frações':3, 'Polígonos':3, 'Sólidos geométricos':3, 'Perímetro':3,
        'Comprimento':3, 'Tempo':3, 'Dinheiro':3, 'Tabelas e gráficos':3
    },
    estudo_meio: {
        // P1 — Biology basics (living things, plants, animals, body)
        'Living things':1, 'Plants':1, 'Animals and habitats':1, 'The human body':1, 'Senses':1,
        // P2 — Biology nutrition + Chemistry
        'Healthy eating':2, 'Materials and their properties':2, 'Solids, liquids and gases':2, 'Mixing and separating':2,
        // P3 — Physics + Earth and Space
        'Forces (push and pull)':3, 'Magnets':3, 'Light and shadows':3,
        'The Sun, Earth and Moon':3, 'Weather':3
    },
    ingles:      {
        'Nouns':1, 'Verbs':1, 'Adjectives':1,
        'Tenses':2, 'Punctuation':2, 'Sentence types':2,
        'Synonyms and antonyms':3, 'Reading comprehension':3
    }
};

const LESSONS_3_OCEANUS = {}; // v572: lições em content_y*.js (lazy por ano)

const EXERCISES_3_OCEANUS = []; // v571: banco base em content_y*.js (lazy por ano)


// ============================================================
// ========== 3.º ANO — COLÉGIO DE LOURDES (year=3) ===========
// Currículo Aprendizagens Essenciais 2018, alinhado com os manuais
// adotados pelo Colégio de Nossa Senhora de Lourdes (Santo Tirso)
// para o ano letivo 2025/2026:
//
//  • Português, Matemática, Estudo do Meio: Missão Zupi 3 (Porto Editora)
//    António José Mota, Filipe Cardoso. Cada manual com Livro de Fichas.
//  • Inglês: Kid's Box [New Generation] Pupil's Book 2 + Activity Book 2
//    (Cambridge English) — Caroline Nixon, Michael Tomlinson.
//  • Formação Cristã: Ao Encontro 3 (S.N.E.C.) — Catarina Moura,
//    Jaime Barbosa, José Sousa.
//  • Cidadania e Desenvolvimento: Estratégia Nacional (sem manual).
// ============================================================
const SUBJECTS_3 = {
    portugues:        { name: 'Português',         icon: 'fa-book',              color: '#e11d48' },
    leitura:          { name: 'Leitura',           icon: 'fa-book-open-reader',  color: '#0e7490', fullName: 'Leitura — fluência, prosódia e compreensão' },
    matematica:       { name: 'Matemática',        icon: 'fa-calculator',        color: '#2563eb' },
    mat_plus:         { name: 'Mat+',              icon: 'fa-shapes',            color: '#f97316', fullName: 'Matemática visual (apoio passo-a-passo)' },
    som_plus:         { name: 'Som+',              icon: 'fa-book-open',         color: '#0891b2', fullName: 'Consciência fonológica avançada' },
    estudo_meio:      { name: 'Estudo do Meio',    icon: 'fa-globe',             color: '#16a34a' },
    ingles:           { name: 'Inglês',            icon: 'fa-language',          color: '#7c3aed' },
    cidadania:        { name: 'Cidadania',         icon: 'fa-people-group',      color: '#0891b2', fullName: 'Cidadania e Desenvolvimento' },
    detetive:         { name: 'Detetive Mental',   icon: 'fa-magnifying-glass',  color: '#9333ea', fullName: 'Raciocínio, leitura activa e número-sensibilidade' },
    escrita:          { name: 'Escrita',           icon: 'fa-pen-fancy',         color: '#e11d48', fullName: 'Oficina de Escrita — construir frases e textos' }
};

const CURRICULUM_3 = {
    portugues: [
        'Sílabas', 'Ditongos e hiatos', 'Acentuação', 'Translineação',
        'Nomes (próprios, comuns, coletivos)', 'Determinantes', 'Pronomes pessoais',
        'Adjetivos', 'Verbos', 'Plurais e feminino',
        'Tipos de frase', 'Sinónimos e antónimos', 'Família de palavras',
        'Compreensão de texto', 'Texto poético', 'Banda desenhada'
    ],
    matematica: [
        'Números até 10 000', 'Valor posicional', 'Adição e subtração', 'Multiplicação',
        'Tabuadas', 'Cálculo mental', 'Divisão', 'Múltiplos e divisores',
        'Frações', 'Polígonos', 'Sólidos geométricos', 'Perímetro',
        'Comprimento', 'Massa e capacidade', 'Tempo', 'Dinheiro', 'Tabelas e gráficos'
    ],
    estudo_meio: [
        'O passado da criança', 'O corpo humano', 'Os sistemas do corpo',
        'A saúde e a prevenção', 'Os cinco sentidos',
        'O passado do meio local', 'Símbolos nacionais', 'Instituições e serviços',
        'Os astros', 'Aspetos físicos do meio', 'Animais', 'Plantas',
        'Materiais e objetos', 'Experiências'
    ],
    ingles: [
        'Greetings and feelings', 'School things', 'Toys and playtime',
        'Rooms at home', 'Family members', 'Farm animals', 'My town',
        'Clothes', 'Hobbies and sports', 'Numbers and colours'
    ],
    cidadania: [
        'Direitos e deveres', 'Regras de convivência', 'Diversidade e respeito',
        'Ambiente e sustentabilidade', 'Segurança rodoviária', 'Saúde e bem-estar'
    ],
    mat_plus: [
        'Quantos vês?', 'Centenas com ten-frames', 'Decompor até 10 000', 'Linha numérica até 10 000', 'Comparar números grandes', 'Aproximar à dezena ou centena', 'Estimar e aproximar', 'Adição com transporte', 'Subtração com empréstimo', 'Tabuada do 6 visual', 'Tabuada do 7 visual', 'Tabuada do 8 visual', 'Tabuada do 9 visual', 'Famílias de factos', 'Multiplicação × 10, 100, 1000', 'Multiplicação por 1 dígito', 'Divisão por partilha', 'Divisão com resto', 'Frações — partes iguais', 'Frações — comparar', 'Modelo de barra', 'Problemas em 2 passos'
    ],
    som_plus: [
        'Rimas com palavras longas', 'Contar sílabas (3-4)', 'Sílaba tónica', 'Sílaba átona', 'Dígrafos LH, NH, CH', 'RR e SS (consoantes dobradas)', 'Encontros consonantais', 'Encontros vocálicos', 'Hiatos', 'Ditongos orais e nasais', 'Pares mínimos avançados', 'Sons que se confundem (B/V, F/V)', 'Trocar uma sílaba', 'Tirar uma sílaba', 'Trocar fonema inicial', 'Segmentar fonemas', 'Famílias de palavras', 'Palavras compostas', 'Trava-línguas', 'Memória auditiva avançada'
    ],
    leitura: [
        'Lê com as vírgulas', 'Lê um diálogo', 'Voz sobe na pergunta', 'Voz com emoção', 'Lê e descobre os sentimentos', 'Lê e descobre o que vai acontecer', 'Lê uma carta', 'Lê uma lenda'
    ],
    detetive: [
        'Charadas matemáticas', 'Histórias-mistério', 'Padrões e sequências', 'Sudoku & Kakuro', 'Lógica pura'
    ],
    escrita: [
        'Maiúscula e ponto final', 'Frase com sentido', 'Palavras que ligam', 'Ordena a história', 'Do plano ao texto', 'Descrever com pormenor'
    ]
};

const PERIODS_3 = {
    portugues: {
        'Sílabas':1, 'Ditongos e hiatos':1, 'Acentuação':1, 'Translineação':1,
        'Nomes (próprios, comuns, coletivos)':2, 'Determinantes':2, 'Pronomes pessoais':2,
        'Adjetivos':2, 'Verbos':2, 'Plurais e feminino':2,
        'Tipos de frase':3, 'Sinónimos e antónimos':3, 'Família de palavras':3,
        'Compreensão de texto':3, 'Texto poético':3, 'Banda desenhada':3
    },
    matematica: {
        'Números até 10 000':1, 'Valor posicional':1, 'Adição e subtração':1, 'Multiplicação':1,
        'Tabuadas':2, 'Cálculo mental':2, 'Divisão':2, 'Múltiplos e divisores':2,
        'Frações':3, 'Polígonos':3, 'Sólidos geométricos':3, 'Perímetro':3,
        'Comprimento':3, 'Massa e capacidade':3, 'Tempo':3, 'Dinheiro':3, 'Tabelas e gráficos':3
    },
    estudo_meio: {
        'O passado da criança':1, 'O corpo humano':1, 'Os sistemas do corpo':1,
        'A saúde e a prevenção':1, 'Os cinco sentidos':1,
        'O passado do meio local':2, 'Símbolos nacionais':2, 'Instituições e serviços':2,
        'Os astros':3, 'Aspetos físicos do meio':3, 'Animais':3, 'Plantas':3,
        'Materiais e objetos':3, 'Experiências':3
    },
    ingles: {
        'Greetings and feelings':1, 'School things':1, 'Numbers and colours':1,
        'Toys and playtime':2, 'Rooms at home':2, 'Family members':2,
        'Farm animals':3, 'My town':3, 'Clothes':3, 'Hobbies and sports':3
    },
    cidadania: {
        'Direitos e deveres':1, 'Regras de convivência':1,
        'Diversidade e respeito':2, 'Saúde e bem-estar':2,
        'Ambiente e sustentabilidade':3, 'Segurança rodoviária':3
    },
    mat_plus: { 'Quantos vês?':1, 'Estimar e aproximar':2, 'Centenas com ten-frames':1, 'Decompor até 10 000':1, 'Linha numérica até 10 000':1, 'Comparar números grandes':1, 'Aproximar à dezena ou centena':1, 'Adição com transporte':2, 'Subtração com empréstimo':2, 'Tabuada do 6 visual':2, 'Tabuada do 7 visual':2, 'Tabuada do 8 visual':2, 'Tabuada do 9 visual':2, 'Famílias de factos':2, 'Multiplicação × 10, 100, 1000':2, 'Multiplicação por 1 dígito':2, 'Divisão por partilha':3, 'Divisão com resto':3, 'Frações — partes iguais':3, 'Frações — comparar':3, 'Modelo de barra':3, 'Problemas em 2 passos':3 },
    som_plus: { 'Rimas com palavras longas':1, 'Contar sílabas (3-4)':1, 'Sílaba tónica':1, 'Sílaba átona':1, 'Dígrafos LH, NH, CH':1, 'RR e SS (consoantes dobradas)':2, 'Encontros consonantais':2, 'Encontros vocálicos':2, 'Hiatos':2, 'Ditongos orais e nasais':2, 'Pares mínimos avançados':2, 'Sons que se confundem (B/V, F/V)':2, 'Trocar uma sílaba':3, 'Tirar uma sílaba':3, 'Trocar fonema inicial':3, 'Segmentar fonemas':3, 'Famílias de palavras':3, 'Palavras compostas':3, 'Trava-línguas':3, 'Memória auditiva avançada':3 },
    leitura: {
        'Lê com as vírgulas':1,
        'Lê um diálogo':1,
        'Voz sobe na pergunta':1,
        'Voz com emoção':2,
        'Lê e descobre os sentimentos':2,
        'Lê e descobre o que vai acontecer':2,
        'Lê uma carta':3,
        'Lê uma lenda':3
    },
    detetive: {
        'Charadas matemáticas':1, 'Padrões e sequências':1,
        'Histórias-mistério':2,
        'Sudoku & Kakuro':3, 'Lógica pura':3
    },
    escrita: {
        'Maiúscula e ponto final':1, 'Frase com sentido':1,
        'Palavras que ligam':2, 'Ordena a história':2,
        'Do plano ao texto':3, 'Descrever com pormenor':3
    }
};

// LIÇÕES — Português e Matemática reaproveitam o bloco Oceanus
// (mesmo programa nacional / AE 2018). Restantes disciplinas são novas.
const LESSONS_3 = {}; // v572: lições em content_y*.js (lazy por ano)

// ============================================================
// DETETIVE MENTAL — disciplina nova de raciocínio (3º ano)
// Mistura charadas matemáticas, mistérios de leitura, padrões,
// estimativa, sudoku 4×4 e lógica pura. Cada puzzle treina ao
// mesmo tempo número-sensibilidade (anti-discalculia) e leitura
// activa (ler para resolver). 8 semanas, ~50 puzzles.
// ============================================================
// Todos os exercícios da Detetive Mental são MINI-JOGOS interactivos.
// Engines: sudoku4, cofre (código N-dígitos), estimador (slider),
// suspeitos (eliminar), padrao (sequência).
const EXERCISES_3_DETETIVE = []; // v571: banco base em content_y*.js (lazy por ano)

const EXERCISES_3 = []; // v571: banco base em content_y*.js (lazy por ano)

// ============================================================
// ===================== 5.º ANO ==============================
// ============================================================
const SUBJECTS_5 = {
    portugues:  { name: 'Português',  icon: 'fa-book',         color: '#e11d48' },
    matematica: { name: 'Matemática', icon: 'fa-calculator',   color: '#2563eb' },
    ingles:     { name: 'Inglês',     icon: 'fa-language',     color: '#16a34a' },
    ciencias:   { name: 'Ciências',   icon: 'fa-leaf',         color: '#0891b2' },
    hgp:        { name: 'HGP',        icon: 'fa-landmark',     color: '#b45309', fullName: 'História e Geografia de Portugal' }
};

// ========== LIÇÕES (mini-explicações por tópico) ==========
// Chave: `${subject}/${topic}` (o tópico corresponde ao campo t do exercício)
const LESSONS_5 = {}; // v572: lições em content_y*.js (lazy por ano)

// ========== EXERCÍCIOS ==========
// Total: ~160 exercícios, ~20-30 por disciplina (Matemática enriquecida ao estilo MX 5)
const EXERCISES_5 = []; // v571: banco base em content_y*.js (lazy por ano)

// ========== CURRICULUM (ordem dos tópicos do livro / programa) ==========
// Ordem aproximada dos manuais do 5.º ano (Porto Editora MX 5 para Matemática).
const CURRICULUM_5 = {
    matematica: [
        // 1.º Período — Números e operações
        'Números naturais',
        'Operações',
        'Divisibilidade',
        'Números primos',
        'MMC/MDC',
        'Potências',
        // 2.º Período — Números racionais
        'Frações',
        'Dízimas',
        'Percentagens',
        'Sequências',
        // 3.º Período — Geometria e Estatística
        'Ângulos',
        'Retas',
        'Simetrias',
        'Construções geométricas',
        'Triângulos',
        'Quadriláteros',
        'Perímetros',
        'Áreas',
        'Volume',
        'Estatística'
    ],
    portugues: [
        // Compreensão de textos primeiro (ler)
        'Tipos de texto',
        // Gramática — palavras (classes)
        'Classes de palavras',
        'Determinantes',
        'Pronomes',
        'Verbos',
        // Sintaxe (frase)
        'Funções sintáticas',
        // Recursos literários
        'Recursos expressivos',
        // Escrita correcta
        'Ortografia',
        'Pontuação',
        'Plurais'
    ],
    ingles: [
        'Greetings',
        'Numbers',
        'Days',
        'Months',
        'Family',
        'School',
        'Colors',
        'Articles',
        'Demonstratives',
        'Possessives',
        'Verb to be',
        'Have got',
        'There is/are',
        'Plurals',
        'Present simple',
        'Prepositions',
        'Questions',
        // P3 — orientadores 5.o ano (vocabulario + gramatica essenciais)
        'Telling the time',
        'Daily routines',
        'Jobs',
        'Prepositions of time'
    ],
    ciencias: [
        // VOLUME 1 — A Terra no Espaço; A Terra em Transformação
        'A Terra – Planeta especial',
        'Rochas',
        'Solo',
        'Água',
        'O ar',
        // VOLUME 2 — Diversidade de Seres Vivos e suas Interações com o Meio
        'Seres vivos',
        'Classificação',
        'Vertebrados',
        'Anfíbios',
        'Aves',
        'Invertebrados',
        'Revestimento',
        'Reprodução',
        'Alimentação',
        'Habitat',
        'Ecossistema',
        'Cadeia alimentar',
        'Plantas',
        'A biodiversidade',
        'A célula e a vida'
    ],
    hgp: [
        // GEOGRAFIA — do mais geral (Mundo) ao mais particular (Portugal)
        'Continentes',
        'Oceanos',
        'Pontos cardeais',
        'Capitais',
        'Europa',
        'Localização',
        'Fronteiras',
        'Relevo',
        'Montanha',
        'Rios',
        'Clima',
        'Distritos',
        'Ilhas',
        // HISTÓRIA — em ordem cronológica
        'Pré-história',
        'Romanos',
        'Bárbaros',
        'Muçulmanos',
        'Reconquista',
        'Fundação',
        'Lisboa',
        'Batalhas',
        'Reis',
        'Cultura',
        'Dinastias',
        'Início dos Descobrimentos',
        'Símbolos',
        'Ordem cronológica'
    ]
};

// ============================================================
// ===================== 6.º ANO ==============================
// ============================================================
const SUBJECTS_6 = {
    portugues:  { name: 'Português',  icon: 'fa-book',         color: '#e11d48' },
    matematica: { name: 'Matemática', icon: 'fa-calculator',   color: '#2563eb' },
    ingles:     { name: 'Inglês',     icon: 'fa-language',     color: '#16a34a' },
    ciencias:   { name: 'Ciências',   icon: 'fa-leaf',         color: '#0891b2' },
    hgp:        { name: 'HGP',        icon: 'fa-landmark',     color: '#b45309', fullName: 'História e Geografia de Portugal' }
};

const LESSONS_6 = {}; // v572: lições em content_y*.js (lazy por ano)

const EXERCISES_6 = []; // v571: banco base em content_y*.js (lazy por ano)

const CURRICULUM_6 = {
    portugues: [
        // P1 — Educação literária (narrativa) + revisão gramatical (classes/pronomes)
        'Texto narrativo',
        'Pronomes e determinantes',
        'Texto poético',
        'Modos verbais',
        // P2 — Texto dramático + sintaxe + voz
        'Texto dramático',
        'Funções sintáticas',
        'Frase ativa e passiva',
        'Tempos compostos',
        'Discurso direto e indireto',
        // P3 — Recursos expressivos + ortografia + orações + texto jornalístico
        'Recursos expressivos',
        'Acentuação gráfica',
        'Orações coordenadas e subordinadas',
        'Notícia e entrevista'
    ],
    matematica: [
        // P1 — Números e operações
        'Números racionais não negativos',
        'Operações com frações',
        'Potências de expoente natural',
        'Expressões numéricas',
        'Sequências e regularidades',
        // P2 — Proporcionalidade e geometria
        'Razões',
        'Razões e proporções',
        'Proporcionalidade direta',
        'Áreas de polígonos',
        'Áreas e perímetros do círculo',
        'Isometrias',
        'Ângulos internos de polígonos',
        // P3 — Volumes, inteiros, equações, estatística, probabilidades
        'Volumes de prismas e cilindros',
        'Números inteiros relativos',
        'Equações simples',
        'Estatística',
        'Representações gráficas',
        'Probabilidades'
    ],
    ingles: [
        'Past simple',
        'Present continuous',
        'Future',
        'Comparatives & superlatives',
        'Daily routines',
        'Health & body',
        'Quantifiers',
        'Adverbs of frequency'
    ],
    ciencias: [
        // P1 — Processos vitais (parte 1): digestão, respiração, circulação
        'Sistema digestivo',
        'Sistema respiratório',
        'Sistema circulatório',
        // P2 — Processos vitais (parte 2) e funções de relação/reprodução
        'Sistema excretor',
        'Sistema reprodutor',
        'Sistema nervoso',
        'Sistema imunitário',
        // P3 — Plantas (teste 3.º período), microrganismos e ambiente
        'As plantas e o meio',
        'Reprodução das plantas com semente',
        'Microrganismos',
        'Saúde e prevenção'
    ],
    hgp: [
        // P1 — Séculos XV-XVII: Expansão e União Ibérica
        'Expansão Marítima',
        'União Ibérica',
        'Restauração da Independência',
        // P2 — Séculos XVIII-XIX: Absolutismo, Iluminismo e Liberalismo
        'Iluminismo e Marquês de Pombal',
        'Invasões Francesas',
        'Liberalismo',
        'Monarquia Constitucional',
        '1.ª República',
        // P3 — Séculos XX-XXI: Estado Novo, Democracia e Portugal hoje
        'Estado Novo',
        '25 de Abril',
        'Portugal democrático'
    ]
};

// Períodos do 6.º ano alinhados com Mensagens 6 (Texto), MX 6 (Porto Editora),
// Hop on 6 (Porto Editora), UAU! Vida 6 (Areal) e Aqui há HGP 6 (Areal).
const PERIODS_6 = {
    portugues:  {
        'Texto narrativo':1, 'Pronomes e determinantes':1, 'Texto poético':1, 'Modos verbais':1,
        'Texto dramático':2, 'Funções sintáticas':2, 'Frase ativa e passiva':2,
        'Tempos compostos':2, 'Discurso direto e indireto':2,
        'Recursos expressivos':3, 'Acentuação gráfica':3,
        'Orações coordenadas e subordinadas':3, 'Notícia e entrevista':3
    },
    matematica: {
        'Números racionais não negativos':1, 'Operações com frações':1,
        'Potências de expoente natural':1, 'Expressões numéricas':1, 'Sequências e regularidades':1,
        'Razões':2, 'Razões e proporções':2, 'Proporcionalidade direta':2,
        'Áreas de polígonos':2, 'Áreas e perímetros do círculo':2,
        'Isometrias':2, 'Ângulos internos de polígonos':2,
        'Volumes de prismas e cilindros':3, 'Números inteiros relativos':3,
        'Equações simples':3, 'Estatística':3, 'Representações gráficas':3, 'Probabilidades':3
    },
    ingles:     {
        'Past simple':1, 'Present continuous':1,
        'Future':2, 'Comparatives & superlatives':2, 'Daily routines':2,
        'Health & body':3, 'Quantifiers':3, 'Adverbs of frequency':3
    },
    ciencias:   {
        // P1 — digestivo, respiratório, circulatório
        'Sistema digestivo':1, 'Sistema respiratório':1, 'Sistema circulatório':1,
        // P2 — excretor, reprodutor, nervoso, imunitário
        'Sistema excretor':2, 'Sistema reprodutor':2, 'Sistema nervoso':2, 'Sistema imunitário':2,
        // P3 — plantas (teste 3.º período), microrganismos, saúde
        'As plantas e o meio':3, 'Reprodução das plantas com semente':3,
        'Microrganismos':3, 'Saúde e prevenção':3
    },
    hgp:        {
        // P1 — séculos XV-XVII
        'Expansão Marítima':1, 'União Ibérica':1, 'Restauração da Independência':1,
        // P2 — séculos XVIII-XIX
        'Iluminismo e Marquês de Pombal':2, 'Invasões Francesas':2, 'Liberalismo':2,
        'Monarquia Constitucional':2, '1.ª República':2,
        // P3 — séculos XX-XXI
        'Estado Novo':3, '25 de Abril':3, 'Portugal democrático':3
    }
};

// ============================================================
// ====== 7.º ANO — ESCOLA SEC. TOMAZ PELAYO (year=7) =========
// Currículo Aprendizagens Essenciais 2018, alinhado com os
// manuais adotados pela Escola Secundária Tomaz Pelayo (Santo
// Tirso), 2024/2025. Língua Estrangeira II = Francês.
//
//  • Português:           Palavra-chave 7 (Porto Editora)
//  • Matemática:          Espiral 7 (Porto Editora)
//  • Inglês:              Fly High 7 (Asa Editores)
//  • Francês (LE II):     C'est cool! 7 (Asa Editores)
//  • História:            Somos História 7 (Areal Editores)
//  • Geografia:           PLANETA 7 (Porto Editora)
//  • Ciências Naturais:   GEOCienTIC 7 (Porto Editora)
//  • Físico-Química:      FQ 7 (novo) (Asa Editores)
//  • Educação Visual:     Novo Visual 7/8/9 (Porto Editora)
//  • TIC:                 Login 7 (Asa Editores)
//  • Educação Física:     Fair Play 7/8/9 (Texto Editores)
// ============================================================
const SUBJECTS_7 = {
    portugues:          { name: 'Português',         icon: 'fa-book',            color: '#e11d48' },
    matematica:         { name: 'Matemática',        icon: 'fa-calculator',      color: '#2563eb' },
    ingles:             { name: 'Inglês',            icon: 'fa-language',        color: '#7c3aed' },
    frances:            { name: 'Francês',           icon: 'fa-flag',            color: '#0ea5e9', fullName: 'Francês (LE II)' },
    historia:           { name: 'História',          icon: 'fa-landmark',        color: '#b45309' },
    geografia:          { name: 'Geografia',         icon: 'fa-earth-europe',    color: '#16a34a' },
    ciencias_naturais:  { name: 'Ciências Naturais', icon: 'fa-leaf',            color: '#15803d' },
    fisico_quimica:     { name: 'Físico-Química',    icon: 'fa-flask',           color: '#9333ea' },
    educacao_visual:    { name: 'Ed. Visual',        icon: 'fa-palette',         color: '#f59e0b', fullName: 'Educação Visual' },
    tic:                { name: 'TIC',               icon: 'fa-laptop-code',     color: '#475569', fullName: 'Tecnologias de Informação e Comunicação' },
    educacao_fisica:    { name: 'Ed. Física',        icon: 'fa-person-running',  color: '#dc2626', fullName: 'Educação Física' }
};

const CURRICULUM_7 = {
    portugues: [
        'Texto narrativo', 'Conto tradicional', 'Os Lusíadas (excertos)',
        'Sujeito e predicado', 'Complementos verbais',
        'Texto poético', 'Modificadores', 'Frase simples e complexa', 'Orações coordenadas',
        'Texto dramático', 'Orações subordinadas', 'Discurso direto e indireto',
        'Modo conjuntivo', 'Recursos expressivos'
    ],
    matematica: [
        'Números racionais', 'Adição e subtração de racionais', 'Multiplicação e divisão de racionais', 'Potências',
        'Sequências e regularidades', 'Expressões algébricas', 'Equações do 1.º grau',
        'Funções (introdução)', 'Proporcionalidade direta',
        'Semelhança de figuras', 'Teorema de Pitágoras', 'Áreas e volumes', 'Estatística'
    ],
    ingles: [
        'All about me', 'Daily routines', 'School life', 'Free time and hobbies',
        'Healthy lifestyle', 'Holidays and travel', 'Technology', 'Environment'
    ],
    frances: [
        'Salutations et présentations', 'La famille', "L'école", 'Les loisirs',
        'La nourriture', 'La ville', 'Les vêtements', 'Les saisons et la météo'
    ],
    historia: [
        'Pré-história e primeiras civilizações', 'Grécia Antiga', 'Atenas e a democracia',
        'Roma Antiga', 'Cristianismo', 'Idade Média na Europa',
        'Mundo Muçulmano', 'Formação de Portugal', 'Sociedade medieval portuguesa',
        'Crise do século XIV'
    ],
    geografia: [
        'Representações cartográficas', 'Escalas', 'Coordenadas geográficas',
        'Relevo', 'Clima', 'Hidrografia', 'Vegetação natural', 'Recursos naturais'
    ],
    ciencias_naturais: [
        'A Terra como sistema', 'Subsistemas terrestres',
        'Estrutura interna da Terra', 'Tectónica de placas',
        'Rochas', 'Minerais', 'Vulcanologia', 'Sismologia', 'Fósseis e tempo geológico'
    ],
    fisico_quimica: [
        'O Universo', 'Sistema Solar', 'A Terra, a Lua e as forças gravíticas',
        'Substâncias e misturas', 'Estados físicos da matéria',
        'Transformações físicas', 'Transformações químicas', 'Massa volúmica'
    ],
    educacao_visual: [
        'Ponto, linha e plano', 'Cor', 'Forma e composição',
        'Perspetiva', 'Luz e sombra', 'Comunicação visual'
    ],
    tic: [
        'Hardware e software', 'Sistema operativo', 'Internet e navegação',
        'Segurança online', 'Processador de texto', 'Folha de cálculo', 'Apresentações eletrónicas'
    ],
    educacao_fisica: [
        'Aquecimento e arrefecimento', 'Capacidades físicas', 'Atletismo',
        'Ginástica', 'Modalidades coletivas', 'Regras gerais do desporto'
    ]
};

const PERIODS_7 = {
    portugues: {
        'Texto narrativo':1, 'Conto tradicional':1, 'Os Lusíadas (excertos)':1,
        'Sujeito e predicado':1, 'Complementos verbais':1,
        'Texto poético':2, 'Modificadores':2, 'Frase simples e complexa':2, 'Orações coordenadas':2,
        'Texto dramático':3, 'Orações subordinadas':3, 'Discurso direto e indireto':3,
        'Modo conjuntivo':3, 'Recursos expressivos':3
    },
    matematica: {
        'Números racionais':1, 'Adição e subtração de racionais':1, 'Multiplicação e divisão de racionais':1, 'Potências':1,
        'Sequências e regularidades':2, 'Expressões algébricas':2, 'Equações do 1.º grau':2,
        'Funções (introdução)':2, 'Proporcionalidade direta':2,
        'Semelhança de figuras':3, 'Teorema de Pitágoras':3, 'Áreas e volumes':3, 'Estatística':3
    },
    ingles: {
        'All about me':1, 'Daily routines':1, 'School life':1,
        'Free time and hobbies':2, 'Healthy lifestyle':2, 'Holidays and travel':2,
        'Technology':3, 'Environment':3
    },
    frances: {
        'Salutations et présentations':1, 'La famille':1, "L'école":1,
        'Les loisirs':2, 'La nourriture':2, 'La ville':2,
        'Les vêtements':3, 'Les saisons et la météo':3
    },
    historia: {
        'Pré-história e primeiras civilizações':1, 'Grécia Antiga':1, 'Atenas e a democracia':1, 'Roma Antiga':1,
        'Cristianismo':2, 'Idade Média na Europa':2, 'Mundo Muçulmano':2,
        'Formação de Portugal':3, 'Sociedade medieval portuguesa':3, 'Crise do século XIV':3
    },
    geografia: {
        'Representações cartográficas':1, 'Escalas':1, 'Coordenadas geográficas':1,
        'Relevo':2, 'Clima':2,
        'Hidrografia':3, 'Vegetação natural':3, 'Recursos naturais':3
    },
    ciencias_naturais: {
        'A Terra como sistema':1, 'Subsistemas terrestres':1,
        'Estrutura interna da Terra':2, 'Tectónica de placas':2,
        'Rochas':2, 'Minerais':2,
        'Vulcanologia':3, 'Sismologia':3, 'Fósseis e tempo geológico':3
    },
    fisico_quimica: {
        'O Universo':1, 'Sistema Solar':1, 'A Terra, a Lua e as forças gravíticas':1,
        'Substâncias e misturas':2, 'Estados físicos da matéria':2,
        'Transformações físicas':3, 'Transformações químicas':3, 'Massa volúmica':3
    },
    educacao_visual: {
        'Ponto, linha e plano':1, 'Cor':1,
        'Forma e composição':2, 'Perspetiva':2,
        'Luz e sombra':3, 'Comunicação visual':3
    },
    tic: {
        'Hardware e software':1, 'Sistema operativo':1,
        'Internet e navegação':2, 'Segurança online':2,
        'Processador de texto':3, 'Folha de cálculo':3, 'Apresentações eletrónicas':3
    },
    educacao_fisica: {
        'Aquecimento e arrefecimento':1, 'Capacidades físicas':1,
        'Atletismo':2, 'Ginástica':2,
        'Modalidades coletivas':3, 'Regras gerais do desporto':3
    }
};

const LESSONS_7 = {}; // v572: lições em content_y*.js (lazy por ano)

const EXERCISES_7 = []; // v571: banco base em content_y*.js (lazy por ano)

// ============================================================
// =============== EXPORTS / SELECTOR DE ANO ==================
// ============================================================
const PERIODS_5 = {
    matematica:  { 'Números naturais':1, 'Divisibilidade':1, 'Números primos':1, 'MMC/MDC':1, 'Potências':1, 'Operações':1, 'Frações':2, 'Dízimas':2, 'Percentagens':2, 'Sequências':2, 'Ângulos':2, 'Retas':2, 'Triângulos':3, 'Quadriláteros':3, 'Perímetros':3, 'Áreas':3, 'Volume':3, 'Estatística':3 },
    portugues:   { 'Ortografia':1, 'Classes de palavras':1, 'Determinantes':1, 'Pronomes':2, 'Verbos':2, 'Funções sintáticas':2, 'Pontuação':2, 'Plurais':3, 'Recursos expressivos':3, 'Tipos de texto':3 },
    ingles:      { 'Greetings':1, 'Numbers':1, 'Days':1, 'Months':1, 'Family':1, 'School':2, 'Colors':2, 'Articles':2, 'Verb to be':2, 'Plurals':3, 'Present simple':3, 'Prepositions':3, 'Questions':3, 'Telling the time':3, 'Daily routines':3, 'Jobs':3, 'Prepositions of time':3 },
    ciencias:    { 'Seres vivos':1, 'Classificação':1, 'Vertebrados':1, 'Anfíbios':1, 'Aves':1, 'Invertebrados':1, 'Revestimento':2, 'Alimentação':2, 'Reprodução':2, 'Cadeia alimentar':2, 'Ecossistema':2, 'Habitat':2, 'Plantas':3, 'Água':3, 'Solo':3, 'Rochas':3 },
    hgp:         { 'Localização':1, 'Fronteiras':1, 'Continentes':1, 'Oceanos':1, 'Europa':1, 'Pontos cardeais':1, 'Distritos':1, 'Capitais':1, 'Rios':2, 'Relevo':2, 'Montanha':2, 'Ilhas':2, 'Clima':2, 'Pré-história':2, 'Romanos':2, 'Bárbaros':2, 'Muçulmanos':3, 'Reconquista':3, 'Fundação':3, 'Lisboa':3, 'Batalhas':3, 'Reis':3, 'Cultura':3, 'Símbolos':3, 'Dinastias':3, 'Início dos Descobrimentos':3, 'Ordem cronológica':3 }
};

// ============================================================
// =============== 11.º ANO — FÍSICO-QUÍMICA A ================
// ============================================================
// Apenas Química (a Física fica para futura adição). Conteúdos
// alinhados com as Aprendizagens Essenciais (DGE).
const SUBJECTS_11 = {
    quimica: { name: 'Química', icon: 'fa-flask', color: '#0891b2', fullName: 'Físico-Química A — Química' }
};

const CURRICULUM_11 = {
    quimica: [
        'Equilíbrio químico — conceito e Kc',
        'Quociente de reação e princípio de Le Châtelier',
        'Equilíbrio ácido-base — pH e Kw',
        'Ácidos e bases fortes e fracos — Ka e Kb',
        'Soluções tampão e titulações ácido-base',
        'Solubilidade e produto de solubilidade (Ks)',
        'Equilíbrio de oxidação-redução',
        'Pilhas e potenciais de elétrodo'
    ]
};

const PERIODS_11 = {
    quimica: {
        'Equilíbrio químico — conceito e Kc': 1,
        'Quociente de reação e princípio de Le Châtelier': 1,
        'Equilíbrio ácido-base — pH e Kw': 2,
        'Ácidos e bases fortes e fracos — Ka e Kb': 2,
        'Soluções tampão e titulações ácido-base': 2,
        'Solubilidade e produto de solubilidade (Ks)': 3,
        'Equilíbrio de oxidação-redução': 3,
        'Pilhas e potenciais de elétrodo': 3
    }
};

const LESSONS_11 = {
    'quimica/Equilíbrio químico — conceito e Kc': {
        title: 'Equilíbrio químico e constante Kc',
        body: `**1. Reação reversível e equilíbrio**\nNuma reação reversível aA + bB ⇌ cC + dD, atingido o equilíbrio:\n• as concentrações deixam de variar (equilíbrio DINÂMICO)\n• velocidade direta = velocidade inversa\n• a reação continua a ocorrer nos dois sentidos à mesma taxa\n\n**2. Constante de equilíbrio Kc**\n   **Kc = [C]ᶜ · [D]ᵈ / ([A]ᵃ · [B]ᵇ)**\n(concentrações em mol/dm³, em EQUILÍBRIO)\n\n**3. Regras importantes**\n• Sólidos puros e líquidos puros NÃO entram na expressão.\n• Kc depende APENAS da temperatura.\n• Kc grande (>>1) → equilíbrio favorece produtos.\n• Kc pequeno (<<1) → equilíbrio favorece reagentes.\n• Reação inversa: Kc' = 1/Kc.\n• Equação multiplicada por n: novo Kc = (Kc original)ⁿ.\n• Soma de equações: multiplicar Kc.\n\n**4. Exemplo numérico**\nN₂(g) + 3 H₂(g) ⇌ 2 NH₃(g) num reator de 2,0 dm³:\nNo equilíbrio: 0,40 mol N₂; 1,20 mol H₂; 0,80 mol NH₃.\nConcentrações: [N₂]=0,20; [H₂]=0,60; [NH₃]=0,40.\nKc = (0,40)² / (0,20 · 0,60³) = 0,16 / 0,0432 ≈ 3,7.\n\n**❌ ERROS FREQUENTES EM EXAME**\n• Incluir sólidos ou H₂O líquida na expressão de Kc — NÃO entram.\n• Esquecer os EXPOENTES (coeficientes estequiométricos).\n• Trocar produtos por reagentes — Kc tem produtos no NUMERADOR.\n• Usar moles em vez de concentrações (mol/dm³).\n• Achar que Kc muda com a concentração ou catalisador — só com T.\n• Dar valor de Kc com unidades — Kc é adimensional (definição IUPAC moderna).`
    },
    'quimica/Quociente de reação e princípio de Le Châtelier': {
        title: 'Quociente Qc e princípio de Le Châtelier',
        body: `**1. Quociente de reação Qc**\nTem a MESMA forma de Kc mas com concentrações em QUALQUER instante (não necessariamente equilíbrio).\n\n**2. Comparação Qc vs Kc**\n• Qc < Kc → reação evolui no sentido DIRECTO (forma mais produtos)\n• Qc > Kc → reação evolui no sentido INVERSO (forma mais reagentes)\n• Qc = Kc → sistema em EQUILÍBRIO\n\nMnemónica: o sistema evolui sempre para "Q chegar a K".\n\n**3. Princípio de Le Châtelier**\n"Quando uma perturbação é imposta a um sistema em equilíbrio, o sistema evolui no sentido que CONTRARIA essa perturbação."\n\n**4. Efeitos das perturbações**\n• ↑ [reagente] → desloca para PRODUTOS (consome o excesso)\n• ↑ [produto] → desloca para REAGENTES\n• Remover produto → desloca para PRODUTOS\n\n**Temperatura**:\n• EXOTÉRMICA (ΔH<0, calor é "produto"): ↑T → desloca para REAGENTES; Kc DIMINUI\n• ENDOTÉRMICA (ΔH>0, calor é "reagente"): ↑T → desloca para PRODUTOS; Kc AUMENTA\n\n**Pressão (gases)**:\n• ↑P (↓V) → desloca para o lado com MENOS moles GASOSAS\n• ↓P (↑V) → desloca para o lado com MAIS moles gasosas\n• Se Δnᵍ = 0 → P NÃO desloca o equilíbrio\n\n**Catalisador**: acelera AMBOS os sentidos por igual → NÃO desloca o equilíbrio, NÃO altera Kc. Só faz chegar mais depressa ao equilíbrio.\n\n**Adição de gás inerte (a V constante)**: NÃO altera as pressões parciais → NÃO desloca o equilíbrio.\n\n**❌ ERROS FREQUENTES EM EXAME**\n• Achar que catalisador desloca o equilíbrio — NÃO desloca.\n• Confundir sentido direto com inverso quando Qc < Kc (sistema vai PARA produtos).\n• Aplicar regra da pressão quando Δnᵍ = 0 (ex: H₂ + I₂ ⇌ 2 HI) — não há efeito.\n• Inverter o efeito da temperatura (exo/endo).\n• Esquecer que apenas a TEMPERATURA altera o valor de Kc.\n• Pensar que adicionar gás inerte a V constante desloca — não desloca.`
    },
    'quimica/Equilíbrio ácido-base — pH e Kw': {
        title: 'Equilíbrio ácido-base — pH, pOH e Kw',
        body: `**1. Brønsted-Lowry (1923)**\n• **Ácido**: cede um protão (H⁺).\n• **Base**: recebe um protão.\n• **Par conjugado**: HA + B ⇌ A⁻ + HB⁺.\n• **Anfotérica** (anfiprótica): pode atuar como ácido OU base. Ex: H₂O, HCO₃⁻, HS⁻, H₂PO₄⁻.\n\n**2. Autoionização da água**\n   2 H₂O(ℓ) ⇌ H₃O⁺(aq) + OH⁻(aq)\nA água é simultaneamente o ácido e a base do seu equilíbrio.\n\n**3. Produto iónico da água, Kw**\n   **Kw = [H₃O⁺] · [OH⁻]**\n• A 25 °C: Kw = 1,0 × 10⁻¹⁴ → [H₃O⁺] = [OH⁻] = 1,0 × 10⁻⁷ mol/dm³.\n• Kw depende APENAS da temperatura. Como a autoionização é endotérmica, Kw aumenta com T:\n   — 0 °C ≈ 1,1 × 10⁻¹⁵\n   — 25 °C = 1,0 × 10⁻¹⁴\n   — 50 °C ≈ 5,5 × 10⁻¹⁴\n   — 100 °C ≈ 5,1 × 10⁻¹³\n\n**4. Escala de Sørensen — pH e pOH**\n   pH = −log[H₃O⁺]    pOH = −log[OH⁻]\n   pH + pOH = pKw    (= 14 a 25 °C)\nReversamente: [H₃O⁺] = 10⁻ᵖᴴ.\n\n**5. Classificação (a 25 °C)**\n• pH < 7 → ácida\n• pH = 7 → neutra\n• pH > 7 → básica\n\n**6. Diluição**\n• Diluir ácido → pH sobe (aproxima-se de 7).\n• Diluir base → pH desce (aproxima-se de 7).\n• Por simples diluição, nunca se cruza o valor neutro.\n\n**7. Indicadores ácido-base**\n• Tornesol: vermelho (<5) → azul (>8)\n• Fenolftaleína: incolor (<8,3) → carmim (>10)\n• Azul de bromotimol: amarelo (<6) → azul (>7,6)\n• Alaranjado de metilo: vermelho (<3,1) → amarelo (>4,4)\n\n**❌ ERROS FREQUENTES EM EXAME**\n• Confundir "neutro" com "pH = 7" → SÓ é verdade a 25 °C. Em água pura a 50 °C o pH neutro é ≈ 6,6 (continua neutra porque [H₃O⁺] = [OH⁻]).\n• Esquecer o fator 10 entre unidades de pH: ΔpH = 1 → 10× a [H₃O⁺]. Solução de pH 3 tem 100× mais H₃O⁺ que pH 5.\n• Achar que diluir um ácido pode "passar" para pH > 7 → IMPOSSÍVEL por diluição em água.\n• Pensar que Kw é constante universal → muda com T.`
    },
    'quimica/Ácidos e bases fortes e fracos — Ka e Kb': {
        title: 'Ka, Kb e força de ácidos e bases',
        body: `**1. "Força" = extensão da ionização**\n• **Forte**: ioniza-se quase totalmente (>99%).\n• **Fraco**: ioniza-se parcialmente, em equilíbrio.\nNÃO confundir com concentração! Um ácido pode ser FORTE e DILUÍDO ou FRACO e CONCENTRADO.\n\n**2. Ácidos fortes — memorizar**\nHCl · HBr · HI · HNO₃ · H₂SO₄ (1.ª ioniz.) · HClO₄.\nReacção COMPLETA → para HA de concentração C:\n   [H₃O⁺] ≈ C  →  **pH = −log C**\nEx: HCl 0,01 mol/dm³ → pH = 2.\n\n**3. Bases fortes**\nNaOH · KOH · LiOH · Ca(OH)₂ · Ba(OH)₂.\n   [OH⁻] ≈ C  →  pOH = −log C  →  pH = 14 − pOH (a 25 °C)\n\n**4. Ácidos fracos — Ka**\n   HA + H₂O ⇌ A⁻ + H₃O⁺\n   **Ka = [A⁻]·[H₃O⁺] / [HA]**\n\nValores típicos a 25 °C:\n• HF → 6,8 × 10⁻⁴ (pKa 3,2)\n• CH₃COOH → 1,8 × 10⁻⁵ (pKa 4,7)\n• H₂CO₃ (1.ª) → 4,3 × 10⁻⁷ (pKa 6,4)\n• NH₄⁺ → 5,6 × 10⁻¹⁰ (pKa 9,2)\n• HCN → 6,2 × 10⁻¹⁰ (pKa 9,2)\n\n**Cálculo do pH** (com Ka << C, aproximação x pequeno):\n   **[H₃O⁺] = √(Ka · C)**    →    pH = ½(pKa − log C)\nEx: ácido acético 0,10 mol/dm³ → [H₃O⁺] = √(1,8×10⁻⁵ · 0,10) ≈ 1,3×10⁻³ → pH ≈ 2,9.\n\n**5. Bases fracas — Kb**\n   B + H₂O ⇌ BH⁺ + OH⁻\n   **Kb = [BH⁺]·[OH⁻] / [B]**\nEx: NH₃ → Kb = 1,8 × 10⁻⁵; CH₃COO⁻ → Kb = 5,6 × 10⁻¹⁰.\n\n**6. Relação fundamental: Ka · Kb = Kw**\nPara qualquer par ácido-base CONJUGADO, à mesma T:\n   **Ka(HA) × Kb(A⁻) = Kw**    ⇔    **pKa + pKb = 14** (a 25 °C)\n→ Quanto MAIS forte o ácido, MAIS FRACA a base conjugada.\n\n**7. pKa — escala prática**\n   pKa = −log Ka\n• pKa < 0 → forte\n• 1–5 → moderadamente fraco\n• > 5 → muito fraco\nEntre dois ácidos: o de **MENOR pKa** é o **MAIS FORTE**.\n\n**8. Grau de ionização (α)**\n   α = [H₃O⁺]equilíbrio / C₀ × 100 %\n• Forte → α ≈ 100%\n• Fraco → α normalmente < 5%\n• α AUMENTA com a diluição (Le Châtelier).\n\n**❌ ERROS FREQUENTES EM EXAME**\n• Aplicar **√(Ka·C)** a ácidos FORTES — em fortes [H₃O⁺] = C directamente. A fórmula da raiz só vale para FRACOS.\n• Achar que **pKa maior = ácido mais forte** → é o CONTRÁRIO. pKa menor → mais forte.\n• No **H₂SO₄**, tratar a 2.ª ionização (HSO₄⁻ → H⁺ + SO₄²⁻) como forte — ela é FRACA (Ka₂ ≈ 1,2 × 10⁻²).\n• Confundir ácido **forte** com ácido **concentrado** (e fraco com diluído) — são propriedades INDEPENDENTES.\n• Esquecer que Ka e Kb dependem APENAS da temperatura — concentração não os altera.\n• Calcular pH de ácido fraco e dar resposta com casas decimais a mais — verifica se a aproximação x << C é válida (regra prática: C/Ka > 1000).`
    },
    'quimica/Soluções tampão e titulações ácido-base': {
        title: 'Soluções tampão e titulações',
        body: `**1. Solução tampão**\nMistura de ÁCIDO FRACO + SUA BASE CONJUGADA (ou base fraca + ácido conjugado).\nResiste a variações de pH quando se adiciona pequena quantidade de ácido ou base.\n\n**Mecanismo**:\n• OH⁻ adicionado → consumido pelo ácido fraco do tampão.\n• H₃O⁺ adicionado → consumido pela base conjugada do tampão.\n\n**2. Equação de Henderson-Hasselbalch**\n   **pH = pKa + log ([A⁻] / [HA])**\n\n• Quando [A⁻] = [HA] → pH = pKa (centro do tampão).\n• Tampão é eficaz para **pH ≈ pKa ± 1**.\n\nEx: tampão acético/acetato (pKa 4,74) com [A⁻]/[HA] = 1 → pH = 4,74.\n\n**3. Titulação ácido-base**\nProcesso para determinar a concentração de uma solução através da reação com outra de concentração conhecida (titulante).\n\n**Ponto de equivalência**: nº moles ácido = nº moles base.\n\n**pH no ponto de equivalência**:\n• Ácido forte + base forte → pH = 7 (sal neutro).\n• Ácido fraco + base forte → pH > 7 (base conjugada hidrolisa).\n• Ácido forte + base fraca → pH < 7 (ácido conjugado hidrolisa).\n• Ácido fraco + base fraca → depende do par (raro em escola).\n\n**4. Curva de titulação**\nGráfico pH vs volume de titulante. Característica: SALTO ABRUPTO de pH perto do ponto de equivalência.\n• A meia-titulação (V = ½ V_eq), em ácido fraco: pH = pKa.\n\n**5. Indicadores**\nEscolher indicador cuja zona de viragem inclua o pH do ponto de equivalência:\n• Forte+forte (pH=7) → azul de bromotimol (6,0–7,6)\n• Fraco+forte (pH>7) → fenolftaleína (8,3–10,0)\n• Forte+fraco (pH<7) → alaranjado de metilo (3,1–4,4)\n\n**❌ ERROS FREQUENTES EM EXAME**\n• Achar que tampão MANTÉM o pH constante — apenas RESISTE a variações; o pH muda um pouco.\n• Misturar ácido forte + base conjugada de outro ácido e chamar tampão — só funciona com ácido FRACO + sua PRÓPRIA base conjugada.\n• Confundir ponto de equivalência com pH = 7 — só vale para forte+forte.\n• No ponto de equivalência ácido fraco + base forte, dar pH < 7 (é > 7).\n• Escolher indicador errado (fenolftaleína em titulação forte+fraco).\n• Aplicar Henderson-Hasselbalch a soluções que NÃO são tampão.`
    },
    'quimica/Solubilidade e produto de solubilidade (Ks)': {
        title: 'Solubilidade e Ks',
        body: `**1. Equilíbrio de solubilidade**\nPara um sal pouco solúvel AₐBᵦ(s) em equilíbrio com a solução saturada:\n\n   AₐBᵦ(s) ⇌ a A^(n+)(aq) + b B^(m−)(aq)\n\n**2. Produto de solubilidade Ks**\n   **Ks = [A^(n+)]ᵃ · [B^(m−)]ᵇ**\n(o sólido NÃO entra na expressão)\n\nKs depende APENAS da temperatura. Quanto MENOR o Ks, MENOS solúvel o sal.\n\n**3. Solubilidade s** (mol/dm³)\nConcentração máxima do sal dissolvido em água pura, a uma dada T:\n\n• AB (1:1, ex: AgCl): **s = √Ks**\n• AB₂ ou A₂B (1:2): **s = ∛(Ks/4)**\n• A₂B₃ (2:3): s = ⁵√(Ks/108)\n\nEx: AgCl com Ks = 1,8 × 10⁻¹⁰ → s = √Ks ≈ 1,34 × 10⁻⁵ mol/dm³.\nEx: Ag₂CrO₄ com Ks = 1,1 × 10⁻¹² → s = ∛(Ks/4) ≈ 6,5 × 10⁻⁵ mol/dm³.\n(Ag₂CrO₄ tem Ks MENOR mas é MAIS solúvel que AgCl — comparar Ks só vale para sais com a MESMA estequiometria!)\n\n**4. Q vs Ks (prever precipitação)**\n• Q < Ks → solução NÃO saturada (mais sal pode dissolver)\n• Q = Ks → SATURADA (em equilíbrio)\n• Q > Ks → forma-se PRECIPITADO até Q = Ks\n\n**5. Efeito do ião comum**\nAdicionar um ião que JÁ existe no equilíbrio DIMINUI a solubilidade do sal (Le Châtelier).\nEx: AgCl em solução de NaCl 0,1 M → solubilidade do AgCl é muito menor que em água pura.\n\n**6. Efeito do pH**\nSais de ácidos fracos (CaCO₃, Mg(OH)₂, FeS) ficam MAIS solúveis em meio ÁCIDO porque o ião do anião (CO₃²⁻, OH⁻, S²⁻) é consumido por H⁺.\n\n**❌ ERROS FREQUENTES EM EXAME**\n• Comparar Ks de sais com estequiometrias DIFERENTES e concluir solubilidade — só vale comparação direta se forem da mesma forma (1:1 com 1:1, etc.).\n• Esquecer o coeficiente: para A₂B, [A]=2s e Ks=(2s)²·s = 4s³ (NÃO é s³).\n• Achar que Q > Ks significa que o sal vai dissolver — é o CONTRÁRIO (precipita).\n• Aplicar a fórmula s = √Ks a sais que não são 1:1.\n• Esquecer que ião COMUM diminui (não aumenta) a solubilidade.\n• Achar que Ks muda com a concentração inicial — só com T.\n• Incluir o sólido na expressão de Ks.`
    },
    'quimica/Equilíbrio de oxidação-redução': {
        title: 'Oxidação-redução',
        body: `**1. Definições**\n• **Oxidação**: PERDA de electrões → nº de oxidação AUMENTA.\n• **Redução**: GANHO de electrões → nº de oxidação DIMINUI.\n\nMnemónica **OIL RIG**: Oxidation Is Loss, Reduction Is Gain.\n\nNuma reação redox há SEMPRE oxidação E redução em simultâneo — é uma transferência de electrões.\n\n**2. Agentes**\n• **Agente oxidante**: ACEITA electrões → ele próprio é REDUZIDO.\n• **Agente redutor**: CEDE electrões → ele próprio é OXIDADO.\n\n**3. Números de oxidação — regras**\n1. Elemento puro: 0 (Cu, Fe, O₂, H₂, Cl₂...)\n2. Iões monoatómicos: igual à carga (Na⁺=+1; Cl⁻=−1; Al³⁺=+3)\n3. **O** em compostos: **−2** (exceto: peróxidos H₂O₂ → −1; OF₂ → +2)\n4. **H** em compostos: **+1** (exceto: hidretos metálicos NaH, CaH₂ → −1)\n5. Halogéneos (F, Cl, Br, I) em compostos: −1 (com excepção do Cl/Br/I com O ou F)\n6. Metais alcalinos (Grupo 1): sempre +1\n7. Metais alcalino-terrosos (Grupo 2): sempre +2\n8. Soma de todos os n.o. = carga total da espécie\n   • Composto neutro: soma = 0\n   • Ião poliatómico: soma = carga\n\n**4. Exemplos de cálculo**\n• SO₄²⁻: 4·(−2) + n.o.(S) = −2 → n.o.(S) = +6\n• K₂Cr₂O₇: 2·(+1) + 2·n.o.(Cr) + 7·(−2) = 0 → n.o.(Cr) = +6\n• MnO₄⁻: n.o.(Mn) + 4·(−2) = −1 → n.o.(Mn) = +7\n• NH₃: n.o.(N) + 3·(+1) = 0 → n.o.(N) = −3\n\n**5. Acerto de equações redox**\n• Identificar espécies oxidadas e reduzidas (ver variações de n.o.).\n• Balancear nº de electrões cedidos = electrões ganhos.\n• Ajustar coeficientes para que a transferência total de electrões seja igual.\n\n**❌ ERROS FREQUENTES EM EXAME**\n• Confundir agente oxidante com a espécie OXIDADA — é o CONTRÁRIO. O agente oxidante FAZ outro oxidar; ele próprio é REDUZIDO.\n• Esquecer excepções do O (peróxidos: −1) e do H (hidretos metálicos: −1).\n• Atribuir −2 ao O em OF₂ (é +2 porque F é mais electronegativo).\n• Trocar o sinal: oxidação faz n.o. AUMENTAR (Fe⁰ → Fe²⁺), redução faz DIMINUIR.\n• Achar que apenas há transferência se houver iões — também há em ligações covalentes (n.o. atribuído).\n• Não verificar que a soma dos n.o. iguala a carga total.`
    },
    'quimica/Pilhas e potenciais de elétrodo': {
        title: 'Pilhas e potencial de elétrodo',
        body: `**1. Pilha (célula galvânica)**\nDispositivo que converte energia química em energia elétrica através de uma reação redox ESPONTÂNEA.\n\n**2. Componentes**\n• **Ânodo (−)**: onde ocorre **OXIDAÇÃO**\n• **Cátodo (+)**: onde ocorre **REDUÇÃO**\n• **Ponte salina** (ou membrana porosa): permite migração de iões para manter a NEUTRALIDADE elétrica\n• **Circuito externo**: condutor que liga os elétrodos — é por aqui que os ELECTRÕES viajam (do ânodo para o cátodo)\n\nMnemónica: ânodo = "negaTIVO" e oxidaTION; CáTODO = posiTIVO e reducTION (em pilhas).\n⚠️ Em ELECTRÓLISE é o oposto (ânodo é + e cátodo é −).\n\n**3. fem padrão (E°pilha)**\nUsando potenciais de REDUÇÃO padrão tabelados:\n\n   **E°pilha = E°cátodo − E°ânodo**\n\n• E°pilha > 0 → reação ESPONTÂNEA (a pilha funciona)\n• E°pilha < 0 → não espontânea (precisa de fonte externa = electrólise)\n• E°pilha = 0 → equilíbrio\n\n**4. Série electroquímica**\nOrdena metais por poder REDUTOR (capacidade de ceder electrões):\n• Metal com E° mais NEGATIVO → mais REDUTOR → oxida-se mais facilmente\n• Metal com E° mais POSITIVO → menos redutor → mais "nobre"\n\nOrdem (do mais redutor para o menos):\nK > Na > Mg > Al > Zn > Fe > Pb > H > Cu > Ag > Au\n\n**5. Pilha de Daniell** (clássica)\nZn(s) | Zn²⁺(aq) ‖ Cu²⁺(aq) | Cu(s)\n• E°(Zn²⁺/Zn) = −0,76 V → ânodo: Zn → Zn²⁺ + 2e⁻\n• E°(Cu²⁺/Cu) = +0,34 V → cátodo: Cu²⁺ + 2e⁻ → Cu\n• E°pilha = +0,34 − (−0,76) = +1,10 V\n\n**6. Aplicações**\n• **Protecção catódica**: usar metal mais redutor (ex: Zn) ligado a Fe → o Zn corrói-se em vez do Fe (ânodo de sacrifício).\n• **Pilhas e baterias** comerciais: alcalina, lítio-ião, chumbo-ácido.\n\n**❌ ERROS FREQUENTES EM EXAME**\n• Trocar ânodo (−) com cátodo (+) — em PILHA, ânodo é o negativo e o cátodo é o positivo.\n• Em ELECTRÓLISE inverter sem perceber — aí é o contrário.\n• Aplicar E°pilha = E°ânodo − E°cátodo (sinal trocado) — é cátodo MENOS ânodo.\n• Inverter o sinal de E° quando a equação é escrita ao contrário — usar SEMPRE E° de redução tabelado, e fazer "cátodo − ânodo".\n• Achar que electrões viajam pelo electrólito — viajam pelo CIRCUITO EXTERNO. Pelo electrólito viajam os IÕES.\n• Esquecer que metal mais redutor (E° mais negativo) é o que se OXIDA na pilha.\n• Confundir poder redutor com poder oxidante (são opostos).\n• Multiplicar E° pelos coeficientes estequiométricos — E° NÃO depende dos coeficientes.`
    }
};

// PATCH: copiar lições de Leitura do Lourdes para o Oceanus (year=31)
// (são as mesmas — fluência/prosódia/compreensão são universais)
Object.entries(LESSONS_3).forEach(([k, v]) => {
    if (k.startsWith('leitura/')) LESSONS_3_OCEANUS[k] = v;
});
EXERCISES_3.forEach(e => {
    if (e.s === 'leitura') EXERCISES_3_OCEANUS.push(e);
});

// Reservado — exercícios complexos vivem em content_11_q_extra.js (lazy load)
const EXERCISES_11 = [];

const YEARS_AVAILABLE = [
    { year: 2,  label: '2.º ano',  cycle: '1.º ciclo' },
    { year: 3,  label: '3.º ano',  cycle: '1.º ciclo' },
    { year: 31, label: '3.º ano (Oceanus)', cycle: '1.º ciclo' },
    { year: 5,  label: '5.º ano',  cycle: '2.º ciclo' },
    { year: 6,  label: '6.º ano',  cycle: '2.º ciclo' },
    { year: 7,  label: '7.º ano',  cycle: '3.º ciclo' },
    { year: 11, label: '11.º ano', cycle: 'Secundário' },
    { year: 99, label: 'Profissional', cycle: 'Adulto' }
];

// Year 99 — Profissional. Base vazia: as disciplinas vêm de packs
// secretos (English for PMs, etc.). Permite cursos para adultos
// ficarem escondidos até serem activados manualmente.
const SUBJECTS_99   = {};
const CURRICULUM_99 = {};
const EXERCISES_99  = [];
const LESSONS_99    = {};
const PERIODS_99    = {};

const SUBJECTS_BY_YEAR   = { 2: SUBJECTS_2,   3: SUBJECTS_3,   31: SUBJECTS_3_OCEANUS,   5: SUBJECTS_5,   6: SUBJECTS_6,   7: SUBJECTS_7,   11: SUBJECTS_11,   99: SUBJECTS_99 };
const CURRICULUM_BY_YEAR = { 2: CURRICULUM_2, 3: CURRICULUM_3, 31: CURRICULUM_3_OCEANUS, 5: CURRICULUM_5, 6: CURRICULUM_6, 7: CURRICULUM_7, 11: CURRICULUM_11, 99: CURRICULUM_99 };
const EXERCISES_BY_YEAR  = { 2: EXERCISES_2,  3: EXERCISES_3,  31: EXERCISES_3_OCEANUS,  5: EXERCISES_5,  6: EXERCISES_6,  7: EXERCISES_7,  11: EXERCISES_11,  99: EXERCISES_99 };
const LESSONS_BY_YEAR    = { 2: LESSONS_2,    3: LESSONS_3,    31: LESSONS_3_OCEANUS,    5: LESSONS_5,   6: LESSONS_6,   7: LESSONS_7,   11: LESSONS_11,   99: LESSONS_99 };
const PERIODS_BY_YEAR    = { 2: PERIODS_2,    3: PERIODS_3,    31: PERIODS_3_OCEANUS,    5: PERIODS_5,   6: PERIODS_6,   7: PERIODS_7,   11: PERIODS_11,   99: PERIODS_99 };

// Mutáveis: app.js usa SUBJECTS, CURRICULUM, EXERCISES, LESSONS, PERIODS
// directamente. setActiveYear() troca-os atomicamente quando se muda de perfil.
// Iniciam vazios — só são preenchidos quando existe um perfil activo (regra: nada é
// carregado por defeito; só os anos dos perfis criados é que ficam disponíveis).
let SUBJECTS   = {};
let CURRICULUM = {};
let EXERCISES  = {};
let LESSONS    = {};
let PERIODS    = [];

function setActiveYear(year) {
    if (!SUBJECTS_BY_YEAR[year]) {
        SUBJECTS = {}; CURRICULUM = {}; EXERCISES = {}; LESSONS = {}; PERIODS = [];
        window.SUBJECTS = SUBJECTS; window.CURRICULUM = CURRICULUM;
        window.EXERCISES = EXERCISES; window.LESSONS = LESSONS; window.PERIODS = PERIODS;
        window.activeYear = null;
        return;
    }
    SUBJECTS   = SUBJECTS_BY_YEAR[year];
    CURRICULUM = CURRICULUM_BY_YEAR[year];
    EXERCISES  = EXERCISES_BY_YEAR[year];
    LESSONS    = LESSONS_BY_YEAR[year];
    PERIODS    = PERIODS_BY_YEAR[year];
    window.SUBJECTS   = SUBJECTS;
    window.CURRICULUM = CURRICULUM;
    window.EXERCISES  = EXERCISES;
    window.LESSONS    = LESSONS;
    window.PERIODS    = PERIODS;
    window.activeYear = year;
}

window.YEARS_AVAILABLE     = YEARS_AVAILABLE;
window.SUBJECTS_BY_YEAR    = SUBJECTS_BY_YEAR;
window.CURRICULUM_BY_YEAR  = CURRICULUM_BY_YEAR;
window.EXERCISES_BY_YEAR   = EXERCISES_BY_YEAR;
window.LESSONS_BY_YEAR     = LESSONS_BY_YEAR;
window.PERIODS_BY_YEAR     = PERIODS_BY_YEAR;
window.setActiveYear       = setActiveYear;
window.SUBJECTS   = SUBJECTS;
window.CURRICULUM = CURRICULUM;
window.EXERCISES  = EXERCISES;
window.LESSONS    = LESSONS;
window.PERIODS    = PERIODS;
window.activeYear = null;
