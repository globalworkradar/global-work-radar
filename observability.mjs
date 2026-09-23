import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

const JOBS_PATH = 'data/verified-jobs.json';
const LATEST_PATH = 'data/observability-latest.json';
const HISTORY_PATH = 'data/observability-history.jsonl';
const BASELINE_REF = process.env.GWR_BASELINE_REF || 'HEAD';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function readBaseline() {
  try {
    const text = execFileSync('git', ['show', `${BASELINE_REF}:${JOBS_PATH}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    });
    return JSON.parse(text);
  } catch (error) {
    console.warn(`GWR baseline unavailable from ${BASELINE_REF}: ${error?.message || error}`);
    return null;
  }
}

function stableRecord(record) {
  return {
    id: record?.id ?? null,
    employer: record?.employer ?? null,
    title: record?.title ?? null,
    category: record?.category ?? null,
    location: record?.location ?? null,
    remote: record?.remote ?? null,
    japan: record?.japan ?? null,
    japanese: record?.japanese ?? null,
    english: record?.english ?? null,
    payMin: record?.payMin ?? null,
    payMax: record?.payMax ?? null,
    currency: record?.currency ?? null,
    period: record?.period ?? null,
    status: record?.status ?? null,
    url: record?.url ?? null,
    source: record?.source ?? null,
    confidence: record?.confidence ?? null,
    eligibilityEvidence: record?.eligibilityEvidence ?? null,
    publishedAt: record?.publishedAt ?? null,
    freshness_bucket: record?.freshness?.bucket ?? null,
    hiring_momentum_state: record?.hiringMomentum?.state ?? null,
    lifecycle_state: record?.lifecycle?.state ?? null,
    lifecycle_reopened: record?.lifecycle?.reopened_after_confirmed_close ?? false,
    lifecycle_stale_risk: record?.lifecycle?.stale_risk ?? null,
    hiring_intent_level: record?.hiringIntent?.signal_level ?? null,
    skill_salary_category_median: record?.skillSalary?.category_median_usd_hourly ?? null,
    labor_benchmark_soc: record?.laborBenchmark?.soc ?? null,
  };
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function indexById(payload) {
  return new Map((payload?.records || []).map((record) => [record.id, record]));
}

function validate(payload) {
  const records = payload?.records;
  const hardErrors = [];
  const warnings = [];

  if (!Array.isArray(records)) hardErrors.push('records must be an array');
  if (!Array.isArray(records)) return { hardErrors, warnings };
  if (payload.count !== records.length) hardErrors.push(`count mismatch: payload=${payload.count} records=${records.length}`);

  const seen = new Set();
  for (const [index, record] of records.entries()) {
    if (!record?.id) hardErrors.push(`record[${index}] missing id`);
    if (record?.id && seen.has(record.id)) hardErrors.push(`duplicate id: ${record.id}`);
    if (record?.id) seen.add(record.id);
    if (!record?.url || !String(record.url).startsWith('https://')) hardErrors.push(`record ${record?.id || index} has non-HTTPS/missing url`);
    if (record?.japan !== true) warnings.push(`record ${record?.id || index} is not explicitly japan=true`);
    if (record?.status !== 'VERIFIED ACTIVE') warnings.push(`record ${record?.id || index} status=${record?.status ?? 'missing'}`);
  }

  return { hardErrors, warnings };
}

const current = readJson(JOBS_PATH);
const baseline = readBaseline();
const validation = validate(current);

if (validation.hardErrors.length) {
  console.error('GWR observability hard validation failed:');
  for (const error of validation.hardErrors) console.error(`- ${error}`);
  process.exit(1);
}

const currentIndex = indexById(current);
const baselineIndex = indexById(baseline || { records: [] });

const added = [];
const removed = [];
const changed = [];

for (const [id, record] of currentIndex) {
  if (!baselineIndex.has(id)) {
    added.push(id);
    continue;
  }
  const before = stableRecord(baselineIndex.get(id));
  const after = stableRecord(record);
  if (digest(before) !== digest(after)) {
    const fields = Object.keys(after).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    changed.push({ id, fields });
  }
}
for (const id of baselineIndex.keys()) {
  if (!currentIndex.has(id)) removed.push(id);
}

const sourceCounts = current.source_counts || {};
const meaningfulChangeCount = added.length + removed.length + changed.length;
const observedAt = new Date().toISOString();
const evidence = {
  schema_version: 1,
  observed_at: observedAt,
  run: {
    github_run_id: process.env.GITHUB_RUN_ID || null,
    github_run_attempt: process.env.GITHUB_RUN_ATTEMPT || null,
    github_sha: process.env.GITHUB_SHA || null,
    baseline_ref: BASELINE_REF,
  },
  inventory: {
    previous_count: baseline?.count ?? null,
    current_count: current.count,
    source_counts: sourceCounts,
  },
  change_detection: {
    meaningful_change_count: meaningfulChangeCount,
    added_count: added.length,
    removed_count: removed.length,
    changed_count: changed.length,
    added_ids: added,
    removed_ids: removed,
    changed,
  },
  intelligence: {
    lifecycle: current?.intelligence?.lifecycle || null,
    hiring_intent: current?.intelligence?.hiring_intent || null,
  },
  verification: {
    hard_errors: [],
    warnings: validation.warnings,
    evidence_rule: 'Agent completion is not evidence; repository state and externally verifiable artifacts are evidence.',
  },
  revenue_truth: {
    revenue_evidence: false,
    note: 'Inventory change, visit, search, apply, test, bot, automation, open checkout, or unverified state is not revenue.',
  },
};

const summary = [
  '## GWR Observability',
  `- Inventory: ${baseline?.count ?? 'n/a'} → ${current.count}`,
  `- Added: ${added.length}`,
  `- Removed: ${removed.length}`,
  `- Meaningfully changed: ${changed.length}`,
  `- Lifecycle stale-risk 90d: ${current?.intelligence?.lifecycle?.state_counts?.STALE_RISK_90D || 0}`,
  `- Reopened after confirmed close: ${current?.intelligence?.lifecycle?.reopened_after_confirmed_close_count || 0}`,
  `- Validation warnings: ${validation.warnings.length}`,
  `- Revenue evidence: false (market-data change only)`,
].join('\n') + '\n';

if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary.trim());

// Keep repository evidence only when something meaningful changed or a warning appeared.
// No-change runs remain visible in GitHub Actions without creating noisy commits.
if (meaningfulChangeCount > 0 || validation.warnings.length > 0 || baseline === null) {
  fs.writeFileSync(LATEST_PATH, JSON.stringify(evidence, null, 2) + '\n');

  const existing = fs.existsSync(HISTORY_PATH)
    ? fs.readFileSync(HISTORY_PATH, 'utf8').split('\n').filter(Boolean)
    : [];
  existing.push(JSON.stringify(evidence));
  fs.writeFileSync(HISTORY_PATH, existing.slice(-500).join('\n') + '\n');
  console.log(`Observability evidence written: ${LATEST_PATH}`);
} else {
  console.log('No meaningful market change; repository evidence not rewritten.');
}
