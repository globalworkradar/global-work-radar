-- GWR revenue-event receiver v1: unverified inbound claims only.
CREATE TABLE IF NOT EXISTS gwr_events (
 event_id TEXT PRIMARY KEY,
 event_type TEXT NOT NULL,
 occurred_at TEXT NOT NULL,
 source TEXT NOT NULL,
 is_test INTEGER NOT NULL CHECK (is_test IN (0,1)),
 verification TEXT NOT NULL CHECK (verification='UNVERIFIED'),
 received_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS gwr_events_received_at_idx ON gwr_events(received_at);
