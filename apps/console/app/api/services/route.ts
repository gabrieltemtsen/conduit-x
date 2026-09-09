import { NextResponse } from 'next/server';
import { DEFAULT_SERVICES } from '@conduitx/registry';

export async function GET() {
  return NextResponse.json({ services: DEFAULT_SERVICES });
}
