# GWR Revenue Event Contract v1 (proposal; not deployed)

Owner: globalworkradar/global-work-radar only. This file is a non-runtime specification. Do not alter production endpoints, checkout, or existing Make hooks based on this document alone.

## Priority
PAID_CONFIRMED > PAYMENT_PENDING > CONTRACT > QUALIFIED_BUYER_ACTION > HUMAN_REACTION > REACH. Never treat clicks, webhook receipt, or synthetic tests as payment.

## Event fields
- event_id: stable unique identifier (required)
- event_type: enum: webhook_test, human_reaction, qualified_buyer_action, contract, payment_pending, paid_confirmed (required)
- occurred_at: ISO-8601 UTC (required)
- source: GWR-owned origin (required)
- buyer_key: optional; never assume a URL parameter proves buyer identity
- attribution: optional campaign/source, verified separately
- evidence_ref: required for contract/payment states, not raw credentials or sensitive payment data
- is_test: boolean (required); test events are never commercial evidence

## Validation gates
1. Authenticate sender using server-held secret/signature; browser-supplied claims alone are untrusted.
2. Check event_id uniqueness and replay protection in durable storage.
3. Validate timestamp, type, allowed origin and payload size; quarantine malformed requests.
4. Confirm human/buyer authenticity and attribution before promoting a signal.
5. Payment status must be verified against the payment provider's signed event or authoritative API; never infer from client clicks or Make run success.
6. Record event provenance and processing outcome without secrets/PII; redact logs.

## Safe migration
- Inventory current production buyer forms, mailto links, analytics, and Make webhook usage.
- Build an isolated Cloudflare event receiver and storage on a separate preview route; no production traffic cutover.
- Test with is_test=true, repeated event_id, invalid signature, stale timestamp, and malformed payload.
- Verify receipt and dedupe in persisted evidence, then migrate one event class at a time with rollback.
- No new clock schedules. Event/webhook-driven only.

## Current blockers
- Existing production webhook destination and receiver behavior require verification.
- No confirmed paid GWR buyer contract or payout evidence yet.
- Do not turn on disabled affiliate configuration without an approved valid destination.
