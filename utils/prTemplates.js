const prTemplates = {
  common: (issue) => `Authors:\n \
### What does this PR contain?\n \
### How did you test these changes?\n \
### Attach images (if applicable)\n \
Closes #${issue}`,
  blank: ``,
};

module.exports = prTemplates;
