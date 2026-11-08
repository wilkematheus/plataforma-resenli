/* ==========================================================
   RESENLI — Dados (compartilhados por todas as páginas)

   O catálogo de livros e as resenhas da comunidade são fixos.
   Os dados PESSOAIS (resenhas, status de leitura, lista, curtidas,
   comentários) começam vazios aqui e são preenchidos por
   persistencia.js com o que cada conta salvou no navegador.
   ========================================================== */


/* ---------- 1. META E LIMITES ---------- */

// O usuário logado vem da sessão (veja conta.js e layout.js)

// Quantos livros o usuário quer ler no ano (página Início)
const metaLeitura = 12;

// Tamanhos máximos de texto (os mesmos do maxlength dos campos no HTML)
const LIMITE_TEXTO = 420;
const LIMITE_COMENTARIO = 280;


/* ---------- 2. CATÁLOGO DE LIVROS ---------- */

// "tags" são usadas pela pesquisa (ex.: as buscas populares)
const livros = [
  {
    id: "torto-arado",
    titulo: "Torto Arado",
    autor: "Itamar Vieira Junior",
    capa: "capa-1",
    genero: "Literatura brasileira",
    tags: ["Romance brasileiro"],
    ano: 2019,
    paginas: 264,
    notaMedia: 4.8,
    totalAvaliacoes: 12400,
  },
  {
    id: "tudo-e-rio",
    titulo: "Tudo é Rio",
    autor: "Carla Madeira",
    capa: "capa-2",
    genero: "Literatura brasileira",
    tags: ["Romance brasileiro"],
    ano: 2014,
    paginas: 210,
    notaMedia: 4.7,
    totalAvaliacoes: 9800,
  },
  {
    id: "addie-larue",
    titulo: "A Vida Invisível de Addie LaRue",
    autor: "V. E. Schwab",
    capa: "capa-3",
    genero: "Literatura estrangeira",
    tags: ["Fantasia"],
    ano: 2020,
    paginas: 448,
    notaMedia: 4.6,
    totalAvaliacoes: 18200,
  },
  {
    id: "quarto-de-despejo",
    titulo: "Quarto de Despejo",
    autor: "Carolina Maria de Jesus",
    capa: "capa-4",
    genero: "Literatura brasileira",
    tags: ["Não ficção", "Clássicos"],
    ano: 1960,
    paginas: 200,
    notaMedia: 4.9,
    totalAvaliacoes: 14100,
  },
  {
    id: "avesso-da-pele",
    titulo: "O Avesso da Pele",
    autor: "Jeferson Tenório",
    capa: "capa-5",
    genero: "Literatura brasileira",
    tags: ["Romance brasileiro"],
    ano: 2020,
    paginas: 192,
    notaMedia: 4.8,
    totalAvaliacoes: 7500,
  },
  {
    id: "cem-anos-de-solidao",
    titulo: "Cem Anos de Solidão",
    autor: "Gabriel García Márquez",
    capa: "capa-6",
    genero: "Literatura estrangeira",
    tags: ["Clássicos"],
    ano: 1967,
    paginas: 448,
    notaMedia: 4.9,
    totalAvaliacoes: 25700,
  },
];


/* ---------- 3. DADOS DA PESSOA LOGADA (carregados por persistencia.js) ---------- */

// Status de cada livro: "quero-ler", "lendo" ou "lido". Livro sem status não aparece aqui.
let statusLeitura = {};

// Ids dos livros que ainda faltam ler (quero ler + lendo), na ordem da estante.
// Um livro lido sai daqui automaticamente.
let minhaLista = [];

// Resenhas escritas pela pessoa (Minhas avaliações)
let resenhas = [];

// Livros que vieram do Google Books e a pessoa guardou (na lista ou numa resenha),
// no mesmo formato do catálogo: { id: livro }. Os do catálogo fixo não entram aqui.
let livrosExternos = {};

// O que a pessoa fez nas resenhas da comunidade (Início):
// curtidas e salvas = ids das resenhas; comentarios = { idDaResenha: [ { id, texto, data } ] }
let interacoes = { curtidas: [], salvos: [], comentarios: {} };


