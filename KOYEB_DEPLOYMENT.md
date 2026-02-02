# Matchy Bot - Koyeb Deployment (Socket Mode)

Deploy the Matchy Slack bot to Koyeb's free tier using Socket Mode. A keep-alive ping prevents Koyeb from scaling the service to zero after 1 hour of inactivity.

## Overview

- **Socket Mode**: No public URL needed for Slack—the bot connects outbound to Slack
- **Free Tier**: 1 web service, 512MB RAM, 0.1 vCPU (Frankfurt or Washington, D.C.)
- **Keep-Alive**: UptimeRobot pings `/health` every 30 minutes to prevent scale-to-zero

## Step 1: Deploy to Koyeb

1. Go to [Koyeb](https://app.koyeb.com) and sign up (no credit card needed for Hobby in most regions)
2. **Create a new Web Service**
3. **Source**: Connect your GitHub repo and select this project
4. **Build**: 
   - Builder: Nixpacks (default) or Dockerfile
   - Build command: (leave default, or `npm install`)
   - Run command: `node app.js`
5. **Instance**: Select the **Free** instance type (512MB RAM)
6. **Region**: Frankfurt or Washington, D.C. (free tier regions)
7. **Port**: `8000` (or set `PORT` env var to match)
8. **Environment Variables**: Add the following (Settings → Environment variables)

| Variable | Description |
|----------|-------------|
| `SLACK_TOKEN` | Bot OAuth token (xoxb-...) |
| `SIGNING_SECRET` | Signing secret from Slack app |
| `APP_LEVEL_TOKEN` | App-level token for Socket Mode (xapp-...) |
| `FIREBASE_API_KEY` | Firebase config |
| `FIREBASE_AUTHDOMAIN` | Firebase config |
| `FIREBASE_PROJECTID` | Firebase config |
| `FIREBASE_STORAGEBUCKET` | Firebase config |
| `FIREBASE_MESSAGINGSENDERID` | Firebase config |
| `FIREBASE_APPID` | Firebase config |
| `MATCHY_CHANNEL_ID` | (Optional) Slack channel for matchy results |
| `PORT` | (Optional) `8000` — Koyeb usually sets this automatically |

9. Deploy and note your app URL (e.g. `https://your-app-name.koyeb.app`)

## Step 2: Set Up Keep-Alive (Required)

Koyeb's free tier scales to zero after **1 hour** of no incoming traffic. Socket Mode uses outbound connections, so we need a periodic HTTP ping to count as "incoming traffic."

### Option A: UptimeRobot (Recommended)

1. Go to [UptimeRobot](https://uptimerobot.com) (free tier)
2. **Add New Monitor**
3. **Monitor Type**: HTTP(s)
4. **URL**: `https://your-app-name.koyeb.app/health`
5. **Monitoring Interval**: 5 minutes (or 30 minutes if on free limits)
6. Save

UptimeRobot will ping your app regularly. As long as the interval is less than 1 hour, Koyeb will not scale your service to zero.

### Option B: Cron-job.org

1. Go to [Cron-job.org](https://cron-job.org) (free)
2. Create a new cron job
3. **URL**: `https://your-app-name.koyeb.app/health`
4. **Schedule**: Every 30 minutes (e.g. `*/30 * * * *`)
5. Save

## Step 3: Slack App Configuration

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → your app
2. **Socket Mode**: Turn **ON**
3. **OAuth & Permissions**: Ensure your bot has the required scopes
4. **Event Subscriptions**: Not required for Socket Mode (the bot connects to Slack, not vice versa)

## Step 4: Scheduled Matchy (Wednesdays 5pm PST)

The app uses `node-schedule` to run matchy every Wednesday at 5 PM PST. As long as the app stays running (kept awake by UptimeRobot), this happens automatically—no GitHub Actions or external cron needed.

## Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Simple "Bot is running" (keep-alive) |
| `/health` | GET | JSON health check (keep-alive) |
| `/matchy-scheduled` | POST | Manual trigger for matchy (optional; requires `CRON_SECRET` env var) |

## Troubleshooting

- **Bot goes offline after ~1 hour**: Ensure UptimeRobot (or similar) is pinging your app more frequently than every 60 minutes
- **Slash commands not responding**: Check Slack app has Socket Mode enabled and `APP_LEVEL_TOKEN` is set
- **Matchy not running**: Check Koyeb logs to verify `node-schedule` is running (app must stay awake via UptimeRobot)

## Local Development

```bash
npm run dev
```

Uses `http://localhost:8000`. Socket Mode works locally without exposing a public URL.
