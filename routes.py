from __main__ import app, client
from flask import request, Response
import sys
sys.path.append('./utils/pr')
from create import create_pr

# Creates a PR with command '/pr branch pr-name'
@app.route('/create-pr', methods=['POST'])
def create_pr_route():
    # Get request information
    data = request.form
    # 'text' field contains provided parameters
    parameters = data.get('text').split(' ')
    try:
        # Try to create the PR
        create_pr('find-your-anchor-frontend', parameters[0], parameters[1])
    except Exception as e:
        print(e)
        # On failure, DM the person who submitted the pr command
        client.chat_postMessage(channel=data.get('user_id'), text=f"FAILED to make a PR with the command \n`/pr {data.get('text')}`\n\
Please verify that \n\
1. Your command was submitted in the form `/pr branch name_of_pr`\n\
2. Your branch name is correct.\n\
3. Your branch exists on remote (ie git push BEFORE submitting this PR command)")
        return Response(), 500
    # On success, DM the user who submitted the pr command
    client.chat_postMessage(channel=data.get('user_id'), text=f"SUCCESSFULLY created a PR with the command\n`/pr {data.get('text')}`")
    return Response(), 200