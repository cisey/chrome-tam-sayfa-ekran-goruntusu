# FullSnap — Chrome Tam Sayfa Ekran Görüntüsü ve PDF Alma Eklentisi

**FullSnap**, Google Chrome ve Chromium tabanlı tarayıcılarda (Edge, Brave, Opera, Vivaldi) web sayfalarının tamamını tek tıkla, **ücretsiz, reklamsız ve filigransız** olarak **PNG, JPEG veya PDF** formatında yakalayan açık kaynaklı **tam sayfa ekran görüntüsü alma eklentisi**dir.

Klasik uzun ekran görüntüsü alma eklentileri modern web sitelerindeki açılır pencerelerde (modal), iç kaydırmalı tablolarda veya yapışkan (sticky) üst menülerde bozuk kayıt üretir. FullSnap, aktif kaydırma alanını otomatik algılar, sabit menülerin tekrar etmesini engeller ve ardışık kareleri piksel piksel hizalayarak tek parça görsel veya PDF oluşturur.

## Neden FullSnap?

- **Tamamen Ücretsiz ve Açık Kaynak:** Abonelik, ücretli sürüm, reklam veya görsel/PDF üzerinde filigran yoktur.
- **Gizlilik Odaklı (%100 Yerel):** Ekran görüntüleri ve PDF dosyaları yalnızca kendi bilgisayarınızda üretilir; hiçbir sunucuya gönderilmez, hesap açmanız gerekmez.
- **Kayma ve Kesilme Yapmaz:** Ardışık kareleri piksel düzeyinde karşılaştırarak birleştirir; yumuşak kaydırma (smooth scroll), geç yüklenen içerikler ve Windows'ta yaygın **%125 ekran ölçeği** kaynaklı satır kaymalarını önler.
- **Modal ve İç Kaydırmalı Sayfa Desteği:** Sigorta karşılaştırma ekranları, yönetim panelleri veya tam ekran pencereler gibi kendi içinde kayan alanları otomatik tanıyıp doğru alanı yakalar.
- **Hafif ve Güncel:** Chrome **Manifest V3** standardıyla geliştirilmiştir; yalnızca siz tıkladığınızda çalışır, arka planda bellek tüketmez.

## Özellikler

- **PNG, JPEG ve PDF Çıktısı (v1.2):** Tek tıkla kayıpsız **PNG**, düşük boyutlu **JPEG**, yazdırmaya hazır **A4 Sayfalı PDF** veya kesintisiz **Tek Sayfa PDF** oluşturabilirsiniz.
- **Tam Sayfa ve Görünür Alan Modu:** İster kaydırarak tüm sayfayı, ister yalnızca ekranda görünen bölümü tek tıkla yakalayın.
- **Sabit Üst/Alt Menü Koruması:** Sayfa kayarken ekranda sabit kalan `fixed` ve `sticky` çubukları ilk kareden sonra geçici olarak gizler; işlem bitince sayfayı eski haline döndürür.
- **Anında Durdurma (İptal Etme):** Uzun bir sayfayı yakalarken vazgeçerseniz **Yakalamayı Durdur** düğmesiyle işlemi anında iptal edebilirsiniz.
- **Dahili Önizleme ve Dışa Aktarma Sekmesi:** Yakalama bittiğinde açılan önizleme sekmesinde görseli **Sığdır** veya **%100** boyutunda inceleyebilir, **panoya kopyalayabilir** ya da dilediğiniz an **PNG / JPEG / PDF (A4) / PDF (Tek Sayfa)** olarak indirebilirsiniz.
- **Büyük Sayfalarda Boyut Sınırı Yok:** Görüntü aktarımı tarayıcı içi IndexedDB üzerinden yapıldığı için yüksek çözünürlüklü uzun sayfalarda aktarım hatası vermez.
- **Klavye Kısayolu:** Herhangi bir sekmede `Alt + Shift + S` tuşlarına basarak eklentiyi hızlıca açabilirsiniz.

## Chrome'a Nasıl Kurulur? (2 Dakikada)

Kod bilginiz olmadan doğrudan ZIP indirerek kurabilirsiniz:

