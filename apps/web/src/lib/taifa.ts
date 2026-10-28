/**
 * Taifa Mobile SMS API v2 helpers (no app imports, so they are unit-testable).
 * The v1 endpoint (`/sms/sendsms` with an `api-key` header) has been retired.
 */
export const TAIFA_SMS_URL = "https://api.taifamobile.co.ke/v2/sms/sendsms";

/** Only approved sender on the account; used when no sender env var is set. */
export const TAIFA_DEFAULT_SENDER = "SIDNET";

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/^["']|["']$/g, "").trim() || undefined;
}

export function taifaApiKey() {
  return cleanEnv(process.env.TAIFA_API_KEY);
}

export function taifaSenderName() {
  return (
    cleanEnv(process.env.TAIFA_SENDER_NAME) ??
    cleanEnv(process.env.TAIFA_SENDER_ID) ??
    TAIFA_DEFAULT_SENDER
  );
}

/** E.164 (+2547…) → Taifa's `2547…` format (no plus). */
export function taifaMobile(e164: string) {
  return e164.replace(/^\+/, "");
}

/**
 * Taifa always answers HTTP 200 with `[{ status_code, status_desc, … }]`
 * (or a bare object). Returns null on success (`1000`), else an error string.
 */
export function taifaRejection(text: string): string | null {
  let row: { status_code?: string | number; status_desc?: string } | undefined;
  try {
    const parsed = JSON.parse(text) as unknown;
    row = (Array.isArray(parsed) ? parsed[0] : parsed) as typeof row;
  } catch {
    return `Bad response from Taifa: ${text.slice(0, 120)}`;
  }
  const code = String(row?.status_code ?? "");
  if (code === "1000") return null;
  return `Taifa ${code || "?"}: ${row?.status_desc ?? text.slice(0, 120)}`;
}

/** message_id from a successful response body, if present. */
export function taifaMessageId(text: string): string | undefined {
  try {
    const parsed = JSON.parse(text) as unknown;
    const row = (Array.isArray(parsed) ? parsed[0] : parsed) as
      | { message_id?: string | number }
      | undefined;
    return row?.message_id != null ? String(row.message_id) : undefined;
  } catch {
    return undefined;
  }
}
