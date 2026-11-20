import type { Application, ApplicationStatus, ChatLog, Lead, LeadStatus } from "../types";
import type { Store } from "./types";
import { seedData } from "./seed";

/**
 * In-memory store for local development and zero-config demos. Data lives for
 * the lifetime of the server process (on Vercel: one warm function instance),
 * so set DATABASE_URL for anything real.
 */
export class MemoryStore implements Store {
  readonly kind = "memory" as const;
  private leads = new Map<string, Lead>();
  private apps = new Map<string, Application>();
  private chats: ChatLog[] = [];

  constructor(seed = true) {
    if (seed) {
      const s = seedData();
      s.leads.forEach((l) => this.leads.set(l.id, l));
      s.applications.forEach((a) => this.apps.set(a.code, a));
      this.chats = s.chats;
    }
  }

  async createLead(lead: Lead) {
    this.leads.set(lead.id, structuredClone(lead));
  }
  async getLead(id: string) {
    const l = this.leads.get(id);
    return l ? structuredClone(l) : null;
  }
  async listLeads() {
    return [...this.leads.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((l) => structuredClone(l));
  }
  async updateLeadStatus(id: string, status: LeadStatus) {
    const l = this.leads.get(id);
    if (!l) return null;
    l.status = status;
    return structuredClone(l);
  }
  async bookSlot(id: string, slotIso: string) {
    const l = this.leads.get(id);
    if (!l || l.bookedSlot) return false;
    for (const other of this.leads.values()) if (other.bookedSlot === slotIso) return false;
    l.bookedSlot = slotIso;
    return true;
  }
  async listBookedSlots(fromIso: string) {
    return [...this.leads.values()].map((l) => l.bookedSlot).filter((s): s is string => !!s && s >= fromIso);
  }

  async createApplication(app: Application) {
    this.apps.set(app.code, structuredClone(app));
  }
  async getApplication(code: string) {
    const a = this.apps.get(code);
    return a ? structuredClone(a) : null;
  }
  async listApplications() {
    return [...this.apps.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((a) => structuredClone(a));
  }
  async updateApplicationStatus(code: string, status: ApplicationStatus, note?: string) {
    const a = this.apps.get(code);
    if (!a) return null;
    a.status = status;
    a.history.push({ status, at: new Date().toISOString(), ...(note ? { note } : {}) });
    return structuredClone(a);
  }

  async logChat(log: ChatLog) {
    this.chats.unshift(log);
    if (this.chats.length > 500) this.chats.length = 500;
  }
  async listChats(limit = 100) {
    return this.chats.slice(0, limit);
  }
}
