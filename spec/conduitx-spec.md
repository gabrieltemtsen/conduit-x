# ConduitX Specification

## 1. System Overview
ConduitX is an autonomous data procurement market for AI agents. It bridges decentralized data indexing (The Graph Subgraph Studio) with agentic micro-payment settlement (x402 protocol on Hedera) and on-chain consensus receipt trails (Hedera Consensus Service - HCS).

## 2. Core Protocols

### 2.1 x402 Hedera Settlement Flow
1. **Initial Request**: Agent queries data seller endpoint without payment header.
2. **Challenge Generation**: Server computes cost based on query complexity (e.g., base fee + rows returned) and responds with `402 Payment Required` containing `PaymentChallenge` payload.
3. **Hedera Micro-Transfer**: Agent client submits transfer transaction on Hedera Testnet matching the requested Tinybars and challenge nonce.
4. **Redemption**: Agent retries the request with `X-PAYMENT` header containing base64-encoded `PaymentProof`.
5. **Verification & Delivery**: Server verifies the payment, executes the GraphQL query against Subgraph Studio, writes an HCS receipt message to topic `0.0.5694210`, and delivers the data.

### 2.2 Dynamic Provider Reputation Formula
Provider composite reputation is calculated deterministically from the public HCS receipt trail:
$$\text{Score} = w_1 \cdot \left(\frac{1}{\text{price}}\right) + w_2 \cdot \text{success\_rate} + w_3 \cdot \text{recency} - \text{penalty}(\text{failed\_deliveries})$$
- $w_1 = 0.35$ (Price competitiveness)
- $w_2 = 0.45$ (Reliability / verified deliveries)
- $w_3 = 0.20$ (Volume & recency)

### 2.3 Model Context Protocol (MCP) Interface
Exposes 4 standard tools to Claude Desktop, Cursor, and autonomous agents:
- `discover_data_services`: Query available Graph-backed providers.
- `get_provider_reputation`: Verify HCS receipt history before buying.
- `execute_metered_query`: Buy live data with budget enforcement.
- `get_budget_ledger`: Audit agent spending.
