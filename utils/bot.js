const { App } = require("@slack/bolt");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });
const Bot = new App({
  token: process.env.SLACK_TOKEN,
  signingSecret: process.env.SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.APP_LEVEL_TOKEN,
});

module.exports = Bot;
