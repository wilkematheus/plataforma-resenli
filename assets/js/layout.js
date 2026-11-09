/* ==========================================================
   RESENLI — Partes comuns das páginas internas
   (proteção de acesso, perfil, menu da conta, botão Sair,
   botão flutuante de nova resenha, contador da Minha lista)
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

// Encerra a sessão e volta para a tela de entrar
function sair() {
  encerrarSessao();
  window.location.href = "entrar.html";
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

// O avatar do topo vira um botão que abre o menu da conta (nome, atalho e Sair).
// No celular a barra lateral some, então este é o único lugar para sair da conta.
function criarMenuDoPerfil() {
  const avatar = document.querySelector(".topo-acoes .avatar-pequeno");

  if (!avatar) {
    return;
  }

  const envoltorio = document.createElement("div");
  envoltorio.className = "menu-perfil";
  envoltorio.innerHTML = `
    <button class="avatar avatar-perfil avatar-pequeno menu-perfil-botao" type="button"
      aria-expanded="false" aria-controls="menu-perfil-painel" aria-label="Menu da conta"></button>
    <div class="menu-perfil-painel" id="menu-perfil-painel" hidden>
      <p class="menu-perfil-quem">
        <strong class="perfil-nome"></strong>
        <small class="perfil-usuario"></small>
      </p>
      <a class="menu-perfil-item" href="minhas-avaliacoes.html">Minhas avaliações</a>
      <button class="menu-perfil-item" type="button" data-acao="sair">Sair</button>
    </div>
  `;
  avatar.replaceWith(envoltorio);

  const botao = envoltorio.querySelector(".menu-perfil-botao");
  const painel = envoltorio.querySelector(".menu-perfil-painel");

  const abrir = (aberto) => {
    painel.hidden = !aberto;
    botao.setAttribute("aria-expanded", aberto);
  };

  botao.addEventListener("click", () => abrir(painel.hidden));
  envoltorio.querySelector('[data-acao="sair"]').addEventListener("click", sair);

  // Clicar fora fecha
  document.addEventListener("click", (evento) => {
    if (!envoltorio.contains(evento.target)) {
      abrir(false);
    }
  });

  // Esc fecha e devolve o foco ao botão; levar o foco para outro lugar da página também fecha
  envoltorio.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !painel.hidden) {
      abrir(false);
      botao.focus();
    }
  });
  envoltorio.addEventListener("focusout", (evento) => {
    if (evento.relatedTarget && !envoltorio.contains(evento.relatedTarget)) {
      abrir(false);
    }
  });
}

// No celular o botão "Nova resenha" do topo some: este botão flutuante fica no lugar,
// em todas as páginas (o Início já traz o seu no HTML). No computador ele fica escondido pelo CSS.
function criarBotaoNovaResenha() {
  if (document.querySelector(".botao-flutuante")) {
    return;
  }

  const link = document.createElement("a");
  link.className = "botao-flutuante";
  link.href = "minhas-avaliacoes.html?nova=1";
  link.setAttribute("data-abrir-formulario", "");
  link.innerHTML = `
    <svg class="icone" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
    Nova resenha
  `;
  document.body.appendChild(link);
}

// O link "Sair" da barra lateral encerra a sessão antes de ir para a tela de entrar
function configurarSair() {
  for (const link of document.querySelectorAll(".perfil-sair")) {
    link.addEventListener("click", encerrarSessao);
  }
}

// Outra aba entrou, saiu ou trocou de conta: esta página acompanha
function tratarMudancaDeSessao(evento) {
  if (evento.key !== CHAVE_SESSAO && evento.key !== null) {
    return;
  }

  const nova = obterSessao();

  if (!nova) {
    window.location.replace("entrar.html");
  } else if (!sessaoAtual || nova.email !== sessaoAtual.email) {
    // Outra conta no mesmo navegador: recarrega para mostrar os dados dela, não os desta
    window.location.reload();
  }
}

function iniciarLayout() {
  protegerPagina();
  criarMenuDoPerfil();
  criarBotaoNovaResenha();
  preencherPerfil();
  atualizarContadorLista();
  configurarSair();

  window.addEventListener("storage", tratarMudancaDeSessao);
  aoMudarDados.push(atualizarContadorLista);
}

iniciarLayout();
