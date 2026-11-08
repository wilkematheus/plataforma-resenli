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


/* ---------- 6. CONTROLE DA TELA ---------- */

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
}

// Ponto de partida: roda quando a página carrega
function iniciar() {
  // Só roda na página que tem a lista de resenhas
  if (!document.getElementById("lista-resenhas")) {
    return;
  }

  configurarEventos();
  atualizarTela();
}

iniciar();
