-- Outbound WhatsApp dispatch (lib/messaging.ts) records channel = WHATSAPP
ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'WHATSAPP';
