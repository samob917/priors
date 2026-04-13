import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import slugify from "slugify";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@priors.app" },
    update: {},
    create: {
      email: "demo@priors.app",
      name: "Demo User",
      passwordHash: hashSync("password123", 10),
    },
  });

  const priors = [
    {
      claim: "Next.js is the best full-stack framework for new web apps",
      description:
        "Considering developer experience, ecosystem maturity, deployment options, and performance.",
      category: "TECHNOLOGY",
      probability: 0.62,
    },
    {
      claim: "PostgreSQL is the best default database choice",
      description:
        "For general-purpose applications where you need relational data, JSON support, and reliability.",
      category: "TECHNOLOGY",
      probability: 0.78,
    },
    {
      claim: "TypeScript is worth the overhead for most projects",
      description:
        "Considering compile-time safety, tooling, and maintainability vs. added build complexity.",
      category: "TECHNOLOGY",
      probability: 0.85,
    },
    {
      claim: "US enters recession by end of 2027",
      description:
        "Whether the United States economy will officially enter a recession (two consecutive quarters of negative GDP growth) before January 1, 2028.",
      category: "ECONOMICS",
      probability: 0.3,
    },
    {
      claim: "Remote work improves developer productivity",
      description:
        "Compared to full-time in-office for software engineering roles.",
      category: "CULTURE",
      probability: 0.64,
    },
    {
      claim: "LLMs will replace most junior dev tasks by 2028",
      description:
        "Whether AI coding assistants will automate the majority of tasks currently done by junior developers.",
      category: "TECHNOLOGY",
      probability: 0.41,
    },
    {
      claim: "Bitcoin exceeds $200k by end of 2026",
      description:
        "Whether the price of Bitcoin (BTC/USD) will exceed $200,000 at any point before January 1, 2027.",
      category: "ECONOMICS",
      probability: 0.2,
    },
    {
      claim: "React remains the dominant frontend framework through 2028",
      description:
        "Measured by npm downloads, job postings, and new project adoption rates.",
      category: "TECHNOLOGY",
      probability: 0.72,
    },
  ];

  for (const p of priors) {
    const slug = slugify(p.claim, { lower: true, strict: true }).slice(0, 80);
    const existing = await prisma.prior.findUnique({ where: { slug } });
    if (!existing) {
      await prisma.prior.create({
        data: {
          slug,
          claim: p.claim,
          description: p.description,
          category: p.category,
          currentProbability: p.probability,
          creatorId: user.id,
        },
      });
    }
  }

  // Add some sample updates
  const nextjsPrior = await prisma.prior.findFirst({
    where: { slug: { contains: "nextjs" } },
  });
  if (nextjsPrior) {
    const updateCount = await prisma.priorUpdate.count({
      where: { priorId: nextjsPrior.id },
    });
    if (updateCount === 0) {
      await prisma.priorUpdate.createMany({
        data: [
          {
            priorId: nextjsPrior.id,
            userId: user.id,
            sourceType: "USER",
            evidenceDescription:
              "Next.js 16 released with significant performance improvements and simplified API routes",
            likelihoodRatio: 1.995,
            probabilityBefore: 0.58,
            probabilityAfter: 0.62,
          },
          {
            priorId: nextjsPrior.id,
            userId: user.id,
            sourceType: "AGENT",
            evidenceDescription:
              "Survey of 500 startups shows 34% chose Next.js as primary framework, up from 28% last year",
            likelihoodRatio: 1.58,
            probabilityBefore: 0.55,
            probabilityAfter: 0.58,
          },
          {
            priorId: nextjsPrior.id,
            sourceType: "DATA_FEED",
            evidenceDescription:
              "npm download trends show Next.js growing 15% QoQ while alternatives remain flat",
            likelihoodRatio: 1.38,
            probabilityBefore: 0.52,
            probabilityAfter: 0.55,
          },
        ],
      });
      await prisma.prior.update({
        where: { id: nextjsPrior.id },
        data: { updateCount: 3 },
      });
    }
  }

  console.log("Seed complete: 1 user, 8 priors, sample updates");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
