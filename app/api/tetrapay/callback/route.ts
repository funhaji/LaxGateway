import { NextRequest, NextResponse } from "next/server";
import { processSuccessfulPayment } from "@/lib/payment-handler";
import { getAppUrl } from "@/lib/config";

export const runtime = "nodejs";

async function handleCallback(req: NextRequest) {
  let authority = "";
  let hashId = "";
  let status: unknown;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await req.json()) as Record<string, unknown>;
    authority = String(body.authority || "");
    hashId = String(body.hash_id || body.Hash_id || "");
    status = body.status;
  } else {
    const form = await req.formData().catch(() => null);
    if (form) {
      authority = String(form.get("authority") || "");
      hashId = String(form.get("hash_id") || form.get("Hash_id") || "");
      status = form.get("status");
    } else {
      const url = new URL(req.url);
      authority = url.searchParams.get("authority") || "";
      hashId = url.searchParams.get("hash_id") || url.searchParams.get("Hash_id") || "";
      status = url.searchParams.get("status");
    }
  }

  if (!authority || !hashId) {
    return NextResponse.redirect(`${getAppUrl()}/?payment=invalid`);
  }

  const result = await processSuccessfulPayment({
    authority,
    hashId,
    callbackStatus: status,
  });

  if (result.ok) {
    const q = new URLSearchParams({
      payment: "success",
      authority,
      gb: String(result.order?.gb ?? ""),
      amount: String(result.order?.amount ?? ""),
      tracking: result.trackingId || authority,
    });
    return NextResponse.redirect(`${getAppUrl()}/?${q.toString()}`);
  }

  return NextResponse.redirect(
    `${getAppUrl()}/?payment=failed&authority=${encodeURIComponent(authority)}`
  );
}

export async function GET(req: NextRequest) {
  return handleCallback(req);
}

export async function POST(req: NextRequest) {
  return handleCallback(req);
}
