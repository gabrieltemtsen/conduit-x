import express from 'express';
import cors from 'cors';
import { SellerService, ProviderReputation, HCSReceiptMessage } from '@conduitx/types';
import { globalHCS } from '@conduitx/receipts';

const app: express.Express = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 4000);

export const DEFAULT_SERVICES: SellerService[] = [
  {
    id: 'seller-pools',
    name: 'DEX Pool Intelligence',
    description: 'Real-time Uniswap v3 & multi-chain DEX pool liquidity, volume, APR & fee tiers via The Graph.',
    category: 'defi-pools',
    endpointUrl: process.env.SELLER_POOLS_URL || 'http://localhost:4001/query',
    queryType: 'defi-pool-analytics',
    basePriceHbar: 0.02,
    perRowPriceHbar: 0.002,
    pricingModel: 'cost-based',
    graphEndpoint: 'https://gateway.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV',
    subgraphName: 'uniswap-v3',
    sellerAccountId: process.env.SELLER_POOLS_ACCOUNT_ID || '0.0.5694201',
    status: 'ACTIVE'
  },
  {
    id: 'seller-risk',
    name: 'Token Risk & Concentration Radar',
    description: 'Deep smart contract analysis, top holder concentration, honeypot detection & liquidity locks via The Graph.',
    category: 'token-risk',
    endpointUrl: process.env.SELLER_RISK_URL || 'http://localhost:4002/query',
    queryType: 'token-risk-analysis',
    basePriceHbar: 0.03,
    perRowPriceHbar: 0.003,
    pricingModel: 'cost-based',
    graphEndpoint: 'https://gateway.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV',
    subgraphName: 'erc20-token-radar',
    sellerAccountId: process.env.SELLER_RISK_ACCOUNT_ID || '0.0.5694202',
    status: 'ACTIVE'
  },
  {
    id: 'seller-portfolio',
    name: 'Cross-Protocol Portfolio Indexer',
    description: 'Comprehensive wallet position breakdown across Uniswap LP, Aave lending/borrowing & spot balances via The Graph.',
    category: 'wallet-portfolio',
    endpointUrl: process.env.SELLER_PORTFOLIO_URL || 'http://localhost:4003/query',
    queryType: 'wallet-portfolio-reader',
    basePriceHbar: 0.025,
    perRowPriceHbar: 0.002,
    pricingModel: 'cost-based',
    graphEndpoint: 'https://gateway.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV',
    subgraphName: 'multi-protocol-positions',
    sellerAccountId: process.env.SELLER_PORTFOLIO_ACCOUNT_ID || '0.0.5694203',
    status: 'ACTIVE'
  }
];

let dynamicServices: SellerService[] = [...DEFAULT_SERVICES];

/**
 * Compute provider reputation metrics from on-chain HCS receipts
 * Formula: score = w1 * (1/price) + w2 * success_rate + w3 * recency - penalty(failed)
 */
export async function computeProviderReputations(): Promise<ProviderReputation[]> {
  const allReceipts = await globalHCS.getReceipts(undefined, 100);

  return dynamicServices.map((svc) => {
    const providerReceipts = allReceipts.filter((r) => r.serviceId === svc.id);
    const totalQueries = providerReceipts.length;
    const successfulDeliveries = providerReceipts.filter((r) => r.status === 'SETTLED' || r.status === 'VERIFIED').length;
    const failedDeliveries = totalQueries - successfulDeliveries;
    const successRate = totalQueries > 0 ? successfulDeliveries / totalQueries : 1.0;

    const totalEarnedHbar = providerReceipts.reduce((sum, r) => sum + (r.amountHbar || 0), 0);
    const avgLatency =
      providerReceipts.length > 0
        ? providerReceipts.reduce((sum, r) => sum + (r.deliveryLatencyMs || 250), 0) / providerReceipts.length
        : 220;

    // Weights: w1=0.35 (price competitiveness), w2=0.45 (reliability/success), w3=0.20 (recency/volume)
    const priceScore = Math.min(100, (1 / (svc.basePriceHbar * 10)) * 50);
    const reliabilityScore = successRate * 100;
    const penalty = failedDeliveries * 15;
    const recencyBonus = Math.min(20, totalQueries * 2);

    const compositeScore = Math.max(0, Math.min(100, Math.round(0.35 * priceScore + 0.45 * reliabilityScore + recencyBonus - penalty)));

    return {
      serviceId: svc.id,
      providerName: svc.name,
      category: svc.category,
      totalQueries,
      successfulDeliveries,
      failedDeliveries,
      successRate: Number(successRate.toFixed(3)),
      averageLatencyMs: Math.round(avgLatency),
      totalEarnedHbar: Number(totalEarnedHbar.toFixed(4)),
      compositeScore,
      recentReceipts: providerReceipts.slice(0, 5),
      lastActive: providerReceipts[0]?.timestamp || Date.now()
    };
  });
}

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ACTIVE',
    service: 'conduitx-registry',
    activeProviders: dynamicServices.length,
    hcsTopicId: process.env.HEDERA_HCS_TOPIC_ID || '0.0.5694210'
  });
});

app.get('/services', (req, res) => {
  const category = req.query.category as string | undefined;
  if (category) {
    return res.json({ services: dynamicServices.filter((s) => s.category === category) });
  }
  return res.json({ services: dynamicServices });
});

app.get('/reputation', async (req, res) => {
  const reputations = await computeProviderReputations();
  res.json({ reputations });
});

app.get('/reputation/:serviceId', async (req, res) => {
  const reputations = await computeProviderReputations();
  const found = reputations.find((r) => r.serviceId === req.params.serviceId);
  if (!found) {
    return res.status(404).json({ error: 'Service not found' });
  }
  return res.json({ reputation: found });
});

app.get('/receipts', async (req, res) => {
  const serviceId = req.query.serviceId as string | undefined;
  const limit = Math.min(Number(req.query.limit || 50), 100);
  const receipts = await globalHCS.getReceipts(serviceId, limit);
  return res.json({
    topicId: process.env.HEDERA_HCS_TOPIC_ID || '0.0.5694210',
    topicHashScanUrl: globalHCS.getTopicHashScanUrl(),
    receipts
  });
});

export { app as registryApp };

if (process.env.STANDALONE === 'true' || (process.argv[1] && process.argv[1].endsWith('registry/src/index.ts'))) {
  app.listen(PORT, () => {
    console.log(`[registry] Running on http://localhost:${PORT}`);
  });
}
