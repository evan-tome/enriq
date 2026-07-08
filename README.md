# Enriq

**Enriq turns messy bug reports into clean, AI-enriched Jira tickets.**

Collects bug reports from multiple sources through webhooks, lets developers review and approve issues, then uses a local AI model to improve ticket details, and pushes finalized tickets to Jira

## How it works

1. **Bug reports come in** - connect any tool that can send a webhook to a workspace.
2. **They land in an inbox** - every raw report can be quickly approved or rejected.
3. **AI enriches the approved ones** - a local model (Ollama + CodeLlama) reads the codebase to
   estimate complexity, suggest priority, find affected files, and recommend an assignee.
4. **Push a clean ticket to Jira** - review the AI's draft and send a polished, ready-to-work
   issue to Jira in one click.

## Features

- **Multiple workspaces** - keep each team or project's webhook sources, inbox, and issues
  separate, with role-based access (owner/member).
- **Local-first AI** - runs against your own Ollama instance, so bug reports and source code
  never leave your infrastructure.
- **Codebase-aware enrichment** - connects to a GitHub repo so the AI can ground its suggestions
  in real files and recent commit history. Quoted text from a bug report (e.g. an exact UI label
  or error message) is also searched against the codebase directly, giving the AI strong hints
  about which files are actually affected.
- **Automated assignee suggestions** - map GitHub usernames to Jira display names per workspace,
  and Enriq will suggest whoever most recently worked on the affected files as the assignee.
- **Jira integration** - fetches priorities from your Jira site and creates fully-formed issues
  via the Jira REST API.
- **Secure by design** - JWT access tokens with rotating refresh tokens, bcrypt password hashing,
  and encrypted storage of third-party credentials (Jira/GitHub tokens).
- **Webhook ingestion API** - generate per-workspace API keys to accept inbound bug reports from
  any external system.

## Tech stack

- **Frontend**: React + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend**: Fastify + Prisma + PostgreSQL (TypeScript)
- **AI**: Ollama (local, CodeLlama)
- **Auth**: JWT access tokens + rotating refresh tokens, bcrypt password hashing
- **Dev**: Docker Compose spins up Postgres and Ollama alongside the app

## Usage

### Prerequisites

- Docker Desktop
- Node.js 22+ (only needed if running the frontend/backend outside Docker)

### Quick start

1. Copy the environment template:

   ```sh
   cp .env.example .env
   ```

2. Generate a JWT secret and an encryption key, then set them in `.env`:

   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Run it twice and paste the results into `JWT_SECRET` and `ENCRYPTION_KEY`.

3. Start everything:

   ```sh
   docker compose up --build
   ```

   On first boot, the backend container automatically runs `prisma migrate deploy` before
   starting the API server.

4. Open the app:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

From there, register an account, create a workspace, connect a webhook source/GitHub repo/Jira
project in the workspace settings, and start triaging.

### Running tests

```sh
docker compose exec backend npm test
```

### Authoring new migrations

```sh
docker compose exec backend npx prisma migrate dev --name describe_change
```

### Running the backend outside Docker

```sh
cd backend
npm install
npx prisma generate
npm run dev
```

Override `DATABASE_URL` and `OLLAMA_BASE_URL` in your local `.env` to point at `localhost`
instead of the Docker service names (`postgres`, `ollama`).
