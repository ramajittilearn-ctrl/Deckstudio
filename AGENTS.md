# AGENTS.md — Codex Repository Instructions

## Project
Deck Studio is a Codex-first Social Media Bot Army. Its pilot is Daddy Choize, Thai-first, one approved content post per day at 19:00 Asia/Bangkok, rolling seven-day buffer.

## Required reading
1. `docs/MVP_TECH_SPEC.md` (primary implementation contract)
2. `docs/MASTER_BLUEPRINT.md` (broader product intent)
3. `docs/CODEX_MASTER_PROMPT.md` (phased implementation kickoff)

## Implementation order
Implement phases P0 -> P7 sequentially. For the initial run, **only implement P0**, validate it and stop. Inspect the repository before changing files; preserve working code.

## Architecture boundaries
- Next.js/TypeScript for the web app/API.
- Dedicated Node worker using BullMQ/Redis.
- PostgreSQL/Prisma for persisted state and version/audit records.
- OpenAI API for AI runtime, with optional model provider abstraction.
- S3-compatible media storage, FFmpeg/TTS for low-cost video production.
- Telegram as a remote approval channel, not as the source of authorization.
- Social publishing behind interfaces; start with MockPublisher.

## Safety and engineering rules
- Never send a real social post before a valid, explicit human approval of the exact immutable content snapshot.
- Check RBAC, linked Telegram identity, campaign scope, request expiry, one-time token and content hash server-side.
- Separate approval transactions from publication jobs; use transactional outbox, idempotency and audit logs.
- Honor platform OAuth, permission, consent and API restrictions.
- Never store credentials in source control. Provide `.env.example` with placeholder values only.
- Do not label demo analytics as real, or claim deployment/integrations without tests.
- Keep an updated README with setup, migrations, tests, architecture and operational limitations.
- Prefer deterministic workflows and a small set of AI roles rather than a network of unnecessary agents.

## Delivery protocol per phase
Explain changes, changed paths, migrations, tests run and actual results. List known blockers and next phase work. Do not move to the next phase automatically.
