/* ==========================================================
   RESENLI — Status de leitura (compartilhado)

   Cada livro pode estar como "quero-ler", "lendo" ou "lido".
   Regra única do programa: livros que ainda faltam ler
   (quero ler + lendo) ficam em minhaLista. Quando o livro
   vira "lido" (marcando ou avaliando), ele sai da lista sozinho.
   ========================================================== */

const ROTULOS_STATUS = {
  "quero-ler": "Quero ler",
  lendo: "Lendo",
  lido: "Lido",
};

// Status atual do livro, ou "" se não tem nenhum
function obterStatus(livroId) {
  return statusLeitura[livroId] || "";
}

// Muda o status e mantém minhaLista de acordo. Status "" tira o livro de tudo.
function definirStatus(livroId, status) {
  if (status !== "" && !ROTULOS_STATUS[status]) {
    return;
  }

  const naLista = minhaLista.includes(livroId);
  const deveEstarNaLista = status === "quero-ler" || status === "lendo";

  if (status === "") {
    delete statusLeitura[livroId];
  } else {
    statusLeitura[livroId] = status;
  }

  if (deveEstarNaLista && !naLista) {
    minhaLista.push(livroId);
  } else if (!deveEstarNaLista && naLista) {
    minhaLista = minhaLista.filter((id) => id !== livroId);
  }
}

// Ids dos livros com o status pedido
function listarPorStatus(status) {
  return Object.keys(statusLeitura).filter((id) => statusLeitura[id] === status);
}

// Livros lidos (usado na meta de leitura)
function contarLidos() {
  return listarPorStatus("lido").length;
}
