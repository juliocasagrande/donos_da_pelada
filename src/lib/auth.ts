import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import InstagramProvider from "next-auth/providers/instagram";
import { prisma } from "@/lib/prisma";

function configuredProviders() {
  const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
      name: "Email e senha",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() }
          });

          if (!user?.passwordHash || !user.active) return null;

          const passwordOk = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!passwordOk) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            onboarded: user.onboarded
          };
        } catch {
          return null;
        }
      }
    })
  ];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
      })
    );
  }

  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    providers.push(
      FacebookProvider({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET
      })
    );
  }

  if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
    providers.push(
      InstagramProvider({
        clientId: process.env.INSTAGRAM_CLIENT_ID,
        clientSecret: process.env.INSTAGRAM_CLIENT_SECRET
      })
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/auth/erro"
  },
  providers: configuredProviders(),
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return true;
      try {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        return dbUser?.active ?? true;
      } catch {
        return false;
      }
    },
    async jwt({ token, user }) {
      const email = user?.email || token.email;
      if (email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true, onboarded: true, active: true }
          });
          if (dbUser) {
            token.sub = dbUser.id;
            token.role = dbUser.role;
            token.onboarded = dbUser.onboarded;
            token.active = dbUser.active;
          }
        } catch {
          // Keep the existing token if the database is temporarily unreachable.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.role = token.role as "MASTER" | "ADMIN" | "PLAYER";
        session.user.onboarded = Boolean(token.onboarded);
        session.user.active = token.active !== false;
      }
      return session;
    }
  }
};
