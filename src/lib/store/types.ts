import type { Application, ApplicationStatus, ChatLog, Lead, LeadStatus } from "../types";

export interface Store {
  readonly kind: "postgres" | "memory";

  createLead(lead: Lead): Promise<void>;
  getLead(id: string): Promise<Lead | null>;
  listLeads(): Promise<Lead[]>;
  updateLeadStatus(id: string, status: LeadStatus): Promise<Lead | null>;
  /** Atomically books a slot. Returns false if the slot is already taken. */
  bookSlot(id: string, slotIso: string): Promise<boolean>;
  listBookedSlots(fromIso: string): Promise<string[]>;

  createApplication(app: Application): Promise<void>;
  getApplication(code: string): Promise<Application | null>;
  listApplications(): Promise<Application[]>;
  updateApplicationStatus(code: string, status: ApplicationStatus, note?: string): Promise<Application | null>;

  logChat(log: ChatLog): Promise<void>;
  listChats(limit?: number): Promise<ChatLog[]>;
}
