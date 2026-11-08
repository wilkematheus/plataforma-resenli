/* ==========================================================
   RESENLI — Resenhas
   Por enquanto os dados ficam só em memória (sem JSON).
   Ao recarregar a página, a lista volta ao estado inicial.
   ========================================================== */


/* ---------- 1. DADOS ---------- */

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

// Livros que podem ser escolhidos no formulário (mesmos da página Nova resenha)
const livros = [
  { id: "torto-arado", titulo: "Torto Arado", autor: "Itamar Vieira Junior", capa: "capa-1" },
  { id: "tudo-e-rio", titulo: "Tudo é Rio", autor: "Carla Madeira", capa: "capa-2" },
  { id: "addie-larue", titulo: "A Vida Invisível de Addie LaRue", autor: "V. E. Schwab", capa: "capa-3" },
  { id: "quarto-de-despejo", titulo: "Quarto de Despejo", autor: "Carolina Maria de Jesus", capa: "capa-4" },
  { id: "avesso-da-pele", titulo: "O Avesso da Pele", autor: "Jeferson Tenório", capa: "capa-5" },
  { id: "cem-anos-de-solidao", titulo: "Cem Anos de Solidão", autor: "Gabriel García Márquez", capa: "capa-6" },
];

// Guarda o id da resenha que está sendo editada (null = cadastrando uma nova)
let idEmEdicao = null;

// Limite de caracteres do texto da resenha (o mesmo do maxlength no HTML)
const LIMITE_TEXTO = 420;


/* ---------- 2. FUNÇÕES DE APOIO: DADOS ---------- */

// Cria um id que ainda não existe na lista (maior id + 1)
function gerarId() {
  let maiorId = 0;

  for (const resenha of resenhas) {
    if (resenha.id > maiorId) {
      maiorId = resenha.id;
    }
  }

  return maiorId + 1;
}

// Encontra uma resenha pelo id (aceita número ou texto, ex.: vindo de data-id)
function buscarResenhaPorId(id) {
  return resenhas.find((resenha) => resenha.id === Number(id));
}

// Encontra um livro do catálogo pelo id (ex.: "torto-arado")
function buscarLivro(id) {
  return livros.find((livro) => livro.id === id);
}

// Encontra um livro do catálogo pelo título (usado ao editar uma resenha)
function buscarLivroPorTitulo(titulo) {
  return livros.find((livro) => livro.titulo === titulo);
}

