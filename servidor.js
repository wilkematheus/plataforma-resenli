#!/usr/bin/env node
/* ==========================================================
   RESENLI — Servidor local de desenvolvimento

   Serve os arquivos do site e entrega a chave da API do Google Books
   lida da variável de ambiente GOOGLE_BOOKS_CHAVE, para que a chave
   não precise ficar escrita no código nem no Git.

   Como usar:
     1. Defina a variável de usuário do Windows (uma vez só):
          setx GOOGLE_BOOKS_CHAVE "sua-chave-aqui"
        e abra um terminal NOVO (a variável só vale para programas
        iniciados depois de definida).
     2. Na pasta do projeto:   node servidor.js    (ou:  npm start)
     3. Abra  http://127.0.0.1:5500

   Opcional: mudar a porta   ($env:PORT = 5501; node servidor.js)

   Como funciona: o navegador não enxerga variáveis de ambiente. Este
   servidor responde ao pedido de /assets/js/config.js com um arquivo
   gerado na hora, contendo a chave da variável. O config.js do disco
   (com a chave vazia) é usado só quando o site é aberto sem este servidor.

   Atenção: o navegador recebe a chave, então ela continua visível
   para quem abrir o site. Restrinja a chave no Google Cloud
   (Referenciadores HTTP + só a Books API).

   Sem dependências: usa apenas módulos do próprio Node.
   ========================================================== */

"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = __dirname;
const HOST = "127.0.0.1"; // só esta máquina enxerga o servidor (não fica aberto na rede)
const PORTA_PADRAO = 5500; // a mesma do Live Server, que já está nas restrições da chave

// A chave tem só letras, números, "_" e "-". Qualquer outra coisa é rejeitada:
// o valor vai para dentro de um arquivo JavaScript e não pode carregar código.
const FORMATO_DA_CHAVE = /^[A-Za-z0-9_-]{20,100}$/;

const CAMINHO_DO_CONFIG = "/assets/js/config.js";

// Só estes tipos de arquivo são entregues (o resto responde 404)
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

// Arquivos do projeto que nunca devem ser entregues ao navegador
const NUNCA_ENTREGAR = new Set(["servidor.js"]);


/* ---------- 1. CHAVE ---------- */

// Lê a chave da variável de ambiente. Devolve { chave, aviso }.
function lerChaveDoAmbiente(ambiente = process.env) {
  const valor = (ambiente.GOOGLE_BOOKS_CHAVE || "").trim();

  if (valor === "") {
    return { chave: "", aviso: "A variável de ambiente GOOGLE_BOOKS_CHAVE não está definida." };
  }
  if (!FORMATO_DA_CHAVE.test(valor)) {
    return { chave: "", aviso: "GOOGLE_BOOKS_CHAVE tem caracteres ou tamanho inesperados e foi ignorada." };
  }

  return { chave: valor, aviso: "" };
}

// O arquivo config.js entregue ao navegador (a chave já foi validada)
function gerarConfig(chave) {
  return [
    "/* Gerado por servidor.js a partir da variável de ambiente GOOGLE_BOOKS_CHAVE. */",
    `const GOOGLE_BOOKS_CHAVE = ${JSON.stringify(chave)};`,
    "",
  ].join("\n");
}


/* ---------- 2. ARQUIVOS ---------- */

// Transforma o caminho da URL num arquivo dentro do projeto, ou null se não for permitido
function caminhoDoArquivo(caminhoDaUrl) {
  let decodificado;
  try {
    decodificado = decodeURIComponent(caminhoDaUrl);
  } catch (erro) {
    return null; // %-codificação inválida
  }

  // "\" é separador de pasta no Windows: "..\segredo" também sairia da pasta do site
  if (decodificado.includes("\0") || decodificado.includes("\\")) {
    return null;
  }

  const partes = decodificado.split("/").filter(Boolean);

  // Pastas e arquivos ocultos (.git, .env...) e "../" nunca são entregues
  if (partes.some((parte) => parte.startsWith(".") || parte === "node_modules")) {
    return null;
  }

  const alvo = path.join(RAIZ, ...(partes.length === 0 ? ["index.html"] : partes));
  const relativo = path.relative(RAIZ, alvo);

  if (relativo === "" || relativo.startsWith("..") || path.isAbsolute(relativo)) {
    return null;
  }
  if (NUNCA_ENTREGAR.has(relativo) || !TIPOS[path.extname(alvo).toLowerCase()]) {
    return null;
  }

  return alvo;
}

