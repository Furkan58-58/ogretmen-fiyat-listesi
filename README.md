# Öğretmen Fiyat Listesi

Bu proje, `output/Fiyat-Listesi-Yonetim.xlsx` dosyasındaki ürünleri öğretmenlerin telefondan kullanabileceği web sayfasına ve WhatsApp'ta paylaşılabilecek PDF'e dönüştürür.

## Güncelleme

1. `output/Fiyat-Listesi-Yonetim.xlsx` dosyasında ürün veya fiyatları değiştirin.
2. `İndirimler` sayfasında her Yayın + Sınıf için Tekli ve Toplu indirim oranını yazın; `İnd` ve `Toplu` fiyatlar otomatik hesaplanır.
3. `Tasarım` sayfasından başlık, alt başlık, ana renk ve vurgu rengini değiştirin.
4. Dosyayı aynı adla kaydedin.
5. Değişikliği GitHub'a yükleyin. Web listesi ve PDF otomatik yenilenir.

Bir ürünün yeni veya ek barkodlarını `Ürünler` sayfasındaki **K - Yeni Barkodlar** sütununa yazın. Birden fazla barkodu virgülle ayırın. Eski barkod ve bu sütundaki bütün barkodlar web aramasında kullanılabilir.

Tanıtım Linki bulunan satırlarda oluşturulan kitap adı tıklanabilir olur. GitHub deposunda **Settings → Pages → Source** bölümünü **GitHub Actions** olarak seçin. Yayın adresi oluşunca program GitHub proje bağlantısını otomatik gösterir ve aynı bağlantı için QR kod üretilebilir; Excel ve PDF değişse bile QR kod değişmez.
