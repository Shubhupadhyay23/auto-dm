import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

const { handlers, auth: nextAuth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const email = String(credentials.email);
        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(String(credentials.password), user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId
        };
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.businessId = (user as any).businessId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).businessId = token.businessId;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
});

export { handlers, signIn, signOut };

const wrappedAuth = (...args: any[]) => {
  if (args.length > 0) {
    return (nextAuth as any)(...args);
  }
  return nextAuth().then(async (session) => {
    if (session?.user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { businessId: true, role: true }
      });
      if (dbUser) {
        (session.user as any).businessId = dbUser.businessId;
        (session.user as any).role = dbUser.role;
      }
    }
    return session;
  });
};

export const auth = wrappedAuth as typeof nextAuth;
