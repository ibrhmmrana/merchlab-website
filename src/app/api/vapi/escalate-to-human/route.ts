import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/vapi/auth';
import { successResponse, errorResponse } from '@/lib/vapi/response';
import { sendEscalationEmail, type EscalationContext } from '@/lib/gmail/sender';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/vapi/escalate-to-human
 * Escalate conversation to human support
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    // Parse request body
    const body = await request.json();
    const { caller_phone, reason, conversation_summary } = body;

    // Validate required fields
    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        errorResponse(
          'Reason for escalation is required',
          'Please provide a reason for escalation'
        ),
        { status: 400 }
      );
    }

    // Build escalation context
    const escalationContext: EscalationContext = {
      reason,
      conversationSummary: conversation_summary || 'Voice call escalation',
      customerPhone: caller_phone,
    };

    // Send escalation email
    try {
      await sendEscalationEmail(escalationContext);
      
      // Generate escalation ID (simple timestamp-based)
      const escalationId = `ESC-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;

      const responseData = {
        escalation_id: escalationId,
        status: 'pending',
        email_sent: true,
      };

      const spoken_summary = "I've escalated your request to our support team. A team member will contact you shortly. Is there anything else I can help with in the meantime?";

      return NextResponse.json(successResponse(responseData, spoken_summary));
    } catch (emailError) {
      console.error('Error sending escalation email:', emailError);
      return NextResponse.json(
        errorResponse(
          'Failed to send escalation email',
          'Please contact support directly at hello@merchlab.io or call our main line'
        ),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in escalate-to-human:', error);
    return NextResponse.json(
      errorResponse(
        'An error occurred while escalating your request',
        'Please contact support directly'
      ),
      { status: 500 }
    );
  }
}
