// EscolaPlay - Banco de exercícios 5.º ano (PT-PT, Acordo Ortográfico)
// Tipos: mc (escolha múltipla), tf (v/f), fill (preencher), order (ordenar), match (associar)
// Estrutura: { id, s (disciplina), t (tópico), type, diff (1-3), q (pergunta), ..., exp }

const SUBJECTS = {
    portugues:  { name: 'Português',  icon: 'fa-book',         color: '#e11d48' },
    matematica: { name: 'Matemática', icon: 'fa-calculator',   color: '#2563eb' },
    ingles:     { name: 'Inglês',     icon: 'fa-language',     color: '#16a34a' },
    ciencias:   { name: 'Ciências',   icon: 'fa-leaf',         color: '#0891b2' },
    hgp:        { name: 'HGP',        icon: 'fa-landmark',     color: '#b45309', fullName: 'História e Geografia de Portugal' }
};

// ========== LIÇÕES (mini-explicações por tópico) ==========
// Chave: `${subject}/${topic}` (o tópico corresponde ao campo t do exercício)
const LESSONS = {
    // ----- Português -----
    'portugues/Classes de palavras': {
        title: 'Classes de palavras',
        body: `As palavras agrupam-se em classes consoante a função que desempenham:\n\n• **Nome (substantivo)** — designa seres, objetos, sentimentos: cão, mesa, alegria.\n• **Adjetivo** — qualifica o nome: bonito, grande, feliz.\n• **Verbo** — exprime uma ação, estado ou mudança: correr, ser, ficar.\n• **Determinante** — antecede o nome: o, a, meu, este, algum.\n• **Pronome** — substitui o nome: ele, este, aquilo, quem.\n• **Advérbio** — modifica verbo/adjetivo/frase: muito, ontem, bem.\n• **Preposição** — liga palavras: de, em, com, para.\n• **Conjunção** — liga frases/palavras: e, mas, porque.`
    },
    'portugues/Verbos': {
        title: 'Conjugação verbal',
        body: `Os verbos indicam ações ou estados e variam em **modo**, **tempo**, **pessoa** e **número**.\n\n**Modo indicativo** (afirma um facto):\n• Presente — ação atual: eu estudo\n• Pretérito perfeito — ação passada concluída: eu estudei\n• Pretérito imperfeito — ação passada em curso: eu estudava\n• Futuro — ação futura: eu estudarei\n\n**Pessoas/números**: eu, tu, ele/ela | nós, vós, eles/elas.`
    },
    'portugues/Funções sintáticas': {
        title: 'Funções sintáticas',
        body: `Numa frase, cada grupo de palavras desempenha uma função:\n\n• **Sujeito** — quem pratica a ação (O João comeu o bolo)\n• **Predicado** — o que se diz do sujeito; contém o verbo (comeu o bolo)\n• **Complemento direto** — responde a "o quê?" (o bolo)\n• **Complemento indireto** — responde a "a quem?" (à Maria)\n• **Modificador** — informação adicional (ontem, na cozinha)`
    },
    'portugues/Recursos expressivos': {
        title: 'Recursos expressivos',
        body: `São técnicas que dão beleza e força ao texto:\n\n• **Comparação** — usa "como" ou similar: *És forte como um touro.*\n• **Metáfora** — comparação implícita: *És um touro.*\n• **Personificação** — dá características humanas a seres não humanos: *O vento assobiava.*\n• **Enumeração** — série de palavras: *Comprei pão, leite, ovos e fruta.*\n• **Onomatopeia** — imita sons: *zzz, tic-tac, miau.*`
    },
    'portugues/Ortografia': {
        title: 'Ortografia (Acordo Ortográfico)',
        body: `Com o Acordo de 1990, muitas consoantes mudas caíram:\n\n• *ação* (antes "acção"), *ato* (antes "acto")\n• *ótimo* (antes "óptimo"), *adoção* (antes "adopção")\n• *exceto* (antes "excepto")\n\nRegras úteis:\n• Iniciais maiúsculas: nomes próprios, início de frase.\n• Hífen em palavras compostas: guarda-chuva, beija-flor.`
    },
    'portugues/Pontuação': {
        title: 'Pontuação',
        body: `• **Ponto final (.)** — termina uma frase.\n• **Vírgula (,)** — separa elementos; pausa curta.\n• **Ponto de interrogação (?)** — pergunta.\n• **Ponto de exclamação (!)** — espanto, ordem.\n• **Dois pontos (:)** — introduz enumeração ou discurso direto.\n• **Aspas (" ")** — discurso direto, citação.`
    },
    'portugues/Plurais': {
        title: 'Formação do plural',
        body: `• Palavras em **-ão** variam: pão → pães; mão → mãos; irmão → irmãos; cão → cães.\n• Palavras em **-al, -el, -ol, -ul** → trocam para **-ais, -éis, -óis, -uis**: animal → animais; papel → papéis; farol → faróis.\n• Palavras em **-il** com acento → **-is** (barril → barris); sem acento → **-eis** (fóssil → fósseis).\n• Palavras em **-m** → **-ns**: homem → homens; jovem → jovens.`
    },
    'portugues/Tipos de texto': {
        title: 'Tipos de texto',
        body: `• **Narrativo** — conta uma história (personagens, espaço, tempo, ação).\n• **Descritivo** — descreve pessoas, lugares, objetos.\n• **Argumentativo** — defende uma opinião com argumentos.\n• **Poético** — expressa sentimentos; verso, rima, métrica.\n• **Instrucional** — dá instruções (receitas, manuais).`
    },
    'portugues/Determinantes': {
        title: 'Determinantes',
        body: `Acompanham o nome e especificam-no:\n• **Artigos definidos**: o, a, os, as\n• **Artigos indefinidos**: um, uma, uns, umas\n• **Possessivos**: meu, teu, seu, nosso, vosso\n• **Demonstrativos**: este, esse, aquele\n• **Indefinidos**: algum, nenhum, todo, qualquer`
    },
    'portugues/Pronomes': {
        title: 'Pronomes',
        body: `Substituem o nome para evitar repetições.\n\n• **Pessoais**: eu, tu, ele, nós, vós, eles; me, te, o, lhe, nos, vos, lhes.\n• **Possessivos**: meu, teu, seu (quando não acompanham o nome).\n• **Demonstrativos**: este, esse, aquele, isto, isso, aquilo.\n• **Relativos**: que, quem, onde, cujo.\n• **Interrogativos**: quem? o quê? qual?`
    },

    // ----- Matemática -----
    'matematica/Números naturais': {
        title: 'Números naturais e sistema decimal',
        body: `Os **números naturais** são 0, 1, 2, 3, 4, ...\n\n**Sistema de numeração decimal**: usa 10 algarismos (0-9) e posição (unidades, dezenas, centenas, milhares, ...).\n\nO valor de cada algarismo depende da posição. No número **47 932**:\n• 4 → 4 dezenas de milhar = 40 000\n• 7 → 7 unidades de milhar = 7 000\n• 9 → 9 centenas = 900\n• 3 → 3 dezenas = 30\n• 2 → 2 unidades = 2\n\n**Comparar e ordenar**: comparamos da ordem mais alta para a mais baixa. Mais algarismos → maior (se for natural).\n\n**Sucessor** de n = n + 1. **Antecessor** = n − 1.`
    },
    'matematica/Ângulos': {
        title: 'Ângulos',
        body: `Um **ângulo** é a amplitude entre duas semirretas com origem comum (vértice).\n\n**Classificação** pela amplitude:\n• **Nulo**: 0°\n• **Agudo**: > 0° e < 90°\n• **Reto**: 90°\n• **Obtuso**: > 90° e < 180°\n• **Raso**: 180°\n• **Giro**: 360°\n\n**Pares de ângulos**:\n• **Complementares**: soma = 90°. Ex: 30° + 60°.\n• **Suplementares**: soma = 180°. Ex: 110° + 70°.\n• **Verticalmente opostos**: têm a mesma amplitude.\n\nInstrumento de medida: transferidor (graus).`
    },
    'matematica/Retas': {
        title: 'Retas, semirretas e segmentos',
        body: `• **Reta**: não tem fim nos dois lados (infinita). Notação: AB com setas.\n• **Semirreta**: tem um ponto de origem e segue infinitamente num sentido.\n• **Segmento de reta**: tem início e fim (dois pontos). Tem comprimento.\n\n**Posições relativas de duas retas**:\n• **Paralelas** — nunca se cruzam. Mantêm a mesma distância.\n• **Concorrentes** — cruzam-se num ponto. Se formam 90° → **perpendiculares**.\n• **Coincidentes** — são a mesma reta.`
    },
    'matematica/Triângulos': {
        title: 'Triângulos',
        body: `**Classificação quanto aos lados**:\n• **Equilátero** — 3 lados iguais (e 3 ângulos de 60°).\n• **Isósceles** — 2 lados iguais.\n• **Escaleno** — todos os lados diferentes.\n\n**Classificação quanto aos ângulos**:\n• **Acutângulo** — 3 ângulos agudos.\n• **Retângulo** — 1 ângulo reto (90°).\n• **Obtusângulo** — 1 ângulo obtuso (> 90°).\n\n**Regra importante**: a soma dos ângulos internos de qualquer triângulo é **180°**.\n\nSe souberes dois ângulos, descobres o terceiro: 180° − (a + b).`
    },
    'matematica/Quadriláteros': {
        title: 'Quadriláteros',
        body: `Um **quadrilátero** é um polígono com 4 lados.\n\n**Soma dos ângulos internos**: 360°.\n\n**Família dos paralelogramos** (lados opostos paralelos):\n• **Paralelogramo** — lados opostos paralelos e iguais.\n• **Retângulo** — paralelogramo com 4 ângulos retos.\n• **Losango** — paralelogramo com 4 lados iguais.\n• **Quadrado** — retângulo E losango (4 lados iguais + 4 ângulos retos).\n\n**Trapézio** — só tem **um par** de lados paralelos. Pode ser isósceles (lados não paralelos iguais) ou retângulo (2 ângulos retos).`
    },
    'matematica/Perímetros': {
        title: 'Perímetro',
        body: `O **perímetro** é a soma de todos os lados de um polígono — mede-se em unidades lineares (cm, m).\n\n**Fórmulas úteis**:\n• **Quadrado**: P = 4 × lado\n• **Retângulo**: P = 2 × (base + altura)\n• **Triângulo equilátero**: P = 3 × lado\n• **Polígono regular** (n lados iguais): P = n × lado\n• **Polígono irregular**: somar todos os lados\n\nUsa-se para saber, por exemplo, quanto arame é preciso para vedar um campo.`
    },
    'matematica/Divisibilidade': {
        title: 'Múltiplos, divisores e divisibilidade',
        body: `• **Múltiplos de n** — números obtidos multiplicando n por naturais: múltiplos de 3 → 0, 3, 6, 9, 12, ...\n• **Divisores de n** — números que dividem n sem resto. Divisores de 12 → 1, 2, 3, 4, 6, 12.\n\n**Critérios de divisibilidade**:\n• por 2 → termina em 0, 2, 4, 6, 8\n• por 3 → soma dos algarismos é múltiplo de 3\n• por 5 → termina em 0 ou 5\n• por 9 → soma dos algarismos é múltiplo de 9\n• por 10 → termina em 0`
    },
    'matematica/Números primos': {
        title: 'Números primos e compostos',
        body: `Um **número primo** tem exatamente 2 divisores: 1 e ele próprio.\nEx.: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29...\n\nUm **número composto** tem mais de 2 divisores: 4, 6, 8, 9, 10, 12, ...\n\nO 1 **não é primo nem composto** (só tem 1 divisor).\nO 2 é o único primo par.\n\n**Decomposição em fatores primos**: cada composto escreve-se como produto de primos. Ex.: 12 = 2 × 2 × 3 = 2² × 3.`
    },
    'matematica/MMC/MDC': {
        title: 'MDC e MMC',
        body: `• **MDC (máximo divisor comum)**: maior número que divide dois ou mais. Divisores de 12: 1,2,3,4,6,12. Divisores de 18: 1,2,3,6,9,18. Comuns: 1,2,3,6 → MDC = 6.\n\n• **MMC (mínimo múltiplo comum)**: menor múltiplo (não nulo) comum. Múltiplos de 4: 4,8,12,16,20,24... Múltiplos de 6: 6,12,18,24... MMC = 12.\n\n**Via fatores primos**:\n• MDC = produto dos comuns com menor expoente.\n• MMC = produto de todos com maior expoente.`
    },
    'matematica/Potências': {
        title: 'Potências',
        body: `Uma **potência** é uma multiplicação de fatores iguais.\n\nEx.: 2³ = 2 × 2 × 2 = 8\n• Base: 2 (número que se multiplica)\n• Expoente: 3 (vezes que se multiplica)\n\n**Casos especiais**:\n• a² — chama-se "a ao quadrado" (3² = 9)\n• a³ — "a ao cubo" (2³ = 8)\n• a⁰ = 1 (se a ≠ 0)\n• a¹ = a`
    },
    'matematica/Frações': {
        title: 'Frações',
        body: `Uma **fração** representa uma parte de um todo: a/b (a = numerador, b = denominador, b ≠ 0).\n\n• **Equivalentes**: 1/2 = 2/4 = 3/6 (multiplica cima e baixo pelo mesmo número).\n• **Simplificar**: dividir pelo MDC. 6/8 ÷ 2/2 = 3/4.\n• **Comparar**: com mesmo denominador, vence o maior numerador. Se denominadores diferentes, reduzir ao mesmo.\n• **Adição/subtração**: só com denominador comum. 1/4 + 2/4 = 3/4.\n• **Multiplicação**: numerador × numerador, denominador × denominador.\n• **Divisão**: multiplicar pelo inverso. 1/2 ÷ 1/4 = 1/2 × 4/1 = 2.`
    },
    'matematica/Dízimas': {
        title: 'Dízimas e números racionais',
        body: `Uma **dízima** é a forma decimal de um número racional.\n\n• Fração → dízima: divide-se. 1/2 = 0,5. 3/4 = 0,75.\n• Dízima → fração: coloca-se sobre potência de 10. 0,25 = 25/100 = 1/4.\n\n**Tipos**:\n• **Finita**: 0,5; 0,75; 1,125\n• **Infinita periódica**: 0,333... = 0,(3) — tem um "dízima periódica"`
    },
    'matematica/Percentagens': {
        title: 'Percentagens',
        body: `Uma **percentagem** é uma fração com denominador 100.\n\n25% = 25/100 = 1/4 = 0,25\n\n**Calcular uma percentagem**: multiplicar.\n• 25% de 80 → 0,25 × 80 = 20\n• 10% de 50 → 0,10 × 50 = 5\n\n**Percentagens úteis**:\n• 10% = dividir por 10\n• 25% = dividir por 4\n• 50% = metade\n• 100% = o total`
    },
    'matematica/Áreas': {
        title: 'Áreas de polígonos',
        body: `**Área** é o espaço que uma figura plana ocupa; mede-se em unidades quadradas (cm², m²).\n\n• **Retângulo**: A = base × altura\n• **Quadrado**: A = lado × lado = lado²\n• **Paralelogramo**: A = base × altura\n• **Triângulo**: A = (base × altura) ÷ 2\n• **Trapézio**: A = (Base maior + base menor) × altura ÷ 2\n• **Círculo**: A = π × r² (aproxima π ≈ 3,14)`
    },
    'matematica/Volume': {
        title: 'Volume',
        body: `**Volume** é o espaço tridimensional ocupado; mede-se em unidades cúbicas (cm³, m³, litros).\n\n• **Cubo**: V = aresta × aresta × aresta = aresta³\n• **Paralelepípedo (caixa)**: V = comprimento × largura × altura\n\n**Equivalências úteis**:\n• 1 dm³ = 1 L\n• 1 m³ = 1000 L\n• 1 cm³ = 1 mL`
    },
    'matematica/Sequências': {
        title: 'Sequências e regularidades',
        body: `Uma **sequência** é uma lista ordenada de números/figuras seguindo uma regra.\n\n**Exemplos**:\n• 2, 4, 6, 8, ... → soma 2\n• 3, 6, 12, 24, ... → multiplica por 2\n• 1, 1, 2, 3, 5, 8, ... → Fibonacci (soma dos 2 anteriores)\n• 1, 4, 9, 16, ... → quadrados (1², 2², 3², 4²)\n\nPara descobrir o próximo termo, procura a regra entre termos consecutivos.`
    },
    'matematica/Estatística': {
        title: 'Estatística: média e moda',
        body: `• **Média**: soma todos os valores e divide pelo número de valores.\n  Média de 4, 6, 8 → (4+6+8)/3 = 6\n\n• **Moda**: valor que aparece mais vezes.\n  Moda de 2,3,3,4,5 → 3 (aparece 2 vezes)\n\n• **Frequência absoluta**: quantas vezes aparece.\n• **Frequência relativa**: frequência absoluta / total.`
    },
    'matematica/Operações': {
        title: 'Operações e prioridades',
        body: `Quando há várias operações, respeita a ordem:\n\n1. **Parênteses** — primeiro.\n2. **Potências e raízes**.\n3. **Multiplicação e divisão** (esquerda → direita).\n4. **Adição e subtração** (esquerda → direita).\n\nEx.: 2 + 3 × 4 = 2 + 12 = 14\nEx.: (2 + 3) × 4 = 5 × 4 = 20\nEx.: 20 − 6 ÷ 2 = 20 − 3 = 17`
    },
    'matematica/Geometria': {
        title: 'Geometria: ângulos e retas',
        body: `**Ângulos**:\n• Reto: 90°\n• Agudo: < 90°\n• Obtuso: > 90° e < 180°\n• Raso: 180°\n• Giro: 360°\n\n**Retas**:\n• **Paralelas**: nunca se cruzam.\n• **Perpendiculares**: formam ângulo reto (90°).\n• **Concorrentes**: cruzam-se num ponto.\n\n**Triângulos** (pelos lados):\n• Equilátero — 3 lados iguais\n• Isósceles — 2 lados iguais\n• Escaleno — todos diferentes`
    },

    // ----- Inglês -----
    'ingles/Greetings': {
        title: 'Greetings (Saudações)',
        body: `• Good morning — Bom dia\n• Good afternoon — Boa tarde\n• Good evening — Boa noite (chegar)\n• Good night — Boa noite (despedir/dormir)\n• Hello / Hi — Olá\n• Goodbye / Bye — Adeus\n• See you later — Até logo\n• How are you? — Como estás?\n• I'm fine, thanks — Estou bem, obrigado(a)`
    },
    'ingles/Numbers': {
        title: 'Numbers (Números)',
        body: `1–10: one, two, three, four, five, six, seven, eight, nine, ten\n11–20: eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty\nDezenas: ten, twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety\n100 — one hundred; 1000 — one thousand\n\n**Cuidado**: 13 = thirteen | 30 = thirty (ouvir a diferença no final).`
    },
    'ingles/Days': {
        title: 'Days of the week',
        body: `Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday\n\nSempre com maiúscula inicial.\n• Weekday — dia de semana\n• Weekend — fim de semana (Saturday + Sunday)\n• Today — hoje; Tomorrow — amanhã; Yesterday — ontem`
    },
    'ingles/Months': {
        title: 'Months of the year',
        body: `January, February, March, April, May, June, July, August, September, October, November, December.\n\nSempre com maiúscula inicial.\n• in January — em janeiro\n• on January 5th — a 5 de janeiro`
    },
    'ingles/Family': {
        title: 'Family (Família)',
        body: `• mother (mum) — mãe\n• father (dad) — pai\n• sister — irmã\n• brother — irmão\n• grandmother (grandma) — avó\n• grandfather (grandpa) — avô\n• aunt — tia\n• uncle — tio\n• cousin — primo/prima\n• parents — pais\n• niece / nephew — sobrinha / sobrinho`
    },
    'ingles/Verb to be': {
        title: 'Verb to be — presente',
        body: `• I **am** (I'm)\n• You **are** (you're)\n• He/She/It **is** (he's, she's, it's)\n• We **are** (we're)\n• You **are** (you're)\n• They **are** (they're)\n\n**Negativa**: not (I am not = I'm not)\n**Interrogativa**: inverter (Are you happy?)`
    },
    'ingles/Present simple': {
        title: 'Present simple',
        body: `Usa-se para ações habituais ou factos.\n\n• I / you / we / they — verbo na forma base: *I play football every day.*\n• he / she / it — acrescenta **-s** (ou -es): *She plays tennis.* *He watches TV.*\n\n**Negativa**: don't / doesn't\n• I don't play. / He doesn't play.\n\n**Interrogativa**: Do / Does\n• Do you play? / Does she play?`
    },
    'ingles/Prepositions': {
        title: 'Prepositions of place',
        body: `• **in** — dentro de (in the box)\n• **on** — em cima de (on the table)\n• **under** — debaixo de (under the chair)\n• **next to** / **beside** — ao lado de\n• **between** — entre\n• **behind** — atrás de\n• **in front of** — em frente de\n• **above** — acima de; **below** — abaixo de`
    },
    'ingles/Colors': {
        title: 'Colors (Cores)',
        body: `red (vermelho), blue (azul), green (verde), yellow (amarelo), black (preto), white (branco), orange (laranja), pink (rosa), purple (roxo), brown (castanho), grey/gray (cinzento).\n\nEm inglês britânico escreve-se **colour**; em americano, **color**.`
    },
    'ingles/Plurals': {
        title: 'Plurals (Plurais)',
        body: `Regra geral: acrescentar **-s**. cat → cats.\n\n**Regras especiais**:\n• terminação -s, -sh, -ch, -x → **-es**: bus → buses, box → boxes.\n• terminação -y após consoante → **-ies**: baby → babies.\n• terminação -f / -fe → **-ves**: knife → knives.\n\n**Irregulares**: child → children; man → men; woman → women; foot → feet; tooth → teeth; mouse → mice.`
    },
    'ingles/Questions': {
        title: 'Wh- questions',
        body: `• **What** — o quê\n• **Who** — quem\n• **Where** — onde\n• **When** — quando\n• **Why** — porquê\n• **How** — como\n• **Which** — qual\n• **How many** — quantos\n• **How old** — que idade\n\nEx.: What is your name? Where do you live? How old are you?`
    },
    'ingles/School': {
        title: 'At school',
        body: `• teacher — professor(a)\n• student / pupil — aluno(a)\n• classroom — sala de aula\n• book — livro; notebook — caderno\n• pencil — lápis; pen — caneta\n• eraser / rubber — borracha\n• ruler — régua\n• schoolbag — mochila\n• board — quadro\n• break — intervalo\n• lesson — aula`
    },
    'ingles/Articles': {
        title: 'Articles (a, an, the)',
        body: `• **a** — antes de consoante: *a dog, a book*\n• **an** — antes de vogal: *an apple, an elephant, an hour*\n• **the** — o/a/os/as, específico: *the sun, the car I bought*\n\nNão usar artigo com nomes de países (geralmente), línguas, refeições: *I speak English. I have breakfast.*`
    },

    // ----- Ciências -----
    'ciencias/Seres vivos': {
        title: 'Seres vivos',
        body: `Um **ser vivo** nasce, cresce, alimenta-se, reproduz-se e morre.\n\nCaracterísticas:\n• Constituídos por células.\n• Realizam trocas com o meio (alimentação, respiração).\n• Respondem a estímulos.\n• Reproduzem-se.\n\nOs seres vivos dividem-se em 5 reinos: Monera, Protista, Fungos, Plantas e Animais.`
    },
    'ciencias/Classificação': {
        title: 'Classificação dos animais',
        body: `**Grande divisão**:\n• **Vertebrados** — têm coluna vertebral. 5 classes: Peixes, Anfíbios, Répteis, Aves, Mamíferos.\n• **Invertebrados** — não têm coluna. Inclui insetos, aranhas, moluscos, etc.\n\n**Critérios de classificação**:\n• Revestimento do corpo (escamas, penas, pelos...)\n• Tipo de respiração (pulmonar, branquial, cutânea)\n• Reprodução (oviparidade, viviparidade)\n• Alimentação (herbívoro, carnívoro, omnívoro)`
    },
    'ciencias/Vertebrados': {
        title: 'Vertebrados — 5 classes',
        body: `• **Peixes** — escamas, vivem na água, respiram por branquias, ovíparos (põem ovos).\n• **Anfíbios** (sapo, rã, salamandra) — pele nua húmida, vida aquática e terrestre, respiração cutânea/pulmonar.\n• **Répteis** (lagarto, serpente, tartaruga) — escamas/carapaça, pulmonar, ovíparos.\n• **Aves** — penas, bico, ovíparas, pulmonares, maioria voa.\n• **Mamíferos** — pelos, amamentam as crias, vivíparos, pulmonar.`
    },
    'ciencias/Anfíbios': {
        title: 'Anfíbios',
        body: `Os anfíbios têm duas fases de vida:\n\n1. **Larva** (girino) — vive na água, respira por branquias.\n2. **Adulto** — sai para terra, respira pela pele e pulmões.\n\nCaracterísticas:\n• Pele nua, húmida (sem pelos, escamas ou penas).\n• Ovíparos (põem ovos na água).\n• Alternam entre água e terra.\n\nExemplos: sapo, rã, salamandra, tritão.`
    },
    'ciencias/Aves': {
        title: 'Aves',
        body: `• **Revestimento**: penas (isolam, permitem voar).\n• **Boca**: bico (sem dentes).\n• **Reprodução**: ovíparas (põem ovos com casca dura).\n• **Respiração**: pulmonar.\n• **Esqueleto**: ossos ocos (mais leves → facilitam o voo).\n\nNem todas voam: avestruz, pinguim, emu — aves não voadoras.`
    },
    'ciencias/Invertebrados': {
        title: 'Invertebrados',
        body: `Animais sem coluna vertebral. Representam mais de 95% das espécies!\n\n**Principais grupos**:\n• **Insetos** (formiga, borboleta, abelha) — 3 pares de patas, asas, antenas.\n• **Aracnídeos** (aranhas, escorpiões) — 4 pares de patas.\n• **Crustáceos** (caranguejo, camarão) — carapaça dura.\n• **Moluscos** (caracol, polvo, mexilhão) — corpo mole.\n• **Anelídeos** (minhoca) — corpo em anéis.`
    },
    'ciencias/Alimentação': {
        title: 'Tipos de alimentação',
        body: `• **Herbívoros** — só plantas (vaca, cavalo, coelho).\n• **Carnívoros** — só outros animais (leão, lobo, tubarão).\n• **Omnívoros** — plantas e animais (ser humano, porco, urso).\n• **Insetívoros** — insetos (pintassilgo, morcego).\n• **Detritívoros** — restos orgânicos (minhoca).\n• **Granívoros** — sementes e grãos (pombos).`
    },
    'ciencias/Cadeia alimentar': {
        title: 'Cadeia alimentar',
        body: `Mostra quem come quem num ecossistema:\n\n**Produtores** (plantas) → **Consumidores primários** (herbívoros) → **Consumidores secundários** (carnívoros) → **Decompositores** (fungos, bactérias).\n\nEx.: erva → gafanhoto → rã → cobra → águia → (morre) → decompositores.\n\nA energia flui do sol → plantas → animais. Se um nível desaparece, toda a cadeia sofre.`
    },
    'ciencias/Plantas': {
        title: 'Plantas',
        body: `**Partes**:\n• **Raiz** — fixa a planta, absorve água e sais minerais.\n• **Caule** — sustenta; transporta a seiva.\n• **Folhas** — fazem fotossíntese.\n• **Flor** — reprodução.\n• **Fruto** — contém as sementes.\n\n**Fotossíntese**:\n\ndióxido de carbono + água + luz solar → glicose (alimento) + oxigénio\n\nÉ assim que a planta produz o seu próprio alimento e liberta o oxigénio que respiramos.`
    },
    'ciencias/Rochas': {
        title: 'Tipos de rochas',
        body: `**Magmáticas** — formam-se da solidificação do magma.\n• Granito, basalto.\n\n**Sedimentares** — sedimentos compactados ao longo do tempo.\n• Calcário, arenito, argilito.\n\n**Metamórficas** — rochas alteradas por calor/pressão.\n• Mármore (de calcário), xisto, gnaisse (de granito).\n\nEm Portugal: granito (Norte), calcário (Centro/Oeste), xisto (interior).`
    },
    'ciencias/Solo': {
        title: 'O solo',
        body: `O **solo** é a camada superficial da Terra que permite a vida vegetal.\n\n**Composição**:\n• **Matéria mineral** — rochas, areia, argila.\n• **Matéria orgânica** (húmus) — restos de plantas/animais.\n• **Água**.\n• **Ar** (entre partículas).\n\n**Tipos**: arenoso (grosso, pouca água), argiloso (fino, retém água), calcário, humífero (rico, fértil).`
    },
    'ciencias/Água': {
        title: 'Ciclo da água',
        body: `**Fases do ciclo**:\n\n1. **Evaporação** — água (rios, oceanos) aquece e vira vapor.\n2. **Condensação** — vapor arrefece e forma nuvens (gotas).\n3. **Precipitação** — chuva, neve ou granizo cai.\n4. **Infiltração/Escoamento** — água volta a rios, lençóis subterrâneos, oceanos.\n\nO ciclo repete-se constantemente. É a mesma água há milhões de anos!`
    },
    'ciencias/Habitat': {
        title: 'Habitat',
        body: `**Habitat** é o local onde um ser vivo vive naturalmente.\n\nCaracterísticas que definem o habitat: clima, temperatura, vegetação, disponibilidade de água e alimento.\n\n**Exemplos**:\n• Deserto — camelo, dromedário.\n• Savana — leão, zebra, girafa.\n• Floresta tropical — tigre, tucano.\n• Ártico — urso polar, foca.\n• Oceano — peixes, baleias.`
    },
    'ciencias/Ecossistema': {
        title: 'Ecossistema',
        body: `Um **ecossistema** é a relação entre os seres vivos (**biocenose**) e o meio onde vivem (**biótopo**).\n\nEx.: lagoa (biótopo = água, plantas aquáticas, lodo; biocenose = peixes, rãs, insetos).\n\nCada ser tem um papel; tudo está interligado.\n\n**Biodiversidade** — variedade de seres vivos. Quanto maior, mais equilibrado o ecossistema.`
    },
    'ciencias/Reprodução': {
        title: 'Reprodução dos animais',
        body: `• **Vivíparos** — cria desenvolve-se no interior da mãe e nasce formada (mamíferos como humano, cão, baleia).\n• **Ovíparos** — cria desenvolve-se num ovo fora da mãe (aves, répteis, peixes, anfíbios, insetos).\n• **Ovovivíparos** — ovo desenvolve-se dentro da mãe, que depois "põe" ou as crias nascem vivas (algumas serpentes, tubarões).`
    },
    'ciencias/Revestimento': {
        title: 'Revestimento do corpo',
        body: `• **Escamas** — peixes, répteis.\n• **Penas** — aves (isolamento térmico e voo).\n• **Pelos** — mamíferos.\n• **Pele nua** — anfíbios (sapo, rã).\n• **Carapaça** — tartarugas, caranguejos.\n• **Exosqueleto** — insetos, crustáceos.`
    },

    // ----- História -----
    'hgp/Pré-história': {
        title: 'Pré-história na Península Ibérica',
        body: `**Paleolítico** (Idade da Pedra Lascada):\n• Viviam em grupos nómadas.\n• **Caça, pesca e recoleção**.\n• Usavam pedras lascadas, ossos.\n• Dominaram o fogo.\n• Arte rupestre (Foz Côa, Portugal).\n\n**Neolítico** (Idade da Pedra Polida):\n• Tornaram-se sedentários.\n• **Agricultura e pastorícia**.\n• Aldeias, cerâmica, tecelagem.\n• Antas, menires, cromeleques (ex.: Almendres, Évora).`
    },
    'hgp/Romanos': {
        title: 'Os Romanos na Península (séc. III a.C. – V d.C.)',
        body: `Em **218 a.C.** os romanos entraram na Península durante as Guerras Púnicas.\n\n**Conquista**: resistência dos Lusitanos liderada por **Viriato** (séc. II a.C.).\n\n**Legado dos Romanos**:\n• **Língua** — Latim (origem do Português).\n• **Direito** — Direito Romano.\n• **Religião** (mais tarde) — Cristianismo.\n• **Engenharia** — estradas, pontes, aquedutos, termas.\n• **Cidades**: Olissipo (Lisboa), Ebora (Évora), Bracara (Braga), Conimbriga (Coimbra).`
    },
    'hgp/Bárbaros': {
        title: 'Invasões bárbaras (séc. V)',
        body: `Com a queda do Império Romano do Ocidente (476 d.C.), vários povos germânicos invadiram a Península:\n\n• **Suevos** — fixaram-se no noroeste (Galécia).\n• **Vândalos** — passaram pela Andaluzia.\n• **Alanos** — Lusitânia.\n• **Visigodos** — dominaram toda a Península e fundaram o Reino Visigodo (capital em Toledo).\n\nAdotaram o Cristianismo e mantiveram muita cultura romana.`
    },
    'hgp/Muçulmanos': {
        title: 'Os Muçulmanos (711–1249)',
        body: `Em **711 d.C.** os muçulmanos (berberes e árabes) vieram do norte de África e conquistaram rapidamente quase toda a Península.\n\nDesignaram o território por **Al-Andalus**.\n\n**Legado**:\n• **Agricultura** — noras, sistemas de rega, novas culturas (laranja, arroz, algodão).\n• **Ciência** — matemática, astronomia, medicina.\n• **Arquitetura** — azulejos, arcos, pátios.\n• **Língua** — centenas de palavras: açúcar, alface, almofada, azeite, oxalá.`
    },
    'hgp/Reconquista': {
        title: 'A Reconquista Cristã',
        body: `Luta dos reinos cristãos do norte para recuperar a Península.\n\n**Marcos importantes**:\n• **722** — Batalha de Covadonga (início).\n• **868** — Conde Vímara Peres reconquista o Porto → **Condado Portucalense**.\n• **1139** — **Batalha de Ourique**: Afonso Henriques vence e é aclamado rei.\n• **1143** — **Tratado de Zamora**: D. Afonso VII reconhece Portugal.\n• **1179** — **Bula Manifestis Probatum** (Papa Alexandre III).\n• **1249** — D. Afonso III conquista **Faro/Algarve** → fim da Reconquista.`
    },
    'hgp/Fundação': {
        title: 'Fundação de Portugal',
        body: `**D. Henrique de Borgonha** recebeu o Condado Portucalense, casando com **D. Teresa**, filha de D. Afonso VI de Leão.\n\n**D. Afonso Henriques** (filho) tornou-se conde e lutou pela independência:\n• **1128** — Batalha de São Mamede (vence a mãe).\n• **1139** — Batalha de Ourique (aclamado rei).\n• **1143** — Tratado de Zamora (reconhecido).\n• **1179** — Bula papal (reconhecimento internacional).\n\n1.º rei de Portugal = **D. Afonso Henriques** → Dinastia de Borgonha.`
    },
    'hgp/Batalhas': {
        title: 'Batalhas importantes',
        body: `• **São Mamede (1128)** — Afonso Henriques vence a mãe D. Teresa e o padrasto.\n• **Ourique (1139)** — vitória sobre 5 reis mouros; aclamado rei.\n• **Santarém (1147)** — conquista aos muçulmanos.\n• **Lisboa (1147)** — com ajuda de cruzados do norte.\n• **Salado (1340)** — Portugal e Castela vencem mouros.\n• **Aljubarrota (1385)** — D. João I vence Castela, garante independência.`
    },
    'hgp/Reis': {
        title: 'Primeiros reis de Portugal',
        body: `**Dinastia de Borgonha (1139–1383)**:\n\n1. **D. Afonso Henriques** (1139–1185) — o Conquistador, fundador.\n2. **D. Sancho I** (1185–1211) — o Povoador (povoou terras).\n3. **D. Afonso II** (1211–1223) — o Gordo.\n4. **D. Sancho II** (1223–1248) — o Capelo.\n5. **D. Afonso III** (1248–1279) — conquistou o Algarve.\n6. **D. Dinis** (1279–1325) — o Lavrador (agricultura, fundou universidade).\n7. **D. Afonso IV** (1325–1357).\n8. **D. Pedro I** (1357–1367) — o Justiceiro.\n9. **D. Fernando** (1367–1383).`
    },
    'hgp/Cultura': {
        title: 'Cultura na 1.ª dinastia',
        body: `**D. Dinis** (1279–1325) é considerado um dos reis mais cultos:\n\n• Fundou a **Universidade de Lisboa em 1290** (depois transferida para Coimbra).\n• Promoveu a língua portuguesa (em vez do latim).\n• Mandou plantar o **Pinhal de Leiria** (madeira para naus).\n• Escreveu ele próprio poesia trovadoresca.\n• Desenvolveu a agricultura (por isso "o Lavrador").\n\nFoi no seu reinado que Portugal consolidou identidade cultural.`
    },
    'hgp/Lisboa': {
        title: 'Conquista de Lisboa (1147)',
        body: `Em 1147, D. Afonso Henriques, com ajuda de cruzados ingleses, flamengos e alemães (que se dirigiam à Terra Santa), **cercou e conquistou Lisboa** aos muçulmanos.\n\nO cerco durou **4 meses**. Foi um marco:\n• Passou a ser a maior cidade do reino.\n• Mais tarde, em **1256**, D. Afonso III transferiu a capital de Coimbra para Lisboa.\n\nHoje o nome "Martim Moniz" lembra o cavaleiro que, segundo a lenda, deu a vida para manter uma porta aberta.`
    },
    'hgp/Símbolos': {
        title: 'Símbolos nacionais',
        body: `**Bandeira de Portugal**:\n• **Verde**: esperança.\n• **Vermelho**: sangue dos que lutaram.\n• **Esfera armilar**: Descobrimentos.\n• **Escudo**: 5 escudetes azuis (5 reis mouros vencidos em Ourique, segundo a lenda) com 5 besantes cada (prata = 30 dinheiros de Judas).\n• **Castelos**: cidades conquistadas aos mouros.\n\n**Hino**: "A Portuguesa" (1891, letra de Henrique Lopes de Mendonça, música de Alfredo Keil).`
    },
    'hgp/Dinastias': {
        title: 'Dinastias de Portugal',
        body: `1. **Borgonha (1139–1383)** — fundada por D. Afonso Henriques.\n2. **Avis (1385–1580)** — D. João I; época dos Descobrimentos.\n3. **Filipina (1580–1640)** — reis espanhóis (Filipe I, II, III).\n4. **Bragança (1640–1910)** — Restauração; até à República.\n\nA **Primeira República** foi proclamada a **5 de outubro de 1910**.`
    },
    'hgp/Ordem cronológica': {
        title: 'Cronologia essencial',
        body: `• **~25 000 a.C.** — Arte rupestre no Vale do Côa.\n• **218 a.C.** — Romanos chegam à Península.\n• **~139 a.C.** — Morte de Viriato.\n• **411 d.C.** — Povos bárbaros invadem.\n• **711** — Muçulmanos conquistam a Península.\n• **868** — Reconquista do Porto.\n• **1139** — Batalha de Ourique.\n• **1143** — Tratado de Zamora.\n• **1147** — Conquista de Lisboa.\n• **1179** — Bula Manifestis Probatum.\n• **1249** — Conquista do Algarve.\n• **1290** — Fundação da Universidade.`
    },

    // ----- Geografia -----
    'hgp/Localização': {
        title: 'Localização de Portugal',
        body: `Portugal situa-se:\n• **Continente**: Europa (sudoeste).\n• **Península**: Ibérica (com Espanha).\n• **Hemisfério**: Norte.\n• **Fronteiras terrestres**: apenas com **Espanha** (a norte e leste).\n• **Oceano**: Atlântico (oeste e sul).\n\nTerritório tem 3 partes:\n• **Continente** — Portugal continental.\n• **Madeira** — arquipélago no Atlântico.\n• **Açores** — arquipélago no Atlântico.`
    },
    'hgp/Fronteiras': {
        title: 'Fronteiras',
        body: `**Fronteiras terrestres de Portugal**: ~1 215 km, apenas com **Espanha**, a norte e a leste.\n\nPrincipais rios de fronteira:\n• **Minho** — norte (com a Galiza).\n• **Douro** — Trás-os-Montes.\n• **Tejo** — passagem curta.\n• **Guadiana** — sul (Alentejo/Algarve).\n\n**Fronteira marítima** — Oeste e Sul (Oceano Atlântico), ~943 km de costa.`
    },
    'hgp/Oceanos': {
        title: 'Oceanos',
        body: `Existem **5 oceanos**:\n• Atlântico\n• Pacífico\n• Índico\n• Glacial Ártico\n• Glacial Antártico\n\nPortugal é banhado pelo **Oceano Atlântico** — o 2.º maior.\n\nO litoral português tem cerca de 943 km (continente). A costa portuguesa foi fundamental nos Descobrimentos.`
    },
    'hgp/Ilhas': {
        title: 'Arquipélagos portugueses',
        body: `Portugal tem 2 **regiões autónomas** insulares:\n\n**Madeira** (SW da Europa):\n• 2 ilhas habitadas: **Madeira** e **Porto Santo**.\n• Capital: Funchal.\n• Clima subtropical.\n\n**Açores** (meio do Atlântico):\n• **9 ilhas habitadas** em 3 grupos:\n  – Ocidental: Flores, Corvo\n  – Central: Faial, Pico, São Jorge, Graciosa, Terceira\n  – Oriental: São Miguel, Santa Maria\n• Capital: Ponta Delgada.\n• Clima temperado.`
    },
    'hgp/Rios': {
        title: 'Rios de Portugal',
        body: `**Principais rios** (todos nascem em Espanha, exceto o Mondego):\n\n• **Tejo** — o mais longo em Portugal (~275 km em Portugal); desagua em **Lisboa**.\n• **Douro** — nasce em Espanha; desagua no **Porto**.\n• **Guadiana** — fronteira sul; desagua em Vila Real de Santo António.\n• **Minho** — fronteira norte.\n• **Mondego** — o maior exclusivamente português; desagua na **Figueira da Foz**.\n• **Sado** — desagua em Setúbal.`
    },
    'hgp/Relevo': {
        title: 'Relevo de Portugal',
        body: `**Zonas montanhosas**: sobretudo a **norte do Tejo** (interior).\n**Planícies**: sobretudo a **sul do Tejo** (Alentejo).\n\n**Serras importantes**:\n• **Estrela** (continente) — Torre a 1993 m (maior do continente).\n• **Gerês**, **Peneda**, **Marão**, **Montesinho** — Norte.\n• **Aire**, **Candeeiros**, **Montejunto** — Centro.\n• **São Mamede**, **Monchique**, **Caldeirão** — Sul.\n\n**Ponto mais alto do país**: **Montanha do Pico** (ilha do Pico, Açores) — **2351 m**.`
    },
    'hgp/Capitais': {
        title: 'Capitais e cidades',
        body: `• **Portugal** — Lisboa\n• **Espanha** — Madrid\n• **França** — Paris\n• **Reino Unido** — Londres\n• **Alemanha** — Berlim\n• **Itália** — Roma\n• **Brasil** — Brasília\n\nPortugal tem 2 grandes áreas metropolitanas: **Lisboa** e **Porto**. Outras cidades importantes: Coimbra, Braga, Faro, Aveiro, Évora, Viseu, Funchal, Ponta Delgada.`
    },
    'hgp/Distritos': {
        title: 'Distritos de Portugal',
        body: `Portugal continental tem **18 distritos**:\n\nViana do Castelo, Braga, Porto, Vila Real, Bragança, Aveiro, Viseu, Guarda, Coimbra, Leiria, Castelo Branco, Santarém, Portalegre, Lisboa, Setúbal, Évora, Beja, Faro.\n\nOs **arquipélagos** (Madeira e Açores) **não** são organizados em distritos — são regiões autónomas.`
    },
    'hgp/Clima': {
        title: 'Clima de Portugal',
        body: `Portugal tem **clima mediterrânico**:\n• Verões quentes e secos.\n• Invernos suaves e chuvosos.\n\n**Variações regionais**:\n• **Norte e interior** — mais frio, mais chuva.\n• **Sul (Algarve)** — mais quente, menos chuva.\n• **Madeira** — subtropical, temperaturas amenas o ano todo.\n• **Açores** — temperado marítimo, chuvoso, ventoso.`
    },
    'hgp/Europa': {
        title: 'A Europa',
        body: `**Dados**:\n• 46 países (27 na União Europeia).\n• ~746 milhões de habitantes.\n• Portugal é membro da UE desde **1986**.\n\n**Países vizinhos importantes** para Portugal:\n• Espanha (fronteira).\n• França, Itália, Alemanha — grandes parceiros.\n\n**Maiores países** da Europa (por área): Rússia, Ucrânia, França, Espanha.\n**Mais populoso** (só Europa): Alemanha.`
    },
    'hgp/Continentes': {
        title: 'Continentes',
        body: `Existem **7 continentes**:\n1. **África**\n2. **América do Norte**\n3. **América do Sul**\n4. **Antártida**\n5. **Ásia** — o maior.\n6. **Europa** — a 2.ª mais pequena.\n7. **Oceânia** — a mais pequena.\n\n**Oceanos** (5): Pacífico (o maior), Atlântico, Índico, Glacial Ártico, Glacial Antártico.`
    },
    'hgp/Pontos cardeais': {
        title: 'Pontos cardeais e colaterais',
        body: `**Cardeais**: Norte (N), Sul (S), Este/Leste (E), Oeste (O ou W).\n\n**Colaterais**: NE, NO, SE, SO.\n\nO **Norte** aponta para o Polo Norte. A **rosa-dos-ventos** representa estas direções.\n\nEm Portugal:\n• Norte — Minho, Trás-os-Montes.\n• Sul — Algarve.\n• Este — fronteira com Espanha.\n• Oeste — Oceano Atlântico.`
    },
    'hgp/Montanha': {
        title: 'Ponto mais alto',
        body: `O **ponto mais alto de Portugal** é a **Montanha do Pico** (ilha do Pico, Açores) — **2351 m**.\n\nEm Portugal **continental**, o ponto mais alto é a **Torre** na **Serra da Estrela** — **1993 m**.\n\nÉ um sítio popular no inverno para ver neve (único local em Portugal continental onde neva com regularidade).`
    }
};

