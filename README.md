# Aurora AI — Salón Aurora demo

Spanish/English chatbot powered by the existing Dify app and deployed through the existing Vercel Git integration. This repository is the salon chatbot, not the separate BERZIA fitness application.

## Run and deploy

Use Node 22.6+ (CI uses Node 22), then:

```sh
npm ci --legacy-peer-deps
cp .env.example .env.local
# Set DIFY_API_KEY to the private API Access key of the published Dify chatflow.
npm run dev
```

Vercel project: `aurora-ai4/conversation-por-aurora-ai-demo`. Keep its existing GitHub connection and production branch `main`.

| Variable | Value / purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_ID` | `a2ebb74c-a6b3-4f4a-a9f8-6b9f64e652fc` |
| `DIFY_API_KEY` | Private Dify app API Access key, server only |
| `DIFY_API_URL` | `https://api.dify.ai/v1` (default) |
| `SESSION_SECRET` | Optional independent random signing secret of at least 32 characters; the private Dify key is the fallback |

Never use `NEXT_PUBLIC_APP_KEY`. Remove any old public-key variable from Vercel and rotate it if it was shipped to browsers. Do not commit credentials. Updating an environment variable requires redeployment. `NEXT_PUBLIC_API_URL` remains accepted server-side for compatibility, but new deployments should use `DIFY_API_URL`.

## Verification

```sh
npm test
npm run typecheck
npm audit --omit=dev --audit-level=moderate
npm run build
node scripts/smoke.mjs
```

The smoke script runs the production build against a local mock Dify service. It verifies proxy behavior and controls without claiming to validate the actual Dify workflow. `/api/health` reports configuration presence only; a successful real chat is required to validate Dify and its credits.

## Behavior

- Private server-side Dify requests; no key is exported by browser configuration.
- Incremental SSE parsing handles split JSON, UTF-8 and CRLF frames. Server-side output removes internal reasoning and workflow traces; history and message replacements are also cleaned.
- Signed, HttpOnly, Secure-in-production session cookie with root path and 30-day lifetime. Invalid or unsigned legacy cookies create a new session, so older demo history may disappear from the UI during the migration; no Dify records are deleted.
- The language selector changes interface language without clearing the conversation or rewriting messages. Assistant replies follow the user's requested language, as configured in Dify. It does not translate existing messages.
- Input validation, same-origin checks, upload limits and per-instance burst protection. Files are uploaded locally (JPG/PNG/WEBP/PDF/TXT, up to 4 MB, max 3 attachments); URL uploads are intentionally unavailable.
- Upstream failures use non-success HTTP statuses and generic messages rather than empty successful responses or internal errors.

## Launch status

This is a demo with fictional salon services and prices. Do not describe it as a production booking system: real appointment persistence, availability, cancellation and human handoff must be validated against the salon's actual system. Read `LAUNCH_AUDIT.md` for evidence and remaining launch requirements.

The in-memory burst limiter is best-effort for each runtime instance, not a distributed quota or billing control. Set Vercel firewall / durable rate controls and Dify spending limits before an unrestricted public rollout.

The privacy page is a demo disclosure, not the salon's final privacy notice. Add the real operator identity, contact, retention and deletion process before accepting real customer data.
