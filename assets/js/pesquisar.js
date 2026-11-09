/* ==========================================================
   RESENLI — Página Pesquisar
   Busca no catálogo da casa e no Google Books, e botão
   "Adicionar à minha lista"
   ========================================================== */


/* ---------- 1. ESTADO DA BUSCA NO GOOGLE BOOKS ---------- */

// Livros do Google já mostrados na tela (a mesma lista cresce com "Carregar mais")
let googleLivros = [];
let googleProximoInicio = 0;
let googleTotal = 0;
let googleTermo = "";

// Para cancelar o pedido em andamento quando a pessoa muda a busca
let googleControle = null;

// Cada busca recebe um número; resposta de uma busca que já ficou para trás é ignorada
let googleNumero = 0;

// Se a última tentativa falhou por falta de cota, não insistimos a cada letra digitada
let googleSemCota = false;
let googleUltimoFoiMais = false;

// Espera a pessoa parar de digitar antes de chamar a API
const buscarNoGoogleAtrasado = atrasar((termo) => buscarNoGoogle(termo), 450);


/* ---------- 2. LISTA DE LIVROS ---------- */

// Gera o HTML de um card de livro (serve para o catálogo e para o Google Books)
function criarCardLivro(livro) {
  const titulo = escaparHTML(livro.titulo);
  const naLista = minhaLista.includes(livro.id);
  const lido = obterStatus(livro.id) === "lido";
  const detalhe = descreverLivro(livro) || livro.genero;

  // Livro já lido não vai para a lista de leitura: o botão só informa
  const botao = lido
    ? `<button class="botao botao-contorno salvo" type="button" disabled>✓ Já lido</button>`
    : `<button class="botao botao-contorno ${naLista ? "salvo" : ""}" type="button"
        data-livro-id="${escaparHTML(livro.id)}" aria-pressed="${naLista}">
        ${naLista ? "✓ Na minha lista" : "+ Adicionar à minha lista"}
      </button>`;

  return `
    <li>
      <article class="card card-livro">
        ${criarCapa(livro)}
        <div class="livro-info">
          ${renderizarNotaMedia(livro.notaMedia)}
          <h3 class="livro-titulo"><a class="link-titulo" href="livro.html?id=${encodeURIComponent(livro.id)}">${titulo}</a></h3>
          <p class="livro-autor">${escaparHTML(livro.autor)}</p>
          <small class="livro-detalhe">${escaparHTML(detalhe)}</small>
        </div>
        ${botao}
      </article>
    </li>
  `;
}

// Monta os cards do catálogo e ajusta o título da seção conforme a busca
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
    semResultados.textContent = "Nenhum livro encontrado no nosso catálogo. Tente buscar por outro título, autor ou gênero.";
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


/* ---------- 3. BUSCA NO CATÁLOGO ---------- */

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

// Lê o campo, filtra o catálogo na hora e cuida da busca no Google Books.
// imediato = true (Enter, botão, atalhos): busca no Google sem esperar a pessoa parar de digitar.
function pesquisar({ imediato = false } = {}) {
  const termo = document.getElementById("campo-pesquisa").value;

  renderizarLivros(filtrarLivros(termo), termo);

  const url = new URL(window.location.href);
  if (termo.trim() === "") {
    url.searchParams.delete("busca");
  } else {
    url.searchParams.set("busca", termo.trim());
  }
  history.replaceState(null, "", url);

  agendarBuscaNoGoogle(termo, imediato);
}

// Ao abrir a página com ?busca=..., já mostra o resultado (ex.: vindo de um link)
function lerTermoDaURL() {
  const termo = new URLSearchParams(window.location.search).get("busca") || "";
  document.getElementById("campo-pesquisa").value = termo;
}


/* ---------- 4. GOOGLE BOOKS ---------- */

function elementoGoogle(id) {
  return document.getElementById(id);
}

// Texto de situação ("Buscando...", erro, resultado) lido por leitores de tela
function mostrarStatusGoogle(texto, { erro = false, ocupado = false } = {}) {
  const status = elementoGoogle("google-status");

  status.textContent = texto;
  status.classList.toggle("google-status-erro", erro);
  elementoGoogle("grade-google").setAttribute("aria-busy", ocupado);
}

