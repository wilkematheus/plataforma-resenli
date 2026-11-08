/* ==========================================================
   RESENLI — Página Pesquisar
   Busca no catálogo e botão "Adicionar à minha lista"
   ========================================================== */


/* ---------- 1. LISTA DE LIVROS ---------- */

// Gera o HTML de um card de livro
function criarCardLivro(livro) {
  const titulo = escaparHTML(livro.titulo);
  const naLista = minhaLista.includes(livro.id);
  const avaliacoes = `${formatarMilhar(livro.totalAvaliacoes)} ${plural(livro.totalAvaliacoes, "avaliação", "avaliações")}`;

  return `
    <li>
      <article class="card card-livro">
        ${criarCapa(livro)}
        <div class="livro-info">
          ${renderizarNotaMedia(livro.notaMedia)}
          <h3 class="livro-titulo">${titulo}</h3>
          <p class="livro-autor">${escaparHTML(livro.autor)}</p>
          <small class="livro-detalhe">${livro.ano} · ${avaliacoes}</small>
        </div>
        <button class="botao botao-contorno ${naLista ? "salvo" : ""}" type="button"
          data-livro-id="${livro.id}" aria-pressed="${naLista}">
          ${naLista ? "✓ Na minha lista" : "+ Adicionar à minha lista"}
        </button>
      </article>
    </li>
  `;
}

// Monta os cards e ajusta o título da seção conforme a busca
function renderizarLivros(lista, termo) {
  const grade = document.getElementById("grade-livros");
  const semResultados = document.getElementById("sem-resultados");
  const sobretitulo = document.getElementById("resultados-sobretitulo");
  const titulo = document.getElementById("titulo-resultados");

  if (termo.trim() === "") {
    sobretitulo.textContent = "Curadoria Resenli";
    titulo.textContent = "Livros para descobrir";
  } else {
    sobretitulo.textContent = `${lista.length} ${plural(lista.length, "resultado", "resultados")}`;
    titulo.textContent = `Resultados para “${termo.trim()}”`;
  }

  if (lista.length === 0) {
    grade.innerHTML = "";
    semResultados.textContent = "Nenhum livro encontrado. Tente buscar por outro título, autor ou gênero.";
    semResultados.hidden = false;
    return;
  }

  semResultados.hidden = true;

  let html = "";
  for (const livro of lista) {
    html += criarCardLivro(livro);
  }
  grade.innerHTML = html;
}


/* ---------- 2. BUSCA ---------- */

// Procura no título, autor, gênero e tags (ignora acentos e maiúsculas)
function filtrarLivros(termo) {
  const busca = normalizarTexto(termo);

  if (busca === "") {
    return livros;
  }

  return livros.filter((livro) => {
    const conteudo = normalizarTexto(
      `${livro.titulo} ${livro.autor} ${livro.genero} ${livro.tags.join(" ")}`
    );
    return conteudo.includes(busca);
  });
}

// Lê o campo, filtra e guarda o termo na URL (?busca=...) sem recarregar a página
function pesquisar() {
  const termo = document.getElementById("campo-pesquisa").value;

  renderizarLivros(filtrarLivros(termo), termo);

  const url = new URL(window.location.href);
  if (termo.trim() === "") {
    url.searchParams.delete("busca");
  } else {
    url.searchParams.set("busca", termo.trim());
  }
  history.replaceState(null, "", url);
}

// Ao abrir a página com ?busca=..., já mostra o resultado (ex.: vindo de um link)
function lerTermoDaURL() {
  const termo = new URLSearchParams(window.location.search).get("busca") || "";
  document.getElementById("campo-pesquisa").value = termo;
}


/* ---------- 3. MINHA LISTA ---------- */

// "+ Adicionar à minha lista" ↔ "✓ Na minha lista"
function alternarLista(botao) {
  const id = botao.dataset.livroId;
  const livro = buscarLivro(id);
  const estavaNaLista = minhaLista.includes(id);

  if (estavaNaLista) {
    minhaLista = minhaLista.filter((item) => item !== id);
  } else {
    minhaLista.push(id);
  }

  const naLista = !estavaNaLista;
  botao.classList.toggle("salvo", naLista);
  botao.setAttribute("aria-pressed", naLista);
  botao.textContent = naLista ? "✓ Na minha lista" : "+ Adicionar à minha lista";

  atualizarContadorLista();
  mostrarAviso(naLista ? `${livro.titulo} entrou na sua lista.` : `${livro.titulo} saiu da sua lista.`);
}


/* ---------- 4. EVENTOS E INÍCIO ---------- */

function configurarEventosPesquisa() {
  const formulario = document.querySelector(".busca-form");
  const campo = document.getElementById("campo-pesquisa");

  // Busca enquanto digita
  campo.addEventListener("input", pesquisar);

  // Enter ou botão "Pesquisar": não recarrega a página
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    pesquisar();
  });

  // Buscas populares: preenchem o campo em vez de recarregar a página
  for (const chip of document.querySelectorAll(".chip")) {
    chip.addEventListener("click", (evento) => {
      evento.preventDefault();
      campo.value = chip.textContent.trim();
      pesquisar();
    });
  }

  // Botões dos cards (um único "ouvinte" na grade)
  document.getElementById("grade-livros").addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-livro-id]");
    if (botao) {
      alternarLista(botao);
    }
  });
}

function iniciarPesquisa() {
  lerTermoDaURL();
  configurarEventosPesquisa();

  const termo = document.getElementById("campo-pesquisa").value;
  renderizarLivros(filtrarLivros(termo), termo);
}

iniciarPesquisa();
