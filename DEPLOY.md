# SensorModel v1.0 — Render.com Deployment Guide
**Corverxis Technologies**

---

## Prerequisites

- Render.com account (free tier works for staging)
- PostgreSQL 16 instance (Render managed database)
- At least one OAuth provider configured (Google, GitHub, or Microsoft)
- `ANTHROPIC_API_KEY` from console.anthropic.com

---

## Step 1 — Fork & Push to GitHub

```bash
# Push the project to a GitHub repository
git init
git add .
git commit -m "Initial SensorModel deployment"
git remote add origin https://github.com/your-org/sensormodel
git push -u origin main
```

---

## Step 2 — Create Render Services

### Option A — Automatic (recommended)

1. Go to **dashboard.render.com**
2. Click **New → Blueprint**
3. Connect your GitHub repository
4. Render detects `render.yaml` and creates both services automatically

### Option B — Manual

**Database:**
1. New → PostgreSQL
2. Name: `sensormodel-db`
3. Region: Oregon (US West)
4. Plan: Starter (free) or Standard (production)
5. PostgreSQL version: 16

**Web Service:**
1. New → Web Service
2. Connect GitHub repo
3. Build command: `npm ci && npm run db:generate && npm run build`
4. Start command: `npm run db:migrate && npm start`
5. Health check path: `/api/health`

---

## Step 3 — Environment Variables

Set these in **Render Dashboard → Service → Environment**:

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | Yes |
| `NEXTAUTH_URL` | `https://your-app.onrender.com` | Yes |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Yes |
| `DATABASE_URL` | Auto-set by Render Blueprint | Yes |
| `ANTHROPIC_API_KEY` | From console.anthropic.com | Yes |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | OAuth |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | OAuth |
| `GITHUB_CLIENT_ID` | From GitHub Developer Settings | OAuth |
| `GITHUB_CLIENT_SECRET` | From GitHub Developer Settings | OAuth |
| `AZURE_AD_CLIENT_ID` | From Azure Portal | OAuth |
| `AZURE_AD_CLIENT_SECRET` | From Azure Portal | OAuth |
| `AZURE_AD_TENANT_ID` | `common` for multi-tenant | OAuth |

---

## Step 4 — OAuth Provider Setup

### Google (console.cloud.google.com)

1. Create project → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Authorised redirect URI: `https://your-app.onrender.com/api/auth/callback/google`

### GitHub (github.com/settings/developers)

1. New OAuth App
2. Homepage URL: `https://your-app.onrender.com`
3. Callback URL: `https://your-app.onrender.com/api/auth/callback/github`

### Microsoft Entra ID (portal.azure.com)

1. Azure Active Directory → App registrations → New registration
2. Redirect URI: `https://your-app.onrender.com/api/auth/callback/microsoft-entra-id`
3. Certificates & secrets → New client secret

---

## Step 5 — First Deploy

1. Push to `main` branch — Render auto-deploys
2. Monitor build logs in Render dashboard
3. Database migration runs automatically on startup (`npm run db:migrate`)
4. Seed initial data: `npm run db:seed` (optional — run from Render shell)

---

## Step 6 — Verify Deployment

```bash
# Health check
curl https://your-app.onrender.com/api/health

# Expected response:
# { "status": "healthy", "checks": { "database": { "status": "ok" } } }
```

---

## Custom Domain

1. Render Dashboard → Service → Custom Domains
2. Add your domain
3. Add the CNAME record shown to your DNS provider
4. HTTPS certificate is provisioned automatically (Let's Encrypt)
5. Update `NEXTAUTH_URL` to your custom domain

---

## Scaling

| Plan | RAM | CPU | Suitable For |
|------|-----|-----|-------------|
| Starter (free) | 512 MB | 0.1 vCPU | Development, demo |
| Starter ($7/mo) | 512 MB | 0.5 vCPU | Low traffic |
| Standard ($25/mo) | 2 GB | 1 vCPU | Production |
| Pro ($85/mo) | 4 GB | 2 vCPU | High traffic |

**Database scaling:** Upgrade Starter → Standard for production to enable backups and connection pooling.

---

## Monitoring

- **Render Metrics:** CPU, memory, response times built into dashboard
- **Health endpoint:** `/api/health` — monitors DB connectivity
- **Structured logs:** View in Render → Logs (JSON format, pino)
- **Uptime monitoring:** Add `/api/health` to UptimeRobot or Better Uptime

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Build fails: `prisma generate` | Check `DATABASE_URL` is set before build |
| Auth redirect mismatch | Verify `NEXTAUTH_URL` matches deployed URL exactly |
| 401 on API calls | Check `NEXTAUTH_SECRET` is set and consistent |
| DB migration fails | Check DB is healthy in Render dashboard, verify `DATABASE_URL` |
| Cold start delays | Upgrade to paid plan — free tier spins down after 15min inactivity |
