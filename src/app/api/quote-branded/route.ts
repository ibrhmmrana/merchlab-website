import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WEBHOOK_BRANDED_URL =
  process.env.NEXT_PUBLIC_WEBHOOK_BRANDED_URL ||
  "https://ai.intakt.co.za/webhook/ml-branded-enquiries";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = body.payload;

    if (!Array.isArray(payload) || payload.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: expected non-empty array" },
        { status: 400 }
      );
    }

    const response = await fetch(WEBHOOK_BRANDED_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "MerchLab-Quote-System/1.0",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Branded webhook failed:", response.status, errorText);
      return NextResponse.json(
        {
          error: "Webhook failed",
          details: errorText,
          status: response.status,
        },
        { status: 500 }
      );
    }

    const responseData = await response.text();
    console.log("Branded webhook response length:", responseData?.length ?? 0);

    let webhookBody: { quoteURL?: string; pay_url?: string; [key: string]: unknown } = {};
    try {
      webhookBody = JSON.parse(responseData);
    } catch {
      // Non-JSON response: still return success but no URLs
    }

    return NextResponse.json({
      ok: true,
      message: "Quote submitted successfully",
      quoteURL: webhookBody.quoteURL ?? null,
      pay_url: webhookBody.pay_url ?? null,
    });
  } catch (e: unknown) {
    console.error("Quote branded error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
