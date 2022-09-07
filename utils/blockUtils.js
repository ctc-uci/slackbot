const blockUtils = {
    plainText: text => ({type: 'plain_text', text}),
    markdownText: text => ({type: 'mrkdwn', text}),
};

module.exports = blockUtils;