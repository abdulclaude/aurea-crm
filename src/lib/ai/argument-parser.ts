// Parse inline arguments from command messages
// Supports formats like:
// /create-contact John Doe, john@email.com, Acme Corp
// /create-deal Enterprise Deal, 50000, @Sales Pipeline

export interface ParsedContactArgs {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  assigneeName?: string;
  tags?: string[];
}

export interface ParsedDealArgs {
  name?: string;
  value?: number;
  currency?: string;
  pipelineName?: string;
  stageName?: string;
  contactName?: string;
  assigneeName?: string;
  deadline?: string;
}

export interface ParsedPipelineArgs {
  name?: string;
  description?: string;
}

// Email regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Phone regex (basic, covers most formats)
const PHONE_REGEX = /^[\d\s\-\+\(\)]{7,}$/;
// Currency amount regex (e.g., $50000, 50000, 50,000)
const AMOUNT_REGEX = /^[\$£€]?\s*[\d,]+(\.\d{2})?$/;

export function parseContactArgs(message: string): ParsedContactArgs {
  // Remove the command prefix
  const text = message.replace(/^\/\S+\s*/, "").trim();
  if (!text) return {};

  const result: ParsedContactArgs = {};

  // Split by comma or common separators
  const parts = text.split(/[,;]\s*/).map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (EMAIL_REGEX.test(part)) {
      result.email = part;
    } else if (PHONE_REGEX.test(part)) {
      result.phone = part;
    } else if (!result.name) {
      // First non-email, non-phone is likely the name
      result.name = part;
    } else if (!result.companyName) {
      // Second text field is likely company
      result.companyName = part;
    }
  }

  return result;
}

export function parseDealArgs(message: string): ParsedDealArgs {
  const text = message.replace(/^\/\S+\s*/, "").trim();
  if (!text) return {};

  const result: ParsedDealArgs = {};
  const parts = text.split(/[,;]\s*/).map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    // Check for currency prefix
    const currencyMatch = part.match(/^([\$£€])/);
    if (currencyMatch) {
      result.currency = currencyMatch[1] === "$" ? "USD" : currencyMatch[1] === "£" ? "GBP" : "EUR";
    }

    // Check for amount
    if (AMOUNT_REGEX.test(part)) {
      const numStr = part.replace(/[\$£€,\s]/g, "");
      result.value = parseFloat(numStr);
      if (!result.currency) result.currency = "USD";
    } else if (!result.name) {
      result.name = part;
    }
  }

  return result;
}

export function parsePipelineArgs(message: string): ParsedPipelineArgs {
  const text = message.replace(/^\/\S+\s*/, "").trim();
  if (!text) return {};

  const result: ParsedPipelineArgs = {};
  const parts = text.split(/[,;]\s*/).map(p => p.trim()).filter(Boolean);

  if (parts[0]) result.name = parts[0];
  if (parts[1]) result.description = parts[1];

  return result;
}

// Generic parser that returns all detected fields
export function parseInlineArgs(message: string): Record<string, string | number> {
  const text = message.replace(/^\/\S+\s*/, "").trim();
  if (!text) return {};

  const result: Record<string, string | number> = {};
  const parts = text.split(/[,;]\s*/).map(p => p.trim()).filter(Boolean);

  let textFieldIndex = 0;
  const textFieldNames = ["name", "description", "note"];

  for (const part of parts) {
    if (EMAIL_REGEX.test(part)) {
      result.email = part;
    } else if (PHONE_REGEX.test(part)) {
      result.phone = part;
    } else if (AMOUNT_REGEX.test(part)) {
      const numStr = part.replace(/[\$£€,\s]/g, "");
      result.value = parseFloat(numStr);
    } else if (textFieldIndex < textFieldNames.length) {
      result[textFieldNames[textFieldIndex]] = part;
      textFieldIndex++;
    }
  }

  return result;
}

// Check which required fields are missing
export function getMissingFields(
  parsed: Record<string, any>,
  required: string[]
): string[] {
  return required.filter(field => !parsed[field]);
}

// Format field name for display
export function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
