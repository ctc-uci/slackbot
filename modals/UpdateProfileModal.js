const repos = require("../config/repos");
const { plainText } = require("../utils/blockUtils");

const UpdateProfileModal = (user) => {
  const github = user.github;
  const initialOptions = user?.repos?.map((repo) => ({
    text: plainText(
      `${repos[repo].name} (${repos[repo].owner}/${repos[repo].alias})`
    ),
    value: `${repos[repo].alias}`,
  }));

  const repoOptions = Object.values(repos)
    .filter((repo) => repo.permissions?.includes(user.role) || initialOptions.map((i) => i.value).includes(repo.alias))
    .map((repo) => ({
      text: plainText(`${repo.name} (${repo.owner}/${repo.alias})`),
      value: `${repo.alias}`,
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
        label: plainText("Enter your Github username..."),
        block_id: "github",
        element: {
          placeholder: plainText("Enter Github username..."),
          action_id: "github",
          type: "plain_text_input",
          initial_value: github,
        },
        dispatch_action: true,
      },
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
          options: repoOptions,
          ...(initialOptions.length > 0 && { initial_options: initialOptions }),
          action_id: "repositories",
        },
        label: plainText("Select your repositories..."),
        optional: true,
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
            ...(user.matchyEnabled && {
              initial_options: [
                {
                  text: plainText("Sign me up for Matchy!"),
                  description: plainText(
                    "Matchy is an opt-in program for getting to know and meeting up with a new CTC member every week!"
                  ),
                  value: "matchy",
                },
              ],
            }),
            action_id: "matchy", // TODO Figure out why error triangle shows up after clicking this field
          },
        ],
      },
    ],
  };

  return JSON.stringify(view);
};

module.exports = UpdateProfileModal;
