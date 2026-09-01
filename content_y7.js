// Gerado a partir de content.js (v571): banco BASE deste ano, carregado
// só quando um perfil deste ano está ativo (loadYearExtras). IIFE para não
// colidir com os const vazios de content.js.
(function () {
const EXERCISES_7 = [
    // =============== PORTUGUÊS ===============
    { id:'7p_nar1', s:'portugues', t:'Texto narrativo', type:'mc', diff:1, q:'📖 O narrador que conta uma história em 1.ª pessoa é:', opts:['heterodiegético','participante','autor'], ans:1, exp:'Participante / autodiegético: usa "eu".' },
    { id:'7p_nar2', s:'portugues', t:'Texto narrativo', type:'mc', diff:2, q:'📖 Recuo no tempo da narrativa chama-se:', opts:['analepse','prolepse','epígrafe'], ans:0, exp:'Analepse = recuo; prolepse = antecipação.' },
    { id:'7p_nar3', s:'portugues', t:'Texto narrativo', type:'tf', diff:1, q:'O narrador é a pessoa real que escreve.', ans:false, exp:'Falso — quem escreve é o AUTOR; o narrador é uma voz dentro do texto.' },

    { id:'7p_con1', s:'portugues', t:'Conto tradicional', type:'mc', diff:1, q:'📚 No conto tradicional, o autor é:', opts:['conhecido','anónimo','pseudónimo'], ans:1, exp:'Origem popular, anónima.' },
    { id:'7p_con2', s:'portugues', t:'Conto tradicional', type:'mc', diff:2, q:'🏰 "Era uma vez..." é típico de:', opts:['lenda','conto tradicional','crónica'], ans:1, exp:'Tempo e espaço imprecisos no conto tradicional.' },

    { id:'7p_lus1', s:'portugues', t:'Os Lusíadas (excertos)', type:'mc', diff:1, q:'📜 Os Lusíadas foi escrito por:', opts:['Fernando Pessoa','Luís Vaz de Camões','Eça de Queirós'], ans:1, exp:'Camões, publicado em 1572.' ,
      intro: "**Os Lusíadas** é a obra mais famosa da literatura portuguesa, escrita pelo nosso maior poeta. Conta a viagem que mudou o mundo: chegar à Índia por mar.",
      hint: "O autor viveu no séc. XVI, foi soldado em África e na Índia, perdeu um olho em combate. Adivinha quem é!",
      richExp: "**Luís Vaz de Camões (1524?–1580)** — poeta português.\n\nViveu uma vida cheia de aventuras: estudou em Coimbra, foi soldado em África e na Ásia, naufragou no rio Mecom (Camboja) salvando apenas o manuscrito de Os Lusíadas.\n\n**Os Lusíadas (1572)**:\n- Epopeia em 10 cantos.\n- Estâncias = oitavas (8 versos decassílabos).\n- Esquema rimático: abababcc.\n- **Tema**: a viagem de Vasco da Gama à Índia (1497-99) + história de Portugal.\n\n**Episódios famosos (3.º período)**:\n- **Inês de Castro** (amor trágico, Canto III)\n- **Adamastor** (gigante no Cabo da Boa Esperança, Canto V)\n- **Consílio dos Deuses** (Canto I)\n\n**Conexão histórica**: este foi o tempo dos Descobrimentos — Portugal a chegar a sítios que ninguém da Europa conhecia."},
    { id:'7p_lus2', s:'portugues', t:'Os Lusíadas (excertos)', type:'mc', diff:2, q:'📜 Os Lusíadas tem ___ cantos:', opts:['8','10','12'], ans:1, exp:'10 cantos.' },
    { id:'7p_lus3', s:'portugues', t:'Os Lusíadas (excertos)', type:'fill', diff:2, q:'Personagem épica protagonista da viagem narrada nos Lusíadas: ___', ans:['Vasco da Gama','Gama'], exp:'Vasco da Gama, viagem à Índia (1497-99).' },
    { id:'7p_lus4', s:'portugues', t:'Os Lusíadas (excertos)', type:'mc', diff:2, q:'⚔️ Episódio do gigante no Cabo da Boa Esperança:', opts:['Inês de Castro','Adamastor','Consílio dos Deuses'], ans:1, exp:'Adamastor — Canto V.' },

    { id:'7p_suj1', s:'portugues', t:'Sujeito e predicado', type:'mc', diff:1, q:'🔤 Em "O João correu", o sujeito é:', opts:['O João','correu','sujeito nulo'], ans:0, exp:'O João = sujeito.' },
    { id:'7p_suj2', s:'portugues', t:'Sujeito e predicado', type:'mc', diff:2, q:'🔤 Em "Chove muito", o sujeito é:', opts:['simples','composto','nulo expletivo'], ans:2, exp:'Verbos meteorológicos não têm sujeito → nulo expletivo.' },

    { id:'7p_comp1', s:'portugues', t:'Complementos verbais', type:'mc', diff:1, q:'🔤 Em "Comi um bolo", "um bolo" é:', opts:['CD','CI','oblíquo'], ans:0, exp:'Substituível por -o: "Comi-o" → CD.' },
    { id:'7p_comp2', s:'portugues', t:'Complementos verbais', type:'mc', diff:2, q:'🔤 Em "Dei o livro à Ana", "à Ana" é:', opts:['CD','CI','agente'], ans:1, exp:'Substituível por "lhe" → CI.' },
    { id:'7p_comp3', s:'portugues', t:'Complementos verbais', type:'mc', diff:2, q:'🔤 Em "O livro foi escrito pelo autor", "pelo autor" é:', opts:['CD','CI','complemento agente da passiva'], ans:2, exp:'Frase passiva — agente introduzido por "por".' },

    { id:'7p_poe1', s:'portugues', t:'Texto poético', type:'mc', diff:1, q:'📜 Cada linha de um poema chama-se:', opts:['estrofe','verso','estância'], ans:1, exp:'Cada linha de um poema chama-se verso; um conjunto de versos forma uma estrofe.' },
    { id:'7p_poe2', s:'portugues', t:'Texto poético', type:'mc', diff:2, q:'📜 Esquema rimático abab é:', opts:['emparelhada','cruzada','interpolada'], ans:1, exp:'Cruzada (alternada).' },

    { id:'7p_mod1', s:'portugues', t:'Modificadores', type:'mc', diff:2, q:'🔤 Em "Estudei ontem", "ontem" é:', opts:['CD','modificador do GV','sujeito'], ans:1, exp:'Não é obrigatório — modificador.' },
    { id:'7p_mod2', s:'portugues', t:'Modificadores', type:'mc', diff:2, q:'🔤 Em "O João, meu amigo, chegou", "meu amigo" é:', opts:['CD','modificador apositivo','complemento agente'], ans:1, exp:'Entre vírgulas, qualifica o nome.' },

    { id:'7p_fc1', s:'portugues', t:'Frase simples e complexa', type:'mc', diff:1, q:'🔤 "Estudei e fiz o jantar." é frase:', opts:['simples','complexa'], ans:1, exp:'Dois verbos principais ligados.' },
    { id:'7p_fc2', s:'portugues', t:'Frase simples e complexa', type:'mc', diff:2, q:'🔤 "A Maria leu o livro." é frase:', opts:['simples','complexa'], ans:0, exp:'Um só verbo principal.' },

    { id:'7p_coord1', s:'portugues', t:'Orações coordenadas', type:'mc', diff:1, q:'🔤 "Estudei, MAS não passei." A oração coordenada é:', opts:['copulativa','adversativa','disjuntiva'], ans:1, exp:'"Mas" introduz oposição → adversativa.' },
    { id:'7p_coord2', s:'portugues', t:'Orações coordenadas', type:'mc', diff:2, q:'🔤 "Estudei, LOGO vou passar." é:', opts:['conclusiva','explicativa','copulativa'], ans:0, exp:'"Logo" → conclusiva.' },

    { id:'7p_dra1', s:'portugues', t:'Texto dramático', type:'mc', diff:1, q:'🎭 Indicações cénicas no texto dramático chamam-se:', opts:['didascálias','réplicas','apartes'], ans:0, exp:'Didascálias — em itálico ou entre parênteses.' },
    { id:'7p_dra2', s:'portugues', t:'Texto dramático', type:'mc', diff:2, q:'🎭 Quem é considerado o pai do teatro português?', opts:['Camões','Gil Vicente','Eça de Queirós'], ans:1, exp:'Gil Vicente — Auto da Barca do Inferno.' },

    { id:'7p_sub1', s:'portugues', t:'Orações subordinadas', type:'mc', diff:2, q:'🔤 "Estudei PARA passar." A oração subordinada é:', opts:['causal','final','temporal'], ans:1, exp:'"Para" indica finalidade → final.' },
    { id:'7p_sub2', s:'portugues', t:'Orações subordinadas', type:'mc', diff:2, q:'🔤 "Se chover, fico em casa." A subordinada é:', opts:['condicional','concessiva','consecutiva'], ans:0, exp:'"Se" → condicional.' },

    { id:'7p_dir1', s:'portugues', t:'Discurso direto e indireto', type:'mc', diff:1, q:'💬 No discurso direto usa-se:', opts:['parêntese','travessão ou aspas','ponto e vírgula'], ans:1, exp:'Travessão (—) ou aspas para reproduzir falas.' },
    { id:'7p_dir2', s:'portugues', t:'Discurso direto e indireto', type:'fill', diff:2, q:'Passa para indireto: O João disse: "Vou estudar." → O João disse ___ estudar.', ans:['que ia','que iria'], exp:'Discurso indireto: "que ia estudar".' },

    { id:'7p_conj1', s:'portugues', t:'Modo conjuntivo', type:'mc', diff:2, q:'🔤 "Embora chova, vou sair." O verbo "chova" está no:', opts:['indicativo','conjuntivo','imperativo'], ans:1, exp:'Após "embora" usa-se conjuntivo (chova, não chove).' ,
      intro: "O **modo conjuntivo** parece misterioso mas é fácil de identificar: aparece sempre depois de palavras que indicam DÚVIDA, DESEJO ou HIPÓTESE.",
      hint: "A palavra \"embora\" introduz uma concessão (algo contra a expectativa). Sempre que dizes \"embora\", o verbo a seguir está no **conjuntivo**.",
      richExp: "**Modo conjuntivo** — quando se usa?\n- **Embora chova**, vou sair. (concessão)\n- Espero que **passes** o teste. (desejo)\n- Se **fosse** rico, comprava uma casa. (hipótese)\n- Não creio que **seja** verdade. (dúvida)\n- Para que **estudes** melhor, ouve música clássica. (finalidade)\n\n**Tempos do conjuntivo**:\n- **Presente**: que eu cant**e**, que tu cant**es**...\n- **Pretérito imperfeito**: se eu cant**asse**, se tu cant**asses**...\n- **Futuro**: quando eu cant**ar**, se eu cheg**ar**...\n\n**Como reconhecer (truque)**:\n- Se a frase pode começar por \"que...\" ou tem \"se\", \"embora\", \"para que\" → conjuntivo.\n- Se descreve um FACTO certo → indicativo.\n\n**Comparação**:\n- Indicativo: \"**Sei** que ele **veio**.\" (facto)\n- Conjuntivo: \"**Duvido** que ele **venha**.\" (dúvida)\n\n**Conexão**: este modo verbal é muito importante em redação. Quem domina o conjuntivo escreve melhor. Vais aprofundar no 8.º e 9.º."},
    { id:'7p_conj2', s:'portugues', t:'Modo conjuntivo', type:'fill', diff:2, q:'Verbo "estudar" no presente conjuntivo (1.ª pessoa singular): que eu ___', ans:['estude'], exp:'Que eu estude.' },

    { id:'7p_rec1', s:'portugues', t:'Recursos expressivos', type:'mc', diff:1, q:'🌬️ "O vento chorava." Recurso:', opts:['metáfora','personificação','comparação'], ans:1, exp:'Vento (não humano) com ação humana (chorar).' ,
      intro: "**Recursos expressivos** (figuras de estilo) tornam um texto mais bonito, mais expressivo. A **personificação** é uma das mais comuns — dá vida a coisas que não a têm.",
      hint: "O vento NÃO chora — só pessoas (e alguns animais) choram. Quando se atribui a um ser **não-humano** uma ação **humana**, é qual recurso?",
      richExp: "**Personificação** = dar características HUMANAS a seres não humanos (objetos, animais, ideias).\n\n**Exemplos**:\n- \"O vento **chorava**.\" (vento + chorar)\n- \"O Sol **sorriu** para a Lua.\"\n- \"As flores **dançavam** ao vento.\"\n- \"A liberdade **chama** por nós.\" (ideia + chamar)\n\n**Não confundas com**:\n- **Metáfora**: \"O João é um leão.\" (compara sem usar \"como\")\n- **Comparação**: \"O João é forte **como** um leão.\" (usa \"como\")\n- **Hipérbole**: \"Já te disse um milhão de vezes.\" (exagero)\n- **Onomatopeia**: \"Au au!\" (imita som)\n\n**Para que serve a personificação**:\n- Dá vida e emoção ao texto.\n- Cria imagens fortes na cabeça do leitor.\n- Muito usado em **poesia** e **fábulas** (animais que falam = personificação completa).\n\n**Curiosidade**: Walt Disney construiu um império todo à base de personificação — bichos que falam, objetos que sentem (\"A Bela e o Monstro\").\n\n**Conexão**: no 8.º vais analisar recursos avançados (antítese, metonímia, sinédoque, hipálage)."},
    { id:'7p_rec2', s:'portugues', t:'Recursos expressivos', type:'mc', diff:1, q:'⚡ "Rápido como o vento." Recurso:', opts:['metáfora','comparação','anáfora'], ans:1, exp:'Usa "como" → comparação.' },
    { id:'7p_rec3', s:'portugues', t:'Recursos expressivos', type:'mc', diff:2, q:'💯 "Já te disse um milhão de vezes." Recurso:', opts:['hipérbole','eufemismo','antítese'], ans:0, exp:'Exagero → hipérbole.' },

    // =============== MATEMÁTICA ===============
    { id:'7m_rac1', s:'matematica', t:'Números racionais', type:'mc', diff:1, q:'🔢 Qual é o simétrico de −7?', opts:['1/7','+7','−1/7'], ans:1, exp:'Simétrico = mesmo módulo, sinal oposto.' },
    { id:'7m_rac2', s:'matematica', t:'Números racionais', type:'mc', diff:2, q:'🔢 |−10| =', opts:['−10','10','0'], ans:1, exp:'Módulo é sempre positivo.' },
    { id:'7m_rac3', s:'matematica', t:'Números racionais', type:'mc', diff:2, q:'🔢 Qual é MAIOR?', opts:['−2','−10','0'], ans:2, exp:'0 > −2 > −10. Nos negativos, mais perto de 0 = maior.' },

    { id:'7m_sub1', s:'matematica', t:'Adição e subtração de racionais', type:'mc', diff:1, q:'🔢 (−5) + (−3) =', opts:['−8','+8','+2'], ans:0, exp:'Sinais iguais — soma módulos, mantém sinal.' },
    { id:'7m_sub2', s:'matematica', t:'Adição e subtração de racionais', type:'mc', diff:2, q:'🔢 (+7) + (−4) =', opts:['+3','−3','+11'], ans:0, exp:'Sinais diferentes: 7−4=3, mantém sinal do +7.' },
    { id:'7m_sub3', s:'matematica', t:'Adição e subtração de racionais', type:'fill', diff:2, q:'5 − (−3) = ___', ans:['8'], exp:'5 + 3 = 8.' },

    { id:'7m_mul1', s:'matematica', t:'Multiplicação e divisão de racionais', type:'mc', diff:1, q:'🔢 (−4) × (−3) =', opts:['−12','+12','−7'], ans:1, exp:'Negativo × negativo = positivo.' },
    { id:'7m_mul2', s:'matematica', t:'Multiplicação e divisão de racionais', type:'mc', diff:2, q:'🔢 (−6) ÷ (+2) =', opts:['−3','+3','−4'], ans:0, exp:'Sinais diferentes → negativo.' },
    { id:'7m_mul3', s:'matematica', t:'Multiplicação e divisão de racionais', type:'mc', diff:2, q:'🔢 2/3 ÷ 4/5 =', opts:['8/15','5/6','3/4'], ans:1, exp:'2/3 × 5/4 = 10/12 = 5/6.' },

    { id:'7m_pot1', s:'matematica', t:'Potências', type:'mc', diff:1, q:'🔢 2³ =', opts:['6','8','9'], ans:1, exp:'2 × 2 × 2 = 8.' },
    { id:'7m_pot2', s:'matematica', t:'Potências', type:'mc', diff:2, q:'🔢 2³ × 2² =', opts:['2⁵','2⁶','4⁵'], ans:0, exp:'Mesma base: soma expoentes.' },
    { id:'7m_pot3', s:'matematica', t:'Potências', type:'fill', diff:2, q:'5⁰ = ___', ans:['1'], exp:'Qualquer número (≠0) elevado a 0 = 1.' },

    { id:'7m_seq1', s:'matematica', t:'Sequências e regularidades', type:'mc', diff:2, q:'🔢 Sequência 3, 7, 11, 15, ... termo geral:', opts:['a_n = 4n','a_n = 4n−1','a_n = 3n+1'], ans:1, exp:'Diferença = 4; 1.º termo = 3 → a_n = 4n−1.' },
    { id:'7m_seq2', s:'matematica', t:'Sequências e regularidades', type:'mc', diff:2, q:'🔢 5.º termo da sequência 2, 4, 8, 16, ___:', opts:['24','32','64'], ans:1, exp:'Multiplica por 2: 16 × 2 = 32.' },

    { id:'7m_alg1', s:'matematica', t:'Expressões algébricas', type:'mc', diff:1, q:'🔢 Em 3x², o coeficiente é:', opts:['3','x','2'], ans:0, exp:'3 = coeficiente; x² = parte literal.' },
    { id:'7m_alg2', s:'matematica', t:'Expressões algébricas', type:'mc', diff:2, q:'🔢 3x + 5x =', opts:['8x','8x²','15x'], ans:0, exp:'Termos semelhantes: soma coeficientes.' },
    { id:'7m_alg3', s:'matematica', t:'Expressões algébricas', type:'fill', diff:2, q:'Simplifica: 2(x + 3) = ___', ans:['2x + 6','2x+6'], exp:'Distribui: 2x + 6.' },

    { id:'7m_eq1', s:'matematica', t:'Equações do 1.º grau', type:'mc', diff:1, q:'🔢 Resolve: 2x + 6 = 14. x =', opts:['2','4','10'], ans:1, exp:'2x = 8 → x = 4.' },
    { id:'7m_eq2', s:'matematica', t:'Equações do 1.º grau', type:'mc', diff:2, q:'🔢 Resolve: 3x − 5 = 2x + 7. x =', opts:['5','12','−12'], ans:1, exp:'x = 12.' },
    { id:'7m_eq3', s:'matematica', t:'Equações do 1.º grau', type:'mc', diff:2, q:'🔢 2x + 5 = 2x − 3 é uma equação:', opts:['possível determinada','impossível','indeterminada'], ans:1, exp:'0 = −8 → falso → impossível.' },

    { id:'7m_fun1', s:'matematica', t:'Funções (introdução)', type:'mc', diff:1, q:'📈 Se f(x) = 2x + 1, f(3) =', opts:['5','7','9'], ans:1, exp:'2(3) + 1 = 7.' },
    { id:'7m_fun2', s:'matematica', t:'Funções (introdução)', type:'mc', diff:2, q:'📈 Em f(x) = ax + b, o gráfico é uma:', opts:['parábola','reta','hipérbole'], ans:1, exp:'Função afim → reta.' },

    { id:'7m_pd1', s:'matematica', t:'Proporcionalidade direta', type:'mc', diff:1, q:'⚖️ Se 3 kg custam 6 €, quanto custam 5 kg?', opts:['10 €','12 €','15 €'], ans:0, exp:'k = 2 €/kg → 5 × 2 = 10 €.' },
    { id:'7m_pd2', s:'matematica', t:'Proporcionalidade direta', type:'tf', diff:2, q:'No gráfico de proporcionalidade direta a reta passa SEMPRE pela origem.', ans:true, exp:'Verdadeiro — y = kx passa por (0,0).' },

    { id:'7m_sem1', s:'matematica', t:'Semelhança de figuras', type:'mc', diff:2, q:'📐 Se a razão de semelhança é 2, a razão de áreas é:', opts:['2','4','8'], ans:1, exp:'Áreas: k² = 4.' },
    { id:'7m_sem2', s:'matematica', t:'Semelhança de figuras', type:'mc', diff:2, q:'📐 Dois triângulos com 3 ângulos iguais são:', opts:['congruentes','semelhantes','não relacionados'], ans:1, exp:'Critério AAA / AA → semelhantes.' },

    { id:'7m_pit1', s:'matematica', t:'Teorema de Pitágoras', type:'mc', diff:1, q:'📐 Triângulo retângulo com catetos 3 e 4. Hipotenusa:', opts:['5','6','7'], ans:0, exp:'3² + 4² = 25 → √25 = 5.',
      intro: 'O **Teorema de Pitágoras** (séc. VI a.C.) diz: num triângulo retângulo, o quadrado da hipotenusa (lado oposto ao ângulo de 90°, sempre o MAIOR) é igual à soma dos quadrados dos catetos.\n\n`a² = b² + c²`\n\nÉ a equação mais famosa da geometria. Permite calcular distâncias sem medir directamente.',
      hint: 'Calcula 3² (= 3×3) e 4² (= 4×4). Soma os dois. Tira a raiz quadrada. Sabes que √25 = ?',
      richExp: '**Resolução completa**:\n- 3² = 9\n- 4² = 16\n- soma: 9 + 16 = 25\n- hipotenusa = √25 = **5**\n\n**O triplo (3, 4, 5) é famoso** — chama-se *triplo pitagórico*. Os antigos egípcios já o usavam para construir ângulos rectos nas pirâmides: uma corda com 12 nós igualmente espaçados, formando um triângulo 3-4-5, garante um ângulo de 90° entre o lado 3 e o lado 4.\n\n**Outros triplos pitagóricos**: (5, 12, 13), (8, 15, 17), (7, 24, 25). Decora os primeiros 2 — aparecem em exames.\n\n**Aplicação real**: para descobrir a distância em linha recta entre dois pontos numa cidade, se souberes quanto andaste em norte-sul e em este-oeste.' },
    { id:'7m_pit2', s:'matematica', t:'Teorema de Pitágoras', type:'mc', diff:2, q:'📐 Hipotenusa 13, cateto 5. Outro cateto:', opts:['8','12','18'], ans:1, exp:'13² − 5² = 144 → √144 = 12.' },
    { id:'7m_pit3', s:'matematica', t:'Teorema de Pitágoras', type:'tf', diff:2, q:'O Teorema de Pitágoras aplica-se a qualquer triângulo.', ans:false, exp:'Falso — só a triângulos RETÂNGULOS.' },

    { id:'7m_ar1', s:'matematica', t:'Áreas e volumes', type:'mc', diff:1, q:'📐 Área de um triângulo de base 8 e altura 5:', opts:['13','20','40'], ans:1, exp:'A = (8 × 5) / 2 = 20.' },
    { id:'7m_ar2', s:'matematica', t:'Áreas e volumes', type:'mc', diff:2, q:'📐 Volume de um cubo de aresta 3 cm:', opts:['9','18','27'], ans:2, exp:'V = 3³ = 27 cm³.' },

    { id:'7m_est1', s:'matematica', t:'Estatística', type:'mc', diff:1, q:'📊 Média de 4, 6, 8, 10:', opts:['6','7','8'], ans:1, exp:'(4+6+8+10)/4 = 28/4 = 7.' },
    { id:'7m_est2', s:'matematica', t:'Estatística', type:'mc', diff:2, q:'📊 Moda de 2, 3, 3, 5, 7, 3:', opts:['3','5','3.83'], ans:0, exp:'Moda = valor mais repetido = 3.' },
    { id:'7m_est3', s:'matematica', t:'Estatística', type:'mc', diff:2, q:'📊 Mediana de 1, 4, 7, 10, 13:', opts:['4','7','10'], ans:1, exp:'Ordenado, central = 7.' },

    // =============== INGLÊS ===============
    { id:'7i_am1', s:'ingles', t:'All about me', type:'mc', diff:1, q:'👋 "I\'m 13 years old" significa:', opts:['Tenho 13 anos','Sou 13 anos','Vivo há 13 anos'], ans:0, exp:'Em inglês usa-se "I am" + idade.' },
    { id:'7i_am2', s:'ingles', t:'All about me', type:'fill', diff:1, q:'Personality adjective for someone who jokes a lot: ___', ans:['funny'], exp:'Funny = engraçado.' },
    { id:'7i_am3', s:'ingles', t:'All about me', type:'mc', diff:2, q:'💇 Word order for hair description:', opts:['hair brown long','long brown hair','brown long hair'], ans:1, exp:'Order: length → colour → noun.' },

    { id:'7i_dr1', s:'ingles', t:'Daily routines', type:'mc', diff:1, q:'⏰ "I get up at 7" — get up means:', opts:['ir dormir','levantar-se','descansar'], ans:1, exp:'Get up = levantar-se.' },
    { id:'7i_dr2', s:'ingles', t:'Daily routines', type:'mc', diff:2, q:'🕐 Frequency adverbs go:', opts:['after main verb','before main verb','at the end'], ans:1, exp:'Before main verb (after "be").' },
    { id:'7i_dr3', s:'ingles', t:'Daily routines', type:'fill', diff:2, q:'3rd person singular: He ___ up at 7. (verb "get")', ans:['gets'], exp:'Gets — add -s in 3rd person.' },

    { id:'7i_sch1', s:'ingles', t:'School life', type:'mc', diff:1, q:'📚 "P.E." stands for:', opts:['Public Education','Physical Education','Personal Engagement'], ans:1, exp:'P.E. = Physical Education (Educação Física).' },
    { id:'7i_sch2', s:'ingles', t:'School life', type:'mc', diff:2, q:'📅 "I have Maths ___ Monday."', opts:['in','on','at'], ans:1, exp:'Days of the week → "on Monday".' },

    { id:'7i_hob1', s:'ingles', t:'Free time and hobbies', type:'mc', diff:1, q:'🎵 "I love ___ to music":', opts:['listen','listening','listens'], ans:1, exp:'After "love" use -ing form.' },
    { id:'7i_hob2', s:'ingles', t:'Free time and hobbies', type:'mc', diff:2, q:'🎸 You play ___ guitar but you play ___ football.', opts:['the / —','— / the','the / a'], ans:0, exp:'Instruments: "the". Sports: no article.' },

    { id:'7i_hl1', s:'ingles', t:'Healthy lifestyle', type:'mc', diff:1, q:'🥗 "You should eat more ___":', opts:['sweets','fruit','crisps'], ans:1, exp:'Fruit is healthy.' },
    { id:'7i_hl2', s:'ingles', t:'Healthy lifestyle', type:'mc', diff:2, q:'💊 After "should" we use:', opts:['infinitive','infinitive + to','-ing'], ans:0, exp:'Modal verbs use bare infinitive: "You should eat".' },

    { id:'7i_ht1', s:'ingles', t:'Holidays and travel', type:'mc', diff:1, q:'✈️ "I go ___ holiday in summer":', opts:['in','on','at'], ans:1, exp:'"Go on holiday".' },
    { id:'7i_ht2', s:'ingles', t:'Holidays and travel', type:'fill', diff:2, q:'Past simple of "go": Last summer I ___ to Spain.', ans:['went'], exp:'Irregular: go → went.' ,
      intro: "In English, talking about past holidays uses **past simple**. Many of the most common verbs are **irregular** — they don't follow the \"+ed\" rule.",
      hint: "\"To go\" is one of the most irregular verbs in English. Its past form is short and ends in -t. Have you heard \"I ___ home yesterday\"?",
      richExp: "**Past simple of \"go\" = WENT** (3 forms: go → went → gone)\n\n**Top 30 irregular verbs to memorize**:\n\n| Present | Past | Past participle |\n|---------|------|-----------------|\n| be | was/were | been |\n| have | had | had |\n| do | did | done |\n| go | **went** | gone |\n| come | came | come |\n| see | saw | seen |\n| get | got | got/gotten |\n| make | made | made |\n| take | took | taken |\n| give | gave | given |\n| find | found | found |\n| think | thought | thought |\n| say | said | said |\n| tell | told | told |\n| know | knew | known |\n| eat | ate | eaten |\n| drink | drank | drunk |\n| sleep | slept | slept |\n| read | read | read |\n| write | wrote | written |\n| buy | bought | bought |\n| bring | brought | brought |\n| catch | caught | caught |\n| teach | taught | taught |\n| sing | sang | sung |\n| swim | swam | swum |\n| run | ran | run |\n| fly | flew | flown |\n| drive | drove | driven |\n| ride | rode | ridden |\n\n**Example sentences**:\n- \"Last summer **I went** to Spain.\" ✓\n- \"I goed to Spain.\" ✗ (NEVER!)\n\n**Connection**: in the next school year you'll learn the **past continuous** (was/were + verb-ing) — used WITH past simple to describe what was happening when something interrupted: \"I **was reading** when the phone **rang**.\""},

    { id:'7i_te1', s:'ingles', t:'Technology', type:'mc', diff:1, q:'📱 "Social media" means:', opts:['mass communication only','platforms like Instagram, TikTok','TV channels'], ans:1, exp:'Plataformas online para partilhar.' },
    { id:'7i_te2', s:'ingles', t:'Technology', type:'mc', diff:2, q:'📲 "I downloaded an app ___ my phone":', opts:['in','on','at'], ans:1, exp:'"On" the phone.' },

    { id:'7i_en1', s:'ingles', t:'Environment', type:'mc', diff:1, q:'♻️ The 3 Rs are Reduce, Reuse and:', opts:['Repeat','Recycle','Reverse'], ans:1, exp:'Reduce, Reuse, Recycle.' },
    { id:'7i_en2', s:'ingles', t:'Environment', type:'mc', diff:2, q:'🚫 "We ___ throw rubbish in the street":', opts:['must','mustn\'t','don\'t have to'], ans:1, exp:'Mustn\'t = proibição.' },

    // =============== FRANCÊS ===============
    { id:'7f_sal1', s:'frances', t:'Salutations et présentations', type:'mc', diff:1, q:'👋 "Bonjour !" significa:', opts:['boa noite','bom dia / olá','adeus'], ans:1, exp:'Bonjour = bom dia / olá.' },
    { id:'7f_sal2', s:'frances', t:'Salutations et présentations', type:'mc', diff:2, q:'🇫🇷 "J\'ai 12 ans" significa:', opts:['Vivo aos 12','Tenho 12 anos','Faço 12 anos'], ans:1, exp:'Em francês usa-se AVOIR para a idade.' },
    { id:'7f_sal3', s:'frances', t:'Salutations et présentations', type:'fill', diff:2, q:'Forma formal de "tu" em francês: ___', ans:['vous'], exp:'Vous = formal ou plural.' },

    { id:'7f_fam1', s:'frances', t:'La famille', type:'mc', diff:1, q:'👪 "La mère" significa:', opts:['pai','mãe','irmã'], ans:1, exp:'La mère = mãe.' },
    { id:'7f_fam2', s:'frances', t:'La famille', type:'fill', diff:1, q:'Avô em francês: le ___', ans:['grand-père','grand père'], exp:'Le grand-père.' },
    { id:'7f_fam3', s:'frances', t:'La famille', type:'mc', diff:2, q:'🔤 Adjetivo possessivo: ___ père (meu pai):', opts:['ma','mon','mes'], ans:1, exp:'Mon père (masculino singular).' },

    { id:'7f_ec1', s:'frances', t:"L'école", type:'mc', diff:1, q:'🏫 "Le professeur" significa:', opts:['aluno','professor','diretor'], ans:1, exp:'Le professeur (le prof).' },
    { id:'7f_ec2', s:'frances', t:"L'école", type:'fill', diff:2, q:'Borracha em francês: la ___', ans:['gomme'], exp:'La gomme.' },

    { id:'7f_loi1', s:'frances', t:'Les loisirs', type:'mc', diff:1, q:'🎵 "J\'aime la musique" significa:', opts:['Detesto música','Gosto de música','Toco música'], ans:1, exp:'J\'aime = eu gosto.' },
    { id:'7f_loi2', s:'frances', t:'Les loisirs', type:'mc', diff:2, q:'⚽ Em francês usa-se "jouer ___ football":', opts:['au','du','à la'], ans:0, exp:'Desportos: jouer **au** football (à + le = au).' ,
      intro: "En français, quand on parle de SPORT, on utilise toujours \"**jouer à**\" (et non \"jouer de\"). C'est une règle importante — c'est ce qui distingue le SPORT des INSTRUMENTS de musique.",
      hint: "\"Jouer **à**\" — sports (football, tennis, basket, échecs).\n\"Jouer **de**\" — instruments de musique (piano, guitare, violon).",
      richExp: "**Règle: jouer à vs jouer de**:\n\n**JOUER À** + **sport / jeu**:\n- Je joue **au** football. (au = à + le)\n- Je joue **au** tennis.\n- Je joue **à** la marelle.\n- Je joue **aux** échecs. (aux = à + les)\n- Je joue **aux** cartes.\n\n**JOUER DE** + **instrument de musique**:\n- Je joue **du** piano. (du = de + le)\n- Je joue **de** la guitare.\n- Je joue **du** violon.\n- Je joue **des** maracas. (des = de + les)\n\n**Contractions importantes**:\n- à + le = **au** (au football)\n- à + les = **aux** (aux échecs)\n- de + le = **du** (du piano)\n- de + les = **des** (des cymbales)\n- à + la et de + la **restent inchangés** (à la marelle, de la guitare).\n\n**Faux amis** (attention):\n- \"Faire du sport\" (= praticar desporto, mais general) vs \"jouer au tennis\" (= jogar ténis, mais específico).\n- \"**Practiquer**\" (faire de la pratique) — mais formel.\n\n**Connexion**: à connaître pour la prochaine année — autres expressions avec \"à\" et \"de\" (parler à quelqu'un, parler de quelqu'un — sens différents!)."},
    { id:'7f_loi3', s:'frances', t:'Les loisirs', type:'mc', diff:2, q:'🎹 "Tocar piano" em francês:', opts:['jouer au piano','jouer du piano','jouer le piano'], ans:1, exp:'Instrumentos: jouer **du** piano.' },

    { id:'7f_nou1', s:'frances', t:'La nourriture', type:'mc', diff:1, q:'🍞 "Le pain" significa:', opts:['queijo','pão','água'], ans:1, exp:'Le pain = pão.' },
    { id:'7f_nou2', s:'frances', t:'La nourriture', type:'mc', diff:2, q:'🍽️ "Le dîner" em PT é:', opts:['pequeno-almoço','almoço','jantar'], ans:2, exp:'Dîner = jantar (NÃO almoço, falso amigo!).' },

    { id:'7f_vi1', s:'frances', t:'La ville', type:'mc', diff:1, q:'🏥 "L\'hôpital" significa:', opts:['hospital','estação','escola'], ans:0, exp:'Hôpital = hospital.' },
    { id:'7f_vi2', s:'frances', t:'La ville', type:'mc', diff:2, q:'➡️ "Tournez à droite" significa:', opts:['vai em frente','vira à direita','vira à esquerda'], ans:1, exp:'À droite = à direita.' },

    { id:'7f_ve1', s:'frances', t:'Les vêtements', type:'mc', diff:1, q:'👗 "La jupe" significa:', opts:['calças','saia','casaco'], ans:1, exp:'La jupe = saia. Não confundir com "la jambe" (a perna)!' },
    { id:'7f_ve2', s:'frances', t:'Les vêtements', type:'mc', diff:2, q:'👗 "Une robe rouge" — "rouge" concorda com:', opts:['masculino','feminino','não concorda'], ans:1, exp:'Rouge é igual nos dois géneros; mas concorda em número (rouges no plural).' },

    { id:'7f_me1', s:'frances', t:'Les saisons et la météo', type:'mc', diff:1, q:'☀️ "Il fait beau" significa:', opts:['Está bom tempo','Faz frio','Chove'], ans:0, exp:'Bom tempo.' },
    { id:'7f_me2', s:'frances', t:'Les saisons et la météo', type:'fill', diff:2, q:'Em francês "no inverno": ___ hiver', ans:['en'], exp:'En hiver / en été / en automne. Mas "AU printemps".' },

    // =============== HISTÓRIA ===============
    { id:'7h_pre1', s:'historia', t:'Pré-história e primeiras civilizações', type:'mc', diff:1, q:'🪨 Período da pedra POLIDA chama-se:', opts:['Paleolítico','Mesolítico','Neolítico'], ans:2, exp:'Neolítico — pedra polida, agricultura, sedentarização.' },
    { id:'7h_pre2', s:'historia', t:'Pré-história e primeiras civilizações', type:'mc', diff:2, q:'🌊 Primeira civilização da escrita cuneiforme:', opts:['Egito','Mesopotâmia','Vale do Indo'], ans:1, exp:'Sumérios na Mesopotâmia (~3500 a.C.).' },
    { id:'7h_pre3', s:'historia', t:'Pré-história e primeiras civilizações', type:'mc', diff:2, q:'🏞️ O rio da civilização egípcia é o:', opts:['Tigre','Eufrates','Nilo'], ans:2, exp:'Nilo, vale fértil.' },

    { id:'7h_gre1', s:'historia', t:'Grécia Antiga', type:'mc', diff:1, q:'🏛️ Cidades-estado gregas chamavam-se:', opts:['polis','urbes','cantons'], ans:0, exp:'Pólis (plural póleis).' },
    { id:'7h_gre2', s:'historia', t:'Grécia Antiga', type:'mc', diff:2, q:'⚡ Deus principal grego:', opts:['Júpiter','Apolo','Zeus'], ans:2, exp:'Zeus (Júpiter na mitologia romana).' },
    { id:'7h_gre3', s:'historia', t:'Grécia Antiga', type:'mc', diff:2, q:'🏟️ Local dos primeiros Jogos Olímpicos antigos:', opts:['Atenas','Olímpia','Esparta'], ans:1, exp:'Olímpia, em honra a Zeus, 776 a.C.' },

    { id:'7h_at1', s:'historia', t:'Atenas e a democracia', type:'mc', diff:1, q:'⚖️ Atenas é considerada o berço da:', opts:['ditadura','democracia','oligarquia'], ans:1, exp:'Demos (povo) + kratos (poder).' ,
      intro: "A **democracia** nasceu em Atenas, no séc. V a.C. Antes disso, os reis ou os ricos decidiam tudo. Foi uma revolução política — pela primeira vez, o POVO tinha poder de decidir.",
      hint: "A palavra \"democracia\" vem do grego: **demos** (povo) + **kratos** (poder).",
      richExp: "**Atenas, séc. V a.C.** — \"Século de Péricles\" foi o seu apogeu.\n\n**Reformadores principais**:\n- **Sólon** (séc. VI) — aboliu a escravidão por dívidas.\n- **Clístenes** (508 a.C.) — fundou a democracia.\n- **Péricles** (séc. V) — apogeu.\n\n**Instituições**:\n- **Eclésia**: assembleia de cidadãos. Decidia leis.\n- **Bulé**: conselho de 500 membros. Preparava as leis.\n- **Heliaia**: tribunal popular.\n\n**Quem era cidadão?**\n- Homem ✓\n- Livre ✓\n- Filho de pais atenienses ✓\n- **Excluídos**: mulheres, escravos, estrangeiros (metecos).\n\nEra uma democracia **direta** (cada cidadão votava em pessoa) — diferente da nossa, que é **representativa** (votamos em deputados).\n\n**Conexão**: pensar criticamente em quem podia (e quem NÃO podia) votar mostra como a democracia evoluiu — hoje TODOS os cidadãos podem votar (homens, mulheres, todas as origens)."},
    { id:'7h_at2', s:'historia', t:'Atenas e a democracia', type:'mc', diff:2, q:'👤 Quem NÃO era cidadão em Atenas?', opts:['homens livres atenienses','mulheres','filhos de atenienses (homens)'], ans:1, exp:'Mulheres, escravos, estrangeiros ficavam excluídos.' },
    { id:'7h_at3', s:'historia', t:'Atenas e a democracia', type:'mc', diff:2, q:'🏛️ Esparta era:', opts:['democracia','oligarquia militar','monarquia constitucional'], ans:1, exp:'Oligarquia militar, sociedade rígida.' },

    { id:'7h_ro1', s:'historia', t:'Roma Antiga', type:'mc', diff:1, q:'🏛️ Roma foi fundada em:', opts:['753 a.C.','476 d.C.','27 a.C.'], ans:0, exp:'Lenda de Rómulo e Remo, 753 a.C.' },
    { id:'7h_ro2', s:'historia', t:'Roma Antiga', type:'mc', diff:2, q:'⚔️ As 3 fases de Roma foram:', opts:['Monarquia, Império, Ditadura','Monarquia, República, Império','República, Império, Bizantino'], ans:1, exp:'Roma começou governada por reis (Monarquia), passou ao poder dos cônsules e do Senado (República) e acabou nas mãos de um imperador (Império, a partir de Augusto).' ,
      intro: "A **história de Roma** tem 3 grandes capítulos. Cada um teve um sistema político diferente — desde a fundação por Rómulo (lenda) até à queda no séc. V d.C.",
      hint: "Roma começou com REIS, depois mudou para um sistema sem rei (governo do povo) e finalmente teve IMPERADORES (poder absoluto de uma pessoa).",
      richExp: "**As 3 fases de Roma**:\n\n**1. MONARQUIA (753–509 a.C.)** — 244 anos\n- 7 reis, começando por Rómulo (lendário fundador).\n- Termina quando o povo expulsa Tarquínio \"o Soberbo\".\n\n**2. REPÚBLICA (509–27 a.C.)** — 482 anos\n- Sem rei. Governada por:\n  - **Senado** (homens ricos, decidem leis)\n  - **Cônsules** (2, eleitos por 1 ano, executivo)\n  - **Tribunos da plebe** (defendem o povo)\n- Conquista: Itália, Cartago (guerras púnicas), Grécia, Egito, Gália.\n- Termina com **Júlio César** assassinado e Otaviano a tornar-se Augusto.\n\n**3. IMPÉRIO (27 a.C.–476 d.C.)** — 503 anos\n- **Augusto** = 1.º imperador.\n- Apogeu nos séc. I–II d.C. (Pax Romana — paz romana).\n- Imperadores famosos: Augusto, Trajano, Adriano, Marco Aurélio, Constantino.\n- Divide-se em 395 d.C.: Império Romano do **Ocidente** (Roma) + do **Oriente** (Constantinopla).\n- **Queda do Ocidente em 476 d.C.** — Odoacro depõe o último imperador.\n- O Oriente continua até **1453** (Bizâncio, conquistada pelos turcos otomanos).\n\n**Conexão**: o latim (língua de Roma) deu origem ao **português**, espanhol, francês, italiano, romeno — línguas românicas."},
    { id:'7h_ro3', s:'historia', t:'Roma Antiga', type:'mc', diff:2, q:'📜 O primeiro imperador foi:', opts:['Júlio César','Augusto','Nero'], ans:1, exp:'Augusto, 27 a.C. (Júlio César foi ditador da República).' },

    { id:'7h_cr1', s:'historia', t:'Cristianismo', type:'mc', diff:1, q:'✝️ O cristianismo nasceu na:', opts:['Itália','Palestina','Egito'], ans:1, exp:'Palestina, depois espalhou-se pelo Império Romano.' ,
      intro: "O **cristianismo** mudou o mundo. Surgiu numa pequena província do Império Romano e em poucos séculos espalhou-se por toda a Europa, África e Ásia.",
      hint: "A religião nasce na terra onde viveu **Jesus de Nazaré** — uma região entre o Mediterrâneo e o rio Jordão. Hoje fica entre Israel e os territórios palestinianos.",
      richExp: "**O cristianismo nasceu na PALESTINA** no séc. I d.C.\n\n**Contexto**:\n- A Palestina era província romana.\n- Lá vivia o povo **judeu**, monoteísta (acreditava num só Deus — Iahweh).\n- O judaísmo esperava o **Messias** (libertador prometido).\n\n**Jesus de Nazaré** (~4 a.C. – 30 d.C.):\n- Nasceu em **Belém**, viveu em **Nazaré**, foi crucificado em **Jerusalém**.\n- Pregou amor ao próximo, perdão, justiça.\n- Os seguidores acreditam que é o Filho de Deus, ressuscitou ao 3.º dia.\n\n**Difusão**:\n- Os **apóstolos** e **São Paulo** espalharam a mensagem pelo Império.\n- Inicialmente perseguidos pelos romanos (Nero, Diocleciano).\n- **313 d.C.**: Constantino legaliza com o **Edicto de Milão**.\n- **391 d.C.**: Teodósio torna-o **religião oficial** do Império.\n\n**Por que se espalhou tão rápido**:\n- Mensagem universal (não só para judeus).\n- Igualdade entre escravos e livres, homens e mulheres.\n- Promessa de vida eterna para todos.\n- Boa rede de **estradas romanas** facilitou os apóstolos.\n\n**Conexão**: a Idade Média (séc. V–XV) vai ser fortemente marcada pela Igreja Católica — vais estudar mosteiros, cruzadas, arte românica/gótica."},
    { id:'7h_cr2', s:'historia', t:'Cristianismo', type:'mc', diff:2, q:'📜 Edicto de Milão (313 d.C.) foi promulgado por:', opts:['Augusto','Constantino','Teodósio'], ans:1, exp:'Constantino → liberdade religiosa para os cristãos.' },

    { id:'7h_id1', s:'historia', t:'Idade Média na Europa', type:'mc', diff:1, q:'⚔️ As 3 ordens medievais eram:', opts:['Reis, soldados, povo','Clero, nobreza, povo','Patrícios, plebeus, escravos'], ans:1, exp:'Estados / ordens: clero, nobreza, povo.' },
    { id:'7h_id2', s:'historia', t:'Idade Média na Europa', type:'mc', diff:2, q:'🏰 Arte com arcos REDONDOS:', opts:['românica','gótica','neoclássica'], ans:0, exp:'Românica (séc. XI-XII).' },

    { id:'7h_mu1', s:'historia', t:'Mundo Muçulmano', type:'mc', diff:1, q:'☪️ Fundador do Islão:', opts:['Maomé','Alá','Califa'], ans:0, exp:'Maomé (Muhammad). Alá é Deus.' },
    { id:'7h_mu2', s:'historia', t:'Mundo Muçulmano', type:'mc', diff:2, q:'📅 Ano 1 do calendário muçulmano corresponde a:', opts:['Hégira (622)','Nascimento de Maomé','Conquista de Meca'], ans:0, exp:'Hégira — fuga de Maomé para Medina em 622.' },
    { id:'7h_mu3', s:'historia', t:'Mundo Muçulmano', type:'mc', diff:2, q:'🏛️ Os muçulmanos invadiram a Península Ibérica em:', opts:['622','711','1492'], ans:1, exp:'711 d.C.' },

    { id:'7h_pt1', s:'historia', t:'Formação de Portugal', type:'mc', diff:1, q:'👑 Primeiro rei de Portugal:', opts:['D. Sancho I','D. Afonso Henriques','D. Dinis'], ans:1, exp:'D. Afonso Henriques, séc. XII.' ,
      intro: "**Portugal** tornou-se independente no séc. XII. Foi o resultado de décadas de Reconquista cristã contra os muçulmanos que dominavam a Península Ibérica desde 711.",
      hint: "O 1.º rei era filho de D. Henrique e D. Teresa. Combateu a própria mãe na Batalha de São Mamede (1128).",
      richExp: "**D. Afonso Henriques (1109?–1185)** — 1.º rei de Portugal.\n\n**Cronologia rápida**:\n- **1096** — D. Henrique de Borgonha recebe o Condado Portucalense.\n- **1128** — Batalha de São Mamede. Afonso vence a mãe e os galegos.\n- **1139** — Batalha de Ourique. Vence muçulmanos. Aclamado REI.\n- **1143** — Tratado de Zamora. Afonso VII de Leão reconhece a independência.\n- **1147** — Conquista LISBOA.\n- **1179** — Bula papal **Manifestis Probatum** (Papa Alexandre III) reconhece Portugal como reino independente.\n\n**Curiosidade**: o nome \"Portugal\" vem do **Condado Portucalense**, que por sua vez vem de \"Portus Cale\" (Porto + Gaia) — a região do rio Douro onde tudo começou.\n\n**Conexão**: Portugal é um dos países com fronteiras mais antigas do mundo — quase iguais há 800 anos!"},
    { id:'7h_pt2', s:'historia', t:'Formação de Portugal', type:'mc', diff:2, q:'📜 Bula papal que reconheceu Portugal (1179):', opts:['Manifestis Probatum','Aeterni Patris','Pacem in Terris'], ans:0, exp:'Manifestis Probatum, do Papa Alexandre III.' },
    { id:'7h_pt3', s:'historia', t:'Formação de Portugal', type:'mc', diff:2, q:'📅 Conquista do Algarve por D. Afonso III (fim da Reconquista):', opts:['1147','1185','1249'], ans:2, exp:'Em 1249, D. Afonso III conquista o Algarve, terminando a Reconquista e fixando as fronteiras de Portugal.' },

    { id:'7h_soc1', s:'historia', t:'Sociedade medieval portuguesa', type:'mc', diff:2, q:'⚖️ "Carta de foral" era:', opts:['um mapa das terras do reino','lei do rei que dava privilégios a um concelho','o testamento de um nobre'], ans:1, exp:'Direitos e deveres dos habitantes.' },
    { id:'7h_soc2', s:'historia', t:'Sociedade medieval portuguesa', type:'mc', diff:2, q:'🤝 Primeiras Cortes portuguesas em:', opts:['Leiria 1254','Lisboa 1147','Coimbra 1185'], ans:0, exp:'Leiria 1254, no reinado de D. Afonso III.' },

    { id:'7h_crise1', s:'historia', t:'Crise do século XIV', type:'mc', diff:1, q:'☠️ Peste Negra chegou a Portugal em:', opts:['1348','1383','1415'], ans:0, exp:'1348, vinda do Oriente.' },
    { id:'7h_crise2', s:'historia', t:'Crise do século XIV', type:'mc', diff:2, q:'⚔️ Batalha de Aljubarrota foi em:', opts:['1383','1385','1415'], ans:1, exp:'14 de agosto de 1385.' },
    { id:'7h_crise3', s:'historia', t:'Crise do século XIV', type:'mc', diff:2, q:'👑 D. João I funda a dinastia de:', opts:['Borgonha','Avis','Bragança'], ans:1, exp:'Dinastia de Avis (2.ª dinastia).' },

    // =============== GEOGRAFIA ===============
    { id:'7g_car1', s:'geografia', t:'Representações cartográficas', type:'mc', diff:1, q:'🗺️ Representação mais fiel da Terra é o:', opts:['mapa','planta','globo'], ans:2, exp:'Globo — sem distorção.' },
    { id:'7g_car2', s:'geografia', t:'Representações cartográficas', type:'mc', diff:2, q:'🗺️ O mapa que mostra os países e fronteiras é:', opts:['físico','político','temático'], ans:1, exp:'O mapa político mostra países e fronteiras; o mapa físico mostra o relevo (montanhas, rios).' },

    { id:'7g_esc1', s:'geografia', t:'Escalas', type:'mc', diff:1, q:'📐 Numa escala 1:100 000, 1 cm no mapa = ___ na realidade:', opts:['100 m','1 km','10 km'], ans:1, exp:'100 000 cm = 1 km.' },
    { id:'7g_esc2', s:'geografia', t:'Escalas', type:'mc', diff:2, q:'📐 Escala 1:1 000 — é:', opts:['grande escala (muito detalhe)','pequena escala (vista geral)'], ans:0, exp:'Denominador pequeno → grande escala.' ,
      intro: "As **escalas** dos mapas podem confundir: \"grande escala\" não significa mapa grande — significa que vês uma área PEQUENA mas com MUITO detalhe.",
      hint: "Olha para o DENOMINADOR. Se for pequeno (ex: 1:1 000), vês pouca área mas muito detalhe → \"grande escala\". Se for enorme (ex: 1:1 000 000), vês muita área mas sem detalhe → \"pequena escala\".",
      richExp: "**Regra fundamental**: quanto MAIOR o denominador, MENOR a escala.\n\n**Comparação**:\n- 1:1 000 → 1 cm = 10 m (mapa de uma sala) → GRANDE escala, MUITO detalhe.\n- 1:50 000 → 1 cm = 500 m (mapa de uma cidade) → escala média.\n- 1:1 000 000 → 1 cm = 10 km (mapa de um país) → PEQUENA escala, POUCO detalhe.\n\n**Para que serve**?\n- **GPS**: usa várias escalas dinamicamente — quando dás zoom, mudas de escala.\n- **Plantas de edifícios**: escala grande (1:50 a 1:200).\n- **Mapas turísticos de cidade**: 1:10 000 a 1:25 000.\n\n**Cálculo**: distância no mapa × denominador = distância real.\n- Ex: 4 cm × 50 000 = 200 000 cm = 2 km."},
    { id:'7g_esc3', s:'geografia', t:'Escalas', type:'fill', diff:2, q:'Escala 1:50 000. Distância no mapa: 4 cm. Distância real em km: ___', ans:['2'], exp:'4 × 50 000 = 200 000 cm = 2 km.' },

    { id:'7g_co1', s:'geografia', t:'Coordenadas geográficas', type:'mc', diff:1, q:'🌐 Distância ao Equador chama-se:', opts:['longitude','latitude','altitude'], ans:1, exp:'Latitude — Norte ou Sul.' ,
      intro: "**Coordenadas geográficas** permitem dar a localização EXATA de qualquer ponto na Terra. Sem elas, não havia GPS, nem mapas precisos, nem navegação!",
      hint: "Imagina linhas a horizontais que dão a volta à Terra paralelas ao Equador. Cada linha chama-se **paralelo**. A distância ao Equador chama-se ___.",
      richExp: "**Coordenadas geográficas** = pares (latitude, longitude).\n\n**LATITUDE** (distância ao Equador):\n- Medida em **graus (°)** de 0° a 90°.\n- **N** (Norte) ou **S** (Sul).\n- Equador: 0°. Pólo Norte: 90° N. Pólo Sul: 90° S.\n- Linhas que marcam a latitude: PARALELOS.\n- Paralelos famosos: **Trópico de Câncer** (23,5°N), **Trópico de Capricórnio** (23,5°S), **Círculos polares** (66,5°).\n\n**LONGITUDE** (distância ao Meridiano de Greenwich):\n- Medida em graus de 0° a 180°.\n- **E** (Este) ou **W**/**O** (Oeste).\n- Greenwich (Londres): 0°.\n- Antimeridiano (Pacífico): 180°.\n- Linhas que marcam a longitude: MERIDIANOS.\n\n**Exemplo — Lisboa**: 38°43′N, 9°08′W.\n\n**Como usar**:\n1. Localiza a latitude na \"vertical\" do mapa (no eixo dos paralelos).\n2. Localiza a longitude na \"horizontal\" (no eixo dos meridianos).\n3. Cruzas as duas → tens o ponto.\n\n**Curiosidade**: o GPS dá-te coordenadas com precisão de centímetros. As coordenadas em decimal são 38.71667, -9.13333 (mais usado em apps).\n\n**Conexão**: vais usar coordenadas em Matemática (referencial cartesiano) e em Programação. O Google Maps usa-as constantemente."},
    { id:'7g_co2', s:'geografia', t:'Coordenadas geográficas', type:'mc', diff:2, q:'🌐 Meridiano de referência (longitude 0°):', opts:['Greenwich','Equador','Paris'], ans:0, exp:'Meridiano de Greenwich, em Londres.' },
    { id:'7g_co3', s:'geografia', t:'Coordenadas geográficas', type:'mc', diff:2, q:'🇵🇹 Portugal está no hemisfério:', opts:['Sul','Norte','Este (Oriental)'], ans:1, exp:'Norte (≈ 39° N).' },

    { id:'7g_rel1', s:'geografia', t:'Relevo', type:'mc', diff:1, q:'🏔️ Elevação superior a 600 m:', opts:['colina','montanha','planalto'], ans:1, exp:'Uma elevação com mais de 600 m chama-se montanha; abaixo disso é um monte ou colina.' },
    { id:'7g_rel2', s:'geografia', t:'Relevo', type:'mc', diff:2, q:'🌍 O ponto mais alto de Portugal é o:', opts:['Pico (Açores)','Serra da Estrela','Marão'], ans:0, exp:'Pico — 2 351 m, Ilha do Pico.' },

    { id:'7g_cli1', s:'geografia', t:'Clima', type:'mc', diff:1, q:'🌡️ Instrumento para medir temperatura:', opts:['termómetro','barómetro','pluviómetro'], ans:0, exp:'A temperatura mede-se com o termómetro, em graus Celsius (°C).' },
    { id:'7g_cli2', s:'geografia', t:'Clima', type:'mc', diff:2, q:'🌞 Portugal continental tem clima:', opts:['equatorial','tropical','mediterrâneo'], ans:2, exp:'Verão quente e seco; inverno ameno e chuvoso.' ,
      intro: "Portugal continental tem um clima **muito agradável** — sem temperaturas extremas. Devido à posição geográfica, recebe influência do Atlântico e do Mediterrâneo.",
      hint: "Pensa: o nome do clima vem do nome do MAR junto ao qual está. Portugal está no extremo OESTE da Europa, junto ao Atlântico — mas é sul, perto do que mar?",
      richExp: "**Portugal Continental — clima MEDITERRÂNEO**\n\n**Características**:\n- **Verões quentes e secos** (julho/agosto: ~25-35°C, pouca chuva).\n- **Invernos amenos e chuvosos** (janeiro: ~10°C, mais precipitação).\n- 4 estações bem definidas.\n\n**Variações dentro do país**:\n- **Norte interior** (Trás-os-Montes): clima mais **continental** — invernos frios, neve nas serras, verões muito quentes.\n- **Norte litoral** (Minho): **atlântico** — chuva o ano todo, temperaturas amenas.\n- **Centro/Sul interior** (Alentejo, Beira Baixa): **mediterrâneo continental** — verões muito quentes, secos.\n- **Litoral sul** (Algarve): mediterrâneo típico — verões longos e quentes, invernos amenos.\n\n**Madeira**: subtropical (parecido com mediterrâneo mas mais ameno o ano todo).\n**Açores**: temperado oceânico (chuva o ano todo, temperaturas amenas).\n\n**Quem influencia o clima de Portugal**:\n- **Oceano Atlântico** (a oeste) — modera temperaturas.\n- **Corrente do Golfo** (água quente do Atlântico) — aquece o litoral.\n- **Anticiclone dos Açores** (alta pressão) — traz dias secos e ensolarados (sobretudo no verão).\n- **Norte de África** — traz \"ondas de calor\" no verão (vento sul, ar quente).\n\n**Conexão**: vais aprofundar climatologia no 8.º ano e estudar as alterações climáticas atuais — Portugal tem ficado mais quente e seco nas últimas décadas."},

    { id:'7g_hid1', s:'geografia', t:'Hidrografia', type:'mc', diff:1, q:'💧 Lugar onde nasce um rio:', opts:['foz','nascente','afluente'], ans:1, exp:'O sítio onde um rio nasce chama-se nascente; onde desagua no mar é a foz.' },
    { id:'7g_hid2', s:'geografia', t:'Hidrografia', type:'mc', diff:2, q:'🌊 Maior oceano:', opts:['Atlântico','Pacífico','Índico'], ans:1, exp:'Pacífico — o maior.' },

    { id:'7g_veg1', s:'geografia', t:'Vegetação natural', type:'mc', diff:1, q:'🌳 Vegetação da Amazónia:', opts:['savana','floresta equatorial','tundra'], ans:1, exp:'A Amazónia tem floresta equatorial: densa, sempre verde, com muito calor e chuva.' },
    { id:'7g_veg2', s:'geografia', t:'Vegetação natural', type:'tf', diff:2, q:'Portugal é o maior produtor mundial de cortiça.', ans:true, exp:'Verdadeiro — sobreiro (Quercus suber).' },

    { id:'7g_rec1', s:'geografia', t:'Recursos naturais', type:'mc', diff:1, q:'☀️ Energia renovável:', opts:['petróleo','solar','gás natural'], ans:1, exp:'Solar, eólica, hídrica.' },
    { id:'7g_rec2', s:'geografia', t:'Recursos naturais', type:'mc', diff:2, q:'⚛️ Energia nuclear é:', opts:['renovável','não-renovável'], ans:1, exp:'Usa urânio, que é não-renovável.' },

    // =============== CIÊNCIAS NATURAIS ===============
    { id:'7cn_sis1', s:'ciencias_naturais', t:'A Terra como sistema', type:'mc', diff:1, q:'🌍 Quantos subsistemas principais tem a Terra?', opts:['2','3','4'], ans:2, exp:'Atmosfera, hidrosfera, geosfera, biosfera.' },
    { id:'7cn_sis2', s:'ciencias_naturais', t:'A Terra como sistema', type:'mc', diff:2, q:'🌎 A biosfera é constituída por:', opts:['rochas','água','seres vivos'], ans:2, exp:'Todos os seres vivos.' },

    { id:'7cn_sub1', s:'ciencias_naturais', t:'Subsistemas terrestres', type:'mc', diff:1, q:'💨 Gás mais abundante na atmosfera:', opts:['oxigénio','azoto','CO₂'], ans:1, exp:'78% azoto, 21% oxigénio.' },
    { id:'7cn_sub2', s:'ciencias_naturais', t:'Subsistemas terrestres', type:'mc', diff:2, q:'💧 Percentagem de água doce na Terra:', opts:['3%','30%','50%'], ans:0, exp:'Só 3% é doce (a maior parte em glaciares).' },

    { id:'7cn_es1', s:'ciencias_naturais', t:'Estrutura interna da Terra', type:'mc', diff:1, q:'🌍 As 3 camadas da Terra são:', opts:['crusta, manto, núcleo','geosfera, atmosfera, hidrosfera','interior, intermédio, exterior'], ans:0, exp:'A Terra tem 3 camadas: crusta (fina, à superfície), manto (a maior) e núcleo (central e muito quente).' },
    { id:'7cn_es2', s:'ciencias_naturais', t:'Estrutura interna da Terra', type:'mc', diff:2, q:'🌍 O núcleo externo é:', opts:['sólido','líquido','gasoso'], ans:1, exp:'Núcleo externo é LÍQUIDO; interno é sólido.' ,
      intro: "O **núcleo externo** da Terra é **líquido**! E é essa camada de metal fundido a girar que cria o **campo magnético** que protege a vida na superfície.",
      hint: "O núcleo da Terra tem 2 partes: interno e externo. O interno é mais para o centro, o externo é a camada à volta. Um é sólido (apesar do calor extremo, está sob enorme pressão). O outro é...?",
      richExp: "**Estrutura interna da Terra** (do centro para fora):\n\n**1. NÚCLEO INTERNO** (1 220 km de raio)\n- **SÓLIDO** (apesar de 5 200 °C — porque está sob pressão imensa).\n- Composto por ferro (~85%) e níquel (~15%).\n- Cresce ~1 mm por ano (vai cristalizando).\n\n**2. NÚCLEO EXTERNO** (2 260 km de espessura)\n- **LÍQUIDO** (metal fundido).\n- Temperatura: 4 000–5 000 °C.\n- Ferro e níquel a fluírem.\n- **CRIA O CAMPO MAGNÉTICO TERRESTRE** — pelas correntes elétricas no metal a girar.\n- Sem este campo, NÃO HAVERIA VIDA na Terra (estaríamos expostos ao vento solar e radiação cósmica).\n\n**3. MANTO** (2 900 km de espessura)\n- Rochas em estado **pastoso** (semi-líquido). Movem-se em \"convecção\" muito lenta.\n- Temperatura: 500–4 000 °C.\n\n**4. CROSTA**\n- A camada externa SÓLIDA onde vivemos.\n- **Crosta continental**: 30-70 km (grossa).\n- **Crosta oceânica**: ~7 km (fina).\n\n**Como sabemos isto** se ninguém foi lá ver?\n- **Ondas sísmicas** dos terramotos atravessam a Terra. Mudam de velocidade e direção ao passar de camada para camada. Os sismólogos analisam para descobrir as propriedades.\n\n**Conexão**: no 8.º ano vais ligar isto à **tectónica de placas** — a crosta + parte superior do manto formam placas que se movem sobre o manto pastoso."},

    { id:'7cn_tp1', s:'ciencias_naturais', t:'Tectónica de placas', type:'mc', diff:1, q:'🌎 As placas tectónicas movem-se:', opts:['estão paradas','muito devagar (cm/ano)','rapidamente'], ans:1, exp:'~1-10 cm/ano.' },
    { id:'7cn_tp2', s:'ciencias_naturais', t:'Tectónica de placas', type:'mc', diff:2, q:'🌎 Quem propôs a deriva continental (Pangeia)?', opts:['Charles Darwin','Alfred Wegener','Isaac Newton'], ans:1, exp:'Wegener, em 1912.' ,
      intro: "A teoria de que os **continentes se moveram** ao longo de milhões de anos era considerada loucura no início do séc. XX. Hoje é uma das teorias mais bem estabelecidas das ciências da Terra.",
      hint: "O cientista alemão que propôs a **deriva continental** chamava-se Alfred. Reparou que os continentes encaixavam como peças de puzzle (sobretudo a costa do Brasil com a costa de África).",
      richExp: "**Alfred Wegener** (1880–1930) — meteorologista alemão.\n\n**1912** — Publica a teoria da **Deriva dos Continentes**.\n\n**Provas que apresentou**:\n1. **Encaixe geográfico**: a costa este da América do Sul encaixa na costa oeste de África.\n2. **Provas paleontológicas**: fósseis idênticos (ex: dinossauro Mesossauro, planta Glossopteris) em continentes hoje separados — só podiam existir num continente único.\n3. **Provas geológicas**: cadeias montanhosas e tipos de rochas que continuam de um continente para outro.\n4. **Provas paleoclimáticas**: vestígios de glaciações em locais hoje tropicais (e vice-versa).\n\n**Pangeia** (em grego \"toda a terra\"):\n- Há **~250 milhões de anos** (final do Permiano).\n- TODOS os continentes formavam UM supercontinente.\n- Depois fragmentou-se: Laurásia (a norte) + Gondwana (a sul).\n- Continuou a separar — chega à configuração atual.\n\n**Porque foi rejeitado na altura**:\n- Wegener não conseguiu explicar O MECANISMO. Como é que continentes inteiros se moviam?\n- Só na década de 1960 (com a descoberta da expansão dos fundos oceânicos) é que a teoria foi aceite — agora chamada **Tectónica de Placas**.\n\n**Wegener morreu** numa expedição à Gronelândia em 1930 — sem ver a sua teoria reconhecida.\n\n**Curiosidade**: hoje, a tectónica de placas explica:\n- Por que há terramotos e vulcões em certos sítios (e não noutros).\n- Como se formam as cordilheiras.\n- Por que a Austrália está cada vez mais perto da Ásia.\n\n**Conexão**: este é um exemplo histórico de como uma teoria pode ser rejeitada inicialmente e depois aceite — característica do método científico."},

    { id:'7cn_ro1', s:'ciencias_naturais', t:'Rochas', type:'mc', diff:1, q:'⛰️ Rocha magmática plutónica clássica:', opts:['basalto','granito','calcário'], ans:1, exp:'Granito — cristaliza dentro da Terra.' },
    { id:'7cn_ro2', s:'ciencias_naturais', t:'Rochas', type:'mc', diff:2, q:'🪨 Calcário (sedimentar) → mármore por:', opts:['fusão','metamorfismo','erosão'], ans:1, exp:'Metamorfismo (calor + pressão).' },

    { id:'7cn_mi1', s:'ciencias_naturais', t:'Minerais', type:'mc', diff:1, q:'💎 O mineral mais duro na escala de Mohs é:', opts:['quartzo','diamante','talco'], ans:1, exp:'Diamante (dureza 10).' },
    { id:'7cn_mi2', s:'ciencias_naturais', t:'Minerais', type:'tf', diff:2, q:'O diamante e a grafite têm a mesma composição química (carbono).', ans:true, exp:'Sim — ambos C, mas estruturas cristalinas diferentes.' },

    { id:'7cn_vu1', s:'ciencias_naturais', t:'Vulcanologia', type:'mc', diff:1, q:'🌋 Magma à superfície chama-se:', opts:['lava','piroclasto','cratera'], ans:0, exp:'O magma, ao chegar à superfície num vulcão, passa a chamar-se lava.' },
    { id:'7cn_vu2', s:'ciencias_naturais', t:'Vulcanologia', type:'mc', diff:2, q:'🌋 Em Portugal, vulcões ativos estão em:', opts:['Continente','Madeira','Açores'], ans:2, exp:'Açores (ex: Capelinhos, 1957-58).' },

    { id:'7cn_si1', s:'ciencias_naturais', t:'Sismologia', type:'mc', diff:1, q:'🌍 Ponto à superfície acima do foco do sismo:', opts:['hipocentro','epicentro','falha'], ans:1, exp:'O epicentro é o ponto à superfície mesmo por cima do foco (hipocentro) do sismo.' },
    { id:'7cn_si2', s:'ciencias_naturais', t:'Sismologia', type:'mc', diff:2, q:'📈 Escala de Richter mede:', opts:['estragos','magnitude (energia)','intensidade sentida'], ans:1, exp:'Magnitude. Mercalli mede intensidade.' },
    { id:'7cn_si3', s:'ciencias_naturais', t:'Sismologia', type:'mc', diff:2, q:'📅 Grande Terramoto de Lisboa foi em:', opts:['1640','1755','1910'], ans:1, exp:'1755 — magnitude ~8,5.' },

    { id:'7cn_fo1', s:'ciencias_naturais', t:'Fósseis e tempo geológico', type:'mc', diff:1, q:'🦴 Era dos dinossauros:', opts:['Paleozoico','Mesozoico','Cenozoico'], ans:1, exp:'Mesozoico (250-65 M.A.).' },
    { id:'7cn_fo2', s:'ciencias_naturais', t:'Fósseis e tempo geológico', type:'tf', diff:2, q:'Os humanos e os dinossauros viveram na mesma época.', ans:false, exp:'Falso — separados por ~65 milhões de anos.' },

    // =============== FÍSICO-QUÍMICA ===============
    { id:'7fq_un1', s:'fisico_quimica', t:'O Universo', type:'mc', diff:1, q:'🌌 A nossa galáxia chama-se:', opts:['Andrómeda','Via Láctea','Triângulo'], ans:1, exp:'Via Láctea — em espiral.' ,
      intro: "A **Via Láctea** é a galáxia onde estamos. Tem este nome desde os tempos da Grécia Antiga — vinha de \"leite\" porque a vê-se como uma faixa branca leitosa no céu.",
      hint: "Em latim \"via\" significa caminho e \"láctea\" vem de \"lac\" (leite). Em inglês chamam-lhe **Milky Way** (que dá nome àquele chocolate!).",
      richExp: "**A nossa galáxia — Via Láctea**:\n- Formato: **espiral barrada**.\n- Diâmetro: ~100 000 anos-luz.\n- Contém: ~200 mil milhões de estrelas + planetas, gás, poeira, matéria escura.\n- O Sol é UMA dessas estrelas — fica num \"braço\" periférico (braço de Órion).\n\n**Outras galáxias famosas**:\n- **Andrómeda** (a vizinha mais próxima, ~2,5 milhões de anos-luz).\n- **Galáxia do Triângulo**.\n- Há **biliões** de galáxias no universo!\n\n**Tipos de galáxia**:\n- **Espiral** (como a nossa)\n- **Elíptica** (formato oval)\n- **Irregular**\n\n**Curiosidade**:\n- A galáxia de Andrómeda está a **aproximar-se** da Via Láctea a 110 km/s.\n- Daqui a ~4,5 mil milhões de anos vão **colidir**. A nova galáxia já tem nome: **\"Milkomeda\"**!\n\n**Como ver a Via Láctea**: numa noite limpa e SEM luzes da cidade, olha para o céu — vais ver a faixa branca leitosa que atravessa o céu de cima a baixo.\n\n**Conexão**: vais estudar as estrelas com mais detalhe no 10.º ano (Física) — temperaturas, tipos, ciclo de vida."},
    { id:'7fq_un2', s:'fisico_quimica', t:'O Universo', type:'mc', diff:2, q:'⭐ Idade do Universo (Big Bang):', opts:['~4 mil milhões anos','~13,8 mil milhões anos','~100 mil milhões anos'], ans:1, exp:'~13,8 mil milhões de anos.' },

    { id:'7fq_ss1', s:'fisico_quimica', t:'Sistema Solar', type:'mc', diff:1, q:'🪐 Quantos planetas tem o Sistema Solar?', opts:['7','8','9'], ans:1, exp:'8 (Plutão deixou de ser planeta em 2006).' ,
      intro: "O **Sistema Solar** formou-se há ~4,6 mil milhões de anos. Hoje conhecemos bem a sua estrutura — mas demorou séculos a descobrir.",
      hint: "Quantos planetas conheces? Conta com os dedos: Mercúrio, Vénus, Terra, Marte, Júpiter, Saturno, Úrano, Neptuno.",
      richExp: "**8 planetas** (desde 2006, quando Plutão foi reclassificado como planeta-anão).\n\n**Classificação**:\n- **Rochosos (telúricos)**: Mercúrio, Vénus, Terra, Marte. Pequenos, sólidos, perto do Sol.\n- **Gasosos (jovianos)**: Júpiter, Saturno, Úrano, Neptuno. Gigantes, sobretudo gás.\n\n**Outros corpos**:\n- **Cintura de asteroides** (entre Marte e Júpiter)\n- **Cometas** (gelo + poeira; cauda quando perto do Sol)\n- **Planetas-anões**: Plutão, Ceres, Éris, Makemake, Haumea\n\n**Curiosidade**: a luz do Sol demora ~8 minutos a chegar à Terra. À luz que vemos do Sol é a luz que ele emitiu há 8 minutos!\n\n**Conexão**: estás a aprender astronomia básica que historicamente mudou a forma como o ser humano se vê no universo (Copérnico, Galileu)."},
    { id:'7fq_ss2', s:'fisico_quimica', t:'Sistema Solar', type:'mc', diff:2, q:'🪐 Maior planeta do Sistema Solar:', opts:['Saturno','Júpiter','Neptuno'], ans:1, exp:'Júpiter é o maior planeta do Sistema Solar — um gigante gasoso, maior que todos os outros juntos.' },

    { id:'7fq_tl1', s:'fisico_quimica', t:'A Terra, a Lua e as forças gravíticas', type:'mc', diff:1, q:'🌍 Tempo da rotação da Terra:', opts:['1 hora','24 horas','1 ano'], ans:1, exp:'24 h = 1 dia.' },
    { id:'7fq_tl2', s:'fisico_quimica', t:'A Terra, a Lua e as forças gravíticas', type:'mc', diff:2, q:'⚖️ Quando vais para a Lua, a tua MASSA:', opts:['fica menor','fica igual','fica maior'], ans:1, exp:'Massa é igual. Peso é que diminui (~1/6).' },

    { id:'7fq_sm1', s:'fisico_quimica', t:'Substâncias e misturas', type:'mc', diff:1, q:'🧪 Água + areia é uma mistura:', opts:['homogénea','heterogénea','coloidal'], ans:1, exp:'Vê-se duas fases.' },
    { id:'7fq_sm2', s:'fisico_quimica', t:'Substâncias e misturas', type:'mc', diff:2, q:'🧪 O ar é:', opts:['substância pura','mistura homogénea','mistura heterogénea'], ans:1, exp:'Mistura homogénea de gases.' },
    { id:'7fq_sm3', s:'fisico_quimica', t:'Substâncias e misturas', type:'mc', diff:2, q:'🧪 Para separar água + óleo usa-se:', opts:['filtração','decantação','destilação'], ans:1, exp:'Decantação (líquidos imiscíveis).' },

    { id:'7fq_es1', s:'fisico_quimica', t:'Estados físicos da matéria', type:'mc', diff:1, q:'💧 Sólido → líquido é:', opts:['fusão','solidificação','vaporização'], ans:0, exp:'A passagem de sólido a líquido chama-se fusão (ex.: o gelo a derreter).' ,
      intro: "Quando o gelo **derrete** e vira água, está a haver uma **mudança de estado físico**. Cada mudança tem o seu nome — é importante conhecer todos os 6.",
      hint: "Sólido → Líquido. Pensa: o gelo \"**funde**\" e vira água. O processo chama-se ___.",
      richExp: "**As 6 mudanças de estado físico**:\n\n```\n         FUSÃO\nSÓLIDO ─────────► LÍQUIDO\n       ◄─────────\n       SOLIDIFICAÇÃO\n\n         VAPORIZAÇÃO\nLÍQUIDO ────────► GASOSO\n        ◄────────\n        CONDENSAÇÃO\n\n         SUBLIMAÇÃO\nSÓLIDO ─────────► GASOSO\n       ◄─────────\n       SUBLIMAÇÃO INVERSA\n        (ou DEPOSIÇÃO)\n```\n\n**Exemplos do dia-a-dia**:\n- **Fusão**: gelo → água. Manteiga ao calor.\n- **Solidificação**: água → gelo no congelador. Vela a arrefecer.\n- **Vaporização**: água a ferver (rápida) ou roupa a secar ao sol (evaporação, lenta).\n- **Condensação**: orvalho de manhã, gotas no espelho do banho.\n- **Sublimação**: naftalina, gelo seco (CO₂ sólido), camphor.\n- **Sublimação inversa**: geada no jardim no inverno.\n\n**Durante a mudança de estado**, a temperatura mantém-se constante. A energia é usada para \"quebrar ligações\" entre partículas, não para aquecer.\n\n**Pontos característicos**:\n- Água: ponto de fusão = **0 °C** | ponto de ebulição = **100 °C** (à pressão atmosférica normal).\n\n**Conexão**: no 10.º vais aprender o conceito de **calor latente** — a energia necessária para mudar de estado sem aumentar a temperatura."},
    { id:'7fq_es2', s:'fisico_quimica', t:'Estados físicos da matéria', type:'mc', diff:2, q:'🌫️ Vapor → líquido é:', opts:['evaporação','condensação','sublimação'], ans:1, exp:'Condensação (gasoso → líquido).' },

    { id:'7fq_tf1', s:'fisico_quimica', t:'Transformações físicas', type:'mc', diff:2, q:'🔁 Qual destas é transformação física?', opts:['queimar madeira','partir um vidro','enferrujar ferro'], ans:1, exp:'Partir vidro — continua a ser vidro. Queimar/enferrujar = química.' },

    { id:'7fq_tq1', s:'fisico_quimica', t:'Transformações químicas', type:'mc', diff:1, q:'⚗️ Ferrugem (Fe + O₂) é uma reação:', opts:['física','química','nuclear'], ans:1, exp:'Forma novo composto (óxido).' },
    { id:'7fq_tq2', s:'fisico_quimica', t:'Transformações químicas', type:'mc', diff:2, q:'⚗️ Lei da conservação da massa foi proposta por:', opts:['Newton','Lavoisier','Mendeleev'], ans:1, exp:'Lavoisier: "Nada se cria, nada se perde, tudo se transforma".' },

    { id:'7fq_mv1', s:'fisico_quimica', t:'Massa volúmica', type:'mc', diff:1, q:'⚖️ Massa volúmica da água é:', opts:['100 kg/m³','1 000 kg/m³','10 000 kg/m³'], ans:1, exp:'1 000 kg/m³ = 1 g/cm³.' ,
      intro: "A **massa volúmica** (também chamada densidade) explica porque o gelo flutua na água e o óleo na sopa. É uma propriedade característica das substâncias.",
      hint: "Massa volúmica = massa ÷ volume. A água tem 1 kg em cada litro. 1 litro = 1 dm³ = 1 000 cm³. Então em 1 m³ há quantos kg?",
      richExp: "**Fórmula**: `ρ = m / V` (ρ = \"rô\")\n\n- m em **kg**, V em **m³** → ρ em **kg/m³**\n- m em **g**, V em **cm³** → ρ em **g/cm³**\n\n**Conversão útil**: 1 g/cm³ = 1 000 kg/m³.\n\n**Densidade da água**: 1 000 kg/m³ = 1 g/cm³ — referência fácil de decorar.\n\n**Densidades comuns**:\n- Gelo: 920 (flutua na água ✓)\n- Óleo: 900 (flutua na água ✓)\n- Alumínio: 2 700 (afunda)\n- Ferro: 7 870\n- Ouro: 19 300\n- Ar: 1,2\n\n**Flutuação**: objeto com densidade MENOR que o líquido → flutua.\n\n**Curiosidade**: por isso o ouro é fácil de identificar — pesa imenso para o volume que tem. Os egípcios usavam isto para detetar peças falsas."},
    { id:'7fq_mv2', s:'fisico_quimica', t:'Massa volúmica', type:'mc', diff:2, q:'🧊 O gelo flutua na água porque:', opts:['é mais denso','é menos denso','tem ar dentro'], ans:1, exp:'Gelo ~920 kg/m³ < água 1000 kg/m³.' },
    { id:'7fq_mv3', s:'fisico_quimica', t:'Massa volúmica', type:'fill', diff:2, q:'Massa 200 g, volume 100 cm³. Massa volúmica em g/cm³: ___', ans:['2'], exp:'ρ = m/V = 200/100 = 2 g/cm³.' },

    // =============== EDUCAÇÃO VISUAL ===============
    { id:'7ev_pl1', s:'educacao_visual', t:'Ponto, linha e plano', type:'mc', diff:1, q:'🎨 O elemento gráfico mais simples é o:', opts:['ponto','linha','plano'], ans:0, exp:'Ponto — só posição, sem dimensão.' },
    { id:'7ev_pl2', s:'educacao_visual', t:'Ponto, linha e plano', type:'mc', diff:2, q:'📐 Linha que dá sensação de movimento e instabilidade:', opts:['horizontal','vertical','diagonal'], ans:2, exp:'Diagonal/oblíqua = dinâmica.' },

    { id:'7ev_co1', s:'educacao_visual', t:'Cor', type:'mc', diff:1, q:'🎨 Mistura de azul + amarelo:', opts:['laranja','verde','roxo'], ans:1, exp:'Verde (secundária).' },
    { id:'7ev_co2', s:'educacao_visual', t:'Cor', type:'mc', diff:2, q:'🎨 Cor complementar do vermelho é:', opts:['azul','verde','amarelo'], ans:1, exp:'Vermelho e verde são complementares.' },
    { id:'7ev_co3', s:'educacao_visual', t:'Cor', type:'mc', diff:2, q:'🖼️ Cores aditivas (luz, RGB):', opts:['magenta, amarelo, ciano','vermelho, verde, azul','vermelho, amarelo, azul'], ans:1, exp:'RGB (red, green, blue) — usado em ecrãs.' },

    { id:'7ev_fc1', s:'educacao_visual', t:'Forma e composição', type:'mc', diff:2, q:'⚖️ Princípio que dá sensação de ordem é:', opts:['equilíbrio simétrico','contraste','movimento'], ans:0, exp:'Simetria = ordem.' },
    { id:'7ev_fc2', s:'educacao_visual', t:'Forma e composição', type:'tf', diff:2, q:'Equilíbrio só existe quando a composição é simétrica.', ans:false, exp:'Falso — há também equilíbrio assimétrico.' },

    { id:'7ev_pe1', s:'educacao_visual', t:'Perspetiva', type:'mc', diff:1, q:'📐 Linhas paralelas convergem para:', opts:['plano','ponto de fuga','horizonte'], ans:1, exp:'Ponto de fuga, na linha do horizonte.' },
    { id:'7ev_pe2', s:'educacao_visual', t:'Perspetiva', type:'mc', diff:2, q:'🏛️ Quem desenvolveu a perspetiva linear no Renascimento?', opts:['Brunelleschi','Da Vinci','Picasso'], ans:0, exp:'Filippo Brunelleschi, séc. XV.' },

    { id:'7ev_ls1', s:'educacao_visual', t:'Luz e sombra', type:'mc', diff:1, q:'☀️ Sombra projetada pelo objeto no chão chama-se:', opts:['sombra própria','sombra projetada','brilho'], ans:1, exp:'Projetada.' },
    { id:'7ev_ls2', s:'educacao_visual', t:'Luz e sombra', type:'mc', diff:2, q:'🎨 Técnica de gradação suave (Leonardo da Vinci):', opts:['esfumado','hachuras','pontilhado'], ans:0, exp:'Esfumado (sfumato).' },

    { id:'7ev_cv1', s:'educacao_visual', t:'Comunicação visual', type:'mc', diff:1, q:'🚦 Cor associada a perigo na sinalética:', opts:['vermelho','verde','azul'], ans:0, exp:'Vermelho = perigo/proibição.' },
    { id:'7ev_cv2', s:'educacao_visual', t:'Comunicação visual', type:'mc', diff:2, q:'🔤 Tipos de letra "sans-serif" (sem remates):', opts:['Times New Roman','Arial','Garamond'], ans:1, exp:'Arial não tem serifas.' },

    // =============== TIC ===============
    { id:'7t_hs1', s:'tic', t:'Hardware e software', type:'mc', diff:1, q:'💻 "CPU" é:', opts:['processador','memória','disco'], ans:0, exp:'Central Processing Unit — processador.' },
    { id:'7t_hs2', s:'tic', t:'Hardware e software', type:'mc', diff:2, q:'💾 Memória VOLÁTIL (perde-se ao desligar) é:', opts:['SSD','RAM','disco rígido'], ans:1, exp:'RAM — memória volátil.' },
    { id:'7t_hs3', s:'tic', t:'Hardware e software', type:'mc', diff:1, q:'🖱️ Rato é periférico de:', opts:['entrada','saída','ambos'], ans:0, exp:'Input — entrada de dados.' },

    { id:'7t_so1', s:'tic', t:'Sistema operativo', type:'mc', diff:1, q:'💻 Sistema operativo da Microsoft:', opts:['macOS','Windows','Linux'], ans:1, exp:'O sistema operativo da Microsoft é o Windows (alternativas: macOS da Apple, Linux).' },
    { id:'7t_so2', s:'tic', t:'Sistema operativo', type:'mc', diff:2, q:'⌨️ Atalho para "Copiar":', opts:['Ctrl+V','Ctrl+C','Ctrl+X'], ans:1, exp:'Ctrl+C copia; Ctrl+V cola; Ctrl+X corta.' },
    { id:'7t_so3', s:'tic', t:'Sistema operativo', type:'fill', diff:2, q:'Extensão do PowerPoint: ___', ans:['.pptx','pptx'], exp:'.pptx para Microsoft PowerPoint.' },

    { id:'7t_in1', s:'tic', t:'Internet e navegação', type:'mc', diff:1, q:'🌐 "HTTPS" é:', opts:['site sem segurança','protocolo SEGURO','servidor de e-mail'], ans:1, exp:'HTTPS — Secure HTTP.' },
    { id:'7t_in2', s:'tic', t:'Internet e navegação', type:'mc', diff:2, q:'🔍 Para procurar frase exata no Google:', opts:['sem aspas','entre aspas','com asterisco'], ans:1, exp:'"frase exata" — pesquisa fechada.' },

    { id:'7t_seg1', s:'tic', t:'Segurança online', type:'mc', diff:1, q:'🔒 Boa palavra-passe:', opts:['12345 (fácil de decorar)','o teu nome e data de nascimento','12+ caracteres com maiúsculas, números, símbolos'], ans:2, exp:'Forte = longa e variada.' },
    { id:'7t_seg2', s:'tic', t:'Segurança online', type:'mc', diff:2, q:'🎣 "Phishing" é:', opts:['um vírus que apaga ficheiros','tentativa de roubar dados com falsa identidade','um jogo online de pesca'], ans:1, exp:'Phishing — engana o utilizador.' },
    { id:'7t_seg3', s:'tic', t:'Segurança online', type:'tf', diff:1, q:'Devo usar a mesma password em todos os sites.', ans:false, exp:'Falso — se uma for roubada, todas ficam vulneráveis.' },

    { id:'7t_pt1', s:'tic', t:'Processador de texto', type:'mc', diff:1, q:'⌨️ Atalho para guardar:', opts:['Ctrl+S','Ctrl+G','Ctrl+F'], ans:0, exp:'Ctrl+S (Save).' },
    { id:'7t_pt2', s:'tic', t:'Processador de texto', type:'mc', diff:2, q:'📄 Formato NÃO editável facilmente:', opts:['.docx','.txt','.pdf'], ans:2, exp:'PDF — formato final.' },

    { id:'7t_fc1', s:'tic', t:'Folha de cálculo', type:'mc', diff:1, q:'📊 Uma fórmula começa SEMPRE com:', opts:['+','=','#'], ans:1, exp:'=A1+B1.' },
    { id:'7t_fc2', s:'tic', t:'Folha de cálculo', type:'mc', diff:2, q:'📊 Função para média:', opts:['=SOMA','=MÉDIA','=MÁXIMO'], ans:1, exp:'=MÉDIA(A1:A10).' },
    { id:'7t_fc3', s:'tic', t:'Folha de cálculo', type:'fill', diff:2, q:'Função para somar A1 a A10: =___(A1:A10)', ans:['SOMA','soma'], exp:'=SOMA(A1:A10).' },

    { id:'7t_ap1', s:'tic', t:'Apresentações eletrónicas', type:'mc', diff:1, q:'⌨️ Tecla para iniciar apresentação do início:', opts:['Esc','F5','Tab'], ans:1, exp:'F5 inicia do começo. Shift+F5 do slide atual.' },
    { id:'7t_ap2', s:'tic', t:'Apresentações eletrónicas', type:'tf', diff:2, q:'Um bom slide deve ter muito texto para o público ler.', ans:false, exp:'Falso — pouco texto, máximo 6 linhas / 6 palavras.' },

    // =============== EDUCAÇÃO FÍSICA ===============
    { id:'7ef_aq1', s:'educacao_fisica', t:'Aquecimento e arrefecimento', type:'tf', diff:1, q:'O aquecimento previne lesões.', ans:true, exp:'Verdadeiro — prepara músculos e articulações.' },
    { id:'7ef_aq2', s:'educacao_fisica', t:'Aquecimento e arrefecimento', type:'mc', diff:2, q:'🤸 Alongamentos estáticos longos devem fazer-se:', opts:['antes do esforço','depois do esforço','não se devem fazer'], ans:1, exp:'Depois (arrefecimento). Antes podem reduzir a força.' },

    { id:'7ef_cap1', s:'educacao_fisica', t:'Capacidades físicas', type:'mc', diff:1, q:'💪 Quantas capacidades físicas principais?', opts:['3','5','10'], ans:1, exp:'Força, resistência, velocidade, flexibilidade, coordenação.' },
    { id:'7ef_cap2', s:'educacao_fisica', t:'Capacidades físicas', type:'mc', diff:2, q:'❤️ FC máxima para 13 anos (fórmula 220 − idade):', opts:['180','207','220'], ans:1, exp:'220 − 13 = 207 bpm.' },

    { id:'7ef_at1', s:'educacao_fisica', t:'Atletismo', type:'mc', diff:1, q:'🏃 Maratona tem ___ km:', opts:['10','21','42,195'], ans:2, exp:'42,195 km.' },
    { id:'7ef_at2', s:'educacao_fisica', t:'Atletismo', type:'mc', diff:2, q:'🏅 Carlos Lopes ganhou ouro olímpico em:', opts:['100 m','maratona','salto em altura'], ans:1, exp:'Maratona — Los Angeles 1984.' },
    { id:'7ef_at3', s:'educacao_fisica', t:'Atletismo', type:'fill', diff:2, q:'Decatlo tem ___ provas.', ans:['10','dez'], exp:'10 provas em 2 dias (homens).' },

    { id:'7ef_gin1', s:'educacao_fisica', t:'Ginástica', type:'mc', diff:1, q:'🤸 Aparelho EXCLUSIVO das mulheres na ginástica artística:', opts:['barra fixa','trave','cavalo com arções'], ans:1, exp:'Trave / paralelas assimétricas (mulheres).' },
    { id:'7ef_gin2', s:'educacao_fisica', t:'Ginástica', type:'tf', diff:1, q:'Devo usar colchões e ter ajuda ao fazer ginástica.', ans:true, exp:'Verdadeiro — segurança primeiro.' },

    { id:'7ef_co1', s:'educacao_fisica', t:'Modalidades coletivas', type:'mc', diff:1, q:'⚽ Quantos jogadores no campo em futebol (por equipa)?', opts:['9','11','13'], ans:1, exp:'11 (1 GR + 10 de campo).' },
    { id:'7ef_co2', s:'educacao_fisica', t:'Modalidades coletivas', type:'mc', diff:2, q:'🏀 Pontuação máxima de um lançamento de basquete:', opts:['1','2','3'], ans:2, exp:'3 pontos (atrás da linha).' },
    { id:'7ef_co3', s:'educacao_fisica', t:'Modalidades coletivas', type:'mc', diff:2, q:'🏐 Voleibol: máximo de toques por equipa antes de passar:', opts:['2','3','4'], ans:1, exp:'3 toques.' },

    { id:'7ef_reg1', s:'educacao_fisica', t:'Regras gerais do desporto', type:'mc', diff:1, q:'🤝 Fair play significa:', opts:['vencer a qualquer custo','jogar limpo, com respeito','tirar partido das regras'], ans:1, exp:'Espírito desportivo.' },
    { id:'7ef_reg2', s:'educacao_fisica', t:'Regras gerais do desporto', type:'mc', diff:2, q:'🏅 Lema olímpico até 2021:', opts:['Mais rápido, mais alto, mais forte','Vitória ou nada','Um por todos, todos por um'], ans:0, exp:'Citius, Altius, Fortius. Em 2021 adicionou "Communiter" (juntos).' },
    { id:'7ef_reg3', s:'educacao_fisica', t:'Regras gerais do desporto', type:'fill', diff:1, q:'Número de emergência em Portugal e UE: ___', ans:['112'], exp:'112 — fácil de fixar: 1-1-2. É gratuito e funciona em toda a União Europeia.' }
];
window.EXERCISES_BASE_7 = EXERCISES_7;
})();
