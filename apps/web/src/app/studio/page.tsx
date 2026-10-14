import { db } from "@deck/db";
import { requireOwner } from "@/lib/owner";
import SignOutButton from "../sign-out-button";
import { approveDraft, createDraft, reviseDraft } from "./actions";

export const dynamic = "force-dynamic";

function bangkokToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function StudioHome() {
  const owner = await requireOwner();
  const brand = owner.workspace.brands[0];
  const slots = brand ? await db.postSlot.findMany({
    where: { brandId: brand.id }, orderBy: { targetLocalDate: "asc" },
    include: { currentVersion: true, attempts: true }
  }) : [];

  return <main className="studio">
    <header className="studio-header"><div><p className="eyebrow">DADDY CHOIZE · FACEBOOK PAGE TEST</p><h1>Content Deck</h1><p className="muted">Draft one image post, approve its exact version, then watch the worker record a mock publish. Nothing is sent to Facebook.</p></div><SignOutButton /></header>
    <section className="card">
      <h2>Create a test post</h2>
      <form action={createDraft}>
        <label htmlFor="targetDate">Target date (Bangkok)</label>
        <input id="targetDate" name="targetDate" type="date" defaultValue={bangkokToday()} required />
        <label htmlFor="caption">Caption</label>
        <textarea id="caption" name="caption" rows={4} maxLength={2200} required placeholder="Write the post caption you want to test." />
        <p className="muted">This test uses a local sample image and a mock Facebook Page account. One slot is allowed per brand and date.</p>
        <button type="submit">Create draft</button>
      </form>
    </section>
    <h2>Post slots</h2>
    {slots.length === 0 && <p className="muted">No posts yet. Create a draft above to start the test.</p>}
    {slots.map((slot) => <section className="card post-card" key={slot.id}>
      <div className="post-meta"><strong>{slot.targetLocalDate} · 19:00 Bangkok target</strong><span className={`status status-${slot.status.toLowerCase()}`}>{slot.status.replaceAll("_", " ")}</span></div>
      <div className="post-preview"><img src={slot.currentVersion.imagePath} alt="Sample test post artwork" /><div><p className="eyebrow">FACEBOOK PAGE · IMAGE · MOCK ONLY</p><p className="caption">{slot.currentVersion.caption}</p><p className="muted">Version {slot.currentVersion.versionNo} · snapshot {slot.currentVersion.snapshotHash.slice(0, 12)}…</p></div></div>
      {(slot.status === "DRAFT" || slot.status === "APPROVED" || slot.status === "BLOCKED") && <div className="post-actions">
        <form action={reviseDraft}><input type="hidden" name="slotId" value={slot.id} /><label htmlFor={`revise-${slot.id}`}>Revise caption</label><textarea id={`revise-${slot.id}`} name="caption" defaultValue={slot.currentVersion.caption} rows={3} maxLength={2200} required /><button type="submit" className="secondary">Save new version</button></form>
        {slot.status === "DRAFT" && <form action={approveDraft}><input type="hidden" name="slotId" value={slot.id} /><input type="hidden" name="versionId" value={slot.currentVersionId} /><p className="muted">Approval is bound to this caption, image, brand, and version. Saving a revision cancels the old approval.</p><button type="submit">Approve and run mock test</button></form>}
      </div>}
      {slot.status === "APPROVED" && <p className="muted">Approved. The worker will pick up the mock publish event shortly.</p>}
      {slot.status === "MOCK_PUBLISHED" && <p className="success">Mock publish recorded as {slot.attempts[0]?.mockPostId}. This is not a Facebook post.</p>}
      {slot.status === "BLOCKED" && <p className="error">The final guard blocked this post. Revise it and approve the new version.</p>}
    </section>)}
  </main>;
}
