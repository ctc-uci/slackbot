const schedule = require("node-schedule");
const mongoose = require("mongoose");
const express = require("express");

const Bot = require("./utils/bot");

const { addUserToMatchy, generateMatches, loadMembersDataCommand, exportMembersJSON, openManageMembersModal, handleManageMembersSubmitted, openManageMatchesModal, handleManageMatchesSubmitted, handleRemoveMatch, importPreviousMatches, ensureNextMatch, skipNextMatchyWeek } = require("./utils/matchy-json");

// Mongoose for connecting to MongoDB
// Temporarily disabled for testing
/*
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const mongoConnection = mongoose.connection;
mongoConnection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});
*/
// Bot.command("/pr", openCreatePRModal);


Bot.command("/profile", loadMembersDataCommand);
Bot.command("/matchy", addUserToMatchy);
Bot.command("/pr", skipNextMatchyWeek);
Bot.command("/issue", ensureNextMatch);

// Bot.command("/pr", openManageMembersModal);
// Bot.view("manage_members_modal", handleManageMembersSubmitted);

// Bot.view("manage_matches_modal", handleManageMatchesSubmitted);
// Bot.action(({ action }) => action?.action_id?.startsWith('remove_match_') ?? false, handleRemoveMatch);
// Bot.command("/clear", clearMatchy);


// Bot.action("repository", updateIssueOptions);

// Bot.view("create-pr", handleCreatePRSubmitted);
// Bot.view("create-issue", handleCreateIssueSubmitted);
// Bot.view("update-profile", handleUpdateProfileSubmitted);

(async () => {
  const port = 5000;
  // Start your app
  await Bot.start();
  console.log(`⚡️ Slack Bolt app is running on port ${port}!`);

  // // Schedule weekly matchy generation (Wednesdays at 5 PM PST)
  const rule = new schedule.RecurrenceRule();
  rule.tz = 'America/Los_Angeles';
  rule.dayOfWeek = 5; // Wednesday
  rule.hour = 19; // 5 PM
  rule.minute = 39;
  
  schedule.scheduleJob(rule, async () => {
    console.log('🕐 Running scheduled matchy generation...');
    try {
      // Create a mock context for the scheduled job
      const mockContext = {
        ack: async () => {},
        respond: async (message) => {
          console.log('Scheduled matchy response:', message);
          // You could also send this to a specific channel if needed
          // await Bot.client.chat.postMessage({
          //   channel: 'C01FL4VCE1Z',
          //   text: message
          // });
        }
      };
      
      await generateMatches(mockContext);
    } catch (error) {
      console.error('Error in scheduled matchy generation:', error);
    }
  });
  
  // console.log('📅 Matchy scheduled for Wednesdays at 5:00 PM PST');
  
  // Create Express app for webhook endpoint
  const app = express();
  app.use(express.json());
  
  // Add webhook endpoint for Railway/GitHub Actions cron
  app.post('/matchy-scheduled', async (req, res) => {
    try {
      console.log('🕐 Webhook triggered: Running scheduled matchy generation...');
      
      const mockContext = {
        ack: async () => {},
        respond: async (message) => {
          console.log('Scheduled matchy response:', message);
          // Optionally send to a specific channel
          try {
            await Bot.client.chat.postMessage({
              channel: 'C01FL4VCE1Z', // Your matchy channel
              text: `🤖 *Automated Matchy Generation*\n\n${message}`
            });
          } catch (error) {
            console.error('Error sending to channel:', error);
          }
        }
      };
      
      await generateMatches(mockContext);
      res.status(200).json({ 
        success: true, 
        message: 'Matchy generation completed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in webhook matchy generation:', error);
      res.status(500).json({ 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Start Express server on a different port
  const webhookPort = process.env.PORT || 3000;
  app.listen(webhookPort, () => {
    console.log(`🔗 Webhook server running on port ${webhookPort}`);
  });
  
  console.log('🚀 Slackbot ready for Railway deployment!');
})();
