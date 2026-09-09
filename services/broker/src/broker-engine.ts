import {
  BrokerTask,
  BrokerExecutionResult,
  BrokerStep,
  SellerService,
  ProviderReputation,
  SSEBrokerEvent
} from '@conduitx/types';
import { X402PaymentClient, globalPaymentClient } from '@conduitx/x402-hedera';
import { DEFAULT_SERVICES, computeProviderReputations } from '@conduitx/registry';

export class BrokerAgent {
  private paymentClient: X402PaymentClient;
  private currentBudgetHbar: number;
  private totalSpentHbar: number = 0;
  private sseListeners = new Set<(event: SSEBrokerEvent) => void>();

  constructor(initialBudgetHbar: number = 2.0, client?: X402PaymentClient) {
    this.currentBudgetHbar = initialBudgetHbar;
    this.paymentClient = client || globalPaymentClient;
  }

  public onEvent(listener: (event: SSEBrokerEvent) => void) {
    this.sseListeners.add(listener);
    return () => this.sseListeners.delete(listener);
  }

  private emit(type: SSEBrokerEvent['type'], taskId: string, data: any) {
    const event: SSEBrokerEvent = {
      type,
      taskId,
      data,
      timestamp: Date.now()
    };
    this.sseListeners.forEach((l) => l(event));
  }

  public getBudgetStatus() {
    return {
      initialBudgetHbar: this.currentBudgetHbar + this.totalSpentHbar,
      remainingBudgetHbar: Number(this.currentBudgetHbar.toFixed(4)),
      totalSpentHbar: Number(this.totalSpentHbar.toFixed(4))
    };
  }

  public resetBudget(budgetHbar: number = 2.0) {
    this.currentBudgetHbar = budgetHbar;
    this.totalSpentHbar = 0;
  }

