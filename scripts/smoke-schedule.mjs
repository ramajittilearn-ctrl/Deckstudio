import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { bangkokClock, db, ensureSevenDayBuffer, nextSevenBangkokDates, publishAtUtcForBangkokDate, snapshotHash } from "@deck/db";

assert.deepEqual(nextSevenBangkokDates(new Date("2026-12-31T16:59:59.000Z")), [
  "2027-01-01", "2027-01-02", "2027-01-03", "2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07"
]);
assert.equal(bangkokClock(new Date("2026-12-31T17:00:00.000Z")).date, "2027-01-01");
assert.equal(publishAtUtcForBangkokDate("2027-01-01").toISOString(), "2027-01-01T12:00:00.000Z");
assert.throws(() => publishAtUtcForBangkokDate("2027-02-30"), /Invalid Bangkok date/);

const brand = await db.brand.findFirst({ where: { name: "Daddy Choize", timezone: "Asia/Bangkok" } });
assert.ok(brand, "seeded Daddy Choize brand");
const owner = await db.user.findFirst({ where: { status: "ACTIVE", memberships: { some: { workspaceId: brand.workspaceId, role: "OWNER" } } } });
assert.ok(owner, "active owner");

async function createSlot({ targetLocalDate, mode, publishAtUtc, caption }) {
  return db.$transaction(async (tx) => {
    const item = await tx.contentItem.create({ data: { brandId: brand.id } });
    const version = await tx.contentVersion.create({ data: {
      contentItemId: item.id, versionNo: 1, caption, imagePath: "/test-post.svg",
      snapshotHash: snapshotHash({ brandId: brand.id, caption, imagePath: "/test-post.svg" })
    } });
    const slot = await tx.postSlot.create({ data: {
      brandId: brand.id, targetLocalDate, mode, publishAtUtc, contentItemId: item.id, currentVersionId: version.id
    } });
    return { slot, version };
  });
}

async function waitForEvent(eventId) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const event = await db.outboxEvent.findUnique({ where: { id: eventId } });
    if (event?.dispatchedAt) return;
    await delay(500);
  }
  assert.fail(`scheduled mock event ${eventId} was not processed`);
}

try {
  const now = new Date();
  const dates = nextSevenBangkokDates(now);
  await ensureSevenDayBuffer(db, now);
  const first = await db.postSlot.findMany({ where: { brandId: brand.id, mode: "SCHEDULED", targetLocalDate: { in: dates } } });
  assert.equal(first.length, 7, "seven future Bangkok dates have scheduled slots");
  assert.deepEqual(first.map((slot) => slot.targetLocalDate).sort(), dates);
  for (const slot of first) assert.equal(slot.publishAtUtc.toISOString(), publishAtUtcForBangkokDate(slot.targetLocalDate).toISOString());
  assert.equal(await ensureSevenDayBuffer(db, now), 0, "replay creates no duplicate slots");
  const second = await db.postSlot.findMany({ where: { brandId: brand.id, mode: "SCHEDULED", targetLocalDate: { in: dates } } });
  assert.deepEqual(second.map((slot) => slot.id).sort(), first.map((slot) => slot.id).sort(), "replay retains the same slots");

  const testDate = new Date(Date.UTC(2200, 0, 1 + Math.floor(Math.random() * 1000))).toISOString().slice(0, 10);
  const scheduled = await createSlot({ targetLocalDate: testDate, mode: "SCHEDULED", publishAtUtc: new Date(Date.now() + 60_000), caption: "Scheduled deadline smoke draft" });
  const manual = await createSlot({ targetLocalDate: testDate, mode: "TEST_NOW", publishAtUtc: new Date(), caption: "Independent manual smoke draft" });
  assert.notEqual(scheduled.slot.id, manual.slot.id, "manual and scheduled slots can share a local date");
  await assert.rejects(
    createSlot({ targetLocalDate: testDate, mode: "SCHEDULED", publishAtUtc: new Date(), caption: "Duplicate scheduled smoke draft" }),
    (error) => error?.code === "P2002",
    "second scheduled slot on the same brand/date is rejected"
  );

  await db.postSlot.update({ where: { id: scheduled.slot.id }, data: { status: "APPROVED" } });
  await db.approval.create({ data: { slotId: scheduled.slot.id, versionId: scheduled.version.id, actorId: owner.id, snapshotHash: scheduled.version.snapshotHash } });
  const event = await db.outboxEvent.create({ data: { slotId: scheduled.slot.id, versionId: scheduled.version.id, event: "MOCK_PUBLISH" } });
  await delay(3000);
  assert.equal((await db.postSlot.findUniqueOrThrow({ where: { id: scheduled.slot.id } })).status, "APPROVED", "scheduled slot waits before its deadline");
  assert.equal(await db.publishAttempt.count({ where: { slotId: scheduled.slot.id } }), 0, "no early mock publish");
  assert.equal((await db.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).dispatchedAt, null, "outbox remains pending before deadline");

  await db.postSlot.update({ where: { id: scheduled.slot.id }, data: { publishAtUtc: new Date(Date.now() - 1000) } });
  await waitForEvent(event.id);
  assert.equal((await db.postSlot.findUniqueOrThrow({ where: { id: scheduled.slot.id } })).status, "MOCK_PUBLISHED", "scheduled approval publishes only after deadline");
  assert.equal(await db.publishAttempt.count({ where: { slotId: scheduled.slot.id } }), 1);

  const lateDate = new Date(Date.UTC(2203, 0, 1 + Math.floor(Math.random() * 1000))).toISOString().slice(0, 10);
  const late = await createSlot({ targetLocalDate: lateDate, mode: "SCHEDULED", publishAtUtc: new Date(Date.now() - 16 * 60_000), caption: "Late scheduled smoke draft" });
  await db.postSlot.update({ where: { id: late.slot.id }, data: { status: "APPROVED" } });
  await db.approval.create({ data: { slotId: late.slot.id, versionId: late.version.id, actorId: owner.id, snapshotHash: late.version.snapshotHash } });
  const lateEvent = await db.outboxEvent.create({ data: { slotId: late.slot.id, versionId: late.version.id, event: "MOCK_PUBLISH" } });
  await waitForEvent(lateEvent.id);
  assert.equal((await db.postSlot.findUniqueOrThrow({ where: { id: late.slot.id } })).status, "MISSED", "overdue approval is skipped");
  assert.equal(await db.publishAttempt.count({ where: { slotId: late.slot.id } }), 0);
  process.stdout.write("Schedule smoke passed: seven dates, 19:00 conversion, replay, unique slot, separate manual mode, delayed guarded mock publish, late skip.\n");
} finally {
  await db.$disconnect();
}
