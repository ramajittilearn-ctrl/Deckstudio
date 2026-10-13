import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || password.startsWith("replace-")) {
    throw new Error("Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 12 characters");
  }

  const db = new PrismaClient();
  try {
    const passwordHash = await hash(password, 12);
    await db.$transaction(async (tx) => {
      const workspace = await tx.workspace.upsert({
        where: { id: "pilot-workspace" },
        update: {},
        create: { id: "pilot-workspace", name: "Deck Studio Pilot" }
      });
      const user = await tx.user.upsert({
        where: { email },
        update: { passwordHash, status: "ACTIVE" },
        create: { email, passwordHash }
      });
      await tx.userMembership.upsert({
        where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
        update: { role: "OWNER" },
        create: { userId: user.id, workspaceId: workspace.id, role: "OWNER" }
      });
      await tx.brand.upsert({
        where: { workspaceId_name: { workspaceId: workspace.id, name: "Daddy Choize" } },
        update: {},
        create: { workspaceId: workspace.id, name: "Daddy Choize" }
      });
    });
    process.stdout.write("Seeded pilot workspace, Daddy Choize brand, and owner account.\n");
  } finally {
    await db.$disconnect();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n");
  process.exitCode = 1;
});
