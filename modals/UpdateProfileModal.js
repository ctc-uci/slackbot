const repos = require("../config/repos");
const { plainText } = require("../utils/blockUtils");

const UpdateProfileModal = (user) => {
  const initialOptions = user?.repos?.map((repo) => ({
    text: plainText(
      `${repos[repo].name} (${repos[repo].owner}/${repos[repo].alias})`
    ),
    value: `${repos[repo].owner}/${repos[repo].alias}`,
  }));

  const repoOptions = Object.values(repos).map((repo) => ({
    text: plainText(`${repo.name} (${repo.owner}/${repo.alias})`),
    value: `${repo.owner}/${repo.alias}`,
  }));

  const view = {
    type: "modal",
    title: plainText("My Profile"),
    submit: plainText("Submit"),
    close: plainText("Cancel"),
    callback_id: "update-profile",
    blocks: [
      {
        type: "input",
        block_id: "repositories",
        element: {
          type: "multi_static_select",
          placeholder: {
            type: "plain_text",
            text: "Select one or more repositories...",
            emoji: true,
          },
          initial_options: initialOptions,
          options: repoOptions,
          action_id: "repositories",
        },
        label: plainText("Select repositories..."),
      },
      {
        type: "actions",
        block_id: "matchy",
        elements: [
          {
            type: "checkboxes",
            options: [
              {
                text: plainText("Sign me up for Matchy!"),
                description: plainText(
                  "Matchy is an opt-in program for getting to know and meeting up with a new CTC member every week!"
                ),
                value: "matchy",
              },
            ],
            action_id: "matchy",
          },
        ],
      },
    ],
  };

  if (user.matchyEnabled) {
    view.blocks[1].elements[0].initial_options = [
      {
        text: plainText("Sign me up for Matchy!"),
        description: plainText(
          "Matchy is an opt-in program where you'll be able to meet and hang out with a new CTC member every week!"
        ),
        value: "matchy",
      },
    ];
  }

  return JSON.stringify(view);
};

module.exports = UpdateProfileModal;
