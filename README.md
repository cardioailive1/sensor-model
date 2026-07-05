# SensorModel v1.0

**Real-Time Sensor Prediction Platform**
Built by [Corverxis Technologies](https://corverxis.com) · AI Engineering & Consulting

---

## Overview

SensorModel is a production-grade sensor prediction engine that runs 5 ML algorithms simultaneously across 32 sensor types spanning 8 engineering verticals. It connects to any existing industrial system via WebSocket, REST, OPC-UA, or MQTT and begins predicting from the first reading — no training data required.

```
32 sensor types  ·  8 verticals  ·  5 ML algorithms  ·  up to 20 Hz real-time
```

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-org/sensormodel
cd sensormodel
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL, NEXTAUTH_SECRET, and at least one OAuth provider

# 3. Set up database
npm run db:migrate
npm run db:seed      # optional demo data

# 4. Run dev server
npm run dev
# → http://localhost:3000
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database | PostgreSQL 16 via Prisma ORM |
| Authentication | Auth.js v5 — OAuth 2.0 / OIDC |
| Styling | Tailwind CSS + Radix UI |
| Charts | Recharts |
| ML Engine | Custom TypeScript (EKF, LSTM, ARIMA, Fourier, Ensemble) |
| Logging | Pino (structured JSON, PII-redacted) |
| Deployment | Render.com (render.yaml included) |
| CI/CD | GitHub Actions |

---

## ML Algorithms

| Algorithm | Description | Best For |
|-----------|-------------|----------|
| **EKF** | Extended Kalman Filter — state estimation with covariance | Smooth, low-noise signals |
| **LSTM** | Attention-weighted momentum model | Signals with recency patterns |
| **ARIMA** | Auto-regressive integrated moving average (OLS) | Stationary / slowly drifting signals |
| **Fourier** | 2-harmonic decomposition | Periodic / cyclical signals |
| **Ensemble** | Confidence-weighted average of all 4 | Best general accuracy (+15–25%) |

All algorithms produce: `predicted value`, `confidence (0–1)`, `RUL in hours`, and 8 extracted signal features (RMS, kurtosis, crest factor, entropy, peak-to-peak, trend slope, skewness, std dev).

---

## Sensor Verticals

| Vertical | Example Sensors |
|----------|----------------|
| Manufacturing | CNC spindle vibration, bearing temp, motor current, hydraulic pressure |
| Industrial Automation | Servo torque, flow rate, position encoder, acoustic emission |
| Healthcare | ECG, SpO2, blood pressure, body temperature |
| Aerospace | Fan vibration, exhaust gas temp, oil pressure |
| EV Battery | Cell temperature, cell voltage, SOC, charge current |
| Power Systems | Transformer current, oil temp, partial discharge, grid frequency |
| Mining | Crusher vibration, dust PM2.5, methane concentration, roof load |
| Renewable Energy | Gearbox vibration, nacelle temp, active power output, PV temperature |

---

## API Reference

All API routes are under `/api/v1/`. Authentication via session cookie or `X-Api-Key` header.

### Predict

```http
POST /api/v1/predict
Content-Type: application/json
X-Api-Key: sm_live_...

{
  "sensorId": "clx...",
  "values": [21.3, 21.8, 22.1, 22.6],
  "algorithm": "ensemble",
  "includeFeaturesExtraction": true
}
```

```json
{
  "predictionId": "clx...",
  "predicted": 23.1,
  "confidence": 0.94,
  "rulHours": 312,
  "features": { "rms": 22.1, "kurtosis": 2.8, "trendSlope": 0.43 },
  "durationMs": 4
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/predict` | Run ML prediction |
| `GET` | `/api/v1/sensors` | List sensors |
| `POST` | `/api/v1/sensors` | Create sensor |
| `GET` | `/api/v1/alerts` | List active alerts |
| `GET` | `/api/v1/api-keys` | List API keys |
| `POST` | `/api/v1/api-keys` | Create API key |
| `POST` | `/api/v1/compliance/gdpr` | GDPR erasure request |
| `GET` | `/api/v1/compliance/gdpr` | GDPR data export |
| `GET` | `/api/health` | Health check (Render) |

---

## Authentication

Three OAuth2 providers supported out of the box:

- **Google** — `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
- **GitHub** — `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`
- **Microsoft Entra ID** — `AZURE_AD_CLIENT_ID` + `AZURE_AD_CLIENT_SECRET` + `AZURE_AD_TENANT_ID`

API keys use the format `sm_live_<random32>`. Only the bcrypt hash is stored — the plaintext key is shown once on creation.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=                 # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

See `.env.example` for the full list including Microsoft and GitHub OAuth vars.

---

## Database

Prisma schema with 13 models:

```
User · Account · Session · VerificationToken
Org · ApiKey
Asset · Sensor · SensorReading · Prediction · SensorSession
Alert · AuditLog · ComplianceDoc · DataRetentionPolicy
```

```bash
npm run db:generate    # generate Prisma client
npm run db:migrate     # run migrations (production)
npm run db:push        # push schema changes (development)
npm run db:studio      # open Prisma Studio GUI
npm run db:seed        # seed demo data
```

---

## Deploy to Render.com

The `render.yaml` file provisions everything automatically:

1. Push this repo to GitHub
2. Go to **dashboard.render.com → New → Blueprint**
3. Connect your GitHub repo
4. Set secret env vars in the Render dashboard (OAuth keys, Anthropic key)
5. Deploy — migrations run automatically on startup

Full step-by-step instructions in **[DEPLOY.md](./DEPLOY.md)**.

---

## Compliance

SensorModel is built to the following standards:

| Framework | Coverage |
|-----------|---------|
| **SOC 2 Type II** | CC6.1–CC6.8, CC7.1–CC7.3, P5.1, P8.1 |
| **ISO/IEC 27001:2022** | A.5.12–A.8.28 |
| **GDPR** | Art. 5, 17, 20, 25, 30, 32 |
| **CCPA** | Right to know, delete, opt-out |
| **IEC 61360** | Sensor data representation |
| **IEEE 1451** | Smart sensor interface |
| **ISO 13381-1** | Remaining useful life |
| **ISO 26262** | Automotive/EV functional safety |
| **IEC 62443** | Industrial cybersecurity |

Full details in **[COMPLIANCE.md](./COMPLIANCE.md)**.

---

## Project Structure

```
sensormodel/
├── prisma/
│   ├── schema.prisma          # Database schema (13 models)
│   └── seed.ts                # Demo data
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # Auth.js OAuth handler
│   │   │   ├── health/        # Render health check
│   │   │   └── v1/            # API routes
│   │   ├── auth/signin/       # Sign-in page
│   │   └── page.tsx           # Dashboard
│   ├── components/
│   │   ├── DashboardClient.tsx
│   │   ├── SensorChart.tsx    # Live charts with predictions
│   │   └── AlertBadge.tsx
│   └── lib/
│       ├── auth.ts            # Auth.js config
│       ├── prisma.ts          # DB client singleton
│       ├── audit.ts           # SOC 2 audit logging
│       ├── logger.ts          # Pino structured logger
│       ├── ratelimit.ts       # Sliding window rate limiter
│       ├── apikey.ts          # API key generation + validation
│       ├── schemas.ts         # Zod input validation
│       └── ml/algorithms.ts   # 5 ML algorithms
├── render.yaml                # One-click Render deploy
├── .env.example               # Environment variable template
├── DEPLOY.md                  # Deployment guide
└── COMPLIANCE.md              # Standards reference
```

---

## Development

```bash
npm run dev          # start dev server
npm run build        # production build
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm test             # Jest tests
npm run db:studio    # Prisma Studio
```

---

## License

Proprietary — Corverxis Technologies. All rights reserved.

For licensing inquiries: engineering@corverxis.com

---

*SensorModel v1.0 · Corverxis Technologies · AI Engineering & Consulting*
