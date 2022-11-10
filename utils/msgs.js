const CTC_USER = "ctc-uci";

const messages = {
  issue: {
    success: (title, repo, number) =>
      `SUCCESSFULLY created issue "${title}" ${repo}: https://github.com/${CTC_USER}/${repo}/issues/${number}`,
    failure: (error) =>
      `FAILED to make an issue with error: ${error}`,
    modal: (error) => `Failed to open modal to create issue with error: ${error}`,
  },
  pr: {
    success: (repo, branch, number) =>
      `SUCCESSFULLY created a pull request for \`${branch}\` in ${repo}: https://github.com/${CTC_USER}/${repo}/pull/${number}`,
    failure: (error) =>
      `FAILED to make a pull request with error: ${error}`,
    modal: (error) => `Failed to open modal to create pull request with error: ${error}`,
    branchExists: "A pull request already exists with that branch. Please close the existing pull request or overwrite it with git push",
    invalidIssue: "Please select a valid issue.",
    emptyCommit: (branch) => `Create a pull trequest for branch ${branch}`
  },
  profile: {
    success: "Successfully updated your profile!",
    failure: (error) => `Failed to update your profile with error: ${error}`,
    modalFailure: (error) => `Failed to open modal to update profile with error: ${error}`,
  },
  matchy: {
    intro: (users) => {
      const names = '<@' + users.join('>, <@') + '>';
      return `Hey ${names}!\n\
You have been matched this week :worry-frog-cheer:\n\
Go ahead and figure out when you're all free to meet up for an in-person or virtual meeting :smile:`
    }
  }
};

module.exports = messages;
