const { App } = require("@slack/bolt");
const { Octokit } = require("@octokit/core");

require("dotenv").config();
// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_TOKEN,
  signingSecret: process.env.SIGNING_SECRET,
  //   socketMode: true,
  //   appToken: process.env.APP_LEVEL_TOKEN,
});

// Octokit.js
// https://github.com/octokit/core.js#readme
const octokit = new Octokit({
  auth: process.env.CTC_DEVOPS_PAT,
});

const OWNER = "ctc-uci";
const REPO = "find-your-anchor-frontend";
const PR_TEMPLATE =
  "Authors:\n \
### What does this PR contain?\n \
### How did you test these changes?\n \
### Attach images (if applicable)";

const SUCCESS_MESSAGE = (branch, number) =>
  `SUCCESSFULLY created a PR for \`${branch}\`\n\
https://github.com/${OWNER}/${REPO}/pull/${number}`;

const FAILURE_MESSAGE = (command) =>
  `FAILED to make a PR with the command \n\`/pr ${command.text}\`\n\
Please verify that \n\
1. Your command was submitted in the form \`/pr branch name_of_pr\`\n\
2. Your branch name is correct.\n\
3. Your branch exists on remote (ie git push BEFORE submitting this PR command)`;

app.command("/pr", async ({ command, ack, respond }) => {
  try {
    await ack();
    const parameters = command.text.split(" ");
    const response = await octokit.request(
      `POST /repos/${OWNER}/${REPO}/pulls`,
      {
        owner: OWNER,
        repo: REPO,
        title: parameters[1],
        body: PR_TEMPLATE,
        head: `${OWNER}:${parameters[0]}`,
        base: "dev",
      }
    );
    await respond(
      SUCCESS_MESSAGE(parameters[0], response.data.number),
      (response_type = "ephemeral")
    );
  } catch (e) {
    await respond(FAILURE_MESSAGE(command), (response_type = "ephemeral"));
  }
});

(async () => {
  const port = 5000;
  // Start your app
  await app.start(process.env.PORT || port);
  console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
})();
