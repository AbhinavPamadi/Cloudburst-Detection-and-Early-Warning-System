import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// NextAuth route for App Router. Expects env vars:
// - GOOGLE_CLIENT_ID
// - GOOGLE_CLIENT_SECRET
// - NEXTAUTH_SECRET (optional but recommended)

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret:
    process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET || undefined,
  session: { strategy: "jwt" },
  callbacks: {
    // Pass minimal user fields to the client
    async jwt({ token, user, account, profile, isNewUser }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.email) session.user.email = token.email;
      if (token?.name) session.user.name = token.name;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
