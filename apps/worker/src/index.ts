import { createServer } from "node:http";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { db, snapshotHash } from "@deck/db";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is required");

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const publishQueue = new Queue("publishing", { connection });

async function mockPublish(eventId: string, slotId: string, versionId: string) {
  await db.$transaction(async (tx) => {
    const event = await tx.outboxEvent.findUnique({ where: { id: eventId } });
    if (!event || event.dispatchedAt || event.slotId !== slotId || event.versionId !== versionId) return;
    const slot = await tx.postSlot.findUnique({
      where: { id: slotId },
      include: { contentItem: true, currentVersion: true, approvals: { where: { status: "APPROVED" }, include: { actor: { include: { memberships: true } } } } }
    });
    if (!slot || slot.status !== "APPROVED" || slot.currentVersionId !== versionId) {
      await tx.outboxEvent.update({ where: { id: eventId }, data: { dispatchedAt: new Date() } });
      return;
    }
    const approval = slot.approvals.find((candidate) => candidate.versionId === slot.currentVersionId);
    const hash = snapshotHash({ brandId: slot.brandId, caption: slot.currentVersion.caption, imagePath: slot.currentVersion.imagePath });
    const validOwner = approval?.actor.status === "ACTIVE";
    const brand = await tx.brand.findUnique({ where: { id: slot.brandId } });
    const inScope = brand && approval?.actor.memberships.some((membership) => membership.workspaceId === brand.workspaceId && membership.role === "OWNER");
    if (!approval || !validOwner || !inScope || slot.contentItem.brandId !== slot.brandId || slot.currentVersion.contentItemId !== slot.contentItemId || approval.snapshotHash !== hash || slot.currentVersion.snapshotHash !== hash) {
      await tx.postSlot.updateMany({ where: { id: slotId, status: "APPROVED" }, data: { status: "BLOCKED" } });
      await tx.auditEvent.create({ data: { slotId, event: "MOCK_PUBLISH_BLOCKED", details: { reason: "approval_or_snapshot_invalid" } } });
      await tx.outboxEvent.update({ where: { id: eventId }, data: { dispatchedAt: new Date() } });
      return;
    }
    const changed = await tx.postSlot.updateMany({ where: { id: slotId, status: "APPROVED", currentVersionId: approval.versionId }, data: { status: "MOCK_PUBLISHED" } });
    if (changed.count !== 1) return;
    const attempt = await tx.publishAttempt.create({ data: {
      slotId, approvalId: approval.id, idempotencyKey: `${slotId}:${approval.versionId}`,
      status: "MOCK_PUBLISHED", mockPostId: `mock-${slotId}`
    } });
    await tx.auditEvent.create({ data: { slotId, event: "MOCK_PUBLISHED", details: { attemptId: attempt.id, snapshotHash: hash } } });
    await tx.outboxEvent.update({ where: { id: eventId }, data: { dispatchedAt: new Date() } });
  });
}

const publishingWorker = new Worker("publishing", async (job) => {
  if (job.name !== "mock-publish" || typeof job.data.eventId !== "string" || typeof job.data.slotId !== "string" || typeof job.data.versionId !== "string") throw new Error("Unsupported publishing job");
  await mockPublish(job.data.eventId, job.data.slotId, job.data.versionId);
}, { connection, concurrency: 1 });

let dispatching = false;
async function dispatchOutbox() {
  if (dispatching) return;
  dispatching = true;
  try {
    const events = await db.outboxEvent.findMany({ where: { dispatchedAt: null, event: "MOCK_PUBLISH" }, orderBy: { createdAt: "asc" }, take: 20 });
    for (const event of events) {
      await publishQueue.add("mock-publish", { eventId: event.id, slotId: event.slotId, versionId: event.versionId }, { jobId: event.id, attempts: 3, backoff: { type: "exponential", delay: 1000 } });
    }
  } finally { dispatching = false; }
}
const dispatchTimer = setInterval(() => { void dispatchOutbox().catch((error: unknown) => {
  process.stderr.write(JSON.stringify({ event: "outbox_error", message: error instanceof Error ? error.message : String(error) }) + "\n");
}); }, 2000);
void dispatchOutbox();
const worker = new Worker(
  "system",
  async (job) => {
    if (job.name !== "ping") throw new Error("Unsupported system job");
    return { ok: true };
  },
  { connection }
);

worker.on("error", (error) => {
  process.stderr.write(JSON.stringify({ event: "worker_error", message: error.message }) + "\n");
});
publishingWorker.on("error", (error) => {
  process.stderr.write(JSON.stringify({ event: "publishing_worker_error", message: error.message }) + "\n");
});
publishingWorker.on("failed", (job, error) => {
  process.stderr.write(JSON.stringify({ event: "mock_publish_failed", jobId: job?.id, message: error.message }) + "\n");
});

const server = createServer(async (request, response) => {
  if (request.url !== "/health") {
    response.writeHead(404).end();
    return;
  }
  try {
    await connection.ping();
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ready", service: "worker" }));
  } catch {
    response.writeHead(503, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "not_ready" }));
  }
});
server.listen(3001, "0.0.0.0");

async function shutdown() {
  clearInterval(dispatchTimer);
  server.close();
  await worker.close();
  await publishingWorker.close();
  await publishQueue.close();
  await db.$disconnect();
  connection.disconnect();
}
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
