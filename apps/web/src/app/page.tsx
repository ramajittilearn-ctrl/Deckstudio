import { db } from "@deck/db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SignOutButton from "./sign-out-button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) redirect("/login");
  const membership = await db.userMembership.findFirst({
    where: { user: { email, status: "ACTIVE" }, role: "OWNER" },
    include: { workspace: { include: { brands: true } } }
  });
  if (!membership) redirect("/login");
  return <main>
    <p className="muted">P0 foundation</p>
    <h1>Deck Studio</h1>
    <p>Signed in as {email}</p>
    <section className="card">
      <h2>{membership.workspace.name}</h2>
      <p>Brands: {membership.workspace.brands.map((brand) => brand.name).join(", ")}</p>
      <p className="muted">Content and publishing workflows are planned for later phases.</p>
    </section>
    <SignOutButton />
  </main>;
}
