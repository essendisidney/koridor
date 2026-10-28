import { after } from "next/server";
import { NotificationChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  TAIFA_SMS_URL,
  taifaApiKey,
  taifaMessageId,
  taifaMobile,
  taifaRejection,
  taifaSenderName,
} from "@/lib/taifa";

/**
 * Outbound WhatsApp / SMS for dispatch notifications.
 *
 * Kenyan farm managers live on WhatsApp and SMS, so match "dispatch" and RFQ
 * invites are pushed to their phone as well as the in-app inbox. Providers are
 * switched by env vars like lib/payments.ts and lib/carriers.ts:
 *   - demo (default)   logs the message, row stays IN_APP
 *   - taifa            SMS via Taifa Mobile API v2 (TAIFA_*) — the default SMS route
 *   - africastalking   SMS via Africa's Talking (AFRICASTALKING_*)
 *   - twilio           WhatsApp via Twilio (TWILIO_*) — opt-in only, via MESSAGING_PROVIDER
 * Sending never blocks or fails the request: rows are written first, delivery
 * runs after the response, and the row's channel is updated on success.
 */

export type OutboundMessage = {
  to: string; // E.164, e.g. +254712345678
  title: string;
  body: string;
  url?: string;
};

export type OutboundResult = {
  ok: boolean;
  provider: string;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
};

export interface MessagingProvider {
  name: string;
  channel: NotificationChannel;
  configured(): boolean;
  send(msg: OutboundMessage): Promise<OutboundResult>;
}

const SEND_TIMEOUT_MS = 8000;
const TAIFA_TIMEOUT_MS = 20_000;

export function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

function plainText(msg: OutboundMessage) {
  return [`Koridor: ${msg.title}`, msg.body, msg.url].filter(Boolean).join("\n");
}

/** Normalise a stored phone to E.164; local Kenyan numbers default to +254. */
export function normalizePhone(raw: string | null | undefined) {
  if (!raw) return null;
  let p = raw.replace(/[\s\-().]/g, "");
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  if (!p.startsWith("+")) {
    const cc = process.env.MESSAGING_DEFAULT_COUNTRY_CODE?.trim() || "254";
    if (p.startsWith(cc)) p = `+${p}`;
    else if (p.startsWith("0")) p = `+${cc}${p.slice(1)}`;
    else p = `+${cc}${p}`;
  }
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
}

const demoProvider: MessagingProvider = {
  name: "demo",
  channel: NotificationChannel.IN_APP,
  configured: () => true,
  async send(msg) {
    console.info(`[messaging:demo] → ${msg.to}\n${plainText(msg)}`);
    // Nothing left the platform, so the row keeps its IN_APP channel.
    return { ok: false, provider: "demo", channel: NotificationChannel.IN_APP, error: "demo" };
  },
};

const twilioWhatsAppProvider: MessagingProvider = {
  name: "twilio",
  channel: NotificationChannel.WHATSAPP,
  configured: () =>
    Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.TWILIO_WHATSAPP_FROM?.trim(),
    ),
  async send(msg) {
    const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
    const token = process.env.TWILIO_AUTH_TOKEN!.trim();
    const from = process.env.TWILIO_WHATSAPP_FROM!.trim().replace(/^whatsapp:/, "");
    const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim();

    const params = new URLSearchParams();
    params.set("From", `whatsapp:${from}`);
    params.set("To", `whatsapp:${msg.to}`);
    if (contentSid) {
      // Business-initiated WhatsApp needs an approved template outside the 24h window.
      params.set("ContentSid", contentSid);
      params.set(
        "ContentVariables",
        JSON.stringify({ "1": msg.title, "2": msg.body, "3": msg.url ?? appUrl() }),
      );
    } else {
      params.set("Body", plainText(msg));
    }

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      },
    );
    const json = (await res.json().catch(() => ({}))) as {
      sid?: string;
      message?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        provider: "twilio",
        channel: NotificationChannel.WHATSAPP,
        error: json.message ?? `HTTP ${res.status}`,
      };
    }
    return { ok: true, provider: "twilio", channel: NotificationChannel.WHATSAPP, messageId: json.sid };
  },
};

