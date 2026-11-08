/* ==========================================================
   RESENLI — Página do livro (livro.html?id=...)
   Informações, status de leitura, descrição e resenhas.

   O id pode ser de um livro do catálogo da casa, de um livro do Google
   Books já guardado na conta, ou de um livro do Google Books que ainda
   não foi guardado (nesse caso ele é buscado na API ao abrir a página).
   ========================================================== */


/* ---------- 1. LIVRO ---------- */

// O livro mostrado agora. Para livros do catálogo pode ter capa e descrição vindas do Google
// (só para exibir: o catálogo fixo não é alterado nem guardado).
let livroAtual = null;

// Dá um número a cada carregamento: resposta de um carregamento antigo é ignorada
let carregamentoLivro = 0;

function lerIdDaURL() {
  return new URLSearchParams(window.location.search).get("id") || "";
}

// Gera as opções do seletor de status; "" = sem status
function criarOpcoesStatus(statusAtual) {
  let opcoes = `<option value="" ${statusAtual === "" ? "selected" : ""}>Sem status</option>`;

  for (const status in ROTULOS_STATUS) {
    opcoes += `<option value="${status}" ${statusAtual === status ? "selected" : ""}>${ROTULOS_STATUS[status]}</option>`;
  }

  return opcoes;
}

// Monta o bloco principal: capa, dados, status e botão de avaliar
function renderizarLivro(livro) {
  const minhaResenha = resenhaDoLivro(livro);
  const detalhe = descreverLivro(livro, { paginas: true }) || "Sem mais informações";

  // Quem avaliou o livro já o leu: o status fica travado em "Lido"
  const statusAtual = minhaResenha ? "lido" : obterStatus(livro.id);
  const aviso = minhaResenha ? '<small class="livro-status-nota">Você avaliou este livro, então ele conta como lido.</small>' : "";

  const enderecoAvaliar = `minhas-avaliacoes.html?avaliar=${encodeURIComponent(livro.id)}`;
  const botaoAvaliar = minhaResenha
    ? `<a class="botao botao-secundario" href="${enderecoAvaliar}" data-avaliar>Editar minha avaliação</a>`
    : `<a class="botao botao-primario" href="${enderecoAvaliar}" data-avaliar>Avaliar este livro</a>`;

  document.getElementById("livro-pagina").innerHTML = `
    ${criarCapa(livro)}
    <div class="livro-pagina-info">
      <span class="genero">${escaparHTML(livro.genero)}</span>
      <h1 class="titulo-grande">${escaparHTML(livro.titulo)}</h1>
      <p class="livro-autor">${escaparHTML(livro.autor)}</p>
      ${renderizarNotaMedia(livro.notaMedia)}
      <p class="livro-detalhe">${escaparHTML(detalhe)}</p>

      <div class="livro-acoes">
        <div class="campo">
          <label class="campo-rotulo" for="status-leitura">Status de leitura</label>
          <select class="campo-entrada" id="status-leitura" ${minhaResenha ? "disabled" : ""}>
            ${criarOpcoesStatus(statusAtual)}
          </select>
          ${aviso}
        </div>
        ${botaoAvaliar}
      </div>
    </div>
  `;

  document.title = `${livro.titulo} | Resenli`;
}

// Mensagem no lugar do livro (não encontrado, carregando, erro). `tentarDeNovo` mostra o botão.
function mostrarMensagemDoLivro(texto, { tentarDeNovo = false, link = true } = {}) {
  const botao = tentarDeNovo ? '<button class="botao botao-secundario" type="button" data-acao="tentar">Tentar de novo</button>' : "";
  const busca = link ? '<a class="link-forte" href="pesquisar.html">Buscar outro livro →</a>' : "";

  document.getElementById("livro-pagina").innerHTML = `
    <p class="lista-vazia livro-mensagem">
      <span>${escaparHTML(texto)}</span>
      ${botao}
      ${busca}
    </p>
  `;
  document.getElementById("livro-sobre").hidden = true;
  document.getElementById("livro-resenhas").hidden = true;
}

// Livro que não existe (id errado, ausente ou desconhecido pelo Google)
function mostrarLivroNaoEncontrado() {
  mostrarMensagemDoLivro("Não encontramos este livro.");
  document.title = "Livro não encontrado | Resenli";
}


