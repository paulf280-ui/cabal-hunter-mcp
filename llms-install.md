# Installing cabal-hunter-mcp (guide for AI coding agents)

This is a **zero-config** MCP server. No API key and no build step are required
for the free tier (250 scans/month per IP).

## Install

Add this block to the user's MCP settings file (for Cline:
`cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "cabal-hunter": {
      "command": "npx",
      "args": ["-y", "cabal-hunter-mcp"]
    }
  }
}
```

That is the entire setup — `npx` fetches and runs the published npm package.
There are no required environment variables.

## Optional: prepaid API key (unlimited / metered use)

Only if the user has bought a key at https://api.cabal-hunter.com/pricing, add
an `env` block:

```json
{
  "mcpServers": {
    "cabal-hunter": {
      "command": "npx",
      "args": ["-y", "cabal-hunter-mcp"],
      "env": { "CABAL_HUNTER_API_KEY": "<the user's key>" }
    }
  }
}
```

## Verify it works

The server exposes one tool: **`check_cabal_risk`**. Call it with any Solana
mint address to confirm — e.g. `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`
(BONK). A successful call returns JSON containing `recommendation`
(`SAFE | REVIEW | AVOID`) and a `cabal_score` (0-100).

## Requirements

- Node.js 18+ (needed for `npx`)
- Internet access (the tool queries the hosted Cabal-Hunter API over HTTPS)
