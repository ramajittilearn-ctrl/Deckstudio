import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
assert.ok(email && password, "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD");

async function responseAt(path, options) {
  return fetch(new URL(path, base), { redirect: "manual", ...options });
}

const live = await responseAt("/api/health/live");
assert.equal(live.status, 200, "web liveness");
const ready = await responseAt("/api/health/ready");
assert.equal(ready.status, 200, "database and Redis readiness");

const csrfResponse = await responseAt("/api/auth/csrf");
assert.equal(csrfResponse.status, 200, "CSRF endpoint");
const csrf = await csrfResponse.json();
assert.ok(csrf.csrfToken, "CSRF token");
const csrfCookies = csrfResponse.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
const form = new URLSearchParams({
  csrfToken: csrf.csrfToken,
  email,
  password,
  callbackUrl: base,
  json: "true"
});
const login = await responseAt("/api/auth/callback/credentials", {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    cookie: csrfCookies
  },
  body: form
});
assert.equal(login.status, 200, "owner login");
const loginResult = await login.json();
assert.ok(loginResult.url === base || loginResult.url === base + "/", "login redirect");
const sessionCookies = login.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
const landing = await responseAt("/landing.html");
assert.equal(landing.status, 200, "public landing page");
assert.match(await landing.text(), /Good content,/, "landing content");
const dashboard = await responseAt("/studio", { headers: { cookie: sessionCookies } });
assert.equal(dashboard.status, 200, "authenticated dashboard");
let studioHtml = await dashboard.text();
assert.match(studioHtml, /Daddy Choize/, "seeded brand visible");

function formFor(html, buttonText) {
  const button = html.indexOf(buttonText);
  assert.ok(button >= 0, `form button ${buttonText} is visible`);
  const start = html.lastIndexOf("<form", button);
  const end = html.indexOf("</form>", button);
  assert.ok(start >= 0 && end > button, `form for ${buttonText} exists`);
  const form = html.slice(start, end);
  const action = form.match(/name="(\$ACTION_ID_[^"]+)"/);
  assert.ok(action, `server action for ${buttonText} exists`);
  return { html: form, action: action[1] };
}

function field(form, name) {
  const match = form.match(new RegExp(`name="${name}" value="([^"]+)"`));
  assert.ok(match, `form contains ${name}`);
  return match[1];
}

async function submit(form, fields) {
  const body = new FormData();
  body.set(form.action, "");
  for (const [name, value] of Object.entries(fields)) body.set(name, value);
  const response = await responseAt("/studio", {
    method: "POST",
    headers: { cookie: sessionCookies, origin: new URL(base).origin },
    body
  });
  assert.ok(response.status === 200 || response.status === 303, `server action accepted form: ${response.status}`);
  const page = await responseAt("/studio", { headers: { cookie: sessionCookies } });
  assert.equal(page.status, 200, "studio remains accessible after action");
  return page.text();
}

const targetDate = new Date(Date.UTC(2102, 0, 1 + Math.floor(Math.random() * 1000))).toISOString().slice(0, 10);
studioHtml = await submit(formFor(studioHtml, "Create draft"), {
  targetDate, caption: "Daddy Choize UI smoke draft"
});
assert.ok(studioHtml.includes("Daddy Choize UI smoke draft"), "created draft is visible");

const revision = formFor(studioHtml, "Save new version");
studioHtml = await submit(revision, {
  slotId: field(revision.html, "slotId"), caption: "Daddy Choize UI smoke approved version"
});
assert.ok(studioHtml.includes("Daddy Choize UI smoke approved version"), "revised version is visible");
assert.ok(/Version\s*(?:<!-- -->)?2/.test(studioHtml), "revision created a new version");

const approval = formFor(studioHtml, "Approve and run mock test");
studioHtml = await submit(approval, {
  slotId: field(approval.html, "slotId"), versionId: field(approval.html, "versionId")
});
assert.ok(/APPROVED|MOCK PUBLISHED/.test(studioHtml), "approval changed post status");
for (let attempt = 0; attempt < 40 && !studioHtml.includes("MOCK PUBLISHED"); attempt++) {
  await delay(500);
  const page = await responseAt("/studio", { headers: { cookie: sessionCookies } });
  studioHtml = await page.text();
}
assert.ok(/Mock publish recorded as (?:<!-- -->)?mock-/.test(studioHtml), "owner sees the mock publishing result");
process.stdout.write("UI smoke checks passed: login, create draft, revise, approve, mock result.\n");
