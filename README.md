Project Board: https://github.com/orgs/clarvo-ai/projects/9/views/1

> 📖 **For project documentation including folder structure and architecture overview, see [DOCUMENTATION.md](./DOCUMENTATION.md)**

## Start the Project & Run Database Migrations & Sync Schema

```bash
# APPLY MIGRATIONS and SYNC SCHEMA (run this after you modify database schema .prisma files):
docker compose run --rm prisma-migrate && docker compose run --rm python-typegen

## SYNC INCOMING CHANGES FROM DEV
## 1. Checkout dev, pull, run migrations, install dependencies, and down all containers
git checkout dev && git pull && docker compose run --rm prisma-migrate && npm i && docker compose down

## 2. Choose the right profile to spin up:

LV-WEB (Development):
docker compose --profile lv-web up -d --build

LV-WEB (Production Build):
docker compose --profile lv-web-build up -d --build

LV-PYAPI (Python API only):
docker compose --profile lv-pyapi up -d --build

LOGS:
docker compose logs -f $(docker compose ps --services --filter "status=running")

TIP: use Docker/Containers extension in Cursor to manage containers and see logs
```

## Initializing the project with a new laptop

```bash
## Clone the repository / git pull the latest changes

## Configure .env files for each profile (currently only .env in lv-web based on .env.example)

## Install dependencies
npm i

## Initialize database
docker compose run --rm prisma-migrate

## Now the right profile to spin up can be chosen.
```

### For non-Linux machines (if facing issues)

If you encounter issues with node_modules or dependencies on non-Linux machines (Windows/macOS), you can copy the monorepo node_modules from a Linux container to your host machine:

```bash
## Copy monorepo node_modules to the host machine. This can take a while.
sudo rm -rf node_modules && docker compose run --rm container-node-modules && mv ./container_node_modules ./node_modules
```

## Running python files standalone

```bash
From the root of the desired folder we can run python files standalone by using the following command:

python -m folder.file

With python utils and lv-pyapi in the path:

PYTHONPATH=$PYTHONPATH:./packages/python-utils/src:./apps/lv-pyapi python -m folder.file

```

## Test Builds Locally

```bash
LV-WEB:
docker compose --profile lv-web build
docker exec -it lv-web npm run build

LV-WEB-BUILD (Production):
docker compose --profile lv-web-build build

```

### Adding shadcn component

Navigate to the particular app
use command

```bash
npx shadcn@latest add [COMPONENT]
```

## Connect to Database Locally

```bash
sudo docker exec -it $(docker ps -q --filter name=lv-db) psql -U postgres
```

List all tables:

```sql
\dt
```

### Python Development

Add the following to `.vscode/settings.json` after installing the Pylance extension for Python type checking and hints:

```Python
"python.analysis.inlayHints.callArgumentNames": "all",
"python.analysis.inlayHints.functionReturnTypes": true,
"python.analysis.inlayHints.pytestParameters": true,
"python.analysis.inlayHints.variableTypes": true,
"python.analysis.typeCheckingMode": "basic"
```

Pylance does not always recompute the type checking immediately, so if it shows something really suspicios, probe the file a little bit by, e.g., deleting a character and writing it back immediately to trigger a recomputation.

You can add Python-specific cursor rules (pieces of prompts) in `.cursor/rules/python-rules.mdc`, which gets applied every file matching the pattern \*.py. These can also be split into multiple different `.mdc` files that either get included in the prompt always, when matching a file pattern, when the Agent feels like its relevant or when it is manually specified.

### Git Collaboration

```bash
# 1. Create issue on GitHub Board
# 2. Add title, description, assignee(s), label (priority) and milestone
# 3. Reorder the issue to the appropriate position within its column in descending order of priority
# 4. Start working on the issue: Drag the issue to the In Progress column

# Tip: Use Github Issues extension. From there you can "Start working on issue" and it will automatically create a branch and checkout to it.
# Set this in "Github Issues: Issue Branch Title" -setting: ${user}/issue-${sanitizedIssueTitle}-${issueNumber}

# Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b user/issue-sanitizedIssueTitle-issueNumber
# Make a pull request from feature branch to dev after FIRST COMMIT to ensure visibility of the work being done.

# If conflicts before merging to dev
git checkout your-feature-branch
git pull origin dev
# Resolve conflicts and continue
# If conficts only in sqlalchemy models, run the following command during the merge
git checkout --theirs packages/python-utils/src/python_utils/sqlalchemy_models.py && git add packages/python-utils/src/python_utils/sqlalchemy_models.py && git merge --continue && docker compose run --rm prisma-migrate && docker compose run --rm python-typegen && git add packages/python-utils/src/python_utils/sqlalchemy_models.py && git commit -m "sync types" && git push

# Merge feature to dev (Squash)
Create a PR, ask for reviews, and select "Squash and merge"

# Deploy to prod
Create a PR from dev to main, ask for reviews, and select "Create a merge commit"

# Migrations done in a feature branch, PR merged to dev, and want to avoid hanging migrations in branch switch?
git fetch origin && git update-ref refs/heads/dev origin/dev
```

### Docker Cleanup

Before cleanup, ensure important projects are RUNNING on your machine. The following commands will remove all unused resources.

```bash
(Optional: check disk usage) docker system df

# Clean up unused resources
docker rmi $(docker image ls -q)
docker volume rm $(docker volume ls -q)
docker system prune
```
