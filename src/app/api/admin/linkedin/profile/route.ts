import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getLinkedInProfileByCustomerName } from '@/lib/linkedinProfiles';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const customerName = searchParams.get('customerName');

    if (!customerName) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    const profile = await getLinkedInProfileByCustomerName(customerName);

    if (!profile) {
      return NextResponse.json(
        { error: 'LinkedIn profile not found' },
        { status: 404, headers: noIndexHeaders() }
      );
    }

    return NextResponse.json(
      { profile },
      {
        headers: {
          ...noIndexHeaders(),
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('LinkedIn profile API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

