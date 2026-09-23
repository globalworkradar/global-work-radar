import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';

const FEED_URL = 'https://www.workable.com/boards/workable.xml';
const LOCAL_XML = process.env.WORKABLE_XML_FILE || '';
const DATA_DIR = new URL('./data/', import.meta.url);
const CURRENT_FILE = new URL('./data/workable-current.json', import.meta.url);
const STATE_FILE = new URL('./data/workable-state.json.gz', import.meta.url);
const LEGACY_STATE_FILE = new URL('./data/workable-state.json', import.meta.url);
const CANDIDATE_HISTORY_FILE = new URL('./data/workable-candidate-history.jsonl', import.meta.url);
const MARKET_FILE = new URL('./data/workable-market.json', import.meta.url);
const MARKET_HISTORY_FILE = new URL('./data/workable-market-history.jsonl', import.meta.url);

const decode = (value = '') => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i')); return m ? decode(m[1]) : ''; };
const stripHtml = (v = '') => decode(v.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
const sha = (v) => createHash('sha256').update(v).digest('hex');
const idFor = (ref, url) => `workable-${(ref || sha(url).slice(0, 16)).toLowerCase()}`;
const iso = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };

const readState = async () => {
  try { return JSON.parse(gunzipSync(await readFile(STATE_FILE)).toString('utf8')); } catch {}
  try { return JSON.parse(await readFile(LEGACY_STATE_FILE, 'utf8')); } catch {}
  return { jobs: {}, last_observed_at: null };
};
const unpack = (prev) => Array.isArray(prev)
  ? { fingerprint: prev[0], first_seen_at: prev[1], missing_count: prev[2] || 0, candidate: prev[3] === 1, closed_at: prev[4] || null }
  : { fingerprint: prev?.fingerprint, first_seen_at: prev?.first_seen_at, missing_count: prev?.missing_count || 0, candidate: !!prev?.candidate, closed_at: prev?.closed_at || null };

const inferEligibility = ({ country, text, remote }) => {
  const c = String(country || '').trim().toLowerCase();
  const t = String(text || '').toLowerCase();
  if (c === 'japan' || c === 'jp') return { japan_eligible: true, confidence: 0.98, eligible_region: 'Japan', evidence: 'Source country field explicitly identifies Japan.' };
  if (/must (?:be|live|reside|be located) in japan|based in japan|located in japan|japan residents?|residents? of japan/.test(t)) return { japan_eligible: true, confidence: 0.95, eligible_region: 'Japan', evidence: 'Role text explicitly requires or allows Japan residence/location.' };
  if (/us only|united states only|must reside in (?:the )?us|u\.s\. only/.test(t)) return { japan_eligible: false, confidence: 0.95, eligible_region: 'US only', evidence: 'Explicit US-only restriction.' };
  if (remote && /worldwide|anywhere in the world|global remote|work from anywhere/.test(t)) return { japan_eligible: true, confidence: 0.75, eligible_region: 'Worldwide', evidence: 'Worldwide signal found; secondary verification required before publication.' };
  return { japan_eligible: null, confidence: 0.2, eligible_region: c ? country : null, evidence: 'No reliable Japan-eligibility evidence.' };
};

const classify = (title, category, text) => {
  const t = `${title} ${category} ${text}`.toLowerCase();
  if (/evaluator|rater|ai trainer|model trainer|quality rater/.test(t)) return 'AI Trainer / Evaluator';
  if (/annotat|labeling|data collection/.test(t)) return 'Data Annotation';
  if (/locali[sz]ation|linguist/.test(t)) return 'Localization';
  if (/translation|translator/.test(t)) return 'Translation';
  if (/customer support|customer service|customer success/.test(t)) return 'Customer Support';
  return category || 'Other';
};

const observedAt = new Date().toISOString();
const previousState = await readState();
const previousJobs = previousState.jobs || {};
const candidateRecords = [];
const nextStateJobs = {};
const candidateHistoryEvents = [];
const employerCounts = new Map();
const survivalDays = [];
let sawJob = false;
let active = 0, verifiedJapanEligible = 0, japanese = 0, remote = 0, newJobs = 0;

