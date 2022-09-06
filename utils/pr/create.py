import requests
import json
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path('.') / '../../.env'
load_dotenv(dotenv_path=env_path)

# TODO
# 1. Replace the Personal Access Token with a common CTC one

# USER = 'ctc-uci'
USER = 'ctc-uci'

PR_TEMPLATE = "Authors:\n \
### What does this PR contain?\n \
### How did you test these changes?\n \
### Attach images (if applicable)"

"""
Creates a PR in a repository given the repo, title, and branch names
**IMPORTANT:
    1. The branch name MUST exist on remote (ie git push before running this command)
    2. There must not exist another PR with the same source branch currently open
:param repo: name of the repository to create a PR for
:param title: title to give the PR
:param branch: source branch of the PR
"""
def create_pr(repo, branch, title):
    headers = {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Authorization': f"Bearer {os.environ['CTC_DEVOPS_PAT']}",
        'Content-Type': 'application/x-www-form-urlencoded',
    }

    data = json.dumps({
        'title': title,
        'body': PR_TEMPLATE,
        'head': f'{USER}:{branch}',
        'base': 'dev'
    })

    requests.post(f'https://api.github.com/repos/{USER}/{repo}/pulls', headers=headers, data=data)

# if __name__ == '__main__':
#     createPR('find-your-anchor-frontend', 'Greatness', 'cy-aa-flex')
