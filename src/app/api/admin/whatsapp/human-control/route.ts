import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { setHumanControl, isHumanInControl } from '@/lib/whatsapp/humanControl';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET - Check if human is in control for a session
 */
export async function GET(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    const humanControlled = await isHumanInControl(sessionId);

    return NextResponse.json(
      { isHumanInControl: humanControlled },
      { headers: noIndexHeaders() }
    );
  } catch (error) {
    console.error('Error checking human control state:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

/**
 * POST - Set human control state for a session
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const { sessionId, isHumanInControl: isHumanControlled } = await request.json();

    if (!sessionId || typeof isHumanControlled !== 'boolean') {
      return NextResponse.json(
        { error: 'sessionId and isHumanInControl (boolean) are required' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    await setHumanControl(sessionId, isHumanControlled);

    return NextResponse.json(
      { success: true, isHumanInControl: isHumanControlled },
      { headers: noIndexHeaders() }
    );
  } catch (error) {
    console.error('Error setting human control state:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

