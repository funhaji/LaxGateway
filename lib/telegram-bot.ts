import { MIN_GB, MAX_GB, PRICE_PER_GB_IRR, formatIrr } from "./pricing";
import { createPurchaseOrder } from "./orders";
import { sendMessage, answerCallbackQuery } from "./telegram";
import { getProductName, getSupportContact } from "./config";

interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
}

interface TelegramChat {
  id: number;
  type: string;
}

interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

const pendingMobile = new Map<number, { gb: number }>();

function gbKeyboard() {
  const sizes = [1, 2, 5, 10, 20, 50];
  const rows = sizes.map((gb) => [
    {
      text: `${gb} GB — ${formatIrr(gb * PRICE_PER_GB_IRR)}`,
      callback_data: `gb:${gb}`,
    },
  ]);
  rows.push([{ text: "❌ انصراف", callback_data: "cancel" }]);
  return { inline_keyboard: rows };
}

function payKeyboard(botUrl: string, webUrl: string) {
  return {
    inline_keyboard: [
      [{ text: "🤖 پرداخت در تلگرام", url: botUrl }],
      [{ text: "🌐 پرداخت در وب", url: webUrl }],
    ],
  };
}

async function startFlow(chatId: number, user?: TelegramUser) {
  const name = user?.first_name || "کاربر";
  await sendMessage(
    chatId,
    [
      `سلام ${name}! 👋`,
      "",
      `خرید *${getProductName()}*`,
      `هر ۱ گیگابایت: *${formatIrr(PRICE_PER_GB_IRR)}*`,
      "",
      "حجم مورد نظر را انتخاب کنید:",
    ].join("\n"),
    { reply_markup: gbKeyboard() }
  );
}

async function onGbSelected(
  chatId: number,
  user: TelegramUser,
  gb: number,
  callbackId: string
) {
  await answerCallbackQuery(callbackId, `انتخاب: ${gb} GB`);
  pendingMobile.set(user.id, { gb });
  await sendMessage(
    chatId,
    `📊 ${gb} GB انتخاب شد.\n\nلطفاً شماره موبایل خود را ارسال کنید (مثال: 09123456789):`,
    { reply_markup: { force_reply: true, selective: true } }
  );
}

async function createBotOrder(
  chatId: number,
  user: TelegramUser,
  gb: number,
  mobile: string
) {
  const email = user.username
    ? `${user.username}@telegram.user`
    : `tg${user.id}@telegram.user`;

  const order = await createPurchaseOrder({
    gb,
    email,
    mobile,
    channel: "bot",
    telegramUserId: user.id,
    telegramUsername: user.username,
    telegramChatId: chatId,
  });

  await sendMessage(
    chatId,
    [
      "✅ سفارش ایجاد شد!",
      "",
      `📦 ${gb} GB — ${formatIrr(order.amount)}`,
      "",
      "روش پرداخت را انتخاب کنید:",
    ].join("\n"),
    { reply_markup: payKeyboard(order.paymentUrlBot, order.paymentUrlWeb) }
  );
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const cb = update.callback_query;
  if (cb?.data && cb.message) {
    const chatId = cb.message.chat.id;
    const user = cb.from;

    if (cb.data === "cancel") {
      await answerCallbackQuery(cb.id, "لغو شد");
      pendingMobile.delete(user.id);
      await sendMessage(chatId, "عملیات لغو شد. /start");
      return;
    }

    if (cb.data.startsWith("gb:")) {
      const gb = Number(cb.data.slice(3));
      if (gb >= MIN_GB && gb <= MAX_GB) {
        await onGbSelected(chatId, user, gb, cb.id);
      }
      return;
    }
  }

  const msg = update.message;
  if (!msg?.text || !msg.from) return;

  const chatId = msg.chat.id;
  const user = msg.from;
  const text = msg.text.trim();

  if (text === "/start") {
    pendingMobile.delete(user.id);
    await startFlow(chatId, user);
    return;
  }

  if (text === "/help") {
    await sendMessage(
      chatId,
      [`📖 راهنما`, `• /start — شروع خرید`, `• پشتیبانی: ${getSupportContact()}`].join("\n")
    );
    return;
  }

  const pending = pendingMobile.get(user.id);
  if (pending) {
    const mobile = text.replace(/\D/g, "");
    if (mobile.length < 10 || mobile.length > 11) {
      await sendMessage(chatId, "❌ شماره موبایل نامعتبر است. دوباره ارسال کنید.");
      return;
    }
    const normalized = mobile.startsWith("0") ? mobile : `0${mobile}`;
    pendingMobile.delete(user.id);
    await createBotOrder(chatId, user, pending.gb, normalized);
  }
}
