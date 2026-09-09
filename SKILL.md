---
name: conduitx-data-procurement
description: Autonomous data procurement skill for AI agents. Discovers decentralized Subgraph Studio providers, verifies HCS on-chain reputation, and buys live blockchain data via x402 Hedera micro-payments.
---

# ConduitX Data Procurement Skill

This skill enables AI agents (Claude, Cursor, OpenAI Agents, AGY) to procure live blockchain data on-demand without managing API keys or SaaS subscriptions.

## Capabilities

1. **Market Discovery**: Find available The Graph data sellers across categories (`defi-pools`, `token-risk`, `wallet-portfolio`).
2. **Reputation Verification**: Query on-chain Hedera Consensus Service (HCS) receipts to score candidate providers before buying.
3. **Micro-Payment Execution**: Execute autonomous x402 payment over Hedera with strict per-task budget caps.
4. **Audit Trail**: Receive cryptographic receipts with clickable HashScan transaction explorer links.

## Quickstart

### 1. Discover Services
```typescript
import { DEFAULT_SERVICES, computeProviderReputations } from '@conduitx/registry';

// List active data sellers
console.log(DEFAULT_SERVICES);

// Evaluate on-chain reputation scores
const reputations = await computeProviderReputations();
console.log(reputations);
```

### 2. Procure Data via Autonomous Broker
```typescript
import { globalBroker } from '@conduitx/broker';

const result = await globalBroker.executeTask({
  taskId: 'task_demo_01',
  category: 'defi-pools',
  query: 'Top 5 DEX pools by total value locked',
  params: { limit: 5 },
  maxBudgetHbar: 0.1,
  allowFailover: true
});

console.log('Delivered Data:', result.data);
console.log('HCS Receipt Link:', result.hashScanUrl);
console.log('Paid (HBAR):', result.paidHbar);
```

### 3. Run via MCP
Connect `services/mcp/dist/index.js` to Claude Desktop or Cursor to use `execute_metered_query` directly inside chat.
