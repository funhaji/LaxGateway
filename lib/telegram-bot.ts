import { MIN_GB, MAX_GB, PRICE_PER_GB_IRR, formatIrr } from "./pricing";
import { createPurchaseOrder } from "./orders";
import { sendMessage, answerCallbackQuery } from "./telegram";
import { getProductName, getSupportContact } from "./config";
import { confirmDarametPayment } from "./payment-handler";
import { parsePaymentGateway, type PaymentGateway } from "./payment-gateway";

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

const pendingCheckout = new Map<number, { gb: number; gateway?: PaymentGateway }>();
const pendingDarametConfirm = new Map<number, string>();

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

function gatewayKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "TetraPay", callback_data: "gw:tetrapay" },
        { text: "💚 دارمت", callback_data: "gw:daramet" },
      ],
      [{ text: "❌ انصراف", callback_data: "cancel" }],
    ],
  };
}

function payKeyboard(botUrl: string, webUrl: string) {
  if (botUrl === webUrl) {
    return {
      inline_keyboard: [
        [{ text: "💚 باز کردن دارمت / پرداخت", url: botUrl }],
        [{ text: "✅ تأیید پرداخت دارمت", callback_data: "dmt:confirm" }],
      ],
    };
  }
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
  pendingCheckout.set(user.id, { gb });
  await sendMessage(chatId, "درگاه پرداخت را انتخاب کنید:", {
    reply_markup: gatewayKeyboard(),
  });
}

async function onGatewaySelected(
  chatId: number,
  user: TelegramUser,
  gateway: PaymentGateway,
  callbackId: string
) {
  const pending = pendingCheckout.get(user.id);
  const gb = pending?.gb;
  if (!gb) {
    await answerCallbackQuery(callbackId, "خطا");
    await sendMessage(chatId, "/start را بزنید و دوباره حجم را انتخاب کنید.");
    return;
  }

  const label =
    gateway === "daramet" ? "دارمت (وب‌اینتنت)" : "TetraPay";
  await answerCallbackQuery(callbackId, label);
  pendingCheckout.set(user.id, { gb, gateway });
  await sendMessage(
    chatId,
    `📊 ${gb} GB · درگاه «${label}»\n\nلطفاً شماره موبایل خود را ارسال کنید (مثال: 09123456789):`,
    { reply_markup: { force_reply: true, selective: true } }
  );
}

async function createBotOrder(
  chatId: number,
  user: TelegramUser,
  gb: number,
  mobile: string,
  gateway: PaymentGateway
) {
  const email = user.username
    ? `${user.username}@telegram.user`
    : `tg${user.id}@telegram.user`;

  const order = await createPurchaseOrder({
    gb,
    email,
    mobile,
    channel: "bot",
    gateway,
    telegramUserId: user.id,
    telegramUsername: user.username,
    telegramChatId: chatId,
  });

  const lines = [
    "✅ سفارش ایجاد شد!",
    "",
    `📦 ${gb} GB — ${formatIrr(order.amount)}`,
    `🔌 درگاه: ${gateway === "daramet" ? "دارمت" : "TetraPay"}`,
    "",
  ];

  if (gateway === "daramet" && typeof order.orderRefTag === "string") {
    lines.push(
      "⚠️ هنگام دونیت، متن پیام را تغییر ندهید (کد تأیید سفارش داخل پیام آمده است)."
    );
    lines.push("", `📎 کد سفارش: \`${order.orderRefTag}\``);
    pendingDarametConfirm.set(user.id, order.hashId);
  }

  lines.push("", "روش پرداخت را انتخاب کنید:");

  await sendMessage(chatId, lines.join("\n"), {
    reply_markup: payKeyboard(order.paymentUrlBot, order.paymentUrlWeb),
  });
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const cb = update.callback_query;
  if (cb?.data && cb.message) {
    const chatId = cb.message.chat.id;
    const user = cb.from;

    if (cb.data === "cancel") {
      await answerCallbackQuery(cb.id, "لغو شد");
      pendingCheckout.delete(user.id);
      pendingDarametConfirm.delete(user.id);
      await sendMessage(chatId, "عملیات لغو شد. /start");
      return;
    }

    if (cb.data === "dmt:confirm") {
      await answerCallbackQuery(cb.id, "در حال بررسی…");
      const hashId = pendingDarametConfirm.get(user.id);
      if (!hashId) {
        await sendMessage(
          chatId,
          "سفارشی برای تأیید دارمت باز نیست. یک سفارش جدید با /start بسازید."
        );
        return;
      }

      const r = await confirmDarametPayment(hashId);
      if (!r.ok) {
        await sendMessage(chatId, r.error || "خطا در تأیید پرداخت. دوباره امتحان کنید.");
        return;
      }

      if (r.alreadyFulfilled) {
        await sendMessage(chatId, "✅ قبلاً برای این تراکنش رسید ثبت شده بود.");
      }
      pendingDarametConfirm.delete(user.id);
      return;
    }

    if (cb.data.startsWith("gw:")) {
      const gw = parsePaymentGateway(cb.data.slice(3));
      if (gw) await onGatewaySelected(chatId, user, gw, cb.id);
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
    pendingCheckout.delete(user.id);
    pendingDarametConfirm.delete(user.id);
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

  const pending = pendingCheckout.get(user.id);

  if (pending?.gb !== undefined && pending.gateway === undefined) {
    await sendMessage(
      chatId,
      "لطفاً از پیام قبلی یکی از دکمه‌های درگاه («TetraPay» یا «دارمت») را بزنید."
    );
    return;
  }

  if (pending?.gb !== undefined && pending.gateway !== undefined) {
    const mobile = text.replace(/\D/g, "");
    if (mobile.length < 10 || mobile.length > 11) {
      await sendMessage(chatId, "❌ شماره موبایل نامعتبر است. دوباره ارسال کنید.");
      return;
    }
    const normalized = mobile.startsWith("0") ? mobile : `0${mobile}`;
    const gw = pending.gateway;
    pendingCheckout.delete(user.id);
    await createBotOrder(chatId, user, pending.gb, normalized, gw);
    return;
  }
}