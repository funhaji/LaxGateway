export const PAYMENT_GATEWAYS = ["tetrapay", "daramet"] as const;
export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number];

export function parsePaymentGateway(raw: unknown): PaymentGateway | null {
  if (typeof raw !== "string") return null;
  const g = raw.trim().toLowerCase();
  if ((PAYMENT_GATEWAYS as readonly string[]).includes(g)) return g as PaymentGateway;
  return null;
}

export function getOrderGateway(
  payload: { gateway?: PaymentGateway }
): PaymentGateway {
  return payload.gateway ?? "tetrapay";
}
