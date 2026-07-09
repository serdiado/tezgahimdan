# Tezgahımdan — Claude Code Notları

## Proje

Tezgahımdan, yerel pazarlardaki (özellikle belediyelerin kadın üreticilere verdiği
"kadın emeği pazarları") el yapımı ürünleri dijitale taşıyan bir **rezervasyon
platformudur**. WhatsApp'taki "aldım / ben almıştım" karmaşasını bitirir: alıcı ürünü
online rezerve eder, pazar günü (Seferihisar'da çarşamba) tezgahtan teslim alır.
Seferihisar'da başlıyor, ulusal büyüme hedefiyle tasarlanıyor. Hedef kitle teknolojiyle
çok haşır neşir olmayan üreticiler ve alıcılar — arayüz buna göre sade tutulur.

## Kutsal kural

Her özellik **WhatsApp'ta ürün paylaşmak kadar basit** olmalı. Bu sadeliği bozan
özellik ya hiç girmez ya sonraki faza kalır.

## Teknik yığın

Next.js (App Router, TypeScript) + PostgreSQL + Prisma 6 + Auth.js. Paket yöneticisi
**pnpm**. Docker yalnızca dev'de ve sadece DB için. Oracle VPS'e deploy. Marka rengi
mercan-pembe (`#F0517E` = `primary-500`).

## Değişmez kurallar

- **Hiçbir kayıt kalıcı silinmez** — silme = gizleme (soft delete: `silindiMi`; admin
  moderasyonu ayrı `gizliMi`).
- **Alıcı kimliği = telefon.**
- **Faz 1'de ödeme yok** — para pazarda nakit; online ödeme/kargo Faz 2+'ya bırakıldı.

## Terminoloji

Kullanıcıya görünen tüm metinlerde (satıcı/alıcı/admin paneli, vitrin, bildirim/hata
mesajları) **"mağaza" değil "tezgah"** kullanılır (2026-07-09 kararı, site adı
"tezgahimdan.com" ile tutarlılık için). Kod tarafı — değişken/dosya/component adları,
route'lar (`/magaza/[slug]`), `Magaza` Prisma modeli ve DB şeması — kasıtlı olarak
**"magaza" kalır**; DB migration ve URL kırılma riski alınmadı, çünkü koddaki
isimlendirme kullanıcıya hiç görünmüyor. Yeni kullanıcıya-görünen metin yazarken
"tezgah" kullan; kod tanımlayıcısı eklerken mevcut dosya/route adlarıyla tutarlı olması
için "magaza" kullanmaya devam edebilirsin.

## Çalışma tarzı

- Claude Code kodlar; her adımdan sonra kullanıcıya rapor sunulur, birlikte incelenir.
- Her iş zinciri: **kodla → psql ile bağımsız doğrula (API cevabına güvenme) → onaya
  sun → commit.**
- Model rehberi: riskli / eşzamanlılık işleri **Opus/Fable**, standart işler **Sonnet**.

## Mimari dokümantasyon

Mimari kararların genel özeti `docs/MIMARI.md`'de, her büyük konunun tam detayı
`docs/mimari/<konu-adi>.md` dosyasında. Yeni bir mimari karar alındığında
(eşzamanlılık, veri bütünlüğü, ölçeklenme gibi geri dönüşü zor kararlar):

1. `docs/mimari/` altında konuya özel bir dosya aç,
2. `docs/MIMARI.md`'ye 3-5 satırlık özet + link ekle.

Bir özelliğe başlamadan önce, o özelliğin ilgili bir mimari dosyası varsa önce onu oku.
