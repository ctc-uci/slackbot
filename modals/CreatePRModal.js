// const { Modal, Blocks, Elements, Bits } = require("slack-block-builder");
const { image, plainText } = require("../utils/blockUtils");

const repos = require("../config/repos");

const CreatePRModal = (user) => {
  const repoOptions = Object.values(repos)
    .filter((repo) => user.repos.includes(repo.alias))
    .map((repo) => ({
      text: plainText(`${repo.name} (${repo.alias})`),
      value: `${repo.alias}`,
    }));

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
        close: plainText("Ask your tech lead"),
        blocks: [image("https://i.imgur.com/492aYiU.png")],
      };

  return JSON.stringify(view);
};

module.exports = CreatePRModal;
