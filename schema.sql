CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  canonical_key TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  official_url TEXT NOT NULL,
  employer TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  eligible_region TEXT,
  eligibility_evidence TEXT,
  remote_type TEXT CHECK (remote_type IN ('remote','hybrid','onsite','unknown')) DEFAULT 'unknown',
  japan_eligible INTEGER CHECK (japan_eligible IN (0,1)) DEFAULT 0,
  japan_eligibility_confidence REAL DEFAULT 0,
  japanese_required INTEGER CHECK (japanese_required IN (0,1)) DEFAULT 0,
  english_level TEXT,
  employment_type TEXT,
  compensation_min REAL,
  compensation_max REAL,
  compensation_currency TEXT,
  compensation_period TEXT,
  category TEXT,
  workload_volume_min REAL,
  workload_volume_max REAL,
  workload_unit TEXT,
  workload_period TEXT,
  availability_pay_amount REAL,
  availability_pay_currency TEXT,
  availability_pay_period TEXT,
  paid_idle_time INTEGER CHECK (paid_idle_time IN (0,1)),
  other_work_permitted INTEGER CHECK (other_work_permitted IN (0,1)),
  non_exclusive INTEGER CHECK (non_exclusive IN (0,1)),
  simultaneous_work_allowed INTEGER CHECK (simultaneous_work_allowed IN (0,1)),
  response_sla_minutes INTEGER,
  application_status TEXT CHECK (application_status IN ('open','paused','closed','unknown')) DEFAULT 'unknown',
  work_structure_evidence TEXT,
  work_structure_verified_at TEXT,
  published_at TEXT,
  first_seen_at TEXT NOT NULL,
  last_verified_at TEXT NOT NULL,
  expires_at TEXT,
  closed_at TEXT,
  verification_status TEXT CHECK (verification_status IN ('verified_active','active_low_confidence','closed','unknown','rejected')) DEFAULT 'unknown',
  source_status TEXT CHECK (source_status IN ('active','expired','blocked','unknown')) DEFAULT 'unknown',
  source_policy TEXT CHECK (source_policy IN ('official','api','rss','feed','index_only','blocked')) NOT NULL,
  source_reference TEXT,
  quality_score REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(verification_status, last_verified_at);
CREATE INDEX IF NOT EXISTS idx_jobs_japan ON jobs(japan_eligible, remote_type);
CREATE INDEX IF NOT EXISTS idx_jobs_language ON jobs(japanese_required, english_level);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_comp ON jobs(compensation_currency, compensation_min);
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer, last_verified_at);
CREATE INDEX IF NOT EXISTS idx_jobs_published ON jobs(published_at);
CREATE INDEX IF NOT EXISTS idx_jobs_work_structure ON jobs(paid_idle_time, other_work_permitted, simultaneous_work_allowed, non_exclusive);

CREATE TABLE IF NOT EXISTS job_history (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  title TEXT,
  location TEXT,
  eligible_region TEXT,
  remote_type TEXT,
  compensation_min REAL,
  compensation_max REAL,
  compensation_currency TEXT,
  compensation_period TEXT,
  workload_volume_min REAL,
  workload_volume_max REAL,
  workload_unit TEXT,
  workload_period TEXT,
  availability_pay_amount REAL,
  availability_pay_currency TEXT,
  availability_pay_period TEXT,
  paid_idle_time INTEGER CHECK (paid_idle_time IN (0,1)),
  other_work_permitted INTEGER CHECK (other_work_permitted IN (0,1)),
  non_exclusive INTEGER CHECK (non_exclusive IN (0,1)),
  simultaneous_work_allowed INTEGER CHECK (simultaneous_work_allowed IN (0,1)),
  response_sla_minutes INTEGER,
  application_status TEXT,
  official_url TEXT,
  fingerprint TEXT NOT NULL,
  change_type TEXT CHECK (change_type IN ('first_seen','unchanged','changed','missing_once','closed','reopened')) NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_job_history_job_time ON job_history(job_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_job_history_change ON job_history(change_type, observed_at);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  careers_url TEXT,
  ats_provider TEXT,
  ats_site_key TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  active_job_count INTEGER DEFAULT 0,
  japanese_job_count INTEGER DEFAULT 0,
  remote_job_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_snapshots (
  id TEXT PRIMARY KEY,
  snapshot_at TEXT NOT NULL UNIQUE,
  active_jobs INTEGER DEFAULT 0,
  japan_eligible_jobs INTEGER DEFAULT 0,
  japanese_jobs INTEGER DEFAULT 0,
  remote_jobs INTEGER DEFAULT 0,
  median_hourly_usd REAL,
  new_jobs_24h INTEGER DEFAULT 0,
  closed_jobs_24h INTEGER DEFAULT 0,
  payload_json TEXT
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  access_method TEXT CHECK (access_method IN ('official','api','rss','feed','index_only','blocked')) NOT NULL,
  documentation_url TEXT,
  terms_url TEXT,
  terms_checked_at TEXT,
  robots_checked_at TEXT,
  min_refresh_minutes INTEGER,
  attribution_required INTEGER CHECK (attribution_required IN (0,1)) DEFAULT 0,
  active INTEGER CHECK (active IN (0,1)) DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingest_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  discovered INTEGER DEFAULT 0,
  inserted INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  expired INTEGER DEFAULT 0,
  rejected INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('running','success','partial','failed')) NOT NULL,
  error TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);
