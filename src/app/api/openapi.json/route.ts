import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Priors API",
    version: "1.0.0",
    description:
      "A collaborative knowledge base of probabilistic beliefs. Query community-maintained priors, submit evidence, and integrate calibrated beliefs into your agents.",
  },
  servers: [{ url: "https://priors-rho.vercel.app" }],
  paths: {
    "/api/priors": {
      get: {
        operationId: "searchPriors",
        summary: "Search for priors using natural language",
        description:
          "Fuzzy search across all priors. Returns ranked results with probabilities. Use this to check community beliefs before making recommendations.",
        parameters: [
          {
            name: "q",
            in: "query",
            description:
              "Natural language query (e.g. 'which database should I use')",
            schema: { type: "string" },
          },
          {
            name: "category",
            in: "query",
            description: "Filter by category",
            schema: {
              type: "string",
              enum: [
                "TECHNOLOGY",
                "ECONOMICS",
                "POLITICS",
                "SCIENCE",
                "CULTURE",
                "HEALTH",
                "SPORTS",
                "OTHER",
              ],
            },
          },
          {
            name: "limit",
            in: "query",
            description: "Max results (default 20, max 50)",
            schema: { type: "integer", default: 20 },
          },
        ],
        responses: {
          "200": {
            description: "List of matching priors",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    priors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          slug: { type: "string" },
                          claim: { type: "string" },
                          description: { type: "string" },
                          category: { type: "string" },
                          currentProbability: {
                            type: "number",
                            description: "0-1 probability",
                          },
                          updateCount: { type: "integer" },
                        },
                      },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: "createPrior",
        summary: "Create a new prior",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["claim", "initialProbability"],
                properties: {
                  claim: { type: "string", minLength: 10, maxLength: 500 },
                  description: { type: "string" },
                  category: { type: "string", default: "OTHER" },
                  initialProbability: {
                    type: "number",
                    minimum: 0.001,
                    maximum: 0.999,
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Prior created" },
          "409": { description: "Similar prior already exists" },
        },
      },
    },
    "/api/priors/{slug}": {
      get: {
        operationId: "getPrior",
        summary: "Get a specific prior",
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Prior details with current probability" },
          "404": { description: "Prior not found" },
        },
      },
    },
    "/api/priors/{slug}/updates": {
      post: {
        operationId: "updatePrior",
        summary: "Submit evidence to update a prior",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["evidenceDescription"],
                properties: {
                  evidenceDescription: { type: "string" },
                  strength: {
                    type: "number",
                    minimum: -1,
                    maximum: 1,
                    description:
                      "-1 = strong against, 0 = neutral, 1 = strong for",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Update applied",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    probabilityBefore: { type: "number" },
                    probabilityAfter: { type: "number" },
                    likelihoodRatio: { type: "number" },
                  },
                },
              },
            },
          },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/api/trending": {
      get: {
        operationId: "getTrending",
        summary: "Get trending priors",
        responses: {
          "200": { description: "List of most active priors" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "API key (pk_...)",
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
