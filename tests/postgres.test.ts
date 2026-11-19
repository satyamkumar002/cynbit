/**
 * Runs the real PostgresStore (postgres.js over TCP) against PGlite, an
 * in-process Postgres, so the SQL, JSONB handling and the UNIQUE booking
 * constraint are tested without installing a database.
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PostgresStore } from "../src/lib/store/postgres";
import { seedData } from "../src/lib/store/seed";

const PORT = 55432 + Math.floor(Math.random() * 1000);
let server: PGLiteSocketServer;
let db: PGlite;

before(async () => {
  db = await PGlite.create();
  server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1" });
  await server.start();
});

after(async () => {
  await server.stop();
  await db.close();
});

test("PostgresStore: leads, booking constraint, applications, chat log", async () => {
  const s = new PostgresStore(`postgres://postgres:postgres@127.0.0.1:${PORT}/postgres`);
  const { leads, applications, chats } = seedData();
  await s.createLead({ ...leads[0], id: "bp_t1" });
  await s.createLead({ ...leads[1], id: "bp_t2" });
  assert.equal((await s.getLead("bp_t1"))?.input.contact.name, leads[0].input.contact.name);
  assert.equal(await s.getLead("missing"), null);

  const slot = "2026-11-23T06:00:00.000Z";
  assert.equal(await s.bookSlot("bp_t1", slot), true);
  assert.equal(await s.bookSlot("bp_t2", slot), false, "slot is unique across leads");
  assert.equal(await s.bookSlot("bp_t1", "2026-11-23T06:30:00.000Z"), false, "one call per lead");
  assert.deepEqual(await s.listBookedSlots("2026-11-01T00:00:00.000Z"), [slot]);
  assert.equal((await s.getLead("bp_t1"))?.bookedSlot, slot);

  assert.equal((await s.updateLeadStatus("bp_t2", "won"))?.status, "won");
  assert.equal((await s.listLeads()).length, 2);

  await s.createApplication(applications[0]);
  const updated = await s.updateApplicationStatus(applications[0].code, "under-review", "Looks good");
  assert.equal(updated?.history.at(-1)?.note, "Looks good");
  assert.equal((await s.getApplication(applications[0].code))?.status, "under-review");

  await s.logChat(chats[0]);
  assert.equal((await s.listChats())[0].question, chats[0].question);
});
