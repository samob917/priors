#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.PRIORS_API_URL ?? "https://priors-rho.vercel.app";
const API_KEY = process.env.PRIORS_API_KEY ?? "";

async function api(
  path: string,
  options?: { method?: string; body?: unknown }
) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;
  if (options?.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  return res.json();
}

const server = new McpServer({
  name: "priors",
  version: "0.1.0",
});

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
        "TECHNOLOGY", "ECONOMICS", "POLITICS", "SCIENCE",
        "CULTURE", "HEALTH", "SPORTS", "OTHER",
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
      return { content: [{ type: "text" as const, text: `Error: ${data.error.message}` }] };
    }

    const results = data.priors.map(
      (p: { claim: string; currentProbability: number; slug: string; description: string; updateCount: number; category: string }) =>
        `${(p.currentProbability * 100).toFixed(0)}% — ${p.claim}\n   ${p.description ?? ""}\n   [${p.category.toLowerCase()}] ${p.updateCount} updates | /prior/${p.slug}`
    );

    const text =
      results.length > 0
        ? `Found ${data.total} relevant priors:\n\n${results.join("\n\n")}`
        : `No priors found for "${query}". You could create one.`;

    return { content: [{ type: "text" as const, text }] };
  }
);

server.tool(
  "get_prior",
  `Get full details of a specific prior by its slug. Returns probability, description, update history.`,
  { slug: z.string().describe("The prior's URL slug") },
  async ({ slug }) => {
    const [prior, updates] = await Promise.all([
      api(`/api/priors/${slug}`),
      api(`/api/priors/${slug}/updates?limit=5`),
    ]);

    if (prior.error) {
      return { content: [{ type: "text" as const, text: `Prior not found: ${slug}` }] };
    }

    const updateLines = (updates.updates ?? []).map(
      (u: { sourceType: string; evidenceDescription: string; probabilityBefore: number; probabilityAfter: number }) => {
        const delta = u.probabilityAfter - u.probabilityBefore;
        const sign = delta > 0 ? "+" : "";
        return `  [${u.sourceType.toLowerCase()}] ${sign}${(delta * 100).toFixed(0)}% — ${u.evidenceDescription}`;
      }
    );

    const text = [
      prior.claim,
      `Probability: ${(prior.currentProbability * 100).toFixed(1)}%`,
      `Category: ${prior.category} | Updates: ${prior.updateCount} | Views: ${prior.viewCount}`,
      prior.description ? `\n${prior.description}` : "",
      updateLines.length > 0 ? `\nRecent updates:\n${updateLines.join("\n")}` : "",
    ].filter(Boolean).join("\n");

    return { content: [{ type: "text" as const, text }] };
  }
);

server.tool(
  "create_prior",
  `Create a new prior belief. Requires API key with write scope.`,
  {
    claim: z.string().min(10).max(500).describe("Specific, falsifiable statement"),
    description: z.string().max(2000).optional().describe("Context and evaluation criteria"),
    category: z.enum(["TECHNOLOGY", "ECONOMICS", "POLITICS", "SCIENCE", "CULTURE", "HEALTH", "SPORTS", "OTHER"]).default("OTHER"),
    initialProbability: z.number().min(0.01).max(0.99).describe("Your best estimate (0-1)"),
  },
  async ({ claim, description, category, initialProbability }) => {
    const data = await api("/api/priors", {
      method: "POST",
      body: { claim, description, category, initialProbability },
    });

    if (data.error) {
      const msg = data.error.existingSlug
        ? `Similar prior exists: /prior/${data.error.existingSlug}`
        : `Error: ${data.error.message}`;
      return { content: [{ type: "text" as const, text: msg }] };
    }

    return {
      content: [{ type: "text" as const, text: `Created: "${data.claim}" at ${(data.currentProbability * 100).toFixed(0)}% — /prior/${data.slug}` }],
    };
  }
);

server.tool(
  "update_prior",
  `Submit evidence to update a prior's probability. Strength: -1 (against) to 1 (for). Requires API key.`,
  {
    slug: z.string().describe("The prior's slug"),
    evidenceDescription: z.string().min(5).max(2000).describe("What evidence did you find?"),
    strength: z.number().min(-1).max(1).describe("-1 = strong against, 0 = neutral, 1 = strong for"),
  },
  async ({ slug, evidenceDescription, strength }) => {
    const data = await api(`/api/priors/${slug}/updates`, {
      method: "POST",
      body: { evidenceDescription, strength },
    });

    if (data.error) {
      return { content: [{ type: "text" as const, text: `Error: ${data.error.message}` }] };
    }

    return {
      content: [{ type: "text" as const, text: `Updated: ${(data.probabilityBefore * 100).toFixed(1)}% → ${(data.probabilityAfter * 100).toFixed(1)}%` }],
    };
  }
);

server.tool(
  "get_trending",
  `Get currently trending priors — most active beliefs being discussed.`,
  {},
  async () => {
    const data = await api("/api/trending");
    const lines = (data.priors ?? []).map(
      (p: { claim: string; currentProbability: number; updateCount: number; category: string }) =>
        `${(p.currentProbability * 100).toFixed(0)}% — ${p.claim} [${p.category.toLowerCase()}] (${p.updateCount} updates)`
    );
    return {
      content: [{ type: "text" as const, text: lines.length > 0 ? `Trending:\n\n${lines.join("\n")}` : "No trending priors." }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
