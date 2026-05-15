import { getTelegramBotToken, getAdminTelegramIds } from "./config";

const API = (method: string) =>
  `https://api.telegram.org/bot${getTelegramBotToken()}/${method}`;

export async function telegramApi<T = unknown>(
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(API(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; description?: string; result?: T };
  if (!data.ok) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }
  return data.result as T;
}

export async function sendMessage(
  chatId: number,
  text: string,
  extra?: Record<string, unknown>
): Promise<void> {
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    ...extra,
  });
}

export async function notifyAdmins(text: string): Promise<void> {
  const admins = getAdminTelegramIds();
  await Promise.allSettled(admins.map((id) => sendMessage(id, text)));
}

export async function setWebhook(
  url: string,
  secretToken?: string
): Promise<void> {
  await telegramApi("setWebhook", {
    url,
    drop_pending_updates: true,
    ...(secretToken ? { secret_token: secretToken } : {}),
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await telegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}
