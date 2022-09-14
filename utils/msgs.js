const CTC_USER = "ctc-uci";

const messages = {
  pr: {
    success: (repo, branch, number) =>
      `SUCCESSFULLY created a PR for \`${branch}\` in ${repo}: https://github.com/${CTC_USER}/${repo}/pull/${number}`,
    failure: (error) =>
      `FAILED to make a PR with error: ${error}`,
    modal: (error) => `Failed to open modal to create PR with error: ${error}`,
    branchExists: "A PR already exists with that branch. Please close the existing PR or overwrite it with git push",
    invalidIssue: "Please select a valid issue.",
    emptyCommit: (branch) => `Create a PR for branch ${branch}`
  },
  profile: {
    success: "Successfully updated your profile!",
    failure: (error) => `Failed to update your profile with error: ${error}`,
    modalFailure: (error) => `Failed to open modal to update profile with error: ${error}`,
  }
};

module.exports = messages;
