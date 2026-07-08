import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { prisma } from "./prisma";
import { z } from "zod";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt", maxAge: 28800 },
  trustHost: true,

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: { prompt: "consent", access_type: "offline", scope: "openid email profile" },
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
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Look up full user record from DB
        const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
        if (dbUser) {
          token.id      = dbUser.id;
          token.role    = dbUser.role;
          token.orgId   = dbUser.orgId;
          token.approved = dbUser.approved;
        }
        token.email = user.email;
        token.name  = user.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id       = token.id;
        (session.user as any).role     = token.role;
        (session.user as any).orgId    = token.orgId;
        (session.user as any).approved = token.approved;
      }
      return session;
    },

    async signIn({ user }) {
      if (!user.email) return false;

      // Look up user in DB
      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });

      if (!dbUser) {
        // User not registered — send to register page
        return "/auth/register";
      }

      if (dbUser.deletedAt) return false;

      // Update last login and sync name/image
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { lastLoginAt: new Date(), name: user.name ?? dbUser.name, image: user.image ?? dbUser.image },
      }).catch(() => {});

      // If not approved, redirect to pending page
      if (!dbUser.approved) return "/auth/pending";

      return true;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error:  "/auth/error",
  },
});
