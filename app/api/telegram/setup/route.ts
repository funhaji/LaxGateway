import { NextResponse } from "next/server";
import { setWebhook } from "@/lib/telegram";
import { getAppUrl } from "@/lib/config";

export const runtime = "nodejs";

/** One-time: GET /api/telegram/setup to register webhook on Vercel */
export async function GET() {
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    const webhookUrl = `${getAppUrl()}/api/telegram/webhook`;
    await setWebhook(webhookUrl, secret || undefined);

    return NextResponse.json({ ok: true, webhook: webhookUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
