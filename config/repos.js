const perms = require("../utils/perms");
const CTC_USER = "ctc-uci";

const repos = {
  "commit-the-change-website": {
    name: "CTC Website",
    owner: CTC_USER,
    alias: "commit-the-change-website",
    permissions: [perms.ADMIN],
  },
  "find-your-anchor-backend": {
    name: "FYA Backend",
    owner: CTC_USER,
    alias: "find-your-anchor-backend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "find-your-anchor-frontend": {
    name: "FYA Frontend",
    owner: CTC_USER,
    alias: "find-your-anchor-frontend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
};

module.exports = repos;
