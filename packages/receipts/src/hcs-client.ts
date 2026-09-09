import { HCSReceiptMessage } from '@conduitx/types';

export interface HCSConfig {
  operatorAccountId?: string;
  operatorPrivateKey?: string;
  topicId?: string;
  network?: 'testnet' | 'mainnet' | 'previewnet';
  mirrorNodeUrl?: string;
}

export class HCSReceiptService {
  private config: HCSConfig;
  private inMemoryReceipts: HCSReceiptMessage[] = [];
  private sequenceCounter: number = 100;

  constructor(config: HCSConfig = {}) {
    this.config = {
      operatorAccountId: config.operatorAccountId || process.env.HEDERA_OPERATOR_ID,
      operatorPrivateKey: config.operatorPrivateKey || process.env.HEDERA_OPERATOR_KEY,
      topicId: config.topicId || process.env.HEDERA_HCS_TOPIC_ID || '0.0.5694210',
      network: config.network || (process.env.HEDERA_NETWORK as any) || 'testnet',
      mirrorNodeUrl:
        config.mirrorNodeUrl ||
        process.env.HEDERA_MIRROR_NODE_URL ||
        'https://testnet.mirrornode.hedera.com'
    };
  }

  /**
   * Publish a receipt to HCS topic
   */
  async publishReceipt(
    receipt: Omit<HCSReceiptMessage, 'protocol' | 'hashScanUrl' | 'sequenceNumber' | 'consensusTimestamp'>
  ): Promise<HCSReceiptMessage> {
    const fullReceipt: HCSReceiptMessage = {
      ...receipt,
      protocol: 'conduitx/v1',
      sequenceNumber: ++this.sequenceCounter,
      consensusTimestamp: `${Math.floor(Date.now() / 1000)}.${(Date.now() % 1000) * 1000000}`,
      hashScanUrl: this.getHashScanUrl(receipt.txId)
    };

    // If live Hedera credentials exist, submit to live HCS Topic
    if (this.config.operatorAccountId && this.config.operatorPrivateKey && this.config.topicId) {
      try {
        const { Client, TopicMessageSubmitTransaction, AccountId, PrivateKey, TopicId } = await import('@hashgraph/sdk');
        const client = this.config.network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
        client.setOperator(
          AccountId.fromString(this.config.operatorAccountId),
          PrivateKey.fromString(this.config.operatorPrivateKey)
        );

        const tx = await new TopicMessageSubmitTransaction()
          .setTopicId(TopicId.fromString(this.config.topicId))
          .setMessage(JSON.stringify(fullReceipt))
          .execute(client);

        const record = await tx.getRecord(client);
        if (record.consensusTimestamp) {
          fullReceipt.consensusTimestamp = record.consensusTimestamp.toString();
        }
      } catch (err: any) {
        console.warn(`[HCS] Live submission fallback to cached ledger: ${err.message}`);
      }
    }

    this.inMemoryReceipts.unshift(fullReceipt);
    return fullReceipt;
  }

  /**
   * Query receipts from Hedera Mirror Node
   */
  async getReceipts(serviceId?: string, limit: number = 50): Promise<HCSReceiptMessage[]> {
    if (this.config.topicId && this.config.mirrorNodeUrl) {
      try {
        const url = `${this.config.mirrorNodeUrl}/api/v1/topics/${this.config.topicId}/messages?limit=${limit}&order=desc`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const body: any = await res.json();
          if (Array.isArray(body?.messages)) {
            const parsed: HCSReceiptMessage[] = [];
            for (const msg of body.messages) {
              try {
                const decoded = Buffer.from(msg.message, 'base64').toString('utf-8');
                const json = JSON.parse(decoded);
                if (json.protocol === 'conduitx/v1') {
                  json.sequenceNumber = msg.sequence_number;
                  json.consensusTimestamp = msg.consensus_timestamp;
                  parsed.push(json);
                }
              } catch {
                // ignore malformed topic message
              }
            }
            if (parsed.length > 0) {
              return serviceId ? parsed.filter((r) => r.serviceId === serviceId) : parsed;
            }
          }
        }
      } catch (err: any) {
        // Fallback to in-memory store
      }
    }

    if (serviceId) {
      return this.inMemoryReceipts.filter((r) => r.serviceId === serviceId).slice(0, limit);
    }
    return this.inMemoryReceipts.slice(0, limit);
  }

  getHashScanUrl(txId: string): string {
    const cleanId = txId.replace(/[@.]/g, '-');
    return `https://hashscan.io/${this.config.network}/transaction/${cleanId}`;
  }

  getTopicHashScanUrl(): string {
    return `https://hashscan.io/${this.config.network}/topic/${this.config.topicId}`;
  }
}

export const globalHCS = new HCSReceiptService();
