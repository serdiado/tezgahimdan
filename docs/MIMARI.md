# Mimari Kararlar — Tezgahımdan

Bu dosya bir **indeks**: projedeki büyük mimari kararların kısa özeti ve nerede detaylandırıldığı. "Neden böyle yapıldı" sorusunun kısa cevabı burada, tam cevap ilgili detay dosyasında (`docs/mimari/` altında).

Yeni bir mimari karar alındığında (özellikle eşzamanlılık, veri bütünlüğü, ölçeklenme gibi geri dönüşü zor kararlarda):
1. Konuya özel bir detay dosyası aç (`docs/mimari/<konu-adi>.md`)
2. Bu dosyaya 3-5 satırlık bir özet + link ekle

---

## Rezervasyon kilidi ve kuyruk mantığı

Pesimistik satır kilidi (`SELECT ... FOR UPDATE`) ile aktif+yedek kuyruğu yönetimi. Eşzamanlılık riski en yüksek bölüm — 8 paralel istekle test edildi.

→ Detay: [`docs/mimari/rezervasyon-motoru.md`](./mimari/rezervasyon-motoru.md)

**Bilinmesi gereken bağımlılık:** Ürünü `doldu` durumuna çeviren tek yer bu akış. Slot boşaltan her yeni özellik (Vazgeç, haftalık sıfırlama, admin müdahalesi) `doldu → sergide` geri dönüşünü yapmayı unutmamalı.

---

## Bilinen kısıtlar (deploy öncesi gözden geçirilecek — tüm proje geneli)

- **Rate-limit yok:** SMS doğrulaması gelene kadar, sahte numaralarla kuyruk doldurulabilir. Deploy öncesi en azından IP bazlı limit değerlendirilmeli.
- **Telefonla mevcut rezerv kodu ifşası:** Aynı telefonu tekrar giren biri, o numaranın mevcut kodunu görüyor. SMS doğrulamasıyla kendiliğinden kapanır.
- **Satıcı kendi ürününe rezervasyon yapabiliyor:** Şu an engellenmiyor, kural tanımsız.
- **Stok sonradan düşürülürse:** Mevcut aktif rezervasyon sayısı yeni stoktan büyük kalabilir. Ürün düzenleme akışı yazılırken ele alınacak.
