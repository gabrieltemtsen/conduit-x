/**
 * ConduitX Protocol Types
 */

export type HederaNetwork = 'testnet' | 'mainnet' | 'previewnet' | 'localnet';

export interface QueryCostBreakdown {
  baseFeeHbar: number;
  dataRowsEstimated: number;
  perRowFeeHbar: number;
  totalCostHbar: number;
  calculationMethod: string;
}

export interface PaymentChallenge {
  status: 402;
  scheme: 'x402-hedera';
  network: HederaNetwork;
  sellerAccountId: string;
  amountHbar: number;
  amountTinybars: string;
  currency: 'HBAR' | 'USDC';
  serviceId: string;
  facilitatorUrl?: string;
  challengeNonce: string;
  expiresAt: number;
  memo: string;
  costBreakdown: QueryCostBreakdown;
}

export interface PaymentProof {
  scheme: 'x402-hedera';
  network: HederaNetwork;
  txId: string;
  payerAccountId: string;
  sellerAccountId: string;
  amountTinybars: string;
  challengeNonce: string;
  signature?: string;
  timestamp: number;
}

export interface HCSReceiptMessage {
  protocol: 'conduitx/v1';
  receiptId: string;
  serviceId: string;
  providerName: string;
  buyerAccountId: string;
  sellerAccountId: string;
  amountHbar: number;
  amountTinybars: string;
  queryType: string;
  queryHash: string;
  txId: string;
  hashScanUrl: string;
  timestamp: number;
  consensusTimestamp?: string;
  sequenceNumber?: number;
  status: 'SETTLED' | 'VERIFIED' | 'FAILED' | 'DISPUTED';
  deliveryLatencyMs: number;
  rowsReturned?: number;
}

export type ServiceCategory = 'defi-pools' | 'token-risk' | 'wallet-portfolio' | 'reputation';

export interface SellerService {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  endpointUrl: string;
  queryType: string;
  basePriceHbar: number;
  perRowPriceHbar: number;
  pricingModel: 'cost-based' | 'flat';
  graphEndpoint: string;
  subgraphName: string;
  sellerAccountId: string;
  status: 'ACTIVE' | 'DEGRADED' | 'OFFLINE';
  lastHealthCheck?: number;
}

export interface ProviderReputation {
  serviceId: string;
  providerName: string;
  category: ServiceCategory;
  totalQueries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  averageLatencyMs: number;
  totalEarnedHbar: number;
  compositeScore: number;
  recentReceipts: HCSReceiptMessage[];
  lastActive: number;
}

export interface BrokerTask {
  taskId: string;
  category: ServiceCategory;
  query: string;
  params?: Record<string, any>;
  maxBudgetHbar: number;
  requiredMinReputation?: number;
  allowFailover?: boolean;
}

export type BrokerStepPhase =
  | 'DISCOVER'
  | 'SCORE'
  | 'CHALLENGE_402'
  | 'PAY_HEDERA'
  | 'SETTLE_BLOCKY402'
  | 'RECORD_HCS'
  | 'DELIVER_DATA'
  | 'FAILOVER';

export interface BrokerStep {
  stepIndex: number;
  timestamp: number;
  phase: BrokerStepPhase;
  title: string;
  detail: string;
  metadata?: Record<string, any>;
}

export interface BrokerExecutionResult {
  taskId: string;
  success: boolean;
  serviceId: string;
  providerName: string;
  data: any;
  paidHbar: number;
  txId?: string;
  hashScanUrl?: string;
  receiptId?: string;
  hcsSequenceNumber?: number;
  latencyMs: number;
  steps: BrokerStep[];
  budgetRemainingHbar: number;
  error?: string;
}

export interface SSEBrokerEvent {
  type: 'TASK_STARTED' | 'STEP_UPDATE' | 'RECEIPT_MINTED' | 'TASK_COMPLETED' | 'TASK_FAILED';
  taskId: string;
  data: any;
  timestamp: number;
}
