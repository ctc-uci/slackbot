const { Modal, Blocks, Elements, Bits } = require("slack-block-builder");

const CreatePRModal = () => {
  return Modal({
    title: "Create new PR",
    submit: "Create",
    // Define the endpoint to callback
    callbackId: "create-pr",
  })
    .blocks(
      Blocks.Input({
        label: "What repository is the PR for?",
        blockId: "repository",
      }).element(
        Elements.StaticSelect({
          placeholder: "Choose a repository...",
        })
          .actionId("repository")
          .options([
            Bits.Option({ text: "Sample option", value: "Sample option" }),
          ])
      )
    )
    .buildToJSON();
};

module.exports = CreatePRModal();
