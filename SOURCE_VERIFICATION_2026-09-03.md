# Global Work Radar — Source Verification Handoff

Checked: 2026-09-03

Purpose: determine which low-cost public/official job sources can support GWR's Verified Jobs + Structural Revenue Intelligence loop without turning GWR into an application intermediary or a high-maintenance scraper.

## Executive decision

Priority order by Revenue Probability × Safety × Automation × Data Asset Value:

1. **GO — Workable global XML job feed**
2. **GO — Lever public Postings API**
3. **TEST — Ashby lightweight public Job Postings API**
4. **TEST / INDEX-ONLY — Greenhouse Job Board API**
5. **REJECT for GWR bulk ingestion — SmartRecruiters Posting API**
6. **WATCH — per-employer official careers scraping/indexing**

The strongest immediate backbone is Workable's official global XML feed because Workable explicitly documents a job-board/partner use case, the feed contains jobs across all customers published to Jobs by Workable, and Workable says it is intended to be consumed programmatically. Lever is the strongest complementary provider because Lever explicitly states that published postings are publicly viewable and may be scraped by third parties, while also exposing structured salary, workplace type, country and official application URLs.

---

## 1. Workable global XML feed

**Decision: GO — highest priority**

### Official source

- Documentation: https://help.workable.com/hc/en-us/articles/4420464031767-Utilizing-the-XML-Job-Feed
- Feed: https://www.workable.com/boards/workable.xml
- Jobs by Workable publishing context: https://help.workable.com/hc/en-us/articles/360001357053-Posting-jobs-to-the-Workable-Job-Board-Jobs-by-Workable
- Job board terms: https://jobs.workable.com/terms

### What Workable explicitly permits / describes

Workable documents the XML feed as an advanced option and gives a typical use case: sharing it with a job board/partner that Workable does not already integrate with, so that partner can programmatically obtain the jobs and publish them on its own site.

The feed includes jobs across Workable customer accounts that are approved and published to Jobs by Workable.

### Automation

- Public structured XML feed.
- No per-employer token required.
- Feed refreshes hourly.
- Workable says more frequent consumption is unnecessary.
- GWR should therefore poll **no more than hourly**.

### Display / redistribution boundary

GO only under these constraints:

- publish structured facts, not copied full job descriptions;
- preserve the original Workable job URL exactly;
- do not rewrite or replace the job URL because Workable explicitly says altered URLs affect attribution;
- label source as Workable;
- route applications to the official Workable/employer application URL;
- do not submit applications or candidate data through GWR.

### Fields explicitly shown in the official XML example

- title
- date
- reference number
- official job/application URL
- company
- city
- state
- country
- remote boolean
- postal code
- education
- job type
- category
- experience
- employer website

### History / intelligence feasibility

Strong from hourly snapshots:

- active job count
- new jobs
- closed jobs (via disappearance + confirmation policy)
- demand growth
- hiring velocity
- employer recurrence
- remote ratio
- category mix
- job survival time

Not directly supported by the documented XML example:

- compensation / median pay
- currency mix
- reliable language requirements

Therefore Workable should be the **breadth/history backbone**, not the only source for pay/language intelligence.

### Closure rule

A job should not be marked closed from one missing snapshot alone. Recommended:

1. missing from two consecutive hourly feed snapshots; and
2. if feasible, official application URL no longer accepts the role / resolves to inactive state.

Until both are available, classify as `unknown` or `active_low_confidence`, not definitively closed.

### Storage

- store normalized facts and history;
- store feed reference number + official URL + fingerprints;
- avoid durable storage of full raw feed payload unless operationally needed for short retry/debug windows;
- do not republish full descriptions.

### GWR dependency risk

Medium.

The feed is broad and convenient, but it is one provider-level dependency and the full file can be large. Mitigate with hourly-only polling, streaming XML parsing, retry/backoff, ETag/Last-Modified if available, and no whole-feed retention requirement.

---

## 2. Lever Postings API

**Decision: GO — compensation/remote complement**

### Official source

- Official Lever repository/documentation: https://github.com/lever/postings-api
- Developer reference: https://hire.lever.co/developer/documentation
- Lever legal center: https://www.lever.co/legal
- Lever Terms of Service: https://www.lever.co/legal/terms-of-service

### Permission signal

Lever's official Postings API documentation says:

- all published postings are publicly viewable;
- published postings **may be scraped by third parties**;
- the API is designed to help create a job site;
- GET endpoints expose published postings as JSON/HTML.

This is the clearest third-party automated-access permission signal among the per-employer ATS APIs reviewed.

### Automation

Endpoint pattern:

`GET https://api.lever.co/v0/postings/{SITE}?mode=json`

EU instance is separately supported.

No authentication is required for reading published postings.

The documentation gives a 2 application-POSTs/second limit, but that applies to candidate application submission, which GWR must not use. No explicit GET rate limit was located in the public Postings API documentation reviewed. GWR should still use conservative caching/backoff and never treat absence of a published GET limit as unlimited permission.

