export function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => (row[index] ?? "").length)),
  );

  const formatRow = (row: string[]) =>
    row
      .map((cell, index) => (cell ?? "").padEnd(widths[index], " "))
      .join("  ")
      .trimEnd();

  return [formatRow(headers), ...rows.map(formatRow)].join("\n");
}
