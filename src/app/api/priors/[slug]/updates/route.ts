import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { submitUpdateSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  applyPointUpdate,
  likelihoodRatioFromStrength,
  applyBetaUpdate,
  betaMean,
  applyNormalUpdate,
  normalMean,
} from "@/lib/bayes/engine";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const prior = await prisma.prior.findUnique({ where: { slug } });
  if (!prior) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Prior not found" } },
      { status: 404 }
    );
  }

  const page = Number(request.nextUrl.searchParams.get("page") || "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") || "20");

  const [updates, total] = await Promise.all([
    prisma.priorUpdate.findMany({
      where: { priorId: prior.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.priorUpdate.count({ where: { priorId: prior.id } }),
  ]);

  return NextResponse.json({ updates, total, page, limit });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { slug } = await params;
  const prior = await prisma.prior.findUnique({ where: { slug } });
  if (!prior) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Prior not found" } },
      { status: 404 }
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

  const parsed = submitUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 400 }
    );
  }

  const { evidenceDescription, strength, likelihoodRatio: rawLR, distributionUpdate } = parsed.data;

  // Rate limit: max 5 updates per prior per user per hour
  const rlKey = `update:${auth.userId}:${prior.id}`;
  const rl = checkRateLimit(rlKey, 5, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Max 5 updates per prior per hour" } },
      { status: 429, headers: rateLimitHeaders(rl, 5) }
    );
  }

  const probabilityBefore = prior.currentProbability;
  let probabilityAfter: number;
  let computedLR: number;
  let distributionBefore: string | null = null;
  let distributionAfter: string | null = null;

  if (distributionUpdate) {
    // Distribution mode update
    const distParams = JSON.parse(prior.distributionParams as string || "{}");
    distributionBefore = JSON.stringify(distParams);

    if (distributionUpdate.type === "BETA") {
      const updated = applyBetaUpdate(
        distParams as { alpha: number; beta: number },
        {
          successes: distributionUpdate.evidence.successes || 0,
          failures: distributionUpdate.evidence.failures || 0,
        }
      );
      distributionAfter = JSON.stringify(updated);
      probabilityAfter = betaMean(updated);
      computedLR = (probabilityAfter / (1 - probabilityAfter)) / (probabilityBefore / (1 - probabilityBefore));
    } else {
      const updated = applyNormalUpdate(
        distParams as { mean: number; stddev: number },
        {
          observedMean: distributionUpdate.evidence.observedMean || 0.5,
          observedStddev: distributionUpdate.evidence.observedStddev || 0.1,
          sampleSize: distributionUpdate.evidence.sampleSize || 1,
        }
      );
      distributionAfter = JSON.stringify(updated);
      probabilityAfter = normalMean(updated);
      computedLR = (probabilityAfter / (1 - probabilityAfter)) / (probabilityBefore / (1 - probabilityBefore));
    }
  } else {
    // Point mode update
    computedLR = rawLR ?? likelihoodRatioFromStrength(strength ?? 0);
    probabilityAfter = applyPointUpdate(probabilityBefore, computedLR);
  }

  const sourceType = auth.source === "apikey" ? "AGENT" : "USER";

  // Create update and update prior in a transaction
  const update = await prisma.$transaction(async (tx) => {
    const u = await tx.priorUpdate.create({
      data: {
        priorId: prior.id,
        userId: auth.userId,
        sourceType,
        evidenceDescription,
        likelihoodRatio: computedLR,
        probabilityBefore,
        probabilityAfter,
        distributionBefore,
        distributionAfter,
      },
    });

    await tx.prior.update({
      where: { id: prior.id },
      data: {
        currentProbability: probabilityAfter,
        distributionParams: distributionAfter ?? prior.distributionParams,
        updateCount: { increment: 1 },
      },
    });

    return u;
  });

  return NextResponse.json(
    {
      id: update.id,
      probabilityBefore,
      probabilityAfter,
      likelihoodRatio: computedLR,
    },
    { status: 201, headers: rateLimitHeaders(rl, 5) }
  );
}
