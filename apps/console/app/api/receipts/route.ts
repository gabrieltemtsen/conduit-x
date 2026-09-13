import { NextRequest, NextResponse } from 'next/server';
import { globalHCS } from '@conduitx/receipts';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get('serviceId') || undefined;
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100);

  try {
    const receipts = await globalHCS.getReceipts(serviceId, limit);
    return NextResponse.json({
      topicId: process.env.HEDERA_HCS_TOPIC_ID || '0.0.5694210',
      topicHashScanUrl: globalHCS.getTopicHashScanUrl(),
      receipts
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
