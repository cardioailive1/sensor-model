/**
 * SensorModel - Auth.js v5 Configuration
 * OAuth2 providers: Google, GitHub, Microsoft Entra ID
 * Standards: OAuth 2.0 RFC 6749, OIDC 1.0, PKCE RFC 7636
 * Compliance: SOC 2 CC6.1-CC6.3, GDPR Art. 5/32, ISO 27001 A.9
 */

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { auditLog } from "./audit";
import { z } from "zod";
import bcrypt from "bcryptjs";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          scope: "openid email profile",
        },
      },
    }),

    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),

    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID ?? "common"}/v2.0`,
    }),

    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email, deletedAt: null },
        });
        if (!user) return null;
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;
        return user;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.orgId = (user as any).orgId;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).orgId = token.orgId;
      }
      return session;
    },

    async signIn({ user }) {
      if (!user.email) return false;
      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (dbUser?.deletedAt) return false;
      return true;
    },
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      await auditLog({
        userId: user.id,
        action: "user.login",
        resource: "session",
        metadata: { provider: account?.provider, isNewUser },
      });
      prisma.user
        .update({ where: { id: user.id! }, data: { lastLoginAt: new Date(), failedLoginCount: 0 } })
        .catch(() => {});
    },

    async signOut({ token }) {
      await auditLog({ userId: (token as any)?.id, action: "user.logout", resource: "session" });
    },

    async createUser({ user }) {
      await auditLog({ userId: user.id, action: "user.created", resource: "user", resourceId: user.id });
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },
});
