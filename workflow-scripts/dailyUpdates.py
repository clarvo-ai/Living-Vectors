"""
Daily update: lists branches with commits in the last 24h, sends a Telegram message
with Branch / Author / Message and a one-line code-change Summary (via Gemini).
"""
import asyncio
import os
import re
import sys
from datetime import datetime, timedelta, timezone

from github import Github
from telegram import Bot

# CLI args (from GitHub Action)
repo_name = sys.argv[1]
github_token = sys.argv[2]
telegram_bot_token = sys.argv[3]
telegram_chat_id = sys.argv[4]

SEP = "────────────"
MAX_SUMMARY_LEN = 80


def get_repo_history(repo_name, github_token):
    """Branches with commits in last 24h. Returns (legacy_message, active_branches, branches_data)."""
    g = Github(github_token)
    repo = g.get_repo(repo_name)
    since = datetime.now(timezone.utc) - timedelta(days=1)

    active_branches = []
    message = ""
    branches_data = []

    for branch in repo.get_branches():
        commit = branch.commit
        if commit.commit.author.date <= since:
            continue

        author = commit.commit.author.name
        msg_text = commit.commit.message or ""
        active_branches.append(branch.name)
        message += f"Branch: {branch.name}\nAuthor: {author}\nMessage: {msg_text}\n\n----------\n"

        code_changes = []
        try:
            tip = repo.get_commit(branch.commit.sha)
            for f in tip.files:
                code_changes.append(f"{f.filename} ({f.status}, +{f.additions or 0} -{f.deletions or 0})")
        except Exception:
            pass

        branches_data.append({
            "branch": branch.name,
            "author": author,
            "message": msg_text,
            "code_changes": code_changes,
        })

    return message, active_branches, branches_data


def _fallback_summary(b):
    return (b.get("message", "")[:MAX_SUMMARY_LEN] or "(no message)")


def _strip_branch_prefix(line):
    return re.sub(r"^Branch\s*\d+\s*[:\-]\s*", "", line, flags=re.IGNORECASE).strip() or line


def format_branch_history(branches_data):
    """One short code-change summary per branch (Gemini). Same order as branches_data."""
    if not branches_data:
        return []

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return [_fallback_summary(b) for b in branches_data]

    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        parts = []
        for i, b in enumerate(branches_data):
            changes = b.get("code_changes") or []
            lines_str = "\n".join(f"- {x}" for x in changes[:30]) if changes else "(no file list)"
            parts.append(f"Branch {i+1} ({b['branch']}) — files changed:\n{lines_str}")

        prompt = (
            "Below are the files changed per branch (filename, status, +additions -deletions). "
            "For each branch output exactly one short line (plain English, max 80 chars) that says WHAT HAPPENED so someone understands the change. "
            "Use a standup/release-note level: e.g. 'Summary now based on changed files', 'Added end call button that saves session details', 'Fixed login redirect'. "
            "Concrete and clear, no vague words like 'enhanced' or 'improved' without saying what. "
            "Same order. Do NOT include 'Branch N' or any branch number — only the summary text.\n\n"
            + "\n\n".join(parts)
        )
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        text = (response.text or "").strip()
        raw = [ln.strip() for ln in text.split("\n") if ln.strip()][: len(branches_data)]
        lines = [_strip_branch_prefix(ln) for ln in raw]
        while len(lines) < len(branches_data):
            lines.append("(summary unavailable)")
        return lines
    except Exception as e:
        print(f"Error generating summaries: {e}")
        return [_fallback_summary(b) for b in branches_data]


async def send_telegram_message(token, chat_id, message):
    bot = Bot(token=token)
    await bot.send_message(chat_id=chat_id, text=message)


def build_message(repo_name, branches_data, summaries):
    """Build the Telegram body (with or without activity)."""
    if not branches_data:
        return f"Daily Update — {repo_name}\n\nThere was no activity in the last 24 hours."

    details = ""
    for i, b in enumerate(branches_data):
        summary = summaries[i] if i < len(summaries) else _fallback_summary(b)
        details += f"{SEP}\nBranch: {b['branch']}\nAuthor: {b['author']}\nMessage: {b['message']}\n\nSummary: {summary}\n\n"
    return f"Daily Update — {repo_name}\n\nActive branches (last 24h)\n\nDetails\n{details}{SEP}"


async def main():
    _, active_branches, branches_data = get_repo_history(repo_name, github_token)
    summaries = format_branch_history(branches_data) if branches_data else []
    formatted_message = build_message(repo_name, branches_data, summaries)
    await send_telegram_message(telegram_bot_token, telegram_chat_id, formatted_message)
    print("Message sent successfully.")



if __name__ == "__main__":
    asyncio.run(main())
