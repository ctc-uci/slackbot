const perms = require("../utils/perms");
const CTC_USER = "ctc-uci";

/* old repos
  "abound-food-care-backend": {
    name: "AFC Backend",
    owner: CTC_USER,
    alias: "abound-food-care-backend",
    permissions: [perms.ADMIN, perms.TECHLEAD],
  },
  "abound-food-care-frontend": {
    name: "AFC Frontend",
    owner: CTC_USER,
    alias: "abound-food-care-frontend",
    permissions: [perms.ADMIN, perms.TECHLEAD],
  },
  "cell-dogs-backend": {
    name: "CDS Backend",
    owner: CTC_USER,
    alias: "cell-dogs-backend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "cell-dogs-frontend": {
    name: "CDS Frontend",
    owner: CTC_USER,
    alias: "cell-dogs-frontend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "find-your-anchor-backend": {
    name: "FYA Backend",
    owner: CTC_USER,
    alias: "find-your-anchor-backend",
    permissions: [perms.ADMIN],
  },
  "find-your-anchor-frontend": {
    name: "FYA Frontend",
    owner: CTC_USER,
    alias: "find-your-anchor-frontend",
    permissions: [perms.ADMIN],
  },
  "get-inspired-backend": {
    name: "GSP Backend",
    owner: CTC_USER,
    alias: "get-inspired-backend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "get-inspired-frontend": {
    name: "GSP Frontend",
    owner: CTC_USER,
    alias: "get-inspired-frontend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "oc-habitats-frontend": {
    name: "OCH Frontend",
    owner: CTC_USER,
    alias: "oc-habitats-frontend",
    permissions: [perms.ADMIN],
  },
  "oc-habitats-backend": {
    name: "OCH Backend",
    owner: CTC_USER,
    alias: "oc-habitats-backend",
    permissions: [perms.ADMIN],
  },
  "patriots-and-paws-frontend": {
    name: "PNP Frontend",
    owner: CTC_USER,
    alias: "patriots-and-paws-frontend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "patriots-and-paws-backend": {
    name: "PNP Backend",
    owner: CTC_USER,
    alias: "patriots-and-paws-backend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "the-literacy-project-frontend": {
    name: "TLP Frontend",
    owner: CTC_USER,
    alias: "the-literacy-project-frontend",
    permissions: [perms.ADMIN],
  },
  "the-literacy-project-backend": {
    name: "TLP Backend",
    owner: CTC_USER,
    alias: "the-literacy-project-backend",
    permissions: [perms.ADMIN],
  },
*/

/* Pending
*/
const repos = {
  "commit-the-change-website": {
    name: "CTC Website",
    owner: CTC_USER,
    alias: "commit-the-change-website",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "stand-up-to-trash-frontend": {
    name: "S2T Frontend",
    owner: CTC_USER,
    alias: "stand-up-to-trash-frontend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "stand-up-to-trash-backend": {
    name: "S2T Backend",
    owner: CTC_USER,
    alias: "stand-up-to-trash-backend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "aiss-frontend": {
    name: "AISS Frontend",
    owner: CTC_USER,
    alias: "aiss-frontend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "aiss-backend": {
    name: "AISS Backend",
    owner: CTC_USER,
    alias: "aiss-backend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "fph-frontend": {
    name: "FPH Frontend",
    owner: CTC_USER,
    alias: "fph-frontend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "fph-backend": {
    name: "FPH Backend",
    owner: CTC_USER,
    alias: "fph-backend",
    permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
  },
  "slackbot-playground": {
    name: "Slackbot Playground",
    owner: CTC_USER,
    alias: "slackbot-playground",
    permissions: [perms.ADMIN, perms.TECHLEAD],
  }
};

module.exports = repos;
