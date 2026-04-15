/**
 * Generate rich search metadata for a prior.
 * If ANTHROPIC_API_KEY is set, uses Claude Haiku for high-quality expansion.
 * Otherwise, uses local keyword extraction as a solid fallback.
 */
export async function generateSearchText(
  claim: string,
  description?: string | null,
  category?: string
): Promise<string> {
  const base = `${claim} ${description ?? ""} ${category ?? ""}`;

  // Try Claude if API key is available
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const anthropic = new Anthropic();

      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Generate search metadata for this belief/prior. Output ONLY a flat list of keywords, synonyms, related terms, and natural questions someone might ask that this prior would answer. No headers, no formatting, just terms separated by spaces.

Claim: ${claim}
${description ? `Description: ${description}` : ""}
${category ? `Category: ${category}` : ""}

Include: synonyms, related concepts, alternative phrasings, questions this answers, abbreviations, technical and non-technical terms. Keep it under 200 words.`,
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      return `${base} ${text}`.toLowerCase();
    } catch (err) {
      console.warn("Claude search enrichment failed, using local fallback:", err);
    }
  }

  // Local fallback: extract meaningful words + basic expansion
  return localEnrich(claim, description, category);
}

/**
 * Local keyword extraction — no API needed.
 * Splits the claim into words and adds basic related terms.
 */
function localEnrich(
  claim: string,
  description?: string | null,
  category?: string
): string {
  const base = `${claim} ${description ?? ""} ${category ?? ""}`.toLowerCase();

  // Common expansions for terms that appear in the claim
  const expansions: Record<string, string> = {
    database: "db sql postgres mysql mongo nosql data storage backend",
    postgresql: "postgres db database sql relational rdbms",
    postgres: "postgresql db database sql relational rdbms",
    react: "reactjs frontend ui component jsx hooks framework web",
    nextjs: "next.js react framework fullstack ssr vercel web app",
    "next.js": "nextjs react framework fullstack ssr vercel web app",
    typescript: "ts javascript js type safety typed static types dx",
    javascript: "js typescript ts web frontend backend node",
    bitcoin: "btc crypto cryptocurrency blockchain digital currency price",
    crypto: "bitcoin btc ethereum blockchain digital currency web3",
    recession: "economy economic downturn gdp growth unemployment",
    economy: "economic recession gdp inflation interest rates",
    remote: "wfh work from home distributed hybrid office telecommute",
    ai: "artificial intelligence llm ml machine learning gpt claude",
    llm: "large language model ai gpt claude copilot coding assistant",
    rust: "systems programming memory safety performance backend",
    go: "golang backend server performance concurrency",
    framework: "library tool stack technology platform",
    developer: "dev programmer engineer software coding",
    productivity: "efficiency output performance focus work",
  };

  const words = base.split(/\s+/);
  const extra: string[] = [];

  for (const word of words) {
    const clean = word.replace(/[^a-z0-9.]/g, "");
    if (expansions[clean]) {
      extra.push(expansions[clean]);
    }
  }

  return `${base} ${extra.join(" ")}`;
}