// Data de hoje no formato "2025-03-12" (usando o horário local, não o UTC)
function dataDeHoje() {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${hoje.getFullYear()}-${mes}-${dia}`;
}


/* ---------- 3. FUNÇÕES DE APOIO: FORMATAÇÃO ---------- */

// 4 → <p class="estrelas" aria-label="Avaliação: 4 de 5 estrelas">★★★★☆</p>
function renderizarEstrelas(nota) {
  const cheias = "★".repeat(nota);
  const vazias = "☆".repeat(5 - nota);

  return `<p class="estrelas" aria-label="Avaliação: ${nota} de 5 estrelas">${cheias}${vazias}</p>`;
}

// "2025-03-12" → "12 de março de 2025"
function formatarData(data) {
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];

  // Separa a data manualmente para evitar erro de fuso horário
  const [ano, mes, dia] = data.split("-");

  return `${Number(dia)} de ${meses[Number(mes) - 1]} de ${ano}`;
}

// Impede que o texto digitado pelo usuário seja lido como HTML
function escaparHTML(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// "Solidão" → "solidao" (usado na pesquisa, ignora acentos e maiúsculas)
function normalizarTexto(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}


/* ---------- 4. FUNÇÕES DE APOIO: TELA ---------- */

// Mostra uma mensagem rápida no canto da tela (ex.: "Resenha excluída")
function mostrarAviso(mensagem) {
  let aviso = document.querySelector(".aviso");

  // Cria o elemento só na primeira vez
  if (!aviso) {
    aviso = document.createElement("div");
    aviso.className = "aviso";
    aviso.setAttribute("role", "status");
    aviso.setAttribute("aria-live", "polite");
    document.body.appendChild(aviso);
  }

  aviso.textContent = mensagem;
  aviso.classList.add("visivel");

  // Reinicia o tempo caso outro aviso apareça antes de sumir
  clearTimeout(aviso.temporizador);
  aviso.temporizador = setTimeout(() => {
    aviso.classList.remove("visivel");
  }, 3000);
}

// Gera o HTML de um card de avaliação
function criarCardResenha(resenha) {
  const livro = escaparHTML(resenha.livro);
  const autor = escaparHTML(resenha.autor);

  return `
    <article class="card card-avaliacao" data-id="${resenha.id}">
      <figure class="capa-livro">
        <div class="capa ${escaparHTML(resenha.capa)}" role="img" aria-label="Capa do livro ${livro}">
          <span class="capa-marca" aria-hidden="true">R</span>
          <strong class="capa-titulo">${livro}</strong>
          <small class="capa-autor">${autor}</small>
        </div>
      </figure>
      <div class="avaliacao-info">
        <time class="data-avaliacao" datetime="${escaparHTML(resenha.data)}">
          Avaliado em ${formatarData(resenha.data)}
        </time>
        <h3 class="livro-titulo">${livro}</h3>
        <p class="livro-autor">${autor}</p>
        ${renderizarEstrelas(resenha.nota)}
        <blockquote class="resenha-texto">“${escaparHTML(resenha.texto)}”</blockquote>
        <div class="avaliacao-acoes">
          <button class="botao-texto" type="button" data-acao="detalhes" aria-label="Ver detalhes da resenha de ${livro}">
            Ver detalhes →
          </button>
          <button class="botao-texto" type="button" data-acao="editar" aria-label="Editar a resenha de ${livro}">
            Editar
          </button>
          <button class="botao-texto botao-perigo" type="button" data-acao="excluir" aria-label="Excluir a resenha de ${livro}">
            Excluir
          </button>
        </div>
      </div>
    </article>
  `;
}

// Mostra uma mensagem no lugar da lista quando não há cards
function mostrarListaVazia(mensagem) {
  const container = document.getElementById("lista-resenhas");

  container.innerHTML = `<p class="lista-vazia">${escaparHTML(mensagem)}</p>`;
}

// Calcula os números do topo sempre a partir de TODAS as resenhas
function atualizarEstatisticas() {
  const total = resenhas.length;
  let media = "–";
  let anoMaisLido = "–";

  if (total > 0) {
    // Média das notas, com uma casa decimal e vírgula (ex.: 4,7)
    let soma = 0;
    for (const resenha of resenhas) {
      soma += resenha.nota;
    }
    media = (soma / total).toFixed(1).replace(".", ",");

    // Conta quantas avaliações existem em cada ano
    const porAno = {};
    for (const resenha of resenhas) {
      const ano = resenha.data.slice(0, 4);
      porAno[ano] = (porAno[ano] || 0) + 1;
    }

    // Escolhe o ano com mais avaliações (no empate, o mais recente)
    let maiorQuantidade = 0;
    for (const ano in porAno) {
      const empateMaisRecente = porAno[ano] === maiorQuantidade && ano > anoMaisLido;

      if (porAno[ano] > maiorQuantidade || empateMaisRecente) {
        maiorQuantidade = porAno[ano];
        anoMaisLido = ano;
      }
    }
  }

  document.getElementById("total-avaliados").textContent = total;
  document.getElementById("media-notas").textContent = media;
  document.getElementById("ano-mais-lido").textContent = anoMaisLido;
}


/* ---------- 5. FUNÇÕES OBRIGATÓRIAS: LISTAR, PESQUISAR, FILTRAR, ORDENAR ---------- */

// Monta os cards na tela
function listarResenhas(lista) {
  const container = document.getElementById("lista-resenhas");

  if (lista.length === 0) {
    // Diferencia "não tem nada cadastrado" de "a busca não achou nada"
    if (resenhas.length === 0) {
      mostrarListaVazia("Você ainda não avaliou nenhum livro.");
    } else {
      mostrarListaVazia("Nenhuma resenha encontrada. Tente outra busca ou outra nota.");
    }
    return;
  }

  let html = "";
  for (const resenha of lista) {
    html += criarCardResenha(resenha);
  }
  container.innerHTML = html;
}

// Busca por título, autor ou texto (ignora acentos e maiúsculas)
function pesquisarResenhas(lista, termo) {
  const busca = normalizarTexto(termo);

  if (busca === "") {
    return lista;
  }

  return lista.filter((resenha) => {
    const conteudo = normalizarTexto(`${resenha.livro} ${resenha.autor} ${resenha.texto}`);
    return conteudo.includes(busca);
  });
}

// Mantém só as resenhas com a nota escolhida ("todas" não filtra)
function filtrarResenhas(lista, nota) {
  if (nota === "todas") {
    return lista;
  }

  return lista.filter((resenha) => resenha.nota === Number(nota));
}

// Ordena uma CÓPIA da lista, sem alterar a ordem original do array
function ordenarResenhas(lista, criterio) {
  const copia = [...lista];

  // Desempate padrão: mais recente primeiro
  const porDataDesc = (a, b) => b.data.localeCompare(a.data);

  if (criterio === "recentes") {
    copia.sort(porDataDesc);
  } else if (criterio === "antigas") {
    copia.sort((a, b) => a.data.localeCompare(b.data));
  } else if (criterio === "maior-nota") {
    copia.sort((a, b) => b.nota - a.nota || porDataDesc(a, b));
  } else if (criterio === "menor-nota") {
    copia.sort((a, b) => a.nota - b.nota || porDataDesc(a, b));
  } else if (criterio === "titulo") {
    copia.sort((a, b) => a.livro.localeCompare(b.livro, "pt-BR"));
  }

  return copia;
}


/* ---------- 6. FUNÇÕES OBRIGATÓRIAS: VISUALIZAR DETALHES E EXCLUIR ---------- */

// Abre a janela com todas as informações da resenha
function visualizarResenha(id) {
  const resenha = buscarResenhaPorId(id);

  if (!resenha) {
    mostrarAviso("Resenha não encontrada.");
    return;
  }

  const livro = escaparHTML(resenha.livro);
  const autor = escaparHTML(resenha.autor);

  document.getElementById("detalhes-titulo").textContent = resenha.livro;
  document.getElementById("detalhes-conteudo").innerHTML = `
    <div class="detalhes-corpo">
      <figure class="capa-livro">
        <div class="capa ${escaparHTML(resenha.capa)}" role="img" aria-label="Capa do livro ${livro}">
          <span class="capa-marca" aria-hidden="true">R</span>
          <strong class="capa-titulo">${livro}</strong>
          <small class="capa-autor">${autor}</small>
        </div>
      </figure>
      <dl class="detalhes-lista">
        <div>
          <dt>Autor</dt>
          <dd>${autor}</dd>
        </div>
        <div>
          <dt>Sua nota</dt>
          <dd>${renderizarEstrelas(resenha.nota)}</dd>
        </div>
        <div>
          <dt>Avaliado em</dt>
          <dd><time datetime="${escaparHTML(resenha.data)}">${formatarData(resenha.data)}</time></dd>
        </div>
      </dl>
    </div>
    <blockquote class="resenha-texto detalhes-texto">“${escaparHTML(resenha.texto)}”</blockquote>
  `;

  // showModal() deixa o resto da página inacessível até fechar
  document.getElementById("janela-detalhes").showModal();
}

// Fecha a janela de detalhes (o navegador devolve o foco ao botão que a abriu)
function fecharDetalhes() {
  document.getElementById("janela-detalhes").close();
}

// Pede confirmação e remove a resenha do array
function excluirResenha(id) {
  const resenha = buscarResenhaPorId(id);

  if (!resenha) {
    mostrarAviso("Resenha não encontrada.");
    return;
  }

  const confirmou = confirm(`Excluir a resenha de "${resenha.livro}"?\nEssa ação não pode ser desfeita.`);
  if (!confirmou) {
    return;
  }

  // Mantém todas as resenhas, menos a excluída
  resenhas = resenhas.filter((item) => item.id !== resenha.id);

  atualizarTela();
  mostrarAviso("Resenha excluída.");
}

// Um único "ouvinte" na lista: descobre qual botão foi clicado e em qual card
function tratarCliqueCard(evento) {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) {
    return;
  }

  const id = botao.closest("[data-id]").dataset.id;
  const acao = botao.dataset.acao;

  if (acao === "detalhes") {
    visualizarResenha(id);
  } else if (acao === "editar") {
    editarResenha(id);
  } else if (acao === "excluir") {
    excluirResenha(id);
  }
}


/* ---------- 7. FUNÇÕES OBRIGATÓRIAS: CADASTRAR E EDITAR ---------- */

// Adiciona uma resenha nova ao array (os dados já chegam validados)
function cadastrarResenha(dados) {
  const livro = buscarLivro(dados.livroId);

  resenhas.push({
    id: gerarId(),
    livro: livro.titulo,
    autor: livro.autor,
    capa: livro.capa,
    nota: dados.nota,
    texto: dados.texto,
    data: dataDeHoje(),
  });
}

// Abre o formulário já preenchido com a resenha escolhida
function editarResenha(id) {
  const resenha = buscarResenhaPorId(id);

  if (!resenha) {
    mostrarAviso("Resenha não encontrada.");
    return;
  }

  abrirFormulario(resenha);
}

// Grava as alterações de uma resenha que já existe (a data original é mantida)
function atualizarResenha(id, dados) {
  const resenha = buscarResenhaPorId(id);
  const livro = buscarLivro(dados.livroId);

  resenha.livro = livro.titulo;
  resenha.autor = livro.autor;
  resenha.capa = livro.capa;
  resenha.nota = dados.nota;
  resenha.texto = dados.texto;
}

// Envio do formulário: valida e decide entre cadastrar ou atualizar
function enviarFormulario(evento) {
  // Impede o envio padrão, que recarregaria a página e apagaria os dados
  evento.preventDefault();

  const dados = lerFormulario();
  const erros = validarResenha(dados);

  limparErros();

  if (Object.keys(erros).length > 0) {
    for (const campo in erros) {
      mostrarErro(campo, erros[campo]);
    }
    return;
  }

  const estavaEditando = idEmEdicao !== null;

  if (estavaEditando) {
    atualizarResenha(idEmEdicao, dados);
  } else {
    cadastrarResenha(dados);
  }

  fecharFormulario();
  atualizarTela();
  mostrarAviso(estavaEditando ? "Resenha atualizada." : "Resenha publicada.");
}


/* ---------- 8. FUNÇÕES DE APOIO: FORMULÁRIO ---------- */

// Cria as opções do campo "Qual livro você leu?" a partir do catálogo
function preencherSelectLivros() {
  const select = document.getElementById("campo-livro");

  for (const livro of livros) {
    const opcao = document.createElement("option");
    opcao.value = livro.id;
    opcao.textContent = `${livro.titulo} — ${livro.autor}`;
    select.appendChild(opcao);
  }
}

// Abre a janela vazia (cadastrar) ou preenchida (editar)
function abrirFormulario(resenha) {
  limparFormulario();

  if (resenha) {
    idEmEdicao = resenha.id;
    preencherFormulario(resenha);
    document.getElementById("formulario-titulo").textContent = "Editar resenha";
    document.getElementById("botao-salvar").textContent = "Salvar alterações";
  } else {
    document.getElementById("formulario-titulo").textContent = "Nova resenha";
    document.getElementById("botao-salvar").textContent = "Publicar resenha →";
  }

  document.getElementById("janela-formulario").showModal();
  document.getElementById("campo-livro").focus();
}

// Fecha a janela (a limpeza acontece no evento "close", que também cobre o Esc)
function fecharFormulario() {
  document.getElementById("janela-formulario").close();
}

// Coloca os dados de uma resenha nos campos
function preencherFormulario(resenha) {
  const livro = buscarLivroPorTitulo(resenha.livro);
  const formulario = document.getElementById("formulario-resenha");

  document.getElementById("campo-livro").value = livro ? livro.id : "";
  formulario.querySelector(`input[name="nota"][value="${resenha.nota}"]`).checked = true;
  document.getElementById("campo-texto").value = resenha.texto;

  atualizarContador();
  destacarNota();
}

// Zera os campos, os erros e o modo de edição
function limparFormulario() {
  document.getElementById("formulario-resenha").reset();
  idEmEdicao = null;

  limparErros();
  atualizarContador();
  destacarNota();
}

// Lê os valores atuais do formulário
function lerFormulario() {
  const notaMarcada = document.querySelector('#formulario-resenha input[name="nota"]:checked');

  return {
    livroId: document.getElementById("campo-livro").value,
    nota: notaMarcada ? Number(notaMarcada.value) : 0,
    texto: document.getElementById("campo-texto").value.trim(),
  };
}

// Confere os dados e devolve os erros encontrados, ex.: { livro: "...", nota: "..." }
function validarResenha(dados) {
  const erros = {};

  if (!buscarLivro(dados.livroId)) {
    erros.livro = "Escolha o livro que você leu.";
  } else {
    // Um livro só pode ter uma resenha (a própria resenha em edição não conta)
    const livro = buscarLivro(dados.livroId);
    const jaAvaliado = resenhas.some(
      (resenha) => resenha.livro === livro.titulo && resenha.id !== idEmEdicao
    );

    if (jaAvaliado) {
      erros.livro = "Você já avaliou este livro. Use o botão Editar na resenha dele.";
    }
  }

  if (dados.nota < 1 || dados.nota > 5) {
    erros.nota = "Escolha uma nota de 1 a 5 estrelas.";
  }

  if (dados.texto === "") {
    erros.texto = "Escreva um pouco sobre a sua leitura.";
  } else if (dados.texto.length > LIMITE_TEXTO) {
    erros.texto = `O texto pode ter no máximo ${LIMITE_TEXTO} caracteres.`;
  }

  return erros;
}

// Mostra a mensagem de erro embaixo do campo e marca o campo como inválido
function mostrarErro(campo, mensagem) {
  const campos = {
    livro: "campo-livro",
    nota: "campo-nota",
    texto: "campo-texto",
  };

  document.getElementById(`erro-${campo}`).textContent = mensagem;
  document.getElementById(campos[campo]).setAttribute("aria-invalid", "true");
}

// Remove todas as mensagens de erro do formulário
function limparErros() {
  const formulario = document.getElementById("formulario-resenha");

  for (const erro of formulario.querySelectorAll(".campo-erro")) {
    erro.textContent = "";
  }
  for (const campo of formulario.querySelectorAll("[aria-invalid]")) {
    campo.removeAttribute("aria-invalid");
  }
}

// Mostra quantos caracteres já foram digitados, ex.: "123/420"
function atualizarContador() {
  const tamanho = document.getElementById("campo-texto").value.length;
  const contador = document.getElementById("contador-texto");

  contador.textContent = `${tamanho}/${LIMITE_TEXTO}`;
  contador.classList.toggle("contador-limite", tamanho >= LIMITE_TEXTO - 20);
}

// Destaca visualmente a nota escolhida
function destacarNota() {
  for (const opcao of document.querySelectorAll("#formulario-resenha .nota")) {
    const marcada = opcao.querySelector("input").checked;
    opcao.classList.toggle("selecionada", marcada);
  }
}


/* ---------- 9. CONTROLE DA TELA ---------- */

// Aplica pesquisa → filtro → ordem e redesenha a lista.
// Deve ser chamada depois de qualquer mudança nas resenhas.
function atualizarTela() {
  const termo = document.getElementById("pesquisa-resenhas").value;
  const nota = document.getElementById("filtro-nota").value;
  const criterio = document.getElementById("ordem-resenhas").value;

  let resultado = pesquisarResenhas(resenhas, termo);
  resultado = filtrarResenhas(resultado, nota);
  resultado = ordenarResenhas(resultado, criterio);

  listarResenhas(resultado);
  atualizarEstatisticas();
}

// Liga os campos da tela às funções
function configurarEventos() {
  // "input" atualiza a cada letra digitada
  document.getElementById("pesquisa-resenhas").addEventListener("input", atualizarTela);
  document.getElementById("filtro-nota").addEventListener("change", atualizarTela);
  document.getElementById("ordem-resenhas").addEventListener("change", atualizarTela);

  // Botões dentro dos cards (Ver detalhes, Excluir)
  document.getElementById("lista-resenhas").addEventListener("click", tratarCliqueCard);

  // Janela de detalhes: botão X e clique no fundo escuro fecham (Esc já fecha sozinho)
  const janelaDetalhes = document.getElementById("janela-detalhes");
  document.getElementById("fechar-detalhes").addEventListener("click", fecharDetalhes);
  janelaDetalhes.addEventListener("click", (evento) => {
    if (evento.target === janelaDetalhes) {
      fecharDetalhes();
    }
  });

  // Botões "Nova resenha" e "+ Avaliar um livro": abrem a janela em vez de trocar de página
  for (const botao of document.querySelectorAll("[data-abrir-formulario]")) {
    botao.addEventListener("click", (evento) => {
      evento.preventDefault();
      abrirFormulario();
    });
  }

  // Janela do formulário
  const formulario = document.getElementById("formulario-resenha");
  formulario.addEventListener("submit", enviarFormulario);
  formulario.addEventListener("change", destacarNota);
  document.getElementById("campo-texto").addEventListener("input", atualizarContador);
  document.getElementById("fechar-formulario").addEventListener("click", fecharFormulario);
  document.getElementById("cancelar-formulario").addEventListener("click", fecharFormulario);
  // Fechou de qualquer jeito (X, Cancelar, Esc ou salvando): limpa tudo
  document.getElementById("janela-formulario").addEventListener("close", limparFormulario);
}

// Ponto de partida: roda quando a página carrega
function iniciar() {
  // Só roda na página que tem a lista de resenhas
  if (!document.getElementById("lista-resenhas")) {
    return;
  }

  preencherSelectLivros();
  configurarEventos();
  atualizarTela();
}

iniciar();
