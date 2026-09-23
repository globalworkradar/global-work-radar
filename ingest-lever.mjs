import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const ROOT = new URL('./', import.meta.url);
const WATCHLIST = new URL('./company-watchlist.json', ROOT);
const OUT = new URL('./data/staging-lever.json', ROOT);

const watchlist = JSON.parse(await readFile(WATCHLIST, 'utf8'));
const companies = watchlist.companies.filter((c) => c.status.startsWith('active_watch'));
const verifiedAt = new Date().toISOString();
const records = [];

const keyFor = (site, id) => createHash('sha256').update(`${site}|${id}`).digest('hex').slice(0, 24);
const clean = (value = '') => String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const hasJapanese = (text) => /\bjapanese\b|日本語|日本人|nihongo/i.test(text);
const looksJapanEligible = (text) => /\bjapan\b|tokyo|日本|worldwide|anywhere in the world|global/i.test(text);
const explicitlyNotJapan = (text) => /except japan|excluding japan|not available in japan/i.test(text);

for (const company of companies) {
  const endpoint = `https://api.lever.co/v0/postings/${encodeURIComponent(company.lever_site)}?mode=json`;
  const response = await fetch(endpoint, { headers: { 'user-agent': 'GlobalWorkRadar/0.2' } });
  if (!response.ok) throw new Error(`Lever fetch failed for ${company.lever_site}: ${response.status}`);
  const postings = await response.json();

  for (const posting of postings) {
    const text = clean(`${posting.text || ''} ${posting.description || ''} ${posting.descriptionPlain || ''} ${posting.additional || ''} ${JSON.stringify(posting.categories || {})}`);
    if (!hasJapanese(text)) continue;

    const categories = posting.categories || {};
    const location = categories.location || '';
    const workplace = categories.workplaceType || '';
    const combined = `${text} ${location} ${workplace}`;
    const japanEligible = !explicitlyNotJapan(combined) && looksJapanEligible(combined);

    records.push({
      id: `lever-${keyFor(company.lever_site, posting.id)}`,
      canonical_key: keyFor(company.lever_site, posting.id),
      source_name: `Lever / ${company.name}`,
      source_url: posting.hostedUrl || posting.applyUrl,
      official_url: posting.applyUrl || posting.hostedUrl,
      employer: company.name,
      title: posting.text,
      location: location || null,
      remote_type: /remote/i.test(`${workplace} ${location}`) ? 'remote' : 'unknown',
      japan_eligible: japanEligible,
      japan_eligible_confidence: japanEligible ? 'medium' : 'low',
      japanese_required: true,
      english_level: null,
      employment_type: categories.commitment || null,
      compensation_min: null,
      compensation_max: null,
      compensation_currency: null,
      compensation_period: null,
      category: categories.team || categories.department || 'Remote Contractor',
      first_seen_at: verifiedAt,
      last_verified_at: verifiedAt,
      source_status: 'active',
      source_policy: 'official_ats',
      publishable: false,
      publish_blocker: japanEligible
        ? 'Role-level eligibility and application destination require validation before publication.'
        : 'Japan eligibility is not confirmed.'
    });
  }
}

await mkdir(new URL('./data/', ROOT), { recursive: true });
await writeFile(OUT, JSON.stringify({
  source: 'lever-curated-watchlist',
  fetched_at: verifiedAt,
  count: records.length,
  policy: 'fail_closed',
  records
}, null, 2) + '\n');

console.log(`GWR Lever ingest complete: ${records.length} Japanese-signal records staged`);
console.log(`Output: ${OUT.pathname}`);