const processJob = (item) => {
  const title = tag(item, 'title'); const company = tag(item, 'company'); const ref = tag(item, 'referencenumber'); const url = tag(item, 'url');
  if (!title || !company || !url) return;
  sawJob = true; active++;
  const city = tag(item, 'city'); const state = tag(item, 'state'); const country = tag(item, 'country');
  const remoteFlag = tag(item, 'remote').toLowerCase() === 'true'; if (remoteFlag) remote++;
  const description = stripHtml(tag(item, 'description'));
  const jobType = tag(item, 'jobtype'); const sourceCategory = tag(item, 'category'); const experience = tag(item, 'experience');
  const eligibility = inferEligibility({ country, text: `${title} ${description}`, remote: remoteFlag });
  const publishable = eligibility.japan_eligible === true && eligibility.confidence >= 0.8;
  if (publishable) verifiedJapanEligible++;
  const japaneseRequired = /\bjapanese\b|日本語|nihongo/i.test(`${title} ${description}`); if (japaneseRequired) japanese++;
  const id = idFor(ref, url);
  const fingerprint = sha(JSON.stringify({ title, company, url, city, state, country, remoteFlag, jobType, sourceCategory, experience })).slice(0, 16);
  const rawPrev = previousJobs[id]; const prev = rawPrev ? unpack(rawPrev) : null;
  const changeType = !prev ? 'first_seen' : prev.fingerprint === fingerprint ? 'unchanged' : 'changed'; if (!prev) newJobs++;
  const firstSeen = prev?.first_seen_at || observedAt;
  const survival = (new Date(observedAt) - new Date(firstSeen)) / 86400000; if (Number.isFinite(survival) && survival >= 0) survivalDays.push(survival);
  employerCounts.set(company, (employerCounts.get(company) || 0) + 1);
  nextStateJobs[id] = [fingerprint, firstSeen, 0, publishable ? 1 : 0, null];
  if (publishable && changeType !== 'unchanged') candidateHistoryEvents.push({ job_id: id, observed_at: observedAt, status: 'verified_active', fingerprint, change_type: changeType });
  if (!publishable) return;

  candidateRecords.push({
    id, canonical_key: sha(`${company.toLowerCase()}|${title.toLowerCase()}|${url}`).slice(0, 24), source_name: 'Workable', source_url: url,
    official_url: url, source_reference: ref || null, employer: company, title, location: [city, state, country].filter(Boolean).join(', ') || null,
    eligible_region: eligibility.eligible_region, eligibility_evidence: eligibility.evidence, remote_type: remoteFlag ? 'remote' : 'unknown',
    japan_eligible: true, japan_eligibility_confidence: eligibility.confidence, japanese_required: japaneseRequired,
    english_level: null, employment_type: jobType || null, compensation_min: null, compensation_max: null, compensation_currency: null,
    compensation_period: null, category: classify(title, sourceCategory, description), published_at: iso(tag(item, 'date')), first_seen_at: firstSeen,
    last_verified_at: observedAt, expires_at: null, closed_at: null, verification_status: 'verified_active', source_status: 'active', source_policy: 'feed',
    source_attribution: 'Workable', quality_score: 0.9, publishable: true, change_type: changeType, fingerprint
  });
};

const consumeChunks = async (iterable) => {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of iterable) {
    buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
    let start;
    while ((start = buffer.search(/<job(?:\s[^>]*)?>/i)) >= 0) {
      const endMatch = buffer.slice(start).match(/<\/job>/i); if (!endMatch) break;
      const end = start + endMatch.index + endMatch[0].length; processJob(buffer.slice(start, end)); buffer = buffer.slice(end);
    }
    if (buffer.length > 2_000_000 && !/<job/i.test(buffer)) buffer = buffer.slice(-2000);
  }
  buffer += decoder.decode();
};

if (LOCAL_XML) {
  await consumeChunks(createReadStream(LOCAL_XML, { highWaterMark: 1024 * 1024 }));
} else {
  const response = await fetch(FEED_URL, { headers: { 'user-agent': 'GlobalWorkRadar/0.7' } });
  if (!response.ok || !response.body) throw new Error(`Workable feed fetch failed: ${response.status} ${response.statusText}`);
  await consumeChunks(response.body);
}
if (!sawJob) throw new Error('Workable feed failed structural validation: no jobs found.');

let closedNow = 0;
for (const [id, rawPrev] of Object.entries(previousJobs)) {
  if (nextStateJobs[id]) continue;
  const prev = unpack(rawPrev);
  const missingCount = prev.missing_count + 1;
  const closedAt = missingCount >= 2 ? (prev.closed_at || observedAt) : prev.closed_at;
  if (missingCount >= 2 && !prev.closed_at) {
    closedNow++;
    if (prev.candidate) candidateHistoryEvents.push({ job_id: id, observed_at: observedAt, status: 'closed', fingerprint: prev.fingerprint, change_type: 'closed' });
  }
  if (missingCount <= 30) nextStateJobs[id] = [prev.fingerprint, prev.first_seen_at, missingCount, prev.candidate ? 1 : 0, closedAt];
}

survivalDays.sort((a,b)=>a-b);
const median = (arr) => arr.length ? arr.length % 2 ? arr[(arr.length - 1) / 2] : (arr[arr.length/2 - 1] + arr[arr.length/2]) / 2 : null;
const market = {
  source: 'workable', snapshot_at: observedAt, active_jobs: active, verified_japan_eligible_jobs: verifiedJapanEligible, japanese_jobs: japanese,
  remote_jobs: remote, candidate_jobs_saved: candidateRecords.length, new_jobs_since_previous_snapshot: newJobs,
  closed_jobs_confirmed_this_snapshot: closedNow, remote_ratio: active ? remote / active : 0,
  employer_recurrence_count: [...employerCounts.values()].filter((n) => n > 1).length,
  median_observed_survival_days: median(survivalDays), intelligence_status: previousState.last_observed_at ? 'history_available' : 'baseline_only'
};

await mkdir(DATA_DIR, { recursive: true });
await writeFile(CURRENT_FILE, JSON.stringify({ source: 'workable', fetched_at: observedAt, total_active_count: active, count: candidateRecords.length, records: candidateRecords }, null, 2) + '\n');
await writeFile(STATE_FILE, gzipSync(JSON.stringify({ source: 'workable', last_observed_at: observedAt, jobs: nextStateJobs }), { level: 9 }));
await writeFile(MARKET_FILE, JSON.stringify(market, null, 2) + '\n');
await appendFile(MARKET_HISTORY_FILE, JSON.stringify(market) + '\n');
if (candidateHistoryEvents.length) await appendFile(CANDIDATE_HISTORY_FILE, candidateHistoryEvents.map((e) => JSON.stringify(e)).join('\n') + '\n');
console.log(JSON.stringify(market, null, 2));
