# Access Control API

> REST API profissional com autenticação JWT (Access + Refresh Token), RBAC granular (USER / MANAGER / ADMIN), Redis session blacklist, rate limiting e audit logs de login.

[![CI](https://github.com/mhateus07/access-control-api/actions/workflows/ci.yml/badge.svg)](https://github.com/mhateus07/access-control-api/actions/workflows/ci.yml)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 |
| Linguagem | TypeScript 5 |
| Framework | Fastify 5 |
| ORM | Prisma 5 |
| Banco | PostgreSQL 16 |
| Cache / Blacklist | Redis 7 (ioredis) |
| Validação | Zod v4 |
| Auth | JWT (access 15min) + Refresh Token (7d, HttpOnly cookie) |
| Docs | Swagger / OpenAPI 3 |
| Testes | Vitest (integração) |
| Container | Docker Compose |
| CI/CD | GitHub Actions |

---

## Funcionalidades

- [x] **JWT Access Token** (15min) + **Refresh Token** (7d, HttpOnly cookie)
- [x] **Refresh Token Rotation** — a cada renovação, o token antigo é invalidado e um novo par é emitido
- [x] **Token Blacklist via Redis** — no logout, o access token é revogado imediatamente pelo JTI
- [x] **RBAC** — três níveis de acesso: `USER`, `MANAGER`, `ADMIN`
- [x] **Rate Limiting** — global (100 req/min) + restrito em `/auth/login` (10 req/min)
- [x] **Login Audit Logs** — registra IP, User-Agent, e-mail e resultado (sucesso/falha) de cada tentativa
- [x] **CRUD de usuários** — listagem paginada com filtro por role, busca por ID, atualização de role e deleção (ADMIN only)
- [x] **Swagger UI** em `/docs`
- [x] **Testes de integração** com Vitest (banco real, sem mocks)
- [x] **GitHub Actions CI** — testa e faz build a cada push
- [x] **Docker Compose** — sobe PostgreSQL + Redis com um comando

---

## Arquitetura

O projeto segue separação em três camadas por módulo:

```
Controller  →  Service  →  Repository  →  Prisma (Database)
```

- **Controller**: recebe a requisição, valida o body com Zod e chama o Service
- **Service**: contém a lógica de negócio, lança `AppError` para casos inválidos
- **Repository**: abstrai as queries do Prisma, sem lógica de negócio

```
src/
├── modules/
│   ├── auth/          # register, login, refresh, logout, me
│   ├── users/         # CRUD de usuários (ADMIN only)
│   └── logs/          # listagem de login audit logs
├── shared/
│   ├── middlewares/   # authenticate (JWT + blacklist) | authorize (RBAC)
│   ├── errors/        # AppError + errorHandler global
│   ├── utils/         # http-response (ok / fail)
│   └── plugins/       # swagger
└── lib/               # prisma client | redis client
```

---

## Endpoints

### Auth — `/auth`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/register` | Público | Criar novo usuário |
| POST | `/auth/login` | Público | Login — retorna access token + seta cookie refreshToken |
| POST | `/auth/refresh` | Cookie | Renovar access token via refresh token |
| POST | `/auth/logout` | Autenticado | Logout — revoga token no Redis |
| GET | `/auth/me` | Autenticado | Dados do usuário logado |

### Users — `/users` (ADMIN only)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/users` | Listar usuários (paginado, filtro por role) |
| GET | `/users/:id` | Buscar usuário por ID |
| PATCH | `/users/:id/role` | Atualizar role do usuário |
| DELETE | `/users/:id` | Deletar usuário |

### Logs — `/logs` (ADMIN, MANAGER)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/logs` | Listar login audit logs (paginado, filtro por userId/success) |

---

## Setup local

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/mhateus07/access-control-api.git
cd access-control-api
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com seus valores
```

### 3. Subir PostgreSQL e Redis

```bash
docker compose up -d
```

### 4. Rodar migrations e seed

```bash
npx prisma migrate dev
npm run db:seed
```

Usuários criados pelo seed:

| E-mail | Senha | Role |
|---|---|---|
| admin@example.com | Admin123 | ADMIN |
| manager@example.com | Manager123 | MANAGER |
| user@example.com | User1234 | USER |

### 5. Iniciar a API

```bash
npm run dev
```

API disponível em `http://localhost:3333`
Swagger em `http://localhost:3333/docs`

---

## Testes

Necessário ter PostgreSQL e Redis rodando (via Docker Compose).

```bash
# Criar banco de teste separado
docker exec access_control_postgres psql -U postgres -c "CREATE DATABASE access_control_test;"

# Rodar migrations no banco de teste
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/access_control_test npx prisma migrate deploy

# Executar testes
npm test
```

---

## Evolução em relação ao rest-api-pro

Este projeto é uma evolução direta do [rest-api-pro](https://github.com/mhateus07/rest-api-pro):

| Aspecto | rest-api-pro | access-control-api |
|---|---|---|
| Arquitetura | Controller + Prisma direto | Controller + Service + Repository |
| Auth | JWT único (7d) | Access Token (15min) + Refresh Token rotation |
| Logout | Não implementado | Blacklist no Redis por JTI |
| Roles | USER, ADMIN | USER, MANAGER, ADMIN |
| Rate limiting | Não | Global + restrito em /auth/login |
| Cache/Redis | Não | Session blacklist + rate limiting |
| Audit logs | Não | Login logs com IP, User-Agent, sucesso/falha |
| Testes | Não | Vitest integração (banco real) |
| CI/CD | Não | GitHub Actions |
