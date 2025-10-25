# Slackbot for Railway Deployment

This Slackbot automatically generates weekly matchy meetups and creates group chats for team members.

## 🚀 Railway Deployment

### Step 1: Deploy to Railway

1. **Go to [Railway.app](https://railway.app) and sign up/login**

2. **Create a new project:**
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your slackbot repository

3. **Set up environment variables:**
   - Go to your project settings → Variables
   - Add these environment variables:
     ```
     SLACK_TOKEN=xoxb-your-bot-token
     SIGNING_SECRET=your-signing-secret
     APP_LEVEL_TOKEN=xapp-your-app-level-token
     ```

### Step 2: Set up GitHub Actions Cron

1. **Go to your GitHub repository → Settings → Secrets and variables → Actions**

2. **Add these secrets:**
   - `RAILWAY_TOKEN`: Your Railway project token
   - `RAILWAY_WEBHOOK_URL`: Your Railway app URL (e.g., `https://your-app.railway.app`)

3. **The GitHub Action will automatically:**
   - Run every Wednesday at 5 PM PST
   - Trigger your bot's `/matchy-scheduled` endpoint
   - Generate and create matchy groups

### Step 3: Test Your Deployment

1. **Check Railway logs:**
   - Go to your Railway project dashboard
   - Click on your service
   - View the "Logs" tab

2. **Test the webhook manually:**
   ```bash
   curl -X POST https://your-app.railway.app/matchy-scheduled
   ```

3. **Test GitHub Action:**
   - Go to Actions tab in your GitHub repo
   - Click "Weekly Matchy Generation"
   - Click "Run workflow"

## 📁 Files Created

- `railway.json` - Railway deployment configuration
- `Procfile` - Process definition for Railway
- `.github/workflows/matchy-cron.yml` - GitHub Actions cron job
- Updated `app.js` - Added webhook endpoint

## 🔧 Features

- ✅ **Automatic scheduling** - Runs every Wednesday at 5 PM PST
- ✅ **Interactive approval** - Review matches before creating groups
- ✅ **Group chat creation** - Automatically creates group DMs
- ✅ **Activity suggestions** - Includes fun activity ideas
- ✅ **Auto-member approval** - New channel members are automatically added
- ✅ **Railway hosting** - Runs 24/7 in the cloud

## 🎯 Commands

- `/matchy` - Generate and approve matches
- `/clear` - Clear previous matches (for testing)

## 📊 Monitoring

- **Railway Dashboard** - View logs and monitor performance
- **GitHub Actions** - See cron job execution history
- **Slack Channel** - Receive automated notifications

Your bot is now ready for Railway deployment! 🎉
