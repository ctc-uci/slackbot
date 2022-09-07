const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  slackId: { type: String, required: true }, // Slack user ID
  slackName: { type: String, required: true }, // Slack user name; do we want to keep track of this
  role: { type: String, required: true }, // "ADMIN" | "TECHLEAD" | "MEMBER" - defined in config/perms.js
  projects: { type: Array, required: true }, // List of assigned projects
  rep: { type: Number, required: true }, // Reputation count
});

const User = mongoose.model('User', userSchema);

module.exports = User;