### Useful structured fields

- unique posting ID
- title
- location / all locations
- country
- commitment / employment-type-like category
- team / department
- hosted URL
- official apply URL
- workplace type: on-site / remote / hybrid / unspecified
- optional salary range with currency, interval, min, max

### Important limitation

The documented posting-list fields do not provide a reliable published timestamp. For Lever, use `first_seen_at` as GWR observation time unless an employer source provides a separate publication date.

### Language / Japan eligibility

The API exposes description text, but GWR should:

- fetch description text transiently when needed;
- extract only factual language/region requirements;
- retain evidence snippets/hashes only if necessary;
- not republish the full job description.

`Japanese Advantage` may be positive only when Japanese language/market requirement is explicit. No inference from employer nationality, office location or job title alone.

### History / intelligence feasibility

Strong:

- job count
- new/closed jobs from snapshots
- demand growth
- employer recurrence
- remote ratio
- compensation distribution where disclosed
- currency mix where salary is disclosed
- job survival time

### GWR dependency risk

Medium.

Each employer has a site key, so discovery is the harder part. Site keys should come from an employer's official careers page or another approved provenance source; do not mass-guess company slugs.

---

## 3. Ashby lightweight public Job Postings API

**Decision: TEST**

### Official source

- Public/lightweight Job Postings API: https://developers.ashbyhq.com/docs/public-job-posting-api
- Careers-page integration guidance: https://docs.ashbyhq.com/using-the-lightweight-job-posting-api-to-list-openings-on-your-site
- Terms: https://www.ashbyhq.com/resources/terms

### Technical value

Endpoint pattern:

`GET https://api.ashbyhq.com/posting-api/job-board/{JOB_BOARD_NAME}?includeCompensation=true`

The public/lightweight API exposes currently published postings and can include structured compensation. Documented fields include:

- title
- location + secondary locations
- department / team
- official job URL
- official apply URL
- `isListed`
- compensation object when requested

The response is particularly valuable for GWR pay intelligence.

### Why not GO yet

Ashby's official documentation frames this API as a way for an organization to populate **its own** careers page. The public customer Terms reviewed do not provide a clear blanket third-party commercial aggregation/republication license.

Therefore GWR should fail closed on broad commercial ingestion until the permission boundary is clearer.

### TEST rule

A limited test is acceptable only when:

- the Ashby board is discovered from the employer's official careers page;
- only `isListed != false` postings are shown;
- GWR stores/displays structured facts only;
- full descriptions are not republished;
- application goes to Ashby's/employer's official URL;
- polling is conservative because no public lightweight-feed rate limit was found in the official documentation reviewed.

If commercial third-party indexing/redistribution permission can be confirmed from Ashby or the employer, promote to GO.

---

## 4. Greenhouse Job Board API

**Decision: TEST / INDEX-ONLY**

### Official source

- Job Board API docs: https://docs.greenhouse.io/job-board.html
- Current API overview: https://support.greenhouse.io/hc/en-us/articles/10568627186203-Greenhouse-API-overview
- Third-party job board source tracking: https://support.greenhouse.io/hc/en-us/articles/7458660561819-How-do-I-track-the-application-source-from-third-party-job-boards
- Greenhouse legal: https://www.greenhouse.com/legal

### Technical value

Greenhouse explicitly states that Job Board API data is publicly available and that GET endpoints do not require authentication.

List-jobs data includes:

- job ID
- title
- updated_at
- location
- absolute official URL
- language
- optional departments/offices/content

Retrieve-job data can include:

- first_published
- updated_at
- application_deadline
- company_name
- location
- official URL

This is excellent for freshness and job survival analysis.

### Why not full GO yet

Current Greenhouse guidance describes the Job Board API mainly for a customer's own API-driven career site/custom job board. Greenhouse also supports third-party job-board integrations and source tracking, but the reviewed public materials do not clearly state that any third party may commercially aggregate all customer boards without employer authorization.

Therefore:

- use only boards found through official employer provenance;
- use structured facts and official outbound links;
- do not copy full descriptions;
- treat broad cross-company commercial ingestion as TEST until reuse rights are explicit enough.

---

## 5. SmartRecruiters Posting API

**Decision: REJECT for GWR bulk ingestion**

### Official source

- Posting API: https://developers.smartrecruiters.com/docs/posting-api
- API platform/policy notice: https://developers.smartrecruiters.com/docs/the-smartrecruiters-platform
- Governing SAP API Policy linked by SmartRecruiters: https://help.sap.com/doc/sap-api-policy/latest/en-US/API_Policy_latest.pdf

### Block reason

SmartRecruiters states that its APIs are governed by the SAP API Policy, subject to SmartRecruiters clarifications.

SAP API Policy v.4.2026a states that, except through expressly identified SAP-endorsed pathways intended for such purposes, API use is prohibited for **scraping, harvesting, or systematic and/or large-scale data extraction or replication**.

