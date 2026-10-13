import { db } from "@deck/db";
import { Redis } from "ioredis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return NextResponse.json({ status: "not_ready" }, { status: 503 });
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 0, connectTimeout: 2000 });
  try {
    await Promise.all([db.$queryRaw`SELECT 1`, redis.ping()]);
    return NextResponse.json({ status: "ready", service: "web" });
  } catch {
    return NextResponse.json({ status: "not_ready" }, { status: 503 });
  } finally {
    redis.disconnect();
  }
}
