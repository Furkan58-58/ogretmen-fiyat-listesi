const state = { all: [], shown: [], course: "", kind: "" };
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
const norm = (value) => (value || "").toLocaleLowerCase("tr-TR");
const gradeOrder = ["9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Maarif TYT"];
const courseOrder = ["Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Türk Dili ve Edebiyatı", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "Türkçe", "Sosyal Bilimler", "Tüm Dersler"];
let cameraStream = null;
let scanTimer = null;
let zxingControls = null;

const showPrice = (value) => value == null ? "—" : money(value);

function productCard(product) {
  const name = product.promo
    ? `<a class="book-link" href="${product.promo}" target="_blank" rel="noopener">${product.bookName}</a>`
    : `<span>${product.bookName}</span>`;
  return `<article class="card"><div><div class="publisher">${name}</div><div class="meta">Barkod: ${product.barcode}</div></div><div><span class="tag">${product.type || "Kitap"}</span></div><div class="prices"><div><span>Fiyat</span><strong>${showPrice(product.price)}</strong></div><div><span>İnd</span><strong>${showPrice(product.discountPrice)}</strong></div><div><span>Toplu</span><strong>${showPrice(product.bulkPrice)}</strong></div></div></article>`;
}

function renderCourses() {
  const courses = [...new Set(state.all.map((x) => x.course).filter(Boolean))].sort((a, b) => {
    const ai = courseOrder.indexOf(a), bi = courseOrder.indexOf(b);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    return a.localeCompare(b, "tr");
  });
  if (!state.course) state.course = courses[0] || "";
  $("#courses").innerHTML = courses.map((course) => `<button class="grade-tab ${course === state.course ? "active" : ""}" data-course="${course}">${course}<small>${state.all.filter((x) => x.course === course).length} kitap</small></button>`).join("");
  $("#courses").querySelectorAll("button").forEach((button) => button.onclick = () => {
    state.course = button.dataset.course;
    state.kind = "";
    renderCourses();
    renderTypes();
    render();
    document.querySelector(".type-section").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderTypes() {
  const items = state.all.filter((x) => x.course === state.course);
  const types = [...new Set(items.map((x) => x.type || "Diğer"))].sort((a, b) => a.localeCompare(b, "tr"));
  $("#types").innerHTML = [`<button class="type-tab ${state.kind === "" ? "active" : ""}" data-kind="">Tümü</button>`, ...types.map((type) => `<button class="type-tab ${type === state.kind ? "active" : ""}" data-kind="${type}">${type}<small> (${items.filter((x) => (x.type || "Diğer") === type).length})</small></button>`)].join("");
  $("#types").querySelectorAll("button").forEach((button) => button.onclick = () => {
    state.kind = button.dataset.kind;
    renderTypes();
    render();
  });
}

function render() {
  const query = norm($("#q").value);
  const publisher = $("#publisher").value;
  state.shown = state.all.filter((x) => x.course === state.course
    && (!state.kind || (x.type || "Diğer") === state.kind)
    && (!query || norm([x.publisher, x.grade, x.category, x.type, ...(x.barcodes || [x.barcode])].join(" ")).includes(query))
    && (!publisher || x.publisher === publisher));
  $("#count").textContent = `${state.course}${state.kind ? ` • ${state.kind}` : ""} • ${state.shown.length} ürün`;
  $("#empty").hidden = state.shown.length > 0;
  const groups = {};
  state.shown.forEach((x) => (groups[x.grade || "Diğer"] ??= []).push(x));
  $("#list").innerHTML = Object.entries(groups)
    .sort((a, b) => (gradeOrder.indexOf(a[0]) < 0 ? 99 : gradeOrder.indexOf(a[0])) - (gradeOrder.indexOf(b[0]) < 0 ? 99 : gradeOrder.indexOf(b[0])))
    .map(([grade, items]) => `<details class="course-group" open><summary><span>${grade}</span><span class="course-count">${items.length} kitap</span></summary><div class="course-cards">${items.map(productCard).join("")}</div></details>`).join("");
}

function stopScanner() {
  if (scanTimer) clearTimeout(scanTimer);
  scanTimer = null;
  if (zxingControls) zxingControls.stop();
  zxingControls = null;
  if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  $("#scanner-video").srcObject = null;
  if ($("#scanner").open) $("#scanner").close();
}

function useBarcode(barcode) {
  const value = String(barcode || "").trim();
  if (!value) return;
  $("#q").value = value;
  state.course = state.all.find((x) => (x.barcodes || [x.barcode]).map(String).includes(value))?.course || state.course;
  state.kind = "";
  stopScanner();
  renderCourses();
  renderTypes();
  render();
  document.querySelector(".result-head").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function scanFrame(detector) {
  if (!cameraStream) return;
  try {
    const codes = await detector.detect($("#scanner-video"));
    if (codes.length) {
      useBarcode(codes[0].rawValue);
      return;
    }
  } catch (_) {}
  scanTimer = setTimeout(() => scanFrame(detector), 250);
}

async function openScanner() {
  if (!navigator.mediaDevices?.getUserMedia) {
    const barcode = prompt("Bu tarayıcı kamerayla barkod okumayı desteklemiyor. Barkod numarasını yazabilirsiniz:");
    if (barcode) useBarcode(barcode);
    return;
  }
  $("#scanner").showModal();
  $("#scanner-status").textContent = "Kamera hazırlanıyor…";
  try {
    if (!("BarcodeDetector" in window) && window.ZXingBrowser?.BrowserMultiFormatReader) {
      const reader = new ZXingBrowser.BrowserMultiFormatReader();
      zxingControls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        $("#scanner-video"),
        (result) => { if (result) useBarcode(result.getText()); }
      );
      $("#scanner-status").textContent = "Barkod aranıyor…";
      return;
    }
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    $("#scanner-video").srcObject = cameraStream;
    await $("#scanner-video").play();
    $("#scanner-status").textContent = "Barkod aranıyor…";
    const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128"] });
    scanFrame(detector);
  } catch (_) {
    $("#scanner-status").textContent = "Kamera açılamadı. Tarayıcı kamera iznini kontrol edin.";
  }
}

async function start() {
  const data = await fetch("data/products.json").then((response) => response.json());
  state.all = data.products;
  if (data.theme) {
    document.documentElement.style.setProperty("--navy", data.theme.mainColor);
    document.documentElement.style.setProperty("--gold", data.theme.accentColor);
    $("#site-title").textContent = data.theme.title;
    $("#site-subtitle").textContent = data.theme.subtitle;
    document.title = data.theme.title;
  }
  $("#updated").textContent = `${data.count} ürün • Son güncelleme: ${data.updated}`;
  [...new Set(state.all.map((x) => x.publisher).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")).forEach((value) => $("#publisher").add(new Option(value, value)));
  renderCourses();
  renderTypes();
  render();
}

["#q", "#publisher"].forEach((id) => $(id).addEventListener(id === "#q" ? "input" : "change", render));
$("#clear").onclick = () => { $("#q").value = ""; $("#publisher").value = ""; state.kind = ""; renderTypes(); render(); };
$("#share").onclick = async () => { const data = { title: document.title, text: "Güncel öğretmen kitap fiyat listesi", url: location.href }; if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(location.href); $("#share").textContent = "Link kopyalandı"; } };
$("#scan").onclick = openScanner;
$("#scanner-close").onclick = stopScanner;
$("#scanner").addEventListener("cancel", (event) => { event.preventDefault(); stopScanner(); });
start().catch(() => { $("#updated").textContent = "Liste yüklenemedi. Lütfen sayfayı yenileyin."; });
