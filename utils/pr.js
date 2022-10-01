const octokit = require("./octokit");
const prTemplates = require("./prTemplates");

const CreatePRModal = require("../modals/CreatePRModal");
const UserModel = require("../models/user.model");
const messages = require("./msgs");

require("dotenv").config("../");

const owner = 'ctc-uci';

// Gets the current user from MongoDB and opens a modal to create a PR with
// Used when the user submits the PR command
const openCreatePRModal = async ({ command, ack, client }) => {
  await ack();
  const { user_id: slackId } = command;
  try {
    let user;
    try {
      user = await UserModel.findOne({ slackId });
    } catch (err) {
      console.log(err.message);
    }

    await client.views.open({
      trigger_id: command.trigger_id,
      view: await CreatePRModal(user),
    });
  } catch (e) {
    client.chat.postEphemeral({
      text: messages.pr.modal(e),
      channel: slackId,
    });
  }
};

// A helper function to update the issues dropdown in the CreatePRModal whenever a different repository is selected
const updateIssueOptions = async ({ client, ack, body }) => {
  await ack();
  let user;
  try {
    user = await UserModel.findOne({ slackId: body.user.id });
  } catch (err) {
    console.log(err.message);
  }

  const repo = body.view.state.values.repository.repository.selected_option.value;

  await client.views.update({
    view_id: body.view.id,
    trigger_id: body.trigger_id,
    view: await CreatePRModal(user, repo),
  })
}

// A helper function to create a remote branch (reference) if the submitted PR branch doesn't exist on remote
// The function creates an empty commit because Github doesn't let you create a PR for a branch with no extra commits
const createRemoteBranchIfNotExists = async (values) => {
  const repo = values.repository.repository.selected_option.value;
  const branch = values.branch.branch.value;
  try {
    // If the branch doesn't exist, then create the branch
    await octokit.request(`GET /repos/{owner}/{repo}/branches/${branch}`, {
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
          message: messages.pr.emptyCommit(branch),
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

// Helper function that returns a boolean indicating whether a PR for the submitted branch exists
const existingPRWithBranchExists = async (values) => {
  const repo = values.repository.repository.selected_option.value;
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

// Helper function to creates the PR from the submitted branch with the submitted title
// Called after user input is validated on the CreatePRModal form
const createPR = async (values) => {
  const repo = values.repository.repository.selected_option.value;
  const branch = values.branch.branch.value;
  const title = values.pr_title.pr_title.value;
  const issueNumber = values[`${repo}/issue`].issue.selected_option.value;
  const issueInfo = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
    owner,
    repo,
    issue_number: issueNumber,
  })
  const assignees = issueInfo.data.assignees.map(assignee => assignee.login);
  const pr = await octokit.request(`POST /repos/{owner}/{repo}/pulls`, {
    owner,
    repo,
    title,
    body: prTemplates.common(issueNumber),
    head: `${owner}:${branch}`,
    base: "dev",
  });
  const prNumber = pr.data.number;
  // Set PR properties equal to original issue properties
  await octokit.request('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
    owner,
    repo,
    issue_number: prNumber,
    assignees,
    milestone: issueInfo.data.milestone,
    labels: issueInfo.data.labels,
  })
  return {
    repo,
    branch,
    prNumber,
  };
};

// Function called to validate user input and create a PR with submitted values
// Called when the user submits the CreatePRModal form
const handleCreatePRSubmitted = async ({
  ack,
  view,
  body,
  client,
}) => {
  try {
    const ackErrors = { response_action: "errors", errors: {} };
    // Make sure that there isn't an existing PR from the desired branch
    const PRWithBranchExists = await existingPRWithBranchExists(
      view.state.values
    );
    if (PRWithBranchExists) {
      ackErrors.errors.branch = messages.pr.branchExists;
    }
    // Make sure the selected issue isn't -1 (default option)
    const repository = view.state.values.repository.repository.selected_option.value;
    const issue = view.state.values[`${repository}/issue`].issue.selected_option.value;
    if (issue === '-1') {
      ackErrors.errors[`${repository}/issue`] = messages.pr.invalidIssue;
    }
    // If there are any errors, inform the user
    if (PRWithBranchExists || issue == '-1') {
      await ack(ackErrors);
    } else {
      await ack();
    }
    // If the branch doesn't exist in the remote repository
    // 1. Make the new branch
    // 2. Make an empty commit on the new branch
    await createRemoteBranchIfNotExists(view.state.values);
    // Create the PR
    const values = await createPR(view.state.values);
    client.chat.postMessage({
      text: messages.pr.success(values.repo, values.branch, values.prNumber),
      channel: body.user.id,
    });
  } catch (e) {
    // When ack responds with errors, e is undefined
    if (e !== undefined) {
      client.chat.postEphemeral({
        text: messages.pr.failure(e),
        channel: body.user.id,
        user: body.user.id,
      });
    }
  }
};

module.exports = {
  openCreatePRModal,
  updateIssueOptions,
  handleCreatePRSubmitted,
};
