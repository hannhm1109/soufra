import type { DefaultSession, NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string
  }
}

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize() { return null },
    }),
  ],
  session: { strategy: "jwt" as const },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.userId = user.id
      return token
    },
    session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId
      }
      return session
    },
  },
} satisfies NextAuthConfig
