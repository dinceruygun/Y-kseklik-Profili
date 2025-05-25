# Kesit Alma Uygulaması

Bu web uygulaması, harita üzerinde seçilen noktalar arasındaki yükseklik verilerini Google Maps Elevation API kullanarak alır ve interaktif bir kesit profili oluşturur.

<img width="1675" alt="image" src="https://github.com/user-attachments/assets/d27cb4a4-812a-4cf4-b276-964fd6c2620f" />


## 🌟 Özellikler

- 🗺️ OpenLayers ile interaktif harita üzerinde nokta seçimi
- 📊 Google Maps Elevation API ile yükseklik verisi alma
- 📈 İnteraktif 2D kesit profili çizimi
- 🖱️ Mouse ile profil üzerinde gezinme ve anlık yükseklik bilgisi görüntüleme
- 📏 Mesafe, yükseliş/düşüş ve eğim hesaplamaları
- 🎨 Modern ve kullanıcı dostu arayüz

## 🚀 Kurulum

1. Projeyi klonlayın:
```bash
git clone https://github.com/dinceruygun/Y-kseklik-Profili.git
cd Y-kseklik-Profili
```

2. Google Cloud Console'dan bir API anahtarı alın:
   - [Google Cloud Console](https://console.cloud.google.com)'a gidin
   - Yeni bir proje oluşturun
   - Maps JavaScript API ve Elevation API'yi etkinleştirin
   - API anahtarı oluşturun

3. API anahtarınızı `index.html` dosyasında güncelleyin:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=elevation"></script>
```

4. Dosyaları bir web sunucusunda çalıştırın:
```bash
# Python ile basit bir HTTP sunucusu başlatmak için:
python -m http.server 8000
```

## 💻 Kullanım

1. "Haritadan Seç" butonuna tıklayın
2. Harita üzerinde istediğiniz noktaları tıklayarak seçin
3. "Kesit Oluştur" butonuna tıklayın
4. Alt panelde açılan kesit profili üzerinde mouse ile gezinebilirsiniz
5. "Temizle" butonu ile baştan başlayabilirsiniz

## 📊 Kesit Profili Özellikleri

- Minimum, maksimum ve ortalama yükseklik değerleri
- Toplam mesafe
- Toplam yükseliş ve düşüş
- Maksimum ve minimum eğim değerleri
- Mouse ile gezinirken anlık yükseklik ve mesafe bilgisi

## 🛠️ Teknolojiler

- [OpenLayers](https://openlayers.org/) - Harita görselleştirme
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) - Yükseklik verileri
- [Bootstrap](https://getbootstrap.com/) - UI bileşenleri
- [jQuery](https://jquery.com/) - DOM manipülasyonu

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🤝 Katkıda Bulunma

1. Bu depoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Bir Pull Request oluşturun

## 📧 İletişim

Proje Sahibi - [@dinceruygun](https://github.com/dinceruygun)

Proje Linki: [https://github.com/dinceruygun/Y-kseklik-Profili](https://github.com/dinceruygun/Y-kseklik-Profili) 
