/**
 * Matchy Slack Bot - Socket Mode + Express
 * Deploy to Railway. See RAILWAY_DEPLOYMENT.md.
 */
const schedule = require("node-schedule");
const express = require("express");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const Bot = require("./utils/bot");
const {
  generateMatches,
} = require("./utils/matchy-json");

// Register handlers before starting
require("./handlers");

const MATCHY_CHANNEL_ID = process.env.MATCHY_CHANNEL_ID || "C01FL4VCE1Z";

(async () => {
  await Bot.start();
  console.log("⚡️ Slack Bolt app (Socket Mode) is running!");

  // Schedule weekly matchy generation (Mondays at 5 PM PST)
  const rule = new schedule.RecurrenceRule();
  rule.tz = 'America/Los_Angeles';
  rule.dayOfWeek = 1; // Monday
  rule.hour = 17; // 5 PM
  rule.minute = 0;

  schedule.scheduleJob(rule, async () => {
    console.log("🕐 Running scheduled matchy generation...");
    try {
      const mockContext = {
        ack: async () => {},
        respond: async (message) => {
          try {
            await Bot.client.chat.postMessage({
              channel: MATCHY_CHANNEL_ID,
              text: `🤖 *Automated Matchy Generation*\n\n${message}`,
            });
          } catch (error) {
            console.error("Error sending to channel:", error);
          }
        },
      };
      await generateMatches(mockContext);
    } catch (error) {
      console.error("Error in scheduled matchy generation:", error);
    }
  });

  const app = express();
  app.use(express.json());

  app.get("/", (req, res) => {
    res.status(200).send("Bot is running");
  });

  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      message: "Matchy Bot is running",
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/matchy-scheduled", async (req, res) => {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    const isValidAuth =
      cronSecret &&
      (authHeader === `Bearer ${cronSecret}` ||
        authHeader === `bearer ${cronSecret}`);

    if (!isValidAuth) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      console.log("🕐 Webhook triggered: Running scheduled matchy generation...");

      const mockContext = {
        ack: async () => {},
        respond: async (message) => {
          try {
            await Bot.client.chat.postMessage({
              channel: MATCHY_CHANNEL_ID,
              text: `🤖 *Automated Matchy Generation*\n\n${message}`,
            });
          } catch (error) {
            console.error("Error sending to channel:", error);
          }
        },
      };

      await generateMatches(mockContext);

      res.status(200).json({
        success: true,
        message: "Matchy generation completed",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in webhook matchy generation:", error);
      res.status(500).json({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  const port = process.env.PORT || 8000;
  app.listen(port, () => {
    console.log(`🔗 HTTP server on port ${port}`);
    console.log("   GET /health");
    console.log("   POST /matchy-scheduled");
    console.log("🚀 Matchy Bot ready for Railway deployment!");
  });
})();
