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

```bash
cd apps/lv-pyapi

# Deploy with production environment file
# The CLI securely uploads secrets to LiveKit Cloud
lk agent create --env-file .env.production --dockerfile Dockerfile.agent
```

Or if prompted by the CLI:
- **Secrets file**: `.env.production`
- **Dockerfile**: `Dockerfile.agent`

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
- Ensure `Dockerfile.agent` is being used (not the main `Dockerfile`)
- Check that `requirements.txt` includes all necessary packages
- Verify build context doesn't reference non-existent monorepo paths

## Useful Commands

```bash
# List all agents
lk agent list

# View agent logs
lk agent logs lv-voice-agent

# Update agent (after code changes)
lk agent update --env-file .env.production

# Delete agent
lk agent delete lv-voice-agent

# Test LiveKit connection
lk room list
```

## References

- [LiveKit Cloud Documentation](https://docs.livekit.io/cloud/)
- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [Gemini API Documentation](https://ai.google.dev/docs)


## Reminder

- The livekit cli does not automatically ask for the dockerfile.agent.
- When deploying and agent revision, remember to use the Dockerfile.agent for it, not the backend file