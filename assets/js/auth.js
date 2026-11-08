/* ==========================================================
   RESENLI — Páginas Criar conta (index.html) e Entrar (entrar.html)
   ========================================================== */

const TAMANHO_MINIMO_SENHA = 6;


/* ---------- 1. VALIDAÇÃO ---------- */

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Mostra a mensagem embaixo do campo (ou no aviso geral do formulário, se campo for "formulario")
function mostrarErroCampo(campo, mensagem) {
  const erro = document.getElementById(`erro-${campo}`);
  erro.textContent = mensagem;

  if (campo !== "formulario") {
    document.getElementById(`campo-${campo}`).setAttribute("aria-invalid", "true");
  }
}

function limparErrosForm(formulario) {
  for (const erro of formulario.querySelectorAll(".campo-erro")) {
    erro.textContent = "";
  }
  for (const campo of formulario.querySelectorAll("[aria-invalid]")) {
    campo.removeAttribute("aria-invalid");
  }
}

// Leva o foco ao primeiro campo com erro (quem usa leitor de tela é avisado do problema)
function focarPrimeiroErro(formulario) {
  const primeiro = formulario.querySelector("[aria-invalid]");

  if (primeiro) {
    primeiro.focus();
  }
}

// Evita enviar duas vezes enquanto a senha está sendo processada
function bloquearBotao(formulario, bloqueado, textoOcupado) {
  const botao = formulario.querySelector('button[type="submit"]');

  if (bloqueado) {
    botao.dataset.textoOriginal = botao.textContent;
    botao.textContent = textoOcupado;
  } else {
    botao.textContent = botao.dataset.textoOriginal;
  }
  botao.disabled = bloqueado;
}


/* ---------- 2. CRIAR CONTA ---------- */

function validarCadastro(dados) {
  const erros = {};

  if (dados.nome.trim().length < 2) {
    erros.nome = "Digite como podemos te chamar.";
  }
  if (!emailValido(dados.email)) {
    erros.email = "Digite um e-mail válido, como voce@email.com.";
  }
  if (dados.senha.length < TAMANHO_MINIMO_SENHA) {
    erros.senha = `A senha precisa ter no mínimo ${TAMANHO_MINIMO_SENHA} caracteres.`;
  }

  return erros;
}

async function criarConta(evento) {
  // Impede o envio padrão: antes, a senha ia parar no endereço da página
  evento.preventDefault();

  const formulario = evento.currentTarget;
  const dados = {
    nome: document.getElementById("campo-nome").value,
    email: document.getElementById("campo-email").value,
    senha: document.getElementById("campo-senha").value,
  };

  limparErrosForm(formulario);

  const erros = validarCadastro(dados);
  for (const campo in erros) {
    mostrarErroCampo(campo, erros[campo]);
  }
  if (Object.keys(erros).length > 0) {
    focarPrimeiroErro(formulario);
    return;
  }

  bloquearBotao(formulario, true, "Criando conta...");
  const resultado = await cadastrarConta(dados.nome, dados.email, dados.senha);

  if (!resultado.ok) {
    bloquearBotao(formulario, false);
    mostrarErroCampo(resultado.campo || "formulario", resultado.erro);
    focarPrimeiroErro(formulario);
    return;
  }

  iniciarSessao(resultado.conta);
  window.location.href = "inicio.html";
}


/* ---------- 3. ENTRAR ---------- */

function validarEntrada(dados) {
  const erros = {};

  if (!emailValido(dados.email)) {
    erros.email = "Digite o e-mail da sua conta.";
  }
  if (dados.senha === "") {
    erros.senha = "Digite a sua senha.";
  }

  return erros;
}

async function entrar(evento) {
  evento.preventDefault();

  const formulario = evento.currentTarget;
  const dados = {
    email: document.getElementById("campo-email").value,
    senha: document.getElementById("campo-senha").value,
  };

  limparErrosForm(formulario);

  const erros = validarEntrada(dados);
  for (const campo in erros) {
    mostrarErroCampo(campo, erros[campo]);
  }
  if (Object.keys(erros).length > 0) {
    focarPrimeiroErro(formulario);
    return;
  }

  bloquearBotao(formulario, true, "Entrando...");
  const resultado = await validarLogin(dados.email, dados.senha);

  if (!resultado.ok) {
    bloquearBotao(formulario, false);
    mostrarErroCampo("formulario", resultado.erro);
    document.getElementById("campo-senha").focus();
    return;
  }

  iniciarSessao(resultado.conta);
  window.location.href = "inicio.html";
}


/* ---------- 4. INÍCIO ---------- */

function iniciarAuth() {
  // Quem já está logado não precisa ver o login de novo
  if (obterSessao()) {
    window.location.replace("inicio.html");
    return;
  }

  const formulario = document.getElementById("formulario-auth");

  // A página decide a ação: o cadastro tem o campo "nome", o login não
  const ehCadastro = document.getElementById("campo-nome") !== null;
  formulario.addEventListener("submit", ehCadastro ? criarConta : entrar);
}

iniciarAuth();
