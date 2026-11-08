/* ==========================================================
   RESENLI — Resenhas (página Minhas avaliações)
   Os dados iniciais ficam em dados.js e as funções de
   formatação em utils.js. O que é salvo vem de persistencia.js.
   ========================================================== */


/* ---------- 1. ESTADO DA PÁGINA ---------- */

// Guarda o id da resenha que está sendo editada (null = cadastrando uma nova)
let idEmEdicao = null;

// Quantas resenhas aparecem de cada vez (o resto vem em "Mostrar mais")
const POR_PAGINA = 5;
let quantidadeVisivel = POR_PAGINA;

// Como o formulário estava ao abrir, para saber se há algo não salvo
let estadoInicialFormulario = "";

// Busca no Google Books dentro do formulário "Nova resenha"
let resultadosDoFormulario = [];
let controleBuscaFormulario = null;
let numeroBuscaFormulario = 0; // resposta de uma busca que já ficou para trás é ignorada
let semCotaNoFormulario = false; // depois de um erro de cota, não insiste a cada letra digitada

// Livro do Google escolhido na busca e ainda não guardado na conta.
// Só é guardado quando a resenha é salva (escolher e desistir não deixa lixo no armazenamento).
let livrosEscolhidosNoGoogle = {};

// Espera a pessoa parar de digitar antes de chamar a API
const buscarNoFormularioAtrasado = atrasar((termo) => buscarLivroNoFormulario(termo), 600);


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

// Data de hoje no formato "2025-03-12" (usando o horário local, não o UTC)
function dataDeHoje() {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${hoje.getFullYear()}-${mes}-${dia}`;
}


/* ---------- 3. FUNÇÕES DE APOIO: TELA ---------- */

// Gera o HTML de um card de avaliação
function criarCardResenha(resenha) {
  const livro = escaparHTML(resenha.livro);
  const autor = escaparHTML(resenha.autor);

  // O título leva para a página do livro (quando ele está no catálogo)
  const doCatalogo = buscarLivro(resenha.livroId);
  const titulo = doCatalogo ? `<a class="link-titulo" href="livro.html?id=${doCatalogo.id}">${livro}</a>` : livro;

  return `
    <article class="card card-avaliacao" data-id="${resenha.id}">
      ${criarCapa(livroDaResenha(resenha))}
      <div class="avaliacao-info">
        <time class="data-avaliacao" datetime="${escaparHTML(resenha.data)}">
          Avaliado em ${formatarData(resenha.data)}
        </time>
        <h3 class="livro-titulo">${titulo}</h3>
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


/* ---------- 4. FUNÇÕES OBRIGATÓRIAS: LISTAR, PESQUISAR, FILTRAR, ORDENAR ---------- */

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
    atualizarBotaoMostrarMais(0);
    return;
  }

  let html = "";
  for (const resenha of lista.slice(0, quantidadeVisivel)) {
    html += criarCardResenha(resenha);
  }
  container.innerHTML = html;

  atualizarBotaoMostrarMais(lista.length);
}

// Mostra o botão "Mostrar mais" só quando ainda há resenhas escondidas
function atualizarBotaoMostrarMais(total) {
  const botao = document.getElementById("mostrar-mais");
  const restantes = total - quantidadeVisivel;

  botao.hidden = restantes <= 0;
  botao.textContent = `Mostrar mais (${restantes} ${plural(restantes, "restante", "restantes")})`;
}

