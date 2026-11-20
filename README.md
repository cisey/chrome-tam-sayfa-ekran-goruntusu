# Tam Sayfa Ekran Görüntüsü (Chrome Eklentisi)

Web sayfalarının tamamını otomatik kaydırarak yüksek çözünürlüklü **PNG** veya **JPEG** olarak yakalayan, Manifest V3 uyumlu Chrome eklentisi.

## Özellikler
- **Tam Sayfa Yakalama:** Sayfayı baştan sona otomatik kaydırır ve tüm bölümleri piksel hassasiyetinde tek bir görselde birleştirir.
- **Satır Kayması Düzeltmesi (v1.1):** Bölümler birleştirilirken kaydırma bilgisine güvenmek yerine, ardışık görüntüler piksel piksel karşılaştırılarak gerçek kayma ölçülür; yumuşak kaydırma, ekran ölçeği (%125 vb.) ve geç yüklenen içerik kaynaklı satır kaymaları giderildi.
- **Anında Durdurma / İptal:** Yakalama sırasında fikrinizi değiştirirseniz **Yakalamayı Durdur** düğmesiyle işlemi anında iptal edebilirsiniz; kaydırma konumu, sabit çubuklar ve kaydırma çubuğu otomatik olarak eski haline döner.
- **Sabit Çubuk Koruması:** `fixed` ve `sticky` üst/alt menüleri ilk kareden sonra geçici olarak gizleyerek görselde tekrar etmesini önler; işlem bitince sayfayı eski haline döndürür.
- **Görünür Alan Modu:** İsterseniz yalnızca ekranda görünen alanı anında yakalayabilirsiniz.
- **Önizleme Sekmesi:** Yakalama bitince açılan sekmede görseli inceleyebilir, `%100` yakınlaştırabilir, panoya kopyalayabilir veya PNG/JPEG olarak indirebilirsiniz.
- **Klavye Kısayolu:** `Alt + Shift + S` ile eklenti menüsünü hızlıca açabilirsiniz.

## Chrome'a Nasıl Yüklenir?
1. Bu ZIP dosyasını bilgisayarınızda bir klasöre çıkartın (ör. `tam-sayfa-ekran-goruntusu`).
2. Chrome adres çubuğuna `chrome://extensions` yazıp Enter'a basın.
3. Sağ üst köşedeki **Geliştirici modu (Developer mode)** anahtarını açın.
4. Sol üstten **Paketi açılmış öğe yükle (Load unpacked)** düğmesine tıklayın.
5. Çıkarttığınız `tam-sayfa-ekran-goruntusu` klasörünü (`manifest.json` dosyasının bulunduğu klasör) seçin.
6. Araç çubuğundaki yapboz simgesinden eklentiyi sabitleyerek tek tıkla kullanmaya başlayabilirsiniz.

## Notlar
- Chrome'un güvenlik kuralları gereği `chrome://` sistem sayfaları ve Chrome Web Mağazası üzerinde ekran görüntüsü alınamaz.
- Çok uzun sayfalarda tarayıcı tuval sınırı (32.767 px yükseklik) aşılırsa üst kısım yakalanır ve önizleme ekranında uyarı gösterilir.
