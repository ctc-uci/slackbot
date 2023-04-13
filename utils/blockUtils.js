const blockUtils = {
  image: (image_url, alt) => ({
    type: "image",
    image_url,
    alt_text: alt ?? "",
  }),
  plainText: (text) => ({ type: "plain_text", text: text.substring(0, 75) }),
  markdownText: (text) => ({ type: "mrkdwn", text: text.substring(0, 75) }),
};

module.exports = blockUtils;
