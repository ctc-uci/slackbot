const CTC_USER = "ctc-uci";

const messages = {
  pr: {
    success: (repo, branch, number) =>
      `SUCCESSFULLY created a PR for \`${branch}\` in ${repo}: https://github.com/${CTC_USER}/${repo}/pull/${number}`,
    failure: (command, error) =>
      `FAILED to make a PR with the command \n\`/pr ${command.text}\`\nError:${error}`,
    modal: (error) => `Failed to open modal to create PR with error: ${error}`
  },
  profile: {
    success: "Successfully updated your profile!",
    failure: (error) => `Failed to update your profile with error: ${error}`,
    modalFailure: (error) => `Failed to open modal to update profile with error: ${error}`,
  }
};

module.exports = messages;
