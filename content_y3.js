// Gerado a partir de content.js (v571): banco BASE deste ano, carregado
// só quando um perfil deste ano está ativo (loadYearExtras). IIFE para não
// colidir com os const vazios de content.js.
(function () {
const EXERCISES_3_OCEANUS = [
    // ===========================================================
    // PORTUGUÊS 3.º
    // ===========================================================
    { id:'3p1', s:'portugues', t:'Ditongos e hiatos', type:'mc', diff:1, q:'🌧️ Qual destas palavras tem um ditongo?', opts:['casa','pai','sol'], ans:1, exp:'"Pai" tem o ditongo "ai" (duas vogais na mesma sílaba).' ,
      intro: "No 1.º ano aprendeste o que é um ditongo: duas vogais juntas na MESMA sílaba. Vou ajudar-te a reconhecê-los nas palavras do dia-a-dia.",
      hint: "Diz a palavra em voz alta. Conseguiste dizê-la num só \"puxão\" (mesma sílaba)? Se sim — é ditongo!",
      richExp: "**Ditongos comuns**: ai, ei, oi, ui, au, eu, iu, ou (orais) e ão, ãe, õe (nasais).\n\n**Truque**: bate palmas em cada sílaba.\n- \"pai\" → 1 palma ✓ ditongo\n- \"casa\" → 2 palmas (\"ca-sa\") sem ditongo\n- \"saída\" → 3 palmas (\"sa-í-da\") — aqui o \"ai\" SEPARA-SE, é HIATO!\n\n**Conexão**: ditongos com til (~) chamam-se nasais — sentes vibração no nariz quando os dizes: pão, mãe, põe."},
    { id:'3p2', s:'portugues', t:'Ditongos e hiatos', type:'mc', diff:2, q:'🦁 Qual destas palavras tem hiato?', opts:['mau','leão','não'], ans:1, exp:'"Le-ão" tem hiato — duas vogais em sílabas diferentes (le | ão).' },
    { id:'3p3', s:'portugues', t:'Ditongos e hiatos', type:'tf', diff:2, q:'A palavra "saída" tem hiato.', ans:true, exp:'sa-í-da: o "a" e o "í" estão em sílabas diferentes → hiato.' ,
      intro: "**Hiato** = duas vogais juntas mas em sílabas SEPARADAS. Diferente do ditongo (juntas na mesma sílaba). Reconhecer a diferença é fundamental para a divisão silábica.",
      hint: "Diz \"saída\" devagar. Bate palmas em cada sílaba: sa-Í-da → 3 batidas. O \"a\" e o \"í\" ficam em sílabas DIFERENTES.",
      richExp: "**Sa-Í-da** → 3 sílabas. O \"a\" termina a 1.ª e o \"í\" começa a 2.ª. NÃO se juntam → é **HIATO**.\n\n**Truque dos acentos**: nos hiatos a 2.ª vogal costuma ter ACENTO (sa-Í-da, ba-Ú, ca-fé-Í-na).\n\n**Comparação**:\n- \"saia\" (1 ditongo \"ai\") → 2 sílabas: sa-ia\n- \"saída\" (1 hiato \"a+í\") → 3 sílabas: sa-í-da\n\n**Conexão**: vais usar esta distinção na contagem de sílabas em poesia (métrica) — no 7.º ano."},
    { id:'3p4', s:'portugues', t:'Ditongos e hiatos', type:'fill', diff:2, q:'Indica o ditongo de "boi": ___', ans:['oi'], exp:'B-oi → ditongo "oi".' },

    { id:'3p5', s:'portugues', t:'Acentuação', type:'mc', diff:1, q:'🔤 Que acento tem a palavra "café"?', opts:['agudo','grave','circunflexo'], ans:0, exp:'"Café" leva acento agudo (´).' ,
      intro: "Os **acentos gráficos** dizem muito sobre como uma palavra se pronuncia. São 4: agudo (´), grave (`), circunflexo (^) e til (~).",
      hint: "\"Café\" tem som ABERTO no \"é\" — quase um grito. Quando uma vogal soa aberta, leva acento ___.",
      richExp: "**Os 4 acentos gráficos**:\n- **´ (agudo)** — vogal ABERTA. Ex: ca-**fé**, mã**í**z, pó.\n- **^ (circunflexo)** — vogal FECHADA. Ex: a-v**ô**, p**ê**ssego.\n- **` (grave)** — quase só em \"à\" (preposição \"a\" + artigo \"a\"). Ex: vou **à** escola.\n- **~ (til)** — vogal NASAL. Ex: m**ã**e, irm**ã**, p**ã**o.\n\n**Confusão comum**: trocar agudo com circunflexo.\n- \"ca-fé\" (agudo, som \"é\" aberto) vs \"av-ô\" (circunflexo, som \"ô\" fechado).\n\n**Conexão**: as palavras esdrúxulas (com tónica na antepenúltima sílaba) **levam SEMPRE acento**. Ex: **á**rvore, **á**gua, m**á**quina."},
    { id:'3p6', s:'portugues', t:'Acentuação', type:'mc', diff:2, q:'🔤 Que acento tem "avô"?', opts:['agudo','grave','circunflexo'], ans:2, exp:'"Avô" leva acento circunflexo (^).' },
    { id:'3p7', s:'portugues', t:'Acentuação', type:'mc', diff:2, q:'🔤 Em que palavra é OBRIGATÓRIO o acento?', opts:['casa','árvore','mesa'], ans:1, exp:'"Árvore" é palavra esdrúxula — leva sempre acento.' },
    { id:'3p8', s:'portugues', t:'Acentuação', type:'tf', diff:1, q:'A palavra "mãe" leva til (~).', ans:true, exp:'O til marca a nasalidade: m-ã-e.' },

    { id:'3p9', s:'portugues', t:'Translineação', type:'mc', diff:2, q:'🔤 Como se divide a palavra "escola" para passar à linha seguinte?', opts:['esc-ola','es-co-la','escol-a'], ans:1, exp:'Por sílabas: es-co-la.' },
    { id:'3p10', s:'portugues', t:'Translineação', type:'fill', diff:2, q:'Quantas sílabas tem "borboleta"? ___', ans:['4','quatro'], exp:'bor-bo-le-ta → 4 sílabas.' },

    { id:'3p11', s:'portugues', t:'Nomes (próprios, comuns, coletivos)', type:'mc', diff:1, q:'📛 "Maria" é um nome:', opts:['comum','próprio','coletivo'], ans:1, exp:'Nomes de pessoas são próprios — escrevem-se com maiúscula.' },
    { id:'3p12', s:'portugues', t:'Nomes (próprios, comuns, coletivos)', type:'mc', diff:2, q:'🐝 Conjunto de abelhas chama-se:', opts:['cardume','enxame','rebanho'], ans:1, exp:'Enxame é o nome coletivo de abelhas.' },
    { id:'3p13', s:'portugues', t:'Nomes (próprios, comuns, coletivos)', type:'mc', diff:2, q:'🐟 Conjunto de peixes chama-se:', opts:['cardume','manada','enxame'], ans:0, exp:'Cardume = conjunto de peixes.' },
    { id:'3p14', s:'portugues', t:'Nomes (próprios, comuns, coletivos)', type:'fill', diff:2, q:'Conjunto de árvores: ___', ans:['floresta','arvoredo'], exp:'Floresta ou arvoredo são nomes coletivos de árvores.' },

    { id:'3p15', s:'portugues', t:'Determinantes', type:'mc', diff:1, q:'🔤 "O", "a", "os", "as" são:', opts:['nomes','artigos definidos','adjetivos'], ans:1, exp:'"O/a/os/as" são artigos definidos.' },
    { id:'3p16', s:'portugues', t:'Determinantes', type:'mc', diff:2, q:'🔤 Em "este livro", "este" é determinante:', opts:['artigo','demonstrativo','possessivo'], ans:1, exp:'"Este" indica proximidade — é demonstrativo.' },
    { id:'3p17', s:'portugues', t:'Determinantes', type:'mc', diff:2, q:'🔤 Em "o meu cão", "meu" é:', opts:['artigo','possessivo','demonstrativo'], ans:1, exp:'"Meu" indica posse — é determinante possessivo.' },

    { id:'3p18', s:'portugues', t:'Adjetivos', type:'mc', diff:1, q:'📝 Em "cão preto", o adjetivo é:', opts:['cão','preto'], ans:1, exp:'"Preto" qualifica o nome "cão" → adjetivo.' },
    { id:'3p19', s:'portugues', t:'Adjetivos', type:'mc', diff:2, q:'📝 Grau superlativo absoluto sintético de "alto":', opts:['mais alto','altíssimo','muito alto'], ans:1, exp:'Altíssimo (com -íssimo) é superlativo absoluto sintético.' },

    { id:'3p20', s:'portugues', t:'Verbos', type:'mc', diff:1, q:'⏰ "Eu cantei" está no:', opts:['presente','passado','futuro'], ans:1, exp:'"Cantei" é pretérito perfeito → passado.' ,
      intro: "Os **verbos** indicam quando uma ação acontece. As 3 grandes \"caixas\" do tempo são passado, presente e futuro.",
      hint: "\"Cantei\" — quando aconteceu o cantar? **Já** cantei? **Estou** a cantar? Ou **vou** cantar?",
      richExp: "**Tempos verbais simples**:\n- **Presente**: agora. *Eu canto.*\n- **Pretérito perfeito**: passado terminado. *Eu cant**ei**.*\n- **Pretérito imperfeito**: passado continuado/repetido. *Eu cant**ava** todos os dias.*\n- **Futuro**: vai acontecer. *Eu cant**arei** / vou cantar.*\n\n**Verbos auxiliares** (não confundir com tempos):\n- \"**vou** cantar\" (auxiliar IR + infinitivo) — futuro próximo.\n- \"**estou** a cantar\" (auxiliar ESTAR + a + infinitivo) — presente contínuo.\n\n**Dica**: pergunta \"quando?\". Resposta com \"ontem/já/há dias\" → passado. Com \"agora/já a fazer\" → presente. Com \"amanhã/vou\" → futuro.\n\n**Conexão**: no 7.º ano aprofundas com modo conjuntivo (que cant**asse**, que cant**e**, quando eu cant**ar**)."},
    { id:'3p21', s:'portugues', t:'Verbos', type:'mc', diff:2, q:'⏰ "Amanhã vou correr." Está no:', opts:['presente','passado','futuro'], ans:2, exp:'"Vou correr" + "amanhã" → futuro.' },
    { id:'3p22', s:'portugues', t:'Verbos', type:'fill', diff:2, q:'Verbo no infinitivo de "comemos": ___', ans:['comer'], exp:'Comer é o infinitivo (forma -ar/-er/-ir).' },

    { id:'3p23', s:'portugues', t:'Plurais e feminino', type:'mc', diff:1, q:'🐶 Plural de "cão":', opts:['cãos','cães','cãoes'], ans:1, exp:'Plural irregular: cão → cães.' },
    { id:'3p24', s:'portugues', t:'Plurais e feminino', type:'fill', diff:2, q:'Feminino de "padeiro": ___', ans:['padeira'], exp:'Padeiro → padeira.' },
    { id:'3p25', s:'portugues', t:'Plurais e feminino', type:'mc', diff:2, q:'🐎 Feminino de "cavalo":', opts:['égua','cavala','cavalinha'], ans:0, exp:'Cavalo / égua — feminino diferente da forma masculina.' },

    { id:'3p26', s:'portugues', t:'Tipos de frase', type:'mc', diff:1, q:'❓ "Como te chamas?" é frase:', opts:['declarativa','interrogativa','exclamativa','imperativa'], ans:1, exp:'Termina em "?" e faz pergunta → interrogativa.' ,
      intro: "Há **4 tipos de frase** em português, e cada uma diz-se com uma entonação diferente. Saber distingui-las ajuda-te a ler com expressão.",
      hint: "Olha SÓ para o sinal de pontuação no fim: ponto (.) → declarativa; interrogação (?) → pergunta; exclamação (!) → exclamativa; ordem/conselho → imperativa.",
      richExp: "**Os 4 tipos**:\n- **Declarativa**: \"O João está em casa.\" → informa.\n- **Interrogativa**: \"O João está em casa?\" → pergunta. Voz SOBE no fim.\n- **Exclamativa**: \"Que dia lindo!\" → emoção. Voz expressiva.\n- **Imperativa**: \"Vai dormir.\" / \"Fecha a porta.\" → ordem/conselho.\n\n**Atenção**: uma frase com `!` pode ser exclamativa OU imperativa — depende se há **emoção** (alegria, surpresa) ou **ordem**.\n\n**Conexão à leitura**: ao ler em voz alta, faz pausa nos sinais finais e adapta a entonação ao tipo de frase."},
    { id:'3p27', s:'portugues', t:'Tipos de frase', type:'mc', diff:2, q:'❗ "Que dia lindo!" é frase:', opts:['declarativa','interrogativa','exclamativa','imperativa'], ans:2, exp:'Termina em "!" e exprime emoção → exclamativa.' },
    { id:'3p28', s:'portugues', t:'Tipos de frase', type:'mc', diff:2, q:'📜 "Vai dormir." é frase:', opts:['declarativa','interrogativa','exclamativa','imperativa'], ans:3, exp:'Dá uma ordem/conselho → imperativa.' },

    { id:'3p29', s:'portugues', t:'Sinónimos e antónimos', type:'mc', diff:1, q:'🔄 Sinónimo de "bonito":', opts:['feio','lindo','grande'], ans:1, exp:'"Lindo" tem o mesmo sentido que "bonito".' ,
      intro: "**Sinónimos** são palavras com significado **PARECIDO**. Saber sinónimos é poderoso porque te dá mais palavras para escrever — sem repetir!",
      hint: "\"Bonito\" e ? — qual destas palavras tem o mesmo sentido positivo de aparência agradável?",
      richExp: "**Sinónimos de \"bonito\"**: lindo, belo, formoso, encantador, fofo, giro.\n\n**Antónimos** (significado OPOSTO) de \"bonito\": feio, horrendo, horrível.\n\n**Cuidado!** Sinónimos não são sempre intercambiáveis. Têm pequenas diferenças:\n- \"Lindo\" é mais forte que \"bonito\".\n- \"Formoso\" é mais formal.\n- \"Giro\" é coloquial.\n\n**Como enriquecer textos**: se vais usar \"bonito\" 3 vezes, troca por sinónimos:\n- \"A casa era **bonita**, com janelas **encantadoras** e um jardim **formoso**.\"\n\n**Conexão**: vais ter um dicionário de sinónimos (dicionário ideológico) no 7.º — é uma ferramenta essencial."},
    { id:'3p30', s:'portugues', t:'Sinónimos e antónimos', type:'fill', diff:2, q:'Antónimo de "claro": ___', ans:['escuro'], exp:'Claro ↔ escuro.' },

    { id:'3p31', s:'portugues', t:'Família de palavras', type:'mc', diff:2, q:'🌳 Qual destas palavras NÃO pertence à família de "flor"?', opts:['florista','floresta','flora'], ans:1, exp:'"Floresta" não pertence à família de "flor" (vem do latim foresta). "Florista" e "flora" é que vêm de flor.' },
    { id:'3p32', s:'portugues', t:'Família de palavras', type:'fill', diff:2, q:'Pessoa que vende pão: ___', ans:['padeiro','padeira'], exp:'Padeiro/padeira — da família de "pão".' },

    { id:'3p33', s:'portugues', t:'Compreensão de texto', type:'mc', diff:2, q:'📖 Quem conta a história num texto narrativo é o:', opts:['autor','narrador','protagonista'], ans:1, exp:'O narrador é a voz que conta. O autor é quem escreve. O protagonista é a personagem principal.' },
    { id:'3p34', s:'portugues', t:'Compreensão de texto', type:'mc', diff:2, q:'📖 As três partes de uma história são:', opts:['título, texto, desenho','introdução, desenvolvimento, conclusão','personagem, espaço, tempo'], ans:1, exp:'Estrutura: introdução → desenvolvimento → conclusão (também chamado desenlace).' },
    { id:'3p35', s:'portugues', t:'Compreensão de texto', type:'tf', diff:1, q:'Personagem é alguém (ou algo) que aparece na história.', ans:true, exp:'Personagens podem ser pessoas, animais ou objetos personificados.' ,
      intro: "Num **texto narrativo**, as personagens são quem \"vive\" a história. Sem elas não há narrativa! Podem ser pessoas, animais, ou até objetos personificados.",
      hint: "Pensa em \"O Cuquedo\" ou \"A galinha ruiva\": animais com fala. Em \"Pinóquio\": um boneco que ganha vida. Tudo isto pode ser personagem.",
      richExp: "**Personagens — tipos**:\n- **Pessoas**: a Eduarda, a mãe, o professor.\n- **Animais**: o cão Bobi, a galinha ruiva, o Capuchinho.\n- **Objetos personificados**: Pinóquio (boneco), Toy Story.\n- **Entidades fantásticas**: dragões, fadas, robôs.\n\n**Classificação por importância**:\n- **Principais** (protagonistas) — a história gira à volta delas.\n- **Secundárias** — aparecem mas têm menos peso.\n- **Figurantes** — só são mencionados.\n\n**Classificação por evolução**:\n- **Planas**: não mudam (heróis e vilões dos contos tradicionais).\n- **Redondas**: evoluem ao longo da história (mais realistas).\n\n**Conexão**: no 7.º aprofundas o estudo das personagens com classificações mais ricas (autodiegético, heterodiegético, omnisciente) e modos de caracterização (direta vs indireta)."},

    // ===========================================================
    // MATEMÁTICA 3.º
    // ===========================================================
    { id:'3m1', s:'matematica', t:'Números até 10 000', type:'mc', diff:1, q:'🔢 Quantas centenas tem 1 000?', opts:['1','10','100'], ans:1, exp:'1 000 = 10 centenas.' },
    { id:'3m2', s:'matematica', t:'Números até 10 000', type:'mc', diff:2, q:'🔢 Como se lê 4 305?', opts:['quatrocentos e trinta e cinco','quatro mil e trezentos e cinco','quarenta mil e trinta e cinco'], ans:1, exp:'4 305 = quatro mil e trezentos e cinco.' },
    { id:'3m3', s:'matematica', t:'Números até 10 000', type:'fill', diff:2, q:'Escreve em algarismos: três mil e doze. ___', ans:['3012','3 012'], exp:'3 000 + 12 = 3 012.' },

    { id:'3m4', s:'matematica', t:'Valor posicional', type:'mc', diff:2, q:'🔢 No número 5 472, qual é o valor do algarismo 4?', opts:['4','40','400','4 000'], ans:2, exp:'O 4 está nas centenas → 400.' },
    { id:'3m5', s:'matematica', t:'Valor posicional', type:'fill', diff:1, q:'Em 753, o algarismo das centenas é ___', ans:['7'], exp:'7 centenas + 5 dezenas + 3 unidades.' },

    { id:'3m6', s:'matematica', t:'Adição e subtração', type:'mc', diff:1, q:'🔢 248 + 132 =', opts:['370','380','390'], ans:1, exp:'248 + 132 = 380.' },
    { id:'3m7', s:'matematica', t:'Adição e subtração', type:'mc', diff:2, q:'🔢 1 000 − 347 =', opts:['653','663','753'], ans:0, exp:'1 000 − 347 = 653.' },
    { id:'3m8', s:'matematica', t:'Adição e subtração', type:'problem', diff:2, q:'A Ana tinha 152 cromos. Comprou mais 78. Quantos tem agora?', ans:['230','230 cromos'], exp:'152 + 78 = 230 cromos.' },

    { id:'3m9', s:'matematica', t:'Multiplicação', type:'mc', diff:1, q:'🔢 7 × 8 =', opts:['54','56','58'], ans:1, exp:'Tabuada do 7: 7×8 = 56.' ,
      intro: "Vais usar a tabuada do 7 — uma das mais difíceis. Mas há truques para a saber bem!",
      hint: "7 × 8 é o mesmo que 7 × 10 − 7 × 2 = 70 − 14. Quanto dá?",
      richExp: "**A tabuada do 7 — truques**:\n- 7 × 5 = **35** (a meio, fácil)\n- 7 × 7 = **49** (o quadrado)\n- 7 × 10 = **70** (acrescenta zero)\n\n**Para 7 × 8**: usa o atalho 7 × 10 − 7 × 2 = 70 − 14 = **56**.\n\n**Curiosidade**: 1 semana tem 7 dias, por isso 7 × 4 = 28 dias (≈ 1 mês), 7 × 52 = 364 dias (≈ 1 ano).\n\n**Conexão**: a tabuada do 14 (que vais aprender depois) é o DOBRO da do 7."},
    { id:'3m10', s:'matematica', t:'Multiplicação', type:'mc', diff:2, q:'🔢 23 × 4 =', opts:['82','92','102'], ans:1, exp:'Parte: 20×4=80 e 3×4=12 → 80+12 = 92.',
      intro: 'A Eduarda está a ajudar a mãe a fazer pacotes. Cada pacote leva 23 doces e ela quer encher 4 pacotes. Quantos doces precisa AO TODO?',
      hint: 'Faz por partes! 20 × 4 = 80 e 3 × 4 = 12. Soma os dois: 80 + 12 = ___',
      richExp: '**Passo a passo do algoritmo**:\n```\n   2 3\n ×   4\n ─────\n   9 2\n```\n- **Unidades**: 4 × 3 = 12 → escreve 2, transporta 1.\n- **Dezenas**: 4 × 2 = 8, soma o transporte (+1) = 9.\n\n**Atalho mental**: decompor o número grande em (dezenas + unidades) e multiplicar cada parte. (20 × 4) + (3 × 4) = 80 + 12 = 92.\n\n**Truque**: o resultado de 23 × 4 tem de ser par (porque 4 é par). Se calculares e der ímpar — erraste algures!' },
    { id:'3m11', s:'matematica', t:'Multiplicação', type:'problem', diff:2, q:'4 caixas com 25 lápis cada. Quantos lápis ao todo?', ans:['100','100 lápis'], exp:'4 × 25 = 100 lápis.' },

    { id:'3m12', s:'matematica', t:'Tabuadas', type:'mc', diff:1, q:'🔢 6 × 7 =', opts:['42','48','54'], ans:0, exp:'6 × 7 = 42. Truque: 6×7 = 6×5 + 6×2 = 30 + 12.' },
    { id:'3m13', s:'matematica', t:'Tabuadas', type:'mc', diff:1, q:'🔢 9 × 9 =', opts:['72','81','90'], ans:1, exp:'9 × 9 = 81. Truque do 9: 9×10 − 9 = 90 − 9 = 81.' },
    { id:'3m14', s:'matematica', t:'Tabuadas', type:'fill', diff:2, q:'8 × ___ = 56', ans:['7'], exp:'Pensa ao contrário: 56 ÷ 8 = 7. Fixa: 5-6-7-8 (56 = 7×8)!' },

    { id:'3m15', s:'matematica', t:'Divisão', type:'mc', diff:1, q:'🔢 36 ÷ 6 =', opts:['5','6','7'], ans:1, exp:'36 ÷ 6 = 6 (porque 6 × 6 = 36).' ,
      intro: "A **divisão** é a operação inversa da multiplicação. Saber bem as tabuadas torna a divisão fácil!",
      hint: "Pensa \"6 vezes quanto dá 36?\". Usa a tabuada do 6.",
      richExp: "**Pensar a divisão como pergunta da tabuada**:\n- 36 ÷ 6 = ? → \"6 × ? = 36\" → ? = **6**\n- 56 ÷ 8 = ? → \"8 × ? = 56\" → ? = 7\n- 81 ÷ 9 = ? → \"9 × ? = 81\" → ? = 9\n\n**Vocabulário**:\n- **Dividendo** (36): o que se divide\n- **Divisor** (6): em quantos grupos\n- **Quociente** (6): quanto fica em cada grupo\n\n**Verifica**: divisor × quociente = dividendo. 6 × 6 = 36 ✓\n\n**Próximo passo**: divisão com resto (quando a divisão NÃO é exata). Ex: 23 ÷ 4 = 5 com resto 3."},
    { id:'3m16', s:'matematica', t:'Divisão', type:'mc', diff:2, q:'🔢 23 ÷ 4: quociente e resto?', opts:['5 e 3','6 e 0','5 e 4'], ans:0, exp:'4×5=20; 23−20=3 → quociente 5, resto 3.' },
    { id:'3m17', s:'matematica', t:'Divisão', type:'problem', diff:2, q:'30 alunos formam 5 equipas iguais. Quantos por equipa?', ans:['6','6 alunos'], exp:'30 ÷ 5 = 6 por equipa. Confirma: 5 equipas × 6 = 30 ✓' },

    { id:'3m18', s:'matematica', t:'Múltiplos e divisores', type:'mc', diff:2, q:'🔢 Qual destes é múltiplo de 5?', opts:['12','25','37'], ans:1, exp:'25 = 5 × 5 → múltiplo.' },
    { id:'3m19', s:'matematica', t:'Múltiplos e divisores', type:'mc', diff:2, q:'🔢 Qual destes é divisor de 24?', opts:['5','7','8'], ans:2, exp:'24 ÷ 8 = 3 (resto 0) → 8 é divisor.' },
    { id:'3m20', s:'matematica', t:'Múltiplos e divisores', type:'fill', diff:2, q:'O menor múltiplo comum entre 4 e 6 é ___', ans:['12'], exp:'Múltiplos: 4, 8, 12... e 6, 12... → 12.' },

    { id:'3m21', s:'matematica', t:'Frações', type:'mc', diff:1, q:'🍕 Uma piza dividida em 4 partes iguais e 1 comida. Que fração resta?', opts:['1/4','3/4','4/4'], ans:1, exp:'Comeu 1/4, restam 3/4.',
      intro: 'É domingo. A família da Eduarda pediu uma piza para o jantar. A piza foi cortada em **4 fatias iguais** e a Eduarda comeu **1 fatia**.',
      hint: 'Imagina a piza desenhada como uma cruz com 4 fatias. Pinta 1 fatia (a que comeste). Quantas fatias FICARAM por pintar?',
      richExp: '**A fração é como uma divisão**:\n- O **denominador** (em baixo) diz em quantas partes IGUAIS dividimos o todo. Aqui: 4.\n- O **numerador** (em cima) diz quantas partes contamos.\n\nA piza começou com **4/4** (todas as 4 fatias). A Eduarda comeu **1/4**. Restam:\n\n`4/4 − 1/4 = 3/4`\n\n**Conexão**: o numerador e o denominador SOMAM sempre o todo. 1 (comeu) + 3 (resta) = 4. ✓\n\n**Próximo desafio**: e se comer 2 fatias? Qual a fração que resta?' },
    { id:'3m22', s:'matematica', t:'Frações', type:'mc', diff:2, q:'🔢 Qual é maior?', opts:['1/2','1/3','1/4'], ans:0, exp:'Quanto maior o denominador, MENOR cada parte. 1/2 > 1/3 > 1/4.' },
    { id:'3m23', s:'matematica', t:'Frações', type:'fill', diff:2, q:'Metade escreve-se como fração: ___', ans:['1/2'], exp:'Metade = 1 parte de 2 = 1/2.' },

    { id:'3m24', s:'matematica', t:'Polígonos', type:'mc', diff:1, q:'🔺 Polígono com 3 lados:', opts:['quadrado','triângulo','pentágono'], ans:1, exp:'Tri = 3. Triângulo tem 3 lados.' },
    { id:'3m25', s:'matematica', t:'Polígonos', type:'mc', diff:2, q:'⬢ Polígono com 6 lados:', opts:['pentágono','hexágono','octógono'], ans:1, exp:'Hexa = 6. Hexágono tem 6 lados.' },
    { id:'3m26', s:'matematica', t:'Polígonos', type:'fill', diff:2, q:'Polígono com 5 lados: ___', ans:['pentágono'], exp:'Penta = 5.' },

    { id:'3m27', s:'matematica', t:'Sólidos geométricos', type:'mc', diff:1, q:'⚽ Uma bola é parecida com:', opts:['cubo','esfera','cone'], ans:1, exp:'Esfera = forma redonda perfeita.' },
    { id:'3m28', s:'matematica', t:'Sólidos geométricos', type:'mc', diff:2, q:'🎲 Quantas faces tem um cubo?', opts:['4','6','8'], ans:1, exp:'O cubo tem 6 faces quadradas.' },

    { id:'3m29', s:'matematica', t:'Perímetro', type:'mc', diff:2, q:'📐 Perímetro de um quadrado de lado 5 cm:', opts:['10 cm','20 cm','25 cm'], ans:1, exp:'P = 4 × 5 = 20 cm.' },
    { id:'3m30', s:'matematica', t:'Perímetro', type:'problem', diff:2, q:'Um retângulo tem 8 cm e 3 cm. Qual o perímetro?', ans:['22','22 cm'], exp:'P = 2×(8+3) = 22 cm.' },

    { id:'3m31', s:'matematica', t:'Comprimento', type:'mc', diff:1, q:'📏 1 metro = ___ centímetros', opts:['10','100','1 000'], ans:1, exp:'1 m = 100 cm.' },
    { id:'3m32', s:'matematica', t:'Comprimento', type:'mc', diff:2, q:'📏 1 km = ___ m', opts:['100','1 000','10 000'], ans:1, exp:'1 km = 1 000 m (quilo = mil).' },

    { id:'3m33', s:'matematica', t:'Tempo', type:'mc', diff:1, q:'⏰ 1 hora = ___ minutos', opts:['30','60','100'], ans:1, exp:'1 hora = 60 minutos.' },
    { id:'3m34', s:'matematica', t:'Tempo', type:'mc', diff:2, q:'⏰ 1 dia tem ___ horas', opts:['12','24','48'], ans:1, exp:'24 horas (12 do dia + 12 da noite).' },

    { id:'3m35', s:'matematica', t:'Dinheiro', type:'mc', diff:1, q:'💶 1 € = ___ cêntimos', opts:['10','100','1 000'], ans:1, exp:'1 euro = 100 cêntimos.' },
    { id:'3m36', s:'matematica', t:'Dinheiro', type:'problem', diff:2, q:'Um livro custa 8,50 €. Pago com nota de 10 €. Quanto recebo de troco?', ans:['1,50','1,50 €','1.50'], exp:'10 − 8,50 = 1,50 €.' },

    { id:'3m37', s:'matematica', t:'Tabelas e gráficos', type:'mc', diff:1, q:'📊 Gráfico bom para mostrar partes de um todo (percentagens):', opts:['barras','linhas','circular'], ans:2, exp:'Gráfico circular ("pizza") mostra bem as partes do todo.' },
    { id:'3m38', s:'matematica', t:'Tabelas e gráficos', type:'mc', diff:2, q:'📊 Numa votação 5 alunos votaram em A, 8 em B, 2 em C. Quem ganhou?', opts:['A','B','C'], ans:1, exp:'B teve o maior número de votos (8).' },
    { id:'3m39', s:'matematica', t:'Tabelas e gráficos', type:'fill', diff:2, q:'Total de votos do exercício anterior (A=5, B=8, C=2): ___', ans:['15'], exp:'5 + 8 + 2 = 15.' },

    // ===========================================================
    // SCIENCE 3.º (Cambridge Primary Stage 3 — Oceanus)
    // 4 strands: Biology · Chemistry · Physics · Earth and Space
    // ===========================================================
    // ----- Biology: Living things -----
    { id:'3e1', s:'estudo_meio', t:'Living things', type:'mc', diff:1, q:'🌿 Which of these is a living thing?', opts:['rock','tree','car'], ans:1, exp:'A tree grows, takes in water and reproduces — it is living.' },
    { id:'3e2', s:'estudo_meio', t:'Living things', type:'mc', diff:2, q:'🔬 Which of these is NOT a feature of all living things?', opts:['they grow','they move on their own','they need food'], ans:1, exp:'Plants grow but do not move from place to place. All living things grow, feed, breathe and reproduce.' },
    { id:'3e3', s:'estudo_meio', t:'Living things', type:'tf', diff:1, q:'A flame is a living thing because it grows.', ans:false, exp:'False — a flame grows but does not feed, breathe or reproduce. Living things must do all of those.' },

    // ----- Biology: Plants -----
    { id:'3e4', s:'estudo_meio', t:'Plants', type:'mc', diff:1, q:'🌱 The part of a plant that takes water and minerals from the soil is the:', opts:['root','stem','leaf'], ans:0, exp:'The root absorbs water and nutrients.' },
    { id:'3e5', s:'estudo_meio', t:'Plants', type:'mc', diff:2, q:'🍃 Where do plants make their food?', opts:['in the roots','in the leaves','in the flower'], ans:1, exp:'In the leaves, using sunlight (photosynthesis).' },
    { id:'3e6', s:'estudo_meio', t:'Plants', type:'mc', diff:1, q:'🌸 What part of the plant becomes the fruit?', opts:['the leaf','the flower','the root'], ans:1, exp:'The flower turns into fruit, which carries the seeds.' },
    { id:'3e7', s:'estudo_meio', t:'Plants', type:'tf', diff:1, q:'Plants need light, water and air to grow.', ans:true, exp:'True — and minerals from the soil.' },

    // ----- Biology: Animals and habitats -----
    { id:'3e8', s:'estudo_meio', t:'Animals and habitats', type:'mc', diff:1, q:'🐟 Animals that live in water and breathe through gills are:', opts:['mammals','fish','birds'], ans:1, exp:'Fish (peixes) vivem na água e respiram por guelras (gills). Mammals respiram por pulmões e birds têm penas.' },
    { id:'3e9', s:'estudo_meio', t:'Animals and habitats', type:'mc', diff:2, q:'🦅 Animals with feathers and a beak are:', opts:['reptiles','birds','mammals'], ans:1, exp:'Birds — feathers, beak and they lay eggs.' },
    { id:'3e10', s:'estudo_meio', t:'Animals and habitats', type:'mc', diff:2, q:'🐢 Turtles, snakes and crocodiles are:', opts:['amphibians','reptiles','fish'], ans:1, exp:'Reptiles — scaly skin, cold-blooded.' },
    { id:'3e11', s:'estudo_meio', t:'Animals and habitats', type:'mc', diff:2, q:'🏜️ The natural home of a camel is the:', opts:['rainforest','desert','arctic'], ans:1, exp:'A habitat is where an animal lives. Camels live in deserts.' },
    { id:'3e12', s:'estudo_meio', t:'Animals and habitats', type:'tf', diff:2, q:'Mammals feed their young with milk.', ans:true, exp:'True — a key feature of mammals.' },

    // ----- Biology: The human body -----
    { id:'3e13', s:'estudo_meio', t:'The human body', type:'mc', diff:1, q:'🦴 About how many bones does an adult human body have?', opts:['50','100','206'], ans:2, exp:'About 206 bones make up the adult skeleton.' },
    { id:'3e14', s:'estudo_meio', t:'The human body', type:'mc', diff:2, q:'🫀 The organ that pumps blood around the body is the:', opts:['lung','heart','liver'], ans:1, exp:'The heart pumps blood through the body.' },
    { id:'3e15', s:'estudo_meio', t:'The human body', type:'mc', diff:2, q:'🫁 We breathe in oxygen using our:', opts:['stomach','lungs','intestines'], ans:1, exp:'Lungs take in air and oxygen passes into the blood.' },
    { id:'3e16', s:'estudo_meio', t:'The human body', type:'fill', diff:1, q:'The body system that lets us move our body is the ___ system.', ans:['muscular','musculoskeletal','muscle'], exp:'Muscles work with bones to make us move.' },

    // ----- Biology: Senses -----
    { id:'3e17', s:'estudo_meio', t:'Senses', type:'mc', diff:1, q:'👁️ How many senses do humans have?', opts:['3','5','7'], ans:1, exp:'5 senses: sight, hearing, smell, taste, touch.' },
    { id:'3e18', s:'estudo_meio', t:'Senses', type:'mc', diff:1, q:'👃 We use our nose for the sense of:', opts:['sight','smell','taste'], ans:1, exp:'The nose senses smells.' },
    { id:'3e19', s:'estudo_meio', t:'Senses', type:'fill', diff:1, q:'We use our ___ to taste food.', ans:['tongue'], exp:'The tongue senses sweet, salty, sour and bitter.' },
    { id:'3e20', s:'estudo_meio', t:'Senses', type:'mc', diff:2, q:'🤚 The sense of touch is detected by the:', opts:['eyes','skin','ears'], ans:1, exp:'The skin has receptors for pressure, heat and pain.' },

    // ----- Biology: Healthy eating -----
    { id:'3e21', s:'estudo_meio', t:'Healthy eating', type:'mc', diff:1, q:'🥗 A healthy daily food is:', opts:['sweets','fruit and vegetables','crisps'], ans:1, exp:'Fruit and vegetables give vitamins and fibre.' },
    { id:'3e22', s:'estudo_meio', t:'Healthy eating', type:'mc', diff:2, q:'🍝 Bread, rice and pasta give us mostly:', opts:['proteins','carbohydrates','fats'], ans:1, exp:'They are rich in carbohydrates — our main source of energy.' },
    { id:'3e23', s:'estudo_meio', t:'Healthy eating', type:'mc', diff:2, q:'🥩 Foods rich in protein for growth are:', opts:['butter and oil','meat, fish, eggs and beans','sugar and honey'], ans:1, exp:'Proteins (meat, fish, eggs, beans) help us grow and repair our body.' },
    { id:'3e24', s:'estudo_meio', t:'Healthy eating', type:'tf', diff:1, q:'Drinking water every day is important for the body.', ans:true, exp:'True — water keeps our body working.' },

    // ----- Chemistry: Materials and their properties -----
    { id:'3e25', s:'estudo_meio', t:'Materials and their properties', type:'mc', diff:1, q:'🪵 Wood is a material that comes from:', opts:['trees','rocks','animals'], ans:0, exp:'Wood is a natural material from trees.' },
    { id:'3e26', s:'estudo_meio', t:'Materials and their properties', type:'mc', diff:2, q:'🪟 The best material for a window because we can see through it:', opts:['wood','glass','metal'], ans:1, exp:'Glass is transparent — light passes through it.' },
    { id:'3e27', s:'estudo_meio', t:'Materials and their properties', type:'mc', diff:2, q:'🧦 A material that bends easily and is soft to the touch:', opts:['stone','fabric','metal'], ans:1, exp:'Fabric is flexible and soft — used for clothes.' },

    // ----- Chemistry: Solids, liquids and gases -----
    { id:'3e28', s:'estudo_meio', t:'Solids, liquids and gases', type:'mc', diff:1, q:'🧊 Ice is an example of a:', opts:['solid','liquid','gas'], ans:0, exp:'Ice is solid water — it holds its shape.' },
    { id:'3e29', s:'estudo_meio', t:'Solids, liquids and gases', type:'mc', diff:2, q:'💧 A liquid:', opts:['keeps its shape','takes the shape of its container','fills any space available'], ans:1, exp:'Liquids flow and take the shape of the container.' },
    { id:'3e30', s:'estudo_meio', t:'Solids, liquids and gases', type:'tf', diff:2, q:'A gas spreads out to fill all the space available.', ans:true, exp:'True — gases have no fixed shape or volume.' },

    // ----- Chemistry: Mixing and separating -----
    { id:'3e31', s:'estudo_meio', t:'Mixing and separating', type:'mc', diff:2, q:'🧂 When you stir salt into water, the salt:', opts:['floats on top','disappears (dissolves)','sinks to the bottom'], ans:1, exp:'Salt dissolves in water — it forms a solution.' },
    { id:'3e32', s:'estudo_meio', t:'Mixing and separating', type:'mc', diff:2, q:'☕ How can you separate sand from water?', opts:['by mixing more','by filtering','by heating only'], ans:1, exp:'A filter (like coffee paper) lets the water pass but holds the sand.' },
    { id:'3e33', s:'estudo_meio', t:'Mixing and separating', type:'mc', diff:2, q:'🧲 The best way to separate iron pieces from sand:', opts:['filter','magnet','sieve'], ans:1, exp:'A magnet picks up the iron — it does not affect sand.' },

    // ----- Physics: Forces (push and pull) -----
    { id:'3e34', s:'estudo_meio', t:'Forces (push and pull)', type:'mc', diff:1, q:'🛒 Pushing a shopping trolley is an example of a:', opts:['push','pull'], ans:0, exp:'A push moves something away from you.' },
    { id:'3e35', s:'estudo_meio', t:'Forces (push and pull)', type:'mc', diff:1, q:'🚪 Opening a door towards you is a:', opts:['push','pull'], ans:1, exp:'A pull brings something closer to you.' },
    { id:'3e36', s:'estudo_meio', t:'Forces (push and pull)', type:'tf', diff:2, q:'A force can change the speed or direction of a moving object.', ans:true, exp:'True — pushes and pulls speed up, slow down or change direction.' },

    // ----- Physics: Magnets -----
    { id:'3e37', s:'estudo_meio', t:'Magnets', type:'mc', diff:1, q:'🧲 A magnet attracts objects made of:', opts:['plastic','iron','wood'], ans:1, exp:'Magnets attract iron and some other metals (steel, nickel).' },
    { id:'3e38', s:'estudo_meio', t:'Magnets', type:'mc', diff:2, q:'🧲 The two ends of a magnet are called:', opts:['top and bottom','north and south poles','plus and minus'], ans:1, exp:'A magnet has a north pole and a south pole.' },
    { id:'3e39', s:'estudo_meio', t:'Magnets', type:'tf', diff:2, q:'Two opposite poles of magnets repel each other.', ans:false, exp:'False — opposite poles ATTRACT. Same poles repel.' },

    // ----- Physics: Light and shadows -----
    { id:'3e40', s:'estudo_meio', t:'Light and shadows', type:'mc', diff:1, q:'☀️ The main natural source of light on Earth is the:', opts:['Moon','Sun','stars'], ans:1, exp:'The Sun is our main source of light and heat.' },
    { id:'3e41', s:'estudo_meio', t:'Light and shadows', type:'mc', diff:2, q:'🌑 A shadow forms when light is blocked by a/an:', opts:['transparent object','opaque object','mirror'], ans:1, exp:'Opaque objects block light and create shadows. Transparent objects let light through.' },
    { id:'3e42', s:'estudo_meio', t:'Light and shadows', type:'tf', diff:1, q:'A shadow is longer when the Sun is low in the sky.', ans:true, exp:'True — at sunrise/sunset shadows are long; at midday they are short.' },

    // ----- Earth and Space: The Sun, Earth and Moon -----
    { id:'3e43', s:'estudo_meio', t:'The Sun, Earth and Moon', type:'mc', diff:1, q:'⭐ The Earth turns once on itself every ___ hours.', opts:['12','24','365'], ans:1, exp:'Earth\'s rotation = 24 hours = 1 day.' },
    { id:'3e44', s:'estudo_meio', t:'The Sun, Earth and Moon', type:'mc', diff:2, q:'🌍 The Earth orbits the Sun once every:', opts:['1 month','1 year','24 hours'], ans:1, exp:'Earth\'s orbit (revolution) takes about 365 days = 1 year.' },
    { id:'3e45', s:'estudo_meio', t:'The Sun, Earth and Moon', type:'mc', diff:1, q:'🌙 The body that orbits the Earth is the:', opts:['Sun','Moon','Mars'], ans:1, exp:'The Moon is Earth\'s natural satellite.' },

    // ----- Earth and Space: Weather -----
    { id:'3e46', s:'estudo_meio', t:'Weather', type:'mc', diff:1, q:'🌧️ Tiny drops of water that fall from clouds:', opts:['snow','rain','hail'], ans:1, exp:'Rain is liquid water falling from clouds.' },
    { id:'3e47', s:'estudo_meio', t:'Weather', type:'mc', diff:2, q:'🌡️ The instrument used to measure temperature is the:', opts:['barometer','thermometer','rain gauge'], ans:1, exp:'Thermometer measures how hot or cold something is.' },
    { id:'3e48', s:'estudo_meio', t:'Weather', type:'tf', diff:1, q:'Clouds are made of tiny drops of water.', ans:true, exp:'True — when air rises and cools, water vapour turns into tiny drops that form clouds.' },

    // ===========================================================
    // ENGLISH 3.º (Cambridge Primary English Stage 3 — Oceanus)
    // Foco em literacia: word/sentence/text level. NÃO é A1 EFL.
    // ===========================================================
    // ----- Nouns -----
    { id:'3i1', s:'ingles', t:'Nouns', type:'mc', diff:1, q:'📚 Which word is a noun?', opts:['quickly','dog','run'], ans:1, exp:'A noun names a person, animal, place or thing. "Dog" is an animal.' },
    { id:'3i2', s:'ingles', t:'Nouns', type:'mc', diff:2, q:'🏛️ A proper noun is:', opts:['the name of any thing','the special name of a person or place (capital letter)','an action word'], ans:1, exp:'Proper nouns name specific people or places (e.g. London, Maria). They start with a capital letter.' },
    { id:'3i3', s:'ingles', t:'Nouns', type:'fill', diff:1, q:'The plural of "child" is ___.', ans:['children'], exp:'Irregular plural: child → children.' },
    { id:'3i4', s:'ingles', t:'Nouns', type:'mc', diff:2, q:'🐝 A collective noun for bees is:', opts:['flock','swarm','herd'], ans:1, exp:'A swarm of bees (flock = birds; herd = cows).' },

    // ----- Verbs -----
    { id:'3i5', s:'ingles', t:'Verbs', type:'mc', diff:1, q:'🏃 Which word is a verb?', opts:['happy','run','table'], ans:1, exp:'A verb is an action or being word. "Run" is an action.' },
    { id:'3i6', s:'ingles', t:'Verbs', type:'mc', diff:2, q:'🔤 In "She is happy", the verb is:', opts:['She','is','happy'], ans:1, exp:'"Is" is a state-of-being verb (form of "to be").' },
    { id:'3i7', s:'ingles', t:'Verbs', type:'fill', diff:2, q:'Past tense of "go" is ___.', ans:['went'], exp:'Irregular verb: go → went.' },

    // ----- Adjectives -----
    { id:'3i8', s:'ingles', t:'Adjectives', type:'mc', diff:1, q:'📝 An adjective is a word that:', opts:['names a thing','describes a noun','shows action'], ans:1, exp:'Adjectives describe nouns (e.g. big, red, happy).' },
    { id:'3i9', s:'ingles', t:'Adjectives', type:'mc', diff:2, q:'🌳 In "the tall tree", the adjective is:', opts:['the','tall','tree'], ans:1, exp:'"Tall" describes the tree.' },
    { id:'3i10', s:'ingles', t:'Adjectives', type:'fill', diff:2, q:'The opposite of "small" is ___.', ans:['big','large'], exp:'Antonyms: small ↔ big/large.' },

    // ----- Tenses -----
    { id:'3i11', s:'ingles', t:'Tenses', type:'mc', diff:1, q:'⏰ "I play football every day." This is in the:', opts:['past','present','future'], ans:1, exp:'Present simple — habits and routines.' },
    { id:'3i12', s:'ingles', t:'Tenses', type:'mc', diff:2, q:'⏰ "Yesterday I played football." This is in the:', opts:['past','present','future'], ans:0, exp:'Past simple — completed actions in the past.' },
    { id:'3i13', s:'ingles', t:'Tenses', type:'mc', diff:2, q:'⏰ "Tomorrow I will play football." This is in the:', opts:['past','present','future'], ans:2, exp:'Future with "will" — actions that have not happened yet.' },
    { id:'3i14', s:'ingles', t:'Tenses', type:'fill', diff:2, q:'Past simple of "eat": I ___ an apple.', ans:['ate'], exp:'Irregular: eat → ate.' },

    // ----- Punctuation -----
    { id:'3i15', s:'ingles', t:'Punctuation', type:'mc', diff:1, q:'❓ A sentence that asks a question ends with:', opts:['.', '?', '!'], ans:1, exp:'Question mark (?) at the end of questions.' },
    { id:'3i16', s:'ingles', t:'Punctuation', type:'mc', diff:1, q:'❗ A sentence that shows strong feeling ends with:', opts:['.', '?', '!'], ans:2, exp:'Exclamation mark (!) for surprise, joy, anger.' },
    { id:'3i17', s:'ingles', t:'Punctuation', type:'mc', diff:2, q:'🔤 Capital letters are used at the start of:', opts:['every word','sentences and proper nouns','only verbs'], ans:1, exp:'Capital letters at the start of sentences and for proper nouns (names of people/places, days, months).' },
    { id:'3i18', s:'ingles', t:'Punctuation', type:'fill', diff:2, q:'The apostrophe in "don\'t" replaces the letter ___.', ans:['o'], exp:'don\'t = do not. The apostrophe replaces the "o" in "not".' },

    // ----- Sentence types -----
    { id:'3i19', s:'ingles', t:'Sentence types', type:'mc', diff:1, q:'📜 "Close the door." is a:', opts:['statement','question','command'], ans:2, exp:'A command (imperative) tells someone to do something.' },
    { id:'3i20', s:'ingles', t:'Sentence types', type:'mc', diff:2, q:'📜 "What is your name?" is a:', opts:['statement','question','command'], ans:1, exp:'A question asks for information and ends with "?".' },
    { id:'3i21', s:'ingles', t:'Sentence types', type:'tf', diff:1, q:'A statement gives information and ends with a full stop.', ans:true, exp:'True — statements (declarative sentences) end with "."' },

    // ----- Synonyms and antonyms -----
    { id:'3i22', s:'ingles', t:'Synonyms and antonyms', type:'mc', diff:1, q:'🔄 A synonym for "happy" is:', opts:['sad','glad','tired'], ans:1, exp:'Synonyms have the SAME or similar meaning. Glad = happy.' },
    { id:'3i23', s:'ingles', t:'Synonyms and antonyms', type:'mc', diff:2, q:'🔄 An antonym for "fast" is:', opts:['quick','slow','speedy'], ans:1, exp:'Antonyms are OPPOSITES. Fast ↔ slow.' },
    { id:'3i24', s:'ingles', t:'Synonyms and antonyms', type:'fill', diff:2, q:'A word that means the SAME as "big": ___', ans:['large','huge','enormous'], exp:'Synonyms of big: large, huge, enormous.' },

    // ----- Reading comprehension -----
    { id:'3i25', s:'ingles', t:'Reading comprehension', type:'mc', diff:1, q:'📖 The MAIN character in a story is called the:', opts:['narrator','author','protagonist'], ans:2, exp:'The protagonist is the main character. The narrator tells the story; the author writes it.' },
    { id:'3i26', s:'ingles', t:'Reading comprehension', type:'mc', diff:2, q:'📖 The three main parts of a story are:', opts:['title, body, end','beginning, middle, end','characters, setting, plot'], ans:1, exp:'Beginning → middle → end. (Setting, characters and plot are story elements, not parts.)' },
    { id:'3i27', s:'ingles', t:'Reading comprehension', type:'mc', diff:2, q:'📖 The place where a story happens is called the:', opts:['setting','plot','character'], ans:0, exp:'Setting = where (and when) the story takes place.' },
];
const EXERCISES_3_DETETIVE = [
    // ── QUANTOS VÊS? → Subitizing (ten-frames) ───────────────
    // Treino nuclear de discalculia: reconhecer quantidade sem contar.
    { id:'3dt_qt1', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:1, q:'🧠 Quantos pontos?', dots:5, prompt:'Quantos pontos vês? (uma linha cheia = 5)' },
    { id:'3dt_qt2', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:1, q:'🧠 Quantos pontos?', dots:3, prompt:'Quantos pontos vês?' },
    { id:'3dt_qt12', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:1, q:'🧠 Quantos pontos?', dots:2, prompt:'Só dois — vês de relance, sem contar.' },
    { id:'3dt_qt13', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:1, q:'🧠 Quantos pontos?', dots:4, prompt:'Vês 4 sem contar um a um?' },
    { id:'3dt_qt14', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:2, q:'🧠 Quantos pontos?', dots:9, prompt:'Quase um ten-frame cheio: 10 − 1. Quantos?' },
    { id:'3dt_qt3', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:1, q:'🧠 Quantos pontos?', dots:7, prompt:'Vês 5 + quantos a mais?' },
    { id:'3dt_qt4', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:2, q:'🧠 Quantos pontos?', dots:8, prompt:'Uma linha de 5 + outra começada. Quantos?' },
    { id:'3dt_qt5', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:2, q:'🧠 Quantos pontos?', dots:10, prompt:'O ten-frame cheio. Quantos?' },
    { id:'3dt_qt6', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:2, q:'🧠 Quantos pontos?', dots:6, prompt:'5 + 1. Quantos ao todo?' },
    { id:'3dt_qt7', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:3, q:'🧠 Quantos pontos?', dots:13, prompt:'Um ten-frame cheio (10) + mais alguns. Quantos?' },
    { id:'3dt_qt8', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:3, q:'🧠 Quantos pontos?', dots:16, prompt:'10 + 6. Quantos ao todo?' },

    // ── CHARADAS MATEMÁTICAS → Cofre dos Códigos ─────────────
    { id:'3dt_cha19', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre', diff:1, q:'🔍 As moedas da Rita', digits:1, solution:'5', story:'A Rita tem 2 moedas no bolso esquerdo e 3 no bolso direito.', clues:['Quantas moedas tem ao todo?'], hint:'Junta os dois bolsos: 2 + 3.', exp:'2 + 3 = 5 moedas. Juntar = somar.' },
    { id:'3dt_cha20', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre', diff:1, q:'🔍 Os balões do palhaço', digits:1, solution:'6', story:'O palhaço tinha 8 balões. Rebentaram 2.', clues:['Com quantos balões ficou?'], hint:'Tira os que rebentaram: 8 − 2.', exp:'8 − 2 = 6 balões. Rebentar = tirar.' },
    { id:'3dt_cha1', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre', diff:1, q:'🔍 Cromos do João', digits:1, solution:'6', story:'A Sara tem o DOBRO dos cromos do João. Juntos têm 18.', clues:['Quantos cromos tem o João?'], hint:'Se o João tem J, a Sara tem 2J. J + 2J = 18.', exp:'J + 2J = 3J = 18 → João tem 6.' },
    { id:'3dt_cha2', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:1, q:'🧠 Berlindes ao todo', story:'Tenho 3 caixas. Cada caixa tem 4 sacos. Cada saco tem 5 berlindes.', steps:[
        { prompt:'Passo 1: 3 caixas × 4 sacos cada. Quantos sacos no total?', answer:'12', hint:'Tabuada do 4: 4+4+4.' },
        { prompt:'Passo 2: 12 sacos × 5 berlindes cada. Quantos berlindes ao todo?', answer:'60', hint:'Tabuada do 5: 12×5 é 6×10.' }
    ], exp:'Passo 1: 12 sacos. Passo 2: 60 berlindes.' },
    { id:'3dt_cha3', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:2, q:'🧠 Que número pensei?', story:'Pensei num número, somei 5, depois dividi por 3 e deu 4. Vamos descobrir trabalhando de trás para a frente.', steps:[
        { prompt:'Passo 1: o resultado depois de dividir por 3 deu 4. Que número TINHA antes de dividir? (4 × 3)', answer:'12', hint:'Para desfazer ÷3, fazes ×3.' },
        { prompt:'Passo 2: a esse número eu tinha somado 5. Que número pensei? (12 − 5)', answer:'7', hint:'Para desfazer +5, fazes −5.' }
    ], exp:'Trás-para-frente: 4 → ×3 = 12 → −5 = 7.' },
    { id:'3dt_cha4', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre', diff:2, q:'🔍 O maior número par', digits:2, solution:'90', story:'Sou par. Tenho dois algarismos. Os meus algarismos somam 9.', clues:['Sou o MAIOR número que cumpre tudo. Quem sou?'], hint:'Para ser o maior, o algarismo das dezenas tem de ser o maior possível.', exp:'9 + 0 = 9, é par, é o maior → 90.' },
    { id:'3dt_cha5', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:2, q:'🧠 Galinhas e vacas', story:'Numa quinta há 12 animais (galinhas + vacas). Ao todo têm 32 patas. Quantas vacas? Vamos por partes.', steps:[
        { prompt:'Passo 1: imagina que SÓ HOUVESSE galinhas (2 patas cada). 12 galinhas têm quantas patas?', answer:'24', hint:'12 × 2 patas.' },
        { prompt:'Passo 2: o problema diz 32 patas. Quantas patas FALTAM em relação ao que calculaste?', answer:'8', hint:'32 − 24.' },
        { prompt:'Passo 3: cada vaca dá 2 patas a mais que galinha. 8 patas extra dão quantas vacas?', answer:'4', hint:'8 ÷ 2.' }
    ], exp:'Hipótese todas galinhas (24 patas) → faltam 8 → 8÷2 = 4 vacas.' },
    { id:'3dt_cha6', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre', diff:3, q:'🔍 Partilhar amêndoas', digits:1, solution:'6', story:'Três irmãos partilham 24 amêndoas. O mais velho leva o DOBRO de cada um dos outros.', clues:['Quantas leva CADA UM dos mais novos?'], hint:'Se cada novo leva x, o velho leva 2x. x + x + 2x = 4x.', exp:'4x = 24 → x = 6.' },
    { id:'3dt_cha7', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre', diff:2, q:'🔍 Um número escondido', digits:2, solution:'13', story:'Sou um número entre 10 e 20.', clues:['Dividido por 3 sobra 1.','Dividido por 4 sobra 1.'], hint:'Os múltiplos de 12 mais 1 cabem nesta gama.', exp:'13 ÷ 3 = 4 r 1; 13 ÷ 4 = 3 r 1.' },
    { id:'3dt_cha8', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:3, q:'🧠 Idade da mãe', story:'O Tomás tem 8 anos. A irmã tem MAIS 4 anos que o Tomás. A mãe tem 3 vezes a idade da irmã.', steps:[
        { prompt:'Passo 1: a irmã tem 4 anos mais que o Tomás (que tem 8). Que idade tem a irmã?', answer:'12', hint:'8 + 4.' },
        { prompt:'Passo 2: a mãe tem 3 vezes a idade da irmã (12). Que idade tem a mãe?', answer:'36', hint:'12 × 3 ou 12 + 12 + 12.' }
    ], exp:'Irmã: 12. Mãe: 12 × 3 = 36.' },
    { id:'3dt_cha9', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:2, q:'🧠 Livros que ficam', story:'Uma estante tem 4 prateleiras com 7 livros cada. Levas 3 livros emprestados.', steps:[
        { prompt:'Passo 1: 4 prateleiras × 7 livros cada. Total de livros na estante?', answer:'28', hint:'Tabuada do 7: 7+7+7+7.' },
        { prompt:'Passo 2: tiras 3 livros. Quantos ficam?', answer:'25', hint:'28 − 3.' }
    ], exp:'4×7 = 28; 28−3 = 25.' },
    { id:'3dt_cha10', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:3, q:'🧠 Moedas do troco', story:'Comprei um livro por 8€ e dei uma nota de 20€. Recebi o troco em moedas de 2€.', steps:[
        { prompt:'Passo 1: 20€ − 8€. Quanto é o troco?', answer:'12', hint:'Conta para trás de 20 até 8 (ou 20 − 8).' },
        { prompt:'Passo 2: 12€ dividido por moedas de 2€. Quantas moedas?', answer:'6', hint:'12 ÷ 2 (ou tabuada do 2 até chegar a 12).' }
    ], exp:'Troco 12€ ÷ 2€ = 6 moedas.' },

    // ── HISTÓRIAS-MISTÉRIO → Suspeitos / Cofre ───────────────
    { id:'3dt_mis1', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:1, q:'🕵️ O bolo desapareceu!', story:'Alguém comeu o bolo da cozinha! Lê as pistas e descobre quem foi. Risca (❌) os inocentes e marca (✅) o culpado.', suspects:[{id:'ana',emoji:'👧',name:'Ana'},{id:'bruno',emoji:'👦',name:'Bruno'},{id:'clara',emoji:'👧🏽',name:'Clara'}], clues:['A Ana esteve toda a tarde na biblioteca — nunca foi à cozinha.','O Bruno é alérgico a chocolate: nunca come bolos de chocolate.','Sobra um suspeito... quem terá sido?'], solution:'clara', exp:'A Ana não foi à cozinha e o Bruno não come chocolate. Só sobra a Clara!' },
    { id:'3dt_mis15', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:1, q:'🕵️ Quem molhou o tapete?', story:'O tapete da sala apareceu molhado! Risca (❌) os inocentes e marca (✅) o culpado.', suspects:[{id:'max',emoji:'🐕',name:'Max, o cão'},{id:'kiki',emoji:'🐈',name:'Kiki, a gata'},{id:'bubbles',emoji:'🐟',name:'Bubbles, o peixe'}], clues:['O Max esteve todo o dia no quintal.','A Kiki odeia água — nunca se molha.','Quem vive dentro de água e pode ter salpicado para fora?'], solution:'bubbles', exp:'O Max estava lá fora e a Kiki foge da água. Foi o Bubbles a salpicar do aquário!' },
    { id:'3dt_mis16', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:1, q:'🕵️ A bolacha desaparecida', story:'A última bolacha desapareceu do prato! Lê as pistas e descobre o culpado.', suspects:[{id:'tome',emoji:'👶',name:'Bebé Tomé'},{id:'avo',emoji:'👵',name:'Avó'},{id:'rio',emoji:'🦜',name:'Rio, o papagaio'}], clues:['O bebé Tomé ainda não tem dentes para bolachas duras.','A avó estava a dormir a sesta.','Encontraram migalhas… dentro da gaiola!'], solution:'rio', exp:'O bebé não consegue trincar e a avó dormia — as migalhas na gaiola denunciam o papagaio Rio!' },
    { id:'3dt_mis2', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:2, q:'🕵️ Lápis roubados', story:'Foram roubados 3 lápis. Antes: Pedro 2, Sofia 3, Rui 4. Depois: Pedro 2, Sofia 6, Rui 4.', suspects:[{id:'pedro',emoji:'👦',name:'Pedro'},{id:'sofia',emoji:'👧',name:'Sofia'},{id:'rui',emoji:'🧒',name:'Rui'}], clues:['Só um dos suspeitos ganhou lápis novos.','Foram 3 lápis roubados.'], solution:'sofia', exp:'A Sofia passou de 3 para 6 (mais 3 — exactamente os roubados).' },
    { id:'3dt_mis3', s:'detetive', t:'Histórias-mistério', type:'game', game:'cofre', diff:2, q:'🕵️ Senha do cofre', digits:4, solution:'4842', story:'A senha do cofre tem 4 algarismos.', clues:['O 1.º é METADE do 2.º.','O 2.º é 8.','O 3.º é o DOBRO do 4.º.','O 4.º é 2.'], hint:'Resolve em ordem: 2.º (pista), depois 1.º, depois 4.º, depois 3.º.', exp:'4 (=8÷2), 8, 4 (=2×2), 2 → 4842.' },
    { id:'3dt_mis4', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:2, q:'🕵️ Quem está em primeiro?', story:'Três meninas em fila para a cantina. Quem está em primeiro lugar?', suspects:[{id:'ana',emoji:'👧',name:'Ana'},{id:'bia',emoji:'👧🏽',name:'Bia'},{id:'carla',emoji:'👩',name:'Carla'}], clues:['A Carla NÃO está no meio.','A Ana NÃO é a primeira.'], solution:'carla', exp:'A Ana não é a primeira. A Carla não está no meio → ou é primeira ou última. Se fosse última, a Bia estaria no meio e a Ana em primeiro (impossível). Logo a Carla é a primeira.' },
    { id:'3dt_mis5', s:'detetive', t:'Histórias-mistério', type:'game', game:'cofre', diff:2, q:'🕵️ Bolas tiradas', digits:1, solution:'3', story:'Numa caixa havia 3 bolas vermelhas e 2 azuis. Tiraste 3 bolas. Ficaram só bolas azuis na caixa.', clues:['Quantas bolas VERMELHAS tiraste?'], hint:'Se só ficaram azuis, todas as vermelhas foram tiradas.', exp:'Tiraste todas as 3 vermelhas (as 2 azuis ficaram).' },
    { id:'3dt_mis6', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:3, q:'🕵️ Roubo na loja', story:'Houve um roubo às 14h50. Quem estava lá dentro?', suspects:[{id:'sara',emoji:'👩',name:'Sara'},{id:'diogo',emoji:'👨',name:'Diogo'},{id:'joana',emoji:'👩‍🦰',name:'Joana'}], clues:['Sara: entrou 14h, saiu 14h30.','Diogo: entrou 14h45, saiu 15h15.','Joana: entrou 15h, saiu 15h20.'], solution:'diogo', exp:'Às 14h50 só o Diogo estava lá dentro (14h45 a 15h15).' },
    { id:'3dt_mis7', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:3, q:'🕵️ Onde está o bombom?', story:'3 caixas: VERMELHA, VERDE, AZUL. Uma tem o bombom. UMA fala verdade, DUAS mentem.', suspects:[{id:'vermelha',emoji:'🟥',name:'Vermelha'},{id:'verde',emoji:'🟩',name:'Verde'},{id:'azul',emoji:'🟦',name:'Azul'}], clues:['Vermelha diz: "O bombom está em mim."','Verde diz: "O bombom NÃO está na Azul."'], solution:'azul', exp:'Se vermelha dissesse a verdade, verde também → impossível. Vermelha mente: bombom NÃO está nela. Verde também mente: bombom ESTÁ na azul.' },
    { id:'3dt_mis8', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:2, q:'🕵️ Por onde entrou o cão?', story:'O cão Tobias saltou para a mesa com lama nas patas. Por onde entrou?', suspects:[{id:'cozinha',emoji:'🍳',name:'Cozinha'},{id:'entrada',emoji:'🚪',name:'Entrada'},{id:'janela',emoji:'🪟',name:'Janela'},{id:'sofa',emoji:'🛋️',name:'Sofá'}], clues:['Pegadas com lama na ENTRADA e no SOFÁ.','A cozinha está limpa.'], solution:'entrada', exp:'A pista de lama começa na entrada. Depois passou ao sofá e à mesa.' },
    { id:'3dt_mis9', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:3, q:'🕵️ Quem tem o cão?', story:'Rui, Tiago e Vasco têm cada um 1 animal: cão, gato ou peixe. Quem tem o CÃO?', suspects:[{id:'rui',emoji:'🧒',name:'Rui'},{id:'tiago',emoji:'👦',name:'Tiago'},{id:'vasco',emoji:'👨‍🦱',name:'Vasco'}], clues:['O Rui é alérgico a pêlo.','O Tiago tem um animal que mia.'], solution:'vasco', exp:'Rui: peixe (sem pêlo). Tiago: gato (mia). Vasco: cão.' },
    { id:'3dt_mis10', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:2, q:'🕵️ Onde caiu o relógio?', story:'A Inês perdeu o relógio. Esteve em 3 sítios entre as 8h e as 9h.', suspects:[{id:'jardim',emoji:'🌳',name:'Jardim'},{id:'sala',emoji:'🛋️',name:'Sala'},{id:'cozinha',emoji:'🍳',name:'Cozinha'}], clues:['Esteve por esta ordem: Jardim → Sala → Cozinha.','Quando saiu da Sala já não o tinha.'], solution:'jardim', exp:'Se já não o tinha ao sair da sala, perdeu-o no sítio anterior — o jardim.' },

    // ── PADRÕES E SEQUÊNCIAS → Padrão ────────────────────────
    { id:'3dt_pad1', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:1, q:'🧩 Que número falta?', sequence:[2,4,6,8,'?',12], answer:'10', hint:'Vai de 2 em 2.', exp:'Tabuada do 2: +2 em cada passo.' },
    { id:'3dt_pad2', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:1, q:'🧩 Que número falta?', sequence:[5,10,15,'?',25], answer:'20', hint:'Tabuada do 5.', exp:'+5 em cada passo: 5, 10, 15, 20, 25.' },
    { id:'3dt_pad3', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:2, q:'🧩 Continua a sequência', sequence:[1,3,6,10,15,'?'], answer:'21', hint:'O salto aumenta de 1 em 1: +2, +3, +4, +5...', exp:'Próximo salto +6 → 15 + 6 = 21.' },
    { id:'3dt_pad4', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:2, q:'🧩 Continua (em descida)', sequence:[100,90,81,73,'?'], answer:'66', hint:'O salto diminui: −10, −9, −8...', exp:'Próximo −7 → 73 − 7 = 66.' },
    { id:'3dt_pad5', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:2, q:'🧩 Que cor vem a seguir?', sequence:['🔴','🔵','🔴','🔵','🔴','?'], options:['🔴','🔵','🟢','🟡'], answer:'🔵', hint:'Alterna entre duas cores.', exp:'Padrão vermelho-azul.' },
    { id:'3dt_pad6', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:3, q:'🧩 Continua (a duplicar)', sequence:[1,2,4,8,16,'?'], answer:'32', hint:'Cada número é o dobro do anterior.', exp:'16 × 2 = 32.' },
    { id:'3dt_pad7', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:2, q:'🧩 Que letra vem a seguir?', sequence:['A','C','E','G','?'], options:['H','I','J','K'], answer:'I', hint:'Salta sempre uma letra.', exp:'A, (B), C, (D), E, (F), G, (H), I.' },
    { id:'3dt_pad8', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:2, q:'🧩 Contar de 6 em 6', sequence:[6,12,18,'?',30], answer:'24', hint:'Tabuada do 6: soma 6 de cada vez.', exp:'+6 → 18 + 6 = 24.' },

    // ── ESTIMAR E APROXIMAR → Estimador (slider) ─────────────
    { id:'3dt_est1', s:'mat_plus', t:'Estimar e aproximar', type:'game', game:'estimador', diff:1, q:'🌡️ Quanto tempo?', story:'Quantos minutos demora a escovar BEM os dentes?', min:0, max:10, answer:2, tolerance:1, unit:'min', hint:'Não é tão pouco como 30 segundos, nem uma eternidade.', exp:'O ideal são cerca de 2 minutos.' },
    { id:'3dt_est2', s:'mat_plus', t:'Estimar e aproximar', type:'game', game:'estimador', diff:1, q:'🌡️ Lugares no autocarro', story:'Quantas pessoas cabem num autocarro escolar normal?', min:0, max:120, step:5, answer:50, tolerance:10, unit:'pessoas', hint:'Não é tão pequeno como um carro, nem tão grande como um avião.', exp:'Um autocarro escolar tem cerca de 50 lugares.' },
    { id:'3dt_est3', s:'mat_plus', t:'Estimar e aproximar', type:'game', game:'estimador', diff:2, q:'🌡️ Arredonda à dezena', story:'Qual é o número 47 arredondado à dezena mais próxima?', min:30, max:70, step:1, answer:50, tolerance:2, unit:'', hint:'47 está mais perto de 50 ou de 40?', exp:'47 está mais perto de 50 (diferença 3 vs 7).' },
    { id:'3dt_est4', s:'mat_plus', t:'Estimar e aproximar', type:'game', game:'estimador', diff:2, q:'🌡️ Arredonda à centena', story:'Qual é o número 348 arredondado à centena mais próxima?', min:100, max:600, step:25, answer:300, tolerance:25, unit:'', hint:'O número que termina em 0 mais próximo (centena cheia).', exp:'348 está mais perto de 300 do que de 400.' },
    { id:'3dt_est5', s:'mat_plus', t:'Estimar e aproximar', type:'game', game:'estimador', diff:2, q:'🌡️ Estima a soma', story:'Sem calcular ao certo: 198 + 203 dá MAIS OU MENOS quanto?', min:100, max:700, step:25, answer:400, tolerance:30, unit:'', hint:'~200 + ~200.', exp:'201 está perto de 200, somando dois quase-200 → ~400.' },
    { id:'3dt_est6', s:'mat_plus', t:'Estimar e aproximar', type:'game', game:'estimador', diff:3, q:'🌡️ Dias de leitura', story:'Um livro tem 198 páginas. Lês 19 páginas por dia. Mais ou menos quantos dias precisas?', min:1, max:30, answer:10, tolerance:2, unit:'dias', hint:'~200 ÷ ~20.', exp:'200 ÷ 20 = 10 dias.' },
    { id:'3dt_est7', s:'mat_plus', t:'Estimar e aproximar', type:'game', game:'estimador', diff:3, q:'🌡️ Passos até à sala', story:'Quantos passos dás mais ou menos para ir do portão da escola até à tua sala?', min:5, max:200, step:5, answer:50, tolerance:15, unit:'passos', hint:'Algumas dezenas de passos — não 5 (curto), não 500 (longo).', exp:'Tipicamente entre 30 e 70 passos.' },

    // ── SUDOKU 4×4 (10) + Kakuro Cofre (2) ───────────────────
    { id:'3dt_sud1', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:1, q:'🔢 Sudoku 4×4 · fácil', puzzle:{ initial:[1,2,3,0, 3,0,1,2, 2,1,0,3, 0,3,2,1], solution:[1,2,3,4, 3,4,1,2, 2,1,4,3, 4,3,2,1] }, hint:'Toca numa célula vazia e escolhe o número. Cada linha, coluna e bloco 2×2 tem de ter 1, 2, 3 e 4.', exp:'Solução: 1234 / 3412 / 2143 / 4321.' },
    { id:'3dt_sud2', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:1, q:'🔢 Sudoku 4×4 · fácil', puzzle:{ initial:[0,0,3,4, 3,0,0,2, 2,1,4,0, 4,0,2,1], solution:[1,2,3,4, 3,4,1,2, 2,1,4,3, 4,3,2,1] }, hint:'Começa pelas linhas que já têm 3 números — só falta o quarto.', exp:'Solução: 1234 / 3412 / 2143 / 4321.' },
    { id:'3dt_sud3', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:1, q:'🔢 Sudoku 4×4 · fácil', puzzle:{ initial:[3,4,2,1, 0,0,4,0, 4,3,0,2, 0,1,0,4], solution:[3,4,2,1, 1,2,4,3, 4,3,1,2, 2,1,3,4] }, hint:'A primeira linha já está cheia — usa-a como apoio.', exp:'Solução: 3421 / 1243 / 4312 / 2134.' },
    { id:'3dt_sud4', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[1,2,0,4, 0,4,1,0, 0,1,4,0, 4,0,0,1], solution:[1,2,3,4, 3,4,1,2, 2,1,4,3, 4,3,2,1] }, hint:'Olha para os 1 e 4 já colocados — onde NÃO podem aparecer outros?', exp:'Solução: 1234 / 3412 / 2143 / 4321.' },
    { id:'3dt_sud5', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[4,0,1,0, 0,3,0,2, 3,0,2,0, 0,4,0,1], solution:[4,2,1,3, 1,3,4,2, 3,1,2,4, 2,4,3,1] }, hint:'Procura a linha (ou coluna) com 3 números — só falta o quarto.', exp:'Solução: 4213 / 1342 / 3124 / 2431.' },
    { id:'3dt_sud6', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[0,0,3,4, 0,4,0,2, 2,0,0,3, 4,3,0,0], solution:[1,2,3,4, 3,4,1,2, 2,1,4,3, 4,3,2,1] }, hint:'Procura células com poucas hipóteses (1 ou 2 valores possíveis).', exp:'Solução: 1234 / 3412 / 2143 / 4321.' },
    { id:'3dt_sud7', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[3,4,0,0, 0,2,0,3, 4,0,1,2, 0,0,0,4], solution:[3,4,2,1, 1,2,4,3, 4,3,1,2, 2,1,3,4] }, hint:'O bloco superior-esquerdo já tem 3, 4, 2 — falta o 1.', exp:'Solução: 3421 / 1243 / 4312 / 2134.' },
    { id:'3dt_sud8', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[0,3,2,0, 0,0,1,0, 3,1,4,0, 4,2,0,1], solution:[1,3,2,4, 2,4,1,3, 3,1,4,2, 4,2,3,1] }, hint:'A última linha tem 4,2,_,1 — qual número falta?', exp:'Solução: 1324 / 2413 / 3142 / 4231.' },
    { id:'3dt_sud9', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:3, q:'🔢 Sudoku 4×4 · difícil', puzzle:{ initial:[2,0,0,3, 0,3,0,1, 1,0,3,0, 0,4,0,2], solution:[2,1,4,3, 4,3,2,1, 1,2,3,4, 3,4,1,2] }, hint:'Só 7 pistas — vai linha por linha, com calma.', exp:'Solução: 2143 / 4321 / 1234 / 3412.' },
    { id:'3dt_sud10', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:3, q:'🔢 Sudoku 4×4 · difícil', puzzle:{ initial:[1,0,2,0, 0,0,1,3, 0,0,0,0, 4,2,3,0], solution:[1,3,2,4, 2,4,1,3, 3,1,4,2, 4,2,3,1] }, hint:'Começa pelo "1" que tens na coluna 1 — onde podem ir os outros 1?', exp:'Solução: 1324 / 2413 / 3142 / 4231.' },
    { id:'3dt_sud11', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:1, q:'🔢 Sudoku 4×4 · fácil', puzzle:{ initial:[3,1,4,0, 0,0,1,3, 1,0,0,0, 4,3,2,1], solution:[3,1,4,2, 2,4,1,3, 1,2,3,4, 4,3,2,1] }, hint:'A última linha já está cheia — aproveita.', exp:'Solução: 3142 / 2413 / 1234 / 4321.' },
    { id:'3dt_sud12', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:3, q:'🔢 Sudoku 4×4 · difícil', puzzle:{ initial:[3,1,0,2, 2,0,0,0, 1,0,3,0, 4,0,0,0], solution:[3,1,4,2, 2,4,1,3, 1,2,3,4, 4,3,2,1] }, hint:'Só 7 pistas. Procura uma célula em que só caiba um número.', exp:'Solução: 3142 / 2413 / 1234 / 4321.' },
    { id:'3dt_sud13', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[1,0,0,0, 3,2,1,0, 2,0,0,3, 4,0,2,1], solution:[1,4,3,2, 3,2,1,4, 2,1,4,3, 4,3,2,1] }, hint:'A linha 2 tem 3, 2, 1 — só falta uma!', exp:'Solução: 1432 / 3214 / 2143 / 4321.' },
    { id:'3dt_sud14', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[0,0,0,0, 1,2,0,3, 2,1,0,4, 0,4,0,1], solution:[4,3,1,2, 1,2,4,3, 2,1,3,4, 3,4,2,1] }, hint:'O bloco inferior-direito já tem 3, 4, 1 — falta o 2.', exp:'Solução: 4312 / 1243 / 2134 / 3421.' },
    { id:'3dt_sud15', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[2,0,1,4, 1,4,0,0, 3,1,4,0, 0,0,3,0], solution:[2,3,1,4, 1,4,2,3, 3,1,4,2, 4,2,3,1] }, hint:'A linha 1 e 2 já têm muito — começa por aí.', exp:'Solução: 2314 / 1423 / 3142 / 4231.' },
    { id:'3dt_sud16', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:3, q:'🔢 Sudoku 4×4 · difícil', puzzle:{ initial:[0,0,0,0, 3,0,4,1, 0,3,2,4, 0,4,0,0], solution:[4,1,3,2, 3,2,4,1, 1,3,2,4, 2,4,1,3] }, hint:'7 pistas. Olha para o 4 — onde ainda falta colocar?', exp:'Solução: 4132 / 3241 / 1324 / 2413.' },
    { id:'3dt_sud17', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[2,0,0,4, 3,4,0,0, 1,2,0,3, 0,0,0,2], solution:[2,1,3,4, 3,4,2,1, 1,2,4,3, 4,3,1,2] }, hint:'A primeira coluna tem 2, 3, 1 — só falta uma.', exp:'Solução: 2134 / 3421 / 1243 / 4312.' },
    { id:'3dt_sud18', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[1,0,0,0, 0,2,1,0, 3,0,2,0, 2,4,3,0], solution:[1,3,4,2, 4,2,1,3, 3,1,2,4, 2,4,3,1] }, hint:'A última linha tem 2, 4, 3 — falta uma.', exp:'Solução: 1342 / 4213 / 3124 / 2431.' },
    { id:'3dt_sud_k1', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'cofre', diff:2, q:'🔐 Kakuro fácil', digits:1, solution:'5', story:'Num quadrado mágico 3×3, cada linha soma 15.', clues:['Numa linha tens 4 e 6.','Qual é o terceiro número?'], hint:'15 − 4 − 6.', exp:'15 − 4 − 6 = 5.' },
    { id:'3dt_sud_k2', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'cofre', diff:3, q:'🔐 Kakuro médio', digits:2, solution:'12', story:'Três números diferentes (de 1 a 5) somam um total.', clues:['Os números são 3, 4 e 5.','Quanto somam ao todo?'], hint:'3 + 4 + 5.', exp:'3 + 4 + 5 = 12.' },

    // ── LÓGICA PURA → Suspeitos / Cofre ──────────────────────
    { id:'3dt_log1', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:1, q:'🧠 Quem é a mais baixa?', story:'Três amigos puseram-se em bicos dos pés. Lê as pistas e descobre quem é a MAIS BAIXA.', suspects:[{id:'ana',emoji:'👧',name:'Ana'},{id:'bruno',emoji:'👦',name:'Bruno'},{id:'carla',emoji:'👧🏽',name:'Carla'}], clues:['A Ana é mais alta que o Bruno.','O Bruno é mais alto que a Carla.','Então a Carla é mais baixa que os dois.'], solution:'carla', exp:'Ana mais alta que Bruno, e Bruno mais alto que Carla → a Carla é a mais baixa.' },
    { id:'3dt_log2', s:'detetive', t:'Lógica pura', type:'game', game:'cofre', diff:1, q:'🧠 Patas do Pirilau', digits:1, solution:'4', story:'Todos os cães têm 4 patas. O Pirilau é um cão.', clues:['Quantas patas tem o Pirilau?'], hint:'A regra aplica-se a todos os cães.', exp:'Cão → 4 patas.' },
    { id:'3dt_log3', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Que dia será?', story:'Hoje é quarta-feira. Que dia será DEPOIS DE AMANHÃ?', suspects:[{id:'qui',emoji:'5️⃣',name:'Quinta'},{id:'sex',emoji:'6️⃣',name:'Sexta'},{id:'sab',emoji:'7️⃣',name:'Sábado'},{id:'dom',emoji:'☀️',name:'Domingo'}], clues:['Hoje: quarta.','Amanhã: o dia seguinte.','Depois de amanhã: dois dias à frente.'], solution:'sex', exp:'Quarta → Quinta → Sexta.' },
    { id:'3dt_log4', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Quem nasceu primeiro?', story:'A Maria é mais nova que a Inês. A Inês é mais nova que a Sara.', suspects:[{id:'maria',emoji:'👧',name:'Maria'},{id:'ines',emoji:'👧🏽',name:'Inês'},{id:'sara',emoji:'👩',name:'Sara'}], clues:['Maria < Inês < Sara (em idade).'], solution:'sara', exp:'A mais velha nasceu primeiro → Sara.' },
    { id:'3dt_log5', s:'detetive', t:'Lógica pura', type:'game', game:'cofre', diff:2, q:'🧠 Lápis e borrachas', digits:1, solution:'4', story:'Um lápis custa 1€. Uma borracha custa metade (0,50€).', clues:['Quanto custam 3 lápis e 2 borrachas (em €)?'], hint:'3×1€ + 2×0,50€.', exp:'3€ + 1€ = 4€.' },
    { id:'3dt_log6', s:'detetive', t:'Lógica pura', type:'game', game:'cofre', diff:3, q:'🧠 Maçãs comidas', digits:1, solution:'9', story:'Tinhas 12 maçãs. Comeste 1/4 (um quarto).', clues:['Quantas maçãs sobraram?'], hint:'1/4 de 12 é 3. 12 − 3 = ?', exp:'12 − 3 = 9 maçãs.' },
    { id:'3dt_log7', s:'detetive', t:'Lógica pura', type:'game', game:'cofre_steps', diff:3, q:'🧠 Olhos na sala', story:'Numa sala há 4 cães e 3 gatos. Cada um tem uma coleira e uma medalha.', steps:[
        { prompt:'Passo 1: Quantos animais há ao todo? (cães + gatos)', answer:'7', hint:'4 + 3.' },
        { prompt:'Passo 2: Cada animal tem 2 olhos. Quantos olhos no total? (As coleiras não têm olhos!)', answer:'14', hint:'7 × 2 ou 7 + 7.' }
    ], exp:'7 animais × 2 olhos = 14.' },
    { id:'3dt_log8', s:'detetive', t:'Lógica pura', type:'game', game:'cofre', diff:3, q:'🧠 Caracol no poço', digits:1, solution:'8', story:'Um caracol está no fundo de um poço de 10 m. De dia sobe 3 m, de noite escorrega 2 m.', clues:['Em quantos dias chega ao topo?'], hint:'Sobe 1m por dia... MAS no dia em que chega ao topo já não escorrega.', exp:'Dia 7 fica a 7 m. Dia 8 sobe 3 m → 10 m. Sai! 8 dias.' },

    // ── FASE 3: novos puzzles interativos (v519) ─────────────
    // Charadas em passos (cofre_steps) — discalculia: cada operação validada à parte.
    { id:'3dt_cha11', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:2, q:'🧠 Lanche da turma', story:'A professora compra 5 pacotes de bolachas com 6 bolachas cada, para 30 alunos.', steps:[
        { prompt:'Passo 1: 5 pacotes × 6 bolachas. Quantas bolachas ao todo?', answer:'30', hint:'Tabuada do 6: 6+6+6+6+6.' },
        { prompt:'Passo 2: 30 bolachas para 30 alunos. Quantas para cada um?', answer:'1', hint:'30 ÷ 30.' }
    ], exp:'5×6 = 30 bolachas ÷ 30 alunos = 1 cada.' },
    { id:'3dt_cha12', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:3, q:'🧠 Poupança da Eduarda', story:'A Eduarda poupa 3€ por semana. Já tinha 5€ no mealheiro.', steps:[
        { prompt:'Passo 1: em 4 semanas, quanto poupa? (3€ × 4)', answer:'12', hint:'Tabuada do 3 ou 3+3+3+3.' },
        { prompt:'Passo 2: junta ao que já tinha (5€). Quanto tem agora?', answer:'17', hint:'12 + 5.' }
    ], exp:'3×4 = 12€ poupados + 5€ = 17€.' },
    // Padrões novos
    { id:'3dt_pad9', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:2, q:'🧩 Continua a contar de 25 em 25', sequence:[25,50,75,'?',125], answer:'100', hint:'Soma 25 ao número anterior — como juntar moedas de 25 cêntimos.', exp:'+25 de cada vez: 75 + 25 = 100.' },
    { id:'3dt_pad10', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:2, q:'🧩 Contar de 4 em 4', sequence:[4,8,12,16,'?'], answer:'20', hint:'Tabuada do 4: soma 4 de cada vez.', exp:'+4 → 16 + 4 = 20.' },
    // Estimadores novos
    { id:'3dt_est8', s:'mat_plus', t:'Estimar e aproximar', type:'game', game:'estimador', diff:2, q:'🌡️ Quantos alunos na escola?', story:'A tua escola tem 10 turmas com mais ou menos 20 alunos cada. Quantos alunos terá ao todo?', min:0, max:400, step:20, answer:200, tolerance:40, unit:'alunos', hint:'10 × 20 — multiplicar por 10 é juntar um zero.', exp:'10 × 20 = 200 alunos (aproximadamente).' },
    { id:'3dt_est9', s:'mat_plus', t:'Estimar e aproximar', type:'game', game:'estimador', diff:3, q:'🌡️ Arredonda à centena', story:'Qual é o número 470 arredondado à centena mais próxima?', min:300, max:700, step:50, answer:500, tolerance:25, unit:'', hint:'Está mais perto de 400 ou de 500?', exp:'470 está mais perto de 500 (faltam 30) do que de 400.' },

    // ── FASE 3 (v520): mais puzzles interativos ──────────────
    { id:'3dt_cha13', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:2, q:'🧠 Caixas de ovos', story:'Uma dúzia tem 12 ovos. Compraste 3 dúzias.', steps:[
        { prompt:'Passo 1: 3 dúzias × 12 ovos. Quantos ovos ao todo?', answer:'36', hint:'12 + 12 + 12.' },
        { prompt:'Passo 2: partiram-se 4 ovos. Quantos ficam bons?', answer:'32', hint:'36 − 4.' }
    ], exp:'3×12 = 36 ovos; 36 − 4 = 32 bons.' },
    { id:'3dt_cha14', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:3, q:'🧠 Bilhetes de cinema', story:'4 amigos vão ao cinema. Cada bilhete custa 5€. Pagam com uma nota de 50€.', steps:[
        { prompt:'Passo 1: 4 bilhetes × 5€. Quanto custam ao todo?', answer:'20', hint:'Tabuada do 5: 5×4.' },
        { prompt:'Passo 2: pagaram com 50€. Quanto é o troco?', answer:'30', hint:'50 − 20.' }
    ], exp:'4×5 = 20€; troco 50 − 20 = 30€.' },
    { id:'3dt_mis11', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:2, q:'🕵️ Quem partiu o vaso?', story:'O vaso da sala partiu-se! Lê as pistas e descobre o culpado.', suspects:[{id:'gato',emoji:'🐈',name:'Gato'},{id:'cao',emoji:'🐕',name:'Cão'},{id:'vento',emoji:'🌬️',name:'Vento'}], clues:['O cão esteve a tarde toda preso no quintal.','A janela estava fechada — não entrou vento.','Sobra alguém ágil, que salta para os móveis...'], solution:'gato', exp:'Cão preso lá fora e janela fechada (sem vento) → só pode ter sido o gato.' },
    { id:'3dt_pad11', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:2, q:'🧩 Que número falta?', sequence:[2,5,8,11,'?',17], answer:'14', hint:'Soma sempre 3.', exp:'+3 de cada vez: 11 + 3 = 14.' },
    { id:'3dt_est10', s:'mat_plus', t:'Estimar e aproximar', type:'game', game:'estimador', diff:2, q:'🌡️ Páginas de um livro infantil', story:'Mais ou menos quantas páginas tem um livro de histórias para crianças?', min:0, max:200, step:10, answer:40, tolerance:20, unit:'páginas', hint:'Não é um folheto (5) nem uma enciclopédia (500).', exp:'Tipicamente 30 a 50 páginas.' },
    { id:'3dt_qt9', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:3, q:'🧠 Quantos pontos?', dots:12, prompt:'Um ten-frame cheio (10) + 2. Quantos?' },

    // ── FASE 3 (v521): mais puzzles interativos ──────────────
    { id:'3dt_sud19', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[3,0,4,0, 4,1,0,0, 0,3,0,0, 1,4,0,3], solution:[3,2,4,1, 4,1,3,2, 2,3,1,4, 1,4,2,3] }, hint:'Começa pela 1.ª coluna (3,4,_,1) — falta um número.', exp:'Solução: 3241 / 4132 / 2314 / 1423.' },
    { id:'3dt_sud20', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:1, q:'🔢 Sudoku 4×4 · fácil', puzzle:{ initial:[0,1,0,3,4,3,2,0,1,4,0,2,0,0,1,0], solution:[2,1,4,3,4,3,2,1,1,4,3,2,3,2,1,4] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 2143 / 4321 / 1432 / 3214.' },
    { id:'3dt_sud21', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:1, q:'🔢 Sudoku 4×4 · fácil', puzzle:{ initial:[2,3,4,0,1,4,2,0,4,1,0,2,0,0,0,0], solution:[2,3,4,1,1,4,2,3,4,1,3,2,3,2,1,4] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 2341 / 1423 / 4132 / 3214.' },
    { id:'3dt_sud22', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:1, q:'🔢 Sudoku 4×4 · fácil', puzzle:{ initial:[3,0,0,4,0,0,0,0,1,3,4,0,4,2,3,1], solution:[3,1,2,4,2,4,1,3,1,3,4,2,4,2,3,1] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 3124 / 2413 / 1342 / 4231.' },
    { id:'3dt_sud23', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:1, q:'🔢 Sudoku 4×4 · fácil', puzzle:{ initial:[4,0,0,0,0,0,2,4,0,0,1,2,2,1,4,3], solution:[4,2,3,1,1,3,2,4,3,4,1,2,2,1,4,3] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 4231 / 1324 / 3412 / 2143.' },
    { id:'3dt_sud24', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:1, q:'🔢 Sudoku 4×4 · fácil', puzzle:{ initial:[2,0,0,0,4,3,1,2,3,2,4,1,0,0,0,0], solution:[2,1,3,4,4,3,1,2,3,2,4,1,1,4,2,3] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 2134 / 4312 / 3241 / 1423.' },
    { id:'3dt_sud25', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:1, q:'🔢 Sudoku 4×4 · fácil', puzzle:{ initial:[0,1,0,3,2,3,0,0,3,0,4,1,1,0,3,0], solution:[4,1,2,3,2,3,1,4,3,2,4,1,1,4,3,2] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 4123 / 2314 / 3241 / 1432.' },
    { id:'3dt_sud26', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[0,3,0,0,4,1,0,0,1,0,4,0,0,4,0,1], solution:[2,3,1,4,4,1,3,2,1,2,4,3,3,4,2,1] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 2314 / 4132 / 1243 / 3421.' },
    { id:'3dt_sud27', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[4,0,0,0,0,0,4,0,3,4,0,2,0,1,0,4], solution:[4,3,2,1,1,2,4,3,3,4,1,2,2,1,3,4] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 4321 / 1243 / 3412 / 2134.' },
    { id:'3dt_sud28', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[0,2,3,0,3,0,1,2,0,3,0,0,4,0,0,0], solution:[1,2,3,4,3,4,1,2,2,3,4,1,4,1,2,3] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 1234 / 3412 / 2341 / 4123.' },
    { id:'3dt_sud29', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[0,0,1,0,2,1,3,0,4,0,0,1,0,2,0,0], solution:[3,4,1,2,2,1,3,4,4,3,2,1,1,2,4,3] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 3412 / 2134 / 4321 / 1243.' },
    { id:'3dt_sud30', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:2, q:'🔢 Sudoku 4×4 · médio', puzzle:{ initial:[2,4,1,0,0,0,0,0,3,1,2,0,0,0,3,0], solution:[2,4,1,3,1,3,4,2,3,1,2,4,4,2,3,1] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 2413 / 1342 / 3124 / 4231.' },
    { id:'3dt_sud31', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:3, q:'🔢 Sudoku 4×4 · difícil', puzzle:{ initial:[0,0,1,0,0,0,3,4,0,4,0,0,0,1,0,0], solution:[4,3,1,2,1,2,3,4,3,4,2,1,2,1,4,3] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 4312 / 1234 / 3421 / 2143.' },
    { id:'3dt_sud32', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:3, q:'🔢 Sudoku 4×4 · difícil', puzzle:{ initial:[0,4,0,0,0,1,4,0,0,0,0,0,0,3,0,2], solution:[3,4,2,1,2,1,4,3,1,2,3,4,4,3,1,2] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 3421 / 2143 / 1234 / 4312.' },
    { id:'3dt_sud33', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:3, q:'🔢 Sudoku 4×4 · difícil', puzzle:{ initial:[0,0,0,0,0,2,0,0,0,3,0,1,0,1,0,4], solution:[3,4,1,2,1,2,4,3,4,3,2,1,2,1,3,4] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 3412 / 1243 / 4321 / 2134.' },
    { id:'3dt_sud34', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'sudoku4', diff:3, q:'🔢 Sudoku 4×4 · difícil', puzzle:{ initial:[0,0,0,3,1,0,0,0,2,1,3,0,0,0,0,0], solution:[4,2,1,3,1,3,4,2,2,1,3,4,3,4,2,1] }, hint:'Cada linha, coluna e bloco 2×2 tem 1, 2, 3 e 4 — sem repetir.', exp:'Solução: 4213 / 1342 / 2134 / 3421.' },
    { id:'3dt_cha15', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:2, q:'🧠 Cromos em cadernetas', story:'Tens 3 cadernetas com 8 cromos cada e ganhas mais 6 cromos.', steps:[
        { prompt:'Passo 1: 3 cadernetas × 8 cromos. Quantos cromos tens?', answer:'24', hint:'Tabuada do 8: 8+8+8.' },
        { prompt:'Passo 2: ganhas mais 6. Com quantos ficas?', answer:'30', hint:'24 + 6.' }
    ], exp:'3×8 = 24; 24 + 6 = 30 cromos.' },
    { id:'3dt_cha16', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:3, q:'🧠 Sumos para a festa', story:'Numa festa há 24 crianças. Cada garrafa de sumo enche 4 copos.', steps:[
        { prompt:'Passo 1: se cada criança bebe 1 copo, quantos copos precisas?', answer:'24', hint:'1 copo × 24 crianças.' },
        { prompt:'Passo 2: cada garrafa dá 4 copos. Quantas garrafas precisas?', answer:'6', hint:'24 ÷ 4.' }
    ], exp:'24 copos ÷ 4 por garrafa = 6 garrafas.' },
    { id:'3dt_mis12', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:3, q:'🕵️ Quem comeu a última bolacha?', story:'A última bolacha do frasco desapareceu! Lê as pistas.', suspects:[{id:'rui',emoji:'🧒',name:'Rui'},{id:'mae',emoji:'👩',name:'Mãe'},{id:'avo',emoji:'👵',name:'Avó'}], clues:['A avó é diabética e não come bolachas com açúcar.','A mãe saiu de casa antes do lanche.','Sobra quem estava em casa e adora bolachas...'], solution:'rui', exp:'Avó não come açúcar, mãe estava fora → foi o Rui.' },
    { id:'3dt_pad12', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:3, q:'🧩 Continua (a descer)', sequence:[40,35,30,'?',20], answer:'25', hint:'Tira 5 de cada vez.', exp:'−5 de cada vez: 30 − 5 = 25.' },
    { id:'3dt_est11', s:'mat_plus', t:'Estimar e aproximar', type:'game', game:'estimador', diff:2, q:'🌡️ Quanto pesa uma mochila cheia?', story:'Mais ou menos quantos quilos pesa uma mochila da escola cheia de livros?', min:0, max:20, step:1, answer:5, tolerance:2, unit:'kg', hint:'Não é tão leve como um lápis nem tão pesado como tu.', exp:'Uma mochila cheia pesa tipicamente uns 4 a 6 kg.' },

    // ── FASE 3 (v522): lote grande ───────
    { id:'3dt_cha17', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:2, q:'🧠 Mesada', story:'Recebes 10€ de mesada. Gastas 4€ num livro e 3€ num gelado.', steps:[
        { prompt:'Passo 1: quanto gastaste ao todo? (4€ + 3€)', answer:'7', hint:'Soma os dois gastos.' },
        { prompt:'Passo 2: de 10€, quanto sobra?', answer:'3', hint:'10 − 7.' }
    ], exp:'Gastaste 4+3 = 7€; sobram 10 − 7 = 3€.' },
    { id:'3dt_cha18', s:'detetive', t:'Charadas matemáticas', type:'game', game:'cofre_steps', diff:3, q:'🧠 Bolos na feira', story:'Fazes 5 caixas com 4 bolos cada. Vendes 12 bolos.', steps:[
        { prompt:'Passo 1: 5 caixas × 4 bolos. Quantos bolos fizeste?', answer:'20', hint:'Tabuada do 4.' },
        { prompt:'Passo 2: vendeste 12. Quantos sobram?', answer:'8', hint:'20 − 12.' }
    ], exp:'5×4 = 20 bolos; 20 − 12 = 8 sobram.' },
    { id:'3dt_mis13', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:2, q:'🕵️ Quem deixou a luz acesa?', story:'A luz do quarto ficou acesa a noite toda. Quem foi o último a sair?', suspects:[{id:'ana',emoji:'👧',name:'Ana'},{id:'tó',emoji:'👦',name:'Tó'},{id:'pai',emoji:'👨',name:'Pai'}], clues:['O pai dormiu fora, em viagem.','A Ana saiu do quarto às 19h, ainda de dia.','Sobra quem ficou no quarto até tarde a jogar.'], solution:'tó', exp:'Pai fora, Ana saiu de dia → foi o Tó (ficou até tarde).' },
    { id:'3dt_mis14', s:'detetive', t:'Histórias-mistério', type:'game', game:'suspeitos', diff:3, q:'🕵️ Quem ganhou a corrida?', story:'Três amigos correram. Lê as pistas e descobre o VENCEDOR.', suspects:[{id:'rui',emoji:'🏃',name:'Rui'},{id:'bea',emoji:'🏃‍♀️',name:'Bea'},{id:'leo',emoji:'🏃‍♂️',name:'Leo'}], clues:['O Leo chegou depois da Bea.','A Bea chegou depois do Rui.','Então quem chegou primeiro?'], solution:'rui', exp:'Rui antes da Bea, e Bea antes do Leo → o Rui ganhou.' },
    { id:'3dt_pad13', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:3, q:'🧩 Continua (a duplicar)', sequence:[3,6,12,24,'?'], answer:'48', hint:'Cada número é o dobro do anterior.', exp:'24 × 2 = 48.' },
    { id:'3dt_pad14', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:2, q:'🧩 Que número falta?', sequence:[100,90,80,'?',60], answer:'70', hint:'Tira 10 de cada vez.', exp:'−10 de cada vez: 80 − 10 = 70.' },
    { id:'3dt_est12', s:'mat_plus', t:'Estimar e aproximar', type:'game', game:'estimador', diff:3, q:'🌡️ Dentes de um adulto', story:'Quantos dentes tem, mais ou menos, a boca de um adulto?', min:0, max:60, step:4, answer:32, tolerance:8, unit:'dentes', hint:'Mais do que os dedos das mãos e pés juntos.', exp:'Um adulto tem cerca de 32 dentes.' },
    { id:'3dt_est13', s:'mat_plus', t:'Estimar e aproximar', type:'game', game:'estimador', diff:1, q:'🌡️ Dias de um mês', story:'Mais ou menos quantos dias tem um mês?', min:0, max:60, step:1, answer:30, tolerance:2, unit:'dias', hint:'Pensa no poema: 30 dias têm setembro, abril, junho e novembro...', exp:'Os meses têm 30 ou 31 dias (fevereiro tem 28 ou 29).' },
    { id:'3dt_qt10', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:3, q:'🧠 Quantos pontos?', dots:15, prompt:'10 + 5. Quantos ao todo?' },
    { id:'3dt_qt11', s:'mat_plus', t:'Quantos vês?', type:'game', game:'quantos', diff:3, q:'🧠 Quantos pontos?', dots:18, prompt:'10 + 8. Quantos?' },
    { id:'3dt_log9', s:'detetive', t:'Lógica pura', type:'game', game:'cofre_steps', diff:2, q:'🧠 Idade do irmão', story:'A Maria tem 9 anos. O irmão tem o TRIPLO da idade dela.', steps:[
        { prompt:'Que idade tem o irmão? (9 × 3)', answer:'27', hint:'Triplo = 3 vezes: 9 + 9 + 9.' }
    ], exp:'Triplo de 9 = 9 × 3 = 27 anos.' },
    { id:'3dt_log10', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Quem é o mais velho?', story:'Lê as pistas e descobre quem é o MAIS VELHO dos três.', suspects:[{id:'avo',emoji:'👴',name:'Avô'},{id:'pai',emoji:'👨',name:'Pai'},{id:'neto',emoji:'🧒',name:'Neto'}], clues:['O pai é mais novo que o avô.','O neto é mais novo que o pai.','Então quem nasceu primeiro?'], solution:'avo', exp:'Avô mais velho que o pai, e pai mais velho que o neto → o avô é o mais velho.' },

    // ── CRUZA-NÚMEROS (cross-sums) — v526 — discalculia ──────
    { id:'3dt_cz1', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'cruzados', diff:1, q:'🧩 Cruza-números (fácil)', grid:[
        ["8","+","_:4","=","12"],
        ["+","","","",""],
        ["_:2","","","",""],
        ["=","","","",""],
        ["10","","","",""]
    ], bankExtra:[3,6], exp:'→ 8 + 4 = 12; ↓ 8 + 2 = 10.' },
    { id:'3dt_cz2', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'cruzados', diff:2, q:'🧩 Cruza-números (×/−)', grid:[
        ["9","×","_:2","=","18"],
        ["-","","","",""],
        ["_:5","","","",""],
        ["=","","","",""],
        ["4","","","",""]
    ], bankExtra:[3,4], exp:'→ 9 × 2 = 18; ↓ 9 − 5 = 4.' },
    { id:'3dt_cz3', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'cruzados', diff:2, q:'🧩 Cruza-números (cruzado)', grid:[
        ["5","+","_:6","=","11"],
        ["","","+","",""],
        ["","","_:3","",""],
        ["","","=","",""],
        ["","","9","",""]
    ], bankExtra:[4,9], exp:'→ 5 + 6 = 11; ↓ 6 + 3 = 9 (o 6 é partilhado).' },
    { id:'3dt_cz4', s:'detetive', t:'Sudoku & Kakuro', type:'game', game:'cruzados', diff:3, q:'🧩 Cruza-números (÷/−)', grid:[
        ["12","÷","_:3","=","4"],
        ["-","","","",""],
        ["_:5","","","",""],
        ["=","","","",""],
        ["7","","","",""]
    ], bankExtra:[2,6], exp:'→ 12 ÷ 3 = 4; ↓ 12 − 5 = 7.' },

    // ── RACIOCÍNIO LÓGICO — tipos novos (v528) ───────────────
    // Intruso / odd-one-out (classificação) — engine suspeitos
    { id:'3dt_log11', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:1, q:'🧠 Qual NÃO pertence?', story:'Três destes são animais. Descobre o INTRUSO (o que não é animal).', suspects:[{id:'cao',emoji:'🐕',name:'Cão'},{id:'gato',emoji:'🐈',name:'Gato'},{id:'mesa',emoji:'🪑',name:'Mesa'},{id:'peixe',emoji:'🐟',name:'Peixe'}], clues:['Cão, gato e peixe são animais (vivos).','A mesa é um móvel, não está viva.'], solution:'mesa', exp:'Cão, gato e peixe são animais; a mesa não é — é o intruso.' },
    { id:'3dt_log12', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Qual NÃO voa?', story:'Três destes conseguem voar. Qual é o intruso?', suspects:[{id:'passaro',emoji:'🐦',name:'Pássaro'},{id:'aviao',emoji:'✈️',name:'Avião'},{id:'borboleta',emoji:'🦋',name:'Borboleta'},{id:'carro',emoji:'🚗',name:'Carro'}], clues:['Pássaro, avião e borboleta voam.','O carro anda no chão, não voa.'], solution:'carro', exp:'O carro é o único que não voa.' },
    { id:'3dt_log13', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Qual NÃO é fruta?', story:'Encontra o intruso: três são frutas, um não.', suspects:[{id:'maca',emoji:'🍎',name:'Maçã'},{id:'banana',emoji:'🍌',name:'Banana'},{id:'cenoura',emoji:'🥕',name:'Cenoura'},{id:'uva',emoji:'🍇',name:'Uva'}], clues:['Maçã, banana e uva são frutas.','A cenoura é um legume (raiz).'], solution:'cenoura', exp:'A cenoura é um legume, não uma fruta → é o intruso.' },
    // Analogias (relações) — engine suspeitos
    { id:'3dt_log14', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Completa: dia → claro; noite → ?', story:'Dia está para CLARO assim como noite está para...?', suspects:[{id:'escuro',emoji:'🌑',name:'escuro'},{id:'frio',emoji:'❄️',name:'frio'},{id:'grande',emoji:'🐘',name:'grande'}], clues:['De dia há luz → claro.','De noite não há luz → ?'], solution:'escuro', exp:'Dia↔claro, noite↔escuro (o oposto).' },
    { id:'3dt_log15', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:3, q:'🧠 Completa: mão → luva; pé → ?', story:'A mão usa LUVA. O que usa o pé?', suspects:[{id:'meia',emoji:'🧦',name:'meia'},{id:'chapeu',emoji:'🎩',name:'chapéu'},{id:'cachecol',emoji:'🧣',name:'cachecol'}], clues:['A luva veste-se na mão.','No pé veste-se...?'], solution:'meia', exp:'Mão↔luva, pé↔meia (peça de roupa de cada parte).' },
    // Condicional / se→então (dedução) — engine suspeitos
    { id:'3dt_log16', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 O que faz o Nemo?', story:'Regra: TODOS os peixes nadam. O Nemo é um peixe.', suspects:[{id:'nada',emoji:'🏊',name:'nada'},{id:'voa',emoji:'🕊️',name:'voa'},{id:'corre',emoji:'🏃',name:'corre'}], clues:['Todos os peixes nadam.','O Nemo é um peixe → faz o quê?'], solution:'nada', exp:'Se todos os peixes nadam e o Nemo é peixe, então o Nemo nada.' },
    // Padrão lógico com formas/tamanho — engine padrao com opções
    { id:'3dt_pad15', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:2, q:'🧩 Que forma vem a seguir?', sequence:['🔺','🟦','🔺','🟦','🔺','?'], options:['🔺','🟦','🔵','⭐'], answer:'🟦', hint:'Alterna triângulo e quadrado.', exp:'Padrão triângulo-quadrado → segue o quadrado 🟦.' },
    { id:'3dt_pad16', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:3, q:'🧩 Que vem a seguir?', sequence:['🌑','🌓','🌕','🌑','🌓','?'], options:['🌑','🌓','🌕','⭐'], answer:'🌕', hint:'Repete de 3 em 3: nova, meia, cheia.', exp:'Ciclo de 3 (🌑🌓🌕) → a seguir vem 🌕.' },
    // ── v529: mais lógica — intrusos subtis, analogias, condicional, dedução ──
    { id:'3dt_log17', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:1, q:'🧠 Qual NÃO é da cozinha?', story:'Três destes usam-se para comer. Descobre o intruso.', suspects:[{id:'colher',emoji:'🥄',name:'Colher'},{id:'garfo',emoji:'🍴',name:'Garfo'},{id:'lapis',emoji:'✏️',name:'Lápis'},{id:'faca',emoji:'🔪',name:'Faca'}], clues:['Colher, garfo e faca usam-se à mesa.','O lápis usa-se para escrever.'], solution:'lapis', exp:'Colher, garfo e faca são talheres; o lápis é material escolar → é o intruso.' },
    { id:'3dt_log18', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Qual NÃO é de inverno?', story:'Três destes vestem-se quando está frio. Qual é o intruso?', suspects:[{id:'gorro',emoji:'🧢',name:'Gorro'},{id:'cachecol',emoji:'🧣',name:'Cachecol'},{id:'chinelos',emoji:'🩴',name:'Chinelos de praia'},{id:'luvas',emoji:'🧤',name:'Luvas'}], clues:['Gorro, cachecol e luvas aquecem no frio.','Os chinelos de praia usam-se no verão.'], solution:'chinelos', exp:'Gorro, cachecol e luvas são de inverno; os chinelos de praia são de verão → intruso.' },
    { id:'3dt_log19', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:3, q:'🧠 Que número NÃO pertence?', story:'2, 4, 7 e 8 — três destes números têm algo em comum. Qual é o intruso?', suspects:[{id:'n2',emoji:'2️⃣',name:'2'},{id:'n4',emoji:'4️⃣',name:'4'},{id:'n7',emoji:'7️⃣',name:'7'},{id:'n8',emoji:'8️⃣',name:'8'}], clues:['2, 4 e 8 podem dividir-se em dois grupos iguais (são pares).','O 7 não dá para dividir em dois grupos iguais.'], solution:'n7', exp:'2, 4 e 8 são pares; o 7 é ímpar → é o intruso.' },
    { id:'3dt_log20', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Completa: pássaro → ninho; cão → ?', story:'O pássaro vive no NINHO. Onde vive o cão?', suspects:[{id:'casota',emoji:'🏠',name:'casota'},{id:'aquario',emoji:'🐠',name:'aquário'},{id:'garagem',emoji:'🚗',name:'garagem'}], clues:['O ninho é a casa do pássaro.','Qual é a casa do cão?'], solution:'casota', exp:'Pássaro↔ninho, cão↔casota (a casa de cada animal).' },
    { id:'3dt_log21', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Completa: olhos → ver; ouvidos → ?', story:'Os olhos servem para VER. Para que servem os ouvidos?', suspects:[{id:'ouvir',emoji:'🎵',name:'ouvir'},{id:'cheirar',emoji:'👃',name:'cheirar'},{id:'saltar',emoji:'🦘',name:'saltar'}], clues:['Cada parte do corpo tem a sua função.','Olhos→ver; ouvidos→...?'], solution:'ouvir', exp:'Olhos↔ver, ouvidos↔ouvir (o sentido de cada órgão).' },
    { id:'3dt_log22', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:3, q:'🧠 Completa: 2 → 4; 3 → ?', story:'O 2 transforma-se em 4. O 3 transforma-se em quê? Descobre a regra secreta!', suspects:[{id:'n6',emoji:'6️⃣',name:'6'},{id:'n5',emoji:'5️⃣',name:'5'},{id:'n9',emoji:'9️⃣',name:'9'}], clues:['4 é o DOBRO de 2 (2+2).','Qual é o dobro de 3?'], solution:'n6', exp:'A regra é «o dobro»: 2→4, logo 3→6 (3+3).' },
    { id:'3dt_log23', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Como está a rua?', story:'Regra: SE chove, a rua fica molhada. Agora está a chover.', suspects:[{id:'molhada',emoji:'💧',name:'molhada'},{id:'seca',emoji:'🏜️',name:'seca'},{id:'quente',emoji:'🔥',name:'quente'}], clues:['Se chove → rua molhada.','Está a chover → então a rua está...?'], solution:'molhada', exp:'A regra diz: chove → rua molhada. Como está a chover, a rua está molhada.' },
    { id:'3dt_log24', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:3, q:'🧠 A Luna pode ser um cão?', story:'Regra: TODOS os cães ladram. A Luna NÃO ladra. Pensa bem: a Luna pode ser um cão?', suspects:[{id:'nao',emoji:'❌',name:'Não pode'},{id:'sim',emoji:'✅',name:'Sim, é um cão'},{id:'talvez',emoji:'🤔',name:'Talvez'}], clues:['TODOS os cães ladram — sem exceção.','A Luna não ladra. Se fosse cão, ladrava...'], solution:'nao', exp:'Se todos os cães ladram e a Luna não ladra, a Luna não pode ser um cão. (Talvez seja uma gata!)' },
    { id:'3dt_log25', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:3, q:'🧠 Qual é o gelado do Rui?', story:'A Ana, o Pedro e o Rui têm 3 gelados: morango, chocolate e limão. Usa as pistas para descobrir o do Rui!', suspects:[{id:'morango',emoji:'🍓',name:'Morango'},{id:'chocolate',emoji:'🍫',name:'Chocolate'},{id:'limao',emoji:'🍋',name:'Limão'}], clues:['A Ana tem o gelado de morango.','O gelado do Pedro NÃO é de limão → é de chocolate.','Sobra um para o Rui...'], solution:'limao', exp:'Ana=morango, Pedro=chocolate (não é limão), logo o Rui fica com o de limão.' },
    { id:'3dt_log26', s:'detetive', t:'Lógica pura', type:'game', game:'suspeitos', pick:true, diff:3, q:'🧠 Quem ganhou a corrida?', story:'A Ana, o Zé e a Bia fizeram uma corrida. Descobre quem chegou em 1.º lugar!', suspects:[{id:'ana',emoji:'👧',name:'Ana'},{id:'ze',emoji:'👦',name:'Zé'},{id:'bia',emoji:'👱‍♀️',name:'Bia'}], clues:['O Zé chegou DEPOIS da Ana → o Zé não ganhou.','A Ana também não ganhou.','Só sobra uma pessoa...'], solution:'bia', exp:'O Zé não ganhou (chegou depois da Ana) e a Ana também não → quem ganhou foi a Bia.' },
    { id:'3dt_pad17', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:2, q:'🧩 O padrão está a crescer! Que vem a seguir?', sequence:['⭐','⭐⭐','⭐⭐⭐','?'], options:['⭐⭐⭐⭐','⭐⭐','⭐','⭐⭐⭐'], answer:'⭐⭐⭐⭐', hint:'De cada vez aparece MAIS uma estrela.', exp:'O padrão cresce +1 de cada vez: 1, 2, 3 → a seguir vêm 4 estrelas.' },
    { id:'3dt_pad18', s:'detetive', t:'Padrões e sequências', type:'game', game:'padrao', diff:3, q:'🧩 A seta está a rodar! Que vem a seguir?', sequence:['⬆️','➡️','⬇️','⬅️','⬆️','➡️','?'], options:['⬇️','⬆️','⬅️','➡️'], answer:'⬇️', hint:'A seta roda sempre no mesmo sentido: cima, direita, baixo, esquerda...', exp:'A seta roda em círculo (⬆️➡️⬇️⬅️) e repete → depois de ➡️ vem ⬇️.' }
];
const EXERCISES_3 = [
    ...EXERCISES_3_OCEANUS.filter(e => e.s === 'portugues' || e.s === 'matematica'),
    ...EXERCISES_3_DETETIVE,

    // ============================ PORTUGUÊS — NOVOS ============================
    // ── Jogos de classificar/intruso (tocar no cartão certo) ──
    { id:'3pg_verbo', s:'portugues', t:'Verbos', type:'game', game:'suspeitos', pick:true, diff:1, q:'🧠 Qual NÃO é um verbo?', story:'Três destes são verbos (ações). Descobre o intruso.', suspects:[{id:'correr',emoji:'🏃',name:'correr'},{id:'saltar',emoji:'🦘',name:'saltar'},{id:'mesa',emoji:'🪑',name:'mesa'},{id:'comer',emoji:'🍽️',name:'comer'}], clues:['Um verbo é uma ação: algo que se FAZ.','«Mesa» é uma coisa, não uma ação.'], solution:'mesa', exp:'Correr, saltar e comer são ações (verbos); «mesa» é um nome → é o intruso.' },
    { id:'3pg_nomeprop', s:'portugues', t:'Nomes (próprios, comuns, coletivos)', type:'game', game:'suspeitos', pick:true, diff:1, q:'🧠 Qual é NOME PRÓPRIO?', story:'Nomes próprios começam por maiúscula e dão nome a UMA pessoa, animal ou lugar.', suspects:[{id:'gato',emoji:'🐈',name:'gato'},{id:'lisboa',emoji:'🏙️',name:'Lisboa'},{id:'menina',emoji:'👧',name:'menina'}], clues:['«gato» e «menina» servem para muitos — são comuns.','«Lisboa» é uma cidade só, com maiúscula.'], solution:'lisboa', exp:'«Lisboa» é nome próprio (uma cidade, com maiúscula); «gato» e «menina» são nomes comuns.' },
    { id:'3pg_adj', s:'portugues', t:'Adjetivos', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Qual é o ADJETIVO?', story:'O adjetivo diz COMO é uma coisa (a qualidade).', suspects:[{id:'livro',emoji:'📕',name:'livro'},{id:'bonito',emoji:'✨',name:'bonito'},{id:'correr',emoji:'🏃',name:'correr'}], clues:['«livro» é uma coisa (nome).','«correr» é uma ação (verbo).','O que resta diz uma qualidade...'], solution:'bonito', exp:'«Bonito» diz uma qualidade → é adjetivo. «Livro» é nome e «correr» é verbo.' },
    { id:'3pg_fam', s:'portugues', t:'Família de palavras', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Qual NÃO é da família de «flor»?', story:'A família de palavras partilha a mesma raiz e o mesmo sentido.', suspects:[{id:'florista',emoji:'💐',name:'florista'},{id:'florido',emoji:'🌷',name:'florido'},{id:'farinha',emoji:'🌾',name:'farinha'},{id:'floreira',emoji:'🪴',name:'floreira'}], clues:['florista, florido e floreira têm «flor» lá dentro.','«farinha» começa por «far», não por «flor».'], solution:'farinha', exp:'Florista, florido e floreira vêm de «flor»; «farinha» não pertence à família.' },
    { id:'3pg_anton', s:'portugues', t:'Sinónimos e antónimos', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Qual é o CONTRÁRIO de «grande»?', story:'Antónimo é o oposto. Qual é o oposto de grande?', suspects:[{id:'enorme',emoji:'🐘',name:'enorme'},{id:'pequeno',emoji:'🐁',name:'pequeno'},{id:'alto',emoji:'📏',name:'alto'}], clues:['«enorme» é quase o mesmo que grande (sinónimo).','O contrário de grande é...?'], solution:'pequeno', exp:'O antónimo (contrário) de «grande» é «pequeno». «Enorme» é sinónimo.' },
    { id:'3pg_plural', s:'portugues', t:'Plurais e feminino', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Qual está no PLURAL?', story:'Plural = mais do que um. Costuma acabar em «s».', suspects:[{id:'cao',emoji:'🐕',name:'cão'},{id:'caes',emoji:'🐕‍🦺',name:'cães'},{id:'gato',emoji:'🐈',name:'gato'}], clues:['«cão» e «gato» são um só (singular).','«cães» são vários.'], solution:'caes', exp:'«Cães» é o plural de «cão» (vários). «Cão» e «gato» estão no singular.' },
    { id:'3pg_seqABC', s:'portugues', t:'Sílabas', type:'game', game:'padrao', diff:1, q:'🔤 Que letra falta na ordem do alfabeto?', sequence:['A','B','C','?','E'], options:['D','F','G','H'], answer:'D', hint:'Diz o alfabeto: A, B, C, ...', exp:'A ordem é A, B, C, D, E → falta o D.' },
    { id:'3lp_sil1', s:'portugues', t:'Sílabas', type:'mc', diff:1, q:'🔤 Quantas sílabas tem "borboleta"?', opts:['2','3','4','5'], ans:2, exp:'bor-bo-le-ta → 4 sílabas.' },
    { id:'3lp_sil2', s:'portugues', t:'Sílabas', type:'fill', diff:1, q:'Divide em sílabas: "menino" → ___', ans:['me-ni-no'], exp:'me-ni-no (3 sílabas).' },
    { id:'3lp_sil3', s:'portugues', t:'Sílabas', type:'mc', diff:2, q:'🔤 A sílaba tónica de "cadeira" é:', opts:['ca','dei','ra'], ans:1, exp:'Em "cadeira" a sílaba forte é "dei".' },

    { id:'3lp_pro1', s:'portugues', t:'Pronomes pessoais', type:'mc', diff:1, q:'🔤 Que pronome substitui "a Maria"?', opts:['ele','ela','eles'], ans:1, exp:'Maria = feminino singular → "ela".' },
    { id:'3lp_pro2', s:'portugues', t:'Pronomes pessoais', type:'fill', diff:2, q:'Substitui "o João e o Pedro" por um pronome: ___', ans:['eles'], exp:'Dois meninos → "eles".' },
    { id:'3lp_pro3', s:'portugues', t:'Pronomes pessoais', type:'mc', diff:2, q:'🔤 Pronome de 1.ª pessoa do plural:', opts:['eu','nós','eles'], ans:1, exp:'Eu (1.ª sg) → nós (1.ª pl).' },

    { id:'3lp_poe1', s:'portugues', t:'Texto poético', type:'mc', diff:1, q:'📖 Cada linha de um poema chama-se:', opts:['estrofe','verso','rima'], ans:1, exp:'Verso = linha do poema.' },
    { id:'3lp_poe2', s:'portugues', t:'Texto poético', type:'mc', diff:2, q:'📖 Uma estrofe com 4 versos chama-se:', opts:['terceto','quadra','soneto'], ans:1, exp:'4 versos = quadra.' },
    { id:'3lp_poe3', s:'portugues', t:'Texto poético', type:'fill', diff:2, q:'"Lua" rima com ___', ans:['rua','nua','crua'], exp:'Rua, nua, crua — som "ua" no fim.' },

    { id:'3lp_bd1', s:'portugues', t:'Banda desenhada', type:'mc', diff:1, q:'💬 O "quadradinho" da BD chama-se:', opts:['vinheta','balão','legenda'], ans:0, exp:'Vinheta = cada quadrado da BD.' },
    { id:'3lp_bd2', s:'portugues', t:'Banda desenhada', type:'mc', diff:2, q:'☁️ O balão em forma de nuvem mostra:', opts:['o que diz','o que pensa','o som'], ans:1, exp:'Balão-nuvem = pensamento.' },
    { id:'3lp_bd3', s:'portugues', t:'Banda desenhada', type:'mc', diff:2, q:'💥 "BOOM!" numa BD é uma:', opts:['onomatopeia','rima','legenda'], ans:0, exp:'Onomatopeia = palavra que imita um som.' },

    // ============================ MATEMÁTICA — NOVOS ===========================
    { id:'3lm_cm1', s:'matematica', t:'Cálculo mental', type:'mc', diff:1, q:'🧠 47 + 25 (de cabeça) =', opts:['62','72','82'], ans:1, exp:'40+20=60; 7+5=12; 60+12=72.' },
    { id:'3lm_cm2', s:'matematica', t:'Cálculo mental', type:'mc', diff:2, q:'🧠 98 + 56 (arredondar) =', opts:['144','154','164'], ans:1, exp:'100 + 56 = 156, depois −2 = 154.' },
    { id:'3lm_cm3', s:'matematica', t:'Cálculo mental', type:'fill', diff:2, q:'Dobro de 35 = ___', ans:['70'], exp:'35 × 2 = 70.' },

    { id:'3lm_mc1', s:'matematica', t:'Massa e capacidade', type:'mc', diff:1, q:'⚖️ 1 kg = ___ g', opts:['10','100','1 000'], ans:2, exp:'1 kg = 1 000 g.' },
    { id:'3lm_mc2', s:'matematica', t:'Massa e capacidade', type:'mc', diff:1, q:'🥛 1 L = ___ mL', opts:['10','100','1 000'], ans:2, exp:'1 L = 1 000 mL.' },
    { id:'3lm_mc3', s:'matematica', t:'Massa e capacidade', type:'mc', diff:2, q:'⚖️ Uma maçã pesa aproximadamente:', opts:['20 g','200 g','2 kg'], ans:1, exp:'≈ 200 g (uma maçã média).' },
    { id:'3lm_mc4', s:'matematica', t:'Massa e capacidade', type:'mc', diff:2, q:'🥛 Uma chávena tem aproximadamente:', opts:['25 mL','250 mL','2,5 L'], ans:1, exp:'Uma chávena ≈ 250 mL.' },

    // ============================ ESTUDO DO MEIO ===============================
    // ── Jogos de classificar/intruso (tocar no cartão certo) ──
    { id:'3eg_mamif', s:'estudo_meio', t:'Animais', type:'game', game:'suspeitos', pick:true, diff:1, q:'🧠 Qual NÃO é mamífero?', story:'Os mamíferos nascem da barriga da mãe e mamam leite. Descobre o intruso.', suspects:[{id:'cao',emoji:'🐕',name:'Cão'},{id:'gato',emoji:'🐈',name:'Gato'},{id:'peixe',emoji:'🐟',name:'Peixe'},{id:'vaca',emoji:'🐄',name:'Vaca'}], clues:['Cão, gato e vaca mamam leite quando são bebés.','O peixe nasce de ovos e vive na água.'], solution:'peixe', exp:'Cão, gato e vaca são mamíferos; o peixe não é (nasce de ovos, respira por guelras).' },
    { id:'3eg_aereo', s:'estudo_meio', t:'Aspetos físicos do meio', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Qual NÃO é meio de transporte aéreo?', story:'Aéreo = anda pelo AR. Descobre o intruso.', suspects:[{id:'aviao',emoji:'✈️',name:'Avião'},{id:'helicoptero',emoji:'🚁',name:'Helicóptero'},{id:'barco',emoji:'⛵',name:'Barco'},{id:'balao',emoji:'🎈',name:'Balão'}], clues:['Avião, helicóptero e balão voam no ar.','O barco anda na água.'], solution:'barco', exp:'Avião, helicóptero e balão são aéreos; o barco é aquático → é o intruso.' },
    { id:'3eg_sentido', s:'estudo_meio', t:'Os cinco sentidos', type:'game', game:'suspeitos', pick:true, diff:1, q:'🧠 Com que órgão CHEIRAS?', story:'Cada sentido tem o seu órgão. Qual usas para cheirar?', suspects:[{id:'nariz',emoji:'👃',name:'Nariz'},{id:'olho',emoji:'👁️',name:'Olho'},{id:'ouvido',emoji:'👂',name:'Ouvido'}], clues:['O olho serve para ver, o ouvido para ouvir.','Cheirar é sentir os cheiros...'], solution:'nariz', exp:'Cheiras com o nariz (olfato). O olho é para ver e o ouvido para ouvir.' },
    { id:'3eg_vidrao', s:'estudo_meio', t:'Materiais e objetos', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 O que vai para o VIDRÃO (verde)?', story:'O vidrão é o ecoponto verde. Só recebe um tipo de material.', suspects:[{id:'garrafavidro',emoji:'🍾',name:'Garrafa de vidro'},{id:'jornal',emoji:'📰',name:'Jornal'},{id:'garrafaplast',emoji:'🧴',name:'Garrafa de plástico'}], clues:['O jornal (papel) vai para o azul.','A garrafa de plástico vai para o amarelo.','O vidrão é só para...'], solution:'garrafavidro', exp:'O vidrão (verde) é só para vidro. Papel vai no azul, plástico no amarelo.' },
    { id:'3eg_planta', s:'estudo_meio', t:'Plantas', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Qual parte da planta está DEBAIXO da terra?', story:'Cada parte da planta tem o seu lugar. Qual fica escondida na terra?', suspects:[{id:'raiz',emoji:'🌱',name:'Raiz'},{id:'flor',emoji:'🌸',name:'Flor'},{id:'folha',emoji:'🍃',name:'Folha'}], clues:['A flor e a folha estão no ar, ao sol.','O que segura a planta e bebe água da terra?'], solution:'raiz', exp:'A raiz fica debaixo da terra: segura a planta e absorve água. Flor e folha estão acima.' },
    { id:'3eg_astro', s:'estudo_meio', t:'Os astros', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Qual é a nossa ESTRELA?', story:'Uma estrela tem luz própria. Qual destes astros é a nossa estrela?', suspects:[{id:'sol',emoji:'☀️',name:'Sol'},{id:'lua',emoji:'🌙',name:'Lua'},{id:'terra',emoji:'🌍',name:'Terra'}], clues:['A Lua não tem luz própria — reflete a luz do Sol.','A Terra é o planeta onde vivemos.'], solution:'sol', exp:'O Sol é a nossa estrela (tem luz própria). A Terra é um planeta e a Lua é um satélite.' },
    { id:'3le_pas1', s:'estudo_meio', t:'O passado da criança', type:'mc', diff:1, q:'👨‍👩‍👧 Os pais dos teus pais são os teus:', opts:['tios','avós','primos'], ans:1, exp:'Pais dos pais = avós.' },
    { id:'3le_pas2', s:'estudo_meio', t:'O passado da criança', type:'mc', diff:2, q:'👶 Documento oficial para identificar uma criança em Portugal:', opts:['passaporte','cartão de cidadão','cartão de aluno'], ans:1, exp:'O cartão de cidadão substituiu o antigo bilhete de identidade e junta vários documentos num só. Toda a gente em Portugal tem um, até as crianças.' },
    { id:'3le_pas3', s:'estudo_meio', t:'O passado da criança', type:'tf', diff:1, q:'Bisavós são os pais dos avós.', ans:true, exp:'Verdadeiro — a ordem é: pais → avós → bisavós. Bis quer dizer duas vezes: duas gerações acima dos pais.' },

    { id:'3le_corp1', s:'estudo_meio', t:'O corpo humano', type:'mc', diff:1, q:'🦴 O esqueleto humano tem aproximadamente ___ ossos.', opts:['50','100','206'], ans:2, exp:'≈ 206 ossos no adulto.' },
    { id:'3le_corp2', s:'estudo_meio', t:'O corpo humano', type:'mc', diff:2, q:'🤸 As articulações servem para:', opts:['proteger os órgãos','permitir movimento','dar cor à pele'], ans:1, exp:'Articulações permitem dobrar.' },
    { id:'3le_corp3', s:'estudo_meio', t:'O corpo humano', type:'mc', diff:1, q:'❤️ O coração está localizado no:', opts:['cabeça','tronco','membros'], ans:1, exp:'Coração no tronco.' },

    { id:'3le_sis1', s:'estudo_meio', t:'Os sistemas do corpo', type:'mc', diff:1, q:'🍎 O sistema que transforma a comida em energia é o:', opts:['respiratório','digestivo','circulatório'], ans:1, exp:'O sistema digestivo (boca, estômago, intestinos) parte os alimentos e retira deles a energia de que o corpo precisa.' ,
      intro: "No teu corpo, vários **sistemas** trabalham em conjunto. Cada um tem uma função especial. O sistema que transforma comida em energia é como uma \"fábrica\" dentro de ti.",
      hint: "Pensa: onde começa o processo? Mastigas e engoles. Para onde vai a comida depois? É esse o sistema.",
      richExp: "**Sistema digestivo — caminho da comida**:\nBoca → Esófago → Estômago → Intestino delgado → Intestino grosso → Ânus.\n\n**O que faz cada parte**:\n- **Boca**: mastiga e mistura com saliva.\n- **Estômago**: \"máquina\" que tritura e desfaz com ácido.\n- **Intestino delgado**: absorve os nutrientes (vão para o sangue).\n- **Intestino grosso**: absorve a água que sobrou.\n\n**Curiosidade**: o teu intestino delgado tem ~7 metros de comprimento (estendido)! Está enrolado dentro da barriga.\n\n**Conexão**: o sistema digestivo trabalha COM o **circulatório** (que leva os nutrientes a todas as células) e com o **excretor** (que elimina o que sobra)."},
    { id:'3le_sis2', s:'estudo_meio', t:'Os sistemas do corpo', type:'mc', diff:2, q:'🫁 Os pulmões fazem parte do sistema:', opts:['digestivo','respiratório','circulatório'], ans:1, exp:'Os pulmões pertencem ao sistema respiratório: levam o oxigénio do ar para o sangue e expulsam o dióxido de carbono.' },
    { id:'3le_sis3', s:'estudo_meio', t:'Os sistemas do corpo', type:'fill', diff:2, q:'O órgão que bombeia o sangue é o ___', ans:['coração'], exp:'O coração é um músculo que bombeia o sangue para todo o corpo — bate cerca de 80 vezes por minuto!' },

    { id:'3le_sau1', s:'estudo_meio', t:'A saúde e a prevenção', type:'mc', diff:1, q:'🥗 Para uma alimentação saudável, devemos:', opts:['comer só doces','variar os alimentos','comer só fruta'], ans:1, exp:'Variedade é a chave.' },
    { id:'3le_sau2', s:'estudo_meio', t:'A saúde e a prevenção', type:'tf', diff:1, q:'Lavar as mãos antes de comer ajuda a prevenir doenças.', ans:true, exp:'Verdadeiro — as mãos apanham micróbios em tudo o que tocamos; lavá-las antes de comer impede que entrem no corpo.' },
    { id:'3le_sau3', s:'estudo_meio', t:'A saúde e a prevenção', type:'mc', diff:2, q:'😴 Uma criança de 8 anos precisa de dormir cerca de:', opts:['4 horas','9-11 horas','15 horas'], ans:1, exp:'≈ 9–11 h por noite.' },

    { id:'3le_sen1', s:'estudo_meio', t:'Os cinco sentidos', type:'mc', diff:1, q:'👃 Para cheirar usamos:', opts:['os olhos','o nariz','a língua'], ans:1, exp:'Nariz = olfato.' },
    { id:'3le_sen2', s:'estudo_meio', t:'Os cinco sentidos', type:'mc', diff:2, q:'👅 O sentido associado à língua é o:', opts:['olfato','paladar','tato'], ans:1, exp:'Paladar = sabor.' },
    { id:'3le_sen3', s:'estudo_meio', t:'Os cinco sentidos', type:'fill', diff:2, q:'Sentido em que se usa a pele: ___', ans:['tato','tacto'], exp:'Tato — o sentido da pele. Com ele sentimos o quente, o frio, o macio e o áspero.' },

    { id:'3le_loc1', s:'estudo_meio', t:'O passado do meio local', type:'mc', diff:1, q:'🏛️ Conjunto de freguesias forma um:', opts:['concelho','distrito','país'], ans:0, exp:'Freguesia → Concelho → Distrito → País.' },
    { id:'3le_loc2', s:'estudo_meio', t:'O passado do meio local', type:'mc', diff:2, q:'🏰 Santo Tirso é conhecido pelo:', opts:['Castelo de São Jorge','Mosteiro de São Bento','Pelourinho de Sintra'], ans:1, exp:'O Mosteiro de São Bento é o monumento mais conhecido de Santo Tirso, com muitos séculos de história.' },
    { id:'3le_loc3', s:'estudo_meio', t:'O passado do meio local', type:'fill', diff:2, q:'Órgão que governa o concelho: ___ Municipal', ans:['Câmara','câmara'], exp:'Câmara Municipal.' },

    { id:'3le_sim1', s:'estudo_meio', t:'Símbolos nacionais', type:'mc', diff:1, q:'🇵🇹 As cores da bandeira de Portugal são:', opts:['azul e branco','verde e vermelho','vermelho e amarelo'], ans:1, exp:'A bandeira de Portugal é verde e vermelha, com o escudo e a esfera armilar ao centro.' },
    { id:'3le_sim2', s:'estudo_meio', t:'Símbolos nacionais', type:'mc', diff:2, q:'📅 25 de Abril celebra:', opts:['Dia de Portugal','Dia da Liberdade','Implantação da República'], ans:1, exp:'25 Abril 1974 = Revolução dos Cravos.' ,
      intro: "O **25 de Abril de 1974** é a data mais importante da história recente de Portugal. Foi o dia em que Portugal recuperou a **liberdade** após 48 anos de ditadura.",
      hint: "Foi uma revolução SEM violência — chamada \"Revolução dos Cravos\". Devolveu democracia a Portugal. Como se chamará este dia?",
      richExp: "**25 de Abril 1974 — Revolução dos Cravos**.\n\n**Antes**: Portugal vivia em **DITADURA** (Salazar e Marcelo Caetano, \"Estado Novo\"). Sem liberdade de imprensa, sem eleições livres, com PIDE (polícia política), Guerra Colonial em África.\n\n**Esse dia**:\n- Militares do MFA (Movimento das Forças Armadas) deram um golpe.\n- Quase sem violência — 4 mortos.\n- Senhas: \"Grândola, Vila Morena\" (Zeca Afonso) e \"E depois do adeus\" (Paulo de Carvalho).\n- O povo saiu à rua e pôs **cravos vermelhos** nas espingardas — daí o nome.\n\n**Depois**:\n- Liberdade de expressão, voto, partidos.\n- Fim da Guerra Colonial e independência de Angola, Moçambique, Guiné-Bissau, Cabo Verde, S. Tomé, Timor.\n- 1.ª Constituição democrática: 2 de abril de 1976.\n- 1.ªs eleições livres: 25 de abril de 1975.\n\n**Hoje**: **feriado nacional — Dia da Liberdade**.\n\n**Conexão**: a Carolina vai aprofundar no 9.º (História do séc. XX). E vais aprender o **Hino da Liberdade**: \"Grândola, Vila Morena\"."},
    { id:'3le_sim3', s:'estudo_meio', t:'Símbolos nacionais', type:'fill', diff:2, q:'O hino nacional chama-se: A ___', ans:['Portuguesa','portuguesa'], exp:'O hino chama-se A Portuguesa — foi composto em 1890 e canta-se de pé, com respeito.' },

    { id:'3le_ins1', s:'estudo_meio', t:'Instituições e serviços', type:'mc', diff:1, q:'🚒 Em caso de incêndio chamamos:', opts:['polícia','bombeiros','correios'], ans:1, exp:'Bombeiros (112).' },
    { id:'3le_ins2', s:'estudo_meio', t:'Instituições e serviços', type:'fill', diff:1, q:'Número de emergência em Portugal e na UE: ___', ans:['112'], exp:'112 — fácil de fixar: 1-1-2. É gratuito e funciona em toda a União Europeia.' },
    { id:'3le_ins3', s:'estudo_meio', t:'Instituições e serviços', type:'mc', diff:2, q:'📚 Instituição onde se empresta livros:', opts:['câmara','biblioteca','tribunal'], ans:1, exp:'Na biblioteca podemos requisitar (pedir emprestados) livros e devolvê-los depois — diferente da livraria, onde se compram.' },

    { id:'3le_ast1', s:'estudo_meio', t:'Os astros', type:'mc', diff:1, q:'☀️ O Sol é uma:', opts:['planeta','estrela','satélite'], ans:1, exp:'Sol = estrela.' },
    { id:'3le_ast2', s:'estudo_meio', t:'Os astros', type:'mc', diff:2, q:'🌍 A Terra é o ___ planeta a contar do Sol.', opts:['1.º','2.º','3.º','4.º'], ans:2, exp:'Mercúrio → Vénus → TERRA → Marte.' ,
      intro: "No Sistema Solar há **8 planetas** a girar à volta do Sol. A nossa Terra é um deles. Saber a ordem ajuda-te a entender o nosso lugar no universo.",
      hint: "Mnemónica: **M**eu **V**elho **T**io **M**andou **J**untar **S**eis **U**vas **N**ovas → Mercúrio, Vénus, Terra, Marte, Júpiter, Saturno, Úrano, Neptuno.",
      richExp: "**A ordem dos planetas (do Sol para fora)**:\n1. **Mercúrio** — o mais próximo, sem atmosfera, muito quente de dia, gélido de noite.\n2. **Vénus** — o mais quente (efeito de estufa extremo).\n3. **Terra** — único conhecido com vida. Tem 1 lua.\n4. **Marte** — o \"planeta vermelho\", já houve água lá.\n5. **Júpiter** — o GIGANTE, tem a Grande Mancha Vermelha (tempestade).\n6. **Saturno** — os famosos anéis de gelo e poeira.\n7. **Úrano** — gira \"deitado\".\n8. **Neptuno** — o mais distante.\n\n**Plutão** já foi planeta, mas em 2006 foi reclassificado como **planeta-anão**.\n\n**Conexão**: a Terra é o **3.º** — está na \"zona habitável\" (não muito perto nem muito longe do Sol)."},
    { id:'3le_ast3', s:'estudo_meio', t:'Os astros', type:'tf', diff:2, q:'A Lua tem luz própria.', ans:false, exp:'Falso — reflete a luz do Sol.' },
    { id:'3le_ast4', s:'estudo_meio', t:'Os astros', type:'mc', diff:2, q:'🌐 A Terra gira sobre si própria em ___ horas:', opts:['12','24','48'], ans:1, exp:'Rotação = 24 h = 1 dia.' },

    { id:'3le_rel1', s:'estudo_meio', t:'Aspetos físicos do meio', type:'mc', diff:1, q:'🏔️ O ponto mais alto de Portugal é:', opts:['Serra da Estrela','Pico (Açores)','Monchique'], ans:1, exp:'Pico ≈ 2 351 m.' },
    { id:'3le_rel2', s:'estudo_meio', t:'Aspetos físicos do meio', type:'mc', diff:2, q:'🌊 O maior rio de Portugal é o:', opts:['Tejo','Douro','Mondego'], ans:0, exp:'O Tejo é o maior rio de Portugal: nasce em Espanha e desagua em Lisboa, no oceano Atlântico.' },
    { id:'3le_rel3', s:'estudo_meio', t:'Aspetos físicos do meio', type:'fill', diff:2, q:'Terra plana e baixa chama-se ___', ans:['planície'], exp:'Planície — terra plana e baixa, boa para a agricultura (ex.: o Alentejo).' },

    { id:'3le_ani1', s:'estudo_meio', t:'Animais', type:'mc', diff:1, q:'🐄 A vaca é um:', opts:['réptil','mamífero','ave'], ans:1, exp:'Vaca = mamífero.' },
    { id:'3le_ani2', s:'estudo_meio', t:'Animais', type:'mc', diff:2, q:'🐋 A baleia é um:', opts:['peixe','mamífero','réptil'], ans:1, exp:'Mamífero — respira ar, amamenta.' ,
      intro: "A **baleia** parece um peixe gigante. Mas se olhares com atenção vais perceber que NÃO é peixe — é um dos animais MAIORES da Terra e é... mamífero!",
      hint: "Como respira a baleia? Quando aparece à superfície atira um \"esguicho\" de água pelo orifício superior. Os peixes respiram debaixo de água. Os mamíferos respiram...?",
      richExp: "**A baleia é MAMÍFERO** (não peixe!). Características de mamífero:\n- **Respira AR** (pulmões) — sobe à superfície para respirar.\n- **Sangue quente** (homeotérmico).\n- **Amamenta** os filhotes (a baleia bebé bebe LEITE da mãe — sim, debaixo de água!).\n- **Tem pelo** (poucos, mas tem) na pele.\n\n**Os peixes**:\n- Respiram **debaixo de água** com **brânquias**.\n- Sangue frio.\n- Não amamentam — põem ovos.\n\n**Outros mamíferos marinhos** que se confundem com peixes:\n- **Golfinhos**\n- **Orcas** (são golfinhos grandes)\n- **Focas** e **leões-marinhos**\n- **Morsas**\n\n**Curiosidade**: a **baleia-azul** é o **maior animal que já existiu** na Terra — maior que qualquer dinossauro! Pode ter 30 metros e pesar 200 toneladas. O coração dela tem o tamanho de um carro pequeno!\n\n**Conexão**: vais classificar animais com mais detalhe no 5.º (vertebrados/invertebrados) e no 7.º (filos, classes, ordens)."},
    { id:'3le_ani3', s:'estudo_meio', t:'Animais', type:'mc', diff:2, q:'🐛 Os insetos têm ___ patas:', opts:['4','6','8'], ans:1, exp:'6 patas. (Aranhas têm 8.)' },
    { id:'3le_ani4', s:'estudo_meio', t:'Animais', type:'tf', diff:1, q:'Os peixes respiram por brânquias.', ans:true, exp:'Verdadeiro — as brânquias (guelras) tiram o oxigénio da água. Nós usamos pulmões, os peixes usam brânquias.' },

    { id:'3le_pla1', s:'estudo_meio', t:'Plantas', type:'mc', diff:1, q:'🌱 A parte da planta que fixa no solo é a:', opts:['raiz','caule','folha'], ans:0, exp:'Raiz fixa e absorve água.' },
    { id:'3le_pla2', s:'estudo_meio', t:'Plantas', type:'mc', diff:2, q:'🍃 As plantas fazem o seu alimento na:', opts:['raiz','caule','folha'], ans:2, exp:'Folha (fotossíntese).' },
    { id:'3le_pla3', s:'estudo_meio', t:'Plantas', type:'mc', diff:2, q:'🌸 A parte da planta que se transforma em fruto é a:', opts:['raiz','flor','folha'], ans:1, exp:'A flor dá origem ao fruto.' },
    { id:'3le_pla4', s:'estudo_meio', t:'Plantas', type:'fill', diff:2, q:'Gás que a planta liberta na fotossíntese: ___', ans:['oxigénio','oxigenio','O2'], exp:'Oxigénio — na fotossíntese a planta usa a luz do sol e liberta o oxigénio que nós respiramos.' },

    { id:'3le_mat1', s:'estudo_meio', t:'Materiais e objetos', type:'mc', diff:1, q:'🪵 A madeira é um material:', opts:['natural','artificial'], ans:0, exp:'Vem das árvores.' },
    { id:'3le_mat2', s:'estudo_meio', t:'Materiais e objetos', type:'mc', diff:2, q:'♻️ No ecoponto AZUL deita-se:', opts:['vidro','papel','plástico'], ans:1, exp:'Azul = papel/cartão.' },
    { id:'3le_mat3', s:'estudo_meio', t:'Materiais e objetos', type:'mc', diff:2, q:'♻️ As embalagens de plástico vão para o ecoponto:', opts:['azul','amarelo','verde'], ans:1, exp:'Amarelo = embalagens.' },
    { id:'3le_mat4', s:'estudo_meio', t:'Materiais e objetos', type:'mc', diff:2, q:'♻️ Onde vai o vidro?', opts:['azul','amarelo','verde'], ans:2, exp:'Verde = vidro.' },

    { id:'3le_exp1', s:'estudo_meio', t:'Experiências', type:'mc', diff:1, q:'💧 A água em forma de gelo está no estado:', opts:['sólido','líquido','gasoso'], ans:0, exp:'Gelo = sólido.' },
    { id:'3le_exp2', s:'estudo_meio', t:'Experiências', type:'mc', diff:2, q:'🧲 Um íman atrai objetos de:', opts:['plástico','ferro','madeira'], ans:1, exp:'Ferro (e níquel, cobalto).' },
    { id:'3le_exp3', s:'estudo_meio', t:'Experiências', type:'tf', diff:2, q:'O ar ocupa espaço.', ans:true, exp:'Verdadeiro — vê um balão.' },

    // ============================ INGLÊS (Kid\'s Box NG 2) =====================
    { id:'3li_gre1', s:'ingles', t:'Greetings and feelings', type:'mc', diff:1, q:'👋 "Good morning!" significa:', opts:['boa noite','bom dia','boa tarde'], ans:1, exp:'Good morning = bom dia.' },
    { id:'3li_gre2', s:'ingles', t:'Greetings and feelings', type:'mc', diff:1, q:'😊 "I\'m happy" significa:', opts:['estou triste','estou contente','estou cansado'], ans:1, exp:'Happy = contente.' },
    { id:'3li_gre3', s:'ingles', t:'Greetings and feelings', type:'fill', diff:1, q:'What\'s your name? — My name ___ Eduarda.', ans:['is'], exp:'My name **is** Eduarda.' },

    { id:'3li_sch1', s:'ingles', t:'School things', type:'mc', diff:1, q:'✏️ Em inglês, lápis é:', opts:['pen','pencil','book'], ans:1, exp:'Pencil = lápis.' },
    { id:'3li_sch2', s:'ingles', t:'School things', type:'fill', diff:1, q:'Borracha em inglês (UK): ___', ans:['rubber'], exp:'Rubber (UK) / Eraser (US).' },
    { id:'3li_sch3', s:'ingles', t:'School things', type:'mc', diff:2, q:'🎒 "Schoolbag" significa:', opts:['mochila','cadeira','quadro'], ans:0, exp:'Schoolbag = mochila.' },

    { id:'3li_toy1', s:'ingles', t:'Toys and playtime', type:'mc', diff:1, q:'🧸 "Teddy bear" significa:', opts:['gato','urso de peluche','boneca'], ans:1, exp:'Teddy bear = urso de peluche.' },
    { id:'3li_toy2', s:'ingles', t:'Toys and playtime', type:'fill', diff:1, q:'Boneca em inglês: ___', ans:['doll'], exp:'Doll = boneca.' },
    { id:'3li_toy3', s:'ingles', t:'Toys and playtime', type:'mc', diff:2, q:'🎮 "Let\'s play!" significa:', opts:['Vamos comer','Vamos brincar','Vamos dormir'], ans:1, exp:'Let\'s play = Vamos brincar.' },

    { id:'3li_rom1', s:'ingles', t:'Rooms at home', type:'mc', diff:1, q:'🍳 "Kitchen" significa:', opts:['quarto','cozinha','sala'], ans:1, exp:'Kitchen = cozinha.' },
    { id:'3li_rom2', s:'ingles', t:'Rooms at home', type:'mc', diff:2, q:'🛏️ "The cat is ___ the bed" (em cima):', opts:['in','on','under'], ans:1, exp:'On = em cima de.' },
    { id:'3li_rom3', s:'ingles', t:'Rooms at home', type:'fill', diff:1, q:'Casa de banho em inglês: ___', ans:['bathroom'], exp:'Bathroom = bath (banho) + room (quarto/divisão) — a divisão do banho.' },

    { id:'3li_fam1', s:'ingles', t:'Family members', type:'mc', diff:1, q:'👩 "Mum" significa:', opts:['pai','mãe','irmã'], ans:1, exp:'Mum / mother = mãe.' },
    { id:'3li_fam2', s:'ingles', t:'Family members', type:'mc', diff:1, q:'👴 "Grandfather" significa:', opts:['avô','tio','primo'], ans:0, exp:'Grandfather = avô.' },
    { id:'3li_fam3', s:'ingles', t:'Family members', type:'fill', diff:2, q:'Irmã em inglês: ___', ans:['sister'], exp:'Sister = irmã. Para fixar: sister e brother (irmão) andam sempre juntos.' },

    { id:'3li_far1', s:'ingles', t:'Farm animals', type:'mc', diff:1, q:'🐄 "Cow" significa:', opts:['galinha','vaca','porco'], ans:1, exp:'Cow = vaca.' },
    { id:'3li_far2', s:'ingles', t:'Farm animals', type:'mc', diff:2, q:'🐑 Qual é o plural de "sheep" (ovelha)?', opts:['sheeps','sheepes','sheep'], ans:2, exp:'O plural de "sheep" é... "sheep"! É um plural IRREGULAR que não muda — uma sheep, duas sheep. Acontece o mesmo com "fish" (peixe) e "deer" (veado).' },
    { id:'3li_far3', s:'ingles', t:'Farm animals', type:'fill', diff:1, q:'Cavalo em inglês: ___', ans:['horse'], exp:'Horse = cavalo. O H lê-se aspirado: rrórs.' },

    { id:'3li_tow1', s:'ingles', t:'My town', type:'mc', diff:1, q:'🏪 "Shop" significa:', opts:['hospital','loja','rua'], ans:1, exp:'Shop = loja. 💡 Repara: "hospital" escreve-se igual nas duas línguas (chama-se palavra transparente), mas "shop" é mesmo diferente de "loja".' },
    { id:'3li_tow2', s:'ingles', t:'My town', type:'fill', diff:1, q:'Biblioteca em inglês: ___', ans:['library'], exp:'Library (NÃO "livraria"!).' },
    { id:'3li_tow3', s:'ingles', t:'My town', type:'mc', diff:2, q:'➡️ "Turn left" significa:', opts:['vira à direita','vira à esquerda','vai em frente'], ans:1, exp:'Turn left = à esquerda.' },

    { id:'3li_clo1', s:'ingles', t:'Clothes', type:'mc', diff:1, q:'👗 "Skirt" significa:', opts:['calças','saia','casaco'], ans:1, exp:'Skirt = saia (a peça que se veste da cintura para baixo, em roda). ⚠️ Cuidado: "skirt" (saia) é muito parecido com "shirt" (camisa) — só muda o "k"!' },
    { id:'3li_clo2', s:'ingles', t:'Clothes', type:'mc', diff:2, q:'👖 "Trousers" significa:', opts:['saia','calças','sapatos'], ans:1, exp:'Trousers = calças. É sempre plural em inglês (como "scissors", tesoura) — nunca dizemos "a trouser". Os americanos dizem "pants".' },
    { id:'3li_clo3', s:'ingles', t:'Clothes', type:'fill', diff:1, q:'👟 Sapatos em inglês: ___', ans:['shoes'], exp:'Shoes — sempre no plural porque são dois! Um só é "a shoe".' },
    { id:'3li_clo4', s:'ingles', t:'Clothes', type:'mc', diff:1, q:'🧥 "Jacket" significa:', opts:['meias','casaco','chapéu'], ans:1, exp:'Jacket = casaco. Para casacos mais grossos de inverno também se diz "coat".' },
    { id:'3li_clo5', s:'ingles', t:'Clothes', type:'fill', diff:2, q:'🧦 Meias em inglês: ___', ans:['socks'], exp:'Socks — plural, tal como em português. Uma só é "a sock".' },
    { id:'3li_clo6', s:'ingles', t:'Clothes', type:'match', diff:2, q:'🔗 Liga cada roupa em inglês à palavra portuguesa.', pairs:[['shoes','sapatos'],['skirt','saia'],['hat','chapéu'],['socks','meias']], exp:'shoes=sapatos, skirt=saia, hat=chapéu, socks=meias.' },

    { id:'3li_hob1', s:'ingles', t:'Hobbies and sports', type:'mc', diff:1, q:'⚽ "Football" significa:', opts:['ténis','futebol','natação'], ans:1, exp:'Football = futebol.' },
    { id:'3li_hob2', s:'ingles', t:'Hobbies and sports', type:'mc', diff:2, q:'🏊 "I like swimming" significa:', opts:['Gosto de correr','Gosto de nadar','Gosto de saltar'], ans:1, exp:'Swimming = natação.' },
    { id:'3li_hob3', s:'ingles', t:'Hobbies and sports', type:'fill', diff:2, q:'Cantar (forma -ing): I like ___', ans:['singing'], exp:'After "like" use -ing form.' },

    { id:'3li_num1', s:'ingles', t:'Numbers and colours', type:'mc', diff:1, q:'🔢 "Seven" é o número:', opts:['5','7','9'], ans:1, exp:'Seven = 7.' },
    { id:'3li_num2', s:'ingles', t:'Numbers and colours', type:'mc', diff:2, q:'🔢 "Thirteen" é o número:', opts:['3','13','30'], ans:1, exp:'Thirteen = 13; Thirty = 30.' },
    { id:'3li_num3', s:'ingles', t:'Numbers and colours', type:'mc', diff:1, q:'🎨 "Yellow" é a cor:', opts:['vermelho','amarelo','azul'], ans:1, exp:'Yellow = amarelo.' },
    { id:'3li_num4', s:'ingles', t:'Numbers and colours', type:'fill', diff:1, q:'Verde em inglês: ___', ans:['green'], exp:'Green = verde, como a relva (grass) — as duas começam com gr!' },

    // ============================ CIDADANIA E DESENVOLVIMENTO ==================
    { id:'3lc_dir1', s:'cidadania', t:'Direitos e deveres', type:'mc', diff:1, q:'👶 Direito de toda a criança:', opts:['ter um carro','ir à escola','escolher os pais'], ans:1, exp:'Direito à educação.' },
    { id:'3lc_dir2', s:'cidadania', t:'Direitos e deveres', type:'mc', diff:2, q:'📜 A Convenção sobre os Direitos da Criança foi aprovada pela:', opts:['UE','ONU','UNESCO'], ans:1, exp:'ONU, em 1989.' },
    { id:'3lc_dir3', s:'cidadania', t:'Direitos e deveres', type:'tf', diff:1, q:'As crianças também têm deveres, não apenas direitos.', ans:true, exp:'Verdadeiro — além de direitos (escola, saúde, brincar) temos deveres: estudar, respeitar os outros, ajudar em casa.' },

    { id:'3lc_reg1', s:'cidadania', t:'Regras de convivência', type:'mc', diff:1, q:'🙋 Na sala de aula, para falar:', opts:['gritar','levantar o braço','sair do lugar'], ans:1, exp:'Na aula, para falar esperamos a nossa vez e levantamos o braço — assim todos se ouvem e ninguém fala por cima.' },
    { id:'3lc_reg2', s:'cidadania', t:'Regras de convivência', type:'mc', diff:2, q:'😤 Quando há um conflito, o primeiro passo é:', opts:['gritar','acalmar-se','responder à letra'], ans:1, exp:'Perante um conflito, o primeiro passo é acalmar-se (respirar fundo); só depois se conversa para resolver.' },

    { id:'3lc_div1', s:'cidadania', t:'Diversidade e respeito', type:'tf', diff:1, q:'Todas as pessoas merecem respeito, independentemente da cor, religião ou capacidade.', ans:true, exp:'Verdadeiro — o respeito não depende da cor, língua, religião ou capacidades. Diferentes por fora, iguais em valor.' },
    { id:'3lc_div2', s:'cidadania', t:'Diversidade e respeito', type:'mc', diff:2, q:'😠 "Bullying" é:', opts:['uma piada inofensiva','uma agressão repetida','um jogo de equipa'], ans:1, exp:'Agressão repetida.' },
    { id:'3lc_div3', s:'cidadania', t:'Diversidade e respeito', type:'mc', diff:2, q:'😟 Quando vejo alguém a ser maltratado:', opts:['finjo que não vi nada','denuncio a um adulto','rio-me e não faço nada'], ans:1, exp:'Denunciar a um adulto de confiança.' },

    { id:'3lc_amb1', s:'cidadania', t:'Ambiente e sustentabilidade', type:'mc', diff:1, q:'♻️ A regra dos 3 R é:', opts:['Reduzir, Reutilizar, Reciclar','Recolher, Repartir, Reservar','Receber, Refazer, Reciclar'], ans:0, exp:'Os 3 R têm uma ordem: primeiro Reduzir (usar menos), depois Reutilizar (dar novo uso) e só no fim Reciclar (transformar em material novo).' ,
      intro: "A regra dos **3 R** é a mais famosa do ambiente. Mas atenção: NÃO é só reciclar! Há uma ORDEM de prioridade.",
      hint: "A 1.ª prioridade é **não criar lixo no início**. Se não compras, não há lixo. Se reutilizas, há menos lixo. Só por fim, reciclas.",
      richExp: "**Os 3 R por ordem de IMPORTÂNCIA**:\n\n**1.º — REDUZIR** ⭐ (a mais importante!)\n- Comprar menos, escolher melhor.\n- Levar saco de pano em vez de plástico.\n- Beber água da torneira em vez de garrafa.\n- Imprimir só o necessário.\n\n**2.º — REUTILIZAR**\n- Frasco vazio → vira porta-lápis.\n- T-shirt velha → pano de cozinha.\n- Brinquedos → passar a irmão mais novo.\n\n**3.º — RECICLAR** (só quando não dá para reduzir nem reutilizar)\n- Papel/cartão → ecoponto AZUL\n- Plástico e metal → AMARELO\n- Vidro → VERDE\n- Pilhas → vermelho\n- Bio-resíduos (cascas, restos) → castanho\n\n**Hoje fala-se em 5 R**: + **Repensar** (consumir consciente) e **Recusar** (dizer não a brindes inúteis, panfletos).\n\n**Conexão**: vais aprender Educação Ambiental no 7.º (Cidadania), com tópicos como pegada ecológica, alterações climáticas, e ODS (Objetivos de Desenvolvimento Sustentável da ONU)."},
    { id:'3lc_amb2', s:'cidadania', t:'Ambiente e sustentabilidade', type:'mc', diff:2, q:'💧 Ao escovar os dentes devo:', opts:['deixar a torneira aberta','fechar a torneira','encher o lavatório'], ans:1, exp:'Fechar poupa ~6 L/min.' },
    { id:'3lc_amb3', s:'cidadania', t:'Ambiente e sustentabilidade', type:'tf', diff:2, q:'Reciclar é a 1.ª prioridade nos 3 R.', ans:false, exp:'Falso — a 1.ª é REDUZIR.' },

    { id:'3lc_rod1', s:'cidadania', t:'Segurança rodoviária', type:'mc', diff:1, q:'🚶 Atravesso a estrada na:', opts:['passadeira','curva','meio do trânsito'], ans:0, exp:'Sempre na passadeira.' },
    { id:'3lc_rod2', s:'cidadania', t:'Segurança rodoviária', type:'mc', diff:2, q:'🚗 No carro, crianças com menos de 12 anos devem ir:', opts:['na frente','no banco de trás','no porta-bagagens'], ans:1, exp:'Sempre no banco de trás.' },
    { id:'3lc_rod3', s:'cidadania', t:'Segurança rodoviária', type:'tf', diff:1, q:'É obrigatório usar capacete na bicicleta.', ans:true, exp:'Verdadeiro — o capacete protege a cabeça numa queda. Cabeça só temos uma!' },

    { id:'3lc_sau1', s:'cidadania', t:'Saúde e bem-estar', type:'mc', diff:1, q:'😴 Uma criança de 8-9 anos precisa de dormir:', opts:['4-5 h','9-11 h','15 h'], ans:1, exp:'≈ 9-11 horas.' },
    { id:'3lc_sau2', s:'cidadania', t:'Saúde e bem-estar', type:'mc', diff:2, q:'📱 Tempo recomendado em ecrãs por dia:', opts:['ilimitado','até 1 hora','5 horas'], ans:1, exp:'~1 hora por dia.' },
    { id:'3lc_sau3', s:'cidadania', t:'Saúde e bem-estar', type:'tf', diff:1, q:'Falar sobre o que sentimos ajuda o bem-estar emocional.', ans:true, exp:'Verdadeiro — pôr os sentimentos em palavras ajuda a percebê-los e a pedir ajuda quando é preciso.' },

    // ============================ LEITURA — 8 textos com orientações ============================
    {"id":"rd_easy1","s":"leitura","t":"O gato Mimi","type":"mc","diff":1,"tip":"Texto curto e fácil! Lê devagar, palavra a palavra. Pausa nos pontos finais.","passage":"O Mimi é um gato cinzento. Ele gosta de dormir ao sol.\nDe manhã, o Mimi bebe leite. Depois, brinca com um novelo de lã.\nÀ noite, o Mimi enrola-se na cama da Eduarda e ronrona até adormecer.","vocab":{"novelo":"bola de fios de lã enrolados","ronrona":"faz um som suave de gato contente"},"q":"🐱 De que cor é o gato Mimi?","opts":["preto","cinzento","branco"],"ans":1,"exp":"Logo na 1.ª frase: \"O Mimi é um gato cinzento\".","paragraphChecks":[{"q":"O que gosta o Mimi de fazer?","opts":["dormir ao sol","nadar","correr à chuva"],"ans":0,"exp":"\"Ele gosta de dormir ao sol\".","afterParagraph":0},{"q":"O que bebe o Mimi de manhã?","opts":["água","leite","sumo"],"ans":1,"exp":"\"De manhã, o Mimi bebe leite\".","afterParagraph":1}]},
    {"id":"rd_easy2","s":"leitura","t":"Um dia na praia","type":"mc","diff":1,"tip":"Texto curto. Lê com calma e imagina a praia enquanto lês!","passage":"Hoje fomos à praia. O sol estava quente e o mar azul.\nEu fiz um castelo de areia com a minha pá. O meu irmão apanhou conchas.\nAo fim do dia, comemos um gelado e voltámos para casa felizes.","vocab":{"pá":"objeto para cavar a areia","conchas":"casinhas duras de animais do mar"},"q":"🏖️ O que fez a menina na areia?","opts":["um castelo","um buraco","uma ponte"],"ans":0,"exp":"\"fiz um castelo de areia com a minha pá\".","paragraphChecks":[{"q":"Como estava o tempo na praia?","opts":["chuvoso","sol quente","com vento frio"],"ans":1,"exp":"\"O sol estava quente e o mar azul\".","afterParagraph":0},{"q":"O que comeram ao fim do dia?","opts":["um gelado","uma sandes","fruta"],"ans":0,"exp":"\"comemos um gelado e voltámos para casa\".","afterParagraph":1}]},
    {"id":"rd_xw2rpd","s":"leitura","t":"Lê com as vírgulas","type":"mc","diff":2,"tip":"Atenção: este texto tem MUITAS vírgulas. Pausa CURTA em cada uma — só uma batidinha — e segue em frente.","passage":"Ontem, com a minha mãe, fui ao mercado. Comprámos pão, queijo, leite, ovos, fruta e legumes. À saída, encontrei a Carolina, a minha melhor amiga, que estava com o pai. Cumprimentámo-nos, sorrimos, demos um abraço e prometemos brincar à tarde, no parque, perto do **chafariz**.","vocab":{"chafariz":"fonte de água com várias bicas, no meio de uma praça"},"q":"🤔 Onde combinaram brincar à tarde?","opts":["na escola","no parque","em casa da Carolina"],"ans":1,"exp":"\"perto do chafariz, no parque\".","paragraphChecks":[{"q":"Onde foi a Eduarda no início?","opts":["à escola","ao mercado","ao parque"],"ans":1,"exp":"Logo no início: \"fui ao mercado\".","afterParagraph":0}]},
    {"id":"rd_sv72ah","s":"leitura","t":"Lê um diálogo","type":"mc","diff":2,"tip":"Vais ler um diálogo. Dá uma voz diferente a cada personagem (a Eduarda e a mãe). O narrador fala com voz neutra.","passage":"A Eduarda entrou na cozinha. Cheirava a bolo acabado de sair do forno. Olhou para a mãe e disse:\n— Mãe, posso provar?\n— Ainda está muito quente, querida — respondeu a mãe, sorrindo.\n— Só uma **migalha**, prometo!\n— Está bem — disse a mãe — mas tem cuidado para não te queimares.","vocab":{"migalha":"pedacinho muito pequenino de pão ou bolo"},"q":"💬 Quantas vezes a Eduarda fala neste diálogo?","opts":["1","2","3"],"ans":1,"exp":"\"posso provar?\" e \"Só uma migalha, prometo!\" — 2 falas.","paragraphChecks":[{"q":"A que cheirava a cozinha?","opts":["a café","a bolo do forno","a flores"],"ans":1,"exp":"\"Cheirava a bolo acabado de sair do forno\".","afterParagraph":0},{"q":"O que respondeu a mãe quando a Eduarda pediu para provar?","opts":["que sim, à vontade","que está muito quente, com cuidado","que não"],"ans":1,"exp":"\"Está bem... mas tem cuidado para não te queimares\".","afterParagraph":4}]},
    {"id":"rd_j93k2a","s":"leitura","t":"Voz sobe na pergunta","type":"mc","diff":2,"tip":"Este texto está cheio de perguntas. Repara que TODAS fazem a tua voz SUBIR no fim — como se estivesses a subir umas escadas com a voz.","passage":"O Tomás entrou na sala a correr.\n— Mãe, onde está a minha mochila? Já viste? Pus em cima da mesa.\nA mãe olhou para ele e perguntou:\n— Procuraste no teu quarto? E debaixo do sofá? Os teus livros não estavam contigo?\nO Tomás parou. Pensou um pouco. Será que afinal estava no quarto, em cima da **secretária**?","vocab":{"secretária":"mesa onde se estuda ou trabalha"},"q":"❓ Quantas perguntas faz a mãe ao Tomás?","opts":["1","2","3"],"ans":2,"exp":"\"Procuraste no teu quarto?\", \"E debaixo do sofá?\", \"Os teus livros não estavam contigo?\" — 3 perguntas.","paragraphChecks":[{"q":"O que perdeu o Tomás?","opts":["os livros","a mochila","os sapatos"],"ans":1,"exp":"\"Mãe, onde está a minha mochila?\".","afterParagraph":1},{"q":"Onde a mãe sugere procurar?","opts":["no quarto e debaixo do sofá","no jardim","no carro"],"ans":0,"exp":"\"Procuraste no teu quarto? E debaixo do sofá?\".","afterParagraph":3}]},
    {"id":"rd_xb392r","s":"leitura","t":"Voz com emoção","type":"mc","diff":2,"tip":"Vais ler um texto com várias exclamações. Cada uma tem uma EMOÇÃO diferente: alegria, surpresa, susto. Sente a emoção e deixa-a sair na voz!","passage":"A Eduarda abriu a porta da sala e parou. Não acreditava no que via.\n— Surpresa! — gritaram todos.\nEra uma festa! Os balões enchiam o teto! O bolo brilhava com velas!\n— Que lindo! — exclamou a Eduarda, com os olhos a brilhar. — Não estava nada à espera!\nO pai sorriu e abraçou-a:\n— Parabéns, querida! É o teu dia **especial**!","vocab":{"especial":"diferente do comum; muito importante"},"q":"😊 Que tipo de festa é?","opts":["de Natal","de aniversário","de Páscoa"],"ans":1,"exp":"Bolo com velas + \"Parabéns, querida!\" → aniversário.","paragraphChecks":[{"q":"Que emoção sentiu a Eduarda?","opts":["medo","alegria e surpresa","tristeza"],"ans":1,"exp":"Balões, bolo, \"Surpresa!\" → alegria+surpresa.","afterParagraph":1},{"q":"Que tipo de festa era?","opts":["Natal","aniversário","Páscoa"],"ans":1,"exp":"O pai diz \"Parabéns, querida! É o teu dia especial!\".","afterParagraph":3}]},
    {"id":"rd_96wi4a","s":"leitura","t":"Lê e descobre os sentimentos","type":"mc","diff":2,"tip":"Lê devagar e procura as PISTAS sobre o que a personagem está a sentir. Não vão estar escritas claramente — tens de inferir.","passage":"O Pedro chegou da escola e atirou a mochila ao chão. Não cumprimentou ninguém. Subiu as escadas, devagar, com a cabeça baixa. Fechou-se no quarto e não saiu até à hora do jantar.\nÀ mesa, mexia a comida no prato sem comer. Os olhos estavam molhados. Quando o pai lhe perguntou se queria contar o que tinha acontecido, ele respondeu, baixinho:\n— O João já não quer ser meu **amigo**.","vocab":{"amigo":"pessoa de quem gostamos e com quem partilhamos coisas"},"q":"😢 Como se está a sentir o Pedro?","opts":["contente","triste","zangado"],"ans":1,"exp":"Pistas: cabeça baixa, olhos molhados, não come, perdeu um amigo → triste.","paragraphChecks":[{"q":"Como reagiu o Pedro quando chegou da escola?","opts":["cumprimentou todos","atirou a mochila e fechou-se no quarto","foi brincar"],"ans":1,"exp":"\"atirou a mochila ao chão\".","afterParagraph":0},{"q":"Porque está o Pedro triste?","opts":["perdeu um amigo","tirou má nota","caiu na rua"],"ans":0,"exp":"\"O João já não quer ser meu amigo\".","afterParagraph":1}]},
    {"id":"rd_86uipe","s":"leitura","t":"Lê e descobre o que vai acontecer","type":"mc","diff":2,"tip":"Lê com atenção e tenta ADIVINHAR o que vai acontecer no fim. Olha para as pistas — ações, lugar, palavras-chave.","passage":"A Carolina olhou pela janela. O céu estava muito escuro. Os relâmpagos cortavam as nuvens. Os trovões ribombavam ao longe.\n— Vai cair um **temporal** enorme — disse a mãe.\nA Carolina olhou para o cão Bobi, que tremia debaixo da mesa. Pegou na manta favorita do Bobi, ajoelhou-se ao pé dele, e abraçou-o com muita força. Lá fora, começaram a cair as primeiras gotas...","vocab":{"temporal":"tempestade muito forte, com chuva e vento"},"q":"🔮 O que vai acontecer a seguir, provavelmente?","opts":["vai parar de chover","vai cair muita chuva","o Bobi vai sair de casa"],"ans":1,"exp":"Pistas: céu escuro, trovões, \"vai cair um temporal\", primeiras gotas → vai chover muito.","paragraphChecks":[{"q":"Como estava o tempo?","opts":["ensolarado","escuro com trovões","a nevar"],"ans":1,"exp":"\"céu muito escuro. Os trovões ribombavam\".","afterParagraph":0},{"q":"O que vai PROVAVELMENTE acontecer?","opts":["vai parar de chover","vai cair muita chuva","o Bobi vai fugir"],"ans":1,"exp":"Temporal + primeiras gotas a cair.","afterParagraph":2}]},
    {"id":"rd_gfcqt7","s":"leitura","t":"Lê uma carta","type":"mc","diff":2,"tip":"Esta é uma CARTA. Lê com voz natural, como se estivesses a falar com a Carolina. Repara nas vírgulas após a saudação e a despedida.","passage":"Santo Tirso, 13 de junho de 2026.\n\nOlá, Carolina,\n\nComo estás? Eu estou ótima! Hoje fui à praia com os meus pais e mergulhei muitas vezes nas ondas. A água estava fria, mas brincámos imenso na areia. Encontrei conchas lindíssimas — guardei algumas para te mostrar.\n\nQuando vens cá a casa? Tenho saudades tuas! O meu cão Bobi também tem!\n\nUm grande abraço,\nA tua amiga,\nEduarda","vocab":{"mergulhei":"meti a cabeça e o corpo dentro de água","lindíssimas":"muito bonitas"},"q":"✉️ De onde é a Eduarda a escrever a carta?","opts":["da praia","de Santo Tirso","da escola"],"ans":1,"exp":"O cabeçalho da carta diz \"Santo Tirso, 13 de junho de 2026\".","paragraphChecks":[{"q":"De onde escreve a Eduarda?","opts":["da praia","de Santo Tirso","da escola"],"ans":1,"exp":"Cabeçalho: \"Santo Tirso, 13 de junho de 2026\".","afterParagraph":0},{"q":"Que prendas guardou a Eduarda?","opts":["conchas da praia","fotografias","cartas antigas"],"ans":0,"exp":"\"Encontrei conchas lindíssimas — guardei algumas para te mostrar\".","afterParagraph":2}]},
    {"id":"rd_g0sld6","s":"leitura","t":"Lê uma lenda","type":"mc","diff":2,"tip":"Esta é uma LENDA. Lê com voz \"de contar histórias\", devagar, com pausas dramáticas. Há palavras menos comuns — vê o glossário no fim.","passage":"Há muito tempo, num reino distante, vivia um **dragão** dentro de uma montanha. Tinha **escamas** de fogo e respirava chamas. Os habitantes da aldeia tinham muito medo.\nMas, certo dia, uma menina corajosa, chamada Mara, foi até à montanha. Levava uma simples flor. O dragão, ao ver a flor, parou. Os seus olhos suavizaram. Há séculos que ninguém lhe oferecia nada — só lhe atiravam pedras.\n— Não te quero mal — disse a Mara. — Vim só fazer-te companhia.\nDesse dia em diante, o dragão tornou-se **guardião** da aldeia.","vocab":{"dragão":"animal lendário, como um réptil enorme, que respira fogo","escamas":"placas duras que cobrem a pele de peixes e répteis","guardião":"quem protege ou guarda algo importante"},"q":"🐉 Porque é que o dragão se acalmou?","opts":["a Mara fugiu","a Mara levou-lhe uma flor e foi gentil","a Mara atirou-lhe uma pedra"],"ans":1,"exp":"A Mara levou uma flor e foi gentil — não atirou pedras como os outros.","paragraphChecks":[{"q":"Onde vivia o dragão?","opts":["na aldeia","dentro de uma montanha","num castelo"],"ans":1,"exp":"\"vivia um dragão dentro de uma montanha\".","afterParagraph":0},{"q":"O que levava a Mara quando foi à montanha?","opts":["uma espada","uma simples flor","um escudo"],"ans":1,"exp":"\"Levava uma simples flor\" — foi isso que surpreendeu o dragão.","afterParagraph":1}]},
    {"id":"rd_easy3","s":"leitura","t":"A lancheira nova","type":"mc","diff":1,"tip":"Texto curto e fácil. Lê devagar e imagina a lancheira!","passage":"A Rita tem uma lancheira nova. É cor-de-rosa e tem uma estrela.\nHoje a mãe pôs lá dentro uma maçã e um pão com queijo.\nNa escola, a Rita partilhou o pão com a amiga Leonor. As duas sorriram.","vocab":{"lancheira":"caixa para levar o lanche","partilhou":"dividiu com outra pessoa"},"q":"🍎 O que fez a Rita na escola?","opts":["comeu tudo sozinha","partilhou o pão com a Leonor","perdeu a lancheira"],"ans":1,"exp":"\"a Rita partilhou o pão com a amiga Leonor\".","paragraphChecks":[{"q":"Como é a lancheira da Rita?","opts":["azul com uma lua","cor-de-rosa com uma estrela","verde com um coração"],"ans":1,"exp":"\"É cor-de-rosa e tem uma estrela\".","afterParagraph":0},{"q":"O que pôs a mãe na lancheira?","opts":["uma maçã e um pão com queijo","bolachas e sumo","uma banana"],"ans":0,"exp":"\"uma maçã e um pão com queijo\".","afterParagraph":1}]},
    {"id":"rd_easy4","s":"leitura","t":"O cão Bolinha","type":"mc","diff":1,"tip":"Lê com calma, frase a frase. Pausa nos pontos finais.","passage":"O Bolinha é um cão pequeno e castanho. Ele adora correr no jardim.\nQuando chove, o Bolinha fica triste à janela, a olhar para a rua.\nMas hoje está sol! O Bolinha corre, salta e abana o rabo de alegria.","vocab":{"abana":"mexe de um lado para o outro"},"q":"🐕 O que faz o Bolinha quando chove?","opts":["corre no jardim","fica triste à janela","dorme na cama"],"ans":1,"exp":"\"Quando chove, o Bolinha fica triste à janela\".","paragraphChecks":[{"q":"De que cor é o Bolinha?","opts":["preto","branco","castanho"],"ans":2,"exp":"\"um cão pequeno e castanho\".","afterParagraph":0},{"q":"Como está o tempo hoje?","opts":["está sol","está a chover","está a nevar"],"ans":0,"exp":"\"Mas hoje está sol!\".","afterParagraph":1}]},
    {"id":"rd_easy5","s":"leitura","t":"A surpresa do avô","type":"mc","diff":1,"tip":"Texto curto. Tenta adivinhar a surpresa antes de chegar ao fim!","passage":"O avô chamou a Eduarda ao quintal. Tinha uma surpresa atrás das costas.\n— Fecha os olhos e estende as mãos! — disse o avô a rir.\nEra um livro de histórias com uma capa dourada. A Eduarda deu um abraço enorme ao avô.","vocab":{"quintal":"espaço com terra atrás de uma casa","estende":"põe para a frente"},"q":"🎁 Qual era a surpresa do avô?","opts":["um gelado de chocolate","um livro de histórias","uma bola de futebol"],"ans":1,"exp":"\"Era um livro de histórias com uma capa dourada\".","paragraphChecks":[{"q":"Onde estava a surpresa?","opts":["atrás das costas do avô","em cima da mesa","no quarto"],"ans":0,"exp":"\"Tinha uma surpresa atrás das costas\".","afterParagraph":0},{"q":"O que pediu o avô à Eduarda?","opts":["para se sentar","para fechar os olhos e estender as mãos","para ir buscar água"],"ans":1,"exp":"\"Fecha os olhos e estende as mãos!\".","afterParagraph":1}]},
    {"id":"rd_easy6","s":"leitura","t":"A formiga apressada","type":"mc","diff":1,"tip":"Lê devagar. Repara no que a formiga carrega.","passage":"Uma formiga pequenina carregava uma folha verde enorme.\nA folha era três vezes maior do que ela! Mas a formiga não desistia.\nChegou ao formigueiro e todas as amigas bateram palmas. Que formiga tão forte!","vocab":{"formigueiro":"casa das formigas, feita de túneis na terra","desistia":"deixava de tentar"},"q":"🐜 Porque bateram palmas as amigas?","opts":["porque a formiga era forte e não desistiu","porque estava a chover","porque a folha era pequena"],"ans":0,"exp":"A formiga carregou uma folha enorme sem desistir — as amigas ficaram admiradas.","paragraphChecks":[{"q":"O que carregava a formiga?","opts":["uma pedra","uma folha verde enorme","um grão de arroz"],"ans":1,"exp":"\"carregava uma folha verde enorme\".","afterParagraph":0},{"q":"A folha era…","opts":["três vezes maior do que a formiga","mais pequena do que a formiga","do tamanho da formiga"],"ans":0,"exp":"\"três vezes maior do que ela\".","afterParagraph":1}]},
    {"id":"rd_hard1","s":"leitura","t":"O mistério do lanche desaparecido","type":"mc","diff":3,"tip":"Texto mais comprido, de mistério! Lê como uma detetive: repara nas pistas escondidas nas frases.","passage":"Na segunda-feira, o lanche do Simão desapareceu da mochila. Na terça, aconteceu o mesmo. O Simão decidiu investigar.\nNa quarta-feira, escondeu-se atrás da porta da sala e esperou. Viu uma sombra pequena a aproximar-se da mochila... mas não era um colega. Era o Faísca, o gato da escola, que abria o fecho com a pata!\nO Simão riu-se tanto que o Faísca fugiu com o pão na boca. No dia seguinte, o Simão trouxe dois lanches: um para ele e outro, de atum, para o seu novo amigo ladrão.","vocab":{"investigar":"procurar descobrir a verdade, como um detetive","fecho":"o zíper que abre e fecha a mochila"},"q":"🕵️ Como descobriu o Simão o ladrão do lanche?","opts":["um colega contou-lhe","escondeu-se e esperou para ver","a professora viu o gato"],"ans":1,"exp":"\"escondeu-se atrás da porta da sala e esperou\" — investigou como um detetive.","paragraphChecks":[{"q":"Quando desapareceu o lanche pela primeira vez?","opts":["na segunda-feira","na quarta-feira","no sábado"],"ans":0,"exp":"\"Na segunda-feira, o lanche do Simão desapareceu\".","afterParagraph":0},{"q":"Quem era o ladrão do lanche?","opts":["um colega","o Faísca, o gato da escola","um passarinho"],"ans":1,"exp":"\"Era o Faísca, o gato da escola\".","afterParagraph":1}]},
    {"id":"rd_hard2","s":"leitura","t":"A carta da estação espacial","type":"mc","diff":3,"tip":"Texto mais difícil. Algumas respostas não estão escritas — tens de as deduzir pelas pistas!","passage":"Querida Eduarda,\nEscrevo-te a flutuar! Aqui na estação espacial não há gravidade: o meu lápis foge-me da mão e a água faz bolinhas no ar.\nDa janela vejo a Terra inteira, azul e redonda como um berlinde gigante. De noite — que aqui acontece dezasseis vezes por dia! — vejo as cidades acesas como estrelinhas.\nDaqui a três semanas volto para casa. Guarda-me um abraço (na Terra os abraços não flutuam).\nA tua tia astronauta, Marta","vocab":{"gravidade":"força que nos puxa para o chão","berlinde":"bolinha de vidro colorida de brincar"},"q":"🚀 Porque é que o lápis foge da mão da tia Marta?","opts":["porque o lápis é mágico","porque na estação não há gravidade","porque a tia o atira"],"ans":1,"exp":"Sem gravidade, nada é puxado para baixo — os objetos flutuam, incluindo o lápis.","paragraphChecks":[{"q":"Quem escreve a carta?","opts":["a tia Marta, astronauta","a mãe da Eduarda","uma amiga da escola"],"ans":0,"exp":"Assina \"A tua tia astronauta, Marta\".","afterParagraph":0},{"q":"Com que se parece a Terra vista da janela?","opts":["com um berlinde gigante","com uma estrela","com uma bola de fogo"],"ans":0,"exp":"\"azul e redonda como um berlinde gigante\".","afterParagraph":1}]},

    // ============================ ESCRITA 3.º (Oficina de Escrita) ===============================
    // Alvo directo da dificuldade da Eduarda (a professora: "deves exercitar a
    // expressão escrita"): pontuação, construir frases, ligar ideias, e do plano
    // ao texto. Usa engines existentes (mc/fill/tf/order/suspeitos) — 0 código novo.

    // ── Maiúscula e ponto final (o erro mais visível: frases seguidas sem pontuação) ──
    { id:'3ew_pt1', s:'escrita', t:'Maiúscula e ponto final', type:'mc', diff:1, q:'✍️ Qual frase está BEM escrita?', opts:['o gato dorme','O gato dorme.','O gato dorme'], ans:1, exp:'Uma frase começa com MAIÚSCULA e acaba com ponto final: «O gato dorme.»' },
    { id:'3ew_pt2', s:'escrita', t:'Maiúscula e ponto final', type:'mc', diff:1, q:'✍️ O que falta em: "a maria foi à escola"?', opts:['maiúscula no início e ponto no fim','nada','só uma vírgula'], ans:0, exp:'Falta a maiúscula (A) e o ponto final: «A Maria foi à escola.»' },
    { id:'3ew_pt3', s:'escrita', t:'Maiúscula e ponto final', type:'tf', diff:1, q:'Os nomes de pessoas escrevem-se sempre com maiúscula (Rui, Ana).', ans:true, exp:'Sim — nomes próprios (pessoas, cidades) levam sempre maiúscula.' },
    { id:'3ew_pt4', s:'escrita', t:'Maiúscula e ponto final', type:'mc', diff:2, q:'✍️ Onde acaba a 1.ª frase? "O Rui correu muito depois bebeu água"', opts:['depois de "muito" (O Rui correu muito.)','não acaba','depois de "Rui"'], ans:0, exp:'São duas ideias → duas frases: «O Rui correu muito. Depois bebeu água.» O ponto separa-as.' },
    { id:'3ew_pt5', s:'escrita', t:'Maiúscula e ponto final', type:'mc', diff:2, q:'✍️ Quantos pontos finais faltam? "fui ao pomar apanhei fruta fiz sumo"', opts:['3 (uma ideia, um ponto)','1','nenhum'], ans:0, exp:'São 3 ideias → 3 frases: «Fui ao pomar. Apanhei fruta. Fiz sumo.»' },
    { id:'3ew_pt6', s:'escrita', t:'Maiúscula e ponto final', type:'fill', strict:true, diff:2, q:'Escreve com maiúscula e ponto: "hoje está sol" → ___', ans:['Hoje está sol.'], exp:'«Hoje está sol.» — maiúscula no H e ponto no fim.' },
    { id:'3ew_pt7', s:'escrita', t:'Maiúscula e ponto final', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Qual frase está BEM escrita?', story:'Só uma tem maiúscula no início e ponto no fim. Descobre-a!', suspects:[{id:'a',emoji:'❌',name:'a bola é vermelha'},{id:'b',emoji:'✅',name:'A bola é vermelha.'},{id:'c',emoji:'❌',name:'A bola é vermelha'}], clues:['A frase certa começa por MAIÚSCULA.','E acaba com PONTO FINAL.'], solution:'b', exp:'«A bola é vermelha.» — maiúscula no início e ponto no fim.' },

    // ── Frase com sentido (construir frases: ordem das palavras) ──
    { id:'3ew_fr1', s:'escrita', t:'Frase com sentido', type:'order', diff:1, q:'✍️ Ordena para fazer uma frase: gato / O / dorme', items:['O','gato','dorme'], exp:'«O gato dorme.» — primeiro quem (O gato), depois o que faz (dorme).' },
    { id:'3ew_fr2', s:'escrita', t:'Frase com sentido', type:'order', diff:1, q:'✍️ Ordena: bola / a / Rui / O / chuta', items:['O','Rui','chuta','a','bola'], exp:'«O Rui chuta a bola.» — quem + o que faz + o quê.' },
    { id:'3ew_fr3', s:'escrita', t:'Frase com sentido', type:'order', diff:2, q:'✍️ Ordena: sumo / fábrica / à / fomos / de', items:['fomos','à','fábrica','de','sumo'], exp:'«Fomos à fábrica de sumo.»' },
    { id:'3ew_fr4', s:'escrita', t:'Frase com sentido', type:'mc', diff:1, q:'✍️ Qual é uma frase com sentido?', opts:['Come menina a maçã','A menina come a maçã.','Maçã a come menina a'], ans:1, exp:'«A menina come a maçã.» — as palavras estão pela ordem certa e faz sentido.' },
    { id:'3ew_fr5', s:'escrita', t:'Frase com sentido', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Qual NÃO é uma frase a sério?', story:'Duas fazem sentido, uma é só palavras baralhadas. Encontra a baralhada.', suspects:[{id:'ok1',emoji:'✅',name:'O cão ladra.'},{id:'bad',emoji:'❌',name:'Ladra o casa cão.'},{id:'ok2',emoji:'✅',name:'A avó faz sopa.'}], clues:['Uma frase tem de FAZER SENTIDO.','«Ladra o casa cão» são só palavras baralhadas.'], solution:'bad', exp:'«Ladra o casa cão» não faz sentido — as outras duas são frases a sério.' },
    { id:'3ew_fr6', s:'escrita', t:'Frase com sentido', type:'fill', diff:2, q:'Completa a frase: "O Sr. Júlio foi à ___ apanhar fruta."', ans:['quinta','horta'], exp:'«O Sr. Júlio foi à quinta apanhar fruta.» — a palavra que falta é o lugar.' },

    // ── Palavras que ligam (conectores: primeiro, depois, no fim, mas, porque) ──
    { id:'3ew_lg1', s:'escrita', t:'Palavras que ligam', type:'mc', diff:1, q:'🔗 Que palavra mostra o que vem A SEGUIR? "Apanhei fruta. ___ fiz sumo."', opts:['Depois','Porque','Mas'], ans:0, exp:'«Depois» liga duas ações pela ordem do tempo: primeiro apanhei, depois fiz sumo.' },
    { id:'3ew_lg2', s:'escrita', t:'Palavras que ligam', type:'mc', diff:2, q:'🔗 Que palavra mostra a CAUSA? "Fiquei feliz ___ ganhei um livro."', opts:['porque','depois','mas'], ans:0, exp:'«Porque» explica o motivo: fiquei feliz — a razão é ter ganho um livro.' },
    { id:'3ew_lg3', s:'escrita', t:'Palavras que ligam', type:'mc', diff:2, q:'🔗 Que palavra mostra uma SURPRESA/oposto? "Queria brincar, ___ estava a chover."', opts:['mas','e','porque'], ans:0, exp:'«Mas» liga duas ideias que se opõem: queria brincar / não pude por causa da chuva.' },
    { id:'3ew_lg4', s:'escrita', t:'Palavras que ligam', type:'mc', diff:1, q:'🔗 Como começa uma história? "___, o dragão saiu da caverna."', opts:['Primeiro','No fim','Depois'], ans:0, exp:'Para começar usamos «Primeiro». «No fim» é para acabar; «Depois» é para o meio.' },
    { id:'3ew_lg5', s:'escrita', t:'Palavras que ligam', type:'fill', diff:2, q:'Completa com uma palavra de fim: "___, o Sr. Júlio voltou para casa feliz." (Primeiro / No fim)', ans:['No fim'], exp:'«No fim» marca o final da história.' },
    { id:'3ew_lg6', s:'escrita', t:'Palavras que ligam', type:'game', game:'padrao', diff:2, q:'🔗 Que palavra liga na ordem do tempo?', sequence:['Primeiro','Depois','?'], options:['No fim','Porque','Mas','Grande'], answer:'No fim', hint:'Primeiro → Depois → ... como acaba uma história?', exp:'Primeiro, Depois, No fim — as palavras que marcam o princípio, o meio e o fim.' },

    // ── Ordena a história (princípio, meio e fim — o que ela mais precisa: organizar) ──
    { id:'3ew_or1', s:'escrita', t:'Ordena a história', type:'order', diff:1, q:'📖 Põe a história por ordem:', items:['O Sr. Júlio foi à quinta.','Apanhou muita fruta.','Fez sumo na fábrica.'], exp:'Princípio (foi à quinta) → meio (apanhou fruta) → fim (fez sumo). É o plano do teste!' },
    { id:'3ew_or2', s:'escrita', t:'Ordena a história', type:'order', diff:2, q:'📖 Ordena a história do bolo:', items:['A Ana juntou os ingredientes.','Levou o bolo ao forno.','Comeu uma fatia deliciosa.'], exp:'Primeiro junta, depois leva ao forno, no fim come. Uma ação de cada vez.' },
    { id:'3ew_or3', s:'escrita', t:'Ordena a história', type:'order', diff:2, q:'📖 Ordena o dia na praia:', items:['De manhã fomos à praia.','Fizemos um castelo de areia.','Ao fim do dia voltámos para casa.'], exp:'Manhã → durante o dia → fim do dia. As palavras de tempo ajudam a ordenar.' },
    { id:'3ew_or4', s:'escrita', t:'Ordena a história', type:'mc', diff:2, q:'📖 Qual é o PRINCÍPIO de uma história?', opts:['E viveram felizes para sempre.','Era uma vez uma menina corajosa.','No fim, todos aplaudiram.'], ans:1, exp:'«Era uma vez…» é como se começa. As outras duas são finais.' },
    { id:'3ew_or5', s:'escrita', t:'Ordena a história', type:'mc', diff:3, q:'📖 A história tem 3 partes. Qual é a ordem certa?', opts:['Fim → Meio → Princípio','Princípio → Meio → Fim','Meio → Princípio → Fim'], ans:1, exp:'Toda a história tem Princípio (quem/onde), Meio (o que acontece) e Fim (como acaba).' },

    // ── Do plano ao texto (transformar um plano em frases — a tarefa do teste) ──
    { id:'3ew_pl1', s:'escrita', t:'Do plano ao texto', type:'mc', diff:2, q:'📝 Do plano "apanha da fruta" — que frase escreves?', opts:['fruta apanha','O Sr. Júlio apanhou fruta madura na quinta.','fruta.'], ans:1, exp:'Um ponto do plano vira uma frase COMPLETA: quem + o que fez + pormenor.' },
    { id:'3ew_pl2', s:'escrita', t:'Do plano ao texto', type:'mc', diff:2, q:'📝 Do plano "visita à quinta" — a melhor frase é:', opts:['No fim de semana, o Sr. Júlio visitou a quinta.','quinta visita','à quinta.'], ans:0, exp:'Uma boa frase diz QUANDO (no fim de semana), QUEM (o Sr. Júlio) e O QUÊ (visitou a quinta).' },
    { id:'3ew_pl3', s:'escrita', t:'Do plano ao texto', type:'tf', diff:2, q:'Cada ponto do plano deve virar pelo menos uma frase completa.', ans:true, exp:'Sim — o plano é uma lista de ideias; escrever é transformar cada ideia numa frase.' },
    { id:'3ew_pl4', s:'escrita', t:'Do plano ao texto', type:'mc', diff:3, q:'📝 Que frase liga MELHOR duas partes do plano (fruta → sumo)?', opts:['fruta sumo','Depois de apanhar a fruta, fizemos sumo na fábrica.','sumo fruta fábrica'], ans:1, exp:'Usa uma palavra que liga («Depois de…») para o texto ficar seguido e bonito.' },
    { id:'3ew_pl5', s:'escrita', t:'Do plano ao texto', type:'mc', diff:3, q:'📝 Qual é a melhor frase de FECHO para o plano "fim de semana divertido"?', opts:['Foi um fim de semana muito divertido.','fim de semana divertido','divertido fim.'], ans:0, exp:'Uma frase de fecho é completa: «Foi um fim de semana muito divertido.» — não é só copiar o plano.' },

    // ── Descrever com pormenor (enriquecer: adjetivos e detalhes) ──
    { id:'3ew_ds1', s:'escrita', t:'Descrever com pormenor', type:'mc', diff:1, q:'🎨 Qual frase tem MAIS pormenor?', opts:['Vi um cão.','Vi um cão castanho, pequeno e brincalhão.','Cão.'], ans:1, exp:'Os adjetivos (castanho, pequeno, brincalhão) dão pormenor e tornam o texto mais rico.' },
    { id:'3ew_ds2', s:'escrita', t:'Descrever com pormenor', type:'mc', diff:2, q:'🎨 Que opção dá mais pormenor a "a flor"?', opts:['a flor','a flor bonita e cheirosa','flor'], ans:1, exp:'«bonita e cheirosa» são adjetivos que descrevem a flor.' },
    { id:'3ew_ds3', s:'escrita', t:'Descrever com pormenor', type:'fill', diff:2, q:'Junta um adjetivo: "O gelado estava ___." (bom exemplo: delicioso)', ans:['delicioso','bom','doce','fresco','saboroso'], exp:'Um adjetivo (delicioso, fresco…) diz COMO era o gelado.' },
    { id:'3ew_ds4', s:'escrita', t:'Descrever com pormenor', type:'game', game:'suspeitos', pick:true, diff:2, q:'🧠 Qual frase pinta melhor a imagem na cabeça?', story:'A escrita boa faz-nos VER a cena. Qual descreve com mais pormenor?', suspects:[{id:'seca',emoji:'❌',name:'Havia uma casa.'},{id:'rica',emoji:'✅',name:'Havia uma casa velha, com telhado vermelho e uma porta azul.'},{id:'nada',emoji:'❌',name:'Casa.'}], clues:['A melhor frase dá cores e pormenores.','Faz-nos imaginar a casa.'], solution:'rica', exp:'«…casa velha, com telhado vermelho e porta azul» — os pormenores fazem-nos ver a casa.' },

    // ============================ MAT+ 3.º (Matemática visual) ===============================
    {"id":"mp3_c1","s":"mat_plus","t":"Centenas com ten-frames","type":"mc","diff":1,"q":"🔢 10 ten-frames cheios são:","opts":["10","100","1 000"],"ans":1,"exp":"10 × 10 = 100."},
    {"id":"mp3_c2","s":"mat_plus","t":"Centenas com ten-frames","type":"mc","diff":1,"q":"🟦 Uma placa 10×10 representa:","opts":["1 dezena","1 centena","1 milhar"],"ans":1,"exp":"100 quadradinhos = 1 centena."},
    {"id":"mp3_c3","s":"mat_plus","t":"Centenas com ten-frames","type":"mc","diff":1,"q":"🔢 10 centenas dão:","opts":["100","1 000","10 000"],"ans":1,"exp":"10 × 100 = 1 000."},
    {"id":"mp3_c4","s":"mat_plus","t":"Centenas com ten-frames","type":"fill","diff":2,"q":"3 placas de 100 + 5 barras de 10 = ___","ans":["350"],"exp":"300 + 50 = 350."},
    {"id":"mp3_c5","s":"mat_plus","t":"Centenas com ten-frames","type":"fill","diff":2,"q":"4 placas + 0 barras + 8 cubos = ___","ans":["408"],"exp":"400 + 0 + 8 = 408."},
    {"id":"mp3_c6","s":"mat_plus","t":"Centenas com ten-frames","type":"mc","diff":2,"q":"🔢 1 cubo grande = ___ unidades:","opts":["100","1 000","10 000"],"ans":1,"exp":"10×10×10 = 1 000."},
    {"id":"mp3_c7","s":"mat_plus","t":"Centenas com ten-frames","type":"tf","diff":1,"q":"5 placas de 100 são 500 cubinhos.","ans":true,"exp":"5 × 100 = 500. ✓"},
    {"id":"mp3_c8","s":"mat_plus","t":"Centenas com ten-frames","type":"mc","diff":2,"q":"📊 2 cubos grandes + 4 placas. Quanto é?","opts":["240","2 400","24 000"],"ans":1,"exp":"2 000 + 400 = 2 400."},
    {"id":"mp3_c9","s":"mat_plus","t":"Centenas com ten-frames","type":"fill","diff":2,"q":"7 centenas em algarismos: ___","ans":["700"],"exp":"7 × 100 = 700."},
    {"id":"mp3_c10","s":"mat_plus","t":"Centenas com ten-frames","type":"mc","diff":1,"q":"🔢 Para fazer 1 000 com placas de 100 preciso de ___:","opts":["5","10","100"],"ans":1,"exp":"10 placas."},
    {"id":"mp3_c11","s":"mat_plus","t":"Centenas com ten-frames","type":"mc","diff":2,"q":"🔢 6 placas + 3 barras + 4 cubos =","opts":["634","643","6 304"],"ans":0,"exp":"600 + 30 + 4 = 634."},
    {"id":"mp3_c12","s":"mat_plus","t":"Centenas com ten-frames","type":"fill","diff":2,"q":"8 barras de 10 + 5 cubos = ___","ans":["85"],"exp":"80 + 5 = 85."},
    {"id":"mp3_c13","s":"mat_plus","t":"Centenas com ten-frames","type":"fill","diff":2,"q":"🟧 Que número mostram estes blocos?","visual":{"baseten":234},"ans":["234"],"exp":"2 placas (200) + 3 barras (30) + 4 cubos (4) = 234."},
    {"id":"mp3_d1","s":"mat_plus","t":"Decompor até 10 000","type":"mc","diff":1,"q":"🔢 Em 3 472, o algarismo 4 vale:","opts":["4","40","400","4 000"],"ans":2,"exp":"4 está nas centenas."},
    {"id":"mp3_d2","s":"mat_plus","t":"Decompor até 10 000","type":"mc","diff":2,"q":"🔢 Decompõe 2 534:","opts":["2 000+500+30+4","2 000+300+50+4","20+50+30+4"],"ans":0,"exp":"2 M + 5 C + 3 D + 4 U."},
    {"id":"mp3_d3","s":"mat_plus","t":"Decompor até 10 000","type":"fill","diff":2,"q":"Em 6 089, o algarismo das centenas é ___","ans":["0"],"exp":"M=6, C=0, D=8, U=9."},
    {"id":"mp3_d4","s":"mat_plus","t":"Decompor até 10 000","type":"mc","diff":2,"q":"🔢 Escreve em algarismos: cinco mil e doze.","opts":["512","5 012","5 120"],"ans":1,"exp":"5 000 + 12 = 5 012."},
    {"id":"mp3_d5","s":"mat_plus","t":"Decompor até 10 000","type":"fill","diff":2,"q":"Em 4 705, o algarismo dos milhares é ___","ans":["4"],"exp":"4 mil."},
    {"id":"mp3_d6","s":"mat_plus","t":"Decompor até 10 000","type":"mc","diff":2,"q":"🔢 1 000 + 200 + 30 + 5 =","opts":["1 235","1 325","12 305"],"ans":0,"exp":"Junta: 1 235."},
    {"id":"mp3_d7","s":"mat_plus","t":"Decompor até 10 000","type":"mc","diff":2,"q":"🔢 Em 3 052, o algarismo 0 está nas:","opts":["unidades","dezenas","centenas"],"ans":2,"exp":"3 M, 0 C, 5 D, 2 U."},
    {"id":"mp3_d8","s":"mat_plus","t":"Decompor até 10 000","type":"fill","diff":2,"q":"Decompõe 8 040: 8 000 + ___ + 40 + 0","ans":["0"],"exp":"0 centenas."},
    {"id":"mp3_d9","s":"mat_plus","t":"Decompor até 10 000","type":"mc","diff":2,"q":"🔢 Que número tem 7 M, 0 C, 5 D, 3 U?","opts":["7 053","7 530","7 503"],"ans":0,"exp":"7 milhares + 0 centenas + 5 dezenas + 3 unidades = 7000 + 50 + 3 = 7 053."},
    {"id":"mp3_d10","s":"mat_plus","t":"Decompor até 10 000","type":"mc","diff":1,"q":"🔢 Maior posição num número de 4 algarismos:","opts":["unidades","centenas","milhares"],"ans":2,"exp":"Num número de 4 algarismos, a posição que vale mais é a dos milhares (a da esquerda)."},
    {"id":"mp3_d11","s":"mat_plus","t":"Decompor até 10 000","type":"fill","diff":2,"q":"6 000 + 700 + 40 + 9 = ___","ans":["6 749","6749"],"exp":"Junta as ordens: 6 000 + 700 = 6 700; + 40 = 6 740; + 9 = 6 749."},
    {"id":"mp3_d12","s":"mat_plus","t":"Decompor até 10 000","type":"mc","diff":2,"q":"🔢 Quantas centenas inteiras cabem em 2 500?","opts":["2","5","25"],"ans":2,"exp":"2 500 = 25 × 100."},
    {"id":"mp3_l1","s":"mat_plus","t":"Linha numérica até 10 000","type":"mc","diff":1,"q":"📏 Entre 3 000 e 4 000, mais ou menos a meio:","opts":["3 100","3 500","3 900"],"ans":1,"exp":"Entre 3 000 e 4 000, o meio é 3 500."},
    {"id":"mp3_l2","s":"mat_plus","t":"Linha numérica até 10 000","type":"mc","diff":2,"q":"📏 Que número está entre 5 000 e 5 100?","opts":["4 990","5 050","5 200"],"ans":1,"exp":"Entre 5 000 e 5 100."},
    {"id":"mp3_l3","s":"mat_plus","t":"Linha numérica até 10 000","type":"fill","diff":2,"q":"Salta de 100 em 100 a partir de 2 300: 2 300, 2 400, ___, 2 600","ans":["2 500","2500"],"exp":"Saltos de 100: só muda o algarismo das centenas — 2 400 → 2 500."},
    {"id":"mp3_l4","s":"mat_plus","t":"Linha numérica até 10 000","type":"mc","diff":1,"q":"📏 Antes de 6 000 vem:","opts":["5 999","6 001","7 000"],"ans":0,"exp":"O número antes de 6 000 é 5 999 (tira 1)."},
    {"id":"mp3_l5","s":"mat_plus","t":"Linha numérica até 10 000","type":"fill","diff":2,"q":"Salta de 1 000 em 1 000: 0, 1 000, 2 000, ___, 4 000","ans":["3 000","3000"],"exp":"Múltiplos de 1 000."},
    {"id":"mp3_l6","s":"mat_plus","t":"Linha numérica até 10 000","type":"mc","diff":2,"q":"📏 7 240 está mais perto de:","opts":["7 000","7 500","8 000"],"ans":0,"exp":"7 240 está a 240 de 7 000 e a 260 de 7 500 → mais perto de 7 000."},
    {"id":"mp3_l7","s":"mat_plus","t":"Linha numérica até 10 000","type":"mc","diff":1,"q":"📏 Depois de 9 999 vem:","opts":["10 000","9 998","99 990"],"ans":0,"exp":"Depois de 9 999 vem 10 000 — passa a ter 5 algarismos."},
    {"id":"mp3_l8","s":"mat_plus","t":"Linha numérica até 10 000","type":"tf","diff":1,"q":"5 500 está exatamente a meio entre 5 000 e 6 000.","ans":true,"exp":"Sim — ponto médio."},
    {"id":"mp3_l9","s":"mat_plus","t":"Linha numérica até 10 000","type":"mc","diff":2,"q":"📏 Salta de 50 em 50: 200, 250, ___, 350","opts":["275","300","305"],"ans":1,"exp":"250 + 50 = 300. Nos saltos de 50 as dezenas fazem 00 → 50 → 00…"},
    {"id":"mp3_l10","s":"mat_plus","t":"Linha numérica até 10 000","type":"fill","diff":2,"q":"4 700 + 100 = ___","ans":["4 800","4800"],"exp":"Salto de 100."},
    {"id":"mp3_cm1","s":"mat_plus","t":"Comparar números grandes","type":"mc","diff":1,"q":"🔢 Qual é MAIOR?","opts":["3 470","3 480"],"ans":1,"exp":"8 > 7 nas dezenas."},
    {"id":"mp3_cm2","s":"mat_plus","t":"Comparar números grandes","type":"mc","diff":1,"q":"🔢 Qual é MAIOR?","opts":["4 999","5 100"],"ans":1,"exp":"5 > 4 nos milhares."},
    {"id":"mp3_cm3","s":"mat_plus","t":"Comparar números grandes","type":"fill","diff":2,"q":"Põe > ou <: 6 234 ___ 6 432","ans":["<"],"exp":"2 < 4 nas centenas."},
    {"id":"mp3_cm4","s":"mat_plus","t":"Comparar números grandes","type":"fill","diff":2,"q":"Põe > ou <: 8 000 ___ 999","ans":[">"],"exp":"4 algarismos > 3."},
    {"id":"mp3_cm5","s":"mat_plus","t":"Comparar números grandes","type":"mc","diff":2,"q":"🔢 Menor → maior: 3 200, 3 020, 3 002.","opts":["3 200, 3 020, 3 002","3 002, 3 020, 3 200","3 020, 3 002, 3 200"],"ans":1,"exp":"Cuidado com o 0."},
    {"id":"mp3_cm6","s":"mat_plus","t":"Comparar números grandes","type":"mc","diff":2,"q":"🔢 Qual é MENOR?","opts":["1 005","1 050","1 500"],"ans":0,"exp":"1 005 < 1 050 < 1 500."},
    {"id":"mp3_cm7","s":"mat_plus","t":"Comparar números grandes","type":"tf","diff":1,"q":"9 999 > 10 000","ans":false,"exp":"Falso. 10 000 tem 5 algarismos."},
    {"id":"mp3_cm8","s":"mat_plus","t":"Comparar números grandes","type":"mc","diff":2,"q":"🔢 Maior n.º com 5, 2, 8, 1:","opts":["1 258","5 821","8 521"],"ans":2,"exp":"Maior à frente."},
    {"id":"mp3_cm9","s":"mat_plus","t":"Comparar números grandes","type":"mc","diff":2,"q":"🔢 Menor n.º com 5, 2, 8, 1:","opts":["1 258","1 285","2 158"],"ans":0,"exp":"Para o MENOR número, ordena os algarismos do menor para o maior: 1, 2, 5, 8 → 1 258."},
    {"id":"mp3_cm10","s":"mat_plus","t":"Comparar números grandes","type":"fill","diff":2,"q":"Põe = ou ≠ (podes escrever 'diferente'): 3 500 ___ 3 050","ans":["≠","<>","!=","diferente","diferentes"],"exp":"Diferentes."},
    {"id":"mp3_ap1","s":"mat_plus","t":"Aproximar à dezena ou centena","type":"mc","diff":1,"q":"🎯 Aproxima 47 à dezena:","opts":["40","50"],"ans":1,"exp":"7 ≥ 5 → sobe."},
    {"id":"mp3_ap2","s":"mat_plus","t":"Aproximar à dezena ou centena","type":"mc","diff":1,"q":"🎯 Aproxima 42 à dezena:","opts":["40","50"],"ans":0,"exp":"2 < 5 → desce."},
    {"id":"mp3_ap3","s":"mat_plus","t":"Aproximar à dezena ou centena","type":"mc","diff":2,"q":"🎯 Aproxima 35 à dezena:","opts":["30","40"],"ans":1,"exp":"Regra dos 5 → sobe."},
    {"id":"mp3_ap4","s":"mat_plus","t":"Aproximar à dezena ou centena","type":"fill","diff":2,"q":"Aproxima 78 à dezena: ___","ans":["80"],"exp":"8 ≥ 5."},
    {"id":"mp3_ap5","s":"mat_plus","t":"Aproximar à dezena ou centena","type":"mc","diff":2,"q":"🎯 Aproxima 347 à centena:","opts":["300","400"],"ans":0,"exp":"4 dezenas < 5 → desce."},
    {"id":"mp3_ap6","s":"mat_plus","t":"Aproximar à dezena ou centena","type":"mc","diff":2,"q":"🎯 Aproxima 372 à centena:","opts":["300","400"],"ans":1,"exp":"7 dezenas ≥ 5 → sobe."},
    {"id":"mp3_ap7","s":"mat_plus","t":"Aproximar à dezena ou centena","type":"fill","diff":2,"q":"Aproxima 650 à centena: ___","ans":["700"],"exp":"5 dezenas → sobe."},
    {"id":"mp3_ap8","s":"mat_plus","t":"Aproximar à dezena ou centena","type":"mc","diff":2,"q":"🎯 Estima 198 + 47 (à dezena):","opts":["200 + 50 = 250","200 + 40 = 240","190 + 50 = 240"],"ans":0,"exp":"Arredonda à dezena: 198≈200 e 47≈50 → 200 + 50 = 250."},
    {"id":"mp3_ap9","s":"mat_plus","t":"Aproximar à dezena ou centena","type":"tf","diff":1,"q":"Aproximar dá um valor próximo, não exato.","ans":true,"exp":"Verdade."},
    {"id":"mp3_ap10","s":"mat_plus","t":"Aproximar à dezena ou centena","type":"fill","diff":2,"q":"Aproxima 23 à dezena: ___","ans":["20"],"exp":"3 < 5 → desce."},
    {"id":"mp3_ad1","s":"mat_plus","t":"Adição com transporte","type":"mc","diff":2,"q":"🔢 248 + 175 =","opts":["413","423","433"],"ans":1,"exp":"248 + 175 = 423. Soma por colunas da direita para a esquerda e transporta 1 quando passas de 9."},
    {"id":"mp3_ad2","s":"mat_plus","t":"Adição com transporte","type":"mc","diff":2,"q":"🔢 367 + 459 =","opts":["716","826","836"],"ans":1,"exp":"367 + 459 = 826. Soma por colunas da direita para a esquerda e transporta 1 quando passas de 9."},
    {"id":"mp3_ad3","s":"mat_plus","t":"Adição com transporte","type":"problem","diff":2,"q":"A Ana tem 248 cromos e o Bruno 175. Quantos AO TODO?","ans":["423","423 cromos"],"exp":"248 + 175 = 423."},
    {"id":"mp3_ad4","s":"mat_plus","t":"Adição com transporte","type":"mc","diff":1,"q":"🔢 Quando 8+5=13, transportamos:","opts":["o 1","o 3","o 13"],"ans":0,"exp":"Transporta 1."},
    {"id":"mp3_ad5","s":"mat_plus","t":"Adição com transporte","type":"fill","diff":2,"q":"156 + 234 = ___","ans":["390"],"exp":"Soma por ordens: 6+4=10 (escreve 0, vai 1); 5+3+1=9; 1+2=3 → 390."},
    {"id":"mp3_ad6","s":"mat_plus","t":"Adição com transporte","type":"mc","diff":2,"q":"🔢 1 248 + 537 =","opts":["1 685","1 785","1 815"],"ans":1,"exp":"1 248 + 537 = 1 785. Soma por colunas da direita para a esquerda e transporta 1 quando passas de 9."},
    {"id":"mp3_ad7","s":"mat_plus","t":"Adição com transporte","type":"problem","diff":2,"q":"Fábrica fez 1 234 + 1 856 bonecos. Total?","ans":["3 090","3 090 bonecos"],"exp":"Parte em passos: 1 234 + 1 800 = 3 034; 3 034 + 56 = 3 090."},
    {"id":"mp3_ad8","s":"mat_plus","t":"Adição com transporte","type":"tf","diff":1,"q":"O transporte vai para a coluna seguinte à esquerda.","ans":true,"exp":"Sim."},
    {"id":"mp3_ad9","s":"mat_plus","t":"Adição com transporte","type":"mc","diff":2,"q":"🔢 998 + 247 =","opts":["1 245","1 235","1 145"],"ans":0,"exp":"998 + 247 = 1 245. Soma por colunas da direita para a esquerda e transporta 1 quando passas de 9."},
    {"id":"mp3_ad10","s":"mat_plus","t":"Adição com transporte","type":"fill","diff":2,"q":"457 + 348 = ___","ans":["805"],"exp":"7+8=15 (escreve 5, vai 1); 5+4+1=10 (escreve 0, vai 1); 4+3+1=8 → 805."},
    {"id":"mp3_sb1","s":"mat_plus","t":"Subtração com empréstimo","type":"mc","diff":2,"q":"🔢 524 − 187 =","opts":["327","337","437"],"ans":1,"exp":"524 − 187 = 337. Subtrai por colunas; quando o de cima é menor, pede 1 dezena emprestada à coluna ao lado."},
    {"id":"mp3_sb2","s":"mat_plus","t":"Subtração com empréstimo","type":"mc","diff":2,"q":"🔢 1 000 − 347 =","opts":["653","663","753"],"ans":0,"exp":"1 000 − 347 = 653. Subtrai por colunas; quando o de cima é menor, pede 1 dezena emprestada à coluna ao lado."},
    {"id":"mp3_sb3","s":"mat_plus","t":"Subtração com empréstimo","type":"problem","diff":2,"q":"O João tinha 542 € e gastou 178 €. Com quanto fica?","ans":["364","364 €","364€"],"exp":"542 − 178 = 364."},
    {"id":"mp3_sb4","s":"mat_plus","t":"Subtração com empréstimo","type":"mc","diff":1,"q":"🔢 Quando 4 < 7, eu:","opts":["troco os números da conta","peço emprestado à coluna ao lado","salto essa coluna e sigo"],"ans":1,"exp":"Emprestado."},
    {"id":"mp3_sb5","s":"mat_plus","t":"Subtração com empréstimo","type":"fill","diff":2,"q":"436 − 158 = ___","ans":["278"],"exp":"6−8 não dá → pede emprestado: 16−8=8; 12−5=7; 3−1=2 → 278."},
    {"id":"mp3_sb6","s":"mat_plus","t":"Subtração com empréstimo","type":"mc","diff":2,"q":"🔢 800 − 245 =","opts":["545","555","655"],"ans":1,"exp":"800 − 245 = 555. Subtrai por colunas; quando o de cima é menor, pede 1 dezena emprestada à coluna ao lado."},
    {"id":"mp3_sb7","s":"mat_plus","t":"Subtração com empréstimo","type":"problem","diff":2,"q":"Livro tem 312 páginas. Li 178. Faltam?","ans":["134","134 páginas"],"exp":"Conta por saltos: 178 + 22 = 200; 200 + 112 = 312 → 22 + 112 = 134 páginas."},
    {"id":"mp3_sb8","s":"mat_plus","t":"Subtração com empréstimo","type":"tf","diff":2,"q":"Posso confirmar: resultado + subtraendo = minuendo.","ans":true,"exp":"Teste da soma."},
    {"id":"mp3_sb9","s":"mat_plus","t":"Subtração com empréstimo","type":"mc","diff":2,"q":"🔢 605 − 248 =","opts":["357","367","457"],"ans":0,"exp":"605 − 248 = 357. Subtrai por colunas; quando o de cima é menor, pede 1 dezena emprestada à coluna ao lado."},
    {"id":"mp3_sb10","s":"mat_plus","t":"Subtração com empréstimo","type":"fill","diff":2,"q":"923 − 467 = ___","ans":["456"],"exp":"13−7=6; 11−6=5; 8−4=4 → 456. Verifica ao contrário: 456 + 467 = 923 ✓"},
    {"id":"mp3_t61","s":"mat_plus","t":"Tabuada do 6 visual","type":"mc","diff":1,"q":"🔢 6 × 7 =","opts":["36","42","48"],"ans":1,"exp":"6 × 7 = 42. Truque: 5 × 7 + 7 = 35 + 7 = 42."},
    {"id":"mp3_t62","s":"mat_plus","t":"Tabuada do 6 visual","type":"mc","diff":1,"q":"🔢 6 × 8 =","opts":["42","48","54"],"ans":1,"exp":"8 × 6 = 48. É o dobro de 4 × 6 (= 24): 24 + 24 = 48."},
    {"id":"mp3_t63","s":"mat_plus","t":"Tabuada do 6 visual","type":"mc","diff":1,"q":"🔢 6 × 9 =","opts":["48","54","60"],"ans":1,"exp":"9 × 6 = 54. Truque do 9: 10 × 6 − 6 = 60 − 6 = 54."},
    {"id":"mp3_t64","s":"mat_plus","t":"Tabuada do 6 visual","type":"fill","diff":2,"q":"6 × 5 = ___","ans":["30"],"exp":"6 × 5 = 30. Truque: é metade de 6 × 10 (60 → 30)."},
    {"id":"mp3_t65","s":"mat_plus","t":"Tabuada do 6 visual","type":"fill","diff":2,"q":"6 × 6 = ___","ans":["36"],"exp":"6 × 6 = 36. Dobra o 3 × 6: 18 + 18 = 36."},
    {"id":"mp3_t66","s":"mat_plus","t":"Tabuada do 6 visual","type":"problem","diff":2,"q":"4 caixas de 6 ovos. Quantos ovos?","ans":["24","24 ovos"],"exp":"4 × 6 = 24 ovos. Conta de 6 em 6: 6, 12, 18, 24."},
    {"id":"mp3_t67","s":"mat_plus","t":"Tabuada do 6 visual","type":"mc","diff":1,"q":"🔢 6 × 10 =","opts":["16","60","610"],"ans":1,"exp":"6 × 10 = 60. Truque: 5 × 10 + 10 = 50 + 10 = 60."},
    {"id":"mp3_t68","s":"mat_plus","t":"Tabuada do 6 visual","type":"tf","diff":2,"q":"A tabuada do 6 dá sempre números pares.","ans":true,"exp":"6 é par."},
    {"id":"mp3_t69","s":"mat_plus","t":"Tabuada do 6 visual","type":"fill","diff":2,"q":"6 × ? = 42. ? = ___","ans":["7"],"exp":"42÷6=7."},
    {"id":"mp3_t610","s":"mat_plus","t":"Tabuada do 6 visual","type":"mc","diff":1,"q":"🔢 6 × 4 =","opts":["18","24","30"],"ans":1,"exp":"6 × 4 = 24. Truque: 5 × 4 + 4 = 20 + 4 = 24."},
    {"id":"mp3_t71","s":"mat_plus","t":"Tabuada do 7 visual","type":"mc","diff":1,"q":"🔢 7 × 6 =","opts":["36","42","48"],"ans":1,"exp":"6 × 7 = 42. Truque: 5 × 7 + 7 = 35 + 7 = 42."},
    {"id":"mp3_t72","s":"mat_plus","t":"Tabuada do 7 visual","type":"mc","diff":1,"q":"🔢 7 × 8 =","opts":["54","56","64"],"ans":1,"exp":"8 × 7 = 56. É o dobro de 4 × 7 (= 28): 28 + 28 = 56."},
    {"id":"mp3_t73","s":"mat_plus","t":"Tabuada do 7 visual","type":"mc","diff":1,"q":"🔢 7 × 7 =","opts":["42","49","56"],"ans":1,"exp":"7 × 7 = 49. Truque: 5 × 7 + 2 × 7 = 35 + 14 = 49."},
    {"id":"mp3_t74","s":"mat_plus","t":"Tabuada do 7 visual","type":"fill","diff":2,"q":"7 × 5 = ___","ans":["35"],"exp":"7 × 5 = 35. Metade de 7 × 10 (70 → 35)."},
    {"id":"mp3_t75","s":"mat_plus","t":"Tabuada do 7 visual","type":"fill","diff":2,"q":"7 × 9 = ___","ans":["63"],"exp":"7 × 9 = 63. Truque do 9: 7 × 10 − 7 = 70 − 7 = 63."},
    {"id":"mp3_t76","s":"mat_plus","t":"Tabuada do 7 visual","type":"problem","diff":2,"q":"5 semanas têm ___ dias.","ans":["35","35 dias"],"exp":"5×7=35."},
    {"id":"mp3_t77","s":"mat_plus","t":"Tabuada do 7 visual","type":"mc","diff":1,"q":"🔢 7 × 4 =","opts":["21","28","35"],"ans":1,"exp":"7 × 4 = 28. Truque: 5 × 4 + 2 × 4 = 20 + 8 = 28."},
    {"id":"mp3_t78","s":"mat_plus","t":"Tabuada do 7 visual","type":"fill","diff":2,"q":"7 × ? = 63. ? = ___","ans":["9"],"exp":"Pensa ao contrário: 7 × 9 = 63 (70 − 7) → o número que falta é 9."},
    {"id":"mp3_t79","s":"mat_plus","t":"Tabuada do 7 visual","type":"mc","diff":1,"q":"🔢 7 × 3 =","opts":["18","21","24"],"ans":1,"exp":"7 × 3 = 21. Truque: 5 × 3 + 2 × 3 = 15 + 6 = 21."},
    {"id":"mp3_t710","s":"mat_plus","t":"Tabuada do 7 visual","type":"mc","diff":1,"q":"🔢 7 × 10 =","opts":["7","70","700"],"ans":1,"exp":"7 × 10 = 70. Truque: 5 × 10 + 2 × 10 = 50 + 20 = 70."},
    {"id":"mp3_t81","s":"mat_plus","t":"Tabuada do 8 visual","type":"mc","diff":1,"q":"🔢 8 × 7 =","opts":["48","56","64"],"ans":1,"exp":"8 × 7 = 56. É o dobro de 4 × 7 (= 28): 28 + 28 = 56."},
    {"id":"mp3_t82","s":"mat_plus","t":"Tabuada do 8 visual","type":"mc","diff":1,"q":"🔢 8 × 8 =","opts":["56","64","72"],"ans":1,"exp":"8 × 8 = 64. É o dobro de 4 × 8 (= 32): 32 + 32 = 64."},
    {"id":"mp3_t83","s":"mat_plus","t":"Tabuada do 8 visual","type":"mc","diff":1,"q":"🔢 8 × 9 =","opts":["64","72","80"],"ans":1,"exp":"9 × 8 = 72. Truque do 9: 10 × 8 − 8 = 80 − 8 = 72."},
    {"id":"mp3_t84","s":"mat_plus","t":"Tabuada do 8 visual","type":"fill","diff":2,"q":"8 × 5 = ___","ans":["40"],"exp":"8 × 5 = 40. Metade de 8 × 10 (80 → 40)."},
    {"id":"mp3_t85","s":"mat_plus","t":"Tabuada do 8 visual","type":"fill","diff":2,"q":"8 × 6 = ___","ans":["48"],"exp":"8 × 6 = 48. Dobra o 8 × 3: 24 + 24 = 48."},
    {"id":"mp3_t86","s":"mat_plus","t":"Tabuada do 8 visual","type":"problem","diff":2,"q":"3 polvos (8 patas cada). Quantas patas?","ans":["24","24 patas"],"exp":"3 × 8 = 24 patas. Conta de 8 em 8: 8, 16, 24."},
    {"id":"mp3_t87","s":"mat_plus","t":"Tabuada do 8 visual","type":"mc","diff":1,"q":"🔢 8 × 4 =","opts":["28","32","40"],"ans":1,"exp":"8 × 4 = 32. É o dobro de 4 × 4 (= 16): 16 + 16 = 32."},
    {"id":"mp3_t88","s":"mat_plus","t":"Tabuada do 8 visual","type":"fill","diff":2,"q":"8 × ? = 56. ? = ___","ans":["7"],"exp":"8 × 7 = 56 → falta o 7. Truque para fixar: 5-6-7-8 (56 = 7 × 8)!"},
    {"id":"mp3_t89","s":"mat_plus","t":"Tabuada do 8 visual","type":"mc","diff":1,"q":"🔢 8 × 3 =","opts":["18","24","32"],"ans":1,"exp":"8 × 3 = 24. É o dobro de 4 × 3 (= 12): 12 + 12 = 24."},
    {"id":"mp3_t810","s":"mat_plus","t":"Tabuada do 8 visual","type":"mc","diff":1,"q":"🔢 8 × 10 =","opts":["8","80","800"],"ans":1,"exp":"8 × 10 = 80. É o dobro de 4 × 10 (= 40): 40 + 40 = 80."},
    {"id":"mp3_t91","s":"mat_plus","t":"Tabuada do 9 visual","type":"mc","diff":1,"q":"🔢 9 × 6 =","opts":["48","54","63"],"ans":1,"exp":"9 × 6 = 54. Truque do 9: 10 × 6 − 6 = 60 − 6 = 54."},
    {"id":"mp3_t92","s":"mat_plus","t":"Tabuada do 9 visual","type":"mc","diff":1,"q":"🔢 9 × 7 =","opts":["56","63","72"],"ans":1,"exp":"9 × 7 = 63. Truque do 9: 10 × 7 − 7 = 70 − 7 = 63."},
    {"id":"mp3_t93","s":"mat_plus","t":"Tabuada do 9 visual","type":"mc","diff":1,"q":"🔢 9 × 8 =","opts":["63","72","81"],"ans":1,"exp":"9 × 8 = 72. Truque do 9: 10 × 8 − 8 = 80 − 8 = 72."},
    {"id":"mp3_t94","s":"mat_plus","t":"Tabuada do 9 visual","type":"mc","diff":1,"q":"🔢 9 × 9 =","opts":["72","81","90"],"ans":1,"exp":"9 × 9 = 81. Truque do 9: 10 × 9 − 9 = 90 − 9 = 81."},
    {"id":"mp3_t95","s":"mat_plus","t":"Tabuada do 9 visual","type":"fill","diff":2,"q":"9 × 4 = 36. Soma dos algarismos = ___","ans":["9"],"exp":"36 → 3 + 6 = 9. Truque: nos múltiplos de 9, a soma dos algarismos dá sempre 9!"},
    {"id":"mp3_t96","s":"mat_plus","t":"Tabuada do 9 visual","type":"problem","diff":2,"q":"6 caixas de 9 lápis. Total?","ans":["54","54 lápis"],"exp":"6 × 9 = 54 lápis. Truque do 9: 6 × 10 − 6 = 60 − 6 = 54."},
    {"id":"mp3_t97","s":"mat_plus","t":"Tabuada do 9 visual","type":"tf","diff":2,"q":"Na tabuada do 9, o algarismo das dezenas = n − 1.","ans":true,"exp":"9×7=63: 6=7−1."},
    {"id":"mp3_t98","s":"mat_plus","t":"Tabuada do 9 visual","type":"fill","diff":2,"q":"9 × ? = 81. ? = ___","ans":["9"],"exp":"9 × 9 = 81 → falta o 9. Truque: 9 × 10 − 9 = 90 − 9 = 81."},
    {"id":"mp3_t99","s":"mat_plus","t":"Tabuada do 9 visual","type":"mc","diff":1,"q":"🔢 9 × 3 =","opts":["18","27","36"],"ans":1,"exp":"9 × 3 = 27. Truque do 9: 10 × 3 − 3 = 30 − 3 = 27."},
    {"id":"mp3_t910","s":"mat_plus","t":"Tabuada do 9 visual","type":"mc","diff":1,"q":"🔢 9 × 10 =","opts":["9","90","900"],"ans":1,"exp":"9 × 10 = 90. Truque do 9: 10 × 10 − 10 = 100 − 10 = 90."},
    {"id":"mp3_ff0","s":"mat_plus","t":"Famílias de factos","type":"mc","diff":1,"q":"🔢 2 × 3 = 6. Que outra conta usa os MESMOS três números?","opts":["6 ÷ 2 = 3","6 + 2 = 8","3 − 2 = 1"],"ans":0,"exp":"2, 3 e 6 são uma família: 2×3=6, 3×2=6, 6÷2=3 e 6÷3=2. A divisão desfaz a multiplicação — são as mesmas 3 cartas!"},
    {"id":"mp3_ff1","s":"mat_plus","t":"Famílias de factos","type":"mc","diff":2,"q":"🔢 Sabes 4 × 6 = 24. Logo 24 ÷ 4 =","opts":["4","6","24"],"ans":1,"exp":"24÷4=6."},
    {"id":"mp3_ff2","s":"mat_plus","t":"Famílias de factos","type":"mc","diff":2,"q":"🔢 Sabes 7 × 8 = 56. Logo 56 ÷ 8 =","opts":["6","7","8"],"ans":1,"exp":"56÷8=7."},
    {"id":"mp3_ff3","s":"mat_plus","t":"Famílias de factos","type":"fill","diff":2,"q":"Família 5, 6, 30: 30 ÷ 6 = ___","ans":["5"],"exp":"Família 5, 6, 30: se 5 × 6 = 30, então 30 ÷ 6 = 5. A divisão desfaz a multiplicação."},
    {"id":"mp3_ff4","s":"mat_plus","t":"Famílias de factos","type":"mc","diff":2,"q":"🔢 Qual NÃO pertence à família 3, 4, 12?","opts":["3 × 4 = 12","12 ÷ 3 = 4","12 + 4 = 16"],"ans":2,"exp":"Adição não faz parte."},
    {"id":"mp3_ff5","s":"mat_plus","t":"Famílias de factos","type":"tf","diff":2,"q":"Cada família tem 4 contas (2 × e 2 ÷).","ans":true,"exp":"Sim."},
    {"id":"mp3_ff6","s":"mat_plus","t":"Famílias de factos","type":"fill","diff":2,"q":"8 × 9 = 72. Então 72 ÷ 9 = ___","ans":["8"],"exp":"Mesma família de factos: 8 × 9 = 72 → 72 ÷ 9 = 8. São as mesmas 3 cartas."},
    {"id":"mp3_ff7","s":"mat_plus","t":"Famílias de factos","type":"mc","diff":2,"q":"🔢 Família 7 × 4 = 28. Outra conta:","opts":["28 × 4 = 112","28 ÷ 7 = 4","7 + 4 = 11"],"ans":1,"exp":"7, 4 e 28 são uma família de factos: a divisão desfaz a multiplicação. Se 7×4=28, então 28÷7=4 e 28÷4=7."},
    {"id":"mp3_x10_1","s":"mat_plus","t":"Multiplicação × 10, 100, 1000","type":"mc","diff":1,"q":"🔢 23 × 10 =","opts":["203","230","2 300"],"ans":1,"exp":"+1 zero."},
    {"id":"mp3_x10_2","s":"mat_plus","t":"Multiplicação × 10, 100, 1000","type":"mc","diff":1,"q":"🔢 23 × 100 =","opts":["230","2 300","23 000"],"ans":1,"exp":"+2 zeros."},
    {"id":"mp3_x10_3","s":"mat_plus","t":"Multiplicação × 10, 100, 1000","type":"mc","diff":1,"q":"🔢 7 × 1 000 =","opts":["700","7 000","70 000"],"ans":1,"exp":"+3 zeros."},
    {"id":"mp3_x10_4","s":"mat_plus","t":"Multiplicação × 10, 100, 1000","type":"fill","diff":2,"q":"40 × 10 = ___","ans":["400"],"exp":"× 10 → acrescenta um zero: 40 → 400."},
    {"id":"mp3_x10_5","s":"mat_plus","t":"Multiplicação × 10, 100, 1000","type":"fill","diff":2,"q":"5 × 100 = ___","ans":["500"],"exp":"× 100 → acrescenta dois zeros: 5 → 500."},
    {"id":"mp3_x10_6","s":"mat_plus","t":"Multiplicação × 10, 100, 1000","type":"mc","diff":1,"q":"🔢 8 × 1 000 =","opts":["80","800","8 000"],"ans":2,"exp":"+3 zeros."},
    {"id":"mp3_x10_7","s":"mat_plus","t":"Multiplicação × 10, 100, 1000","type":"tf","diff":1,"q":"5 + 10 = 50.","ans":false,"exp":"Falso — 5+10=15."},
    {"id":"mp3_x10_8","s":"mat_plus","t":"Multiplicação × 10, 100, 1000","type":"problem","diff":2,"q":"8 sacos × 100 caramelos. Quantos?","ans":["800","800 caramelos"],"exp":"8 × 100 = 800 caramelos. × 100 acrescenta dois zeros."},
    {"id":"mp3_x10_9","s":"mat_plus","t":"Multiplicação × 10, 100, 1000","type":"mc","diff":1,"q":"🔢 30 × 100 =","opts":["300","3 000","30 000"],"ans":1,"exp":"3 000. Multiplicar por 100 acrescenta dois zeros."},
    {"id":"mp3_x10_10","s":"mat_plus","t":"Multiplicação × 10, 100, 1000","type":"fill","diff":2,"q":"4 × 1 000 = ___","ans":["4 000","4000"],"exp":"× 1 000 → acrescenta três zeros: 4 → 4 000."},
    {"id":"mp3_m1d0","s":"mat_plus","t":"Multiplicação por 1 dígito","type":"mc","diff":1,"q":"✖️ 3 × 2 é o mesmo que:","opts":["2 + 2 + 2","3 + 2","2 + 3"],"ans":0,"exp":"Multiplicar é somar grupos iguais: 3 × 2 são 3 grupos de 2 → 2+2+2 = 6. Vê os grupos: 🍎🍎 | 🍎🍎 | 🍎🍎"},
    {"id":"mp3_m1d1","s":"mat_plus","t":"Multiplicação por 1 dígito","type":"mc","diff":2,"q":"🔢 234 × 3 =","opts":["602","702","802"],"ans":1,"exp":"234 × 3 = 702. Multiplica cada algarismo por 3 (3×4=12, 3×3=9+1, 3×2=6) e transporta."},
    {"id":"mp3_m1d2","s":"mat_plus","t":"Multiplicação por 1 dígito","type":"mc","diff":2,"q":"🔢 158 × 4 =","opts":["532","632","732"],"ans":1,"exp":"158 × 4 = 632. Por colunas: 4×8=32 (vai 3), 4×5=20+3=23 (vai 2), 4×1=4+2=6."},
    {"id":"mp3_m1d3","s":"mat_plus","t":"Multiplicação por 1 dígito","type":"problem","diff":2,"q":"6 caixas de 145 lápis. Total?","ans":["870","870 lápis"],"exp":"Parte por ordens: 6×100=600, 6×40=240, 6×5=30 → 600+240+30 = 870."},
    {"id":"mp3_m1d4","s":"mat_plus","t":"Multiplicação por 1 dígito","type":"fill","diff":2,"q":"124 × 5 = ___","ans":["620"],"exp":"124 × 5: 100×5=500, 20×5=100, 4×5=20 → 500+100+20 = 620."},
    {"id":"mp3_m1d5","s":"mat_plus","t":"Multiplicação por 1 dígito","type":"mc","diff":2,"q":"🔢 312 × 3 =","opts":["836","936","906"],"ans":1,"exp":"312 × 3 = 936. 3×2=6, 3×1=3, 3×3=9 — sem transporte aqui."},
    {"id":"mp3_m1d6","s":"mat_plus","t":"Multiplicação por 1 dígito","type":"mc","diff":2,"q":"🔢 Estima 423 × 5:","opts":["~ 1 500","~ 2 100","~ 3 000"],"ans":1,"exp":"400×5=2 000."},
    {"id":"mp3_m1d7","s":"mat_plus","t":"Multiplicação por 1 dígito","type":"problem","diff":2,"q":"5 turmas × 28 alunos. Total?","ans":["140","140 alunos"],"exp":"5 × 28: 5×20=100 e 5×8=40 → 100+40 = 140 alunos."},
    {"id":"mp3_m1d8","s":"mat_plus","t":"Multiplicação por 1 dígito","type":"fill","diff":2,"q":"207 × 4 = ___","ans":["828"],"exp":"207 × 4: 200×4=800 e 7×4=28 → 828 (o 0 do meio não soma nada)."},
    {"id":"mp3_m1d9","s":"mat_plus","t":"Multiplicação por 1 dígito","type":"mc","diff":2,"q":"🔢 89 × 6 =","opts":["534","524","484"],"ans":0,"exp":"89 × 6 = 534. 6×9=54 (vai 5), 6×8=48+5=53. Junta → 534."},
    {"id":"mp3_m1d10","s":"mat_plus","t":"Multiplicação por 1 dígito","type":"problem","diff":2,"q":"7 dias × 24 horas. Quantas horas em 1 semana?","ans":["168","168 horas"],"exp":"7 × 24: 7×20=140 e 7×4=28 → 140+28 = 168 horas."},
    {"id":"mp3_dp0","s":"mat_plus","t":"Divisão por partilha","type":"mc","diff":1,"q":"🍬 6 rebuçados para 2 amigos, em partes iguais. Quantos para cada um?","opts":["2","3","4"],"ans":1,"exp":"Reparte um a um: 🍬🍬🍬 | 🍬🍬🍬 → 3 para cada. 6 ÷ 2 = 3. Dividir é repartir igualmente."},
    {"id":"mp3_dp1","s":"mat_plus","t":"Divisão por partilha","type":"mc","diff":1,"q":"🔢 12 ÷ 3 =","opts":["3","4","5"],"ans":1,"exp":"12 ÷ 3 = 4. Repartes 12 em 3 grupos iguais → 4 em cada (3×4=12)."},
    {"id":"mp3_dp2","s":"mat_plus","t":"Divisão por partilha","type":"mc","diff":1,"q":"🔢 36 ÷ 6 =","opts":["5","6","7"],"ans":1,"exp":"36 ÷ 6 = 6. Repartes 36 por 6 grupos iguais → 6 em cada (6×6=36)."},
    {"id":"mp3_dp3","s":"mat_plus","t":"Divisão por partilha","type":"problem","diff":2,"q":"24 cromos para 4 amigos. Quantos por amigo?","ans":["6","6 cromos"],"exp":"24÷4=6."},
    {"id":"mp3_dp4","s":"mat_plus","t":"Divisão por partilha","type":"fill","diff":2,"q":"56 ÷ 8 = ___","ans":["7"],"exp":"56 ÷ 8 = 7. Pensa na tabuada: 8 × ? = 56 → 7 (5-6-7-8!)."},
    {"id":"mp3_dp5","s":"mat_plus","t":"Divisão por partilha","type":"mc","diff":2,"q":"🔢 35 ÷ 7 =","opts":["4","5","6"],"ans":1,"exp":"35 ÷ 7 = 5. Repartes 35 por 7 grupos iguais → 5 em cada (7×5=35)."},
    {"id":"mp3_dp6","s":"mat_plus","t":"Divisão por partilha","type":"problem","diff":2,"q":"100 cartas em 5 envelopes iguais. Por envelope?","ans":["20","20 cartas"],"exp":"100 ÷ 5 = 20 cartas. Pensa ao contrário: 5 × 20 = 100."},
    {"id":"mp3_dp7","s":"mat_plus","t":"Divisão por partilha","type":"fill","diff":2,"q":"81 ÷ 9 = ___","ans":["9"],"exp":"81 ÷ 9 = 9. Tabuada: 9 × 9 = 81."},
    {"id":"mp3_dp8","s":"mat_plus","t":"Divisão por partilha","type":"tf","diff":1,"q":"Divisão é a operação inversa da multiplicação.","ans":true,"exp":"Verdade."},
    {"id":"mp3_dp9","s":"mat_plus","t":"Divisão por partilha","type":"mc","diff":1,"q":"🔢 48 ÷ 6 =","opts":["7","8","9"],"ans":1,"exp":"48 ÷ 6 = 8. 6×8=48 → 8 em cada grupo."},
    {"id":"mp3_dp10","s":"mat_plus","t":"Divisão por partilha","type":"problem","diff":2,"q":"63 berlindes em 7 sacos iguais. Por saco?","ans":["9","9 berlindes"],"exp":"63 ÷ 7 = 9 berlindes. Tabuada: 7 × 9 = 63."},
    {"id":"mp3_dr0","s":"mat_plus","t":"Divisão com resto","type":"mc","diff":1,"q":"🍪 Tens 7 bolachas para 2 amigos. Cada um recebe 3 e sobra…","opts":["1 bolacha","2 bolachas","0 bolachas"],"ans":0,"exp":"2 amigos × 3 bolachas = 6 dadas. 7 − 6 = 1 → sobra 1. O RESTO é o que sobra quando não dá para repartir igualzinho."},
    {"id":"mp3_dr1","s":"mat_plus","t":"Divisão com resto","type":"mc","diff":2,"q":"🔢 23 ÷ 4: Q e R?","opts":["5 e 3","6 e 0","5 e 4"],"ans":0,"exp":"4×5=20; resto 3."},
    {"id":"mp3_dr2","s":"mat_plus","t":"Divisão com resto","type":"mc","diff":2,"q":"🔢 35 ÷ 6: Q e R?","opts":["5 e 5","6 e 0","5 e 4"],"ans":0,"exp":"6×5=30; resto 5."},
    {"id":"mp3_dr3","s":"mat_plus","t":"Divisão com resto","type":"problem","diff":2,"q":"17 bombons em 5 caixas iguais. Q e R?","ans":["3 e 2","3 bombons, 2 sobram"],"exp":"3 e 2."},
    {"id":"mp3_dr4","s":"mat_plus","t":"Divisão com resto","type":"tf","diff":2,"q":"O resto tem de ser MENOR que o divisor.","ans":true,"exp":"Senão dava para mais um grupo."},
    {"id":"mp3_dr5","s":"mat_plus","t":"Divisão com resto","type":"fill","diff":2,"q":"29 ÷ 7: quociente ___","ans":["4"],"exp":"7 × 4 = 28 é o que chega mais perto de 29 sem passar → quociente 4."},
    {"id":"mp3_dr6","s":"mat_plus","t":"Divisão com resto","type":"fill","diff":2,"q":"29 ÷ 7: resto ___","ans":["1"],"exp":"7 × 4 = 28; 29 − 28 = 1 → resto 1 (o que sobra)."},
    {"id":"mp3_dr7","s":"mat_plus","t":"Divisão com resto","type":"mc","diff":2,"q":"🔢 50 ÷ 8: Q e R?","opts":["6 e 2","6 e 0","7 e 0"],"ans":0,"exp":"50 ÷ 8: o 8 cabe 6 vezes (8×6=48) e sobram 2. Quociente 6, resto 2."},
    {"id":"mp3_dr8","s":"mat_plus","t":"Divisão com resto","type":"problem","diff":2,"q":"20 lápis em 6 estojos iguais. Quantos em cada e quantos sobram?","ans":["3 e 2","3 lápis, 2 sobram"],"exp":"3 e 2."},
    {"id":"mp3_f0a","s":"mat_plus","t":"Frações — partes iguais","type":"mc","diff":1,"q":"🍫 A tablete tem 4 quadrados e 1 está pintado: 🟫⬜⬜⬜. Que fração está pintada?","opts":["1/4","1/2","1/1"],"ans":0,"exp":"1 quadrado pintado em 4 no total → 1/4. Conta primeiro o total (4, em baixo) e depois os pintados (1, em cima)."},
    {"id":"mp3_f0b","s":"mat_plus","t":"Frações — partes iguais","type":"mc","diff":1,"q":"🍰 Metade do bolo: 🟩⬜. Que fração é 1 parte de 2 iguais?","opts":["1/2","2/1","1/4"],"ans":0,"exp":"1 parte de 2 partes iguais é 1/2 (metade). O 2 em baixo são as partes, o 1 em cima é a que contamos."},
    {"id":"mp3_f0c","s":"mat_plus","t":"Frações — partes iguais","type":"mc","diff":1,"q":"🟩🟩⬜ Estão pintados 2 de 3 quadrados. Que fração está pintada?","opts":["2/3","3/2","1/3"],"ans":0,"exp":"2 pintados em 3 no total → 2/3. Em cima o que está pintado (2), em baixo o total (3)."},
    {"id":"mp3_f1","s":"mat_plus","t":"Frações — partes iguais","type":"mc","diff":2,"q":"🍕 Piza em 4 partes iguais. Come 1. Fração comida?","opts":["1/4","4/1","3/4"],"ans":0,"exp":"Comeu 1 de 4 partes iguais → 1/4. O de baixo (4) são as partes totais, o de cima (1) as que comeu."},
    {"id":"mp3_f2","s":"mat_plus","t":"Frações — partes iguais","type":"mc","diff":2,"q":"🍕 Piza em 4. Come 1. Sobra?","opts":["1/4","3/4","4/4"],"ans":1,"exp":"Se comeu 1/4, sobram as outras 3 partes → 3/4 (1/4 + 3/4 = 4/4, a piza inteira)."},
    {"id":"mp3_f3","s":"mat_plus","t":"Frações — partes iguais","type":"fill","diff":2,"q":"Metade em fração: ___","ans":["1/2"],"exp":"1/2."},
    {"id":"mp3_f4","s":"mat_plus","t":"Frações — partes iguais","type":"fill","diff":2,"q":"3 quartos em fração: ___","ans":["3/4"],"exp":"3/4."},
    {"id":"mp3_f5","s":"mat_plus","t":"Frações — partes iguais","type":"mc","diff":2,"q":"🔢 Em 2/5, o \"2\" é o:","opts":["numerador","denominador","resto"],"ans":0,"exp":"Em 2/5, o número de cima (2) é o NUMERADOR — diz quantas partes se contam. O 5 é o denominador."},
    {"id":"mp3_f6","s":"mat_plus","t":"Frações — partes iguais","type":"tf","diff":1,"q":"Em frações as partes têm de ser IGUAIS.","ans":true,"exp":"Sim."},
    {"id":"mp3_f7","s":"mat_plus","t":"Frações — partes iguais","type":"mc","diff":2,"q":"🍰 Bolo em 8; come 3. Fração?","opts":["3/8","8/3","5/8"],"ans":0,"exp":"Bolo em 8 partes, come 3 → 3/8 (3 partes de 8)."},
    {"id":"mp3_f8","s":"mat_plus","t":"Frações — partes iguais","type":"mc","diff":2,"q":"🍫 Tablete 6 quadrados; come 2. Fração?","opts":["2/6","6/2","4/6"],"ans":0,"exp":"Tablete em 6 quadrados, come 2 → 2/6 (2 partes de 6)."},
    {"id":"mp3_f9","s":"mat_plus","t":"Frações — partes iguais","type":"mc","diff":2,"q":"🍕 Come 4/4 da piza. Comeu:","opts":["metade","um quarto","tudo"],"ans":2,"exp":"Numerador = denominador → o todo."},
    {"id":"mp3_f10","s":"mat_plus","t":"Frações — partes iguais","type":"fill","diff":2,"q":"Um quinto em fração: ___","ans":["1/5"],"exp":"1/5."},
    {"id":"mp3_fc0","s":"mat_plus","t":"Frações — comparar","type":"mc","diff":1,"q":"🍫 Duas tabletes iguais: numa comes 🟫⬜ (1/2), noutra 🟫⬜⬜⬜ (1/4). Onde comes MAIS?","opts":["1/2 (metade)","1/4 (um quarto)","comes igual"],"ans":0,"exp":"Quanto MAIOR o número de baixo, mais pequenos são os pedaços. 1/2 é meia tablete, 1/4 é só um bocadinho → 1/2 é mais."},
    {"id":"mp3_fc1","s":"mat_plus","t":"Frações — comparar","type":"mc","diff":2,"q":"🔢 MAIOR?","opts":["1/2","1/3","1/4"],"ans":0,"exp":"Quanto maior o denominador, mais pequenos os pedaços: 1/2 > 1/3 > 1/4. Partir em menos partes dá pedaços maiores."},
    {"id":"mp3_fc2","s":"mat_plus","t":"Frações — comparar","type":"mc","diff":2,"q":"🔢 MAIOR?","opts":["2/5","3/5"],"ans":1,"exp":"3 > 2."},
    {"id":"mp3_fc3","s":"mat_plus","t":"Frações — comparar","type":"fill","diff":2,"q":"Põe > ou <: 1/3 ___ 1/4","ans":[">"],"exp":"1/3 > 1/4."},
    {"id":"mp3_fc4","s":"mat_plus","t":"Frações — comparar","type":"fill","diff":2,"q":"Põe > ou <: 4/7 ___ 5/7","ans":["<"],"exp":"4 < 5."},
    {"id":"mp3_fc5","s":"mat_plus","t":"Frações — comparar","type":"mc","diff":2,"q":"🔢 Equivalente a 1/2:","opts":["2/4","1/3","3/5"],"ans":0,"exp":"2/4 = 1/2."},
    {"id":"mp3_fc6","s":"mat_plus","t":"Frações — comparar","type":"tf","diff":1,"q":"1/4 < 1/3.","ans":true,"exp":"Sim."},
    {"id":"mp3_fc7","s":"mat_plus","t":"Frações — comparar","type":"mc","diff":2,"q":"🔢 Ordena (menor → maior): 1/2, 1/4, 1/3","opts":["1/4, 1/3, 1/2","1/2, 1/3, 1/4","1/3, 1/4, 1/2"],"ans":0,"exp":"Maior denominador, menor."},
    {"id":"mp3_fc8","s":"mat_plus","t":"Frações — comparar","type":"fill","diff":2,"q":"Equivalente a 1/2 com denominador 6: ___","ans":["3/6"],"exp":"3/6."},
    {"id":"mp3_mb0","s":"mat_plus","t":"Modelo de barra","type":"mc","diff":1,"q":"📊 A barra toda vale 10. Uma parte vale 4. A outra parte vale:","opts":["6","4","10"],"ans":0,"exp":"Parte + parte = todo: 4 + ? = 10 → 6. No modelo de barra o todo fica em cima e as partes em baixo — vê o que falta para encher."},
    {"id":"mp3_mb1","s":"mat_plus","t":"Modelo de barra","type":"problem","diff":2,"q":"A Ana tem 5 e o Bruno 8. Ao todo?","ans":["13","13 cromos"],"exp":"Junta as duas partes: 5 + 8 = 13. Desenha a barra: [ 5 | 8 ] = 13."},
    {"id":"mp3_mb2","s":"mat_plus","t":"Modelo de barra","type":"problem","diff":2,"q":"O Pedro tinha 12 e deu 5. Fica com?","ans":["7","7 cromos"],"exp":"O todo é 12 e uma parte saiu (5): 12 − 5 = 7. Na barra: [ 5 | ? ] = 12 → ? = 7."},
    {"id":"mp3_mb3","s":"mat_plus","t":"Modelo de barra","type":"problem","diff":2,"q":"A Carla tem 24, mais 7 que o Tó. Quantos tem o Tó?","ans":["17","17 cromos"],"exp":"24 − 7 = 17."},
    {"id":"mp3_mb4","s":"mat_plus","t":"Modelo de barra","type":"problem","diff":2,"q":"O João tem 18, o triplo do Tomás. Quantos tem o Tomás?","ans":["6","6 cromos"],"exp":"Triplo = 3 vezes. Se 18 é o triplo, o Tomás tem 18 ÷ 3 = 6. Barra: [ 6 | 6 | 6 ] = 18."},
    {"id":"mp3_mb5","s":"mat_plus","t":"Modelo de barra","type":"mc","diff":2,"q":"📊 Total 30. Parte A = 12. Parte B?","opts":["12","18","30"],"ans":1,"exp":"O total (30) é a soma das duas partes. Se A = 12, então B = 30 − 12 = 18."},
    {"id":"mp3_mb6","s":"mat_plus","t":"Modelo de barra","type":"problem","diff":2,"q":"35 lápis: 14 azuis. Verdes?","ans":["21","21 lápis"],"exp":"O todo é 35: [ 14 azuis | ? verdes ] → 35 − 14 = 21 verdes."},
    {"id":"mp3_mb7","s":"mat_plus","t":"Modelo de barra","type":"problem","diff":2,"q":"A Eduarda tem 8 berlindes; a Carolina o dobro. Quantos tem a Carolina?","ans":["16","16 berlindes"],"exp":"Dobro = 2 vezes: 8 × 2 = 16 berlindes. Barra: [ 8 | 8 ]."},
    {"id":"mp3_p2_0","s":"mat_plus","t":"Problemas em 2 passos","type":"mc","diff":1,"q":"🪜 A Ana tinha 3 cromos e ganhou 2. Depois deu 1. Com quantos ficou?","opts":["4","5","6"],"ans":0,"exp":"Um passo de cada vez: passo 1 → 3 + 2 = 5; passo 2 → 5 − 1 = 4. Nos problemas de 2 passos, resolve o primeiro e usa o resultado no segundo."},
    {"id":"mp3_p2_1","s":"mat_plus","t":"Problemas em 2 passos","type":"problem","diff":2,"q":"A Carolina tem 24 €. Comprou 3 livros a 5 €. Fica?","ans":["9","9 €","9€"],"exp":"Passo 1: 3 × 5 = 15 € gastos. Passo 2: 24 − 15 = 9 €."},
    {"id":"mp3_p2_2","s":"mat_plus","t":"Problemas em 2 passos","type":"problem","diff":2,"q":"Autocarro com 32 pessoas. Saem 8, entram 5. Total?","ans":["29","29 pessoas"],"exp":"32 − 8 + 5 = 29."},
    {"id":"mp3_p2_3","s":"mat_plus","t":"Problemas em 2 passos","type":"problem","diff":2,"q":"O Pedro tinha 50 cromos. Comprou 4 pacotes × 6 cromos. Total?","ans":["74","74 cromos"],"exp":"50 + 24 = 74."},
    {"id":"mp3_p2_4","s":"mat_plus","t":"Problemas em 2 passos","type":"problem","diff":2,"q":"Tens 100 €. Compras 3 livros (15 € cada) e 1 caderno (8 €). Sobra?","ans":["47","47 €","47€"],"exp":"100 − 45 − 8 = 47."},
    {"id":"mp3_p2_5","s":"mat_plus","t":"Problemas em 2 passos","type":"problem","diff":2,"q":"25 alunos; faltam 7. Os presentes em 3 grupos iguais. Q e R?","ans":["Q=6, R=0","6 e 0","Q=6 R=0"],"exp":"Passo 1: 25 − 7 = 18 presentes. Passo 2: 18 ÷ 3 = 6 por grupo."},
    {"id":"mp3_p2_6","s":"mat_plus","t":"Problemas em 2 passos","type":"problem","diff":2,"q":"O João comeu 3 doces; o Pedro o dobro. Ao todo?","ans":["9","9 doces"],"exp":"Passo 1: o dobro de 3 é 6 (Pedro). Passo 2: 3 + 6 = 9 doces ao todo."},
    {"id":"mp3_p2_7","s":"mat_plus","t":"Problemas em 2 passos","type":"problem","diff":2,"q":"4 crianças partilham 5 kg + 3 kg. Cada uma?","ans":["2 kg","2","2kg"],"exp":"8 ÷ 4 = 2 kg."},
    {"id":"mp3_p2_8","s":"mat_plus","t":"Problemas em 2 passos","type":"problem","diff":2,"q":"A Eduarda corre 6 voltas; a Carolina o triplo + 2. Quantas a Carolina?","ans":["20","20 voltas"],"exp":"3×6 + 2 = 20."},

    // ============================ SOM+ 3.º (Consciência fonológica avançada) ===============================
    {"id":"sp3_r1","s":"som_plus","t":"Rimas com palavras longas","type":"mc","diff":2,"q":"🎵 Rima com \"borboleta\":","opts":["gata","coleta","casa"],"ans":1,"exp":"Acabam em \"-eta\"."},
    {"id":"sp3_r2","s":"som_plus","t":"Rimas com palavras longas","type":"mc","diff":2,"q":"🎵 Rima com \"passarinho\":","opts":["casinha","caminho","vizinho"],"ans":2,"exp":"Vizinho (-inho)."},
    {"id":"sp3_r3","s":"som_plus","t":"Rimas com palavras longas","type":"mc","diff":2,"q":"🎵 Rima com \"estudante\":","opts":["comerciante","feliz","casaco"],"ans":0,"exp":"Comerciante (-ante)."},
    {"id":"sp3_r4","s":"som_plus","t":"Rimas com palavras longas","type":"tf","diff":1,"q":"\"Floresta\" rima com \"festa\".","ans":true,"exp":"Ambas acabam em -esta."},
    {"id":"sp3_r5","s":"som_plus","t":"Rimas com palavras longas","type":"tf","diff":1,"q":"\"Família\" e \"filha\" rimam.","ans":false,"exp":"Não terminam igual."},
    {"id":"sp3_r6","s":"som_plus","t":"Rimas com palavras longas","type":"mc","diff":2,"q":"🎵 Que palavra rima com \"cantora\"?","opts":["história","professora","amigo"],"ans":1,"exp":"Rima = mesmo som final: cant-ORA / profess-ORA."},
    {"id":"sp3_r7","s":"som_plus","t":"Rimas com palavras longas","type":"mc","diff":2,"q":"🎵 Rima com \"elefante\":","opts":["hipopótamo","gigante","animal"],"ans":1,"exp":"Elef-ANTE rima com gig-ANTE — o som final -ante é igual."},
    {"id":"sp3_s1","s":"som_plus","t":"Contar sílabas (3-4)","type":"mc","diff":1,"q":"🔢 \"Borboleta\" tem ___ sílabas:","opts":["3","4","5"],"ans":1,"exp":"bor-bo-le-ta = 4."},
    {"id":"sp3_s2","s":"som_plus","t":"Contar sílabas (3-4)","type":"mc","diff":2,"q":"🔢 \"Cadeira\" tem ___ sílabas:","opts":["2","3","4"],"ans":1,"exp":"ca-dei-ra = 3 (ditongo)."},
    {"id":"sp3_s3","s":"som_plus","t":"Contar sílabas (3-4)","type":"fill","diff":2,"q":"Sílabas em \"elefante\": ___","ans":["4","quatro"],"exp":"Bate palmas ao dizer: e-le-fan-te → 4 sílabas."},
    {"id":"sp3_s4","s":"som_plus","t":"Contar sílabas (3-4)","type":"mc","diff":2,"q":"🔢 \"Passarinho\" tem ___ sílabas:","opts":["3","4","5"],"ans":1,"exp":"pas-sa-ri-nho = 4."},
    {"id":"sp3_s5","s":"som_plus","t":"Contar sílabas (3-4)","type":"fill","diff":2,"q":"Sílabas em \"menino\": ___","ans":["3","três"],"exp":"me-ni-no → 3 sílabas, uma palma por sílaba."},
    {"id":"sp3_s6","s":"som_plus","t":"Contar sílabas (3-4)","type":"mc","diff":1,"q":"🔢 \"Escola\" tem ___ sílabas:","opts":["2","3","4"],"ans":1,"exp":"es-co-la → 3 palmas, 3 sílabas."},
    {"id":"sp3_s7","s":"som_plus","t":"Contar sílabas (3-4)","type":"tf","diff":1,"q":"\"Saída\" tem 3 sílabas (sa-í-da).","ans":true,"exp":"Hiato separa."},
    {"id":"sp3_s8","s":"som_plus","t":"Contar sílabas (3-4)","type":"mc","diff":2,"q":"🔢 \"Família\" tem ___ sílabas:","opts":["3","4","5"],"ans":0,"exp":"fa-mí-lia → 3 sílabas (o final -lia diz-se de uma vez só)."},
    {"id":"sp3_t1","s":"som_plus","t":"Sílaba tónica","type":"mc","diff":1,"q":"💪 Tónica de \"cadeira\":","opts":["ca","dei","ra"],"ans":1,"exp":"A sílaba tónica é a que soa mais forte: ca-DEI-ra. Diz alto e ouve!"},
    {"id":"sp3_t2","s":"som_plus","t":"Sílaba tónica","type":"mc","diff":1,"q":"💪 Tónica de \"menino\":","opts":["me","ni","no"],"ans":1,"exp":"me-NI-no — o NI é a sílaba que soa mais forte."},
    {"id":"sp3_t3","s":"som_plus","t":"Sílaba tónica","type":"mc","diff":1,"q":"💪 Palavra AGUDA:","opts":["casa","café","mesa"],"ans":1,"exp":"Palavra aguda: a sílaba forte é a ÚLTIMA. ca-FÉ (força no fim)."},
    {"id":"sp3_t4","s":"som_plus","t":"Sílaba tónica","type":"mc","diff":2,"q":"💪 Palavra ESDRÚXULA:","opts":["mesa","árvore","café"],"ans":1,"exp":"Palavra esdrúxula: a sílaba forte é a ANTEPENÚLTIMA. ÁR-vo-re."},
    {"id":"sp3_t5","s":"som_plus","t":"Sílaba tónica","type":"tf","diff":2,"q":"Palavras esdrúxulas têm sempre acento.","ans":true,"exp":"Verdade — TODAS as esdrúxulas levam acento: médico, música, sábado."},
    {"id":"sp3_t6","s":"som_plus","t":"Sílaba tónica","type":"mc","diff":2,"q":"💪 Tónica de \"borboleta\":","opts":["bor","bo","le","ta"],"ans":2,"exp":"bor-bo-LE-ta."},
    {"id":"sp3_t7","s":"som_plus","t":"Sílaba tónica","type":"mc","diff":2,"q":"💪 Palavra GRAVE:","opts":["café","casa","lâmpada"],"ans":1,"exp":"Palavra grave: a sílaba forte é a PENÚLTIMA. CA-sa."},
    {"id":"sp3_at1","s":"som_plus","t":"Sílaba átona","type":"mc","diff":2,"q":"🤫 Em \"borboleta\", quantas átonas?","opts":["1","2","3"],"ans":2,"exp":"Tónica = \"le\"; 3 átonas."},
    {"id":"sp3_at2","s":"som_plus","t":"Sílaba átona","type":"mc","diff":1,"q":"🤫 Sílaba átona é:","opts":["a mais forte","a mais fraca","a mais longa"],"ans":1,"exp":"Mais fraca."},
    {"id":"sp3_at3","s":"som_plus","t":"Sílaba átona","type":"tf","diff":2,"q":"Em PT-PT, \"e\" átono soa quase \"i\".","ans":true,"exp":"Redução vocálica."},
    {"id":"sp3_at4","s":"som_plus","t":"Sílaba átona","type":"mc","diff":2,"q":"🤫 Em \"menina\", as átonas são:","opts":["ni","me e na","todas"],"ans":1,"exp":"Tónica = ni; átonas = me, na."},
    {"id":"sp3_di1","s":"som_plus","t":"Dígrafos LH, NH, CH","type":"mc","diff":1,"q":"🔤 \"LH\" faz:","opts":["2 sons","1 som","3 sons"],"ans":1,"exp":"Dígrafo = 1 som."},
    {"id":"sp3_di2","s":"som_plus","t":"Dígrafos LH, NH, CH","type":"mc","diff":1,"q":"🔤 Sílabas em \"filho\":","opts":["1","2","3"],"ans":1,"exp":"fi-lho → 2 sílabas. O LH é um dígrafo: duas letras, um som só."},
    {"id":"sp3_di3","s":"som_plus","t":"Dígrafos LH, NH, CH","type":"mc","diff":1,"q":"🔤 Qual TEM dígrafo NH?","opts":["ninho","menino","nada"],"ans":0,"exp":"Dígrafo = duas letras, um só som. ninho tem NH (ni-NHo)."},
    {"id":"sp3_di4","s":"som_plus","t":"Dígrafos LH, NH, CH","type":"fill","diff":2,"q":"Dígrafo de \"chuva\": ___","ans":["CH","ch"],"exp":"CH — duas letras que fazem UM só som: chuva, chave, chão."},
    {"id":"sp3_di5","s":"som_plus","t":"Dígrafos LH, NH, CH","type":"mc","diff":2,"q":"🔤 \"Manhã\" divide-se em:","opts":["ma-n-hã","ma-nhã","man-hã"],"ans":1,"exp":"NH não separa."},
    {"id":"sp3_di6","s":"som_plus","t":"Dígrafos LH, NH, CH","type":"tf","diff":1,"q":"Em \"chave\", CH faz \"sh\".","ans":true,"exp":"Sim — o CH lê-se sh, como em chave, chuva e chocolate."},
    {"id":"sp3_di7","s":"som_plus","t":"Dígrafos LH, NH, CH","type":"mc","diff":1,"q":"🔤 Qual tem dígrafo LH?","opts":["velho","vento","vela"],"ans":0,"exp":"velho tem o dígrafo LH (ve-LHo): duas letras, um som."},
    {"id":"sp3_rs1","s":"som_plus","t":"RR e SS (consoantes dobradas)","type":"mc","diff":2,"q":"🔤 \"Carro\" — RR faz som:","opts":["suave","forte","mudo"],"ans":1,"exp":"RR entre vogais faz som forte: caRRo, teRRa. Compara com caro (R suave)."},
    {"id":"sp3_rs2","s":"som_plus","t":"RR e SS (consoantes dobradas)","type":"mc","diff":2,"q":"🔤 \"Caro\" — R simples entre vogais é:","opts":["forte","suave","mudo"],"ans":1,"exp":"Entre vogais, um R sozinho tem som suave (caro). Com RR seria forte (carro)."},
    {"id":"sp3_rs3","s":"som_plus","t":"RR e SS (consoantes dobradas)","type":"tf","diff":2,"q":"Posso escrever \"rr\" no início.","ans":false,"exp":"RR só entre vogais."},
    {"id":"sp3_rs4","s":"som_plus","t":"RR e SS (consoantes dobradas)","type":"mc","diff":1,"q":"🔤 \"Passar\" tem:","opts":["SS","PP","AA"],"ans":0,"exp":"passar escreve-se com SS para manter o som de /s/ entre vogais."},
    {"id":"sp3_rs5","s":"som_plus","t":"RR e SS (consoantes dobradas)","type":"mc","diff":2,"q":"🔤 Em \"casa\", o S soa:","opts":["SS","Z","F"],"ans":1,"exp":"S entre vogais = \"z\"."},
    {"id":"sp3_rs6","s":"som_plus","t":"RR e SS (consoantes dobradas)","type":"mc","diff":2,"q":"🔤 Diferença \"caro\" / \"carro\":","opts":["nada","RR vs R","AA vs A"],"ans":1,"exp":"Consoante dobrada."},
    {"id":"sp3_rs7","s":"som_plus","t":"RR e SS (consoantes dobradas)","type":"mc","diff":2,"q":"🔤 \"Pássaro\" tem:","opts":["1 S","SS","3 S"],"ans":1,"exp":"Escreve-se com SS: PÁS-SA-RO. SS entre vogais faz o som s forte."},
    {"id":"sp3_ec1","s":"som_plus","t":"Encontros consonantais","type":"mc","diff":1,"q":"🔤 \"Prato\" começa com:","opts":["PR","BR","TR"],"ans":0,"exp":"Encontro consonantal = duas consoantes juntas na mesma sílaba. prato começa por PR."},
    {"id":"sp3_ec2","s":"som_plus","t":"Encontros consonantais","type":"mc","diff":2,"q":"🔤 Sílabas em \"braço\":","opts":["1","2","3"],"ans":1,"exp":"BRA fica junto."},
    {"id":"sp3_ec3","s":"som_plus","t":"Encontros consonantais","type":"fill","diff":2,"q":"Encontro consonantal de \"flor\": ___","ans":["FL","fl"],"exp":"FL — as duas consoantes leem-se juntas, na mesma sílaba: FLor."},
    {"id":"sp3_ec4","s":"som_plus","t":"Encontros consonantais","type":"mc","diff":2,"q":"🔤 Qual TEM encontro consonantal?","opts":["mala","tigre","casa"],"ans":1,"exp":"tigre tem o encontro consonantal GR (ti-GRe)."},
    {"id":"sp3_ec5","s":"som_plus","t":"Encontros consonantais","type":"tf","diff":1,"q":"Em \"blusão\", BL fica na mesma sílaba.","ans":true,"exp":"Sim: blu-são. No encontro consonantal, o BL fica junto na mesma sílaba."},
    {"id":"sp3_ec6","s":"som_plus","t":"Encontros consonantais","type":"mc","diff":2,"q":"🔤 \"Treze\" começa com:","opts":["T","TR","TRE"],"ans":1,"exp":"treze começa pelo encontro consonantal TR."},
    {"id":"sp3_ec7","s":"som_plus","t":"Encontros consonantais","type":"mc","diff":2,"q":"🔤 Em \"globo\" o encontro é:","opts":["BL","GL","OB"],"ans":1,"exp":"Em globo o encontro consonantal é GL (GLo-bo)."},
    {"id":"sp3_ev1","s":"som_plus","t":"Encontros vocálicos","type":"mc","diff":1,"q":"🔤 Vogais na mesma sílaba =","opts":["hiato","ditongo","tritongo"],"ans":1,"exp":"Duas vogais na MESMA sílaba formam um ditongo (ex.: pai)."},
    {"id":"sp3_ev2","s":"som_plus","t":"Encontros vocálicos","type":"mc","diff":1,"q":"🔤 Vogais em sílabas diferentes =","opts":["hiato","ditongo","tritongo"],"ans":0,"exp":"Duas vogais em sílabas DIFERENTES formam um hiato (ex.: sa-í-da)."},
    {"id":"sp3_ev3","s":"som_plus","t":"Encontros vocálicos","type":"mc","diff":2,"q":"🔤 Três vogais na mesma sílaba =","opts":["hiato","ditongo","tritongo"],"ans":2,"exp":"Três vogais na mesma sílaba formam um tritongo (ex.: Paraguai)."},
    {"id":"sp3_ev4","s":"som_plus","t":"Encontros vocálicos","type":"tf","diff":1,"q":"Em \"pai\", \"ai\" é ditongo.","ans":true,"exp":"Vogais juntas."},
    {"id":"sp3_ev5","s":"som_plus","t":"Encontros vocálicos","type":"tf","diff":2,"q":"Em \"saída\", \"aí\" é ditongo.","ans":false,"exp":"É HIATO (sa-í-da)."},
    {"id":"sp3_hi1","s":"som_plus","t":"Hiatos","type":"mc","diff":1,"q":"🔤 Hiato é:","opts":["vogais juntas na mesma sílaba","vogais em sílabas diferentes","três consoantes seguidas"],"ans":1,"exp":"Separadas."},
    {"id":"sp3_hi2","s":"som_plus","t":"Hiatos","type":"mc","diff":2,"q":"🔤 Qual TEM hiato?","opts":["mãe","saída","pai"],"ans":1,"exp":"saída tem hiato: as vogais a-í ficam em sílabas diferentes (sa-í-da)."},
    {"id":"sp3_hi3","s":"som_plus","t":"Hiatos","type":"mc","diff":2,"q":"🔤 Em \"leão\":","opts":["ditongo","hiato","tritongo"],"ans":1,"exp":"le-ÃO separados."},
    {"id":"sp3_hi4","s":"som_plus","t":"Hiatos","type":"tf","diff":2,"q":"Hiatos costumam ter acento.","ans":true,"exp":"Sim — no hiato as vogais separam-se (sa-í-da) e muitas vezes levam acento."},
    {"id":"sp3_hi5","s":"som_plus","t":"Hiatos","type":"mc","diff":2,"q":"🔤 Em \"baú\", o hiato é:","opts":["B-A-Ú","B-A","A-Ú"],"ans":2,"exp":"Em baú, as vogais a e ú separam-se: ba-ú (hiato A-Ú)."},
    {"id":"sp3_dt1","s":"som_plus","t":"Ditongos orais e nasais","type":"mc","diff":1,"q":"🔤 \"Pão\" tem ditongo:","opts":["oral","nasal"],"ans":1,"exp":"Nasal — o til (~) faz o som sair pelo nariz: pÃO."},
    {"id":"sp3_dt2","s":"som_plus","t":"Ditongos orais e nasais","type":"mc","diff":1,"q":"🔤 \"Pau\" tem ditongo:","opts":["oral","nasal"],"ans":0,"exp":"Oral — au sem til: o ar sai só pela boca."},
    {"id":"sp3_dt3","s":"som_plus","t":"Ditongos orais e nasais","type":"mc","diff":2,"q":"🔤 Qual TEM ditongo nasal?","opts":["pai","mãe","lei"],"ans":1,"exp":"mãe — o til no Ã torna o ditongo nasal. Pai e lei são ditongos orais."},
    {"id":"sp3_dt4","s":"som_plus","t":"Ditongos orais e nasais","type":"mc","diff":1,"q":"🔤 Qual é ditongo oral?","opts":["ão","ei","õe"],"ans":1,"exp":"ei é um ditongo oral (sai pela boca), como em rei. Os nasais saem pelo nariz (ex.: ão)."},
    {"id":"sp3_dt5","s":"som_plus","t":"Ditongos orais e nasais","type":"tf","diff":1,"q":"Em \"boi\", \"oi\" é ditongo oral.","ans":true,"exp":"Sim — em boi, o oi diz-se de uma só vez e não tem til → ditongo oral."},
    {"id":"sp3_dt6","s":"som_plus","t":"Ditongos orais e nasais","type":"fill","diff":2,"q":"Ditongo nasal em \"pão\": ___","ans":["ão"],"exp":"ÃO — ditongo nasal (com til): pão, cão, mão."},
    {"id":"sp3_pm1","s":"som_plus","t":"Pares mínimos avançados","type":"mc","diff":1,"q":"🔤 Par mínimo de \"pato\":","opts":["gato","bato","preto"],"ans":1,"exp":"pato → Bato: mudou SÓ o 1.º som (P→B) e o sentido mudou todo. Isso é um par mínimo."},
    {"id":"sp3_pm2","s":"som_plus","t":"Pares mínimos avançados","type":"mc","diff":1,"q":"🔤 Par mínimo de \"vaca\":","opts":["faca","mesa","casa"],"ans":0,"exp":"vaca → Faca: muda um só som (V→F) e muda o significado."},
    {"id":"sp3_pm3","s":"som_plus","t":"Pares mínimos avançados","type":"mc","diff":2,"q":"🔤 Par mínimo de \"rato\":","opts":["mato","pato","lato"],"ans":2,"exp":"rato → Lato: um som de diferença (R→L)."},
    {"id":"sp3_pm4","s":"som_plus","t":"Pares mínimos avançados","type":"mc","diff":2,"q":"🔤 Par mínimo de \"filho\":","opts":["filme","fio","falho"],"ans":1,"exp":"filho → fio: tira-se o som LH e a palavra muda. Um som faz toda a diferença!"},
    {"id":"sp3_pm5","s":"som_plus","t":"Pares mínimos avançados","type":"mc","diff":2,"q":"🔤 Par mínimo de \"carro\":","opts":["caro","cara","corro"],"ans":0,"exp":"carro → caro: o RR (forte) vira R (suave) e o sentido muda."},
    {"id":"sp3_pm6","s":"som_plus","t":"Pares mínimos avançados","type":"tf","diff":1,"q":"\"Pato\" e \"gato\" são pares mínimos.","ans":true,"exp":"Sim — pato/gato: só o 1.º som muda (P→G) e já é outra palavra."},
    {"id":"sp3_sc1","s":"som_plus","t":"Sons que se confundem (B/V, F/V)","type":"mc","diff":1,"q":"🔤 \"Bola\" começa com:","opts":["B","V"],"ans":0,"exp":"bola começa por B — som feito a juntar os lábios. Não confundir com V."},
    {"id":"sp3_sc2","s":"som_plus","t":"Sons que se confundem (B/V, F/V)","type":"mc","diff":1,"q":"🔤 \"Vaca\" começa com:","opts":["F","V","B"],"ans":1,"exp":"vaca começa por V — dentes no lábio de baixo. Diferente de B."},
    {"id":"sp3_sc3","s":"som_plus","t":"Sons que se confundem (B/V, F/V)","type":"mc","diff":1,"q":"🔤 \"Faca\" começa com:","opts":["F","V","B"],"ans":0,"exp":"faca começa por F — som soprado, diferente do V."},
    {"id":"sp3_sc4","s":"som_plus","t":"Sons que se confundem (B/V, F/V)","type":"tf","diff":2,"q":"B e V usam ambos os lábios.","ans":false,"exp":"B = lábios juntos. V = lábio + dentes."},
    {"id":"sp3_sc5","s":"som_plus","t":"Sons que se confundem (B/V, F/V)","type":"mc","diff":2,"q":"🔤 Para distinguir F/V põe:","opts":["dedo no nariz","mão na garganta","dedo na orelha"],"ans":1,"exp":"Garganta — vibração."},
    {"id":"sp3_ts1","s":"som_plus","t":"Trocar uma sílaba","type":"mc","diff":2,"q":"🔄 \"Borboleta\" trocando \"bor\" por \"var\":","opts":["barboleta","varboleta","borboteta"],"ans":1,"exp":"Troca bor por var: bor-bo-le-ta vira var-bo-le-ta = varboleta."},
    {"id":"sp3_ts2","s":"som_plus","t":"Trocar uma sílaba","type":"mc","diff":2,"q":"🔄 \"Escola\" trocando \"es\" por \"tes\":","opts":["escola","tescola","tesola"],"ans":1,"exp":"Troca es por tes: es-co-la vira tes-co-la = tescola."},
    {"id":"sp3_ts3","s":"som_plus","t":"Trocar uma sílaba","type":"mc","diff":2,"q":"🔄 \"Passarinho\" trocando \"ri\" por \"rou\":","opts":["passarounho","passarinha","pasarinho"],"ans":0,"exp":"Troca ri por rou: pas-sa-ri-nho vira pas-sa-rou-nho = passarounho."},
    {"id":"sp3_ts4","s":"som_plus","t":"Trocar uma sílaba","type":"tf","diff":1,"q":"Trocar uma sílaba muda só essa, o resto fica igual.","ans":true,"exp":"Sim — trocas uma sílaba e as outras ficam iguais: BO-la → CO-la."},
    {"id":"sp3_ti1","s":"som_plus","t":"Tirar uma sílaba","type":"mc","diff":1,"q":"✂️ Tira \"bor\" de \"borboleta\":","opts":["boleta","boboleta","borleta"],"ans":0,"exp":"Tira a sílaba bor de bor-bo-le-ta: fica boleta."},
    {"id":"sp3_ti2","s":"som_plus","t":"Tirar uma sílaba","type":"mc","diff":2,"q":"✂️ Tira \"es\" de \"escola\":","opts":["cola","escolla","escola"],"ans":0,"exp":"Tira es de es-co-la: fica cola."},
    {"id":"sp3_ti3","s":"som_plus","t":"Tirar uma sílaba","type":"mc","diff":2,"q":"✂️ Tira \"ri\" de \"passarinho\":","opts":["passanho","passarinho","paríonho"],"ans":0,"exp":"Tira ri de pas-sa-ri-nho: fica passanho."},
    {"id":"sp3_ti4","s":"som_plus","t":"Tirar uma sílaba","type":"tf","diff":1,"q":"Posso tirar uma sílaba do meio.","ans":true,"exp":"Sim — qualquer posição."},
    {"id":"sp3_tf1","s":"som_plus","t":"Trocar fonema inicial","type":"mc","diff":1,"q":"🔄 Em \"pato\", trocar P por B:","opts":["bato","patos","lato"],"ans":0,"exp":"Troca o 1.º som P por B: Pato vira Bato."},
    {"id":"sp3_tf2","s":"som_plus","t":"Trocar fonema inicial","type":"mc","diff":1,"q":"🔄 Em \"mala\", trocar M por F:","opts":["fala","fila","mala"],"ans":0,"exp":"Troca M por F: Mala vira Fala."},
    {"id":"sp3_tf3","s":"som_plus","t":"Trocar fonema inicial","type":"mc","diff":1,"q":"🔄 Em \"rato\", trocar R por L:","opts":["lato","rado","mato"],"ans":0,"exp":"Troca R por L: Rato vira Lato."},
    {"id":"sp3_tf4","s":"som_plus","t":"Trocar fonema inicial","type":"tf","diff":2,"q":"Fonema é o mesmo que letra.","ans":false,"exp":"Falso — fonema é o SOM, letra é o desenho. CH são 2 letras mas 1 só fonema."},
    {"id":"sp3_sf1","s":"som_plus","t":"Segmentar fonemas","type":"mc","diff":1,"q":"🔢 \"Pai\" tem ___ fonemas:","opts":["1","2","3"],"ans":2,"exp":"3 fonemas (sons): /p/ /a/ /i/. Diz a palavra devagar e conta os sons."},
    {"id":"sp3_sf2","s":"som_plus","t":"Segmentar fonemas","type":"mc","diff":2,"q":"🔢 \"Casa\" tem ___ fonemas:","opts":["2","3","4"],"ans":2,"exp":"4 sons: /k/ /a/ /z/ /a/ — repara que o S entre vogais soa /z/."},
    {"id":"sp3_sf3","s":"som_plus","t":"Segmentar fonemas","type":"mc","diff":2,"q":"🔢 \"Gato\" tem ___ fonemas:","opts":["3","4","5"],"ans":1,"exp":"gato tem 4 fonemas (sons): g-a-t-o."},
    {"id":"sp3_sf4","s":"som_plus","t":"Segmentar fonemas","type":"tf","diff":2,"q":"\"Casa\" tem 4 fonemas e 2 sílabas.","ans":true,"exp":"Verdade: ca-sa são 2 sílabas, mas 4 sons (/k/ /a/ /z/ /a/)."},
    {"id":"sp3_sf5","s":"som_plus","t":"Segmentar fonemas","type":"mc","diff":2,"q":"🔢 \"Filho\" tem ___ fonemas (LH = 1):","opts":["3","4","5"],"ans":1,"exp":"filho tem 4 fonemas: f-i-lh-o (LH conta como 1 só som)."},
    {"id":"sp3_fa1","s":"som_plus","t":"Famílias de palavras","type":"mc","diff":1,"q":"🌳 Família de \"flor\":","opts":["florista","fluido","fome"],"ans":0,"exp":"florista, florido."},
    {"id":"sp3_fa2","s":"som_plus","t":"Famílias de palavras","type":"mc","diff":2,"q":"🌳 Que palavra NÃO é família de \"livro\"?","opts":["livraria","livrinho","livre"],"ans":2,"exp":"\"Livre\" vem de outra raiz."},
    {"id":"sp3_fa3","s":"som_plus","t":"Famílias de palavras","type":"mc","diff":2,"q":"🌳 Família de \"terra\":","opts":["terrestre","terno","tempo"],"ans":0,"exp":"terrestre, terreno."},
    {"id":"sp3_fa4","s":"som_plus","t":"Famílias de palavras","type":"tf","diff":1,"q":"Família partilha raiz E significado.","ans":true,"exp":"Sim — flor, florista, florido: a mesma raiz (flor) e sentidos ligados."},
    {"id":"sp3_pc1","s":"som_plus","t":"Palavras compostas","type":"mc","diff":1,"q":"🔗 Palavra composta:","opts":["casa","guarda-chuva","menino"],"ans":1,"exp":"Uma palavra composta junta duas palavras que já existem: guarda + chuva = guarda-chuva. «Casa» e «menino» são palavras simples, feitas de uma só."},
    {"id":"sp3_pc2","s":"som_plus","t":"Palavras compostas","type":"mc","diff":2,"q":"🔗 \"Girassol\" =","opts":["gi + rassol","gira + sol","gi + ras + sol"],"ans":1,"exp":"girassol é palavra composta: gira + sol."},
    {"id":"sp3_pc3","s":"som_plus","t":"Palavras compostas","type":"mc","diff":2,"q":"🔗 \"Beija-flor\" leva hífen:","opts":["sim","não"],"ans":0,"exp":"beija-flor escreve-se com hífen (beija + flor)."},
    {"id":"sp3_pc4","s":"som_plus","t":"Palavras compostas","type":"tf","diff":1,"q":"\"Segunda-feira\" leva hífen.","ans":true,"exp":"Sim — os dias da semana levam hífen: segunda-feira, terça-feira…"},
    {"id":"sp3_tl1","s":"som_plus","t":"Trava-línguas","type":"mc","diff":1,"q":"🌀 Trava-língua famoso (R):","opts":["O rato roeu...","A bola está parada","O cão ladra"],"ans":0,"exp":"\"O rato roeu a roupa...\""},
    {"id":"sp3_tl2","s":"som_plus","t":"Trava-línguas","type":"mc","diff":1,"q":"🌀 Para que servem?","opts":["adormecer","treinar articulação","matemática"],"ans":1,"exp":"Articulação + fluência."},
    {"id":"sp3_tl3","s":"som_plus","t":"Trava-línguas","type":"tf","diff":1,"q":"Começa devagar e depois acelera.","ans":true,"exp":"Sim — primeiro devagar para acertar, depois mais depressa para ganhar ritmo."},
    {"id":"sp3_ma1","s":"som_plus","t":"Memória auditiva avançada","type":"mc","diff":1,"q":"👂 Para boa memória auditiva:","opts":["ter distrações","focar-se","falar ao mesmo tempo"],"ans":1,"exp":"Focar-se — para o ouvido gravar bem, a cabeça tem de estar só na tarefa."},
    {"id":"sp3_ma2","s":"som_plus","t":"Memória auditiva avançada","type":"tf","diff":2,"q":"Imaginar a cena ajuda a recordar.","ans":true,"exp":"Sim — transformar o que ouves numa imagem na cabeça ajuda a memória a guardar."},
    {"id":"sp3_ma3","s":"som_plus","t":"Memória auditiva avançada","type":"mc","diff":2,"q":"👂 Inversa de \"gato, mesa, livro, sol\":","opts":["sol, livro, mesa, gato","gato, mesa, livro, sol","sol, mesa, livro, gato"],"ans":0,"exp":"Última primeiro."},
    {"id":"sp3_ma4","s":"som_plus","t":"Memória auditiva avançada","type":"mc","diff":1,"q":"👂 Repete: árvore, casa, bola. A 1.ª foi:","opts":["casa","árvore","bola"],"ans":1,"exp":"A 1.ª palavra da lista foi árvore (árvore, casa, bola)."},

    // ── FASE 3 (v523): jogos interativos na Matemática 3º ────
    { id:'3m_g1', s:'matematica', t:'Adição e subtração', type:'game', game:'cofre_steps', diff:2, q:'🧠 Clientes na loja', story:'De manhã entraram 156 clientes; à tarde mais 88. Depois saíram 100.', steps:[
        { prompt:'Passo 1: 156 + 88. Quantos clientes ao todo?', answer:'244', hint:'Soma por colunas, transporta ao passar de 9.' },
        { prompt:'Passo 2: saíram 100. Quantos ficaram?', answer:'144', hint:'244 − 100.' }
    ], exp:'156 + 88 = 244; 244 − 100 = 144.' },
    { id:'3m_g2', s:'matematica', t:'Multiplicação', type:'game', game:'cofre_steps', diff:1, q:'🧠 Caixa de ovos', story:'Uma caixa tem 6 filas com 8 ovos cada.', steps:[
        { prompt:'Quantos ovos tem a caixa? (6 × 8)', answer:'48', hint:'Tabuada do 8: 8+8+8+8+8+8.' }
    ], exp:'6 × 8 = 48 ovos.' },
    { id:'3m_g3', s:'matematica', t:'Divisão', type:'game', game:'cofre_steps', diff:1, q:'🧠 Bolas nos cestos', story:'Tens 24 bolas para repartir igualmente por 4 cestos.', steps:[
        { prompt:'Quantas bolas em cada cesto? (24 ÷ 4)', answer:'6', hint:'4 × ? = 24.' }
    ], exp:'24 ÷ 4 = 6 bolas por cesto.' },
    { id:'3m_g4', s:'matematica', t:'Dinheiro', type:'game', game:'cofre_steps', diff:2, q:'🧠 Compras na papelaria', story:'Compras 3 cadernos a 2€ cada e 1 caneta a 3€.', steps:[
        { prompt:'Passo 1: 3 cadernos × 2€. Quanto custam?', answer:'6', hint:'3 × 2.' },
        { prompt:'Passo 2: junta a caneta de 3€. Total?', answer:'9', hint:'6 + 3.' }
    ], exp:'3×2 = 6€ + 3€ = 9€.' },
    { id:'3m_g5', s:'matematica', t:'Tabuadas', type:'game', game:'cofre_steps', diff:1, q:'🧠 Sacos de berlindes', story:'Tens 7 sacos com 5 berlindes cada.', steps:[
        { prompt:'Quantos berlindes ao todo? (7 × 5)', answer:'35', hint:'Tabuada do 5: conta 5, 10, 15...' }
    ], exp:'7 × 5 = 35 berlindes.' },
    { id:'3m_g6', s:'matematica', t:'Cálculo mental', type:'game', game:'cofre_steps', diff:2, q:'🧠 Subtrair em partes', story:'Queres calcular 50 − 18 de cabeça.', steps:[
        { prompt:'Passo 1: tira primeiro 10. 50 − 10 = ?', answer:'40', hint:'Só os 10.' },
        { prompt:'Passo 2: agora tira os 8 que faltam. 40 − 8 = ?', answer:'32', hint:'40 − 8.' }
    ], exp:'50 − 18 = 50 − 10 − 8 = 32.' },
    { id:'3m_g7', s:'matematica', t:'Números até 10 000', type:'game', game:'padrao', diff:2, q:'🧩 Conta de 1000 em 1000', sequence:[1000,2000,3000,'?',5000], answer:'4000', hint:'Soma 1000 de cada vez.', exp:'+1000 → 4000.' },
    { id:'3m_g8', s:'matematica', t:'Múltiplos e divisores', type:'game', game:'cofre_steps', diff:1, q:'🧠 Grupos de 3', story:'Quantos grupos de 3 cabem em 18 alunos?', steps:[
        { prompt:'18 ÷ 3 = ?', answer:'6', hint:'3 × ? = 18.' }
    ], exp:'18 ÷ 3 = 6 grupos.' }
];
window.EXERCISES_BASE_31 = EXERCISES_3_OCEANUS;
window.EXERCISES_BASE_3 = EXERCISES_3;
// ── Lições deste ano (v572): saíram de content.js; fundidas no objeto
// que setActiveYear já referencia (Object.assign mantém a referência).
const LESSONS_3_OCEANUS = {
    // ===== PORTUGUÊS =====
    'portugues/Ditongos e hiatos': {
        title: 'Ditongos e hiatos',
        body: '**Ditongo** = duas vogais juntas na **mesma sílaba**. Exemplos: p**ai**, b**oi**, m**au**, c**éu**, **ei**xo.\n\n**Hiato** = duas vogais juntas em **sílabas diferentes**. Exemplos: sa-**í**-da, le-**ão**, p**a-i**-s (= "país").\n\n**Truque**: divide a palavra em sílabas. Se as duas vogais ficam juntas → ditongo. Se ficam separadas → hiato.\n\n**❌ O que se costuma errar**\n• Confundir "leão" (hiato le-ão) com "mão" (ditongo "ão" na mesma sílaba).\n• Achar que "saída" e "saia" são iguais — "saí-da" tem hiato (acento agudo), "saia" tem ditongo.\n• Esquecer que ditongos podem ser orais (pai, boi) ou nasais (mãe, pão).'
    },
    'portugues/Acentuação': {
        title: 'Acentos gráficos',
        body: 'Existem **3 acentos** principais em português:\n\n• **Acento agudo (´)** — em vogais "abertas". Ex: caf**é**, **á**rvore, p**ó**.\n• **Acento circunflexo (^)** — em vogais "fechadas". Ex: av**ô**, p**ê**ssego, c**â**mara.\n• **Acento grave (`)** — quase só em "à" (a + a). Ex: vou **à** escola.\n\nO **til (~)** marca a nasalidade: m**ã**e, irm**ã**, p**ã**o.\n\n**❌ O que se costuma errar**\n• Trocar agudo (´) com circunflexo (^): café (´) ≠ avô (^).\n• Esquecer-se que "à" leva acento grave (a preposição "a" + o artigo "a").\n• Confundir til (~) com acento — o til marca som nasal, não a sílaba forte.'
    },
    'portugues/Translineação': {
        title: 'Translineação (mudar de linha)',
        body: 'Quando uma palavra não cabe no fim da linha, divide-se em **sílabas**. Põe-se um **hífen (-)** no fim da linha.\n\nEx: a palavra **borboleta** (4 sílabas: bor-bo-le-ta) pode dividir-se assim no fim da linha:\nbor-\nboleta\n\n**Regras**:\n• Divide-se sempre **por sílabas** completas — nunca cortar uma sílaba a meio.\n• Não deixar uma única letra no fim ou no início da linha (ex: evita "a-mor", "pen-a").\n• Não dividir ditongos.\n\n**❌ O que se costuma errar**\n• Cortar a meio de uma sílaba: "esc-ola" ✗ → "es-cola" ✓.\n• Esquecer o hífen no fim da linha.\n• Cortar ditongos: "p-ai" ✗ → "pai" fica numa só sílaba.'
    },
    'portugues/Nomes (próprios, comuns, coletivos)': {
        title: 'Nomes',
        body: 'Os **nomes** designam pessoas, animais, lugares ou coisas. Há 3 tipos:\n\n• **Comum** — nome geral. Ex: menino, gato, cidade.\n• **Próprio** — nome especial (com **maiúscula**!). Ex: João, Lisboa, Tejo.\n• **Coletivo** — designa um conjunto de seres iguais. Ex: **enxame** (de abelhas), **cardume** (de peixes), **rebanho** (de ovelhas), **floresta** (de árvores), **alcateia** (de lobos).\n\n**❌ O que se costuma errar**\n• Esquecer a maiúscula nos nomes próprios.\n• Confundir coletivos: cardume = peixes (NÃO abelhas).\n• Achar que "grupo" é um coletivo específico — é genérico. Cada animal/coisa tem o seu coletivo próprio.'
    },
    'portugues/Determinantes': {
        title: 'Determinantes',
        body: 'Os **determinantes** vêm antes dos nomes para os identificar. Tipos principais:\n\n• **Artigos definidos**: o, a, os, as (já conhecemos a coisa).\n• **Artigos indefinidos**: um, uma, uns, umas (não específica).\n• **Demonstrativos**: este/esta (perto), esse/essa (a meio), aquele/aquela (longe).\n• **Possessivos**: meu, teu, seu, nosso, vosso (a quem pertence).\n\nEx: **O** meu cão. **Este** livro. **Aquela** casa.\n\n**❌ O que se costuma errar**\n• Confundir "este" (perto) com "aquele" (longe).\n• Esquecer que os determinantes concordam com o nome em género e número (a casa, **as** casas).\n• Trocar artigo definido (o) com indefinido (um) — significam coisas diferentes.'
    },
    'portugues/Adjetivos': {
        title: 'Adjetivos',
        body: 'Os **adjetivos** dizem como é o nome (qualidades, características). Ex: cão **preto**, sopa **quente**, dia **bonito**.\n\nO adjetivo concorda com o nome em **género e número**: menin**o** alt**o** / menin**a** alt**a** / menin**os** alt**os**.\n\n**Graus do adjetivo**:\n• **Normal**: o João é alto.\n• **Comparativo**: o João é **mais alto que** o Pedro.\n• **Superlativo absoluto**: o João é **muito alto** ou **altíssimo**.\n\n**❌ O que se costuma errar**\n• Esquecer a concordância (menina alto ✗ → menina alta ✓).\n• Confundir adjetivo com nome ("o preto" pode ser nome se referir a alguém; "o cão preto" → adjetivo).\n• Trocar "altíssimo" (superlativo) com "mais alto" (comparativo).'
    },
    'portugues/Verbos': {
        title: 'Verbos',
        body: 'Os **verbos** indicam **ação** (correr, comer) ou **estado** (ser, estar). Concordam com o sujeito.\n\n**Tempos verbais** (3 principais):\n• **Presente** — agora. Ex: Eu **canto**.\n• **Passado** (pretérito perfeito) — já aconteceu. Ex: Eu **cantei**.\n• **Futuro** — vai acontecer. Ex: Eu **cantarei** / vou cantar.\n\n**Infinitivo** = forma básica do verbo (sem ninguém a fazer): **cantar**, **comer**, **partir** — terminam em -ar, -er, -ir.\n\n**❌ O que se costuma errar**\n• Confundir "comprei" (passado) com "comprou" (3.ª pessoa do passado).\n• Trocar conjugações (canta → 3.ª pessoa; canto → 1.ª pessoa).\n• Esquecer-se das 3 conjugações (-ar, -er, -ir) e fazer "comir" em vez de "comer".'
    },
    'portugues/Plurais e feminino': {
        title: 'Plurais e feminino',
        body: '**Plural** = muitos. Regra geral: acrescenta **-s**. Ex: livro → livr**os**.\n\n**Casos especiais**:\n• Palavras em -**ão** → **-ões** (lim**ão** → lim**ões**), **-ãos** (m**ão** → m**ãos**) ou **-ães** (c**ão** → c**ães**, p**ão** → p**ães**).\n• Palavras em -**l** → **-is** (animal → animais).\n• Palavras em -**s** ou -**z** sem vogal final → não muda OU acrescenta -**es** (lápis → lápis; rapaz → rapazes).\n\n**Feminino** — formas:\n• Acrescentar -a: menino → menin**a**.\n• Mudar -**o** por -**a**: avô → avó.\n• Palavra completamente diferente: cavalo → **égua**, homem → **mulher**, padre → **madre**.\n\n**❌ O que se costuma errar**\n• Plural de "cão" → "cãos" ✗ → cães ✓.\n• Plural de "pão" → "pãos" ✗ → pães ✓.\n• Achar que feminino é sempre acrescentar -a: cavalo → "cavala" ✗ → égua ✓.'
    },
    'portugues/Tipos de frase': {
        title: 'Tipos de frase',
        body: 'Há **4 tipos** de frase, conforme a intenção:\n\n• **Declarativa** — dá informação. Termina em **".".** Ex: O João está em casa.\n• **Interrogativa** — faz pergunta. Termina em **"?".** Ex: O João está em casa?\n• **Exclamativa** — exprime emoção (alegria, surpresa, espanto). Termina em **"!".** Ex: Que dia lindo!\n• **Imperativa** — dá ordem, conselho, pedido. Pode terminar em "." ou "!". Ex: Vai dormir. / Cuidado!\n\n**❌ O que se costuma errar**\n• Confundir exclamativa (emoção) com imperativa (ordem). "Que frio!" é exclamativa; "Fecha a porta." é imperativa.\n• Esquecer o ponto de interrogação (?) no fim de uma pergunta.\n• Achar que toda a frase com "!" é exclamativa — pode ser imperativa enfática.'
    },
    'portugues/Sinónimos e antónimos': {
        title: 'Sinónimos e antónimos',
        body: '**Sinónimos** = palavras com **significado parecido**. Ex: bonito ≈ lindo. casa ≈ lar. correr ≈ apressar-se.\n\n**Antónimos** = palavras com **significado oposto**. Ex: alto ↔ baixo. claro ↔ escuro. feliz ↔ triste. subir ↔ descer.\n\nUm bom escritor evita repetir a mesma palavra usando sinónimos.\n\n**❌ O que se costuma errar**\n• Confundir sinónimo (igual) com antónimo (oposto).\n• Achar que palavras parecidas são sinónimos: "casa" e "casaco" parecem-se mas são coisas diferentes.\n• Esquecer-se que sinónimos podem ter pequenas diferenças de uso (não são sempre intercambiáveis).'
    },
    'portugues/Família de palavras': {
        title: 'Família de palavras',
        body: 'Uma **família de palavras** é um grupo de palavras que vêm da **mesma palavra-base** (raiz comum) e partilham o significado.\n\nEx: família de **flor** → flor, **flor**ista, **flor**ir, **flor**ido, **flor**ação.\n\nEx: família de **pão** → pão, **pad**eiro, **pad**aria.\n\n**Atenção**: parecer-se na escrita não chega — tem de partilhar o significado. Floresta NÃO é da família de "flor" (vem de "floresta").\n\n**❌ O que se costuma errar**\n• Confundir palavras parecidas com mesma família — "casa" e "casaco" não são família.\n• Esquecer que "florista" e "floração" são da mesma família apesar de terem terminações diferentes.\n• Achar que "floresta" é da família de "flor" — não é.'
    },
    'portugues/Compreensão de texto': {
        title: 'Compreensão de texto',
        body: 'Um **texto narrativo** conta uma **história**. Tem 3 elementos principais:\n\n• **Personagens** — quem aparece (pessoas, animais, objetos personificados). Há **principais** (o herói/protagonista) e **secundárias**.\n• **Espaço** — onde acontece (lugar).\n• **Tempo** — quando acontece (horas, dias, época).\n\n**Estrutura da história** — 3 partes:\n1. **Introdução** — apresentação das personagens e cenário.\n2. **Desenvolvimento** — o que acontece (problemas, aventuras).\n3. **Conclusão** — como termina (resolução).\n\n**Quem conta a história?**\n• **Autor** = pessoa real que escreve.\n• **Narrador** = voz que conta dentro do texto.\n\n**❌ O que se costuma errar**\n• Confundir autor (real) com narrador (dentro da história).\n• Esquecer-se de uma das 3 partes (intro, desenvolvimento, conclusão).\n• Trocar protagonista (personagem principal) com narrador (voz que conta).'
    },

    // ===== MATEMÁTICA =====
    'matematica/Números até 10 000': {
        title: 'Números até 10 000',
        body: 'No 3.º ano os números crescem para a casa dos **milhares**. As ordens (da direita para a esquerda):\n\n• **U** — unidades (1, 2, 3, ..., 9)\n• **D** — dezenas (10, 20, ..., 90)\n• **C** — centenas (100, 200, ..., 900)\n• **M** — milhares (1 000, 2 000, ..., 9 000)\n\nEx: **4 305** = 4 milhares + 3 centenas + 0 dezenas + 5 unidades = 4000 + 300 + 0 + 5.\n\nLê-se **"quatro mil e trezentos e cinco"**.\n\n**❌ O que se costuma errar**\n• Esquecer um zero no meio: 4 035 ≠ 4 305.\n• Trocar dezenas com centenas (em 472, o 4 vale 400, não 40).\n• Não saber escrever em algarismos: "três mil e doze" → 3 012 (não 3 0012).'
    },
    'matematica/Valor posicional': {
        title: 'Valor posicional',
        body: 'O **valor de um algarismo** depende da **posição** que ocupa no número.\n\nEx: no número **5 472**:\n• o **5** está nos milhares → vale **5 000**\n• o **4** está nas centenas → vale **400**\n• o **7** está nas dezenas → vale **70**\n• o **2** está nas unidades → vale **2**\n\nTotal: 5 000 + 400 + 70 + 2 = 5 472. ✓\n\n**❌ O que se costuma errar**\n• Achar que o algarismo vale o que mostra (no 472, o 4 não vale 4 — vale 400!).\n• Confundir ordem (posição) com classe (milhares, milhões).\n• Esquecer-se que o 0 também ocupa posição: em 502, o 0 está nas dezenas (vale 0 dezenas).'
    },
    'matematica/Adição e subtração': {
        title: 'Adição e subtração',
        body: 'Para somar ou subtrair números grandes, usa-se o **algoritmo em coluna**: alinha unidades com unidades, dezenas com dezenas...\n\n**Adição com transporte**: 248 + 132\n```\n  248\n+ 132\n-----\n  380\n```\n8+2=10 → escreve 0 e **transporta 1**. Depois 4+3+1=8. Depois 2+1=3.\n\n**Subtração com empréstimo**: 1 000 − 347 = 653.\nQuando o algarismo de cima é menor, **pede-se 1 emprestado** à ordem seguinte.\n\n**❌ O que se costuma errar**\n• Esquecer-se do transporte na adição.\n• Esquecer-se de baixar 1 ao "pedir emprestado".\n• Não alinhar bem as colunas (somar dezenas com unidades).'
    },
    'matematica/Multiplicação': {
        title: 'Multiplicação',
        body: '**Multiplicar** = somar a mesma coisa várias vezes.\n3 × 4 = 4 + 4 + 4 = 12.\n\n**Algoritmo (× 1 algarismo)**: 23 × 4\n```\n   23\n ×  4\n ----\n   92\n```\n3×4=12 → escreve 2, transporta 1. Depois 2×4=8, +1=9.\n\n**Propriedades úteis**:\n• **Comutativa**: 3 × 4 = 4 × 3.\n• Multiplicar por 10 → acrescentar um zero (ex: 7 × 10 = 70).\n• Multiplicar por 100 → acrescentar dois zeros (7 × 100 = 700).\n\n**❌ O que se costuma errar**\n• Confundir multiplicação com adição.\n• Esquecer o transporte (3×4=12 → fica 2 e transporta 1).\n• Achar que 3 × 4 ≠ 4 × 3 (são iguais!).'
    },
    'matematica/Tabuadas': {
        title: 'Tabuadas',
        body: 'A **tabuada** é a multiplicação por um número, de 0 a 10 (ou 1 a 10). Devem ser memorizadas — são a base do cálculo!\n\n**Truques**:\n• Tabuada do **2** → o número + ele próprio (3×2=6, 4×2=8).\n• Tabuada do **5** → acaba sempre em 0 ou 5 (5, 10, 15, 20, 25...).\n• Tabuada do **10** → acrescentar um zero (3×10=30, 7×10=70).\n• Tabuada do **9** → os algarismos somam sempre 9: 9, **1**8 (1+8=9), **2**7, **3**6, **4**5...\n• Tabuada do **6** → metade da do 12 (não estudada ainda) — usar a do 5: 6×3=5×3+3.\n\n**❌ O que se costuma errar**\n• Confundir 6×7=42 com 6×8=48.\n• Esquecer que 9×9=81 (não 99).\n• Trocar a tabuada do 7 (mais difícil) com a do 8.'
    },
    'matematica/Divisão': {
        title: 'Divisão',
        body: '**Divisão** = repartir igualmente.\n\nEx: 12 ÷ 4 = 3. Significa "12 partes em 4 grupos iguais → 3 em cada grupo".\n\n**Termos**:\n• **Dividendo** — o que se divide (12).\n• **Divisor** — em quantos grupos (4).\n• **Quociente** — quanto fica em cada grupo (3).\n• **Resto** — o que sobra (0 quando é divisão **exata**).\n\nEx: 23 ÷ 4 → 4 × 5 = 20, sobra 3. **Quociente 5, resto 3**. (Não é exata.)\n\nA divisão é a **operação inversa** da multiplicação: se 6 × 4 = 24, então 24 ÷ 4 = 6.\n\n**❌ O que se costuma errar**\n• Confundir dividendo com divisor (no 23 ÷ 4, o dividendo é 23!).\n• Esquecer-se do resto.\n• Achar que toda a divisão dá resto 0 — só as exatas.'
    },
    'matematica/Múltiplos e divisores': {
        title: 'Múltiplos e divisores',
        body: '**Múltiplos** de um número = resultados da tabuada desse número (incluindo 0).\nMúltiplos de 5: 0, 5, 10, 15, 20, 25, ...\n\n**Divisores** de um número = números que dividem certinho (resto 0).\nDivisores de 12: 1, 2, 3, 4, 6, 12.\n\n**M.M.C.** (Mínimo Múltiplo Comum) — o menor múltiplo que dois números têm em comum.\nEx: M.M.C.(4, 6) = 12 (porque é múltiplo de 4 e de 6).\n\n**❌ O que se costuma errar**\n• Confundir múltiplo com divisor — múltiplo é maior, divisor é menor.\n• Esquecer que 0 é múltiplo de todos os números.\n• Achar que 1 não é divisor — é divisor de qualquer número.'
    },
    'matematica/Frações': {
        title: 'Frações',
        body: 'Uma **fração** representa **partes iguais** de um todo. Tem dois números:\n\n• **Numerador** (em cima) — quantas partes tomamos.\n• **Denominador** (em baixo) — em quantas partes está dividido o todo.\n\nEx: **1/4** → 1 parte em 4 partes iguais.\n\n**Cuidado!** Quanto **maior** o denominador, **menor** cada parte:\n1/2 > 1/3 > 1/4 (uma metade é maior que um terço, que é maior que um quarto).\n\n**Frações conhecidas**:\n• 1/2 = metade\n• 1/3 = um terço\n• 1/4 = um quarto\n• 3/4 = três quartos\n\n**❌ O que se costuma errar**\n• Achar que 1/4 > 1/2 (porque 4 > 2). Errado! 1/4 é menor.\n• Trocar numerador com denominador.\n• Achar que partes desiguais formam frações — só partes iguais!'
    },
    'matematica/Polígonos': {
        title: 'Polígonos',
        body: 'Um **polígono** é uma figura plana fechada, feita só de **segmentos de reta**. Conta-se o número de **lados**:\n\n• **Triângulo** — 3 lados (tri = 3).\n• **Quadrilátero** — 4 lados (quadrado, retângulo, losango...).\n• **Pentágono** — 5 lados (penta = 5).\n• **Hexágono** — 6 lados (hexa = 6).\n• **Heptágono** — 7 lados (hepta = 7).\n• **Octógono** — 8 lados (octo = 8).\n\nFiguras com partes curvas (círculo, oval) **NÃO** são polígonos.\n\n**❌ O que se costuma errar**\n• Trocar pentágono (5) com hexágono (6).\n• Achar que o círculo é um polígono — não é (tem lado curvo).\n• Confundir polígono regular (todos os lados iguais) com irregular.'
    },
    'matematica/Sólidos geométricos': {
        title: 'Sólidos geométricos',
        body: 'Os **sólidos geométricos** são objetos a 3 dimensões (têm volume).\n\n**Poliedros** (faces planas):\n• **Cubo** — 6 faces quadradas iguais (dado).\n• **Paralelepípedo** — 6 faces retangulares (caixa de sapatos).\n• **Pirâmide** — base + faces triangulares que se juntam num ponto.\n• **Prisma** — duas bases iguais ligadas por retângulos.\n\n**Não-poliedros** (têm faces curvas):\n• **Esfera** — bola.\n• **Cilindro** — lata, copo de água.\n• **Cone** — gelado, chapéu de aniversário.\n\nElementos: **face** (parte plana), **aresta** (linha), **vértice** (ponto/canto).\n\n**❌ O que se costuma errar**\n• Confundir cubo (6 faces quadradas iguais) com paralelepípedo (faces retangulares).\n• Achar que esfera tem faces — não tem (é toda curva).\n• Trocar cone com pirâmide.'
    },
    'matematica/Perímetro': {
        title: 'Perímetro',
        body: '**Perímetro** = comprimento total da linha que rodeia uma figura. Soma-se todos os **lados**.\n\n**Quadrado** (4 lados iguais): P = 4 × lado.\nEx: lado 5 cm → P = 4 × 5 = **20 cm**.\n\n**Retângulo** (2 lados pequenos + 2 lados grandes): P = 2 × (lado + lado).\nEx: 8 cm e 3 cm → P = 2 × (8 + 3) = 22 cm.\n\nMede-se em unidades de comprimento: cm, m, km.\n\n**❌ O que se costuma errar**\n• Esquecer que o perímetro é a soma de **todos** os lados (no retângulo são 4, não 2).\n• Confundir perímetro com área (área é o que está dentro; perímetro é à volta).\n• Esquecer a unidade (cm, m).'
    },
    'matematica/Comprimento': {
        title: 'Comprimento',
        body: 'O **comprimento** mede-se em metros (m). Unidades:\n\n• **1 km (quilómetro)** = 1 000 m\n• **1 m (metro)** = 100 cm\n• **1 dm (decímetro)** = 10 cm\n• **1 cm (centímetro)** = 10 mm\n• **1 mm (milímetro)** — o mais pequeno usado em escola.\n\n**Convertir** (multiplicar/dividir por 10, 100 ou 1000):\n• 3 m → 300 cm (× 100)\n• 500 cm → 5 m (÷ 100)\n• 2 km → 2 000 m (× 1 000)\n\n**❌ O que se costuma errar**\n• Confundir cm com mm.\n• Esquecer que 1 m = 100 cm (não 10!).\n• Trocar quilo (× 1000) com cento (× 100).'
    },
    'matematica/Tempo': {
        title: 'Tempo',
        body: 'Unidades de tempo:\n\n• **1 minuto** = 60 segundos\n• **1 hora** = 60 minutos\n• **1 dia** = 24 horas (12h dia + 12h noite)\n• **1 semana** = 7 dias\n• **1 mês** = 30 ou 31 dias (28-29 em fevereiro)\n• **1 ano** = 12 meses = 365 dias (366 se ano bissexto)\n\n**Ler horas no relógio analógico**:\n• Ponteiro **pequeno** = horas. Ponteiro **grande** = minutos.\n• "9:15" lê-se "nove e um quarto" (15 min = ¼ de hora).\n• "7:30" lê-se "sete e meia" (30 min = ½ hora).\n\n**❌ O que se costuma errar**\n• Confundir ponteiro grande (minutos) com pequeno (horas).\n• Achar que 1 hora = 100 minutos — são 60!\n• Trocar fevereiro (28-29) com os outros meses.'
    },
    'matematica/Dinheiro': {
        title: 'Dinheiro (€)',
        body: 'Em Portugal usa-se o **euro (€)**. **1 € = 100 cêntimos**.\n\n**Moedas** (cêntimos): 1c, 2c, 5c, 10c, 20c, 50c.\n**Moedas** (euro): 1 €, 2 €.\n**Notas**: 5 €, 10 €, 20 €, 50 €, 100 €, 200 €, 500 €.\n\n**Escrita**:\n• 8,50 € → **oito euros e cinquenta cêntimos**.\n• 0,75 € → 75 cêntimos.\n\n**Troco**: dinheiro que volta quando se paga mais do que custa.\nEx: livro custa 8,50 €. Pago 10 €. Troco = 10 − 8,50 = **1,50 €**.\n\n**❌ O que se costuma errar**\n• Esquecer que 1 € = 100 cêntimos (não 10!).\n• Trocar a vírgula com o ponto: 8,50 (PT) ≠ 8.50 (formato inglês).\n• Calcular troco somando em vez de subtrair.'
    },
    'matematica/Tabelas e gráficos': {
        title: 'Tabelas e gráficos',
        body: '**Tabelas e gráficos** organizam dados de forma visual.\n\n**Tipos de gráfico**:\n• **De barras** — bom para comparar quantidades. Ex: votos por candidato.\n• **De linhas** — bom para mostrar evolução ao longo do tempo (temperatura ao longo da semana).\n• **Circular** ("queijinho" / pie chart) — bom para mostrar partes de um todo (% de cada cor numa caixa).\n\n**Para ler um gráfico**:\n1. Ver o título (de que fala?).\n2. Ver os eixos (o que medem?).\n3. Comparar as alturas das barras / fatias.\n\n**Frequência** = quantas vezes algo aparece. **Total** = soma de todas as frequências.\n\n**❌ O que se costuma errar**\n• Esquecer-se de somar todas as barras para o total.\n• Confundir gráfico de barras com gráfico circular.\n• Não ler o título nem os eixos antes de responder.'
    },

    // ===== SCIENCE (em inglês) =====
    'estudo_meio/Living things': {
        title: 'Living things',
        body: 'All **living things** share these features:\n\n• They **grow** (they get bigger).\n• They **feed** (they need food).\n• They **breathe** (they need air/oxygen).\n• They **reproduce** (they make more of themselves).\n• They **move** (some, like animals, move from place to place; plants move slower — they grow towards light).\n• They **respond to changes** (e.g. plants turn to the Sun).\n\nNon-living things (rocks, water, fire) may do some of these — but not ALL.\n\n**❌ What students often get wrong**\n• Thinking a flame is alive because it grows — it does not feed, breathe or reproduce.\n• Forgetting that plants are living things (they grow, feed, breathe).\n• Mixing up "living" (alive now) with "non-living" (not alive — never was, or no longer alive).'
    },
    'estudo_meio/Plants': {
        title: 'Plants',
        body: '**Parts of a plant** and what they do:\n\n• **Roots** — hold the plant in the ground and absorb water and minerals.\n• **Stem** — supports the plant and carries water from roots to leaves.\n• **Leaves** — make food using sunlight (photosynthesis).\n• **Flower** — makes seeds (it later turns into the fruit).\n• **Fruit** — protects the seeds.\n\n**What plants need**: light, water, air (CO₂) and minerals from the soil.\n\n**Photosynthesis** = making food in the leaves using sunlight + water + carbon dioxide → produces glucose (food) and oxygen.\n\n**❌ What students often get wrong**\n• Saying plants make food in the roots — they make it in the LEAVES.\n• Forgetting plants need air (CO₂) too — not just light and water.\n• Thinking the fruit comes from the leaf — it comes from the FLOWER.'
    },
    'estudo_meio/Animals and habitats': {
        title: 'Animals and habitats',
        body: '**Animal groups (vertebrates)**:\n• **Mammals** — fur, give birth to live young, feed them milk (humans, dogs, dolphins).\n• **Birds** — feathers, beak, lay eggs, most can fly (eagle, sparrow).\n• **Fish** — scales, gills, live in water (salmon, shark).\n• **Reptiles** — scaly skin, cold-blooded, lay eggs (lizard, crocodile).\n• **Amphibians** — moist skin, live partly in water and partly on land (frog, salamander).\n\n**Habitat** = the natural home of an animal.\n• **Polar regions** — polar bears, penguins.\n• **Desert** — camels, lizards.\n• **Rainforest** — monkeys, parrots.\n• **Ocean** — fish, whales.\n\nAnimals have **adaptations** that help them live in their habitat (e.g. camels store fat in their hump for the desert).\n\n**❌ What students often get wrong**\n• Thinking whales and dolphins are fish — they are MAMMALS (they breathe air, feed milk).\n• Saying all birds fly — penguins and ostriches do NOT fly.\n• Confusing reptiles with amphibians — reptiles are dry-scaled and lay eggs on land; amphibians have moist skin.'
    },
    'estudo_meio/The human body': {
        title: 'The human body',
        body: 'The body has many **systems**, each doing an important job:\n\n• **Skeletal system** — about 206 bones support the body.\n• **Muscular system** — muscles work with bones to move.\n• **Circulatory system** — the **heart** pumps blood through veins and arteries.\n• **Respiratory system** — **lungs** take in air; oxygen passes into the blood.\n• **Digestive system** — mouth → stomach → intestines: turns food into energy.\n• **Nervous system** — brain and nerves: control everything.\n\n**❌ What students often get wrong**\n• Saying "I breathe with my heart" — we breathe with our LUNGS. The heart pumps blood.\n• Confusing veins with arteries.\n• Forgetting that bones grow with us — they are alive!'
    },
    'estudo_meio/Senses': {
        title: 'The five senses',
        body: 'Humans have **5 senses** to learn about the world:\n\n• **Sight** — eyes — see colours, shapes, distances.\n• **Hearing** — ears — hear sounds, music, speech.\n• **Smell** — nose — smell flowers, food, danger (smoke).\n• **Taste** — tongue — sweet, salty, sour, bitter, umami.\n• **Touch** — skin — pressure, heat, cold, pain.\n\nEach sense is connected to the **brain**, which makes sense of all the signals.\n\n**❌ What students often get wrong**\n• Saying we taste with the nose — we taste with the TONGUE (but smell helps a lot).\n• Confusing the 5 senses (counting too few or too many).\n• Forgetting that touch is not just in the fingers — it is in all the SKIN.'
    },
    'estudo_meio/Healthy eating': {
        title: 'Healthy eating',
        body: 'A balanced diet has different **food groups**:\n\n• **Carbohydrates** (bread, rice, pasta, potatoes) — main source of **energy**.\n• **Proteins** (meat, fish, eggs, beans, tofu) — for **growth** and repair.\n• **Fats** (oil, butter, nuts) — store energy and protect organs (a small amount only!).\n• **Vitamins and minerals** (fruit, vegetables) — keep us healthy.\n• **Fibre** (whole grains, fruit, vegetables) — helps digestion.\n• **Water** — every cell needs water.\n\nEat a **rainbow** of fruit and vegetables every day. Drink water. Limit sugary drinks and sweets.\n\n**❌ What students often get wrong**\n• Thinking fat is always bad — we need small amounts of healthy fats.\n• Eating only one food group (e.g. only bread) — body needs variety.\n• Forgetting water — we need 6-8 glasses a day.'
    },
    'estudo_meio/Materials and their properties': {
        title: 'Materials and their properties',
        body: 'Different **materials** have different **properties** that make them suitable for different uses.\n\nCommon materials:\n• **Wood** — strong, light, can be cut. Used for furniture, paper.\n• **Metal** — hard, strong, conducts heat and electricity. Used for tools, wires.\n• **Plastic** — light, waterproof, flexible. Used for bottles, toys.\n• **Glass** — transparent (you can see through), fragile. Used for windows, cups.\n• **Fabric** — soft, flexible. Used for clothes.\n• **Paper** — light, can be folded, absorbs water.\n\n**Properties to test**: hard/soft, transparent/opaque, flexible/rigid, magnetic/non-magnetic, waterproof/absorbent.\n\n**❌ What students often get wrong**\n• Confusing material (what something is made of) with object (what something is).\n• Saying "all metal is magnetic" — only some metals (iron, steel, nickel) are magnetic; aluminium is not.\n• Mixing up "transparent" (see clearly through) with "translucent" (light passes but blurry).'
    },
    'estudo_meio/Solids, liquids and gases': {
        title: 'Solids, liquids and gases',
        body: 'Matter exists in **3 main states**:\n\n• **Solid** — has a fixed shape and a fixed volume. Particles are tightly packed (e.g. ice, wood, rock).\n• **Liquid** — has a fixed volume but takes the shape of its container. Particles are close but can move past each other (e.g. water, milk, oil).\n• **Gas** — has no fixed shape and no fixed volume — fills all the space available. Particles move fast and are far apart (e.g. air, water vapour, helium).\n\n**Changes of state**:\n• Solid → liquid = **melting** (ice → water).\n• Liquid → gas = **evaporation** (water → water vapour).\n• Gas → liquid = **condensation** (vapour → drops on a cold glass).\n• Liquid → solid = **freezing** (water → ice).\n\n**❌ What students often get wrong**\n• Thinking gas is always invisible — water vapour is gas (mostly invisible), but mist is tiny droplets (already liquid).\n• Confusing condensation with evaporation.\n• Saying solid means "very hard" — ice is solid but breaks easily.'
    },
    'estudo_meio/Mixing and separating': {
        title: 'Mixing and separating',
        body: 'When we mix things together we make a **mixture**. Some mixtures dissolve, some don\'t.\n\n• **Dissolve** = a solid disappears into a liquid (e.g. salt or sugar in water → forms a **solution**).\n• Some things do **not** dissolve (e.g. sand in water).\n\n**Separating mixtures** — different methods for different mixtures:\n• **Sieving** — separates big pieces from small (e.g. flour from lumps).\n• **Filtering** — separates a solid from a liquid using a filter (e.g. sand from water using filter paper).\n• **Magnetism** — picks up iron pieces from sand or rice using a magnet.\n• **Evaporation** — boils away the water to leave the dissolved solid (e.g. salt from seawater).\n\n**❌ What students often get wrong**\n• Saying salt "disappears" — it actually DISSOLVES (the salt is still there, just spread out in tiny particles).\n• Trying to filter salt out of water — can\'t, it\'s dissolved. Need EVAPORATION.\n• Confusing sieve with filter.'
    },
    'estudo_meio/Forces (push and pull)': {
        title: 'Forces — push and pull',
        body: 'A **force** is a push or a pull. Forces can:\n\n• **Start** something moving.\n• **Stop** something moving.\n• Make something **speed up** or **slow down**.\n• **Change the direction** of something moving.\n• Change the **shape** of something (squashing, stretching).\n\n**Examples**:\n• Push: kicking a ball, pressing a button, pushing a swing.\n• Pull: opening a drawer, pulling a rope, gravity pulling things down.\n\n**Friction** = a force that slows things down when surfaces rub together (e.g. brakes on a bike).\n\n**Gravity** = a pull from the Earth that makes things fall down.\n\n**❌ What students often get wrong**\n• Thinking forces are only when something moves — a book on a table has gravity pulling it down (and the table pushing up).\n• Not seeing friction — it works invisibly (rolling ball stops because of friction).\n• Confusing push and pull (some forces are both — a swing is pushed away and pulled back).'
    },
    'estudo_meio/Magnets': {
        title: 'Magnets',
        body: 'A **magnet** attracts certain materials. The materials it attracts are called **magnetic**.\n\n**Magnetic materials**: iron, steel, nickel, cobalt.\n**Non-magnetic materials**: wood, plastic, paper, aluminium, copper, glass.\n\n**Poles**: every magnet has a **north pole (N)** and a **south pole (S)**.\n• Opposite poles **attract** (N and S pull together).\n• Same poles **repel** (N and N push apart).\n\n**Uses of magnets**: fridge magnets, compass (Earth itself is a giant magnet!), motors, headphones, magnetic locks.\n\n**❌ What students often get wrong**\n• Thinking all metals are magnetic — only iron, steel and a few others are.\n• Saying same poles attract — they REPEL. Opposite poles attract.\n• Forgetting that magnetism works without touching (a magnet attracts iron from a small distance).'
    },
    'estudo_meio/Light and shadows': {
        title: 'Light and shadows',
        body: 'Light comes from **sources** — things that produce their own light:\n• **Natural sources**: Sun, stars, fire, lightning, fireflies.\n• **Artificial sources**: light bulbs, torches, candles, screens.\n\nThe **Moon** is NOT a source — it reflects the Sun\'s light.\n\nObjects can be:\n• **Transparent** — light passes through (clear glass, water).\n• **Translucent** — some light passes (frosted glass, thin paper).\n• **Opaque** — no light passes (wood, metal, your body).\n\n**Shadows** form when an opaque object blocks light. Shadow is biggest when the light source is close, and longest when the source is low.\n\n**❌ What students often get wrong**\n• Saying the Moon is a light source — it just reflects sunlight.\n• Confusing transparent (clear) with translucent (blurry).\n• Forgetting that shadows change size and direction depending on where the light comes from.'
    },
    'estudo_meio/The Sun, Earth and Moon': {
        title: 'The Sun, Earth and Moon',
        body: 'The **Sun** is a giant star at the centre of our solar system. It gives us **light** and **heat**.\n\nThe **Earth** moves in two ways:\n• **Rotation** — it spins on its own axis. Takes **24 hours** = 1 day. This is what gives us **day and night**.\n• **Orbit (revolution)** — it travels around the Sun. Takes about **365 days** = 1 year. This is what gives us the **seasons**.\n\nThe **Moon** is a natural satellite — it orbits the Earth. Takes about **28 days**.\n\n**Phases of the Moon**: New Moon, Crescent, First Quarter, Gibbous, Full Moon, and back. The Moon doesn\'t change shape — we just see different parts of it lit by the Sun.\n\n**❌ What students often get wrong**\n• Saying the Sun moves around the Earth — it\'s the EARTH that moves around the SUN.\n• Confusing rotation (1 day) with orbit (1 year).\n• Thinking the Moon makes its own light — it reflects sunlight.'
    },
    'estudo_meio/Weather': {
        title: 'Weather',
        body: '**Weather** = what the air is doing now (today, this week). **Climate** = the usual weather over many years.\n\n**Types of weather**: sunny, cloudy, rainy, snowy, windy, foggy, stormy.\n\n**The water cycle** (where rain comes from):\n1. The Sun **evaporates** water from oceans and lakes (water → water vapour, a gas).\n2. The vapour rises and **condenses** into tiny droplets — this makes **clouds**.\n3. When droplets become heavy, they fall as **rain** (or snow, hail).\n4. Water flows back to the sea — and the cycle repeats.\n\n**Instruments** to measure weather:\n• **Thermometer** — temperature.\n• **Rain gauge** — how much rain falls.\n• **Anemometer** — wind speed.\n• **Barometer** — air pressure.\n\n**❌ What students often get wrong**\n• Confusing weather (now) with climate (long term).\n• Thinking clouds are made of cotton or smoke — they are tiny water DROPLETS.\n• Saying rain comes from the Sun — it comes from CLOUDS (which formed because of the Sun evaporating water).'
    },

    // ===== ENGLISH (literacy, em inglês) =====
    'ingles/Nouns': {
        title: 'Nouns',
        body: 'A **noun** is a naming word. It names a person, animal, place or thing.\n\nTypes of noun:\n• **Common noun** — general name. Ex: dog, city, teacher.\n• **Proper noun** — special name of a person/place. Always starts with a CAPITAL letter. Ex: Maria, London, Tagus.\n• **Collective noun** — name for a group. Ex: a **flock** of birds, a **swarm** of bees, a **herd** of cows.\n\n**Singular and plural**:\n• Add **-s** for most nouns: cat → cat**s**.\n• Add **-es** after -s, -x, -ch, -sh: bus → bus**es**, box → box**es**.\n• -y → -ies: baby → bab**ies**.\n• Irregular: child → **children**, foot → **feet**, mouse → **mice**.\n\n**❌ What students often get wrong**\n• Forgetting capital letters for proper nouns (london ✗ → London ✓).\n• Saying "childs" or "mouses" — irregular plurals are children, mice.\n• Confusing collective nouns (a "swarm" of cows ✗ → herd of cows; swarm = bees).'
    },
    'ingles/Verbs': {
        title: 'Verbs',
        body: 'A **verb** is a doing word or being word — what someone does or is.\n\n**Action verbs**: run, eat, jump, sing, write.\n**Being verbs**: am, is, are, was, were (forms of "to be").\n**Helping verbs**: have, has, had, will, can.\n\nEvery sentence needs a verb!\n\n**Tense** — when the action happens:\n• **Present**: I play. (now)\n• **Past**: I played. (yesterday)\n• **Future**: I will play. (tomorrow)\n\n**Irregular past forms** to learn: go → went, eat → ate, see → saw, do → did, have → had, run → ran, take → took.\n\n**❌ What students often get wrong**\n• Forgetting the verb in a sentence (a sentence MUST have a verb).\n• Adding "-ed" to irregular verbs ("goed" ✗ → went).\n• Confusing "is" (singular) with "are" (plural) — He IS happy / They ARE happy.'
    },
    'ingles/Adjectives': {
        title: 'Adjectives',
        body: 'An **adjective** describes a noun — it tells us what something is like.\n\n**Examples**: a **big** house, a **red** car, a **happy** child, **cold** water.\n\nAdjectives can describe:\n• **Size**: big, small, tall, short, huge, tiny.\n• **Colour**: red, blue, yellow, green.\n• **Shape**: round, square, long, flat.\n• **Feeling**: happy, sad, angry, excited.\n• **Number**: many, few, three, several.\n\n**Comparative and superlative**:\n• **Comparative** (comparing 2): -er or "more". Ex: tall**er**, **more** beautiful.\n• **Superlative** (comparing 3+): -est or "most". Ex: tall**est**, **most** beautiful.\n\n**❌ What students often get wrong**\n• Confusing adjectives with adverbs (adverbs describe verbs: "She runs **quickly**").\n• Using "more" with -er ("more taller" ✗ → taller ✓).\n• Wrong order: "house big" ✗ → "big house" ✓ (English: adjective BEFORE noun).'
    },
    'ingles/Tenses': {
        title: 'Tenses',
        body: 'Tenses tell us **when** an action happens.\n\n**Present simple** — habits, facts, routines.\n• I **play** football every day. / She **plays** the piano.\n• Add -**s** for he/she/it: I play → He play**s**.\n\n**Past simple** — actions in the past, finished.\n• I **played** football yesterday.\n• Regular: add -**ed**. Irregular: special form (went, ate, saw, did, ran).\n\n**Future** — actions that haven\'t happened yet.\n• I **will play** football tomorrow.\n• Or "be going to": I **am going to play** football.\n\n**Time signal words**: yesterday/last week → past · now/today/usually → present · tomorrow/next week → future.\n\n**❌ What students often get wrong**\n• Forgetting the **-s** with he/she/it in present simple ("He play" ✗ → "He plays" ✓).\n• Using -ed on irregular verbs ("goed" ✗ → "went").\n• Mixing tenses in the same sentence ("Yesterday I go" ✗ → "Yesterday I went").'
    },
    'ingles/Punctuation': {
        title: 'Punctuation',
        body: 'Punctuation marks help us read and write clearly.\n\n• **Full stop (.)** — ends a statement. *I love pizza.*\n• **Question mark (?)** — ends a question. *Do you love pizza?*\n• **Exclamation mark (!)** — strong feeling. *I love pizza!*\n• **Comma (,)** — small pause / lists. *I bought apples, pears, and bananas.*\n• **Apostrophe (\')** — replaces missing letters (don\'t = do not) OR shows ownership (Maria\'s book).\n• **Quotation marks (" ")** — what someone said. *She said "Hello!"*\n\n**Capital letters** — start of every sentence + proper nouns + days/months + "I".\n\n**❌ What students often get wrong**\n• Forgetting capital letter at the start of a sentence.\n• Mixing up its (belonging) and it\'s (it is): *The dog wagged **its** tail. **It\'s** sunny today.*\n• Not putting commas between items in a list.'
    },
    'ingles/Sentence types': {
        title: 'Sentence types',
        body: 'There are **4 types of sentence** in English:\n\n• **Statement** (declarative) — gives information. Ends with **".".** *The sun is shining.*\n• **Question** (interrogative) — asks for information. Ends with **"?"**. Often starts with what/who/when/where/why/how. *Where is my book?*\n• **Command** (imperative) — tells someone what to do. Often ends with "." or "!". *Sit down. Close the door!*\n• **Exclamation** — shows strong feeling. Ends with "**!**". *What a lovely day!*\n\n**Question words** (the 5 W\'s + H): **W**ho, **W**hat, **W**hen, **W**here, **W**hy, **H**ow.\n\n**❌ What students often get wrong**\n• Forgetting the question mark in questions.\n• Confusing commands with statements (a command tells, a statement just informs).\n• Using "?" for exclamations or vice-versa.'
    },
    'ingles/Synonyms and antonyms': {
        title: 'Synonyms and antonyms',
        body: '**Synonyms** = words with the **same** or similar meaning.\n• happy ≈ glad ≈ joyful ≈ cheerful\n• big ≈ large ≈ huge ≈ enormous\n• fast ≈ quick ≈ rapid ≈ speedy\n• sad ≈ unhappy ≈ miserable\n\n**Antonyms** = words with **opposite** meaning.\n• hot ↔ cold\n• up ↔ down\n• big ↔ small\n• happy ↔ sad\n• fast ↔ slow\n• day ↔ night\n• open ↔ closed\n• begin ↔ end\n\nUsing synonyms makes writing more **interesting** — you don\'t repeat the same word.\n\n**❌ What students often get wrong**\n• Confusing synonym (same meaning) with antonym (opposite).\n• Thinking synonyms are exactly the same — they often have small differences (big vs huge).\n• Looking only for one antonym when many can work (cold has antonyms: hot, warm).'
    },
    'ingles/Reading comprehension': {
        title: 'Reading comprehension',
        body: 'Stories have key elements:\n\n• **Characters** — who is in the story (the people, animals, creatures). The MAIN character is the **protagonist**.\n• **Setting** — **where** and **when** the story happens (a forest, the year 1900).\n• **Plot** — what happens, in order. Usually: **beginning → middle → end**.\n• **Author** — the person who WROTE the story.\n• **Narrator** — the voice that TELLS the story (1st person "I" or 3rd person "she/he").\n\nWhen reading, ask yourself:\n• **Who** is in the story?\n• **Where** and **when** does it happen?\n• **What** happens? (problem and solution)\n• **Why** did the character do that?\n• **How** does it end?\n\n**❌ What students often get wrong**\n• Confusing the **author** (real person) with the **narrator** (voice in the text).\n• Mixing up the protagonist (main character) with the narrator.\n• Forgetting the order of events when retelling.'
    }
};
const LESSONS_3 = {
    ...Object.fromEntries(Object.entries(LESSONS_3_OCEANUS).filter(([k]) =>
        k.startsWith('portugues/') || k.startsWith('matematica/')
    )),

    // ----- ESCRITA (Oficina de Escrita) -----
    'escrita/Maiúscula e ponto final': { title:'Maiúscula e ponto final', body:'Uma **frase** é uma ideia completa. E toda a frase tem duas marcas:\n\n• Começa com letra **MAIÚSCULA** 🔠\n• Acaba com **ponto final** (.) — ou ? ou !\n\n**Exemplo**:\n❌ o gato dorme a menina brinca\n✅ **O** gato dorme**.** **A** menina brinca**.**\n\n**Truque**: lê o que escreveste em voz alta. Onde a voz PÁRA, é ali que vai o ponto. Depois do ponto, letra grande!\n\n**❌ O que se costuma errar**\n• Escrever as ideias todas seguidas sem nenhum ponto.\n• Esquecer a maiúscula depois do ponto.\n• Esquecer que nomes de pessoas (Rui, Ana) e terras (Lisboa) levam sempre maiúscula.' },
    'escrita/Frase com sentido': { title:'Frase com sentido', body:'Uma frase tem de **fazer sentido** — as palavras têm uma ordem.\n\nA ordem mais comum:\n**QUEM** + **O QUE FAZ** + **O QUÊ**\n\n• **O Rui** (quem) **chuta** (o que faz) **a bola** (o quê).\n• **A avó** faz **sopa**.\n\n❌ «Ladra o casa cão» — palavras baralhadas, não é frase.\n✅ «O cão ladra na casa.»\n\n**Truque**: pergunta primeiro *quem?* — começa a frase por aí.\n\n**❌ O que se costuma errar**\n• Começar pela ação sem dizer quem ("foi ao pomar" — quem foi?).\n• Saltar palavras pequenas (o, a, de, à) que fazem falta.' },
    'escrita/Palavras que ligam': { title:'Palavras que ligam', body:'Para o texto ficar **seguido e bonito**, usamos palavras que ligam as ideias:\n\n**Tempo (ordem)**:\n• **Primeiro**… • **Depois**… • **A seguir**… • **No fim**…\n\n**Causa**: **porque** — «Fiquei feliz **porque** ganhei um livro.»\n\n**Oposição**: **mas** — «Queria brincar, **mas** estava a chover.»\n\n**Exemplo de história ligada**:\n«**Primeiro**, o Sr. Júlio foi à quinta. **Depois** apanhou fruta. **No fim**, fez sumo.»\n\n**❌ O que se costuma errar**\n• Escrever tudo com "e e e" ("fui e vi e comi e…").\n• Não usar nenhuma palavra de ligação — o texto fica aos solavancos.' },
    'escrita/Ordena a história': { title:'Ordena a história', body:'Toda a história tem **3 partes**, sempre pela mesma ordem:\n\n**1. PRINCÍPIO** 🌅 — quem? onde? quando?\n«Era uma vez… / No fim de semana, o Sr. Júlio…»\n\n**2. MEIO** 🎬 — o que acontece? (as ações, uma de cada vez)\n«Foi à quinta. Apanhou fruta. Visitou a fábrica.»\n\n**3. FIM** 🌙 — como acaba?\n«No fim, voltou para casa feliz.»\n\n**Truque**: antes de escrever, diz a história em voz alta com os dedos: 1 = princípio, 2 = meio, 3 = fim.\n\n**❌ O que se costuma errar**\n• Misturar as partes (contar o fim no princípio).\n• Esquecer o fim — a história fica "pendurada".' },
    'escrita/Do plano ao texto': { title:'Do plano ao texto', body:'Nos testes aparece um **plano** — uma lista de ideias:\n\n_Sr. Júlio · quinta · fim de semana · apanha da fruta · fábrica de sumo_\n\nA regra de ouro: **cada ponto do plano vira (pelo menos) uma frase completa**.\n\n• "quinta" → «No fim de semana, o Sr. Júlio foi à quinta.»\n• "apanha da fruta" → «Lá, apanhou fruta madura.»\n• "fábrica de sumo" → «Depois visitou a fábrica e fez sumo.»\n\nE no fim, uma frase de fecho: «Foi um fim de semana divertido.»\n\n**Passos**: 1️⃣ lê o plano todo · 2️⃣ decide a ordem · 3️⃣ escreve uma frase por ponto · 4️⃣ liga com Primeiro/Depois/No fim · 5️⃣ relê e põe os pontos!\n\n**❌ O que se costuma errar**\n• Copiar as palavras do plano sem fazer frases.\n• Escrever tudo seguido sem pontos.\n• Esquecer pontos do plano (risca cada um quando o usares!).' },
    'escrita/Descrever com pormenor': { title:'Descrever com pormenor', body:'A escrita boa faz o leitor **VER** a cena. O segredo são os **pormenores**:\n\n❌ «Vi um cão.»\n✅ «Vi um cão **castanho**, **pequeno** e **brincalhão**.»\n\nOs **adjetivos** dizem COMO é: cores, tamanhos, feitios.\n\n**Perguntas mágicas** para enriquecer qualquer frase:\n• De que **cor** é? • É **grande ou pequeno**? • **Como se sente**? • O que se **ouve/cheira**?\n\n«Havia uma casa.» → «Havia uma casa **velha**, com **telhado vermelho** e uma **porta azul** que rangia.»\n\n**❌ O que se costuma errar**\n• Frases só com o mínimo ("Foi bom.", "Vi coisas.").\n• Repetir sempre o mesmo adjetivo (tudo é "grande" ou "fixe").' },

    // ----- PORTUGUÊS (novos do Lourdes) -----
    'portugues/Sílabas': {
        title: 'Sílabas',
        body: 'Uma **sílaba** é um som que se pronuncia de uma só vez. Toda a sílaba tem PELO MENOS uma vogal.\n\nExemplos de divisão silábica:\n• **ca-sa** (2 sílabas)\n• **bor-bo-le-ta** (4 sílabas)\n• **pão** (1 sílaba — ditongo)\n• **sa-í-da** (3 sílabas — hiato)\n\n**Sílaba tónica** = a sílaba que se pronuncia com mais força. Ex: em "**ca**-sa" a sílaba tónica é "ca".\n\n**❌ O que se costuma errar**\n• Esquecer que toda a sílaba tem uma vogal.\n• Não saber que ditongos (pai, mãe) ficam numa única sílaba.\n• Trocar sílaba tónica (forte) com sílaba átona (fraca).'
    },
    'portugues/Pronomes pessoais': {
        title: 'Pronomes pessoais',
        body: 'Os **pronomes pessoais** substituem os nomes para evitar repetições.\n\n**Sujeito** (quem faz a ação):\n• 1.ª pessoa: **eu** (singular) / **nós** (plural)\n• 2.ª pessoa: **tu** (singular) / **vós** (plural)\n• 3.ª pessoa: **ele/ela** (singular) / **eles/elas** (plural)\n\nEx: "A Maria comprou um livro. **Ela** está contente." — "Ela" = Maria.\n\n**Complemento** (depois do verbo): me, te, o/a, nos, vos, os/as. Ex: "Vi-**o** ontem" (= vi ele ontem).\n\n**❌ O que se costuma errar**\n• Confundir "ele" (3.ª pessoa) com "tu" (2.ª pessoa).\n• Esquecer que "vós" é plural de "tu" (raro hoje, usa-se "vocês").\n• Achar que "o" e "a" são sempre artigos — também podem ser pronomes (vi-o = vi ele).'
    },
    'portugues/Texto poético': {
        title: 'Texto poético',
        body: 'Um **poema** é um texto escrito em **versos** (linhas) agrupados em **estrofes**.\n\n• **Verso** — cada linha do poema.\n• **Estrofe** — grupo de versos separados por uma linha em branco.\n• **Rima** — palavras com sons parecidos no fim do verso. Ex: lu**a** / ru**a**, m**ar** / cant**ar**.\n• **Ritmo** — a cadência/musicalidade.\n\nUma estrofe de 4 versos chama-se **quadra**.\n\n**❌ O que se costuma errar**\n• Confundir verso (linha) com estrofe (grupo de linhas).\n• Achar que todo o texto com rimas é um poema.\n• Contar mal as estrofes — separam-se por linhas em branco.'
    },
    'portugues/Banda desenhada': {
        title: 'Banda desenhada',
        body: 'A **banda desenhada (BD)** conta uma história com **imagens e palavras**.\n\n• **Vinheta** — cada "quadradinho" da BD.\n• **Balão** — onde se escreve o que a personagem **diz**.\n• **Pensamento** — balão em forma de nuvem (o que a personagem **pensa**).\n• **Legenda** — texto fora dos balões (narrador).\n• **Onomatopeia** — palavras que imitam sons: BOOM!, MIAU!, ZÁS!.\n\nA BD lê-se da **esquerda para a direita** e de **cima para baixo**.\n\n**❌ O que se costuma errar**\n• Confundir balão de fala com balão de pensamento (nuvem).\n• Não saber a ordem de leitura.\n• Ignorar as onomatopeias — fazem parte da narrativa.'
    },

    // ----- MATEMÁTICA (novos do Lourdes) -----
    'matematica/Cálculo mental': {
        title: 'Cálculo mental',
        body: 'O **cálculo mental** é fazer contas DE CABEÇA, sem papel. Truques:\n\n• **Decompor**: 47 + 25 = (40 + 20) + (7 + 5) = 60 + 12 = 72.\n• **Arredondar**: 98 + 56 ≈ 100 + 56 − 2 = 154.\n• **Compensar** na subtração: 73 − 28 = 73 − 30 + 2 = 45.\n• Multiplicar por 10/100/1000: juntar zeros (4 × 100 = 400).\n• Metade e dobro: 8 × 5 = (8 × 10) ÷ 2 = 40.\n\nQuanto mais treinares, mais rápido fica.\n\n**❌ O que se costuma errar**\n• Esquecer de compensar (47 + 25 → arredondo a 50, esqueço-me de tirar 3).\n• Achar que tudo se decompõe igual — é preciso escolher boa estratégia.\n• Confundir "metade" com "dobro".'
    },
    'matematica/Massa e capacidade': {
        title: 'Massa e capacidade',
        body: '**Massa** mede-se em **gramas (g)** e **quilogramas (kg)**.\n• 1 **kg** = 1 000 g\n• 1 **t** (tonelada) = 1 000 kg\n\nInstrumento: a **balança**.\n\n**Capacidade** mede-se em **litros (L)** e **mililitros (mL)**.\n• 1 **L** = 1 000 mL\n• 1 **dL** = 100 mL = 1/10 L\n\nInstrumento: o **copo graduado** / **medidor**.\n\nExemplos:\n• 1 maçã ≈ 200 g; 1 saco de batatas ≈ 5 kg\n• 1 garrafa de água = 1,5 L; 1 chávena ≈ 250 mL\n\n**❌ O que se costuma errar**\n• Confundir massa (kg, g) com capacidade (L, mL).\n• Esquecer que 1 kg = 1 000 g (não 100).\n• Trocar L com mL: 500 mL = meio L, NÃO 500 L.'
    },

    // ----- ESTUDO DO MEIO (em português) -----
    'estudo_meio/O passado da criança': {
        title: 'O passado da criança',
        body: 'Cada criança tem um **passado** — coisas que aconteceram na sua vida. Para o organizar usa-se uma **linha do tempo**.\n\n• **Data de nascimento** — o dia, mês e ano em que nasceste.\n• **Idade** — quantos anos tens hoje.\n• **Marcos importantes**: creche, jardim de infância, 1.º ano da escola, mudanças, viagens.\n• **Árvore genealógica** — esquema da família (pais, avós, bisavós, irmãos, tios, primos).\n\nDocumentos importantes: **cartão de cidadão**, **boletim de vacinas**.\n\n**❌ O que se costuma errar**\n• Confundir avós (pais dos teus pais) com bisavós (pais dos avós).\n• Esquecer-se de que a idade muda no dia do aniversário.\n• Não saber a diferença entre primo (filho de tio) e irmão.'
    },
    'estudo_meio/O corpo humano': {
        title: 'O corpo humano',
        body: 'O corpo humano divide-se em 3 grandes partes:\n\n• **Cabeça** — onde estão o cérebro e os 5 sentidos.\n• **Tronco** — onde estão os órgãos vitais (coração, pulmões, estômago).\n• **Membros** — superiores (braços, mãos) e inferiores (pernas, pés).\n\nO **esqueleto** (~206 ossos) dá forma ao corpo e protege os órgãos. Os **músculos** ligam-se aos ossos e fazem-nos mover. As **articulações** (joelho, cotovelo) permitem dobrar.\n\n**❌ O que se costuma errar**\n• Achar que coração e pulmões estão na cabeça — estão no tronco.\n• Confundir esqueleto (ossos) com músculos.\n• Esquecer-se que a pele é o maior órgão do corpo.'
    },
    'estudo_meio/Os sistemas do corpo': {
        title: 'Os sistemas do corpo',
        body: 'O corpo trabalha através de **sistemas**:\n\n• **Sistema digestivo** — transforma comida em energia. Boca → esófago → estômago → intestinos → ânus.\n• **Sistema respiratório** — traz oxigénio. Nariz/boca → traqueia → pulmões.\n• **Sistema circulatório** — leva sangue a todo o corpo. **Coração** + veias + artérias.\n• **Sistema urinário** — filtra o sangue e elimina urina. Rins + bexiga.\n• **Sistema reprodutor** — para ter filhos.\n• **Sistema nervoso** — controla tudo. Cérebro + medula + nervos.\n\nTodos trabalham em conjunto.\n\n**❌ O que se costuma errar**\n• Confundir digestivo (comida) com respiratório (ar).\n• Achar que o sangue circula apenas pelas artérias — também pelas veias.\n• Esquecer que o cérebro coordena tudo.'
    },
    'estudo_meio/A saúde e a prevenção': {
        title: 'A saúde e a prevenção',
        body: 'Para sermos **saudáveis** precisamos de:\n\n• **Alimentação variada e equilibrada** — fruta, vegetais, cereais, lacticínios, carne/peixe/ovos, sem excesso de doces.\n• **Roda dos Alimentos** — mostra as proporções.\n• **Exercício físico** — pelo menos 1h/dia.\n• **Higiene**: lavar as mãos antes das refeições, escovar dentes 2× por dia, banho diário.\n• **Sono** — 9–11 horas para uma criança.\n• **Vacinas** — protegem-nos de doenças graves.\n• Visitas regulares ao **médico** e ao **dentista**.\n\n**❌ O que se costuma errar**\n• Achar que basta comer fruta para ser saudável — é preciso variar.\n• Esquecer-se de lavar as mãos antes de comer.\n• Não saber que dormir mal afeta a saúde.'
    },
    'estudo_meio/Os cinco sentidos': {
        title: 'Os cinco sentidos',
        body: 'Os **5 sentidos** ajudam-nos a conhecer o mundo:\n\n• **Visão** — os **olhos** veem cores, formas, distâncias.\n• **Audição** — os **ouvidos** ouvem sons.\n• **Olfato** — o **nariz** cheira.\n• **Paladar** — a **língua** sente sabores (doce, salgado, ácido, amargo).\n• **Tato** — a **pele** sente temperatura, dor, pressão, texturas.\n\nAlgumas pessoas têm um sentido que não funciona bem (cegos, surdos) e desenvolvem mais os outros.\n\n**❌ O que se costuma errar**\n• Confundir olfato (cheiro) com paladar (sabor).\n• Esquecer que o tato está em toda a pele.\n• Achar que só vemos com luz natural.'
    },
    'estudo_meio/O passado do meio local': {
        title: 'O passado do meio local',
        body: 'O **meio local** é o sítio onde vives (a tua freguesia, vila ou cidade).\n\n• Tem um **nome**, uma **bandeira** e um **brasão**.\n• Pertence a um **concelho** (governado por uma **Câmara Municipal**).\n• O concelho pertence a um **distrito** ou **região**.\n\nO meio local tem **vestígios do passado**:\n• **Monumentos** antigos (igrejas, castelos, casas, fontes).\n• **Tradições** (festas, danças, comida típica).\n• **Personalidades** importantes que ali nasceram ou viveram.\n\nSanto Tirso é conhecido pelo **Mosteiro de São Bento** e pela indústria têxtil.\n\n**❌ O que se costuma errar**\n• Confundir concelho (município) com distrito (maior).\n• Esquecer que cada freguesia tem o seu nome próprio.\n• Achar que monumentos só estão em Lisboa.'
    },
    'estudo_meio/Símbolos nacionais': {
        title: 'Símbolos nacionais',
        body: 'Portugal tem **símbolos** que o representam:\n\n• **Bandeira** — verde (esquerda) e vermelho (direita), com o escudo. A esfera armilar lembra os Descobrimentos.\n• **Hino** — "A Portuguesa", de 1890.\n• **Língua oficial** — português.\n• **Capital** — Lisboa.\n\n**Datas nacionais importantes**:\n• **25 de Abril** (1974) — Dia da Liberdade (Revolução dos Cravos).\n• **10 de Junho** — Dia de Portugal, de Camões e das Comunidades.\n• **1 de Dezembro** (1640) — Restauração da Independência.\n• **5 de Outubro** (1910) — Implantação da República.\n\n**❌ O que se costuma errar**\n• Trocar as cores da bandeira (verde fica à ESQUERDA do mastro).\n• Confundir 25 de Abril com 10 de Junho.\n• Esquecer que a capital é Lisboa.'
    },
    'estudo_meio/Instituições e serviços': {
        title: 'Instituições e serviços',
        body: 'Há **instituições** e **serviços** que ajudam a comunidade:\n\n• **Câmara Municipal** — gere o concelho (estradas, parques, lixo).\n• **Junta de Freguesia** — gere a freguesia.\n• **Escola** — para aprender.\n• **Hospital** e **Centro de Saúde** — saúde.\n• **Bombeiros** — apagam fogos, socorrem feridos.\n• **GNR / PSP** — polícia, mantém a segurança.\n• **Correios (CTT)** — entregam cartas.\n• **Biblioteca** — empresta livros.\n• **Igreja / Centro paroquial** — apoio espiritual e social.\n\nNúmero de emergência: **112** (gratuito, válido em toda a Europa).\n\n**❌ O que se costuma errar**\n• Confundir GNR (rural) com PSP (urbana).\n• Esquecer o número de emergência (112).\n• Confundir Câmara Municipal com Junta de Freguesia.'
    },
    'estudo_meio/Os astros': {
        title: 'Os astros',
        body: 'Os **astros** são corpos celestes no espaço.\n\n• **Estrelas** — bolas de gás com luz própria. O **Sol** é a nossa estrela.\n• **Planetas** — orbitam uma estrela. A **Terra** é um planeta.\n• **Satélites naturais** — orbitam planetas. A **Lua** é o satélite da Terra.\n\n**Sistema Solar** — 8 planetas pela ordem do Sol:\nMercúrio, Vénus, **Terra**, Marte, Júpiter, Saturno, Úrano, Neptuno.\n\n**Movimentos da Terra**:\n• **Rotação** — gira sobre si própria em **24 horas** (dia/noite).\n• **Translação** — gira à volta do Sol em **365 dias** (1 ano, estações).\n\n**❌ O que se costuma errar**\n• Achar que a Lua emite luz própria — só reflete a luz do Sol.\n• Confundir rotação (24h) com translação (1 ano).\n• Trocar a ordem dos planetas (Terra é o **3.º**).'
    },
    'estudo_meio/Aspetos físicos do meio': {
        title: 'Aspetos físicos do meio',
        body: 'O **relevo** = forma da superfície da Terra:\n\n• **Montanha** — terra muito alta. Em Portugal: **Serra da Estrela** (Torre 1 993 m), **Pico** (Açores 2 351 m — o mais alto).\n• **Colina** — elevação pequena.\n• **Planície** — terra plana.\n• **Vale** — terra baixa entre montanhas.\n\n**Cursos de água**:\n• **Rio** — corre por um leito. Principais: **Tejo**, **Douro**, **Mondego**, **Guadiana**, **Minho**.\n• **Lago** / **lagoa** — água parada.\n• **Mar / oceano** — água salgada. Portugal tem costa no **Atlântico**.\n\n**❌ O que se costuma errar**\n• Confundir lago (parado) com rio (corre).\n• Esquecer que o ponto mais alto é o **Pico** (Açores).\n• Achar que o mar é doce.'
    },
    'estudo_meio/Animais': {
        title: 'Animais',
        body: 'Os **animais** classificam-se em grupos:\n\n• **Mamíferos** — pelo, mães amamentam. Ex: cão, vaca, ser humano, baleia (sim!), morcego.\n• **Aves** — penas, bico, ovos. Ex: pomba, águia, galinha, pinguim.\n• **Répteis** — escamas, sangue frio. Ex: cobra, lagarto, crocodilo, tartaruga.\n• **Anfíbios** — vivem na água e em terra. Ex: rã, sapo, salamandra.\n• **Peixes** — vivem na água, respiram por **brânquias**. Ex: sardinha, atum.\n• **Insetos** — 6 patas, 3 partes do corpo. Ex: formiga, abelha, borboleta.\n\n**Alimentação**: herbívoros (plantas), carnívoros (carne), omnívoros (tudo).\n\n**❌ O que se costuma errar**\n• Achar que a baleia é peixe — é **mamífero**.\n• Confundir réptil com anfíbio.\n• Esquecer que insetos têm 6 patas (aranhas têm 8 e NÃO são insetos).'
    },
    'estudo_meio/Plantas': {
        title: 'Plantas',
        body: 'As **plantas** são seres vivos. Têm 4 partes principais:\n\n• **Raiz** — fixa a planta e absorve água e sais minerais do solo.\n• **Caule** — sustenta a planta e leva água até às folhas.\n• **Folhas** — fazem o alimento da planta (**fotossíntese**) usando luz solar.\n• **Flor** — forma sementes; depois transforma-se em fruto.\n\nA **fotossíntese** = as folhas usam luz + água + ar (CO₂) para fazer alimento e libertam **oxigénio**.\n\nA planta precisa de: **luz**, **água**, **ar** e **sais minerais**.\n\n**❌ O que se costuma errar**\n• Achar que as plantas fazem alimento nas raízes — fazem nas **folhas**.\n• Esquecer que as plantas libertam oxigénio.\n• Confundir flor com folha.'
    },
    'estudo_meio/Materiais e objetos': {
        title: 'Materiais e objetos',
        body: 'Os **materiais** podem ser:\n\n• **Naturais** — vêm da natureza. Madeira, lã, algodão, pedra, barro.\n• **Artificiais** — feitos pelo Homem. Plástico, vidro, papel, metal trabalhado.\n\n**Propriedades**:\n• **Transparente** (deixa ver) ↔ **opaco** (não deixa).\n• **Rígido** ↔ **flexível**.\n• **Áspero** ↔ **liso**.\n• **Frágil** ↔ **resistente**.\n• **Bom** ou **mau** condutor de calor / eletricidade.\n\n**Reciclar**: papel → ecoponto **AZUL**; embalagens (plástico/metal) → **AMARELO**; vidro → **VERDE**.\n\n**❌ O que se costuma errar**\n• Trocar as cores do ecoponto.\n• Achar que tudo o que é "duro" é metal.\n• Confundir transparente com translúcido.'
    },
    'estudo_meio/Experiências': {
        title: 'Experiências',
        body: 'Para descobrir como o mundo funciona fazemos **experiências**. Passos:\n\n1. **Pergunta** — o que quero saber?\n2. **Hipótese** — o que acho que vai acontecer.\n3. **Experiência** — testar (com material).\n4. **Observação** — ver e registar.\n5. **Conclusão** — confirma ou não?\n\nExemplos clássicos do 3.º ano:\n• A **água** pode estar nos 3 estados: **sólido** (gelo), **líquido**, **gasoso** (vapor).\n• O **ar** ocupa espaço (sopra um balão!) e empurra (vento).\n• A **luz** propaga-se em linha reta e cria **sombras** atrás de objetos opacos.\n• Os **ímanes** atraem ferro mas não plástico, madeira ou alumínio.\n\n**❌ O que se costuma errar**\n• Achar que o ar não pesa — pesa muito pouco mas pesa.\n• Confundir transparente com translúcido.\n• Pensar que um íman atrai todos os metais — só ferro, níquel e cobalto.'
    },

    // ----- INGLÊS (Kid's Box [New Generation] Pupil's Book 2) -----
    'ingles/Greetings and feelings': {
        title: 'Greetings and feelings',
        body: '**Saying hello and goodbye**:\n• Hello! / Hi! → Olá!\n• Good morning! → Bom dia!\n• Good afternoon! → Boa tarde!\n• Good evening! / Good night! → Boa noite!\n• Goodbye! / Bye! → Adeus!\n\n**How are you?** → Como estás?\n• I\'m fine, thank you. → Estou bem, obrigado(a).\n• I\'m happy / sad / tired.\n• I\'m hungry. → Tenho fome.\n• I\'m thirsty. → Tenho sede.\n\n**Introducing yourself**:\n• What\'s your name? → Como te chamas?\n• My name is ___. / I\'m ___.\n• How old are you? → Quantos anos tens?\n• I\'m 8 years old.\n\n**❌ Common mistakes**\n• Saying "I have hungry" → must be "I am hungry".\n• Confusing "your" (teu) with "you" (tu).\n• Forgetting the capital "I" — always uppercase.'
    },
    'ingles/School things': {
        title: 'School things',
        body: '**Things at school**:\n• pencil → lápis\n• pen → caneta\n• rubber → borracha (UK) / eraser (US)\n• ruler → régua\n• book → livro\n• notebook → caderno\n• schoolbag → mochila\n• pencil case → estojo\n• desk → secretária\n• chair → cadeira\n• board → quadro\n• window → janela\n• door → porta\n\n**At the classroom**:\n• Open your book, please.\n• Close the door.\n• Sit down. / Stand up.\n• Listen! / Look!\n• Can I go to the toilet?\n\n**❌ Common mistakes**\n• "rubber" (UK) = borracha; in the USA say "eraser".\n• Plural — add **-s**: pencil → pencil**s**.\n• "schoolbag" is one word.'
    },
    'ingles/Toys and playtime': {
        title: 'Toys and playtime',
        body: '**Toys**:\n• doll → boneca\n• teddy bear → urso de peluche\n• ball → bola\n• kite → papagaio (de papel)\n• car → carrinho\n• train → comboio\n• bike → bicicleta\n• puzzle → puzzle\n• game → jogo\n• robot → robô\n\n**Playing**:\n• Let\'s play! → Vamos brincar!\n• I like playing with ___. → Gosto de brincar com ___.\n• Whose toy is this? → De quem é este brinquedo?\n• It\'s my toy. → É o meu brinquedo.\n\n**❌ Common mistakes**\n• "play with" (NÃO "play to") — I play with dolls.\n• "I like playing" needs the **-ing** form after "like".\n• Capital letter at the start of "Let\'s".'
    },
    'ingles/Rooms at home': {
        title: 'Rooms at home',
        body: '**Rooms**:\n• kitchen → cozinha\n• living room → sala\n• bedroom → quarto\n• bathroom → casa de banho\n• dining room → sala de jantar\n• garage → garagem\n• garden → jardim\n\n**Furniture**:\n• bed, table, chair, sofa, TV, fridge, cooker, bath.\n\n**Where is...?**\n• Where is the cat? → Onde está o gato?\n• It\'s **in** the bedroom. (dentro)\n• It\'s **on** the table. (em cima)\n• It\'s **under** the chair. (debaixo)\n• It\'s **next to** the sofa. (ao lado)\n\n**❌ Common mistakes**\n• Confusing "in" (dentro) with "on" (em cima).\n• "in the table" → must be "on the table".\n• Plural: bedroom**s** (not "bedroomes").'
    },
    'ingles/Family members': {
        title: 'Family members',
        body: '**My family**:\n• mum / mother → mãe\n• dad / father → pai\n• parents → pais\n• brother → irmão\n• sister → irmã\n• grandma / grandmother → avó\n• grandpa / grandfather → avô\n• grandparents → avós\n• uncle → tio\n• aunt → tia\n• cousin → primo/prima\n• baby → bebé\n\n**This is...**\n• This is my mum.\n• These are my parents.\n• I have one brother and two sisters.\n\n**❌ Common mistakes**\n• "Cousin" — same word for primo AND prima.\n• "Brother" (singular) ≠ "brothers" (plural).\n• Possessive: **my**, **your**, **his**, **her**.'
    },
    'ingles/Farm animals': {
        title: 'Farm animals',
        body: '**Animals on the farm**:\n• cow → vaca\n• horse → cavalo\n• sheep → ovelha (plural also "sheep"!)\n• pig → porco\n• chicken → galinha\n• duck → pato\n• rabbit → coelho\n• goat → cabra\n• donkey → burro\n• dog → cão\n• cat → gato\n\n**Animal sounds (English)**:\n• cow: moo  •  dog: woof  •  cat: meow  •  duck: quack  •  sheep: baa  •  horse: neigh\n\n**Has got** / **have got**:\n• A cow **has got** four legs.\n• Chickens **have got** feathers and a beak.\n\n**❌ Common mistakes**\n• Plural of "sheep" → STAYS "sheep".\n• "chicken" = animal OR meat.\n• Use "has got" for he/she/it; "have got" for I/you/we/they.'
    },
    'ingles/My town': {
        title: 'My town',
        body: '**Places in town**:\n• school → escola\n• park → parque\n• shop → loja\n• supermarket → supermercado\n• hospital → hospital\n• library → biblioteca\n• post office → correios\n• bank → banco\n• cinema → cinema\n• restaurant → restaurante\n• café → café\n• church → igreja\n• bus stop → paragem de autocarro\n• train station → estação de comboios\n• street → rua\n• square → praça\n\n**Asking the way**:\n• Where is the park?\n• It\'s **near** the school.\n• It\'s **opposite** the bank.\n• Go straight on.\n• Turn left / right.\n\n**❌ Common mistakes**\n• "library" is BIBLIOTECA (not livraria — that\'s "bookshop").\n• Confusing "near" (perto) with "next to" (ao lado).\n• "I go to school" (without "the").'
    },
    'ingles/Clothes': {
        title: 'Clothes',
        body: '**Clothes**:\n• T-shirt → t-shirt\n• shirt → camisa\n• jumper / sweater → camisola\n• trousers (UK) / pants (US) → calças\n• jeans → jeans (always plural!)\n• shorts → calções\n• dress → vestido\n• skirt → saia\n• shoes → sapatos\n• socks → meias\n• hat → chapéu\n• coat / jacket → casaco\n• scarf → cachecol\n• gloves → luvas\n\n**Verbs**: put on (vestir), take off (despir), wear (usar).\n\n**Colours**: red, blue, green, yellow, black, white, pink, orange, purple, brown.\n\n**❌ Common mistakes**\n• Trousers, jeans, shorts, socks, shoes — ALWAYS plural in English.\n• "She wear" → WRONG. Must be "She wear**s**".\n• Order: "a big red ball" (size before colour).'
    },
    'ingles/Hobbies and sports': {
        title: 'Hobbies and sports',
        body: '**Sports**:\n• football → futebol\n• basketball → basquetebol\n• volleyball → voleibol\n• tennis → ténis\n• swimming → natação\n• running → corrida\n• cycling → ciclismo\n• dancing → dança\n• karate / judo → karaté / judo\n\n**Other hobbies**:\n• reading, drawing, painting, singing\n• playing the piano / guitar\n• playing computer games\n• watching TV\n\n**Talking about hobbies**:\n• I like ___ing. / I don\'t like ___ing.\n• I love football.\n• My favourite sport is ___.\n• Can you swim? — Yes, I can. / No, I can\'t.\n\n**❌ Common mistakes**\n• You **play** football/tennis but you **go** swimming/running.\n• Musical instruments need "the": play **the** piano.\n• "I like swim" → WRONG. Must be "I like swimm**ing**".'
    },
    'ingles/Numbers and colours': {
        title: 'Numbers and colours',
        body: '**Numbers 1–20**:\none, two, three, four, five, six, seven, eight, nine, ten, eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty.\n\n**Tens to 100**: ten, twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred.\n\n**21 = twenty-one** (hyphen). 35 = thirty-five.\n\n**Colours**:\n• red, blue, yellow, green, orange, purple, pink, brown, black, white, grey\n• light blue (azul claro) / dark blue (azul escuro)\n\n**Asking**:\n• How many ___?\n• What colour is it?\n• It\'s red.\n\n**❌ Common mistakes**\n• "fourteen" (14) vs "forty" (40) — careful with stress.\n• "thirty" (30) — no "e" (NOT "thirthy").\n• Colour goes BEFORE the noun: a **red** car.'
    },

    // ----- CIDADANIA E DESENVOLVIMENTO -----
    'cidadania/Direitos e deveres': {
        title: 'Direitos e deveres',
        body: 'Toda a criança tem **direitos**, garantidos pela **Convenção sobre os Direitos da Criança** (ONU, 1989).\n\n**Direitos principais**:\n• Direito à **vida** e a um **nome**.\n• Direito à **saúde** e à alimentação.\n• Direito à **educação**.\n• Direito ao **amor** e à família.\n• Direito a **brincar** e descansar.\n• Direito a ser **ouvida**.\n• Direito a ser protegida da violência.\n\n**Deveres**:\n• Respeitar os outros.\n• Cumprir as regras da escola e de casa.\n• Cuidar das coisas.\n• Dizer a verdade.\n• Ajudar quem precisa.\n\nDireitos e deveres caminham **juntos**.\n\n**❌ O que se costuma errar**\n• Pensar que só há direitos.\n• Achar que "ser ouvido" é "fazer sempre a sua vontade".\n• Esquecer-se que os direitos protegem TODAS as crianças.'
    },
    'cidadania/Regras de convivência': {
        title: 'Regras de convivência',
        body: 'Para vivermos bem em **grupo** precisamos de **regras**.\n\n**Na escola**:\n• Levantar o braço antes de falar.\n• Não interromper.\n• Tratar colegas e professores com respeito.\n• Não correr nos corredores.\n• Arrumar a sala antes de sair.\n\n**Em casa**:\n• Cumprimentar quem chega.\n• Pôr a mesa, arrumar o quarto.\n• Avisar antes de sair.\n\n**Conflitos** — passos:\n1. **Acalma-te** — respira fundo, conta até 10.\n2. **Fala** — explica o que sentes ("Eu sinto..." em vez de "Tu fazes...").\n3. **Ouve** o outro lado.\n4. **Procura** uma solução em conjunto.\n5. **Pede desculpa** se errares.\n\n**❌ O que se costuma errar**\n• Achar que regras são para "estragar a brincadeira".\n• Resolver conflitos com violência.\n• Esquecer que ouvir o outro é tão importante como falar.'
    },
    'cidadania/Diversidade e respeito': {
        title: 'Diversidade e respeito',
        body: 'A **diversidade** torna o mundo rico. Somos todos **diferentes**:\n\n• **Cultura** — origens, línguas, tradições.\n• **Religião** — católicos, muçulmanos, judeus, budistas, ateus...\n• **Cor da pele**, **género**, **idade**.\n• **Capacidades** — pessoas usam cadeira de rodas, óculos, aparelhos auditivos; outras têm dificuldades de aprendizagem.\n• **Famílias** — diferentes formas.\n\n**Respeitar a diferença** é:\n• Não troçar nem fazer "piadas".\n• Tratar todos com igualdade.\n• Aprender com quem é diferente.\n• Defender quem está a ser maltratado.\n\n**Bullying** = alguém é repetidamente magoado. É **errado** e deve ser **denunciado** a um adulto.\n\n**❌ O que se costuma errar**\n• Achar que "incluir" é um favor — é o mínimo.\n• Calar-se quando alguém é vítima de bullying.\n• Confundir igualdade com sermos todos iguais.'
    },
    'cidadania/Ambiente e sustentabilidade': {
        title: 'Ambiente e sustentabilidade',
        body: 'O **planeta Terra** é a nossa casa comum.\n\n**Problemas ambientais**:\n• **Poluição** — ar, água, solos.\n• **Aquecimento global** — Terra mais quente por causa do CO₂.\n• **Desflorestação**.\n• **Lixo nos oceanos** — sobretudo plástico.\n\n**O que posso fazer (regra dos 3 R)**:\n• **Reduzir** — comprar menos.\n• **Reutilizar** — dar nova vida.\n• **Reciclar** — separar no ecoponto: papel (azul), embalagens (amarelo), vidro (verde), pilhas (vermelho), orgânico (castanho).\n\n**Outros gestos**:\n• Fechar a torneira ao escovar os dentes (poupa ~6 L/min).\n• Apagar luzes ao sair.\n• Ir a pé ou de bicicleta.\n• Plantar uma árvore.\n\n**❌ O que se costuma errar**\n• Achar que reciclar é a 1.ª prioridade — primeiro vem **reduzir**.\n• Confundir as cores do ecoponto.\n• Pensar que "só um copo" não faz diferença.'
    },
    'cidadania/Segurança rodoviária': {
        title: 'Segurança rodoviária',
        body: '**Para peões**:\n• Caminhar no **passeio**, longe da estrada.\n• Atravessar na **passadeira** (zebra) ou no semáforo.\n• Olhar **esquerda → direita → esquerda** antes de atravessar.\n• Não correr a atravessar.\n• Não atravessar entre carros estacionados.\n\n**Semáforo para peões**: verde = atravessa; vermelho = espera; piscar = termina depressa.\n\n**Para passageiros** (em carro):\n• Crianças com menos de 12 anos (ou 1,35 m) vão sempre no **banco de trás**.\n• **Cadeira de criança** ou **assento elevatório** apropriado.\n• **Cinto de segurança** SEMPRE.\n• Não distrair o condutor.\n\n**Para ciclistas**:\n• **Capacete** sempre.\n• Sinalizar com o braço antes de virar.\n• **Luzes** e refletores à noite.\n\n**❌ O que se costuma errar**\n• Atravessar a correr.\n• Ir ao banco da frente.\n• Esquecer o capacete por ser "só dar uma volta".'
    },
    'cidadania/Saúde e bem-estar': {
        title: 'Saúde e bem-estar',
        body: '**Saúde** = corpo + mente + emoções, em equilíbrio.\n\n**Hábitos saudáveis**:\n• **Alimentação**: 3 refeições principais + 2 lanches. Variedade de cores no prato. Beber água em vez de sumos.\n• **Sono**: 9 a 11 horas por noite para crianças de 8-9 anos.\n• **Higiene**: lavar mãos antes de comer, escovar dentes 2× ao dia, banho diário.\n• **Atividade física**: 1 hora por dia.\n• **Tempo de ecrã**: máximo ~1 hora por dia (TV, telemóvel, tablet).\n• **Pausas**: não estar muito tempo sentado.\n\n**Bem-estar emocional**:\n• Falar sobre o que sentes.\n• Pedir ajuda quando precisas.\n• Brincar, rir, partilhar com amigos.\n• Estar com a família.\n\n**Sinais de alerta**: dor que não passa, tristeza grande, dificuldade em dormir → falar com um adulto de confiança.\n\n**❌ O que se costuma errar**\n• Pensar que "saúde" é só não estar doente.\n• Esconder o que sentes.\n• Achar que tempo de ecrã ilimitado não faz mal.'
    },

    // ===== LEITURA — 8 textos para ler com orientações =====
    'leitura/Lê com as vírgulas': {
        title: 'Lê com as vírgulas',
        body: "A **vírgula** é uma pausa **curta** — como respirar um pouquinho. Dura 1 batida (a do ponto dura 2).\n\nQuando lês um texto:\n• Marca mentalmente cada **vírgula**.\n• Pára 1 segundinho.\n• Continua.\n\n**Para que servem**? Separar coisas numa lista, isolar uma explicação, antes de \"mas\"/\"porque\"/\"que\".\n\nNeste tópico vais ler um texto com **muitas vírgulas**. Treina a respirar nas paragens.\n\n**Estratégias úteis** ✨\n• Lê em voz alta — ouvir-te ajuda.\n• Bate o dedo na mesa em cada vírgula.\n• Repete o texto 2 ou 3 vezes — fica mais fluido."
    },
    'leitura/Lê um diálogo': {
        title: 'Lê um diálogo',
        body: "Num **diálogo**, as personagens falam umas com as outras. O **travessão (—)** marca o início da fala.\n\nQuando lês um diálogo:\n• **Muda a voz** ligeiramente para cada personagem.\n• Faz pausa antes do travessão.\n• Respeita a pontuação dentro da fala (?, !).\n• O narrador (texto à volta dos travessões) lê com voz neutra.\n\nNeste tópico vais ler um diálogo curto. Imagina-te a fazer de cada personagem.\n\n**Estratégias úteis** ✨\n• Lê alto — é como teatro.\n• Personagem grande → voz mais grave. Personagem pequena → voz mais aguda.\n• Se errares, recomeça."
    },
    'leitura/Voz sobe na pergunta': {
        title: 'Voz sobe na pergunta',
        body: "Quando vês um **ponto de interrogação (?)**, a voz **sobe** no fim da frase — como subires umas escadas.\n\n**Compara**:\n• \"Já chegou.\" → voz desce 🔽\n• \"Já chegou?\" → voz sobe 🔼\n\nNeste tópico vais ler um texto com várias perguntas. Repara como cada uma faz a tua voz subir.\n\n**Estratégias úteis** ✨\n• Levanta a mão à medida que dizes a pergunta — sentes a voz subir.\n• Faz pausa depois do \"?\".\n• Atenção: perguntas começam muitas vezes com Quem, O quê, Onde, Quando, Porquê, Como."
    },
    'leitura/Voz com emoção': {
        title: 'Voz com emoção',
        body: "O **ponto de exclamação (!)** diz: pões **emoção** aqui!\n\nA emoção depende da frase:\n• Alegria → \"Que dia lindo!\" 😊\n• Surpresa → \"Não acredito!\" 😲\n• Susto → \"Cuidado!\" 😨\n• Zanga → \"Pára com isso!\" 😠\n\nNeste tópico vais ler um texto cheio de exclamações. Sente a emoção e deixa-a sair na voz!\n\n**Estratégias úteis** ✨\n• ANTES de ler a frase, decide: alegria? surpresa? susto?\n• Faz o gesto que farias com essa emoção (braços no ar para alegria).\n• Não tens de gritar — basta ter expressão."
    },
    'leitura/Lê e descobre os sentimentos': {
        title: 'Lê e descobre os sentimentos',
        body: "Os textos nem sempre dizem **diretamente** o que a personagem sente. Tens de **inferir** (descobrir pelas pistas).\n\n**Pistas**:\n• O que a personagem **faz** (chora → triste, salta → contente).\n• O que **diz** (\"Que pena!\" → triste).\n• A **expressão** (\"olhos a brilhar\" → feliz).\n\nNeste tópico vais ler um texto e descobrir o que a personagem está a sentir.\n\n**Estratégias úteis** ✨\n• Imagina-te no lugar da personagem — como te sentirias?\n• Sublinha mentalmente as pistas.\n• Pergunta-te: porquê está assim?"
    },
    'leitura/Lê e descobre o que vai acontecer': {
        title: 'Lê e descobre o que vai acontecer',
        body: "**Predizer** = adivinhar o que vai acontecer a seguir, com base nas pistas do texto.\n\nÉ como ser **detetive**! As pistas estão em:\n• O título.\n• O início da história (apresenta o problema).\n• As ações das personagens.\n• O que TU sabes do mundo.\n\nNeste tópico vais ler um texto e adivinhar o desfecho.\n\n**Estratégias úteis** ✨\n• Predizer **não é estar certa** — é treinar o cérebro.\n• Pergunta-te: \"se eu fosse esta personagem, o que faria a seguir?\"\n• Compara depois com o que aconteceu — fez sentido?"
    },
    'leitura/Lê uma carta': {
        title: 'Lê uma carta',
        body: "Uma **carta** é um texto escrito de uma pessoa para outra. Tem partes específicas:\n\n• **Local e data** no topo.\n• **Saudação** (\"Olá, Carolina,\").\n• **Corpo** — a mensagem.\n• **Despedida** (\"Um beijo grande\").\n• **Assinatura** — quem escreveu.\n\nNeste tópico vais ler uma carta — repara em todas as partes.\n\n**Estratégias úteis** ✨\n• A carta é \"mais íntima\" — lê como se estivesses a falar com a pessoa.\n• Faz pausa nos parágrafos.\n• Repara nas vírgulas após saudação e despedida."
    },
    'leitura/Lê uma lenda': {
        title: 'Lê uma lenda',
        body: "Uma **lenda** conta uma história antiga, muitas vezes com elementos **fantásticos** (dragões, princesas, magia). Foi passada de geração em geração.\n\nNas lendas há:\n• **Personagens** marcantes (heróis, vilões).\n• **Espaço** mágico (castelo, floresta encantada).\n• **Acontecimento** importante.\n• **Mensagem** ou ensinamento.\n\nNeste tópico vais ler uma pequena lenda. Tem **palavras menos comuns** — vê o glossário.\n\n**Estratégias úteis** ✨\n• Lê com voz \"de contar histórias\".\n• Faz pausas dramáticas nos momentos importantes.\n• Se uma palavra te tropeça, silaba e volta atrás."
    },

    // ----- MAT+ 3.º (Matemática visual) -----
    'mat_plus/Centenas com ten-frames': {
        title: 'Centenas com ten-frames',
        body: "No 3.º ano os números ficam **grandes**. Para os ver bem, organizamos em grupos de **10 e 100**.\n\n• 1 ten-frame cheio = **10**.\n• 10 ten-frames cheios = uma **centena** (100).\n• 10 centenas = um **milhar** (1 000).\n\n**Modelo visual de base 10**:\n• Cubo pequeno = unidade (1).\n• Barra de 10 cubos = dezena (10).\n• Placa 10×10 = centena (100).\n• Cubo grande 10×10×10 = milhar (1 000).\n\n**Estratégias úteis** ✨\n• Pinta um quadradinho 10×10 → vê 100 num só olhar.\n• Junta 3 placas de 100 → 300. Junta 5 barras → 50. Total: 350.\n• Quando o número é **grande**, separa em milhares + centenas + dezenas + unidades."
    },
    'mat_plus/Decompor até 10 000': {
        title: 'Decompor até 10 000',
        body: "Cada algarismo tem um **valor** diferente conforme a posição.\n\nNo número **3 472**:\n• **3** vale 3 000 (milhares)\n• **4** vale 400 (centenas)\n• **7** vale 70 (dezenas)\n• **2** vale 2 (unidades)\n\nTotal: 3 000 + 400 + 70 + 2 = **3 472**.\n\n**Tabela de valor posicional**:\n| M | C | D | U |\n| 3 | 4 | 7 | 2 |\n\n**Estratégias úteis** ✨\n• Lê o número devagar: \"três mil, quatrocentos e setenta e dois\".\n• Atenção aos zeros: 3 052 ≠ 3 502. O zero também ocupa uma posição.\n• Se vires 4 005 sabe que tem 4 milhares e 5 unidades — 0 centenas e 0 dezenas."
    },
    'mat_plus/Linha numérica até 10 000': {
        title: 'Linha numérica até 10 000',
        body: "A **linha numérica** ajuda a \"ver\" onde estão os números.\n\nMarca-se de 1 000 em 1 000:\n0 — 1 000 — 2 000 — ... — 10 000.\n\nDepois divide-se cada milhar em 10 partes (de 100 em 100) e cada centena em 10 (de 10 em 10).\n\n**Estratégias úteis** ✨\n• Para colocar 3 700 na linha: vê que está entre 3 000 e 4 000, perto do meio mas mais à direita.\n• Para 5 250: está entre 5 000 e 5 500, mais ou menos a meio.\n• Saltar de 100 em 100 ou de 10 em 10 ajuda a contar para a frente e para trás."
    },
    'mat_plus/Comparar números grandes': {
        title: 'Comparar números grandes',
        body: "Para comparar números até 10 000, vê **da esquerda para a direita**.\n\n**Regras**:\n1. Quem tem mais algarismos é maior (9 999 < 10 000).\n2. Se o número de algarismos é igual, compara o algarismo das MAIORES posições primeiro.\n\n**Símbolos**:\n• **>** maior que (a \"boca aberta\" para o maior).\n• **<** menor que.\n• **=** igual.\n\n**Estratégias úteis** ✨\n• Alinha sempre os números pela direita.\n• Se ficares baralhada, escreve um por cima do outro.\n• A \"boca\" do símbolo abre sempre para o maior."
    },
    'mat_plus/Aproximar à dezena ou centena': {
        title: 'Aproximar à dezena ou centena',
        body: "**Aproximar** = arredondar para o número certo (10, 100) mais perto.\n\n**Regra dos 5**:\n• Se o algarismo a seguir é **0, 1, 2, 3, 4** → desce.\n• Se é **5, 6, 7, 8, 9** → sobe.\n\n**Exemplos** (à dezena):\n• 47 → **50** (7 ≥ 5).\n• 42 → **40** (2 < 5).\n• 35 → **40** (regra dos 5 sobe).\n\n**À centena**:\n• 347 → **300** (4 dezenas < 5).\n• 372 → **400** (7 dezenas ≥ 5).\n\n**Estratégias úteis** ✨\n• Para aproximar à dezena, olha SÓ para as unidades.\n• Para aproximar à centena, olha SÓ para as dezenas.\n• Estimar antes ajuda a ver se a tua resposta faz sentido."
    },
    'mat_plus/Adição com transporte': {
        title: 'Adição com transporte',
        body: "Quando a soma de duas colunas dá **mais de 9**, há **transporte** para a coluna seguinte.\n\n**Exemplo**: 248 + 175\n```\n   1 1\n   2 4 8\n + 1 7 5\n ───────\n   4 2 3\n```\n• U: 8+5=13 → escreve 3, transp. 1.\n• D: 4+7+1=12 → escreve 2, transp. 1.\n• C: 2+1+1=4.\n\n**Estratégias úteis** ✨\n• Alinha SEMPRE pela direita.\n• Escreve o transporte pequenino por cima.\n• Se a soma final tiver transporte na coluna mais à esquerda, escreve-o à frente."
    },
    'mat_plus/Subtração com empréstimo': {
        title: 'Subtração com empréstimo',
        body: "Se o algarismo de cima é **menor** que o de baixo, pede-se \"emprestado\" 1 à coluna do lado esquerdo.\n\n**Exemplo**: 524 − 187 = 337\n• U: 4 < 7. Empresta 10 → 14−7=7. O 2 das dezenas vira 1.\n• D: 1 < 8. Empresta 100 → 11−8=3. O 5 vira 4.\n• C: 4−1=3.\n\n**Estratégias úteis** ✨\n• Quando emprestas, **risca** o número de cima e escreve o novo.\n• Se a coluna tem 0, tens de \"emprestar mais longe\".\n• Confirma somando: 337 + 187 deve dar 524."
    },
    'mat_plus/Tabuada do 6 visual': {
        title: 'Tabuada do 6 visual',
        body: "O 6 é o **dobro do 3**. Por isso a tabuada do 6 = dobro da tabuada do 3.\n\n**Resultados**:\n6×1=6 · 6×2=12 · 6×3=18 · 6×4=24 · 6×5=**30** · 6×6=36 · 6×7=42 · 6×8=48 · 6×9=54 · 6×10=60.\n\n**Truques visuais**:\n• Caixas de ovos (6 por caixa) → 4 caixas = 24 ovos.\n• 6×5=30 (a meio — fácil).\n• Para 6×8: pensa 6×10=60, depois −12 = 48.\n\n**Estratégias úteis** ✨\n• Aprende primeiro 6×5 e 6×10.\n• Os resultados são SEMPRE pares.\n• 6×9 = 54 — soma dos algarismos = 9!"
    },
    'mat_plus/Tabuada do 7 visual': {
        title: 'Tabuada do 7 visual',
        body: "A tabuada do **7** é a mais \"esquisita\". Mas há truques.\n\n**Resultados**:\n7×1=7 · 7×2=14 · 7×3=21 · 7×4=28 · 7×5=**35** · 7×6=42 · 7×7=**49** · 7×8=56 · 7×9=63 · 7×10=70.\n\n**Truques**:\n• Dias da semana: 1 semana = 7 dias → 4 semanas = 28 dias.\n• 7×7 = 49 (quadrado).\n• Para 7×8: 7×10−7×2 = 70−14 = 56.\n\n**Estratégias úteis** ✨\n• Decora 7×5=35, 7×10=70, 7×7=49.\n• Usa a comutativa: 7×3 = 3×7.\n• Faz fichas — escreve 10 vezes seguidas."
    },
    'mat_plus/Tabuada do 8 visual': {
        title: 'Tabuada do 8 visual',
        body: "O 8 é o **dobro do 4**. Tabuada do 8 = dobro da do 4.\n\n**Resultados**:\n8×1=8 · 8×2=16 · 8×3=24 · 8×4=32 · 8×5=**40** · 8×6=48 · 8×7=56 · 8×8=**64** · 8×9=72 · 8×10=80.\n\n**Truques**:\n• Polvo (8 patas) → 3 polvos = 24 patas.\n• 8×5 = 40 (acaba em 0).\n• 8×8 = 64 (quadrado).\n• 8×9 = 72: 8×10 − 8.\n\n**Estratégias úteis** ✨\n• Os resultados saltam de 8 em 8.\n• Todos pares.\n• 8×n = (8×(n−1)) + 8."
    },
    'mat_plus/Tabuada do 9 visual': {
        title: 'Tabuada do 9 visual',
        body: "A tabuada do **9** tem um padrão lindo: **os algarismos do resultado somam 9**.\n\n**Resultados**:\n9×1=09 · 9×2=18 · 9×3=27 · 9×4=36 · 9×5=45 · 9×6=54 · 9×7=63 · 9×8=72 · 9×9=81 · 9×10=90.\n\nNota: 18 → 1+8=9. 27 → 2+7=9. Sempre 9!\n\n**Truque dos dedos** 👋: para 9×3, baixa o 3.º dedo. À esquerda 2 dedos = 20; à direita 7 dedos = 7 → 27.\n\n**Estratégias úteis** ✨\n• 9×n = (10×n) − n.\n• O algarismo das dezenas é sempre (n − 1).\n• Pratica com os dedos."
    },
    'mat_plus/Famílias de factos': {
        title: 'Famílias de factos',
        body: "Uma **família de factos** são 4 contas relacionadas com os mesmos 3 números.\n\nCom 3, 4 e 12:\n• 3 × 4 = 12\n• 4 × 3 = 12\n• 12 ÷ 3 = 4\n• 12 ÷ 4 = 3\n\nSe sabes UMA destas, sabes TODAS. ✨\n\n**Estratégias úteis** ✨\n• Se sabes 6×7=42, sabes 7×6=42, 42÷6=7, 42÷7=6.\n• A divisão é a operação inversa da multiplicação.\n• Treina escrever as 4 contas seguidas."
    },
    'mat_plus/Multiplicação × 10, 100, 1000': {
        title: 'Multiplicação × 10, 100, 1000',
        body: "Para multiplicar por 10, 100 ou 1000 — **acrescenta zeros**.\n\n• × **10** → +1 zero. 7 × 10 = 70.\n• × **100** → +2 zeros. 7 × 100 = 700.\n• × **1 000** → +3 zeros. 7 × 1 000 = 7 000.\n\n**Exemplos**:\n• 23 × 100 = 2 300.\n• 5 × 1 000 = 5 000.\n\n**Estratégias úteis** ✨\n• Conta os zeros: × 10 tem 1 zero, × 100 tem 2 zeros.\n• Não confundir com adição: 7 + 10 = 17 (NÃO 70)."
    },
    'mat_plus/Multiplicação por 1 dígito': {
        title: 'Multiplicação por 1 dígito',
        body: "Para multiplicar um número grande por **um dígito**, usa o algoritmo em coluna.\n\n**Exemplo**: 234 × 3 = 702\n• U: 4×3=12 → 2, transp 1.\n• D: 3×3=9 + 1 = 10 → 0, transp 1.\n• C: 2×3=6 + 1 = 7.\n\n**Estratégias úteis** ✨\n• Multiplica da direita para a esquerda.\n• Não esqueças o transporte!\n• Estima primeiro: 234 × 3 ≈ 200 × 3 = 600."
    },
    'mat_plus/Divisão por partilha': {
        title: 'Divisão por partilha',
        body: "**Dividir** = repartir em partes iguais.\n\n12 ÷ 3 = ? Se tens 12 lápis e queres dar a 3 amigos, cada um leva **4**.\n\n**Modelo de barra**:\n```\n│ ▓▓▓▓ │ ▓▓▓▓ │ ▓▓▓▓ │   12 em 3 grupos → 4 por grupo.\n```\n\n**Vocabulário**:\n• Dividendo (12) — o que se divide.\n• Divisor (3) — em quantos grupos.\n• Quociente (4) — quanto fica em cada grupo.\n\n**Estratégias úteis** ✨\n• Pensa: \"quantas vezes cabe o 3 no 12?\" → 4 vezes.\n• Usa a tabuada: 3 × ? = 12 → ? = 4.\n• Desenha grupos com pontinhos quando estiver difícil."
    },
    'mat_plus/Divisão com resto': {
        title: 'Divisão com resto',
        body: "Nem sempre a divisão é **exata**. Às vezes sobra qualquer coisa — o **resto**.\n\n**Exemplo**: 23 ÷ 4\n• 4×5=20 → cabe 5 vezes.\n• 23−20 = **3** sobra.\n• Q=5; R=3.\n\nEscreve-se: **23 = 4 × 5 + 3**.\n\n**Importante**: o resto tem de ser **menor** que o divisor.\n\n**Estratégias úteis** ✨\n• Procura a maior multiplicação que cabe.\n• 23 ÷ 4: maior múltiplo de 4 abaixo de 23 → 20.\n• Confirma: Q × divisor + R = dividendo."
    },
    'mat_plus/Frações — partes iguais': {
        title: 'Frações — partes iguais',
        body: "Uma **fração** representa **partes IGUAIS** de um todo.\n\nSe divides uma piza em 4 partes iguais e comes 1, comeste **1/4**.\n\n• **Numerador** (em cima) — quantas partes tomas.\n• **Denominador** (em baixo) — em quantas partes está dividido o todo.\n\n**Cuidado!** Se as partes NÃO forem iguais, NÃO é fração.\n\n**Frações famosas**: 1/2 = metade · 1/3 = um terço · 1/4 = um quarto.\n\n**Estratégias úteis** ✨\n• Desenha o todo e divide com tracinhos.\n• Pinta as partes que tomas.\n• Se numerador = denominador → tens o **todo**."
    },
    'mat_plus/Frações — comparar': {
        title: 'Frações — comparar',
        body: "Para comparar frações com o **MESMO denominador** — quem tem maior **numerador** é maior.\n\n• 3/5 > 2/5.\n\nCom o **MESMO numerador** — quem tem MENOR denominador é maior.\n\n• 1/2 > 1/3 > 1/4.\n\n**Atenção**: quanto maior o denominador, **menores** são as partes.\n\n**Estratégias úteis** ✨\n• Pinta as duas frações em barras IGUAIS e compara visualmente.\n• 1/2 é referência: mais ou menos que metade?\n• Frações equivalentes: 1/2 = 2/4 = 3/6."
    },
    'mat_plus/Modelo de barra': {
        title: 'Modelo de barra',
        body: "O **modelo de barra** ajuda a \"ver\" um problema com retângulos.\n\n**Exemplo**: A Ana tem 5 e o Bruno 8. Quantos ao todo?\n```\nAna:   [▓▓▓▓▓]      = 5\nBruno: [▓▓▓▓▓▓▓▓]   = 8\nTotal: [▓▓▓▓▓▓▓▓▓▓▓▓▓] = 13\n```\n\n**Estratégias úteis** ✨\n• Desenha SEMPRE o problema antes de fazer a conta.\n• Cada barra representa um grupo. A largura é o tamanho.\n• \"Quanto FICA\" → subtração.\n• \"Ao TODO\" / \"JUNTOS\" → soma."
    },
    'mat_plus/Problemas em 2 passos': {
        title: 'Problemas em 2 passos',
        body: "Alguns problemas precisam de **duas contas**, uma a seguir à outra.\n\n**Exemplo**: A Carolina tem 24 €. Comprou 3 livros a 5 €. Com quanto fica?\n• Passo 1: 3 × 5 = 15 €.\n• Passo 2: 24 − 15 = 9 €.\n\n**Estratégias úteis** ✨\n• Lê o problema duas vezes.\n• Identifica os DADOS e a PERGUNTA.\n• Faz UMA conta de cada vez. Escreve o passo intermédio.\n• Confirma: faz sentido?"
    },

    // ----- SOM+ 3.º (Consciência fonológica avançada) -----
    'som_plus/Rimas com palavras longas': {
        title: 'Rimas com palavras longas',
        body: "Duas palavras **rimam** quando acabam com o mesmo som. Com palavras de 3-4 sílabas, só a parte FINAL conta.\n\n**Exemplos**:\n• **bor-bo-le-ta** e **co-le-ta** → terminam em \"-eta\" → rimam!\n• **es-tu-dan-te** e **co-mer-ci-an-te** → \"-ante\" → rimam!\n• **fa-mí-lia** e **pe-ra** → não rimam.\n\n**Truque**: foca-te só na ÚLTIMA sílaba (ou nas 2 últimas).\n\n**Estratégias úteis** ✨\n• Diz em voz alta — ouvir é a melhor pista.\n• Tapa o início com o dedo e ouve só o fim.\n• Treina em poemas e canções.\n\n**❌ O que se costuma errar**\n• Confundir parecer-se com rimar — \"casa\" e \"casaco\" parecem-se mas NÃO rimam.\n• Achar que palavras curtas e longas não podem rimar.\n• Esquecer-se de ouvir o FIM."
    },
    'som_plus/Contar sílabas (3-4)': {
        title: 'Contar sílabas (palavras de 3-4)',
        body: "Uma **sílaba** é um som que se diz de uma vez. Conta com batidas.\n\n**Exemplos**:\n• **bor-bo-le-ta** → 4 sílabas.\n• **es-co-la** → 3 sílabas.\n• **pas-sa-ri-nho** → 4 sílabas.\n• **e-le-fan-te** → 4 sílabas.\n\n**Truques**:\n• Bate palmas em cada sílaba.\n• Põe a mão debaixo do queixo — desce uma vez por sílaba.\n• Cada sílaba tem PELO MENOS uma vogal.\n\n**Estratégias úteis** ✨\n• Devagar — palavras longas dão erros.\n• Atenção aos **ditongos** (ai, eu, ão) — 1 só sílaba.\n• Atenção aos **hiatos** (sa-í-da) — separam-se.\n\n**❌ O que se costuma errar**\n• Contar sílabas a mais (separar ditongos).\n• Contar sílabas a menos (não separar hiatos).\n• Esquecer-se de uma sílaba a meio."
    },
    'som_plus/Sílaba tónica': {
        title: 'Sílaba tónica',
        body: "A **sílaba tónica** é a que se pronuncia com mais FORÇA.\n\n**Exemplos** (em maiúsculas a tónica):\n• ca-DEI-ra.\n• bor-bo-LE-ta.\n• me-NI-no.\n• Por-tu-GAL.\n\n**Tipos**:\n• **Aguda** — tónica na ÚLTIMA sílaba (café, mar, Portugal).\n• **Grave** — na PENÚLTIMA (casa, mesa, menino). A maioria.\n• **Esdrúxula** — na ANTEPENÚLTIMA (árvore, médico). LEVAM SEMPRE acento.\n\n**Estratégias úteis** ✨\n• Diz a palavra alto e nota onde \"pesa\" mais.\n• Bate palmas e nota qual é mais forte.\n• Esdrúxulas têm sempre acento — fáceis.\n\n**❌ O que se costuma errar**\n• Trocar tónica com átona.\n• Achar que \"café\" é grave — é aguda.\n• Confundir esdrúxula com aguda."
    },
    'som_plus/Sílaba átona': {
        title: 'Sílaba átona',
        body: "As sílabas **átonas** são todas EXCEPTO a tónica — pronunciam-se com menos força.\n\n**Exemplo**: em \"bor-bo-LE-ta\", a tónica é \"LE\" e as outras (bor, bo, ta) são átonas.\n\nEm PT-PT, vogais átonas pronunciam-se mais fechadas:\n• \"menina\" → o \"e\" inicial soa quase \"i\".\n• \"telefone\" → \"te\" soa \"ti\".\n\nIsto chama-se **redução vocálica**.\n\n**Estratégias úteis** ✨\n• Ouve adultos a falar — nota a diferença.\n• Em textos com erros, repara como redução pode levar a trocas.\n• Escrever pode ser diferente de falar — escreve \"telefone\".\n\n**❌ O que se costuma errar**\n• Todas as sílabas com mesma força (parece robô).\n• Escrever como se fala (\"tilifone\" em vez de \"telefone\").\n• Confundir átona com tónica."
    },
    'som_plus/Dígrafos LH, NH, CH': {
        title: 'Dígrafos LH, NH, CH',
        body: "Um **dígrafo** = DUAS letras que fazem UM único som.\n\n• **LH** — som suave: ve-lho, fi-lho, mu-lher.\n• **NH** — som nasal: ni-nho, ma-nhã.\n• **CH** — som \"sh\": cha-ve, chu-va.\n\n**Atenção**: LH, NH, CH ficam SEMPRE na mesma sílaba!\n• fi-lho (NÃO fi-l-ho)\n• ma-nhã (NÃO ma-n-hã)\n• cha-ve (NÃO c-ha-ve)\n\n**Estratégias úteis** ✨\n• Decora os 3 dígrafos — são os mais comuns.\n• LH é molhado; NH é com nariz; CH é mais \"duro\".\n• Pratica com palavras curtas antes das longas.\n\n**❌ O que se costuma errar**\n• Separar o dígrafo: fi-l-ho ✗.\n• Confundir LH com L (filho ≠ filo).\n• Confundir CH com X."
    },
    'som_plus/RR e SS (consoantes dobradas)': {
        title: 'RR e SS (consoantes dobradas)',
        body: "O **RR** e o **SS** só aparecem ENTRE duas vogais.\n\n• **RR** — som FORTE: carro, ferro, terra.\n  Compara com R simples (suave): \"caro\" (1 r) ≠ \"carro\" (2 r).\n• **SS** — som \"ssss\" forte: passar, massa, professor.\n  Compara com S entre vogais (soa \"z\"): \"casa\" → \"z\"; \"cassa\" → \"ss\".\n\n**Regras**:\n• NUNCA no início de palavra.\n• NUNCA depois de consoante (com 1 só).\n• SÓ entre 2 vogais.\n\n**Estratégias úteis** ✨\n• RR e R simples têm SONS diferentes — ouve.\n• SS = forte; S entre vogais = \"z\".\n• Decora: \"passar\", \"carro\", \"professor\".\n\n**❌ O que se costuma errar**\n• Trocar \"casa\" (z) com \"cassa\" (ss).\n• Escrever \"rr\" no início.\n• Esquecer-se de dobrar onde devia."
    },
    'som_plus/Encontros consonantais': {
        title: 'Encontros consonantais',
        body: "Um **encontro consonantal** = DUAS consoantes seguidas, juntas na mesma sílaba.\n\n**Mais comuns**:\n• com R: br, cr, dr, fr, gr, pr, tr, vr — braço, creme, dragão, frio, grama, prato, treze, livro.\n• com L: bl, cl, fl, gl, pl — blusa, claro, flor, globo, plano.\n\nFicam SEMPRE na mesma sílaba.\n\n**Exemplos**:\n• bra-ço (NÃO b-ra-ço)\n• cre-me (NÃO c-re-me)\n• pla-no (NÃO p-la-no)\n\n**Estratégias úteis** ✨\n• Diz \"br\" — é UM som combinado.\n• Pratica com palavras simples: \"pra-to\", \"tre-ze\".\n• Atenção que algumas crianças trocam BR por B ou BL por BR — exercita.\n\n**❌ O que se costuma errar**\n• Separar: p-ra-to ✗ → pra-to ✓.\n• Trocar \"fl\" por \"fr\" (flor ≠ fror).\n• Saltar uma consoante (praça → paça)."
    },
    'som_plus/Encontros vocálicos': {
        title: 'Encontros vocálicos',
        body: "Um **encontro vocálico** = duas (ou mais) vogais juntas. Pode ser:\n\n• **Ditongo** — vogais na MESMA sílaba: pai, beijo, mau, céu, mãe, pão.\n• **Hiato** — vogais em sílabas DIFERENTES: sa-í-da, le-ão, ru-im, ba-ú.\n• **Tritongo** — três vogais na mesma sílaba: Pa-ra-guai.\n\n**Como distinguir**: divisão silábica.\n• Vogais juntas numa sílaba → ditongo.\n• Vogais separadas → hiato.\n\n**Estratégias úteis** ✨\n• Bate palmas em cada sílaba.\n• Hiatos costumam ter ACENTO na 2.ª vogal.\n• Pratica com ditongos famosos (pai, mãe, pão).\n\n**❌ O que se costuma errar**\n• Confundir ditongo com hiato.\n• Esquecer que ditongos podem ser nasais (mãe, pão).\n• Achar que tritongo é raro — existe (Paraguai)."
    },
    'som_plus/Hiatos': {
        title: 'Hiatos',
        body: "Um **hiato** = duas vogais em sílabas DIFERENTES.\n\n**Exemplos**:\n• sa-Í-da → \"a\" + \"í\" separados.\n• le-Ã-o → \"e\" + \"ão\" separados.\n• ba-Ú → \"a\" + \"ú\" separados.\n• po-E-ta → \"o\" + \"e\" separados.\n\n**Como reconhecer**:\n• A 2.ª vogal tem muitas vezes ACENTO (sa-í-da, ba-ú).\n• Diz devagar — se conseguires parar entre as vogais, é hiato.\n\n**Estratégias úteis** ✨\n• Acentos no meio (sa-Í-da) → quase sempre hiato.\n• Compara: \"saia\" (di-ton-go ai) vs \"sa-í-da\" (hi-a-to).\n• Acento na vogal alta (í, ú) é pista forte.\n\n**❌ O que se costuma errar**\n• Trocar hiato com ditongo.\n• Esquecer que o acento ajuda.\n• Achar que \"leão\" tem ditongo — não, é hiato."
    },
    'som_plus/Ditongos orais e nasais': {
        title: 'Ditongos orais e nasais',
        body: "Há 2 tipos de ditongo:\n\n**Orais** (sai só pela boca):\n• ai, ei, oi, ui, au, eu, iu, ou — pai, lei, boi, fui, mau, céu, viu, vou.\n\n**Nasais** (sai pela boca e nariz):\n• ão, ãe, õe, ãi — pão, mãe, põe, cãibra.\n• am, em, im, om, um (no fim) — campo, vem, ruim, com, um.\n\n**Truque**: dedo no nariz.\n• Vibração → nasal.\n• Sem vibração → oral.\n\n**Estratégias úteis** ✨\n• Símbolos ~ e m/n marcam nasalidade.\n• Pratica: \"pão\" (nasal) vs \"pau\" (oral).\n• Decora os ditongos nasais mais comuns.\n\n**❌ O que se costuma errar**\n• Achar que todos os ditongos com til (~) soam igual.\n• Confundir nasal com oral.\n• Não notar o til em \"irmã\", \"manhã\"."
    },
    'som_plus/Pares mínimos avançados': {
        title: 'Pares mínimos avançados',
        body: "**Pares mínimos** = duas palavras que se diferenciam por UM só som.\n\n**Exemplos**:\n• pato / bato (P vs B).\n• vaca / faca (V vs F).\n• rato / lato (R vs L).\n• chá / já (CH vs J).\n• selo / zelo (S vs Z).\n\nNo 3.º ano: sons mais difíceis:\n• lh vs l: filho / fio.\n• nh vs n: manhã / mana.\n• rr vs r: carro / caro.\n• ss vs s: passo / paso.\n\n**Estratégias úteis** ✨\n• Diz alto — o som faz a diferença.\n• Treina ouvindo só UM dos pares e adivinha.\n• Útil para crianças com dislalia.\n\n**❌ O que se costuma errar**\n• Trocar B/V, F/V, R/L.\n• Achar que \"pato\" e \"rato\" são pares mínimos — mudam 2 sons.\n• Confundir grafia com som."
    },
    'som_plus/Sons que se confundem (B/V, F/V)': {
        title: 'Sons que se confundem',
        body: "Alguns sons são MUITO parecidos.\n\n**B vs V** — ambos labiais:\n• B fecha lábios juntos: bola, bater.\n• V usa lábio inferior nos dentes: vela, voar.\n\n**F vs V** — ambos labio-dentais:\n• F sem voz: fada, faca, flor.\n• V com voz: vala, vaca, voo.\n\n**P vs B** — ambos bilabiais:\n• P sem voz: pato.\n• B com voz: bato.\n\n**Truque**: mão na garganta. Vibração → tem voz (B, V).\n\n**Estratégias úteis** ✨\n• Treina espelhando o adulto.\n• Dedo nos lábios para sentir o movimento.\n• Pratica pares mínimos: vaca/faca.\n\n**❌ O que se costuma errar**\n• Trocar B/V na escrita (\"vola\" ≠ \"bola\").\n• Confundir F/V ao ouvir.\n• Pensar que P/B são iguais."
    },
    'som_plus/Trocar uma sílaba': {
        title: 'Trocar uma sílaba',
        body: "Jogo: trocar UMA sílaba para fazer uma palavra nova.\n\n**Exemplos**:\n• borboleta → trocar \"bor\" por \"var\" → varboleta.\n• escola → trocar \"co\" por \"to\" → estola (palavra real!).\n• família → trocar \"fa\" por \"ja\" → jamília (inventada).\n\nNo 3.º ano: palavras LONGAS (3-4 sílabas).\n\n**Estratégias úteis** ✨\n• Identifica as sílabas (palmas).\n• Decide qual trocar.\n• Diz a palavra nova alto.\n• Por vezes sai uma palavra real!\n\n**❌ O que se costuma errar**\n• Trocar mais do que uma sílaba.\n• Trocar fonemas em vez de sílabas.\n• Esquecer-se de manter o resto igual."
    },
    'som_plus/Tirar uma sílaba': {
        title: 'Tirar uma sílaba',
        body: "Tirar = retirar uma sílaba.\n\n**Exemplos**:\n• borboleta sem \"bor\" → boleta.\n• escola sem \"es\" → cola! (palavra real).\n• trabalhar sem \"tra\" → balhar.\n\n**Posição**:\n• 1.ª (inicial): bor-boleta → boleta.\n• Meio: fa-mí-lia sem \"mí\" → falia.\n• Última: fa-mí-lia sem \"lia\" → famí.\n\n**Estratégias úteis** ✨\n• Bate palmas para identificar sílabas.\n• Pratica com palavras de 3 sílabas.\n• Tenta tirar do início, meio, fim.\n\n**❌ O que se costuma errar**\n• Tirar uma letra em vez de uma sílaba.\n• Esquecer-se de juntar o que sobra.\n• Confundir tirar sílaba com tirar fonema."
    },
    'som_plus/Trocar fonema inicial': {
        title: 'Trocar fonema inicial',
        body: "**Fonema** = o som mais pequeno (mais pequeno que a sílaba).\n\n**Trocar fonema inicial** = só o PRIMEIRO som muda.\n\n**Exemplos**:\n• pato → trocar P por B → bato.\n• mala → trocar M por F → fala.\n• rato → trocar R por L → lato.\n• casa → trocar K por T → tasa.\n\nDifícil! Tens de identificar o PRIMEIRO som separado da sílaba.\n\n**Estratégias úteis** ✨\n• Diz a palavra devagar alongando o início: \"Pppp-ato\".\n• Pratica pares: pato/bato, mala/fala.\n• Útil para preparar a leitura.\n\n**❌ O que se costuma errar**\n• Trocar a sílaba inteira em vez do fonema.\n• Confundir o som com a LETRA.\n• Esquecer que algumas letras têm vários sons."
    },
    'som_plus/Segmentar fonemas': {
        title: 'Segmentar fonemas',
        body: "**Segmentar fonemas** = separar uma palavra em sons mais pequenos.\n\n**Exemplos**:\n• PAI → /P/ /A/ /I/ → 3 fonemas.\n• CASA → /K/ /A/ /Z/ /A/ → 4 fonemas.\n• GATO → /G/ /A/ /T/ /O/ → 4 fonemas.\n\n**Sílabas ≠ fonemas**:\n• \"CASA\" tem 2 sílabas (ca-sa) mas 4 fonemas.\n\n**Importância**: melhor preditor da boa leitura.\n\n**Estratégias úteis** ✨\n• Diz a palavra alongando cada som.\n• Bate uma vez para cada fonema.\n• Pratica em palavras curtas antes das longas.\n\n**❌ O que se costuma errar**\n• Contar sílabas em vez de fonemas.\n• Confundir letras com fonemas (LH = 1 fonema, 2 letras).\n• Esquecer que ã, õ são 1 fonema."
    },
    'som_plus/Famílias de palavras': {
        title: 'Famílias de palavras',
        body: "**Família de palavras** = grupo com a mesma RAIZ (parte comum).\n\n**Exemplos**:\n• flor: flor, florista, florido, florir.\n• livro: livro, livraria, livreiro, livrinho.\n• terra: terra, terreno, terrestre, aterrar.\n\n**Atenção**: parecer-se NÃO é o mesmo que ser da família.\n• \"floresta\" parece com \"flor\" mas vem de outra raiz.\n\n**Estratégias úteis** ✨\n• Procura a parte que se repete → a raiz.\n• Vê se o SIGNIFICADO também é parecido — tem de ser!\n• Aumenta o vocabulário descobrindo famílias.\n\n**❌ O que se costuma errar**\n• Misturar famílias só por parecidas (livre/livro).\n• Não notar a raiz por causa de prefixos.\n• Confundir homófonos com família."
    },
    'som_plus/Palavras compostas': {
        title: 'Palavras compostas',
        body: "**Palavra composta** = formada por 2 ou mais palavras.\n\n**Com hífen**:\n• guarda-chuva (guarda + chuva)\n• beija-flor (beija + flor)\n• couve-flor\n• segunda-feira\n• arco-íris\n\n**Sem hífen** (juntas):\n• girassol (gira + sol)\n• passatempo (passa + tempo)\n• malmequer (mal + me + quer)\n\n**Como reconhecer**: tenta partir em 2 — se cada parte tem significado, é composta.\n\n**Estratégias úteis** ✨\n• Lê com pausa pequena: \"guarda – chuva\".\n• Procura padrões: \"guarda-\", \"porta-\", \"para-\".\n• Diverte-te a inventar compostas.\n\n**❌ O que se costuma errar**\n• Esquecer hífen.\n• Confundir composta com derivada.\n• Achar que todas levam hífen."
    },
    'som_plus/Trava-línguas': {
        title: 'Trava-línguas',
        body: "**Trava-línguas** = frase difícil de dizer rápido por ter sons parecidos.\n\n**Exemplos clássicos**:\n• \"O rato roeu a roupa do rei de Roma.\" (R-R-R).\n• \"Três pratos de trigo para três tigres tristes.\" (TR-TR).\n• \"A aranha arranha a rã. A rã arranha a aranha.\" (R-RR).\n• \"O peito do pé do Pedro é preto.\" (P-P-PR).\n\n**Para que servem**?\n• Treinam articulação.\n• Melhoram velocidade e fluência.\n• São divertidos!\n\n**Estratégias úteis** ✨\n• Começa devagar; só depois acelera.\n• Repete 3 vezes seguidas.\n• Inventa os teus próprios.\n\n**❌ O que se costuma errar**\n• Ir depressa demais — perdes os sons.\n• Trocar sons parecidos (R por L).\n• Esquecer parte da frase."
    },
    'som_plus/Memória auditiva avançada': {
        title: 'Memória auditiva avançada',
        body: "**Memória auditiva** = guardar e recordar o que se ouviu.\n\n**Jogos para treinar**:\n\n**1. Lista de palavras** — ouve 5-7 palavras, repete pela ordem.\n   Ex: gato, mesa, livro, sol, casa, árvore, bola.\n\n**2. Frase longa** — ouve uma frase, repete-a.\n   Ex: \"A Eduarda foi ao mercado e comprou pão, leite e duas maçãs.\"\n\n**3. Instruções em cadeia** — ouve várias ordens.\n   Ex: \"Levanta-te, dá 3 voltas, bate palmas e senta-te.\"\n\n**4. Trás-para-frente** — ouve e diz na ORDEM INVERSA.\n   Ex: pato-mesa-flor → flor, mesa, pato.\n\n**Estratégias úteis** ✨\n• Foca-te enquanto ouves.\n• Imagina a cena na cabeça.\n• Repete mentalmente antes de dizer alto.\n\n**❌ O que se costuma errar**\n• Não prestar atenção.\n• Querer recordar TUDO de uma vez.\n• Esquecer-se da ordem."
    }
};
// Lições de leitura do 3.º também valem para o Oceanus (era feito em content.js)
Object.entries(LESSONS_3).forEach(([k, v]) => { if (k.startsWith('leitura/')) LESSONS_3_OCEANUS[k] = v; });
Object.assign(window.LESSONS_BY_YEAR[31], LESSONS_3_OCEANUS);
Object.assign(window.LESSONS_BY_YEAR[3], LESSONS_3);
})();
