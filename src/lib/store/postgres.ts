import postgres from "postgres";
import type { Application, ApplicationStatus, ChatLog, Lead, LeadStatus } from "../types";
import type { Store } from "./types";

type Sql = ReturnType<typeof postgres>;

const MIGRATION = `
CREATE TABLE IF NOT EXISTS leads (
  id           TEXT PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  email        TEXT NOT NULL,
  score        INT NOT NULL,
  tier         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new',
  booked_slot  TIMESTAMPTZ UNIQUE,
  data         JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at DESC);

CREATE TABLE IF NOT EXISTS applications (
  code        TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  email       TEXT NOT NULL,
  status      TEXT NOT NULL,
  data        JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS applications_email_idx ON applications (lower(email));

CREATE TABLE IF NOT EXISTS chat_logs (
  id          TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  question    TEXT NOT NULL,
  answered    BOOLEAN NOT NULL,
  source      TEXT NOT NULL,
  top_sources JSONB NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS chat_logs_created_idx ON chat_logs (created_at DESC);
`;

export class PostgresStore implements Store {
  readonly kind = "postgres" as const;
  private sql: Sql;
  private ready: Promise<void> | null = null;

  constructor(url: string) {
    this.sql = postgres(url, { max: 3, idle_timeout: 20, prepare: false, onnotice: () => {}, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require" });
  }

  /** Idempotent schema creation, run once per server instance. */
  private init(): Promise<void> {
    this.ready ??= this.sql.unsafe(MIGRATION).then(() => undefined);
    return this.ready;
  }

  private rowToLead(r: { data: Lead; status: string; booked_slot: Date | null }): Lead {
    return { ...r.data, status: r.status as LeadStatus, bookedSlot: r.booked_slot ? new Date(r.booked_slot).toISOString() : null };
  }

  async createLead(lead: Lead) {
    await this.init();
    await this.sql`
      INSERT INTO leads (id, created_at, email, score, tier, status, data)
      VALUES (${lead.id}, ${lead.createdAt}, ${lead.input.contact.email}, ${lead.score.score}, ${lead.score.tier}, ${lead.status}, ${this.sql.json(lead as never)})`;
  }

  async getLead(id: string) {
    await this.init();
    const rows = await this.sql<{ data: Lead; status: string; booked_slot: Date | null }[]>`
      SELECT data, status, booked_slot FROM leads WHERE id = ${id}`;
    return rows[0] ? this.rowToLead(rows[0]) : null;
  }

  async listLeads() {
    await this.init();
    const rows = await this.sql<{ data: Lead; status: string; booked_slot: Date | null }[]>`
      SELECT data, status, booked_slot FROM leads ORDER BY created_at DESC LIMIT 500`;
    return rows.map((r) => this.rowToLead(r));
  }

  async updateLeadStatus(id: string, status: LeadStatus) {
    await this.init();
    await this.sql`UPDATE leads SET status = ${status} WHERE id = ${id}`;
    return this.getLead(id);
  }

  async bookSlot(id: string, slotIso: string) {
    await this.init();
    try {
      const res = await this.sql`
        UPDATE leads SET booked_slot = ${slotIso} WHERE id = ${id} AND booked_slot IS NULL`;
      return res.count === 1;
    } catch (err) {
      // 23505 = unique_violation: somebody else took the slot first
      if ((err as { code?: string }).code === "23505") return false;
      throw err;
    }
  }

  async listBookedSlots(fromIso: string) {
    await this.init();
    const rows = await this.sql<{ booked_slot: Date }[]>`
      SELECT booked_slot FROM leads WHERE booked_slot >= ${fromIso}`;
    return rows.map((r) => new Date(r.booked_slot).toISOString());
  }

  async createApplication(app: Application) {
    await this.init();
    await this.sql`
      INSERT INTO applications (code, created_at, email, status, data)
      VALUES (${app.code}, ${app.createdAt}, ${app.input.email}, ${app.status}, ${this.sql.json(app as never)})`;
  }

  async getApplication(code: string) {
    await this.init();
    const rows = await this.sql<{ data: Application }[]>`SELECT data FROM applications WHERE code = ${code}`;
    return rows[0]?.data ?? null;
  }

  async listApplications() {
    await this.init();
    const rows = await this.sql<{ data: Application }[]>`
      SELECT data FROM applications ORDER BY created_at DESC LIMIT 500`;
    return rows.map((r) => r.data);
  }

  async updateApplicationStatus(code: string, status: ApplicationStatus, note?: string) {
    await this.init();
    const app = await this.getApplication(code);
    if (!app) return null;
    const next: Application = {
      ...app,
      status,
      history: [...app.history, { status, at: new Date().toISOString(), ...(note ? { note } : {}) }],
    };
    await this.sql`UPDATE applications SET status = ${status}, data = ${this.sql.json(next as never)} WHERE code = ${code}`;
    return next;
  }

  async logChat(log: ChatLog) {
    await this.init();
    await this.sql`
      INSERT INTO chat_logs (id, created_at, question, answered, source, top_sources)
      VALUES (${log.id}, ${log.createdAt}, ${log.question}, ${log.answered}, ${log.source}, ${this.sql.json(log.topSources)})`;
  }

  async listChats(limit = 100) {
    await this.init();
    const rows = await this.sql<
      { id: string; created_at: Date; question: string; answered: boolean; source: "ai" | "fallback"; top_sources: string[] }[]
    >`SELECT * FROM chat_logs ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map((r) => ({
      id: r.id,
      createdAt: new Date(r.created_at).toISOString(),
      question: r.question,
      answered: r.answered,
      source: r.source,
      topSources: r.top_sources,
    }));
  }
}
