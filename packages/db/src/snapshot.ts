import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function sampleImageHash(imagePath: string): string {
  if (imagePath !== "/test-post.svg") throw new Error("Unsupported test image.");
  const candidates = [
    resolve(process.cwd(), "public/test-post.svg"),
    resolve(process.cwd(), "../web/public/test-post.svg"),
    resolve(process.cwd(), "apps/web/public/test-post.svg")
  ];
  const path = candidates.find(existsSync);
  if (!path) throw new Error("Test image is missing.");
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function snapshotHash(input: { brandId: string; caption: string; imagePath: string }): string {
  return createHash("sha256").update(JSON.stringify({
    platform: "FACEBOOK_PAGE_MOCK",
    brandId: input.brandId,
    caption: input.caption,
    imagePath: input.imagePath,
    imageHash: sampleImageHash(input.imagePath)
  })).digest("hex");
}
