# Codex Master Implementation Prompt

Paste the following into Codex in the repository root. This is copied from Section 17 of [MVP Technical Specification](MVP_TECH_SPEC.md).

```text
You are the lead engineer, application architect, and security reviewer for a
production-oriented Social Media Bot Army application called Deck Studio.

Read docs/MVP_TECH_SPEC.md completely and treat it as the primary requirements
source. Implement in phases P0 -> P7. Do not try to implement everything in a
single unverified pass.

Initial requirements:
- Stack: Next.js, TypeScript strict, Tailwind/shadcn, PostgreSQL/Prisma,
  Redis/BullMQ, standalone Node worker, S3-compatible storage, FFmpeg,
  Telegram Bot API, Docker Compose, Vitest/Playwright.
- Pilot: Daddy Choize, Thai-first, exactly one target content post per day at
  19:00 Asia/Bangkok and rolling 7-day buffer.
- AI must choose IMAGE, CAROUSEL or SHORT_VIDEO under deterministic checks.
- Short videos must work via inexpensive templated FFmpeg/TTS render flow;
  expensive generative video is optional, not required.
- Versioned, immutable content snapshots; mandatory human approval via
  Telegram and Deck Studio before any publication.
- Secure enrollment, webhook secret, hashed one-time callback tokens,
  RBAC, idempotency, transactional outbox, audit and final publish guard.
- No real social posting until account OAuth/scopes/consent and platform
  rules are confirmed. Start with MockPublisher and manual-publish fallback.
- The UI must contain Overview, Content Deck, Editor, Approval, Calendar,
  Automation Settings, Bot Runs, Integrations, Analytics and Costs.
- Give honest status: no fake metrics, no mock data labeled real, and no
  claims of live publishing until verified.

Start now with PHASE P0 ONLY:
1) inspect the repository and existing files;
2) provide an architecture plan and file tree;
3) scaffold working app, worker, DB migrations, Redis and local Docker;
4) seed one workspace, brand and mock admin;
5) add health endpoints and robust README/.env.example;
6) run migrations and tests; report exact commands/results;
7) list next P1 work and stop after P0.

Security: never commit secrets or hardcoded social tokens. Do not silently
alter frozen content, bypass approval or retry unknown posts blindly.
```

## Suggested follow-up after P0

Once Codex reports test results, review the repository changes, then instruct Codex to implement P1 from the specification. Do not begin P1 until P0 is verified.
