const { App } = require("@slack/bolt");

require("dotenv").config("../");
// Initializes your app with your bot token and signing secret
const Bot = new App({
  token: process.env.SLACK_TOKEN,
  signingSecret: process.env.SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.APP_LEVEL_TOKEN,
});

module.exports = Bot;
