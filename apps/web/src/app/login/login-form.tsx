"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false
    });
    if (result?.ok) window.location.assign("/");
    else {
      setError("Sign in failed. Check your email and password.");
      setBusy(false);
    }
  }

  return <form className="card" onSubmit={submit}>
    <label htmlFor="email">Email</label>
    <input id="email" name="email" type="email" required autoComplete="username" />
    <label htmlFor="password">Password</label>
    <input id="password" name="password" type="password" required autoComplete="current-password" />
    {error && <p className="error" role="alert">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
  </form>;
}
