import { readFile, writeFile } from 'node:fs/promises';

const SEED = new URL('./data/lever-verified-seed.json', import.meta.url);
const STAGING = new URL('./data/staging-lever.json', import.meta.url);

const seed = JSON.parse(await readFile(SEED, 'utf8'));
const staging = JSON.parse(await readFile(STAGING, 'utf8'));

const normUrl = (value = '') => String(value).trim().toLowerCase().replace(/\/$/, '');
const stagingByUrl = new Map();
for (const record of staging.records || []) {
  for (const raw of [record.official_url, record.source_url]) {
    const url = normUrl(raw);
    if (url) stagingByUrl.set(url, record);
  }
}

const refreshed = [];
const missing = [];
for (const record of seed.records || []) {
  const current = stagingByUrl.get(normUrl(record.url));
  if (!current || current.source_status !== 'active' || current.japan_eligible !== true) {
    missing.push(record.id);
    continue;
  }
  refreshed.push({
    ...record,
    employer: current.employer || record.employer,
    title: current.title || record.title,
    location: current.location || record.location,
    remote: current.remote_type || record.remote,
    lastVerifiedAt: current.last_verified_at,
    verified: 'Verified ' + String(current.last_verified_at || '').slice(0, 10),
    status: 'VERIFIED ACTIVE'
  });
}

const output = {
  ...seed,
  generated_at: new Date().toISOString(),
  policy: 'official_ats_verified_exact_url_refresh',
  records: refreshed,
  refresh_evidence: {
    staged_count: (staging.records || []).length,
    refreshed_verified_count: refreshed.length,
    previously_verified_missing_count: missing.length,
    previously_verified_missing_ids: missing
  }
};

await writeFile(SEED, JSON.stringify(output, null, 2) + '\n');
console.log('GWR Lever verified seed refreshed: ' + refreshed.length);
console.log('GWR Lever previously verified missing: ' + missing.length);
