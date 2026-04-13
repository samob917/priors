import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { createPriorSchema, searchPriorsSchema } from "@/lib/validation";
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
} as const;

// Common synonyms/related terms for better recall
const SYNONYMS: Record<string, string[]> = {
  db: ["database", "sql", "postgres", "postgresql", "mysql", "sqlite", "mongo"],
  database: ["db", "sql", "postgres", "postgresql", "data", "storage"],
  frontend: ["react", "vue", "angular", "ui", "framework", "web"],
  backend: ["server", "api", "node", "go", "rust", "python"],
  stack: ["framework", "language", "tool", "technology"],
  crypto: ["bitcoin", "btc", "ethereum", "blockchain"],
  bitcoin: ["btc", "crypto", "cryptocurrency"],
  ai: ["llm", "gpt", "ml", "machine learning", "artificial intelligence", "agent"],
  llm: ["ai", "gpt", "language model", "chatbot"],
  job: ["work", "career", "employment", "hiring", "developer", "task"],
  remote: ["work from home", "wfh", "distributed", "hybrid", "office"],
  home: ["remote", "wfh", "office"],
  money: ["price", "cost", "economy", "economic", "financial"],
  recession: ["economy", "economic", "downturn", "gdp"],
  price: ["cost", "value", "worth", "exceed"],
  programming: ["coding", "software", "development", "developer", "dev"],
  language: ["typescript", "javascript", "python", "rust", "go", "java"],
  framework: ["react", "next", "nextjs", "vue", "angular", "svelte"],
};

/**
 * Score a prior against a search query using word-level matching.
 * Returns a score > 0 for matches, 0 for no match.
 */
function scorePrior(
  prior: { claim: string; description: string | null; category: string },
  queryWords: string[]
): number {
  const claimLower = prior.claim.toLowerCase();
  const descLower = (prior.description ?? "").toLowerCase();
  const catLower = prior.category.toLowerCase();
  const fullText = `${claimLower} ${descLower} ${catLower}`;

  let score = 0;

  for (const word of queryWords) {
    // Direct word match in claim (highest weight)
    if (claimLower.includes(word)) {
      score += 10;
    }
    // Direct word match in description
    if (descLower.includes(word)) {
      score += 5;
    }
    // Category match
    if (catLower.includes(word)) {
      score += 3;
    }

    // Synonym expansion: check if any synonym of the query word appears
    const syns = SYNONYMS[word];
    if (syns) {
      for (const syn of syns) {
        if (fullText.includes(syn)) {
          score += 4; // synonym match is worth less than direct match
          break; // only count best synonym match per query word
        }
      }
    }
  }

  return score;
}

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

  const prior = await prisma.prior.create({
    data: {
      slug,
      claim,
      description,
      category,
      currentProbability: initialProbability,
      distributionType,
      distributionParams: distributionParams ? JSON.stringify(distributionParams) : "{}",
      creatorId: auth.userId,
    },
  });

  return NextResponse.json(prior, { status: 201 });
}
