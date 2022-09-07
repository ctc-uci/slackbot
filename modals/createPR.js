// const { Modal, Blocks, Elements, Bits } = require("slack-block-builder");
const { plainText, markdownText } = require('../utils/blockUtils');

const repos = require('../config/repos');

const CreatePRModal = () => {
  // if (!user) {
  //   return;
  // }

  return JSON.stringify({
    type: 'modal',
    title: plainText('Create new PR'),
    close: plainText('Cancel'),
    submit: plainText('Create'),
    callback_id: 'create-pr',
    blocks: [
      {
        label: plainText('Choose a repository'),
        block_id: 'repository',
        element: {
          placeholder: plainText('Type a repo name...'),
          action_id: 'repository',
          options: repos
            // .filter(repo => repo.permissions?.includes(user.role))
            .map(repo => ({
              text: plainText(`${repo.name} (${repo.owner}/${repo.alias})`),
              value: `${repo.owner}/${repo.alias}`,
            })),
          type: 'static_select',
        },
        hint: plainText(`If you aren't sure which repository to choose here, ask your tech lead!`),
        type: 'input',
      },
      {
        label: plainText('Name your PR'),
        block_id: 'pr_name',
        element: {
          placeholder: plainText('Type a PR name...'),
          action_id: 'pr_name',
          type: 'plain_text_input',
        },
        hint: plainText('This PR name should briefly describe the changes that you made.\nExample: Add Modals for Populating Species Data'),
        type: 'input',
      },
    ],
  });
};
  // Modal({
  //   title: "Create new PR",
  //   submit: "Create",
  //   // Define the endpoint to callback
  //   callbackId: "create-pr",
  // })
  //   .blocks(
  //     Blocks.Input({
  //       label: "What repository is the PR for?",
  //       blockId: "repository",
  //     }).element(
  //       Elements.StaticSelect({
  //         placeholder: "Choose a repository...",
  //       })
  //         .actionId("repository")
  //         .options([
  //           Bits.Option({ text: "Sample option", value: "Sample option" }),
  //         ])
  //     )
  //   )
  //   .buildToJSON();

module.exports = CreatePRModal();
