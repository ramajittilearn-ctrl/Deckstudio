"use server";

import { db, snapshotHash } from "@deck/db";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/owner";

const imagePath = "/test-post.svg";

function dateFrom(form: FormData): string {
  const value = form.get("targetDate");
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) {
    throw new Error("Choose a valid date.");
  }
  return value;
}

function captionFrom(form: FormData): string {
  const value = form.get("caption");
  if (typeof value !== "string" || value.trim().length < 3 || value.length > 2200) {
    throw new Error("Caption must be 3–2,200 characters.");
  }
  return value.trim();
}

export async function createDraft(form: FormData) {
  const owner = await requireOwner();
  const brand = owner.workspace.brands[0];
  if (!brand) throw new Error("No brand is configured.");
  const targetLocalDate = dateFrom(form);
  const caption = captionFrom(form);
  await db.$transaction(async (tx) => {
    const item = await tx.contentItem.create({ data: { brandId: brand.id } });
    const version = await tx.contentVersion.create({ data: {
      contentItemId: item.id, versionNo: 1, caption, imagePath,
      snapshotHash: snapshotHash({ brandId: brand.id, caption, imagePath })
    } });
    const slot = await tx.postSlot.create({ data: {
      brandId: brand.id, targetLocalDate, mode: "TEST_NOW", publishAtUtc: new Date(), contentItemId: item.id, currentVersionId: version.id
    } });
    await tx.auditEvent.create({ data: { actorId: owner.userId, slotId: slot.id, event: "DRAFT_CREATED", details: { versionId: version.id } } });
  });
  revalidatePath("/studio");
}

export async function reviseDraft(form: FormData) {
  const owner = await requireOwner();
  const slotId = form.get("slotId");
  if (typeof slotId !== "string") throw new Error("Missing slot.");
  const caption = captionFrom(form);
  await db.$transaction(async (tx) => {
    const slot = await tx.postSlot.findFirst({
      where: { id: slotId, brand: { workspaceId: owner.workspaceId } },
      include: { currentVersion: true }
    });
    if (!slot || slot.status === "PUBLISHING" || slot.status === "MOCK_PUBLISHED") throw new Error("This slot cannot be revised.");
    if (slot.mode === "SCHEDULED" && slot.publishAtUtc <= new Date()) throw new Error("This scheduled slot has passed its 19:00 Bangkok target.");
    const next = await tx.contentVersion.create({ data: {
      contentItemId: slot.contentItemId, versionNo: slot.currentVersion.versionNo + 1,
      caption, imagePath, snapshotHash: snapshotHash({ brandId: slot.brandId, caption, imagePath })
    } });
    const changed = await tx.postSlot.updateMany({
      where: { id: slot.id, currentVersionId: slot.currentVersionId, status: { in: ["DRAFT", "APPROVED", "BLOCKED"] } },
      data: { currentVersionId: next.id, status: "DRAFT" }
    });
    if (changed.count !== 1) throw new Error("The post changed; reload and try again.");
    await tx.approval.updateMany({ where: { slotId: slot.id, status: "APPROVED" }, data: { status: "SUPERSEDED" } });
    await tx.auditEvent.create({ data: { actorId: owner.userId, slotId, event: "DRAFT_REVISED", details: { versionId: next.id } } });
  });
  revalidatePath("/studio");
}

export async function approveDraft(form: FormData) {
  const owner = await requireOwner();
  const slotId = form.get("slotId");
  const versionId = form.get("versionId");
  if (typeof slotId !== "string" || typeof versionId !== "string") throw new Error("Missing post version.");
  await db.$transaction(async (tx) => {
    const slot = await tx.postSlot.findFirst({
      where: { id: slotId, brand: { workspaceId: owner.workspaceId } },
      include: { currentVersion: true }
    });
    if (!slot || slot.status !== "DRAFT" || slot.currentVersionId !== versionId) throw new Error("Reload the current draft before approval.");
    if (slot.mode === "SCHEDULED" && slot.publishAtUtc <= new Date()) throw new Error("This scheduled slot has passed its 19:00 Bangkok target.");
    const expected = snapshotHash({ brandId: slot.brandId, caption: slot.currentVersion.caption, imagePath: slot.currentVersion.imagePath });
    if (expected !== slot.currentVersion.snapshotHash) throw new Error("The snapshot is invalid.");
    const changed = await tx.postSlot.updateMany({ where: { id: slotId, status: "DRAFT", currentVersionId: versionId }, data: { status: "APPROVED" } });
    if (changed.count !== 1) throw new Error("The post changed; reload and try again.");
    const approval = await tx.approval.create({ data: { slotId, versionId, actorId: owner.userId, snapshotHash: expected } });
    await tx.auditEvent.create({ data: { actorId: owner.userId, slotId, event: "VERSION_APPROVED", details: { approvalId: approval.id, snapshotHash: expected } } });
    await tx.outboxEvent.create({ data: { slotId, versionId, event: "MOCK_PUBLISH" } });
  });
  revalidatePath("/studio");
}
