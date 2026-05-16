import { decodeOrderId } from "./order-token";
import { verifyTetrapayPayment, isPaymentSuccess } from "./tetrapay";
import { fulfillPaidOrder } from "./fulfillment";
import { getOrderGateway } from "./payment-gateway";
import { getDarametApiToken } from "./config";
import { darametOrderRefTag, findDarametDonateForOrder } from "./daramet";

export interface PaymentResult {
  ok: boolean;
  alreadyFulfilled?: boolean;
  order?: ReturnType<typeof decodeOrderId>;
  authority: string;
  hashId: string;
  trackingId?: string;
  error?: string;
}

export async function confirmDarametPayment(hashId: string): Promise<PaymentResult> {
  const trimmed = hashId.trim();
  const order = decodeOrderId(trimmed);
  if (!order) {
    return { ok: false, authority: "", hashId: trimmed, error: "Invalid order token" };
  }
  if (getOrderGateway(order) !== "daramet") {
    return {
      ok: false,
      authority: "",
      hashId: trimmed,
      order,
      error: "Not a Daramet order",
    };
  }

  const token = getDarametApiToken();
  const refTag = darametOrderRefTag(trimmed);

  try {
    const match = await findDarametDonateForOrder({
      token,
      refTag,
      expectedAmountIrr: order.amount,
      notBeforeMs: order.createdAt,
    });

    if (!match) {
      return {
        ok: false,
        authority: "",
        hashId: trimmed,
        order,
        error:
          "پرداخت در لیست دریافت شما نیامده یا متن پیام دونیت با کد تأیید سفارش یکی نیست. دوباره تلاش کنید.",
      };
    }

    const authority = `dmt-${match.id}`;
    const fulfilled = await fulfillPaidOrder({
      order,
      hashId: trimmed,
      authority,
      trackingId: match.id,
    });

    return {
      ok: true,
      alreadyFulfilled: !fulfilled,
      order,
      authority,
      hashId: trimmed,
      trackingId: match.id,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "دسترسی به API دارمت ناموفق بود";
    return { ok: false, authority: "", hashId: trimmed, order, error: msg };
  }
}

export async function processSuccessfulPayment(params: {
  authority: string;
  hashId: string;
  callbackStatus?: unknown;
  trackingId?: string;
}): Promise<PaymentResult> {
  const { authority, hashId } = params;

  const order = decodeOrderId(hashId);
  if (!order) {
    return { ok: false, authority, hashId, error: "Invalid order token" };
  }

  if (getOrderGateway(order) !== "tetrapay") {
    return {
      ok: false,
      authority,
      hashId,
      order,
      error: "This order token is not for TetraPay",
    };
  }

  if (params.callbackStatus !== undefined && !isPaymentSuccess(params.callbackStatus)) {
    return { ok: false, authority, hashId, order, error: "Payment not successful" };
  }

  const verify = await verifyTetrapayPayment(authority);
  if (!isPaymentSuccess(verify.status)) {
    return { ok: false, authority, hashId, order, error: "Verification failed" };
  }

  const trackingId =
    params.trackingId ||
    (typeof verify.tracking_id === "string" ? verify.tracking_id : undefined);

  const fulfilled = await fulfillPaidOrder({
    order,
    hashId,
    authority,
    trackingId,
  });

  return {
    ok: true,
    alreadyFulfilled: !fulfilled,
    order,
    authority,
    hashId,
    trackingId,
  };
}
