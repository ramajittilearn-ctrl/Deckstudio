import assert from "node:assert/strict";

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
const dashboard = await responseAt("/", { headers: { cookie: sessionCookies } });
assert.equal(dashboard.status, 200, "authenticated dashboard");
assert.match(await dashboard.text(), /Daddy Choize/, "seeded brand visible");
process.stdout.write("P0 smoke checks passed: live, ready, owner login, dashboard.\n");
