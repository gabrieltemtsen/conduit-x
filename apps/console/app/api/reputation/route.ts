import { NextResponse } from 'next/server';
import { computeProviderReputations } from '@conduitx/registry';

export async function GET() {
  try {
    const reputations = await computeProviderReputations();
    return NextResponse.json({ reputations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
