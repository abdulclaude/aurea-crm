import { format } from "date-fns";
import type { InvoiceTemplatePreset } from "./template-presets";

interface InvoiceData {
  invoiceNumber: string;
  issueDate: Date | string;
  dueDate: Date | string;
  contactName: string;
  contactEmail?: string | null;
  contactAddress?: Record<string, unknown> | null;
  lineItems: Array<{
    description: string;
    quantity: string | number;
    unitPrice: string | number;
    amount: string | number;
  }>;
  subtotal: string | number;
  taxRate?: string | number | null;
  taxAmount: string | number;
  discountAmount: string | number;
  total: string | number;
  currency: string;
  notes?: string | null;
  termsConditions?: string | null;
  // Business info (from organization)
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  logoUrl?: string;
}

const formatCurrency = (amount: string | number, currency: string = "USD") => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numAmount);
};

const formatDate = (date: Date | string) => {
  return format(new Date(date), "MMM dd, yyyy");
};

/**
 * Render invoice as HTML using template
 */
export function renderInvoiceHTML(
  invoice: InvoiceData,
  template: InvoiceTemplatePreset
): string {
  const { layout, styles } = template;

  // Build HTML sections based on template layout
  const sections = layout.sections.map((section) => {
    switch (section.type) {
      case "header":
        return renderHeader(invoice, section.config, styles);
      case "client-info":
        return renderClientInfo(invoice, section.config, styles);
      case "line-items":
        return renderLineItems(invoice, section.config, styles);
      case "totals":
        return renderTotals(invoice, section.config, styles);
      case "notes":
        return renderNotes(invoice, section.config, styles);
      case "footer":
        return renderFooter(invoice, section.config, styles);
      default:
        return "";
    }
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${styles.fontFamily};
      font-size: ${styles.fontSize.base};
      color: ${styles.primaryColor};
      line-height: 1.6;
      padding: 48px;
      max-width: 900px;
      margin: 0 auto;
    }
    .section { margin-bottom: ${styles.spacing.section}; }
    .header { margin-bottom: ${styles.spacing.section}; }
    .primary { color: ${styles.primaryColor}; }
    .secondary { color: ${styles.secondaryColor}; }
    .accent { color: ${styles.accentColor}; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 600; }
    .font-semibold { font-weight: 500; }
    .text-lg { font-size: ${styles.fontSize.large}; }
    .text-sm { font-size: ${styles.fontSize.small}; }
    .text-heading { font-size: ${styles.fontSize.heading}; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; }
    .border { border: ${styles.borders.width} solid ${styles.borders.color}; }
    .border-t { border-top: ${styles.borders.width} solid ${styles.borders.color}; }
    .border-b { border-bottom: ${styles.borders.width} solid ${styles.borders.color}; }
    .rounded { border-radius: ${styles.borders.radius}; }
    .bg-accent { background-color: ${styles.accentColor}; color: white; }
    .bg-gray { background-color: #f9fafb; }
  </style>
</head>
<body>
  ${sections.join("\n")}
</body>
</html>
  `.trim();
}

function renderHeader(
  invoice: InvoiceData,
  config: Record<string, unknown>,
  styles: InvoiceTemplatePreset["styles"]
): string {
  const showBackground = config.background as boolean;

  return `
<div class="header ${showBackground ? "bg-accent" : ""}" style="${showBackground ? "padding: 24px; margin: -48px -48px 32px -48px;" : ""}">
  <div style="display: flex; justify-content: space-between; align-items: start;">
    <div>
      ${config.showLogo && invoice.logoUrl ? `<img src="${invoice.logoUrl}" alt="Logo" style="height: 60px; margin-bottom: 16px;">` : ""}
      ${invoice.businessName ? `<div class="text-lg font-bold ${showBackground ? "" : "primary"}" style="${showBackground ? "color: white;" : ""}">${invoice.businessName}</div>` : ""}
      ${invoice.businessEmail ? `<div class="text-sm ${showBackground ? "" : "secondary"}" style="${showBackground ? "color: rgba(255,255,255,0.9);" : ""}">${invoice.businessEmail}</div>` : ""}
    </div>
    <div class="text-right">
      <div class="text-heading ${showBackground ? "" : "primary"}" style="${showBackground ? "color: white;" : ""}">${invoice.invoiceNumber}</div>
      ${config.showDate ? `
        <div class="text-sm ${showBackground ? "" : "secondary"}" style="margin-top: 8px; ${showBackground ? "color: rgba(255,255,255,0.9);" : ""}">
          <div>Issue Date: ${formatDate(invoice.issueDate)}</div>
          <div>Due Date: ${formatDate(invoice.dueDate)}</div>
        </div>
      ` : ""}
    </div>
  </div>
</div>
  `;
}

function renderClientInfo(
  invoice: InvoiceData,
  config: Record<string, unknown>,
  styles: InvoiceTemplatePreset["styles"]
): string {
  return `
<div class="section">
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
    <div>
      <div class="text-sm secondary" style="margin-bottom: 8px;">Bill To</div>
      <div class="font-semibold text-lg">${invoice.contactName}</div>
      ${config.showEmail && invoice.contactEmail ? `<div class="text-sm secondary">${invoice.contactEmail}</div>` : ""}
    </div>
    <div class="text-right">
      <div class="text-sm secondary" style="margin-bottom: 8px;">Invoice Details</div>
      <div class="text-sm">
        <div><span class="secondary">Amount:</span> <span class="font-semibold">${formatCurrency(invoice.total, invoice.currency)}</span></div>
        <div><span class="secondary">Status:</span> <span class="font-semibold">Pending</span></div>
      </div>
    </div>
  </div>
</div>
  `;
}

function renderLineItems(
  invoice: InvoiceData,
  config: Record<string, unknown>,
  styles: InvoiceTemplatePreset["styles"]
): string {
  const showBorders = config.showBorders as boolean;
  const alternateRows = config.alternateRows as boolean;
  const headerBackground = config.headerBackground as boolean;

  return `
<div class="section">
  <table class="${showBorders ? "border rounded" : ""}" style="${showBorders ? "" : "border-top: 2px solid " + styles.borders.color + "; border-bottom: 2px solid " + styles.borders.color + ";"}">
    <thead class="${headerBackground ? "bg-gray" : ""}">
      <tr class="${!headerBackground ? "border-b" : ""}">
        <th class="text-sm font-semibold" style="text-align: left;">Description</th>
        <th class="text-sm font-semibold" style="text-align: right; width: 100px;">Qty</th>
        <th class="text-sm font-semibold" style="text-align: right; width: 120px;">Rate</th>
        <th class="text-sm font-semibold" style="text-align: right; width: 140px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.lineItems
        .map(
          (item, index) => `
        <tr class="${alternateRows && index % 2 === 1 ? "bg-gray" : ""} ${showBorders && index < invoice.lineItems.length - 1 ? "border-b" : ""}">
          <td>${item.description}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${formatCurrency(item.unitPrice, invoice.currency)}</td>
          <td class="text-right font-semibold">${formatCurrency(item.amount, invoice.currency)}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>
</div>
  `;
}

function renderTotals(
  invoice: InvoiceData,
  config: Record<string, unknown>,
  styles: InvoiceTemplatePreset["styles"]
): string {
  const width = (config.width as string) || "350px";
  const border = config.border as boolean;

  return `
<div class="section" style="display: flex; justify-content: flex-end;">
  <div style="width: ${width};" class="${border ? "border rounded" : ""}" style="${border ? "padding: 20px;" : ""}">
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
      <span class="secondary">Subtotal</span>
      <span class="font-semibold">${formatCurrency(invoice.subtotal, invoice.currency)}</span>
    </div>
    ${invoice.taxRate && parseFloat(String(invoice.taxRate)) > 0 ? `
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
      <span class="secondary">Tax (${invoice.taxRate}%)</span>
      <span class="font-semibold">${formatCurrency(invoice.taxAmount, invoice.currency)}</span>
    </div>
    ` : ""}
    ${invoice.discountAmount && parseFloat(String(invoice.discountAmount)) > 0 ? `
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #059669;">
      <span>Discount</span>
      <span class="font-semibold">-${formatCurrency(invoice.discountAmount, invoice.currency)}</span>
    </div>
    ` : ""}
    <div class="border-t" style="margin: 16px 0;"></div>
    <div style="display: flex; justify-content: space-between;">
      <span class="text-lg font-bold">Total</span>
      <span class="text-lg font-bold accent">${formatCurrency(invoice.total, invoice.currency)}</span>
    </div>
  </div>
</div>
  `;
}

function renderNotes(
  invoice: InvoiceData,
  config: Record<string, unknown>,
  styles: InvoiceTemplatePreset["styles"]
): string {
  if (!invoice.notes && !invoice.termsConditions) return "";

  return `
<div class="section">
  ${invoice.notes ? `
    <div style="margin-bottom: 24px;">
      <div class="font-semibold" style="margin-bottom: 8px;">Notes</div>
      <div class="text-sm secondary" style="white-space: pre-wrap;">${invoice.notes}</div>
    </div>
  ` : ""}
  ${invoice.termsConditions ? `
    <div>
      <div class="font-semibold" style="margin-bottom: 8px;">Terms & Conditions</div>
      <div class="text-sm secondary" style="white-space: pre-wrap;">${invoice.termsConditions}</div>
    </div>
  ` : ""}
</div>
  `;
}

function renderFooter(
  invoice: InvoiceData,
  config: Record<string, unknown>,
  styles: InvoiceTemplatePreset["styles"]
): string {
  const border = config.border as boolean;

  return `
<div class="section ${border ? "border-t" : ""}" style="${border ? "padding-top: 24px;" : ""}">
  <div class="text-center text-sm secondary">
    ${config.showThankYou ? `<div style="margin-bottom: 8px;">Thank you for your business!</div>` : ""}
    ${invoice.businessEmail ? `<div>Questions? Contact us at ${invoice.businessEmail}</div>` : ""}
  </div>
</div>
  `;
}
