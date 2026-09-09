import crypto from 'node:crypto';
import {
  PaymentChallenge,
  PaymentProof,
  QueryCostBreakdown,
  HederaNetwork,
  HCSReceiptMessage
} from '@conduitx/types';
import { HCSReceiptService, globalHCS } from '@conduitx/receipts';

export interface MeterOptions {
  serviceId: string;
  providerName: string;
  sellerAccountId: string;
  network?: HederaNetwork;
  baseFeeHbar?: number;
  perRowFeeHbar?: number;
  hcsService?: HCSReceiptService;
  costCalculator?: (reqBody: any, queryParams: any) => QueryCostBreakdown;
}

export class X402MeterServer {
  public options: Required<MeterOptions>;
  private activeChallenges = new Map<string, PaymentChallenge>();
  private settledNonces = new Set<string>();

  constructor(options: MeterOptions) {
    this.options = {
      serviceId: options.serviceId,
      providerName: options.providerName,
      sellerAccountId: options.sellerAccountId || process.env.SELLER_HEDERA_ACCOUNT_ID || '0.0.5694201',
      network: options.network || (process.env.HEDERA_NETWORK as any) || 'testnet',
      baseFeeHbar: options.baseFeeHbar ?? 0.02,
      perRowFeeHbar: options.perRowFeeHbar ?? 0.001,
      hcsService: options.hcsService || globalHCS,
      costCalculator:
        options.costCalculator ||
        ((body, params) => {
          const limit = Number(body?.limit || params?.limit || 10);
          const base = options.baseFeeHbar ?? 0.02;
          const perRow = options.perRowFeeHbar ?? 0.001;
          const rows = Math.min(limit, 100);
          const total = Number((base + rows * perRow).toFixed(4));
          return {
            baseFeeHbar: base,
            dataRowsEstimated: rows,
            perRowFeeHbar: perRow,
            totalCostHbar: total,
            calculationMethod: `base(${base} HBAR) + ${rows} rows * ${perRow} HBAR`
          };
        })
    };
  }

  /**
   * Generates a 402 Payment Challenge for an incoming request
   */
  createChallenge(reqBody: any, queryParams: any): PaymentChallenge {
    const cost = this.options.costCalculator(reqBody, queryParams);
    const nonce = crypto.randomBytes(16).toString('hex');
    const amountTinybars = Math.round(cost.totalCostHbar * 100_000_000).toString();

    const challenge: PaymentChallenge = {
      status: 402,
      scheme: 'x402-hedera',
      network: this.options.network,
      sellerAccountId: this.options.sellerAccountId,
      amountHbar: cost.totalCostHbar,
      amountTinybars,
      currency: 'HBAR',
      serviceId: this.options.serviceId,
      facilitatorUrl: process.env.BLOCKY402_FACILITATOR_URL || 'https://blocky402.testnet.hedera.market/settle',
      challengeNonce: nonce,
      expiresAt: Date.now() + 5 * 60 * 1000,
      memo: `x402:${this.options.serviceId}:${nonce}`,
      costBreakdown: cost
    };

    this.activeChallenges.set(nonce, challenge);
    return challenge;
  }

  /**
   * Verifies an incoming X-PAYMENT header
   */
  async verifyPayment(
    paymentHeader: string,
    reqBody: any,
    queryParams: any
  ): Promise<{ valid: boolean; proof?: PaymentProof; error?: string }> {
    try {
      let proof: PaymentProof;
      if (paymentHeader.startsWith('{')) {
        proof = JSON.parse(paymentHeader);
      } else {
        const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
        proof = JSON.parse(decoded);
      }

      if (proof.scheme !== 'x402-hedera') {
        return { valid: false, error: 'Unsupported payment scheme' };
      }

      const challenge = this.activeChallenges.get(proof.challengeNonce);
      if (!challenge && !process.env.TEST_MODE) {
        return { valid: false, error: 'Challenge expired or unknown nonce' };
      }

      if (this.settledNonces.has(proof.challengeNonce)) {
        return { valid: false, error: 'Challenge nonce already spent (replay prevention)' };
      }

      const expectedTinybars = challenge
        ? BigInt(challenge.amountTinybars)
        : BigInt(Math.round(this.options.baseFeeHbar * 100_000_000));

      if (BigInt(proof.amountTinybars) < expectedTinybars) {
        return { valid: false, error: `Insufficient payment: provided ${proof.amountTinybars} < expected ${expectedTinybars}` };
      }

      this.settledNonces.add(proof.challengeNonce);
      return { valid: true, proof };
    } catch (err: any) {
      return { valid: false, error: `Invalid payment header format: ${err.message}` };
    }
  }

  /**
   * Finalizes delivery and writes receipt to HCS
   */
  async recordSettlementAndReceipt(
    proof: PaymentProof,
    queryType: string,
    queryPayload: any,
    rowsCount: number,
    latencyMs: number
  ): Promise<HCSReceiptMessage> {
    const queryHash = crypto
      .createHash('sha256')
      .update(typeof queryPayload === 'string' ? queryPayload : JSON.stringify(queryPayload))
      .digest('hex');

    const receipt = await this.options.hcsService.publishReceipt({
      receiptId: `rcpt_${crypto.randomBytes(8).toString('hex')}`,
      serviceId: this.options.serviceId,
      providerName: this.options.providerName,
      buyerAccountId: proof.payerAccountId,
      sellerAccountId: this.options.sellerAccountId,
      amountHbar: Number((Number(proof.amountTinybars) / 100_000_000).toFixed(4)),
      amountTinybars: proof.amountTinybars,
      queryType,
      queryHash,
      txId: proof.txId,
      timestamp: Date.now(),
      status: 'SETTLED',
      deliveryLatencyMs: latencyMs,
      rowsReturned: rowsCount
    });

    return receipt;
  }
}