// ========== EXERCÍCIOS ==========
// Total: ~160 exercícios, ~20-30 por disciplina (Matemática enriquecida ao estilo MX 5)
const EXERCISES = [
    // ========== PORTUGUÊS (22) ==========
    { id:'p1', s:'portugues', t:'Classes de palavras', type:'mc', diff:1, q:'Qual destas palavras é um nome?', opts:['correr','bonito','cão','rapidamente'], ans:2, exp:'"Cão" é um nome (substantivo). "Correr" é verbo, "bonito" é adjetivo, "rapidamente" é advérbio.' },
    { id:'p2', s:'portugues', t:'Classes de palavras', type:'mc', diff:1, q:'Na frase "A menina está feliz", a palavra "feliz" é um...', opts:['nome','adjetivo','verbo','advérbio'], ans:1, exp:'Adjetivo qualifica o nome ("menina feliz").' },
    { id:'p3', s:'portugues', t:'Verbos', type:'mc', diff:2, q:'Qual é o tempo verbal da forma "comeu"?', opts:['presente do indicativo','pretérito perfeito do indicativo','pretérito imperfeito do indicativo','futuro do indicativo'], ans:1, exp:'"Comeu" indica uma ação concluída no passado → pretérito perfeito.' },
    { id:'p4', s:'portugues', t:'Verbos', type:'mc', diff:2, q:'Na frase "Nós iremos à praia", o verbo está no...', opts:['presente','pretérito perfeito','pretérito imperfeito','futuro'], ans:3, exp:'"Iremos" = futuro do indicativo.' },
    { id:'p5', s:'portugues', t:'Funções sintáticas', type:'mc', diff:2, q:'Na frase "O João comprou um livro", qual é o sujeito?', opts:['comprou','um livro','O João','livro'], ans:2, exp:'O sujeito é quem pratica a ação: "O João".' },
    { id:'p6', s:'portugues', t:'Funções sintáticas', type:'mc', diff:2, q:'Na frase "A Maria ofereceu flores à avó", "flores" é...', opts:['sujeito','complemento direto','complemento indireto','predicado'], ans:1, exp:'Responde a "o que ofereceu?" → complemento direto.' },
    { id:'p7', s:'portugues', t:'Recursos expressivos', type:'mc', diff:2, q:'"O tempo voa" é um exemplo de:', opts:['comparação','metáfora','personificação','enumeração'], ans:2, exp:'Dar ações humanas ("voar") a algo não humano (o tempo) = personificação.' },
    { id:'p8', s:'portugues', t:'Recursos expressivos', type:'mc', diff:1, q:'"Ela é rápida como o vento" é um exemplo de:', opts:['metáfora','comparação','personificação','onomatopeia'], ans:1, exp:'Usa "como" a comparar duas coisas → comparação.' },
    { id:'p9', s:'portugues', t:'Ortografia', type:'tf', diff:1, q:'Com o Acordo Ortográfico, a palavra "exceção" escreve-se sem "p".', ans:true, exp:'Correto: exceção (sem p). Antes era "excepção".' },
    { id:'p10', s:'portugues', t:'Pontuação', type:'mc', diff:1, q:'Qual o sinal de pontuação correto no fim de uma pergunta?', opts:['.','?','!',','], ans:1, exp:'Ponto de interrogação "?".' },
    { id:'p11', s:'portugues', t:'Plurais', type:'fill', diff:1, q:'Qual é o plural de "pão"?', ans:['pães'], exp:'Palavras terminadas em "-ão" podem fazer plural em "-ões", "-ães" ou "-ãos". Pão → pães.' },
    { id:'p12', s:'portugues', t:'Plurais', type:'fill', diff:2, q:'Qual é o plural de "animal"?', ans:['animais'], exp:'Palavras em "-al" fazem plural em "-ais": animal → animais.' },
    { id:'p13', s:'portugues', t:'Classes de palavras', type:'mc', diff:2, q:'Na frase "Ele correu muito", a palavra "muito" é...', opts:['nome','adjetivo','advérbio','verbo'], ans:2, exp:'"Muito" modifica o verbo "correu" → advérbio de quantidade.' },
    { id:'p14', s:'portugues', t:'Verbos', type:'fill', diff:2, q:'Conjuga o verbo "ser" na 1.ª pessoa do plural do presente: "nós ___".', ans:['somos'], exp:'Presente do indicativo: eu sou, tu és, ele é, nós somos.' },
    { id:'p15', s:'portugues', t:'Tipos de texto', type:'mc', diff:1, q:'Um texto que conta uma história é um texto:', opts:['descritivo','narrativo','argumentativo','poético'], ans:1, exp:'Texto narrativo conta acontecimentos.' },
    { id:'p16', s:'portugues', t:'Determinantes', type:'mc', diff:2, q:'Em "A minha casa é grande", "minha" é um determinante:', opts:['artigo','possessivo','demonstrativo','indefinido'], ans:1, exp:'Indica posse → determinante possessivo.' },
    { id:'p17', s:'portugues', t:'Pronomes', type:'mc', diff:2, q:'Na frase "Ele foi ao parque", "Ele" é um pronome:', opts:['pessoal','possessivo','demonstrativo','relativo'], ans:0, exp:'Substitui um nome ou referente → pronome pessoal.' },
    { id:'p18', s:'portugues', t:'Ortografia', type:'tf', diff:1, q:'Escreve-se "hospital" com "h" inicial.', ans:true, exp:'Correto: hospital (com h mudo).' },
    { id:'p19', s:'portugues', t:'Recursos expressivos', type:'fill', diff:2, q:'"Zzzzz" a imitar o som do sono é um exemplo de ___.', ans:['onomatopeia','onomatopeias'], exp:'Onomatopeia = palavra que imita um som.' },
    { id:'p20', s:'portugues', t:'Funções sintáticas', type:'order', diff:3, q:'Ordena a frase: "livro / O / Pedro / lendo / um / está"', items:['O','Pedro','está','lendo','um','livro'], exp:'Sujeito + verbo + complemento.' },
    { id:'p21', s:'portugues', t:'Classes de palavras', type:'mc', diff:2, q:'Em "Gosto de chocolate", a palavra "de" é...', opts:['nome','preposição','pronome','conjunção'], ans:1, exp:'"De" liga "gosto" a "chocolate" → preposição.' },
    { id:'p22', s:'portugues', t:'Verbos', type:'fill', diff:2, q:'Conjuga o verbo "ter" na 3.ª pessoa do singular do pretérito perfeito: "ele ___".', ans:['teve'], exp:'Pretérito perfeito: eu tive, tu tiveste, ele teve.' },

    // ========== MATEMÁTICA — ao estilo MX 5 Porto Editora ==========
    // --- Números naturais ---
    { id:'m101', s:'matematica', t:'Números naturais', type:'fill', diff:1, q:'Qual é o valor do algarismo 7 no número 47 932?', ans:['7000','7 000'], exp:'O 7 está na ordem dos milhares: vale 7 000.' },
    { id:'m102', s:'matematica', t:'Números naturais', type:'mc', diff:1, q:'Qual é o maior destes números?', opts:['9 876','10 234','9 999','8 990'], ans:1, exp:'10 234 tem 5 algarismos, os outros só têm 4.' },
    { id:'m103', s:'matematica', t:'Números naturais', type:'fill', diff:2, q:'Lê e escreve por extenso: 2 045. (ex: "dois mil e ...")', ans:['dois mil e quarenta e cinco'], exp:'2 045 = dois mil e quarenta e cinco.' },
    { id:'m104', s:'matematica', t:'Números naturais', type:'mc', diff:2, q:'Ordena de forma crescente: 54, 45, 504, 405.', opts:['45, 54, 405, 504','45, 54, 504, 405','54, 45, 405, 504','405, 504, 45, 54'], ans:0, exp:'Ordem crescente (do menor para o maior): 45 < 54 < 405 < 504.' },
    { id:'m105', s:'matematica', t:'Números naturais', type:'fill', diff:2, q:'Qual é o sucessor de 9 999?', ans:['10000','10 000'], exp:'Sucessor = número seguinte. 9 999 + 1 = 10 000.' },

    // --- Divisibilidade ---
    { id:'m1',  s:'matematica', t:'Divisibilidade', type:'mc',   diff:1, q:'Qual destes números é múltiplo de 7?', opts:['15','21','25','30'], ans:1, exp:'21 = 7 × 3. Os outros não são divisíveis por 7.' },
    { id:'m2',  s:'matematica', t:'Divisibilidade', type:'mc',   diff:2, q:'Quais são os divisores de 12?', opts:['1, 2, 3, 4, 6, 12','1, 2, 4, 6, 12','1, 3, 4, 12','2, 3, 4, 6'], ans:0, exp:'Divisores: 1, 2, 3, 4, 6, 12.' },
    { id:'m3',  s:'matematica', t:'Divisibilidade', type:'tf',   diff:2, q:'O número 132 é divisível por 3.', ans:true, exp:'Soma 1+3+2 = 6, múltiplo de 3, logo 132 é divisível por 3.' },
    { id:'m4',  s:'matematica', t:'Divisibilidade', type:'mc',   diff:2, q:'Qual é o critério de divisibilidade por 5?', opts:['soma dos algarismos é 5','termina em 0 ou 5','número par','termina em 5'], ans:1, exp:'Divisível por 5 se terminar em 0 ou 5.' },
    { id:'m106', s:'matematica', t:'Divisibilidade', type:'mc',   diff:2, q:'Qual destes números é divisível por 9?', opts:['234','287','432','541'], ans:2, exp:'Soma dos algarismos de 432 = 9, múltiplo de 9.' },
    { id:'m107', s:'matematica', t:'Divisibilidade', type:'fill', diff:2, q:'Escreve os 5 primeiros múltiplos de 6 (começando em 6).', ans:['6, 12, 18, 24, 30','6,12,18,24,30'], exp:'6 × 1, 6 × 2, 6 × 3, 6 × 4, 6 × 5 = 6, 12, 18, 24, 30.' },
    { id:'m108', s:'matematica', t:'Divisibilidade', type:'tf',   diff:2, q:'Todos os números pares são divisíveis por 2.', ans:true, exp:'Por definição, um número par é divisível por 2.' },

    // --- Números primos ---
    { id:'m5',  s:'matematica', t:'Números primos', type:'tf',   diff:2, q:'O número 9 é um número primo.', ans:false, exp:'9 = 3 × 3. Tem mais divisores além de 1 e 9.' },
    { id:'m6',  s:'matematica', t:'Números primos', type:'mc',   diff:2, q:'Qual destes é um número primo?', opts:['15','21','17','25'], ans:2, exp:'17 só é divisível por 1 e por 17.' },
    { id:'m7',  s:'matematica', t:'Números primos', type:'fill', diff:2, q:'Qual é o único número primo par?', ans:['2'], exp:'Todos os outros pares são divisíveis por 2.' },
    { id:'m109', s:'matematica', t:'Números primos', type:'mc',   diff:2, q:'Quantos primos existem até 10?', opts:['3','4','5','6'], ans:1, exp:'2, 3, 5, 7 → 4 primos.' },
    { id:'m110', s:'matematica', t:'Números primos', type:'fill', diff:3, q:'Decompõe 24 em fatores primos. (ex: 2×2×...)', ans:['2x2x2x3','2×2×2×3','2*2*2*3','2^3x3','2³×3'], exp:'24 = 2 × 12 = 2 × 2 × 6 = 2 × 2 × 2 × 3 = 2³ × 3.' },
    { id:'m111', s:'matematica', t:'Números primos', type:'tf',   diff:2, q:'O número 1 é um número primo.', ans:false, exp:'1 só tem 1 divisor. Primos têm exatamente 2.' },
    { id:'m112', s:'matematica', t:'Números primos', type:'mc',   diff:3, q:'Qual é a decomposição em fatores primos de 30?', opts:['2 × 15','2 × 3 × 5','3 × 10','6 × 5'], ans:1, exp:'30 = 2 × 3 × 5 (só primos).' },

    // --- MMC/MDC ---
    { id:'m8',  s:'matematica', t:'MMC/MDC', type:'mc',   diff:3, q:'Qual é o MDC de 12 e 18?', opts:['2','3','6','12'], ans:2, exp:'Divisores comuns: 1, 2, 3, 6. Maior = 6.' },
    { id:'m9',  s:'matematica', t:'MMC/MDC', type:'fill', diff:3, q:'Qual é o MMC de 4 e 6?', ans:['12'], exp:'Múltiplos de 4: 4, 8, 12... Múltiplos de 6: 6, 12... Menor comum = 12.' },
    { id:'m113', s:'matematica', t:'MMC/MDC', type:'fill', diff:3, q:'Qual é o MDC de 8 e 20?', ans:['4'], exp:'Divisores comuns de 8 e 20: 1, 2, 4. Maior = 4.' },
    { id:'m114', s:'matematica', t:'MMC/MDC', type:'fill', diff:3, q:'Qual é o MMC de 3 e 5?', ans:['15'], exp:'Primos entre si: MMC = 3 × 5 = 15.' },
    { id:'m115', s:'matematica', t:'MMC/MDC', type:'mc',   diff:3, q:'Qual é o MMC de 6 e 9?', opts:['3','15','18','54'], ans:2, exp:'Múltiplos de 6: 6,12,18... de 9: 9,18... MMC = 18.' },

    // --- Potências ---
    { id:'m10', s:'matematica', t:'Potências', type:'fill', diff:2, q:'Quanto é 2³?', ans:['8'], exp:'2³ = 2 × 2 × 2 = 8.' },
    { id:'m11', s:'matematica', t:'Potências', type:'mc',   diff:2, q:'Quanto é 5²?', opts:['10','15','20','25'], ans:3, exp:'5² = 5 × 5 = 25.' },
    { id:'m12', s:'matematica', t:'Potências', type:'fill', diff:3, q:'Quanto é 10⁴?', ans:['10000','10 000'], exp:'10⁴ = 10 × 10 × 10 × 10 = 10 000.' },
    { id:'m116', s:'matematica', t:'Potências', type:'fill', diff:2, q:'Quanto é 3²?', ans:['9'], exp:'3² = 3 × 3 = 9.' },
    { id:'m117', s:'matematica', t:'Potências', type:'fill', diff:2, q:'Quanto é 4³?', ans:['64'], exp:'4³ = 4 × 4 × 4 = 64.' },
    { id:'m118', s:'matematica', t:'Potências', type:'mc',   diff:2, q:'Como se lê 7²?', opts:['sete vezes dois','sete ao quadrado','dois ao sete','sete meios'], ans:1, exp:'aⁿ com n=2 lê-se "ao quadrado".' },
    { id:'m119', s:'matematica', t:'Potências', type:'tf',   diff:2, q:'2⁵ = 32.', ans:true, exp:'2 × 2 × 2 × 2 × 2 = 32.' },
    { id:'m120', s:'matematica', t:'Potências', type:'fill', diff:3, q:'Quanto é 1⁹?', ans:['1'], exp:'Qualquer potência de base 1 é igual a 1.' },

    // --- Operações / Expressões numéricas ---
    { id:'m13', s:'matematica', t:'Operações', type:'fill', diff:2, q:'Calcula: 2 + 3 × 4 = ?', ans:['14'], exp:'Multiplica primeiro (3×4=12), depois soma: 2+12 = 14.' },
    { id:'m14', s:'matematica', t:'Operações', type:'fill', diff:2, q:'Calcula: (5 + 3) × 2 = ?', ans:['16'], exp:'Parênteses primeiro: 5+3=8. Depois 8×2=16.' },
    { id:'m121', s:'matematica', t:'Operações', type:'fill', diff:2, q:'Calcula: 20 − 4 × 3 = ?', ans:['8'], exp:'4 × 3 = 12. Depois 20 − 12 = 8.' },
    { id:'m122', s:'matematica', t:'Operações', type:'fill', diff:2, q:'Calcula: 100 ÷ 5 + 2 = ?', ans:['22'], exp:'Divide primeiro: 100 ÷ 5 = 20. Depois 20 + 2 = 22.' },
    { id:'m123', s:'matematica', t:'Operações', type:'fill', diff:3, q:'Calcula: 3 × (8 − 2) ÷ 2 = ?', ans:['9'], exp:'(8−2)=6; 3×6=18; 18÷2=9.' },
    { id:'m124', s:'matematica', t:'Operações', type:'fill', diff:3, q:'Calcula: 2² + 3² = ?', ans:['13'], exp:'2²=4, 3²=9, 4+9=13.' },
    { id:'m125', s:'matematica', t:'Operações', type:'mc',   diff:2, q:'Qual a ordem correta de operações?', opts:['+, −, ×, ÷','parênteses, ×/÷, +/−','+/−, ×/÷','× primeiro sempre'], ans:1, exp:'Parênteses → potências → ×÷ → +−.' },

    // --- Frações ---
    { id:'m15', s:'matematica', t:'Frações', type:'fill', diff:2, q:'1/2 + 1/4 = ?/4', ans:['3','3/4'], exp:'1/2 = 2/4. 2/4 + 1/4 = 3/4.' },
    { id:'m16', s:'matematica', t:'Frações', type:'mc',   diff:2, q:'Qual fração é equivalente a 2/3?', opts:['4/6','3/4','2/6','4/9'], ans:0, exp:'2/3 = 4/6 (× 2 em cima e em baixo).' },
    { id:'m17', s:'matematica', t:'Frações', type:'mc',   diff:2, q:'Qual destas frações é maior?', opts:['1/2','1/3','1/4','1/5'], ans:0, exp:'Numeradores iguais: menor denominador → maior fração.' },
    { id:'m18', s:'matematica', t:'Frações', type:'fill', diff:3, q:'Simplifica a fração 8/12.', ans:['2/3'], exp:'MDC(8,12)=4. 8/12 = 2/3.' },
    { id:'m126', s:'matematica', t:'Frações', type:'fill', diff:2, q:'Simplifica 6/9.', ans:['2/3'], exp:'MDC(6,9)=3. 6/9 = 2/3.' },
    { id:'m127', s:'matematica', t:'Frações', type:'mc',   diff:2, q:'2/3 + 1/3 = ?', opts:['3/6','1','3/3','2/6'], ans:1, exp:'Mesmo denominador: soma numeradores. 2/3+1/3 = 3/3 = 1.' },
    { id:'m128', s:'matematica', t:'Frações', type:'fill', diff:3, q:'Calcula: 2/5 × 3/4 = (forma a/b)', ans:['6/20','3/10'], exp:'Numerador × numerador, denominador × denominador: 6/20 = 3/10.' },
    { id:'m129', s:'matematica', t:'Frações', type:'mc',   diff:2, q:'Qual destas é uma fração imprópria?', opts:['3/4','1/2','7/3','2/5'], ans:2, exp:'Imprópria = numerador ≥ denominador. 7/3 > 1.' },
    { id:'m130', s:'matematica', t:'Frações', type:'fill', diff:3, q:'Escreve 7/3 como número misto.', ans:['2 1/3','2+1/3','2 e 1/3'], exp:'7 ÷ 3 = 2 resto 1. Logo 7/3 = 2 + 1/3.' },
    { id:'m131', s:'matematica', t:'Frações', type:'fill', diff:2, q:'Calcula: 3/4 − 1/4 = ?', ans:['2/4','1/2'], exp:'3/4 − 1/4 = 2/4 = 1/2.' },
    { id:'m132', s:'matematica', t:'Frações', type:'mc',   diff:3, q:'Qual é maior: 2/5 ou 3/7?', opts:['2/5','3/7','são iguais','não é possível comparar'], ans:1, exp:'Denominador comum 35: 2/5=14/35; 3/7=15/35. 3/7 é maior.' },

    // --- Dízimas ---
    { id:'m22', s:'matematica', t:'Dízimas', type:'mc',   diff:2, q:'Qual é a fração equivalente a 0,5?', opts:['1/5','1/2','1/10','5/10'], ans:1, exp:'0,5 = 1/2 (forma simplificada de 5/10).' },
    { id:'m23', s:'matematica', t:'Dízimas', type:'fill', diff:2, q:'Escreve 3/4 como dízima.', ans:['0,75','0.75'], exp:'3 ÷ 4 = 0,75.' },
    { id:'m133', s:'matematica', t:'Dízimas', type:'fill', diff:2, q:'Escreve 1/5 como dízima.', ans:['0,2','0.2'], exp:'1 ÷ 5 = 0,2.' },
    { id:'m134', s:'matematica', t:'Dízimas', type:'mc',   diff:2, q:'A fração 1/4 em percentagem é:', opts:['14%','25%','40%','250%'], ans:1, exp:'1/4 = 0,25 = 25%.' },
    { id:'m135', s:'matematica', t:'Dízimas', type:'fill', diff:3, q:'Escreve 0,125 como fração simplificada.', ans:['1/8','125/1000'], exp:'0,125 = 125/1000 = 1/8.' },
    { id:'m136', s:'matematica', t:'Dízimas', type:'tf',   diff:2, q:'2,5 é o mesmo que 2 + 1/2.', ans:true, exp:'2,5 = 2 + 0,5 = 2 + 1/2.' },

    // --- Percentagens ---
    { id:'m19', s:'matematica', t:'Percentagens', type:'fill', diff:2, q:'Quanto é 25% de 80?', ans:['20'], exp:'25% = 1/4. 80 ÷ 4 = 20.' },
    { id:'m20', s:'matematica', t:'Percentagens', type:'mc',   diff:2, q:'Quanto é 50% de 120?', opts:['30','50','60','120'], ans:2, exp:'50% = metade → 60.' },
    { id:'m21', s:'matematica', t:'Percentagens', type:'fill', diff:2, q:'Num teste, acertaste 15 em 20. Qual a percentagem?', ans:['75%','75'], exp:'15/20 = 0,75 = 75%.' },
    { id:'m137', s:'matematica', t:'Percentagens', type:'fill', diff:2, q:'Quanto é 10% de 200?', ans:['20'], exp:'10% = 1/10. 200 ÷ 10 = 20.' },
    { id:'m138', s:'matematica', t:'Percentagens', type:'mc',   diff:2, q:'Um casaco de 80€ com desconto de 25%. Quanto poupas?', opts:['5€','10€','20€','40€'], ans:2, exp:'25% de 80 = 20€.' },
    { id:'m139', s:'matematica', t:'Percentagens', type:'fill', diff:3, q:'Uma turma tem 25 alunos, 20% faltaram hoje. Quantos faltaram?', ans:['5'], exp:'20% de 25 = 0,20 × 25 = 5.' },
    { id:'m140', s:'matematica', t:'Percentagens', type:'fill', diff:2, q:'Qual é 100% de 45?', ans:['45'], exp:'100% = o total.' },

    // --- Sequências ---
    { id:'m29', s:'matematica', t:'Sequências', type:'fill', diff:2, q:'Próximo número: 2, 4, 8, 16, ___', ans:['32'], exp:'Cada termo é o dobro do anterior: 32.' },
    { id:'m30', s:'matematica', t:'Sequências', type:'fill', diff:2, q:'Próximo número: 1, 4, 9, 16, ___', ans:['25'], exp:'Quadrados: 5² = 25.' },
    { id:'m141', s:'matematica', t:'Sequências', type:'fill', diff:2, q:'Próximo número: 3, 6, 9, 12, ___', ans:['15'], exp:'Soma 3 a cada termo.' },
    { id:'m142', s:'matematica', t:'Sequências', type:'fill', diff:3, q:'Sequência 1, 1, 2, 3, 5, 8, ___. Qual é o próximo? (Fibonacci)', ans:['13'], exp:'Cada termo = soma dos 2 anteriores: 5+8 = 13.' },
    { id:'m143', s:'matematica', t:'Sequências', type:'mc',   diff:2, q:'Qual é o 10.º termo da sequência dos números pares (começando em 2)?', opts:['10','18','20','22'], ans:2, exp:'2, 4, 6, ..., 20. Termo n = 2n → 2×10 = 20.' },

    // --- Ângulos ---
    { id:'m144', s:'matematica', t:'Ângulos', type:'mc',   diff:2, q:'Um ângulo de 90° chama-se:', opts:['agudo','reto','obtuso','raso'], ans:1, exp:'Reto = 90°.' },
    { id:'m145', s:'matematica', t:'Ângulos', type:'mc',   diff:2, q:'Um ângulo de 45° é:', opts:['agudo','reto','obtuso','raso'], ans:0, exp:'Agudo < 90°.' },
    { id:'m146', s:'matematica', t:'Ângulos', type:'mc',   diff:2, q:'Um ângulo de 135° é:', opts:['agudo','reto','obtuso','raso'], ans:2, exp:'Obtuso: maior que 90° e menor que 180°.' },
    { id:'m147', s:'matematica', t:'Ângulos', type:'fill', diff:2, q:'Qual é a amplitude de um ângulo raso? (só o número)', ans:['180','180°'], exp:'Raso = meia volta = 180°.' },
    { id:'m148', s:'matematica', t:'Ângulos', type:'fill', diff:2, q:'Qual é a amplitude de um ângulo giro? (só o número)', ans:['360','360°'], exp:'Giro = volta completa = 360°.' },
    { id:'m149', s:'matematica', t:'Ângulos', type:'fill', diff:3, q:'Um ângulo mede 35° e outro 55°. Qual a soma dos dois? (só o número)', ans:['90','90°'], exp:'35° + 55° = 90°. Formam um ângulo reto.' },
    { id:'m150', s:'matematica', t:'Ângulos', type:'tf',   diff:2, q:'Dois ângulos são complementares se a sua soma for 90°.', ans:true, exp:'Complementares → soma 90°. Suplementares → soma 180°.' },

    // --- Retas ---
    { id:'m151', s:'matematica', t:'Retas', type:'mc',   diff:2, q:'Duas retas que formam um ângulo de 90° são:', opts:['paralelas','perpendiculares','concorrentes oblíquas','iguais'], ans:1, exp:'Perpendiculares: formam ângulo reto.' },
    { id:'m152', s:'matematica', t:'Retas', type:'tf',   diff:2, q:'Duas retas paralelas nunca se cruzam.', ans:true, exp:'Paralelas → nunca se intersetam.' },
    { id:'m153', s:'matematica', t:'Retas', type:'mc',   diff:2, q:'Duas retas que se cruzam num ponto (sem ser 90°) dizem-se:', opts:['paralelas','perpendiculares','concorrentes','coincidentes'], ans:2, exp:'Concorrentes (oblíquas) cruzam-se mas não formam 90°.' },
    { id:'m154', s:'matematica', t:'Retas', type:'tf',   diff:1, q:'Uma reta pode ter várias perpendiculares.', ans:true, exp:'Pode ter infinitas perpendiculares em pontos diferentes.' },

    // --- Triângulos ---
    { id:'m34', s:'matematica', t:'Triângulos', type:'mc', diff:2, q:'Um triângulo com 3 lados iguais chama-se:', opts:['escaleno','isósceles','equilátero','retângulo'], ans:2, exp:'Equilátero: 3 lados iguais.' },
    { id:'m155', s:'matematica', t:'Triângulos', type:'mc', diff:2, q:'Um triângulo com 2 lados iguais é:', opts:['escaleno','isósceles','equilátero','retângulo'], ans:1, exp:'Isósceles: 2 lados iguais.' },
    { id:'m156', s:'matematica', t:'Triângulos', type:'mc', diff:2, q:'Um triângulo com os 3 lados diferentes é:', opts:['escaleno','isósceles','equilátero','retângulo'], ans:0, exp:'Escaleno: todos os lados diferentes.' },
    { id:'m157', s:'matematica', t:'Triângulos', type:'fill', diff:3, q:'A soma dos ângulos internos de um triângulo é ___ graus.', ans:['180','180°'], exp:'Regra: soma dos ângulos internos = 180°.' },
    { id:'m158', s:'matematica', t:'Triângulos', type:'fill', diff:3, q:'Um triângulo tem ângulos de 50° e 60°. Qual o 3.º ângulo? (só o número)', ans:['70','70°'], exp:'180° − 50° − 60° = 70°.' },
    { id:'m159', s:'matematica', t:'Triângulos', type:'mc', diff:2, q:'Um triângulo retângulo tem um ângulo de:', opts:['60°','90°','100°','180°'], ans:1, exp:'Retângulo → tem um ângulo reto (90°).' },
    { id:'m160', s:'matematica', t:'Triângulos', type:'tf', diff:3, q:'Um triângulo pode ter dois ângulos de 90°.', ans:false, exp:'Se tivesse 2 de 90°, a soma já seria 180° e o 3.º teria de ser 0°. Impossível.' },

    // --- Quadriláteros ---
    { id:'m161', s:'matematica', t:'Quadriláteros', type:'mc', diff:2, q:'Um quadrilátero com 4 lados iguais e 4 ângulos retos é um:', opts:['retângulo','quadrado','losango','trapézio'], ans:1, exp:'Quadrado = 4 lados iguais + 4 ângulos retos.' },
    { id:'m162', s:'matematica', t:'Quadriláteros', type:'mc', diff:2, q:'Um quadrilátero com 4 ângulos retos (mas lados não iguais) é um:', opts:['quadrado','retângulo','losango','trapézio'], ans:1, exp:'Retângulo: 4 ângulos retos, lados opostos iguais.' },
    { id:'m163', s:'matematica', t:'Quadriláteros', type:'mc', diff:3, q:'Um paralelogramo tem os lados opostos:', opts:['iguais e paralelos','perpendiculares','todos iguais','com tamanhos crescentes'], ans:0, exp:'Paralelogramo: lados opostos paralelos e iguais.' },
    { id:'m164', s:'matematica', t:'Quadriláteros', type:'fill', diff:3, q:'A soma dos ângulos internos de um quadrilátero é ___ graus.', ans:['360','360°'], exp:'Qualquer quadrilátero → soma 360° (2 triângulos × 180°).' },
    { id:'m165', s:'matematica', t:'Quadriláteros', type:'mc', diff:2, q:'Um trapézio tem:', opts:['4 lados iguais','apenas 1 par de lados paralelos','4 ângulos retos','todos os lados diferentes'], ans:1, exp:'Trapézio: pelo menos um par de lados paralelos.' },

    // --- Perímetros ---
    { id:'m166', s:'matematica', t:'Perímetros', type:'fill', diff:1, q:'Perímetro de um quadrado com 5 cm de lado. (só o número)', ans:['20'], exp:'P = 4 × lado = 4 × 5 = 20 cm.' },
    { id:'m167', s:'matematica', t:'Perímetros', type:'fill', diff:2, q:'Perímetro de um retângulo 8 cm × 3 cm. (só o número)', ans:['22'], exp:'P = 2 × (8+3) = 2 × 11 = 22 cm.' },
    { id:'m168', s:'matematica', t:'Perímetros', type:'fill', diff:2, q:'Perímetro de um triângulo equilátero com 6 cm de lado. (só o número)', ans:['18'], exp:'P = 3 × 6 = 18 cm.' },
    { id:'m169', s:'matematica', t:'Perímetros', type:'mc', diff:2, q:'Um pentágono regular com 4 cm de lado tem perímetro:', opts:['16 cm','20 cm','24 cm','40 cm'], ans:1, exp:'Pentágono regular = 5 lados iguais. P = 5 × 4 = 20 cm.' },
    { id:'m170', s:'matematica', t:'Perímetros', type:'fill', diff:3, q:'Um triângulo tem lados 5 cm, 7 cm e 9 cm. Perímetro? (só o número)', ans:['21'], exp:'Soma dos lados: 5+7+9 = 21 cm.' },

    // --- Áreas ---
    { id:'m24', s:'matematica', t:'Áreas', type:'fill', diff:2, q:'Área de um retângulo 6 cm × 4 cm. (só o número)', ans:['24','24 cm2','24cm2','24 cm²'], exp:'A = base × altura = 6 × 4 = 24 cm².' },
    { id:'m25', s:'matematica', t:'Áreas', type:'mc',   diff:2, q:'Área de um triângulo com base 10 e altura 6:', opts:['16','30','60','36'], ans:1, exp:'A = (base × altura)/2 = 60/2 = 30.' },
    { id:'m26', s:'matematica', t:'Áreas', type:'fill', diff:3, q:'Área de um quadrado com 7 cm de lado. (só o número)', ans:['49'], exp:'A = lado² = 49 cm².' },
    { id:'m171', s:'matematica', t:'Áreas', type:'fill', diff:2, q:'Área de um paralelogramo com base 8 e altura 5. (só o número)', ans:['40'], exp:'A = base × altura = 8 × 5 = 40.' },
    { id:'m172', s:'matematica', t:'Áreas', type:'fill', diff:3, q:'Área de um trapézio com bases 6 e 10 e altura 4. (só o número)', ans:['32'], exp:'A = (B+b) × h / 2 = (10+6) × 4 / 2 = 32.' },
    { id:'m173', s:'matematica', t:'Áreas', type:'mc', diff:3, q:'Um quadrado tem 36 cm² de área. Qual o lado?', opts:['4 cm','5 cm','6 cm','9 cm'], ans:2, exp:'lado² = 36 → lado = 6 cm.' },

    // --- Volume ---
    { id:'m27', s:'matematica', t:'Volume', type:'mc',   diff:2, q:'Volume de um cubo com aresta 3 cm:', opts:['9 cm³','18 cm³','27 cm³','36 cm³'], ans:2, exp:'V = a³ = 27 cm³.' },
    { id:'m28', s:'matematica', t:'Volume', type:'fill', diff:2, q:'Volume de um paralelepípedo 5×3×2 cm. (só o número)', ans:['30'], exp:'V = 5 × 3 × 2 = 30 cm³.' },
    { id:'m174', s:'matematica', t:'Volume', type:'fill', diff:3, q:'Volume de um cubo com 4 cm de aresta. (só o número)', ans:['64'], exp:'V = 4³ = 64 cm³.' },
    { id:'m175', s:'matematica', t:'Volume', type:'mc', diff:2, q:'1 dm³ corresponde a:', opts:['1 mL','1 L','10 L','1000 L'], ans:1, exp:'1 dm³ = 1 litro.' },
    { id:'m176', s:'matematica', t:'Volume', type:'fill', diff:2, q:'Um aquário tem 30 cm × 20 cm × 15 cm. Volume em cm³? (só o número)', ans:['9000','9 000'], exp:'V = 30 × 20 × 15 = 9 000 cm³ (= 9 L).' },

    // --- Estatística ---
    { id:'m31', s:'matematica', t:'Estatística', type:'fill', diff:2, q:'Qual a média de 4, 6, 8, 10?', ans:['7'], exp:'(4+6+8+10)/4 = 7.' },
    { id:'m32', s:'matematica', t:'Estatística', type:'mc',   diff:2, q:'Moda de: 3, 5, 7, 5, 2, 5, 8?', opts:['3','5','7','8'], ans:1, exp:'5 aparece 3 vezes.' },
    { id:'m177', s:'matematica', t:'Estatística', type:'fill', diff:2, q:'Média de 10, 20, 30.', ans:['20'], exp:'(10+20+30)/3 = 60/3 = 20.' },
    { id:'m178', s:'matematica', t:'Estatística', type:'mc', diff:2, q:'Moda de: 1, 2, 2, 3, 4, 5?', opts:['1','2','3','4'], ans:1, exp:'O 2 é o mais frequente.' },
    { id:'m179', s:'matematica', t:'Estatística', type:'fill', diff:3, q:'Numa turma, as notas foram 3,4,4,5,5,5,6. Qual a moda?', ans:['5'], exp:'5 aparece 3 vezes — moda.' },
    { id:'m180', s:'matematica', t:'Estatística', type:'tf', diff:2, q:'A média pode ser um número que não existe na lista.', ans:true, exp:'Ex: média de 3 e 4 é 3,5 — não está na lista.' },

    // ===== PROBLEMAS DE MATEMÁTICA =====
    // Tipo 'problem' = enunciado contextualizado + material (regra aplicada) + solution (resolução passo-a-passo).

    // --- Números naturais ---
    { id:'m200', s:'matematica', t:'Números naturais', type:'problem', diff:2, q:'Um comboio transporta 248 passageiros. Numa paragem entram 176. Com quantos passageiros segue viagem?', ans:['424'], material:'Para juntar quantidades, usamos a adição. Em colunas: alinhar unidades, dezenas, centenas.', solution:'248 + 176 = 424. Segue com 424 passageiros.' },
    { id:'m201', s:'matematica', t:'Números naturais', type:'problem', diff:2, q:'Uma escola tem 4 turmas de 25 alunos e 3 turmas de 22. Quantos alunos ao todo?', ans:['166'], material:'Multiplicação repetida + adição.', solution:'4 × 25 = 100. 3 × 22 = 66. 100 + 66 = 166 alunos.' },
    { id:'m202', s:'matematica', t:'Números naturais', type:'problem', diff:2, q:'Um livro tem 328 páginas. O João leu 145. Quantas páginas faltam ler?', ans:['183'], material:'Para saber quanto falta, subtrai o lido do total.', solution:'328 − 145 = 183 páginas.' },

    // --- Divisibilidade ---
    { id:'m203', s:'matematica', t:'Divisibilidade', type:'problem', diff:2, q:'Um professor quer dividir 24 alunos em grupos iguais de 6. Quantos grupos consegue formar?', ans:['4'], material:'Dividir = distribuir em partes iguais. Se divisão é exata, não sobra.', solution:'24 ÷ 6 = 4 grupos.' },
    { id:'m204', s:'matematica', t:'Divisibilidade', type:'problem', diff:3, q:'Tens 36 rebuçados. De quantas formas os podes distribuir em partes iguais entre mais do que uma pessoa (sem sobrar e sem contar o próprio 36)? (indica o número de formas)', ans:['7'], material:'Divisores de n: números que dividem n sem resto. Excluindo 1 e n contam-se os restantes.', solution:'Divisores de 36: 1, 2, 3, 4, 6, 9, 12, 18, 36. Excluindo 1 e 36 temos 7: 2, 3, 4, 6, 9, 12, 18.' },
    { id:'m205', s:'matematica', t:'Divisibilidade', type:'problem', diff:3, q:'Um autocarro passa de 5 em 5 minutos e outro de 8 em 8. Daqui a quantos minutos passam os dois ao mesmo tempo (a primeira vez)?', ans:['40'], material:'Quando dois eventos se repetem a intervalos fixos, coincidem no MMC desses intervalos.', solution:'MMC(5,8): múltiplos de 5: 5,10,15,20,25,30,35,40... múltiplos de 8: 8,16,24,32,40... Primeiro comum = 40 min.' },

    // --- Números primos ---
    { id:'m206', s:'matematica', t:'Números primos', type:'problem', diff:3, q:'Decompõe 48 em fatores primos (usa "x" como sinal, ex: 2x2x3).', ans:['2x2x2x2x3','2×2×2×2×3','2*2*2*2*3','2^4x3','2⁴×3'], material:'Decompor em fatores primos: dividir sucessivamente pelos primos até chegar a 1.', solution:'48÷2=24, 24÷2=12, 12÷2=6, 6÷2=3, 3÷3=1. Logo 48 = 2×2×2×2×3 = 2⁴×3.' },
    { id:'m207', s:'matematica', t:'Números primos', type:'problem', diff:2, q:'Indica dois números primos cuja soma seja 10. (ex: "3 e 7")', ans:['3 e 7','7 e 3','3,7','7,3','5 e 5','5,5'], material:'Primos até 10: 2, 3, 5, 7. Procurar pares que somem 10.', solution:'3 + 7 = 10 (ambos primos). Também 5 + 5 = 10.' },

    // --- MMC / MDC ---
    { id:'m208', s:'matematica', t:'MMC/MDC', type:'problem', diff:3, q:'Duas campainhas tocam: uma de 6 em 6 minutos, outra de 10 em 10. Começaram a tocar juntas às 8h. A que horas voltam a tocar em simultâneo?', ans:['8h30','8:30','8h30min','8 e 30','08:30'], material:'Eventos periódicos coincidem no MMC dos seus intervalos.', solution:'MMC(6,10)=30. Passam 30 min desde 8h00 → voltam a tocar juntas às 8h30.' },
    { id:'m209', s:'matematica', t:'MMC/MDC', type:'problem', diff:3, q:'Queres cortar duas fitas de 12 cm e 18 cm em pedaços iguais do maior tamanho possível, sem sobras. Que comprimento tem cada pedaço? (só o número em cm)', ans:['6'], material:'Para partir em pedaços iguais máximos sem sobra → usar o MDC.', solution:'MDC(12,18) = 6. Cada pedaço tem 6 cm. A primeira fita dá 2 pedaços, a segunda 3.' },
    { id:'m210', s:'matematica', t:'MMC/MDC', type:'problem', diff:3, q:'Três amigos vão à biblioteca: um de 2 em 2 dias, outro de 3 em 3 e outro de 4 em 4. Daqui a quantos dias se encontram todos juntos?', ans:['12'], material:'Encontro de eventos periódicos = MMC de todos os intervalos.', solution:'MMC(2,3,4) = 12 dias.' },

    // --- Potências ---
    { id:'m211', s:'matematica', t:'Potências', type:'problem', diff:2, q:'Uma célula divide-se em 2 a cada hora. Se começares com 1 célula, quantas tens ao fim de 4 horas?', ans:['16'], material:'Duplicação sucessiva = potência de 2. Ao fim de n horas → 2ⁿ células.', solution:'1 → 2 → 4 → 8 → 16. Ao fim de 4h: 2⁴ = 16 células.' },
    { id:'m212', s:'matematica', t:'Potências', type:'problem', diff:2, q:'Um quadrado tem 8 cm de lado. Qual a sua área em cm²? (só o número)', ans:['64'], material:'Área do quadrado = lado² (lado ao quadrado).', solution:'8² = 8 × 8 = 64 cm².' },
    { id:'m213', s:'matematica', t:'Potências', type:'problem', diff:3, q:'A distância Terra-Lua é cerca de 4 × 10⁵ km. Escreve essa distância por extenso (só o número).', ans:['400000','400 000'], material:'Potências de 10 encurtam números grandes. 10⁵ = 100 000.', solution:'4 × 10⁵ = 4 × 100 000 = 400 000 km.' },

    // --- Operações ---
    { id:'m214', s:'matematica', t:'Operações', type:'problem', diff:2, q:'A Ana comprou 3 livros a 8€ cada e um caderno a 5€. Quanto pagou ao todo? (só o número)', ans:['29'], material:'Juntar produtos e somas respeitando a ordem das operações.', solution:'3 × 8 = 24. 24 + 5 = 29€.' },
    { id:'m215', s:'matematica', t:'Operações', type:'problem', diff:2, q:'Uma caixa com 144 bolachas é dividida igualmente por 12 pacotes. Quantas bolachas tem cada pacote?', ans:['12'], material:'Para distribuir em partes iguais → divisão.', solution:'144 ÷ 12 = 12 bolachas por pacote.' },
    { id:'m216', s:'matematica', t:'Operações', type:'problem', diff:3, q:'O Pedro tinha 50€. Gastou 3 × 12€ em livros. Com quanto ficou?', ans:['14','14€'], material:'Primeiro multiplicar, depois subtrair ao que tinha.', solution:'3 × 12 = 36€ gastos. 50 − 36 = 14€ restantes.' },

    // --- Frações ---
    { id:'m217', s:'matematica', t:'Frações', type:'problem', diff:2, q:'A Ana comeu 1/4 de uma piza e o João comeu 2/4. Que fração da piza comeram juntos?', ans:['3/4'], material:'Soma de frações com o mesmo denominador: soma os numeradores, mantém o denominador.', solution:'1/4 + 2/4 = 3/4 da piza.' },
    { id:'m218', s:'matematica', t:'Frações', type:'problem', diff:2, q:'Uma garrafa tem 3/4 de litro. Bebi 1/4. Quanto resta? (forma a/b simplificada)', ans:['2/4','1/2','1/2 L','1/2L','0,5 L'], material:'Subtração de frações com mesmo denominador: subtrai numeradores.', solution:'3/4 − 1/4 = 2/4 = 1/2 litro.' },
    { id:'m219', s:'matematica', t:'Frações', type:'problem', diff:3, q:'2/3 da turma são 24 alunos. Quantos alunos tem a turma toda?', ans:['36'], material:'Para encontrar o todo a partir de uma fração: divide pela fração (ou regra de 3).', solution:'Se 2/3 = 24, então 1/3 = 12. Turma inteira = 3/3 = 3 × 12 = 36 alunos.' },
    { id:'m220', s:'matematica', t:'Frações', type:'problem', diff:2, q:'Calcula 1/4 de 20.', ans:['5'], material:'Calcular uma fração de um número: divide pelo denominador, multiplica pelo numerador.', solution:'20 ÷ 4 × 1 = 5.' },

    // --- Dízimas ---
    { id:'m221', s:'matematica', t:'Dízimas', type:'problem', diff:2, q:'Converte 0,8 em fração simplificada.', ans:['4/5','8/10'], material:'0,8 = 8/10. Simplifica dividindo pelo MDC.', solution:'0,8 = 8/10. MDC(8,10)=2 → 4/5.' },
    { id:'m222', s:'matematica', t:'Dízimas', type:'problem', diff:2, q:'Quanto é 0,25 + 0,5? (em dízima)', ans:['0,75','0.75'], material:'Alinhar vírgulas e somar como inteiros.', solution:'0,25 + 0,50 = 0,75.' },
    { id:'m223', s:'matematica', t:'Dízimas', type:'problem', diff:3, q:'Escreve 0,125 como fração simplificada.', ans:['1/8','125/1000'], material:'Dízima = fração com potência de 10 no denominador, depois simplifica.', solution:'0,125 = 125/1000. MDC(125,1000)=125 → 1/8.' },

    // --- Percentagens ---
    { id:'m224', s:'matematica', t:'Percentagens', type:'problem', diff:2, q:'Uma camisola custa 40€ e tem 15% de desconto. Quanto poupas? (só o número)', ans:['6'], material:'Percentagem: X% de Y = (X/100) × Y.', solution:'15% × 40 = 0,15 × 40 = 6€ de desconto.' },
    { id:'m225', s:'matematica', t:'Percentagens', type:'problem', diff:3, q:'Seguindo o problema anterior: qual o preço final da camisola? (só o número)', ans:['34','34€'], material:'Preço final = preço inicial − desconto.', solution:'40 − 6 = 34€.' },
    { id:'m226', s:'matematica', t:'Percentagens', type:'problem', diff:2, q:'No cinema, 30 dos 40 lugares estão ocupados. Qual a percentagem de ocupação?', ans:['75%','75'], material:'Percentagem = (parte ÷ total) × 100.', solution:'30 ÷ 40 = 0,75 = 75%.' },
    { id:'m227', s:'matematica', t:'Percentagens', type:'problem', diff:3, q:'Um telemóvel subiu de 200€ para 250€. Qual a percentagem de aumento?', ans:['25%','25'], material:'Aumento percentual = (aumento ÷ valor inicial) × 100.', solution:'Aumento = 50€. 50/200 = 0,25 = 25%.' },

    // --- Sequências ---
    { id:'m228', s:'matematica', t:'Sequências', type:'problem', diff:2, q:'Numa sequência, cada termo soma 7 ao anterior. Se o 1.º termo é 3, qual é o 5.º?', ans:['31'], material:'Sequência aritmética: termoₙ = termo₁ + (n−1) × razão.', solution:'Termos: 3, 10, 17, 24, 31. Ou 3 + 4×7 = 31.' },
    { id:'m229', s:'matematica', t:'Sequências', type:'problem', diff:3, q:'A quadra de Fibonacci começa 1, 1, 2, 3, 5, 8. Qual o 8.º termo?', ans:['21'], material:'Fibonacci: cada termo = soma dos 2 anteriores.', solution:'1,1,2,3,5,8,13,21 → 8.º = 21.' },

    // --- Ângulos ---
    { id:'m230', s:'matematica', t:'Ângulos', type:'problem', diff:2, q:'Dois ângulos são complementares. Um mede 35°. Quanto mede o outro? (só o número)', ans:['55'], material:'Ângulos complementares: soma = 90°.', solution:'90° − 35° = 55°.' },
    { id:'m231', s:'matematica', t:'Ângulos', type:'problem', diff:2, q:'Um ângulo mede 110°. Qual a amplitude do seu suplementar? (só o número)', ans:['70'], material:'Ângulos suplementares: soma = 180°.', solution:'180° − 110° = 70°.' },
    { id:'m232', s:'matematica', t:'Ângulos', type:'problem', diff:3, q:'Num relógio, às 3 horas, qual o ângulo entre os ponteiros das horas e dos minutos? (só o número)', ans:['90'], material:'O mostrador do relógio divide-se em 12 partes iguais (30° cada). Às 3h, a diferença são 3 "horas" = 3 × 30°.', solution:'3 × 30° = 90°. Ângulo reto.' },

    // --- Retas ---
    { id:'m233', s:'matematica', t:'Retas', type:'problem', diff:2, q:'Duas retas formam um ângulo de 90°. Como se chamam?', ans:['perpendiculares'], material:'Perpendiculares = formam 4 ângulos de 90°.', solution:'Rectas perpendiculares.' },

    // --- Triângulos ---
    { id:'m234', s:'matematica', t:'Triângulos', type:'problem', diff:2, q:'Num triângulo, dois ângulos medem 50° e 60°. Quanto mede o terceiro? (só o número)', ans:['70'], material:'Soma dos ângulos internos do triângulo = 180°.', solution:'180° − 50° − 60° = 70°.' },
    { id:'m235', s:'matematica', t:'Triângulos', type:'problem', diff:3, q:'Num triângulo isósceles, o ângulo diferente mede 40°. Quanto medem cada um dos outros dois? (só o número)', ans:['70'], material:'Isósceles: dois ângulos iguais. Soma interna = 180°.', solution:'180° − 40° = 140°. 140° ÷ 2 = 70° cada.' },
    { id:'m236', s:'matematica', t:'Triângulos', type:'problem', diff:2, q:'Um triângulo retângulo tem um ângulo de 35° (além do reto). Qual é o terceiro ângulo? (só o número)', ans:['55'], material:'Retângulo: um ângulo de 90°. Os outros dois somam 90°.', solution:'90° − 35° = 55°.' },

    // --- Quadriláteros ---
    { id:'m237', s:'matematica', t:'Quadriláteros', type:'problem', diff:2, q:'Num quadrilátero, três ângulos medem 90°, 100° e 80°. Quanto mede o quarto ângulo? (só o número)', ans:['90'], material:'Soma dos ângulos internos de qualquer quadrilátero = 360°.', solution:'360° − 90° − 100° − 80° = 90°.' },

    // --- Perímetros ---
    { id:'m238', s:'matematica', t:'Perímetros', type:'problem', diff:2, q:'Um jardim retangular tem 12 m de comprimento e 8 m de largura. Quantos metros de vedação precisamos?', ans:['40','40 m','40m'], material:'Perímetro do retângulo = 2 × (comprimento + largura).', solution:'2 × (12 + 8) = 2 × 20 = 40 m.' },
    { id:'m239', s:'matematica', t:'Perímetros', type:'problem', diff:2, q:'Uma piscina quadrada tem 6 m de lado. Quantos metros tem à volta?', ans:['24','24 m'], material:'Perímetro do quadrado = 4 × lado.', solution:'4 × 6 = 24 m.' },
    { id:'m240', s:'matematica', t:'Perímetros', type:'problem', diff:3, q:'Um polígono irregular tem lados de 5, 7, 3, 8 e 4 cm. Qual o perímetro? (só o número)', ans:['27'], material:'Perímetro de polígono irregular = soma de todos os lados.', solution:'5 + 7 + 3 + 8 + 4 = 27 cm.' },

    // --- Áreas ---
    { id:'m241', s:'matematica', t:'Áreas', type:'problem', diff:2, q:'Um campo de futebol tem 100 m × 70 m. Qual a área em m²? (só o número)', ans:['7000','7 000'], material:'Área do retângulo = comprimento × largura.', solution:'100 × 70 = 7 000 m².' },
    { id:'m242', s:'matematica', t:'Áreas', type:'problem', diff:2, q:'Uma sala de aula tem 8 m × 6 m. Vamos pôr ladrilhos de 1 m². Quantos precisamos?', ans:['48'], material:'Quantidade de ladrilhos = área / área do ladrilho.', solution:'Área = 8 × 6 = 48 m². 48 ladrilhos de 1 m².' },
    { id:'m243', s:'matematica', t:'Áreas', type:'problem', diff:3, q:'Um triângulo tem base 12 cm e altura 5 cm. Qual a sua área em cm²? (só o número)', ans:['30'], material:'Área do triângulo = (base × altura) ÷ 2.', solution:'(12 × 5) ÷ 2 = 60 ÷ 2 = 30 cm².' },
    { id:'m244', s:'matematica', t:'Áreas', type:'problem', diff:3, q:'Um trapézio tem bases de 10 cm e 6 cm e altura 4 cm. Qual a sua área? (só o número em cm²)', ans:['32'], material:'Área do trapézio = (B + b) × h ÷ 2.', solution:'(10 + 6) × 4 ÷ 2 = 16 × 4 ÷ 2 = 32 cm².' },

    // --- Volume ---
    { id:'m245', s:'matematica', t:'Volume', type:'problem', diff:2, q:'Uma caixa mede 10 cm × 8 cm × 5 cm. Qual o seu volume em cm³? (só o número)', ans:['400'], material:'Volume do paralelepípedo = c × l × a.', solution:'10 × 8 × 5 = 400 cm³.' },
    { id:'m246', s:'matematica', t:'Volume', type:'problem', diff:3, q:'Um aquário tem 40 cm × 25 cm × 20 cm. Quantos litros de água cabem? (só o número)', ans:['20'], material:'1 dm³ = 1 L. Converter cm³ para dm³: dividir por 1000.', solution:'V = 40 × 25 × 20 = 20 000 cm³ = 20 dm³ = 20 L.' },
    { id:'m247', s:'matematica', t:'Volume', type:'problem', diff:2, q:'Um cubo tem 5 cm de aresta. Qual o seu volume em cm³? (só o número)', ans:['125'], material:'Volume do cubo = aresta³.', solution:'5³ = 5 × 5 × 5 = 125 cm³.' },

    // --- Estatística ---
    { id:'m248', s:'matematica', t:'Estatística', type:'problem', diff:2, q:'As notas do Tomás foram: 3, 5, 7, 9. Qual a sua nota média?', ans:['6'], material:'Média = soma dos valores ÷ número de valores.', solution:'(3+5+7+9) ÷ 4 = 24 ÷ 4 = 6.' },
    { id:'m249', s:'matematica', t:'Estatística', type:'problem', diff:2, q:'Numa turma, as notas em matemática foram: 4, 4, 5, 5, 5, 5, 6. Qual é a moda?', ans:['5'], material:'Moda = valor mais frequente.', solution:'O 5 aparece 4 vezes → moda = 5.' },
    { id:'m250', s:'matematica', t:'Estatística', type:'problem', diff:3, q:'Um grupo de 5 alunos tem alturas (cm): 140, 142, 145, 148, 150. Qual a altura média? (só o número)', ans:['145'], material:'Média de dados contínuos: soma tudo e divide pelo número de valores.', solution:'(140+142+145+148+150) ÷ 5 = 725 ÷ 5 = 145 cm.' },

    // ========== INGLÊS (20) ==========
    { id:'i1', s:'ingles', t:'Greetings', type:'mc', diff:1, q:'How do you say "Bom dia" in English?', opts:['Good night','Good morning','Good afternoon','Good evening'], ans:1, exp:'"Good morning" = bom dia.' },
    { id:'i2', s:'ingles', t:'Greetings', type:'mc', diff:1, q:'How do you say "Adeus" in English?', opts:['Hello','Goodbye','Please','Thanks'], ans:1, exp:'"Goodbye" = adeus.' },
    { id:'i3', s:'ingles', t:'Numbers', type:'mc', diff:1, q:'How do you write 15 in English?', opts:['fifty','fifteen','five','fourteen'], ans:1, exp:'15 = fifteen. 50 = fifty.' },
    { id:'i4', s:'ingles', t:'Numbers', type:'fill', diff:1, q:'Write the number 20 in English.', ans:['twenty'], exp:'20 = twenty.' },
    { id:'i5', s:'ingles', t:'Days', type:'mc', diff:1, q:'Which day comes after Monday?', opts:['Sunday','Friday','Tuesday','Wednesday'], ans:2, exp:'Monday → Tuesday.' },
    { id:'i6', s:'ingles', t:'Months', type:'fill', diff:1, q:'What is the first month of the year? (English)', ans:['january'], exp:'January = Janeiro.' },
    { id:'i7', s:'ingles', t:'Family', type:'mc', diff:1, q:'My mother\'s brother is my...', opts:['cousin','uncle','nephew','grandfather'], ans:1, exp:'Mother\'s brother = uncle (tio).' },
    { id:'i8', s:'ingles', t:'Family', type:'mc', diff:1, q:'"Irmã" in English is:', opts:['brother','sister','cousin','aunt'], ans:1, exp:'Sister = irmã.' },
    { id:'i9', s:'ingles', t:'Verb to be', type:'mc', diff:1, q:'Complete: "I ___ a student."', opts:['is','are','am','be'], ans:2, exp:'I am, you are, he/she/it is.' },
    { id:'i10', s:'ingles', t:'Verb to be', type:'mc', diff:1, q:'Complete: "They ___ happy."', opts:['is','am','are','be'], ans:2, exp:'They are happy.' },
    { id:'i11', s:'ingles', t:'Present simple', type:'mc', diff:2, q:'Complete: "She ___ English every day."', opts:['study','studies','studying','studied'], ans:1, exp:'3rd person singular adds -s/-es: she studies.' },
    { id:'i12', s:'ingles', t:'Colors', type:'fill', diff:1, q:'"Vermelho" in English:', ans:['red'], exp:'Red = vermelho.' },
    { id:'i13', s:'ingles', t:'Colors', type:'fill', diff:1, q:'"Azul" in English:', ans:['blue'], exp:'Blue = azul.' },
    { id:'i14', s:'ingles', t:'Prepositions', type:'mc', diff:2, q:'"The cat is ___ the table." (em cima)', opts:['in','on','under','between'], ans:1, exp:'On = em cima de.' },
    { id:'i15', s:'ingles', t:'Prepositions', type:'mc', diff:2, q:'"The ball is ___ the box." (dentro)', opts:['on','under','in','next to'], ans:2, exp:'In = dentro de.' },
    { id:'i16', s:'ingles', t:'Plurals', type:'mc', diff:2, q:'Plural of "child":', opts:['childs','childes','children','child'], ans:2, exp:'Irregular plural: child → children.' },
    { id:'i17', s:'ingles', t:'Questions', type:'mc', diff:2, q:'Como se pergunta "Qual é o teu nome?"', opts:['How are you?','What is your name?','Where are you from?','How old are you?'], ans:1, exp:'What is your name? = Qual é o teu nome?' },
    { id:'i18', s:'ingles', t:'School', type:'mc', diff:1, q:'"Professor" in English:', opts:['student','teacher','principal','classmate'], ans:1, exp:'Teacher = professor.' },
    { id:'i19', s:'ingles', t:'School', type:'fill', diff:1, q:'"Livro" in English:', ans:['book'], exp:'Book = livro.' },
    { id:'i20', s:'ingles', t:'Articles', type:'mc', diff:2, q:'Complete: "I saw ___ elephant."', opts:['a','an','the','no article'], ans:1, exp:'"An" antes de vogal: an elephant.' },

    // ========== CIÊNCIAS (21) ==========
    { id:'c1', s:'ciencias', t:'Seres vivos', type:'mc', diff:1, q:'Qual destes é um ser vivo?', opts:['rocha','árvore','água','nuvem'], ans:1, exp:'Árvore é o único que nasce, cresce, reproduz-se e morre.' },
    { id:'c2', s:'ciencias', t:'Classificação', type:'mc', diff:2, q:'Os mamíferos são caracterizados por:', opts:['põem ovos','têm escamas','amamentam as crias','vivem só na água'], ans:2, exp:'A característica principal dos mamíferos é amamentar as crias.' },
    { id:'c3', s:'ciencias', t:'Vertebrados', type:'mc', diff:2, q:'Qual destes animais é um réptil?', opts:['sapo','lagarto','truta','pombo'], ans:1, exp:'Lagarto = réptil. Sapo = anfíbio. Truta = peixe. Pombo = ave.' },
    { id:'c4', s:'ciencias', t:'Vertebrados', type:'mc', diff:1, q:'Qual deste animais é um peixe?', opts:['golfinho','tubarão','baleia','foca'], ans:1, exp:'Tubarão é peixe (respira por branquias). Os outros são mamíferos.' },
    { id:'c5', s:'ciencias', t:'Anfíbios', type:'tf', diff:2, q:'Os anfíbios vivem parte da vida na água e parte em terra.', ans:true, exp:'Correto. Anfíbio significa "duas vidas".' },
    { id:'c6', s:'ciencias', t:'Aves', type:'mc', diff:1, q:'Qual destas características é própria das aves?', opts:['escamas','penas','pelos','carapaça'], ans:1, exp:'Aves têm o corpo coberto por penas.' },
    { id:'c7', s:'ciencias', t:'Invertebrados', type:'mc', diff:2, q:'Qual destes é um invertebrado?', opts:['gato','aranha','peixe','pombo'], ans:1, exp:'Aranhas são invertebrados (aracnídeos). Os outros têm coluna vertebral.' },
    { id:'c8', s:'ciencias', t:'Alimentação', type:'mc', diff:2, q:'Um animal que só come plantas é:', opts:['carnívoro','omnívoro','herbívoro','detritívoro'], ans:2, exp:'Herbívoro come só plantas. Carnívoro come carne. Omnívoro come ambos.' },
    { id:'c9', s:'ciencias', t:'Alimentação', type:'mc', diff:2, q:'O ser humano é um animal:', opts:['carnívoro','herbívoro','omnívoro','detritívoro'], ans:2, exp:'O ser humano come plantas e animais → omnívoro.' },
    { id:'c10', s:'ciencias', t:'Cadeia alimentar', type:'mc', diff:2, q:'Numa cadeia alimentar, quem está na base?', opts:['predadores','herbívoros','produtores (plantas)','decompositores'], ans:2, exp:'As plantas (produtores) estão na base da cadeia alimentar.' },
    { id:'c11', s:'ciencias', t:'Plantas', type:'mc', diff:2, q:'Como se chama o processo pelo qual as plantas produzem alimento?', opts:['respiração','fotossíntese','transpiração','germinação'], ans:1, exp:'Fotossíntese: plantas usam luz solar + CO₂ + água para produzir açúcar.' },
    { id:'c12', s:'ciencias', t:'Plantas', type:'mc', diff:1, q:'Qual destas partes da planta absorve água do solo?', opts:['folha','caule','flor','raiz'], ans:3, exp:'A raiz absorve água e nutrientes do solo.' },
    { id:'c13', s:'ciencias', t:'Rochas', type:'mc', diff:2, q:'Qual destas é uma rocha sedimentar?', opts:['granito','basalto','calcário','mármore'], ans:2, exp:'Calcário é sedimentar. Granito = magmática. Mármore = metamórfica.' },
    { id:'c14', s:'ciencias', t:'Solo', type:'tf', diff:1, q:'O solo é composto por minerais, água, ar e matéria orgânica.', ans:true, exp:'Correto. Todos estes elementos fazem parte do solo.' },
    { id:'c15', s:'ciencias', t:'Água', type:'mc', diff:2, q:'No ciclo da água, quando a água se transforma em vapor chama-se:', opts:['condensação','evaporação','precipitação','infiltração'], ans:1, exp:'Líquido → gás = evaporação.' },
    { id:'c16', s:'ciencias', t:'Água', type:'mc', diff:2, q:'Quando o vapor de água arrefece e forma nuvens, chama-se:', opts:['evaporação','condensação','solidificação','precipitação'], ans:1, exp:'Gás → líquido = condensação.' },
    { id:'c17', s:'ciencias', t:'Habitat', type:'mc', diff:1, q:'Qual é o habitat do urso polar?', opts:['deserto','floresta tropical','Ártico (gelo)','savana'], ans:2, exp:'O urso polar vive no Ártico, em regiões geladas.' },
    { id:'c18', s:'ciencias', t:'Ecossistema', type:'tf', diff:2, q:'Um ecossistema inclui seres vivos e o ambiente onde vivem.', ans:true, exp:'Correto: ecossistema = biocenose (seres vivos) + biótopo (ambiente).' },
    { id:'c19', s:'ciencias', t:'Reprodução', type:'mc', diff:2, q:'Qual destes animais põe ovos?', opts:['leão','cão','galinha','cavalo'], ans:2, exp:'Galinha é ovípara (põe ovos). Os outros são vivíparos.' },
    { id:'c20', s:'ciencias', t:'Revestimento', type:'match', diff:2, q:'Associa o animal ao seu revestimento:', pairs:[['peixe','escamas'],['pássaro','penas'],['cão','pelo'],['tartaruga','carapaça']], exp:'Cada grupo tem um revestimento característico.' },
    { id:'c21', s:'ciencias', t:'Plantas', type:'fill', diff:2, q:'Qual é o gás que as plantas libertam durante a fotossíntese?', ans:['oxigénio','oxigenio','O2'], exp:'As plantas absorvem CO₂ e libertam oxigénio (O₂).' },

    // ========== HISTÓRIA (22) ==========
    { id:'h1', s:'hgp', t:'Pré-história', type:'mc', diff:1, q:'O que faziam os primeiros povos da Península Ibérica no Paleolítico?', opts:['agricultura','caça e recoleção','construíam castelos','navegavam'], ans:1, exp:'No Paleolítico viviam da caça, pesca e recoleção.' },
    { id:'h2', s:'hgp', t:'Romanos', type:'mc', diff:2, q:'Quando chegaram os romanos à Península Ibérica?', opts:['séc. I d.C.','séc. III a.C.','séc. V d.C.','séc. VIII d.C.'], ans:1, exp:'Os romanos chegaram no séc. III a.C. (218 a.C.).' },
    { id:'h3', s:'hgp', t:'Romanos', type:'mc', diff:2, q:'Que legado deixaram os romanos na Península?', opts:['língua árabe','língua latina','escrita chinesa','religião judaica'], ans:1, exp:'O Latim deu origem ao Português. Também deixaram estradas, pontes, direito romano.' },
    { id:'h4', s:'hgp', t:'Bárbaros', type:'mc', diff:2, q:'Que povo bárbaro se fixou na Península após queda de Roma?', opts:['vikings','visigodos','hunos','celtas'], ans:1, exp:'Os visigodos fundaram um reino na Península no século V.' },
    { id:'h5', s:'hgp', t:'Muçulmanos', type:'mc', diff:2, q:'Em que ano chegaram os muçulmanos à Península Ibérica?', opts:['711','1143','1249','1415'], ans:0, exp:'Em 711 os muçulmanos chegaram e conquistaram grande parte da Península.' },
    { id:'h6', s:'hgp', t:'Reconquista', type:'mc', diff:2, q:'Como se chamou a luta dos cristãos para expulsar os muçulmanos?', opts:['Cruzada','Reconquista','Revolução','Invasão'], ans:1, exp:'Reconquista: luta dos reinos cristãos para recuperar os territórios.' },
    { id:'h7', s:'hgp', t:'Fundação', type:'mc', diff:1, q:'Quem foi o primeiro rei de Portugal?', opts:['D. Sancho I','D. Dinis','D. Afonso Henriques','D. João I'], ans:2, exp:'D. Afonso Henriques foi o primeiro rei de Portugal.' },
    { id:'h8', s:'hgp', t:'Fundação', type:'fill', diff:2, q:'Em que ano foi assinado o Tratado de Zamora, que reconheceu Portugal como reino? (só o ano)', ans:['1143'], exp:'Em 1143, entre D. Afonso Henriques e D. Afonso VII de Leão.' },
    { id:'h9', s:'hgp', t:'Fundação', type:'mc', diff:2, q:'Em 1179, que documento do Papa reconheceu Portugal?', opts:['Bula Manifestis Probatum','Tratado de Alcanices','Carta de Lei','Concílio de Niceia'], ans:0, exp:'Bula Manifestis Probatum (Papa Alexandre III, 1179).' },
    { id:'h10', s:'hgp', t:'Batalhas', type:'mc', diff:2, q:'Qual foi a batalha importante que D. Afonso Henriques venceu em 1139?', opts:['Batalha de Aljubarrota','Batalha de Ourique','Batalha de Salado','Batalha de Toro'], ans:1, exp:'Batalha de Ourique (1139), após a qual foi aclamado rei.' },
    { id:'h11', s:'hgp', t:'Reconquista', type:'mc', diff:2, q:'Qual foi o último território conquistado na Reconquista portuguesa?', opts:['Lisboa','Alentejo','Algarve','Porto'], ans:2, exp:'O Algarve foi conquistado em 1249 por D. Afonso III.' },
    { id:'h12', s:'hgp', t:'Reconquista', type:'fill', diff:2, q:'Em que ano foi conquistado o Algarve? (só o ano)', ans:['1249'], exp:'1249, por D. Afonso III → fim da Reconquista portuguesa.' },
    { id:'h13', s:'hgp', t:'Reis', type:'mc', diff:2, q:'Qual destes reis ficou conhecido como "O Lavrador"?', opts:['D. Dinis','D. Sancho I','D. Afonso III','D. Fernando'], ans:0, exp:'D. Dinis (1279-1325), que promoveu a agricultura.' },
    { id:'h14', s:'hgp', t:'Cultura', type:'mc', diff:2, q:'Quem fundou a primeira universidade portuguesa em 1290?', opts:['D. Sancho I','D. Afonso III','D. Dinis','D. João I'], ans:2, exp:'D. Dinis fundou a Universidade em Lisboa (mais tarde em Coimbra).' },
    { id:'h15', s:'hgp', t:'Lisboa', type:'mc', diff:2, q:'Em que ano foi conquistada Lisboa aos muçulmanos?', opts:['1128','1143','1147','1179'], ans:2, exp:'Lisboa foi conquistada em 1147 por D. Afonso Henriques.' },
    { id:'h16', s:'hgp', t:'Símbolos', type:'mc', diff:1, q:'Os 5 escudetes azuis na bandeira representam:', opts:['os 5 continentes','os 5 reis mouros vencidos em Ourique','as 5 regiões','os 5 oceanos'], ans:1, exp:'Os 5 escudetes representam os 5 reis mouros vencidos na Batalha de Ourique.' },
    { id:'h17', s:'hgp', t:'Dinastias', type:'mc', diff:2, q:'Como se chamou a primeira dinastia portuguesa?', opts:['Avis','Borgonha','Bragança','Filipina'], ans:1, exp:'Dinastia de Borgonha (1139-1383), iniciada por D. Afonso Henriques.' },
    { id:'h18', s:'hgp', t:'Ordem cronológica', type:'order', diff:3, q:'Ordena por data (mais antigo ao mais recente):', items:['Romanos chegam à Península','Muçulmanos chegam à Península','Fundação de Portugal (1143)','Conquista do Algarve (1249)'], exp:'218 a.C. → 711 → 1143 → 1249.' },
    { id:'h19', s:'hgp', t:'Romanos', type:'tf', diff:1, q:'A cidade romana de Olissipo é a actual Lisboa.', ans:true, exp:'Correto: Olissipo → Lisboa.' },
    { id:'h20', s:'hgp', t:'Romanos', type:'match', diff:3, q:'Associa a cidade romana ao nome actual:', pairs:[['Bracara','Braga'],['Ebora','Évora'],['Olissipo','Lisboa'],['Conimbriga','Coimbra']], exp:'Muitas cidades portuguesas têm origem romana.' },
    { id:'h21', s:'hgp', t:'Pré-história', type:'mc', diff:2, q:'No Neolítico, as principais actividades humanas eram:', opts:['caça e recoleção','agricultura e pastorícia','navegação','metalurgia avançada'], ans:1, exp:'No Neolítico houve a "revolução agrícola" — as pessoas tornaram-se sedentárias.' },
    { id:'h22', s:'hgp', t:'Muçulmanos', type:'fill', diff:2, q:'Qual é uma palavra portuguesa de origem árabe começada por "a"? (ex: al-)', ans:['açúcar','alface','almofada','azeite','alfândega'], exp:'Muitas palavras começadas em "al-" ou "a-" vêm do árabe: açúcar, alface, almofada, azeite...' },

    // ========== GEOGRAFIA (22) ==========
    { id:'g1', s:'hgp', t:'Localização', type:'mc', diff:1, q:'Portugal fica em que continente?', opts:['América','África','Europa','Ásia'], ans:2, exp:'Portugal está localizado na Europa, na Península Ibérica.' },
    { id:'g2', s:'hgp', t:'Fronteiras', type:'mc', diff:1, q:'Com que país faz Portugal fronteira terrestre?', opts:['França','Espanha','Itália','Marrocos'], ans:1, exp:'Portugal faz fronteira apenas com Espanha (a norte e leste).' },
    { id:'g3', s:'hgp', t:'Oceanos', type:'mc', diff:1, q:'Qual é o oceano que banha Portugal?', opts:['Pacífico','Atlântico','Índico','Ártico'], ans:1, exp:'Oceano Atlântico banha a costa oeste e sul.' },
    { id:'g4', s:'hgp', t:'Ilhas', type:'mc', diff:1, q:'Quais são as regiões autónomas de Portugal?', opts:['Algarve e Alentejo','Madeira e Açores','Lisboa e Porto','Minho e Douro'], ans:1, exp:'Madeira e Açores são as duas regiões autónomas.' },
    { id:'g5', s:'hgp', t:'Ilhas', type:'tf', diff:2, q:'O arquipélago dos Açores tem 9 ilhas principais.', ans:true, exp:'Correto: São Miguel, Santa Maria, Terceira, Graciosa, São Jorge, Pico, Faial, Flores, Corvo.' },
    { id:'g6', s:'hgp', t:'Rios', type:'mc', diff:2, q:'Qual é o maior rio português (em extensão em Portugal)?', opts:['Douro','Tejo','Mondego','Guadiana'], ans:1, exp:'O Tejo é o maior rio que atravessa Portugal.' },
    { id:'g7', s:'hgp', t:'Rios', type:'mc', diff:2, q:'Em que cidade portuguesa desagua o rio Douro?', opts:['Lisboa','Faro','Porto','Coimbra'], ans:2, exp:'O Douro desagua no Porto.' },
    { id:'g8', s:'hgp', t:'Rios', type:'mc', diff:2, q:'Em que cidade desagua o rio Tejo?', opts:['Porto','Lisboa','Faro','Coimbra'], ans:1, exp:'O Tejo desagua em Lisboa.' },
    { id:'g9', s:'hgp', t:'Relevo', type:'mc', diff:2, q:'Qual é o ponto mais alto de Portugal continental?', opts:['Serra da Estrela','Pico do Arieiro','Montejunto','Serra do Gerês'], ans:0, exp:'Serra da Estrela (Torre — 1993 m). Pico (Açores) é o mais alto do país (2351 m).' },
    { id:'g10', s:'hgp', t:'Montanha', type:'fill', diff:2, q:'Como se chama o ponto mais alto de Portugal (na ilha do Pico)?', ans:['pico','montanha do pico','pico montanha'], exp:'Montanha do Pico — 2351 m, na ilha do Pico (Açores).' },
    { id:'g11', s:'hgp', t:'Capitais', type:'mc', diff:1, q:'Qual é a capital de Portugal?', opts:['Porto','Lisboa','Coimbra','Faro'], ans:1, exp:'Lisboa é a capital.' },
    { id:'g12', s:'hgp', t:'Distritos', type:'fill', diff:2, q:'Quantos distritos tem Portugal continental?', ans:['18'], exp:'Portugal continental tem 18 distritos.' },
    { id:'g13', s:'hgp', t:'Clima', type:'mc', diff:2, q:'Que tipo de clima predomina em Portugal?', opts:['tropical','mediterrânico','polar','desértico'], ans:1, exp:'Clima mediterrânico: invernos suaves e chuvosos, verões quentes e secos.' },
    { id:'g14', s:'hgp', t:'Europa', type:'mc', diff:2, q:'A Península Ibérica é formada por que países?', opts:['Portugal e França','Portugal e Espanha','Portugal, Espanha e Andorra','Portugal, Espanha, Andorra e pequena parte de França e Gibraltar'], ans:3, exp:'Península Ibérica inclui Portugal, Espanha, Andorra, Gibraltar e uma pequena parte de França.' },
    { id:'g15', s:'hgp', t:'Continentes', type:'mc', diff:1, q:'Quantos continentes existem?', opts:['5','6','7','8'], ans:2, exp:'7 continentes: África, América do Norte, América do Sul, Antártida, Ásia, Europa, Oceânia.' },
    { id:'g16', s:'hgp', t:'Europa', type:'mc', diff:2, q:'Qual é o país mais populoso da Europa?', opts:['França','Alemanha','Reino Unido','Itália'], ans:1, exp:'Alemanha tem cerca de 84 milhões de habitantes.' },
    { id:'g17', s:'hgp', t:'Capitais', type:'mc', diff:2, q:'Qual é a capital de Espanha?', opts:['Barcelona','Sevilha','Madrid','Valência'], ans:2, exp:'Madrid é a capital de Espanha.' },
    { id:'g18', s:'hgp', t:'Pontos cardeais', type:'match', diff:2, q:'Associa o ponto cardeal à região em Portugal:', pairs:[['Norte','Minho'],['Sul','Algarve'],['Este','Beira Interior'],['Oeste','Oceano Atlântico']], exp:'Pontos cardeais localizam regiões.' },
    { id:'g19', s:'hgp', t:'Clima', type:'tf', diff:2, q:'O clima do Algarve é geralmente mais quente e seco que o do Minho.', ans:true, exp:'Correto: o Algarve (sul) é mais quente e seco; o Minho (noroeste) é mais chuvoso.' },
    { id:'g20', s:'hgp', t:'Rios', type:'order', diff:2, q:'Ordena os rios de norte para sul (em Portugal continental):', items:['Minho','Douro','Tejo','Guadiana'], exp:'Minho (fronteira norte) → Douro → Tejo → Guadiana (fronteira sul).' },
    { id:'g21', s:'hgp', t:'Ilhas', type:'fill', diff:2, q:'Qual é a capital da Madeira?', ans:['funchal'], exp:'Funchal é a capital da Região Autónoma da Madeira.' },
    { id:'g22', s:'hgp', t:'Europa', type:'fill', diff:2, q:'Em que ano Portugal entrou na União Europeia? (só o ano)', ans:['1986'], exp:'Portugal aderiu à CEE (atual UE) em 1 de janeiro de 1986.' }
];

