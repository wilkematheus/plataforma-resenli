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
