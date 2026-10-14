import { db, nextSevenBangkokDates } from "@deck/db";
import { requireOwner } from "@/lib/owner";
import SignOutButton from "../sign-out-button";
import { approveDraft, createDraft, reviseDraft } from "./actions";
import { Fragment } from "react";

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
  const upcoming = new Set(nextSevenBangkokDates(new Date()));
  const scheduled = slots.filter((slot) => slot.mode === "SCHEDULED");
  const manual = slots.filter((slot) => slot.mode === "TEST_NOW");
  const buffer = scheduled.filter((slot) => upcoming.has(slot.targetLocalDate));
  const approved = buffer.filter((slot) => slot.status === "APPROVED").length;
  const drafts = buffer.filter((slot) => slot.status === "DRAFT").length;

  return <main className="studio">
    <header className="studio-header"><div><p className="eyebrow">DADDY CHOIZE · FACEBOOK PAGE MOCK</p><h1>Content Deck</h1><p className="muted">A seven-day sample buffer targets 19:00 Bangkok. Approved scheduled drafts wait until their slot. Manual tests run immediately. Nothing is sent to Facebook.</p></div><SignOutButton /></header>
    <section className="card"><h2>Seven-day buffer</h2><p>{buffer.length} / 7 slots · {approved} approved · {drafts} drafts</p><p className="muted">The worker fills missing future dates at startup and each morning around 06:00 Bangkok. Every draft uses the sample image and needs your approval.</p></section>
    <section className="card">
      <h2>Run an immediate manual test</h2>
      <form action={createDraft}>
        <label htmlFor="targetDate">Target date (Bangkok)</label>
        <input id="targetDate" name="targetDate" type="date" defaultValue={bangkokToday()} required />
        <label htmlFor="caption">Caption</label>
        <textarea id="caption" name="caption" rows={4} maxLength={2200} required placeholder="Write the post caption you want to test." />
        <p className="muted">This uses a local sample image and a mock Facebook Page account. Manual tests are separate from scheduled slots.</p>
        <button type="submit">Create draft</button>
      </form>
    </section>
    <h2>Scheduled queue</h2>
    {scheduled.length === 0 && <p className="muted">The worker has not filled the buffer yet. Refresh shortly after it starts.</p>}
    {[...scheduled, ...manual].map((slot, index) => <Fragment key={slot.id}>
      {index === scheduled.length && manual.length > 0 && <h2>Manual tests</h2>}
      <section className="card post-card">
      <div className="post-meta"><strong>{slot.targetLocalDate} · {slot.mode === "SCHEDULED" ? "19:00 Bangkok scheduled" : "Immediate mock test"}</strong><span className={`status status-${slot.status.toLowerCase()}`}>{slot.status.replaceAll("_", " ")}</span></div>
      <div className="post-preview"><img src={slot.currentVersion.imagePath} alt="Sample test post artwork" /><div><p className="eyebrow">FACEBOOK PAGE · IMAGE · MOCK ONLY</p><p className="caption">{slot.currentVersion.caption}</p><p className="muted">Version {slot.currentVersion.versionNo} · snapshot {slot.currentVersion.snapshotHash.slice(0, 12)}…</p></div></div>
      {(slot.mode === "TEST_NOW" || slot.publishAtUtc > new Date()) && (slot.status === "DRAFT" || slot.status === "APPROVED" || slot.status === "BLOCKED") && <div className="post-actions">
        <form action={reviseDraft}><input type="hidden" name="slotId" value={slot.id} /><label htmlFor={`revise-${slot.id}`}>Revise caption</label><textarea id={`revise-${slot.id}`} name="caption" defaultValue={slot.currentVersion.caption} rows={3} maxLength={2200} required /><button type="submit" className="secondary">Save new version</button></form>
        {slot.status === "DRAFT" && <form action={approveDraft}><input type="hidden" name="slotId" value={slot.id} /><input type="hidden" name="versionId" value={slot.currentVersionId} /><p className="muted">Approval is bound to this caption, image, brand, and version. Saving a revision cancels the old approval.</p><button type="submit">{slot.mode === "SCHEDULED" ? "Approve for 19:00 mock" : "Approve and run mock test"}</button></form>}
      </div>}
      {slot.status === "APPROVED" && <p className="muted">{slot.mode === "SCHEDULED" ? `Approved; mock publish waits until ${slot.publishAtUtc.toISOString()} (19:00 Bangkok).` : "Approved. The worker will pick up the mock publish event shortly."}</p>}
      {slot.status === "MOCK_PUBLISHED" && <p className="success">Mock publish recorded as {slot.attempts[0]?.mockPostId}. This is not a Facebook post.</p>}
      {slot.status === "BLOCKED" && <p className="error">The final guard blocked this post. Revise it and approve the new version.</p>}
      {slot.status === "MISSED" && <p className="error">The 19:00 slot was missed. No mock post was recorded.</p>}
    </section></Fragment>)}
  </main>;
}
