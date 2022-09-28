const UpdateProfileModal = require("../modals/UpdateProfileModal");
const User = require("../models/user.model");

const UserModel = require("../models/user.model");
const perms = require("../utils/perms");
const messages = require("../utils/msgs");

// Gets the current user from MongoDB (creates it if doesn't exist) and opens a PR to update user profile
const openUpdateProfileModal = async ({ command, ack, client }) => {
  try {
    await ack();

    // Getting user info from Mongo
    const { user_id: slackId, user_name: slackName } = command;
    let user;
    try {
      user = await UserModel.findOne({ slackId });
      if (!user) {
        await UserModel.create({
          slackId,
          slackName,
          role: perms.MEMBER,
          repos: [],
          github: '',
          rep: 0,
          matchyEnabled: false,
        });
        user = await UserModel.findOne({ slackId });
      };
    } catch (err) {
      console.log(err.message);
    }

    await client.views.open({
      trigger_id: command.trigger_id,
      view: UpdateProfileModal(user),
    });
  } catch (e) {
    client.chat.postEphemeral({
      text: messages.profile.modalFailure(e),
      channel: slackId,
    });
  }
};

// Updates user info with selected repositories, Matchy opt in, etc.
const handleUpdateProfileSubmitted = async ({
  ack,
  command,
  respond,
  view,
  body,
  client,
}) => {
  try {
    await ack();
    const { id: slackId, name: slackName } = body.user;
    const v = view.state.values;
    const selectedRepos = v.repositories.repositories.selected_options.map(
      (repo) => repo.value
    );
    const matchyEnabled = v.matchy.matchy.selected_options.length
      ? true
      : false;
    const github = v.github.github.value;
    const user = await UserModel.findOne({ slackId });
    if (!user) {
      await UserModel.create({
        slackId,
        slackName,
        role: perms.MEMBER,
        repos: selectedRepos,
        rep: 0,
        github,
        matchyEnabled,
      });
    } else {
      await UserModel.findOneAndUpdate(
        { slackId },
        {
          slackName,
          github,
          repos: selectedRepos,
          matchyEnabled,
        }
      );
      client.chat.postEphemeral({
        text: messages.profile.success,
        channel: body.user.id,
        user: body.user.id
      });
    }
  } catch (e) {
    client.chat.postEphemeral({
      text: messages.profile.failure(e),
      channel: body.user.id,
    });
  }
};

module.exports = {
  openUpdateProfileModal,
  handleUpdateProfileSubmitted,
};
