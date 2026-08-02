import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const source = await SpreadsheetFile.importXlsx(await FileBlob.load("9-10-11-12-Maarif Tyt Kitaplar.xlsx"));
const sourceSheet = source.worksheets.getItem("Ders-Sınıf-Tür");
const values = sourceSheet.getRange("A1:I508").values;

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Ürünler");
sheet.showGridLines = false;
sheet.getRange("A1:K508").values = values.map((row, index) => index === 0
  ? ["Barkod", "Grup", "Yayın", "Sınıf", "Ders", "Genel Tür", "Tür", "Liste Fiyatı", "Tanıtım Linki", "İndirim %", "Satış Fiyatı"]
  : [...row, 0, null]
);
sheet.getRange("K2").formulas = [["=ROUND(H2*(1-J2),2)"]];
sheet.getRange("K2:K508").fillDown();
sheet.getRange("A1:K1").format = {
  fill: "#173F5F",
  font: { bold: true, color: "#FFFFFF", size: 11 },
  verticalAlignment: "center",
  horizontalAlignment: "center",
  wrapText: true,
  borders: { preset: "outside", style: "medium", color: "#173F5F" },
};
sheet.getRange("A2:K508").format = {
  font: { color: "#17212B", size: 10 },
  verticalAlignment: "center",
  borders: { insideHorizontal: { style: "thin", color: "#E5E7EB" } },
};
sheet.getRange("H2:H508").format.numberFormat = '₺#,##0.00';
sheet.getRange("A2:A508").format.numberFormat = "@";
sheet.getRange("J2:J508").format.numberFormat = "0%";
sheet.getRange("K2:K508").format.numberFormat = '₺#,##0.00';
sheet.getRange("J2:J508").format.fill = "#FFF4CC";
sheet.getRange("K2:K508").format.fill = "#E9F8EF";
sheet.getRange("A1:K508").format.rowHeight = 22;
sheet.getRange("A1:K1").format.rowHeight = 34;
const widths = [18, 11, 28, 16, 25, 26, 20, 14, 42, 12, 15];
for (let i = 0; i < widths.length; i++) sheet.getRangeByIndexes(0, i, 508, 1).format.columnWidth = widths[i];
sheet.freezePanes.freezeRows(1);
const table = sheet.tables.add("A1:K508", true, "UrunlerTablosu");
table.style = "TableStyleMedium2";
table.showFilterButton = true;

const info = workbook.worksheets.add("Kullanım");
info.showGridLines = false;
info.getRange("A1:F1").merge();
info.getRange("A1").values = [["Fiyat Listesi Yönetim Dosyası"]];
info.getRange("A1:F1").format = { fill: "#173F5F", font: { bold: true, color: "#FFFFFF", size: 18 }, rowHeight: 42, verticalAlignment: "center" };
info.getRange("A3:B8").values = [
  ["Nasıl kullanılır?", ""],
  ["1", "Yeni ürünü Ürünler sayfasındaki tablonun en altına ekleyin."],
  ["2", "Liste Fiyatı sütununa normal fiyatı yazın."],
  ["3", "İndirim % sütununa örneğin %10 yazın; Satış Fiyatı otomatik hesaplanır."],
  ["4", "Dosyayı kaydedip GitHub projesine yüklediğinizde web ve PDF otomatik yenilenir."],
  ["Not", "Barkod sütununu metin olarak koruyun; baştaki sıfırlar kaybolmaz."],
];
info.getRange("A3:B3").format = { fill: "#F2B134", font: { bold: true, color: "#17212B" } };
info.getRange("A3:B8").format = { ...info.getRange("A3:B8").format, wrapText: true, verticalAlignment: "center" };
info.getRange("A3:A8").format.columnWidth = 16;
info.getRange("B3:B8").format.columnWidth = 78;
info.getRange("A3:B8").format.rowHeight = 34;

await fs.mkdir("output", { recursive: true });
const preview = await workbook.render({ sheetName: "Kullanım", autoCrop: "all", scale: 1.5, format: "png" });
await fs.writeFile("output/kullanim-onizleme.png", new Uint8Array(await preview.arrayBuffer()));
const productsPreview = await workbook.render({ sheetName: "Ürünler", range: "A1:K25", scale: 1.2, format: "png" });
await fs.writeFile("output/urunler-onizleme.png", new Uint8Array(await productsPreview.arrayBuffer()));
const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save("output/Fiyat-Listesi-Yonetim.xlsx");

const check = await workbook.inspect({ kind: "table", range: "Ürünler!A1:K12", include: "values,formulas", tableMaxRows: 12, tableMaxCols: 11 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 50 }, summary: "formula scan" });
console.log(errors.ndjson);
