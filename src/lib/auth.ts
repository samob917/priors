import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compareSync } from "bcryptjs";
import { prisma } from "./db";
import { createHash } from "crypto";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;

        const valid = compareSync(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: { strategy: "jwt" },
});

/**
 * Validate an API key from the Authorization header.
 * Returns the user ID if valid, null otherwise.
 */
export async function validateApiKey(
  authHeader: string | null
): Promise<{ userId: string; scopes: string[] } | null> {
  if (!authHeader?.startsWith("Bearer pk_")) return null;

  const rawKey = authHeader.slice(7); // Remove "Bearer "
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey) return null;
  if (apiKey.revokedAt) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update lastUsedAt (fire and forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  const scopes: string[] = typeof apiKey.scopes === "string"
    ? JSON.parse(apiKey.scopes)
    : apiKey.scopes;
  return { userId: apiKey.userId, scopes };
}

/**
 * Get the authenticated user from either session or API key.
 * For use in API route handlers.
 */
export async function getAuthenticatedUser(
  request: Request
): Promise<{ userId: string; source: "session" | "apikey"; scopes?: string[] } | null> {
  // Try API key first (for agent requests)
  const authHeader = request.headers.get("authorization");
  const apiKeyResult = await validateApiKey(authHeader);
  if (apiKeyResult) {
    return { userId: apiKeyResult.userId, source: "apikey", scopes: apiKeyResult.scopes };
  }

  // Fall back to session auth
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, source: "session" };
  }

  return null;
}