// Interrompe o pedido em andamento e faz as respostas dele serem ignoradas
function cancelarBuscaGoogle() {
  googleNumero += 1;
  buscarNoGoogleAtrasado.cancelar();

  if (googleControle) {
    googleControle.abort();
    googleControle = null;
  }
}

// Esconde a seção do Google (busca vazia ou curta demais)
function esconderGoogle() {
  cancelarBuscaGoogle();

  googleLivros = [];
  googleProximoInicio = 0;
  googleTotal = 0;
  googleTermo = "";

  elementoGoogle("secao-google").hidden = true;
  elementoGoogle("grade-google").innerHTML = "";
  elementoGoogle("google-mais").hidden = true;
  elementoGoogle("google-tentar").hidden = true;
  mostrarStatusGoogle("");
}

// Decide se, quando e como buscar no Google Books depois de a pessoa mexer no campo
function agendarBuscaNoGoogle(termo, imediato) {
  const consulta = termo.trim();

  if (consulta.length < GB_MINIMO_TERMO) {
    esconderGoogle();
    return;
  }

  cancelarBuscaGoogle();
  elementoGoogle("secao-google").hidden = false;

  if (imediato) {
    buscarNoGoogle(consulta);
    return;
  }

  // Digitando: se a cota já acabou, avisa em vez de tentar de novo a cada letra
  if (googleSemCota) {
    mostrarStatusGoogle(mensagemDoErroGoogle(new ErroGoogleBooks("cota")), { erro: true });
    elementoGoogle("google-tentar").hidden = false;
    return;
  }

  mostrarStatusGoogle("Buscando no Google Books…", { ocupado: true });
  elementoGoogle("google-tentar").hidden = true;
  elementoGoogle("google-mais").hidden = true;
  buscarNoGoogleAtrasado(consulta);
}

// Um livro do Google que já existe no catálogo da casa não precisa aparecer duas vezes
function duplicadoDoCatalogo(livro) {
  const titulo = normalizarTexto(livro.titulo);

  return livros.some((item) => normalizarTexto(item.titulo) === titulo);
}

function renderizarGoogle() {
  let html = "";
  for (const livro of googleLivros) {
    html += criarCardLivro(livro);
  }
  elementoGoogle("grade-google").innerHTML = html;
}

// Busca (ou busca a próxima página, com maisResultados = true) e mostra o resultado
async function buscarNoGoogle(termo, maisResultados = false) {
  const consulta = termo.trim();

  cancelarBuscaGoogle();
  const controle = new AbortController();
  googleControle = controle;
  const numero = googleNumero;

  googleUltimoFoiMais = maisResultados;
  elementoGoogle("secao-google").hidden = false;
  elementoGoogle("google-tentar").hidden = true;
  elementoGoogle("google-mais").hidden = true;

  // Busca nova: começa do zero. "Carregar mais": continua de onde parou.
  if (!maisResultados || consulta !== googleTermo) {
    googleLivros = [];
    googleProximoInicio = 0;
    googleTotal = 0;
    elementoGoogle("grade-google").innerHTML = "";
  }
  googleTermo = consulta;

  mostrarStatusGoogle("Buscando no Google Books…", { ocupado: true });
  const inicio = googleProximoInicio;

  try {
    const resultado = await buscarLivrosNoGoogle(consulta, { inicio, sinal: controle.signal });

    // Chegou atrasado: a pessoa já mudou a busca
    if (numero !== googleNumero) {
      return;
    }

    googleSemCota = false;
    const jaMostrados = new Set(googleLivros.map((livro) => livro.id));
    for (const livro of resultado.livros) {
      if (!jaMostrados.has(livro.id) && !duplicadoDoCatalogo(livro)) {
        googleLivros.push(livro);
      }
    }
    googleProximoInicio = resultado.proximoInicio;
    googleTotal = resultado.total;

    renderizarGoogle();

    const quantidade = googleLivros.length;
    mostrarStatusGoogle(
      quantidade === 0
        ? `Nenhum livro encontrado no Google Books para “${consulta}”.`
        : `${quantidade} ${plural(quantidade, "livro", "livros")} do Google Books para “${consulta}”.`
    );

    // Só oferece "Carregar mais" se a API entregou algo e ainda há o que buscar
    elementoGoogle("google-mais").hidden = !(googleProximoInicio > inicio && googleProximoInicio < googleTotal);
  } catch (erro) {
    // Cancelada de propósito, ou já existe uma busca mais nova: não é erro para mostrar
    if (ehCancelamento(erro) || numero !== googleNumero) {
      return;
    }

    googleSemCota = erro instanceof ErroGoogleBooks && erro.tipo === "cota";
    mostrarStatusGoogle(mensagemDoErroGoogle(erro), { erro: true });
    elementoGoogle("google-tentar").hidden = false;
  }
}


