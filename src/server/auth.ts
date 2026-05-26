import "server-only";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "./db";

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.passwordHash) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      if (token.uid && !token.isSuperAdmin) {
        // refresh super-admin flag once per token issuance
        const u = await prisma.user.findUnique({ where: { id: token.uid as string }, select: { isSuperAdmin: true } });
        token.isSuperAdmin = !!u?.isSuperAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.uid as string;
        (session.user as { isSuperAdmin?: boolean }).isSuperAdmin = !!token.isSuperAdmin;
      }
      return session;
    },
  },
};

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isSuperAdmin: boolean;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as { id?: string; email?: string; name?: string | null; image?: string | null; isSuperAdmin?: boolean };
  if (!u.id || !u.email) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? null,
    image: u.image ?? null,
    isSuperAdmin: !!u.isSuperAdmin,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}
