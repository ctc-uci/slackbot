const schedule = require('node-schedule');
const mongoose = require("mongoose");

const Bot = require('./utils/bot');

const { openCreatePRModal, handleCreatePRSubmitted, updateIssueOptions } = require("./utils/pr");

const {
  openUpdateProfileModal,
  handleUpdateProfileSubmitted,
} = require("./utils/profile");

const { generateMatchyMeetups, clearMatchy } = require("./utils/matchy");

// Mongoose for connecting to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const mongoConnection = mongoose.connection;
mongoConnection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

Bot.command("/pr", openCreatePRModal);
Bot.command("/profile", openUpdateProfileModal);
Bot.command("/matchy", generateMatchyMeetups);
// Bot.command("/clear", clearMatchy);
Bot.action("repository", updateIssueOptions);

Bot.view("create-pr", handleCreatePRSubmitted);
Bot.view("update-profile", handleUpdateProfileSubmitted);

(async () => {
  const port = 5000;
  // Start your app
  await Bot.start();
  console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
})();
