# LiveKit Agent Deployment Guide

## Local Development

The agent runs automatically via Docker Compose for local development.

1. **Ensure `.env.local` exists with your credentials:**
   ```bash
   # In apps/lv-pyapi/
   cp .env.example .env.local
   ```

2. **Update `.env.local` with your local credentials:**
   - Add your Gemini API key
   - Use default LiveKit local server settings (already configured)

3. **Run the full stack including the agent:**
   ```bash
   # From project root
   docker compose --profile lv-web up
   ```

   The `lv-agent` service in docker-compose.yml will automatically:
   - Run `agent.py`
   - Connect to the local LiveKit server (`livekit` service)
   - Use environment variables from `.env.local`

## Production Deployment to LiveKit Cloud

### Prerequisites

- LiveKit Cloud account: https://cloud.livekit.io/
- LiveKit CLI installed: `curl -sSL https://get.livekit.io/cli | bash`

### Step 1: Set Up LiveKit Cloud Project

1. Sign up/login to LiveKit Cloud
2. Create a new project
3. Go to **Settings → Keys** and copy:
   - LiveKit URL (e.g., `wss://your-project.livekit.cloud`)
   - API Key
   - API Secret

### Step 2: Configure Production Environment

1. **Create production environment file (LOCAL ONLY - NOT COMMITTED):**
   ```bash
   cp .env.example .env.production
   ```

2. **Update `.env.production` with production credentials:**
   ```env
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your-production-api-key
   LIVEKIT_API_SECRET=your-production-api-secret
   LIVEKIT_AGENT_NAME=lv-voice-agent
   GEMINI_API_KEY=your-production-gemini-api-key
   ```

   ⚠️ **IMPORTANT**: `.env.production` is gitignored and should NEVER be committed to the repository.

### Step 3: Configure LiveKit CLI

```bash
lk project add production \
  --url wss://your-project.livekit.cloud \
  --api-key your-api-key \
  --api-secret your-api-secret \
  --default
```

### Step 4: Deploy the Agent

Use the **agents** directory (it contains `Dockerfile`, `livekit.toml`, and `requirements.txt`). Recent `lk` versions (e.g. 2.16+) no longer use `--env-file` / `--dockerfile` on `update`; they use **`--secrets-file`** and a separate **`deploy`** command for new images.

**First-time create** (from `apps/lv-pyapi/agents`):

```bash
cd apps/lv-pyapi/agents

lk agent create --project YOUR_PROJECT_NAME --secrets-file ../.env.production
```

**Deploy a new build** (after code or Dockerfile changes):

```bash
cd apps/lv-pyapi/agents

lk agent deploy --project YOUR_PROJECT_NAME --secrets-file ../.env.production
```

**Refresh secrets only** (restarts the agent; no new image):

```bash
cd apps/lv-pyapi/agents

lk agent update --project YOUR_PROJECT_NAME --secrets-file ../.env.production
```

`YOUR_PROJECT_NAME` is the name you used with `lk project add` (see `lk project list`). Omit `--project` if you marked one project as default.

The secrets file is **`KEY=value` lines** (dotenv-style). If the CLI rejects comments or blank lines, use `--ignore-empty-secrets` or a minimal file with only the keys the agent needs.

### Step 5: Update Frontend Configuration

Ensure your Cloud Run frontend (lv-web) uses the same LiveKit Cloud credentials:

```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-production-api-key
LIVEKIT_API_SECRET=your-production-api-secret
```

Deploy these as Cloud Run environment variables (NOT in a committed file).

### Step 6: Verify Deployment

```bash
# Check agent status
lk agent list

# View agent logs
lk agent logs lv-voice-agent

# Test from your production frontend
# Navigate to the interview page and start a call
```

## Architecture

```
[Cloud Run Frontend (lv-web)]
  Uses: wss://your-project.livekit.cloud
        ↓
  Generates token via /api/livekit/token
        ↓
[LiveKit Cloud]
        ↓
[Agent (LiveKit Cloud Hosted)]
  Connects to: wss://your-project.livekit.cloud
        ↓
[Gemini API]
```

## Security Best Practices

✅ **DO:**
- Keep `.env.production` local only
- Use LiveKit Cloud's secret management
- Set production secrets via environment variables in Cloud Run
- Use different API keys for development and production

❌ **DON'T:**
- Commit any `.env*` files with real credentials
- Hardcode secrets in code
- Share production credentials in chat/email
- Use production credentials for local development

## Troubleshooting

### Agent not connecting
- Verify `LIVEKIT_URL` starts with `wss://` (not `ws://`)
- Check API credentials are correct
- Review agent logs: `lk agent logs lv-voice-agent`

### Frontend can't connect to agent
- Ensure frontend and agent use the same LiveKit Cloud URL
- Verify token generation endpoint has correct credentials
- Check browser console for WebSocket errors

### Build failures
- Run **`lk agent deploy`** from **`apps/lv-pyapi/agents`** so the agent **`Dockerfile`** is used (not the main API `Dockerfile`)
- Check that `agents/requirements.txt` includes all necessary packages
- Verify build context doesn't reference non-existent monorepo paths

## Useful Commands

```bash
# List all agents
lk agent list

# View agent logs (agent name or id from list)
lk agent logs

# Deploy a new version (build + upload secrets)
cd apps/lv-pyapi/agents && lk agent deploy --secrets-file ../.env.production

# Update secrets only (restarts agent)
cd apps/lv-pyapi/agents && lk agent update --secrets-file ../.env.production

# Delete agent
lk agent delete

# Test LiveKit connection
lk room list
```

## References

- [LiveKit Cloud Documentation](https://docs.livekit.io/cloud/)
- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [Gemini API Documentation](https://ai.google.dev/docs)