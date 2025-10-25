const schedule = require("node-schedule");
const mongoose = require("mongoose");

const Bot = require("./utils/bot");

const {
  openCreatePRModal,
  handleCreatePRSubmitted,
  updateIssueOptions,
} = require("./utils/pr");

const {
  openUpdateProfileModal,
  handleUpdateProfileSubmitted,
} = require("./utils/profile");

const { generateMatchyMeetups, clearMatchy, loadMembersDataCommand, fetchChannelUsers, handleUserApproval, autoApproveNewMember } = require("./utils/matchy-json");

const {
  openCreateIssueModal,
  handleCreateIssueSubmitted,
} = require("./utils/issue");

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
// Bot.command("/profile", openUpdateProfileModal);
// Bot.command("/issue", openCreateIssueModal);

// For debugging only
Bot.command("/matchy", generateMatchyMeetups);
Bot.command("/clear", clearMatchy);


// Button action handlers (only for user approval in /clear command)
Bot.action("approve_user", handleUserApproval);
Bot.action("decline_user", handleUserApproval);
Bot.action("skip_user", handleUserApproval);

// Event listeners for automatic member approval
Bot.event("member_joined_channel", async ({ event }) => {
  // Only process events for the matchy channel
  if (event.channel === "C01FL4VCE1Z") {
    console.log(`Member joined channel: ${event.user}`);
    await autoApproveNewMember(event.user);
  }
});

// Also listen for team_join events (when someone joins the workspace)
Bot.event("team_join", async ({ event }) => {
  console.log(`New user joined workspace: ${event.user.id}`);
  // Note: This doesn't automatically add them to matchy since they need to join the channel first
});

// Bot.action("repository", updateIssueOptions);

// Bot.view("create-pr", handleCreatePRSubmitted);
// Bot.view("create-issue", handleCreateIssueSubmitted);
// Bot.view("update-profile", handleUpdateProfileSubmitted);

(async () => {
  const port = 5000;
  // Start your app
  await Bot.start();
  console.log(`⚡️ Slack Bolt app is running on port ${port}!`);

  // Schedule weekly matchy generation (Wednesdays at 5 PM PST)
  const rule = new schedule.RecurrenceRule();
  rule.tz = 'America/Los_Angeles';
  rule.dayOfWeek = 3; // Wednesday
  rule.hour = 17; // 5 PM
  rule.minute = 0;
  
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
      
      await generateMatchyMeetups(mockContext);
    } catch (error) {
      console.error('Error in scheduled matchy generation:', error);
    }
  });
  
  console.log('📅 Matchy scheduled for Wednesdays at 5:00 PM PST');
  
  // Add webhook endpoint for Railway/GitHub Actions cron
  Bot.app.post('/matchy-scheduled', async (req, res) => {
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
      
      await generateMatchyMeetups(mockContext);
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
  
  console.log('🚀 Slackbot ready for Railway deployment!');
})();
