const CTC_USER = "ctc-uci";

const messages = {
  pr: {
    success: (repo, branch, number) =>
      `SUCCESSFULLY created a PR for \`${branch}\` in ${repo}: https://github.com/${CTC_USER}/${repo}/pull/${number}`,
    failure: (command) =>
      `FAILED to make a PR with the command \n\`/pr ${command.text}\`\n\
            Please verify that \n\
            1. Your command was submitted in the form \`/pr branch name_of_pr\`\n\
            2. Your branch name is correct.\n\
            3. Your branch exists on remote (ie git push BEFORE submitting this PR command)`,
  },
};

module.exports = messages;