function responder(resposta, status, tipo, corpo, extras = {}) {
  resposta.writeHead(status, {
    "Content-Type": tipo,
    "Content-Length": Buffer.byteLength(corpo),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-cache",
    ...extras,
  });
  resposta.end(corpo);
}

function naoEncontrado(resposta) {
  responder(resposta, 404, "text/plain; charset=utf-8", "Não encontrado");
}


/* ---------- 3. SERVIDOR ---------- */

// Cria o servidor. `chave` é a chave já validada ("" = sem chave).
function criarServidor({ chave = "" } = {}) {
  return http.createServer((pedido, resposta) => {
    if (pedido.method !== "GET" && pedido.method !== "HEAD") {
      responder(resposta, 405, "text/plain; charset=utf-8", "Método não permitido", { Allow: "GET, HEAD" });
      return;
    }

    // Só o caminho interessa (sem ?consulta nem #âncora)
    const caminhoDaUrl = String(pedido.url || "").split("#")[0].split("?")[0];
    if (!caminhoDaUrl.startsWith("/")) {
      naoEncontrado(resposta);
      return;
    }

    // A chave nunca fica em cache: se a variável mudar, o próximo carregamento já vem certo
    if (caminhoDaUrl === CAMINHO_DO_CONFIG) {
      const corpo = pedido.method === "HEAD" ? "" : gerarConfig(chave);
      resposta.writeHead(200, {
        "Content-Type": TIPOS[".js"],
        "Content-Length": Buffer.byteLength(gerarConfig(chave)),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      });
      resposta.end(corpo);
      return;
    }

    const arquivo = caminhoDoArquivo(caminhoDaUrl);
    if (!arquivo) {
      naoEncontrado(resposta);
      return;
    }

    fs.stat(arquivo, (erro, info) => {
      if (erro || !info.isFile()) {
        naoEncontrado(resposta);
        return;
      }

      resposta.writeHead(200, {
        "Content-Type": TIPOS[path.extname(arquivo).toLowerCase()],
        "Content-Length": info.size,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      });

      if (pedido.method === "HEAD") {
        resposta.end();
        return;
      }

      const leitura = fs.createReadStream(arquivo);
      leitura.on("error", () => resposta.destroy());
      leitura.pipe(resposta);
    });
  });
}

function lerPorta(ambiente = process.env) {
  if (ambiente.PORT === undefined || ambiente.PORT === "") {
    return PORTA_PADRAO;
  }

  const porta = Number(ambiente.PORT);
  return Number.isInteger(porta) && porta >= 0 && porta <= 65535 ? porta : null;
}

function iniciar() {
  const porta = lerPorta();
  if (porta === null) {
    console.error(`PORT inválida: "${process.env.PORT}". Use um número de 0 a 65535.`);
    process.exit(1);
  }

  const { chave, aviso } = lerChaveDoAmbiente();
  const servidor = criarServidor({ chave });

  servidor.on("error", (erro) => {
    if (erro.code === "EADDRINUSE") {
      console.error(`A porta ${porta} já está em uso (o Live Server pode estar aberto).`);
      console.error('Feche o outro programa ou escolha outra porta:  $env:PORT = 5501; node servidor.js');
    } else {
      console.error("Não foi possível iniciar o servidor:", erro.message);
    }
    process.exit(1);
  });

  servidor.listen(porta, HOST, () => {
    console.log(`Resenli em  http://${HOST}:${servidor.address().port}`);

    if (chave) {
      console.log(`Chave do Google Books: lida de GOOGLE_BOOKS_CHAVE (${chave.length} caracteres).`);
    } else {
      console.warn(`Aviso: ${aviso}`);
      console.warn("A busca do Google Books vai usar o limite gratuito compartilhado e pode falhar.");
      console.warn('Defina a variável e abra um terminal novo:  setx GOOGLE_BOOKS_CHAVE "sua-chave"');
    }
    console.log("Para parar: Ctrl+C");
  });
}

if (require.main === module) {
  iniciar();
}

module.exports = { criarServidor, lerChaveDoAmbiente, gerarConfig, caminhoDoArquivo, lerPorta, FORMATO_DA_CHAVE };
