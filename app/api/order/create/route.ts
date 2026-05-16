import { NextRequest, NextResponse } from "next/server";
import { createPurchaseOrder } from "@/lib/orders";
import type { OrderChannel } from "@/lib/order-token";
import { parsePaymentGateway } from "@/lib/payment-gateway";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      gb?: number;
      email?: string;
      mobile?: string;
      channel?: OrderChannel;
      gateway?: string;
      telegramUserId?: number;
      telegramUsername?: string;
      telegramChatId?: number;
    };

    const gb = Number(body.gb);
    const email = (body.email || "customer@tetrapay.local").trim();
    const mobile = (body.mobile || "").trim();
    const channel: OrderChannel = body.channel === "bot" ? "bot" : "web";
    const gateway = parsePaymentGateway(body.gateway) ?? "tetrapay";

    if (!mobile && channel === "web") {
      return NextResponse.json({ error: "شماره موبایل الزامی است" }, { status: 400 });
    }

    const order = await createPurchaseOrder({
      gb,
      email,
      mobile: mobile || "09000000000",
      channel,
      gateway,
      telegramUserId: body.telegramUserId,
      telegramUsername: body.telegramUsername,
      telegramChatId: body.telegramChatId,
    });

    return NextResponse.json(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : "خطا در ایجاد سفارش";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
