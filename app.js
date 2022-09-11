const { App } = require("@slack/bolt");
const mongoose = require("mongoose");

const { openPRModal, handleCreatePRSubmitted } = require("./utils/pr");

const {
  openUpdateProfileModal,
  handleUpdateProfileSubmitted,
} = require("./utils/profile");

require("dotenv").config();
// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_TOKEN,
  signingSecret: process.env.SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.APP_LEVEL_TOKEN,
});

// Mongoose for connecting to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const mongoConnection = mongoose.connection;
mongoConnection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

// const OWNER = "ctc-uci";
// const REPO = "find-your-anchor-frontend";

app.command("/pr", openPRModal);
app.command("/profile", openUpdateProfileModal);

app.view("create-pr", handleCreatePRSubmitted);
app.view("update-profile", handleUpdateProfileSubmitted);

(async () => {
  const port = 5000;
  // Start your app
  await app.start();
  console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
})();
