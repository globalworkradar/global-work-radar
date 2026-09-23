import fs from 'node:fs';
import crypto from 'node:crypto';

const HANDOFF_PATH = 'data/publishing-data-insight-candidates.jsonl';
const DEFAULT_RETURN_DESTINATION = 'https://global-work-radar.pages.dev/';
const FORBIDDEN_ASSERTIONS = Object.freeze([
  'this_job_will_make_money',
  'japanese_people_can_apply_as_a_group',
  'this_role_is_easy_to_get_hired_for',
]);

function cleanString(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text || null;
}

function cleanList(value) {
  if (!Array.isArray(value)) return null;
  const items = value.map(cleanString).filter(Boolean);
  return items.length ? [...new Set(items)] : null;
}

function isHttps(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 20);
}

export function validateCandidate(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['candidate must be a JSON object'], candidate: null };
  }

  if (input.evidence_confirmed !== true) {
    errors.push('evidence_confirmed must be true; hypotheses and unverified market claims are not Publishing candidates');
  }
  if (input.freshness_checked !== true) {
    errors.push('freshness_checked must be true; stale or unchecked labor-market claims are not Publishing candidates');
  }

  const returnDestination = cleanString(input.return_destination) || DEFAULT_RETURN_DESTINATION;
  if (!isHttps(returnDestination)) errors.push('return_destination must be HTTPS');

  const candidate = {
    record_type: 'publishing_data_insight_candidate',
    source_brand: 'Global Work Radar',
    handoff_only: true,
    evidence_confirmed: input.evidence_confirmed === true,
    freshness_checked: input.freshness_checked === true,
    topic: cleanString(input.topic),
    finding: cleanString(input.finding),
    data_scope: cleanString(input.data_scope),
    as_of: cleanString(input.as_of),
    general_user_value: cleanString(input.general_user_value),
    evidence_refs: cleanList(input.evidence_refs),
    claim_limits: cleanList(input.claim_limits),
    source_refs: cleanList(input.source_refs),
    return_destination: returnDestination,
    search_or_reader_signal: cleanString(input.search_or_reader_signal),
    requested_followup_data: cleanString(input.requested_followup_data),
    forbidden_assertions: [...FORBIDDEN_ASSERTIONS],
  };

  for (const field of ['topic', 'finding', 'data_scope', 'as_of', 'general_user_value']) {
    if (!candidate[field]) errors.push(`${field} is required`);
  }
  if (!candidate.evidence_refs?.length) errors.push('evidence_refs is required');
  if (!candidate.source_refs?.length) errors.push('source_refs is required so Publishing can audit the originating GWR data');
  if (!candidate.claim_limits?.length) errors.push('claim_limits is required so Publishing cannot silently strengthen the data claim');

  if (errors.length) return { ok: false, errors, candidate: null };

  const identity = {
    topic: candidate.topic,
    finding: candidate.finding,
    data_scope: candidate.data_scope,
    as_of: candidate.as_of,
    evidence_refs: candidate.evidence_refs,
    source_refs: candidate.source_refs,
  };

  return {
    ok: true,
    errors: [],
    candidate: {
      ...candidate,
      candidate_id: `gwr-publishing-${fingerprint(identity)}`,
      recorded_at: new Date().toISOString(),
    },
  };
}

function readLog() {
  if (!fs.existsSync(HANDOFF_PATH)) return [];
  return fs.readFileSync(HANDOFF_PATH, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`invalid JSONL at line ${index + 1}: ${error.message}`);
      }
    });
}

function validateStoredRecord(record, index) {
  const checked = validateCandidate({
    ...record,
    evidence_confirmed: record?.evidence_confirmed === true,
    freshness_checked: record?.freshness_checked === true,
  });
  if (!checked.ok) throw new Error(`invalid Publishing handoff record at line ${index + 1}: ${checked.errors.join('; ')}`);
  if (record.record_type !== 'publishing_data_insight_candidate') throw new Error(`invalid record_type at line ${index + 1}`);
  if (record.source_brand !== 'Global Work Radar' || record.handoff_only !== true) throw new Error(`GWR/Publishing role boundary missing at line ${index + 1}`);
  if (!cleanString(record.candidate_id)) throw new Error(`candidate_id missing at line ${index + 1}`);
  if (!Array.isArray(record.forbidden_assertions) || FORBIDDEN_ASSERTIONS.some((item) => !record.forbidden_assertions.includes(item))) {
    throw new Error(`forbidden assertion guard missing at line ${index + 1}`);
  }
}

export function validateLog() {
  const records = readLog();
  const seen = new Set();
  records.forEach((record, index) => {
    validateStoredRecord(record, index);
    if (seen.has(record.candidate_id)) throw new Error(`duplicate candidate_id: ${record.candidate_id}`);
    seen.add(record.candidate_id);
  });
  return records.length;
}

export function recordCandidate(input) {
  const checked = validateCandidate(input);
  if (!checked.ok) throw new Error(checked.errors.join('; '));

  const records = readLog();
  if (records.some((record) => record.candidate_id === checked.candidate.candidate_id)) {
    return { appended: false, candidate: checked.candidate };
  }

  fs.mkdirSync('data', { recursive: true });
  fs.appendFileSync(HANDOFF_PATH, JSON.stringify(checked.candidate) + '\n');
  return { appended: true, candidate: checked.candidate };
}

function usage() {
  console.log('Usage:');
  console.log('  node publishing-handoff.mjs --validate-log');
  console.log('  node publishing-handoff.mjs --record <candidate.json>');
}

const [mode, arg] = process.argv.slice(2);
if (mode === '--validate-log') {
  const count = validateLog();
  console.log(`Publishing handoff log valid: ${count} candidate(s)`);
} else if (mode === '--record' && arg) {
  const input = JSON.parse(fs.readFileSync(arg, 'utf8'));
  const result = recordCandidate(input);
  console.log(`${result.appended ? 'Recorded' : 'Already recorded'}: ${result.candidate.candidate_id}`);
} else if (process.argv[1]?.endsWith('publishing-handoff.mjs')) {
  usage();
  process.exitCode = 2;
}
