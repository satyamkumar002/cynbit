import { randomBytes } from "node:crypto";

// No 0/O/1/I/L so codes are easy to read out over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function code(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Unguessable id used in blueprint share links. */
export const leadId = () => `bp_${randomBytes(9).toString("base64url")}`;
/** Short human-friendly code, e.g. BE-7K3QX9 */
export const applicationCode = () => `BE-${code(6)}`;
export const chatId = () => `ch_${randomBytes(8).toString("base64url")}`;
