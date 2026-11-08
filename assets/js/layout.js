/* ==========================================================
   RESENLI — Partes comuns das páginas internas
   (proteção de acesso, perfil, botão Sair, contador da Minha lista)
   Precisa ser carregado depois de utils.js e conta.js.
   ========================================================== */

/* ---------- 1. SESSÃO ---------- */

// Quem está logado. Sem sessão, a página é redirecionada logo abaixo;
// o "Visitante" só evita erros nos outros scripts até o redirecionamento acontecer.
const sessaoAtual = obterSessao();
let usuario = sessaoAtual || { nome: "Visitante", usuario: "visitante" };

// Páginas internas exigem login: sem sessão, volta para a tela de entrar
function protegerPagina() {
  if (!sessaoAtual) {
    window.location.replace("entrar.html");
  }
}


/* ---------- 2. PERFIL E MENU ---------- */

// Nome, @usuário e iniciais do avatar, em todos os lugares da página
function preencherPerfil() {
  const iniciais = gerarIniciais(usuario.nome);

  for (const nome of document.querySelectorAll(".perfil-nome")) {
    nome.textContent = usuario.nome;
  }
  for (const apelido of document.querySelectorAll(".perfil-usuario")) {
    apelido.textContent = `@${usuario.usuario}`;
  }
  for (const avatar of document.querySelectorAll(".avatar-perfil")) {
    avatar.textContent = iniciais;
  }
}

// Número ao lado de "Minha lista" no menu (some quando a lista está vazia)
function atualizarContadorLista() {
  for (const contador of document.querySelectorAll(".nav-contador")) {
    contador.textContent = minhaLista.length;
    // style.display (e não "hidden"), porque o CSS do contador já define display: flex
    contador.style.display = minhaLista.length === 0 ? "none" : "";
  }
}

// O link "Sair" encerra a sessão antes de ir para a tela de entrar
function configurarSair() {
  for (const link of document.querySelectorAll(".perfil-sair")) {
    link.addEventListener("click", encerrarSessao);
  }
}

function iniciarLayout() {
  protegerPagina();
  preencherPerfil();
  atualizarContadorLista();
  configurarSair();
}

iniciarLayout();
