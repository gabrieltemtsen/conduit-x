# ConduitX — The Decentralized Agent Data Vending Machine

[![ETHOnline 2026](https://img.shields.io/badge/ETHOnline-2026-blueviolet.svg)](https://ethglobal.com/events/ethonline2026)
[![Hedera Testnet](https://img.shields.io/badge/Hedera-Testnet-emerald.svg)](https://hashscan.io/testnet)
[![The Graph](https://img.shields.io/badge/The%20Graph-Subgraph%20Studio-6366f1.svg)](https://thegraph.com/)
[![x402 Protocol](https://img.shields.io/badge/x402-Payment%20Required-f59e0b.svg)](https://x402.org)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Compatible-cyan.svg)](https://modelcontextprotocol.io/)

> **"Agent payments have a rail. They don't have a market."**

ConduitX is the missing market layer for AI agents to discover, procure, and audit blockchain data. Agents buy on-chain data one query at a time, pay micro-cents over **x402 on Hedera**, and every settled payment writes an immutable cryptographic receipt to **Hedera Consensus Service (HCS)**. Those receipts become the objective reputation signal the next agent reads before it buys.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Buyer ["AI Buyer Agent (Claude / Cursor / Script)"]
        Agent["Autonomous Agent"] --> Broker["ConduitX Broker Engine"]
        MCP["ConduitX MCP Server"] --> Broker
    end

    subgraph RegistryLayer ["Marketplace & Reputation"]
        Registry["Service Registry"]
        Reputation["Reputation Aggregator\n(Score = w₁·1/P + w₂·S + w₃·R)"]
    end

    subgraph HederaRail ["Hedera Settlement & Audit Trail"]
        Facilitator["x402 Facilitator / Transfer"]
        HCSTopic["HCS Topic: 0.0.5694210\n(Cryptographic Receipts)"]
        MirrorNode["Hedera Mirror Node REST"]
    end

    subgraph DataSellers ["The Graph Live Data Sellers"]
        S1["DEX Pool Analytics\n(Uniswap v3 Subgraph)"]
        S2["Token Risk Radar\n(ERC20 & Security Subgraph)"]
        S3["Wallet Portfolio Reader\n(Aave & Protocol Subgraphs)"]
    end

    Broker -->|1. Discover & Fetch Scores| Registry
    Registry <-->|Read Past Receipts| MirrorNode
    Broker -->|2. Send Query (No Auth)| S1
    S1 -->|3. HTTP 402 Challenge (Cost Metered)| Broker
    Broker -->|4. Settle Micro-Payment| Facilitator
    Broker -->|5. Retry with X-PAYMENT Proof| S1
    S1 -->|6. Query Subgraph Studio| TheGraph["The Graph Subgraph Studio"]
    S1 -->|7. Publish Cryptographic Receipt| HCSTopic
    S1 -->|8. Deliver Data + Receipt Link| Broker
    Broker -->|9. Update Live Feed| Console["Live Next.js Console Dashboard"]
```

---

## 🏆 Hackathon Partner Alignment & Judge Quick-Links

### 1. 🟢 Hedera — AI & Agentic Payments ($6,000 Pool)
- **Live x402-Gated Metering**: Implemented in [`packages/x402-hedera`](file:///packages/x402-hedera) and [`services/meter`](file:///services/meter). Cost scales dynamically with query complexity (base fee + per-row returned) rather than a flat fee.
- **Hedera Settlement**: Micro-payments settle on Hedera Testnet via Transfer transactions and Blocky402 facilitator.
- **Immutable HCS Audit Trail**: Every completed query publishes a cryptographic receipt message to HCS Topic [`0.0.5694210`](https://hashscan.io/testnet/topic/0.0.5694210) via [`packages/receipts`](file:///packages/receipts).
- **HCS Mirror Node Indexing**: Mirror Node REST queries read consensus receipts to compute live provider metrics.

### 2. 🟣 The Graph — Best AI Tooling / AI Use Case ($5,000 Pool · From Scratch)
- **3 Real Subgraph Studio Data Sellers**:
  - [`services/seller-pools`](file:///services/seller-pools): Live Uniswap v3 pool liquidity, 24h volume, fee tiers.
  - [`services/seller-risk`](file:///services/seller-risk): Token security, holder concentration %, liquidity depth.
  - [`services/seller-portfolio`](file:///services/seller-portfolio): Cross-protocol wallet balances, Aave debt, LP positions.
- **Autonomous Reasoning & Failover**: The Broker agent (`services/broker`) uses on-chain receipt history to rank providers and executes automatic failover if a provider degrades or fails.
- **Model Context Protocol (MCP) Server**: [`services/mcp`](file:///services/mcp) exposes reusable data procurement tools for Claude Desktop and Cursor.

### 3. 🟡 Bazantic ($2,000 Pool)
- **Bazantic Recipe**: [`spec/bazantic-recipe.json`](file:///spec/bazantic-recipe.json) chains the ConduitX broker, The Graph Subgraphs, and Token Risk Radar into a unified autonomous research workflow.
- **Agentified API**: Micro-metered HTTP gateway supporting x402 payment challenges.

---

## 📁 Repository Monorepo Layout

```text
conduit-x/
├── apps/
│   └── console/               # Next.js 16 (Turbopack) dashboard with real-time SSE execution stream
├── packages/
│   ├── types/                 # Shared protocol schemas (PaymentChallenge, HCSReceiptMessage, SellerService)
│   ├── receipts/              # Hedera SDK HCS topic publisher & Mirror Node REST reader
│   └── x402-hedera/           # x402 challenge middleware, payment verification & client
├── services/
│   ├── meter/                 # Reusable Express middleware for x402-gating any API
│   ├── seller-pools/          # The Graph data seller: DEX Pool Analytics
│   ├── seller-risk/           # The Graph data seller: Token Risk & Concentration Radar
│   ├── seller-portfolio/      # The Graph data seller: Cross-protocol Portfolio Indexer
│   ├── registry/              # Service discovery catalog & HCS reputation score indexer
│   ├── broker/                # Autonomous buying agent (discover -> score -> pay -> failover)
│   └── mcp/                   # Model Context Protocol server for Claude & Cursor
├── spec/
│   ├── conduitx-spec.md       # Full architecture & protocol specification
│   └── bazantic-recipe.json   # Multi-provider DeFi risk research recipe
└── pnpm-workspace.yaml        # Workspace configuration
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v20+ or v22+
- `pnpm` (v9+)

### Installation
```bash
# Clone the repository
git clone https://github.com/gabrieltemtsen/conduit-x.git
cd conduit-x

# Install dependencies across all workspace packages
pnpm install

# Build all packages and services
pnpm build
```

### Environment Configuration
Each package/service that talks to Hedera or The Graph ships a `.env.example` documenting the variables it reads — copy it to `.env` (or `.env.local` for the console app) and fill in real values:

| Path | Needed for |
|---|---|
| `packages/receipts/.env.example` | HCS operator credentials + topic ID for publishing receipts |
| `packages/x402-hedera/.env.example` | Buyer/seller Hedera accounts + facilitator URL for x402 settlement |
| `services/seller-*/.env.example` | The Graph API key + seller Hedera account per data seller |
| `services/registry/.env.example` | Seller endpoint URLs/accounts (defaults assume localhost) |
| `services/broker/.env.example` | Port + standalone flag for the buyer agent |
| `apps/console/.env.example` | Buyer account + HCS topic ID surfaced in the dashboard |

Without live Hedera credentials, receipt publishing and payment settlement fall back to in-memory simulation so the stack still runs end-to-end locally — but the HashScan links won't resolve to real consensus messages until real testnet credentials are set.

### Running Tests
```bash
# Run x402 + Hedera + HCS integration test suite
pnpm --filter @conduitx/x402-hedera test
```

### Starting the Live Console
```bash
# Launch the Next.js Live Console Dashboard (port 3000)
pnpm dev:console
```
Open [http://localhost:3000](http://localhost:3000) in your browser to interact with the Autonomous Agent Workbench, view live SSE settlement traces, and audit HCS consensus receipts.

---

## 🤖 Connecting to Claude Desktop or Cursor (MCP)

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "conduitx": {
      "command": "node",
      "args": ["<PATH_TO_CONDUITX>/services/mcp/dist/index.js"],
      "env": {
        "HEDERA_NETWORK": "testnet"
      }
    }
  }
}
```

### Available MCP Tools
1. `discover_data_services`: Query active Graph-backed data sellers and price tiers.
2. `get_provider_reputation`: Audit past HCS receipts and composite reliability scores before buying.
3. `execute_metered_query`: Buy live blockchain data with automatic x402 Hedera settlement and budget capping.
4. `get_budget_ledger`: Check the agent's remaining budget and micro-payment ledger.

---

## 📐 Deterministic Reputation Formula

Provider composite reputation is calculated deterministically from the public HCS receipt trail:

$$\text{Score} = 0.35 \cdot \left(\frac{1}{\text{Price}}\right) + 0.45 \cdot \text{SuccessRate} + 0.20 \cdot \text{Recency} - \text{Penalty}(\text{Failed})$$

- **Price Competitiveness ($w_1 = 0.35$)**: Incentivizes competitive, cost-based data pricing.
- **Reliability ($w_2 = 0.45$)**: Proportion of successfully delivered and verified queries.
- **Volume & Recency ($w_3 = 0.20$)**: Activity bonus based on recent verified transactions.
- **Penalty**: 15-point penalty deducted for every failed or disputed query delivery.

---

## 🛡️ Spec-Driven & AI Transparency Disclosure

In accordance with hackathon guidelines:
- **Spec-Driven Development**: All protocol designs, data schemas, and recipe workflows are documented in [`spec/conduitx-spec.md`](file:///spec/conduitx-spec.md) and [`spec/bazantic-recipe.json`](file:///spec/bazantic-recipe.json).
- **AI Assisted**: AI pair-programming tools were utilized to assist in accelerating TypeScript scaffolding, UI design system styling, and GraphQL schema compilation. All architecture decisions, Hedera HCS integration, x402 metering logic, and broker failover algorithms were authored and validated specifically for ETHOnline 2026.

---

## 📄 License
MIT License.
