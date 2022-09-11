const blockUtils = {
  image: (image_url, alt) => ({
    type: "image",
    image_url,
    alt_text: alt ?? "",
  }),
  plainText: (text) => ({ type: "plain_text", text }),
  markdownText: (text) => ({ type: "mrkdwn", text }),
};

module.exports = blockUtils;
