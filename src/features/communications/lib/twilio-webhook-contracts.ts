import { z } from "zod";

const accountSidSchema = z.string().regex(/^AC[a-fA-F0-9]{32}$/);

export const twilioSmsStatusSchema = z.object({
  AccountSid: accountSidSchema,
  MessageSid: z.string().regex(/^SM[a-fA-F0-9]{32}$/),
  MessageStatus: z.string().trim().min(1),
  ErrorCode: z.string().trim().optional(),
  To: z.string().trim().optional(),
  From: z.string().trim().optional(),
  NumSegments: z.string().regex(/^\d+$/).optional(),
  Price: z.string().regex(/^-?\d+(?:\.\d+)?$/).optional(),
  PriceUnit: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
}).passthrough();

export const twilioInboundSmsSchema = z.object({
  AccountSid: accountSidSchema,
  MessageSid: z.string().regex(/^SM[a-fA-F0-9]{32}$/),
  From: z.string().trim().min(1),
  To: z.string().trim().min(1),
  Body: z.string().max(1_600).default(""),
  NumSegments: z.string().regex(/^\d+$/).default("1"),
  NumMedia: z.string().regex(/^\d+$/).default("0"),
}).passthrough();

export const twilioVoiceStatusSchema = z.object({
  AccountSid: accountSidSchema,
  CallSid: z.string().regex(/^CA[a-fA-F0-9]{32}$/),
  CallStatus: z.string().trim().min(1),
  CallDuration: z.string().regex(/^\d+$/).optional(),
  From: z.string().trim().optional(),
  To: z.string().trim().optional(),
  Direction: z.string().trim().optional(),
  Timestamp: z.string().trim().optional(),
}).passthrough();

export const twilioInboundVoiceSchema = z.object({
  AccountSid: accountSidSchema,
  CallSid: z.string().regex(/^CA[a-fA-F0-9]{32}$/),
  From: z.string().trim().min(1),
  To: z.string().trim().min(1),
  FromCountry: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
}).passthrough();

export const twilioRecordingStatusSchema = z.object({
  AccountSid: accountSidSchema,
  CallSid: z.string().regex(/^CA[a-fA-F0-9]{32}$/),
  RecordingSid: z.string().regex(/^RE[a-fA-F0-9]{32}$/),
  RecordingStatus: z.string().trim().min(1),
  RecordingDuration: z.string().regex(/^\d+$/).optional(),
}).passthrough();

export function formValues(body: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(body).entries());
}
