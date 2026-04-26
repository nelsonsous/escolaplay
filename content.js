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
    portugues: ['Vogais e consoantes','Sílabas','Ditongos','Sinónimos','Antónimos','Família de palavras','Tipos de frase','Singular e plural','Verbos no presente'],
    matematica: ['Números até 100','Dezenas e unidades','Adição até 100','Subtração até 100','Tabuada do 2','Tabuada do 5','Tabuada do 10','Sólidos geométricos','Figuras planas','Medir tempo','Dinheiro (€)'],
    estudo_meio: ['O meu corpo','A minha família','A escola','Animais','Plantas','Estações do ano','Os sentidos','Profissões','Portugal'],
    ingles: ['Cores','Números','Animais','Família','Cumprimentos']
};

// Períodos por tópico (1, 2 ou 3) — ano lectivo dividido em 3 períodos
const PERIODS_2 = {
    portugues:   { 'Vogais e consoantes':1, 'Sílabas':1, 'Ditongos':1, 'Sinónimos':2, 'Antónimos':2, 'Família de palavras':2, 'Tipos de frase':3, 'Singular e plural':3, 'Verbos no presente':3 },
    matematica:  { 'Números até 100':1, 'Dezenas e unidades':1, 'Adição até 100':1, 'Subtração até 100':2, 'Tabuada do 2':2, 'Tabuada do 5':2, 'Tabuada do 10':2, 'Sólidos geométricos':3, 'Figuras planas':3, 'Medir tempo':3, 'Dinheiro (€)':3 },
    estudo_meio: { 'O meu corpo':1, 'A minha família':1, 'A escola':1, 'Animais':2, 'Plantas':2, 'Estações do ano':2, 'Os sentidos':3, 'Profissões':3, 'Portugal':3 },
    ingles:      { 'Cores':1, 'Números':1, 'Animais':2, 'Família':2, 'Cumprimentos':3 }
};

const LESSONS_2 = {
    'matematica/Números até 100': { title:'Números até 100', body:'Os números até 100 organizam-se por dezenas: 10, 20, 30… Cada número de dois algarismos tem uma dezena (à esquerda) e uma unidade (à direita).\n\nExemplo: **47** = 4 dezenas + 7 unidades.' },
    'matematica/Dezenas e unidades': { title:'Dezenas e unidades', body:'Cada algarismo num número de 2 algarismos tem um valor diferente conforme a sua posição.\n\nNo número **63**: o 6 vale 60 (6 dezenas) e o 3 vale 3 (3 unidades).' },
    'matematica/Adição até 100': { title:'Adição', body:'Para somar 23 + 14:\n1) Soma as **unidades**: 3 + 4 = 7.\n2) Soma as **dezenas**: 2 + 1 = 3.\n3) Resultado: **37**.\n\nQuando as unidades passam de 9, "transportamos" 1 dezena.' },
    'matematica/Subtração até 100': { title:'Subtração', body:'Para subtrair 48 − 15:\n1) Subtrai **unidades**: 8 − 5 = 3.\n2) Subtrai **dezenas**: 4 − 1 = 3.\n3) Resultado: **33**.' },
    'matematica/Tabuada do 2': { title:'Tabuada do 2', body:'2×1=2, 2×2=4, 2×3=6, 2×4=8, 2×5=10, 2×6=12, 2×7=14, 2×8=16, 2×9=18, 2×10=20.\n\nMultiplicar por 2 é o mesmo que somar o número a si próprio.' },
    'matematica/Tabuada do 5': { title:'Tabuada do 5', body:'5×1=5, 5×2=10, 5×3=15, 5×4=20, 5×5=25, 5×6=30, 5×7=35, 5×8=40, 5×9=45, 5×10=50.\n\nOs múltiplos de 5 acabam sempre em **0** ou **5**.' },
    'matematica/Tabuada do 10': { title:'Tabuada do 10', body:'Multiplicar por 10 é fácil: junta-se **um zero** ao número. 3×10=30, 7×10=70.' },
    'matematica/Sólidos geométricos': { title:'Sólidos geométricos', body:'Os sólidos têm volume. Os mais comuns: **cubo** (dado), **esfera** (bola), **cilindro** (lata), **cone** (gelado), **pirâmide** (pirâmide do Egipto), **paralelepípedo** (caixa de sapatos).' },
    'matematica/Figuras planas': { title:'Figuras planas', body:'Figuras planas têm 2 dimensões. **Triângulo** (3 lados), **Quadrado** (4 lados iguais), **Retângulo** (4 lados, 2 a 2), **Círculo** (sem lados rectos).' },
    'matematica/Medir tempo': { title:'Medir tempo', body:'**1 hora = 60 minutos. 1 minuto = 60 segundos. 1 dia = 24 horas. 1 semana = 7 dias. 1 mês ≈ 30 dias. 1 ano = 12 meses = 365 dias.**' },
    'matematica/Dinheiro (€)': { title:'Dinheiro', body:'A moeda em Portugal é o **euro (€)**. Há moedas (1c, 2c, 5c, 10c, 20c, 50c, 1€, 2€) e notas (5€, 10€, 20€, 50€, 100€, 200€, 500€).\n\n100 cêntimos = 1 euro.' },
    'portugues/Vogais e consoantes': { title:'Vogais e consoantes', body:'As **5 vogais** são: **a, e, i, o, u**.\n\nTodas as outras letras do alfabeto são **consoantes**.' },
    'portugues/Sílabas': { title:'Sílabas', body:'Cada palavra divide-se em **sílabas** — pedacinhos que dizemos numa única emissão de voz.\n\nEx.: ca-sa (2 sílabas), bo-la (2), pa-pa-gai-o (4).' },
    'portugues/Ditongos': { title:'Ditongos', body:'**Ditongo** = duas vogais juntas na mesma sílaba.\n\nEx.: pai (a+i), céu (e+u), mãe (ã+e).' },
    'portugues/Sinónimos': { title:'Sinónimos', body:'**Sinónimos** são palavras com significado parecido.\n\nEx.: bonito = belo; rápido = veloz; alegre = contente.' },
    'portugues/Antónimos': { title:'Antónimos', body:'**Antónimos** são palavras com significado oposto.\n\nEx.: alto ≠ baixo; quente ≠ frio; alegre ≠ triste.' },
    'portugues/Família de palavras': { title:'Família de palavras', body:'Palavras da mesma **família** partilham parte do nome (a "raiz") e ideias próximas.\n\nEx.: **flor** → florista, florido, florescer, floricultura.' },
    'portugues/Tipos de frase': { title:'Tipos de frase', body:'**Declarativa** (afirma): "O céu está azul."\n**Interrogativa** (pergunta): "O céu está azul?"\n**Exclamativa** (emoção!): "Que céu lindo!"\n**Imperativa** (ordem/pedido): "Olha para o céu."' },
    'portugues/Singular e plural': { title:'Singular e plural', body:'**Singular** = um. **Plural** = mais do que um.\n\nRegra geral: junta "s" no fim → casa/casas. Em "-al" ou "-ol" muda para "-ais"/"-óis": animal/animais; lençol/lençóis.' },
    'portugues/Verbos no presente': { title:'Verbos no presente', body:'O **presente** é o tempo de agora. Verbo **correr**:\nEu corro · Tu corres · Ele corre · Nós corremos · Vós correis · Eles correm.' },
    'estudo_meio/O meu corpo': { title:'O corpo humano', body:'O corpo humano divide-se em três partes: **cabeça**, **tronco** e **membros**. Os membros superiores são os braços; os inferiores são as pernas.' },
    'estudo_meio/A minha família': { title:'A família', body:'A família mais próxima é a **família nuclear**: pais e irmãos. A **família alargada** inclui avós, tios, primos, padrinhos.' },
    'estudo_meio/A escola': { title:'A escola', body:'Na escola aprendemos, brincamos e fazemos amigos. Devemos **respeitar** colegas, professores e funcionários, e cuidar dos materiais.' },
    'estudo_meio/Animais': { title:'Animais', body:'Os animais classificam-se de muitas formas. Quanto à reprodução: **ovíparos** (põem ovos — galinha, peixe) e **vivíparos** (nascem da mãe — gato, cão, humano). Os peixes respiram por **guelras**; os mamíferos por **pulmões**.' },
    'estudo_meio/Plantas': { title:'Plantas', body:'Uma planta tem geralmente **raiz** (debaixo da terra), **caule**, **folhas**, **flor** e **fruto**. As plantas precisam de **água**, **luz** e **ar** para viver.' },
    'estudo_meio/Estações do ano': { title:'Estações do ano', body:'**Primavera** (flores), **Verão** (calor), **Outono** (folhas caem) e **Inverno** (frio).' },
    'estudo_meio/Os sentidos': { title:'Os 5 sentidos', body:'**Visão** (olhos), **audição** (ouvidos), **olfato** (nariz), **paladar** (boca/língua) e **tato** (pele).' },
    'estudo_meio/Profissões': { title:'Profissões', body:'Cada profissão ajuda a comunidade: **médico** trata doentes, **professor** ensina, **bombeiro** apaga fogos, **padeiro** faz pão, **agricultor** cultiva alimentos.' },
    'estudo_meio/Portugal': { title:'Portugal', body:'Portugal fica na Europa, na **Península Ibérica**. A capital é **Lisboa**. A bandeira tem **verde** e **vermelho** com o brasão. A língua oficial é o **português**.' },
    'ingles/Cores': { title:'As cores em inglês', body:'🔴 **red** = vermelho\n🔵 **blue** = azul\n🟡 **yellow** = amarelo\n🟢 **green** = verde\n💗 **pink** = rosa\n⚫ **black** = preto\n⚪ **white** = branco\n\nVê os bonecos coloridos e diz a cor em inglês!' },
    'ingles/Números': { title:'Os números 1 a 5', body:'**1** = **one** ☝️\n**2** = **two** ✌️\n**3** = **three** 🤟\n**4** = **four** ✋\n**5** = **five** 🖐️\n\nConta os dedos em inglês: one, two, three, four, five!' },
    'ingles/Animais': { title:'Os animais', body:'🐶 **dog** = cão\n🐱 **cat** = gato\n🐦 **bird** = passarinho\n🐟 **fish** = peixe\n🐰 **rabbit** = coelho\n🐴 **horse** = cavalo\n\nOlha para o desenho — qual é o animal em inglês?' },
    'ingles/Família': { title:'A família', body:'👩 **mum** = mãe\n👨 **dad** = pai\n👧 **sister** = irmã\n👦 **brother** = irmão\n👵 **grandma** = avó\n👴 **grandpa** = avô\n\nQuem é quem na tua família?' },
    'ingles/Cumprimentos': { title:'Olá em inglês!', body:'👋 **Hello!** = Olá!\n🌅 **Good morning!** = Bom dia!\n🌙 **Good night!** = Boa noite!\n👋 **Bye!** = Adeus!\n🙏 **Thank you!** = Obrigada!\n😊 **I am fine** = Estou bem' }
};

