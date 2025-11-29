# Vercel Deployment Guide

## Environment Variables

Add these environment variables in Vercel Dashboard:
https://vercel.com/jirassssas-projects/mega2/settings/environment-variables

```
PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESS=0xf6A3DFB7D4D152AFCFfDf33504D57F9335E76875
RPC_URL=https://timothy.megaeth.com/rpc
```

## How It Works

Since Vercel Free tier only supports daily cron jobs, we use a different approach:

1. **Serverless API Functions** in `/api/`:
   - `price.js` - Get current ETH/USDT price
   - `round.js` - Get current round info
   - `start-round.js` - Start new round (called manually or from frontend)
   - `resolve-round.js` - Resolve round (called manually or from frontend)
   - `cron-start.js` - Start round endpoint (can be called via external cron service)
   - `cron-resolve.js` - Resolve round endpoint (can be called via external cron service)

2. **Frontend** (`public/index.html`):
   - Auto-detects API URL (localhost vs production)
   - Can manually trigger round start/resolve via UI buttons

3. **External Cron (Optional)**:
   - Use services like **cron-job.org** or **EasyCron** to call:
     - `POST https://your-app.vercel.app/api/cron-start` every 15 min at :00, :15, :30, :45
     - `POST https://your-app.vercel.app/api/cron-resolve` every 1 minute

## Manual Operation

For testing/demo, you can manually call the APIs:

```bash
# Start new round
curl -X POST https://your-app.vercel.app/api/start-round

# Resolve current round
curl -X POST https://your-app.vercel.app/api/resolve-round
```

## Local Development

```bash
# Install dependencies
npm install

# Run local server (for testing)
npm run server

# Run operator bot (for local testing)
npm run operator

# Deploy to Vercel
npx vercel --prod
```

## Production Setup with External Cron

### Option 1: cron-job.org (Free)

1. Go to https://cron-job.org
2. Create account
3. Add two cron jobs:
   - **Start Round**: `POST https://your-app.vercel.app/api/cron-start`
     - Schedule: `0,15,30,45 * * * *` (every 15 min)
   - **Resolve Round**: `POST https://your-app.vercel.app/api/cron-resolve`
     - Schedule: `* * * * *` (every minute)

### Option 2: GitHub Actions (Free)

Create `.github/workflows/cron.yml`:

```yaml
name: MegaPredict Cron Jobs

on:
  schedule:
    - cron: '0,15,30,45 * * * *'  # Start rounds
    - cron: '* * * * *'            # Resolve rounds

jobs:
  start-round:
    runs-on: ubuntu-latest
    steps:
      - name: Start Round
        run: |
          curl -X POST https://your-app.vercel.app/api/cron-start

  resolve-round:
    runs-on: ubuntu-latest
    steps:
      - name: Resolve Round
        run: |
          curl -X POST https://your-app.vercel.app/api/cron-resolve
```

### Option 3: Vercel Pro Plan

Upgrade to Vercel Pro to use native cron jobs (uncomment crons in vercel.json)

## Notes

- Frontend works immediately after deployment
- For auto rounds, setup external cron service
- All API endpoints support CORS for frontend access
- State is managed in-memory (resets on cold starts)
- For production, consider using Vercel KV or Redis for persistent state
