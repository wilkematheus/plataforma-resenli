/* ==========================================================
   RESENLI — Página Início
   Saudação, data, meta de leitura e feed de resenhas
   ========================================================== */


/* ---------- 1. ESTADO DA PÁGINA ---------- */

// Resenhas exibidas no feed (montadas em montarFeed())
let feed = [];

// Quantas resenhas aparecem em destaque antes de "Ver todas"
const RESENHAS_EM_DESTAQUE = 3;

// Aba aberta ("todas" ou "salvas") e se o feed está expandido
let abaFeed = "todas";
let feedCompleto = false;

// Dá um id único a cada comentário novo
let contadorComentarios = 0;


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

// Meta de leitura: livros com status "lido" de metaLeitura
function atualizarMetaLeitura() {
  const lidos = contarLidos();
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

  feed = resenhasComunidade.map((item) => {
    const curtido = interacoes.curtidas.includes(item.id);

    // Os comentários das outras pessoas são fixos; os da pessoa logada vêm do que ela salvou
    const deOutros = item.comentarios.map((comentario) => ({
      ...comentario,
      data: new Date(agora - comentario.minutosAtras * 60000),
      meu: false,
    }));
    const meus = (interacoes.comentarios[item.id] || []).map((comentario) => ({
      id: comentario.id,
      autor: usuario.nome,
      avatar: "avatar-perfil",
      texto: comentario.texto,
      data: new Date(comentario.data),
      meu: true,
    }));

    return {
      id: item.id,
      autor: item.autor,
      avatar: item.avatar,
      livro: buscarLivro(item.livroId),
      nota: item.nota,
      texto: item.texto,
      data: new Date(agora - item.minutosAtras * 60000),
      etiqueta: item.etiqueta,
      // O número de curtidas já inclui a da própria pessoa, se ela curtiu
      curtidas: item.curtidas + (curtido ? 1 : 0),
      comentarios: [...deOutros, ...meus],
      comentariosAbertos: false,
      curtido,
      salvo: interacoes.salvos.includes(item.id),
    };
  });

  feed.sort((a, b) => b.data - a.data);
}

