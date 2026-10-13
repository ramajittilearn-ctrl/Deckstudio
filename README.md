# Deck Studio

Deck Studio is a Thai-first social content operations project for the Daddy Choize pilot. The repository has a public landing page, owner login, and a **single-image mock publishing test**. The test does not contact Facebook or create a public post. It has no AI content generation, Telegram approval, or live analytics yet.

## Architecture

```text
apps/web       Landing page, owner login, Content Deck and health routes
apps/worker    BullMQ system and mock publishing workers; outbox dispatcher
packages/db    Prisma schema, migrations, snapshot hashing and pilot seed
infra          Docker Compose for web, worker, PostgreSQL and Redis
scripts        HTTP smoke test for health and owner login
docs           Product and implementation specifications
```

The test persists content versions, one slot per brand and Bangkok date, owner approval, an outbox event, a mock publish attempt, and audit events. Saving a revision creates a new version and supersedes prior approval. The worker checks the active owner, version, caption, local sample image checksum, and approval again before recording a mock result. No job has a live publisher adapter.

## Local setup

Requirements: Node.js 20 or newer, npm 10 or newer, and Docker Compose.

1. Copy `.env.example` to `.env`. Set `POSTGRES_PASSWORD` to a URL-safe alphanumeric value. Set `NEXTAUTH_SECRET` to a random string of at least 32 characters. Set `SEED_ADMIN_EMAIL` and a unique `SEED_ADMIN_PASSWORD` of at least 12 characters. Do not use the example placeholders.
2. Run `npm install` in the repository root.
3. Run `docker compose --env-file .env -f infra/compose.yaml up --build --wait`. The one-time `init` service applies the checked-in migration and seeds the pilot records before web and worker start.
4. Open <http://localhost:3000> to see the landing page. Sign in at <http://localhost:3000/login> with the seed credentials. At `/studio`, create a draft for a Bangkok date, revise its caption if needed, and select **Approve and run mock test**. Refresh the page after a few seconds to see `MOCK_PUBLISHED` and a `mock-...` ID. This is a local record only.
5. Run `node --env-file=.env scripts/smoke.mjs` to check liveness, database and Redis readiness, login, and the persisted brand.
6. Run `node --env-file=.env scripts/smoke-flow.mjs` to exercise the worker against unapproved, approved, duplicate, and changed-snapshot mock posts. It creates test records in the local database.

To run services on the host after starting PostgreSQL and Redis, run `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run dev:web`, and `npm run dev:worker` in separate terminals as appropriate.

## Development checks

- `npm run typecheck` checks all TypeScript workspaces.
- `npm run build` generates Prisma Client and builds web and worker.
- `docker compose --env-file .env -f infra/compose.yaml ps` shows service health.

The GitHub Actions job runs the build, type checks, Compose startup, migration, seed, HTTP smoke test, and mock publishing flow smoke test for each pull request.

The checked-in migrations create the foundation and mock test tables. The seed is safe to rerun for the same email and workspace. It updates the owner's password from the current environment and preserves existing brand and workspace records.

## Limits

- This is one manual image-post rehearsal. It does not create a seven-day buffer or wait until 19:00; approval triggers the mock run immediately. The date is a target label.
- No social account, Telegram bot, AI provider, media storage or publishing credential is configured.
- The sample image is local; editing the image file after approval changes its checksum and blocks the mock publish. User image uploads are not implemented.
- Failed BullMQ jobs need operator inspection and recovery. This test has no production reconciliation or alerting.
- The `postgres` and `redis` ports are exposed for local development. Restrict them before deployment.
- TLS, backups, monitoring, and production secret management are future deployment work.

Read [the MVP specification](docs/MVP_TECH_SPEC.md), [the blueprint](docs/MASTER_BLUEPRINT.md), and [the phase prompt](docs/CODEX_MASTER_PROMPT.md) before implementing P1.
