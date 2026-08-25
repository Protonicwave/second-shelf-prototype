PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS markdown_decision (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_id TEXT NOT NULL,
  trading_date TEXT NOT NULL,
  decision_hour INTEGER NOT NULL,
  plan_json TEXT NOT NULL,
  assumptions_json TEXT NOT NULL,
  value_at_risk_pence INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS markdown_decision_line_idx ON markdown_decision (line_id);
CREATE INDEX IF NOT EXISTS markdown_decision_trading_date_idx ON markdown_decision (trading_date);

CREATE TABLE IF NOT EXISTS decision_override (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_id INTEGER NOT NULL REFERENCES markdown_decision (id) ON DELETE CASCADE,
  applied_hour INTEGER NOT NULL,
  applied_reduction REAL NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS decision_override_decision_idx ON decision_override (decision_id);
