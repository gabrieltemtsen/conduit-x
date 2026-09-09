import { X402MeterServer } from '../src/server.js';
import { X402PaymentClient } from '../src/client.js';
import { HCSReceiptService } from '@conduitx/receipts';
import assert from 'node:assert';

async function runTests() {
  console.log('🧪 Running ConduitX x402 + Hedera + HCS Integration Tests...\n');

  const hcs = new HCSReceiptService({ network: 'testnet', topicId: '0.0.5694210' });
  const meter = new X402MeterServer({
    serviceId: 'test-seller',
    providerName: 'Test DEX Data Provider',
    sellerAccountId: '0.0.5694201',
    baseFeeHbar: 0.02,
    perRowFeeHbar: 0.002,
    hcsService: hcs
  });

  const client = new X402PaymentClient({
    accountId: '0.0.5694300',
    network: 'testnet'
  });

  // Test 1: Challenge creation with cost metering
  console.log('Test 1: Creating 402 Payment Challenge with 10 rows...');
  const challenge = meter.createChallenge({ limit: 10 }, {});
  assert.strictEqual(challenge.status, 402);
  assert.strictEqual(challenge.amountHbar, 0.04); // 0.02 base + 10 * 0.002
  assert.strictEqual(challenge.scheme, 'x402-hedera');
  assert.ok(challenge.challengeNonce.length >= 16);
  console.log('  ✅ Challenge generated correctly with cost: 0.04 HBAR\n');

  // Test 2: Client settles 402 challenge
  console.log('Test 2: Client signing and paying 402 challenge...');
  const proof = await client.payChallenge(challenge);
  assert.strictEqual(proof.scheme, 'x402-hedera');
  assert.strictEqual(proof.payerAccountId, '0.0.5694300');
  assert.strictEqual(proof.sellerAccountId, '0.0.5694201');
  assert.ok(proof.txId.includes('@'));
  console.log(`  ✅ Payment settled. Hedera TxID: ${proof.txId}\n`);

  // Test 3: Server verifies payment
  console.log('Test 3: Server verifying payment header proof...');
  const header = client.formatPaymentHeader(proof);
  const verifyRes = await meter.verifyPayment(header, { limit: 10 }, {});
  assert.strictEqual(verifyRes.valid, true);
  assert.ok(verifyRes.proof);
  console.log('  ✅ Payment proof verified by server\n');

  // Test 4: Replay protection
  console.log('Test 4: Testing replay prevention...');
  const replayRes = await meter.verifyPayment(header, { limit: 10 }, {});
  assert.strictEqual(replayRes.valid, false);
  assert.ok(replayRes.error?.includes('spent'));
  console.log('  ✅ Replay attack prevented (nonce cannot be reused)\n');

  // Test 5: Mint HCS Audit Receipt
  console.log('Test 5: Minting HCS cryptographic receipt...');
  const receipt = await meter.recordSettlementAndReceipt(proof, 'test-query', { limit: 10 }, 10, 185);
  assert.strictEqual(receipt.protocol, 'conduitx/v1');
  assert.strictEqual(receipt.serviceId, 'test-seller');
  assert.strictEqual(receipt.status, 'SETTLED');
  assert.ok(receipt.hashScanUrl.includes('hashscan.io/testnet/transaction/'));
  assert.ok(receipt.queryHash.length === 64);
  console.log(`  ✅ Receipt written to HCS. Receipt ID: ${receipt.receiptId}`);
  console.log(`  🔗 HashScan: ${receipt.hashScanUrl}\n`);

  // Test 6: Query receipts from topic
  console.log('Test 6: Reading receipts from HCS service index...');
  const receipts = await hcs.getReceipts('test-seller');
  assert.ok(receipts.length >= 1);
  console.log(`  ✅ Successfully read ${receipts.length} receipt(s) from HCS ledger\n`);

  console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
