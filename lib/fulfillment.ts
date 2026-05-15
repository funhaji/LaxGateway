import type { OrderPayload } from "./order-token";
import {
  buildAdminReceipt,
  buildCustomerReceipt,
  type ReceiptContext,
} from "./receipts";
import { notifyAdmins, sendMessage } from "./telegram";

/** In-memory dedup for serverless warm instances — best-effort only */
const fulfilled = new Set<string>();

export async function fulfillPaidOrder(params: {
  order: OrderPayload;
  hashId: string;
  authority: string;
  trackingId?: string;
}): Promise<boolean> {
  const key = `${params.authority}:${params.hashId}`;
  if (fulfilled.has(key)) return false;
  fulfilled.add(key);
  if (fulfilled.size > 500) {
    const first = fulfilled.values().next().value;
    if (first) fulfilled.delete(first);
  }

  const ctx: ReceiptContext = {
    order: params.order,
    authority: params.authority,
    trackingId: params.trackingId,
    hashId: params.hashId,
  };

  await notifyAdmins(buildAdminReceipt(ctx));

  if (params.order.telegramChatId) {
    await sendMessage(params.order.telegramChatId, buildCustomerReceipt(ctx));
  }

  return true;
}
