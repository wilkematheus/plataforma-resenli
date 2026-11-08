/* ==========================================================
   RESENLI — Funções utilitárias (compartilhadas por todas as páginas)
   ========================================================== */


/* ---------- 1. BUSCA NOS DADOS ---------- */

// Encontra um livro do catálogo pelo id (ex.: "torto-arado")
function buscarLivro(id) {
  return livros.find((livro) => livro.id === id);
}

// Encontra um livro do catálogo pelo título
function buscarLivroPorTitulo(titulo) {
  return livros.find((livro) => livro.titulo === titulo);
}


/* ---------- 2. TEXTO ---------- */

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

// "Matheus Wilke" → "MW" (primeira letra do primeiro e do último nome)
function gerarIniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";

  return (primeira + ultima).toUpperCase();
}

// Escolhe entre singular e plural: plural(1, "livro", "livros") → "livro"
function plural(quantidade, singular, varios) {
  return quantidade === 1 ? singular : varios;
}


/* ---------- 3. NÚMEROS ---------- */

// 4.8 → "4,8"
function formatarDecimal(numero) {
  return numero.toFixed(1).replace(".", ",");
}

// 1864 → "1.864" | 12400 → "12,4 mil"
function formatarMilhar(numero) {
  if (numero >= 10000) {
    return `${formatarDecimal(numero / 1000).replace(",0", "")} mil`;
  }

  return numero.toLocaleString("pt-BR");
}


/* ---------- 4. DATAS ---------- */

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

// Data de hoje por extenso: "Domingo, 8 de novembro"
function formatarDataExtensa(data) {
  const texto = data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // O navegador devolve "domingo, 8 de novembro": deixa a primeira letra maiúscula
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Quanto tempo passou desde a data: "Há 18 minutos", "Há 2 horas", "Há 1 ano"
function formatarTempoRelativo(data) {
  const minutos = Math.floor((Date.now() - data.getTime()) / 60000);

  if (minutos < 1) {
    return "Agora mesmo";
  }

  const unidades = [
    { limite: 60, tamanho: 1, singular: "minuto", plural: "minutos" },
    { limite: 60 * 24, tamanho: 60, singular: "hora", plural: "horas" },
    { limite: 60 * 24 * 30, tamanho: 60 * 24, singular: "dia", plural: "dias" },
    { limite: 60 * 24 * 365, tamanho: 60 * 24 * 30, singular: "mês", plural: "meses" },
    { limite: Infinity, tamanho: 60 * 24 * 365, singular: "ano", plural: "anos" },
  ];

  const unidade = unidades.find((item) => minutos < item.limite);
  const quantidade = Math.floor(minutos / unidade.tamanho);

  return `Há ${quantidade} ${plural(quantidade, unidade.singular, unidade.plural)}`;
}


/* ---------- 5. PEDAÇOS DE HTML ---------- */

// 4 → <p class="estrelas" aria-label="Avaliação: 4 de 5 estrelas">★★★★☆</p>
function renderizarEstrelas(nota) {
  const cheias = "★".repeat(nota);
  const vazias = "☆".repeat(5 - nota);

  return `<p class="estrelas" aria-label="Avaliação: ${nota} de 5 estrelas">${cheias}${vazias}</p>`;
}

// 4.8 → estrelas arredondadas + o número ao lado, como nos cards de livro
function renderizarNotaMedia(media) {
  const arredondada = Math.round(media);
  const texto = formatarDecimal(media);

  return `
    <p class="estrelas" aria-label="Avaliação média: ${texto} de 5 estrelas">
      ${"★".repeat(arredondada)}${"☆".repeat(5 - arredondada)}
      <span class="nota-media">${texto}</span>
    </p>
  `;
}

// Capa desenhada em CSS (a mesma usada em todas as páginas)
function criarCapa(livro) {
  const titulo = escaparHTML(livro.titulo);
  const autor = escaparHTML(livro.autor);

  return `
    <figure class="capa-livro">
      <div class="capa ${escaparHTML(livro.capa)}" role="img" aria-label="Capa do livro ${titulo}">
        <span class="capa-marca" aria-hidden="true">R</span>
        <strong class="capa-titulo">${titulo}</strong>
        <small class="capa-autor">${autor}</small>
      </div>
    </figure>
  `;
}


/* ---------- 6. AVISOS ---------- */

// Mostra uma mensagem rápida no canto da tela (ex.: "Resenha excluída").
// Com `acao` ({ rotulo, aoClicar }) o aviso ganha um botão e fica mais tempo na tela.
function mostrarAviso(mensagem, acao) {
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
  aviso.classList.toggle("aviso-com-acao", Boolean(acao));

  if (acao) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "aviso-acao";
    botao.textContent = acao.rotulo;
    botao.addEventListener("click", () => {
      aviso.classList.remove("visivel");
      acao.aoClicar();
    });
    aviso.appendChild(botao);
  }

  // Reinicia o tempo caso outro aviso apareça antes de sumir
  // (com botão, dá mais tempo para a pessoa ler e decidir)
  clearTimeout(aviso.temporizador);
  aviso.temporizador = setTimeout(() => {
    aviso.classList.remove("visivel");
  }, acao ? 7000 : 3000);
}
