/* ==========================================================
   RESENLI — Tema claro e escuro (todas as páginas)

   Carregado no <head>, antes de a página ser desenhada, para não
   piscar o tema claro antes de trocar para o escuro.

   Guarda só a escolha ("claro" ou "escuro") no localStorage, como um
   texto simples. Sem escolha salva, segue o tema do sistema.
   ========================================================== */

const CHAVE_TEMA = "resenli:tema";

function lerTemaSalvo() {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    return salvo === "claro" || salvo === "escuro" ? salvo : null;
  } catch (erro) {
    return null;
  }
}

function temaDoSistema() {
  const escuro = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  return escuro ? "escuro" : "claro";
}

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;

  const botao = document.querySelector(".botao-tema");
  if (botao) {
    const escuro = tema === "escuro";
    botao.setAttribute("aria-pressed", escuro);
    botao.setAttribute("aria-label", escuro ? "Desativar modo escuro" : "Ativar modo escuro");
    botao.innerHTML = escuro ? ICONE_SOL : ICONE_LUA;
  }
}

function alternarTema() {
  const novo = document.documentElement.dataset.tema === "escuro" ? "claro" : "escuro";

  aplicarTema(novo);
  try {
    localStorage.setItem(CHAVE_TEMA, novo);
  } catch (erro) {
    // Sem armazenamento, a escolha vale só até recarregar a página
  }
}

const ICONE_LUA =
  '<svg class="icone" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>';

const ICONE_SOL =
  '<svg class="icone" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="4" />' +
  '<path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />' +
  "</svg>";

// Cria o botão: no topo das páginas internas ou, nas demais, no canto da tela
function criarBotaoTema() {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "botao-icone botao-tema";
  botao.addEventListener("click", alternarTema);

  const acoes = document.querySelector(".topo-acoes");
  if (acoes) {
    acoes.prepend(botao);
  } else {
    botao.classList.add("botao-tema-flutuante");
    document.body.appendChild(botao);
  }

  aplicarTema(document.documentElement.dataset.tema);
}

// Roda já, no <head>
document.documentElement.dataset.tema = lerTemaSalvo() || temaDoSistema();
document.addEventListener("DOMContentLoaded", criarBotaoTema);