const africasTalkingSmsProvider: MessagingProvider = {
  name: "africastalking",
  channel: NotificationChannel.SMS,
  configured: () =>
    Boolean(
      process.env.AFRICASTALKING_USERNAME?.trim() &&
        process.env.AFRICASTALKING_API_KEY?.trim(),
    ),
  async send(msg) {
    const username = process.env.AFRICASTALKING_USERNAME!.trim();
    const apiKey = process.env.AFRICASTALKING_API_KEY!.trim();
    const sender = process.env.AFRICASTALKING_SENDER_ID?.trim();
    const host =
      username === "sandbox"
        ? "https://api.sandbox.africastalking.com"
        : "https://api.africastalking.com";

    const params = new URLSearchParams();
    params.set("username", username);
    params.set("to", msg.to);
    params.set("message", plainText(msg));
    if (sender) params.set("from", sender);

    const res = await fetch(`${host}/version1/messaging`, {
      method: "POST",
      headers: {
        apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => ({}))) as {
      SMSMessageData?: {
        Message?: string;
        Recipients?: { status?: string; messageId?: string }[];
      };
    };
    const recipient = json.SMSMessageData?.Recipients?.[0];
    if (!res.ok || recipient?.status !== "Success") {
      return {
        ok: false,
        provider: "africastalking",
        channel: NotificationChannel.SMS,
        error: recipient?.status ?? json.SMSMessageData?.Message ?? `HTTP ${res.status}`,
      };
    }
    return {
      ok: true,
      provider: "africastalking",
      channel: NotificationChannel.SMS,
      messageId: recipient.messageId,
    };
  },
};

const taifaSmsProvider: MessagingProvider = {
  name: "taifa",
  channel: NotificationChannel.SMS,
  configured: () => Boolean(taifaApiKey()),
  async send(msg) {
    // Taifa Mobile SMS API v2. Always HTTP 200; status_code "1000" = sent.
    let text: string;
    try {
      const res = await fetch(TAIFA_SMS_URL, {
        method: "POST",
        headers: {
          h_api_key: taifaApiKey()!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: taifaMobile(msg.to),
          sender_name: taifaSenderName(),
          message: plainText(msg).slice(0, 920),
          response_type: "json",
        }),
        signal: AbortSignal.timeout(TAIFA_TIMEOUT_MS),
      });
      text = await res.text();
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        provider: "taifa",
        channel: NotificationChannel.SMS,
        error: `Taifa unreachable: ${why}`,
      };
    }
    const error = taifaRejection(text);
    if (error) {
      return { ok: false, provider: "taifa", channel: NotificationChannel.SMS, error };
    }
    return {
      ok: true,
      provider: "taifa",
      channel: NotificationChannel.SMS,
      messageId: taifaMessageId(text),
    };
  },
};

const PROVIDERS: Record<string, MessagingProvider> = {
  demo: demoProvider,
  taifa: taifaSmsProvider,
  twilio: twilioWhatsAppProvider,
  africastalking: africasTalkingSmsProvider,
};

/**
 * Ordered provider chain: MESSAGING_PROVIDER ("taifa,africastalking", "demo"…)
 * or, by default, SMS via Taifa Mobile then Africa's Talking for whichever has
 * keys. WhatsApp (twilio) is only used when named explicitly. Falls back to demo.
 */
export function messagingProviderNames() {
  const configured = process.env.MESSAGING_PROVIDER?.trim().toLowerCase();
  const wanted = configured
    ? configured.split(",").map((s) => s.trim())
    : ["taifa", "africastalking"];
  const usable = wanted.filter((n) => PROVIDERS[n]?.configured());
  return usable.length ? usable : ["demo"];
}

export function getMessagingProviders(): MessagingProvider[] {
  return messagingProviderNames().map((n) => PROVIDERS[n]);
}

