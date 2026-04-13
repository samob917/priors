import { z } from "zod";

export const createPriorSchema = z.object({
  claim: z.string().min(10).max(500),
  description: z.string().max(2000).optional(),
  category: z.enum([
    "POLITICS",
    "ECONOMICS",
    "TECHNOLOGY",
    "SCIENCE",
    "SPORTS",
    "CULTURE",
    "HEALTH",
    "OTHER",
  ]).default("OTHER"),
  initialProbability: z.number().min(0.001).max(0.999),
  distributionType: z.enum(["POINT", "BETA", "NORMAL"]).default("POINT"),
  distributionParams: z.record(z.string(), z.number()).optional(),
});

export const submitUpdateSchema = z.object({
  evidenceDescription: z.string().min(5).max(2000),
  strength: z.number().min(-1).max(1).optional(),
  likelihoodRatio: z.number().positive().optional(),
  distributionUpdate: z
    .object({
      type: z.enum(["BETA", "NORMAL"]),
      evidence: z.record(z.string(), z.number()),
    })
    .optional(),
}).refine(
  (data) => data.strength !== undefined || data.likelihoodRatio !== undefined || data.distributionUpdate !== undefined,
  { message: "Must provide either strength, likelihoodRatio, or distributionUpdate" }
);

export const searchPriorsSchema = z.object({
  q: z.string().optional(),
  category: z.enum([
    "POLITICS",
    "ECONOMICS",
    "TECHNOLOGY",
    "SCIENCE",
    "SPORTS",
    "CULTURE",
    "HEALTH",
    "OTHER",
  ]).optional(),
  sort: z.enum(["trending", "recent", "mostUpdated"]).default("trending"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createApiKeySchema = z.object({
  label: z.string().min(1).max(100),
  scopes: z.array(z.enum(["read", "write"])).min(1),
  expiresInDays: z.number().int().positive().optional(),
});

export const linkFeedSchema = z.object({
  dataFeedId: z.string().min(1),
  externalMarketId: z.string().min(1),
  dampingFactor: z.number().min(0).max(1).default(0.3),
});
