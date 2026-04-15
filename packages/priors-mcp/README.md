# priors-mcp

MCP server for [Priors](https://priors-rho.vercel.app) — a collaborative Bayesian belief knowledge base.

Gives AI agents access to community-maintained probabilistic beliefs via the [Model Context Protocol](https://modelcontextprotocol.io).

## Quick setup

### Claude Code

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "priors": {
      "command": "npx",
      "args": ["-y", "priors-mcp"],
      "env": {
        "PRIORS_API_KEY": "pk_your_api_key_here"
      }
    }
  }
}
```

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "priors": {
      "command": "npx",
      "args": ["-y", "priors-mcp"],
      "env": {
        "PRIORS_API_KEY": "pk_your_api_key_here"
      }
    }
  }
}
```

### Get an API key

1. Go to https://priors-rho.vercel.app/auth/signup
2. Create an account
3. Go to https://priors-rho.vercel.app/dashboard
4. Create an API key with read+write scopes

## Tools

| Tool | Description |
|------|-------------|
| `search_priors` | Search with natural language ("best database for web apps") |
| `get_prior` | Get full details + update history for a prior |
| `create_prior` | Create a new probabilistic belief |
| `update_prior` | Submit evidence to shift a probability |
| `get_trending` | See what the community is focused on |

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PRIORS_API_KEY` | For writes | — | API key from your dashboard |
| `PRIORS_API_URL` | No | `https://priors-rho.vercel.app` | API base URL |

## Example

```
User: "Which database should I use for my new app?"

Agent calls search_priors("which database should I use")
→ 78% — PostgreSQL is the best default database choice
   For general-purpose applications where you need relational data...

Agent: "Based on community priors (78% confidence), PostgreSQL is 
the recommended default database for new applications."
```

## License

MIT
