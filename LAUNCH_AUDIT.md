# Aurora AI launch audit — 2026-10-07

Scope: `francoarcieri27/conversation-por-aurora-ai-demo` and its existing Vercel deployment. BERZIA fitness/Softr, subscriptions and mobile apps are separate and were not changed in this repository.

## Findings and fixes

| Finding | Resolution |
| --- | --- |
| Private key checked by the browser; missing values became the truthy string `undefined` | Removed key from shared configuration; server-only configuration now checks a real value |
| Reasoning visible again after successful streaming | Clean streaming, replacement events and history; strip internal traces before returning streams to browsers |
| SSE could parse partial JSON, duplicate events and hang after errors | Complete-frame parser, error propagation and interrupted-stream detection with regression coverage |
| Concurrent first requests could create different identities | Fetch parameters to establish cookie before conversations |
| Unsigned session cookie with implicit path | HMAC signature, HttpOnly, root path, SameSite, production Secure and explicit lifetime |
| Raw upstream errors / successful empty payloads | Generic error responses with meaningful HTTP statuses |
| Upload and mutation inputs unrestricted | Bounded query, local upload types/size/count, ID checks and same-origin validation |
| Framework hid TypeScript errors | Fixed inherited errors; enabled build type checking |
| Unlocked old dependencies with reported vulnerabilities | Updated framework and render dependencies, removed unused vulnerable stack, committed npm lockfile |
| Generic template branding, no language selector | Aurora title, non-robot mark, Spanish/English selector, localized demo notice and privacy link |

## Automated evidence

- Unit regression suite: signed-session tampering, byte-split UTF-8 SSE, malformed/error frames, short visible responses, reasoning in history/replacements and server-side trace removal.
- Production integration smoke: health configuration, session continuity, tampering, cleaned history, actual proxy streaming, invalid query/ID/files, cross-origin rejection, burst protection, key isolation, security headers and privacy route.
- TypeScript and production build are required to pass before deployment.
- Runtime dependency audit: 0 vulnerabilities after dependency updates (npm audit, 2026-10-07).
- GitHub CI repeats tests, type check, runtime audit, build and mock integration checks.

## Observed live workflow before fixes

A real Spanish service inquiry returned the fictional catalog (Corte 350 MXN / 45 min; Peinado 450 MXN / 60 min; Manicure 300 MXN / 45 min; gel 450 MXN / 60 min) and Monday–Saturday 10:00–19:00 hours. It also exposed internal English reasoning. That exposure is the primary release regression addressed here.

## Real-customer launch gates

1. Complete independent-browser isolation and real upstream-failure checks. Live ES/EN replies, history reload, language switching and correction/withdrawal of a non-booking inquiry passed. Attachments are disabled in the current Dify interface; upload validation is covered against the mock service. Real booking changes/cancellation remain unverified.
2. Replace demo catalog, identity and policies with approved real business data. Verify a durable booking/lead integration, availability and cancellation acknowledgements. A chatbot message alone must not count as a confirmed appointment.
3. Publish the operator's actual privacy contact, retention periods and deletion mechanism. The included page clearly identifies these as pending.
4. Configure distributed abuse protection and Dify spend limits. The shipped in-memory limiter can be bypassed by new sessions or different server instances and is not a production quota.
5. Check Dify credits, service monitoring and human escalation; prove booking actions against test records before accepting live requests.

No comparative claim of being better than all competitors is supported by this audit. No payments or real customer appointments were submitted as part of verification.

## Published revision and verification

2026-10-07: all 6 regression tests, TypeScript, production build and production integration smoke passed locally. The smoke additionally found and verified fixes for host normalization in same-origin checks and wildcard/invalid locale inputs. Runtime npm audit returned 0 vulnerabilities.

The GitHub connector refused writes with HTTP 403. With the user's explicit authorization, the browser workflow published all 38 files to `aurora-launch-fixes`. Fetching that branch proved its tree exactly matched the tested local revision. PR #1 was merged to main at `5cf3151a5256972c1cd03a6d69ad489b31858489` after all three checks passed. GitHub Actions also passed on main (run `37694229717`). Vercel reported the production deployment successful (`EU8JMvZkCDBTXBE9DE8gYTnPz34f`).

Production URL: https://conversation-por-aurora-ai-demo.vercel.app/

Observed on the public production site:

- Aurora title and mark, working Spanish/English interface selector, demo disclosure and privacy page.
- Real Dify service/hour inquiry in Spanish returned the demo catalog with no internal reasoning visible.
- Reload restored the same conversation and answer without exposing reasoning.
- Switching to English preserved prior messages; a real English inquiry returned an English answer and acknowledged fictional prices.
- Correcting a test inquiry to manicure with gel returned 450 MXN / 60 minutes. No appointment was requested or created by the test.
- Withdrawing the test inquiry produced an explicit demo-only acknowledgement with no real appointment confirmed. This verifies conversational handling only, not cancellation in a booking system.
- No file attachment control is available in the current Dify configuration. File handling was verified with the mock upstream only.

The `/api/health` browser check could not be completed because the browser rejected that navigation; live successful chat verified the actual connection instead. No failure injection or independent isolated browser session was performed against production. Session tampering, burst limits, cross-origin rejection and upstream errors were verified in the automated integration environment.

Release decision: the updated demo is deployed and smoke-tested. It is not approved for real-customer booking operations until the business, privacy, durable booking and abuse-control gates above are closed.