// Lista de comentários de uma resenha + campo para comentar
function criarHtmlComentarios(item) {
  let lista = "";

  for (const comentario of item.comentarios) {
    // Só os comentários da própria pessoa podem ser excluídos
    const excluir = comentario.meu
      ? `<button class="botao-texto botao-perigo" type="button" data-acao="excluir-comentario"
          data-comentario-id="${comentario.id}" aria-label="Excluir seu comentário">Excluir</button>`
      : "";

    lista += `
      <li class="comentario">
        <span class="avatar avatar-pequeno ${comentario.avatar}" aria-hidden="true">${gerarIniciais(comentario.autor)}</span>
        <div class="comentario-corpo">
          <p class="comentario-cabecalho">
            <strong>${escaparHTML(comentario.autor)}</strong>
            <time datetime="${comentario.data.toISOString()}">${formatarTempoRelativo(comentario.data)}</time>
          </p>
          <p class="comentario-texto">${escaparHTML(comentario.texto)}</p>
          ${excluir}
        </div>
      </li>
    `;
  }

  if (lista === "") {
    lista = '<li class="comentario-vazio">Ninguém comentou ainda. Seja a primeira pessoa!</li>';
  }

  return `
    <section class="comentarios" id="comentarios-${item.id}" aria-label="Comentários" ${item.comentariosAbertos ? "" : "hidden"}>
      <ul class="comentarios-lista">${lista}</ul>
      <form class="comentario-form" novalidate>
        <label class="oculto" for="comentario-${item.id}">Escreva um comentário</label>
        <textarea class="campo-entrada campo-texto" id="comentario-${item.id}" rows="2"
          maxlength="${LIMITE_COMENTARIO}" placeholder="Escreva um comentário..."></textarea>
        <small class="campo-erro" role="alert"></small>
        <button class="botao botao-primario" type="submit">Comentar</button>
      </form>
    </section>
  `;
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
          <h3 class="livro-titulo"><a class="link-titulo" href="livro.html?id=${item.livro.id}">${titulo}</a></h3>
          <p class="livro-autor">${autorLivro}</p>
          <blockquote class="resenha-texto">${escaparHTML(item.texto)}</blockquote>
        </div>
      </div>

      <footer class="resenha-rodape">
        <button class="acao" type="button" data-acao="curtir"
          aria-pressed="${item.curtido}" aria-label="Curtir resenha de ${autorResenha} (${item.curtidas} curtidas)">
          ${item.curtido ? "♥" : "♡"} ${item.curtidas}
        </button>
        <button class="acao" type="button" data-acao="comentarios"
          aria-expanded="${item.comentariosAbertos}" aria-controls="comentarios-${item.id}">
          ${item.comentarios.length} ${plural(item.comentarios.length, "comentário", "comentários")}
        </button>
        <button class="acao acao-salvar" type="button" data-acao="salvar"
          aria-pressed="${item.salvo}" aria-label="Salvar resenha de ${autorResenha}">
          ${item.salvo ? "Salvo ✓" : "Salvar"}
        </button>
      </footer>

      ${criarHtmlComentarios(item)}
    </article>
  `;
}

// Monta todos os cards do feed na tela
function renderizarFeed() {
  const container = document.getElementById("feed-resenhas");
  const daAba = resenhasDaAba();

  // Em "Todas" só as primeiras ficam em destaque, até a pessoa pedir "Ver todas"
  const visiveis = feedCompleto ? daAba : daAba.slice(0, RESENHAS_EM_DESTAQUE);

  if (visiveis.length === 0) {
    container.innerHTML =
      abaFeed === "salvas"
        ? '<p class="lista-vazia">Você ainda não salvou nenhuma resenha. Use o botão “Salvar” nas resenhas.</p>'
        : '<p class="lista-vazia">Ainda não há resenhas por aqui.</p>';
  } else {
    let html = "";
    for (const item of visiveis) {
      html += criarCardFeed(item);
    }
    container.innerHTML = html;
  }

  atualizarControlesDoFeed();
}

// As resenhas da aba aberta ("Todas" ou só as que a pessoa salvou)
function resenhasDaAba() {
  return abaFeed === "salvas" ? feed.filter((item) => item.salvo) : feed;
}

// Contadores das abas e o botão "Ver todas →" / "Mostrar menos"
function atualizarControlesDoFeed() {
  const total = resenhasDaAba().length;

  for (const aba of document.querySelectorAll("[data-aba-feed]")) {
    const nome = aba.dataset.abaFeed;

    aba.setAttribute("aria-pressed", nome === abaFeed);
    aba.querySelector(".aba-contador").textContent = nome === "salvas" ? feed.filter((item) => item.salvo).length : feed.length;
  }

  // Sem resenhas escondidas não há o que expandir
  const botao = document.getElementById("feed-ver-todas");
  botao.hidden = total <= RESENHAS_EM_DESTAQUE;
  botao.setAttribute("aria-expanded", feedCompleto);
  botao.textContent = feedCompleto ? "Mostrar menos" : `Ver todas (${total}) →`;
}

function mudarAbaDoFeed(nome) {
  abaFeed = nome;
  feedCompleto = false;

  renderizarFeed();
}

// "Ver todas →" ↔ "Mostrar menos"
function alternarFeedCompleto() {
  feedCompleto = !feedCompleto;

  renderizarFeed();
}


/* ---------- 4. AÇÕES DOS CARDS ---------- */

// Atualiza só o card que mudou (redesenhar o feed inteiro tiraria o foco do botão)
function atualizarCardFeed(item, acao) {
  const cardAtual = document.querySelector(`#feed-resenhas [data-id="${item.id}"]`);
  const temporario = document.createElement("div");
  temporario.innerHTML = criarCardFeed(item);

  const cardNovo = temporario.firstElementChild;

  // Não perde o comentário que a pessoa estava escrevendo
  const rascunho = cardAtual.querySelector("textarea").value;
  cardNovo.querySelector("textarea").value = rascunho;

  cardAtual.replaceWith(cardNovo);

  // Devolve o foco ao mesmo botão, para quem navega pelo teclado
  cardNovo.querySelector(`[data-acao="${acao}"]`).focus();
}

// ♡ 248 → ♥ 249 (e o contrário ao clicar de novo)
function curtirResenha(item) {
  item.curtido = !item.curtido;
  item.curtidas += item.curtido ? 1 : -1;

  alternarNaLista(interacoes.curtidas, item.id, item.curtido);
  salvarDados();

  atualizarCardFeed(item, "curtir");
}

// "Salvar" → "Salvo ✓" (e o contrário)
function salvarResenha(item) {
  item.salvo = !item.salvo;

  alternarNaLista(interacoes.salvos, item.id, item.salvo);
  salvarDados();

  if (abaFeed === "salvas" && !item.salvo) {
    // Na aba "Salvas", tirar dos salvos faz o card sair da lista: o foco vai para a aba
    renderizarFeed();
    document.querySelector('[data-aba-feed="salvas"]').focus();
  } else {
    atualizarCardFeed(item, "salvar");
    atualizarControlesDoFeed();
  }

  mostrarAviso(item.salvo ? "Resenha salva." : "Resenha removida dos salvos.");
}

