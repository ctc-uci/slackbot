const prTemplates = {
  common: (issue) => `Authors:\n \
### What does this PR contain?\n \
### How did you test these changes?\n \
### Attach images (if applicable)\n \
Closes #${issue}`,
  blank: ``,
};

const issueTemplates = {
  common: `## Overview
- 

## Notes
- 

## Acceptance Criteria
- 

## Resources
- 

### As always, feel free to pm  or  on Slack for support`
}

module.exports = { prTemplates, issueTemplates };
