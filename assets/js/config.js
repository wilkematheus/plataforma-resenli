/* ==========================================================
   RESENLI — Configuração

   Chave da API do Google Books.

   NÃO escreva a chave neste arquivo. Ela vem da variável de ambiente
   GOOGLE_BOOKS_CHAVE: ao abrir o site com `node servidor.js` (ou
   `npm start`), o servidor responde a este arquivo com um gerado na hora,
   contendo a chave da variável. O valor vazio abaixo só é usado quando o
   site é aberto SEM o servidor (Live Server, arquivo direto, hospedagem
   estática); nesse caso a busca usa o limite gratuito compartilhado do
   Google, que costuma estourar ("limite de buscas atingido").

   Como definir a variável (uma vez só, no PowerShell):
     setx GOOGLE_BOOKS_CHAVE "sua-chave-aqui"
   e abra um terminal NOVO (a variável só vale para programas iniciados
   depois dela). Detalhes no topo de servidor.js.

   Como conseguir uma chave (grátis):
     1. Acesse https://console.cloud.google.com e crie um projeto
     2. Ative a "Books API" em APIs e serviços
     3. Crie uma chave em Credenciais > Criar credenciais > Chave de API

   Importante: o navegador recebe a chave, então QUALQUER PESSOA que
   abrir o site consegue vê-la. Por isso, no Google Cloud:
     - restrinja a chave a "Referenciadores HTTP" (o endereço do seu site)
     - restrinja a chave só à "Books API"
   ========================================================== */

const GOOGLE_BOOKS_CHAVE = "";
