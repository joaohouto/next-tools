import * as XLSX from "xlsx";
import type { ConverterModule, TargetFormat } from "./types";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const TARGETS: TargetFormat[] = [
  { id: "csv", label: "CSV", ext: "csv", mime: "text/csv" },
  { id: "xlsx", label: "XLSX", ext: "xlsx", mime: XLSX_MIME },
  { id: "json", label: "JSON", ext: "json", mime: "application/json" },
];

function isSpreadsheetFile(file: File) {
  return /\.(xlsx|xls|csv)$/i.test(file.name);
}

async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  if (/\.csv$/i.test(file.name)) {
    return XLSX.read(await file.text(), { type: "string" });
  }
  return XLSX.read(await file.arrayBuffer(), { type: "array" });
}

export const spreadsheetModule: ConverterModule = {
  id: "spreadsheet",
  label: "Planilhas",
  accept: [".xlsx", ".xls", ".csv"],
  detect: isSpreadsheetFile,

  getTargets: (files) => {
    // Hide the target format when every selected file already has that extension.
    const exts = new Set(files.map((f) => f.name.split(".").pop()?.toLowerCase()));
    return TARGETS.filter((t) => !(exts.size === 1 && exts.has(t.ext)));
  },

  async convert(inputs, target, onProgress) {
    const results = [];
    for (const { id, file } of inputs) {
      onProgress(id, "processing");
      try {
        const wb = await readWorkbook(file);
        const baseName = file.name.replace(/\.[^.]+$/, "");
        const sheetNames = wb.SheetNames;

        if (target.id === "csv") {
          for (const name of sheetNames) {
            const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
            const fname = sheetNames.length > 1 ? `${baseName}-${name}.csv` : `${baseName}.csv`;
            results.push({ name: fname, blob: new Blob([csv], { type: "text/csv" }), sourceFileId: id });
          }
        } else if (target.id === "xlsx") {
          const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
          results.push({ name: `${baseName}.xlsx`, blob: new Blob([buf], { type: XLSX_MIME }), sourceFileId: id });
        } else if (target.id === "json") {
          const data = sheetNames.length > 1
            ? Object.fromEntries(sheetNames.map((n) => [n, XLSX.utils.sheet_to_json(wb.Sheets[n])]))
            : XLSX.utils.sheet_to_json(wb.Sheets[sheetNames[0]]);
          const json = JSON.stringify(data, null, 2);
          results.push({ name: `${baseName}.json`, blob: new Blob([json], { type: "application/json" }), sourceFileId: id });
        }
        onProgress(id, "done");
      } catch {
        onProgress(id, "error");
      }
    }
    return results;
  },
};
