const state = { data: null, all: [], shown: [], catalog: null, course: "", kind: "", scanAllCourses: false };
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
const norm = (value) => (value || "").toLocaleLowerCase("tr-TR");
const slug = (value) => norm(value).replaceAll("ı", "i").replaceAll("ş", "s").replaceAll("ğ", "g").replaceAll("ü", "u").replaceAll("ö", "o").replaceAll("ç", "c").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const gradeOrder = ["5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Maarif TYT"];
const courseOrder = ["Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Türk Dili ve Edebiyatı", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "Türkçe", "Fen Bilimleri", "Sosyal Bilimler", "Tüm Dersler"];
let cameraStream = null, scanTimer = null, zxingControls = null;
const showPrice = (value) => value == null ? "—" : money(value);

function productCard(product) {
  const name = product.promo ? `<a class="book-link" href="${product.promo}" target="_blank" rel="noopener">${product.bookName}</a>` : `<span>${product.bookName}</span>`;
  return `<article class="card"><div><div class="publisher">${name}</div><div class="meta">Barkod: ${product.barcode}</div></div><div><span class="tag">${product.type || "Kitap"}</span></div><div class="prices"><div><span>Fiyat</span><strong>${showPrice(product.price)}</strong></div><div><span>İnd</span><strong>${showPrice(product.discountPrice)}</strong></div><div><span>Toplu</span><strong>${showPrice(product.bulkPrice)}</strong></div></div></article>`;
}

function renderHome() {
  $("#catalogs").innerHTML = state.data.catalogs.map((catalog) => `<a class="catalog-card" href="${catalog.url}" style="--card-main:${catalog.mainColor};--card-accent:${catalog.accentColor}"><span class="level">${catalog.level}</span><h3>${catalog.title}</h3><p>${catalog.description}</p><div class="catalog-foot"><strong>${catalog.count} kitap</strong><span>Listeyi aç →</span></div></a>`).join("");
}

function renderCourses() {
  const courses = [...new Set(state.all.map((x) => x.course).filter(Boolean))].sort((a, b) => {
    const ai = courseOrder.indexOf(a), bi = courseOrder.indexOf(b);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    return a.localeCompare(b, "tr");
  });
  if (!courses.includes(state.course)) state.course = courses[0] || "";
  $("#courses").innerHTML = courses.map((course) => `<button class="grade-tab ${!state.scanAllCourses && course === state.course ? "active" : ""}" data-course="${course}">${course}<small>${state.all.filter((x) => x.course === course).length} kitap</small></button>`).join("");
  $("#courses").querySelectorAll("button").forEach((button) => button.onclick = () => { state.course = button.dataset.course; state.kind = ""; state.scanAllCourses = false; $("#publisher").value = ""; renderCourses(); renderPublishers(); renderTypes(); render(); document.querySelector(".type-section").scrollIntoView({ behavior: "smooth", block: "start" }); });
}

