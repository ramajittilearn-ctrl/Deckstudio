"use client";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return <button onClick={() => void signOut({ callbackUrl: "/login" })}>Sign out</button>;
}
