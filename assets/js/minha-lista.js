/* ==========================================================
   RESENLI — Página Minha lista
   Estante por status (quero ler, lendo, lidos), resumo e ações
   ========================================================== */


/* ---------- 1. ESTADO DA PÁGINA ---------- */

// Aba aberta no momento: "quero-ler", "lendo" ou "lido"
let abaAtual = "quero-ler";

const MENSAGENS_VAZIO = {
  "quero-ler": "Nenhum livro para ler por enquanto.",
  lendo: "Você não está lendo nada agora.",
  lido: "Você ainda não terminou nenhum livro.",
};


/* ---------- 2. ESTANTE ---------- */

// Ids dos livros da aba, na ordem em que aparecem
function livrosDaAba(status) {
  const ids = status === "lido" ? listarPorStatus("lido") : minhaLista.filter((id) => obterStatus(id) === status);

  // Ignora ids que não existem no catálogo
  return ids.map(buscarLivro).filter(Boolean);
}

// O que aparece no lugar do botão, conforme o status do livro
function criarAcaoStatus(livro, status) {
  if (status === "quero-ler") {
    return `<button class="botao-texto" type="button" data-acao="lendo" data-livro-id="${livro.id}">Começar a ler →</button>`;
  }

  if (status === "lendo") {
    return `<button class="botao-texto" type="button" data-acao="lido" data-livro-id="${livro.id}">Marcar como lido ✓</button>`;
  }

  // Lido: leva a avaliar ou a rever a avaliação
  const avaliado = Boolean(resenhaDoLivro(livro));

  return avaliado
    ? '<a class="link-forte" href="minhas-avaliacoes.html">Ver minha avaliação →</a>'
    : `<a class="link-forte" href="minhas-avaliacoes.html?avaliar=${livro.id}">Avaliar este livro →</a>`;
}

// Gera o HTML de um card da estante (posição = 01, 02, 03...)
function criarCardEstante(livro, posicao, status) {
  const titulo = escaparHTML(livro.titulo);

  // Livro lido não tem "remover": ele é histórico de leitura
  const remover =
    status === "lido"
      ? ""
      : `<button class="botao-remover" type="button" data-acao="remover" data-livro-id="${livro.id}" aria-label="Remover ${titulo} da lista">
          <svg class="icone" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>`;

  return `
    <li>
      <article class="card card-estante">
        <span class="posicao" aria-hidden="true">${String(posicao).padStart(2, "0")}</span>
        ${criarCapa(livro)}
        <div class="livro-info">
          <span class="genero">${escaparHTML(livro.genero)}</span>
          <h3 class="livro-titulo"><a class="link-titulo" href="livro.html?id=${livro.id}">${titulo}</a></h3>
          <p class="livro-autor">${escaparHTML(livro.autor)}</p>
          ${renderizarNotaMedia(livro.notaMedia)}
          ${criarAcaoStatus(livro, status)}
        </div>
        ${remover}
      </article>
    </li>
  `;
}

// Monta a estante da aba atual (ou mostra a mensagem de aba vazia)
function renderizarLista() {
  const estante = document.getElementById("grade-estante");
  const vazia = document.getElementById("lista-vazia");
  const livrosDaLista = livrosDaAba(abaAtual);

  vazia.hidden = livrosDaLista.length > 0;
  document.getElementById("lista-vazia-texto").textContent = MENSAGENS_VAZIO[abaAtual];

  let html = "";
  livrosDaLista.forEach((livro, indice) => {
    html += criarCardEstante(livro, indice + 1, abaAtual);
  });
  estante.innerHTML = html;
}


/* ---------- 3. ABAS E RESUMO ---------- */

// Marca a aba aberta e mostra quantos livros há em cada uma
function atualizarAbas() {
  for (const aba of document.querySelectorAll(".aba")) {
    const status = aba.dataset.status;

    aba.setAttribute("aria-pressed", status === abaAtual);
    aba.querySelector(".aba-contador").textContent = livrosDaAba(status).length;
  }
}

