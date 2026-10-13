# Deck Studio

Deck Studio is a Thai-first social content operations project for the Daddy Choize pilot. The repository is in **P0 foundation**. The web app can sign in a seeded owner and show the pilot workspace. It has no content generation, Telegram approval, publishing, or live analytics yet.

## Architecture

```text
apps/web       Next.js App Router, owner login, dashboard and health routes
apps/worker    Standalone BullMQ worker with Redis-backed readiness
packages/db    Prisma schema, SQL migration and idempotent pilot seed
infra          Docker Compose for web, worker, PostgreSQL and Redis
scripts        HTTP smoke test for health and owner login
docs           Product and implementation specifications
```

P0 persists the owner, workspace, membership and brand. Later phases add content versions, approval records, the transactional outbox and publishing guard. The worker currently accepts only a system ping job. No job can publish a post.

## Local setup

Requirements: Node.js 20 or newer, npm 10 or newer, and Docker Compose.

1. Copy `.env.example` to `.env`. Set `POSTGRES_PASSWORD` to a URL-safe alphanumeric value. Set `NEXTAUTH_SECRET` to a random string of at least 32 characters. Set `SEED_ADMIN_EMAIL` and a unique `SEED_ADMIN_PASSWORD` of at least 12 characters. Do not use the example placeholders.
2. Run `npm install` in the repository root.
3. Run `docker compose --env-file .env -f infra/compose.yaml up --build --wait`. The one-time `init` service applies the checked-in migration and seeds the pilot records before web and worker start.
4. Open <http://localhost:3000/login> and sign in with the seed credentials. The dashboard should show Daddy Choize.
5. Run `node --env-file=.env scripts/smoke.mjs` to check liveness, database and Redis readiness, login, and the persisted brand.

To run services on the host after starting PostgreSQL and Redis, run `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run dev:web`, and `npm run dev:worker` in separate terminals as appropriate.

## Development checks

- `npm run typecheck` checks all TypeScript workspaces.
- `npm run build` generates Prisma Client and builds web and worker.
- `docker compose --env-file .env -f infra/compose.yaml ps` shows service health.

The P0 GitHub Actions job runs the build, type checks, Compose startup, migration, seed and HTTP smoke test for each pull request.

The checked-in SQL migration creates the P0 tables. The seed is safe to rerun for the same email and workspace. It updates the owner's password from the current environment and preserves existing brand and workspace records.

## Limits

- P0 has credential login for one owner and a persisted pilot brand. It is not a finished Deck board.
- No social account, Telegram bot, AI provider, media storage or publishing credential is configured.
- No content can be scheduled or published. All external publishing requires a later phase with explicit human approval of an immutable version.
- The `postgres` and `redis` ports are exposed for local development. Restrict them before deployment.
- TLS, backups, monitoring, and production secret management are future deployment work.

Read [the MVP specification](docs/MVP_TECH_SPEC.md), [the blueprint](docs/MASTER_BLUEPRINT.md), and [the phase prompt](docs/CODEX_MASTER_PROMPT.md) before implementing P1.
