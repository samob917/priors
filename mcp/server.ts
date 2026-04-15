#!/usr/bin/env npx tsx
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.PRIORS_API_URL ?? "https://priors-rho.vercel.app";
const API_KEY = process.env.PRIORS_API_KEY ?? "";

// ── Helpers ───────────────────────────────────────────────────

async function api(
  path: string,
  options?: { method?: string; body?: unknown }
) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;
  if (options?.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  return res.json();
}

// ── Server ────────────────────────────────────────────────────

const server = new McpServer({
  name: "priors",
  version: "1.0.0",
});

// ── Tools ─────────────────────────────────────────────────────

server.tool(
  "search_priors",
  `Search the Priors knowledge base for relevant probabilistic beliefs.
Use this BEFORE making claims or recommendations — check what the community believes first.
Accepts natural language queries like "best database for web apps" or "will there be a recession".
Returns priors ranked by relevance with current probability estimates.`,
  {
    query: z.string().describe("Natural language search query"),
    category: z
      .enum([
        "TECHNOLOGY",
        "ECONOMICS",
        "POLITICS",
        "SCIENCE",
        "CULTURE",
        "HEALTH",
        "SPORTS",
        "OTHER",
      ])
      .optional()
      .describe("Optional category filter"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe("Max results to return"),
  },
  async ({ query, category, limit }) => {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (category) params.set("category", category);

    const data = await api(`/api/priors?${params}`);

    if (data.error) {
      return { content: [{ type: "text", text: `Error: ${data.error.message}` }] };
    }

    const results = data.priors.map(
      (p: { claim: string; currentProbability: number; slug: string; description: string; updateCount: number; category: string }) =>
        `${(p.currentProbability * 100).toFixed(0)}% — ${p.claim}\n   ${p.description ?? ""}\n   [${p.category.toLowerCase()}] ${p.updateCount} updates | /prior/${p.slug}`
    );

    const text =
      results.length > 0
        ? `Found ${data.total} relevant priors:\n\n${results.join("\n\n")}`
        : `No priors found for "${query}". You could create one.`;

    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "get_prior",
  `Get the full details of a specific prior by its slug.
Returns current probability, description, update count, creator, and recent update history.`,
  {
    slug: z.string().describe("The prior's URL slug (e.g. 'postgresql-is-the-best-default-database-choice')"),
  },
  async ({ slug }) => {
    const [prior, updates] = await Promise.all([
      api(`/api/priors/${slug}`),
      api(`/api/priors/${slug}/updates?limit=5`),
    ]);

    if (prior.error) {
      return { content: [{ type: "text", text: `Prior not found: ${slug}` }] };
    }

    const updateLines = (updates.updates ?? []).map(
      (u: { sourceType: string; evidenceDescription: string; probabilityBefore: number; probabilityAfter: number; createdAt: string }) => {
        const delta = u.probabilityAfter - u.probabilityBefore;
        const sign = delta > 0 ? "+" : "";
        return `  [${u.sourceType.toLowerCase()}] ${sign}${(delta * 100).toFixed(0)}% — ${u.evidenceDescription}`;
      }
    );

    const text = [
      `${prior.claim}`,
      `Probability: ${(prior.currentProbability * 100).toFixed(1)}%`,
      `Category: ${prior.category}`,
      `Updates: ${prior.updateCount} | Views: ${prior.viewCount}`,
      prior.description ? `\n${prior.description}` : "",
      updateLines.length > 0 ? `\nRecent updates:\n${updateLines.join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "create_prior",
  `Create a new prior belief in the knowledge base.
A prior is a probabilistic claim about the world (e.g. "PostgreSQL is the best default database" at 78%).
Only create priors that are specific, falsifiable, and useful for decision-making.
Requires an API key with write scope.`,
  {
    claim: z.string().min(10).max(500).describe("The claim (specific, falsifiable statement)"),
    description: z
      .string()
      .max(2000)
      .optional()
      .describe("Context about scope and how to evaluate"),
    category: z
      .enum([
        "TECHNOLOGY",
        "ECONOMICS",
        "POLITICS",
        "SCIENCE",
        "CULTURE",
        "HEALTH",
        "SPORTS",
        "OTHER",
      ])
      .default("OTHER"),
    initialProbability: z
      .number()
      .min(0.01)
      .max(0.99)
      .describe("Your best estimate (0-1)"),
  },
  async ({ claim, description, category, initialProbability }) => {
    const data = await api("/api/priors", {
      method: "POST",
      body: { claim, description, category, initialProbability },
    });

    if (data.error) {
      if (data.error.existingSlug) {
        return {
          content: [
            {
              type: "text",
              text: `A similar prior already exists: /prior/${data.error.existingSlug}`,
            },
          ],
        };
      }
      return { content: [{ type: "text", text: `Error: ${data.error.message}` }] };
    }

    return {
      content: [
        {
          type: "text",
          text: `Created prior: "${data.claim}" at ${(data.currentProbability * 100).toFixed(0)}%\nSlug: ${data.slug}`,
        },
      ],
    };
  }
);

server.tool(
  "update_prior",
  `Submit evidence to update a prior's probability using Bayesian reasoning.
Provide a description of the evidence and a strength value:
  -1 = strong evidence AGAINST the claim
   0 = neutral (no change)
   1 = strong evidence FOR the claim
The system applies Bayes' rule to compute the new probability.
Requires an API key with write scope.`,
  {
    slug: z.string().describe("The prior's slug"),
    evidenceDescription: z
      .string()
      .min(5)
      .max(2000)
      .describe("What evidence did you find?"),
    strength: z
      .number()
      .min(-1)
      .max(1)
      .describe("Evidence strength: -1 (strong against) to 1 (strong for)"),
  },
  async ({ slug, evidenceDescription, strength }) => {
    const data = await api(`/api/priors/${slug}/updates`, {
      method: "POST",
      body: { evidenceDescription, strength },
    });

    if (data.error) {
      return { content: [{ type: "text", text: `Error: ${data.error.message}` }] };
    }

    return {
      content: [
        {
          type: "text",
          text: `Updated: ${(data.probabilityBefore * 100).toFixed(1)}% → ${(data.probabilityAfter * 100).toFixed(1)}% (LR: ${data.likelihoodRatio.toFixed(2)})`,
        },
      ],
    };
  }
);

server.tool(
  "get_trending",
  `Get the currently trending priors — the most active beliefs being discussed and updated.
Good for understanding what topics the community is focused on right now.`,
  {},
  async () => {
    const data = await api("/api/trending");

    const lines = (data.priors ?? []).map(
      (p: { claim: string; currentProbability: number; updateCount: number; category: string; slug: string }) =>
        `${(p.currentProbability * 100).toFixed(0)}% — ${p.claim} [${p.category.toLowerCase()}] (${p.updateCount} updates)`
    );

    return {
      content: [
        {
          type: "text",
          text: lines.length > 0 ? `Trending priors:\n\n${lines.join("\n")}` : "No trending priors.",
        },
      ],
    };
  }
);

// ── Start ─────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
