/* ==========================================================
   RESENLI — Partes comuns das páginas internas
   (perfil na barra lateral e no topo, contador da Minha lista)
   ========================================================== */

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

function iniciarLayout() {
  preencherPerfil();
  atualizarContadorLista();
}

iniciarLayout();