  /**
   * Execute an end-to-end task: Discover -> Score -> Pay 402 on Hedera -> Record HCS -> Deliver
   */
  async executeTask(task: BrokerTask): Promise<BrokerExecutionResult> {
    const steps: BrokerStep[] = [];
    const startTime = Date.now();
    let stepCount = 0;

    const addStep = (phase: BrokerStep['phase'], title: string, detail: string, metadata?: any) => {
      const step: BrokerStep = {
        stepIndex: ++stepCount,
        timestamp: Date.now(),
        phase,
        title,
        detail,
        metadata
      };
      steps.push(step);
      this.emit('STEP_UPDATE', task.taskId, step);
      return step;
    };

    this.emit('TASK_STARTED', task.taskId, { task, budgetRemaining: this.currentBudgetHbar });

    // Step 1: Service Discovery
    addStep(
      'DISCOVER',
      'Discovering Service Providers',
      `Scanning decentralized registry for category '${task.category}' matching query '${task.query}'...`
    );

    const availableServices = DEFAULT_SERVICES.filter((s: SellerService) => s.category === task.category);
    if (availableServices.length === 0) {
      const errorMsg = `No active providers registered for category '${task.category}'`;
      addStep('FAILOVER', 'Discovery Failed', errorMsg);
      const res: BrokerExecutionResult = {
        taskId: task.taskId,
        success: false,
        serviceId: '',
        providerName: '',
        data: null,
        paidHbar: 0,
        latencyMs: Date.now() - startTime,
        steps,
        budgetRemainingHbar: this.currentBudgetHbar,
        error: errorMsg
      };
      this.emit('TASK_FAILED', task.taskId, res);
      return res;
    }

    // Step 2: Scoring from HCS Receipt History
    addStep(
      'SCORE',
      'Evaluating Provider Reputation',
      'Querying HCS Mirror Node receipt index to score candidate providers...'
    );

    const reputations = await computeProviderReputations();
    const rankedServices = availableServices
      .map((svc: SellerService) => {
        const rep = reputations.find((r: ProviderReputation) => r.serviceId === svc.id);
        const score = rep ? rep.compositeScore : 85;
        return { service: svc, reputation: rep, score };
      })
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

    const bestCandidate = rankedServices[0];
    addStep(
      'SCORE',
      `Selected Best Provider: ${bestCandidate.service.name}`,
      `Score: ${bestCandidate.score}/100 | Base Fee: ${bestCandidate.service.basePriceHbar} HBAR | Success Rate: ${((bestCandidate.reputation?.successRate ?? 1) * 100).toFixed(1)}%`,
      { candidate: bestCandidate }
    );

    // Attempt execution with failover loop
    for (let attempt = 0; attempt < rankedServices.length; attempt++) {
      const candidate = rankedServices[attempt];
      const svc = candidate.service;

      try {
        // Step 3: Challenge 402
        addStep(
          'CHALLENGE_402',
          `Sending Initial Request to ${svc.name}`,
          `Calling endpoint: ${svc.endpointUrl}. Expecting HTTP 402 with Hedera payment terms...`
        );

        // Fetch with 402 interceptor
        const initialRes = await fetch(svc.endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task.params || { query: task.query, limit: 5 })
        });

        if (initialRes.status !== 402) {
          throw new Error(`Expected HTTP 402 challenge, received HTTP ${initialRes.status}`);
        }

        const challenge = await initialRes.json();
        addStep(
          'CHALLENGE_402',
          '402 Payment Required Challenge Received',
          `Cost: ${challenge.amountHbar} HBAR (${challenge.costBreakdown?.calculationMethod || 'cost-metered'}) | Nonce: ${challenge.challengeNonce.substring(0, 12)}...`,
          { challenge }
        );

        // Check budget
        if (challenge.amountHbar > this.currentBudgetHbar) {
          throw new Error(`Query cost (${challenge.amountHbar} HBAR) exceeds remaining agent budget (${this.currentBudgetHbar} HBAR)`);
        }

        // Step 4: Pay on Hedera
        addStep(
          'PAY_HEDERA',
          `Settling Payment on Hedera (${challenge.network})`,
          `Transferring ${challenge.amountHbar} HBAR to recipient ${challenge.sellerAccountId} via Blocky402 facilitator...`
        );

        const proof = await this.paymentClient.payChallenge(challenge);
        const paymentHeader = this.paymentClient.formatPaymentHeader(proof);

        addStep(
          'PAY_HEDERA',
          'Payment Settled & Cryptographic Proof Generated',
          `Hedera TxID: ${proof.txId} | Amount: ${challenge.amountHbar} HBAR`,
          { proof }
        );

        // Step 5: Redeem Paid Request
        addStep(
          'DELIVER_DATA',
          'Redeeming Metered Data & Awaiting HCS Receipt',
          'Submitting paid request with X-PAYMENT cryptographic proof header...'
        );

        const paidRes = await fetch(svc.endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-PAYMENT': paymentHeader
          },
          body: JSON.stringify(task.params || { query: task.query, limit: 5 })
        });

        if (!paidRes.ok) {
          const errBody = await paidRes.text();
          throw new Error(`Delivery failed with status ${paidRes.status}: ${errBody}`);
        }

        const payload = await paidRes.json();
        const latencyMs = Date.now() - startTime;

        // Deduct budget
        this.currentBudgetHbar = Math.max(0, this.currentBudgetHbar - challenge.amountHbar);
        this.totalSpentHbar += challenge.amountHbar;

        // Step 6: Receipt Confirmation
        if (payload.receipt) {
          addStep(
            'RECORD_HCS',
            'HCS Audit Receipt Confirmed',
            `Receipt ID: ${payload.receipt.receiptId} | HashScan Link: ${payload.receipt.hashScanUrl}`,
            { receipt: payload.receipt }
          );
        }

        addStep(
          'DELIVER_DATA',
          'Data Successfully Delivered',
          `Received ${payload.rowsReturned || payload.data?.length || 1} records in ${latencyMs}ms. Remaining budget: ${this.currentBudgetHbar.toFixed(4)} HBAR.`
        );

        const result: BrokerExecutionResult = {
          taskId: task.taskId,
          success: true,
          serviceId: svc.id,
          providerName: svc.name,
          data: payload.data,
          paidHbar: challenge.amountHbar,
          txId: proof.txId,
          hashScanUrl: payload.receipt?.hashScanUrl,
          receiptId: payload.receipt?.receiptId,
          hcsSequenceNumber: payload.receipt?.sequenceNumber,
          latencyMs,
          steps,
          budgetRemainingHbar: Number(this.currentBudgetHbar.toFixed(4))
        };

        this.emit('TASK_COMPLETED', task.taskId, result);
        return result;
      } catch (err: any) {
        addStep(
          'FAILOVER',
          `Provider ${svc.name} Failed: ${err.message}`,
          attempt + 1 < rankedServices.length
            ? `Triggering automated failover to next best provider: ${rankedServices[attempt + 1].service.name}...`
            : 'All available providers exhausted or budget exceeded.'
        );
      }
    }

    const failedResult: BrokerExecutionResult = {
      taskId: task.taskId,
      success: false,
      serviceId: '',
      providerName: '',
      data: null,
      paidHbar: 0,
      latencyMs: Date.now() - startTime,
      steps,
      budgetRemainingHbar: Number(this.currentBudgetHbar.toFixed(4)),
      error: 'All service providers failed or budget was exceeded'
    };

    this.emit('TASK_FAILED', task.taskId, failedResult);
    return failedResult;
  }
}

export const globalBroker = new BrokerAgent(2.0);
