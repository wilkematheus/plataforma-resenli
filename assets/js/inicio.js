/* ==========================================================
   RESENLI — Página Início
   Saudação, data, meta de leitura e feed de resenhas
   ========================================================== */


/* ---------- 1. ESTADO DA PÁGINA ---------- */

// Resenhas exibidas no feed (montadas em montarFeed())
let feed = [];


/* ---------- 2. CABEÇALHO ---------- */

// "Bom dia", "Boa tarde" ou "Boa noite" + o primeiro nome do usuário
function gerarSaudacao() {
  const hora = new Date().getHours();
  const primeiroNome = usuario.nome.split(" ")[0];
  let saudacao = "Boa noite";

  if (hora >= 5 && hora < 12) {
    saudacao = "Bom dia";
  } else if (hora >= 12 && hora < 18) {
    saudacao = "Boa tarde";
  }

  document.getElementById("titulo-inicio").textContent = `${saudacao}, ${primeiroNome}.`;
}

// Troca a data fixa pela data de hoje: "Domingo, 8 de novembro"
function exibirDataAtual() {
  document.getElementById("data-hoje").textContent = formatarDataExtensa(new Date());
}

// Meta de leitura: livros avaliados (resenhas do usuário) de metaLeitura
function atualizarMetaLeitura() {
  const lidos = resenhas.length;
  const porcentagem = (lidos / metaLeitura) * 100;
  let mensagem = "Toda grande leitura começa pela primeira página";

  if (lidos >= metaLeitura) {
    mensagem = "Meta concluída! Que ano de leituras";
  } else if (porcentagem >= 50) {
    mensagem = "Você está indo muito bem";
  } else if (lidos > 0) {
    mensagem = "Bom começo, continue assim";
  }

  const barra = document.getElementById("meta-barra");
  barra.max = metaLeitura;
  // A barra não passa de 100%, mesmo se o usuário ler mais que a meta
  barra.value = Math.min(lidos, metaLeitura);
  barra.textContent = `${lidos} de ${metaLeitura} livros`;

  document.getElementById("meta-lidos").textContent = lidos;
  document.getElementById("meta-total").textContent = `de ${metaLeitura} ${plural(metaLeitura, "livro", "livros")}`;
  document.getElementById("meta-nota").textContent = mensagem;
}


/* ---------- 3. FEED ---------- */

// Prepara as resenhas da comunidade para o feed, da mais nova para a mais antiga
function montarFeed() {
  const agora = Date.now();

  feed = resenhasComunidade.map((item) => ({
    id: item.id,
    autor: item.autor,
    avatar: item.avatar,
    livro: buscarLivro(item.livroId),
    nota: item.nota,
    texto: item.texto,
    data: new Date(agora - item.minutosAtras * 60000),
    etiqueta: item.etiqueta,
    curtidas: item.curtidas,
    comentarios: item.comentarios,
    curtido: false,
    salvo: false,
  }));

  feed.sort((a, b) => b.data - a.data);
}

// Gera o HTML de um card do feed
function criarCardFeed(item) {
  const titulo = escaparHTML(item.livro.titulo);
  const autorLivro = escaparHTML(item.livro.autor);
  const autorResenha = escaparHTML(item.autor);
  const etiqueta = item.etiqueta ? `<span class="etiqueta">${escaparHTML(item.etiqueta)}</span>` : "";

  return `
    <article class="card card-resenha" data-id="${item.id}">
      <header class="resenha-topo">
        <span class="avatar ${item.avatar}" aria-hidden="true">${gerarIniciais(item.autor)}</span>
        <div class="resenha-autor">
          <strong class="resenha-nome">${autorResenha}</strong>
          <time class="resenha-tempo" datetime="${item.data.toISOString()}">${formatarTempoRelativo(item.data)}</time>
        </div>
        ${etiqueta}
      </header>

      <div class="resenha-corpo">
        ${criarCapa(item.livro)}
        <div class="resenha-info">
          ${renderizarEstrelas(item.nota)}
          <h3 class="livro-titulo">${titulo}</h3>
          <p class="livro-autor">${autorLivro}</p>
          <blockquote class="resenha-texto">${escaparHTML(item.texto)}</blockquote>
        </div>
      </div>

      <footer class="resenha-rodape">
        <button class="acao" type="button" data-acao="curtir"
          aria-pressed="${item.curtido}" aria-label="Curtir resenha de ${autorResenha} (${item.curtidas} curtidas)">
          ${item.curtido ? "♥" : "♡"} ${item.curtidas}
        </button>
        <a class="acao" href="#comentarios-${item.id}">
          ${item.comentarios} ${plural(item.comentarios, "comentário", "comentários")}
        </a>
        <button class="acao acao-salvar" type="button" data-acao="salvar"
          aria-pressed="${item.salvo}" aria-label="Salvar resenha de ${autorResenha}">
          ${item.salvo ? "Salvo ✓" : "Salvar"}
        </button>
      </footer>
    </article>
  `;
}

// Monta todos os cards do feed na tela
function renderizarFeed() {
  const container = document.getElementById("feed-resenhas");

  if (feed.length === 0) {
    container.innerHTML = '<p class="lista-vazia">Ainda não há resenhas por aqui.</p>';
    return;
  }

  let html = "";
  for (const item of feed) {
    html += criarCardFeed(item);
  }
  container.innerHTML = html;
}


/* ---------- 4. AÇÕES DOS CARDS ---------- */

// Atualiza só o card que mudou (redesenhar o feed inteiro tiraria o foco do botão)
function atualizarCardFeed(item, acao) {
  const cardAtual = document.querySelector(`#feed-resenhas [data-id="${item.id}"]`);
  const temporario = document.createElement("div");
  temporario.innerHTML = criarCardFeed(item);

  const cardNovo = temporario.firstElementChild;
  cardAtual.replaceWith(cardNovo);

  // Devolve o foco ao mesmo botão, para quem navega pelo teclado
  cardNovo.querySelector(`[data-acao="${acao}"]`).focus();
}

// ♡ 248 → ♥ 249 (e o contrário ao clicar de novo)
function curtirResenha(item) {
  item.curtido = !item.curtido;
  item.curtidas += item.curtido ? 1 : -1;

  atualizarCardFeed(item, "curtir");
}

// "Salvar" → "Salvo ✓" (e o contrário)
function salvarResenha(item) {
  item.salvo = !item.salvo;

  atualizarCardFeed(item, "salvar");
  mostrarAviso(item.salvo ? "Resenha salva." : "Resenha removida dos salvos.");
}

// Um único "ouvinte" no feed: descobre o botão e o card clicados
function tratarCliqueFeed(evento) {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) {
    return;
  }

  const id = botao.closest("[data-id]").dataset.id;
  const item = feed.find((resenha) => resenha.id === id);

  if (botao.dataset.acao === "curtir") {
    curtirResenha(item);
  } else if (botao.dataset.acao === "salvar") {
    salvarResenha(item);
  }
}


/* ---------- 5. INÍCIO ---------- */

function iniciarInicio() {
  gerarSaudacao();
  exibirDataAtual();
  atualizarMetaLeitura();

  montarFeed();
  renderizarFeed();
  document.getElementById("feed-resenhas").addEventListener("click", tratarCliqueFeed);
}

iniciarInicio();