1. Bu sayfanın sağ üstündeki yeşil **`<> Code`** düğmesine tıklayın ve **Download ZIP** seçeneğiyle dosyayı indirin.
2. İndirdiğiniz ZIP dosyasını bilgisayarınızda bir klasöre çıkarın (örneğin `FullSnap`).
3. Chrome adres çubuğuna `chrome://extensions` yazıp **Enter** tuşuna basın.
4. Sağ üst köşedeki **Geliştirici modu (Developer mode)** anahtarını açın.
5. Sol üstten **Paketi açılmış öğe yükle (Load unpacked)** düğmesine tıklayın ve çıkardığınız `FullSnap` klasörünü (`manifest.json` dosyasının bulunduğu klasör) seçin.
6. Chrome araç çubuğundaki yapboz simgesinden **FullSnap** eklentisini sabitleyin.

*(Git kullananlar için: `git clone https://github.com/cisey/fullsnap.git` komutuyla indirip aynı şekilde yükleyebilirsiniz.)*

## Nasıl Kullanılır?

1. Tam sayfa ekran görüntüsü almak istediğiniz web sayfasını açın.
2. Araç çubuğundaki **FullSnap** simgesine tıklayın (veya `Alt + Shift + S` kısayolunu kullanın).
3. Formatı (**PNG**, **JPEG**, **PDF (A4 Sayfalı)** veya **PDF (Tek Sayfa)**) seçin ve **Tam Sayfayı Yakala** düğmesine basın.
4. Sayfa otomatik olarak aşağı kaydırılıp birleştirildikten sonra önizleme sekmesi açılır; otomatik indirme açıksa seçtiğiniz formatta doğrudan İndirilenler klasörüne kaydedilir.

## Sıkça Sorulan Sorular

**Chrome'da tam sayfa ekran görüntüsü ve PDF almak ücretsiz mi?**
Evet. FullSnap tamamen ücretsiz, reklamsız ve MIT lisanslı açık kaynak bir eklentidir.

**Microsoft Edge, Brave veya Opera'da çalışır mı?**
Evet. Chromium tabanlı tüm tarayıcılarda (`edge://extensions`, `brave://extensions`, `opera://extensions`) aynı adımlarla kurulup sorunsuz çalışır.

**Eklenti hangi izinleri istiyor ve güvenli mi?**
Yalnızca çalışması için zorunlu olan üç izni ister: `activeTab` (sadece tıkladığınız aktif sekmeyi görmek), `scripting` (sayfayı kaydırmak) ve `downloads` (görsel veya PDF dosyasını bilgisayarınıza kaydetmek). İnternete hiçbir veri göndermez.

**Neden bazı Chrome sayfalarında çalışmıyor?**
Chrome'un güvenlik politikaları gereği `chrome://` sistem sayfaları, tarayıcı ayarları ve Chrome Web Mağazası üzerinde hiçbir eklenti ekran görüntüsü alamaz.

## Proje Dosya Yapısı

| Dosya / Klasör | Açıklama |
| :--- | :--- |
| `manifest.json` | Chrome Manifest V3 yapılandırması, izinler ve klavye kısayolu |
| `background.js` | Kaydırma hedefi algılama, hız sınırı korumalı yakalama, iptal yönetimi ve piksel hizalamalı `OffscreenCanvas` birleştirme |
| `pdf.js` | Sıfır bağımlılıklı, %100 yerel PDF 1.4 oluşturucu (A4 sayfalı ve tek uzun sayfa) |
| `db.js` | Büyük ekran görüntülerini sekme ve servis arasında boyut sınırı olmadan aktaran IndexedDB yardımcısı |
| `popup.html`, `popup.css`, `popup.js` | Eklenti açılır menüsü, ayarlar, canlı ilerleme çubuğu ve durdurma düğmesi |
| `viewer.html`, `viewer.css`, `viewer.js` | Yakınlaştırma, panoya kopyalama ve PNG/JPEG/PDF indirme özellikli önizleme sekmesi |
| `icons/` | Eklenti simgeleri (`16px`, `48px`, `128px`) |

## Sınırlamalar

- Tarayıcıların dahili tuval (canvas) sınırı olan **32.767 px** yüksekliğini aşan çok uzun sayfalarda üst bölüm yakalanır ve önizleme ekranında bilgilendirme uyarısı gösterilir.

## Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakabilirsiniz.