function mudarAba(status) {
  abaAtual = status;

  atualizarAbas();
  renderizarLista();
}

// "3 livros para ler" e "850 páginas esperando por você" (conta só o que falta ler)
function calcularResumo() {
  const livrosParaLer = minhaLista.map(buscarLivro).filter(Boolean);
  const total = livrosParaLer.length;

  let paginas = 0;
  let semPaginas = 0;
  for (const livro of livrosParaLer) {
    paginas += livro.paginas;
    // Livros do Google Books nem sempre informam o número de páginas
    if (!livro.paginas) {
      semPaginas += 1;
    }
  }

  const aviso = semPaginas > 0 ? ` (sem contar ${semPaginas} ${plural(semPaginas, "livro sem", "livros sem")} número de páginas)` : "";

  document.getElementById("resumo-total").textContent = total;
  document.getElementById("resumo-texto").textContent = `${plural(total, "livro", "livros")} para ler`;
  document.getElementById("resumo-paginas").textContent = formatarMilhar(paginas);
  document.getElementById("resumo-paginas-texto").textContent =
    `${plural(paginas, "página esperando", "páginas esperando")} por você${aviso}`;
}

// Tudo que depende da lista, depois de qualquer mudança
function atualizarPagina() {
  atualizarAbas();
  renderizarLista();
  calcularResumo();
  atualizarContadorLista();
}


/* ---------- 4. AÇÕES ---------- */

// Tira o livro da lista e atualiza estante, resumo e contador do menu
function removerLivro(id) {
  const livro = buscarLivro(id);
  const posicao = livrosDaAba(abaAtual).findIndex((item) => item.id === id);

  definirStatus(id, "");
  atualizarPagina();
  mostrarAviso(`${livro.titulo} saiu da sua lista.`);

  // O botão clicado sumiu: leva o foco para o próximo (ou o anterior) botão de remover
  const botoes = document.querySelectorAll("#grade-estante .botao-remover");
  const proximo = botoes[Math.min(posicao, botoes.length - 1)];

  if (proximo) {
    proximo.focus();
  } else {
    document.querySelector("#lista-vazia a").focus();
  }
}

// "Começar a ler" (lendo) e "Marcar como lido" (lido)
function mudarStatus(id, status) {
  const livro = buscarLivro(id);

  definirStatus(id, status);
  atualizarPagina();

  if (status === "lido") {
    // O livro foi para a aba "Lidos": convida a avaliar
    mostrarAviso(`Você terminou ${livro.titulo}!`, {
      rotulo: "Avaliar",
      aoClicar: () => {
        window.location.href = `minhas-avaliacoes.html?avaliar=${livro.id}`;
      },
    });
  } else {
    mostrarAviso(`${livro.titulo} está em "Lendo".`);
  }

  // O botão clicado saiu desta aba: leva o foco para a aba atual
  document.querySelector(`.aba[data-status="${abaAtual}"]`).focus();
}


/* ---------- 5. INÍCIO ---------- */

function iniciarMinhaLista() {
  // Começa na primeira aba que tem livros (e, se todas estiverem vazias, em "Quero ler")
  abaAtual = ["quero-ler", "lendo", "lido"].find((status) => livrosDaAba(status).length > 0) || "quero-ler";

  atualizarPagina();

  // Se outra aba mudar a lista ou os status, esta página acompanha
  aoMudarDados.push(atualizarPagina);

  for (const aba of document.querySelectorAll(".aba")) {
    aba.addEventListener("click", () => mudarAba(aba.dataset.status));
  }

  // Um único "ouvinte" na estante para todos os botões dos cards
  document.getElementById("grade-estante").addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-acao]");
    if (!botao) {
      return;
    }

    const id = botao.dataset.livroId;
    if (botao.dataset.acao === "remover") {
      removerLivro(id);
    } else {
      mudarStatus(id, botao.dataset.acao);
    }
  });
}

iniciarMinhaLista();
