# TradeForge — Live Market Data Setup (Twelve Data)

TradeForge runs in **DEMO mode** when no API key is set — it uses synthetic EUR/USD, XAU/USD, etc.

To get real market data:

### 1. Get a free API key (2 minutes)
1. Go to https://twelvedata.com/
2. Sign up free — Free plan = 800 requests/day, 8 req/min (enough for 1-2 symbols)
3. Go to Dashboard → API Keys → Copy your key

### 2. Add it to TradeForge

**Option A — .env file (recommended)**
```bash
# TradeForge/.env
EXPO_PUBLIC_TWELVE_DATA_API_KEY=your_key_here_123abc
EXPO_PUBLIC_ALERT_POLL_INTERVAL_MS=15000
```

**Option B — Expo Dashboard**
If you deploy via EAS, add as secret:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_TWELVE_DATA_API_KEY --value your_key_here
```

### 3. Restart Expo
```bash
# web
npm run web
# or phone
npx expo start --tunnel
```

When key is detected:
- DEMO badge disappears
- Live candles from Twelve Data (Forex + XAU/USD)
- Real bid/ask ticker

### Supported symbols (free tier)
- FX: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CHF
- Metals: XAU/USD (Gold)
- Format: Twelve Data expects `EUR/USD` → app handles it

### Troubleshooting
- `429` → rate limit, free tier is 8/min. Wait 60s or reduce poll interval in .env
- `401` → invalid key, check copy-paste
- No candles? Check Metro logs for `[TwelveData]`

### Optional: Alpha Vantage (fallback)
You can also set `EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY` in .env for extra fallback.
