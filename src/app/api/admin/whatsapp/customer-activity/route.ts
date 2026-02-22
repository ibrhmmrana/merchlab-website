import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getCustomerActivityByPhone } from '@/lib/customerActivity';

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
    const phoneNumber = searchParams.get('phoneNumber');

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    const activity = await getCustomerActivityByPhone(phoneNumber);

    if (!activity) {
      return NextResponse.json(
        { activity: null, message: 'No customer activity found for this phone number' },
        {
          headers: {
            ...noIndexHeaders(),
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    return NextResponse.json(
      { activity },
      {
        headers: {
          ...noIndexHeaders(),
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Customer activity API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { 
        error: errorMessage,
      },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

