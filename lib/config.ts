function required(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`Missing env: ${name}`);
  return v.trim();
}

function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export function getAppUrl(): string {
  const explicit = optional("NEXT_PUBLIC_APP_URL") || optional("APP_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getTetrapayApiKey(): string {
  return required("TETRAPAY_API_KEY");
}

export function getOrderSecret(): string {
  return required("ORDER_SIGNING_SECRET");
}

export function getTelegramBotToken(): string {
  return required("TELEGRAM_BOT_TOKEN");
}

export function getAdminTelegramIds(): number[] {
  const raw = required("TELEGRAM_ADMIN_IDS");
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = Number(s);
      if (!Number.isFinite(n)) throw new Error(`Invalid admin id: ${s}`);
      return n;
    });
}

export function getProductName(): string {
  return optional("PRODUCT_NAME", "V2Ray Config");
}

export function getSupportContact(): string {
  return optional("SUPPORT_CONTACT", "@your_support");
}
