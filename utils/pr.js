const octokit = require("./octokit");
const prTemplates = require("./prTemplates");

require("dotenv").config("../");

const createRemoteBranchIfNotExists = async (values) => {
  const repository = values.repository.repository.selected_option.value;
  const [owner, repo] = repository.split("/");
  const branch = values.branch.branch.value;
  try {
    // If the branch doesn't exist, then create the branch
    await octokit.request(`GET /repos/${repository}/branches/${branch}`, {
      owner,
      repo,
      branch,
    });
  } catch (e) {
    if (e.status === 404 && e.response?.data?.message === "Branch not found") {
      // Github doesn't let us create a new PR for a branch without any extra commits
      // Therefore, we have to make an empty commit to the new branch so Github doesn't cry like a little b
      const baseRef = "heads/dev";
      const newRef = `heads/${branch}`;
      // Get the latest commit in dev to set as the base for the new branch
      const latestDevCommitSHA = (
        await octokit.request(`GET /repos/{owner}/{repo}/git/ref/{ref}`, {
          owner,
          repo,
          ref: baseRef,
        })
      ).data.object.sha;

      // Create a new branch -- will have SHA pointing to latest commit in dev
      await octokit.request(`POST /repos/{owner}/{repo}/git/refs`, {
        owner,
        repo,
        ref: `refs/${newRef}`,
        sha: latestDevCommitSHA,
      });

      // Get the tree SHA for the new branch
      const treeSHA = (
        await octokit.request(
          "GET /repos/{owner}/{repo}/git/commits/{commit_sha}",
          {
            owner,
            repo,
            commit_sha: latestDevCommitSHA,
          }
        )
      ).data.tree.sha;

      // Create an empty commit
      const emptyCommitSHA = (
        await octokit.request("POST /repos/{owner}/{repo}/git/commits", {
          owner,
          repo,
          message: `Creat a PR for branch ${branch}`,
          tree: treeSHA,
          parents: [latestDevCommitSHA],
        })
      ).data.sha;

      // Update the remote branch to point to the empty commit SHA
      await octokit.request("PATCH /repos/{owner}/{repo}/git/refs/{ref}", {
        owner,
        repo,
        ref: newRef,
        sha: emptyCommitSHA,
        force: true,
      });
    }
  }
};

const existingPRWithBranchExists = async (values) => {
  const repository = values.repository.repository.selected_option.value;
  const [owner, repo] = repository.split("/");
  const branch = values.branch.branch.value;
  const response = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
    owner,
    repo,
  });
  const existingBranchesForPRs = response.data.map((PR) => PR.head.ref);
  return (
    existingBranchesForPRs.filter((existingBranch) => existingBranch === branch)
      .length > 0
  );
};

const createPR = async (values) => {
  const repository = values.repository.repository.selected_option.value;
  const [owner, repo] = repository.split("/");
  const branch = values.branch.branch.value;
  const title = values.pr_title.pr_title.value;
  try {
    const response = await octokit.request(`POST /repos/${repository}/pulls`, {
      owner,
      repo,
      title,
      body: prTemplates.common,
      head: `${owner}:${branch}`,
      base: "dev",
    });
    return {
      repo,
      branch,
      number: response.data.number,
    };
    // TODO: RETURN AN ERROR WITH APPROPRIATE FIELDS
  } catch (e) {}
};

module.exports = {
  createRemoteBranchIfNotExists,
  existingPRWithBranchExists,
  createPR,
};
