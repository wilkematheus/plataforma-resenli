/* ==========================================================
   RESENLI — Página Minha lista
   Estante com os livros salvos, resumo e botão de remover
   ========================================================== */


/* ---------- 1. ESTANTE ---------- */

// Gera o HTML de um card da estante (posição = 01, 02, 03...)
function criarCardEstante(livro, posicao) {
  const titulo = escaparHTML(livro.titulo);

  return `
    <li>
      <article class="card card-estante">
        <span class="posicao" aria-hidden="true">${String(posicao).padStart(2, "0")}</span>
        ${criarCapa(livro)}
        <div class="livro-info">
          <span class="genero">${escaparHTML(livro.genero)}</span>
          <h3 class="livro-titulo">${titulo}</h3>
          <p class="livro-autor">${escaparHTML(livro.autor)}</p>
          ${renderizarNotaMedia(livro.notaMedia)}
          <a class="link-forte" href="#livro-${livro.id}">Começar a ler →</a>
        </div>
        <button class="botao-remover" type="button" data-livro-id="${livro.id}" aria-label="Remover ${titulo} da lista">
          <svg class="icone" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </article>
    </li>
  `;
}

// Monta a estante na ordem de minhaLista (ou mostra a mensagem de lista vazia)
function renderizarLista() {
  const estante = document.getElementById("grade-estante");
  const vazia = document.getElementById("lista-vazia");

  // Ignora ids que não existem no catálogo
  const livrosDaLista = minhaLista.map(buscarLivro).filter(Boolean);

  vazia.hidden = livrosDaLista.length > 0;

  let html = "";
  livrosDaLista.forEach((livro, indice) => {
    html += criarCardEstante(livro, indice + 1);
  });
  estante.innerHTML = html;
}


/* ---------- 2. RESUMO ---------- */

// "4 livros para ler" e "1.122 páginas esperando por você"
function calcularResumo() {
  const livrosDaLista = minhaLista.map(buscarLivro).filter(Boolean);
  const total = livrosDaLista.length;

  let paginas = 0;
  for (const livro of livrosDaLista) {
    paginas += livro.paginas;
  }

  document.getElementById("resumo-total").textContent = total;
  document.getElementById("resumo-texto").textContent = `${plural(total, "livro", "livros")} para ler`;
  document.getElementById("resumo-paginas").textContent = formatarMilhar(paginas);
  document.getElementById("resumo-paginas-texto").textContent =
    `${plural(paginas, "página esperando", "páginas esperando")} por você`;
}


/* ---------- 3. REMOVER ---------- */

// Tira o livro da lista e atualiza estante, resumo e contador do menu
function removerLivro(id) {
  const livro = buscarLivro(id);
  const posicao = minhaLista.indexOf(id);

  minhaLista = minhaLista.filter((item) => item !== id);

  renderizarLista();
  calcularResumo();
  atualizarContadorLista();
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


/* ---------- 4. INÍCIO ---------- */

function iniciarMinhaLista() {
  renderizarLista();
  calcularResumo();

  // Um único "ouvinte" na estante para todos os botões de remover
  document.getElementById("grade-estante").addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-livro-id]");
    if (botao) {
      removerLivro(botao.dataset.livroId);
    }
  });
}

iniciarMinhaLista();
