const UpdateProfileModal = require("../modals/UpdateProfileModal");

const UserModel = require("../models/user.model");

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
    console.log(view.state.values);
  } catch (e) {}
};

module.exports = {
  openUpdateProfileModal,
  handleUpdateProfileSubmitted,
};
