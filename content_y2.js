// Gerado a partir de content.js (v571): banco BASE deste ano, carregado
// só quando um perfil deste ano está ativo (loadYearExtras). IIFE para não
// colidir com os const vazios de content.js.
(function () {
const EXERCISES_2 = [
    // Português
    { id:'2p1', s:'portugues', t:'Vogais e consoantes', type:'mc', diff:1, q:'Quais são as vogais?', opts:['a, e, i, o, u','a, b, c, d, e','b, c, d, f, g','i, j, k, l, m'], ans:0, exp:'As vogais são 5: a, e, i, o, u.' },
    { id:'2p2', s:'portugues', t:'Sílabas', type:'fill', diff:1, q:'Quantas sílabas tem a palavra "menina"?', ans:['3','três'], exp:'Me-ni-na = 3 sílabas.' },
    { id:'2p3', s:'portugues', t:'Sílabas', type:'mc', diff:1, q:'Como se divide a palavra "escola"?', opts:['esc-ola','es-co-la','e-sco-la','esco-la'], ans:1, exp:'es-co-la = 3 sílabas.' },
    { id:'2p4', s:'portugues', t:'Sinónimos', type:'mc', diff:2, q:'Qual é o sinónimo de "bonito"?', opts:['feio','belo','triste','rápido'], ans:1, exp:'Bonito e belo significam o mesmo.' },
    { id:'2p5', s:'portugues', t:'Antónimos', type:'mc', diff:2, q:'Qual é o antónimo de "alto"?', opts:['grande','baixo','forte','rápido'], ans:1, exp:'Alto ≠ baixo.' },
    { id:'2p6', s:'portugues', t:'Antónimos', type:'fill', diff:1, q:'O antónimo de "quente" é ___.', ans:['frio'], exp:'Quente ≠ frio.' },
    { id:'2p7', s:'portugues', t:'Singular e plural', type:'fill', diff:1, q:'Qual é o plural de "casa"?', ans:['casas'], exp:'Acrescenta-se "s" no final.' },
    { id:'2p8', s:'portugues', t:'Singular e plural', type:'fill', diff:1, q:'Qual é o plural de "papel"?', ans:['papéis','papeis'], exp:'Palavras em "-el" fazem plural em "-éis".' },
    { id:'2p9', s:'portugues', t:'Tipos de frase', type:'mc', diff:1, q:'"Que dia bonito!" é uma frase:', opts:['interrogativa','exclamativa','declarativa','imperativa'], ans:1, exp:'Termina com "!" → exclamativa.' },
    { id:'2p10', s:'portugues', t:'Verbos no presente', type:'fill', diff:1, q:'Eu ___ (correr) no parque. (presente)', ans:['corro'], exp:'Eu corro, tu corres, ele corre.' },
    { id:'2p11', s:'portugues', t:'Família de palavras', type:'mc', diff:2, q:'Qual destas palavras NÃO pertence à família de "flor"?', opts:['florista','florido','florescer','feliz'], ans:3, exp:'Florista, florido e florescer vêm de flor. Feliz não.' },
    { id:'2p12', s:'portugues', t:'Ditongos', type:'mc', diff:2, q:'Qual destas palavras tem um ditongo?', opts:['casa','pai','sol','livro'], ans:1, exp:'Em "pai", "ai" é um ditongo (duas vogais juntas).' },
    { id:'2p13', s:'portugues', t:'Vogais e consoantes', type:'fill', diff:1, q:'Quantas vogais existem? ___', ans:['5','cinco'], exp:'a, e, i, o, u → 5 vogais.' },
    { id:'2p14', s:'portugues', t:'Sinónimos', type:'fill', diff:1, q:'Sinónimo de "alegre": ___', ans:['contente','feliz'], exp:'Alegre = contente = feliz.' },

    // Matemática
    { id:'2m1', s:'matematica', t:'Números até 100', type:'mc', diff:2, q:'Quantas dezenas tem o número 47?', opts:['4','7','47','40'], ans:0, exp:'47 = 4 dezenas + 7 unidades.' },
    { id:'2m2', s:'matematica', t:'Dezenas e unidades', type:'fill', diff:2, q:'O número que tem 6 dezenas e 3 unidades é ___.', ans:['63'], exp:'6 dezenas = 60. 60 + 3 = 63.' },
    { id:'2m3', s:'matematica', t:'Adição até 100', type:'fill', diff:2, q:'25 + 13 = ___', ans:['38'], exp:'5+3=8 (unidades). 2+1=3 (dezenas). Resultado: 38.' },
    { id:'2m4', s:'matematica', t:'Adição até 100', type:'problem', diff:2, q:'A Eduarda tem 27 cromos e a Joana tem 15. Quantos cromos têm ao todo?', ans:['42'], material:'Soma os dois números: 27 + 15.', solution:'Unidades: 7+5=12 (escrevo 2 e transporto 1). Dezenas: 2+1+1=4. Resultado: 42 cromos.', exp:'Soma com transporte.' },
    { id:'2m5', s:'matematica', t:'Subtração até 100', type:'fill', diff:2, q:'48 − 15 = ___', ans:['33'], exp:'8−5=3 (unidades). 4−1=3 (dezenas). Resultado: 33.' },
    { id:'2m6', s:'matematica', t:'Subtração até 100', type:'problem', diff:2, q:'Tinha 50 berlindes e perdi 18. Com quantos fiquei?', ans:['32'], material:'Subtração: 50 − 18.', solution:'50 − 10 = 40. 40 − 8 = 32. Fiquei com 32 berlindes.', exp:'Subtração com empréstimo.' },
    { id:'2m7', s:'matematica', t:'Tabuada do 2', type:'fill', diff:1, q:'2 × 7 = ___', ans:['14'], exp:'2 × 7 = 7 + 7 = 14.' },
    { id:'2m8', s:'matematica', t:'Tabuada do 2', type:'mc', diff:1, q:'Quanto é 2 × 6?', opts:['10','12','14','8'], ans:1, exp:'2 × 6 = 12.' },
    { id:'2m9', s:'matematica', t:'Tabuada do 5', type:'fill', diff:2, q:'5 × 4 = ___', ans:['20'], exp:'5 × 4 = 20.' },
    { id:'2m10', s:'matematica', t:'Tabuada do 5', type:'problem', diff:2, q:'A Eduarda tem 5 sacos com 3 chocolates em cada. Quantos chocolates tem?', ans:['15'], material:'Multiplica: 5 × 3.', solution:'5 + 5 + 5 = 15. Ou 5 × 3 = 15.', exp:'Multiplicação como soma repetida.' },
    { id:'2m11', s:'matematica', t:'Tabuada do 10', type:'fill', diff:1, q:'10 × 8 = ___', ans:['80'], exp:'Multiplicar por 10: junta um zero. 8 → 80.' },
    { id:'2m12', s:'matematica', t:'Sólidos geométricos', type:'mc', diff:2, q:'Qual destes objetos tem a forma de uma esfera?', opts:['caixa de sapatos','bola de futebol','livro','pirâmide'], ans:1, exp:'A bola é uma esfera.' },
    { id:'2m13', s:'matematica', t:'Figuras planas', type:'mc', diff:2, q:'Quantos lados tem um triângulo?', opts:['2','3','4','5'], ans:1, exp:'Triângulo = 3 lados.' },
    { id:'2m14', s:'matematica', t:'Figuras planas', type:'mc', diff:2, q:'Uma figura com 4 lados iguais é um:', opts:['triângulo','quadrado','círculo','retângulo'], ans:1, exp:'Quadrado: 4 lados iguais.' },
    { id:'2m15', s:'matematica', t:'Medir tempo', type:'fill', diff:2, q:'Quantos minutos tem 1 hora? ___', ans:['60'], exp:'1 hora = 60 minutos.' },
    { id:'2m16', s:'matematica', t:'Medir tempo', type:'mc', diff:2, q:'Quantos dias tem uma semana?', opts:['5','6','7','30'], ans:2, exp:'Uma semana = 7 dias.' },
    { id:'2m17', s:'matematica', t:'Dinheiro (€)', type:'problem', diff:2, q:'Uma sandes custa 2€ e um sumo custa 1€. Quanto custa o lanche?', ans:['3','3€','3 euros'], material:'Soma: 2 + 1.', solution:'2 + 1 = 3. O lanche custa 3€.', exp:'Adição simples.' },
    { id:'2m18', s:'matematica', t:'Dinheiro (€)', type:'problem', diff:2, q:'A Eduarda tinha 10€ e comprou um livro de 6€. Quanto dinheiro lhe ficou?', ans:['4','4€','4 euros'], material:'Subtração: 10 − 6.', solution:'10 − 6 = 4. Ficou com 4€.', exp:'Subtração com dinheiro.' },
    { id:'2m19', s:'matematica', t:'Números até 100', type:'order', diff:2, q:'Ordena do menor para o maior: 27, 7, 72, 17', items:['7','17','27','72'], exp:'Comparam-se as dezenas primeiro.' },
    { id:'2m20', s:'matematica', t:'Tabuada do 5', type:'mc', diff:1, q:'Qual é o resultado de 5 × 9?', opts:['40','45','50','55'], ans:1, exp:'5 × 9 = 45.' },

    // Estudo do Meio
    { id:'2e1', s:'estudo_meio', t:'O meu corpo', type:'mc', diff:2, q:'Quais são as 3 grandes partes do corpo humano?', opts:['cabeça, tronco, membros','braços, pernas, mãos','olhos, nariz, boca','músculos, ossos, pele'], ans:0, exp:'Cabeça, tronco e membros (braços e pernas).' },
    { id:'2e2', s:'estudo_meio', t:'Os sentidos', type:'mc', diff:1, q:'Com que sentido ouvimos os sons?', opts:['visão','audição','olfato','tato'], ans:1, exp:'Audição = ouvir, com os ouvidos.' },
    { id:'2e3', s:'estudo_meio', t:'Os sentidos', type:'fill', diff:1, q:'Quantos sentidos temos? ___', ans:['5','cinco'], exp:'Visão, audição, olfato, paladar e tato.' },
    { id:'2e4', s:'estudo_meio', t:'Animais', type:'mc', diff:1, q:'Os peixes respiram com:', opts:['pulmões','guelras','traqueia','pele'], ans:1, exp:'Os peixes têm guelras (brânquias).' },
    { id:'2e5', s:'estudo_meio', t:'Animais', type:'tf', diff:1, q:'O pinguim é uma ave.', ans:true, exp:'O pinguim é uma ave (tem penas e bico) que não voa mas nada muito bem.' },
    { id:'2e6', s:'estudo_meio', t:'Plantas', type:'mc', diff:2, q:'A parte da planta que está debaixo da terra chama-se:', opts:['caule','folha','raiz','flor'], ans:2, exp:'A raiz fica debaixo da terra e absorve a água.' },
    { id:'2e7', s:'estudo_meio', t:'Estações do ano', type:'mc', diff:2, q:'Em que estação caem as folhas das árvores?', opts:['Primavera','Verão','Outono','Inverno'], ans:2, exp:'No Outono, as folhas mudam de cor e caem.' },
    { id:'2e8', s:'estudo_meio', t:'Estações do ano', type:'fill', diff:1, q:'A estação mais quente do ano é o ___.', ans:['verão','Verão','verao'], exp:'Verão = calor.' },
    { id:'2e9', s:'estudo_meio', t:'A minha família', type:'mc', diff:1, q:'O irmão do meu pai é o meu:', opts:['avô','tio','primo','padrinho'], ans:1, exp:'Irmão do pai/mãe = tio.' },
    { id:'2e10', s:'estudo_meio', t:'A escola', type:'tf', diff:2, q:'Na escola devemos respeitar os colegas e os professores.', ans:true, exp:'O respeito é uma regra básica na escola.' },
    { id:'2e11', s:'estudo_meio', t:'Profissões', type:'mc', diff:1, q:'Quem cuida dos doentes no hospital?', opts:['professor','médico','padeiro','jardineiro'], ans:1, exp:'O médico (com a ajuda dos enfermeiros) cuida dos doentes.' },
    { id:'2e12', s:'estudo_meio', t:'Portugal', type:'mc', diff:1, q:'Qual é a capital de Portugal?', opts:['Porto','Coimbra','Lisboa','Faro'], ans:2, exp:'A capital de Portugal é Lisboa.' },
    { id:'2e13', s:'estudo_meio', t:'Portugal', type:'mc', diff:2, q:'Quais são as cores da bandeira de Portugal?', opts:['azul e branco','verde e vermelho','vermelho e amarelo','verde e branco'], ans:1, exp:'A bandeira portuguesa é verde e vermelha, com o brasão.' },
    { id:'2e14', s:'estudo_meio', t:'Animais', type:'mc', diff:1, q:'Um animal que põe ovos chama-se:', opts:['vivíparo','ovíparo','mamífero','herbívoro'], ans:1, exp:'Ovíparo: nasce de um ovo.' },

    // Inglês — visual-first, sem escrever em inglês, opções com 3 alternativas
    { id:'2i1',  s:'ingles', t:'Cores',        type:'mc', diff:1, q:'🔴 Que cor é esta em inglês?',                     opts:['red','blue','yellow'],     ans:0, exp:'🔴 = red (vermelho).' },
    { id:'2i2',  s:'ingles', t:'Cores',        type:'mc', diff:1, q:'🔵 Que cor é esta em inglês?',                     opts:['green','blue','pink'],     ans:1, exp:'🔵 = blue (azul).' },
    { id:'2i3',  s:'ingles', t:'Cores',        type:'mc', diff:1, q:'💗 Que cor é esta em inglês?',                     opts:['pink','black','white'],    ans:0, exp:'💗 = pink (rosa).' },
    { id:'2i4',  s:'ingles', t:'Cores',        type:'mc', diff:1, q:'🟢 Que cor é esta em inglês?',                     opts:['yellow','red','green'],    ans:2, exp:'🟢 = green (verde).' },
    { id:'2i5',  s:'ingles', t:'Números',      type:'mc', diff:1, q:'☝️ Quantos dedos? Em inglês:',                       opts:['one','two','three'],       ans:0, exp:'☝️ = 1 = one.' },
    { id:'2i6',  s:'ingles', t:'Números',      type:'mc', diff:1, q:'✌️ Quantos dedos? Em inglês:',                       opts:['four','two','three'],      ans:1, exp:'✌️ = 2 = two.' },
    { id:'2i7',  s:'ingles', t:'Números',      type:'mc', diff:1, q:'🖐️ Quantos dedos? Em inglês:',                       opts:['three','four','five'],     ans:2, exp:'🖐️ = 5 = five.' },
    { id:'2i8',  s:'ingles', t:'Números',      type:'mc', diff:1, q:'Quantas estrelas? ⭐⭐⭐ Em inglês:',                  opts:['two','three','four'],      ans:1, exp:'⭐⭐⭐ = 3 = three.' },
    { id:'2i9',  s:'ingles', t:'Animais',      type:'mc', diff:1, q:'🐶 Que animal é em inglês?',                       opts:['cat','dog','bird'],        ans:1, exp:'🐶 = dog (cão).' },
    { id:'2i10', s:'ingles', t:'Animais',      type:'mc', diff:1, q:'🐱 Que animal é em inglês?',                       opts:['cat','fish','rabbit'],     ans:0, exp:'🐱 = cat (gato).' },
    { id:'2i11', s:'ingles', t:'Animais',      type:'mc', diff:1, q:'🐟 Que animal é em inglês?',                       opts:['bird','fish','horse'],     ans:1, exp:'🐟 = fish (peixe).' },
    { id:'2i12', s:'ingles', t:'Animais',      type:'mc', diff:1, q:'🐰 Que animal é em inglês?',                       opts:['rabbit','dog','cat'],      ans:0, exp:'🐰 = rabbit (coelho).' },
    { id:'2i13', s:'ingles', t:'Família',      type:'mc', diff:1, q:'A tua mãe em inglês é:',                            opts:['dad','mum','sister'],      ans:1, exp:'mãe = mum (também se diz "mother").' },
    { id:'2i14', s:'ingles', t:'Família',      type:'mc', diff:1, q:'O teu pai em inglês é:',                            opts:['dad','brother','grandpa'], ans:0, exp:'pai = dad (também se diz "father").' },
    { id:'2i15', s:'ingles', t:'Família',      type:'mc', diff:1, q:'A tua irmã em inglês é:',                           opts:['mum','sister','grandma'],  ans:1, exp:'irmã = sister.' },
    { id:'2i16', s:'ingles', t:'Cumprimentos', type:'mc', diff:1, q:'👋 De manhã dizes:',                                opts:['Good night','Good morning','Bye'], ans:1, exp:'De manhã: Good morning! 🌅' },
    { id:'2i17', s:'ingles', t:'Cumprimentos', type:'mc', diff:1, q:'🌙 Antes de dormir dizes:',                          opts:['Hello','Good night','Thank you'], ans:1, exp:'Antes de dormir: Good night! 🌙' },
    { id:'2i18', s:'ingles', t:'Cumprimentos', type:'mc', diff:1, q:'Para agradecer dizes:',                              opts:['Hello','Bye','Thank you'], ans:2, exp:'Obrigada = Thank you! 🙏' },

    // ===== Português — novos tópicos (Hiato, Nomes, Adjetivos, Género, Grau, Verbos passado/futuro, Pontuação) =====
    { id:'2p15', s:'portugues', t:'Hiato', type:'mc', diff:2, q:'Qual destas palavras tem HIATO?', opts:['pai','saúde','boi','outro'], ans:1, exp:'Saúde = sa-ú-de (3 sílabas, "a" e "u" separados) → hiato. As outras são ditongos.' },
    { id:'2p16', s:'portugues', t:'Hiato', type:'tf', diff:2, q:'A palavra "leão" tem hiato.', ans:false, exp:'Falso! "Leão" = le-ão (2 sílabas). O "ão" é um ditongo nasal (vogais na mesma sílaba) → NÃO é hiato. Exemplo de hiato: "vo-o" (voo) ou "ru-í-do".' },
    { id:'2p17', s:'portugues', t:'Hiato', type:'fill', diff:2, q:'Quantas sílabas tem "saída"?', ans:['3','três'], exp:'sa-í-da → 3 sílabas (hiato entre a e í).' },
    { id:'2p18', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:1, q:'Qual destes é um nome PRÓPRIO?', opts:['cidade','livro','Lisboa','rapaz'], ans:2, exp:'Lisboa identifica uma cidade ESPECÍFICA → nome próprio (com maiúscula).' },
    { id:'2p19', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:1, q:'Qual destes é um nome COMUM?', opts:['Maria','Bobi','gato','Tejo'], ans:2, exp:'Gato dá nome a TODOS os animais desta espécie → nome comum (minúscula).' },
    { id:'2p20', s:'portugues', t:'Nomes próprios e comuns', type:'tf', diff:1, q:'O nome próprio "joão" deve ser escrito com letra MAIÚSCULA.', ans:true, exp:'Os nomes próprios escrevem-se SEMPRE com maiúscula → João.' },
    { id:'2p21', s:'portugues', t:'Adjetivos', type:'mc', diff:1, q:'Na frase "O gato preto dorme", qual é o ADJETIVO?', opts:['gato','preto','dorme','o'], ans:1, exp:'Preto descreve o gato → adjetivo.' },
    { id:'2p22', s:'portugues', t:'Adjetivos', type:'fill', diff:1, q:'O adjetivo concorda com o nome em género e ___ (singular/plural).', ans:['número','numero'], exp:'O adjetivo concorda em GÉNERO e NÚMERO. Ex: meninas altas (fem. plural).' },
    { id:'2p23', s:'portugues', t:'Adjetivos', type:'mc', diff:2, q:'Qual frase está CORRETA?', opts:['Os meninos alta','As meninas alto','Os meninos altos','Os menino altos'], ans:2, exp:'Concordância: os (masc. plural) + meninos + altos. Tudo plural masculino.' },
    { id:'2p24', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:1, q:'Qual é o feminino de "pai"?', opts:['paia','pãe','mãe','tia'], ans:2, exp:'Pai (masculino) → mãe (feminino) — palavra completamente diferente.' },
    { id:'2p25', s:'portugues', t:'Género (masculino e feminino)', type:'fill', diff:1, q:'O feminino de "professor" é ___.', ans:['professora'], exp:'Acrescenta-se -a: professor → professora.' },
    { id:'2p26', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:2, q:'Qual destas palavras NÃO MUDA de género?', opts:['gato','aluno','flor','cão'], ans:2, exp:'"Flor" só tem o género feminino — diz-se SEMPRE "a flor".' },
    { id:'2p27', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:1, q:'Qual é o DIMINUTIVO de "casa"?', opts:['casarão','casinha','casona','casarões'], ans:1, exp:'Casinha = diminutivo (-inha indica pequeno ou carinho).' },
    { id:'2p28', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:1, q:'Qual é o AUMENTATIVO de "livro"?', opts:['livrinho','livrarias','livrão','livrinhos'], ans:2, exp:'Livrão = aumentativo (-ão indica grande).' },
    { id:'2p29', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'tf', diff:2, q:'O diminutivo serve sempre para indicar tamanho pequeno.', ans:false, exp:'Falso! O diminutivo também pode indicar CARINHO. Ex: "mãezinha" não significa que a mãe é pequena.' },
    { id:'2p30', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:1, q:'Em que tempo verbal está "Amanhã eu correrei"?', opts:['passado','presente','futuro','imperativo'], ans:2, exp:'"Amanhã" + "correrei" → tempo FUTURO.' },
    { id:'2p31', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:1, q:'Em que tempo está "Ontem brinquei no parque"?', opts:['passado','presente','futuro','condicional'], ans:0, exp:'"Ontem" + "brinquei" → PASSADO.' },
    { id:'2p32', s:'portugues', t:'Verbos no passado e futuro', type:'fill', diff:2, q:'Completa: "Amanhã eu ___ comer" (futuro próximo do verbo "ir + comer").', ans:['vou'], exp:'Futuro próximo: "vou comer" — equivalente a "comerei".' },
    { id:'2p33', s:'portugues', t:'Pontuação básica', type:'mc', diff:1, q:'Que sinal se usa no fim de uma pergunta?', opts:['.','!','?',','], ans:2, exp:'Frases interrogativas terminam em ponto de interrogação (?).' },
    { id:'2p34', s:'portugues', t:'Pontuação básica', type:'mc', diff:1, q:'Qual frase está CORRETAMENTE pontuada?', opts:['Olá Como estás','Olá! Como estás?','olá, como estás','Olá. Como estás!'], ans:1, exp:'Cumprimento → exclamação; pergunta → interrogação. Maiúsculas no início.' },
    { id:'2p35', s:'portugues', t:'Pontuação básica', type:'tf', diff:2, q:'Numa lista de 3 palavras, deve-se pôr vírgula antes do "e".', ans:false, exp:'Falso. Não se usa vírgula antes de "e": "pão, leite e queijo" (não "pão, leite, e queijo").' },

    // ===== Estudo do Meio — novos tópicos =====
    { id:'2e15', s:'estudo_meio', t:'Astros', type:'mc', diff:1, q:'O Sol é uma:', opts:['estrela','planeta','lua','cometa'], ans:0, exp:'O Sol é uma ESTRELA — a mais próxima de nós. Dá luz e calor.' },
    { id:'2e16', s:'estudo_meio', t:'Astros', type:'tf', diff:1, q:'A Lua tem luz própria.', ans:false, exp:'Falso. A Lua REFLETE a luz do Sol — não tem luz própria.' },
    { id:'2e17', s:'estudo_meio', t:'Astros', type:'fill', diff:2, q:'A Terra demora ___ horas a dar uma volta sobre si própria.', ans:['24'], exp:'A rotação da Terra demora 24 horas → origina o dia e a noite.' },
    { id:'2e18', s:'estudo_meio', t:'Transportes', type:'mc', diff:1, q:'O barco é um transporte:', opts:['terrestre','aéreo','aquático','espacial'], ans:2, exp:'O barco anda na ÁGUA → transporte aquático.' },
    { id:'2e19', s:'estudo_meio', t:'Transportes', type:'mc', diff:1, q:'Qual destes é um transporte AÉREO?', opts:['comboio','autocarro','helicóptero','barco'], ans:2, exp:'O helicóptero anda no AR → transporte aéreo.' },
    { id:'2e20', s:'estudo_meio', t:'Transportes', type:'tf', diff:1, q:'Andar de bicicleta protege o ambiente porque não polui.', ans:true, exp:'Verdade — a bicicleta não emite gases poluentes.' },
    { id:'2e21', s:'estudo_meio', t:'Higiene', type:'fill', diff:1, q:'Devemos escovar os dentes ___ vezes por dia.', ans:['3','três'], exp:'3 vezes ao dia: manhã, depois do almoço e antes de dormir.' },
    { id:'2e22', s:'estudo_meio', t:'Higiene', type:'tf', diff:1, q:'Devemos lavar as mãos antes das refeições.', ans:true, exp:'Sim! E também depois de ir à casa de banho ou brincar na rua.' },
    { id:'2e23', s:'estudo_meio', t:'Higiene', type:'mc', diff:1, q:'Quem cuida dos nossos dentes é o:', opts:['médico','dentista','farmacêutico','cabeleireiro'], ans:1, exp:'O DENTISTA cuida dos dentes — ir pelo menos 1 vez por ano.' },
    { id:'2e24', s:'estudo_meio', t:'Saúde', type:'mc', diff:1, q:'Quantas horas devem dormir as crianças?', opts:['4 a 6 h','9 a 11 h','12 a 14 h','3 horas'], ans:1, exp:'Crianças (5–12 anos) precisam de 9 a 11 horas de sono.' },
    { id:'2e25', s:'estudo_meio', t:'Saúde', type:'tf', diff:1, q:'Os refrigerantes são uma bebida saudável.', ans:false, exp:'Falso. Têm muito açúcar — devemos preferir ÁGUA.' },
    { id:'2e26', s:'estudo_meio', t:'Saúde', type:'mc', diff:2, q:'Qual destes hábitos é MENOS saudável?', opts:['comer fruta todos os dias','fazer exercício ao ar livre','dormir bem todas as noites','passar o dia agarrado ao telemóvel'], ans:3, exp:'Estar muito tempo em ecrãs prejudica os olhos, postura e atividade física.' },
    { id:'2e27', s:'estudo_meio', t:'Comemorações', type:'mc', diff:1, q:'O que se celebra a 25 de abril?', opts:['Natal','Liberdade','Páscoa','Dia da Mãe'], ans:1, exp:'25 de Abril = Dia da Liberdade (revolução de 1974, fim da ditadura).' },
    { id:'2e28', s:'estudo_meio', t:'Comemorações', type:'mc', diff:1, q:'O Natal celebra-se a:', opts:['25 de novembro','25 de dezembro','1 de janeiro','24 de junho'], ans:1, exp:'O Natal celebra-se a 25 de dezembro (nascimento de Jesus).' },
    { id:'2e29', s:'estudo_meio', t:'Comemorações', type:'tf', diff:2, q:'A Páscoa tem sempre a mesma data todos os anos.', ans:false, exp:'Falso. A Páscoa tem data variável (depende da Lua) — sempre na primavera.' },

    // ===== Inglês — novos tópicos =====
    { id:'2i19', s:'ingles', t:'Alfabeto', type:'mc', diff:1, q:'Quantas letras tem o alfabeto inglês?', opts:['23','24','26','28'], ans:2, exp:'O alfabeto inglês tem 26 letras (em português usamos 23 normalmente).' },
    { id:'2i20', s:'ingles', t:'Alfabeto', type:'mc', diff:2, q:'Como se diz "H" em inglês?', opts:['"agá"','"eitch"','"hi"','"a"'], ans:1, exp:'A letra H em inglês diz-se "eitch" (como "ei" + "tch").' },
    { id:'2i21', s:'ingles', t:'Alfabeto', type:'tf', diff:1, q:'Em inglês existem as letras W, K e Y.', ans:true, exp:'Sim — fazem parte das 26 letras. K, W e Y são pouco usadas em palavras portuguesas.' },
    { id:'2i22', s:'ingles', t:'Body', type:'mc', diff:1, q:'👁️ Qual a palavra inglesa?', opts:['ear','eye','nose'], ans:1, exp:'👁️ = eye (olho).' },
    { id:'2i23', s:'ingles', t:'Body', type:'mc', diff:1, q:'✋ Qual a palavra inglesa?', opts:['foot','hand','arm'], ans:1, exp:'✋ = hand (mão).' },
    { id:'2i24', s:'ingles', t:'Body', type:'mc', diff:2, q:'Qual é o plural de "tooth" (dente)?', opts:['tooths','teeth','toothes','tooth'], ans:1, exp:'Plural irregular: tooth → teeth (dentes).' },
    { id:'2i25', s:'ingles', t:'Food', type:'mc', diff:1, q:'🍎 Qual a palavra inglesa?', opts:['apple','orange','banana'], ans:0, exp:'🍎 = apple (maçã).' },
    { id:'2i26', s:'ingles', t:'Food', type:'mc', diff:1, q:'🍞 Qual a palavra inglesa?', opts:['bird','bread','blue'], ans:1, exp:'🍞 = bread (pão).' },
    { id:'2i27', s:'ingles', t:'Food', type:'mc', diff:2, q:'Como dizes "Tenho fome" em inglês?', opts:['I am tired','I am hungry','I am thirsty'], ans:1, exp:'I am hungry = Tenho fome. (Thirsty = sede.)' },
    { id:'2i28', s:'ingles', t:'Toys', type:'mc', diff:1, q:'⚽ Qual a palavra inglesa?', opts:['car','ball','doll'], ans:1, exp:'⚽ = ball (bola).' },
    { id:'2i29', s:'ingles', t:'Toys', type:'mc', diff:1, q:'🐻 (ursinho) em inglês é:', opts:['teddy bear','dog','cat'], ans:0, exp:'Ursinho de peluche = teddy bear.' },
    { id:'2i30', s:'ingles', t:'Toys', type:'mc', diff:2, q:'Como dizes "Vamos brincar!" em inglês?', opts:["Let's eat!","Let's play!","Let's sleep!"], ans:1, exp:"Let's play! = Vamos brincar! (play = brincar/jogar.)" },

    // ===== Matemática 2.º — tópicos sem cobertura =====
    { id:'2m21', s:'matematica', t:'Multiplicação', type:'mc', diff:1, q:'Quanto é 4 × 3?', opts:['7','12','9','16'], ans:1, exp:'4 × 3 = 4+4+4 = 12.' },
    { id:'2m22', s:'matematica', t:'Multiplicação', type:'fill', diff:1, q:'5 × 0 = ___', ans:['0','zero'], exp:'Qualquer número vezes 0 dá 0.' },
    { id:'2m23', s:'matematica', t:'Multiplicação', type:'mc', diff:2, q:'A Maria tem 5 caixas com 4 lápis cada. Quantos lápis tem ao todo?', opts:['9','15','20','25'], ans:2, exp:'5 × 4 = 20 lápis.' },
    { id:'2m24', s:'matematica', t:'Divisão', type:'mc', diff:1, q:'Quanto é 12 ÷ 3?', opts:['3','4','9','15'], ans:1, exp:'12 ÷ 3 = 4 (porque 4 × 3 = 12).' },
    { id:'2m25', s:'matematica', t:'Divisão', type:'fill', diff:1, q:'18 ÷ 6 = ___', ans:['3'], exp:'18 ÷ 6 = 3 (3 × 6 = 18).' },
    { id:'2m26', s:'matematica', t:'Divisão', type:'mc', diff:2, q:'Tens 18 berlindes para 3 amigos. Quantos recebe cada um?', opts:['3','5','6','9'], ans:2, exp:'18 ÷ 3 = 6 berlindes para cada amigo.' },
    { id:'2m27', s:'matematica', t:'Tabuada do 3', type:'mc', diff:1, q:'3 × 7 = ?', opts:['18','21','24','27'], ans:1, exp:'3 × 7 = 21.' },
    { id:'2m28', s:'matematica', t:'Tabuada do 3', type:'fill', diff:1, q:'3 × 9 = ___', ans:['27'], exp:'Os múltiplos de 3: 3,6,9,12,15,18,21,24,27,30.' },
    { id:'2m29', s:'matematica', t:'Tabuada do 3', type:'tf', diff:2, q:'21 é múltiplo de 3.', ans:true, exp:'2+1=3 → soma dos algarismos é múltiplo de 3 → 21 é múltiplo de 3.' },
    { id:'2m30', s:'matematica', t:'Tabuada do 4', type:'mc', diff:1, q:'4 × 6 = ?', opts:['20','24','28','32'], ans:1, exp:'4 × 6 = 24 (truque: dobro do dobro: 6×2=12; 12×2=24).' },
    { id:'2m31', s:'matematica', t:'Tabuada do 4', type:'fill', diff:1, q:'4 × 8 = ___', ans:['32'], exp:'4 × 8 = 32.' },
    { id:'2m32', s:'matematica', t:'Tabuada do 4', type:'mc', diff:2, q:'6 pratos com 4 fatias cada. Quantas fatias?', opts:['10','20','24','28'], ans:2, exp:'6 × 4 = 24 fatias.' },
    { id:'2m33', s:'matematica', t:'Tabuada do 6', type:'mc', diff:1, q:'6 × 7 = ?', opts:['36','42','48','54'], ans:1, exp:'6 × 7 = 42 (truque: 5×7=35; +7=42).' },
    { id:'2m34', s:'matematica', t:'Tabuada do 6', type:'fill', diff:1, q:'6 × 5 = ___', ans:['30'], exp:'6 × 5 = 30 (também é 3×5×2 = 15×2 = 30).' },
    { id:'2m35', s:'matematica', t:'Tabuada do 6', type:'mc', diff:2, q:'4 caixas com 6 ovos cada. Quantos ovos?', opts:['10','18','24','30'], ans:2, exp:'4 × 6 = 24 ovos.' },
    { id:'2m36', s:'matematica', t:'Tabuada do 7', type:'mc', diff:2, q:'7 × 8 = ?', opts:['49','54','56','63'], ans:2, exp:'7 × 8 = 56 (decora — não tem truque óbvio).' },
    { id:'2m37', s:'matematica', t:'Tabuada do 7', type:'fill', diff:2, q:'7 × 9 = ___', ans:['63'], exp:'7 × 9 = 63.' },
    { id:'2m38', s:'matematica', t:'Tabuada do 7', type:'mc', diff:2, q:'Uma semana tem 7 dias. Quantos dias têm 8 semanas?', opts:['49','54','56','63'], ans:2, exp:'8 × 7 = 56 dias.' },
    { id:'2m39', s:'matematica', t:'Tabuada do 8', type:'mc', diff:1, q:'8 × 5 = ?', opts:['30','35','40','45'], ans:2, exp:'8 × 5 = 40.' },
    { id:'2m40', s:'matematica', t:'Tabuada do 8', type:'fill', diff:2, q:'8 × 7 = ___', ans:['56'], exp:'8 × 7 = 56.' },
    { id:'2m41', s:'matematica', t:'Tabuada do 8', type:'mc', diff:2, q:'Uma aranha tem 8 patas. Quantas patas têm 6 aranhas?', opts:['42','48','54','64'], ans:1, exp:'6 × 8 = 48 patas.' },
    { id:'2m42', s:'matematica', t:'Tabuada do 9', type:'mc', diff:1, q:'9 × 4 = ?', opts:['27','32','36','45'], ans:2, exp:'9 × 4 = 36 (truque: 10×4 − 4 = 40−4 = 36).' },
    { id:'2m43', s:'matematica', t:'Tabuada do 9', type:'fill', diff:2, q:'9 × 7 = ___', ans:['63'], exp:'9 × 7 = 63 (truque: 70 − 7 = 63).' },
    { id:'2m44', s:'matematica', t:'Tabuada do 9', type:'tf', diff:2, q:'Os algarismos de 9×6 (=54) somados dão 9.', ans:true, exp:'Verdade! 5+4=9. Truque mágico: nos múltiplos de 9 a soma dá sempre 9.' },
    { id:'2m45', s:'matematica', t:'Frações simples', type:'mc', diff:1, q:'Quanto é metade de 8?', opts:['2','3','4','6'], ans:2, exp:'Metade = ÷ 2 → 8 ÷ 2 = 4.' },
    { id:'2m46', s:'matematica', t:'Frações simples', type:'mc', diff:1, q:'Quanto é 1/4 de 12?', opts:['2','3','4','6'], ans:1, exp:'Um quarto = ÷ 4 → 12 ÷ 4 = 3.' },
    { id:'2m47', s:'matematica', t:'Frações simples', type:'fill', diff:2, q:'Como se lê a fração 1/2?', ans:['metade','um meio'], exp:'1/2 = "um meio" ou "metade".' },
    { id:'2m48', s:'matematica', t:'Comprimento', type:'mc', diff:1, q:'1 metro tem quantos centímetros?', opts:['10','100','1000','60'], ans:1, exp:'1 m = 100 cm.' },
    { id:'2m49', s:'matematica', t:'Comprimento', type:'mc', diff:1, q:'Que unidade usas para medir a distância entre Lisboa e o Porto?', opts:['mm','cm','m','km'], ans:3, exp:'Distância entre cidades = quilómetros (km).' },
    { id:'2m50', s:'matematica', t:'Comprimento', type:'fill', diff:2, q:'A altura do João é 1m e 30cm. São quantos cm? ___', ans:['130'], exp:'1 m = 100 cm; 100 + 30 = 130 cm.' },
    { id:'2m51', s:'matematica', t:'Massa', type:'mc', diff:1, q:'1 kg tem quantos gramas?', opts:['10','100','1000','60'], ans:2, exp:'1 kg = 1 000 g.' },
    { id:'2m52', s:'matematica', t:'Massa', type:'mc', diff:1, q:'O que medes com uma balança?', opts:['comprimento','massa','tempo','capacidade'], ans:1, exp:'A balança mede a massa (popularmente: o "peso").' },
    { id:'2m53', s:'matematica', t:'Massa', type:'tf', diff:2, q:'Um pacote de açúcar (1 kg) pesa o mesmo que 1000 gramas.', ans:true, exp:'Verdade! 1 kg = 1 000 g.' },
    { id:'2m54', s:'matematica', t:'Capacidade', type:'mc', diff:1, q:'1 litro tem quantos mililitros?', opts:['10','100','1000','60'], ans:2, exp:'1 L = 1 000 mL.' },
    { id:'2m55', s:'matematica', t:'Capacidade', type:'mc', diff:2, q:'Quantos copos de 200 mL podes encher com 1 litro?', opts:['2','3','5','10'], ans:2, exp:'1 L = 1000 mL; 1000 ÷ 200 = 5 copos.' },
    { id:'2m56', s:'matematica', t:'Capacidade', type:'fill', diff:2, q:'Uma garrafa de 1,5 L tem ___ mL.', ans:['1500','1 500'], exp:'1,5 L = 1500 mL.' },
    { id:'2m57', s:'matematica', t:'Gráficos', type:'mc', diff:1, q:'Num gráfico de barras, a barra MAIOR significa que essa categoria tem:', opts:['menos','mais','o mesmo','metade'], ans:1, exp:'Quanto maior a barra, MAIOR a quantidade.' },
    { id:'2m58', s:'matematica', t:'Gráficos', type:'mc', diff:2, q:'Os alunos votaram: maçã 8, banana 5, laranja 3. Qual a fruta mais votada?', opts:['banana','laranja','maçã','iguais'], ans:2, exp:'A maçã teve 8 votos — o número MAIOR.' },
    { id:'2m59', s:'matematica', t:'Gráficos', type:'fill', diff:2, q:'Maçã 8, banana 5, laranja 3. Quantos alunos votaram ao TODO? ___', ans:['16'], exp:'Total = 8 + 5 + 3 = 16 alunos.' },

    // ============================================================
    // ===== EXPANSÃO 2.º ano - chegar a 10+ por tópico ===========
    // ============================================================

    // ----- Português: Hiato (já 3, +7) -----
    { id:'2p37', s:'portugues', t:'Hiato', type:'mc', diff:2, q:'A palavra "país" tem:', opts:['ditongo','hiato','sílaba só','consoantes só'], ans:1, exp:'Pa-ís → 2 sílabas, "a" e "í" separados (hiato).' },
    { id:'2p38', s:'portugues', t:'Hiato', type:'fill', diff:2, q:'Quantas sílabas tem "saúde"? ___', ans:['3','três'], exp:'sa-ú-de → 3 sílabas (hiato entre a e ú).' },
    { id:'2p39', s:'portugues', t:'Hiato', type:'tf', diff:2, q:'A palavra "boi" tem hiato.', ans:false, exp:'Falso! "boi" tem 1 sílaba só → ditongo (oi).' },
    { id:'2p40', s:'portugues', t:'Hiato', type:'mc', diff:2, q:'Qual destas tem ditongo (não hiato)?', opts:['baú','pais','pai','saída'], ans:2, exp:'"Pai" = 1 sílaba → ditongo. As outras são hiatos.' },
    { id:'2p41', s:'portugues', t:'Hiato', type:'fill', diff:2, q:'Em "leão" há ___ sílabas.', ans:['3','três'], exp:'le-ã-o → 3 sílabas (hiato).' },
    { id:'2p42', s:'portugues', t:'Hiato', type:'tf', diff:2, q:'Quando há acento numa das vogais juntas, geralmente é hiato.', ans:true, exp:'Verdade — saúde, saída, baú, país... o acento "separa" as vogais.' },

    // ----- Português: Nomes próprios e comuns (+7) -----
    { id:'2p43', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:1, q:'Qual destes é nome PRÓPRIO?', opts:['cidade','livro','Maria','rapaz'], ans:2, exp:'Maria identifica uma pessoa específica → próprio (com maiúscula).' },
    { id:'2p44', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:1, q:'Qual destes é nome COMUM?', opts:['Lisboa','Tejo','Bobi','livro'], ans:3, exp:'Livro dá nome a TODOS os livros → nome comum.' },
    { id:'2p45', s:'portugues', t:'Nomes próprios e comuns', type:'tf', diff:1, q:'Os nomes próprios escrevem-se com maiúscula.', ans:true, exp:'Sempre! João, Lisboa, Tejo, Portugal... maiúscula.' },
    { id:'2p46', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:2, q:'"O cão Bobi correu no parque". Quais são os nomes próprios?', opts:['cão','Bobi','parque','correu'], ans:1, exp:'Bobi é o NOME do cão (próprio). "Cão" e "parque" são comuns.' },
    { id:'2p47', s:'portugues', t:'Nomes próprios e comuns', type:'fill', diff:2, q:'Nome próprio de uma cidade portuguesa: ___', ans:['Lisboa','Porto','Coimbra','Faro','Braga','Aveiro','Évora','Setúbal','Funchal'], exp:'Qualquer cidade portuguesa serve (Lisboa, Porto, Coimbra, etc).' },
    { id:'2p48', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:2, q:'Qual destas frases está CORRETA?', opts:['o joão mora em lisboa','O João mora em Lisboa','o João mora em lisboa','O joão mora em Lisboa'], ans:1, exp:'Início de frase + nomes próprios → todos com maiúscula.' },
    { id:'2p49', s:'portugues', t:'Nomes próprios e comuns', type:'tf', diff:2, q:'"Mãe" e "pai" são nomes próprios.', ans:false, exp:'Falso. São nomes COMUNS (descrevem uma relação familiar geral).' },

    // ----- Português: Adjetivos (+7) -----
    { id:'2p50', s:'portugues', t:'Adjetivos', type:'mc', diff:1, q:'Qual destas palavras é um adjetivo?', opts:['gato','correr','grande','escola'], ans:2, exp:'GRANDE descreve algo (tamanho) → adjetivo.' },
    { id:'2p51', s:'portugues', t:'Adjetivos', type:'mc', diff:1, q:'"O gato preto" — qual é o adjetivo?', opts:['o','gato','preto','frase toda'], ans:2, exp:'PRETO descreve a cor do gato → adjetivo.' },
    { id:'2p52', s:'portugues', t:'Adjetivos', type:'mc', diff:1, q:'O adjetivo concorda com o nome em género e ___', opts:['cor (claro/escuro)','número (singular/plural)','tamanho (grande/pequeno)','peso (leve/pesado)'], ans:1, exp:'Concorda em GÉNERO (masc/fem) e NÚMERO (sing/plural).' },
    { id:'2p53', s:'portugues', t:'Adjetivos', type:'mc', diff:2, q:'Qual frase tem CONCORDÂNCIA correta?', opts:['o menino alta','as menina bonitas','os meninos altos','a meninas alta'], ans:2, exp:'Os (masc. plural) + meninos + altos → tudo concorda.' },
    { id:'2p54', s:'portugues', t:'Adjetivos', type:'fill', diff:2, q:'Feminino plural de "alto" (descrever várias meninas): ___', ans:['altas'], exp:'alta + plural = altas. Ex: "as meninas ALTAS".' },
    { id:'2p55', s:'portugues', t:'Adjetivos', type:'tf', diff:2, q:'"Triste" e "feliz" são adjetivos.', ans:true, exp:'Verdade — descrevem como uma pessoa SE SENTE → adjetivos.' },
    { id:'2p56', s:'portugues', t:'Adjetivos', type:'mc', diff:2, q:'Quantos adjetivos tem "A flor amarela é muito bonita"?', opts:['1','2','3','4'], ans:1, exp:'Dois adjetivos: AMARELA e BONITA (descrevem a flor).' },

    // ----- Português: Género (+7) -----
    { id:'2p57', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:1, q:'Feminino de "rapaz":', opts:['rapazes','rapaza','rapariga','rapacita'], ans:2, exp:'Rapaz → RAPARIGA (palavra completamente diferente).' },
    { id:'2p58', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:1, q:'Feminino de "rei":', opts:['reia','rainha','reizinha','rainheira'], ans:1, exp:'Rei → RAINHA.' },
    { id:'2p59', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:1, q:'Feminino de "homem":', opts:['homema','mulher','homenita','homenzinha'], ans:1, exp:'Homem → MULHER (palavra diferente).' },
    { id:'2p60', s:'portugues', t:'Género (masculino e feminino)', type:'fill', diff:1, q:'Feminino de "menino": ___', ans:['menina'], exp:'Troca-se -o por -a: menino → menina.' },
    { id:'2p61', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:2, q:'Qual destas palavras é só MASCULINA?', opts:['casa','flor','sol','janela'], ans:2, exp:'O sol — só masculino. As outras são femininas.' },
    { id:'2p62', s:'portugues', t:'Género (masculino e feminino)', type:'tf', diff:2, q:'Para passar "professor" para feminino, basta acrescentar "a".', ans:true, exp:'Verdade — professor → professora.' },
    { id:'2p63', s:'portugues', t:'Género (masculino e feminino)', type:'fill', diff:2, q:'Feminino de "cão": ___', ans:['cadela'], exp:'Cão → CADELA (palavra diferente).' },

    // ----- Português: Grau (+7) -----
    { id:'2p64', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:1, q:'Diminutivo de "menino":', opts:['meninão','meninozão','meninozinho','menina'], ans:2, exp:'Menino → meninozinho ou menininho.' },
    { id:'2p65', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:1, q:'Aumentativo de "menino":', opts:['meninozinho','meninão','menininho','menininha'], ans:1, exp:'Meninão = aumentativo (-ão).' },
    { id:'2p66', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:1, q:'Diminutivo de "flor":', opts:['florona','florinha','florezinha','florzinha'], ans:3, exp:'Flor → FLORZINHA (-zinha).' },
    { id:'2p67', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'fill', diff:2, q:'Aumentativo de "casa": ___', ans:['casarão','casona'], exp:'Casa → CASARÃO ou CASONA (aumentativo, com -ão / -ona).' },
    { id:'2p69', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:2, q:'Diminutivo de "cão":', opts:['cãozinho','canzão','caninho','cãozão'], ans:0, exp:'Cão → CÃOZINHO.' },
    { id:'2p70', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:2, q:'Aumentativo de "livro":', opts:['livrinho','livraria','livrão','livreira'], ans:2, exp:'Livro → LIVRÃO (livro grande).' },

    // ----- Português: Verbos passado/futuro (+7) -----
    { id:'2p71', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:1, q:'"Ontem fui à escola." Em que tempo está "fui"?', opts:['presente','passado','futuro','imperativo'], ans:1, exp:'"Ontem" + "fui" → PASSADO.' },
    { id:'2p72', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:1, q:'"Amanhã vou ao parque." Em que tempo está "vou"?', opts:['passado','presente','futuro próximo','condicional'], ans:2, exp:'"Amanhã" + "vou" → FUTURO próximo (vou + verbo).' },
    { id:'2p73', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:2, q:'Qual frase está no PRESENTE?', opts:['Eu cantei.','Eu cantarei.','Eu canto.','Eu cantava.'], ans:2, exp:'"Canto" = agora = presente.' },
    { id:'2p74', s:'portugues', t:'Verbos no passado e futuro', type:'fill', diff:2, q:'Passado de "Eu como" (1.ª pessoa singular): "Eu ___"', ans:['comi'], exp:'Pretérito perfeito: eu COMI.' },
    { id:'2p75', s:'portugues', t:'Verbos no passado e futuro', type:'tf', diff:2, q:'"Vou jogar" significa que vou jogar no futuro.', ans:true, exp:'Verdade — futuro próximo: vou + infinitivo.' },
    { id:'2p76', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:2, q:'Que palavra fala de algo que JÁ ACONTECEU?', opts:['amanhã','agora','ontem','depois'], ans:2, exp:'"Ontem" — fala do passado (já aconteceu).' },
    { id:'2p77', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:2, q:'Que palavra fala de algo que VAI ACONTECER?', opts:['ontem','agora','amanhã','antigamente'], ans:2, exp:'"Amanhã" — fala do futuro (vai acontecer).' },

    // ----- Português: Pontuação (+7) -----
    { id:'2p78', s:'portugues', t:'Pontuação básica', type:'mc', diff:1, q:'Sinal de fim de frase declarativa (afirmativa):', opts:['?','!','.',','], ans:2, exp:'Frase declarativa termina em PONTO FINAL (.).' },
    { id:'2p79', s:'portugues', t:'Pontuação básica', type:'mc', diff:1, q:'Que sinal vai no fim de "Que dia lindo"?', opts:['.','?','!',':'], ans:2, exp:'É exclamação → "Que dia lindo!".' },
    { id:'2p80', s:'portugues', t:'Pontuação básica', type:'tf', diff:1, q:'Depois do ponto final, a próxima palavra começa com letra MAIÚSCULA.', ans:true, exp:'Verdade — sempre maiúscula depois de ponto final.' },
    { id:'2p81', s:'portugues', t:'Pontuação básica', type:'mc', diff:2, q:'Numa lista de 4 coisas, onde NÃO se usa vírgula?', opts:['entre as 2 primeiras','entre as 2 do meio','antes do "e" final','no fim'], ans:2, exp:'Não se usa vírgula antes do "e": "leite, pão, queijo E manteiga".' },
    { id:'2p82', s:'portugues', t:'Pontuação básica', type:'fill', diff:2, q:'Sinal usado para perguntas: ___', ans:['?','interrogação','ponto de interrogação'], exp:'? = ponto de interrogação.' },
    { id:'2p83', s:'portugues', t:'Pontuação básica', type:'mc', diff:2, q:'Que pontuação usas para abrir uma fala? "A Maria disse___ Olá!"', opts:[';',':','.','-'], ans:1, exp:'Dois pontos (:) anunciam uma fala ou citação.' },
    { id:'2p84', s:'portugues', t:'Pontuação básica', type:'tf', diff:2, q:'A vírgula faz uma pausa pequena na frase.', ans:true, exp:'Verdade — vírgula = pausa pequena. Ponto = pausa maior.' },

    // ----- Matemática: Multiplicação (+7) -----
    { id:'2m60', s:'matematica', t:'Multiplicação', type:'mc', diff:1, q:'2 × 6 = ?', opts:['8','12','14','16'], ans:1, exp:'2 × 6 = 12.' },
    { id:'2m61', s:'matematica', t:'Multiplicação', type:'mc', diff:1, q:'3 × 5 = ?', opts:['8','12','15','18'], ans:2, exp:'3 × 5 = 15.' },
    { id:'2m62', s:'matematica', t:'Multiplicação', type:'fill', diff:1, q:'4 × 7 = ___', ans:['28'], exp:'4 × 7 = 28.' },
    { id:'2m63', s:'matematica', t:'Multiplicação', type:'tf', diff:1, q:'5 × 1 = 5.', ans:true, exp:'Verdade — qualquer número × 1 = ele próprio.' },
    { id:'2m64', s:'matematica', t:'Multiplicação', type:'mc', diff:2, q:'4 caixas com 7 chocolates cada. Quantos chocolates?', opts:['11','21','25','28'], ans:3, exp:'4 × 7 = 28 chocolates.' },
    { id:'2m65', s:'matematica', t:'Multiplicação', type:'mc', diff:2, q:'Qual é igual a 6 + 6 + 6?', opts:['3 × 6','6 × 6','6 + 3','3 + 6'], ans:0, exp:'Somar 3 vezes o 6 = 3 × 6 = 18.' },
    { id:'2m66', s:'matematica', t:'Multiplicação', type:'fill', diff:2, q:'7 × 0 = ___', ans:['0','zero'], exp:'Qualquer número × 0 = 0.' },

    // ----- Matemática: Divisão (+7) -----
    { id:'2m67', s:'matematica', t:'Divisão', type:'mc', diff:1, q:'10 ÷ 2 = ?', opts:['2','4','5','8'], ans:2, exp:'10 ÷ 2 = 5.' },
    { id:'2m68', s:'matematica', t:'Divisão', type:'mc', diff:1, q:'15 ÷ 3 = ?', opts:['3','4','5','6'], ans:2, exp:'15 ÷ 3 = 5.' },
    { id:'2m69', s:'matematica', t:'Divisão', type:'fill', diff:1, q:'20 ÷ 4 = ___', ans:['5'], exp:'20 ÷ 4 = 5.' },
    { id:'2m70', s:'matematica', t:'Divisão', type:'tf', diff:2, q:'NÃO se pode dividir por 0.', ans:true, exp:'Verdade — divisão por 0 não existe.' },
    { id:'2m71', s:'matematica', t:'Divisão', type:'mc', diff:2, q:'24 doces para 6 amigos, igual partilha. Quantos cada um?', opts:['2','3','4','5'], ans:2, exp:'24 ÷ 6 = 4 doces para cada amigo.' },
    { id:'2m72', s:'matematica', t:'Divisão', type:'mc', diff:2, q:'Se 5 × 6 = 30, então 30 ÷ 5 = ?', opts:['5','6','25','35'], ans:1, exp:'Divisão é o inverso da multiplicação: 30 ÷ 5 = 6.' },
    { id:'2m73', s:'matematica', t:'Divisão', type:'fill', diff:2, q:'9 ÷ 9 = ___', ans:['1'], exp:'Qualquer número (≠0) dividido por ele próprio = 1.' },

    // ----- Matemática: Tabuada do 3 (+7) -----
    { id:'2m74', s:'matematica', t:'Tabuada do 3', type:'mc', diff:1, q:'3 × 4 = ?', opts:['7','9','12','15'], ans:2, exp:'3 × 4 = 12.' },
    { id:'2m75', s:'matematica', t:'Tabuada do 3', type:'mc', diff:1, q:'3 × 6 = ?', opts:['12','15','18','21'], ans:2, exp:'3 × 6 = 18.' },
    { id:'2m76', s:'matematica', t:'Tabuada do 3', type:'mc', diff:1, q:'3 × 8 = ?', opts:['18','21','24','27'], ans:2, exp:'3 × 8 = 24.' },
    { id:'2m77', s:'matematica', t:'Tabuada do 3', type:'fill', diff:1, q:'3 × 5 = ___', ans:['15'], exp:'3 × 5 = 15.' },
    { id:'2m78', s:'matematica', t:'Tabuada do 3', type:'fill', diff:1, q:'3 × 10 = ___', ans:['30'], exp:'3 × 10 = 30.' },
    { id:'2m79', s:'matematica', t:'Tabuada do 3', type:'tf', diff:2, q:'24 é múltiplo de 3.', ans:true, exp:'2+4=6 → múltiplo de 3 ✓ (de facto: 3×8=24).' },
    { id:'2m80', s:'matematica', t:'Tabuada do 3', type:'mc', diff:2, q:'5 caixas com 3 lápis cada. Quantos lápis?', opts:['8','12','15','18'], ans:2, exp:'5 × 3 = 15 lápis.' },

    // ----- Matemática: Tabuada do 4 (+7) -----
    { id:'2m81', s:'matematica', t:'Tabuada do 4', type:'mc', diff:1, q:'4 × 3 = ?', opts:['9','12','15','16'], ans:1, exp:'4 × 3 = 12.' },
    { id:'2m82', s:'matematica', t:'Tabuada do 4', type:'mc', diff:1, q:'4 × 5 = ?', opts:['16','18','20','24'], ans:2, exp:'4 × 5 = 20.' },
    { id:'2m83', s:'matematica', t:'Tabuada do 4', type:'mc', diff:1, q:'4 × 7 = ?', opts:['24','28','32','36'], ans:1, exp:'4 × 7 = 28.' },
    { id:'2m84', s:'matematica', t:'Tabuada do 4', type:'fill', diff:1, q:'4 × 9 = ___', ans:['36'], exp:'4 × 9 = 36.' },
    { id:'2m85', s:'matematica', t:'Tabuada do 4', type:'fill', diff:1, q:'4 × 10 = ___', ans:['40'], exp:'4 × 10 = 40.' },
    { id:'2m86', s:'matematica', t:'Tabuada do 4', type:'mc', diff:2, q:'Quantas patas têm 4 cães?', opts:['12','16','20','24'], ans:1, exp:'4 cães × 4 patas = 16 patas.' },
    { id:'2m87', s:'matematica', t:'Tabuada do 4', type:'tf', diff:2, q:'Os múltiplos de 4 são todos pares.', ans:true, exp:'Verdade — 4, 8, 12, 16, 20... todos pares.' },

    // ----- Matemática: Tabuada do 6 (+7) -----
    { id:'2m88', s:'matematica', t:'Tabuada do 6', type:'mc', diff:1, q:'6 × 2 = ?', opts:['8','10','12','14'], ans:2, exp:'6 × 2 = 12.' },
    { id:'2m89', s:'matematica', t:'Tabuada do 6', type:'mc', diff:1, q:'6 × 4 = ?', opts:['18','20','24','30'], ans:2, exp:'6 × 4 = 24.' },
    { id:'2m90', s:'matematica', t:'Tabuada do 6', type:'mc', diff:1, q:'6 × 6 = ?', opts:['30','36','42','48'], ans:1, exp:'6 × 6 = 36.' },
    { id:'2m91', s:'matematica', t:'Tabuada do 6', type:'fill', diff:1, q:'6 × 8 = ___', ans:['48'], exp:'6 × 8 = 48.' },
    { id:'2m92', s:'matematica', t:'Tabuada do 6', type:'fill', diff:1, q:'6 × 10 = ___', ans:['60'], exp:'6 × 10 = 60.' },
    { id:'2m93', s:'matematica', t:'Tabuada do 6', type:'mc', diff:2, q:'Uma dúzia tem 12 ovos. Quantos ovos têm 6 dúzias?', opts:['36','60','72','84'], ans:2, exp:'6 × 12 = 72 ovos. (Pista: 6 × 12 = 6×10 + 6×2 = 60+12 = 72.)' },
    { id:'2m94', s:'matematica', t:'Tabuada do 6', type:'tf', diff:2, q:'18 é múltiplo de 6.', ans:true, exp:'Verdade — 6 × 3 = 18.' },

    // ----- Matemática: Tabuada do 7 (+7) -----
    { id:'2m95', s:'matematica', t:'Tabuada do 7', type:'mc', diff:1, q:'7 × 3 = ?', opts:['14','18','21','24'], ans:2, exp:'7 × 3 = 21.' },
    { id:'2m96', s:'matematica', t:'Tabuada do 7', type:'mc', diff:1, q:'7 × 5 = ?', opts:['25','30','35','40'], ans:2, exp:'7 × 5 = 35.' },
    { id:'2m97', s:'matematica', t:'Tabuada do 7', type:'mc', diff:2, q:'7 × 6 = ?', opts:['36','42','48','54'], ans:1, exp:'7 × 6 = 42.' },
    { id:'2m98', s:'matematica', t:'Tabuada do 7', type:'fill', diff:1, q:'7 × 4 = ___', ans:['28'], exp:'7 × 4 = 28.' },
    { id:'2m99', s:'matematica', t:'Tabuada do 7', type:'fill', diff:1, q:'7 × 10 = ___', ans:['70'], exp:'7 × 10 = 70.' },
    { id:'2m100', s:'matematica', t:'Tabuada do 7', type:'mc', diff:2, q:'Quantos dias têm 5 semanas?', opts:['28','30','35','40'], ans:2, exp:'5 semanas × 7 dias = 35 dias.' },
    { id:'2m101', s:'matematica', t:'Tabuada do 7', type:'tf', diff:2, q:'63 é múltiplo de 7.', ans:true, exp:'Verdade — 7 × 9 = 63.' },

    // ----- Matemática: Tabuada do 8 (+7) -----
    { id:'2m102', s:'matematica', t:'Tabuada do 8', type:'mc', diff:1, q:'8 × 3 = ?', opts:['16','21','24','28'], ans:2, exp:'8 × 3 = 24.' },
    { id:'2m103', s:'matematica', t:'Tabuada do 8', type:'mc', diff:1, q:'8 × 4 = ?', opts:['28','32','36','40'], ans:1, exp:'8 × 4 = 32.' },
    { id:'2m104', s:'matematica', t:'Tabuada do 8', type:'mc', diff:1, q:'8 × 6 = ?', opts:['42','48','54','56'], ans:1, exp:'8 × 6 = 48.' },
    { id:'2m105', s:'matematica', t:'Tabuada do 8', type:'fill', diff:1, q:'8 × 8 = ___', ans:['64'], exp:'8 × 8 = 64.' },
    { id:'2m106', s:'matematica', t:'Tabuada do 8', type:'fill', diff:1, q:'8 × 9 = ___', ans:['72'], exp:'8 × 9 = 72.' },
    { id:'2m107', s:'matematica', t:'Tabuada do 8', type:'mc', diff:2, q:'Um polvo tem 8 patas. Quantas patas têm 4 polvos?', opts:['24','28','32','40'], ans:2, exp:'4 × 8 = 32 patas.' },
    { id:'2m108', s:'matematica', t:'Tabuada do 8', type:'tf', diff:2, q:'Os múltiplos de 8 são todos pares.', ans:true, exp:'Verdade — 8, 16, 24, 32... todos pares.' },

    // ----- Matemática: Tabuada do 9 (+7) -----
    { id:'2m109', s:'matematica', t:'Tabuada do 9', type:'mc', diff:1, q:'9 × 3 = ?', opts:['21','24','27','30'], ans:2, exp:'9 × 3 = 27.' },
    { id:'2m110', s:'matematica', t:'Tabuada do 9', type:'mc', diff:1, q:'9 × 5 = ?', opts:['35','40','45','50'], ans:2, exp:'9 × 5 = 45.' },
    { id:'2m111', s:'matematica', t:'Tabuada do 9', type:'mc', diff:1, q:'9 × 6 = ?', opts:['45','54','56','63'], ans:1, exp:'9 × 6 = 54 (truque: 60−6=54).' },
    { id:'2m112', s:'matematica', t:'Tabuada do 9', type:'fill', diff:1, q:'9 × 8 = ___', ans:['72'], exp:'9 × 8 = 72.' },
    { id:'2m113', s:'matematica', t:'Tabuada do 9', type:'fill', diff:1, q:'9 × 10 = ___', ans:['90'], exp:'9 × 10 = 90.' },
    { id:'2m114', s:'matematica', t:'Tabuada do 9', type:'tf', diff:2, q:'Os algarismos de 9×3 (=27) somados dão 9.', ans:true, exp:'2+7=9 ✓ Truque mágico — múltiplos de 9 somam sempre 9.' },
    { id:'2m115', s:'matematica', t:'Tabuada do 9', type:'mc', diff:2, q:'9 × 9 = ?', opts:['72','81','90','99'], ans:1, exp:'9 × 9 = 81 (8+1=9 ✓).' },

    // ----- Matemática: Frações simples (+7) -----
    { id:'2m116', s:'matematica', t:'Frações simples', type:'mc', diff:1, q:'Metade de 10 é:', opts:['2','3','5','8'], ans:2, exp:'Metade = ÷ 2 → 10 ÷ 2 = 5.' },
    { id:'2m117', s:'matematica', t:'Frações simples', type:'mc', diff:1, q:'1/4 de 8 é:', opts:['2','3','4','5'], ans:0, exp:'1/4 = ÷ 4 → 8 ÷ 4 = 2.' },
    { id:'2m118', s:'matematica', t:'Frações simples', type:'fill', diff:1, q:'Como se lê 1/2?', ans:['metade','um meio'], exp:'1/2 = "um meio" ou "metade".' },
    { id:'2m119', s:'matematica', t:'Frações simples', type:'fill', diff:1, q:'Como se lê 1/4?', ans:['um quarto'], exp:'1/4 = "um quarto".' },
    { id:'2m120', s:'matematica', t:'Frações simples', type:'mc', diff:2, q:'Metade + metade = ?', opts:['1/4','1 (inteiro)','2','1/2'], ans:1, exp:'1/2 + 1/2 = 1 inteiro.' },
    { id:'2m121', s:'matematica', t:'Frações simples', type:'tf', diff:2, q:'2/4 é igual a 1/2.', ans:true, exp:'Verdade — 2/4 simplifica para 1/2 (são frações equivalentes).' },
    { id:'2m122', s:'matematica', t:'Frações simples', type:'mc', diff:2, q:'1/3 de 9 é:', opts:['2','3','4','6'], ans:1, exp:'1/3 = ÷ 3 → 9 ÷ 3 = 3.' },

    // ----- Matemática: Comprimento (+7) -----
    { id:'2m123', s:'matematica', t:'Comprimento', type:'mc', diff:1, q:'Para medir um lápis usas:', opts:['mm','cm','m','km'], ans:1, exp:'Centímetros (cm) — adequado para coisas pequenas como um lápis.' },
    { id:'2m124', s:'matematica', t:'Comprimento', type:'mc', diff:1, q:'1 dm tem quantos cm?', opts:['10','100','1000','60'], ans:0, exp:'1 dm = 10 cm.' },
    { id:'2m125', s:'matematica', t:'Comprimento', type:'mc', diff:2, q:'Que instrumento usas para medir o comprimento?', opts:['balança','régua','copo','relógio'], ans:1, exp:'Régua ou fita métrica → comprimento.' },
    { id:'2m126', s:'matematica', t:'Comprimento', type:'fill', diff:2, q:'2 m = ___ cm', ans:['200'], exp:'1 m = 100 cm; 2 m = 200 cm.' },
    { id:'2m127', s:'matematica', t:'Comprimento', type:'fill', diff:2, q:'3 km = ___ m', ans:['3000','3 000'], exp:'1 km = 1000 m; 3 km = 3000 m.' },
    { id:'2m128', s:'matematica', t:'Comprimento', type:'tf', diff:1, q:'A distância entre duas cidades mede-se em km.', ans:true, exp:'Verdade — quilómetros para distâncias grandes.' },
    { id:'2m129', s:'matematica', t:'Comprimento', type:'mc', diff:2, q:'Quanto mede a altura típica de um adulto?', opts:['17 cm','170 cm','17 m','17 km'], ans:1, exp:'~170 cm (1,70 m) é a altura típica de um adulto.' },

    // ----- Matemática: Massa (+7) -----
    { id:'2m130', s:'matematica', t:'Massa', type:'mc', diff:1, q:'Para medir massa usas:', opts:['régua','balança','copo','transferidor'], ans:1, exp:'A balança mede a massa.' },
    { id:'2m131', s:'matematica', t:'Massa', type:'mc', diff:1, q:'1 kg tem quantos g?', opts:['10','100','1000','60'], ans:2, exp:'1 kg = 1000 g.' },
    { id:'2m132', s:'matematica', t:'Massa', type:'mc', diff:2, q:'Para um saco grande de batatas, a unidade adequada é:', opts:['mg','g','kg','t'], ans:2, exp:'Quilogramas (kg) — adequado para sacos de alimentos.' },
    { id:'2m133', s:'matematica', t:'Massa', type:'fill', diff:2, q:'2 kg = ___ g', ans:['2000','2 000'], exp:'1 kg = 1000 g; 2 kg = 2000 g.' },
    { id:'2m134', s:'matematica', t:'Massa', type:'fill', diff:2, q:'½ kg = ___ g', ans:['500'], exp:'Metade de 1 kg (=1000g) = 500 g.' },
    { id:'2m135', s:'matematica', t:'Massa', type:'tf', diff:2, q:'Um carro pesa cerca de 1 tonelada (= 1000 kg).', ans:true, exp:'Verdade — um carro pequeno pesa ~1 t = 1000 kg.' },
    { id:'2m136', s:'matematica', t:'Massa', type:'mc', diff:2, q:'Qual destes pesa mais?', opts:['1 kg de algodão','1 kg de chumbo','pesam o mesmo','1 g de chumbo'], ans:2, exp:'1 kg = 1 kg, qualquer que seja o material!' },

    // ----- Matemática: Capacidade (+7) -----
    { id:'2m137', s:'matematica', t:'Capacidade', type:'mc', diff:1, q:'Para medir líquido usas:', opts:['régua','balança','copo medidor','transferidor'], ans:2, exp:'Copo medidor (graduado) → capacidade.' },
    { id:'2m138', s:'matematica', t:'Capacidade', type:'mc', diff:1, q:'1 L tem quantos mL?', opts:['10','100','1000','60'], ans:2, exp:'1 L = 1000 mL.' },
    { id:'2m139', s:'matematica', t:'Capacidade', type:'mc', diff:2, q:'Uma garrafa pequena de água é mais ou menos:', opts:['33 mL','330 mL','3,3 L','33 L'], ans:1, exp:'Uma garrafa pequena (lata refrigerante): ~330 mL.' },
    { id:'2m140', s:'matematica', t:'Capacidade', type:'fill', diff:2, q:'2 L = ___ mL', ans:['2000','2 000'], exp:'1 L = 1000 mL; 2 L = 2000 mL.' },
    { id:'2m141', s:'matematica', t:'Capacidade', type:'fill', diff:2, q:'½ L = ___ mL', ans:['500'], exp:'Metade de 1 L = 500 mL.' },
    { id:'2m142', s:'matematica', t:'Capacidade', type:'tf', diff:2, q:'Um copo de água tem cerca de 200 mL.', ans:true, exp:'Verdade — copo normal de água ≈ 200 mL.' },
    { id:'2m143', s:'matematica', t:'Capacidade', type:'mc', diff:2, q:'Quantos copos de 250 mL podes encher com 1 L de leite?', opts:['2','3','4','5'], ans:2, exp:'1000 ÷ 250 = 4 copos.' },

    // ----- Matemática: Gráficos (+7) -----
    { id:'2m144', s:'matematica', t:'Gráficos', type:'mc', diff:2, q:'Num gráfico de barras, a barra MAIS BAIXA significa:', opts:['mais','menos','o mesmo','dobro'], ans:1, exp:'Barra mais BAIXA = menor quantidade.' },
    { id:'2m145', s:'matematica', t:'Gráficos', type:'mc', diff:2, q:'O que mostra um pictograma?', opts:['imagens que representam quantidades','apenas números, sem desenhos','apenas letras do alfabeto','apenas linhas retas'], ans:0, exp:'Pictograma usa IMAGENS/desenhos para mostrar quantidades.' },
    { id:'2m146', s:'matematica', t:'Gráficos', type:'mc', diff:3, q:'Numa tabela: cães=4, gatos=6, pássaros=2. Quantos animais ao todo?', opts:['8','10','12','14'], ans:2, exp:'4 + 6 + 2 = 12.' },
    { id:'2m147', s:'matematica', t:'Gráficos', type:'mc', diff:2, q:'Mesma tabela. Quantos cães a MAIS que pássaros?', opts:['1','2','3','4'], ans:1, exp:'Cães − pássaros = 4 − 2 = 2.' },
    { id:'2m148', s:'matematica', t:'Gráficos', type:'fill', diff:2, q:'Mesma tabela. Animal mais frequente: ___', ans:['gatos','gato'], exp:'Gatos = 6 → o maior número.' },
    { id:'2m149', s:'matematica', t:'Gráficos', type:'tf', diff:2, q:'Antes de interpretar um gráfico, deve-se ler o título e os eixos.', ans:true, exp:'Verdade — título e eixos dizem o que está a ser representado.' },
    { id:'2m150', s:'matematica', t:'Gráficos', type:'mc', diff:2, q:'Voto: maçã 5, banana 5, pêra 3. Qual a fruta MENOS votada?', opts:['maçã','banana','pêra','iguais'], ans:2, exp:'A pêra com 3 votos é a menor.' },

    // ----- Estudo do Meio: Astros (+7) -----
    { id:'2e30', s:'estudo_meio', t:'Astros', type:'mc', diff:1, q:'Quantos planetas tem o Sistema Solar?', opts:['7','8','9','10'], ans:1, exp:'8 planetas (Plutão deixou de ser planeta em 2006).' },
    { id:'2e31', s:'estudo_meio', t:'Astros', type:'mc', diff:1, q:'Em que planeta vivemos?', opts:['Marte','Vénus','Terra','Júpiter'], ans:2, exp:'Vivemos no planeta TERRA.' },
    { id:'2e32', s:'estudo_meio', t:'Astros', type:'mc', diff:2, q:'O movimento da Terra que dá origem ao ANO chama-se:', opts:['rotação','translação','revolução','vibração'], ans:1, exp:'TRANSLAÇÃO = volta da Terra ao Sol em 365 dias.' },
    { id:'2e33', s:'estudo_meio', t:'Astros', type:'fill', diff:2, q:'Único satélite natural da Terra: ___', ans:['Lua','lua'], exp:'A Lua é o único satélite natural da Terra.' },
    { id:'2e34', s:'estudo_meio', t:'Astros', type:'tf', diff:1, q:'O Sol é maior do que a Terra.', ans:true, exp:'Verdade — o Sol é MUITO maior que a Terra.' },
    { id:'2e35', s:'estudo_meio', t:'Astros', type:'mc', diff:2, q:'Quando vemos a Lua TODA iluminada, é:', opts:['Lua Nova','Quarto Crescente','Lua Cheia','Quarto Minguante'], ans:2, exp:'Lua CHEIA = vemos a face inteira iluminada.' },
    { id:'2e36', s:'estudo_meio', t:'Astros', type:'mc', diff:2, q:'As estrelas vêem-se MELHOR:', opts:['de manhã','ao meio-dia','à noite','quando chove'], ans:2, exp:'À NOITE — sem a luz forte do Sol, vemos as estrelas.' },

    // ----- Estudo do Meio: Transportes (+7) -----
    { id:'2e37', s:'estudo_meio', t:'Transportes', type:'mc', diff:1, q:'Avião é um transporte:', opts:['terrestre','aquático','aéreo','espacial'], ans:2, exp:'Avião anda no AR → aéreo.' },
    { id:'2e38', s:'estudo_meio', t:'Transportes', type:'mc', diff:1, q:'Comboio é um transporte:', opts:['aéreo','terrestre','aquático','submarino'], ans:1, exp:'Comboio anda em terra (carris) → terrestre.' },
    { id:'2e39', s:'estudo_meio', t:'Transportes', type:'mc', diff:1, q:'Submarino é um transporte:', opts:['aéreo','terrestre','aquático','espacial'], ans:2, exp:'Submarino anda DEBAIXO de água → aquático.' },
    { id:'2e40', s:'estudo_meio', t:'Transportes', type:'mc', diff:2, q:'Qual é um transporte PÚBLICO?', opts:['carro','bicicleta','autocarro','trotineta'], ans:2, exp:'Autocarro = público (transporta muitas pessoas).' },
    { id:'2e41', s:'estudo_meio', t:'Transportes', type:'tf', diff:1, q:'Devemos atravessar a estrada na passadeira.', ans:true, exp:'Sempre — passadeira (e ver para os 2 lados antes).' },
    { id:'2e42', s:'estudo_meio', t:'Transportes', type:'fill', diff:2, q:'Equipamento de proteção da cabeça quando andas de bicicleta: ___', ans:['capacete'], exp:'CAPACETE — protege a cabeça em caso de queda.' },
    { id:'2e43', s:'estudo_meio', t:'Transportes', type:'mc', diff:2, q:'Que transporte é mais ECOLÓGICO?', opts:['carro','autocarro','bicicleta','avião'], ans:2, exp:'Bicicleta — não polui e faz exercício.' },

    // ----- Estudo do Meio: Higiene (+7) -----
    { id:'2e44', s:'estudo_meio', t:'Higiene', type:'mc', diff:1, q:'Antes das refeições deves:', opts:['ver TV','lavar as mãos','dormir','correr'], ans:1, exp:'LAVAR AS MÃOS antes de comer (evita doenças).' },
    { id:'2e45', s:'estudo_meio', t:'Higiene', type:'mc', diff:1, q:'Devemos tomar banho:', opts:['1 vez por mês','1 vez por semana','todos os dias','nunca'], ans:2, exp:'Banho diário (ou pelo menos quase todos os dias).' },
    { id:'2e46', s:'estudo_meio', t:'Higiene', type:'mc', diff:2, q:'Quem trata dos dentes é o:', opts:['médico de família','dentista','enfermeiro','farmacêutico'], ans:1, exp:'DENTISTA — vai pelo menos 1 vez por ano.' },
    { id:'2e47', s:'estudo_meio', t:'Higiene', type:'tf', diff:1, q:'Devemos escovar os dentes pelo menos 2 vezes por dia.', ans:true, exp:'Verdade — ideal são 3 vezes (manhã, almoço, antes de dormir).' },
    { id:'2e48', s:'estudo_meio', t:'Higiene', type:'fill', diff:2, q:'Os buracos nos dentes que aparecem por má higiene chamam-se ___', ans:['cáries','caries','cárie','carie'], exp:'CÁRIES — buracos causados por bactérias dos restos de comida.' },
    { id:'2e49', s:'estudo_meio', t:'Higiene', type:'mc', diff:2, q:'Qual destes hábitos NÃO é de higiene?', opts:['lavar as mãos','escovar os dentes','tomar banho','jogar à bola'], ans:3, exp:'Jogar à bola é desporto — não higiene (mas também é importante!).' },
    { id:'2e50', s:'estudo_meio', t:'Higiene', type:'mc', diff:2, q:'Para que serve a pasta de dentes com FLÚOR?', opts:['só para o sabor','para fortalecer os dentes','para mudar a cor','para nada'], ans:1, exp:'O FLÚOR fortalece o esmalte dos dentes e previne cáries.' },

    // ----- Estudo do Meio: Saúde (+7) -----
    { id:'2e51', s:'estudo_meio', t:'Saúde', type:'mc', diff:1, q:'Para sermos saudáveis devemos comer:', opts:['só doces','só batatas fritas','fruta e legumes','só hambúrgueres'], ans:2, exp:'Fruta e legumes são fundamentais.' },
    { id:'2e52', s:'estudo_meio', t:'Saúde', type:'mc', diff:1, q:'Quanta água devemos beber por dia?', opts:['1 copo','muito pouco','1,5 a 2 litros','5 litros'], ans:2, exp:'Crianças: ~1,5 L de água por dia.' },
    { id:'2e53', s:'estudo_meio', t:'Saúde', type:'mc', diff:2, q:'Qual destes é um exercício físico?', opts:['ver TV','jogar futebol','dormir','comer'], ans:1, exp:'Jogar futebol = exercício físico (faz bem ao corpo).' },
    { id:'2e54', s:'estudo_meio', t:'Saúde', type:'tf', diff:1, q:'Devemos passar o dia inteiro nos ecrãs (telemóvel/TV).', ans:false, exp:'Falso — limitar tempo de ecrãs e fazer outras atividades.' },
    { id:'2e55', s:'estudo_meio', t:'Saúde', type:'fill', diff:2, q:'Quem nos protege de doenças graves quando ainda somos pequenos: as ___', ans:['vacinas'], exp:'VACINAS — protegem contra doenças como sarampo, tétano, polio.' },
    { id:'2e56', s:'estudo_meio', t:'Saúde', type:'mc', diff:2, q:'Quantas refeições principais devemos fazer por dia?', opts:['1','2','3 a 5','10'], ans:2, exp:'3 principais (pequeno-almoço, almoço, jantar) + 1-2 lanches.' },
    { id:'2e57', s:'estudo_meio', t:'Saúde', type:'mc', diff:2, q:'A roda dos alimentos está dividida em quantos grupos?', opts:['3','5','7','10'], ans:2, exp:'A Roda dos Alimentos tem 7 grupos.' },

    // ----- Estudo do Meio: Comemorações (+7) -----
    { id:'2e58', s:'estudo_meio', t:'Comemorações', type:'mc', diff:1, q:'O Dia da Mãe é em:', opts:['janeiro','maio','setembro','dezembro'], ans:1, exp:'1.º domingo de MAIO.' },
    { id:'2e59', s:'estudo_meio', t:'Comemorações', type:'mc', diff:1, q:'O Dia do Pai em Portugal é em:', opts:['março','junho','novembro','dezembro'], ans:0, exp:'19 de MARÇO (dia de São José).' },
    { id:'2e60', s:'estudo_meio', t:'Comemorações', type:'mc', diff:1, q:'O Dia da Criança é a:', opts:['25 de abril','1 de junho','25 de dezembro','1 de janeiro'], ans:1, exp:'1 de JUNHO — Dia Mundial da Criança.' },
    { id:'2e61', s:'estudo_meio', t:'Comemorações', type:'mc', diff:1, q:'Em que dia se celebra o Dia de Portugal?', opts:['25 de abril','10 de junho','5 de outubro','1 de dezembro'], ans:1, exp:'10 de JUNHO — Dia de Portugal, de Camões e das Comunidades.' },
    { id:'2e62', s:'estudo_meio', t:'Comemorações', type:'tf', diff:2, q:'O Carnaval celebra-se sempre em fevereiro.', ans:false, exp:'Falso — o Carnaval depende da Páscoa, pode ser em fevereiro OU março.' },
    { id:'2e63', s:'estudo_meio', t:'Comemorações', type:'fill', diff:2, q:'No Natal, presépio representa o nascimento de ___', ans:['Jesus','jesus'], exp:'O presépio mostra o nascimento de Jesus em Belém.' },
    { id:'2e64', s:'estudo_meio', t:'Comemorações', type:'mc', diff:2, q:'Festa do Dia das Bruxas (origem americana):', opts:['Carnaval','Páscoa','Halloween','São João'], ans:2, exp:'HALLOWEEN — 31 de outubro, festa americana com fatos e doces.' },

    // ----- Inglês: Alfabeto (+7) -----
    { id:'2i32', s:'ingles', t:'Alfabeto', type:'mc', diff:2, q:'Como se diz "A" em inglês?', opts:['"a"','"ei"','"ah"','"ai"'], ans:1, exp:'A letra A em inglês diz-se "ei".' },
    { id:'2i33', s:'ingles', t:'Alfabeto', type:'mc', diff:2, q:'Como se diz "I" em inglês?', opts:['"i"','"ai"','"ih"','"ee"'], ans:1, exp:'A letra I em inglês diz-se "ai".' },
    { id:'2i34', s:'ingles', t:'Alfabeto', type:'mc', diff:2, q:'Como se diz "E" em inglês?', opts:['"e"','"ei"','"i"','"u"'], ans:2, exp:'A letra E em inglês diz-se "i".' },
    { id:'2i35', s:'ingles', t:'Alfabeto', type:'tf', diff:1, q:'A letra "Y" existe no alfabeto inglês.', ans:true, exp:'Sim — Y é a 25.ª letra.' },
    { id:'2i36', s:'ingles', t:'Alfabeto', type:'mc', diff:2, q:'"Spell" em inglês significa:', opts:['cantar','soletrar','correr','falar'], ans:1, exp:'"Spell" = SOLETRAR. "How do you spell?" = Como se soletra?' },
    { id:'2i37', s:'ingles', t:'Alfabeto', type:'mc', diff:2, q:'Letra que vem antes do A: nenhuma. Letra DEPOIS do Z: também nenhuma. E depois do M?', opts:['L','N','O','P'], ans:1, exp:'M → N → O. Vem o N.' },

    // ----- Inglês: Body (+7) -----
    { id:'2i38', s:'ingles', t:'Body', type:'mc', diff:1, q:'👃 em inglês:', opts:['nose','ear','mouth'], ans:0, exp:'👃 = nose (nariz).' },
    { id:'2i39', s:'ingles', t:'Body', type:'mc', diff:1, q:'👂 em inglês:', opts:['eye','ear','arm'], ans:1, exp:'👂 = ear (orelha).' },
    { id:'2i40', s:'ingles', t:'Body', type:'mc', diff:1, q:'🦶 em inglês:', opts:['hand','foot','head'], ans:1, exp:'🦶 = foot (pé). Plural: feet.' },
    { id:'2i41', s:'ingles', t:'Body', type:'mc', diff:1, q:'👄 em inglês:', opts:['mouth','tongue','tooth'], ans:0, exp:'👄 = mouth (boca).' },
    { id:'2i42', s:'ingles', t:'Body', type:'fill', diff:2, q:'Plural de "foot" em inglês: ___', ans:['feet'], exp:'foot → feet (plural irregular).' },
    { id:'2i43', s:'ingles', t:'Body', type:'tf', diff:2, q:'Em inglês, "head" significa cabeça.', ans:true, exp:'Verdade — head = cabeça.' },
    { id:'2i44', s:'ingles', t:'Body', type:'mc', diff:2, q:'Quantos olhos tens? Em inglês:', opts:['I have one eye','I have two eyes','I have three eyes','I have ten eyes'], ans:1, exp:'Two eyes = dois olhos.' },

    // ----- Inglês: Food (+7) -----
    { id:'2i45', s:'ingles', t:'Food', type:'mc', diff:1, q:'🍌 em inglês:', opts:['apple','orange','banana'], ans:2, exp:'Banana em inglês é banana — escreve-se igual, mas lê-se ba-NA-na.' },
    { id:'2i46', s:'ingles', t:'Food', type:'mc', diff:1, q:'🍊 em inglês:', opts:['orange','apple','pear'], ans:0, exp:'🍊 = orange (laranja).' },
    { id:'2i47', s:'ingles', t:'Food', type:'mc', diff:1, q:'🥛 em inglês:', opts:['water','milk','juice'], ans:1, exp:'🥛 = milk (leite).' },
    { id:'2i48', s:'ingles', t:'Food', type:'mc', diff:1, q:'💧 (água) em inglês:', opts:['milk','wine','water'], ans:2, exp:'Água em inglês é water (lê-se uó-ter).' },
    { id:'2i49', s:'ingles', t:'Food', type:'mc', diff:2, q:'"Tenho sede" em inglês:', opts:['I am hungry','I am thirsty','I am tired','I am happy'], ans:1, exp:'I am thirsty = Tenho sede. (Hungry = fome.)' },
    { id:'2i50', s:'ingles', t:'Food', type:'fill', diff:2, q:'🍞 em inglês: ___', ans:['bread'], exp:'🍞 = bread (pão).' },
    { id:'2i51', s:'ingles', t:'Food', type:'tf', diff:2, q:'"Cheese" em inglês significa queijo.', ans:true, exp:'Verdade — cheese = queijo.' },

    // ----- Inglês: Toys (+7) -----
    { id:'2i52', s:'ingles', t:'Toys', type:'mc', diff:1, q:'🐻 (peluche) em inglês:', opts:['cat','teddy bear','dog'], ans:1, exp:'🐻 = teddy bear (ursinho de peluche).' },
    { id:'2i53', s:'ingles', t:'Toys', type:'mc', diff:1, q:'⚽ em inglês:', opts:['car','ball','book'], ans:1, exp:'⚽ = ball (bola).' },
    { id:'2i54', s:'ingles', t:'Toys', type:'mc', diff:1, q:'🚗 em inglês:', opts:['car','train','plane'], ans:0, exp:'🚗 = car (carro).' },
    { id:'2i55', s:'ingles', t:'Toys', type:'mc', diff:1, q:'🪆 (boneca) em inglês:', opts:['ball','book','doll'], ans:2, exp:'🪆 = doll (boneca).' },
    { id:'2i56', s:'ingles', t:'Toys', type:'mc', diff:2, q:'"Vamos brincar!" em inglês:', opts:["Let's eat!","Let's play!","Let's sleep!"], ans:1, exp:"Let's play! (play = brincar/jogar)." },
    { id:'2i57', s:'ingles', t:'Toys', type:'fill', diff:2, q:'🚲 (bicicleta) em inglês: ___', ans:['bike','bicycle'], exp:'🚲 = bike ou bicycle.' },
    { id:'2i58', s:'ingles', t:'Toys', type:'tf', diff:2, q:'"Book" em inglês significa livro.', ans:true, exp:'Verdade — book = livro.' },

    // ============================================================
    // ===== EXTRA-DESAFIO 2.º ano - perguntas mais elevadas ======
    // (mantendo linguagem para 7-8 anos: contexto do dia-a-dia,
    //  frases curtas, mas com problemas que obrigam a pensar mais)
    // ============================================================

    // ----- Português: Hiato (+5 desafio) -----
    { id:'2p85', s:'portugues', t:'Hiato', type:'mc', diff:2, q:'Quantas palavras desta frase TÊM hiato? "O baú do meu avô caiu na saída."', opts:['1','2','3','4'], ans:2, exp:'baú, avô (não tem!), saída → 2 com hiato (baú, saída). "Avô" tem só vogal "ô" no final.' },
    { id:'2p86', s:'portugues', t:'Hiato', type:'mc', diff:2, q:'Em "país-pai-paiol", quantas têm hiato?', opts:['nenhuma','uma (país)','duas','todas'], ans:1, exp:'Só "país" tem hiato (pa-ís). "pai" e "paiol" têm ditongo (ai).' },
    { id:'2p87', s:'portugues', t:'Hiato', type:'fill', diff:2, q:'Acrescenta o acento que falta para criar hiato: "saude" → ___', ans:['saúde'], exp:'saúde — acento no "ú" → cria hiato (sa-ú-de).' },
    { id:'2p88', s:'portugues', t:'Hiato', type:'mc', diff:3, q:'Qual destas tem MAIS sílabas?', opts:['boi (1)','baú (2)','herói (2)','saída (3)'], ans:3, exp:'saída tem 3 sílabas (sa-í-da). As outras têm 1 ou 2.' },
    { id:'2p89', s:'portugues', t:'Hiato', type:'tf', diff:2, q:'Em "dia", o "i" e o "a" formam um hiato.', ans:true, exp:'Verdade — di-a → 2 sílabas, "i" e "a" separados → hiato.' },

    // ----- Português: Nomes próprios e comuns (+5) -----
    { id:'2p90', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:2, q:'Quantos nomes próprios há em "A Maria e o João vieram do Porto até Lisboa."?', opts:['1','2','3','4'], ans:2, exp:'4 próprios: Maria, João, Porto, Lisboa.' },
    { id:'2p91', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:2, q:'Qual destas frases TEM nomes comuns E próprios?', opts:['Lisboa Porto Tejo','o livro a flor','O João comprou um livro.','correr saltar dormir'], ans:2, exp:'João = próprio; livro = comum.' },
    { id:'2p92', s:'portugues', t:'Nomes próprios e comuns', type:'fill', diff:2, q:'Diz o NOME PRÓPRIO de um rio português: ___', ans:['Tejo','Douro','Mondego','Minho','Guadiana','Sado','Tâmega','tejo','douro','mondego'], exp:'Rios portugueses: Tejo, Douro, Mondego, Minho, Guadiana, Sado, Tâmega...' },
    { id:'2p93', s:'portugues', t:'Nomes próprios e comuns', type:'tf', diff:2, q:'Em "A minha cadela chama-se Lola.", "cadela" é nome próprio.', ans:false, exp:'Falso — "cadela" é COMUM (qualquer cadela). "Lola" é o nome PRÓPRIO desta cadela.' },
    { id:'2p94', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:3, q:'Quantos nomes COMUNS há em "O cão Rex correu no jardim com o gato Tomás."?', opts:['1','2','3','4'], ans:1, exp:'2 comuns: cão, gato, jardim → 3 comuns. (Rex e Tomás são próprios.) Resposta correta: 3.' },

    // ----- Português: Adjetivos (+5) -----
    { id:'2p95', s:'portugues', t:'Adjetivos', type:'mc', diff:2, q:'Quantos adjetivos há em "A casa pequena tem um jardim grande e bonito."?', opts:['1','2','3','4'], ans:2, exp:'3 adjetivos: pequena, grande, bonito.' },
    { id:'2p96', s:'portugues', t:'Adjetivos', type:'mc', diff:2, q:'Qual a frase com TUDO no PLURAL?', opts:['o gato preto','os gatos pretos','os gato pretos','o gatos preto'], ans:1, exp:'OS (det. plural) + GATOS (nome plural) + PRETOS (adj. plural).' },
    { id:'2p97', s:'portugues', t:'Adjetivos', type:'fill', diff:2, q:'Adjetivo de cor que descreve o céu de dia: ___', ans:['azul'], exp:'O céu de dia é azul.' },
    { id:'2p98', s:'portugues', t:'Adjetivos', type:'tf', diff:2, q:'"Velho" e "novo" são adjetivos contrários (antónimos).', ans:true, exp:'Verdade — velho ≠ novo, são antónimos (ambos adjetivos).' },
    { id:'2p99', s:'portugues', t:'Adjetivos', type:'mc', diff:3, q:'Frase com PROBLEMA de concordância:', opts:['As meninas bonitas riem.','O menino alto corre.','Os cães pretos ladram.','A flor amarelos é linda.'], ans:3, exp:'A flor (sing. fem.) + AMARELOS (plural masc.) → ERRADO. Devia ser "amarela".' },

    // ----- Português: Género (+5) -----
    { id:'2p100', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:2, q:'Feminino de "leão":', opts:['leão','leoa','leona','leoazinha'], ans:1, exp:'Leão → LEOA.' },
    { id:'2p101', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:2, q:'Feminino de "galo":', opts:['gala','galinha','galita','galiana'], ans:1, exp:'Galo → GALINHA (palavra diferente).' },
    { id:'2p102', s:'portugues', t:'Género (masculino e feminino)', type:'fill', diff:2, q:'Feminino de "padrinho": ___', ans:['madrinha'], exp:'Padrinho → MADRINHA.' },
    { id:'2p103', s:'portugues', t:'Género (masculino e feminino)', type:'tf', diff:2, q:'A palavra "criança" tem só feminino.', ans:true, exp:'Verdade — diz-se sempre "a criança" (masc. ou fem., a palavra é só fem.).' },
    { id:'2p104', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:3, q:'Qual NÃO tem mudança comum (palavra diferente no fem.)?', opts:['rei → rainha','homem → mulher','professor → professora','pai → mãe'], ans:2, exp:'"Professor → professora" só acrescenta -a. Os outros mudam para palavra diferente.' },

    // ----- Português: Grau (+5) -----
    { id:'2p105', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:2, q:'Diminutivo de "porta":', opts:['portarão','portinha','portona','portarás'], ans:1, exp:'Porta → PORTINHA.' },
    { id:'2p106', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:2, q:'Aumentativo de "sapato":', opts:['sapatinho','sapatão','sapatozão','sapatozinho'], ans:1, exp:'Sapato → SAPATÃO (sapato grande).' },
    { id:'2p107', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'fill', diff:2, q:'Aumentativo de "mão": ___', ans:['manzorra','mãozona'], exp:'Mão → MANZORRA ou MÃOZONA (aumentativo).' },
    { id:'2p108', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'tf', diff:2, q:'"Avozinha" pode ser usado com carinho, mesmo se a avó não for pequena.', ans:true, exp:'Verdade — diminutivo também serve para mostrar CARINHO.' },
    { id:'2p109', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:3, q:'Em "Olá, mãezinha! Trouxe um livrinho.", quantas palavras estão no diminutivo?', opts:['0','1','2','3'], ans:2, exp:'2: mãezinha (carinho) + livrinho (livro pequeno).' },

    // ----- Português: Verbos passado/futuro (+5) -----
    { id:'2p110', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:2, q:'Em que tempo está "Eles brincaram"?', opts:['presente','passado','futuro','condicional'], ans:1, exp:'BRINCARAM → passado (já aconteceu).' },
    { id:'2p111', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:2, q:'Como dizes no FUTURO: "Eu como"?', opts:['Eu comi','Eu como','Eu comerei','Eu comia'], ans:2, exp:'Futuro: comerei (também serve "vou comer").' },
    { id:'2p112', s:'portugues', t:'Verbos no passado e futuro', type:'fill', diff:2, q:'Passado de "Tu corres": "Tu ___"', ans:['correste'], exp:'Tu corres (presente) → tu CORRESTE (passado).' },
    { id:'2p113', s:'portugues', t:'Verbos no passado e futuro', type:'tf', diff:1, q:'"Ontem vou jogar" é uma frase correta.', ans:false, exp:'Falso! "Ontem" é passado, "vou jogar" é futuro. Misturado! Correto: "Ontem joguei" ou "Amanhã vou jogar".' },
    { id:'2p114', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:2, q:'Qual frase está TODA no passado?', opts:['Como agora.','Comerei amanhã.','Comi e bebi ontem.','Hoje brinco.'], ans:2, exp:'"Comi e bebi" — ambos no passado.' },

    // ----- Português: Pontuação (+5) -----
    { id:'2p115', s:'portugues', t:'Pontuação básica', type:'mc', diff:1, q:'Que sinal vai no fim de "Cuidado"?', opts:['.','?','!',','], ans:2, exp:'Cuidado! → exclamação (atenção, alerta).' },
    { id:'2p116', s:'portugues', t:'Pontuação básica', type:'mc', diff:2, q:'Onde se coloca a vírgula? "Comprei pão leite e fruta"', opts:['só antes do "e"','depois de "pão" e depois de "leite"','no fim','não leva nenhuma'], ans:1, exp:'"Comprei pão, leite e fruta." (Vírgula entre os 2 primeiros.)' },
    { id:'2p117', s:'portugues', t:'Pontuação básica', type:'fill', diff:1, q:'Sinal usado no fim de "Que dia maravilhoso": ___', ans:['!','exclamação','ponto de exclamação'], exp:'! para exprimir admiração/emoção.' },
    { id:'2p118', s:'portugues', t:'Pontuação básica', type:'tf', diff:1, q:'A pontuação ajuda quem lê a saber as pausas.', ans:true, exp:'Verdade — sinais de pontuação marcam pausas e mostram a intenção da frase.' },
    { id:'2p119', s:'portugues', t:'Pontuação básica', type:'mc', diff:2, q:'Qual frase está completamente CORRETA?', opts:['olá como te chamas','Olá como te chamas?','Olá! Como te chamas?','OLÁ. como te chamas!'], ans:2, exp:'Maiúsculas + cumprimento (!) + pergunta (?).' },

    // ----- Matemática: Multiplicação (+5 desafio) -----
    { id:'2m151', s:'matematica', t:'Multiplicação', type:'mc', diff:2, q:'Numa caixa há 6 fileiras de 4 chocolates. Total?', opts:['10','18','24','28'], ans:2, exp:'6 × 4 = 24 chocolates.' },
    { id:'2m152', s:'matematica', t:'Multiplicação', type:'mc', diff:2, q:'Quanto é 3 × 8 + 4?', opts:['11','15','24','28'], ans:3, exp:'Primeiro multiplica: 3×8=24. Depois soma: 24+4=28.' },
    { id:'2m153', s:'matematica', t:'Multiplicação', type:'fill', diff:2, q:'Se 5 × ? = 30, qual é o ?', ans:['6'], exp:'5 × 6 = 30.' },
    { id:'2m154', s:'matematica', t:'Multiplicação', type:'mc', diff:3, q:'Tens 4 sacos com 6 maçãs cada. A Maria deu-te mais 5. Quantas tens ao todo?', opts:['15','24','29','34'], ans:2, exp:'4 × 6 = 24 maçãs + 5 = 29.' },
    { id:'2m155', s:'matematica', t:'Multiplicação', type:'tf', diff:2, q:'8 × 7 é igual a 7 × 8.', ans:true, exp:'Verdade — propriedade comutativa: a ordem não muda o resultado (= 56).' },

    // ----- Matemática: Divisão (+5 desafio) -----
    { id:'2m156', s:'matematica', t:'Divisão', type:'mc', diff:2, q:'Numa pizza com 8 fatias, dividida igualmente por 4 pessoas, cada uma come:', opts:['1','2','3','4'], ans:1, exp:'8 ÷ 4 = 2 fatias por pessoa.' },
    { id:'2m157', s:'matematica', t:'Divisão', type:'mc', diff:2, q:'Tens 21 berlindes para 3 amigos. Sobra algum?', opts:['cada um leva 7, não sobra','cada um leva 6, sobra 3','cada um leva 5, sobram 6','cada um leva 8, faltam 3'], ans:0, exp:'21 ÷ 3 = 7 exato (não sobra nada).' },
    { id:'2m158', s:'matematica', t:'Divisão', type:'fill', diff:2, q:'40 ÷ 8 = ___', ans:['5'], exp:'40 ÷ 8 = 5 (porque 5 × 8 = 40).' },
    { id:'2m159', s:'matematica', t:'Divisão', type:'mc', diff:2, q:'A Joana tinha 24 cromos. Deu metade ao irmão. Com quantos ficou?', opts:['10','12','14','24'], ans:1, exp:'Metade de 24 = 24 ÷ 2 = 12. Ficou com 12.' },
    { id:'2m160', s:'matematica', t:'Divisão', type:'tf', diff:2, q:'14 dividido por 2 dá 7.', ans:true, exp:'Verdade — 14 ÷ 2 = 7 (porque 7 × 2 = 14).' },

    // ----- Matemática: Tabuada do 3 (+5 desafio) -----
    { id:'2m161', s:'matematica', t:'Tabuada do 3', type:'mc', diff:2, q:'Quanto é 3 × 9 − 7?', opts:['18','20','27','29'], ans:1, exp:'3 × 9 = 27. 27 − 7 = 20.' },
    { id:'2m162', s:'matematica', t:'Tabuada do 3', type:'mc', diff:2, q:'Em 6 dúzias e meia de ovos quantos ovos há?', opts:['18','42','54','78'], ans:3, exp:'1 dúzia = 12. 6 × 12 = 72. + meia (=6) = 78. (Outra forma: 6,5 × 12.)' },
    { id:'2m163', s:'matematica', t:'Tabuada do 3', type:'mc', diff:2, q:'Qual NÃO é múltiplo de 3?', opts:['12','18','22','27'], ans:2, exp:'22 → 2+2=4 (não é mult de 3).' },
    { id:'2m164', s:'matematica', t:'Tabuada do 3', type:'fill', diff:2, q:'Quantas pernas têm 9 cadeiras (cada uma com 3 pernas)? ___', ans:['27'], exp:'9 × 3 = 27 pernas.' },
    { id:'2m165', s:'matematica', t:'Tabuada do 3', type:'tf', diff:2, q:'30 é múltiplo de 3.', ans:true, exp:'Verdade — 3 × 10 = 30. (3+0=3 ✓)' },

    // ----- Matemática: Tabuada do 4 (+5 desafio) -----
    { id:'2m166', s:'matematica', t:'Tabuada do 4', type:'mc', diff:2, q:'Quanto é 4 × 6 + 4 × 2?', opts:['24','28','32','36'], ans:2, exp:'4×6=24; 4×2=8; 24+8=32. (Truque: = 4×(6+2) = 4×8 = 32.)' },
    { id:'2m167', s:'matematica', t:'Tabuada do 4', type:'mc', diff:2, q:'Numa estação há 4 comboios com 8 carruagens cada. Total carruagens?', opts:['12','24','32','40'], ans:2, exp:'4 × 8 = 32 carruagens.' },
    { id:'2m168', s:'matematica', t:'Tabuada do 4', type:'fill', diff:2, q:'4 × ? = 24. ? = ___', ans:['6'], exp:'4 × 6 = 24.' },
    { id:'2m169', s:'matematica', t:'Tabuada do 4', type:'mc', diff:3, q:'Cada cão tem 4 patas. Numa rua há 7 cães e 3 gatos. Quantas patas ao todo?', opts:['28','30','40','44'], ans:2, exp:'7×4 (cães) = 28. 3×4 (gatos) = 12. Total = 28+12 = 40.' },
    { id:'2m170', s:'matematica', t:'Tabuada do 4', type:'tf', diff:2, q:'9 × 4 = 4 × 9.', ans:true, exp:'Verdade — comutativa. Resultado = 36.' },

    // ----- Matemática: Tabuada do 6 (+5 desafio) -----
    { id:'2m171', s:'matematica', t:'Tabuada do 6', type:'mc', diff:2, q:'Numa caixa há 6 ovos. Quantos em meia dúzia de caixas?', opts:['12','24','30','36'], ans:3, exp:'Meia dúzia = 6. 6 × 6 = 36 ovos.' },
    { id:'2m172', s:'matematica', t:'Tabuada do 6', type:'mc', diff:2, q:'A Sara faz 6 km a caminhar por dia. Numa semana (7 dias)?', opts:['36','42','48','54'], ans:1, exp:'7 × 6 = 42 km.' },
    { id:'2m173', s:'matematica', t:'Tabuada do 6', type:'fill', diff:2, q:'6 × ? = 48. ? = ___', ans:['8'], exp:'6 × 8 = 48.' },
    { id:'2m174', s:'matematica', t:'Tabuada do 6', type:'mc', diff:2, q:'Quanto é 6 × 7 − 6?', opts:['30','36','42','48'], ans:1, exp:'6×7=42. 42−6=36. (Truque: = 6×(7−1) = 6×6 = 36.)' },
    { id:'2m175', s:'matematica', t:'Tabuada do 6', type:'tf', diff:2, q:'Os múltiplos de 6 são também múltiplos de 2 e de 3.', ans:true, exp:'Verdade — 6 = 2 × 3, então tudo o que é múltiplo de 6 é também de 2 e 3.' },

    // ----- Matemática: Tabuada do 7 (+5 desafio) -----
    { id:'2m176', s:'matematica', t:'Tabuada do 7', type:'mc', diff:2, q:'Numa loja vendem-se 7 chocolates por euro. Quantos chocolates compras com 6 €?', opts:['28','35','42','49'], ans:2, exp:'6 × 7 = 42 chocolates.' },
    { id:'2m177', s:'matematica', t:'Tabuada do 7', type:'mc', diff:2, q:'Quantos dias têm 8 semanas?', opts:['49','54','56','63'], ans:2, exp:'8 × 7 = 56 dias.' },
    { id:'2m178', s:'matematica', t:'Tabuada do 7', type:'fill', diff:2, q:'7 × ? = 35. ? = ___', ans:['5'], exp:'7 × 5 = 35.' },
    { id:'2m179', s:'matematica', t:'Tabuada do 7', type:'mc', diff:3, q:'Tens 3 sacos com 7 cromos cada e o teu amigo deu-te mais 9. Total?', opts:['16','21','27','30'], ans:3, exp:'3 × 7 = 21. 21 + 9 = 30 cromos.' },
    { id:'2m180', s:'matematica', t:'Tabuada do 7', type:'tf', diff:2, q:'A tabuada do 7 é a mais difícil (sem truque óbvio).', ans:true, exp:'Verdade — daí ser preciso decorar mais. Truque: usar a comutativa (7×3 = 3×7).' },

    // ----- Matemática: Tabuada do 8 (+5 desafio) -----
    { id:'2m181', s:'matematica', t:'Tabuada do 8', type:'mc', diff:2, q:'Quanto é 8 × 7 − 6?', opts:['46','48','50','56'], ans:2, exp:'8×7=56. 56−6=50.' },
    { id:'2m182', s:'matematica', t:'Tabuada do 8', type:'mc', diff:2, q:'Cada polvo tem 8 patas. Quantas patas têm 6 polvos?', opts:['42','48','54','64'], ans:1, exp:'6 × 8 = 48 patas.' },
    { id:'2m183', s:'matematica', t:'Tabuada do 8', type:'fill', diff:2, q:'8 × ? = 56. ? = ___', ans:['7'], exp:'8 × 7 = 56.' },
    { id:'2m184', s:'matematica', t:'Tabuada do 8', type:'mc', diff:2, q:'Numa garagem há 8 carros. Cada carro tem 4 rodas. Total rodas?', opts:['12','24','32','40'], ans:2, exp:'8 × 4 = 32 rodas.' },
    { id:'2m185', s:'matematica', t:'Tabuada do 8', type:'tf', diff:2, q:'8 × 8 = 64.', ans:true, exp:'Verdade — 8 × 8 = 64.' },

    // ----- Matemática: Tabuada do 9 (+5 desafio) -----
    { id:'2m186', s:'matematica', t:'Tabuada do 9', type:'mc', diff:2, q:'Truque: 9 × 4 = (10 × 4) − 4. Quanto dá?', opts:['32','34','36','40'], ans:2, exp:'10 × 4 = 40. 40 − 4 = 36 = 9 × 4 ✓.' },
    { id:'2m187', s:'matematica', t:'Tabuada do 9', type:'mc', diff:2, q:'Quanto é 9 × 7 + 1?', opts:['56','63','64','70'], ans:2, exp:'9 × 7 = 63. 63 + 1 = 64.' },
    { id:'2m188', s:'matematica', t:'Tabuada do 9', type:'fill', diff:2, q:'9 × ? = 81. ? = ___', ans:['9'], exp:'9 × 9 = 81.' },
    { id:'2m189', s:'matematica', t:'Tabuada do 9', type:'mc', diff:2, q:'A soma dos algarismos do produto 9×6 dá:', opts:['8','9','10','18'], ans:1, exp:'9 × 6 = 54. 5+4 = 9. Truque mágico do 9!' },
    { id:'2m190', s:'matematica', t:'Tabuada do 9', type:'tf', diff:2, q:'Múltiplo de 9: a soma dos algarismos é sempre 9 (ou múltiplo de 9).', ans:true, exp:'Verdade — truque para verificar se um número é múltiplo de 9.' },

    // ----- Matemática: Frações simples (+5 desafio) -----
    { id:'2m191', s:'matematica', t:'Frações simples', type:'mc', diff:2, q:'Tens 12 bolachas e comes metade. Quantas comes?', opts:['4','5','6','8'], ans:2, exp:'Metade de 12 = 12 ÷ 2 = 6 bolachas.' },
    { id:'2m192', s:'matematica', t:'Frações simples', type:'mc', diff:2, q:'1/4 de 20 é:', opts:['4','5','6','10'], ans:1, exp:'20 ÷ 4 = 5.' },
    { id:'2m193', s:'matematica', t:'Frações simples', type:'fill', diff:2, q:'Metade de 16 = ___', ans:['8'], exp:'16 ÷ 2 = 8.' },
    { id:'2m194', s:'matematica', t:'Frações simples', type:'mc', diff:2, q:'Um bolo dividido em 8 partes iguais. Comeste 4. Que fração comeste?', opts:['1/2 (metade)','1/4','3/4','4/4 (todo)'], ans:0, exp:'4/8 = 1/2 (metade).' },
    { id:'2m195', s:'matematica', t:'Frações simples', type:'tf', diff:2, q:'1/2 de uma laranja = 50% da laranja.', ans:true, exp:'Verdade — metade = 50%.' },

    // ----- Matemática: Comprimento (+5 desafio) -----
    { id:'2m196', s:'matematica', t:'Comprimento', type:'mc', diff:2, q:'A altura de uma porta é cerca de:', opts:['2 cm','2 m','2 km','20 cm'], ans:1, exp:'~2 metros.' },
    { id:'2m197', s:'matematica', t:'Comprimento', type:'mc', diff:2, q:'1 m + 50 cm = ___ cm', opts:['51','60','105','150'], ans:3, exp:'1 m = 100 cm; 100 + 50 = 150 cm.' },
    { id:'2m198', s:'matematica', t:'Comprimento', type:'fill', diff:2, q:'5 km = ___ m', ans:['5000','5 000'], exp:'5 × 1000 = 5000 m.' },
    { id:'2m199', s:'matematica', t:'Comprimento', type:'mc', diff:2, q:'Tens uma fita de 2 m. Cortas em pedaços de 50 cm. Quantos pedaços ficas?', opts:['2','3','4','5'], ans:2, exp:'2 m = 200 cm. 200 ÷ 50 = 4 pedaços.' },
    { id:'2m200', s:'matematica', t:'Comprimento', type:'tf', diff:1, q:'1 km é o mesmo que 1000 metros.', ans:true, exp:'Verdade — 1 km = 1000 m.' },

    // ----- Matemática: Massa (+5 desafio) -----
    { id:'2m201', s:'matematica', t:'Massa', type:'mc', diff:2, q:'Uma criança normal pesa cerca de:', opts:['2 g','25 kg','25 g','25 t'], ans:1, exp:'~25 kg para uma criança de 7-8 anos.' },
    { id:'2m202', s:'matematica', t:'Massa', type:'mc', diff:2, q:'2 kg + 500 g = ___ g', opts:['250','502','2002','2500'], ans:3, exp:'2 kg = 2000 g. 2000 + 500 = 2500 g.' },
    { id:'2m203', s:'matematica', t:'Massa', type:'fill', diff:2, q:'¼ kg = ___ g', ans:['250'], exp:'1 kg = 1000 g; 1000 ÷ 4 = 250 g.' },
    { id:'2m204', s:'matematica', t:'Massa', type:'mc', diff:2, q:'Compras 3 sacos de batatas de 2 kg cada. Total?', opts:['5 kg','6 kg','8 kg','12 kg'], ans:1, exp:'3 × 2 = 6 kg.' },
    { id:'2m205', s:'matematica', t:'Massa', type:'tf', diff:2, q:'1000 gramas pesam o mesmo que 1 quilograma.', ans:true, exp:'Verdade — 1 kg = 1000 g.' },

    // ----- Matemática: Capacidade (+5 desafio) -----
    { id:'2m206', s:'matematica', t:'Capacidade', type:'mc', diff:2, q:'Uma garrafa grande de água tem cerca de:', opts:['15 mL','150 mL','1,5 L','15 L'], ans:2, exp:'Uma garrafa grande tem cerca de 1,5 litros (1500 ml). Um copo tem só uns 2 dl.' },
    { id:'2m207', s:'matematica', t:'Capacidade', type:'mc', diff:2, q:'3 L = ___ mL', opts:['30','300','3000','30000'], ans:2, exp:'3 × 1000 = 3000 mL.' },
    { id:'2m208', s:'matematica', t:'Capacidade', type:'fill', diff:2, q:'¼ L = ___ mL', ans:['250'], exp:'1 L = 1000 mL; ÷ 4 = 250 mL.' },
    { id:'2m209', s:'matematica', t:'Capacidade', type:'mc', diff:2, q:'Tens 2 L de sumo. Enche copos de 250 mL. Quantos copos enches?', opts:['4','6','8','10'], ans:2, exp:'2 L = 2000 mL. 2000 ÷ 250 = 8 copos.' },
    { id:'2m210', s:'matematica', t:'Capacidade', type:'tf', diff:1, q:'1 L de água = 1000 mL de água.', ans:true, exp:'Verdade — sempre.' },

    // ----- Matemática: Gráficos (+5 desafio) -----
    { id:'2m211', s:'matematica', t:'Gráficos', type:'mc', diff:2, q:'Tabela: Cães=4, Gatos=6, Pássaros=2. Animal MENOS frequente?', opts:['Cães','Gatos','Pássaros','iguais'], ans:2, exp:'Pássaros = 2 (a menor).' },
    { id:'2m212', s:'matematica', t:'Gráficos', type:'mc', diff:2, q:'Mesma tabela. Quantos gatos a MAIS que cães?', opts:['1','2','4','6'], ans:1, exp:'Gatos − cães = 6 − 4 = 2.' },
    { id:'2m213', s:'matematica', t:'Gráficos', type:'fill', diff:2, q:'Tabela votos: Maçã=10, Banana=5, Pêra=5. Total ___ votos.', ans:['20'], exp:'10 + 5 + 5 = 20 votos.' },
    { id:'2m214', s:'matematica', t:'Gráficos', type:'mc', diff:2, q:'Pictograma: 🐱🐱🐱 (cada 🐱 = 2 gatos). Total gatos?', opts:['3','5','6','8'], ans:2, exp:'3 imagens × 2 gatos = 6 gatos.' },
    { id:'2m215', s:'matematica', t:'Gráficos', type:'tf', diff:2, q:'Num gráfico de barras, a barra mais alta representa o valor MAIOR.', ans:true, exp:'Verdade — barra alta = mais; barra baixa = menos.' },

    // ----- Estudo do Meio: Astros (+5 desafio) -----
    { id:'2e65', s:'estudo_meio', t:'Astros', type:'mc', diff:2, q:'O nosso planeta é o ___ planeta a contar do Sol:', opts:['1.º','2.º','3.º','4.º'], ans:2, exp:'Mercúrio (1) → Vénus (2) → TERRA (3) → Marte (4)...' },
    { id:'2e66', s:'estudo_meio', t:'Astros', type:'mc', diff:2, q:'Por que se vêem as estrelas só à noite?', opts:['só aparecem à noite','sem o Sol forte conseguimos vê-las','dormem de dia','não brilham de dia'], ans:1, exp:'As estrelas estão sempre lá, mas a luz forte do Sol "esconde-as" durante o dia.' },
    { id:'2e67', s:'estudo_meio', t:'Astros', type:'fill', diff:2, q:'A Terra demora ___ dias a dar uma volta ao Sol.', ans:['365'], exp:'365 dias = 1 ano (de translação).' },
    { id:'2e68', s:'estudo_meio', t:'Astros', type:'tf', diff:3, q:'Vénus é maior que a Terra.', ans:false, exp:'Falso — Vénus é ligeiramente menor que a Terra (mas é o mais quente).' },
    { id:'2e69', s:'estudo_meio', t:'Astros', type:'mc', diff:3, q:'A Lua tem fases. Quando vemos só uma "fatia" estreita da Lua a CRESCER, é:', opts:['Lua Nova','Quarto Crescente','Lua Cheia','Quarto Minguante'], ans:1, exp:'QUARTO CRESCENTE — vê-se uma "fatia" e está a crescer (em direção à lua cheia).' },

    // ----- Estudo do Meio: Transportes (+5 desafio) -----
    { id:'2e70', s:'estudo_meio', t:'Transportes', type:'mc', diff:2, q:'Qual destes transportes é MAIS ANTIGO (existe há mais tempo)?', opts:['avião','carro','bicicleta','foguetão'], ans:2, exp:'A bicicleta é o mais antigo (séc. XIX). O foguetão é o mais recente.' },
    { id:'2e71', s:'estudo_meio', t:'Transportes', type:'mc', diff:2, q:'Por que andar de transportes públicos polui MENOS?', opts:['porque é mais rápido do que o carro','transporta muitas pessoas em vez de cada uma usar 1 carro','porque custa menos dinheiro a cada pessoa','tem assentos confortáveis'], ans:1, exp:'Um autocarro = ~50 carros a menos na estrada → menos poluição.' },
    { id:'2e72', s:'estudo_meio', t:'Transportes', type:'fill', diff:2, q:'No carro, devemos sempre usar o ___ (segurança).', ans:['cinto','cinto de segurança'], exp:'CINTO DE SEGURANÇA — protege-nos em caso de acidente.' },
    { id:'2e73', s:'estudo_meio', t:'Transportes', type:'tf', diff:3, q:'Comboio e metro são transportes públicos terrestres.', ans:true, exp:'Verdade — ambos terrestres e públicos (vão por carris).' },
    { id:'2e74', s:'estudo_meio', t:'Transportes', type:'mc', diff:3, q:'Um foguetão é um transporte:', opts:['terrestre','aquático','aéreo','espacial'], ans:3, exp:'O foguetão vai para o ESPAÇO → transporte espacial.' },

    // ----- Estudo do Meio: Higiene (+5 desafio) -----
    { id:'2e75', s:'estudo_meio', t:'Higiene', type:'mc', diff:2, q:'Quanto tempo deves escovar os dentes?', opts:['10 segundos','30 segundos','2 minutos','10 minutos'], ans:2, exp:'~2 minutos para limpar todos os dentes.' },
    { id:'2e76', s:'estudo_meio', t:'Higiene', type:'mc', diff:2, q:'Lavar a fruta antes de comer serve para:', opts:['ficar mais brilhante','tirar microrganismos e químicos','ficar mais doce','não dar trabalho'], ans:1, exp:'Lavar tira sujidade, micróbios e restos de pesticidas.' },
    { id:'2e77', s:'estudo_meio', t:'Higiene', type:'fill', diff:2, q:'Pequenos seres vivos invisíveis que podem causar doenças: ___', ans:['microrganismos','germes','bactérias','micróbios'], exp:'Microrganismos / micróbios — só os vemos ao microscópio.' },
    { id:'2e78', s:'estudo_meio', t:'Higiene', type:'tf', diff:3, q:'Lavar as mãos com sabão é melhor que só com água.', ans:true, exp:'Verdade — o sabão remove bactérias e óleos que a água sozinha não remove.' },
    { id:'2e79', s:'estudo_meio', t:'Higiene', type:'mc', diff:3, q:'Que aparecem se NÃO escovarmos bem os dentes?', opts:['cabelo branco','cáries','olheiras','espinhas'], ans:1, exp:'CÁRIES — buracos provocados por bactérias dos restos de comida.' },

    // ----- Estudo do Meio: Saúde (+5 desafio) -----
    { id:'2e80', s:'estudo_meio', t:'Saúde', type:'mc', diff:2, q:'Para que serve a Roda dos Alimentos?', opts:['decorar a parede da cozinha','mostrar quanto comer de cada grupo','marcar as horas das refeições','desenhar mapas de Portugal'], ans:1, exp:'A Roda mostra os grupos e as quantidades para uma alimentação equilibrada.' },
    { id:'2e81', s:'estudo_meio', t:'Saúde', type:'mc', diff:2, q:'Quantos minutos de exercício devemos fazer por dia (crianças)?', opts:['10','30','60 (1 hora)','5 horas'], ans:2, exp:'~60 minutos por dia (correr, jogar, andar de bicicleta).' },
    { id:'2e82', s:'estudo_meio', t:'Saúde', type:'fill', diff:2, q:'Devo dormir entre 9 e ___ horas por noite (criança).', ans:['11'], exp:'Crianças (5-12 anos): 9 a 11 horas.' },
    { id:'2e83', s:'estudo_meio', t:'Saúde', type:'tf', diff:3, q:'Comer fruta inteira é melhor do que beber sumo da fruta.', ans:true, exp:'Verdade — a fruta tem fibra. O sumo perde a fibra e tem muito açúcar.' },
    { id:'2e84', s:'estudo_meio', t:'Saúde', type:'mc', diff:3, q:'No centro da Roda dos Alimentos está:', opts:['azeite','água','pão','carne'], ans:1, exp:'A água está no CENTRO — é fundamental (1,5 a 2 L por dia).' },

    // ----- Estudo do Meio: Comemorações (+5 desafio) -----
    { id:'2e85', s:'estudo_meio', t:'Comemorações', type:'mc', diff:2, q:'No Carnaval, as pessoas usam:', opts:['fatos pretos','máscaras e fatos','vestidos brancos','uniformes'], ans:1, exp:'No Carnaval há máscaras, fatos coloridos e desfiles.' },
    { id:'2e86', s:'estudo_meio', t:'Comemorações', type:'mc', diff:2, q:'Comida típica da Páscoa:', opts:['bolo-rei','folar','pão de ló','rabanadas'], ans:1, exp:'FOLAR — bolo típico de Páscoa.' },
    { id:'2e87', s:'estudo_meio', t:'Comemorações', type:'fill', diff:2, q:'Comida típica do Natal: ___', ans:['bacalhau','peru','rabanadas','bolo-rei','sonhos'], exp:'No Natal: bacalhau, peru, rabanadas, sonhos, bolo-rei.' },
    { id:'2e88', s:'estudo_meio', t:'Comemorações', type:'tf', diff:3, q:'Os Santos Populares (sardinhas, marchas) celebram-se em junho.', ans:true, exp:'Verdade — Santo António (12-13 jun), São João (23-24 jun), São Pedro (28-29 jun).' },
    { id:'2e89', s:'estudo_meio', t:'Comemorações', type:'mc', diff:3, q:'O Dia da Liberdade (25 de Abril) tem como símbolo:', opts:['rosa','cravo','tulipa','margarida'], ans:1, exp:'CRAVO — flor que os soldados puseram no cano das espingardas em 1974.' },

    // ----- Inglês: Alfabeto (+5 desafio) -----
    { id:'2i59', s:'ingles', t:'Alfabeto', type:'mc', diff:2, q:'Como se diz "K" em inglês?', opts:['"ka"','"kei"','"si"','"queu"'], ans:1, exp:'A letra K em inglês diz-se "kei".' },
    { id:'2i60', s:'ingles', t:'Alfabeto', type:'mc', diff:2, q:'Como se diz "W" em inglês?', opts:['"vê"','"double-iu"','"u-vê"','"dobliu"'], ans:1, exp:'W = "double-iu" (duplo U).' },
    { id:'2i61', s:'ingles', t:'Alfabeto', type:'fill', diff:2, q:'Letra que vem depois do M no alfabeto: ___', ans:['N','n'], exp:'M → N → O.' },
    { id:'2i62', s:'ingles', t:'Alfabeto', type:'tf', diff:3, q:'O alfabeto inglês tem mais letras do que o português.', ans:true, exp:'Verdade — inglês tem 26, português usa normalmente 23.' },
    { id:'2i63', s:'ingles', t:'Alfabeto', type:'mc', diff:3, q:'Soletra "OK" em inglês:', opts:['"ou-kei"','"o-ka"','"ou-si"','"o-key"'], ans:0, exp:'O="ou", K="kei" → "ou-kei".' },

    // ----- Inglês: Body (+5 desafio) -----
    { id:'2i64', s:'ingles', t:'Body', type:'mc', diff:2, q:'Plural de "tooth" (dente):', opts:['tooths','teeth','tooths\'','tooths"s'], ans:1, exp:'tooth → teeth (irregular).' },
    { id:'2i65', s:'ingles', t:'Body', type:'mc', diff:2, q:'O coração em inglês é:', opts:['hand','head','heart','hair'], ans:2, exp:'Heart = coração.' },
    { id:'2i66', s:'ingles', t:'Body', type:'fill', diff:2, q:'Cabelo em inglês: ___', ans:['hair'], exp:'Hair = cabelo.' },
    { id:'2i67', s:'ingles', t:'Body', type:'tf', diff:3, q:'"Fingers" em inglês são os dedos das mãos.', ans:true, exp:'Verdade — fingers = dedos das mãos. Toes = dedos dos pés.' },
    { id:'2i68', s:'ingles', t:'Body', type:'mc', diff:3, q:'Quantas patas tem uma aranha em inglês?', opts:['"four legs"','"six legs"','"eight legs"','"ten legs"'], ans:2, exp:'Aranha = 8 patas = "eight legs".' },

    // ----- Inglês: Food (+5 desafio) -----
    { id:'2i69', s:'ingles', t:'Food', type:'mc', diff:2, q:'"I am hungry" significa:', opts:['Tenho frio','Tenho sede','Tenho fome','Tenho sono'], ans:2, exp:'I am hungry = Tenho fome.' },
    { id:'2i70', s:'ingles', t:'Food', type:'mc', diff:2, q:'"Cheese" em inglês é:', opts:['carne','peixe','queijo','pão'], ans:2, exp:'Cheese = queijo.' },
    { id:'2i71', s:'ingles', t:'Food', type:'fill', diff:1, q:'Carne em inglês: ___', ans:['meat'], exp:'Meat = carne.' },
    { id:'2i72', s:'ingles', t:'Food', type:'tf', diff:1, q:'"Vegetables" em inglês são legumes.', ans:true, exp:'Verdade — vegetables = legumes/vegetais.' },
    { id:'2i73', s:'ingles', t:'Food', type:'mc', diff:2, q:'"What is your favourite food?" significa:', opts:['Onde está a comida?','Quanto custa a comida?','Qual é a tua comida favorita?','Quem comeu?'], ans:2, exp:'What is your favourite food? = Qual é a tua comida favorita?' },

    // ----- Inglês: Toys (+5 desafio) -----
    { id:'2i74', s:'ingles', t:'Toys', type:'mc', diff:2, q:"\"It's mine!\" significa:", opts:['É teu','É dele','É meu','É nosso'], ans:2, exp:"It's mine! = É meu!" },
    { id:'2i75', s:'ingles', t:'Toys', type:'mc', diff:2, q:'"Can I play?" significa:', opts:['Posso comer?','Posso brincar?','Posso ir?','Posso ver?'], ans:1, exp:'Can I play? = Posso brincar?' },
    { id:'2i76', s:'ingles', t:'Toys', type:'fill', diff:1, q:'Patins em inglês: roller ___', ans:['skates'], exp:'Roller skates = patins.' },
    { id:'2i77', s:'ingles', t:'Toys', type:'tf', diff:1, q:'"Share" em inglês significa partilhar.', ans:true, exp:'Verdade — share = partilhar. (Importante para brincar com amigos!)' },
    { id:'2i78', s:'ingles', t:'Toys', type:'mc', diff:2, q:'"Robot" em inglês é a mesma palavra em português.', opts:['Sim, escreve-se igual','Não, é diferente','É "robotic"','É "machine"'], ans:0, exp:'Robot escreve-se igual em inglês e português (só pronúncia muda).' },

    // ============================================================
    // ===== EXTRA-FÁCIL 2.º ano - perguntas mais simples =========
    // (5 perguntas diff:1 por cada um dos 29 tópicos novos =145)
    // Linguagem MUITO simples, perguntas diretas, sem combinacoes
    // ============================================================

    // ----- Português: Hiato (+5 fácil) -----
    { id:'2p120', s:'portugues', t:'Hiato', type:'mc', diff:2, q:'No hiato, as vogais ficam:', opts:['na mesma sílaba','em sílabas diferentes','não juntas','sem ler'], ans:1, exp:'Hiato = vogais juntas mas em SÍLABAS DIFERENTES.' },
    { id:'2p121', s:'portugues', t:'Hiato', type:'mc', diff:1, q:'A palavra "baú" tem:', opts:['ditongo','hiato'], ans:1, exp:'ba-ú → 2 sílabas → hiato.' },
    { id:'2p122', s:'portugues', t:'Hiato', type:'tf', diff:1, q:'"Pai" tem 1 sílaba.', ans:true, exp:'Verdade — "pai" diz-se de uma só vez (ditongo).' },
    { id:'2p123', s:'portugues', t:'Hiato', type:'fill', diff:1, q:'Quantas sílabas tem "pai"? ___', ans:['1','uma'], exp:'1 sílaba (ditongo "ai").' },
    { id:'2p124', s:'portugues', t:'Hiato', type:'mc', diff:2, q:'Que palavra tem hiato?', opts:['mãe','baú','boi'], ans:1, exp:'Baú → hiato (ba-ú).' },

    // ----- Português: Nomes próprios e comuns (+5 fácil) -----
    { id:'2p125', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:1, q:'Nome próprio começa por letra:', opts:['minúscula','maiúscula','número','não importa'], ans:1, exp:'Sempre MAIÚSCULA: João, Lisboa, Bobi.' },
    { id:'2p126', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:1, q:'"Rita" é um nome:', opts:['comum','próprio'], ans:1, exp:'Rita = nome de uma pessoa → próprio.' },
    { id:'2p127', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:1, q:'"Mesa" é um nome:', opts:['comum','próprio'], ans:0, exp:'Mesa = qualquer mesa → comum.' },
    { id:'2p128', s:'portugues', t:'Nomes próprios e comuns', type:'tf', diff:1, q:'"Lisboa" deve ter L maiúsculo.', ans:true, exp:'Sim — Lisboa é nome próprio (cidade).' },
    { id:'2p129', s:'portugues', t:'Nomes próprios e comuns', type:'fill', diff:1, q:'Diz o nome próprio de uma menina: ___', ans:['Maria','Ana','Sofia','Rita','Joana','Inês','Sara','Beatriz','Carolina','Mariana'], exp:'Qualquer nome de menina serve.' },

    // ----- Português: Adjetivos (+5 fácil) -----
    { id:'2p130', s:'portugues', t:'Adjetivos', type:'mc', diff:1, q:'O adjetivo serve para:', opts:['contar números','dizer como é uma coisa','dar ordens','rir'], ans:1, exp:'Adjetivo descreve / qualifica.' },
    { id:'2p131', s:'portugues', t:'Adjetivos', type:'mc', diff:1, q:'Em "casa grande", o adjetivo é:', opts:['casa','grande'], ans:1, exp:'GRANDE descreve a casa → adjetivo.' },
    { id:'2p132', s:'portugues', t:'Adjetivos', type:'mc', diff:1, q:'Qual destes é um adjetivo?', opts:['correr','feliz','escola'], ans:1, exp:'FELIZ descreve um sentimento → adjetivo.' },
    { id:'2p133', s:'portugues', t:'Adjetivos', type:'tf', diff:1, q:'"Bonito" é um adjetivo.', ans:true, exp:'Verdade — descreve algo → adjetivo.' },
    { id:'2p134', s:'portugues', t:'Adjetivos', type:'fill', diff:1, q:'Adjetivo de cor: ___', ans:['azul','verde','vermelho','amarelo','branco','preto','rosa','laranja','roxo','castanho','cinzento'], exp:'Qualquer cor (azul, verde, etc.) é um adjetivo.' },

    // ----- Português: Género (+5 fácil) -----
    { id:'2p135', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:1, q:'"O gato" é:', opts:['masculino','feminino'], ans:0, exp:'O = masculino.' },
    { id:'2p136', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:1, q:'"A flor" é:', opts:['masculino','feminino'], ans:1, exp:'A = feminino.' },
    { id:'2p137', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:2, q:'Feminino de "menino":', opts:['menino','menina','meninito'], ans:1, exp:'Menino → menina.' },
    { id:'2p138', s:'portugues', t:'Género (masculino e feminino)', type:'tf', diff:1, q:'"Pai" e "mãe" são palavras diferentes.', ans:true, exp:'Verdade — pai (masc.) e mãe (fem.).' },
    { id:'2p139', s:'portugues', t:'Género (masculino e feminino)', type:'fill', diff:2, q:'Feminino de "irmão": ___', ans:['irmã'], exp:'Irmão → irmã.' },

    // ----- Português: Grau (+5 fácil) -----
    { id:'2p140', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:1, q:'"Casinha" é:', opts:['aumentativo','diminutivo'], ans:1, exp:'-inha = diminutivo (pequeno).' },
    { id:'2p141', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:1, q:'"Casarão" é:', opts:['aumentativo','diminutivo'], ans:0, exp:'-ão = aumentativo (grande).' },
    { id:'2p142', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:2, q:'Diminutivo de "pé":', opts:['pézão','pezinho','pés'], ans:1, exp:'Pé → pezinho.' },
    { id:'2p143', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'tf', diff:1, q:'"Cãozinho" é diminutivo de "cão".', ans:true, exp:'Verdade — cão → cãozinho.' },
    { id:'2p144', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'fill', diff:2, q:'Diminutivo de "gato": ___', ans:['gatinho'], exp:'Gato → gatinho.' },

    // ----- Português: Verbos passado/futuro (+5 fácil) -----
    { id:'2p145', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:1, q:'Quando dizes "ontem", falas de:', opts:['presente','passado','futuro'], ans:1, exp:'Ontem = passado (já aconteceu).' },
    { id:'2p146', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:1, q:'Quando dizes "amanhã", falas de:', opts:['presente','passado','futuro'], ans:2, exp:'Amanhã = futuro (vai acontecer).' },
    { id:'2p147', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:1, q:'Quando dizes "agora", falas de:', opts:['presente','passado','futuro'], ans:0, exp:'Agora = presente.' },
    { id:'2p148', s:'portugues', t:'Verbos no passado e futuro', type:'tf', diff:1, q:'"Eu corri" está no passado.', ans:true, exp:'Verdade — corri = passado.' },
    { id:'2p149', s:'portugues', t:'Verbos no passado e futuro', type:'fill', diff:2, q:'Diz uma palavra que mostra que algo JÁ ACONTECEU: ___', ans:['ontem','antes','já'], exp:'Ontem, antes, já → passado (já aconteceu).' },

    // ----- Português: Pontuação (+5 fácil) -----
    { id:'2p150', s:'portugues', t:'Pontuação básica', type:'mc', diff:1, q:'Que sinal vai no fim de uma pergunta?', opts:['.','?','!'], ans:1, exp:'Pergunta → ?.' },
    { id:'2p151', s:'portugues', t:'Pontuação básica', type:'mc', diff:1, q:'Sinal usado no fim de "Olha":', opts:['?','!','.'], ans:1, exp:'Olha! → exclamação.' },
    { id:'2p152', s:'portugues', t:'Pontuação básica', type:'mc', diff:1, q:'Sinal de fim de uma frase normal:', opts:['?','!','.'], ans:2, exp:'Frase declarativa → . (ponto final).' },
    { id:'2p153', s:'portugues', t:'Pontuação básica', type:'tf', diff:2, q:'Depois de ponto final começa-se com letra MAIÚSCULA.', ans:true, exp:'Sempre.' },
    { id:'2p154', s:'portugues', t:'Pontuação básica', type:'fill', diff:1, q:'Sinal de exclamação: ___', ans:['!'], exp:'! para emoção/admiração.' },

    // ----- Matemática: Multiplicação (+5 fácil) -----
    { id:'2m216', s:'matematica', t:'Multiplicação', type:'mc', diff:1, q:'2 × 3 = ?', opts:['5','6','7'], ans:1, exp:'2 × 3 = 6.' },
    { id:'2m217', s:'matematica', t:'Multiplicação', type:'mc', diff:1, q:'1 × 5 = ?', opts:['0','5','15'], ans:1, exp:'Qualquer número × 1 = ele próprio.' },
    { id:'2m218', s:'matematica', t:'Multiplicação', type:'fill', diff:1, q:'3 × 2 = ___', ans:['6'], exp:'3 × 2 = 6.' },
    { id:'2m219', s:'matematica', t:'Multiplicação', type:'tf', diff:1, q:'4 × 0 = 0.', ans:true, exp:'Qualquer número × 0 = 0.' },
    { id:'2m220', s:'matematica', t:'Multiplicação', type:'mc', diff:2, q:'O símbolo da multiplicação é:', opts:['+','×','÷'], ans:1, exp:'× = multiplicação ("vezes").' },

    // ----- Matemática: Divisão (+5 fácil) -----
    { id:'2m221', s:'matematica', t:'Divisão', type:'mc', diff:1, q:'6 ÷ 2 = ?', opts:['2','3','4'], ans:1, exp:'6 ÷ 2 = 3.' },
    { id:'2m222', s:'matematica', t:'Divisão', type:'mc', diff:1, q:'4 ÷ 2 = ?', opts:['1','2','3'], ans:1, exp:'4 ÷ 2 = 2.' },
    { id:'2m223', s:'matematica', t:'Divisão', type:'fill', diff:1, q:'8 ÷ 2 = ___', ans:['4'], exp:'8 ÷ 2 = 4.' },
    { id:'2m224', s:'matematica', t:'Divisão', type:'tf', diff:1, q:'Dividir significa repartir igualmente.', ans:true, exp:'Verdade — divisão = partilha em partes iguais.' },
    { id:'2m225', s:'matematica', t:'Divisão', type:'mc', diff:2, q:'O símbolo da divisão é:', opts:['+','×','÷'], ans:2, exp:'÷ = divisão.' },

    // ----- Matemática: Tabuada do 3 (+5 fácil) -----
    { id:'2m226', s:'matematica', t:'Tabuada do 3', type:'mc', diff:1, q:'3 × 1 = ?', opts:['0','3','6'], ans:1, exp:'3 × 1 = 3.' },
    { id:'2m227', s:'matematica', t:'Tabuada do 3', type:'mc', diff:1, q:'3 × 2 = ?', opts:['5','6','9'], ans:1, exp:'3 × 2 = 6.' },
    { id:'2m228', s:'matematica', t:'Tabuada do 3', type:'fill', diff:2, q:'3 × 3 = ___', ans:['9'], exp:'3 × 3 = 9.' },
    { id:'2m229', s:'matematica', t:'Tabuada do 3', type:'tf', diff:1, q:'3 × 0 = 0.', ans:true, exp:'Qualquer número × 0 = 0.' },

    // ----- Matemática: Tabuada do 4 (+5 fácil) -----
    { id:'2m231', s:'matematica', t:'Tabuada do 4', type:'mc', diff:1, q:'4 × 1 = ?', opts:['0','4','8'], ans:1, exp:'4 × 1 = 4.' },
    { id:'2m232', s:'matematica', t:'Tabuada do 4', type:'mc', diff:1, q:'4 × 2 = ?', opts:['6','8','10'], ans:1, exp:'4 × 2 = 8.' },
    { id:'2m233', s:'matematica', t:'Tabuada do 4', type:'fill', diff:2, q:'4 × 5 = ___', ans:['20'], exp:'4 × 5 = 20.' },
    { id:'2m234', s:'matematica', t:'Tabuada do 4', type:'tf', diff:1, q:'4 × 0 = 0.', ans:true, exp:'Sempre — × 0 dá 0.' },
    { id:'2m235', s:'matematica', t:'Tabuada do 4', type:'mc', diff:2, q:'4 × 4 = ?', opts:['12','16','20'], ans:1, exp:'4 × 4 = 16.' },

    // ----- Matemática: Tabuada do 6 (+5 fácil) -----
    { id:'2m236', s:'matematica', t:'Tabuada do 6', type:'mc', diff:1, q:'6 × 1 = ?', opts:['0','6','12'], ans:1, exp:'6 × 1 = 6.' },
    { id:'2m237', s:'matematica', t:'Tabuada do 6', type:'mc', diff:1, q:'6 × 5 = ?', opts:['25','30','36'], ans:1, exp:'6 × 5 = 30.' },
    { id:'2m238', s:'matematica', t:'Tabuada do 6', type:'fill', diff:2, q:'6 × 3 = ___', ans:['18'], exp:'6 × 3 = 18.' },
    { id:'2m239', s:'matematica', t:'Tabuada do 6', type:'tf', diff:1, q:'6 × 10 = 60.', ans:true, exp:'Verdade — junta 0 ao 6.' },

    // ----- Matemática: Tabuada do 7 (+5 fácil) -----
    { id:'2m241', s:'matematica', t:'Tabuada do 7', type:'mc', diff:1, q:'7 × 1 = ?', opts:['0','7','14'], ans:1, exp:'7 × 1 = 7.' },
    { id:'2m242', s:'matematica', t:'Tabuada do 7', type:'mc', diff:1, q:'7 × 2 = ?', opts:['12','14','16'], ans:1, exp:'7 × 2 = 14.' },
    { id:'2m243', s:'matematica', t:'Tabuada do 7', type:'fill', diff:1, q:'7 × 0 = ___', ans:['0','zero'], exp:'× 0 = 0.' },
    { id:'2m244', s:'matematica', t:'Tabuada do 7', type:'tf', diff:1, q:'7 × 10 = 70.', ans:true, exp:'Verdade — × 10 é acrescentar um zero: 7 → 70.' },

    // ----- Matemática: Tabuada do 8 (+5 fácil) -----
    { id:'2m246', s:'matematica', t:'Tabuada do 8', type:'mc', diff:1, q:'8 × 1 = ?', opts:['0','8','16'], ans:1, exp:'8 × 1 = 8.' },
    { id:'2m247', s:'matematica', t:'Tabuada do 8', type:'mc', diff:1, q:'8 × 2 = ?', opts:['10','14','16'], ans:2, exp:'8 × 2 = 16.' },
    { id:'2m248', s:'matematica', t:'Tabuada do 8', type:'fill', diff:1, q:'8 × 5 = ___', ans:['40'], exp:'8 × 5 = 40.' },
    { id:'2m249', s:'matematica', t:'Tabuada do 8', type:'tf', diff:1, q:'8 × 10 = 80.', ans:true, exp:'Verdade — × 10 acrescenta um zero: 8 → 80.' },
    { id:'2m250', s:'matematica', t:'Tabuada do 8', type:'mc', diff:1, q:'8 × 0 = ?', opts:['0','8','80'], ans:0, exp:'× 0 = 0.' },

    // ----- Matemática: Tabuada do 9 (+5 fácil) -----
    { id:'2m251', s:'matematica', t:'Tabuada do 9', type:'mc', diff:1, q:'9 × 1 = ?', opts:['0','9','18'], ans:1, exp:'9 × 1 = 9.' },
    { id:'2m252', s:'matematica', t:'Tabuada do 9', type:'mc', diff:1, q:'9 × 2 = ?', opts:['11','18','20'], ans:1, exp:'9 × 2 = 18.' },
    { id:'2m254', s:'matematica', t:'Tabuada do 9', type:'tf', diff:1, q:'9 × 0 = 0.', ans:true, exp:'× 0 = 0.' },

    // ----- Matemática: Frações simples (+5 fácil) -----
    { id:'2m256', s:'matematica', t:'Frações simples', type:'mc', diff:2, q:'Metade quer dizer:', opts:['1 parte de 4','1 parte de 2','tudo'], ans:1, exp:'Metade = 1/2 (1 de 2 partes iguais).' },
    { id:'2m257', s:'matematica', t:'Frações simples', type:'mc', diff:2, q:'Metade de 4 é:', opts:['1','2','3'], ans:1, exp:'4 ÷ 2 = 2.' },
    { id:'2m258', s:'matematica', t:'Frações simples', type:'fill', diff:2, q:'Metade de 6 = ___', ans:['3'], exp:'6 ÷ 2 = 3.' },
    { id:'2m259', s:'matematica', t:'Frações simples', type:'tf', diff:1, q:'1/2 lê-se "um meio".', ans:true, exp:'Verdade — 1/2 = um meio = metade.' },
    { id:'2m260', s:'matematica', t:'Frações simples', type:'mc', diff:2, q:'Em 1/4 dividimos em quantas partes?', opts:['2','3','4'], ans:2, exp:'1/4 → dividido em 4 partes iguais.' },

    // ----- Matemática: Comprimento (+5 fácil) -----
    { id:'2m261', s:'matematica', t:'Comprimento', type:'mc', diff:1, q:'O que mede o comprimento?', opts:['quanto pesa','tamanho de ponta a ponta','quanto líquido cabe'], ans:1, exp:'Comprimento = tamanho.' },
    { id:'2m262', s:'matematica', t:'Comprimento', type:'mc', diff:1, q:'Que instrumento mede o comprimento?', opts:['balança','relógio','régua'], ans:2, exp:'A régua mede comprimento.' },
    { id:'2m263', s:'matematica', t:'Comprimento', type:'fill', diff:2, q:'1 m = ___ cm', ans:['100'], exp:'1 metro = 100 centímetros.' },
    { id:'2m264', s:'matematica', t:'Comprimento', type:'tf', diff:2, q:'cm = centímetro.', ans:true, exp:'Verdade — cm é o símbolo de centímetro.' },

    // ----- Matemática: Massa (+5 fácil) -----
    { id:'2m266', s:'matematica', t:'Massa', type:'mc', diff:1, q:'A massa mede-se com:', opts:['régua','balança','copo'], ans:1, exp:'Balança mede massa.' },
    { id:'2m267', s:'matematica', t:'Massa', type:'mc', diff:1, q:'Símbolo de quilograma:', opts:['g','kg','m'], ans:1, exp:'kg = quilograma.' },
    { id:'2m268', s:'matematica', t:'Massa', type:'fill', diff:2, q:'1 kg = ___ g', ans:['1000','1 000'], exp:'1 quilo = 1000 gramas.' },
    { id:'2m269', s:'matematica', t:'Massa', type:'tf', diff:2, q:'g = grama.', ans:true, exp:'Verdade — g é o símbolo de grama.' },
    { id:'2m270', s:'matematica', t:'Massa', type:'mc', diff:2, q:'Uma maçã pesa cerca de:', opts:['150 g','15 kg','1 t'], ans:0, exp:'~150 gramas.' },

    // ----- Matemática: Capacidade (+5 fácil) -----
    { id:'2m271', s:'matematica', t:'Capacidade', type:'mc', diff:2, q:'A capacidade mede:', opts:['quanto pesa','quanto líquido cabe','quanto comprido'], ans:1, exp:'Capacidade = quantidade de líquido.' },
    { id:'2m272', s:'matematica', t:'Capacidade', type:'mc', diff:1, q:'Símbolo de litro:', opts:['L','kg','m'], ans:0, exp:'L = litro.' },
    { id:'2m273', s:'matematica', t:'Capacidade', type:'fill', diff:2, q:'1 L = ___ mL', ans:['1000','1 000'], exp:'1 litro = 1000 mililitros.' },
    { id:'2m274', s:'matematica', t:'Capacidade', type:'tf', diff:2, q:'mL = mililitro.', ans:true, exp:'Verdade — mL é a forma curta de mililitro; mede líquidos pequenos (uma colher tem ~5 mL).' },
    { id:'2m275', s:'matematica', t:'Capacidade', type:'mc', diff:2, q:'Um pacote de leite tem cerca de:', opts:['1 mL','1 L','1 km'], ans:1, exp:'Pacote normal = 1 litro.' },

    // ----- Matemática: Gráficos (+5 fácil) -----
    { id:'2m276', s:'matematica', t:'Gráficos', type:'mc', diff:2, q:'Um gráfico mostra:', opts:['letras','dados (números)','animais'], ans:1, exp:'Gráficos mostram DADOS de forma visual.' },
    { id:'2m277', s:'matematica', t:'Gráficos', type:'mc', diff:2, q:'Pictograma usa:', opts:['só números','imagens','sons'], ans:1, exp:'Pictograma usa IMAGENS para representar dados.' },
    { id:'2m278', s:'matematica', t:'Gráficos', type:'tf', diff:2, q:'Num gráfico de barras, barra mais alta = mais quantidade.', ans:true, exp:'Verdade — barra alta = maior valor.' },
    { id:'2m279', s:'matematica', t:'Gráficos', type:'fill', diff:1, q:'2 + 3 = ___', ans:['5'], exp:'Total simples: 2 + 3 = 5.' },
    { id:'2m280', s:'matematica', t:'Gráficos', type:'mc', diff:2, q:'Num gráfico vês: cães=3, gatos=4. Mais animais?', opts:['cães','gatos','iguais'], ans:1, exp:'Gatos = 4 (mais que 3 cães).' },

    // ----- Estudo do Meio: Astros (+5 fácil) -----
    { id:'2e91', s:'estudo_meio', t:'Astros', type:'mc', diff:1, q:'A Terra é um:', opts:['planeta','estrela','satélite'], ans:0, exp:'A Terra é um planeta.' },
    { id:'2e92', s:'estudo_meio', t:'Astros', type:'tf', diff:1, q:'Vivemos no planeta Terra.', ans:true, exp:'Verdade — vivemos na Terra.' },
    { id:'2e93', s:'estudo_meio', t:'Astros', type:'fill', diff:1, q:'O Sol dá luz e ___ (sensação).', ans:['calor'], exp:'O Sol dá luz e calor.' },
    { id:'2e94', s:'estudo_meio', t:'Astros', type:'mc', diff:1, q:'A Lua vê-se principalmente:', opts:['de manhã','à noite','ao almoço'], ans:1, exp:'A Lua vê-se à noite.' },

    // ----- Estudo do Meio: Transportes (+5 fácil) -----
    { id:'2e95', s:'estudo_meio', t:'Transportes', type:'mc', diff:1, q:'Carro é um transporte:', opts:['terrestre','aéreo','aquático'], ans:0, exp:'Carro anda em terra.' },
    { id:'2e97', s:'estudo_meio', t:'Transportes', type:'mc', diff:1, q:'Barco é um transporte:', opts:['terrestre','aéreo','aquático'], ans:2, exp:'Barco anda na água.' },
    { id:'2e98', s:'estudo_meio', t:'Transportes', type:'tf', diff:1, q:'A bicicleta não polui.', ans:true, exp:'Verdade — não tem motor.' },
    { id:'2e99', s:'estudo_meio', t:'Transportes', type:'fill', diff:1, q:'Atravessar a estrada na ___ (faixa pintada).', ans:['passadeira'], exp:'Passadeira — local seguro para atravessar.' },

    // ----- Estudo do Meio: Higiene (+5 fácil) -----
    { id:'2e100', s:'estudo_meio', t:'Higiene', type:'mc', diff:1, q:'Antes de comer devemos:', opts:['ver TV','lavar as mãos','dormir'], ans:1, exp:'Antes de comer lavamos as mãos para tirar os micróbios e não ficar doentes.' },
    { id:'2e101', s:'estudo_meio', t:'Higiene', type:'mc', diff:1, q:'Devemos escovar os dentes:', opts:['1 vez por mês','todos os dias','quando dói'], ans:1, exp:'Todos os dias (várias vezes).' },
    { id:'2e102', s:'estudo_meio', t:'Higiene', type:'tf', diff:1, q:'O dentista cuida dos dentes.', ans:true, exp:'Verdade — o dentista trata e limpa os dentes; devemos ir 1 a 2 vezes por ano.' },
    { id:'2e103', s:'estudo_meio', t:'Higiene', type:'fill', diff:1, q:'O que se usa para escovar dentes: ___', ans:['escova','escova de dentes'], exp:'Escova de dentes.' },
    { id:'2e104', s:'estudo_meio', t:'Higiene', type:'mc', diff:1, q:'Para nos lavarmos usamos:', opts:['só água','água e sabão','só toalha'], ans:1, exp:'Água + sabão.' },

    // ----- Estudo do Meio: Saúde (+5 fácil) -----
    { id:'2e105', s:'estudo_meio', t:'Saúde', type:'mc', diff:1, q:'O que é mais saudável beber?', opts:['refrigerante','água','sumo açucarado'], ans:1, exp:'Água — sempre a melhor.' },
    { id:'2e106', s:'estudo_meio', t:'Saúde', type:'mc', diff:1, q:'Comida saudável inclui:', opts:['só doces','fruta e legumes','só fritos'], ans:1, exp:'Comida saudável inclui fruta e legumes, ricos em vitaminas; os doces devem ser raros.' },
    { id:'2e107', s:'estudo_meio', t:'Saúde', type:'tf', diff:1, q:'Devemos dormir bastantes horas.', ans:true, exp:'Verdade — 9 a 11 horas (criança).' },
    { id:'2e108', s:'estudo_meio', t:'Saúde', type:'fill', diff:2, q:'Para sermos saudáveis devemos fazer ___ (movimento).', ans:['exercício','exercicio'], exp:'Exercício físico.' },
    { id:'2e109', s:'estudo_meio', t:'Saúde', type:'mc', diff:1, q:'Quem cuida dos doentes?', opts:['professor','médico','padeiro'], ans:1, exp:'O médico (e enfermeiros).' },

    // ----- Estudo do Meio: Comemorações (+5 fácil) -----
    { id:'2e110', s:'estudo_meio', t:'Comemorações', type:'mc', diff:1, q:'No Natal há:', opts:['ovos de chocolate','árvore e presentes','marchas populares'], ans:1, exp:'Árvore de Natal e presentes.' },
    { id:'2e111', s:'estudo_meio', t:'Comemorações', type:'mc', diff:1, q:'Na Páscoa há:', opts:['árvore enfeitada','ovos de chocolate','foguetes'], ans:1, exp:'Ovos de chocolate, amêndoas, folar.' },
    { id:'2e112', s:'estudo_meio', t:'Comemorações', type:'tf', diff:1, q:'O Natal é a 25 de dezembro.', ans:true, exp:'Verdade — o Natal celebra-se sempre a 25 de dezembro.' },
    { id:'2e113', s:'estudo_meio', t:'Comemorações', type:'fill', diff:2, q:'Festa em que nos vestimos com fatos: ___', ans:['Carnaval','carnaval'], exp:'Carnaval — fatos e máscaras.' },
    { id:'2e114', s:'estudo_meio', t:'Comemorações', type:'mc', diff:1, q:'No Dia da Mãe damos:', opts:['nada','flores ou prendas','dinheiro'], ans:1, exp:'Flores, prendas ou um abraço.' },

    // ----- Inglês: Alfabeto (+5 fácil) -----
    { id:'2i79', s:'ingles', t:'Alfabeto', type:'mc', diff:1, q:'Primeira letra do alfabeto:', opts:['A','B','Z'], ans:0, exp:'A é a primeira.' },
    { id:'2i80', s:'ingles', t:'Alfabeto', type:'mc', diff:1, q:'Última letra do alfabeto inglês:', opts:['X','Y','Z'], ans:2, exp:'Z é a última.' },
    { id:'2i81', s:'ingles', t:'Alfabeto', type:'tf', diff:1, q:'O alfabeto inglês tem 26 letras.', ans:true, exp:'Verdade — o alfabeto inglês tem 26 letras, tal como o português (de A a Z).' },
    { id:'2i82', s:'ingles', t:'Alfabeto', type:'fill', diff:1, q:'Letra que vem depois do A: ___', ans:['B','b'], exp:'A → B.' },
    { id:'2i83', s:'ingles', t:'Alfabeto', type:'mc', diff:1, q:'Letra antes do C:', opts:['A','B','D'], ans:1, exp:'A → B → C. B vem antes.' },

    // ----- Inglês: Body (+5 fácil) -----
    { id:'2i84', s:'ingles', t:'Body', type:'mc', diff:1, q:'👁️ em inglês:', opts:['eye','ear','nose'], ans:0, exp:'Olho em inglês é eye (lê-se ai).' },
    { id:'2i86', s:'ingles', t:'Body', type:'mc', diff:1, q:'✋ em inglês:', opts:['hand','foot','head'], ans:0, exp:'Mão em inglês é hand.' },
    { id:'2i87', s:'ingles', t:'Body', type:'tf', diff:2, q:'"Head" significa cabeça.', ans:true, exp:'Verdade — head = cabeça. Fixa: head, shoulders, knees and toes!' },
    { id:'2i88', s:'ingles', t:'Body', type:'fill', diff:1, q:'Pé em inglês: ___', ans:['foot'], exp:'Foot = pé.' },

    // ----- Inglês: Food (+5 fácil) -----
    { id:'2i89', s:'ingles', t:'Food', type:'mc', diff:1, q:'🍎 em inglês:', opts:['apple','orange','pear'], ans:0, exp:'Maçã em inglês é apple (lê-se á-pol).' },
    { id:'2i92', s:'ingles', t:'Food', type:'tf', diff:2, q:'"Bread" significa pão.', ans:true, exp:'Verdade — bread = pão. Lê-se ’bréd’.' },
    { id:'2i93', s:'ingles', t:'Food', type:'fill', diff:1, q:'Água em inglês: ___', ans:['water'], exp:'Water = água.' },

    // ----- Inglês: Toys (+5 fácil) -----
    { id:'2i97', s:'ingles', t:'Toys', type:'tf', diff:2, q:'"Doll" significa boneca.', ans:true, exp:'Verdade — doll = boneca (brinquedo).' },
    { id:'2i98', s:'ingles', t:'Toys', type:'fill', diff:1, q:'Livro em inglês: ___', ans:['book'], exp:'Book = livro.' },

    // ============================================================
    // ===== EXTRA-FÁCIL 2 ano - SEGUNDO bloco (mais 5 por tópico)
    // ============================================================

    // ----- Português: Hiato (+5 fácil) -----
    { id:'2p155', s:'portugues', t:'Hiato', type:'tf', diff:1, q:'"Saúde" tem 3 sílabas.', ans:true, exp:'sa-ú-de = 3 sílabas (hiato).' },
    { id:'2p156', s:'portugues', t:'Hiato', type:'mc', diff:1, q:'No HIATO, dizes as 2 vogais:', opts:['ao mesmo tempo','separadas (em sílabas diferentes)'], ans:1, exp:'Hiato = sílabas diferentes.' },
    { id:'2p158', s:'portugues', t:'Hiato', type:'fill', diff:1, q:'Quantas sílabas tem "baú"? ___', ans:['2','duas'], exp:'ba-ú = 2 sílabas.' },
    { id:'2p159', s:'portugues', t:'Hiato', type:'tf', diff:1, q:'Bater palmas ajuda a contar sílabas.', ans:true, exp:'Sim! Cada palmada = 1 sílaba.' },

    // ----- Português: Nomes próprios e comuns (+5 fácil) -----
    { id:'2p160', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:1, q:'"Bobi" (cão) é nome:', opts:['comum','próprio'], ans:1, exp:'É o nome do cão → próprio.' },
    { id:'2p161', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:1, q:'"Cão" é nome:', opts:['comum','próprio'], ans:0, exp:'Refere todos os cães → comum.' },
    { id:'2p162', s:'portugues', t:'Nomes próprios e comuns', type:'tf', diff:1, q:'Nomes próprios começam por maiúscula.', ans:true, exp:'Sempre.' },
    { id:'2p163', s:'portugues', t:'Nomes próprios e comuns', type:'fill', diff:1, q:'Diz o nome próprio de um menino: ___', ans:['João','Pedro','Tomás','Miguel','Diogo','Tiago','Rui','Rodrigo','Gonçalo'], exp:'Qualquer nome de menino.' },
    { id:'2p164', s:'portugues', t:'Nomes próprios e comuns', type:'mc', diff:1, q:'Nome PRÓPRIO desta lista:', opts:['casa','Porto','livro','cão'], ans:1, exp:'Porto é o nome de uma cidade.' },

    // ----- Português: Adjetivos (+5 fácil) -----
    { id:'2p165', s:'portugues', t:'Adjetivos', type:'mc', diff:1, q:'Em "menina alta", o adjetivo é:', opts:['menina','alta'], ans:1, exp:'Alta descreve a menina.' },
    { id:'2p166', s:'portugues', t:'Adjetivos', type:'mc', diff:1, q:'Adjetivo desta lista:', opts:['saltar','feliz','escola'], ans:1, exp:'Feliz = adjetivo (sentimento).' },
    { id:'2p167', s:'portugues', t:'Adjetivos', type:'tf', diff:1, q:'"Triste" é um adjetivo.', ans:true, exp:'Sim — descreve sentimento.' },
    { id:'2p168', s:'portugues', t:'Adjetivos', type:'fill', diff:1, q:'Adjetivo de tamanho: ___', ans:['grande','pequeno','alto','baixo','curto','comprido'], exp:'Grande, pequeno, alto, etc.' },
    { id:'2p169', s:'portugues', t:'Adjetivos', type:'mc', diff:1, q:'O adjetivo qualifica:', opts:['o nome','o verbo','o número'], ans:0, exp:'Adjetivo descreve o nome.' },

    // ----- Português: Género (+5 fácil) -----
    { id:'2p170', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:1, q:'"O cão" é:', opts:['masculino','feminino'], ans:0, exp:'O = masculino.' },
    { id:'2p171', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:1, q:'"A menina" é:', opts:['masculino','feminino'], ans:1, exp:'A = feminino.' },
    { id:'2p172', s:'portugues', t:'Género (masculino e feminino)', type:'mc', diff:2, q:'Feminino de "gato":', opts:['gata','gatão','gatinho'], ans:0, exp:'Gato → gata.' },
    { id:'2p173', s:'portugues', t:'Género (masculino e feminino)', type:'tf', diff:1, q:'"A flor" é feminino.', ans:true, exp:'Verdade — diz-se "a flor".' },
    { id:'2p174', s:'portugues', t:'Género (masculino e feminino)', type:'fill', diff:2, q:'Feminino de "tio": ___', ans:['tia'], exp:'Tio → tia.' },

    // ----- Português: Grau (+5 fácil) -----
    { id:'2p175', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:1, q:'"Cãozinho" é:', opts:['aumentativo','diminutivo'], ans:1, exp:'-zinho = diminutivo.' },
    { id:'2p176', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:1, q:'"Livrão" é:', opts:['aumentativo','diminutivo'], ans:0, exp:'-ão = aumentativo.' },
    { id:'2p177', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'tf', diff:1, q:'"Florzinha" é diminutivo de "flor".', ans:true, exp:'Verdade — o diminutivo indica algo pequeno: flor → florzinha (-zinha é a marca).' },
    { id:'2p178', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'fill', diff:2, q:'Diminutivo de "menino": ___', ans:['meninozinho','menininho'], exp:'Menino → meninozinho.' },
    { id:'2p179', s:'portugues', t:'Grau (aumentativo e diminutivo)', type:'mc', diff:2, q:'Aumentativo de "casa":', opts:['casinha','casarão','casita'], ans:1, exp:'Casa → casarão.' },

    // ----- Português: Verbos passado/futuro (+5 fácil) -----
    { id:'2p180', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:1, q:'"Hoje brinco" está no:', opts:['passado','presente','futuro'], ans:1, exp:'Hoje + brinco = presente.' },
    { id:'2p181', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:2, q:'A palavra "ontem" fala de que tempo?', opts:['presente','passado','futuro'], ans:1, exp:'Ontem = passado (já aconteceu).' },
    { id:'2p182', s:'portugues', t:'Verbos no passado e futuro', type:'mc', diff:2, q:'A palavra "amanhã" fala de que tempo?', opts:['presente','passado','futuro'], ans:2, exp:'Amanhã = futuro (vai acontecer).' },
    { id:'2p183', s:'portugues', t:'Verbos no passado e futuro', type:'tf', diff:1, q:'O passado é o que já aconteceu.', ans:true, exp:'Verdade — o passado é o tempo do que JÁ aconteceu (ontem, no ano passado).' },
    { id:'2p184', s:'portugues', t:'Verbos no passado e futuro', type:'fill', diff:2, q:'Diz uma palavra que mostra que algo VAI ACONTECER: ___', ans:['amanhã','depois','logo'], exp:'Amanhã, depois, logo → futuro (vai acontecer).' },

    // ----- Português: Pontuação (+5 fácil) -----
    { id:'2p185', s:'portugues', t:'Pontuação básica', type:'mc', diff:1, q:'Sinal "?" usa-se em:', opts:['perguntas','exclamações','frases simples'], ans:0, exp:'? = pergunta.' },
    { id:'2p186', s:'portugues', t:'Pontuação básica', type:'mc', diff:1, q:'Sinal "!" usa-se em:', opts:['perguntas','exclamações/admiração','listas'], ans:1, exp:'! = exclamação.' },
    { id:'2p187', s:'portugues', t:'Pontuação básica', type:'tf', diff:1, q:'O ponto final é "."', ans:true, exp:'Verdade — o ponto final (.) marca o fim de uma frase.' },
    { id:'2p188', s:'portugues', t:'Pontuação básica', type:'fill', diff:1, q:'Sinal usado para fazer pequena pausa: ___', ans:[',','vírgula'], exp:'Vírgula (,).' },
    { id:'2p189', s:'portugues', t:'Pontuação básica', type:'mc', diff:1, q:'Toda a frase termina com:', opts:['nada','algum sinal de pontuação'], ans:1, exp:'Sempre termina com ., ? ou !.' },

    // ----- Mat: Multiplicação (+5 fácil) -----
    { id:'2m281', s:'matematica', t:'Multiplicação', type:'mc', diff:1, q:'2 × 2 = ?', opts:['3','4','5'], ans:1, exp:'2 × 2 = 4.' },
    { id:'2m282', s:'matematica', t:'Multiplicação', type:'mc', diff:1, q:'2 × 5 = ?', opts:['7','10','12'], ans:1, exp:'2 × 5 = 10.' },
    { id:'2m283', s:'matematica', t:'Multiplicação', type:'fill', diff:1, q:'2 × 4 = ___', ans:['8'], exp:'2 × 4 = 8.' },
    { id:'2m284', s:'matematica', t:'Multiplicação', type:'tf', diff:1, q:'5 × 2 = 2 × 5.', ans:true, exp:'Verdade — ordem não muda.' },
    { id:'2m285', s:'matematica', t:'Multiplicação', type:'mc', diff:1, q:'10 × 1 = ?', opts:['1','10','100'], ans:1, exp:'× 1 = ele próprio.' },

    // ----- Mat: Divisão (+5 fácil) -----
    { id:'2m286', s:'matematica', t:'Divisão', type:'mc', diff:1, q:'2 ÷ 2 = ?', opts:['0','1','2'], ans:1, exp:'2 ÷ 2 = 1.' },
    { id:'2m287', s:'matematica', t:'Divisão', type:'mc', diff:2, q:'10 ÷ 5 = ?', opts:['1','2','5'], ans:1, exp:'10 ÷ 5 = 2.' },
    { id:'2m288', s:'matematica', t:'Divisão', type:'fill', diff:1, q:'10 ÷ 2 = ___', ans:['5'], exp:'10 ÷ 2 = 5.' },
    { id:'2m289', s:'matematica', t:'Divisão', type:'tf', diff:2, q:'12 ÷ 4 = 3.', ans:true, exp:'Verdade — 12 repartido por 4 dá 3 em cada grupo (4 × 3 = 12).' },
    { id:'2m290', s:'matematica', t:'Divisão', type:'mc', diff:2, q:'Tens 4 maçãs e 2 amigos. Cada um leva:', opts:['1','2','4'], ans:1, exp:'4 ÷ 2 = 2.' },

    // ----- Mat: Tabuada do 3 (+5 fácil) -----
    { id:'2m291', s:'matematica', t:'Tabuada do 3', type:'mc', diff:2, q:'3 × 5 = ?', opts:['10','15','20'], ans:1, exp:'3 × 5 = 15.' },
    { id:'2m294', s:'matematica', t:'Tabuada do 3', type:'tf', diff:1, q:'3 × 1 = 3.', ans:true, exp:'Verdade — × 1 não muda o número: 3 × 1 = 3.' },

    // ----- Mat: Tabuada do 4 (+5 fácil) -----
    { id:'2m299', s:'matematica', t:'Tabuada do 4', type:'tf', diff:1, q:'4 × 1 = 4.', ans:true, exp:'Verdade — qualquer número × 1 fica igual: 4 × 1 = 4.' },

    // ----- Mat: Tabuada do 6 (+5 fácil) -----
    { id:'2m304', s:'matematica', t:'Tabuada do 6', type:'tf', diff:1, q:'6 × 1 = 6.', ans:true, exp:'Verdade — × 1 mantém o número: 6 × 1 = 6.' },

    // ----- Mat: Tabuada do 7 (+5 fácil) -----
    { id:'2m306', s:'matematica', t:'Tabuada do 7', type:'mc', diff:2, q:'7 × 4 = ?', opts:['21','28','35'], ans:1, exp:'7 × 4 = 28.' },
    { id:'2m309', s:'matematica', t:'Tabuada do 7', type:'tf', diff:1, q:'7 × 1 = 7.', ans:true, exp:'Verdade — × 1 não altera: 7 × 1 = 7.' },

    // ----- Mat: Tabuada do 8 (+5 fácil) -----
    { id:'2m313', s:'matematica', t:'Tabuada do 8', type:'fill', diff:1, q:'8 × 10 = ___', ans:['80'], exp:'8 × 10 = 80.' },
    { id:'2m314', s:'matematica', t:'Tabuada do 8', type:'tf', diff:1, q:'8 × 1 = 8.', ans:true, exp:'Verdade — × 1 dá o próprio número: 8 × 1 = 8.' },

    // ----- Mat: Tabuada do 9 (+5 fácil) -----
    { id:'2m319', s:'matematica', t:'Tabuada do 9', type:'tf', diff:1, q:'9 × 1 = 9.', ans:true, exp:'Verdade — multiplicar por 1 mantém tudo igual: 9 × 1 = 9.' },

    // ----- Mat: Frações simples (+5 fácil) -----
    { id:'2m321', s:'matematica', t:'Frações simples', type:'mc', diff:2, q:'Metade de 2 maçãs:', opts:['1','2','4'], ans:0, exp:'Metade = 1 maçã.' },
    { id:'2m323', s:'matematica', t:'Frações simples', type:'fill', diff:2, q:'Metade de 8 = ___', ans:['4'], exp:'8 ÷ 2 = 4.' },
    { id:'2m324', s:'matematica', t:'Frações simples', type:'tf', diff:1, q:'1/4 lê-se "um quarto".', ans:true, exp:'Verdade — 1/4 lê-se ’um quarto’: 1 parte de 4 iguais.' },
    { id:'2m325', s:'matematica', t:'Frações simples', type:'mc', diff:2, q:'Em 1/2 dividimos em quantas partes?', opts:['1','2','4'], ans:1, exp:'1/2 → 2 partes iguais.' },

    // ----- Mat: Comprimento (+5 fácil) -----
    { id:'2m326', s:'matematica', t:'Comprimento', type:'mc', diff:1, q:'Símbolo de metro:', opts:['m','kg','L'], ans:0, exp:'m = metro.' },
    { id:'2m327', s:'matematica', t:'Comprimento', type:'mc', diff:2, q:'Para distâncias longas usa-se:', opts:['mm','cm','km'], ans:2, exp:'km = quilómetros (longas distâncias).' },
    { id:'2m328', s:'matematica', t:'Comprimento', type:'fill', diff:2, q:'1 km = ___ m', ans:['1000','1 000'], exp:'1 km = 1000 metros.' },
    { id:'2m329', s:'matematica', t:'Comprimento', type:'tf', diff:1, q:'A régua serve para medir comprimento.', ans:true, exp:'Verdade — a régua mede comprimentos, em centímetros (cm).' },
    { id:'2m330', s:'matematica', t:'Comprimento', type:'mc', diff:2, q:'A altura de uma porta é:', opts:['2 cm','2 m','2 km'], ans:1, exp:'~2 metros.' },

    // ----- Mat: Massa (+5 fácil) -----
    { id:'2m331', s:'matematica', t:'Massa', type:'mc', diff:2, q:'Para coisas pequenas (sal) usa-se:', opts:['g','kg','t'], ans:0, exp:'g = gramas (coisas pequenas).' },
    { id:'2m332', s:'matematica', t:'Massa', type:'mc', diff:2, q:'Para uma criança usa-se:', opts:['g','kg','mL'], ans:1, exp:'kg — uma criança ~25 kg.' },
    { id:'2m333', s:'matematica', t:'Massa', type:'fill', diff:2, q:'A balança mede a ___', ans:['massa'], exp:'A balança mede a massa.' },
    { id:'2m334', s:'matematica', t:'Massa', type:'tf', diff:2, q:'kg = quilograma.', ans:true, exp:'Verdade — kg é a forma curta de quilograma; mede o peso (1 kg = 1000 g).' },
    { id:'2m335', s:'matematica', t:'Massa', type:'mc', diff:2, q:'1 quilo tem quantos gramas?', opts:['10','100','1000'], ans:2, exp:'1 kg = 1000 g.' },

    // ----- Mat: Capacidade (+5 fácil) -----
    { id:'2m337', s:'matematica', t:'Capacidade', type:'mc', diff:1, q:'Para medir líquidos usa-se:', opts:['balança','copo medidor','régua'], ans:1, exp:'Copo graduado/medidor.' },
    { id:'2m338', s:'matematica', t:'Capacidade', type:'fill', diff:2, q:'1 litro = ___ mL', ans:['1000','1 000'], exp:'1 L = 1000 mL.' },
    { id:'2m340', s:'matematica', t:'Capacidade', type:'mc', diff:2, q:'Uma garrafa típica de água tem cerca de:', opts:['1 mL','1 L','100 L'], ans:1, exp:'~1 a 1,5 L.' },

    // ----- Mat: Gráficos (+5 fácil) -----
    { id:'2m342', s:'matematica', t:'Gráficos', type:'mc', diff:2, q:'Gráfico de barras: barra alta = ?', opts:['mais','menos','igual'], ans:0, exp:'Barra alta = MAIS.' },
    { id:'2m343', s:'matematica', t:'Gráficos', type:'fill', diff:1, q:'2 + 2 = ___', ans:['4'], exp:'2 + 2 = 4.' },
    { id:'2m344', s:'matematica', t:'Gráficos', type:'tf', diff:2, q:'Os gráficos mostram dados de forma visual.', ans:true, exp:'Verdade — os gráficos mostram os números em desenho (barras, imagens), mais fáceis de comparar.' },
    { id:'2m345', s:'matematica', t:'Gráficos', type:'mc', diff:2, q:'Tabela: maçãs=3, peras=2. Qual mais?', opts:['maçãs','peras','iguais'], ans:0, exp:'Maçãs = 3 (mais que 2).' },

    // ----- Estudo do Meio: Astros (+5 fácil) -----
    { id:'2e115', s:'estudo_meio', t:'Astros', type:'mc', diff:1, q:'O Sol vê-se durante:', opts:['o dia','a noite'], ans:0, exp:'O Sol é a estrela do dia.' },
    { id:'2e116', s:'estudo_meio', t:'Astros', type:'mc', diff:1, q:'A Lua tem luz própria?', opts:['sim','não'], ans:1, exp:'Não — reflete a luz do Sol.' },
    { id:'2e117', s:'estudo_meio', t:'Astros', type:'tf', diff:1, q:'A Terra é o nosso planeta.', ans:true, exp:'Verdade — vivemos no planeta Terra, o terceiro a contar do Sol.' },
    { id:'2e118', s:'estudo_meio', t:'Astros', type:'fill', diff:1, q:'O Sol dá luz e ___', ans:['calor'], exp:'Luz e calor.' },
    { id:'2e119', s:'estudo_meio', t:'Astros', type:'mc', diff:1, q:'As estrelas vêem-se:', opts:['de dia','à noite'], ans:1, exp:'À noite (sem o Sol).' },

    // ----- Estudo do Meio: Transportes (+5 fácil) -----
    { id:'2e120', s:'estudo_meio', t:'Transportes', type:'mc', diff:1, q:'Avião vai pelo:', opts:['terra','ar','água'], ans:1, exp:'Avião voa.' },
    { id:'2e121', s:'estudo_meio', t:'Transportes', type:'mc', diff:1, q:'Bicicleta é transporte:', opts:['terrestre','aéreo','aquático'], ans:0, exp:'Bicicleta anda em terra.' },
    { id:'2e122', s:'estudo_meio', t:'Transportes', type:'tf', diff:1, q:'Devemos usar capacete na bicicleta.', ans:true, exp:'Sempre — proteção.' },
    { id:'2e123', s:'estudo_meio', t:'Transportes', type:'fill', diff:1, q:'No carro usamos o ___ de segurança.', ans:['cinto'], exp:'Cinto de segurança.' },
    { id:'2e124', s:'estudo_meio', t:'Transportes', type:'mc', diff:1, q:'Comboio anda em:', opts:['ar','carris (terra)','água'], ans:1, exp:'Em carris (terrestre).' },

    // ----- Estudo do Meio: Higiene (+5 fácil) -----
    { id:'2e125', s:'estudo_meio', t:'Higiene', type:'mc', diff:1, q:'Para tomar banho precisas de:', opts:['só água','água e sabão','só sabão'], ans:1, exp:'Água + sabão.' },
    { id:'2e126', s:'estudo_meio', t:'Higiene', type:'mc', diff:1, q:'Para escovar os dentes usas:', opts:['escova de dentes','garfo','colher'], ans:0, exp:'Para escovar os dentes usamos a escova de dentes com pasta, de manhã e à noite.' },
    { id:'2e127', s:'estudo_meio', t:'Higiene', type:'tf', diff:1, q:'É importante lavar as mãos.', ans:true, exp:'Verdade — lavar as mãos tira os micróbios e evita doenças.' },
    { id:'2e128', s:'estudo_meio', t:'Higiene', type:'fill', diff:1, q:'Quem cuida dos dentes: ___', ans:['dentista'], exp:'Dentista.' },
    { id:'2e129', s:'estudo_meio', t:'Higiene', type:'mc', diff:1, q:'Devemos cortar as:', opts:['orelhas','unhas','sobrancelhas'], ans:1, exp:'Unhas (manter limpas).' },

    // ----- Estudo do Meio: Saúde (+5 fácil) -----
    { id:'2e130', s:'estudo_meio', t:'Saúde', type:'mc', diff:1, q:'Bebida mais saudável:', opts:['água','refrigerante','álcool'], ans:0, exp:'Água — sempre.' },
    { id:'2e131', s:'estudo_meio', t:'Saúde', type:'mc', diff:1, q:'Devemos comer:', opts:['só doces','fruta e legumes','só fritos'], ans:1, exp:'Devemos comer fruta e legumes todos os dias — dão vitaminas e fibras.' },
    { id:'2e132', s:'estudo_meio', t:'Saúde', type:'tf', diff:1, q:'Dormir bem é importante.', ans:true, exp:'Verdade — dormir bem (10-11 h) ajuda o corpo e a cabeça a descansar e a crescer.' },
    { id:'2e133', s:'estudo_meio', t:'Saúde', type:'fill', diff:1, q:'Atividade que faz bem ao corpo: ___', ans:['exercício','desporto','exercicio'], exp:'Exercício / desporto.' },
    { id:'2e134', s:'estudo_meio', t:'Saúde', type:'mc', diff:1, q:'Vacinas:', opts:['fazem mal','protegem-nos','não servem'], ans:1, exp:'Vacinas protegem de doenças.' },

    // ----- Estudo do Meio: Comemorações (+5 fácil) -----
    { id:'2e137', s:'estudo_meio', t:'Comemorações', type:'tf', diff:1, q:'O Natal é em dezembro.', ans:true, exp:'25 de dezembro.' },
    { id:'2e138', s:'estudo_meio', t:'Comemorações', type:'fill', diff:1, q:'Festa de fatos e máscaras: ___', ans:['Carnaval','carnaval'], exp:'Carnaval.' },
    { id:'2e139', s:'estudo_meio', t:'Comemorações', type:'mc', diff:1, q:'Aniversário é o dia em que:', opts:['vamos à escola','nascemos','dormimos'], ans:1, exp:'Dia em que nascemos.' },

    // ----- Inglês: Alfabeto (+5 fácil) -----
    { id:'2i99', s:'ingles', t:'Alfabeto', type:'mc', diff:1, q:'Alfabeto inglês tem ___ letras:', opts:['20','23','26'], ans:2, exp:'26 letras.' },
    { id:'2i100', s:'ingles', t:'Alfabeto', type:'mc', diff:1, q:'Letra que vem depois do B:', opts:['A','C','D'], ans:1, exp:'A → B → C.' },
    { id:'2i101', s:'ingles', t:'Alfabeto', type:'tf', diff:1, q:'A letra Z é a última.', ans:true, exp:'Verdade — Z é a última letra do alfabeto; A é a primeira.' },
    { id:'2i102', s:'ingles', t:'Alfabeto', type:'fill', diff:1, q:'Primeira letra do alfabeto: ___', ans:['A','a'], exp:'A é a primeira.' },
    { id:'2i103', s:'ingles', t:'Alfabeto', type:'mc', diff:1, q:'A letra "A" diz-se em inglês:', opts:['"a"','"ei"','"ah"'], ans:1, exp:'A em inglês = "ei".' },

    // ----- Inglês: Body (+5 fácil) -----
    { id:'2i104', s:'ingles', t:'Body', type:'mc', diff:1, q:'Olho em inglês:', opts:['eye','ear','arm'], ans:0, exp:'Eye = olho.' },
    { id:'2i105', s:'ingles', t:'Body', type:'mc', diff:1, q:'Boca em inglês:', opts:['nose','mouth','head'], ans:1, exp:'Mouth = boca.' },
    { id:'2i106', s:'ingles', t:'Body', type:'tf', diff:2, q:'"Hand" significa mão.', ans:true, exp:'Verdade — hand = mão. Fixa: I clap my hands!' },
    { id:'2i107', s:'ingles', t:'Body', type:'fill', diff:1, q:'Cabeça em inglês: ___', ans:['head'], exp:'Head = cabeça.' },
    { id:'2i108', s:'ingles', t:'Body', type:'mc', diff:1, q:'Perna em inglês:', opts:['leg','arm','head'], ans:0, exp:'Leg = perna.' },

    // ----- Inglês: Food (+5 fácil) -----
    { id:'2i109', s:'ingles', t:'Food', type:'mc', diff:1, q:'Maçã em inglês:', opts:['apple','banana','orange'], ans:0, exp:'Apple = maçã.' },
    { id:'2i110', s:'ingles', t:'Food', type:'mc', diff:1, q:'Pão em inglês:', opts:['bread','milk','egg'], ans:0, exp:'Bread = pão.' },
    { id:'2i111', s:'ingles', t:'Food', type:'tf', diff:2, q:'"Milk" significa leite.', ans:true, exp:'Verdade — milk = leite. Lê-se ’milk’.' },
    { id:'2i113', s:'ingles', t:'Food', type:'mc', diff:1, q:'Banana em inglês:', opts:['apple','banana','pear'], ans:1, exp:'Banana = igual em inglês.' },

    // ----- Inglês: Toys (+5 fácil) -----
    { id:'2i114', s:'ingles', t:'Toys', type:'mc', diff:1, q:'Bola em inglês:', opts:['ball','car','book'], ans:0, exp:'Ball = bola.' },
    { id:'2i115', s:'ingles', t:'Toys', type:'mc', diff:1, q:'Carro em inglês:', opts:['ball','car','book'], ans:1, exp:'Car = carro.' },
    { id:'2i116', s:'ingles', t:'Toys', type:'tf', diff:2, q:'"Book" significa livro.', ans:true, exp:'Verdade — book = livro. Lê-se ’búk’.' },
    { id:'2i117', s:'ingles', t:'Toys', type:'fill', diff:1, q:'Boneca em inglês: ___', ans:['doll'], exp:'Doll = boneca.' },
    { id:'2i118', s:'ingles', t:'Toys', type:'mc', diff:1, q:'Bicicleta em inglês:', opts:['bike','car','train'], ans:0, exp:'Bike (ou bicycle).' }
];
window.EXERCISES_BASE_2 = EXERCISES_2;
})();
