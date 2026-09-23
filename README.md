# Global Work Radar

Independent MVP incubator for a global-work intelligence service focused on Japan-based users.

## Objective

Continuously discover public job opportunities, normalize them into comparable structured data, surface Japan-eligible and Japanese-language opportunities, and route users to the original official source.

## Product boundary

Global Work Radar is an information/search layer, not a staffing, dispatch, recruitment-agency, payroll, application-management, or candidate-matching service.

Initial MVP intentionally excludes:

- employer job-posting accounts
- candidate profiles or resume storage
- DMs or employer/candidate messaging
- application submission on behalf of users
- salary/payroll handling
- hiring decisions or candidate recommendations to employers
- copied full job descriptions where avoidable

## MVP loop

Public/approved source
→ ingest
→ normalize
→ deduplicate
→ source-policy check
→ Japan eligibility classification
→ language / compensation / remote classification
→ publish searchable record
→ official-source outbound link
→ expiry/revalidation

## Core fields

- source_name
- source_url
- official_url
- employer
- title
- location
- remote_type
- japan_eligible
- japanese_required
- english_level
- employment_type
- compensation_min
- compensation_max
- compensation_currency
- compensation_period
- category
- first_seen_at
- last_verified_at
- expires_at
- source_status

## Evidence-backed work-structure fields

When an official source explicitly states them, GWR should also preserve work-density and time-constraint facts that ordinary job search often misses:

- actual workload / call or task volume
- standby pay / availability fee
- paid idle or waiting time
- other work permitted
- non-exclusive status
- simultaneous work allowed during standby
- response SLA / required response time
- current application status

These fields are evidence-first. Do not infer low workload, paid standby, or simultaneous-work permission merely from `remote`, `contractor`, `flexible`, `part-time`, `on-call`, or `non-exclusive` wording.

Detailed rules: [`WORK_STRUCTURE_CLASSIFICATION.md`](WORK_STRUCTURE_CLASSIFICATION.md)

Potential future derived intelligence, only after enough verified evidence exists:

- Work Density = active workload per paid availability period
- Constraint Level = how much paid time is actually restricted
- Standby Value = whether waiting/availability itself is compensated

Raw facts come first; do not publish speculative scores.

## Initial categories

- AI Trainer / Evaluator
- Data Annotation
- Localization
- Translation
- Customer Support
- Search / Ads Evaluation
- Remote Contractor

## Safety / source rules

1. Prefer official employer pages, public APIs, RSS/feeds, and sources that explicitly permit indexing or reuse.
2. Store structured facts and short source-derived metadata rather than reproducing full copyrighted listings.
3. Keep the official source URL visible and route applications externally.
4. Fail closed when source permission, listing authenticity, or eligibility is unclear.
5. Never infer that Global Work Radar is the employer or recruiter.
6. Work-density, standby-pay, exclusivity, simultaneous-work, and SLA fields require explicit source evidence; unknown is better than guessed.

## Agent Lab downstream handoff

GWR remains a Global Work / Labor Intelligence brand. Agent Lab is downstream only and must not change GWR's product, ranking, ingestion, UI, source policy, or revenue priorities.

GWR's priority remains:

External Market → Work Signal → Human Action → Revenue / Evidence

When normal GWR operations already produce an evidence-backed lesson that is reusable beyond GWR, it may be handed downstream as an Agent Lab Field Note candidate. GWR does not write the article, build membership features, or perform extra experiments for content production.

A candidate is fail-closed and can be recorded only when all of these are known from evidence:

1. what was executed
2. what succeeded or failed
3. cause
4. fix
5. external evidence
6. reusable pattern
7. Field Note value

Use `agent-lab-handoff.mjs` only after those facts already exist. Hypotheses, ordinary job records, unresolved warnings, market observations without a reusable operating pattern, and content ideas are not candidates.

The handoff log is append-only at `data/agent-lab-field-note-candidates.jsonl` and is created only when a qualifying candidate exists. A candidate must also carry `source_ref` back to auditable GWR evidence. This is an evidence outlet, not a content-production queue.

Commands:

```bash
node incubator/global-work-radar/agent-lab-handoff.mjs --validate-log
node incubator/global-work-radar/agent-lab-handoff.mjs --record path/to/evidence-backed-candidate.json
```

## Publishing Revenue Cell downstream handoff

Publishing is also downstream only. GWR remains the market/data system and must not change its ingestion, ranking, UI, source policy, or research priorities merely to create articles.

When normal GWR operation already produces a general-user-relevant data finding, it may be handed to Publishing as a Data Insight candidate only when:

- the underlying GWR evidence is confirmed
- freshness has been checked
- the data scope and `as_of` date are explicit
- auditable GWR evidence/source references are present
- claim limits are explicit so Publishing cannot strengthen the finding beyond the data
- the default return destination remains GWR

The handoff is data, not article copy. Publishing owns three-stage research, freshness confirmation, country/labor-expression review, article/Field Note/newsletter production, and qualified-traffic distribution.

GWR never hands off claims equivalent to "this job will make money", "Japanese people can apply as a group", or "this role is easy to get hired for" unless the underlying evidence actually establishes that claim. Ordinary listings or weak samples are not generalized into population-level claims.

Publishing may return search-demand or reader-response questions to GWR. GWR may deepen the data only when that analysis also serves GWR's own market-intelligence purpose; content demand alone does not create a new GWR workstream.

Use `publishing-handoff.mjs` only after the qualifying data finding already exists. The append-only log is `data/publishing-data-insight-candidates.jsonl` and is created only when a qualifying candidate is recorded.

Commands:

```bash
node incubator/global-work-radar/publishing-handoff.mjs --validate-log
node incubator/global-work-radar/publishing-handoff.mjs --record path/to/evidence-backed-data-insight.json
```

The intended loop is:

GWR Data → Publishing Research / QA → Public Content → Qualified Search / Human Signal → GWR

## Success criteria for MVP

- scheduled ingestion works
- duplicate jobs collapse to one canonical record
- expired/dead listings are removed or marked inactive
- filters work for Japan eligibility, Japanese requirement, remote status, category, and compensation
- every public job record has an original source link and verification timestamp

## Distribution

The service remains independent. Existing Vector Praxis assets may provide contextual inbound links; no shared candidate database, application workflow, or employer account system is planned.
