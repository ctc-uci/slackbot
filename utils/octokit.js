const { Octokit } = require("@octokit/core");

require("dotenv").config("../");

// Octokit.js
// https://github.com/octokit/core.js#readme
const octokit = new Octokit({
  auth: process.env.CTC_DEVOPS_PAT,
});

module.exports = octokit;
