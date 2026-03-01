import asyncio
import os
import sys
from telegram import Bot
from github import Github
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
    branches_data = []
    for branch in branches:
        commit = branch.commit
        if commit.commit.author.date > last_day:
            active_branches.append(branch.name)
            message += f"Branch: {branch.name}\nAuthor: {commit.commit.author.name}\nMessage: {commit.commit.message}\n\n----------\n"
            code_changes = []
            try:
                tip = repo.get_commit(branch.commit.sha)
                for f in tip.files:
                    code_changes.append(f"{f.filename} ({f.status}, +{f.additions or 0} -{f.deletions or 0})")
            except Exception:
                pass
            branches_data.append({"branch": branch.name, "author": commit.commit.author.name, "message": commit.commit.message or "", "code_changes": code_changes})
    return message, active_branches, branches_data

def format_branch_history(messages):
    """Generate one short summary of code changes per branch using Gemini. Same order as input."""
    if not messages:
        return []
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return [m.get("message", "")[:80] or "(no message)" for m in messages]
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        parts = []
        for i, m in enumerate(messages):
            changes = m.get("code_changes") or []
            lines_str = "\n".join(f"- {x}" for x in changes[:30]) if changes else "(no file list)"
            parts.append(f"Branch {i+1} ({m['branch']}) — files changed:\n{lines_str}")
        prompt = "Below are the files changed per branch (filename, status, +additions -deletions). For each branch output exactly one short line summarizing what code changed in plain English (max 80 chars). Same order.\n\n" + "\n\n".join(parts)
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        text = (response.text or "").strip()
        lines = [ln.strip() for ln in text.split("\n") if ln.strip()][:len(messages)]
        while len(lines) < len(messages):
            lines.append("(summary unavailable)")
        return lines
    except Exception as e:
        print(f"Error generating summaries: {e}")
        return [m.get("message", "")[:80] or "(no message)" for m in messages]

async def send_telegram_message(token, chat_id, message):
    bot = Bot(token=token)
    await bot.send_message(chat_id=chat_id, text=message)

async def main():
    messages, active_branches, branches_data = get_repo_history(repo_name, github_token)
    if not active_branches:
        formatted_message = f"Daily Update for Repository: {repo_name}\n\nThere was no activity in the last 24 hours."
    else:
        summaries = format_branch_history(branches_data)
        details = ""
        for i, b in enumerate(branches_data):
            summary = summaries[i] if i < len(summaries) else (b.get("message", "")[:80] or "(no message)")
            details += f"Branch: {b['branch']}\nAuthor: {b['author']}\nMessage: {b['message']}\nSummary: {summary}\n\n----------\n"
        formatted_message = f"Daily Update for Repository: {repo_name}\n\nStatus for active branches in the last 24 hours:\n" + "\n\nDetails:\n" + details
    await send_telegram_message(telegram_bot_token, telegram_chat_id, formatted_message)
    print("Message sent successfully.")

asyncio.run(main())
