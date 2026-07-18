import { z } from "zod";

export const CAPABILITY_VALUES = [
  "commerce.view",
  "commerce.checkout.create",
  "commerce.manage",
  "commerce.refund",
  "commerce.reconcile",
  "provider.manage",
  "demo.manage",
  "messaging.view",
  "messaging.send",
  "messaging.assign",
  "messaging.manage",
  "voice.call",
  "voice.recording.view",
  "team.view",
  "team.manage",
  "compensation.view",
  "compensation.manage",
  "audience.view",
  "audience.manage",
  "publication.view",
  "publication.manage",
  "reports.view",
  "reports.manage",
  "reports.export",
  "privacy.export",
  "privacy.erase",
  "workflow.view",
  "workflow.manage",
  "settings.view",
  "settings.manage",
  "customer.view",
  "customer.manage",
  "schedule.view",
  "schedule.manage",
  "attendance.manage",
] as const;

export const capabilitySchema = z.enum(CAPABILITY_VALUES);

export type Capability = z.infer<typeof capabilitySchema>;

type CapabilityRisk = "read" | "write" | "sensitive";

type CapabilityDefinition = {
  domain: string;
  action: string;
  risk: CapabilityRisk;
};

export const CAPABILITY_REGISTRY = {
  "commerce.view": { domain: "commerce", action: "view", risk: "read" },
  "commerce.checkout.create": {
    domain: "commerce",
    action: "checkout.create",
    risk: "write",
  },
  "commerce.manage": {
    domain: "commerce",
    action: "manage",
    risk: "sensitive",
  },
  "commerce.refund": {
    domain: "commerce",
    action: "refund",
    risk: "sensitive",
  },
  "commerce.reconcile": {
    domain: "commerce",
    action: "reconcile",
    risk: "sensitive",
  },
  "provider.manage": {
    domain: "provider",
    action: "manage",
    risk: "sensitive",
  },
  "demo.manage": {
    domain: "demo",
    action: "manage",
    risk: "sensitive",
  },
  "messaging.view": { domain: "messaging", action: "view", risk: "read" },
  "messaging.send": { domain: "messaging", action: "send", risk: "write" },
  "messaging.assign": { domain: "messaging", action: "assign", risk: "write" },
  "messaging.manage": {
    domain: "messaging",
    action: "manage",
    risk: "sensitive",
  },
  "voice.call": { domain: "voice", action: "call", risk: "write" },
  "voice.recording.view": {
    domain: "voice",
    action: "recording.view",
    risk: "sensitive",
  },
  "team.view": { domain: "team", action: "view", risk: "read" },
  "team.manage": { domain: "team", action: "manage", risk: "sensitive" },
  "compensation.view": {
    domain: "compensation",
    action: "view",
    risk: "sensitive",
  },
  "compensation.manage": {
    domain: "compensation",
    action: "manage",
    risk: "sensitive",
  },
  "audience.view": { domain: "audience", action: "view", risk: "read" },
  "audience.manage": { domain: "audience", action: "manage", risk: "write" },
  "publication.view": { domain: "publication", action: "view", risk: "read" },
  "publication.manage": {
    domain: "publication",
    action: "manage",
    risk: "write",
  },
  "reports.view": { domain: "reports", action: "view", risk: "read" },
  "reports.manage": { domain: "reports", action: "manage", risk: "write" },
  "reports.export": { domain: "reports", action: "export", risk: "sensitive" },
  "privacy.export": {
    domain: "privacy",
    action: "export",
    risk: "sensitive",
  },
  "privacy.erase": {
    domain: "privacy",
    action: "erase",
    risk: "sensitive",
  },
  "workflow.view": { domain: "workflow", action: "view", risk: "read" },
  "workflow.manage": { domain: "workflow", action: "manage", risk: "write" },
  "settings.view": { domain: "settings", action: "view", risk: "read" },
  "settings.manage": {
    domain: "settings",
    action: "manage",
    risk: "sensitive",
  },
  "customer.view": { domain: "customer", action: "view", risk: "read" },
  "customer.manage": { domain: "customer", action: "manage", risk: "write" },
  "schedule.view": { domain: "schedule", action: "view", risk: "read" },
  "schedule.manage": { domain: "schedule", action: "manage", risk: "write" },
  "attendance.manage": {
    domain: "attendance",
    action: "manage",
    risk: "write",
  },
} as const satisfies Record<Capability, CapabilityDefinition>;
