import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { config } from "./config.js";

mkdirSync(path.dirname(config.dbPath), { recursive: true });
export const db = new DatabaseSync(config.dbPath);
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY,
  region TEXT NOT NULL,              -- 'UK' | 'Costa Blanca'
  name TEXT NOT NULL,
  website TEXT,
  domain TEXT,
  phone TEXT,
  email TEXT,
  contact_name TEXT,
  address TEXT,
  category TEXT,
  source TEXT,                       -- places | companies_house | inbound | referral
  source_ref TEXT UNIQUE,
  entity_type TEXT,                  -- ltd | llp | plc | sole_trader | partnership | sl | autonomo | unknown
  british_run REAL,                  -- 0..1 confidence
  fit_score INTEGER,                 -- 0..100
  insights TEXT,                     -- JSON: tech audit + research notes
  status TEXT NOT NULL DEFAULT 'new',-- new | enriched | queued | contacted | replied | meeting | customer | lost | suppressed
  stage_step INTEGER NOT NULL DEFAULT 0,
  next_action_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS suppression (
  value TEXT PRIMARY KEY,            -- email address or domain
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  channel TEXT NOT NULL,             -- email | whatsapp | portal | social
  direction TEXT NOT NULL,           -- in | out
  thread_key TEXT NOT NULL,          -- phone number, email address or ticket id
  lead_id INTEGER,
  ticket_id INTEGER,
  subject TEXT,
  body TEXT NOT NULL,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS messages_thread ON messages(thread_key, created_at);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  plan TEXT,
  users INTEGER,
  domain TEXT,
  contact_email TEXT,
  contact_whatsapp TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  name TEXT,
  email TEXT UNIQUE,
  whatsapp TEXT UNIQUE,
  is_admin INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  requester TEXT NOT NULL,           -- email or phone
  requester_name TEXT,
  channel TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'P3',  -- P1..P4
  status TEXT NOT NULL DEFAULT 'open',  -- open | waiting_customer | escalated | resolved | closed
  assignee TEXT NOT NULL DEFAULT 'ai',
  sla_due_at TEXT,
  external_ref TEXT,                    -- id in legacy portal (patchingguy) when migrated
  summary TEXT,
  csat INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,                -- outreach_email | social_post | quote | refund
  payload TEXT NOT NULL,             -- JSON
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | sent | failed
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  agent TEXT NOT NULL,
  kind TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = any;

export function logEvent(agent: string, kind: string, detail: unknown = null) {
  db.prepare("INSERT INTO events (agent, kind, detail) VALUES (?, ?, ?)").run(
    agent, kind, detail == null ? null : JSON.stringify(detail),
  );
}

export function all(sql: string, ...params: any[]): Row[] {
  return db.prepare(sql).all(...params) as Row[];
}
export function one(sql: string, ...params: any[]): Row | undefined {
  return db.prepare(sql).get(...params) as Row | undefined;
}
export function run(sql: string, ...params: any[]) {
  return db.prepare(sql).run(...params);
}
