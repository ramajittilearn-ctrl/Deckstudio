# Deck Studio

Deck Studio is a Thai-first social content operations project for the Daddy Choize pilot. The repository has a public landing page, owner login, a seven-day scheduled sample buffer, and a separate immediate single-image mock publishing test. Neither mode contacts Facebook or creates a public post. It has no AI content generation, Telegram approval, or live analytics yet.

## Architecture

```text
apps/web       Landing page, owner login, Content Deck and health routes
apps/worker    BullMQ system and mock publishing workers; outbox dispatcher
packages/db    Prisma schema, migrations, snapshot hashing and pilot seed
infra          Docker Compose for web, worker, PostgreSQL and Redis
scripts        HTTP smoke test for health and owner login
docs           Product and implementation specifications
```

The test persists content versions, one slot per brand, Bangkok date, and mode, owner approval, an outbox event, a mock publish attempt, and audit events. `TEST_NOW` is the manual rehearsal. `SCHEDULED` fills the next seven future Bangkok dates with editable sample drafts targeting 19:00 local time (12:00 UTC). The worker fills missing slots at startup and each morning after 06:00 Bangkok. Saving a revision creates a new version and supersedes prior approval. The worker checks the active owner, version, caption, local sample image checksum, approval, and scheduled time again before recording a mock result. Unapproved scheduled slots become `MISSED` after the target; an approved slot is also missed if the worker is over 15 minutes late. No job has a live publisher adapter.

## Local setup

Requirements: Node.js 20 or newer, npm 10 or newer, and Docker Compose.

1. Copy `.env.example` to `.env`. Set `POSTGRES_PASSWORD` to a URL-safe alphanumeric value. Set `NEXTAUTH_SECRET` to a random string of at least 32 characters. Set `SEED_ADMIN_EMAIL` and a unique `SEED_ADMIN_PASSWORD` of at least 12 characters. Do not use the example placeholders.
2. Run `npm install` in the repository root.
3. Run `docker compose --env-file .env -f infra/compose.yaml up --build --wait`. The one-time `init` service applies the checked-in migration and seeds the pilot records before web and worker start.
4. Open <http://localhost:3000> to see the landing page. Sign in at <http://localhost:3000/login> with the seed credentials. At `/studio`, inspect the seven-day scheduled queue, revise a sample caption, and approve its exact version. It waits for 19:00 Bangkok and then records `MOCK_PUBLISHED`. To run a test immediately, create a manual draft and select **Approve and run mock test**. Refresh after a few seconds to see a `mock-...` ID. All results are local records only.
5. Run `node --env-file=.env scripts/smoke.mjs` to check liveness, database and Redis readiness, login, and the persisted brand.
6. Run `node --env-file=.env scripts/smoke-flow.mjs` to exercise the worker against unapproved, approved, duplicate, and changed-snapshot mock posts. It creates test records in the local database.
7. Run `node --env-file=.env scripts/smoke-schedule.mjs` to check the seven-day buffer, Bangkok date rollover, replay, unique slots, separate manual mode, and scheduled delay. It creates test records in the local database and simulates a due timestamp on one test slot.

To run services on the host after starting PostgreSQL and Redis, run `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run dev:web`, and `npm run dev:worker` in separate terminals as appropriate.

## Development checks

- `npm run typecheck` checks all TypeScript workspaces.
- `npm run build` generates Prisma Client and builds web and worker.
- `docker compose --env-file .env -f infra/compose.yaml ps` shows service health.

The GitHub Actions job runs the build, type checks, Compose startup, migration, seed, HTTP smoke test, mock publishing flow smoke test, and scheduled buffer smoke test for each pull request.

The checked-in migrations create the foundation and mock test tables. The seed is safe to rerun for the same email and workspace. It updates the owner's password from the current environment and preserves existing brand and workspace records.

## Limits

- Scheduled slots use one fixed sample image and sample caption. There is no AI generation, content research, real social account, or scheduling policy editor yet. `TEST_NOW` remains an immediate manual rehearsal.
- No social account, Telegram bot, AI provider, media storage or publishing credential is configured.
- The sample image is local; editing the image file after approval changes its checksum and blocks the mock publish. User image uploads are not implemented.
- Failed BullMQ jobs need operator inspection and recovery. This test has no production reconciliation or alerting.
- The `postgres` and `redis` ports are exposed for local development. Restrict them before deployment.
- TLS, backups, monitoring, and production secret management are future deployment work.

Read [the MVP specification](docs/MVP_TECH_SPEC.md), [the blueprint](docs/MASTER_BLUEPRINT.md), and [the phase prompt](docs/CODEX_MASTER_PROMPT.md) before implementing P1.
