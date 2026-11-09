/* ==========================================================
   RESENLI — Funções utilitárias (compartilhadas por todas as páginas)
   ========================================================== */


/* ---------- 1. BUSCA NOS DADOS ---------- */

// Encontra um livro pelo id: primeiro no catálogo fixo (ex.: "torto-arado"),
// depois entre os que vieram do Google Books e foram guardados
function buscarLivro(id) {
  const doCatalogo = livros.find((livro) => livro.id === id);

  if (doCatalogo) {
    return doCatalogo;
  }

  return Object.prototype.hasOwnProperty.call(livrosExternos, id) ? livrosExternos[id] : undefined;
}

// Encontra um livro do catálogo fixo pelo título (usado para migrar resenhas antigas)
function buscarLivroPorTitulo(titulo) {
  return livros.find((livro) => livro.titulo === titulo);
}

// Todos os livros que a pessoa pode escolher: catálogo fixo + os do Google Books guardados
function todosOsLivros() {
  return [...livros, ...Object.values(livrosExternos)];
}

// Duas resenhas (ou uma resenha e um livro) são do mesmo livro?
// Compara pelo id; resenhas antigas, sem id de livro, caem na comparação pelo título.
function mesmoLivro(a, b) {
  if (a.livroId && b.livroId) {
    return a.livroId === b.livroId;
  }

  return a.livro === b.livro;
}

// A resenha da pessoa sobre este livro, se existir
function resenhaDoLivro(livro) {
  const procurado = { livroId: livro.id, livro: livro.titulo };

  return resenhas.find((resenha) => mesmoLivro(resenha, procurado));
}

// O livro de uma resenha. Se ele não existir mais (ex.: dado antigo), usa o que a própria resenha guardou.
function livroDaResenha(resenha) {
  return buscarLivro(resenha.livroId) || { titulo: resenha.livro, autor: resenha.autor, capa: resenha.capa };
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
  const partes = String(nome).trim().split(/\s+/).filter(Boolean);

  // Nome vazio: antes virava a palavra "UNDEFINED"
  if (partes.length === 0) {
    return "?";
  }

  // Array.from separa por letra de verdade (um emoji ou letra rara não vira meio caractere)
  const primeira = Array.from(partes[0])[0];
  const ultima = partes.length > 1 ? Array.from(partes[partes.length - 1])[0] : "";

  return (primeira + ultima).toUpperCase();
}

// Escolhe entre singular e plural: plural(1, "livro", "livros") → "livro"
function plural(quantidade, singular, varios) {
  return quantidade === 1 ? singular : varios;
}

// Tira o HTML de um texto vindo de fora (ex.: descrição do Google Books) e deixa só o texto.
// O DOMParser não executa scripts nem carrega imagens: é seguro para isso.
function textoSemHtml(html) {
  const comQuebras = String(html).replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6])\b[^>]*>/gi, " ");
  const documento = new DOMParser().parseFromString(comQuebras, "text/html");

  return (documento.body.textContent || "").replace(/\s+/g, " ").trim();
}

// Corta no limite sem partir uma palavra ao meio e acrescenta "…"
function limitarTexto(texto, limite) {
  if (texto.length <= limite) {
    return texto;
  }

  const corte = texto.slice(0, limite - 1);
  const ultimoEspaco = corte.lastIndexOf(" ");

  return (ultimoEspaco > limite * 0.6 ? corte.slice(0, ultimoEspaco) : corte).trimEnd() + "…";
}

// Executa a função só depois de `espera` ms sem novas chamadas (ex.: digitando na busca)
function atrasar(funcao, espera) {
  let temporizador;

  const atrasada = (...argumentos) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => funcao(...argumentos), espera);
  };
  atrasada.cancelar = () => clearTimeout(temporizador);

  return atrasada;
}


/* ---------- 3. NÚMEROS ---------- */

// 4.8 → "4,8"
function formatarDecimal(numero) {
  return numero.toFixed(1).replace(".", ",");
}

