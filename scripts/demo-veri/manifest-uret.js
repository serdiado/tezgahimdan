// Kullanicinin bulacagi demo fotograflarinin listesini KATALOGDAN uretir - elle
// yazilmis liste katalog degisince sessizce eskir, bu senkron kalir.
// Hangi ogenin gerekli oldugu secim.js'ten gelir (gozle dogrulama sonucu).
// Cikti: fotograflar/LISTE.md

const { writeFile, mkdir } = require("node:fs/promises");
const path = require("node:path");
const { TEZGAHLAR } = require("./katalog");
const { SECIMLER, KULLANICIDAN_BEKLENEN } = require("./secim");

const HEDEF = path.join(__dirname, "fotograflar");

async function main() {
  await mkdir(HEDEF, { recursive: true });

  // Duz liste: tezgahlar + urunler
  const ogeler = [];
  for (const t of TEZGAHLAR) {
    ogeler.push({
      taban: t.dosya.replace(/\.[a-z]+$/, ""),
      ne: `**Tezgah fotoğrafı** — ${t.magazaAd}`,
      ipucu: t.foto,
      kim: `${t.magazaAd} (${t.kategori})`,
    });
  }
  for (const t of TEZGAHLAR) {
    for (const u of t.urunler) {
      ogeler.push({
        taban: u.dosya.replace(/\.[a-z]+$/, ""),
        ne: u.baslik,
        ipucu: u.foto,
        kim: t.magazaAd,
      });
    }
  }

  const gerekliler = ogeler.filter((o) => o.taban in KULLANICIDAN_BEKLENEN);
  const hazirlar = ogeler.filter((o) => o.taban in SECIMLER);
  const bilinmeyen = ogeler.filter((o) => !(o.taban in SECIMLER) && !(o.taban in KULLANICIDAN_BEKLENEN));

  const gerekliSatir = gerekliler
    .map((o) => `| \`${o.taban}\` | **${o.ne}** | ${o.kim} | ${KULLANICIDAN_BEKLENEN[o.taban]} |`)
    .join("\n");

  const hazirSatir = hazirlar
    .map((o) => `| \`${o.taban}\` | ${o.ne} | ${o.kim} |`)
    .join("\n");

  const md = `# Demo fotoğraf listesi

Toplam **${ogeler.length}** görsel (14 tezgah + ${ogeler.length - 14} ürün).

- **${gerekliler.length} tanesi senden gerekli** (aşağıdaki ilk tablo) — açık lisanslı
  havuzlarda (Wikimedia Commons / Openverse) makul bir karşılığını bulamadım.
- **${hazirlar.length} tanesi hazır** — gözle doğrulanmış açık lisanslı görsel
  \`fotograflar/varsayilan/\` altında duruyor. İstersen bunları da kendin koyabilirsin,
  koyduğun anda seninki kullanılır.
${bilinmeyen.length ? `\n> ⚠️ ${bilinmeyen.length} öge ne seçilmiş ne de beklenen listesinde: ${bilinmeyen.map((o) => o.taban).join(", ")}\n` : ""}
## Nasıl kaydedilir

Dosyaları **doğrudan bu klasöre** koy (varsayilan/ alt klasörüne değil):

    ${HEDEF}

- **Dosya adı** tablodaki \`kod\` ile birebir aynı olmalı. **Uzantı fark etmez** —
  \`urun-kil-maskesi.jpg\`, \`.jpeg\`, \`.png\`, \`.webp\` hepsi olur, ben bulurum.
- **Format:** jpg / jpeg / png / webp / gif. **SVG çalışmaz** (uygulama servis etmiyor).
- **Boyut:** en fazla 5 MB (uygulamanın kendi sınırı), en az ~600×600 px.
- **En-boy:** kareye yakın olan en iyisi — ürün kartlarında kare kırpılıyor, geniş
  panoramik fotoğrafın kenarları kesilir.
- Telifsiz kaynak (Pexels, Unsplash, Pixabay) veya kendi çektiğin fotoğraf uygun.

Hepsini bulmana gerek yok — eksik kalanı boş bırakırsan seed o ürünü atlar ve
sana hangilerinin eksik olduğunu söyler.

## 1) Senden gerekli (${gerekliler.length})

| kod (dosya adı) | ne göstermeli | tezgah | neden bulamadım |
|---|---|---|---|
${gerekliSatir}

## 2) Hazır — istersen değiştir (${hazirlar.length})

| kod (dosya adı) | ne göstermeli | tezgah |
|---|---|---|
${hazirSatir}

## Notlar

- **Tezgah fotoğrafı**: satıcının tezgahını/işini temsil eden görsel. Gerçek pazar
  tezgahı fotoğrafı ideal; o yoksa o tezgahın ürün grubunu gösteren bir fotoğraf.
- Ürün açıklamaları \`scripts/demo-veri/katalog.js\` içinde — fotoğrafın ürünle
  tutarlı olması için oradaki metne bakabilirsin.
- Lisans/atıf kaydı: \`fotograflar/varsayilan/ATIF.json\`.
`;

  await writeFile(path.join(HEDEF, "LISTE.md"), md);
  console.log(`Yazildi: ${path.join(HEDEF, "LISTE.md")}`);
  console.log(`Toplam ${ogeler.length} | gerekli ${gerekliler.length} | hazir ${hazirlar.length} | bilinmeyen ${bilinmeyen.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
