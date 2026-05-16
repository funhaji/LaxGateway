# V2Ray Gateway (TetraPay + Darāmet)

Purchase gateway for V2Ray configs via **TetraPay** or **Darāmet** — web and Telegram bot. No database: order data is stored in signed tokens only.

## Features

- Web shop with GB picker (۲۰٬۰۰۰ تومان per GB — **۲۰۰٬۰۰۰ ریال** charged by gateways) and gateway choice (**TetraPay** or **Darāmet**)
- Telegram bot: GB → gateway → mobile → pay links
- TetraPay: web/Telegram pay URLs + automatic callback verification
- Darāmet: Webintent donate URL; **تأیید پرداخت** uses `Donates/Search` to match the order
- Admin notifications + customer receipt in Telegram after payment
- Vercel-ready (serverless)

## Setup

1. Copy `.env.example` to `.env.local` and fill values (add Darāmet vars if you use that gateway).
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
| `DARAMET_API_TOKEN` | Darāmet developer API token (HTTP `Authorization`) — only if offering Darāmet |
| `DARAMET_USERNAME` | Darāmet profile slug, e.g. `https://daramet.com/<slug>` |

## Flow (TetraPay)

1. Customer picks GB + gateway.
2. TetraPay orders: `create_order` with signed `Hash_id`.
3. Customer pays via TetraPay URLs.
4. TetraPay calls `/api/tetrapay/callback` → verify → notify admins + customer.

## Flow (Darāmet)

1. Customer picks GB + **دارمت**.
2. App returns a Webintent URL with IRR amount + fixed message `V2:<ref>:<n>GB` (do not edit in the donor UI).
3. After donating, customer triggers **«تأیید پرداخت»** (`POST /api/order/daramet-confirm`): server searches donations and fulfills when amount + reference match.

## TetraPay callback URL

Configure in TetraPay dashboard if needed:

```
https://your-domain/api/tetrapay/callback
```

(This is also sent automatically in each `create_order` request.)
