/* ==========================================================
   RESENLI — Página do livro (livro.html?id=...)
   Informações, status de leitura e resenhas daquele livro
   ========================================================== */


/* ---------- 1. LIVRO ---------- */

let livroAtual = null;

// Lê o ?id= da URL e devolve o livro do catálogo (ou undefined)
function lerLivroDaURL() {
  const id = new URLSearchParams(window.location.search).get("id");

  return buscarLivro(id);
}

// A resenha do próprio usuário sobre este livro, se existir
function buscarMinhaResenha(livro) {
  return resenhas.find((resenha) => resenha.livro === livro.titulo);
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
  const minhaResenha = buscarMinhaResenha(livro);
  const avaliacoes = `${formatarMilhar(livro.totalAvaliacoes)} ${plural(livro.totalAvaliacoes, "avaliação", "avaliações")}`;

  // Quem avaliou o livro já o leu: o status fica travado em "Lido"
  const statusAtual = minhaResenha ? "lido" : obterStatus(livro.id);
  const aviso = minhaResenha ? '<small class="livro-status-nota">Você avaliou este livro, então ele conta como lido.</small>' : "";

  const botaoAvaliar = minhaResenha
    ? `<a class="botao botao-secundario" href="minhas-avaliacoes.html?avaliar=${livro.id}">Editar minha avaliação</a>`
    : `<a class="botao botao-primario" href="minhas-avaliacoes.html?avaliar=${livro.id}">Avaliar este livro</a>`;

  document.getElementById("livro-pagina").innerHTML = `
    ${criarCapa(livro)}
    <div class="livro-pagina-info">
      <span class="genero">${escaparHTML(livro.genero)}</span>
      <h1 class="titulo-grande">${escaparHTML(livro.titulo)}</h1>
      <p class="livro-autor">${escaparHTML(livro.autor)}</p>
      ${renderizarNotaMedia(livro.notaMedia)}
      <p class="livro-detalhe">${livro.ano} · ${livro.paginas} páginas · ${avaliacoes}</p>

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

// Livro que não existe no catálogo (id errado ou ausente)
function mostrarLivroNaoEncontrado() {
  document.getElementById("livro-pagina").innerHTML = `
    <p class="lista-vazia">
      Não encontramos este livro.
      <a class="link-forte" href="pesquisar.html">Buscar outro livro →</a>
    </p>
  `;
  document.title = "Livro não encontrado | Resenli";
}


/* ---------- 2. STATUS ---------- */

// Chamada quando a pessoa escolhe outro status no seletor
function mudarStatusLivro(status) {
  definirStatus(livroAtual.id, status);
  atualizarContadorLista();

  if (status === "lido") {
    mostrarAviso(`Você terminou ${livroAtual.titulo}!`, {
      rotulo: "Avaliar",
      aoClicar: () => {
        window.location.href = `minhas-avaliacoes.html?avaliar=${livroAtual.id}`;
      },
    });
  } else if (status === "") {
    mostrarAviso(`${livroAtual.titulo} saiu da sua lista.`);
  } else {
    mostrarAviso(`${livroAtual.titulo} marcado como "${ROTULOS_STATUS[status]}".`);
  }
}


/* ---------- 3. RESENHAS DO LIVRO ---------- */

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

  const minhaResenha = buscarMinhaResenha(livro);
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


/* ---------- 4. INÍCIO ---------- */

function iniciarLivro() {
  livroAtual = lerLivroDaURL();

  if (!livroAtual) {
    mostrarLivroNaoEncontrado();
    return;
  }

  renderizarLivro(livroAtual);
  renderizarResenhasDoLivro(livroAtual);

  document.getElementById("livro-pagina").addEventListener("change", (evento) => {
    if (evento.target.id === "status-leitura") {
      mudarStatusLivro(evento.target.value);
    }
  });
}

iniciarLivro();