// Põe o id na lista (ativo = true) ou tira dela (ativo = false), sem repetir
function alternarNaLista(lista, id, ativo) {
  const posicao = lista.indexOf(id);

  if (ativo && posicao === -1) {
    lista.push(id);
  } else if (!ativo && posicao !== -1) {
    lista.splice(posicao, 1);
  }
}

// Guarda só os comentários da pessoa logada (os das outras pessoas são fixos)
function guardarComentarios(item) {
  interacoes.comentarios[item.id] = item.comentarios
    .filter((comentario) => comentario.meu)
    .map((comentario) => ({ id: comentario.id, texto: comentario.texto, data: comentario.data.toISOString() }));

  salvarDados();
}

// Mostra ou esconde os comentários da resenha
function alternarComentarios(item) {
  item.comentariosAbertos = !item.comentariosAbertos;

  atualizarCardFeed(item, "comentarios");
}

// Valida e acrescenta um comentário da pessoa logada
function publicarComentario(item, formulario) {
  const campo = formulario.querySelector("textarea");
  const erro = formulario.querySelector(".campo-erro");
  const texto = campo.value.trim();

  if (texto === "") {
    erro.textContent = "Escreva algo antes de comentar.";
    campo.setAttribute("aria-invalid", "true");
    campo.focus();
    return;
  }

  item.comentarios.push({
    // Data em base 36 + contador: o id continua único depois de recarregar a página
    id: `meu-${Date.now().toString(36)}-${++contadorComentarios}`,
    autor: usuario.nome,
    avatar: "avatar-perfil",
    texto,
    data: new Date(),
    meu: true,
  });

  guardarComentarios(item);

  // O campo é esvaziado antes de redesenhar o card, para o rascunho não voltar
  campo.value = "";
  atualizarCardFeed(item, "comentarios");
  document.querySelector(`#comentario-${item.id}`).focus();
  mostrarAviso("Comentário publicado.");
}

function excluirComentario(item, comentarioId) {
  item.comentarios = item.comentarios.filter((comentario) => comentario.id !== comentarioId);
  guardarComentarios(item);

  atualizarCardFeed(item, "comentarios");
  mostrarAviso("Comentário excluído.");
}

// Um único "ouvinte" no feed: descobre o botão e o card clicados
function tratarCliqueFeed(evento) {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) {
    return;
  }

  const id = botao.closest("[data-id]").dataset.id;
  const item = feed.find((resenha) => resenha.id === id);
  const acao = botao.dataset.acao;

  if (acao === "curtir") {
    curtirResenha(item);
  } else if (acao === "salvar") {
    salvarResenha(item);
  } else if (acao === "comentarios") {
    alternarComentarios(item);
  } else if (acao === "excluir-comentario") {
    excluirComentario(item, botao.dataset.comentarioId);
  }
}

// Envio do formulário de comentário (o evento "submit" sobe até o feed)
function tratarEnvioFeed(evento) {
  if (!evento.target.matches(".comentario-form")) {
    return;
  }

  // Impede o envio padrão, que recarregaria a página
  evento.preventDefault();

  const id = evento.target.closest("[data-id]").dataset.id;
  publicarComentario(feed.find((resenha) => resenha.id === id), evento.target);
}


/* ---------- 5. INÍCIO ---------- */

function iniciarInicio() {
  gerarSaudacao();
  exibirDataAtual();
  atualizarMetaLeitura();

  montarFeed();
  renderizarFeed();
  // Se outra aba mudar os dados (curtidas, comentários, livros lidos), esta página acompanha
  aoMudarDados.push(() => {
    atualizarMetaLeitura();
    montarFeed();
    renderizarFeed();
  });

  document.getElementById("feed-ver-todas").addEventListener("click", alternarFeedCompleto);
  for (const aba of document.querySelectorAll("[data-aba-feed]")) {
    aba.addEventListener("click", () => mudarAbaDoFeed(aba.dataset.abaFeed));
  }

  document.getElementById("feed-resenhas").addEventListener("click", tratarCliqueFeed);
  document.getElementById("feed-resenhas").addEventListener("submit", tratarEnvioFeed);

  // Ao voltar a digitar, a mensagem de erro do comentário some
  document.getElementById("feed-resenhas").addEventListener("input", (evento) => {
    if (evento.target.matches(".comentario-form textarea")) {
      evento.target.removeAttribute("aria-invalid");
      evento.target.closest("form").querySelector(".campo-erro").textContent = "";
    }
  });
}

iniciarInicio();
