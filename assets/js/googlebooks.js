/* ==========================================================
   RESENLI — Google Books API (https://developers.google.com/books)

   Usa só dois endereços, ambos de leitura:
     GET /volumes?q=...      busca de livros
     GET /volumes/{id}       um livro

   Precisa de utils.js (limparLivroExterno e outros) e, opcionalmente,
   de config.js (GOOGLE_BOOKS_CHAVE). Sem chave a API funciona, mas
   o limite de uso é compartilhado e costuma acabar.

   Tudo que chega da API é tratado como dado não confiável:
   é validado por limparLivroExterno() antes de ser usado.
   ========================================================== */

const GB_URL = "https://www.googleapis.com/books/v1/volumes";

// Só pedimos os campos que o programa usa: respostas menores e mais rápidas
const GB_CAMPOS_LIVRO =
  "id,volumeInfo(title,authors,categories,publishedDate,pageCount,averageRating,ratingsCount,imageLinks,description,infoLink)";

const GB_POR_PAGINA = 12;
const GB_MINIMO_TERMO = 3;
const GB_TEMPO_LIMITE = 8000; // ms
const GB_MAX_RESULTADOS = 120; // a API perde a confiabilidade em páginas muito fundas
const GB_MAX_CACHE = 60;

// Respostas já recebidas nesta visita (some ao recarregar a página). Evita repetir pedidos iguais.
const cacheBuscaGoogle = new Map();
const cacheLivroGoogle = new Map();


/* ---------- 1. ERROS ---------- */

// tipo: "cota" | "chave" | "rede" | "tempo" | "resposta" | "http"
class ErroGoogleBooks extends Error {
  constructor(tipo, detalhe = "") {
    super(detalhe || tipo);
    this.name = "ErroGoogleBooks";
    this.tipo = tipo;
  }
}

// Cancelamento pedido pelo programa (ex.: a pessoa digitou outra coisa): não é um erro de verdade
function ehCancelamento(erro) {
  return Boolean(erro) && erro.name === "AbortError";
}

function temChaveGoogle() {
  return typeof GOOGLE_BOOKS_CHAVE === "string" && GOOGLE_BOOKS_CHAVE.trim() !== "";
}

// Mensagem para mostrar à pessoa (sem termos técnicos)
function mensagemDoErroGoogle(erro) {
  const tipo = erro instanceof ErroGoogleBooks ? erro.tipo : "http";

  if (tipo === "cota") {
    return temChaveGoogle()
      ? "O limite diário de buscas da sua chave do Google Books foi atingido. Tente de novo mais tarde."
      : "O limite gratuito de buscas do Google Books foi atingido. Para continuar, adicione uma chave da API em assets/js/config.js.";
  }
  if (tipo === "chave") {
    return "O Google Books recusou a chave da API. Confira a chave e as restrições dela em assets/js/config.js.";
  }
  if (tipo === "rede") {
    return "Não foi possível falar com o Google Books. Verifique a conexão com a internet.";
  }
  if (tipo === "tempo") {
    return "O Google Books demorou demais para responder. Tente de novo.";
  }

  return "O Google Books respondeu algo inesperado. Tente de novo em instantes.";
}

// Lê o erro que a API devolveu e escolhe o tipo
async function erroDaResposta(resposta) {
  let erro = null;
  try {
    erro = (await resposta.json()).error;
  } catch (falha) {
    // Resposta sem JSON: segue só com o código HTTP
  }

  const motivo = erro && Array.isArray(erro.errors) && erro.errors[0] ? String(erro.errors[0].reason) : "";
  const mensagem = erro && typeof erro.message === "string" ? erro.message : "";

  const motivosDeCota = ["rateLimitExceeded", "dailyLimitExceeded", "userRateLimitExceeded", "quotaExceeded"];
  if (resposta.status === 429 || motivosDeCota.includes(motivo)) {
    return new ErroGoogleBooks("cota");
  }

  const motivosDeChave = ["keyInvalid", "ipRefererBlocked", "accessNotConfigured", "forbidden"];
  if (motivosDeChave.includes(motivo) || /api key|referer|not authorized/i.test(mensagem)) {
    return new ErroGoogleBooks("chave");
  }

  return new ErroGoogleBooks("http", `HTTP ${resposta.status}`);
}


