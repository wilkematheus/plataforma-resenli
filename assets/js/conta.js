/* ==========================================================
   RESENLI — Contas e sessão (compartilhado por todas as páginas)

   Único ponto do programa que usa localStorage: guarda as contas
   criadas e quem está logado. Resenhas e lista seguem em memória.

   Atenção: isto é um protótipo. Sem servidor, tudo fica no navegador
   e qualquer pessoa com acesso a ele consegue ler esses dados.
   Por isso a senha nunca é guardada: só um "resumo" dela (hash).
   ========================================================== */

const CHAVE_CONTAS = "resenli:contas";
const CHAVE_SESSAO = "resenli:sessao";


/* ---------- 1. LEITURA E GRAVAÇÃO ---------- */

// Lê um valor guardado. Devolve o padrão se não existir, estiver corrompido
// ou se o navegador bloquear o armazenamento (ex.: janela anônima).
function lerArmazenado(chave, padrao) {
  try {
    const texto = localStorage.getItem(chave);
    return texto === null ? padrao : JSON.parse(texto);
  } catch (erro) {
    return padrao;
  }
}

// Guarda um valor. Devolve false se não foi possível salvar.
function gravarArmazenado(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (erro) {
    return false;
  }
}


/* ---------- 2. SENHA ---------- */

// Transforma bytes em texto hexadecimal: [255, 0] → "ff00"
function bytesParaHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Sorteia um "sal": texto aleatório que deixa duas senhas iguais com hashes diferentes
function gerarSal() {
  return bytesParaHex(crypto.getRandomValues(new Uint8Array(16)));
}

// Senha + sal → resumo SHA-256. Só funciona em https ou localhost.
async function gerarHashSenha(senha, sal) {
  if (!window.crypto || !crypto.subtle) {
    throw new Error("sem-criptografia");
  }

  const dados = new TextEncoder().encode(sal + senha);
  const resumo = await crypto.subtle.digest("SHA-256", dados);

  return bytesParaHex(new Uint8Array(resumo));
}


/* ---------- 3. CONTAS ---------- */

function obterContas() {
  const contas = lerArmazenado(CHAVE_CONTAS, []);

  return Array.isArray(contas) ? contas : [];
}

// E-mails são tratados sem maiúsculas e sem espaços nas pontas
function normalizarEmail(email) {
  return String(email).trim().toLowerCase();
}

function buscarContaPorEmail(email) {
  const procurado = normalizarEmail(email);

  return obterContas().find((conta) => conta.email === procurado);
}

// "Matheus Wilke" → "matheuswilke" (se já existir, vira "matheuswilke2", "matheuswilke3"...)
function gerarNomeUsuario(nome, contas) {
  const base = normalizarTexto(nome).replace(/[^a-z0-9]/g, "") || "leitor";
  let candidato = base;
  let numero = 1;

  while (contas.some((conta) => conta.usuario === candidato)) {
    numero += 1;
    candidato = base + numero;
  }

  return candidato;
}

// Cria a conta. Devolve { ok: true, conta } ou { ok: false, erro: "..." }.
async function cadastrarConta(nome, email, senha) {
  const contas = obterContas();

  if (buscarContaPorEmail(email)) {
    return { ok: false, campo: "email", erro: "Já existe uma conta com este e-mail. Que tal entrar?" };
  }

  let sal;
  let hash;
  try {
    sal = gerarSal();
    hash = await gerarHashSenha(senha, sal);
  } catch (erro) {
    return { ok: false, erro: "Não foi possível proteger a senha. Abra o site por https ou localhost." };
  }

  const conta = {
    nome: nome.trim(),
    usuario: gerarNomeUsuario(nome, contas),
    email: normalizarEmail(email),
    sal,
    hash,
  };

  contas.push(conta);
  if (!gravarArmazenado(CHAVE_CONTAS, contas)) {
    return { ok: false, erro: "Seu navegador não permitiu salvar a conta. Verifique se o armazenamento está liberado." };
  }

  return { ok: true, conta };
}

// Confere e-mail e senha. A mensagem de erro é a mesma nos dois casos,
// para não revelar quais e-mails têm conta.
async function validarLogin(email, senha) {
  const conta = buscarContaPorEmail(email);
  const erroPadrao = { ok: false, erro: "E-mail ou senha incorretos." };

  if (!conta) {
    return erroPadrao;
  }

  let hash;
  try {
    hash = await gerarHashSenha(senha, conta.sal);
  } catch (erro) {
    return { ok: false, erro: "Não foi possível verificar a senha. Abra o site por https ou localhost." };
  }

  return hash === conta.hash ? { ok: true, conta } : erroPadrao;
}


/* ---------- 4. SESSÃO ---------- */

// Quem está logado: { nome, usuario, email } ou null
function obterSessao() {
  const sessao = lerArmazenado(CHAVE_SESSAO, null);
  const valida = sessao && typeof sessao.nome === "string" && typeof sessao.usuario === "string";

  return valida ? sessao : null;
}

// Guarda só o necessário: nunca o hash nem o sal
function iniciarSessao(conta) {
  return gravarArmazenado(CHAVE_SESSAO, {
    nome: conta.nome,
    usuario: conta.usuario,
    email: conta.email,
  });
}

function encerrarSessao() {
  try {
    localStorage.removeItem(CHAVE_SESSAO);
  } catch (erro) {
    // Sem armazenamento não há sessão para apagar
  }
}
