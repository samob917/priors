import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { createPriorSchema, searchPriorsSchema } from "@/lib/validation";
import { generateSearchText } from "@/lib/search";
import slugify from "slugify";

const PRIOR_SELECT = {
  slug: true,
  claim: true,
  description: true,
  category: true,
  currentProbability: true,
  distributionType: true,
  updateCount: true,
  viewCount: true,
  trendingScore: true,
  createdAt: true,
  updatedAt: true,
  searchText: true,
} as const;

/**
 * Tokenize a query: lowercase, split on spaces/punctuation, filter noise words.
 */
function tokenize(query: string): string[] {
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been",
    "will", "would", "should", "could", "can", "do", "does", "did",
    "i", "my", "me", "we", "you", "your", "it", "its",
    "for", "of", "to", "in", "on", "at", "by", "with", "from",
    "and", "or", "but", "not", "no", "so", "if", "then",
    "what", "which", "who", "how", "when", "where", "why",
    "this", "that", "these", "those",
    "most", "best", "good", "bad", "new", "old",
    "up", "go", "get", "use", "make",
  ]);

  return query
    .toLowerCase()
    .split(/[\s,;:!?\-/]+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));
}

/**
 * Score a prior against search query words.
 * Uses the enriched searchText (from Claude) if available, otherwise
 * falls back to claim + description matching.
 */
function scorePrior(
  prior: { claim: string; description: string | null; category: string; searchText: string },
  queryWords: string[]
): number {
  const claimLower = prior.claim.toLowerCase();
  const searchLower = prior.searchText || `${claimLower} ${(prior.description ?? "").toLowerCase()} ${prior.category.toLowerCase()}`;

  let score = 0;
  for (const word of queryWords) {
    // Direct claim match (highest weight)
    if (claimLower.includes(word)) score += 10;
    // Match in enriched search text (includes synonyms, related questions, etc.)
    if (searchLower.includes(word)) score += 5;
  }

  return score;
}

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = searchPriorsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 400 }
    );
  }

  const { q, category, sort, page, limit } = parsed.data;

  const orderBy =
    sort === "recent"
      ? { createdAt: "desc" as const }
      : sort === "mostUpdated"
        ? { updateCount: "desc" as const }
        : { trendingScore: "desc" as const };

  let priors;
  let total;

  if (q) {
    const queryWords = tokenize(q);

    if (queryWords.length === 0) {
      // Query was all stop words, return everything
      const allPriors = await prisma.prior.findMany({
        where: category ? { category } : undefined,
        orderBy,
        select: PRIOR_SELECT,
      });
      total = allPriors.length;
      priors = allPriors.slice((page - 1) * limit, page * limit);
    } else {
      const allPriors = await prisma.prior.findMany({
        where: category ? { category } : undefined,
        select: PRIOR_SELECT,
      });

      const scored = allPriors
        .map((p) => ({ ...p, _score: scorePrior(p, queryWords) }))
        .filter((p) => p._score > 0)
        .sort((a, b) => b._score - a._score);

      total = scored.length;
      priors = scored.slice((page - 1) * limit, page * limit);
    }
  } else {
    const where = category ? { category } : {};
    [priors, total] = await Promise.all([
      prisma.prior.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: PRIOR_SELECT,
      }),
      prisma.prior.count({ where }),
    ]);
  }

  return NextResponse.json({ priors, total, page, limit });
}

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

  const parsed = createPriorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 400 }
    );
  }

  const { claim, description, category, initialProbability, distributionType, distributionParams } =
    parsed.data;

  const slug = slugify(claim, { lower: true, strict: true }).slice(0, 80);

  const existing = await prisma.prior.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "A similar prior already exists",
          existingSlug: existing.slug,
        },
      },
      { status: 409 }
    );
  }

  // Generate enriched search text using Claude (async, non-blocking fallback)
  let searchText = `${claim} ${description ?? ""} ${category}`.toLowerCase();
  try {
    searchText = await generateSearchText(claim, description, category);
  } catch {
    // Fallback already set above
  }

  const prior = await prisma.prior.create({
    data: {
      slug,
      claim,
      description,
      category,
      currentProbability: initialProbability,
      distributionType,
      distributionParams: distributionParams ? JSON.stringify(distributionParams) : "{}",
      searchText,
      creatorId: auth.userId,
    },
  });

  return NextResponse.json(prior, { status: 201 });
}