function renderPublishers() {
  const select = $("#publisher"), current = select.value;
  const publishers = [...new Set(state.all.filter((x) => x.course === state.course).map((x) => x.publisher).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
  select.innerHTML = '<option value="">Tüm yayınlar</option>'; publishers.forEach((value) => select.add(new Option(value, value))); select.value = publishers.includes(current) ? current : "";
}

function renderTypes() {
  const items = state.all.filter((x) => x.course === state.course), types = [...new Set(items.map((x) => x.type || "Diğer"))].sort((a, b) => a.localeCompare(b, "tr"));
  $("#types").innerHTML = [`<button class="type-tab ${state.kind === "" ? "active" : ""}" data-kind="">Tümü</button>`, ...types.map((type) => `<button class="type-tab ${type === state.kind ? "active" : ""}" data-kind="${type}">${type}<small> (${items.filter((x) => (x.type || "Diğer") === type).length})</small></button>`)].join("");
  $("#types").querySelectorAll("button").forEach((button) => button.onclick = () => { state.kind = button.dataset.kind; state.scanAllCourses = false; renderTypes(); render(); });
}

function render() {
  const query = norm($("#q").value), publisher = $("#publisher").value;
  state.shown = state.all.filter((x) => (state.scanAllCourses || x.course === state.course) && (!state.kind || (x.type || "Diğer") === state.kind) && (!query || norm([x.publisher, x.grade, x.category, x.type, ...(x.barcodes || [x.barcode])].join(" ")).includes(query)) && (!publisher || x.publisher === publisher));
  $("#count").textContent = `${state.scanAllCourses ? "Tüm derslerde barkod araması" : (state.course || state.catalog.level)}${state.kind ? ` • ${state.kind}` : ""} • ${state.shown.length} ürün`;
  $("#empty").hidden = state.shown.length > 0;
  const groups = {}; state.shown.forEach((x) => (groups[x.grade || "Diğer"] ??= []).push(x));
  $("#list").innerHTML = Object.entries(groups).sort((a, b) => (gradeOrder.indexOf(a[0]) < 0 ? 99 : gradeOrder.indexOf(a[0])) - (gradeOrder.indexOf(b[0]) < 0 ? 99 : gradeOrder.indexOf(b[0]))).map(([grade, items]) => `<details class="course-group" open><summary><span>${grade}</span><span class="course-count">${items.length} kitap</span></summary><div class="course-cards">${items.map(productCard).join("")}</div></details>`).join("");
}

function openCatalog(catalog) {
  state.catalog = catalog; state.all = state.data.products.filter((x) => x.bookstoreCode === catalog.bookstoreCode && x.level === catalog.level); state.course = ""; state.kind = "";
  document.documentElement.style.setProperty("--navy", catalog.mainColor); document.documentElement.style.setProperty("--gold", catalog.accentColor);
  $("#site-title").textContent = catalog.title; $("#site-subtitle").textContent = catalog.description; document.title = catalog.title;
  $("#home-view").hidden = true; $("#catalog-view").hidden = false; $("#catalog-actions").hidden = false; $("#pdf-link").href = catalog.pdf;
  $("#updated").textContent = `${catalog.count} ürün • Son güncelleme: ${state.data.updated}`;
  $("#contacts").innerHTML = catalog.contacts.map((c) => { const digits = c.phone.replace(/\D/g, ""); const href = c.whatsapp ? `https://wa.me/${digits.startsWith("0") ? `90${digits.slice(1)}` : digits}` : `tel:${digits}`; return `<a class="contact-pill" href="${href}"><span>☎</span><span><strong>${c.name || "İletişim"}</strong><small>${c.phone}</small></span></a>`; }).join("");
  renderCourses(); renderPublishers(); renderTypes(); render();
}

function stopScanner() { if (scanTimer) clearTimeout(scanTimer); scanTimer = null; if (zxingControls) zxingControls.stop(); zxingControls = null; if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop()); cameraStream = null; $("#scanner-video").srcObject = null; if ($("#scanner").open) $("#scanner").close(); }
function useBarcode(barcode) { const value = String(barcode || "").trim(); if (!value) return; $("#q").value = value; state.kind = ""; state.scanAllCourses = true; $("#publisher").value = ""; stopScanner(); renderCourses(); renderTypes(); render(); document.querySelector(".result-head").scrollIntoView({ behavior: "smooth", block: "start" }); }
async function scanFrame(detector) { if (!cameraStream) return; try { const codes = await detector.detect($("#scanner-video")); if (codes.length) { useBarcode(codes[0].rawValue); return; } } catch (_) {} scanTimer = setTimeout(() => scanFrame(detector), 250); }
async function openScanner() { if (!navigator.mediaDevices?.getUserMedia) { const barcode = prompt("Kamera kullanılamıyor. Barkod numarasını yazabilirsiniz:"); if (barcode) useBarcode(barcode); return; } $("#scanner").showModal(); $("#scanner-status").textContent = "Kamera hazırlanıyor…"; try { if (!("BarcodeDetector" in window) && window.ZXingBrowser?.BrowserMultiFormatReader) { const reader = new ZXingBrowser.BrowserMultiFormatReader(); zxingControls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } }, audio: false }, $("#scanner-video"), (result) => { if (result) useBarcode(result.getText()); }); $("#scanner-status").textContent = "Barkod aranıyor…"; return; } cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }); $("#scanner-video").srcObject = cameraStream; await $("#scanner-video").play(); $("#scanner-status").textContent = "Barkod aranıyor…"; scanFrame(new BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128"] })); } catch (_) { $("#scanner-status").textContent = "Kamera açılamadı. Tarayıcı kamera iznini kontrol edin."; } }

async function start() {
  state.data = await fetch("data/products.json").then((response) => response.json()); renderHome(); $("#updated").textContent = `${state.data.count} ürün • Son güncelleme: ${state.data.updated}`;
  const params = new URLSearchParams(location.search), code = params.get("kitabevi"), level = params.get("kademe");
  const catalog = state.data.catalogs.find((x) => x.bookstoreCode === code && slug(x.level) === level); if (catalog) openCatalog(catalog);
}

$("#q").addEventListener("input", () => { state.scanAllCourses = false; render(); }); $("#publisher").addEventListener("change", () => { state.scanAllCourses = false; render(); }); $("#clear").onclick = () => { $("#q").value = ""; $("#publisher").value = ""; state.kind = ""; state.scanAllCourses = false; renderTypes(); render(); }; $("#share").onclick = async () => { const data = { title: document.title, text: "Güncel öğretmen kitap fiyat listesi", url: location.href }; if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(location.href); $("#share").textContent = "Link kopyalandı"; } }; $("#scan").onclick = openScanner; $("#scanner-close").onclick = stopScanner; $("#scanner").addEventListener("cancel", (event) => { event.preventDefault(); stopScanner(); }); start().catch(() => { $("#updated").textContent = "Liste yüklenemedi. Lütfen sayfayı yenileyin."; });
