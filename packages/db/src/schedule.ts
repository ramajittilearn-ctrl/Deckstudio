import type { PrismaClient } from "@prisma/client";
import { snapshotHash } from "./snapshot";

const BANGKOK_OFFSET_HOURS = 7;
const SAMPLE_IMAGE = "/test-post.svg";

export function bangkokClock(now: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23"
  }).formatToParts(now);
  const value = (part: string) => parts.find((entry) => entry.type === part)?.value;
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const hour = value("hour");
  if (!year || !month || !day || !hour) throw new Error("Bangkok calendar conversion failed.");
  return { date: `${year}-${month}-${day}`, hour: Number(hour) };
}

export function publishAtUtcForBangkokDate(localDate: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) throw new Error("Invalid Bangkok date.");
  const value = new Date(`${localDate}T${String(19 - BANGKOK_OFFSET_HOURS).padStart(2, "0")}:00:00.000Z`);
  if (Number.isNaN(value.valueOf()) || value.toISOString().slice(0, 10) !== localDate) throw new Error("Invalid Bangkok date.");
  return value;
}

export function nextSevenBangkokDates(now: Date): string[] {
  const { date } = bangkokClock(now);
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Invalid Bangkok date.");
  return Array.from({ length: 7 }, (_, index) => new Date(Date.UTC(year, month - 1, day + index + 1)).toISOString().slice(0, 10));
}

export async function ensureSevenDayBuffer(client: PrismaClient, now: Date): Promise<number> {
  const brand = await client.brand.findFirst({ where: { name: "Daddy Choize", timezone: "Asia/Bangkok" } });
  if (!brand) return 0;
  let created = 0;
  for (const date of nextSevenBangkokDates(now)) {
    const key = { brandId_targetLocalDate_mode: { brandId: brand.id, targetLocalDate: date, mode: "SCHEDULED" as const } };
    if (await client.postSlot.findUnique({ where: key })) continue;
    try {
      await client.$transaction(async (tx) => {
        const item = await tx.contentItem.create({ data: { brandId: brand.id } });
        const caption = `Daddy Choize sample draft for ${date}. Edit this caption before approval.`;
        const version = await tx.contentVersion.create({ data: {
          contentItemId: item.id, versionNo: 1, caption, imagePath: SAMPLE_IMAGE,
          snapshotHash: snapshotHash({ brandId: brand.id, caption, imagePath: SAMPLE_IMAGE })
        } });
        const slot = await tx.postSlot.create({ data: {
          brandId: brand.id, targetLocalDate: date, mode: "SCHEDULED",
          publishAtUtc: publishAtUtcForBangkokDate(date), contentItemId: item.id, currentVersionId: version.id
        } });
        await tx.auditEvent.create({ data: { slotId: slot.id, event: "SCHEDULED_DRAFT_CREATED", details: { versionId: version.id, targetLocalDate: date } } });
      });
      created++;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") continue;
      throw error;
    }
  }
  return created;
}
