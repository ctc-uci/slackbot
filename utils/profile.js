const UpdateProfileModal = require("../modals/UpdateProfileModal");
const User = require("../models/user.model");

const UserModel = require("../models/user.model");
const perms = require("../utils/perms");

const openUpdateProfileModal = async ({ command, ack, client, respond }) => {
  try {
    await ack();

    // // Getting user info from Mongo
    const { user_id: slackId } = command;
    let user;
    try {
      user = await UserModel.findOne({ slackId });
      console.log(user);
    } catch (err) {
      console.log(err.message);
    }

    console.log(user);

    await client.views.open({
      trigger_id: command.trigger_id,
      view: UpdateProfileModal(user),
    });
  } catch (e) {
    console.log(e);
    // await respond(messages.pr.failure(command), (response_type = "ephemeral"));
  }
};

const handleUpdateProfileSubmitted = async ({
  ack,
  view,
  body,
  respond,
  client,
}) => {
  try {
    await ack();
    console.log(body);
    const { id: slackId, name: slackName } = body;
    const v = view.state.values;
    const selectedRepos = v.repositories.repositories.selected_options.map(
      (repo) => repo.value
    );
    const matchyEnabled = v.matchy.matchy.selected_options.length
      ? true
      : false;
    user = await UserModel.findOne({ slackId });
    if (!user) {
      await UserModel.create({
        slackId,
        slackName,
        role: perms.MEMBER,
        repos: selectedRepos,
        rep: 0,
        matchyEnabled,
      });
      // Send a message indicating profile was created
    } else {
      await UserModel.findOneAndUpdate(
        { slackId },
        {
          slackName,
          repos: selectedRepos,
          matchyEnabled,
        },
        { new: true }
      );
      // Send a message indicating profile was updated successfully
    }
  } catch (e) {}
};

module.exports = {
  openUpdateProfileModal,
  handleUpdateProfileSubmitted,
};
