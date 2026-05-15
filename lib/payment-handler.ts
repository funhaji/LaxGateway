import { decodeOrderId } from "./order-token";
import { verifyTetrapayPayment, isPaymentSuccess } from "./tetrapay";
import { fulfillPaidOrder } from "./fulfillment";

export interface PaymentResult {
  ok: boolean;
  alreadyFulfilled?: boolean;
  order?: ReturnType<typeof decodeOrderId>;
  authority: string;
  hashId: string;
  trackingId?: string;
  error?: string;
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
