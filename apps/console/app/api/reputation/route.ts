import { NextResponse } from 'next/server';
import { computeProviderReputations } from '@conduitx/registry';

export async function GET() {
  try {
    const reputations = await computeProviderReputations();
    return NextResponse.json({ reputations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