// 1864 → "1.864" | 12400 → "12,4 mil" | 1500000 → "1,5 mi"
function formatarMilhar(numero) {
  const emMil = Math.round(numero / 100) / 10; // arredondado em 1 casa: 999.950 já conta como 1.000 mil

  if (emMil >= 1000) {
    return `${formatarDecimal(numero / 1000000).replace(",0", "")} mi`;
  }
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

// 4.8 → estrelas arredondadas + o número ao lado, como nos cards de livro.
// Livro sem nota (comum no Google Books) mostra um aviso em vez de "0,0".
function renderizarNotaMedia(media) {
  if (!media) {
    return `
      <p class="estrelas estrelas-vazia" aria-label="Ainda sem avaliações">
        <span class="nota-media">Sem avaliações</span>
      </p>
    `;
  }

  const arredondada = Math.round(media);
  const texto = formatarDecimal(media);

  return `
    <p class="estrelas" aria-label="Avaliação média: ${texto} de 5 estrelas">
      ${"★".repeat(arredondada)}${"☆".repeat(5 - arredondada)}
      <span class="nota-media">${texto}</span>
    </p>
  `;
}

// "2019 · 264 páginas · 12,4 mil avaliações" (partes desconhecidas ficam de fora)
function descreverLivro(livro, { paginas = false } = {}) {
  const partes = [];

  if (livro.ano) {
    partes.push(livro.ano);
  }
  if (paginas && livro.paginas) {
    partes.push(`${livro.paginas} páginas`);
  }
  if (livro.totalAvaliacoes) {
    partes.push(`${formatarMilhar(livro.totalAvaliacoes)} ${plural(livro.totalAvaliacoes, "avaliação", "avaliações")}`);
  }

  return partes.join(" · ");
}

// Capa do livro. A capa desenhada em CSS sempre existe; se o livro tiver uma imagem
// (Google Books), ela é colocada por cima. Se a imagem falhar, a desenhada aparece.
function criarCapa(livro) {
  const titulo = escaparHTML(livro.titulo);
  const autor = escaparHTML(livro.autor);
  const imagem = livro.capaUrl
    ? `<img class="capa-imagem" src="${escaparHTML(livro.capaUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
    : "";

  return `
    <figure class="capa-livro">
      <div class="capa ${escaparHTML(livro.capa)}" role="img" aria-label="Capa do livro ${titulo}">
        <span class="capa-marca" aria-hidden="true">R</span>
        <strong class="capa-titulo">${titulo}</strong>
        <small class="capa-autor">${autor}</small>
        ${imagem}
      </div>
    </figure>
  `;
}

// Imagem que não carregou (sem internet, capa removida...): tira a <img> e deixa a capa desenhada.
// O evento "error" não sobe pela página, por isso o "true" (fase de captura).
document.addEventListener(
  "error",
  (evento) => {
    if (evento.target instanceof HTMLImageElement && evento.target.classList.contains("capa-imagem")) {
      evento.target.remove();
    }
  },
  true
);


/* ---------- 5B. LIVROS QUE VÊM DO GOOGLE BOOKS ---------- */

// A API é uma fonte externa: tudo que vem dela (ou do armazenamento) é conferido antes de usar.

const ID_LIVRO_EXTERNO = /^[A-Za-z0-9_-]{3,40}$/;

// Só aceita capas https do próprio Google. Nada de "javascript:", sites desconhecidos ou texto solto.
function normalizarUrlCapa(url) {
  if (typeof url !== "string" || url.length > 500) {
    return "";
  }

  let endereco;
  try {
    endereco = new URL(url.trim());
  } catch (erro) {
    return "";
  }

  const hospede = endereco.hostname;
  const doGoogle = hospede === "books.google.com" || hospede === "googleusercontent.com" || hospede.endsWith(".googleusercontent.com");

  if (!["http:", "https:"].includes(endereco.protocol) || !doGoogle) {
    return "";
  }

  endereco.protocol = "https:";
  endereco.port = "";
  endereco.searchParams.delete("edge"); // tira o efeito de "página dobrada" da capa

  return endereco.href;
}

// Link "Ver no Google Books": só https para books.google.*
function normalizarUrlLivroGoogle(url) {
  if (typeof url !== "string" || url.length > 500) {
    return "";
  }

  let endereco;
  try {
    endereco = new URL(url.trim());
  } catch (erro) {
    return "";
  }

  if (!["http:", "https:"].includes(endereco.protocol) || !/^books\.google\.[a-z.]{2,10}$/.test(endereco.hostname)) {
    return "";
  }

  endereco.protocol = "https:";
  endereco.port = "";

  return endereco.href;
}

// Um número de 1 a 6 sempre igual para o mesmo id: escolhe a cor da capa desenhada
function capaPorId(id) {
  let soma = 0;
  for (const letra of String(id)) {
    soma += letra.charCodeAt(0);
  }

  return `capa-${(soma % 6) + 1}`;
}

// Confere e limpa um livro do Google Books. Devolve null se não der para usar.
function limparLivroExterno(bruto) {
  if (bruto === null || typeof bruto !== "object") {
    return null;
  }

  const texto = (valor, limite) => (typeof valor === "string" ? valor.replace(/\s+/g, " ").trim().slice(0, limite) : "");
  const inteiro = (valor, minimo, maximo) => (Number.isInteger(valor) && valor >= minimo && valor <= maximo ? valor : 0);

  const id = typeof bruto.id === "string" ? bruto.id : "";
  const titulo = texto(bruto.titulo, 200);

  // Nomes especiais de objeto ("__proto__"...) não podem virar chave dos dados guardados
  const idProibido = ["__proto__", "constructor", "prototype"].includes(id);

  if (!ID_LIVRO_EXTERNO.test(id) || idProibido || titulo === "") {
    return null;
  }

  const nota = typeof bruto.notaMedia === "number" && bruto.notaMedia > 0 && bruto.notaMedia <= 5 ? Math.round(bruto.notaMedia * 10) / 10 : 0;

  return {
    id,
    titulo,
    autor: texto(bruto.autor, 200) || "Autor desconhecido",
    capa: /^capa-[1-6]$/.test(bruto.capa) ? bruto.capa : capaPorId(id),
    capaUrl: normalizarUrlCapa(bruto.capaUrl),
    genero: texto(bruto.genero, 80) || "Sem gênero",
    tags: [],
    ano: inteiro(bruto.ano, 1000, 2100),
    paginas: inteiro(bruto.paginas, 1, 20000),
    notaMedia: nota,
    totalAvaliacoes: inteiro(bruto.totalAvaliacoes, 0, 1000000000),
    descricao: texto(bruto.descricao, 1500),
    linkGoogle: normalizarUrlLivroGoogle(bruto.linkGoogle),
    origem: "google",
  };
}

// Guarda o livro do Google na conta (precisa ser chamada antes de adicioná-lo à lista ou avaliá-lo)
function registrarLivroExterno(livro) {
  const limpo = limparLivroExterno(livro);

  // Um id igual ao de um livro do catálogo fixo nunca é sobrescrito
  if (!limpo || livros.some((item) => item.id === limpo.id)) {
    return false;
  }

  // Limite de livros guardados por conta (os que já estão guardados sempre podem ser atualizados)
  const jaGuardado = Object.prototype.hasOwnProperty.call(livrosExternos, limpo.id);
  if (!jaGuardado && Object.keys(livrosExternos).length >= MAX_LIVROS_EXTERNOS) {
    return false;
  }

  livrosExternos[limpo.id] = limpo;
  return true;
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
