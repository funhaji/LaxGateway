import { NextRequest, NextResponse } from "next/server";
import { processSuccessfulPayment } from "@/lib/payment-handler";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      authority?: string;
      hashId?: string;
      hash_id?: string;
    };

    const authority = body.authority?.trim();
    const hashId = (body.hashId || body.hash_id)?.trim();

    if (!authority || !hashId) {
      return NextResponse.json({ error: "authority and hashId required" }, { status: 400 });
    }

    const result = await processSuccessfulPayment({ authority, hashId });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "verify failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
