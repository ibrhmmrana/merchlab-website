import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getEmailById } from '@/lib/gmailMessages';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid email ID' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    const message = await getEmailById(id);

    if (!message) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404, headers: noIndexHeaders() }
      );
    }

    return NextResponse.json(
      { message },
      {
        headers: {
          ...noIndexHeaders(),
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Gmail message API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { 
        error: errorMessage,
      },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