/* ---------- 5. MINHA LISTA ---------- */

// Acha o livro pelo id: catálogo, guardados ou resultados do Google na tela
function livroDoCard(id) {
  return buscarLivro(id) || googleLivros.find((livro) => livro.id === id);
}

// "+ Adicionar à minha lista" ↔ "✓ Na minha lista"
function alternarLista(botao) {
  const id = botao.dataset.livroId;
  const livro = livroDoCard(id);

  if (!livro) {
    return;
  }

  const estavaNaLista = minhaLista.includes(id);

  // Livro do Google precisa ser guardado na conta antes de entrar na lista
  if (!estavaNaLista && !buscarLivro(id) && !registrarLivroExterno(livro)) {
    mostrarAviso(`Você já guardou ${MAX_LIVROS_EXTERNOS} livros do Google Books. Remova algum da lista para adicionar outro.`);
    return;
  }

  // Adicionar = "quero ler"; remover tira o livro de qualquer status de leitura
  definirStatus(id, estavaNaLista ? "" : "quero-ler");

  const naLista = !estavaNaLista;
  botao.classList.toggle("salvo", naLista);
  botao.setAttribute("aria-pressed", naLista);
  botao.textContent = naLista ? "✓ Na minha lista" : "+ Adicionar à minha lista";

  atualizarContadorLista();
  mostrarAviso(naLista ? `${livro.titulo} entrou na sua lista.` : `${livro.titulo} saiu da sua lista.`);
}


/* ---------- 6. EVENTOS E INÍCIO ---------- */

function configurarEventosPesquisa() {
  const formulario = document.querySelector(".busca-form");
  const campo = document.getElementById("campo-pesquisa");

  // Busca enquanto digita (no Google, só depois de uma pausa)
  campo.addEventListener("input", () => pesquisar());

  // Enter ou botão "Pesquisar": não recarrega a página
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    pesquisar({ imediato: true });
  });

  // Buscas populares: preenchem o campo em vez de recarregar a página
  for (const chip of document.querySelectorAll(".chip")) {
    chip.addEventListener("click", (evento) => {
      evento.preventDefault();
      campo.value = chip.textContent.trim();
      pesquisar({ imediato: true });
    });
  }

  // Botões dos cards (um único "ouvinte" em cada grade)
  for (const id of ["grade-livros", "grade-google"]) {
    document.getElementById(id).addEventListener("click", (evento) => {
      const botao = evento.target.closest("[data-livro-id]");
      if (botao) {
        alternarLista(botao);
      }
    });
  }

  // O ícone de pesquisa do topo leva o cursor ao campo (nesta página ele só recarregava a página)
  const iconeDoTopo = document.querySelector('.topo-acoes a[href="#campo-pesquisa"]');
  if (iconeDoTopo) {
    iconeDoTopo.addEventListener("click", (evento) => {
      evento.preventDefault();
      campo.scrollIntoView({ block: "center" });
      campo.focus();
    });
  }

  elementoGoogle("google-mais").addEventListener("click", () => buscarNoGoogle(googleTermo, true));
  elementoGoogle("google-tentar").addEventListener("click", () => {
    buscarNoGoogle(googleTermo || campo.value, googleUltimoFoiMais && googleLivros.length > 0);
  });
}

function iniciarPesquisa() {
  lerTermoDaURL();
  configurarEventosPesquisa();

  const termo = document.getElementById("campo-pesquisa").value;
  renderizarLivros(filtrarLivros(termo), termo);
  agendarBuscaNoGoogle(termo, true);

  // Se outra aba mudar a lista, os botões desta página acompanham (sem perder a busca)
  aoMudarDados.push(() => {
    const termoAtual = document.getElementById("campo-pesquisa").value;
    renderizarLivros(filtrarLivros(termoAtual), termoAtual);
    renderizarGoogle();
  });
}

iniciarPesquisa();
