import { db } from "@deck/db";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const secret = process.env.NEXTAUTH_SECRET;
const validSecret = secret && secret.length >= 32 && !secret.startsWith("replace-") ? secret : undefined;

export const authOptions: NextAuthOptions = {
  secret: validSecret,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Owner login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || user.status !== "ACTIVE") return null;
        if (!(await compare(password, user.passwordHash))) return null;
        const owner = await db.userMembership.findFirst({
          where: { userId: user.id, role: "OWNER" }
        });
        if (!owner) return null;
        return { id: user.id, email: user.email };
      }
    })
  ]
};
