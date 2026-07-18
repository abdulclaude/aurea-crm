"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

export type ClientExportRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  type: string;
  lastInteractionAt: Date | string | null;
};

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function formattedDate(value: Date | string | null): string {
  return value
    ? new Date(value).toLocaleDateString("en-GB", { dateStyle: "medium" })
    : "";
}

export function exportClientsCsv(rows: ClientExportRow[]): void {
  const values = [
    ["Name", "Email", "Phone", "Type", "Tags", "Last interaction"],
    ...rows.map((row) => [
      row.name,
      row.email ?? "",
      row.phone ?? "",
      row.type,
      row.tags.join("; "),
      formattedDate(row.lastInteractionAt),
    ]),
  ];
  const csv = values.map((row) => row.map(csvValue).join(",")).join("\n");
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    "aurea-clients.csv",
  );
}

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", fontSize: 8 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 16, marginBottom: 4 },
  subtitle: { color: "#666666", marginBottom: 14 },
  row: {
    flexDirection: "row",
    borderBottom: "1px solid #dddddd",
    paddingVertical: 6,
  },
  header: { fontFamily: "Helvetica-Bold", backgroundColor: "#f3f3f3" },
  name: { width: "21%" },
  email: { width: "27%" },
  phone: { width: "17%" },
  type: { width: "12%" },
  tags: { width: "23%" },
});

function ClientsDocument({ rows }: { rows: ClientExportRow[] }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Aurea clients</Text>
        <Text style={styles.subtitle}>
          {rows.length} selected {rows.length === 1 ? "client" : "clients"}
        </Text>
        <View style={[styles.row, styles.header]}>
          <Text style={styles.name}>Name</Text>
          <Text style={styles.email}>Email</Text>
          <Text style={styles.phone}>Phone</Text>
          <Text style={styles.type}>Type</Text>
          <Text style={styles.tags}>Tags</Text>
        </View>
        {rows.map((row) => (
          <View key={row.id} style={styles.row}>
            <Text style={styles.name}>{row.name}</Text>
            <Text style={styles.email}>{row.email ?? "-"}</Text>
            <Text style={styles.phone}>{row.phone ?? "-"}</Text>
            <Text style={styles.type}>{row.type}</Text>
            <Text style={styles.tags}>{row.tags.join(", ") || "-"}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function exportClientsPdf(rows: ClientExportRow[]): Promise<void> {
  const blob = await pdf(<ClientsDocument rows={rows} />).toBlob();
  downloadBlob(blob, "aurea-clients.pdf");
}
