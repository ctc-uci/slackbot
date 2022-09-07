const perms = require('../utils/perms');
const CTC_USER = 'ctc-uci';

const repoSort = (repo1, repo2) => repo1.name.localeCompare(repo2.name);

const repos = [
    {
        name: 'FYA Backend',
        owner: CTC_USER,
        alias: 'find-your-anchor-backend',
        permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
    },
    {
        name: 'FYA Frontend',
        owner: CTC_USER,
        alias: 'find-your-anchor-frontend',
        permissions: [perms.ADMIN, perms.TECHLEAD, perms.MEMBER],
    },
    {
        name: 'CTC Website',
        owner: CTC_USER,
        alias: 'commit-the-change-website',
        permissions: [perms.ADMIN],
    },
].sort(repoSort);

module.exports = repos;