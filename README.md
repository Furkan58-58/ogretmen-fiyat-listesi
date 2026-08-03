# Öğretmen Fiyat Listesi

Bu proje, `output/Fiyat-Listesi-Yonetim.xlsx` dosyasındaki ürünleri öğretmenlerin telefondan kullanabileceği web sayfasına ve WhatsApp'ta paylaşılabilecek PDF'e dönüştürür.

## Güncelleme

1. `output/Fiyat-Listesi-Yonetim.xlsx` dosyasında ürün veya fiyatları değiştirin.
2. `İndirimler` sayfasında her Yayın + Sınıf için Tekli ve Toplu indirim oranını yazın; `İnd` ve `Toplu` fiyatlar otomatik hesaplanır.
3. `Tasarım` sayfasından başlık, alt başlık, ana renk ve vurgu rengini değiştirin.
4. Dosyayı aynı adla kaydedin.
5. Değişikliği GitHub'a yükleyin. Web listesi ve PDF otomatik yenilenir.

Bir ürünün yeni veya ek barkodlarını `Ürünler` sayfasındaki **K - Yeni Barkodlar** sütununa yazın. Birden fazla barkodu virgülle ayırın. Eski barkod ve bu sütundaki bütün barkodlar web aramasında kullanılabilir.

## Kitabevi ve kademe ayarları

- `Ürünler` sayfasında ürün bilgileri K sütununda biter; kitabevi seçimi ürün satırlarında yapılmaz.
- `Ayarlar` sayfasında sınıfların `Ortaokul` veya `Lise` kademesini, kitabevi kodu/adı listesini ve her yayınevinin ait olduğu kitabevini düzenleyin.
- Yeni yayınevi eklediğinizde `Fiyat Listesini Guncelle.cmd` eşleştirme listesine yayınevini otomatik ekler; yeni kayıt başlangıçta `kitabevi-1` olur.
- `Sayfa Ayarları` sayfasında dört giriş bölümünün açıklama, renk, görünürlük, sıra ve logo bağlantısını değiştirin. Başlık, `Ayarlar` sayfasındaki kitabevi adından otomatik oluşturulur.
- `İletişim` sayfasına aynı kitabevi ve kademe için istediğiniz kadar ad-soyad ve telefon satırı ekleyin.

Ana sayfa her aktif kitabevi-kademe birleşimi için ayrı bir bağlantı oluşturur. Yeni ürün listenin en altına eklense bile ders ve sınıf bilgisine göre otomatik olarak doğru grupta gösterilir. Her bölümün PDF dosyası ayrıca hazırlanır.


Tanıtım Linki bulunan satırlarda oluşturulan kitap adı tıklanabilir olur. GitHub deposunda **Settings → Pages → Source** bölümünü **GitHub Actions** olarak seçin. Yayın adresi oluşunca program GitHub proje bağlantısını otomatik gösterir ve aynı bağlantı için QR kod üretilebilir; Excel ve PDF değişse bile QR kod değişmez.
