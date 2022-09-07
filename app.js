const { App } = require("@slack/bolt");
const { Octokit } = require("@octokit/core");
const mongoose = require('mongoose');

const CreatePRModal = require("./modals/createPR");
const UserModel = require('./models/user.model');

const messages = require('./utils/msgs');
const prTemplates = require('./utils/prTemplates');

require("dotenv").config();
// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_TOKEN,
  signingSecret: process.env.SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.APP_LEVEL_TOKEN,
});

// Octokit.js
// https://github.com/octokit/core.js#readme
const octokit = new Octokit({
  auth: process.env.CTC_DEVOPS_PAT,
});

// Mongoose for connecting to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const mongoConnection = mongoose.connection;
mongoConnection.once('open', () => {
  console.log('MongoDB database connection established successfully');
});

// const OWNER = "ctc-uci";
// const REPO = "find-your-anchor-frontend";

app.command("/pr", async ({ command, ack, client, respond }) => {
  try {
    await ack();
    console.log(CreatePRModal);
    
    // Getting user info from Mongo
    const { user_id: slackId } = command;
    let user;
    try {
      user = await UserModel.findOne({ slackId });
    } catch (err) {
      console.log(err.message);
    }
    console.log('User from MongoDB is', user);

    await client.views.open({
      trigger_id: command.trigger_id,
      view: CreatePRModal,
      // view: () => CreatePRModal(user),
    });
    // const parameters = command.text.split(" ");
    // const response = await octokit.request(
    //   `POST /repos/${OWNER}/${REPO}/pulls`,
    //   {
    //     owner: OWNER,
    //     repo: REPO,
    //     title: parameters[1],
    //     body: prTemplates.common,
    //     head: `${OWNER}:${parameters[0]}`,
    //     base: "dev",
    //   }
    // );
    // await respond(
    //   messages.pr.success(REPO, parameters[0], response.data.number),
    //   (response_type = "ephemeral")
    // );
  } catch (e) {
    console.log(e);
    await respond(messages.pr.failure(command), (response_type = "ephemeral"));
  }
});

app.view("create-pr", async ({ ack, view }) => {
  await ack();
  console.log(view.state.values);
  // Sample of how to get a Select's selected value...(scuffed!)
  // console.log(view.state.values.repository.repository.selected_option.value);
  //   const response = await octokit.request(`POST /repos/${OWNER}/${REPO}/pulls`, {
  //     owner: OWNER,
  //     repo: REPO,
  //     title: parameters[1],
  //     body: PR_TEMPLATE,
  //     head: `${OWNER}:${parameters[0]}`,
  //     base: "dev",
  //   });
});

(async () => {
  const port = 5000;
  // Start your app
  await app.start();
  console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
})();
