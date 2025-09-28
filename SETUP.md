# Setup Guide

## Required Secrets and Environment Variables

### GitHub Repository Secrets

Add these to your GitHub repository secrets (Settings > Secrets and variables > Actions):

```
FIVEM_LICENSE_KEY=your_cfx_license_key_here
GITHUB_TOKEN=ghp_your_github_token_here
OPENAI_API_KEY=sk-your_openai_api_key_here
```

### Environment File (.env)

Create a `.env` file based on `.env.example`:

```bash
# FiveM Server Configuration
FIVEM_LICENSE_KEY=your_license_key_here
FIVEM_SERVER_NAME=Five-AI Auto-Managed Server
FIVEM_MAX_CLIENTS=32
FIVEM_RCON_PASSWORD=secure_rcon_password_123

# Database Configuration
POSTGRES_DB=fiveai
POSTGRES_USER=fiveai
POSTGRES_PASSWORD=secure_db_password_456
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# AI Maintainer Configuration
GITHUB_TOKEN=ghp_your_github_token_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_789
OPENAI_API_KEY=sk-your_openai_api_key_here
REPOSITORY_OWNER=your_github_username
REPOSITORY_NAME=five-ai

# Health Check Configuration
HEALTH_CHECK_TOKEN=health_token_abc
```

## Obtaining Required Keys

### FiveM License Key
1. Go to https://keymaster.fivem.net/
2. Create account and verify
3. Generate a new server key
4. Copy the key (starts with cfx_...)

### GitHub Token
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `workflow`, `write:packages`
4. Copy the token (starts with ghp_...)

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy the key (starts with sk-...)

## Initial Deployment

1. **Fork/Clone Repository**
   ```bash
   git clone https://github.com/your-username/five-ai.git
   cd five-ai
   ```

2. **Set Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   nano .env
   ```

3. **Start Services**
   ```bash
   docker-compose up -d
   ```

4. **Verify Services**
   ```bash
   # Check all services running
   docker-compose ps

   # Test health endpoint
   curl http://localhost:30120/health

   # Test AI maintainer
   curl http://localhost:3000/health
   ```

## GitHub Webhook Configuration

1. Go to your repository Settings > Webhooks
2. Click "Add webhook"
3. Set payload URL: `http://your-server-ip:3000/webhook`
4. Content type: `application/json`
5. Secret: Use the value from `GITHUB_WEBHOOK_SECRET`
6. Events: Select "Pull requests"
7. Active: ✓

## Branch Protection Rules

Set up branch protection for `main`:

1. Go to Settings > Branches
2. Add rule for `main` branch
3. Enable:
   - Require status checks to pass
   - Require branches to be up to date
   - Require pull request reviews
   - Dismiss stale reviews
   - Restrict pushes to matching branches

## Verification Checklist

- [ ] FiveM server starts successfully
- [ ] Health endpoint responds at `/health`
- [ ] RPC endpoint works at `/rpc`
- [ ] AI maintainer service is running
- [ ] GitHub webhook is configured
- [ ] Test PR triggers AI review
- [ ] CI pipeline runs on PR
- [ ] Auto-merge works for safe changes

## Troubleshooting

### FiveM Server Issues
```bash
# Check server logs
docker-compose logs fivem

# Verify license key format
echo "License should start with 'cfx_': $FIVEM_LICENSE_KEY"

# Test resource loading
docker-compose exec fivem ls /opt/cfx-server/resources/ai_health/
```

### AI Maintainer Issues
```bash
# Check AI service logs
docker-compose logs ai-maintainer

# Test OpenAI connection
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Test GitHub API access
curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user
```

### Database Issues
```bash
# Check database connection
docker-compose exec postgres psql -U fiveai -d fiveai -c "SELECT 1;"

# Reset database
docker-compose down -v
docker-compose up postgres -d
```

### Webhook Issues
```bash
# Check webhook delivery in GitHub
# Go to Settings > Webhooks > Recent Deliveries

# Test webhook locally
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -d '{"zen": "test"}'
```