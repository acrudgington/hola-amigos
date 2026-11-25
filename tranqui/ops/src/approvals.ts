import { all, one, run, type Row } from "./db.js";

export function queueApproval(kind: string, payload: unknown) {
  return Number(run("INSERT INTO approvals (kind, payload) VALUES (?, ?)", kind, JSON.stringify(payload)).lastInsertRowid);
}
export function pendingApprovals() {
  return all("SELECT * FROM approvals WHERE status='pending' ORDER BY created_at").map((r) => ({ ...r, payload: JSON.parse(r.payload) }));
}
export function getApproval(id: number) {
  const r = one("SELECT * FROM approvals WHERE id=?", id);
  return r ? ({ ...r, payload: JSON.parse(r.payload) } as Row) : undefined;
}
export function decide(id: number, status: "approved" | "rejected" | "sent" | "failed", note?: string, payload?: unknown) {
  run(
    "UPDATE approvals SET status=?, note=coalesce(?, note), payload=coalesce(?, payload), decided_at=datetime('now') WHERE id=?",
    status, note ?? null, payload ? JSON.stringify(payload) : null, id,
  );
}
