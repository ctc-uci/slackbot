// const { Modal, Blocks, Elements, Bits } = require("slack-block-builder");
const { plainText, markdownText } = require("../utils/blockUtils");

const repos = require("../config/repos");

const CreatePRModal = () => {
  return JSON.stringify({
    type: "modal",
    title: plainText("Create new PR"),
    close: plainText("Cancel"),
    submit: plainText("Create"),
    callback_id: "create-pr",
    blocks: [
      {
        label: plainText("Choose a repository"),
        block_id: "repository",
        element: {
          placeholder: plainText("Type a repo name..."),
          action_id: "repository",
          options: repos
            // .filter(repo => repo.permissions?.includes(user.role))
            .map((repo) => ({
              text: plainText(`${repo.name} (${repo.owner}/${repo.alias})`),
              value: `${repo.owner}/${repo.alias}`,
            })),
          type: "static_select",
        },
        hint: plainText(
          `If you aren't sure which repository to choose here, ask your tech lead!`
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
  });
};

module.exports = CreatePRModal;
