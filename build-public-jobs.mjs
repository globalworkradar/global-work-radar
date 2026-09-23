import { readFile, writeFile } from 'node:fs/promises';

const LEVER = new URL('./data/lever-verified-seed.json', import.meta.url);
const WORKABLE = new URL('./data/workable-current.json', import.meta.url);
const BENCHMARKS = new URL('./labor-benchmarks.json', import.meta.url);
const OUT = new URL('./data/verified-jobs.json', import.meta.url);

const readJson = async (url, fallback) => {
  try { return JSON.parse(await readFile(url, 'utf8')); } catch { return fallback; }
};

const previous = await readJson(OUT, { records: [] });
const lever = await readJson(LEVER, { records: [] });
const workable = await readJson(WORKABLE, { records: [] });
const benchmarks = await readJson(BENCHMARKS, { occupations: [] });

const MAX_LEVER_AGE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.now();

const isFreshLeverRecord = (job) => {
  if (job.status !== 'VERIFIED ACTIVE') return false;
  if (!job.lastVerifiedAt) return false;
  const verifiedAt = Date.parse(job.lastVerifiedAt);
  if (!Number.isFinite(verifiedAt)) return false;
  return now - verifiedAt <= MAX_LEVER_AGE_DAYS * DAY_MS;
};

const leverPublic = (lever.records || []).filter(isFreshLeverRecord);

const workablePublic = (workable.records || [])
  .filter((job) => job.publishable === true && job.verification_status === 'verified_active')
  .map((job) => ({
    id: job.id,
    employer: job.employer,
    title: job.title,
    category: job.category,
    location: job.location || job.eligible_region || 'Location not specified',
    remote: job.remote_type,
    japan: job.japan_eligible === true,
    japanese: job.japanese_required === true,
    english: job.english_level,
    payMin: job.compensation_min,
    payMax: job.compensation_max,
    currency: job.compensation_currency,
    period: job.compensation_period,
    verified: `Verified ${String(job.last_verified_at || '').slice(0, 10)}`,
    status: 'VERIFIED ACTIVE',
    url: job.official_url,
    source: 'Workable',
    confidence: job.japan_eligibility_confidence >= 0.8 ? 'high' : 'medium',
    eligibilityEvidence: job.eligibility_evidence || null,
    publishedAt: job.published_at || null,
    firstSeenAt: job.first_seen_at || null,
    lastVerifiedAt: job.last_verified_at || null
  }));

const merged = [...leverPublic, ...workablePublic];
const seen = new Set();
const baseRecords = merged.filter((job) => {
  const key = String(job.url || job.id || '').toLowerCase();
  if (!key || seen.has(key)) return false;
  seen.add(key);
  return true;
});

const countByEmployer = (records) => {
  const counts = new Map();
  for (const job of records || []) {
    const employer = String(job.employer || 'Unknown');
    counts.set(employer, (counts.get(employer) || 0) + 1);
  }
  return counts;
};

const previousEmployerCounts = countByEmployer(previous.records || []);
const currentEmployerCounts = countByEmployer(baseRecords);

const freshnessFor = (job) => {
  const primary = job.publishedAt || job.firstSeenAt;
  const fallback = job.lastVerifiedAt;
  const raw = primary || fallback;
  if (!raw) return { bucket: 'UNKNOWN', age_days: null, basis: null };
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return { bucket: 'UNKNOWN', age_days: null, basis: null };
  const ageDays = Math.max(0, (now - timestamp) / DAY_MS);

  if (!primary) {
    return {
      bucket: 'RECENTLY_VERIFIED',
      age_days: Number(ageDays.toFixed(1)),
      basis: 'lastVerifiedAt_fallback'
    };
  }

  let bucket = 'LONG_RUNNING';
  if (ageDays <= 1) bucket = 'NEW_24H';
  else if (ageDays <= 3) bucket = 'NEW_3D';
  else if (ageDays <= 7) bucket = 'FRESH_7D';

  return {
    bucket,
    age_days: Number(ageDays.toFixed(1)),
    basis: job.publishedAt ? 'publishedAt' : 'firstSeenAt'
  };
};

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const hourlyByCategory = new Map();
for (const job of baseRecords) {
  if (job.currency !== 'USD' || job.period !== 'hour' || !Number(job.payMin)) continue;
  const category = job.category || 'Other';
  if (!hourlyByCategory.has(category)) hourlyByCategory.set(category, []);
  hourlyByCategory.get(category).push(Number(job.payMin));
}

const categoryPay = Object.fromEntries(
  [...hourlyByCategory.entries()]
    .map(([category, values]) => [category, {
      sample_count: values.length,
      median_usd_hourly: Number(median(values).toFixed(2)),
      min_usd_hourly: Math.min(...values),
      max_usd_hourly: Math.max(...values)
    }])
    .sort((a, b) => b[1].sample_count - a[1].sample_count)
);

