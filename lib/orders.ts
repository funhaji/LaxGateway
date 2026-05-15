import { amountForGb } from "./pricing";
import { encodeOrderId, type OrderChannel, type OrderPayload } from "./order-token";
import { createTetrapayOrder } from "./tetrapay";
import { getAppUrl, getProductName } from "./config";

export interface CreateOrderRequest {
  gb: number;
  email: string;
  mobile: string;
  channel: OrderChannel;
  telegramUserId?: number;
  telegramUsername?: string;
  telegramChatId?: number;
}

export async function createPurchaseOrder(input: CreateOrderRequest) {
  const amount = amountForGb(input.gb);
  const description = `${getProductName()} — ${input.gb} GB`;

  const payload: OrderPayload = {
    gb: input.gb,
    amount,
    email: input.email,
    mobile: input.mobile,
    description,
    channel: input.channel,
    telegramUserId: input.telegramUserId,
    telegramUsername: input.telegramUsername,
    telegramChatId: input.telegramChatId,
    createdAt: Date.now(),
  };

  const hashId = encodeOrderId(payload);
  const callbackUrl = `${getAppUrl()}/api/tetrapay/callback`;

  const result = await createTetrapayOrder({
    hashId,
    amount,
    description,
    email: input.email,
    mobile: input.mobile,
    callbackUrl,
  });

  return {
    hashId,
    authority: result.Authority,
    paymentUrlBot: result.payment_url_bot,
    paymentUrlWeb: result.payment_url_web,
    trackingId: result.tracking_id,
    amount,
    gb: input.gb,
  };
}
