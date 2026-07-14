# cabal-hunter-mcp

**On-chain Solana cabal & rug detection as an MCP server.** Two tools, called *before your agent buys*:

- **`check_cabal_risk`** — scans any Solana token mint and returns an **Exit-Liquidity Risk** verdict (`SAFE | REVIEW | AVOID`), a 0–100 cabal score, funding-cluster detection, same-block Jito-bundle detection, coordinated-dump detection, serial-rug **deployer history** ("launched 14, 13 dead"), and a Solana-native **honeypot** check (freeze authority + Token-2022 traps).
- **`trace_funding`** — the **pre-launch funding trace**: walks the token's **first** buyers back to the wallet that funded them, and flags when the **deployer funded the wallets that sniped their own launch**.

Every flag links to its on-chain evidence transaction.

[![npm](https://img.shields.io/npm/v/cabal-hunter-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/cabal-hunter-mcp)
[![MCP server](https://img.shields.io/badge/MCP-server-7c3aed)](https://api.cabal-hunter.com/mcp)
[![Solana](https://img.shields.io/badge/Solana-on--chain-14F195)](https://api.cabal-hunter.com)
[![Free tier](https://img.shields.io/badge/250%2Fmo%20free-no%20API%20key-10b981)](https://api.cabal-hunter.com/api/info)
[![License: MIT](https://img.shields.io/badge/license-MIT-94a3b8)](LICENSE)

> 🌐 **Available in 9 languages:** [English](https://api.cabal-hunter.com/) · [Español](https://api.cabal-hunter.com/es) · [Português](https://api.cabal-hunter.com/pt) · [Français](https://api.cabal-hunter.com/fr) · [Deutsch](https://api.cabal-hunter.com/de) · [Nederlands](https://api.cabal-hunter.com/nl) · [中文](https://api.cabal-hunter.com/zh) · [日本語](https://api.cabal-hunter.com/ja) · [한국어](https://api.cabal-hunter.com/ko)

Contract-clean is **not** cabal-clean. A basic scanner tells you the mint/freeze/LP are fine — it doesn't tell you that 15 wallets funded from one source are holding 30% of supply, waiting to dump on you.

**Credit where it's due:** [RugCheck](https://rugcheck.xyz) also does same-source wallet clustering (their "Insider Networks"), and it's a good tool — if it does what you need, use it. What `trace_funding` adds is the **pre-launch** angle: it walks back to the token's **first** buyers, so it still catches a coordinated group **even after they've sold and left a clean-looking holder list**. A current-holder view can't show you people who already left.

## Quick start

```bash
npx cabal-hunter-mcp
```

No install, no signup, no API key — **250 free scans/month per IP**. That's the whole setup; the command below is what you drop into any MCP client.

### Claude Desktop / Claude Code / Cursor / VS Code / ElizaOS

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

Prefer a remote HTTP server (no local process)? Point straight at the hosted endpoint instead:

```json
{ "mcpServers": { "cabal-hunter": { "url": "https://api.cabal-hunter.com/mcp" } } }
```

## The tool

**`check_cabal_risk({ mint })`** — pass a Solana token mint (contract) address. Returns the full forensic JSON:

```jsonc
{
  "recommendation": "AVOID",        // SAFE | REVIEW | AVOID  ← the headline
  "risk": "HIGH",                   // exit-liquidity risk
  "cabal_score": 100,               // 0-100
  "honeypot_risk": "LOW",           // freeze authority + Token-2022 traps
  "mint_authority_revoked": true,
  "freeze_authority_revoked": true,
  "deployer": { "verdict": "SERIAL_RUGGER", "tokens_launched": 14, "dead": 13 },
  "coordinated_clusters": [
    { "wallets": 5, "combined_pct": 23.1, "evidence_tx": "https://solscan.io/tx/…" }
  ],
  "time_sync": true,                // same-block (Jito-bundled) buys
  "coordinated_exit": false,        // ≥2 holders dumped together
  "top_reasons": ["..."],
  "wallets_checked": 15,
  "scan_complete": true
}
```

`scan_complete` / `wallets_checked` are included on purpose so your agent can apply **its own** risk tolerance instead of inheriting ours — the score is a starting point you can verify (every cluster carries an `evidence_tx`), not a verdict you take on faith.

### Gate a buy in your agent

> "Before buying any token, call `check_cabal_risk` with the mint. If `recommendation` is `AVOID` or `cabal_score >= 65` or `honeypot_risk` is `HIGH`, skip the trade and say why."

## `trace_funding({ mint })` — the pre-launch funding trace

Walks the token's **first** buyers back to the wallet that funded them. Flags two patterns:

| Cluster type | What it means |
|---|---|
| `deployer_funded_sniper` | The **deployer** funded the wallets that sniped their own launch — the strongest pre-arranged-launch signal there is. |
| `early_sniper` | 2+ of the first buyers were funded by the same **non-CEX** source. |

Each cluster returns `wallet_count`, `bought_pct` (% of supply taken **at launch**), `combined_pct` (what they **still** hold), `exited_count` (how many already sold out), and `evidence_txs` (Solscan-verifiable).

```
"clusters": [{
  "type": "early_sniper",
  "wallet_count": 4,
  "bought_pct": 49.4,     // took half the launch
  "combined_pct": 0.0,    // and hold none of it now
  "exited_count": 4,      // all four already sold
  "risk": "HIGH"
}]
```

**Read it like this:** if `bought_pct` is large and `exited_count == wallet_count`, a coordinated group took a big slice of the launch and has **already dumped it** — and a current-holder view would show you nothing, because they're gone.

**Honest limitation:** this works best on **fresh launches**. On older or very heavily traded tokens the walk back may not resolve, and `status` returns `skipped_active_token` — that is *not* a clean verdict, it means we couldn't tell. Don't read it as safe.

## Pricing

- **250 scans/month per IP — free, no key.**
- After that: **$9/month for Unlimited** (fair use), or pay-as-you-go at **$0.001 USDC per scan** (priced at cost). No signup, no card.
- Prepaid key: send USDC, `POST /api/buy-key`, then set `CABAL_HUNTER_API_KEY` (sent as the `X-API-Key` header). Full details: [api.cabal-hunter.com/pricing](https://api.cabal-hunter.com/pricing).

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `CABAL_HUNTER_API_KEY` | *(none)* | Prepaid key for unlimited / metered use (`X-API-Key`). |
| `CABAL_HUNTER_API` | `https://api.cabal-hunter.com` | Override the API base URL. |

## Other ways to use Cabal-Hunter

- **REST:** `curl "https://api.cabal-hunter.com/api/scan-cabal?mintAddress=<MINT>"` — [OpenAPI spec](https://api.cabal-hunter.com/openapi.json)
- **ElizaOS plugin:** [`elizaos-plugin-cabal-hunter`](https://github.com/paulf280-ui/plugin-cabal-hunter) (`npm install elizaos-plugin-cabal-hunter`)
- **MCP template / starter:** [solana-safe-sniper-mcp-template](https://github.com/paulf280-ui/solana-safe-sniper-mcp-template)
- **Human?** Free interactive bubble map — wallets, Solscan receipts, live chart + trade links on one screen: [api.cabal-hunter.com/map](https://api.cabal-hunter.com/map)

## What it detects (why "contract-clean" misses it)

A cabal is 15 fresh wallets — all funded from the same master wallet, all buying in the first seconds of launch — quietly accumulating 25–40% of supply before your bot sees the first candle. Contract clean. LP burned. Everything green. Then they dump, simultaneously, into your liquidity. Cabal-Hunter traces the funding graph on-chain and answers the only question that matters before you sign a swap: **are you the exit liquidity?**

---

MIT licensed. Powered by [Cabal-Hunter](https://api.cabal-hunter.com). This package is a thin MCP wrapper over the hosted API — the detection runs server-side against live Solana on-chain data (Helius RPC).
