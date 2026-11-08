/* ==========================================================
   RESENLI — Dados de exemplo (compartilhados por todas as páginas)
   Ainda sem JSON: cada página carrega estes valores iniciais
   e as mudanças ficam só em memória até recarregar.
   ========================================================== */


/* ---------- 1. USUÁRIO ---------- */

const usuario = {
  nome: "Matheus Wilke",
  usuario: "wilkematheus",
};

// Quantos livros o usuário quer ler no ano (página Início)
const metaLeitura = 12;


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


/* ---------- 3. MINHA LISTA ---------- */

// Ids dos livros salvos, na ordem em que aparecem na estante
let minhaLista = ["torto-arado", "tudo-e-rio", "quarto-de-despejo", "cem-anos-de-solidao"];


/* ---------- 4. RESENHAS DO USUÁRIO (Minhas avaliações) ---------- */

let resenhas = [
  {
    id: 1,
    livro: "Torto Arado",
    autor: "Itamar Vieira Junior",
    capa: "capa-1",
    nota: 5,
    texto:
      "Uma história que parece nascer da própria terra. Itamar escreve com uma delicadeza imensa sobre " +
      "pertencimento, memória e tudo aquilo que herdamos sem escolher.",
    data: "2025-03-12",
  },
  {
    id: 2,
    livro: "Quarto de Despejo",
    autor: "Carolina Maria de Jesus",
    capa: "capa-4",
    nota: 5,
    texto:
      "Um livro indispensável. A voz de Carolina é direta, viva e impossível de ignorar. Terminei querendo " +
      "conversar sobre cada página.",
    data: "2025-02-20",
  },
  {
    id: 3,
    livro: "A Vida Invisível de Addie LaRue",
    autor: "V. E. Schwab",
    capa: "capa-3",
    nota: 4,
    texto:
      "A premissa é maravilhosa e a atmosfera acompanha. Foi uma leitura lenta para mim, mas daquelas que " +
      "continuam voltando à cabeça muitos dias depois.",
    data: "2024-11-05",
  },
];


/* ---------- 5. RESENHAS DA COMUNIDADE (Início) ---------- */

// "minutosAtras" vira uma data real quando a página carrega,
// para o "Há 18 minutos" continuar fazendo sentido em qualquer dia
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
    comentarios: 32,
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
    comentarios: 21,
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
    comentarios: 47,
  },
];
