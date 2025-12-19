Project Board: https://github.com/orgs/clarvo-ai/projects/9/views/1

Retro Board: https://www.figma.com/board/R6PzwUSjbwYNWdy1eFeJ6n/LVP-Retro?node-id=0-1&p=f

> 📖 **For project documentation including folder structure and architecture overview, see [DOCUMENTATION.md](./DOCUMENTATION.md)**



# How to Run the Project Locally

## 1. Prerequisites

- Docker Desktop
- Node.js v18+
- npm (comes with Node.js; npm 10+ recommended)
- Python 3.11

## 2. Install Dependencies

_(run only during first-time setup or after dependency changes)_

Run the following command in the root folder:

```bash
npm i
```

## 3. Apply Database Migrations

_(run during first-time setup or whenever Prisma schema changes)_

```bash
docker compose run --rm prisma-migrate
docker compose run --rm python-typegen
```

## 4. Start the Development Environment

```bash
docker compose --profile lv-web up -d --build
```

## 5. Access the Web App

Access the local web application at:

```
http://localhost:3045
```

# Testing

## Unit Testing - Backend

All backend tests should be run using the Docker test environment. This runs pytest inside the configured test container with the correct environment variables.

1. Prepare the test DB (root folder)

```bash
docker compose --profile tests down -v
docker compose --profile tests up -d test-postgres
docker compose --profile tests run --rm test-migrate
```
2. Run the tests (root folder)

```bash
docker compose --profile tests run --rm test-runner
```

## Unit Testing - Frontend
1. Navigate into the correct directory
```bash
cd apps/lv-web
```

2. Install dependencies (if not already done)
```bash
npm install
```

3. Run the tests
```bash
npm test
```

## Functional Testing of the DB

1. Start local:

   ```bash
   docker compose --profile lv-web up -d --build
   ```

2. Send messages in the chat UI

3. Connect to DB 
```bash
sudo docker exec -it $(docker ps -q --filter name=lv-db) psql -U postgres
```
Once connected, you can use:

- `\dt` - list tables

4. Run:

   ```sql
   SELECT * FROM "ConversationMessage" ORDER BY "createdAt" DESC LIMIT 10;
   ```

5. Verify both user and AI messages appear

# Additional Information

## 1. Sync Incoming Changes from dev

```bash
git checkout dev
git pull
docker compose run --rm prisma-migrate
npm i
docker compose down
```

## 2. Docker Profiles

**LV-WEB (Development):**

```bash
docker compose --profile lv-web up -d --build
```

**LV-WEB (Production Build):**

```bash
docker compose --profile lv-web-build up -d --build
```


## Running lv-web Without Docker

For faster frontend development:

### One-time Setup

1. Create `apps/lv-web/.env.local` with:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:3772/postgres
DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:3772/postgres
```

2. Regenerate Prisma for Mac:

```bash
rm -rf packages/database/prisma/generated
cd packages/database/prisma && npx prisma generate
cd ../../..
```

### Running

```bash
# Start database (run from project root)
docker compose --profile lv-web up db -d

# Start app
npm run dev:lv-web -- --port=3045
```

Open http://localhost:3045

## Test Builds Locally

**LV-PYAPI (Python API only):**


```bash
docker compose --profile lv-pyapi up -d --build
```
LOGS:
```bash
docker compose logs -f $(docker compose ps --services --filter "status=running")
```
TIP: use Docker/Containers extension in Cursor to manage containers and see logs

## 3. Initial Setup on a New Laptop

1. Clone repository or pull latest changes

2. Create .env files (`apps/lv-web/.env` and `apps/lv-pyapi/.env`)

3. Install dependencies:

   ```bash
   npm i
   ```

4. Initialize database:

   ```bash
   docker compose run --rm prisma-migrate
   ```

5. Start correct profile (usually LV-WEB)

## 4. Troubleshooting: Fixing node_modules on macOS/Windows (Non-Linux Issue)

If Docker complains or node_modules mismatch occurs:

```bash
sudo rm -rf node_modules
docker compose run --rm container-node-modules
mv ./container_node_modules ./node_modules
```

## 5. Test Builds Locally

### LV-WEB

```bash
docker compose --profile lv-web build
docker exec -it lv-web npm run build
```

### LV-WEB-BUILD (Production)

```bash
docker compose --profile lv-web-build build
```

## Testing

We use Jest and React Testing Library for unit and component testing.

### Running Tests

To run the test suite, go to `apps/lv-web` and run:

```bash
npm test
```

To run tests in watch mode (interactive):

```bash
npm run test:watch
```

### Writing Tests

- Place test files in `src/__tests__` or colocated with components (e.g., `component.test.tsx`).
- Use the `.test.tsx` or `.spec.tsx` extension.
- We use `jest-environment-jsdom` for component tests.

## 6. Adding a shadcn Component

Inside the LV-WEB app folder:

```bash
npx shadcn@latest add [COMPONENT]
```

## 7. Python Development (VS Code Recommended Settings)

Add to `.vscode/settings.json`:

```Python
"python.analysis.inlayHints.callArgumentNames": "all",
"python.analysis.inlayHints.functionReturnTypes": true,
"python.analysis.inlayHints.pytestParameters": true,
"python.analysis.inlayHints.variableTypes": true,
"python.analysis.typeCheckingMode": "basic"
```

If Pylance gets stuck, modify a character to trigger recomputation.

Cursor-specific Python instructions belong in:

`.cursor/rules/python-rules.mdc`

## 8. Git Collaboration Workflow

### Create Issue

- Add title, description, assignee, labels, milestone
- Reorder by priority
- Drag to In Progress when starting

### Create Feature Branch

```bash
git checkout dev
git pull origin dev
git checkout -b user/issue-sanitizedIssueTitle-issueNumber
```

After first commit, open a PR to dev.

### Resolve Merge Conflicts

```bash
git checkout your-feature-branch
git pull origin dev
```

**Special case: SQLAlchemy model conflicts**

```bash
git checkout --theirs packages/python-utils/src/python_utils/sqlalchemy_models.py
git add packages/python-utils/src/python_utils/sqlalchemy_models.py
git merge --continue
docker compose run --rm prisma-migrate
docker compose run --rm python-typegen
git add packages/python-utils/src/python_utils/sqlalchemy_models.py
git commit -m "sync types"
git push
```

### Merge Strategy

Merge feature to dev (Squash)
- Create a PR, ask for reviews, and select "Squash and merge"

Deploy to prod
- Create a PR from dev to main, ask for reviews, and select "Create a merge commit"


### Fix Hanging Migrations When Switching Branches

```bash
git fetch origin && git update-ref refs/heads/dev origin/dev
```

## 9. Docker Cleanup

**Make sure important projects are RUNNING before cleanup.**

Check disk usage:

```bash
docker system df
```

Remove unused:

```bash
docker rmi $(docker image ls -q)
docker volume rm $(docker volume ls -q)
docker system prune
```
