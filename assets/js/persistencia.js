/* ==========================================================
   RESENLI — Dados pessoais salvos no navegador (localStorage)

   Cada conta tem o seu conjunto, guardado em "resenli:dados:<e-mail>":
   resenhas, status de leitura, lista, curtidas, salvas e comentários.
   Contas diferentes no mesmo navegador não enxergam os dados uma da outra.

   Precisa ser carregado depois de dados.js, utils.js, status.js e conta.js.
   Ao carregar a página, os dados salvos já são colocados nas variáveis
   de dados.js, então as outras funções do programa nem precisam saber disso:
   basta chamar salvarDados() depois de qualquer mudança.
   ========================================================== */

const VERSAO_DADOS = 1;

// Quantos livros do Google Books cada conta pode guardar (evita encher o armazenamento)
const MAX_LIVROS_EXTERNOS = 200;

// Funções que cada página registra para se redesenhar quando os dados mudam em outra aba
const aoMudarDados = [];

// Avisa só uma vez que não foi possível salvar (para não repetir a cada clique)
let avisouErroAoSalvar = false;


/* ---------- 1. VALIDAÇÃO ---------- */

// Os dados vêm do navegador e podem ter sido apagados, cortados ou editados à mão:
// nada daqui pode quebrar a página, então tudo é conferido e o que for inválido é descartado.

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function textoComLimite(valor, limite) {
  return typeof valor === "string" && valor.trim() !== "" && valor.length <= limite;
}

function resenhaSalvaValida(item) {
  return (
    item !== null &&
    typeof item === "object" &&
    Number.isInteger(item.id) &&
    typeof item.livro === "string" &&
    typeof item.autor === "string" &&
    typeof item.capa === "string" &&
    (item.livroId === undefined || typeof item.livroId === "string") &&
    Number.isInteger(item.nota) && item.nota >= 1 && item.nota <= 5 &&
    textoComLimite(item.texto, LIMITE_TEXTO) &&
    typeof item.data === "string" && DATA_ISO.test(item.data)
  );
}

function listaDeIds(valor, idsValidos) {
  if (!Array.isArray(valor)) {
    return [];
  }

  // Set remove ids repetidos; o filtro tira ids de resenhas que não existem mais
  return [...new Set(valor)].filter((id) => typeof id === "string" && idsValidos.includes(id));
}

function comentariosSalvosValidos(valor, idsValidos) {
  const resultado = {};

  if (valor === null || typeof valor !== "object") {
    return resultado;
  }

  for (const idResenha of idsValidos) {
    const lista = Array.isArray(valor[idResenha]) ? valor[idResenha] : [];
    const usados = new Set();

    resultado[idResenha] = lista.filter((comentario) => {
      const valido =
        comentario !== null &&
        typeof comentario === "object" &&
        typeof comentario.id === "string" && !usados.has(comentario.id) &&
        textoComLimite(comentario.texto, LIMITE_COMENTARIO) &&
        typeof comentario.data === "string" && !Number.isNaN(Date.parse(comentario.data));

      if (valido) {
        usados.add(comentario.id);
      }
      return valido;
    }).map((comentario) => ({ id: comentario.id, texto: comentario.texto, data: comentario.data }));
  }

  return resultado;
}

