# GWR Revenue Integration — 2026-09-10

Global Work Radar keeps revenue routes separate from ordinary traffic, search, and official-apply activity. Only verified Commission, Purchase, Paid Contract, Reward, or actual payment is Revenue Evidence.

## Route A — Paid Labor Intelligence

Status: **ACTIVE LEAD ROUTE**

Existing GWR market evidence is now exposed as a commercial B2B intelligence route rather than only an interest signal.

Current paid candidate:
- Theme: Japanese Speaker Demand
- Evidence source: GWR-observed Workable market snapshots
- Observed period: 2026-09-03 → 2026-09-07
- Japanese-related jobs: 672 → 702 (+4.46%)
- Same-period comparison: all active +0.50%, Remote +1.47%, Japan-eligible +2.04%
- Scope limitation is displayed publicly: GWR-observed Workable market only; not a claim about the entire global labor market.

Commercial surface:
- Trend brief
- Japan eligibility analysis
- Language-demand analysis
- Custom segment comparison
- Fresh-signal / alert scope

Commercial model:
- paid contract inquiry
- scope and usage confirmed first
- pricing is not invented or hard-coded before a real buyer scope exists
- inquiry CTA opens a prefilled email with organization, use case, requested market/role scope, and desired frequency

Measurement:
- `gwr_intelligence_signal_view`
- `gwr_intelligence_interest_click`
- `gwr_paid_intelligence_lead_click`
- `GWR_REVENUE_PUMP` state `PAID_INTELLIGENCE_VERIFY`

Revenue truth:
- an inquiry click is **not revenue**
- a reply is **not revenue**
- a quote is **not revenue**
- count revenue only after a Paid Contract or actual payment is verified

## Route B — Deel Affiliate / Referral

Status: **CONDITIONAL READY — EXTERNAL APPROVAL / TRACKING URL REQUIRED**

Why selected:
- Direct fit with global hiring / contractor payment / payroll / compliance context.
- Existing GWR product boundary is preserved because applications, employment, payroll, and hiring decisions remain external.

Integration state:
- CTA shell implemented in `index.html`.
- Revenue config isolated in `revenue-config.js`.
- CTA is fail-closed: hidden unless `enabled: true` and a valid HTTPS `affiliateUrl` are both present.
- Affiliate disclosure is shown when active.
- Outbound clicks emit `gwr_revenue_click` to `dataLayer`, PostHog, and a bounded localStorage audit trail.
- Cloudflare deployment workflow includes `revenue-config.js`.

External blocker:
A live revenue-generating affiliate CTA requires the approved unique Deel tracking URL issued after affiliate application / review. Do not substitute a generic Deel URL and call it revenue tracking.

Activation after approval:

```js
window.GWR_REVENUE = Object.freeze({
  enabled: true,
  partner: 'Deel',
  affiliateUrl: 'APPROVED_UNIQUE_DEEL_TRACKING_URL',
  disclosure: 'このリンク経由で申込みが成立した場合、Global Work Radarが紹介料を受け取ることがあります。',
  campaign: 'gwr_deel_2026_09'
});
```

Then verify:
1. deploy succeeds,
2. CTA is visible,
3. CTA resolves to the approved tracking URL,
4. one test click is recorded,
5. partner platform records attribution,
6. commission is marked only after the partner reports a qualifying referral/customer.

## Current priority

1. Paid Labor Intelligence lead → qualified conversation → scoped offer → Paid Contract / Payment Evidence.
2. Keep official job-search / official-apply experience strong because it produces the audience and evidence base.
3. Activate Deel only after an approved unique tracking URL exists.
4. Do not create fake checkout, generic affiliate attribution, or call CTA clicks revenue.
