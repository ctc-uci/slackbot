// const { Modal, Blocks, Elements, Bits } = require("slack-block-builder");
const { image, plainText } = require("../utils/blockUtils");
const octokit = require("../utils/octokit");

const repos = require("../config/repos");

const CreatePRModal = async (user, repo = null) => {
  const repoOptions = Object.values(repos)
    .filter((repo) => user.repos.includes(repo.alias))
    .map((repo) => ({
      text: plainText(`${repo.name} (${repo.alias})`),
      value: `${repo.alias}`,
    }));

  let issueOptions = [{ text: plainText("No issues found in repository"), value: "-1" }];
  if (repo !== null) {
    issueOptions = (await octokit.request("GET /repos/{owner}/{repo}/issues", {
      owner: 'ctc-uci',
      repo,
    })).data.filter(issue => issue.pull_request === undefined && issue.state === "open")
      .map(issue => ({ text: plainText(`Issue #${issue.number}: ${issue.title}`), value: `${issue.number}` }));
  }

  const view = user.repos.length
    ? {
      type: "modal",
      title: plainText("Create new PR"),
      close: plainText("Close"),
      submit: plainText("Create"),
      callback_id: "create-pr",
      blocks: [
        {
          label: plainText("Choose a repository"),
          block_id: "repository",
          element: {
            placeholder: plainText("Type a repo name..."),
            action_id: "repository",
            options: repoOptions,
            type: "static_select",
          },
          hint: plainText(
            `If you aren't sure which repository to choose here, ask your tech lead!`
          ),
          type: "input",
          dispatch_action: true,
        },
        {
          label: plainText("Choose an issue"),
          block_id: `${repo}/issue`,
          element: {
            placeholder: plainText("Select an issue..."),
            action_id: "issue",
            options: issueOptions,
            type: "static_select",
          },
          hint: plainText(
            `If you aren't sure which issue to choose here, ask your tech lead!`
          ),
          type: "input",
          dispatch_action: true,
        },
        {
          label: plainText("Enter your branch name..."),
          block_id: "branch",
          element: {
            placeholder: plainText("Type a branch name..."),
            action_id: "branch",
            type: "plain_text_input",
          },
          hint: plainText(
            `If this branch doesn't exist in the remote repository, the bot will make it for you.`
          ),
          type: "input",
          dispatch_action: true,
        },
        {
          label: plainText("Name your PR"),
          block_id: "pr_title",
          element: {
            placeholder: plainText("Type a PR name..."),
            action_id: "pr_title",
            type: "plain_text_input",
          },
          hint: plainText(
            "This PR name should briefly describe the changes that you made.\nExample: Add Modals for Populating Species Data"
          ),
          type: "input",
        },
      ],
    }
    : {
      type: "modal",
      title: plainText("Create New PR"),
      close: plainText("Let's try /profile"),
      blocks: [image("https://i.imgur.com/492aYiU.png")],
    };

  return JSON.stringify(view);
};

module.exports = CreatePRModal;