// ========== CURRICULUM (ordem dos tópicos do livro / programa) ==========
// Ordem aproximada dos manuais do 5.º ano (Porto Editora MX 5 para Matemática).
const CURRICULUM = {
    matematica: [
        'Números naturais',
        'Divisibilidade',
        'Números primos',
        'MMC/MDC',
        'Potências',
        'Operações',
        'Frações',
        'Dízimas',
        'Percentagens',
        'Sequências',
        'Ângulos',
        'Retas',
        'Triângulos',
        'Quadriláteros',
        'Perímetros',
        'Áreas',
        'Volume',
        'Estatística'
    ],
    portugues: [
        'Ortografia',
        'Classes de palavras',
        'Determinantes',
        'Pronomes',
        'Verbos',
        'Funções sintáticas',
        'Pontuação',
        'Plurais',
        'Recursos expressivos',
        'Tipos de texto'
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
        'Verb to be',
        'Plurals',
        'Present simple',
        'Prepositions',
        'Questions'
    ],
    ciencias: [
        'Seres vivos',
        'Classificação',
        'Vertebrados',
        'Anfíbios',
        'Aves',
        'Invertebrados',
        'Revestimento',
        'Alimentação',
        'Reprodução',
        'Cadeia alimentar',
        'Ecossistema',
        'Habitat',
        'Plantas',
        'Água',
        'Solo',
        'Rochas'
    ],
    hgp: [
        'Localização',
        'Fronteiras',
        'Continentes',
        'Oceanos',
        'Europa',
        'Pontos cardeais',
        'Distritos',
        'Capitais',
        'Rios',
        'Relevo',
        'Montanha',
        'Ilhas',
        'Clima',
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
        'Símbolos',
        'Dinastias',
        'Ordem cronológica'
    ]
};

// Expor globalmente
window.SUBJECTS = SUBJECTS;
window.EXERCISES = EXERCISES;
window.LESSONS = LESSONS;
window.CURRICULUM = CURRICULUM;