/** Try each provider in order until one delivers. Never throws. */
export async function sendOutbound(msg: OutboundMessage): Promise<OutboundResult> {
  let last: OutboundResult = {
    ok: false,
    provider: "none",
    channel: NotificationChannel.IN_APP,
  };
  for (const provider of getMessagingProviders()) {
    try {
      last = await provider.send(msg);
    } catch (error) {
      last = {
        ok: false,
        provider: provider.name,
        channel: provider.channel,
        error: error instanceof Error ? error.message : "send failed",
      };
    }
    if (last.ok) return last;
  }
  return last;
}

export type DispatchNotification = {
  userId: string;
  /** Supplier org — its primary contact phone is used when the user has none. */
  organisationId?: string;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Create in-app notifications, then push each one to WhatsApp/SMS after the
 * response is sent. Notification.channel records how it was delivered.
 */
export async function createDispatchNotifications(rows: DispatchNotification[]) {
  if (!rows.length) return;
  const created = await prisma.notification.createManyAndReturn({
    data: rows.map((r) => ({
      userId: r.userId,
      title: r.title,
      body: r.body,
      link: r.link,
      metadata: r.metadata as Prisma.InputJsonValue | undefined,
    })),
    select: { id: true },
  });

  const jobs = rows.map((r, i) => ({ ...r, id: created[i]?.id })).filter((j) => j.id);
  const task = () =>
    deliverOutbound(jobs as (DispatchNotification & { id: string })[]).catch((error) =>
      console.error("[messaging] outbound dispatch failed", error),
    );
  try {
    after(task);
  } catch {
    // Outside a request scope (scripts, tests): fire and forget.
    void task();
  }
}

async function deliverOutbound(jobs: (DispatchNotification & { id: string })[]) {
  const userIds = Array.from(new Set(jobs.map((j) => j.userId)));
  const orgIds = Array.from(
    new Set(jobs.map((j) => j.organisationId).filter((id): id is string => !!id)),
  );
  const [users, contacts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true, phone: true },
    }),
    orgIds.length
      ? prisma.orgContact.findMany({
          where: { organisationId: { in: orgIds }, deletedAt: null, phone: { not: null } },
          select: { organisationId: true, phone: true, isPrimary: true },
          orderBy: { isPrimary: "desc" },
        })
      : Promise.resolve([]),
  ]);
  const userPhone = new Map(users.map((u) => [u.id, normalizePhone(u.phone)]));
  const orgPhone = new Map<string, string>();
  for (const c of contacts) {
    const phone = normalizePhone(c.phone);
    if (phone && !orgPhone.has(c.organisationId)) orgPhone.set(c.organisationId, phone);
  }

  // One message per phone per dispatch, even if several members share an org line.
  const byPhone = new Map<string, (DispatchNotification & { id: string })[]>();
  for (const job of jobs) {
    if (!userPhone.has(job.userId)) continue; // inactive user
    const phone =
      userPhone.get(job.userId) ?? (job.organisationId ? orgPhone.get(job.organisationId) : null);
    if (!phone) continue;
    byPhone.set(phone, [...(byPhone.get(phone) ?? []), job]);
  }

  const entries = Array.from(byPhone.entries());
  const CONCURRENCY = 5;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    await Promise.all(
      entries.slice(i, i + CONCURRENCY).map(async ([to, group]) => {
        const first = group[0];
        const result = await sendOutbound({
          to,
          title: first.title,
          body: first.body,
          url: first.link ? `${appUrl()}${first.link}` : undefined,
        });
        await Promise.all(
          group.map((job) =>
            prisma.notification
              .update({
                where: { id: job.id },
                data: {
                  ...(result.ok ? { channel: result.channel } : {}),
                  metadata: {
                    ...(job.metadata ?? {}),
                    outbound: {
                      provider: result.provider,
                      ok: result.ok,
                      messageId: result.messageId ?? null,
                      error: result.error ?? null,
                    },
                  } as Prisma.InputJsonValue,
                },
              })
              .catch((error) => console.error("[messaging] record failed", error)),
          ),
        );
      }),
    );
  }
}
