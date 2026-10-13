# Deck Studio — Social Media Bot Army

**Status:** Specification and Codex handoff only. Application code has not been implemented or deployed.

An independent, Codex-first Social Media Automation platform for the Daddy Choize pilot: one approved post per day at **19:00 Asia/Bangkok**, with AI format selection (image, carousel, short video), Deck Studio, Telegram approval, and safe publishing adapters.

## Start here (Codex)
1. Read [MVP Technical Specification](docs/MVP_TECH_SPEC.md) completely.
2. Read [Master Blueprint](docs/MASTER_BLUEPRINT.md) for product context and scope.
3. Follow [Codex Master Implementation Prompt](docs/CODEX_MASTER_PROMPT.md).
4. **Implement Phase P0 only** first. Inspect the repository, create the app/worker scaffold, database and local Docker environment, run tests, and report results before proceeding to P1.
5. Follow [AGENTS.md](AGENTS.md) for project-wide coding rules.

## Target architecture

- Next.js + TypeScript + Tailwind/shadcn/ui for Deck Studio
- PostgreSQL + Prisma for data, immutable content versions and audit
- Redis + BullMQ + standalone worker for daily jobs and retries
- OpenAI-powered content pipeline with optional Claude provider abstraction
- S3-compatible storage, FFmpeg and TTS for creative assets
- Telegram Bot API for secure human approval
- Mock publisher first; real social platform APIs only after applicable permissions, account linkage and consent

## Operating principles

- **Human approval is mandatory** before any live publishing.
- Approved versions are immutable; changes require new approval.
- If no approved content exists, do not auto-publish.
- Use one target post per day, a rolling seven-day content buffer and Asia/Bangkok scheduling.
- No hardcoded secrets; use `.env.example`, never commit real credentials.
- Do not claim a feature is working until it has been implemented and tested.
- The referenced YouTube video was not fully verified; this project is an independently designed blueprint, **not** the channel owner's proprietary template.

## Documentation

| File | Purpose |
|---|---|
| [docs/MASTER_BLUEPRINT.md](docs/MASTER_BLUEPRINT.md) | Consolidated project vision and full Bot Army discussion |
| [docs/MVP_TECH_SPEC.md](docs/MVP_TECH_SPEC.md) | Detailed MVP, architecture, data model, approval security, tests and phases |
| [docs/CODEX_MASTER_PROMPT.md](docs/CODEX_MASTER_PROMPT.md) | Copy-and-paste phased Codex implementation prompt |

## Current progress

- [x] Requirements and architecture documents
- [ ] P0: Repository scaffold, database, Docker, health checks
- [ ] P1–P7: Deck Studio UI, AI pipeline, media rendering, approval, publishing, testing

> This repository does not contain a finished application yet.
