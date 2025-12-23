import asyncio
from telegram import Bot
from github import Github
import sys
from datetime import datetime, timedelta, timezone

repo_name = sys.argv[1]
github_token = sys.argv[2]
telegram_bot_token = sys.argv[3]
telegram_chat_id = sys.argv[4]

def get_repo_history(repo_name, github_token):
    g = Github(github_token)
    repo = g.get_repo(repo_name)
    
    last_day = datetime.now(timezone.utc) - timedelta(days=1)

    branches = repo.get_branches()
    active_branches = []
    messages = []
    message = ''
    for branch in branches:
        commit = branch.commit
        if commit.commit.author.date > last_day:
            active_branches.append(branch.name)
            message += f"Branch: {branch.name}\nAuthor: {commit.commit.author.name}\nMessage: {commit.commit.message}\n\n"
            messages.append(message)

    return messages, active_branches

# prompt engineer the below ;)
def format_branch_history(messages):
    """Generate learnings from history using Gemini API"""
    try:
        prompt = (
            "Analyze the following Github commit messages and extract key insights from the last commit message"
            + "\n".join(f"- ({msg['id']}) {msg['content']}" for msg in messages)
            + "\n\n"
            "Return the output as an array, where each element contains 'Author', 'Date', 'Message'. In this context the Message is the insight that is derived from the commit message."
            'If no insights can be derived, return an empty list.'
        )
        
        generation_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=generation_config
        )

        learnings_list = [
            {"content": l["text"], "ids": l["message_ids"]}
            for l in response.parsed.get("learnings", [])
        ]

        return learnings_list
    except Exception as e:
        print(f"Error generating learnings: {str(e)}")
        return []

async def send_telegram_message(token, chat_id, message):
    bot = Bot(token=token)
    await bot.send_message(chat_id=chat_id, text=message)

async def main():
    messages, active_branches = get_repo_history(repo_name, github_token)
    formatted_message = f"Daily Update for Repository: {repo_name}\n\nActive Branches in the last 24 hours:\n\n" + "\n".join(active_branches) + "\n\nDetails:\n" + "\n".join(messages)

    await send_telegram_message(telegram_bot_token, telegram_chat_id, formatted_message)
    print("Message sent successfully.")

asyncio.run(main())
