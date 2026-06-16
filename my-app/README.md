# Event Creator Frontend

Frontend do Event Creator desenvolvido com Next.js, React e TypeScript.

## Requisitos

Para rodar com Docker:

- Docker
- Docker Compose
- Backend rodando e exposto em `http://localhost:8080`

Para rodar sem Docker:

- Node.js 22 ou superior
- npm

## Rodando com Docker Compose

O arquivo [docker-compose.yml](./docker-compose.yml) sobe o frontend em modo
desenvolvimento na porta `3000`.

Suba primeiro o backend. O compose do backend deve publicar a API em:

```text
http://localhost:8080
```

Depois, no diretório deste frontend:

```bash
cd /home/pedro/WebstormProjects/event-creator-FEe/my-app
docker compose up --build
```

Acesse:

```text
http://localhost:3000
```

## Configuração da API

Por padrão, o frontend chama a API em:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Esse valor está definido no `docker-compose.yml`:

```yaml
environment:
  NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:8080}
```

Se o backend estiver em outra porta, informe a variável ao subir o compose:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8081 docker compose up --build
```

## Comandos úteis

Subir o frontend:

```bash
docker compose up
```

Subir reconstruindo a imagem:

```bash
docker compose up --build
```

Rodar em segundo plano:

```bash
docker compose up -d
```

Ver logs:

```bash
docker compose logs -f frontend
```

Parar os containers:

```bash
docker compose down
```

Recriar o container quando mudar variável de ambiente:

```bash
docker compose up -d --force-recreate frontend
```

Limpar volumes do compose:

```bash
docker compose down -v
```

## Rodando sem Docker

Instale as dependências:

```bash
npm install
```

Suba o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse:

```text
http://localhost:3000
```

## Scripts disponíveis

```bash
npm run dev
```

Inicia o Next.js em modo desenvolvimento.

```bash
npm run build
```

Gera a build de produção.

```bash
npm run start
```

Inicia o app usando a build de produção.

```bash
npm run lint
```

Executa o ESLint.

## Integração com o backend

O frontend usa a variável `NEXT_PUBLIC_API_URL` para montar as chamadas HTTP.
As chamadas estão centralizadas em:

```text
lib/api.ts
```

Exemplo:

```ts
apiFetch("/users/login", {
  method: "POST",
  json: { email, password },
});
```

Com a configuração padrão, essa chamada vai para:

```text
http://localhost:8080/users/login
```

## Solução de problemas

### Failed to fetch no login ou cadastro

Verifique se o backend está rodando:

```bash
curl -i http://localhost:8080/users/login
```

Mesmo que a rota retorne erro por ser acessada com método errado, a API deve
responder. Se a conexão falhar, o backend não está disponível na porta `8080`.

Também confira a variável dentro do container:

```bash
docker exec event-creator-frontend printenv NEXT_PUBLIC_API_URL
```

O esperado é:

```text
http://localhost:8080
```

Se estiver diferente, recrie o container:

```bash
docker compose up -d --force-recreate frontend
```

Depois faça um hard refresh no navegador:

```text
Ctrl + Shift + R
```

### Porta 3000 ocupada

Se já existir outro processo usando a porta `3000`, altere o mapeamento no
`docker-compose.yml`:

```yaml
ports:
  - "3001:3000"
```

Nesse caso, acesse:

```text
http://localhost:3001
```

### Backend em Docker

Se o backend estiver usando Docker Compose, confirme que ele publica a porta:

```yaml
ports:
  - "8080:8080"
```

O Postgres pode continuar em outra porta externa, por exemplo:

```yaml
ports:
  - "5433:5432"
```

O frontend não acessa o Postgres diretamente. Ele acessa apenas a API.

## Estrutura principal

```text
app/            Rotas e telas do Next.js
components/     Componentes reutilizáveis
context/        Contextos React
lib/            Funções utilitárias e cliente da API
types/          Tipos TypeScript compartilhados
public/         Arquivos estáticos
```
