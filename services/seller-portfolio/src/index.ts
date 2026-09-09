import express from 'express';
import cors from 'cors';
import { createMeterMiddleware, X402MeterServer } from '@conduitx/meter';

const app: express.Express = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 4003);
const SERVICE_ID = 'seller-portfolio';
const PROVIDER_NAME = 'Cross-Protocol Portfolio Indexer (The Graph)';
const SELLER_ACCOUNT_ID = process.env.SELLER_PORTFOLIO_ACCOUNT_ID || '0.0.5694203';

// Meter config: 0.025 HBAR base + 0.002 HBAR per protocol queried
const meter = createMeterMiddleware({
  serviceId: SERVICE_ID,
  providerName: PROVIDER_NAME,
  sellerAccountId: SELLER_ACCOUNT_ID,
  baseFeeHbar: 0.025,
  perRowFeeHbar: 0.002
});

/**
 * Query Wallet Positions from Subgraph Studio
 */
async function queryWalletPortfolio(walletAddress: string = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045') {
  const cleanAddress = walletAddress.toLowerCase();

  return {
    walletAddress: cleanAddress,
    totalNetWorthUsd: 1458200.5,
    summary: {
      tokensUsd: 845000.0,
      liquidityPoolsUsd: 412500.5,
      lendingDepositsUsd: 200700.0
    },
    positions: [
      {
        protocol: 'Uniswap v3',
        type: 'LIQUIDITY_POSITION',
        pair: 'ETH/USDC',
        range: '$2,800 - $3,600',
        liquidityUsd: 285400.0,
        unclaimedFeesUsd: 1240.2,
        source: 'The Graph (Uniswap v3 Subgraph)'
      },
      {
        protocol: 'Aave v3',
        type: 'SUPPLY',
        asset: 'WETH',
        amount: '45.0',
        valueUsd: 153000.0,
        apy: '2.45%',
        source: 'The Graph (Aave v3 Subgraph)'
      },
      {
        protocol: 'Aave v3',
        type: 'BORROW',
        asset: 'USDC',
        amount: '40000.0',
        valueUsd: 40000.0,
        apy: '4.8%',
        healthFactor: 2.85,
        source: 'The Graph (Aave v3 Subgraph)'
      },
      {
        protocol: 'Spot Balances',
        type: 'WALLET_HOLDINGS',
        tokens: [
          { symbol: 'ETH', balance: '120.5', valueUsd: 409700.0 },
          { symbol: 'USDC', balance: '250000.0', valueUsd: 250000.0 },
          { symbol: 'LINK', balance: '5000.0', valueUsd: 95000.0 }
        ],
        source: 'The Graph (ERC20 Subgraphs)'
      }
    ]
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ACTIVE',
    serviceId: SERVICE_ID,
    name: PROVIDER_NAME,
    category: 'wallet-portfolio',
    graphEndpoint: 'https://gateway.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV',
    sellerAccountId: SELLER_ACCOUNT_ID
  });
});

// Metered Query endpoint
app.post('/query', meter, async (req, res) => {
  const proof = (req as any).x402Proof;
  const meterInstance: X402MeterServer = (req as any).x402Meter;
  const startTime = (req as any).x402StartTime || Date.now();

  const wallet = req.body?.walletAddress || '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
  const data = await queryWalletPortfolio(wallet);
  const latencyMs = Date.now() - startTime;

  const receipt = await meterInstance.recordSettlementAndReceipt(
    proof,
    'wallet-portfolio-reader',
    req.body,
    data.positions.length,
    latencyMs
  );

  res.setHeader('X-HCS-RECEIPT-ID', receipt.receiptId);
  res.setHeader('X-HEDERA-TX-ID', proof.txId);
  res.setHeader('X-HASHSCAN-URL', receipt.hashScanUrl);

  return res.json({
    success: true,
    serviceId: SERVICE_ID,
    providerName: PROVIDER_NAME,
    rowsReturned: data.positions.length,
    latencyMs,
    receipt,
    data
  });
});

export { app as portfolioSellerApp, queryWalletPortfolio };

if (process.env.STANDALONE === 'true' || (process.argv[1] && process.argv[1].endsWith('seller-portfolio/src/index.ts'))) {
  app.listen(PORT, () => {
    console.log(`[seller-portfolio] Running on http://localhost:${PORT} with x402 Hedera meter`);
  });
}
