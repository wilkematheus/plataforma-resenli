/* ==========================================================
   RESENLI — Configuração

   Chave da API do Google Books.

   A API funciona sem chave, mas aí o limite de uso é compartilhado
   com todo mundo que usa o serviço sem chave e costuma estourar
   ("limite de buscas atingido"). Com uma chave própria o limite é seu.

   Como conseguir uma (grátis):
     1. Acesse https://console.cloud.google.com e crie um projeto
     2. Ative a "Books API" em APIs e serviços
     3. Crie uma chave em Credenciais > Criar credenciais > Chave de API
     4. Cole a chave entre as aspas abaixo

   Importante: tudo aqui vai para o navegador, então QUALQUER PESSOA
   que abrir o site consegue ver a chave. Por isso, no Google Cloud:
     - restrinja a chave a "Referenciadores HTTP" (o endereço do seu site)
     - restrinja a chave só à "Books API"
   Não use uma chave sem restrição e não envie chaves ao GitHub.
   ========================================================== */

const GOOGLE_BOOKS_CHAVE = "AIzaSyCPFs0A7uc8vOw6rPgmfKpxG5K4t4JYenE";
