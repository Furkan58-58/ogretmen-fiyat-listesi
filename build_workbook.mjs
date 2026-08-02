import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const source = await SpreadsheetFile.importXlsx(await FileBlob.load("9-10-11-12-Maarif Tyt Kitaplar.xlsx"));
const sourceSheet = source.worksheets.getItem("Ders-Sınıf-Tür");
const values = sourceSheet.getRange("A1:H508").values;
const headers = values[0].map(String);
const col = (name) => headers.indexOf(name);

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Ürünler");
sheet.showGridLines = false;
const outputHeaders = ["Barkod", "Yayın", "Sınıf", "Ders", "Genel Tür", "Tür", "Fiyat", "İnd", "Toplu", "Tanıtım Linki"];
const outputRows = values.slice(1).filter(row => row.some(v => v !== null && v !== "")).map(row => [
  row[col("Barkod")], row[col("Yayın")], row[col("Sınıf")], row[col("Ders")],
  row[col("Genel Tür")], row[col("Tür")], row[col("Fiyat")], null, null, row[col("Tanıtım Linki")],
]);
sheet.getRange(`A1:J${outputRows.length + 1}`).values = [outputHeaders, ...outputRows];
sheet.getRange("A1:J1").format = {
  fill: "#173F5F", font: { bold: true, color: "#FFFFFF", size: 11 },
  verticalAlignment: "center", horizontalAlignment: "center", wrapText: true,
  borders: { preset: "outside", style: "medium", color: "#173F5F" },
};
sheet.getRange(`A2:J${outputRows.length + 1}`).format = {
  font: { color: "#17212B", size: 10 }, verticalAlignment: "center",
  borders: { insideHorizontal: { style: "thin", color: "#E5E7EB" } },
};
sheet.getRange(`A2:A${outputRows.length + 1}`).format.numberFormat = "@";
sheet.getRange(`G2:I${outputRows.length + 1}`).format.numberFormat = '₺#,##0.00';
sheet.getRange(`H2:H${outputRows.length + 1}`).format.fill = "#FFF4CC";
sheet.getRange(`I2:I${outputRows.length + 1}`).format.fill = "#E9F8EF";
sheet.getRange(`A1:J${outputRows.length + 1}`).format.rowHeight = 22;
sheet.getRange("A1:J1").format.rowHeight = 34;
const widths = [18, 28, 16, 25, 28, 20, 14, 14, 14, 42];
for (let i = 0; i < widths.length; i++) sheet.getRangeByIndexes(0, i, outputRows.length + 1, 1).format.columnWidth = widths[i];
sheet.freezePanes.freezeRows(1);
const table = sheet.tables.add(`A1:J${outputRows.length + 1}`, true, "UrunlerTablosu");
table.style = "TableStyleMedium2";
table.showFilterButton = true;

const info = workbook.worksheets.add("Kullanım");
info.showGridLines = false;
info.getRange("A1:F1").merge();
info.getRange("A1").values = [["Fiyat Listesi Yönetim Dosyası"]];
info.getRange("A1:F1").format = { fill: "#173F5F", font: { bold: true, color: "#FFFFFF", size: 18 }, rowHeight: 42, verticalAlignment: "center" };
info.getRange("A3:B9").values = [
  ["Nasıl kullanılır?", ""],
  ["1", "Yeni ürünü Ürünler sayfasındaki tablonun en altına ekleyin."],
  ["2", "Fiyat sütunu normal satış fiyatıdır."],
  ["3", "İnd sütununa indirimli fiyatı, Toplu sütununa toplu alım fiyatını yazın."],
  ["4", "Boş bırakılan İnd veya Toplu fiyat programda çizgi olarak görünür."],
  ["5", "Tanıtım Linki varsa kitap adına otomatik olarak bağlanır."],
  ["6", "Dosya GitHub'a yüklendiğinde web programı ve PDF otomatik yenilenir."],
];
info.getRange("A3:B3").format = { fill: "#F2B134", font: { bold: true, color: "#17212B" } };
info.getRange("A3:B9").format.wrapText = true;
info.getRange("A3:B9").format.verticalAlignment = "center";
info.getRange("A3:A9").format.columnWidth = 16;
info.getRange("B3:B9").format.columnWidth = 82;
info.getRange("A3:B9").format.rowHeight = 34;

await fs.mkdir("output", { recursive: true });
const preview = await workbook.render({ sheetName: "Ürünler", range: "A1:J24", scale: 1.2, format: "png" });
await fs.writeFile("output/urunler-onizleme.png", new Uint8Array(await preview.arrayBuffer()));
const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save("output/Fiyat-Listesi-Yonetim.xlsx");
const check = await workbook.inspect({ kind: "table", range: "Ürünler!A1:J12", include: "values,formulas", tableMaxRows: 12, tableMaxCols: 10 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 50 }, summary: "formula scan" });
console.log(errors.ndjson);
