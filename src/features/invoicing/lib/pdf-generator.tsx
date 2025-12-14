/**
 * PDF Generation Service
 * Converts invoice data to PDF using React-PDF
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
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

const formatCurrency = (amount: string | number, currency = "USD") => {
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
 * Create dynamic styles based on template
 */
const createStyles = (template: InvoiceTemplatePreset) => {
  const { styles: templateStyles } = template;

  return StyleSheet.create({
    page: {
      padding: 48,
      fontSize: 14,
      color: templateStyles.primaryColor,
      fontFamily: "Helvetica",
    },
    section: {
      marginBottom: 32,
    },
    header: {
      marginBottom: 32,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    headerLeft: {
      flex: 1,
    },
    headerRight: {
      alignItems: "flex-end",
    },
    businessName: {
      fontSize: 16,
      fontWeight: 600,
      marginBottom: 4,
      color: templateStyles.primaryColor,
    },
    businessEmail: {
      fontSize: 12,
      color: templateStyles.secondaryColor,
    },
    invoiceNumber: {
      fontSize: 24,
      fontWeight: 700,
      color: templateStyles.primaryColor,
    },
    dateText: {
      fontSize: 12,
      color: templateStyles.secondaryColor,
      marginTop: 8,
    },
    clientInfoContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 32,
    },
    clientInfoLeft: {
      flex: 1,
    },
    clientInfoRight: {
      alignItems: "flex-end",
      flex: 1,
    },
    sectionLabel: {
      fontSize: 12,
      color: templateStyles.secondaryColor,
      marginBottom: 8,
    },
    clientName: {
      fontSize: 16,
      fontWeight: 600,
    },
    clientEmail: {
      fontSize: 12,
      color: templateStyles.secondaryColor,
    },
    table: {
      width: "100%",
      marginBottom: 32,
    },
    tableHeader: {
      flexDirection: "row",
      borderBottomWidth: 2,
      borderBottomColor: templateStyles.borders.color,
      paddingBottom: 12,
      marginBottom: 12,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: templateStyles.borders.color,
    },
    tableColDescription: {
      flex: 3,
    },
    tableColQuantity: {
      flex: 1,
      textAlign: "right",
    },
    tableColRate: {
      flex: 1,
      textAlign: "right",
    },
    tableColAmount: {
      flex: 1,
      textAlign: "right",
    },
    tableHeaderText: {
      fontSize: 12,
      fontWeight: 600,
    },
    tableBodyText: {
      fontSize: 14,
    },
    totalsContainer: {
      alignItems: "flex-end",
      marginBottom: 32,
    },
    totalsBox: {
      width: 350,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    totalLabel: {
      color: templateStyles.secondaryColor,
    },
    totalValue: {
      fontWeight: 600,
    },
    totalDivider: {
      borderTopWidth: 1,
      borderTopColor: templateStyles.borders.color,
      marginVertical: 16,
    },
    grandTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    grandTotalLabel: {
      fontSize: 16,
      fontWeight: 700,
    },
    grandTotalValue: {
      fontSize: 16,
      fontWeight: 700,
      color: templateStyles.accentColor,
    },
    notesSection: {
      marginBottom: 32,
    },
    notesTitle: {
      fontWeight: 600,
      marginBottom: 8,
    },
    notesText: {
      fontSize: 12,
      color: templateStyles.secondaryColor,
      lineHeight: 1.6,
    },
    footer: {
      textAlign: "center",
      fontSize: 12,
      color: templateStyles.secondaryColor,
      borderTopWidth: 1,
      borderTopColor: templateStyles.borders.color,
      paddingTop: 24,
    },
  });
};

/**
 * Invoice PDF Document Component
 */
const InvoicePDFDocument = ({
  invoice,
  template,
}: {
  invoice: InvoiceData;
  template: InvoiceTemplatePreset;
}) => {
  const styles = createStyles(template);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {invoice.businessName && (
              <Text style={styles.businessName}>{invoice.businessName}</Text>
            )}
            {invoice.businessEmail && (
              <Text style={styles.businessEmail}>{invoice.businessEmail}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <Text style={styles.dateText}>
              Issue Date: {formatDate(invoice.issueDate)}
            </Text>
            <Text style={styles.dateText}>
              Due Date: {formatDate(invoice.dueDate)}
            </Text>
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.clientInfoContainer}>
          <View style={styles.clientInfoLeft}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.clientName}>{invoice.contactName}</Text>
            {invoice.contactEmail && (
              <Text style={styles.clientEmail}>{invoice.contactEmail}</Text>
            )}
          </View>
          <View style={styles.clientInfoRight}>
            <Text style={styles.sectionLabel}>Invoice Details</Text>
            <Text style={styles.tableBodyText}>
              Amount: {formatCurrency(invoice.total, invoice.currency)}
            </Text>
            <Text style={styles.tableBodyText}>Status: Pending</Text>
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableColDescription]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderText, styles.tableColQuantity]}>
              Qty
            </Text>
            <Text style={[styles.tableHeaderText, styles.tableColRate]}>
              Rate
            </Text>
            <Text style={[styles.tableHeaderText, styles.tableColAmount]}>
              Amount
            </Text>
          </View>
          {invoice.lineItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableBodyText, styles.tableColDescription]}>
                {item.description}
              </Text>
              <Text style={[styles.tableBodyText, styles.tableColQuantity]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableBodyText, styles.tableColRate]}>
                {formatCurrency(item.unitPrice, invoice.currency)}
              </Text>
              <Text style={[styles.tableBodyText, styles.tableColAmount]}>
                {formatCurrency(item.amount, invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(invoice.subtotal, invoice.currency)}
              </Text>
            </View>
            {invoice.taxRate &&
              parseFloat(String(invoice.taxRate)) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    Tax ({invoice.taxRate}%)
                  </Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(invoice.taxAmount, invoice.currency)}
                  </Text>
                </View>
              )}
            {invoice.discountAmount &&
              parseFloat(String(invoice.discountAmount)) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={styles.totalValue}>
                    -{formatCurrency(invoice.discountAmount, invoice.currency)}
                  </Text>
                </View>
              )}
            <View style={styles.totalDivider} />
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(invoice.total, invoice.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {(invoice.notes || invoice.termsConditions) && (
          <View style={styles.notesSection}>
            {invoice.notes && (
              <View>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notesText}>{invoice.notes}</Text>
              </View>
            )}
            {invoice.termsConditions && (
              <View style={{ marginTop: invoice.notes ? 24 : 0 }}>
                <Text style={styles.notesTitle}>Terms & Conditions</Text>
                <Text style={styles.notesText}>
                  {invoice.termsConditions}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your business!</Text>
          {invoice.businessEmail && (
            <Text>Questions? Contact us at {invoice.businessEmail}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

/**
 * Generate PDF from invoice data and template
 */
export async function generatePDF(
  invoice: InvoiceData,
  template: InvoiceTemplatePreset
): Promise<Buffer> {
  const doc = React.createElement(InvoicePDFDocument, { invoice, template });
  const asPdf = pdf(doc as any);
  const blob = await asPdf.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate PDF from HTML (legacy support - converts to data-driven approach)
 * @deprecated Use generatePDF with invoice data and template instead
 */
export async function generatePDFFromHTML(
  html: string,
  options: {
    filename?: string;
    format?: "A4" | "Letter";
    margin?: { top: string; right: string; bottom: string; left: string };
  } = {}
): Promise<Buffer> {
  throw new Error(
    "generatePDFFromHTML is deprecated. Use generatePDF with invoice data and template instead."
  );
}
