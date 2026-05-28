# Menfess Sumatra

Website menfess anonim dengan Telegram dan sistem pembayaran QRIS.

## Features
- Submit text/photo
- Telegram auto post
- Tripay payment
- Supabase database

## Stack
- Node.js
- Vercel
- Supabase
- Telegraf

## Flow
1. User submit menfess text/photo to `/api/post-to-telegram`
2. Photo is watermarked and uploaded to Supabase Storage
3. One pending row is stored in `transactions` with `foto_url`
4. Tripay QRIS is created: text Rp5.000, photo/photo+text Rp10.000
5. Tripay callback validates signature and posts to Telegram
6. Transaction status becomes `PAID_POSTED`

## ENV
- TELEGRAM_BOT_TOKEN
- TELEGRAM_CHANNEL
- SUPABASE_URL
- SUPABASE_ANON_KEY
- TRIPAY_PRIVATE_KEY
- TRIPAY_MERCHANT_CODE
- TRIPAY_API_KEY
- PUBLIC_BASE_URL