/* ---------- 2. DESCRIÇÃO ---------- */

// Mostra "Sobre o livro" (texto do Google Books) e o link para o livro no Google
function renderizarSobre(livro) {
  const secao = document.getElementById("livro-sobre");

  if (!livro.descricao && !livro.linkGoogle) {
    secao.hidden = true;
    return;
  }

  document.getElementById("livro-sobre-texto").textContent = livro.descricao || "Este livro não tem descrição no Google Books.";

  const link = document.getElementById("livro-sobre-link");
  link.hidden = !livro.linkGoogle;
  if (livro.linkGoogle) {
    link.href = livro.linkGoogle;
  }

  secao.hidden = false;
}

// Livros do catálogo fixo não têm descrição nem capa: pede ao Google, sem atrapalhar a página
async function completarComDadosDoGoogle(livro, numero) {
  try {
    const achado = await buscarDetalhesDoLivroDoCatalogo(livro);

    // A pessoa abriu outro livro nesse meio tempo
    if (numero !== carregamentoLivro || !achado) {
      return;
    }

    // Cópia só para exibir: o livro do catálogo continua igual
    livroAtual = { ...livro, capaUrl: achado.capaUrl, descricao: achado.descricao, linkGoogle: achado.linkGoogle };
    renderizarLivro(livroAtual);
    renderizarSobre(livroAtual);
  } catch (erro) {
    // Informação extra: se falhar (sem internet, cota), a página segue completa sem ela
  }
}


/* ---------- 3. STATUS ---------- */

// Chamada quando a pessoa escolhe outro status no seletor
function mudarStatusLivro(status) {
  // Livro do Google ainda não guardado precisa ser guardado na conta antes de ter status
  if (status !== "" && livroAtual.origem === "google" && !buscarLivro(livroAtual.id) && !registrarLivroExterno(livroAtual)) {
    mostrarAviso(`Você já guardou ${MAX_LIVROS_EXTERNOS} livros do Google Books. Remova algum da lista para adicionar outro.`);
    renderizarLivro(livroAtual);
    return;
  }

  definirStatus(livroAtual.id, status);
  atualizarContadorLista();

  if (status === "lido") {
    mostrarAviso(`Você terminou ${livroAtual.titulo}!`, {
      rotulo: "Avaliar",
      aoClicar: () => {
        window.location.href = `minhas-avaliacoes.html?avaliar=${encodeURIComponent(livroAtual.id)}`;
      },
    });
  } else if (status === "") {
    mostrarAviso(`${livroAtual.titulo} saiu da sua lista.`);
  } else {
    mostrarAviso(`${livroAtual.titulo} marcado como "${ROTULOS_STATUS[status]}".`);
  }
}

// O botão "Avaliar" abre outra página, que só conhece livros guardados: guarda o livro antes de sair
function prepararAvaliacao() {
  if (livroAtual.origem === "google" && !buscarLivro(livroAtual.id)) {
    registrarLivroExterno(livroAtual);
    salvarDados();
  }
}


/* ---------- 4. RESENHAS DO LIVRO ---------- */

// Junta as resenhas da comunidade e a do usuário sobre este livro, da mais nova para a mais antiga
function reunirResenhas(livro) {
  const agora = Date.now();

  const daComunidade = resenhasComunidade
    .filter((item) => item.livroId === livro.id)
    .map((item) => ({
      autor: item.autor,
      avatar: item.avatar,
      nota: item.nota,
      texto: item.texto,
      data: new Date(agora - item.minutosAtras * 60000),
      curtidas: item.curtidas,
      minha: false,
    }));

  const minhaResenha = resenhaDoLivro(livro);
  const minhas = minhaResenha
    ? [{
        autor: usuario.nome,
        avatar: "avatar-perfil",
        nota: minhaResenha.nota,
        texto: minhaResenha.texto,
        // Meio-dia evita que o fuso horário mude o dia
        data: new Date(`${minhaResenha.data}T12:00:00`),
        curtidas: 0,
        minha: true,
      }]
    : [];

  return [...daComunidade, ...minhas].sort((a, b) => b.data - a.data);
}