/* ---------- 4. RESENHAS DA COMUNIDADE (Início e página do livro) ---------- */

// "minutosAtras" vira uma data real quando a página carrega,
// para o "Há 18 minutos" continuar fazendo sentido em qualquer dia.
// "comentarios" é a lista de comentários da resenha.
const resenhasComunidade = [
  {
    id: "c1",
    autor: "Marina Campos",
    avatar: "avatar-1",
    livroId: "torto-arado",
    nota: 5,
    texto:
      "Uma história que parece nascer da própria terra. Itamar escreve com uma delicadeza imensa sobre " +
      "pertencimento, memória e tudo aquilo que herdamos sem escolher.",
    minutosAtras: 18,
    etiqueta: "Mais comentada",
    curtidas: 248,
    comentarios: [
      { id: "c1-1", autor: "Rafael Lima", avatar: "avatar-2", texto: "Concordo demais, a Bibiana e a Belonísia ficaram comigo por semanas.", minutosAtras: 12 },
      { id: "c1-2", autor: "Clara Nunes", avatar: "avatar-3", texto: "Vou ler no próximo mês, obrigada pela indicação!", minutosAtras: 7 },
      { id: "c1-3", autor: "João Pedro", avatar: "avatar-2", texto: "Que final. Ainda estou pensando nele.", minutosAtras: 3 },
    ],
  },
  {
    id: "c2",
    autor: "João Pedro",
    avatar: "avatar-2",
    livroId: "addie-larue",
    nota: 4,
    texto:
      "A premissa é maravilhosa e a atmosfera acompanha. Foi uma leitura lenta para mim, mas daquelas que " +
      "continuam voltando à cabeça muitos dias depois.",
    minutosAtras: 60,
    etiqueta: "",
    curtidas: 186,
    comentarios: [
      { id: "c2-1", autor: "Marina Campos", avatar: "avatar-1", texto: "Também achei lento no começo, mas vale a pena.", minutosAtras: 40 },
    ],
  },
  {
    id: "c3",
    autor: "Clara Nunes",
    avatar: "avatar-3",
    livroId: "quarto-de-despejo",
    nota: 5,
    texto:
      "Um livro indispensável. A voz de Carolina é direta, viva e impossível de ignorar. Terminei querendo " +
      "conversar sobre cada página.",
    minutosAtras: 120,
    etiqueta: "Em alta",
    curtidas: 312,
    comentarios: [
      { id: "c3-1", autor: "Rafael Lima", avatar: "avatar-2", texto: "Leitura obrigatória nas escolas.", minutosAtras: 100 },
      { id: "c3-2", autor: "Marina Campos", avatar: "avatar-1", texto: "Fiquei sem palavras. Que diário!", minutosAtras: 90 },
    ],
  },
  {
    id: "c4",
    autor: "Rafael Lima",
    avatar: "avatar-2",
    livroId: "cem-anos-de-solidao",
    nota: 5,
    texto:
      "Macondo é um lugar onde tudo é possível. Precisei de um papel com a árvore genealógica, mas cada " +
      "página valeu o esforço.",
    minutosAtras: 300,
    etiqueta: "",
    curtidas: 154,
    comentarios: [],
  },
  {
    id: "c5",
    autor: "Marina Campos",
    avatar: "avatar-1",
    livroId: "tudo-e-rio",
    nota: 4,
    texto:
      "Um romance que dói e acolhe ao mesmo tempo. Carla Madeira escreve de um jeito que não dá para largar.",
    minutosAtras: 1500,
    etiqueta: "",
    curtidas: 97,
    comentarios: [
      { id: "c5-1", autor: "Clara Nunes", avatar: "avatar-3", texto: "Li em dois dias. Impossível parar.", minutosAtras: 1400 },
    ],
  },
  {
    id: "c6",
    autor: "Clara Nunes",
    avatar: "avatar-3",
    livroId: "torto-arado",
    nota: 4,
    texto:
      "A segunda metade me pegou de jeito. Um retrato duro e bonito do sertão baiano.",
    minutosAtras: 3000,
    etiqueta: "",
    curtidas: 63,
    comentarios: [],
  },
];
