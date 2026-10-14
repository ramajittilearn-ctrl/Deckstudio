import { db } from "@deck/db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function requireOwner() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) redirect("/login");
  const membership = await db.userMembership.findFirst({
    where: { user: { email, status: "ACTIVE" }, role: "OWNER" },
    include: { workspace: { include: { brands: true } } }
  });
  if (!membership) redirect("/login");
  return membership;
}
