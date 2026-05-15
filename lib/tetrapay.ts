import { getTetrapayApiKey } from "./config";

const CREATE_URL = "https://tetra98.com/api/create_order";
const VERIFY_URL = "https://tetra98.com/api/verify";

export interface CreateOrderInput {
  hashId: string;
  amount: number;
  description: string;
  email: string;
  mobile: string;
  callbackUrl: string;
}

export interface CreateOrderSuccess {
  status: "100";
  Authority: string;
  payment_url_bot: string;
  payment_url_web: string;
  tracking_id: string;
}

export interface VerifySuccess {
  status: string | number;
  [key: string]: unknown;
}

export async function createTetrapayOrder(
  input: CreateOrderInput
): Promise<CreateOrderSuccess> {
  const res = await fetch(CREATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ApiKey: getTetrapayApiKey(),
      Hash_id: input.hashId,
      Amount: input.amount,
      Description: input.description,
      Email: input.email,
      Mobile: input.mobile,
      CallbackURL: input.callbackUrl,
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || data.status !== "100") {
    throw new Error(
      (data.message as string) || (data.error as string) || "create_order failed"
    );
  }
  return data as unknown as CreateOrderSuccess;
}

export async function verifyTetrapayPayment(
  authority: string
): Promise<VerifySuccess> {
  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      authority,
      ApiKey: getTetrapayApiKey(),
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as VerifySuccess;
  if (!res.ok) {
    throw new Error("verify request failed");
  }
  return data;
}

export function isPaymentSuccess(status: unknown): boolean {
  return status === 100 || status === "100";
}
