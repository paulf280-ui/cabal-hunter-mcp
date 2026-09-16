#!/usr/bin/env node
/**
 * cabal-hunter-mcp — local MCP server for on-chain Solana cabal/rug detection.
 *
 * Exposes one tool, `check_cabal_risk`, that scans any Solana token mint and
 * returns an exit-liquidity risk verdict (SAFE / REVIEW / AVOID), a 0-100 cabal
 * score, funding-cluster + same-block-bundle + same-block coordinated-selling
 * detection, serial-launcher deployer history, and a honeypot (freeze /
 * Token-2022) check.
 *
 * It is a thin stdio wrapper over the hosted Cabal-Hunter API
 * (https://api.cabal-hunter.com) so any MCP client — Claude Desktop, Claude
 * Code, Cursor, VS Code, ElizaOS — can run it with `npx cabal-hunter-mcp`.
 *
 * Free tier: 5 scans/month with no key at all; 250/month with a free key (one
 * email). To use a prepaid or subscription key, set CABAL_HUNTER_API_KEY.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API = (process.env.CABAL_HUNTER_API || "https://api.cabal-hunter.com").replace(/\/+$/, "");
const API_KEY = process.env.CABAL_HUNTER_API_KEY || "";

const TOOL = {
  name: "check_cabal_risk",
  description:
    "On-chain coordinated-wallet (cabal) and rug detection for any Solana token " +
    "mint. One call returns risk_level (LOW_SIGNAL | ELEVATED | HIGH), a 0-100 " +
    "cabal score, funding-cluster detection (top holders walked back to a shared " +
    "funding wallet), same-block Jito-bundle detection, same-block coordinated " +
    "selling, serial-launcher deployer history (e.g. 'launched 92, 90 dead'), and " +
    "a honeypot check (freeze authority + Token-2022 traps). Wallet clusters carry " +
    "evidence_txs[] \u2014 the signatures behind that cluster; concentration, deployer " +
    "and honeypot flags are read from chain state and carry none. risk and " +
    "cabal_score are COORDINATION ONLY: read honeypot_risk and risk_level before " +
    "calling a token clean. degraded:true means we could not verify everything and " +
    "is never an all-clear. Use it before an agent buys a pump.fun / PumpSwap / " +
    "Raydium token to answer: are you the exit liquidity? " +
    "FREE: 5 scans/month with no key; 250/month with a free key (one email). " +
    "FRESHNESS: a mint traced in the last 8h is answered from that trace in <100ms " +
    "(computed_at says when); anything else runs a live trace taking 15-20s, so " +
    "allow a 30s+ timeout.",
  inputSchema: {
    type: "object",
    properties: {
      mint: {
        type: "string",
        description:
          "The Solana token mint (contract) address to scan, e.g. " +
          "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      },
    },
    required: ["mint"],
  },
};

const server = new Server(
  { name: "cabal-hunter", version: "1.0.4" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [TOOL] }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  if (name !== TOOL.name) {
    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  }
  const mint = String(args?.mint || "").trim();
  if (!mint) {
    return {
      content: [{ type: "text", text: "Error: 'mint' (a Solana token mint address) is required." }],
      isError: true,
    };
  }
  const url = `${API}/api/scan-cabal?mintAddress=${encodeURIComponent(mint)}`;
  const headers = { Accept: "application/json" };
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    if (!res.ok) {
      return {
        content: [{ type: "text", text: `Cabal-Hunter API error ${res.status}: ${text.slice(0, 800)}` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text }] };
  } catch (e) {
    return {
      content: [{ type: "text", text: `Request to Cabal-Hunter failed: ${e?.message || String(e)}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`cabal-hunter MCP server running on stdio → ${API}`);
