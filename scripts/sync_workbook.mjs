import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = process.argv[2] || "output/Fiyat-Listesi-Yonetim.xlsx";
const tempPath = `${workbookPath}.sync.xlsx`;
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const products = workbook.worksheets.getItem("Ürünler");
const settings = workbook.worksheets.getItem("Ayarlar");
const productRows = products.getUsedRange(true).values;
const productHeaders = productRows[0].map((value) => String(value ?? "").trim());
const publisherIndex = productHeaders.indexOf("Yayın");
const publishers = [...new Set(productRows.slice(1).map((row) => String(row[publisherIndex] ?? "").trim()).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, "tr"));
const settingsRows = settings.getUsedRange(true).values;
const mappings = new Map();
for (let row = 3; row < settingsRows.length; row++) {
  const publisher = String(settingsRows[row]?.[6] ?? "").trim();
  const bookstoreCode = String(settingsRows[row]?.[7] ?? "").trim();
  if (publisher) mappings.set(publisher, bookstoreCode || "kitabevi-1");
}
const missing = publishers.filter((publisher) => !mappings.has(publisher));
if (!missing.length) {
  console.log(`${publishers.length} yayınevi zaten eşleştirme listesinde.`);
  process.exit(0);
}
const firstBookstore = String(settingsRows[3]?.[3] ?? "kitabevi-1").trim() || "kitabevi-1";
const startRow = Math.max(4, settingsRows.length + 1);
const endRow = startRow + missing.length - 1;
settings.getRange(`G${startRow}:H${endRow}`).values = missing.map((publisher) => [publisher, firstBookstore]);
settings.getRange(`G${startRow}:H${endRow}`).format = { borders: { insideHorizontal: { style: "thin", color: "#E5E7EB" } }, verticalAlignment: "center" };
settings.getRange(`H${startRow}:H${endRow}`).format.fill = "#FFF4CC";
settings.getRange(`H${startRow}:H${endRow}`).dataValidation = { rule: { type: "list", formula1: "=$D$4:$D$25" } };
const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(tempPath);
await fs.copyFile(tempPath, workbookPath);
await fs.unlink(tempPath);
console.log(`${missing.length} yeni yayınevi eşleştirme listesine eklendi.`);