/* ---------- 2. PEDIDOS ---------- */

function montarUrlGoogle(caminho, parametros) {
  const url = new URL(GB_URL + caminho);

  for (const nome of Object.keys(parametros)) {
    url.searchParams.set(nome, parametros[nome]);
  }
  if (temChaveGoogle()) {
    url.searchParams.set("key", GOOGLE_BOOKS_CHAVE.trim());
  }

  return url.toString();
}

// Faz o pedido com tempo limite. `sinal` (AbortSignal) permite cancelar de fora.
// Devolve o JSON; lança ErroGoogleBooks, ou o AbortError original se foi cancelado de fora.
async function pedirJsonGoogle(url, sinal) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ErroGoogleBooks("rede");
  }
  if (sinal && sinal.aborted) {
    throw new DOMException("Cancelado", "AbortError");
  }

  const controle = new AbortController();
  let estourouOTempo = false;

  const cancelar = () => controle.abort();
  if (sinal) {
    sinal.addEventListener("abort", cancelar);
  }
  const temporizador = setTimeout(() => {
    estourouOTempo = true;
    controle.abort();
  }, GB_TEMPO_LIMITE);

  // Decide o que um erro do fetch ou da leitura do corpo significa
  const traduzir = (erro) => {
    if (estourouOTempo) {
      return new ErroGoogleBooks("tempo");
    }
    if (sinal && sinal.aborted) {
      return erro; // cancelado de fora: quem chamou ignora
    }
    return new ErroGoogleBooks(erro instanceof ErroGoogleBooks ? erro.tipo : "rede");
  };

  try {
    let resposta;
    try {
      resposta = await fetch(url, { signal: controle.signal });
    } catch (erro) {
      throw traduzir(erro);
    }

    if (!resposta.ok) {
      throw await erroDaResposta(resposta);
    }

    try {
      return await resposta.json();
    } catch (erro) {
      if (estourouOTempo || (sinal && sinal.aborted)) {
        throw traduzir(erro);
      }
      throw new ErroGoogleBooks("resposta");
    }
  } finally {
    clearTimeout(temporizador);
    if (sinal) {
      sinal.removeEventListener("abort", cancelar);
    }
  }
}

// Guarda no cache sem deixá-lo crescer para sempre (descarta o mais antigo)
function guardarNoCache(cache, chave, valor) {
  if (cache.size >= GB_MAX_CACHE) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(chave, valor);
}


/* ---------- 3. CONVERSÃO ---------- */

// Transforma um volume da API no formato dos livros do programa (ou null se não servir)
function normalizarLivroGoogle(item) {
  if (item === null || typeof item !== "object" || item.volumeInfo === null || typeof item.volumeInfo !== "object") {
    return null;
  }

  const info = item.volumeInfo;
  const autores = Array.isArray(info.authors) ? info.authors.filter((autor) => typeof autor === "string") : [];
  const categoria = Array.isArray(info.categories) && typeof info.categories[0] === "string" ? info.categories[0].split("/")[0] : "";
  const imagens = info.imageLinks !== null && typeof info.imageLinks === "object" ? info.imageLinks : {};

  return limparLivroExterno({
    id: item.id,
    titulo: info.title,
    // Mais de 3 pessoas autoras vira "A, B, C e outros"
    autor: autores.slice(0, 3).join(", ") + (autores.length > 3 ? " e outros" : ""),
    capaUrl: imagens.thumbnail || imagens.smallThumbnail || "",
    genero: categoria,
    ano: typeof info.publishedDate === "string" ? parseInt(info.publishedDate.slice(0, 4), 10) : 0,
    paginas: info.pageCount,
    notaMedia: info.averageRating,
    totalAvaliacoes: info.ratingsCount,
    // A descrição vem com HTML (<p>, <b>...): fica só o texto
    descricao: typeof info.description === "string" ? limitarTexto(textoSemHtml(info.description), 1500) : "",
    linkGoogle: info.infoLink,
  });
}


