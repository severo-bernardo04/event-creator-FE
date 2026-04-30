# event-creator-FE

<!--
Endpoints usados pelo front:
- POST /users/register
- POST /users/login
- POST /users/logout
- GET /users/me
- GET /events
- GET /events/{id}
- POST /events
- PUT /events/{id}
- DELETE /events/{id}
- GET /events/{id}/participants
- POST /events/{id}/participants?userId={userId}
- DELETE /events/{id}/participants/{participantId}
- GET /events/{id}/participants/check-email?email={email}

Endpoints ainda necessários no backend:
- POST /events/{id}/image (upload da capa)

Débito técnico (imagem de capa):
- O front já valida arquivo e exibe preview local, mas ainda não envia imagem porque o endpoint de upload não existe.
-->

## Rodando Front + Backend + Postgres (sem Docker)

Este repositório é focado no **Front-end**. O backend fica na pasta `EventHubAPI-main/` (ignorada pelo git).

### Ordem recomendada

1) **Postgres** rodando localmente com o banco `eventdb` (credenciais em `EventHubAPI-main/src/main/resources/application.properties`).

2) **Backend** (Spring Boot) em `EventHubAPI-main/`:

```bash
./mvnw spring-boot:run
```

3) **Front** em `my-app/`:

```bash
npm install
npm run dev
```

### URLs

- **Front**: `http://localhost:3000` (ou a porta que o Next mostrar)
- **Backend**: `http://localhost:8080`

### Observações

- O front usa proxy/rewrite do Next para chamar o backend via `"/api/*"`.
- O backend exige usuário **ADMIN** para criar/editar/excluir eventos. O cadastro padrão cria `USER`; promova manualmente no Postgres (coluna `role` na tabela `app_user`) quando precisar testar CRUD.