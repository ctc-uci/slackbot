// const { Modal, Blocks, Elements, Bits } = require("slack-block-builder");
const { image, plainText } = require("../utils/blockUtils");

const repos = require("../config/repos");

const CreateIssueModal = async (user) => {
    const repoOptions = Object.values(repos)
        .filter((repo) => user.repos.includes(repo.alias))
        .map((repo) => ({
            text: plainText(`${repo.name} (${repo.alias})`),
            value: `${repo.alias}`,
        }));

    const view = user.repos.length
        ? {
            type: "modal",
            title: plainText("Create New Issue"),
            close: plainText("Close"),
            submit: plainText("Create"),
            callback_id: "create-issue",
            blocks: [
                {
                    label: plainText("Choose a repository"),
                    block_id: "issue_repository",
                    element: {
                        placeholder: plainText("Type a repo name..."),
                        action_id: "issue_repository",
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
                    label: plainText("Name your issue"),
                    block_id: "issue_title",
                    element: {
                        placeholder: plainText("Type an issue name..."),
                        action_id: "issue_title",
                        type: "plain_text_input",
                    },
                    hint: plainText(
                        "This issue name should briefly describe the changes that you will make.\nExample: Add Modals for Populating Species Data"
                    ),
                    type: "input",
                },
            ],
        }
        : {
            type: "modal",
            title: plainText("Create New Issue"),
            close: plainText("Let's try /profile"),
            blocks: [image("https://i.imgur.com/492aYiU.png")],
        };

    return JSON.stringify(view);
};

module.exports = CreateIssueModal;