const EXERCISES_2 = [
    // Português
    { id:'2p1', s:'portugues', t:'Vogais e consoantes', type:'mc', diff:1, q:'Quais são as vogais?', opts:['a, e, i, o, u','a, b, c, d, e','b, c, d, f, g','i, j, k, l, m'], ans:0, exp:'As vogais são 5: a, e, i, o, u.' },
    { id:'2p2', s:'portugues', t:'Sílabas', type:'fill', diff:1, q:'Quantas sílabas tem a palavra "menina"?', ans:['3','três'], exp:'Me-ni-na = 3 sílabas.' },
    { id:'2p3', s:'portugues', t:'Sílabas', type:'mc', diff:1, q:'Como se divide a palavra "escola"?', opts:['esc-ola','es-co-la','e-sco-la','esco-la'], ans:1, exp:'es-co-la = 3 sílabas.' },
    { id:'2p4', s:'portugues', t:'Sinónimos', type:'mc', diff:1, q:'Qual é o sinónimo de "bonito"?', opts:['feio','belo','triste','rápido'], ans:1, exp:'Bonito e belo significam o mesmo.' },
    { id:'2p5', s:'portugues', t:'Antónimos', type:'mc', diff:1, q:'Qual é o antónimo de "alto"?', opts:['grande','baixo','forte','rápido'], ans:1, exp:'Alto ≠ baixo.' },
    { id:'2p6', s:'portugues', t:'Antónimos', type:'fill', diff:1, q:'O antónimo de "quente" é ___.', ans:['frio'], exp:'Quente ≠ frio.' },
    { id:'2p7', s:'portugues', t:'Singular e plural', type:'fill', diff:1, q:'Qual é o plural de "casa"?', ans:['casas'], exp:'Acrescenta-se "s" no final.' },
    { id:'2p8', s:'portugues', t:'Singular e plural', type:'fill', diff:2, q:'Qual é o plural de "papel"?', ans:['papéis','papeis'], exp:'Palavras em "-el" fazem plural em "-éis".' },
    { id:'2p9', s:'portugues', t:'Tipos de frase', type:'mc', diff:1, q:'"Que dia bonito!" é uma frase:', opts:['interrogativa','exclamativa','declarativa','imperativa'], ans:1, exp:'Termina com "!" → exclamativa.' },
    { id:'2p10', s:'portugues', t:'Verbos no presente', type:'fill', diff:1, q:'Eu ___ (correr) no parque. (presente)', ans:['corro'], exp:'Eu corro, tu corres, ele corre.' },
    { id:'2p11', s:'portugues', t:'Família de palavras', type:'mc', diff:2, q:'Qual destas palavras NÃO pertence à família de "flor"?', opts:['florista','florido','florescer','feliz'], ans:3, exp:'Florista, florido e florescer vêm de flor. Feliz não.' },
    { id:'2p12', s:'portugues', t:'Ditongos', type:'mc', diff:1, q:'Qual destas palavras tem um ditongo?', opts:['casa','pai','sol','livro'], ans:1, exp:'Em "pai", "ai" é um ditongo (duas vogais juntas).' },
    { id:'2p13', s:'portugues', t:'Vogais e consoantes', type:'fill', diff:1, q:'Quantas vogais existem? ___', ans:['5','cinco'], exp:'a, e, i, o, u → 5 vogais.' },
    { id:'2p14', s:'portugues', t:'Sinónimos', type:'fill', diff:2, q:'Sinónimo de "alegre": ___', ans:['contente','feliz'], exp:'Alegre = contente = feliz.' },

    // Matemática
    { id:'2m1', s:'matematica', t:'Números até 100', type:'mc', diff:1, q:'Quantas dezenas tem o número 47?', opts:['4','7','47','40'], ans:0, exp:'47 = 4 dezenas + 7 unidades.' },
    { id:'2m2', s:'matematica', t:'Dezenas e unidades', type:'fill', diff:1, q:'O número que tem 6 dezenas e 3 unidades é ___.', ans:['63'], exp:'6 dezenas = 60. 60 + 3 = 63.' },
    { id:'2m3', s:'matematica', t:'Adição até 100', type:'fill', diff:1, q:'25 + 13 = ___', ans:['38'], exp:'5+3=8 (unidades). 2+1=3 (dezenas). Resultado: 38.' },
    { id:'2m4', s:'matematica', t:'Adição até 100', type:'problem', diff:2, q:'A Eduarda tem 27 cromos e a Joana tem 15. Quantos cromos têm ao todo?', ans:['42'], material:'Soma os dois números: 27 + 15.', solution:'Unidades: 7+5=12 (escrevo 2 e transporto 1). Dezenas: 2+1+1=4. Resultado: 42 cromos.', exp:'Soma com transporte.' },
    { id:'2m5', s:'matematica', t:'Subtração até 100', type:'fill', diff:1, q:'48 − 15 = ___', ans:['33'], exp:'8−5=3 (unidades). 4−1=3 (dezenas). Resultado: 33.' },
    { id:'2m6', s:'matematica', t:'Subtração até 100', type:'problem', diff:2, q:'Tinha 50 berlindes e perdi 18. Com quantos fiquei?', ans:['32'], material:'Subtração: 50 − 18.', solution:'50 − 10 = 40. 40 − 8 = 32. Fiquei com 32 berlindes.', exp:'Subtração com empréstimo.' },
    { id:'2m7', s:'matematica', t:'Tabuada do 2', type:'fill', diff:1, q:'2 × 7 = ___', ans:['14'], exp:'2 × 7 = 7 + 7 = 14.' },
    { id:'2m8', s:'matematica', t:'Tabuada do 2', type:'mc', diff:1, q:'Quanto é 2 × 6?', opts:['10','12','14','8'], ans:1, exp:'2 × 6 = 12.' },
    { id:'2m9', s:'matematica', t:'Tabuada do 5', type:'fill', diff:1, q:'5 × 4 = ___', ans:['20'], exp:'5 × 4 = 20.' },
    { id:'2m10', s:'matematica', t:'Tabuada do 5', type:'problem', diff:2, q:'A Eduarda tem 5 sacos com 3 chocolates em cada. Quantos chocolates tem?', ans:['15'], material:'Multiplica: 5 × 3.', solution:'5 + 5 + 5 = 15. Ou 5 × 3 = 15.', exp:'Multiplicação como soma repetida.' },
    { id:'2m11', s:'matematica', t:'Tabuada do 10', type:'fill', diff:1, q:'10 × 8 = ___', ans:['80'], exp:'Multiplicar por 10: junta um zero. 8 → 80.' },
    { id:'2m12', s:'matematica', t:'Sólidos geométricos', type:'mc', diff:1, q:'Qual destes objetos tem a forma de uma esfera?', opts:['caixa de sapatos','bola de futebol','livro','pirâmide'], ans:1, exp:'A bola é uma esfera.' },
    { id:'2m13', s:'matematica', t:'Figuras planas', type:'mc', diff:1, q:'Quantos lados tem um triângulo?', opts:['2','3','4','5'], ans:1, exp:'Triângulo = 3 lados.' },
    { id:'2m14', s:'matematica', t:'Figuras planas', type:'mc', diff:1, q:'Uma figura com 4 lados iguais é um:', opts:['triângulo','quadrado','círculo','retângulo'], ans:1, exp:'Quadrado: 4 lados iguais.' },
    { id:'2m15', s:'matematica', t:'Medir tempo', type:'fill', diff:1, q:'Quantos minutos tem 1 hora? ___', ans:['60'], exp:'1 hora = 60 minutos.' },
    { id:'2m16', s:'matematica', t:'Medir tempo', type:'mc', diff:1, q:'Quantos dias tem uma semana?', opts:['5','6','7','30'], ans:2, exp:'Uma semana = 7 dias.' },
    { id:'2m17', s:'matematica', t:'Dinheiro (€)', type:'problem', diff:2, q:'Uma sandes custa 2€ e um sumo custa 1€. Quanto custa o lanche?', ans:['3','3€','3 euros'], material:'Soma: 2 + 1.', solution:'2 + 1 = 3. O lanche custa 3€.', exp:'Adição simples.' },
    { id:'2m18', s:'matematica', t:'Dinheiro (€)', type:'problem', diff:2, q:'A Eduarda tinha 10€ e comprou um livro de 6€. Quanto dinheiro lhe ficou?', ans:['4','4€','4 euros'], material:'Subtração: 10 − 6.', solution:'10 − 6 = 4. Ficou com 4€.', exp:'Subtração com dinheiro.' },
    { id:'2m19', s:'matematica', t:'Números até 100', type:'order', diff:2, q:'Ordena do menor para o maior: 27, 7, 72, 17', items:['7','17','27','72'], exp:'Comparam-se as dezenas primeiro.' },
    { id:'2m20', s:'matematica', t:'Tabuada do 5', type:'mc', diff:1, q:'Qual é o resultado de 5 × 9?', opts:['40','45','50','55'], ans:1, exp:'5 × 9 = 45.' },

    // Estudo do Meio
    { id:'2e1', s:'estudo_meio', t:'O meu corpo', type:'mc', diff:1, q:'Quais são as 3 grandes partes do corpo humano?', opts:['cabeça, tronco, membros','braços, pernas, mãos','olhos, nariz, boca','músculos, ossos, pele'], ans:0, exp:'Cabeça, tronco e membros (braços e pernas).' },
    { id:'2e2', s:'estudo_meio', t:'Os sentidos', type:'mc', diff:1, q:'Com que sentido ouvimos os sons?', opts:['visão','audição','olfato','tato'], ans:1, exp:'Audição = ouvir, com os ouvidos.' },
    { id:'2e3', s:'estudo_meio', t:'Os sentidos', type:'fill', diff:1, q:'Quantos sentidos temos? ___', ans:['5','cinco'], exp:'Visão, audição, olfato, paladar e tato.' },
    { id:'2e4', s:'estudo_meio', t:'Animais', type:'mc', diff:1, q:'Os peixes respiram com:', opts:['pulmões','guelras','traqueia','pele'], ans:1, exp:'Os peixes têm guelras (brânquias).' },
    { id:'2e5', s:'estudo_meio', t:'Animais', type:'tf', diff:1, q:'O pinguim é uma ave.', ans:true, exp:'O pinguim é uma ave (tem penas e bico) que não voa mas nada muito bem.' },
    { id:'2e6', s:'estudo_meio', t:'Plantas', type:'mc', diff:1, q:'A parte da planta que está debaixo da terra chama-se:', opts:['caule','folha','raiz','flor'], ans:2, exp:'A raiz fica debaixo da terra e absorve a água.' },
    { id:'2e7', s:'estudo_meio', t:'Estações do ano', type:'mc', diff:1, q:'Em que estação caem as folhas das árvores?', opts:['Primavera','Verão','Outono','Inverno'], ans:2, exp:'No Outono, as folhas mudam de cor e caem.' },
    { id:'2e8', s:'estudo_meio', t:'Estações do ano', type:'fill', diff:1, q:'A estação mais quente do ano é o ___.', ans:['verão','Verão','verao'], exp:'Verão = calor.' },
    { id:'2e9', s:'estudo_meio', t:'A minha família', type:'mc', diff:1, q:'O irmão do meu pai é o meu:', opts:['avô','tio','primo','padrinho'], ans:1, exp:'Irmão do pai/mãe = tio.' },
    { id:'2e10', s:'estudo_meio', t:'A escola', type:'tf', diff:1, q:'Na escola devemos respeitar os colegas e os professores.', ans:true, exp:'O respeito é uma regra básica na escola.' },
    { id:'2e11', s:'estudo_meio', t:'Profissões', type:'mc', diff:1, q:'Quem cuida dos doentes no hospital?', opts:['professor','médico','padeiro','jardineiro'], ans:1, exp:'O médico (com a ajuda dos enfermeiros) cuida dos doentes.' },
    { id:'2e12', s:'estudo_meio', t:'Portugal', type:'mc', diff:1, q:'Qual é a capital de Portugal?', opts:['Porto','Coimbra','Lisboa','Faro'], ans:2, exp:'A capital de Portugal é Lisboa.' },
    { id:'2e13', s:'estudo_meio', t:'Portugal', type:'mc', diff:1, q:'Quais são as cores da bandeira de Portugal?', opts:['azul e branco','verde e vermelho','vermelho e amarelo','verde e branco'], ans:1, exp:'A bandeira portuguesa é verde e vermelha, com o brasão.' },
    { id:'2e14', s:'estudo_meio', t:'Animais', type:'mc', diff:2, q:'Um animal que põe ovos chama-se:', opts:['vivíparo','ovíparo','mamífero','herbívoro'], ans:1, exp:'Ovíparo: nasce de um ovo.' },

    // Inglês — visual-first, sem escrever em inglês, opções com 3 alternativas
    { id:'2i1',  s:'ingles', t:'Cores',        type:'mc', diff:1, q:'🔴 Que cor é esta em inglês?',                     opts:['red','blue','yellow'],     ans:0, exp:'🔴 = red (vermelho).' },
    { id:'2i2',  s:'ingles', t:'Cores',        type:'mc', diff:1, q:'🔵 Que cor é esta em inglês?',                     opts:['green','blue','pink'],     ans:1, exp:'🔵 = blue (azul).' },
    { id:'2i3',  s:'ingles', t:'Cores',        type:'mc', diff:1, q:'💗 Que cor é esta em inglês?',                     opts:['pink','black','white'],    ans:0, exp:'💗 = pink (rosa).' },
    { id:'2i4',  s:'ingles', t:'Cores',        type:'mc', diff:1, q:'🟢 Que cor é esta em inglês?',                     opts:['yellow','red','green'],    ans:2, exp:'🟢 = green (verde).' },
    { id:'2i5',  s:'ingles', t:'Números',      type:'mc', diff:1, q:'☝️ Quantos dedos? Em inglês:',                       opts:['one','two','three'],       ans:0, exp:'☝️ = 1 = one.' },
    { id:'2i6',  s:'ingles', t:'Números',      type:'mc', diff:1, q:'✌️ Quantos dedos? Em inglês:',                       opts:['four','two','three'],      ans:1, exp:'✌️ = 2 = two.' },
    { id:'2i7',  s:'ingles', t:'Números',      type:'mc', diff:1, q:'🖐️ Quantos dedos? Em inglês:',                       opts:['three','four','five'],     ans:2, exp:'🖐️ = 5 = five.' },
    { id:'2i8',  s:'ingles', t:'Números',      type:'mc', diff:2, q:'Quantas estrelas? ⭐⭐⭐ Em inglês:',                  opts:['two','three','four'],      ans:1, exp:'⭐⭐⭐ = 3 = three.' },
    { id:'2i9',  s:'ingles', t:'Animais',      type:'mc', diff:1, q:'🐶 Que animal é em inglês?',                       opts:['cat','dog','bird'],        ans:1, exp:'🐶 = dog (cão).' },
    { id:'2i10', s:'ingles', t:'Animais',      type:'mc', diff:1, q:'🐱 Que animal é em inglês?',                       opts:['cat','fish','rabbit'],     ans:0, exp:'🐱 = cat (gato).' },
    { id:'2i11', s:'ingles', t:'Animais',      type:'mc', diff:1, q:'🐟 Que animal é em inglês?',                       opts:['bird','fish','horse'],     ans:1, exp:'🐟 = fish (peixe).' },
    { id:'2i12', s:'ingles', t:'Animais',      type:'mc', diff:1, q:'🐰 Que animal é em inglês?',                       opts:['rabbit','dog','cat'],      ans:0, exp:'🐰 = rabbit (coelho).' },
    { id:'2i13', s:'ingles', t:'Família',      type:'mc', diff:1, q:'A tua mãe em inglês é:',                            opts:['dad','mum','sister'],      ans:1, exp:'mãe = mum (também se diz "mother").' },
    { id:'2i14', s:'ingles', t:'Família',      type:'mc', diff:1, q:'O teu pai em inglês é:',                            opts:['dad','brother','grandpa'], ans:0, exp:'pai = dad (também se diz "father").' },
    { id:'2i15', s:'ingles', t:'Família',      type:'mc', diff:1, q:'A tua irmã em inglês é:',                           opts:['mum','sister','grandma'],  ans:1, exp:'irmã = sister.' },
    { id:'2i16', s:'ingles', t:'Cumprimentos', type:'mc', diff:1, q:'👋 De manhã dizes:',                                opts:['Good night','Good morning','Bye'], ans:1, exp:'De manhã: Good morning! 🌅' },
    { id:'2i17', s:'ingles', t:'Cumprimentos', type:'mc', diff:1, q:'🌙 Antes de dormir dizes:',                          opts:['Hello','Good night','Thank you'], ans:1, exp:'Antes de dormir: Good night! 🌙' },
    { id:'2i18', s:'ingles', t:'Cumprimentos', type:'mc', diff:1, q:'Para agradecer dizes:',                              opts:['Hello','Bye','Thank you'], ans:2, exp:'Obrigada = Thank you! 🙏' }
];


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
const LESSONS_5 = {
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
const EXERCISES_5 = [
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
const CURRICULUM_5 = {
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

const LESSONS_6 = {
    // ----- Português -----
    'portugues/Texto narrativo': {
        title: 'Texto narrativo',
        body: `O **texto narrativo** conta uma história. Tem cinco elementos essenciais:\n\n• **Narrador** — quem conta (1.ª pessoa = participa; 3.ª pessoa = observa).\n• **Personagens** — principais, secundárias, figurantes.\n• **Espaço** — onde decorre a ação (físico, social, psicológico).\n• **Tempo** — quando decorre (cronológico, histórico).\n• **Ação** — sequência: introdução → desenvolvimento → conclusão (ou desenlace).`
    },
    'portugues/Texto poético': {
        title: 'Texto poético',
        body: `Um **poema** organiza-se em **versos** (cada linha) e **estrofes** (conjuntos de versos).\n\n• **Rima** — som igual no fim dos versos (rima cruzada ABAB, emparelhada AABB, interpolada ABBA).\n• **Métrica** — número de sílabas métricas em cada verso.\n• **Estrofes**: dístico (2), terceto (3), quadra (4), quintilha (5), sextilha (6).\n• Versos sem rima chamam-se **versos brancos**.`
    },
    'portugues/Texto dramático': {
        title: 'Texto dramático',
        body: `O **texto dramático** é escrito para ser representado em palco (teatro).\n\n• **Falas** — cada personagem fala (precedidas pelo nome).\n• **Didascálias** — indicações ao encenador/atores (em itálico ou parênteses): cenário, gestos, entoação.\n• **Estrutura**: dividido em **atos** (grandes blocos) e **cenas** (mudança de personagens em palco).\n• Não tem narrador — a ação avança pelo diálogo.`
    },
    'portugues/Funções sintáticas': {
        title: 'Funções sintáticas',
        body: `Numa frase, cada grupo desempenha uma função:\n\n• **Sujeito** — quem pratica a ação (*A Maria* leu o livro).\n• **Predicado** — o que se diz do sujeito (contém o verbo).\n• **Complemento direto (CD)** — responde a "o quê?" (leu *o livro*).\n• **Complemento indireto (CI)** — responde a "a quem?" (deu o livro *à Ana*).\n• **Modificador** — info extra removível (leu *na biblioteca*).\n• **Predicativo do sujeito** — qualifica o sujeito após verbo copulativo ser/estar/parecer/ficar (*A casa está limpa*).`
    },
    'portugues/Modos verbais': {
        title: 'Modos verbais',
        body: `Os verbos variam em **modo** consoante a atitude do falante:\n\n• **Indicativo** — afirma um facto: *eu canto, eu cantei, eu cantarei*.\n• **Conjuntivo** — exprime dúvida, desejo, hipótese: *talvez eu cante; espero que eu cante*.\n• **Imperativo** — dá ordens, conselhos, pedidos: *canta!, cantem!*.\n\nO **infinitivo**, **gerúndio** e **particípio** são formas nominais (não exprimem modo nem tempo de forma autónoma).`
    },
    'portugues/Tempos compostos': {
        title: 'Tempos compostos',
        body: `Os **tempos compostos** formam-se com o verbo auxiliar **ter** (ou haver) + **particípio passado** do verbo principal.\n\n• **Pretérito perfeito composto**: *eu tenho cantado* (ação que se repete até ao presente).\n• **Pretérito mais-que-perfeito composto**: *eu tinha cantado* (ação anterior a outra passada).\n• **Futuro composto**: *eu terei cantado* (ação concluída antes de outra futura).\n\nO particípio é invariável quando vem depois de "ter": *tenho lido, temos visto*.`
    },
    'portugues/Discurso direto e indireto': {
        title: 'Discurso direto e indireto',
        body: `• **Discurso direto** — reproduz exatamente as palavras (com travessão ou aspas):\n  — *Disse o João: "Estou cansado."*\n\n• **Discurso indireto** — relata o que foi dito (sem aspas, com verbo declarativo + "que"):\n  — *O João disse que estava cansado.*\n\n**Mudanças** ao passar de direto para indireto:\n• 1.ª pessoa → 3.ª pessoa (eu → ele)\n• Presente → imperfeito (estou → estava)\n• "hoje" → "nesse dia"; "aqui" → "ali"; "amanhã" → "no dia seguinte".`
    },
    'portugues/Recursos expressivos': {
        title: 'Recursos expressivos',
        body: `Técnicas que dão beleza e força ao texto:\n\n• **Comparação** — usa "como": *forte como um touro*.\n• **Metáfora** — comparação implícita: *és um touro*.\n• **Personificação** — atribui qualidades humanas: *o vento gemia*.\n• **Enumeração** — sequência de elementos: *trouxe pão, leite, fruta e mel*.\n• **Hipérbole** — exagero: *morro de fome*.\n• **Anáfora** — repetição no início de versos/frases.\n• **Aliteração** — repetição de consoantes: *o rato roeu a rolha*.`
    },
    'portugues/Acentuação gráfica': {
        title: 'Acentuação gráfica',
        body: `Quanto à sílaba tónica, as palavras classificam-se em:\n\n• **Agudas** — tónica na **última** sílaba: café, avó, jardim.\n• **Graves (paroxítonas)** — tónica na **penúltima**: mesa, lápis, fácil.\n• **Esdrúxulas (proparoxítonas)** — tónica na **antepenúltima**: árvore, médico, sílaba — **acentuam-se sempre**.\n\nAcentos: **agudo (´)**, **grave (\`)**, **circunflexo (^)**, **til (~)**.`
    },
    'portugues/Orações coordenadas e subordinadas': {
        title: 'Orações coordenadas e subordinadas',
        body: `Uma frase complexa tem mais do que uma oração.\n\n• **Coordenadas** — orações com sentido independente, ligadas por conjunções coordenativas (e, mas, ou, porém, logo). Ex.: *Estudei muito **e** passei no teste.*\n\n• **Subordinadas** — uma oração depende da outra. Conjunções: porque, quando, se, embora, que. Ex.: *Não fui à praia **porque** estava a chover.*\n\nA oração principal sustenta o sentido; a subordinada acrescenta uma informação dependente.`
    },

    // ----- Matemática -----
    'matematica/Números racionais não negativos': {
        title: 'Números racionais não negativos',
        body: `Um **número racional** pode escrever-se como **fração** a/b (com b ≠ 0). Inclui:\n\n• **Frações**: 1/2, 3/4, 7/5.\n• **Decimais**: 0,5; 0,75; 1,4.\n• **Percentagens**: 25%, 50%, 100%.\n\n**Conversões úteis**:\n• Fração → decimal: dividir o numerador pelo denominador. 3/4 = 3 ÷ 4 = 0,75.\n• Decimal → percentagem: multiplicar por 100. 0,75 = 75%.\n• Percentagem → fração: pôr sobre 100 e simplificar. 25% = 25/100 = 1/4.`
    },
    'matematica/Operações com frações': {
        title: 'Operações com frações',
        body: `• **Adição/subtração**: reduzir ao mesmo denominador, depois somar/subtrair os numeradores.\n  1/2 + 1/3 = 3/6 + 2/6 = **5/6**.\n\n• **Multiplicação**: numerador × numerador e denominador × denominador.\n  2/3 × 4/5 = **8/15**.\n\n• **Divisão**: multiplicar pelo inverso da segunda fração.\n  2/3 ÷ 4/5 = 2/3 × 5/4 = **10/12 = 5/6**.\n\nNo final, **simplificar** sempre que possível.`
    },
    'matematica/Potências de expoente natural': {
        title: 'Potências de expoente natural',
        body: `Uma **potência** representa multiplicações de fatores iguais: a^n = a × a × … × a (n vezes).\n\n• **Base** = a; **expoente** = n.\n• 2³ = 2 × 2 × 2 = **8**.\n• a¹ = a; a⁰ = 1 (a ≠ 0).\n\n**Regras**:\n• Mesma base, multiplicar: a^m × a^n = a^(m+n). Ex.: 2² × 2³ = 2⁵.\n• Mesma base, dividir: a^m ÷ a^n = a^(m−n). Ex.: 3⁵ ÷ 3² = 3³.\n• Potência de potência: (a^m)^n = a^(m×n). Ex.: (2²)³ = 2⁶.`
    },
    'matematica/Sequências e regularidades': {
        title: 'Sequências e regularidades',
        body: `Uma **sequência** é uma lista ordenada de termos com uma regra.\n\n• 2, 4, 6, 8, … → **termo geral** 2n (múltiplos de 2).\n• 1, 4, 9, 16, … → n² (quadrados).\n• 5, 8, 11, 14, … → 3n + 2 (soma 3).\n\n**Como descobrir o termo geral**:\n1) Vê a diferença entre termos consecutivos.\n2) Se for constante k, o termo geral é k·n + (algo).\n3) Testa com n = 1, 2, 3 para confirmar.`
    },
    'matematica/Razões e proporções': {
        title: 'Razões e proporções',
        body: `• **Razão** entre a e b é o quociente a/b (com b ≠ 0). Ex.: razão entre 6 rapazes e 9 raparigas = 6/9 = 2/3.\n\n• **Proporção** é a igualdade entre duas razões: a/b = c/d.\n\n**Propriedade fundamental**: o produto dos meios é igual ao produto dos extremos.\n  Se a/b = c/d, então **a × d = b × c**.\n\nÚtil para descobrir um termo desconhecido:\n  3/4 = x/12 → 3 × 12 = 4 × x → x = 36/4 = **9**.`
    },
    'matematica/Proporcionalidade direta': {
        title: 'Proporcionalidade direta',
        body: `Duas grandezas estão em **proporcionalidade direta** quando o quociente entre os valores correspondentes é **constante** (a constante de proporcionalidade, k).\n\nSe y = k × x, então y/x = k.\n\n**Exemplo**: 1 kg de maçãs custa 2 €.\n• 2 kg → 4 € · 3 kg → 6 € · 5 kg → 10 €.\n• Constante: k = 2 (€/kg).\n\nQuando uma duplica, a outra também duplica. O gráfico é uma reta que passa pela origem.`
    },
    'matematica/Áreas de polígonos': {
        title: 'Áreas de polígonos',
        body: `**Fórmulas** (com b = base, h = altura):\n\n• **Paralelogramo**: A = b × h.\n• **Triângulo**: A = (b × h) ÷ 2.\n• **Trapézio**: A = (B + b) × h ÷ 2 (B = base maior, b = base menor).\n• **Retângulo**: A = comprimento × largura.\n• **Quadrado**: A = lado².\n\nA área mede-se em unidades quadradas: cm², m², km².\n• 1 m² = 10 000 cm².`
    },
    'matematica/Áreas e perímetros do círculo': {
        title: 'Áreas e perímetros do círculo',
        body: `Um **círculo** tem raio (r) e diâmetro (d = 2r).\n\n• **Perímetro (comprimento da circunferência)**: P = 2 × π × r = π × d.\n• **Área**: A = π × r².\n\nO valor de **π** é aproximadamente **3,14**.\n\nExemplo: círculo com r = 5 cm.\n• P = 2 × 3,14 × 5 = **31,4 cm**.\n• A = 3,14 × 5² = 3,14 × 25 = **78,5 cm²**.`
    },
    'matematica/Volumes de prismas e cilindros': {
        title: 'Volumes de prismas e cilindros',
        body: `O **volume** de um prisma ou cilindro = **área da base × altura**.\n\n• **Cubo**: V = aresta³.\n• **Paralelepípedo**: V = c × l × h.\n• **Prisma triangular**: V = (área do triângulo) × altura.\n• **Cilindro**: V = π × r² × h.\n\n**Unidades**: cm³, dm³, m³.\n• 1 dm³ = 1 litro.\n• 1 m³ = 1000 litros.`
    },
    'matematica/Estatística': {
        title: 'Estatística: média, mediana, moda',
        body: `Para um conjunto de dados numéricos:\n\n• **Média** = (soma de todos os valores) ÷ (n.º de valores). Ex.: 4,6,8 → (4+6+8)/3 = **6**.\n• **Mediana** = valor do meio depois de ordenar. Se houver dois centrais, a média deles. Ex.: 2,3,**5**,7,9 → mediana = 5.\n• **Moda** = valor que se repete mais vezes. Ex.: 1,2,**3**,**3**,4 → moda = 3.\n\n**Gráficos**: barras, pictogramas, circular (de setores), linhas.`
    },
    'matematica/Isometrias': {
        title: 'Isometrias',
        body: `Uma **isometria** é uma transformação que preserva distâncias e ângulos — a figura imagem é congruente com a original.\n\n• **Reflexão** — espelho num eixo (eixo de simetria).\n• **Rotação** — gira em torno de um ponto (centro), com um certo ângulo.\n• **Translação** — desliza segundo um vetor (direção, sentido e comprimento), sem rodar nem virar.\n\nA composição de isometrias dá outra isometria. Estas operações estão na base dos frisos e dos padrões geométricos.`
    },
    'matematica/Ângulos internos de polígonos': {
        title: 'Ângulos internos de polígonos',
        body: `A **soma dos ângulos internos** de um polígono com n lados é:\n\n  S = (n − 2) × 180°.\n\n• Triângulo (n=3): 1 × 180° = **180°**.\n• Quadrilátero (n=4): 2 × 180° = **360°**.\n• Pentágono (n=5): 3 × 180° = **540°**.\n• Hexágono (n=6): 4 × 180° = **720°**.\n\nNum **polígono regular** (todos os lados e ângulos iguais), cada ângulo interno = S ÷ n.\nEx.: hexágono regular → 720° ÷ 6 = **120°** por ângulo.`
    },

    // ----- Inglês -----
    'ingles/Past simple': {
        title: 'Past simple',
        body: `Used for finished actions in the past.\n\n• **Regular verbs**: add **-ed** → played, watched, lived.\n• **Irregular verbs**: must be memorised → go/went, eat/ate, see/saw, have/had, do/did.\n\n**Negative**: didn't + base verb → *I didn't play.*\n**Question**: Did + subject + base verb → *Did you play?*\n\nTime markers: yesterday, last week, two days ago, in 2010.`
    },
    'ingles/Present continuous': {
        title: 'Present continuous',
        body: `Used for actions happening **now** or around now.\n\n**Form**: subject + **am/is/are** + verb-**ing**.\n• I am eating · She is reading · They are playing.\n\n**Negative**: am not / isn't / aren't + verb-ing.\n**Question**: Am/Is/Are + subject + verb-ing? → *Are you listening?*\n\nTime markers: now, right now, at the moment, today, this week.`
    },
    'ingles/Future': {
        title: 'Future: going to / will',
        body: `• **going to** — for plans and intentions, or predictions based on evidence.\n  *I am going to study tonight. Look at those clouds — it's going to rain.*\n\n• **will** — for spontaneous decisions, promises, predictions/opinions.\n  *I'll help you. It will probably rain tomorrow.*\n\n**Form**:\n• going to: am/is/are + going to + base verb.\n• will: will + base verb (same for all persons).`
    },
    'ingles/Comparatives & superlatives': {
        title: 'Comparatives and superlatives',
        body: `**Short adjectives** (1 syllable): add **-er / -est**.\n• tall → taller → the tallest\n• big → bigger → the biggest (double consonant)\n\n**Long adjectives** (2+ syllables): use **more / the most**.\n• beautiful → more beautiful → the most beautiful\n\n**Irregulars**:\n• good → better → the best\n• bad → worse → the worst\n• far → farther → the farthest\n\nUse **than** with comparatives: *She is taller than me.*`
    },
    'ingles/Daily routines': {
        title: 'Daily routines',
        body: `Common verbs and times of day:\n\n• I **wake up** at 7 a.m.\n• I **have breakfast** at 7:30.\n• I **go to school** at 8.\n• I **have lunch** at 1 p.m.\n• I **do my homework** in the afternoon.\n• I **have dinner** at 8 p.m.\n• I **go to bed** at 10.\n\nUse the **present simple** for routines: *I get up early every day.*`
    },
    'ingles/Health & body': {
        title: 'Health and body',
        body: `**Body parts**: head, hair, eyes, nose, mouth, ears, neck, shoulders, arms, hands, fingers, chest, stomach, back, legs, knees, feet, toes.\n\n**Common health problems**:\n• I have a **headache** / **stomachache** / **toothache** / **backache**.\n• I have a **cold** / a **fever** / a **sore throat** / a **cough**.\n\n**Advice**: You should **rest**, **drink water**, **see a doctor**, **take medicine**.`
    },
    'ingles/Quantifiers': {
        title: 'Quantifiers',
        body: `Used to talk about quantity. Choice depends on **countable** vs **uncountable** nouns.\n\n• **some** — affirmative (countable & uncountable): *I have some apples / some milk.*\n• **any** — negative & questions: *I don't have any sugar. Is there any bread?*\n• **much** — uncountable, mostly negatives/questions: *not much time, how much money?*\n• **many** — countable: *not many friends, how many books?*\n• **a lot of / lots of** — both, in affirmative: *a lot of people, a lot of water.*`
    },
    'ingles/Adverbs of frequency': {
        title: 'Adverbs of frequency',
        body: `Tell us **how often** something happens.\n\n• **always** (100%) · usually · often · sometimes · rarely / seldom · **never** (0%)\n\n**Position**:\n• **Before** the main verb: *I always eat breakfast.*\n• **After** the verb to be: *She is never late.*\n\nQuestion: *How often do you…?* → *I go to the gym **twice a week**.*`
    },

    // ----- Ciências -----
    'ciencias/Sistema digestivo': {
        title: 'Sistema digestivo',
        body: `O sistema digestivo transforma os alimentos em nutrientes que o corpo absorve.\n\n**Trajeto dos alimentos**:\nboca → faringe → esófago → **estômago** → intestino delgado → intestino grosso → ânus.\n\n**Glândulas anexas**: glândulas salivares, **fígado** (produz a bílis), **pâncreas** (produz suco pancreático).\n\n• **Digestão** — alimentos são partidos por enzimas.\n• **Absorção** — nutrientes passam para o sangue (sobretudo no intestino delgado).\n• **Defecação** — eliminação dos resíduos.`
    },
    'ciencias/Sistema circulatório': {
        title: 'Sistema circulatório',
        body: `Transporta sangue, nutrientes, oxigénio e hormonas.\n\n**Constituição**:\n• **Coração** — órgão muscular com 4 cavidades (2 aurículas + 2 ventrículos).\n• **Vasos sanguíneos**: **artérias** (saem do coração), **veias** (entram no coração) e **capilares** (trocas com as células).\n• **Sangue** — glóbulos vermelhos, glóbulos brancos, plaquetas, plasma.\n\n**Circulação dupla**:\n• **Pequena circulação** — coração ↔ pulmões (oxigenação).\n• **Grande circulação** — coração ↔ resto do corpo (distribuição).`
    },
    'ciencias/Sistema respiratório': {
        title: 'Sistema respiratório',
        body: `Permite as trocas gasosas: o corpo recebe **oxigénio (O₂)** e liberta **dióxido de carbono (CO₂)**.\n\n**Trajeto do ar**: fossas nasais → faringe → laringe → **traqueia** → brônquios → bronquíolos → **alvéolos pulmonares**.\n\n**Movimentos respiratórios**:\n• **Inspiração** — diafragma desce, ar entra nos pulmões.\n• **Expiração** — diafragma sobe, ar sai.\n\nNos alvéolos faz-se a **hematose**: o O₂ passa para o sangue e o CO₂ sai.`
    },
    'ciencias/Sistema excretor': {
        title: 'Sistema excretor',
        body: `Elimina os resíduos do organismo.\n\n**Sistema urinário**:\n• **Rins** (2) — filtram o sangue e produzem **urina**.\n• **Ureteres** — levam a urina dos rins à bexiga.\n• **Bexiga** — armazena a urina.\n• **Uretra** — conduz a urina para o exterior.\n\nOutros órgãos excretores:\n• **Pele** — elimina suor (água + sais minerais).\n• **Pulmões** — eliminam CO₂ e vapor de água.`
    },
    'ciencias/Sistema reprodutor': {
        title: 'Sistema reprodutor',
        body: `Permite a reprodução humana.\n\n**Sistema reprodutor masculino**: testículos (produzem espermatozoides), epidídimo, canal deferente, próstata, pénis.\n\n**Sistema reprodutor feminino**: ovários (produzem óvulos), trompas de Falópio, útero, vagina.\n\n**Fecundação**: união de um espermatozoide com um óvulo, normalmente nas trompas. Resulta o **ovo (zigoto)**, que se implanta no útero e se desenvolve durante 9 meses.\n\nNa **puberdade**, o corpo prepara-se para a reprodução (caracteres sexuais secundários).`
    },
    'ciencias/Sistema nervoso': {
        title: 'Sistema nervoso',
        body: `Coordena todas as funções do organismo e permite-nos sentir e reagir.\n\n**Sistema nervoso central (SNC)**:\n• **Encéfalo** — cérebro, cerebelo e bolbo raquidiano (no crânio).\n• **Medula espinal** — dentro da coluna vertebral.\n\n**Sistema nervoso periférico (SNP)**:\n• Nervos que ligam o SNC ao resto do corpo.\n\n**Funções**:\n• Cérebro — pensamento, memória, sentidos.\n• Cerebelo — equilíbrio, coordenação.\n• Bolbo raquidiano — funções vitais (batimento cardíaco, respiração).`
    },
    'ciencias/Microrganismos': {
        title: 'Microrganismos',
        body: `Seres vivos muito pequenos, só visíveis ao **microscópio**.\n\n**Tipos**:\n• **Bactérias** — unicelulares; algumas úteis (iogurte, queijo), outras patogénicas (causam doenças como amigdalite).\n• **Vírus** — não têm células; só se reproduzem dentro de células vivas. Causam gripe, COVID-19, sarampo.\n• **Fungos** — bolores e leveduras; usados no pão e cerveja, mas também causam doenças (pé-de-atleta).\n• **Protozoários** — unicelulares; alguns causam doenças (malária).`
    },
    'ciencias/Saúde e prevenção': {
        title: 'Saúde e prevenção',
        body: `Para mantermos o organismo equilibrado, devemos:\n\n• **Alimentação saudável** — variada, segundo a Roda dos Alimentos; muita água; pouco sal, açúcar e gorduras.\n• **Exercício físico** regular.\n• **Higiene** — lavar as mãos, escovar os dentes, banho diário.\n• **Sono** — 9 a 11 horas para crianças.\n• **Vacinação** — protege contra doenças graves (sarampo, tétano, poliomielite).\n• **Não fumar, não consumir álcool nem drogas**.`
    },

    // ----- HGP -----
    'hgp/Expansão Marítima': {
        title: 'Expansão Marítima',
        body: `Iniciada no séc. XV com a conquista de **Ceuta (1415)**.\n\n**Figuras-chave**:\n• **Infante D. Henrique** — o "Navegador"; impulsionou as viagens da Escola de Sagres.\n• **Bartolomeu Dias** (1488) — dobrou o **Cabo da Boa Esperança** (sul de África).\n• **Vasco da Gama** (1498) — chegou à **Índia** (Calecute) pela via marítima.\n• **Pedro Álvares Cabral** (1500) — chegou ao **Brasil**.\n\nPortugal tornou-se um império marítimo. Trazia especiarias, ouro, escravos. **Tratado de Tordesilhas (1494)** dividiu o mundo entre Portugal e Espanha.`
    },
    'hgp/União Ibérica': {
        title: 'União Ibérica (1580–1640)',
        body: `Em **1578**, **D. Sebastião** desaparece na **Batalha de Alcácer-Quibir** (Marrocos). Sem herdeiro direto.\n\nEm **1580**, **Filipe II de Espanha** (neto de D. Manuel I) reclama o trono, derrota os opositores em **Alcântara** e torna-se **Filipe I de Portugal**.\n\nDurante 60 anos, os reis espanhóis (Filipe I, II e III) reinaram Portugal — **Dinastia Filipina**.\n\nPortugal mantinha as suas leis, moeda e administração, mas era arrastado para guerras de Espanha (perdeu praças em África, Brasil e Oriente).`
    },
    'hgp/Restauração da Independência': {
        title: 'Restauração da Independência (1640)',
        body: `O descontentamento crescia: impostos espanhóis, guerras, perda de territórios.\n\nA **1 de dezembro de 1640**, um grupo de nobres conjurados invade o Paço da Ribeira, em Lisboa. Aclamam o **Duque de Bragança** como rei → **D. João IV**.\n\nInicia-se a **Dinastia de Bragança** (1640–1910).\n\nSeguiu-se a **Guerra da Restauração** (1640–1668): Portugal venceu batalhas como **Montijo (1644)**, **Ameixial (1663)** e **Montes Claros (1665)**. Em **1668**, Espanha reconheceu a independência pelo **Tratado de Lisboa**.`
    },
    'hgp/Iluminismo e Marquês de Pombal': {
        title: 'Iluminismo e Marquês de Pombal',
        body: `O **Iluminismo** (séc. XVIII) defendeu a **razão**, a **ciência** e a **educação** contra o absolutismo cego.\n\nEm Portugal, no reinado de **D. José I** (1750–1777), **Sebastião José de Carvalho e Melo** — o **Marquês de Pombal** — foi primeiro-ministro com poder quase total.\n\n**Reformas**:\n• Reconstruiu **Lisboa após o terramoto de 1755** (Baixa Pombalina).\n• Reformou o ensino e a Universidade de Coimbra.\n• Expulsou os Jesuítas (1759).\n• Criou a Companhia dos Vinhos do Alto Douro (demarcou a primeira região vinícola do mundo).\n• Aboliu a escravatura em Portugal continental (1761).`
    },
    'hgp/Liberalismo': {
        title: 'Liberalismo (1820)',
        body: `Em **24 de agosto de 1820**, no Porto, deu-se a **Revolução Liberal**. Os revolucionários (burguesia, militares) queriam:\n\n• Acabar com o **absolutismo** do rei.\n• Uma **Constituição** que limitasse o poder real.\n• O regresso do rei (D. João VI estava no Brasil desde 1807, com as invasões francesas).\n\nReuniram-se as **Cortes Gerais** que aprovaram a **Constituição de 1822**, a primeira de Portugal. Princípios: separação de poderes, igualdade perante a lei, soberania da Nação.`
    },
    'hgp/Monarquia Constitucional': {
        title: 'Monarquia Constitucional',
        body: `O regime que vigorou de **1820 a 1910**: o rei reinava mas com poderes limitados por uma **Constituição** e por um **parlamento**.\n\n**Marcos**:\n• **Carta Constitucional de 1826** (D. Pedro IV) — substituiu a Constituição de 1822.\n• **Guerras Liberais (1828–1834)** — entre liberais (D. Pedro) e absolutistas (D. Miguel). Vitória dos liberais (Convenção de Évora-Monte, 1834).\n• Reis principais: D. Maria II, D. Pedro V, D. Luís I, D. Carlos I, D. Manuel II.\n• **Regicídio (1908)** — D. Carlos I e o príncipe herdeiro são assassinados em Lisboa.`
    },
    'hgp/1.ª República': {
        title: '1.ª República',
        body: `**Implantação**: a **5 de outubro de 1910**, uma revolução em Lisboa derruba a Monarquia. **D. Manuel II** parte para o exílio. É proclamada a **República**.\n\n**Mudanças**:\n• Nova bandeira (verde e vermelha).\n• Novo hino (A Portuguesa).\n• Separação Igreja/Estado.\n• Voto para os homens alfabetizados.\n\nA 1.ª República (1910–1926) foi muito instável: 8 presidentes, 45 governos, participação na 1.ª Guerra Mundial (1916–18), graves problemas económicos. Terminou com o **Golpe Militar de 28 de maio de 1926**.`
    },
    'hgp/Estado Novo': {
        title: 'Estado Novo (1933–1974)',
        body: `Após o golpe de 1926, vem a Ditadura Militar. Em **1928**, **António de Oliveira Salazar** torna-se ministro das Finanças.\n\nEm **1933** é aprovada a Constituição do **Estado Novo**, com Salazar como Presidente do Conselho. Foi um regime **autoritário**:\n\n• **Censura** prévia à imprensa, livros, filmes.\n• **PIDE** — polícia política que perseguia opositores.\n• **Partido único** (União Nacional).\n• **Mocidade Portuguesa**, **Legião Portuguesa**.\n• **Guerra Colonial (1961–1974)** em Angola, Moçambique e Guiné.\n\nSalazar governou até 1968; sucedeu-lhe **Marcelo Caetano**.`
    },
    'hgp/25 de Abril': {
        title: '25 de Abril de 1974',
        body: `A **Revolução dos Cravos** começou na madrugada de **25 de abril de 1974**. O **Movimento das Forças Armadas (MFA)**, liderado por jovens capitães, derrubou o regime do Estado Novo de forma quase pacífica.\n\n**Senhas**: "E Depois do Adeus" (Paulo de Carvalho) e "Grândola, Vila Morena" (Zeca Afonso).\n\n**Resultado**:\n• Fim da ditadura, fim da censura, fim da PIDE.\n• Fim da Guerra Colonial — independência das colónias africanas (1975).\n• Liberdade de expressão, partidos legalizados, eleições livres.\n\nO **cravo vermelho** tornou-se símbolo da revolução. O **25 de Abril** é feriado nacional (Dia da Liberdade).`
    },
    'hgp/Portugal democrático': {
        title: 'Portugal democrático e a UE',
        body: `Após o 25 de Abril, Portugal tornou-se uma **democracia**.\n\n**Marcos**:\n• **25 de abril de 1975** — primeiras eleições livres (Assembleia Constituinte).\n• **2 de abril de 1976** — entra em vigor a nova **Constituição da República Portuguesa**.\n• **1986** — Portugal **adere à CEE** (atual União Europeia).\n• **1999** — adesão ao **Euro** (entrou em circulação em 2002).\n\nHoje, Portugal é uma **república semipresidencial**: há um **Presidente da República** (chefe de Estado) e um **Primeiro-Ministro** (chefe de governo). O parlamento chama-se **Assembleia da República**.`
    }
};

const EXERCISES_6 = [
    // ========== PORTUGUÊS (25) ==========
    { id:'p6_001', s:'portugues', t:'Texto narrativo', type:'mc', diff:1, q:'Quem conta a história num texto narrativo chama-se:', opts:['personagem','narrador','autor','protagonista'], ans:1, exp:'O narrador é a voz que conta a história, podendo ou não participar nela.' },
    { id:'p6_002', s:'portugues', t:'Texto narrativo', type:'mc', diff:2, q:'Um narrador que participa na ação como personagem está a narrar na...', opts:['1.ª pessoa','2.ª pessoa','3.ª pessoa','pessoa neutra'], ans:0, exp:'Quando o narrador diz "eu" e participa, é narrador na 1.ª pessoa (autodiegético/participante).' },
    { id:'p6_003', s:'portugues', t:'Texto narrativo', type:'tf', diff:1, q:'Numa narrativa, o espaço corresponde ao local onde decorre a ação.', ans:true, exp:'Correto. O espaço é o "onde" da ação (físico, social ou psicológico).' },
    { id:'p6_004', s:'portugues', t:'Texto poético', type:'mc', diff:1, q:'Cada linha de um poema chama-se:', opts:['estrofe','verso','rima','métrica'], ans:1, exp:'Verso = cada linha. Estrofe = conjunto de versos.' },
    { id:'p6_005', s:'portugues', t:'Texto poético', type:'mc', diff:2, q:'Uma estrofe de 4 versos chama-se:', opts:['terceto','quadra','quintilha','sextilha'], ans:1, exp:'Quadra = 4 versos. Terceto = 3, quintilha = 5, sextilha = 6.' },
    { id:'p6_006', s:'portugues', t:'Texto poético', type:'fill', diff:2, q:'Como se chama a estrofe formada por 3 versos? ___', ans:['terceto'], exp:'Terceto = estrofe de 3 versos.' },
    { id:'p6_007', s:'portugues', t:'Texto dramático', type:'mc', diff:2, q:'As indicações ao encenador e aos atores num texto dramático chamam-se:', opts:['falas','didascálias','versos','rubricas musicais'], ans:1, exp:'Didascálias (ou indicações cénicas) descrevem cenário, gestos e entoação.' },
    { id:'p6_008', s:'portugues', t:'Texto dramático', type:'tf', diff:1, q:'O texto dramático é escrito para ser representado em palco.', ans:true, exp:'Correto. O texto dramático destina-se à representação teatral.' },
    { id:'p6_009', s:'portugues', t:'Funções sintáticas', type:'mc', diff:2, q:'Em "A Maria ofereceu um livro ao João", qual é o complemento indireto?', opts:['A Maria','um livro','ao João','ofereceu'], ans:2, exp:'Complemento indireto responde a "a quem?" → "ao João".' },
    { id:'p6_010', s:'portugues', t:'Funções sintáticas', type:'mc', diff:2, q:'Em "O bolo está delicioso", "delicioso" desempenha a função de:', opts:['complemento direto','sujeito','predicativo do sujeito','modificador'], ans:2, exp:'Após o verbo copulativo "estar", o adjetivo é predicativo do sujeito (qualifica "o bolo").' },
    { id:'p6_011', s:'portugues', t:'Funções sintáticas', type:'mc', diff:3, q:'Em "Ontem, o Pedro comprou pão na padaria", "Ontem" e "na padaria" são:', opts:['complementos diretos','complementos indiretos','modificadores','predicativos'], ans:2, exp:'Indicam tempo e lugar e podem ser retirados sem alterar o sentido essencial → modificadores.' },
    { id:'p6_012', s:'portugues', t:'Modos verbais', type:'mc', diff:2, q:'A forma "estuda!" (ordem) está no modo:', opts:['indicativo','conjuntivo','imperativo','infinitivo'], ans:2, exp:'O imperativo dá ordens, conselhos ou pedidos.' },
    { id:'p6_013', s:'portugues', t:'Modos verbais', type:'mc', diff:2, q:'Em "Talvez ele venha amanhã", o verbo "venha" está no modo:', opts:['indicativo','conjuntivo','imperativo','condicional'], ans:1, exp:'O conjuntivo exprime dúvida, possibilidade ou desejo. "Talvez" pede conjuntivo.' },
    { id:'p6_014', s:'portugues', t:'Tempos compostos', type:'mc', diff:2, q:'A forma "tinha estudado" é um tempo composto chamado:', opts:['pretérito perfeito composto','pretérito mais-que-perfeito composto','futuro composto','condicional composto'], ans:1, exp:'"Tinha" + particípio = pretérito mais-que-perfeito composto (ação anterior a outra passada).' },
    { id:'p6_015', s:'portugues', t:'Tempos compostos', type:'fill', diff:2, q:'Forma o pretérito perfeito composto de "ler" na 1.ª pessoa do singular: "Eu ___ ___."', ans:['tenho lido'], exp:'Tempo composto = ter (presente) + particípio. Eu tenho lido.' },
    { id:'p6_016', s:'portugues', t:'Discurso direto e indireto', type:'mc', diff:2, q:'Passa para discurso indireto: O João disse: "Estou cansado."', opts:['O João disse que está cansado.','O João disse que estava cansado.','O João dizia: estou cansado.','O João disse para estar cansado.'], ans:1, exp:'No indireto, o presente passa a imperfeito: "estou" → "estava".' },
    { id:'p6_017', s:'portugues', t:'Discurso direto e indireto', type:'tf', diff:1, q:'No discurso direto, as falas das personagens são introduzidas por travessão ou aspas.', ans:true, exp:'Correto. Travessão (—) ou aspas ("...") introduzem as falas no discurso direto.' },
    { id:'p6_018', s:'portugues', t:'Recursos expressivos', type:'mc', diff:2, q:'"Os seus olhos são duas estrelas" é um exemplo de:', opts:['comparação','metáfora','personificação','hipérbole'], ans:1, exp:'Identificação direta sem "como" → metáfora.' },
    { id:'p6_019', s:'portugues', t:'Recursos expressivos', type:'mc', diff:2, q:'"Já te disse mil vezes!" é um exemplo de:', opts:['metáfora','hipérbole','anáfora','aliteração'], ans:1, exp:'Hipérbole = exagero intencional para reforçar uma ideia.' },
    { id:'p6_020', s:'portugues', t:'Recursos expressivos', type:'mc', diff:3, q:'"O rato roeu a rolha do rei da Rússia" é um exemplo de:', opts:['anáfora','aliteração','enumeração','personificação'], ans:1, exp:'Aliteração = repetição do mesmo som consonântico (aqui, o "r").' },
    { id:'p6_021', s:'portugues', t:'Acentuação gráfica', type:'mc', diff:2, q:'A palavra "médico" é:', opts:['aguda','grave','esdrúxula','átona'], ans:2, exp:'Tónica na antepenúltima sílaba (MÉ-di-co) → esdrúxula. Acentuam-se sempre.' },
    { id:'p6_022', s:'portugues', t:'Acentuação gráfica', type:'mc', diff:2, q:'A palavra "café" é:', opts:['aguda','grave','esdrúxula','sobresdrúxula'], ans:0, exp:'Tónica na última sílaba (ca-FÉ) → aguda.' },
    { id:'p6_023', s:'portugues', t:'Acentuação gráfica', type:'tf', diff:2, q:'Todas as palavras esdrúxulas levam acento gráfico.', ans:true, exp:'Correto. Por regra, todas as proparoxítonas (esdrúxulas) são acentuadas (árvore, sílaba, médico).' },
    { id:'p6_024', s:'portugues', t:'Orações coordenadas e subordinadas', type:'mc', diff:2, q:'Em "Estudei muito, mas não passei no teste", as orações são:', opts:['coordenadas','subordinadas','simples','reduzidas'], ans:0, exp:'"Mas" é uma conjunção coordenativa adversativa → orações coordenadas.' },
    { id:'p6_025', s:'portugues', t:'Orações coordenadas e subordinadas', type:'mc', diff:3, q:'Em "Não fui à praia porque estava a chover", a oração "porque estava a chover" é:', opts:['coordenada','subordinada','principal','independente'], ans:1, exp:'"Porque" introduz uma oração subordinada (causal) que depende da principal.' },

    // ========== MATEMÁTICA (25) ==========
    { id:'m6_001', s:'matematica', t:'Números racionais não negativos', type:'fill', diff:1, q:'Escreve 3/4 na forma decimal: ___', ans:['0,75','0.75'], exp:'3 ÷ 4 = 0,75.' },
    { id:'m6_002', s:'matematica', t:'Números racionais não negativos', type:'mc', diff:1, q:'A que percentagem corresponde a fração 1/4?', opts:['10%','25%','40%','75%'], ans:1, exp:'1/4 = 0,25 = 25%.' },
    { id:'m6_003', s:'matematica', t:'Números racionais não negativos', type:'fill', diff:2, q:'Escreve 0,6 na forma de fração irredutível: ___', ans:['3/5'], exp:'0,6 = 6/10 = 3/5 (dividindo por 2).' },
    { id:'m6_004', s:'matematica', t:'Operações com frações', type:'fill', diff:2, q:'1/2 + 1/3 = ___ (fração irredutível)', ans:['5/6'], exp:'Reduz ao mesmo denominador: 3/6 + 2/6 = 5/6.' },
    { id:'m6_005', s:'matematica', t:'Operações com frações', type:'fill', diff:2, q:'2/3 × 3/4 = ___ (irredutível)', ans:['1/2'], exp:'2×3/(3×4) = 6/12 = 1/2.' },
    { id:'m6_006', s:'matematica', t:'Operações com frações', type:'mc', diff:3, q:'Quanto é 3/4 ÷ 1/2?', opts:['3/8','1/2','3/2','6/4'], ans:2, exp:'Dividir é multiplicar pelo inverso: 3/4 × 2/1 = 6/4 = 3/2.' },
    { id:'m6_007', s:'matematica', t:'Potências de expoente natural', type:'fill', diff:1, q:'Calcula 2⁴ = ___', ans:['16'], exp:'2 × 2 × 2 × 2 = 16.' },
    { id:'m6_008', s:'matematica', t:'Potências de expoente natural', type:'mc', diff:2, q:'Quanto é 5⁰?', opts:['0','1','5','indefinido'], ans:1, exp:'Qualquer número (≠ 0) elevado a 0 é igual a 1.' },
    { id:'m6_009', s:'matematica', t:'Potências de expoente natural', type:'fill', diff:2, q:'Simplifica e calcula: 2² × 2³ = ___', ans:['32'], exp:'Mesma base: somam-se expoentes. 2^(2+3) = 2⁵ = 32.' },
    { id:'m6_010', s:'matematica', t:'Sequências e regularidades', type:'fill', diff:2, q:'Sequência 3, 6, 9, 12, ... Qual é o 6.º termo?', ans:['18'], exp:'Múltiplos de 3: termo n é 3n. 6.º termo = 3 × 6 = 18.' },
    { id:'m6_011', s:'matematica', t:'Sequências e regularidades', type:'mc', diff:3, q:'Qual é o termo geral da sequência 5, 8, 11, 14, ...?', opts:['n + 5','3n','3n + 2','5n'], ans:2, exp:'Diferença constante 3 → 3n + algo. Para n=1: 3+2=5. Para n=2: 6+2=8. Confirma.' },
    { id:'m6_012', s:'matematica', t:'Razões e proporções', type:'fill', diff:2, q:'Resolve a proporção: 3/4 = x/12. x = ___', ans:['9'], exp:'Produto cruzado: 3×12 = 4x → 36 = 4x → x = 9.' },
    { id:'m6_013', s:'matematica', t:'Razões e proporções', type:'mc', diff:2, q:'Numa turma há 10 rapazes e 15 raparigas. Qual é a razão de rapazes para raparigas?', opts:['1/2','2/3','3/2','2/5'], ans:1, exp:'10/15 = 2/3 (simplificando por 5).' },
    { id:'m6_014', s:'matematica', t:'Proporcionalidade direta', type:'fill', diff:2, q:'Se 1 kg de maçãs custa 2€, quanto custam 4,5 kg? ___ €', ans:['9','9€','9 euros'], exp:'Constante k = 2 €/kg. 4,5 × 2 = 9 €.' },
    { id:'m6_015', s:'matematica', t:'Proporcionalidade direta', type:'tf', diff:2, q:'Se duas grandezas são diretamente proporcionais, quando uma duplica, a outra também duplica.', ans:true, exp:'Correto. y = k·x: se x duplicar, y também duplica.' },
    { id:'m6_016', s:'matematica', t:'Áreas de polígonos', type:'fill', diff:2, q:'Área de um triângulo com base 8 cm e altura 5 cm: ___ cm²', ans:['20'], exp:'A = (b × h) ÷ 2 = (8 × 5) ÷ 2 = 40 ÷ 2 = 20 cm².' },
    { id:'m6_017', s:'matematica', t:'Áreas de polígonos', type:'fill', diff:2, q:'Área de um trapézio com base maior 10 cm, base menor 6 cm e altura 4 cm: ___ cm²', ans:['32'], exp:'A = (B + b) × h ÷ 2 = (10 + 6) × 4 ÷ 2 = 64 ÷ 2 = 32 cm².' },
    { id:'m6_018', s:'matematica', t:'Áreas e perímetros do círculo', type:'fill', diff:2, q:'Perímetro de um círculo com raio 5 cm (π = 3,14): ___ cm', ans:['31,4','31.4'], exp:'P = 2 × π × r = 2 × 3,14 × 5 = 31,4 cm.' },
    { id:'m6_019', s:'matematica', t:'Áreas e perímetros do círculo', type:'fill', diff:3, q:'Área de um círculo com raio 10 cm (π = 3,14): ___ cm²', ans:['314'], exp:'A = π × r² = 3,14 × 100 = 314 cm².' },
    { id:'m6_020', s:'matematica', t:'Volumes de prismas e cilindros', type:'fill', diff:2, q:'Volume de um paralelepípedo de 4 cm × 3 cm × 5 cm: ___ cm³', ans:['60'], exp:'V = c × l × h = 4 × 3 × 5 = 60 cm³.' },
    { id:'m6_021', s:'matematica', t:'Volumes de prismas e cilindros', type:'mc', diff:3, q:'Quantos litros tem 1 m³?', opts:['10','100','1000','10000'], ans:2, exp:'1 m³ = 1000 dm³ = 1000 litros.' },
    { id:'m6_022', s:'matematica', t:'Estatística', type:'fill', diff:2, q:'Calcula a média de: 4, 6, 8, 10, 12. Média = ___', ans:['8'], exp:'(4+6+8+10+12) ÷ 5 = 40 ÷ 5 = 8.' },
    { id:'m6_023', s:'matematica', t:'Estatística', type:'fill', diff:2, q:'Qual é a moda do conjunto: 2, 3, 5, 5, 7, 8? Moda = ___', ans:['5'], exp:'A moda é o valor mais frequente. O 5 aparece 2 vezes.' },
    { id:'m6_024', s:'matematica', t:'Isometrias', type:'mc', diff:2, q:'A isometria que desliza uma figura segundo uma direção, sem rodar nem virar, chama-se:', opts:['reflexão','rotação','translação','homotetia'], ans:2, exp:'Translação = movimento segundo um vetor (direção, sentido e comprimento).' },
    { id:'m6_025', s:'matematica', t:'Ângulos internos de polígonos', type:'fill', diff:2, q:'Soma dos ângulos internos de um pentágono: ___°', ans:['540'], exp:'S = (n−2) × 180° = (5−2) × 180° = 540°.' },

    // ========== INGLÊS (15) ==========
    { id:'i6_001', s:'ingles', t:'Past simple', type:'mc', diff:1, q:'What is the past simple of "go"?', opts:['goed','went','gone','going'], ans:1, exp:'"Go" is irregular: go → went → gone.' },
    { id:'i6_002', s:'ingles', t:'Past simple', type:'fill', diff:2, q:'Complete: "Yesterday, I ___ (watch) a film."', ans:['watched'], exp:'Regular verb + -ed: watched.' },
    { id:'i6_003', s:'ingles', t:'Past simple', type:'mc', diff:2, q:'Choose the correct sentence:', opts:['She didn\'t went home.','She didn\'t go home.','She not went home.','She no go home.'], ans:1, exp:'After "didn\'t" the verb stays in the base form: didn\'t go.' },
    { id:'i6_004', s:'ingles', t:'Present continuous', type:'fill', diff:1, q:'Complete: "Look! It ___ (rain)."', ans:['is raining'], exp:'Action happening now → present continuous: is + raining.' },
    { id:'i6_005', s:'ingles', t:'Present continuous', type:'mc', diff:2, q:'Which sentence is correct?', opts:['They are play football now.','They playing football now.','They are playing football now.','They plays football now.'], ans:2, exp:'Present continuous: are + verb-ing.' },
    { id:'i6_006', s:'ingles', t:'Future', type:'mc', diff:2, q:'Choose the best option: "Look at those clouds! It ___ rain."', opts:['will','is going to','goes to','rains'], ans:1, exp:'Prediction with visible evidence → "is going to".' },
    { id:'i6_007', s:'ingles', t:'Future', type:'fill', diff:2, q:'Complete with "will": "Don\'t worry, I ___ help you."', ans:['will'], exp:'Spontaneous decision/offer → "will".' },
    { id:'i6_008', s:'ingles', t:'Comparatives & superlatives', type:'mc', diff:1, q:'What is the comparative of "tall"?', opts:['more tall','taller','tallest','tallier'], ans:1, exp:'Short adjective: add -er → taller.' },
    { id:'i6_009', s:'ingles', t:'Comparatives & superlatives', type:'fill', diff:2, q:'Complete with the superlative: "Mount Everest is the ___ (high) mountain in the world."', ans:['highest'], exp:'Short adjective: the + adjective + -est → the highest.' },
    { id:'i6_010', s:'ingles', t:'Comparatives & superlatives', type:'mc', diff:2, q:'What is the comparative of "good"?', opts:['gooder','more good','better','best'], ans:2, exp:'Irregular: good → better → the best.' },
    { id:'i6_011', s:'ingles', t:'Daily routines', type:'mc', diff:1, q:'Which verb completes the sentence? "I ___ breakfast at 8 a.m."', opts:['do','have','make','take'], ans:1, exp:'"Have breakfast/lunch/dinner" is the standard collocation.' },
    { id:'i6_012', s:'ingles', t:'Health & body', type:'mc', diff:1, q:'If your head hurts, you have a:', opts:['stomachache','toothache','headache','backache'], ans:2, exp:'Headache = pain in the head.' },
    { id:'i6_013', s:'ingles', t:'Quantifiers', type:'mc', diff:2, q:'Choose the correct quantifier: "How ___ apples do you want?"', opts:['much','many','any','a lot'], ans:1, exp:'"Apples" is countable → "how many".' },
    { id:'i6_014', s:'ingles', t:'Quantifiers', type:'mc', diff:2, q:'Complete: "There isn\'t ___ milk in the fridge."', opts:['some','many','any','a lot'], ans:2, exp:'Negative sentence + uncountable → "any".' },
    { id:'i6_015', s:'ingles', t:'Adverbs of frequency', type:'mc', diff:2, q:'Where does the adverb go? "She ___ late." (never)', opts:['She never is late.','She is never late.','Never she is late.','She is late never.'], ans:1, exp:'Adverbs of frequency go AFTER the verb to be: She is never late.' },

    // ========== CIÊNCIAS (15) ==========
    { id:'c6_001', s:'ciencias', t:'Sistema digestivo', type:'mc', diff:1, q:'Onde se inicia a digestão dos alimentos?', opts:['no estômago','na boca','no intestino delgado','no esófago'], ans:1, exp:'Na boca, com a mastigação e a saliva (digestão mecânica e química).' },
    { id:'c6_002', s:'ciencias', t:'Sistema digestivo', type:'mc', diff:2, q:'Em que órgão se faz a maior parte da absorção dos nutrientes?', opts:['estômago','intestino delgado','intestino grosso','fígado'], ans:1, exp:'O intestino delgado tem vilosidades que absorvem os nutrientes para o sangue.' },
    { id:'c6_003', s:'ciencias', t:'Sistema circulatório', type:'mc', diff:1, q:'Quantas cavidades tem o coração humano?', opts:['2','3','4','5'], ans:2, exp:'O coração tem 4 cavidades: 2 aurículas (em cima) e 2 ventrículos (em baixo).' },
    { id:'c6_004', s:'ciencias', t:'Sistema circulatório', type:'mc', diff:2, q:'Os vasos sanguíneos que saem do coração chamam-se:', opts:['veias','artérias','capilares','nervos'], ans:1, exp:'Artérias levam sangue para fora do coração; veias trazem-no de volta.' },
    { id:'c6_005', s:'ciencias', t:'Sistema respiratório', type:'mc', diff:2, q:'As trocas gasosas (hematose) acontecem nos:', opts:['brônquios','alvéolos pulmonares','traqueia','fossas nasais'], ans:1, exp:'Nos alvéolos, o O₂ passa para o sangue e o CO₂ sai do sangue para o ar.' },
    { id:'c6_006', s:'ciencias', t:'Sistema respiratório', type:'tf', diff:1, q:'Na inspiração, o diafragma desce e o ar entra nos pulmões.', ans:true, exp:'Correto. O diafragma desce, aumenta o volume da caixa torácica e o ar entra.' },
    { id:'c6_007', s:'ciencias', t:'Sistema excretor', type:'mc', diff:1, q:'Os órgãos que filtram o sangue e produzem urina chamam-se:', opts:['fígado','rins','baço','pâncreas'], ans:1, exp:'Os rins filtram o sangue e produzem urina, que é eliminada pela uretra.' },
    { id:'c6_008', s:'ciencias', t:'Sistema reprodutor', type:'mc', diff:2, q:'A união do espermatozoide com o óvulo chama-se:', opts:['ovulação','menstruação','fecundação','nidação'], ans:2, exp:'Fecundação = união das células sexuais. Forma o ovo (zigoto).' },
    { id:'c6_009', s:'ciencias', t:'Sistema reprodutor', type:'fill', diff:2, q:'Quanto tempo dura aproximadamente a gravidez humana? ___ meses', ans:['9','nove'], exp:'A gestação humana dura cerca de 9 meses (40 semanas).' },
    { id:'c6_010', s:'ciencias', t:'Sistema nervoso', type:'mc', diff:2, q:'Que parte do encéfalo é responsável pelo equilíbrio e coordenação dos movimentos?', opts:['cérebro','cerebelo','bolbo raquidiano','medula espinal'], ans:1, exp:'O cerebelo coordena os movimentos e mantém o equilíbrio.' },
    { id:'c6_011', s:'ciencias', t:'Sistema nervoso', type:'tf', diff:2, q:'A medula espinal faz parte do sistema nervoso central.', ans:true, exp:'Correto. O SNC é constituído pelo encéfalo (cérebro, cerebelo, bolbo) e pela medula espinal.' },
    { id:'c6_012', s:'ciencias', t:'Microrganismos', type:'mc', diff:2, q:'Qual destes microrganismos NÃO tem células?', opts:['bactéria','vírus','fungo','protozoário'], ans:1, exp:'Os vírus não têm células — só se reproduzem dentro de células vivas.' },
    { id:'c6_013', s:'ciencias', t:'Microrganismos', type:'mc', diff:1, q:'Que microrganismos são usados para fazer iogurte?', opts:['vírus','bactérias','fungos venenosos','algas'], ans:1, exp:'O iogurte é produzido por bactérias (lactobacilos) que fermentam o leite.' },
    { id:'c6_014', s:'ciencias', t:'Saúde e prevenção', type:'tf', diff:1, q:'A vacinação ajuda a proteger contra doenças graves.', ans:true, exp:'Correto. As vacinas estimulam o sistema imunitário a produzir defesas.' },
    { id:'c6_015', s:'ciencias', t:'Saúde e prevenção', type:'mc', diff:2, q:'Qual destes hábitos NÃO faz parte de uma vida saudável?', opts:['dormir 9 horas','fazer exercício','beber muita água','fumar tabaco'], ans:3, exp:'Fumar prejudica gravemente os pulmões, o coração e muitos outros órgãos.' },

    // ========== HGP (20) ==========
    { id:'h6_001', s:'hgp', t:'Expansão Marítima', type:'mc', diff:1, q:'Em que ano os portugueses conquistaram Ceuta, dando início à Expansão?', opts:['1385','1415','1488','1500'], ans:1, exp:'A conquista de Ceuta em 1415 marca o início da Expansão Marítima portuguesa.' },
    { id:'h6_002', s:'hgp', t:'Expansão Marítima', type:'mc', diff:1, q:'Quem dobrou o Cabo da Boa Esperança em 1488?', opts:['Vasco da Gama','Bartolomeu Dias','Pedro Álvares Cabral','Fernão de Magalhães'], ans:1, exp:'Bartolomeu Dias dobrou o Cabo da Boa Esperança em 1488, abrindo caminho para a Índia.' },
    { id:'h6_003', s:'hgp', t:'Expansão Marítima', type:'fill', diff:2, q:'Em que ano Vasco da Gama chegou à Índia? ___', ans:['1498'], exp:'Vasco da Gama chegou a Calecute, na Índia, em maio de 1498.' },
    { id:'h6_004', s:'hgp', t:'Expansão Marítima', type:'mc', diff:1, q:'Quem chegou ao Brasil em 1500?', opts:['Vasco da Gama','Bartolomeu Dias','Pedro Álvares Cabral','D. Henrique'], ans:2, exp:'Pedro Álvares Cabral chegou ao Brasil a 22 de abril de 1500.' },
    { id:'h6_005', s:'hgp', t:'União Ibérica', type:'mc', diff:2, q:'A União Ibérica começou em 1580 e terminou em:', opts:['1620','1640','1668','1700'], ans:1, exp:'A Restauração da Independência ocorreu a 1 de dezembro de 1640, terminando a União Ibérica.' },
    { id:'h6_006', s:'hgp', t:'União Ibérica', type:'mc', diff:2, q:'O primeiro rei espanhol de Portugal, em 1580, foi:', opts:['Filipe I (II de Espanha)','Filipe II (III de Espanha)','Carlos V','D. Sebastião'], ans:0, exp:'Filipe II de Espanha tornou-se Filipe I de Portugal em 1580.' },
    { id:'h6_007', s:'hgp', t:'Restauração da Independência', type:'fill', diff:1, q:'Em que ano se deu a Restauração da Independência? ___', ans:['1640'], exp:'A 1 de dezembro de 1640, Portugal restaurou a sua independência.' },
    { id:'h6_008', s:'hgp', t:'Restauração da Independência', type:'mc', diff:2, q:'Quem foi aclamado rei na Restauração de 1640?', opts:['D. João III','D. João IV','D. José I','D. Pedro II'], ans:1, exp:'O Duque de Bragança foi aclamado como D. João IV, iniciando a Dinastia de Bragança.' },
    { id:'h6_009', s:'hgp', t:'Iluminismo e Marquês de Pombal', type:'mc', diff:2, q:'O Marquês de Pombal foi primeiro-ministro no reinado de:', opts:['D. João V','D. José I','D. Maria I','D. João VI'], ans:1, exp:'O Marquês de Pombal governou no reinado de D. José I (1750–1777).' },
    { id:'h6_010', s:'hgp', t:'Iluminismo e Marquês de Pombal', type:'mc', diff:2, q:'O Marquês de Pombal ficou famoso por reconstruir Lisboa após o terramoto de:', opts:['1640','1755','1820','1910'], ans:1, exp:'O grande terramoto de Lisboa foi a 1 de novembro de 1755. A Baixa Pombalina é o resultado da reconstrução.' },
    { id:'h6_011', s:'hgp', t:'Liberalismo', type:'mc', diff:2, q:'A Revolução Liberal de 1820 começou em que cidade?', opts:['Lisboa','Porto','Coimbra','Braga'], ans:1, exp:'A Revolução Liberal começou no Porto a 24 de agosto de 1820.' },
    { id:'h6_012', s:'hgp', t:'Liberalismo', type:'fill', diff:2, q:'Em que ano foi aprovada a primeira Constituição portuguesa? ___', ans:['1822'], exp:'A primeira Constituição portuguesa foi aprovada em 1822, depois da Revolução Liberal de 1820.' },
    { id:'h6_013', s:'hgp', t:'Monarquia Constitucional', type:'tf', diff:2, q:'Na Monarquia Constitucional, o poder do rei era limitado por uma Constituição.', ans:true, exp:'Correto. Ao contrário do absolutismo, a Constituição limitava o poder real e existia um parlamento.' },
    { id:'h6_014', s:'hgp', t:'1.ª República', type:'fill', diff:1, q:'Em que data foi proclamada a 1.ª República? (dia/mês/ano)', ans:['5 de outubro de 1910','5/10/1910','05/10/1910','5-10-1910'], exp:'A 1.ª República foi proclamada a 5 de outubro de 1910, em Lisboa.' },
    { id:'h6_015', s:'hgp', t:'1.ª República', type:'mc', diff:2, q:'Qual foi o último rei de Portugal, exilado em 1910?', opts:['D. Carlos I','D. Manuel II','D. Luís I','D. Pedro V'], ans:1, exp:'D. Manuel II foi o último rei; partiu para o exílio em 1910 após a implantação da República.' },
    { id:'h6_016', s:'hgp', t:'Estado Novo', type:'mc', diff:2, q:'Quem foi o líder do Estado Novo de 1933 até 1968?', opts:['Marcelo Caetano','Óscar Carmona','António de Oliveira Salazar','Humberto Delgado'], ans:2, exp:'Salazar liderou o Estado Novo desde 1933 até 1968 (sucedeu-lhe Marcelo Caetano).' },
    { id:'h6_017', s:'hgp', t:'Estado Novo', type:'tf', diff:2, q:'Durante o Estado Novo havia censura à imprensa e uma polícia política chamada PIDE.', ans:true, exp:'Correto. O Estado Novo era um regime autoritário com censura e perseguição política através da PIDE.' },
    { id:'h6_018', s:'hgp', t:'25 de Abril', type:'fill', diff:1, q:'Em que ano ocorreu a Revolução dos Cravos? ___', ans:['1974'], exp:'A 25 de abril de 1974 o MFA derrubou o Estado Novo, na chamada Revolução dos Cravos.' },
    { id:'h6_019', s:'hgp', t:'25 de Abril', type:'mc', diff:2, q:'Que canção foi a senha da revolução, na madrugada de 25 de abril?', opts:['A Portuguesa','Grândola, Vila Morena','Uma Casa Portuguesa','Verdes Anos'], ans:1, exp:'"Grândola, Vila Morena", de Zeca Afonso, foi a segunda senha que confirmou o início da revolução.' },
    { id:'h6_020', s:'hgp', t:'Portugal democrático', type:'fill', diff:2, q:'Em que ano Portugal aderiu à CEE (atual União Europeia)? ___', ans:['1986'], exp:'Portugal aderiu à CEE a 1 de janeiro de 1986.' }
];

const CURRICULUM_6 = {
    portugues: [
        'Texto narrativo',
        'Texto poético',
        'Texto dramático',
        'Funções sintáticas',
        'Modos verbais',
        'Tempos compostos',
        'Discurso direto e indireto',
        'Recursos expressivos',
        'Acentuação gráfica',
        'Orações coordenadas e subordinadas'
    ],
    matematica: [
        'Números racionais não negativos',
        'Operações com frações',
        'Potências de expoente natural',
        'Sequências e regularidades',
        'Razões e proporções',
        'Proporcionalidade direta',
        'Áreas de polígonos',
        'Áreas e perímetros do círculo',
        'Volumes de prismas e cilindros',
        'Estatística',
        'Isometrias',
        'Ângulos internos de polígonos'
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
        'Sistema digestivo',
        'Sistema circulatório',
        'Sistema respiratório',
        'Sistema excretor',
        'Sistema reprodutor',
        'Sistema nervoso',
        'Microrganismos',
        'Saúde e prevenção'
    ],
    hgp: [
        'Expansão Marítima',
        'União Ibérica',
        'Restauração da Independência',
        'Iluminismo e Marquês de Pombal',
        'Liberalismo',
        'Monarquia Constitucional',
        '1.ª República',
        'Estado Novo',
        '25 de Abril',
        'Portugal democrático'
    ]
};

const PERIODS_6 = {
    portugues:  { 'Texto narrativo':1, 'Texto poético':1, 'Texto dramático':1, 'Funções sintáticas':2, 'Modos verbais':2, 'Tempos compostos':2, 'Discurso direto e indireto':2, 'Recursos expressivos':3, 'Acentuação gráfica':3, 'Orações coordenadas e subordinadas':3 },
    matematica: { 'Números racionais não negativos':1, 'Operações com frações':1, 'Potências de expoente natural':1, 'Sequências e regularidades':1, 'Razões e proporções':2, 'Proporcionalidade direta':2, 'Áreas de polígonos':2, 'Áreas e perímetros do círculo':2, 'Volumes de prismas e cilindros':3, 'Estatística':3, 'Isometrias':3, 'Ângulos internos de polígonos':3 },
    ingles:     { 'Past simple':1, 'Present continuous':1, 'Future':2, 'Comparatives & superlatives':2, 'Daily routines':2, 'Health & body':3, 'Quantifiers':3, 'Adverbs of frequency':3 },
    ciencias:   { 'Sistema digestivo':1, 'Sistema circulatório':1, 'Sistema respiratório':1, 'Sistema excretor':2, 'Sistema reprodutor':2, 'Sistema nervoso':2, 'Microrganismos':3, 'Saúde e prevenção':3 },
    hgp:        { 'Expansão Marítima':1, 'União Ibérica':1, 'Restauração da Independência':1, 'Iluminismo e Marquês de Pombal':2, 'Liberalismo':2, 'Monarquia Constitucional':2, '1.ª República':2, 'Estado Novo':3, '25 de Abril':3, 'Portugal democrático':3 }
};

// ============================================================
// =============== EXPORTS / SELECTOR DE ANO ==================
// ============================================================
const PERIODS_5 = {
    matematica:  { 'Números naturais':1, 'Divisibilidade':1, 'Números primos':1, 'MMC/MDC':1, 'Potências':1, 'Operações':1, 'Frações':2, 'Dízimas':2, 'Percentagens':2, 'Sequências':2, 'Ângulos':2, 'Retas':2, 'Triângulos':3, 'Quadriláteros':3, 'Perímetros':3, 'Áreas':3, 'Volume':3, 'Estatística':3 },
    portugues:   { 'Ortografia':1, 'Classes de palavras':1, 'Determinantes':1, 'Pronomes':2, 'Verbos':2, 'Funções sintáticas':2, 'Pontuação':2, 'Plurais':3, 'Recursos expressivos':3, 'Tipos de texto':3 },
    ingles:      { 'Greetings':1, 'Numbers':1, 'Days':1, 'Months':1, 'Family':1, 'School':2, 'Colors':2, 'Articles':2, 'Verb to be':2, 'Plurals':3, 'Present simple':3, 'Prepositions':3, 'Questions':3 },
    ciencias:    { 'Seres vivos':1, 'Classificação':1, 'Vertebrados':1, 'Anfíbios':1, 'Aves':1, 'Invertebrados':1, 'Revestimento':2, 'Alimentação':2, 'Reprodução':2, 'Cadeia alimentar':2, 'Ecossistema':2, 'Habitat':2, 'Plantas':3, 'Água':3, 'Solo':3, 'Rochas':3 },
    hgp:         { 'Localização':1, 'Fronteiras':1, 'Continentes':1, 'Oceanos':1, 'Europa':1, 'Pontos cardeais':1, 'Distritos':1, 'Capitais':1, 'Rios':2, 'Relevo':2, 'Montanha':2, 'Ilhas':2, 'Clima':2, 'Pré-história':2, 'Romanos':2, 'Bárbaros':2, 'Muçulmanos':3, 'Reconquista':3, 'Fundação':3, 'Lisboa':3, 'Batalhas':3, 'Reis':3, 'Cultura':3, 'Símbolos':3, 'Dinastias':3, 'Ordem cronológica':3 }
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
        'Quociente de reacção e princípio de Le Châtelier',
        'Equilíbrio ácido-base — pH e Kw',
        'Ácidos e bases fortes e fracos — Ka e Kb',
        'Soluções tampão e titulações ácido-base',
        'Solubilidade e produto de solubilidade (Ks)',
        'Equilíbrio de oxidação-redução',
        'Pilhas e potenciais de eléctrodo'
    ]
};

const PERIODS_11 = {
    quimica: {
        'Equilíbrio químico — conceito e Kc': 1,
        'Quociente de reacção e princípio de Le Châtelier': 1,
        'Equilíbrio ácido-base — pH e Kw': 2,
        'Ácidos e bases fortes e fracos — Ka e Kb': 2,
        'Soluções tampão e titulações ácido-base': 2,
        'Solubilidade e produto de solubilidade (Ks)': 3,
        'Equilíbrio de oxidação-redução': 3,
        'Pilhas e potenciais de eléctrodo': 3
    }
};

const LESSONS_11 = {
    'quimica/Equilíbrio químico — conceito e Kc': {
        title: 'Equilíbrio químico e constante Kc',
        body: `Numa **reacção reversível** aA + bB ⇌ cC + dD, atingido o equilíbrio, as concentrações deixam de variar.\n\n**Constante de equilíbrio Kc** (em termos de concentração):\n   Kc = [C]^c · [D]^d / ([A]^a · [B]^b)\n\n**Notas importantes:**\n• Sólidos puros e líquidos puros NÃO entram na expressão de Kc.\n• Kc depende apenas da TEMPERATURA.\n• Kc grande (>>1) → equilíbrio favorece produtos.\n• Kc pequeno (<<1) → equilíbrio favorece reagentes.\n• A constante da reacção inversa é 1/Kc.\n• Se a equação for multiplicada por n, Kc passa a Kc^n.`
    },
    'quimica/Quociente de reacção e princípio de Le Châtelier': {
        title: 'Quociente Qc e princípio de Le Châtelier',
        body: `**Quociente de reacção Qc**: tem a mesma forma de Kc mas com concentrações em qualquer instante (não necessariamente em equilíbrio).\n\n**Comparação Qc vs Kc:**\n• Qc < Kc → reacção evolui no sentido directo (forma mais produtos)\n• Qc > Kc → reacção evolui no sentido inverso (forma mais reagentes)\n• Qc = Kc → sistema em equilíbrio\n\n**Princípio de Le Châtelier**: quando uma perturbação é imposta a um sistema em equilíbrio, este evolui no sentido que CONTRARIA essa perturbação.\n\n**Efeitos:**\n• Aumentar [reagente] → desloca para produtos\n• Aumentar T (reacção exotérmica) → desloca para reagentes (Kc diminui)\n• Aumentar T (reacção endotérmica) → desloca para produtos (Kc aumenta)\n• Aumentar pressão (gás) → desloca para o lado com MENOR número de moles gasosas\n• Adicionar catalisador → NÃO desloca o equilíbrio (só acelera)`
    },
    'quimica/Equilíbrio ácido-base — pH e Kw': {
        title: 'Equilíbrio ácido-base — pH, pOH e Kw',
        body: `**1. Brønsted-Lowry (1923)**\n• **Ácido**: cede um protão (H⁺).\n• **Base**: recebe um protão.\n• **Par conjugado**: HA + B ⇌ A⁻ + HB⁺.\n• **Anfotérica** (anfiprótica): pode actuar como ácido OU base. Ex: H₂O, HCO₃⁻, HS⁻, H₂PO₄⁻.\n\n**2. Autoionização da água**\n   2 H₂O(ℓ) ⇌ H₃O⁺(aq) + OH⁻(aq)\nA água é simultaneamente o ácido e a base do seu equilíbrio.\n\n**3. Produto iónico da água, Kw**\n   **Kw = [H₃O⁺] · [OH⁻]**\n• A 25 °C: Kw = 1,0 × 10⁻¹⁴ → [H₃O⁺] = [OH⁻] = 1,0 × 10⁻⁷ mol/dm³.\n• Kw depende APENAS da temperatura. Como a autoionização é endotérmica, Kw aumenta com T:\n   — 0 °C ≈ 1,1 × 10⁻¹⁵\n   — 25 °C = 1,0 × 10⁻¹⁴\n   — 50 °C ≈ 5,5 × 10⁻¹⁴\n   — 100 °C ≈ 5,1 × 10⁻¹³\n\n**4. Escala de Sørensen — pH e pOH**\n   pH = −log[H₃O⁺]    pOH = −log[OH⁻]\n   pH + pOH = pKw    (= 14 a 25 °C)\nReversamente: [H₃O⁺] = 10⁻ᵖᴴ.\n\n**5. Classificação (a 25 °C)**\n• pH < 7 → ácida\n• pH = 7 → neutra\n• pH > 7 → básica\n\n**6. Diluição**\n• Diluir ácido → pH sobe (aproxima-se de 7).\n• Diluir base → pH desce (aproxima-se de 7).\n• Por simples diluição, nunca se cruza o valor neutro.\n\n**7. Indicadores ácido-base**\n• Tornesol: vermelho (<5) → azul (>8)\n• Fenolftaleína: incolor (<8,3) → carmim (>10)\n• Azul de bromotimol: amarelo (<6) → azul (>7,6)\n• Alaranjado de metilo: vermelho (<3,1) → amarelo (>4,4)\n\n**❌ ERROS FREQUENTES EM EXAME**\n• Confundir "neutro" com "pH = 7" → SÓ é verdade a 25 °C. Em água pura a 50 °C o pH neutro é ≈ 6,6 (continua neutra porque [H₃O⁺] = [OH⁻]).\n• Esquecer o factor 10 entre unidades de pH: ΔpH = 1 → 10× a [H₃O⁺]. Solução de pH 3 tem 100× mais H₃O⁺ que pH 5.\n• Achar que diluir um ácido pode "passar" para pH > 7 → IMPOSSÍVEL por diluição em água.\n• Pensar que Kw é constante universal → muda com T.`
    },
    'quimica/Ácidos e bases fortes e fracos — Ka e Kb': {
        title: 'Ka, Kb e força de ácidos e bases',
        body: `**1. "Força" = extensão da ionização**\n• **Forte**: ioniza-se quase totalmente (>99%).\n• **Fraco**: ioniza-se parcialmente, em equilíbrio.\nNÃO confundir com concentração! Um ácido pode ser FORTE e DILUÍDO ou FRACO e CONCENTRADO.\n\n**2. Ácidos fortes — memorizar**\nHCl · HBr · HI · HNO₃ · H₂SO₄ (1.ª ioniz.) · HClO₄.\nReacção COMPLETA → para HA de concentração C:\n   [H₃O⁺] ≈ C  →  **pH = −log C**\nEx: HCl 0,01 mol/dm³ → pH = 2.\n\n**3. Bases fortes**\nNaOH · KOH · LiOH · Ca(OH)₂ · Ba(OH)₂.\n   [OH⁻] ≈ C  →  pOH = −log C  →  pH = 14 − pOH (a 25 °C)\n\n**4. Ácidos fracos — Ka**\n   HA + H₂O ⇌ A⁻ + H₃O⁺\n   **Ka = [A⁻]·[H₃O⁺] / [HA]**\n\nValores típicos a 25 °C:\n• HF → 6,8 × 10⁻⁴ (pKa 3,2)\n• CH₃COOH → 1,8 × 10⁻⁵ (pKa 4,7)\n• H₂CO₃ (1.ª) → 4,3 × 10⁻⁷ (pKa 6,4)\n• NH₄⁺ → 5,6 × 10⁻¹⁰ (pKa 9,2)\n• HCN → 6,2 × 10⁻¹⁰ (pKa 9,2)\n\n**Cálculo do pH** (com Ka << C, aproximação x pequeno):\n   **[H₃O⁺] = √(Ka · C)**    →    pH = ½(pKa − log C)\nEx: ácido acético 0,10 mol/dm³ → [H₃O⁺] = √(1,8×10⁻⁵ · 0,10) ≈ 1,3×10⁻³ → pH ≈ 2,9.\n\n**5. Bases fracas — Kb**\n   B + H₂O ⇌ BH⁺ + OH⁻\n   **Kb = [BH⁺]·[OH⁻] / [B]**\nEx: NH₃ → Kb = 1,8 × 10⁻⁵; CH₃COO⁻ → Kb = 5,6 × 10⁻¹⁰.\n\n**6. Relação fundamental: Ka · Kb = Kw**\nPara qualquer par ácido-base CONJUGADO, à mesma T:\n   **Ka(HA) × Kb(A⁻) = Kw**    ⇔    **pKa + pKb = 14** (a 25 °C)\n→ Quanto MAIS forte o ácido, MAIS FRACA a base conjugada.\n\n**7. pKa — escala prática**\n   pKa = −log Ka\n• pKa < 0 → forte\n• 1–5 → moderadamente fraco\n• > 5 → muito fraco\nEntre dois ácidos: o de **MENOR pKa** é o **MAIS FORTE**.\n\n**8. Grau de ionização (α)**\n   α = [H₃O⁺]equilíbrio / C₀ × 100 %\n• Forte → α ≈ 100%\n• Fraco → α normalmente < 5%\n• α AUMENTA com a diluição (Le Châtelier).\n\n**❌ ERROS FREQUENTES EM EXAME**\n• Aplicar **√(Ka·C)** a ácidos FORTES — em fortes [H₃O⁺] = C directamente. A fórmula da raiz só vale para FRACOS.\n• Achar que **pKa maior = ácido mais forte** → é o CONTRÁRIO. pKa menor → mais forte.\n• No **H₂SO₄**, tratar a 2.ª ionização (HSO₄⁻ → H⁺ + SO₄²⁻) como forte — ela é FRACA (Ka₂ ≈ 1,2 × 10⁻²).\n• Confundir ácido **forte** com ácido **concentrado** (e fraco com diluído) — são propriedades INDEPENDENTES.\n• Esquecer que Ka e Kb dependem APENAS da temperatura — concentração não os altera.\n• Calcular pH de ácido fraco e dar resposta com casas decimais a mais — verifica se a aproximação x << C é válida (regra prática: C/Ka > 1000).`
    },
    'quimica/Soluções tampão e titulações ácido-base': {
        title: 'Soluções tampão e titulações',
        body: `**Solução tampão**: mistura de ácido fraco + sua base conjugada (ou base fraca + seu ácido conjugado). Resiste a variações de pH quando se adiciona pequena quantidade de ácido ou base.\n\n**Equação de Henderson-Hasselbalch:**\n   pH = pKa + log([A⁻]/[HA])\n\n**Titulação ácido-base:**\n• **Ponto de equivalência**: nº moles ácido = nº moles base.\n• Ácido forte + base forte → pH = 7 no ponto de equivalência.\n• Ácido fraco + base forte → pH > 7 no ponto de equivalência.\n• Ácido forte + base fraca → pH < 7 no ponto de equivalência.\n\n**Indicadores**: corantes que mudam de cor numa zona de pH (ex: tornesol, fenolftaleína 8,3-10,0; tinta azul de bromotimol 6,0-7,6).\n\nA **curva de titulação** tem um salto abrupto perto do ponto de equivalência.`
    },
    'quimica/Solubilidade e produto de solubilidade (Ks)': {
        title: 'Solubilidade e Ks',
        body: `Para um sal pouco solúvel AₐBᵦ(s) ⇌ aA^n+(aq) + bB^m−(aq):\n\n**Produto de solubilidade Ks:**\n   Ks = [A^n+]^a · [B^m−]^b\n\n(o sólido NÃO entra na expressão).\n\n**Solubilidade s** (mol/dm³) é a concentração máxima dissolvida.\nPara AB (1:1): Ks = s²; s = √Ks.\nPara AB₂ (1:2): Ks = 4s³; s = ∛(Ks/4).\n\n**Comparar Q vs Ks:**\n• Q < Ks → solução não saturada (mais sal pode dissolver)\n• Q = Ks → saturada (em equilíbrio)\n• Q > Ks → forma-se PRECIPITADO\n\n**Efeito do ião comum**: adicionar um ião que já existe no equilíbrio DIMINUI a solubilidade do sal (Le Châtelier).\n\n**Efeito do pH**: sais de ácidos fracos (CaCO₃, Mg(OH)₂…) ficam mais solúveis em meio ácido.`
    },
    'quimica/Equilíbrio de oxidação-redução': {
        title: 'Oxidação-redução',
        body: `**Oxidação**: perda de electrões (nº de oxidação aumenta).\n**Redução**: ganho de electrões (nº de oxidação diminui).\n\nNuma reacção redox há sempre oxidação E redução em simultâneo (transferência de electrões).\n\n**Agente oxidante**: aceita electrões → é REDUZIDO.\n**Agente redutor**: cede electrões → é OXIDADO.\n\n**Números de oxidação — regras úteis:**\n• Elemento puro: 0 (ex: O₂, Cu, Fe)\n• Iões monoatómicos: igual à carga (Na⁺=+1, Cl⁻=−1)\n• O em compostos: −2 (excepto peróxidos: −1; OF₂: +2)\n• H em compostos: +1 (excepto hidretos metálicos NaH: −1)\n• Soma dos n.o. = carga total da espécie\n\n**Acerto de equações redox**: balancear electrões cedidos = electrões ganhos.`
    },
    'quimica/Pilhas e potenciais de eléctrodo': {
        title: 'Pilhas e potencial de eléctrodo',
        body: `Uma **pilha** (célula galvânica) converte energia química em energia eléctrica através de uma reacção redox espontânea.\n\n**Componentes:**\n• **Ânodo** (−): onde ocorre OXIDAÇÃO\n• **Cátodo** (+): onde ocorre REDUÇÃO\n• **Ponte salina**: mantém a neutralidade eléctrica\n• **Eléctrodos** ligados por circuito externo\n\n**fem (força electromotriz) padrão:**\n   E°pilha = E°cátodo − E°ânodo\n\n(usar SEMPRE potenciais de redução padrão)\n\n**Espontaneidade:**\n• E°pilha > 0 → reacção espontânea\n• E°pilha < 0 → não espontânea\n\n**Série electroquímica**: ordena metais por poder redutor.\nMetal MAIS redutor (E° mais negativo) → cede electrões mais facilmente → corrói-se preferencialmente.\n\nEx: pilha Zn/Cu → Zn (ânodo, E°=−0,76 V) e Cu (cátodo, E°=+0,34 V)\n   E°pilha = +0,34 − (−0,76) = +1,10 V`
    }
};

// Reservado — exercícios complexos vivem em content_11_q_extra.js (lazy load)
const EXERCISES_11 = [];

const YEARS_AVAILABLE = [
    { year: 2,  label: '2.º ano',  cycle: '1.º ciclo' },
    { year: 5,  label: '5.º ano',  cycle: '2.º ciclo' },
    { year: 6,  label: '6.º ano',  cycle: '2.º ciclo' },
    { year: 11, label: '11.º ano', cycle: 'Secundário' }
];

const SUBJECTS_BY_YEAR   = { 2: SUBJECTS_2,   5: SUBJECTS_5,   6: SUBJECTS_6,   11: SUBJECTS_11 };
const CURRICULUM_BY_YEAR = { 2: CURRICULUM_2, 5: CURRICULUM_5, 6: CURRICULUM_6, 11: CURRICULUM_11 };
const EXERCISES_BY_YEAR  = { 2: EXERCISES_2,  5: EXERCISES_5,  6: EXERCISES_6,  11: EXERCISES_11 };
const LESSONS_BY_YEAR    = { 2: LESSONS_2,    5: LESSONS_5,    6: LESSONS_6,    11: LESSONS_11 };
const PERIODS_BY_YEAR    = { 2: PERIODS_2,    5: PERIODS_5,    6: PERIODS_6,    11: PERIODS_11 };

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
