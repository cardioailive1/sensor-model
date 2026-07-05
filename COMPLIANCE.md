# SensorModel v1.0 — Compliance & Standards Reference
**Corverxis Technologies | AI Engineering & Consulting**

---

## Security Standards

### SOC 2 Type II Controls

| Control | Category | Implementation |
|---------|----------|----------------|
| CC6.1 | Logical Access | OAuth 2.0 + OIDC via Auth.js v5. Role-based access (RBAC): SUPER_ADMIN / ADMIN / ENGINEER / VIEWER |
| CC6.2 | New User Provisioning | Users provisioned via approved OAuth providers only. No self-registration |
| CC6.3 | Session Management | JWT sessions, 8-hour expiry, httpOnly cookies, SameSite=Lax |
| CC6.6 | System Boundaries | Rate limiting (100 req/min API, 10 req/15min auth). IP-based + API-key-based |
| CC6.7 | Account Lockout | `failedLoginCount` + `lockedUntil` fields. Lockout after 10 failed attempts |
| CC6.8 | Input Validation | All inputs validated with Zod schemas before processing |
| CC7.1 | Threat Detection | Structured audit log with timestamp, IP, user agent, outcome |
| CC7.2 | Audit Logging | All security events logged: login, logout, API key create/revoke, data export, erasure |
| CC7.3 | Incident Response | GitHub Actions security scan (Trivy). npm audit on every build |
| P5.1 | Data Classification | PII fields identified in Prisma schema. Redact config in logger |
| P8.1 | Data Deletion | GDPR erasure endpoint. Soft-delete + anonymisation workflow |

### ISO/IEC 27001:2022

| Control | Ref | Implementation |
|---------|-----|----------------|
| Information classification | A.5.12 | Personal data identified and tagged in schema |
| Access control policy | A.5.15 | RBAC enforced at middleware and API route level |
| Identity management | A.5.16 | OAuth 2.0 / OIDC — no password storage required |
| Authentication | A.5.17 | MFA field in User model. Enforced per org policy |
| Privileged access | A.8.2 | SUPER_ADMIN role restricted. ADMIN actions audit-logged |
| Secure coding | A.8.28 | TypeScript strict mode, Zod validation, no eval |
| Cryptography | A.8.24 | bcryptjs (12 rounds) for API key hashing. HTTPS enforced |
| Logging | A.8.15 | Pino structured JSON logs. Sensitive fields redacted |
| Audit log protection | A.8.15 | Audit logs have no DELETE endpoint. Retention 7 years |
| Vulnerability management | A.8.8 | Trivy scan + npm audit in CI pipeline |
| Network security | A.8.20 | HSTS, CSP, X-Frame-Options headers in next.config.ts |

---

## Data Privacy

### GDPR (EU General Data Protection Regulation)

| Article | Requirement | Implementation |
|---------|-------------|----------------|
| Art. 5 | Data minimisation | Only email, name, image collected from OAuth providers |
| Art. 6 | Lawful basis | Legitimate interest (engineering service provision) |
| Art. 12-14 | Transparency | Privacy policy at /legal/privacy. Consent captured at signup |
| Art. 17 | Right to erasure | `POST /api/v1/compliance/gdpr` — soft-delete + anonymisation |
| Art. 20 | Right to portability | `GET /api/v1/compliance/gdpr` — full JSON data export |
| Art. 25 | Privacy by design | Soft-delete, data region field, consent timestamp in User model |
| Art. 30 | Records of processing | AuditLog table. DataRetentionPolicy table |
| Art. 32 | Security of processing | TLS in transit, bcrypt at rest, redacted logs |

### CCPA (California Consumer Privacy Act)

| Requirement | Implementation |
|-------------|----------------|
| Right to know | Data export endpoint (`GET /api/v1/compliance/gdpr`) |
| Right to delete | Deletion endpoint (`POST /api/v1/compliance/gdpr`) |
| Right to opt-out | ConsentUpdateSchema. Marketing flags in User model |
| No sale of data | Not applicable — Corverxis does not sell user data |

### Data Retention

| Data Type | Retention | Archive After | Delete After |
|-----------|-----------|---------------|--------------|
| Sensor readings | 90 days active | 30 days | 365 days |
| Predictions | 180 days active | 90 days | 730 days |
| Audit logs | 730 days active | — | 2,555 days (7 years) |
| Alerts | 365 days active | — | 1,825 days (5 years) |

---

## Engineering Standards

### Sensor Data & Measurement

| Standard | Scope | Applied To |
|----------|-------|-----------|
| IEC 61360 | Sensor data representation | SensorReading schema, unit field |
| IEEE 1451 | Smart sensor interface | REST + WebSocket API design |
| ISO 13381-1 | Remaining useful life estimation | RUL calculation in `algorithms.ts` |
| ISO 10816 | Vibration measurement | Vibration sensor thresholds |
| IEC 60751 | Temperature sensor accuracy | Temperature sensor configuration |
| ANSI/ISA-51.1 | Process instrumentation | Sensor quality field (0–1 scale) |

### Machine Learning & AI

| Standard | Scope | Applied To |
|----------|-------|-----------|
| ISO/IEC 23053 | ML framework | Algorithm architecture documentation |
| ISO/IEC 42001 | AI management system | Model versioning, confidence scores |
| IEEE 2802 | Trustworthy AI | Confidence field, ensemble approach |
| IEC 62443 | Industrial cybersecurity | API authentication, network isolation |

### Quality Management

| Standard | Scope | Applied To |
|----------|-------|-----------|
| ISO 9001:2015 | Quality management | CI/CD pipeline, code review process |
| ISO/IEC 25010 | Software quality | Reliability, security, maintainability criteria |
| IEC 61511 | Functional safety | Alert severity levels, fail-safe defaults |

### Industrial Verticals

| Standard | Vertical | Applied To |
|----------|----------|-----------|
| IEC 61131-3 | Manufacturing (PLC) | OPC-UA/MQTT integration interfaces |
| AS 9100D | Aerospace | Aerospace sensor configuration |
| ISO 26262 | Automotive/EV | EV battery sensor thresholds |
| IEC 60079 | Mining (hazardous areas) | Mining methane/dust sensor alerts |
| IEC 62061 | Industrial machinery | Safety-rated alert levels |
| ANSI/AAMI | Healthcare | Healthcare sensor data quality |

---

## Authentication Flow

```
User → OAuth Provider (Google/GitHub/Azure AD)
     → OIDC Authorization Code + PKCE (RFC 7636)
     → ID token verified by Auth.js v5
     → JWT session cookie (httpOnly, Secure, SameSite=Lax)
     → Session refreshed on activity
     → Audit log on every sign-in/sign-out
```

### API Key Flow

```
User requests key → nanoid(32) generated
                  → bcrypt(12 rounds) hash stored
                  → Plaintext shown ONCE to user
                  → Prefix (first 12 chars) for identification
                  → bcrypt.compare() on every API request
                  → Revocation sets revokedAt timestamp
```

---

## Incident Response

| Severity | Definition | Response Time | Action |
|----------|-----------|---------------|--------|
| P1 Critical | Data breach, auth bypass | 1 hour | Incident commander, notify affected users within 72h (GDPR Art. 33) |
| P2 High | Service down, rate limit breach | 4 hours | Engineering on-call, Render status update |
| P3 Medium | Elevated error rate, slow queries | 24 hours | Standard engineering sprint |
| P4 Low | Non-critical bugs | Next sprint | Backlog |

---

*Document version: 1.0 | Last updated: June 2026*
*Maintained by Corverxis Technologies Engineering Team*
