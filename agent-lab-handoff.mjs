import fs from 'node:fs';
import crypto from 'node:crypto';

const HANDOFF_PATH = 'data/agent-lab-field-note-candidates.jsonl';
const REQUIRED_FIELDS = Object.freeze([
  'executed',
  'outcome',
  'cause',
  'fix',
  'external_evidence',
  'reusable_pattern',
  'field_note_value',
]);

function cleanString(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text : null;
}

function normalizeEvidence(value) {
  if (Array.isArray(value)) {
    const items = value.map(cleanString).filter(Boolean);
    return items.length ? items : null;
  }
  const text = cleanString(value);
  return text ? [text] : null;
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
    errors.push('evidence_confirmed must be true; hypotheses and incomplete investigations are not handoff candidates');
  }

  const candidate = {
    record_type: 'agent_lab_field_note_candidate',
    source_brand: 'Global Work Radar',
    handoff_only: true,
    evidence_confirmed: input.evidence_confirmed === true,
    executed: cleanString(input.executed),
    outcome: cleanString(input.outcome),
    cause: cleanString(input.cause),
    fix: cleanString(input.fix),
    external_evidence: normalizeEvidence(input.external_evidence),
    reusable_pattern: cleanString(input.reusable_pattern),
    field_note_value: cleanString(input.field_note_value),
    source_ref: cleanString(input.source_ref),
    revenue_route_id: cleanString(input.revenue_route_id),
    observed_at: cleanString(input.observed_at),
  };

  for (const field of REQUIRED_FIELDS) {
    if (field === 'external_evidence') {
      if (!candidate.external_evidence?.length) errors.push('external_evidence is required');
    } else if (!candidate[field]) {
      errors.push(`${field} is required`);
    }
  }

  if (!candidate.source_ref) {
    errors.push('source_ref is required so Agent Lab can audit the originating GWR evidence');
  }

  if (errors.length) return { ok: false, errors, candidate: null };

  const identity = {
    executed: candidate.executed,
    outcome: candidate.outcome,
    cause: candidate.cause,
    fix: candidate.fix,
    external_evidence: candidate.external_evidence,
    reusable_pattern: candidate.reusable_pattern,
    source_ref: candidate.source_ref,
  };

  return {
    ok: true,
    errors: [],
    candidate: {
      ...candidate,
      candidate_id: `gwr-field-note-${fingerprint(identity)}`,
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
  const checked = validateCandidate({ ...record, evidence_confirmed: record?.evidence_confirmed === true });
  if (!checked.ok) {
    throw new Error(`invalid Agent Lab handoff record at line ${index + 1}: ${checked.errors.join('; ')}`);
  }
  if (record.record_type !== 'agent_lab_field_note_candidate') {
    throw new Error(`invalid record_type at line ${index + 1}`);
  }
  if (record.source_brand !== 'Global Work Radar' || record.handoff_only !== true) {
    throw new Error(`GWR/Agent Lab role boundary missing at line ${index + 1}`);
  }
  if (!cleanString(record.candidate_id)) {
    throw new Error(`candidate_id missing at line ${index + 1}`);
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
  console.log('  node agent-lab-handoff.mjs --validate-log');
  console.log('  node agent-lab-handoff.mjs --record <candidate.json>');
}

const [mode, arg] = process.argv.slice(2);
if (mode === '--validate-log') {
  const count = validateLog();
  console.log(`Agent Lab handoff log valid: ${count} candidate(s)`);
} else if (mode === '--record' && arg) {
  const input = JSON.parse(fs.readFileSync(arg, 'utf8'));
  const result = recordCandidate(input);
  console.log(`${result.appended ? 'Recorded' : 'Already recorded'}: ${result.candidate.candidate_id}`);
} else if (process.argv[1]?.endsWith('agent-lab-handoff.mjs')) {
  usage();
  process.exitCode = 2;
}
