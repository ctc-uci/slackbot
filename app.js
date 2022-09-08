const { App } = require("@slack/bolt");
const mongoose = require("mongoose");

const CreatePRModal = require("./modals/createPR");
const UserModel = require("./models/user.model");

const {
  createRemoteBranchIfNotExists,
  existingPRWithBranchExists,
  createPR,
} = require("./utils/pr");
const messages = require("./utils/msgs");

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

app.command("/pr", async ({ command, ack, client, respond }) => {
  try {
    await ack();

    // Getting user info from Mongo
    const { user_id: slackId } = command;
    let user;
    try {
      user = await UserModel.findOne({ slackId });
    } catch (err) {
      console.log(err.message);
    }

    await client.views.open({
      trigger_id: command.trigger_id,
      view: CreatePRModal(),
    });
  } catch (e) {
    console.log(e);
    await respond(messages.pr.failure(command), (response_type = "ephemeral"));
  }
});

app.view("create-pr", async ({ ack, view, body, respond, client }) => {
  try {
    const PRWithBranchExists = await existingPRWithBranchExists(
      view.state.values
    );
    if (PRWithBranchExists) {
      await ack({
        response_action: "errors",
        errors: {
          branch:
            "A PR already exists with that branch. Please close the existing PR or overwrite it with git push",
        },
      });
    } else {
      await ack();
    }
    // If the branch doesn't exist in the remote repository
    // 1. Make the new branch
    // 2. Make an empty commit on the new branch
    await createRemoteBranchIfNotExists(view.state.values);
    // Create the PR
    const values = await createPR(view.state.values);
    client.chat.postMessage({
      text: messages.pr.success(values.repo, values.branch, values.number),
      channel: body.user.id,
    });
    // TODO: NOTIFY THE USER ON ERROR
  } catch (e) {
    console.log(e);
  }
});

(async () => {
  const port = 5000;
  // Start your app
  await app.start();
  console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
})();
