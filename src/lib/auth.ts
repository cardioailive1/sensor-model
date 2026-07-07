───────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.8.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
> sensormodel-corverxis@1.0.0 build
> next build
⚠ No build cache found. Please configure build caching for faster rebuilds. Read more: https://nextjs.org/docs/messages/no-cache
  ▲ Next.js 14.2.35
   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
Failed to compile.
./src/lib/auth.ts:52:7
Type error: Object literal may only specify known properties, and 'tenantId' does not exist in type 'OIDCUserConfig<MicrosoftEntraIDProfile> & { profilePhotoSize?: 48 | 64 | 96 | 120 | 240 | 360 | 432 | 504 | 648 | undefined; }'.
  50 |       clientId: process.env.AZURE_AD_CLIENT_ID!,
  51 |       clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
> 52 |       tenantId: process.env.AZURE_AD_TENANT_ID,
     |       ^
  53 |     }),
  54 |
  55 |     // ── Email / Password (hashed, no plaintext) ───────────────────────
Next.js build worker exited with code: 1 and signal: null
==> Build failed 😞
==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
Need better ways to work with logs? Try theRender CLI, Render MCP Serv