function criarCardResenhaLivro(resenha) {
  const etiqueta = resenha.minha ? '<span class="etiqueta">Sua resenha</span>' : "";
  const curtidas = resenha.curtidas > 0 ? `<small class="resenha-curtidas">♡ ${resenha.curtidas}</small>` : "";

  return `
    <article class="card card-resenha card-resenha-livro">
      <header class="resenha-topo">
        <span class="avatar ${resenha.avatar}" aria-hidden="true">${gerarIniciais(resenha.autor)}</span>
        <div class="resenha-autor">
          <strong class="resenha-nome">${escaparHTML(resenha.autor)}</strong>
          <time class="resenha-tempo" datetime="${resenha.data.toISOString()}">${formatarTempoRelativo(resenha.data)}</time>
        </div>
        ${etiqueta}
      </header>
      <div class="resenha-info">
        ${renderizarEstrelas(resenha.nota)}
        <blockquote class="resenha-texto">${escaparHTML(resenha.texto)}</blockquote>
        ${curtidas}
      </div>
    </article>
  `;
}

function renderizarResenhasDoLivro(livro) {
  const lista = reunirResenhas(livro);
  const secao = document.getElementById("livro-resenhas");
  const container = document.getElementById("lista-resenhas-livro");

  secao.hidden = false;
  document.getElementById("titulo-resenhas-livro").textContent =
    lista.length === 0 ? "Resenhas" : `${lista.length} ${plural(lista.length, "resenha", "resenhas")}`;

  if (lista.length === 0) {
    container.innerHTML = '<p class="lista-vazia">Ninguém avaliou este livro ainda. Que tal ser a primeira pessoa?</p>';
    return;
  }

  let html = "";
  for (const resenha of lista) {
    html += criarCardResenhaLivro(resenha);
  }
  container.innerHTML = html;
}


/* ---------- 5. CARREGAMENTO ---------- */

// Mostra tudo do livro
function mostrarLivro(livro) {
  livroAtual = livro;

  renderizarLivro(livro);
  renderizarSobre(livro);
  renderizarResenhasDoLivro(livro);
}

// Livro que não está no catálogo nem guardado: busca no Google Books pelo id
async function carregarDoGoogle(id, numero) {
  mostrarMensagemDoLivro("Buscando o livro no Google Books…", { link: false });
  document.getElementById("livro-pagina").setAttribute("aria-busy", "true");

  try {
    const livro = await buscarLivroNoGoogle(id);

    if (numero !== carregamentoLivro) {
      return;
    }
    if (!livro) {
      mostrarLivroNaoEncontrado();
      return;
    }

    mostrarLivro(livro);
  } catch (erro) {
    if (numero !== carregamentoLivro) {
      return;
    }
    mostrarMensagemDoLivro(mensagemDoErroGoogle(erro), { tentarDeNovo: true });
  } finally {
    document.getElementById("livro-pagina").removeAttribute("aria-busy");
  }
}

function carregarLivro() {
  carregamentoLivro += 1;
  const numero = carregamentoLivro;
  const id = lerIdDaURL();
  const local = id ? buscarLivro(id) : undefined;

  if (local) {
    mostrarLivro(local);

    // Só o catálogo fixo precisa de ajuda do Google; os livros do Google já vêm completos
    if (local.origem !== "google") {
      completarComDadosDoGoogle(local, numero);
    }
    return;
  }

  if (ID_LIVRO_EXTERNO.test(id)) {
    carregarDoGoogle(id, numero);
    return;
  }

  mostrarLivroNaoEncontrado();
}


/* ---------- 6. INÍCIO ---------- */

function iniciarLivro() {
  carregarLivro();

  const pagina = document.getElementById("livro-pagina");

  pagina.addEventListener("change", (evento) => {
    if (evento.target.id === "status-leitura" && livroAtual) {
      mudarStatusLivro(evento.target.value);
    }
  });

  pagina.addEventListener("click", (evento) => {
    if (evento.target.closest("[data-acao='tentar']")) {
      carregarLivro();
    } else if (evento.target.closest("[data-avaliar]") && livroAtual) {
      prepararAvaliacao();
    }
  });

  // Se outra aba mudar o status ou as resenhas, esta página acompanha
  aoMudarDados.push(() => {
    if (livroAtual) {
      renderizarLivro(livroAtual);
      renderizarResenhasDoLivro(livroAtual);
    }
  });
}

iniciarLivro();