GWR's cross-company scheduled ingestion is exactly the type of systematic extraction that creates material policy risk unless SmartRecruiters provides a specific endorsed pathway for it.

### Safe alternative

- do not use SmartRecruiters as an automated bulk source for MVP;
- if a specific employer later authorizes integration, reassess that employer-specific path;
- official employer page can remain index-only if allowed independently.

No further MVP work should be spent on SmartRecruiters.

---

## 6. Workable authenticated account API

**Decision: REJECT as unnecessary for GWR**

Workable's account API requires employer/admin credentials and is designed to access that employer's Workable account. The public/global XML feed is already a safer, broader, no-credential source for GWR's public-job use case.

Do not request employer tokens or build an account integration for MVP.

---

## 7. Generic official careers pages

**Decision: WATCH / fallback only**

Official employer careers pages remain valid in principle, but per-domain robots/terms/parser maintenance increases operational cost.

Use only when:

- no approved structured feed/API exists;
- employer identity and official domain are clear;
- automated access is not prohibited;
- structured facts can be extracted without copying full copyrighted descriptions.

Do not make broad careers-page scraping the primary GWR backbone while stronger structured sources are available.

---

# Structural Revenue Intelligence — what raw facts can support now

## GO metrics for V1

These are defensible from source/history data:

1. **Demand Growth** — change in active/new job counts by category/language/employer/time window.
2. **Employer Recurrence** — repeated hiring by employer/category over rolling windows.
3. **Remote Eligibility** — source-provided remote/workplace/location evidence plus explicit region evidence.
4. **Flexibility** — employment type/commitment/contract evidence when supplied.
5. **Pay** — only where explicit numeric compensation is supplied; strongest on Lever and Ashby.
6. **Currency Mix** — only among records with explicit compensation currency.
7. **Source Reliability** — provider-policy status + freshness + successful revalidation history.
8. **Job Survival Time** — first seen / first published to confirmed closed.
9. **Hiring Velocity** — new postings per employer/category over time.
10. **Japanese Advantage** — only explicit Japanese-language/Japan-market requirement; no soft inference.

## TEST metric

**English Accessibility**

Use only explicit evidence (for example, a stated English level or explicit indication that English is not required). Missing language text must remain `unknown`, not be interpreted as accessible.

## Do not score yet

- Competition — applicant counts are not available consistently.
- Application Friction — form length/steps would require extra provider-specific collection and can create brittle maintenance.
- Income Volatility — job postings alone do not provide actual realized income variance.
- Entry Ease — seniority/experience text is an imperfect proxy and should not be collapsed into a score without evidence rules.

---

# Minimal V1 composite recommendation

Do not create a large opaque score yet.

A defensible first Structural Revenue ranking can use only:

- explicit Japanese requirement
- demand growth
- explicit compensation normalized to a common period/currency when possible
- employer recurrence
- remote/Japan eligibility evidence
- employment flexibility
- source reliability

Every component must expose its evidence and confidence. Unknown values must not silently become zero.

---

# Schema gaps found in current GWR core

The current schema is close, but Source Verification found three important mismatches:

1. `source_policy` / `sources.access_method` support `official`, `api`, `rss`, `index_only`, `blocked`, but **do not have a generic `feed` value**. Workable's approved XML source is an official structured feed, not RSS.
2. `jobs` has `first_seen_at` but no **`published_at`**, even though Workable, Ashby and Greenhouse can provide source publication timestamps.
3. `jobs` has a Japan boolean/confidence but no **`eligible_region` / eligibility evidence field**, which makes region-specific remote rules difficult to audit.

Recommended Core delta, not implemented by this research branch:

- add `feed` to source access classifications;
- add nullable `published_at`;
- add nullable `eligible_region` (or structured eligibility evidence);
- optionally add `source_docs_url`, `source_terms_url`, `policy_checked_at`, and `minimum_refresh_seconds` to `sources` so source permissions remain auditable.

---

# What to cut now

- SmartRecruiters bulk/API ingestion.
- Workable authenticated employer API.
- employer-token integrations.
- application submission APIs on Lever/Greenhouse/Ashby/Workable.
- full job-description storage/republication.
- broad generic careers scraping as the primary ingest strategy.
- Competition / Application Friction / Income Volatility / Entry Ease scores in V1.
- paid labor-market intelligence APIs while raw-source history is still sufficient for core demand/hiring metrics.

---

# Best next action for GWR Core

Implement **Workable XML ingest first** as the breadth/history backbone:

1. streaming parse `https://www.workable.com/boards/workable.xml`;
2. ingest only structured fields;
3. keep official URL unchanged;
4. normalize employer/title/location/remote/type/category/date;
5. snapshot hourly at most;
6. mark missing jobs as pending-close, then confirm on a second snapshot;
7. create history deltas;
8. compute first Demand Growth / Employer Recurrence / Remote Ratio / Survival metrics.

Then add **Lever Postings API** as source #2 for remote + structured compensation coverage.

This two-source combination already supports meaningful proprietary GWR intelligence without buying a labor-market-intelligence dataset.
