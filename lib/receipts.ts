import { formatToman } from "./pricing";
import type { OrderPayload } from "./order-token";
import { getProductName, getSupportContact } from "./config";

export interface ReceiptContext {
  order: OrderPayload;
  authority: string;
  trackingId?: string;
  hashId: string;
}

function contactLine(order: OrderPayload): string {
  const parts: string[] = [];
  if (order.mobile) parts.push(`📱 ${order.mobile}`);
  if (order.email) parts.push(`✉️ ${order.email}`);
  if (order.telegramUserId) {
    const un = order.telegramUsername ? `@${order.telegramUsername}` : "";
    parts.push(`🤖 Telegram: ${order.telegramUserId}${un ? ` (${un})` : ""}`);
  }
  return parts.join("\n") || "—";
}

export function buildAdminReceipt(ctx: ReceiptContext): string {
  const { order, authority, trackingId, hashId } = ctx;
  const channel = order.channel === "bot" ? "Telegram Bot" : "Web";
  return [
    "🛒 *پرداخت جدید — ادمین*",
    "",
    `📦 محصول: ${getProductName()}`,
    `📊 حجم: *${order.gb} GB*`,
    `💰 مبلغ: *${formatToman(order.amount)}*`,
    `📡 کانال: ${channel}`,
    "",
    "👤 مشتری:",
    contactLine(order),
    "",
    "🔖 جزئیات تراکنش:",
    `• Authority: \`${authority}\``,
    trackingId ? `• Tracking: \`${trackingId}\`` : null,
    `• Hash ID: \`${hashId.slice(0, 48)}…\``,
    `• زمان سفارش: ${new Date(order.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}`,
    "",
    "⚙️ *اقدام بعدی:* کانفیگ V2Ray را به صورت دستی برای این مشتری ارسال کنید.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildCustomerReceipt(ctx: ReceiptContext): string {
  const { order, authority, trackingId } = ctx;
  return [
    "✅ *پرداخت شما تأیید شد*",
    "",
    `📦 ${getProductName()}`,
    `📊 حجم خریداری‌شده: *${order.gb} GB*`,
    `💰 مبلغ پرداخت‌شده: ${formatToman(order.amount)}`,
    "",
    "🔖 کد پیگیری:",
    trackingId ? `\`${trackingId}\`` : `\`${authority}\``,
    "",
    "⏳ *مرحله بعد:* تیم ما در اسرع وقت کانفیگ V2Ray شما را ارسال می‌کند.",
    `📞 پشتیبانی: ${getSupportContact()}`,
    "",
    "از خرید شما سپاسگزاریم! 🙏",
  ].join("\n");
}

export function buildWebSuccessHtml(ctx: ReceiptContext): string {
  const { order, authority, trackingId } = ctx;
  return `
    <p><strong>حجم:</strong> ${order.gb} GB</p>
    <p><strong>مبلغ:</strong> ${formatToman(order.amount)}</p>
    <p><strong>کد پیگیری:</strong> <code>${trackingId || authority}</code></p>
    <p>کانفیگ V2Ray به زودی برای شما ارسال می‌شود. پشتیبانی: ${getSupportContact()}</p>
  `;
}
