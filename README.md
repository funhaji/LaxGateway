# TetraPay V2Ray Gateway

Purchase gateway for V2Ray configs via **TetraPay** — web and Telegram bot. No database: order data is stored in signed tokens only.

## Features

- Web shop with GB picker (200,000 IRR per GB)
- Telegram bot with the same flow
- Both **web** and **Telegram bot** payment links from TetraPay
- Admin notifications + customer receipt in Telegram after payment
- Vercel-ready (serverless)

## Setup

1. Copy `.env.example` to `.env.local` and fill values.
2. `npm install` && `npm run dev`
3. Deploy to Vercel and set the same env vars.
4. Set `NEXT_PUBLIC_APP_URL` to your production URL (TetraPay callback uses this).
5. Open `https://your-domain/api/telegram/setup` once to register the bot webhook.

## Env vars

| Variable | Description |
|----------|-------------|
| `TETRAPAY_API_KEY` | TetraPay API key |
| `ORDER_SIGNING_SECRET` | HMAC secret for order tokens (no DB) |
| `NEXT_PUBLIC_APP_URL` | Public site URL |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `TELEGRAM_ADMIN_IDS` | Comma-separated admin Telegram user IDs |
| `TELEGRAM_WEBHOOK_SECRET` | Optional webhook verification |
| `PRODUCT_NAME` | Shown on receipts |
| `SUPPORT_CONTACT` | Shown to customers |

## Flow

1. Customer picks GB (web or bot).
2. Order is created via TetraPay `create_order`; `Hash_id` is a signed payload.
3. Customer pays via web or Telegram payment URL.
4. TetraPay calls `/api/tetrapay/callback` → verify → notify admins + customer.

## TetraPay callback URL

Configure in TetraPay dashboard if needed:

```
https://your-domain/api/tetrapay/callback
```

(This is also sent automatically in each `create_order` request.)
