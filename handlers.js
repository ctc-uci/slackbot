/**
 * Registers all Slack command and event handlers.
 * Import this module to ensure handlers are registered before handling requests.
 */
const Bot = require("./utils/bot");
const {
  addUserToMatchy,
  loadMembersDataCommand,
  ensure,
  skipNextMatchyWeek,
  toggleMatchyPause,
} = require("./utils/matchy-json");

// Register slash command handlers
Bot.command("/profile", loadMembersDataCommand);
Bot.command("/matchy", addUserToMatchy);
Bot.command("/issue", ensure);
Bot.command("/pr", toggleMatchyPause);
Bot.command("/clear", skipNextMatchyWeek);
