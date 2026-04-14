# My Wallet 💳 — Netlify PWA

## Deploy Steps (5 minutes)

### 1. Go to netlify.com → "Add new site" → "Deploy manually"
Drag and drop the entire `wallet-netlify` folder — done!

### 2. Add your Anthropic API key
- Site settings → Environment variables → Add variable
- Key:   `ANTHROPIC_API_KEY`
- Value: `sk-ant-your-key-here`
- Get key from: https://console.anthropic.com

### 3. Trigger redeploy
- Deploys tab → "Trigger deploy" → "Deploy site"

### 4. Install as PWA on iPhone
- Open your `.netlify.app` URL in Safari
- Share button → "Add to Home Screen" → Add ✅

## How it works
User uploads receipt → `/.netlify/functions/analyze` (server) → Anthropic API → result back
API key lives on the server, never in the browser.

## Local dev
```bash
npm install -g netlify-cli
netlify dev
```