const matchLaborBenchmark = (job) => {
  const title = String(job.title || '').toLowerCase();
  for (const benchmark of benchmarks.occupations || []) {
    const matched = (benchmark.title_patterns || []).some((pattern) => title.includes(String(pattern).toLowerCase()));
    if (!matched) continue;
    return {
      matched: true,
      occupation: benchmark.occupation,
      soc: benchmark.soc,
      growth_2025_2035_pct: benchmark.growth_2025_2035_pct,
      growth_vs_all_occupations_pct_points: Number((benchmark.growth_2025_2035_pct - (benchmarks.baseline_all_occupations_growth_pct || 0)).toFixed(1)),
      median_annual_wage_usd_2025: benchmark.median_annual_wage_usd_2025,
      ai_exposure_category: benchmark.ai_exposure_category,
      source_url: benchmark.source_url,
      benchmark_scope: 'US_long_term_not_Japan_specific'
    };
  }
  return {
    matched: false,
    occupation: null,
    soc: null,
    growth_2025_2035_pct: null,
    growth_vs_all_occupations_pct_points: null,
    median_annual_wage_usd_2025: null,
    ai_exposure_category: null,
    source_url: null,
    benchmark_scope: null
  };
};

const records = baseRecords.map((job) => {
  const currentEmployerJobs = currentEmployerCounts.get(job.employer) || 0;
  const previousEmployerJobs = previousEmployerCounts.get(job.employer) || 0;
  const delta = currentEmployerJobs - previousEmployerJobs;
  const momentum = previousEmployerJobs === 0
    ? 'NEW_EMPLOYER_SIGNAL'
    : delta > 0
      ? 'HIRING_UP'
      : delta < 0
        ? 'HIRING_DOWN'
        : 'STEADY';

  const category = job.category || 'Other';
  const categoryStats = categoryPay[category] || null;
  const jobPay = job.currency === 'USD' && job.period === 'hour' ? Number(job.payMin) || null : null;
  const payVsCategoryPct = jobPay && categoryStats?.median_usd_hourly
    ? Number((((jobPay / categoryStats.median_usd_hourly) - 1) * 100).toFixed(1))
    : null;

  return {
    ...job,
    freshness: freshnessFor(job),
    hiringMomentum: {
      state: momentum,
      employer_jobs_previous_snapshot: previousEmployerJobs,
      employer_jobs_current_snapshot: currentEmployerJobs,
      delta
    },
    skillSalary: {
      category,
      category_sample_count: categoryStats?.sample_count || 0,
      category_median_usd_hourly: categoryStats?.median_usd_hourly || null,
      pay_vs_category_median_pct: payVsCategoryPct,
      scope: 'GWR_verified_inventory_only'
    },
    laborBenchmark: matchLaborBenchmark(job)
  };
});

const freshnessCounts = records.reduce((acc, job) => {
  const bucket = job.freshness?.bucket || 'UNKNOWN';
  acc[bucket] = (acc[bucket] || 0) + 1;
  return acc;
}, {});

const employerMomentum = [...currentEmployerCounts.entries()]
  .map(([employer, currentCount]) => {
    const previousCount = previousEmployerCounts.get(employer) || 0;
    const delta = currentCount - previousCount;
    return {
      employer,
      previous_count: previousCount,
      current_count: currentCount,
      delta,
      state: previousCount === 0 ? 'NEW_EMPLOYER_SIGNAL' : delta > 0 ? 'HIRING_UP' : delta < 0 ? 'HIRING_DOWN' : 'STEADY'
    };
  })
  .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.current_count - a.current_count);

const laborBenchmarkMatches = records.filter((job) => job.laborBenchmark?.matched).length;

const output = {
  generated_at: new Date().toISOString(),
  policy: 'verified_active_structured_facts_only',
  freshness_policy: {
    lever_max_age_days: MAX_LEVER_AGE_DAYS,
    stale_or_unverified_records_fail_closed: true,
    public_freshness_buckets: ['NEW_24H', 'NEW_3D', 'FRESH_7D', 'LONG_RUNNING', 'RECENTLY_VERIFIED', 'UNKNOWN']
  },
  source_counts: {
    lever: leverPublic.length,
    workable_publishable: workablePublic.length
  },
  intelligence: {
    freshness_counts: freshnessCounts,
    employer_momentum: employerMomentum,
    category_pay_usd_hourly: categoryPay,
    labor_benchmark: {
      source: benchmarks.source || null,
      as_of: benchmarks.as_of || null,
      baseline_all_occupations_growth_pct: benchmarks.baseline_all_occupations_growth_pct || null,
      matched_job_count: laborBenchmarkMatches,
      total_job_count: records.length,
      ai_exposure_source_url: benchmarks.ai_exposure_source_url || null,
      ai_exposure_rule: 'Do not infer automation or job loss from exposure; category remains null until official occupation mapping is verified.'
    }
  },
  count: records.length,
  records
};

await writeFile(OUT, JSON.stringify(output, null, 2) + '\n');
console.log(`GWR public jobs built: ${records.length}`);
console.log(`Freshness buckets: ${JSON.stringify(freshnessCounts)}`);
console.log(`Labor benchmark matches: ${laborBenchmarkMatches}/${records.length}`);
