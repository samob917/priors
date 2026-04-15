#!/usr/bin/env npx tsx
/**
 * Auto-Prior Agent
 *
 * Reads trending topics from various sources and creates/updates priors
 * in the Priors knowledge base. Run manually or on a cron schedule.
 *
 * Usage:
 *   PRIORS_API_KEY=pk_... ANTHROPIC_API_KEY=sk-ant-... npx tsx agents/auto-prior.ts
 *
 * What it does:
 *   1. Asks Claude what important, falsifiable beliefs people should track
 *   2. Checks if those priors already exist in the knowledge base
 *   3. Creates new priors with calibrated initial probabilities
 *   4. For existing priors, submits evidence updates if it finds new info
 */

import Anthropic from "@anthropic-ai/sdk";

const PRIORS_API = process.env.PRIORS_API_URL ?? "https://priors-rho.vercel.app";
const API_KEY = process.env.PRIORS_API_KEY ?? "";

if (!API_KEY) {
  console.error("Error: PRIORS_API_KEY is required");
  console.error("Create one at https://priors-rho.vercel.app/dashboard");
  process.exit(1);
}

const anthropic = new Anthropic();
const headers: Record<string, string> = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

interface PriorSuggestion {
  claim: string;
  description: string;
  category: string;
  initialProbability: number;
  reasoning: string;
}

async function api(path: string, options?: { method?: string; body?: unknown }) {
  const res = await fetch(`${PRIORS_API}${path}`, {
    method: options?.method ?? "GET",
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  return res.json();
}

async function generatePriorSuggestions(
  topic?: string
): Promise<PriorSuggestion[]> {
  const prompt = topic
    ? `Generate 5 important, falsifiable probabilistic beliefs about: ${topic}`
    : `Generate 5 important, falsifiable probabilistic beliefs that people and AI agents should track right now.
Focus on claims that are:
- Specific and falsifiable (not vague opinions)
- Useful for decision-making
- Spanning technology, economics, science, and culture
- Timely and relevant to 2026-2028`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `${prompt}

For each belief, provide a JSON array with objects containing:
- claim: the specific statement (10-500 chars)
- description: context and evaluation criteria (1-2 sentences)
- category: one of TECHNOLOGY, ECONOMICS, POLITICS, SCIENCE, CULTURE, HEALTH, SPORTS, OTHER
- initialProbability: your best calibrated estimate (0.01-0.99)
- reasoning: why you set this probability (1 sentence)

Return ONLY the JSON array, no other text.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "[]";

  try {
    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error("Failed to parse suggestions:", text.slice(0, 200));
    return [];
  }
}

async function createOrUpdatePrior(suggestion: PriorSuggestion) {
  // Check if a similar prior already exists
  const searchResult = await api(
    `/api/priors?q=${encodeURIComponent(suggestion.claim)}&limit=3`
  );

  const existing = searchResult.priors?.find(
    (p: { claim: string }) =>
      p.claim.toLowerCase().includes(suggestion.claim.toLowerCase().slice(0, 30)) ||
      suggestion.claim.toLowerCase().includes(p.claim.toLowerCase().slice(0, 30))
  );

  if (existing) {
    console.log(`  ↳ Similar prior exists: "${existing.claim.slice(0, 50)}..." — skipping`);
    return { action: "skipped", slug: existing.slug };
  }

  // Create new prior
  const result = await api("/api/priors", {
    method: "POST",
    body: {
      claim: suggestion.claim,
      description: suggestion.description,
      category: suggestion.category,
      initialProbability: suggestion.initialProbability,
    },
  });

  if (result.error) {
    if (result.error.existingSlug) {
      console.log(`  ↳ Already exists at /prior/${result.error.existingSlug}`);
      return { action: "exists", slug: result.error.existingSlug };
    }
    console.error(`  ✗ Error: ${result.error.message}`);
    return { action: "error", error: result.error.message };
  }

  console.log(
    `  ✓ Created: ${(result.currentProbability * 100).toFixed(0)}% — ${result.claim}`
  );
  return { action: "created", slug: result.slug };
}

async function main() {
  const topic = process.argv[2]; // Optional topic argument

  console.log(
    topic
      ? `Generating priors about: ${topic}`
      : "Generating general priors..."
  );
  console.log(`API: ${PRIORS_API}\n`);

  const suggestions = await generatePriorSuggestions(topic);

  if (suggestions.length === 0) {
    console.log("No suggestions generated.");
    return;
  }

  console.log(`Generated ${suggestions.length} suggestions:\n`);

  const results = { created: 0, skipped: 0, errors: 0 };

  for (const suggestion of suggestions) {
    console.log(
      `${(suggestion.initialProbability * 100).toFixed(0)}% — ${suggestion.claim}`
    );
    console.log(`  ${suggestion.reasoning}`);

    const result = await createOrUpdatePrior(suggestion);

    if (result.action === "created") results.created++;
    else if (result.action === "error") results.errors++;
    else results.skipped++;

    console.log();
  }

  console.log("---");
  console.log(
    `Done: ${results.created} created, ${results.skipped} skipped, ${results.errors} errors`
  );
}

main().catch(console.error);
