import { NextRequest, NextResponse } from "next/server";
import { getQuoteInfo } from "@/lib/whatsapp/quoteInfo";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Validate quote number format
 * Accepts: ML-[5 char string] or Q[3 digits]-[5 char string]
 */
function isValidQuoteNumber(quoteNo: string): boolean {
  const cleaned = quoteNo.trim().toUpperCase();
  const mlPattern = /^ML-[A-Z0-9]{5}$/;
  const qPattern = /^Q\d{3}-[A-Z0-9]{5}$/;
  return mlPattern.test(cleaned) || qPattern.test(cleaned);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { quoteNo: string } }
) {
  try {
    const quoteNo = params.quoteNo;

    if (!quoteNo) {
      return NextResponse.json(
        { error: "Quote number is required" },
        { status: 400 }
      );
    }

    // Validate quote number format
    if (!isValidQuoteNumber(quoteNo)) {
      return NextResponse.json(
        { error: "Invalid quote number format. Expected ML-XXXXX or QXXX-XXXXX" },
        { status: 400 }
      );
    }

    // Fetch quote info
    const quoteInfo = await getQuoteInfo(quoteNo);

    if (!quoteInfo) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    // Return the full quote data including shareableDetails which contains items
    return NextResponse.json({
      quoteNo: quoteInfo.quoteNo,
      customer: quoteInfo.customer,
      createdAt: quoteInfo.createdAt,
      value: quoteInfo.value,
      payload: quoteInfo.shareableDetails, // This contains the items array
    });
  } catch (error) {
    console.error("Error fetching quote:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch quote: ${errorMessage}` },
      { status: 500 }
    );
  }
}

