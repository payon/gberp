import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { UserRole } from "@prisma/client";

// 계정별 로그인 실패 제한 (단일 인스턴스용 인메모리)
const MAX_FAILS = 8;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { fails: number; firstFail: number }>();

function pruneAttempts(now = Date.now()) {
  if (attempts.size < 1000) return;
  for (const [k, v] of attempts) {
    if (now - v.firstFail > WINDOW_MS) attempts.delete(k);
  }
}

function isLocked(key: string): boolean {
  const e = attempts.get(key);
  if (!e) return false;
  if (Date.now() - e.firstFail > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return e.fails >= MAX_FAILS;
}

function recordFail(key: string) {
  const now = Date.now();
  const e = attempts.get(key);
  if (e && now - e.firstFail < WINDOW_MS) {
    e.fails += 1;
  } else {
    attempts.set(key, { fails: 1, firstFail: now });
  }
  pruneAttempts(now);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12,
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
        if (isLocked(key)) return null;

        // 계정 존재 여부에 따른 타이밍 차를 줄이고 무차별 공격 속도를 낮춘다
        await sleep(150 + Math.floor(Math.random() * 150));

        const user = await prisma.user.findUnique({ where: { email: key } });

        if (!user) {
          recordFail(key);
          return null;
        }
        if (user.deletedAt || user.status !== "ACTIVE") {
          recordFail(key);
          return null;
        }

        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) {
          recordFail(key);
          return null;
        }

        attempts.delete(key);

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