/* ---------- 4. FUNÇÕES PÚBLICAS ---------- */

// Busca livros por qualquer texto (título, autor, assunto...).
// `inicio` é a posição do primeiro resultado (para "Carregar mais").
// Devolve { livros, total, proximoInicio }.
async function buscarLivrosNoGoogle(termo, { inicio = 0, sinal } = {}) {
  const consulta = String(termo).replace(/\s+/g, " ").trim();

  if (consulta.length < GB_MINIMO_TERMO) {
    return { livros: [], total: 0, proximoInicio: 0 };
  }

  const chaveCache = `${normalizarTexto(consulta)}|${inicio}`;
  if (cacheBuscaGoogle.has(chaveCache)) {
    return cacheBuscaGoogle.get(chaveCache);
  }

  const json = await pedirJsonGoogle(
    montarUrlGoogle("", {
      q: consulta,
      startIndex: inicio,
      maxResults: GB_POR_PAGINA,
      printType: "books",
      orderBy: "relevance",
      fields: `totalItems,items(${GB_CAMPOS_LIVRO})`,
    }),
    sinal
  );

  if (json === null || typeof json !== "object") {
    throw new ErroGoogleBooks("resposta");
  }

  const itens = Array.isArray(json.items) ? json.items : [];
  const vistos = new Set();
  const livrosEncontrados = [];

  for (const item of itens) {
    const livro = normalizarLivroGoogle(item);
    if (livro && !vistos.has(livro.id)) {
      vistos.add(livro.id);
      livrosEncontrados.push(livro);
    }
  }

  const totalInformado = Number.isInteger(json.totalItems) && json.totalItems >= 0 ? json.totalItems : 0;
  const resultado = {
    livros: livrosEncontrados,
    total: Math.min(totalInformado, GB_MAX_RESULTADOS),
    // Avança pelo que a API entregou (e não pelo que sobrou depois de limpar), senão repetiria itens
    proximoInicio: inicio + itens.length,
  };

  guardarNoCache(cacheBuscaGoogle, chaveCache, resultado);
  return resultado;
}

// Busca um livro pelo id do Google. Devolve null se não existir ou se o id for inválido.
async function buscarLivroNoGoogle(id, sinal) {
  if (typeof id !== "string" || !ID_LIVRO_EXTERNO.test(id)) {
    return null;
  }
  if (cacheLivroGoogle.has(id)) {
    return cacheLivroGoogle.get(id);
  }

  let json;
  try {
    json = await pedirJsonGoogle(montarUrlGoogle(`/${encodeURIComponent(id)}`, { fields: GB_CAMPOS_LIVRO }), sinal);
  } catch (erro) {
    // Id que o Google não conhece: não é falha de conexão
    if (erro instanceof ErroGoogleBooks && erro.tipo === "http" && erro.message === "HTTP 404") {
      return null;
    }
    throw erro;
  }

  const livro = normalizarLivroGoogle(json);
  if (!livro) {
    throw new ErroGoogleBooks("resposta");
  }

  guardarNoCache(cacheLivroGoogle, id, livro);
  return livro;
}

// Procura no Google o mesmo livro do catálogo fixo, para trazer capa, descrição e link.
// Só aceita um resultado com o mesmo título, para não mostrar o livro errado.
async function buscarDetalhesDoLivroDoCatalogo(livro, sinal) {
  const chaveCache = `catalogo|${livro.id}`;
  if (cacheLivroGoogle.has(chaveCache)) {
    return cacheLivroGoogle.get(chaveCache);
  }

  const semAspas = (texto) => texto.replace(/"/g, "");
  const primeiroAutor = semAspas(livro.autor.split(",")[0]);
  const { livros: candidatos } = await buscarLivrosNoGoogle(`intitle:"${semAspas(livro.titulo)}" inauthor:"${primeiroAutor}"`, { sinal });

  const tituloProcurado = normalizarTexto(livro.titulo);
  const achado = candidatos.find((candidato) => normalizarTexto(candidato.titulo) === tituloProcurado && (candidato.capaUrl || candidato.descricao)) || null;

  guardarNoCache(cacheLivroGoogle, chaveCache, achado);
  return achado;
}
