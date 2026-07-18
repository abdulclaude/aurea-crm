"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

export type ClassRosterExportRow = {
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
};

type ClassRosterExportInput = {
  className: string;
  startTime: Date | string;
  rows: ClassRosterExportRow[];
};

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function csvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportClassRosterCsv(input: ClassRosterExportInput): void {
  const rows = [
    ["Name", "Email", "Phone", "Status"],
    ...input.rows.map((row) => [row.name, row.email ?? "", row.phone ?? "", row.status]),
  ];
  const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `${safeFilename(input.className) || "class"}-roster.csv`,
  );
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 4 },
  subtitle: { color: "#666666", marginBottom: 16 },
  row: { flexDirection: "row", borderBottom: "1px solid #dddddd", paddingVertical: 6 },
  header: { fontFamily: "Helvetica-Bold", backgroundColor: "#f3f3f3" },
  name: { width: "28%" },
  email: { width: "32%" },
  phone: { width: "22%" },
  status: { width: "18%" },
});

function RosterDocument({ input }: { input: ClassRosterExportInput }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{input.className}</Text>
        <Text style={styles.subtitle}>
          {new Date(input.startTime).toLocaleString("en-GB")}
        </Text>
        <View style={[styles.row, styles.header]}>
          <Text style={styles.name}>Name</Text>
          <Text style={styles.email}>Email</Text>
          <Text style={styles.phone}>Phone</Text>
          <Text style={styles.status}>Status</Text>
        </View>
        {input.rows.map((row, index) => (
          <View key={`${row.email ?? row.name}-${index}`} style={styles.row}>
            <Text style={styles.name}>{row.name}</Text>
            <Text style={styles.email}>{row.email ?? "-"}</Text>
            <Text style={styles.phone}>{row.phone ?? "-"}</Text>
            <Text style={styles.status}>{row.status}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function exportClassRosterPdf(input: ClassRosterExportInput): Promise<void> {
  const blob = await pdf(<RosterDocument input={input} />).toBlob();
  downloadBlob(blob, `${safeFilename(input.className) || "class"}-roster.pdf`);
}
