# Güvenilirlik (Ceza-Ödül) Sistemi — Mimari

İlgili genel özet: [`../MIMARI.md`](../MIMARI.md#güvenilirlik-ceza-ödül-sistemi)

Halk diline çevrilmiş, teknik olmayan anlatım için: [`../kilavuz/rezervasyon-ve-guvenilirlik.md`](../kilavuz/rezervasyon-ve-guvenilirlik.md).

Bu dosya önceden `rezervasyon-motoru.md` içinde küçük bir bölümdü ("Güvenilirlik kısıtlaması (PLAN §3)"); sistem büyüdükçe kendi kararlarını taşıyan ayrı bir konu haline geldi, bu yüzden ayrı dosyaya taşındı (`rezervasyon-motoru.md`'de artık sadece pointer var).

## Karar: Kalıcı bir "puan" değil, her seferinde yeniden hesaplanan canlı sayım

`Kullanici` modelinde `puan`/`guvenilirlikPuani` gibi bir sayısal alan **yok**. Sistem, her rezervasyon denemesinde `Rezervasyon` tablosundan o alıcının `durum='gelmedi'` kayıtlarını `COUNT` ile canlı sayar (`rezervasyon.ts:172-178`); sonuç hiçbir yere yazılıp saklanmaz.

Not: `haftalik-sifirlama.md`'deki "puan sistemine bağlantı (henüz kurulmadı)" ifadesi gelecek zaman kipiyle yazılmış, ama kodda bugün var olan mekanizma zaten bu basit sayaç+eşik modeli — ayrı, daha gelişmiş bir "puan sistemi" hiç inşa edilmedi (`src` genelinde `guvenilirlik|gelmedi` taraması başka bir mekanizma ortaya çıkarmadı). İleride "puan sistemi" adıyla ayrı bir şey planlanıyorsa, bunun bu eşik-modelinin yerine mi geçeceği yoksa üstüne mi ekleneceği netleştirilmeli (bkz. "İleride ele alınacaklar").

## Kısıtlamanın iki şartı (motor kapısı)

Eşik (`PlatformAyarlari.guvenilirlikEsigi`, varsayılan **3**, `schema.prisma:387`) aşıldığında otomatik/toptan bir yasak uygulanmaz. Kısıtlama yalnızca **iki şart birden** sağlandığında devreye girer (`rezervasyon.ts:179-186`):

```
if (gelmediSayisi >= ayarlar.guvenilirlikEsigi) {
  const aktifRezervasyonVarMi = ... count(durum:'bekliyor', tip:'aktif')
  if (aktifRezervasyonVarMi > 0) {
    return { tur: "guvenilirlik-kisitli", gelmediSayisi };
  }
}
```

1. `gelmedi` sayısı eşiğe ulaşmış/geçmiş, **VE**
2. alıcının **o an** herhangi bir üründe `bekliyor`+`aktif` bir rezervasyonu var.

İkinci şart sağlanmıyorsa (elde aktif rezervasyon yok) — geçmiş sayı eşiği çoktan aşmış olsa bile — **yeni rezervasyon yapılabilir**. Kısıtlanan kullanıcıya dönen mesaj: *"Şu an aktif bir rezervasyonunuz var. Yeni bir rezervasyon yapabilmek için önce onu tamamlamanız gerekiyor."* (`api/rezervasyon/route.ts:105-112`). Başka hiçbir şey etkilenmez (giriş, mevcut rezervasyonları görme, vazgeçme, değerlendirme yazma serbest); bu, admin'in `Kullanici.yasakliMi` ile yaptığı tam platform banından **tamamen ayrı** bir mekanizmadır.

**Test kanıtı (canlı, `psql` ile bağımsız doğrulandı):** Stok=1 ürüne 8 gerçek girişli alıcıdan biri (3×`gelmedi` + 1×aktif `bekliyor` geçmişiyle) dahil, 8 paralel istek:

```
alici_3 -> 409 {"hata":"Şu an aktif bir rezervasyonunuz var..."}   <- kısıtlı alıcı
```

Kısıtlı alıcı çıkınca kalan 7 kişi kapasite 6'yı (1 aktif + 5 yedek) paylaştı; kısıtlı alıcının bu üründe **0** kaydı oluştu, geçmişi (3 gelmedi + 1 bekliyor) test sırasında değişmedi.

Ardından aynı alıcı tek engeli (aktif rezervasyonu) vazgeçti (gelmedi sayısı hâlâ 3, değişmedi) → hemen sonraki deneme **201 başarılı**. Kısıtlama kalıcı bir "silme" değil, kapının o anki koşulunun sağlanmaması.

## Kapsam: pazar/mağaza sınırı taşımıyor

`gelmediSayisi` ve `aktifRezervasyonVarMi` sorguları yalnızca `aliciId`'ye göre filtrelenir, `urunId`/pazar hiç girmez. Bir pazardaki bir tezgahta biriken `gelmedi` geçmişi, tamamen alakasız başka bir pazardaki tezgahta da alıcıyı kısıtlar.

**Test kanıtı (canlı, çok-pazarlı senaryo):** Bir alıcı Seferihisar pazarındaki bir tezgahta 3×`gelmedi` + 1×aktif `bekliyor` biriktirdi; aynı alıcı alakasız Yeşilyurt pazarındaki farklı bir tezgahın ürününde yeni rezervasyon denedi → `409 guvenilirlik-kisitli`. `psql`: o üründe bu alıcı adına 0 kayıt açıldı.

## Rozet (satıcı/admin ekranları) ile motor kapısı arasındaki fark — bilinçli ayrım

Satıcı panelindeki "Kısıtlı" rozeti (`panel/rezervasyonlar`, `KuyrukKarti.tsx`) ve admin'in `/admin/guvenilirlik` listesi, **yalnızca** `gelmedi >= esik`'e bakar — motorun asıl kapısındaki ikinci şartı (o an aktif rezervasyon var mı) **kontrol etmez/göstermez**. Sonuç: rozette/listede "Kısıtlı" görünen bir alıcının elinde aktif rezervasyon yoksa, aslında yeni rezervasyon yapabilir durumdadır.

**Test kanıtı (canlı):** Alıcı tek engeli olan aktif rezervasyonunu vazgeçti (gelmedi hâlâ 3) → yeni rezervasyon **201 başarılı** (motor izin verdi), oysa satıcı panelindeki rozet bu alıcıyı hâlâ "Kısıtlı" gösterecektir.

`/admin/guvenilirlik` sayfa metni şu an "yeni rezervasyon alamazlar" diyor (`admin/guvenilirlik/page.tsx:68-69`) — bu ifade **her zaman doğru değil** (yukarıdaki ayrım yüzünden). UI metni yanıltıcı, düzeltilmesi gerekiyor (bkz. "İleride ele alınacaklar").

`/admin/kullanicilar/[id]` sayfasında da aynı `gelmediSayisi` hesabı tekrarlanır; eşiği aşıyorsa uyarı ikonu + sıfırlama butonu gösterilir, ama buton `gelmediSayisi > 0` olduğunda zaten görünür — eşiğin aşılmış olması şart değildir (`admin/kullanicilar/[id]/page.tsx:56-67, 126-160`).

## Sıfırlama mekanizması

İki yol var:

1. **Dolaylı (kullanıcı elinde):** Elindeki aktif rezervasyonu bitirince (alıp/vazgeçince) motor kapısının ikinci şartı ortadan kalkar — geçmiş sayı değişmeden yeni rezervasyon yapılabilir hale gelir.
2. **Admin sıfırlaması:** `/admin/guvenilirlik` → "Güvenilirliği Sıfırla" → `POST /api/admin/kullanici-guvenilirlik-sifirla` → `Kullanici.guvenilirlikSifirlamaTarihi` alanına `now()` yazılır (`route.ts:27-38`).

**`guvenilirlikSifirlamaTarihi` geçmiş kayıtları SİLMEZ** (proje ilkesi: hiçbir kayıt kalıcı silinmez) — sadece sayım sorgusuna bir tarih filtresi ekler:

```
rezervasyon.ts:172-178:
where: {
  aliciId, durum: "gelmedi",
  ...(guvenilirlikBaslangici ? { createdAt: { gt: guvenilirlikBaslangici } } : {}),
}
```

Sıfırlamadan **önceki** `gelmedi` kayıtları artık sayılmaz (DB'de fiziksel olarak durur), sıfırlamadan **sonraki** yeni `gelmedi` kayıtları sıfırdan sayılmaya başlar ve eşiği yeniden aşarsa kısıtlama **tekrar devreye girer**. Kalıcı bir muafiyet değildir; "geri alma" (sıfırlamayı iptal etme) yoktur, admin gerekirse tekrar sıfırlar, tarih güncellenir.

## Ayarlanabilir parametreler

`guvenilirlikEsigi` (varsayılan 3) ve `maxYedek` (yedek kuyruğu sınırı, varsayılan 5) ikisi de `/admin/ayarlar` → `PlatformAyarlariForm.tsx` üzerinden değiştirilebilir, `POST /api/admin/platform-ayarlari-guncelle`'a gider:

- `guvenilirlikEsigi`: tam sayı, **1–20** aralığı zorunlu (`MIN_ESIK=1`, `MAX_ESIK=20`, route.ts:9-10, 24-29).
- `maxYedek`: **0–50** aralığı zorunlu (`MIN_YEDEK=0`, `MAX_YEDEK_SINIRI=50`).
- Geçerliyse `PlatformAyarlari` tekil satırı upsert edilir, audit: `platform_ayarlari_guncellendi:esik=X:yedek=Y` (`DurumGecmisi`).
- Motor bu değerleri **her çağrıda taze okur** (`platformAyarlariGetir()`, kilit öncesi) — admin değiştirdiği an bir sonraki rezervasyon denemesinden itibaren yeni değerler geçerli olur, ayrı bir migration/deploy gerekmez.

## Haftalık sıfırlamayla bağlantı

Otomatik "gelmedi" cezasının bir kaynağı daha var: pazar kapanışında hâlâ `bekliyor` olan ve **pazar başlangıcında zaten aktif** olan kayıtlar otomatik `gelmedi` yazılır (`aktifOlmaZamani < pazarBaslangicAni`, `rezervasyon.ts:813-819`); bu olay da güvenilirlik sayımına girer. Sonradan yükselen aktifler ve tüm yedekler ise cezasız `iptal` edilir. Tam mekanizma: [`haftalik-sifirlama.md`](./haftalik-sifirlama.md).

## İleride ele alınacaklar

- **Admin listesi/rozet metni yanıltıcı:** `/admin/guvenilirlik` sayfasının "yeni rezervasyon alamazlar" ifadesi ve satıcı panelindeki "Kısıtlı" rozeti, motorun asıl iki-şartlı kapısını yansıtmıyor — sadece eşiği aşmayı gösteriyor. UI metni netleştirilmeli ya da liste ikinci şartı (aktif rezervasyon var mı) da göstermeli.
- **İtiraz mekanizması yok:** Otomatik "gelmedi" cezaları (özellikle haftalık sıfırlamadan gelenler) admin tarafından görülebilir ama bir alıcının "haksız yere gelmedi yazıldı" itirazını tek işlemle geri almak mümkün değil; şimdilik tek çözüm güvenilirlik sıfırlama (geçmişi silmeden, tarih filtresiyle).
- **"Puan sistemi" terminolojisi belirsiz:** `haftalik-sifirlama.md` ileride ayrı bir "puan sistemi" ima ediyor ama bugün kodda bu eşik-modelinin dışında bir şey yok. Sistem daha da geliştirilecekse (kullanıcının az önce belirttiği gibi), bu genişlemenin mevcut eşik-modelinin üstüne mi ekleneceği yoksa onun yerini mi alacağı önceden netleştirilmeli.
- **`guvenilirlikSifirlamaTarihi` sınırsız tekrar sıfırlanabiliyor:** Kod bunu engellemiyor (her admin isteği `now()` ile üzerine yazıyor), bir "kaç kere sıfırlanabilir" politikası yok — bilinçli bir esneklik mi yoksa kötüye kullanım riski mi, değerlendirilmedi.
