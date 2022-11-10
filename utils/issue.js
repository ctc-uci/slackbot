const octokit = require("./octokit");
const messages = require("./msgs");
const { issueTemplates } = require("./templates");

const UserModel = require("../models/user.model");

const CreateIssueModal = require("../modals/CreateIssueModal");

const owner = 'ctc-uci';

const openCreateIssueModal = async ({ command, ack, client }) => {
    await ack();
    const { user_id: slackId } = command;
    try {
        let user;
        try {
            user = await UserModel.findOne({ slackId });
            if (!user) {
                await UserModel.create({
                    slackId,
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
            view: await CreateIssueModal(user),
        })
    } catch (e) {
        client.chat.postEphemeral({
            text: messages.issue.modal(e),
            channel: slackId,
            user: slackId,
        });
    }
}

const handleCreateIssueSubmitted = async ({
    ack,
    view,
    body,
    client,
}) => {
    await ack();
    try {
        const repo = view.state.values.issue_repository.issue_repository.selected_option.value;
        const title = view.state.values.issue_title.issue_title.value;
        const issue = await octokit.request('POST /repos/{owner}/{repo}/issues', {
            owner,
            repo,
            title,
            body: issueTemplates.common,
        });
        client.chat.postMessage({
            text: messages.issue.success(title, repo, issue.data.number),
            channel: body.user.id,
        })
    } catch (e) {
        if (e !== undefined) {
            client.chat.postEphemeral({
                text: messages.issue.failure(e),
                channel: body.user.id,
                user: body.user.id,
            });
        }
    }
}

module.exports = { openCreateIssueModal, handleCreateIssueSubmitted }