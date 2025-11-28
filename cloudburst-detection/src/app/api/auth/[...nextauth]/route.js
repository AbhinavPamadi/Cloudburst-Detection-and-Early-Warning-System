import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET || "",
  session: {
    strategy: "jwt",
  },
  pages: {
    // Use default NextAuth pages; keep error route available
    // error: '/api/auth/error'
  },
});

export { handler as GET, handler as POST };
