import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { SECURITY_POLICY } from "./security-policy";
import { UserRole } from "@prisma/client";

// 계정별 로그인 실패 제한 (DB 기반 — 다중 인스턴스 대응)
const MAX_FAILS = SECURITY_POLICY.auth.maxFails;
const WINDOW_MS = SECURITY_POLICY.auth.windowMs;

async function isLocked(key: string): Promise<boolean> {
  try {
    const e = await prisma.loginAttempt.findUnique({ where: { key } });
    if (!e) return false;
    if (Date.now() - e.firstFail.getTime() > WINDOW_MS) {
      await prisma.loginAttempt.delete({ where: { key } }).catch(() => null);
      return false;
    }
    return e.fails >= MAX_FAILS;
  } catch {
    return false;
  }
}

async function recordFail(key: string) {
  try {
    const now = new Date();
    const e = await prisma.loginAttempt.findUnique({ where: { key } });
    if (e && now.getTime() - e.firstFail.getTime() < WINDOW_MS) {
      await prisma.loginAttempt.update({ where: { key }, data: { fails: e.fails + 1 } });
    } else {
      await prisma.loginAttempt.upsert({
        where: { key },
        update: { fails: 1, firstFail: now },
        create: { key, fails: 1, firstFail: now },
      });
    }
  } catch {
    // ignore
  }
}

async function clearFails(key: string) {
  try {
    await prisma.loginAttempt.delete({ where: { key } }).catch(() => null);
  } catch {
    // ignore
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SECURITY_POLICY.auth.sessionMaxAgeSec,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const key = credentials.email.toLowerCase().trim();
        if (await isLocked(key)) return null;

        // 계정 존재 여부에 따른 타이밍 차를 줄이고 무차별 공격 속도를 낮춘다
        await sleep(
          SECURITY_POLICY.auth.timingMinMs + Math.floor(Math.random() * SECURITY_POLICY.auth.timingJitterMs)
        );

        const user = await prisma.user.findUnique({ where: { email: key } });

        if (!user) {
          await recordFail(key);
          return null;
        }
        if (user.deletedAt || user.status !== "ACTIVE") {
          await recordFail(key);
          return null;
        }

        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) {
          await recordFail(key);
          return null;
        }

        await clearFails(key);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: UserRole;
};

export function toSessionUser(token: unknown): SessionUser | null {
  if (!token) return null;
  const t = token as { id?: string; name?: string; email?: string; role?: string };
  if (!t.id) return null;
  return {
    id: t.id,
    name: t.name,
    email: t.email,
    role: (t.role as UserRole) ?? undefined,
  };
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: string;
    };
  }
  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}