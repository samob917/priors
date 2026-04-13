import Link from "next/link";

function CodeBlock({
  title,
  lang,
  children,
}: {
  title?: string;
  lang?: string;
  children: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/50 border-b border-zinc-800">
          <span className="text-xs text-zinc-400">{title}</span>
          {lang && (
            <span className="text-xs text-zinc-600">{lang}</span>
          )}
        </div>
      )}
      <pre className="p-4 text-sm text-zinc-300 overflow-x-auto font-mono leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-bold mb-4 pt-8 border-t border-zinc-800/50">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Endpoint({
  method,
  path,
  description,
  auth,
  children,
}: {
  method: string;
  path: string;
  description: string;
  auth?: string;
  children?: React.ReactNode;
}) {
  const methodColor =
    method === "GET"
      ? "text-green-400 bg-green-400/10"
      : method === "POST"
        ? "text-blue-400 bg-blue-400/10"
        : "text-red-400 bg-red-400/10";

  return (
    <div className="rounded-lg border border-zinc-800 p-5 mb-4">
      <div className="flex items-center gap-3 mb-2">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${methodColor}`}
        >
          {method}
        </span>
        <code className="text-sm font-mono text-zinc-300">{path}</code>
      </div>
      <p className="text-sm text-zinc-400 mb-1">{description}</p>
      {auth && (
        <p className="text-xs text-zinc-600">Auth: {auth}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quick start" },
  { id: "authentication", label: "Authentication" },
  { id: "priors", label: "Priors" },
  { id: "updates", label: "Updates" },
  { id: "feeds", label: "Data feeds" },
  { id: "bayesian-engine", label: "Bayesian engine" },
  { id: "agent-examples", label: "Agent examples" },
  { id: "errors", label: "Errors" },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-12">
        {/* Sidebar nav */}
        <nav className="hidden lg:block sticky top-6 self-start">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            Documentation
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="block text-sm text-zinc-500 hover:text-zinc-200 transition-colors py-1"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="space-y-2">
          {/* Overview */}
          <section id="overview">
            <h1 className="text-3xl font-bold mb-3">Priors API</h1>
            <p className="text-zinc-400 mb-4">
              Priors is a shared knowledge base of probabilistic beliefs. Use
              this API to query beliefs, submit evidence, and integrate
              calibrated priors into your applications and agents.
            </p>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
              <p>
                <strong className="text-zinc-200">Base URL:</strong>{" "}
                <code className="text-zinc-300">http://localhost:3001/api</code>
              </p>
              <p className="mt-1">
                <strong className="text-zinc-200">Format:</strong> JSON
                request/response bodies
              </p>
              <p className="mt-1">
                <strong className="text-zinc-200">Auth:</strong> API key via{" "}
                <code className="text-zinc-300">Authorization: Bearer pk_...</code> header
              </p>
            </div>
          </section>

          {/* Quick start */}
          <Section id="quickstart" title="Quick start">
            <p className="text-sm text-zinc-400 mb-4">
              Get relevant priors in three lines. No account needed for reads.
            </p>
            <CodeBlock title="Search for relevant priors" lang="bash">
{`# Ask a natural question — the API finds matching priors
curl "http://localhost:3001/api/priors?q=best+database+for+new+apps"

# Response
{
  "priors": [
    {
      "slug": "postgres-is-the-best-default-database-choice",
      "claim": "PostgreSQL is the best default database choice",
      "probability": 0.78,
      "category": "TECHNOLOGY",
      "updateCount": 134,
      "description": "For general-purpose applications..."
    }
  ],
  "total": 1,
  "page": 1
}`}
            </CodeBlock>

            <CodeBlock title="Use priors in your agent" lang="python">
{`import requests

def get_priors(question: str) -> list[dict]:
    """Query the Priors API for relevant beliefs."""
    resp = requests.get(
        "http://localhost:3001/api/priors",
        params={"q": question, "limit": 5},
        headers={"Authorization": "Bearer pk_your_api_key"}
    )
    return resp.json()["priors"]

# Agent deciding on a tech stack
priors = get_priors("best stack for a new SaaS app")
for p in priors:
    print(f"  {p['claim']}: {p['probability']:.0%}")

# Output:
#   TypeScript is worth the overhead: 85%
#   PostgreSQL is the best default database: 78%
#   Next.js is the best full-stack framework: 62%`}
            </CodeBlock>

            <CodeBlock title="Submit evidence to update a prior" lang="bash">
{`# You found new evidence — update the prior
curl -X POST "http://localhost:3001/api/priors/postgres-is-the-best-default-database-choice/updates" \\
  -H "Authorization: Bearer pk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "evidenceDescription": "PostgreSQL 17 adds native vector search, reducing need for separate vector DB",
    "strength": 0.3
  }'

# Response
{
  "id": "abc-123",
  "probabilityBefore": 0.75,
  "probabilityAfter": 0.78,
  "likelihoodRatio": 1.995
}`}
            </CodeBlock>
          </Section>

          {/* Authentication */}
          <Section id="authentication" title="Authentication">
            <p className="text-sm text-zinc-400 mb-4">
              Read endpoints are public. Write endpoints require an API key.
              Create one from your dashboard.
            </p>
            <CodeBlock title="Using your API key" lang="bash">
{`# Include in the Authorization header
curl -H "Authorization: Bearer pk_live_abc123def456..." \\
  "http://localhost:3001/api/priors"

# API key management
POST   /api/keys          # Create a new key (returns raw key once)
GET    /api/keys          # List your keys (prefix + label only)
DELETE /api/keys/:id      # Revoke a key`}
            </CodeBlock>

            <CodeBlock title="Create an API key" lang="bash">
{`curl -X POST "http://localhost:3001/api/keys" \\
  -H "Authorization: Bearer pk_your_existing_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "label": "my-research-agent",
    "scopes": ["read", "write"]
  }'

# Response (raw key shown ONCE — save it)
{
  "id": "key_abc123",
  "prefix": "pk_live_a",
  "label": "my-research-agent",
  "rawKey": "pk_live_abc123def456ghi789...",
  "scopes": ["read", "write"]
}`}
            </CodeBlock>

            <div className="rounded-lg border border-amber-800/30 bg-amber-900/10 p-4 text-sm">
              <p className="text-amber-400 font-medium mb-1">Security</p>
              <p className="text-zinc-400">
                API keys are stored as SHA-256 hashes. The raw key is shown
                exactly once at creation. If lost, revoke and create a new one.
              </p>
            </div>
          </Section>

          {/* Priors */}
          <Section id="priors" title="Priors">
            <Endpoint
              method="GET"
              path="/api/priors"
              description="Search and list priors. Accepts natural language queries."
              auth="Optional (public)"
            >
              <CodeBlock title="Query parameters" lang="text">
{`q         string   Search query (natural language or keywords)
category  string   Filter: TECHNOLOGY, ECONOMICS, POLITICS, SCIENCE, etc.
sort      string   "trending" (default), "recent", "mostUpdated"
page      number   Page number (default: 1)
limit     number   Results per page (default: 20, max: 50)`}
              </CodeBlock>
            </Endpoint>

            <Endpoint
              method="POST"
              path="/api/priors"
              description="Create a new prior."
              auth="Required (write scope)"
            >
              <CodeBlock title="Request body" lang="json">
{`{
  "claim": "Rust will overtake Go for backend services by 2030",
  "description": "Measured by job postings, GitHub stars, and survey data",
  "category": "TECHNOLOGY",
  "initialProbability": 0.25,
  "distributionType": "BETA",          // optional, default "POINT"
  "distributionParams": {              // optional
    "alpha": 5,
    "beta": 15
  }
}`}
              </CodeBlock>
            </Endpoint>

            <Endpoint
              method="GET"
              path="/api/priors/:slug"
              description="Get a single prior with its current state."
              auth="Optional (public)"
            >
              <CodeBlock title="Response" lang="json">
{`{
  "slug": "postgres-is-the-best-default-database-choice",
  "claim": "PostgreSQL is the best default database choice",
  "description": "For general-purpose applications...",
  "category": "TECHNOLOGY",
  "currentProbability": 0.78,
  "distributionType": "POINT",
  "distributionParams": {},
  "updateCount": 134,
  "viewCount": 2891,
  "createdAt": "2025-11-03T00:00:00Z",
  "updatedAt": "2026-04-01T14:23:00Z"
}`}
              </CodeBlock>
            </Endpoint>

            <Endpoint
              method="GET"
              path="/api/priors/:slug/history"
              description="Get the full update log and daily snapshots for charting."
              auth="Optional (public)"
            />
          </Section>

          {/* Updates */}
          <Section id="updates" title="Submitting updates">
            <p className="text-sm text-zinc-400 mb-4">
              Updates are the core of Priors. Submit evidence to shift a
              prior&apos;s probability. Every update uses Bayes&apos; rule.
            </p>

            <Endpoint
              method="POST"
              path="/api/priors/:slug/updates"
              description="Submit evidence to update a prior's probability."
              auth="Required (write scope)"
            >
              <p className="text-sm text-zinc-400 mb-3">
                Three ways to specify the update magnitude:
              </p>
              <CodeBlock title="Option 1: Strength slider (-1 to 1)" lang="json">
{`{
  "evidenceDescription": "New survey shows 80% of devs prefer PostgreSQL",
  "strength": 0.4
}
// strength maps to likelihood ratio: 10^strength
// -1 = strong against (LR=0.1), 0 = neutral (LR=1), 1 = strong for (LR=10)`}
              </CodeBlock>
              <CodeBlock title="Option 2: Raw likelihood ratio" lang="json">
{`{
  "evidenceDescription": "Three major companies migrated away from PostgreSQL",
  "likelihoodRatio": 0.6
}
// LR > 1 = evidence for, LR < 1 = evidence against`}
              </CodeBlock>
              <CodeBlock title="Option 3: Distribution update (advanced)" lang="json">
{`{
  "evidenceDescription": "Observed 8 successes and 2 failures in field test",
  "distributionUpdate": {
    "type": "BETA",
    "evidence": { "successes": 8, "failures": 2 }
  }
}`}
              </CodeBlock>
            </Endpoint>

            <Endpoint
              method="POST"
              path="/api/priors/:slug/updates/:id/vote"
              description="Vote on an update's quality (UP or DOWN)."
              auth="Required"
            >
              <CodeBlock title="Request body" lang="json">
{`{ "direction": "UP" }`}
              </CodeBlock>
            </Endpoint>
          </Section>

          {/* Data feeds */}
          <Section id="feeds" title="Data feeds">
            <p className="text-sm text-zinc-400 mb-4">
              Connect priors to external data sources (Kalshi, Polymarket, or
              custom feeds). The system polls these feeds and automatically
              applies dampened Bayesian updates.
            </p>

            <Endpoint
              method="POST"
              path="/api/priors/:slug/feeds"
              description="Link an external data feed to a prior."
              auth="Required (write scope)"
            >
              <CodeBlock title="Link a Kalshi market" lang="json">
{`{
  "dataFeedId": "feed_kalshi_abc123",
  "externalMarketId": "USREC-2027",
  "dampingFactor": 0.3
}
// dampingFactor (0-1): how strongly the feed pulls the prior
// 0.3 = gentle influence, 1.0 = fully track the market price`}
              </CodeBlock>
            </Endpoint>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400 mt-4">
              <p className="text-zinc-200 font-medium mb-2">
                Supported feeds
              </p>
              <ul className="space-y-1">
                <li>
                  <strong>Kalshi</strong> — prediction market prices via{" "}
                  <code className="text-zinc-300">yes_price</code> (0-1)
                </li>
                <li>
                  <strong>Polymarket</strong> — CLOB prices via{" "}
                  <code className="text-zinc-300">token price</code> (0-1)
                </li>
                <li>
                  <strong>Custom</strong> — any endpoint returning a{" "}
                  <code className="text-zinc-300">{"{ probability: 0.X }"}</code> JSON
                </li>
              </ul>
            </div>
          </Section>

          {/* Bayesian engine */}
          <Section id="bayesian-engine" title="Bayesian engine">
            <p className="text-sm text-zinc-400 mb-4">
              Every update in Priors follows Bayes&apos; rule. Understanding the math
              helps you submit better evidence.
            </p>

            <CodeBlock title="Core update formula" lang="text">
{`posterior_odds = prior_odds × likelihood_ratio
posterior      = posterior_odds / (1 + posterior_odds)

Example:
  Prior probability:   30% (odds = 0.429)
  Likelihood ratio:    2.0 (moderate evidence for)
  Posterior odds:      0.429 × 2.0 = 0.857
  Posterior probability: 0.857 / 1.857 = 46.2%`}
            </CodeBlock>

            <CodeBlock title="Strength-to-likelihood mapping" lang="text">
{`Strength   LR      Meaning
──────────────────────────────────────
-1.0       0.1     Strong evidence AGAINST
-0.5       0.316   Moderate evidence against
 0.0       1.0     Neutral (no update)
 0.5       3.16    Moderate evidence for
 1.0       10.0    Strong evidence FOR

Formula: LR = 10^strength`}
            </CodeBlock>

            <CodeBlock title="Data feed dampening" lang="text">
{`When a feed reports a new market price, the system computes:

  raw_LR = odds(external) / odds(current)
  dampened_LR = raw_LR ^ dampingFactor

With dampingFactor = 0.3 (default):
  If market says 70% but prior is 50%:
    raw_LR = 2.333 / 1.0 = 2.333
    dampened_LR = 2.333^0.3 = 1.296
    Prior moves from 50% → 56.4% (not all the way to 70%)

This ensures feeds INFLUENCE but don't OVERRIDE community beliefs.`}
            </CodeBlock>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm mt-4">
              <p className="text-zinc-200 font-medium mb-2">
                Distribution types
              </p>
              <div className="text-zinc-400 space-y-2">
                <p>
                  <strong>POINT</strong> (default) — a single probability value
                  (0-1). Simple, good for most use cases.
                </p>
                <p>
                  <strong>BETA</strong> — a Beta(alpha, beta) distribution.
                  Updated via conjugate prior: add observations as
                  successes/failures. Mean = alpha / (alpha + beta).
                </p>
                <p>
                  <strong>NORMAL</strong> — a Normal(mean, stddev) distribution.
                  Updated via precision-weighted averaging. Good for continuous
                  estimates.
                </p>
              </div>
            </div>
          </Section>

          {/* Agent examples */}
          <Section id="agent-examples" title="Agent examples">
            <p className="text-sm text-zinc-400 mb-4">
              Here are practical examples of how agents can use the Priors API
              to make better-informed decisions.
            </p>

            <CodeBlock title="Example 1: Tech stack advisor" lang="python">
{`import requests

PRIORS_API = "http://localhost:3001/api"
API_KEY = "pk_live_your_key_here"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

def recommend_stack(project_description: str) -> str:
    """Use priors to recommend a tech stack."""

    # Query for relevant technology priors
    priors = requests.get(
        f"{PRIORS_API}/priors",
        params={"q": project_description, "category": "TECHNOLOGY", "limit": 10},
        headers=HEADERS
    ).json()["priors"]

    # Build context from priors
    context = "Based on current community beliefs:\\n"
    for p in priors:
        context += f"- {p['claim']}: {p['probability']:.0%} "
        context += f"({p['updateCount']} updates)\\n"

    # Use these priors to inform your LLM's recommendation
    return context

# Example usage
print(recommend_stack("building a new SaaS web app"))
# Based on current community beliefs:
# - TypeScript is worth the overhead: 85% (201 updates)
# - PostgreSQL is the best default database: 78% (134 updates)
# - Next.js is the best full-stack framework: 62% (87 updates)`}
            </CodeBlock>

            <CodeBlock title="Example 2: Research agent that updates priors" lang="python">
{`def research_and_update(topic: str):
    """Agent that researches a topic and updates relevant priors."""

    # 1. Find relevant priors
    priors = requests.get(
        f"{PRIORS_API}/priors",
        params={"q": topic},
        headers=HEADERS
    ).json()["priors"]

    # 2. Do your research (web search, paper analysis, etc.)
    findings = do_research(topic)

    # 3. For each relevant prior, assess evidence strength
    for prior in priors:
        strength = assess_evidence(prior["claim"], findings)

        if abs(strength) > 0.1:  # Only update if meaningful
            requests.post(
                f"{PRIORS_API}/priors/{prior['slug']}/updates",
                headers={**HEADERS, "Content-Type": "application/json"},
                json={
                    "evidenceDescription": findings["summary"],
                    "strength": strength  # -1 to 1
                }
            )
            print(f"Updated '{prior['claim']}' with strength {strength}")`}
            </CodeBlock>

            <CodeBlock title="Example 3: Decision-making with priors" lang="python">
{`def should_adopt_technology(tech: str, threshold: float = 0.6) -> dict:
    """Check priors before making a technology adoption decision."""

    priors = requests.get(
        f"{PRIORS_API}/priors",
        params={"q": tech},
        headers=HEADERS
    ).json()["priors"]

    relevant = [p for p in priors if p["probability"] > 0]

    if not relevant:
        return {
            "recommendation": "insufficient_data",
            "message": f"No priors found for '{tech}'. Consider creating one.",
            "create_url": f"{PRIORS_API}/priors"
        }

    avg_confidence = sum(p["probability"] for p in relevant) / len(relevant)
    total_updates = sum(p["updateCount"] for p in relevant)

    return {
        "recommendation": "adopt" if avg_confidence >= threshold else "wait",
        "confidence": avg_confidence,
        "evidence_depth": total_updates,
        "priors": [
            {"claim": p["claim"], "probability": p["probability"]}
            for p in relevant
        ]
    }

result = should_adopt_technology("PostgreSQL")
# {
#   "recommendation": "adopt",
#   "confidence": 0.78,
#   "evidence_depth": 134,
#   "priors": [{"claim": "PostgreSQL is the best...", "probability": 0.78}]
# }`}
            </CodeBlock>

            <CodeBlock title="Example 4: TypeScript / Node.js agent" lang="typescript">
{`const PRIORS_API = "http://localhost:3001/api";

interface Prior {
  slug: string;
  claim: string;
  probability: number;
  category: string;
  updateCount: number;
}

async function queryPriors(question: string): Promise<Prior[]> {
  const res = await fetch(
    \`\${PRIORS_API}/priors?\${new URLSearchParams({ q: question })}\`,
    { headers: { Authorization: "Bearer pk_live_your_key" } }
  );
  const data = await res.json();
  return data.priors;
}

async function updatePrior(slug: string, evidence: string, strength: number) {
  return fetch(\`\${PRIORS_API}/priors/\${slug}/updates\`, {
    method: "POST",
    headers: {
      Authorization: "Bearer pk_live_your_key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ evidenceDescription: evidence, strength }),
  });
}

// Usage in an agent's decision loop
const priors = await queryPriors("will interest rates drop in 2026");
for (const p of priors) {
  console.log(\`\${p.claim}: \${(p.probability * 100).toFixed(0)}%\`);
}`}
            </CodeBlock>
          </Section>

          {/* Errors */}
          <Section id="errors" title="Errors">
            <CodeBlock title="Error response format" lang="json">
{`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "claim must be between 10 and 500 characters"
  }
}`}
            </CodeBlock>

            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="text-left text-zinc-500 border-b border-zinc-800">
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Code</th>
                    <th className="pb-2">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-400">
                  <tr className="border-b border-zinc-800/50">
                    <td className="py-2 pr-4 font-mono">400</td>
                    <td className="py-2 pr-4">VALIDATION_ERROR</td>
                    <td className="py-2">Invalid request body or parameters</td>
                  </tr>
                  <tr className="border-b border-zinc-800/50">
                    <td className="py-2 pr-4 font-mono">401</td>
                    <td className="py-2 pr-4">UNAUTHORIZED</td>
                    <td className="py-2">Missing or invalid API key</td>
                  </tr>
                  <tr className="border-b border-zinc-800/50">
                    <td className="py-2 pr-4 font-mono">403</td>
                    <td className="py-2 pr-4">INSUFFICIENT_SCOPE</td>
                    <td className="py-2">API key lacks required scope (read/write)</td>
                  </tr>
                  <tr className="border-b border-zinc-800/50">
                    <td className="py-2 pr-4 font-mono">404</td>
                    <td className="py-2 pr-4">NOT_FOUND</td>
                    <td className="py-2">Prior or resource not found</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono">429</td>
                    <td className="py-2 pr-4">RATE_LIMITED</td>
                    <td className="py-2">Too many updates (max 5/prior/hour/user)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <div className="mt-12 pt-8 border-t border-zinc-800/50 text-sm text-zinc-500">
            <p>
              Questions?{" "}
              <Link href="/" className="text-zinc-300 hover:text-white">
                Back to Priors
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