// Transforma o que veio do navegador em dados seguros e coerentes entre si
function sanitizarDados(bruto) {
  const idsComunidade = resenhasComunidade.map((item) => item.id);
  const vazio = {
    resenhas: [],
    statusLeitura: {},
    minhaLista: [],
    livrosExternos: {},
    interacoes: { curtidas: [], salvos: [], comentarios: comentariosSalvosValidos(null, idsComunidade) },
  };

  if (bruto === null || typeof bruto !== "object" || bruto.versao !== VERSAO_DADOS) {
    return vazio;
  }

  // Livros do Google Books guardados: cada um é limpo como se tivesse acabado de chegar da API
  const externos = {};
  const brutoExternos = bruto.livrosExternos !== null && typeof bruto.livrosExternos === "object" ? bruto.livrosExternos : {};
  for (const chave of Object.keys(brutoExternos)) {
    if (Object.keys(externos).length >= MAX_LIVROS_EXTERNOS) {
      break;
    }

    const limpo = limparLivroExterno({ ...brutoExternos[chave], id: chave });
    // Um id igual ao de um livro do catálogo fixo é descartado: o catálogo vence
    if (limpo && !livros.some((livro) => livro.id === limpo.id)) {
      externos[limpo.id] = limpo;
    }
  }

  // O livro existe? (catálogo fixo ou Google Books guardado)
  const existeLivro = (id) => livros.some((livro) => livro.id === id) || Object.prototype.hasOwnProperty.call(externos, id);

  // Resenhas: sem repetir id nem livro (a regra é uma resenha por livro)
  const idsVistos = new Set();
  const livrosVistos = new Set();
  const listaResenhas = (Array.isArray(bruto.resenhas) ? bruto.resenhas : [])
    .filter((item) => {
      if (!resenhaSalvaValida(item) || idsVistos.has(item.id) || livrosVistos.has(item.livro)) {
        return false;
      }
      idsVistos.add(item.id);
      livrosVistos.add(item.livro);
      return true;
    })
    .map((item) => {
      // Resenhas antigas não têm o id do livro: descobre pelo título (só dá certo para o catálogo fixo)
      const doCatalogo = buscarLivroPorTitulo(item.livro);
      const livroId = item.livroId && existeLivro(item.livroId) ? item.livroId : doCatalogo ? doCatalogo.id : "";

      return { id: item.id, livroId, livro: item.livro, autor: item.autor, capa: item.capa, nota: item.nota, texto: item.texto, data: item.data };
    });

  // Status: só livros que existem e status que existem
  const status = {};
  const salvos = bruto.statusLeitura !== null && typeof bruto.statusLeitura === "object" ? bruto.statusLeitura : {};
  for (const id of Object.keys(salvos)) {
    if (existeLivro(id) && ROTULOS_STATUS[salvos[id]]) {
      status[id] = salvos[id];
    }
  }

  // Quem tem resenha já leu o livro
  for (const resenha of listaResenhas) {
    if (resenha.livroId) {
      status[resenha.livroId] = "lido";
    }
  }

  // A lista guarda quem está como "quero ler" ou "lendo": mantém a ordem salva e acrescenta o que faltar
  const faltaLer = (id) => status[id] === "quero-ler" || status[id] === "lendo";
  const ordemSalva = Array.isArray(bruto.minhaLista) ? bruto.minhaLista : [];
  const lista = [...new Set(ordemSalva)].filter((id) => typeof id === "string" && faltaLer(id));
  for (const id of Object.keys(status)) {
    if (faltaLer(id) && !lista.includes(id)) {
      lista.push(id);
    }
  }

  const brutoInteracoes = bruto.interacoes !== null && typeof bruto.interacoes === "object" ? bruto.interacoes : {};

  return {
    resenhas: listaResenhas,
    statusLeitura: status,
    minhaLista: lista,
    livrosExternos: externos,
    interacoes: {
      curtidas: listaDeIds(brutoInteracoes.curtidas, idsComunidade),
      salvos: listaDeIds(brutoInteracoes.salvos, idsComunidade),
      comentarios: comentariosSalvosValidos(brutoInteracoes.comentarios, idsComunidade),
    },
  };
}


/* ---------- 2. CARREGAR E SALVAR ---------- */

// Onde os dados da pessoa logada ficam guardados (null = ninguém logado)
function chaveDados() {
  const sessao = obterSessao();

  return sessao && sessao.email ? `resenli:dados:${sessao.email}` : null;
}

// Coloca nas variáveis de dados.js o que a conta salvou (ou vazio, se não houver nada)
function carregarDadosDoUsuario() {
  const chave = chaveDados();
  const dados = sanitizarDados(chave ? lerArmazenado(chave, null) : null);

  resenhas = dados.resenhas;
  statusLeitura = dados.statusLeitura;
  minhaLista = dados.minhaLista;
  livrosExternos = dados.livrosExternos;
  interacoes = dados.interacoes;
}

// Guarda tudo. Chamar depois de qualquer mudança nos dados. Devolve false se não deu para salvar.
function salvarDados() {
  const chave = chaveDados();
  if (!chave) {
    return false;
  }

  const salvou = gravarArmazenado(chave, {
    versao: VERSAO_DADOS,
    resenhas,
    statusLeitura,
    minhaLista,
    livrosExternos,
    interacoes,
  });

  if (!salvou && !avisouErroAoSalvar) {
    avisouErroAoSalvar = true;
    mostrarAviso("Não foi possível salvar. Suas mudanças valem só até recarregar a página.");
  }

  return salvou;
}


/* ---------- 3. VÁRIAS ABAS ---------- */

// O evento "storage" só chega nas OUTRAS abas: serve para manter todas em dia.
// Sem isso, uma aba antiga salvaria por cima do que a outra acabou de gravar.
function tratarMudancaEmOutraAba(evento) {
  // key === null significa que o armazenamento inteiro foi limpo
  if (evento.key !== null && evento.key !== chaveDados()) {
    return;
  }

  carregarDadosDoUsuario();
  for (const atualizar of aoMudarDados) {
    atualizar();
  }
}

window.addEventListener("storage", tratarMudancaEmOutraAba);

// Já carrega na hora, antes dos scripts das páginas
carregarDadosDoUsuario();
