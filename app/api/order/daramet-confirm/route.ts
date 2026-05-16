import { NextRequest, NextResponse } from "next/server";
import { confirmDarametPayment } from "@/lib/payment-handler";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { hashId?: string };
    const hashId = typeof body.hashId === "string" ? body.hashId.trim() : "";
    if (!hashId) {
      return NextResponse.json({ error: "hashId الزامی است" }, { status: 400 });
    }

    const result = await confirmDarametPayment(hashId);
    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      gb: result.order?.gb ?? 0,
      amount: result.order?.amount ?? 0,
      tracking: result.trackingId ?? result.authority,
      authority: result.authority,
      alreadyFulfilled: Boolean(result.alreadyFulfilled),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "خطا در تأیید پرداخت";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
