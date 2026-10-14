import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { db, snapshotHash } from "@deck/db";

const brand = await db.brand.findFirst({ where: { name: "Daddy Choize" } });
const owner = await db.user.findFirst({
  where: { status: "ACTIVE", memberships: { some: { workspaceId: brand?.workspaceId, role: "OWNER" } } }
});
assert.ok(brand && owner, "seeded brand and active owner");

const dateOffset = Math.floor(Math.random() * 1000);
const testDate = (offset) => new Date(Date.UTC(2100, 0, 1 + dateOffset + offset)).toISOString().slice(0, 10);

async function makeSlot(offset, caption, status) {
  const item = await db.contentItem.create({ data: { brandId: brand.id } });
  const version = await db.contentVersion.create({ data: {
    contentItemId: item.id, versionNo: 1, caption, imagePath: "/test-post.svg",
    snapshotHash: snapshotHash({ brandId: brand.id, caption, imagePath: "/test-post.svg" })
  } });
  const slot = await db.postSlot.create({ data: {
    brandId: brand.id, targetLocalDate: testDate(offset), contentItemId: item.id,
    currentVersionId: version.id, status
  } });
  return { slot, version };
}

async function waitForEvent(eventId) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const event = await db.outboxEvent.findUnique({ where: { id: eventId } });
    if (event?.dispatchedAt) return;
    await delay(500);
  }
  assert.fail(`worker did not process outbox event ${eventId}`);
}

try {
  const unapproved = await makeSlot(0, "Unapproved smoke post", "DRAFT");
  const rejectedEvent = await db.outboxEvent.create({ data: {
    slotId: unapproved.slot.id, versionId: unapproved.version.id, event: "MOCK_PUBLISH"
  } });
  await waitForEvent(rejectedEvent.id);
  assert.equal(await db.publishAttempt.count({ where: { slotId: unapproved.slot.id } }), 0, "unapproved post was not published");

  const approved = await makeSlot(1, "Approved smoke post", "APPROVED");
  const approval = await db.approval.create({ data: {
    slotId: approved.slot.id, versionId: approved.version.id, actorId: owner.id,
    snapshotHash: approved.version.snapshotHash
  } });
  const approvedEvent = await db.outboxEvent.create({ data: {
    slotId: approved.slot.id, versionId: approved.version.id, event: "MOCK_PUBLISH"
  } });
  await waitForEvent(approvedEvent.id);
  const result = await db.postSlot.findUniqueOrThrow({ where: { id: approved.slot.id } });
  assert.equal(result.status, "MOCK_PUBLISHED", "approved post reached mock publisher");
  const attempt = await db.publishAttempt.findUniqueOrThrow({ where: { slotId: approved.slot.id } });
  assert.equal(attempt.approvalId, approval.id);
  assert.match(attempt.mockPostId ?? "", /^mock-/);

  const duplicateEvent = await db.outboxEvent.create({ data: {
    slotId: approved.slot.id, versionId: approved.version.id, event: "MOCK_PUBLISH"
  } });
  await waitForEvent(duplicateEvent.id);
  assert.equal(await db.publishAttempt.count({ where: { slotId: approved.slot.id } }), 1, "duplicate did not create another attempt");

  const tampered = await makeSlot(2, "Original smoke post", "APPROVED");
  await db.approval.create({ data: {
    slotId: tampered.slot.id, versionId: tampered.version.id, actorId: owner.id,
    snapshotHash: tampered.version.snapshotHash
  } });
  await db.contentVersion.update({ where: { id: tampered.version.id }, data: { caption: "Changed after approval" } });
  const tamperedEvent = await db.outboxEvent.create({ data: {
    slotId: tampered.slot.id, versionId: tampered.version.id, event: "MOCK_PUBLISH"
  } });
  await waitForEvent(tamperedEvent.id);
  const blocked = await db.postSlot.findUniqueOrThrow({ where: { id: tampered.slot.id } });
  assert.equal(blocked.status, "BLOCKED", "changed snapshot was blocked");
  assert.equal(await db.publishAttempt.count({ where: { slotId: tampered.slot.id } }), 0);

  process.stdout.write("Mock flow smoke passed: unapproved blocked, approved recorded, duplicate suppressed, tampered blocked.\n");
} finally {
  await db.$disconnect();
}
