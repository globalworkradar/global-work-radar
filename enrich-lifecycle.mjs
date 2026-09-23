import { readFile, writeFile } from 'node:fs/promises';

const JOBS = new URL('./data/verified-jobs.json', import.meta.url);
const HISTORY = new URL('./data/workable-candidate-history.jsonl', import.meta.url);
const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.now();

const readJson = async (url, fallback) => {
  try { return JSON.parse(await readFile(url, 'utf8')); } catch { return fallback; }
};

const readJsonl = async (url) => {
  try {
    const text = await readFile(url, 'utf8');
    return text.split('\n').filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch {
    return [];
  }
};

const payload = await readJson(JOBS, { records: [] });
const history = await readJsonl(HISTORY);
const historyByJob = new Map();
for (const event of history) {
  if (!event?.job_id) continue;
  if (!historyByJob.has(event.job_id)) historyByJob.set(event.job_id, []);
  historyByJob.get(event.job_id).push(event);
}

const ageDaysFor = (job) => {
  const raw = job.publishedAt || job.firstSeenAt || job.lastVerifiedAt;
  if (!raw) return null;
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return null;
  return Number((Math.max(0, now - ts) / DAY_MS).toFixed(1));
};

const lifecycleState = (ageDays) => {
  if (ageDays === null) return 'UNKNOWN';
  if (ageDays <= 1) return 'NEW_24H';
  if (ageDays <= 3) return 'NEW_3D';
  if (ageDays <= 7) return 'FRESH_7D';
  if (ageDays < 30) return 'ACTIVE';
  if (ageDays < 60) return 'AGING_30D';
  if (ageDays < 90) return 'LONG_RUNNING_60D';
  return 'STALE_RISK_90D';
};

const recentChanged = (events) => events.some((event) => {
  if (event?.change_type !== 'changed' || !event?.observed_at) return false;
  const ts = Date.parse(event.observed_at);
  return Number.isFinite(ts) && now - ts <= 7 * DAY_MS;
});

const lifecycleFor = (job) => {
  const ageDays = ageDaysFor(job);
  const events = historyByJob.get(job.id) || [];
  const closedEvents = events.filter((event) => event.status === 'closed');
  const lastClosed = closedEvents.at(-1)?.observed_at || null;
  const reopened = closedEvents.length > 0 && job.status === 'VERIFIED ACTIVE';
  const changedRecently = recentChanged(events) || job.change_type === 'changed';
  const state = lifecycleState(ageDays);

  let staleRisk = 'LOW';
  if (state === 'LONG_RUNNING_60D') staleRisk = 'REVIEW';
  if (state === 'STALE_RISK_90D') staleRisk = 'ELEVATED';
  if (reopened && staleRisk === 'LOW') staleRisk = 'REVIEW';

  return {
    state,
    observed_age_days: ageDays,
    reopened_after_confirmed_close: reopened,
    confirmed_close_count: closedEvents.length,
    last_confirmed_closed_at: lastClosed,
    changed_within_7d: changedRecently,
    stale_risk: staleRisk,
    policy: 'Age/repost/change signals are review indicators, not proof of a ghost job.'
  };
};

const hiringIntentFor = (job, lifecycle) => {
  let score = 50;
  const positive = ['official_source_currently_verified_active'];
  const negative = [];

  if (lifecycle.observed_age_days !== null && lifecycle.observed_age_days <= 7) {
    score += 15;
    positive.push('fresh_posting_signal');
  } else if (lifecycle.observed_age_days !== null && lifecycle.observed_age_days < 30) {
    score += 10;
    positive.push('recent_posting_signal');
  }

  const momentum = job.hiringMomentum?.state;
  if (momentum === 'HIRING_UP' || momentum === 'NEW_EMPLOYER_SIGNAL') {
    score += 15;
    positive.push('employer_hiring_momentum_positive');
  } else if (momentum === 'HIRING_DOWN') {
    score -= 10;
    negative.push('employer_hiring_momentum_negative');
  }

  if (lifecycle.changed_within_7d) {
    score += 10;
    positive.push('posting_recently_changed');
  }

  if (lifecycle.state === 'LONG_RUNNING_60D') {
    score -= 10;
    negative.push('long_running_60d');
  } else if (lifecycle.state === 'STALE_RISK_90D') {
    score -= 20;
    negative.push('stale_risk_90d');
  }

  if (lifecycle.reopened_after_confirmed_close) {
    score -= 10;
    negative.push('reopened_after_confirmed_close');
  }

  score = Math.max(0, Math.min(100, score));
  const level = score >= 75 ? 'STRONG_EVIDENCE' : score >= 55 ? 'MODERATE_EVIDENCE' : 'WEAK_EVIDENCE';

  return {
    evidence_score: score,
    signal_level: level,
    positive_signals: positive,
    caution_signals: negative,
    is_hiring_probability: false,
    is_ghost_job_determination: false,
    rule: 'Evidence score ranks observable hiring-intent signals only; it is not a probability that the employer will hire.'
  };
};

const records = (payload.records || []).map((job) => {
  const lifecycle = lifecycleFor(job);
  return {
    ...job,
    lifecycle,
    hiringIntent: hiringIntentFor(job, lifecycle)
  };
});

const countBy = (items, selector) => items.reduce((acc, item) => {
  const key = selector(item) || 'UNKNOWN';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

const reopenedCount = records.filter((job) => job.lifecycle?.reopened_after_confirmed_close).length;
const recentlyChangedCount = records.filter((job) => job.lifecycle?.changed_within_7d).length;

payload.records = records;
payload.intelligence = {
  ...(payload.intelligence || {}),
  lifecycle: {
    state_counts: countBy(records, (job) => job.lifecycle?.state),
    stale_risk_counts: countBy(records, (job) => job.lifecycle?.stale_risk),
    reopened_after_confirmed_close_count: reopenedCount,
    changed_within_7d_count: recentlyChangedCount,
    thresholds_days: { aging: 30, long_running: 60, stale_risk: 90 },
    rule: 'Long-running and reopened postings are review signals, not automatic ghost-job labels.'
  },
  hiring_intent: {
    signal_level_counts: countBy(records, (job) => job.hiringIntent?.signal_level),
    score_is_probability: false,
    ghost_job_classifier: false,
    evidence_inputs: ['official active verification', 'posting age', 'employer hiring momentum', 'recent posting change', 'confirmed close/reopen history']
  }
};

await writeFile(JOBS, JSON.stringify(payload, null, 2) + '\n');
console.log(`GWR lifecycle enriched: ${records.length} jobs`);
console.log(`Lifecycle states: ${JSON.stringify(payload.intelligence.lifecycle.state_counts)}`);
console.log(`Hiring intent levels: ${JSON.stringify(payload.intelligence.hiring_intent.signal_level_counts)}`);
