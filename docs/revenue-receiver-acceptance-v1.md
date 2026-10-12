# GWR receiver v1 — pre-deployment acceptance tests

This is a non-production test checklist. No production webhook, checkout, or deployment settings may be changed by this file.

## Infrastructure gate
- Confirm this repo's actual Cloudflare Pages project and build/output directory; the `functions/` folder must be deployed as Pages Functions, not copied into static assets.
- Provision dedicated D1 database for GWR. Apply `db/gwr_events.sql` to preview database before test.
- Bind D1 as `GWR_EVENT_DB` and set encrypted `GWR_EVENT_SECRET` in **preview environment only**. Do not commit secret or print it.
- Do not reuse another project's D1 database, tokens, or Make webhook.

## Request cases
| Case | Expected |
| --- | --- |
| Missing D1/secret | 503 not_configured |
| Unsigned POST | 401 unauthorized |
| Wrong signature | 401 unauthorized |
| Body >8192 bytes | 413 too_large |
| Invalid JSON with valid signature | 400 invalid_json |
| Unknown event type | 400 invalid_fields |
| Timestamp >5 min old | 400 stale_event |
| Payment claim without evidence_ref | 400 evidence_required |
| Valid signed is_test=true webhook_test | 202 accepted, commercial_evidence=false |
| Repeat same event_id | 200 duplicate=true |
| Claimed paid_confirmed | stored as UNVERIFIED, never counted as revenue |

## Go / no-go
Do not merge PR #2 until preview URL, real test responses, D1 readback, production routing compatibility, and rollback plan are evidenced. Browser JS must not contain the HMAC secret. Client events should pass through a trusted server boundary; no signed secret in client-side code. Never send a fabricated production buyer event.

## Known limits
- This receiver does not verify actual payment with a provider, authenticate a buyer, or prove a contract.
- Do not expose raw event data or PII in logs.
- Current endpoint is not live merely because files exist in GitHub.