// Libera mais um bloco de resenhas e leva o foco para a primeira delas
function mostrarMais() {
  const jaVisiveis = quantidadeVisivel;
  quantidadeVisivel += POR_PAGINA;
  atualizarTela();

  const primeiraNova = document.querySelectorAll("#lista-resenhas .card-avaliacao")[jaVisiveis];
  if (primeiraNova) {
    primeiraNova.querySelector("button").focus();
  }
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


/* ---------- 5. FUNÇÕES OBRIGATÓRIAS: VISUALIZAR DETALHES E EXCLUIR ---------- */

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
      ${criarCapa(livroDaResenha(resenha))}
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

// Remove a resenha do array e oferece "Desfazer" (em vez de perguntar antes)
function excluirResenha(id) {
  const posicao = resenhas.findIndex((item) => item.id === Number(id));

  if (posicao === -1) {
    mostrarAviso("Resenha não encontrada.");
    return;
  }

  // splice tira a resenha e devolve o que foi removido
  const [removida] = resenhas.splice(posicao, 1);
  salvarDados();

  atualizarTela();
  mostrarAviso(`Resenha de "${removida.livro}" excluída.`, {
    rotulo: "Desfazer",
    aoClicar: () => desfazerExclusao(removida, posicao),
  });
}

// Devolve a resenha excluída para o lugar onde estava
function desfazerExclusao(resenha, posicao) {
  // Se o livro foi avaliado de novo nesse meio tempo, restaurar criaria duas resenhas do mesmo livro
  if (resenhas.some((item) => mesmoLivro(item, resenha))) {
    mostrarAviso(`Você já avaliou "${resenha.livro}" de novo, então não dá para restaurar a antiga.`);
    return;
  }

  // O id da resenha excluída pode ter sido reaproveitado por uma nova
  if (resenhas.some((item) => item.id === resenha.id)) {
    resenha.id = gerarId();
  }

  resenhas.splice(Math.min(posicao, resenhas.length), 0, resenha);
  salvarDados();

  atualizarTela();
  mostrarAviso("Resenha restaurada.");
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


/* ---------- 6. FUNÇÕES OBRIGATÓRIAS: CADASTRAR E EDITAR ---------- */

// Adiciona uma resenha nova ao array (os dados já chegam validados)
function cadastrarResenha(dados) {
  const livro = buscarLivro(dados.livroId);

  resenhas.push({
    id: gerarId(),
    livroId: livro.id,
    livro: livro.titulo,
    autor: livro.autor,
    capa: livro.capa,
    nota: dados.nota,
    texto: dados.texto,
    data: dataDeHoje(),
  });

  // Avaliar significa que o livro foi lido: ele sai da lista de leitura sozinho
  definirStatus(livro.id, "lido");
  salvarDados();
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

  resenha.livroId = livro.id;
  resenha.livro = livro.titulo;
  resenha.autor = livro.autor;
  resenha.capa = livro.capa;
  resenha.nota = dados.nota;
  resenha.texto = dados.texto;

  definirStatus(livro.id, "lido");
  salvarDados();
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

  // Livro escolhido na busca do Google: é guardado na conta antes de a resenha apontar para ele
  if (!buscarLivro(dados.livroId) && !registrarLivroExterno(livrosEscolhidosNoGoogle[dados.livroId])) {
    mostrarErro("livro", `Você já guardou ${MAX_LIVROS_EXTERNOS} livros do Google Books. Remova algum da lista para adicionar outro.`);
    return;
  }

  const estavaEditando = idEmEdicao !== null;
  const saiuDaLista = minhaLista.includes(dados.livroId);

  if (estavaEditando) {
    atualizarResenha(idEmEdicao, dados);
  } else {
    cadastrarResenha(dados);
  }

  fecharFormulario();
  atualizarTela();
  atualizarContadorLista();

  const mensagem = estavaEditando ? "Resenha atualizada." : "Resenha publicada.";
  mostrarAviso(saiuDaLista ? `${mensagem} O livro saiu da sua lista de leitura.` : mensagem);
}


/* ---------- 7. FUNÇÕES DE APOIO: FORMULÁRIO ---------- */

// O livro de um id, incluindo o que acabou de ser escolhido na busca do Google (ainda não guardado)
function livroDoFormulario(id) {
  if (buscarLivro(id)) {
    return buscarLivro(id);
  }

  return Object.prototype.hasOwnProperty.call(livrosEscolhidosNoGoogle, id) ? livrosEscolhidosNoGoogle[id] : undefined;
}

function criarOpcaoDeLivro(livro, temporaria) {
  const opcao = document.createElement("option");

  opcao.value = livro.id;
  opcao.textContent = `${livro.titulo} — ${livro.autor}`;
  if (temporaria) {
    opcao.dataset.temporaria = "sim";
  }

  return opcao;
}

// Cria as opções do campo "Qual livro você leu?": catálogo fixo + livros do Google Books guardados
// (+ o escolhido agora na busca, se ainda não estiver guardado).
// Pode ser chamada de novo (ex.: outra aba guardou um livro): mantém só a primeira opção ("Selecione...").
function preencherSelectLivros() {
  const select = document.getElementById("campo-livro");
  const escolhido = select.value;

  while (select.options.length > 1) {
    select.remove(1);
  }

  for (const livro of todosOsLivros()) {
    select.appendChild(criarOpcaoDeLivro(livro, false));
  }
  for (const livro of Object.values(livrosEscolhidosNoGoogle)) {
    select.appendChild(criarOpcaoDeLivro(livro, true));
  }

  select.value = escolhido;
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

  // Guarda como o formulário está agora; qualquer diferença depois disso é "não salvo"
  estadoInicialFormulario = capturarEstadoFormulario();

  document.getElementById("janela-formulario").showModal();
  document.getElementById("campo-livro").focus();
}

// Fecha a janela (a limpeza acontece no evento "close", que também cobre o Esc)
function fecharFormulario() {
  document.getElementById("janela-formulario").close();
}

// Os valores dos campos em um texto só, para comparar antes e depois
function capturarEstadoFormulario() {
  return JSON.stringify(lerFormulario());
}

function formularioAlterado() {
  return capturarEstadoFormulario() !== estadoInicialFormulario;
}

// Pergunta antes de descartar o que foi digitado. Devolve true se pode fechar.
function confirmarDescarte() {
  if (!formularioAlterado()) {
    return true;
  }

  return confirm("Descartar o que você escreveu? As alterações não salvas serão perdidas.");
}

// Fechamento pedido pela pessoa (X ou Cancelar). Salvar usa fecharFormulario() direto.
function tentarFecharFormulario() {
  if (confirmarDescarte()) {
    fecharFormulario();
  }
}

// Coloca os dados de uma resenha nos campos
function preencherFormulario(resenha) {
  const livro = buscarLivro(resenha.livroId);
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

  // Esquece a busca e o livro escolhido nela (as opções temporárias saem do seletor)
  reiniciarBuscaDoFormulario();
  preencherSelectLivros();

  limparErros();
  atualizarContador();
  destacarNota();
  estadoInicialFormulario = capturarEstadoFormulario();
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

  if (!livroDoFormulario(dados.livroId)) {
    erros.livro = "Escolha o livro que você leu.";
  } else {
    // Um livro só pode ter uma resenha (a própria resenha em edição não conta)
    const livro = livroDoFormulario(dados.livroId);
    const jaAvaliado = resenhas.some(
      (resenha) => mesmoLivro(resenha, { livroId: livro.id, livro: livro.titulo }) && resenha.id !== idEmEdicao
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


/* ---------- 7B. FORMULÁRIO: BUSCA NO GOOGLE BOOKS ---------- */

function mostrarStatusDaBusca(texto, erro = false) {
  const status = document.getElementById("status-busca-livro");

  status.textContent = texto;
  status.classList.toggle("google-status-erro", erro);
}

// Cancela a busca em andamento; qualquer resposta dela passa a ser ignorada
function cancelarBuscaDoFormulario() {
  numeroBuscaFormulario += 1;
  buscarNoFormularioAtrasado.cancelar();

  if (controleBuscaFormulario) {
    controleBuscaFormulario.abort();
    controleBuscaFormulario = null;
  }
}

// Volta a busca ao começo: campo vazio, sem resultados, sem mensagens e sem livro escolhido
function reiniciarBuscaDoFormulario() {
  cancelarBuscaDoFormulario();

  resultadosDoFormulario = [];
  livrosEscolhidosNoGoogle = {};
  semCotaNoFormulario = false;

  document.getElementById("campo-busca-livro").value = "";
  document.getElementById("resultados-livro").innerHTML = "";
  mostrarStatusDaBusca("");
}

// Um resultado da busca: miniatura da capa, título, autor, ano e páginas
function criarItemDeResultado(livro) {
  const detalhes = [livro.autor, livro.ano || "", livro.paginas ? `${livro.paginas} pág.` : ""].filter(Boolean).join(" · ");
  const imagem = livro.capaUrl
    ? `<img class="capa-imagem" src="${escaparHTML(livro.capaUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
    : "";

  return `
    <li>
      <button class="resultado-livro" type="button" data-google-id="${escaparHTML(livro.id)}">
        <span class="resultado-capa ${escaparHTML(livro.capa)}" aria-hidden="true">${imagem}</span>
        <span class="resultado-info">
          <strong>${escaparHTML(livro.titulo)}</strong>
          <small>${escaparHTML(detalhes)}</small>
        </span>
      </button>
    </li>
  `;
}

function renderizarResultadosDoFormulario() {
  document.getElementById("resultados-livro").innerHTML = resultadosDoFormulario.map(criarItemDeResultado).join("");
}

// Faz a busca de verdade e mostra os resultados
async function buscarLivroNoFormulario(termo) {
  const consulta = termo.trim();

  cancelarBuscaDoFormulario();
  const controle = new AbortController();
  controleBuscaFormulario = controle;
  const numero = numeroBuscaFormulario;

  mostrarStatusDaBusca("Buscando no Google Books…");

  try {
    const resultado = await buscarLivrosNoGoogle(consulta, { sinal: controle.signal });

    // Chegou atrasado: a pessoa já mudou o que digitou
    if (numero !== numeroBuscaFormulario) {
      return;
    }

    semCotaNoFormulario = false;

    // Livro que já está no catálogo da casa fica no seletor: não precisa aparecer de novo aqui
    resultadosDoFormulario = resultado.livros.filter(
      (livro) => !livros.some((item) => normalizarTexto(item.titulo) === normalizarTexto(livro.titulo))
    );
    renderizarResultadosDoFormulario();

    const quantidade = resultadosDoFormulario.length;
    mostrarStatusDaBusca(
      quantidade === 0
        ? `Nenhum livro novo encontrado no Google Books para “${consulta}”.`
        : `${quantidade} ${plural(quantidade, "livro encontrado", "livros encontrados")}. Escolha o que você leu.`
    );
  } catch (erro) {
    if (ehCancelamento(erro) || numero !== numeroBuscaFormulario) {
      return;
    }

    semCotaNoFormulario = erro instanceof ErroGoogleBooks && erro.tipo === "cota";
    resultadosDoFormulario = [];
    renderizarResultadosDoFormulario();
    mostrarStatusDaBusca(mensagemDoErroGoogle(erro), true);
  }
}

// Decide se e quando buscar depois de a pessoa mexer no campo.
// imediato = true (Enter ou botão "Buscar"): não espera a pausa da digitação.
function agendarBuscaDoFormulario(termo, imediato) {
  const consulta = termo.trim();

  cancelarBuscaDoFormulario();

  if (consulta.length < GB_MINIMO_TERMO) {
    resultadosDoFormulario = [];
    renderizarResultadosDoFormulario();
    mostrarStatusDaBusca(consulta === "" ? "" : `Digite pelo menos ${GB_MINIMO_TERMO} letras para buscar.`);
    return;
  }

  if (imediato) {
    buscarLivroNoFormulario(consulta);
    return;
  }

  // Digitando: se a cota já acabou, avisa em vez de tentar de novo a cada letra
  if (semCotaNoFormulario) {
    mostrarStatusDaBusca(mensagemDoErroGoogle(new ErroGoogleBooks("cota")), true);
    return;
  }

  mostrarStatusDaBusca("Buscando no Google Books…");
  buscarNoFormularioAtrasado(consulta);
}

// A pessoa clicou num resultado: o livro vira a opção escolhida no seletor "Qual livro você leu?"
function escolherLivroDoGoogle(id) {
  const livro = resultadosDoFormulario.find((item) => item.id === id);
  const select = document.getElementById("campo-livro");

  if (!livro) {
    return;
  }

  // Uma escolha anterior da busca sai do seletor (só pode haver uma)
  for (const opcao of [...select.options]) {
    if (opcao.dataset.temporaria === "sim" && opcao.value !== id) {
      opcao.remove();
    }
  }

  // Se o livro já está guardado na conta, usa a opção que já existe
  livrosEscolhidosNoGoogle = buscarLivro(id) ? {} : { [id]: livro };
  if (![...select.options].some((opcao) => opcao.value === id)) {
    select.appendChild(criarOpcaoDeLivro(livro, true));
  }
  select.value = id;

  // O erro "Escolha o livro" (se estava na tela) não vale mais
  document.getElementById("erro-livro").textContent = "";
  select.removeAttribute("aria-invalid");

  cancelarBuscaDoFormulario();
  resultadosDoFormulario = [];
  renderizarResultadosDoFormulario();
  document.getElementById("campo-busca-livro").value = "";
  mostrarStatusDaBusca(`Livro escolhido: ${livro.titulo}.`);

  // O botão clicado saiu da tela: o foco vai para o seletor, que agora mostra o livro
  select.focus();
}


/* ---------- 8. EXPORTAR ---------- */

// Texto de uma célula do CSV: entre aspas, com aspas internas dobradas.
// Valores que começam com = + - @ ganham um apóstrofo para o Excel não executá-los como fórmula.
function escaparCelulaCSV(valor) {
  let texto = String(valor);

  if (/^[=+\-@\t\r]/.test(texto)) {
    texto = `'${texto}`;
  }

  return `"${texto.replaceAll('"', '""')}"`;
}

// Monta o CSV (separado por ";", que é o que o Excel em português espera)
function gerarCSV(lista) {
  const cabecalho = ["Livro", "Autor", "Nota", "Data da avaliação", "Resenha"];
  const linhas = lista.map((resenha) =>
    [resenha.livro, resenha.autor, resenha.nota, resenha.data, resenha.texto].map(escaparCelulaCSV).join(";")
  );

  return [cabecalho.map(escaparCelulaCSV).join(";"), ...linhas].join("\r\n");
}

// Baixa TODAS as resenhas (não só as que estão na tela depois de pesquisar ou filtrar)
function exportarResenhas() {
  if (resenhas.length === 0) {
    mostrarAviso("Não há avaliações para exportar.");
    return;
  }

  // O ﻿ no começo faz o Excel reconhecer os acentos (UTF-8)
  const csv = "﻿" + gerarCSV(ordenarResenhas(resenhas, "recentes"));
  const arquivo = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const endereco = URL.createObjectURL(arquivo);

  const link = document.createElement("a");
  link.href = endereco;
  link.download = `minhas-avaliacoes-${dataDeHoje()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(endereco), 1000);

  mostrarAviso(`${resenhas.length} ${plural(resenhas.length, "avaliação exportada", "avaliações exportadas")}.`);
}


/* ---------- 9. CONTROLE DA TELA ---------- */

// Aplica pesquisa → filtro → ordem e redesenha a lista.
// Deve ser chamada depois de qualquer mudança nas resenhas.
// Com reiniciarPagina = true, volta a mostrar só o primeiro bloco (usado ao mudar busca, filtro ou ordem).
function atualizarTela(reiniciarPagina = false) {
  if (reiniciarPagina === true) {
    quantidadeVisivel = POR_PAGINA;
  }

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
  // (arrow functions: o evento não pode ser repassado como argumento de atualizarTela)
  document.getElementById("pesquisa-resenhas").addEventListener("input", () => atualizarTela(true));
  document.getElementById("filtro-nota").addEventListener("change", () => atualizarTela(true));
  document.getElementById("ordem-resenhas").addEventListener("change", () => atualizarTela(true));

  document.getElementById("mostrar-mais").addEventListener("click", mostrarMais);
  document.getElementById("exportar-resenhas").addEventListener("click", exportarResenhas);

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

  // Busca de livros no Google Books dentro do formulário
  const campoBusca = document.getElementById("campo-busca-livro");
  campoBusca.addEventListener("input", () => agendarBuscaDoFormulario(campoBusca.value, false));
  campoBusca.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      // Sem isto o Enter enviaria a resenha inteira, em vez de só buscar o livro
      evento.preventDefault();
      agendarBuscaDoFormulario(campoBusca.value, true);
    }
  });
  document.getElementById("botao-busca-livro").addEventListener("click", () => agendarBuscaDoFormulario(campoBusca.value, true));
  document.getElementById("resultados-livro").addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-google-id]");
    if (botao) {
      escolherLivroDoGoogle(botao.dataset.googleId);
    }
  });
  document.getElementById("fechar-formulario").addEventListener("click", tentarFecharFormulario);
  document.getElementById("cancelar-formulario").addEventListener("click", tentarFecharFormulario);

  const janelaFormulario = document.getElementById("janela-formulario");
  // Esc dispara "cancel" antes de fechar: se houver texto não salvo e a pessoa desistir, não fecha
  janelaFormulario.addEventListener("cancel", (evento) => {
    if (!confirmarDescarte()) {
      evento.preventDefault();
    }
  });
  // Fechou de qualquer jeito (X, Cancelar, Esc ou salvando): limpa tudo
  janelaFormulario.addEventListener("close", limparFormulario);
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
  abrirFormularioDaURL();

  // Se outra aba mudar as resenhas, esta lista acompanha
  aoMudarDados.push(() => {
    preencherSelectLivros();
    atualizarTela();
  });
}

// Links de outras páginas: ?avaliar=<livro> abre o formulário com o livro escolhido
// (ou a edição, se ele já foi avaliado)
function abrirFormularioDaURL() {
  const endereco = new URL(window.location.href);
  const livroId = endereco.searchParams.get("avaliar");

  if (!livroId) {
    return;
  }

  // Limpa o parâmetro para um recarregamento não abrir o formulário de novo
  endereco.searchParams.delete("avaliar");
  history.replaceState(null, "", endereco);

  const livro = buscarLivro(livroId);
  if (!livro) {
    return;
  }

  const existente = resenhaDoLivro(livro);
  if (existente) {
    abrirFormulario(existente);
    return;
  }

  abrirFormulario();
  document.getElementById("campo-livro").value = livro.id;
  // O livro escolhido pelo link não conta como "alteração não salva"
  estadoInicialFormulario = capturarEstadoFormulario();
}

iniciar();
