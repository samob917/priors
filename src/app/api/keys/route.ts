import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { createApiKeySchema } from "@/lib/validation";
import { createHash, randomBytes } from "crypto";

/** List the current user's API keys (prefix + label only, never the raw key). */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: auth.userId, revokedAt: null },
    select: {
      id: true,
      prefix: true,
      label: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Parse scopes from JSON string
  const parsed = keys.map((k) => ({
    ...k,
    scopes: typeof k.scopes === "string" ? JSON.parse(k.scopes) : k.scopes,
  }));

  return NextResponse.json({ keys: parsed });
}

/** Create a new API key. Returns the raw key exactly once. */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = createApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 400 }
    );
  }

  const { label, scopes, expiresInDays } = parsed.data;

  // Generate the raw key
  const rawKey = `pk_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const prefix = rawKey.slice(0, 10);

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: auth.userId,
      keyHash,
      prefix,
      label,
      scopes: JSON.stringify(scopes),
      expiresAt,
    },
  });

  // Return the raw key exactly once
  return NextResponse.json(
    {
      id: apiKey.id,
      rawKey,
      prefix,
      label,
      scopes,
      expiresAt,
      createdAt: apiKey.createdAt,
    },
    { status: 201 }
  );
}
