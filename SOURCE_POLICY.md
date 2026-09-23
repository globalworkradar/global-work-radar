# Source Policy

Global Work Radar should minimize dependency, legal ambiguity, and operational disputes.

## Preferred sources

1. Official employer careers pages
2. Official/public APIs
3. RSS/Atom feeds
4. Public structured feeds explicitly intended for distribution
5. Index-only references where reuse rights are unclear

## Professional external sensor layer

GWR may use reputable professional market, recruiting, labor-intelligence, search, analytics, and specialist discovery services as **sensors** even when their content is not eligible for republication.

The sensor layer exists to answer questions such as:

- Where is Japanese-language demand rising?
- Which roles are appearing outside the current GWR source set?
- Are headline remote pay rates moving up or down?
- Which employers or platforms deserve official-source re-verification?
- Is a high-paying `Remote` role actually open to applicants in Japan?
- Which skills, work structures, and reward models are emerging before GWR has direct coverage?

Sensor data must be classified separately from the verified public inventory:

- `SENSOR_ONLY` — useful for discovery/market observation; not safe or sufficient for a public GWR job record.
- `VERIFY_REQUIRED` — a sensor has identified a potentially valuable opportunity, but official-source, geography, compensation, freshness, or reuse verification is incomplete.
- `PUBLICATION_ELIGIBLE` — the opportunity has independently passed GWR provenance, eligibility, freshness, and source-policy checks and may enter the public verified inventory.

Rules:

- A professional sensor may trigger investigation, but it does not become the source of truth merely because it is reputable.
- Before publication, re-verify the material facts against an official employer/source whenever possible.
- Do not copy sensor-owned descriptions, screenshots, ranking text, proprietary scores, or other protected presentation into GWR.
- Keep `Remote` and `Japan eligible` as separate facts. A remote listing is not Japan eligible until geography evidence supports it.
- Keep headline pay and confirmed Japan-eligible pay as separate market signals.
- Sensor-only observations may inform internal market intelligence and public aggregate commentary only when clearly labeled and when the underlying use is permitted.
- Sensor-only observations do **not** increase `verified_cases_learned` and do not count as verified inventory.
- If a professional sensor conflicts with the official source, the official source wins.

This layer lets GWR borrow professional eyes without turning third-party content into GWR inventory or weakening the verified-source boundary.

## Do not ingest automatically

- sources whose terms prohibit automated access or redistribution
- private/member-only listings
- listings requiring authentication to obtain
- user-submitted personal data
- full copyrighted job descriptions when structured facts are sufficient
- listings with unclear employer identity or suspicious payment/application instructions

## Publication rule

A public record should contain only the structured facts necessary to help the user decide whether to inspect the original listing. Applications always route to the original/official source.

## Required provenance

Every record must retain:

- source name
- original source URL
- official application URL when available
- first-seen timestamp
- last-verified timestamp
- source-policy classification

## Fail-closed conditions

Do not publish when:

- source rights/terms are unclear enough to create material risk
- employer/listing authenticity cannot be reasonably established
- the application destination differs suspiciously from the employer/source
- Japan eligibility is represented as confirmed without sufficient evidence

## Verified provider profiles

Checked 2026-09-03. Re-check provider documentation and terms periodically because permissions can change.

### Workable global XML job feed — GO

- Official documentation explicitly describes sharing the XML feed with a job board/partner so that partner can programmatically obtain postings and publish them on its own site.
- Use `https://www.workable.com/boards/workable.xml` as an official public structured feed.
- Poll no more frequently than hourly; Workable documents hourly refresh and says more frequent consumption is unnecessary.
- Preserve the Workable job URL exactly because Workable warns that altering the URL affects source attribution.
- Publish normalized structured facts only; do not republish full descriptions.
- Applications must route to the original Workable/employer URL.
- Store provenance, source reference number, first-seen and last-verified timestamps, and history fingerprints.

Documentation: https://help.workable.com/hc/en-us/articles/4420464031767-Utilizing-the-XML-Job-Feed

### Lever public Postings API — GO

- Lever's official Postings API documentation states that published postings are publicly viewable and may be scraped by third parties.
- GET published postings without using candidate-application POST endpoints.
- Prefer structured facts such as title, locations, country, commitment, workplace type, salary range, hosted URL, and apply URL.
- Do not republish full descriptions when normalized facts are sufficient.
- Discover employer site keys through approved provenance such as the employer's official careers page; do not mass-guess site keys.
- Use conservative caching/backoff even when no public GET rate limit is documented.

Documentation: https://github.com/lever/postings-api

### Ashby lightweight public Job Postings API — TEST

- Technically public and useful for currently published postings and structured compensation.
- Official documentation frames the API primarily as a way for an organization to populate its own careers page; broad third-party commercial aggregation rights are not explicit enough for GWR to treat as blanket permission.
- Test only when the board is discovered from the employer's official careers page.
- Show only listed/public postings and structured facts; route applications externally.
- Promote to GO only after the commercial third-party indexing/reuse boundary is sufficiently clear.

Documentation: https://developers.ashbyhq.com/docs/public-job-posting-api

### Greenhouse Job Board API — TEST / INDEX-ONLY

- Greenhouse documents Job Board GET data as publicly available without authentication.
- Use only boards discovered from official employer provenance while broad third-party commercial reuse remains insufficiently explicit.
- Store/display structured facts and source timestamps; do not copy full descriptions.
- Route applications to the official Greenhouse/employer URL.
- Promote to GO only when reuse permission is clear enough for the intended commercial use.

Documentation: https://docs.greenhouse.io/job-board.html

### SmartRecruiters Posting API — BLOCKED / REJECT for systematic GWR ingestion

- SmartRecruiters states that its APIs are governed by the SAP API Policy.
- SAP API Policy v.4.2026a prohibits scraping, harvesting, or systematic and/or large-scale data extraction or replication except through expressly identified endorsed pathways intended for such purposes.
- Do not use SmartRecruiters Posting API as a scheduled cross-company GWR ingestion backbone.
- Reassess only for a specific employer or SmartRecruiters-endorsed pathway with adequate authorization.

SmartRecruiters platform policy: https://developers.smartrecruiters.com/docs/the-smartrecruiters-platform
SAP API Policy: https://help.sap.com/doc/sap-api-policy/latest/en-US/API_Policy_latest.pdf

## Source review rule

For every provider/source, record at minimum:

- access method
- documentation URL
- terms/policy URL
- date policy was checked
- minimum safe refresh interval when known
- redistribution/indexing decision
- attribution requirement when known
- official application URL behavior
- closure/revalidation strategy

If commercial indexing/reuse rights are materially unclear, downgrade to `index_only` or block ingestion rather than inferring permission from technical accessibility alone.

## Product boundary

Global Work Radar does not accept job applications, negotiate employment terms, recommend candidates to employers, store resumes for employers, perform hiring decisions, or handle compensation.