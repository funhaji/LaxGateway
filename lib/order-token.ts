import { createHmac, timingSafeEqual } from "crypto";
import { getOrderSecret } from "./config";

import type { PaymentGateway } from "./payment-gateway";

export type OrderChannel = "web" | "bot";

export interface OrderPayload {
  /** Present on new orders; missing tokens are treated as TetraPay (legacy). */
  gateway?: PaymentGateway;
  gb: number;
  amount: number;
  email: string;
  mobile: string;
  description: string;
  channel: OrderChannel;
  telegramUserId?: number;
  telegramUsername?: string;
  telegramChatId?: number;
  createdAt: number;
}

function sign(data: string): string {
  return createHmac("sha256", getOrderSecret()).update(data).digest("base64url");
}

export function encodeOrderId(payload: OrderPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = sign(body);
  return `ord_${body}.${sig}`;
}

export function decodeOrderId(hashId: string): OrderPayload | null {
  if (!hashId.startsWith("ord_")) return null;
  const rest = hashId.slice(4);
  const dot = rest.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = rest.slice(0, dot);
  const sig = rest.slice(dot + 1);
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const json = Buffer.from(body, "base64url").toString("utf8");
    return JSON.parse(json) as OrderPayload;
  } catch {
    return null;
  }
}
