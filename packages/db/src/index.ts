import { PrismaClient } from "@prisma/client";

const globalDb = globalThis as unknown as { deckDb?: PrismaClient };

export const db = globalDb.deckDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDb.deckDb = db;

export { Prisma } from "@prisma/client";
export { snapshotHash } from "./snapshot";
export { bangkokClock, publishAtUtcForBangkokDate, nextSevenBangkokDates, ensureSevenDayBuffer } from "./schedule";
