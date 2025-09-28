# Five-AI: Auto-Deploying AI-Managed FiveM Server

An open-source, auto-deploying, AI-managed FiveM server where contributors submit PRs, the system auto-reviews, tests, and merges if safe. The server updates itself on a schedule.

## 🚀 Features

- **Automated PR Review**: AI-powered code review with security analysis
- **Auto-Merge**: Safe changes are automatically merged after CI passes
- **Health Monitoring**: Real-time server health and RPC endpoints
- **Docker Deployment**: Complete containerized setup
- **Auto-Updates**: Watchtower keeps production updated

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Repo   │────│  GitHub Actions │────│   Docker Hub    │
│   + Branch      │    │   CI/CD Pipeline│    │   Image Registry│
│   Protection    │    └─────────────────┘    └─────────────────┘
└─────────────────┘              │                       │
         │                       │                       │
         │ webhook               │ build/test            │ pull
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  AI Maintainer  │────│   PostgreSQL    │    │  FiveM Server   │
│   (Node.js)     │    │   Database      │    │  + ai_health    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                │
                    ┌─────────────────┐
                    │   Watchtower    │
                    │  Auto-Updater   │
                    └─────────────────┘
```

## 🛠️ Quick Start

### Prerequisites

- Docker & Docker Compose
- FiveM License Key
- GitHub Token with repo permissions
- OpenAI API Key

### Setup

1. **Clone and Configure**
   ```bash
   git clone https://github.com/your-org/five-ai.git
   cd five-ai
   cp .env.example .env
   ```

2. **Edit Environment Variables**
   ```bash
   # Required: Edit .env with your keys
   nano .env
   ```

3. **Start Services**
   ```bash
   docker-compose up -d
   ```

4. **Verify Setup**
   ```bash
   # Check server health
   curl http://localhost:30120/health

   # Test RPC endpoint
   curl -X POST http://localhost:30120/rpc \\
     -H "Content-Type: application/json" \\
     -d '{"command": "heartbeat"}'
   ```

## 📁 Project Structure

```
five-ai/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD pipeline
├── ai-maintainer/              # AI review service
│   ├── src/
│   │   └── index.js           # Main application
│   ├── Dockerfile
│   └── package.json
├── resources/
│   └── ai_health/             # FiveM health resource
│       ├── fxmanifest.lua
│       ├── server.lua         # Health & RPC endpoints
│       └── client.lua
├── server/
│   ├── Dockerfile             # FiveM server image
│   └── server.cfg             # FiveM configuration
├── docker-compose.yml         # Service orchestration
├── .env.example              # Environment template
└── README.md
```

## 🤖 AI Maintainer

The AI maintainer automatically:

1. **Reviews PRs** for security issues and FiveM compatibility
2. **Checks allowlists** (only `/resources`, `/docs`, workflows)
3. **Waits for CI** to pass all tests
4. **Auto-merges** safe changes
5. **Logs everything** to PostgreSQL

### Allowlisted Paths
- `resources/` - FiveM resources
- `docs/` - Documentation
- `README.md` - Project readme
- `.github/workflows/` - CI/CD configs

## 🏥 Health Monitoring

### Endpoints

- **GET `/health`** - Server status
  ```json
  {
    "ok": true,
    "players": 5,
    "uptime_ms": 3600000,
    "timestamp": 1640995200
  }
  ```

- **POST `/rpc`** - Execute allowlisted commands
  ```json
  {
    "command": "heartbeat"
  }
  ```

### Allowed RPC Commands
- `say` - Broadcast message
- `status` - Get server status
- `heartbeat` - Ping server

## 🔧 Development

### Local Development

```bash
# Start database only
docker-compose up postgres -d

# Run AI maintainer locally
cd ai-maintainer
npm install
npm run dev

# Run FiveM server locally (requires FiveM installation)
cd server
# Configure and run FiveM server
```

### Adding New Resources

1. Create resource in `resources/[resource-name]/`
2. Add to `server.cfg`
3. Submit PR - AI will review automatically

### CI/CD Pipeline

The GitHub Actions workflow:
1. **Lint & Build** - Validates code syntax
2. **Ephemeral Test** - Spins up temporary server
3. **Health Check** - Verifies endpoints work
4. **Build & Push** - Updates Docker images (main branch)

## 🐛 Troubleshooting

### Common Issues

**Server won't start:**
```bash
# Check logs
docker-compose logs fivem

# Verify license key
echo $FIVEM_LICENSE_KEY
```

**AI maintainer errors:**
```bash
# Check service logs
docker-compose logs ai-maintainer

# Test GitHub token
curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user
```

**Health endpoint not responding:**
```bash
# Check resource loaded
docker-compose exec fivem ls resources/ai_health/

# Test from inside container
docker-compose exec fivem curl localhost:30120/health
```

## 🔒 Security

- All user code is reviewed by AI for security issues
- Only allowlisted paths can be auto-merged
- Resource isolation through FiveM's sandbox
- Database credentials are containerized
- GitHub webhooks use signature verification

## 🚀 Production Deployment

1. **Set up domain and SSL** (recommended)
2. **Configure GitHub webhooks** pointing to your server
3. **Set production environment variables**
4. **Enable watchtower** for auto-updates
5. **Monitor logs** for issues

### GitHub Webhook Setup

1. Go to repo Settings > Webhooks
2. Add webhook URL: `https://your-domain.com/webhook`
3. Select "Pull requests" events
4. Set secret to match `GITHUB_WEBHOOK_SECRET`

## 📝 License

MIT License - Feel free to use and modify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a PR
4. AI will review and auto-merge if safe!

---

**⚠️ Important**: Always test changes in a development environment first. The AI reviewer helps catch issues but isn't perfect.