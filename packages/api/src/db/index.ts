import Database from 'better-sqlite3';
import type { Assumptions, MarkdownPlan } from '@secondshelf/engine';
import { SCHEMA_SQL } from './schema.js';

/** A recommendation the engine produced, as it is handed to the log. */
export interface DecisionRecord {
  readonly lineId: string;
  readonly tradingDate: string;
  readonly decisionHour: number;
  readonly plan: MarkdownPlan;
  readonly assumptions: Assumptions;
  readonly valueAtRiskPence: number;
}

/** A recommendation as it comes back out of the log. */
export interface StoredDecision extends DecisionRecord {
  readonly id: number;
  readonly createdAt: string;
}

/** What a colleague actually did about one recorded recommendation. */
export interface StoredOverride {
  readonly id: number;
  readonly decisionId: number;
  readonly appliedHour: number;
  readonly appliedReduction: number;
  readonly reason: string | null;
  readonly createdAt: string;
}

/** An override on its way into the log. */
export interface OverrideRecord {
  readonly decisionId: number;
  readonly appliedHour: number;
  readonly appliedReduction: number;
  readonly reason: string | null;
}

/** The only way the routes touch the database. */
export interface DecisionStore {
  recordDecisions(records: readonly DecisionRecord[]): readonly number[];
  findDecision(id: number): StoredDecision | undefined;
  recordOverride(record: OverrideRecord): StoredOverride;
  listOverrides(decisionId: number): readonly StoredOverride[];
  close(): void;
}

interface DecisionRow {
  readonly id: number;
  readonly line_id: string;
  readonly trading_date: string;
  readonly decision_hour: number;
  readonly plan_json: string;
  readonly assumptions_json: string;
  readonly value_at_risk_pence: number;
  readonly created_at: string;
}

interface OverrideRow {
  readonly id: number;
  readonly decision_id: number;
  readonly applied_hour: number;
  readonly applied_reduction: number;
  readonly reason: string | null;
  readonly created_at: string;
}

const INSERT_DECISION = `INSERT INTO markdown_decision
  (line_id, trading_date, decision_hour, plan_json, assumptions_json, value_at_risk_pence, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)`;

const SELECT_DECISION = `SELECT id, line_id, trading_date, decision_hour, plan_json,
  assumptions_json, value_at_risk_pence, created_at
  FROM markdown_decision WHERE id = ?`;

const INSERT_OVERRIDE = `INSERT INTO decision_override
  (decision_id, applied_hour, applied_reduction, reason, created_at)
  VALUES (?, ?, ?, ?, ?)`;

const SELECT_OVERRIDE = `SELECT id, decision_id, applied_hour, applied_reduction, reason, created_at
  FROM decision_override WHERE id = ?`;

const SELECT_OVERRIDES_FOR_DECISION = `SELECT id, decision_id, applied_hour, applied_reduction,
  reason, created_at FROM decision_override WHERE decision_id = ? ORDER BY id`;

const toDecision = (row: DecisionRow): StoredDecision => ({
  id: row.id,
  lineId: row.line_id,
  tradingDate: row.trading_date,
  decisionHour: row.decision_hour,
  plan: JSON.parse(row.plan_json) as MarkdownPlan,
  assumptions: JSON.parse(row.assumptions_json) as Assumptions,
  valueAtRiskPence: row.value_at_risk_pence,
  createdAt: row.created_at,
});

const toOverride = (row: OverrideRow): StoredOverride => ({
  id: row.id,
  decisionId: row.decision_id,
  appliedHour: row.applied_hour,
  appliedReduction: row.applied_reduction,
  reason: row.reason,
  createdAt: row.created_at,
});

/**
 * Returns a decision log backed by the file at the given path, creating the
 * schema on first run. Pass ':memory:' for a throwaway database. Every call is
 * synchronous, which is the whole reason this service uses SQLite.
 */
export const openDecisionStore = (file: string): DecisionStore => {
  const db = new Database(file);
  db.exec(SCHEMA_SQL);
  db.pragma('foreign_keys = ON');

  const insertDecision =
    db.prepare<[string, string, number, string, string, number, string]>(INSERT_DECISION);
  const selectDecision = db.prepare<[number], DecisionRow>(SELECT_DECISION);
  const insertOverride =
    db.prepare<[number, number, number, string | null, string]>(INSERT_OVERRIDE);
  const selectOverride = db.prepare<[number], OverrideRow>(SELECT_OVERRIDE);
  const selectOverridesForDecision = db.prepare<[number], OverrideRow>(
    SELECT_OVERRIDES_FOR_DECISION,
  );

  const insertMany = db.transaction((records: readonly DecisionRecord[]): number[] => {
    const ids: number[] = [];
    const createdAt = new Date().toISOString();
    for (const record of records) {
      const result = insertDecision.run(
        record.lineId,
        record.tradingDate,
        record.decisionHour,
        JSON.stringify(record.plan),
        JSON.stringify(record.assumptions),
        record.valueAtRiskPence,
        createdAt,
      );
      ids.push(Number(result.lastInsertRowid));
    }
    return ids;
  });

  return {
    recordDecisions: (records) => (records.length === 0 ? [] : insertMany(records)),
    findDecision: (id) => {
      const row = selectDecision.get(id);
      return row === undefined ? undefined : toDecision(row);
    },
    recordOverride: (record) => {
      const result = insertOverride.run(
        record.decisionId,
        record.appliedHour,
        record.appliedReduction,
        record.reason,
        new Date().toISOString(),
      );
      const row = selectOverride.get(Number(result.lastInsertRowid));
      if (row === undefined) throw new Error('The override could not be read back');
      return toOverride(row);
    },
    listOverrides: (decisionId) => selectOverridesForDecision.all(decisionId).map(toOverride),
    close: () => {
      db.close();
    },
  };
};
